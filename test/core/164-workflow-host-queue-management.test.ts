import { assert } from "chai";
import {
  WorkflowSubmissionQueue,
  type WorkflowSubmissionQueueDeps,
} from "../../src/jobQueue/workflowSubmissionQueue";
import type {
  WorkflowExecutionUnitOutcome,
  WorkflowSubmissionQueueConfig,
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
    queue.subscribe((event) => events.push(event.type));
    const handle = queue.enqueueSubmission(
      createConfig(
        [{ id: "u1" }, { id: "u2" }],
        (unit) =>
          unit.id === "u1"
            ? gate.promise
            : Promise.resolve({ status: "succeeded" }),
        { maxConcurrency: 1 },
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
    assert.deepEqual(await handle.completion, {
      submissionId: handle.submissionId,
      total: 2,
      succeeded: 1,
      failed: 0,
      skipped: 1,
    });

    queue.start();
    assert.isFalse(queue.isShuttingDown);
    const restarted = queue.enqueueSubmission(
      createConfig([{ id: "fresh" }], async () => ({ status: "succeeded" })),
    );
    await restarted.completion;
  });
});
