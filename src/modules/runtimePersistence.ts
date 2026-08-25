import { joinPath, normalizeNativeLocalPath } from "../utils/path";
import { isNonNativeAbsolutePath } from "../platform/path";
import { getTaskHistoryRetentionConfig } from "./taskRetentionPolicy";
import {
  RuntimeFileIoError,
  readRuntimeFileRangesWithWorker,
} from "./runtimeFileRangeReader";
import {
  RUNTIME_TREE_POLICIES,
  rebaseRuntimeTreeManifest,
  scanRuntimeTreeWithIo,
  type RuntimeTreeManifest,
  type RuntimeTreeScanPolicy,
} from "./runtimeTreeManifest";

export {
  RUNTIME_TREE_POLICIES,
  type RuntimeTreeEntry,
  type RuntimeTreeManifest,
  type RuntimeTreeScanPolicy,
} from "./runtimeTreeManifest";

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
  /** Workflow/plugin runtime database for task rows, ACP/SkillRunner ledgers, and product metadata. */
  stateDbPath: string;
  /** Synthesis repository database for synt_* sidecar/runtime state. */
  synthesisDbPath: string;
  logsDir: string;
  runtimeLogPath: string;
  acpChatRoot: string;
  acpChatWorkspaceDir: string;
  acpChatConversationsDir: string;
  /** Legacy ACP Chat private storage path. New writes use acpChatConversationsDir. */
  legacyAcpChatWorkspacesDir: string;
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
  kind?: "runtime" | "synthesis";
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
  stateDatabases?: RuntimePersistenceStateDatabaseUsage[];
};

export type RuntimePersistenceScanProgress = {
  stage: string;
  label: string;
  current: number;
  total: number;
  percent: number;
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
const SYNTHESIS_SQLITE_FILE_NAME = "synthesis.db";
const LEGACY_SQLITE_FILE_NAME = "zotero-skills.db";
const RUNTIME_LOG_FILE_NAME = "runtime-logs.json";
const PLUGIN_PREFS_PREFIX = "extensions.zotero.zotero-skills";
const DAY_MS = 24 * 60 * 60 * 1000;
export const RUNTIME_APPEND_CHUNK_CODE_UNITS = 256 * 1024;
export const RUNTIME_TEXT_SCAN_CHUNK_BYTES = 256 * 1024;

const runtimeAppendQueues = new Map<string, Promise<void>>();
let runtimeAtomicWriteSequence = 0;

export type RuntimeExpiredAssetOwner = "tmp" | "cache" | "logs";

export type RuntimeExpiredAsset = {
  owner: RuntimeExpiredAssetOwner;
  root: string;
  path: string;
  relativePath: string;
  ttlMs: number;
  lastModified?: number;
};

const RUNTIME_EXPIRED_ASSET_TTL_MS: Record<RuntimeExpiredAssetOwner, number> = {
  tmp: DAY_MS,
  cache: 30 * DAY_MS,
  logs: 30 * DAY_MS,
};

let runtimeLogClearer: (() => void | Promise<void>) | null = null;
let pluginTaskDomainClearer: ((domain: string) => number) | null = null;
let pluginTaskDomainExceptRowScopesClearer:
  | ((domain: string, preservedRowScopes: string[]) => number)
  | null = null;
let acpConversationRecordsClearer: (() => number) | null = null;
let pluginTaskScopeClearer: ((domain: string, scope: string) => number) | null =
  null;
let pluginTaskDomainCounter: ((domain: string) => number) | null = null;
let pluginTaskDomainExceptRowScopesCounter:
  | ((domain: string, preservedRowScopes: string[]) => number)
  | null = null;
let acpConversationRecordsCounter: (() => number) | null = null;
let pluginTaskScopeCounter: ((domain: string, scope: string) => number) | null =
  null;
let pluginTaskDomainByteEstimator: ((domain: string) => number) | null = null;
let pluginTaskDomainExceptRowScopesByteEstimator:
  | ((domain: string, preservedRowScopes: string[]) => number)
  | null = null;
let acpConversationRecordsByteEstimator: (() => number) | null = null;
let pluginTaskScopeByteEstimator:
  | ((domain: string, scope: string) => number)
  | null = null;
let pluginRunStoreCounter: ((kind: "acp" | "skillrunner") => number) | null =
  null;
let pluginRunStoreByteEstimator:
  | ((kind: "acp" | "skillrunner") => number)
  | null = null;
let pluginRunStoreClearer: ((kind: "acp" | "skillrunner") => number) | null =
  null;
let acpSkillRunsMemoryClearer: (() => void) | null = null;
let acpSkillRunsRetentionCleaner:
  | ((args: { retentionMs: number; nowMs: number }) => {
      rowsDeleted: number;
      requestIds: string[];
      workspaceDirs: string[];
      runtimeDirs?: string[];
    })
  | null = null;

export function registerRuntimeLogClearer(
  clearer: (() => void | Promise<void>) | null,
) {
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

export function registerAcpConversationRecordsClearer(
  clearer: (() => number) | null,
) {
  acpConversationRecordsClearer = clearer;
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

export function registerAcpConversationRecordsCounter(
  counter: (() => number) | null,
) {
  acpConversationRecordsCounter = counter;
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

export function registerAcpConversationRecordsByteEstimator(
  estimator: (() => number) | null,
) {
  acpConversationRecordsByteEstimator = estimator;
}

export function registerPluginTaskScopeByteEstimator(
  estimator: ((domain: string, scope: string) => number) | null,
) {
  pluginTaskScopeByteEstimator = estimator;
}

export function registerPluginRunStoreCounter(
  counter: ((kind: "acp" | "skillrunner") => number) | null,
) {
  pluginRunStoreCounter = counter;
}

export function registerPluginRunStoreByteEstimator(
  estimator: ((kind: "acp" | "skillrunner") => number) | null,
) {
  pluginRunStoreByteEstimator = estimator;
}

export function registerPluginRunStoreClearer(
  clearer: ((kind: "acp" | "skillrunner") => number) | null,
) {
  pluginRunStoreClearer = clearer;
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
        runtimeDirs?: string[];
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

function assertNativeRuntimeFsPath(path: string, operation: string) {
  if (!isNonNativeAbsolutePath(path)) {
    return;
  }
  throw new Error(
    `Refusing to ${operation} non-native absolute path on this platform: ${path}`,
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

  const tempRoot =
    readEnv("TMPDIR") || readEnv("TEMP") || readEnv("TMP") || readEnv("Temp");
  if (tempRoot) {
    return joinPath(tempRoot, INTERNAL_APP_DIR_NAME);
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
    synthesisDbPath: joinPath(stateDir, SYNTHESIS_SQLITE_FILE_NAME),
    logsDir,
    runtimeLogPath: joinPath(logsDir, RUNTIME_LOG_FILE_NAME),
    acpChatRoot,
    acpChatWorkspaceDir: joinPath(acpChatRoot, "workspace"),
    acpChatConversationsDir: joinPath(acpChatRoot, "conversations"),
    legacyAcpChatWorkspacesDir: joinPath(acpChatRoot, "workspaces"),
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

function normalizeRuntimeFsPath(pathRaw: string) {
  return normalizeNativeLocalPath(normalizeString(pathRaw));
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
  if (isNonNativeAbsolutePath(path)) {
    return false;
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

async function ensureRuntimeDirectoryInternal(
  pathRaw: string,
  surfaceErrors: boolean,
) {
  const path = normalizeRuntimeFsPath(pathRaw);
  if (!path) {
    if (surfaceErrors) {
      throw new Error("runtime directory path is missing");
    }
    return;
  }
  assertNativeRuntimeFsPath(path, "create runtime directory");
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
  if (surfaceErrors) {
    throw new Error("No runtime directory creation API is available");
  }
}

export function ensureRuntimeDirectory(pathRaw: string) {
  return ensureRuntimeDirectoryInternal(pathRaw, false);
}

export function ensureRuntimeDirectoryStrict(pathRaw: string) {
  return ensureRuntimeDirectoryInternal(pathRaw, true);
}

export async function copyRuntimeFileIfMissing(args: {
  sourcePath: string;
  targetPath: string;
}) {
  const sourcePath = normalizeString(args.sourcePath);
  const targetPath = normalizeString(args.targetPath);
  assertNativeRuntimeFsPath(sourcePath, "copy from runtime file");
  assertNativeRuntimeFsPath(targetPath, "copy to runtime file");
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
  assertNativeRuntimeFsPath(sourcePath, "copy from runtime file");
  assertNativeRuntimeFsPath(targetPath, "copy to runtime file");
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
  if (typeof runtime.IOUtils?.copy === "function") {
    await runtime.IOUtils.copy(sourcePath, targetPath);
    return true;
  }
  if (typeof runtime.OS?.File?.copy === "function") {
    await runtime.OS.File.copy(sourcePath, targetPath);
    return true;
  }
  const fs = await tryNodeFs();
  if (fs) {
    await fs.copyFile(sourcePath, targetPath);
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
  assertNativeRuntimeFsPath(path, "read binary runtime file");
  const fs = await tryNodeFs();
  if (fs?.readFile) {
    return new Uint8Array(await fs.readFile(path));
  }
  throw new Error("No binary file read API is available");
}

export type RuntimeWriteBytesOptions = {
  overwrite?: boolean;
};

export async function writeRuntimeBytes(
  pathRaw: string,
  bytes: Uint8Array | ArrayBuffer,
  options: RuntimeWriteBytesOptions = {},
) {
  const path = normalizeString(pathRaw);
  if (!path) {
    throw new Error("binary file path is missing");
  }
  assertNativeRuntimeFsPath(path, "write binary runtime file");
  const data = toUint8Array(bytes);
  await ensureRuntimeDirectory(parentPath(path));
  const runtime = globalThis as {
    IOUtils?: {
      write?: (
        path: string,
        data: Uint8Array,
        options?: unknown,
      ) => Promise<unknown>;
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
  };
  if (typeof runtime.IOUtils?.write === "function") {
    try {
      await runtime.IOUtils.write(
        path,
        data,
        options.overwrite ? { mode: "overwrite" } : undefined,
      );
      return;
    } catch (error) {
      if (!options.overwrite) {
        throw error;
      }
      await removeRuntimePath(path);
      await runtime.IOUtils.write(path, data, { mode: "create" });
    }
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
    if (options.overwrite) {
      await fs.writeFile(path, data);
    } else {
      await fs.writeFile(path, data, { flag: "wx" });
    }
    return;
  }
  throw new Error("No binary file write API is available");
}

export async function moveRuntimePath(args: {
  sourcePath: string;
  targetPath: string;
  overwrite?: boolean;
}) {
  const sourcePath = normalizeString(args.sourcePath);
  const targetPath = normalizeString(args.targetPath);
  if (!sourcePath || !targetPath) {
    throw new Error("runtime move source and target paths are required");
  }
  assertNativeRuntimeFsPath(sourcePath, "move runtime source path");
  assertNativeRuntimeFsPath(targetPath, "move runtime target path");
  await ensureRuntimeDirectory(parentPath(targetPath));
  const runtime = globalThis as {
    IOUtils?: {
      move?: (
        sourcePath: string,
        targetPath: string,
        options?: { noOverwrite?: boolean },
      ) => Promise<void>;
    };
    OS?: {
      File?: {
        move?: (
          sourcePath: string,
          targetPath: string,
          options?: { noOverwrite?: boolean },
        ) => Promise<void>;
      };
    };
  };
  const options = { noOverwrite: args.overwrite !== true };
  if (typeof runtime.IOUtils?.move === "function") {
    await runtime.IOUtils.move(sourcePath, targetPath, options);
    return;
  }
  if (typeof runtime.OS?.File?.move === "function") {
    await runtime.OS.File.move(sourcePath, targetPath, options);
    return;
  }
  const fs = await tryNodeFs();
  if (typeof fs?.rename === "function") {
    if (!args.overwrite && (await runtimePathExists(targetPath))) {
      throw new Error("runtime move target already exists");
    }
    await fs.rename(sourcePath, targetPath);
    return;
  }
  throw new Error("No runtime file move API is available");
}

export async function setRuntimeExecutablePermissions(
  pathRaw: string,
  mode = 0o755,
) {
  const path = normalizeString(pathRaw);
  if (!path || getPlatform() === "win32") {
    return false;
  }
  assertNativeRuntimeFsPath(path, "chmod runtime file");
  const runtime = globalThis as {
    Zotero?: {
      File?: {
        pathToFile?: (path: string) => { permissions?: number };
      };
    };
    Components?: {
      classes?: Record<
        string,
        {
          createInstance?: (iface?: unknown) => {
            initWithPath?: (path: string) => void;
            permissions?: number;
          };
        }
      >;
      interfaces?: { nsIFile?: unknown };
    };
  };
  const zoteroFile = runtime.Zotero?.File?.pathToFile?.(path);
  if (zoteroFile && "permissions" in zoteroFile) {
    zoteroFile.permissions = mode;
    return true;
  }
  const fileFactory =
    runtime.Components?.classes?.["@mozilla.org/file/local;1"];
  const file = fileFactory?.createInstance?.(
    runtime.Components?.interfaces?.nsIFile,
  );
  if (file && typeof file.initWithPath === "function") {
    file.initWithPath(path);
    file.permissions = mode;
    return true;
  }
  const fs = await tryNodeFs();
  if (fs?.chmod) {
    await fs.chmod(path, mode);
    return true;
  }
  return false;
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

async function readRuntimeTextFileInternal(
  pathRaw: string,
  surfaceErrors: boolean,
) {
  const path = normalizeString(pathRaw);
  if (!path) {
    if (surfaceErrors) {
      throw new Error("text file path does not exist");
    }
    return "";
  }
  if (!surfaceErrors && !(await runtimePathExists(path))) {
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
  assertNativeRuntimeFsPath(path, "read text runtime file");
  const fs = await tryNodeFs();
  if (fs) {
    return fs.readFile(path, "utf8");
  }
  if (surfaceErrors) {
    throw new Error("No text file read API is available");
  }
  return "";
}

export function readRuntimeTextFile(pathRaw: string) {
  return readRuntimeTextFileInternal(pathRaw, false);
}

export function readRuntimeTextFileStrict(pathRaw: string) {
  return readRuntimeTextFileInternal(pathRaw, true);
}

export async function readRuntimeTextRange(
  pathRaw: string,
  offsetRaw: number,
  lengthRaw: number,
) {
  const [value] = await readRuntimeTextRanges(pathRaw, [
    { offset: offsetRaw, length: lengthRaw },
  ]);
  return value || "";
}

export async function readRuntimeTextRanges(
  pathRaw: string,
  rangesRaw: Array<{ offset: number; length: number }>,
) {
  const path = normalizeString(pathRaw);
  const ranges = rangesRaw.map((range) => ({
    offset: Math.max(0, Math.floor(Number(range?.offset || 0) || 0)),
    length: Math.max(0, Math.floor(Number(range?.length || 0) || 0)),
  }));
  if (!path || ranges.length <= 0 || !(await runtimePathExists(path))) {
    return ranges.map(() => "");
  }
  assertNativeRuntimeFsPath(path, "read text runtime file range");
  const decoder = new TextDecoder("utf-8");
  const fs = await tryNodeFs();
  if (fs?.open) {
    const handle = await fs.open(path, "r");
    try {
      const output: string[] = [];
      for (const range of ranges) {
        if (range.length <= 0) {
          output.push("");
          continue;
        }
        const buffer = new Uint8Array(range.length);
        const result = await handle.read(buffer, 0, range.length, range.offset);
        output.push(decoder.decode(buffer.subarray(0, result.bytesRead)));
      }
      return output;
    } finally {
      await handle.close().catch(() => undefined);
    }
  }
  const bytes = await readRuntimeFileRangesWithWorker(path, ranges);
  return bytes.map((entry) => decoder.decode(entry));
}

export type RuntimeUtf8Line = {
  text: string;
  offset: number;
  length: number;
};

export type RuntimeUtf8LineScanResult = {
  startOffset: number;
  endOffset: number;
  bytesRead: number;
  readCalls: number;
  maxReadBytes: number;
};

function combineByteFragments(fragments: Uint8Array[], length: number) {
  if (fragments.length === 1) {
    return fragments[0];
  }
  const output = new Uint8Array(length);
  let cursor = 0;
  for (const fragment of fragments) {
    output.set(fragment, cursor);
    cursor += fragment.length;
  }
  return output;
}

export async function scanRuntimeUtf8Lines(args: {
  path: string;
  offset?: number;
  length?: number;
  onLine: (line: RuntimeUtf8Line) => void | Promise<void>;
}): Promise<RuntimeUtf8LineScanResult> {
  const path = normalizeString(args.path);
  const startOffset = Math.max(0, Math.floor(Number(args.offset || 0) || 0));
  const stat = path ? await statRuntimePath(path) : null;
  if (!path || !stat?.exists || stat.isDir || startOffset >= stat.size) {
    return {
      startOffset,
      endOffset: Math.min(startOffset, stat?.size || startOffset),
      bytesRead: 0,
      readCalls: 0,
      maxReadBytes: 0,
    };
  }
  assertNativeRuntimeFsPath(path, "scan runtime UTF-8 lines");
  const requestedLength =
    typeof args.length === "number" && Number.isFinite(args.length)
      ? Math.max(0, Math.floor(args.length))
      : stat.size - startOffset;
  const endOffset = Math.min(stat.size, startOffset + requestedLength);
  const decoder = new TextDecoder("utf-8");
  const fragments: Uint8Array[] = [];
  let fragmentBytes = 0;
  let lineOffset = startOffset;
  let cursor = startOffset;
  let readCalls = 0;
  let maxReadBytes = 0;
  const fs = await tryNodeFs();
  const handle = fs?.open ? await fs.open(path, "r") : null;
  const runtime = globalThis as {
    IOUtils?: {
      read?: (
        path: string,
        options: { offset: number; maxBytes: number },
      ) => Promise<Uint8Array>;
    };
  };
  if (!handle && typeof runtime.IOUtils?.read !== "function") {
    throw new RuntimeFileIoError({
      code: "runtime_async_file_io_unavailable",
      operation: "range-read",
      message: "No asynchronous byte scanner is available",
    });
  }
  try {
    while (cursor < endOffset) {
      const requestedBytes = Math.min(
        RUNTIME_TEXT_SCAN_CHUNK_BYTES,
        endOffset - cursor,
      );
      let chunk: Uint8Array;
      if (handle) {
        const buffer = new Uint8Array(requestedBytes);
        const result = await handle.read(buffer, 0, requestedBytes, cursor);
        chunk = buffer.subarray(0, result.bytesRead);
      } else {
        chunk = await runtime.IOUtils!.read!(path, {
          offset: cursor,
          maxBytes: requestedBytes,
        });
      }
      readCalls += 1;
      maxReadBytes = Math.max(maxReadBytes, chunk.length);
      if (chunk.length <= 0) {
        break;
      }
      let segmentStart = 0;
      for (let index = 0; index < chunk.length; index += 1) {
        if (chunk[index] !== 0x0a) {
          continue;
        }
        const segment = chunk.subarray(segmentStart, index + 1);
        fragments.push(segment);
        fragmentBytes += segment.length;
        const lineBytes = combineByteFragments(fragments, fragmentBytes);
        await args.onLine({
          text: decoder.decode(lineBytes),
          offset: lineOffset,
          length: fragmentBytes,
        });
        lineOffset += fragmentBytes;
        fragments.length = 0;
        fragmentBytes = 0;
        segmentStart = index + 1;
      }
      if (segmentStart < chunk.length) {
        const remainder = chunk.subarray(segmentStart);
        fragments.push(remainder);
        fragmentBytes += remainder.length;
      }
      cursor += chunk.length;
      if (chunk.length < requestedBytes) {
        break;
      }
    }
    if (fragmentBytes > 0) {
      const lineBytes = combineByteFragments(fragments, fragmentBytes);
      await args.onLine({
        text: decoder.decode(lineBytes),
        offset: lineOffset,
        length: fragmentBytes,
      });
    }
  } finally {
    await handle?.close().catch(() => undefined);
  }
  return {
    startOffset,
    endOffset: cursor,
    bytesRead: Math.max(0, cursor - startOffset),
    readCalls,
    maxReadBytes,
  };
}

async function writeRuntimeTextFileInternal(
  pathRaw: string,
  content: string,
  surfaceErrors: boolean,
) {
  const path = normalizeString(pathRaw);
  if (!path) {
    if (surfaceErrors) {
      throw new Error("text file path is missing");
    }
    return;
  }
  assertNativeRuntimeFsPath(path, "write text runtime file");
  await ensureRuntimeDirectoryInternal(parentPath(path), surfaceErrors);
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
    return;
  }
  if (surfaceErrors) {
    throw new Error("No text file write API is available");
  }
}

export function writeRuntimeTextFile(pathRaw: string, content: string) {
  return writeRuntimeTextFileInternal(pathRaw, content, false);
}

export function writeRuntimeTextFileStrict(pathRaw: string, content: string) {
  return writeRuntimeTextFileInternal(pathRaw, content, true);
}

export async function appendRuntimeTextFile(pathRaw: string, content: string) {
  const path = normalizeString(pathRaw);
  if (!path || !content) {
    return;
  }
  assertNativeRuntimeFsPath(path, "append text runtime file");
  const previous = runtimeAppendQueues.get(path) || Promise.resolve();
  const append = previous
    .catch(() => undefined)
    .then(async () => {
      await ensureRuntimeDirectory(parentPath(path));
      const fs = await tryNodeFs();
      if (fs?.appendFile) {
        await fs.appendFile(path, content, "utf8");
        return;
      }
      const runtime = globalThis as {
        IOUtils?: {
          writeUTF8?: (
            path: string,
            content: string,
            options: { mode: "appendOrCreate" },
          ) => Promise<unknown>;
        };
      };
      if (typeof runtime.IOUtils?.writeUTF8 !== "function") {
        throw new RuntimeFileIoError({
          code: "runtime_async_file_io_unavailable",
          operation: "append",
          message: "No asynchronous runtime text append API is available",
        });
      }
      let offset = 0;
      while (offset < content.length) {
        let end = Math.min(
          content.length,
          offset + RUNTIME_APPEND_CHUNK_CODE_UNITS,
        );
        if (
          end < content.length &&
          end > offset &&
          content.charCodeAt(end - 1) >= 0xd800 &&
          content.charCodeAt(end - 1) <= 0xdbff &&
          content.charCodeAt(end) >= 0xdc00 &&
          content.charCodeAt(end) <= 0xdfff
        ) {
          end -= 1;
        }
        await runtime.IOUtils.writeUTF8(path, content.slice(offset, end), {
          mode: "appendOrCreate",
        });
        offset = end;
      }
    });
  runtimeAppendQueues.set(path, append);
  try {
    await append;
  } finally {
    if (runtimeAppendQueues.get(path) === append) {
      runtimeAppendQueues.delete(path);
    }
  }
}

export async function replaceRuntimeTextFileAtomically(args: {
  targetPath: string;
  fragments: Iterable<string>;
}) {
  const targetPath = normalizeString(args.targetPath);
  if (!targetPath) {
    throw new Error("atomic text replacement target path is missing");
  }
  assertNativeRuntimeFsPath(targetPath, "replace runtime text file");
  const directory = parentPath(targetPath);
  const tempPath = joinPath(
    directory,
    `.${baseName(targetPath)}.${Date.now()}-${++runtimeAtomicWriteSequence}.tmp`,
  );
  await ensureRuntimeDirectory(directory);
  await removeRuntimePath(tempPath).catch(() => undefined);
  let replaced = false;
  try {
    let buffered = "";
    const flushBounded = async (flushAll: boolean) => {
      while (
        buffered.length > RUNTIME_APPEND_CHUNK_CODE_UNITS ||
        (flushAll && buffered.length > 0)
      ) {
        let end = flushAll
          ? Math.min(buffered.length, RUNTIME_APPEND_CHUNK_CODE_UNITS)
          : RUNTIME_APPEND_CHUNK_CODE_UNITS;
        if (
          end < buffered.length &&
          end > 0 &&
          buffered.charCodeAt(end - 1) >= 0xd800 &&
          buffered.charCodeAt(end - 1) <= 0xdbff &&
          buffered.charCodeAt(end) >= 0xdc00 &&
          buffered.charCodeAt(end) <= 0xdfff
        ) {
          end -= 1;
        }
        await appendRuntimeTextFile(tempPath, buffered.slice(0, end));
        buffered = buffered.slice(end);
      }
    };
    for (const fragment of args.fragments) {
      if (!fragment) {
        continue;
      }
      buffered += fragment;
      await flushBounded(false);
    }
    await flushBounded(true);
    await moveRuntimePath({
      sourcePath: tempPath,
      targetPath,
      overwrite: true,
    });
    replaced = true;
  } finally {
    if (!replaced) {
      await removeRuntimePath(tempPath).catch(() => undefined);
    }
  }
}

type RuntimePathStat = {
  exists: boolean;
  isDir: boolean;
  size: number;
  lastModified?: number;
};

async function statRuntimePathInternal(
  pathRaw: string,
  surfaceErrors: boolean,
): Promise<RuntimePathStat> {
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
    } catch (error) {
      if (surfaceErrors) throw error;
      return { exists: false, isDir: false, size: 0 };
    }
  }
  if (isNonNativeAbsolutePath(path)) {
    if (surfaceErrors) {
      throw new Error("Runtime path cannot be inspected on this platform");
    }
    return { exists: false, isDir: false, size: 0 };
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
    } catch (error) {
      if (surfaceErrors) throw error;
      return { exists: false, isDir: false, size: 0 };
    }
  }
  if (surfaceErrors) {
    throw new Error("No runtime path stat API is available");
  }
  return { exists: await runtimePathExists(path), isDir: false, size: 0 };
}

export function statRuntimePath(pathRaw: string): Promise<RuntimePathStat> {
  return statRuntimePathInternal(pathRaw, false);
}

async function listRuntimeChildrenInternal(
  pathRaw: string,
  surfaceErrors: boolean,
) {
  const path = normalizeString(pathRaw);
  const runtime = globalThis as {
    IOUtils?: { getChildren?: (path: string) => Promise<string[]> };
  };
  if (typeof runtime.IOUtils?.getChildren === "function") {
    try {
      return await runtime.IOUtils.getChildren(path);
    } catch (error) {
      if (surfaceErrors) throw error;
      return [] as string[];
    }
  }
  const fs = await tryNodeFs();
  if (fs) {
    try {
      const names = await fs.readdir(path);
      return names.map((name: string) => joinPath(path, name));
    } catch (error) {
      if (surfaceErrors) throw error;
      return [] as string[];
    }
  }
  if (surfaceErrors) {
    throw new Error("No runtime directory listing API is available");
  }
  return [] as string[];
}

export function listRuntimeChildren(pathRaw: string) {
  return listRuntimeChildrenInternal(pathRaw, false);
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

export async function scanRuntimeTree(
  rootRaw: string,
  policy: RuntimeTreeScanPolicy = RUNTIME_TREE_POLICIES.general,
) {
  const startedAt = Date.now();
  const manifest = await scanRuntimeTreeWithIo({
    root: normalizeString(rootRaw),
    policy,
    io: {
      stat: (path) => statRuntimePathInternal(path, true),
      list: (path) => listRuntimeChildrenInternal(path, true),
    },
  });
  if (manifest.warnings.length) {
    const { appendRuntimeLog } = await import("./runtimeLogManager");
    appendRuntimeLog({
      level: "warn",
      scope: "system",
      stage: "observation-budget-exceeded",
      message: "runtime tree exceeded its observation budget",
      details: {
        policy: policy.name,
        entries: manifest.entries.length,
        files: manifest.fileCount,
        directories: manifest.directoryCount,
        bytes: manifest.totalBytes,
        maxDepth: manifest.maxDepth,
        durationMs: Math.max(0, Date.now() - startedAt),
        dimensions: manifest.warnings.map((warning) => warning.code),
      },
    });
  }
  return manifest;
}

export async function collectRuntimeFiles(rootRaw: string) {
  const manifest = await scanRuntimeTree(
    rootRaw,
    RUNTIME_TREE_POLICIES.general,
  );
  return manifest.entries
    .filter((entry) => entry.kind === "file")
    .map((entry) => entry.absolutePath);
}

export function runtimeRelativePath(rootRaw: string, targetRaw: string) {
  const root = normalizeSlashes(rootRaw).replace(/\/+$/g, "");
  const target = normalizeSlashes(targetRaw);
  const prefix = `${root}/`;
  return target.startsWith(prefix) ? target.slice(prefix.length) : target;
}

function runtimeExpiredAssetRoots(paths: RuntimePersistencePaths) {
  return {
    tmp: paths.tmpDir,
    cache: paths.cacheDir,
    logs: paths.logsDir,
  } satisfies Record<RuntimeExpiredAssetOwner, string>;
}

function statIsOlderThan(
  stat: { lastModified?: number },
  nowMs: number,
  ttlMs: number,
) {
  const lastModified = Number(stat.lastModified || 0);
  return Number.isFinite(lastModified) && lastModified > 0
    ? nowMs - lastModified >= ttlMs
    : false;
}

export function getRuntimeExpiredAssetTtlMs(owner: RuntimeExpiredAssetOwner) {
  return RUNTIME_EXPIRED_ASSET_TTL_MS[owner];
}

export async function collectExpiredRuntimeAssets(args?: {
  root?: string;
  nowMs?: number;
  owners?: RuntimeExpiredAssetOwner[];
}) {
  const paths = getRuntimePersistencePaths(args?.root);
  const nowMs = Math.max(0, Number(args?.nowMs || 0) || 0) || Date.now();
  const roots = runtimeExpiredAssetRoots(paths);
  const owners = args?.owners?.length
    ? args.owners
    : (Object.keys(roots) as RuntimeExpiredAssetOwner[]);
  const assets: RuntimeExpiredAsset[] = [];
  for (const owner of owners) {
    const root = roots[owner];
    const ttlMs = getRuntimeExpiredAssetTtlMs(owner);
    for (const file of await collectRuntimeFiles(root)) {
      const stat = await statRuntimePath(file);
      if (!stat.exists || !statIsOlderThan(stat, nowMs, ttlMs)) {
        continue;
      }
      assets.push({
        owner,
        root,
        path: file,
        relativePath: runtimeRelativePath(paths.root, file),
        ttlMs,
        lastModified: stat.lastModified,
      });
    }
  }
  return assets.sort((left, right) => left.path.localeCompare(right.path));
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

let runtimeTreeCopyTail: Promise<void> = Promise.resolve();
let runtimeTreeCopySequence = 0;

async function withRuntimeTreeCopySlot<T>(operation: () => Promise<T>) {
  const previous = runtimeTreeCopyTail;
  let release!: () => void;
  runtimeTreeCopyTail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous.catch(() => undefined);
  try {
    return await operation();
  } finally {
    release();
  }
}

export async function copyRuntimeTree(args: {
  manifest: RuntimeTreeManifest;
  targetDir: string;
}) {
  const targetDir = normalizeRuntimeFsPath(args.targetDir);
  if (!targetDir) return args.manifest;
  if (args.manifest.issues.length) {
    throw new Error("Cannot copy an incomplete runtime tree manifest");
  }
  return withRuntimeTreeCopySlot(async () => {
    runtimeTreeCopySequence += 1;
    const operationSuffix = `${Date.now()}-${runtimeTreeCopySequence}`;
    const stagingDir = `${targetDir}.tmp-tree-${operationSuffix}`;
    const backupDir = `${targetDir}.previous-tree-${operationSuffix}`;
    await removeRuntimePath(stagingDir).catch(() => undefined);
    await removeRuntimePath(backupDir).catch(() => undefined);
    await ensureRuntimeDirectory(stagingDir);
    let targetBackedUp = false;
    let promoted = false;
    try {
      for (const entry of args.manifest.entries) {
        const targetPath = joinPath(stagingDir, entry.relativePath);
        if (entry.kind === "directory") {
          await ensureRuntimeDirectory(targetPath);
        } else {
          await copyRuntimeFile({
            sourcePath: entry.absolutePath,
            targetPath,
          });
        }
      }
      if (await runtimePathExists(targetDir)) {
        await moveRuntimePath({
          sourcePath: targetDir,
          targetPath: backupDir,
        });
        targetBackedUp = true;
      }
      await moveRuntimePath({
        sourcePath: stagingDir,
        targetPath: targetDir,
      });
      promoted = true;
      if (targetBackedUp) {
        await removeRuntimePath(backupDir).catch(() => undefined);
      }
      return rebaseRuntimeTreeManifest(args.manifest, targetDir);
    } catch (error) {
      await removeRuntimePath(stagingDir).catch(() => undefined);
      if (targetBackedUp && !promoted) {
        await removeRuntimePath(targetDir).catch(() => undefined);
        await moveRuntimePath({
          sourcePath: backupDir,
          targetPath: targetDir,
        });
      }
      throw error;
    }
  });
}

export async function copyRuntimeDirectory(args: {
  sourceDir: string;
  targetDir: string;
}) {
  const sourceDir = normalizeRuntimeFsPath(args.sourceDir);
  const targetDir = normalizeRuntimeFsPath(args.targetDir);
  if (!sourceDir || !targetDir) {
    return;
  }
  const manifest = await scanRuntimeTree(
    sourceDir,
    RUNTIME_TREE_POLICIES.general,
  );
  return copyRuntimeTree({ manifest, targetDir });
}

export async function scanRuntimePersistenceUsage(
  args: {
    onProgress?: (progress: RuntimePersistenceScanProgress) => void;
  } = {},
): Promise<RuntimePersistenceUsageSnapshot> {
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
      recordCount: () =>
        (pluginRunStoreCounter?.("skillrunner") || 0) +
        (pluginTaskDomainCounter?.("skillrunner") || 0),
      recordBytes: () =>
        (pluginRunStoreByteEstimator?.("skillrunner") || 0) +
        (pluginTaskDomainByteEstimator?.("skillrunner") || 0),
    },
    {
      category: "acp-conversations",
      label: "ACP conversations",
      path: paths.acpChatRoot,
      cleanable: true,
      recordCount: () =>
        acpConversationRecordsCounter?.() ??
        pluginTaskDomainExceptRowScopesCounter?.("acp", ["skill-runs"]) ??
        0,
      recordBytes: () =>
        acpConversationRecordsByteEstimator?.() ??
        pluginTaskDomainExceptRowScopesByteEstimator?.("acp", ["skill-runs"]) ??
        0,
      fileBacked: true,
    },
    {
      category: "acp-skill-runs",
      label: "ACP skill runs",
      path: paths.acpSkillRunsDir,
      cleanable: true,
      recordCount: () =>
        (pluginRunStoreCounter?.("acp") || 0) +
        (pluginTaskScopeCounter?.("acp", "skill-runs") || 0),
      recordBytes: () =>
        (pluginRunStoreByteEstimator?.("acp") || 0) +
        (pluginTaskScopeByteEstimator?.("acp", "skill-runs") || 0),
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
  const totalSteps = categoryDefs.length + 2;
  let completedSteps = 0;
  const reportProgress = (stage: string, label: string) => {
    completedSteps = Math.min(totalSteps, completedSteps + 1);
    args.onProgress?.({
      stage,
      label,
      current: completedSteps,
      total: totalSteps,
      percent: Math.floor((completedSteps / totalSteps) * 100),
    });
  };
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
    reportProgress(`usage:${def.category}`, def.label);
  }
  const stateDatabaseSize = await getRuntimePathSize(paths.stateDbPath);
  const synthesisDatabaseSize = await getRuntimePathSize(paths.synthesisDbPath);
  reportProgress("usage:state-db", "State database");
  reportProgress("usage:synthesis-db", "Synthesis database");
  const stateDatabases: RuntimePersistenceStateDatabaseUsage[] = [
    {
      kind: "runtime",
      path: paths.stateDbPath,
      bytes: stateDatabaseSize.bytes,
      exists: stateDatabaseSize.exists,
      itemCount: stateDatabaseSize.itemCount,
    },
    {
      kind: "synthesis",
      path: paths.synthesisDbPath,
      bytes: synthesisDatabaseSize.bytes,
      exists: synthesisDatabaseSize.exists,
      itemCount: synthesisDatabaseSize.itemCount,
    },
  ];
  return {
    root: paths.root,
    scannedAt: new Date().toISOString(),
    totalBytes: categories.reduce((sum, entry) => sum + entry.bytes, 0),
    categories,
    stateDatabase: stateDatabases[0],
    stateDatabases,
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
    await runtimeLogClearer?.();
    await removeAndTrack(paths.logsDir);
  } else if (category === "skillrunner-ledger") {
    const runRowsDeleted = pluginRunStoreClearer?.("skillrunner") || 0;
    const legacyRowsDeleted = pluginTaskDomainClearer?.("skillrunner") || 0;
    details.rowsDeleted = runRowsDeleted + legacyRowsDeleted;
    details.runStoreRowsDeleted = runRowsDeleted;
    details.legacyRowsDeleted = legacyRowsDeleted;
  } else if (category === "acp-conversations") {
    details.rowsDeleted =
      acpConversationRecordsClearer?.() ??
      pluginTaskDomainExceptRowScopesClearer?.("acp", ["skill-runs"]) ??
      0;
    await removeAndTrack(paths.acpChatRoot);
  } else if (category === "acp-skill-runs") {
    const runRowsDeleted = pluginRunStoreClearer?.("acp") || 0;
    const legacyRowsDeleted =
      pluginTaskScopeClearer?.("acp", "skill-runs") || 0;
    details.rowsDeleted = runRowsDeleted + legacyRowsDeleted;
    details.runStoreRowsDeleted = runRowsDeleted;
    details.legacyRowsDeleted = legacyRowsDeleted;
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
  const acpSkillRunDirs = Array.from(
    new Set([
      ...(cleanerResult?.workspaceDirs || []),
      ...(cleanerResult?.runtimeDirs || []),
    ]),
  ).sort((left, right) => left.length - right.length);
  for (const runtimeDir of acpSkillRunDirs) {
    if (!isPathWithinRoot(paths.acpSkillRunsDir, runtimeDir)) {
      continue;
    }
    if (await removeRuntimePath(runtimeDir)) {
      removedPaths.push(runtimeDir);
    }
  }
  const expiredAssets = await collectExpiredRuntimeAssets({ nowMs });
  const expiredByOwner: Record<RuntimeExpiredAssetOwner, number> = {
    tmp: 0,
    cache: 0,
    logs: 0,
  };
  for (const asset of expiredAssets) {
    if (!isPathWithinRoot(asset.root, asset.path)) {
      continue;
    }
    if (await removeRuntimePath(asset.path)) {
      removedPaths.push(asset.path);
      expiredByOwner[asset.owner] += 1;
    }
  }
  details.expiredRuntimeAssetCount = expiredAssets.length;
  details.expiredRuntimeAssetsDeleted = expiredByOwner;
  return {
    ok: true,
    removedPaths,
    details,
    usage: await scanRuntimePersistenceUsage(),
  };
}
