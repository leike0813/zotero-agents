import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assert } from "chai";
import {
  appendPiOwnerFact,
  assessPiOwnerRecovery,
  cleanupPiConversation,
  cleanupPiSkillRun,
  createPiOwner,
  isPiSkillRunRetentionEligible,
  inspectPiOwner,
  listPiOwnerInventory,
  markPiConversationDeleting,
  markPiSkillRunDeleting,
  readPiOwnerPage,
  recordPiExecutionCheckpoint,
  recordPiToolPhysicalEvidence,
  reconcilePiOwnerOperationEvidence,
  updatePiConversationMetadata,
  createPiConversationOwner,
  getPiConversationCleanupReceipt,
  getPiSkillRunCleanupReceipt,
  getPiSkillRunReservation,
  type PiExecutionCheckpoint,
} from "../../src/modules/piOwnerPersistence";
import type { MutationExecutionResult } from "../../src/workflows/types";
import { piOwnerPaths } from "../../src/modules/piTranscriptStore";
import {
  getRuntimePersistencePaths,
  removeRuntimePath,
  runtimePathExists,
} from "../../src/modules/runtimePersistence";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { upsertPiOwnerRegistry } from "../../src/modules/pluginStateStore";
import { getPiOwnerRegistry } from "../../src/modules/pluginStateStore";
import { installPluginStateNodeSqliteAdapter } from "../helpers/pluginStateNodeSqliteAdapter";

const conversation = (ownerId: string) => ({
  kind: "conversation" as const,
  ownerId,
});
const skillRun = (ownerId: string) => ({
  kind: "skill_run" as const,
  ownerId,
});

const checkpoint = (
  patch: Partial<PiExecutionCheckpoint> = {},
): PiExecutionCheckpoint => ({
  version: 1,
  turnId: "turn-1",
  budgetMs: 60_000,
  activeMs: 1_000,
  remainingMs: 59_000,
  resumeEligible: true,
  ...patch,
});

async function rejectsWith(promise: Promise<unknown>, pattern: RegExp) {
  try {
    await promise;
  } catch (error) {
    assert.match(String(error), pattern);
    return;
  }
  assert.fail(`expected rejection matching ${pattern}`);
}

async function admitSkillRun(
  ownerId: string,
  root: string,
  facts: { kind: string; payload: unknown; turnId?: string }[] = [],
) {
  const ref = skillRun(ownerId);
  await createPiOwner(ref, root);
  await appendPiOwnerFact(
    ref,
    {
      kind: "skill_run_admitted",
      payload: { skillId: "skill", taskName: "task", mode: "auto" },
    },
    root,
  );
  for (const entry of facts) {
    await appendPiOwnerFact(
      ref,
      {
        kind: entry.kind,
        payload: entry.payload as never,
        turnId: entry.turnId,
      },
      root,
    );
  }
  return ref;
}

describe("Pi owner recovery inventory and hold-safe cleanup", function () {
  let root: string;
  let prior: string | undefined;
  beforeEach(async function () {
    prior = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-recovery-"));
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = root;
    resetPluginStateStoreForTests();
    installPluginStateNodeSqliteAdapter();
  });
  afterEach(async function () {
    resetPluginStateStoreForTests();
    installPluginStateNodeSqliteAdapter();
    if (prior === undefined) delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    else process.env.ZOTERO_SKILLS_RUNTIME_ROOT = prior;
    await removeRuntimePath(root);
  });

  it("discovers a committed owner directory the registry never projected", async function () {
    const ref = conversation("orphan-dir");
    await createPiOwner(ref, root);
    await appendPiOwnerFact(
      ref,
      { kind: "message", payload: { role: "user", text: "kept" } },
      root,
    );
    // Registry projection is a rebuildable scalar, so a committed owner whose
    // row was lost must still be discovered and reconstructed.
    const inventory = await listPiOwnerInventory(root);
    assert.deepEqual(
      inventory.map((item) => item.ownerId),
      ["orphan-dir"],
    );
  });

  it("unions the registry identity with the canonical directories", async function () {
    upsertPiOwnerRegistry({
      ownerKind: "skill_run",
      ownerId: "registry-only",
      entryCount: 3,
      lastSequence: 3,
      updatedAt: new Date().toISOString(),
    });
    const inventory = await listPiOwnerInventory(root);
    assert.deepEqual(inventory, [skillRun("registry-only")]);
  });

  it("throws when the canonical owner directory cannot be read", async function () {
    // A file where the owner kind directory belongs cannot be listed.
    const ownersDir = getRuntimePersistencePaths(root).piOwnersDir;
    await fs.mkdir(ownersDir, { recursive: true });
    await fs.writeFile(path.join(ownersDir, "conversation"), "not a directory");
    let failed = false;
    try {
      await listPiOwnerInventory(root);
    } catch {
      failed = true;
    }
    assert.isTrue(failed, "an unreadable owner directory must fail closed");
  });

  it("fails closed when a kind path is a file rather than a directory", async function () {
    const ownersDir = getRuntimePersistencePaths(root).piOwnersDir;
    await fs.mkdir(ownersDir, { recursive: true });
    await fs.writeFile(path.join(ownersDir, "skill_run"), "not a directory");
    const ref = conversation("still-found");
    await createPiOwner(ref, root);
    // A wrong-typed kind path means accounting cannot be trusted, so the whole
    // inventory fails rather than silently skipping that owner kind.
    let message = "";
    try {
      await listPiOwnerInventory(root);
    } catch (error) {
      message = String(error);
    }
    assert.match(message, /pi_owner_inventory_unreadable/);
  });

  it("reports a settled owner as ready and reads back its checkpoint", async function () {
    const ref = conversation("ready-owner");
    await createPiOwner(ref, root);
    await recordPiExecutionCheckpoint(ref, checkpoint(), root);
    const assessment = await assessPiOwnerRecovery(ref, root);
    assert.equal(assessment.state, "interrupted");
    assert.isTrue(assessment.safeToResume);
    assert.isFalse(assessment.hasHolds);
    assert.deepEqual(assessment.unresolvedOperations, []);
    assert.equal(assessment.checkpoint?.remainingMs, 59_000);
  });

  it("keeps a dispatched owner without budget evidence in recovery", async function () {
    const ref = skillRun("no-checkpoint");
    await admitSkillRun("no-checkpoint", root, [
      { kind: "skill_run_status", payload: { status: "running" } },
      {
        kind: "turn_started",
        payload: { schemaVersion: 1, turnId: "turn-1" },
        turnId: "turn-1",
      },
    ]);
    const assessment = await assessPiOwnerRecovery(ref, root);
    assert.equal(assessment.state, "recovery_required");
    assert.isFalse(assessment.safeToResume);
    assert.isUndefined(assessment.checkpoint);
  });

  it("refuses a checkpoint that declares itself eligible with no remaining budget", async function () {
    const ref = skillRun("budget-exhausted");
    await admitSkillRun("budget-exhausted", root, [
      { kind: "skill_run_status", payload: { status: "running" } },
    ]);
    await recordPiExecutionCheckpoint(
      ref,
      checkpoint({ remainingMs: 0, resumeEligible: true }),
      root,
    );
    const assessment = await assessPiOwnerRecovery(ref, root);
    assert.equal(assessment.state, "recovery_required");
    assert.isFalse(assessment.safeToResume);
  });

  it("isolates a single corrupt owner as recovery_required while others assess", async function () {
    const healthy = conversation("healthy");
    await createPiOwner(healthy, root);
    const damaged = conversation("damaged");
    await createPiOwner(damaged, root);
    await fs.writeFile(piOwnerPaths(damaged, root).log, "{not json\n");
    const assessment = await assessPiOwnerRecovery(damaged, root);
    assert.equal(assessment.state, "recovery_required");
    assert.isFalse(assessment.safeToResume);
    assert.isTrue(assessment.hasHolds);
    const other = await assessPiOwnerRecovery(healthy, root);
    assert.equal(other.state, "ready");
  });

  it("preserves an unresolved tool call as an unknown outcome hold", async function () {
    const ref = skillRun("unresolved-tool");
    await admitSkillRun("unresolved-tool", root, [
      { kind: "skill_run_status", payload: { status: "running" } },
      {
        kind: "turn_started",
        payload: { schemaVersion: 1, turnId: "turn-9" },
        turnId: "turn-9",
      },
      {
        kind: "tool_call_started",
        payload: {
          owner: { kind: "skill_run", ownerId: "unresolved-tool" },
          turnId: "turn-9",
          callId: "call-1",
          capabilityId: "zotero.native",
          name: "zotero_create_note",
          domainOperation: {
            scope: { ownerId: "unresolved-tool" },
            operationId: "op-1",
          },
        },
        turnId: "turn-9",
      },
    ]);
    await recordPiExecutionCheckpoint(
      ref,
      checkpoint({ turnId: "turn-9" }),
      root,
    );
    const assessment = await assessPiOwnerRecovery(ref, root);
    assert.equal(assessment.state, "state_unknown");
    assert.isTrue(assessment.hasHolds);
    assert.isFalse(assessment.safeToResume);
    assert.deepEqual(assessment.unresolvedOperations, [
      {
        turnId: "turn-9",
        callId: "call-1",
        scope: { ownerId: "unresolved-tool" },
        operationId: "op-1",
      },
    ]);
  });

  it("keeps files and returns cleanup_pending while a physical hold remains", async function () {
    const ref = skillRun("physical-hold");
    await admitSkillRun("physical-hold", root, [
      { kind: "skill_run_status", payload: { status: "succeeded" } },
    ]);
    await markPiSkillRunDeleting(ref.ownerId, root);
    const held = await cleanupPiSkillRun(ref, root, {
      isPhysicallyOccupied: () => true,
    });
    assert.equal(held.status, "cleanup_pending");
    assert.isTrue(await runtimePathExists(piOwnerPaths(ref, root).dir));
    const released = await cleanupPiSkillRun(ref, root, {
      isPhysicallyOccupied: () => false,
    });
    assert.equal(released.status, "deleted");
    assert.isFalse(await runtimePathExists(piOwnerPaths(ref, root).dir));
  });

  it("deletes a terminal Skill Run without a marked deletion request", async function () {
    const ref = skillRun("retention-due");
    await admitSkillRun("retention-due", root, [
      { kind: "skill_run_status", payload: { status: "succeeded" } },
      {
        kind: "skill_run_archive",
        payload: { archivedAt: new Date(0).toISOString() },
      },
    ]);
    const deleted = await cleanupPiSkillRun(ref, root);
    assert.equal(deleted.status, "deleted");
  });

  it("expires only a terminal archived Skill Run older than the retention window", async function () {
    const ref = skillRun("retention-window");
    await admitSkillRun("retention-window", root, [
      { kind: "skill_run_status", payload: { status: "succeeded" } },
      {
        kind: "skill_run_archive",
        payload: { archivedAt: new Date().toISOString() },
      },
    ]);
    const nowMs = Date.now();
    assert.isFalse(
      (
        await isPiSkillRunRetentionEligible(ref, {
          nowMs,
          retentionMs: 30 * 86_400_000,
        })
      ).eligible,
    );
  });

  it("refuses retention for a terminal archived Skill Run whose apply is only claimed", async function () {
    const ref = skillRun("apply-claimed");
    await admitSkillRun("apply-claimed", root, [
      { kind: "skill_run_status", payload: { status: "succeeded" } },
      {
        kind: "skill_run_archive",
        payload: { archivedAt: new Date(0).toISOString() },
      },
      {
        kind: "skill_run_apply_receipt",
        payload: {
          applyKey: "pi-skill-apply:apply-claimed",
          status: "claimed",
        },
      },
    ]);
    const result = await isPiSkillRunRetentionEligible(ref, {
      nowMs: Date.now(),
      retentionMs: 1000,
    });
    assert.isFalse(result.eligible);
    assert.isTrue(result.hasHolds);
  });

  it("keeps a Conversation whose executor is still physically occupied", async function () {
    const created = await createPiConversationOwner(
      { conversationId: "held-conversation" },
      root,
    );
    updatePiConversationMetadata("held-conversation", {
      lifecycle: "archived",
    });
    markPiConversationDeleting("held-conversation");
    const held = await cleanupPiConversation(created.ref, root, {
      isPhysicallyOccupied: () => true,
    });
    assert.equal(held.status, "cleanup_pending");
    assert.isTrue(await runtimePathExists(piOwnerPaths(created.ref, root).dir));
    const done = await cleanupPiConversation(created.ref, root, {
      isPhysicallyOccupied: () => false,
    });
    assert.equal(done.status, "deleted");
  });

  it("confirms the owner directory is actually gone before publishing a receipt", async function () {
    const created = await createPiConversationOwner(
      { conversationId: "receipt-after-remove" },
      root,
    );
    updatePiConversationMetadata("receipt-after-remove", {
      lifecycle: "archived",
    });
    markPiConversationDeleting("receipt-after-remove");
    const dir = piOwnerPaths(created.ref, root).dir;
    const done = await cleanupPiConversation(created.ref, root);
    assert.equal(done.status, "deleted");
    // A receipt is the deletion evidence, so it exists exactly when the tree
    // it describes is gone.
    assert.isFalse(await runtimePathExists(dir));
    assert.isNotNull(getPiConversationCleanupReceipt("receipt-after-remove"));

    // A second cleanup of an already deleted owner replays the receipt instead
    // of failing on the missing transcript.
    const replay = await cleanupPiConversation(created.ref, root);
    assert.equal(replay.status, "deleted");
  });

  describe("operation evidence reconciliation", function () {
    async function withUnresolvedCall(ownerId: string) {
      const ref = skillRun(ownerId);
      await admitSkillRun(ownerId, root, [
        { kind: "skill_run_status", payload: { status: "running" } },
        {
          kind: "turn_started",
          payload: { schemaVersion: 1, turnId: "turn-1" },
          turnId: "turn-1",
        },
        {
          kind: "tool_call_started",
          payload: {
            owner: { kind: "skill_run", ownerId },
            turnId: "turn-1",
            callId: "call-1",
            capabilityId: "zotero.native",
            name: "zotero_create_note",
            domainOperation: {
              scope: { ownerId },
              operationId: "op-1",
            },
          },
          turnId: "turn-1",
        },
      ]);
      return ref;
    }

    it("appends a late settled observation under the original invocation", async function () {
      const ref = await withUnresolvedCall("late-settled");
      const settled: MutationExecutionResult<{ ok: true }> = {
        outcome: "committed",
        result: { ok: true },
        receipt: {
          receiptId: "receipt-1",
          operationId: "op-1",
          digest: "digest-1",
        } as never,
      };
      const seen: { operationId: string; ownerId: string }[] = [];
      const result = await reconcilePiOwnerOperationEvidence(ref, root, {
        observeOperation: async ({ operationId, scope }) => {
          seen.push({ operationId, ownerId: scope.ownerId });
          return { state: "settled", result: settled };
        },
      });
      assert.deepEqual(seen, [
        { operationId: "op-1", ownerId: "late-settled" },
      ]);
      assert.deepEqual(
        result.resolved.map((item) => item.operationId),
        ["op-1"],
      );
      assert.equal(result.unresolved.length, 0);
      // The original started entry stays intact, and the settled observation
      // clears the effect hold. A dispatched run with no checkpoint is still
      // conservatively blocked from resume.
      const after = await assessPiOwnerRecovery(ref, root);
      assert.equal(after.state, "recovery_required");
      assert.isFalse(after.hasHolds);
      assert.deepEqual(after.unresolvedOperations, []);
      const inspection = await inspectPiOwner(ref, root);
      assert.equal(
        inspection.entries.filter((entry) => entry.kind === "tool_call_started")
          .length,
        1,
      );
    });

    it("keeps running and unavailable observations as holds without replay", async function () {
      const ref = await withUnresolvedCall("still-unknown");
      for (const state of ["running", "unavailable"] as const) {
        const result = await reconcilePiOwnerOperationEvidence(ref, root, {
          observeOperation: async () => ({ state }),
        });
        assert.equal(result.resolved.length, 0);
        assert.equal(result.unresolved.length, 1);
        const assessment = await assessPiOwnerRecovery(ref, root);
        assert.equal(assessment.state, "state_unknown");
      }
    });

    it("treats an observer failure as an unresolved hold, not a settlement", async function () {
      const ref = await withUnresolvedCall("observer-throws");
      const result = await reconcilePiOwnerOperationEvidence(ref, root, {
        observeOperation: () => {
          throw new Error("broker_unavailable");
        },
      });
      assert.equal(result.resolved.length, 0);
      assert.equal(result.unresolved.length, 1);
    });

    it("observes each operation identity once per pass", async function () {
      const ref = await withUnresolvedCall("observe-once");
      let calls = 0;
      await reconcilePiOwnerOperationEvidence(ref, root, {
        observeOperation: async () => {
          calls += 1;
          return { state: "running" };
        },
      });
      assert.equal(calls, 1);
    });

    it("never observes an operation that has no bound identity", async function () {
      const ref = skillRun("no-binding");
      await admitSkillRun("no-binding", root, [
        { kind: "skill_run_status", payload: { status: "running" } },
        {
          kind: "tool_call_started",
          payload: {
            owner: { kind: "skill_run", ownerId: "no-binding" },
            turnId: "turn-1",
            callId: "call-1",
            capabilityId: "zotero.native",
            name: "zotero_create_note",
          },
          turnId: "turn-1",
        },
      ]);
      let calls = 0;
      const result = await reconcilePiOwnerOperationEvidence(ref, root, {
        observeOperation: async () => {
          calls += 1;
          return {
            state: "settled",
            result: { outcome: "unchanged" } as never,
          };
        },
      });
      assert.equal(calls, 0);
      assert.equal(result.unresolved.length, 1);
      assert.equal(result.unresolved[0].operationId, "");
    });

    it("skips an already settled invocation without observing it again", async function () {
      const ref = await withUnresolvedCall("already-settled");
      await appendPiOwnerFact(
        ref,
        {
          kind: "tool_call_receipt",
          payload: {
            owner: { kind: "skill_run", ownerId: "already-settled" },
            turnId: "turn-1",
            callId: "call-1",
            outcome: "completed",
            effectCertainty: "confirmed",
          },
          turnId: "turn-1",
        },
        root,
      );
      let calls = 0;
      const result = await reconcilePiOwnerOperationEvidence(ref, root, {
        observeOperation: async () => {
          calls += 1;
          return { state: "unavailable" };
        },
      });
      assert.equal(calls, 0);
      assert.deepEqual(result.unresolved, []);
    });

    it("keeps a settled operation whose effect is unknown or needs repair as a hold", async function () {
      for (const attempt of ["unknown", "repair_required"] as const) {
        const ownerId = `settled-${attempt}`;
        const ref = await withUnresolvedCall(ownerId);
        const result = await reconcilePiOwnerOperationEvidence(ref, root, {
          observeOperation: async () => ({
            state: "settled",
            result: {
              outcome: attempt,
              attempt: {
                code: "mutation_unknown",
                phase: "reservation",
                recovery: "reconcile",
                message: "unproven",
                details: {},
              },
            } as never,
          }),
        });
        // Settled is not proof: an unknown or repair_required attempt proves no
        // absence of effect, so the hold must survive.
        assert.deepEqual(result.resolved, [], `${attempt} must not resolve`);
        assert.equal(result.unresolved.length, 1);
        const assessment = await assessPiOwnerRecovery(ref, root);
        assert.equal(assessment.state, "state_unknown");
        assert.equal(assessment.unresolvedOperations.length, 1);
      }
    });

    it("resolves only a settled attempt with a proven certainty", async function () {
      const ref = await withUnresolvedCall("settled-proven");
      const result = await reconcilePiOwnerOperationEvidence(ref, root, {
        observeOperation: async () => ({
          state: "settled",
          result: {
            outcome: "failed",
            attempt: {
              code: "policy_denied",
              phase: "validation",
              recovery: "none",
              effectCertainty: "confirmed_none",
              message: "denied before any effect",
              details: {},
            },
          } as never,
        }),
      });
      assert.equal(result.resolved.length, 1);
      const assessment = await assessPiOwnerRecovery(ref, root);
      assert.deepEqual(assessment.unresolvedOperations, []);
    });

    it("records the gateway certainty vocabulary, never an invented value", async function () {
      const ref = await withUnresolvedCall("certainty-vocab");
      await reconcilePiOwnerOperationEvidence(ref, root, {
        observeOperation: async () => ({
          state: "settled",
          result: {
            outcome: "failed",
            attempt: { recovery: "none", effectCertainty: "confirmed_none" },
          } as never,
        }),
      });
      const inspection = await inspectPiOwner(ref, root);
      const evidence = inspection.entries.find(
        (entry) => entry.kind === "operation_evidence_observed",
      );
      const certainty = (evidence!.payload as { effectCertainty?: unknown })
        .effectCertainty;
      assert.include(
        [
          "not_applicable",
          "not_started",
          "confirmed_none",
          "confirmed_complete",
          "confirmed_partial",
          "unknown",
        ],
        certainty as string,
      );
    });
  });

  describe("startup repair and retention root", function () {
    it("keeps a sealed unacked run on disk while still allowing settlement", async function () {
      const ref = skillRun("sealed-delete-guard");
      await admitSkillRun("sealed-delete-guard", root, [
        { kind: "skill_run_status", payload: { status: "succeeded" } },
        {
          kind: "skill_run_outcome",
          payload: { result: { status: "succeeded" } },
        },
        {
          kind: "skill_run_result_sealed",
          payload: { requestId: "sealed-delete-guard" },
        },
        {
          kind: "skill_run_apply_receipt",
          payload: { applyKey: "k", status: "succeeded" },
        },
        {
          kind: "skill_run_archive",
          payload: { archivedAt: new Date(0).toISOString() },
        },
      ]);
      await markPiSkillRunDeleting(ref.ownerId, root);
      // Assessment may settle it, but deletion must not remove a sealed run
      // whose terminal ack is still outstanding.
      const assessment = await assessPiOwnerRecovery(ref, root);
      // The unacked apply is a real hold, so it is not yet terminal.
      assert.equal(assessment.state, "recovery_required");
      assert.isTrue(assessment.hasHolds);
      const deleted = await cleanupPiSkillRun(ref, root);
      assert.equal(deleted.status, "cleanup_pending");
      assert.isTrue(await runtimePathExists(piOwnerPaths(ref, root).dir));
    });

    it("deletes a sealed run once its terminal ack is committed", async function () {
      const ref = skillRun("sealed-acked");
      await admitSkillRun("sealed-acked", root, [
        { kind: "skill_run_status", payload: { status: "succeeded" } },
        {
          kind: "skill_run_outcome",
          payload: { result: { status: "succeeded" } },
        },
        {
          kind: "skill_run_result_sealed",
          payload: { requestId: "sealed-acked" },
        },
        {
          kind: "skill_run_apply_receipt",
          payload: { applyKey: "k", status: "succeeded" },
        },
        { kind: "skill_run_terminal_ack", payload: { ackId: "ack-1" } },
        {
          kind: "skill_run_archive",
          payload: { archivedAt: new Date(0).toISOString() },
        },
      ]);
      await markPiSkillRunDeleting(ref.ownerId, root);
      assert.equal((await cleanupPiSkillRun(ref, root)).status, "deleted");
    });

    it("retains an owner whose staging residue outlived its cleanup fact", async function () {
      const ref = skillRun("staging-residue");
      await admitSkillRun("staging-residue", root, [
        { kind: "skill_run_status", payload: { status: "succeeded" } },
        {
          kind: "skill_run_archive",
          payload: { archivedAt: new Date(0).toISOString() },
        },
      ]);
      // The canonical cleanup marker was lost, but staged bytes remain.
      const staging = path.join(piOwnerPaths(ref, root).dir, "staging");
      await fs.mkdir(staging, { recursive: true });
      await fs.writeFile(path.join(staging, "part-1.bin"), "residue");
      await markPiSkillRunDeleting(ref.ownerId, root);
      const result = await cleanupPiSkillRun(ref, root);
      assert.equal(result.status, "cleanup_pending");
      assert.equal((result as { reason?: string }).reason, "staging_residue");
      assert.isTrue(await runtimePathExists(staging));
    });

    it("retains an owner whose preflight cleanup marker is still committed", async function () {
      const ref = skillRun("cleanup-pending-fact");
      await admitSkillRun("cleanup-pending-fact", root, [
        { kind: "skill_run_status", payload: { status: "succeeded" } },
        {
          kind: "skill_run_archive",
          payload: { archivedAt: new Date(0).toISOString() },
        },
        {
          kind: "tool_preflight_cleanup_pending",
          payload: { callId: "call-1" },
        },
      ]);
      await markPiSkillRunDeleting(ref.ownerId, root);
      assert.equal(
        (await cleanupPiSkillRun(ref, root)).status,
        "cleanup_pending",
      );
    });

    it("keeps a corrupt owner's committed reservation for slot accounting", async function () {
      const ref = skillRun("corrupt-with-reservation");
      await admitSkillRun("corrupt-with-reservation", root, [
        {
          kind: "skill_run_reservation",
          payload: {
            submissionId: "sub-1",
            submissionUnitId: "unit-1",
            workflowId: "wf-1",
            workflowLabel: "Literature",
            backendId: "builtin-pi",
            unitId: "u-1",
            unitOrder: 0,
            taskName: "task",
            memberIdentities: ["u-1"],
            unitCount: 1,
            maxConcurrency: 2,
            state: "reserved",
          },
        },
      ]);
      const projected = getPiSkillRunReservation("corrupt-with-reservation");
      assert.equal(projected?.submissionId, "sub-1");
      assert.equal(projected?.memberIdentities.length, 1);

      const log = piOwnerPaths(ref, root).log;
      const before = await fs.readFile(log, "utf8");
      await fs.appendFile(
        log,
        '{"seq":99,"entryId":"x","kind":"message","payload":{}}\n',
      );
      // The transcript is damaged, so the owner is isolated, but the log is
      // never truncated and the reservation accounting survives.
      const assessment = await assessPiOwnerRecovery(ref, root);
      assert.equal(assessment.state, "recovery_required");
      assert.isTrue((await fs.readFile(log, "utf8")).startsWith(before));
      const retained = getPiSkillRunReservation("corrupt-with-reservation");
      assert.equal(retained?.submissionUnitId, "unit-1");
      assert.equal(retained?.maxConcurrency, 2);
    });

    it("projects no reservation when the committed tuple is incomplete", async function () {
      await admitSkillRun("partial-reservation", root, [
        {
          kind: "skill_run_reservation",
          payload: { submissionId: "sub-1", workflowId: "wf-1" },
        },
      ]);
      // A partial tuple must not make accounting look available.
      assert.isNull(getPiSkillRunReservation("partial-reservation"));
    });

    it("refuses a checkpoint from a turn the owner has already left", async function () {
      const ref = skillRun("stale-turn-checkpoint");
      await admitSkillRun("stale-turn-checkpoint", root, [
        { kind: "skill_run_status", payload: { status: "running" } },
        {
          kind: "turn_started",
          payload: { schemaVersion: 1, turnId: "turn-1" },
          turnId: "turn-1",
        },
      ]);
      await recordPiExecutionCheckpoint(
        ref,
        checkpoint({ turnId: "turn-1" }),
        root,
      );
      // The owner moves on to a newer turn without a new checkpoint.
      await appendPiOwnerFact(
        ref,
        {
          kind: "turn_started",
          payload: { schemaVersion: 1, turnId: "turn-2" },
          turnId: "turn-2",
        },
        root,
      );
      const assessment = await assessPiOwnerRecovery(ref, root);
      assert.equal(assessment.state, "recovery_required");
      assert.isFalse(assessment.safeToResume);
    });

    it("does not treat a sealed result awaiting ack as a hold", async function () {
      const ref = skillRun("sealed-no-ack");
      await admitSkillRun("sealed-no-ack", root, [
        { kind: "skill_run_status", payload: { status: "succeeded" } },
        {
          kind: "skill_run_outcome",
          payload: { result: { status: "succeeded" } },
        },
        {
          kind: "skill_run_result_sealed",
          payload: { requestId: "sealed-no-ack" },
        },
      ]);
      const assessment = await assessPiOwnerRecovery(ref, root);
      // The owner may still settle, so the ack gap is reported but does not
      // block continuation of the idempotent Finalizer and ack path.
      assert.equal(assessment.state, "terminal");
    });

    it("still holds a claimed apply even when the result is sealed", async function () {
      const ref = skillRun("sealed-claimed-apply");
      await admitSkillRun("sealed-claimed-apply", root, [
        { kind: "skill_run_status", payload: { status: "succeeded" } },
        {
          kind: "skill_run_outcome",
          payload: { result: { status: "succeeded" } },
        },
        {
          kind: "skill_run_result_sealed",
          payload: { requestId: "sealed-claimed-apply" },
        },
        {
          kind: "skill_run_apply_receipt",
          payload: { applyKey: "pi-skill-apply:x", status: "claimed" },
        },
      ]);
      const assessment = await assessPiOwnerRecovery(ref, root);
      assert.isTrue(assessment.hasHolds);
      assert.equal(assessment.state, "recovery_required");
    });

    it("settles a model invocation by physical settlement of the same turn", async function () {
      const ref = skillRun("model-settled");
      await admitSkillRun("model-settled", root, [
        { kind: "skill_run_status", payload: { status: "running" } },
        {
          kind: "turn_started",
          payload: { schemaVersion: 1, turnId: "turn-1" },
          turnId: "turn-1",
        },
        {
          kind: "model_invocation_started",
          payload: { invocationId: "inv-1", turnId: "turn-1" },
          turnId: "turn-1",
        },
        {
          kind: "model_invocation_settled",
          payload: {
            invocationId: "inv-1",
            turnId: "turn-1",
            physicalOutcome: "settled",
          },
          turnId: "turn-1",
        },
      ]);
      const assessment = await assessPiOwnerRecovery(ref, root);
      assert.deepEqual(assessment.unresolvedOperations, []);
    });

    it("keeps the hold when a model invocation settled without a proven outcome", async function () {
      const ref = skillRun("model-settled-unproven");
      await admitSkillRun("model-settled-unproven", root, [
        { kind: "skill_run_status", payload: { status: "running" } },
        {
          kind: "turn_started",
          payload: { schemaVersion: 1, turnId: "turn-1" },
          turnId: "turn-1",
        },
        {
          kind: "model_invocation_started",
          payload: { invocationId: "inv-1", turnId: "turn-1" },
          turnId: "turn-1",
        },
        {
          kind: "model_invocation_settled",
          payload: {
            invocationId: "inv-1",
            turnId: "turn-1",
            physicalOutcome: "unknown",
          },
          turnId: "turn-1",
        },
      ]);
      const assessment = await assessPiOwnerRecovery(ref, root);
      // The process ended, but the outcome is still unproven.
      assert.equal(assessment.unresolvedOperations.length, 1);
      assert.equal(assessment.state, "state_unknown");
    });

    it("does not let a settled call id in one turn settle another turn's call", async function () {
      const ref = skillRun("reused-call-id");
      await admitSkillRun("reused-call-id", root, [
        { kind: "skill_run_status", payload: { status: "running" } },
        {
          kind: "turn_started",
          payload: { schemaVersion: 1, turnId: "turn-1" },
          turnId: "turn-1",
        },
        {
          kind: "tool_call_started",
          payload: {
            owner: { kind: "skill_run", ownerId: "reused-call-id" },
            turnId: "turn-1",
            callId: "call-1",
            capabilityId: "zotero.native",
            name: "zotero_create_note",
          },
          turnId: "turn-1",
        },
        {
          kind: "tool_call_receipt",
          payload: {
            owner: { kind: "skill_run", ownerId: "reused-call-id" },
            turnId: "turn-2",
            callId: "call-1",
            outcome: "completed",
            effectCertainty: "confirmed",
          },
          turnId: "turn-2",
        },
      ]);
      const assessment = await assessPiOwnerRecovery(ref, root);
      // The turn-1 call is still unresolved: the receipt belongs to turn-2.
      assert.deepEqual(
        assessment.unresolvedOperations.map((item) => item.turnId),
        ["turn-1"],
      );
      assert.equal(assessment.state, "state_unknown");
    });

    it("keeps physical tool evidence from settling an unproven effect", async function () {
      const ref = skillRun("physical-only");
      await admitSkillRun("physical-only", root, [
        { kind: "skill_run_status", payload: { status: "running" } },
        {
          kind: "turn_started",
          payload: { schemaVersion: 1, turnId: "turn-1" },
          turnId: "turn-1",
        },
        {
          kind: "tool_call_started",
          payload: {
            owner: { kind: "skill_run", ownerId: "physical-only" },
            turnId: "turn-1",
            callId: "call-1",
            capabilityId: "zotero.native",
            name: "zotero_create_note",
          },
          turnId: "turn-1",
        },
        {
          kind: "tool_call_physical_evidence",
          payload: {
            callId: "call-1",
            turnId: "turn-1",
            state: "exited",
          },
          turnId: "turn-1",
        },
      ]);
      const assessment = await assessPiOwnerRecovery(ref, root);
      // An exited process proves occupancy ended, not that the call settled.
      assert.equal(assessment.state, "state_unknown");
      assert.equal(assessment.unresolvedOperations.length, 1);
    });

    it("clears the hold on a late settled tool outcome with proven certainty", async function () {
      const ref = skillRun("late-settled-tool");
      await admitSkillRun("late-settled-tool", root, [
        { kind: "skill_run_status", payload: { status: "running" } },
        {
          kind: "turn_started",
          payload: { schemaVersion: 1, turnId: "turn-1" },
          turnId: "turn-1",
        },
        {
          kind: "tool_call_started",
          payload: {
            owner: { kind: "skill_run", ownerId: "late-settled-tool" },
            turnId: "turn-1",
            callId: "call-1",
            capabilityId: "zotero.native",
            name: "zotero_create_note",
          },
          turnId: "turn-1",
        },
        {
          // The logical answer already reported an unknown outcome.
          kind: "tool_call_receipt",
          payload: {
            owner: { kind: "skill_run", ownerId: "late-settled-tool" },
            turnId: "turn-1",
            callId: "call-1",
            outcome: "failed",
            effectCertainty: "unknown",
          },
          turnId: "turn-1",
        },
      ]);
      const before = await assessPiOwnerRecovery(ref, root);
      assert.equal(before.state, "state_unknown");

      await recordPiToolPhysicalEvidence(
        ref,
        {
          turnId: "turn-1",
          callId: "call-1",
          capabilityId: "zotero.native",
          state: "settled",
          outcome: {
            status: "completed",
            effectCertainty: "confirmed_complete",
          },
        },
        root,
      );
      const after = await assessPiOwnerRecovery(ref, root);
      assert.deepEqual(after.unresolvedOperations, []);
      assert.equal(after.hasHolds, false);
    });

    it("keeps the hold when a late tool outcome is still unknown", async function () {
      const ref = skillRun("late-unknown-tool");
      await admitSkillRun("late-unknown-tool", root, [
        { kind: "skill_run_status", payload: { status: "running" } },
        {
          kind: "tool_call_started",
          payload: {
            owner: { kind: "skill_run", ownerId: "late-unknown-tool" },
            turnId: "turn-1",
            callId: "call-1",
            capabilityId: "zotero.native",
            name: "zotero_create_note",
          },
          turnId: "turn-1",
        },
        {
          kind: "tool_call_receipt",
          payload: {
            owner: { kind: "skill_run", ownerId: "late-unknown-tool" },
            turnId: "turn-1",
            callId: "call-1",
            outcome: "failed",
            effectCertainty: "unknown",
          },
          turnId: "turn-1",
        },
      ]);
      await recordPiToolPhysicalEvidence(
        ref,
        {
          turnId: "turn-1",
          callId: "call-1",
          capabilityId: "zotero.native",
          // The process ended without a provable answer.
          state: "unknown",
        },
        root,
      );
      const after = await assessPiOwnerRecovery(ref, root);
      assert.equal(after.state, "state_unknown");
      assert.equal(after.unresolvedOperations.length, 1);
    });

    it("keeps the hold when a late settled outcome reports unknown certainty", async function () {
      const ref = skillRun("late-unproven-tool");
      await admitSkillRun("late-unproven-tool", root, [
        { kind: "skill_run_status", payload: { status: "running" } },
        {
          kind: "tool_call_started",
          payload: {
            owner: { kind: "skill_run", ownerId: "late-unproven-tool" },
            turnId: "turn-1",
            callId: "call-1",
            capabilityId: "zotero.native",
            name: "zotero_create_note",
          },
          turnId: "turn-1",
        },
      ]);
      await recordPiToolPhysicalEvidence(
        ref,
        {
          turnId: "turn-1",
          callId: "call-1",
          capabilityId: "zotero.native",
          state: "settled",
          outcome: { status: "failed", effectCertainty: "unknown" },
        },
        root,
      );
      const after = await assessPiOwnerRecovery(ref, root);
      assert.equal(after.state, "state_unknown");
      assert.equal(after.unresolvedOperations.length, 1);
    });

    it("reads the gateway's nested late outcome as well as the canonical shape", async function () {
      const ref = skillRun("nested-late-outcome");
      await admitSkillRun("nested-late-outcome", root, [
        { kind: "skill_run_status", payload: { status: "running" } },
        {
          kind: "tool_call_started",
          payload: {
            owner: { kind: "skill_run", ownerId: "nested-late-outcome" },
            turnId: "turn-1",
            callId: "call-1",
            capabilityId: "zotero.native",
            name: "zotero_create_note",
          },
          turnId: "turn-1",
        },
        {
          kind: "tool_call_receipt",
          payload: {
            owner: { kind: "skill_run", ownerId: "nested-late-outcome" },
            turnId: "turn-1",
            callId: "call-1",
            outcome: "failed",
            effectCertainty: "unknown",
          },
          turnId: "turn-1",
        },
        {
          // The shape the gateway hands its runtime, written verbatim.
          kind: "tool_call_physical_evidence",
          payload: {
            owner: { kind: "skill_run", ownerId: "nested-late-outcome" },
            turnId: "turn-1",
            callId: "call-1",
            capabilityId: "zotero.native",
            state: "settled",
            outcome: {
              status: "completed",
              effectCertainty: "confirmed_partial",
            },
          },
          turnId: "turn-1",
        },
      ]);
      const after = await assessPiOwnerRecovery(ref, root);
      assert.deepEqual(after.unresolvedOperations, []);
    });

    it("reflects a checkpoint back from the root it was written to", async function () {
      const ref = skillRun("checkpoint-root-scope");
      await admitSkillRun("checkpoint-root-scope", root, [
        { kind: "skill_run_status", payload: { status: "running" } },
        {
          kind: "turn_started",
          payload: { schemaVersion: 1, turnId: "turn-7" },
          turnId: "turn-7",
        },
      ]);
      const written = await recordPiExecutionCheckpoint(
        ref,
        checkpoint({
          turnId: "turn-7",
          budgetMs: 120_000,
          activeMs: 45_000,
          remainingMs: 75_000,
        }),
        root,
      );
      // The canonical fact round-trips exactly, under the root it was given.
      const assessment = await assessPiOwnerRecovery(ref, root);
      assert.deepEqual(assessment.checkpoint, written);
      assert.equal(assessment.state, "interrupted");
      assert.isTrue(assessment.safeToResume);
      // A different root has no such owner, so the fact is not global.
      const other = await fs.mkdtemp(path.join(os.tmpdir(), "pi-other-"));
      await rejectsWith(
        reconcilePiOwnerOperationEvidence(ref, other, {
          observeOperation: async () => ({ state: "unavailable" }),
        }),
        /pi_owner_missing/,
      );
      await fs.rm(other, { recursive: true, force: true });
    });

    it("repairs a torn tail during assessment and rebuilds its projection", async function () {
      const ref = conversation("torn-startup");
      await createPiOwner(ref, root);
      await appendPiOwnerFact(
        ref,
        { kind: "message", payload: { role: "user", text: "committed" } },
        root,
      );
      await fs.appendFile(piOwnerPaths(ref, root).log, '{"seq":2');
      const assessment = await assessPiOwnerRecovery(ref, root);
      // The torn tail is repaired, so the owner is readable again. The repair
      // appends its own marker entry, and the committed history survives.
      assert.equal(assessment.state, "ready");
      assert.equal(assessment.entries.length, 2);
      assert.equal(
        assessment.entries.filter((entry) => entry.kind === "message").length,
        1,
      );
      const rebuilt = await readPiOwnerPage(ref, {}, root);
      assert.equal(rebuilt.total, 2);
    });

    it("never truncates committed corruption during assessment", async function () {
      const ref = conversation("corrupt-startup");
      await createPiOwner(ref, root);
      await appendPiOwnerFact(
        ref,
        { kind: "message", payload: { role: "user", text: "committed" } },
        root,
      );
      const log = piOwnerPaths(ref, root).log;
      const before = await fs.readFile(log, "utf8");
      // A terminated line with an unparseable body is committed corruption,
      // not an interrupted append, so it must never be repaired away.
      await fs.appendFile(
        log,
        '{"seq":2,"entryId":"x","kind":"message","payload":{}}\n',
      );
      const assessment = await assessPiOwnerRecovery(ref, root);
      assert.equal(assessment.state, "recovery_required");
      // Committed bytes are never rewritten by a repair attempt.
      assert.isTrue((await fs.readFile(log, "utf8")).startsWith(before));
      assert.equal(
        (await fs.readFile(log, "utf8")).length > before.length,
        true,
      );
    });

    it("evaluates retention against the root it was given", async function () {
      const ref = skillRun("root-scoped-retention");
      await admitSkillRun("root-scoped-retention", root, [
        { kind: "skill_run_status", payload: { status: "succeeded" } },
        {
          kind: "skill_run_archive",
          payload: { archivedAt: new Date(0).toISOString() },
        },
      ]);
      const result = await isPiSkillRunRetentionEligible(ref, root, {
        nowMs: Date.now(),
        retentionMs: 1000,
      });
      assert.isTrue(result.eligible);
    });

    it("keeps a deletion receipt and clears the registry only after a confirmed removal", async function () {
      const ref = skillRun("receipt-skill-run");
      await admitSkillRun("receipt-skill-run", root, [
        { kind: "skill_run_status", payload: { status: "succeeded" } },
        {
          kind: "skill_run_archive",
          payload: { archivedAt: new Date(0).toISOString() },
        },
      ]);
      await markPiSkillRunDeleting(ref.ownerId, root);
      const deleted = await cleanupPiSkillRun(ref, root);
      assert.equal(deleted.status, "deleted");
      assert.isFalse(await runtimePathExists(piOwnerPaths(ref, root).dir));
      assert.isNotNull(getPiSkillRunCleanupReceipt("receipt-skill-run"));
      assert.isNull(getPiOwnerRegistry("skill_run", "receipt-skill-run"));
    });

    it("replays the durable receipt when a marked owner is already gone", async function () {
      const ref = skillRun("receipt-replay");
      await admitSkillRun("receipt-replay", root, [
        { kind: "skill_run_status", payload: { status: "succeeded" } },
        {
          kind: "skill_run_archive",
          payload: { archivedAt: new Date(0).toISOString() },
        },
      ]);
      await markPiSkillRunDeleting(ref.ownerId, root);
      assert.equal((await cleanupPiSkillRun(ref, root)).status, "deleted");
      const replay = await cleanupPiSkillRun(ref, root);
      assert.equal(replay.status, "deleted");
    });
  });
});
