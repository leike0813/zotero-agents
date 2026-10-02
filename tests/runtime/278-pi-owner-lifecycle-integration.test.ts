import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assert } from "chai";
import {
  createPiConversationCoordinator,
  getPiConversationCoordinator,
  resetPiConversationShutdownForTests,
  shutdownPiConversations,
} from "../../src/modules/piConversation";
import {
  createPiSkillRunCoordinator,
  getPiSkillRunCoordinator,
  resetPiSkillRunShutdownForTests,
  shutdownPiSkillRuns,
} from "../../src/modules/piSkillRun";
import {
  appendPiOwnerFact,
  createPiOwner,
  inspectPiOwner,
  listPiOwnerInventory,
  recordPiExecutionCheckpoint,
} from "../../src/modules/piOwnerPersistence";
import {
  createPiRuntimeLifecycle,
  getPiRuntimeLifecycle,
  resetPiRuntimeLifecycleForTests,
} from "../../src/modules/piRuntimeLifecycle";
import { WorkflowSubmissionQueue } from "../../src/jobQueue/workflowSubmissionQueue";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { installPluginStateNodeSqliteAdapter } from "../helpers/pluginStateNodeSqliteAdapter";
import { createPiTextProviderSource } from "../../src/modules/piRuntime";
import { prepareSkillRun } from "../../src/modules/skillRunPreparation";
import { createAcpSkillRunnerWorkspace } from "../../src/modules/acp/skillRun/acpSkillRunnerWorkspace";
import { resetPiRuntimeAuditForTests } from "../../src/modules/piRuntimeAudit";
import type { PiModelSelectionSnapshot } from "../../src/shared/piProviderContract";
import type { ProviderExecuteArgs } from "../../src/providers/types";
import { removeRuntimePath } from "../../src/modules/runtimePersistence";
import {
  createPiSkillRunsWorkspaceOwner,
  createPiSkillRunsWorkspaceSurfaceAdapter,
} from "../../src/modules/piSkillRunWorkspaceSurface";

const model: PiModelSelectionSnapshot = {
  configurationId: "test",
  configurationLabel: "Test",
  provider: "test",
  modelId: "test",
  authVariant: "none",
  api: "openai-completions",
  baseUrl: "https://example.test",
  reasoning: "off",
  catalogRevision: "test",
  adapterVersion: "0.84.4",
  runtimeVersion: "0.84.4",
  requiresLocalNetwork: false,
  policy: {
    contextWindow: 32000,
    maxTokens: 2048,
    input: ["text"],
    supportsTools: true,
  },
};

describe("Pi owner lifecycle integration", function () {
  let root: string;
  let prior: string | undefined;
  beforeEach(async function () {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-owner-lifecycle-"));
    prior = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = root;
    resetPluginStateStoreForTests();
    installPluginStateNodeSqliteAdapter();
    resetPiRuntimeLifecycleForTests();
    resetPiSkillRunShutdownForTests();
    resetPiConversationShutdownForTests();
  });
  afterEach(async function () {
    resetPiSkillRunShutdownForTests();
    resetPiConversationShutdownForTests();
    resetPiRuntimeLifecycleForTests();
    await resetPiRuntimeAuditForTests();
    resetPluginStateStoreForTests();
    installPluginStateNodeSqliteAdapter();
    if (prior === undefined) delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    else process.env.ZOTERO_SKILLS_RUNTIME_ROOT = prior;
    await removeRuntimePath(root);
  });

  it("admits conversation prompts through foreground lifecycle capacity", async function () {
    const lifecycle = createPiRuntimeLifecycle();
    const held = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        lifecycle.acquire({
          owner: { kind: "conversation" as const, ownerId: `held-${index}` },
          turnId: `held-${index}`,
          lane: "background",
        }),
      ),
    );
    let settleBackground!: () => void;
    held[0].trackPhysical(
      new Promise<void>((resolve) => {
        settleBackground = resolve;
      }),
    );
    held[0].release();
    let dispatched = 0;
    const coordinator = createPiConversationCoordinator({
      root,
      lifecycle,
      resolveModel: async () => model,
      modelSource: () =>
        async function* () {
          dispatched++;
          yield "Answer";
        },
      definitions: async () => [],
    });
    await coordinator.create();
    const conversationId = coordinator.selectedId!;
    const pending = coordinator.send(conversationId, "First");
    for (let index = 0; index < 6; index++) await Promise.resolve();
    assert.equal(dispatched, 0, "all twelve process slots are still occupied");
    settleBackground();
    const result = await (await pending).result;
    assert.equal(result.status, "completed");
    assert.equal(dispatched, 1);
    const history = await inspectPiOwner(
      { kind: "conversation", ownerId: conversationId },
      root,
    );
    const checkpoint = history.entries
      .filter((entry) => entry.kind === "execution_checkpoint")
      .at(-1);
    assert.isDefined(checkpoint, "the admitted turn persists its budget fact");
    assert.equal(
      (checkpoint!.payload as { budgetMs: number }).budgetMs,
      7_200_000,
    );
    held.slice(1).forEach((lease) => lease.release());
    await coordinator.dispose();
    lifecycle.closeAdmission();
  });

  it("refuses a new prompt while the process lifecycle is closed", async function () {
    const lifecycle = createPiRuntimeLifecycle();
    lifecycle.closeAdmission();
    const coordinator = createPiConversationCoordinator({
      root,
      lifecycle,
      resolveModel: async () => model,
      modelSource: () =>
        async function* () {
          yield "Answer";
        },
      definitions: async () => [],
    });
    await coordinator.create();
    let code = "";
    try {
      await coordinator.send(coordinator.selectedId!, "First");
    } catch (error) {
      code = error instanceof Error ? error.message : String(error);
    }
    assert.equal(code, "runtime_closed");
    await coordinator.dispose();
  });

  for (const mode of ["auto", "interactive"] as const) {
    it(`keeps ${mode} Skill Run admission on its lane when background capacity is full`, async function () {
      const lifecycle = createPiRuntimeLifecycle({ capacity: 4 });
      const held = await Promise.all(
        Array.from({ length: 2 }, (_, index) =>
          lifecycle.acquire({
            owner: { kind: "skill_run", ownerId: `held-${index}` },
            turnId: `held-${index}`,
            lane: "background",
          }),
        ),
      );
      let dispatched = 0;
      let preparationFinished!: () => void;
      const prepared = new Promise<void>((resolve) => {
        preparationFinished = resolve;
      });
      const coordinator = createPiSkillRunCoordinator({
        root,
        lifecycle,
        prepare: async (args) => {
          const value = await prepareFor(root)(args);
          preparationFinished();
          return { ...value, executionMode: mode };
        },
        resolveModel: async () => model,
        definitions: async () => [],
        execution: () => {
          dispatched++;
          return createPiTextProviderSource({ steps: [{ text: "done" }] });
        },
      });
      const args = skillRunArgs();
      (args.request as { runtime_options?: unknown }).runtime_options = {
        execution_mode: mode,
      };
      const pending = coordinator.execute(args);
      try {
        await prepared;
        await new Promise((resolve) => setTimeout(resolve, 100));
        assert.equal(dispatched, mode === "auto" ? 0 : 1);
        assert.isAtMost(lifecycle.activeCount, 4);
      } finally {
        held.forEach((lease) => lease.release());
        await pending;
        await coordinator.dispose();
        lifecycle.closeAdmission();
      }
      assert.equal(dispatched, 1, "queued work proceeds when capacity settles");
    });
  }

  it("persists a cumulative Skill Run budget across a safe restart", async function () {
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare: prepareFor(root),
      resolveModel: async () => model,
      definitions: async () => [],
      execution: () =>
        createPiTextProviderSource({ steps: [{ text: "done" }] }),
    });
    const result = await coordinator.execute(skillRunArgs());
    assert.equal(result.status, "failed");
    assert.equal(
      (result.responseJson as { error: { code: string } }).error.code,
      "skill_result_not_submitted",
    );
    const history = await inspectPiOwner(
      { kind: "skill_run", ownerId: result.requestId },
      root,
    );
    const checkpoints = history.entries
      .filter((entry) => entry.kind === "execution_checkpoint")
      .map(
        (entry) =>
          entry.payload as {
            budgetMs: number;
            activeMs: number;
            remainingMs: number;
          },
      );
    assert.isAtLeast(checkpoints.length, 1);
    const latest = checkpoints.at(-1)!;
    assert.equal(
      latest.budgetMs,
      28_800_000,
      "a Skill Run runs an eight hour budget",
    );
    assert.isAtMost(latest.activeMs, 28_800_000);

    await coordinator.dispose();
    let dispatched = 0;
    const restarted = createPiSkillRunCoordinator({
      root,
      prepare: prepareFor(root),
      resolveModel: async () => model,
      definitions: async () => [],
      execution: () => {
        dispatched++;
        return createPiTextProviderSource({ steps: [{ text: "replayed" }] });
      },
    });
    await restarted.recover(result.requestId);
    assert.equal(dispatched, 0, "recovery never replays a dispatched turn");
    const after = await inspectPiOwner(
      { kind: "skill_run", ownerId: result.requestId },
      root,
    );
    const afterLatest = after.entries
      .filter((entry) => entry.kind === "execution_checkpoint")
      .at(-1)!.payload as { budgetMs: number; activeMs: number };
    assert.equal(afterLatest.budgetMs, latest.budgetMs);
    assert.isAtLeast(afterLatest.activeMs, latest.activeMs);
    await restarted.dispose();
  });

  it("persists the Workflow's lower active budget", async function () {
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare: prepareFor(root),
      resolveModel: async () => model,
      definitions: async () => [],
      execution: () =>
        createPiTextProviderSource({ steps: [{ text: "done" }] }),
    });
    const args = skillRunArgs();
    args.orchestrationContext = {
      ...args.orchestrationContext,
      executionBudgetMs: 60_000,
    };
    const result = await coordinator.execute(args);
    const history = await inspectPiOwner(
      { kind: "skill_run", ownerId: result.requestId },
      root,
    );
    const checkpoint = history.entries
      .filter((entry) => entry.kind === "execution_checkpoint")
      .at(-1)!.payload as { budgetMs: number };
    assert.equal(checkpoint.budgetMs, 60_000);
    await coordinator.dispose();
  });

  it("restores a durable Workflow reservation before admitting new Skill Runs", async function () {
    const queue = new WorkflowSubmissionQueue({
      now: () => "2026-10-01T00:00:00.000Z",
      createSubmissionId: () => "test-submission" as never,
      createQueueId: () => "test-queue-1" as never,
    });
    queue.start();
    // The reservation only exists because a real Workflow unit is admitted
    // and held while the run executes.
    let releaseUnit!: () => void;
    const held = new Promise<void>((resolve) => {
      releaseUnit = resolve;
    });
    queue.enqueueSubmission({
      backend: { backendType: "builtin-pi", backendId: "builtin-pi" },
      workflow: { workflowId: "test-workflow", workflowLabel: "Test workflow" },
      units: [
        {
          unit: { unitId: "unit-1" },
          display: {
            unitId: "unit-1",
            order: 0,
            taskName: "Test task",
            inputUnitIdentity: "item:1",
            memberIdentities: ["item:1"],
            memberCount: 1,
          },
        },
      ],
      maxConcurrency: 1,
      executeUnit: async () => {
        await held;
        return { status: "succeeded" as const };
      },
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const coordinator = createPiSkillRunCoordinator({
      root,
      queue,
      prepare: prepareFor(root),
      resolveModel: async () => model,
      definitions: async () => [],
      execution: () =>
        createPiTextProviderSource({ steps: [{ text: "done" }] }),
    });
    const result = await coordinator.execute(skillRunArgs());
    const history = await inspectPiOwner(
      { kind: "skill_run", ownerId: result.requestId },
      root,
    );
    const reservation = history.entries.find(
      (entry) => entry.kind === "skill_run_reservation",
    );
    assert.isDefined(reservation, "admission records its Workflow reservation");
    const payload = reservation!.payload as {
      submissionId: string;
      submissionUnitId: string;
      ownerId: string;
    };
    assert.equal(payload.submissionId, "test-submission");
    assert.equal(payload.submissionUnitId, "test-queue-1");
    assert.equal(payload.ownerId, result.requestId);
    await coordinator.dispose();
    releaseUnit();

    const restored = new WorkflowSubmissionQueue({
      now: () => "2026-10-01T00:00:00.000Z",
    });
    restored.start();
    let dispatched = 0;
    const afterRestart = createPiSkillRunCoordinator({
      root,
      queue: restored,
      prepare: prepareFor(root),
      resolveModel: async () => model,
      definitions: async () => [],
      execution: () => {
        dispatched++;
        return createPiTextProviderSource({ steps: [{ text: "replayed" }] });
      },
    });
    const accounted = await afterRestart.restoreReservations();
    assert.isTrue(accounted, "durable reservations were restored");
    assert.equal(
      restored.getReservation("test-queue-1")?.ownerId,
      result.requestId,
      "the original reservation identity is adopted",
    );
    assert.equal(dispatched, 0, "a restored reservation never dispatches");
    assert.isFalse(
      restored.isPiAdmissionBlocked,
      "a trustworthy inventory reopens builtin-pi admission",
    );
    await afterRestart.dispose();
  });

  it("reconciles a running Skill Run without replaying its unknown tool work", async function () {
    // A run interrupted mid-flight: dispatched, still running, with a tool
    // call whose authoritative outcome has never been observed.
    const ref = { kind: "skill_run" as const, ownerId: "interrupted-run" };
    await createPiOwner(ref, root);
    await appendPiOwnerFact(
      ref,
      {
        kind: "skill_run_admitted",
        payload: {
          skillId: "deterministic",
          taskName: "Interrupted task",
          mode: "auto",
          workflow: { workflowId: "test-workflow" },
        },
      },
      root,
    );
    await appendPiOwnerFact(
      ref,
      { kind: "skill_run_status", payload: { status: "running" } },
      root,
    );
    await appendPiOwnerFact(
      ref,
      {
        kind: "tool_call_started",
        payload: {
          callId: "call-unknown",
          domainOperation: {
            scope: { ownerId: "interrupted-run" },
            operationId: "op-1",
          },
        },
      },
      root,
    );
    await recordPiExecutionCheckpoint(
      ref,
      {
        version: 1,
        turnId: "turn-1",
        budgetMs: 28_800_000,
        activeMs: 1_000,
        remainingMs: 28_799_000,
        resumeEligible: true,
      },
      root,
    );

    let observed = 0;
    let dispatched = 0;
    const restarted = createPiSkillRunCoordinator({
      root,
      prepare: prepareFor(root),
      resolveModel: async () => model,
      definitions: async () => [],
      execution: () => {
        dispatched++;
        return createPiTextProviderSource({ steps: [{ text: "replayed" }] });
      },
      observeOperation: async () => {
        observed++;
        // An authoritative but unsettled answer never clears the hold.
        return { state: "unknown" } as never;
      },
    });
    const reconciled = await restarted.reconcile();
    assert.equal(observed, 1, "startup observes the Broker exactly once");
    assert.equal(dispatched, 0, "an unresolved effect is never replayed");
    assert.equal(reconciled.continued, 0);
    assert.isAtLeast(reconciled.holds, 1);
    const read = await restarted.readModel("interrupted-run");
    assert.equal(read.status, "recovery_required");
    // An explicit check observes again and still refuses to continue.
    await restarted.recover("interrupted-run");
    assert.equal(observed, 2);
    assert.equal(dispatched, 0);
    await restarted.dispose();
  });
  for (const reconciliation of ["explicit", "startup"] as const) {
    it(`requires explicit continuation after unknown reconciliation (${reconciliation})`, async function () {
      const coordinator = createPiSkillRunCoordinator({
        root,
        prepare: prepareFor(root),
        resolveModel: async () => model,
        definitions: async () => [
          {
            capabilityId: "fixture.unknown",
            name: "fixture_unknown",
            description: "Unknown effect",
            schema: { type: "object", additionalProperties: false },
            minimumEffects: ["bounded-read"],
            maxResultBytes: 1024,
            classify: () => ({
              effects: ["bounded-read"],
              authorizationKeys: [],
              resourceKeys: [],
              cost: 1,
            }),
            execute: async () => ({
              status: "failed",
              effectCertainty: "unknown",
              code: "execution_failed",
            }),
            preflight: async () => ({
              status: "prepared",
              domainPlanDigest: "plan",
              admissionFacts: {},
              domainOperation: {
                scope: { ownerId: "fixture-owner" },
                operationId: "unknown-op",
              },
              execute: async () => ({
                status: "failed",
                effectCertainty: "unknown",
                code: "execution_failed",
              }),
              dispose: async () => undefined,
            }),
          },
        ],
        execution: () =>
          createPiTextProviderSource({
            steps: [
              {
                toolCalls: [
                  {
                    callId: "unknown-call",
                    name: "fixture_unknown",
                    arguments: {},
                  },
                ],
              },
            ],
          }),
      });
      const result = await coordinator.execute(skillRunArgs());
      assert.equal(result.status, "deferred");
      assert.equal(
        (await coordinator.readModel(result.requestId)).status,
        "recovery_required",
      );
      await coordinator.dispose();
      const owner = { kind: "skill_run" as const, ownerId: result.requestId };
      await appendPiOwnerFact(
        owner,
        {
          kind: "skill_run_reservation",
          payload: reservationDescriptor(result.requestId),
        },
        root,
      );
      if (reconciliation === "startup") {
        await appendPiOwnerFact(
          owner,
          {
            kind: "skill_run_status",
            payload: { status: "running" },
          },
          root,
        );
      }
      let known = reconciliation === "startup";
      let dispatched = 0;
      const queue = new WorkflowSubmissionQueue();
      queue.start();
      const restarted = createPiSkillRunCoordinator({
        root,
        queue,
        resolveModel: async () => model,
        definitions: async () => [],
        observeOperation: async () =>
          known
            ? ({
                state: "settled",
                result: {
                  outcome: "committed",
                  result: {},
                  receipt: {
                    receiptId: "receipt",
                    operationId: "unknown-op",
                    digest: "digest",
                  },
                },
              } as never)
            : ({ state: "unknown" } as never),
        execution: () => {
          dispatched++;
          return createPiTextProviderSource({ steps: [{ text: "Continue" }] });
        },
      });
      assert.isTrue(await restarted.restoreReservations());
      if (reconciliation === "startup") {
        const assessment = await restarted.reconcile();
        assert.equal(assessment.continued, 0);
        assert.equal(dispatched, 0);
      } else {
        await restarted.recover(result.requestId);
        assert.isFalse(
          (await restarted.readModel(result.requestId)).canContinueRecovery,
        );
      }
      known = true;
      await restarted.recover(result.requestId);
      assert.isTrue(
        (await restarted.readModel(result.requestId)).canContinueRecovery,
      );
      assert.equal(dispatched, 0);
      await restarted.continueRecovery(result.requestId);
      assert.equal(dispatched, 1);
      await restarted.dispose();
    });
  }

  async function soleSkillRunOwnerId(ownerRoot: string) {
    const owners = await listPiOwnerInventory(ownerRoot);
    const found = owners.filter((owner) => owner.kind === "skill_run");
    assert.lengthOf(found, 1);
    return found[0].ownerId;
  }

  for (const { continuation, mode } of [
    { continuation: "startup", mode: "auto" },
    { continuation: "explicit", mode: "auto" },
    { continuation: "startup", mode: "interactive" },
  ] as const) {
    it(`continues a safely checkpointed Skill Run on its original request (${continuation}, ${mode})`, async function () {
      // A real run drives until it suspends, so its Prepared Skill and workspace
      // are genuine. Startup then sees exactly the shape it may continue, and
      // the recorded remainder has to survive the restart.
      let entered;
      const started = new Promise((resolve) => {
        entered = resolve;
      });
      let first = true;
      const coordinator = createPiSkillRunCoordinator({
        root,
        prepare: prepareFor(root, mode),
        resolveModel: async () => model,
        definitions: async () => [],
        execution: () => {
          if (!first)
            return createPiTextProviderSource({ steps: [{ text: "again" }] });
          first = false;
          const held = createPiTextProviderSource({
            steps: [{ text: "thinking" }],
          });
          return {
            model: held.model,
            source: async (input) => {
              entered();
              await new Promise((resolve) =>
                input.signal.addEventListener("abort", () => resolve(), {
                  once: true,
                }),
              );
              return held.source(input);
            },
          };
        },
      });
      const args = skillRunArgs();
      (args.request as { runtime_options?: unknown }).runtime_options = {
        execution_mode: mode,
      };
      const running = coordinator.execute(args);
      await started;
      const requestId = await soleSkillRunOwnerId(root);
      await coordinator.interrupt(requestId);
      assert.equal((await running).status, "deferred");
      // A restart is a fresh process: the previous coordinator's in-memory
      // activity is gone, so this one must let go of the owner entirely.
      await coordinator.dispose();
      // A suspended owner keeps its own state; only a previously running one is
      // continued, so the fixture re-arms that exact status.
      await appendPiOwnerFact(
        { kind: "skill_run", ownerId: requestId },
        {
          kind: "skill_run_status",
          payload: {
            status:
              continuation === "startup" ? "running" : "recovery_required",
          },
        },
        root,
      );

      let dispatched = 0;
      const restarted = createPiSkillRunCoordinator({
        root,
        prepare: prepareFor(root),
        resolveModel: async () => model,
        definitions: async () => [],
        execution: () => {
          dispatched++;
          return createPiTextProviderSource({ steps: [{ text: "resumed" }] });
        },
      });
      // A continuation occupies a Workflow slot, so its original reservation has
      // to be restored first. Reconcile alone must never dispatch without one.
      const unreconciled = await restarted.reconcile();
      assert.equal(unreconciled.continued, 0);
      assert.equal(unreconciled.holds, continuation === "startup" ? 1 : 0);
      assert.equal(dispatched, 0, "no reservation, no dispatch");
      assert.isFalse(
        (await restarted.readModel(requestId)).canContinueRecovery,
      );
      if (continuation === "explicit") {
        const rejected = await restarted.continueRecovery(requestId).then(
          () => false,
          () => true,
        );
        assert.isTrue(rejected);
        assert.equal(dispatched, 0);
      }

      await appendPiOwnerFact(
        { kind: "skill_run", ownerId: requestId },
        {
          kind: "skill_run_status",
          payload: {
            status:
              continuation === "startup" ? "running" : "recovery_required",
          },
        },
        root,
      );
      await appendPiOwnerFact(
        { kind: "skill_run", ownerId: requestId },
        {
          kind: "skill_run_reservation",
          payload: reservationDescriptor(requestId),
        },
        root,
      );
      const queued = new WorkflowSubmissionQueue({
        now: () => "2026-10-01T00:00:00.000Z",
      });
      queued.start();
      const lifecycle = createPiRuntimeLifecycle({ capacity: 4 });
      let resumedEntered = false;
      const withSlot = createPiSkillRunCoordinator({
        root,
        queue: queued,
        lifecycle,
        prepare: prepareFor(root),
        resolveModel: async () => model,
        definitions: async () => [],
        execution: () => {
          dispatched++;
          const source = createPiTextProviderSource({
            steps: [{ text: "resumed" }],
          });
          return mode === "interactive" && dispatched === 1
            ? {
                model: source.model,
                source: async (input) => {
                  resumedEntered = true;
                  await new Promise<void>((resolve) =>
                    input.signal.addEventListener("abort", () => resolve(), {
                      once: true,
                    }),
                  );
                  return source.source(input);
                },
              }
            : source;
        },
      });
      assert.isTrue(
        await withSlot.restoreReservations(),
        "the durable reservation was restored",
      );
      const reconciled = await withSlot.reconcile();
      assert.equal(reconciled.holds, 0);
      assert.equal(reconciled.continued, continuation === "startup" ? 1 : 0);
      if (continuation === "explicit") {
        assert.equal(
          dispatched,
          0,
          "resolved recovery never dispatches automatically",
        );
        const changes: string[][] = [];
        withSlot.subscribe((change) => changes.push(change.kinds));
        await withSlot.recover(requestId);
        assert.include(changes.at(-1)!, "details");
        assert.isTrue(
          (await withSlot.readModel(requestId)).canContinueRecovery,
        );
        const regions = await createPiSkillRunsWorkspaceSurfaceAdapter(
          withSlot,
        ).readOwnerRegions({
          owner: createPiSkillRunsWorkspaceOwner(requestId),
          kinds: ["owner-details"],
        });
        assert.include(
          regions["owner-details"]!.actions,
          "continue-owner-recovery",
        );
        await withSlot.continueRecovery(requestId);
      }
      // Startup queues the continuation on the background lane and never waits
      // for it, so a long run cannot delay the process.
      for (let index = 0; index < 40 && dispatched === 0; index++)
        await new Promise((resolve) => setTimeout(resolve, 5));
      assert.equal(dispatched, 1, "the same request continues exactly once");
      if (mode === "interactive") {
        for (let index = 0; index < 100 && !resumedEntered; index++)
          await new Promise((resolve) => setTimeout(resolve, 10));
        assert.isTrue(resumedEntered);
        await withSlot.interrupt(requestId);
        for (let index = 0; index < 40 && lifecycle.activeCount > 0; index++)
          await new Promise((resolve) => setTimeout(resolve, 5));
        assert.equal(lifecycle.activeCount, 0);
        const held = await Promise.all(
          Array.from({ length: 2 }, (_, index) =>
            lifecycle.acquire({
              owner: { kind: "skill_run", ownerId: `held-${index}` },
              turnId: `held-${index}`,
              lane: "background",
            }),
          ),
        );
        const reply = withSlot.reply(requestId, "Continue");
        try {
          for (let index = 0; index < 40 && dispatched < 2; index++)
            await new Promise((resolve) => setTimeout(resolve, 5));
          assert.equal(
            dispatched,
            2,
            "user continuation uses foreground reserve",
          );
        } finally {
          held.forEach((lease) => lease.release());
          await reply;
        }
      }
      const history = await inspectPiOwner(
        { kind: "skill_run", ownerId: requestId },
        root,
      );
      const checkpoints = history.entries
        .filter((entry) => entry.kind === "execution_checkpoint")
        .map((entry) => entry.payload as { budgetMs: number });
      assert.isAtLeast(checkpoints.length, 1);
      for (const entry of checkpoints)
        assert.equal(entry.budgetMs, 28_800_000, "a restart never replenishes");
      await restarted.dispose();
      await withSlot.dispose();
    });
  }

  it("keeps a marked Skill Run owner until its hold clears", async function () {
    const ref = { kind: "skill_run" as const, ownerId: "held-run" };
    await createPiOwner(ref, root);
    await appendPiOwnerFact(
      ref,
      {
        kind: "skill_run_admitted",
        payload: { skillId: "skill", taskName: "task", mode: "auto" },
      },
      root,
    );
    await appendPiOwnerFact(
      ref,
      { kind: "skill_run_status", payload: { status: "succeeded" } },
      root,
    );
    // A claimed but unconfirmed apply is the hold: its effect is unproved, so
    // the owner and its files survive until the receipt resolves.
    await appendPiOwnerFact(
      ref,
      {
        kind: "skill_run_apply_receipt",
        payload: { applyKey: "pi-skill-apply:held-run", status: "claimed" },
      },
      root,
    );
    await appendPiOwnerFact(
      ref,
      {
        kind: "skill_run_deleting",
        payload: { markedAt: new Date().toISOString() },
      },
      root,
    );
    const coordinator = createPiSkillRunCoordinator({ root });
    const held = await coordinator.deleteRun("held-run");
    assert.equal(held.status, "cleanup_pending");
    assert.equal(
      (await inspectPiOwner(ref, root)).status,
      "valid",
      "the owner tree survives its hold",
    );
    // Clearing the hold lets the same deletion finish: the owner must then be
    // evicted from the in-memory projection and refuse further reads.
    await appendPiOwnerFact(
      ref,
      {
        kind: "skill_run_apply_receipt",
        payload: { applyKey: "pi-skill-apply:held-run", status: "succeeded" },
      },
      root,
    );
    await appendPiOwnerFact(
      ref,
      { kind: "skill_run_terminal_ack", payload: { ackId: "held-run-ack" } },
      root,
    );
    const deleted = await coordinator.deleteRun("held-run");
    assert.equal(deleted.status, "deleted");
    assert.isFalse(
      (await coordinator.list()).some((run) => run.requestId === "held-run"),
      "a deleted owner leaves the in-memory projection",
    );
    let readable = true;
    await coordinator.readModel("held-run").catch(() => {
      readable = false;
    });
    assert.isFalse(readable, "a deleted owner must not be readable");
    await coordinator.dispose();
  });

  for (const inputsPresent of [true, false]) {
    it(`settles a recovered terminal apply receipt (inputs present: ${inputsPresent})`, async function () {
      const owner = { kind: "skill_run" as const, ownerId: "applied-run" };
      await createPiOwner(owner, root);
      for (const input of [
        {
          kind: "skill_run_admitted",
          payload: { skillId: "skill", taskName: "task", mode: "auto" },
        },
        {
          kind: "skill_run_apply_inputs",
          payload: { workflowRunId: "workflow-run", jobId: "job" },
        },
        {
          kind: "skill_run_outcome",
          payload: {
            result: {
              status: "succeeded",
              requestId: owner.ownerId,
              fetchType: "result",
            },
          },
        },
        {
          kind: "skill_run_apply_receipt",
          payload: {
            applyKey: "pi-skill-apply:applied-run",
            status: "succeeded",
          },
        },
      ])
        if (inputsPresent || input.kind !== "skill_run_apply_inputs")
          await appendPiOwnerFact(owner, input, root);
      await appendPiOwnerFact(
        owner,
        {
          kind: "skill_run_reservation",
          payload: reservationDescriptor(owner.ownerId),
        },
        root,
      );
      if (!inputsPresent)
        await appendPiOwnerFact(
          owner,
          {
            kind: "skill_run_terminal_ack",
            payload: { ackId: "workflow-run:job" },
          },
          root,
        );
      let dispatched = 0;
      const queued = new WorkflowSubmissionQueue();
      queued.start();
      const coordinator = createPiSkillRunCoordinator({
        root,
        queue: queued,
        execution: () => {
          dispatched++;
          return createPiTextProviderSource({
            steps: [{ text: "unexpected" }],
          });
        },
      });
      assert.isTrue(await coordinator.restoreReservations());
      await coordinator.reconcile();
      await coordinator.reconcile();
      assert.isUndefined(queued.getReservation("resume-queue-1"));
      const history = await inspectPiOwner(owner, root);
      const acks = history.entries.filter(
        (entry) => entry.kind === "skill_run_terminal_ack",
      );
      assert.lengthOf(acks, 1);
      assert.equal(
        (acks[0].payload as { ackId: string }).ackId,
        "workflow-run:job",
      );
      assert.equal(dispatched, 0);
      assert.equal(
        (await coordinator.readModel(owner.ownerId)).status,
        "succeeded",
      );
      await coordinator.dispose();
    });
  }

  it("refuses to continue a Skill Run whose permanent deletion was marked", async function () {
    // A marked owner keeps its canonical history so cleanup can be retried
    // after a hold clears, but it must accept no new work in the meantime.
    const ref = { kind: "skill_run" as const, ownerId: "deleting-run" };
    await createPiOwner(ref, root);
    await appendPiOwnerFact(
      ref,
      {
        kind: "skill_run_admitted",
        payload: {
          skillId: "deterministic",
          taskName: "Deleting task",
          mode: "auto",
          workflow: { workflowId: "test-workflow" },
        },
      },
      root,
    );
    await appendPiOwnerFact(
      ref,
      { kind: "skill_run_status", payload: { status: "suspended" } },
      root,
    );
    await appendPiOwnerFact(
      ref,
      {
        kind: "skill_run_reservation",
        payload: reservationDescriptor("deleting-run"),
      },
      root,
    );
    await recordPiExecutionCheckpoint(
      ref,
      {
        version: 1,
        turnId: "turn-1",
        budgetMs: 28_800_000,
        activeMs: 1_000,
        remainingMs: 28_799_000,
        resumeEligible: true,
      },
      root,
    );
    // A claimed but unconfirmed apply is the hold that keeps the owner on disk
    // after the deletion mark.
    await appendPiOwnerFact(
      ref,
      {
        kind: "skill_run_apply_receipt",
        payload: { applyKey: "pi-skill-apply:deleting-run", status: "claimed" },
      },
      root,
    );

    let dispatched = 0;
    const queued = new WorkflowSubmissionQueue({
      now: () => "2026-10-01T00:00:00.000Z",
    });
    queued.start();
    const coordinator = createPiSkillRunCoordinator({
      root,
      queue: queued,
      prepare: prepareFor(root),
      resolveModel: async () => model,
      definitions: async () => [],
      execution: () => {
        dispatched++;
        return createPiTextProviderSource({
          steps: [{ text: "Must not run" }],
        });
      },
    });
    assert.isTrue(await coordinator.restoreReservations());
    const before = await coordinator.reconcile();
    assert.equal(before.retained, 1, "a suspended owner keeps its own state");
    assert.equal(dispatched, 0);

    // The mark is committed before removal, so a hold keeps the owner while a
    // clean one removes it. Either way no new work is admitted afterwards.
    const marked = await coordinator.deleteRun("deleting-run");
    assert.equal(marked.status, "cleanup_pending");
    const after = await coordinator.reconcile();
    assert.equal(after.continued, 0, "a deleting owner never continues");
    assert.equal(dispatched, 0);
    let replyCode = "";
    try {
      await coordinator.reply("deleting-run", "Continue");
    } catch (error) {
      replyCode = error instanceof Error ? error.message : String(error);
    }
    assert.equal(replyCode, "pi_skill_run_deleting");
    assert.equal(dispatched, 0, "no new work is admitted after the mark");
    await coordinator.dispose();
  });

  it("stops both Pi owners against one shared shutdown deadline", async function () {
    // Both owners are the production singletons, so the shutdown exports are
    // the real boundary the process hook calls.
    const lifecycle = getPiRuntimeLifecycle();
    getPiSkillRunCoordinator();
    getPiConversationCoordinator();
    lifecycle.closeAdmission();
    const deadline = Date.now() + 5_000;
    const settled = await Promise.all([
      shutdownPiSkillRuns(deadline),
      shutdownPiConversations(deadline),
    ]);
    assert.deepEqual(settled, [true, true]);
    assert.isTrue(lifecycle.closed);
    // A late owner callback cannot resurrect a closed process: every new
    // admission is refused after the deadline passed.
    assert.equal(
      await lifecycle
        .acquire({
          owner: { kind: "conversation", ownerId: "late" },
          turnId: "late",
          lane: "foreground",
        })
        .then(
          () => "admitted",
          () => "refused",
        ),
      "refused",
    );
    assert.throws(() => getPiSkillRunCoordinator(), /shutdown/);
    assert.throws(() => getPiConversationCoordinator(), /shutdown/);
  });

  it("reports unresolved owner disposal at the shared deadline", async function () {
    const conversation = getPiConversationCoordinator();
    const run = getPiSkillRunCoordinator();
    const disposeConversation = conversation.dispose;
    const disposeRun = run.dispose;
    let settle!: () => void;
    const pending = new Promise<void>((resolve) => {
      settle = resolve;
    });
    conversation.dispose = () => pending;
    run.dispose = () => pending;
    getPiRuntimeLifecycle().closeAdmission();
    try {
      const deadline = Date.now();
      assert.deepEqual(
        await Promise.all([
          shutdownPiConversations(deadline),
          shutdownPiSkillRuns(deadline),
        ]),
        [false, false],
      );
      assert.throws(() => getPiConversationCoordinator(), /shutdown/);
      assert.throws(() => getPiSkillRunCoordinator(), /shutdown/);
    } finally {
      settle();
      await Promise.all([disposeConversation(), disposeRun()]);
    }
  });
  function reservationDescriptor(ownerId: string) {
    return {
      submissionId: "resume-submission",
      submissionUnitId: "resume-queue-1",
      workflowId: "test-workflow",
      workflowLabel: "Test workflow",
      backendId: "builtin-pi",
      unitId: "unit-1",
      unitOrder: 0,
      taskName: "Resumable task",
      memberIdentities: ["item:1"],
      unitCount: 1,
      maxConcurrency: 1,
      state: "held",
      ownerId,
    };
  }
});

function skillRunArgs(): ProviderExecuteArgs {
  return {
    requestKind: "skillrunner.job.v1",
    request: { kind: "skillrunner.job.v1", skill_id: "deterministic" },
    backend: {
      id: "builtin-pi",
      type: "builtin-pi",
      baseUrl: "local://builtin-pi",
    },
    orchestrationContext: {
      workflowId: "test-workflow",
      workflowLabel: "Test workflow",
      jobId: "test-job",
      submissionId: "test-submission",
      submissionUnitId: "test-queue-1",
    },
  } as ProviderExecuteArgs;
}

function prepareFor(root: string, mode: "auto" | "interactive" = "auto") {
  return async (args: ProviderExecuteArgs & { requestId: string }) => {
    const skillDir = path.join(root, "skill");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, "SKILL.md"), "Execute the Skill.");
    await fs.writeFile(path.join(skillDir, "runner.json"), "{}");
    const workspace = await createAcpSkillRunnerWorkspace({
      requestId: args.requestId,
      backendId: "builtin-pi",
      skillId: "test",
      rootDir: root,
    });
    return prepareSkillRun({
      request: args.request as { skill_id: string },
      workspace,
      backendId: "builtin-pi",
      executionMode: mode,
      materialization: { primarySkillDir: skillDir },
      skillEntry: {
        skillId: "deterministic",
        sourceKind: "xpi-bundled",
        sourceDir: skillDir,
        skillMdPath: path.join(skillDir, "SKILL.md"),
        runnerJsonPath: path.join(skillDir, "runner.json"),
        checksum: "test",
        description: "Test",
        diagnostics: [],
      },
      runnerJson: {},
    });
  };
}
