import { SynthesisClientError, toSynthesisJsonObject } from "./common.js";
import {
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_PROTOCOL,
  type SynthesisSidecarCapability,
} from "./sidecarSystem.js";
import {
  SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION,
  SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES,
  rebuildSynthesisSidecarRuntimePlatformSignature,
  type SynthesisSidecarRuntimePlatformSignature,
  type SynthesisSidecarRuntimeTarget,
  type SynthesisSidecarRuntimeTargetTriple,
} from "./sidecarRuntimeBundle.js";

export const SYNTHESIS_SIDECAR_LAUNCH_CONFIG_SCHEMA =
  "synthesis-sidecar-launch-config.v3" as const;
export const SYNTHESIS_SIDECAR_DISCOVERY_SCHEMA =
  "synthesis-sidecar-discovery.v2" as const;

const ID_PATTERN = /^[A-Za-z0-9._:-]+$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

export type SynthesisSidecarLaunchConfig = {
  schema: typeof SYNTHESIS_SIDECAR_LAUNCH_CONFIG_SCHEMA;
  profileId: string;
  profileRuntimeRoot: string;
  runtimeRootId: string;
  dataRootId: string;
  bundleId: string;
  implementation: typeof SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION;
  target: SynthesisSidecarRuntimeTarget;
  targetTriple: SynthesisSidecarRuntimeTargetTriple;
  buildFingerprint: string;
  platformSignature: SynthesisSidecarRuntimePlatformSignature;
  serviceVersion: string;
  protocolVersion: typeof SYNTHESIS_SIDECAR_PROTOCOL;
  schemaVersion: string;
  supervisorInstanceId: string;
  repositoryDbPath: string;
  canonicalRoot: string;
  reverseHost: {
    host: "127.0.0.1";
    port: number;
    authorizationToken: string;
  };
  clientToken: string;
  lifecycleToken: string;
  port: 0;
};

export type SynthesisSidecarDiscovery = {
  schema: typeof SYNTHESIS_SIDECAR_DISCOVERY_SCHEMA;
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

function invalid(location: string): never {
  throw new SynthesisClientError("invalid_request", `${location} is invalid`, {
    location,
  });
}

function exactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
  location: string,
) {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    invalid(`${location}.fields`);
  }
}

function strictString(
  value: unknown,
  location: string,
  options: { max?: number; pattern?: RegExp } = {},
) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > (options.max ?? 512) ||
    (options.pattern && !options.pattern.test(value))
  ) {
    invalid(location);
  }
  return value;
}

function strictId(value: unknown, location: string) {
  return strictString(value, location, {
    max: 128,
    pattern: ID_PATTERN,
  });
}

function strictHash(value: unknown, location: string) {
  return strictString(value, location, {
    max: 64,
    pattern: HASH_PATTERN,
  });
}

function strictAbsolutePath(value: unknown, location: string) {
  const path = strictString(value, location, { max: 4096 });
  const normalized = path.replaceAll("\\", "/");
  if (
    (!normalized.startsWith("/") &&
      !/^[A-Za-z]:\//.test(normalized) &&
      !normalized.startsWith("//")) ||
    normalized.split("/").includes("..")
  ) {
    invalid(location);
  }
  return path;
}

function strictInteger(
  value: unknown,
  location: string,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    invalid(location);
  }
  return value;
}

export function rebuildSynthesisSidecarLaunchConfig(
  value: unknown,
): SynthesisSidecarLaunchConfig {
  const record = toSynthesisJsonObject(value, "sidecarLaunchConfig");
  exactKeys(
    record,
    [
      "schema",
      "profileId",
      "profileRuntimeRoot",
      "runtimeRootId",
      "dataRootId",
      "bundleId",
      "implementation",
      "target",
      "targetTriple",
      "buildFingerprint",
      "platformSignature",
      "serviceVersion",
      "protocolVersion",
      "schemaVersion",
      "supervisorInstanceId",
      "repositoryDbPath",
      "canonicalRoot",
      "reverseHost",
      "clientToken",
      "lifecycleToken",
      "port",
    ],
    "sidecarLaunchConfig",
  );
  if (
    record.schema !== SYNTHESIS_SIDECAR_LAUNCH_CONFIG_SCHEMA ||
    record.implementation !== SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION ||
    record.protocolVersion !== SYNTHESIS_SIDECAR_PROTOCOL ||
    record.port !== 0
  ) {
    invalid("sidecarLaunchConfig.identity");
  }
  const clientToken = strictString(
    record.clientToken,
    "sidecarLaunchConfig.clientToken",
    { max: 256 },
  );
  const lifecycleToken = strictString(
    record.lifecycleToken,
    "sidecarLaunchConfig.lifecycleToken",
    { max: 256 },
  );
  if (
    clientToken.length < 32 ||
    lifecycleToken.length < 32 ||
    clientToken === lifecycleToken
  ) {
    invalid("sidecarLaunchConfig.tokens");
  }
  const reverseHost = toSynthesisJsonObject(
    record.reverseHost,
    "sidecarLaunchConfig.reverseHost",
  );
  exactKeys(
    reverseHost,
    ["host", "port", "authorizationToken"],
    "sidecarLaunchConfig.reverseHost",
  );
  const reverseHostToken = strictString(
    reverseHost.authorizationToken,
    "sidecarLaunchConfig.reverseHost.authorizationToken",
    { max: 256 },
  );
  if (reverseHost.host !== "127.0.0.1" || reverseHostToken.length < 32) {
    invalid("sidecarLaunchConfig.reverseHost");
  }
  const target = strictString(record.target, "sidecarLaunchConfig.target", {
    max: 32,
  }) as SynthesisSidecarRuntimeTarget;
  if (
    !(target in SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES) ||
    record.targetTriple !== SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target]
  ) {
    invalid("sidecarLaunchConfig.target");
  }
  return Object.freeze({
    schema: SYNTHESIS_SIDECAR_LAUNCH_CONFIG_SCHEMA,
    profileId: strictHash(record.profileId, "sidecarLaunchConfig.profileId"),
    profileRuntimeRoot: strictString(
      record.profileRuntimeRoot,
      "sidecarLaunchConfig.profileRuntimeRoot",
      { max: 4096 },
    ),
    runtimeRootId: strictHash(
      record.runtimeRootId,
      "sidecarLaunchConfig.runtimeRootId",
    ),
    dataRootId: strictHash(record.dataRootId, "sidecarLaunchConfig.dataRootId"),
    bundleId: strictHash(record.bundleId, "sidecarLaunchConfig.bundleId"),
    implementation: SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION,
    target,
    targetTriple: SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target],
    buildFingerprint: strictHash(
      record.buildFingerprint,
      "sidecarLaunchConfig.buildFingerprint",
    ),
    platformSignature: rebuildSynthesisSidecarRuntimePlatformSignature(
      record.platformSignature,
      target,
    ),
    serviceVersion: strictString(
      record.serviceVersion,
      "sidecarLaunchConfig.serviceVersion",
      { max: 128 },
    ),
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    schemaVersion: strictString(
      record.schemaVersion,
      "sidecarLaunchConfig.schemaVersion",
      { max: 128 },
    ),
    supervisorInstanceId: strictId(
      record.supervisorInstanceId,
      "sidecarLaunchConfig.supervisorInstanceId",
    ),
    repositoryDbPath: strictAbsolutePath(
      record.repositoryDbPath,
      "sidecarLaunchConfig.repositoryDbPath",
    ),
    canonicalRoot: strictAbsolutePath(
      record.canonicalRoot,
      "sidecarLaunchConfig.canonicalRoot",
    ),
    reverseHost: {
      host: "127.0.0.1" as const,
      port: strictInteger(
        reverseHost.port,
        "sidecarLaunchConfig.reverseHost.port",
        1,
        65_535,
      ),
      authorizationToken: reverseHostToken,
    },
    clientToken,
    lifecycleToken,
    port: 0,
  });
}

export function rebuildSynthesisSidecarDiscovery(
  value: unknown,
): SynthesisSidecarDiscovery {
  const record = toSynthesisJsonObject(value, "sidecarDiscovery");
  exactKeys(
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
    "sidecarDiscovery",
  );
  if (
    record.schema !== SYNTHESIS_SIDECAR_DISCOVERY_SCHEMA ||
    record.implementation !== SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION ||
    record.protocolVersion !== SYNTHESIS_SIDECAR_PROTOCOL ||
    record.host !== "127.0.0.1" ||
    record.lifecycleState !== "ready" ||
    record.tokenLocator !== "supervisor-session"
  ) {
    invalid("sidecarDiscovery.identity");
  }
  const capabilities = record.capabilities;
  if (
    !Array.isArray(capabilities) ||
    capabilities.length !== SYNTHESIS_SIDECAR_CAPABILITIES.length ||
    !SYNTHESIS_SIDECAR_CAPABILITIES.every(
      (capability, index) => capabilities[index] === capability,
    )
  ) {
    invalid("sidecarDiscovery.capabilities");
  }
  const target = strictString(record.target, "sidecarDiscovery.target", {
    max: 32,
  }) as SynthesisSidecarRuntimeTarget;
  if (
    !(target in SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES) ||
    record.targetTriple !== SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target]
  ) {
    invalid("sidecarDiscovery.target");
  }
  return Object.freeze({
    schema: SYNTHESIS_SIDECAR_DISCOVERY_SCHEMA,
    profileId: strictHash(record.profileId, "sidecarDiscovery.profileId"),
    supervisorInstanceId: strictId(
      record.supervisorInstanceId,
      "sidecarDiscovery.supervisorInstanceId",
    ),
    serviceInstanceId: strictId(
      record.serviceInstanceId,
      "sidecarDiscovery.serviceInstanceId",
    ),
    bundleId: strictHash(record.bundleId, "sidecarDiscovery.bundleId"),
    implementation: SYNTHESIS_SIDECAR_RUNTIME_IMPLEMENTATION,
    target,
    targetTriple: SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target],
    buildFingerprint: strictHash(
      record.buildFingerprint,
      "sidecarDiscovery.buildFingerprint",
    ),
    platformSignature: rebuildSynthesisSidecarRuntimePlatformSignature(
      record.platformSignature,
      target,
    ),
    serviceVersion: strictString(
      record.serviceVersion,
      "sidecarDiscovery.serviceVersion",
      { max: 128 },
    ),
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    schemaVersion: strictString(
      record.schemaVersion,
      "sidecarDiscovery.schemaVersion",
      { max: 128 },
    ),
    runtimeRootId: strictHash(
      record.runtimeRootId,
      "sidecarDiscovery.runtimeRootId",
    ),
    dataRootId: strictHash(record.dataRootId, "sidecarDiscovery.dataRootId"),
    host: "127.0.0.1",
    port: strictInteger(record.port, "sidecarDiscovery.port", 1, 65535),
    pid: strictInteger(record.pid, "sidecarDiscovery.pid", 2),
    lifecycleState: "ready",
    tokenLocator: "supervisor-session",
    capabilities: [...SYNTHESIS_SIDECAR_CAPABILITIES],
  });
}
