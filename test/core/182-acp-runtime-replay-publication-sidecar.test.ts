import { assert } from "chai";
import {
  drainAcpRuntimeReplayPublication,
  type AcpRuntimeReplayPublicationWindow,
} from "../../src/modules/acpRuntimeReplayPublicationSidecar";

class FakePublicationWindow implements AcpRuntimeReplayPublicationWindow {
  private readonly listeners = new Map<string, Set<(event: any) => void>>();
  readonly frames: Array<() => void> = [];

  addEventListener(type: string, listener: (event: any) => void) {
    const entries = this.listeners.get(type) || new Set();
    entries.add(listener);
    this.listeners.set(type, entries);
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  requestAnimationFrame(callback: () => void) {
    this.frames.push(callback);
    return this.frames.length;
  }

  cancelAnimationFrame() {
    return;
  }

  dispatch(type: string, data?: unknown, source?: unknown) {
    for (const listener of [...(this.listeners.get(type) || [])]) {
      listener(type === "message" ? { data, source } : {});
    }
  }

  flushFrame() {
    this.frames.shift()?.();
  }

  listenerCount(type: string) {
    return this.listeners.get(type)?.size || 0;
  }
}

function snapshotMessage(tab: "acp-chat" | "acp-skills", revision: number) {
  return {
    type: tab === "acp-chat" ? "acp:snapshot" : "acp-skill-run:snapshot",
    payload: {
      sidebar: {
        panes: {
          [tab]: { revision },
        },
      },
    },
  };
}

function cancellationSignal() {
  const listeners = new Set<() => void>();
  return {
    signal: {
      aborted: false,
      addEventListener(_type: "abort", listener: () => void) {
        listeners.add(listener);
      },
      removeEventListener(_type: "abort", listener: () => void) {
        listeners.delete(listener);
      },
    },
    abort() {
      this.signal.aborted = true;
      for (const listener of [...listeners]) listener();
    },
    listenerCount: () => listeners.size,
  };
}

describe("ACP runtime replay publication sidecar", function () {
  it("accepts absent, direct, and wrapped-equivalent Zotero publishers after render", async function () {
    const canonicalPublisher = {};
    const cases: Array<{
      label: string;
      publisherWindow: unknown;
      source: unknown;
    }> = [
      {
        label: "absent source",
        publisherWindow: canonicalPublisher,
        source: undefined,
      },
      {
        label: "direct source",
        publisherWindow: canonicalPublisher,
        source: canonicalPublisher,
      },
      {
        label: "expected wrapped source",
        publisherWindow: { wrappedJSObject: canonicalPublisher },
        source: canonicalPublisher,
      },
      {
        label: "observed wrapped source",
        publisherWindow: canonicalPublisher,
        source: { wrappedJSObject: canonicalPublisher },
      },
    ];
    for (const entry of cases) {
      const child = new FakePublicationWindow();
      let revision = 4;
      const pending = drainAcpRuntimeReplayPublication({
        tab: "acp-chat",
        timeoutMs: 100,
        inspect: () => ({
          childWindow: child,
          publisherWindow: entry.publisherWindow,
          revision,
        }),
        forcePublish: async () => {
          revision = 5;
          child.dispatch(
            "message",
            snapshotMessage("acp-chat", revision),
            entry.source,
          );
        },
      });
      await Promise.resolve();
      let settled = false;
      void pending.then(() => {
        settled = true;
      });
      await Promise.resolve();
      assert.isFalse(settled, entry.label);
      child.flushFrame();
      assert.deepEqual(await pending, { ok: true }, entry.label);
      assert.equal(child.listenerCount("message"), 0, entry.label);
      assert.equal(child.listenerCount("unload"), 0, entry.label);
    }
  });

  it("ignores a verifiably unrelated non-null publisher", async function () {
    const child = new FakePublicationWindow();
    const publisherWindow = {};
    const unrelatedPublisher = Object.defineProperty({}, "wrappedJSObject", {
      get() {
        throw new Error("Xray wrapper is not accessible");
      },
    });
    let revision = 4;
    const pending = drainAcpRuntimeReplayPublication({
      tab: "acp-chat",
      timeoutMs: 100,
      inspect: () => ({ childWindow: child, publisherWindow, revision }),
      forcePublish: async () => {
        revision = 5;
        child.dispatch(
          "message",
          snapshotMessage("acp-chat", revision),
          unrelatedPublisher,
        );
        child.dispatch(
          "message",
          snapshotMessage("acp-chat", revision),
          publisherWindow,
        );
      },
    });
    await Promise.resolve();
    assert.lengthOf(child.frames, 1);
    child.flushFrame();
    assert.deepEqual(await pending, { ok: true });
  });

  it("ignores stale revisions and the wrong tab", async function () {
    const child = new FakePublicationWindow();
    const publisherWindow = {};
    const pending = drainAcpRuntimeReplayPublication({
      tab: "acp-chat",
      timeoutMs: 25,
      inspect: () => ({ childWindow: child, publisherWindow, revision: 7 }),
      forcePublish: async () => {
        child.dispatch(
          "message",
          snapshotMessage("acp-chat", 7),
          publisherWindow,
        );
        child.dispatch(
          "message",
          snapshotMessage("acp-skills", 8),
          publisherWindow,
        );
      },
    });
    assert.deepEqual(await pending, {
      ok: false,
      detail: "workspace-publication-timeout:acp-chat",
    });
    assert.equal(child.listenerCount("message"), 0);
    assert.equal(child.listenerCount("unload"), 0);
  });

  it("retries an idempotent forced publication when the cold first build is superseded", async function () {
    const child = new FakePublicationWindow();
    const publisherWindow = {};
    let revision = 4;
    let forceCalls = 0;
    const pending = drainAcpRuntimeReplayPublication({
      tab: "acp-skills",
      timeoutMs: 500,
      inspect: () => ({ childWindow: child, publisherWindow, revision }),
      forcePublish: async () => {
        forceCalls += 1;
        if (forceCalls === 1) return;
        revision = 5;
        child.dispatch(
          "message",
          snapshotMessage("acp-skills", revision),
          publisherWindow,
        );
      },
    });

    const deadline = Date.now() + 500;
    while (child.frames.length === 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.lengthOf(child.frames, 1);
    child.flushFrame();
    assert.deepEqual(await pending, { ok: true });
    assert.isAtLeast(forceCalls, 2);
  });

  it("keeps forced publication retries single-flight", async function () {
    const child = new FakePublicationWindow();
    let revision = 1;
    let forceCalls = 0;
    let releaseFirst!: () => void;
    const firstPublication = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const pending = drainAcpRuntimeReplayPublication({
      tab: "acp-chat",
      timeoutMs: 750,
      inspect: () => ({ childWindow: child, revision }),
      forcePublish: async () => {
        forceCalls += 1;
        if (forceCalls === 1) {
          await firstPublication;
          return;
        }
        revision = 2;
        child.dispatch("message", snapshotMessage("acp-chat", revision));
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(forceCalls, 1);
    releaseFirst();
    const deadline = Date.now() + 500;
    while (child.frames.length === 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.lengthOf(child.frames, 1);
    child.flushFrame();
    assert.deepEqual(await pending, { ok: true });
    assert.equal(forceCalls, 2);
  });

  it("cleans up on abort, frame replacement, and unload", async function () {
    for (const terminal of ["abort", "replacement", "unload"] as const) {
      const child = new FakePublicationWindow();
      const replacement = new FakePublicationWindow();
      const cancellation = cancellationSignal();
      let current: AcpRuntimeReplayPublicationWindow | null = child;
      const pending = drainAcpRuntimeReplayPublication({
        tab: "acp-skills",
        timeoutMs: 100,
        signal: cancellation.signal,
        inspect: () => ({ childWindow: current, revision: 2 }),
        forcePublish: async () => undefined,
      });
      await Promise.resolve();
      if (terminal === "abort") cancellation.abort();
      if (terminal === "replacement") {
        current = replacement;
        child.dispatch("message", snapshotMessage("acp-skills", 3));
      }
      if (terminal === "unload") child.dispatch("unload");
      const result = await pending;
      assert.isFalse(result.ok);
      assert.equal(child.listenerCount("message"), 0);
      assert.equal(child.listenerCount("unload"), 0);
      assert.equal(cancellation.listenerCount(), 0);
    }
  });
});
