import { assert } from "chai";
import {
  drainAcpRuntimeReplayPublication,
  type AcpRuntimeReplayPublicationInspection,
  type AcpRuntimeReplayPublicationWindow,
} from "../../src/modules/acpRuntimeReplayPublicationSidecar";

class FakePublicationWindow implements AcpRuntimeReplayPublicationWindow {
  private readonly listeners = new Map<string, Set<(event: any) => void>>();

  addEventListener(type: string, listener: (event: any) => void) {
    const entries = this.listeners.get(type) || new Set();
    entries.add(listener);
    this.listeners.set(type, entries);
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string) {
    for (const listener of [...(this.listeners.get(type) || [])]) {
      listener({});
    }
  }

  listenerCount(type: string) {
    return this.listeners.get(type)?.size || 0;
  }
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

function inspection(
  childWindow: AcpRuntimeReplayPublicationWindow | null,
  publications: AcpRuntimeReplayPublicationInspection["publications"] = [],
  detail = "",
): AcpRuntimeReplayPublicationInspection {
  return { childWindow, publications, detail };
}

describe("ACP runtime replay publication sidecar", function () {
  it("waits for the exact forced publication render acknowledgement", async function () {
    const child = new FakePublicationWindow();
    let publications: AcpRuntimeReplayPublicationInspection["publications"] =
      [];
    let settled = false;
    const pending = drainAcpRuntimeReplayPublication({
      tab: "acp-skills",
      timeoutMs: 250,
      inspect: () => inspection(child, publications),
      forcePublish: async () => {
        publications = [{ publicationId: "publication-1", state: "pending" }];
        return { publicationId: "publication-1" };
      },
    });
    void pending.then(() => {
      settled = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.isFalse(settled, "delivery without host render ack must not drain");

    publications = [
      { publicationId: "publication-1", state: "render-complete" },
    ];
    assert.deepEqual(await pending, { ok: true });
  });

  it("does not accept another publication's render acknowledgement", async function () {
    const child = new FakePublicationWindow();
    let publications: AcpRuntimeReplayPublicationInspection["publications"] = [
      { publicationId: "publication-other", state: "render-complete" },
    ];
    let settled = false;
    const pending = drainAcpRuntimeReplayPublication({
      tab: "acp-chat",
      timeoutMs: 250,
      inspect: () => inspection(child, publications),
      forcePublish: async () => ({ publicationId: "publication-target" }),
    });
    void pending.then(() => {
      settled = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.isFalse(settled);
    publications = [
      { publicationId: "publication-target", state: "render-complete" },
    ];
    assert.deepEqual(await pending, { ok: true });
  });

  it("waits for older pending publications before closing the measurement boundary", async function () {
    const child = new FakePublicationWindow();
    let publications: AcpRuntimeReplayPublicationInspection["publications"] = [
      { publicationId: "publication-before", state: "pending" },
    ];
    let settled = false;
    const pending = drainAcpRuntimeReplayPublication({
      tab: "acp-skills",
      timeoutMs: 250,
      inspect: () => inspection(child, publications),
      forcePublish: async () => {
        publications = [
          { publicationId: "publication-before", state: "pending" },
          { publicationId: "publication-target", state: "pending" },
        ];
        return { publicationId: "publication-target" };
      },
    });
    void pending.then(() => {
      settled = true;
    });

    publications = [
      { publicationId: "publication-before", state: "pending" },
      { publicationId: "publication-target", state: "render-complete" },
    ];
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.isFalse(
      settled,
      "a prior late ack could otherwise leak into profile",
    );

    publications = [
      { publicationId: "publication-before", state: "render-complete" },
      { publicationId: "publication-target", state: "render-complete" },
    ];
    assert.deepEqual(await pending, { ok: true });
  });

  it("reports an explicit rejection for the forced publication", async function () {
    const child = new FakePublicationWindow();
    let publications: AcpRuntimeReplayPublicationInspection["publications"] =
      [];
    const pending = drainAcpRuntimeReplayPublication({
      tab: "acp-chat",
      timeoutMs: 100,
      inspect: () => inspection(child, publications),
      forcePublish: async () => {
        publications = [
          {
            publicationId: "publication-rejected",
            state: "rejected",
            reason: "stale-revision",
          },
        ];
        return { publicationId: "publication-rejected" };
      },
    });

    assert.deepEqual(await pending, {
      ok: false,
      detail:
        "workspace-publication-rejected:acp-chat:publication-rejected:stale-revision",
    });
  });

  it("retries an idempotent forced publication when no publication was produced", async function () {
    const child = new FakePublicationWindow();
    let publications: AcpRuntimeReplayPublicationInspection["publications"] =
      [];
    let forceCalls = 0;
    const pending = drainAcpRuntimeReplayPublication({
      tab: "acp-skills",
      timeoutMs: 500,
      inspect: () => inspection(child, publications),
      forcePublish: async () => {
        forceCalls += 1;
        if (forceCalls === 1) return undefined;
        publications = [
          { publicationId: "publication-retry", state: "render-complete" },
        ];
        return { publicationId: "publication-retry" };
      },
    });

    assert.deepEqual(await pending, { ok: true });
    assert.isAtLeast(forceCalls, 2);
  });

  it("retries transient superseded and old-owner publications", async function () {
    for (const reason of ["superseded", "old-owner"] as const) {
      const child = new FakePublicationWindow();
      let publications: AcpRuntimeReplayPublicationInspection["publications"] =
        [];
      let forceCalls = 0;
      const pending = drainAcpRuntimeReplayPublication({
        tab: "acp-chat",
        timeoutMs: 500,
        inspect: () => inspection(child, publications),
        forcePublish: async () => {
          forceCalls += 1;
          const publicationId = `publication-${forceCalls}`;
          publications = [
            ...(forceCalls > 1
              ? [
                  {
                    publicationId: "publication-1",
                    state: "rejected" as const,
                    reason,
                  },
                ]
              : []),
            {
              publicationId,
              state:
                forceCalls === 1
                  ? ("rejected" as const)
                  : ("render-complete" as const),
              ...(forceCalls === 1 ? { reason } : {}),
            },
          ];
          return { publicationId };
        },
      });

      assert.deepEqual(await pending, { ok: true }, reason);
      assert.equal(forceCalls, 2, reason);
    }
  });

  it("keeps forced publication retries single-flight", async function () {
    const child = new FakePublicationWindow();
    let publications: AcpRuntimeReplayPublicationInspection["publications"] =
      [];
    let forceCalls = 0;
    let releaseFirst!: () => void;
    const firstPublication = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const pending = drainAcpRuntimeReplayPublication({
      tab: "acp-chat",
      timeoutMs: 750,
      inspect: () => inspection(child, publications),
      forcePublish: async () => {
        forceCalls += 1;
        if (forceCalls === 1) {
          await firstPublication;
          return undefined;
        }
        publications = [
          { publicationId: "publication-2", state: "render-complete" },
        ];
        return { publicationId: "publication-2" };
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(forceCalls, 1);
    releaseFirst();
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
        inspect: () => inspection(current),
        forcePublish: async () => undefined,
      });
      await Promise.resolve();
      if (terminal === "abort") cancellation.abort();
      if (terminal === "replacement") current = replacement;
      if (terminal === "unload") child.dispatch("unload");
      const result = await pending;
      assert.isFalse(result.ok);
      assert.equal(child.listenerCount("unload"), 0);
      assert.equal(cancellation.listenerCount(), 0);
    }
  });
});
