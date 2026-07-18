import { hasUnpairedSynthesisSurrogate } from "./canonicalJson.js";

export const SYNTHESIS_SIDECAR_RUNTIME_BUNDLE_SCHEMA =
  "synthesis-sidecar-runtime-bundle.v1" as const;
export const SYNTHESIS_SIDECAR_RUNTIME_POINTER_SCHEMA =
  "synthesis-sidecar-runtime-pointer.v1" as const;
export const SYNTHESIS_SIDECAR_NODE_VERSION = "24.18.0" as const;
export const SYNTHESIS_SIDECAR_RUNTIME_TARGETS = [
  "win32-x64",
  "darwin-x64",
  "darwin-arm64",
  "linux-x64",
  "linux-arm64",
] as const;

export type SynthesisSidecarRuntimeTarget =
  (typeof SYNTHESIS_SIDECAR_RUNTIME_TARGETS)[number];

export type SynthesisSidecarRuntimeBundleFile = Readonly<{
  path: string;
  bytes: number;
  sha256: string;
  executable: boolean;
}>;

export type SynthesisSidecarRuntimeBundleManifest = Readonly<{
  schema: typeof SYNTHESIS_SIDECAR_RUNTIME_BUNDLE_SCHEMA;
  bundleId: string;
  nodeVersion: typeof SYNTHESIS_SIDECAR_NODE_VERSION;
  serviceVersion: string;
  protocolVersion: "synthesis-sidecar.v1";
  target: SynthesisSidecarRuntimeTarget;
  buildFingerprint: string;
  upstream: Readonly<{
    archive: string;
    sha256: string;
    signature: "verified";
    platformSignature: "verified" | "not-applicable";
  }>;
  executable: string;
  entrypoint: string;
  files: readonly SynthesisSidecarRuntimeBundleFile[];
}>;

export type SynthesisSidecarRuntimePointer = Readonly<{
  schema: typeof SYNTHESIS_SIDECAR_RUNTIME_POINTER_SCHEMA;
  bundleId: string;
}>;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$/;
const FILE_SEGMENT_PATTERN = /^[A-Za-z0-9._+-]+$/;

function fail(code: string): never {
  throw new Error(`Invalid Synthesis sidecar runtime bundle: ${code}`);
}

function strictRecord(
  value: unknown,
  keys: readonly string[],
  code: string,
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    fail(`${code}_not_object`);
  }
  const record = value as Record<string, unknown>;
  const allowed = new Set(keys);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      fail(`${code}_unknown_field`);
    }
  }
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      fail(`${code}_missing_field`);
    }
  }
  return record;
}

function strictString(value: unknown, code: string, pattern: RegExp): string {
  if (
    typeof value !== "string" ||
    hasUnpairedSynthesisSurrogate(value) ||
    !pattern.test(value)
  ) {
    fail(code);
  }
  return value;
}

function strictSha256(value: unknown, code: string) {
  return strictString(value, code, SHA256_PATTERN);
}

function rebuildRelativeFilePath(value: unknown, code: string) {
  if (
    typeof value !== "string" ||
    !value ||
    hasUnpairedSynthesisSurrogate(value) ||
    value.length > 512 ||
    value.includes("\\") ||
    value.startsWith("/") ||
    value.endsWith("/")
  ) {
    fail(code);
  }
  const segments = value.split("/");
  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        !FILE_SEGMENT_PATTERN.test(segment) ||
        segment.length > 96,
    )
  ) {
    fail(code);
  }
  return segments.join("/");
}

function rebuildTarget(value: unknown): SynthesisSidecarRuntimeTarget {
  if (
    typeof value !== "string" ||
    !SYNTHESIS_SIDECAR_RUNTIME_TARGETS.includes(
      value as SynthesisSidecarRuntimeTarget,
    )
  ) {
    fail("target_invalid");
  }
  return value as SynthesisSidecarRuntimeTarget;
}

function rebuildFile(value: unknown): SynthesisSidecarRuntimeBundleFile {
  const record = strictRecord(
    value,
    ["path", "bytes", "sha256", "executable"],
    "file",
  );
  if (
    typeof record.bytes !== "number" ||
    !Number.isSafeInteger(record.bytes) ||
    record.bytes < 0 ||
    record.bytes > 512 * 1024 * 1024
  ) {
    fail("file_bytes_invalid");
  }
  if (typeof record.executable !== "boolean") {
    fail("file_executable_invalid");
  }
  return Object.freeze({
    path: rebuildRelativeFilePath(record.path, "file_path_invalid"),
    bytes: record.bytes,
    sha256: strictSha256(record.sha256, "file_sha256_invalid"),
    executable: record.executable,
  });
}

export function rebuildSynthesisSidecarRuntimeBundleManifest(
  value: unknown,
): SynthesisSidecarRuntimeBundleManifest {
  const record = strictRecord(
    value,
    [
      "schema",
      "bundleId",
      "nodeVersion",
      "serviceVersion",
      "protocolVersion",
      "target",
      "buildFingerprint",
      "upstream",
      "executable",
      "entrypoint",
      "files",
    ],
    "manifest",
  );
  if (record.schema !== SYNTHESIS_SIDECAR_RUNTIME_BUNDLE_SCHEMA) {
    fail("schema_invalid");
  }
  if (record.nodeVersion !== SYNTHESIS_SIDECAR_NODE_VERSION) {
    fail("node_version_invalid");
  }
  if (record.protocolVersion !== "synthesis-sidecar.v1") {
    fail("protocol_version_invalid");
  }
  const target = rebuildTarget(record.target);
  const upstream = strictRecord(
    record.upstream,
    ["archive", "sha256", "signature", "platformSignature"],
    "upstream",
  );
  const archive = strictString(
    upstream.archive,
    "upstream_archive_invalid",
    /^[A-Za-z0-9][A-Za-z0-9._+-]{0,255}$/,
  );
  if (upstream.signature !== "verified") {
    fail("upstream_signature_invalid");
  }
  const expectedPlatformSignature = target.startsWith("linux")
    ? "not-applicable"
    : "verified";
  if (upstream.platformSignature !== expectedPlatformSignature) {
    fail("upstream_platform_signature_invalid");
  }
  if (
    !Array.isArray(record.files) ||
    record.files.length < 3 ||
    record.files.length > 2048
  ) {
    fail("files_invalid");
  }
  const files = record.files.map(rebuildFile);
  const seen = new Set<string>();
  let previousPath = "";
  for (const file of files) {
    if (seen.has(file.path)) {
      fail("file_path_duplicate");
    }
    if (previousPath && previousPath.localeCompare(file.path) >= 0) {
      fail("files_not_sorted");
    }
    previousPath = file.path;
    seen.add(file.path);
  }
  const executable = rebuildRelativeFilePath(
    record.executable,
    "executable_invalid",
  );
  const entrypoint = rebuildRelativeFilePath(
    record.entrypoint,
    "entrypoint_invalid",
  );
  const executableEntry = files.find((file) => file.path === executable);
  const entrypointEntry = files.find((file) => file.path === entrypoint);
  if (!executableEntry?.executable || !entrypointEntry) {
    fail("runtime_entry_missing");
  }
  const expectedExecutable = target === "win32-x64" ? "node.exe" : "node";
  if (executable !== expectedExecutable) {
    fail("executable_target_mismatch");
  }
  if (!files.some((file) => /^LICENSE(?:[-_.].*)?$/i.test(file.path))) {
    fail("node_license_missing");
  }
  return Object.freeze({
    schema: SYNTHESIS_SIDECAR_RUNTIME_BUNDLE_SCHEMA,
    bundleId: strictSha256(record.bundleId, "bundle_id_invalid"),
    nodeVersion: SYNTHESIS_SIDECAR_NODE_VERSION,
    serviceVersion: strictString(
      record.serviceVersion,
      "service_version_invalid",
      VERSION_PATTERN,
    ),
    protocolVersion: "synthesis-sidecar.v1",
    target,
    buildFingerprint: strictSha256(
      record.buildFingerprint,
      "build_fingerprint_invalid",
    ),
    upstream: Object.freeze({
      archive,
      sha256: strictSha256(upstream.sha256, "upstream_sha256_invalid"),
      signature: "verified",
      platformSignature: expectedPlatformSignature,
    }),
    executable,
    entrypoint,
    files: Object.freeze(files),
  });
}

export function rebuildSynthesisSidecarRuntimePointer(
  value: unknown,
): SynthesisSidecarRuntimePointer {
  const record = strictRecord(value, ["schema", "bundleId"], "pointer");
  if (record.schema !== SYNTHESIS_SIDECAR_RUNTIME_POINTER_SCHEMA) {
    fail("pointer_schema_invalid");
  }
  return Object.freeze({
    schema: SYNTHESIS_SIDECAR_RUNTIME_POINTER_SCHEMA,
    bundleId: strictSha256(record.bundleId, "pointer_bundle_id_invalid"),
  });
}
