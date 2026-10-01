import { sha256PrefixedHex } from "../utils/sha256";
import { getBaseName, joinPath } from "../utils/path";
import type { AcpSkillRunRequestV1 } from "../providers/contracts";
import type {
  PluginSkillRegistryEntry,
  PluginSkillRegistrySnapshot,
} from "./workflow/catalog/pluginSkillRegistry";
import { scanPluginSkillRegistry } from "./workflow/catalog/pluginSkillRegistry";
import {
  createAcpSkillRunnerWorkspace,
  writeAcpSkillRunnerInputManifest,
  type SkillRunWorkspace,
} from "./acp/skillRun/acpSkillRunnerWorkspace";
import { buildAcpSkillResourceManifest } from "./acp/skillRun/acpSkillResourceManifest";
import { buildAcpSharedSkillCatalog } from "./acp/skillRun/acpSharedSkillCatalog";
import {
  loadResolvedAcpSkillJson,
  resolveAcpSkillSchemaAsset,
  validateAcpSkillRunRequestAgainstSchemas,
  type AcpSkillSchemaKey,
} from "./acp/skillRun/acpSkillSchemaAssets";
import {
  copyRuntimeFile,
  ensureRuntimeDirectory,
  readRuntimeBytes,
  readRuntimeTextFile,
  statRuntimePath,
  writeRuntimeTextFile,
} from "./runtimePersistence";

// Backend-neutral Skill Run preparation seam (issue #21 resolution). It parses
// the Skill package, request contract, instructions, inputs and output Schema
// exactly once per admission and freezes them into an immutable, durable
// PreparedSkillRun. ACP and Built-in Pi only read the snapshot and attach their
// own protocol layer; neither re-discovers the current Skill or re-assembles a
// second preparation DTO.

export const SKILL_RUN_PIPELINE_VERSION_V1 = "v1" as const;
export const SKILL_RUN_PIPELINE_VERSION_LEGACY = "legacy" as const;
export type SkillRunPipelineVersion = typeof SKILL_RUN_PIPELINE_VERSION_V1;
export type SkillRunPipelineVersionOrLegacy =
  | SkillRunPipelineVersion
  | typeof SKILL_RUN_PIPELINE_VERSION_LEGACY;

export const SKILL_RUN_PREPARED_SCHEMA = "zotero-agents.skill-run-prepared.v1";
export const SKILL_RUN_PREPARED_FILENAME = "prepared-skill-run.json";
export const SKILL_RUN_PREPARATION_PROTOCOL_VERSION = "v1" as const;
export const SKILL_RUN_INPUTS_DIRNAME = ".skill-run-inputs";

export type SkillRunExecutionMode = "auto" | "interactive";

/**
 * Neutral request surface shared by a validated skillrunner.job.v1 and its ACP
 * remap. It carries the job identity plus runtime options so both backends feed
 * one preparation path without re-discovering the workflow request shape.
 */
export type SkillRunPreparationRequest = {
  kind?: string;
  skill_id: string;
  taskName?: string;
  input?: unknown;
  parameter?: Record<string, unknown>;
  runtime_options?: {
    execution_mode?: unknown;
    workspace?: { mode?: "new" | "reuse"; workflow_run_id?: string };
    workflow_workspace?: { mode?: "new" | "reuse"; workflow_run_id?: string };
    [key: string]: unknown;
  };
  upload_files?: Array<{ key?: string; path?: string }>;
  poll?: { interval_ms?: number; timeout_ms?: number };
  fetch_type?: "bundle" | "result";
};

export type SkillRunPreparationFailureCategory = "contract" | "configuration";

export class SkillRunPreparationError extends Error {
  readonly category: SkillRunPreparationFailureCategory;
  readonly code: string;

  constructor(
    category: SkillRunPreparationFailureCategory,
    code: string,
    message: string,
  ) {
    super(message);
    this.name = "SkillRunPreparationError";
    this.category = category;
    this.code = code;
  }
}

export type PreparedSkillRunSchema = {
  path?: string;
  digest: string;
  document: unknown;
};

export type PreparedSkillRunSchemas = {
  input?: PreparedSkillRunSchema;
  parameter?: PreparedSkillRunSchema;
  output?: PreparedSkillRunSchema;
};

export type PreparedSkillRunInstructionInput = {
  path?: string;
  digest: string;
  content: string;
};

export type PreparedSkillRun = {
  schema: typeof SKILL_RUN_PREPARED_SCHEMA;
  pipelineVersion: SkillRunPipelineVersion;
  protocolVersion: typeof SKILL_RUN_PREPARATION_PROTOCOL_VERSION;
  skillId: string;
  requestId: string;
  backendId: string;
  workflowId?: string;
  jobId?: string;
  executionMode: SkillRunExecutionMode;
  workspace: SkillRunWorkspace;
  primarySkillDir: string;
  runnerJson: Record<string, unknown>;
  instructions: {
    skillMd?: PreparedSkillRunInstructionInput;
    run?: PreparedSkillRunInstructionInput;
  };
  skillRoots: string[];
  sharedSkillCatalogPath?: string;
  sharedSkillCatalogId?: string;
  outputContractText?: string;
  proxySkillCount: number;
  inputs: {
    input: Record<string, unknown>;
    parameter: Record<string, unknown>;
    files: PreparedSkillRunInputFile[];
  };
  requestValidation: {
    ok: boolean;
    errors: string[];
    inputSchemaPath?: string;
    parameterSchemaPath?: string;
  };
  schemas: PreparedSkillRunSchemas;
  resources: {
    checksum: string;
    skillRoot: string;
    files: string[];
    fileCount: number;
    digest: string;
  };
  provenance: {
    snapshotDigest: string;
    runnerDigest: string;
    schemaDigest: string;
    instructionDigest: string;
    preparedAt: string;
  };
};

export type SkillRunMaterializationFacts = {
  primarySkillDir?: string;
  skillRoots?: string[];
  instructionsPath?: string;
  instructionsContent?: string;
  sharedSkillCatalogPath?: string;
  sharedSkillCatalogId?: string;
  outputContractText?: string;
  proxySkillRoots?: string[];
  requestedSkillProxyPath?: string;
  proxySkillCount?: number;
  resourceRewriteWarnings?: string[];
};

export type PreparedSkillRunInputFile = {
  key: string;
  name: string;
  path: string;
  size: number;
  digest: string;
};

export type SkillRunMaterialize = (args: {
  request: SkillRunPreparationRequest;
  workspace: SkillRunWorkspace;
  registry: PluginSkillRegistrySnapshot;
  skillEntry: PluginSkillRegistryEntry;
  runnerJson: Record<string, unknown>;
  executionMode: SkillRunExecutionMode;
  catalogRootDir?: string;
}) => Promise<SkillRunMaterializationFacts>;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object") {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

async function digestOf(value: unknown): Promise<string> {
  return (
    (await sha256PrefixedHex(
      new TextEncoder().encode(JSON.stringify(value)),
    )) || ""
  );
}

export function resolveSkillRunExecutionMode(
  request: SkillRunPreparationRequest,
): SkillRunExecutionMode {
  const raw = request.runtime_options?.execution_mode;
  if (raw === undefined || raw === null || normalizeString(raw) === "") {
    return "auto";
  }
  const value = String(raw);
  if (value !== "auto" && value !== "interactive") {
    throw new SkillRunPreparationError(
      "contract",
      "skill_run_execution_mode_invalid",
      `skill run execution_mode must be exactly "auto" or "interactive": ${value}`,
    );
  }
  return value;
}

export async function readSkillRunRunnerJson(
  path: string,
): Promise<Record<string, unknown>> {
  return JSON.parse(await readRuntimeTextFile(path)) as Record<string, unknown>;
}

async function freezeSchemaAsset(args: {
  skillDir: string;
  runnerJson: Record<string, unknown>;
  schemaKey: AcpSkillSchemaKey;
}): Promise<PreparedSkillRunSchema | undefined> {
  const resolution = await resolveAcpSkillSchemaAsset({
    skillDir: args.skillDir,
    runnerJson: args.runnerJson,
    schemaKey: args.schemaKey,
  });
  if (!resolution.path) {
    return undefined;
  }
  const document = await loadResolvedAcpSkillJson(resolution);
  return {
    path: resolution.path,
    digest: await digestOf(document),
    document,
  };
}

async function freezeInstructionInput(args: {
  path?: string;
  content?: string;
}): Promise<PreparedSkillRunInstructionInput | undefined> {
  const path = normalizeString(args.path);
  const content =
    typeof args.content === "string"
      ? args.content
      : path
        ? await readRuntimeTextFile(path).catch(() => "")
        : "";
  if (!path && !content) {
    return undefined;
  }
  return {
    ...(path ? { path } : {}),
    digest: await digestOf(content),
    content,
  };
}

function resolvePreparedSkillRunPath(runtimeDir: string) {
  const normalized = normalizeString(runtimeDir);
  return normalized ? joinPath(normalized, SKILL_RUN_PREPARED_FILENAME) : "";
}

function isAbsoluteLocalPath(value: string) {
  const normalized = normalizeString(value).replace(/\\/g, "/");
  return /^[A-Za-z]:\//.test(normalized) || normalized.startsWith("/");
}

function safeInputFileName(value: string, fallback: string) {
  const name = (getBaseName(normalizeString(value)) || fallback)
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return name || fallback;
}

/**
 * Stage declared uploads into an owned, run-local directory and return the
 * owned path per input key. The original caller path never enters the snapshot,
 * so recovery and the Agent both read the immutable copy.
 */
async function stageDeclaredUploads(args: {
  workspaceDir: string;
  uploadFiles: Array<{ key?: string; path?: string }>;
  input: Record<string, unknown>;
}): Promise<{
  input: Record<string, unknown>;
  files: PreparedSkillRunInputFile[];
}> {
  const input = { ...args.input };
  const files: PreparedSkillRunInputFile[] = [];
  for (const entry of args.uploadFiles) {
    const key = normalizeString(entry?.key);
    const sourcePath = normalizeString(entry?.path);
    if (!key || !sourcePath || !isAbsoluteLocalPath(sourcePath)) {
      continue;
    }
    const name = safeInputFileName(sourcePath, "input.bin");
    const targetPath = joinPath(
      args.workspaceDir,
      SKILL_RUN_INPUTS_DIRNAME,
      key.replace(/[^A-Za-z0-9._-]+/g, "-"),
      name,
    );
    await ensureRuntimeDirectory(
      joinPath(args.workspaceDir, SKILL_RUN_INPUTS_DIRNAME, key),
    );
    await copyRuntimeFile({ sourcePath, targetPath });
    const stat = await statRuntimePath(targetPath);
    const bytes = await readRuntimeBytes(targetPath);
    input[key] = targetPath;
    files.push({
      key,
      name,
      path: targetPath,
      size: Math.max(0, Math.floor(Number(stat.size || 0) || 0)),
      digest: (await sha256PrefixedHex(bytes)) || "",
    });
  }
  return { input, files };
}

async function computeSnapshotDigest(args: {
  skillId: string;
  requestId: string;
  backendId: string;
  executionMode: SkillRunExecutionMode;
  runnerDigest: string;
  schemaDigest: string;
  instructionDigest: string;
  resourcesDigest: string;
  input: Record<string, unknown>;
  parameter: Record<string, unknown>;
}) {
  return digestOf({
    skillId: args.skillId,
    requestId: args.requestId,
    backendId: args.backendId,
    executionMode: args.executionMode,
    runnerDigest: args.runnerDigest,
    schemaDigest: args.schemaDigest,
    instructionDigest: args.instructionDigest,
    resourcesDigest: args.resourcesDigest,
    input: args.input,
    parameter: args.parameter,
  });
}

/** Freeze a PreparedSkillRun from an already-materialized run. */
export async function prepareSkillRun(args: {
  request: SkillRunPreparationRequest;
  workspace: SkillRunWorkspace;
  backendId: string;
  skillEntry: PluginSkillRegistryEntry;
  runnerJson: Record<string, unknown>;
  executionMode: SkillRunExecutionMode;
  materialization: SkillRunMaterializationFacts;
  workflowId?: string;
  jobId?: string;
  persist?: boolean;
}): Promise<PreparedSkillRun> {
  const runnerJson = { ...args.runnerJson };
  const primarySkillDir =
    normalizeString(args.materialization.primarySkillDir) ||
    args.skillEntry.sourceDir;
  // The ACP helper is typed against the remapped ACP request but only reads
  // input/parameter, so the neutral job request passes through unchanged.
  const requestValidation = await validateAcpSkillRunRequestAgainstSchemas({
    request: args.request as AcpSkillRunRequestV1,
    runnerJson,
    skillDir: primarySkillDir,
    workspaceDir: args.workspace.workspaceDir,
  });
  const [inputSchema, parameterSchema, outputSchema, resourceManifest] =
    await Promise.all([
      freezeSchemaAsset({
        skillDir: primarySkillDir,
        runnerJson,
        schemaKey: "input",
      }),
      freezeSchemaAsset({
        skillDir: primarySkillDir,
        runnerJson,
        schemaKey: "parameter",
      }),
      freezeSchemaAsset({
        skillDir: primarySkillDir,
        runnerJson,
        schemaKey: "output",
      }),
      buildAcpSkillResourceManifest(args.skillEntry),
    ]);
  const skillMd = await freezeInstructionInput({
    path: args.skillEntry.skillMdPath,
  });
  const runInstructions = await freezeInstructionInput({
    path: args.materialization.instructionsPath,
    content: args.materialization.instructionsContent,
  });
  const files = resourceManifest.files.map((file) => file.relativePath);
  const resourcesDigest = await digestOf({
    checksum: resourceManifest.checksum,
    files,
  });
  const schemaDigest = await digestOf({
    input: inputSchema?.digest,
    parameter: parameterSchema?.digest,
    output: outputSchema?.digest,
  });
  const instructionDigest = await digestOf({
    skillMd: skillMd?.digest,
    run: runInstructions?.digest,
  });
  const runnerDigest = await digestOf(runnerJson);
  const stagedInputs = await stageDeclaredUploads({
    workspaceDir: args.workspace.workspaceDir,
    uploadFiles: args.request.upload_files || [],
    input: requestValidation.inputContext,
  });
  const inputContext = stagedInputs.input;
  const parameterContext = requestValidation.parameterContext;
  const snapshotDigest = await computeSnapshotDigest({
    skillId: args.skillEntry.skillId,
    requestId: args.workspace.requestId,
    backendId: args.backendId,
    executionMode: args.executionMode,
    runnerDigest,
    schemaDigest,
    instructionDigest,
    resourcesDigest,
    input: inputContext,
    parameter: parameterContext,
  });
  const prepared = deepFreeze<PreparedSkillRun>({
    schema: SKILL_RUN_PREPARED_SCHEMA,
    pipelineVersion: SKILL_RUN_PIPELINE_VERSION_V1,
    protocolVersion: SKILL_RUN_PREPARATION_PROTOCOL_VERSION,
    skillId: args.skillEntry.skillId,
    requestId: args.workspace.requestId,
    backendId: args.backendId,
    ...(normalizeString(args.workflowId)
      ? { workflowId: normalizeString(args.workflowId) }
      : {}),
    ...(normalizeString(args.jobId)
      ? { jobId: normalizeString(args.jobId) }
      : {}),
    executionMode: args.executionMode,
    workspace: { ...args.workspace },
    primarySkillDir,
    runnerJson,
    instructions: {
      ...(skillMd ? { skillMd } : {}),
      ...(runInstructions ? { run: runInstructions } : {}),
    },
    skillRoots: [
      ...(args.materialization.skillRoots || []).map(normalizeString),
    ].filter(Boolean),
    ...(normalizeString(args.materialization.sharedSkillCatalogPath)
      ? {
          sharedSkillCatalogPath: normalizeString(
            args.materialization.sharedSkillCatalogPath,
          ),
        }
      : {}),
    ...(normalizeString(args.materialization.sharedSkillCatalogId)
      ? {
          sharedSkillCatalogId: normalizeString(
            args.materialization.sharedSkillCatalogId,
          ),
        }
      : {}),
    ...(normalizeString(args.materialization.outputContractText)
      ? {
          outputContractText: normalizeString(
            args.materialization.outputContractText,
          ),
        }
      : {}),
    proxySkillCount: Math.max(
      0,
      Math.floor(Number(args.materialization.proxySkillCount || 0) || 0),
    ),
    inputs: {
      input: { ...inputContext },
      parameter: { ...parameterContext },
      files: stagedInputs.files.map((file) => ({ ...file })),
    },
    requestValidation: {
      ok: requestValidation.ok,
      errors: [...requestValidation.errors],
      ...(requestValidation.inputSchemaPath
        ? { inputSchemaPath: requestValidation.inputSchemaPath }
        : {}),
      ...(requestValidation.parameterSchemaPath
        ? { parameterSchemaPath: requestValidation.parameterSchemaPath }
        : {}),
    },
    schemas: {
      ...(inputSchema ? { input: inputSchema } : {}),
      ...(parameterSchema ? { parameter: parameterSchema } : {}),
      ...(outputSchema ? { output: outputSchema } : {}),
    },
    resources: {
      checksum: resourceManifest.checksum,
      skillRoot: resourceManifest.skillRoot,
      files,
      fileCount: files.length,
      digest: resourcesDigest,
    },
    provenance: {
      snapshotDigest,
      runnerDigest,
      schemaDigest,
      instructionDigest,
      preparedAt: new Date().toISOString(),
    },
  });
  if (args.persist !== false) {
    const path = resolvePreparedSkillRunPath(args.workspace.runtimeDir);
    if (path) {
      // The snapshot is durable provenance; a degraded runtime directory must
      // not fail an otherwise valid run, matching the ACP runtime-file policy.
      await writeRuntimeTextFile(path, JSON.stringify(prepared, null, 2)).catch(
        () => undefined,
      );
    }
  }
  return prepared;
}

async function defaultSkillRunMaterialize(args: {
  registry: PluginSkillRegistrySnapshot;
  skillEntry: PluginSkillRegistryEntry;
  catalogRootDir?: string;
}): Promise<SkillRunMaterializationFacts> {
  const catalog = await buildAcpSharedSkillCatalog({
    registry: args.registry,
    catalogRootDir: args.catalogRootDir,
  });
  return {
    primarySkillDir: args.skillEntry.sourceDir,
    sharedSkillCatalogPath: catalog.catalogRoot,
    proxySkillCount: 0,
    skillRoots: [],
  };
}

/**
 * Neutral admission entry: resolves the installed Skill, the runner contract,
 * the strict execution mode, the workspace and the materialized facts once,
 * then freezes the PreparedSkillRun. Callers that need intermediate events or a
 * backend-specific materialization pass their own workspace/materialize.
 */
export async function prepareSkillRunJob(args: {
  request: SkillRunPreparationRequest;
  requestId: string;
  backendId: string;
  workflowId?: string;
  jobId?: string;
  root?: string;
  workspace?: SkillRunWorkspace;
  registry?: PluginSkillRegistrySnapshot;
  materialize?: SkillRunMaterialize;
  catalogRootDir?: string;
}): Promise<{
  prepared: PreparedSkillRun;
  workspace: SkillRunWorkspace;
  skillEntry: PluginSkillRegistryEntry;
}> {
  const requestId = normalizeString(args.requestId);
  if (!requestId) {
    throw new SkillRunPreparationError(
      "contract",
      "skill_run_request_id_missing",
      "skill run preparation requires an owner requestId",
    );
  }
  const skillId = normalizeString(args.request.skill_id);
  if (!skillId) {
    throw new SkillRunPreparationError(
      "contract",
      "skill_run_skill_id_missing",
      "skill run preparation requires skill_id",
    );
  }
  const registry = args.registry || (await scanPluginSkillRegistry());
  const skillEntry = registry.entriesById[skillId];
  if (!skillEntry) {
    throw new SkillRunPreparationError(
      "configuration",
      "skill_run_skill_not_found",
      `Plugin-side skill not found: ${skillId}`,
    );
  }
  const runnerJson = await readSkillRunRunnerJson(skillEntry.runnerJsonPath);
  const executionMode = resolveSkillRunExecutionMode(args.request);
  const workspace =
    args.workspace ||
    (await createAcpSkillRunnerWorkspace({
      backendId: args.backendId,
      skillId,
      requestId,
      workflowId: args.workflowId,
      jobId: args.jobId,
      rootDir: args.root,
    }));
  const materialization = await (
    args.materialize || defaultSkillRunMaterialize
  )({
    request: args.request,
    workspace,
    registry,
    skillEntry,
    runnerJson,
    executionMode,
    catalogRootDir: args.catalogRootDir,
  });
  const prepared = await prepareSkillRun({
    request: args.request,
    workspace,
    backendId: args.backendId,
    skillEntry,
    runnerJson,
    executionMode,
    materialization,
    workflowId: args.workflowId,
    jobId: args.jobId,
  });
  return { prepared, workspace, skillEntry };
}

export async function readPreparedSkillRun(
  runtimeDir: string,
): Promise<PreparedSkillRun | null> {
  const path = resolvePreparedSkillRunPath(runtimeDir);
  if (!path) {
    return null;
  }
  const text = await readRuntimeTextFile(path);
  if (!text.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(text) as PreparedSkillRun;
    if (parsed.schema !== SKILL_RUN_PREPARED_SCHEMA) {
      return null;
    }
    return (await verifyPreparedSkillRun(parsed)) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Recompute the frozen snapshot digest, not just trust the stored field, so a
 * continuation cannot run against a tampered or drifted snapshot.
 */
export async function verifyPreparedSkillRun(
  prepared: PreparedSkillRun,
): Promise<boolean> {
  if (!prepared?.provenance?.snapshotDigest) {
    return false;
  }
  const expected = await computeSnapshotDigest({
    skillId: prepared.skillId,
    requestId: prepared.requestId,
    backendId: prepared.backendId,
    executionMode: prepared.executionMode,
    runnerDigest: prepared.provenance.runnerDigest,
    schemaDigest: prepared.provenance.schemaDigest,
    instructionDigest: prepared.provenance.instructionDigest,
    resourcesDigest: prepared.resources.digest,
    input: prepared.inputs.input,
    parameter: prepared.inputs.parameter,
  });
  return !!expected && expected === prepared.provenance.snapshotDigest;
}

export {
  createAcpSkillRunnerWorkspace as createSkillRunWorkspace,
  writeAcpSkillRunnerInputManifest as writeSkillRunInputManifest,
  type SkillRunWorkspace,
};
