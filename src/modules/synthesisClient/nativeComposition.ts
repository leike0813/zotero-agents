import {
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
  SynthesisClientError,
  toSynthesisJsonObject,
  toSynthesisJsonValue,
  type SynthesisClient,
  type SynthesisSidecarProductionClientCapability,
} from "../../../packages/synthesis-contracts/src";
import {
  createSynthesisSidecarRpcClient,
  SynthesisSidecarRpcError,
  type SynthesisSidecarRpcConnection,
} from "../synthesisSidecarRpcClient";
import {
  SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
  synthesisProductionTransportDeadlineMs,
} from "../synthesisProductionRpcPolicy";
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
    return new SynthesisClientError(
      error.code === "invalid_request" ? "invalid_request" : "unavailable",
      "The native Synthesis request failed",
      { sidecarCode: error.code },
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
        if (!args.isActive()) {
          throw unavailable("composition_disposed");
        }
        const connection = args.getReadyConnection();
        if (!connection) {
          throw unavailable("service_not_ready");
        }
        try {
          const normalizedArgs =
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
          return await args.rpcClient.call({
            connection: rpcConnection(connection),
            capability:
              capability as SynthesisSidecarProductionClientCapability,
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
            deadlineMs: synthesisProductionTransportDeadlineMs(
              capability as SynthesisSidecarProductionClientCapability,
            ),
          });
        } catch (error) {
          throw normalizeRpcError(error);
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
