import { assert } from "chai";
import { joinNativePath } from "../../../../src/platform/path";
import { detectRuntimePlatform } from "../../../../src/platform/runtimePlatform";
import {
  getCachedRuntimeCommand,
  getRuntimeCommandRegistrySnapshot,
  preflightRuntimeCommandsOnStartup,
  resetRuntimeCommandRegistryForTests,
} from "../../../../src/platform/command";
import { executeOneShotSubprocess } from "../../../../src/platform/subprocess";
import { defaultAcpRuntimeDependencyProbe } from "../../../../src/modules/acp/skillRun/acpRuntimeDependencyWrapper";
import {
  runtimePathExists,
  writeRuntimeTextFile,
} from "../../../../src/modules/runtimePersistence";

function hasRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: {
      __parity?: {
        runtime?: string;
      };
      getTempDirectory?: unknown;
    };
  };
  return (
    !!runtime.Zotero &&
    runtime.Zotero.__parity?.runtime !== "node-mock" &&
    typeof runtime.Zotero.getTempDirectory === "function"
  );
}

function getZoteroTempDirectoryPath() {
  const runtime = globalThis as {
    Zotero?: {
      getTempDirectory?: () => { path?: string };
    };
  };
  const path = String(runtime.Zotero?.getTempDirectory?.().path || "").trim();
  if (!path) {
    throw new Error("Zotero temp directory is unavailable");
  }
  return path;
}

describe("runtime platform services in Zotero", function () {
  before(function () {
    if (!hasRealZoteroRuntime()) {
      this.skip();
    }
  });

  afterEach(function () {
    resetRuntimeCommandRegistryForTests();
  });

  it("refuses non-native absolute runtime writes before touching the filesystem", async function () {
    if (detectRuntimePlatform() === "win32") {
      this.skip();
    }
    const target = "C:\\zs-non-native-runtime\\file.txt";
    try {
      await writeRuntimeTextFile(target, "content");
      assert.fail("expected non-native runtime path write to fail");
    } catch (error) {
      assert.include(String((error as Error).message || error), "non-native");
    }
    assert.isFalse(await runtimePathExists(target));
  });

  it("writes native runtime files through Zotero filesystem APIs", async function () {
    const root = getZoteroTempDirectoryPath();
    const target = joinNativePath(
      root,
      `zs-platform-runtime-${Date.now()}.txt`,
    );
    await writeRuntimeTextFile(target, "ok");
    assert.isTrue(await runtimePathExists(target));
  });

  it("initializes the startup command registry without requiring every command", async function () {
    this.timeout(120000);
    const snapshot = await preflightRuntimeCommandsOnStartup();
    assert.equal(snapshot.initialized, true);
    for (const command of [
      "uv",
      "python",
      "python3",
      "py",
      "node",
      "npm",
      "npx",
    ]) {
      assert.property(snapshot.commands, command);
      assert.isArray((snapshot.commands as any)[command].checkedCandidates);
    }
    assert.deepEqual(
      getRuntimeCommandRegistrySnapshot().commands.uv?.checkedCandidates,
      snapshot.commands.uv?.checkedCandidates,
    );
  });

  it("executes a resolved one-shot command through the live Zotero adapter", async function () {
    this.timeout(120000);
    await preflightRuntimeCommandsOnStartup();
    const windows = detectRuntimePlatform() === "win32";
    const resolved = windows
      ? getCachedRuntimeCommand("powershell") || getCachedRuntimeCommand("pwsh")
      : getCachedRuntimeCommand("sh");
    if (!resolved?.available || !resolved.resolvedPath) {
      this.skip();
    }
    const stdoutMarker = "zotero-one-shot-stdout";
    const stderrMarker = "zotero-one-shot-stderr";
    const result = await executeOneShotSubprocess({
      command: resolved.resolvedPath,
      args: windows
        ? [
            "-NoLogo",
            "-NoProfile",
            "-Command",
            `[Console]::Out.Write('${stdoutMarker}'); [Console]::Error.Write('${stderrMarker}'); exit 2`,
          ]
        : [
            "-c",
            `printf '${stdoutMarker}'; printf '${stderrMarker}' >&2; exit 2`,
          ],
      cwd: getZoteroTempDirectoryPath(),
      environment: { ZOTERO_ONE_SHOT_TEST: "1" },
      timeoutMs: 30000,
      hidden: windows,
    });

    assert.equal(result.outcome, "exited");
    assert.equal(result.exitCode, 2);
    assert.equal(result.adapter, "mozilla");
    assert.include(result.stdout, stdoutMarker);
    assert.include(result.stderr, stderrMarker);
  });

  it("resolves an ACP runtime dependency strategy through live Zotero subprocess", async function () {
    this.timeout(180000);
    const registry = await preflightRuntimeCommandsOnStartup();
    if (!registry.commands.uv?.available && !registry.primaryPython) {
      this.skip();
    }
    const result = await defaultAcpRuntimeDependencyProbe({
      dependencies: [],
      cwd: getZoteroTempDirectoryPath(),
      env: {},
      timeoutMs: 120000,
    });
    assert.equal(
      result.ok,
      true,
      result.summary || "runtime dependency probe failed",
    );
  });
});
