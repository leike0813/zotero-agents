import { assert } from "chai";
import {
  runWorkflowDuplicateGuardSeam,
  runWorkflowUnitDuplicateGuardSeam,
} from "../../src/modules/workflowExecution/duplicateGuardSeam";
import type { PreparedWorkflowUnit } from "../../src/modules/workflowExecution/contracts";
import type { WorkflowTaskRecord } from "../../src/modules/taskRuntime";

function makeActiveTask(args: {
  workflowId: string;
  inputUnitIdentity: string;
  taskName: string;
  state?: "queued" | "running";
}): WorkflowTaskRecord {
  return {
    id: `task-${args.taskName}`,
    runId: "run-1",
    jobId: `job-${args.taskName}`,
    workflowId: args.workflowId,
    workflowLabel: args.workflowId,
    taskName: args.taskName,
    inputUnitIdentity: args.inputUnitIdentity,
    inputUnitLabel: args.taskName,
    state: args.state || "running",
    createdAt: "2026-02-14T00:00:00.000Z",
    updatedAt: "2026-02-14T00:00:00.000Z",
  };
}

function makePreparedUnit(
  inputUnitIdentity: string,
  taskName = "paper-a.pdf",
): PreparedWorkflowUnit {
  return {
    unitId: "unit-1",
    order: 0,
    taskName,
    inputUnitIdentity,
    selectionContext: {},
  };
}

describe("workflow duplicate guard seam", function () {
  it("allows all requests when no running duplicate exists", async function () {
    const requests = [
      {
        sourceAttachmentPaths: ["D:/paper-a.pdf"],
        taskName: "paper-a.pdf",
      },
      {
        sourceAttachmentPaths: ["D:/paper-b.pdf"],
        taskName: "paper-b.pdf",
      },
    ];
    let confirmCalls = 0;

    const result = await runWorkflowDuplicateGuardSeam(
      {
        win: {} as _ZoteroTypes.MainWindow,
        workflowId: "mineru",
        workflowLabel: "MinerU",
        requests,
      },
      {
        listActiveWorkflowTasks: () => [],
        appendRuntimeLog: () => undefined,
        confirmDuplicateSubmission: () => {
          confirmCalls += 1;
          return false;
        },
      },
    );

    assert.deepEqual(result.allowedRequests, requests);
    assert.equal(result.skippedByDuplicate, 0);
    assert.equal(confirmCalls, 0);
  });

  it("asks duplicate requests sequentially and only explicit yes passes", async function () {
    const requests = [
      {
        sourceAttachmentPaths: ["D:/paper-a.pdf"],
        taskName: "paper-a.pdf",
      },
      {
        sourceAttachmentPaths: ["D:/paper-b.pdf"],
        taskName: "paper-b.pdf",
      },
      {
        sourceAttachmentPaths: ["D:/paper-c.pdf"],
        taskName: "paper-c.pdf",
      },
    ];
    const active = [
      makeActiveTask({
        workflowId: "mineru",
        inputUnitIdentity: "attachment-path:D:/paper-a.pdf",
        taskName: "running-paper-a.pdf",
      }),
      makeActiveTask({
        workflowId: "mineru",
        inputUnitIdentity: "attachment-path:D:/paper-c.pdf",
        taskName: "running-paper-c.pdf",
      }),
    ];
    const prompts: string[] = [];
    const decisions = [false, true];
    let decisionIndex = 0;

    const result = await runWorkflowDuplicateGuardSeam(
      {
        win: {} as _ZoteroTypes.MainWindow,
        workflowId: "mineru",
        workflowLabel: "MinerU",
        requests,
      },
      {
        listActiveWorkflowTasks: () => active,
        appendRuntimeLog: () => undefined,
        confirmDuplicateSubmission: ({ message }) => {
          prompts.push(message);
          const value = decisions[decisionIndex];
          decisionIndex += 1;
          return value;
        },
      },
    );

    assert.lengthOf(prompts, 2);
    assert.include(prompts[0], "paper-a.pdf");
    assert.include(prompts[1], "paper-c.pdf");

    assert.lengthOf(result.allowedRequests, 2);
    assert.deepEqual(result.allowedRequests[0], requests[1]);
    assert.deepEqual(result.allowedRequests[1], requests[2]);
    assert.equal(result.skippedByDuplicate, 1);
    assert.deepEqual(result.skippedRecords, [
      {
        index: 0,
        taskLabel: "paper-a.pdf",
        inputUnitIdentity: "attachment-path:D:/paper-a.pdf",
      },
    ]);
  });

  it("does not treat different workflow as duplicate", async function () {
    const requests = [
      {
        sourceAttachmentPaths: ["D:/paper-a.pdf"],
        taskName: "paper-a.pdf",
      },
    ];
    const active = [
      makeActiveTask({
        workflowId: "literature-analysis",
        inputUnitIdentity: "attachment-path:D:/paper-a.pdf",
        taskName: "running-paper-a.pdf",
      }),
    ];
    let confirmCalls = 0;

    const result = await runWorkflowDuplicateGuardSeam(
      {
        win: {} as _ZoteroTypes.MainWindow,
        workflowId: "mineru",
        workflowLabel: "MinerU",
        requests,
      },
      {
        listActiveWorkflowTasks: () => active,
        appendRuntimeLog: () => undefined,
        confirmDuplicateSubmission: () => {
          confirmCalls += 1;
          return false;
        },
      },
    );

    assert.lengthOf(result.allowedRequests, 1);
    assert.equal(result.skippedByDuplicate, 0);
    assert.equal(confirmCalls, 0);
  });

  it("uses queued unit identities without fabricating active tasks", async function () {
    let confirmCalls = 0;
    const unit = makePreparedUnit("attachment-path:D:/paper-a.pdf");
    const result = await runWorkflowUnitDuplicateGuardSeam(
      {
        win: {} as _ZoteroTypes.MainWindow,
        workflowId: "mineru",
        workflowLabel: "MinerU",
        units: [unit],
      },
      {
        listActiveWorkflowTasks: () => [],
        hasQueuedWorkflowInput: ({ inputUnitIdentity }) =>
          inputUnitIdentity === unit.inputUnitIdentity,
        appendRuntimeLog: () => undefined,
        confirmDuplicateSubmission: () => {
          confirmCalls += 1;
          return false;
        },
      },
    );

    assert.equal(confirmCalls, 1);
    assert.deepEqual(result.allowedUnits, []);
    assert.equal(result.skippedByDuplicate, 1);
  });

  it("drops a stale queued conflict during the final recheck", async function () {
    let queued = true;
    const unit = makePreparedUnit("attachment-path:D:/paper-a.pdf");
    const result = await runWorkflowUnitDuplicateGuardSeam(
      {
        win: {} as _ZoteroTypes.MainWindow,
        workflowId: "mineru",
        workflowLabel: "MinerU",
        units: [unit],
      },
      {
        listActiveWorkflowTasks: () => [],
        hasQueuedWorkflowInput: () => queued,
        appendRuntimeLog: () => undefined,
        confirmDuplicateSubmission: () => {
          queued = false;
          return false;
        },
      },
    );

    assert.deepEqual(result.allowedUnits, [unit]);
    assert.equal(result.skippedByDuplicate, 0);
  });

  it("rechecks an admitted conflict through the active task identity", async function () {
    let queued = true;
    let active: WorkflowTaskRecord[] = [];
    const unit = makePreparedUnit("attachment-path:D:/paper-a.pdf");
    const result = await runWorkflowUnitDuplicateGuardSeam(
      {
        win: {} as _ZoteroTypes.MainWindow,
        workflowId: "mineru",
        workflowLabel: "MinerU",
        units: [unit],
      },
      {
        listActiveWorkflowTasks: () => active,
        hasQueuedWorkflowInput: () => queued,
        appendRuntimeLog: () => undefined,
        confirmDuplicateSubmission: () => {
          queued = false;
          active = [
            makeActiveTask({
              workflowId: "mineru",
              inputUnitIdentity: unit.inputUnitIdentity!,
              taskName: "admitted-paper-a.pdf",
            }),
          ];
          return false;
        },
      },
    );

    assert.deepEqual(result.allowedUnits, []);
    assert.equal(result.skippedByDuplicate, 1);
  });
});
