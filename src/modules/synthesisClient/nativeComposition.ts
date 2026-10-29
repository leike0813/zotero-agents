import {
  SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING,
  SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
  SYNTHESIS_WORKBENCH_SURFACES,
  SYNTHESIS_SEARCH_SCHEMA_ID,
  SynthesisClientError,
  canonicalizeSynthesisContractJsonArtifact,
  hashSynthesisContractCanonicalJson,
  rebuildSynthesisProtocolCapabilityDto,
  rebuildSynthesisSidecarOutputTransferReference,
  rebuildSynthesisWorkbenchSurfaceResult,
  safeSynthesisSidecarObservationReason,
  rebuildSynthesisEvidenceSearchRequest,
  rebuildSynthesisEvidenceSearchResult,
  rebuildSynthesisProtocolDto,
  rebuildSynthesisRetrievalState,
  rebuildSynthesisRetrievalMaintenanceRequest,
  rebuildSynthesisPaperSimilarityRequest,
  rebuildSynthesisPaperSimilarityResult,
  rebuildSynthesisRetrievalInvalidateRequest,
  type SynthesisRetrievalMaintenanceRequest,
  type SynthesisPaperSimilarityRequest,
  type SynthesisRetrievalInvalidateRequest,
  type SynthesisPublicMaintenanceOperation,
  type SynthesisPublicMaintenanceOperationRequest,
  type SynthesisPublicMaintenanceOperationControlRequest,
  type SynthesisSearchResult,
  type SynthesisSearchIssue,
  type SynthesisHostEvidenceScope,
  type SynthesisHostEvidenceDescriptor,
  toSynthesisJsonObject,
  toSynthesisJsonValue,
  type SynthesisClient,
  type SynthesisEvidenceSearchRequest,
  type SynthesisEvidenceSearchResult,
  type SynthesisJsonObject,
  type SynthesisMaterializedAsset,
  type SynthesisSidecarTopicAssetsManifest,
  type SynthesisSidecarProductionClientRequestManifest,
  type SynthesisSidecarTopicAssetTransferDescriptor,
  type SynthesisSidecarTransferPage,
  type SynthesisSidecarProductionClientCapability,
  type SynthesisWorkbenchReadState,
  type SynthesisWorkbenchSurfaceName,
} from "../../../packages/synthesis-contracts/src";
import {
  createSynthesisSidecarRpcClient,
  SynthesisSidecarRpcError,
  type SynthesisSidecarRpcConnection,
} from "../synthesis/sidecar/synthesisSidecarRpcClient";
import {
  SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
  synthesisProductionOperationPolicy,
  synthesisProductionTransportDeadlineMs,
} from "../synthesis/production/synthesisProductionRpcPolicy";
import {
  consumeSynthesisSidecarOutputJson,
  createSynthesisSidecarContentTransferClient,
  SynthesisSidecarTransferClientError,
  type SynthesisSidecarTransferCallOptions,
} from "../synthesis/sidecar/synthesisSidecarTransferClient";
import { beginSynthesisSidecarBusinessAudit } from "../synthesis/sidecar/synthesisSidecarBusinessAudit";
import {
  createSynthesisSidecarTraceContext,
  recordSynthesisSidecarTraceEvent,
} from "../synthesis/sidecar/synthesisSidecarTrace";
import { getReadySynthesisProductionControlConnection } from "../synthesis/sidecar/synthesisSidecarRuntimeSupervisor";
import { getSynthesisEmbeddingPrefsConfig } from "../synthesis/synthesisEmbeddingPrefs";
import {
  createSynthesisClientFromPort,
  type SynthesisClientPort,
} from "./clientPortAdapter";
import {
  createHostTopicContextAdapter,
  type NativeTopicContextPort,
} from "./hostTopicContextAdapter";
import type {
  LibraryItemSearchHit,
  WorkflowCallControl,
} from "../../workflows/types";
import {
  BoundedWaitError,
  createCancellationController,
  waitForBoundedPromise,
} from "../../utils/wait";

type NativeControlConnection = {
  discovery: {
    host: "127.0.0.1";
    port: number;
    profileId: string;
    serviceInstanceId: string;
  };
  clientToken: string;
};

type NativeRpcClient = Pick<
  ReturnType<typeof createSynthesisSidecarRpcClient>,
  "call"
>;

type NativeOperationScope = {
  deadlineAtMs: number;
  signal: AbortSignal;
  callOptions(): SynthesisSidecarTransferCallOptions;
  checkActive(): void;
  wait<T>(pending: Promise<T>): Promise<T>;
  deferCleanup(cleanup: () => Promise<unknown>): void;
};

type NativeOperationOwner = {
  run<T>(
    operation: SynthesisSidecarProductionClientCapability,
    execute: (scope: NativeOperationScope) => Promise<T>,
  ): Promise<T>;
  invalidate(): void;
  dispose(): Promise<void>;
};

function nativeWaitError(error: unknown): never {
  if (error instanceof BoundedWaitError) {
    throw new SynthesisSidecarRpcError(
      error.kind === "canceled" ? "request_canceled" : "request_timeout",
    );
  }
  throw error;
}

function createNativeOperationOwner(): NativeOperationOwner {
  let active = true;
  let disposal: Promise<void> | undefined;
  const inFlight = new Set<{ abort(): void; done: Promise<void> }>();
  const invalidate = () => {
    active = false;
    for (const entry of inFlight) entry.abort();
  };
  return {
    async run<T>(
      operation: SynthesisSidecarProductionClientCapability,
      execute: (scope: NativeOperationScope) => Promise<T>,
    ): Promise<T> {
      if (!active) throw unavailable("composition_disposed");
      const deadlineAtMs =
        Date.now() + synthesisProductionTransportDeadlineMs(operation);
      const controller = createCancellationController();
      const cleanup: Array<() => Promise<unknown>> = [];
      let businessActive = true;
      let finish!: () => void;
      const entry = {
        abort() {
          if (businessActive) controller.abort();
        },
        done: new Promise<void>((resolve) => {
          finish = resolve;
        }),
      };
      inFlight.add(entry);
      const checkActive = () => {
        if (controller.signal.aborted) {
          throw new SynthesisSidecarRpcError("request_canceled");
        }
        const remaining = deadlineAtMs - Date.now();
        if (remaining <= 0) {
          throw new SynthesisSidecarRpcError("request_timeout");
        }
        return remaining;
      };
      const scope: NativeOperationScope = {
        deadlineAtMs,
        signal: controller.signal as AbortSignal,
        checkActive,
        callOptions() {
          return {
            signal: scope.signal,
            deadlineMs: checkActive(),
          };
        },
        async wait<T>(pending: Promise<T>) {
          try {
            return await waitForBoundedPromise(pending, {
              signal: controller.signal,
              timeoutMs: deadlineAtMs - Date.now(),
              phase: "synthesis-native-operation",
            });
          } catch (error) {
            return nativeWaitError(error);
          }
        },
        deferCleanup(task) {
          cleanup.push(task);
        },
      };
      try {
        return await execute(scope);
      } finally {
        businessActive = false;
        for (const task of cleanup) {
          try {
            await waitForBoundedPromise(task(), {
              timeoutMs: 1000,
              phase: "synthesis-native-cleanup",
            });
          } catch {
            /* Cleanup cannot replace the business outcome. */
          }
        }
        inFlight.delete(entry);
        finish();
      }
    },
    invalidate,
    dispose(): Promise<void> {
      if (!disposal) {
        invalidate();
        disposal = Promise.all([...inFlight].map((entry) => entry.done)).then(
          () => undefined,
        );
      }
      return disposal;
    },
  };
}

export type NativeSynthesisEvidenceRetrievalPort = {
  searchEvidence(
    request: SynthesisEvidenceSearchRequest,
  ): Promise<SynthesisEvidenceSearchResult>;
};

export type NativeSynthesisLibraryLexicalResult = {
  result: SynthesisSearchResult<{
    itemRef: { libraryId: number; key: string };
    matches: LibraryItemSearchHit["matches"];
  }>;
  scope: SynthesisHostEvidenceScope;
  descriptors: SynthesisHostEvidenceDescriptor[];
  catalogIssues: SynthesisSearchIssue[];
  catalogLimited: boolean;
};

export type NativeSynthesisLibraryLexicalPort = {
  execute(
    request: Omit<SynthesisEvidenceSearchRequest, "libraryIds" | "cursor"> & {
      libraryIds: number[];
      cursor?: never;
    },
    control?: WorkflowCallControl,
  ): Promise<NativeSynthesisLibraryLexicalResult>;
};

export type NativeSynthesisLibraryLexicalRequest = Parameters<
  NativeSynthesisLibraryLexicalPort["execute"]
>[0];

export function rebuildSynthesisLibraryLexicalExecutionRequest(
  value: unknown,
): NativeSynthesisLibraryLexicalRequest {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_SEARCH_SCHEMA_ID,
    definition: "LibraryLexicalExecutionRequest",
    value: rebuildSynthesisEvidenceSearchRequest(value),
    direction: "request",
  });
}

export function rebuildSynthesisLibraryLexicalExecutionResult(
  value: unknown,
): NativeSynthesisLibraryLexicalResult {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_SEARCH_SCHEMA_ID,
    definition: "LibraryLexicalExecutionResult",
    value,
    direction: "result",
  });
}

export type NativeSynthesisLibraryRetrievalPort =
  NativeSynthesisLibraryLexicalPort & {
    getPublication(): Promise<string | null>;
  };

export function createNativeSynthesisRetrievalPort(options?: {
  getReadyConnection?: () => NativeControlConnection | null;
  rpcClient?: NativeRpcClient;
}) {
  const getReadyConnection =
    options?.getReadyConnection ?? getReadySynthesisProductionControlConnection;
  const owner = createNativeOperationOwner();
  let rpcClient = options?.rpcClient;
  async function call<T>(
    capability: SynthesisSidecarProductionClientCapability,
    args: unknown[],
    rebuild: (value: unknown) => T,
  ): Promise<T> {
    const payload = rebuildSynthesisProtocolCapabilityDto<{ args: unknown[] }>({
      capability,
      direction: "request",
      value: { args },
    });
    rpcClient ??= createSynthesisSidecarRpcClient({
      transportErrors: SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
    });
    // The transport owner audits every declared native operation, including
    // private Workbench adapters, without expanding the public client facade.
    const native = createNativePort({
      owner,
      getReadyConnection,
      rpcClient,
    }) as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
    return rebuild(
      await native[capability.slice("client.".length)]!(...payload.args),
    );
  }
  const operation = (value: unknown) =>
    value as SynthesisPublicMaintenanceOperation;
  const maintain = (
    capability: SynthesisSidecarProductionClientCapability,
    request: SynthesisRetrievalMaintenanceRequest,
  ) =>
    call(
      capability,
      [rebuildSynthesisRetrievalMaintenanceRequest(request)],
      operation,
    );
  return {
    getState: () =>
      call("client.getRetrievalState", [], rebuildSynthesisRetrievalState),
    build: (request: SynthesisRetrievalMaintenanceRequest) =>
      maintain("client.buildRetrievalIndex", request),
    rebuild: (request: SynthesisRetrievalMaintenanceRequest) =>
      maintain("client.rebuildRetrievalIndex", request),
    update: (request: SynthesisRetrievalMaintenanceRequest) =>
      maintain("client.updateRetrievalIndex", request),
    cleanup: () => call("client.cleanupRetrievalIndex", [], operation),
    recommend: (request: SynthesisPaperSimilarityRequest) =>
      call(
        "client.recommendSimilarPapers",
        [rebuildSynthesisPaperSimilarityRequest(request)],
        rebuildSynthesisPaperSimilarityResult,
      ),
    invalidate: (request: SynthesisRetrievalInvalidateRequest) =>
      call(
        "client.invalidateRetrievalSources",
        [rebuildSynthesisRetrievalInvalidateRequest(request)],
        (value) => value as { invalidatedGroups: number },
      ),
    getOperation: (request: SynthesisPublicMaintenanceOperationRequest) =>
      call("client.getPublicMaintenanceOperation", [request], operation),
    controlOperation: (
      request: SynthesisPublicMaintenanceOperationControlRequest,
    ) => call("client.controlPublicMaintenanceOperation", [request], operation),
  };
}

export function createNativeSynthesisLibraryRetrievalPort(options?: {
  getReadyConnection?: () => NativeControlConnection | null;
  rpcClient?: NativeRpcClient;
}): NativeSynthesisLibraryRetrievalPort {
  const getReadyConnection =
    options?.getReadyConnection ?? getReadySynthesisProductionControlConnection;
  let rpcClient = options?.rpcClient;
  const retrieval = createNativeSynthesisRetrievalPort(options);
  return {
    async execute(request, control) {
      const payload = rebuildSynthesisLibraryLexicalExecutionRequest(request);
      const connection = getReadyConnection();
      if (!connection) throw unavailable("service_not_ready");
      rpcClient ??= createSynthesisSidecarRpcClient({
        transportErrors: SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
      });
      try {
        return await rpcClient.call({
          connection: rpcConnection(connection),
          capability: "library.retrieval.execute",
          payload,
          signal: control?.signal as AbortSignal | undefined,
          deadlineMs: 10_000,
          rebuildResult(value) {
            return rebuildSynthesisProtocolDto<
              NativeSynthesisLibraryLexicalResult & {
                publication: string | null;
              }
            >({
              schemaId: SYNTHESIS_SEARCH_SCHEMA_ID,
              definition: "LibraryRetrievalExecutionResult",
              direction: "result",
              value,
            });
          },
        });
      } catch (error) {
        throw normalizeRpcError(error);
      }
    },
    async getPublication() {
      const state = await retrieval.getState();
      return getSynthesisEmbeddingPrefsConfig().enabled &&
        state.enabled &&
        state.status === "ready"
        ? state.publication
        : null;
    },
  };
}

function evidenceRetrievalPortFromNativePort(
  nativePort: SynthesisClientPort,
): NativeSynthesisEvidenceRetrievalPort {
  return {
    async searchEvidence(request) {
      if (!nativePort.searchEvidence) {
        throw unavailable("searchEvidence_not_declared");
      }
      const normalizedRequest = rebuildSynthesisEvidenceSearchRequest(request);
      return rebuildSynthesisEvidenceSearchResult(
        await nativePort.searchEvidence(normalizedRequest),
      );
    },
  };
}

const CONTENT_CHUNK_TARGET_BYTES = 48 * 1024;
const PRODUCTION_REQUEST_CHUNK_TARGET_BYTES = 512 * 1024;

function splitContentText(
  text: string,
  targetBytes = CONTENT_CHUNK_TARGET_BYTES,
) {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let remaining = text;
  while (encoder.encode(remaining).byteLength > targetBytes) {
    let low = 1;
    let high = remaining.length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (
        encoder.encode(remaining.slice(0, middle)).byteLength <= targetBytes
      ) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }
    if (
      low > 0 &&
      low < remaining.length &&
      remaining.charCodeAt(low - 1) >= 0xd800 &&
      remaining.charCodeAt(low - 1) <= 0xdbff &&
      remaining.charCodeAt(low) >= 0xdc00 &&
      remaining.charCodeAt(low) <= 0xdfff
    ) {
      low -= 1;
    }
    chunks.push(remaining.slice(0, low));
    remaining = remaining.slice(low);
  }
  chunks.push(remaining);
  return chunks;
}

type NativeContentTransfer = {
  manifest:
    | SynthesisSidecarTopicAssetsManifest
    | SynthesisSidecarProductionClientRequestManifest;
  pages: Extract<
    SynthesisSidecarTransferPage,
    { descriptor: { kind: "content" } }
  >[];
};

function topicAssetTransfer(
  assets: SynthesisMaterializedAsset[],
): NativeContentTransfer {
  const pages: Extract<
    SynthesisSidecarTransferPage,
    { descriptor: { kind: "content" } }
  >[] = [];
  const descriptors: SynthesisSidecarTopicAssetTransferDescriptor[] = [];
  for (const asset of assets) {
    const firstPage = pages.length;
    for (const chunk of splitContentText(asset.text)) {
      const rows: [string] = [chunk];
      const artifact = canonicalizeSynthesisContractJsonArtifact(rows);
      const descriptor = {
        kind: "content" as const,
        pageIndex: pages.length,
        rowCount: 1,
        byteLength: artifact.byteLength,
        sha256: artifact.sha256,
      };
      pages.push({ descriptor, rows });
    }
    descriptors.push({
      id: asset.id,
      mediaType: asset.mediaType,
      byteLength: new TextEncoder().encode(asset.text).byteLength,
      sha256: hashSynthesisContractCanonicalJson(asset.text),
      firstPage,
      pageCount: pages.length - firstPage,
    });
  }
  const body = {
    transferVersion: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION,
    encoding: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING,
    direction: "input" as const,
    header: { target: "topic_apply_assets" as const, assets: descriptors },
    pages: pages.map((page) => page.descriptor),
  };
  return {
    pages,
    manifest: {
      ...body,
      rootSha256: hashSynthesisContractCanonicalJson(body),
    },
  };
}

function productionClientRequestTransfer(
  capability: SynthesisSidecarProductionClientCapability,
  payload: SynthesisJsonObject,
): NativeContentTransfer {
  const artifact = canonicalizeSynthesisContractJsonArtifact(payload);
  const pages = splitContentText(
    artifact.text,
    PRODUCTION_REQUEST_CHUNK_TARGET_BYTES,
  ).map((chunk, pageIndex) => {
    const rows: [string] = [chunk];
    const pageArtifact = canonicalizeSynthesisContractJsonArtifact(rows);
    return {
      descriptor: {
        kind: "content" as const,
        pageIndex,
        rowCount: 1,
        byteLength: pageArtifact.byteLength,
        sha256: pageArtifact.sha256,
      },
      rows,
    };
  });
  const body = {
    transferVersion: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION,
    encoding: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING,
    direction: "input" as const,
    header: {
      target: "production_client_request" as const,
      capability,
      byteLength: artifact.byteLength,
      sha256: hashSynthesisContractCanonicalJson(artifact.text),
    },
    pages: pages.map((page) => page.descriptor),
  };
  return {
    pages,
    manifest: {
      ...body,
      rootSha256: hashSynthesisContractCanonicalJson(body),
    },
  };
}

async function stageContentTransfer(args: {
  connection: NativeControlConnection;
  rpcClient: NativeRpcClient;
  transfer: NativeContentTransfer;
  scope: NativeOperationScope;
}): Promise<{ sessionId: string }> {
  const { transfer, scope } = args;
  const client = createSynthesisSidecarContentTransferClient({
    rpcClient: args.rpcClient,
  });
  const connection = rpcConnection(args.connection);
  const begun = await scope.wait(
    client.begin(
      connection,
      transfer.manifest.rootSha256,
      transfer.manifest,
      scope.callOptions(),
    ),
  );
  scope.deferCleanup(() =>
    client.cancel(connection, begun.sessionId, { deadlineMs: 1000 }),
  );
  scope.checkActive();
  for (const page of transfer.pages) {
    await scope.wait(
      client.putInputPage(
        connection,
        begun.sessionId,
        page,
        scope.callOptions(),
      ),
    );
    scope.checkActive();
  }
  await scope.wait(
    client.sealInput(connection, begun.sessionId, scope.callOptions()),
  );
  scope.checkActive();
  return { sessionId: begun.sessionId };
}

async function resolveContentTransferResult(args: {
  connection: NativeControlConnection;
  rpcClient: NativeRpcClient;
  operation: SynthesisSidecarProductionClientCapability;
  result: unknown;
  deadlineAtMs: number;
  signal: AbortSignal;
}) {
  const resultObject = toSynthesisJsonObject(
    args.result,
    "$.nativeSynthesisLocator",
  );
  const transferReference = rebuildSynthesisSidecarOutputTransferReference(
    resultObject.contentTransfer,
  );
  if (
    Object.keys(resultObject).length !== 1 ||
    Object.keys(transferReference).length !== 2
  ) {
    throw new SynthesisClientError(
      "unavailable",
      "The native Synthesis content locator is invalid",
    );
  }
  const boundedRpc: NativeRpcClient = {
    async call(callArgs) {
      try {
        return await waitForBoundedPromise(args.rpcClient.call(callArgs), {
          signal: callArgs.signal,
          timeoutMs: callArgs.deadlineMs,
          phase: "synthesis-native-output",
        });
      } catch (error) {
        return nativeWaitError(error);
      }
    },
  };
  return consumeSynthesisSidecarOutputJson({
    rpcClient: boundedRpc,
    connection: rpcConnection(args.connection),
    reference: transferReference,
    target: "production_client_result",
    capability: args.operation,
    deadlineAtMs: args.deadlineAtMs,
    signal: args.signal,
  });
}

function rpcConnection(
  connection: NativeControlConnection,
): SynthesisSidecarRpcConnection {
  return {
    baseUrl: `http://${connection.discovery.host}:${connection.discovery.port}`,
    profileId: connection.discovery.profileId,
    clientToken: connection.clientToken,
    serviceInstanceId: connection.discovery.serviceInstanceId,
  };
}

function unavailable(reason: string): SynthesisClientError {
  return new SynthesisClientError(
    "unavailable",
    "The native Synthesis owner is unavailable",
    { reason },
  );
}

function normalizeRpcError(error: unknown) {
  if (error instanceof SynthesisClientError) {
    return error;
  }
  if (error instanceof SynthesisSidecarTransferClientError) {
    return new SynthesisClientError(
      error.code === "invalid_request"
        ? "invalid_request"
        : error.code === "request_timeout" ||
            error.code === "operation_timeout" ||
            error.code === "worker_timeout"
          ? "timeout"
          : "unavailable",
      "The native Synthesis content transfer failed",
      { sidecarCode: error.code },
    );
  }
  if (error instanceof SynthesisSidecarRpcError) {
    const detailReason = error.details.reason;
    const hasControlCharacter =
      typeof detailReason === "string" &&
      [...detailReason].some((character) => {
        const codePoint = character.codePointAt(0) ?? 0;
        return codePoint <= 0x1f || codePoint === 0x7f;
      });
    const reason =
      typeof detailReason === "string" &&
      detailReason.length <= 160 &&
      !hasControlCharacter
        ? detailReason
        : error.code;
    const location =
      typeof error.details.location === "string" &&
      error.details.location.length <= 4096
        ? error.details.location
        : "";
    const violations = Array.isArray(error.details.violations)
      ? error.details.violations.slice(0, 16).flatMap((violation) => {
          if (!violation || typeof violation !== "object") return [];
          const row = violation as Record<string, unknown>;
          return typeof row.keyword === "string" &&
            row.keyword.length <= 64 &&
            typeof row.instancePath === "string" &&
            row.instancePath.length <= 4096
            ? [
                {
                  keyword: row.keyword,
                  instancePath: row.instancePath,
                },
              ]
            : [];
        })
      : [];
    return new SynthesisClientError(
      error.code === "invalid_request"
        ? "invalid_request"
        : error.code === "not_found"
          ? "not_found"
          : error.code === "request_timeout" ||
              error.code === "operation_timeout" ||
              error.code === "worker_timeout"
            ? "timeout"
            : error.code === "internal_error" ||
                error.code === "response_invalid" ||
                error.code === "worker_result_invalid" ||
                error.code === "response_body_too_large"
              ? "internal"
              : error.code === "basis_mismatch" ||
                  error.code === "schema_mismatch" ||
                  error.code === "repository_schema_incompatible"
                ? "conflict"
                : "unavailable",
      "The native Synthesis request failed",
      {
        sidecarCode: error.code,
        sidecarReason: reason,
        ...(typeof error.details.capability === "string" &&
        /^[A-Za-z][A-Za-z0-9_.]{0,159}$/.test(error.details.capability)
          ? { capability: error.details.capability }
          : {}),
        ...((reason === "protocol_result_invalid" ||
          error.code === "invalid_request") &&
        location
          ? { location }
          : {}),
        ...((reason === "protocol_result_invalid" ||
          error.code === "invalid_request") &&
        violations.length
          ? { violations }
          : {}),
      },
    );
  }
  return unavailable(
    error instanceof Error ? error.message : "native_request_failed",
  );
}

function createNativePort(args: {
  owner: NativeOperationOwner;
  getReadyConnection: () => NativeControlConnection | null;
  recoverReadyConnection?: () => Promise<void>;
  rpcClient: NativeRpcClient;
}): SynthesisClientPort {
  const capabilities = new Set<string>(
    SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
  );
  return new Proxy({} as SynthesisClientPort, {
    get(_target, property) {
      if (typeof property !== "string") {
        return undefined;
      }
      const capability = `client.${property}`;
      if (!capabilities.has(capability)) {
        return undefined;
      }
      return async (...methodArgs: unknown[]) => {
        const operation =
          capability as SynthesisSidecarProductionClientCapability;
        const surfaceCandidate =
          typeof methodArgs[0] === "string"
            ? methodArgs[0]
            : methodArgs[0] &&
                typeof methodArgs[0] === "object" &&
                !Array.isArray(methodArgs[0])
              ? (methodArgs[0] as Record<string, unknown>).surface
              : undefined;
        const surface =
          property === "getSynthesisWorkbenchSurfaceInput" &&
          typeof surfaceCandidate === "string" &&
          SYNTHESIS_WORKBENCH_SURFACES.includes(
            surfaceCandidate as SynthesisWorkbenchSurfaceName,
          )
            ? (surfaceCandidate as SynthesisWorkbenchSurfaceName)
            : undefined;
        const audit = beginSynthesisSidecarBusinessAudit({
          operation,
          ...(surface ? { surface } : {}),
        });
        const trace = createSynthesisSidecarTraceContext();
        recordSynthesisSidecarTraceEvent({
          context: trace,
          source: "host",
          boundary: "operation",
          phase: "start",
          outcome: "started",
          identities: { operation },
        });
        try {
          return await args.owner.run(operation, async (scope) => {
            scope.checkActive();
            let connection = args.getReadyConnection();
            if (!connection && args.recoverReadyConnection) {
              await scope.wait(args.recoverReadyConnection());
              scope.checkActive();
              connection = args.getReadyConnection();
            }
            if (!connection) {
              throw unavailable("service_not_ready");
            }
            let normalizedArgs =
              property === "applyTopicSynthesisResult"
                ? [
                    {
                      bundle: methodArgs[0],
                      assets:
                        (
                          methodArgs[1] as
                            | { controlledAssets?: unknown }
                            | undefined
                        )?.controlledAssets || [],
                    },
                  ]
                : property === "getTopicContext"
                  ? methodArgs.slice(0, 1)
                  : [...methodArgs];
            while (
              normalizedArgs.length > 0 &&
              normalizedArgs[normalizedArgs.length - 1] === undefined
            ) {
              normalizedArgs.pop();
            }
            let staged: { sessionId: string } | undefined;
            let payload =
              rebuildSynthesisProtocolCapabilityDto<SynthesisJsonObject>({
                capability: operation,
                direction: "request",
                value: { args: normalizedArgs },
              });
            const policy = synthesisProductionOperationPolicy(operation);
            if (property === "applyTopicSynthesisResult") {
              const request = normalizedArgs[0] as {
                bundle: Record<string, unknown>;
                assets: SynthesisMaterializedAsset[];
              };
              const inlineBytes =
                canonicalizeSynthesisContractJsonArtifact(payload).byteLength;
              if (
                policy.requestPlane === "transfer" &&
                inlineBytes > policy.controlTargetBytes &&
                request.assets.length > 0
              ) {
                staged = await stageContentTransfer({
                  connection,
                  rpcClient: args.rpcClient,
                  transfer: topicAssetTransfer(request.assets),
                  scope,
                });
                scope.checkActive();
                normalizedArgs = [
                  {
                    bundle: request.bundle,
                    assetTransfer: { sessionId: staged.sessionId },
                  },
                ];
                payload =
                  rebuildSynthesisProtocolCapabilityDto<SynthesisJsonObject>({
                    capability: operation,
                    direction: "request",
                    value: { args: normalizedArgs },
                  });
              }
            }
            if (
              !staged &&
              policy.requestPlane === "transfer" &&
              canonicalizeSynthesisContractJsonArtifact(payload).byteLength >
                policy.controlTargetBytes
            ) {
              staged = await stageContentTransfer({
                connection,
                rpcClient: args.rpcClient,
                transfer: productionClientRequestTransfer(operation, payload),
                scope,
              });
              scope.checkActive();
              normalizedArgs = [
                { requestTransfer: { sessionId: staged.sessionId } },
              ];
              payload =
                rebuildSynthesisProtocolCapabilityDto<SynthesisJsonObject>({
                  capability: operation,
                  direction: "request",
                  value: { args: normalizedArgs },
                });
            }
            let result: unknown;
            const deadlineAtMs = scope.deadlineAtMs;
            const callOptions = scope.callOptions();
            result = await scope.wait(
              args.rpcClient.call({
                connection: rpcConnection(connection),
                capability: operation,
                payload,
                rebuildResult: (value) =>
                  toSynthesisJsonValue(value, "$.nativeSynthesisResult"),
                ...callOptions,
                trace,
              }),
            );
            scope.checkActive();
            if (
              policy.resultPlane === "locator" &&
              result &&
              typeof result === "object" &&
              !Array.isArray(result) &&
              "contentTransfer" in result
            ) {
              result = await resolveContentTransferResult({
                connection,
                rpcClient: args.rpcClient,
                operation,
                result,
                deadlineAtMs,
                signal: scope.signal,
              });
            }
            result =
              property === "getSynthesisWorkbenchSurfaceInput"
                ? rebuildSynthesisWorkbenchSurfaceResult(
                    {
                      surface:
                        normalizedArgs[0] as SynthesisWorkbenchSurfaceName,
                      state: normalizedArgs[1] as SynthesisWorkbenchReadState,
                    },
                    result,
                  )
                : rebuildSynthesisProtocolCapabilityDto({
                    capability: operation,
                    direction: "result",
                    value: result,
                  });
            scope.checkActive();
            const semantic = audit.succeeded(result);
            const resultRow =
              result && typeof result === "object" && !Array.isArray(result)
                ? (result as Record<string, unknown>)
                : undefined;
            const semanticStatus = resultRow?.status;
            recordSynthesisSidecarTraceEvent({
              context: trace,
              source: "host",
              boundary: "operation",
              phase: "terminal",
              outcome: semantic.succeeded ? "succeeded" : "failed",
              ...(!semantic.succeeded ? { code: "semantic_non_success" } : {}),
              identities: { operation },
              ...(typeof semanticStatus === "string"
                ? { facts: { semanticStatus } }
                : {}),
            });
            if (property === "consumeRelatedItemsSyncEcho") {
              // The private port contract is a plain boolean; reduce the native
              // echo receipt at this boundary so callers never see the object.
              return Boolean(resultRow?.consumed);
            }
            return result;
          });
        } catch (error) {
          const normalized = normalizeRpcError(error);
          const reason = safeSynthesisSidecarObservationReason(
            normalized.details?.reason ?? normalized.details?.sidecarReason,
          );
          audit.failed(normalized);
          recordSynthesisSidecarTraceEvent({
            context: trace,
            source: "host",
            boundary: "operation",
            phase: "terminal",
            outcome: "failed",
            code: normalized.code,
            identities: { operation, ...(reason ? { reason } : {}) },
          });
          throw normalized;
        }
      };
    },
  });
}

export function createNativeSynthesisClientComposition(options?: {
  getReadyConnection?: () => NativeControlConnection | null;
  recoverReadyConnection?: () => Promise<void>;
  rpcClient?: NativeRpcClient;
  exportDeliveryPort?: import("../../../packages/synthesis-contracts/src/index").SynthesisHostExportDeliveryPort;
}): {
  client: SynthesisClient;
  evidenceRetrieval: NativeSynthesisEvidenceRetrievalPort;
  invalidate: () => void;
  dispose: () => Promise<void>;
} {
  const owner = createNativeOperationOwner();
  const getReadyConnection =
    options?.getReadyConnection ?? getReadySynthesisProductionControlConnection;
  const rpcClient =
    options?.rpcClient ??
    createSynthesisSidecarRpcClient({
      transportErrors: SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
    });
  const nativePort = createNativePort({
    owner,
    getReadyConnection,
    recoverReadyConnection: options?.recoverReadyConnection,
    rpcClient,
  });
  const hostAdapter = createHostTopicContextAdapter(
    nativePort as NativeTopicContextPort,
    { exportDeliveryPort: options?.exportDeliveryPort },
  );
  const clientPort = new Proxy(nativePort as SynthesisClientPort, {
    get(target, property, receiver) {
      if (property === "getTopicContext") {
        return hostAdapter.getTopicContext;
      }
      return Reflect.get(target, property, receiver);
    },
  });
  const client = createSynthesisClientFromPort(clientPort);
  return {
    client,
    evidenceRetrieval: evidenceRetrievalPortFromNativePort(nativePort),
    invalidate: owner.invalidate,
    dispose: owner.dispose,
  };
}

export function createNativeSynthesisEvidenceRetrievalPort(options?: {
  getReadyConnection?: () => NativeControlConnection | null;
  recoverReadyConnection?: () => Promise<void>;
  rpcClient?: NativeRpcClient;
}): NativeSynthesisEvidenceRetrievalPort {
  const getReadyConnection =
    options?.getReadyConnection ?? getReadySynthesisProductionControlConnection;
  const rpcClient =
    options?.rpcClient ??
    createSynthesisSidecarRpcClient({
      transportErrors: SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
    });
  return evidenceRetrievalPortFromNativePort(
    createNativePort({
      owner: createNativeOperationOwner(),
      getReadyConnection,
      recoverReadyConnection: options?.recoverReadyConnection,
      rpcClient,
    }),
  );
}

export function createNativeSynthesisLibraryLexicalPort(options?: {
  getReadyConnection?: () => NativeControlConnection | null;
  rpcClient?: NativeRpcClient;
}): NativeSynthesisLibraryLexicalPort {
  const getReadyConnection =
    options?.getReadyConnection ?? getReadySynthesisProductionControlConnection;
  let rpcClient = options?.rpcClient;
  return {
    async execute(request, control) {
      const normalized =
        rebuildSynthesisLibraryLexicalExecutionRequest(request);
      const connection = getReadyConnection();
      if (!connection) throw unavailable("service_not_ready");
      rpcClient ??= createSynthesisSidecarRpcClient({
        transportErrors: SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
      });
      try {
        return await rpcClient.call({
          connection: rpcConnection(connection),
          capability: "library.lexical.execute",
          payload: normalized,
          signal: control?.signal as AbortSignal | undefined,
          deadlineMs: 10_000,
          rebuildResult(value) {
            return rebuildSynthesisLibraryLexicalExecutionResult(value);
          },
        });
      } catch (error) {
        if (
          error instanceof SynthesisSidecarRpcError &&
          (error.code === "worker_timeout" ||
            error.code === "request_timeout" ||
            error.code === "operation_timeout")
        ) {
          throw new SynthesisClientError(
            "timeout",
            "The native Library lexical execution timed out",
            { sidecarCode: error.code },
          );
        }
        if (
          error instanceof SynthesisSidecarRpcError &&
          (error.code === "worker_result_invalid" ||
            error.code === "response_invalid" ||
            error.code === "response_body_too_large" ||
            error.code === "internal_error")
        ) {
          throw new SynthesisClientError(
            "internal",
            "The native Library lexical execution failed",
            { sidecarCode: error.code },
          );
        }
        throw normalizeRpcError(error);
      }
    },
  };
}

export function createReadyNativeSynthesisClientComposition(options?: {
  recoverReadyConnection?: () => Promise<void>;
}) {
  if (
    !getReadySynthesisProductionControlConnection() &&
    !options?.recoverReadyConnection
  ) {
    throw unavailable("production_owner_not_ready");
  }
  return createNativeSynthesisClientComposition(options);
}
