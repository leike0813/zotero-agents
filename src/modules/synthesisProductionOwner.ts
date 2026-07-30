import {
  SYNTHESIS_PRODUCTION_ADMISSION_SCHEMA,
  SYNTHESIS_SIDECAR_LAUNCH_CONFIG_SCHEMA,
  SYNTHESIS_SIDECAR_LEASE_SCHEMA,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
  SYNTHESIS_SIDECAR_PROTOCOL,
  SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
  rebuildSynthesisProductionAdmission,
  rebuildSynthesisSidecarLaunchConfig,
  toSynthesisJsonObject,
  type SynthesisCutoverReceipt,
  type SynthesisProductionAdmission,
} from "../../packages/synthesis-contracts/src";
import { sha256Hex } from "../platform/hash";
import { detectRuntimePlatform } from "../platform/runtimePlatform";
import { joinPath } from "../utils/path";
import { getMozillaSubprocessModule } from "../utils/runtimeCompatibility";
import {
  drainDefaultSynthesisClientGeneration,
  invalidateDefaultSynthesisClient,
} from "./synthesisClient/defaultClient";
import { SYNTHESIS_SCHEMA_VERSION } from "./synthesis/foundation";
import {
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  getSynthesisSidecarLifecyclePaths,
  removeRuntimePath,
  replacePrivateRuntimeTextFileAtomically,
} from "./runtimePersistence";
import { createSynthesisCutoverReceiptStore } from "./synthesisCutoverReceiptStore";
import { createSynthesisProductionBackupService } from "./synthesisProductionBackup";
import { createSynthesisProductionCutoverCoordinator } from "./synthesisProductionCutover";
import { createSynthesisReverseHostEndpoint } from "./synthesisReverseHostEndpoint";
import { createDefaultSynthesisReverseHostHandlers } from "./synthesisReverseHostHandlers";
import { createSynthesisSidecarRpcClient } from "./synthesisSidecarRpcClient";
import { createSynthesisSidecarComputeClient } from "./synthesisSidecarComputeClient";
import { createSynthesisProductionSidecarControlClient } from "./synthesisSidecarControlClient";
import { createSynthesisSidecarRuntimeInstaller } from "./synthesisSidecarRuntimeInstaller";
import {
  activateSynthesisProductionRuntime,
  startSynthesisProductionRuntimeSupervisor,
  stopSynthesisProductionRuntimeSupervisor,
} from "./synthesisSidecarRuntimeSupervisor";
import { createSynthesisProductionSmokeEvidence } from "./synthesisProductionSmoke";
import {
  beginSynthesisSidecarStartupAttempt,
  getSynthesisSidecarDiagnosticSnapshot,
  recordSynthesisSidecarStartupPhase,
  type SynthesisSidecarStartupPhase,
} from "./synthesisSidecarDiagnostics";

type ReverseHostEndpoint = {
  start():
    | {
        host: "127.0.0.1";
        port: number;
        authorizationToken: string;
      }
    | Promise<{
        host: "127.0.0.1";
        port: number;
        authorizationToken: string;
      }>;
  bindServiceInstance?(serviceInstanceId: string): void;
  stop(): Promise<void>;
};

type CutoverCoordinator = {
  run(): Promise<{
    status: "mutation_enabled";
    receipt: SynthesisCutoverReceipt;
  }>;
};

export type SynthesisProductionOwnerDeps = {
  createReverseHostEndpoint(): ReverseHostEndpoint;
  createCutoverCoordinator(endpoint: ReverseHostEndpoint): CutoverCoordinator;
  stopProductionSupervisor(): Promise<void>;
  invalidateClient?: () => void;
};

export function createSynthesisProductionOwner(
  deps: SynthesisProductionOwnerDeps,
) {
  let endpoint: ReverseHostEndpoint | null = null;
  let startTask: Promise<SynthesisCutoverReceipt> | null = null;
  let stopTask: Promise<void> | null = null;
  let stopped = false;

  function start() {
    if (stopped) {
      throw new Error("synthesis_production_owner_stopped");
    }
    startTask ||= (async () => {
      endpoint = deps.createReverseHostEndpoint();
      await endpoint.start();
      const result = await deps.createCutoverCoordinator(endpoint).run();
      return result.receipt;
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
      await endpoint?.stop();
      await deps.stopProductionSupervisor();
    })();
    return stopTask;
  }

  return {
    start,
    whenReady() {
      return start();
    },
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

function exitCode(proc: { exitCode?: unknown; exitValue?: unknown }) {
  for (const value of [proc.exitCode, proc.exitValue]) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.floor(value);
    }
  }
  return 0;
}

type ProcessDiagnosticEvidence = {
  stdoutTail?: string;
  stderrTail?: string;
};

class SynthesisSidecarProcessError extends Error {
  constructor(
    code: string,
    readonly evidence: ProcessDiagnosticEvidence,
  ) {
    super(code);
    this.name = "SynthesisSidecarProcessError";
  }
}

async function readProcessTail(
  stream:
    | {
        readString?: () => Promise<string>;
      }
    | undefined,
) {
  if (typeof stream?.readString !== "function") {
    return "";
  }
  let tail = "";
  for (;;) {
    const chunk = await stream.readString();
    if (!chunk) {
      return tail;
    }
    tail = `${tail}${chunk}`.slice(-8_192);
  }
}

async function runSynthesisSidecarProcess(args: {
  executablePath: string;
  arguments: string[];
  workdir: string;
}) {
  const subprocess = getMozillaSubprocessModule();
  if (!subprocess?.call) {
    throw new Error("sidecar_subprocess_unavailable");
  }
  const proc = await subprocess.call({
    command: args.executablePath,
    arguments: args.arguments,
    workdir: args.workdir,
  });
  const stdoutTask = readProcessTail(proc.stdout);
  const stderrTask = readProcessTail(proc.stderr);
  const waited = await proc.wait?.();
  const [stdoutTail, stderrTail] = await Promise.all([stdoutTask, stderrTask]);
  return {
    code: typeof waited === "number" ? waited : exitCode(proc),
    evidence: {
      ...(stdoutTail ? { stdoutTail } : {}),
      ...(stderrTail ? { stderrTail } : {}),
    },
  };
}

function processDiagnosticEvidence(error: unknown) {
  return error instanceof SynthesisSidecarProcessError ? error.evidence : {};
}

async function runPreflightProcess(args: {
  executablePath: string;
  configPath: string;
  admissionPath: string;
  workdir: string;
}) {
  const result = await runSynthesisSidecarProcess({
    executablePath: args.executablePath,
    arguments: [
      "preflight-production",
      "--config",
      args.configPath,
      "--admission",
      args.admissionPath,
    ],
    workdir: args.workdir,
  });
  if (result.code !== 0) {
    throw new SynthesisSidecarProcessError(
      `synthesis_production_preflight_failed:${result.code}`,
      result.evidence,
    );
  }
  return result.evidence;
}

async function runEmptyProductionBootstrap(args: {
  executablePath: string;
  requestPath: string;
  workdir: string;
}) {
  const result = await runSynthesisSidecarProcess({
    executablePath: args.executablePath,
    arguments: ["prepare-empty-production", "--request", args.requestPath],
    workdir: args.workdir,
  });
  if (result.code !== 0) {
    throw new SynthesisSidecarProcessError(
      `synthesis_empty_profile_bootstrap_failed:${result.code}`,
      result.evidence,
    );
  }
  return result.evidence;
}

async function waitForProductionConnection(
  supervisor: ReturnType<typeof startSynthesisProductionRuntimeSupervisor>,
) {
  const deadline = Date.now() + 60_000;
  for (;;) {
    const connection = supervisor.getReadyConnection();
    if (connection) {
      return connection;
    }
    const snapshot = supervisor.getSnapshot();
    if (
      snapshot.status === "unavailable" ||
      snapshot.status === "incompatible"
    ) {
      throw new Error(
        snapshot.reasonCode || "synthesis_production_owner_unavailable",
      );
    }
    if (Date.now() >= deadline) {
      throw new Error("synthesis_production_owner_timeout");
    }
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 50));
  }
}

async function createDefaultSynthesisProductionOwner(attemptId: string) {
  const persistence = getRuntimePersistencePaths();
  const resolvedProfilePath = profilePath();
  const profileId = await hashText(resolvedProfilePath);
  const supervisorInstanceId = `sup-${randomHex(16)}`;
  const reverseHostToken = randomHex(32);
  recordSynthesisSidecarStartupPhase({
    attemptId,
    phase: "runtime-install",
    status: "running",
    evidence: {
      runtimeRoot: persistence.runtimeRoot,
      repositoryDbPath: persistence.synthesisDbPath,
      canonicalRoot: persistence.synthesisDataRoot,
      supervisorInstanceId,
    },
  });
  const installer = createSynthesisSidecarRuntimeInstaller({
    runtimeRoot: persistence.runtimeRoot,
    verificationPolicy: "production",
  });
  const install = await installer.ensureInstalled();
  if (
    install.state !== "ready" ||
    !install.executablePath ||
    !install.bundleId ||
    !install.buildFingerprint ||
    !install.implementation ||
    !install.targetTriple ||
    !install.serviceVersion ||
    !install.protocolVersion ||
    !install.platformSignature
  ) {
    throw new Error(
      install.diagnostics[0]?.code || "synthesis_sidecar_runtime_unavailable",
    );
  }
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

  const receiptStore = createSynthesisCutoverReceiptStore({
    receiptPath: persistence.synthesisCutoverReceiptPath,
  });
  const backup = createSynthesisProductionBackupService({
    async prepareEmptySource() {
      recordSynthesisSidecarStartupPhase({
        attemptId,
        phase: "empty-profile-bootstrap",
        status: "running",
      });
      const bootstrapSupervisorId = `bootstrap-${randomHex(16)}`;
      const lifecycle = getSynthesisSidecarLifecyclePaths({
        runtimeRoot: persistence.runtimeRoot,
        profileId,
        supervisorInstanceId: bootstrapSupervisorId,
      });
      await ensureRuntimeDirectory(lifecycle.sessionRoot);
      const requestPath = joinPath(
        lifecycle.sessionRoot,
        "empty-production-request.json",
      );
      await replacePrivateRuntimeTextFileAtomically(
        requestPath,
        `${JSON.stringify({
          schema: "synthesis-empty-production-request.v1",
          profileId,
          dataRootId: await hashText(persistence.synthesisDataRoot),
          repositoryDbPath: persistence.synthesisDbPath,
          canonicalRoot: persistence.synthesisDataRoot,
        })}\n`,
      );
      try {
        try {
          const evidence = await runEmptyProductionBootstrap({
            executablePath: install.executablePath!,
            requestPath,
            workdir: lifecycle.sessionRoot,
          });
          recordSynthesisSidecarStartupPhase({
            attemptId,
            phase: "empty-profile-bootstrap",
            status: "succeeded",
            evidence: {
              sourceOwner: "empty-profile",
              ...evidence,
            },
          });
        } catch (error) {
          recordSynthesisSidecarStartupPhase({
            attemptId,
            phase: "empty-profile-bootstrap",
            status: "failed",
            code:
              error instanceof Error
                ? error.message
                : "synthesis_empty_profile_bootstrap_failed",
            evidence: processDiagnosticEvidence(error),
            error,
          });
          throw error;
        }
      } finally {
        await removeRuntimePath(lifecycle.sessionRoot).catch(() => undefined);
      }
    },
  });
  let endpointLocator:
    | {
        host: "127.0.0.1";
        port: number;
        authorizationToken: string;
      }
    | undefined;
  let liveSupervisor: ReturnType<
    typeof startSynthesisProductionRuntimeSupervisor
  > | null = null;
  let liveConnection: Awaited<
    ReturnType<typeof waitForProductionConnection>
  > | null = null;
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

  async function preflight(
    basis: Awaited<ReturnType<typeof backup.createVerifiedBackup>>,
    receipt: SynthesisCutoverReceipt,
  ) {
    if (!endpointLocator) {
      throw new Error("synthesis_reverse_host_unavailable");
    }
    const preflightSupervisorId = `preflight-${randomHex(16)}`;
    const lifecycle = getSynthesisSidecarLifecyclePaths({
      runtimeRoot: persistence.runtimeRoot,
      profileId,
      supervisorInstanceId: preflightSupervisorId,
    });
    await ensureRuntimeDirectory(lifecycle.sessionRoot);
    const leaseNonce = `lease-${randomHex(16)}`;
    const config = rebuildSynthesisSidecarLaunchConfig({
      schema: SYNTHESIS_SIDECAR_LAUNCH_CONFIG_SCHEMA,
      profileId,
      profileRuntimeRoot: lifecycle.profileRoot,
      runtimeRootId: await hashText(persistence.runtimeRoot),
      dataRootId: await hashText(persistence.synthesisDataRoot),
      bundleId: install.bundleId!,
      implementation: "rust-native",
      target: install.target,
      targetTriple: install.targetTriple!,
      buildFingerprint: install.buildFingerprint!,
      platformSignature: install.platformSignature!,
      serviceVersion: install.serviceVersion!,
      protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
      schemaVersion: SYNTHESIS_SCHEMA_VERSION,
      supervisorInstanceId: preflightSupervisorId,
      leaseNonce,
      clientToken: randomHex(32),
      lifecycleToken: randomHex(32),
      mutationEnabled: false,
      port: 0,
    });
    const admission = rebuildSynthesisProductionAdmission({
      schema: SYNTHESIS_PRODUCTION_ADMISSION_SCHEMA,
      purpose: "preflight_copy",
      profileId,
      supervisorInstanceId: preflightSupervisorId,
      cutoverReceiptId: receipt.receiptId,
      cutoverReceiptPath: persistence.synthesisCutoverReceiptPath,
      capabilityFingerprint:
        SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
      repositoryDbPath: joinPath(basis.backupRoot, "state", "synthesis.db"),
      canonicalRoot: joinPath(basis.backupRoot, "data", "synthesis"),
      reverseHost: endpointLocator,
      mutationEnabled: false,
    });
    const admissionPath = joinPath(
      lifecycle.sessionRoot,
      "preflight-admission.json",
    );
    await Promise.all([
      replacePrivateRuntimeTextFileAtomically(
        lifecycle.configPath,
        `${JSON.stringify(config)}\n`,
      ),
      replacePrivateRuntimeTextFileAtomically(
        lifecycle.leasePath,
        `${JSON.stringify({
          schema: SYNTHESIS_SIDECAR_LEASE_SCHEMA,
          profileId,
          supervisorInstanceId: preflightSupervisorId,
          leaseNonce,
          updatedAtMs: Date.now(),
        })}\n`,
      ),
      replacePrivateRuntimeTextFileAtomically(
        admissionPath,
        `${JSON.stringify(admission)}\n`,
      ),
    ]);
    return runPreflightProcess({
      executablePath: install.executablePath!,
      configPath: lifecycle.configPath,
      admissionPath,
      workdir: lifecycle.sessionRoot,
    });
  }

  function liveAdmission(
    receipt: SynthesisCutoverReceipt,
  ): SynthesisProductionAdmission {
    if (!endpointLocator) {
      throw new Error("synthesis_reverse_host_unavailable");
    }
    return rebuildSynthesisProductionAdmission({
      schema: SYNTHESIS_PRODUCTION_ADMISSION_SCHEMA,
      purpose: "live_owner",
      profileId,
      supervisorInstanceId,
      cutoverReceiptId: receipt.receiptId,
      cutoverReceiptPath: persistence.synthesisCutoverReceiptPath,
      capabilityFingerprint:
        SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
      repositoryDbPath: persistence.synthesisDbPath,
      canonicalRoot: persistence.synthesisDataRoot,
      reverseHost: endpointLocator,
      mutationEnabled: false,
    });
  }

  const owner = createSynthesisProductionOwner({
    createReverseHostEndpoint() {
      return {
        async start() {
          endpointLocator = endpoint.start();
          return endpointLocator;
        },
        bindServiceInstance(serviceInstanceId: string) {
          endpoint.bindServiceInstance(serviceInstanceId);
        },
        async stop() {
          endpoint.stop();
        },
      };
    },
    createCutoverCoordinator(ownerEndpoint) {
      return createSynthesisProductionCutoverCoordinator({
        profileId,
        bundleFingerprint: install.buildFingerprint!,
        capabilityFingerprint:
          SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
        deps: {
          now: Date.now,
          readReceipt: receiptStore.read,
          writeReceipt: async (receipt) => {
            await receiptStore.write(receipt);
          },
          async enterMaintenance() {
            invalidateDefaultSynthesisClient();
          },
          async drainLegacyOwner() {
            await drainDefaultSynthesisClientGeneration();
          },
          async createVerifiedBackup() {
            recordSynthesisSidecarStartupPhase({
              attemptId,
              phase: "backup",
              status: "running",
            });
            const basis = await backup.createVerifiedBackup({
              sourceSchemaVersion: SYNTHESIS_SCHEMA_VERSION,
              targetSchemaVersion: SYNTHESIS_SCHEMA_VERSION,
            });
            recordSynthesisSidecarStartupPhase({
              attemptId,
              phase: "source-inspection",
              status: "succeeded",
              evidence: {
                sourceOwner: basis.sourceOwner,
              },
            });
            recordSynthesisSidecarStartupPhase({
              attemptId,
              phase: "backup",
              status: "succeeded",
            });
            return basis;
          },
          async preflightNativeOwner(basis, receipt) {
            recordSynthesisSidecarStartupPhase({
              attemptId,
              phase: "preflight",
              status: "running",
            });
            try {
              const evidence = await preflight(basis, receipt);
              recordSynthesisSidecarStartupPhase({
                attemptId,
                phase: "preflight",
                status: "succeeded",
                evidence,
              });
            } catch (error) {
              recordSynthesisSidecarStartupPhase({
                attemptId,
                phase: "preflight",
                status: "failed",
                code:
                  error instanceof Error
                    ? error.message
                    : "synthesis_production_preflight_failed",
                evidence: processDiagnosticEvidence(error),
                error,
              });
              throw error;
            }
          },
          async acquireNativeOwner(_basis, receipt) {
            if (!liveSupervisor) {
              recordSynthesisSidecarStartupPhase({
                attemptId,
                phase: "supervisor-launch",
                status: "running",
              });
              liveSupervisor = startSynthesisProductionRuntimeSupervisor({
                admission: liveAdmission(receipt),
                runtimeRoot: persistence.runtimeRoot,
                profilePath: resolvedProfilePath,
                installer,
              });
              liveSupervisor.subscribe((value) => {
                const evidence = liveSupervisor?.getDiagnosticEvidence();
                recordSynthesisSidecarStartupPhase({
                  attemptId,
                  phase:
                    value.status === "ready"
                      ? "discovery"
                      : "supervisor-launch",
                  status:
                    value.status === "unavailable" ||
                    value.status === "incompatible"
                      ? "failed"
                      : value.status === "ready"
                        ? "succeeded"
                        : "running",
                  code: value.reasonCode,
                  evidence: {
                    supervisorStatus: value.status,
                    recoveryState: value.recoveryState,
                    restartCount: value.restartCount,
                    supervisorInstanceId: value.supervisorInstanceId,
                    serviceInstanceId: value.serviceInstanceId,
                    bundleId: value.bundleId,
                    stdoutTail: evidence?.stdoutTail,
                    stderrTail: evidence?.stderrTail,
                  },
                });
              });
            }
            liveConnection = await waitForProductionConnection(liveSupervisor);
            ownerEndpoint.bindServiceInstance?.(
              liveConnection.discovery.serviceInstanceId,
            );
            return {
              serviceInstanceId: liveConnection.discovery.serviceInstanceId,
            };
          },
          async runCriticalSmoke(serviceInstanceId, receipt) {
            recordSynthesisSidecarStartupPhase({
              attemptId,
              phase: "critical-smoke",
              status: "running",
              evidence: { serviceInstanceId },
            });
            if (
              !liveConnection ||
              liveConnection.discovery.serviceInstanceId !== serviceInstanceId
            ) {
              throw new Error("synthesis_production_identity_stale");
            }
            const rpc = createSynthesisSidecarRpcClient();
            const connection = {
              baseUrl: `http://${liveConnection.discovery.host}:${liveConnection.discovery.port}`,
              profileId,
              clientToken: liveConnection.clientToken,
              serviceInstanceId,
            };
            const controlConnection = {
              discovery: liveConnection.discovery,
              clientToken: liveConnection.clientToken,
              lifecycleToken: liveConnection.lifecycleToken,
            };
            const call = async (capability: string, args: unknown[]) =>
              rpc.call({
                connection,
                capability: capability as never,
                payload: toSynthesisJsonObject({ args }, "$.productionSmoke"),
                rebuildResult: (value) => value,
              });
            const topics = await call("client.listTopics", []);
            const topicRows = Array.isArray(
              (topics as { topics?: unknown[] }).topics,
            )
              ? (topics as { topics: Array<{ topicId?: string }> }).topics
              : [];
            const topicDetail = topicRows[0]?.topicId
              ? await call("client.readTopicDetail", [
                  { topicId: topicRows[0].topicId },
                ])
              : { status: "empty" };
            const smokeEvidence = await createSynthesisProductionSmokeEvidence({
              profileId,
              receiptId: receipt.receiptId,
              serviceInstanceId,
              supervisorInstanceId,
              capabilityFingerprint:
                SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
              results: [
                {
                  id: "identity",
                  observable:
                    await createSynthesisProductionSidecarControlClient().handshake(
                      controlConnection,
                    ),
                },
                {
                  id: "storage",
                  observable: await call(
                    "client.getSynthesisWorkbenchSurfaceInput",
                    ["home", {}],
                  ),
                },
                {
                  id: "workbench",
                  observable: await call(
                    "client.getSynthesisWorkbenchChromeInput",
                    [{}],
                  ),
                },
                { id: "topic-list", observable: topics },
                { id: "topic-detail", observable: topicDetail },
                {
                  id: "canonical-manifest",
                  observable: await call("client.getPaperArtifactManifest", [
                    {},
                  ]),
                },
                {
                  id: "reference-cache",
                  observable: await call("client.getReferenceSidecarIndex", [
                    {},
                  ]),
                },
                {
                  id: "graph-read",
                  observable: await call("client.queryCitationGraph", [{}]),
                },
                {
                  id: "worker",
                  observable:
                    await createSynthesisSidecarComputeClient().computeCitationGraphMetrics(
                      connection,
                      {
                        graphHash: `sha256:${"0".repeat(64)}`,
                        nodes: [
                          { nodeId: "smoke-node", kind: "library_paper" },
                        ],
                        edges: [],
                      },
                    ),
                },
              ],
            });
            recordSynthesisSidecarStartupPhase({
              attemptId,
              phase: "critical-smoke",
              status: "succeeded",
              evidence: { serviceInstanceId },
            });
            return {
              receiptId: receipt.receiptId,
              serviceInstanceId,
              capabilityFingerprint:
                SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
              readyClientCapabilities:
                SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
              issuedAtMs: Date.now(),
              ...smokeEvidence,
            };
          },
          async enableNativeMutations(serviceInstanceId, receipt, evidence) {
            recordSynthesisSidecarStartupPhase({
              attemptId,
              phase: "activation",
              status: "running",
              evidence: { serviceInstanceId },
            });
            if (
              evidence.receiptId !== receipt.receiptId ||
              evidence.profileId !== profileId ||
              evidence.serviceInstanceId !== serviceInstanceId ||
              evidence.supervisorInstanceId !== supervisorInstanceId ||
              evidence.capabilityFingerprint !==
                SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT ||
              evidence.readyClientCapabilities !==
                SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES
            ) {
              throw new Error("synthesis_production_smoke_missing");
            }
            await activateSynthesisProductionRuntime(evidence);
            recordSynthesisSidecarStartupPhase({
              attemptId,
              phase: "activation",
              status: "succeeded",
              evidence: { serviceInstanceId },
            });
            if (liveConnection) {
              recordSynthesisSidecarStartupPhase({
                attemptId,
                phase: "reconcile",
                status: "running",
              });
              await createSynthesisSidecarRpcClient().call({
                connection: {
                  baseUrl: `http://${liveConnection.discovery.host}:${liveConnection.discovery.port}`,
                  profileId,
                  clientToken: liveConnection.clientToken,
                  serviceInstanceId,
                },
                capability:
                  "client.reconcileSynthesisRuntimeWorkStateOnStartup",
                payload: toSynthesisJsonObject(
                  { args: [] },
                  "$.productionReconcile",
                ),
                rebuildResult: (value) => value,
              });
              recordSynthesisSidecarStartupPhase({
                attemptId,
                phase: "reconcile",
                status: "succeeded",
              });
            }
            recordSynthesisSidecarStartupPhase({
              attemptId,
              phase: "ready",
              status: "succeeded",
              evidence: { serviceInstanceId },
            });
          },
          async resumeLegacyBeforeMigration() {
            invalidateDefaultSynthesisClient();
          },
          async restoreBackupBeforeAdmission(receipt) {
            await stopSynthesisProductionRuntimeSupervisor();
            liveSupervisor = null;
            liveConnection = null;
            await backup.restoreVerifiedBackup({
              backupId: receipt.backupId,
              sourceOwner: receipt.sourceOwner,
              sourceSchemaVersion: receipt.sourceSchemaVersion,
              targetSchemaVersion: receipt.targetSchemaVersion,
              canonicalManifestSha256: receipt.canonicalManifestSha256,
              durableSummarySha256: receipt.durableSummarySha256,
            });
          },
          async enterRustOnlyRepair() {
            invalidateDefaultSynthesisClient();
            await stopSynthesisProductionRuntimeSupervisor();
            liveSupervisor = null;
            liveConnection = null;
          },
        },
      });
    },
    stopProductionSupervisor: stopSynthesisProductionRuntimeSupervisor,
  });
  return owner;
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
      const code =
        error instanceof Error
          ? error.message.split(/\s+/)[0]
          : String(error || "synthesis_sidecar_startup_failed");
      recordSynthesisSidecarStartupPhase({
        attemptId,
        phase,
        status: "failed",
        code,
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
