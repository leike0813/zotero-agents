import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { acpRuntimeProfilerSideEffectsPlugin } from "./acp-runtime-profiler-esbuild";

const GROUPS = {
  profiler: {
    paths: [
      "src/modules/acpRuntimePerformanceProfiler.ts",
      "src/modules/acpRuntimePerformanceBaseline.ts",
    ],
    markers: [
      "zotero-agents.acp-runtime-performance-profile.v1",
      "panel_signature_duration",
      "buffered_write_duration",
    ],
  },
  recorder: {
    paths: ["src/modules/acpRuntimeSemanticTraceRecorder.ts"],
    markers: ["single-event-limit", "acp-traces"],
  },
  replay: {
    paths: [
      "src/modules/acpRuntimeReplayProfiler.ts",
      "src/modules/acpRuntimeReplayTargets.ts",
      "src/modules/acpRuntimeReplayProductionPorts.ts",
      "src/modules/acpRuntimeReplayProfileContext.ts",
      "src/modules/acpRuntimeReplayController.ts",
    ],
    markers: [
      "zotero-agents.acp-runtime-replay-matrix.v1",
      "ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1",
    ],
  },
} as const;

type Switches = {
  debug: boolean;
  profiler: boolean;
  recorder: boolean;
  replay: boolean;
};

async function bundle(switches: Switches) {
  return build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    minifySyntax: true,
    plugins: [acpRuntimeProfilerSideEffectsPlugin],
    write: false,
    metafile: true,
    target: "firefox115",
    platform: "browser",
    format: "iife",
    define: {
      __debug_mode__: String(switches.debug),
      __acp_runtime_performance_profiler_enabled__: String(switches.profiler),
      __acp_runtime_semantic_trace_recorder_enabled__: String(
        switches.recorder,
      ),
      __acp_runtime_replay_profiler_enabled__: String(switches.replay),
      __env__: '"test"',
    },
    logLevel: "silent",
  });
}

function groupBytes(
  result: Awaited<ReturnType<typeof bundle>>,
  paths: readonly string[],
) {
  let total = 0;
  for (const output of Object.values(result.metafile?.outputs || {})) {
    for (const [input, details] of Object.entries(output.inputs || {})) {
      if (paths.some((suffix) => input.replace(/\\/g, "/").endsWith(suffix))) {
        total += Number(details.bytesInOutput || 0);
      }
    }
  }
  return total;
}

function outputText(result: Awaited<ReturnType<typeof bundle>>) {
  return result.outputFiles?.map((file) => file.text).join("\n") || "";
}

function assertAbsent(
  name: keyof typeof GROUPS,
  result: Awaited<ReturnType<typeof bundle>>,
) {
  const group = GROUPS[name];
  const bytes = groupBytes(result, group.paths);
  const text = outputText(result);
  const retained = group.markers.filter((marker) => text.includes(marker));
  if (bytes !== 0 || retained.length > 0) {
    throw new Error(
      `${name} disabled bundle retained ${bytes} bytes; markers=${retained.join(",") || "none"}`,
    );
  }
  return bytes;
}

export async function checkAcpRuntimeProfilerReleaseElision() {
  const enabled = { debug: true, profiler: true, recorder: true, replay: true };
  const [release, debug, profilerDisabled, recorderDisabled, replayDisabled] =
    await Promise.all([
      bundle({ ...enabled, debug: false }),
      bundle(enabled),
      bundle({ ...enabled, profiler: false, replay: false }),
      bundle({ ...enabled, recorder: false }),
      bundle({ ...enabled, replay: false }),
    ]);
  const releaseBytes = {
    profiler: assertAbsent("profiler", release),
    recorder: assertAbsent("recorder", release),
    replay: assertAbsent("replay", release),
  };
  const sourceDisabledBytes = {
    profiler: assertAbsent("profiler", profilerDisabled),
    recorder: assertAbsent("recorder", recorderDisabled),
    replay: assertAbsent("replay", replayDisabled),
  };
  const debugBytes = {
    profiler: groupBytes(debug, GROUPS.profiler.paths),
    recorder: groupBytes(debug, GROUPS.recorder.paths),
    replay: groupBytes(debug, GROUPS.replay.paths),
  };
  for (const [name, bytes] of Object.entries(debugBytes)) {
    if (bytes <= 0) throw new Error(`Debug bundle did not retain ${name}`);
  }
  return { releaseBytes, debugBytes, sourceDisabledBytes };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  checkAcpRuntimeProfilerReleaseElision()
    .then((result) => {
      process.stdout.write(
        `ACP runtime diagnostic elision OK: ${JSON.stringify(result)}\n`,
      );
    })
    .catch((error) => {
      process.stderr.write(
        `${error instanceof Error ? error.stack || error.message : String(error)}\n`,
      );
      process.exitCode = 1;
    });
}
