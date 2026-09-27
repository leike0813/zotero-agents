import { assert } from "chai";
import {
  buildWorkflowFinishMessage,
  buildWorkflowJobToastMessage,
  buildWorkflowStartToastMessage,
  buildWorkflowWaitingToastMessage,
  normalizeErrorMessage,
} from "../../src/modules/workflowExecution/workflowExecuteMessage";

describe("workflow execute message", function () {
  it("builds compact success summary without failure section", function () {
    const message = buildWorkflowFinishMessage({
      workflowLabel: "Literature Digest",
      succeeded: 2,
      failed: 0,
      failureReasons: [],
    });
    assert.equal(
      message,
      "Workflow Literature Digest finished. succeeded=2, failed=0",
    );
  });

  it("includes failure reasons and truncates overflow", function () {
    const message = buildWorkflowFinishMessage({
      workflowLabel: "Literature Digest",
      succeeded: 1,
      failed: 4,
      failureReasons: [
        "job-0: upstream timeout",
        "job-1: parent missing",
        "job-2: bundle missing",
        "job-3: applyResult failed",
      ],
    });
    assert.include(
      message,
      "Workflow Literature Digest finished. succeeded=1, failed=4",
    );
    assert.include(message, "Failure reasons:");
    assert.include(message, "1. job-0: upstream timeout");
    assert.include(message, "2. job-1: parent missing");
    assert.include(message, "3. job-2: bundle missing");
    assert.include(message, "...and 1 more");
    assert.notInclude(message, "job-3: applyResult failed");
  });

  it("normalizes unknown errors into stable strings", function () {
    assert.equal(normalizeErrorMessage(new Error("boom")), "boom");
    assert.equal(normalizeErrorMessage("failed"), "failed");
    assert.equal(normalizeErrorMessage({ code: 500 }), '{"code":500}');
  });

  it("includes skipped count when provided", function () {
    const message = buildWorkflowFinishMessage({
      workflowLabel: "Literature Digest",
      succeeded: 0,
      failed: 0,
      skipped: 1,
      failureReasons: [],
    });
    assert.equal(
      message,
      "Workflow Literature Digest finished. succeeded=0, failed=0, skipped=1",
    );
  });

  it("supports custom formatter for localized message output", function () {
    const message = buildWorkflowFinishMessage(
      {
        workflowLabel: "文献解析",
        succeeded: 1,
        failed: 2,
        skipped: 3,
        failureReasons: ["job-0: 超时", "job-1: 缺少父条目", "job-2: 回写失败"],
      },
      {
        summary: ({ workflowLabel, succeeded, failed, skipped }) =>
          `工作流 ${workflowLabel} 执行完成。成功=${succeeded}，失败=${failed}，跳过=${skipped}`,
        failureReasonsTitle: "失败原因：",
        overflow: (count) => `...还有 ${count} 条`,
        unknownError: "未知错误",
        startToast: ({ workflowLabel, totalJobs }) =>
          `开始执行 ${workflowLabel}，任务数=${totalJobs}`,
        jobToastSuccess: ({ taskLabel, index, total }) =>
          `任务完成 ${taskLabel}（${index}/${total}）`,
        jobToastFailed: ({ taskLabel, index, total, reason }) =>
          `任务失败 ${taskLabel}（${index}/${total}）：${reason}`,
      },
    );
    assert.include(message, "工作流 文献解析 执行完成。成功=1，失败=2，跳过=3");
    assert.include(message, "失败原因：");
    assert.include(message, "1. job-0: 超时");
    assert.include(message, "2. job-1: 缺少父条目");
    assert.include(message, "3. job-2: 回写失败");
  });

  it("builds default start and job toast messages", function () {
    const start = buildWorkflowStartToastMessage({
      workflowLabel: "Literature Digest",
      totalJobs: 2,
    });
    assert.equal(start, "Workflow Literature Digest started. jobs=2");

    const success = buildWorkflowJobToastMessage({
      workflowLabel: "Literature Digest",
      taskLabel: "example.md",
      index: 1,
      total: 2,
      succeeded: true,
    });
    assert.equal(
      success,
      "Workflow Literature Digest job 1/2 succeeded: example.md",
    );

    const failed = buildWorkflowJobToastMessage({
      workflowLabel: "Literature Digest",
      taskLabel: "example.md",
      index: 2,
      total: 2,
      succeeded: false,
      reason: "timeout",
    });
    assert.equal(
      failed,
      "Workflow Literature Digest job 2/2 failed: example.md (timeout)",
    );

    const waiting = buildWorkflowWaitingToastMessage({
      workflowLabel: "Literature Digest",
      pendingJobs: 1,
    });
    assert.equal(
      waiting,
      "Workflow Literature Digest is waiting for backend input. pending=1",
    );
  });
});
