import { assert } from "chai";
import {
  createPiRuntimeLoopGuard,
  createPiTextProviderSource,
  PiRuntime,
  type PiRuntimeEvent,
  type PiTurnResult,
} from "../../src/modules/piRuntime";
import { fauxTurn } from "../fixtures/pi/fauxTurn";
import { createPiOwner } from "../../src/modules/piOwnerPersistence";
import { piOwnerPaths } from "../../src/modules/piTranscriptStore";
import {
  readRuntimeTextFileStrict,
  runtimePathExists,
} from "../../src/modules/runtimePersistence";
import {
  flushOwner,
  resetPiRuntimeAuditForTests,
} from "../../src/modules/piRuntimeAudit";
import { joinPath } from "../../src/utils/path";
import { setRuntimeLogDiagnosticMode } from "../../src/modules/runtimeLogManager";
import {
  createTestRuntimeRoot,
  removeTestRuntimeRoot,
} from "./piTestRuntimeRoot";

async function observe(events: AsyncIterable<PiRuntimeEvent>) {
  const observed: PiRuntimeEvent[] = [];
  for await (const event of events) observed.push(event);
  return observed;
}

// C18: the Runtime is a fact owner for structural turn and invocation
// boundaries. These cases drive the real audit module through a real owner, so
// they observe the persisted evidence rather than a test double.
describe("PiRuntime structural audit boundaries", function () {
  let root: string;
  const owner = { kind: "conversation" as const, ownerId: "runtime-audit" };

  beforeEach(async function () {
    root = await createTestRuntimeRoot("pi-runtime-audit");
    await resetPiRuntimeAuditForTests();
    await createPiOwner(owner, root);
    // Turn and invocation boundaries are diagnostic-tier facts: Production
    // Mode drops them, so a case that asserts them must enable Diagnostic Mode
    // first. A separate case below proves the Production default stays quiet.
    setRuntimeLogDiagnosticMode(true);
  });

  afterEach(async function () {
    await resetPiRuntimeAuditForTests();
    setRuntimeLogDiagnosticMode(false);
    await removeTestRuntimeRoot(root);
  });

  async function auditFacts() {
    await flushOwner(owner, root);
    const text = await readRuntimeTextFileStrict(
      joinPath(auditPath(owner), "audit.ndjson"),
    );
    return text
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  const auditPath = (target: { kind: "conversation"; ownerId: string }) =>
    joinPath(piOwnerPaths(target, root).dir, "workspace", "runtime-audit");

  it("emits turn boundaries around a turn without changing its events", async function () {
    const session = new PiRuntime().openSession({
      sessionId: "audit-session",
      modelStream: fauxTurn(["ok"]),
      audit: { owner, root },
    });
    const turn = session.runTurn({ turnId: "audit-turn", prompt: "reply" });
    const [events, result] = await Promise.all([
      observe(turn.events),
      turn.result,
    ]);
    assert.deepEqual(result, { status: "completed", text: "ok" });
    assert.deepEqual(
      events.map((event) => event.kind),
      ["text_delta", "terminal"],
      "audit must not add or remove runtime events",
    );
    const facts = await auditFacts();
    assert.deepEqual(
      facts.map((fact) => fact.operation),
      ["turn.started", "turn.terminal"],
    );
    assert.isTrue(facts.every((fact) => fact.turnId === "audit-turn"));
    assert.equal(facts[1]?.details?.status, "completed");
    session.dispose();
  });

  it("never lets an unresolvable owner change the turn result", async function () {
    const missing = { kind: "conversation" as const, ownerId: "no-such-owner" };
    const session = new PiRuntime().openSession({
      sessionId: "audit-missing-session",
      modelStream: fauxTurn(["fine"]),
      audit: { owner: missing, root },
    });
    const result = await session.runTurn({
      turnId: "audit-missing-turn",
      prompt: "reply",
    }).result;
    assert.deepEqual(result, { status: "completed", text: "fine" });
    const path = joinPath(auditPath(missing), "audit.ndjson");
    assert.isFalse(await runtimePathExists(path));
    session.dispose();
  });

  it("emits model invocation boundaries from the Runtime, not the provider", async function () {
    const session = new PiRuntime().openSession({
      sessionId: "invocation-audit-session",
      model: {
        id: "audit-model",
        name: "Audit Model",
        api: "openai-completions",
        provider: "audit-provider",
        baseUrl: "https://audit.invalid/v1",
        reasoning: false,
        input: ["text"],
        contextWindow: 1024,
        maxTokens: 64,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      },
      source: async () => {
        const stream = new EventStream<never, never>(
          () => true,
          () => undefined,
        ) as never;
        return stream;
      },
      audit: { owner, root },
    });
    const result = await session.runTurn({
      turnId: "invocation-audit-turn",
      messages: [{ role: "user", text: "hi" }],
    }).result;
    assert.isString(result.status);
    // Turn boundaries and invocation boundaries both come from the Runtime,
    // and every fact is a structural token with no payload.
    const facts = await auditFacts();
    const operations = facts.map((fact) => fact.operation);
    assert.equal(operations[0], "turn.started");
    assert.equal(operations.at(-1), "turn.terminal");
    assert.include(operations, "model.invocation_started");
    assert.isTrue(
      facts
        .filter((fact) => fact.operation.startsWith("model."))
        .every((fact) => fact.component === "pi-provider"),
      "the Runtime declares the provider origin it owns",
    );
    assert.notInclude(JSON.stringify(facts), "hi");
    assert.notInclude(JSON.stringify(facts), "audit.invalid");
    session.dispose();
  });

  it("stays completely silent without an audit context", async function () {
    const session = new PiRuntime().openSession({
      sessionId: "no-audit-session",
      modelStream: fauxTurn(["quiet"]),
    });
    const result = await session.runTurn({
      turnId: "no-audit-turn",
      prompt: "reply",
    }).result;
    assert.deepEqual(result, { status: "completed", text: "quiet" });
    session.dispose();
  });
});

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

describe("PiRuntime whole-run LoopGuard", function () {
  function executedResults(request: {
    calls: readonly { callId: string; name: string }[];
  }) {
    return {
      results: request.calls.map((call) => ({
        callId: call.callId,
        name: call.name,
        text: "{}",
        isError: false,
      })),
    };
  }

  it("stops a repeated single-call cycle before the sixth identical batch", async function () {
    const { model, source } = createPiTextProviderSource({
      steps: [
        { toolCalls: [{ callId: "c", name: "noop", arguments: { a: 1 } }] },
      ],
    });
    const session = new PiRuntime().openSession({
      sessionId: "s-cycle",
      model,
      source,
    });
    let invocations = 0;
    let toolResults = 0;
    const turn = session.runTurn({
      turnId: "t-cycle",
      messages: [{ role: "user", text: "go" }],
      tools: [
        {
          name: "noop",
          description: "noop",
          schema: { type: "object" },
          execute: async () => ({ text: "x" }),
        },
      ],
      executeTools: executedResults,
      onEvent: (event) => {
        if (event.kind === "invocation_started") invocations += 1;
        if (event.kind === "tool_result") toolResults += 1;
      },
    });
    const result = await turn.result;
    assert.equal(result.status, "failed");
    if (result.status === "failed")
      assert.equal(result.failure.code, "agent_loop_limit_exceeded");
    assert.equal(invocations, 5);
    assert.equal(toolResults, 5);
    session.dispose();
  });

  it("stops a repeated two-batch cycle before the sixth repetition", async function () {
    const steps = Array.from({ length: 12 }, (_, index) => ({
      toolCalls: [
        {
          callId: "c" + index,
          name: index % 2 === 0 ? "alpha" : "beta",
          arguments: { slot: 0 },
        },
      ],
    }));
    const { model, source } = createPiTextProviderSource({ steps });
    const session = new PiRuntime().openSession({
      sessionId: "s-cycle-two",
      model,
      source,
    });
    let invocations = 0;
    const turn = session.runTurn({
      turnId: "t-cycle-two",
      messages: [{ role: "user", text: "go" }],
      tools: [
        {
          name: "alpha",
          description: "alpha",
          schema: { type: "object" },
          execute: async () => ({ text: "x" }),
        },
        {
          name: "beta",
          description: "beta",
          schema: { type: "object" },
          execute: async () => ({ text: "x" }),
        },
      ],
      executeTools: executedResults,
      onEvent: (event) => {
        if (event.kind === "invocation_started") invocations += 1;
      },
    });
    const result = await turn.result;
    assert.equal(result.status, "failed");
    assert.equal(invocations, 10);
    session.dispose();
  });

  it("defaults to twenty model invocations before failing structurally", async function () {
    const steps = Array.from({ length: 26 }, (_, index) => ({
      toolCalls: [{ callId: "c" + index, name: "noop", arguments: { index } }],
    }));
    const { model, source } = createPiTextProviderSource({ steps });
    const session = new PiRuntime().openSession({
      sessionId: "s-limit",
      model,
      source,
    });
    let invocations = 0;
    const turn = session.runTurn({
      turnId: "t-limit",
      messages: [{ role: "user", text: "go" }],
      tools: [
        {
          name: "noop",
          description: "noop",
          schema: { type: "object" },
          execute: async () => ({ text: "x" }),
        },
      ],
      executeTools: executedResults,
      onEvent: (event) => {
        if (event.kind === "invocation_started") invocations += 1;
      },
    });
    const result = await turn.result;
    assert.equal(result.status, "failed");
    if (result.status === "failed")
      assert.equal(result.failure.code, "agent_loop_limit_exceeded");
    assert.equal(invocations, 20);
    session.dispose();
  });

  it("fails a resumed run that already spent its invocation allowance", async function () {
    const { model, source } = createPiTextProviderSource({
      steps: [{ text: "unused" }],
    });
    const session = new PiRuntime().openSession({
      sessionId: "s-resume",
      model,
      source,
    });
    let invocations = 0;
    const turn = session.runTurn({
      turnId: "t-resume",
      messages: [{ role: "user", text: "go" }],
      loopGuard: { state: { invocations: 20, toolAttempts: 0, cycles: [] } },
      onEvent: (event) => {
        if (event.kind === "invocation_started") invocations += 1;
      },
    });
    const result = await turn.result;
    assert.equal(result.status, "failed");
    if (result.status === "failed")
      assert.equal(result.failure.code, "agent_loop_limit_exceeded");
    assert.equal(invocations, 0);
    session.dispose();
  });

  it("executes none of a batch that exceeds the remaining tool budget", async function () {
    const { model, source } = createPiTextProviderSource({
      steps: [
        {
          toolCalls: [
            { callId: "a", name: "noop", arguments: { n: 1 } },
            { callId: "b", name: "noop", arguments: { n: 2 } },
            { callId: "c", name: "noop", arguments: { n: 3 } },
          ],
        },
      ],
    });
    const session = new PiRuntime().openSession({
      sessionId: "s-budget",
      model,
      source,
    });
    let batches = 0;
    let attempts = 0;
    const turn = session.runTurn({
      turnId: "t-budget",
      messages: [{ role: "user", text: "go" }],
      tools: [
        {
          name: "noop",
          description: "noop",
          schema: { type: "object" },
          execute: async () => ({ text: "x" }),
        },
      ],
      loopGuard: {
        state: { invocations: 0, toolAttempts: 0, cycles: [] },
        trustedLimits: { toolAttempts: 5 },
      },
      executeTools: async (request) => {
        batches += 1;
        attempts += request.calls.length;
        return executedResults(request);
      },
    });
    const result = await turn.result;
    assert.equal(result.status, "failed");
    if (result.status === "failed")
      assert.equal(result.failure.code, "agent_loop_limit_exceeded");
    assert.equal(batches, 1);
    assert.equal(attempts, 3);
    session.dispose();
  });

  it("reconciles the reserved batch attempts to what the owner dispatches", async function () {
    const { model, source } = createPiTextProviderSource({
      steps: [
        {
          toolCalls: [
            { callId: "a", name: "noop", arguments: { n: 1 } },
            { callId: "b", name: "noop", arguments: { n: 2 } },
            { callId: "c", name: "noop", arguments: { n: 3 } },
          ],
        },
        { text: "done" },
      ],
    });
    const session = new PiRuntime().openSession({
      sessionId: "s-reserve",
      model,
      source,
    });
    const committed: number[] = [];
    const guardState = {
      invocations: 0,
      toolAttempts: 0,
      cycles: [] as string[],
    };
    const turn = session.runTurn({
      turnId: "t-reserve",
      messages: [{ role: "user", text: "go" }],
      tools: [
        {
          name: "noop",
          description: "noop",
          schema: { type: "object" },
          execute: async () => ({ text: "x" }),
        },
      ],
      loopGuard: {
        state: guardState,
        trustedLimits: { toolAttempts: 5 },
        persist: (state) => {
          committed.push(state.toolAttempts);
        },
      },
      async executeTools(request) {
        await request.reserveAttempts?.(1);
        return executedResults(request);
      },
    });
    const result = await turn.result;
    assert.equal(result.status, "completed");
    // The whole batch is reserved before dispatch, then reconciled down to the
    // single call the owner reports as actually dispatched.
    assert.equal(guardState.toolAttempts, 1);
    assert.include(committed, 3);
    assert.equal(committed.at(-1), 1);
    session.dispose();
  });

  it("charges only the calls a mediated owner reports before dispatch", async function () {
    const { model, source } = createPiTextProviderSource({
      steps: [
        {
          toolCalls: [
            { callId: "a", name: "noop", arguments: { n: 1 } },
            { callId: "b", name: "noop", arguments: { n: 2 } },
            { callId: "c", name: "noop", arguments: { n: 3 } },
          ],
        },
        { text: "done" },
      ],
    });
    const session = new PiRuntime().openSession({
      sessionId: "s-mediated",
      model,
      source,
    });
    // One attempt left: the eager charge would refuse the batch of three, but
    // the owner admits a single call, so the run must continue.
    const guardState = {
      invocations: 0,
      toolAttempts: 99,
      cycles: [] as string[],
    };
    let dispatched = 0;
    const turn = session.runTurn({
      turnId: "t-mediated",
      messages: [{ role: "user", text: "go" }],
      tools: [
        {
          name: "noop",
          description: "noop",
          schema: { type: "object" },
          execute: async () => ({ text: "x" }),
        },
      ],
      toolAttemptAccounting: "gateway",
      loopGuard: { state: guardState },
      async executeTools(request) {
        await request.reserveAttempts?.(1);
        dispatched += 1;
        return executedResults(request);
      },
    });
    const result = await turn.result;
    assert.equal(result.status, "completed");
    assert.equal(dispatched, 1);
    assert.equal(guardState.toolAttempts, 100);
    session.dispose();
  });

  it("refuses a mediated batch that cannot fit before dispatching it", async function () {
    const { model, source } = createPiTextProviderSource({
      steps: [
        {
          toolCalls: [
            { callId: "a", name: "noop", arguments: { n: 1 } },
            { callId: "b", name: "noop", arguments: { n: 2 } },
            { callId: "c", name: "noop", arguments: { n: 3 } },
          ],
        },
      ],
    });
    const session = new PiRuntime().openSession({
      sessionId: "s-mediated-overflow",
      model,
      source,
    });
    const guardState = {
      invocations: 0,
      toolAttempts: 99,
      cycles: [] as string[],
    };
    let dispatched = 0;
    const turn = session.runTurn({
      turnId: "t-mediated-overflow",
      messages: [{ role: "user", text: "go" }],
      tools: [
        {
          name: "noop",
          description: "noop",
          schema: { type: "object" },
          execute: async () => ({ text: "x" }),
        },
      ],
      toolAttemptAccounting: "gateway",
      loopGuard: { state: guardState },
      async executeTools(request) {
        await request.reserveAttempts?.(request.calls.length);
        dispatched += 1;
        return executedResults(request);
      },
    });
    const result = await turn.result;
    assert.equal(result.status, "failed");
    if (result.status === "failed")
      assert.equal(result.failure.code, "agent_loop_limit_exceeded");
    assert.equal(dispatched, 0);
    assert.equal(guardState.toolAttempts, 99);
    session.dispose();
  });

  it("fails closed when a mediated owner never reports its attempts", async function () {
    const { model, source } = createPiTextProviderSource({
      steps: [
        {
          toolCalls: [{ callId: "a", name: "noop", arguments: { n: 1 } }],
        },
      ],
    });
    const session = new PiRuntime().openSession({
      sessionId: "s-mediated-silent",
      model,
      source,
    });
    const guardState = {
      invocations: 0,
      toolAttempts: 99,
      cycles: [] as string[],
    };
    const turn = session.runTurn({
      turnId: "t-mediated-silent",
      messages: [{ role: "user", text: "go" }],
      tools: [
        {
          name: "noop",
          description: "noop",
          schema: { type: "object" },
          execute: async () => ({ text: "x" }),
        },
      ],
      toolAttemptAccounting: "gateway",
      loopGuard: { state: guardState },
      executeTools: async (request) => executedResults(request),
    });
    const result = await turn.result;
    assert.equal(result.status, "failed");
    if (result.status === "failed")
      assert.equal(result.failure.code, "runtime_failed");
    assert.equal(guardState.toolAttempts, 99);
    session.dispose();
  });

  it("treats a reported zero-attempt batch as accounted, not silent", async function () {
    const { model, source } = createPiTextProviderSource({
      steps: [
        {
          toolCalls: [{ callId: "a", name: "noop", arguments: { n: 1 } }],
        },
      ],
    });
    const session = new PiRuntime().openSession({
      sessionId: "s-mediated-zero",
      model,
      source,
    });
    const guardState = {
      invocations: 0,
      toolAttempts: 99,
      cycles: [] as string[],
    };
    const turn = session.runTurn({
      turnId: "t-mediated-zero",
      messages: [{ role: "user", text: "go" }],
      tools: [
        {
          name: "noop",
          description: "noop",
          schema: { type: "object" },
          execute: async () => ({ text: "x" }),
        },
      ],
      toolAttemptAccounting: "gateway",
      loopGuard: { state: guardState },
      async executeTools(request) {
        await request.reserveAttempts?.(0);
        return { results: [] };
      },
    });
    const result = await turn.result;
    // The batch dispatched nothing and was reported as such, so the budget is
    // untouched instead of being backfilled after the fact.
    assert.equal(guardState.toolAttempts, 99);
    assert.equal(result.status, "waiting_permission");
    session.dispose();
  });

  it("lets a Workflow only lower trusted LoopGuard limits", function () {
    const raised = createPiRuntimeLoopGuard({
      state: { invocations: 0, toolAttempts: 0, cycles: [] },
      trustedLimits: { invocations: 30 },
    });
    assert.equal(raised.limits.invocations, 30);
    assert.equal(raised.limits.toolAttempts, 100);
    const lowered = createPiRuntimeLoopGuard({
      state: { invocations: 0, toolAttempts: 0, cycles: [] },
      trustedLimits: { invocations: 30, toolAttempts: 40 },
      requestedLimits: { invocations: 50, toolAttempts: 5 },
    });
    assert.equal(lowered.limits.invocations, 30);
    assert.equal(lowered.limits.toolAttempts, 5);
    assert.equal(createPiRuntimeLoopGuard().limits.invocations, 20);
    assert.equal(createPiRuntimeLoopGuard().limits.toolAttempts, 100);
  });

  it("detects cycles of length one through five only at five repetitions", function () {
    for (let length = 1; length <= 5; length += 1) {
      const pattern = Array.from({ length }, (_, index) => "s" + index);
      const four = Array.from({ length: 4 }, () => pattern).flat();
      const five = Array.from({ length: 5 }, () => pattern).flat();
      assert.isFalse(
        createPiRuntimeLoopGuard({
          state: { invocations: 0, toolAttempts: 0, cycles: four },
        }).isCycleBlocked(),
        "length " + length,
      );
      assert.isTrue(
        createPiRuntimeLoopGuard({
          state: { invocations: 0, toolAttempts: 0, cycles: five },
        }).isCycleBlocked(),
        "length " + length,
      );
    }
  });

  it("breaks repeated fingerprints on progress or result-category change", async function () {
    const call = { callId: "c", name: "noop", arguments: { a: 1 } };
    const ok = { callId: "c", name: "noop", text: "{}", isError: false };
    const repeat = createPiRuntimeLoopGuard({
      state: { invocations: 0, toolAttempts: 0, cycles: [] },
    });
    for (let round = 0; round < 4; round += 1)
      await repeat.recordToolBatch({ calls: [call], results: [ok] });
    assert.isFalse(repeat.isCycleBlocked());
    await repeat.recordToolBatch({ calls: [call], results: [ok] });
    assert.isTrue(repeat.isCycleBlocked());

    const moved = createPiRuntimeLoopGuard({
      state: { invocations: 0, toolAttempts: 0, cycles: [] },
    });
    for (let round = 0; round < 5; round += 1)
      await moved.recordToolBatch({
        calls: [call],
        results: [ok],
        progress: "p" + round,
      });
    assert.isFalse(moved.isCycleBlocked());

    const errored = createPiRuntimeLoopGuard({
      state: { invocations: 0, toolAttempts: 0, cycles: [] },
    });
    for (let round = 0; round < 6; round += 1)
      await errored.recordToolBatch({
        calls: [call],
        results: [{ ...ok, isError: round % 2 === 1 }],
      });
    assert.isFalse(errored.isCycleBlocked());
  });

  it("commits counters through the injected hook and survives continuation", async function () {
    const steps = Array.from({ length: 24 }, (_, index) => ({
      toolCalls: [{ callId: "c" + index, name: "noop", arguments: { index } }],
    }));
    const { model, source } = createPiTextProviderSource({ steps });
    const session = new PiRuntime().openSession({
      sessionId: "s-persist",
      model,
      source,
    });
    const state: {
      invocations: number;
      toolAttempts: number;
      cycles: string[];
    } = {
      invocations: 19,
      toolAttempts: 0,
      cycles: [],
    };
    const observed: number[] = [];
    let invocations = 0;
    const turn = session.runTurn({
      turnId: "t-persist",
      messages: [{ role: "user", text: "go" }],
      tools: [
        {
          name: "noop",
          description: "noop",
          schema: { type: "object" },
          execute: async () => ({ text: "x" }),
        },
      ],
      loopGuard: {
        state,
        persist: (snapshot) => {
          observed.push(snapshot.invocations);
        },
      },
      executeTools: executedResults,
      onEvent: (event) => {
        if (event.kind === "invocation_started") invocations += 1;
      },
    });
    const result = await turn.result;
    assert.equal(invocations, 1);
    assert.equal(state.invocations, 20);
    assert.equal(result.status, "failed");
    assert.isTrue(observed.includes(20));
    session.dispose();
  });

  it("settles waiting_user without a further model request or fabricated tool result", async function () {
    const { model, source } = createPiTextProviderSource({
      steps: [
        { toolCalls: [{ callId: "q", name: "ask_user", arguments: {} }] },
        { text: "should not run" },
      ],
    });
    const session = new PiRuntime().openSession({
      sessionId: "s-user",
      model,
      source,
    });
    const events: PiRuntimeEvent[] = [];
    const turn = session.runTurn({
      turnId: "t-user",
      messages: [{ role: "user", text: "go" }],
      tools: [
        {
          name: "ask_user",
          description: "ask",
          schema: { type: "object" },
          execute: async () => ({ text: "x" }),
        },
      ],
      executeTools: async () => ({ results: [], waitingUser: true }),
      onEvent: (event) => {
        events.push(event);
      },
    });
    const result = await turn.result;
    assert.deepEqual(result, { status: "waiting_user" });
    assert.lengthOf(
      events.filter((event) => event.kind === "invocation_started"),
      1,
    );
    assert.equal(
      events.some((event) => event.kind === "tool_result"),
      false,
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

  it("settles suspended when the owner suspends the run from a batch", async function () {
    const { model, source } = createPiTextProviderSource({
      steps: [
        { toolCalls: [{ callId: "c1", name: "noop", arguments: {} }] },
        { text: "should not run" },
      ],
    });
    const session = new PiRuntime().openSession({
      sessionId: "s-batch-suspend",
      model,
      source,
    });
    const turn = session.runTurn({
      turnId: "t-batch-suspend",
      messages: [{ role: "user", text: "go" }],
      tools: [
        {
          name: "noop",
          description: "noop",
          schema: { type: "object" },
          execute: async () => ({ text: "x" }),
        },
      ],
      executeTools: async () => ({ results: [], suspendedRun: true }),
    });
    assert.deepEqual(await turn.result, { status: "suspended" });
    session.dispose();
  });

  it("settles suspended when the owner interrupts a live turn", async function () {
    const base = createPiTextProviderSource({ steps: [{ text: "late" }] });
    let started!: () => void;
    const entered = new Promise<void>((resolve) => (started = resolve));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const source: typeof base.source = async (request) => {
      started();
      await gate;
      return base.source(request);
    };
    const session = new PiRuntime().openSession({
      sessionId: "s-suspend",
      model: base.model,
      source,
    });
    const turn = session.runTurn({
      turnId: "t-suspend",
      messages: [{ role: "user", text: "go" }],
    });
    await entered;
    turn.suspend();
    release();
    assert.deepEqual(await turn.result, { status: "suspended" });
    session.dispose();
  });
});
