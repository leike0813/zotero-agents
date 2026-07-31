import { toSynthesisJsonObject } from "../../packages/synthesis-contracts/src";
import { sha256Hex } from "../platform/hash";
import { detectRuntimePlatform } from "../platform/runtimePlatform";
import { getRuntimePersistencePaths } from "./runtimePersistence";
import { invalidateDefaultSynthesisClient } from "./synthesisClient/defaultClient";
import { createSynthesisReverseHostEndpoint } from "./synthesisReverseHostEndpoint";
import { createDefaultSynthesisReverseHostHandlers } from "./synthesisReverseHostHandlers";
import { createSynthesisSidecarRpcClient } from "./synthesisSidecarRpcClient";
import {
  SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
  synthesisProductionTransportDeadlineMs,
} from "./synthesisProductionRpcPolicy";
import {
  createSynthesisSidecarRuntimeInstaller,
  type SynthesisSidecarRuntimeInstallSnapshot,
} from "./synthesisSidecarRuntimeInstaller";
import {
  startSynthesisProductionRuntimeSupervisor,
  stopSynthesisProductionRuntimeSupervisor,
  type SynthesisSidecarSupervisorSnapshot,
} from "./synthesisSidecarRuntimeSupervisor";
import {
  beginSynthesisSidecarStartupAttempt,
  getSynthesisSidecarDiagnosticSnapshot,
  recordSynthesisSidecarStartupPhase,
  type SynthesisSidecarStartupPhase,
} from "./synthesisSidecarDiagnostics";
import { synthesisSidecarDiagnosticCode } from "./synthesisSidecarDiagnosticEvents";

type ReverseHostLocator = {
  host: "127.0.0.1";
  port: number;
  authorizationToken: string;
};

type ReverseHostEndpoint = {
  start(): ReverseHostLocator | Promise<ReverseHostLocator>;
  bindServiceInstance(serviceInstanceId: string): void;
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

function waitForReady(supervisor: ProductionSupervisor, timeoutMs = 30_000) {
  const current = supervisor.getReadyConnection();
  if (current) {
    return Promise.resolve(current);
  }
  return new Promise<
    NonNullable<ReturnType<ProductionSupervisor["getReadyConnection"]>>
  >((resolve, reject) => {
    let settled = false;
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
      globalThis.clearTimeout(timer);
      unsubscribe();
      if (error) {
        reject(error);
      } else {
        resolve(connection!);
      }
    };
    const unsubscribe = supervisor.subscribe((snapshot) => {
      const connection = supervisor.getReadyConnection();
      if (snapshot.status === "ready" && connection) {
        finish(undefined, connection);
      } else if (
        snapshot.recoveryState === "manual-recovery-required" ||
        snapshot.status === "incompatible"
      ) {
        finish(new Error(snapshot.reasonCode || "sidecar_startup_failed"));
      }
    });
    const timer = globalThis.setTimeout(
      () => finish(new Error("sidecar_startup_timeout")),
      timeoutMs,
    );
  });
}

export function createSynthesisProductionOwner(
  deps: SynthesisProductionOwnerDeps,
) {
  let endpoint: ReverseHostEndpoint | null = null;
  let supervisor: ProductionSupervisor | null = null;
  let startTask: Promise<
    NonNullable<ReturnType<ProductionSupervisor["getReadyConnection"]>>
  > | null = null;
  let stopTask: Promise<void> | null = null;
  let stopped = false;

  function start() {
    if (stopped) {
      throw new Error("synthesis_production_owner_stopped");
    }
    startTask ||= (async () => {
      endpoint = deps.createReverseHostEndpoint();
      const locator = await endpoint.start();
      supervisor = deps.startProductionSupervisor(locator);
      const connection = await waitForReady(supervisor);
      endpoint.bindServiceInstance(connection.discovery.serviceInstanceId);
      await deps.afterReady?.(connection);
      return connection;
    })();
    void startTask.catch(() => undefined);
    return startTask;
  }

  function shutdown() {
    if (stopTask) {
      return stopTask;
    }
    stopped = true;
    (deps.invalidateClient || invalidateDefaultSynthesisClient)();
    stopTask = (async () => {
      await deps.stopProductionSupervisor();
      await endpoint?.stop();
    })();
    return stopTask;
  }

  return {
    start,
    whenReady: start,
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

async function createDefaultSynthesisProductionOwner(attemptId: string) {
  const persistence = getRuntimePersistencePaths();
  const resolvedProfilePath = profilePath();
  const profileId = await hashText(resolvedProfilePath);
  const reverseHostToken = randomHex(32);
  recordSynthesisSidecarStartupPhase({
    attemptId,
    phase: "runtime-install",
    status: "running",
    evidence: {
      runtimeRoot: persistence.runtimeRoot,
      repositoryDbPath: persistence.synthesisDbPath,
      canonicalRoot: persistence.synthesisDataRoot,
    },
  });
  const installer = createSynthesisSidecarRuntimeInstaller({
    runtimeRoot: persistence.runtimeRoot,
    verificationPolicy: "production",
  });
  const install = await installer.ensureInstalled();
  requireReadyInstall(install);
  recordSynthesisSidecarStartupPhase({
    attemptId,
    phase: "runtime-install",
    status: "succeeded",
    evidence: {
      bundleId: install.bundleId,
      buildFingerprint: install.buildFingerprint,
      targetTriple: install.targetTriple,
    },
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
      libraryId: Number(
        (
          globalThis as {
            Zotero?: { Libraries?: { userLibraryID?: number } };
          }
        ).Zotero?.Libraries?.userLibraryID || 1,
      ),
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
      recordSynthesisSidecarStartupPhase({
        attemptId,
        phase: "supervisor-launch",
        status: "running",
        evidence: {
          bundleId: install.bundleId,
          buildFingerprint: install.buildFingerprint,
        },
      });
      const supervisor = startSynthesisProductionRuntimeSupervisor({
        runtimeRoot: persistence.runtimeRoot,
        profilePath: resolvedProfilePath,
        repositoryDbPath: persistence.synthesisDbPath,
        canonicalRoot: persistence.synthesisDataRoot,
        reverseHost,
        installer,
        resolvedInstall: install,
      });
      supervisor.subscribe((snapshot) => {
        const diagnostics = supervisor.getDiagnosticEvidence();
        recordSynthesisSidecarStartupPhase({
          attemptId,
          phase:
            snapshot.status === "ready" ? "discovery" : "supervisor-launch",
          status:
            snapshot.status === "ready"
              ? "succeeded"
              : snapshot.recoveryState === "manual-recovery-required"
                ? "failed"
                : "running",
          code: snapshot.reasonCode,
          evidence: {
            bundleId: snapshot.bundleId || install.bundleId,
            buildFingerprint: install.buildFingerprint,
            supervisorInstanceId: snapshot.supervisorInstanceId,
            serviceInstanceId: snapshot.serviceInstanceId,
            supervisorStatus: snapshot.status,
            recoveryState: snapshot.recoveryState,
            restartCount: snapshot.restartCount,
            stdoutTail: diagnostics.stdoutTail,
            stderrTail: diagnostics.stderrTail,
          },
        });
      });
      return supervisor;
    },
    stopProductionSupervisor: stopSynthesisProductionRuntimeSupervisor,
    async afterReady(connection) {
      recordSynthesisSidecarStartupPhase({
        attemptId,
        phase: "reconcile",
        status: "running",
        evidence: {
          serviceInstanceId: connection.discovery.serviceInstanceId,
        },
      });
      await createSynthesisSidecarRpcClient({
        transportErrors: SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
      }).call({
        connection: {
          baseUrl: `http://${connection.discovery.host}:${connection.discovery.port}`,
          profileId,
          clientToken: connection.clientToken,
          serviceInstanceId: connection.discovery.serviceInstanceId,
        },
        capability: "client.reconcileSynthesisRuntimeWorkStateOnStartup",
        payload: toSynthesisJsonObject({ args: [] }, "$.productionReconcile"),
        rebuildResult: (value) => value,
        deadlineMs: synthesisProductionTransportDeadlineMs(
          "client.reconcileSynthesisRuntimeWorkStateOnStartup",
        ),
      });
      recordSynthesisSidecarStartupPhase({
        attemptId,
        phase: "reconcile",
        status: "succeeded",
      });
      recordSynthesisSidecarStartupPhase({
        attemptId,
        phase: "ready",
        status: "succeeded",
        evidence: {
          bundleId: install.bundleId,
          buildFingerprint: install.buildFingerprint,
          serviceInstanceId: connection.discovery.serviceInstanceId,
        },
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
let defaultProductionAttemptId: string | null = null;

async function getDefaultSynthesisProductionOwner() {
  if (!defaultProductionOwnerTask) {
    defaultProductionAttemptId = beginSynthesisSidecarStartupAttempt();
    defaultProductionOwnerTask = createDefaultSynthesisProductionOwner(
      defaultProductionAttemptId,
    );
  }
  defaultProductionOwner ||= await defaultProductionOwnerTask;
  return defaultProductionOwner;
}

export async function startDefaultSynthesisProductionOwner() {
  try {
    return await (await getDefaultSynthesisProductionOwner()).start();
  } catch (error) {
    const attemptId = defaultProductionAttemptId;
    if (attemptId) {
      const phase: SynthesisSidecarStartupPhase =
        getSynthesisSidecarDiagnosticSnapshot()?.phase || "startup";
      recordSynthesisSidecarStartupPhase({
        attemptId,
        phase,
        status: "failed",
        code: synthesisSidecarDiagnosticCode(error),
        error,
      });
    }
    throw error;
  }
}

export async function stopDefaultSynthesisProductionOwner() {
  if (defaultProductionAttemptId) {
    recordSynthesisSidecarStartupPhase({
      attemptId: defaultProductionAttemptId,
      phase: "shutdown",
      status: "running",
    });
  }
  const owner = await defaultProductionOwnerTask?.catch(() => null);
  defaultProductionOwner = null;
  defaultProductionOwnerTask = null;
  await owner?.shutdown();
  defaultProductionAttemptId = null;
}
