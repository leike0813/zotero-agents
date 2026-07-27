import { assert } from "chai";
import {
  SynthesisClientError,
  type SynthesisCutoverReceipt,
} from "../../packages/synthesis-contracts/src";
import {
  createSynthesisProductionCutoverCoordinator,
  type SynthesisCutoverCoordinatorDeps,
} from "../../src/modules/synthesisProductionCutover";
import { createSynthesisProductionOwner } from "../../src/modules/synthesisProductionOwner";

const PROFILE_ID = "1".repeat(64);
const BACKUP_ID = "2".repeat(64);
const CANONICAL_HASH = "3".repeat(64);
const DURABLE_HASH = "4".repeat(64);
const BUNDLE_HASH = "5".repeat(64);
const CAPABILITY_HASH = "6".repeat(64);

function harness(
  overrides: Partial<SynthesisCutoverCoordinatorDeps> = {},
): {
  deps: SynthesisCutoverCoordinatorDeps;
  events: string[];
  receipts: SynthesisCutoverReceipt[];
} {
  const events: string[] = [];
  const receipts: SynthesisCutoverReceipt[] = [];
  const deps: SynthesisCutoverCoordinatorDeps = {
    now: () => receipts.length + 1,
    readReceipt: async () => null,
    writeReceipt: async (receipt) => {
      receipts.push(receipt);
      events.push(`receipt:${receipt.phase}`);
    },
    enterMaintenance: async () => {
      events.push("maintenance");
    },
    drainLegacyOwner: async () => {
      events.push("drain");
    },
    createVerifiedBackup: async () => {
      events.push("backup");
      return {
        backupId: BACKUP_ID,
        sourceSchemaVersion: "v1",
        targetSchemaVersion: "v1",
        canonicalManifestSha256: CANONICAL_HASH,
        durableSummarySha256: DURABLE_HASH,
      };
    },
    preflightNativeOwner: async () => {
      events.push("preflight");
    },
    acquireNativeOwner: async () => {
      events.push("owner");
      return { serviceInstanceId: "service-1" };
    },
    runCriticalSmoke: async () => {
      events.push("smoke");
    },
    enableNativeMutations: async () => {
      events.push("enable");
    },
    resumeLegacyBeforeMigration: async () => {
      events.push("resume-legacy");
    },
    restoreBackupBeforeAdmission: async () => {
      events.push("restore");
    },
    enterRustOnlyRepair: async () => {
      events.push("rust-repair");
    },
    ...overrides,
  };
  return { deps, events, receipts };
}

function coordinator(deps: SynthesisCutoverCoordinatorDeps) {
  return createSynthesisProductionCutoverCoordinator({
    profileId: PROFILE_ID,
    bundleFingerprint: BUNDLE_HASH,
    capabilityFingerprint: CAPABILITY_HASH,
    deps,
  });
}

async function failureOf(task: Promise<unknown>) {
  try {
    await task;
  } catch (error) {
    return error;
  }
  throw new Error("expected failure");
}

describe("Synthesis production cutover coordinator", function () {
  it("transfers ownership before enabling mutations", async function () {
    const state = harness();
    const result = await coordinator(state.deps).run();

    assert.equal(result.status, "mutation_enabled");
    assert.deepEqual(state.events, [
      "maintenance",
      "drain",
      "backup",
      "receipt:backup_verified",
      "preflight",
      "receipt:preflight_verified",
      "owner",
      "receipt:native_owner",
      "smoke",
      "enable",
      "receipt:mutation_enabled",
    ]);
  });

  it("resumes legacy when preflight fails before migration", async function () {
    const state = harness({
      preflightNativeOwner: async () => {
        state.events.push("preflight");
        throw new Error("schema_mismatch");
      },
    });
    assert.match(
      String(await failureOf(coordinator(state.deps).run())),
      /schema_mismatch/,
    );
    assert.include(state.events, "resume-legacy");
    assert.notInclude(state.events, "owner");
    assert.notInclude(state.events, "restore");
  });

  it("restores the backup when smoke fails before admission", async function () {
    const state = harness({
      runCriticalSmoke: async () => {
        state.events.push("smoke");
        throw new Error("smoke_failed");
      },
    });
    assert.match(
      String(await failureOf(coordinator(state.deps).run())),
      /smoke_failed/,
    );
    assert.include(state.events, "restore");
    assert.notInclude(state.events, "resume-legacy");
    assert.notInclude(state.events, "enable");
  });

  it("never falls back after native mutation admission", async function () {
    const state = harness();
    let writes = 0;
    state.deps.writeReceipt = async (receipt) => {
      writes += 1;
      state.receipts.push(receipt);
      state.events.push(`receipt:${receipt.phase}`);
      if (writes === 4) {
        throw new Error("receipt_sync_failed");
      }
    };
    assert.match(
      String(await failureOf(coordinator(state.deps).run())),
      /receipt_sync_failed/,
    );
    assert.include(state.events, "enable");
    assert.include(state.events, "rust-repair");
    assert.notInclude(state.events, "resume-legacy");
    assert.notInclude(state.events, "restore");
  });

  it("enters Rust-only repair when an admitted receipt no longer matches the runtime", async function () {
    const completedState = harness();
    const completed = await coordinator(completedState.deps).run();
    const state = harness({
      readReceipt: async () => ({
        ...completed.receipt,
        bundleFingerprint: "7".repeat(64),
      }),
    });
    const failure = await failureOf(coordinator(state.deps).run());
    assert.instanceOf(failure, SynthesisClientError);
    assert.equal((failure as SynthesisClientError).code, "conflict");
    assert.equal(
      (failure as SynthesisClientError).details?.reason,
      "runtime_mismatch",
    );
    assert.deepEqual(state.events, ["rust-repair"]);
  });

  it("starts one background cutover and shuts down in owner order", async function () {
    const completedState = harness();
    const completed = await coordinator(completedState.deps).run();
    const events: string[] = [];
    const owner = createSynthesisProductionOwner({
      createReverseHostEndpoint() {
        return {
          async start() {
            events.push("endpoint-start");
          },
          async stop() {
            events.push("endpoint-stop");
          },
        };
      },
      createCutoverCoordinator() {
        return {
          async run() {
            events.push("cutover");
            return completed;
          },
        };
      },
      invalidateClient() {
        events.push("invalidate-client");
      },
      async stopProductionSupervisor() {
        events.push("supervisor-stop");
      },
    });

    const first = owner.start();
    assert.strictEqual(owner.start(), first);
    assert.strictEqual((await owner.whenReady()).phase, "mutation_enabled");
    await Promise.all([owner.shutdown(), owner.shutdown()]);
    assert.deepEqual(events, [
      "endpoint-start",
      "cutover",
      "invalidate-client",
      "endpoint-stop",
      "supervisor-stop",
    ]);
  });
});
