import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  ACP_RUNTIME_BASELINE_SURFACE_STATES,
  runAcpSilentRuntimeBaselineMatrix,
  type AcpRuntimeBaselineSurfaceState,
} from "../test/helpers/acpRuntimePerformanceHarness";
import type { AcpRuntimeGovernanceBaselineRecord } from "../src/modules/acpRuntimePerformanceBaseline";

const OUTPUT_DIRECTORY = path.resolve("artifact", "performance-baselines");
const MARKDOWN_PATH = path.join(
  OUTPUT_DIRECTORY,
  "acp-runtime-before-governance.md",
);
const JSON_PATH_BY_SURFACE = Object.fromEntries(
  ACP_RUNTIME_BASELINE_SURFACE_STATES.map((surfaceState) => [
    surfaceState,
    path.join(
      OUTPUT_DIRECTORY,
      `acp-runtime-before-governance-${surfaceState}.json`,
    ),
  ]),
) as Record<AcpRuntimeBaselineSurfaceState, string>;

async function captureRecords() {
  return (await runAcpSilentRuntimeBaselineMatrix()).map(
    (baseline) => baseline.record,
  );
}

function renderMarkdown(
  records: readonly AcpRuntimeGovernanceBaselineRecord[],
) {
  const summaryRows = records.flatMap((record) =>
    record.summary.groups.map(
      (group) =>
        `| ${record.capture.surfaceState} | ${group.key} | ${group.counters} | ${group.bytes} | ${group.gauges} | ${group.durations} |`,
    ),
  );
  const detailSections = records.flatMap((record) => [
    `## ${record.capture.surfaceState}`,
    "",
    `- Scenario: \`${record.capture.scenarioId}\``,
    `- Completion: \`${record.capture.completion}\``,
    "",
    "| Risk | Metric | Labels | Counter | Bytes | Peak gauge | Duration calls |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: |",
    ...record.summary.groups.flatMap((group) =>
      group.metrics.map((metric) => {
        const labels = Object.entries(metric.labels)
          .map(([key, value]) => `${key}=${value}`)
          .join(", ");
        return `| ${group.key} | ${metric.name} | ${labels || "-"} | ${metric.counter ?? "-"} | ${metric.bytes ?? "-"} | ${metric.gaugeMax ?? "-"} | ${metric.durationCount ?? "-"} |`;
      }),
    ),
    "",
  ]);
  const environment = records[0]?.environment;
  return `${[
    "# ACP Runtime CI Mechanism Smoke Matrix",
    "",
    `- Schema: \`${records[0]?.schema || "unknown"}\``,
    "- Surfaces: `closed`, `open-inactive`, `acp-active`",
    "- Workload: identical deterministic production R1/R2/buffered-write seams; R3 omitted while closed and exercised for both open states",
    `- Environment: Zotero \`${environment?.zoteroVersion || "unknown"}\`, plugin \`${environment?.pluginVersion || "unknown"}\`, platform \`${environment?.platform || "unknown"}\``,
    "",
    "> This is a repeatable CI mechanism smoke matrix, not a comparable real-workload baseline. It deliberately excludes machine-dependent timing values and does not claim to reproduce Zotero host latency or UI stalls. Comparable governance evidence comes from source-specific replay matrices.",
    "",
    "| Surface | Risk | Counters | Bytes | Peak gauge | Duration calls |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
    ...summaryRows,
    "",
    ...detailSections,
  ].join("\n")}\n`;
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function recordAcpRuntimeGovernanceBaseline(args?: {
  force?: boolean;
}) {
  const first = await captureRecords();
  const second = await captureRecords();
  const firstJson = JSON.stringify(first, null, 2);
  const secondJson = JSON.stringify(second, null, 2);
  if (firstJson !== secondJson) {
    throw new Error(
      "ACP runtime governance baseline is not repeatable across two runs",
    );
  }
  if (
    !args?.force &&
    (
      await Promise.all([
        pathExists(MARKDOWN_PATH),
        ...Object.values(JSON_PATH_BY_SURFACE).map(pathExists),
      ])
    ).some(Boolean)
  ) {
    throw new Error(
      "Before-governance baseline already exists; pass --force to replace it intentionally",
    );
  }
  await fs.mkdir(OUTPUT_DIRECTORY, { recursive: true });
  const jsonPaths: string[] = [];
  for (const record of first) {
    const targetPath = JSON_PATH_BY_SURFACE[record.capture.surfaceState];
    await fs.writeFile(
      targetPath,
      `${JSON.stringify(record, null, 2)}\n`,
      "utf8",
    );
    jsonPaths.push(targetPath);
  }
  await fs.writeFile(MARKDOWN_PATH, renderMarkdown(first), "utf8");
  return { jsonPaths, markdownPath: MARKDOWN_PATH, records: first };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  recordAcpRuntimeGovernanceBaseline({
    force: process.argv.includes("--force"),
  })
    .then(({ jsonPaths, markdownPath }) => {
      process.stdout.write(
        `Recorded ACP runtime governance baseline matrix:\n${[...jsonPaths, markdownPath].join("\n")}\n`,
      );
    })
    .catch((error) => {
      process.stderr.write(`${String(error?.message || error)}\n`);
      process.exitCode = 1;
    });
}
