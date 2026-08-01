import {
  SynthesisClientError,
  toSynthesisJsonObject,
  type SynthesisJsonObject,
} from "./common.js";
import { SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION } from "./schemaVersion.js";
import {
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_PROTOCOL,
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
import {
  rebuildSynthesisSidecarTraceContext,
  type SynthesisSidecarTraceContext,
} from "./sidecarObservability.js";

export const SYNTHESIS_REVERSE_HOST_CALL_SCHEMA =
  "synthesis-reverse-host-call.v1" as const;
export const SYNTHESIS_REVERSE_HOST_LIMITS = Object.freeze({
  requestHeaderBytes: 16 * 1024,
  requestBodyBytes: 1024 * 1024,
  responseHeaderBytes: 16 * 1024,
  responseBodyBytes: 1024 * 1024,
  callTimeoutMs: 2_000,
  idleTimeoutMs: 1_000,
  deadlineMs: 60_000,
});
export const SYNTHESIS_PRODUCTION_DISCOVERY_SCHEMA =
  "synthesis-sidecar-discovery.v5" as const;

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

export type SynthesisReverseHostCapability =
  (typeof SYNTHESIS_REVERSE_HOST_CAPABILITIES)[number];

export const SYNTHESIS_REVERSE_HOST_CAPABILITY_POLICIES = Object.freeze({
  "library.artifacts.scan_page": Object.freeze({
    responseBodyBytes: SYNTHESIS_REVERSE_HOST_LIMITS.responseBodyBytes,
    callTimeoutMs: 10_000,
  }),
  "library.artifacts.read": Object.freeze({
    responseBodyBytes: 8 * 1024 * 1024,
    callTimeoutMs: 10_000,
  }),
});

export function synthesisReverseHostResponseBodyLimit(
  capability: string | undefined,
) {
  const policy =
    capability === "library.artifacts.scan_page" ||
    capability === "library.artifacts.read"
      ? SYNTHESIS_REVERSE_HOST_CAPABILITY_POLICIES[capability]
      : undefined;
  return (
    policy?.responseBodyBytes ?? SYNTHESIS_REVERSE_HOST_LIMITS.responseBodyBytes
  );
}

export function synthesisReverseHostCallTimeoutMs(capability: string) {
  const policy =
    capability === "library.artifacts.scan_page" ||
    capability === "library.artifacts.read"
      ? SYNTHESIS_REVERSE_HOST_CAPABILITY_POLICIES[capability]
      : undefined;
  return policy?.callTimeoutMs ?? SYNTHESIS_REVERSE_HOST_LIMITS.callTimeoutMs;
}

export type SynthesisReverseHostCall = {
  schema: typeof SYNTHESIS_REVERSE_HOST_CALL_SCHEMA;
  requestId: string;
  profileId: string;
  serviceInstanceId: string;
  operationId: string;
  correlationId?: string;
  trace?: SynthesisSidecarTraceContext;
  capability: SynthesisReverseHostCapability;
  deadlineAtMs: number;
  payload: SynthesisJsonObject;
};

export type SynthesisProductionRepositorySnapshot = {
  mode: "production";
  state: "ready" | "stopping";
  schemaVersion: typeof SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION;
  repositoryId: string;
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

export type SynthesisProductionDiscovery = {
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

export type SynthesisProductionHealth = SynthesisProductionRuntimeIdentity & {
  status: "ok";
  lifecycleState: SynthesisSidecarLifecycleState;
  repository: SynthesisProductionRepositorySnapshot;
  canonicalStore: SynthesisTopicCanonicalStoreSnapshot;
  computePool: SynthesisSidecarComputePoolSnapshot;
  citationGraphTransfer: SynthesisSidecarTransferSnapshot;
};

export type SynthesisProductionHandshakeResult =
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

function boundedString(value: unknown, location: string, maxLength = 512) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength ||
    Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 0x1f || code === 0x7f;
    })
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

function runtimeTarget(record: Record<string, unknown>, location: string) {
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

function productionSnapshots(
  record: Record<string, unknown>,
  location: string,
) {
  const repository = toSynthesisJsonObject(
    record.repository,
    `${location}.repository`,
  );
  exactFields(
    repository,
    ["mode", "state", "schemaVersion", "repositoryId"],
    `${location}.repository`,
  );
  if (
    repository.mode !== "production" ||
    (repository.state !== "ready" && repository.state !== "stopping") ||
    repository.schemaVersion !== SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION
  ) {
    invalid(`${location}.repository`);
  }
  return {
    repository: {
      mode: "production" as const,
      state: repository.state as "ready" | "stopping",
      schemaVersion: SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION,
      repositoryId: hash(
        repository.repositoryId,
        `${location}.repository.repositoryId`,
      ),
    },
    canonicalStore: rebuildSynthesisTopicCanonicalStoreSnapshot(
      record.canonicalStore,
    ),
    computePool: rebuildSynthesisSidecarComputePoolSnapshot(record.computePool),
    citationGraphTransfer: rebuildSynthesisSidecarTransferSnapshot(
      record.citationGraphTransfer,
    ),
  };
}

export function rebuildSynthesisProductionDiscovery(
  value: unknown,
): SynthesisProductionDiscovery {
  const location = "synthesisProductionDiscovery";
  const record = toSynthesisJsonObject(value, location);
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
    ],
    location,
  );
  if (
    record.schema !== SYNTHESIS_PRODUCTION_DISCOVERY_SCHEMA ||
    record.implementation !== SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION ||
    record.protocolVersion !== SYNTHESIS_SIDECAR_PROTOCOL ||
    record.host !== "127.0.0.1" ||
    record.lifecycleState !== "ready" ||
    record.tokenLocator !== "supervisor-session"
  ) {
    invalid(`${location}.identity`);
  }
  const target = runtimeTarget(record, location);
  return Object.freeze({
    schema: SYNTHESIS_PRODUCTION_DISCOVERY_SCHEMA,
    profileId: hash(record.profileId, `${location}.profileId`),
    supervisorInstanceId: boundedString(
      record.supervisorInstanceId,
      `${location}.supervisorInstanceId`,
      128,
    ),
    serviceInstanceId: boundedString(
      record.serviceInstanceId,
      `${location}.serviceInstanceId`,
      128,
    ),
    bundleId: hash(record.bundleId, `${location}.bundleId`),
    implementation: SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION,
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
    serviceVersion: boundedString(
      record.serviceVersion,
      `${location}.serviceVersion`,
      128,
    ),
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    schemaVersion: boundedString(
      record.schemaVersion,
      `${location}.schemaVersion`,
      128,
    ),
    runtimeRootId: hash(record.runtimeRootId, `${location}.runtimeRootId`),
    dataRootId: hash(record.dataRootId, `${location}.dataRootId`),
    host: "127.0.0.1",
    port: safeInteger(record.port, `${location}.port`, 1, 65_535),
    pid: safeInteger(record.pid, `${location}.pid`, 2),
    lifecycleState: "ready",
    tokenLocator: "supervisor-session",
    capabilities: orderedOperationalCapabilities(
      record.capabilities,
      `${location}.capabilities`,
    ),
  });
}

export function rebuildSynthesisProductionHealth(
  value: unknown,
): SynthesisProductionHealth {
  const location = "synthesisProductionHealth";
  const record = toSynthesisJsonObject(value, location);
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
    ],
    location,
  );
  if (
    record.status !== "ok" ||
    !["starting", "ready", "stopping"].includes(String(record.lifecycleState))
  ) {
    invalid(`${location}.state`);
  }
  return Object.freeze({
    status: "ok",
    ...productionRuntimeIdentity(record, location),
    lifecycleState: record.lifecycleState as SynthesisSidecarLifecycleState,
    ...productionSnapshots(record, location),
  });
}

export function rebuildSynthesisProductionHandshakeResult(
  value: unknown,
): SynthesisProductionHandshakeResult {
  const location = "synthesisProductionHandshake";
  const record = toSynthesisJsonObject(value, location);
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
      "lifecycleState",
      "repository",
      "canonicalStore",
      "computePool",
      "citationGraphTransfer",
    ],
    location,
  );
  const snapshots = productionSnapshots(record, location);
  if (
    record.lifecycleState !== "ready" ||
    snapshots.repository.state !== "ready" ||
    snapshots.canonicalStore.state !== "ready"
  ) {
    invalid(`${location}.state`);
  }
  return Object.freeze({
    ...productionRuntimeIdentity(record, location),
    profileId: hash(record.profileId, `${location}.profileId`),
    schemaVersion: boundedString(
      record.schemaVersion,
      `${location}.schemaVersion`,
      128,
    ),
    runtimeRootId: hash(record.runtimeRootId, `${location}.runtimeRootId`),
    dataRootId: hash(record.dataRootId, `${location}.dataRootId`),
    capabilities: orderedOperationalCapabilities(
      record.capabilities,
      `${location}.capabilities`,
    ),
    lifecycleState: "ready",
    ...snapshots,
  });
}

export function rebuildSynthesisReverseHostCall(
  value: unknown,
): SynthesisReverseHostCall {
  const location = "synthesisReverseHostCall";
  const record = toSynthesisJsonObject(value, location);
  exactFields(
    record,
    [
      "schema",
      "requestId",
      "profileId",
      "serviceInstanceId",
      "operationId",
      ...(record.correlationId === undefined ? [] : ["correlationId"]),
      ...(record.trace === undefined ? [] : ["trace"]),
      "capability",
      "deadlineAtMs",
      "payload",
    ],
    location,
  );
  if (
    record.schema !== SYNTHESIS_REVERSE_HOST_CALL_SCHEMA ||
    !SYNTHESIS_REVERSE_HOST_CAPABILITIES.includes(
      record.capability as SynthesisReverseHostCapability,
    )
  ) {
    invalid(`${location}.identity`);
  }
  return Object.freeze({
    schema: SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
    requestId: boundedString(record.requestId, `${location}.requestId`, 512),
    profileId: hash(record.profileId, `${location}.profileId`),
    serviceInstanceId: boundedString(
      record.serviceInstanceId,
      `${location}.serviceInstanceId`,
      128,
    ),
    operationId: boundedString(
      record.operationId,
      `${location}.operationId`,
      512,
    ),
    ...(record.correlationId === undefined
      ? {}
      : {
          correlationId: boundedString(
            record.correlationId,
            `${location}.correlationId`,
            512,
          ),
        }),
    ...(record.trace === undefined
      ? {}
      : { trace: rebuildSynthesisSidecarTraceContext(record.trace) }),
    capability: record.capability as SynthesisReverseHostCapability,
    deadlineAtMs: safeInteger(
      record.deadlineAtMs,
      `${location}.deadlineAtMs`,
      0,
    ),
    payload: toSynthesisJsonObject(record.payload, `${location}.payload`),
  });
}
