import { assert } from "chai";
import {
  getProjectRoot,
  joinPath,
  readUtf8,
} from "../zotero/workflow-test-utils";

type ThinkingChatModel = {
  consume: (event: Record<string, unknown>) => boolean;
  toggleThinking: (id: string) => boolean;
  setDisplayMode: (mode: string) => string;
  getDisplayMode: () => string;
  getEntries: () => Array<Record<string, unknown>>;
};

async function loadThinkingChatCore() {
  const script = await readUtf8(
    joinPath(
      getProjectRoot(),
      "addon",
      "content",
      "sidebar",
      "chat_thinking_core.js",
    ),
  );
  const windowObject: Record<string, unknown> = {};
  const factory = new Function(
    "window",
    `${script}\nreturn window.SkillRunnerThinkingChatCore;`,
  );
  return factory(windowObject) as {
    createThinkingChatModel: (mode?: string) => ThinkingChatModel;
  };
}

function event(args: {
  seq: number;
  role: "assistant" | "user" | "system";
  kind: string;
  text?: string;
  displayText?: string;
  attempt?: number;
  messageId?: string;
  messageFamilyId?: string;
  replacesMessageId?: string;
  processType?: string;
}) {
  return {
    seq: args.seq,
    role: args.role,
    kind: args.kind,
    text: args.text ?? "",
    ...(args.displayText ? { displayText: args.displayText } : {}),
    attempt: args.attempt ?? 1,
    correlation: {
      ...(args.messageId ? { message_id: args.messageId } : {}),
      ...(args.messageFamilyId
        ? { message_family_id: args.messageFamilyId }
        : {}),
      ...(args.replacesMessageId
        ? { replaces_message_id: args.replacesMessageId }
        : {}),
      ...(args.processType ? { process_type: args.processType } : {}),
    },
  };
}

describe("skillrunner chat thinking core", function () {
  it("defaults to plain mode and exposes mode controls", async function () {
    const core = await loadThinkingChatCore();
    const model = core.createThinkingChatModel();
    assert.equal(model.getDisplayMode(), "plain");
    assert.equal(model.setDisplayMode("bubble"), "bubble");
    assert.equal(model.getDisplayMode(), "bubble");
    assert.equal(model.setDisplayMode("weird"), "plain");
  });

  it("projects assistant_message as direct message in plain mode", async function () {
    const core = await loadThinkingChatCore();
    const model = core.createThinkingChatModel("plain");
    model.consume(
      event({
        seq: 1,
        role: "assistant",
        kind: "assistant_process",
        text: "calling tool",
        messageId: "p-1",
        processType: "tool_call",
      }),
    );
    model.consume(
      event({
        seq: 2,
        role: "assistant",
        kind: "assistant_message",
        text: "draft answer",
        messageId: "m-1",
      }),
    );
    const entries = model.getEntries();
    assert.lengthOf(entries, 2);
    assert.equal(entries[0].type, "thinking");
    assert.equal(entries[1].type, "message");
    assert.equal(entries[1].atomKind, "intermediate");
  });

  it("projects assistant_message into thinking drawer in bubble mode", async function () {
    const core = await loadThinkingChatCore();
    const model = core.createThinkingChatModel("bubble");
    model.consume(
      event({
        seq: 1,
        role: "assistant",
        kind: "assistant_process",
        text: "calling tool",
        messageId: "p-1",
        processType: "tool_call",
      }),
    );
    model.consume(
      event({
        seq: 2,
        role: "assistant",
        kind: "assistant_message",
        text: "draft answer",
        messageId: "m-1",
      }),
    );
    const entries = model.getEntries();
    assert.lengthOf(entries, 1);
    assert.equal(entries[0].type, "thinking");
    const items = Array.isArray(entries[0].items) ? entries[0].items : [];
    assert.lengthOf(items, 2);
    assert.equal(items[1].itemKind, "assistant_message");
  });

  it("prefers replaces_message_id when removing intermediate on final convergence", async function () {
    const core = await loadThinkingChatCore();
    const model = core.createThinkingChatModel("plain");
    model.consume(
      event({
        seq: 1,
        role: "assistant",
        kind: "assistant_message",
        text: "draft answer",
        messageId: "m-1",
      }),
    );
    model.consume(
      event({
        seq: 2,
        role: "assistant",
        kind: "assistant_final",
        text: "final answer",
        messageId: "f-1",
        replacesMessageId: "m-1",
      }),
    );
    const entries = model.getEntries();
    assert.lengthOf(entries, 1);
    assert.equal(entries[0].type, "message");
    assert.equal(entries[0].atomKind, "final");
  });

  it("reprojects the same canonical timeline when switching display mode", async function () {
    const core = await loadThinkingChatCore();
    const model = core.createThinkingChatModel("plain");
    model.consume(
      event({
        seq: 1,
        role: "assistant",
        kind: "assistant_process",
        text: "thinking",
        messageId: "p-1",
      }),
    );
    model.consume(
      event({
        seq: 2,
        role: "assistant",
        kind: "assistant_message",
        text: "draft answer",
        messageId: "m-1",
      }),
    );
    const plainEntries = model.getEntries();
    assert.lengthOf(plainEntries, 2);
    model.setDisplayMode("bubble");
    const bubbleEntries = model.getEntries();
    assert.lengthOf(bubbleEntries, 1);
    const bubbleItems = Array.isArray(bubbleEntries[0].items)
      ? bubbleEntries[0].items
      : [];
    assert.lengthOf(bubbleItems, 2);
    model.setDisplayMode("plain");
    const plainAgain = model.getEntries();
    assert.lengthOf(plainAgain, 2);
    assert.equal(plainAgain[1].atomKind, "intermediate");
  });

  it("renders already-projected final text without local structured dispatch", async function () {
    const core = await loadThinkingChatCore();
    const model = core.createThinkingChatModel("plain");
    model.consume(
      event({
        seq: 3,
        role: "assistant",
        kind: "assistant_final",
        text: "Rendered final answer",
        messageId: "f-1",
      }),
    );
    const entries = model.getEntries();
    assert.lengthOf(entries, 1);
    assert.equal(entries[0].type, "message");
    assert.equal(entries[0].atomKind, "final");
    assert.equal(
      (entries[0].event as Record<string, unknown>).text,
      "Rendered final answer",
    );
  });

  it("turns superseded finals into folded revision entries and keeps only winner final visible", async function () {
    const core = await loadThinkingChatCore();
    const model = core.createThinkingChatModel("bubble");
    model.consume(
      event({
        seq: 1,
        role: "assistant",
        kind: "assistant_final",
        text: "Rejected final",
        messageId: "f-1",
        messageFamilyId: "family-1",
      }),
    );
    model.consume(
      event({
        seq: 2,
        role: "assistant",
        kind: "assistant_revision",
        text: "",
        messageId: "f-1",
        messageFamilyId: "family-1",
      }),
    );
    model.consume(
      event({
        seq: 3,
        role: "assistant",
        kind: "assistant_final",
        text: "Winning final",
        messageId: "f-2",
        messageFamilyId: "family-1",
      }),
    );
    const entries = model.getEntries();
    assert.lengthOf(entries, 2);
    assert.equal(entries[0].type, "revision");
    assert.equal(entries[0].collapsed, true);
    assert.equal(entries[1].type, "message");
    assert.equal(entries[1].atomKind, "final");
    assert.equal(
      (entries[1].event as Record<string, unknown>).text,
      "Winning final",
    );
  });

  it("keeps separate revision entries for multiple rejected finals in one family", async function () {
    const core = await loadThinkingChatCore();
    const model = core.createThinkingChatModel("plain");
    model.consume(
      event({
        seq: 1,
        role: "assistant",
        kind: "assistant_final",
        text: "Rejected final one",
        messageId: "f-1",
        messageFamilyId: "family-1",
      }),
    );
    model.consume(
      event({
        seq: 2,
        role: "assistant",
        kind: "assistant_revision",
        messageId: "f-1",
        messageFamilyId: "family-1",
      }),
    );
    model.consume(
      event({
        seq: 3,
        role: "assistant",
        kind: "assistant_final",
        text: "Rejected final two",
        messageId: "f-2",
        messageFamilyId: "family-1",
      }),
    );
    model.consume(
      event({
        seq: 4,
        role: "assistant",
        kind: "assistant_revision",
        messageId: "f-2",
        messageFamilyId: "family-1",
      }),
    );
    model.consume(
      event({
        seq: 5,
        role: "assistant",
        kind: "assistant_final",
        text: "Winning final",
        messageId: "f-3",
        messageFamilyId: "family-1",
      }),
    );
    const entries = model.getEntries();
    assert.deepEqual(
      entries.map((entry) => entry.type),
      ["revision", "revision", "message"],
    );
  });

  it("toggles revision folding without duplicating the rejected final body", async function () {
    const core = await loadThinkingChatCore();
    const model = core.createThinkingChatModel("plain");
    model.consume(
      event({
        seq: 1,
        role: "assistant",
        kind: "assistant_final",
        text: "Rejected final",
        messageId: "f-1",
      }),
    );
    model.consume(
      event({
        seq: 2,
        role: "assistant",
        kind: "assistant_revision",
        messageId: "f-1",
      }),
    );
    let entries = model.getEntries();
    assert.equal(entries[0].type, "revision");
    assert.equal(entries[0].collapsed, true);
    assert.equal(
      (entries[0] as Record<string, unknown>).originalEvent["text"],
      "Rejected final",
    );
    assert.equal(model.toggleRevision("revision-1-f-1"), true);
    entries = model.getEntries();
    assert.equal(entries[0].collapsed, false);
    assert.equal(
      (entries[0] as Record<string, unknown>).originalEvent["text"],
      "Rejected final",
    );
  });
});
