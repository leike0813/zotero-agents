import { assert } from "chai";
import {
  WorkflowSubmissionQueue,
  type WorkflowSubmissionQueueDeps,
} from "../../src/jobQueue/workflowSubmissionQueue";
import type {
  WorkflowExecutionUnitOutcome,
  WorkflowSubmissionQueueConfig,
  WorkflowSubmissionQueueExecutionContext,
} from "../../src/jobQueue/workflowSubmissionQueueContracts";

type TestUnit = {
  id: string;
  secret?: string;
};

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flushMicrotasks() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

function createQueue() {
  let submissionSequence = 0;
  let queueSequence = 0;
  const deps: WorkflowSubmissionQueueDeps = {
    now: () => "2026-07-23T00:00:00.000Z",
    createSubmissionId: () =>
      `workflow-submission-test-${++submissionSequence}` as never,
    createQueueId: () => `workflow-queue-test-${++queueSequence}` as never,
    appendRuntimeLog: () => null,
  };
  return new WorkflowSubmissionQueue(deps);
}

function createConfig(
  units: TestUnit[],
  executeUnit: (unit: TestUnit) => Promise<WorkflowExecutionUnitOutcome>,
  overrides: Partial<WorkflowSubmissionQueueConfig<TestUnit>> = {},
): WorkflowSubmissionQueueConfig<TestUnit> {
  return {
    backend: {
      backendType: "skillrunner",
      backendId: "backend-a",
    },
    workflow: {
      workflowId: "workflow-a",
      workflowLabel: "Workflow A",
    },
    units: units.map((unit, order) => ({
      unit,
      display: {
        unitId: unit.id,
        order,
        taskName: `Task ${unit.id}`,
        inputUnitIdentity: `item:${unit.id}`,
      },
    })),
    executeUnit,
    ...overrides,
  };
}

describe("workflow Host submission queue", function () {
  it("admits FIFO units up to the frozen submission limit and retains slots until settlement", async function () {
    const queue = createQueue();
    const gates = new Map(
      ["u1", "u2", "u3", "u4"].map((id) => [
        id,
        deferred<WorkflowExecutionUnitOutcome>(),
      ]),
    );
    const admitted: string[] = [];
    const handle = queue.enqueueSubmission(
      createConfig(
        [...gates.keys()].map((id) => ({ id })),
        async (unit) => {
          admitted.push(unit.id);
          return gates.get(unit.id)!.promise;
        },
        { maxConcurrency: 2 },
      ),
    );

    assert.deepEqual(
      queue.listQueued().map((entry) => entry.unitId),
      ["u1", "u2", "u3", "u4"],
    );
    await flushMicrotasks();
    assert.deepEqual(admitted, ["u1", "u2"]);
    assert.deepEqual(
      queue.listQueued().map((entry) => entry.unitId),
      ["u3", "u4"],
    );

    gates.get("u2")!.resolve({ status: "succeeded" });
    await flushMicrotasks();
    assert.deepEqual(admitted, ["u1", "u2", "u3"]);

    gates.get("u1")!.resolve({ status: "succeeded" });
    gates.get("u3")!.resolve({ status: "failed", reasonCode: "test-failed" });
    await flushMicrotasks();
    gates.get("u4")!.resolve({ status: "succeeded" });

    assert.deepEqual(await handle.completion, {
      submissionId: handle.submissionId,
      total: 4,
      succeeded: 3,
      failed: 1,
      skipped: 0,
    });
  });

  it("projects one active submission continuously from pending through admission without member identities", async function () {
    const queue = createQueue();
    const firstGate = deferred<WorkflowExecutionUnitOutcome>();
    const secondGate = deferred<WorkflowExecutionUnitOutcome>();
    const handle = queue.enqueueSubmission(
      createConfig(
        [{ id: "u1", secret: "not-public" }, { id: "u2" }],
        async (unit) =>
          unit.id === "u1" ? firstGate.promise : secondGate.promise,
        {
          maxConcurrency: 1,
          initialOutcomes: [
            { status: "skipped", reasonCode: "duplicate-refused" },
          ],
        },
      ),
    );

    const beforeAdmission = queue.getActiveSubmission(handle.submissionId)!;
    assert.deepInclude(beforeAdmission, {
      submissionId: handle.submissionId,
      workflowId: "workflow-a",
      workflowLabel: "Workflow A",
      backendType: "skillrunner",
      backendId: "backend-a",
      total: 3,
      initiallySkipped: 1,
      pending: 2,
      admitted: 0,
      settled: 1,
    });
    assert.deepEqual(
      beforeAdmission.units.map((unit) => [
        unit.unitId,
        unit.state,
        unit.canCancel,
      ]),
      [
        ["u1", "pending", true],
        ["u2", "pending", true],
      ],
    );
    assert.equal(Object.isFrozen(beforeAdmission), true);
    assert.equal(Object.isFrozen(beforeAdmission.units), true);
    assert.equal(Object.isFrozen(beforeAdmission.units[0]), true);
    assert.notInclude(JSON.stringify(beforeAdmission), "not-public");
    assert.notInclude(JSON.stringify(beforeAdmission), "item:u1");

    await flushMicrotasks();
    const admitted = queue.getActiveSubmission(handle.submissionId)!;
    assert.deepInclude(admitted, { pending: 1, admitted: 1, settled: 1 });
    assert.deepEqual(
      admitted.units.map((unit) => [unit.unitId, unit.state, unit.canCancel]),
      [
        ["u1", "admitted", false],
        ["u2", "pending", true],
      ],
    );

    firstGate.resolve({ status: "succeeded" });
    await flushMicrotasks();
    const nextAdmitted = queue.getActiveSubmission(handle.submissionId)!;
    assert.deepInclude(nextAdmitted, {
      pending: 0,
      admitted: 1,
      settled: 2,
    });
    assert.deepEqual(
      nextAdmitted.units.map((unit) => [
        unit.unitId,
        unit.state,
        unit.canCancel,
      ]),
      [["u2", "admitted", false]],
    );

    secondGate.resolve({ status: "succeeded" });
    await handle.completion;
    assert.isNull(queue.getActiveSubmission(handle.submissionId));
  });

  it("keeps concurrency independent across overlapping submissions", async function () {
    const queue = createQueue();
    const admitted: string[] = [];
    const gates = new Map<string, ReturnType<typeof deferred>>();
    const executeUnit = async (unit: TestUnit) => {
      admitted.push(unit.id);
      const gate = deferred();
      gates.set(unit.id, gate);
      await gate.promise;
      return { status: "succeeded" } as const;
    };

    const first = queue.enqueueSubmission(
      createConfig([{ id: "a1" }, { id: "a2" }], executeUnit, {
        maxConcurrency: 1,
      }),
    );
    const second = queue.enqueueSubmission(
      createConfig([{ id: "b1" }, { id: "b2" }], executeUnit, {
        backend: { backendType: "skillrunner", backendId: "backend-b" },
        maxConcurrency: 1,
      }),
    );
    await flushMicrotasks();

    assert.deepEqual(admitted, ["a1", "b1"]);
    gates.get("a1")!.resolve();
    await flushMicrotasks();
    assert.deepEqual(admitted, ["a1", "b1", "a2"]);
    gates.get("b1")!.resolve();
    await flushMicrotasks();
    assert.deepEqual(admitted, ["a1", "b1", "a2", "b2"]);
    gates.get("a2")!.resolve();
    gates.get("b2")!.resolve();
    await Promise.all([first.completion, second.completion]);
  });

  it("yields idempotently and resumes ahead of untouched FIFO work", async function () {
    const queue = createQueue();
    const contexts = new Map<string, WorkflowSubmissionQueueExecutionContext>();
    const gates = new Map(
      ["a", "b", "c"].map((id) => [
        id,
        deferred<WorkflowExecutionUnitOutcome>(),
      ]),
    );
    const started: string[] = [];
    const resumed: string[] = [];
    const handle = queue.enqueueSubmission(
      createConfig(
        [{ id: "a" }, { id: "b" }, { id: "c" }],
        async () => ({ status: "succeeded" }),
        {
          maxConcurrency: 1,
          executeUnit: async (unit, context) => {
            contexts.set(unit.id, context);
            started.push(unit.id);
            return gates.get(unit.id)!.promise;
          },
        },
      ),
    );

    await flushMicrotasks();
    assert.deepEqual(started, ["a"]);
    assert.isTrue(contexts.get("a")!.slot.yield("waiting-user"));
    assert.isFalse(contexts.get("a")!.slot.yield("waiting-user"));
    await flushMicrotasks();
    assert.deepEqual(started, ["a", "b"]);

    const resume = contexts
      .get("a")!
      .slot.runWithPrioritySlot("user-reply", async () => {
        resumed.push("a");
      });
    await flushMicrotasks();
    assert.deepEqual(resumed, []);
    assert.equal(
      queue.getSlotSnapshot(contexts.get("a")!.submissionUnitId)?.state,
      "resumption-pending",
    );

    gates.get("b")!.resolve({ status: "succeeded" });
    await resume;
    assert.deepEqual(resumed, ["a"]);
    assert.deepEqual(started, ["a", "b"]);
    assert.equal(
      queue.getSlotSnapshot(contexts.get("a")!.submissionUnitId)?.state,
      "held",
    );

    gates.get("a")!.resolve({ status: "succeeded" });
    await flushMicrotasks();
    assert.deepEqual(started, ["a", "b", "c"]);
    gates.get("c")!.resolve({ status: "succeeded" });
    await handle.completion;
  });

  it("aborts unsent resumptions on shutdown without leaking or sending input", async function () {
    const queue = createQueue();
    const contexts = new Map<string, WorkflowSubmissionQueueExecutionContext>();
    const gates = new Map(
      ["a", "b"].map((id) => [id, deferred<WorkflowExecutionUnitOutcome>()]),
    );
    const sent: string[] = [];
    const handle = queue.enqueueSubmission(
      createConfig(
        [{ id: "a" }, { id: "b" }],
        async () => ({ status: "succeeded" }),
        {
          maxConcurrency: 1,
          executeUnit: async (unit, context) => {
            contexts.set(unit.id, context);
            return gates.get(unit.id)!.promise;
          },
        },
      ),
    );
    await flushMicrotasks();
    contexts.get("a")!.slot.yield("waiting-auth");
    await flushMicrotasks();
    const resume = contexts
      .get("a")!
      .slot.runWithPrioritySlot("auth-reply", async () => {
        sent.push("a");
      });
    queue.shutdown();
    assert.isFalse(await resume);
    assert.deepEqual(sent, []);
    gates.get("a")!.resolve({ status: "failed", reasonCode: "shutdown" });
    gates.get("b")!.resolve({ status: "succeeded" });
    await handle.completion;
  });

  it("replaces an unsent reply admission with terminal Host apply", async function () {
    const queue = createQueue();
    const contexts = new Map<string, WorkflowSubmissionQueueExecutionContext>();
    const gates = new Map(
      ["a", "b"].map((id) => [id, deferred<WorkflowExecutionUnitOutcome>()]),
    );
    const callbacks: string[] = [];
    const handle = queue.enqueueSubmission(
      createConfig(
        [{ id: "a" }, { id: "b" }],
        async () => ({ status: "succeeded" }),
        {
          maxConcurrency: 1,
          executeUnit: async (unit, context) => {
            contexts.set(unit.id, context);
            return gates.get(unit.id)!.promise;
          },
        },
      ),
    );
    await flushMicrotasks();
    contexts.get("a")!.slot.yield("waiting-user");
    await flushMicrotasks();

    const reply = contexts
      .get("a")!
      .slot.runWithPrioritySlot("user-reply", async () => {
        callbacks.push("reply");
      });
    assert.isTrue(contexts.get("a")!.slot.cancelPendingResumption());
    const apply = contexts.get("a")!.slot.ensureSlot("host-apply");

    gates.get("b")!.resolve({ status: "succeeded" });
    assert.isFalse(await reply);
    assert.isTrue(await apply);
    assert.deepEqual(callbacks, []);
    gates.get("a")!.resolve({ status: "succeeded" });
    await handle.completion;
  });

  it("keeps yielded and resumed slots independent across submissions", async function () {
    const queue = createQueue();
    const contexts = new Map<string, WorkflowSubmissionQueueExecutionContext>();
    const gates = new Map<
      string,
      ReturnType<typeof deferred<WorkflowExecutionUnitOutcome>>
    >();
    const started: string[] = [];
    const executeUnit = async (
      unit: TestUnit,
      context: WorkflowSubmissionQueueExecutionContext,
    ) => {
      contexts.set(unit.id, context);
      started.push(unit.id);
      const gate = deferred<WorkflowExecutionUnitOutcome>();
      gates.set(unit.id, gate);
      return gate.promise;
    };
    const first = queue.enqueueSubmission(
      createConfig([{ id: "a1" }, { id: "a2" }], executeUnit, {
        maxConcurrency: 1,
      }),
    );
    const second = queue.enqueueSubmission(
      createConfig([{ id: "b1" }, { id: "b2" }], executeUnit, {
        backend: { backendType: "skillrunner", backendId: "backend-b" },
        maxConcurrency: 1,
      }),
    );
    await flushMicrotasks();
    contexts.get("a1")!.slot.yield("recoverable-failure");
    await flushMicrotasks();
    assert.deepEqual(started, ["a1", "b1", "a2"]);
    assert.equal(queue.getActiveSubmission(first.submissionId)?.admitted, 2);
    assert.equal(queue.getActiveSubmission(second.submissionId)?.admitted, 1);
    const resume = contexts
      .get("a1")!
      .slot.runWithPrioritySlot("retry", async () => undefined);
    gates.get("b1")!.resolve({ status: "succeeded" });
    await flushMicrotasks();
    assert.deepEqual(started, ["a1", "b1", "a2", "b2"]);
    assert.equal(
      queue.getSlotSnapshot(contexts.get("a1")!.submissionUnitId)?.state,
      "resumption-pending",
    );
    gates.get("a2")!.resolve({ status: "succeeded" });
    await resume;
    gates.get("a1")!.resolve({ status: "succeeded" });
    gates.get("b2")!.resolve({ status: "succeeded" });
    await Promise.all([first.completion, second.completion]);
  });

  it("freezes safe display identities with stable non-numeric symbols", async function () {
    const queue = createQueue();
    const gates: Array<
      ReturnType<typeof deferred<WorkflowExecutionUnitOutcome>>
    > = [];
    const handles = Array.from({ length: 10 }, (_, index) => {
      const gate = deferred<WorkflowExecutionUnitOutcome>();
      gates.push(gate);
      return queue.enqueueSubmission(
        createConfig([{ id: `u${index}` }], () => gate.promise, {
          presentation: {
            provider: index === 0 ? "openai" : "",
            model: index === 0 ? "gpt-5" : "",
          },
        }),
      );
    });
    const identities = handles.map((handle) =>
      queue.getSubmissionDisplayIdentity(handle.submissionId),
    );
    assert.equal(new Set(identities.map((entry) => entry?.symbol)).size, 10);
    assert.deepInclude(identities[0], {
      symbol: "🌙",
      provider: "openai",
      model: "gpt-5",
    });
    assert.deepInclude(identities[8], {
      symbol: "🌙🌙",
      provider: "default",
      model: "default",
    });
    for (const identity of identities) {
      assert.notMatch(identity!.symbol, /[0-9#]/u);
      assert.deepEqual(Object.keys(identity!).sort(), [
        "model",
        "provider",
        "symbol",
      ]);
    }
    gates.forEach((gate) => gate.resolve({ status: "succeeded" }));
    await Promise.all(handles.map((handle) => handle.completion));
  });

  for (const maxConcurrency of [undefined, 0] as const) {
    it(`treats ${String(maxConcurrency)} concurrency as unlimited`, async function () {
      const queue = createQueue();
      const admitted: string[] = [];
      const gate = deferred();
      const config = createConfig(
        [{ id: "u1" }, { id: "u2" }, { id: "u3" }],
        async (unit) => {
          admitted.push(unit.id);
          await gate.promise;
          return { status: "succeeded" };
        },
        { maxConcurrency },
      );
      const handle = queue.enqueueSubmission(config);
      await flushMicrotasks();

      assert.deepEqual(admitted, ["u1", "u2", "u3"]);
      assert.deepEqual(queue.listQueued(), []);
      gate.resolve();
      await handle.completion;
    });
  }

  it("cancels only pending units and counts them as skipped", async function () {
    const queue = createQueue();
    const firstGate = deferred<WorkflowExecutionUnitOutcome>();
    const executed: string[] = [];
    const handle = queue.enqueueSubmission(
      createConfig(
        [{ id: "u1" }, { id: "u2" }],
        async (unit) => {
          executed.push(unit.id);
          return unit.id === "u1" ? firstGate.promise : { status: "succeeded" };
        },
        {
          maxConcurrency: 1,
          initialOutcomes: [
            { status: "skipped", reasonCode: "duplicate-refused" },
          ],
        },
      ),
    );
    const queued = queue.listQueued();
    const secondQueueId = queued.find(
      (entry) => entry.unitId === "u2",
    )!.queueId;

    await flushMicrotasks();
    assert.deepEqual(queue.cancel(secondQueueId), {
      status: "canceled",
      queueId: secondQueueId,
    });
    assert.deepEqual(queue.cancel(secondQueueId), {
      status: "not-pending",
      queueId: secondQueueId,
    });
    assert.equal(
      queue
        .getActiveSubmission(handle.submissionId)!
        .units.find((entry) => entry.queueId === secondQueueId),
      undefined,
    );
    firstGate.resolve({ status: "succeeded" });

    assert.deepEqual(await handle.completion, {
      submissionId: handle.submissionId,
      total: 3,
      succeeded: 1,
      failed: 0,
      skipped: 2,
    });
    assert.deepEqual(executed, ["u1"]);
  });

  it("makes cancel and admission race through one pending transition", async function () {
    const queue = createQueue();
    const executed: string[] = [];
    const cancellationWins = queue.enqueueSubmission(
      createConfig([{ id: "cancel-first" }], async (unit) => {
        executed.push(unit.id);
        return { status: "succeeded" };
      }),
    );
    const cancelFirstId = queue.listQueued()[0]!.queueId;
    assert.equal(queue.cancel(cancelFirstId).status, "canceled");
    await flushMicrotasks();
    assert.deepEqual(executed, []);
    await cancellationWins.completion;

    const admissionWins = queue.enqueueSubmission(
      createConfig([{ id: "admit-first" }], async (unit) => {
        executed.push(unit.id);
        return { status: "succeeded" };
      }),
    );
    const admitFirstId = queue.listQueued()[0]!.queueId;
    await flushMicrotasks();
    assert.deepEqual(queue.cancel(admitFirstId), {
      status: "not-pending",
      queueId: admitFirstId,
    });
    await admissionWins.completion;
    assert.deepEqual(executed, ["admit-first"]);
  });

  it("publishes immutable sanitized snapshots without polling", async function () {
    const queue = createQueue();
    const events: string[] = [];
    const unsubscribe = queue.subscribe((event) => {
      events.push(
        event.type === "reset"
          ? event.type
          : `${event.type}:${event.reason ?? ""}`,
      );
    });
    const gate = deferred<WorkflowExecutionUnitOutcome>();
    const handle = queue.enqueueSubmission(
      createConfig(
        [{ id: "u1", secret: "credential-value" }],
        () => gate.promise,
      ),
    );
    const snapshot = queue.listQueued({
      backendType: "skillrunner",
      backendId: "backend-a",
    });

    assert.equal(Object.isFrozen(snapshot), true);
    assert.equal(Object.isFrozen(snapshot[0]), true);
    assert.notProperty(snapshot[0], "unit");
    assert.notInclude(JSON.stringify(snapshot), "credential-value");
    assert.deepEqual(events, ["added:"]);

    await flushMicrotasks();
    assert.deepEqual(events, ["added:", "removed:admitted"]);
    unsubscribe();
    gate.resolve({ status: "succeeded" });
    await handle.completion;
  });

  it("indexes every grouped member while exposing only label and count", async function () {
    const queue = createQueue();
    const gate = deferred<WorkflowExecutionUnitOutcome>();
    const config = createConfig([{ id: "group" }], () => gate.promise);
    const handle = queue.enqueueSubmission({
      ...config,
      units: [
        {
          unit: { id: "group" },
          display: {
            unitId: "group",
            order: 0,
            taskName: "Two papers",
            inputUnitIdentity: "group:paper-a+paper-b",
            memberIdentities: ["paper-a", "paper-b"],
            memberCount: 2,
          },
        },
      ],
    });

    assert.isTrue(
      queue.hasActiveOrQueuedWorkflowInput({
        workflowId: "workflow-a",
        inputUnitIdentity: "paper-a",
      }),
    );
    assert.isTrue(
      queue.hasActiveOrQueuedWorkflowInput({
        workflowId: "workflow-a",
        inputUnitIdentity: "paper-b",
      }),
    );
    assert.deepInclude(queue.listQueued()[0], {
      taskName: "Two papers",
      memberCount: 2,
    });
    assert.notProperty(queue.listQueued()[0], "inputUnitIdentity");
    assert.notProperty(queue.listQueued()[0], "memberIdentities");

    await flushMicrotasks();
    assert.deepEqual(queue.listQueued(), []);
    const active = queue.getActiveSubmission(handle.submissionId)!;
    assert.deepInclude(active.units[0], {
      taskName: "Two papers",
      memberCount: 2,
    });
    assert.notInclude(JSON.stringify(active), "paper-a");
    assert.notInclude(JSON.stringify(active), "paper-b");
    assert.isTrue(
      queue.hasActiveOrQueuedWorkflowInput({
        workflowId: "workflow-a",
        inputUnitIdentity: "paper-a",
      }),
    );
    assert.isTrue(
      queue.hasActiveOrQueuedWorkflowInput({
        workflowId: "workflow-a",
        inputUnitIdentity: "paper-b",
      }),
    );
    gate.resolve({ status: "succeeded" });
    await handle.completion;
    assert.isFalse(
      queue.hasActiveOrQueuedWorkflowInput({
        workflowId: "workflow-a",
        inputUnitIdentity: "paper-a",
      }),
    );
  });

  it("stops admission and discards pending units during shutdown", async function () {
    const queue = createQueue();
    const gate = deferred<WorkflowExecutionUnitOutcome>();
    const events: string[] = [];
    const terminalSummaries: unknown[] = [];
    queue.subscribe((event) => events.push(event.type));
    const handle = queue.enqueueSubmission(
      createConfig(
        [{ id: "u1" }, { id: "u2" }],
        (unit) =>
          unit.id === "u1"
            ? gate.promise
            : Promise.resolve({ status: "succeeded" }),
        {
          maxConcurrency: 1,
          onTerminal: (summary) => terminalSummaries.push(summary),
        },
      ),
    );
    await flushMicrotasks();
    queue.shutdown();

    assert.deepEqual(queue.listQueued(), []);
    assert.include(events, "reset");
    assert.throws(
      () =>
        queue.enqueueSubmission(
          createConfig([{ id: "late" }], async () => ({ status: "succeeded" })),
        ),
      /shutting down/i,
    );

    gate.resolve({ status: "succeeded" });
    const summary = await handle.completion;
    assert.deepEqual(summary, {
      submissionId: handle.submissionId,
      total: 2,
      succeeded: 1,
      failed: 0,
      skipped: 1,
    });
    assert.deepEqual(terminalSummaries, [summary]);

    queue.start();
    assert.isFalse(queue.isShuttingDown);
    const restarted = queue.enqueueSubmission(
      createConfig([{ id: "fresh" }], async () => ({ status: "succeeded" })),
    );
    await restarted.completion;
  });
});
