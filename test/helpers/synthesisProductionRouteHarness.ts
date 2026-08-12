import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import {
  rebuildSynthesisSidecarObservationEvent,
  type SynthesisSidecarObservationEvent,
  type SynthesisSidecarTraceContext,
} from "../../packages/synthesis-contracts/src/sidecarObservability";
import { SYNTHESIS_SIDECAR_PROTOCOL } from "../../packages/synthesis-contracts/src/sidecarSystem";
import { createNativeSynthesisClientComposition } from "../../src/modules/synthesisClient/nativeComposition";
import { createSynthesisSidecarRpcClient } from "../../src/modules/synthesisSidecarRpcClient";
import { SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS } from "../../src/modules/synthesisProductionRpcPolicy";

const ROOT = path.resolve(import.meta.dirname, "../..");
export const SYNTHESIS_PRODUCTION_ROUTE_EXECUTABLE = path.join(
  ROOT,
  "native/synthesis-sidecar/target/debug",
  `synthesis-sidecar${process.platform === "win32" ? ".exe" : ""}`,
);
export const SYNTHESIS_PRODUCTION_ROUTE_CLIENT_TOKEN =
  "client-token-0123456789abcdef0123456789abcdef";
const LIFECYCLE_TOKEN = "lifecycle-token-0123456789abcdef0123456789abcdef";
let directRequestSequence = 0;

export type SynthesisProductionRouteHostCall = {
  capability: string;
  payload: Record<string, unknown>;
  requestBytes: number;
  responseBytes: number;
};

export type SynthesisProductionRouteHostFixture = {
  handle(call: {
    capability: string;
    payload: Record<string, unknown>;
  }): Promise<unknown> | unknown;
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
}) {
  return {
    schema: "synthesis-sidecar-launch-config.v3",
    profileId: "1".repeat(64),
    libraryId: 1,
    profileRuntimeRoot: args.session,
    runtimeRootId: "2".repeat(64),
    dataRootId: "3".repeat(64),
    bundleId: "4".repeat(64),
    implementation: "rust-native",
    target: process.platform === "win32" ? "windows-x64" : "linux-x64",
    targetTriple:
      process.platform === "win32"
        ? "x86_64-pc-windows-msvc"
        : "x86_64-unknown-linux-gnu",
    buildFingerprint: "5".repeat(64),
    platformSignature: {
      scheme: "not-applicable",
      status: "not-applicable",
      signer: null,
    },
    serviceVersion: "0.1.0",
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    schemaVersion: "synthesis-repository-foundation.v2",
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
  if (child.exitCode !== null) return;
  const exited = new Promise<void>((resolve) =>
    child.once("exit", () => resolve()),
  );
  child.stdin.end();
  await exited;
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
  if (capability === "webdav.describe") return { configured: false };
  if (capability === "library.items.list_page") {
    return {
      items: [],
      cursor,
      nextCursor: "",
      hasMore: false,
      returned: 0,
      limit,
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
  const reverseHost = http.createServer(async (request, response) => {
    const source = await readRequestBody(request);
    let capability = "";
    try {
      const call = JSON.parse(source.toString("utf8")) as {
        capability?: string;
        payload?: Record<string, unknown>;
      };
      capability = String(call.capability || "");
      const payload = call.payload || {};
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
      const result = args.hostFixture
        ? await args.hostFixture.handle({ capability, payload })
        : defaultHostResult(capability, payload);
      const body = JSON.stringify({ ok: true, result });
      recorder.hostCalls.push({
        capability,
        payload,
        requestBytes: source.byteLength,
        responseBytes: Buffer.byteLength(body),
      });
      response.writeHead(200, {
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
      }),
    ),
  );
  const sidecar = startSynthesisProductionRouteSidecar(configPath);
  const { port } = await sidecar.listening;
  const health = (await (
    await fetch(`http://127.0.0.1:${port}/synthesis/v1/health`)
  ).json()) as { serviceInstanceId: string };
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
    const responseBytes = Buffer.byteLength(await result.clone().text());
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
        profileId: "1".repeat(64),
        serviceInstanceId: health.serviceInstanceId,
      },
      clientToken: SYNTHESIS_PRODUCTION_ROUTE_CLIENT_TOKEN,
    }),
    rpcClient,
  });
  let stopped = false;
  return {
    root,
    port,
    pid: sidecar.child.pid,
    client: composition.client,
    recorder,
    stderr: sidecar.stderr,
    observations() {
      return observationEvents(sidecar.stderr());
    },
    rss() {
      return readProcessPeakRss(sidecar.child.pid);
    },
    async call(
      capability: string,
      payload: unknown,
      trace?: SynthesisSidecarTraceContext,
    ) {
      return rpcClient.call({
        connection: {
          baseUrl: `http://127.0.0.1:${port}`,
          profileId: "1".repeat(64),
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
      await composition.dispose();
      await stopSynthesisProductionRouteSidecar(sidecar.child);
      await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
      if (ownedRoot) fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

export type SynthesisProductionRouteHarness = Awaited<
  ReturnType<typeof startSynthesisProductionRouteHarness>
>;
