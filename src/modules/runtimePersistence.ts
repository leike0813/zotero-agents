import { joinPath } from "../utils/path";
import { getTaskHistoryRetentionConfig } from "./taskRetentionPolicy";

type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

export type RuntimePersistenceCategory =
  | "state"
  | "logs"
  | "skillrunner-ledger"
  | "acp-conversations"
  | "acp-skill-runs"
  | "workflow-products"
  | "cache"
  | "tmp";

export type RuntimePersistencePaths = {
  root: string;
  runtimeRoot: string;
  dataDir: string;
  synthesisDataRoot: string;
  stateDir: string;
  stateDbPath: string;
  logsDir: string;
  runtimeLogPath: string;
  acpChatRoot: string;
  acpChatWorkspaceDir: string;
  acpChatConversationsDir: string;
  /** Legacy ACP Chat private storage path. New writes use acpChatConversationsDir. */
  legacyAcpChatWorkspacesDir: string;
  acpChatRuntimeDir: string;
  acpSkillRunsDir: string;
  workflowProductsDir: string;
  cacheDir: string;
  tmpDir: string;
  legacyDir: string;
};

export type RuntimePersistenceCategoryUsage = {
  category: RuntimePersistenceCategory;
  label: string;
  path?: string;
  bytes: number;
  exists: boolean;
  cleanable: boolean;
  itemCount?: number;
  recordCount?: number;
};

export type RuntimePersistenceStateDatabaseUsage = {
  path: string;
  bytes: number;
  exists: boolean;
  itemCount?: number;
};

export type RuntimePersistenceUsageSnapshot = {
  root: string;
  scannedAt: string;
  totalBytes: number;
  categories: RuntimePersistenceCategoryUsage[];
  stateDatabase?: RuntimePersistenceStateDatabaseUsage;
};

export type ManagedPathDiagnosticCode =
  | "managed_path_invalid"
  | "managed_path_reserved_name"
  | "managed_path_segment_too_long"
  | "managed_relative_path_too_long"
  | "managed_path_case_collision"
  | "managed_absolute_path_long";

export type ManagedPathDiagnostic = {
  code: ManagedPathDiagnosticCode;
  severity: "warning" | "error";
  message: string;
  path_kind?: "managed_relative_path" | "managed_absolute_path";
  relativePath?: string;
  segment?: string;
  limit?: number;
  actual?: number;
  details?: Record<string, unknown>;
};

export type ManagedPathPolicyOptions = {
  pathKind?: "managed_relative_path" | "managed_absolute_path";
  maxSegmentLength?: number;
  maxRelativePathLength?: number;
  absolutePathWarningLength?: number;
  allowedSegmentPattern?: RegExp;
};

export type ManagedRelativePathValidationResult = {
  ok: boolean;
  normalizedPath: string;
  diagnostics: ManagedPathDiagnostic[];
};

export class ManagedPathPolicyError extends Error {
  readonly diagnostics: ManagedPathDiagnostic[];

  readonly code: ManagedPathDiagnosticCode;

  constructor(message: string, diagnostics: ManagedPathDiagnostic[]) {
    super(message);
    this.name = "ManagedPathPolicyError";
    this.diagnostics = diagnostics;
    this.code = diagnostics[0]?.code || "managed_path_invalid";
  }
}

export const MANAGED_PATH_MAX_SEGMENT_LENGTH = 96;
export const MANAGED_RELATIVE_PATH_MAX_LENGTH = 220;
export const MANAGED_TRANSACTION_ID_MAX_LENGTH = 64;

const DEFAULT_MANAGED_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;
const WINDOWS_RESERVED_BASENAMES = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
]);

const INTERNAL_APP_DIR_NAME = "zotero-agents";
const LEGACY_APP_DIR_NAME = "zotero-skills";
const SQLITE_FILE_NAME = "zotero-agents.db";
const LEGACY_SQLITE_FILE_NAME = "zotero-skills.db";
const RUNTIME_LOG_FILE_NAME = "runtime-logs.json";
const PLUGIN_PREFS_PREFIX = "extensions.zotero.zotero-skills";

let runtimeLogClearer: (() => void) | null = null;
let pluginTaskDomainClearer: ((domain: string) => number) | null = null;
let pluginTaskDomainExceptRowScopesClearer:
  | ((domain: string, preservedRowScopes: string[]) => number)
  | null = null;
let pluginTaskScopeClearer: ((domain: string, scope: string) => number) | null =
  null;
let pluginTaskDomainCounter: ((domain: string) => number) | null = null;
let pluginTaskDomainExceptRowScopesCounter:
  | ((domain: string, preservedRowScopes: string[]) => number)
  | null = null;
let pluginTaskScopeCounter: ((domain: string, scope: string) => number) | null =
  null;
let pluginTaskDomainByteEstimator: ((domain: string) => number) | null = null;
let pluginTaskDomainExceptRowScopesByteEstimator:
  | ((domain: string, preservedRowScopes: string[]) => number)
  | null = null;
let pluginTaskScopeByteEstimator:
  | ((domain: string, scope: string) => number)
  | null = null;
let acpSkillRunsMemoryClearer: (() => void) | null = null;
let acpSkillRunsRetentionCleaner:
  | ((args: { retentionMs: number; nowMs: number }) => {
      rowsDeleted: number;
      requestIds: string[];
      workspaceDirs: string[];
    })
  | null = null;

export function registerRuntimeLogClearer(clearer: (() => void) | null) {
  runtimeLogClearer = clearer;
}

export function registerPluginTaskDomainClearer(
  clearer: ((domain: string) => number) | null,
) {
  pluginTaskDomainClearer = clearer;
}

export function registerPluginTaskDomainExceptRowScopesClearer(
  clearer: ((domain: string, preservedRowScopes: string[]) => number) | null,
) {
  pluginTaskDomainExceptRowScopesClearer = clearer;
}

export function registerPluginTaskScopeClearer(
  clearer: ((domain: string, scope: string) => number) | null,
) {
  pluginTaskScopeClearer = clearer;
}

export function registerPluginTaskDomainCounter(
  counter: ((domain: string) => number) | null,
) {
  pluginTaskDomainCounter = counter;
}

export function registerPluginTaskDomainExceptRowScopesCounter(
  counter: ((domain: string, preservedRowScopes: string[]) => number) | null,
) {
  pluginTaskDomainExceptRowScopesCounter = counter;
}

export function registerPluginTaskScopeCounter(
  counter: ((domain: string, scope: string) => number) | null,
) {
  pluginTaskScopeCounter = counter;
}

export function registerPluginTaskDomainByteEstimator(
  estimator: ((domain: string) => number) | null,
) {
  pluginTaskDomainByteEstimator = estimator;
}

export function registerPluginTaskDomainExceptRowScopesByteEstimator(
  estimator: ((domain: string, preservedRowScopes: string[]) => number) | null,
) {
  pluginTaskDomainExceptRowScopesByteEstimator = estimator;
}

export function registerPluginTaskScopeByteEstimator(
  estimator: ((domain: string, scope: string) => number) | null,
) {
  pluginTaskScopeByteEstimator = estimator;
}

export function registerAcpSkillRunsMemoryClearer(
  clearer: (() => void) | null,
) {
  acpSkillRunsMemoryClearer = clearer;
}

export function registerAcpSkillRunsRetentionCleaner(
  cleaner:
    | ((args: { retentionMs: number; nowMs: number }) => {
        rowsDeleted: number;
        requestIds: string[];
        workspaceDirs: string[];
      })
    | null,
) {
  acpSkillRunsRetentionCleaner = cleaner;
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeSlashes(path: string) {
  return normalizeString(path).replace(/\\/g, "/");
}

function isPathWithinRoot(rootRaw: string, targetRaw: string) {
  const root = normalizeSlashes(rootRaw).replace(/\/+$/g, "");
  const target = normalizeSlashes(targetRaw).replace(/\/+$/g, "");
  return !!root && (target === root || target.startsWith(`${root}/`));
}

function isAbsolutePathLike(path: string) {
  return (
    /^(?:[A-Za-z]:)?\//.test(path) ||
    /^[A-Za-z]:\//.test(path) ||
    /^[A-Za-z]:/.test(path) ||
    /^[A-Za-z]:$/.test(path) ||
    /^\/\//.test(path)
  );
}

function createManagedPathDiagnostic(args: ManagedPathDiagnostic) {
  return args;
}

function reservedBaseName(segment: string) {
  const baseNamePart = segment.split(".")[0]?.toUpperCase() || "";
  return WINDOWS_RESERVED_BASENAMES.has(baseNamePart);
}

export function validateManagedRelativePath(
  value: unknown,
  options: ManagedPathPolicyOptions = {},
): ManagedRelativePathValidationResult {
  const maxSegmentLength =
    options.maxSegmentLength || MANAGED_PATH_MAX_SEGMENT_LENGTH;
  const maxRelativePathLength =
    options.maxRelativePathLength || MANAGED_RELATIVE_PATH_MAX_LENGTH;
  const allowedSegmentPattern =
    options.allowedSegmentPattern || DEFAULT_MANAGED_SEGMENT_PATTERN;
  const input = normalizeSlashes(String(value ?? ""));
  const diagnostics: ManagedPathDiagnostic[] = [];

  if (!input) {
    diagnostics.push(
      createManagedPathDiagnostic({
        code: "managed_path_invalid",
        severity: "error",
        message: "Managed relative path must be non-empty.",
        path_kind: "managed_relative_path",
      }),
    );
    return { ok: false, normalizedPath: "", diagnostics };
  }
  if (isAbsolutePathLike(input)) {
    diagnostics.push(
      createManagedPathDiagnostic({
        code: "managed_path_invalid",
        severity: "error",
        message: "Managed relative path must not be absolute.",
        path_kind: "managed_relative_path",
        relativePath: input,
      }),
    );
  }

  const rawParts = input.split("/");
  const parts = rawParts.filter(Boolean);
  const normalizedPath = parts.join("/");
  if (
    parts.length === 0 ||
    rawParts.some((part, index) => part === "" && index > 0)
  ) {
    diagnostics.push(
      createManagedPathDiagnostic({
        code: "managed_path_invalid",
        severity: "error",
        message: "Managed relative path contains empty segments.",
        path_kind: "managed_relative_path",
        relativePath: input,
      }),
    );
  }
  if (parts.some((part) => part === "." || part === "..")) {
    diagnostics.push(
      createManagedPathDiagnostic({
        code: "managed_path_invalid",
        severity: "error",
        message: "Managed relative path must not traverse directories.",
        path_kind: "managed_relative_path",
        relativePath: normalizedPath,
      }),
    );
  }
  if (normalizedPath.length > maxRelativePathLength) {
    diagnostics.push(
      createManagedPathDiagnostic({
        code: "managed_relative_path_too_long",
        severity: "error",
        message: "Managed relative path exceeds the configured budget.",
        path_kind: "managed_relative_path",
        relativePath: normalizedPath,
        limit: maxRelativePathLength,
        actual: normalizedPath.length,
      }),
    );
  }

  for (const segment of parts) {
    if (segment.length > maxSegmentLength) {
      diagnostics.push(
        createManagedPathDiagnostic({
          code: "managed_path_segment_too_long",
          severity: "error",
          message: "Managed path segment exceeds the configured budget.",
          path_kind: "managed_relative_path",
          relativePath: normalizedPath,
          segment,
          limit: maxSegmentLength,
          actual: segment.length,
        }),
      );
    }
    if (reservedBaseName(segment)) {
      diagnostics.push(
        createManagedPathDiagnostic({
          code: "managed_path_reserved_name",
          severity: "error",
          message: "Managed path segment uses a reserved device name.",
          path_kind: "managed_relative_path",
          relativePath: normalizedPath,
          segment,
        }),
      );
    }
    if (/[. ]$/.test(segment)) {
      diagnostics.push(
        createManagedPathDiagnostic({
          code: "managed_path_invalid",
          severity: "error",
          message: "Managed path segment must not end with a dot or space.",
          path_kind: "managed_relative_path",
          relativePath: normalizedPath,
          segment,
        }),
      );
    }
    if (!allowedSegmentPattern.test(segment)) {
      diagnostics.push(
        createManagedPathDiagnostic({
          code: "managed_path_invalid",
          severity: "error",
          message: "Managed path segment contains unsupported characters.",
          path_kind: "managed_relative_path",
          relativePath: normalizedPath,
          segment,
        }),
      );
    }
  }

  return {
    ok: !diagnostics.some((entry) => entry.severity === "error"),
    normalizedPath,
    diagnostics,
  };
}

export function assertManagedRelativePath(
  value: unknown,
  options: ManagedPathPolicyOptions = {},
) {
  const result = validateManagedRelativePath(value, options);
  if (!result.ok) {
    throw new ManagedPathPolicyError(
      result.diagnostics[0]?.message || "Managed relative path is invalid.",
      result.diagnostics,
    );
  }
  return result.normalizedPath;
}

export function validateManagedRelativePathSet(
  values: unknown[],
  options: ManagedPathPolicyOptions = {},
) {
  const diagnostics: ManagedPathDiagnostic[] = [];
  const normalizedPaths: string[] = [];
  const byDirectoryAndName = new Map<string, string>();
  for (const value of values) {
    const result = validateManagedRelativePath(value, options);
    diagnostics.push(...result.diagnostics);
    if (!result.normalizedPath) {
      continue;
    }
    normalizedPaths.push(result.normalizedPath);
    const index = result.normalizedPath.lastIndexOf("/");
    const directory = index >= 0 ? result.normalizedPath.slice(0, index) : "";
    const name =
      index >= 0
        ? result.normalizedPath.slice(index + 1)
        : result.normalizedPath;
    const key = `${directory.toLowerCase()}/${name.toLowerCase()}`;
    const existing = byDirectoryAndName.get(key);
    if (existing && existing !== result.normalizedPath) {
      diagnostics.push(
        createManagedPathDiagnostic({
          code: "managed_path_case_collision",
          severity: "error",
          message: "Managed paths collide on case-insensitive filesystems.",
          path_kind: "managed_relative_path",
          relativePath: result.normalizedPath,
          details: { existing },
        }),
      );
    } else {
      byDirectoryAndName.set(key, result.normalizedPath);
    }
  }
  return {
    ok: !diagnostics.some((entry) => entry.severity === "error"),
    normalizedPaths,
    diagnostics,
  };
}

export function validateManagedAbsolutePath(
  value: unknown,
  options: ManagedPathPolicyOptions = {},
) {
  const input = normalizeString(value);
  const platform = getPlatform();
  const warningLength =
    options.absolutePathWarningLength || (platform === "win32" ? 240 : 900);
  const diagnostics: ManagedPathDiagnostic[] = [];
  if (input && input.length > warningLength) {
    diagnostics.push(
      createManagedPathDiagnostic({
        code: "managed_absolute_path_long",
        severity: "warning",
        message: "Managed absolute path is longer than the platform guidance.",
        path_kind: "managed_absolute_path",
        limit: warningLength,
        actual: input.length,
      }),
    );
  }
  return {
    ok: true,
    normalizedPath: input,
    diagnostics,
  };
}

function baseName(pathRaw: string) {
  const normalized = normalizeSlashes(pathRaw).replace(/\/+$/g, "");
  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(index + 1) : normalized;
}

function getRuntimeCwd() {
  const runtime = globalThis as { process?: { cwd?: () => string } };
  return normalizeString(runtime.process?.cwd?.()) || ".";
}

function readEnv(key: string) {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
    Services?: { env?: { get?: (name: string) => string } };
  };
  const fromProcess = normalizeString(runtime.process?.env?.[key]);
  if (fromProcess) {
    return fromProcess;
  }
  try {
    const fromServices = normalizeString(runtime.Services?.env?.get?.(key));
    if (fromServices) {
      return fromServices;
    }
  } catch {
    return "";
  }
  return "";
}

function readPluginPref(key: string) {
  const runtime = globalThis as {
    Zotero?: { Prefs?: { get?: (name: string, global?: boolean) => unknown } };
  };
  try {
    return normalizeString(
      runtime.Zotero?.Prefs?.get?.(`${PLUGIN_PREFS_PREFIX}.${key}`, true),
    );
  } catch {
    return "";
  }
}

function getPlatform() {
  const runtime = globalThis as {
    process?: { platform?: string };
    Services?: { appinfo?: { OS?: string } };
  };
  const nodePlatform = normalizeString(runtime.process?.platform).toLowerCase();
  if (nodePlatform) {
    return nodePlatform;
  }
  const os = normalizeString(runtime.Services?.appinfo?.OS).toLowerCase();
  if (os.includes("win")) {
    return "win32";
  }
  if (os.includes("darwin") || os.includes("mac")) {
    return "darwin";
  }
  return os || "";
}

function resolvePlatformDataRoot() {
  const override = readEnv("ZOTERO_SKILLS_RUNTIME_ROOT");
  if (override) {
    return override;
  }
  const prefOverride = readPluginPref("runtimeRoot");
  if (prefOverride) {
    return prefOverride;
  }

  const zoteroDataDir = normalizeString(
    (globalThis as { Zotero?: { DataDirectory?: { dir?: string } } }).Zotero
      ?.DataDirectory?.dir,
  );
  if (zoteroDataDir) {
    return joinPath(zoteroDataDir, INTERNAL_APP_DIR_NAME);
  }

  const platform = getPlatform();
  if (platform === "win32") {
    const localAppData =
      readEnv("LOCALAPPDATA") ||
      readEnv("LocalAppData") ||
      readEnv("APPDATA") ||
      readEnv("AppData");
    if (localAppData) {
      return joinPath(localAppData, INTERNAL_APP_DIR_NAME);
    }
  }

  if (platform === "darwin") {
    const home = readEnv("HOME") || readEnv("Home");
    if (home) {
      return joinPath(
        home,
        "Library",
        "Application Support",
        INTERNAL_APP_DIR_NAME,
      );
    }
  }

  const xdgDataHome = readEnv("XDG_DATA_HOME");
  if (xdgDataHome) {
    return joinPath(xdgDataHome, INTERNAL_APP_DIR_NAME);
  }
  const home = readEnv("HOME") || readEnv("Home") || readEnv("USERPROFILE");
  if (home) {
    return joinPath(home, ".local", "share", INTERNAL_APP_DIR_NAME);
  }

  return joinPath(getRuntimeCwd(), ".zotero-agents");
}

export function resolveRuntimePersistenceRoot() {
  return resolvePlatformDataRoot();
}

export function getRuntimePersistencePaths(
  rootRaw?: string,
): RuntimePersistencePaths {
  const root = normalizeString(rootRaw) || resolveRuntimePersistenceRoot();
  const runtimeRoot = joinPath(root, "runtime");
  const dataDir = joinPath(root, "data");
  const stateDir = joinPath(root, "state");
  const logsDir = joinPath(runtimeRoot, "logs");
  const acpChatRoot = joinPath(runtimeRoot, "acp", "chat");
  return {
    root,
    runtimeRoot,
    dataDir,
    synthesisDataRoot: joinPath(dataDir, "synthesis"),
    stateDir,
    stateDbPath: joinPath(stateDir, SQLITE_FILE_NAME),
    logsDir,
    runtimeLogPath: joinPath(logsDir, RUNTIME_LOG_FILE_NAME),
    acpChatRoot,
    acpChatWorkspaceDir: joinPath(acpChatRoot, "workspace"),
    acpChatConversationsDir: joinPath(acpChatRoot, "conversations"),
    legacyAcpChatWorkspacesDir: joinPath(acpChatRoot, "workspaces"),
    acpChatRuntimeDir: joinPath(acpChatRoot, "runtime"),
    acpSkillRunsDir: joinPath(runtimeRoot, "acp", "skill-runs"),
    workflowProductsDir: joinPath(runtimeRoot, "workflow-products"),
    cacheDir: joinPath(runtimeRoot, "cache"),
    tmpDir: joinPath(runtimeRoot, "tmp"),
    legacyDir: joinPath(root, "legacy"),
  };
}

export function resolveLegacyZoteroPluginDataRoot() {
  const runtime = globalThis as {
    Zotero?: { DataDirectory?: { dir?: string } };
    process?: { cwd?: () => string };
  };
  const dataDir = normalizeString(runtime.Zotero?.DataDirectory?.dir);
  if (dataDir) {
    return dataDir;
  }
  return joinPath(getRuntimeCwd(), ".zotero-skills-runtime");
}

export function getLegacyPluginStateDatabasePath() {
  return joinPath(
    resolveLegacyZoteroPluginDataRoot(),
    LEGACY_APP_DIR_NAME,
    "state",
    LEGACY_SQLITE_FILE_NAME,
  );
}

export function getLegacyRuntimeRootPath() {
  const dataRoot = resolveLegacyZoteroPluginDataRoot();
  return joinPath(dataRoot, LEGACY_APP_DIR_NAME);
}

export function getLegacyAcpRootPath() {
  const dataRoot = resolveLegacyZoteroPluginDataRoot();
  const normalizedRoot = normalizeSlashes(dataRoot);
  if (
    normalizedRoot.endsWith("/.zotero-skills-runtime") ||
    normalizedRoot.endsWith(".zotero-skills-runtime")
  ) {
    return joinPath(dataRoot, "acp");
  }
  return joinPath(dataRoot, "zotero-skills", "acp");
}

export function getLegacyAcpSkillRunnerRootPath() {
  return joinPath(getRuntimeCwd(), ".zotero-skills-runtime", "acp-skillrunner");
}

async function tryNodeFs() {
  const runtime = globalThis as { process?: unknown };
  if (!runtime.process) {
    return null;
  }
  try {
    return await dynamicImport("fs/promises");
  } catch {
    return null;
  }
}

export async function runtimePathExists(pathRaw: string) {
  const path = normalizeString(pathRaw);
  if (!path) {
    return false;
  }
  const runtime = globalThis as {
    IOUtils?: { exists?: (path: string) => Promise<boolean> };
    OS?: { File?: { exists?: (path: string) => Promise<boolean> } };
  };
  if (typeof runtime.IOUtils?.exists === "function") {
    try {
      return await runtime.IOUtils.exists(path);
    } catch {
      return false;
    }
  }
  if (typeof runtime.OS?.File?.exists === "function") {
    try {
      return await runtime.OS.File.exists(path);
    } catch {
      return false;
    }
  }
  const fs = await tryNodeFs();
  if (fs) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function ensureRuntimeDirectory(pathRaw: string) {
  const path = normalizeString(pathRaw);
  if (!path) {
    return;
  }
  const nodeFs = await tryNodeFs();
  if (nodeFs) {
    await nodeFs.mkdir(path, { recursive: true });
    return;
  }
  const runtime = globalThis as {
    IOUtils?: {
      makeDirectory?: (path: string, options?: unknown) => Promise<void>;
    };
    Zotero?: {
      File?: {
        pathToFile?: (path: string) => {
          parent?: any;
          exists?: () => boolean;
          create?: (type: number, permissions: number) => void;
        };
      };
    };
    Components?: { interfaces?: { nsIFile?: { DIRECTORY_TYPE?: number } } };
  };
  if (typeof runtime.IOUtils?.makeDirectory === "function") {
    try {
      await runtime.IOUtils.makeDirectory(path, {
        createAncestors: true,
        ignoreExisting: true,
      });
      const stat = await statRuntimePath(path);
      if (stat.exists && stat.isDir) {
        return;
      }
    } catch {
      // fall through to other runtimes
    }
  }
  const file = runtime.Zotero?.File?.pathToFile?.(path);
  if (file) {
    const ensureOne = (entry: any) => {
      if (!entry) {
        return;
      }
      if (typeof entry.exists === "function" && entry.exists()) {
        return;
      }
      ensureOne(entry.parent);
      if (typeof entry.create === "function") {
        const directoryType =
          runtime.Components?.interfaces?.nsIFile?.DIRECTORY_TYPE ?? 1;
        entry.create(directoryType, 0o755);
      }
    };
    ensureOne(file);
    return;
  }
}

export async function copyRuntimeFileIfMissing(args: {
  sourcePath: string;
  targetPath: string;
}) {
  const sourcePath = normalizeString(args.sourcePath);
  const targetPath = normalizeString(args.targetPath);
  if (!sourcePath || !targetPath || sourcePath === targetPath) {
    return false;
  }
  if (
    !(await runtimePathExists(sourcePath)) ||
    (await runtimePathExists(targetPath))
  ) {
    return false;
  }
  await copyRuntimeFile({ sourcePath, targetPath });
  return true;
}

export async function copyRuntimeFile(args: {
  sourcePath: string;
  targetPath: string;
}) {
  const sourcePath = normalizeString(args.sourcePath);
  const targetPath = normalizeString(args.targetPath);
  if (!sourcePath || !targetPath) {
    throw new Error("sourcePath and targetPath are required to copy a file");
  }
  if (sourcePath === targetPath) {
    return false;
  }
  if (!(await runtimePathExists(sourcePath))) {
    throw new Error(`source file does not exist: ${sourcePath}`);
  }
  await ensureRuntimeDirectory(parentPath(targetPath));
  const runtime = globalThis as {
    IOUtils?: {
      copy?: (source: string, target: string) => Promise<void>;
      read?: (path: string) => Promise<Uint8Array>;
      write?: (path: string, data: Uint8Array) => Promise<unknown>;
    };
    OS?: {
      File?: {
        copy?: (source: string, target: string) => Promise<void>;
        read?: (path: string, options?: unknown) => Promise<Uint8Array>;
        writeAtomic?: (
          path: string,
          data: Uint8Array,
          options?: unknown,
        ) => Promise<void>;
      };
    };
  };
  if (
    typeof runtime.IOUtils?.read === "function" &&
    typeof runtime.IOUtils.write === "function"
  ) {
    await runtime.IOUtils.write(
      targetPath,
      await runtime.IOUtils.read(sourcePath),
    );
    return true;
  }
  if (
    typeof runtime.OS?.File?.read === "function" &&
    typeof runtime.OS.File.writeAtomic === "function"
  ) {
    await runtime.OS.File.writeAtomic(
      targetPath,
      await runtime.OS.File.read(sourcePath),
      {
        tmpPath: `${targetPath}.tmp`,
      },
    );
    return true;
  }
  const fs = await tryNodeFs();
  if (fs) {
    await fs.copyFile(sourcePath, targetPath);
    return true;
  }
  // Last resort for Zotero runtimes that only expose UTF-8 helpers. Built-in
  // skills are text-only, so this path is safer than relying on IOUtils.copy.
  try {
    await writeRuntimeTextFile(
      targetPath,
      await readRuntimeTextFile(sourcePath),
    );
    return true;
  } catch {
    // Fall back to native copy APIs so non-text callers still get a chance.
  }
  if (typeof runtime.IOUtils?.copy === "function") {
    await runtime.IOUtils.copy(sourcePath, targetPath);
    return true;
  }
  if (typeof runtime.OS?.File?.copy === "function") {
    await runtime.OS.File.copy(sourcePath, targetPath);
    return true;
  }
  throw new Error("No binary file copy API is available");
}

function toUint8Array(value: Uint8Array | ArrayBuffer) {
  return value instanceof Uint8Array ? value : new Uint8Array(value);
}

export async function readRuntimeBytes(pathRaw: string) {
  const path = normalizeString(pathRaw);
  if (!path || !(await runtimePathExists(path))) {
    throw new Error("binary file path does not exist");
  }
  const runtime = globalThis as {
    IOUtils?: { read?: (path: string) => Promise<Uint8Array> };
    OS?: { File?: { read?: (path: string) => Promise<Uint8Array> } };
  };
  if (typeof runtime.IOUtils?.read === "function") {
    return runtime.IOUtils.read(path);
  }
  if (typeof runtime.OS?.File?.read === "function") {
    return runtime.OS.File.read(path);
  }
  const fs = await tryNodeFs();
  if (fs?.readFile) {
    return new Uint8Array(await fs.readFile(path));
  }
  throw new Error("No binary file read API is available");
}

export async function writeRuntimeBytes(
  pathRaw: string,
  bytes: Uint8Array | ArrayBuffer,
) {
  const path = normalizeString(pathRaw);
  if (!path) {
    throw new Error("binary file path is missing");
  }
  const data = toUint8Array(bytes);
  await ensureRuntimeDirectory(parentPath(path));
  const runtime = globalThis as {
    IOUtils?: { write?: (path: string, data: Uint8Array) => Promise<unknown> };
    OS?: {
      File?: {
        writeAtomic?: (
          path: string,
          data: Uint8Array,
          options?: unknown,
        ) => Promise<void>;
      };
    };
  };
  if (typeof runtime.IOUtils?.write === "function") {
    await runtime.IOUtils.write(path, data);
    return;
  }
  if (typeof runtime.OS?.File?.writeAtomic === "function") {
    await runtime.OS.File.writeAtomic(path, data, {
      tmpPath: `${path}.tmp`,
    });
    return;
  }
  const fs = await tryNodeFs();
  if (fs?.writeFile) {
    await fs.writeFile(path, data);
    return;
  }
  throw new Error("No binary file write API is available");
}

function parentPath(pathRaw: string) {
  const path = normalizeString(pathRaw);
  const normalized = normalizeSlashes(path);
  const index = normalized.lastIndexOf("/");
  if (index <= 0) {
    return ".";
  }
  return path.slice(0, index);
}

export async function readRuntimeTextFile(pathRaw: string) {
  const path = normalizeString(pathRaw);
  if (!path || !(await runtimePathExists(path))) {
    return "";
  }
  const runtime = globalThis as {
    IOUtils?: { readUTF8?: (path: string) => Promise<string> };
    OS?: {
      File?: {
        read?: (path: string, options?: unknown) => Promise<Uint8Array>;
      };
    };
    TextDecoder?: new (encoding?: string) => {
      decode: (input: Uint8Array) => string;
    };
  };
  if (typeof runtime.IOUtils?.readUTF8 === "function") {
    return runtime.IOUtils.readUTF8(path);
  }
  if (typeof runtime.OS?.File?.read === "function") {
    const bytes = await runtime.OS.File.read(path);
    const Decoder = runtime.TextDecoder || TextDecoder;
    return new Decoder("utf-8").decode(bytes);
  }
  const fs = await tryNodeFs();
  if (fs) {
    return fs.readFile(path, "utf8");
  }
  return "";
}

export async function writeRuntimeTextFile(pathRaw: string, content: string) {
  const path = normalizeString(pathRaw);
  if (!path) {
    return;
  }
  await ensureRuntimeDirectory(parentPath(path));
  const runtime = globalThis as {
    IOUtils?: {
      writeUTF8?: (path: string, content: string) => Promise<unknown>;
    };
    OS?: {
      File?: {
        writeAtomic?: (
          path: string,
          data: Uint8Array,
          options?: unknown,
        ) => Promise<void>;
      };
    };
    TextEncoder?: new () => { encode: (input: string) => Uint8Array };
  };
  if (typeof runtime.IOUtils?.writeUTF8 === "function") {
    await runtime.IOUtils.writeUTF8(path, content);
    return;
  }
  if (typeof runtime.OS?.File?.writeAtomic === "function") {
    const Encoder = runtime.TextEncoder || TextEncoder;
    await runtime.OS.File.writeAtomic(path, new Encoder().encode(content), {
      tmpPath: `${path}.tmp`,
    });
    return;
  }
  const fs = await tryNodeFs();
  if (fs) {
    await fs.writeFile(path, content, "utf8");
  }
}

export async function statRuntimePath(pathRaw: string): Promise<{
  exists: boolean;
  isDir: boolean;
  size: number;
  lastModified?: number;
}> {
  const path = normalizeString(pathRaw);
  if (!path) {
    return { exists: false, isDir: false, size: 0 };
  }
  const runtime = globalThis as {
    IOUtils?: {
      stat?: (path: string) => Promise<{
        type?: string;
        size?: number;
        lastModified?: number;
        lastModifiedTime?: number;
      }>;
    };
  };
  if (typeof runtime.IOUtils?.stat === "function") {
    try {
      const stat = await runtime.IOUtils.stat(path);
      return {
        exists: true,
        isDir: String(stat.type || "").toLowerCase() === "directory",
        size: Math.max(0, Number(stat.size || 0) || 0),
        lastModified:
          Math.max(
            0,
            Number(stat.lastModified || stat.lastModifiedTime || 0) || 0,
          ) || undefined,
      };
    } catch {
      return { exists: false, isDir: false, size: 0 };
    }
  }
  const fs = await tryNodeFs();
  if (fs) {
    try {
      const stat = await fs.stat(path);
      return {
        exists: true,
        isDir:
          typeof stat.isDirectory === "function" ? stat.isDirectory() : false,
        size: Math.max(0, Number(stat.size || 0) || 0),
        lastModified: Math.max(0, Number(stat.mtimeMs || 0) || 0) || undefined,
      };
    } catch {
      return { exists: false, isDir: false, size: 0 };
    }
  }
  return { exists: await runtimePathExists(path), isDir: false, size: 0 };
}

export async function listRuntimeChildren(pathRaw: string) {
  const path = normalizeString(pathRaw);
  const runtime = globalThis as {
    IOUtils?: { getChildren?: (path: string) => Promise<string[]> };
  };
  if (typeof runtime.IOUtils?.getChildren === "function") {
    try {
      return await runtime.IOUtils.getChildren(path);
    } catch {
      return [] as string[];
    }
  }
  const fs = await tryNodeFs();
  if (fs) {
    try {
      const names = await fs.readdir(path);
      return names.map((name: string) => joinPath(path, name));
    } catch {
      return [] as string[];
    }
  }
  return [] as string[];
}

export async function listRuntimeChildDirectories(pathRaw: string) {
  const children = await listRuntimeChildren(pathRaw);
  const directories: string[] = [];
  for (const child of children) {
    if ((await statRuntimePath(child)).isDir) {
      directories.push(child);
    }
  }
  return directories.sort((left, right) => left.localeCompare(right));
}

export async function collectRuntimeFiles(rootRaw: string) {
  const root = normalizeString(rootRaw);
  const files: string[] = [];
  function shouldSkip(childPath: string) {
    const normalized = normalizeSlashes(childPath);
    const name = normalized.split("/").filter(Boolean).pop() || "";
    return (
      name === "__pycache__" ||
      name === ".pytest_cache" ||
      name === ".mypy_cache" ||
      name.endsWith(".pyc") ||
      name.endsWith(".pyo")
    );
  }
  async function visit(dir: string) {
    for (const child of await listRuntimeChildren(dir)) {
      if (shouldSkip(child)) {
        continue;
      }
      const stat = await statRuntimePath(child);
      if (!stat.exists) {
        continue;
      }
      if (stat.isDir) {
        await visit(child);
      } else {
        files.push(child);
      }
    }
  }
  if ((await statRuntimePath(root)).isDir) {
    await visit(root);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

export function runtimeRelativePath(rootRaw: string, targetRaw: string) {
  const root = normalizeSlashes(rootRaw).replace(/\/+$/g, "");
  const target = normalizeSlashes(targetRaw);
  const prefix = `${root}/`;
  return target.startsWith(prefix) ? target.slice(prefix.length) : target;
}

export async function getRuntimePathSize(pathRaw: string): Promise<{
  bytes: number;
  itemCount: number;
  exists: boolean;
}> {
  const path = normalizeString(pathRaw);
  const stat = await statRuntimePath(path);
  if (!stat.exists) {
    return { bytes: 0, itemCount: 0, exists: false };
  }
  if (!stat.isDir) {
    return { bytes: stat.size, itemCount: 1, exists: true };
  }
  let bytes = 0;
  let itemCount = 0;
  const stack = [path];
  while (stack.length > 0) {
    const current = stack.pop() || "";
    const children = await listRuntimeChildren(current);
    for (const child of children) {
      const childStat = await statRuntimePath(child);
      if (!childStat.exists) {
        continue;
      }
      itemCount += 1;
      if (childStat.isDir) {
        stack.push(child);
      } else {
        bytes += childStat.size;
      }
    }
  }
  return { bytes, itemCount, exists: true };
}

export async function removeRuntimePath(pathRaw: string) {
  const path = normalizeString(pathRaw);
  if (!path || !(await runtimePathExists(path))) {
    return false;
  }
  const runtime = globalThis as {
    IOUtils?: { remove?: (path: string, options?: unknown) => Promise<void> };
    OS?: {
      File?: { removeDir?: (path: string, options?: unknown) => Promise<void> };
    };
  };
  if (typeof runtime.IOUtils?.remove === "function") {
    await runtime.IOUtils.remove(path, { recursive: true });
    return true;
  }
  if (typeof runtime.OS?.File?.removeDir === "function") {
    await runtime.OS.File.removeDir(path, { ignoreAbsent: true });
    return true;
  }
  const fs = await tryNodeFs();
  if (fs) {
    await fs.rm(path, { force: true, recursive: true });
    return true;
  }
  return false;
}

export async function copyRuntimeDirectory(args: {
  sourceDir: string;
  targetDir: string;
}) {
  const sourceDir = normalizeString(args.sourceDir);
  const targetDir = normalizeString(args.targetDir);
  if (!sourceDir || !targetDir) {
    return;
  }
  await removeRuntimePath(targetDir);
  await ensureRuntimeDirectory(targetDir);
  for (const child of await listRuntimeChildren(sourceDir)) {
    const target = joinPath(targetDir, baseName(child));
    const stat = await statRuntimePath(child);
    if (!stat.exists) {
      continue;
    }
    if (stat.isDir) {
      await copyRuntimeDirectory({ sourceDir: child, targetDir: target });
    } else {
      await copyRuntimeFileIfMissing({ sourcePath: child, targetPath: target });
    }
  }
}

export async function scanRuntimePersistenceUsage(): Promise<RuntimePersistenceUsageSnapshot> {
  const paths = getRuntimePersistencePaths();
  const categoryDefs: Array<{
    category: RuntimePersistenceCategory;
    label: string;
    path?: string;
    cleanable: boolean;
    recordCount?: () => number;
    recordBytes?: () => number;
    fileBacked?: boolean;
  }> = [
    {
      category: "logs",
      label: "Runtime logs",
      path: paths.logsDir,
      cleanable: true,
      fileBacked: true,
    },
    {
      category: "skillrunner-ledger",
      label: "SkillRunner local ledger",
      path: paths.stateDbPath,
      cleanable: true,
      recordCount: () => pluginTaskDomainCounter?.("skillrunner") || 0,
      recordBytes: () => pluginTaskDomainByteEstimator?.("skillrunner") || 0,
    },
    {
      category: "acp-conversations",
      label: "ACP conversations",
      path: paths.acpChatRoot,
      cleanable: true,
      recordCount: () =>
        pluginTaskDomainExceptRowScopesCounter?.("acp", ["skill-runs"]) || 0,
      recordBytes: () =>
        pluginTaskDomainExceptRowScopesByteEstimator?.("acp", ["skill-runs"]) ||
        0,
      fileBacked: true,
    },
    {
      category: "acp-skill-runs",
      label: "ACP skill runs",
      path: paths.acpSkillRunsDir,
      cleanable: true,
      recordCount: () => pluginTaskScopeCounter?.("acp", "skill-runs") || 0,
      recordBytes: () =>
        pluginTaskScopeByteEstimator?.("acp", "skill-runs") || 0,
      fileBacked: true,
    },
    {
      category: "workflow-products",
      label: "Workflow products",
      path: paths.workflowProductsDir,
      cleanable: true,
      recordCount: () =>
        pluginTaskScopeCounter?.("workflow-products", "products") || 0,
      recordBytes: () =>
        pluginTaskScopeByteEstimator?.("workflow-products", "products") || 0,
      fileBacked: true,
    },
    {
      category: "cache",
      label: "Cache",
      path: paths.cacheDir,
      cleanable: true,
      fileBacked: true,
    },
    {
      category: "tmp",
      label: "Temporary files",
      path: paths.tmpDir,
      cleanable: true,
      fileBacked: true,
    },
  ];
  const categories: RuntimePersistenceCategoryUsage[] = [];
  for (const def of categoryDefs) {
    const size =
      def.path && def.fileBacked
        ? await getRuntimePathSize(def.path)
        : { bytes: 0, itemCount: 0, exists: false };
    const recordCount = def.recordCount?.() || 0;
    const recordBytes = def.recordBytes?.() || 0;
    categories.push({
      category: def.category,
      label: def.label,
      path: def.path,
      bytes: size.bytes + recordBytes,
      exists: size.exists || recordCount > 0,
      cleanable: def.cleanable,
      itemCount: size.itemCount,
      recordCount,
    });
  }
  const stateDatabaseSize = await getRuntimePathSize(paths.stateDbPath);
  return {
    root: paths.root,
    scannedAt: new Date().toISOString(),
    totalBytes: categories.reduce((sum, entry) => sum + entry.bytes, 0),
    categories,
    stateDatabase: {
      path: paths.stateDbPath,
      bytes: stateDatabaseSize.bytes,
      exists: stateDatabaseSize.exists,
      itemCount: stateDatabaseSize.itemCount,
    },
  };
}

export async function cleanupRuntimePersistenceCategory(
  category: RuntimePersistenceCategory,
) {
  const paths = getRuntimePersistencePaths();
  const removedPaths: string[] = [];
  const details: Record<string, unknown> = {};
  const removeAndTrack = async (path: string) => {
    if (await removeRuntimePath(path)) {
      removedPaths.push(path);
    }
  };

  if (category === "logs") {
    runtimeLogClearer?.();
    await removeAndTrack(paths.logsDir);
  } else if (category === "skillrunner-ledger") {
    details.rowsDeleted = pluginTaskDomainClearer?.("skillrunner") || 0;
  } else if (category === "acp-conversations") {
    details.rowsDeleted =
      pluginTaskDomainExceptRowScopesClearer?.("acp", ["skill-runs"]) || 0;
    await removeAndTrack(paths.acpChatRoot);
  } else if (category === "acp-skill-runs") {
    details.rowsDeleted = pluginTaskScopeClearer?.("acp", "skill-runs") || 0;
    acpSkillRunsMemoryClearer?.();
    await removeAndTrack(paths.acpSkillRunsDir);
  } else if (category === "workflow-products") {
    details.rowsDeleted =
      pluginTaskScopeClearer?.("workflow-products", "products") || 0;
    await removeAndTrack(paths.workflowProductsDir);
  } else if (category === "cache") {
    await removeAndTrack(paths.cacheDir);
  } else if (category === "tmp") {
    await removeAndTrack(paths.tmpDir);
  }

  return {
    ok: true,
    category,
    removedPaths,
    details,
    usage: await scanRuntimePersistenceUsage(),
  };
}

export async function cleanupRuntimePersistenceRetention(args?: {
  nowMs?: number;
}) {
  const paths = getRuntimePersistencePaths();
  const nowMs = Math.max(0, Number(args?.nowMs || 0) || 0) || Date.now();
  const retention = getTaskHistoryRetentionConfig();
  const details: Record<string, unknown> = {
    retentionDays: retention.retentionDays,
    retentionMs: retention.retentionMs,
  };
  const removedPaths: string[] = [];
  const cleanerResult = acpSkillRunsRetentionCleaner?.({
    retentionMs: retention.retentionMs,
    nowMs,
  });
  details.acpSkillRunRowsDeleted = cleanerResult?.rowsDeleted || 0;
  details.acpSkillRunRequestIds = cleanerResult?.requestIds || [];
  for (const workspaceDir of cleanerResult?.workspaceDirs || []) {
    if (!isPathWithinRoot(paths.acpSkillRunsDir, workspaceDir)) {
      continue;
    }
    if (await removeRuntimePath(workspaceDir)) {
      removedPaths.push(workspaceDir);
    }
  }
  return {
    ok: true,
    removedPaths,
    details,
    usage: await scanRuntimePersistenceUsage(),
  };
}
