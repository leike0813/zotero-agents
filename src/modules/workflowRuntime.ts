import { getPref, setPref } from "../utils/prefs";
import { joinPath } from "../utils/path";
import { resolveRuntimeAddon } from "../utils/runtimeBridge";
import { loadWorkflowManifests } from "../workflows/loader";
import type { LoadedWorkflow, LoadedWorkflows } from "../workflows/types";
import {
  getBuiltinWorkflowTargetDir,
  getLatestBuiltinWorkflowSyncResult,
  type BuiltinWorkflowSyncResult,
} from "./builtinWorkflowSync";
import { getRuntimePersistencePaths } from "./runtimePersistence";

type WorkflowSourceKind = "builtin" | "user";

type DynamicImport = (specifier: string) => Promise<any>;
const DEFAULT_SKILL_DIR_NAME = "skills";

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

type WorkflowRuntimeState = {
  workflowsDir: string;
  builtinWorkflowsDir: string;
  workflowSourceById: Record<string, WorkflowSourceKind>;
  loaded: LoadedWorkflows;
  loadedFromBuiltin: LoadedWorkflows;
  loadedFromUser: LoadedWorkflows;
  latestBuiltinSync: BuiltinWorkflowSyncResult | null;
};

export function getDefaultWorkflowDir() {
  return joinPath(getRuntimePersistencePaths().dataDir, "workflows");
}

function readTestWorkflowDirOverride() {
  const runtime = globalThis as {
    __zoteroSkillsDisableWorkflowDirOverride?: boolean;
    process?: { env?: Record<string, string | undefined> };
    Services?: { env?: { get?: (key: string) => string } };
  };

  if (runtime.__zoteroSkillsDisableWorkflowDirOverride) {
    return "";
  }

  const fromProcess = runtime.process?.env?.ZOTERO_TEST_WORKFLOW_DIR;
  if (typeof fromProcess === "string" && fromProcess.trim().length > 0) {
    return fromProcess.trim();
  }

  if (typeof runtime.Services?.env?.get === "function") {
    try {
      const fromServices = runtime.Services.env.get("ZOTERO_TEST_WORKFLOW_DIR");
      if (typeof fromServices === "string" && fromServices.trim().length > 0) {
        return fromServices.trim();
      }
    } catch {
      // ignore env read failures
    }
  }

  return "";
}

function emptyLoadedWorkflows(): LoadedWorkflows {
  return {
    workflows: [],
    manifests: [],
    warnings: [],
    errors: [],
    diagnostics: [],
  };
}

function emptyWorkflowRuntimeState(): WorkflowRuntimeState {
  return {
    workflowsDir: "",
    builtinWorkflowsDir: "",
    workflowSourceById: {},
    loaded: emptyLoadedWorkflows(),
    loadedFromBuiltin: emptyLoadedWorkflows(),
    loadedFromUser: emptyLoadedWorkflows(),
    latestBuiltinSync: null,
  };
}

let fallbackWorkflowState: WorkflowRuntimeState | undefined;

function ensureRuntimeStateShape(value: unknown): WorkflowRuntimeState {
  const state = (value || {}) as Partial<WorkflowRuntimeState>;
  return {
    workflowsDir: String(state.workflowsDir || ""),
    builtinWorkflowsDir: String(state.builtinWorkflowsDir || ""),
    workflowSourceById: {
      ...((state.workflowSourceById || {}) as Record<
        string,
        WorkflowSourceKind
      >),
    },
    loaded: state.loaded || emptyLoadedWorkflows(),
    loadedFromBuiltin: state.loadedFromBuiltin || emptyLoadedWorkflows(),
    loadedFromUser: state.loadedFromUser || emptyLoadedWorkflows(),
    latestBuiltinSync:
      (state.latestBuiltinSync as
        | BuiltinWorkflowSyncResult
        | null
        | undefined) || null,
  };
}

function getState() {
  const runtimeAddon = resolveRuntimeAddon();
  if (runtimeAddon?.data) {
    const current = ensureRuntimeStateShape(
      (runtimeAddon.data as { workflow?: unknown }).workflow,
    );
    (runtimeAddon.data as { workflow?: unknown }).workflow = current;
    return current;
  }
  if (!fallbackWorkflowState) {
    fallbackWorkflowState = emptyWorkflowRuntimeState();
  }
  return fallbackWorkflowState;
}

export function getBuiltinWorkflowDir() {
  return getBuiltinWorkflowTargetDir();
}

function sortWorkflows(workflows: LoadedWorkflow[]) {
  return [...workflows].sort((left, right) =>
    left.manifest.id.localeCompare(right.manifest.id),
  );
}

function getZoteroVersion() {
  const runtime = globalThis as {
    Zotero?: { version?: string };
  };
  return String(runtime.Zotero?.version || "");
}

function getWorkflowRegistryStatusFilePath() {
  return joinPath(
    getRuntimePersistencePaths().stateDir,
    "workflow-registry-status.json",
  );
}

function getDirectoryName(targetPath: string) {
  const normalized = String(targetPath || "").replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) {
    return "";
  }
  const first = normalized.startsWith("/") ? "/" : "";
  const driveMatch = normalized.match(/^([A-Za-z]:)\//);
  const drivePrefix = driveMatch?.[1] || "";
  const parentParts = parts.slice(0, -1);
  if (drivePrefix) {
    return joinPath(drivePrefix, ...parentParts.slice(1));
  }
  if (first) {
    return joinPath(first, ...parentParts);
  }
  return joinPath(...parentParts);
}

export function getDefaultSkillDirForWorkflowDir(workflowsDir: string) {
  const parentDir = getDirectoryName(String(workflowsDir || "").trim());
  return parentDir
    ? joinPath(parentDir, DEFAULT_SKILL_DIR_NAME)
    : DEFAULT_SKILL_DIR_NAME;
}

export function getDefaultSkillDir() {
  return getDefaultSkillDirForWorkflowDir(getEffectiveWorkflowDir());
}

export function getEffectiveSkillDir() {
  const current = String(getPref("skillDir") || "").trim();
  if (current) {
    return current;
  }
  return getDefaultSkillDir();
}

async function ensureDirectoryExists(targetDir: string) {
  const runtime = globalThis as {
    IOUtils?: {
      makeDirectory?: (
        path: string,
        options?: { createAncestors?: boolean },
      ) => Promise<void>;
    };
  };
  if (typeof runtime.IOUtils?.makeDirectory === "function") {
    await runtime.IOUtils.makeDirectory(targetDir, { createAncestors: true });
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.mkdir(targetDir, { recursive: true });
}

async function writeTextFile(filePath: string, content: string) {
  const runtime = globalThis as {
    IOUtils?: { writeUTF8?: (path: string, data: string) => Promise<unknown> };
  };
  if (typeof runtime.IOUtils?.writeUTF8 === "function") {
    await runtime.IOUtils.writeUTF8(filePath, content);
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.writeFile(filePath, content, "utf8");
}

function summarizeLoadedWorkflows(loaded: LoadedWorkflows) {
  return loaded.workflows.map((entry) => ({
    id: entry.manifest.id,
    label: entry.manifest.label,
    provider: entry.manifest.provider || "",
    packageId: entry.packageId,
    sourceKind: entry.workflowSourceKind || "",
    hookExecutionMode: entry.hookExecutionMode || "",
    rootDir: entry.rootDir,
    manifestPath: entry.manifestPath,
  }));
}

async function persistWorkflowRegistryStatus(state: WorkflowRuntimeState) {
  const statusPath = getWorkflowRegistryStatusFilePath();
  if (!statusPath) {
    return;
  }
  const status = {
    schema_id: "zotero-skills.workflow_registry_status",
    schema_version: "1.0.0",
    written_at: new Date().toISOString(),
    zotero_version: getZoteroVersion(),
    workflows_dir: state.workflowsDir,
    builtin_workflows_dir: state.builtinWorkflowsDir,
    loaded_workflow_count: state.loaded.workflows.length,
    loaded_builtin_workflow_count: state.loadedFromBuiltin.workflows.length,
    loaded_user_workflow_count: state.loadedFromUser.workflows.length,
    workflows: summarizeLoadedWorkflows(state.loaded),
    builtin_workflows: summarizeLoadedWorkflows(state.loadedFromBuiltin),
    user_workflows: summarizeLoadedWorkflows(state.loadedFromUser),
    warnings: state.loaded.warnings,
    errors: state.loaded.errors,
    diagnostics: state.loaded.diagnostics || [],
    latest_builtin_sync: state.latestBuiltinSync,
  };
  await ensureDirectoryExists(getDirectoryName(statusPath));
  await writeTextFile(statusPath, `${JSON.stringify(status, null, 2)}\n`);
}

async function loadMergedWorkflowManifests(args: {
  workflowsDir: string;
  builtinWorkflowsDir: string;
}) {
  const [loadedFromBuiltin, loadedFromUser] = await Promise.all([
    loadWorkflowManifests(args.builtinWorkflowsDir, {
      workflowSourceKind: "builtin",
    }),
    loadWorkflowManifests(args.workflowsDir, {
      workflowSourceKind: "user",
    }),
  ]);

  const byWorkflowId = new Map<string, LoadedWorkflow>();
  const workflowSourceById: Record<string, WorkflowSourceKind> = {};
  const duplicateWarnings: string[] = [];

  for (const entry of loadedFromBuiltin.workflows) {
    const workflowId = String(entry.manifest.id || "").trim();
    if (!workflowId) {
      continue;
    }
    byWorkflowId.set(workflowId, entry);
    workflowSourceById[workflowId] = "builtin";
  }

  for (const entry of loadedFromUser.workflows) {
    const workflowId = String(entry.manifest.id || "").trim();
    if (!workflowId) {
      continue;
    }
    if (workflowSourceById[workflowId] === "builtin") {
      duplicateWarnings.push(
        `Workflow "${workflowId}" exists in builtin and user directories; using user workflow`,
      );
    }
    byWorkflowId.set(workflowId, entry);
    workflowSourceById[workflowId] = "user";
  }

  const workflows = sortWorkflows(Array.from(byWorkflowId.values()));
  const merged: LoadedWorkflows = {
    workflows,
    manifests: workflows.map((entry) => entry.manifest),
    warnings: [
      ...loadedFromBuiltin.warnings,
      ...loadedFromUser.warnings,
      ...duplicateWarnings,
    ],
    errors: [...loadedFromBuiltin.errors, ...loadedFromUser.errors],
    diagnostics: [
      ...(loadedFromBuiltin.diagnostics || []),
      ...(loadedFromUser.diagnostics || []),
    ],
  };

  return {
    merged,
    loadedFromBuiltin,
    loadedFromUser,
    workflowSourceById,
  };
}

export function getEffectiveWorkflowDir() {
  const current = String(getPref("workflowDir") || "").trim();
  if (current) {
    return current;
  }

  const testOverride = readTestWorkflowDirOverride();
  if (testOverride) {
    return testOverride;
  }

  return getDefaultWorkflowDir();
}

export async function ensureDefaultWorkflowDirExistsOnStartup() {
  const targetDir = String(getDefaultWorkflowDir() || "").trim();
  if (!targetDir) {
    return false;
  }
  const runtime = globalThis as {
    IOUtils?: {
      makeDirectory?: (
        path: string,
        options?: { createAncestors?: boolean },
      ) => Promise<void>;
    };
  };
  if (typeof runtime.IOUtils?.makeDirectory !== "function") {
    const zoteroRuntime = globalThis as {
      Zotero?: {
        File?: {
          pathToFile?: (path: string) => unknown;
          createDirectoryIfMissingAsync?: (dir: unknown) => Promise<void>;
        };
      };
    };
    if (
      typeof zoteroRuntime.Zotero?.File?.pathToFile === "function" &&
      typeof zoteroRuntime.Zotero?.File?.createDirectoryIfMissingAsync ===
        "function"
    ) {
      try {
        const targetDirFile = zoteroRuntime.Zotero.File.pathToFile(targetDir);
        await zoteroRuntime.Zotero.File.createDirectoryIfMissingAsync(
          targetDirFile,
        );
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
  try {
    await runtime.IOUtils.makeDirectory(targetDir, {
      createAncestors: true,
    });
    return true;
  } catch {
    return false;
  }
}

export async function rescanWorkflowRegistry(args?: { workflowsDir?: string }) {
  const workflowsDir = String(
    args?.workflowsDir || getEffectiveWorkflowDir(),
  ).trim();
  const builtinWorkflowsDir = getBuiltinWorkflowDir();
  const { merged, loadedFromBuiltin, loadedFromUser, workflowSourceById } =
    await loadMergedWorkflowManifests({
      workflowsDir,
      builtinWorkflowsDir,
    });

  const state = getState();
  state.workflowsDir = workflowsDir;
  state.builtinWorkflowsDir = builtinWorkflowsDir;
  state.loaded = merged;
  state.loadedFromBuiltin = loadedFromBuiltin;
  state.loadedFromUser = loadedFromUser;
  state.workflowSourceById = workflowSourceById;
  state.latestBuiltinSync = getLatestBuiltinWorkflowSyncResult();
  try {
    await persistWorkflowRegistryStatus(state);
  } catch {
    // Registry scans must not fail just because diagnostics cannot be written.
  }
  return state;
}

export function getWorkflowRegistryState() {
  return getState();
}

export function getLoadedWorkflowEntries(): LoadedWorkflow[] {
  return getState().loaded.workflows;
}

export function getLoadedWorkflowSourceById(
  workflowId: string,
): WorkflowSourceKind | "" {
  const normalizedId = String(workflowId || "").trim();
  if (!normalizedId) {
    return "";
  }
  return getState().workflowSourceById[normalizedId] || "";
}

export const __workflowRuntimeTestOnly = {
  getWorkflowRegistryStatusFilePath,
};
