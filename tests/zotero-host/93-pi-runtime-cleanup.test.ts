import { assert } from "chai";
import {
  cleanupBackgroundRuntimeForZoteroTests,
  setBackgroundRuntimeCleanupDepsForTests,
} from "../../src/modules/testRuntimeCleanup";

describe("zotero test Pi runtime cleanup", function () {
  afterEach(function () {
    setBackgroundRuntimeCleanupDepsForTests();
  });

  it("disposes both Pi coordinators, the MCP owner, the audit surface and the lifecycle timer", async function () {
    const calls: string[] = [];
    setBackgroundRuntimeCleanupDepsForTests({
      shutdownPiConversations: () => {
        calls.push("shutdownPiConversations");
      },
      shutdownPiSkillRuns: () => {
        calls.push("shutdownPiSkillRuns");
      },
      shutdownPiMcpToolSources: () => {
        calls.push("shutdownPiMcpToolSources");
      },
      shutdownPiRuntimeAudit: () => {
        calls.push("shutdownPiRuntimeAudit");
      },
      resetPiRuntimeLifecycleForTests: () => {
        calls.push("resetPiRuntimeLifecycleForTests");
      },
    });

    await cleanupBackgroundRuntimeForZoteroTests();

    assert.includeMembers(calls, [
      "shutdownPiConversations",
      "shutdownPiSkillRuns",
      "shutdownPiMcpToolSources",
      "shutdownPiRuntimeAudit",
      "resetPiRuntimeLifecycleForTests",
    ]);
    // Admission closes before any owner is disposed, so a live lifecycle can
    // never admit work into an owner that is still running.
    assert.isBelow(
      calls.indexOf("resetPiRuntimeLifecycleForTests"),
      calls.indexOf("shutdownPiSkillRuns"),
    );
  });

  it("keeps disposing the remaining Pi surfaces when one of them fails", async function () {
    const calls: string[] = [];
    setBackgroundRuntimeCleanupDepsForTests({
      shutdownPiSkillRuns: () => {
        throw new Error("pi_skill_run_dispose_failed");
      },
      shutdownPiMcpToolSources: () => {
        calls.push("shutdownPiMcpToolSources");
      },
      resetPiRuntimeLifecycleForTests: () => {
        calls.push("resetPiRuntimeLifecycleForTests");
      },
    });

    await cleanupBackgroundRuntimeForZoteroTests();

    assert.includeMembers(calls, [
      "shutdownPiMcpToolSources",
      "resetPiRuntimeLifecycleForTests",
    ]);
  });

  it("closes Pi admission before the submission queue is reset", async function () {
    const calls: string[] = [];
    setBackgroundRuntimeCleanupDepsForTests({
      resetPiRuntimeLifecycleForTests: () => {
        calls.push("resetPiRuntimeLifecycleForTests");
      },
      resetWorkflowSubmissionQueueForTests: () => {
        calls.push("resetWorkflowSubmissionQueueForTests");
      },
    });

    await cleanupBackgroundRuntimeForZoteroTests();

    assert.isBelow(
      calls.indexOf("resetPiRuntimeLifecycleForTests"),
      calls.indexOf("resetWorkflowSubmissionQueueForTests"),
    );
  });

  it("reopens every disposed Pi surface for the next test file", async function () {
    const calls: string[] = [];
    setBackgroundRuntimeCleanupDepsForTests({
      shutdownPiConversations: () => {
        calls.push("shutdownPiConversations");
      },
      shutdownPiSkillRuns: () => {
        calls.push("shutdownPiSkillRuns");
      },
      shutdownPiMcpToolSources: () => {
        calls.push("shutdownPiMcpToolSources");
      },
      shutdownPiRuntimeAudit: () => {
        calls.push("shutdownPiRuntimeAudit");
      },
      resetPiRuntimeAuditForTests: () => {
        calls.push("resetPiRuntimeAuditForTests");
      },
      resetPiSkillRunShutdownForTests: () => {
        calls.push("resetPiSkillRunShutdownForTests");
      },
      resetPiConversationShutdownForTests: () => {
        calls.push("resetPiConversationShutdownForTests");
      },
      resetPiRuntimeLifecycleForTests: () => {
        calls.push("resetPiRuntimeLifecycleForTests");
      },
    });

    await cleanupBackgroundRuntimeForZoteroTests();

    // Admission closes first, every owner is disposed, and only then is
    // anything reopened, so no live lifecycle can admit into a torn-down owner.
    assert.deepEqual(calls, [
      "resetPiRuntimeLifecycleForTests",
      "shutdownPiConversations",
      "shutdownPiSkillRuns",
      "shutdownPiMcpToolSources",
      "shutdownPiRuntimeAudit",
      "resetPiRuntimeAuditForTests",
      "resetPiSkillRunShutdownForTests",
      "resetPiConversationShutdownForTests",
    ]);
  });

  it("reopens the Pi owners even when one dispose throws", async function () {
    const calls: string[] = [];
    setBackgroundRuntimeCleanupDepsForTests({
      shutdownPiRuntimeAudit: () => {
        throw new Error("pi_audit_dispose_failed");
      },
      resetPiRuntimeAuditForTests: () => {
        calls.push("resetPiRuntimeAuditForTests");
      },
      resetPiSkillRunShutdownForTests: () => {
        calls.push("resetPiSkillRunShutdownForTests");
      },
    });

    await cleanupBackgroundRuntimeForZoteroTests();

    assert.includeMembers(calls, [
      "resetPiRuntimeAuditForTests",
      "resetPiSkillRunShutdownForTests",
    ]);
  });
});
