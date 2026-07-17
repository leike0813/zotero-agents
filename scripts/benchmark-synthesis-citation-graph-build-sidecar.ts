import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import {
  SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_SCHEMA,
  runSynthesisCitationGraphBuildBenchmarkProfile,
  type SynthesisCitationGraphBuildBenchmarkReport,
} from "./internal/synthesis-citation-graph-build-sidecar-benchmark";
import type { SynthesisCitationGraphBuildBenchmarkProfile } from "../test/fixtures/synthesisCitationGraphBuildBenchmarks";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, "..");
const BUILT_WORKER = new URL(
  "../.scaffold/synthesis-service/apps/synthesis-service/src/computeWorker.js",
  import.meta.url,
);
const PROFILES = [
  "canary",
  "boundary",
  "normal",
  "target",
  "stress",
] as const satisfies readonly SynthesisCitationGraphBuildBenchmarkProfile[];

type IsolatedProfileResult =
  | {
      profile: SynthesisCitationGraphBuildBenchmarkProfile;
      outcome: "success";
      report: SynthesisCitationGraphBuildBenchmarkReport;
    }
  | {
      profile: SynthesisCitationGraphBuildBenchmarkProfile;
      outcome: "resource_failed";
      code: "timeout" | "signal" | "process_exit" | "invalid_output";
    };

function argumentValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function selectedProfiles(): SynthesisCitationGraphBuildBenchmarkProfile[] {
  const value = argumentValue("--profile") ?? "boundary";
  if (value === "all") {
    return [...PROFILES];
  }
  if ((PROFILES as readonly string[]).includes(value)) {
    return [value as SynthesisCitationGraphBuildBenchmarkProfile];
  }
  throw new Error(`Unknown benchmark profile: ${value}`);
}

function resourcePolicy(profile: SynthesisCitationGraphBuildBenchmarkProfile) {
  if (profile === "target" || profile === "stress") {
    return { memoryMb: 768, timeoutMs: 180_000 };
  }
  if (profile === "normal") {
    return { memoryMb: 768, timeoutMs: 120_000 };
  }
  return { memoryMb: 512, timeoutMs: 60_000 };
}

async function runIsolatedProfile(
  profile: SynthesisCitationGraphBuildBenchmarkProfile,
): Promise<IsolatedProfileResult> {
  const policy = resourcePolicy(profile);
  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        `--max-old-space-size=${policy.memoryMb}`,
        "--import",
        "tsx",
        path.join(
          ROOT,
          "scripts/benchmark-synthesis-citation-graph-build-sidecar.ts",
        ),
        "--child",
        "--profile",
        profile,
      ],
      {
        cwd: ROOT,
        timeout: policy.timeoutMs,
        maxBuffer: 2 * 1024 * 1024,
        env: { ...process.env, FORCE_COLOR: "0" },
      },
    );
    const report = JSON.parse(
      stdout,
    ) as SynthesisCitationGraphBuildBenchmarkReport;
    if (
      report.schema !== SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_SCHEMA ||
      report.profile !== profile
    ) {
      return { profile, outcome: "resource_failed", code: "invalid_output" };
    }
    return { profile, outcome: "success", report };
  } catch (error) {
    const details = error as { killed?: boolean; signal?: string | null };
    return {
      profile,
      outcome: "resource_failed",
      code: details.killed
        ? "timeout"
        : details.signal
          ? "signal"
          : "process_exit",
    };
  }
}

async function runChild() {
  const [profile] = selectedProfiles();
  const write = process.stdout.write.bind(process.stdout);
  const originalWrite = process.stdout.write;
  process.stdout.write = (() => true) as typeof process.stdout.write;
  try {
    const report = await runSynthesisCitationGraphBuildBenchmarkProfile(
      profile,
      {
        workerUrl: BUILT_WORKER,
      },
    );
    process.stdout.write = originalWrite;
    write(JSON.stringify(report));
  } finally {
    process.stdout.write = originalWrite;
  }
}

async function runParent() {
  const profiles = selectedProfiles();
  const results: IsolatedProfileResult[] = [];
  for (const profile of profiles) {
    results.push(await runIsolatedProfile(profile));
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        schema: SYNTHESIS_CITATION_GRAPH_BUILD_BENCHMARK_SCHEMA,
        capturedAt: new Date().toISOString(),
        runtime: {
          node: process.versions.node,
          platform: process.platform,
          arch: process.arch,
        },
        results,
      },
      null,
      2,
    )}\n`,
  );
}

async function main() {
  if (process.argv.includes("--child")) {
    await runChild();
    return;
  }
  await runParent();
}

const entrypoint = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (entrypoint === import.meta.url) {
  void main().catch(() => {
    process.exitCode = 1;
  });
}
