import { assert } from "chai";
import {
  drainAcpRuntimeReplayPublication,
  drainAcpRuntimeReplayPublicationEpoch,
  waitAcpRuntimeReplayWorkspaceReadiness,
  type AcpRuntimeReplayForcedPublication,
  type AcpRuntimeReplayPublicationInspection,
  type AcpRuntimeReplayPublicationLifecycle,
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

function lifecycle(
  tab: "acp-chat" | "acp-skills",
  publicationId: string,
  state: AcpRuntimeReplayPublicationLifecycle["state"],
  deliverySequence = 1,
  reason?: string,
): AcpRuntimeReplayPublicationLifecycle {
  return {
    source: tab,
    tab,
    publicationId,
    deliverySequence,
    state,
    ...(reason ? { reason } : {}),
  };
}

function forced(
  tab: "acp-chat" | "acp-skills",
  publicationId: string,
  deliverySequence = 1,
): AcpRuntimeReplayForcedPublication {
  return { source: tab, tab, publicationId, deliverySequence };
}

describe("ACP runtime replay publication sidecar", function () {
  it("drains both ACP lanes before capturing per-source watermarks", async function () {
    let publications: AcpRuntimeReplayPublicationInspection["publications"] = [
      lifecycle("acp-chat", "chat-before", "pending", 5),
      lifecycle("acp-skills", "skills-before", "rejected", 8, "superseded"),
    ];
    let settled = false;
    const pending = drainAcpRuntimeReplayPublicationEpoch({
      timeoutMs: 250,
      inspect: () => ({ childWindow: null, publications }),
    });
    void pending.then(() => {
      settled = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.isFalse(settled);
    publications = [
      lifecycle("acp-chat", "chat-before", "render-complete", 5),
      lifecycle("acp-skills", "skills-before", "rejected", 8, "superseded"),
    ];
    assert.deepEqual(await pending, {
      ok: true,
      watermarks: { "acp-chat": 5, "acp-skills": 8 },
    });
  });

  it("uses readiness without an ACP publication identity for SkillRunner", async function () {
    const child = new FakePublicationWindow();
    let ready = false;
    setTimeout(() => {
      ready = true;
    }, 20);

    assert.deepEqual(
      await waitAcpRuntimeReplayWorkspaceReadiness({
        tab: "skillrunner",
        timeoutMs: 100,
        inspect: () =>
          ready
            ? inspection(child)
            : inspection(null, [], "workspace-child-not-ready"),
      }),
      { ok: true },
    );
  });

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
        publications = [lifecycle("acp-skills", "publication-1", "pending")];
        return forced("acp-skills", "publication-1");
      },
    });
    void pending.then(() => {
      settled = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.isFalse(settled, "delivery without host render ack must not drain");

    publications = [
      lifecycle("acp-skills", "publication-1", "render-complete"),
    ];
    assert.deepEqual(await pending, { ok: true });
  });

  it("does not accept another publication's render acknowledgement", async function () {
    const child = new FakePublicationWindow();
    let publications: AcpRuntimeReplayPublicationInspection["publications"] = [
      lifecycle("acp-chat", "publication-other", "render-complete"),
    ];
    let settled = false;
    const pending = drainAcpRuntimeReplayPublication({
      tab: "acp-chat",
      timeoutMs: 250,
      inspect: () => inspection(child, publications),
      forcePublish: async () => forced("acp-chat", "publication-target", 2),
    });
    void pending.then(() => {
      settled = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.isFalse(settled);
    publications = [
      lifecycle("acp-chat", "publication-target", "render-complete", 2),
    ];
    assert.deepEqual(await pending, { ok: true });
  });

  it("waits for every same-tab publication through the forced delivery barrier", async function () {
    const child = new FakePublicationWindow();
    let publications: AcpRuntimeReplayPublicationInspection["publications"] = [
      lifecycle("acp-skills", "publication-before", "pending", 1),
    ];
    let forceCalls = 0;
    let settled = false;
    const pending = drainAcpRuntimeReplayPublication({
      tab: "acp-skills",
      timeoutMs: 250,
      inspect: () => inspection(child, publications),
      forcePublish: async () => {
        forceCalls += 1;
        publications = [
          lifecycle("acp-skills", "publication-before", "render-complete", 1),
          lifecycle("acp-skills", "publication-target", "pending", 2),
        ];
        return forced("acp-skills", "publication-target", 2);
      },
    });
    void pending.then(() => {
      settled = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.isFalse(settled);
    assert.equal(forceCalls, 0);
    publications = [
      lifecycle("acp-skills", "publication-before", "render-complete", 1),
    ];
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(forceCalls, 1);
    publications = [
      lifecycle("acp-skills", "publication-before", "render-complete", 1),
      lifecycle("acp-skills", "publication-target", "render-complete", 2),
    ];
    assert.deepEqual(await pending, { ok: true });
  });

  it("waits for precursor work materialized while creating the forced barrier", async function () {
    const child = new FakePublicationWindow();
    let publications: AcpRuntimeReplayPublicationInspection["publications"] =
      [];
    let settled = false;
    const pending = drainAcpRuntimeReplayPublication({
      tab: "acp-chat",
      timeoutMs: 250,
      inspect: () => inspection(child, publications),
      forcePublish: async () => {
        publications = [
          lifecycle("acp-chat", "publication-precursor", "pending", 1),
          lifecycle("acp-chat", "publication-target", "pending", 2),
        ];
        return forced("acp-chat", "publication-target", 2);
      },
    });
    void pending.then(() => {
      settled = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 25));
    publications = [
      lifecycle("acp-chat", "publication-precursor", "pending", 1),
      lifecycle("acp-chat", "publication-target", "render-complete", 2),
    ];
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.isFalse(settled);
    publications = [
      lifecycle("acp-chat", "publication-precursor", "render-complete", 1),
      lifecycle("acp-chat", "publication-target", "render-complete", 2),
    ];
    assert.deepEqual(await pending, { ok: true });
  });

  it("starts the forced barrier after the prior publication epoch", async function () {
    const child = new FakePublicationWindow();
    let forceCalls = 0;
    let publications: AcpRuntimeReplayPublicationInspection["publications"] = [
      lifecycle(
        "acp-skills",
        "publication-prior-rejected",
        "rejected",
        11,
        "render-failed",
      ),
    ];
    const pending = drainAcpRuntimeReplayPublication({
      tab: "acp-skills",
      timeoutMs: 250,
      inspect: () => inspection(child, publications),
      forcePublish: async () => {
        forceCalls += 1;
        publications = [
          ...publications,
          lifecycle("acp-skills", "publication-target", "render-complete", 12),
        ];
        return forced("acp-skills", "publication-target", 12);
      },
    });

    assert.deepEqual(await pending, { ok: true });
    assert.equal(forceCalls, 1);
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
          lifecycle(
            "acp-chat",
            "publication-rejected",
            "rejected",
            1,
            "stale-revision",
          ),
        ];
        return forced("acp-chat", "publication-rejected");
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
          lifecycle("acp-skills", "publication-retry", "render-complete"),
        ];
        return forced("acp-skills", "publication-retry");
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
              ? [lifecycle("acp-chat", "publication-1", "rejected", 1, reason)]
              : []),
            lifecycle(
              "acp-chat",
              publicationId,
              forceCalls === 1 ? "rejected" : "render-complete",
              forceCalls,
              forceCalls === 1 ? reason : undefined,
            ),
          ];
          return forced("acp-chat", publicationId, forceCalls);
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
          lifecycle("acp-chat", "publication-2", "render-complete", 2),
        ];
        return forced("acp-chat", "publication-2", 2);
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(forceCalls, 1);
    releaseFirst();
    assert.deepEqual(await pending, { ok: true });
    assert.equal(forceCalls, 2);
  });

  it("rejects a forced publication without a canonical delivery barrier", async function () {
    const child = new FakePublicationWindow();
    const pending = drainAcpRuntimeReplayPublication({
      tab: "acp-chat",
      timeoutMs: 100,
      inspect: () => inspection(child),
      forcePublish: async () =>
        ({
          source: "acp-chat",
          tab: "acp-chat",
          publicationId: "publication-invalid",
          deliverySequence: 0,
        }) as AcpRuntimeReplayForcedPublication,
    });

    assert.deepEqual(await pending, {
      ok: false,
      detail: "workspace-publication-invalid-barrier:acp-chat",
    });
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
