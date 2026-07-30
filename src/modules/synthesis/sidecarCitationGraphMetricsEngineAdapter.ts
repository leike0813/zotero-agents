import type { SynthesisCitationGraphMetricsEngine } from "../../../packages/synthesis-engine/src/index";
import {
  createSynthesisSidecarComputeClient,
  SYNTHESIS_SIDECAR_COMPUTE_DEADLINE_MS,
  SynthesisSidecarComputeClientError,
  type SynthesisSidecarComputeConnection,
} from "../synthesisSidecarComputeClient";
import { getReadySynthesisSidecarControlConnection } from "../synthesisSidecarRuntimeSupervisor";

type ComputeClient = Pick<
  ReturnType<typeof createSynthesisSidecarComputeClient>,
  "computeCitationGraphMetrics"
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

export function createSynthesisSidecarCitationGraphMetricsEngine(options?: {
  getReadyConnection?: () => ReadyControlConnection | null;
  computeClient?: ComputeClient;
  signal?: AbortSignal;
}): SynthesisCitationGraphMetricsEngine {
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
      return computeClient.computeCitationGraphMetrics(
        toComputeConnection(connection),
        request,
        {
          signal: options?.signal,
          deadlineMs: SYNTHESIS_SIDECAR_COMPUTE_DEADLINE_MS,
        },
      );
    },
  };
}
