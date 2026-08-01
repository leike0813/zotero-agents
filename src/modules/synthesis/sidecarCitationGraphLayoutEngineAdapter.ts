import type { SynthesisCitationGraphLayoutEngine } from "../../../packages/synthesis-engine/src/index";
import {
  createSynthesisSidecarComputeClient,
  SYNTHESIS_SIDECAR_LAYOUT_DEADLINE_MS,
  SynthesisSidecarComputeClientError,
  type SynthesisSidecarComputeConnection,
} from "../synthesisSidecarComputeClient";
import { getReadySynthesisSidecarControlConnection } from "../synthesisSidecarRuntimeSupervisor";

type ComputeClient = Pick<
  ReturnType<typeof createSynthesisSidecarComputeClient>,
  "computeCitationGraphLayout"
>;

type ReadyControlConnection = {
  discovery: {
    host: "127.0.0.1";
    port: number;
    profileId: string;
    serviceInstanceId: string;
  };
  clientToken: string;
};

function toComputeConnection(
  connection: ReadyControlConnection,
): SynthesisSidecarComputeConnection {
  return {
    baseUrl: `http://${connection.discovery.host}:${connection.discovery.port}`,
    profileId: connection.discovery.profileId,
    clientToken: connection.clientToken,
    serviceInstanceId: connection.discovery.serviceInstanceId,
  };
}

export function createSynthesisSidecarCitationGraphLayoutEngine(options?: {
  getReadyConnection?: () => ReadyControlConnection | null;
  computeClient?: ComputeClient;
  signal?: AbortSignal;
}): SynthesisCitationGraphLayoutEngine {
  const getReadyConnection =
    options?.getReadyConnection ?? getReadySynthesisSidecarControlConnection;
  const computeClient =
    options?.computeClient ?? createSynthesisSidecarComputeClient();
  return {
    async compute(request) {
      const connection = getReadyConnection();
      if (!connection) {
        throw new SynthesisSidecarComputeClientError("service_not_ready");
      }
      return computeClient.computeCitationGraphLayout(
        toComputeConnection(connection),
        request,
        {
          signal: options?.signal,
          deadlineMs: SYNTHESIS_SIDECAR_LAYOUT_DEADLINE_MS,
        },
      );
    },
  };
}
