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
export const SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA =
  "synthesis-sidecar-runtime-prebuild-result.v2" as const;
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

export type SynthesisSidecarRuntimePrebuildResult = Readonly<{
  schema:
    | typeof SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA_V1
    | typeof SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA;
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

export function rebuildSynthesisSidecarRuntimePrebuildResult(
  value: unknown,
): SynthesisSidecarRuntimePrebuildResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("prebuild_result_fields");
  }
  const schema = (value as Record<string, unknown>).schema;
  const isV2 = schema === SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA;
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
      data.schema !== SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_RESULT_SCHEMA) ||
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
  let cache: SynthesisSidecarRuntimePrebuildResult["cache"] = null;
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
    schema: data.schema as SynthesisSidecarRuntimePrebuildResult["schema"],
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
