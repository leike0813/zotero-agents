import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { readZipArchiveEntries } from "./zip-archive";
import {
  PI_BUNDLE_LIMITS,
  PI_RUNTIME_BUILD_IDENTITY_ENTRY,
  assertCandidatePiRuntimeBuildIdentity,
  type PiBundleEvidence,
} from "../src/config/piRuntimeBuild";
export { PI_BUNDLE_LIMITS } from "../src/config/piRuntimeBuild";
import {
  PI_CAPACITY_LIMITS,
  validatePiCapacityPerformanceRecord,
} from "../tests/zotero/performanceProbeDigest";
import {
  loadCompatibilityManifest,
  sha256File,
  PI_E2E_PHASES,
  type CompatibilityManifest,
  type CompatibilityReceipt,
} from "./zotero-compatibility-fixture";

export type PiAcceptanceCandidate = {
  sourceCommit: string;
  dirty: boolean;
  xpiSha256: string;
  version: string;
  capacity: number;
};
export type PiEvidenceStatus =
  | "passed"
  | "failed"
  | "missing"
  | "not_applicable";
export type PiAcceptanceEvidence = {
  id: string;
  candidate: PiAcceptanceCandidate;
  status: PiEvidenceStatus;
  recordedAt: string;
  environment: string;
  artifact: string;
  confirmer?: string;
  manual?: {
    zoteroMajor: number;
    observed: string[];
    sourceEvidence: string[];
  };
  bundle?: PiBundleEvidence;
  approval?: {
    confirmer: string;
    candidateSha256: string;
    recordedAt: string;
    artifact: string;
  };
  performance?: {
    finalCandidate: boolean;
    warmupMs: number;
    idleMs: number;
    loadMs: number;
    settleMs: number;
    forcedGc: boolean;
    eventLoopP95Ms: number;
    maxStallMs: number;
    foregroundAdmissionMs: number;
    baselineRssBytes: number;
    peakRssBytes: number;
    settledRssBytes: number;
    eventLoss: number;
    starvation: number;
    overCapacity: number;
    unexplainedFailures: number;
  };
  capacitySelection?: {
    selected: number;
    committedDefault: number;
    exploration: Array<{
      platform: "linux-x64" | "windows-x64";
      capacity: number;
      passed: boolean;
      artifact: string;
    }>;
  };
  upgrade?: {
    baselineCommit: string;
    baselineVersion: string;
    baselineXpiSha256: string;
    seededWithInstalledBaseline: boolean;
    legacyPreserved: boolean;
  };
};
type PiEvidenceAttempt = PiAcceptanceEvidence & { valid: boolean };
export type PiAcceptanceReport = {
  schema: "zotero-agents.pi-runtime-acceptance.v1";
  candidate: PiAcceptanceCandidate;
  accepted: boolean;
  items: Array<{
    id: string;
    blocking: boolean;
    status: PiEvidenceStatus;
    attempts: PiEvidenceAttempt[];
  }>;
};

export const PI_UPGRADE_BASELINE = "9218f30899e47d6e9b852dec978be81b1f802c2f";
const LIVE_SMOKE = [
  "api-key",
  "codex-lifecycle",
  "exa",
  "byok-brave-or-perplexity",
  "openai-web-api-key",
  "openai-web-codex",
  "anthropic-search",
  "anonymous-fetch",
];
const MANUAL_OBSERVATIONS: Record<string, string[]> = {
  "api-key": ["streaming"],
  "codex-lifecycle": [
    "login",
    "streaming",
    "refresh-or-reuse",
    "logout",
    "unavailable-after-clear",
    "reconnect",
  ],
  exa: ["search-results"],
  "byok-brave-or-perplexity": ["search-results"],
  "openai-web-api-key": ["search-results"],
  "openai-web-codex": ["search-results"],
  "anthropic-search": ["search-results"],
  "anonymous-fetch": ["public-content"],
};

export function requiredPiEvidence(manifest: CompatibilityManifest) {
  const requirements: Array<{ id: string; blocking: boolean }> = [];
  for (const target of manifest.targets) {
    if (target.policy.mainBehavior) {
      requirements.push({
        id: `compatibility:${target.id}:full`,
        blocking: target.policy.blocking,
      });
      requirements.push({
        id: `compatibility:${target.id}:pi`,
        blocking: target.policy.blocking,
      });
    }
    if (target.policy.xpiSmoke) {
      requirements.push({
        id: `compatibility:${target.id}:xpi-fresh`,
        blocking: target.policy.blocking,
      });
      requirements.push({
        id: `compatibility:${target.id}:xpi-upgrade`,
        blocking: target.policy.blocking,
      });
    }
  }
  for (const id of [
    "bundle",
    "performance:linux-x64",
    "performance:windows-x64",
    "capacity-selection",
    "local:node-full",
    "local:lint",
    "local:build",
    "local:workspace-identity",
    "local:security-fault",
    "windows:stdio-canary",
    ...LIVE_SMOKE.map((id) => `manual:${id}`),
  ])
    requirements.push({ id, blocking: true });
  return requirements;
}

function matchingCandidate(a: PiAcceptanceCandidate, b: PiAcceptanceCandidate) {
  return (
    a.sourceCommit === b.sourceCommit &&
    !a.dirty &&
    !b.dirty &&
    a.xpiSha256 === b.xpiSha256 &&
    a.version === b.version &&
    a.capacity === b.capacity
  );
}
function safeReference(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 500 &&
    !path.isAbsolute(value) &&
    !/[:\\\r\n|]/.test(value) &&
    value.split("/").every((part) => part !== ".." && part !== "")
  );
}
function safeToken(value: unknown): value is string {
  return typeof value === "string" && /^[\w .@+-]{1,120}$/.test(value);
}
function validCandidate(candidate: PiAcceptanceCandidate) {
  return (
    /^[a-f\d]{40}$/.test(candidate.sourceCommit) &&
    /^[a-f\d]{64}$/.test(candidate.xpiSha256) &&
    candidate.dirty === false &&
    /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(candidate.version) &&
    [4, 6, 8, 12].includes(candidate.capacity)
  );
}
function projectCandidate(
  candidate: PiAcceptanceCandidate,
): PiAcceptanceCandidate {
  return {
    sourceCommit: /^[a-f\d]{40}$/.test(candidate.sourceCommit)
      ? candidate.sourceCommit
      : "",
    dirty: candidate.dirty !== false,
    xpiSha256: /^[a-f\d]{64}$/.test(candidate.xpiSha256)
      ? candidate.xpiSha256
      : "",
    version: /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(candidate.version)
      ? candidate.version
      : "",
    capacity: [4, 6, 8, 12].includes(candidate.capacity)
      ? candidate.capacity
      : 0,
  };
}
function nonnegative(values: number[]) {
  return values.every(
    (value) =>
      typeof value === "number" && Number.isFinite(value) && value >= 0,
  );
}

function projectMetric(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function effectiveStatus(evidence: PiAcceptanceEvidence): PiEvidenceStatus {
  if (evidence.status !== "passed") return evidence.status;
  if (evidence.id.startsWith("manual:")) {
    const required = MANUAL_OBSERVATIONS[evidence.id.slice(7)];
    if (
      !safeToken(evidence.confirmer) ||
      !required ||
      !evidence.manual ||
      evidence.manual.zoteroMajor !== 10 ||
      !required.every((x) => evidence.manual?.observed.includes(x)) ||
      evidence.manual.sourceEvidence.length === 0 ||
      !evidence.manual.sourceEvidence.every(safeReference)
    )
      return "failed";
  }
  if (evidence.id === "bundle") {
    const m = evidence.bundle;
    if (
      !m ||
      !m.sameInputs ||
      !m.browserGuardPassed ||
      !m.excludedFully ||
      !nonnegative([m.rawBytes, m.gzipBytes, m.xpiDeltaBytes])
    )
      return "failed";
    const exceeded = (
      Object.keys(PI_BUNDLE_LIMITS) as Array<keyof typeof PI_BUNDLE_LIMITS>
    ).some((key) => m[key] > PI_BUNDLE_LIMITS[key]);
    if (
      exceeded &&
      (!safeToken(evidence.approval?.confirmer) ||
        evidence.approval?.candidateSha256 !== evidence.candidate.xpiSha256 ||
        !Number.isFinite(Date.parse(evidence.approval.recordedAt)) ||
        !safeReference(evidence.approval.artifact))
    )
      return "failed";
  }
  if (evidence.id.startsWith("performance:")) {
    const m = evidence.performance;
    if (
      !m ||
      !m.finalCandidate ||
      m.forcedGc !== false ||
      !nonnegative([
        m.warmupMs,
        m.idleMs,
        m.loadMs,
        m.settleMs,
        m.eventLoopP95Ms,
        m.maxStallMs,
        m.foregroundAdmissionMs,
        m.baselineRssBytes,
        m.peakRssBytes,
        m.settledRssBytes,
        m.eventLoss,
        m.starvation,
        m.overCapacity,
        m.unexplainedFailures,
      ]) ||
      m.warmupMs < 60_000 ||
      m.idleMs < 60_000 ||
      m.loadMs < 900_000 ||
      m.settleMs < 120_000 ||
      m.eventLoopP95Ms > PI_CAPACITY_LIMITS.lagP95Ms ||
      m.maxStallMs > PI_CAPACITY_LIMITS.lagMaxMs ||
      m.foregroundAdmissionMs > PI_CAPACITY_LIMITS.foregroundAdmissionMs ||
      m.baselineRssBytes <= 0 ||
      m.peakRssBytes >
        m.baselineRssBytes + PI_CAPACITY_LIMITS.peakRssDeltaBytes ||
      m.settledRssBytes >
        m.baselineRssBytes + PI_CAPACITY_LIMITS.settledRssDeltaBytes ||
      m.eventLoss !== 0 ||
      m.starvation !== 0 ||
      m.overCapacity !== 0 ||
      m.unexplainedFailures !== 0
    )
      return "failed";
  }
  if (evidence.id === "capacity-selection") {
    const m = evidence.capacitySelection;
    if (
      !m ||
      m.selected !== evidence.candidate.capacity ||
      m.committedDefault !== m.selected ||
      !Array.isArray(m.exploration) ||
      m.exploration.some((x) => !safeReference(x.artifact)) ||
      ![4, 6, 8, 12].every((capacity) =>
        ["linux-x64", "windows-x64"].every(
          (platform) =>
            m.exploration.filter(
              (x) => x.capacity === capacity && x.platform === platform,
            ).length === 1,
        ),
      )
    )
      return "failed";
    const passing = [4, 6, 8, 12].filter((capacity) =>
      ["linux-x64", "windows-x64"].every((platform) => {
        const rows = m.exploration.filter(
          (x) => x.capacity === capacity && x.platform === platform,
        );
        return rows.length === 1 && rows[0].passed === true;
      }),
    );
    if (
      m.exploration.length !== 8 ||
      !passing.includes(4) ||
      passing.at(-1) !== m.selected
    )
      return "failed";
  }
  if (evidence.id.endsWith(":xpi-upgrade")) {
    const m = evidence.upgrade;
    if (
      !m ||
      m.baselineCommit !== PI_UPGRADE_BASELINE ||
      m.baselineVersion !== "0.9.0" ||
      !/^[a-f\d]{64}$/.test(m.baselineXpiSha256) ||
      !m.seededWithInstalledBaseline ||
      !m.legacyPreserved
    )
      return "failed";
  }
  return "passed";
}

export function buildPiAcceptanceReport(
  candidate: PiAcceptanceCandidate,
  manifest: CompatibilityManifest,
  evidence: PiAcceptanceEvidence[],
): PiAcceptanceReport {
  const items = requiredPiEvidence(manifest).map((required) => {
    const attempts: PiEvidenceAttempt[] = evidence
      .filter((item) => item.id === required.id)
      .map((item) => {
        const valid =
          validCandidate(item.candidate) &&
          matchingCandidate(candidate, item.candidate) &&
          safeReference(item.artifact) &&
          safeToken(item.environment) &&
          Number.isFinite(Date.parse(item.recordedAt)) &&
          ["passed", "failed", "missing", "not_applicable"].includes(
            item.status,
          );
        // Project explicit fields so arbitrary input cannot leak into reports.
        return {
          id: required.id,
          candidate: projectCandidate(item.candidate),
          status: valid ? effectiveStatus(item) : "failed",
          valid,
          recordedAt: Number.isFinite(Date.parse(item.recordedAt))
            ? item.recordedAt
            : "",
          artifact: safeReference(item.artifact)
            ? item.artifact
            : "invalid-reference",
          environment: safeToken(item.environment)
            ? item.environment
            : "invalid-environment",
          ...(safeToken(item.confirmer) ? { confirmer: item.confirmer } : {}),
          ...(item.manual
            ? {
                manual: {
                  zoteroMajor: Number.isInteger(item.manual.zoteroMajor)
                    ? item.manual.zoteroMajor
                    : 0,
                  observed: item.manual.observed.filter((x) =>
                    MANUAL_OBSERVATIONS[item.id.slice(7)]?.includes(x),
                  ),
                  sourceEvidence:
                    item.manual.sourceEvidence.filter(safeReference),
                },
              }
            : {}),
          ...(item.bundle
            ? {
                bundle: {
                  rawBytes: projectMetric(item.bundle.rawBytes),
                  gzipBytes: projectMetric(item.bundle.gzipBytes),
                  xpiDeltaBytes: projectMetric(item.bundle.xpiDeltaBytes),
                  sameInputs: item.bundle.sameInputs === true,
                  browserGuardPassed: item.bundle.browserGuardPassed === true,
                  excludedFully: item.bundle.excludedFully === true,
                },
              }
            : {}),
          ...(item.approval &&
          safeToken(item.approval.confirmer) &&
          safeReference(item.approval.artifact)
            ? {
                approval: {
                  confirmer: item.approval.confirmer,
                  candidateSha256: /^[a-f\d]{64}$/.test(
                    item.approval.candidateSha256,
                  )
                    ? item.approval.candidateSha256
                    : "",
                  recordedAt: Number.isFinite(
                    Date.parse(item.approval.recordedAt),
                  )
                    ? item.approval.recordedAt
                    : "",
                  artifact: item.approval.artifact,
                },
              }
            : {}),
          ...(item.performance
            ? {
                performance: {
                  finalCandidate: item.performance.finalCandidate === true,
                  forcedGc: item.performance.forcedGc !== false,
                  warmupMs: projectMetric(item.performance.warmupMs),
                  idleMs: projectMetric(item.performance.idleMs),
                  loadMs: projectMetric(item.performance.loadMs),
                  settleMs: projectMetric(item.performance.settleMs),
                  eventLoopP95Ms: projectMetric(
                    item.performance.eventLoopP95Ms,
                  ),
                  maxStallMs: projectMetric(item.performance.maxStallMs),
                  foregroundAdmissionMs: projectMetric(
                    item.performance.foregroundAdmissionMs,
                  ),
                  baselineRssBytes: projectMetric(
                    item.performance.baselineRssBytes,
                  ),
                  peakRssBytes: projectMetric(item.performance.peakRssBytes),
                  settledRssBytes: projectMetric(
                    item.performance.settledRssBytes,
                  ),
                  eventLoss: projectMetric(item.performance.eventLoss),
                  starvation: projectMetric(item.performance.starvation),
                  overCapacity: projectMetric(item.performance.overCapacity),
                  unexplainedFailures: projectMetric(
                    item.performance.unexplainedFailures,
                  ),
                },
              }
            : {}),
          ...(item.capacitySelection
            ? {
                capacitySelection: {
                  selected: projectMetric(item.capacitySelection.selected),
                  committedDefault: projectMetric(
                    item.capacitySelection.committedDefault,
                  ),
                  exploration: item.capacitySelection.exploration
                    .filter(
                      (x) =>
                        x.platform === "linux-x64" ||
                        x.platform === "windows-x64",
                    )
                    .map((x) => ({
                      platform:
                        x.platform === "windows-x64"
                          ? ("windows-x64" as const)
                          : ("linux-x64" as const),
                      capacity: projectMetric(x.capacity),
                      passed: x.passed === true,
                      artifact: safeReference(x.artifact)
                        ? x.artifact
                        : "invalid-reference",
                    })),
                },
              }
            : {}),
          ...(item.upgrade
            ? {
                upgrade: {
                  baselineCommit: /^[a-f\d]{40}$/.test(
                    item.upgrade.baselineCommit,
                  )
                    ? item.upgrade.baselineCommit
                    : "",
                  baselineVersion: /^\d+\.\d+\.\d+$/.test(
                    item.upgrade.baselineVersion,
                  )
                    ? item.upgrade.baselineVersion
                    : "",
                  baselineXpiSha256: /^[a-f\d]{64}$/.test(
                    item.upgrade.baselineXpiSha256,
                  )
                    ? item.upgrade.baselineXpiSha256
                    : "",
                  seededWithInstalledBaseline:
                    item.upgrade.seededWithInstalledBaseline === true,
                  legacyPreserved: item.upgrade.legacyPreserved === true,
                },
              }
            : {}),
        };
      });
    const latest = attempts
      .filter((item) => item.valid)
      .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))
      .at(-1);
    return { ...required, status: latest?.status ?? "missing", attempts };
  });
  return {
    schema: "zotero-agents.pi-runtime-acceptance.v1",
    candidate: projectCandidate(candidate),
    accepted:
      validCandidate(candidate) &&
      items.every((item) => !item.blocking || item.status === "passed"),
    items,
  };
}

export function renderPiAcceptanceMarkdown(report: PiAcceptanceReport) {
  return [
    "# Pi Runtime acceptance",
    "",
    `Candidate: ${report.candidate.sourceCommit} / ${report.candidate.xpiSha256}`,
    `Clean: ${!report.candidate.dirty}; capacity: ${report.candidate.capacity}; accepted: ${report.accepted}`,
    "",
    "| Evidence | Blocking | Status | Attempts |",
    "| --- | --- | --- | --- |",
    ...report.items.map(
      (item) =>
        `| ${item.id} | ${item.blocking} | ${item.status} | ${item.attempts.length} |`,
    ),
    "",
  ].join("\n");
}

export function compatibilityPiEvidence(
  receipt: CompatibilityReceipt,
  candidate: PiAcceptanceCandidate,
  artifact: string,
): PiAcceptanceEvidence[] {
  const base = {
    candidate: {
      ...candidate,
      sourceCommit: receipt.source.commit,
      dirty: receipt.source.dirty,
      xpiSha256: receipt.plugin.artifactSha256,
      version: receipt.plugin.version,
    },
    recordedAt: receipt.timing.finishedAt || receipt.timing.startedAt,
    environment: `${receipt.host.id} ${receipt.host.observedVersion || "unknown"}`,
    artifact,
  };
  const settled =
    receipt.status === "passed" &&
    receipt.cleanup.complete &&
    receipt.host.observedVersion === receipt.host.requestedVersion;
  const result: PiAcceptanceEvidence[] = [];
  const append = (kind: string, phases?: string[]) => {
    const passed =
      settled &&
      (!phases ||
        phases.every((phase) =>
          receipt.phases.some(
            (item) => item.phase === phase && item.status === "passed",
          ),
        ));
    result.push({
      ...base,
      id: `compatibility:${receipt.host.id}:${kind}`,
      status: passed ? "passed" : "failed",
    });
  };
  if (
    receipt.execution.mode === "behavior" &&
    receipt.execution.suite === "full"
  ) {
    if (receipt.execution.domain !== "e2e")
      append("full", ["test-core", "test-ui", "test-workflow"]);
    else if (receipt.execution.cell?.families.includes("PI"))
      append("pi", [...PI_E2E_PHASES]);
  }
  if (receipt.execution.mode === "xpi-smoke") {
    append("xpi-fresh", ["pi-xpi-fresh"]);
    append("xpi-upgrade", ["pi-xpi-upgrade"]);
    if (receipt.piUpgrade)
      result[result.length - 1].upgrade = receipt.piUpgrade;
  }
  return result;
}

export function performancePiEvidence(
  value: unknown,
  candidate: PiAcceptanceCandidate,
  artifact: string,
): PiAcceptanceEvidence {
  const validation = validatePiCapacityPerformanceRecord(
    typeof value === "object" && value !== null && "piCapacity" in value
      ? value.piCapacity
      : value,
  );
  if (!validation.valid) throw new Error("pi_performance_record_invalid");
  const record = validation.record;
  const m = record.measurements;
  const duration = (phase: string) =>
    record.phases.find((x) => x.phase === phase)?.durationMs || 0;
  return {
    id: `performance:${record.target.platform}-x64`,
    candidate: {
      ...candidate,
      sourceCommit: record.candidate.commit || "",
      xpiSha256: record.candidate.xpiSha256 || "",
      capacity: record.capacity.total,
    },
    status: record.passed ? "passed" : "failed",
    environment: `zotero-${record.target.zoteroMajor} ${record.target.platform}`,
    recordedAt: new Date().toISOString(),
    artifact,
    performance: {
      finalCandidate:
        record.stage === "final" && record.target.zoteroMajor === 10,
      forcedGc: record.workload.forcedGc,
      warmupMs: duration("warmup"),
      idleMs: duration("idle"),
      loadMs: duration("mixed"),
      settleMs: duration("settle"),
      eventLoopP95Ms: m.lag.p95Ms,
      maxStallMs: m.lag.maxMs,
      foregroundAdmissionMs: m.admission.foregroundMaxMs,
      baselineRssBytes: m.rss.baselineBytes || 0,
      peakRssBytes: m.rss.peakBytes || 0,
      settledRssBytes: m.rss.settledBytes || 0,
      eventLoss: m.completeness.missing,
      starvation: Number(m.completeness.starved),
      overCapacity: m.admission.overCapacityAdmissions,
      unexplainedFailures: m.load.unexplainedFailures,
    },
  };
}

const execFileAsync = promisify(execFile);
export async function collectPiCandidate(
  xpiPath: string,
  capacity = 12,
): Promise<PiAcceptanceCandidate> {
  const [head, status, digest] = await Promise.all([
    execFileAsync("git", ["rev-parse", "HEAD"]),
    execFileAsync("git", ["status", "--porcelain"]),
    sha256File(xpiPath),
  ]);
  const archive = readZipArchiveEntries(xpiPath, {
    selectedEntries: new Set([
      "manifest.json",
      PI_RUNTIME_BUILD_IDENTITY_ENTRY,
    ]),
  });
  const manifestBytes = archive.selectedEntries.get("manifest.json");
  const identityBytes = archive.selectedEntries.get(
    PI_RUNTIME_BUILD_IDENTITY_ENTRY,
  );
  if (!manifestBytes || !identityBytes)
    throw new Error("pi_candidate_identity_missing");
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const identity = assertCandidatePiRuntimeBuildIdentity(
    JSON.parse(identityBytes.toString("utf8")),
  );
  if (
    identity.measurementOnly !== false ||
    identity.debug !== false ||
    identity.capacity !== capacity ||
    identity.source?.commit !== head.stdout.trim()
  )
    throw new Error("pi_candidate_identity_mismatch");
  return {
    sourceCommit: head.stdout.trim(),
    dirty: Boolean(status.stdout.trim()) || identity.source?.clean !== true,
    xpiSha256: digest,
    version: String(manifest.version || ""),
    capacity,
  };
}

async function main(argv: string[]) {
  const option = (name: string) => {
    const index = argv.indexOf(name);
    return index < 0 ? undefined : argv[index + 1];
  };
  const xpi = option("--xpi");
  const out = option("--out");
  if (!xpi || !out)
    throw new Error("Required: --xpi PATH --out PATH [--evidence PATH]");
  const candidate = await collectPiCandidate(
    xpi,
    Number(option("--capacity") || 12),
  );
  const evidencePath = option("--evidence");
  const evidence: PiAcceptanceEvidence[] = evidencePath
    ? JSON.parse(await fs.readFile(evidencePath, "utf8"))
    : [];
  for (let i = 0; i < argv.length; i++)
    if (argv[i] === "--bundle") {
      const file = argv[++i];
      if (!file || !safeReference(file))
        throw new Error("Bundle must be a relative artifact reference");
      const record = JSON.parse(await fs.readFile(file, "utf8"));
      if (
        record.schema !== "zotero-agents.pi-runtime-bundle-record.v1" ||
        record.id !== "bundle"
      )
        throw new Error("Invalid bundle receipt schema");
      evidence.push(record);
    }
  for (let i = 0; i < argv.length; i++)
    if (argv[i] === "--receipt") {
      const file = argv[++i];
      if (!file || !safeReference(file))
        throw new Error("Receipt must be a relative artifact reference");
      const receipt: CompatibilityReceipt = JSON.parse(
        await fs.readFile(file, "utf8"),
      );
      if (receipt.schemaId !== "zotero-agents.zotero-compatibility-receipt.v1")
        throw new Error("Invalid compatibility receipt schema");
      evidence.push(...compatibilityPiEvidence(receipt, candidate, file));
    }
  for (let i = 0; i < argv.length; i++)
    if (argv[i] === "--performance") {
      const file = argv[++i];
      if (!file || !safeReference(file))
        throw new Error("Performance must be a relative artifact reference");
      evidence.push(
        performancePiEvidence(
          JSON.parse(await fs.readFile(file, "utf8")),
          candidate,
          file,
        ),
      );
    }
  const report = buildPiAcceptanceReport(
    candidate,
    await loadCompatibilityManifest("tests/zotero/compatibility-matrix.json"),
    evidence,
  );
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(`${out}.json`, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(`${out}.md`, renderPiAcceptanceMarkdown(report));
  console.log(
    JSON.stringify({
      accepted: report.accepted,
      missing: report.items
        .filter((x) => x.blocking && x.status !== "passed")
        .map((x) => x.id),
    }),
  );
  if (!report.accepted) process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href)
  void main(process.argv.slice(2)).catch(() => {
    console.error("pi_acceptance_input_failed");
    process.exitCode = 1;
  });
