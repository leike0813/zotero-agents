import { getPref, setPref } from "../utils/prefs";
import { joinPath } from "../utils/path";
import { resolveRuntimeAddon } from "../utils/runtimeBridge";
import { loadWorkflowManifests } from "../workflows/loader";
import type { LoadedWorkflow, LoadedWorkflows } from "../workflows/types";
import {
  getOfficialWorkflowDir,
  readEffectiveContentPackageInstallState,
  type ContentPackageInstallState,
} from "./contentPackageSubscription";
import { scanPluginSkillRegistry } from "./pluginSkillRegistry";
import {
  getRuntimePersistencePaths,
  statRuntimePath,
} from "./runtimePersistence";
type WorkflowSourceKind = "official" | "dev-local" | "user";

type DynamicImport = (specifier: string) => Promise<any>;
const DEFAULT_SKILL_DIR_NAME = "skills";

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

type WorkflowRuntimeState = {
  workflowsDir: string;
  officialWorkflowsDir: string;
  builtinWorkflowsDir: string;
  devLocalWorkflowsDir: string;
  workflowSourceById: Record<string, WorkflowSourceKind>;
  loaded: LoadedWorkflows;
  loadedFromOfficial: LoadedWorkflows;
  loadedFromBuiltin: LoadedWorkflows;
  loadedFromDevLocal: LoadedWorkflows;
  loadedFromUser: LoadedWorkflows;
  latestContentInstall: ContentPackageInstallState | null;
  latestBuiltinSync: ContentPackageInstallState | null;
};

export function getDefaultWorkflowDir() {
  return joinPath(
    getRuntimePersistencePaths().root,
    "content",
    "user",
    "workflows",
  );
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
    officialWorkflowsDir: "",
    builtinWorkflowsDir: "",
    devLocalWorkflowsDir: "",
    workflowSourceById: {},
    loaded: emptyLoadedWorkflows(),
    loadedFromOfficial: emptyLoadedWorkflows(),
    loadedFromBuiltin: emptyLoadedWorkflows(),
    loadedFromDevLocal: emptyLoadedWorkflows(),
    loadedFromUser: emptyLoadedWorkflows(),
    latestContentInstall: null,
    latestBuiltinSync: null,
  };
}

let fallbackWorkflowState: WorkflowRuntimeState | undefined;

function ensureRuntimeStateShape(value: unknown): WorkflowRuntimeState {
  const state = (value || {}) as Partial<WorkflowRuntimeState>;
  return {
    workflowsDir: String(state.workflowsDir || ""),
    officialWorkflowsDir: String(
      state.officialWorkflowsDir || state.builtinWorkflowsDir || "",
    ),
    builtinWorkflowsDir: String(state.builtinWorkflowsDir || ""),
    devLocalWorkflowsDir: String(state.devLocalWorkflowsDir || ""),
    workflowSourceById: {
      ...((state.workflowSourceById || {}) as Record<
        string,
        WorkflowSourceKind
      >),
    },
    loaded: state.loaded || emptyLoadedWorkflows(),
    loadedFromOfficial:
      state.loadedFromOfficial ||
      state.loadedFromBuiltin ||
      emptyLoadedWorkflows(),
    loadedFromBuiltin: state.loadedFromBuiltin || emptyLoadedWorkflows(),
    loadedFromDevLocal: state.loadedFromDevLocal || emptyLoadedWorkflows(),
    loadedFromUser: state.loadedFromUser || emptyLoadedWorkflows(),
    latestContentInstall:
      (state.latestContentInstall as
        | ContentPackageInstallState
        | null
        | undefined) ||
      (state.latestBuiltinSync as
        | ContentPackageInstallState
        | null
        | undefined) ||
      null,
    latestBuiltinSync:
      (state.latestBuiltinSync as
        | ContentPackageInstallState
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
  return getOfficialWorkflowDir();
}

export function getOfficialWorkflowContentDir() {
  return getOfficialWorkflowDir();
}

function readEnvValue(key: string) {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
    Services?: { env?: { get?: (name: string) => string } };
  };
  const fromProcess = runtime.process?.env?.[key];
  if (typeof fromProcess === "string" && fromProcess.trim()) {
    return fromProcess.trim();
  }
  try {
    const fromServices = runtime.Services?.env?.get?.(key);
    if (typeof fromServices === "string" && fromServices.trim()) {
      return fromServices.trim();
    }
  } catch {
    // ignore env read failures
  }
  return "";
}

export function getDevLocalContentRoot() {
  return (
    readEnvValue("ZOTERO_AGENTS_CONTENT_DEV_ROOT") ||
    joinPath(getRuntimePersistencePaths().root, "content", "dev-local")
  );
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
  return getEffectiveSkillDirForWorkflowDir(getEffectiveWorkflowDir());
}

export function getEffectiveSkillDirForWorkflowDir(workflowsDir: string) {
  const current = String(getPref("skillDir") || "").trim();
  if (current) {
    return current;
  }
  return getDefaultSkillDirForWorkflowDir(workflowsDir);
}

async function pathIsDirectory(targetPath: string) {
  return !!targetPath && (await statRuntimePath(targetPath)).isDir;
}

async function resolveDevLocalContentSubdir(kind: "workflows" | "skills") {
  const devRoot = getDevLocalContentRoot();
  if (!(await pathIsDirectory(devRoot))) {
    return "";
  }
  const candidates =
    kind === "workflows"
      ? [joinPath(devRoot, "workflows_builtin"), joinPath(devRoot, "workflows")]
      : [joinPath(devRoot, "skills_builtin"), joinPath(devRoot, "skills")];
  for (const candidate of candidates) {
    if (await pathIsDirectory(candidate)) {
      return candidate;
    }
  }
  return "";
}

export async function getDevLocalWorkflowDir() {
  return resolveDevLocalContentSubdir("workflows");
}

export async function getDevLocalSkillDir() {
  return resolveDevLocalContentSubdir("skills");
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
    official_workflows_dir: state.officialWorkflowsDir,
    builtin_workflows_dir: state.builtinWorkflowsDir,
    dev_local_workflows_dir: state.devLocalWorkflowsDir,
    loaded_workflow_count: state.loaded.workflows.length,
    loaded_official_workflow_count: state.loadedFromOfficial.workflows.length,
    loaded_builtin_workflow_count: state.loadedFromBuiltin.workflows.length,
    loaded_dev_local_workflow_count: state.loadedFromDevLocal.workflows.length,
    loaded_user_workflow_count: state.loadedFromUser.workflows.length,
    workflows: summarizeLoadedWorkflows(state.loaded),
    builtin_workflows: summarizeLoadedWorkflows(state.loadedFromBuiltin),
    dev_local_workflows: summarizeLoadedWorkflows(state.loadedFromDevLocal),
    user_workflows: summarizeLoadedWorkflows(state.loadedFromUser),
    warnings: state.loaded.warnings,
    errors: state.loaded.errors,
    diagnostics: state.loaded.diagnostics || [],
    latest_content_install: state.latestContentInstall,
    latest_builtin_sync: state.latestBuiltinSync,
  };
  await ensureDirectoryExists(getDirectoryName(statusPath));
  await writeTextFile(statusPath, `${JSON.stringify(status, null, 2)}\n`);
}

async function loadMergedWorkflowManifests(args: {
  workflowsDir: string;
  officialWorkflowsDir: string;
  devLocalWorkflowsDir: string;
}) {
  const [loadedFromOfficial, loadedFromDevLocal, loadedFromUser] =
    await Promise.all([
      loadWorkflowManifests(args.officialWorkflowsDir, {
        workflowSourceKind: "official",
      }),
      args.devLocalWorkflowsDir
        ? loadWorkflowManifests(args.devLocalWorkflowsDir, {
            workflowSourceKind: "dev-local",
          })
        : Promise.resolve(emptyLoadedWorkflows()),
      loadWorkflowManifests(args.workflowsDir, {
        workflowSourceKind: "user",
      }),
    ]);

  const byWorkflowId = new Map<string, LoadedWorkflow>();
  const workflowSourceById: Record<string, WorkflowSourceKind> = {};
  const duplicateWarnings: string[] = [];

  for (const entry of loadedFromOfficial.workflows) {
    const workflowId = String(entry.manifest.id || "").trim();
    if (!workflowId) {
      continue;
    }
    byWorkflowId.set(workflowId, entry);
    workflowSourceById[workflowId] = "official";
  }

  for (const entry of loadedFromDevLocal.workflows) {
    const workflowId = String(entry.manifest.id || "").trim();
    if (!workflowId) {
      continue;
    }
    if (workflowSourceById[workflowId] === "official") {
      duplicateWarnings.push(
        `Workflow "${workflowId}" exists in official and dev-local directories; using dev-local workflow`,
      );
    }
    byWorkflowId.set(workflowId, entry);
    workflowSourceById[workflowId] = "dev-local";
  }

  for (const entry of loadedFromUser.workflows) {
    const workflowId = String(entry.manifest.id || "").trim();
    if (!workflowId) {
      continue;
    }
    if (
      workflowSourceById[workflowId] === "official" ||
      workflowSourceById[workflowId] === "dev-local"
    ) {
      duplicateWarnings.push(
        `Workflow "${workflowId}" exists in ${workflowSourceById[workflowId]} and user directories; using user workflow`,
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
      ...loadedFromOfficial.warnings,
      ...loadedFromDevLocal.warnings,
      ...loadedFromUser.warnings,
      ...duplicateWarnings,
    ],
    errors: [
      ...loadedFromOfficial.errors,
      ...loadedFromDevLocal.errors,
      ...loadedFromUser.errors,
    ],
    diagnostics: [
      ...(loadedFromOfficial.diagnostics || []),
      ...(loadedFromDevLocal.diagnostics || []),
      ...(loadedFromUser.diagnostics || []),
    ],
  };

  return {
    merged,
    loadedFromOfficial,
    loadedFromBuiltin: loadedFromOfficial,
    loadedFromDevLocal,
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
  const targetDirs = [
    String(getDefaultWorkflowDir() || "").trim(),
    String(
      getDefaultSkillDirForWorkflowDir(getDefaultWorkflowDir()) || "",
    ).trim(),
  ].filter(Boolean);
  if (targetDirs.length === 0) {
    return false;
  }
  let created = false;
  for (const targetDir of targetDirs) {
    created = (await ensureDefaultDirectoryExists(targetDir)) || created;
  }
  return created;
}

async function ensureDefaultDirectoryExists(targetDir: string) {
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

function collectSkillRunnerSkillDependencies(entry: LoadedWorkflow) {
  const manifest = entry.manifest;
  const request = manifest.request;
  const kind = String(request?.kind || "").trim();
  const skillIds = new Set<string>();
  if (kind === "skillrunner.job.v1") {
    const skillId = String(request?.create?.skill_id || "").trim();
    if (skillId) {
      skillIds.add(skillId);
    }
  }
  if (kind === "skillrunner.sequence.v1") {
    const steps = Array.isArray(request?.sequence?.steps)
      ? request?.sequence?.steps || []
      : [];
    for (const step of steps) {
      const skillId = String(step?.skill_id || "").trim();
      if (skillId) {
        skillIds.add(skillId);
      }
    }
  }
  return Array.from(skillIds).sort((left, right) => left.localeCompare(right));
}

function filterLoadedWorkflowsBySkillDependencies(
  loaded: LoadedWorkflows,
  effectiveSkillIds: Set<string>,
) {
  const diagnostics = [...(loaded.diagnostics || [])];
  const workflows: LoadedWorkflow[] = [];
  for (const entry of loaded.workflows) {
    const missingSkillIds = collectSkillRunnerSkillDependencies(entry).filter(
      (skillId) => !effectiveSkillIds.has(skillId),
    );
    if (missingSkillIds.length === 0) {
      workflows.push(entry);
      continue;
    }
    diagnostics.push({
      level: "warning",
      category: "skill_dependency_missing",
      message: `Skip workflow ${entry.manifest.id}: missing or invalid skill dependency ${missingSkillIds.join(", ")}`,
      workflowId: entry.manifest.id,
      path: entry.manifestPath,
      reason: missingSkillIds.join(","),
    });
  }
  const sortedDiagnostics = diagnostics.sort(
    (left, right) =>
      [
        left.level.localeCompare(right.level),
        left.category.localeCompare(right.category),
        String(left.workflowId || "").localeCompare(
          String(right.workflowId || ""),
        ),
        String(left.path || "").localeCompare(String(right.path || "")),
        left.message.localeCompare(right.message),
      ].find((value) => value !== 0) || 0,
  );
  return {
    ...loaded,
    workflows,
    manifests: workflows.map((entry) => entry.manifest),
    warnings: sortedDiagnostics
      .filter((entry) => entry.level === "warning")
      .map((entry) => entry.message),
    errors: sortedDiagnostics
      .filter((entry) => entry.level === "error")
      .map((entry) => entry.message),
    diagnostics: sortedDiagnostics,
  };
}

export async function rescanWorkflowRegistry(args?: { workflowsDir?: string }) {
  const workflowsDir = String(
    args?.workflowsDir || getEffectiveWorkflowDir(),
  ).trim();
  const officialWorkflowsDir = getOfficialWorkflowContentDir();
  const devLocalWorkflowsDir = await getDevLocalWorkflowDir();
  const {
    merged,
    loadedFromOfficial,
    loadedFromDevLocal,
    loadedFromUser,
    workflowSourceById,
  } = await loadMergedWorkflowManifests({
    workflowsDir,
    officialWorkflowsDir,
    devLocalWorkflowsDir,
  });
  const skillRegistry = await scanPluginSkillRegistry({
    devLocalRoot: await getDevLocalSkillDir(),
    userRoot: getEffectiveSkillDirForWorkflowDir(workflowsDir),
  });
  const effectiveSkillIds = new Set(
    skillRegistry.entries.map((entry) => entry.skillId),
  );
  const effectiveMerged = filterLoadedWorkflowsBySkillDependencies(
    merged,
    effectiveSkillIds,
  );
  const effectiveLoadedFromOfficial = filterLoadedWorkflowsBySkillDependencies(
    loadedFromOfficial,
    effectiveSkillIds,
  );
  const effectiveLoadedFromBuiltin = effectiveLoadedFromOfficial;
  const effectiveLoadedFromDevLocal = filterLoadedWorkflowsBySkillDependencies(
    loadedFromDevLocal,
    effectiveSkillIds,
  );
  const effectiveLoadedFromUser = filterLoadedWorkflowsBySkillDependencies(
    loadedFromUser,
    effectiveSkillIds,
  );

  const state = getState();
  const effectiveWorkflowSourceById: Record<string, WorkflowSourceKind> = {};
  for (const entry of effectiveMerged.workflows) {
    const workflowId = String(entry.manifest.id || "").trim();
    if (workflowId && workflowSourceById[workflowId]) {
      effectiveWorkflowSourceById[workflowId] = workflowSourceById[workflowId];
    }
  }
  state.workflowsDir = workflowsDir;
  state.officialWorkflowsDir = officialWorkflowsDir;
  state.builtinWorkflowsDir = officialWorkflowsDir;
  state.devLocalWorkflowsDir = devLocalWorkflowsDir;
  state.loaded = effectiveMerged;
  state.loadedFromOfficial = effectiveLoadedFromOfficial;
  state.loadedFromBuiltin = effectiveLoadedFromBuiltin;
  state.loadedFromDevLocal = effectiveLoadedFromDevLocal;
  state.loadedFromUser = effectiveLoadedFromUser;
  state.workflowSourceById = effectiveWorkflowSourceById;
  state.latestContentInstall = await readEffectiveContentPackageInstallState();
  state.latestBuiltinSync = state.latestContentInstall;
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
