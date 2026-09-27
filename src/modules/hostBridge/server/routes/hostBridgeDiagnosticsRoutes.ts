import { loadBackendsRegistry } from "../../../../backends/registry";
import type { BackendInstance } from "../../../../backends/types";
import {
  HostBridgeCursorError,
  fingerprintHostBridgeValue,
} from "../hostBridgePagination";
import type {
  HostBridgeConnectionMode,
  HostBridgeHealth,
  HostBridgeManifest,
} from "../hostBridgeProtocol";
import { hostBridgeError, hostBridgeOk } from "../hostBridgeProtocol";
import type { HostHttpRequest } from "../hostHttpRequestReader";
import { safeDecodeHostHttpPath } from "../hostHttpRequestReader";
import type {
  HostBridgeRouteMatch,
  HostBridgeRouteRespond,
} from "../hostBridgeRouteContract";

export type HostBridgeDiagnosticsRouteContext = {
  respond: HostBridgeRouteRespond;
  getManifest: (request: HostHttpRequest) => {
    protocol: string;
    endpoint: unknown;
    capabilities: HostBridgeManifest["capabilities"];
    workflowControl: unknown;
    fileDownloads: unknown;
    fileUploads: unknown;
  };
  getHealth: () => HostBridgeHealth;
  getConnectionMode: () => HostBridgeConnectionMode;
};

export function redactHostBridgeDiagnosticText(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s"'<>]+/gi, "[redacted-url]")
    .replace(/[A-Za-z]:[\\/][^\r\n.;,)]*/g, "[redacted-path]")
    .replace(
      /\/(?:Users|home|var|tmp|private|Volumes|root|opt|data)\/[^\r\n.;,)]*/g,
      "[redacted-path]",
    )
    .replace(
      /(bearer|token|password|secret|api[_-]?key|access[_-]?token)=([^&\s]+)/gi,
      "$1=[redacted]",
    )
    .slice(0, 500);
}

function summarizeRuntimeOptionsCache(backend: BackendInstance) {
  const cache = backend.acp?.runtimeOptionsCache;
  return {
    refreshedAt: cache?.refreshedAt || "",
    modes: Array.isArray(cache?.modes) ? cache.modes.length : 0,
    rawModels: Array.isArray(cache?.rawModels) ? cache.rawModels.length : 0,
    displayModels: Array.isArray(cache?.displayModels)
      ? cache.displayModels.length
      : 0,
    reasoningEfforts: Array.isArray(cache?.reasoningEfforts)
      ? cache.reasoningEfforts.length
      : 0,
  };
}

function summarizeBackend(backend: BackendInstance) {
  const connectionTest = backend.acp?.connectionTest;
  return {
    backendId: backend.id,
    id: backend.id,
    type: backend.type,
    displayName: backend.displayName || backend.id,
    enabled: backend.enabled !== false,
    locality: String(backend.baseUrl || "").startsWith("local://")
      ? "local"
      : "remote",
    commandConfigured: Boolean(backend.command),
    auth: {
      configured:
        Boolean(backend.auth && backend.auth.kind !== "none") ||
        Boolean(
          backend.management_auth &&
          backend.management_auth.kind &&
          backend.management_auth.kind !== "none",
        ),
    },
    acp: backend.acp
      ? {
          agentFamily: backend.acp.agentFamily || "unknown",
          connectionTest: connectionTest
            ? {
                status: connectionTest.status || "untested",
                testedAt: connectionTest.testedAt || "",
                configFingerprint: connectionTest.configFingerprint || "",
                error: redactHostBridgeDiagnosticText(connectionTest.error),
              }
            : { status: "untested" },
          runtimeOptionsCache: summarizeRuntimeOptionsCache(backend),
        }
      : undefined,
  };
}

async function loadBackendSummaries() {
  const loaded = await loadBackendsRegistry();
  return {
    backends: loaded.backends.map(summarizeBackend),
    warnings: loaded.warnings
      .map(redactHostBridgeDiagnosticText)
      .filter(Boolean),
    errors: loaded.errors.map(redactHostBridgeDiagnosticText).filter(Boolean),
    invalidBackends: Object.fromEntries(
      Object.entries(loaded.invalidBackends || {}).map(([key, value]) => [
        key,
        redactHostBridgeDiagnosticText(value),
      ]),
    ),
    fatalError: redactHostBridgeDiagnosticText(loaded.fatalError),
  };
}

function methodNotAllowed(
  context: HostBridgeDiagnosticsRouteContext,
  message: string,
) {
  return context.respond(
    405,
    "Method Not Allowed",
    hostBridgeError("method_not_allowed", message, "routing", { allow: "GET" }),
    "method_not_allowed",
  );
}

async function inspectProfile(
  request: HostHttpRequest,
  context: HostBridgeDiagnosticsRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Profile inspect endpoint only supports GET",
    );
  }
  const manifest = context.getManifest(request);
  const capabilities = manifest.capabilities.map((entry) => ({
    name: entry.name,
    category: entry.category,
    approval: entry.approval,
    inputSchema: entry.inputSchema,
    outputSchema: entry.outputSchema,
  }));
  return context.respond(
    200,
    "OK",
    hostBridgeOk({
      schema: "host-bridge.profile-inspect.v1",
      generatedAt: new Date().toISOString(),
      protocol: manifest.protocol,
      endpoint: manifest.endpoint,
      connectionMode: context.getConnectionMode(),
      capabilities: {
        count: capabilities.length,
        fingerprint: fingerprintHostBridgeValue(capabilities),
      },
      workflowControl: manifest.workflowControl,
      fileDownloads: manifest.fileDownloads,
      fileUploads: manifest.fileUploads,
      safety: {
        stdout: "single-json-object",
        tokensRedacted: true,
        localPrivatePathsRedacted: true,
        transcriptFree: true,
      },
    }),
  );
}

async function diagnoseProfile(
  request: HostHttpRequest,
  context: HostBridgeDiagnosticsRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Profile diagnose endpoint only supports GET",
    );
  }
  const backendSummary = await loadBackendSummaries();
  return context.respond(
    200,
    "OK",
    hostBridgeOk({
      schema: "host-bridge.profile-diagnose.v1",
      generatedAt: new Date().toISOString(),
      status: context.getHealth(),
      backendSummary: {
        total: backendSummary.backends.length,
        enabled: backendSummary.backends.filter((entry) => entry.enabled)
          .length,
        warnings: backendSummary.warnings,
        errors: backendSummary.errors,
        fatalError: backendSummary.fatalError,
      },
    }),
  );
}

async function listBackends(
  request: HostHttpRequest,
  context: HostBridgeDiagnosticsRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(context, "Backend list endpoint only supports GET");
  }
  return context.respond(200, "OK", hostBridgeOk(await loadBackendSummaries()));
}

async function getBackendStatus(
  request: HostHttpRequest,
  context: HostBridgeDiagnosticsRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Backend status endpoint only supports GET",
    );
  }
  const prefix = "/bridge/v2/diagnostics/backends/";
  const backendId = safeDecodeHostHttpPath(request.path.slice(prefix.length));
  if (!backendId) {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "backend_not_found",
        "Backend id is required",
        "not_found",
      ),
      "backend_not_found",
    );
  }
  const summary = await loadBackendSummaries();
  const backend = summary.backends.find((entry) => entry.id === backendId);
  if (!backend) {
    return context.respond(
      404,
      "Not Found",
      hostBridgeError("backend_not_found", "Backend not found", "not_found", {
        backendId,
      }),
      "backend_not_found",
    );
  }
  return context.respond(200, "OK", hostBridgeOk({ backend }));
}

export function matchHostBridgeDiagnosticsRoute(
  request: HostHttpRequest,
  context: HostBridgeDiagnosticsRouteContext,
): HostBridgeRouteMatch | null {
  const handle =
    request.path === "/bridge/v2/manifest"
      ? () => {
          if (request.method !== "GET") {
            return methodNotAllowed(
              context,
              "Manifest endpoint only supports GET",
            );
          }
          try {
            return context.respond(
              200,
              "OK",
              hostBridgeOk(context.getManifest(request)),
            );
          } catch (error) {
            if (error instanceof HostBridgeCursorError) {
              return context.respond(
                400,
                "Bad Request",
                hostBridgeError(
                  "invalid_host_bridge_cursor",
                  error.message,
                  "validation",
                  { reason: error.reason, ...error.details },
                ),
                "invalid_host_bridge_cursor",
              );
            }
            throw error;
          }
        }
      : request.path === "/bridge/v2/diagnostics/profile"
        ? () => inspectProfile(request, context)
        : request.path === "/bridge/v2/diagnostics/profile/diagnose"
          ? () => diagnoseProfile(request, context)
          : request.path === "/bridge/v2/diagnostics/backends"
            ? () => listBackends(request, context)
            : request.path.startsWith("/bridge/v2/diagnostics/backends/")
              ? () => getBackendStatus(request, context)
              : null;
  return handle ? { admission: "read", handle } : null;
}
