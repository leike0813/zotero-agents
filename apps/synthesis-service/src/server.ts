import { randomUUID, timingSafeEqual } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { Socket } from "node:net";
import {
  SYNTHESIS_SIDECAR_CALL_PATH,
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_HEALTH_PATH,
  SYNTHESIS_SIDECAR_PROTOCOL,
  isSynthesisSidecarSystemCapability,
  type SynthesisSidecarHealth,
  type SynthesisSidecarLifecycleState,
  type SynthesisSidecarSuccess,
} from "../../../packages/synthesis-contracts/src/sidecarSystem.js";
import type { SynthesisJsonObject } from "../../../packages/synthesis-contracts/src/common.js";
import {
  buildFailure,
  SidecarRuntimeError,
  toSidecarRuntimeError,
} from "./errors.js";
import { writeServiceLog } from "./logging.js";
import { parseCallRequest, readRequestBody } from "./request.js";
import type { SynthesisSidecarRuntimeConfig } from "./runtimeConfig.js";

const LOOPBACK_HOST = "127.0.0.1";
const SHUTDOWN_GRACE_MS = 1000;

export type SynthesisSidecarRuntime = {
  host: typeof LOOPBACK_HOST;
  port: number;
  serviceInstanceId: string;
  beginShutdown(reason: string): void;
  stopped: Promise<void>;
};

function bearerToken(request: IncomingMessage): string {
  const value = request.headers.authorization;
  if (typeof value !== "string" || !value.startsWith("Bearer ")) {
    return "";
  }
  return value.slice("Bearer ".length);
}

function tokensEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.byteLength !== rightBytes.byteLength) {
    return false;
  }
  return timingSafeEqual(leftBytes, rightBytes);
}

function writeJson(
  response: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
) {
  if (response.headersSent || response.destroyed) {
    return;
  }
  const source = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(Buffer.byteLength(source)),
    "cache-control": "no-store",
    ...extraHeaders,
  });
  response.end(source);
}

function success(args: {
  requestId: string;
  serviceInstanceId: string;
  data: SynthesisJsonObject;
}): SynthesisSidecarSuccess {
  return {
    ok: true,
    requestId: args.requestId,
    serviceInstanceId: args.serviceInstanceId,
    data: args.data,
    diagnostics: [],
  };
}

function strictHandshakeSchema(payload: SynthesisJsonObject): string {
  const keys = Object.keys(payload);
  if (
    keys.length !== 1 ||
    keys[0] !== "schemaVersion" ||
    typeof payload.schemaVersion !== "string" ||
    payload.schemaVersion.length === 0 ||
    payload.schemaVersion.length > 128
  ) {
    throw new SidecarRuntimeError({
      status: 400,
      code: "invalid_request",
      message: "The handshake payload is invalid.",
    });
  }
  return payload.schemaVersion;
}

function requireEmptyPayload(payload: SynthesisJsonObject) {
  if (Object.keys(payload).length !== 0) {
    throw new SidecarRuntimeError({
      status: 400,
      code: "invalid_request",
      message: "The shutdown payload must be empty.",
    });
  }
}

export async function startSynthesisSidecarServer(
  config: SynthesisSidecarRuntimeConfig,
): Promise<SynthesisSidecarRuntime> {
  const serviceInstanceId = randomUUID();
  let lifecycleState: SynthesisSidecarLifecycleState = "starting";
  let shutdownStarted = false;
  const sockets = new Set<Socket>();
  let resolveStopped: () => void = () => undefined;
  const stopped = new Promise<void>((resolve) => {
    resolveStopped = resolve;
  });
  const server: Server = createServer();

  const beginShutdown = (reason: string) => {
    if (shutdownStarted) {
      return;
    }
    shutdownStarted = true;
    lifecycleState = "stopping";
    writeServiceLog("service_stopping", {
      reason,
      serviceInstanceId,
    });
    const forceTimer = setTimeout(() => {
      for (const socket of sockets) {
        socket.destroy();
      }
      server.closeAllConnections?.();
    }, SHUTDOWN_GRACE_MS);
    forceTimer.unref();
    server.close(() => {
      clearTimeout(forceTimer);
      writeServiceLog("service_stopped", { serviceInstanceId });
      resolveStopped();
    });
    server.closeIdleConnections?.();
  };

  server.on("request", async (request, response) => {
    let requestId = "";
    try {
      const method = request.method ?? "";
      const url = new URL(request.url ?? "/", `http://${LOOPBACK_HOST}`);
      if (url.pathname === SYNTHESIS_SIDECAR_HEALTH_PATH) {
        if (method !== "GET") {
          throw new SidecarRuntimeError({
            status: 405,
            code: "method_not_allowed",
            message: "The health route requires GET.",
          });
        }
        const health: SynthesisSidecarHealth = {
          status: "ok",
          protocol: SYNTHESIS_SIDECAR_PROTOCOL,
          serviceVersion: config.serviceVersion,
          serviceInstanceId,
          lifecycleState,
        };
        writeJson(response, 200, health);
        return;
      }
      if (url.pathname !== SYNTHESIS_SIDECAR_CALL_PATH) {
        throw new SidecarRuntimeError({
          status: 404,
          code: "not_found",
          message: "The Synthesis sidecar route was not found.",
        });
      }
      if (method !== "POST") {
        throw new SidecarRuntimeError({
          status: 405,
          code: "method_not_allowed",
          message: "The call route requires POST.",
        });
      }
      const requestBody = await readRequestBody(request);
      const call = parseCallRequest(requestBody);
      requestId = call.requestId;
      const token = bearerToken(request);
      if (call.capability === "system.shutdown") {
        if (!token) {
          throw new SidecarRuntimeError({
            status: 401,
            code: "unauthorized",
            message: "Lifecycle authorization is required.",
          });
        }
        if (!tokensEqual(token, config.lifecycleToken)) {
          throw new SidecarRuntimeError({
            status: tokensEqual(token, config.clientToken) ? 403 : 401,
            code: tokensEqual(token, config.clientToken)
              ? "lifecycle_forbidden"
              : "unauthorized",
            message: "Lifecycle authorization was rejected.",
          });
        }
      } else if (!token || !tokensEqual(token, config.clientToken)) {
        throw new SidecarRuntimeError({
          status: 401,
          code: "unauthorized",
          message: "Client authorization was rejected.",
        });
      }
      if (call.protocol !== SYNTHESIS_SIDECAR_PROTOCOL) {
        throw new SidecarRuntimeError({
          status: 409,
          code: "protocol_mismatch",
          message: "The Synthesis sidecar protocol does not match.",
          details: { expectedProtocol: SYNTHESIS_SIDECAR_PROTOCOL },
        });
      }
      if (call.profileId !== config.profileId) {
        throw new SidecarRuntimeError({
          status: 409,
          code: "profile_mismatch",
          message: "The Synthesis sidecar profile does not match.",
        });
      }
      if (!isSynthesisSidecarSystemCapability(call.capability)) {
        throw new SidecarRuntimeError({
          status: 404,
          code: "capability_not_found",
          message: "The Synthesis sidecar capability was not found.",
          details: { capability: call.capability },
        });
      }
      if (lifecycleState !== "ready" && call.capability !== "system.shutdown") {
        throw new SidecarRuntimeError({
          status: 503,
          code: "service_not_ready",
          message: "The Synthesis sidecar service is not ready.",
          retryable: true,
        });
      }
      if (call.capability === "system.handshake") {
        const schemaVersion = strictHandshakeSchema(call.payload);
        if (schemaVersion !== config.schemaVersion) {
          throw new SidecarRuntimeError({
            status: 409,
            code: "schema_mismatch",
            message: "The Synthesis sidecar schema does not match.",
            details: { expectedSchemaVersion: config.schemaVersion },
          });
        }
        writeJson(
          response,
          200,
          success({
            requestId: call.requestId,
            serviceInstanceId,
            data: {
              protocol: SYNTHESIS_SIDECAR_PROTOCOL,
              serviceVersion: config.serviceVersion,
              serviceInstanceId,
              profileId: config.profileId,
              schemaVersion: config.schemaVersion,
              runtimeRootId: config.runtimeRootId,
              dataRootId: config.dataRootId,
              capabilities: [...SYNTHESIS_SIDECAR_CAPABILITIES],
              mutationEnabled: false,
              lifecycleState: "ready",
            },
          }),
        );
        return;
      }

      requireEmptyPayload(call.payload);
      lifecycleState = "stopping";
      response.once("finish", () => beginShutdown("system.shutdown"));
      writeJson(
        response,
        200,
        success({
          requestId: call.requestId,
          serviceInstanceId,
          data: {
            accepted: true,
            lifecycleState: "stopping",
          },
        }),
        { connection: "close" },
      );
    } catch (error) {
      const runtimeError = toSidecarRuntimeError(error);
      writeJson(
        response,
        runtimeError.status,
        buildFailure({
          error: runtimeError,
          requestId,
          serviceInstanceId,
        }),
        runtimeError.status === 405 ? { allow: "GET, POST" } : {},
      );
      writeServiceLog("request_rejected", {
        code: runtimeError.code,
        status: runtimeError.status,
        serviceInstanceId,
      });
    }
  });

  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  server.on("clientError", (_error, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  });

  const port = await new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, LOOPBACK_HOST, () => {
      server.off("error", reject);
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Synthesis sidecar server address is unavailable"));
        return;
      }
      resolve(address.port);
    });
  });
  lifecycleState = "ready";
  writeServiceLog("service_listening", {
    host: LOOPBACK_HOST,
    port,
    protocol: SYNTHESIS_SIDECAR_PROTOCOL,
    serviceVersion: config.serviceVersion,
    serviceInstanceId,
    lifecycleState,
    mutationEnabled: false,
  });

  return {
    host: LOOPBACK_HOST,
    port,
    serviceInstanceId,
    beginShutdown,
    stopped,
  };
}
