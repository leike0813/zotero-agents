import { assert } from "chai";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { probeAcpBackendRuntimeOptions } from "../../src/modules/acp/transport/acpBackendProbe";
import type { AcpConnectionAdapter } from "../../src/modules/acp/transport/acpConnectionAdapter";
import { resolveAcpReasoningCatalog } from "../../src/modules/acp/chat/acpReasoningCatalog";
import { computeAcpBackendConfigFingerprint } from "../../src/backends/identity";
import { loadBackendsRegistrySync } from "../../src/backends/registry";
import type { BackendInstance } from "../../src/backends/types";
import { config } from "../../package.json";
import {
  clearRuntimeLogs,
  listRuntimeLogs,
} from "../../src/modules/runtimeLogManager";
import { createCancellationController } from "../../src/utils/wait";

function makeProbeAdapter(
  overrides: Partial<AcpConnectionAdapter> = {},
): AcpConnectionAdapter {
  return {
    initialize: async () => ({
      authMethods: [],
      agentName: "fake",
      agentVersion: "1",
      commandLabel: "fake",
      commandLine: "fake-acp",
      canLoadSession: false,
      canResumeSession: false,
      canUseHttpMcp: true,
      canUseSseMcp: false,
    }),
    newSession: async () => ({
      sessionId: "session-1",
    }),
    onUpdate: () => () => undefined,
    onClose: () => () => undefined,
    onDiagnostics: () => () => undefined,
    onPermissionRequest: () => () => undefined,
    loadSession: async () => ({ sessionId: "session-1" }),
    resumeSession: async () => ({ sessionId: "session-1" }),
    prompt: async () => ({ stopReason: "end_turn" }),
    cancel: async () => undefined,
    setMode: async () => undefined,
    setModel: async () => undefined,
    authenticate: async () => undefined,
    close: async () => undefined,
    ...overrides,
  };
}

describe("ACP backend probe", function () {
  let previousRuntimeRoot: string | undefined;
  let tempRoot = "";

  beforeEach(async function () {
    previousRuntimeRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "zs-acp-probe-"));
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = tempRoot;
    clearRuntimeLogs();
  });

  afterEach(async function () {
    if (typeof previousRuntimeRoot === "undefined") {
      delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    } else {
      process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRuntimeRoot;
    }
    clearRuntimeLogs();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("creates probe cwd, workspace, and runtime dirs before launching adapter", async function () {
    const seen: Array<{
      agentWorkspaceDir: string;
      sessionCwd: string;
      workspaceDir: string;
      runtimeDir: string;
    }> = [];
    const result = await probeAcpBackendRuntimeOptions({
      backend: {
        id: "acp-test",
        displayName: "ACP Test",
        type: "acp",
        baseUrl: "local://acp-test",
        command: "fake-acp",
      },
      createAdapter: async (args) => {
        seen.push({
          agentWorkspaceDir: args.agentWorkspaceDir,
          sessionCwd: args.sessionCwd,
          workspaceDir: args.workspaceDir,
          runtimeDir: args.runtimeDir,
        });
        for (const target of [
          args.agentWorkspaceDir,
          args.sessionCwd,
          args.workspaceDir,
          args.runtimeDir,
        ]) {
          const stat = await fs.stat(target);
          assert.isTrue(
            stat.isDirectory(),
            `${target} should exist before adapter launch`,
          );
        }
        return {
          initialize: async () => ({
            authMethods: [],
            agentName: "fake",
            agentVersion: "1",
            commandLabel: "fake",
            commandLine: "fake-acp",
            canLoadSession: false,
            canResumeSession: false,
            canUseHttpMcp: true,
            canUseSseMcp: false,
          }),
          newSession: async () => ({
            sessionId: "session-1",
            modes: {
              currentModeId: "default",
              availableModes: [{ id: "default", name: "Default" }],
            },
            models: {
              currentModelId: "model-1",
              availableModels: [{ modelId: "model-1", name: "Model 1" }],
            },
          }),
          onUpdate: () => () => undefined,
          onClose: () => () => undefined,
          onDiagnostics: () => () => undefined,
          onPermissionRequest: () => () => undefined,
          loadSession: async () => ({ sessionId: "session-1" }),
          resumeSession: async () => ({ sessionId: "session-1" }),
          prompt: async () => ({ stopReason: "end_turn" }),
          cancel: async () => undefined,
          setMode: async () => undefined,
          setModel: async () => undefined,
          authenticate: async () => undefined,
          close: async () => undefined,
        };
      },
    });

    assert.isTrue(result.ok);
    assert.lengthOf(seen, 1);
    assert.equal(seen[0]?.agentWorkspaceDir, seen[0]?.sessionCwd);
    assert.equal(seen[0]?.agentWorkspaceDir, seen[0]?.workspaceDir);
    assert.equal(result.backend.acp?.connectionTest?.status, "passed");
    assert.deepEqual(
      result.backend.acp?.runtimeOptionsCache?.displayModels.map(
        (entry) => entry.id,
      ),
      ["model-1"],
    );
    const probeLogs = listRuntimeLogs({
      backendId: "acp-test",
      operation: "probe-acp-runtime-options",
    });
    assert.deepEqual(
      probeLogs.map((entry) => entry.stage),
      ["acp-runtime-options-probe-started", "acp-runtime-options-probe-ok"],
    );
    assert.equal((probeLogs[1].details as any).cache.displayModels, 1);
  });

  it("derives runtime options cache from ACP config options", async function () {
    const result = await probeAcpBackendRuntimeOptions({
      backend: {
        id: "acp-config-options",
        displayName: "ACP Config Options",
        type: "acp",
        baseUrl: "local://acp-config-options",
        command: "fake-acp",
      },
      createAdapter: async () =>
        makeProbeAdapter({
          newSession: async () => ({
            sessionId: "session-1",
            configOptions: [
              {
                id: "mode",
                name: "Mode",
                category: "mode",
                type: "select",
                currentValue: "build",
                options: [
                  { value: "ask", name: "Ask" },
                  { value: "build", name: "Build" },
                ],
              },
              {
                id: "model",
                name: "Model",
                category: "model",
                type: "select",
                currentValue: "openai/gpt-5",
                options: [
                  { value: "openai/gpt-5", name: "GPT-5" },
                  { value: "anthropic/claude", name: "Claude" },
                ],
              },
              {
                id: "effort",
                name: "Reasoning",
                category: "thought_level",
                type: "select",
                currentValue: "high",
                options: [
                  { value: "low", name: "Low" },
                  { value: "high", name: "High" },
                ],
              },
            ],
          }),
        }),
    });

    const cache = result.backend.acp?.runtimeOptionsCache;
    assert.isTrue(result.ok);
    assert.equal(result.backend.acp?.connectionTest?.status, "passed");
    assert.deepEqual(
      cache?.modes.map((entry) => entry.id),
      ["ask", "build"],
    );
    assert.equal(cache?.currentModeId, "build");
    assert.deepEqual(
      cache?.displayModels.map((entry) => entry.id),
      ["openai/gpt-5", "anthropic/claude"],
    );
    assert.equal(cache?.currentDisplayModelId, "openai/gpt-5");
    assert.deepEqual(
      cache?.reasoningEfforts.map((entry) => entry.id),
      ["low", "high"],
    );
    assert.equal(cache?.currentReasoningEffortId, "high");
  });

  it("recognizes reasoning-only ACP config options as runtime capability", async function () {
    const result = await probeAcpBackendRuntimeOptions({
      backend: {
        id: "acp-reasoning-only",
        displayName: "ACP Reasoning Only",
        type: "acp",
        baseUrl: "local://acp-reasoning-only",
        command: "fake-acp",
      },
      createAdapter: async () =>
        makeProbeAdapter({
          newSession: async () => ({
            sessionId: "session-reasoning-only",
            configOptions: [
              {
                id: "effort",
                name: "Reasoning",
                category: "thought_level",
                type: "select",
                currentValue: "high",
                options: [
                  { value: "low", name: "Low" },
                  { value: "high", name: "High" },
                ],
              },
            ],
          }),
        }),
    });

    const cache = result.backend.acp?.runtimeOptionsCache;
    assert.isTrue(result.ok);
    assert.deepEqual(
      cache?.reasoningEfforts.map((entry) => entry.id),
      ["low", "high"],
    );
    assert.equal(cache?.currentReasoningEffortId, "high");
    assert.equal(cache?.reasoningSource, "explicit");
  });

  it("preserves offline cache on probe failure and replaces it on successful empty metadata", async function () {
    const existingCache = {
      refreshedAt: "2026-04-29T00:00:00.000Z",
      modes: [{ id: "ask", label: "Ask" }],
      currentModeId: "ask",
      rawModels: [{ id: "openai/gpt-5", label: "GPT-5" }],
      currentRawModelId: "openai/gpt-5",
      displayModels: [{ id: "openai/gpt-5", label: "GPT-5" }],
      currentDisplayModelId: "openai/gpt-5",
      reasoningEfforts: [{ id: "high", label: "High" }],
      currentReasoningEffortId: "high",
    };
    const backend = {
      id: "acp-preserve-cache",
      displayName: "ACP Preserve Cache",
      type: "acp",
      baseUrl: "local://acp-preserve-cache",
      command: "fake-acp",
      acp: {
        runtimeOptionsCache: existingCache,
      },
    };

    const failed = await probeAcpBackendRuntimeOptions({
      backend,
      createAdapter: async () => {
        throw new Error("spawn failed");
      },
    });
    const empty = await probeAcpBackendRuntimeOptions({
      backend,
      createAdapter: async () =>
        makeProbeAdapter({
          newSession: async () => ({
            sessionId: "session-1",
            configOptions: [],
            modes: { currentModeId: "", availableModes: [] },
            models: { currentModelId: "", availableModels: [] },
          }),
        }),
    });

    assert.isFalse(failed.ok);
    assert.include(
      listRuntimeLogs({
        backendId: "acp-preserve-cache",
        operation: "probe-acp-runtime-options",
      }).map((entry) => entry.stage),
      "acp-runtime-options-probe-failed",
    );
    assert.equal(
      failed.backend.acp?.runtimeOptionsCache?.currentDisplayModelId,
      "openai/gpt-5",
    );
    assert.isTrue(empty.ok);
    assert.equal(empty.backend.acp?.connectionTest?.status, "passed");
    assert.equal(
      empty.backend.acp?.runtimeOptionsCache?.currentDisplayModelId,
      "",
    );
    assert.deepEqual(empty.backend.acp?.runtimeOptionsCache?.rawModels, []);
    assert.deepEqual(
      empty.backend.acp?.runtimeOptionsCache?.reasoningEfforts,
      [],
    );
  });

  it("fails runtime options probe instead of hanging when ACP initialize stalls", async function () {
    const result = await probeAcpBackendRuntimeOptions({
      backend: {
        id: "acp-timeout",
        displayName: "ACP Timeout",
        type: "acp",
        baseUrl: "local://acp-timeout",
        command: "fake-acp",
      },
      timeoutMs: 5,
      createAdapter: async () =>
        makeProbeAdapter({
          initialize: async () => new Promise(() => undefined),
        }),
    });

    assert.isFalse(result.ok);
    assert.equal(result.backend.acp?.connectionTest?.status, "failed");
    assert.include(result.error || "", "ACP backend initialize timed out");
  });

  it("logs adapter transport diagnostics when runtime options probe fails", async function () {
    const snapshot = {
      commandLabel: "fake-acp",
      commandLine: "fake-acp --acp",
      exitCode: 7,
      stdoutText: '{"jsonrpc":"2.0"}\n',
      stderrText: "backend failed\n",
      transportLifecycle: {
        transportKind: "websocket-bridge" as const,
        startedAt: "2026-06-28T00:00:00.000Z",
        closedAt: "2026-06-28T00:00:01.000Z",
        exitCode: 7,
        exitSource: "natural-exit" as const,
        killedByClose: false,
        stdoutChars: 18,
        stderrChars: 15,
        bridgePid: 100,
        childPid: 101,
        spawnId: "spawn-1",
      },
    };

    await probeAcpBackendRuntimeOptions({
      backend: {
        id: "acp-diagnostics",
        displayName: "ACP Diagnostics",
        type: "acp",
        baseUrl: "local://acp-diagnostics",
        command: "fake-acp",
      },
      createAdapter: async () =>
        makeProbeAdapter({
          initialize: async () => {
            const error = new Error("initialize broke") as Error & {
              transportSnapshot?: typeof snapshot;
            };
            error.transportSnapshot = snapshot;
            throw error;
          },
          onDiagnostics: (listener) => {
            void listener({
              id: "diag-1",
              ts: "2026-06-28T00:00:00.500Z",
              kind: "initialize_transport_snapshot",
              level: "error",
              message: "ACP transport state after initialize failure",
              detail: JSON.stringify(snapshot),
              raw: snapshot,
            });
            return () => undefined;
          },
          onClose: (listener) => {
            void listener({
              message: "ACP connection closed",
              stdoutText: snapshot.stdoutText,
              stderrText: snapshot.stderrText,
              exitCode: snapshot.exitCode,
              transportLifecycle: snapshot.transportLifecycle,
            });
            return () => undefined;
          },
          getTransportSnapshot: () => snapshot,
        }),
    });

    const failedLog = listRuntimeLogs({
      backendId: "acp-diagnostics",
      operation: "probe-acp-runtime-options",
    }).find((entry) => entry.stage === "acp-runtime-options-probe-failed");
    const details = failedLog?.details as any;

    assert.equal(details?.transportSnapshot?.transportKind, "websocket-bridge");
    assert.equal(details?.transportSnapshot?.stderrTail, "backend failed");
    assert.equal(
      details?.adapterDiagnostics?.[0]?.kind,
      "initialize_transport_snapshot",
    );
    assert.equal(details?.adapterCloseEvents?.[0]?.exitCode, 7);
  });

  it("binds targeted reasoning to the selected model and preserves backend defaults", async function () {
    const base = {
      id: "acp-targeted-model",
      displayName: "ACP Targeted Model",
      type: "acp" as const,
      baseUrl: "local://acp-targeted-model",
      command: "fake-acp",
    };
    const connectionTest = {
      status: "passed" as const,
      testedAt: "2026-10-01T00:00:00.000Z",
      configFingerprint: computeAcpBackendConfigFingerprint(base),
    };
    const defaultModes = [
      { id: "code", label: "Code" },
      { id: "plan", label: "Plan" },
    ];
    const defaultModels = [
      { id: "model-a", label: "Model A" },
      { id: "model-b", label: "Model B" },
    ];
    const backend: BackendInstance = {
      ...base,
      acp: {
        connectionTest,
        runtimeOptionsCache: {
          refreshedAt: new Date().toISOString(),
          revision: "rev-1",
          status: "ready",
          modes: defaultModes,
          currentModeId: "code",
          rawModels: defaultModels,
          currentRawModelId: "model-a",
          displayModels: defaultModels.map((entry) => ({ ...entry })),
          currentDisplayModelId: "model-a",
          reasoningEfforts: [],
          currentReasoningEffortId: "",
          reasoningSource: "none",
        },
      },
    };
    let emitUpdate: ((event: unknown) => Promise<void>) | undefined;
    const setModels: string[] = [];

    const result = await probeAcpBackendRuntimeOptions({
      backend,
      selectedOptions: { acpModelId: "model-b" },
      createAdapter: async () =>
        makeProbeAdapter({
          newSession: async () => ({
            sessionId: "session-1",
            configOptions: [
              {
                id: "model",
                name: "Model",
                category: "model",
                type: "select",
                currentValue: "model-a",
                options: [
                  { value: "model-a", name: "Model A" },
                  { value: "model-b", name: "Model B" },
                ],
              },
            ],
          }),
          onUpdate: (listener) => {
            emitUpdate = listener as (event: unknown) => Promise<void>;
            return () => undefined;
          },
          setModel: async ({ modelId }) => {
            setModels.push(modelId);
            await emitUpdate?.({
              sessionId: "session-1",
              update: {
                sessionUpdate: "config_option_update",
                configOptions: [
                  {
                    id: "model",
                    name: "Model",
                    category: "model",
                    type: "select",
                    currentValue: modelId,
                    options: [
                      { value: "model-a", name: "Model A" },
                      { value: "model-b", name: "Model B" },
                    ],
                  },
                  {
                    id: "effort",
                    name: "Reasoning",
                    category: "thought_level",
                    type: "select",
                    currentValue: "high",
                    options: [
                      { value: "high", name: "High" },
                      { value: "max", name: "Max" },
                    ],
                  },
                ],
              },
            });
          },
        }),
    });

    const cache = result.backend.acp?.runtimeOptionsCache;
    assert.isTrue(result.ok);
    assert.deepEqual(setModels, ["model-b"]);
    assert.deepEqual(result.backend.acp?.connectionTest, connectionTest);
    assert.equal(cache?.currentRawModelId, "model-a");
    assert.equal(cache?.currentModeId, "code");
    assert.deepEqual(cache?.rawModels, defaultModels);
    assert.equal(cache?.revision, "rev-1");
    const entry = cache?.reasoningCatalogs?.find(
      (item) => item.modelId === "model-b",
    );
    assert.equal(entry?.reasoningSource, "explicit");
    assert.deepEqual(
      entry?.reasoningEfforts?.map((effort) => effort.id),
      ["high", "max"],
    );
    assert.equal(entry?.currentReasoningEffortId, "high");

    const selected = resolveAcpReasoningCatalog({
      backend: result.backend,
      options: { acpModelId: "model-b" },
    });
    assert.equal(selected.state, "ready");
    assert.deepEqual(
      selected.reasoningEfforts.map((effort) => effort.id),
      ["high", "max"],
    );
    const otherModel = resolveAcpReasoningCatalog({
      backend: result.backend,
      options: { acpModelId: "model-a" },
    });
    // The backend default context keeps its own authoritative absence instead of
    // inheriting the probed model's reasoning choices.
    assert.deepEqual(otherModel.reasoningEfforts, []);
    assert.equal(otherModel.currentReasoningEffortId, "");
  });

  it("records an authoritative reasoning absence when the model drops the reasoning axis", async function () {
    let emitUpdate: ((event: unknown) => Promise<void>) | undefined;
    const backend: BackendInstance = {
      id: "acp-targeted-absence",
      displayName: "ACP Targeted Absence",
      type: "acp",
      baseUrl: "local://acp-targeted-absence",
      command: "fake-acp",
      acp: {
        runtimeOptionsCache: {
          refreshedAt: new Date().toISOString(),
          revision: "rev-2",
          currentRawModelId: "model-a",
          currentModeId: "code",
          rawModels: [
            { id: "model-a", label: "Model A" },
            { id: "model-b", label: "Model B" },
          ],
          reasoningSource: "none",
          reasoningEfforts: [],
          currentReasoningEffortId: "",
        },
      },
    };
    const result = await probeAcpBackendRuntimeOptions({
      backend,
      selectedOptions: { acpModelId: "model-b" },
      createAdapter: async () =>
        makeProbeAdapter({
          newSession: async () => ({
            sessionId: "session-2",
            configOptions: [
              {
                id: "model",
                name: "Model",
                category: "model",
                type: "select",
                currentValue: "model-a",
                options: [
                  { value: "model-a", name: "Model A" },
                  { value: "model-b", name: "Model B" },
                ],
              },
              {
                id: "effort",
                name: "Reasoning",
                category: "thought_level",
                type: "select",
                currentValue: "high",
                options: [{ value: "high", name: "High" }],
              },
            ],
          }),
          onUpdate: (listener) => {
            emitUpdate = listener as (event: unknown) => Promise<void>;
            return () => undefined;
          },
          setModel: async ({ modelId }) => {
            await emitUpdate?.({
              sessionId: "session-2",
              update: {
                sessionUpdate: "config_option_update",
                configOptions: [
                  {
                    id: "model",
                    name: "Model",
                    category: "model",
                    type: "select",
                    currentValue: modelId,
                    options: [
                      { value: "model-a", name: "Model A" },
                      { value: "model-b", name: "Model B" },
                    ],
                  },
                ],
              },
            });
          },
        }),
    });

    assert.isTrue(result.ok);
    const entry =
      result.backend.acp?.runtimeOptionsCache?.reasoningCatalogs?.find(
        (item) => item.modelId === "model-b",
      );
    assert.equal(entry?.reasoningSource, "none");
    assert.deepEqual(entry?.reasoningEfforts, []);
    assert.equal(entry?.currentReasoningEffortId, "");
    const resolved = resolveAcpReasoningCatalog({
      backend: result.backend,
      options: { acpModelId: "model-b" },
    });
    assert.equal(resolved.state, "ready");
    assert.equal(resolved.reasoningSource, "none");
    assert.deepEqual(resolved.reasoningEfforts, []);
  });

  it("supports legacy backends without config options and seeds a missing cache", async function () {
    const backend: BackendInstance = {
      id: "acp-targeted-legacy",
      displayName: "ACP Targeted Legacy",
      type: "acp",
      baseUrl: "local://acp-targeted-legacy",
      command: "fake-acp",
    };
    const calls: string[] = [];
    const result = await probeAcpBackendRuntimeOptions({
      backend,
      selectedOptions: { acpModeId: "plan", acpModelId: "model-b" },
      createAdapter: async () =>
        makeProbeAdapter({
          newSession: async () => ({
            sessionId: "session-3",
            modes: {
              currentModeId: "code",
              availableModes: [
                { id: "code", name: "Code" },
                { id: "plan", name: "Plan" },
              ],
            },
            models: {
              currentModelId: "model-a",
              availableModels: [
                { modelId: "model-a", name: "Model A" },
                { modelId: "model-b", name: "Model B" },
              ],
            },
          }),
          setMode: async ({ modeId }) => {
            calls.push(`mode:${modeId}`);
          },
          setModel: async ({ modelId }) => {
            calls.push(`model:${modelId}`);
          },
        }),
    });

    const cache = result.backend.acp?.runtimeOptionsCache;
    assert.isTrue(result.ok);
    assert.deepEqual(calls, ["mode:plan", "model:model-b"]);
    assert.isUndefined(result.backend.acp?.connectionTest);
    assert.equal(cache?.currentModeId, "code");
    assert.equal(cache?.currentRawModelId, "model-a");
    assert.deepEqual(
      cache?.modes?.map((mode) => mode.id),
      ["code", "plan"],
    );
    const entry = cache?.reasoningCatalogs?.find(
      (item) => item.modelId === "model-b" && item.modeId === "plan",
    );
    assert.equal(entry?.reasoningSource, "none");
    assert.deepEqual(entry?.reasoningEfforts, []);
    assert.equal(
      entry?.configFingerprint,
      computeAcpBackendConfigFingerprint(backend),
    );
    const resolved = resolveAcpReasoningCatalog({
      backend: result.backend,
      options: { acpModeId: "plan", acpModelId: "model-b" },
    });
    assert.equal(resolved.state, "ready");
    assert.equal(resolved.reasoningSource, "none");
    const defaultContext = resolveAcpReasoningCatalog({
      backend: result.backend,
    });
    assert.equal(defaultContext.state, "ready");
    assert.equal(defaultContext.modelId, "model-a");
  });

  it("fails the targeted probe when the selected model is not advertised", async function () {
    const backend: BackendInstance = {
      id: "acp-targeted-unknown",
      displayName: "ACP Targeted Unknown",
      type: "acp",
      baseUrl: "local://acp-targeted-unknown",
      command: "fake-acp",
      acp: {
        runtimeOptionsCache: {
          refreshedAt: new Date().toISOString(),
          revision: "rev-4",
          currentRawModelId: "model-a",
          currentModeId: "code",
          reasoningSource: "none",
        },
      },
    };
    const result = await probeAcpBackendRuntimeOptions({
      backend,
      selectedOptions: { acpModelId: "model-z" },
      createAdapter: async () =>
        makeProbeAdapter({
          newSession: async () => ({
            sessionId: "session-4",
            models: {
              currentModelId: "model-a",
              availableModels: [{ modelId: "model-a", name: "Model A" }],
            },
          }),
          setModel: async () => {
            throw new Error("setModel must not run for an unadvertised model");
          },
        }),
    });

    assert.isFalse(result.ok);
    assert.include(
      result.error || "",
      "did not confirm the selected configuration",
    );
    assert.strictEqual(result.backend, backend);
    assert.isTrue(
      listRuntimeLogs({
        backendId: "acp-targeted-unknown",
        operation: "probe-acp-runtime-options",
      }).some(
        (entry) =>
          entry.stage === "acp-runtime-options-targeted-probe-unresolved",
      ),
    );
  });

  it("closes the targeted adapter once and never prompts on timeout or cancellation", async function () {
    for (const scenario of [
      { label: "timeout", timeoutMs: 20, abortDuringSession: false },
      { label: "canceled", timeoutMs: 5_000, abortDuringSession: true },
    ]) {
      let closeCalls = 0;
      let promptCalls = 0;
      let createCalls = 0;
      const cancellation = createCancellationController();
      const result = await probeAcpBackendRuntimeOptions({
        backend: {
          id: `acp-targeted-${scenario.label}`,
          displayName: `ACP Targeted ${scenario.label}`,
          type: "acp",
          baseUrl: `local://acp-targeted-${scenario.label}`,
          command: "fake-acp",
        },
        selectedOptions: {},
        signal: cancellation.signal,
        timeoutMs: scenario.timeoutMs,
        createAdapter: async () => {
          createCalls += 1;
          return makeProbeAdapter({
            newSession: async () => {
              if (scenario.abortDuringSession) {
                cancellation.abort();
              }
              return new Promise(() => undefined);
            },
            prompt: async () => {
              promptCalls += 1;
              return { stopReason: "end_turn" };
            },
            close: async () => {
              closeCalls += 1;
            },
          });
        },
      });

      assert.isFalse(result.ok, scenario.label);
      assert.equal(createCalls, 1, scenario.label);
      assert.equal(closeCalls, 1, scenario.label);
      assert.equal(promptCalls, 0, scenario.label);
      assert.include(
        result.error || "",
        scenario.abortDuringSession ? "canceled" : "session/new timed out",
        scenario.label,
      );
    }
  });

  it("keeps stalled cleanup inside the targeted probe total budget", async function () {
    const startedAt = Date.now();
    const result = await probeAcpBackendRuntimeOptions({
      backend: {
        id: "cleanup-budget",
        type: "acp",
        baseUrl: "local://cleanup",
        command: "fake-acp",
      },
      selectedOptions: {},
      timeoutMs: 30,
      createAdapter: async () =>
        makeProbeAdapter({
          newSession: async () => new Promise(() => undefined),
          close: async () => new Promise(() => undefined),
        }),
    });
    assert.isFalse(result.ok);
    assert.isBelow(Date.now() - startedAt, 300);
  });

  it("never launches the backend when the targeted probe is already canceled", async function () {
    let createCalls = 0;
    const cancellation = createCancellationController();
    cancellation.abort();
    const result = await probeAcpBackendRuntimeOptions({
      backend: {
        id: "acp-targeted-pre-canceled",
        displayName: "ACP Targeted Pre Canceled",
        type: "acp",
        baseUrl: "local://acp-targeted-pre-canceled",
        command: "fake-acp",
      },
      selectedOptions: {},
      signal: cancellation.signal,
      createAdapter: async () => {
        createCalls += 1;
        return makeProbeAdapter();
      },
    });

    assert.isFalse(result.ok);
    assert.equal(createCalls, 0);
    assert.include(result.error || "", "canceled");
  });

  it("gives every targeted probe its own workspace and runtime root", async function () {
    const backend: BackendInstance = {
      id: "acp-isolation-check",
      displayName: "ACP Isolation Check",
      type: "acp",
      baseUrl: "local://acp-isolation-check",
      command: "fake-acp",
      acp: {
        runtimeOptionsCache: {
          refreshedAt: new Date().toISOString(),
          revision: "rev-5",
          currentModeId: "code",
          currentRawModelId: "model-a",
          reasoningSource: "none",
          reasoningEfforts: [],
          currentReasoningEffortId: "",
        },
      },
    };
    const workspaces: string[][] = [[], [], []];
    const runtimeDirs: string[][] = [[], [], []];
    const createAdapterFor =
      (index: number) =>
      async (adapterArgs: { workspaceDir: string; runtimeDir: string }) => {
        workspaces[index].push(adapterArgs.workspaceDir);
        runtimeDirs[index].push(adapterArgs.runtimeDir);
        return makeProbeAdapter({
          newSession: async () => ({
            sessionId: `session-${index}`,
            modes: {
              currentModeId: "code",
              availableModes: [{ id: "code", name: "Code" }],
            },
            models: {
              currentModelId: "model-a",
              availableModels: [{ modelId: "model-a", name: "Model A" }],
            },
          }),
        });
      };

    const results = await Promise.all([
      probeAcpBackendRuntimeOptions({
        backend,
        selectedOptions: {},
        createAdapter: createAdapterFor(0),
      }),
      probeAcpBackendRuntimeOptions({
        backend,
        selectedOptions: {},
        createAdapter: createAdapterFor(1),
      }),
    ]);
    const fullProbe = await probeAcpBackendRuntimeOptions({
      backend,
      createAdapter: createAdapterFor(2),
    });

    assert.isTrue(results.every((result) => result.ok));
    assert.isTrue(fullProbe.ok);
    assert.lengthOf(workspaces[0], 1);
    assert.lengthOf(workspaces[1], 1);
    assert.lengthOf(workspaces[2], 1);
    assert.notEqual(workspaces[0][0], workspaces[1][0]);
    assert.notEqual(runtimeDirs[0][0], runtimeDirs[1][0]);
    const runRootSegment = (workspaceDir: string) =>
      path.basename(path.dirname(workspaceDir));
    assert.match(runRootSegment(workspaces[0][0]), /^targeted-/);
    assert.match(runRootSegment(workspaces[1][0]), /^targeted-/);
    assert.equal(runRootSegment(workspaces[2][0]), "acp-isolation-check");
  });

  it("refreshes an expired default cache from the session snapshot", async function () {
    const backend: BackendInstance = {
      id: "acp-targeted-refresh",
      displayName: "ACP Targeted Refresh",
      type: "acp",
      baseUrl: "local://acp-targeted-refresh",
      command: "fake-acp",
      acp: {
        runtimeOptionsCache: {
          refreshedAt: "2026-04-29T00:00:00.000Z",
          revision: "rev-expired",
          status: "stale",
          modes: [{ id: "stale-mode", label: "Stale" }],
          currentModeId: "stale-mode",
          rawModels: [{ id: "stale-model", label: "Stale" }],
          currentRawModelId: "stale-model",
          reasoningSource: "explicit",
          reasoningEfforts: [{ id: "legacy", label: "Legacy" }],
          currentReasoningEffortId: "legacy",
        },
      },
    };
    const result = await probeAcpBackendRuntimeOptions({
      backend,
      selectedOptions: { acpModelId: "model-b" },
      createAdapter: async () =>
        makeProbeAdapter({
          newSession: async () => ({
            sessionId: "session-refresh",
            modes: {
              currentModeId: "code",
              availableModes: [{ id: "code", name: "Code" }],
            },
            models: {
              currentModelId: "model-a",
              availableModels: [
                { modelId: "model-a", name: "Model A" },
                { modelId: "model-b", name: "Model B" },
              ],
            },
          }),
        }),
    });

    const cache = result.backend.acp?.runtimeOptionsCache;
    assert.isTrue(result.ok);
    assert.equal(cache?.currentRawModelId, "model-a");
    assert.equal(cache?.currentModeId, "code");
    assert.equal(cache?.status, "ready");
    assert.equal(cache?.reasoningSource, "none");
    assert.notEqual(
      cache?.revision,
      backend.acp?.runtimeOptionsCache?.revision,
    );
    assert.isTrue(Date.now() - Date.parse(String(cache?.refreshedAt)) < 60_000);
    const defaultContext = resolveAcpReasoningCatalog({
      backend: result.backend,
    });
    assert.equal(defaultContext.state, "ready");
    assert.equal(defaultContext.modelId, "model-a");
    const selected = resolveAcpReasoningCatalog({
      backend: result.backend,
      options: { acpModelId: "model-b" },
    });
    assert.equal(selected.state, "ready");
    assert.equal(selected.modeId, "code");
    assert.equal(selected.reasoningSource, "none");
  });

  it("refreshes the default cache when the connection test describes another configuration", async function () {
    const backend: BackendInstance = {
      id: "acp-targeted-reconfigured",
      displayName: "ACP Targeted Reconfigured",
      type: "acp",
      baseUrl: "local://acp-targeted-reconfigured",
      command: "fake-acp",
      acp: {
        connectionTest: {
          status: "passed",
          testedAt: "2026-10-01T00:00:00.000Z",
          configFingerprint: "acp-previous-configuration",
        },
        runtimeOptionsCache: {
          refreshedAt: new Date().toISOString(),
          revision: "rev-kept",
          status: "ready",
          modes: [{ id: "stale-mode", label: "Stale" }],
          currentModeId: "stale-mode",
          rawModels: [{ id: "stale-model", label: "Stale" }],
          currentRawModelId: "stale-model",
          reasoningSource: "none",
          reasoningEfforts: [],
          currentReasoningEffortId: "",
        },
      },
    };
    const result = await probeAcpBackendRuntimeOptions({
      backend,
      selectedOptions: { acpModelId: "model-b" },
      createAdapter: async () =>
        makeProbeAdapter({
          newSession: async () => ({
            sessionId: "session-reconfigured",
            modes: {
              currentModeId: "code",
              availableModes: [{ id: "code", name: "Code" }],
            },
            models: {
              currentModelId: "model-a",
              availableModels: [
                { modelId: "model-a", name: "Model A" },
                { modelId: "model-b", name: "Model B" },
              ],
            },
          }),
        }),
    });

    const cache = result.backend.acp?.runtimeOptionsCache;
    assert.isTrue(result.ok);
    assert.equal(cache?.currentRawModelId, "model-a");
    assert.equal(cache?.currentModeId, "code");
    assert.notEqual(cache?.revision, "rev-kept");
    assert.deepEqual(
      result.backend.acp?.connectionTest,
      backend.acp?.connectionTest,
    );
    const resolved = resolveAcpReasoningCatalog({
      backend: result.backend,
      options: { acpModelId: "model-b" },
    });
    assert.equal(resolved.state, "ready");
    assert.equal(resolved.modeId, "code");
    assert.equal(
      result.backend.acp?.runtimeOptionsCache?.reasoningCatalogs?.find(
        (entry) => entry.modelId === "model-b",
      )?.configFingerprint,
      computeAcpBackendConfigFingerprint(result.backend),
    );
  });

  it("closes a late-launched adapter and never prompts", async function () {
    let closeCalls = 0;
    let promptCalls = 0;
    const lateAdapter = makeProbeAdapter({
      prompt: async () => {
        promptCalls += 1;
        return { stopReason: "end_turn" };
      },
      close: async () => {
        closeCalls += 1;
      },
    });
    const result = await probeAcpBackendRuntimeOptions({
      backend: {
        id: "acp-targeted-late",
        displayName: "ACP Targeted Late",
        type: "acp",
        baseUrl: "local://acp-targeted-late",
        command: "fake-acp",
      },
      selectedOptions: {},
      timeoutMs: 20,
      createAdapter: async () =>
        new Promise<AcpConnectionAdapter>((resolve) => {
          setTimeout(() => resolve(lateAdapter), 80);
        }),
    });

    assert.isFalse(result.ok);
    assert.include(result.error || "", "adapter launch timed out");
    // The abandoned launch must not be awaited, but it must still not leak.
    assert.equal(closeCalls, 0);
    assert.equal(promptCalls, 0);
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.equal(closeCalls, 1);
    assert.equal(promptCalls, 0);
  });
});

function buildReasoningBackend(args: {
  id: string;
  cache: NonNullable<
    NonNullable<BackendInstance["acp"]>["runtimeOptionsCache"]
  >;
  command?: string;
}): BackendInstance {
  return {
    id: args.id,
    displayName: args.id,
    type: "acp",
    baseUrl: `local://${args.id}`,
    command: args.command || "fake-acp",
    acp: { runtimeOptionsCache: args.cache },
  };
}

describe("ACP reasoning catalog resolver", function () {
  it("proves only the legacy cache's exact current model and mode", function () {
    const refreshedAt = new Date().toISOString();
    const backend = buildReasoningBackend({
      id: "acp-reasoning-legacy",
      cache: {
        refreshedAt,
        revision: "rev-1",
        currentModeId: "build",
        currentRawModelId: "model-a",
        reasoningEfforts: [{ id: "high", label: "High" }],
        currentReasoningEffortId: "high",
        reasoningSource: "explicit",
      },
    });

    const sameContext = resolveAcpReasoningCatalog({
      backend,
      options: { acpModeId: "build", acpModelId: "model-a" },
    });
    assert.equal(sameContext.state, "ready");
    assert.equal(sameContext.reasoningSource, "explicit");
    assert.deepEqual(
      sameContext.reasoningEfforts.map((effort) => effort.id),
      ["high"],
    );
    assert.equal(sameContext.currentReasoningEffortId, "high");

    const otherModel = resolveAcpReasoningCatalog({
      backend,
      options: { acpModeId: "build", acpModelId: "model-b" },
    });
    assert.equal(otherModel.state, "unknown");
    assert.equal(otherModel.modelId, "model-b");
    assert.deepEqual(otherModel.reasoningEfforts, []);
    assert.equal(otherModel.currentReasoningEffortId, "");

    const otherMode = resolveAcpReasoningCatalog({
      backend,
      options: { acpModeId: "plan", acpModelId: "model-a" },
    });
    assert.equal(otherMode.state, "unknown");
  });

  it("addresses a reasoning-only default context without a recorded model", function () {
    const backend = buildReasoningBackend({
      id: "acp-reasoning-only",
      cache: {
        refreshedAt: new Date().toISOString(),
        revision: "rev-1",
        currentModeId: "",
        currentRawModelId: "",
        reasoningEfforts: [
          { id: "low", label: "Low" },
          { id: "high", label: "High" },
        ],
        currentReasoningEffortId: "high",
        reasoningSource: "explicit",
      },
    });

    const resolved = resolveAcpReasoningCatalog({ backend });
    assert.equal(resolved.state, "ready");
    assert.equal(resolved.modelId, "");
    assert.deepEqual(
      resolved.reasoningEfforts.map((effort) => effort.id),
      ["low", "high"],
    );
    assert.equal(
      resolveAcpReasoningCatalog({
        backend,
        options: { acpModelId: "model-b" },
      }).state,
      "unknown",
    );
  });

  it("rejects context entries on revision, fingerprint and age mismatch", function () {
    const refreshedAt = new Date().toISOString();
    const baseCache = {
      refreshedAt,
      revision: "rev-1",
      currentModeId: "code",
      currentRawModelId: "model-a",
      reasoningSource: "none" as const,
      reasoningEfforts: [] as Array<{ id: string; label: string }>,
      currentReasoningEffortId: "",
    };
    const backend = buildReasoningBackend({
      id: "acp-reasoning-entry",
      cache: baseCache,
    });
    const fingerprint = computeAcpBackendConfigFingerprint(backend);
    const entry = {
      modelId: "model-b",
      modeId: "build",
      configFingerprint: fingerprint,
      revision: "rev-1",
      refreshedAt,
      reasoningSource: "explicit" as const,
      reasoningEfforts: [{ id: "high", label: "High" }],
      currentReasoningEffortId: "high",
    };
    const withCatalog = (
      cache: typeof baseCache & { reasoningCatalogs: unknown },
    ) =>
      ({
        ...backend,
        acp: {
          ...(backend.acp || {}),
          runtimeOptionsCache: cache as never,
        },
      }) as BackendInstance;
    const options = { acpModeId: "build", acpModelId: "model-b" };

    const matched = resolveAcpReasoningCatalog({
      backend: withCatalog({ ...baseCache, reasoningCatalogs: [entry] }),
      options,
    });
    assert.equal(matched.state, "ready");
    assert.deepEqual(
      matched.reasoningEfforts.map((effort) => effort.id),
      ["high"],
    );

    const staleRevision = resolveAcpReasoningCatalog({
      backend: withCatalog({
        ...baseCache,
        revision: "rev-2",
        reasoningCatalogs: [entry],
      }),
      options,
    });
    assert.equal(staleRevision.state, "unknown");

    const otherConfig = resolveAcpReasoningCatalog({
      backend: {
        ...withCatalog({ ...baseCache, reasoningCatalogs: [entry] }),
        command: "another-agent",
      },
      options,
    });
    assert.equal(otherConfig.state, "unknown");

    const expired = resolveAcpReasoningCatalog({
      backend: withCatalog({
        ...baseCache,
        reasoningCatalogs: [
          { ...entry, refreshedAt: "2026-04-29T00:00:00.000Z" },
        ],
      }),
      options,
    });
    assert.equal(expired.state, "unknown");
  });

  it("keeps context evidence usable while a stale connection test blocks the legacy cache", function () {
    const refreshedAt = new Date().toISOString();
    const backend = buildReasoningBackend({
      id: "acp-reasoning-stale-connection",
      cache: {
        refreshedAt,
        revision: "rev-1",
        currentModeId: "code",
        currentRawModelId: "model-a",
        reasoningSource: "none",
        reasoningEfforts: [],
        currentReasoningEffortId: "",
      },
    });
    const fingerprint = computeAcpBackendConfigFingerprint(backend);
    assert.equal(resolveAcpReasoningCatalog({ backend }).state, "ready");
    const staleConnectionTest = {
      status: "passed" as const,
      testedAt: "2026-10-01T00:00:00.000Z",
      configFingerprint: "acp-other-configuration",
    };
    const withStaleTest: BackendInstance = {
      ...backend,
      acp: { ...(backend.acp || {}), connectionTest: staleConnectionTest },
    };
    // The legacy fields only prove a passed test for the same configuration.
    assert.equal(
      resolveAcpReasoningCatalog({ backend: withStaleTest }).state,
      "unknown",
    );
    // A context entry carries its own configuration identity, so a targeted probe
    // remains usable without rewriting the connection test.
    const withEntry: BackendInstance = {
      ...withStaleTest,
      acp: {
        ...(withStaleTest.acp || {}),
        runtimeOptionsCache: {
          ...(withStaleTest.acp?.runtimeOptionsCache || {}),
          reasoningCatalogs: [
            {
              modelId: "model-b",
              modeId: "code",
              configFingerprint: fingerprint,
              revision: "rev-1",
              refreshedAt,
              reasoningSource: "explicit",
              reasoningEfforts: [{ id: "high", label: "High" }],
              currentReasoningEffortId: "high",
            },
          ],
        },
      },
    };
    const entryResolved = resolveAcpReasoningCatalog({
      backend: withEntry,
      options: { acpModelId: "model-b" },
    });
    assert.equal(entryResolved.state, "ready");
    assert.deepEqual(
      entryResolved.reasoningEfforts.map((effort) => effort.id),
      ["high"],
    );
    assert.deepEqual(withEntry.acp?.connectionTest, staleConnectionTest);
  });

  it("keeps a stale or unavailable cache unknown so the form probes again", function () {
    const refreshedAt = new Date().toISOString();
    const backend = buildReasoningBackend({
      id: "acp-reasoning-stale-cache",
      cache: {
        refreshedAt,
        revision: "rev-1",
        status: "stale",
        currentModeId: "code",
        currentRawModelId: "model-a",
        reasoningSource: "none",
        reasoningEfforts: [],
        currentReasoningEffortId: "",
      },
    });
    assert.equal(resolveAcpReasoningCatalog({ backend }).state, "unknown");
    assert.equal(
      resolveAcpReasoningCatalog({
        backend: {
          ...backend,
          acp: {
            ...(backend.acp || {}),
            runtimeOptionsCache: {
              ...(backend.acp?.runtimeOptionsCache || {}),
              status: "unavailable",
            },
          },
        },
      }).state,
      "unknown",
    );
  });
});

describe("ACP reasoning catalog registry persistence", function () {
  const backendsConfigPrefKey = `${config.prefsPrefix}.backendsConfigJson`;
  let previousBackendsConfig: unknown;

  beforeEach(function () {
    previousBackendsConfig = Zotero.Prefs.get(backendsConfigPrefKey, true);
  });

  afterEach(function () {
    if (typeof previousBackendsConfig === "undefined") {
      Zotero.Prefs.clear(backendsConfigPrefKey, true);
    } else {
      Zotero.Prefs.set(
        backendsConfigPrefKey,
        previousBackendsConfig as string,
        true,
      );
    }
  });

  it("normalizes, caps to the most recent 16 contexts and round-trips them", function () {
    const seed = {
      id: "acp-reasoning-roundtrip",
      displayName: "ACP Reasoning Roundtrip",
      type: "acp" as const,
      baseUrl: "local://acp-reasoning-roundtrip",
      command: "fake-acp",
    };
    const fingerprint = computeAcpBackendConfigFingerprint(seed);
    const refreshedAt = new Date().toISOString();
    const contexts = Array.from({ length: 20 }, (_, index) => ({
      modelId: `model-${index}`,
      modeId: "build",
      configFingerprint: fingerprint,
      revision: "rev-1",
      refreshedAt,
      reasoningSource: "explicit",
      reasoningEfforts: [{ id: "high", label: "High" }],
      currentReasoningEffortId: "high",
    }));
    Zotero.Prefs.set(
      backendsConfigPrefKey,
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            ...seed,
            acp: {
              runtimeOptionsCache: {
                refreshedAt,
                revision: "rev-1",
                currentModeId: "build",
                currentRawModelId: "model-19",
                reasoningSource: "explicit",
                reasoningEfforts: [{ id: "high", label: "High" }],
                currentReasoningEffortId: "high",
                reasoningCatalogs: contexts,
              },
            },
          },
        ],
      }),
      true,
    );

    const loaded = loadBackendsRegistrySync();
    assert.deepEqual(loaded.errors, []);
    const firstCache = loaded.backends[0]?.acp?.runtimeOptionsCache;
    assert.lengthOf(firstCache?.reasoningCatalogs || [], 16);
    assert.deepEqual(
      firstCache?.reasoningCatalogs?.map((entry) => entry.modelId),
      Array.from({ length: 16 }, (_, index) => `model-${index + 4}`),
    );

    // The registry hands out deep clones; mutating one read must not leak.
    firstCache!.reasoningCatalogs![0]!.reasoningEfforts![0]!.label = "MUTATED";
    const reloaded = loadBackendsRegistrySync();
    const reloadedCache = reloaded.backends[0]?.acp?.runtimeOptionsCache;
    assert.equal(
      reloadedCache?.reasoningCatalogs?.[0]?.reasoningEfforts?.[0]?.label,
      "High",
    );

    const resolved = resolveAcpReasoningCatalog({
      backend: reloaded.backends[0] as BackendInstance,
      options: { acpModeId: "build", acpModelId: "model-19" },
    });
    assert.equal(resolved.state, "ready");
    assert.deepEqual(
      resolved.reasoningEfforts.map((effort) => effort.id),
      ["high"],
    );
  });
});
