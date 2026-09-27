import { assert } from "chai";
import {
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
