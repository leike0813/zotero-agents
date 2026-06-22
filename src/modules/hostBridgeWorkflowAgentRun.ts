import { getBaseName, joinPath } from "../utils/path";
import type { LoadedWorkflow, WorkflowManifest } from "../workflows/types";
import {
  collectRuntimeFiles,
  getRuntimePersistencePaths,
  readRuntimeBytes,
  runtimePathExists,
  runtimeRelativePath,
  writeRuntimeBytes,
} from "./runtimePersistence";
import { registerHostBridgeExportFile } from "./hostBridgeFileRegistry";
import { scanPluginSkillRegistry } from "./pluginSkillRegistry";
import { createStoreZipBytes, type StoreZipEntry } from "./zipStore";
import { localizeWorkflowLabel } from "../workflows/localization";

export type HostBridgeWorkflowAgentRunBundle = {
  mode: "bridge-download";
  file: {
    fileId: string;
    displayName: string;
    contentType: string;
    size?: number;
    expiresAt: string;
  };
  downloadCommand: string;
  unpackHint: string;
};

export type HostBridgeWorkflowAgentRunResult = {
  workflowId: string;
  workflowLabel: string;
  generatedAt: string;
  instruction: string;
  bundle: HostBridgeWorkflowAgentRunBundle;
  contents: {
    workflow: string;
    selectionContext: string;
    protocolGuide: string;
    instructions: string;
    skills: string[];
    selectedFiles: string[];
  };
  notes: string[];
};

type SelectedFile = {
  sourcePath: string;
  bundlePath: string;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function safeSegment(value: unknown, fallback: string) {
  const text = normalizeString(value)
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return text || fallback;
}

function isPathLike(value: string) {
  return (
    /^[A-Za-z]:[\\/]/.test(value) ||
    /^[/\\]/.test(value) ||
    /^~[/\\]/.test(value) ||
    value.includes("\\") ||
    value.includes("/")
  );
}

function isUnsafePackageEntry(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");
  const baseName = normalized.split("/").pop() || "";
  return (
    !normalized ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    baseName === ".DS_Store" ||
    baseName.endsWith(".map") ||
    baseName.endsWith(".log") ||
    baseName.endsWith(".tmp") ||
    normalized.includes("/node_modules/") ||
    normalized.includes("/.git/") ||
    normalized.includes("/__pycache__/")
  );
}

function collectWorkflowSkillIds(manifest: WorkflowManifest) {
  const ids = new Set<string>();
  const createSkill = normalizeString(manifest.request?.create?.skill_id);
  if (createSkill) {
    ids.add(createSkill);
  }
  for (const step of manifest.request?.sequence?.steps || []) {
    const stepSkill = normalizeString(step.skill_id);
    if (stepSkill) {
      ids.add(stepSkill);
    }
  }
  return Array.from(ids).sort((left, right) => left.localeCompare(right));
}

function collectSelectedFilesFromContext(selectionContext: unknown) {
  const files = new Map<string, SelectedFile>();
  let sequence = 0;
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }
    const record = value as Record<string, unknown>;
    const filePath = normalizeString(record.filePath);
    if (filePath && !files.has(filePath)) {
      sequence += 1;
      const name = safeSegment(getBaseName(filePath), `selected-${sequence}`);
      files.set(filePath, {
        sourcePath: filePath,
        bundlePath: `selection/files/${sequence.toString().padStart(3, "0")}-${name}`,
      });
    }
    Object.values(record).forEach(visit);
  };
  visit(selectionContext);
  return Array.from(files.values());
}

function sanitizeContextValue(
  value: unknown,
  fileBySourcePath: Map<string, SelectedFile>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeContextValue(entry, fileBySourcePath));
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && isPathLike(value)) {
      const mapped = fileBySourcePath.get(value);
      return mapped ? mapped.bundlePath : "[redacted-path]";
    }
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (
      typeof entry === "string" &&
      (normalizedKey.includes("path") || isPathLike(entry))
    ) {
      const mapped = fileBySourcePath.get(entry);
      output[key] = mapped ? mapped.bundlePath : "[redacted-path]";
      continue;
    }
    output[key] = sanitizeContextValue(entry, fileBySourcePath);
  }
  return output;
}

async function addDirectoryEntries(args: {
  entries: StoreZipEntry[];
  rootDir: string;
  bundlePrefix: string;
}) {
  if (!(await runtimePathExists(args.rootDir))) {
    return;
  }
  for (const filePath of await collectRuntimeFiles(args.rootDir)) {
    const relativePath = runtimeRelativePath(args.rootDir, filePath).replace(
      /\\/g,
      "/",
    );
    if (isUnsafePackageEntry(relativePath)) {
      continue;
    }
    args.entries.push({
      name: `${args.bundlePrefix}/${relativePath}`,
      bytes: await readRuntimeBytes(filePath),
    });
  }
}

function buildProtocolGuide(manifest: WorkflowManifest, skillIds: string[]) {
  const lines = [
    "# Workflow Protocol",
    "",
    "This bundle is a self-owned workflow handoff. The host exported context only; it did not submit backend tasks or apply results to Zotero.",
    "",
    "Use `workflow/workflow.json` as the workflow definition. Use packages under `skills/` as the executable skill instructions and schemas.",
    "",
    "Read `selection/context.json` for the selected Zotero items. Files referenced by that context are copied under `selection/files/`.",
    "",
    "If the workflow is a sequence workflow, treat `request.sequence.steps` as candidate steps. Do not assume `include_if` has been evaluated by the host.",
    "",
    "If the workflow contains hooks, inspect the exported workflow package files as workflow-owned guidance. The host did not run `buildRequest` for this handoff.",
    "",
    "Place your final outputs under an `output/` directory in your own run workspace unless a skill package gives stricter instructions.",
    "",
    "Referenced skill ids:",
    ...skillIds.map((id) => `- ${id}`),
    "",
    "Workflow summary:",
    `- id: ${manifest.id}`,
    `- provider: ${manifest.provider}`,
    `- request kind: ${manifest.request?.kind || ""}`,
  ];
  return `${lines.join("\n")}\n`;
}

function buildInstructions(workflow: LoadedWorkflow, skillIds: string[]) {
  const label = localizeWorkflowLabel(workflow);
  return [
    `You are running workflow "${label}" (${workflow.manifest.id}) in self-owned mode.`,
    "Open `workflow/workflow.json`, then read the relevant packages under `skills/`.",
    "Use `selection/context.json` and files under `selection/files/` as your input context.",
    "Decide workflow parameters and sequence branches yourself from the workflow and skill instructions.",
    "Do not assume Zotero has submitted or will apply this run; write your outputs in your own workspace unless explicitly instructed otherwise.",
    skillIds.length
      ? `Candidate skill packages included: ${skillIds.join(", ")}.`
      : "No statically referenced skill package was found in the workflow definition.",
  ].join(" ");
}

export async function buildHostBridgeWorkflowAgentRunHandoff(args: {
  workflow: LoadedWorkflow;
  selection: unknown;
  selectionContext: unknown;
}): Promise<HostBridgeWorkflowAgentRunResult> {
  const workflow = args.workflow;
  const generatedAt = new Date().toISOString();
  const skillIds = collectWorkflowSkillIds(workflow.manifest);
  const selectedFiles = collectSelectedFilesFromContext(args.selectionContext);
  const selectedFileBySourcePath = new Map(
    selectedFiles.map((entry) => [entry.sourcePath, entry]),
  );
  const sanitizedSelectionContext = sanitizeContextValue(
    args.selectionContext,
    selectedFileBySourcePath,
  );
  const instruction = buildInstructions(workflow, skillIds);
  const protocolGuide = buildProtocolGuide(workflow.manifest, skillIds);
  const entries: StoreZipEntry[] = [
    {
      name: "workflow/workflow.json",
      text: `${JSON.stringify(workflow.manifest, null, 2)}\n`,
    },
    {
      name: "selection/context.json",
      text: `${JSON.stringify(
        {
          selection: args.selection,
          context: sanitizedSelectionContext,
        },
        null,
        2,
      )}\n`,
    },
    {
      name: "workflow-protocol.md",
      text: protocolGuide,
    },
    {
      name: "INSTRUCTIONS.md",
      text: `${instruction}\n`,
    },
  ];

  await addDirectoryEntries({
    entries,
    rootDir: workflow.rootDir,
    bundlePrefix: "workflow/package",
  });

  const registry = await scanPluginSkillRegistry();
  const notes: string[] = [];
  for (const skillId of skillIds) {
    const entry = registry.entriesById[skillId];
    if (!entry) {
      notes.push(`Skill package not found: ${skillId}`);
      continue;
    }
    await addDirectoryEntries({
      entries,
      rootDir: entry.sourceDir,
      bundlePrefix: `skills/${safeSegment(skillId, "skill")}`,
    });
  }

  for (const file of selectedFiles) {
    try {
      entries.push({
        name: file.bundlePath,
        bytes: await readRuntimeBytes(file.sourcePath),
      });
    } catch (error) {
      notes.push(
        `Selected file unavailable: ${getBaseName(file.sourcePath)} (${error instanceof Error ? error.message : String(error || "")})`,
      );
    }
  }

  const zipBytes = createStoreZipBytes(entries);
  const bundleName = `${safeSegment(workflow.manifest.id, "workflow")}-agent-run.zip`;
  const bundlePath = joinPath(
    getRuntimePersistencePaths().tmpDir,
    "workflow-agent-run",
    `${Date.now()}-${bundleName}`,
  );
  await writeRuntimeBytes(bundlePath, zipBytes);
  const descriptor = await registerHostBridgeExportFile({
    localPath: bundlePath,
    displayName: bundleName,
    contentType: "application/zip",
    owner: {
      workflowId: workflow.manifest.id,
    },
  });

  return {
    workflowId: workflow.manifest.id,
    workflowLabel: localizeWorkflowLabel(workflow),
    generatedAt,
    instruction,
    bundle: {
      mode: "bridge-download",
      file: {
        fileId: descriptor.fileId,
        displayName: descriptor.displayName,
        contentType: descriptor.contentType,
        ...(typeof descriptor.size === "number"
          ? { size: descriptor.size }
          : {}),
        expiresAt: descriptor.expiresAt,
      },
      downloadCommand: `zotero-bridge file download ${descriptor.fileId} --output ${bundleName}`,
      unpackHint: `Unzip ${bundleName}, then read INSTRUCTIONS.md and workflow-protocol.md.`,
    },
    contents: {
      workflow: "workflow/workflow.json",
      selectionContext: "selection/context.json",
      protocolGuide: "workflow-protocol.md",
      instructions: "INSTRUCTIONS.md",
      skills: skillIds.map((id) => `skills/${safeSegment(id, "skill")}`),
      selectedFiles: selectedFiles.map((entry) => entry.bundlePath),
    },
    notes,
  };
}
