import "../test/setup/zotero-mock.ts";
import fs from "fs/promises";
import path from "path";
import { JobQueueManager } from "../src/jobQueue/manager";
import { SkillRunnerProvider } from "../src/providers/skillrunnerProvider";
import { loadWorkflowManifests } from "../src/workflows/loader";
import { executeBuildRequests } from "../src/workflows/runtime";
import {
  literatureDigestBundlePath,
  startMockSkillRunnerServer,
} from "../test/mock-skillrunner/server";

type SelectionAttachment = {
  filePath?: string;
};

type SelectionContext = {
  items?: {
    attachments?: SelectionAttachment[];
  };
};

type JobView = {
  id: string;
  workflowId: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
  result?: {
    status?: string;
    requestId?: string;
    bundleSize?: number;
    responseJson?: unknown;
  };
};

function projectRoot() {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
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

function normalizeAttachmentPaths(rootDir: string, selection: SelectionContext) {
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

async function main() {
  const rootDir = projectRoot();
  process.chdir(rootDir);

  const server = await startMockSkillRunnerServer({
    bundlePath: literatureDigestBundlePath(rootDir),
    pollDelayMs: 80,
  });

  try {
    const fixtureSelection = await readSelectionFixture(rootDir);
    const selectionContext = normalizeAttachmentPaths(rootDir, fixtureSelection);
    const loaded = await loadWorkflowManifests("workflows_builtin");
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-analysis",
    );
    if (!workflow) {
      throw new Error("workflow literature-analysis not found");
    }

    const builtRequests = (await executeBuildRequests({
      workflow,
      selectionContext,
    })) as Array<{ poll?: { interval_ms?: number; timeout_ms?: number } }>;
    for (const request of builtRequests) {
      request.poll = {
        interval_ms: 40,
        timeout_ms: 5000,
      };
    }

    const provider = new SkillRunnerProvider({ baseUrl: server.baseUrl });
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: (job) =>
        provider.execute({
          requestKind: workflow.manifest.request!.kind,
          request: job.request,
        }),
    });

    const jobIds = builtRequests.map((request) =>
      queue.enqueue({
        workflowId: workflow.manifest.id,
        request,
        meta: {
          fixture: "selection-context-single-markdown.json",
        },
      }),
    );

    await queue.waitForIdle();

    console.log("=== Workflow Build Requests ===");
    console.log(JSON.stringify(builtRequests, null, 2));

    console.log("\n=== Job Queue Results ===");
    for (const jobId of jobIds) {
      const job = queue.getJob(jobId) as
        | (JobView & {
            result?: {
              status?: string;
              requestId?: string;
              bundleBytes?: Uint8Array;
              responseJson?: unknown;
            };
          })
        | null;
      if (!job) {
        console.log(JSON.stringify({ jobId, missing: true }, null, 2));
        continue;
      }
      const view: JobView = {
        id: job.id,
        workflowId: job.workflowId,
        state: job.state,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        ...(job.error ? { error: job.error } : {}),
      };
      if (job.result) {
        view.result = {
          status: job.result.status,
          requestId: job.result.requestId,
          bundleSize: job.result.bundleBytes?.length || 0,
          responseJson: job.result.responseJson,
        };
      }
      console.log(JSON.stringify(view, null, 2));
    }

    console.log("\n=== Transport Outgoing Traffic ===");
    console.log(JSON.stringify(server.getTraffic(), null, 2));

    console.log("\n=== Mock SkillRunner Jobs ===");
    console.log(JSON.stringify(server.getJobs(), null, 2));
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
