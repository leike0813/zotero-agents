import { assert } from "chai";
import { createAcpDependencyPreparationScheduler } from "../../src/modules/acp/skillRun/acpRuntimeDependencyPreparation";
import { createCancellationController } from "../../src/utils/wait";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const context = (cwd = "/run/a", environment = {}) => ({
  command: "/bin/uv",
  args: ["run", "--with", "jinja2"],
  cwd,
  environment,
});

describe("ACP dependency preparation scheduling", function () {
  it("shares overlapping equivalent requests but verifies completed contexts again", async function () {
    const scheduler = createAcpDependencyPreparationScheduler<string>();
    const gate = deferred<string>();
    let calls = 0;
    const execute = async () => {
      calls++;
      return gate.promise;
    };
    const first = scheduler.prepare(context(), execute);
    const second = scheduler.prepare(context(), execute);
    await Promise.resolve();
    assert.equal(calls, 1);
    gate.resolve("ready");
    assert.deepEqual(await Promise.all([first, second]), ["ready", "ready"]);
    await scheduler.prepare(context(), async () => {
      calls++;
      return "ready";
    });
    assert.equal(calls, 2);
    await scheduler.shutdown();
  });

  it("serializes different contexts and serves foreground work before pending warmups", async function () {
    const scheduler = createAcpDependencyPreparationScheduler<string>();
    const gate = deferred<string>();
    const order: string[] = [];
    const first = scheduler.prepare(
      context(),
      async () => {
        order.push("active");
        return gate.promise;
      },
      { background: true },
    );
    await Promise.resolve();
    const background = scheduler.prepare(
      context("/background"),
      async () => {
        order.push("background");
        return "background";
      },
      { background: true },
    );
    const foreground = scheduler.prepare(context("/foreground"), async () => {
      order.push("foreground");
      return "foreground";
    });
    assert.deepEqual(order, ["active"]);
    gate.resolve("ready");
    await Promise.all([first, background, foreground]);
    assert.deepEqual(order, ["active", "foreground", "background"]);
    await scheduler.shutdown();
  });

  it("cancels one waiter without canceling shared execution", async function () {
    const scheduler = createAcpDependencyPreparationScheduler<string>();
    const gate = deferred<string>();
    const cancel = createCancellationController();
    let executionSignal: { aborted: boolean } | undefined;
    const execute = async ({ signal }: { signal: { aborted: boolean } }) => {
      executionSignal = signal;
      return gate.promise;
    };
    const first = scheduler
      .prepare(context(), execute, { signal: cancel.signal })
      .then(
        () => "unexpected",
        (error) => error.kind,
      );
    const second = scheduler.prepare(context(), execute);
    await Promise.resolve();
    cancel.abort();
    assert.equal(await first, "canceled");
    assert.isFalse(executionSignal?.aborted);
    gate.resolve("ready");
    assert.equal(await second, "ready");
    await scheduler.shutdown();
  });

  it("expires queued work without launching it and cancels unneeded active work", async function () {
    const scheduler = createAcpDependencyPreparationScheduler<string>();
    const cancel = createCancellationController();
    const started = deferred<void>();
    let queuedCalls = 0;
    const first = scheduler
      .prepare(
        context(),
        ({ signal }) =>
          new Promise<string>((resolve) => {
            signal.addEventListener("abort", () => resolve("stopped"));
            started.resolve();
          }),
        { signal: cancel.signal },
      )
      .catch((error) => error.kind);
    await started.promise;
    const queued = scheduler
      .prepare(
        context("/queued"),
        async () => {
          queuedCalls++;
          return "ready";
        },
        { timeoutMs: 5 },
      )
      .catch((error) => error.kind);
    assert.equal(await queued, "timed-out");
    cancel.abort();
    assert.equal(await first, "canceled");
    await scheduler.shutdown();
    assert.equal(queuedCalls, 0);
    assert.equal(
      await scheduler
        .prepare(context(), async () => "ready")
        .catch((error) => error.kind),
      "canceled",
    );
  });

  it("settles pending waiters on shutdown and never publishes late readiness", async function () {
    const scheduler = createAcpDependencyPreparationScheduler<string>();
    const gate = deferred<string>();
    const first = scheduler
      .prepare(context(), () => gate.promise)
      .catch((error) => error.kind);
    const queued = scheduler
      .prepare(context("/pending"), async () => "unexpected")
      .catch((error) => error.kind);
    await Promise.resolve();
    const shutdown = scheduler.shutdown();
    assert.deepEqual(await Promise.all([first, queued]), [
      "canceled",
      "canceled",
    ]);
    gate.resolve("late-ready");
    await shutdown;
  });

  it("separates effective environments while ignoring record insertion order", async function () {
    const scheduler = createAcpDependencyPreparationScheduler<string>();
    const gate = deferred<string>();
    let calls = 0;
    const execute = async () => {
      calls++;
      return gate.promise;
    };
    const first = scheduler.prepare(
      context("/same", { A: "one", B: "two" }),
      execute,
    );
    const same = scheduler.prepare(
      {
        environment: { B: "two", A: "one" },
        cwd: "/same",
        args: ["run", "--with", "jinja2"],
        command: "/bin/uv",
      },
      execute,
    );
    const other = scheduler.prepare(
      context("/same", { A: "different", B: "two" }),
      execute,
    );
    await Promise.resolve();
    assert.equal(calls, 1);
    gate.resolve("ready");
    await Promise.all([first, same, other]);
    assert.equal(calls, 2);
    await scheduler.shutdown();
  });
});
