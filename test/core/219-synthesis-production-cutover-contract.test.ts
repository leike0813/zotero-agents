import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
import {
  SYNTHESIS_CUTOVER_RECEIPT_SCHEMA,
  SYNTHESIS_PRODUCTION_ADMISSION_SCHEMA,
  SYNTHESIS_PRODUCTION_DISCOVERY_SCHEMA,
  SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
  rebuildSynthesisProductionAdmission,
  rebuildSynthesisCutoverReceipt,
  rebuildSynthesisProductionDiscovery,
  rebuildSynthesisProductionHandshakeResult,
  rebuildSynthesisProductionHealth,
  rebuildSynthesisReverseHostCall,
} from "../../packages/synthesis-contracts/src/sidecarProduction";
import { rebuildSynthesisSidecarDiscovery } from "../../packages/synthesis-contracts/src/sidecarLifecycle";
import {
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
  SYNTHESIS_SIDECAR_PROTOCOL,
  SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
} from "../../packages/synthesis-contracts/src/sidecarSystem";

type ContractCase = {
  name: string;
  kind: "cutoverReceipt" | "reverseHostCall";
  value: unknown;
};

const ROOT = path.resolve(import.meta.dirname, "../..");
const corpus = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "packages/synthesis-contracts/contract-set/synthesis-production-cutover-v1/corpus.json",
    ),
    "utf8",
  ),
) as {
  schema: string;
  positive: ContractCase[];
  negative: ContractCase[];
};

function rebuild(testCase: ContractCase) {
  return testCase.kind === "cutoverReceipt"
    ? rebuildSynthesisCutoverReceipt(testCase.value)
    : rebuildSynthesisReverseHostCall(testCase.value);
}

function runtimeIdentity() {
  return {
    implementation: "rust-native",
    protocol: SYNTHESIS_SIDECAR_PROTOCOL,
    serviceVersion: "0.1.0",
    serviceInstanceId: "service-1",
    supervisorInstanceId: "supervisor-1",
    bundleId: "4".repeat(64),
    target: "linux-x64",
    targetTriple: "x86_64-unknown-linux-gnu",
    buildFingerprint: "5".repeat(64),
    platformSignature: {
      scheme: "not-applicable",
      status: "not-applicable",
      signer: null,
    },
  };
}

function runtimeSnapshots() {
  return {
    repository: {
      mode: "production",
      state: "ready",
      schemaVersion: "synthesis-repository-foundation.v1",
      repositoryId: "6".repeat(64),
    },
    canonicalStore: {
      state: "ready",
      schemaVersion: "synthesis-topic-canonical-store.v1",
      storeId: "7".repeat(64),
    },
    computePool: {
      state: "idle",
      active: 0,
      queued: 0,
      restartCount: 0,
      failureCount: 0,
    },
    citationGraphTransfer: {
      state: "idle",
      sessions: 0,
      stagedBytes: 0,
    },
  };
}

function productionAuthority() {
  return {
    ownerMode: "production",
    mutationEnabled: false,
    capabilityFingerprint:
      SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
    cutoverReceiptId: "receipt-1",
    readyClientCapabilities:
      SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
  };
}

describe("Synthesis production cutover contract", function () {
  it("accepts the reviewed positive corpus", function () {
    assert.equal(corpus.schema, "synthesis-production-cutover-corpus.v1");
    for (const testCase of corpus.positive) {
      assert.doesNotThrow(() => rebuild(testCase), testCase.name);
    }
  });

  it("rejects the reviewed negative corpus", function () {
    for (const testCase of corpus.negative) {
      assert.throws(() => rebuild(testCase), undefined, undefined, testCase.name);
    }
  });

  it("keeps receipt and reverse Host schemas versioned", function () {
    assert.equal(
      SYNTHESIS_CUTOVER_RECEIPT_SCHEMA,
      "synthesis-production-cutover-receipt.v1",
    );
    assert.equal(
      SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
      "synthesis-reverse-host-call.v1",
    );
    assert.equal(
      SYNTHESIS_PRODUCTION_ADMISSION_SCHEMA,
      "synthesis-production-admission.v1",
    );
  });

  it("admits only explicit live roots with mutation still disabled", function () {
    const value = {
      schema: SYNTHESIS_PRODUCTION_ADMISSION_SCHEMA,
      purpose: "preflight_copy",
      profileId: "1".repeat(64),
      supervisorInstanceId: "supervisor-1",
      cutoverReceiptId: "receipt-1",
      cutoverReceiptPath:
        "/profile/state/synthesis-cutover/receipt.json",
      capabilityFingerprint: "2".repeat(64),
      repositoryDbPath: "/profile/state/synthesis.db",
      canonicalRoot: "/profile/data/synthesis",
      reverseHost: {
        host: "127.0.0.1",
        port: 9134,
        authorizationToken: "3".repeat(64),
      },
      mutationEnabled: false,
    };
    assert.deepEqual(rebuildSynthesisProductionAdmission(value), value);
    assert.throws(() =>
      rebuildSynthesisProductionAdmission({
        ...value,
        repositoryDbPath:
          "/profile/runtime/shadow-repository/root/synthesis.db",
      }),
    );
    assert.throws(() =>
      rebuildSynthesisProductionAdmission({
        ...value,
        mutationEnabled: true,
      }),
    );
  });

  it("keeps production discovery, health, and handshake strict and separate from shadow v2", function () {
    const identity = runtimeIdentity();
    const authority = productionAuthority();
    const discovery = {
      schema: SYNTHESIS_PRODUCTION_DISCOVERY_SCHEMA,
      profileId: "1".repeat(64),
      supervisorInstanceId: identity.supervisorInstanceId,
      serviceInstanceId: identity.serviceInstanceId,
      bundleId: identity.bundleId,
      implementation: identity.implementation,
      target: identity.target,
      targetTriple: identity.targetTriple,
      buildFingerprint: identity.buildFingerprint,
      platformSignature: identity.platformSignature,
      serviceVersion: identity.serviceVersion,
      protocolVersion: identity.protocol,
      schemaVersion: "synthesis-repository-foundation.v1",
      runtimeRootId: "2".repeat(64),
      dataRootId: "3".repeat(64),
      host: "127.0.0.1",
      port: 9134,
      pid: 42,
      lifecycleState: "ready",
      tokenLocator: "supervisor-session",
      capabilities: SYNTHESIS_SIDECAR_CAPABILITIES,
      ...authority,
    };
    const health = {
      status: "ok",
      ...identity,
      lifecycleState: "ready",
      ...runtimeSnapshots(),
      ...authority,
    };
    const handshake = {
      ...identity,
      profileId: discovery.profileId,
      schemaVersion: discovery.schemaVersion,
      runtimeRootId: discovery.runtimeRootId,
      dataRootId: discovery.dataRootId,
      capabilities: SYNTHESIS_SIDECAR_CAPABILITIES,
      lifecycleState: "ready",
      ...runtimeSnapshots(),
      ...authority,
    };

    assert.deepEqual(rebuildSynthesisProductionDiscovery(discovery), discovery);
    assert.deepEqual(rebuildSynthesisProductionHealth(health), health);
    assert.deepEqual(
      rebuildSynthesisProductionHandshakeResult(handshake),
      handshake,
    );
    assert.isTrue(
      rebuildSynthesisProductionDiscovery({
        ...discovery,
        mutationEnabled: true,
      }).mutationEnabled,
    );
    assert.throws(() => rebuildSynthesisSidecarDiscovery(discovery));

    for (const invalid of [
      { ...discovery, schema: "synthesis-sidecar-discovery.v2" },
      { ...discovery, ownerMode: "shadow" },
      { ...discovery, mutationEnabled: "true" },
      { ...discovery, capabilityFingerprint: "8".repeat(64) },
      { ...discovery, cutoverReceiptId: "" },
      { ...discovery, unexpected: true },
    ]) {
      assert.throws(() => rebuildSynthesisProductionDiscovery(invalid));
    }
    assert.throws(() =>
      rebuildSynthesisProductionHealth({
        ...health,
        repository: { ...health.repository, mode: "isolated_shadow" },
      }),
    );
    assert.throws(() =>
      rebuildSynthesisProductionHandshakeResult({
        ...handshake,
        capabilities: [...SYNTHESIS_SIDECAR_CAPABILITIES].reverse(),
      }),
    );
  });
});
