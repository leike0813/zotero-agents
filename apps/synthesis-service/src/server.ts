import { timingSafeEqual } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { Socket } from "node:net";
import path from "node:path";
import {
  SYNTHESIS_SIDECAR_CALL_PATH,
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_HEALTH_PATH,
  SYNTHESIS_SIDECAR_LIMITS,
  SYNTHESIS_SIDECAR_PROTOCOL,
  isSynthesisSidecarCapability,
  isSynthesisSidecarGeneralCapability,
  isSynthesisSidecarWorkerCapability,
  isSynthesisSidecarSystemCapability,
  type SynthesisSidecarHealth,
  type SynthesisSidecarLifecycleState,
  type SynthesisSidecarSuccess,
} from "../../../packages/synthesis-contracts/src/sidecarSystem.js";
import {
  rebuildSynthesisWorkbenchChromeReadRequest,
  rebuildSynthesisWorkbenchOperationalChromeResult,
} from "../../../packages/synthesis-contracts/src/workbench.js";
import { readSynthesisWorkbenchOperationalChrome } from "../../../packages/synthesis-application/src/index.js";
import { rebuildSynthesisSidecarTransferAction } from "../../../packages/synthesis-contracts/src/sidecarTransfer.js";
import {
  toSynthesisJsonObject,
  type SynthesisJsonObject,
} from "../../../packages/synthesis-contracts/src/common.js";
import {
  rebuildSynthesisCitationGraphLayoutRequest,
  rebuildSynthesisCitationGraphMetricsRequest,
} from "../../../packages/synthesis-engine/src/index.js";
import { rebuildSynthesisCitationGraphBuildRequest } from "../../../packages/synthesis-engine/src/citationGraphBuild.js";
import {
  ComputeWorkerPoolError,
  createSynthesisSidecarComputeWorkerPool,
  type SynthesisSidecarComputeWorkerPool,
} from "./computeWorkerPool.js";
import {
  buildFailure,
  SidecarRuntimeError,
  toSidecarRuntimeError,
} from "./errors.js";
import { writeServiceLog } from "./logging.js";
import {
  findSynthesisSidecarJsonBoundViolation,
  parseCallRequest,
  readRequestBody,
} from "./request.js";
import type { SynthesisSidecarRuntimeConfig } from "./runtimeConfig.js";
import {
  CitationGraphTransferError,
  createCitationGraphTransferOwner,
  type CitationGraphTransferOwner,
} from "./citationGraphTransferOwner.js";
import {
  createCitationGraphBuildTransferExecutor,
  type CitationGraphBuildTransferExecutor,
} from "./citationGraphBuildTransferExecutor.js";
import {
  openSynthesisSidecarIsolatedRepository,
  type SynthesisSidecarIsolatedRepository,
} from "./isolatedRepository.js";
import { openSynthesisSidecarTopicCanonicalStore } from "./topicCanonicalStoreNode.js";
import { createSynthesisSidecarTopicApplication } from "./topicApplicationNode.js";
import { createSynthesisSidecarCitationGraphApplication } from "./citationGraphApplicationNode.js";
import { createSynthesisSidecarReferenceRefreshApplication } from "./referenceRefreshApplicationNode.js";
import { createSynthesisSidecarReferenceMatchingReviewApplication } from "./referenceMatchingReviewApplicationNode.js";
import { createSynthesisSidecarTagVocabularyApplication } from "./tagVocabularyApplicationNode.js";
import { createSynthesisSidecarConceptKbApplication } from "./conceptKbApplicationNode.js";
import { createSynthesisSidecarTopicGraphApplication } from "./topicGraphApplicationNode.js";
import { createSynthesisSidecarKnowledgeCheckpointApplication } from "./knowledgeCheckpointApplicationNode.js";
import { createSynthesisSidecarDurableBundleApplication } from "./durableBundleApplicationNode.js";
import { createSynthesisSidecarWebDavSyncApplication } from "./webDavSyncApplicationNode.js";
import { createSynthesisSidecarDebugMaintenanceApplication } from "./debugMaintenanceApplicationNode.js";
import {
  rebuildSynthesisTopicCanonicalInspectRequest,
  rebuildSynthesisTopicCanonicalInspectResult,
  type SynthesisTopicCanonicalStore,
} from "../../../packages/synthesis-application/src/topicCanonical.js";

const LOOPBACK_HOST = "127.0.0.1";
const SHUTDOWN_GRACE_MS = 500;

export type SynthesisSidecarRuntime = {
  host: typeof LOOPBACK_HOST;
  port: number;
  serviceInstanceId: string;
  beginShutdown(reason: string): void;
  stopped: Promise<void>;
};

type SynthesisSidecarServerOptions = {
  computePool?: SynthesisSidecarComputeWorkerPool;
  transferOwner?: CitationGraphTransferOwner;
  transferExecutor?: CitationGraphBuildTransferExecutor;
  repository?: SynthesisSidecarIsolatedRepository;
  canonicalStore?: SynthesisTopicCanonicalStore;
};

function bearerToken(request: IncomingMessage): string {
  const value = request.headers.authorization;
  if (typeof value !== "string" || !value.startsWith("Bearer ")) {
    return "";
  }
  return value.slice("Bearer ".length);
}

function tokensEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.byteLength !== rightBytes.byteLength) {
    return false;
  }
  return timingSafeEqual(leftBytes, rightBytes);
}

function writeJson(
  response: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
  limits?: { maxBytes: number; maxJsonNodes: number },
) {
  if (response.headersSent || response.destroyed) {
    return;
  }
  if (limits) {
    const violation = findSynthesisSidecarJsonBoundViolation(body, {
      maxDepth: SYNTHESIS_SIDECAR_LIMITS.jsonDepth,
      maxNodes: limits.maxJsonNodes,
      maxStringLength: SYNTHESIS_SIDECAR_LIMITS.stringLength,
    });
    if (violation) {
      throw new SidecarRuntimeError({
        status: 502,
        code: "response_body_too_large",
        message: "The Synthesis sidecar response body is too large.",
        details: {
          limit: violation.limit,
          limitKind: violation.kind,
        },
      });
    }
  }
  const source = JSON.stringify(body);
  const byteLength = Buffer.byteLength(source);
  if (limits && byteLength > limits.maxBytes) {
    throw new SidecarRuntimeError({
      status: 502,
      code: "response_body_too_large",
      message: "The Synthesis sidecar response body is too large.",
      details: { maxBytes: limits.maxBytes },
    });
  }
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(byteLength),
    "cache-control": "no-store",
    ...extraHeaders,
  });
  response.end(source);
}

function success(args: {
  requestId: string;
  serviceInstanceId: string;
  data: SynthesisJsonObject;
}): SynthesisSidecarSuccess {
  return {
    ok: true,
    requestId: args.requestId,
    serviceInstanceId: args.serviceInstanceId,
    data: args.data,
    diagnostics: [],
  };
}

function strictHandshake(payload: SynthesisJsonObject) {
  const keys = Object.keys(payload).sort();
  if (
    keys.length !== 3 ||
    keys[0] !== "bundleId" ||
    keys[1] !== "schemaVersion" ||
    keys[2] !== "supervisorInstanceId" ||
    typeof payload.schemaVersion !== "string" ||
    payload.schemaVersion.length === 0 ||
    payload.schemaVersion.length > 128 ||
    typeof payload.bundleId !== "string" ||
    payload.bundleId.length !== 64 ||
    typeof payload.supervisorInstanceId !== "string" ||
    payload.supervisorInstanceId.length === 0 ||
    payload.supervisorInstanceId.length > 128
  ) {
    throw new SidecarRuntimeError({
      status: 400,
      code: "invalid_request",
      message: "The handshake payload is invalid.",
    });
  }
  return {
    schemaVersion: payload.schemaVersion,
    bundleId: payload.bundleId,
    supervisorInstanceId: payload.supervisorInstanceId,
  };
}

function requireEmptyPayload(payload: SynthesisJsonObject) {
  if (Object.keys(payload).length !== 0) {
    throw new SidecarRuntimeError({
      status: 400,
      code: "invalid_request",
      message: "The shutdown payload must be empty.",
    });
  }
}

function computeRuntimeError(error: ComputeWorkerPoolError) {
  const statusByCode = {
    worker_busy: 429,
    worker_timeout: 504,
    worker_canceled: 499,
    worker_crashed: 503,
    worker_result_invalid: 502,
    worker_unavailable: 503,
  } as const;
  return new SidecarRuntimeError({
    status: statusByCode[error.code],
    code: error.code,
    message: "The Synthesis sidecar compute request failed.",
    retryable: error.retryable,
  });
}

function transferRuntimeError(error: CitationGraphTransferError) {
  const statusByCode = {
    transfer_busy: 429,
    transfer_not_found: 404,
    transfer_conflict: 409,
    transfer_limit_exceeded: 413,
    transfer_incomplete: 409,
    transfer_output_not_ready: 409,
    transfer_stopping: 503,
  } as const;
  return new SidecarRuntimeError({
    status: statusByCode[error.code],
    code: error.code,
    message: "The Citation Graph transfer request failed.",
    retryable: error.retryable,
  });
}

export async function startSynthesisSidecarServer(
  config: SynthesisSidecarRuntimeConfig,
  serviceInstanceId: string,
  options: SynthesisSidecarServerOptions = {},
): Promise<SynthesisSidecarRuntime> {
  let lifecycleState: SynthesisSidecarLifecycleState = "starting";
  let shutdownStarted = false;
  const sockets = new Set<Socket>();
  let resolveStopped: () => void = () => undefined;
  const stopped = new Promise<void>((resolve) => {
    resolveStopped = resolve;
  });
  const server: Server = createServer();
  const computePool =
    options.computePool ?? createSynthesisSidecarComputeWorkerPool();
  let canonicalStore: SynthesisTopicCanonicalStore;
  try {
    canonicalStore =
      options.canonicalStore ??
      openSynthesisSidecarTopicCanonicalStore({
        profileRuntimeRoot: config.profileRuntimeRoot,
        profileId: config.profileId,
        dataRootId: config.dataRootId,
      });
  } catch (error) {
    await computePool.shutdown();
    throw error;
  }
  let repository: SynthesisSidecarIsolatedRepository;
  try {
    repository =
      options.repository ??
      openSynthesisSidecarIsolatedRepository({
        profileRuntimeRoot: config.profileRuntimeRoot,
        profileId: config.profileId,
        dataRootId: config.dataRootId,
      });
  } catch (error) {
    canonicalStore.close();
    await computePool.shutdown();
    throw error;
  }
  const transferOwner =
    options.transferOwner ??
    createCitationGraphTransferOwner({
      root: path.join(
        config.profileRuntimeRoot,
        "sessions",
        config.supervisorInstanceId,
        "citation-graph-transfers",
      ),
    });
  let durableBundleApplication: ReturnType<
    typeof createSynthesisSidecarDurableBundleApplication
  >;
  let webDavSyncApplication: ReturnType<
    typeof createSynthesisSidecarWebDavSyncApplication
  >;
  try {
    durableBundleApplication = createSynthesisSidecarDurableBundleApplication({
      repository: repository.store,
      canonicalStore,
      producerVersion: config.serviceVersion,
    });
    webDavSyncApplication = createSynthesisSidecarWebDavSyncApplication({
      profileRuntimeRoot: config.profileRuntimeRoot,
      profileId: config.profileId,
      dataRootId: config.dataRootId,
      durable: durableBundleApplication,
    });
    await webDavSyncApplication.loadWebDavSyncState();
  } catch (error) {
    canonicalStore.close();
    repository.close();
    await Promise.allSettled([
      computePool.shutdown(),
      transferOwner.shutdown(),
    ]);
    throw error;
  }
  const topicApplication = createSynthesisSidecarTopicApplication({
    canonicalStore,
    repository: repository.store,
    computePool,
  });
  const citationGraphApplication =
    createSynthesisSidecarCitationGraphApplication({
      repository: repository.store,
      computePool,
    });
  const referenceRefreshApplication =
    createSynthesisSidecarReferenceRefreshApplication({
      repository: repository.store,
    });
  const referenceMatchingReviewApplication =
    createSynthesisSidecarReferenceMatchingReviewApplication({
      databasePath: repository.paths.databasePath,
      computePool,
    });
  const tagVocabularyApplication =
    createSynthesisSidecarTagVocabularyApplication({
      repository: repository.store,
      computePool,
    });
  const conceptKbApplication = createSynthesisSidecarConceptKbApplication({
    repository: repository.store,
    computePool,
  });
  const topicGraphApplication = createSynthesisSidecarTopicGraphApplication({
    repository: repository.store,
    computePool,
  });
  const knowledgeCheckpointApplication =
    createSynthesisSidecarKnowledgeCheckpointApplication({
      repository: repository.store,
    });
  const debugMaintenanceApplication =
    createSynthesisSidecarDebugMaintenanceApplication({
      repository: repository.store,
      canonicalStore,
    });
  const transferExecutor =
    options.transferExecutor ??
    createCitationGraphBuildTransferExecutor({
      owner: transferOwner,
      pool: computePool,
    });

  type CleanupPhase = "runtime_shutdown" | "listen_rollback";
  const recordCleanupFailure = (
    phase: CleanupPhase,
    owner: string,
    error: unknown,
  ) => {
    const errorType =
      error instanceof Error && error.name.trim()
        ? error.name.trim()
        : typeof error;
    try {
      writeServiceLog("service_cleanup_failed", {
        serviceInstanceId,
        phase,
        owner,
        errorType,
      });
    } catch {
      // A logging failure must not interrupt owner cleanup.
    }
  };
  const attemptCleanup = async (
    phase: CleanupPhase,
    owner: string,
    cleanup: () => void | Promise<void>,
  ) => {
    try {
      await cleanup();
    } catch (error) {
      recordCleanupFailure(phase, owner, error);
    }
  };
  const applicationOwners = [
    {
      owner: "debug_maintenance_application",
      stopAdmission: () => debugMaintenanceApplication.stopAdmission(),
      shutdown: () => debugMaintenanceApplication.shutdown(),
    },
    {
      owner: "web_dav_sync_application",
      stopAdmission: () => webDavSyncApplication.stopAdmission(),
      shutdown: () => webDavSyncApplication.shutdown(),
    },
    {
      owner: "durable_bundle_application",
      stopAdmission: () => durableBundleApplication.stopAdmission(),
      shutdown: () => durableBundleApplication.shutdown(),
    },
    {
      owner: "knowledge_checkpoint_application",
      stopAdmission: () => knowledgeCheckpointApplication.stopAdmission(),
      shutdown: () => knowledgeCheckpointApplication.shutdown(),
    },
    {
      owner: "topic_application",
      stopAdmission: () => topicApplication.stopAdmission(),
      shutdown: () => topicApplication.shutdown(),
    },
    {
      owner: "reference_refresh_application",
      stopAdmission: () => referenceRefreshApplication.stopAdmission(),
      shutdown: () => referenceRefreshApplication.shutdown(),
    },
    {
      owner: "reference_matching_review_application",
      stopAdmission: () => referenceMatchingReviewApplication.stopAdmission(),
      shutdown: () => referenceMatchingReviewApplication.shutdown(),
    },
    {
      owner: "tag_vocabulary_application",
      stopAdmission: () => tagVocabularyApplication.stopAdmission(),
      shutdown: () => tagVocabularyApplication.shutdown(),
    },
    {
      owner: "concept_kb_application",
      stopAdmission: () => conceptKbApplication.stopAdmission(),
      shutdown: () => conceptKbApplication.shutdown(),
    },
    {
      owner: "topic_graph_application",
      stopAdmission: () => topicGraphApplication.stopAdmission(),
      shutdown: () => topicGraphApplication.shutdown(),
    },
    {
      owner: "citation_graph_application",
      stopAdmission: () => citationGraphApplication.stopAdmission(),
      shutdown: () => citationGraphApplication.shutdown(),
    },
  ] satisfies ReadonlyArray<{
    owner: string;
    stopAdmission: () => void;
    shutdown: () => Promise<void>;
  }>;
  const stopAdmissions = (phase: CleanupPhase) => [
    ...applicationOwners.map(({ owner, stopAdmission }) =>
      attemptCleanup(phase, owner, stopAdmission),
    ),
    attemptCleanup(phase, "canonical_store", () =>
      canonicalStore.stopAdmission(),
    ),
    attemptCleanup(phase, "transfer_executor", () =>
      transferExecutor.shutdown(),
    ),
  ];
  const cleanupOwners = async (
    phase: CleanupPhase,
    admissionStops = stopAdmissions(phase),
  ) => {
    await Promise.all(admissionStops);
    for (const { owner, shutdown } of applicationOwners) {
      await attemptCleanup(phase, owner, shutdown);
    }
    await attemptCleanup(phase, "canonical_store", () =>
      canonicalStore.close(),
    );
    await attemptCleanup(phase, "repository", () => repository.close());
    await Promise.all([
      attemptCleanup(phase, "compute_pool", () => computePool.shutdown()),
      attemptCleanup(phase, "transfer_owner", () => transferOwner.shutdown()),
    ]);
  };
  const closeHttpServer = (phase: CleanupPhase) =>
    new Promise<void>((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(forceTimer);
        resolve();
      };
      const forceTimer = setTimeout(() => {
        for (const socket of sockets) socket.destroy();
        server.closeAllConnections?.();
        finish();
      }, SHUTDOWN_GRACE_MS);
      forceTimer.unref();
      try {
        server.close(finish);
        server.closeIdleConnections?.();
      } catch (error) {
        recordCleanupFailure(phase, "http_server", error);
        for (const socket of sockets) socket.destroy();
        server.closeAllConnections?.();
        finish();
      }
    });

  const beginShutdown = (reason: string) => {
    if (shutdownStarted) {
      return;
    }
    shutdownStarted = true;
    lifecycleState = "stopping";
    const admissionStops = stopAdmissions("runtime_shutdown");
    writeServiceLog("service_stopping", {
      reason,
      serviceInstanceId,
    });
    void (async () => {
      try {
        await cleanupOwners("runtime_shutdown", admissionStops);
        await closeHttpServer("runtime_shutdown");
      } catch (error) {
        recordCleanupFailure("runtime_shutdown", "cleanup_coordinator", error);
        await closeHttpServer("runtime_shutdown");
      } finally {
        try {
          writeServiceLog("service_stopped", { serviceInstanceId });
        } finally {
          resolveStopped();
        }
      }
    })();
  };

  server.on("request", async (request, response) => {
    let requestId = "";
    try {
      const method = request.method ?? "";
      const url = new URL(request.url ?? "/", `http://${LOOPBACK_HOST}`);
      if (url.pathname === SYNTHESIS_SIDECAR_HEALTH_PATH) {
        if (method !== "GET") {
          throw new SidecarRuntimeError({
            status: 405,
            code: "method_not_allowed",
            message: "The health route requires GET.",
          });
        }
        const health: SynthesisSidecarHealth = {
          status: "ok",
          protocol: SYNTHESIS_SIDECAR_PROTOCOL,
          serviceVersion: config.serviceVersion,
          serviceInstanceId,
          supervisorInstanceId: config.supervisorInstanceId,
          bundleId: config.bundleId,
          lifecycleState,
          repository: repository.snapshot(),
          canonicalStore: canonicalStore.snapshot(),
          computePool: computePool.snapshot(),
          citationGraphTransfer: transferOwner.snapshot(),
        };
        writeJson(response, 200, health);
        return;
      }
      if (url.pathname !== SYNTHESIS_SIDECAR_CALL_PATH) {
        throw new SidecarRuntimeError({
          status: 404,
          code: "not_found",
          message: "The Synthesis sidecar route was not found.",
        });
      }
      if (method !== "POST") {
        throw new SidecarRuntimeError({
          status: 405,
          code: "method_not_allowed",
          message: "The call route requires POST.",
        });
      }
      const requestBody = await readRequestBody(request);
      const call = parseCallRequest(requestBody);
      requestId = call.requestId;
      const token = bearerToken(request);
      if (call.capability === "system.shutdown") {
        if (!token) {
          throw new SidecarRuntimeError({
            status: 401,
            code: "unauthorized",
            message: "Lifecycle authorization is required.",
          });
        }
        if (!tokensEqual(token, config.lifecycleToken)) {
          throw new SidecarRuntimeError({
            status: tokensEqual(token, config.clientToken) ? 403 : 401,
            code: tokensEqual(token, config.clientToken)
              ? "lifecycle_forbidden"
              : "unauthorized",
            message: "Lifecycle authorization was rejected.",
          });
        }
      } else if (!token || !tokensEqual(token, config.clientToken)) {
        throw new SidecarRuntimeError({
          status: 401,
          code: "unauthorized",
          message: "Client authorization was rejected.",
        });
      }
      if (call.protocol !== SYNTHESIS_SIDECAR_PROTOCOL) {
        throw new SidecarRuntimeError({
          status: 409,
          code: "protocol_mismatch",
          message: "The Synthesis sidecar protocol does not match.",
          details: { expectedProtocol: SYNTHESIS_SIDECAR_PROTOCOL },
        });
      }
      if (call.profileId !== config.profileId) {
        throw new SidecarRuntimeError({
          status: 409,
          code: "profile_mismatch",
          message: "The Synthesis sidecar profile does not match.",
        });
      }
      if (!isSynthesisSidecarCapability(call.capability)) {
        throw new SidecarRuntimeError({
          status: 404,
          code: "capability_not_found",
          message: "The Synthesis sidecar capability was not found.",
          details: { capability: call.capability },
        });
      }
      if (lifecycleState !== "ready" && call.capability !== "system.shutdown") {
        throw new SidecarRuntimeError({
          status: 503,
          code: "service_not_ready",
          message: "The Synthesis sidecar service is not ready.",
          retryable: true,
        });
      }
      if (call.capability === "compute.citation_graph_build_transfer") {
        try {
          const action = rebuildSynthesisSidecarTransferAction(call.payload);
          let result: unknown;
          switch (action.action) {
            case "begin":
              result = transferOwner.begin(
                action.idempotencyKey,
                action.manifest,
              );
              break;
            case "put_input_page":
              result = transferOwner.putInputPage(
                action.sessionId,
                action.page,
              );
              break;
            case "seal_input":
              result = transferOwner.sealInput(action.sessionId);
              break;
            case "execute":
              result = transferExecutor.execute(action.sessionId);
              break;
            case "status":
              result = transferOwner.status(action.sessionId);
              break;
            case "get_output_manifest":
              result = transferOwner.getOutputManifest(action.sessionId);
              break;
            case "get_output_page":
              result = transferOwner.getOutputPage(
                action.sessionId,
                action.kind,
                action.pageIndex,
              );
              break;
            case "cancel":
              transferExecutor.cancel(action.sessionId);
              result = transferOwner.cancel(action.sessionId);
              break;
          }
          writeJson(
            response,
            200,
            success({
              requestId: call.requestId,
              serviceInstanceId,
              data: toSynthesisJsonObject(result, "transferResult"),
            }),
            {},
            {
              maxBytes: SYNTHESIS_SIDECAR_LIMITS.computeResponseBodyBytes,
              maxJsonNodes: SYNTHESIS_SIDECAR_LIMITS.computeResponseJsonNodes,
            },
          );
        } catch (error) {
          if (error instanceof CitationGraphTransferError) {
            throw transferRuntimeError(error);
          }
          if (error instanceof ComputeWorkerPoolError) {
            throw computeRuntimeError(error);
          }
          throw new SidecarRuntimeError({
            status: 400,
            code: "invalid_request",
            message: "The Citation Graph transfer payload is invalid.",
          });
        }
        return;
      }
      if (isSynthesisSidecarGeneralCapability(call.capability)) {
        if (call.capability === "workbench.chrome.read") {
          try {
            rebuildSynthesisWorkbenchChromeReadRequest(call.payload);
          } catch {
            throw new SidecarRuntimeError({
              status: 400,
              code: "invalid_request",
              message: "The Workbench chrome request is invalid.",
            });
          }
          const result = rebuildSynthesisWorkbenchOperationalChromeResult(
            readSynthesisWorkbenchOperationalChrome(repository.store),
          );
          writeJson(
            response,
            200,
            success({
              requestId: call.requestId,
              serviceInstanceId,
              data: toSynthesisJsonObject(result, "workbenchChromeResult"),
            }),
            {},
            {
              maxBytes: SYNTHESIS_SIDECAR_LIMITS.requestBodyBytes,
              maxJsonNodes: SYNTHESIS_SIDECAR_LIMITS.jsonNodes,
            },
          );
          return;
        }
        if (call.capability === "topics.canonical.inspect") {
          let result;
          try {
            const request = rebuildSynthesisTopicCanonicalInspectRequest(
              call.payload,
            );
            result = rebuildSynthesisTopicCanonicalInspectResult(
              canonicalStore.inspect(request),
            );
          } catch {
            throw new SidecarRuntimeError({
              status: 400,
              code: "invalid_request",
              message: "The Topic canonical inspect request is invalid.",
            });
          }
          writeJson(
            response,
            200,
            success({
              requestId: call.requestId,
              serviceInstanceId,
              data: toSynthesisJsonObject(
                result,
                "topicCanonicalInspectResult",
              ),
            }),
            {},
            {
              maxBytes: SYNTHESIS_SIDECAR_LIMITS.requestBodyBytes,
              maxJsonNodes: SYNTHESIS_SIDECAR_LIMITS.jsonNodes,
            },
          );
          return;
        }
      }
      if (isSynthesisSidecarWorkerCapability(call.capability)) {
        let runCompute: (signal: AbortSignal) => Promise<unknown>;
        try {
          switch (call.capability) {
            case "compute.citation_graph_layout": {
              const layoutRequest = rebuildSynthesisCitationGraphLayoutRequest(
                call.payload,
              );
              runCompute = (signal) =>
                computePool.runCitationGraphLayout(layoutRequest, { signal });
              break;
            }
            case "compute.citation_graph_metrics": {
              const metricsRequest =
                rebuildSynthesisCitationGraphMetricsRequest(call.payload);
              runCompute = (signal) =>
                computePool.runCitationGraphMetrics(metricsRequest, { signal });
              break;
            }
            case "compute.citation_graph_build": {
              const graphBuildRequest =
                rebuildSynthesisCitationGraphBuildRequest(call.payload);
              runCompute = (signal) =>
                computePool.runCitationGraphBuild(graphBuildRequest, {
                  signal,
                });
              break;
            }
          }
        } catch {
          throw new SidecarRuntimeError({
            status: 400,
            code: "invalid_request",
            message: "The Citation Graph compute payload is invalid.",
          });
        }
        const controller = new AbortController();
        const disconnect = () => {
          if (!response.writableEnded) {
            controller.abort();
          }
        };
        request.once("aborted", disconnect);
        response.once("close", disconnect);
        try {
          const result = await runCompute(controller.signal);
          writeJson(
            response,
            200,
            success({
              requestId: call.requestId,
              serviceInstanceId,
              data: toSynthesisJsonObject(result, "computeResult"),
            }),
            {},
            {
              maxBytes: SYNTHESIS_SIDECAR_LIMITS.computeResponseBodyBytes,
              maxJsonNodes: SYNTHESIS_SIDECAR_LIMITS.computeResponseJsonNodes,
            },
          );
        } catch (error) {
          if (error instanceof ComputeWorkerPoolError) {
            throw computeRuntimeError(error);
          }
          throw error;
        } finally {
          request.off("aborted", disconnect);
          response.off("close", disconnect);
        }
        return;
      }
      if (!isSynthesisSidecarSystemCapability(call.capability)) {
        throw new SidecarRuntimeError({
          status: 404,
          code: "capability_not_found",
          message: "The Synthesis sidecar capability was not found.",
        });
      }
      if (call.capability === "system.handshake") {
        const handshake = strictHandshake(call.payload);
        if (handshake.schemaVersion !== config.schemaVersion) {
          throw new SidecarRuntimeError({
            status: 409,
            code: "schema_mismatch",
            message: "The Synthesis sidecar schema does not match.",
            details: { expectedSchemaVersion: config.schemaVersion },
          });
        }
        if (handshake.bundleId !== config.bundleId) {
          throw new SidecarRuntimeError({
            status: 409,
            code: "runtime_mismatch",
            message: "The Synthesis sidecar runtime bundle does not match.",
          });
        }
        if (handshake.supervisorInstanceId !== config.supervisorInstanceId) {
          throw new SidecarRuntimeError({
            status: 409,
            code: "runtime_mismatch",
            message: "The Synthesis sidecar supervisor does not match.",
          });
        }
        writeJson(
          response,
          200,
          success({
            requestId: call.requestId,
            serviceInstanceId,
            data: {
              protocol: SYNTHESIS_SIDECAR_PROTOCOL,
              serviceVersion: config.serviceVersion,
              serviceInstanceId,
              supervisorInstanceId: config.supervisorInstanceId,
              bundleId: config.bundleId,
              nodeVersion: config.nodeVersion,
              profileId: config.profileId,
              schemaVersion: config.schemaVersion,
              runtimeRootId: config.runtimeRootId,
              dataRootId: config.dataRootId,
              capabilities: [...SYNTHESIS_SIDECAR_CAPABILITIES],
              mutationEnabled: false,
              lifecycleState: "ready",
              repository: repository.snapshot(),
              canonicalStore: canonicalStore.snapshot(),
              computePool: computePool.snapshot(),
              citationGraphTransfer: transferOwner.snapshot(),
            },
          }),
        );
        return;
      }

      requireEmptyPayload(call.payload);
      beginShutdown("system.shutdown");
      writeJson(
        response,
        200,
        success({
          requestId: call.requestId,
          serviceInstanceId,
          data: {
            accepted: true,
            lifecycleState: "stopping",
          },
        }),
        { connection: "close" },
      );
    } catch (error) {
      const runtimeError = toSidecarRuntimeError(error);
      writeJson(
        response,
        runtimeError.status,
        buildFailure({
          error: runtimeError,
          requestId,
          serviceInstanceId,
        }),
        runtimeError.status === 405 ? { allow: "GET, POST" } : {},
      );
      writeServiceLog("request_rejected", {
        code: runtimeError.code,
        status: runtimeError.status,
        serviceInstanceId,
      });
    }
  });

  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  server.on("clientError", (_error, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  });

  let port: number;
  try {
    port = await new Promise<number>((resolve, reject) => {
      server.once("error", reject);
      server.listen(config.port, LOOPBACK_HOST, () => {
        server.off("error", reject);
        const address = server.address();
        if (!address || typeof address === "string") {
          reject(new Error("Synthesis sidecar server address is unavailable"));
          return;
        }
        resolve(address.port);
      });
    });
  } catch (error) {
    await cleanupOwners("listen_rollback");
    throw error;
  }
  lifecycleState = "ready";
  writeServiceLog("service_listening", {
    host: LOOPBACK_HOST,
    port,
    protocol: SYNTHESIS_SIDECAR_PROTOCOL,
    serviceVersion: config.serviceVersion,
    serviceInstanceId,
    lifecycleState,
    mutationEnabled: false,
  });

  return {
    host: LOOPBACK_HOST,
    port,
    serviceInstanceId,
    beginShutdown,
    stopped,
  };
}
