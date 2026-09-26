import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import {
  SYNTHESIS_SIDECAR_RUNTIME_TARGETS,
  rebuildSynthesisSidecarRuntimeBundleManifest,
  synthesisSidecarRuntimeTargetBundlePath,
} from "../../packages/synthesis-contracts/src/sidecarRuntimeBundle";
import { computeSynthesisSidecarRuntimeBundleId } from "../synthesis/synthesis-sidecar-runtime-release-governance";
import { readZipArchiveEntries } from "../zip-archive";
import type {
  CompatibilityPlanCell,
  CompatibilityReceipt,
} from "../zotero-compatibility-fixture";
import {
  PHASE1_FAMILY_DECLARATIONS,
  type Phase1FamilyId,
} from "./familyLifecycle";
import type { RunManifest } from "./manifest";
import type { CellRuntimeEvidence } from "./runtimeEvidence";

const REQUIRED_CASE_IDS =
  "SL-01 SL-02 SL-03 RH-01 RH-02 PA-01 PA-02 PM-01 PM-02 PM-03 PM-04 CG-01 HB-01 HB-02 HB-03".split(
    " ",
  );

/** Reads the seven manifest identities and verifies every packaged file. */
export function readCandidateXpi(xpiPath: string) {
  if (statSync(xpiPath).size > 100 * 1024 * 1024) {
    throw new Error("candidate_xpi_oversized");
  }
  const prefixes = SYNTHESIS_SIDECAR_RUNTIME_TARGETS.map(
    (target) => `bin/${synthesisSidecarRuntimeTargetBundlePath(target)}/`,
  );
  const manifestPaths = new Set(
    prefixes.map((prefix) => `${prefix}manifest.json`),
  );
  const archive = readZipArchiveEntries(xpiPath, {
    selectedEntries: manifestPaths,
  });
  const manifests = SYNTHESIS_SIDECAR_RUNTIME_TARGETS.map((target, index) => {
    const bytes = archive.selectedEntries.get(
      `${prefixes[index]}manifest.json`,
    );
    if (!bytes) throw new Error(`candidate_manifest_missing:${target}`);
    const manifest = rebuildSynthesisSidecarRuntimeBundleManifest(
      JSON.parse(bytes.toString("utf8")),
    );
    if (manifest.target !== target) {
      throw new Error(`candidate_target_mismatch:${target}`);
    }
    const { bundleId, ...contents } = manifest;
    if (bundleId !== computeSynthesisSidecarRuntimeBundleId(contents)) {
      throw new Error(`candidate_bundle_id_mismatch:${target}`);
    }
    return manifest;
  });
  const first = manifests[0]!;
  const selectedFiles = new Set<string>();
  for (const [index, manifest] of manifests.entries()) {
    if (
      manifest.buildFingerprint !== first.buildFingerprint ||
      manifest.provenance.sourceFingerprint !==
        first.provenance.sourceFingerprint ||
      manifest.provenance.toolchain !== first.provenance.toolchain ||
      manifest.provenance.cargoLockSha256 !== first.provenance.cargoLockSha256
    ) {
      throw new Error(`candidate_bundle_identity_mismatch:${manifest.target}`);
    }
    for (const entry of manifest.files) {
      selectedFiles.add(`${prefixes[index]}${entry.path}`);
    }
  }
  for (const name of archive.entryNames) {
    if (
      prefixes.some((prefix) => name.startsWith(prefix)) &&
      !name.endsWith("/") &&
      !manifestPaths.has(name) &&
      !selectedFiles.has(name)
    ) {
      throw new Error(`candidate_undeclared_file:${name}`);
    }
  }
  const files = readZipArchiveEntries(xpiPath, {
    selectedEntries: selectedFiles,
  }).selectedEntries;
  for (const [index, manifest] of manifests.entries()) {
    for (const entry of manifest.files) {
      const name = `${prefixes[index]}${entry.path}`;
      const bytes = files.get(name);
      if (
        !bytes ||
        bytes.length !== entry.bytes ||
        createHash("sha256").update(bytes).digest("hex") !== entry.sha256
      ) {
        throw new Error(`candidate_file_mismatch:${name}`);
      }
    }
  }
  return {
    xpiDigest: createHash("sha256").update(readFileSync(xpiPath)).digest("hex"),
    entryNames: archive.entryNames,
    manifests: Object.fromEntries(
      manifests.map((manifest) => [manifest.target, manifest]),
    ),
  };
}

/** Checks one compatibility cell against the candidate actually installed. */
export function evaluateCandidateCell(args: {
  candidate: {
    sourceCommit: string;
    xpiDigest: string;
    bundleId: string;
    buildFingerprint: string;
  };
  receipt: CompatibilityReceipt;
  manifest: RunManifest;
  runtime: CellRuntimeEvidence;
}): string[] {
  const { candidate, receipt, manifest, runtime } = args;
  const reasons: string[] = [];
  const cell = receipt.execution.cell;
  if (
    receipt.schemaId !== "zotero-agents.zotero-compatibility-receipt.v1" ||
    receipt.status !== "passed" ||
    receipt.errors.length > 0 ||
    !receipt.cleanup.complete ||
    receipt.execution.mode !== "behavior" ||
    receipt.execution.suite !== "full" ||
    receipt.execution.domain !== "e2e" ||
    !cell?.blocking ||
    cell.lane !== "acceptance" ||
    cell.sidecarStartupModel !== "pinned-universal-xpi"
  ) {
    reasons.push("cell_not_passed");
  }
  if (
    receipt.source.dirty ||
    receipt.source.commit !== candidate.sourceCommit ||
    manifest.sourceCommit !== candidate.sourceCommit
  ) {
    reasons.push("source_mismatch");
  }
  if (
    receipt.plugin.artifactSha256 !== candidate.xpiDigest ||
    cell?.pluginDigest !== candidate.xpiDigest
  ) {
    reasons.push("xpi_mismatch");
  }
  if (
    !cell ||
    receipt.host.id !== cell.targetId ||
    receipt.host.requestedVersion !== cell.version ||
    receipt.host.observedVersion !== cell.version ||
    receipt.host.platform !== cell.platform ||
    manifest.zoteroVersion !== cell.version ||
    manifest.triggerLane !== cell.lane ||
    manifest.pluginVersion !== receipt.plugin.version ||
    manifest.platform !==
      (cell.runnerEnvironment.os === "windows"
        ? "win32"
        : cell.runnerEnvironment.os)
  ) {
    reasons.push("host_mismatch");
  }
  const expectedFamilies = Object.keys(
    PHASE1_FAMILY_DECLARATIONS,
  ) as Phase1FamilyId[];
  const observedCases = new Set(
    manifest.families.map((family) => family.caseId),
  );
  if (
    !cell ||
    manifest.schemaVersion !== "system-e2e-run-manifest.v1" ||
    !cell.runManifestReference
      .replaceAll("\\", "/")
      .endsWith(`/${manifest.runId}/run-manifest.json`) ||
    cell.families.length !== expectedFamilies.length ||
    expectedFamilies.some((family) => !cell.families.includes(family)) ||
    manifest.terminalState !== "complete" ||
    manifest.families.some(
      (family) =>
        family.result !== "passed" ||
        !family.publicOutcome ||
        family.typedEvidence.length === 0 ||
        family.lifecycle.length === 0 ||
        family.cleanup !== "passed" ||
        family.health !== "passed",
    ) ||
    expectedFamilies.some(
      (family) => !manifest.families.some((entry) => entry.familyId === family),
    ) ||
    REQUIRED_CASE_IDS.some(
      (caseId) =>
        !observedCases.has(caseId) ||
        manifest.families.filter(
          (family) =>
            family.caseId === caseId && family.familyId === caseId.slice(0, 2),
        ).length !== 1,
    )
  ) {
    reasons.push("run_incomplete");
  }
  if (
    runtime.schemaVersion !== "system-e2e-sidecar-runtime-evidence.v1" ||
    !runtime.runtimeRootPresent ||
    !runtime.install.present ||
    runtime.install.target !==
      (cell?.platform === "windows-x64" ? "win32-x64" : cell?.platform) ||
    runtime.install.missingFiles !== 0 ||
    runtime.install.bundleId !== candidate.bundleId ||
    runtime.install.buildFingerprint !== candidate.buildFingerprint ||
    cell?.sidecarFingerprint !== candidate.buildFingerprint ||
    manifest.sidecarBuildIdentity !== candidate.buildFingerprint
  ) {
    reasons.push("bundle_mismatch");
  }
  return reasons;
}

/** Evaluates the acceptance plan's blocking E2E cells without inferring passes. */
export function evaluateCandidateMatrix(
  plan: readonly CompatibilityPlanCell[],
  observed: ReadonlyMap<string, Parameters<typeof evaluateCandidateCell>[0]>,
) {
  const required = plan.filter(
    (cell) =>
      cell.lane === "acceptance" && cell.domain === "e2e" && cell.blocking,
  );
  if (required.length === 0) throw new Error("acceptance_matrix_empty");
  const cells = required.map((cell) => {
    const input = observed.get(cell.id);
    if (!input) {
      return { id: cell.id, status: "pending" as const, reasons: ["missing"] };
    }
    const reasons = evaluateCandidateCell(input);
    if (
      input.receipt.execution.cell?.id !== cell.id ||
      input.receipt.host.id !== cell.targetId ||
      input.receipt.host.requestedVersion !== cell.version ||
      input.receipt.host.platform !== cell.platform
    ) {
      reasons.push("matrix_mismatch");
    }
    return {
      id: cell.id,
      status: reasons.length === 0 ? ("passed" as const) : ("failed" as const),
      reasons,
    };
  });
  return {
    status: cells.some((cell) => cell.status === "failed")
      ? ("failed" as const)
      : cells.some((cell) => cell.status === "pending")
        ? ("pending" as const)
        : ("passed" as const),
    cells,
  };
}
