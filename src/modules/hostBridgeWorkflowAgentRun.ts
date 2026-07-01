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
import {
  registerHostBridgeExportFile,
  sha256Bytes,
} from "./hostBridgeFileRegistry";
import { scanPluginSkillRegistry } from "./pluginSkillRegistry";
import { createStoreZipBytes, type StoreZipEntry } from "./zipStore";
import { localizeWorkflowLabel } from "../workflows/localization";
import type { HostBridgeAgentRunPreparedRequest } from "./hostBridgeWorkflowAgentRunStore";

const OUTPUT_CONTRACT_TOOLKIT_ASSET_DIR = "assets/skillrunner-output-contract";
const OUTPUT_CONTRACT_TOOLKIT_BUNDLE_PREFIX =
  "tools/skillrunner-output-contract";

export type HostBridgeWorkflowAgentRunBundle = {
  mode: "bridge-download";
  file: {
    fileId: string;
    displayName: string;
    contentType: string;
    size?: number;
    sha256?: string;
    expiresAt: string;
  };
  downloadCommand: string;
  unpackHint: string;
};

export type HostBridgeWorkflowAgentRunResult = {
  agentRunId: string;
  workflowId: string;
  workflowLabel: string;
  generatedAt: string;
  expiresAt: string;
  requests: HostBridgeWorkflowAgentRunRequestView[];
  instruction: string;
  applyStatus: HostBridgeWorkflowAgentRunApplyStatus;
  bundle: HostBridgeWorkflowAgentRunBundle;
  contents: {
    workflow: string;
    workflowResources: string;
    selectionContext: string;
    agentRunContext: string;
    requests: string[];
    applyBack: string;
    protocolGuide: string;
    instructions: string;
    skills: string[];
    selectedFiles: string[];
  };
  notes: string[];
};

export type HostBridgeWorkflowAgentRunRequestView = {
  agentRequestId: string;
  requestIndex: number;
  taskName?: string;
  requestKind?: string;
  skillId?: string;
  namespace: string;
  resultJsonPath: string;
  bundlePath: string;
};

export type HostBridgeWorkflowAgentRunApplyStatus = {
  allowed: boolean;
  reasonCode?: string;
  stats: {
    totalUnits: number;
    validUnits: number;
    skippedUnits: number;
  };
  message: string;
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

function isWorkflowManifestEntry(relativePath: string) {
  return relativePath.replace(/\\/g, "/").toLowerCase() === "workflow.json";
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
  skipWorkflowManifest?: boolean;
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
    if (args.skipWorkflowManifest && isWorkflowManifestEntry(relativePath)) {
      continue;
    }
    args.entries.push({
      name: `${args.bundlePrefix}/${relativePath}`,
      bytes: await readRuntimeBytes(filePath),
    });
  }
}

async function addSkillRunnerOutputContractToolkitEntries(args: {
  entries: StoreZipEntry[];
  notes: string[];
}) {
  if (!(await runtimePathExists(OUTPUT_CONTRACT_TOOLKIT_ASSET_DIR))) {
    args.notes.push("SkillRunner output-contract toolkit asset not found.");
    return;
  }
  await addDirectoryEntries({
    entries: args.entries,
    rootDir: OUTPUT_CONTRACT_TOOLKIT_ASSET_DIR,
    bundlePrefix: OUTPUT_CONTRACT_TOOLKIT_BUNDLE_PREFIX,
  });
}

function buildProtocolGuide(args: {
  agentRunId: string;
  manifest: WorkflowManifest;
  skillIds: string[];
  applyStatus: HostBridgeWorkflowAgentRunApplyStatus;
  preparedRequests: HostBridgeAgentRunPreparedRequest[];
}) {
  const manifest = args.manifest;
  const skillIds = args.skillIds;
  const lines = [
    "# Workflow Protocol",
    "",
    "This bundle is a self-owned workflow handoff. The host prepared request context for the agent, but it did not submit backend tasks, choose a provider/backend, or apply results to Zotero.",
    "",
    "## Bundle layout",
    "",
    "- `workflow/workflow.json`: canonical workflow definition. This is the only workflow manifest in the bundle.",
    "- `workflow/resources/`: non-manifest files copied from the workflow package, when present.",
    "- `skills/<skill-id>/`: referenced skill packages. Treat each package's instructions, schemas, and assets as the executable protocol for that skill.",
    "- `selection/context.json`: requested selection, sanitized Zotero selection context, and host-side apply advisory.",
    "- `selection/files/`: files referenced by the selection context, copied into the bundle.",
    "- `agent-run/context.json`: host-issued agentRunId, expiry, prepared request metadata, and apply-back endpoint information.",
    "- `agent-run/requests/<agent-request-id>/request.json`: sanitized prepared request for that executable request.",
    "- `agent-run/requests/<agent-request-id>/output-contract.json`: expected SkillRunner bundle namespace and result path for apply-back.",
    "- `tools/skillrunner-output-contract/`: portable output-contract toolkit guidance for finalizing result bundles.",
    "- `APPLY-BACK.md`: apply-back instructions for submitting finalized bundles to Host Bridge.",
    "- `INSTRUCTIONS.md`: short run instruction for the current handoff.",
    "",
    "## Reading workflow/workflow.json",
    "",
    "- `id`, `label`, `version`, and `provider` identify the workflow. In self-owned mode, `provider` is descriptive only; the host does not select or invoke that provider.",
    "- `parameters` declares workflow option names, defaults, enum values, and schemas. Decide parameter values yourself from user intent and skill instructions.",
    "- `inputs` declares the legal input unit. The host only used this field to decide whether a bundle may be emitted.",
    "- `validateSelection` declares host-owned execution/apply readiness rules. A violation does not prevent self-owned execution, but it disables host-side apply.",
    "- `request` describes the workflow request protocol. For `request.create`, run the referenced skill as the primary step. For `request.sequence.steps`, interpret the steps as candidate ordered work units.",
    "- `result` describes expected outputs or finalization semantics when declared.",
    "- `hooks` names workflow-owned code paths used by the Zotero host. The host ran `buildRequest` or declarative request compilation only to prepare request context for this handoff; it did not dispatch the prepared requests.",
    "",
    "## Input compatibility and apply readiness",
    "",
    "- Input compatibility is based only on `inputs`. Because this bundle exists, the requested input matched the workflow's declared input unit.",
    "- Apply readiness is based on `validateSelection` and is advisory for this self-owned run.",
    `- Host-side apply allowed: ${args.applyStatus.allowed ? "yes" : "no"}.`,
    args.applyStatus.reasonCode
      ? `- Apply readiness reason: ${args.applyStatus.reasonCode}.`
      : "- Apply readiness reason: none.",
    `- Apply readiness message: ${args.applyStatus.message}`,
    "- Do not attempt host-side apply when apply readiness is `no`. Produce outputs in your own workspace instead.",
    "",
    "## Sequence workflows",
    "",
    "- Treat `request.sequence.steps` as an ordered protocol. Each step may reference a skill package and may consume prior step outputs.",
    "- Interpret `include_if` conditions yourself from the workflow definition, selection context, parameter choices, and skill instructions. The host did not evaluate these branches.",
    "- When a step declares handoff or output conventions, preserve those files and values for subsequent steps.",
    "- If a step is not applicable, record why it was skipped in your own run notes.",
    "",
    "## Skill packages",
    "",
    "- Read the relevant package under `skills/<skill-id>/` before executing that step.",
    "- Use skill input/output schemas as the contract for files and JSON payloads you create.",
    "- If a referenced skill package is missing, use the workflow definition and available package resources to infer the expected contract, and record the gap.",
    "",
    "## Output handling",
    "",
    "- Finalize each request output as a SkillRunner-compatible bundle under the namespace declared in `agent-run/requests/<agent-request-id>/output-contract.json`.",
    "- Each finalized bundle must contain the declared `resultJsonPath` and a namespaced bundle manifest.",
    "- Apply-back is explicit: call `zotero-bridge workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>` after finalizing one or more request bundles.",
    "- Host Bridge recalculates apply readiness at apply time. The handoff preview is advisory and may become stale.",
    `- agentRunId: ${args.agentRunId}`,
    "",
    "Referenced skill ids:",
    ...skillIds.map((id) => `- ${id}`),
    "",
    "Prepared requests:",
    ...args.preparedRequests.map(
      (request) =>
        `- ${request.agentRequestId}: namespace=${request.namespace}, result=${request.resultJsonPath}`,
    ),
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
    "Read `workflow-protocol.md` before interpreting workflow fields or sequence steps.",
    "Use `selection/context.json` and files under `selection/files/` as your input context.",
    "Use `agent-run/context.json` and `agent-run/requests/*/output-contract.json` to finalize apply-back bundles.",
    "Do not assume Zotero has submitted or applied this run; apply-back happens only after you explicitly call the workflow agent-apply command.",
    skillIds.length
      ? `Candidate skill packages included: ${skillIds.join(", ")}.`
      : "No statically referenced skill package was found in the workflow definition.",
  ].join(" ");
}

function requestViews(
  preparedRequests: HostBridgeAgentRunPreparedRequest[],
): HostBridgeWorkflowAgentRunRequestView[] {
  return preparedRequests.map((request) => ({
    agentRequestId: request.agentRequestId,
    requestIndex: request.requestIndex,
    ...(request.taskName ? { taskName: request.taskName } : {}),
    ...(request.requestKind ? { requestKind: request.requestKind } : {}),
    ...(request.skillId ? { skillId: request.skillId } : {}),
    namespace: request.namespace,
    resultJsonPath: request.resultJsonPath,
    bundlePath: request.bundlePath,
  }));
}

function buildOutputContract(request: HostBridgeAgentRunPreparedRequest) {
  return {
    schema: "zotero-bridge.agent-run.output-contract.v1",
    agentRequestId: request.agentRequestId,
    requestIndex: request.requestIndex,
    namespace: request.namespace,
    resultJsonPath: request.resultJsonPath,
    bundlePath: request.bundlePath,
    expectedBundleManifestPath: `bundle/${request.namespace}/manifest.json`,
    acceptedBundleKinds: ["local_path"],
  };
}

function buildApplyBackInstructions(args: {
  agentRunId: string;
  expiresAt: string;
  preparedRequests: HostBridgeAgentRunPreparedRequest[];
}) {
  const exampleResults = args.preparedRequests
    .map(
      (request) =>
        `  --result ${request.agentRequestId}=<path-to-${request.namespace}-run_bundle.zip>`,
    )
    .join(" \\\n");
  return [
    "# Apply Back",
    "",
    `agentRunId: ${args.agentRunId}`,
    `expiresAt: ${args.expiresAt}`,
    "",
    "Finalize each request output using the bundled SkillRunner output-contract toolkit or an equivalent implementation of the same bundle contract.",
    "",
    "The host accepts finalized local bundle directories or zip files. Each bundle must contain the namespace and result path declared in the matching output contract.",
    "",
    "Submit results with:",
    "",
    "```sh",
    `zotero-bridge workflow agent-apply ${args.agentRunId} \\`,
    exampleResults || "  --result <agentRequestId>=<bundlePath>",
    "```",
    "",
    "Apply is one-shot. Host Bridge recalculates apply readiness and approval when this command is called.",
    "",
  ].join("\n");
}

export async function buildHostBridgeWorkflowAgentRunHandoff(args: {
  agentRunId: string;
  expiresAt: string;
  workflow: LoadedWorkflow;
  selection: unknown;
  selectionContext: unknown;
  applyStatus: HostBridgeWorkflowAgentRunApplyStatus;
  preparedRequests: HostBridgeAgentRunPreparedRequest[];
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
  const protocolGuide = buildProtocolGuide({
    agentRunId: args.agentRunId,
    manifest: workflow.manifest,
    skillIds,
    applyStatus: args.applyStatus,
    preparedRequests: args.preparedRequests,
  });
  const publicRequests = requestViews(args.preparedRequests);
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
          applyStatus: args.applyStatus,
        },
        null,
        2,
      )}\n`,
    },
    {
      name: "agent-run/context.json",
      text: `${JSON.stringify(
        {
          schema: "zotero-bridge.agent-run.context.v1",
          agentRunId: args.agentRunId,
          workflowId: workflow.manifest.id,
          expiresAt: args.expiresAt,
          requests: publicRequests,
          applyEndpoint: `/bridge/v1/workflows/agent-runs/${args.agentRunId}/apply`,
          applyCommand: `zotero-bridge workflow agent-apply ${args.agentRunId}`,
        },
        null,
        2,
      )}\n`,
    },
    ...args.preparedRequests.flatMap((request) => [
      {
        name: `agent-run/requests/${safeSegment(request.agentRequestId, "request")}/request.json`,
        text: `${JSON.stringify(request.request, null, 2)}\n`,
      },
      {
        name: `agent-run/requests/${safeSegment(request.agentRequestId, "request")}/output-contract.json`,
        text: `${JSON.stringify(buildOutputContract(request), null, 2)}\n`,
      },
    ]),
    {
      name: "APPLY-BACK.md",
      text: buildApplyBackInstructions({
        agentRunId: args.agentRunId,
        expiresAt: args.expiresAt,
        preparedRequests: args.preparedRequests,
      }),
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
    bundlePrefix: "workflow/resources",
    skipWorkflowManifest: true,
  });

  const registry = await scanPluginSkillRegistry();
  const notes: string[] = [];
  await addSkillRunnerOutputContractToolkitEntries({ entries, notes });
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
  const zipSha256 = await sha256Bytes(zipBytes);
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
    size: zipBytes.byteLength,
    ...(zipSha256 ? { sha256: zipSha256 } : {}),
    owner: {
      workflowId: workflow.manifest.id,
    },
  });

  return {
    agentRunId: args.agentRunId,
    workflowId: workflow.manifest.id,
    workflowLabel: localizeWorkflowLabel(workflow),
    generatedAt,
    expiresAt: args.expiresAt,
    requests: publicRequests,
    instruction,
    applyStatus: args.applyStatus,
    bundle: {
      mode: "bridge-download",
      file: {
        fileId: descriptor.fileId,
        displayName: descriptor.displayName,
        contentType: descriptor.contentType,
        ...(typeof descriptor.size === "number"
          ? { size: descriptor.size }
          : {}),
        ...(descriptor.sha256 ? { sha256: descriptor.sha256 } : {}),
        expiresAt: descriptor.expiresAt,
      },
      downloadCommand: `zotero-bridge file download ${descriptor.fileId} --output ${bundleName}`,
      unpackHint: `Unzip ${bundleName}, then read INSTRUCTIONS.md and workflow-protocol.md.`,
    },
    contents: {
      workflow: "workflow/workflow.json",
      workflowResources: "workflow/resources/",
      selectionContext: "selection/context.json",
      agentRunContext: "agent-run/context.json",
      requests: args.preparedRequests.map(
        (request) =>
          `agent-run/requests/${safeSegment(request.agentRequestId, "request")}/`,
      ),
      applyBack: "APPLY-BACK.md",
      protocolGuide: "workflow-protocol.md",
      instructions: "INSTRUCTIONS.md",
      skills: skillIds.map((id) => `skills/${safeSegment(id, "skill")}`),
      selectedFiles: selectedFiles.map((entry) => entry.bundlePath),
    },
    notes,
  };
}
