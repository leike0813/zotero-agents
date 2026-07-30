import { assert } from "chai";
import {
  SYNTHESIS_CUTOVER_RECEIPT_SCHEMA,
  SYNTHESIS_PRODUCTION_RUNTIME_ADMISSION_STATE_SCHEMA,
  SYNTHESIS_SIDECAR_PROTOCOL,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
  SynthesisClientError,
  type SynthesisCutoverPhase,
} from "../../packages/synthesis-contracts/src";
import { createSynthesisCutoverReceiptStore } from "../../src/modules/synthesisCutoverReceiptStore";
import { createSynthesisRuntimeAdmissionStore } from "../../src/modules/synthesisRuntimeAdmissionStore";

function receipt(
  phase: SynthesisCutoverPhase,
  overrides: Record<string, unknown> = {},
) {
  return {
    schema: SYNTHESIS_CUTOVER_RECEIPT_SCHEMA,
    receiptId: "receipt-1",
    profileId: "1".repeat(64),
    phase,
    sourceOwner: "legacy-plugin",
    targetOwner: "rust-native",
    backupId: "2".repeat(64),
    sourceSchemaVersion: "source-1",
    targetSchemaVersion: "target-1",
    canonicalManifestSha256: "3".repeat(64),
    durableSummarySha256: "4".repeat(64),
    bundleFingerprint: "5".repeat(64),
    capabilityFingerprint: "6".repeat(64),
    serviceInstanceId:
      phase === "native_owner" || phase === "mutation_enabled"
        ? "service-1"
        : null,
    mutationEnabled: phase === "mutation_enabled",
    updatedAtMs: 1,
    ...overrides,
  };
}

describe("Synthesis cutover receipt store", function () {
  it("persists only monotonic, identity-bound phase transitions", async function () {
    let stored = "";
    const writes: string[] = [];
    const store = createSynthesisCutoverReceiptStore({
      receiptPath: "/profile/state/synthesis-cutover/receipt.json",
      pathExists: async () => Boolean(stored),
      readText: async () => stored,
      replacePrivateText: async (_path, text) => {
        stored = text;
        writes.push(text);
      },
    });
    await store.write(receipt("backup_verified"));
    await store.write(receipt("preflight_verified", { updatedAtMs: 2 }));
    await store.write(receipt("native_owner", { updatedAtMs: 3 }));
    assert.equal((await store.read())?.phase, "native_owner");
    assert.lengthOf(writes, 3);

    let failure: unknown;
    try {
      await store.write(
        receipt("backup_verified", {
          receiptId: "receipt-2",
          updatedAtMs: 4,
        }),
      );
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, SynthesisClientError);
    assert.equal((failure as SynthesisClientError).code, "conflict");
  });

  it("allows a new pre-admission generation but never resets admitted ownership", async function () {
    let stored = `${JSON.stringify(receipt("preflight_verified"))}\n`;
    const store = createSynthesisCutoverReceiptStore({
      receiptPath: "/profile/state/synthesis-cutover/receipt.json",
      pathExists: async () => true,
      readText: async () => stored,
      replacePrivateText: async (_path, text) => {
        stored = text;
      },
    });
    await store.write(
      receipt("backup_verified", {
        receiptId: "receipt-2",
        updatedAtMs: 2,
      }),
    );
    await store.write(
      receipt("preflight_verified", {
        receiptId: "receipt-2",
        updatedAtMs: 3,
      }),
    );
    await store.write(
      receipt("native_owner", {
        receiptId: "receipt-2",
        updatedAtMs: 4,
      }),
    );
    await store.write(
      receipt("mutation_enabled", {
        receiptId: "receipt-2",
        updatedAtMs: 5,
      }),
    );
    await store.write(
      receipt("mutation_enabled", {
        receiptId: "receipt-2",
        serviceInstanceId: "service-2",
        updatedAtMs: 6,
      }),
    );
    assert.equal((await store.read())?.serviceInstanceId, "service-2");
    let failure: unknown;
    try {
      await store.write(
        receipt("backup_verified", {
          receiptId: "receipt-3",
          updatedAtMs: 7,
        }),
      );
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, SynthesisClientError);
    assert.equal((failure as SynthesisClientError).code, "conflict");
  });

  it("bootstraps and promotes runtime admission without rewriting the first receipt", async function () {
    const receiptText = `${JSON.stringify(
      receipt("mutation_enabled", {
        sourceSchemaVersion: "synthesis-repository-foundation.v1",
        targetSchemaVersion: "synthesis-repository-foundation.v1",
        capabilityFingerprint:
          SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
      }),
    )}\n`;
    let stored = "";
    const admissionWrites: string[] = [];
    const store = createSynthesisRuntimeAdmissionStore({
      statePath: "/profile/state/synthesis-runtime-admission.json",
      pathExists: async () => Boolean(stored),
      readText: async () => stored,
      replacePrivateText: async (_path, text) => {
        stored = text;
        admissionWrites.push(text);
      },
    });
    const current = await store.bootstrap({
      receipt: JSON.parse(receiptText),
      target: "linux-x64",
      targetTriple: "x86_64-unknown-linux-gnu",
      protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
      schemaVersion: "synthesis-repository-foundation.v1",
      bundleId: "7".repeat(64),
      buildFingerprint: "5".repeat(64),
      now: 2,
    });
    assert.equal(current.current.generation, 1);
    assert.equal(current.current.buildFingerprint, "5".repeat(64));

    const pending = await store.beginUpgrade({
      target: {
        profileId: current.current.profileId,
        target: current.current.target,
        targetTriple: current.current.targetTriple,
        protocolVersion: current.current.protocolVersion,
        schemaVersion: current.current.schemaVersion,
        bundleId: "8".repeat(64),
        buildFingerprint: "9".repeat(64),
        capabilityFingerprint: current.current.capabilityFingerprint,
      },
      backup: {
        sourceOwner: "legacy-plugin",
        backupId: "a".repeat(64),
        sourceSchemaVersion: "synthesis-repository-foundation.v1",
        targetSchemaVersion: "synthesis-repository-foundation.v1",
        canonicalManifestSha256: "b".repeat(64),
        durableSummarySha256: "c".repeat(64),
      },
      now: 3,
    });
    assert.equal(pending.pendingUpgrade?.generation, 2);
    await store.advanceUpgrade({
      stage: "preflight_passed",
      now: 4,
    });
    await store.advanceUpgrade({
      stage: "candidate_started",
      serviceInstanceId: "service-2",
      now: 5,
    });
    await store.advanceUpgrade({
      stage: "smoke_passed",
      now: 6,
    });
    const activated = await store.advanceUpgrade({
      stage: "activation_persisted",
      activationEvidenceSha256: "d".repeat(64),
      now: 7,
    });
    assert.equal(activated.pendingUpgrade?.stage, "activation_persisted");
    const promoted = await store.promote({ now: 8 });
    assert.equal(promoted.current.generation, 2);
    assert.equal(promoted.current.serviceInstanceId, "service-2");
    assert.isNull(promoted.pendingUpgrade);
    assert.isAtLeast(admissionWrites.length, 4);
    assert.equal(
      receiptText,
      `${JSON.stringify(
        receipt("mutation_enabled", {
          sourceSchemaVersion: "synthesis-repository-foundation.v1",
          targetSchemaVersion: "synthesis-repository-foundation.v1",
          capabilityFingerprint:
            SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
        }),
      )}\n`,
    );
  });

  it("rejects incompatible, skipped, and pre-activation promotion transitions", async function () {
    let stored = "";
    const store = createSynthesisRuntimeAdmissionStore({
      statePath: "/profile/state/synthesis-runtime-admission.json",
      pathExists: async () => Boolean(stored),
      readText: async () => stored,
      replacePrivateText: async (_path, text) => {
        stored = text;
      },
    });
    await store.bootstrap({
      receipt: receipt("mutation_enabled", {
        sourceSchemaVersion: "synthesis-repository-foundation.v1",
        targetSchemaVersion: "synthesis-repository-foundation.v1",
        capabilityFingerprint:
          SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
      }),
      target: "linux-x64",
      targetTriple: "x86_64-unknown-linux-gnu",
      protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
      schemaVersion: "synthesis-repository-foundation.v1",
      bundleId: "7".repeat(64),
      buildFingerprint: "5".repeat(64),
      now: 2,
    });
    let failure: unknown;
    try {
      await store.beginUpgrade({
        target: {
          profileId: "1".repeat(64),
          target: "linux-x64",
          targetTriple: "x86_64-unknown-linux-gnu",
          protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
          schemaVersion: "synthesis-repository-foundation.v2",
          bundleId: "8".repeat(64),
          buildFingerprint: "9".repeat(64),
          capabilityFingerprint:
            SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
        },
        backup: {
          sourceOwner: "legacy-plugin",
          backupId: "a".repeat(64),
          sourceSchemaVersion: "synthesis-repository-foundation.v1",
          targetSchemaVersion: "synthesis-repository-foundation.v1",
          canonicalManifestSha256: "b".repeat(64),
          durableSummarySha256: "c".repeat(64),
        },
        now: 3,
      });
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, SynthesisClientError);
    assert.equal((failure as SynthesisClientError).code, "conflict");
    assert.isNull((await store.read())?.pendingUpgrade);
    failure = undefined;
    try {
      await store.promote({ now: 4 });
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, SynthesisClientError);
  });
});
