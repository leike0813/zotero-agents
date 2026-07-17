import type { SynthesisCitationGraphMetricsEngine } from "../../../packages/synthesis-engine/src/index";
import type { SynthesisSidecarControlConnection } from "../synthesisSidecarControlClient";
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

function toComputeConnection(
  connection: SynthesisSidecarControlConnection,
): SynthesisSidecarComputeConnection {
  return {
    baseUrl: `http://${connection.discovery.host}:${connection.discovery.port}`,
    profileId: connection.discovery.profileId,
    clientToken: connection.clientToken,
    serviceInstanceId: connection.discovery.serviceInstanceId,
  };
}

export function createSynthesisSidecarCitationGraphMetricsEngine(options?: {
  getReadyConnection?: () => SynthesisSidecarControlConnection | null;
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
