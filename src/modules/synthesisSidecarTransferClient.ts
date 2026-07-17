import {
  rebuildSynthesisSidecarTransferAction,
  rebuildSynthesisSidecarTransferManifest,
  rebuildSynthesisSidecarTransferPage,
  rebuildSynthesisSidecarTransferStatus,
  type SynthesisSidecarTransferManifest,
  type SynthesisSidecarTransferPage,
  type SynthesisSidecarTransferStatus,
} from "../../packages/synthesis-contracts/src/sidecarTransfer";
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
  });

  const call = async <Result>(args: {
    connection: SynthesisSidecarTransferConnection;
    action: unknown;
    rebuildResult(value: unknown): Result;
    callOptions?: SynthesisSidecarTransferCallOptions;
  }) => {
    try {
      return await rpc.call({
        connection: args.connection,
        capability: "compute.citation_graph_build_transfer",
        payload: rebuildSynthesisSidecarTransferAction(args.action),
        rebuildResult: args.rebuildResult,
        signal: args.callOptions?.signal,
        deadlineMs: args.callOptions?.deadlineMs,
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
          manifest: strictManifest(manifest),
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
        action: { action: "put_input_page", sessionId, page: strictPage(page) },
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
        rebuildResult: strictManifest,
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
        rebuildResult: strictPage,
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
