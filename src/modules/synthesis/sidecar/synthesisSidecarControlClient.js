import { SYNTHESIS_SIDECAR_CALL_PATH, SYNTHESIS_SIDECAR_CAPABILITIES, SYNTHESIS_SIDECAR_HEALTH_PATH, SYNTHESIS_SIDECAR_PROTOCOL, rebuildSynthesisProductionHandshakeResult, rebuildSynthesisProductionHealth, rebuildSynthesisSidecarHandshakeResult, rebuildSynthesisSidecarHealth, } from "../../../../packages/synthesis-contracts/src";
import { createSynthesisSidecarTraceContext, recordSynthesisSidecarTraceEvent, } from "./synthesisSidecarTrace";
import { resolveNativeAbortControllerConstructor } from "../../../utils/wait";
function endpoint(connection, path) {
    return `http://${connection.discovery.host}:${connection.discovery.port}${path}`;
}
async function withDeadline(timeoutMs, task) {
    const AbortControllerCtor = resolveNativeAbortControllerConstructor();
    const controller = AbortControllerCtor
        ? new AbortControllerCtor()
        : undefined;
    let timer;
    const timeout = new Promise((_resolve, reject) => {
        timer = globalThis.setTimeout(() => {
            controller?.abort(new Error("sidecar_control_timeout"));
            reject(new Error("sidecar_control_timeout"));
        }, timeoutMs);
    });
    try {
        return await Promise.race([task(controller?.signal), timeout]);
    }
    catch (error) {
        if (controller?.signal.aborted) {
            throw new Error("sidecar_control_timeout");
        }
        throw error;
    }
    finally {
        if (timer !== undefined) {
            globalThis.clearTimeout(timer);
        }
    }
}
async function readJsonResponse(response) {
    const json = (await response.json());
    if (!response.ok) {
        const code = json && typeof json === "object" && "error" in json
            ? String(json.error?.code || "sidecar_control_failed")
            : "sidecar_control_failed";
        throw new Error(code);
    }
    return json;
}
function validateHealth(value, connection) {
    let health;
    try {
        health = rebuildSynthesisSidecarHealth(value);
    }
    catch {
        throw new Error("sidecar_health_identity_mismatch");
    }
    if (health.serviceVersion !== connection.discovery.serviceVersion ||
        health.serviceInstanceId !== connection.discovery.serviceInstanceId ||
        health.supervisorInstanceId !== connection.discovery.supervisorInstanceId ||
        health.bundleId !== connection.discovery.bundleId ||
        health.target !== connection.discovery.target ||
        health.targetTriple !== connection.discovery.targetTriple ||
        health.buildFingerprint !== connection.discovery.buildFingerprint ||
        JSON.stringify(health.platformSignature) !==
            JSON.stringify(connection.discovery.platformSignature) ||
        health.lifecycleState !== "ready") {
        throw new Error("sidecar_health_identity_mismatch");
    }
    return health;
}
function validateHandshake(value, connection) {
    const response = value;
    let data;
    try {
        data = rebuildSynthesisSidecarHandshakeResult(response.data);
    }
    catch {
        throw new Error("sidecar_handshake_identity_mismatch");
    }
    if (response.ok !== true ||
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
        !SYNTHESIS_SIDECAR_CAPABILITIES.every((capability, index) => data.capabilities[index] === capability)) {
        throw new Error("sidecar_handshake_identity_mismatch");
    }
    return data;
}
function validateProductionHealth(value, connection) {
    let health;
    try {
        health = rebuildSynthesisProductionHealth(value);
    }
    catch {
        throw new Error("sidecar_health_identity_mismatch");
    }
    if (health.serviceVersion !== connection.discovery.serviceVersion ||
        health.serviceInstanceId !== connection.discovery.serviceInstanceId ||
        health.supervisorInstanceId !== connection.discovery.supervisorInstanceId ||
        health.bundleId !== connection.discovery.bundleId ||
        health.target !== connection.discovery.target ||
        health.targetTriple !== connection.discovery.targetTriple ||
        health.buildFingerprint !== connection.discovery.buildFingerprint ||
        JSON.stringify(health.platformSignature) !==
            JSON.stringify(connection.discovery.platformSignature) ||
        health.lifecycleState !== "ready") {
        throw new Error("sidecar_health_identity_mismatch");
    }
    return health;
}
function validateProductionHandshake(value, connection) {
    const response = value;
    let data;
    try {
        data = rebuildSynthesisProductionHandshakeResult(response.data);
    }
    catch {
        throw new Error("sidecar_handshake_identity_mismatch");
    }
    if (response.ok !== true ||
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
        !SYNTHESIS_SIDECAR_CAPABILITIES.every((capability, index) => data.capabilities[index] === capability)) {
        throw new Error("sidecar_handshake_identity_mismatch");
    }
    return data;
}
async function callSystem(args) {
    return withDeadline(args.timeoutMs, async (signal) => {
        const response = await args.fetchImpl(endpoint(args.connection, SYNTHESIS_SIDECAR_CALL_PATH), {
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
                ...(args.trace ? { trace: args.trace } : {}),
            }),
            signal,
        });
        return readJsonResponse(response);
    });
}
function createControlClient(options, validators) {
    const fetchImpl = options?.fetch || globalThis.fetch;
    const timeoutMs = options?.timeoutMs ?? 2_000;
    if (typeof fetchImpl !== "function") {
        throw new Error("sidecar_control_fetch_unavailable");
    }
    async function observe(phase, operation) {
        const trace = createSynthesisSidecarTraceContext();
        const startedAt = Date.now();
        const recordStarted = () => recordSynthesisSidecarTraceEvent({
            context: trace,
            source: "host",
            boundary: "supervisor",
            phase,
            outcome: "started",
            occurredAtMs: startedAt,
            identities: { operation: phase, trigger: "internal" },
        });
        if (phase !== "health") {
            recordStarted();
        }
        try {
            const result = await operation(trace);
            if (phase !== "health") {
                recordSynthesisSidecarTraceEvent({
                    context: trace,
                    source: "host",
                    boundary: "supervisor",
                    phase: `${phase}-terminal`,
                    outcome: "succeeded",
                    identities: { operation: phase, trigger: "internal" },
                    metrics: { durationMs: Math.max(0, Date.now() - startedAt) },
                });
            }
            return result;
        }
        catch (error) {
            const value = error instanceof Error ? error.message : "control_failed";
            if (phase === "health") {
                recordStarted();
            }
            recordSynthesisSidecarTraceEvent({
                context: trace,
                source: "host",
                boundary: "supervisor",
                phase: `${phase}-terminal`,
                outcome: value.includes("timeout") ? "timed-out" : "failed",
                code: /^[a-z][a-z0-9_.:-]{0,127}$/.test(value)
                    ? value
                    : "control_failed",
                identities: { operation: phase, trigger: "internal" },
                metrics: { durationMs: Math.max(0, Date.now() - startedAt) },
            });
            throw error;
        }
    }
    return {
        async health(connection) {
            return observe("health", async () => {
                const value = await withDeadline(timeoutMs, async (signal) => {
                    const response = await fetchImpl(endpoint(connection, SYNTHESIS_SIDECAR_HEALTH_PATH), { method: "GET", signal });
                    return readJsonResponse(response);
                });
                return validators.health(value, connection);
            });
        },
        async handshake(connection) {
            return observe("handshake", async (trace) => {
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
                    trace,
                });
                return validators.handshake(value, connection);
            });
        },
        async shutdown(connection) {
            return observe("shutdown", async (trace) => {
                await callSystem({
                    connection,
                    token: connection.lifecycleToken,
                    capability: "system.shutdown",
                    payload: {},
                    timeoutMs,
                    fetchImpl,
                    trace,
                });
            });
        },
    };
}
export function createSynthesisSidecarControlClient(options) {
    return createControlClient(options, {
        health: validateHealth,
        handshake: validateHandshake,
    });
}
export function createSynthesisProductionSidecarControlClient(options) {
    const client = createControlClient(options, {
        health: validateProductionHealth,
        handshake: validateProductionHandshake,
    });
    return client;
}
export const synthesisSidecarControlClientInternalsForTests = {
    validateHealth,
    validateHandshake,
    validateProductionHealth,
    validateProductionHandshake,
    withDeadline,
};
