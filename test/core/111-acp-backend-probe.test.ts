import { assert } from "chai";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import {
  probeAcpBackendRuntimeOptions,
} from "../../src/modules/acpBackendProbe";

describe("ACP backend probe", function () {
  let previousRuntimeRoot: string | undefined;
  let tempRoot = "";

  beforeEach(async function () {
    previousRuntimeRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "zs-acp-probe-"));
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = tempRoot;
  });

  afterEach(async function () {
    if (typeof previousRuntimeRoot === "undefined") {
      delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    } else {
      process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRuntimeRoot;
    }
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
        for (const target of [args.agentWorkspaceDir, args.sessionCwd, args.workspaceDir, args.runtimeDir]) {
          const stat = await fs.stat(target);
          assert.isTrue(stat.isDirectory(), `${target} should exist before adapter launch`);
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
      result.backend.acp?.runtimeOptionsCache?.displayModels.map((entry) => entry.id),
      ["model-1"],
    );
  });
});
