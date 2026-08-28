import { sha256SynthesisContractText } from "./canonicalJson.js";
import {
  SYNTHESIS_SIDECAR_RUNTIME_TARGETS,
  type SynthesisSidecarRuntimeTarget,
} from "./sidecarRuntimeBundle.js";

export const SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH =
  "synthesis-sidecar-runtime-prebuilds" as const;
export const SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_SET_SCHEMA =
  "synthesis-sidecar-runtime-prebuild-set.v1" as const;
export const SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA =
  "synthesis-sidecar-runtime-prebuild-result.v4" as const;
export const SYNTHESIS_SIDECAR_VERIFICATION_RESULT_SCHEMA =
  "synthesis-sidecar-verification-result.v2" as const;
export const SYNTHESIS_SIDECAR_RUNTIME_RELEASE_SET_SCHEMA =
  "synthesis-sidecar-runtime-release-set.v2" as const;
export const SYNTHESIS_SIDECAR_RUNTIME_RELEASE_RECEIPT_SCHEMA =
  "synthesis-sidecar-runtime-release-receipt.v1" as const;

const SHA256 = /^[a-f0-9]{64}$/;
const SHA1 = /^[a-f0-9]{40}$/;
const REQUEST = /^[A-Za-z0-9._-]{1,128}$/;

export type SynthesisSidecarRuntimePrebuildArchive = Readonly<{
  target: SynthesisSidecarRuntimeTarget;
  file: string;
  sha256: string;
  bytes: number;
}>;

export type SynthesisSidecarRuntimePrebuildSet = Readonly<{
  schema: typeof SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_SET_SCHEMA;
  aggregate: string;
  buildFingerprint: string;
  sourceFingerprint: string;
  archives: readonly SynthesisSidecarRuntimePrebuildArchive[];
}>;

export type SynthesisSidecarVerificationResult = Readonly<{
  schema: typeof SYNTHESIS_SIDECAR_VERIFICATION_RESULT_SCHEMA;
  repository: string;
  workflow: "verify-synthesis-sidecar.yml";
  runId: number;
  event: "push" | "workflow_dispatch";
  sourceSha: string;
  sourceFingerprint: string;
  buildFingerprint: string;
  verificationFingerprint: string;
  verificationPipelineRevision: string;
  hosts: Readonly<{
    linux: "passed";
    windows: "passed";
    macos: "passed";
  }>;
}>;

export type SynthesisSidecarRuntimeTargetEvidence = Readonly<{
  mode: "built" | "reused";
  artifactRunId: number;
  artifactSourceSha: string;
  archiveSha256: string;
  archiveBytes: number;
  smoke:
    | Readonly<{ status: "passed"; runId: number }>
    | Readonly<{ status: "not_applicable" }>;
}>;

export type SynthesisSidecarRuntimePrebuildResult = Readonly<{
  schema: typeof SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA;
  repository: string;
  workflow: "prebuild-synthesis-sidecar-runtime.yml";
  runId: number;
  requestId: string;
  sourceSha: string;
  sourceFingerprint: string;
  buildFingerprint: string;
  prebuildPipelineRevision: string;
  aggregate: string;
  prebuildBranch: typeof SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH;
  prebuildCommit: string;
  setPath: string;
  targets: Readonly<
    Record<SynthesisSidecarRuntimeTarget, SynthesisSidecarRuntimeTargetEvidence>
  >;
}>;

function fail(code: string): never {
  throw new Error(`Invalid Synthesis sidecar runtime release: ${code}`);
}

function record(value: unknown, keys: readonly string[], code: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const result = value as Record<string, unknown>;
  if (
    Object.keys(result).length !== keys.length ||
    keys.some((key) => !Object.prototype.hasOwnProperty.call(result, key))
  ) {
    fail(code);
  }
  return result;
}

function sha(value: unknown, code: string, length = 64) {
  if (
    typeof value !== "string" ||
    !(length === 64 ? SHA256 : SHA1).test(value)
  ) {
    fail(code);
  }
  return value;
}

function integer(value: unknown, code: string, minimum = 1) {
  if (!Number.isSafeInteger(value) || Number(value) < minimum) fail(code);
  return Number(value);
}

export function synthesisSidecarRuntimeArchiveName(
  target: SynthesisSidecarRuntimeTarget,
) {
  return `synthesis-sidecar-runtime-${target}.tar.gz`;
}

export function computeSynthesisSidecarRuntimePrebuildAggregate(
  archives: readonly SynthesisSidecarRuntimePrebuildArchive[],
) {
  const canonical = [...archives]
    .sort((a, b) => a.target.localeCompare(b.target))
    .map(({ target, file, sha256, bytes }) => ({
      target,
      file,
      sha256,
      bytes,
    }));
  return sha256SynthesisContractText(`${JSON.stringify(canonical)}\n`).slice(
    "sha256:".length,
  );
}

export function rebuildSynthesisSidecarRuntimePrebuildSet(
  value: unknown,
): SynthesisSidecarRuntimePrebuildSet {
  const data = record(
    value,
    [
      "schema",
      "aggregate",
      "buildFingerprint",
      "sourceFingerprint",
      "archives",
    ],
    "prebuild_set_fields",
  );
  if (data.schema !== SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_SET_SCHEMA) {
    fail("prebuild_set_schema");
  }
  if (
    !Array.isArray(data.archives) ||
    data.archives.length !== SYNTHESIS_SIDECAR_RUNTIME_TARGETS.length
  ) {
    fail("prebuild_set_archives");
  }
  const archives = data.archives.map((value) => {
    const entry = record(
      value,
      ["target", "file", "sha256", "bytes"],
      "archive_fields",
    );
    if (
      typeof entry.target !== "string" ||
      !SYNTHESIS_SIDECAR_RUNTIME_TARGETS.includes(
        entry.target as SynthesisSidecarRuntimeTarget,
      ) ||
      entry.file !==
        synthesisSidecarRuntimeArchiveName(
          entry.target as SynthesisSidecarRuntimeTarget,
        )
    ) {
      fail("archive_target");
    }
    return Object.freeze({
      target: entry.target as SynthesisSidecarRuntimeTarget,
      file: entry.file,
      sha256: sha(entry.sha256, "archive_sha"),
      bytes: integer(entry.bytes, "archive_bytes"),
    });
  });
  const targets = new Set(archives.map((entry) => entry.target));
  if (targets.size !== SYNTHESIS_SIDECAR_RUNTIME_TARGETS.length)
    fail("archive_duplicate");
  const aggregate = sha(data.aggregate, "prebuild_set_aggregate");
  if (aggregate !== computeSynthesisSidecarRuntimePrebuildAggregate(archives)) {
    fail("prebuild_set_aggregate");
  }
  return Object.freeze({
    schema: SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_SET_SCHEMA,
    aggregate,
    buildFingerprint: sha(data.buildFingerprint, "prebuild_set_fingerprint"),
    sourceFingerprint: sha(
      data.sourceFingerprint,
      "prebuild_set_source_fingerprint",
    ),
    archives: Object.freeze(
      archives.sort((a, b) => a.target.localeCompare(b.target)),
    ),
  });
}

export function rebuildSynthesisSidecarVerificationResult(
  value: unknown,
): SynthesisSidecarVerificationResult {
  const data = record(
    value,
    [
      "schema",
      "repository",
      "workflow",
      "runId",
      "event",
      "sourceSha",
      "sourceFingerprint",
      "buildFingerprint",
      "verificationFingerprint",
      "verificationPipelineRevision",
      "hosts",
    ],
    "verification_result_fields",
  );
  if (
    data.schema !== SYNTHESIS_SIDECAR_VERIFICATION_RESULT_SCHEMA ||
    data.workflow !== "verify-synthesis-sidecar.yml" ||
    (data.event !== "push" && data.event !== "workflow_dispatch") ||
    typeof data.repository !== "string" ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(data.repository)
  ) {
    fail("verification_result_identity");
  }
  const hosts = record(
    data.hosts,
    ["linux", "windows", "macos"],
    "verification_result_hosts",
  );
  if (
    hosts.linux !== "passed" ||
    hosts.windows !== "passed" ||
    hosts.macos !== "passed"
  ) {
    fail("verification_result_hosts");
  }
  return Object.freeze({
    schema: SYNTHESIS_SIDECAR_VERIFICATION_RESULT_SCHEMA,
    repository: data.repository,
    workflow: "verify-synthesis-sidecar.yml",
    runId: integer(data.runId, "verification_result_run"),
    event: data.event,
    sourceSha: sha(data.sourceSha, "verification_result_source", 40),
    sourceFingerprint: sha(
      data.sourceFingerprint,
      "verification_result_source_fingerprint",
    ),
    buildFingerprint: sha(
      data.buildFingerprint,
      "verification_result_build_fingerprint",
    ),
    verificationFingerprint: sha(
      data.verificationFingerprint,
      "verification_result_fingerprint",
    ),
    verificationPipelineRevision: sha(
      data.verificationPipelineRevision,
      "verification_result_pipeline_revision",
    ),
    hosts: Object.freeze({
      linux: "passed" as const,
      windows: "passed" as const,
      macos: "passed" as const,
    }),
  });
}

const NATIVE_SMOKE_TARGETS = new Set<SynthesisSidecarRuntimeTarget>([
  "win32-x64",
  "darwin-x64",
  "darwin-arm64",
  "linux-x64",
  "linux-arm64",
]);

function rebuildTargetEvidence(
  value: unknown,
  target: SynthesisSidecarRuntimeTarget,
  currentRunId: number,
  currentSourceSha: string,
): SynthesisSidecarRuntimeTargetEvidence {
  const data = record(
    value,
    [
      "mode",
      "artifactRunId",
      "artifactSourceSha",
      "archiveSha256",
      "archiveBytes",
      "smoke",
    ],
    "prebuild_result_target_fields",
  );
  if (data.mode !== "built" && data.mode !== "reused") {
    fail("prebuild_result_target_mode");
  }
  const artifactRunId = integer(
    data.artifactRunId,
    "prebuild_result_target_artifact_run",
  );
  const artifactSourceSha = sha(
    data.artifactSourceSha,
    "prebuild_result_target_artifact_source",
    40,
  );
  if (
    data.mode === "built" &&
    (artifactRunId !== currentRunId || artifactSourceSha !== currentSourceSha)
  ) {
    fail("prebuild_result_built_identity");
  }
  const smokeData = data.smoke as Record<string, unknown> | null;
  let smoke: SynthesisSidecarRuntimeTargetEvidence["smoke"];
  if (NATIVE_SMOKE_TARGETS.has(target)) {
    const passed = record(
      smokeData,
      ["status", "runId"],
      "prebuild_result_native_smoke_fields",
    );
    if (
      passed.status !== "passed" ||
      integer(passed.runId, "prebuild_result_native_smoke_run") !== currentRunId
    ) {
      fail("prebuild_result_native_smoke");
    }
    smoke = Object.freeze({ status: "passed", runId: currentRunId });
  } else {
    const notApplicable = record(
      smokeData,
      ["status"],
      "prebuild_result_cross_smoke_fields",
    );
    if (notApplicable.status !== "not_applicable") {
      fail("prebuild_result_cross_smoke");
    }
    smoke = Object.freeze({ status: "not_applicable" });
  }
  return Object.freeze({
    mode: data.mode,
    artifactRunId,
    artifactSourceSha,
    archiveSha256: sha(
      data.archiveSha256,
      "prebuild_result_target_archive_sha",
    ),
    archiveBytes: integer(
      data.archiveBytes,
      "prebuild_result_target_archive_bytes",
    ),
    smoke,
  });
}

export function rebuildSynthesisSidecarRuntimePrebuildResult(
  value: unknown,
): SynthesisSidecarRuntimePrebuildResult {
  const data = record(
    value,
    [
      "schema",
      "repository",
      "workflow",
      "runId",
      "requestId",
      "sourceSha",
      "sourceFingerprint",
      "buildFingerprint",
      "prebuildPipelineRevision",
      "aggregate",
      "prebuildBranch",
      "prebuildCommit",
      "setPath",
      "targets",
    ],
    "prebuild_result_fields",
  );
  if (
    data.schema !== SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA ||
    data.workflow !== "prebuild-synthesis-sidecar-runtime.yml" ||
    data.prebuildBranch !== SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH ||
    typeof data.repository !== "string" ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(data.repository) ||
    typeof data.requestId !== "string" ||
    !REQUEST.test(data.requestId)
  ) {
    fail("prebuild_result_identity");
  }
  const runId = integer(data.runId, "prebuild_result_run");
  const sourceSha = sha(data.sourceSha, "prebuild_result_source", 40);
  const aggregate = sha(data.aggregate, "prebuild_result_aggregate");
  if (data.setPath !== `sets/${aggregate}`) fail("prebuild_result_set_path");
  const targetData = record(
    data.targets,
    SYNTHESIS_SIDECAR_RUNTIME_TARGETS,
    "prebuild_result_targets",
  );
  const targets = {} as Record<
    SynthesisSidecarRuntimeTarget,
    SynthesisSidecarRuntimeTargetEvidence
  >;
  for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGETS) {
    targets[target] = rebuildTargetEvidence(
      targetData[target],
      target,
      runId,
      sourceSha,
    );
  }
  return Object.freeze({
    schema: SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA,
    repository: data.repository,
    workflow: "prebuild-synthesis-sidecar-runtime.yml",
    runId,
    requestId: data.requestId,
    sourceSha,
    sourceFingerprint: sha(
      data.sourceFingerprint,
      "prebuild_result_source_fingerprint",
    ),
    buildFingerprint: sha(
      data.buildFingerprint,
      "prebuild_result_build_fingerprint",
    ),
    prebuildPipelineRevision: sha(
      data.prebuildPipelineRevision,
      "prebuild_result_pipeline_revision",
    ),
    aggregate,
    prebuildBranch: SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH,
    prebuildCommit: sha(data.prebuildCommit, "prebuild_result_commit", 40),
    setPath: data.setPath,
    targets: Object.freeze(targets),
  });
}

export function assertSynthesisSidecarRuntimePrebuildResultSet(
  result: SynthesisSidecarRuntimePrebuildResult,
  set: SynthesisSidecarRuntimePrebuildSet,
): void {
  if (
    result.aggregate !== set.aggregate ||
    result.buildFingerprint !== set.buildFingerprint ||
    result.sourceFingerprint !== set.sourceFingerprint
  ) {
    fail("prebuild_result_set_identity");
  }
  for (const archive of set.archives) {
    const evidence = result.targets[archive.target];
    if (
      evidence.archiveSha256 !== archive.sha256 ||
      evidence.archiveBytes !== archive.bytes
    ) {
      fail("prebuild_result_set_archive");
    }
  }
}

export function assertSynthesisSidecarRuntimePrebuildResultIdentity(
  result: SynthesisSidecarRuntimePrebuildResult,
  expected: Partial<SynthesisSidecarRuntimePrebuildResult>,
) {
  for (const key of Object.keys(expected) as Array<
    keyof SynthesisSidecarRuntimePrebuildResult
  >) {
    if (
      expected[key] !== undefined &&
      String(result[key]) !== String(expected[key])
    ) {
      throw new Error(
        `Synthesis sidecar prebuild result ${key} does not match the expected identity`,
      );
    }
  }
}

export type SynthesisSidecarRuntimeReleaseIdentities = Readonly<{
  sourceFingerprint: string;
  buildFingerprint: string;
  verificationFingerprint: string;
  prebuildPipelineRevision: string;
  verificationPipelineRevision: string;
  releasePipelineRevision: string;
}>;

export type SynthesisSidecarRuntimeReleaseSet = Readonly<{
  schema: typeof SYNTHESIS_SIDECAR_RUNTIME_RELEASE_SET_SCHEMA;
  releaseSetId: string;
  sourceCommit: string;
  releasePipelineRevision: string;
  prebuild: SynthesisSidecarRuntimePrebuildResult;
  verification: SynthesisSidecarVerificationResult;
  materialized: Readonly<{
    addonRoot: "addon/bin";
    targetBundleDirectory: "synthesis-sidecar";
    targets: readonly SynthesisSidecarRuntimeTarget[];
  }>;
}>;

function assertReleaseIdentity(
  label: string,
  actual: string,
  expected: string,
) {
  if (!SHA256.test(expected) || actual !== expected) {
    throw new Error(`Sidecar release ${label} does not match current identity`);
  }
}

export function createSynthesisSidecarRuntimeReleaseSet(args: {
  sourceCommit: string;
  prebuildResult: unknown;
  verificationResult: unknown;
  identities: SynthesisSidecarRuntimeReleaseIdentities;
}): SynthesisSidecarRuntimeReleaseSet {
  if (!SHA1.test(args.sourceCommit)) {
    throw new Error("Sidecar release source commit must be a full SHA");
  }
  const prebuild = rebuildSynthesisSidecarRuntimePrebuildResult(
    args.prebuildResult,
  );
  const verification = rebuildSynthesisSidecarVerificationResult(
    args.verificationResult,
  );
  if (prebuild.sourceSha !== args.sourceCommit) {
    throw new Error("Prebuild result source SHA does not match release source");
  }
  assertReleaseIdentity(
    "source fingerprint",
    prebuild.sourceFingerprint,
    args.identities.sourceFingerprint,
  );
  assertReleaseIdentity(
    "build fingerprint",
    prebuild.buildFingerprint,
    args.identities.buildFingerprint,
  );
  assertReleaseIdentity(
    "prebuild pipeline revision",
    prebuild.prebuildPipelineRevision,
    args.identities.prebuildPipelineRevision,
  );
  assertReleaseIdentity(
    "verification source fingerprint",
    verification.sourceFingerprint,
    args.identities.sourceFingerprint,
  );
  assertReleaseIdentity(
    "verification build fingerprint",
    verification.buildFingerprint,
    args.identities.buildFingerprint,
  );
  assertReleaseIdentity(
    "verification fingerprint",
    verification.verificationFingerprint,
    args.identities.verificationFingerprint,
  );
  assertReleaseIdentity(
    "verification pipeline revision",
    verification.verificationPipelineRevision,
    args.identities.verificationPipelineRevision,
  );
  if (!SHA256.test(args.identities.releasePipelineRevision)) {
    throw new Error("Sidecar release pipeline revision is invalid");
  }
  const releaseSetId = `ssrs-${sha256SynthesisContractText(
    `${[
      args.sourceCommit,
      prebuild.aggregate,
      prebuild.prebuildCommit,
      verification.verificationFingerprint,
      verification.runId,
      verification.verificationPipelineRevision,
      args.identities.releasePipelineRevision,
    ].join("\n")}\n`,
  )
    .slice("sha256:".length)
    .slice(0, 20)}`;
  return Object.freeze({
    schema: SYNTHESIS_SIDECAR_RUNTIME_RELEASE_SET_SCHEMA,
    releaseSetId,
    sourceCommit: args.sourceCommit,
    releasePipelineRevision: args.identities.releasePipelineRevision,
    prebuild,
    verification,
    materialized: Object.freeze({
      addonRoot: "addon/bin" as const,
      targetBundleDirectory: "synthesis-sidecar" as const,
      targets: Object.freeze([...SYNTHESIS_SIDECAR_RUNTIME_TARGETS]),
    }),
  });
}

export function rebuildSynthesisSidecarRuntimeReleaseSet(
  value: unknown,
): SynthesisSidecarRuntimeReleaseSet {
  const data = record(
    value,
    [
      "schema",
      "releaseSetId",
      "sourceCommit",
      "releasePipelineRevision",
      "prebuild",
      "verification",
      "materialized",
    ],
    "release_set_fields",
  );
  if (
    data.schema !== SYNTHESIS_SIDECAR_RUNTIME_RELEASE_SET_SCHEMA ||
    typeof data.releaseSetId !== "string" ||
    !/^ssrs-[a-f0-9]{20}$/.test(data.releaseSetId)
  ) {
    fail("release_set_identity");
  }
  const prebuild = rebuildSynthesisSidecarRuntimePrebuildResult(data.prebuild);
  const verification = rebuildSynthesisSidecarVerificationResult(
    data.verification,
  );
  const materialized = record(
    data.materialized,
    ["addonRoot", "targetBundleDirectory", "targets"],
    "release_set_materialized_fields",
  );
  if (
    materialized.addonRoot !== "addon/bin" ||
    materialized.targetBundleDirectory !== "synthesis-sidecar" ||
    !Array.isArray(materialized.targets) ||
    materialized.targets.length !== SYNTHESIS_SIDECAR_RUNTIME_TARGETS.length ||
    materialized.targets.some(
      (target, index) => target !== SYNTHESIS_SIDECAR_RUNTIME_TARGETS[index],
    )
  ) {
    fail("release_set_materialized");
  }
  const rebuilt = createSynthesisSidecarRuntimeReleaseSet({
    sourceCommit: sha(data.sourceCommit, "release_set_source", 40),
    prebuildResult: prebuild,
    verificationResult: verification,
    identities: {
      sourceFingerprint: prebuild.sourceFingerprint,
      buildFingerprint: prebuild.buildFingerprint,
      verificationFingerprint: verification.verificationFingerprint,
      prebuildPipelineRevision: prebuild.prebuildPipelineRevision,
      verificationPipelineRevision: verification.verificationPipelineRevision,
      releasePipelineRevision: sha(
        data.releasePipelineRevision,
        "release_set_pipeline_revision",
      ),
    },
  });
  if (data.releaseSetId !== rebuilt.releaseSetId) fail("release_set_id");
  return rebuilt;
}
