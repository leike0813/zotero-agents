import { assert } from "chai";
import {
  SynthesisClientError,
  type SynthesisCutoverReceipt,
} from "../../packages/synthesis-contracts/src";
import {
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
  SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
} from "../../packages/synthesis-contracts/src/sidecarSystem";
import {
  createSynthesisProductionCutoverCoordinator,
  type SynthesisCutoverCoordinatorDeps,
} from "../../src/modules/synthesisProductionCutover";
import { createSynthesisProductionOwner } from "../../src/modules/synthesisProductionOwner";
import {
  SYNTHESIS_PRODUCTION_SMOKE_CHECK_IDS,
  createSynthesisProductionSmokeEvidence,
} from "../../src/modules/synthesisProductionSmoke";

const PROFILE_ID = "1".repeat(64);
const BACKUP_ID = "2".repeat(64);
const CANONICAL_HASH = "3".repeat(64);
const DURABLE_HASH = "4".repeat(64);
const BUNDLE_HASH = "5".repeat(64);
const CAPABILITY_HASH = "6".repeat(64);

async function criticalSmoke(
  receipt: SynthesisCutoverReceipt,
  serviceInstanceId: string,
) {
  return {
    receiptId: receipt.receiptId,
    serviceInstanceId,
    capabilityFingerprint:
      SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
    readyClientCapabilities:
      SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
    issuedAtMs: 1,
    ...(await createSynthesisProductionSmokeEvidence({
      profileId: PROFILE_ID,
      receiptId: receipt.receiptId,
      serviceInstanceId,
      supervisorInstanceId: "supervisor-1",
      capabilityFingerprint:
        SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
      results: SYNTHESIS_PRODUCTION_SMOKE_CHECK_IDS.map((id) => ({
        id,
        observable: { status: "ok" },
      })),
    })),
  };
}

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
    runCriticalSmoke: async (serviceInstanceId, receipt) => {
      events.push("smoke");
      return criticalSmoke(receipt, serviceInstanceId);
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
    let admittedEvidence: unknown;
    state.deps.enableNativeMutations = async (_service, _receipt, evidence) => {
      admittedEvidence = evidence;
      state.events.push("enable");
    };
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
    assert.deepInclude(admittedEvidence as object, {
      receiptId: result.receipt.receiptId,
      serviceInstanceId: "service-1",
      smokeCheckIds: [...SYNTHESIS_PRODUCTION_SMOKE_CHECK_IDS],
    });
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

  it("restarts the matching Rust owner for an admitted receipt without repeating migration", async function () {
    const completedState = harness();
    const completed = await coordinator(completedState.deps).run();
    const state = harness({
      readReceipt: async () => completed.receipt,
    });

    const result = await coordinator(state.deps).run();

    assert.equal(result.receipt.receiptId, completed.receipt.receiptId);
    assert.deepEqual(state.events, ["owner", "smoke"]);
    assert.isEmpty(state.receipts);
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

describe("Synthesis production critical-smoke evidence", function () {
  function smokeResults(observable: unknown = { status: "ok" }) {
    return SYNTHESIS_PRODUCTION_SMOKE_CHECK_IDS.map((id) => ({
      id,
      observable,
    }));
  }

  it("binds the complete ordered roster while excluding incidental observables", async function () {
    const shared = {
      profileId: PROFILE_ID,
      receiptId: "receipt-1",
      serviceInstanceId: "service-1",
      supervisorInstanceId: "supervisor-1",
      capabilityFingerprint:
        SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
    };
    const first = await createSynthesisProductionSmokeEvidence({
      ...shared,
      results: smokeResults({
        status: "ok",
        message: "first request",
        timestamp: 1,
        privateTrace: { attempt: 1 },
        rows: [{ id: "b" }, { id: "a" }],
      }),
    });
    const second = await createSynthesisProductionSmokeEvidence({
      ...shared,
      results: smokeResults({
        status: "ok",
        message: "second request",
        timestamp: 2,
        privateTrace: { attempt: 2 },
        rows: [{ id: "a" }, { id: "b" }],
      }),
    });

    assert.deepEqual(first.smokeCheckIds, [
      ...SYNTHESIS_PRODUCTION_SMOKE_CHECK_IDS,
    ]);
    assert.deepEqual(first.smokeCheckDigests, second.smokeCheckDigests);
    assert.equal(first.smokeEvidenceDigest, second.smokeEvidenceDigest);
  });

  it("rejects omitted, duplicated, and unknown check identities", async function () {
    const shared = {
      profileId: PROFILE_ID,
      receiptId: "receipt-1",
      serviceInstanceId: "service-1",
      supervisorInstanceId: "supervisor-1",
      capabilityFingerprint:
        SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
    };
    const complete = smokeResults();
    for (const results of [
      complete.slice(0, -1),
      [complete[0]!, complete[0]!, ...complete.slice(2)],
      [{ ...complete[0]!, id: "unknown" }, ...complete.slice(1)],
    ]) {
      assert.match(
        String(await failureOf(createSynthesisProductionSmokeEvidence({
          ...shared,
          results: results as never,
        }))),
        /synthesis_production_smoke_roster_incomplete/,
      );
    }
  });
});
