import { assert } from "chai";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  resetRuntimeEnvironmentSnapshotForTests,
  seedRuntimeEnvironmentSnapshotForTests,
} from "../../src/platform/env";
import { resolveRuntimePathIdentity } from "../../src/modules/runtimePersistence";
import { createPiTrustedNativeExecution } from "../../src/modules/piTrustedNativeExecution";

describe("Pi Trusted Native execution", function () {
  const shellName = process.platform === "win32" ? "powershell" : "bash";
  const directoryLinkType = process.platform === "win32" ? "junction" : "dir";
  before(function () {
    if (process.platform !== "win32") return;
    seedRuntimeEnvironmentSnapshotForTests({
      initialized: true,
      platform: "win32",
      source: "current-process",
      env: { SystemRoot: process.env.SystemRoot || "C:\\Windows" },
      pathKey: "PATH",
      pathEntryCount: 0,
    });
  });
  after(function () {
    if (process.platform === "win32") resetRuntimeEnvironmentSnapshotForTests();
  });
  it("reads, writes, and edits only verified workspace files", async function () {
    const root = await mkdtemp(join(tmpdir(), "pi-native-files-"));
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot: join(root, ".owner"),
      mode: "restricted",
    });
    const call = async (name: string, args: Record<string, unknown>) => {
      const definition = native.definitions.find((tool) => tool.name === name)!;
      const claims = await definition.classify(args as never);
      assert.isNotEmpty(claims.resourceKeys);
      return definition.execute(args as never, {
        signal: new AbortController().signal,
        onUpdate: () => undefined,
      });
    };
    assert.equal(
      (await call("write", { path: "a.txt", content: "one\ntwo" })).status,
      "completed",
    );
    const read = await call("read", { path: "a.txt", offset: 2, limit: 1 });
    assert.deepInclude(read.value as object, { text: "two" });
    await writeFile(
      join(root, "tiny.png"),
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        "base64",
      ),
    );
    const image = await call("read", { path: "tiny.png" });
    assert.deepInclude(image.value as object, {
      kind: "image",
      mimeType: "image/png",
    });
    assert.equal(
      (
        await call("edit", {
          path: "a.txt",
          edits: [{ oldText: "two", newText: "three" }],
        })
      ).status,
      "completed",
    );
    assert.deepInclude(
      (await call("read", { path: "a.txt" })).value as object,
      { text: "one\nthree" },
    );
    const ambiguous = await call("edit", {
      path: "a.txt",
      edits: [{ oldText: "e", newText: "x" }],
    });
    assert.equal(ambiguous.status, "failed");
    try {
      await call("write", { path: "../escape.txt", content: "bad" });
      assert.fail("escaped workspace");
    } catch (error) {
      assert.include(String(error), "pi_path_");
    }
    try {
      await call("write", {
        path: ".owner/managed-files.json",
        content: "bad",
      });
      assert.fail("owner metadata exposed");
    } catch (error) {
      assert.include(String(error), "pi_path_");
    }
  });

  it("searches within limits without crossing links or ignored paths", async function () {
    const root = await mkdtemp(join(tmpdir(), "pi-native-search-"));
    await writeFile(join(root, ".gitignore"), "private.txt\n");
    await writeFile(
      join(root, "public.txt"),
      "before\nneedle\nafter\nneedle\n",
    );
    await writeFile(join(root, "private.txt"), "needle\n");
    await symlink(tmpdir(), join(root, "outside"), directoryLinkType);
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot: join(root, ".owner"),
      mode: "restricted",
    });
    const call = async (name: string, args: Record<string, unknown>) => {
      const tool = native.definitions.find((item) => item.name === name)!;
      return tool.execute(args as never, {
        signal: new AbortController().signal,
        onUpdate: () => undefined,
      });
    };
    const found = await call("find", { pattern: "*.txt" });
    assert.deepInclude(found.value as object, { paths: ["public.txt"] });
    const recursive = await call("find", { pattern: "**/*.txt" });
    assert.deepInclude(recursive.value as object, { paths: ["public.txt"] });
    const matched = await call("grep", { pattern: "needle", limit: 1 });
    assert.equal((matched.value as { matches: unknown[] }).matches.length, 1);
    assert.deepInclude((matched.value as { matches: object[] }).matches[0], {
      path: "public.txt",
      line: 2,
    });
    const contextual = await call("grep", {
      pattern: "needle",
      context: 1,
      limit: 1,
    });
    assert.deepInclude((contextual.value as { matches: object[] }).matches[0], {
      before: ["before"],
      after: ["after"],
    });
    const listed = await call("ls", {});
    assert.include(
      (listed.value as { entries: string[] }).entries,
      "public.txt",
    );
    assert.notInclude(
      (listed.value as { entries: string[] }).entries,
      "private.txt",
    );
    assert.notInclude(
      (listed.value as { entries: string[] }).entries,
      "outside",
    );
    assert.equal((await call("grep", { pattern: "(a+)+$" })).status, "failed");
  });

  it("omits Shell without a sealed subprocess and conservatively classifies dynamic commands", async function () {
    const root = await mkdtemp(join(tmpdir(), "pi-native-shell-"));
    const unavailable = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot: join(root, ".owner"),
      mode: "trusted",
    });
    assert.deepEqual(
      unavailable.definitions.map((item) => item.name),
      ["read", "edit", "write"],
    );
    const existingChromeUtils = (globalThis as { ChromeUtils?: unknown })
      .ChromeUtils;
    try {
      (globalThis as { ChromeUtils?: unknown }).ChromeUtils = {
        importESModule: () => ({
          Subprocess: {
            call: async () => {
              throw new Error("unused");
            },
          },
        }),
      };
      const available = await createPiTrustedNativeExecution({
        workspaceRoot: root,
        ownerRoot: join(root, ".owner"),
        mode: "trusted",
      });
      const shell = available.definitions.find(
        (item) => item.name === shellName,
      )!;
      assert.isDefined(shell);
      const dynamic = await shell.classify({ command: "pwd | cat" });
      assert.include(dynamic.effects, "external-egress");
      assert.include(dynamic.authorizationKeys, "execution:opaque");
      const literal = await shell.classify({ command: "pwd" });
      assert.notInclude(literal.authorizationKeys, "execution:opaque");
    } finally {
      (globalThis as { ChromeUtils?: unknown }).ChromeUtils =
        existingChromeUtils;
    }
  });

  it("reuses a materialized source generation after agent edits and rolls forward on source change", async function () {
    const root = await mkdtemp(join(tmpdir(), "pi-native-manifest-"));
    const source = join(root, "source.txt");
    await writeFile(source, "source-one");
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot: join(root, ".owner"),
      mode: "restricted",
    });
    const first = await native.materializeOrReuse({
      sourcePath: source,
      sourceId: "attachment:a",
      revision: "1",
    });
    await writeFile(first.path, "agent-edited");
    const reused = await native.materializeOrReuse({
      sourcePath: source,
      sourceId: "attachment:a",
      revision: "1",
    });
    assert.equal(reused.path, first.path);
    await writeFile(source, "source-two");
    const next = await native.materializeOrReuse({
      sourcePath: source,
      sourceId: "attachment:a",
      revision: "2",
    });
    assert.notEqual(next.path, first.path);
    await rm(next.path);
    const restored = await native.materializeOrReuse({
      sourcePath: source,
      sourceId: "attachment:a",
      revision: "2",
    });
    assert.notEqual(restored.path, next.path);
    const manifest = await import("fs/promises").then((fs) =>
      fs.readFile(join(root, ".owner", "managed-files.json"), "utf8"),
    );
    assert.notInclude(manifest, source);
    assert.include(manifest, "sha256:");
  });

  it("commits generated output into an owner path and rejects an escaping stage", async function () {
    const root = await mkdtemp(join(tmpdir(), "pi-native-generated-"));
    const outside = await mkdtemp(join(tmpdir(), "pi-native-outside-"));
    const stagedPath = join(root, "draft.md");
    await writeFile(stagedPath, "generated");
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot: join(root, ".owner"),
      mode: "restricted",
    });
    const committed = await native.commitGeneratedOutputs([{ stagedPath }]);
    assert.lengthOf(committed, 1);
    assert.include(committed[0], join(root, ".owner", "files"));
    try {
      await native.commitGeneratedOutputs([
        { stagedPath: join(outside, "escape.md") },
      ]);
      assert.fail("outside stage accepted");
    } catch (error) {
      assert.include(String(error), "pi_path_");
    }
  });

  it("runs Shell with a replacement environment and returns bounded output evidence", async function () {
    const root = await mkdtemp(join(tmpdir(), "pi-native-shell-run-"));
    const existingChromeUtils = (globalThis as { ChromeUtils?: unknown })
      .ChromeUtils;
    let launch: Record<string, unknown> | undefined;
    try {
      (globalThis as { ChromeUtils?: unknown }).ChromeUtils = {
        importESModule: () => ({
          Subprocess: {
            call: async (args: Record<string, unknown>) => {
              launch = args;
              let read = false;
              return {
                stdout: {
                  readString: async () => {
                    if (read) return "";
                    read = true;
                    return "hello\n";
                  },
                },
                stderr: { readString: async () => "" },
                wait: async () => ({ exitCode: 0 }),
                kill: () => undefined,
              };
            },
          },
        }),
      };
      const native = await createPiTrustedNativeExecution({
        workspaceRoot: root,
        ownerRoot: join(root, ".owner"),
        mode: "trusted",
      });
      const shell = native.definitions.find((item) => item.name === shellName)!;
      const execution = await shell.execute(
        { command: "pwd" },
        { signal: new AbortController().signal, onUpdate: () => undefined },
      );
      assert.equal(execution.status, "completed");
      assert.equal(launch?.environmentAppend, false);
      assert.deepEqual(
        (launch?.arguments as string[]).slice(0, 2),
        process.platform === "win32"
          ? ["-NoLogo", "-NoProfile"]
          : ["--noprofile", "--norc"],
      );
      assert.notProperty(launch?.environment as object, "OPENAI_API_KEY");
      assert.include((execution.value as { text: string }).text, "hello");
    } finally {
      (globalThis as { ChromeUtils?: unknown }).ChromeUtils =
        existingChromeUtils;
    }
  });

  it("bounds Shell teardown when the child never proves exit", async function () {
    this.timeout(10000);
    const root = await mkdtemp(join(tmpdir(), "pi-native-shell-stop-"));
    const existingChromeUtils = (globalThis as { ChromeUtils?: unknown })
      .ChromeUtils;
    try {
      (globalThis as { ChromeUtils?: unknown }).ChromeUtils = {
        importESModule: () => ({
          Subprocess: {
            call: async () => ({
              stdout: { readString: async () => "" },
              stderr: { readString: async () => "" },
              wait: () => new Promise(() => undefined),
              kill: () => undefined,
            }),
          },
        }),
      };
      const native = await createPiTrustedNativeExecution({
        workspaceRoot: root,
        ownerRoot: join(root, ".owner"),
        mode: "trusted",
      });
      const shell = native.definitions.find((item) => item.name === shellName)!;
      const started = Date.now();
      const outcome = await shell.execute(
        { command: "pwd", timeout: 1 },
        { signal: new AbortController().signal, onUpdate: () => undefined },
      );
      assert.isBelow(Date.now() - started, 7000);
      assert.equal(outcome.effectCertainty, "unknown");
    } finally {
      (globalThis as { ChromeUtils?: unknown }).ChromeUtils =
        existingChromeUtils;
    }
  });

  it("binds file paths to a verified workspace and rejects traversal and links", async function () {
    const root = await mkdtemp(join(tmpdir(), "pi-native-path-"));
    await mkdir(join(root, "docs"));
    await writeFile(join(root, "docs", "a.txt"), "a");
    const normal = await resolveRuntimePathIdentity({
      root,
      path: "docs/a.txt",
    });
    assert.equal(normal.path, join(root, "docs", "a.txt"));
    assert.isTrue(normal.exists);
    const missing = await resolveRuntimePathIdentity({
      root,
      path: "docs/new.txt",
      allowMissing: true,
    });
    assert.isFalse(missing.exists);
    for (const path of ["../outside", join(root, "..", "outside")]) {
      try {
        await resolveRuntimePathIdentity({ root, path, allowMissing: true });
        assert.fail("path escaped");
      } catch (error) {
        assert.include(String(error), "pi_path_");
      }
    }
    await symlink(tmpdir(), join(root, "link"), directoryLinkType);
    try {
      await resolveRuntimePathIdentity({ root, path: "link/other" });
      assert.fail("link followed");
    } catch (error) {
      assert.include(String(error), "pi_path_");
    }
    await symlink(
      join(root, "missing-target"),
      join(root, "dangling"),
      directoryLinkType,
    );
    try {
      await resolveRuntimePathIdentity({
        root,
        path: "dangling/new.txt",
        allowMissing: true,
      });
      assert.fail("dangling link followed");
    } catch (error) {
      assert.include(String(error), "pi_path_");
    }
  });
});
