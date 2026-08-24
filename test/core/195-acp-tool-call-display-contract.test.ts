import { assert } from "chai";
import {
  applyAcpToolCallDisplayUpdate,
  selectAcpToolCallDisplay,
  type AcpToolCallDisplayState,
} from "../../src/shared/acpToolCallDisplay";

describe("ACP tool-call display contract", function () {
  this.timeout(10_000);

  describe("applyAcpToolCallDisplayUpdate", function () {
    it("prefers canonical fields and preserves structured display data", function () {
      const display = applyAcpToolCallDisplayUpdate(undefined, {
        toolCallId: "call-1",
        name: "read_file",
        tool: "legacy_read",
        title: "Reading configuration",
        kind: "read",
        rawInput: { path: "config.json", limit: 20 },
        input: { path: "legacy.json" },
        content: [
          { type: "content", content: { type: "text", text: "Finished" } },
          { type: "content", content: { type: "text", text: "successfully" } },
        ],
        rawOutput: { ignored: true },
        summary: "legacy summary",
      });

      assert.deepEqual(display, {
        toolName: "read_file",
        title: "Reading configuration",
        kind: "read",
        inputSummary: '{"path":"config.json","limit":20}',
        resultSummary: "Finished successfully",
        summary: "legacy summary",
      });
    });

    it("merges partial updates without clearing or replacing frozen input", function () {
      const initial = applyAcpToolCallDisplayUpdate(undefined, {
        toolCallId: "call-1",
        tool: "legacy_read",
        title: "Tool Call",
        kind: "read",
        rawInput: { path: "first.json" },
        summary: "[]",
      });
      const updated = applyAcpToolCallDisplayUpdate(initial, {
        toolCallId: "call-1",
        name: "read_file",
        title: "Reading first file",
        kind: "future-kind",
        rawInput: { path: "second.json" },
        rawOutput: { ok: true },
      });
      const unchanged = applyAcpToolCallDisplayUpdate(updated, {
        toolCallId: "call-1",
        name: null,
        title: "",
        rawOutput: null,
      });

      assert.deepEqual(updated, {
        toolName: "read_file",
        title: "Reading first file",
        kind: "other",
        inputSummary: '{"path":"first.json"}',
        resultSummary: '{"ok":true}',
      });
      assert.deepEqual(unchanged, updated);
    });

    it("uses exact field-aware compatibility filtering", function () {
      const circular: Record<string, unknown> = {};
      circular.self = circular;

      assert.deepEqual(
        applyAcpToolCallDisplayUpdate(undefined, {
          toolCallId: "call_abc123",
          tool: "call_abc123",
          functionName: "callback",
          title: "Call call_abc123",
          metadata: { title: "Inspect callback" },
          rawInput: circular,
          input: "[]",
          rawOutput: "{}",
          summary: "{}",
        }),
        {
          toolName: "callback",
          title: "Inspect callback",
          inputSummary: "[]",
          resultSummary: "{}",
        },
      );
    });

    it("bounds display values by Unicode code point", function () {
      const display = applyAcpToolCallDisplayUpdate(undefined, {
        name: "😀".repeat(300),
        title: "t".repeat(600),
        rawInput: "i".repeat(1_100),
        rawOutput: "r".repeat(1_100),
      });

      assert.lengthOf(Array.from(display.toolName || ""), 256);
      assert.lengthOf(Array.from(display.title || ""), 512);
      assert.lengthOf(Array.from(display.inputSummary || ""), 1_024);
      assert.lengthOf(Array.from(display.resultSummary || ""), 1_024);
      assert.match(display.toolName || "", /…$/);
      assert.match(display.title || "", /…$/);
    });
  });

  describe("selectAcpToolCallDisplay", function () {
    it("selects distinct compact primary and secondary text", function () {
      const display: AcpToolCallDisplayState = {
        toolName: "read_file",
        title: "Reading configuration",
        kind: "read",
        inputSummary: '{"path":"config.json"}',
      };

      assert.deepEqual(selectAcpToolCallDisplay(display), {
        primary: "read_file",
        secondary: '{"path":"config.json"}',
      });
    });

    it("skips duplicate text and retains compatibility fallback", function () {
      assert.deepEqual(
        selectAcpToolCallDisplay({
          toolName: "read_file",
          title: "read_file",
          inputSummary: "read_file",
          summary: "legacy detail",
          resultSummary: "done",
        }),
        { primary: "read_file", secondary: "legacy detail" },
      );
      assert.deepEqual(
        selectAcpToolCallDisplay({
          title: "Tool Call",
          kind: "other",
          summary: "legacy detail",
        }),
        { primary: undefined, secondary: "legacy detail" },
      );
      assert.deepEqual(
        selectAcpToolCallDisplay({
          kind: "future-kind" as AcpToolCallDisplayState["kind"],
          resultSummary: "done",
        }),
        { primary: undefined, secondary: "done" },
      );
    });
  });
});
