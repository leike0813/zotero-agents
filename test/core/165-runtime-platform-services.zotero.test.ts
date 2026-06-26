import { assert } from "chai";
import {
  isAbsolutePathLike,
  isNonNativeAbsolutePath,
  joinNativePath,
  normalizeNativeLocalPath,
} from "../../src/platform/path";
import { detectRuntimePlatform } from "../../src/platform/runtimePlatform";
import { mergePathEntries, splitPathEntries } from "../../src/platform/env";
import { buildNonInteractiveCommandCandidates } from "../../src/platform/command";
import {
  runtimePathExists,
  writeRuntimeTextFile,
} from "../../src/modules/runtimePersistence";

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

  it("preserves cross-platform path contracts in the real Zotero runtime", function () {
    assert.include(["win32", "darwin", "linux"], detectRuntimePlatform());
    assert.equal(
      joinNativePath("D:\\ZoteroSkillsRuntime", "acp", "runs"),
      "D:\\ZoteroSkillsRuntime\\acp\\runs",
    );
    assert.equal(
      joinNativePath("/tmp/zotero", "acp", "runs"),
      "/tmp/zotero/acp/runs",
    );
    assert.equal(
      normalizeNativeLocalPath("C:/Users/leike/Zotero/runtime/result.json"),
      "C:\\Users\\leike\\Zotero\\runtime\\result.json",
    );
    assert.isTrue(isAbsolutePathLike("C:\\Users\\leike\\Zotero"));
    assert.isTrue(isAbsolutePathLike("/home/leike/zotero"));
    assert.isFalse(isAbsolutePathLike("C:relative"));
    assert.isTrue(isNonNativeAbsolutePath("C:\\Temp\\run.json", "linux"));
    assert.isFalse(isNonNativeAbsolutePath("C:\\Temp\\run.json", "win32"));
  });

  it("keeps PATH parsing and non-interactive command fallbacks deterministic in Zotero", function () {
    assert.deepEqual(splitPathEntries("C:\\Tools;D:\\Node"), [
      "C:\\Tools",
      "D:\\Node",
    ]);
    assert.equal(
      mergePathEntries("C:\\Tools;D:\\Node", ["D:\\Node", "E:\\Bin"]),
      "E:\\Bin;C:\\Tools;D:\\Node",
    );
    assert.deepEqual(splitPathEntries("/usr/local/bin:/usr/bin"), [
      "/usr/local/bin",
      "/usr/bin",
    ]);

    const platform = detectRuntimePlatform();
    const candidates = buildNonInteractiveCommandCandidates({
      command: "npx",
      platform,
      homeDir: "/home/zotero-platform",
    });
    if (platform === "win32") {
      assert.deepEqual(candidates, []);
    } else {
      assert.include(candidates, "/home/zotero-platform/.local/bin/npx");
      assert.include(candidates, "/usr/local/bin/npx");
      assert.include(candidates, "/usr/bin/npx");
    }
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
});
