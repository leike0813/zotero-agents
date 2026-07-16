import {
  SYNTHESIS_SIDECAR_CALL_PATH,
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_HEALTH_PATH,
  SYNTHESIS_SIDECAR_PROTOCOL,
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
  const health = value as Partial<SynthesisSidecarHealth>;
  if (
    !health ||
    health.status !== "ok" ||
    health.protocol !== SYNTHESIS_SIDECAR_PROTOCOL ||
    health.serviceVersion !== connection.discovery.serviceVersion ||
    health.serviceInstanceId !== connection.discovery.serviceInstanceId ||
    health.supervisorInstanceId !== connection.discovery.supervisorInstanceId ||
    health.bundleId !== connection.discovery.bundleId ||
    health.lifecycleState !== "ready"
  ) {
    throw new Error("sidecar_health_identity_mismatch");
  }
  return health as SynthesisSidecarHealth;
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
  const data = response.data;
  if (
    response.ok !== true ||
    response.serviceInstanceId !== connection.discovery.serviceInstanceId ||
    !data ||
    data.protocol !== SYNTHESIS_SIDECAR_PROTOCOL ||
    data.serviceVersion !== connection.discovery.serviceVersion ||
    data.serviceInstanceId !== connection.discovery.serviceInstanceId ||
    data.supervisorInstanceId !== connection.discovery.supervisorInstanceId ||
    data.bundleId !== connection.discovery.bundleId ||
    data.nodeVersion !== connection.discovery.nodeVersion ||
    data.profileId !== connection.discovery.profileId ||
    data.schemaVersion !== connection.discovery.schemaVersion ||
    data.runtimeRootId !== connection.discovery.runtimeRootId ||
    data.dataRootId !== connection.discovery.dataRootId ||
    data.mutationEnabled !== false ||
    data.lifecycleState !== "ready" ||
    !Array.isArray(data.capabilities) ||
    data.capabilities.length !== SYNTHESIS_SIDECAR_CAPABILITIES.length ||
    !SYNTHESIS_SIDECAR_CAPABILITIES.every((capability) =>
      data.capabilities?.includes(capability),
    )
  ) {
    throw new Error("sidecar_handshake_identity_mismatch");
  }
  return data as SynthesisSidecarHandshakeResult;
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
