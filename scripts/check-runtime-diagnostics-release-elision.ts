import { build } from "esbuild";
import { promises as fs } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  dashboardSynthesisSidecarRegionElisionPlugin,
  runtimeDiagnosticsSideEffectsPlugin,
} from "./runtime-diagnostics-esbuild";
import {
  forbiddenProductionRuntimeMarkers,
  forbiddenRuntimeMarkers,
  productionRuntimeContractMarkers,
  runtimeDiagnosticsExclusiveModules,
  runtimeDiagnosticsFeatureGroups,
  runtimeDiagnosticsStaticAllowanceMarkers,
  runtimeDiagnosticsStaticAllowances,
  type RuntimeDiagnosticsFeatureName,
} from "./runtime-diagnostics-production-manifest";

type Switches = {
  debug: boolean;
  profiler: boolean;
  recorder: boolean;
  replay: boolean;
  skillRunnerAudit: boolean;
  synthesisSidecar: boolean;
};

async function bundle(switches: Switches) {
  return build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    minifySyntax: true,
    plugins: [runtimeDiagnosticsSideEffectsPlugin],
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
      __skillrunner_connection_audit_enabled__: String(
        switches.skillRunnerAudit,
      ),
      __synthesis_sidecar_diagnostics_enabled__: String(
        switches.synthesisSidecar,
      ),
      __env__: '"test"',
    },
    logLevel: "silent",
  });
}

async function bundleDashboard(
  switches: Pick<Switches, "debug" | "synthesisSidecar">,
) {
  return build({
    entryPoints: ["src/dashboard/dashboardApp.ts"],
    bundle: true,
    minifySyntax: true,
    write: false,
    target: "firefox115",
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    jsxImportSource: "preact",
    plugins: [dashboardSynthesisSidecarRegionElisionPlugin],
    define: {
      __debug_mode__: String(switches.debug),
      __synthesis_sidecar_diagnostics_enabled__: String(
        switches.synthesisSidecar,
      ),
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

function markerContext(text: string, marker: string) {
  const index = text.indexOf(marker);
  if (index < 0) return "";
  return text
    .slice(
      Math.max(0, index - 80),
      Math.min(text.length, index + marker.length + 80),
    )
    .replace(/\s+/g, " ");
}

function assertAbsent(
  name: RuntimeDiagnosticsFeatureName,
  result: Awaited<ReturnType<typeof bundle>>,
) {
  const group = runtimeDiagnosticsFeatureGroups[name];
  const bytes = groupBytes(result, group.exclusiveModules);
  const text = outputText(result);
  const retained = forbiddenRuntimeMarkers[name].filter((marker) =>
    text.includes(marker),
  );
  if (bytes !== 0 || retained.length > 0) {
    const contexts = retained.map((marker) => markerContext(text, marker));
    throw new Error(
      `${name} disabled bundle retained ${bytes} bytes; markers=${retained.join(",") || "none"}; contexts=${contexts.join(" | ") || "none"}`,
    );
  }
  return bytes;
}

export async function checkRuntimeDiagnosticsReleaseElision() {
  const enabled = {
    debug: true,
    profiler: true,
    recorder: true,
    replay: true,
    skillRunnerAudit: true,
    synthesisSidecar: true,
  };
  const [
    release,
    releaseReplayDisabled,
    debug,
    profilerDisabled,
    recorderDisabled,
    replayDisabled,
    skillRunnerAuditDisabled,
    synthesisSidecarDisabled,
    releaseDashboard,
    debugDashboard,
    sourceDisabledDashboard,
  ] = await Promise.all([
    bundle({ ...enabled, debug: false }),
    bundle({ ...enabled, debug: false, replay: false }),
    bundle(enabled),
    bundle({ ...enabled, profiler: false, replay: false }),
    bundle({ ...enabled, recorder: false }),
    bundle({ ...enabled, replay: false }),
    bundle({ ...enabled, skillRunnerAudit: false }),
    bundle({ ...enabled, synthesisSidecar: false }),
    bundleDashboard({ debug: false, synthesisSidecar: true }),
    bundleDashboard({ debug: true, synthesisSidecar: true }),
    bundleDashboard({ debug: true, synthesisSidecar: false }),
  ]);
  const releaseBytes = {
    profiler: assertAbsent("profiler", release),
    recorder: assertAbsent("recorder", release),
    replay: assertAbsent("replay", release),
    skillRunnerAudit: assertAbsent("skillRunnerAudit", release),
    synthesisSidecar: assertAbsent("synthesisSidecar", release),
  };
  const releaseExclusiveBytes = groupBytes(
    release,
    runtimeDiagnosticsExclusiveModules,
  );
  if (releaseExclusiveBytes !== 0) {
    throw new Error(
      `release bundle retained ${releaseExclusiveBytes} runtime diagnostic bytes`,
    );
  }
  const releaseOutput = outputText(release);
  const retainedProductionMarkers = forbiddenProductionRuntimeMarkers.filter(
    (marker) => releaseOutput.includes(marker),
  );
  if (retainedProductionMarkers.length > 0) {
    throw new Error(
      `release bundle retained runtime diagnostic markers: ${retainedProductionMarkers.join(",")}`,
    );
  }
  const retainedProductionContractMarkers =
    productionRuntimeContractMarkers.filter((marker) =>
      releaseOutput.includes(marker),
    );
  if (
    retainedProductionContractMarkers.length !==
    productionRuntimeContractMarkers.length
  ) {
    throw new Error("release bundle omitted a production protocol marker");
  }
  const sourceDisabledBytes = {
    profiler: assertAbsent("profiler", profilerDisabled),
    recorder: assertAbsent("recorder", recorderDisabled),
    replay: assertAbsent("replay", replayDisabled),
    skillRunnerAudit: assertAbsent(
      "skillRunnerAudit",
      skillRunnerAuditDisabled,
    ),
    synthesisSidecar: assertAbsent(
      "synthesisSidecar",
      synthesisSidecarDisabled,
    ),
  };
  const debugBytes = {
    profiler: groupBytes(
      debug,
      runtimeDiagnosticsFeatureGroups.profiler.exclusiveModules,
    ),
    recorder: groupBytes(
      debug,
      runtimeDiagnosticsFeatureGroups.recorder.exclusiveModules,
    ),
    replay: groupBytes(
      debug,
      runtimeDiagnosticsFeatureGroups.replay.exclusiveModules,
    ),
    skillRunnerAudit: groupBytes(
      debug,
      runtimeDiagnosticsFeatureGroups.skillRunnerAudit.exclusiveModules,
    ),
    synthesisSidecar: groupBytes(
      debug,
      runtimeDiagnosticsFeatureGroups.synthesisSidecar.exclusiveModules,
    ),
  };
  for (const [name, bytes] of Object.entries(debugBytes)) {
    if (bytes <= 0) throw new Error(`Debug bundle did not retain ${name}`);
  }
  const staticDashboardSources = await Promise.all(
    runtimeDiagnosticsStaticAllowances.dashboardRoutesAndTemplates.map(
      (filePath) => fs.readFile(filePath, "utf8"),
    ),
  );
  const staticDashboardText = staticDashboardSources.join("\n");
  const retainedStaticMarkers = runtimeDiagnosticsStaticAllowanceMarkers.filter(
    (marker) => staticDashboardText.includes(marker),
  );
  if (
    retainedStaticMarkers.length !==
    runtimeDiagnosticsStaticAllowanceMarkers.length
  ) {
    throw new Error("allowlisted static diagnostic Dashboard markers missing");
  }
  const dashboardMarkers = [
    "Synthesis Sidecar",
    "synthesis-sidecar-span-table",
  ];
  const releaseDashboardText = outputText(releaseDashboard);
  const sourceDisabledDashboardText = outputText(sourceDisabledDashboard);
  const debugDashboardText = outputText(debugDashboard);
  for (const marker of dashboardMarkers) {
    if (
      releaseDashboardText.includes(marker) ||
      sourceDisabledDashboardText.includes(marker)
    ) {
      throw new Error(
        `disabled Dashboard retained Synthesis diagnostic marker: ${marker}`,
      );
    }
    if (!debugDashboardText.includes(marker)) {
      throw new Error(`debug Dashboard did not retain marker: ${marker}`);
    }
  }
  return {
    releaseBytes,
    releaseExclusiveBytes,
    debugBytes,
    sourceDisabledBytes,
    retainedStaticMarkers,
    retainedProductionContractMarkers,
    dashboardMarkers,
    releaseReplayOutputEqual:
      outputText(release) === outputText(releaseReplayDisabled),
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  checkRuntimeDiagnosticsReleaseElision()
    .then((result) => {
      process.stdout.write(
        `Runtime diagnostic elision OK: ${JSON.stringify(result)}\n`,
      );
    })
    .catch((error) => {
      process.stderr.write(
        `${error instanceof Error ? error.stack || error.message : String(error)}\n`,
      );
      process.exitCode = 1;
    });
}
