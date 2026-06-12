import {
  createBackendsPrefsDocument,
  loadBackendsRegistry,
} from "../backends/registry";
import type { BackendInstance } from "../backends/types";
import { getPref, setPref } from "../utils/prefs";
import {
  SkillRunnerCtlBridge,
  type SkillRunnerCtlCommandResult,
  type SkillRunnerLocalRuntimeBridgeArgs,
} from "./skillRunnerCtlBridge";
import {
  installSkillRunnerRelease,
  type ReleaseInstallResult,
} from "./skillRunnerReleaseInstaller";
import { getPathSeparator, joinPath } from "../utils/path";
import {
  appendSkillRunnerLocalDeployDebugLog,
  resetSkillRunnerLocalDeployDebugSession,
} from "./skillRunnerLocalDeployDebugStore";
import { showWorkflowToast } from "./workflowExecution/feedbackSeam";
import { reconcileSkillRunnerBackendTaskLedgerOnce } from "./skillRunnerTaskReconciler";
import {
  markSkillRunnerBackendHealthSuccess,
  registerSkillRunnerBackendForHealthTracking,
} from "./skillRunnerBackendHealthRegistry";
import {
  MANAGED_LOCAL_BACKEND_ID,
  normalizeManagedLocalBackendId,
} from "./skillRunnerLocalRuntimeConstants";
import { resolveManagedLocalRuntimeToastText } from "../utils/localizationGovernance";
import { appendRuntimeLog } from "./runtimeLogManager";
import { refreshSkillRunnerModelCacheForBackend } from "../providers/skillrunner/modelCache";

type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

const MANAGED_PROFILE_ID = MANAGED_LOCAL_BACKEND_ID;
const DEFAULT_MANAGED_LOCAL_HOST = "127.0.0.1";
const DEFAULT_MANAGED_LOCAL_PORT = 29813;
const DEFAULT_MANAGED_LOCAL_PORT_FALLBACK_SPAN = 10;
export const DEFAULT_LOCAL_RUNTIME_VERSION = "v0.6.0";
const DEFAULT_SKILL_RUNNER_RELEASE_REPO = "leike0813/Skill-Runner";
const STATE_PREF_KEY = "skillRunnerLocalRuntimeStateJson";
const VERSION_PREF_KEY = "skillRunnerLocalRuntimeVersion";
const DEFAULT_HEARTBEAT_INTERVAL_SECONDS = 20;
const LEASE_OWNER_ID = "zotero-plugin";
const BACKENDS_CONFIG_PREF_KEY = "backendsConfigJson";
const RUNTIME_STATUS_POLL_ATTEMPTS = 5;
const RUNTIME_STATUS_POLL_INTERVAL_MS = 2000;
const AUTO_ENSURE_INTERVAL_MS = 15000;
const LOCAL_RUNTIME_TOAST_DEDUP_WINDOW_MS = 5000;
const LOCAL_RUNTIME_TOAST_TYPE = "skillrunner-backend";

type RuntimeState =
  | "unknown"
  | "starting"
  | "running"
  | "stopped"
  | "degraded"
  | "reconciling_after_heartbeat_fail";
type LeaseViewState = "pending" | "acquired" | "conflict" | "failed";
type MonitoringState = "inactive" | "heartbeat" | "reconciling";

type LeaseState = {
  acquired?: boolean;
  stoppedByConflict?: boolean;
  leaseId?: string;
  heartbeatIntervalSeconds?: number;
  lastAcquireAt?: string;
  lastHeartbeatAt?: string;
  lastError?: string;
};

type BootstrapReportSummary = {
  bootstrapReportFile: string;
  bootstrapOutcome: "ok" | "partial_failure";
  bootstrapFailedEngines: string[];
  bootstrapWarning?: string;
};

export type ManagedLocalRuntimeState = {
  managedBackendId?: string;
  versionTag?: string;
  installDir?: string;
  ctlPath?: string;
  baseUrl?: string;
  runtimeHost?: string;
  runtimePort?: number;
  runtimeUrl?: string;
  requestedPort?: number;
  portFallbackSpan?: number;
  portFallbackUsed?: boolean;
  triedPorts?: number[];
  lease?: LeaseState;
  runtimeState?: RuntimeState;
  runtimeFailureCount?: number;
  deployedAt?: string;
  lastRuntimeStatusAt?: string;
  lastDeployError?: string;
  lastRuntimeError?: string;
  autoStartPaused?: boolean;
  updatedAt?: string;
};

export type SkillRunnerLocalRuntimeActionResult = {
  ok: boolean;
  message: string;
  stage: string;
  conflict?: boolean;
  details?: Record<string, unknown>;
};

type LocalRuntimeActionProgress = {
  action: "deploy" | "uninstall";
  current: number;
  total: number;
  percent: number;
  stage: string;
  label: string;
};

type LeaseHttpResult = {
  ok: boolean;
  status?: number;
  body?: Record<string, unknown>;
  error?: string;
};

type AutoEnsureTickResult = {
  ok: boolean;
  stage: string;
  message: string;
};

type OneclickPlannedAction = "start" | "deploy";

type EnsureManagedLocalRuntimeOptions = {
  ignoreAutoStartPaused?: boolean;
  backgroundInFlightAction?: string;
};

let autoStartEnabledInSession = false;
type ManagedLocalRuntimeStateChangeListener = () => void;
const managedLocalRuntimeStateChangeListeners = new Set<ManagedLocalRuntimeStateChangeListener>();
let pendingAutoEnsureTickTimer: ReturnType<typeof setTimeout> | undefined;
let suppressAutoEnsureTriggerForTests = false;
let actionProgressState: LocalRuntimeActionProgress | null = null;
type LocalRuntimeToastKind =
  | "runtime-up"
  | "runtime-down"
  | "runtime-abnormal-stop";
type LocalRuntimeToastPayload = {
  kind: LocalRuntimeToastKind;
  text: string;
  type: string;
};
const localRuntimeToastDedup = new Map<string, number>();
let localRuntimeToastEmitter: (payload: LocalRuntimeToastPayload) => void = (
  payload,
) => {
  showWorkflowToast({
    text: payload.text,
    type: payload.type as any,
    semantic: "runtime",
  });
};

type LocalRuntimePostUpTaskReconcileArgs = {
  backendId: string;
  displayName?: string;
  baseUrl: string;
  source: "local-runtime-up";
};

let localRuntimePostUpTaskReconcileRunner: (
  args: LocalRuntimePostUpTaskReconcileArgs,
) => Promise<void> = async (args) => {
  await reconcileSkillRunnerBackendTaskLedgerOnce({
    backend: {
      id: args.backendId,
      displayName: args.displayName,
      type: "skillrunner",
      baseUrl: args.baseUrl,
      auth: {
        kind: "none",
      },
    },
    source: args.source,
    emitFailureToast: true,
  });
};

function notifyManagedLocalRuntimeStateChanged() {
  for (const listener of Array.from(managedLocalRuntimeStateChangeListeners)) {
    try {
      listener();
    } catch {
      // keep notification best-effort and non-blocking
    }
  }
}

export function subscribeManagedLocalRuntimeStateChange(
  listener: ManagedLocalRuntimeStateChangeListener,
) {
  managedLocalRuntimeStateChangeListeners.add(listener);
  return () => {
    managedLocalRuntimeStateChangeListeners.delete(listener);
  };
}

export function emitManagedLocalRuntimeStateChangedForTests() {
  notifyManagedLocalRuntimeStateChanged();
}

export function resetManagedLocalRuntimeStateChangeListenersForTests() {
  managedLocalRuntimeStateChangeListeners.clear();
}

function cloneActionProgress(
  progress: LocalRuntimeActionProgress | null,
): LocalRuntimeActionProgress | null {
  if (!progress) {
    return null;
  }
  return {
    ...progress,
  };
}

function setActionProgress(progress: {
  action: "deploy" | "uninstall";
  current: number;
  total: number;
  stage: string;
  label: string;
}) {
  const total = Math.max(1, Math.floor(progress.total || 1));
  const current = Math.max(0, Math.min(total, Math.floor(progress.current || 0)));
  actionProgressState = {
    action: progress.action,
    current,
    total,
    percent: Math.floor((current / total) * 100),
    stage: normalizeString(progress.stage) || "unknown",
    label: normalizeString(progress.label) || "",
  };
  notifyManagedLocalRuntimeStateChanged();
}

function clearActionProgress() {
  if (!actionProgressState) {
    return;
  }
  actionProgressState = null;
  notifyManagedLocalRuntimeStateChanged();
}

function resolveDeployProgressLabel(stage: string) {
  const normalized = normalizeString(stage).toLowerCase();
  if (normalized === "deploy-release-assets-probe") {
    return "Release probe";
  }
  if (normalized === "deploy-release-download-checksum") {
    return "Download and checksum";
  }
  if (normalized === "deploy-release-extract") {
    return "Extract release package";
  }
  if (normalized === "deploy-bootstrap") {
    return "Bootstrap runtime";
  }
  if (normalized === "deploy-post-bootstrap") {
    return "Finalize deploy";
  }
  return "Deploy";
}

function resolveUninstallProgressLabel(stage: string) {
  const normalized = normalizeString(stage).toLowerCase();
  if (normalized === "uninstall-down") {
    return "Stop runtime";
  }
  if (normalized.startsWith("uninstall-delete-")) {
    return "Delete runtime directory";
  }
  if (normalized === "uninstall-profile") {
    return "Remove managed profile";
  }
  return "Uninstall";
}

function emitLocalRuntimeToast(kind: LocalRuntimeToastKind) {
  const now = Date.now();
  const last = localRuntimeToastDedup.get(kind) || 0;
  if (now - last < LOCAL_RUNTIME_TOAST_DEDUP_WINDOW_MS) {
    return;
  }
  localRuntimeToastDedup.set(kind, now);
  const text = resolveManagedLocalRuntimeToastText(kind);
  try {
    localRuntimeToastEmitter({
      kind,
      text,
      type: LOCAL_RUNTIME_TOAST_TYPE,
    });
  } catch {
    // ignore toast failures
  }
}

export function setLocalRuntimeToastEmitterForTests(
  emitter?: (payload: LocalRuntimeToastPayload) => void,
) {
  localRuntimeToastEmitter = emitter || ((payload) => {
    showWorkflowToast({
      text: payload.text,
      type: payload.type as any,
      semantic: "runtime",
    });
  });
}

export function resetLocalRuntimeToastStateForTests() {
  localRuntimeToastDedup.clear();
  setLocalRuntimeToastEmitterForTests();
}

export function setManagedLocalRuntimePostUpTaskReconcileRunnerForTests(
  runner?: (args: LocalRuntimePostUpTaskReconcileArgs) => Promise<void>,
) {
  localRuntimePostUpTaskReconcileRunner =
    runner ||
    (async (args) => {
      await reconcileSkillRunnerBackendTaskLedgerOnce({
        backend: {
          id: args.backendId,
          displayName: args.displayName,
          type: "skillrunner",
          baseUrl: args.baseUrl,
          auth: {
            kind: "none",
          },
        },
        source: args.source,
        emitFailureToast: true,
      });
    });
}

function triggerManagedLocalRuntimePostUpTaskReconcile(state: ManagedLocalRuntimeState) {
  const backendId = normalizeString(state.managedBackendId) || MANAGED_PROFILE_ID;
  const baseUrl = resolveManagedBaseUrl(state);
  void localRuntimePostUpTaskReconcileRunner({
    backendId,
    displayName: undefined,
    baseUrl,
    source: "local-runtime-up",
  });
}

function triggerSilentManagedModelCacheRefresh(state: ManagedLocalRuntimeState) {
  const backendId = normalizeString(state.managedBackendId) || MANAGED_PROFILE_ID;
  void (async () => {
    try {
      const loaded = await loadBackendsRegistry();
      if (loaded.fatalError) {
        appendLocalRuntimeLog({
          level: "warn",
          operation: "refresh-managed-model-cache-silent",
          stage: "refresh-managed-model-cache-silent-load-failed",
          message: loaded.fatalError,
        });
        return;
      }
      const backend = loaded.backends.find(
        (entry) =>
          String(entry.id || "").trim() === backendId &&
          String(entry.type || "").trim() === "skillrunner",
      );
      if (!backend) {
        appendLocalRuntimeLog({
          level: "warn",
          operation: "refresh-managed-model-cache-silent",
          stage: "refresh-managed-model-cache-silent-backend-missing",
          message: `backend profile not found: ${backendId}`,
          details: { backendId },
        });
        return;
      }
      const refreshed = await skillRunnerModelCacheRefresher({
        backend,
      });
      appendLocalRuntimeLog({
        level: refreshed.ok ? "info" : "warn",
        operation: "refresh-managed-model-cache-silent",
        stage: refreshed.ok
          ? "refresh-managed-model-cache-silent-ok"
          : "refresh-managed-model-cache-silent-failed",
        message: refreshed.ok
          ? "managed backend model cache refreshed silently"
          : String(refreshed.error || "managed backend model cache refresh failed"),
        details: refreshed as Record<string, unknown>,
      });
    } catch (error) {
      appendLocalRuntimeLog({
        level: "warn",
        operation: "refresh-managed-model-cache-silent",
        stage: "refresh-managed-model-cache-silent-error",
        message: String(error),
      });
    }
  })();
}

export function resetManagedRuntimeAsyncTriggerForTests() {
  if (!pendingAutoEnsureTickTimer) {
    runtimeActionInFlight = "";
    backgroundInFlightAction = "";
    actionProgressState = null;
    return;
  }
  clearTimeout(pendingAutoEnsureTickTimer);
  pendingAutoEnsureTickTimer = undefined;
  runtimeActionInFlight = "";
  backgroundInFlightAction = "";
  actionProgressState = null;
}

export function setSuppressManagedRuntimeAutoEnsureTriggerForTests(
  suppress: boolean,
) {
  suppressAutoEnsureTriggerForTests = suppress === true;
}

export function resetManagedLocalRuntimeLoopsForTests() {
  if (pendingAutoEnsureTickTimer) {
    clearTimeout(pendingAutoEnsureTickTimer);
  }
  pendingAutoEnsureTickTimer = undefined;
  if (autoEnsureTimer) {
    clearInterval(autoEnsureTimer);
  }
  autoEnsureTimer = undefined;
  if (statusReconcileTimer) {
    clearInterval(statusReconcileTimer);
  }
  statusReconcileTimer = undefined;
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }
  heartbeatTimer = undefined;
  heartbeatRunning = false;
  statusReconcileRunning = false;
  autoEnsureRunning = false;
  heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_SECONDS * 1000;
  runtimeControlLock = Promise.resolve();
  monitoringState = "inactive";
  runtimeActionInFlight = "";
  backgroundInFlightAction = "";
  actionProgressState = null;
  autoStartEnabledInSession = false;
  suppressAutoEnsureTriggerForTests = false;
}

export function getManagedLocalRuntimeLoopStateForTests() {
  return {
    pendingAutoEnsureTickScheduled: !!pendingAutoEnsureTickTimer,
    autoEnsureTimerActive: !!autoEnsureTimer,
    heartbeatTimerActive: !!heartbeatTimer,
    statusReconcileTimerActive: !!statusReconcileTimer,
    heartbeatRunning,
    statusReconcileRunning,
    autoEnsureRunning,
    heartbeatIntervalMs,
    monitoringState,
    runtimeActionInFlight,
    backgroundInFlightAction,
    actionProgressActive: actionProgressState !== null,
    autoStartEnabledInSession,
    suppressAutoEnsureTriggerForTests,
    stateChangeListenerCount: managedLocalRuntimeStateChangeListeners.size,
    toastDedupCount: localRuntimeToastDedup.size,
  };
}

export function resetLocalRuntimeAutoStartSessionState() {
  setAutoStartEnabledInSession(false, { persist: false });
}

function setPersistedAutoStartPaused(
  paused: boolean,
  state?: ManagedLocalRuntimeState,
) {
  const current = normalizeState(state || readManagedLocalRuntimeState());
  if (current.autoStartPaused === paused) {
    return;
  }
  writeManagedLocalRuntimeState({
    ...current,
    autoStartPaused: paused,
  });
}

function setAutoStartEnabledInSession(
  enabled: boolean,
  options?: {
    persist?: boolean;
    state?: ManagedLocalRuntimeState;
  },
) {
  const next = enabled === true;
  const changed = autoStartEnabledInSession !== next;
  autoStartEnabledInSession = next;
  const shouldPersist = options?.persist !== false;
  if (shouldPersist) {
    setPersistedAutoStartPaused(!next, options?.state);
    return;
  }
  if (changed) {
    notifyManagedLocalRuntimeStateChanged();
  }
}

export function hydrateLocalRuntimeAutoStartSessionStateFromPersistedState() {
  const state = readManagedLocalRuntimeState();
  const persistedPaused = normalizeAutoStartPaused(state.autoStartPaused);
  const next = persistedPaused === false;
  const changed = autoStartEnabledInSession !== next;
  autoStartEnabledInSession = next;
  if (changed) {
    notifyManagedLocalRuntimeStateChanged();
  }
  return {
    autoStartPaused: !next,
  };
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function detectWindows() {
  return getPathSeparator() === "\\";
}

function readProcessEnv(name: string) {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  return normalizeString(runtime.process?.env?.[name]);
}

function readDirectoryServicePath(key: string) {
  const runtime = globalThis as {
    Services?: {
      dirsvc?: {
        get?: (name: string, iface: unknown) => { path?: string };
      };
    };
    Ci?: { nsIFile?: unknown };
  };
  if (!runtime.Services?.dirsvc?.get || !runtime.Ci?.nsIFile) {
    return "";
  }
  try {
    const file = runtime.Services.dirsvc.get(key, runtime.Ci.nsIFile);
    return normalizeString(file?.path);
  } catch {
    return "";
  }
}

function resolveDefaultInstallRoot() {
  if (detectWindows()) {
    const localAppData =
      readProcessEnv("LOCALAPPDATA") ||
      readProcessEnv("LocalAppData") ||
      readDirectoryServicePath("LocalAppData");
    if (localAppData) {
      return joinPath(localAppData, "SkillRunner", "releases");
    }
    const home = readProcessEnv("USERPROFILE") || readDirectoryServicePath("Home");
    if (home) {
      return joinPath(home, "AppData", "Local", "SkillRunner", "releases");
    }
    return "";
  }
  const home = readProcessEnv("HOME") || readDirectoryServicePath("Home");
  if (home) {
    return joinPath(home, ".local", "share", "skill-runner", "releases");
  }
  return "";
}

function resolveManagedLocalRootFromInstallRoot(installRoot: string) {
  const normalizedInstallRoot = normalizeString(installRoot);
  if (!normalizedInstallRoot) {
    return "";
  }
  return getParentPath(normalizedInstallRoot);
}

function buildManagedInstallLayoutDetails(args?: { installRoot?: string }) {
  const installRoot = normalizeString(args?.installRoot) || resolveDefaultInstallRoot();
  const localRoot = resolveManagedLocalRootFromInstallRoot(installRoot);
  const releasesPath = normalizeString(installRoot) || joinPath(localRoot, "releases");
  const dataPath = joinPath(localRoot, "data");
  const agentHomePath = joinPath(localRoot, "agent-cache", "agent-home");
  const npmCachePath = joinPath(localRoot, "agent-cache", "npm");
  const uvCachePath = joinPath(localRoot, "agent-cache", "uv_cache");
  const uvVenvPath = joinPath(localRoot, "agent-cache", "uv_venv");
  return {
    localRoot,
    installRoot: releasesPath,
    paths: [
      {
        id: "releases",
        path: releasesPath,
        purpose: "skill runner release artifacts",
      },
      {
        id: "data",
        path: dataPath,
        purpose: "runtime data and reports",
      },
      {
        id: "agent-home",
        path: agentHomePath,
        purpose: "agent home settings",
      },
      {
        id: "npm-cache",
        path: npmCachePath,
        purpose: "npm cache",
      },
      {
        id: "uv-cache",
        path: uvCachePath,
        purpose: "uv cache",
      },
      {
        id: "uv-venv",
        path: uvVenvPath,
        purpose: "uv virtual environment cache",
      },
    ],
  };
}

function nowIso() {
  return new Date().toISOString();
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizePositiveInteger(value: unknown, fallback: number) {
  const numeric =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : Number.parseInt(String(value || "").trim(), 10);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.floor(numeric);
  }
  return fallback;
}

function normalizeNonNegativeInteger(value: unknown, fallback: number) {
  const numeric =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : Number.parseInt(String(value || "").trim(), 10);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return Math.floor(numeric);
  }
  return fallback;
}

function normalizePort(value: unknown, fallback: number) {
  const numeric =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : Number.parseInt(String(value || "").trim(), 10);
  if (Number.isFinite(numeric)) {
    const port = Math.floor(numeric);
    if (port >= 1 && port <= 65535) {
      return port;
    }
  }
  return fallback;
}

function buildBaseUrl(host: string, port: number) {
  return `http://${host}:${port}`;
}

function normalizeUrl(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return "";
  }
  try {
    const parsed = new URL(normalized);
    return parsed.toString();
  } catch {
    return "";
  }
}

function parseEndpointFromUrl(value: unknown) {
  const normalized = normalizeUrl(value);
  if (!normalized) {
    return null;
  }
  try {
    const parsed = new URL(normalized);
    const host = normalizeString(parsed.hostname) || DEFAULT_MANAGED_LOCAL_HOST;
    const portFromUrl = normalizeString(parsed.port);
    const port = portFromUrl
      ? normalizePort(portFromUrl, DEFAULT_MANAGED_LOCAL_PORT)
      : normalizePort(
          parsed.protocol.toLowerCase() === "https:" ? 443 : 80,
          DEFAULT_MANAGED_LOCAL_PORT,
        );
    return {
      host,
      port,
      url: parsed.toString(),
    };
  } catch {
    return null;
  }
}

function normalizeNumberArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as number[];
  }
  return value
    .map((entry) => normalizePort(entry, -1))
    .filter((entry) => entry >= 1 && entry <= 65535);
}

type RuntimeEndpoint = {
  host: string;
  port: number;
  url: string;
  requestedPort: number;
  portFallbackSpan: number;
};

function resolveRuntimeEndpoint(state: ManagedLocalRuntimeState | undefined): RuntimeEndpoint {
  const normalizedState = state || {};
  const parsedFromRuntimeUrl = parseEndpointFromUrl(normalizedState.runtimeUrl);
  const parsedFromBaseUrl = parseEndpointFromUrl(normalizedState.baseUrl);
  const host =
    normalizeString(normalizedState.runtimeHost) ||
    parsedFromRuntimeUrl?.host ||
    parsedFromBaseUrl?.host ||
    DEFAULT_MANAGED_LOCAL_HOST;
  const port = normalizePort(
    normalizedState.runtimePort,
    parsedFromRuntimeUrl?.port ||
      parsedFromBaseUrl?.port ||
      DEFAULT_MANAGED_LOCAL_PORT,
  );
  const requestedPort = normalizePort(
    normalizedState.requestedPort,
    port,
  );
  const portFallbackSpan = normalizePortFallbackSpan(normalizedState.portFallbackSpan);
  const url = normalizeUrl(normalizedState.runtimeUrl) || `${buildBaseUrl(host, port)}/`;
  return {
    host,
    port,
    url,
    requestedPort,
    portFallbackSpan,
  };
}

function normalizePortFallbackSpan(value: unknown) {
  return normalizeNonNegativeInteger(value, DEFAULT_MANAGED_LOCAL_PORT_FALLBACK_SPAN);
}

function normalizeHeartbeatIntervalSeconds(value: unknown) {
  return normalizePositiveInteger(value, DEFAULT_HEARTBEAT_INTERVAL_SECONDS);
}

function resolveHeartbeatIntervalMs(lease: LeaseState | undefined) {
  return normalizeHeartbeatIntervalSeconds(lease?.heartbeatIntervalSeconds) * 1000;
}

function normalizeRuntimeState(value: unknown): RuntimeState {
  const normalized = normalizeString(value).toLowerCase();
  if (
    normalized === "starting" ||
    normalized === "running" ||
    normalized === "stopped" ||
    normalized === "degraded" ||
    normalized === "reconciling_after_heartbeat_fail"
  ) {
    return normalized;
  }
  return "unknown";
}

function normalizeRuntimeFailureCount(value: unknown) {
  return normalizePositiveInteger(value, 0);
}

function normalizeAutoStartPaused(value: unknown) {
  if (value === true) {
    return true;
  }
  if (value === false) {
    return false;
  }
  return undefined;
}

function isAutoStartPaused() {
  return autoStartEnabledInSession !== true;
}

export function isLocalRuntimeAutoStartPaused() {
  return isAutoStartPaused();
}

async function sleepMs(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, Math.floor(ms))));
}

async function readTextFile(filePath: string) {
  const runtime = globalThis as {
    IOUtils?: { readUTF8?: (path: string) => Promise<string> };
  };
  if (typeof runtime.IOUtils?.readUTF8 === "function") {
    return runtime.IOUtils.readUTF8(filePath);
  }
  const fs = await dynamicImport("fs/promises");
  return fs.readFile(filePath, "utf8") as Promise<string>;
}

async function pathExists(pathValue: string) {
  const normalized = normalizeString(pathValue);
  if (!normalized) {
    return false;
  }
  const runtime = globalThis as {
    IOUtils?: { exists?: (path: string) => Promise<boolean> };
  };
  if (typeof runtime.IOUtils?.exists === "function") {
    try {
      const exists = !!(await runtime.IOUtils.exists(normalized));
      if (exists) {
        return true;
      }
    } catch {
      // continue to node fallback
    }
  }
  try {
    const fs = await dynamicImport("fs/promises");
    await fs.access(normalized);
    return true;
  } catch {
    return false;
  }
}

type RemovePathRecursiveDiagnostics = {
  retries: number;
  longPathFallbackAttempted: boolean;
  lastErrorCode: string;
  lastErrorMessage: string;
};

type RemovePathRecursiveError = Error & {
  deleteDiagnostics?: RemovePathRecursiveDiagnostics;
};

const RETRIABLE_DELETE_ERROR_CODES = new Set([
  "EPERM",
  "EBUSY",
  "ENOTEMPTY",
  "ENAMETOOLONG",
]);

function getDeleteErrorCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }
  const typed = error as { code?: unknown; errno?: unknown };
  const codeText = normalizeString(typed.code || typed.errno);
  return codeText.toUpperCase();
}

function getDeleteErrorMessage(error: unknown) {
  return normalizeString(
    error && typeof error === "object" && "message" in error
      ? (error as { message?: unknown }).message
      : error,
  );
}

function isRetriableDeleteError(error: unknown) {
  const code = getDeleteErrorCode(error);
  if (code && RETRIABLE_DELETE_ERROR_CODES.has(code)) {
    return true;
  }
  const message = getDeleteErrorMessage(error).toLowerCase();
  return (
    message.includes("directory not empty") ||
    message.includes("path too long") ||
    message.includes("filename or extension is too long") ||
    message.includes("resource busy") ||
    message.includes("access is denied") ||
    message.includes("operation not permitted")
  );
}

function toWindowsExtendedPath(pathValue: string) {
  const normalized = normalizeString(pathValue);
  if (!normalized || !detectWindows()) {
    return "";
  }
  if (normalized.startsWith("\\\\?\\")) {
    return normalized;
  }
  if (normalized.startsWith("\\\\")) {
    return `\\\\?\\UNC\\${normalized.slice(2)}`;
  }
  if (/^[A-Za-z]:[\\/]/.test(normalized)) {
    return `\\\\?\\${normalized.replace(/\//g, "\\")}`;
  }
  return "";
}

function toPowerShellSingleQuotedLiteral(raw: string) {
  const normalized = String(raw || "");
  return `'${normalized.replace(/'/g, "''")}'`;
}

async function removePathRecursiveWithNodeFs(pathValue: string) {
  const fs = await dynamicImport("fs/promises");
  await fs.rm(pathValue, {
    recursive: true,
    force: true,
  });
}

type SubprocessInvocationResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

function isExecutableNotFoundMessage(message: string) {
  const normalized = normalizeString(message).toLowerCase();
  return (
    normalized.includes("executable not found") ||
    normalized.includes("could not be found") ||
    normalized.includes("is not recognized")
  );
}

function normalizeWindowsPathCandidate(pathValue: string) {
  const normalized = normalizeString(pathValue).replace(/^"+|"+$/g, "");
  return normalized;
}

function getWindowsShellCommandCandidates(command: string) {
  const normalizedCommand = normalizeString(command);
  if (!detectWindows() || !normalizedCommand) {
    return [normalizedCommand].filter(Boolean);
  }
  if (
    normalizedCommand.startsWith("\\\\") ||
    /^[A-Za-z]:[\\/]/.test(normalizedCommand) ||
    /[\\/]/.test(normalizedCommand)
  ) {
    return [normalizedCommand];
  }
  const lower = normalizedCommand.toLowerCase();
  const systemRoot =
    readProcessEnv("SystemRoot") ||
    readProcessEnv("WINDIR") ||
    "C:\\Windows";
  const comspec = normalizeWindowsPathCandidate(
    readProcessEnv("ComSpec") || readProcessEnv("COMSPEC"),
  );
  const candidates: string[] = [normalizedCommand];
  if (lower === "cmd" || lower === "cmd.exe") {
    candidates.push(
      comspec,
      `${systemRoot}\\System32\\cmd.exe`,
      `${systemRoot}\\Sysnative\\cmd.exe`,
    );
  } else if (lower === "powershell" || lower === "powershell.exe") {
    candidates.push(
      `${systemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`,
      `${systemRoot}\\Sysnative\\WindowsPowerShell\\v1.0\\powershell.exe`,
    );
  }
  return Array.from(
    new Set(candidates.map((entry) => normalizeString(entry)).filter(Boolean)),
  );
}

async function runSubprocessCommand(args: {
  command: string;
  argv: string[];
}): Promise<SubprocessInvocationResult> {
  const runtime = globalThis as {
    Zotero?: {
      Utilities?: {
        Internal?: {
          subprocess?: (command: string, args?: string[]) => Promise<string>;
        };
      };
    };
  };
  const subprocess = runtime.Zotero?.Utilities?.Internal?.subprocess;
  if (typeof subprocess !== "function") {
    return {
      ok: false,
      stdout: "",
      stderr: "subprocess is unavailable in current context",
    };
  }
  const candidates = getWindowsShellCommandCandidates(args.command);
  let lastError = "";
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    try {
      const stdout = await subprocess(candidate, args.argv);
      return {
        ok: true,
        stdout: normalizeString(stdout),
        stderr: "",
      };
    } catch (error) {
      const message = getDeleteErrorMessage(error) || "subprocess invocation failed";
      lastError = message;
      const canRetryWithNextCandidate =
        i < candidates.length - 1 && isExecutableNotFoundMessage(message);
      if (canRetryWithNextCandidate) {
        continue;
      }
      break;
    }
  }
  return {
    ok: false,
    stdout: "",
    stderr: lastError || "subprocess invocation failed",
  };
}

async function removePathRecursiveWithWindowsShellFallback(args: {
  normalizedPath: string;
  extendedPath: string;
  diagnostics: RemovePathRecursiveDiagnostics;
}) {
  const targets: Array<{ path: string; longPath: boolean }> = [];
  if (args.normalizedPath) {
    targets.push({
      path: args.normalizedPath,
      longPath: false,
    });
  }
  if (args.extendedPath) {
    targets.push({
      path: args.extendedPath,
      longPath: true,
    });
  }
  let lastError = "";
  for (const target of targets) {
    if (target.longPath) {
      args.diagnostics.longPathFallbackAttempted = true;
    }
    const psScript = [
      "$ErrorActionPreference='Stop'",
      `$p=${toPowerShellSingleQuotedLiteral(target.path)}`,
      "if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction Stop }",
      "exit 0",
    ].join("; ");
    const psResult = await runSubprocessCommand({
      command: "powershell.exe",
      argv: [
        "-NoLogo",
        "-NonInteractive",
        "-WindowStyle",
        "Hidden",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        psScript,
      ],
    });
    if (psResult.ok && !(await pathExists(args.normalizedPath))) {
      return;
    }
    if (!psResult.ok) {
      lastError = psResult.stderr || lastError;
    }
    const cmdResult = await runSubprocessCommand({
      command: "cmd.exe",
      argv: ["/d", "/s", "/c", `if exist "${target.path}" rd /s /q "${target.path}"`],
    });
    if (cmdResult.ok && !(await pathExists(args.normalizedPath))) {
      return;
    }
    if (!cmdResult.ok) {
      lastError = cmdResult.stderr || lastError;
    }
  }
  const error = new Error(
    normalizeString(lastError) || "windows shell fallback failed to delete path",
  ) as RemovePathRecursiveError;
  error.deleteDiagnostics = args.diagnostics;
  throw error;
}

async function removePathRecursive(pathValue: string): Promise<RemovePathRecursiveDiagnostics> {
  const normalized = normalizeString(pathValue);
  const diagnostics: RemovePathRecursiveDiagnostics = {
    retries: 0,
    longPathFallbackAttempted: false,
    lastErrorCode: "",
    lastErrorMessage: "",
  };
  if (!normalized) {
    return diagnostics;
  }
  const runtime = globalThis as {
    IOUtils?: {
      remove?: (
        path: string,
        options?: { ignoreAbsent?: boolean; recursive?: boolean },
      ) => Promise<void>;
    };
  };
  const maxRetries = detectWindows() ? 3 : 0;
  const runWithRetry = async (operation: () => Promise<void>) => {
    let attempt = 0;
    while (true) {
      try {
        await operation();
        return;
      } catch (error) {
        diagnostics.lastErrorCode = getDeleteErrorCode(error);
        diagnostics.lastErrorMessage =
          getDeleteErrorMessage(error) || "unknown error";
        const shouldRetry =
          detectWindows() &&
          attempt < maxRetries &&
          isRetriableDeleteError(error);
        if (!shouldRetry) {
          throw error;
        }
        attempt += 1;
        diagnostics.retries += 1;
        await sleepMs(Math.max(40, attempt * 120));
      }
    }
  };

  if (typeof runtime.IOUtils?.remove === "function") {
    try {
      await runWithRetry(async () => {
        await runtime.IOUtils?.remove?.(normalized, {
          ignoreAbsent: true,
          recursive: true,
        });
      });
      return diagnostics;
    } catch {
      // continue with node fs fallback
    }
  }
  const extendedPath = toWindowsExtendedPath(normalized);
  if (detectWindows()) {
    try {
      await runWithRetry(async () => {
        await removePathRecursiveWithWindowsShellFallback({
          normalizedPath: normalized,
          extendedPath,
          diagnostics,
        });
      });
      return diagnostics;
    } catch (error) {
      diagnostics.lastErrorCode = getDeleteErrorCode(error) || "SHELL_DELETE_FAILED";
      diagnostics.lastErrorMessage =
        getDeleteErrorMessage(error) || diagnostics.lastErrorMessage;
      const wrapped = new Error(
        diagnostics.lastErrorMessage || "failed to remove path recursively",
      ) as RemovePathRecursiveError;
      wrapped.deleteDiagnostics = diagnostics;
      throw wrapped;
    }
  }
  try {
    await runWithRetry(async () => {
      await removePathRecursiveWithNodeFs(normalized);
    });
    return diagnostics;
  } catch {
    // continue with Windows extended path fallback
  }
  if (extendedPath) {
    diagnostics.longPathFallbackAttempted = true;
    try {
      await runWithRetry(async () => {
        await removePathRecursiveWithNodeFs(extendedPath);
      });
      return diagnostics;
    } catch (error) {
      diagnostics.lastErrorCode = getDeleteErrorCode(error);
      diagnostics.lastErrorMessage =
        getDeleteErrorMessage(error) || diagnostics.lastErrorMessage;
      const wrapped = new Error(
        diagnostics.lastErrorMessage || "failed to remove path recursively",
      ) as RemovePathRecursiveError;
      wrapped.deleteDiagnostics = diagnostics;
      throw wrapped;
    }
  }
  const wrapped = new Error(
    diagnostics.lastErrorMessage || "failed to remove path recursively",
  ) as RemovePathRecursiveError;
  wrapped.deleteDiagnostics = diagnostics;
  throw wrapped;
}

function formatManagedDeleteFailureMessage(args: {
  targetId: string;
  targetPath: string;
  reason: string;
  diagnostics?: RemovePathRecursiveDiagnostics;
}) {
  const normalizedReason = normalizeString(args.reason) || "unknown error";
  const diagnostics = args.diagnostics;
  const parts = [normalizedReason];
  if (diagnostics) {
    parts.push(`code=${diagnostics.lastErrorCode || "unknown"}`);
    parts.push(`retries=${diagnostics.retries}`);
    parts.push(
      `long_path_fallback=${diagnostics.longPathFallbackAttempted ? "yes" : "no"}`,
    );
  }
  const isNpmTarget =
    args.targetId === "npm-cache" || /agent-cache[\\/]+npm/i.test(args.targetPath);
  if (isNpmTarget) {
    parts.push(
      "hint=possible Windows long-path or file-lock issue under npm cache",
    );
  }
  return parts.join("; ");
}

function normalizeBootstrapReport(
  reportFilePath: string,
  raw: unknown,
): BootstrapReportSummary | null {
  if (!isObjectRecord(raw)) {
    return null;
  }
  const summary = isObjectRecord(raw.summary) ? raw.summary : null;
  if (!summary) {
    return null;
  }
  const outcomeRaw = normalizeString(summary.outcome).toLowerCase();
  if (outcomeRaw !== "ok" && outcomeRaw !== "partial_failure") {
    return null;
  }
  const failedEnginesRaw = Array.isArray(summary.failed_engines)
    ? summary.failed_engines
    : [];
  const failedEngines = failedEnginesRaw
    .map((entry) => normalizeString(entry))
    .filter(Boolean);
  const bootstrapWarning =
    outcomeRaw === "partial_failure"
      ? `bootstrap reported partial_failure (failed_engines=${failedEngines.join(", ") || "unknown"})`
      : undefined;
  return {
    bootstrapReportFile: reportFilePath,
    bootstrapOutcome: outcomeRaw,
    bootstrapFailedEngines: failedEngines,
    ...(bootstrapWarning ? { bootstrapWarning } : {}),
  };
}

async function readBootstrapReport(args: {
  installDir: string;
  reportFilePath?: string;
}) {
  const explicitReportFilePath = normalizeString(args.reportFilePath);
  const inferredReportFilePath = (() => {
    if (explicitReportFilePath) {
      return explicitReportFilePath;
    }
    const dataDirFromEnv = normalizeString(readProcessEnv("SKILL_RUNNER_DATA_DIR"));
    if (isAbsoluteFsPath(dataDirFromEnv)) {
      return joinPath(dataDirFromEnv, "agent_bootstrap_report.json");
    }
    const installDir = normalizeString(args.installDir);
    const releasesDir = getParentPath(installDir);
    const localRoot = getParentPath(releasesDir);
    if (isAbsoluteFsPath(localRoot) && !isFsRootPath(localRoot)) {
      return joinPath(localRoot, "data", "agent_bootstrap_report.json");
    }
    return "";
  })();
  if (!inferredReportFilePath) {
    return {
      ok: false as const,
      stage: "deploy-bootstrap-report",
      message: "bootstrap report path could not be inferred",
      details: {
        bootstrapReportFile: "",
        installDir: args.installDir,
      },
    };
  }
  let source = "";
  try {
    source = await readTextFile(inferredReportFilePath);
  } catch (error) {
    const message = normalizeString(
      error && typeof error === "object" && "message" in error
        ? (error as { message?: unknown }).message
        : error,
    );
    return {
      ok: false as const,
      stage: "deploy-bootstrap-report",
      message: `failed to read bootstrap report: ${message || "unknown error"}`,
      details: {
        bootstrapReportFile: inferredReportFilePath,
      },
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return {
      ok: false as const,
      stage: "deploy-bootstrap-report",
      message: "bootstrap report is not valid JSON",
      details: {
        bootstrapReportFile: inferredReportFilePath,
      },
    };
  }
  const normalized = normalizeBootstrapReport(inferredReportFilePath, parsed);
  if (!normalized) {
    return {
      ok: false as const,
      stage: "deploy-bootstrap-report",
      message: "bootstrap report is missing required summary.outcome",
      details: {
        bootstrapReportFile: inferredReportFilePath,
      },
    };
  }
  return {
    ok: true as const,
    summary: normalized,
  };
}

function getGlobalFetch() {
  const runtime = globalThis as {
    fetch?: (input: string, init?: RequestInit) => Promise<Response>;
  };
  return runtime.fetch;
}

function buildReleaseAssetProbeTargets(version: string) {
  const normalizedVersion = normalizeString(version);
  const artifact = `skill-runner-${normalizedVersion}.tar.gz`;
  const checksum = `${artifact}.sha256`;
  const base = `https://github.com/${DEFAULT_SKILL_RUNNER_RELEASE_REPO}/releases/download/${normalizedVersion}`;
  return [
    {
      kind: "artifact",
      url: `${base}/${artifact}`,
    },
    {
      kind: "checksum",
      url: `${base}/${checksum}`,
    },
  ] as const;
}

async function probeReleaseAssets(version: string) {
  const targets = buildReleaseAssetProbeTargets(version);
  const fetchImpl = getGlobalFetch();
  if (typeof fetchImpl !== "function") {
    return {
      checked: false,
      ok: true,
      results: targets.map((target) => ({
        kind: target.kind,
        url: target.url,
        ok: false,
        skipped: true,
        reason: "fetch unavailable in current runtime",
      })),
    };
  }
  const results: Array<{
    kind: string;
    url: string;
    ok: boolean;
    status?: number;
    skipped?: boolean;
    reason?: string;
  }> = [];
  for (const target of targets) {
    try {
      const response = await fetchImpl(target.url, {
        method: "HEAD",
      });
      results.push({
        kind: target.kind,
        url: target.url,
        ok: response.ok,
        status: response.status,
      });
    } catch (error) {
      results.push({
        kind: target.kind,
        url: target.url,
        ok: false,
        reason: normalizeString(
          error && typeof error === "object" && "message" in error
            ? (error as { message?: unknown }).message
            : error,
        ),
      });
    }
  }
  return {
    checked: true,
    ok: results.every((entry) => entry.ok),
    results,
  };
}

function normalizeState(raw: unknown): ManagedLocalRuntimeState {
  if (!isObjectRecord(raw)) {
    return {};
  }
  const leaseRaw = isObjectRecord(raw.lease) ? raw.lease : {};
  const managedBackendId = normalizeManagedLocalBackendId(raw.managedBackendId);
  return {
    managedBackendId:
      managedBackendId === MANAGED_PROFILE_ID ? managedBackendId : undefined,
    versionTag: normalizeString(raw.versionTag) || undefined,
    installDir: normalizeString(raw.installDir) || undefined,
    ctlPath: normalizeString(raw.ctlPath) || undefined,
    baseUrl: normalizeString(raw.baseUrl) || undefined,
    runtimeHost: normalizeString(raw.runtimeHost) || undefined,
    runtimePort: normalizePort(raw.runtimePort, -1) > 0 ? normalizePort(raw.runtimePort, -1) : undefined,
    runtimeUrl: normalizeUrl(raw.runtimeUrl) || undefined,
    requestedPort:
      normalizePort(raw.requestedPort, -1) > 0
        ? normalizePort(raw.requestedPort, -1)
        : undefined,
    portFallbackSpan: normalizePortFallbackSpan(raw.portFallbackSpan),
    portFallbackUsed: raw.portFallbackUsed === true,
    triedPorts: normalizeNumberArray(raw.triedPorts),
    runtimeState: normalizeRuntimeState(raw.runtimeState),
    runtimeFailureCount: normalizeRuntimeFailureCount(raw.runtimeFailureCount),
    deployedAt: normalizeString(raw.deployedAt) || undefined,
    lastRuntimeStatusAt: normalizeString(raw.lastRuntimeStatusAt) || undefined,
    lastDeployError: normalizeString(raw.lastDeployError) || undefined,
    lastRuntimeError: normalizeString(raw.lastRuntimeError) || undefined,
    autoStartPaused: normalizeAutoStartPaused(raw.autoStartPaused),
    updatedAt: normalizeString(raw.updatedAt) || undefined,
    lease: {
      acquired: leaseRaw.acquired === true,
      stoppedByConflict: leaseRaw.stoppedByConflict === true,
      leaseId: normalizeString(leaseRaw.leaseId) || undefined,
      heartbeatIntervalSeconds: normalizeHeartbeatIntervalSeconds(
        leaseRaw.heartbeatIntervalSeconds,
      ),
      lastAcquireAt: normalizeString(leaseRaw.lastAcquireAt) || undefined,
      lastHeartbeatAt: normalizeString(leaseRaw.lastHeartbeatAt) || undefined,
      lastError: normalizeString(leaseRaw.lastError) || undefined,
    },
  };
}

export function getDefaultSkillRunnerLocalRuntimeVersion() {
  return DEFAULT_LOCAL_RUNTIME_VERSION;
}

export function readManagedLocalRuntimeState() {
  const raw = normalizeString(getPref(STATE_PREF_KEY));
  if (!raw) {
    return {} as ManagedLocalRuntimeState;
  }
  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    return {} as ManagedLocalRuntimeState;
  }
}

function writeManagedLocalRuntimeState(state: ManagedLocalRuntimeState) {
  const normalized = normalizeState(state);
  normalized.updatedAt = nowIso();
  setPref(STATE_PREF_KEY, JSON.stringify(normalized));
  notifyManagedLocalRuntimeStateChanged();
  return normalized;
}

function clearManagedLocalRuntimeState() {
  setPref(STATE_PREF_KEY, "");
  notifyManagedLocalRuntimeStateChanged();
}

function getConfiguredVersionTag() {
  return getPref(VERSION_PREF_KEY) || DEFAULT_LOCAL_RUNTIME_VERSION;
}

function setConfiguredVersionTag(versionTag: string) {
  const normalized = normalizeString(versionTag) || DEFAULT_LOCAL_RUNTIME_VERSION;
  setPref(VERSION_PREF_KEY, normalized);
}

function buildManagedSkillRunnerBackend(baseUrl: string): BackendInstance {
  return {
    id: MANAGED_PROFILE_ID,
    type: "skillrunner",
    baseUrl,
    auth: {
      kind: "none",
    },
    defaults: {
      timeout_ms: 600000,
      headers: {},
    },
  };
}

function getCtlBridge() {
  return ctlBridgeFactory();
}

let ctlBridgeFactory = () => new SkillRunnerCtlBridge();
let releaseInstaller = installSkillRunnerRelease;
let skillRunnerModelCacheRefresher = refreshSkillRunnerModelCacheForBackend;

function shouldPersistLocalRuntimeLog(args: {
  operation: string;
  stage: string;
}) {
  const operation = normalizeString(args.operation);
  const stage = normalizeString(args.stage).toLowerCase();
  if (
    stage.startsWith("auto-ensure-") ||
    stage.startsWith("ensure-") ||
    stage.includes("heartbeat") ||
    stage.includes("reconcile")
  ) {
    return false;
  }
  if (!operation) {
    return false;
  }
  return (
    operation.startsWith("deploy-") ||
    operation === "oneclick-preflight" ||
    operation === "lease-acquire" ||
    operation.startsWith("uninstall-")
  );
}

export function shouldPersistLocalRuntimeLogForTests(args: {
  operation: string;
  stage: string;
}) {
  return shouldPersistLocalRuntimeLog(args);
}

export function setSkillRunnerCtlBridgeFactoryForTests(
  factory?: () => SkillRunnerCtlBridge,
) {
  ctlBridgeFactory = factory || (() => new SkillRunnerCtlBridge());
}

export function setSkillRunnerReleaseInstallerForTests(
  installer?: (
    args: {
      version: string;
      installRoot: string;
      repo: string;
      onProgress?: (progress: {
        stage: "download-checksum-complete" | "extract-complete";
        details?: Record<string, unknown>;
      }) => void;
      runCommand: (args: {
        command: string;
        args: string[];
        cwd?: string;
        timeoutMs?: number;
      }) => Promise<SkillRunnerCtlCommandResult>;
      keepTempOnSuccess?: boolean;
      keepTempOnFailure?: boolean;
    },
  ) => Promise<ReleaseInstallResult>,
) {
  releaseInstaller = installer || installSkillRunnerRelease;
}

export function setSkillRunnerModelCacheRefresherForTests(
  refresher?: typeof refreshSkillRunnerModelCacheForBackend,
) {
  skillRunnerModelCacheRefresher =
    refresher || refreshSkillRunnerModelCacheForBackend;
}

function appendLocalRuntimeLog(args: {
  level: "info" | "warn" | "error";
  operation: string;
  stage: string;
  message: string;
  details?: unknown;
  error?: unknown;
}) {
  appendSkillRunnerLocalDeployDebugLog({
    level: args.level,
    operation: args.operation,
    stage: args.stage,
    message: args.message,
    details: args.details,
    error: args.error,
  });
  if (!shouldPersistLocalRuntimeLog(args)) {
    return;
  }
  appendRuntimeLog({
    level: args.level,
    scope: "system",
    backendId: MANAGED_LOCAL_BACKEND_ID,
    backendType: "skillrunner",
    providerId: "skillrunner-local-runtime",
    component: "skillrunner-local-runtime",
    operation: args.operation,
    stage: args.stage,
    message: args.message,
    details: args.details,
    error: args.error,
  });
}

function buildLocalBridgeArgs(args: {
  state: ManagedLocalRuntimeState;
  host?: string;
  port?: number;
  portFallbackSpan?: number;
  waitSeconds?: number;
}): SkillRunnerLocalRuntimeBridgeArgs | null {
  const installDir = resolveEffectiveInstallDir(args.state);
  if (!installDir) {
    return null;
  }
  const localRootResolution = resolveManagedLocalRoot({
    state: args.state,
  });
  return {
    installDir,
    localRoot: localRootResolution.ok ? localRootResolution.localRoot : undefined,
    host: normalizeString(args.host) || undefined,
    port:
      typeof args.port === "number" && Number.isFinite(args.port)
        ? Math.floor(args.port)
        : undefined,
    portFallbackSpan:
      typeof args.portFallbackSpan === "number" && Number.isFinite(args.portFallbackSpan)
        ? Math.floor(args.portFallbackSpan)
        : undefined,
    waitSeconds:
      typeof args.waitSeconds === "number" && Number.isFinite(args.waitSeconds)
        ? Math.floor(args.waitSeconds)
        : undefined,
  };
}

function resolveEffectiveInstallDir(state: ManagedLocalRuntimeState | undefined) {
  const target = state || {};
  const configuredInstallDir = normalizeString(target.installDir);
  if (configuredInstallDir) {
    return configuredInstallDir;
  }
  const ctlPath = normalizeString(target.ctlPath);
  if (!ctlPath) {
    return "";
  }
  return getParentPath(getParentPath(ctlPath));
}

async function runLocalBridgeStatus(args: {
  bridge: SkillRunnerCtlBridge;
  state: ManagedLocalRuntimeState;
  host?: string;
  port?: number;
}): Promise<SkillRunnerCtlCommandResult> {
  const bridgeArgs = buildLocalBridgeArgs({
    state: args.state,
    host: args.host,
    port: args.port,
  });
  if (!bridgeArgs) {
    return {
      ok: false,
      exitCode: 2,
      message: "managed local runtime installDir is missing",
      stdout: "",
      stderr: "",
      details: {},
      command: "bridge-local-status",
      args: [],
    };
  }
  const bridgeCandidate = args.bridge as unknown as {
    statusLocalRuntime?: (bridgeArgs: SkillRunnerLocalRuntimeBridgeArgs) => Promise<SkillRunnerCtlCommandResult>;
    runCtlCommand?: (ctlArgs: {
      ctlPath: string;
      command: "status";
      mode?: "local" | "docker";
      port?: number;
    }) => Promise<SkillRunnerCtlCommandResult>;
  };
  if (typeof bridgeCandidate.statusLocalRuntime === "function") {
    return bridgeCandidate.statusLocalRuntime(bridgeArgs);
  }
  const ctlPath = normalizeString(args.state.ctlPath);
  if (ctlPath && typeof bridgeCandidate.runCtlCommand === "function") {
    return bridgeCandidate.runCtlCommand({
      ctlPath,
      command: "status",
      mode: "local",
      port: bridgeArgs.port,
    });
  }
  return {
    ok: false,
    exitCode: 2,
    message: "bridge statusLocalRuntime is unavailable",
    stdout: "",
    stderr: "",
    details: {},
    command: "bridge-local-status",
    args: [],
  };
}

async function runLocalBridgePreflight(args: {
  bridge: SkillRunnerCtlBridge;
  state: ManagedLocalRuntimeState;
  host?: string;
  port?: number;
  portFallbackSpan?: number;
}): Promise<SkillRunnerCtlCommandResult> {
  const bridgeArgs = buildLocalBridgeArgs({
    state: args.state,
    host: args.host,
    port: args.port,
    portFallbackSpan: args.portFallbackSpan,
  });
  if (!bridgeArgs) {
    return {
      ok: false,
      exitCode: 2,
      message: "managed local runtime installDir is missing",
      stdout: "",
      stderr: "",
      details: {},
      command: "bridge-local-preflight",
      args: [],
    };
  }
  const bridgeCandidate = args.bridge as unknown as {
    preflightLocalRuntime?: (bridgeArgs: SkillRunnerLocalRuntimeBridgeArgs) => Promise<SkillRunnerCtlCommandResult>;
    runCtlCommand?: (ctlArgs: {
      ctlPath: string;
      command: "preflight";
      host?: string;
      port?: number;
      portFallbackSpan?: number;
    }) => Promise<SkillRunnerCtlCommandResult>;
  };
  if (typeof bridgeCandidate.preflightLocalRuntime === "function") {
    return bridgeCandidate.preflightLocalRuntime(bridgeArgs);
  }
  const ctlPath = normalizeString(args.state.ctlPath);
  if (ctlPath && typeof bridgeCandidate.runCtlCommand === "function") {
    return bridgeCandidate.runCtlCommand({
      ctlPath,
      command: "preflight",
      host: bridgeArgs.host,
      port: bridgeArgs.port,
      portFallbackSpan: bridgeArgs.portFallbackSpan,
    });
  }
  return {
    ok: false,
    exitCode: 2,
    message: "bridge preflightLocalRuntime is unavailable",
    stdout: "",
    stderr: "",
    details: {},
    command: "bridge-local-preflight",
    args: [],
  };
}

async function runLocalBridgeUp(args: {
  bridge: SkillRunnerCtlBridge;
  state: ManagedLocalRuntimeState;
  host?: string;
  port?: number;
  portFallbackSpan?: number;
  waitSeconds?: number;
}): Promise<SkillRunnerCtlCommandResult> {
  const bridgeArgs = buildLocalBridgeArgs({
    state: args.state,
    host: args.host,
    port: args.port,
    portFallbackSpan: args.portFallbackSpan,
    waitSeconds: args.waitSeconds,
  });
  if (!bridgeArgs) {
    return {
      ok: false,
      exitCode: 2,
      message: "managed local runtime installDir is missing",
      stdout: "",
      stderr: "",
      details: {},
      command: "bridge-local-up",
      args: [],
    };
  }
  const bridgeCandidate = args.bridge as unknown as {
    upLocalRuntime?: (bridgeArgs: SkillRunnerLocalRuntimeBridgeArgs) => Promise<SkillRunnerCtlCommandResult>;
    runCtlCommand?: (ctlArgs: {
      ctlPath: string;
      command: "up";
      mode?: "local" | "docker";
      host?: string;
      port?: number;
      portFallbackSpan?: number;
      waitSeconds?: number;
    }) => Promise<SkillRunnerCtlCommandResult>;
  };
  if (typeof bridgeCandidate.upLocalRuntime === "function") {
    return bridgeCandidate.upLocalRuntime(bridgeArgs);
  }
  const ctlPath = normalizeString(args.state.ctlPath);
  if (ctlPath && typeof bridgeCandidate.runCtlCommand === "function") {
    return bridgeCandidate.runCtlCommand({
      ctlPath,
      command: "up",
      mode: "local",
      host: bridgeArgs.host,
      port: bridgeArgs.port,
      portFallbackSpan: bridgeArgs.portFallbackSpan,
      waitSeconds: bridgeArgs.waitSeconds,
    });
  }
  return {
    ok: false,
    exitCode: 2,
    message: "bridge upLocalRuntime is unavailable",
    stdout: "",
    stderr: "",
    details: {},
    command: "bridge-local-up",
    args: [],
  };
}

async function runLocalBridgeDown(args: {
  bridge: SkillRunnerCtlBridge;
  state: ManagedLocalRuntimeState;
}): Promise<SkillRunnerCtlCommandResult> {
  const bridgeArgs = buildLocalBridgeArgs({
    state: args.state,
  });
  if (!bridgeArgs) {
    return {
      ok: false,
      exitCode: 2,
      message: "managed local runtime installDir is missing",
      stdout: "",
      stderr: "",
      details: {},
      command: "bridge-local-down",
      args: [],
    };
  }
  const bridgeCandidate = args.bridge as unknown as {
    downLocalRuntime?: (bridgeArgs: SkillRunnerLocalRuntimeBridgeArgs) => Promise<SkillRunnerCtlCommandResult>;
    runCtlCommand?: (ctlArgs: {
      ctlPath: string;
      command: "down";
      mode?: "local" | "docker";
    }) => Promise<SkillRunnerCtlCommandResult>;
  };
  if (typeof bridgeCandidate.downLocalRuntime === "function") {
    return bridgeCandidate.downLocalRuntime(bridgeArgs);
  }
  const ctlPath = normalizeString(args.state.ctlPath);
  if (ctlPath && typeof bridgeCandidate.runCtlCommand === "function") {
    return bridgeCandidate.runCtlCommand({
      ctlPath,
      command: "down",
      mode: "local",
    });
  }
  return {
    ok: false,
    exitCode: 2,
    message: "bridge downLocalRuntime is unavailable",
    stdout: "",
    stderr: "",
    details: {},
    command: "bridge-local-down",
    args: [],
  };
}

async function runLocalBridgeDoctor(args: {
  bridge: SkillRunnerCtlBridge;
  state: ManagedLocalRuntimeState;
}): Promise<SkillRunnerCtlCommandResult> {
  const bridgeArgs = buildLocalBridgeArgs({
    state: args.state,
  });
  if (!bridgeArgs) {
    return {
      ok: false,
      exitCode: 2,
      message: "managed local runtime installDir is missing",
      stdout: "",
      stderr: "",
      details: {},
      command: "bridge-local-doctor",
      args: [],
    };
  }
  const bridgeCandidate = args.bridge as unknown as {
    doctorLocalRuntime?: (bridgeArgs: SkillRunnerLocalRuntimeBridgeArgs) => Promise<SkillRunnerCtlCommandResult>;
    runCtlCommand?: (ctlArgs: {
      ctlPath: string;
      command: "doctor";
    }) => Promise<SkillRunnerCtlCommandResult>;
  };
  if (typeof bridgeCandidate.doctorLocalRuntime === "function") {
    return bridgeCandidate.doctorLocalRuntime(bridgeArgs);
  }
  const ctlPath = normalizeString(args.state.ctlPath);
  if (ctlPath && typeof bridgeCandidate.runCtlCommand === "function") {
    return bridgeCandidate.runCtlCommand({
      ctlPath,
      command: "doctor",
    });
  }
  return {
    ok: false,
    exitCode: 2,
    message: "bridge doctorLocalRuntime is unavailable",
    stdout: "",
    stderr: "",
    details: {},
    command: "bridge-local-doctor",
    args: [],
  };
}

function resultFromCtl(
  stage: string,
  result: SkillRunnerCtlCommandResult,
): SkillRunnerLocalRuntimeActionResult {
  const stderrPreview = normalizeString(result.stderr).slice(0, 320);
  const stdoutPreview = normalizeString(result.stdout).slice(0, 320);
  const baseMessage = normalizeString(result.message) || "command finished";
  const diagnosticText = [
    baseMessage,
    normalizeString(result.stderr),
    normalizeString(result.stdout),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  const npmPathHint =
    stage === "deploy-ctl-install" &&
    !result.ok &&
    diagnosticText.includes("npm") &&
    (diagnosticText.includes("filenotfounderror") ||
      diagnosticText.includes("winerror 2") ||
      diagnosticText.includes("system cannot find the file specified"))
      ? "npm executable was not resolved inside runtime environment; verify Node/npm is in system PATH and rerun install."
      : "";
  const message = result.ok
    ? `[${stage}] ${baseMessage}`
    : `[${stage}] ${baseMessage} (exit=${result.exitCode}${
        stderrPreview ? `; stderr=${stderrPreview}` : ""
      }${npmPathHint ? `; hint=${npmPathHint}` : ""})`;
  return {
    ok: result.ok,
    stage,
    message,
    details: {
      exitCode: result.exitCode,
      command: result.command,
      args: result.args,
      stdoutPreview,
      stderrPreview,
      ...(npmPathHint ? { hint: npmPathHint } : {}),
      ...(isObjectRecord(result.details) ? result.details : {}),
    },
  };
}

type RuntimeDetailsFromCtl = {
  host?: string;
  port?: number;
  url?: string;
  requestedPort?: number;
  portFallbackSpan?: number;
  portFallbackUsed?: boolean;
  triedPorts?: number[];
};

function normalizeRuntimeDetailsFromCtl(details: unknown): RuntimeDetailsFromCtl | null {
  if (!isObjectRecord(details)) {
    return null;
  }
  const rawRequestedPort = details.requested_port ?? details.requestedPort;
  const rawPortFallbackSpan =
    details.port_fallback_span ?? details.portFallbackSpan;
  const rawPortFallbackUsed =
    details.port_fallback_used ?? details.portFallbackUsed;
  const rawTriedPorts = details.tried_ports ?? details.triedPorts;
  const host = normalizeString(details.host);
  const url = normalizeUrl(details.url);
  const parsedPort = normalizePort(details.port, -1);
  const parsedRequestedPort = normalizePort(rawRequestedPort, -1);
  const parsedFallbackSpan = normalizeNonNegativeInteger(rawPortFallbackSpan, -1);
  const normalized: RuntimeDetailsFromCtl = {};
  if (host) {
    normalized.host = host;
  }
  if (parsedPort > 0) {
    normalized.port = parsedPort;
  }
  if (url) {
    normalized.url = url;
  }
  if (parsedRequestedPort > 0) {
    normalized.requestedPort = parsedRequestedPort;
  }
  if (parsedFallbackSpan >= 0) {
    normalized.portFallbackSpan = parsedFallbackSpan;
  }
  if (typeof rawPortFallbackUsed === "boolean") {
    normalized.portFallbackUsed = rawPortFallbackUsed;
  }
  const normalizedTriedPorts = normalizeNumberArray(rawTriedPorts);
  if (normalizedTriedPorts.length > 0) {
    normalized.triedPorts = normalizedTriedPorts;
  }
  return normalized;
}

function applyRuntimeEndpointFromDetails(
  state: ManagedLocalRuntimeState,
  details: unknown,
) {
  const endpoint = resolveRuntimeEndpoint(state);
  const parsed = normalizeRuntimeDetailsFromCtl(details);
  if (!parsed) {
    return state;
  }
  const nextHost = normalizeString(parsed.host) || endpoint.host;
  const nextPort = normalizePort(parsed.port, endpoint.port);
  const nextRequestedPort = normalizePort(
    parsed.requestedPort,
    state.requestedPort || endpoint.requestedPort,
  );
  const nextPortFallbackSpan = normalizePortFallbackSpan(
    typeof parsed.portFallbackSpan === "number"
      ? parsed.portFallbackSpan
      : state.portFallbackSpan,
  );
  const nextUrl = normalizeUrl(parsed.url) || `${buildBaseUrl(nextHost, nextPort)}/`;
  const nextState = writeManagedLocalRuntimeState({
    ...state,
    baseUrl: buildBaseUrl(nextHost, nextPort),
    runtimeHost: nextHost,
    runtimePort: nextPort,
    runtimeUrl: nextUrl,
    requestedPort: nextRequestedPort,
    portFallbackSpan: nextPortFallbackSpan,
    portFallbackUsed:
      typeof parsed.portFallbackUsed === "boolean"
        ? parsed.portFallbackUsed
        : state.portFallbackUsed,
    triedPorts: parsed.triedPorts || state.triedPorts,
  });
  return nextState;
}

function resolveManagedBaseUrl(state: ManagedLocalRuntimeState) {
  const endpoint = resolveRuntimeEndpoint(state);
  return buildBaseUrl(endpoint.host, endpoint.port);
}

async function postLease(path: string, body?: Record<string, unknown>): Promise<LeaseHttpResult> {
  const state = readManagedLocalRuntimeState();
  const baseUrl = resolveManagedBaseUrl(state);
  const fetchImpl = getGlobalFetch();
  if (typeof fetchImpl !== "function") {
    return {
      ok: false,
      error: "fetch unavailable in current runtime",
    };
  }
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body || {}),
    });
    const text = await response.text();
    let parsedBody: Record<string, unknown> | undefined;
    if (text.trim()) {
      try {
        const parsed = JSON.parse(text);
        if (isObjectRecord(parsed)) {
          parsedBody = parsed;
        }
      } catch {
        parsedBody = {
          raw: text,
        };
      }
    }
    return {
      ok: response.ok,
      status: response.status,
      body: parsedBody,
    };
  } catch (error) {
    return {
      ok: false,
      error: normalizeString(
        error && typeof error === "object" && "message" in error
          ? (error as { message?: unknown }).message
          : error,
      ),
    };
  }
}

let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
let heartbeatRunning = false;
let heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_SECONDS * 1000;
let statusReconcileTimer: ReturnType<typeof setInterval> | undefined;
let statusReconcileRunning = false;
let autoEnsureTimer: ReturnType<typeof setInterval> | undefined;
let autoEnsureRunning = false;
let runtimeControlLock: Promise<void> = Promise.resolve();
let monitoringState: MonitoringState = "inactive";
let runtimeActionInFlight = "";
let backgroundInFlightAction = "";

function getEffectiveInFlightAction() {
  return normalizeString(runtimeActionInFlight) || normalizeString(backgroundInFlightAction);
}

function setBackgroundInFlightAction(action: string) {
  const next = normalizeString(action);
  if (backgroundInFlightAction === next) {
    return;
  }
  backgroundInFlightAction = next;
  notifyManagedLocalRuntimeStateChanged();
}

function hasRuntimeInfo(state: ManagedLocalRuntimeState | undefined) {
  const target = state || {};
  return (
    !!normalizeString(target.managedBackendId) &&
    !!resolveEffectiveInstallDir(target)
  );
}

function setMonitoringState(next: MonitoringState) {
  if (monitoringState === next) {
    return;
  }
  monitoringState = next;
  notifyManagedLocalRuntimeStateChanged();
}

function clearStatusReconcileTimer() {
  if (!statusReconcileTimer) {
    return;
  }
  clearInterval(statusReconcileTimer);
  statusReconcileTimer = undefined;
  if (!heartbeatTimer) {
    setMonitoringState("inactive");
  } else {
    setMonitoringState("heartbeat");
  }
}

function makeActionConflictResult(action: string): SkillRunnerLocalRuntimeActionResult {
  const inFlightAction = getEffectiveInFlightAction() || "unknown";
  return {
    ok: false,
    conflict: true,
    stage: `${action}-conflict`,
    message: `runtime action is already running: ${inFlightAction}`,
    details: {
      inFlightAction,
    },
  };
}

async function withRuntimeActionMutex(
  action: string,
  runner: () => Promise<SkillRunnerLocalRuntimeActionResult>,
) {
  if (getEffectiveInFlightAction()) {
    return makeActionConflictResult(action);
  }
  runtimeActionInFlight = action;
  notifyManagedLocalRuntimeStateChanged();
  try {
    return await withRuntimeControlLock(runner);
  } finally {
    runtimeActionInFlight = "";
    notifyManagedLocalRuntimeStateChanged();
  }
}

function triggerManagedRuntimeAutoEnsureTickAsync() {
  if (suppressAutoEnsureTriggerForTests) {
    return false;
  }
  if (pendingAutoEnsureTickTimer) {
    clearTimeout(pendingAutoEnsureTickTimer);
  }
  pendingAutoEnsureTickTimer = setTimeout(() => {
    pendingAutoEnsureTickTimer = undefined;
    void runManagedRuntimeAutoEnsureTick();
  }, 0);
  return true;
}

function clearHeartbeatTimer() {
  if (!heartbeatTimer) {
    return;
  }
  clearInterval(heartbeatTimer);
  heartbeatTimer = undefined;
  if (!statusReconcileTimer) {
    setMonitoringState("inactive");
  }
}

function clearAutoEnsureTimer() {
  if (!autoEnsureTimer) {
    return;
  }
  clearInterval(autoEnsureTimer);
  autoEnsureTimer = undefined;
}

function withRuntimeControlLock<T>(runner: () => Promise<T>): Promise<T> {
  const queued = runtimeControlLock.then(runner, runner);
  runtimeControlLock = queued.then(
    () => undefined,
    () => undefined,
  );
  return queued;
}

async function acquireLeaseIfNeeded() {
  const state = readManagedLocalRuntimeState();
  const lease = state.lease || {};
  if (lease.stoppedByConflict) {
    return {
      ok: false,
      state,
      reason: "lease conflict already marked",
    };
  }
  if (lease.acquired === true && normalizeString(lease.leaseId)) {
    return {
      ok: true,
      state,
      reason: "lease already acquired",
    };
  }
  const response = await postLease("/v1/local-runtime/lease/acquire", {
    owner_id: LEASE_OWNER_ID,
    metadata: {
      client: LEASE_OWNER_ID,
    },
  });
  if (response.status === 409) {
    state.lease = {
      ...lease,
      acquired: false,
      stoppedByConflict: true,
      leaseId: undefined,
      lastError: "lease conflict (409)",
    };
    writeManagedLocalRuntimeState(state);
    appendLocalRuntimeLog({
      level: "warn",
      operation: "lease-acquire",
      stage: "local-lease-conflict",
      message: "local runtime lease conflict detected",
      details: {
        status: response.status,
      },
    });
    return {
      ok: false,
      state: readManagedLocalRuntimeState(),
      reason: "lease conflict (409)",
    };
  }
  if (!response.ok) {
    state.lease = {
      ...lease,
      acquired: false,
      leaseId: undefined,
      lastError:
        normalizeString(response.body?.detail) ||
        response.error ||
        `lease acquire failed (${String(response.status || "unknown")})`,
    };
    writeManagedLocalRuntimeState(state);
    appendLocalRuntimeLog({
      level: "warn",
      operation: "lease-acquire",
      stage: "local-lease-acquire-failed",
      message: "local runtime lease acquire failed",
      details: {
        status: response.status,
        error: state.lease.lastError,
      },
    });
    return {
      ok: false,
      state: readManagedLocalRuntimeState(),
      reason: normalizeString(state.lease.lastError) || "lease acquire failed",
    };
  }
  const leaseId = normalizeString(response.body?.lease_id);
  if (!leaseId) {
    state.lease = {
      ...lease,
      acquired: false,
      leaseId: undefined,
      lastError: "lease acquire succeeded but lease_id is missing",
    };
    writeManagedLocalRuntimeState(state);
    appendLocalRuntimeLog({
      level: "warn",
      operation: "lease-acquire",
      stage: "local-lease-acquire-invalid-payload",
      message: "local runtime lease acquire response missing lease_id",
    });
    return {
      ok: false,
      state: readManagedLocalRuntimeState(),
      reason: "lease_id missing",
    };
  }
  const heartbeatIntervalSeconds = normalizeHeartbeatIntervalSeconds(
    response.body?.heartbeat_interval_seconds,
  );
  state.lease = {
    ...lease,
    acquired: true,
    stoppedByConflict: false,
    leaseId,
    heartbeatIntervalSeconds,
    lastAcquireAt: nowIso(),
    lastError: undefined,
  };
  writeManagedLocalRuntimeState(state);
  ensureHeartbeatLoop(heartbeatIntervalSeconds);
  appendLocalRuntimeLog({
    level: "info",
    operation: "lease-acquire",
    stage: "local-lease-acquired",
    message: "local runtime lease acquired",
    details: {
      leaseId,
      heartbeatIntervalSeconds,
    },
  });
  return {
    ok: true,
    state: readManagedLocalRuntimeState(),
    reason: "",
  };
}

async function heartbeatLease() {
  if (heartbeatRunning) {
    return;
  }
  heartbeatRunning = true;
  try {
    const state = readManagedLocalRuntimeState();
    const lease = state.lease || {};
    if (lease.stoppedByConflict) {
      return;
    }
    if (!lease.acquired) {
      await acquireLeaseIfNeeded();
      return;
    }
    const leaseId = normalizeString(lease.leaseId);
    if (!leaseId) {
      state.lease = {
        ...lease,
        acquired: false,
        lastError: "lease heartbeat skipped because lease_id is missing",
      };
      writeManagedLocalRuntimeState(state);
      void reconcileAfterHeartbeatFail("lease_id missing during heartbeat");
      await acquireLeaseIfNeeded();
      return;
    }
    const response = await postLease("/v1/local-runtime/lease/heartbeat", {
      lease_id: leaseId,
    });
    if (response.status === 404) {
      state.lease = {
        ...lease,
        acquired: false,
        leaseId: undefined,
        lastError: "lease heartbeat lost (404), reacquire",
      };
      writeManagedLocalRuntimeState(state);
      void reconcileAfterHeartbeatFail("heartbeat 404");
      await acquireLeaseIfNeeded();
      return;
    }
    if (response.status === 409) {
      state.lease = {
        ...lease,
        acquired: false,
        stoppedByConflict: true,
        leaseId: undefined,
        lastError: "lease conflict (409)",
      };
      writeManagedLocalRuntimeState(state);
      appendLocalRuntimeLog({
        level: "warn",
        operation: "lease-heartbeat",
        stage: "local-lease-conflict",
        message: "local runtime lease heartbeat conflict",
      });
      void reconcileAfterHeartbeatFail("heartbeat 409 conflict");
      return;
    }
    if (!response.ok) {
      state.lease = {
        ...lease,
        acquired: false,
        leaseId: undefined,
        lastError:
          normalizeString(response.body?.detail) ||
          response.error ||
          `lease heartbeat failed (${String(response.status || "unknown")})`,
      };
      writeManagedLocalRuntimeState(state);
      appendLocalRuntimeLog({
        level: "warn",
        operation: "lease-heartbeat",
        stage: "local-lease-heartbeat-failed",
        message: "local runtime lease heartbeat failed",
        details: {
          status: response.status,
          error: state.lease.lastError,
        },
      });
      void reconcileAfterHeartbeatFail(
        normalizeString(state.lease.lastError) || "heartbeat failed",
      );
      return;
    }
    state.lease = {
      ...lease,
      acquired: true,
      leaseId,
      lastHeartbeatAt: nowIso(),
      lastError: undefined,
    };
    writeManagedLocalRuntimeState(state);
    if (statusReconcileTimer) {
      clearStatusReconcileTimer();
      applyRuntimeStatePatch({
        state: readManagedLocalRuntimeState(),
        runtimeState: "running",
        runtimeError: "",
      });
    }
  } finally {
    heartbeatRunning = false;
  }
}

function ensureHeartbeatLoop(intervalSeconds?: number) {
  const nextIntervalMs =
    normalizeHeartbeatIntervalSeconds(intervalSeconds) * 1000;
  if (heartbeatTimer && heartbeatIntervalMs === nextIntervalMs) {
    return;
  }
  clearHeartbeatTimer();
  heartbeatIntervalMs = nextIntervalMs;
  heartbeatTimer = setInterval(() => {
    void heartbeatLease();
  }, heartbeatIntervalMs);
  setMonitoringState("heartbeat");
  const timerLike = heartbeatTimer as unknown as { unref?: () => void };
  if (typeof timerLike.unref === "function") {
    timerLike.unref();
  }
}

async function runHeartbeatFailStatusProbe() {
  const state = readManagedLocalRuntimeState();
  const installDir = resolveEffectiveInstallDir(state);
  if (!installDir) {
    return {
      ok: false,
      status: "error",
      message: "managed local runtime installDir is missing",
    } as const;
  }
  const endpoint = resolveRuntimeEndpoint(state);
  const bridge = getCtlBridge();
  const result = await runLocalBridgeStatus({
    bridge,
    state,
    host: endpoint.host,
    port: endpoint.port,
  });
  const statusValue = normalizeString(result.details?.status).toLowerCase();
  if (result.ok && statusValue === "stopped") {
    return {
      ok: true,
      status: "stopped",
      message: "runtime stopped",
    } as const;
  }
  if (result.ok && statusValue === "running") {
    return {
      ok: true,
      status: "running",
      message: "runtime running",
    } as const;
  }
  return {
    ok: false,
    status: "error",
    message:
      normalizeString(result.message) ||
      `status probe failed (exitCode=${result.exitCode})`,
  } as const;
}

async function runStatusReconcileTick() {
  if (statusReconcileRunning) {
    return;
  }
  statusReconcileRunning = true;
  try {
    const probe = await runHeartbeatFailStatusProbe();
    const latestState = readManagedLocalRuntimeState();
    if (probe.status === "stopped") {
      clearStatusReconcileTimer();
      clearHeartbeatTimer();
      applyRuntimeStatePatch({
        state: latestState,
        runtimeState: "stopped",
        runtimeError: "",
      });
      emitLocalRuntimeToast("runtime-abnormal-stop");
      return;
    }
    if (probe.status === "running") {
      applyRuntimeStatePatch({
        state: latestState,
        runtimeState: "reconciling_after_heartbeat_fail",
        runtimeError: "",
      });
      return;
    }
    clearStatusReconcileTimer();
    applyRuntimeStatePatch({
      state: latestState,
      runtimeState: "degraded",
      runtimeError: normalizeString(probe.message) || "status reconcile failed",
    });
  } finally {
    statusReconcileRunning = false;
  }
}

function ensureStatusReconcileLoop() {
  if (statusReconcileTimer) {
    return;
  }
  const state = readManagedLocalRuntimeState();
  const intervalMs = Math.max(
    1000,
    resolveHeartbeatIntervalMs(state.lease) || DEFAULT_HEARTBEAT_INTERVAL_SECONDS * 1000,
  );
  statusReconcileTimer = setInterval(() => {
    void runStatusReconcileTick();
  }, intervalMs);
  setMonitoringState("reconciling");
  const timerLike = statusReconcileTimer as unknown as { unref?: () => void };
  if (typeof timerLike.unref === "function") {
    timerLike.unref();
  }
  void runStatusReconcileTick();
}

async function reconcileAfterHeartbeatFail(reason: string) {
  appendLocalRuntimeLog({
    level: "warn",
    operation: "heartbeat-fail-reconcile",
    stage: "heartbeat-fail-reconcile",
    message: "heartbeat failed; reconciling runtime state",
    details: {
      reason,
    },
  });
  const firstProbe = await runHeartbeatFailStatusProbe();
  const state = readManagedLocalRuntimeState();
  if (firstProbe.status === "stopped") {
    clearStatusReconcileTimer();
    clearHeartbeatTimer();
    applyRuntimeStatePatch({
      state,
      runtimeState: "stopped",
      runtimeError: "",
    });
    emitLocalRuntimeToast("runtime-abnormal-stop");
    return;
  }
  if (firstProbe.status === "running") {
    applyRuntimeStatePatch({
      state,
      runtimeState: "reconciling_after_heartbeat_fail",
      runtimeError: "",
    });
    ensureStatusReconcileLoop();
    return;
  }
  applyRuntimeStatePatch({
    state,
    runtimeState: "degraded",
    runtimeError: normalizeString(firstProbe.message) || "status probe failed",
  });
  ensureStatusReconcileLoop();
}

async function createManagedProfileOnDeploy(
  state: ManagedLocalRuntimeState,
  baseUrl: string,
) {
  const message = "";
  const loaded = await loadBackendsRegistry();
  if (loaded.fatalError) {
    return {
      ok: false,
      message: loaded.fatalError,
      conflict: false,
    };
  }
  const existing = loaded.backends.find((entry) => entry.id === MANAGED_PROFILE_ID);
  const managedMarker = normalizeString(state.managedBackendId);
  if (existing && managedMarker !== MANAGED_PROFILE_ID) {
    return {
      ok: false,
      message:
        `backend profile '${MANAGED_PROFILE_ID}' already exists and is not managed by local runtime bootstrap`,
      conflict: true,
    };
  }
  const mergedBackends = existing
    ? loaded.backends.map((entry) =>
        entry.id === MANAGED_PROFILE_ID ? buildManagedSkillRunnerBackend(baseUrl) : entry,
      )
    : [...loaded.backends, buildManagedSkillRunnerBackend(baseUrl)];
  setPref(
    BACKENDS_CONFIG_PREF_KEY,
    JSON.stringify(createBackendsPrefsDocument(mergedBackends)),
  );
  return {
    ok: true,
    message,
    conflict: false,
  };
}

async function syncManagedProfileIfExists(baseUrl: string) {
  const loaded = await loadBackendsRegistry();
  if (loaded.fatalError) {
    return {
      ok: false,
      message: loaded.fatalError,
      conflict: false,
    };
  }
  const existing = loaded.backends.find((entry) => entry.id === MANAGED_PROFILE_ID);
  if (!existing) {
    return {
      ok: false,
      message: `managed backend profile '${MANAGED_PROFILE_ID}' is missing`,
      conflict: false,
    };
  }
  const mergedBackends = loaded.backends.map((entry) =>
    entry.id === MANAGED_PROFILE_ID ? buildManagedSkillRunnerBackend(baseUrl) : entry,
  );
  setPref(
    BACKENDS_CONFIG_PREF_KEY,
    JSON.stringify(createBackendsPrefsDocument(mergedBackends)),
  );
  return {
    ok: true,
    message: "",
    conflict: false,
  };
}

async function removeManagedProfileIfPresent() {
  const loaded = await loadBackendsRegistry();
  if (loaded.fatalError) {
    return {
      ok: false,
      message: loaded.fatalError,
    };
  }
  const existing = loaded.backends.find((entry) => entry.id === MANAGED_PROFILE_ID);
  if (!existing) {
    return {
      ok: true,
      message: "",
    };
  }
  const nextBackends = loaded.backends.filter((entry) => entry.id !== MANAGED_PROFILE_ID);
  setPref(
    BACKENDS_CONFIG_PREF_KEY,
    JSON.stringify(createBackendsPrefsDocument(nextBackends)),
  );
  return {
    ok: true,
    message: "",
  };
}

function isStatusRunning(result: SkillRunnerCtlCommandResult) {
  const status = normalizeString(result.details?.status).toLowerCase();
  if (status === "running") {
    return true;
  }
  return false;
}

function resolveLeaseViewState(lease: LeaseState | undefined): LeaseViewState {
  if (lease?.acquired) {
    return "acquired";
  }
  if (lease?.stoppedByConflict) {
    return "conflict";
  }
  if (normalizeString(lease?.lastError)) {
    return "failed";
  }
  return "pending";
}

function applyRuntimeStatePatch(args: {
  state: ManagedLocalRuntimeState;
  runtimeState: RuntimeState;
  runtimeFailureCount?: number;
  runtimeError?: string;
}) {
  const nextState = writeManagedLocalRuntimeState({
    ...args.state,
    runtimeState: args.runtimeState,
    runtimeFailureCount:
      typeof args.runtimeFailureCount === "number"
        ? Math.max(0, Math.floor(args.runtimeFailureCount))
        : args.state.runtimeFailureCount,
    lastRuntimeError: normalizeString(args.runtimeError) || undefined,
    lastRuntimeStatusAt: nowIso(),
  });
  return nextState;
}

async function pollStatusUntilRunning(args: {
  bridge: SkillRunnerCtlBridge;
  state: ManagedLocalRuntimeState;
  host?: string;
  port: number;
  attempts?: number;
  intervalMs?: number;
}) {
  const attempts =
    typeof args.attempts === "number" && Number.isFinite(args.attempts) && args.attempts > 0
      ? Math.floor(args.attempts)
      : RUNTIME_STATUS_POLL_ATTEMPTS;
  const intervalMs =
    typeof args.intervalMs === "number" && Number.isFinite(args.intervalMs) && args.intervalMs > 0
      ? Math.floor(args.intervalMs)
      : RUNTIME_STATUS_POLL_INTERVAL_MS;
  let lastStatus: SkillRunnerCtlCommandResult | undefined;
  const statusTrail: string[] = [];
  for (let index = 0; index < attempts; index++) {
    const status = await runLocalBridgeStatus({
      bridge: args.bridge,
      state: args.state,
      host: args.host,
      port: args.port,
    });
    lastStatus = status;
    statusTrail.push(
      normalizeString(status.details?.status || status.message || `exit-${status.exitCode}`),
    );
    if (status.ok && isStatusRunning(status)) {
      return {
        ok: true as const,
        status,
        attempts: index + 1,
        trail: statusTrail,
      };
    }
    if (index < attempts - 1) {
      await sleepMs(intervalMs);
    }
  }
  return {
    ok: false as const,
    status: lastStatus,
    attempts,
    trail: statusTrail,
  };
}

async function tryAcquireLeaseOnRunning() {
  const acquire = await acquireLeaseIfNeeded();
  const nextState = acquire.state || readManagedLocalRuntimeState();
  if (acquire.ok) {
    ensureHeartbeatLoop(nextState.lease?.heartbeatIntervalSeconds);
  }
  return {
    ok: acquire.ok,
    state: nextState,
    reason: acquire.reason,
  };
}

async function runManagedRuntimeAutoEnsureTick(): Promise<AutoEnsureTickResult> {
  if (autoEnsureRunning) {
    return {
      ok: true,
      stage: "auto-ensure-skip-running",
      message: "managed local runtime auto ensure already running",
    };
  }
  autoEnsureRunning = true;
  try {
    const state = readManagedLocalRuntimeState();
    if (!normalizeString(state.managedBackendId) || !resolveEffectiveInstallDir(state)) {
      return {
        ok: true,
        stage: "auto-ensure-skip-not-configured",
        message: "managed local runtime is not configured",
      };
    }
    if (isAutoStartPaused()) {
      return {
        ok: true,
        stage: "auto-ensure-skip-paused",
        message: "managed local runtime auto start is paused",
      };
    }
    const backendId = normalizeString(state.managedBackendId);
    const ensureResult = await ensureManagedLocalRuntimeForBackend(backendId, {
      backgroundInFlightAction: "auto-ensure-starting",
    });
    return {
      ok: ensureResult.ok,
      stage: ensureResult.stage,
      message: ensureResult.message,
    };
  } finally {
    autoEnsureRunning = false;
  }
}

export async function runManagedRuntimeAutoEnsureTickForTests() {
  return runManagedRuntimeAutoEnsureTick();
}

export async function runManagedRuntimeStartupPreflightProbe(): Promise<SkillRunnerLocalRuntimeActionResult> {
  return withRuntimeControlLock(async () => {
    if (isAutoStartPaused()) {
      return {
        ok: true,
        stage: "startup-preflight-skip-paused",
        message: "startup preflight skipped because auto-start is disabled",
      };
    }
    const state = readManagedLocalRuntimeState();
    if (!hasRuntimeInfo(state)) {
      setAutoStartEnabledInSession(false);
      return {
        ok: true,
        stage: "startup-preflight-skip-no-runtime-info",
        message: "startup preflight skipped because runtime info is missing",
      };
    }
    const installDir = resolveEffectiveInstallDir(state);
    if (!installDir) {
      setAutoStartEnabledInSession(false);
      return {
        ok: false,
        stage: "startup-preflight-missing-install-dir",
        message: "startup preflight skipped because installDir is missing",
      };
    }
    const endpoint = resolveRuntimeEndpoint(state);
    const bridge = getCtlBridge();
    const preflight = await runLocalBridgePreflight({
      bridge,
      state,
      host: endpoint.host,
      port: endpoint.requestedPort,
      portFallbackSpan: endpoint.portFallbackSpan,
    });
    if (preflight.ok) {
      setAutoStartEnabledInSession(true);
      return {
        ok: true,
        stage: "startup-preflight-ok",
        message: "startup preflight succeeded",
        details: preflight.details,
      };
    }
    setAutoStartEnabledInSession(false);
    return {
      ok: false,
      stage: "startup-preflight-failed",
      message: normalizeString(preflight.message) || "startup preflight failed",
      details: preflight.details,
    };
  });
}

export async function planLocalRuntimeOneclick(args?: {
  version?: string;
}): Promise<SkillRunnerLocalRuntimeActionResult> {
  return withRuntimeControlLock(async () => {
    const version = normalizeString(args?.version) || getConfiguredVersionTag();
    setConfiguredVersionTag(version);
    const installLayout = buildManagedInstallLayoutDetails();
    const state = readManagedLocalRuntimeState();
    if (!hasRuntimeInfo(state)) {
      setAutoStartEnabledInSession(false);
      return {
        ok: true,
        stage: "oneclick-plan-deploy",
        message: "one-click plan selects deploy because runtime info is missing",
        details: {
          plannedAction: "deploy",
          reason: "no-runtime-info",
          version,
          installLayout,
        },
      };
    }
    const installDir = resolveEffectiveInstallDir(state);
    if (!installDir) {
      setAutoStartEnabledInSession(false);
      return {
        ok: true,
        stage: "oneclick-plan-deploy",
        message: "one-click plan selects deploy because installDir is missing",
        details: {
          plannedAction: "deploy",
          reason: "missing-install-dir",
          version,
          installLayout,
        },
      };
    }
    const endpoint = resolveRuntimeEndpoint(state);
    const bridge = getCtlBridge();
    const preflight = await runLocalBridgePreflight({
      bridge,
      state,
      host: endpoint.host,
      port: endpoint.requestedPort,
      portFallbackSpan: endpoint.portFallbackSpan,
    });
    if (preflight.ok) {
      setAutoStartEnabledInSession(true);
      return {
        ok: true,
        stage: "oneclick-plan-start",
        message: "one-click plan selects start",
        details: {
          plannedAction: "start",
          version,
          preflight: preflight.details,
        },
      };
    }
    setAutoStartEnabledInSession(false);
    return {
      ok: true,
      stage: "oneclick-plan-deploy",
      message: "one-click plan selects deploy after preflight failure",
      details: {
        plannedAction: "deploy",
        reason: "preflight-failed",
        version,
        preflight: preflight.details,
        preflightMessage: preflight.message,
        installLayout,
      },
    };
  });
}

export function startManagedLocalRuntimeAutoEnsureLoop() {
  if (autoEnsureTimer) {
    return;
  }
  autoEnsureTimer = setInterval(() => {
    void runManagedRuntimeAutoEnsureTick();
  }, AUTO_ENSURE_INTERVAL_MS);
  const timerLike = autoEnsureTimer as unknown as { unref?: () => void };
  if (typeof timerLike.unref === "function") {
    timerLike.unref();
  }
  void runManagedRuntimeAutoEnsureTick();
}

export function stopManagedLocalRuntimeAutoEnsureLoop() {
  clearAutoEnsureTimer();
}

export async function deployAndConfigureLocalSkillRunner(args?: {
  version?: string;
  forcedBranch?: "start" | "deploy";
}): Promise<SkillRunnerLocalRuntimeActionResult> {
  return withRuntimeActionMutex("oneclick-deploy-start", async () => {
    const bridge = getCtlBridge();
    const version = normalizeString(args?.version) || getConfiguredVersionTag();
    const forcedBranch = normalizeString(args?.forcedBranch).toLowerCase() as
      | OneclickPlannedAction
      | "";
    const forceDeploy = forcedBranch === "deploy";
    const forceStart = forcedBranch === "start";
    resetSkillRunnerLocalDeployDebugSession({
      version,
      trigger: "deploy",
    });
    const installRoot = resolveDefaultInstallRoot();
    setConfiguredVersionTag(version);
    const stateBeforeOneClick = readManagedLocalRuntimeState();
    try {
      if (!forceDeploy && hasRuntimeInfo(stateBeforeOneClick)) {
      const endpoint = resolveRuntimeEndpoint(stateBeforeOneClick);
      const preflight = await runLocalBridgePreflight({
        bridge,
        state: stateBeforeOneClick,
        host: endpoint.host,
        port: endpoint.requestedPort,
        portFallbackSpan: endpoint.portFallbackSpan,
      });
      if (preflight.ok) {
        setAutoStartEnabledInSession(true);
        const upResult = await runLocalBridgeUp({
          bridge,
          state: stateBeforeOneClick,
          host: endpoint.host,
          port: endpoint.requestedPort,
          portFallbackSpan: endpoint.portFallbackSpan,
        });
        if (!upResult.ok) {
          return resultFromCtl("oneclick-up", upResult);
        }
        let nextState = applyRuntimeEndpointFromDetails(
          readManagedLocalRuntimeState(),
          upResult.details,
        );
        const endpointAfterUp = resolveRuntimeEndpoint(nextState);
        const statusPoll = await pollStatusUntilRunning({
          bridge,
          state: nextState,
          host: endpointAfterUp.host,
          port: endpointAfterUp.port,
        });
        if (!statusPoll.ok) {
          nextState = applyRuntimeStatePatch({
            state: nextState,
            runtimeState: "degraded",
            runtimeFailureCount: (nextState.runtimeFailureCount || 0) + 1,
            runtimeError: normalizeString(
              statusPoll.status?.details?.status ||
                statusPoll.status?.message ||
                "runtime not running after up",
            ),
          });
          return {
            ok: false,
            stage: "oneclick-status",
            message: `runtime status is not running: ${normalizeString(
              statusPoll.status?.details?.status ||
                statusPoll.status?.message ||
                "unknown",
            )}`,
            details: {
              statusTrail: statusPoll.trail,
              statusAttempts: statusPoll.attempts,
              preflight: preflight.details,
            },
          };
        }
        nextState = applyRuntimeStatePatch({
          state: nextState,
          runtimeState: "running",
          runtimeFailureCount: 0,
          runtimeError: "",
        });
        const profileSyncResult = await syncManagedProfileIfExists(
          resolveManagedBaseUrl(nextState),
        );
        if (!profileSyncResult.ok) {
          return {
            ok: false,
            stage: "oneclick-configure-profile",
            message: profileSyncResult.message,
            conflict: profileSyncResult.conflict,
          };
        }
        const leaseAcquire = await tryAcquireLeaseOnRunning();
        nextState = leaseAcquire.state;
        if (!leaseAcquire.ok) {
          return {
            ok: false,
            stage: "oneclick-lease",
            message: normalizeString(leaseAcquire.reason) || "lease acquire failed",
            details: {
              preflight: preflight.details,
            },
          };
        }
        const finalEndpoint = resolveRuntimeEndpoint(nextState);
        triggerSilentManagedModelCacheRefresh(nextState);
        triggerManagedLocalRuntimePostUpTaskReconcile(nextState);
        emitLocalRuntimeToast("runtime-up");
        return {
          ok: true,
          stage: "oneclick-start-complete",
          message: "one-click start succeeded with existing runtime info",
          details: {
            runtimeState: nextState.runtimeState,
            leaseState: resolveLeaseViewState(nextState.lease),
            baseUrl: resolveManagedBaseUrl(nextState),
            actualHost: finalEndpoint.host,
            actualPort: finalEndpoint.port,
            actualUrl: finalEndpoint.url,
            preflight: preflight.details,
          },
        };
      }
      setAutoStartEnabledInSession(false);
      if (forceStart) {
        return {
          ok: false,
          stage: "oneclick-preflight",
          message: normalizeString(preflight.message) || "one-click preflight failed",
          details: {
            preflight: preflight.details,
          },
        };
      }
      appendLocalRuntimeLog({
        level: "warn",
        operation: "oneclick-preflight",
        stage: "oneclick-preflight-failed-fallback-deploy",
        message: "one-click preflight failed, fallback to deploy",
        details: {
          message: preflight.message,
          details: preflight.details,
        },
      });
      } else {
        if (forceStart) {
          return {
            ok: false,
            stage: "oneclick-start-missing-runtime",
            message: "forced start requested but runtime info is missing",
          };
        }
        setAutoStartEnabledInSession(false);
      }
      setActionProgress({
        action: "deploy",
        current: 1,
        total: 5,
        stage: "deploy-release-assets-probe",
        label: resolveDeployProgressLabel("deploy-release-assets-probe"),
      });
      const releaseProbe = await probeReleaseAssets(version);
  appendLocalRuntimeLog({
    level:
      !releaseProbe.checked || releaseProbe.ok ? "info" : "warn",
    operation: "deploy-release-assets-probe",
    stage: "deploy-release-assets-probe",
    message:
      !releaseProbe.checked
        ? "release asset probe skipped"
        : releaseProbe.ok
          ? "release asset probe passed"
          : "release asset probe failed",
    details: {
      version,
      checked: releaseProbe.checked,
      results: releaseProbe.results,
    },
  });
  if (releaseProbe.checked && !releaseProbe.ok) {
    return {
      ok: false,
      stage: "deploy-release-assets",
      message: "release assets are not reachable from GitHub",
      details: {
        version,
        results: releaseProbe.results,
      },
    };
  }
      const install = await releaseInstaller({
      version,
      installRoot,
      repo: DEFAULT_SKILL_RUNNER_RELEASE_REPO,
      onProgress: (progress) => {
        if (progress.stage === "download-checksum-complete") {
          setActionProgress({
            action: "deploy",
            current: 2,
            total: 5,
            stage: "deploy-release-download-checksum",
            label: resolveDeployProgressLabel("deploy-release-download-checksum"),
          });
          return;
        }
        if (progress.stage === "extract-complete") {
          setActionProgress({
            action: "deploy",
            current: 3,
            total: 5,
            stage: "deploy-release-extract",
            label: resolveDeployProgressLabel("deploy-release-extract"),
          });
        }
      },
      runCommand: (commandArgs) => bridge.runSystemCommand(commandArgs),
      keepTempOnSuccess: false,
      keepTempOnFailure: true,
    });
    appendLocalRuntimeLog({
      level: install.ok ? "info" : "warn",
      operation: "deploy-release-install",
      stage: "deploy-release-install",
      message: install.ok
        ? "plugin-native release install succeeded"
        : "plugin-native release install failed",
      details: {
        version,
        installRoot,
        repo: DEFAULT_SKILL_RUNNER_RELEASE_REPO,
        installStage: install.stage,
        installMessage: install.message,
        installDir: install.installDir,
        tempDir: install.tempDir,
        artifactFile: install.artifactFile,
        checksumFile: install.checksumFile,
        artifactBytes: install.artifactBytes,
        expectedSha256: install.expectedSha256,
        actualSha256: install.actualSha256,
        extractCommand: install.extractCommand,
        installDetails: install.details,
      },
    });
    if (!install.ok) {
      return {
        ok: false,
        stage: install.stage,
        message: install.message,
        details: install.details,
      };
    }
    const normalizedInstallDir = normalizeString(install.installDir);
    if (!normalizedInstallDir) {
      return {
        ok: false,
        stage: "deploy-release-install",
        message: "release installer returned empty installDir",
        details: install.details,
      };
    }
    const ctlPath =
      bridge.resolveCtlPathFromInstallDir(normalizedInstallDir) ||
      normalizeString("");
      setActionProgress({
        action: "deploy",
        current: 4,
        total: 5,
        stage: "deploy-bootstrap",
        label: resolveDeployProgressLabel("deploy-bootstrap"),
      });
    const ctlBootstrap =
      typeof (bridge as { bootstrapLocalRuntime?: unknown }).bootstrapLocalRuntime ===
      "function"
        ? await (
            bridge as {
              bootstrapLocalRuntime: (args: {
                installDir: string;
              }) => Promise<SkillRunnerCtlCommandResult>;
            }
          ).bootstrapLocalRuntime({
            installDir: normalizedInstallDir,
          })
        : typeof (bridge as { runDirectAgentBootstrap?: unknown }).runDirectAgentBootstrap ===
          "function"
        ? await (
            bridge as {
              runDirectAgentBootstrap: (args: {
                installDir: string;
              }) => Promise<SkillRunnerCtlCommandResult>;
            }
          ).runDirectAgentBootstrap({
            installDir: normalizedInstallDir,
          })
        : await bridge.runCtlCommand({
            ctlPath,
            command: "bootstrap",
          });
    if (!ctlBootstrap.ok) {
      const stateBeforeFail = readManagedLocalRuntimeState();
      const endpoint = resolveRuntimeEndpoint(stateBeforeFail);
      writeManagedLocalRuntimeState({
        ...stateBeforeFail,
        versionTag: version,
        installDir: normalizedInstallDir,
        ctlPath,
        baseUrl: buildBaseUrl(endpoint.host, endpoint.port),
        runtimeHost: endpoint.host,
        runtimePort: endpoint.port,
        runtimeUrl: endpoint.url,
        requestedPort: endpoint.requestedPort,
        portFallbackSpan: endpoint.portFallbackSpan,
        runtimeState: "unknown",
        lastDeployError: normalizeString(ctlBootstrap.message) || "bootstrap failed",
      });
      return resultFromCtl("deploy-ctl-bootstrap", ctlBootstrap);
    }
    const bootstrapReport = await readBootstrapReport({
      installDir: normalizedInstallDir,
      reportFilePath: normalizeString(
        ctlBootstrap.details?.bootstrap_report_file,
      ) || undefined,
    });
    if (!bootstrapReport.ok) {
      appendLocalRuntimeLog({
        level: "warn",
        operation: "deploy-bootstrap-report",
        stage: "deploy-bootstrap-report",
        message: "bootstrap report validation failed",
        details: {
          ...bootstrapReport.details,
          reason: bootstrapReport.message,
        },
      });
      return {
        ok: false,
        stage: bootstrapReport.stage,
        message: bootstrapReport.message,
        details: bootstrapReport.details,
      };
    }
    appendLocalRuntimeLog({
      level:
        bootstrapReport.summary.bootstrapOutcome === "partial_failure"
          ? "warn"
          : "info",
      operation: "deploy-bootstrap-report",
      stage: "deploy-bootstrap-report",
      message:
        bootstrapReport.summary.bootstrapOutcome === "partial_failure"
          ? "bootstrap report loaded with partial failure"
          : "bootstrap report loaded",
      details: bootstrapReport.summary,
    });
    const bootstrapWarning = normalizeString(
      bootstrapReport.summary.bootstrapWarning,
    );
    if (bootstrapWarning) {
      appendLocalRuntimeLog({
        level: "warn",
        operation: "deploy-bootstrap-report",
        stage: "deploy-bootstrap-report-warning",
        message: bootstrapWarning,
        details: bootstrapReport.summary,
      });
    }

    const previousState = readManagedLocalRuntimeState();
    const previousEndpoint = resolveRuntimeEndpoint(previousState);
    const stagedState = writeManagedLocalRuntimeState({
      ...previousState,
      versionTag: version,
      installDir: normalizedInstallDir,
      ctlPath,
      baseUrl: buildBaseUrl(previousEndpoint.host, previousEndpoint.port),
      runtimeHost: previousEndpoint.host,
      runtimePort: previousEndpoint.port,
      runtimeUrl: previousEndpoint.url,
      requestedPort: previousEndpoint.requestedPort,
      portFallbackSpan: previousEndpoint.portFallbackSpan,
      portFallbackUsed: false,
      triedPorts: [],
      runtimeState: "stopped",
      runtimeFailureCount: 0,
      deployedAt: nowIso(),
      lastDeployError: undefined,
      lease: {
        acquired: false,
        stoppedByConflict: false,
        leaseId: undefined,
        heartbeatIntervalSeconds: DEFAULT_HEARTBEAT_INTERVAL_SECONDS,
        lastError: undefined,
      },
    });

    const finalBaseUrl = resolveManagedBaseUrl(stagedState);
    const profileEnsureState: ManagedLocalRuntimeState = {
      ...stagedState,
      managedBackendId: MANAGED_PROFILE_ID,
    };
    const profileResult = await createManagedProfileOnDeploy(profileEnsureState, finalBaseUrl);
    if (!profileResult.ok) {
      writeManagedLocalRuntimeState({
        ...stagedState,
        lastDeployError: profileResult.message,
      });
      return {
        ok: false,
        stage: "deploy-configure-profile",
        message: profileResult.message,
        conflict: profileResult.conflict,
      };
    }
    const nextState = writeManagedLocalRuntimeState({
      ...stagedState,
      managedBackendId: MANAGED_PROFILE_ID,
    });
    const postDeployEndpoint = resolveRuntimeEndpoint(nextState);
    const postDeployPreflight = await runLocalBridgePreflight({
      bridge,
      state: nextState,
      host: postDeployEndpoint.host,
      port: postDeployEndpoint.requestedPort,
      portFallbackSpan: postDeployEndpoint.portFallbackSpan,
    });
    if (!postDeployPreflight.ok) {
      setAutoStartEnabledInSession(false);
      const failedMessage =
        normalizeString(postDeployPreflight.message) ||
        "post-deploy preflight failed";
      const failedState = writeManagedLocalRuntimeState({
        ...nextState,
        lastDeployError: failedMessage,
      });
      appendLocalRuntimeLog({
        level: "warn",
        operation: "deploy-post-preflight",
        stage: "deploy-post-preflight-failed",
        message: "post-deploy preflight failed",
        details: {
          version,
          installDir: normalizedInstallDir,
          message: failedMessage,
          details: postDeployPreflight.details,
        },
      });
      return {
        ok: false,
        stage: "post-deploy-preflight",
        message: failedMessage,
        details: {
          version,
          backendId: MANAGED_PROFILE_ID,
          baseUrl: finalBaseUrl,
          runtimeState: failedState.runtimeState,
          leaseState: resolveLeaseViewState(failedState.lease),
          actualHost: postDeployEndpoint.host,
          actualPort: postDeployEndpoint.port,
          actualUrl: postDeployEndpoint.url,
          requestedPort:
            failedState.requestedPort || postDeployEndpoint.requestedPort,
          portFallbackSpan:
            failedState.portFallbackSpan ??
            postDeployEndpoint.portFallbackSpan,
          portFallbackUsed: failedState.portFallbackUsed === true,
          triedPorts: failedState.triedPorts || [],
          warnings: bootstrapWarning ? [bootstrapWarning] : [],
          postDeployPreflight: postDeployPreflight.details,
          postDeployPreflightMessage: failedMessage,
          autoEnsureTriggered: false,
          downloadProof: isObjectRecord(install.details)
            ? install.details.downloadProof
            : undefined,
          checksumProof: isObjectRecord(install.details)
            ? install.details.checksumProof
            : undefined,
          extractProof: isObjectRecord(install.details)
            ? install.details.extractProof
            : undefined,
          tempDir: install.tempDir,
        ...bootstrapReport.summary,
      },
    };
  }
      setActionProgress({
        action: "deploy",
        current: 5,
        total: 5,
        stage: "deploy-post-bootstrap",
        label: resolveDeployProgressLabel("deploy-post-bootstrap"),
      });
    const postPreflightState = applyRuntimeEndpointFromDetails(
      nextState,
      postDeployPreflight.details,
    );
    const finalBaseUrlAfterPreflight = resolveManagedBaseUrl(postPreflightState);
    setAutoStartEnabledInSession(true);
    const autoEnsureTriggered = triggerManagedRuntimeAutoEnsureTickAsync();

    appendLocalRuntimeLog({
      level: "info",
      operation: "deploy-configure",
      stage: "local-runtime-deploy-succeeded",
      message: "skillrunner local runtime deployed and configured",
      details: {
        version,
        managedBackendId: postPreflightState.managedBackendId,
        baseUrl: finalBaseUrlAfterPreflight,
        postDeployPreflight: postDeployPreflight.details,
      },
    });
    const finalEndpoint = resolveRuntimeEndpoint(postPreflightState);
    return {
      ok: true,
      stage: "deploy-complete",
      message: bootstrapWarning
        ? `SkillRunner local runtime deployed and configured with bootstrap warning: ${bootstrapWarning}`
        : "SkillRunner local runtime deployed and configured.",
      details: {
        version,
        backendId: MANAGED_PROFILE_ID,
        baseUrl: finalBaseUrlAfterPreflight,
        runtimeState: postPreflightState.runtimeState,
        leaseState: resolveLeaseViewState(postPreflightState.lease),
        actualHost: finalEndpoint.host,
        actualPort: finalEndpoint.port,
        actualUrl: finalEndpoint.url,
        requestedPort:
          postPreflightState.requestedPort || finalEndpoint.requestedPort,
        portFallbackSpan:
          postPreflightState.portFallbackSpan ??
          finalEndpoint.portFallbackSpan,
        portFallbackUsed: postPreflightState.portFallbackUsed === true,
        triedPorts: postPreflightState.triedPorts || [],
        warnings: bootstrapWarning ? [bootstrapWarning] : [],
        postDeployPreflight: postDeployPreflight.details,
        autoEnsureTriggered,
        downloadProof: isObjectRecord(install.details)
          ? install.details.downloadProof
          : undefined,
        checksumProof: isObjectRecord(install.details)
          ? install.details.checksumProof
          : undefined,
        extractProof: isObjectRecord(install.details)
          ? install.details.extractProof
          : undefined,
        tempDir: install.tempDir,
        ...bootstrapReport.summary,
      },
    };
    } finally {
      clearActionProgress();
    }
  });
}

function quoteShellArg(value: string) {
  if (detectWindows()) {
    return `"${String(value || "").replace(/"/g, '\\"')}"`;
  }
  return `'${String(value || "").replace(/'/g, `'\\''`)}'`;
}

export function buildManualDeployCommands(args?: {
  version?: string;
  installRoot?: string;
  host?: string;
  port?: number;
  portFallbackSpan?: number;
}) {
  const version = normalizeString(args?.version) || getConfiguredVersionTag();
  const installRoot = normalizeString(args?.installRoot) || resolveDefaultInstallRoot();
  const host = normalizeString(args?.host) || DEFAULT_MANAGED_LOCAL_HOST;
  const port =
    typeof args?.port === "number" && Number.isFinite(args.port)
      ? Math.floor(args.port)
      : DEFAULT_MANAGED_LOCAL_PORT;
  const portFallbackSpan = normalizePortFallbackSpan(args?.portFallbackSpan);
  const artifactName = `skill-runner-${version}.tar.gz`;
  const checksumName = `${artifactName}.sha256`;
  const baseUrl = `https://github.com/${DEFAULT_SKILL_RUNNER_RELEASE_REPO}/releases/download/${version}`;
  const releaseDir = joinPath(installRoot, version);
  const localRoot = resolveManagedLocalRootFromInstallRoot(installRoot);
  const dataDir = joinPath(localRoot, "data");
  const agentCacheDir = joinPath(localRoot, "agent-cache");
  const agentHomeDir = joinPath(agentCacheDir, "agent-home");
  const npmPrefixDir = joinPath(agentCacheDir, "npm");
  const uvCacheDir = joinPath(agentCacheDir, "uv_cache");
  const uvVenvDir = joinPath(agentCacheDir, "uv_venv");
  const bootstrapReportFile = joinPath(dataDir, "agent_bootstrap_report.json");
  if (detectWindows()) {
    const uninstall = joinPath(releaseDir, "scripts", "skill-runner-uninstall.ps1");
    const artifactPath = joinPath("$tempDir", artifactName);
    const checksumPath = joinPath("$tempDir", checksumName);
    return [
      `$version = ${quoteShellArg(version)}`,
      `$installRoot = ${quoteShellArg(installRoot)}`,
      `$artifact = ${quoteShellArg(artifactName)}`,
      `$checksum = ${quoteShellArg(checksumName)}`,
      `$baseUrl = ${quoteShellArg(baseUrl)}`,
      `$artifactUrl = "$baseUrl/$artifact"`,
      `$checksumUrl = "$baseUrl/$checksum"`,
      `$tempDir = Join-Path $env:TEMP ("skill-runner-install-" + [guid]::NewGuid().ToString("N"))`,
      `New-Item -ItemType Directory -Path $tempDir -Force | Out-Null`,
      `$artifactPath = ${quoteShellArg(artifactPath)}`,
      `$checksumPath = ${quoteShellArg(checksumPath)}`,
      `Invoke-WebRequest -Uri $artifactUrl -OutFile $artifactPath`,
      `Invoke-WebRequest -Uri $checksumUrl -OutFile $checksumPath`,
      `$expected = (Get-Content $checksumPath -Raw).Split()[0].Trim().ToLowerInvariant()`,
      `$actual = (Get-FileHash -Path $artifactPath -Algorithm SHA256).Hash.ToLowerInvariant()`,
      `if ($expected -ne $actual) { throw "SHA256 mismatch" }`,
      `$releaseDir = ${quoteShellArg(releaseDir)}`,
      `New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null`,
      `tar -xzf $artifactPath -C $releaseDir`,
      `$env:SKILL_RUNNER_RUNTIME_MODE = 'local'`,
      `$env:SKILL_RUNNER_LOCAL_ROOT = ${quoteShellArg(localRoot)}`,
      `$env:SKILL_RUNNER_DATA_DIR = ${quoteShellArg(dataDir)}`,
      `$env:SKILL_RUNNER_AGENT_CACHE_DIR = ${quoteShellArg(agentCacheDir)}`,
      `$env:SKILL_RUNNER_AGENT_HOME = ${quoteShellArg(agentHomeDir)}`,
      `$env:SKILL_RUNNER_NPM_PREFIX = ${quoteShellArg(npmPrefixDir)}`,
      `$env:NPM_CONFIG_PREFIX = $env:SKILL_RUNNER_NPM_PREFIX`,
      `$env:UV_CACHE_DIR = ${quoteShellArg(uvCacheDir)}`,
      `$env:UV_PROJECT_ENVIRONMENT = ${quoteShellArg(uvVenvDir)}`,
      `$env:SKILL_RUNNER_LOCAL_PORT_FALLBACK_SPAN = ${quoteShellArg(String(portFallbackSpan))}`,
      `Set-Location -LiteralPath $releaseDir`,
      `uv run python scripts/agent_manager.py --ensure --bootstrap-report-file ${quoteShellArg(
        bootstrapReportFile,
      )}`,
      `uv run uvicorn server.main:app --host ${host} --port ${port}`,
      `$uninstall = ${quoteShellArg(uninstall)}`,
      `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ${quoteShellArg(uninstall)} -Json`,
    ].join("\n");
  }
  const uninstall = joinPath(releaseDir, "scripts", "skill-runner-uninstall.sh");
  const artifactPath = joinPath("${TMP_DIR}", artifactName);
  const checksumPath = joinPath("${TMP_DIR}", checksumName);
  return [
    `VERSION=${quoteShellArg(version)}`,
    `INSTALL_ROOT=${quoteShellArg(installRoot)}`,
    `REPO=${quoteShellArg(DEFAULT_SKILL_RUNNER_RELEASE_REPO)}`,
    `ARTIFACT=${quoteShellArg(artifactName)}`,
    `CHECKSUM=${quoteShellArg(checksumName)}`,
    `BASE_URL=${quoteShellArg(baseUrl)}`,
    `TMP_DIR="$(mktemp -d)"`,
    `curl -fL "$BASE_URL/$ARTIFACT" -o ${quoteShellArg(artifactPath)}`,
    `curl -fL "$BASE_URL/$CHECKSUM" -o ${quoteShellArg(checksumPath)}`,
    `if command -v sha256sum >/dev/null 2>&1; then (cd "$TMP_DIR" && sha256sum -c "$CHECKSUM"); else EXPECTED="$(awk '{print $1}' ${quoteShellArg(checksumPath)})"; ACTUAL="$(shasum -a 256 ${quoteShellArg(artifactPath)} | awk '{print $1}')"; [ "$EXPECTED" = "$ACTUAL" ] || { echo "SHA256 mismatch"; exit 1; }; fi`,
    `mkdir -p ${quoteShellArg(releaseDir)}`,
    `tar -xzf ${quoteShellArg(artifactPath)} -C ${quoteShellArg(releaseDir)}`,
    `export SKILL_RUNNER_RUNTIME_MODE=${quoteShellArg("local")}`,
    `export SKILL_RUNNER_LOCAL_ROOT=${quoteShellArg(localRoot)}`,
    `export SKILL_RUNNER_DATA_DIR=${quoteShellArg(dataDir)}`,
    `export SKILL_RUNNER_AGENT_CACHE_DIR=${quoteShellArg(agentCacheDir)}`,
    `export SKILL_RUNNER_AGENT_HOME=${quoteShellArg(agentHomeDir)}`,
    `export SKILL_RUNNER_NPM_PREFIX=${quoteShellArg(npmPrefixDir)}`,
    "export NPM_CONFIG_PREFIX=\"$SKILL_RUNNER_NPM_PREFIX\"",
    `export UV_CACHE_DIR=${quoteShellArg(uvCacheDir)}`,
    `export UV_PROJECT_ENVIRONMENT=${quoteShellArg(uvVenvDir)}`,
    `export SKILL_RUNNER_LOCAL_PORT_FALLBACK_SPAN=${quoteShellArg(String(portFallbackSpan))}`,
    `cd ${quoteShellArg(releaseDir)}`,
    `uv run python scripts/agent_manager.py --ensure --bootstrap-report-file ${quoteShellArg(
      bootstrapReportFile,
    )}`,
    `uv run uvicorn server.main:app --host ${host} --port ${port}`,
    `sh ${quoteShellArg(uninstall)} --json`,
  ].join("\n");
}

export async function getLocalRuntimeManualDeployCommands(args?: {
  version?: string;
}): Promise<SkillRunnerLocalRuntimeActionResult> {
  const version = normalizeString(args?.version) || getConfiguredVersionTag();
  setConfiguredVersionTag(version);
  const installRoot = resolveDefaultInstallRoot();
  const commands = buildManualDeployCommands({
    version,
    installRoot,
    host: DEFAULT_MANAGED_LOCAL_HOST,
    port: DEFAULT_MANAGED_LOCAL_PORT,
    portFallbackSpan: DEFAULT_MANAGED_LOCAL_PORT_FALLBACK_SPAN,
  });
  return {
    ok: true,
    stage: "manual-deploy-commands",
    message: "[manual-deploy-commands] generated manual deploy commands",
    details: {
      version,
      installRoot,
      commands,
    },
  };
}

export function getManagedLocalRuntimeStateSnapshot(): SkillRunnerLocalRuntimeActionResult {
  const state = readManagedLocalRuntimeState();
  const runtimeInfoReady = hasRuntimeInfo(state);
  const inFlightAction = getEffectiveInFlightAction();
  return {
    ok: true,
    stage: "state",
    message: "managed local runtime state snapshot",
    details: {
      baseUrl: resolveManagedBaseUrl(state),
      runtimeHost: state.runtimeHost || "",
      runtimePort: state.runtimePort || 0,
      runtimeUrl: state.runtimeUrl || "",
      requestedPort: state.requestedPort || 0,
      portFallbackSpan: state.portFallbackSpan ?? DEFAULT_MANAGED_LOCAL_PORT_FALLBACK_SPAN,
      portFallbackUsed: state.portFallbackUsed === true,
      triedPorts: state.triedPorts || [],
      managedBackendId: normalizeString(state.managedBackendId) || "",
      runtimeState: state.runtimeState || "unknown",
      runtimeFailureCount: state.runtimeFailureCount || 0,
      leaseState: resolveLeaseViewState(state.lease),
      autoStartPaused: isAutoStartPaused(),
      hasRuntimeInfo: runtimeInfoReady,
      inFlightAction,
      monitoringState,
      actionProgress: cloneActionProgress(actionProgressState),
      deployedAt: state.deployedAt || "",
      lastRuntimeStatusAt: state.lastRuntimeStatusAt || "",
      lastDeployError: state.lastDeployError || "",
      lastRuntimeError: state.lastRuntimeError || "",
    },
  };
}

export async function setLocalRuntimeAutoPullEnabled(
  enabled: boolean,
): Promise<SkillRunnerLocalRuntimeActionResult> {
  return withRuntimeControlLock(async () => {
    const state = readManagedLocalRuntimeState();
    setAutoStartEnabledInSession(enabled);
    return {
      ok: true,
      stage: "auto-pull",
      message: enabled
        ? "local runtime auto start enabled"
        : "local runtime auto start disabled",
      details: {
        autoStartPaused: isAutoStartPaused(),
        runtimeState: state.runtimeState || "unknown",
        leaseState: resolveLeaseViewState(state.lease),
      },
    };
  });
}

export async function toggleLocalRuntimeAutoPull(): Promise<SkillRunnerLocalRuntimeActionResult> {
  const enable = isAutoStartPaused();
  return setLocalRuntimeAutoPullEnabled(enable);
}

function getManagedInstallDir() {
  const state = readManagedLocalRuntimeState();
  const installDir = resolveEffectiveInstallDir(state);
  if (!installDir) {
    return "";
  }
  return installDir;
}

function getParentPath(pathValue: string) {
  const normalized = normalizeString(pathValue).replace(/[\\/]+$/g, "");
  if (!normalized) {
    return "";
  }
  if (normalized === "/" || normalized === "\\") {
    return normalized;
  }
  if (/^[A-Za-z]:$/.test(normalized)) {
    return `${normalized}\\`;
  }
  const lastSlashIndex = Math.max(
    normalized.lastIndexOf("/"),
    normalized.lastIndexOf("\\"),
  );
  if (lastSlashIndex < 0) {
    return "";
  }
  if (lastSlashIndex === 0) {
    return normalized[0];
  }
  if (lastSlashIndex === 2 && /^[A-Za-z]:/.test(normalized)) {
    return `${normalized.slice(0, 2)}\\`;
  }
  return normalized.slice(0, lastSlashIndex);
}

function isAbsoluteFsPath(pathValue: string) {
  const normalized = normalizeString(pathValue);
  if (!normalized) {
    return false;
  }
  if (detectWindows()) {
    return /^[A-Za-z]:[\\/]/.test(normalized) || /^\\\\/.test(normalized);
  }
  return normalized.startsWith("/");
}

function normalizePathForCompare(pathValue: string) {
  const normalized = normalizeString(pathValue).replace(/[\\/]+$/, "");
  if (!normalized) {
    return "";
  }
  if (detectWindows()) {
    return normalized.replace(/\//g, "\\").toLowerCase();
  }
  return normalized;
}

function isFsRootPath(pathValue: string) {
  const normalized = normalizeString(pathValue).replace(/[\\/]+$/, "");
  if (!normalized) {
    return true;
  }
  if (normalized === "/" || normalized === "\\") {
    return true;
  }
  if (detectWindows()) {
    if (/^[A-Za-z]:$/.test(normalized)) {
      return true;
    }
    if (/^\\\\[^\\]+\\[^\\]+$/.test(normalized)) {
      return true;
    }
  }
  return false;
}

function resolveManagedLocalRoot(args?: { state?: ManagedLocalRuntimeState }) {
  const state = args?.state || readManagedLocalRuntimeState();
  const installDir = resolveEffectiveInstallDir(state);
  if (!installDir) {
    return {
      ok: false as const,
      reason: "managed installDir is missing",
      details: {
        installDir,
      },
    };
  }
  if (!isAbsoluteFsPath(installDir)) {
    return {
      ok: false as const,
      reason: "managed installDir is not absolute",
      details: {
        installDir,
      },
    };
  }
  const releasesDir = getParentPath(installDir);
  const localRoot = getParentPath(releasesDir);
  const expectedReleasesDir = joinPath(localRoot, "releases");
  if (
    !localRoot ||
    normalizePathForCompare(releasesDir) !==
      normalizePathForCompare(expectedReleasesDir)
  ) {
    return {
      ok: false as const,
      reason: "managed installDir does not belong to expected releases/<version> layout",
      details: {
        installDir,
        releasesDir,
        expectedReleasesDir,
      },
    };
  }
  if (!isAbsoluteFsPath(localRoot) || isFsRootPath(localRoot)) {
    return {
      ok: false as const,
      reason: "resolved localRoot is unsafe",
      details: {
        installDir,
        localRoot,
      },
    };
  }
  return {
    ok: true as const,
    localRoot,
    details: {
      installDir,
      releasesDir,
      localRoot,
    },
  };
}

export function resolveManagedLocalSkillsFolderPath(args?: {
  state?: ManagedLocalRuntimeState;
}) {
  const localRootResolution = resolveManagedLocalRoot(args);
  if (!localRootResolution.ok) {
    return {
      ok: false as const,
      reason: localRootResolution.reason,
      details: localRootResolution.details,
    };
  }
  const localRoot = localRootResolution.localRoot;
  const skillsFolder = joinPath(localRoot, "skills");
  return {
    ok: true as const,
    localRoot,
    skillsFolder,
    details: {
      ...localRootResolution.details,
      skillsFolder,
    },
  };
}

type ManagedUninstallDeleteTarget = {
  id: string;
  path: string;
  preserve: boolean;
  purpose: string;
};

function buildManagedUninstallDeleteTargets(args: {
  localRoot: string;
  clearData: boolean;
  clearAgentHome: boolean;
}) {
  const releasesPath = joinPath(args.localRoot, "releases");
  const npmCachePath = joinPath(args.localRoot, "agent-cache", "npm");
  const uvCachePath = joinPath(args.localRoot, "agent-cache", "uv_cache");
  const uvVenvPath = joinPath(args.localRoot, "agent-cache", "uv_venv");
  const dataPath = joinPath(args.localRoot, "data");
  const agentHomePath = joinPath(args.localRoot, "agent-cache", "agent-home");
  const targets: ManagedUninstallDeleteTarget[] = [
    {
      id: "releases",
      path: releasesPath,
      preserve: false,
      purpose: "skill runner release artifacts",
    },
    {
      id: "npm-cache",
      path: npmCachePath,
      preserve: false,
      purpose: "npm cache",
    },
    {
      id: "uv-cache",
      path: uvCachePath,
      preserve: false,
      purpose: "uv cache",
    },
    {
      id: "uv-venv",
      path: uvVenvPath,
      preserve: false,
      purpose: "uv virtual environment cache",
    },
    {
      id: "data",
      path: dataPath,
      preserve: !args.clearData,
      purpose: "runtime data and reports",
    },
    {
      id: "agent-home",
      path: agentHomePath,
      preserve: !args.clearAgentHome,
      purpose: "agent home settings",
    },
  ];
  if (args.clearData && args.clearAgentHome && !isFsRootPath(args.localRoot)) {
    targets.push({
      id: "local-root",
      path: args.localRoot,
      preserve: false,
      purpose: "managed local runtime root",
    });
  }
  return targets;
}

export async function previewLocalRuntimeUninstall(args?: {
  clearData?: boolean;
  clearAgentHome?: boolean;
}): Promise<SkillRunnerLocalRuntimeActionResult> {
  const stateBeforeUninstall = readManagedLocalRuntimeState();
  const localRootResolution = resolveManagedLocalRoot({
    state: stateBeforeUninstall,
  });
  if (!localRootResolution.ok) {
    return {
      ok: false,
      stage: "uninstall-local-root",
      message: localRootResolution.reason,
      details: localRootResolution.details,
    };
  }
  const clearData = args?.clearData === true;
  const clearAgentHome = args?.clearAgentHome === true;
  const localRoot = localRootResolution.localRoot;
  const targets = buildManagedUninstallDeleteTargets({
    localRoot,
    clearData,
    clearAgentHome,
  });
  const removableTargets = targets.filter((target) => !target.preserve);
  const preservedTargets = targets.filter((target) => target.preserve);
  const installDir = normalizeString(stateBeforeUninstall.installDir);
  const canInvokeDown = !!installDir;
  const totalSteps = removableTargets.length + (canInvokeDown ? 1 : 0) + 1;
  return {
    ok: true,
    stage: "uninstall-preview",
    message: "managed local runtime uninstall preview generated",
    details: {
      clearData,
      clearAgentHome,
      localRoot,
      canInvokeDown,
      totalSteps,
      removableTargets: removableTargets.map((target) => ({
        id: target.id,
        path: target.path,
        purpose: target.purpose,
      })),
      preservedTargets: preservedTargets.map((target) => ({
        id: target.id,
        path: target.path,
        purpose: target.purpose,
      })),
    },
  };
}

async function deleteManagedLocalRuntimePaths(args: {
  localRoot: string;
  clearData: boolean;
  clearAgentHome: boolean;
  onTargetProcessed?: (target: {
    id: string;
    path: string;
    purpose: string;
    ok: boolean;
    error?: string;
  }) => void;
}) {
  const targets = buildManagedUninstallDeleteTargets(args);
  const removedPaths: string[] = [];
  const failedPaths: string[] = [];
  const preservedPaths: string[] = [];
  const failedPathErrors: Record<string, string> = {};
  for (const target of targets) {
    if (target.preserve) {
      preservedPaths.push(target.path);
      continue;
    }
    try {
      const diagnostics = await removePathRecursive(target.path);
      const afterExists = await pathExists(target.path);
      if (afterExists) {
        const failureMessage = formatManagedDeleteFailureMessage({
          targetId: target.id,
          targetPath: target.path,
          reason: "path still exists after deletion attempt",
          diagnostics,
        });
        failedPaths.push(target.path);
        failedPathErrors[target.path] = failureMessage;
        args.onTargetProcessed?.({
          id: target.id,
          path: target.path,
          purpose: target.purpose,
          ok: false,
          error: failureMessage,
        });
      } else {
        removedPaths.push(target.path);
        args.onTargetProcessed?.({
          id: target.id,
          path: target.path,
          purpose: target.purpose,
          ok: true,
        });
      }
    } catch (error) {
      const message = normalizeString(
        error && typeof error === "object" && "message" in error
          ? (error as { message?: unknown }).message
          : error,
      );
      const diagnostics = (
        error &&
        typeof error === "object" &&
        "deleteDiagnostics" in (error as Record<string, unknown>)
          ? (error as { deleteDiagnostics?: RemovePathRecursiveDiagnostics })
              .deleteDiagnostics
          : undefined
      ) || {
        retries: 0,
        longPathFallbackAttempted: false,
        lastErrorCode: getDeleteErrorCode(error),
        lastErrorMessage: message,
      };
      const failureMessage = formatManagedDeleteFailureMessage({
        targetId: target.id,
        targetPath: target.path,
        reason: message || "unknown error",
        diagnostics,
      });
      failedPaths.push(target.path);
      failedPathErrors[target.path] = failureMessage;
      args.onTargetProcessed?.({
        id: target.id,
        path: target.path,
        purpose: target.purpose,
        ok: false,
        error: failureMessage,
      });
    }
  }
  return {
    removedPaths,
    failedPaths,
    preservedPaths,
    failedPathErrors,
  };
}

export async function getLocalRuntimeStatus(): Promise<SkillRunnerLocalRuntimeActionResult> {
  const installDir = getManagedInstallDir();
  if (!installDir) {
    return {
      ok: false,
      stage: "status",
      message: "managed local runtime is not configured yet",
    };
  }
  const bridge = getCtlBridge();
  const stateBeforeStatus = readManagedLocalRuntimeState();
  const endpoint = resolveRuntimeEndpoint(stateBeforeStatus);
  const result = await runLocalBridgeStatus({
    bridge,
    state: stateBeforeStatus,
    host: endpoint.host,
    port: endpoint.port,
  });
  if (result.ok) {
    applyRuntimeEndpointFromDetails(readManagedLocalRuntimeState(), result.details);
  }
  return resultFromCtl("status", result);
}

export async function stopLocalRuntime(): Promise<SkillRunnerLocalRuntimeActionResult> {
  return withRuntimeActionMutex("stop", async () => {
    setAutoStartEnabledInSession(false);
    const installDir = getManagedInstallDir();
    if (!installDir) {
      return {
        ok: false,
        stage: "stop",
        message: "managed local runtime is not configured yet",
      };
    }
    await releaseManagedLocalRuntimeLeaseOnShutdown();
    const bridge = getCtlBridge();
    const downResult = await runLocalBridgeDown({
      bridge,
      state: readManagedLocalRuntimeState(),
    });
    if (!downResult.ok) {
      return resultFromCtl("stop-down", downResult);
    }
    const stateAfterDown = readManagedLocalRuntimeState();
    const endpoint = resolveRuntimeEndpoint(stateAfterDown);
    const statusResult = await runLocalBridgeStatus({
      bridge,
      state: stateAfterDown,
      host: endpoint.host,
      port: endpoint.port,
    });
    const statusValue = normalizeString(statusResult.details?.status).toLowerCase();
    if (statusResult.ok && statusValue === "stopped") {
      clearHeartbeatTimer();
      clearStatusReconcileTimer();
      applyRuntimeStatePatch({
        state: readManagedLocalRuntimeState(),
        runtimeState: "stopped",
        runtimeError: "",
      });
      emitLocalRuntimeToast("runtime-down");
      return {
        ok: true,
        stage: "stop-complete",
        message: "local runtime stopped",
        details: {
          down: downResult.details,
          status: statusResult.details,
        },
      };
    }
    if (statusResult.ok && statusValue === "running") {
      applyRuntimeStatePatch({
        state: readManagedLocalRuntimeState(),
        runtimeState: "running",
        runtimeError: "status probe reports running after down",
      });
      return {
        ok: false,
        stage: "stop-status-running",
        message: "runtime still running after stop chain",
        details: {
          down: downResult.details,
          status: statusResult.details,
        },
      };
    }
    applyRuntimeStatePatch({
      state: readManagedLocalRuntimeState(),
      runtimeState: "degraded",
      runtimeError: normalizeString(statusResult.message) || "status probe failed after down",
    });
    return {
      ok: false,
      stage: "stop-status",
      message: normalizeString(statusResult.message) || "status probe failed after down",
      details: {
        down: downResult.details,
        status: statusResult.details,
      },
    };
  });
}

export async function uninstallLocalRuntime(args?: {
  clearData?: boolean;
  clearAgentHome?: boolean;
}): Promise<SkillRunnerLocalRuntimeActionResult> {
  return withRuntimeActionMutex("uninstall", async () => {
    const version = getConfiguredVersionTag();
    resetSkillRunnerLocalDeployDebugSession({
      version,
      trigger: "uninstall",
    });
    try {
      const stateBeforeUninstall = readManagedLocalRuntimeState();
      const installDir = normalizeString(stateBeforeUninstall.installDir);
      const clearData = args?.clearData === true;
      const clearAgentHome = args?.clearAgentHome === true;
      appendLocalRuntimeLog({
        level: "info",
        operation: "uninstall-start",
        stage: "uninstall-start",
        message: "managed local runtime uninstall started",
        details: {
          version,
          clearData,
          clearAgentHome,
          managedBackendId: normalizeString(stateBeforeUninstall.managedBackendId),
          installDir,
        },
      });
      setAutoStartEnabledInSession(false);
      clearManagedLocalRuntimeState();
      const localRootResolution = resolveManagedLocalRoot({
        state: stateBeforeUninstall,
      });
      if (!localRootResolution.ok) {
        appendLocalRuntimeLog({
          level: "warn",
          operation: "uninstall-local-root",
          stage: "uninstall-local-root",
          message: "failed to resolve managed local root for uninstall",
          details: localRootResolution.details,
        });
        return {
          ok: false,
          stage: "uninstall-local-root",
          message: localRootResolution.reason,
          details: localRootResolution.details,
        };
      }
      const localRoot = localRootResolution.localRoot;
      const targets = buildManagedUninstallDeleteTargets({
        localRoot,
        clearData,
        clearAgentHome,
      });
      const removableTargets = targets.filter((target) => !target.preserve);
      const canInvokeDown = !!installDir;
      appendLocalRuntimeLog({
        level: "info",
        operation: "uninstall-plan",
        stage: "uninstall-plan",
        message: "prepared uninstall target plan",
        details: {
          localRoot,
          clearData,
          clearAgentHome,
          canInvokeDown,
          removableTargets: removableTargets.map((target) => ({
            id: target.id,
            path: target.path,
            purpose: target.purpose,
          })),
        },
      });
      const totalSteps = removableTargets.length + (canInvokeDown ? 1 : 0) + 1;
      let progressStep = 0;
      setActionProgress({
        action: "uninstall",
        current: 0,
        total: totalSteps,
        stage: "uninstall-start",
        label: resolveUninstallProgressLabel("uninstall-start"),
      });
      const advanceUninstallProgress = (stage: string) => {
        progressStep = Math.min(totalSteps, progressStep + 1);
        setActionProgress({
          action: "uninstall",
          current: progressStep,
          total: totalSteps,
          stage,
          label: resolveUninstallProgressLabel(stage),
        });
      };

      clearStatusReconcileTimer();
      clearHeartbeatTimer();
      const bridge = getCtlBridge();
      const downResultDetails: Record<string, unknown> = {
        invoked: false,
        ok: true,
        exitCode: 0,
        message: "installDir unavailable; skip down and continue uninstall cleanup",
        command: "",
        args: [],
        details: {},
      };
      let downInvokedAndSucceeded = false;
      if (canInvokeDown) {
        appendLocalRuntimeLog({
          level: "info",
          operation: "uninstall-down",
          stage: "uninstall-down-start",
          message: "invoking bridge down before uninstall delete steps",
        });
        const downResult = await runLocalBridgeDown({
          bridge,
          state: stateBeforeUninstall,
        });
        downResultDetails.invoked = true;
        downResultDetails.ok = downResult.ok;
        downResultDetails.exitCode = downResult.exitCode;
        downResultDetails.message = downResult.message;
        downResultDetails.command = downResult.command;
        downResultDetails.args = downResult.args;
        downResultDetails.details = downResult.details || {};
        if (!downResult.ok) {
          appendLocalRuntimeLog({
            level: "warn",
            operation: "uninstall-down",
            stage: "uninstall-down-failed",
            message: normalizeString(downResult.message) || "managed local runtime stop failed",
            details: {
              localRoot,
              down_result: downResultDetails,
            },
          });
          return {
            ok: false,
            stage: "uninstall-down",
            message: normalizeString(downResult.message) || "managed local runtime stop failed",
            details: {
              localRoot,
              down_result: downResultDetails,
            },
          };
        }
        appendLocalRuntimeLog({
          level: "info",
          operation: "uninstall-down",
          stage: "uninstall-down-complete",
          message: "bridge down completed before uninstall delete steps",
          details: {
            localRoot,
            down_result: downResultDetails,
          },
        });
        downInvokedAndSucceeded = true;
        advanceUninstallProgress("uninstall-down");
      } else {
        appendLocalRuntimeLog({
          level: "info",
          operation: "uninstall-down",
          stage: "uninstall-down-skipped",
          message: "bridge down skipped because installDir is unavailable",
          details: {
            localRoot,
            down_result: downResultDetails,
          },
        });
      }
      const deleteResult = await deleteManagedLocalRuntimePaths({
        localRoot,
        clearData,
        clearAgentHome,
        onTargetProcessed: (target) => {
          advanceUninstallProgress(`uninstall-delete-${target.id}`);
          appendLocalRuntimeLog({
            level: target.ok ? "info" : "warn",
            operation: "uninstall-delete-target",
            stage: `uninstall-delete-${target.id}`,
            message: target.ok
              ? `deleted uninstall target: ${target.id}`
              : `failed to delete uninstall target: ${target.id}`,
            details: {
              targetId: target.id,
              targetPath: target.path,
              targetPurpose: target.purpose,
              ok: target.ok,
              error: target.error,
            },
          });
        },
      });
      if (deleteResult.failedPaths.length > 0) {
        appendLocalRuntimeLog({
          level: "warn",
          operation: "uninstall-delete",
          stage: "uninstall-delete-failed",
          message: "failed to delete one or more managed runtime paths",
          details: {
            localRoot,
            clearData,
            clearAgentHome,
            down_result: downResultDetails,
            removed_paths: deleteResult.removedPaths,
            failed_paths: deleteResult.failedPaths,
            preserved_paths: deleteResult.preservedPaths,
            failed_path_errors: deleteResult.failedPathErrors,
          },
        });
        return {
          ok: false,
          stage: "uninstall-delete",
          message: "failed to delete one or more managed runtime paths",
          details: {
            localRoot,
            clearData,
            clearAgentHome,
            down_result: downResultDetails,
            removed_paths: deleteResult.removedPaths,
            failed_paths: deleteResult.failedPaths,
            preserved_paths: deleteResult.preservedPaths,
            failed_path_errors: deleteResult.failedPathErrors,
          },
        };
      }
      const removeProfileResult = await removeManagedProfileIfPresent();
      if (!removeProfileResult.ok) {
        appendLocalRuntimeLog({
          level: "warn",
          operation: "uninstall-profile",
          stage: "uninstall-configure-profile-failed",
          message:
            removeProfileResult.message ||
            "failed to remove managed profile after uninstall",
          details: {
            localRoot,
            clearData,
            clearAgentHome,
            down_result: downResultDetails,
            removed_paths: deleteResult.removedPaths,
            failed_paths: deleteResult.failedPaths,
            preserved_paths: deleteResult.preservedPaths,
            failed_path_errors: deleteResult.failedPathErrors,
          },
        });
        return {
          ok: false,
          stage: "uninstall-configure-profile",
          message: removeProfileResult.message || "failed to remove managed profile after uninstall",
          details: {
            localRoot,
            clearData,
            clearAgentHome,
            down_result: downResultDetails,
            removed_paths: deleteResult.removedPaths,
            failed_paths: deleteResult.failedPaths,
            preserved_paths: deleteResult.preservedPaths,
            failed_path_errors: deleteResult.failedPathErrors,
          },
        };
      }
      advanceUninstallProgress("uninstall-profile");
      appendLocalRuntimeLog({
        level: "info",
        operation: "uninstall-profile",
        stage: "uninstall-profile-complete",
        message: "managed profile removed after uninstall",
      });
      if (downInvokedAndSucceeded) {
        emitLocalRuntimeToast("runtime-down");
      }
      appendLocalRuntimeLog({
        level: "info",
        operation: "uninstall-complete",
        stage: "uninstall-complete",
        message: "managed local runtime uninstalled and profile removed",
        details: {
          localRoot,
          clearData,
          clearAgentHome,
          down_result: downResultDetails,
          removed_paths: deleteResult.removedPaths,
          failed_paths: deleteResult.failedPaths,
          preserved_paths: deleteResult.preservedPaths,
        },
      });
      return {
        ok: true,
        stage: "uninstall-complete",
        message: "managed local runtime uninstalled and profile removed",
        details: {
          localRoot,
          clearData,
          clearAgentHome,
          down_result: downResultDetails,
          removed_paths: deleteResult.removedPaths,
          failed_paths: deleteResult.failedPaths,
          preserved_paths: deleteResult.preservedPaths,
        },
      };
    } finally {
      clearActionProgress();
    }
  });
}

export async function startLocalRuntime(): Promise<SkillRunnerLocalRuntimeActionResult> {
  const state = readManagedLocalRuntimeState();
  const backendId = normalizeString(state.managedBackendId);
  if (!backendId) {
    return {
      ok: false,
      stage: "start-backend",
      message: "managed local runtime backend id is missing",
    };
  }
  writeManagedLocalRuntimeState({
    ...state,
    runtimeState: state.runtimeState === "running" ? "running" : "starting",
  });
  const ensure = await ensureManagedLocalRuntimeForBackend(backendId, {
    ignoreAutoStartPaused: true,
  });
  if (!ensure.ok) {
    return {
      ok: false,
      stage: "start-ensure",
      message: ensure.message,
      details: ensure.details,
    };
  }
  return {
    ok: true,
    stage: "start-complete",
    message: "managed local runtime start requested",
    details: ensure.details,
  };
}

export async function runLocalDoctor(): Promise<SkillRunnerLocalRuntimeActionResult> {
  const installDir = getManagedInstallDir();
  if (!installDir) {
    return {
      ok: false,
      stage: "doctor",
      message: "managed local runtime is not configured yet",
    };
  }
  const bridge = getCtlBridge();
  const result = await runLocalBridgeDoctor({
    bridge,
    state: readManagedLocalRuntimeState(),
  });
  return resultFromCtl("doctor", result);
}

export async function ensureManagedLocalRuntimeForBackend(
  backendId: string,
  options?: EnsureManagedLocalRuntimeOptions,
): Promise<SkillRunnerLocalRuntimeActionResult> {
  return withRuntimeControlLock(async () => {
    const normalizedBackendId = normalizeString(backendId);
    let state = readManagedLocalRuntimeState();
    if (!normalizedBackendId || state.managedBackendId !== normalizedBackendId) {
      return {
        ok: true,
        stage: "ensure-skipped",
        message: "backend is not managed by local runtime bootstrap",
      };
    }
    if (!options?.ignoreAutoStartPaused && isAutoStartPaused()) {
      return {
        ok: true,
        stage: "ensure-skipped-paused",
        message: "managed local runtime auto start is disabled",
      };
    }
    const installDir = resolveEffectiveInstallDir(state);
    if (!installDir) {
      return {
        ok: false,
        stage: "ensure",
        message: "managed local runtime installDir is missing",
      };
    }
    const bridge = getCtlBridge();
    let endpoint = resolveRuntimeEndpoint(state);
    const status = await runLocalBridgeStatus({
      bridge,
      state,
      host: endpoint.host,
      port: endpoint.port,
    });
    state = applyRuntimeEndpointFromDetails(state, status.details);
    endpoint = resolveRuntimeEndpoint(state);
    const statusRunning = status.ok && isStatusRunning(status);
    let didRunUp = false;
    let preflightResult: SkillRunnerCtlCommandResult | undefined;
    if (!statusRunning) {
      const backgroundAction = normalizeString(options?.backgroundInFlightAction);
      if (backgroundAction) {
        setBackgroundInFlightAction(backgroundAction);
      }
      try {
        state = applyRuntimeStatePatch({
          state,
          runtimeState: "starting",
          runtimeError: normalizeString(
            status.details?.status || status.message || "runtime not running",
          ),
        });
        preflightResult = await runLocalBridgePreflight({
          bridge,
          state,
          host: endpoint.host,
          port: endpoint.requestedPort,
          portFallbackSpan: endpoint.portFallbackSpan,
        });
        if (!preflightResult.ok) {
          setAutoStartEnabledInSession(false);
          const nextFailureCount = (state.runtimeFailureCount || 0) + 1;
          state = applyRuntimeStatePatch({
            state,
            runtimeState: "degraded",
            runtimeFailureCount: nextFailureCount,
            runtimeError: normalizeString(preflightResult.message) || "preflight failed",
          });
          return {
            ok: false,
            stage: "ensure-preflight",
            message: normalizeString(preflightResult.message) || "managed local runtime preflight failed",
            details: {
              runtimeState: state.runtimeState,
              runtimeFailureCount: state.runtimeFailureCount || 0,
              lastRuntimeError: state.lastRuntimeError,
              preflight: preflightResult.details,
            },
          };
        }
        setAutoStartEnabledInSession(true);
        const up = await runLocalBridgeUp({
          bridge,
          state,
          host: endpoint.host,
          port: endpoint.requestedPort,
          portFallbackSpan: endpoint.portFallbackSpan,
        });
        state = applyRuntimeEndpointFromDetails(state, up.details);
        endpoint = resolveRuntimeEndpoint(state);
        if (!up.ok) {
          const nextFailureCount = (state.runtimeFailureCount || 0) + 1;
          state = applyRuntimeStatePatch({
            state,
            runtimeState: "degraded",
            runtimeFailureCount: nextFailureCount,
            runtimeError: normalizeString(up.message) || "ctl up failed",
          });
          return {
            ok: false,
            stage: "ensure-up",
            message: normalizeString(up.message) || "managed local runtime up failed",
            details: {
              runtimeState: state.runtimeState,
              runtimeFailureCount: state.runtimeFailureCount || 0,
              lastRuntimeError: state.lastRuntimeError,
              preflight: preflightResult.details,
            },
          };
        }
        didRunUp = true;
        const statusPoll = await pollStatusUntilRunning({
          bridge,
          state,
          host: endpoint.host,
          port: endpoint.port,
        });
        if (statusPoll.status) {
          state = applyRuntimeEndpointFromDetails(state, statusPoll.status.details);
          endpoint = resolveRuntimeEndpoint(state);
        }
        if (!statusPoll.ok) {
          const nextFailureCount = (state.runtimeFailureCount || 0) + 1;
          state = applyRuntimeStatePatch({
            state,
            runtimeState: "degraded",
            runtimeFailureCount: nextFailureCount,
            runtimeError: normalizeString(
              statusPoll.status?.details?.status ||
                statusPoll.status?.message ||
                "runtime not running after up",
            ),
          });
          return {
            ok: false,
            stage: "ensure-status",
            message: `runtime status is not running: ${normalizeString(
              statusPoll.status?.details?.status ||
                statusPoll.status?.message ||
                "unknown",
            )}`,
            details: {
              statusTrail: statusPoll.trail,
              statusAttempts: statusPoll.attempts,
              runtimeState: state.runtimeState,
              runtimeFailureCount: state.runtimeFailureCount || 0,
              lastRuntimeError: state.lastRuntimeError,
              preflight: preflightResult.details,
            },
          };
        }
      } finally {
        if (backgroundAction) {
          setBackgroundInFlightAction("");
        }
      }
    }
    state = applyRuntimeStatePatch({
      state,
      runtimeState: "running",
      runtimeFailureCount: 0,
      runtimeError: "",
    });
    const profileSyncResult = await syncManagedProfileIfExists(
      resolveManagedBaseUrl(state),
    );
    if (!profileSyncResult.ok) {
      return {
        ok: false,
        stage: "ensure-configure-profile",
        message: profileSyncResult.message,
        conflict: profileSyncResult.conflict,
      };
    }
    const leaseAcquire = await tryAcquireLeaseOnRunning();
    state = leaseAcquire.state;
    if (!leaseAcquire.ok) {
      state = applyRuntimeStatePatch({
        state,
        runtimeState: "degraded",
        runtimeFailureCount: state.runtimeFailureCount || 0,
        runtimeError: normalizeString(leaseAcquire.reason) || "lease acquire failed",
      });
      return {
        ok: false,
        stage: "ensure-lease",
        message: `managed local runtime lease acquire failed: ${normalizeString(
          leaseAcquire.reason || "unknown",
        )}`,
        details: {
          runtimeState: state.runtimeState,
          runtimeFailureCount: state.runtimeFailureCount || 0,
          leaseState: resolveLeaseViewState(state.lease),
          leaseError: state.lease?.lastError,
          preflight: preflightResult?.details,
        },
      };
    }
    const managedBackendId = normalizeString(state.managedBackendId);
    if (managedBackendId) {
      registerSkillRunnerBackendForHealthTracking(managedBackendId);
      markSkillRunnerBackendHealthSuccess(managedBackendId);
    }
    const finalEndpoint = resolveRuntimeEndpoint(state);
    if (didRunUp) {
      triggerSilentManagedModelCacheRefresh(state);
      triggerManagedLocalRuntimePostUpTaskReconcile(state);
      emitLocalRuntimeToast("runtime-up");
    }
    return {
      ok: true,
      stage: "ensure-complete",
      message: "managed local runtime ensured (running + lease acquired)",
      details: {
        baseUrl: resolveManagedBaseUrl(state),
        actualHost: finalEndpoint.host,
        actualPort: finalEndpoint.port,
        actualUrl: finalEndpoint.url,
        requestedPort: state.requestedPort || finalEndpoint.requestedPort,
        portFallbackSpan: state.portFallbackSpan ?? finalEndpoint.portFallbackSpan,
        portFallbackUsed: state.portFallbackUsed === true,
        triedPorts: state.triedPorts || [],
        runtimeState: state.runtimeState,
        leaseState: resolveLeaseViewState(state.lease),
        runtimeFailureCount: state.runtimeFailureCount || 0,
        preflight: preflightResult?.details,
      },
    };
  });
}

export async function releaseManagedLocalRuntimeLeaseOnShutdown() {
  clearStatusReconcileTimer();
  clearHeartbeatTimer();
  const state = readManagedLocalRuntimeState();
  const lease = state.lease || {};
  if (!lease.acquired) {
    return;
  }
  const leaseId = normalizeString(lease.leaseId);
  if (!leaseId) {
    state.lease = {
      ...lease,
      acquired: false,
      leaseId: undefined,
      lastHeartbeatAt: nowIso(),
      lastError: "lease release skipped because lease_id is missing",
    };
    writeManagedLocalRuntimeState(state);
    return;
  }
  const response = await postLease("/v1/local-runtime/lease/release", {
    lease_id: leaseId,
  });
  state.lease = {
    ...lease,
    acquired: false,
    leaseId: undefined,
    lastHeartbeatAt: nowIso(),
    lastError: response.ok
      ? undefined
      : normalizeString(response.body?.detail) || response.error || "lease release failed",
  };
  writeManagedLocalRuntimeState(state);
}
