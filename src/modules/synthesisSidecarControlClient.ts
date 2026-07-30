import {
  SYNTHESIS_SIDECAR_CALL_PATH,
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_HEALTH_PATH,
  SYNTHESIS_SIDECAR_PROTOCOL,
  rebuildSynthesisProductionHandshakeResult,
  rebuildSynthesisProductionHealth,
  rebuildSynthesisSidecarHandshakeResult,
  rebuildSynthesisSidecarHealth,
  type SynthesisProductionDiscovery,
  type SynthesisProductionActivationEvidence,
  type SynthesisProductionHandshakeResult,
  type SynthesisProductionHealth,
  type SynthesisSidecarDiscovery,
  type SynthesisSidecarHandshakeResult,
  type SynthesisSidecarHealth,
} from "../../packages/synthesis-contracts/src";

export type SynthesisSidecarControlConnection = {
  discovery: SynthesisSidecarDiscovery;
  clientToken: string;
  lifecycleToken: string;
};

export type SynthesisProductionSidecarControlConnection = {
  discovery: SynthesisProductionDiscovery;
  clientToken: string;
  lifecycleToken: string;
};

type FetchLike = typeof fetch;
type ControlConnection =
  | SynthesisSidecarControlConnection
  | SynthesisProductionSidecarControlConnection;

function endpoint(connection: ControlConnection, path: string) {
  return `http://${connection.discovery.host}:${connection.discovery.port}${path}`;
}

async function withDeadline<T>(
  timeoutMs: number,
  task: (signal?: AbortSignal) => Promise<T>,
) {
  const AbortControllerCtor = (
    globalThis as {
      AbortController?: typeof AbortController;
    }
  ).AbortController;
  const controller =
    typeof AbortControllerCtor === "function"
      ? new AbortControllerCtor()
      : undefined;
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = globalThis.setTimeout(() => {
      controller?.abort(new Error("sidecar_control_timeout"));
      reject(new Error("sidecar_control_timeout"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([task(controller?.signal), timeout]);
  } catch (error) {
    if (controller?.signal.aborted) {
      throw new Error("sidecar_control_timeout");
    }
    throw error;
  } finally {
    if (timer !== undefined) {
      globalThis.clearTimeout(timer);
    }
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

function validateProductionHealth(
  value: unknown,
  connection: SynthesisProductionSidecarControlConnection,
): SynthesisProductionHealth {
  let health: SynthesisProductionHealth;
  try {
    health = rebuildSynthesisProductionHealth(value);
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
    health.lifecycleState !== "ready" ||
    health.ownerMode !== connection.discovery.ownerMode ||
    health.mutationEnabled !== connection.discovery.mutationEnabled ||
    health.capabilityFingerprint !==
      connection.discovery.capabilityFingerprint ||
    health.cutoverReceiptId !== connection.discovery.cutoverReceiptId ||
    JSON.stringify(health.readyClientCapabilities) !==
      JSON.stringify(connection.discovery.readyClientCapabilities)
  ) {
    throw new Error("sidecar_health_identity_mismatch");
  }
  return health;
}

function validateProductionHandshake(
  value: unknown,
  connection: SynthesisProductionSidecarControlConnection,
) {
  const response = value as {
    ok?: unknown;
    serviceInstanceId?: unknown;
    data?: Partial<SynthesisProductionHandshakeResult>;
  };
  let data: SynthesisProductionHandshakeResult;
  try {
    data = rebuildSynthesisProductionHandshakeResult(response.data);
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
    data.ownerMode !== connection.discovery.ownerMode ||
    data.mutationEnabled !== connection.discovery.mutationEnabled ||
    data.capabilityFingerprint !== connection.discovery.capabilityFingerprint ||
    data.cutoverReceiptId !== connection.discovery.cutoverReceiptId ||
    JSON.stringify(data.readyClientCapabilities) !==
      JSON.stringify(connection.discovery.readyClientCapabilities) ||
    !SYNTHESIS_SIDECAR_CAPABILITIES.every(
      (capability, index) => data.capabilities[index] === capability,
    )
  ) {
    throw new Error("sidecar_handshake_identity_mismatch");
  }
  return data;
}

async function callSystem(args: {
  connection: ControlConnection;
  token: string;
  capability:
    | "system.handshake"
    | "system.shutdown"
    | "system.production.activate";
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

function createControlClient<
  TConnection extends ControlConnection,
  THealth,
  THandshake,
>(
  options:
    | {
        fetch?: FetchLike;
        timeoutMs?: number;
      }
    | undefined,
  validators: {
    health: (value: unknown, connection: TConnection) => THealth;
    handshake: (value: unknown, connection: TConnection) => THandshake;
  },
) {
  const fetchImpl = options?.fetch || globalThis.fetch;
  const timeoutMs = options?.timeoutMs ?? 2_000;
  if (typeof fetchImpl !== "function") {
    throw new Error("sidecar_control_fetch_unavailable");
  }
  return {
    async health(connection: TConnection) {
      const value = await withDeadline(timeoutMs, async (signal) => {
        const response = await fetchImpl(
          endpoint(connection, SYNTHESIS_SIDECAR_HEALTH_PATH),
          { method: "GET", signal },
        );
        return readJsonResponse(response);
      });
      return validators.health(value, connection);
    },
    async handshake(connection: TConnection) {
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
      return validators.handshake(value, connection);
    },
    async shutdown(connection: TConnection) {
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

export function createSynthesisSidecarControlClient(options?: {
  fetch?: FetchLike;
  timeoutMs?: number;
}) {
  return createControlClient<
    SynthesisSidecarControlConnection,
    SynthesisSidecarHealth,
    SynthesisSidecarHandshakeResult
  >(options, {
    health: validateHealth,
    handshake: validateHandshake,
  });
}

export function createSynthesisProductionSidecarControlClient(options?: {
  fetch?: FetchLike;
  timeoutMs?: number;
}) {
  const client = createControlClient<
    SynthesisProductionSidecarControlConnection,
    SynthesisProductionHealth,
    SynthesisProductionHandshakeResult
  >(options, {
    health: validateProductionHealth,
    handshake: validateProductionHandshake,
  });
  const fetchImpl = options?.fetch || globalThis.fetch;
  const timeoutMs = options?.timeoutMs ?? 2_000;
  if (typeof fetchImpl !== "function") {
    throw new Error("sidecar_control_fetch_unavailable");
  }
  return {
    ...client,
    async activate(
      connection: SynthesisProductionSidecarControlConnection,
      evidence: SynthesisProductionActivationEvidence,
    ) {
      return callSystem({
        connection,
        token: connection.lifecycleToken,
        capability: "system.production.activate",
        payload: evidence,
        timeoutMs,
        fetchImpl,
      });
    },
  };
}

export const synthesisSidecarControlClientInternalsForTests = {
  validateHealth,
  validateHandshake,
  validateProductionHealth,
  validateProductionHandshake,
  withDeadline,
};
