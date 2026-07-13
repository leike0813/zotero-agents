import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { acpRuntimeProfilerSideEffectsPlugin } from "./acp-runtime-profiler-esbuild";

const PROFILER_PATH_SUFFIX = "src/modules/acpRuntimePerformanceProfiler.ts";
const PROFILER_MARKERS = [
  "zotero-agents.acp-runtime-performance-profile.v1",
  "dropped_profile_start",
  "diagnostic_run_upsert",
  "panel_signature_duration",
  "transport_message_queue_entries",
  "buffered_write_duration",
] as const;

async function bundle(debugMode: boolean) {
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
      __debug_mode__: String(debugMode),
      __env__: '"test"',
    },
    logLevel: "silent",
  });
}

function profilerBytes(result: Awaited<ReturnType<typeof bundle>>) {
  let total = 0;
  for (const output of Object.values(result.metafile?.outputs || {})) {
    for (const [input, details] of Object.entries(output.inputs || {})) {
      if (input.replace(/\\/g, "/").endsWith(PROFILER_PATH_SUFFIX)) {
        total += Number(details.bytesInOutput || 0);
      }
    }
  }
  return total;
}

function outputText(result: Awaited<ReturnType<typeof bundle>>) {
  return result.outputFiles?.map((file) => file.text).join("\n") || "";
}

export async function checkAcpRuntimeProfilerReleaseElision() {
  const [release, debug] = await Promise.all([bundle(false), bundle(true)]);
  const releaseBytes = profilerBytes(release);
  const debugBytes = profilerBytes(debug);
  const releaseText = outputText(release);
  const debugText = outputText(debug);
  const retainedReleaseMarkers = PROFILER_MARKERS.filter((marker) =>
    releaseText.includes(marker),
  );
  const missingDebugMarkers = PROFILER_MARKERS.filter(
    (marker) => !debugText.includes(marker),
  );
  if (releaseBytes !== 0 || retainedReleaseMarkers.length > 0) {
    throw new Error(
      `Non-debug bundle retained ACP runtime profiler code (${releaseBytes} bytes; markers=${retainedReleaseMarkers.join(",") || "none"}).`,
    );
  }
  if (debugBytes <= 0 || missingDebugMarkers.length > 0) {
    throw new Error(
      `Debug bundle did not retain ACP runtime profiler code (missing=${missingDebugMarkers.join(",") || "none"}).`,
    );
  }
  return { releaseBytes, debugBytes };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  checkAcpRuntimeProfilerReleaseElision()
    .then(({ releaseBytes, debugBytes }) => {
      process.stdout.write(
        `ACP runtime profiler elision OK: release=${releaseBytes}, debug=${debugBytes}\n`,
      );
    })
    .catch((error) => {
      process.stderr.write(
        `${error instanceof Error ? error.stack || error.message : String(error)}\n`,
      );
      process.exitCode = 1;
    });
}
