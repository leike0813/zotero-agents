import { assert } from "chai";
import {
  listRuntimeLogs,
  setRuntimeLogDiagnosticMode,
} from "../../src/modules/runtimeLogManager";
import {
  createPiRuntimeLifecycle,
  getPiRuntimeLifecycle,
  PI_RUNTIME_CAPACITY_DEFAULT,
  resolvePiRuntimeCapacity,
  resetPiRuntimeLifecycleForTests,
  startPiRuntimeLifecycle,
  waitForPiShutdown,
} from "../../src/modules/piRuntimeLifecycle";

describe("Pi Runtime lifecycle", function () {
  it("opens admission after reservations without awaiting deep recovery", async function () {
    resetPiRuntimeLifecycleForTests();
    let settle!: () => void;
    const held = new Promise<void>((resolve) => {
      settle = resolve;
    });
    const events: string[] = [];
    try {
      await startPiRuntimeLifecycle({
        restoreReservations: async () => {
          events.push("restore");
          return true;
        },
        recover: async () => {
          events.push("recover");
          await held;
        },
        cleanup: async () => {
          events.push("cleanup");
        },
      });
      assert.isTrue(getPiRuntimeLifecycle().skillAdmissionOpen);
      assert.deepEqual(events, ["restore", "recover"]);
      settle();
      await getPiRuntimeLifecycle().maintain(async () => undefined);
      assert.deepEqual(events, ["restore", "recover", "cleanup"]);
    } finally {
      settle();
      resetPiRuntimeLifecycleForTests();
    }
  });
  const request = (id: string, lane: "foreground" | "background") => ({
    owner: { kind: "conversation" as const, ownerId: id },
    turnId: id,
    lane,
  });

  it("ships twelve active turns with two reserved foreground slots", function () {
    const lifecycle = createPiRuntimeLifecycle();
    assert.equal(lifecycle.capacity, PI_RUNTIME_CAPACITY_DEFAULT);
    assert.equal(lifecycle.backgroundCapacity, 10);
    assert.equal(resolvePiRuntimeCapacity(8), 8);
    assert.equal(resolvePiRuntimeCapacity(5), PI_RUNTIME_CAPACITY_DEFAULT);
    lifecycle.closeAdmission();
  });

  it("reports physical occupancy and actual queued admission delay", async function () {
    let now = 0;
    const lifecycle = createPiRuntimeLifecycle({
      capacity: 4,
      monotonicNow: () => now,
    });
    setRuntimeLogDiagnosticMode(true);
    const held = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        lifecycle.acquire(request(`occupancy-${i}`, "foreground")),
      ),
    );
    try {
      const pending = lifecycle.acquire(
        request("occupancy-queued", "foreground"),
      );
      now = 250;
      let settle!: () => void;
      held[0].trackPhysical(
        new Promise<void>((resolve) => {
          settle = resolve;
        }),
      );
      held[0].release();
      assert.isEmpty(listRuntimeLogs({ turnId: "occupancy-queued" }));
      now = 400;
      settle();
      const admitted = await pending;
      const event = listRuntimeLogs({ turnId: "occupancy-queued" }).find(
        (entry) => entry.operation === "queue.capacity",
      );
      assert.deepInclude(event?.details, {
        activeCount: 4,
        capacity: 4,
        waitMs: 400,
        reservedAvailable: false,
        lane: "foreground",
      });
      admitted.release();
    } finally {
      held.forEach((lease) => lease.release());
      lifecycle.closeAdmission();
      setRuntimeLogDiagnosticMode(false);
    }
  });

  it("caps background work at total minus two for an exploration capacity", async function () {
    const lifecycle = createPiRuntimeLifecycle({ capacity: 4 });
    const background = await Promise.all(
      ["b0", "b1"].map((id) => lifecycle.acquire(request(id, "background"))),
    );
    let thirdAdmitted = false;
    const queued = lifecycle
      .acquire(request("b2", "background"))
      .then((lease) => {
        thirdAdmitted = true;
        return lease;
      });
    const foreground = await Promise.all(
      ["f1", "f2"].map((id) => lifecycle.acquire(request(id, "foreground"))),
    );
    assert.equal(lifecycle.activeCount, 4);
    assert.isFalse(thirdAdmitted);
    background[0].release();
    await queued;
    assert.isTrue(thirdAdmitted);
    assert.isAtMost(lifecycle.activeCount, 4);
    [...background, ...foreground].forEach((lease) => lease.release());
    lifecycle.closeAdmission();
  });

  it("reserves two foreground slots and holds capacity until physical settlement", async function () {
    const lifecycle = createPiRuntimeLifecycle();
    const background = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        lifecycle.acquire(request(`b${i}`, "background")),
      ),
    );
    let admitted = false;
    const queued = lifecycle
      .acquire(request("queued", "background"))
      .then((lease) => {
        admitted = true;
        return lease;
      });
    const foreground = await Promise.all(
      ["f1", "f2"].map((id) => lifecycle.acquire(request(id, "foreground"))),
    );
    assert.isFalse(admitted);
    let settle!: () => void;
    background[0].trackPhysical(
      new Promise<void>((resolve) => {
        settle = resolve;
      }),
    );
    background[0].release();
    await Promise.resolve();
    assert.isFalse(admitted);
    settle();
    (await queued).release();
    [...background, ...foreground].forEach((lease) => lease.release());
    lifecycle.closeAdmission();
  });

  it("checkpoints only monotonic active time and never replenishes restored budgets", async function () {
    let now = 0;
    const lifecycle = createPiRuntimeLifecycle({ monotonicNow: () => now });
    const lease = await lifecycle.acquire({
      ...request("budget", "foreground"),
      budgetMs: 1000,
      elapsedMs: 600,
    });
    now = 150;
    assert.deepEqual(lease.checkpoint(true), {
      version: 1,
      turnId: "budget",
      budgetMs: 1000,
      activeMs: 750,
      remainingMs: 250,
      resumeEligible: true,
    });
    lease.release();
    now = 10_000;
    assert.equal(lease.checkpoint(true).activeMs, 750);
    lifecycle.closeAdmission();
  });

  it("aborts active work and rejects queued admission synchronously on shutdown", async function () {
    const lifecycle = createPiRuntimeLifecycle();
    const active = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        lifecycle.acquire(request(`f${i}`, "foreground")),
      ),
    );
    const queued = lifecycle.acquire(request("queued", "foreground")).then(
      () => false,
      () => true,
    );
    lifecycle.closeAdmission();
    assert.isTrue(active.every((lease) => lease.signal.aborted));
    assert.isTrue(await queued);
    assert.isTrue(
      await lifecycle.acquire(request("late", "foreground")).then(
        () => false,
        () => true,
      ),
    );
    active.forEach((lease) => lease.release());
  });

  it("runs maintenance serially without overlapping passes", async function () {
    const lifecycle = createPiRuntimeLifecycle();
    let finish!: () => void;
    let calls = 0;
    const task = () => {
      calls++;
      return new Promise<void>((resolve) => {
        finish = resolve;
      });
    };
    const first = lifecycle.maintain(task);
    const second = lifecycle.maintain(task);
    await Promise.resolve();
    assert.equal(calls, 1);
    finish();
    await Promise.all([first, second]);
    assert.equal(calls, 1);
    lifecycle.closeAdmission();
  });

  it("refuses a restored execution whose active budget is already spent", async function () {
    const lifecycle = createPiRuntimeLifecycle();
    const rejected = await lifecycle
      .acquire({
        ...request("spent", "foreground"),
        budgetMs: 1000,
        elapsedMs: 1000,
      })
      .then(
        () => false,
        () => true,
      );
    assert.isTrue(rejected);
    lifecycle.closeAdmission();
  });

  it("makes fair progress between occupied foreground and background lanes", async function () {
    const lifecycle = createPiRuntimeLifecycle();
    const held = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        lifecycle.acquire(request(`held-${index}`, "foreground")),
      ),
    );
    const admitted: string[] = [];
    const pending = ["f1", "f2", "b1", "b2"].map((id) =>
      lifecycle
        .acquire(request(id, id.startsWith("f") ? "foreground" : "background"))
        .then((lease) => {
          admitted.push(id);
          return lease;
        }),
    );
    held.slice(0, 4).forEach((lease) => lease.release());
    const leases = await Promise.all(pending);
    assert.deepEqual(
      admitted.filter((id) => id.startsWith("f")),
      ["f1", "f2"],
    );
    assert.deepEqual(
      admitted.filter((id) => id.startsWith("b")),
      ["b1", "b2"],
    );
    assert.notEqual(admitted[0][0], admitted[1][0]);
    assert.notEqual(admitted[2][0], admitted[3][0]);
    [...held, ...leases].forEach((lease) => lease.release());
    lifecycle.closeAdmission();
  });

  it("allows maintenance to retry after a synchronous task failure", async function () {
    const lifecycle = createPiRuntimeLifecycle();
    await Promise.resolve()
      .then(() =>
        lifecycle.maintain(() => {
          throw new Error("maintenance_failed");
        }),
      )
      .catch(() => undefined);
    let retried = false;
    await lifecycle.maintain(async () => {
      retried = true;
    });
    assert.isTrue(retried);
    lifecycle.closeAdmission();
  });

  it("ends concurrent shutdown waits without inventing physical settlement", async function () {
    const lifecycle = createPiRuntimeLifecycle();
    const lease = await lifecycle.acquire(request("stalled", "foreground"));
    let settle!: () => void;
    const physical = new Promise<void>((resolve) => {
      settle = resolve;
    });
    lease.trackPhysical(physical);
    lifecycle.closeAdmission();
    lease.release();
    const deadline = Date.now();
    await Promise.all([
      waitForPiShutdown(physical, deadline),
      waitForPiShutdown(new Promise<void>(() => undefined), deadline),
    ]);
    assert.isTrue(lease.signal.aborted);
    assert.isTrue(lifecycle.hasPhysicalHold());
    settle();
    await physical;
    assert.isFalse(lifecycle.hasPhysicalHold());
  });
});
