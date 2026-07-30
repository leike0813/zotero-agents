import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  SynthesisClientError,
  type SynthesisCutoverReceipt,
  type SynthesisProductionRuntimeAdmissionState,
} from "../../packages/synthesis-contracts/src";
import {
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
  SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
} from "../../packages/synthesis-contracts/src/sidecarSystem";
import {
  createSynthesisProductionCutoverCoordinator,
  createSynthesisProductionRuntimeUpgradeCoordinator,
  type SynthesisCutoverCoordinatorDeps,
} from "../../src/modules/synthesisProductionCutover";
import { createSynthesisProductionBackupService } from "../../src/modules/synthesisProductionBackup";
import { createSynthesisProductionOwner } from "../../src/modules/synthesisProductionOwner";
import {
  SYNTHESIS_PRODUCTION_SMOKE_CHECK_IDS,
  createSynthesisProductionSmokeEvidence,
} from "../../src/modules/synthesisProductionSmoke";
import { createSynthesisRuntimeAdmissionStore } from "../../src/modules/synthesisRuntimeAdmissionStore";
import { getRuntimePersistencePaths } from "../../src/modules/runtimePersistence";

const PROFILE_ID = "1".repeat(64);
const BACKUP_ID = "2".repeat(64);
const CANONICAL_HASH = "3".repeat(64);
const DURABLE_HASH = "4".repeat(64);
const BUNDLE_HASH = "5".repeat(64);
const CAPABILITY_HASH = "6".repeat(64);

function receipt(
  phase: SynthesisCutoverReceipt["phase"],
  overrides: Partial<SynthesisCutoverReceipt> = {},
): SynthesisCutoverReceipt {
  return {
    schema: "synthesis-production-cutover-receipt.v1",
    receiptId: "receipt-1",
    profileId: PROFILE_ID,
    phase,
    sourceOwner: "legacy-plugin",
    targetOwner: "rust-native",
    backupId: BACKUP_ID,
    sourceSchemaVersion: "schema-1",
    targetSchemaVersion: "schema-1",
    canonicalManifestSha256: CANONICAL_HASH,
    durableSummarySha256: DURABLE_HASH,
    bundleFingerprint: BUNDLE_HASH,
    capabilityFingerprint: CAPABILITY_HASH,
    serviceInstanceId:
      phase === "native_owner" || phase === "mutation_enabled"
        ? "service-old"
        : null,
    mutationEnabled: phase === "mutation_enabled",
    updatedAtMs: 1,
    ...overrides,
  };
}

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
      runtimeAdmissionGeneration: 1,
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

function harness(overrides: Partial<SynthesisCutoverCoordinatorDeps> = {}): {
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
        sourceOwner: "legacy-plugin",
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
      acquireNativeOwner: async () => {
        state.events.push("owner");
        return { serviceInstanceId: "service-2" };
      },
    });

    const result = await coordinator(state.deps).run();

    assert.equal(result.receipt.receiptId, completed.receipt.receiptId);
    assert.equal(result.receipt.serviceInstanceId, "service-2");
    assert.deepEqual(state.events, [
      "owner",
      "smoke",
      "enable",
      "receipt:mutation_enabled",
    ]);
    assert.lengthOf(state.receipts, 1);
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
      runtimeAdmissionGeneration: 1,
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
      runtimeAdmissionGeneration: 1,
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
        String(
          await failureOf(
            createSynthesisProductionSmokeEvidence({
              ...shared,
              results: results as never,
            }),
          ),
        ),
        /synthesis_production_smoke_roster_incomplete/,
      );
    }
  });
});

describe("Synthesis production Rust runtime upgrade coordinator", function () {
  function admissionState(
    pendingUpgrade: SynthesisProductionRuntimeAdmissionState["pendingUpgrade"] = null,
  ): SynthesisProductionRuntimeAdmissionState {
    return {
      schema: "synthesis-production-runtime-admission-state.v1",
      cutoverReceiptId: "receipt-1",
      current: {
        generation: 1,
        profileId: PROFILE_ID,
        target: "linux-x64",
        targetTriple: "x86_64-unknown-linux-gnu",
        protocolVersion: "synthesis-sidecar.v1",
        schemaVersion: "schema-1",
        bundleId: "7".repeat(64),
        buildFingerprint: BUNDLE_HASH,
        capabilityFingerprint:
          SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
        serviceInstanceId: "service-old",
        activationEvidenceSha256: null,
        admittedAtMs: 1,
      },
      pendingUpgrade,
      updatedAtMs: pendingUpgrade?.updatedAtMs ?? 1,
    };
  }

  function upgradeHarness(
    options: {
      state?: SynthesisProductionRuntimeAdmissionState;
      failAt?:
        | "resolve-current"
        | "smoke"
        | "activation"
        | "activation-state"
        | "reconcile";
    } = {},
  ) {
    let state = options.state ?? admissionState();
    let durableActivation: string | null = null;
    let activationStateFailed = false;
    const events: string[] = [];
    const backup = {
      sourceOwner: "legacy-plugin" as const,
      backupId: BACKUP_ID,
      sourceSchemaVersion: "schema-1",
      targetSchemaVersion: "schema-1",
      canonicalManifestSha256: CANONICAL_HASH,
      durableSummarySha256: DURABLE_HASH,
    };
    const target = {
      profileId: PROFILE_ID,
      target: "linux-x64" as const,
      targetTriple: "x86_64-unknown-linux-gnu" as const,
      protocolVersion: "synthesis-sidecar.v1" as const,
      schemaVersion: "schema-1",
      bundleId: "8".repeat(64),
      buildFingerprint: "9".repeat(64),
      capabilityFingerprint:
        SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
    };
    const coordinator = createSynthesisProductionRuntimeUpgradeCoordinator({
      receipt: receipt("mutation_enabled", {
        receiptId: "receipt-1",
        profileId: PROFILE_ID,
        bundleFingerprint: BUNDLE_HASH,
        capabilityFingerprint:
          SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
        serviceInstanceId: "service-old",
      }),
      target,
      deps: {
        readAdmission: async () => state,
        resolveRuntime: async (buildFingerprint) => {
          events.push(`resolve:${buildFingerprint[0]}`);
          if (
            options.failAt === "resolve-current" &&
            buildFingerprint === BUNDLE_HASH
          ) {
            throw new Error("installed_build_fingerprint_missing");
          }
          return {
            bundleId:
              buildFingerprint === BUNDLE_HASH
                ? "7".repeat(64)
                : "8".repeat(64),
            buildFingerprint,
          };
        },
        stopCurrentOwner: async () => {
          events.push("stop-current");
        },
        createVerifiedBackup: async () => {
          events.push("backup");
          return backup;
        },
        beginUpgrade: async ({ target: next, backup: basis, now }) => {
          state = admissionState({
            generation: 2,
            previousGeneration: 1,
            stage: "backup_verified",
            target: next,
            backup: basis,
            serviceInstanceId: null,
            activationEvidenceSha256: null,
            updatedAtMs: now,
          });
          events.push("pending:backup_verified");
          return state;
        },
        advanceUpgrade: async (args) => {
          if (
            options.failAt === "activation-state" &&
            args.stage === "activation_persisted" &&
            !activationStateFailed
          ) {
            activationStateFailed = true;
            events.push("pending:activation_interrupted");
            throw new Error("activation_state_interrupted");
          }
          state = {
            ...state,
            pendingUpgrade: {
              ...state.pendingUpgrade!,
              stage: args.stage,
              serviceInstanceId:
                args.serviceInstanceId ??
                state.pendingUpgrade!.serviceInstanceId,
              activationEvidenceSha256:
                args.activationEvidenceSha256 ??
                state.pendingUpgrade!.activationEvidenceSha256,
              updatedAtMs: args.now,
            },
            updatedAtMs: args.now,
          };
          events.push(`pending:${args.stage}`);
          return state;
        },
        preflightTarget: async () => {
          events.push("preflight");
        },
        startTarget: async () => {
          events.push("start-target");
          return { serviceInstanceId: "service-new" };
        },
        runCriticalSmoke: async (_service, generation) => {
          events.push("smoke");
          if (options.failAt === "smoke") {
            throw new Error("smoke_failed");
          }
          return {
            ...(await criticalSmoke(
              receipt("native_owner", {
                receiptId: "receipt-1",
                profileId: PROFILE_ID,
              }),
              "service-new",
            )),
            runtimeAdmissionGeneration: generation,
          };
        },
        activateTarget: async () => {
          events.push("activate");
          if (options.failAt === "activation") {
            throw new Error("activation_failed");
          }
          durableActivation = "a".repeat(64);
          return durableActivation;
        },
        readPersistedActivationEvidence: async () =>
          durableActivation ??
          state.pendingUpgrade?.activationEvidenceSha256 ??
          null,
        promote: async ({ now }) => {
          const pending = state.pendingUpgrade!;
          state = {
            ...state,
            current: {
              generation: pending.generation,
              ...pending.target,
              serviceInstanceId: pending.serviceInstanceId!,
              activationEvidenceSha256: pending.activationEvidenceSha256!,
              admittedAtMs: now,
            },
            pendingUpgrade: null,
            updatedAtMs: now,
          };
          events.push("promote");
          return state;
        },
        reconcile: async () => {
          events.push("reconcile");
          if (options.failAt === "reconcile") {
            throw new Error("reconcile_failed");
          }
        },
        stopTarget: async () => {
          events.push("stop-target");
        },
        restoreBackup: async () => {
          events.push("restore");
        },
        clearPending: async () => {
          state = { ...state, pendingUpgrade: null };
          events.push("clear-pending");
        },
        restartPrevious: async () => {
          events.push("restart-previous");
        },
        enterRustOnlyRepair: async () => {
          events.push("repair");
        },
        now: (() => {
          let value = 10;
          return () => value++;
        })(),
      },
    });
    return { coordinator, events, getState: () => state, target };
  }

  it("promotes a compatible build through backup, smoke, and activation", async function () {
    const { coordinator, events, getState } = upgradeHarness();
    const result = await coordinator.run();

    assert.equal(result.status, "upgraded");
    assert.equal(getState().current.generation, 2);
    assert.isNull(getState().pendingUpgrade);
    assert.deepEqual(events.slice(-3), [
      "pending:activation_persisted",
      "promote",
      "reconcile",
    ]);
    assert.notInclude(events, "restore");
  });

  it("restores data and the previous Rust generation after pre-activation failure", async function () {
    const { coordinator, events, getState } = upgradeHarness({
      failAt: "smoke",
    });
    let failure: unknown;
    try {
      await coordinator.run();
    } catch (error) {
      failure = error;
    }
    assert.match(String(failure), /smoke_failed/);
    assert.includeMembers(events, [
      "stop-target",
      "restore",
      "clear-pending",
      "restart-previous",
    ]);
    assert.notInclude(events, "repair");
    assert.equal(getState().current.generation, 1);
  });

  it("writes no upgrade state when the admitted Rust bundle is unavailable", async function () {
    const { coordinator, events, getState } = upgradeHarness({
      failAt: "resolve-current",
    });
    let failure: unknown;
    try {
      await coordinator.run();
    } catch (error) {
      failure = error;
    }
    assert.match(String(failure), /installed_build_fingerprint_missing/);
    assert.deepEqual(events, ["resolve:5"]);
    assert.isNull(getState().pendingUpgrade);
  });

  it("resumes promotion from durable activation and never rolls back after promotion", async function () {
    const pending = {
      generation: 2,
      previousGeneration: 1,
      stage: "activation_persisted" as const,
      target: {
        profileId: PROFILE_ID,
        target: "linux-x64" as const,
        targetTriple: "x86_64-unknown-linux-gnu" as const,
        protocolVersion: "synthesis-sidecar.v1" as const,
        schemaVersion: "schema-1",
        bundleId: "8".repeat(64),
        buildFingerprint: "9".repeat(64),
        capabilityFingerprint:
          SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
      },
      backup: {
        sourceOwner: "legacy-plugin" as const,
        backupId: BACKUP_ID,
        sourceSchemaVersion: "schema-1",
        targetSchemaVersion: "schema-1",
        canonicalManifestSha256: CANONICAL_HASH,
        durableSummarySha256: DURABLE_HASH,
      },
      serviceInstanceId: "service-new",
      activationEvidenceSha256: "a".repeat(64),
      updatedAtMs: 9,
    };
    const resumed = upgradeHarness({ state: admissionState(pending) });
    assert.equal((await resumed.coordinator.run()).status, "upgraded");
    assert.deepEqual(resumed.events, [
      "resolve:5",
      "resolve:9",
      "promote",
      "reconcile",
    ]);

    const failed = upgradeHarness({ failAt: "reconcile" });
    let failure: unknown;
    try {
      await failed.coordinator.run();
    } catch (error) {
      failure = error;
    }
    assert.match(String(failure), /reconcile_failed/);
    assert.include(failed.events, "repair");
    assert.notInclude(failed.events, "restore");
    assert.equal(failed.getState().current.generation, 2);
  });

  it("promotes from durable Rust evidence when activation-state persistence is interrupted", async function () {
    const resumed = upgradeHarness({ failAt: "activation-state" });
    const result = await resumed.coordinator.run();

    assert.equal(result.status, "upgraded");
    assert.equal(resumed.getState().current.generation, 2);
    assert.include(resumed.events, "pending:activation_interrupted");
    assert.include(resumed.events, "pending:activation_persisted");
    assert.notInclude(resumed.events, "restore");
    assert.notInclude(resumed.events, "restart-previous");
  });

  it("requires Rust-only repair when an activation attempt has no matching durable evidence", async function () {
    const failed = upgradeHarness({ failAt: "activation" });

    assert.match(
      String(await failureOf(failed.coordinator.run())),
      /activation_failed/,
    );
    assert.include(failed.events, "repair");
    assert.notInclude(failed.events, "restore");
    assert.notInclude(failed.events, "restart-previous");
    assert.equal(failed.getState().pendingUpgrade?.stage, "smoke_passed");
  });

  it("preserves copied-profile data and first-cutover bytes through rollback, upgrade, and promotion resume", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "synthesis-runtime-upgrade-profile-"),
    );
    const paths = getRuntimePersistencePaths(root);
    const manifestPath = path.join(
      paths.synthesisDataRoot,
      "topics",
      "topic-1",
      "manifest.json",
    );
    const firstReceipt = receipt("mutation_enabled", {
      receiptId: "receipt-1",
      profileId: PROFILE_ID,
      bundleFingerprint: BUNDLE_HASH,
      capabilityFingerprint:
        SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
      serviceInstanceId: "service-old",
    });
    const receiptBytes = `${JSON.stringify(firstReceipt)}\n`;
    const target = {
      profileId: PROFILE_ID,
      target: "linux-x64" as const,
      targetTriple: "x86_64-unknown-linux-gnu" as const,
      protocolVersion: "synthesis-sidecar.v1" as const,
      schemaVersion: "schema-1",
      bundleId: "8".repeat(64),
      buildFingerprint: "9".repeat(64),
      capabilityFingerprint:
        SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
    };
    const resumedTarget = {
      ...target,
      bundleId: "a".repeat(64),
      buildFingerprint: "b".repeat(64),
    };
    let failSmoke = true;
    let now = 10;

    try {
      await fs.mkdir(path.dirname(paths.synthesisDbPath), {
        recursive: true,
      });
      await fs.mkdir(path.dirname(paths.synthesisCutoverReceiptPath), {
        recursive: true,
      });
      await fs.mkdir(path.dirname(manifestPath), { recursive: true });
      await fs.writeFile(paths.synthesisDbPath, "db-before");
      await fs.writeFile(`${paths.synthesisDbPath}-wal`, "wal-before");
      await fs.writeFile(`${paths.synthesisDbPath}-shm`, "shm-before");
      await fs.writeFile(manifestPath, '{"version":1}');
      await fs.writeFile(paths.synthesisCutoverReceiptPath, receiptBytes);

      const backupService = createSynthesisProductionBackupService({
        persistenceRoot: root,
      });
      const store = createSynthesisRuntimeAdmissionStore({
        statePath: paths.synthesisRuntimeAdmissionStatePath,
      });
      await store.bootstrap({
        receipt: firstReceipt,
        target: "linux-x64",
        targetTriple: "x86_64-unknown-linux-gnu",
        protocolVersion: "synthesis-sidecar.v1",
        schemaVersion: "schema-1",
        bundleId: "7".repeat(64),
        buildFingerprint: BUNDLE_HASH,
        now: 1,
      });

      const runtimeByBuild = new Map([
        [BUNDLE_HASH, "7".repeat(64)],
        [target.buildFingerprint, target.bundleId],
        [resumedTarget.buildFingerprint, resumedTarget.bundleId],
      ]);
      const coordinatorFor = (next: typeof target, serviceInstanceId: string) =>
        createSynthesisProductionRuntimeUpgradeCoordinator({
          receipt: firstReceipt,
          target: next,
          deps: {
            now: () => now++,
            readAdmission: async () => {
              const state = await store.read();
              assert.isNotNull(state);
              return state!;
            },
            resolveRuntime: async (buildFingerprint) => {
              const bundleId = runtimeByBuild.get(buildFingerprint);
              if (!bundleId) {
                throw new Error("installed_build_fingerprint_missing");
              }
              return { bundleId, buildFingerprint };
            },
            stopCurrentOwner: async () => undefined,
            createVerifiedBackup: async () =>
              backupService.createVerifiedBackup({
                sourceSchemaVersion: "schema-1",
                targetSchemaVersion: "schema-1",
              }),
            beginUpgrade: store.beginUpgrade,
            advanceUpgrade: store.advanceUpgrade,
            preflightTarget: async () => undefined,
            startTarget: async () => ({ serviceInstanceId }),
            runCriticalSmoke: async (_service, generation) => {
              if (failSmoke) {
                await fs.writeFile(paths.synthesisDbPath, "db-corrupt");
                await fs.rm(`${paths.synthesisDbPath}-wal`);
                await fs.writeFile(manifestPath, '{"version":2}');
                throw new Error("smoke_failed");
              }
              return {
                ...(await criticalSmoke(
                  receipt("native_owner", {
                    receiptId: firstReceipt.receiptId,
                    profileId: PROFILE_ID,
                  }),
                  serviceInstanceId,
                )),
                runtimeAdmissionGeneration: generation,
              };
            },
            activateTarget: async () => "c".repeat(64),
            readPersistedActivationEvidence: async (pending) =>
              pending.activationEvidenceSha256,
            promote: store.promote,
            reconcile: async () => undefined,
            stopTarget: async () => undefined,
            restoreBackup: backupService.restoreVerifiedBackup,
            clearPending: store.clearPending,
            restartPrevious: async () => undefined,
            enterRustOnlyRepair: async () => {
              throw new Error("unexpected_repair");
            },
          },
        });

      const rollbackFailure = await failureOf(
        coordinatorFor(target, "service-2").run(),
      );
      assert.match(
        String(rollbackFailure),
        /smoke_failed/,
        JSON.stringify(rollbackFailure),
      );
      assert.equal(
        await fs.readFile(paths.synthesisDbPath, "utf8"),
        "db-before",
      );
      assert.equal(
        await fs.readFile(`${paths.synthesisDbPath}-wal`, "utf8"),
        "wal-before",
      );
      assert.equal(
        await fs.readFile(`${paths.synthesisDbPath}-shm`, "utf8"),
        "shm-before",
      );
      assert.equal(await fs.readFile(manifestPath, "utf8"), '{"version":1}');
      assert.equal((await store.read())!.current.generation, 1);

      failSmoke = false;
      assert.equal(
        (await coordinatorFor(target, "service-2").run()).status,
        "upgraded",
      );
      assert.equal((await store.read())!.current.generation, 2);

      const backup = await backupService.createVerifiedBackup({
        sourceSchemaVersion: "schema-1",
        targetSchemaVersion: "schema-1",
      });
      await store.beginUpgrade({
        target: resumedTarget,
        backup,
        now: now++,
      });
      await store.advanceUpgrade({
        stage: "preflight_passed",
        now: now++,
      });
      await store.advanceUpgrade({
        stage: "candidate_started",
        serviceInstanceId: "service-3",
        now: now++,
      });
      await store.advanceUpgrade({
        stage: "smoke_passed",
        now: now++,
      });
      await store.advanceUpgrade({
        stage: "activation_persisted",
        activationEvidenceSha256: "d".repeat(64),
        now: now++,
      });

      assert.equal(
        (await coordinatorFor(resumedTarget, "service-3").run()).status,
        "upgraded",
      );
      assert.equal((await store.read())!.current.generation, 3);
      assert.equal(
        await fs.readFile(paths.synthesisCutoverReceiptPath, "utf8"),
        receiptBytes,
      );
      assert.equal(
        await fs.readFile(paths.synthesisDbPath, "utf8"),
        "db-before",
      );
      assert.equal(await fs.readFile(manifestPath, "utf8"), '{"version":1}');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
