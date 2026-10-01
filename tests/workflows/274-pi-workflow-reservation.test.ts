import { assert } from "chai";
import {
  WorkflowSubmissionQueue,
  type WorkflowSubmissionQueueDeps,
} from "../../src/jobQueue/workflowSubmissionQueue";
import type { PiWorkflowReservation } from "../../src/jobQueue/workflowSubmissionQueueContracts";
import { submitPreparedWorkflowUnits } from "../../src/modules/workflowExecution/submissionSeam";
import {
  BUILTIN_PI_BACKEND_ID,
  BUILTIN_PI_BACKEND_TYPE,
} from "../../src/config/defaults";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createQueue() {
  const scheduled: Array<() => void> = [];
  let submissionSequence = 0;
  let queueSequence = 0;
  const deps: WorkflowSubmissionQueueDeps = {
    now: () => "2026-10-01T00:00:00.000Z",
    createSubmissionId: () =>
      ("workflow-submission-test-" + ++submissionSequence) as never,
    createQueueId: () => ("workflow-queue-test-" + ++queueSequence) as never,
    scheduleMicrotask: (run) => scheduled.push(run),
    appendRuntimeLog: () => null,
  };
  return { queue: new WorkflowSubmissionQueue(deps), scheduled };
}

async function flush(scheduled: Array<() => void>) {
  for (let index = 0; index < 8; index += 1) {
    scheduled.shift()?.();
    await Promise.resolve();
  }
}

function units(count: number) {
  return Array.from({ length: count }, (_unused, index) => ({
    unitId: "unit-" + (index + 1),
    order: index,
    taskName: "Pi task " + (index + 1),
    inputUnitIdentity: "item:" + (index + 1),
    memberIdentities: ["item:" + (index + 1)],
    memberCount: 1,
  }));
}

function piArgs(options: { units: number; maxConcurrency?: number }) {
  return {
    prepared: {
      workflow: { manifest: { id: "pi-workflow" } },
      executionContext: {
        backend: { type: BUILTIN_PI_BACKEND_TYPE, id: BUILTIN_PI_BACKEND_ID },
        providerOptions: { model: "pi-model" },
      },
      executionOptions: {
        hostOptions: { queue: { maxConcurrency: options.maxConcurrency } },
      },
    } as any,
    units: units(options.units) as any,
    workflowLabel: "Pi workflow",
    skippedByGuard: 0,
    messageFormatter: (() => "") as any,
  };
}

function reservation(
  overrides: Partial<PiWorkflowReservation> = {},
): PiWorkflowReservation {
  return Object.freeze({
    submissionId:
      "workflow-submission-recovered-1" as PiWorkflowReservation["submissionId"],
    submissionUnitId:
      "workflow-queue-recovered-1" as PiWorkflowReservation["submissionUnitId"],
    workflowId: "pi-workflow",
    workflowLabel: "Pi workflow",
    backendId: BUILTIN_PI_BACKEND_ID,
    unitId: "unit-1",
    unitOrder: 0,
    taskName: "Recovered Pi task",
    inputUnitIdentity: "item:recovered",
    memberIdentities: Object.freeze(["item:recovered"]),
    unitCount: 1,
    maxConcurrency: 1,
    state: "held",
    ownerId: "pi-skill-recovered-1",
    ...overrides,
  });
}

describe("builtin-pi workflow submission reservation", function () {
  it("keeps the recovery admission barrier when the queue starts", function () {
    const { queue } = createQueue();
    queue.setPiAdmissionBarrier(true);
    queue.start();
    assert.isTrue(queue.isPiAdmissionBlocked);
    queue.setPiAdmissionBarrier(false);
    assert.isFalse(queue.isPiAdmissionBlocked);
  });

  it("routes new builtin-pi units through the existing queue concurrency", async function () {
    const { queue, scheduled } = createQueue();
    const gate = deferred();
    const observed: string[] = [];
    const submission = await submitPreparedWorkflowUnits(
      piArgs({ units: 2, maxConcurrency: 1 }),
      {
        submissionQueue: queue,
        appendRuntimeLog: () => undefined,
        executePreparedUnit: async ({ unit }: any) => {
          observed.push(unit.unitId);
          await gate.promise;
          return { outcome: { status: "succeeded" } };
        },
      } as any,
    );

    assert.equal(submission.admission, "host-queue");
    assert.equal(submission.queued, 2);
    assert.deepEqual(
      queue.listQueued().map((entry) => entry.backendType + ":" + entry.unitId),
      ["builtin-pi:unit-1", "builtin-pi:unit-2"],
    );

    await flush(scheduled);
    assert.deepEqual(observed, ["unit-1"]);
    gate.resolve();
    await flush(scheduled);
    assert.deepEqual(observed, ["unit-1", "unit-2"]);
  });

  it("publishes a reservation descriptor for an admitted builtin-pi unit", async function () {
    const { queue, scheduled } = createQueue();
    const gate = deferred();
    let context: any = null;
    const submission = await submitPreparedWorkflowUnits(
      piArgs({ units: 1, maxConcurrency: 1 }),
      {
        submissionQueue: queue,
        appendRuntimeLog: () => undefined,
        executePreparedUnit: async (args: any) => {
          context = args.submissionContext ?? null;
          await gate.promise;
          return { outcome: { status: "succeeded" } };
        },
      } as any,
    );
    await flush(scheduled);
    const submissionUnitId = String(context?.submissionUnitId || "");
    const descriptor = queue.getReservation(submissionUnitId);
    assert.isDefined(descriptor);
    assert.equal(descriptor?.submissionId, submission.submissionId);
    assert.equal(descriptor?.submissionUnitId, submissionUnitId);
    assert.equal(descriptor?.workflowId, "pi-workflow");
    assert.equal(descriptor?.maxConcurrency, 1);
    assert.equal(descriptor?.state, "held");
    assert.equal(descriptor?.inputUnitIdentity, "item:1");
    assert.isTrue(
      queue.hasActiveOrQueuedWorkflowInput({
        workflowId: "pi-workflow",
        inputUnitIdentity: "item:1",
      }),
    );
    gate.resolve();
  });

  it("adopts a durable reservation without dispatching execute", async function () {
    const { queue, scheduled } = createQueue();
    const descriptor = reservation({ state: "held" });
    const slot = queue.restoreReservation(descriptor);

    assert.equal(slot.snapshot()?.state, "held");
    assert.equal(
      queue.getReservation(descriptor.submissionUnitId)?.ownerId,
      descriptor.ownerId,
    );
    assert.isTrue(
      queue.hasActiveOrQueuedWorkflowInput({
        workflowId: descriptor.workflowId,
        inputUnitIdentity: String(descriptor.inputUnitIdentity),
      }),
    );
    await flush(scheduled);
    assert.equal(slot.snapshot()?.state, "held");
    assert.isNotNull(queue.getSlotCoordinator(descriptor.submissionUnitId));
  });

  it("refuses a corrupted reservation instead of accounting it", async function () {
    const { queue } = createQueue();
    const invalid = [
      reservation({ submissionId: "" as never }),
      reservation({ submissionUnitId: "" as never }),
      reservation({ workflowId: "" }),
      reservation({ maxConcurrency: Number.NaN }),
      reservation({ maxConcurrency: -1 }),
      reservation({ maxConcurrency: Number.POSITIVE_INFINITY }),
      reservation({ unitCount: 0 }),
      reservation({ state: "bogus" as never }),
    ];

    for (const descriptor of invalid) {
      assert.throws(
        () => queue.restoreReservation(descriptor),
        /pi_workflow_reservation_invalid/,
        "expected rejection for " + JSON.stringify(descriptor),
      );
    }
    assert.isUndefined(queue.getReservation("workflow-queue-recovered-1"));
    assert.isFalse(queue.isShuttingDown);
  });

  it("rejects a second reservation claiming an occupied submission unit", async function () {
    const { queue } = createQueue();
    queue.restoreReservation(reservation({ state: "held" }));
    assert.throws(
      () =>
        queue.restoreReservation(
          reservation({ state: "yielded", ownerId: "other-owner" }),
        ),
      /pi_workflow_reservation_conflict/,
    );
  });

  it("resumes a yielded recovered unit on the same pool without a second submission", async function () {
    const { queue, scheduled } = createQueue();
    const descriptor = reservation({
      state: "yielded",
      yieldReason: "waiting-user",
    });
    const slot = queue.restoreReservation(descriptor);
    assert.equal(slot.snapshot()?.state, "yielded");
    assert.equal(slot.snapshot()?.yieldReason, "waiting-user");

    const observed: string[] = [];
    await submitPreparedWorkflowUnits(piArgs({ units: 1, maxConcurrency: 1 }), {
      submissionQueue: queue,
      appendRuntimeLog: () => undefined,
      executePreparedUnit: async ({ unit }: any) => {
        observed.push(unit.unitId);
        return { outcome: { status: "succeeded" } };
      },
    } as any);
    await flush(scheduled);
    assert.deepEqual(observed, ["unit-1"]);

    const admitted = slot.ensureSlot("user-reply");
    await flush(scheduled);
    assert.isTrue(await admitted);
    assert.equal(slot.snapshot()?.state, "held");
    assert.deepEqual(observed, ["unit-1"]);
    await flush(scheduled);
    assert.deepEqual(observed, ["unit-1"]);
  });

  it("keeps a recovered resumption-pending unit and its resume reason", async function () {
    const { queue, scheduled } = createQueue();
    const descriptor = reservation({
      state: "resumption-pending",
      resumeReason: "user-reply",
    });
    const slot = queue.restoreReservation(descriptor);
    assert.equal(slot.snapshot()?.state, "resumption-pending");
    assert.equal(slot.snapshot()?.resumeReason, "user-reply");
    await flush(scheduled);
    assert.equal(slot.snapshot()?.state, "held");
  });

  it("releases a recovered reservation and its duplicate-suppression identity", async function () {
    const { queue, scheduled } = createQueue();
    const descriptor = reservation({ state: "held" });
    queue.restoreReservation(descriptor);
    assert.isFalse(queue.releaseRecoveredReservation("workflow-queue-unknown"));
    assert.isTrue(
      queue.releaseRecoveredReservation(descriptor.submissionUnitId),
    );
    assert.isUndefined(queue.getReservation(descriptor.submissionUnitId));
    assert.isFalse(
      queue.hasActiveOrQueuedWorkflowInput({
        workflowId: descriptor.workflowId,
        inputUnitIdentity: String(descriptor.inputUnitIdentity),
      }),
    );
    await flush(scheduled);
    assert.isFalse(queue.isShuttingDown);
  });

  it("blocks only new builtin-pi admission while the barrier is set", async function () {
    const { queue, scheduled } = createQueue();
    queue.setPiAdmissionBarrier(true);
    assert.isTrue(queue.isPiAdmissionBlocked);

    let piError = "";
    try {
      await submitPreparedWorkflowUnits(piArgs({ units: 1 }), {
        submissionQueue: queue,
        appendRuntimeLog: () => undefined,
        executePreparedUnit: async () => ({
          outcome: { status: "succeeded" },
        }),
      } as any);
    } catch (error) {
      piError = error instanceof Error ? error.message : String(error);
    }
    assert.include(piError, BUILTIN_PI_BACKEND_TYPE);

    const acp = await submitPreparedWorkflowUnits(
      {
        prepared: {
          workflow: { manifest: { id: "acp-workflow" } },
          executionContext: { backend: { type: "acp", id: "acp-backend" } },
          executionOptions: {},
        } as any,
        units: units(1) as any,
        workflowLabel: "ACP workflow",
        skippedByGuard: 0,
        messageFormatter: (() => "") as any,
      },
      {
        submissionQueue: queue,
        appendRuntimeLog: () => undefined,
        executePreparedUnit: async () => ({
          outcome: { status: "succeeded" },
        }),
      } as any,
    );
    assert.equal(acp.admission, "host-queue");

    const descriptor = reservation({ state: "held" });
    assert.equal(
      queue.restoreReservation(descriptor).snapshot()?.state,
      "held",
    );

    queue.setPiAdmissionBarrier(false);
    const pi = await submitPreparedWorkflowUnits(piArgs({ units: 1 }), {
      submissionQueue: queue,
      appendRuntimeLog: () => undefined,
      executePreparedUnit: async () => ({ outcome: { status: "succeeded" } }),
    } as any);
    assert.equal(pi.admission, "host-queue");
    await flush(scheduled);
  });
});
