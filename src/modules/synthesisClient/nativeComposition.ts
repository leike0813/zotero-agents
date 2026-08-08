import {
  SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING,
  SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
  SynthesisClientError,
  canonicalizeSynthesisContractJsonArtifact,
  hashSynthesisContractCanonicalJson,
  toSynthesisJsonObject,
  toSynthesisJsonValue,
  type SynthesisClient,
  type SynthesisJsonObject,
  type SynthesisMaterializedAsset,
  type SynthesisSidecarTransferManifest,
  type SynthesisSidecarTransferPage,
  type SynthesisSidecarProductionClientCapability,
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
import { createSynthesisSidecarContentTransferClient } from "../synthesisSidecarTransferClient";
import { beginSynthesisSidecarBusinessAudit } from "../synthesisSidecarBusinessAudit";
import {
  createSynthesisSidecarTraceContext,
  recordSynthesisSidecarTraceEvent,
} from "../synthesisSidecarTrace";
import { getReadySynthesisProductionControlConnection } from "../synthesisSidecarRuntimeSupervisor";
import {
  createSynthesisClientFromPort,
  type SynthesisClientPort,
} from "./inProcessClient";

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

function splitContentText(text: string) {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let remaining = text;
  while (encoder.encode(remaining).byteLength > CONTENT_CHUNK_TARGET_BYTES) {
    let low = 1;
    let high = remaining.length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (
        encoder.encode(remaining.slice(0, middle)).byteLength <=
        CONTENT_CHUNK_TARGET_BYTES
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
  manifest: SynthesisSidecarTransferManifest;
  pages: SynthesisSidecarTransferPage[];
} {
  const pages: SynthesisSidecarTransferPage[] = [];
  const descriptors: SynthesisJsonObject[] = [];
  for (const asset of assets) {
    const firstPage = pages.length;
    for (const chunk of splitContentText(asset.text)) {
      const rows = [chunk];
      const artifact = canonicalizeSynthesisContractJsonArtifact(rows);
      const descriptor = {
        kind: "content",
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
    header: { target: "topic_apply_assets", assets: descriptors },
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
  const transferReference = toSynthesisJsonObject(
    resultObject.contentTransfer,
    "$.nativeSynthesisLocator.contentTransfer",
  );
  if (
    Object.keys(resultObject).length !== 1 ||
    Object.keys(transferReference).length !== 1 ||
    typeof transferReference.sessionId !== "string"
  ) {
    throw new SynthesisClientError(
      "unavailable",
      "The native Synthesis content locator is invalid",
    );
  }
  const client = createSynthesisSidecarContentTransferClient({
    rpcClient: args.rpcClient,
  });
  const connection = rpcConnection(args.connection);
  const sessionId = transferReference.sessionId;
  try {
    const manifest = await client.getOutputManifest(connection, sessionId);
    const header = toSynthesisJsonObject(
      manifest.header,
      "$.nativeSynthesisLocator.header",
    );
    const manifestBody = {
      transferVersion: manifest.transferVersion,
      encoding: manifest.encoding,
      direction: manifest.direction,
      header: manifest.header,
      pages: manifest.pages,
    };
    if (
      manifest.transferVersion !==
        SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION ||
      manifest.encoding !== SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING ||
      manifest.direction !== "output" ||
      header.target !== "production_client_result" ||
      header.capability !== args.operation ||
      typeof header.byteLength !== "number" ||
      !Number.isSafeInteger(header.byteLength) ||
      header.byteLength < 0 ||
      typeof header.sha256 !== "string" ||
      manifest.rootSha256 !==
        hashSynthesisContractCanonicalJson(manifestBody) ||
      manifest.pages.some(
        (descriptor, index) =>
          descriptor.kind !== "content" || descriptor.pageIndex !== index,
      )
    ) {
      throw new SynthesisClientError(
        "unavailable",
        "The native Synthesis content manifest is invalid",
      );
    }
    const chunks: string[] = [];
    for (const descriptor of manifest.pages) {
      const page = await client.getOutputPage(
        connection,
        sessionId,
        descriptor.kind,
        descriptor.pageIndex,
      );
      if (
        JSON.stringify(page.descriptor) !== JSON.stringify(descriptor) ||
        page.rows.length !== 1 ||
        typeof page.rows[0] !== "string"
      ) {
        throw new SynthesisClientError(
          "unavailable",
          "The native Synthesis content page is invalid",
        );
      }
      chunks.push(page.rows[0]);
    }
    const content = chunks.join("");
    if (
      new TextEncoder().encode(content).byteLength !== header.byteLength ||
      hashSynthesisContractCanonicalJson(content) !== header.sha256
    ) {
      throw new SynthesisClientError(
        "unavailable",
        "The native Synthesis content hash is invalid",
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new SynthesisClientError(
        "unavailable",
        "The native Synthesis content result is invalid",
      );
    }
    return toSynthesisJsonValue(parsed, "$.nativeSynthesisContentResult");
  } finally {
    await client.cancel(connection, sessionId).catch(() => undefined);
  }
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
          const connection = args.getReadyConnection();
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
              : [...methodArgs];
          while (
            normalizedArgs.length > 0 &&
            normalizedArgs[normalizedArgs.length - 1] === undefined
          ) {
            normalizedArgs.pop();
          }
          let staged: Awaited<ReturnType<typeof stageTopicAssets>> | undefined;
          if (property === "applyTopicSynthesisResult") {
            const request = normalizedArgs[0] as {
              bundle: Record<string, unknown>;
              assets: SynthesisMaterializedAsset[];
            };
            const policy = synthesisProductionOperationPolicy(operation);
            const inlineBytes = new TextEncoder().encode(
              JSON.stringify({ args: normalizedArgs }),
            ).byteLength;
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
            }
          }
          let result: unknown;
          try {
            result = await args.rpcClient.call({
              connection: rpcConnection(connection),
              capability: operation,
              payload: toSynthesisJsonObject(
                {
                  args: normalizedArgs.map((value) =>
                    value === undefined ? null : value,
                  ),
                },
                "$.nativeSynthesisCall",
              ),
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
          const publicOperationId = resultRow?.operation_id;
          if (
            synthesisProductionOperationPolicy(operation).receipt ===
              "public-maintenance-operation" &&
            (semanticStatus === "pending" || semanticStatus === "running") &&
            typeof publicOperationId === "string" &&
            publicOperationId.length > 0
          ) {
            recordSynthesisSidecarTraceEvent({
              context: createSynthesisSidecarTraceContext({ parent: trace }),
              source: "host",
              boundary: "operation",
              phase: "maintenance-started",
              outcome: "started",
              identities: {
                capability: operation,
                operation: publicOperationId,
              },
              facts: { semanticStatus },
            });
          }
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
          audit.failed(normalized);
          recordSynthesisSidecarTraceEvent({
            context: trace,
            source: "host",
            boundary: "operation",
            phase: "terminal",
            outcome: "failed",
            code: normalized.code,
            identities: { operation },
          });
          throw normalized;
        }
      };
    },
  });
}

export function createNativeSynthesisClientComposition(options?: {
  getReadyConnection?: () => NativeControlConnection | null;
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

export function createReadyNativeSynthesisClientComposition() {
  if (!getReadySynthesisProductionControlConnection()) {
    throw unavailable("production_owner_not_ready");
  }
  return createNativeSynthesisClientComposition();
}
