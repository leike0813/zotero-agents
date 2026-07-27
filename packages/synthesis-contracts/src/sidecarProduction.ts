import {
  SynthesisClientError,
  toSynthesisJsonObject,
  type SynthesisJsonObject,
} from "./common.js";
import { SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION } from "./schemaVersion.js";
import {
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
  SYNTHESIS_SIDECAR_PROTOCOL,
  SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
  rebuildSynthesisSidecarComputePoolSnapshot,
  rebuildSynthesisTopicCanonicalStoreSnapshot,
  type SynthesisSidecarCapability,
  type SynthesisSidecarComputePoolSnapshot,
  type SynthesisSidecarLifecycleState,
  type SynthesisTopicCanonicalStoreSnapshot,
} from "./sidecarSystem.js";
import {
  SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION,
  SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES,
  rebuildSynthesisSidecarRuntimePlatformSignature,
  type SynthesisSidecarRuntimePlatformSignature,
  type SynthesisSidecarRuntimeTarget,
  type SynthesisSidecarRuntimeTargetTriple,
} from "./sidecarRuntimeBundle.js";
import {
  rebuildSynthesisSidecarTransferSnapshot,
  type SynthesisSidecarTransferSnapshot,
} from "./sidecarTransfer.js";

export const SYNTHESIS_CUTOVER_RECEIPT_SCHEMA =
  "synthesis-production-cutover-receipt.v1" as const;
export const SYNTHESIS_REVERSE_HOST_CALL_SCHEMA =
  "synthesis-reverse-host-call.v1" as const;
export const SYNTHESIS_PRODUCTION_ADMISSION_SCHEMA =
  "synthesis-production-admission.v1" as const;
export const SYNTHESIS_PRODUCTION_DISCOVERY_SCHEMA =
  "synthesis-sidecar-discovery.v3" as const;
export const SYNTHESIS_PRODUCTION_ACTIVATION_SCHEMA =
  "synthesis-native-activation.v1" as const;

export const SYNTHESIS_CUTOVER_PHASES = [
  "legacy",
  "maintenance",
  "backup_verified",
  "preflight_verified",
  "native_owner",
  "mutation_enabled",
] as const;

export const SYNTHESIS_REVERSE_HOST_CAPABILITIES = [
  "library.items.list_page",
  "library.items.get_by_ref",
  "library.artifacts.scan_page",
  "library.artifacts.read",
  "library.representative_image.read",
  "delivery.export.publish_archive",
  "webdav.describe",
  "webdav.read_text",
  "webdav.write_text",
  "webdav.ensure_collection",
  "effects.related_items.apply_batch",
  "effects.tags.apply_batch",
  "effects.staged_tag_binding.resolve",
] as const;

export type SynthesisCutoverPhase =
  (typeof SYNTHESIS_CUTOVER_PHASES)[number];
export type SynthesisReverseHostCapability =
  (typeof SYNTHESIS_REVERSE_HOST_CAPABILITIES)[number];

export type SynthesisCutoverReceipt = {
  schema: typeof SYNTHESIS_CUTOVER_RECEIPT_SCHEMA;
  receiptId: string;
  profileId: string;
  phase: SynthesisCutoverPhase;
  sourceOwner: "legacy-plugin";
  targetOwner: "rust-native";
  backupId: string;
  sourceSchemaVersion: string;
  targetSchemaVersion: string;
  canonicalManifestSha256: string;
  durableSummarySha256: string;
  bundleFingerprint: string;
  capabilityFingerprint: string;
  serviceInstanceId: string | null;
  mutationEnabled: boolean;
  updatedAtMs: number;
};

export type SynthesisReverseHostCall = {
  schema: typeof SYNTHESIS_REVERSE_HOST_CALL_SCHEMA;
  requestId: string;
  profileId: string;
  serviceInstanceId: string;
  operationId: string;
  capability: SynthesisReverseHostCapability;
  deadlineAtMs: number;
  payload: SynthesisJsonObject;
};

export type SynthesisProductionAdmission = {
  schema: typeof SYNTHESIS_PRODUCTION_ADMISSION_SCHEMA;
  purpose: "preflight_copy" | "live_owner";
  profileId: string;
  supervisorInstanceId: string;
  cutoverReceiptId: string;
  cutoverReceiptPath: string;
  capabilityFingerprint: string;
  repositoryDbPath: string;
  canonicalRoot: string;
  reverseHost: {
    host: "127.0.0.1";
    port: number;
    authorizationToken: string;
  };
  mutationEnabled: false;
};

export type SynthesisProductionActivationEvidence = {
  receiptId: string;
  profileId: string;
  serviceInstanceId: string;
  supervisorInstanceId: string;
  capabilityFingerprint: typeof SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT;
  readyClientCapabilities: typeof SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES;
  smokeRosterVersion: string;
  smokeCheckIds: string[];
  smokeCheckDigests: string[];
  smokeEvidenceDigest: string;
  issuedAtMs: number;
};

export type SynthesisProductionRepositorySnapshot = {
  mode: "production";
  state: "ready" | "stopping";
  schemaVersion: typeof SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION;
  repositoryId: string;
};

type SynthesisProductionAuthority = {
  ownerMode: "production";
  mutationEnabled: boolean;
  capabilityFingerprint: typeof SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT;
  cutoverReceiptId: string;
  readyClientCapabilities: typeof SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES;
};

type SynthesisProductionRuntimeIdentity = {
  implementation: typeof SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION;
  protocol: typeof SYNTHESIS_SIDECAR_PROTOCOL;
  serviceVersion: string;
  serviceInstanceId: string;
  supervisorInstanceId: string;
  bundleId: string;
  target: SynthesisSidecarRuntimeTarget;
  targetTriple: SynthesisSidecarRuntimeTargetTriple;
  buildFingerprint: string;
  platformSignature: SynthesisSidecarRuntimePlatformSignature;
};

export type SynthesisProductionDiscovery = SynthesisProductionAuthority & {
  schema: typeof SYNTHESIS_PRODUCTION_DISCOVERY_SCHEMA;
  profileId: string;
  supervisorInstanceId: string;
  serviceInstanceId: string;
  bundleId: string;
  implementation: typeof SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION;
  target: SynthesisSidecarRuntimeTarget;
  targetTriple: SynthesisSidecarRuntimeTargetTriple;
  buildFingerprint: string;
  platformSignature: SynthesisSidecarRuntimePlatformSignature;
  serviceVersion: string;
  protocolVersion: typeof SYNTHESIS_SIDECAR_PROTOCOL;
  schemaVersion: string;
  runtimeRootId: string;
  dataRootId: string;
  host: "127.0.0.1";
  port: number;
  pid: number;
  lifecycleState: "ready";
  tokenLocator: "supervisor-session";
  capabilities: SynthesisSidecarCapability[];
};

export type SynthesisProductionHealth = SynthesisProductionAuthority &
  SynthesisProductionRuntimeIdentity & {
    status: "ok";
    lifecycleState: SynthesisSidecarLifecycleState;
    repository: SynthesisProductionRepositorySnapshot;
    canonicalStore: SynthesisTopicCanonicalStoreSnapshot;
    computePool: SynthesisSidecarComputePoolSnapshot;
    citationGraphTransfer: SynthesisSidecarTransferSnapshot;
  };

export type SynthesisProductionHandshakeResult =
  SynthesisProductionAuthority &
    SynthesisProductionRuntimeIdentity & {
      profileId: string;
      schemaVersion: string;
      runtimeRootId: string;
      dataRootId: string;
      capabilities: SynthesisSidecarCapability[];
      lifecycleState: "ready";
      repository: SynthesisProductionRepositorySnapshot;
      canonicalStore: SynthesisTopicCanonicalStoreSnapshot;
      computePool: SynthesisSidecarComputePoolSnapshot;
      citationGraphTransfer: SynthesisSidecarTransferSnapshot;
    };

function invalid(location: string): never {
  throw new SynthesisClientError("invalid_request", `${location} is invalid`, {
    location,
  });
}

function exactFields(
  record: Record<string, unknown>,
  expected: readonly string[],
  location: string,
) {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((field, index) => field !== wanted[index])
  ) {
    invalid(`${location}.fields`);
  }
}

function boundedString(
  value: unknown,
  location: string,
  maxLength = 512,
) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    invalid(location);
  }
  return value;
}

function hash(value: unknown, location: string) {
  const result = boundedString(value, location, 64);
  if (!/^[a-f0-9]{64}$/.test(result)) {
    invalid(location);
  }
  return result;
}

function safeTimestamp(value: unknown, location: string) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    invalid(location);
  }
  return value;
}

function safeInteger(
  value: unknown,
  location: string,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    invalid(location);
  }
  return value;
}

function orderedOperationalCapabilities(value: unknown, location: string) {
  if (
    !Array.isArray(value) ||
    value.length !== SYNTHESIS_SIDECAR_CAPABILITIES.length ||
    !SYNTHESIS_SIDECAR_CAPABILITIES.every(
      (capability, index) => value[index] === capability,
    )
  ) {
    invalid(location);
  }
  return [...SYNTHESIS_SIDECAR_CAPABILITIES];
}

function productionAuthority(
  record: Record<string, unknown>,
  location: string,
): SynthesisProductionAuthority {
  if (
    record.ownerMode !== "production" ||
    typeof record.mutationEnabled !== "boolean" ||
    record.capabilityFingerprint !==
      SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT
  ) {
    invalid(`${location}.authority`);
  }
  return {
    ownerMode: "production",
    mutationEnabled: record.mutationEnabled,
    capabilityFingerprint:
      SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
    cutoverReceiptId: boundedString(
      record.cutoverReceiptId,
      `${location}.cutoverReceiptId`,
      128,
    ),
    readyClientCapabilities: orderedReadyClientCapabilities(
      record.readyClientCapabilities,
      `${location}.readyClientCapabilities`,
    ),
  };
}

function orderedReadyClientCapabilities(
  value: unknown,
  location: string,
) {
  if (
    !Array.isArray(value) ||
    value.length !==
      SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES.length ||
    !SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES.every(
      (capability, index) => value[index] === capability,
    )
  ) {
    invalid(location);
  }
  return SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES;
}

function runtimeTarget(
  record: Record<string, unknown>,
  location: string,
) {
  const target = boundedString(
    record.target,
    `${location}.target`,
    32,
  ) as SynthesisSidecarRuntimeTarget;
  if (
    !(target in SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES) ||
    record.targetTriple !== SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target]
  ) {
    invalid(`${location}.target`);
  }
  return target;
}

function productionRuntimeIdentity(
  record: Record<string, unknown>,
  location: string,
): SynthesisProductionRuntimeIdentity {
  if (
    record.implementation !== SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION ||
    record.protocol !== SYNTHESIS_SIDECAR_PROTOCOL
  ) {
    invalid(`${location}.identity`);
  }
  const target = runtimeTarget(record, location);
  return {
    implementation: SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION,
    protocol: SYNTHESIS_SIDECAR_PROTOCOL,
    serviceVersion: boundedString(
      record.serviceVersion,
      `${location}.serviceVersion`,
      128,
    ),
    serviceInstanceId: boundedString(
      record.serviceInstanceId,
      `${location}.serviceInstanceId`,
      128,
    ),
    supervisorInstanceId: boundedString(
      record.supervisorInstanceId,
      `${location}.supervisorInstanceId`,
      128,
    ),
    bundleId: hash(record.bundleId, `${location}.bundleId`),
    target,
    targetTriple: SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target],
    buildFingerprint: hash(
      record.buildFingerprint,
      `${location}.buildFingerprint`,
    ),
    platformSignature: rebuildSynthesisSidecarRuntimePlatformSignature(
      record.platformSignature,
      target,
    ),
  };
}

function rebuildSynthesisProductionRepositorySnapshot(
  value: unknown,
): SynthesisProductionRepositorySnapshot {
  const record = toSynthesisJsonObject(
    value,
    "synthesisProductionRepositorySnapshot",
  );
  exactFields(
    record,
    ["mode", "state", "schemaVersion", "repositoryId"],
    "synthesisProductionRepositorySnapshot",
  );
  if (
    record.mode !== "production" ||
    (record.state !== "ready" && record.state !== "stopping") ||
    record.schemaVersion !== SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION
  ) {
    invalid("synthesisProductionRepositorySnapshot.identity");
  }
  return {
    mode: "production",
    state: record.state,
    schemaVersion: SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION,
    repositoryId: hash(
      record.repositoryId,
      "synthesisProductionRepositorySnapshot.repositoryId",
    ),
  };
}

function productionRuntimeSnapshots(
  record: Record<string, unknown>,
  location: string,
) {
  return {
    repository: rebuildSynthesisProductionRepositorySnapshot(
      record.repository,
    ),
    canonicalStore: rebuildSynthesisTopicCanonicalStoreSnapshot(
      record.canonicalStore,
    ),
    computePool: rebuildSynthesisSidecarComputePoolSnapshot(
      record.computePool,
    ),
    citationGraphTransfer: rebuildSynthesisSidecarTransferSnapshot(
      record.citationGraphTransfer,
    ),
  };
}

function absoluteProductionPath(
  value: unknown,
  location: string,
  suffix: string,
) {
  const path = boundedString(value, location, 4096);
  const normalized = path.replaceAll("\\", "/");
  const absolute =
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.startsWith("//");
  if (
    !absolute ||
    normalized.split("/").includes("..") ||
    !normalized.endsWith(suffix)
  ) {
    invalid(location);
  }
  return path;
}

export function rebuildSynthesisProductionDiscovery(
  value: unknown,
): SynthesisProductionDiscovery {
  const record = toSynthesisJsonObject(value, "synthesisProductionDiscovery");
  exactFields(
    record,
    [
      "schema",
      "profileId",
      "supervisorInstanceId",
      "serviceInstanceId",
      "bundleId",
      "implementation",
      "target",
      "targetTriple",
      "buildFingerprint",
      "platformSignature",
      "serviceVersion",
      "protocolVersion",
      "schemaVersion",
      "runtimeRootId",
      "dataRootId",
      "host",
      "port",
      "pid",
      "lifecycleState",
      "tokenLocator",
      "capabilities",
      "ownerMode",
      "mutationEnabled",
      "capabilityFingerprint",
      "cutoverReceiptId",
      "readyClientCapabilities",
    ],
    "synthesisProductionDiscovery",
  );
  if (
    record.schema !== SYNTHESIS_PRODUCTION_DISCOVERY_SCHEMA ||
    record.implementation !== SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION ||
    record.protocolVersion !== SYNTHESIS_SIDECAR_PROTOCOL ||
    record.host !== "127.0.0.1" ||
    record.lifecycleState !== "ready" ||
    record.tokenLocator !== "supervisor-session"
  ) {
    invalid("synthesisProductionDiscovery.identity");
  }
  const target = runtimeTarget(record, "synthesisProductionDiscovery");
  return Object.freeze({
    schema: SYNTHESIS_PRODUCTION_DISCOVERY_SCHEMA,
    profileId: hash(
      record.profileId,
      "synthesisProductionDiscovery.profileId",
    ),
    supervisorInstanceId: boundedString(
      record.supervisorInstanceId,
      "synthesisProductionDiscovery.supervisorInstanceId",
      128,
    ),
    serviceInstanceId: boundedString(
      record.serviceInstanceId,
      "synthesisProductionDiscovery.serviceInstanceId",
      128,
    ),
    bundleId: hash(record.bundleId, "synthesisProductionDiscovery.bundleId"),
    implementation: SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION,
    target,
    targetTriple: SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target],
    buildFingerprint: hash(
      record.buildFingerprint,
      "synthesisProductionDiscovery.buildFingerprint",
    ),
    platformSignature: rebuildSynthesisSidecarRuntimePlatformSignature(
      record.platformSignature,
      target,
    ),
    serviceVersion: boundedString(
      record.serviceVersion,
      "synthesisProductionDiscovery.serviceVersion",
      128,
    ),
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    schemaVersion: boundedString(
      record.schemaVersion,
      "synthesisProductionDiscovery.schemaVersion",
      128,
    ),
    runtimeRootId: hash(
      record.runtimeRootId,
      "synthesisProductionDiscovery.runtimeRootId",
    ),
    dataRootId: hash(
      record.dataRootId,
      "synthesisProductionDiscovery.dataRootId",
    ),
    host: "127.0.0.1",
    port: safeInteger(
      record.port,
      "synthesisProductionDiscovery.port",
      1,
      65_535,
    ),
    pid: safeInteger(record.pid, "synthesisProductionDiscovery.pid", 2),
    lifecycleState: "ready",
    tokenLocator: "supervisor-session",
    capabilities: orderedOperationalCapabilities(
      record.capabilities,
      "synthesisProductionDiscovery.capabilities",
    ),
    ...productionAuthority(record, "synthesisProductionDiscovery"),
  });
}

export function rebuildSynthesisProductionHealth(
  value: unknown,
): SynthesisProductionHealth {
  const record = toSynthesisJsonObject(value, "synthesisProductionHealth");
  exactFields(
    record,
    [
      "status",
      "implementation",
      "protocol",
      "serviceVersion",
      "serviceInstanceId",
      "supervisorInstanceId",
      "bundleId",
      "target",
      "targetTriple",
      "buildFingerprint",
      "platformSignature",
      "lifecycleState",
      "repository",
      "canonicalStore",
      "computePool",
      "citationGraphTransfer",
      "ownerMode",
      "mutationEnabled",
      "capabilityFingerprint",
      "cutoverReceiptId",
      "readyClientCapabilities",
    ],
    "synthesisProductionHealth",
  );
  if (
    record.status !== "ok" ||
    (record.lifecycleState !== "starting" &&
      record.lifecycleState !== "ready" &&
      record.lifecycleState !== "stopping")
  ) {
    invalid("synthesisProductionHealth.state");
  }
  return Object.freeze({
    status: "ok",
    ...productionRuntimeIdentity(record, "synthesisProductionHealth"),
    lifecycleState: record.lifecycleState,
    ...productionRuntimeSnapshots(record, "synthesisProductionHealth"),
    ...productionAuthority(record, "synthesisProductionHealth"),
  });
}

export function rebuildSynthesisProductionHandshakeResult(
  value: unknown,
): SynthesisProductionHandshakeResult {
  const record = toSynthesisJsonObject(
    value,
    "synthesisProductionHandshake",
  );
  exactFields(
    record,
    [
      "implementation",
      "protocol",
      "serviceVersion",
      "serviceInstanceId",
      "supervisorInstanceId",
      "bundleId",
      "target",
      "targetTriple",
      "buildFingerprint",
      "platformSignature",
      "profileId",
      "schemaVersion",
      "runtimeRootId",
      "dataRootId",
      "capabilities",
      "mutationEnabled",
      "lifecycleState",
      "repository",
      "canonicalStore",
      "computePool",
      "citationGraphTransfer",
      "ownerMode",
      "capabilityFingerprint",
      "cutoverReceiptId",
      "readyClientCapabilities",
    ],
    "synthesisProductionHandshake",
  );
  if (record.lifecycleState !== "ready") {
    invalid("synthesisProductionHandshake.state");
  }
  const snapshots = productionRuntimeSnapshots(
    record,
    "synthesisProductionHandshake",
  );
  if (
    snapshots.repository.state !== "ready" ||
    snapshots.canonicalStore.state !== "ready"
  ) {
    invalid("synthesisProductionHandshake.storage");
  }
  return Object.freeze({
    ...productionRuntimeIdentity(record, "synthesisProductionHandshake"),
    profileId: hash(
      record.profileId,
      "synthesisProductionHandshake.profileId",
    ),
    schemaVersion: boundedString(
      record.schemaVersion,
      "synthesisProductionHandshake.schemaVersion",
      128,
    ),
    runtimeRootId: hash(
      record.runtimeRootId,
      "synthesisProductionHandshake.runtimeRootId",
    ),
    dataRootId: hash(
      record.dataRootId,
      "synthesisProductionHandshake.dataRootId",
    ),
    capabilities: orderedOperationalCapabilities(
      record.capabilities,
      "synthesisProductionHandshake.capabilities",
    ),
    lifecycleState: "ready",
    ...snapshots,
    ...productionAuthority(record, "synthesisProductionHandshake"),
  });
}

export function rebuildSynthesisProductionAdmission(
  value: unknown,
): SynthesisProductionAdmission {
  const record = toSynthesisJsonObject(value, "synthesisProductionAdmission");
  exactFields(
    record,
    [
      "schema",
      "purpose",
      "profileId",
      "supervisorInstanceId",
      "cutoverReceiptId",
      "cutoverReceiptPath",
      "capabilityFingerprint",
      "repositoryDbPath",
      "canonicalRoot",
      "reverseHost",
      "mutationEnabled",
    ],
    "synthesisProductionAdmission",
  );
  if (
    record.schema !== SYNTHESIS_PRODUCTION_ADMISSION_SCHEMA ||
    (record.purpose !== "preflight_copy" &&
      record.purpose !== "live_owner") ||
    record.mutationEnabled !== false
  ) {
    invalid("synthesisProductionAdmission.identity");
  }
  const reverseHost = toSynthesisJsonObject(
    record.reverseHost,
    "synthesisProductionAdmission.reverseHost",
  );
  exactFields(
    reverseHost,
    ["host", "port", "authorizationToken"],
    "synthesisProductionAdmission.reverseHost",
  );
  if (
    reverseHost.host !== "127.0.0.1" ||
    typeof reverseHost.port !== "number" ||
    !Number.isSafeInteger(reverseHost.port) ||
    reverseHost.port < 1 ||
    reverseHost.port > 65_535
  ) {
    invalid("synthesisProductionAdmission.reverseHost.locator");
  }
  const authorizationToken = boundedString(
    reverseHost.authorizationToken,
    "synthesisProductionAdmission.reverseHost.authorizationToken",
    256,
  );
  if (authorizationToken.length < 32) {
    invalid("synthesisProductionAdmission.reverseHost.authorizationToken");
  }
  return Object.freeze({
    schema: SYNTHESIS_PRODUCTION_ADMISSION_SCHEMA,
    purpose: record.purpose,
    profileId: hash(
      record.profileId,
      "synthesisProductionAdmission.profileId",
    ),
    supervisorInstanceId: boundedString(
      record.supervisorInstanceId,
      "synthesisProductionAdmission.supervisorInstanceId",
      128,
    ),
    cutoverReceiptId: boundedString(
      record.cutoverReceiptId,
      "synthesisProductionAdmission.cutoverReceiptId",
      128,
    ),
    cutoverReceiptPath: absoluteProductionPath(
      record.cutoverReceiptPath,
      "synthesisProductionAdmission.cutoverReceiptPath",
      "/state/synthesis-cutover/receipt.json",
    ),
    capabilityFingerprint: hash(
      record.capabilityFingerprint,
      "synthesisProductionAdmission.capabilityFingerprint",
    ),
    repositoryDbPath: absoluteProductionPath(
      record.repositoryDbPath,
      "synthesisProductionAdmission.repositoryDbPath",
      "/state/synthesis.db",
    ),
    canonicalRoot: absoluteProductionPath(
      record.canonicalRoot,
      "synthesisProductionAdmission.canonicalRoot",
      "/data/synthesis",
    ),
    reverseHost: Object.freeze({
      host: "127.0.0.1",
      port: reverseHost.port,
      authorizationToken,
    }),
    mutationEnabled: false,
  });
}

export function rebuildSynthesisCutoverReceipt(
  value: unknown,
): SynthesisCutoverReceipt {
  const record = toSynthesisJsonObject(value, "synthesisCutoverReceipt");
  exactFields(
    record,
    [
      "schema",
      "receiptId",
      "profileId",
      "phase",
      "sourceOwner",
      "targetOwner",
      "backupId",
      "sourceSchemaVersion",
      "targetSchemaVersion",
      "canonicalManifestSha256",
      "durableSummarySha256",
      "bundleFingerprint",
      "capabilityFingerprint",
      "serviceInstanceId",
      "mutationEnabled",
      "updatedAtMs",
    ],
    "synthesisCutoverReceipt",
  );
  if (
    record.schema !== SYNTHESIS_CUTOVER_RECEIPT_SCHEMA ||
    record.sourceOwner !== "legacy-plugin" ||
    record.targetOwner !== "rust-native" ||
    !SYNTHESIS_CUTOVER_PHASES.includes(record.phase as SynthesisCutoverPhase) ||
    typeof record.mutationEnabled !== "boolean"
  ) {
    invalid("synthesisCutoverReceipt.identity");
  }
  const phase = record.phase as SynthesisCutoverPhase;
  if (
    record.mutationEnabled !== (phase === "mutation_enabled") ||
    ((phase === "native_owner" || phase === "mutation_enabled") &&
      typeof record.serviceInstanceId !== "string") ||
    (phase !== "native_owner" &&
      phase !== "mutation_enabled" &&
      record.serviceInstanceId !== null)
  ) {
    invalid("synthesisCutoverReceipt.admission");
  }
  return Object.freeze({
    schema: SYNTHESIS_CUTOVER_RECEIPT_SCHEMA,
    receiptId: boundedString(
      record.receiptId,
      "synthesisCutoverReceipt.receiptId",
      128,
    ),
    profileId: hash(record.profileId, "synthesisCutoverReceipt.profileId"),
    phase,
    sourceOwner: "legacy-plugin",
    targetOwner: "rust-native",
    backupId: hash(record.backupId, "synthesisCutoverReceipt.backupId"),
    sourceSchemaVersion: boundedString(
      record.sourceSchemaVersion,
      "synthesisCutoverReceipt.sourceSchemaVersion",
      128,
    ),
    targetSchemaVersion: boundedString(
      record.targetSchemaVersion,
      "synthesisCutoverReceipt.targetSchemaVersion",
      128,
    ),
    canonicalManifestSha256: hash(
      record.canonicalManifestSha256,
      "synthesisCutoverReceipt.canonicalManifestSha256",
    ),
    durableSummarySha256: hash(
      record.durableSummarySha256,
      "synthesisCutoverReceipt.durableSummarySha256",
    ),
    bundleFingerprint: hash(
      record.bundleFingerprint,
      "synthesisCutoverReceipt.bundleFingerprint",
    ),
    capabilityFingerprint: hash(
      record.capabilityFingerprint,
      "synthesisCutoverReceipt.capabilityFingerprint",
    ),
    serviceInstanceId:
      record.serviceInstanceId === null
        ? null
        : boundedString(
            record.serviceInstanceId,
            "synthesisCutoverReceipt.serviceInstanceId",
            128,
          ),
    mutationEnabled: record.mutationEnabled,
    updatedAtMs: safeTimestamp(
      record.updatedAtMs,
      "synthesisCutoverReceipt.updatedAtMs",
    ),
  });
}

export function rebuildSynthesisReverseHostCall(
  value: unknown,
): SynthesisReverseHostCall {
  const record = toSynthesisJsonObject(value, "synthesisReverseHostCall");
  exactFields(
    record,
    [
      "schema",
      "requestId",
      "profileId",
      "serviceInstanceId",
      "operationId",
      "capability",
      "deadlineAtMs",
      "payload",
    ],
    "synthesisReverseHostCall",
  );
  if (
    record.schema !== SYNTHESIS_REVERSE_HOST_CALL_SCHEMA ||
    !SYNTHESIS_REVERSE_HOST_CAPABILITIES.includes(
      record.capability as SynthesisReverseHostCapability,
    )
  ) {
    invalid("synthesisReverseHostCall.identity");
  }
  const payload = toSynthesisJsonObject(
    record.payload,
    "synthesisReverseHostCall.payload",
  );
  if (JSON.stringify(payload).length > 1024 * 1024) {
    invalid("synthesisReverseHostCall.payload");
  }
  return Object.freeze({
    schema: SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
    requestId: boundedString(
      record.requestId,
      "synthesisReverseHostCall.requestId",
      512,
    ),
    profileId: hash(record.profileId, "synthesisReverseHostCall.profileId"),
    serviceInstanceId: boundedString(
      record.serviceInstanceId,
      "synthesisReverseHostCall.serviceInstanceId",
      128,
    ),
    operationId: boundedString(
      record.operationId,
      "synthesisReverseHostCall.operationId",
      128,
    ),
    capability: record.capability as SynthesisReverseHostCapability,
    deadlineAtMs: safeTimestamp(
      record.deadlineAtMs,
      "synthesisReverseHostCall.deadlineAtMs",
    ),
    payload,
  });
}
