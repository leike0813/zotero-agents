import {
  SYNTHESIS_SIDECAR_CALL_PATH,
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_HEALTH_PATH,
  SYNTHESIS_SIDECAR_PROTOCOL,
  rebuildSynthesisSidecarHandshakeResult,
  rebuildSynthesisSidecarHealth,
  type SynthesisSidecarDiscovery,
  type SynthesisSidecarHandshakeResult,
  type SynthesisSidecarHealth,
} from "../../packages/synthesis-contracts/src";

export type SynthesisSidecarControlConnection = {
  discovery: SynthesisSidecarDiscovery;
  clientToken: string;
  lifecycleToken: string;
};

type FetchLike = typeof fetch;

function endpoint(connection: SynthesisSidecarControlConnection, path: string) {
  return `http://${connection.discovery.host}:${connection.discovery.port}${path}`;
}

async function withDeadline<T>(
  timeoutMs: number,
  task: (signal: AbortSignal) => Promise<T>,
) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error("sidecar_control_timeout")),
    timeoutMs,
  );
  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function readJsonResponse(response: Response) {
  const json = (await response.json()) as unknown;
  if (!response.ok) {
    const code =
      json && typeof json === "object" && "error" in json
        ? String(
            ((json as { error?: { code?: unknown } }).error?.code as
              | string
              | undefined) || "sidecar_control_failed",
          )
        : "sidecar_control_failed";
    throw new Error(code);
  }
  return json;
}

function validateHealth(
  value: unknown,
  connection: SynthesisSidecarControlConnection,
): SynthesisSidecarHealth {
  let health: SynthesisSidecarHealth;
  try {
    health = rebuildSynthesisSidecarHealth(value);
  } catch {
    throw new Error("sidecar_health_identity_mismatch");
  }
  if (
    health.serviceVersion !== connection.discovery.serviceVersion ||
    health.serviceInstanceId !== connection.discovery.serviceInstanceId ||
    health.supervisorInstanceId !== connection.discovery.supervisorInstanceId ||
    health.bundleId !== connection.discovery.bundleId ||
    health.target !== connection.discovery.target ||
    health.targetTriple !== connection.discovery.targetTriple ||
    health.buildFingerprint !== connection.discovery.buildFingerprint ||
    JSON.stringify(health.platformSignature) !==
      JSON.stringify(connection.discovery.platformSignature) ||
    health.lifecycleState !== "ready"
  ) {
    throw new Error("sidecar_health_identity_mismatch");
  }
  return health;
}

function validateHandshake(
  value: unknown,
  connection: SynthesisSidecarControlConnection,
) {
  const response = value as {
    ok?: unknown;
    serviceInstanceId?: unknown;
    data?: Partial<SynthesisSidecarHandshakeResult>;
  };
  let data: SynthesisSidecarHandshakeResult;
  try {
    data = rebuildSynthesisSidecarHandshakeResult(response.data);
  } catch {
    throw new Error("sidecar_handshake_identity_mismatch");
  }
  if (
    response.ok !== true ||
    response.serviceInstanceId !== connection.discovery.serviceInstanceId ||
    data.serviceVersion !== connection.discovery.serviceVersion ||
    data.serviceInstanceId !== connection.discovery.serviceInstanceId ||
    data.supervisorInstanceId !== connection.discovery.supervisorInstanceId ||
    data.bundleId !== connection.discovery.bundleId ||
    data.target !== connection.discovery.target ||
    data.targetTriple !== connection.discovery.targetTriple ||
    data.buildFingerprint !== connection.discovery.buildFingerprint ||
    JSON.stringify(data.platformSignature) !==
      JSON.stringify(connection.discovery.platformSignature) ||
    data.profileId !== connection.discovery.profileId ||
    data.schemaVersion !== connection.discovery.schemaVersion ||
    data.runtimeRootId !== connection.discovery.runtimeRootId ||
    data.dataRootId !== connection.discovery.dataRootId ||
    !SYNTHESIS_SIDECAR_CAPABILITIES.every(
      (capability, index) => data.capabilities[index] === capability,
    )
  ) {
    throw new Error("sidecar_handshake_identity_mismatch");
  }
  return data;
}

async function callSystem(args: {
  connection: SynthesisSidecarControlConnection;
  token: string;
  capability: "system.handshake" | "system.shutdown";
  payload: Record<string, unknown>;
  timeoutMs: number;
  fetchImpl: FetchLike;
}) {
  return withDeadline(args.timeoutMs, async (signal) => {
    const response = await args.fetchImpl(
      endpoint(args.connection, SYNTHESIS_SIDECAR_CALL_PATH),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${args.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          protocol: SYNTHESIS_SIDECAR_PROTOCOL,
          requestId: `supervisor:${Date.now()}`,
          profileId: args.connection.discovery.profileId,
          capability: args.capability,
          payload: args.payload,
        }),
        signal,
      },
    );
    return readJsonResponse(response);
  });
}

export function createSynthesisSidecarControlClient(options?: {
  fetch?: FetchLike;
  timeoutMs?: number;
}) {
  const fetchImpl = options?.fetch || globalThis.fetch;
  const timeoutMs = options?.timeoutMs ?? 2_000;
  if (typeof fetchImpl !== "function") {
    throw new Error("sidecar_control_fetch_unavailable");
  }
  return {
    async health(connection: SynthesisSidecarControlConnection) {
      const value = await withDeadline(timeoutMs, async (signal) => {
        const response = await fetchImpl(
          endpoint(connection, SYNTHESIS_SIDECAR_HEALTH_PATH),
          { method: "GET", signal },
        );
        return readJsonResponse(response);
      });
      return validateHealth(value, connection);
    },
    async handshake(connection: SynthesisSidecarControlConnection) {
      const value = await callSystem({
        connection,
        token: connection.clientToken,
        capability: "system.handshake",
        payload: {
          schemaVersion: connection.discovery.schemaVersion,
          bundleId: connection.discovery.bundleId,
          buildFingerprint: connection.discovery.buildFingerprint,
          supervisorInstanceId: connection.discovery.supervisorInstanceId,
        },
        timeoutMs,
        fetchImpl,
      });
      return validateHandshake(value, connection);
    },
    async shutdown(connection: SynthesisSidecarControlConnection) {
      await callSystem({
        connection,
        token: connection.lifecycleToken,
        capability: "system.shutdown",
        payload: {},
        timeoutMs,
        fetchImpl,
      });
    },
  };
}

export const synthesisSidecarControlClientInternalsForTests = {
  validateHealth,
  validateHandshake,
  withDeadline,
};
