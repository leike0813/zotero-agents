import { assert } from "chai";
import {
  createPiTextProviderSource,
  PiRuntime,
  type PiRuntimeEvent,
  type PiTurnResult,
} from "../../src/modules/piRuntime";
import { fauxTurn } from "../fixtures/pi/fauxTurn";

async function observe(events: AsyncIterable<PiRuntimeEvent>) {
  const observed: PiRuntimeEvent[] = [];
  for await (const event of events) observed.push(event);
  return observed;
}

describe("PiRuntime transient turn", function () {
  it("streams ordered project events and one authoritative completed result", async function () {
    const session = new PiRuntime().openSession({
      sessionId: "session-success",
      modelStream: fauxTurn(["hello", " world"]),
    });
    const turn = session.runTurn({
      turnId: "turn-success",
      prompt: "reply",
      systemPrompt: "Be brief",
    });
    const [events, result] = await Promise.all([
      observe(turn.events),
      turn.result,
    ]);
    assert.deepEqual(
      events.map((event) => [event.kind, event.sequence]),
      [
        ["text_delta", 1],
        ["text_delta", 2],
        ["terminal", 3],
      ],
    );
    assert.isTrue(
      events.every((event) => event.sessionId === "session-success"),
    );
    assert.isTrue(events.every((event) => event.turnId === "turn-success"));
    assert.deepEqual(result, { status: "completed", text: "hello world" });
    assert.deepEqual(
      (events.at(-1) as Extract<PiRuntimeEvent, { kind: "terminal" }>).result,
      result,
    );
    session.dispose();
  });

  it("completes when the model stream emits no text", async function () {
    const session = new PiRuntime().openSession({
      sessionId: "session-empty",
      modelStream: fauxTurn([]),
    });
    const turn = session.runTurn({ turnId: "turn-empty", prompt: "reply" });
    assert.deepEqual(await turn.result, { status: "completed", text: "" });
    assert.deepEqual(
      (await observe(turn.events)).map((event) => event.kind),
      ["terminal"],
    );
    session.dispose();
  });

  it("accepts another turn as soon as a completed result is observed", async function () {
    const session = new PiRuntime().openSession({
      sessionId: "session-next",
      modelStream: fauxTurn(["done"]),
    });
    const first = session.runTurn({ turnId: "turn-one", prompt: "one" });
    assert.equal((await first.result).status, "completed");
    const second = session.runTurn({ turnId: "turn-two", prompt: "two" });
    assert.equal((await second.result).status, "completed");
    session.dispose();
  });

  it("rejects an overlapping turn without disturbing the active one", async function () {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => (release = resolve));
    const session = new PiRuntime().openSession({
      sessionId: "session-busy",
      modelStream: fauxTurn(["done"], { beforeChunk: () => hold }),
    });
    const first = session.runTurn({ turnId: "turn-first", prompt: "one" });
    assert.throws(
      () => session.runTurn({ turnId: "turn-second", prompt: "two" }),
      /owner_busy/,
    );
    release();
    assert.equal((await first.result).status, "completed");
    session.dispose();
  });

  it("normalizes a model failure and emits one failed terminal", async function () {
    const session = new PiRuntime().openSession({
      sessionId: "session-failed",
      modelStream: fauxTurn(["unused"], {
        beforeChunk: () => {
          throw new Error("private-provider-detail");
        },
      }),
    });
    const turn = session.runTurn({ turnId: "turn-failed", prompt: "reply" });
    const [events, result] = await Promise.all([
      observe(turn.events),
      turn.result,
    ]);
    assert.equal(result.status, "failed");
    assert.equal(
      (result as Extract<PiTurnResult, { status: "failed" }>).failure.code,
      "model_failed",
    );
    assert.equal(events.filter((event) => event.kind === "terminal").length, 1);
    assert.notInclude(
      JSON.stringify({ events, result }),
      "private-provider-detail",
    );
    session.dispose();
  });

  it("cancels once and suppresses late text after abort", async function () {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => (release = resolve));
    const session = new PiRuntime().openSession({
      sessionId: "session-cancel",
      modelStream: fauxTurn(["early", "late"], {
        beforeChunk: (index) => (index === 1 ? hold : undefined),
      }),
    });
    const turn = session.runTurn({ turnId: "turn-cancel", prompt: "reply" });
    const observed = observe(turn.events);
    await Promise.resolve();
    turn.abort();
    turn.abort();
    const result = await turn.result;
    release();
    const events = await observed;
    assert.deepEqual(result, { status: "canceled" });
    assert.equal(events.filter((event) => event.kind === "terminal").length, 1);
    assert.notInclude(JSON.stringify(events), "late");
    session.dispose();
  });

  it("disposes an active turn idempotently and rejects future turns", async function () {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => (release = resolve));
    const session = new PiRuntime().openSession({
      sessionId: "session-disposed",
      modelStream: fauxTurn(["late"], { beforeChunk: () => hold }),
    });
    const turn = session.runTurn({ turnId: "turn-active", prompt: "reply" });
    session.dispose();
    session.dispose();
    assert.deepEqual(await turn.result, { status: "canceled" });
    release();
    assert.deepEqual(
      (await observe(turn.events)).map((event) => event.kind),
      ["terminal"],
    );
    assert.throws(
      () => session.runTurn({ turnId: "turn-after-dispose", prompt: "reply" }),
      /session_disposed/,
    );
  });
});
describe("PiRuntime structured agent turn", function () {
  it("runs one whole tool batch through the seam with structured events and usage", async function () {
    const { model, source } = createPiTextProviderSource({
      steps: [
        {
          toolCalls: [
            { callId: "c1", name: "fixture_read", arguments: { q: "x" } },
          ],
        },
        { text: "final answer" },
      ],
    });
    const session = new PiRuntime().openSession({
      sessionId: "s-agent",
      model,
      source,
    });
    const events: PiRuntimeEvent[] = [];
    let calls: { callId: string; name: string }[] = [];
    const turn = session.runTurn({
      turnId: "t-agent",
      messages: [{ role: "user", text: "hi" }],
      tools: [
        {
          name: "fixture_read",
          description: "Read",
          schema: { type: "object" },
          execute: async () => {
            throw new Error("gateway_required");
          },
        },
      ],
      prepareInvocation: ({ invocationIndex }) => ({
        systemPrompt: "sys",
        messages: [
          { role: "user", text: invocationIndex === 0 ? "hi" : "hi|tool" },
        ],
      }),
      executeTools: async (request) => {
        calls = request.calls.map((call) => ({
          callId: call.callId,
          name: call.name,
        }));
        return {
          results: request.calls.map((call) => ({
            callId: call.callId,
            name: call.name,
            text: '{"ok":true}',
            isError: false,
          })),
        };
      },
      onEvent: (event) => {
        events.push(event);
      },
    });
    const result = await turn.result;
    assert.equal(result.status, "completed");
    assert.equal((result as { text?: string }).text, "final answer");
    assert.lengthOf(calls, 1);
    assert.equal(calls[0].name, "fixture_read");
    const assistant = events.find(
      (event) => event.kind === "assistant_message",
    );
    assert.isOk(assistant);
    if (assistant && assistant.kind === "assistant_message") {
      assert.equal(assistant.toolCalls[0]?.name, "fixture_read");
      assert.equal(assistant.stopReason, "toolUse");
      assert.isNumber(assistant.usage.totalTokens);
    }
    const toolResult = events.find((event) => event.kind === "tool_result");
    assert.isOk(toolResult);
    assert.lengthOf(
      events.filter((event) => event.kind === "invocation_started"),
      2,
    );
    assert.lengthOf(
      events.filter((event) => event.kind === "invocation_terminal"),
      2,
    );
    assert.equal(events.at(-1)?.kind, "terminal");
    session.dispose();
  });

  it("halts with waiting_permission without a second model call or pending tool result", async function () {
    const { model, source } = createPiTextProviderSource({
      steps: [
        { toolCalls: [{ callId: "c9", name: "fixture_write", arguments: {} }] },
        { text: "should not run" },
      ],
    });
    const session = new PiRuntime().openSession({
      sessionId: "s-perm",
      model,
      source,
    });
    const events: PiRuntimeEvent[] = [];
    const turn = session.runTurn({
      turnId: "t-perm",
      messages: [{ role: "user", text: "go" }],
      tools: [
        {
          name: "fixture_write",
          description: "Write",
          schema: { type: "object" },
          execute: async () => ({ text: "x" }),
        },
      ],
      prepareInvocation: ({ invocationIndex }) => ({
        messages: [
          { role: "user", text: invocationIndex === 0 ? "go" : "go|result" },
        ],
      }),
      executeTools: async () => ({ results: [], suspended: true }),
      onEvent: (event) => {
        events.push(event);
      },
    });
    const result = await turn.result;
    assert.equal(result.status, "waiting_permission");
    assert.equal(
      events.some((event) => event.kind === "tool_result"),
      false,
    );
    assert.lengthOf(
      events.filter((event) => event.kind === "invocation_started"),
      1,
    );
    session.dispose();
  });

  it("fails closed when preparation throws without a canonical invocation or assistant message", async function () {
    const { model, source } = createPiTextProviderSource({
      steps: [{ text: "unused" }],
    });
    const session = new PiRuntime().openSession({
      sessionId: "s-prep",
      model,
      source,
    });
    const events: PiRuntimeEvent[] = [];
    const turn = session.runTurn({
      turnId: "t-prep",
      messages: [{ role: "user", text: "hi" }],
      prepareInvocation: () => {
        throw new Error("preparation_contract_invalid");
      },
      onEvent: (event) => {
        events.push(event);
      },
    });
    const result = await turn.result;
    assert.equal(result.status, "failed");
    if (result.status === "failed")
      assert.equal(result.failure.code, "preparation_failed");
    assert.equal(
      events.some((event) => event.kind === "invocation_started"),
      false,
    );
    assert.equal(
      events.some((event) => event.kind === "assistant_message"),
      false,
    );
    session.dispose();
  });
});
describe("PiRuntime halt and cancellation boundaries", function () {
  it("halts as state_unknown without another model request when an effect is unverifiable", async function () {
    const { model, source } = createPiTextProviderSource({
      steps: [
        { toolCalls: [{ callId: "c1", name: "fixture_write", arguments: {} }] },
        { text: "should not run" },
      ],
    });
    const session = new PiRuntime().openSession({
      sessionId: "s-unknown",
      model,
      source,
    });
    const events: PiRuntimeEvent[] = [];
    const turn = session.runTurn({
      turnId: "t-unknown",
      messages: [{ role: "user", text: "go" }],
      tools: [
        {
          name: "fixture_write",
          description: "Write",
          schema: { type: "object" },
          execute: async () => ({ text: "x" }),
        },
      ],
      prepareInvocation: ({ invocationIndex }) => ({
        messages: [
          { role: "user", text: invocationIndex === 0 ? "go" : "go|result" },
        ],
      }),
      executeTools: async (request) => ({
        results: request.calls.map((call) => ({
          callId: call.callId,
          name: call.name,
          text: "{}",
          isError: false,
          effectCertainty: "unknown" as const,
        })),
      }),
      onEvent: (event) => {
        events.push(event);
      },
    });
    const result = await turn.result;
    assert.equal(result.status, "state_unknown");
    assert.lengthOf(
      events.filter((event) => event.kind === "invocation_started"),
      1,
    );
    assert.equal(
      events.some(
        (event) =>
          event.kind === "assistant_message" && event.text === "should not run",
      ),
      false,
    );
    session.dispose();
  });

  it("cancels during preparation without starting a provider request", async function () {
    const { model, source } = createPiTextProviderSource({
      steps: [{ text: "unused" }],
    });
    const session = new PiRuntime().openSession({
      sessionId: "s-cancel-prep",
      model,
      source,
    });
    const events: PiRuntimeEvent[] = [];
    let release!: (plan: unknown) => void;
    let started!: () => void;
    const preparing = new Promise<void>((resolve) => (started = resolve));
    const turn = session.runTurn({
      turnId: "t-cancel-prep",
      messages: [{ role: "user", text: "hi" }],
      prepareInvocation: () => {
        started();
        return new Promise((resolve) => {
          release = resolve as (plan: unknown) => void;
        });
      },
      onEvent: (event) => {
        events.push(event);
      },
    });
    await preparing;
    turn.abort();
    release(undefined);
    const result = await turn.result;
    assert.deepEqual(result, { status: "canceled" });
    assert.equal(
      events.some((event) => event.kind === "invocation_started"),
      false,
    );
    assert.equal(
      events.some((event) => event.kind === "assistant_message"),
      false,
    );
    assert.equal(events.at(-1)?.kind, "terminal");
    session.dispose();
  });
});
