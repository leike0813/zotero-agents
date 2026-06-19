import { assert } from "chai";
import { SkillRunnerConnectionGovernor } from "../../src/modules/skillRunnerConnectionGovernor";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function tick() {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("skillrunner connection governor", function () {
  let governor: SkillRunnerConnectionGovernor;

  beforeEach(function () {
    governor = new SkillRunnerConnectionGovernor();
  });

  afterEach(function () {
    governor.resetForTests();
  });

  it("defaults to six active connections per backend", function () {
    assert.equal(governor.snapshot().maxActivePerBackend, 6);
  });

  it("records connection lifecycle events and summary counts", async function () {
    const release = deferred();
    const task = governor.run({
      backendId: "local-skillrunner-backend",
      lane: "reconcile",
      requestId: "req-1",
      operation: "GET /v1/jobs/req-1",
      task: async () => {
        await release.promise;
      },
    });

    await tick();
    let snapshot = governor.snapshot();
    assert.equal(snapshot.summary.activeTotal, 1);
    assert.deepInclude(snapshot.summary.activeByBackend, {
      backendId: "local-skillrunner-backend",
      count: 1,
    });
    assert.deepInclude(snapshot.summary.activeByLane, {
      lane: "reconcile",
      count: 1,
    });
    assert.includeMembers(
      snapshot.events.map((event) => event.type),
      ["queued", "started"],
    );

    release.resolve();
    await task;
    snapshot = governor.snapshot();
    assert.include(
      snapshot.events.map((event) => event.type),
      "finished",
    );
    assert.equal(snapshot.summary.activeTotal, 0);
  });

  it("records late settlement after timeout", async function () {
    const release = deferred<string>();
    const task = governor
      .run({
        backendId: "backend-a",
        lane: "reconcile",
        requestId: "req-timeout",
        operation: "GET /v1/jobs/req-timeout",
        timeoutMs: 5,
        task: async () => {
          await release.promise;
          return "late";
        },
      })
      .catch((error) => error);

    await new Promise((resolve) => setTimeout(resolve, 20));
    const timeoutError = await task;
    assert.equal((timeoutError as Error).name, "SkillRunnerConnectionTimeoutError");

    release.resolve("late");
    await tick();
    const types = governor.snapshot().events.map((event) => event.type);
    assert.include(types, "timeout");
    assert.include(types, "late_resolve_after_timeout");
    assert.equal(governor.snapshot().summary.timeoutCount, 1);
    assert.equal(governor.snapshot().summary.lateSettlementCount, 1);
  });

  it("keeps only the latest audit events in the ring buffer", async function () {
    const tasks: Array<Promise<void>> = [];
    for (let index = 0; index < 75; index += 1) {
      tasks.push(
        governor.run({
          backendId: "backend-a",
          lane: "submit",
          operation: `submit-${index}`,
          task: async () => undefined,
        }),
      );
    }
    await Promise.all(tasks);
    const events = governor.snapshot().events;
    assert.lengthOf(events, 200);
    assert.isAbove(events[0].id, 1);
  });

  it("serializes work inside the same backend lane", async function () {
    const first = deferred<string>();
    const second = deferred<string>();
    const order: string[] = [];

    const firstTask = governor.run({
      backendId: "backend-a",
      lane: "background",
      operation: "first",
      task: async () => {
        order.push("first:start");
        await first.promise;
        order.push("first:end");
        return "first";
      },
    });
    const secondTask = governor.run({
      backendId: "backend-a",
      lane: "background",
      operation: "second",
      task: async () => {
        order.push("second:start");
        await second.promise;
        order.push("second:end");
        return "second";
      },
    });

    await tick();
    assert.deepEqual(order, ["first:start"]);
    assert.equal(governor.snapshot().queued.length, 1);

    first.resolve("first");
    await firstTask;
    await tick();
    assert.deepEqual(order, ["first:start", "first:end", "second:start"]);

    second.resolve("second");
    await secondTask;
    assert.deepEqual(order, [
      "first:start",
      "first:end",
      "second:start",
      "second:end",
    ]);
  });

  it("runs different lanes in parallel but respects backend active cap", async function () {
    governor = new SkillRunnerConnectionGovernor({ maxActivePerBackend: 2 });
    const releaseQuery = deferred();
    const releaseSettlement = deferred();
    const releaseStream = deferred();
    const started: string[] = [];

    const queryTask = governor.run({
      backendId: "backend-a",
      lane: "foreground-query",
      operation: "query",
      task: async () => {
        started.push("query");
        await releaseQuery.promise;
      },
    });
    const settlementTask = governor.run({
      backendId: "backend-a",
      lane: "settlement",
      operation: "settlement",
      task: async () => {
        started.push("settlement");
        await releaseSettlement.promise;
      },
    });
    const streamTask = governor.run({
      backendId: "backend-a",
      lane: "foreground-stream",
      operation: "stream",
      task: async () => {
        started.push("stream");
        await releaseStream.promise;
      },
    });

    await tick();
    assert.sameMembers(started, ["query", "settlement"]);
    assert.equal(governor.snapshot().active.length, 2);
    assert.equal(governor.snapshot().queued.length, 1);

    releaseQuery.resolve();
    await queryTask;
    await tick();
    assert.sameMembers(started, ["query", "settlement", "stream"]);

    releaseSettlement.resolve();
    releaseStream.resolve();
    await Promise.all([settlementTask, streamTask]);
  });

  it("keeps the reserved slot available for submit when background is queued", async function () {
    governor = new SkillRunnerConnectionGovernor({ maxActivePerBackend: 5 });
    const releaseStream = deferred();
    const releaseQuery = deferred();
    const releaseSettlement = deferred();
    const releaseSubmit = deferred();
    const releaseBackground = deferred();
    const started: string[] = [];

    const streamTask = governor.run({
      backendId: "backend-a",
      lane: "foreground-stream",
      operation: "stream",
      stream: true,
      task: async () => {
        started.push("stream");
        await releaseStream.promise;
      },
    });
    const queryTask = governor.run({
      backendId: "backend-a",
      lane: "foreground-query",
      operation: "query",
      task: async () => {
        started.push("query");
        await releaseQuery.promise;
      },
    });
    const settlementTask = governor.run({
      backendId: "backend-a",
      lane: "settlement",
      operation: "settlement",
      task: async () => {
        started.push("settlement");
        await releaseSettlement.promise;
      },
    });
    const backgroundTask = governor.run({
      backendId: "backend-a",
      lane: "background",
      operation: "background",
      task: async () => {
        started.push("background");
        await releaseBackground.promise;
      },
    });
    const submitTask = governor.run({
      backendId: "backend-a",
      lane: "submit",
      operation: "submit",
      task: async () => {
        started.push("submit");
        await releaseSubmit.promise;
      },
    });

    await tick();
    assert.sameMembers(started, ["stream", "query", "settlement", "submit"]);
    assert.notInclude(started, "background");
    assert.equal(governor.snapshot().active.length, 4);
    assert.equal(governor.snapshot().queued.length, 1);

    releaseSubmit.resolve();
    await submitTask;
    await tick();
    assert.notInclude(started, "background");

    releaseQuery.resolve();
    await queryTask;
    await tick();
    assert.include(started, "background");

    releaseStream.resolve();
    releaseSettlement.resolve();
    releaseBackground.resolve();
    await Promise.all([streamTask, settlementTask, backgroundTask]);
  });

  it("runs reconcile while background history is still active", async function () {
    const releaseBackground = deferred();
    const releaseReconcile = deferred();
    const started: string[] = [];

    const backgroundTask = governor.run({
      backendId: "backend-a",
      lane: "background",
      operation: "events-history",
      task: async () => {
        started.push("background");
        await releaseBackground.promise;
      },
    });
    const reconcileTask = governor.run({
      backendId: "backend-a",
      lane: "reconcile",
      operation: "get-run-state",
      task: async () => {
        started.push("reconcile");
        await releaseReconcile.promise;
      },
    });

    await tick();
    assert.sameMembers(started, ["background", "reconcile"]);

    releaseBackground.resolve();
    releaseReconcile.resolve();
    await Promise.all([backgroundTask, reconcileTask]);
  });

  it("aborts active work and releases the lane for queued work", async function () {
    const releaseSecond = deferred();
    const started: string[] = [];
    const firstTask = governor.run({
      backendId: "backend-a",
      lane: "background",
      requestId: "req-1",
      operation: "background-1",
      task: async () => {
        started.push("first");
        await new Promise(() => undefined);
      },
    });
    const secondTask = governor.run({
      backendId: "backend-a",
      lane: "background",
      requestId: "req-2",
      operation: "background-2",
      task: async () => {
        started.push("second");
        await releaseSecond.promise;
      },
    });

    firstTask.catch(() => undefined);
    await tick();
    assert.deepEqual(started, ["first"]);

    const aborted = governor.abort({
      backendId: "backend-a",
      lane: "background",
      requestId: "req-1",
      reason: "switch selection",
    });
    assert.equal(aborted, 1);

    await tick();
    assert.deepEqual(started, ["first", "second"]);
    releaseSecond.resolve();
    await secondTask;
  });

  it("allows two foreground streams for the same backend", async function () {
    const releaseFirst = deferred();
    const releaseSecond = deferred();
    const started: string[] = [];

    const firstTask = governor.run({
      backendId: "backend-a",
      lane: "foreground-stream",
      requestId: "req-1",
      operation: "stream-1",
      stream: true,
      lastFocusedAt: 100,
      task: async () => {
        started.push("first");
        await releaseFirst.promise;
      },
    });
    const secondTask = governor.run({
      backendId: "backend-a",
      lane: "foreground-stream",
      requestId: "req-2",
      operation: "stream-2",
      stream: true,
      lastFocusedAt: 200,
      task: async () => {
        started.push("second");
        await releaseSecond.promise;
      },
    });

    await tick();
    assert.sameMembers(started, ["first", "second"]);
    assert.sameMembers(
      governor
        .snapshot()
        .active.map((entry) => entry.requestId)
        .filter(Boolean),
      ["req-1", "req-2"],
    );

    releaseFirst.resolve();
    releaseSecond.resolve();
    await Promise.all([firstTask, secondTask]);
  });

  it("evicts the least recently focused foreground stream when a third run starts", async function () {
    const releases = new Map<string, () => void>();
    const started: string[] = [];
    const runStream = (requestId: string, lastFocusedAt: number) =>
      governor
        .run({
          backendId: "backend-a",
          lane: "foreground-stream",
          requestId,
          operation: `stream-${requestId}`,
          stream: true,
          lastFocusedAt,
          task: async (signal) => {
            started.push(requestId);
            await new Promise<void>((resolve) => {
              releases.set(requestId, resolve);
              signal?.addEventListener("abort", resolve, { once: true });
            });
          },
        })
        .catch((error) => error);

    const firstTask = runStream("req-1", 100);
    const secondTask = runStream("req-2", 200);
    await tick();
    assert.sameMembers(started, ["req-1", "req-2"]);

    const thirdTask = runStream("req-3", 300);
    await tick();
    assert.sameMembers(started, ["req-1", "req-2", "req-3"]);
    assert.sameMembers(
      governor
        .snapshot()
        .active.map((entry) => entry.requestId)
        .filter(Boolean),
      ["req-2", "req-3"],
    );

    releases.get("req-2")?.();
    releases.get("req-3")?.();
    await Promise.all([firstTask, secondTask, thirdTask]);
  });

  it("rejects duplicate foreground streams for the same request", async function () {
    const releaseFirst = deferred();
    const firstTask = governor.run({
      backendId: "backend-a",
      lane: "foreground-stream",
      requestId: "req-1",
      operation: "stream-1",
      stream: true,
      task: async () => {
        await releaseFirst.promise;
      },
    });
    await tick();

    let rejected: unknown;
    try {
      await governor.run({
        backendId: "backend-a",
        lane: "foreground-stream",
        requestId: "req-1",
        operation: "stream-duplicate",
        stream: true,
        task: async () => {},
      });
    } catch (error) {
      rejected = error;
    }

    assert.equal(governor.snapshot().active.length, 1);
    assert.include(
      governor.snapshot().events.map((event) => event.type),
      "duplicate_stream_rejected",
    );
    assert.match(String((rejected as Error | undefined)?.name || ""), /Abort/);
    releaseFirst.resolve();
    await firstTask;
  });

  it("evicts a foreground stream instead of blocking submit at the backend cap", async function () {
    governor = new SkillRunnerConnectionGovernor({ maxActivePerBackend: 2 });
    const releases = new Map<string, () => void>();
    const started: string[] = [];
    const runStream = (requestId: string, lastFocusedAt: number) =>
      governor
        .run({
          backendId: "backend-a",
          lane: "foreground-stream",
          requestId,
          operation: `stream-${requestId}`,
          stream: true,
          lastFocusedAt,
          task: async (signal) => {
            started.push(requestId);
            await new Promise<void>((resolve) => {
              releases.set(requestId, resolve);
              signal?.addEventListener("abort", resolve, { once: true });
            });
          },
        })
        .catch((error) => error);

    const firstTask = runStream("req-1", 100);
    const secondTask = runStream("req-2", 200);
    await tick();
    assert.sameMembers(started, ["req-1", "req-2"]);

    const releaseSubmit = deferred();
    const submitTask = governor.run({
      backendId: "backend-a",
      lane: "submit",
      operation: "submit",
      task: async () => {
        started.push("submit");
        await releaseSubmit.promise;
      },
    });
    await tick();

    assert.include(started, "submit");
    assert.sameMembers(
      governor.snapshot().active.map((entry) => entry.operation),
      ["stream-req-2", "submit"],
    );
    assert.include(
      governor.snapshot().events.map((event) => event.type),
      "evicted_stream",
    );

    releaseSubmit.resolve();
    releases.get("req-2")?.();
    await Promise.all([firstTask, secondTask, submitTask]);
  });

  it("evicts a foreground stream instead of blocking reconcile at the backend cap", async function () {
    governor = new SkillRunnerConnectionGovernor({ maxActivePerBackend: 2 });
    const releases = new Map<string, () => void>();
    const started: string[] = [];
    const runStream = (requestId: string, lastFocusedAt: number) =>
      governor
        .run({
          backendId: "backend-a",
          lane: "foreground-stream",
          requestId,
          operation: `stream-${requestId}`,
          stream: true,
          lastFocusedAt,
          task: async (signal) => {
            started.push(requestId);
            await new Promise<void>((resolve) => {
              releases.set(requestId, resolve);
              signal?.addEventListener("abort", resolve, { once: true });
            });
          },
        })
        .catch((error) => error);

    const firstTask = runStream("req-1", 100);
    const secondTask = runStream("req-2", 200);
    await tick();

    const releaseReconcile = deferred();
    const reconcileTask = governor.run({
      backendId: "backend-a",
      lane: "reconcile",
      operation: "get-run-state",
      task: async () => {
        started.push("reconcile");
        await releaseReconcile.promise;
      },
    });
    await tick();

    assert.include(started, "reconcile");
    assert.sameMembers(
      governor.snapshot().active.map((entry) => entry.operation),
      ["stream-req-2", "get-run-state"],
    );

    releaseReconcile.resolve();
    releases.get("req-2")?.();
    await Promise.all([firstTask, secondTask, reconcileTask]);
  });
});
