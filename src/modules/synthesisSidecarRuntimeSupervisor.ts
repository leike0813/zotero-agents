import {
  SYNTHESIS_SIDECAR_LAUNCH_CONFIG_SCHEMA,
  SYNTHESIS_SIDECAR_PROTOCOL,
  rebuildSynthesisProductionDiscovery,
  rebuildSynthesisSidecarLaunchConfig,
  type SynthesisProductionDiscovery,
  type SynthesisProductionHealth,
  type SynthesisSidecarObservationEvent,
  type SynthesisWorkbenchSidecarStatus,
} from "../../packages/synthesis-contracts/src";
import { sha256Hex } from "../platform/hash";
import { joinPath } from "../utils/path";
import {
  getMozillaSubprocessModule,
  yieldToEventLoop,
} from "../utils/runtimeCompatibility";
import {
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  getSynthesisSidecarLifecyclePaths,
  readRuntimeTextFile,
  removeRuntimePath,
  replacePrivateRuntimeTextFileAtomically,
} from "./runtimePersistence";
import { SYNTHESIS_SCHEMA_VERSION } from "./synthesis/foundation";
import {
  createSynthesisProductionSidecarControlClient,
  type SynthesisProductionSidecarControlConnection,
} from "./synthesisSidecarControlClient";
import {
  createSynthesisSidecarRuntimeInstaller,
  type SynthesisSidecarRuntimeInstallSnapshot,
  type SynthesisSidecarRuntimeInstaller,
} from "./synthesisSidecarRuntimeInstaller";
import { rebuildSynthesisSidecarObservationEvent } from "../../packages/synthesis-contracts/src/sidecarObservability";
import { isSynthesisSidecarDiagnosticsAvailable } from "./debugMode";
import { retainSynthesisSidecarNativeTraceEvent } from "./synthesisSidecarTrace";

type SubprocessModule = NonNullable<
  ReturnType<typeof getMozillaSubprocessModule>
>;
type SidecarProcess = Awaited<
  ReturnType<NonNullable<SubprocessModule["call"]>>
>;

export type SynthesisSidecarSupervisorStatus =
  | "stopped"
  | "starting"
  | "ready"
  | "unavailable"
  | "incompatible"
  | "stopping";

export type SynthesisSidecarSupervisorSnapshot = {
  status: SynthesisSidecarSupervisorStatus;
  recoveryState: "none" | "scheduled" | "manual-recovery-required";
  reasonCode?: string;
  profileId?: string;
  supervisorInstanceId?: string;
  serviceInstanceId?: string;
  bundleId?: string;
  serviceVersion?: string;
  healthObservedAt?: string;
  computePool?: SynthesisWorkbenchSidecarStatus["computePool"];
  restartCount: number;
  readyAt?: string;
  nextRestartAt?: string;
};

export function narrowSynthesisSidecarHealth(
  health: Pick<
    SynthesisProductionHealth,
    "serviceVersion" | "serviceInstanceId" | "bundleId" | "computePool"
  >,
) {
  return {
    serviceVersion: health.serviceVersion,
    serviceInstanceId: health.serviceInstanceId,
    bundleId: health.bundleId,
    computePool: {
      state: health.computePool.state,
      active: health.computePool.active,
      queued: health.computePool.queued,
    },
  } satisfies Pick<
    SynthesisWorkbenchSidecarStatus,
    "serviceVersion" | "serviceInstanceId" | "bundleId" | "computePool"
  >;
}

type ReverseHostLocator = {
  host: "127.0.0.1";
  port: number;
  authorizationToken: string;
};

type ControlClient = Pick<
  ReturnType<typeof createSynthesisProductionSidecarControlClient>,
  "health" | "handshake" | "shutdown"
>;

type BaseSupervisorOptions = {
  runtimeRoot?: string;
  profilePath?: string;
  libraryId?: number;
  repositoryDbPath?: string;
  canonicalRoot?: string;
  reverseHost?: ReverseHostLocator;
  installer?: SynthesisSidecarRuntimeInstaller;
  resolvedInstall?: SynthesisSidecarRuntimeInstallSnapshot;
  subprocess?: SubprocessModule | null;
  controlClient?: ControlClient;
  now?: () => number;
  randomHex?: (bytes: number) => string;
  setTimeout?: typeof globalThis.setTimeout;
  clearTimeout?: typeof globalThis.clearTimeout;
  discoveryTimeoutMs?: number;
  healthIntervalMs?: number;
  restartDelaysMs?: readonly number[];
  recordTraceEvent?: (event: SynthesisSidecarObservationEvent) => void;
  diagnosticsEnabled?: boolean;
};

export type SynthesisProductionRuntimeSupervisorOptions =
  BaseSupervisorOptions & {
    libraryId: number;
    repositoryDbPath: string;
    canonicalRoot: string;
    reverseHost: ReverseHostLocator;
  };

type Session = {
  paths: ReturnType<typeof getSynthesisSidecarLifecyclePaths>;
  install: SynthesisSidecarRuntimeInstallSnapshot;
  connection?: SynthesisProductionSidecarControlConnection;
  proc?: SidecarProcess;
  closed?: Promise<void>;
  stdoutTail: string;
  stderrTail: string;
  stdoutLineBuffer: string;
  stderrLineBuffer: string;
};

const DEFAULT_DISCOVERY_TIMEOUT_MS = 10_000;
const DEFAULT_HEALTH_INTERVAL_MS = 60_000;
const DEFAULT_RESTART_DELAYS_MS = [1_000, 5_000, 15_000] as const;
const DIAGNOSTIC_TAIL_LIMIT = 64 * 1024;
const DISCOVERY_POLL_MS = 100;

function errorCode(error: unknown) {
  return (
    (error instanceof Error ? error.message : String(error || ""))
      .trim()
      .split(/\s+/)[0]
      ?.slice(0, 128) || "sidecar_unknown_failure"
  );
}

function defaultRandomHex(byteCount: number) {
  const bytes = new Uint8Array(byteCount);
  const crypto = (globalThis as { crypto?: Crypto }).crypto;
  if (typeof crypto?.getRandomValues !== "function") {
    throw new Error("sidecar_secure_random_unavailable");
  }
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function normalizeProfilePath(pathRaw: string) {
  const normalized = String(pathRaw || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");
  if (!normalized) {
    throw new Error("sidecar_profile_path_unavailable");
  }
  return normalized;
}

function resolveProfilePath() {
  const runtime = globalThis as {
    Services?: {
      dirsvc?: {
        get?: (key: string, iface?: unknown) => { path?: string } | undefined;
      };
    };
    Components?: { interfaces?: { nsIFile?: unknown } };
  };
  return normalizeProfilePath(
    String(
      runtime.Services?.dirsvc?.get?.(
        "ProfD",
        runtime.Components?.interfaces?.nsIFile,
      )?.path || "",
    ),
  );
}

async function hashText(value: string) {
  return sha256Hex(new TextEncoder().encode(value));
}

function sealedEnvironment() {
  const source =
    (globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process?.env || {};
  const environment: Record<string, string> = {};
  for (const key of [
    "SystemRoot",
    "WINDIR",
    "TEMP",
    "TMP",
    "TMPDIR",
    "LANG",
    "LC_ALL",
    "TZ",
  ]) {
    const value = source[key];
    if (value) {
      environment[key] = value;
    }
  }
  return environment;
}

function appendTail(current: string, chunk: string) {
  const combined = `${current}${chunk}`;
  return combined.length <= DIAGNOSTIC_TAIL_LIMIT
    ? combined
    : combined.slice(-DIAGNOSTIC_TAIL_LIMIT);
}

export function parseNativeDiagnosticEvent(
  source: string,
): SynthesisSidecarObservationEvent | undefined {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return undefined;
  }
  try {
    const event = rebuildSynthesisSidecarObservationEvent(value);
    return event.source === "rust-sidecar" || event.source === "child-worker"
      ? event
      : undefined;
  } catch {
    return undefined;
  }
}

function waitForPromise(promise: Promise<unknown>, timeoutMs: number) {
  return Promise.race([
    promise.then(
      () => true,
      () => true,
    ),
    new Promise<boolean>((resolve) => {
      globalThis.setTimeout(() => resolve(false), timeoutMs);
    }),
  ]);
}

function validateInstall(
  install: SynthesisSidecarRuntimeInstallSnapshot,
): asserts install is SynthesisSidecarRuntimeInstallSnapshot & {
  bundleId: string;
  executablePath: string;
  buildFingerprint: string;
  targetTriple: string;
  serviceVersion: string;
  protocolVersion: typeof SYNTHESIS_SIDECAR_PROTOCOL;
  platformSignature: NonNullable<
    SynthesisSidecarRuntimeInstallSnapshot["platformSignature"]
  >;
} {
  if (
    install.state !== "ready" ||
    install.implementation !== "rust-native" ||
    !install.bundleId ||
    !install.executablePath ||
    !install.buildFingerprint ||
    !install.targetTriple ||
    !install.serviceVersion ||
    install.protocolVersion !== SYNTHESIS_SIDECAR_PROTOCOL ||
    !install.platformSignature
  ) {
    throw new Error(
      install.diagnostics[0]?.code || "synthesis_sidecar_runtime_unavailable",
    );
  }
}

export function createSynthesisProductionRuntimeSupervisor(
  options: SynthesisProductionRuntimeSupervisorOptions,
) {
  const persistence = getRuntimePersistencePaths();
  const runtimeRoot = options.runtimeRoot || persistence.runtimeRoot;
  const now = options.now || Date.now;
  const randomHex = options.randomHex || defaultRandomHex;
  const setTimer = options.setTimeout || globalThis.setTimeout;
  const clearTimer = options.clearTimeout || globalThis.clearTimeout;
  const discoveryTimeoutMs =
    options.discoveryTimeoutMs ?? DEFAULT_DISCOVERY_TIMEOUT_MS;
  const healthIntervalMs =
    options.healthIntervalMs ?? DEFAULT_HEALTH_INTERVAL_MS;
  const restartDelaysMs = options.restartDelaysMs ?? DEFAULT_RESTART_DELAYS_MS;
  const installer =
    options.installer ||
    createSynthesisSidecarRuntimeInstaller({ runtimeRoot });
  const subprocess =
    options.subprocess === undefined
      ? getMozillaSubprocessModule()
      : options.subprocess;
  const controlClient =
    options.controlClient || createSynthesisProductionSidecarControlClient();
  const diagnosticsEnabled =
    options.diagnosticsEnabled ?? isSynthesisSidecarDiagnosticsAvailable();

  let snapshot: SynthesisSidecarSupervisorSnapshot = {
    status: "stopped",
    recoveryState: "none",
    restartCount: 0,
  };
  let session: Session | null = null;
  let controlledStop = false;
  let restartTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  let healthTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  const subscribers = new Set<
    (value: SynthesisSidecarSupervisorSnapshot) => void
  >();

  const publish = (update: Partial<SynthesisSidecarSupervisorSnapshot>) => {
    snapshot = { ...snapshot, ...update };
    for (const subscriber of subscribers) {
      subscriber({ ...snapshot });
    }
  };

  const clearTimers = () => {
    if (restartTimer !== null) {
      clearTimer(restartTimer);
      restartTimer = null;
    }
    if (healthTimer !== null) {
      clearTimer(healthTimer);
      healthTimer = null;
    }
  };

  const drainStream = async (
    current: Session,
    stream: SidecarProcess["stdout"] | SidecarProcess["stderr"],
    kind: "stdout" | "stderr",
  ) => {
    if (typeof stream?.readString !== "function") {
      return;
    }
    for (;;) {
      const chunk = await stream.readString();
      if (!chunk) {
        return;
      }
      if (kind === "stderr" && !diagnosticsEnabled) {
        await yieldToEventLoop();
        continue;
      }
      if (kind === "stdout") {
        current.stdoutTail = appendTail(current.stdoutTail, chunk);
      } else {
        current.stderrTail = appendTail(current.stderrTail, chunk);
      }
      const bufferKey =
        kind === "stdout" ? "stdoutLineBuffer" : "stderrLineBuffer";
      const source = `${current[bufferKey]}${chunk}`;
      const lines = source.split(/\r?\n/);
      current[bufferKey] = lines.pop()?.slice(-DIAGNOSTIC_TAIL_LIMIT) || "";
      for (const line of lines) {
        const event =
          kind === "stderr" ? parseNativeDiagnosticEvent(line) : undefined;
        if (event) {
          retainSynthesisSidecarNativeTraceEvent(event);
          options.recordTraceEvent?.(event);
        }
      }
      await yieldToEventLoop();
    }
  };

  const stopProcess = async (current: Session) => {
    try {
      if (current.connection) {
        await controlClient.shutdown(current.connection).catch(() => undefined);
      }
    } finally {
      await current.proc?.stdin?.close?.().catch(() => undefined);
    }
    if (current.closed && (await waitForPromise(current.closed, 500))) {
      return;
    }
    try {
      current.proc?.kill?.(0);
    } catch {
      // The process may already have observed parent-pipe EOF.
    }
    if (current.closed) {
      await waitForPromise(current.closed, 200);
    }
  };

  const cleanupSession = async (current: Session) => {
    await removeRuntimePath(current.paths.sessionRoot).catch(() => false);
  };

  const classifyTerminal = (code: string) =>
    [
      "invalid_config",
      "unsupported_target",
      "sidecar_runtime_",
      "sidecar_discovery_identity_mismatch",
      "sidecar_health_identity_mismatch",
      "sidecar_handshake_identity_mismatch",
      "production_lock_conflict",
      "protocol_mismatch",
      "schema_mismatch",
      "profile_mismatch",
    ].some((prefix) => code.startsWith(prefix));

  const fail = async (code: string, current: Session | null) => {
    clearTimers();
    if (current) {
      await stopProcess(current);
      await cleanupSession(current);
    }
    if (session === current) {
      session = null;
    }
    if (controlledStop) {
      return;
    }
    const terminal = classifyTerminal(code);
    const restartCount = terminal
      ? snapshot.restartCount
      : snapshot.restartCount + 1;
    if (terminal || restartCount > restartDelaysMs.length) {
      publish({
        status: code.includes("mismatch") ? "incompatible" : "unavailable",
        recoveryState: "manual-recovery-required",
        reasonCode:
          terminal || restartCount <= restartDelaysMs.length
            ? code
            : "sidecar_crash_loop_fused",
        restartCount,
        nextRestartAt: undefined,
      });
      return;
    }
    const restartAt = now() + restartDelaysMs[restartCount - 1]!;
    publish({
      status: "unavailable",
      recoveryState: "scheduled",
      reasonCode: code,
      restartCount,
      nextRestartAt: new Date(restartAt).toISOString(),
    });
    restartTimer = setTimer(
      () => {
        restartTimer = null;
        void launch();
      },
      Math.max(0, restartAt - now()),
    );
  };

  const waitForDiscovery = async (current: Session) => {
    const deadline = now() + discoveryTimeoutMs;
    while (now() < deadline && session === current && !controlledStop) {
      const source = (
        await readRuntimeTextFile(current.paths.discoveryPath)
      ).trim();
      if (source) {
        try {
          return rebuildSynthesisProductionDiscovery(JSON.parse(source));
        } catch {
          throw new Error("sidecar_discovery_identity_mismatch");
        }
      }
      await new Promise<void>((resolve) => {
        setTimer(resolve, DISCOVERY_POLL_MS);
      });
    }
    throw new Error("sidecar_discovery_timeout");
  };

  const scheduleHealth = (current: Session) => {
    if (healthIntervalMs <= 0 || controlledStop || session !== current) {
      return;
    }
    healthTimer = setTimer(async () => {
      healthTimer = null;
      if (!current.connection || controlledStop || session !== current) {
        return;
      }
      try {
        const health = await controlClient.health(current.connection);
        publish({
          ...narrowSynthesisSidecarHealth(health),
          healthObservedAt: new Date(now()).toISOString(),
        });
        if (health.computePool.state === "degraded") {
          await fail("sidecar_compute_pool_degraded", current);
          return;
        }
        scheduleHealth(current);
      } catch {
        await fail("sidecar_health_failed", current);
      }
    }, healthIntervalMs);
  };

  async function launch() {
    clearTimers();
    publish({
      status: "starting",
      recoveryState: "none",
      reasonCode: undefined,
      readyAt: undefined,
      nextRestartAt: undefined,
    });
    let current: Session | null = null;
    try {
      if (!subprocess?.call) {
        throw new Error("sidecar_subprocess_unavailable");
      }
      const profilePath = normalizeProfilePath(
        options.profilePath || resolveProfilePath(),
      );
      const profileId = await hashText(profilePath);
      const supervisorInstanceId = `sup-${randomHex(16)}`;
      const paths = getSynthesisSidecarLifecyclePaths({
        runtimeRoot,
        profileId,
        supervisorInstanceId,
      });
      await ensureRuntimeDirectory(paths.sessionRoot);
      const install =
        options.resolvedInstall ?? (await installer.ensureInstalled());
      validateInstall(install);
      current = {
        paths,
        install,
        stdoutTail: "",
        stderrTail: "",
        stdoutLineBuffer: "",
        stderrLineBuffer: "",
      };
      session = current;
      const config = rebuildSynthesisSidecarLaunchConfig({
        schema: SYNTHESIS_SIDECAR_LAUNCH_CONFIG_SCHEMA,
        profileId,
        libraryId: options.libraryId ?? 1,
        profileRuntimeRoot: paths.sessionRoot,
        runtimeRootId: await hashText(runtimeRoot),
        dataRootId: await hashText(options.canonicalRoot),
        bundleId: install.bundleId,
        implementation: install.implementation,
        target: install.target,
        targetTriple: install.targetTriple,
        buildFingerprint: install.buildFingerprint,
        platformSignature: install.platformSignature,
        serviceVersion: install.serviceVersion,
        protocolVersion: install.protocolVersion,
        schemaVersion: SYNTHESIS_SCHEMA_VERSION,
        supervisorInstanceId,
        diagnosticsEnabled,
        repositoryDbPath: options.repositoryDbPath,
        canonicalRoot: options.canonicalRoot,
        reverseHost: options.reverseHost,
        clientToken: randomHex(32),
        lifecycleToken: randomHex(32),
        port: 0,
      });
      await replacePrivateRuntimeTextFileAtomically(
        paths.configPath,
        `${JSON.stringify(config)}\n`,
      );
      const proc = await subprocess.call({
        command: install.executablePath,
        arguments: ["serve", "--config", paths.configPath],
        workdir: paths.sessionRoot,
        environment: sealedEnvironment(),
      });
      current.proc = proc;
      void drainStream(current, proc.stdout, "stdout").catch(() => undefined);
      void drainStream(current, proc.stderr, "stderr").catch(() => undefined);
      current.closed = Promise.resolve()
        .then(() => proc.wait?.())
        .then(() => undefined);
      void current.closed.finally(() => {
        if (
          session === current &&
          !controlledStop &&
          snapshot.status !== "starting"
        ) {
          void fail("sidecar_process_exited", current);
        }
      });
      const discovery = await waitForDiscovery(current);
      if (
        discovery.profileId !== profileId ||
        discovery.supervisorInstanceId !== supervisorInstanceId ||
        discovery.bundleId !== install.bundleId ||
        discovery.buildFingerprint !== install.buildFingerprint ||
        discovery.schemaVersion !== SYNTHESIS_SCHEMA_VERSION ||
        discovery.runtimeRootId !== config.runtimeRootId ||
        discovery.dataRootId !== config.dataRootId
      ) {
        throw new Error("sidecar_discovery_identity_mismatch");
      }
      const connection: SynthesisProductionSidecarControlConnection = {
        discovery,
        clientToken: config.clientToken,
        lifecycleToken: config.lifecycleToken,
      };
      const health = await controlClient.health(connection);
      await controlClient.handshake(connection);
      current.connection = connection;
      publish({
        status: "ready",
        recoveryState: "none",
        reasonCode: undefined,
        profileId,
        supervisorInstanceId,
        ...narrowSynthesisSidecarHealth(health),
        healthObservedAt: new Date(now()).toISOString(),
        readyAt: new Date(now()).toISOString(),
        nextRestartAt: undefined,
      });
      scheduleHealth(current);
    } catch (error) {
      await fail(errorCode(error), current);
    }
  }

  async function stop() {
    controlledStop = true;
    clearTimers();
    const current = session;
    publish({
      status: "stopping",
      recoveryState: "none",
      nextRestartAt: undefined,
    });
    if (current) {
      await stopProcess(current);
      await cleanupSession(current);
    }
    if (session === current) {
      session = null;
    }
    publish({
      status: "stopped",
      recoveryState: "none",
      reasonCode: undefined,
      profileId: undefined,
      supervisorInstanceId: undefined,
      serviceInstanceId: undefined,
      bundleId: undefined,
      serviceVersion: undefined,
      healthObservedAt: undefined,
      computePool: undefined,
      readyAt: undefined,
      nextRestartAt: undefined,
      restartCount: 0,
    });
  }

  return {
    start() {
      if (
        snapshot.status === "starting" ||
        snapshot.status === "ready" ||
        snapshot.recoveryState === "scheduled"
      ) {
        return;
      }
      controlledStop = false;
      void launch();
    },
    stop,
    recover() {
      if (snapshot.recoveryState !== "manual-recovery-required") {
        return;
      }
      controlledStop = false;
      publish({ restartCount: 0, reasonCode: undefined });
      void launch();
    },
    getSnapshot() {
      return { ...snapshot };
    },
    getDiagnosticEvidence() {
      return {
        snapshot: { ...snapshot },
        stdoutTail: session?.stdoutTail || "",
        stderrTail: session?.stderrTail || "",
      };
    },
    subscribe(subscriber: (value: SynthesisSidecarSupervisorSnapshot) => void) {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
    getReadyConnection() {
      return snapshot.status === "ready" && session?.connection
        ? { ...session.connection }
        : null;
    },
    async observeHealth() {
      const current = session;
      if (
        snapshot.status !== "ready" ||
        !current?.connection ||
        controlledStop
      ) {
        return { ...snapshot };
      }
      try {
        const health = await controlClient.health(current.connection);
        publish({
          ...narrowSynthesisSidecarHealth(health),
          healthObservedAt: new Date(now()).toISOString(),
        });
        if (health.computePool.state === "degraded") {
          await fail("sidecar_compute_pool_degraded", current);
        }
      } catch {
        await fail("sidecar_health_failed", current);
      }
      return { ...snapshot };
    },
  };
}

export function createSynthesisSidecarRuntimeSupervisor(
  options: BaseSupervisorOptions = {},
) {
  const persistence = getRuntimePersistencePaths();
  return createSynthesisProductionRuntimeSupervisor({
    ...options,
    libraryId: options.libraryId ?? 1,
    repositoryDbPath: options.repositoryDbPath || persistence.synthesisDbPath,
    canonicalRoot: options.canonicalRoot || persistence.synthesisDataRoot,
    reverseHost:
      options.reverseHost ||
      ({
        host: "127.0.0.1",
        port: 1,
        authorizationToken: "0".repeat(64),
      } satisfies ReverseHostLocator),
  });
}

let defaultSupervisor: ReturnType<
  typeof createSynthesisSidecarRuntimeSupervisor
> | null = null;
let productionSupervisor: ReturnType<
  typeof createSynthesisProductionRuntimeSupervisor
> | null = null;

function getDefaultSupervisor() {
  defaultSupervisor ||= createSynthesisSidecarRuntimeSupervisor();
  return defaultSupervisor;
}

export function startSynthesisSidecarRuntimeSupervisor() {
  getDefaultSupervisor().start();
}

export function stopSynthesisSidecarRuntimeSupervisor() {
  return getDefaultSupervisor().stop();
}

export function recoverSynthesisSidecarRuntimeSupervisor() {
  return getDefaultSupervisor().recover();
}

export function getSynthesisSidecarRuntimeSupervisorSnapshot() {
  return getDefaultSupervisor().getSnapshot();
}

export function subscribeSynthesisSidecarRuntimeSupervisor(
  subscriber: (value: SynthesisSidecarSupervisorSnapshot) => void,
) {
  return getDefaultSupervisor().subscribe(subscriber);
}

export function getReadySynthesisSidecarControlConnection() {
  return getDefaultSupervisor().getReadyConnection();
}

export function startSynthesisProductionRuntimeSupervisor(
  options: SynthesisProductionRuntimeSupervisorOptions,
) {
  if (productionSupervisor) {
    throw new Error("production_supervisor_already_configured");
  }
  productionSupervisor = createSynthesisProductionRuntimeSupervisor(options);
  productionSupervisor.start();
  return productionSupervisor;
}

export async function stopSynthesisProductionRuntimeSupervisor() {
  const current = productionSupervisor;
  productionSupervisor = null;
  await current?.stop();
}

export function getReadySynthesisProductionControlConnection() {
  return productionSupervisor?.getReadyConnection() ?? null;
}

function workbenchSidecarStatus(
  value: SynthesisSidecarSupervisorSnapshot | undefined,
): SynthesisWorkbenchSidecarStatus {
  const snapshot = value || {
    status: "stopped" as const,
    recoveryState: "none" as const,
    restartCount: 0,
  };
  return {
    lifecycle: snapshot.status,
    recoveryState: snapshot.recoveryState,
    ...(snapshot.reasonCode ? { reasonCode: snapshot.reasonCode } : {}),
    ...(snapshot.healthObservedAt
      ? { healthObservedAt: snapshot.healthObservedAt }
      : {}),
    ...(snapshot.serviceInstanceId
      ? { serviceInstanceId: snapshot.serviceInstanceId }
      : {}),
    ...(snapshot.serviceVersion
      ? { serviceVersion: snapshot.serviceVersion }
      : {}),
    ...(snapshot.bundleId ? { bundleId: snapshot.bundleId } : {}),
    ...(snapshot.nextRestartAt
      ? { nextRestartAt: snapshot.nextRestartAt }
      : {}),
    ...(snapshot.computePool
      ? { computePool: { ...snapshot.computePool } }
      : {}),
  };
}

export function getSynthesisWorkbenchSidecarStatus() {
  return workbenchSidecarStatus(
    productionSupervisor?.getSnapshot() ?? defaultSupervisor?.getSnapshot(),
  );
}

export function subscribeSynthesisWorkbenchSidecarStatus(
  subscriber: (value: SynthesisWorkbenchSidecarStatus) => void,
) {
  const supervisor = productionSupervisor ?? defaultSupervisor;
  if (!supervisor) return () => undefined;
  subscriber(workbenchSidecarStatus(supervisor.getSnapshot()));
  return supervisor.subscribe((snapshot) =>
    subscriber(workbenchSidecarStatus(snapshot)),
  );
}

export async function observeSynthesisWorkbenchSidecarStatus() {
  const supervisor = productionSupervisor ?? defaultSupervisor;
  if (supervisor) await supervisor.observeHealth();
  return getSynthesisWorkbenchSidecarStatus();
}

export async function resetSynthesisSidecarRuntimeSupervisorForTests() {
  if (defaultSupervisor) {
    await defaultSupervisor.stop();
    defaultSupervisor = null;
  }
  await stopSynthesisProductionRuntimeSupervisor();
}

export const synthesisSidecarRuntimeSupervisorInternalsForTests = {
  sealedEnvironment,
  appendTail,
  normalizeProfilePath,
  DEFAULT_DISCOVERY_TIMEOUT_MS,
  DEFAULT_HEALTH_INTERVAL_MS,
  DEFAULT_RESTART_DELAYS_MS,
  DIAGNOSTIC_TAIL_LIMIT,
};
