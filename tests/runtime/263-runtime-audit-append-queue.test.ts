import { assert } from "chai";
import {
  createRuntimeAuditAppendQueue,
  type RuntimeAuditAppendQueueLogEvent,
} from "../../src/modules/runtimeAuditAppendQueue";

describe("runtime audit append queue", function () {
  function deferred() {
    let resolve: () => void = () => undefined;
    const promise = new Promise<void>((resolvePromise) => {
      resolve = resolvePromise;
    });
    return { promise, resolve };
  }

  function settleMicrotasks() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  function createHarness(options?: { maxPendingBytes?: number }) {
    const written: string[] = [];
    const events: RuntimeAuditAppendQueueLogEvent[] = [];
    const queue = createRuntimeAuditAppendQueue({
      log: (event) => events.push(event),
      maxPendingEntries: 3,
      maxPendingBytes: options?.maxPendingBytes ?? 4096,
      sink: async ({ lines }) => {
        written.push(...lines);
      },
    });
    return { queue, events, written };
  }

  it("appends through the shared sink and flushes per owner", async function () {
    const harness = createHarness();
    try {
      harness.queue.append({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
        requestId: "req-1",
        line: "first\n",
      });
      harness.queue.append({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
        line: "second\n",
      });
      harness.queue.append({
        key: "owner-b/file",
        coordinatorOwner: "owner-b",
        owner: "owner-b",
        path: "/tmp/owner-b.ndjson",
        line: "other\n",
      });
      assert.deepEqual(harness.queue.keysForOwner("owner-a"), ["owner-a/file"]);

      await harness.queue.flush("owner-a");
      assert.deepEqual(harness.written, ["first\n", "second\n"]);

      await harness.queue.flushAndDiscardAll();
      assert.deepEqual(harness.written, ["first\n", "second\n", "other\n"]);
    } finally {
      harness.queue.discardAll();
    }
  });

  it("bounds pending evidence and reports every drop with its own counts", async function () {
    const harness = createHarness({ maxPendingBytes: 6 });
    try {
      for (let index = 1; index <= 5; index += 1) {
        harness.queue.append({
          key: "owner-a/file",
          coordinatorOwner: "owner-a",
          owner: "owner-a",
          path: "/tmp/owner-a.ndjson",
          line: index + "\n",
        });
      }
      const overflows = harness.events.filter(
        (event) => event.kind === "overflow",
      );
      assert.lengthOf(overflows, 2);
      assert.deepEqual(
        overflows.map((event) => event.droppedEntries),
        [1, 1],
      );
      assert.deepEqual(
        overflows.map((event) => event.droppedBytes),
        [2, 2],
      );
      assert.deepEqual(
        overflows.map((event) => event.overflowEpisode),
        [1, 1],
      );

      await harness.queue.flush();
      assert.deepEqual(harness.written, ["3\n", "4\n", "5\n"]);
    } finally {
      harness.queue.discardAll();
    }
  });

  it("reports sink failures and keeps the record for retry", async function () {
    const events: RuntimeAuditAppendQueueLogEvent[] = [];
    const written: string[] = [];
    let failing = true;
    const queue = createRuntimeAuditAppendQueue({
      log: (event) => events.push(event),
      maxPendingEntries: 10,
      maxPendingBytes: 4096,
      sink: async ({ lines }) => {
        if (failing) {
          throw new Error("sink_unavailable");
        }
        written.push(...lines);
      },
    });
    try {
      queue.append({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
        requestId: "req-2",
        line: "line\n",
      });
      await queue.flush("owner-a").catch(() => undefined);
      const failures = events.filter((event) => event.kind === "append-failed");
      assert.isAtLeast(failures.length, 1);
      assert.equal(failures[0]?.owner, "owner-a");
      assert.equal(failures[0]?.key, "owner-a/file");
      assert.equal(failures[0]?.path, "/tmp/owner-a.ndjson");

      failing = false;
      await queue.flush("owner-a");
      assert.deepEqual(written, ["line\n"]);
    } finally {
      await queue.discardAndWait("owner-a");
    }
  });

  it("captures a fixed snapshot after prior writes settle and excludes later records", async function () {
    const harness = createHarness();
    let snapshot: string[] = [];
    try {
      harness.queue.append({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
        line: "before-1\n",
      });
      harness.queue.append({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
        line: "before-2\n",
      });

      const captured = await harness.queue.barrier("owner-a", async () => {
        // Every pre-barrier record has reached the sink before this runs.
        snapshot = [...harness.written];
        harness.queue.append({
          key: "owner-a/file",
          coordinatorOwner: "owner-a",
          owner: "owner-a",
          path: "/tmp/owner-a.ndjson",
          line: "after\n",
        });
        return "snapshot-ready";
      });

      assert.equal(captured, "snapshot-ready");
      assert.deepEqual(snapshot, ["before-1\n", "before-2\n"]);
      assert.equal(snapshot.includes("after\n"), false);

      await harness.queue.flush("owner-a");
      assert.equal(harness.written.includes("after\n"), true);
    } finally {
      harness.queue.discardAll();
    }
  });

  it("discards an owner pending evidence before removal", async function () {
    const harness = createHarness();
    try {
      harness.queue.append({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
        line: "dropped\n",
      });
      await harness.queue.discardAndWait("owner-a");
      assert.deepEqual(harness.queue.keysForOwner("owner-a"), []);
      await harness.queue.flush();
      assert.deepEqual(harness.written, []);
    } finally {
      harness.queue.discardAll();
    }
  });

  it("excludes records appended while a blocked sink and a gated capture run", async function () {
    this.timeout(20_000);
    const sinkGate = deferred();
    const captureGate = deferred();
    const fileLines: string[] = [];
    let captureStarted = false;
    const queue = createRuntimeAuditAppendQueue({
      log: () => undefined,
      maxPendingEntries: 100,
      maxPendingBytes: 65_536,
      sink: async ({ lines }) => {
        await sinkGate.promise;
        fileLines.push(...lines);
      },
    });
    try {
      queue.append({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
        line: "before-1\n",
      });
      queue.append({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
        line: "before-2\n",
      });

      let snapshot: string[] = [];
      const barrier = queue.barrier("owner-a", async () => {
        captureStarted = true;
        await captureGate.promise;
        snapshot = [...fileLines];
        return snapshot;
      });

      // The initial sink is still blocked, so the capture cannot start yet.
      await settleMicrotasks();
      assert.equal(captureStarted, false);

      queue.append({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
        line: "post-while-inflight\n",
      });

      // Appended while the sink is blocked: after the fixed watermark.
      queue.append({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
        line: "during-sink\n",
      });

      sinkGate.resolve();
      await settleMicrotasks();
      await settleMicrotasks();
      assert.equal(captureStarted, true);

      // Appended while the async capture is blocked: still after the watermark.
      queue.append({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
        line: "during-capture\n",
      });

      captureGate.resolve();
      assert.deepEqual(await barrier, ["before-1\n", "before-2\n"]);
      assert.equal(snapshot.includes("during-sink\n"), false);
      assert.equal(snapshot.includes("during-capture\n"), false);
      assert.equal(fileLines.includes("during-sink\n"), false);
      assert.equal(fileLines.includes("during-capture\n"), false);

      // Released evidence stays in normal storage after the capture.
      await queue.flush("owner-a");
      assert.equal(fileLines.includes("during-sink\n"), true);
      assert.equal(fileLines.includes("during-capture\n"), true);
    } finally {
      sinkGate.resolve();
      captureGate.resolve();
      await queue.discardAndWait("owner-a");
    }
  });

  it("keeps independent owners draining while another owner is frozen", async function () {
    this.timeout(20_000);
    const sinkGate = deferred();
    const ownerA: string[] = [];
    const ownerB: string[] = [];
    const queue = createRuntimeAuditAppendQueue({
      log: () => undefined,
      maxPendingEntries: 100,
      maxPendingBytes: 65_536,
      sink: async ({ owner, lines }) => {
        if (owner === "owner-a") {
          await sinkGate.promise;
          ownerA.push(...lines);
          return;
        }
        ownerB.push(...lines);
      },
    });
    try {
      queue.append({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
        line: "a-1\n",
      });
      const barrier = queue.barrier("owner-a", async () => [...ownerA]);

      queue.append({
        key: "owner-b/file",
        coordinatorOwner: "owner-b",
        owner: "owner-b",
        path: "/tmp/owner-b.ndjson",
        line: "b-1\n",
      });
      await queue.flush("owner-b");
      assert.deepEqual(ownerB, ["b-1\n"]);

      sinkGate.resolve();
      assert.deepEqual(await barrier, ["a-1\n"]);
    } finally {
      sinkGate.resolve();
      await queue.discardAndWait("owner-a");
      await queue.discardAndWait("owner-b");
    }
  });

  it("captures pre-barrier pending queued behind a blocked write and gates later threshold drains", async function () {
    this.timeout(30_000);
    const sinkGate = deferred();
    const captureGate = deferred();
    const fileLines: string[] = [];
    let captureStarted = false;
    const queue = createRuntimeAuditAppendQueue({
      log: () => undefined,
      // Large limits so only the coordinator threshold can trigger a drain.
      maxPendingEntries: 100_000,
      maxPendingBytes: 100_000_000,
      sink: async ({ lines }) => {
        await sinkGate.promise;
        fileLines.push(...lines);
      },
    });
    try {
      // Trip the coordinator threshold so a write is genuinely in flight and
      // blocks inside the sink before the barrier runs.
      for (let index = 0; index < 256; index += 1) {
        queue.append({
          key: "owner-a/file",
          coordinatorOwner: "owner-a",
          owner: "owner-a",
          path: "/tmp/owner-a.ndjson",
          line: "blocked-" + index + "\n",
        });
      }
      await settleMicrotasks();

      // Pre-barrier pending, queued behind the blocked write.
      queue.append({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
        line: "pending-pre\n",
      });
      queue.append({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
        line: "pending-pre-2\n",
      });

      const barrier = queue.barrier("owner-a", async () => {
        captureStarted = true;
        await captureGate.promise;
        return [...fileLines];
      });

      await settleMicrotasks();
      assert.equal(captureStarted, false);

      queue.append({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
        line: "post-while-inflight\n",
      });

      sinkGate.resolve();
      await settleMicrotasks();
      await settleMicrotasks();
      await settleMicrotasks();
      assert.equal(captureStarted, true);

      // Post-barrier burst, large enough to trip the coordinator threshold
      // while the capture is still blocked.
      for (let index = 0; index < 400; index += 1) {
        queue.append({
          key: "owner-a/file",
          coordinatorOwner: "owner-a",
          owner: "owner-a",
          path: "/tmp/owner-a.ndjson",
          line: "post-" + index + "\n",
        });
      }

      captureGate.resolve();
      const snapshot = await barrier;
      assert.equal(
        snapshot.includes("blocked-0\n"),
        true,
        "the in-flight batch must be settled before capture",
      );
      assert.equal(snapshot.includes("pending-pre\n"), true);
      assert.equal(snapshot.includes("pending-pre-2\n"), true);
      assert.equal(
        snapshot.some((line) => line.startsWith("post-")),
        false,
      );

      await queue.flush("owner-a");
      assert.equal(fileLines.includes("post-399\n"), true);
    } finally {
      sinkGate.resolve();
      captureGate.resolve();
      await queue.discardAndWait("owner-a");
    }
  });

  it("gates a bound key that has no records when the barrier starts", async function () {
    this.timeout(30_000);
    const captureGate = deferred();
    const fileLines: string[] = [];
    let captureStarted = false;
    const queue = createRuntimeAuditAppendQueue({
      log: () => undefined,
      maxPendingEntries: 100_000,
      maxPendingBytes: 100_000_000,
      sink: async ({ lines }) => {
        fileLines.push(...lines);
      },
    });
    try {
      // Owner is known before any record is admitted, as after a restart.
      queue.bind({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
      });
      assert.deepEqual(queue.keysForOwner("owner-a"), ["owner-a/file"]);

      const barrier = queue.barrier("owner-a", async () => {
        captureStarted = true;
        await captureGate.promise;
        return [...fileLines];
      });
      await settleMicrotasks();
      assert.equal(captureStarted, true);

      // A burst large enough to trip the threshold mid-capture must stay out.
      for (let index = 0; index < 400; index += 1) {
        queue.append({
          key: "owner-a/file",
          coordinatorOwner: "owner-a",
          owner: "owner-a",
          path: "/tmp/owner-a.ndjson",
          line: "post-" + index + "\n",
        });
      }

      captureGate.resolve();
      assert.deepEqual(await barrier, []);

      await queue.flush("owner-a");
      assert.equal(fileLines.includes("post-399\n"), true);
    } finally {
      captureGate.resolve();
      await queue.discardAndWait("owner-a");
    }
  });

  it("settles a barrier write before a concurrent discard removes the key", async function () {
    this.timeout(30_000);
    const captureGate = deferred();
    const writtenAfterDiscard: string[] = [];
    let discarded = false;
    const queue = createRuntimeAuditAppendQueue({
      log: () => undefined,
      maxPendingEntries: 100,
      maxPendingBytes: 65_536,
      sink: async ({ lines }) => {
        if (discarded) {
          writtenAfterDiscard.push(...lines);
        }
      },
    });
    try {
      queue.bind({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
      });
      queue.append({
        key: "owner-a/file",
        coordinatorOwner: "owner-a",
        owner: "owner-a",
        path: "/tmp/owner-a.ndjson",
        line: "settled-by-barrier\n",
      });

      const barrier = queue.barrier("owner-a", async () => {
        await captureGate.promise;
        return "captured";
      });
      await settleMicrotasks();

      const discard = queue.discardAndWait("owner-a").then(() => {
        discarded = true;
      });
      // The discard must not be considered done while the barrier runs.
      await settleMicrotasks();
      assert.equal(discarded, false);

      captureGate.resolve();
      assert.equal(await barrier, "captured");
      await discard;
      assert.deepEqual(writtenAfterDiscard, []);
      assert.deepEqual(queue.keysForOwner("owner-a"), []);
    } finally {
      captureGate.resolve();
      await queue.discardAndWait("owner-a");
    }
  });
});
