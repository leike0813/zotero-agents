import { assert } from "chai";
import {
  createAcpRuntimeDependencyWarmupOwner,
  type AcpRuntimeDependencyWarmupRuntime,
} from "../../src/modules/acp/skillRun/acpRuntimeDependencyWarmup";
import type { WorkflowDependencyCatalog } from "../../src/modules/workflow/catalog/workflowRuntime";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function makeCatalog(
  args: {
    workflows?: Array<{
      id: string;
      provider: string;
      skillIds: string[];
    }>;
    skills?: Record<string, string>;
  } = {},
): WorkflowDependencyCatalog {
  const workflows = args.workflows || [];
  const skills = args.skills || {};
  return {
    workflows: workflows.map((workflow) => ({
      manifest: { id: workflow.id, provider: workflow.provider },
      skillIds: workflow.skillIds,
    })) as never,
    skills: {
      entries: Object.entries(skills).map(([id, runnerJsonPath]) => ({
        id,
        runnerJsonPath,
      })),
      entriesById: Object.fromEntries(
        Object.entries(skills).map(([id, runnerJsonPath]) => [
          id,
          { id, runnerJsonPath },
        ]),
      ),
      diagnostics: [],
    } as never,
  };
}

function createRuntime(
  overrides: Partial<AcpRuntimeDependencyWarmupRuntime> = {},
) {
  let catalog: WorkflowDependencyCatalog | null = null;
  let onCatalogChange: ((value: WorkflowDependencyCatalog) => void) | undefined;
  let onBackendChange: (() => void) | undefined;
  const calls: Array<{
    dependencies: string[];
    env: Record<string, string>;
    signal: unknown;
  }> = [];
  const logs: Array<{ level: string; message: string }> = [];
  const runnerReads: string[] = [];
  const runtime: AcpRuntimeDependencyWarmupRuntime = {
    getCatalog: () => catalog,
    subscribeCatalogChanges: (listener) => {
      onCatalogChange = listener;
      return () => {
        onCatalogChange = undefined;
      };
    },
    subscribeBackendChanges: (listener) => {
      onBackendChange = listener;
      return () => {
        onBackendChange = undefined;
      };
    },
    listBackendInstances: async () =>
      [{ id: "acp-1", type: "acp", enabled: true, env: {} }] as never,
    hasUv: () => true,
    getManagedWorkdir: () => "/managed/runtime/cache/acp-dependencies",
    ensureWorkdir: () => undefined,
    readRunnerJson: async (path) => {
      runnerReads.push(path);
      return { runtime: { dependencies: [path.replace("/runner/", "pkg-")] } };
    },
    compatibleBackendTypes: (manifest) =>
      manifest.provider === "acp" ? ["acp"] : [manifest.provider || ""],
    collectWorkflowSkillDependencies: (workflow) =>
      (workflow as unknown as { skillIds: string[] }).skillIds,
    resolveDependencies: (value) =>
      (value as { runtime?: { dependencies?: string[] } })?.runtime
        ?.dependencies || [],
    prepare: async (args) => {
      calls.push({
        dependencies: [...args.dependencies],
        env: { ...args.env },
        signal: args.signal,
      });
      return { ok: true };
    },
    log: (entry) => logs.push(entry),
    ...overrides,
  };
  return {
    runtime,
    calls,
    logs,
    runnerReads,
    publishCatalog(value: WorkflowDependencyCatalog) {
      catalog = value;
      onCatalogChange?.(value);
    },
    changeBackendConfig() {
      onBackendChange?.();
    },
  };
}

async function waitFor(predicate: () => boolean) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  assert.fail("timed out waiting for warmup work");
}

describe("ACP runtime dependency warmup", function () {
  it("filters workflows, warms per-Skill constraints, and deduplicates equivalent sets", async function () {
    const harness = createRuntime();
    harness.publishCatalog(
      makeCatalog({
        workflows: [
          { id: "sequence", provider: "acp", skillIds: ["one", "two"] },
          { id: "same-dependency", provider: "acp", skillIds: ["one"] },
          { id: "other-provider", provider: "http", skillIds: ["ignored"] },
        ],
        skills: {
          one: "/runner/one",
          two: "/runner/two",
          ignored: "/runner/ignored",
        },
      }),
    );
    const owner = createAcpRuntimeDependencyWarmupOwner(harness.runtime);

    owner.start();
    await waitFor(() => harness.calls.length === 2);
    await owner.stop();

    assert.deepEqual(
      harness.calls.map((call) => call.dependencies),
      [["pkg-one"], ["pkg-two"]],
    );
    assert.deepEqual(harness.runnerReads.sort(), [
      "/runner/one",
      "/runner/two",
    ]);
  });

  it("keeps dependency work separate for different backend environments", async function () {
    const harness = createRuntime({
      listBackendInstances: async () =>
        [
          { id: "acp-1", type: "acp", enabled: true, env: { MODE: "one" } },
          { id: "acp-2", type: "acp", enabled: true, env: { MODE: "two" } },
        ] as never,
    });
    harness.publishCatalog(
      makeCatalog({
        workflows: [{ id: "workflow", provider: "acp", skillIds: ["skill"] }],
        skills: { skill: "/runner/skill" },
      }),
    );
    const owner = createAcpRuntimeDependencyWarmupOwner(harness.runtime);

    owner.start();
    await waitFor(() => harness.calls.length === 2);
    await owner.stop();

    assert.deepEqual(
      harness.calls.map(({ env }) => env),
      [{ MODE: "one" }, { MODE: "two" }],
    );
  });

  it("returns from start before slow catalog or preparation work settles", async function () {
    const gate = deferred<unknown>();
    const harness = createRuntime({
      readRunnerJson: () => gate.promise,
    });
    harness.publishCatalog(
      makeCatalog({
        workflows: [{ id: "workflow", provider: "acp", skillIds: ["skill"] }],
        skills: { skill: "/runner/skill" },
      }),
    );
    const owner = createAcpRuntimeDependencyWarmupOwner(harness.runtime);

    owner.start();
    await Promise.resolve();
    assert.isEmpty(harness.calls);
    gate.resolve({ runtime: { dependencies: ["jinja2"] } });
    await waitFor(() => harness.calls.length === 1);
    await owner.stop();

    assert.deepEqual(harness.calls[0].dependencies, ["jinja2"]);
  });

  it("continues after one dependency preparation fails", async function () {
    const harness = createRuntime({
      prepare: async (args) => {
        harness.calls.push({
          dependencies: [...args.dependencies],
          env: { ...args.env },
          signal: args.signal,
        });
        if (args.dependencies[0] === "pkg-one") {
          throw new Error("offline");
        }
        return { ok: true };
      },
    });
    harness.publishCatalog(
      makeCatalog({
        workflows: [
          { id: "workflow", provider: "acp", skillIds: ["one", "two"] },
        ],
        skills: { one: "/runner/one", two: "/runner/two" },
      }),
    );
    const owner = createAcpRuntimeDependencyWarmupOwner(harness.runtime);

    owner.start();
    await waitFor(() => harness.calls.length === 2);
    await owner.stop();

    assert.isTrue(harness.logs.some((entry) => entry.level === "warn"));
    assert.deepEqual(harness.calls[1].dependencies, ["pkg-two"]);
  });

  it("reconciles catalog and backend preference changes", async function () {
    const harness = createRuntime();
    const owner = createAcpRuntimeDependencyWarmupOwner(harness.runtime);
    owner.start();
    harness.publishCatalog(
      makeCatalog({
        workflows: [{ id: "first", provider: "acp", skillIds: ["one"] }],
        skills: { one: "/runner/one" },
      }),
    );
    await waitFor(() => harness.calls.length === 1);
    harness.publishCatalog(
      makeCatalog({
        workflows: [{ id: "second", provider: "acp", skillIds: ["two"] }],
        skills: { two: "/runner/two" },
      }),
    );
    await waitFor(() => harness.calls.length === 2);
    harness.changeBackendConfig();
    await waitFor(() => harness.calls.length === 3);
    await owner.stop();

    assert.deepEqual(
      harness.calls.map((call) => call.dependencies),
      [["pkg-one"], ["pkg-two"], ["pkg-two"]],
    );
  });

  it("cancels obsolete catalog work and warms the replacement catalog", async function () {
    const observedSignals: Array<{ aborted: boolean }> = [];
    const harness = createRuntime({
      prepare: (args) => {
        observedSignals.push(args.signal);
        harness.calls.push({
          dependencies: [...args.dependencies],
          env: { ...args.env },
          signal: args.signal,
        });
        if (observedSignals.length > 1) return Promise.resolve({ ok: true });
        return new Promise<{ ok: boolean }>((_resolve, reject) => {
          args.signal.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            {
              once: true,
            },
          );
        });
      },
    });
    harness.publishCatalog(
      makeCatalog({
        workflows: [{ id: "old", provider: "acp", skillIds: ["one"] }],
        skills: { one: "/runner/one" },
      }),
    );
    const owner = createAcpRuntimeDependencyWarmupOwner(harness.runtime);

    owner.start();
    await waitFor(() => observedSignals.length === 1);
    harness.publishCatalog(
      makeCatalog({
        workflows: [{ id: "new", provider: "acp", skillIds: ["two"] }],
        skills: { two: "/runner/two" },
      }),
    );
    await waitFor(() => observedSignals.length === 2);
    await owner.stop();

    assert.isTrue(observedSignals[0].aborted);
    assert.deepEqual(
      harness.calls.map((call) => call.dependencies),
      [["pkg-one"], ["pkg-two"]],
    );
    assert.isEmpty(harness.logs);
  });

  it("does no warmup without uv and stops stale work from logging after shutdown", async function () {
    const gate = deferred<{ ok: boolean }>();
    const harness = createRuntime({
      hasUv: () => false,
      prepare: async (args) => {
        harness.calls.push({
          dependencies: [...args.dependencies],
          env: { ...args.env },
          signal: args.signal,
        });
        return gate.promise;
      },
    });
    harness.publishCatalog(
      makeCatalog({
        workflows: [{ id: "workflow", provider: "acp", skillIds: ["skill"] }],
        skills: { skill: "/runner/skill" },
      }),
    );
    const ownerWithoutUv = createAcpRuntimeDependencyWarmupOwner(
      harness.runtime,
    );
    ownerWithoutUv.start();
    await Promise.resolve();
    await ownerWithoutUv.stop();
    assert.isEmpty(harness.calls);

    const live = createRuntime({
      prepare: (args) => {
        live.calls.push({
          dependencies: [...args.dependencies],
          env: { ...args.env },
          signal: args.signal,
        });
        return new Promise((resolve, reject) => {
          args.signal.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            {
              once: true,
            },
          );
          void gate.promise.then(resolve, reject);
        });
      },
    });
    live.publishCatalog(
      makeCatalog({
        workflows: [{ id: "workflow", provider: "acp", skillIds: ["skill"] }],
        skills: { skill: "/runner/skill" },
      }),
    );
    const owner = createAcpRuntimeDependencyWarmupOwner(live.runtime);
    owner.start();
    await waitFor(() => live.calls.length === 1);
    await owner.stop();
    gate.resolve({ ok: true });
    await Promise.resolve();

    assert.isTrue((live.calls[0].signal as { aborted: boolean }).aborted);
    assert.isEmpty(live.logs);
  });

  it("bounds stop when runner reads or preparation ignore cancellation", async function () {
    const runnerReadStarted = deferred<void>();
    const runnerHarness = createRuntime({
      readRunnerJson: () => {
        runnerReadStarted.resolve();
        return new Promise(() => undefined);
      },
    });
    runnerHarness.publishCatalog(
      makeCatalog({
        workflows: [{ id: "workflow", provider: "acp", skillIds: ["skill"] }],
        skills: { skill: "/runner/skill" },
      }),
    );
    const runnerOwner = createAcpRuntimeDependencyWarmupOwner(
      runnerHarness.runtime,
    );
    runnerOwner.start();
    await runnerReadStarted.promise;
    let startedAt = Date.now();
    await runnerOwner.stop();
    assert.isAtMost(Date.now() - startedAt, 2_500);

    const prepareStarted = deferred<void>();
    const prepareHarness = createRuntime({
      prepare: () => {
        prepareStarted.resolve();
        return new Promise(() => undefined);
      },
    });
    prepareHarness.publishCatalog(
      makeCatalog({
        workflows: [{ id: "workflow", provider: "acp", skillIds: ["skill"] }],
        skills: { skill: "/runner/skill" },
      }),
    );
    const prepareOwner = createAcpRuntimeDependencyWarmupOwner(
      prepareHarness.runtime,
    );
    prepareOwner.start();
    await prepareStarted.promise;
    startedAt = Date.now();
    await prepareOwner.stop();
    assert.isAtMost(Date.now() - startedAt, 2_500);
  });

  it("contains observer and diagnostic failures during startup and shutdown", async function () {
    const harness = createRuntime({
      getCatalog: () => {
        throw new Error("catalog unavailable");
      },
      subscribeCatalogChanges: () => {
        throw new Error("observer unavailable");
      },
      subscribeBackendChanges: () => {
        throw new Error("preference observer unavailable");
      },
      log: () => {
        throw new Error("logger unavailable");
      },
    });
    const owner = createAcpRuntimeDependencyWarmupOwner(harness.runtime);

    assert.doesNotThrow(() => owner.start());
    await owner.stop();
  });
});
