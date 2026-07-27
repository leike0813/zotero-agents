import { assert } from "chai";
import {
  SYNTHESIS_CUTOVER_RECEIPT_SCHEMA,
  SynthesisClientError,
  type SynthesisCutoverPhase,
} from "../../packages/synthesis-contracts/src";
import { createSynthesisCutoverReceiptStore } from "../../src/modules/synthesisCutoverReceiptStore";

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
    await store.write(
      receipt("native_owner", { updatedAtMs: 3 }),
    );
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
    let failure: unknown;
    try {
      await store.write(
        receipt("backup_verified", {
          receiptId: "receipt-3",
          updatedAtMs: 6,
        }),
      );
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, SynthesisClientError);
    assert.equal((failure as SynthesisClientError).code, "conflict");
  });
});
