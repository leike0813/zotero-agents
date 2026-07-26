import os from "node:os";
import path from "node:path";
import {
  SYNTHESIS_SIDECAR_HEALTH_PATH,
  SYNTHESIS_SIDECAR_LIMITS,
  SYNTHESIS_SIDECAR_PROTOCOL,
} from "../../packages/synthesis-contracts/src/sidecarSystem";
import {
  computeSynthesisCitationGraphBuild,
  rebuildSynthesisCitationGraphBuildRequest,
  rebuildSynthesisCitationGraphBuildResult,
  type SynthesisCitationGraphBuildRequest,
  type SynthesisCitationGraphBuildResult,
} from "../../packages/synthesis-engine/src/citationGraphBuild";
import {
  createSynthesisSidecarComputeWorkerPool,
  type ComputeWorkerPoolError,
} from "../../apps/synthesis-service/src/computeWorkerPool";
import type { SynthesisSidecarRuntimeConfig } from "../../apps/synthesis-service/src/runtimeConfig";
import { startSynthesisSidecarServer } from "../../apps/synthesis-service/src/server";
import {
  createSynthesisSidecarComputeClient,
  SynthesisSidecarComputeClientError,
} from "../../src/modules/synthesisSidecarComputeClient";
import {
  SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_PROFILES,
  createSynthesisCitationGraphBuildBenchmarkRequest,
  type SynthesisCitationGraphBuildBenchmarkProfile,
} from "../../test/fixtures/synthesisCitationGraphBuildBenchmarks";

export const SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_SCHEMA =
  "synthesis-citation-graph-build-sidecar-benchmark.v1" as const;

type WireViolation =
  | "request_body_bytes"
  | "request_json_nodes"
  | "response_body_bytes"
  | "response_json_nodes";

type PhaseOutcome =
  | { outcome: "success"; elapsedMs: number }
  | { outcome: "rejected" | "failed"; elapsedMs: number; code: string }
  | { outcome: "not_run"; reason: string };

type JsonEnvelopeMeasurement = {
  bytes: number;
  jsonNodes: number;
  violations: WireViolation[];
};

export type SynthesisCitationGraphBuildEnvelopeMeasurement = {
  schema: typeof SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_SCHEMA;
  profile: SynthesisCitationGraphBuildBenchmarkProfile;
  counts: {
    sourceCount: number;
    referenceCount: number;
    externalTargetCount: number;
  };
  request: JsonEnvelopeMeasurement;
  response: JsonEnvelopeMeasurement;
  phases: {
    requestRebuildMs: number;
    requestSerializeMs: number;
    requestParseMs: number;
    directComputeMs: number;
    resultRebuildMs: number;
    responseSerializeMs: number;
  };
  parity: { directResultRebuild: boolean };
};

export type SynthesisCitationGraphBuildBenchmarkReport = {
  schema: typeof SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_SCHEMA;
  profile: SynthesisCitationGraphBuildBenchmarkProfile;
  counts: SynthesisCitationGraphBuildEnvelopeMeasurement["counts"];
  envelopes: {
    request: JsonEnvelopeMeasurement;
    response: JsonEnvelopeMeasurement;
  };
  phases: SynthesisCitationGraphBuildEnvelopeMeasurement["phases"];
  direct: PhaseOutcome;
  worker: PhaseOutcome & {
    parentRssDeltaBytes?: number;
    parentHeapDeltaBytes?: number;
    sampledParentPeakRssBytes?: number;
    sampledParentPeakHeapBytes?: number;
    workerCpuUserMicros?: number;
    workerCpuSystemMicros?: number;
    sampledWorkerHeapBytes?: number;
    workerEventLoopUtilization?: number;
    mainEventLoopMaxLagMs?: number;
    healthLatencyMs?: number;
  };
  http: PhaseOutcome;
  cancellation: PhaseOutcome;
  parity: {
    directResultRebuild: boolean;
    worker: boolean;
    http: boolean;
  };
};

const BENCHMARK_REQUEST_ID = "benchmark:fixed";
const BENCHMARK_SERVICE_INSTANCE_ID = "graph-build-benchmark-service";
const BENCHMARK_CLIENT_TOKEN =
  "benchmark-client-token-0123456789abcdef0123456789abcdef";

function elapsed(startedAt: number) {
  return Math.round((performance.now() - startedAt) * 1000) / 1000;
}

function jsonNodes(value: unknown) {
  let count = 0;
  const visit = (entry: unknown) => {
    count += 1;
    if (Array.isArray(entry)) {
      for (const child of entry) {
        visit(child);
      }
      return;
    }
    if (entry && typeof entry === "object") {
      for (const [key, child] of Object.entries(entry)) {
        visit(key);
        visit(child);
      }
    }
  };
  visit(value);
  return count;
}

function measureJson(value: unknown) {
  const startedAt = performance.now();
  const source = JSON.stringify(value);
  return {
    source,
    elapsedMs: elapsed(startedAt),
    bytes: Buffer.byteLength(source),
    jsonNodes: jsonNodes(value),
  };
}

function requestEnvelope(request: SynthesisCitationGraphBuildRequest) {
  return {
    protocol: SYNTHESIS_SIDECAR_PROTOCOL,
    requestId: BENCHMARK_REQUEST_ID,
    profileId: "1".repeat(64),
    capability: "compute.citation_graph_build" as const,
    payload: request,
  };
}

function responseEnvelope(result: SynthesisCitationGraphBuildResult) {
  return {
    ok: true,
    requestId: BENCHMARK_REQUEST_ID,
    serviceInstanceId: BENCHMARK_SERVICE_INSTANCE_ID,
    data: result,
    diagnostics: [],
  };
}

function requestViolations(args: { bytes: number; jsonNodes: number }) {
  const violations: WireViolation[] = [];
  if (args.bytes > SYNTHESIS_SIDECAR_LIMITS.computeRequestBodyBytes) {
    violations.push("request_body_bytes");
  }
  if (args.jsonNodes > SYNTHESIS_SIDECAR_LIMITS.computeRequestJsonNodes) {
    violations.push("request_json_nodes");
  }
  return violations;
}

function responseViolations(args: { bytes: number; jsonNodes: number }) {
  const violations: WireViolation[] = [];
  if (args.bytes > SYNTHESIS_SIDECAR_LIMITS.computeResponseBodyBytes) {
    violations.push("response_body_bytes");
  }
  if (args.jsonNodes > SYNTHESIS_SIDECAR_LIMITS.computeResponseJsonNodes) {
    violations.push("response_json_nodes");
  }
  return violations;
}

function runtimeConfig(): SynthesisSidecarRuntimeConfig {
  return {
    schema: "synthesis-sidecar-launch-config.v2",
    profileId: "1".repeat(64),
    profileRuntimeRoot: path.join(
      os.tmpdir(),
      "zs-synthesis-graph-build-benchmark",
    ),
    runtimeRootId: "2".repeat(64),
    dataRootId: "3".repeat(64),
    bundleId: "4".repeat(64),
    implementation: "rust-native",
    target: "linux-x64",
    targetTriple: "x86_64-unknown-linux-gnu",
    buildFingerprint: "5".repeat(64),
    platformSignature: {
      scheme: "not-applicable",
      status: "not-applicable",
      signer: null,
    },
    serviceVersion: "0.1.0-benchmark",
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    schemaVersion: "synthesis-schema.benchmark.v1",
    supervisorInstanceId: "graph-build-benchmark-supervisor",
    leaseNonce: "graph-build-benchmark-lease",
    clientToken: BENCHMARK_CLIENT_TOKEN,
    lifecycleToken:
      "benchmark-lifecycle-token-0123456789abcdef0123456789abcdef",
    mutationEnabled: false,
    port: 0,
  };
}

function sameResult(
  left: SynthesisCitationGraphBuildResult,
  right: SynthesisCitationGraphBuildResult,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function collectEnvelope(
  profile: SynthesisCitationGraphBuildBenchmarkProfile,
) {
  const definition = SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_PROFILES[profile];
  const input = createSynthesisCitationGraphBuildBenchmarkRequest(profile);
  let startedAt = performance.now();
  const request = rebuildSynthesisCitationGraphBuildRequest(input);
  const requestRebuildMs = elapsed(startedAt);
  const measuredRequest = measureJson(requestEnvelope(request));
  startedAt = performance.now();
  JSON.parse(measuredRequest.source);
  const requestParseMs = elapsed(startedAt);
  startedAt = performance.now();
  const result = computeSynthesisCitationGraphBuild(request);
  const directComputeMs = elapsed(startedAt);
  startedAt = performance.now();
  const rebuiltResult = rebuildSynthesisCitationGraphBuildResult(
    result,
    request,
  );
  const resultRebuildMs = elapsed(startedAt);
  const measuredResponse = measureJson(responseEnvelope(result));
  const measurement: SynthesisCitationGraphBuildEnvelopeMeasurement = {
    schema: SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_SCHEMA,
    profile,
    counts: { ...definition },
    request: {
      bytes: measuredRequest.bytes,
      jsonNodes: measuredRequest.jsonNodes,
      violations: requestViolations(measuredRequest),
    },
    response: {
      bytes: measuredResponse.bytes,
      jsonNodes: measuredResponse.jsonNodes,
      violations: responseViolations(measuredResponse),
    },
    phases: {
      requestRebuildMs,
      requestSerializeMs: measuredRequest.elapsedMs,
      requestParseMs,
      directComputeMs,
      resultRebuildMs,
      responseSerializeMs: measuredResponse.elapsedMs,
    },
    parity: {
      directResultRebuild: sameResult(result, rebuiltResult),
    },
  };
  return { measurement, request, result };
}

export async function measureSynthesisCitationGraphBuildEnvelope(
  profile: SynthesisCitationGraphBuildBenchmarkProfile,
): Promise<SynthesisCitationGraphBuildEnvelopeMeasurement> {
  return (await collectEnvelope(profile)).measurement;
}

function poolErrorCode(error: unknown) {
  return error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as ComputeWorkerPoolError).code === "string"
    ? (error as ComputeWorkerPoolError).code
    : "worker_failed";
}

function clientErrorCode(error: unknown) {
  return error instanceof SynthesisSidecarComputeClientError
    ? error.code
    : "worker_failed";
}

function resourceSampler() {
  let peakRss = process.memoryUsage().rss;
  let peakHeap = process.memoryUsage().heapUsed;
  let maxLagMs = 0;
  let previous = performance.now();
  const timer = setInterval(() => {
    const now = performance.now();
    maxLagMs = Math.max(maxLagMs, now - previous - 10);
    previous = now;
    const memory = process.memoryUsage();
    peakRss = Math.max(peakRss, memory.rss);
    peakHeap = Math.max(peakHeap, memory.heapUsed);
  }, 10);
  return {
    stop() {
      clearInterval(timer);
      return {
        peakRss,
        peakHeap,
        maxLagMs: Math.max(0, Math.round(maxLagMs * 1000) / 1000),
      };
    },
  };
}

export async function runSynthesisCitationGraphBuildBenchmarkProfile(
  profile: SynthesisCitationGraphBuildBenchmarkProfile,
  options: {
    includeCancellationProbe?: boolean;
  },
): Promise<SynthesisCitationGraphBuildBenchmarkReport> {
  const { measurement, request, result } = await collectEnvelope(profile);
  const pool = createSynthesisSidecarComputeWorkerPool();
  const config = runtimeConfig();
  const runtime = await startSynthesisSidecarServer(
    config,
    BENCHMARK_SERVICE_INSTANCE_ID,
    { computePool: pool },
  );
  const baseUrl = `http://${runtime.host}:${runtime.port}`;
  const direct: PhaseOutcome = {
    outcome: "success",
    elapsedMs: measurement.phases.directComputeMs,
  };
  let workerPhase: SynthesisCitationGraphBuildBenchmarkReport["worker"] = {
    outcome: "not_run",
    reason: "worker_not_started",
  };
  let httpPhase: PhaseOutcome = {
    outcome: "not_run",
    reason: "http_not_started",
  };
  let cancellation: PhaseOutcome = {
    outcome: "not_run",
    reason: "cancellation_probe_disabled",
  };
  let workerParity = false;
  let httpParity = false;
  try {
    await pool.runCitationGraphBuild(
      createSynthesisCitationGraphBuildBenchmarkRequest("canary"),
    );
    const beforeMemory = process.memoryUsage();
    const sampler = resourceSampler();
    const healthStartedAt = performance.now();
    const pendingHealth = fetch(`${baseUrl}${SYNTHESIS_SIDECAR_HEALTH_PATH}`)
      .then((response) => response.json())
      .then(() => elapsed(healthStartedAt));
    const workerStartedAt = performance.now();
    try {
      const workerResult = await pool.runCitationGraphBuild(request);
      workerParity = sameResult(workerResult, result);
      const sampled = sampler.stop();
      const afterMemory = process.memoryUsage();
      workerPhase = {
        outcome: "success",
        elapsedMs: elapsed(workerStartedAt),
        parentRssDeltaBytes: afterMemory.rss - beforeMemory.rss,
        parentHeapDeltaBytes: afterMemory.heapUsed - beforeMemory.heapUsed,
        sampledParentPeakRssBytes: sampled.peakRss,
        sampledParentPeakHeapBytes: sampled.peakHeap,
        mainEventLoopMaxLagMs: sampled.maxLagMs,
        healthLatencyMs: await pendingHealth,
      };
    } catch (error) {
      const sampled = sampler.stop();
      const healthLatencyMs = await pendingHealth.catch(() => undefined);
      const afterMemory = process.memoryUsage();
      const afterWorker = await workerStats(worker);
      workerPhase = {
        outcome: "failed",
        elapsedMs: elapsed(workerStartedAt),
        code: poolErrorCode(error),
        parentRssDeltaBytes: afterMemory.rss - beforeMemory.rss,
        parentHeapDeltaBytes: afterMemory.heapUsed - beforeMemory.heapUsed,
        sampledParentPeakRssBytes: sampled.peakRss,
        sampledParentPeakHeapBytes: sampled.peakHeap,
        workerCpuUserMicros:
          afterWorker.cpu && beforeWorker.cpu
            ? afterWorker.cpu.user - beforeWorker.cpu.user
            : undefined,
        workerCpuSystemMicros:
          afterWorker.cpu && beforeWorker.cpu
            ? afterWorker.cpu.system - beforeWorker.cpu.system
            : undefined,
        sampledWorkerHeapBytes: afterWorker.heapBytes,
        workerEventLoopUtilization:
          afterWorker.eventLoop && beforeWorker.eventLoop
            ? worker?.performance?.eventLoopUtilization(beforeWorker.eventLoop)
                .utilization
            : afterWorker.eventLoop?.utilization,
        mainEventLoopMaxLagMs: sampled.maxLagMs,
        healthLatencyMs,
      };
    }

    const client = createSynthesisSidecarComputeClient();
    const httpStartedAt = performance.now();
    try {
      const httpResult = await client.computeCitationGraphBuild(
        {
          baseUrl,
          profileId: config.profileId,
          clientToken: config.clientToken,
          serviceInstanceId: BENCHMARK_SERVICE_INSTANCE_ID,
        },
        request,
      );
      httpParity = sameResult(httpResult, result);
      httpPhase = { outcome: "success", elapsedMs: elapsed(httpStartedAt) };
    } catch (error) {
      httpPhase = {
        outcome: "rejected",
        elapsedMs: elapsed(httpStartedAt),
        code: clientErrorCode(error),
      };
    }

    if (options.includeCancellationProbe !== false) {
      const controller = new AbortController();
      const cancellationStartedAt = performance.now();
      const pending = pool.runCitationGraphBuild(
        createSynthesisCitationGraphBuildBenchmarkRequest("boundary"),
        { signal: controller.signal },
      );
      setImmediate(() => controller.abort());
      try {
        await pending;
        cancellation = {
          outcome: "failed",
          elapsedMs: elapsed(cancellationStartedAt),
          code: "cancellation_not_observed",
        };
      } catch (error) {
        cancellation = {
          outcome: "success",
          elapsedMs: elapsed(cancellationStartedAt),
          code: poolErrorCode(error),
        };
      }
    }
  } finally {
    runtime.beginShutdown("benchmark_complete");
    await runtime.stopped;
  }

  return {
    schema: SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_SCHEMA,
    profile,
    counts: measurement.counts,
    envelopes: {
      request: measurement.request,
      response: measurement.response,
    },
    phases: measurement.phases,
    direct,
    worker: workerPhase,
    http: httpPhase,
    cancellation,
    parity: {
      directResultRebuild: measurement.parity.directResultRebuild,
      worker: workerParity,
      http: httpParity,
    },
  };
}
