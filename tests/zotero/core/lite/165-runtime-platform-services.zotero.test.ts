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
import { createCancellationController } from "../../../../src/utils/wait";
import { defaultAcpRuntimeDependencyProbe } from "../../../../src/modules/acp/skillRun/acpRuntimeDependencyWrapper";
import {
  runtimePathExists,
  writeRuntimeTextFile,
  ensureRuntimeDirectoryStrict,
  copyRuntimeFile,
  appendRuntimeTextFile,
  replaceRuntimeTextFileAtomically,
  listRuntimeChildrenStrict,
  moveRuntimePath,
  readRuntimeTextFileStrict,
  readRuntimeTextRanges,
  removeRuntimePath,
  assertRuntimePathBudget,
} from "../../../../src/modules/runtimePersistence";
import {
  digestRuntimeFileSource,
  inspectRuntimeFileSource,
} from "../../../../src/modules/runtimeFileTransfer";
import { createWorkflowArchiveApi } from "../../../../src/workflows/archive";

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

  it("supports ordinary Windows long paths through native I/O and compatible ZIP staging", async function () {
    if (detectRuntimePlatform() !== "win32") this.skip();
    this.timeout(120000);
    const root = joinNativePath(
      getZoteroTempDirectoryPath(),
      `zs-long-${Date.now()}`,
    );
    const directory = joinNativePath(
      root,
      "a".repeat(90),
      "b".repeat(90),
      "研究😀".repeat(15),
    );
    const source = joinNativePath(directory, "source.txt");
    const target = joinNativePath(directory, "target.txt");
    const moved = joinNativePath(directory, "moved.txt");
    const zip = joinNativePath(directory, "result.zip");
    try {
      await ensureRuntimeDirectoryStrict(directory);
      await writeRuntimeTextFile(source, "source 甲😀");
      assert.isAbove(source.length, 259);
      await copyRuntimeFile({ sourcePath: source, targetPath: target });
      await replaceRuntimeTextFileAtomically(target, "new 甲😀");
      await appendRuntimeTextFile(target, " tail");
      assert.equal(await readRuntimeTextFileStrict(target), "new 甲😀 tail");
      assert.deepEqual(
        await readRuntimeTextRanges(target, [{ offset: 0, length: 3 }]),
        ["new"],
      );
      const sourceDigest = await digestRuntimeFileSource(
        await inspectRuntimeFileSource(source),
      );
      assert.match(sourceDigest.sha256, /^sha256:[a-f0-9]{64}$/);
      assert.include(await listRuntimeChildrenStrict(directory), target);
      await moveRuntimePath({ sourcePath: target, targetPath: moved });
      assert.equal(await readRuntimeTextFileStrict(moved), "new 甲😀 tail");
      const archive = createWorkflowArchiveApi();
      await archive.writeZipAtomic({
        targetPath: zip,
        entries: [
          {
            name: "payload.txt",
            content: { kind: "file", sourcePath: source },
          },
        ],
      });
      await archive.withExtractedZip(
        { sourcePath: zip },
        {},
        async (extracted) => {
          assert.equal(
            new TextDecoder().decode(await extracted.readBytes("payload.txt")),
            "source 甲😀",
          );
          assertRuntimePathBudget(extracted.rootPath);
        },
      );
      Zotero.debug(
        `Native long path acceptance: Zotero ${Zotero.version}; path=${source.length} UTF-16; passed`,
      );
    } finally {
      await removeRuntimePath(root);
    }
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

  it("preserves live Zotero stdout and stderr when a running process is canceled or times out", async function () {
    this.timeout(30000);
    await preflightRuntimeCommandsOnStartup();
    const windows = detectRuntimePlatform() === "win32";
    const resolved = windows
      ? getCachedRuntimeCommand("powershell") || getCachedRuntimeCommand("pwsh")
      : getCachedRuntimeCommand("sh");
    if (!resolved?.available || !resolved.resolvedPath) {
      this.skip();
    }

    for (const control of ["timeout", "cancel"] as const) {
      const cancellation = createCancellationController();
      const stdoutMarker = `zotero-${control}-stdout`;
      const stderrMarker = `zotero-${control}-stderr`;
      const resultPromise = executeOneShotSubprocess({
        command: resolved.resolvedPath,
        args: windows
          ? [
              "-NoLogo",
              "-NoProfile",
              "-Command",
              `[Console]::Out.Write('${stdoutMarker}'); [Console]::Error.Write('${stderrMarker}'); Start-Sleep -Seconds 20`,
            ]
          : [
              "-c",
              `printf '${stdoutMarker}'; printf '${stderrMarker}' >&2; sleep 20`,
            ],
        cwd: getZoteroTempDirectoryPath(),
        timeoutMs: 1500,
        terminationGraceMs: 500,
        outputLimitChars: 4096,
        signal: control === "cancel" ? cancellation.signal : undefined,
        hidden: windows,
      });
      if (control === "cancel") {
        setTimeout(cancellation.abort, 500);
      }
      const result = await resultPromise;

      assert.equal(
        result.outcome,
        control === "cancel" ? "canceled" : "timed_out",
      );
      assert.include(result.stdout, stdoutMarker);
      assert.include(result.stderr, stderrMarker);
    }
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
