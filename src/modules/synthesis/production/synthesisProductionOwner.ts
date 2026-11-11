import {
  toSynthesisJsonObject,
  type SynthesisSidecarTraceContext,
} from "../../../../packages/synthesis-contracts/src";
import { sha256Hex } from "../../../platform/hash";
import { detectRuntimePlatform } from "../../../platform/runtimePlatform";
import {
  createCancellationController,
  type CancellationSignal,
} from "../../../utils/wait";
import { getRuntimePersistencePaths } from "../../runtimePersistence";
import {
  invalidateDefaultSynthesisClient,
  setDefaultSynthesisClientRecovery,
} from "../../synthesisClient/defaultClient";
import { createSynthesisReverseHostEndpoint } from "../reverseHost/synthesisReverseHostEndpoint";
import { createDefaultSynthesisReverseHostHandlers } from "../reverseHost/synthesisReverseHostHandlers";
import {
  createSynthesisSidecarRpcClient,
  type SynthesisSidecarRpcConnection,
} from "../sidecar/synthesisSidecarRpcClient";
import {
  SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
  synthesisProductionTransportDeadlineMs,
} from "./synthesisProductionRpcPolicy";
import {
  createSynthesisSidecarRuntimeInstaller,
  type SynthesisSidecarRuntimeInstallSnapshot,
} from "../sidecar/synthesisSidecarRuntimeInstaller";
import {
  getReadySynthesisProductionControlConnection,
  startSynthesisProductionRuntimeSupervisor,
  stopSynthesisProductionRuntimeSupervisor,
  type SynthesisSidecarSupervisorSnapshot,
} from "../sidecar/synthesisSidecarRuntimeSupervisor";
import {
  createSynthesisSidecarTraceContext,
  recordSynthesisSidecarTraceEvent,
} from "../sidecar/synthesisSidecarTrace";

type ReverseHostLocator = {
  host: "127.0.0.1";
  port: number;
  authorizationToken: string;
};

type ReverseHostEndpoint = {
  start(): ReverseHostLocator | Promise<ReverseHostLocator>;
  bindServiceInstance(serviceInstanceId: string | null): void;
  stop(): void | Promise<void>;
};

type ProductionSupervisor = {
  subscribe(
    subscriber: (snapshot: SynthesisSidecarSupervisorSnapshot) => void,
  ): () => void;
  getSnapshot(): SynthesisSidecarSupervisorSnapshot;
  getDiagnosticEvidence(): {
    stdoutTail: string;
    stderrTail: string;
  };
  getReadyConnection(): {
    discovery: {
      host: "127.0.0.1";
      port: number;
      serviceInstanceId: string;
    };
    clientToken: string;
  } | null;
  recover(): void;
};

export type SynthesisProductionOwnerDeps = {
  createReverseHostEndpoint(): ReverseHostEndpoint;
  startProductionSupervisor(locator: ReverseHostLocator): ProductionSupervisor;
  stopProductionSupervisor(): Promise<void>;
  afterReady?(
    connection: NonNullable<
      ReturnType<ProductionSupervisor["getReadyConnection"]>
    >,
  ): Promise<void>;
  invalidateClient?: () => void;
};

function rpcConnection(
  connection: NonNullable<
    ReturnType<ProductionSupervisor["getReadyConnection"]>
  >,
  profileId: string,
): SynthesisSidecarRpcConnection {
  return {
    baseUrl: `http://${connection.discovery.host}:${connection.discovery.port}`,
    profileId,
    clientToken: connection.clientToken,
    serviceInstanceId: connection.discovery.serviceInstanceId,
  };
}

function waitForReady(
  supervisor: ProductionSupervisor,
  signal: CancellationSignal,
) {
  const current = supervisor.getReadyConnection();
  if (current) {
    return Promise.resolve(current);
  }
  return new Promise<
    NonNullable<ReturnType<ProductionSupervisor["getReadyConnection"]>>
  >((resolve, reject) => {
    let settled = false;
    let unsubscribe: () => void = () => undefined;
    const finish = (
      error?: Error,
      connection?: NonNullable<
        ReturnType<ProductionSupervisor["getReadyConnection"]>
      >,
    ) => {
      if (settled) {
        return;
      }
      settled = true;
      unsubscribe();
      signal.removeEventListener("abort", abort);
      if (error) {
        reject(error);
      } else {
        resolve(connection!);
      }
    };
    const abort = () => finish(new Error("synthesis_production_owner_stopped"));
    const inspect = (snapshot: SynthesisSidecarSupervisorSnapshot) => {
      const connection = supervisor.getReadyConnection();
      if (snapshot.status === "ready" && connection) {
        finish(undefined, connection);
      } else if (
        snapshot.recoveryState === "manual-recovery-required" ||
        snapshot.status === "incompatible"
      ) {
        finish(new Error(snapshot.reasonCode || "sidecar_startup_failed"));
      }
    };
    unsubscribe = supervisor.subscribe(inspect);
    signal.addEventListener("abort", abort);
    if (signal.aborted) return abort();
    inspect(supervisor.getSnapshot());
  });
}

export function createSynthesisProductionOwner(
  deps: SynthesisProductionOwnerDeps,
) {
  let endpoint: ReverseHostEndpoint | null = null;
  let supervisor: ProductionSupervisor | null = null;
  let supervisorTask: Promise<ProductionSupervisor> | null = null;
  let startTask: Promise<
    NonNullable<ReturnType<ProductionSupervisor["getReadyConnection"]>>
  > | null = null;
  let stopTask: Promise<void> | null = null;
  let stopped = false;
  const cancellation = createCancellationController();
  let hasBeenReady = false;
  let boundServiceInstanceId: string | null = null;
  let unsubscribeSupervisor: (() => void) | null = null;
  let automaticRecoveryAttempted = false;
  let automaticRecoveryTask: Promise<
    NonNullable<ReturnType<ProductionSupervisor["getReadyConnection"]>>
  > | null = null;

  function ensureSupervisor() {
    if (stopped) {
      throw new Error("synthesis_production_owner_stopped");
    }
    supervisorTask ||= (async () => {
      const createdEndpoint = deps.createReverseHostEndpoint();
      endpoint = createdEndpoint;
      try {
        const locator = await createdEndpoint.start();
        if (stopped) throw new Error("synthesis_production_owner_stopped");
        const createdSupervisor = deps.startProductionSupervisor(locator);
        supervisor = createdSupervisor;
        unsubscribeSupervisor = createdSupervisor.subscribe((snapshot) => {
          if (stopped) return;
          if (snapshot.status !== "ready" && boundServiceInstanceId) {
            createdEndpoint.bindServiceInstance(null);
            boundServiceInstanceId = null;
            startTask = null;
          }
          if (snapshot.status === "ready") {
            // The supervisor can finish recovery before another client asks.
            void start().catch(() => undefined);
          }
        });
        return createdSupervisor;
      } catch (error) {
        await Promise.resolve(createdEndpoint.stop()).catch(() => undefined);
        if (endpoint === createdEndpoint) endpoint = null;
        supervisor = null;
        throw error;
      }
    })();
    return supervisorTask;
  }

  function start(): Promise<
    NonNullable<ReturnType<ProductionSupervisor["getReadyConnection"]>>
  > {
    if (stopped) {
      throw new Error("synthesis_production_owner_stopped");
    }
    if (startTask) {
      return startTask;
    }
    const followReplacement = () => {
      if (startTask === task) startTask = null;
      return start();
    };
    const task = (async () => {
      const current = await ensureSupervisor();
      const connection = await waitForReady(current, cancellation.signal);
      if (stopped) throw new Error("synthesis_production_owner_stopped");
      if (
        current.getReadyConnection()?.discovery.serviceInstanceId !==
        connection.discovery.serviceInstanceId
      ) {
        return followReplacement();
      }
      endpoint?.bindServiceInstance(connection.discovery.serviceInstanceId);
      boundServiceInstanceId = connection.discovery.serviceInstanceId;
      try {
        await deps.afterReady?.(connection);
      } catch (error) {
        if (stopped) throw new Error("synthesis_production_owner_stopped");
        if (
          current.getReadyConnection()?.discovery.serviceInstanceId !==
          connection.discovery.serviceInstanceId
        ) {
          return followReplacement();
        }
        throw error;
      }
      if (stopped) throw new Error("synthesis_production_owner_stopped");
      if (
        current.getReadyConnection()?.discovery.serviceInstanceId !==
        connection.discovery.serviceInstanceId
      ) {
        return followReplacement();
      }
      hasBeenReady = true;
      automaticRecoveryAttempted = false;
      return connection;
    })();
    startTask = task;
    void task.catch(() => {
      if (startTask === task) {
        startTask = null;
      }
    });
    return task;
  }

  async function recover() {
    if (!supervisor) {
      await supervisorTask?.catch(() => undefined);
      supervisorTask = null;
      startTask = null;
      return start();
    }
    supervisor.recover();
    startTask = null;
    return start();
  }

  async function recoverIfEligible() {
    if (automaticRecoveryTask) {
      return automaticRecoveryTask;
    }
    const current = supervisor;
    const snapshot = current?.getSnapshot();
    if (
      stopped ||
      !current ||
      !hasBeenReady ||
      automaticRecoveryAttempted ||
      snapshot?.status !== "unavailable" ||
      (snapshot.recoveryState !== "scheduled" &&
        (snapshot.recoveryState !== "manual-recovery-required" ||
          snapshot.reasonCode !== "sidecar_crash_loop_fused"))
    ) {
      return null;
    }
    automaticRecoveryAttempted = true;
    if (snapshot.recoveryState === "manual-recovery-required") {
      current.recover();
    }
    startTask = null;
    const task = start();
    automaticRecoveryTask = task;
    try {
      return await task;
    } finally {
      if (automaticRecoveryTask === task) {
        automaticRecoveryTask = null;
      }
    }
  }

  function shutdown() {
    if (stopTask) {
      return stopTask;
    }
    stopped = true;
    cancellation.abort();
    endpoint?.bindServiceInstance(null);
    boundServiceInstanceId = null;
    (deps.invalidateClient || invalidateDefaultSynthesisClient)();
    stopTask = (async () => {
      await deps.stopProductionSupervisor();
      unsubscribeSupervisor?.();
      unsubscribeSupervisor = null;
      await endpoint?.stop();
      boundServiceInstanceId = null;
    })();
    return stopTask;
  }

  return {
    start,
    whenReady: start,
    recover,
    recoverIfEligible,
    shutdown,
  };
}

function profilePath() {
  const runtime = globalThis as {
    Services?: {
      dirsvc?: {
        get?: (key: string, iface?: unknown) => { path?: string } | undefined;
      };
    };
    Components?: { interfaces?: { nsIFile?: unknown } };
  };
  const value = runtime.Services?.dirsvc?.get?.(
    "ProfD",
    runtime.Components?.interfaces?.nsIFile,
  )?.path;
  const normalized = String(value || "")
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

function randomHex(bytes: number) {
  const value = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(value);
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function hashText(value: string) {
  return sha256Hex(new TextEncoder().encode(value));
}

function requireReadyInstall(
  install: SynthesisSidecarRuntimeInstallSnapshot,
): asserts install is SynthesisSidecarRuntimeInstallSnapshot & {
  executablePath: string;
  bundleId: string;
  buildFingerprint: string;
  targetTriple: string;
} {
  if (
    install.state !== "ready" ||
    !install.executablePath ||
    !install.bundleId ||
    !install.buildFingerprint ||
    !install.targetTriple
  ) {
    throw new Error(
      install.diagnostics[0]?.code || "synthesis_sidecar_runtime_unavailable",
    );
  }
}

function startupCode(error: unknown) {
  const value = error instanceof Error ? error.message : String(error || "");
  return /^[a-z][a-z0-9_.:-]{0,127}$/.test(value)
    ? value
    : "synthesis_sidecar_startup_failed";
}

function recordStartup(args: {
  trace: SynthesisSidecarTraceContext | undefined;
  phase: string;
  outcome: "started" | "succeeded" | "failed";
  code?: string;
}) {
  recordSynthesisSidecarTraceEvent({
    context: args.trace,
    source: "host",
    boundary: "supervisor",
    phase: args.phase,
    outcome: args.outcome,
    ...(args.code ? { code: args.code } : {}),
    identities: { operation: "production-startup", trigger: "startup" },
  });
}

async function createDefaultSynthesisProductionOwner(
  startupTrace: SynthesisSidecarTraceContext | undefined,
) {
  const persistence = getRuntimePersistencePaths();
  const resolvedProfilePath = profilePath();
  const profileId = await hashText(resolvedProfilePath);
  const reverseHostToken = randomHex(32);
  const libraryId = Number(
    (
      globalThis as {
        Zotero?: { Libraries?: { userLibraryID?: number } };
      }
    ).Zotero?.Libraries?.userLibraryID || 1,
  );
  recordStartup({
    trace: startupTrace,
    phase: "runtime-install",
    outcome: "started",
  });
  const installer = createSynthesisSidecarRuntimeInstaller({
    runtimeRoot: persistence.runtimeRoot,
    verificationPolicy: "production",
  });
  const install = await installer.ensureInstalled();
  requireReadyInstall(install);
  recordStartup({
    trace: startupTrace,
    phase: "runtime-install",
    outcome: "succeeded",
  });

  const endpoint = createSynthesisReverseHostEndpoint({
    profileId,
    authorizationToken: reverseHostToken,
    now: Date.now,
    isHostConnected: () =>
      typeof (globalThis as { Zotero?: unknown }).Zotero !== "undefined",
    authorizeCapability: () => true,
    allowUnboundServiceInstance: true,
    handlers: createDefaultSynthesisReverseHostHandlers({
      libraryId,
      getTransferConnection: () => {
        const connection = getReadySynthesisProductionControlConnection();
        return connection ? rpcConnection(connection, profileId) : null;
      },
    }),
  });

  return createSynthesisProductionOwner({
    createReverseHostEndpoint() {
      return {
        start: () => endpoint.start(),
        bindServiceInstance: (serviceInstanceId) =>
          endpoint.bindServiceInstance(serviceInstanceId),
        stop: () => endpoint.stop(),
      };
    },
    startProductionSupervisor(reverseHost) {
      recordStartup({
        trace: startupTrace,
        phase: "supervisor-launch",
        outcome: "started",
      });
      const supervisor = startSynthesisProductionRuntimeSupervisor({
        runtimeRoot: persistence.runtimeRoot,
        profilePath: resolvedProfilePath,
        libraryId,
        repositoryDbPath: persistence.synthesisDbPath,
        canonicalRoot: persistence.synthesisDataRoot,
        reverseHost,
        installer,
        resolvedInstall: install,
        ...(startupTrace ? { startupTrace } : {}),
      });
      let lastLifecycleObservation = "";
      supervisor.subscribe((snapshot) => {
        const observationKey = [
          snapshot.restartCount,
          snapshot.status,
          snapshot.recoveryState,
          snapshot.reasonCode || "",
        ].join(":");
        if (observationKey === lastLifecycleObservation) {
          return;
        }
        lastLifecycleObservation = observationKey;
        const attemptTrace = createSynthesisSidecarTraceContext({
          parent: startupTrace,
          attempt: snapshot.restartCount,
        });
        recordStartup({
          trace: attemptTrace,
          phase:
            snapshot.status === "ready" ? "discovery" : "supervisor-launch",
          outcome:
            snapshot.status === "ready"
              ? "succeeded"
              : snapshot.recoveryState === "manual-recovery-required"
                ? "failed"
                : "started",
          code: snapshot.reasonCode,
        });
      });
      return supervisor;
    },
    stopProductionSupervisor: stopSynthesisProductionRuntimeSupervisor,
    async afterReady(connection) {
      const reconcileTrace = createSynthesisSidecarTraceContext({
        parent: startupTrace,
      });
      recordStartup({
        trace: reconcileTrace,
        phase: "reconcile",
        outcome: "started",
      });
      await createSynthesisSidecarRpcClient({
        transportErrors: SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
      }).call({
        connection: rpcConnection(connection, profileId),
        capability: "client.reconcileSynthesisRuntimeWorkStateOnStartup",
        payload: toSynthesisJsonObject({ args: [] }, "$.productionReconcile"),
        rebuildResult: (value) => value,
        deadlineMs: synthesisProductionTransportDeadlineMs(
          "client.reconcileSynthesisRuntimeWorkStateOnStartup",
        ),
        trace: reconcileTrace,
      });
      recordStartup({
        trace: reconcileTrace,
        phase: "reconcile",
        outcome: "succeeded",
      });
      recordStartup({
        trace: startupTrace,
        phase: "ready",
        outcome: "succeeded",
      });
    },
  });
}

let defaultProductionOwner: Awaited<
  ReturnType<typeof createDefaultSynthesisProductionOwner>
> | null = null;
let defaultProductionOwnerTask: ReturnType<
  typeof createDefaultSynthesisProductionOwner
> | null = null;
let defaultProductionStartupTrace: SynthesisSidecarTraceContext | undefined;

async function getDefaultSynthesisProductionOwner() {
  if (!defaultProductionOwnerTask) {
    defaultProductionStartupTrace = createSynthesisSidecarTraceContext();
    recordStartup({
      trace: defaultProductionStartupTrace,
      phase: "startup",
      outcome: "started",
    });
    defaultProductionOwnerTask = createDefaultSynthesisProductionOwner(
      defaultProductionStartupTrace,
    );
  }
  defaultProductionOwner ||= await defaultProductionOwnerTask;
  setDefaultSynthesisClientRecovery(async () => {
    await defaultProductionOwner?.recoverIfEligible();
  });
  return defaultProductionOwner;
}

export async function startDefaultSynthesisProductionOwner() {
  try {
    return await (await getDefaultSynthesisProductionOwner()).start();
  } catch (error) {
    recordStartup({
      trace: defaultProductionStartupTrace,
      phase: "startup-terminal",
      outcome: "failed",
      code: startupCode(error),
    });
    throw error;
  }
}

export async function recoverDefaultSynthesisProductionOwner() {
  if (defaultProductionOwner) {
    return defaultProductionOwner.recover();
  }
  defaultProductionOwnerTask = null;
  return startDefaultSynthesisProductionOwner();
}

export async function stopDefaultSynthesisProductionOwner() {
  const shutdownTrace = createSynthesisSidecarTraceContext();
  recordStartup({
    trace: shutdownTrace,
    phase: "shutdown",
    outcome: "started",
  });
  const owner = await defaultProductionOwnerTask?.catch(() => null);
  defaultProductionOwner = null;
  defaultProductionOwnerTask = null;
  setDefaultSynthesisClientRecovery(null);
  await owner?.shutdown();
  recordStartup({
    trace: shutdownTrace,
    phase: "shutdown-terminal",
    outcome: "succeeded",
  });
  defaultProductionStartupTrace = undefined;
}
