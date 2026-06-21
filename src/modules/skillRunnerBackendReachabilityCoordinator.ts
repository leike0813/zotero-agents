import {
  createBackendsPrefsDocument,
  loadBackendsRegistry,
} from "../backends/registry";
import type { BackendInstance } from "../backends/types";
import { resolveBackendDisplayName } from "../backends/displayName";
import { setPref } from "../utils/prefs";
import { refreshWorkflowMenus } from "./workflowMenu";
import { appendRuntimeLog } from "./runtimeLogManager";
import { showWorkflowToast } from "./workflowExecution/feedbackSeam";
import { SkillRunnerManagementClient } from "../providers/skillrunner/managementClient";
import {
  SKILLRUNNER_BACKEND_ENABLE_PROBE_DEBOUNCE_MS,
  SKILLRUNNER_BACKEND_PROBE_TICK_MS,
  deferSkillRunnerBackendProbe,
  markSkillRunnerBackendDisabled,
  markSkillRunnerBackendHealthFailure,
  markSkillRunnerBackendHealthSuccess,
  markSkillRunnerBackendProbeStarted,
  registerSkillRunnerBackendForHealthTracking,
  resetSkillRunnerBackendHealthRegistryForTests,
  shouldAutoDisableSkillRunnerBackend,
  shouldProbeSkillRunnerBackendNow,
  syncSkillRunnerBackendHealthForConfiguredBackends,
} from "./skillRunnerBackendHealthRegistry";
import { registerBackgroundRefreshTimer } from "./backgroundRefreshGovernance";

const BACKENDS_CONFIG_PREF_KEY = "backendsConfigJson";

type ProbeSource = "startup" | "periodic" | "settings" | "manual-enable";

const pendingProbeTimers = new Map<string, ReturnType<typeof setTimeout>>();
const inFlightProbes = new Set<string>();
let coordinatorTimer: ReturnType<typeof setInterval> | undefined;
let coordinatorStarted = false;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isSkipError(error: unknown) {
  return (
    normalizeString((error as { name?: unknown })?.name) ===
    "SkillRunnerConnectionSkippedError"
  );
}

function isSkillRunnerBackend(backend: BackendInstance) {
  return normalizeString(backend.type) === "skillrunner";
}

function isBackendEnabled(backend: BackendInstance) {
  return backend.enabled !== false;
}

function showAutoDisabledToast(backend: BackendInstance) {
  const displayName =
    resolveBackendDisplayName(backend.id, backend.displayName) || backend.id;
  showWorkflowToast(
    {
      text: `SkillRunner backend ${displayName} was disabled after 6 hours without a successful connection. Re-enable it in Backend Manager to probe again.`,
      type: "error",
      semantic: "runtime",
    },
    {
      sticky: true,
      bounded: true,
    },
  );
}

async function autoDisableBackend(backend: BackendInstance) {
  const loaded = await loadBackendsRegistry();
  if (loaded.fatalError) {
    return;
  }
  let changed = false;
  const nextBackends = loaded.backends.map((entry) => {
    if (entry.id !== backend.id || !isSkillRunnerBackend(entry)) {
      return entry;
    }
    if (entry.enabled === false) {
      return entry;
    }
    changed = true;
    return {
      ...entry,
      enabled: false,
    };
  });
  if (!changed) {
    return;
  }
  setPref(
    BACKENDS_CONFIG_PREF_KEY,
    JSON.stringify(createBackendsPrefsDocument(nextBackends)),
  );
  syncSkillRunnerBackendHealthForConfiguredBackends(nextBackends, {
    prune: true,
  });
  markSkillRunnerBackendDisabled(backend.id);
  refreshWorkflowMenus();
  showAutoDisabledToast(backend);
  appendRuntimeLog({
    level: "warn",
    scope: "provider",
    backendId: backend.id,
    backendType: "skillrunner",
    providerId: "skillrunner",
    component: "skillrunner-reachability",
    operation: "backend-auto-disable",
    phase: "health",
    stage: "backend-auto-disabled",
    message: "skillrunner backend auto-disabled after reachability silence",
  });
}

async function loadConfiguredSkillRunnerBackends() {
  const loaded = await loadBackendsRegistry();
  if (loaded.fatalError) {
    return [] as BackendInstance[];
  }
  syncSkillRunnerBackendHealthForConfiguredBackends(loaded.backends, {
    prune: true,
  });
  return loaded.backends.filter(isSkillRunnerBackend);
}

async function probeBackend(backend: BackendInstance, source: ProbeSource) {
  const backendId = normalizeString(backend.id);
  if (!backendId || !isBackendEnabled(backend)) {
    markSkillRunnerBackendDisabled(backendId);
    return;
  }
  if (inFlightProbes.has(backendId)) {
    return;
  }
  if (!shouldProbeSkillRunnerBackendNow(backendId)) {
    return;
  }
  if (shouldAutoDisableSkillRunnerBackend(backendId)) {
    await autoDisableBackend(backend);
    return;
  }
  inFlightProbes.add(backendId);
  markSkillRunnerBackendProbeStarted(backendId);
  try {
    const client = new SkillRunnerManagementClient({
      baseUrl: backend.baseUrl,
      backendId,
    });
    await client.probeReachability({
      allowGetFallback: true,
      lane: "health",
    });
    markSkillRunnerBackendHealthSuccess(backendId);
    appendRuntimeLog({
      level: "info",
      scope: "provider",
      backendId,
      backendType: "skillrunner",
      providerId: "skillrunner",
      component: "skillrunner-reachability",
      operation: "backend-probe",
      phase: source,
      stage: "backend-probe-succeeded",
      message: "skillrunner backend reachability probe succeeded",
    });
  } catch (error) {
    if (isSkipError(error)) {
      deferSkillRunnerBackendProbe({
        backendId,
        delayMs: SKILLRUNNER_BACKEND_PROBE_TICK_MS,
      });
      return;
    }
    markSkillRunnerBackendHealthFailure({
      backendId,
      error,
    });
    appendRuntimeLog({
      level: "warn",
      scope: "provider",
      backendId,
      backendType: "skillrunner",
      providerId: "skillrunner",
      component: "skillrunner-reachability",
      operation: "backend-probe",
      phase: source,
      stage: "backend-probe-failed",
      message: "skillrunner backend reachability probe failed",
      error,
    });
  } finally {
    inFlightProbes.delete(backendId);
  }
}

async function runProbeSweep(source: ProbeSource, backendId?: string) {
  const targetBackendId = normalizeString(backendId);
  const backends = await loadConfiguredSkillRunnerBackends();
  await Promise.all(
    backends
      .filter((backend) => {
        if (targetBackendId && backend.id !== targetBackendId) {
          return false;
        }
        return isBackendEnabled(backend);
      })
      .map((backend) => probeBackend(backend, source)),
  );
}

export function scheduleSkillRunnerBackendReachabilityProbe(args?: {
  backendId?: string;
  source?: ProbeSource;
  delayMs?: number;
}) {
  const backendId = normalizeString(args?.backendId);
  const key = backendId || "*";
  const existing = pendingProbeTimers.get(key);
  if (existing) {
    clearTimeout(existing);
  }
  const delayMs = Math.max(
    0,
    Number(args?.delayMs ?? SKILLRUNNER_BACKEND_ENABLE_PROBE_DEBOUNCE_MS),
  );
  const timer = setTimeout(() => {
    pendingProbeTimers.delete(key);
    void runProbeSweep(args?.source || "settings", backendId).catch((error) => {
      appendRuntimeLog({
        level: "warn",
        scope: "provider",
        backendId: backendId || undefined,
        backendType: "skillrunner",
        providerId: "skillrunner",
        component: "skillrunner-reachability",
        operation: "probe-sweep",
        phase: args?.source || "settings",
        stage: "probe-sweep-failed",
        message: "skillrunner reachability probe sweep failed",
        error,
      });
    });
  }, delayMs);
  pendingProbeTimers.set(key, timer);
}

export function startSkillRunnerBackendReachabilityCoordinator() {
  if (coordinatorStarted) {
    return;
  }
  coordinatorStarted = true;
  scheduleSkillRunnerBackendReachabilityProbe({
    source: "startup",
    delayMs: 0,
  });
  registerBackgroundRefreshTimer({
    owner: "skillrunner-backend-reachability",
    activationCondition: "reachability coordinator started",
    scopeKey: "configured SkillRunner backend health state",
    allowedDataSources: ["backend registry", "backend health registry"],
    maxReadShape: "configured backend probe metadata only",
    requiresForegroundSurface: false,
    minimumIntervalMs: SKILLRUNNER_BACKEND_PROBE_TICK_MS,
    intervalMs: SKILLRUNNER_BACKEND_PROBE_TICK_MS,
  });
  coordinatorTimer = setInterval(() => {
    void runProbeSweep("periodic").catch((error) => {
      appendRuntimeLog({
        level: "warn",
        scope: "provider",
        backendType: "skillrunner",
        providerId: "skillrunner",
        component: "skillrunner-reachability",
        operation: "probe-sweep",
        phase: "periodic",
        stage: "probe-sweep-failed",
        message: "skillrunner periodic reachability probe sweep failed",
        error,
      });
    });
  }, SKILLRUNNER_BACKEND_PROBE_TICK_MS);
}

export function stopSkillRunnerBackendReachabilityCoordinator() {
  coordinatorStarted = false;
  if (coordinatorTimer) {
    clearInterval(coordinatorTimer);
    coordinatorTimer = undefined;
  }
  for (const timer of pendingProbeTimers.values()) {
    clearTimeout(timer);
  }
  pendingProbeTimers.clear();
  inFlightProbes.clear();
}

export function resetSkillRunnerBackendReachabilityCoordinatorForTests() {
  stopSkillRunnerBackendReachabilityCoordinator();
  resetSkillRunnerBackendHealthRegistryForTests();
}

export function getSkillRunnerBackendReachabilityCoordinatorRuntimeForTests() {
  return {
    started: coordinatorStarted,
    pendingProbeTimerCount: pendingProbeTimers.size,
    inFlightProbeCount: inFlightProbes.size,
    timerActive: !!coordinatorTimer,
  };
}
