import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import {
  rebuildSynthesisProtocolCapabilityDto,
  rebuildSynthesisProtocolDto,
  SynthesisClientError,
  type SynthesisSidecarProductionClientCapability,
} from "../../packages/synthesis-contracts/src";
import {
  appendSynthesisProtocolExecutionEvidence,
  synthesisProtocolExecutionIdentity,
  appendSynthesisProtocolObservation,
} from "../../scripts/synthesis/synthesisProtocolExecutionEvidence";
import protocolRegistry from "../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json" with { type: "json" };
import {
  rebuildSynthesisSidecarObservationEvent,
  type SynthesisSidecarObservationEvent,
  type SynthesisSidecarTraceContext,
} from "../../packages/synthesis-contracts/src/sidecarObservability";
import { SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION } from "../../packages/synthesis-contracts/src/schemaVersion";
import { SYNTHESIS_SIDECAR_PROTOCOL } from "../../packages/synthesis-contracts/src/sidecarSystem";
import { createNativeSynthesisClientComposition } from "../../src/modules/synthesisClient/nativeComposition";
import { createSynthesisSidecarRpcClient } from "../../src/modules/synthesis/sidecar/synthesisSidecarRpcClient";
import {
  SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
  synthesisProductionOperationPolicy,
} from "../../src/modules/synthesis/production/synthesisProductionRpcPolicy";
import { detectSynthesisSidecarRuntimeTarget } from "../../src/platform/runtimePlatform";
import {
  SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES,
  synthesisSidecarRuntimePlatformIdentity,
} from "../../packages/synthesis-contracts/src/sidecarRuntimeBundle";

const ROOT = path.resolve(import.meta.dirname, "../..");
export const SYNTHESIS_PRODUCTION_ROUTE_EXECUTABLE = path.join(
  ROOT,
  "rust/synthesis-sidecar/target/debug",
  `synthesis-sidecar${process.platform === "win32" ? ".exe" : ""}`,
);
export const SYNTHESIS_PRODUCTION_ROUTE_CLIENT_TOKEN =
  "client-token-0123456789abcdef0123456789abcdef";
const LIFECYCLE_TOKEN = "lifecycle-token-0123456789abcdef0123456789abcdef";
export const SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION = Object.freeze({
  status: "disabled",
  configStatus: "disabled",
  autoSyncEnabled: false,
  autoRetryEnabled: false,
  baseUrl: "",
  remotePath: "",
  username: "",
  diagnostics: ["webdav_sync_disabled"],
});
let directRequestSequence = 0;

export type SynthesisProductionRouteHostCall = {
  capability: string;
  payload: Record<string, unknown>;
  requestBytes: number;
  responseBytes: number;
  operationId?: string;
  result?: unknown;
  error?: Record<string, unknown>;
};

export type SynthesisProductionRouteHostFixture = {
  handle(call: {
    capability: string;
    payload: Record<string, unknown>;
  }): Promise<unknown> | unknown;
  /**
   * Optional typed Host failure. When it returns an error object the reverse
   * Host call answers the production error envelope instead of a result, so
   * the native side consumes a real typed error. Undefined keeps the default
   * result behaviour of every existing fixture.
   */
  error?(call: {
    capability: string;
    payload: Record<string, unknown>;
  }): Record<string, unknown> | undefined;
};

export type SynthesisProductionRouteWireSample = {
  capability: string;
  requestBytes: number;
  responseBytes: number;
  durationMs: number;
};

export type SynthesisProductionRouteRecorder = {
  wire: SynthesisProductionRouteWireSample[];
  hostCalls: SynthesisProductionRouteHostCall[];
  effectBatches: Array<{ capability: string; size: number }>;
  activeArtifactReads: number;
  maxActiveArtifactReads: number;
};

export function synthesisProductionRouteConfig(args: {
  root: string;
  session: string;
  supervisorInstanceId: string;
  reverseHostPort: number;
  profileId?: string;
  runtimeRootId?: string;
  dataRootId?: string;
}) {
  const target = detectSynthesisSidecarRuntimeTarget({
    platform: process.platform,
    architecture: process.arch,
  });
  if (target === "unsupported") throw new Error("unsupported test platform");
  return {
    schema: "synthesis-sidecar-launch-config.v4",
    profileId: args.profileId ?? "1".repeat(64),
    libraryId: 1,
    profileRuntimeRoot: args.session,
    runtimeRootId: args.runtimeRootId ?? "2".repeat(64),
    dataRootId: args.dataRootId ?? "3".repeat(64),
    bundleId: "4".repeat(64),
    implementation: "rust-native",
    target,
    targetTriple: SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target],
    buildFingerprint: "5".repeat(64),
    platformSignature: synthesisSidecarRuntimePlatformIdentity(target),
    serviceVersion: "0.1.0",
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    schemaVersion: SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION,
    diagnosticsEnabled: true,
    supervisorInstanceId: args.supervisorInstanceId,
    repositoryDbPath: path.join(args.root, "state", "synthesis.db"),
    canonicalRoot: path.join(args.root, "data", "synthesis"),
    reverseHost: {
      host: "127.0.0.1",
      port: args.reverseHostPort,
      authorizationToken: "9".repeat(64),
    },
    clientToken: SYNTHESIS_PRODUCTION_ROUTE_CLIENT_TOKEN,
    lifecycleToken: LIFECYCLE_TOKEN,
    port: 0,
  };
}

export function startSynthesisProductionRouteSidecar(configPath: string) {
  const child = spawn(
    SYNTHESIS_PRODUCTION_ROUTE_EXECUTABLE,
    ["serve", "--config", configPath],
    {
      cwd: path.dirname(configPath),
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const listening = new Promise<{ port: number }>((resolve, reject) => {
    const lines = createInterface({ input: child.stdout });
    lines.on("line", (line) => {
      try {
        const value = JSON.parse(line) as { type?: string; port?: number };
        if (value.type === "listening" && typeof value.port === "number") {
          resolve({ port: value.port });
        }
      } catch {
        // Non-protocol diagnostics do not affect lifecycle discovery.
      }
    });
    child.once("exit", () => reject(new Error(stderr || "sidecar exited")));
  });
  return { child, listening, stderr: () => stderr };
}

export async function stopSynthesisProductionRouteSidecar(
  child: ChildProcessWithoutNullStreams,
) {
  const startedAt = performance.now();
  if (child.exitCode !== null || child.signalCode !== null) {
    return { exitCode: child.exitCode, elapsedMs: 0 };
  }
  const exited = new Promise<void>((resolve) =>
    child.once("exit", () => resolve()),
  );
  child.stdin.end();
  await exited;
  return {
    exitCode: child.exitCode,
    elapsedMs: performance.now() - startedAt,
  };
}

export async function callSynthesisProductionRoute(
  port: number,
  capability: string,
  payload: unknown,
  trace?: SynthesisSidecarTraceContext,
  requestId?: string,
) {
  directRequestSequence = (directRequestSequence + 1) % Number.MAX_SAFE_INTEGER;
  const requestBody = JSON.stringify({
    protocol: SYNTHESIS_SIDECAR_PROTOCOL,
    requestId:
      requestId ?? `test:${capability}:${Date.now()}:${directRequestSequence}`,
    profileId: "1".repeat(64),
    capability,
    payload,
    ...(trace ? { trace } : {}),
  });
  const startedAt = performance.now();
  const response = await fetch(`http://127.0.0.1:${port}/synthesis/v1/call`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${SYNTHESIS_PRODUCTION_ROUTE_CLIENT_TOKEN}`,
      "content-type": "application/json",
    },
    body: requestBody,
  });
  const responseBody = await response.text();
  return {
    status: response.status,
    body: JSON.parse(responseBody) as Record<string, any>,
    metrics: {
      durationMs: performance.now() - startedAt,
      requestBytes: Buffer.byteLength(requestBody),
      responseBytes: Buffer.byteLength(responseBody),
    },
  };
}

function defaultHostResult(
  capability: string,
  payload: Record<string, unknown>,
) {
  const cursor = typeof payload.cursor === "string" ? payload.cursor : "";
  const limit =
    typeof payload.limit === "number" && Number.isSafeInteger(payload.limit)
      ? payload.limit
      : 100;
  if (capability === "webdav.describe")
    return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
  if (capability === "library.items.list_page") {
    return {
      items: [],
      cursor,
      nextCursor: "",
      hasMore: false,
      returned: 0,
      limit,
      total: 0,
      snapshotRevision: "fixture-production-route",
    };
  }
  if (capability === "library.items.get_by_ref") {
    const paperRefs = Array.isArray(payload.paperRefs)
      ? payload.paperRefs.filter(
          (paperRef): paperRef is string => typeof paperRef === "string",
        )
      : [];
    return { items: [], missingPaperRefs: paperRefs };
  }
  if (capability === "library.artifacts.scan_page") {
    return {
      artifacts: [],
      cursor,
      nextCursor: "",
      hasMore: false,
      returned: 0,
      limit,
      snapshotRevision: "fixture-production-route",
    };
  }
  return { status: "unavailable", diagnostics: [] };
}

function effectBatchSize(payload: Record<string, unknown>) {
  for (const key of ["effects", "items", "updates", "operations"]) {
    if (Array.isArray(payload[key])) return payload[key].length;
  }
  return 1;
}

// Mirrors the status mapping of the production reverse Host endpoint; the
// native side reads the envelope reason for any non-200 status.
function hostErrorStatus(error: Record<string, unknown>) {
  const code = typeof error.code === "string" ? error.code : "";
  if (code === "invalid_request" || code === "invalid_ref") return 400;
  if (code === "conflict") return 409;
  if (code === "resource_limited") return 413;
  return 503;
}

async function readRequestBody(request: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function observationEvents(stderr: string): SynthesisSidecarObservationEvent[] {
  return stderr
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [rebuildSynthesisSidecarObservationEvent(JSON.parse(line))];
      } catch {
        return [];
      }
    });
}

function listFiles(root: string, relativeRoot = ""): string[] {
  const absoluteRoot = path.join(root, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  return fs
    .readdirSync(absoluteRoot, { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = path.join(relativeRoot, entry.name);
      return entry.isDirectory()
        ? listFiles(root, relativePath)
        : [relativePath];
    });
}

export function captureSynthesisProductionRouteDurableState(root: string) {
  const files = [
    "state/synthesis.db",
    "state/synthesis.db-wal",
    ...listFiles(root, "data/synthesis"),
  ]
    .filter((relativePath) => fs.existsSync(path.join(root, relativePath)))
    .sort();
  const hash = createHash("sha256");
  for (const relativePath of files) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(root, relativePath)));
    hash.update("\0");
  }
  return { files, sha256: hash.digest("hex") };
}

export async function waitForSynthesisProductionRouteReceipt<
  T extends {
    status: string;
  },
>(args: {
  operationId: string;
  getOperation: (operationId: string) => Promise<T>;
  attempts?: number;
  intervalMs?: number;
}): Promise<T> {
  const attempts = args.attempts ?? 6_000;
  const intervalMs = args.intervalMs ?? 10;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const operation = await args.getOperation(args.operationId);
    if (
      ["completed", "failed", "canceled", "timed_out"].includes(
        operation.status,
      )
    ) {
      return operation;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`maintenance operation did not finish: ${args.operationId}`);
}

export async function waitForSynthesisProductionRouteEvidence<T>(args: {
  read: () => readonly T[];
  offset: number;
  matches: (value: T) => boolean;
  expectedCount?: number;
  attempts?: number;
  intervalMs?: number;
}): Promise<T[]> {
  const expectedCount = args.expectedCount ?? 1;
  const attempts = args.attempts ?? 200;
  const intervalMs = args.intervalMs ?? 5;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const matching = args.read().slice(args.offset).filter(args.matches);
    if (matching.length >= expectedCount) return matching;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return args.read().slice(args.offset).filter(args.matches);
}

export function readProcessPeakRss(pid: number | undefined) {
  if (process.platform !== "linux" || !pid) {
    return { rssBytes: null, rssSupported: false } as const;
  }
  try {
    const status = fs.readFileSync(`/proc/${pid}/status`, "utf8");
    const match = /^VmHWM:\s+(\d+)\s+kB$/m.exec(status);
    return {
      rssBytes: match ? Number(match[1]) * 1024 : null,
      rssSupported: Boolean(match),
    } as const;
  } catch {
    return { rssBytes: null, rssSupported: false } as const;
  }
}

export async function startSynthesisProductionRouteHarness(args: {
  id: string;
  hostFixture?: SynthesisProductionRouteHostFixture;
  root?: string;
  profileId?: string;
  runtimeRootId?: string;
  dataRootId?: string;
  onProtocolSample?: (sample: {
    capability: string;
    request: unknown;
    response: unknown;
  }) => void;
}) {
  if (!fs.existsSync(SYNTHESIS_PRODUCTION_ROUTE_EXECUTABLE)) {
    throw new Error("synthesis_production_route_sidecar_not_built");
  }
  const ownedRoot = !args.root;
  const root =
    args.root ?? fs.mkdtempSync(path.join(os.tmpdir(), "zs-production-route-"));
  const recorder: SynthesisProductionRouteRecorder = {
    wire: [],
    hostCalls: [],
    effectBatches: [],
    activeArtifactReads: 0,
    maxActiveArtifactReads: 0,
  };
  const executionIdentity = synthesisProtocolExecutionIdentity();
  const reverseHost = http.createServer(async (request, response) => {
    const source = await readRequestBody(request);
    let capability = "";
    try {
      const call = JSON.parse(source.toString("utf8")) as {
        capability?: string;
        payload?: Record<string, unknown>;
        operationId?: string;
      };
      capability = String(call.capability || "");
      const payload = call.payload || {};
      if (executionIdentity) {
        try {
          rebuildSynthesisProtocolCapabilityDto({
            capability,
            value: payload,
            direction: "request",
          });
          appendSynthesisProtocolExecutionEvidence(
            executionIdentity,
            `${capability}:request`,
            "accepted",
          );
          const contract = protocolRegistry.capabilities.find(
            (entry) => entry.capability === capability,
          );
          if (contract)
            appendSynthesisProtocolObservation(
              executionIdentity,
              contract.requestSchemaRef,
              payload,
            );
        } catch (error) {
          if (!(error instanceof SynthesisClientError)) throw error;
          appendSynthesisProtocolExecutionEvidence(
            executionIdentity,
            `${capability}:request`,
            "diverged",
          );
        }
      }
      if (capability === "library.artifacts.read") {
        recorder.activeArtifactReads += 1;
        recorder.maxActiveArtifactReads = Math.max(
          recorder.maxActiveArtifactReads,
          recorder.activeArtifactReads,
        );
      }
      if (capability.startsWith("effects.")) {
        recorder.effectBatches.push({
          capability,
          size: effectBatchSize(payload),
        });
      }
      const hostError = args.hostFixture?.error?.({ capability, payload });
      const result = hostError
        ? undefined
        : args.hostFixture
          ? await args.hostFixture.handle({ capability, payload })
          : defaultHostResult(capability, payload);
      const body = JSON.stringify(
        hostError ? { ok: false, error: hostError } : { ok: true, result },
      );
      recorder.hostCalls.push({
        capability,
        payload,
        operationId: call.operationId,
        result,
        ...(hostError ? { error: hostError } : {}),
        requestBytes: source.byteLength,
        responseBytes: Buffer.byteLength(body),
      });
      response.writeHead(hostError ? hostErrorStatus(hostError) : 200, {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
      });
      response.end(body);
    } catch {
      response.writeHead(500).end();
    } finally {
      if (capability === "library.artifacts.read") {
        recorder.activeArtifactReads -= 1;
      }
    }
  });
  await new Promise<void>((resolve) =>
    reverseHost.listen(0, "127.0.0.1", resolve),
  );
  const address = reverseHost.address();
  if (!address || typeof address === "string") {
    throw new Error("synthesis_production_route_reverse_host_unavailable");
  }
  const session = path.join(root, "runtime", "sessions", args.id);
  fs.mkdirSync(session, { recursive: true });
  const configPath = path.join(session, "config.json");
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      synthesisProductionRouteConfig({
        root,
        session,
        supervisorInstanceId: `supervisor-${args.id}`,
        reverseHostPort: address.port,
        profileId: args.profileId,
        runtimeRootId: args.runtimeRootId,
        dataRootId: args.dataRootId,
      }),
    ),
  );
  const sidecar = startSynthesisProductionRouteSidecar(configPath);
  let port: number;
  let health: { serviceInstanceId: string };
  try {
    ({ port } = await sidecar.listening);
    health = (await (
      await fetch(`http://127.0.0.1:${port}/synthesis/v1/health`)
    ).json()) as { serviceInstanceId: string };
  } catch (error) {
    if (sidecar.child.exitCode === null) {
      await stopSynthesisProductionRouteSidecar(sidecar.child);
    }
    await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
    if (ownedRoot) fs.rmSync(root, { recursive: true, force: true });
    throw error;
  }
  const measuredFetch: typeof fetch = async (input, init) => {
    const capability = (() => {
      try {
        return String(
          JSON.parse(String(init?.body || "{}"))?.capability || "unknown",
        );
      } catch {
        return "unknown";
      }
    })();
    const requestBytes = Buffer.byteLength(String(init?.body || ""));
    const startedAt = performance.now();
    const result = await fetch(input, init);
    const responseText = await result.clone().text();
    args.onProtocolSample?.({
      capability,
      request: JSON.parse(String(init?.body || "{}")),
      response: JSON.parse(responseText),
    });
    const responseBytes = Buffer.byteLength(responseText);
    if (executionIdentity && capability !== "unknown") {
      const body = JSON.parse(responseText);
      const request = JSON.parse(String(init?.body || "{}"));
      let requestAccepted = false;
      try {
        rebuildSynthesisProtocolCapabilityDto({
          capability,
          direction: "request",
          value: request.payload,
        });
        requestAccepted = true;
      } catch (error) {
        if (!(error instanceof SynthesisClientError)) throw error;
      }
      if (
        requestAccepted &&
        (body.ok ||
          !["invalid_request", "malformed_json"].includes(body.error?.code))
      )
        appendSynthesisProtocolExecutionEvidence(
          executionIdentity,
          `${capability}:request`,
          "accepted",
        );
      if (!requestAccepted && body.error?.code === "invalid_request")
        appendSynthesisProtocolExecutionEvidence(
          executionIdentity,
          `${capability}:request`,
          "rejected",
        );
      if (!requestAccepted && body.ok) {
        appendSynthesisProtocolExecutionEvidence(
          executionIdentity,
          `${capability}:request`,
          "diverged",
        );
      }
      if (requestAccepted && body.ok) {
        const contract = protocolRegistry.capabilities.find(
          (entry) => entry.capability === capability,
        );
        if (contract)
          appendSynthesisProtocolObservation(
            executionIdentity,
            contract.requestSchemaRef,
            request.payload,
          );
      }
      const transferredResult =
        body.ok &&
        capability.startsWith("client.") &&
        synthesisProductionOperationPolicy(
          capability as SynthesisSidecarProductionClientCapability,
        ).resultPlane === "locator" &&
        body.data &&
        typeof body.data === "object" &&
        "contentTransfer" in body.data;
      // The native composition validates the assembled business DTO after
      // transfer; the locator itself is not that DTO and earns no result receipt.
      if (body.ok && !transferredResult) {
        try {
          rebuildSynthesisProtocolCapabilityDto({
            capability,
            direction: "result",
            value: body.data,
          });
          appendSynthesisProtocolExecutionEvidence(
            executionIdentity,
            `${capability}:result`,
            "accepted",
          );
          const contract = protocolRegistry.capabilities.find(
            (entry) => entry.capability === capability,
          );
          if (contract)
            appendSynthesisProtocolObservation(
              executionIdentity,
              contract.resultSchemaRef,
              body.data,
            );
          try {
            const mutated =
              body.data &&
              typeof body.data === "object" &&
              !Array.isArray(body.data)
                ? { ...body.data, __unexpected: true }
                : { __unexpected: true };
            rebuildSynthesisProtocolCapabilityDto({
              capability,
              direction: "result",
              value: mutated,
            });
          } catch (error) {
            if (!(error instanceof SynthesisClientError)) throw error;
            appendSynthesisProtocolExecutionEvidence(
              executionIdentity,
              `${capability}:result`,
              "rejected",
            );
          }
        } catch (error) {
          if (!(error instanceof SynthesisClientError)) throw error;
          appendSynthesisProtocolExecutionEvidence(
            executionIdentity,
            `${capability}:result`,
            "diverged",
          );
        }
      } else if (body.error) {
        try {
          rebuildSynthesisProtocolDto({
            schemaId:
              "https://zotero-agents.local/synthesis/sidecar-protocol/v1/common.schema.json",
            definition: "sidecarError",
            direction: "result",
            value: body.error,
          });
          appendSynthesisProtocolExecutionEvidence(
            executionIdentity,
            `${capability}:error`,
            "accepted",
          );
          const contract = protocolRegistry.capabilities.find(
            (entry) => entry.capability === capability,
          );
          if (contract)
            appendSynthesisProtocolObservation(
              executionIdentity,
              contract.errorSchemaRef,
              body.error,
            );
          try {
            rebuildSynthesisProtocolDto({
              schemaId:
                "https://zotero-agents.local/synthesis/sidecar-protocol/v1/common.schema.json",
              definition: "sidecarError",
              direction: "result",
              value: { ...body.error, code: "__invalid_error_code" },
            });
          } catch (error) {
            if (!(error instanceof SynthesisClientError)) throw error;
            appendSynthesisProtocolExecutionEvidence(
              executionIdentity,
              `${capability}:error`,
              "rejected",
            );
          }
        } catch (error) {
          if (!(error instanceof SynthesisClientError)) throw error;
          appendSynthesisProtocolExecutionEvidence(
            executionIdentity,
            `${capability}:error`,
            "diverged",
          );
        }
      }
    }
    recorder.wire.push({
      capability,
      requestBytes,
      responseBytes,
      durationMs: performance.now() - startedAt,
    });
    return result;
  };
  const rpcClient = createSynthesisSidecarRpcClient({
    fetch: measuredFetch,
    requestIdPrefix: `production-route:${args.id}`,
    transportErrors: SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
  });
  const composition = createNativeSynthesisClientComposition({
    getReadyConnection: () => ({
      discovery: {
        host: "127.0.0.1",
        port,
        profileId: args.profileId ?? "1".repeat(64),
        serviceInstanceId: health.serviceInstanceId,
      },
      clientToken: SYNTHESIS_PRODUCTION_ROUTE_CLIENT_TOKEN,
    }),
    rpcClient,
  });
  let stopped = false;
  let processStopped = false;
  return {
    root,
    port,
    pid: sidecar.child.pid,
    client: composition.client,
    recordWorkflowProducer(workflowId: string) {
      if (!executionIdentity)
        throw new Error("native_execution_identity_missing");
      appendSynthesisProtocolExecutionEvidence(
        executionIdentity,
        `workflow:${workflowId}`,
        "persisted",
      );
    },
    recorder,
    stderr: sidecar.stderr,
    observations() {
      return observationEvents(sidecar.stderr());
    },
    rss() {
      return readProcessPeakRss(sidecar.child.pid);
    },
    async stopProcess() {
      if (processStopped) {
        return { exitCode: sidecar.child.exitCode, elapsedMs: 0 };
      }
      processStopped = true;
      await composition.dispose();
      return stopSynthesisProductionRouteSidecar(sidecar.child);
    },
    async call(
      capability: string,
      payload: unknown,
      trace?: SynthesisSidecarTraceContext,
    ) {
      return rpcClient.call({
        connection: {
          baseUrl: `http://127.0.0.1:${port}`,
          profileId: args.profileId ?? "1".repeat(64),
          clientToken: SYNTHESIS_PRODUCTION_ROUTE_CLIENT_TOKEN,
          serviceInstanceId: health.serviceInstanceId,
        },
        capability: capability as never,
        payload,
        rebuildResult: (value) => value,
        trace,
      });
    },
    async stop() {
      if (stopped) return;
      stopped = true;
      if (!processStopped) {
        processStopped = true;
        await composition.dispose();
        await stopSynthesisProductionRouteSidecar(sidecar.child);
      }
      await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
      if (ownedRoot) fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

export type SynthesisProductionRouteHarness = Awaited<
  ReturnType<typeof startSynthesisProductionRouteHarness>
>;
