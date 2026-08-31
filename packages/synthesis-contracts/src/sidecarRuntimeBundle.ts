import { hasUnpairedSynthesisSurrogate } from "./canonicalJson.js";
import {
  SYNTHESIS_SIDECAR_CAPABILITIES,
  type SynthesisSidecarCapability,
} from "./sidecarSystem.js";

export const SYNTHESIS_SIDECAR_RUNTIME_BUNDLE_SCHEMA =
  "synthesis-sidecar-runtime-bundle.v3" as const;
export const SYNTHESIS_SIDECAR_RUNTIME_POINTER_SCHEMA =
  "synthesis-sidecar-runtime-pointer.v2" as const;
export const SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION = "rust-native" as const;
export const SYNTHESIS_SIDECAR_RUNTIME_BUNDLE_DIRECTORY =
  "synthesis-sidecar" as const;
export const SYNTHESIS_SIDECAR_RUNTIME_TARGETS = [
  "win32-x64",
  "darwin-x64",
  "darwin-arm64",
  "linux-x86",
  "linux-x64",
  "linux-arm",
  "linux-arm64",
] as const;

export type SynthesisSidecarRuntimeTarget =
  (typeof SYNTHESIS_SIDECAR_RUNTIME_TARGETS)[number];

export function synthesisSidecarRuntimeTargetBundlePath(
  target: SynthesisSidecarRuntimeTarget,
) {
  return `${target}/${SYNTHESIS_SIDECAR_RUNTIME_BUNDLE_DIRECTORY}`;
}

export const SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES = {
  "win32-x64": "x86_64-pc-windows-msvc",
  "darwin-x64": "x86_64-apple-darwin",
  "darwin-arm64": "aarch64-apple-darwin",
  "linux-x86": "i686-unknown-linux-gnu",
  "linux-x64": "x86_64-unknown-linux-gnu",
  "linux-arm": "armv7-unknown-linux-gnueabihf",
  "linux-arm64": "aarch64-unknown-linux-gnu",
} as const satisfies Record<SynthesisSidecarRuntimeTarget, string>;

export type SynthesisSidecarRuntimeTargetTriple =
  (typeof SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES)[SynthesisSidecarRuntimeTarget];

export type SynthesisSidecarRuntimeBundleFile = Readonly<{
  path: string;
  bytes: number;
  sha256: string;
  executable: boolean;
}>;

export type SynthesisSidecarRuntimePlatformSignature = Readonly<{
  scheme: "authenticode" | "apple-code-signing" | "not-applicable";
  status: "verified" | "unsigned-candidate" | "not-applicable";
  signer: string | null;
}>;

/** Runtime protocol metadata; it is not a v3 bundle admission proof. */
export function synthesisSidecarRuntimePlatformIdentity(
  target: SynthesisSidecarRuntimeTarget,
): SynthesisSidecarRuntimePlatformSignature {
  if (target.startsWith("linux")) {
    return Object.freeze({
      scheme: "not-applicable" as const,
      status: "not-applicable" as const,
      signer: null,
    });
  }
  return Object.freeze({
    scheme:
      target === "win32-x64"
        ? ("authenticode" as const)
        : ("apple-code-signing" as const),
    status: "unsigned-candidate" as const,
    signer: null,
  });
}

export type SynthesisSidecarRuntimeProvenance = Readonly<{
  sourceFingerprint: string;
  toolchain: string;
  cargoLockSha256: string;
  licenseInventory: string;
}>;

export type SynthesisSidecarRuntimeBundleManifest = Readonly<{
  schema: typeof SYNTHESIS_SIDECAR_RUNTIME_BUNDLE_SCHEMA;
  bundleId: string;
  implementation: typeof SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION;
  serviceVersion: string;
  protocolVersion: "synthesis-sidecar.v1";
  target: SynthesisSidecarRuntimeTarget;
  targetTriple: SynthesisSidecarRuntimeTargetTriple;
  executable: string;
  buildFingerprint: string;
  capabilities: readonly SynthesisSidecarCapability[];
  createdAt: string;
  expiresAt: string | null;
  provenance: SynthesisSidecarRuntimeProvenance;
  files: readonly SynthesisSidecarRuntimeBundleFile[];
}>;

export type SynthesisSidecarRuntimePointer = Readonly<{
  schema: typeof SYNTHESIS_SIDECAR_RUNTIME_POINTER_SCHEMA;
  bundleId: string;
}>;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$/;
const FILE_SEGMENT_PATTERN = /^[A-Za-z0-9._+-]+$/;
const RFC3339_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

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

function rebuildTimestamp(value: unknown, code: string) {
  const timestamp = strictString(value, code, RFC3339_UTC_PATTERN);
  if (!Number.isFinite(Date.parse(timestamp))) {
    fail(code);
  }
  return timestamp;
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

function rebuildCapabilities(value: unknown) {
  if (
    !Array.isArray(value) ||
    value.length !== SYNTHESIS_SIDECAR_CAPABILITIES.length ||
    value.some(
      (capability, index) =>
        capability !== SYNTHESIS_SIDECAR_CAPABILITIES[index],
    )
  ) {
    fail("capabilities_invalid");
  }
  return Object.freeze([
    ...SYNTHESIS_SIDECAR_CAPABILITIES,
  ]) as readonly SynthesisSidecarCapability[];
}

export function rebuildSynthesisSidecarRuntimePlatformSignature(
  value: unknown,
  target: SynthesisSidecarRuntimeTarget,
): SynthesisSidecarRuntimePlatformSignature {
  const record = strictRecord(
    value,
    ["scheme", "status", "signer"],
    "platform_signature",
  );
  if (target.startsWith("linux")) {
    if (
      record.scheme !== "not-applicable" ||
      record.status !== "not-applicable" ||
      record.signer !== null
    ) {
      fail("platform_signature_invalid");
    }
    return Object.freeze({
      scheme: "not-applicable",
      status: "not-applicable",
      signer: null,
    });
  }
  const scheme = target === "win32-x64" ? "authenticode" : "apple-code-signing";
  if (
    record.scheme !== scheme ||
    (record.status !== "verified" && record.status !== "unsigned-candidate")
  ) {
    fail("platform_signature_invalid");
  }
  if (
    (record.status === "verified" &&
      (typeof record.signer !== "string" ||
        !record.signer ||
        record.signer.length > 256)) ||
    (record.status === "unsigned-candidate" && record.signer !== null)
  ) {
    fail("platform_signature_signer_invalid");
  }
  return Object.freeze({
    scheme,
    status: record.status,
    signer: record.signer as string | null,
  });
}

export function isProductionSynthesisSidecarRuntimeSignature(
  signature: SynthesisSidecarRuntimePlatformSignature,
) {
  return (
    signature.status === "verified" || signature.status === "not-applicable"
  );
}

export function isExpiredSynthesisSidecarRuntimeManifest(
  manifest: SynthesisSidecarRuntimeBundleManifest,
  nowMs = Date.now(),
) {
  return manifest.expiresAt !== null && Date.parse(manifest.expiresAt) <= nowMs;
}

export function rebuildSynthesisSidecarRuntimeBundleManifest(
  value: unknown,
): SynthesisSidecarRuntimeBundleManifest {
  const record = strictRecord(
    value,
    [
      "schema",
      "bundleId",
      "implementation",
      "serviceVersion",
      "protocolVersion",
      "target",
      "targetTriple",
      "executable",
      "buildFingerprint",
      "capabilities",
      "createdAt",
      "expiresAt",
      "provenance",
      "files",
    ],
    "manifest",
  );
  if (
    record.schema !== SYNTHESIS_SIDECAR_RUNTIME_BUNDLE_SCHEMA ||
    record.implementation !== SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION
  ) {
    fail("schema_or_implementation_invalid");
  }
  if (record.protocolVersion !== "synthesis-sidecar.v1") {
    fail("protocol_version_invalid");
  }
  const target = rebuildTarget(record.target);
  const targetTriple = SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target];
  if (record.targetTriple !== targetTriple) {
    fail("target_triple_invalid");
  }
  const createdAt = rebuildTimestamp(record.createdAt, "created_at_invalid");
  const expiresAt =
    record.expiresAt === null
      ? null
      : rebuildTimestamp(record.expiresAt, "expires_at_invalid");
  if (expiresAt !== null && Date.parse(expiresAt) <= Date.parse(createdAt)) {
    fail("expiry_order_invalid");
  }
  const provenanceRecord = strictRecord(
    record.provenance,
    ["sourceFingerprint", "toolchain", "cargoLockSha256", "licenseInventory"],
    "provenance",
  );
  const provenance = Object.freeze({
    sourceFingerprint: strictSha256(
      provenanceRecord.sourceFingerprint,
      "source_fingerprint_invalid",
    ),
    toolchain: strictString(
      provenanceRecord.toolchain,
      "toolchain_invalid",
      VERSION_PATTERN,
    ),
    cargoLockSha256: strictSha256(
      provenanceRecord.cargoLockSha256,
      "cargo_lock_sha256_invalid",
    ),
    licenseInventory: rebuildRelativeFilePath(
      provenanceRecord.licenseInventory,
      "license_inventory_invalid",
    ),
  });
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
  const expectedExecutable =
    target === "win32-x64" ? "synthesis-sidecar.exe" : "synthesis-sidecar";
  const executableEntry = files.find((file) => file.path === executable);
  if (
    executable !== expectedExecutable ||
    !executableEntry?.executable ||
    files.some((file) => file.executable && file.path !== executable)
  ) {
    fail("executable_target_mismatch");
  }
  if (!files.some((file) => file.path === provenance.licenseInventory)) {
    fail("license_inventory_missing");
  }
  if (!files.some((file) => /^LICENSE(?:[-_.].*)?$/i.test(file.path))) {
    fail("product_license_missing");
  }
  return Object.freeze({
    schema: SYNTHESIS_SIDECAR_RUNTIME_BUNDLE_SCHEMA,
    bundleId: strictSha256(record.bundleId, "bundle_id_invalid"),
    implementation: SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION,
    serviceVersion: strictString(
      record.serviceVersion,
      "service_version_invalid",
      VERSION_PATTERN,
    ),
    protocolVersion: "synthesis-sidecar.v1",
    target,
    targetTriple,
    executable,
    buildFingerprint: strictSha256(
      record.buildFingerprint,
      "build_fingerprint_invalid",
    ),
    capabilities: rebuildCapabilities(record.capabilities),
    createdAt,
    expiresAt,
    provenance,
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
