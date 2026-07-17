import { assert } from "chai";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { SYNTHESIS_SIDECAR_LIMITS } from "../../packages/synthesis-contracts/src/sidecarSystem";
import {
  SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_SCHEMA,
  measureSynthesisCitationGraphBuildEnvelope,
  runSynthesisCitationGraphBuildBenchmarkProfile,
} from "../../scripts/internal/synthesis-citation-graph-build-sidecar-benchmark";
import {
  SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_PROFILES,
  createSynthesisCitationGraphBuildBenchmarkRequest,
} from "../fixtures/synthesisCitationGraphBuildBenchmarks";

const ROOT = path.resolve(import.meta.dirname, "../..");
const BUILT_WORKER = new URL(
  "../../.scaffold/synthesis-service/apps/synthesis-service/src/computeWorker.js",
  import.meta.url,
);

describe("Synthesis Citation Graph build sidecar baseline", function () {
  this.timeout(30_000);

  before(function () {
    execFileSync(
      process.execPath,
      [
        path.join(ROOT, "node_modules/typescript/bin/tsc"),
        "-p",
        path.join(ROOT, "apps/synthesis-service/tsconfig.build.json"),
      ],
      { cwd: ROOT, stdio: "pipe" },
    );
  });

  it("constructs deterministic named benchmark profiles", function () {
    assert.deepEqual(
      SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_PROFILES.boundary,
      {
        sourceCount: 2_000,
        referenceCount: 20_000,
        externalTargetCount: 500,
      },
    );
    assert.deepEqual(SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_PROFILES.normal, {
      sourceCount: 2_000,
      referenceCount: 100_000,
      externalTargetCount: 60_000,
    });
    assert.deepEqual(SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_PROFILES.target, {
      sourceCount: 10_000,
      referenceCount: 500_000,
      externalTargetCount: 300_000,
    });
    assert.deepEqual(SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_PROFILES.stress, {
      sourceCount: 25_000,
      referenceCount: 1_250_000,
      externalTargetCount: 750_000,
    });
    assert.deepEqual(
      createSynthesisCitationGraphBuildBenchmarkRequest("canary"),
      createSynthesisCitationGraphBuildBenchmarkRequest("canary"),
    );
  });

  it("classifies the representative monolithic request and result envelope", async function () {
    const measurement =
      await measureSynthesisCitationGraphBuildEnvelope("boundary");

    assert.equal(
      measurement.schema,
      SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_SCHEMA,
    );
    assert.equal(measurement.counts.sourceCount, 2_000);
    assert.equal(measurement.counts.referenceCount, 20_000);
    assert.isBelow(
      measurement.request.bytes,
      SYNTHESIS_SIDECAR_LIMITS.computeRequestBodyBytes,
    );
    assert.isAbove(
      measurement.request.jsonNodes,
      SYNTHESIS_SIDECAR_LIMITS.computeRequestJsonNodes,
    );
    assert.deepEqual(measurement.request.violations, ["request_json_nodes"]);
    assert.isAbove(
      measurement.response.bytes,
      SYNTHESIS_SIDECAR_LIMITS.computeResponseBodyBytes,
    );
    assert.isAbove(
      measurement.response.jsonNodes,
      SYNTHESIS_SIDECAR_LIMITS.computeResponseJsonNodes,
    );
    assert.deepEqual(measurement.response.violations, [
      "response_body_bytes",
      "response_json_nodes",
    ]);
    assert.isTrue(measurement.parity.directResultRebuild);
  });

  it("measures a real authenticated HTTP and worker canary without returning DTOs", async function () {
    const report = await runSynthesisCitationGraphBuildBenchmarkProfile(
      "canary",
      {
        workerUrl: BUILT_WORKER,
        includeCancellationProbe: false,
      },
    );

    assert.equal(
      report.schema,
      SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_SCHEMA,
    );
    assert.equal(report.worker.outcome, "success");
    assert.equal(report.http.outcome, "success");
    assert.isTrue(report.parity.worker);
    assert.isTrue(report.parity.http);
    assert.notInclude(JSON.stringify(report), ROOT);
    assert.notProperty(report, "request");
    assert.notProperty(report, "result");
  });

  it("records a benchmark-only change without production ownership drift", function () {
    const inventory = parseYaml(
      fs.readFileSync(
        path.join(
          ROOT,
          "doc/synthesis-layer/contracts/service-api-migration.yaml",
        ),
        "utf8",
      ),
    ) as {
      direct_consumers: Array<{ path: string }>;
      method_groups: Array<{ methods: string[] }>;
      internal_engines: Array<{
        id: string;
        implementation: string;
        production_worker: boolean;
        sidecar_worker_canary?: boolean;
      }>;
    };
    assert.equal(
      inventory.method_groups.flatMap((group) => group.methods).length,
      108,
    );
    assert.lengthOf(inventory.direct_consumers, 1);
    assert.deepInclude(
      inventory.internal_engines.find(
        (engine) => engine.id === "citation_graph_build",
      ),
      {
        implementation: "in_process",
        production_worker: false,
        sidecar_worker_canary: true,
      },
    );
  });
});
