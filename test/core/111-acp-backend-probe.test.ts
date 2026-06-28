import { assert } from "chai";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { probeAcpBackendRuntimeOptions } from "../../src/modules/acpBackendProbe";
import type { AcpConnectionAdapter } from "../../src/modules/acpConnectionAdapter";
import {
  clearRuntimeLogs,
  listRuntimeLogs,
} from "../../src/modules/runtimeLogManager";

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

  it("preserves existing runtime options cache when probe fails or returns empty selectors", async function () {
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
      "openai/gpt-5",
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
});
