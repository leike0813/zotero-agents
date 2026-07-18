import { assert } from "chai";
import { createAcpSilentTerminalAssistantCollector } from "../../src/modules/acpSilentTerminalAssistantCollector";

describe("ACP silent terminal assistant collector", function () {
  this.timeout(10_000);

  const text = (value: string) => ({
    sessionUpdate: "agent_message_chunk",
    content: { type: "text", text: value },
  });

  for (const sessionUpdate of [
    "tool_call_update",
    "usage_update",
    "status_update",
    "workspace_activity",
    "current_mode_update",
    "config_option_update",
    "session_info_update",
  ]) {
    it(`preserves consecutive assistant text across ${sessionUpdate}`, function () {
      const collector = createAcpSilentTerminalAssistantCollector();
      collector.update(text("one"));
      collector.update({ sessionUpdate });
      collector.update(text(" two"));

      assert.equal(collector.take(), "one two");
      assert.equal(collector.take(), "");
    });
  }

  for (const sessionUpdate of [
    "tool_call",
    "plan",
    "user_message_chunk",
    "turn_boundary",
    "agent_thought_chunk",
  ]) {
    it(`discards the prior candidate at ${sessionUpdate}`, function () {
      const collector = createAcpSilentTerminalAssistantCollector();
      collector.update(text("discarded"));
      collector.update({ sessionUpdate });
      collector.update(text("kept"));

      assert.equal(collector.take(), "kept");
    });
  }

  it("preserves the candidate at a terminal boundary", function () {
    const collector = createAcpSilentTerminalAssistantCollector();
    collector.update(text("final"));
    collector.update({ sessionUpdate: "request_terminal" });

    assert.equal(collector.take(), "final");
  });

  it("ignores empty and non-text assistant content", function () {
    const collector = createAcpSilentTerminalAssistantCollector();
    collector.update(text("kept"));
    collector.update(text(""));
    collector.update({
      sessionUpdate: "agent_message_chunk",
      content: { type: "image", text: "ignored" },
    });

    assert.equal(collector.take(), "kept");
  });

  it("resets and discards without exposing retained text", function () {
    const collector = createAcpSilentTerminalAssistantCollector();
    collector.update(text("reset"));
    collector.reset();
    assert.equal(collector.take(), "");

    collector.update(text("discard"));
    collector.discard();
    assert.equal(collector.take(), "");
  });
});
