import { assert } from "chai";
import type { BackendInstance } from "../../src/backends/types";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../../src/config/defaults";
import {
  createAcpConnectionAdapter,
  type AcpConnectionAdapter,
} from "../../src/modules/acpConnectionAdapter";
import {
  getAcpSkillRunRecord,
  resetAcpSkillRunsForTests,
  shutdownAcpSkillRunConversations,
} from "../../src/modules/acpSkillRunStore";
import { executeAcpSkillRunnerJob } from "../../src/modules/acpSkillRunnerOrchestrator";
import { createAcpSkillRunnerWorkspace } from "../../src/modules/acpSkillRunnerWorkspace";
import {
  closeAssistantWorkspaceSidebar,
  openAssistantWorkspaceSidebar,
} from "../../src/modules/assistantWorkspaceSidebar";
import {
  getRuntimePersistencePaths,
  ensureRuntimeDirectory,
  readRuntimeTextFile,
  runtimePathExists,
  writeRuntimeTextFile,
} from "../../src/modules/runtimePersistence";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { shutdownAcpWebSocketBridgeService } from "../../src/modules/acpWebSocketBridgeService";
import { joinPath } from "../../src/utils/path";

function hasRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: { __parity?: { runtime?: string } };
  };
  return Boolean(
    runtime.Zotero && runtime.Zotero.__parity?.runtime !== "node-mock",
  );
}

function readEnvironment(name: string) {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
    Services?: { env?: { get?: (key: string) => string } };
  };
  const fromProcess = String(runtime.process?.env?.[name] || "").trim();
  if (fromProcess) return fromProcess;
  try {
    return String(runtime.Services?.env?.get?.(name) || "").trim();
  } catch {
    return "";
  }
}

function resolveCheckoutRoot() {
  const runtime = globalThis as {
    process?: { cwd?: () => string };
    Zotero?: { DataDirectory?: { dir?: string } };
    Services?: {
      dirsvc?: {
        get?: (key: string, interfaceType: unknown) => { path?: string };
      };
    };
    Ci?: { nsIFile?: unknown };
  };
  let currentWorkingDirectory = "";
  try {
    currentWorkingDirectory = String(
      runtime.Services?.dirsvc?.get?.("CurWorkD", runtime.Ci?.nsIFile)?.path ||
        "",
    ).trim();
  } catch {
    currentWorkingDirectory = "";
  }
  return String(
    readEnvironment("ZOTERO_ACP_COMPOSER_E2E_ROOT") ||
      runtime.process?.cwd?.() ||
      currentWorkingDirectory ||
      runtime.Zotero?.DataDirectory?.dir ||
      "",
  ).trim();
}

async function waitFor<T>(
  read: () => T | null | undefined,
  timeoutMs = 20_000,
) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = read();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return null;
}

function parseNdjson(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line)) as Array<{
    sequence: number;
    method: string;
    sessionId: string;
    promptText: string;
  }>;
}

function isWindowsRuntime() {
  const runtime = globalThis as {
    Zotero?: { isWin?: boolean };
    Services?: { appinfo?: { OS?: string } };
  };
  return (
    runtime.Zotero?.isWin === true || runtime.Services?.appinfo?.OS === "WINNT"
  );
}

describe("ACP Skills composer continuation through platform transport", function () {
  this.timeout(180_000);

  afterEach(async function () {
    closeAssistantWorkspaceSidebar();
    await shutdownAcpSkillRunConversations().catch(() => undefined);
    await shutdownAcpWebSocketBridgeService().catch(() => undefined);
    resetAcpSkillRunsForTests();
    setDebugModeOverrideForTests(undefined);
  });

  it("sends a second prompt from the real nested composer", async function () {
    if (
      !hasRealZoteroRuntime() ||
      readEnvironment("ZOTERO_ACP_COMPOSER_E2E") !== "1"
    ) {
      this.skip();
    }
    setDebugModeOverrideForTests(true);
    const nodeExecutable = readEnvironment("ZOTERO_ACP_COMPOSER_E2E_NODE");
    assert.isNotEmpty(
      nodeExecutable,
      "ZOTERO_ACP_COMPOSER_E2E_NODE must be an absolute Node.js path",
    );
    const checkoutRoot = resolveCheckoutRoot();
    assert.isNotEmpty(checkoutRoot, "Unable to resolve the checkout root");
    const fixturePath = joinPath(
      checkoutRoot,
      "test",
      "fixtures",
      "acp",
      "acp-composer-reply-agent.mjs",
    );
    assert.isTrue(
      await runtimePathExists(fixturePath),
      `ACP fixture is missing: ${fixturePath}`,
    );

    const testRoot = joinPath(
      getRuntimePersistencePaths().tmpDir,
      `acp-composer-e2e-${Date.now()}`,
    );
    const skillDir = joinPath(testRoot, "skills", "composer-e2e-skill");
    const assetsDir = joinPath(skillDir, "assets");
    const evidencePath = joinPath(testRoot, "fixture-requests.ndjson");
    await ensureRuntimeDirectory(assetsDir);
    await writeRuntimeTextFile(
      joinPath(skillDir, "SKILL.md"),
      [
        "---",
        "name: composer-e2e-skill",
        "---",
        "",
        "# Composer continuation fixture",
        "",
        "Return structured output.",
        "",
      ].join("\n"),
    );
    await writeRuntimeTextFile(
      joinPath(assetsDir, "output.schema.json"),
      JSON.stringify({
        type: "object",
        required: ["ok"],
        properties: { ok: { const: true } },
        additionalProperties: true,
      }),
    );
    await writeRuntimeTextFile(
      joinPath(assetsDir, "runner.json"),
      JSON.stringify({
        id: "composer-e2e-skill",
        execution_modes: ["interactive"],
        runtime: { dependencies: [] },
        schemas: { output: "assets/output.schema.json" },
      }),
    );
    const entry = {
      skillId: "composer-e2e-skill",
      description: "ACP composer continuation fixture",
      sourceKind: "user" as const,
      sourceDir: skillDir,
      skillMdPath: joinPath(skillDir, "SKILL.md"),
      runnerJsonPath: joinPath(assetsDir, "runner.json"),
      checksum: "sha256:composer-e2e",
      diagnostics: [],
    };
    const backend: BackendInstance = {
      id: "acp-composer-platform-e2e",
      displayName: "ACP Composer Platform E2E",
      type: "acp",
      baseUrl: "local://acp-composer-platform-e2e",
      command: nodeExecutable,
      args: [fixturePath],
      env: {
        ZOTERO_ACP_COMPOSER_E2E_EVIDENCE: evidencePath,
      },
    };
    let requestId = "";
    let adapter: AcpConnectionAdapter | null = null;
    const execution = executeAcpSkillRunnerJob({
      requestKind: ACP_SKILL_RUN_REQUEST_KIND,
      backend,
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: entry.skillId,
        fetch_type: "bundle",
        runtime_options: { execution_mode: "interactive" },
      },
      onProgress(event) {
        if (event.type === "request-created") {
          requestId = String(event.requestId || "");
        }
      },
      dependencies: {
        scanRegistry: async () => ({
          entries: [entry],
          entriesById: { [entry.skillId]: entry },
          diagnostics: [],
        }),
        createWorkspace: (args) =>
          createAcpSkillRunnerWorkspace({ ...args, rootDir: testRoot }),
        createAdapter: async (args) => {
          adapter = await createAcpConnectionAdapter(args);
          return adapter;
        },
        sharedSkillCatalogRootDir: joinPath(testRoot, "shared-catalog"),
      },
    });
    void execution.catch(() => undefined);

    const waiting = await waitFor(() => {
      if (!requestId) return null;
      const record = getAcpSkillRunRecord(requestId);
      return record?.status === "waiting_user" ? record : null;
    });
    assert.ok(
      waiting,
      `ACP fixture did not reach waiting_user; evidence=${evidencePath}`,
    );
    const transportKind =
      adapter?.getTransportSnapshot()?.transportLifecycle?.transportKind;
    assert.equal(
      transportKind,
      isWindowsRuntime() ? "websocket-bridge" : "mozilla-subprocess",
      `Unexpected platform transport; evidence=${evidencePath}`,
    );
    assert.isTrue(
      await openAssistantWorkspaceSidebar({
        tab: "acp-skills",
        requestId,
      }),
      "Assistant Workspace did not open",
    );

    const composer = await waitFor(() => {
      const win = Zotero.getMainWindow?.() as Window | undefined;
      const shell = win?.document.querySelector(
        '[data-zs-assistant-shell="true"]',
      ) as HTMLIFrameElement | null;
      const shellDocument =
        shell?.contentDocument || shell?.contentWindow?.document;
      const child = shellDocument?.getElementById(
        "assistant-frame-acp-skills",
      ) as HTMLIFrameElement | null;
      const childDocument =
        child?.contentDocument || child?.contentWindow?.document;
      const input = childDocument?.querySelector(
        ".assistant-panel-reply-input",
      ) as HTMLTextAreaElement | null;
      const button = childDocument?.querySelector(
        ".assistant-panel-reply-submit",
      ) as HTMLButtonElement | null;
      return input && button && !input.disabled && !button.disabled
        ? { input, button }
        : null;
    });
    assert.ok(
      composer,
      `ACP Skills composer did not become interactive; evidence=${evidencePath}`,
    );
    const sentinel = 'Windows composer 续轮 Ω \\\\ "quoted"';
    composer.input.value = sentinel;
    composer.button.click();

    const result = await Promise.race([
      execution,
      new Promise<never>((_resolve, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                `ACP composer reply did not complete; evidence=${evidencePath}`,
              ),
            ),
          30_000,
        );
      }),
    ]);
    assert.equal(result.status, "succeeded");
    const evidence = parseNdjson(await readRuntimeTextFile(evidencePath));
    const prompts = evidence.filter(
      (entry) => entry.method === "session/prompt",
    );
    assert.lengthOf(
      prompts,
      2,
      `Expected two prompts; evidence=${evidencePath}`,
    );
    assert.equal(prompts[0].sessionId, prompts[1].sessionId);
    assert.include(prompts[1].promptText, sentinel);
  });
});
