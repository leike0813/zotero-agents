import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSynthesisSidecarComputeWorkerPool } from "../apps/synthesis-service/src/computeWorkerPool.js";
import { rebuildSynthesisCitationGraphBuildRequest } from "../packages/synthesis-engine/src/citationGraphBuild.js";
import { rebuildSynthesisReferenceBindingRequest } from "../packages/synthesis-engine/src/referenceMatcher.js";
import { rebuildSynthesisTopicArtifactAssemblyRequest } from "../packages/synthesis-engine/src/topicStructuredArtifact.js";
import { createSynthesisCitationGraphBuildBenchmarkRequest } from "../test/fixtures/synthesisCitationGraphBuildBenchmarks.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SCRIPT = fileURLToPath(import.meta.url);
const OPERATIONS = [
  "reference_binding",
  "topic_artifact",
  "citation_graph",
] as const;
const MAX_RSS = 256 * 1024 * 1024;
const RUNS = 3;

type Operation = (typeof OPERATIONS)[number];

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function binaryPath() {
  return path.resolve(
    argument("--binary") ||
      path.join(
        ROOT,
        "native/synthesis-sidecar/target/release",
        `synthesis-sidecar${process.platform === "win32" ? ".exe" : ""}`,
      ),
  );
}

function referenceRequest() {
  const paperCount = 25_000;
  const referenceCount = 100;
  return rebuildSynthesisReferenceBindingRequest({
    contractVersion: "synthesis-reference-matcher.v1",
    algorithmVersion: "reference-binding.v1",
    policyId: "production",
    papers: Array.from({ length: paperCount }, (_, index) => ({
      paperRef: `1:${String(index).padStart(5, "0")}`,
      itemKey: String(index).padStart(8, "0"),
      title: `Representative reference matching title ${index}`,
      year: "2024",
      authors: [`Author ${index}`],
      identifiers: [{ kind: "doi", value: `10.1000/r5.${index}` }],
    })),
    references: Array.from({ length: referenceCount }, (_, index) => ({
      canonicalReferenceId: `canonical:${String(index).padStart(5, "0")}`,
      reference: {
        title: `Representative reference matching title ${index}`,
        rawReference: `doi:10.1000/r5.${index}`,
      },
    })),
  });
}

function topicRequest() {
  return rebuildSynthesisTopicArtifactAssemblyRequest({
    contractVersion: "synthesis-topic-structured-artifact.v1",
    algorithmVersion: "topic-structured-artifact-assembly.v1",
    manifest: { language: "en", profile: "r5-max-representative" },
    sections: {
      topic: Array.from({ length: 25_000 }, (_, index) => ({
        id: `topic:${index}`,
        title: `Representative topic ${index}`,
        source_refs: [`paper:${index % 2_000}`],
      })),
    },
  });
}

async function workerPeakRss(binary: string) {
  const expected = await fs.realpath(binary);
  const children = await fs.readFile(
    `/proc/${process.pid}/task/${process.pid}/children`,
    "utf8",
  );
  for (const entry of children.trim().split(/\s+/u).filter(Boolean)) {
    const pid = Number(entry);
    try {
      if ((await fs.realpath(`/proc/${pid}/exe`)) !== expected) continue;
      const status = await fs.readFile(`/proc/${pid}/status`, "utf8");
      const match = /^VmHWM:\s+(\d+)\s+kB$/mu.exec(status);
      if (match) return Number(match[1]) * 1024;
    } catch (error) {
      if (
        !(["ENOENT", "ESRCH"] as const).includes(
          (error as NodeJS.ErrnoException).code as "ENOENT" | "ESRCH",
        )
      ) {
        throw error;
      }
    }
  }
  throw new Error("Unable to measure the Rust worker peak RSS");
}

async function child(operation: Operation, binary: string) {
  const timeout = operation === "citation_graph" ? 30_000 : 5_000;
  const pool = createSynthesisSidecarComputeWorkerPool({
    rustWorkerPath: binary,
    executionTimeoutMs: timeout,
  });
  try {
    const started = performance.now();
    if (operation === "reference_binding") {
      await pool.runReferenceBinding(referenceRequest());
    } else if (operation === "topic_artifact") {
      await pool.runTopicArtifactAssembly(topicRequest());
    } else {
      await pool.runCitationGraphBuild(
        rebuildSynthesisCitationGraphBuildRequest(
          createSynthesisCitationGraphBuildBenchmarkRequest("normal"),
        ),
      );
    }
    return {
      operation,
      elapsedMs: performance.now() - started,
      workerPeakRssBytes: await workerPeakRss(binary),
    };
  } finally {
    await pool.shutdown();
  }
}

async function independentRun(operation: Operation, binary: string) {
  const processHandle = spawn(
    process.execPath,
    [...process.execArgv, SCRIPT, "--child", operation, "--binary", binary],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  let stdout = "";
  let stderr = "";
  processHandle.stdout.setEncoding("utf8");
  processHandle.stderr.setEncoding("utf8");
  processHandle.stdout.on("data", (chunk) => (stdout += String(chunk)));
  processHandle.stderr.on("data", (chunk) => (stderr += String(chunk)));
  const code = await new Promise<number | null>((resolve, reject) => {
    processHandle.once("error", reject);
    processHandle.once("exit", resolve);
  });
  if (code !== 0) throw new Error(`${operation} benchmark failed: ${stderr}`);
  return JSON.parse(stdout.trim()) as Awaited<ReturnType<typeof child>>;
}

async function main() {
  if (process.platform !== "linux") {
    throw new Error("The complex-kernel benchmark requires Linux /proc");
  }
  const binary = binaryPath();
  if (process.argv.includes("--child")) {
    const operation = argument("--child") as Operation;
    if (!OPERATIONS.includes(operation)) throw new Error("Invalid operation");
    process.stdout.write(JSON.stringify(await child(operation, binary)));
    return;
  }
  const profiles = [];
  for (const operation of OPERATIONS) {
    const runs = [];
    for (let index = 0; index < RUNS; index += 1) {
      const report = await independentRun(operation, binary);
      const elapsedLimit = operation === "citation_graph" ? 30_000 : 5_000;
      if (report.elapsedMs >= elapsedLimit) {
        throw new Error(`${operation} exceeded ${elapsedLimit} ms`);
      }
      if (report.workerPeakRssBytes >= MAX_RSS) {
        throw new Error(`${operation} exceeded the 256 MiB RSS gate`);
      }
      runs.push(report);
    }
    profiles.push({ operation, runs });
  }
  process.stdout.write(
    `${JSON.stringify({ schema: "synthesis-rust-complex-kernel-benchmark.v1", binary, profiles }, null, 2)}\n`,
  );
}

await main();
