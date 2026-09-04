import {
  SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING,
  SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
  SynthesisClientError,
  canonicalizeSynthesisContractJsonArtifact,
  hashSynthesisContractCanonicalJson,
  rebuildSynthesisProtocolCapabilityDto,
  rebuildSynthesisSidecarOutputTransferReference,
  rebuildSynthesisWorkbenchSurfaceResult,
  safeSynthesisSidecarObservationReason,
  toSynthesisJsonObject,
  toSynthesisJsonValue,
  type SynthesisClient,
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
} from "../synthesisSidecarRpcClient";
import {
  SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
  synthesisProductionOperationPolicy,
  synthesisProductionTransportDeadlineMs,
} from "../synthesisProductionRpcPolicy";
import {
  consumeSynthesisSidecarOutputJson,
  createSynthesisSidecarContentTransferClient,
  SynthesisSidecarTransferClientError,
} from "../synthesisSidecarTransferClient";
import { beginSynthesisSidecarBusinessAudit } from "../synthesisSidecarBusinessAudit";
import {
  createSynthesisSidecarTraceContext,
  recordSynthesisSidecarTraceEvent,
} from "../synthesisSidecarTrace";
import { getReadySynthesisProductionControlConnection } from "../synthesisSidecarRuntimeSupervisor";
import {
  createSynthesisClientFromPort,
  type SynthesisClientPort,
} from "./clientPortAdapter";

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

function topicAssetTransfer(assets: SynthesisMaterializedAsset[]): {
  manifest: SynthesisSidecarTopicAssetsManifest;
  pages: Extract<
    SynthesisSidecarTransferPage,
    { descriptor: { kind: "content" } }
  >[];
} {
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

async function stageTopicAssets(args: {
  connection: NativeControlConnection;
  rpcClient: NativeRpcClient;
  assets: SynthesisMaterializedAsset[];
}) {
  const transfer = topicAssetTransfer(args.assets);
  const client = createSynthesisSidecarContentTransferClient({
    rpcClient: args.rpcClient,
  });
  const connection = rpcConnection(args.connection);
  const begun = await client.begin(
    connection,
    transfer.manifest.rootSha256,
    transfer.manifest,
  );
  try {
    for (const page of transfer.pages) {
      await client.putInputPage(connection, begun.sessionId, page);
    }
    await client.sealInput(connection, begun.sessionId);
    return { client, connection, sessionId: begun.sessionId };
  } catch (error) {
    await client.cancel(connection, begun.sessionId).catch(() => undefined);
    throw error;
  }
}

function productionClientRequestTransfer(
  capability: SynthesisSidecarProductionClientCapability,
  payload: SynthesisJsonObject,
): {
  manifest: SynthesisSidecarProductionClientRequestManifest;
  pages: Extract<
    SynthesisSidecarTransferPage,
    { descriptor: { kind: "content" } }
  >[];
} {
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

async function stageProductionClientRequest(args: {
  connection: NativeControlConnection;
  rpcClient: NativeRpcClient;
  capability: SynthesisSidecarProductionClientCapability;
  payload: SynthesisJsonObject;
}) {
  const transfer = productionClientRequestTransfer(
    args.capability,
    args.payload,
  );
  const client = createSynthesisSidecarContentTransferClient({
    rpcClient: args.rpcClient,
  });
  const connection = rpcConnection(args.connection);
  const begun = await client.begin(
    connection,
    transfer.manifest.rootSha256,
    transfer.manifest,
  );
  try {
    for (const page of transfer.pages) {
      await client.putInputPage(connection, begun.sessionId, page);
    }
    await client.sealInput(connection, begun.sessionId);
    return { client, connection, sessionId: begun.sessionId };
  } catch (error) {
    await client.cancel(connection, begun.sessionId).catch(() => undefined);
    throw error;
  }
}

async function resolveContentTransferResult(args: {
  connection: NativeControlConnection;
  rpcClient: NativeRpcClient;
  operation: SynthesisSidecarProductionClientCapability;
  result: unknown;
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
  return consumeSynthesisSidecarOutputJson({
    rpcClient: args.rpcClient,
    connection: rpcConnection(args.connection),
    reference: transferReference,
    target: "production_client_result",
    capability: args.operation,
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
      error.code === "invalid_request" ? "invalid_request" : "unavailable",
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
    return new SynthesisClientError(
      error.code === "invalid_request"
        ? "invalid_request"
        : error.code === "basis_mismatch" ||
            error.code === "schema_mismatch" ||
            error.code === "repository_schema_incompatible"
          ? "conflict"
          : "unavailable",
      "The native Synthesis request failed",
      { sidecarCode: error.code, sidecarReason: reason },
    );
  }
  return unavailable(
    error instanceof Error ? error.message : "native_request_failed",
  );
}

function createNativePort(args: {
  isActive: () => boolean;
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
        const audit = beginSynthesisSidecarBusinessAudit({ operation });
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
          if (!args.isActive()) {
            throw unavailable("composition_disposed");
          }
          let connection = args.getReadyConnection();
          if (!connection && args.recoverReadyConnection) {
            await args.recoverReadyConnection();
            if (!args.isActive()) {
              throw unavailable("composition_disposed");
            }
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
          let staged: Awaited<ReturnType<typeof stageTopicAssets>> | undefined;
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
              staged = await stageTopicAssets({
                connection,
                rpcClient: args.rpcClient,
                assets: request.assets,
              });
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
            staged = await stageProductionClientRequest({
              connection,
              rpcClient: args.rpcClient,
              capability: operation,
              payload,
            });
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
          try {
            result = await args.rpcClient.call({
              connection: rpcConnection(connection),
              capability: operation,
              payload,
              rebuildResult: (value) =>
                toSynthesisJsonValue(value, "$.nativeSynthesisResult"),
              deadlineMs: synthesisProductionTransportDeadlineMs(operation),
              trace,
            });
            const policy = synthesisProductionOperationPolicy(operation);
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
          } finally {
            if (staged) {
              await staged.client
                .cancel(staged.connection, staged.sessionId)
                .catch(() => undefined);
            }
          }
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
          return result;
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
}): {
  client: SynthesisClient;
  invalidate: () => void;
  dispose: () => Promise<void>;
} {
  let active = true;
  const getReadyConnection =
    options?.getReadyConnection ?? getReadySynthesisProductionControlConnection;
  const rpcClient =
    options?.rpcClient ??
    createSynthesisSidecarRpcClient({
      transportErrors: SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
    });
  const client = createSynthesisClientFromPort(
    createNativePort({
      isActive: () => active,
      getReadyConnection,
      recoverReadyConnection: options?.recoverReadyConnection,
      rpcClient,
    }),
  );
  return {
    client,
    invalidate() {
      active = false;
    },
    async dispose() {
      active = false;
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
