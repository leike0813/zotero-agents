import "../test/setup/zotero-mock.ts";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { SkillRunnerProvider } from "../src/providers/skillrunnerProvider";
import { loadWorkflowManifests } from "../src/workflows/loader";
import { executeBuildRequests } from "../src/workflows/runtime";

type SelectionAttachment = {
  filePath?: string;
};

type SelectionContext = {
  items?: {
    attachments?: SelectionAttachment[];
  };
};

type BuiltRequest = {
  kind: string;
  targetParentID?: number;
  poll?: {
    interval_ms?: number;
    timeout_ms?: number;
  };
  steps: Array<{
    id: string;
    request: {
      method: string;
      path: string;
      json?: unknown;
      multipart?: boolean;
    };
    files?: Array<{ key: string; path: string }>;
  }>;
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function patchUploadFieldToFile(request: BuiltRequest) {
  const copied = JSON.parse(JSON.stringify(request)) as BuiltRequest;
  for (const step of copied.steps) {
    if (step.id !== "upload") {
      continue;
    }
    for (const file of step.files || []) {
      file.key = "file";
    }
  }
  return copied;
}

function projectRoot() {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
}

function expandHome(inputPath: string) {
  if (inputPath === "~") {
    return os.homedir();
  }
  if (inputPath.startsWith("~/")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

async function readSelectionFixture(rootDir: string) {
  const fixturePath = path.join(
    rootDir,
    "test",
    "fixtures",
    "selection-context",
    "selection-context-single-markdown.json",
  );
  const raw = await fs.readFile(fixturePath, "utf8");
  return JSON.parse(raw) as SelectionContext;
}

function normalizeAttachmentPaths(
  rootDir: string,
  selection: SelectionContext,
) {
  const copied = JSON.parse(JSON.stringify(selection)) as SelectionContext;
  const baseDir = path.join(rootDir, "test", "fixtures", "selection-context");
  for (const attachment of copied.items?.attachments || []) {
    const currentPath = attachment.filePath || "";
    if (!currentPath || path.isAbsolute(currentPath)) {
      continue;
    }
    attachment.filePath = path.join(baseDir, currentPath);
  }
  return copied;
}

function summarizeRequest(request: BuiltRequest) {
  return {
    kind: request.kind,
    targetParentID: request.targetParentID,
    poll: request.poll,
    steps: request.steps.map((step) => ({
      id: step.id,
      method: step.request.method,
      path: step.request.path,
      json: step.request.json || null,
      files: step.files || [],
    })),
  };
}

function makeOutputPath(baseDir: string, requestId: string, index: number) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+$/, "")
    .replace("T", "_");
  return path.join(
    baseDir,
    `request-${requestId}-${index + 1}-${timestamp}.zip`,
  );
}

async function main() {
  const rootDir = projectRoot();
  process.chdir(rootDir);

  const baseUrl = process.argv[2] || "http://192.168.13.111:8030";
  const outputDir = expandHome(
    process.argv[3] || "~/Workspace/Code/zotero-agents/e2e_downloads",
  );
  await fs.mkdir(outputDir, { recursive: true });

  const fixtureSelection = await readSelectionFixture(rootDir);
  const selectionContext = normalizeAttachmentPaths(rootDir, fixtureSelection);

  const loaded = await loadWorkflowManifests("workflows_builtin");
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === "literature-analysis",
  );
  if (!workflow) {
    throw new Error("workflow literature-analysis not found");
  }

  const requests = (await executeBuildRequests({
    workflow,
    selectionContext,
  })) as BuiltRequest[];

  const provider = new SkillRunnerProvider({ baseUrl });

  console.log("=== Built Requests (from plugin logic) ===");
  console.log(JSON.stringify(requests.map(summarizeRequest), null, 2));

  const outputs: Array<{
    index: number;
    requestId: string;
    outputPath: string;
    bundleSize: number;
  }> = [];

  for (let i = 0; i < requests.length; i++) {
    let request = requests[i];
    console.log(
      `\n[${i + 1}/${requests.length}] submit -> upload -> poll -> download`,
    );
    let result;
    try {
      result = await provider.execute({
        requestKind: workflow.manifest.request!.kind,
        request,
      });
    } catch (error) {
      const message = toErrorMessage(error);
      const shouldRetryWithFileField =
        message.includes("422") &&
        message.includes("body") &&
        message.includes("file");
      if (!shouldRetryWithFileField) {
        throw error;
      }
      console.log(
        "upload field mismatch detected (backend expects file). retry with upload field=file",
      );
      request = patchUploadFieldToFile(request);
      result = await provider.execute({
        requestKind: workflow.manifest.request!.kind,
        request,
      });
    }

    const outputPath = makeOutputPath(outputDir, result.requestId, i);
    await fs.writeFile(outputPath, result.bundleBytes);

    outputs.push({
      index: i + 1,
      requestId: result.requestId,
      outputPath,
      bundleSize: result.bundleBytes.length,
    });

    console.log(
      `done: requestId=${result.requestId} bundleSize=${result.bundleBytes.length} -> ${outputPath}`,
    );
  }

  console.log("\n=== Download Summary ===");
  console.log(JSON.stringify(outputs, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
