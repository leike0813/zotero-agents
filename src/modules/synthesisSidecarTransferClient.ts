import {
  SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING,
  SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION,
  rebuildSynthesisSidecarOutputTransferReference,
  rebuildSynthesisSidecarTransferAction,
  rebuildSynthesisSidecarTransferManifest,
  rebuildSynthesisSidecarTransferPage,
  rebuildSynthesisSidecarTransferStatus,
  type SynthesisSidecarOutputTransferReference,
  type SynthesisSidecarTransferManifest,
  type SynthesisSidecarTransferPage,
  type SynthesisSidecarTransferStatus,
} from "../../packages/synthesis-contracts/src/sidecarTransfer";
import {
  SynthesisClientError,
  toSynthesisJsonObject,
  toSynthesisJsonValue,
  type SynthesisJsonValue,
} from "../../packages/synthesis-contracts/src/common";
import { hashSynthesisContractCanonicalJson } from "../../packages/synthesis-contracts/src/canonicalJson";
import type { SynthesisSidecarErrorCode } from "../../packages/synthesis-contracts/src/sidecarSystem";
import {
  rebuildSynthesisCitationGraphBuildTransferManifest,
  rebuildSynthesisCitationGraphBuildTransferPage,
} from "../../packages/synthesis-engine/src/citationGraphBuildTransfer";
import {
  createSynthesisSidecarRpcClient,
  SynthesisSidecarRpcError,
  type SynthesisSidecarRpcConnection,
} from "./synthesisSidecarRpcClient";

export type SynthesisSidecarTransferRpcClient = Pick<
  ReturnType<typeof createSynthesisSidecarRpcClient>,
  "call"
>;

export type SynthesisSidecarTransferConnection = SynthesisSidecarRpcConnection;
export type SynthesisSidecarTransferCallOptions = {
  signal?: AbortSignal;
  deadlineMs?: number;
};

export class SynthesisSidecarTransferClientError extends Error {
  constructor(readonly code: SynthesisSidecarErrorCode) {
    super(code);
    this.name = "SynthesisSidecarTransferClientError";
  }
}

function createTransferActions(args: {
  rpc: SynthesisSidecarTransferRpcClient;
  capability: "compute.citation_graph_build_transfer" | "transfer.content";
  strictManifest(value: unknown): SynthesisSidecarTransferManifest;
  strictPage(value: unknown): SynthesisSidecarTransferPage;
}) {
  const call = async <Result>(callArgs: {
    connection: SynthesisSidecarTransferConnection;
    action: unknown;
    rebuildResult(value: unknown): Result;
    callOptions?: SynthesisSidecarTransferCallOptions;
  }) => {
    try {
      return await args.rpc.call({
        connection: callArgs.connection,
        capability: args.capability,
        payload: rebuildSynthesisSidecarTransferAction(callArgs.action),
        rebuildResult: callArgs.rebuildResult,
        signal: callArgs.callOptions?.signal,
        deadlineMs: callArgs.callOptions?.deadlineMs,
      });
    } catch (error) {
      if (error instanceof SynthesisSidecarRpcError) {
        throw new SynthesisSidecarTransferClientError(error.code);
      }
      throw error;
    }
  };

  return {
    begin(
      connection: SynthesisSidecarTransferConnection,
      idempotencyKey: string,
      manifest: SynthesisSidecarTransferManifest,
      callOptions?: SynthesisSidecarTransferCallOptions,
    ): Promise<SynthesisSidecarTransferStatus> {
      return call({
        connection,
        action: {
          action: "begin",
          idempotencyKey,
          manifest: args.strictManifest(manifest),
        },
        rebuildResult: rebuildSynthesisSidecarTransferStatus,
        callOptions,
      });
    },
    putInputPage(
      connection: SynthesisSidecarTransferConnection,
      sessionId: string,
      page: SynthesisSidecarTransferPage,
      callOptions?: SynthesisSidecarTransferCallOptions,
    ): Promise<SynthesisSidecarTransferStatus> {
      return call({
        connection,
        action: {
          action: "put_input_page",
          sessionId,
          page: args.strictPage(page),
        },
        rebuildResult: rebuildSynthesisSidecarTransferStatus,
        callOptions,
      });
    },
    sealInput(
      connection: SynthesisSidecarTransferConnection,
      sessionId: string,
      callOptions?: SynthesisSidecarTransferCallOptions,
    ): Promise<SynthesisSidecarTransferStatus> {
      return call({
        connection,
        action: { action: "seal_input", sessionId },
        rebuildResult: rebuildSynthesisSidecarTransferStatus,
        callOptions,
      });
    },
    execute(
      connection: SynthesisSidecarTransferConnection,
      sessionId: string,
      callOptions?: SynthesisSidecarTransferCallOptions,
    ): Promise<SynthesisSidecarTransferStatus> {
      return call({
        connection,
        action: { action: "execute", sessionId },
        rebuildResult: rebuildSynthesisSidecarTransferStatus,
        callOptions,
      });
    },
    status(
      connection: SynthesisSidecarTransferConnection,
      sessionId: string,
      callOptions?: SynthesisSidecarTransferCallOptions,
    ): Promise<SynthesisSidecarTransferStatus> {
      return call({
        connection,
        action: { action: "status", sessionId },
        rebuildResult: rebuildSynthesisSidecarTransferStatus,
        callOptions,
      });
    },
    getOutputManifest(
      connection: SynthesisSidecarTransferConnection,
      sessionId: string,
      callOptions?: SynthesisSidecarTransferCallOptions,
    ): Promise<SynthesisSidecarTransferManifest> {
      return call({
        connection,
        action: { action: "get_output_manifest", sessionId },
        rebuildResult: args.strictManifest,
        callOptions,
      });
    },
    getOutputPage(
      connection: SynthesisSidecarTransferConnection,
      sessionId: string,
      kind: string,
      pageIndex: number,
      callOptions?: SynthesisSidecarTransferCallOptions,
    ): Promise<SynthesisSidecarTransferPage> {
      return call({
        connection,
        action: { action: "get_output_page", sessionId, kind, pageIndex },
        rebuildResult: args.strictPage,
        callOptions,
      });
    },
    cancel(
      connection: SynthesisSidecarTransferConnection,
      sessionId: string,
      callOptions?: SynthesisSidecarTransferCallOptions,
    ): Promise<{ canceled: true }> {
      return call({
        connection,
        action: { action: "cancel", sessionId },
        rebuildResult(value) {
          if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value) ||
            Object.keys(value).length !== 1 ||
            (value as { canceled?: unknown }).canceled !== true
          ) {
            throw new Error("transfer_cancel_result_invalid");
          }
          return { canceled: true };
        },
        callOptions,
      });
    },
  };
}

function strictManifest(value: unknown): SynthesisSidecarTransferManifest {
  const generic = rebuildSynthesisSidecarTransferManifest(value);
  return rebuildSynthesisCitationGraphBuildTransferManifest(
    generic,
  ) as unknown as SynthesisSidecarTransferManifest;
}

function strictPage(value: unknown): SynthesisSidecarTransferPage {
  const generic = rebuildSynthesisSidecarTransferPage(value);
  return rebuildSynthesisCitationGraphBuildTransferPage(
    generic,
  ) as unknown as SynthesisSidecarTransferPage;
}

export function createSynthesisSidecarTransferClient(options?: {
  fetch?: typeof fetch;
  deadlineMs?: number;
}) {
  const rpc = createSynthesisSidecarRpcClient({
    fetch: options?.fetch,
    deadlineMs: options?.deadlineMs ?? 5_000,
    requestIdPrefix: "transfer",
    transportErrors: {
      canceled: "worker_canceled",
      timeout: "worker_timeout",
      invalidResponse: "worker_result_invalid",
      unavailable: "worker_unavailable",
    },
  });

  return createTransferActions({
    rpc,
    capability: "compute.citation_graph_build_transfer",
    strictManifest,
    strictPage,
  });
}

export function createSynthesisSidecarContentTransferClient(options: {
  rpcClient: SynthesisSidecarTransferRpcClient;
}) {
  return createTransferActions({
    rpc: options.rpcClient,
    capability: "transfer.content",
    strictManifest: rebuildSynthesisSidecarTransferManifest,
    strictPage: rebuildSynthesisSidecarTransferPage,
  });
}

export async function consumeSynthesisSidecarOutputJson(args: {
  rpcClient: SynthesisSidecarTransferRpcClient;
  connection: SynthesisSidecarTransferConnection;
  reference: SynthesisSidecarOutputTransferReference;
  target: "production_client_result" | "host_export_entries";
  capability: string;
  cancelAfterRead?: boolean;
}): Promise<SynthesisJsonValue> {
  const reference = rebuildSynthesisSidecarOutputTransferReference(
    args.reference,
  );
  const client = createSynthesisSidecarContentTransferClient({
    rpcClient: args.rpcClient,
  });
  try {
    const manifest = await client.getOutputManifest(
      args.connection,
      reference.sessionId,
    );
    const header = toSynthesisJsonObject(
      manifest.header,
      "$.synthesisOutputTransfer.header",
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
      header.target !== args.target ||
      header.capability !== args.capability ||
      typeof header.byteLength !== "number" ||
      !Number.isSafeInteger(header.byteLength) ||
      header.byteLength < 0 ||
      typeof header.sha256 !== "string" ||
      manifest.rootSha256 !== reference.rootSha256 ||
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
        args.connection,
        reference.sessionId,
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
    return toSynthesisJsonValue(parsed, "$.synthesisOutputTransfer.content");
  } finally {
    if (args.cancelAfterRead !== false) {
      await client
        .cancel(args.connection, reference.sessionId)
        .catch(() => undefined);
    }
  }
}
