import { assert } from "chai";
import {
  isAbsolutePathLike,
  isNonNativeAbsolutePath,
  joinNativePath,
  normalizeNativeLocalPath,
} from "../../src/platform/path";
import { mergePathEntries, splitPathEntries } from "../../src/platform/env";
import { buildNonInteractiveCommandCandidates } from "../../src/platform/command";
import {
  runtimePathExists,
  writeRuntimeTextFile,
} from "../../src/modules/runtimePersistence";

describe("runtime platform services", function () {
  it("preserves Windows path style when joining from a Windows root", function () {
    assert.equal(
      joinNativePath("D:\\ZoteroSkillsRuntime", "acp", "runs"),
      "D:\\ZoteroSkillsRuntime\\acp\\runs",
    );
    assert.equal(
      joinNativePath("/tmp/zotero", "acp", "runs"),
      "/tmp/zotero/acp/runs",
    );
  });

  it("normalizes Windows slash-form absolute paths independent of host OS", function () {
    assert.equal(
      normalizeNativeLocalPath("C:/Users/leike/Zotero/runtime/result.json"),
      "C:\\Users\\leike\\Zotero\\runtime\\result.json",
    );
    assert.isTrue(isAbsolutePathLike("C:\\Users\\leike\\Zotero"));
    assert.isTrue(isAbsolutePathLike("/home/leike/zotero"));
    assert.isFalse(isAbsolutePathLike("C:relative"));
  });

  it("detects Windows absolute paths as non-native outside Windows", function () {
    assert.isTrue(isNonNativeAbsolutePath("C:\\Temp\\run.json", "linux"));
    assert.isTrue(isNonNativeAbsolutePath("C:\\Temp\\run.json", "darwin"));
    assert.isFalse(isNonNativeAbsolutePath("C:\\Temp\\run.json", "win32"));
    assert.isFalse(isNonNativeAbsolutePath("/tmp/run.json", "linux"));
  });

  it("refuses to write non-native absolute runtime paths", async function () {
    if (process.platform === "win32") {
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

  it("splits and merges PATH entries using the path style of the value", function () {
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
  });

  it("provides non-interactive POSIX command candidates outside PATH", function () {
    assert.deepInclude(
      buildNonInteractiveCommandCandidates({
        command: "npx",
        platform: "linux",
        homeDir: "/home/leike",
      }),
      "/home/leike/.local/bin/npx",
    );
    assert.deepEqual(
      buildNonInteractiveCommandCandidates({
        command: "npx",
        platform: "win32",
        homeDir: "C:\\Users\\leike",
      }),
      [],
    );
  });
});
