import {
  SYNTHESIS_SIDECAR_LAUNCH_CONFIG_SCHEMA,
  SYNTHESIS_SIDECAR_LEASE_SCHEMA,
  SYNTHESIS_SIDECAR_PROTOCOL,
  SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
  SYNTHESIS_PRODUCTION_RUNTIME_ADMISSION_SCHEMA,
  rebuildSynthesisProductionAdmission,
  rebuildSynthesisProductionRuntimeAdmission,
  rebuildSynthesisProductionDiscovery,
  rebuildSynthesisSidecarDiscovery,
  rebuildSynthesisSidecarLaunchConfig,
  type SynthesisProductionAdmission,
  type SynthesisProductionRuntimeAdmission,
  type SynthesisProductionActivationEvidence,
  type SynthesisProductionDiscovery,
  type SynthesisSidecarDiscovery,
  type SynthesisSidecarLease,
} from "../../packages/synthesis-contracts/src";
import { sha256Hex } from "../platform/hash";
import { detectRuntimePlatform } from "../platform/runtimePlatform";
import { joinPath } from "../utils/path";
import {
  getMozillaSubprocessModule,
  yieldToEventLoop,
} from "../utils/runtimeCompatibility";
import { registerBackgroundRefreshTimer } from "./backgroundRefreshGovernance";
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
  createSynthesisSidecarControlClient,
  type SynthesisProductionSidecarControlConnection,
  type SynthesisSidecarControlConnection,
} from "./synthesisSidecarControlClient";
import {
  createSynthesisSidecarRuntimeInstaller,
  type SynthesisSidecarRuntimeInstallSnapshot,
  type SynthesisSidecarRuntimeInstaller,
} from "./synthesisSidecarRuntimeInstaller";

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
  restartCount: number;
  readyAt?: string;
  nextRestartAt?: string;
};

type BaseSupervisorOptions = {
  runtimeRoot?: string;
  profilePath?: string;
  installer?: SynthesisSidecarRuntimeInstaller;
  resolvedInstall?: SynthesisSidecarRuntimeInstallSnapshot;
  subprocess?: SubprocessModule | null;
  now?: () => number;
  randomHex?: (bytes: number) => string;
  setTimeout?: typeof globalThis.setTimeout;
  clearTimeout?: typeof globalThis.clearTimeout;
  discoveryTimeoutMs?: number;
  leaseIntervalMs?: number;
  healthIntervalMs?: number;
  leaseTimeoutMs?: number;
  resumeGraceMs?: number;
  stableResetMs?: number;
  restartDelaysMs?: readonly number[];
};

type SupervisorOptions = BaseSupervisorOptions & {
  controlClient?: ReturnType<typeof createSynthesisSidecarControlClient>;
};

export type SynthesisProductionRuntimeSupervisorOptions =
  BaseSupervisorOptions & {
    admission:
      | SynthesisProductionAdmission
      | SynthesisProductionRuntimeAdmission;
    controlClient?: ReturnType<
      typeof createSynthesisProductionSidecarControlClient
    >;
  };

type CommonDiscovery = {
  profileId: string;
  supervisorInstanceId: string;
  serviceInstanceId: string;
  bundleId: string;
  implementation: "rust-native";
  target: SynthesisSidecarRuntimeInstallSnapshot["target"];
  targetTriple: string;
  buildFingerprint: string;
  platformSignature: unknown;
  serviceVersion: string;
  protocolVersion: typeof SYNTHESIS_SIDECAR_PROTOCOL;
  schemaVersion: string;
  runtimeRootId: string;
  dataRootId: string;
  host: "127.0.0.1";
  port: number;
};

type CommonControlConnection<TDiscovery extends CommonDiscovery> = {
  discovery: TDiscovery;
  clientToken: string;
  lifecycleToken: string;
};

type SupervisorControlClient<
  TDiscovery extends CommonDiscovery,
  TConnection extends CommonControlConnection<TDiscovery>,
> = {
  health(connection: TConnection): Promise<unknown>;
  handshake(connection: TConnection): Promise<unknown>;
  shutdown(connection: TConnection): Promise<void>;
};

type SupervisorMode<
  TDiscovery extends CommonDiscovery,
  TConnection extends CommonControlConnection<TDiscovery>,
> = {
  parseDiscovery(value: unknown): TDiscovery;
  validateAuthority(discovery: TDiscovery): void;
  createConnection(args: {
    discovery: TDiscovery;
    clientToken: string;
    lifecycleToken: string;
  }): TConnection;
  controlClient: SupervisorControlClient<TDiscovery, TConnection>;
  supervisorInstanceId?: string;
  expectedProfileId?: string;
  prepareLaunch(
    paths: ReturnType<typeof getSynthesisSidecarLifecyclePaths>,
  ): Promise<string | null>;
  launchArguments(args: {
    configPath: string;
    admissionPath: string | null;
  }): string[];
  timerOwner: string;
};

type Session<
  TDiscovery extends CommonDiscovery,
  TConnection extends CommonControlConnection<TDiscovery>,
> = {
  generation: number;
  profileId: string;
  supervisorInstanceId: string;
  leaseNonce: string;
  clientToken: string;
  lifecycleToken: string;
  paths: ReturnType<typeof getSynthesisSidecarLifecyclePaths>;
  install: SynthesisSidecarRuntimeInstallSnapshot;
  proc?: SidecarProcess;
  closed?: Promise<void>;
  connection?: TConnection;
  stdoutTail: string;
  stderrTail: string;
};

type LaunchIdentity = {
  profileId: string;
  runtimeRootId: string;
  dataRootId: string;
  supervisorInstanceId: string;
  leaseNonce: string;
  clientToken: string;
  lifecycleToken: string;
  paths: ReturnType<typeof getSynthesisSidecarLifecyclePaths>;
};

const DEFAULT_DISCOVERY_TIMEOUT_MS = 10_000;
const DEFAULT_LEASE_INTERVAL_MS = 30_000;
const DEFAULT_HEALTH_INTERVAL_MS = 60_000;
const DEFAULT_LEASE_TIMEOUT_MS = 120_000;
const DEFAULT_RESUME_GRACE_MS = 30_000;
const DEFAULT_STABLE_RESET_MS = 5 * 60_000;
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
  const runtime = globalThis as {
    crypto?: { getRandomValues?: (value: Uint8Array) => Uint8Array };
  };
  if (typeof runtime.crypto?.getRandomValues !== "function") {
    throw new Error("sidecar_secure_random_unavailable");
  }
  runtime.crypto.getRandomValues(bytes);
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
  return detectRuntimePlatform() === "win32"
    ? normalized.toLowerCase()
    : normalized;
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
  const profile = runtime.Services?.dirsvc?.get?.(
    "ProfD",
    runtime.Components?.interfaces?.nsIFile,
  );
  return normalizeProfilePath(String(profile?.path || ""));
}

async function hashText(value: string) {
  return sha256Hex(new TextEncoder().encode(value));
}

function sealedEnvironment() {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  const source = runtime.process?.env || {};
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

function waitForPromise(promise: Promise<unknown>, timeoutMs: number) {
  return Promise.race([
    promise.then(
      () => true,
      () => true,
    ),
    new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), timeoutMs);
    }),
  ]);
}

function createSynthesisSidecarSupervisorCore<
  TDiscovery extends CommonDiscovery,
  TConnection extends CommonControlConnection<TDiscovery>,
>(
  options: BaseSupervisorOptions,
  mode: SupervisorMode<TDiscovery, TConnection>,
) {
  const persistence = getRuntimePersistencePaths();
  const runtimeRoot = options.runtimeRoot || persistence.runtimeRoot;
  const profilePath = options.profilePath;
  const now = options.now || Date.now;
  const randomHex = options.randomHex || defaultRandomHex;
  const setTimer = options.setTimeout || globalThis.setTimeout;
  const clearTimer = options.clearTimeout || globalThis.clearTimeout;
  const discoveryTimeoutMs =
    options.discoveryTimeoutMs ?? DEFAULT_DISCOVERY_TIMEOUT_MS;
  const leaseIntervalMs = options.leaseIntervalMs ?? DEFAULT_LEASE_INTERVAL_MS;
  const healthIntervalMs =
    options.healthIntervalMs ?? DEFAULT_HEALTH_INTERVAL_MS;
  const leaseTimeoutMs = options.leaseTimeoutMs ?? DEFAULT_LEASE_TIMEOUT_MS;
  const resumeGraceMs = options.resumeGraceMs ?? DEFAULT_RESUME_GRACE_MS;
  const stableResetMs = options.stableResetMs ?? DEFAULT_STABLE_RESET_MS;
  const restartDelaysMs = options.restartDelaysMs ?? DEFAULT_RESTART_DELAYS_MS;
  const installer =
    options.installer ||
    createSynthesisSidecarRuntimeInstaller({ runtimeRoot });
  const subprocess =
    options.subprocess === undefined
      ? getMozillaSubprocessModule()
      : options.subprocess;
  const controlClient = mode.controlClient;

  let snapshot: SynthesisSidecarSupervisorSnapshot = {
    status: "stopped",
    recoveryState: "none",
    restartCount: 0,
  };
  let snapshotSignature = JSON.stringify(snapshot);
  const subscribers = new Set<
    (value: SynthesisSidecarSupervisorSnapshot) => void
  >();
  let session: Session<TDiscovery, TConnection> | null = null;
  let launchIdentity: LaunchIdentity | null = null;
  let generation = 0;
  let controlledStop = false;
  let timer: ReturnType<typeof globalThis.setTimeout> | null = null;
  let nextLeaseAt = 0;
  let nextHealthAt = 0;
  let nextRestartAt = 0;
  let readyResetAt = 0;
  let lastSchedulerAt = 0;
  let consecutiveHealthFailures = 0;
  let failureCount = 0;
  let schedulerRunning = false;
  let timerPolicyRegistered = false;
  const expectedExitGenerations = new Set<number>();

  const publish = (update: Partial<SynthesisSidecarSupervisorSnapshot>) => {
    const next = { ...snapshot, ...update };
    const signature = JSON.stringify(next);
    snapshot = next;
    if (signature === snapshotSignature) {
      return;
    }
    snapshotSignature = signature;
    for (const subscriber of subscribers) {
      subscriber({ ...snapshot });
    }
  };

  const cancelTimer = () => {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  };

  const schedule = () => {
    cancelTimer();
    const current = now();
    const deadlines: number[] = [];
    if (nextRestartAt) {
      deadlines.push(nextRestartAt);
    }
    if (snapshot.status === "ready") {
      deadlines.push(nextLeaseAt, nextHealthAt, readyResetAt);
    }
    const deadline = Math.min(...deadlines.filter((value) => value > 0));
    if (!Number.isFinite(deadline)) {
      return;
    }
    timer = setTimer(
      () => void runScheduler(),
      Math.max(0, deadline - current),
    );
  };

  const writeLease = async (
    currentSession: Session<TDiscovery, TConnection>,
  ) => {
    const lease: SynthesisSidecarLease = {
      schema: SYNTHESIS_SIDECAR_LEASE_SCHEMA,
      profileId: currentSession.profileId,
      supervisorInstanceId: currentSession.supervisorInstanceId,
      leaseNonce: currentSession.leaseNonce,
      updatedAtMs: now(),
    };
    await replacePrivateRuntimeTextFileAtomically(
      currentSession.paths.leasePath,
      `${JSON.stringify(lease)}\n`,
    );
  };

  const cleanupSession = async (
    currentSession: Session<TDiscovery, TConnection>,
  ) => {
    try {
      const source = (
        await readRuntimeTextFile(currentSession.paths.discoveryPath)
      ).trim();
      if (source) {
        const discovery = mode.parseDiscovery(JSON.parse(source));
        if (
          discovery.supervisorInstanceId ===
            currentSession.supervisorInstanceId &&
          (!currentSession.connection ||
            discovery.serviceInstanceId ===
              currentSession.connection.discovery.serviceInstanceId)
        ) {
          await removeRuntimePath(currentSession.paths.discoveryPath);
        }
      }
    } catch {
      // The service normally removes matching discovery itself.
    }
    await removeRuntimePath(currentSession.paths.sessionRoot).catch(
      () => false,
    );
  };

  const drainStream = async (
    currentSession: Session<TDiscovery, TConnection>,
    stream: SidecarProcess["stdout"] | SidecarProcess["stderr"],
    kind: "stdout" | "stderr",
  ) => {
    if (typeof stream?.readString !== "function") {
      return;
    }
    while (true) {
      const chunk = await stream.readString();
      if (!chunk) {
        return;
      }
      if (kind === "stdout") {
        currentSession.stdoutTail = appendTail(
          currentSession.stdoutTail,
          chunk,
        );
      } else {
        currentSession.stderrTail = appendTail(
          currentSession.stderrTail,
          chunk,
        );
      }
      await yieldToEventLoop();
    }
  };

  const terminateProcess = async (
    currentSession: Session<TDiscovery, TConnection>,
  ) => {
    expectedExitGenerations.add(currentSession.generation);
    try {
      await currentSession.proc?.stdin?.close?.();
    } catch {
      // EOF is best-effort after authenticated shutdown.
    }
    if (currentSession.closed) {
      const closed = await waitForPromise(currentSession.closed, 300);
      if (closed) {
        return;
      }
    }
    try {
      currentSession.proc?.kill?.(0);
    } catch {
      // Direct process cleanup is bounded and best-effort.
    }
    if (currentSession.closed) {
      await waitForPromise(currentSession.closed, 150);
    }
  };

  const classifyTerminal = (code: string) =>
    [
      "unsupported_target",
      "sidecar_runtime_missing",
      "sidecar_runtime_corrupt",
      "sidecar_runtime_unsupported",
      "sidecar_owner_conflict",
      "sidecar_owner_invalid",
      "sidecar_owner_lease_fresh",
      "sidecar_config_delete_failed",
      "sidecar_health_identity_mismatch",
      "sidecar_handshake_identity_mismatch",
      "production_admission_profile_mismatch",
      "production_admission_identity_mismatch",
      "protocol_mismatch",
      "schema_mismatch",
      "runtime_mismatch",
      "profile_mismatch",
      "sidecar_profile_path_unavailable",
      "sidecar_secure_random_unavailable",
      "sidecar_private_file_permissions_unavailable",
    ].some((prefix) => code.startsWith(prefix));

  const fail = async (
    code: string,
    currentSession?: Session<TDiscovery, TConnection> | null,
    terminal = classifyTerminal(code),
  ) => {
    cancelTimer();
    nextLeaseAt = 0;
    nextHealthAt = 0;
    readyResetAt = 0;
    nextRestartAt = 0;
    consecutiveHealthFailures = 0;
    if (currentSession?.proc) {
      await terminateProcess(currentSession);
    }
    if (currentSession) {
      await cleanupSession(currentSession);
    }
    if (session === currentSession) {
      session = null;
    }
    if (controlledStop) {
      return;
    }
    if (terminal) {
      publish({
        status: code.includes("mismatch") ? "incompatible" : "unavailable",
        recoveryState: "manual-recovery-required",
        reasonCode: code,
        nextRestartAt: undefined,
      });
      return;
    }
    failureCount += 1;
    if (failureCount > restartDelaysMs.length) {
      publish({
        status: "unavailable",
        recoveryState: "manual-recovery-required",
        reasonCode: "sidecar_crash_loop_fused",
        restartCount: failureCount,
        nextRestartAt: undefined,
      });
      return;
    }
    nextRestartAt = now() + restartDelaysMs[failureCount - 1]!;
    publish({
      status: "unavailable",
      recoveryState: "scheduled",
      reasonCode: code,
      restartCount: failureCount,
      nextRestartAt: new Date(nextRestartAt).toISOString(),
    });
    schedule();
  };

  const waitForDiscovery = async (
    currentSession: Session<TDiscovery, TConnection>,
  ): Promise<TDiscovery> => {
    const deadline = now() + discoveryTimeoutMs;
    while (now() < deadline && session === currentSession && !controlledStop) {
      const text = (
        await readRuntimeTextFile(currentSession.paths.discoveryPath)
      ).trim();
      if (text) {
        return mode.parseDiscovery(JSON.parse(text));
      }
      await new Promise<void>((resolve) => {
        setTimer(resolve, DISCOVERY_POLL_MS);
      });
    }
    throw new Error("sidecar_discovery_timeout");
  };

  const validateDiscovery = (
    discovery: TDiscovery,
    currentSession: Session<TDiscovery, TConnection>,
    identities: {
      runtimeRootId: string;
      dataRootId: string;
    },
  ) => {
    const install = currentSession.install;
    if (
      discovery.profileId !== currentSession.profileId ||
      discovery.supervisorInstanceId !== currentSession.supervisorInstanceId ||
      discovery.bundleId !== install.bundleId ||
      discovery.implementation !== install.implementation ||
      discovery.target !== install.target ||
      discovery.targetTriple !== install.targetTriple ||
      discovery.buildFingerprint !== install.buildFingerprint ||
      JSON.stringify(discovery.platformSignature) !==
        JSON.stringify(install.platformSignature) ||
      discovery.serviceVersion !== install.serviceVersion ||
      discovery.protocolVersion !== install.protocolVersion ||
      discovery.protocolVersion !== SYNTHESIS_SIDECAR_PROTOCOL ||
      discovery.schemaVersion !== SYNTHESIS_SCHEMA_VERSION ||
      discovery.runtimeRootId !== identities.runtimeRootId ||
      discovery.dataRootId !== identities.dataRootId
    ) {
      throw new Error("sidecar_discovery_identity_mismatch");
    }
    mode.validateAuthority(discovery);
  };

  const launch = async () => {
    cancelTimer();
    nextRestartAt = 0;
    generation += 1;
    const currentGeneration = generation;
    publish({
      status: "starting",
      recoveryState: "none",
      reasonCode: undefined,
      nextRestartAt: undefined,
      readyAt: undefined,
    });
    let currentSession: Session<TDiscovery, TConnection> | null = null;
    try {
      if (!launchIdentity) {
        const resolvedProfilePath = normalizeProfilePath(
          profilePath || resolveProfilePath(),
        );
        const profileId = await hashText(resolvedProfilePath);
        if (mode.expectedProfileId && profileId !== mode.expectedProfileId) {
          throw new Error("production_admission_profile_mismatch");
        }
        const supervisorInstanceId =
          mode.supervisorInstanceId || `sup-${randomHex(16)}`;
        launchIdentity = {
          profileId,
          runtimeRootId: await hashText(runtimeRoot),
          dataRootId: await hashText(persistence.synthesisDataRoot),
          supervisorInstanceId,
          leaseNonce: `lease-${randomHex(16)}`,
          clientToken: randomHex(32),
          lifecycleToken: randomHex(32),
          paths: getSynthesisSidecarLifecyclePaths({
            runtimeRoot,
            profileId,
            supervisorInstanceId,
          }),
        };
      }
      const {
        profileId,
        runtimeRootId,
        dataRootId,
        supervisorInstanceId,
        leaseNonce,
        clientToken,
        lifecycleToken,
        paths,
      } = launchIdentity;
      await ensureRuntimeDirectory(paths.sessionRoot);
      const install =
        options.resolvedInstall ?? (await installer.ensureInstalled());
      if (
        install.state !== "ready" ||
        !install.bundleId ||
        install.implementation !== "rust-native" ||
        !install.targetTriple ||
        !install.serviceVersion ||
        !install.protocolVersion ||
        !install.buildFingerprint ||
        !install.platformSignature ||
        !install.executablePath
      ) {
        throw new Error(
          `sidecar_runtime_${install.state}:${
            install.diagnostics[0]?.code || "unavailable"
          }`,
        );
      }
      currentSession = {
        generation: currentGeneration,
        profileId,
        supervisorInstanceId,
        leaseNonce,
        clientToken,
        lifecycleToken,
        paths,
        install,
        stdoutTail: "",
        stderrTail: "",
      };
      session = currentSession;
      await writeLease(currentSession);
      const config = rebuildSynthesisSidecarLaunchConfig({
        schema: SYNTHESIS_SIDECAR_LAUNCH_CONFIG_SCHEMA,
        profileId,
        profileRuntimeRoot: paths.profileRoot,
        runtimeRootId,
        dataRootId,
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
        leaseNonce,
        clientToken,
        lifecycleToken,
        mutationEnabled: false,
        port: 0,
      });
      await replacePrivateRuntimeTextFileAtomically(
        paths.configPath,
        `${JSON.stringify(config)}\n`,
      );
      const admissionPath = await mode.prepareLaunch(paths);
      if (!subprocess?.call) {
        throw new Error("sidecar_subprocess_unavailable");
      }
      const proc = await subprocess.call({
        command: install.executablePath,
        arguments: mode.launchArguments({
          configPath: paths.configPath,
          admissionPath,
        }),
        environment: sealedEnvironment(),
        environmentAppend: false,
        workdir: paths.sessionRoot,
      });
      currentSession.proc = proc;
      void drainStream(currentSession, proc.stdout, "stdout").catch(
        () => undefined,
      );
      void drainStream(currentSession, proc.stderr, "stderr").catch(
        () => undefined,
      );
      currentSession.closed = Promise.resolve()
        .then(() => proc.wait?.())
        .then(() => undefined);
      void currentSession.closed.finally(() => {
        if (
          session === currentSession &&
          !controlledStop &&
          !expectedExitGenerations.delete(currentGeneration)
        ) {
          void fail("sidecar_process_exited", currentSession, false);
        }
      });
      const discovery = await waitForDiscovery(currentSession);
      validateDiscovery(discovery, currentSession, {
        runtimeRootId,
        dataRootId,
      });
      const connection = mode.createConnection({
        discovery,
        clientToken,
        lifecycleToken,
      });
      currentSession.connection = connection;
      await controlClient.health(connection);
      await controlClient.handshake(connection);
      if (session !== currentSession || controlledStop) {
        return;
      }
      const readyAt = now();
      nextLeaseAt = readyAt + leaseIntervalMs;
      nextHealthAt = readyAt + healthIntervalMs;
      readyResetAt = readyAt + stableResetMs;
      lastSchedulerAt = readyAt;
      consecutiveHealthFailures = 0;
      publish({
        status: "ready",
        recoveryState: "none",
        reasonCode: undefined,
        profileId,
        supervisorInstanceId,
        serviceInstanceId: discovery.serviceInstanceId,
        bundleId: discovery.bundleId,
        restartCount: failureCount,
        readyAt: new Date(readyAt).toISOString(),
      });
      if (!timerPolicyRegistered) {
        timerPolicyRegistered = true;
        registerBackgroundRefreshTimer({
          owner: mode.timerOwner,
          activationCondition: "Synthesis sidecar runtime session is active",
          scopeKey: "current Zotero profile sidecar runtime",
          allowedDataSources: [
            "profile sidecar lease",
            "sidecar process state",
            "loopback sidecar health",
          ],
          maxReadShape: "single service state only",
          requiresForegroundSurface: false,
          minimumIntervalMs: leaseIntervalMs,
          intervalMs: leaseIntervalMs,
        });
      }
      schedule();
    } catch (error) {
      await fail(errorCode(error), currentSession);
    }
  };

  const runScheduler = async () => {
    timer = null;
    if (schedulerRunning || controlledStop) {
      return;
    }
    schedulerRunning = true;
    try {
      const current = now();
      if (nextRestartAt && current >= nextRestartAt) {
        await launch();
        return;
      }
      const currentSession = session;
      if (snapshot.status !== "ready" || !currentSession?.connection) {
        return;
      }
      if (current - lastSchedulerAt > leaseTimeoutMs) {
        nextLeaseAt = current;
        nextHealthAt = current + resumeGraceMs;
      }
      lastSchedulerAt = current;
      if (current >= nextLeaseAt) {
        try {
          await writeLease(currentSession);
          nextLeaseAt = now() + leaseIntervalMs;
        } catch (error) {
          await fail(errorCode(error), currentSession, true);
          return;
        }
      }
      if (now() >= nextHealthAt) {
        try {
          await controlClient.health(currentSession.connection);
          consecutiveHealthFailures = 0;
        } catch {
          consecutiveHealthFailures += 1;
        }
        nextHealthAt = now() + healthIntervalMs;
        if (consecutiveHealthFailures >= 3) {
          await fail("sidecar_health_failed", currentSession, false);
          return;
        }
      }
      if (readyResetAt && now() >= readyResetAt) {
        failureCount = 0;
        readyResetAt = 0;
        if (snapshot.restartCount !== 0) {
          publish({ restartCount: 0 });
        }
      }
    } finally {
      schedulerRunning = false;
      schedule();
    }
  };

  const stop = async () => {
    controlledStop = true;
    cancelTimer();
    nextRestartAt = 0;
    const currentSession = session;
    if (!currentSession) {
      launchIdentity = null;
      publish({
        status: "stopped",
        recoveryState: "none",
        reasonCode: undefined,
        nextRestartAt: undefined,
      });
      return;
    }
    publish({
      status: "stopping",
      recoveryState: "none",
      reasonCode: undefined,
    });
    expectedExitGenerations.add(currentSession.generation);
    if (currentSession.connection) {
      await controlClient
        .shutdown(currentSession.connection)
        .catch(() => undefined);
    }
    await terminateProcess(currentSession);
    await cleanupSession(currentSession);
    if (session === currentSession) {
      session = null;
    }
    launchIdentity = null;
    publish({
      status: "stopped",
      recoveryState: "none",
      reasonCode: undefined,
      serviceInstanceId: undefined,
      nextRestartAt: undefined,
    });
  };

  return {
    start() {
      if (
        snapshot.status === "starting" ||
        snapshot.status === "ready" ||
        snapshot.status === "stopping"
      ) {
        return;
      }
      controlledStop = false;
      void launch();
    },
    stop,
    async recover() {
      await stop();
      failureCount = 0;
      publish({
        status: "stopped",
        recoveryState: "none",
        reasonCode: undefined,
        restartCount: 0,
      });
      controlledStop = false;
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
    replaceReadyDiscovery(discovery: TDiscovery) {
      if (snapshot.status !== "ready" || !session?.connection) {
        throw new Error("sidecar_not_ready");
      }
      mode.validateAuthority(discovery);
      session.connection = mode.createConnection({
        discovery,
        clientToken: session.connection.clientToken,
        lifecycleToken: session.connection.lifecycleToken,
      });
      return { ...session.connection };
    },
  };
}

function parseShadowDiscovery(value: unknown) {
  try {
    return rebuildSynthesisSidecarDiscovery(value);
  } catch {
    throw new Error("sidecar_discovery_identity_mismatch");
  }
}

function parseProductionDiscovery(value: unknown) {
  try {
    return rebuildSynthesisProductionDiscovery(value);
  } catch {
    throw new Error("sidecar_discovery_identity_mismatch");
  }
}

export function createSynthesisSidecarRuntimeSupervisor(
  options: SupervisorOptions = {},
) {
  const controlClient =
    options.controlClient || createSynthesisSidecarControlClient();
  return createSynthesisSidecarSupervisorCore<
    SynthesisSidecarDiscovery,
    SynthesisSidecarControlConnection
  >(options, {
    parseDiscovery: parseShadowDiscovery,
    validateAuthority() {},
    createConnection: (connection) => connection,
    controlClient,
    async prepareLaunch() {
      return null;
    },
    launchArguments: ({ configPath }) => ["serve", "--config", configPath],
    timerOwner: "synthesis-sidecar-supervisor",
  });
}

export function createSynthesisProductionRuntimeSupervisor(
  options: SynthesisProductionRuntimeSupervisorOptions,
) {
  const admission =
    options.admission.schema === SYNTHESIS_PRODUCTION_RUNTIME_ADMISSION_SCHEMA
      ? rebuildSynthesisProductionRuntimeAdmission(options.admission)
      : rebuildSynthesisProductionAdmission(options.admission);
  if (admission.purpose !== "live_owner") {
    throw new Error("production_admission_identity_mismatch");
  }
  const controlClient =
    options.controlClient || createSynthesisProductionSidecarControlClient();
  const supervisor = createSynthesisSidecarSupervisorCore<
    SynthesisProductionDiscovery,
    SynthesisProductionSidecarControlConnection
  >(options, {
    parseDiscovery: parseProductionDiscovery,
    validateAuthority(discovery) {
      if (
        discovery.ownerMode !== "production" ||
        discovery.capabilityFingerprint !== admission.capabilityFingerprint ||
        discovery.cutoverReceiptId !== admission.cutoverReceiptId ||
        ("runtimeAdmissionGeneration" in admission
          ? discovery.runtimeAdmissionGeneration !==
            admission.runtimeAdmissionGeneration
          : discovery.runtimeAdmissionGeneration !== null)
      ) {
        throw new Error("sidecar_discovery_identity_mismatch");
      }
    },
    createConnection: (connection) => connection,
    controlClient,
    supervisorInstanceId: admission.supervisorInstanceId,
    expectedProfileId: admission.profileId,
    async prepareLaunch(paths) {
      const admissionPath = joinPath(
        paths.sessionRoot,
        "production-admission.json",
      );
      await replacePrivateRuntimeTextFileAtomically(
        admissionPath,
        `${JSON.stringify(admission)}\n`,
      );
      return admissionPath;
    },
    launchArguments: ({ configPath, admissionPath }) => {
      if (!admissionPath) {
        throw new Error("production_admission_identity_mismatch");
      }
      return [
        "serve-production",
        "--config",
        configPath,
        "--admission",
        admissionPath,
      ];
    },
    timerOwner: "synthesis-production-sidecar-supervisor",
  });
  return {
    ...supervisor,
    async activate(evidence: Parameters<typeof controlClient.activate>[1]) {
      const connection = supervisor.getReadyConnection();
      if (!connection) {
        throw new Error("sidecar_not_ready");
      }
      await controlClient.activate(connection, evidence);
      const activatedDiscovery = parseProductionDiscovery({
        ...connection.discovery,
        mutationEnabled: true,
      });
      const activatedConnection =
        supervisor.replaceReadyDiscovery(activatedDiscovery);
      await controlClient.health(activatedConnection);
      await controlClient.handshake(activatedConnection);
      return activatedConnection;
    },
  };
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

export function activateSynthesisProductionRuntime(
  evidence: SynthesisProductionActivationEvidence,
) {
  if (!productionSupervisor) {
    throw new Error("production_supervisor_not_configured");
  }
  return productionSupervisor.activate(evidence);
}

export function getReadySynthesisProductionControlConnection() {
  const connection = productionSupervisor?.getReadyConnection() ?? null;
  const readyCapabilities = connection?.discovery.readyClientCapabilities as
    | readonly string[]
    | undefined;
  const requiredCapabilities =
    SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES as readonly string[];
  if (
    !connection ||
    connection.discovery.mutationEnabled !== true ||
    readyCapabilities?.length !== requiredCapabilities.length ||
    !requiredCapabilities.every(
      (capability, index) => readyCapabilities[index] === capability,
    )
  ) {
    return null;
  }
  return connection;
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
  DEFAULT_LEASE_INTERVAL_MS,
  DEFAULT_HEALTH_INTERVAL_MS,
  DEFAULT_LEASE_TIMEOUT_MS,
  DEFAULT_RESUME_GRACE_MS,
  DEFAULT_STABLE_RESET_MS,
  DEFAULT_RESTART_DELAYS_MS,
  DIAGNOSTIC_TAIL_LIMIT,
};
