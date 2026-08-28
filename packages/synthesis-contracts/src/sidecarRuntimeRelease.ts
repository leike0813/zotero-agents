import { sha256SynthesisContractText } from "./canonicalJson.js";
import {
  SYNTHESIS_SIDECAR_RUNTIME_TARGETS,
  type SynthesisSidecarRuntimeTarget,
} from "./sidecarRuntimeBundle.js";

export const SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH =
  "synthesis-sidecar-runtime-prebuilds" as const;
export const SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_SET_SCHEMA =
  "synthesis-sidecar-runtime-prebuild-set.v1" as const;
export const SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA_V1 =
  "synthesis-sidecar-runtime-prebuild-result.v1" as const;
export const SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA_V2 =
  "synthesis-sidecar-runtime-prebuild-result.v2" as const;
export const SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA =
  "synthesis-sidecar-runtime-prebuild-result.v3" as const;
export const SYNTHESIS_SIDECAR_VERIFICATION_RESULT_SCHEMA =
  "synthesis-sidecar-verification-result.v1" as const;
export const SYNTHESIS_SIDECAR_RUNTIME_RELEASE_SET_SCHEMA =
  "synthesis-sidecar-runtime-release-set.v1" as const;
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

export type SynthesisSidecarRuntimeLegacyPrebuildResult = Readonly<{
  schema:
    | typeof SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA_V1
    | typeof SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA_V2;
  repository: string;
  workflow: "prebuild-synthesis-sidecar-runtime.yml";
  runId: number;
  requestId: string;
  sourceSha: string;
  buildFingerprint: string;
  aggregate: string;
  prebuildBranch: typeof SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH;
  prebuildCommit: string;
  setPath: string;
  cache: Readonly<{
    cacheHits: readonly SynthesisSidecarRuntimeTarget[];
    cacheMisses: readonly SynthesisSidecarRuntimeTarget[];
    cacheSourceRuns: readonly number[];
  }> | null;
}>;

export type SynthesisSidecarVerificationResult = Readonly<{
  schema: typeof SYNTHESIS_SIDECAR_VERIFICATION_RESULT_SCHEMA;
  repository: string;
  workflow: "verify-synthesis-sidecar.yml";
  runId: number;
  event: "push" | "workflow_dispatch";
  sourceSha: string;
  verificationFingerprint: string;
  pipelineRevision: string;
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

export type SynthesisSidecarRuntimePrebuildResultV3 = Readonly<{
  schema: typeof SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA;
  repository: string;
  workflow: "prebuild-synthesis-sidecar-runtime.yml";
  runId: number;
  requestId: string;
  sourceSha: string;
  sourceFingerprint: string;
  buildFingerprint: string;
  verificationFingerprint: string;
  pipelineRevision: string;
  verification: Readonly<{
    runId: number;
    sourceSha: string;
    event: "push" | "workflow_dispatch";
  }>;
  aggregate: string;
  prebuildBranch: typeof SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH;
  prebuildCommit: string;
  setPath: string;
  targets: Readonly<
    Record<SynthesisSidecarRuntimeTarget, SynthesisSidecarRuntimeTargetEvidence>
  >;
}>;

export type SynthesisSidecarRuntimePrebuildResult =
  | SynthesisSidecarRuntimeLegacyPrebuildResult
  | SynthesisSidecarRuntimePrebuildResultV3;

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

function rebuildLegacySynthesisSidecarRuntimePrebuildResult(
  value: unknown,
): SynthesisSidecarRuntimeLegacyPrebuildResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("prebuild_result_fields");
  }
  const schema = (value as Record<string, unknown>).schema;
  const isV2 = schema === SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA_V2;
  const data = record(
    value,
    [
      "schema",
      "repository",
      "workflow",
      "runId",
      "requestId",
      "sourceSha",
      "buildFingerprint",
      "aggregate",
      "prebuildBranch",
      "prebuildCommit",
      "setPath",
      ...(isV2 ? ["cache"] : []),
    ],
    "prebuild_result_fields",
  );
  if (
    (data.schema !== SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA_V1 &&
      data.schema !== SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA_V2) ||
    data.workflow !== "prebuild-synthesis-sidecar-runtime.yml" ||
    data.prebuildBranch !== SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH ||
    typeof data.repository !== "string" ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(data.repository) ||
    typeof data.requestId !== "string" ||
    !REQUEST.test(data.requestId)
  )
    fail("prebuild_result_identity");
  const aggregate = sha(data.aggregate, "prebuild_result_aggregate");
  if (data.setPath !== `sets/${aggregate}`) fail("prebuild_result_set_path");
  let cache: SynthesisSidecarRuntimeLegacyPrebuildResult["cache"] = null;
  if (isV2) {
    const cacheData = record(
      data.cache,
      ["cacheHits", "cacheMisses", "cacheSourceRuns"],
      "prebuild_result_cache_fields",
    );
    if (
      !Array.isArray(cacheData.cacheHits) ||
      !Array.isArray(cacheData.cacheMisses) ||
      !Array.isArray(cacheData.cacheSourceRuns)
    ) {
      fail("prebuild_result_cache");
    }
    const cacheHits = cacheData.cacheHits as unknown[];
    const cacheMisses = cacheData.cacheMisses as unknown[];
    const cacheTargets = [...cacheHits, ...cacheMisses];
    if (
      cacheTargets.length !== SYNTHESIS_SIDECAR_RUNTIME_TARGETS.length ||
      new Set(cacheTargets).size !== SYNTHESIS_SIDECAR_RUNTIME_TARGETS.length ||
      cacheTargets.some(
        (target) =>
          typeof target !== "string" ||
          !SYNTHESIS_SIDECAR_RUNTIME_TARGETS.includes(
            target as SynthesisSidecarRuntimeTarget,
          ),
      )
    ) {
      fail("prebuild_result_cache_targets");
    }
    const cacheSourceRuns = cacheData.cacheSourceRuns.map((runId) =>
      integer(runId, "prebuild_result_cache_run"),
    );
    if (
      new Set(cacheSourceRuns).size !== cacheSourceRuns.length ||
      (cacheHits.length === 0) !== (cacheSourceRuns.length === 0)
    ) {
      fail("prebuild_result_cache_runs");
    }
    cache = Object.freeze({
      cacheHits: Object.freeze(cacheHits as SynthesisSidecarRuntimeTarget[]),
      cacheMisses: Object.freeze(
        cacheMisses as SynthesisSidecarRuntimeTarget[],
      ),
      cacheSourceRuns: Object.freeze(cacheSourceRuns),
    });
  }
  return Object.freeze({
    schema:
      data.schema as SynthesisSidecarRuntimeLegacyPrebuildResult["schema"],
    repository: data.repository,
    workflow: "prebuild-synthesis-sidecar-runtime.yml",
    runId: integer(data.runId, "prebuild_result_run"),
    requestId: data.requestId,
    sourceSha: sha(data.sourceSha, "prebuild_result_source", 40),
    buildFingerprint: sha(data.buildFingerprint, "prebuild_result_fingerprint"),
    aggregate,
    prebuildBranch: SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH,
    prebuildCommit: sha(data.prebuildCommit, "prebuild_result_commit", 40),
    setPath: data.setPath,
    cache,
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
      "verificationFingerprint",
      "pipelineRevision",
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
    verificationFingerprint: sha(
      data.verificationFingerprint,
      "verification_result_fingerprint",
    ),
    pipelineRevision: sha(
      data.pipelineRevision,
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

function rebuildSynthesisSidecarRuntimePrebuildResultV3(
  value: unknown,
): SynthesisSidecarRuntimePrebuildResultV3 {
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
      "verificationFingerprint",
      "pipelineRevision",
      "verification",
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
  const verification = record(
    data.verification,
    ["runId", "sourceSha", "event"],
    "prebuild_result_verification_fields",
  );
  if (
    verification.event !== "push" &&
    verification.event !== "workflow_dispatch"
  ) {
    fail("prebuild_result_verification_event");
  }
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
    verificationFingerprint: sha(
      data.verificationFingerprint,
      "prebuild_result_verification_fingerprint",
    ),
    pipelineRevision: sha(
      data.pipelineRevision,
      "prebuild_result_pipeline_revision",
    ),
    verification: Object.freeze({
      runId: integer(verification.runId, "prebuild_result_verification_run"),
      sourceSha: sha(
        verification.sourceSha,
        "prebuild_result_verification_source",
        40,
      ),
      event: verification.event,
    }),
    aggregate,
    prebuildBranch: SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH,
    prebuildCommit: sha(data.prebuildCommit, "prebuild_result_commit", 40),
    setPath: data.setPath,
    targets: Object.freeze(targets),
  });
}

export function rebuildSynthesisSidecarRuntimePrebuildResult(
  value: unknown,
): SynthesisSidecarRuntimePrebuildResult {
  const schema =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>).schema
      : undefined;
  return schema === SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA
    ? rebuildSynthesisSidecarRuntimePrebuildResultV3(value)
    : rebuildLegacySynthesisSidecarRuntimePrebuildResult(value);
}

export function assertReleaseEligibleSynthesisSidecarRuntimePrebuildResult(
  result: SynthesisSidecarRuntimePrebuildResult,
): asserts result is SynthesisSidecarRuntimePrebuildResultV3 {
  if (result.schema !== SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA) {
    fail("prebuild_result_release_eligibility");
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
