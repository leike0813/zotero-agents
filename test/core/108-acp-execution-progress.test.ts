import { assert } from "chai";
import {
  finishAcpExecutionProgress,
  releaseAcpExecutionProgress,
  resetAcpExecutionProgress,
  resetAllAcpExecutionProgressForTests,
  restoreAcpExecutionProgress,
  snapshotAcpExecutionProgress,
  updateAcpExecutionProgress,
} from "../../src/modules/acpExecutionProgress";

describe("ACP execution progress", function () {
  afterEach(resetAllAcpExecutionProgressForTests);

  const text = (value: string) => ({
    sessionUpdate: "agent_message_chunk",
    content: { type: "text", text: value },
  });

  const thought = (value: string) => ({
    sessionUpdate: "agent_thought_chunk",
    content: { type: "text", text: value },
  });

  it("counts consecutive assistant chunks once without retaining text", function () {
    assert.isTrue(
      updateAcpExecutionProgress("owner", text("one")).countChanged,
    );
    assert.isFalse(
      updateAcpExecutionProgress("owner", text(" two")).countChanged,
    );
    const snapshot = snapshotAcpExecutionProgress("owner");
    assert.deepEqual(snapshot?.current, {
      assistant: 1,
      thought: 0,
      tool: 0,
    });
    assert.deepEqual(snapshot?.cumulative, {
      assistant: 1,
      thought: 0,
      tool: 0,
    });
    assert.notProperty(snapshot as any, "terminalCandidateChunks");
  });

  for (const sessionUpdate of [
    "tool_call",
    "plan",
    "user_message_chunk",
    "turn_boundary",
    "agent_thought_chunk",
  ]) {
    it(`closes the segment on ${sessionUpdate}`, function () {
      updateAcpExecutionProgress("owner", text("first"));
      const change = updateAcpExecutionProgress("owner", { sessionUpdate });
      assert.isTrue(change.segmentClosed);
      assert.isTrue(
        updateAcpExecutionProgress("owner", text("next")).countChanged,
      );
      assert.equal(snapshotAcpExecutionProgress("owner")?.current.assistant, 2);
    });
  }

  for (const sessionUpdate of [
    "tool_call_update",
    "usage_update",
    "status_update",
    "workspace_activity",
    "current_mode_update",
    "config_option_update",
    "session_info_update",
  ]) {
    it(`keeps the segment open across ${sessionUpdate}`, function () {
      updateAcpExecutionProgress("owner", text("one"));
      assert.deepEqual(updateAcpExecutionProgress("owner", { sessionUpdate }), {
        countChanged: false,
        segmentClosed: false,
      });
      assert.isFalse(
        updateAcpExecutionProgress("owner", text("two")).countChanged,
      );
    });
  }

  it("ignores empty and non-text chunks", function () {
    updateAcpExecutionProgress("owner", text(""));
    updateAcpExecutionProgress("owner", {
      sessionUpdate: "agent_message_chunk",
      content: { type: "image", text: "ignored" },
    });
    assert.equal(snapshotAcpExecutionProgress("owner")?.current.assistant, 0);
  });

  it("counts thought segments and new tool calls separately", function () {
    assert.isTrue(
      updateAcpExecutionProgress("owner", thought("thinking")).countChanged,
    );
    assert.isFalse(
      updateAcpExecutionProgress("owner", thought(" more")).countChanged,
    );
    assert.isTrue(
      updateAcpExecutionProgress("owner", {
        sessionUpdate: "tool_call",
        toolCallId: "tool-1",
      }).countChanged,
    );
    assert.isFalse(
      updateAcpExecutionProgress("owner", {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-1",
      }).countChanged,
    );
    assert.deepEqual(snapshotAcpExecutionProgress("owner")?.current, {
      assistant: 0,
      thought: 1,
      tool: 1,
    });
  });

  it("resets current counts while retaining cumulative totals", function () {
    updateAcpExecutionProgress("owner", text("first"));
    updateAcpExecutionProgress("owner", thought("thinking"));
    finishAcpExecutionProgress("owner");
    assert.isFalse(snapshotAcpExecutionProgress("owner")?.active);

    const reset = resetAcpExecutionProgress("owner");
    assert.isTrue(reset.active);
    assert.deepEqual(reset.current, { assistant: 0, thought: 0, tool: 0 });
    assert.deepEqual(reset.cumulative, {
      assistant: 1,
      thought: 1,
      tool: 0,
    });
  });

  it("promotes an unavailable owner only when the caller requests a new observed epoch", function () {
    restoreAcpExecutionProgress("legacy-owner", undefined);
    assert.equal(
      snapshotAcpExecutionProgress("legacy-owner")?.completeness,
      "unavailable",
    );

    const defaultReset = resetAcpExecutionProgress("legacy-owner");
    assert.equal(defaultReset.completeness, "unavailable");

    const promoted = resetAcpExecutionProgress("legacy-owner", {
      promoteUnavailableToComplete: true,
    });
    assert.equal(promoted.completeness, "complete");
    assert.deepEqual(promoted.current, { assistant: 0, thought: 0, tool: 0 });
    assert.deepEqual(promoted.cumulative, {
      assistant: 0,
      thought: 0,
      tool: 0,
    });
  });

  it("closes the segment at a terminal boundary without changing counts", function () {
    updateAcpExecutionProgress("owner", text("final"));
    const change = updateAcpExecutionProgress("owner", {
      sessionUpdate: "request_terminal",
    });
    assert.isTrue(change.segmentClosed);
    assert.equal(snapshotAcpExecutionProgress("owner")?.current.assistant, 1);
  });

  it("resets and releases owner state", function () {
    updateAcpExecutionProgress("owner", text("counted"));
    const reset = resetAcpExecutionProgress("owner");
    assert.deepEqual(reset.current, { assistant: 0, thought: 0, tool: 0 });
    releaseAcpExecutionProgress("owner");
    assert.isUndefined(snapshotAcpExecutionProgress("owner"));
  });
});
