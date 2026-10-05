import { assert } from "chai";
import {
  appendFile,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  truncate,
  writeFile,
} from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { execFileSync } from "node:child_process";
import { createServer } from "node:net";
import {
  resetRuntimeEnvironmentSnapshotForTests,
  seedRuntimeEnvironmentSnapshotForTests,
} from "../../src/platform/env";
import {
  resolveRuntimePathIdentity,
  statRuntimePathStrict,
} from "../../src/modules/runtimePersistence";
import { createPiOwner } from "../../src/modules/piOwnerPersistence";
import { piOwnerPaths } from "../../src/modules/piTranscriptStore";
import {
  flushOwner,
  record,
  resetPiRuntimeAuditForTests,
} from "../../src/modules/piRuntimeAudit";
import {
  createPiTrustedNativeExecution,
  withPiOwnerAuditQuota,
} from "../../src/modules/piTrustedNativeExecution";
import type { PiPhysicalSettlement } from "../../src/modules/piRuntimeLifecycle";
import { createStoreZipBytes } from "../../src/modules/zipStore";
import { createWorkflowArchiveApi } from "../../src/workflows/archive";

async function expectFailure(work: () => Promise<unknown>, pattern: RegExp) {
  let error: unknown;
  try {
    await work();
  } catch (failure) {
    error = failure;
  }
  assert.isDefined(error, `expected a rejection matching ${pattern}`);
  assert.match(String(error), pattern);
}

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

  it("commits a source page together and leaves prior copies on a rejected page", async function () {
    const root = await mkdtemp(join(tmpdir(), "pi-native-batch-"));
    const sources = [join(root, "first.txt"), join(root, "second.txt")];
    await writeFile(sources[0], "first");
    await writeFile(sources[1], "second");
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot: join(root, ".owner"),
      mode: "restricted",
    });
    const inputs = sources.map((sourcePath, index) => ({
      sourcePath,
      sourceId: `attachment:${index}`,
      revision: "1",
    }));
    const page = await native.materializeOrReuseMany(inputs);
    assert.lengthOf(page, 2);
    assert.deepEqual(
      await Promise.all(page.map(({ path }) => readFile(path, "utf8"))),
      ["first", "second"],
    );
    const manifestPath = join(root, ".owner", "managed-files.json");
    const before = await readFile(manifestPath, "utf8");
    try {
      await native.materializeOrReuseMany([
        { ...inputs[0], revision: "2" },
        { ...inputs[1], sourcePath: join(root, "missing.txt") },
      ]);
      assert.fail("incomplete page accepted");
    } catch (error) {
      assert.notInclude(String(error), "incomplete page accepted");
    }
    assert.equal(await readFile(manifestPath, "utf8"), before);
    assert.equal(
      (await native.materializeOrReuseMany(inputs))[0].path,
      page[0].path,
    );
  });

  it("commits bounded staged text and discards an interrupted output", async function () {
    const root = await mkdtemp(join(tmpdir(), "pi-native-text-"));
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot: join(root, ".owner"),
      mode: "restricted",
    });
    const output = await native.beginGeneratedTextOutput(".ndjson");
    await output.append('{"id":1}\n');
    await output.append('{"id":2}\n');
    const committed = await output.commit();
    assert.equal(
      await readFile(committed.path, "utf8"),
      '{"id":1}\n{"id":2}\n',
    );
    assert.equal(committed.sizeBytes, 18);
    assert.match(committed.sha256, /^sha256:/);
    const interrupted = await native.beginGeneratedTextOutput(".md");
    await interrupted.append("unfinished");
    await interrupted.discard();
    await interrupted.discard();
    const manifest = await readFile(
      join(root, ".owner", "managed-files.json"),
      "utf8",
    );
    assert.notInclude(manifest, "unfinished");
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

  it("keeps Shell physical settlement unknown while the child never proves exit", async function () {
    this.timeout(10000);
    const root = await mkdtemp(join(tmpdir(), "pi-native-shell-stop-"));
    const existingChromeUtils = (globalThis as { ChromeUtils?: unknown })
      .ChromeUtils;
    const registered: Promise<PiPhysicalSettlement>[] = [];
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
      const controller = new AbortController();
      // A logical cancel must return at once; the physical claim survives on
      // the registered promise until a real exit is observed.
      setTimeout(() => controller.abort(), 20);
      const started = Date.now();
      const outcome = await shell.execute(
        { command: "pwd" },
        {
          signal: controller.signal,
          onUpdate: () => undefined,
          trackPhysical: (settlement) => registered.push(settlement),
        },
      );
      assert.isBelow(Date.now() - started, 7000);
      assert.equal(outcome.effectCertainty, "unknown");
      assert.lengthOf(registered, 1);
    } finally {
      (globalThis as { ChromeUtils?: unknown }).ChromeUtils =
        existingChromeUtils;
    }
  });

  it("returns a Shell timeout on its own bound without waiting for the Gateway limit", async function () {
    this.timeout(10000);
    const root = await mkdtemp(join(tmpdir(), "pi-native-shell-timeout-"));
    const existingChromeUtils = (globalThis as { ChromeUtils?: unknown })
      .ChromeUtils;
    try {
      (globalThis as { ChromeUtils?: unknown }).ChromeUtils = {
        importESModule: () => ({
          Subprocess: {
            call: async () => ({
              stdout: { readString: async () => "" },
              stderr: { readString: async () => "" },
              // The child ignores the stop, so only the executor's own bound
              // can end the logical wait.
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
      // The one second executor bound ends it; the Gateway's own deadline is
      // two minutes and must never be the thing that returns this result.
      assert.isBelow(Date.now() - started, 6000);
      assert.equal(outcome.status, "failed");
      assert.equal(outcome.effectCertainty, "unknown");
      assert.equal(outcome.code, "pi_shell_timeout");
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

  it("snapshots explicit user files as immutable owner copies with exact read access", async function () {
    const base = await mkdtemp(join(tmpdir(), "pi-native-snap-"));
    const root = join(base, "workspace");
    const ownerRoot = join(base, "owner");
    await mkdir(root);
    await mkdir(ownerRoot);
    const source = join(base, "notes.txt");
    await writeFile(source, "hello snapshot");
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot,
      mode: "restricted",
    });
    const [snapshot] = await native.snapshotUserFiles([
      { path: source, displayName: "notes.txt" },
    ]);
    assert.equal(snapshot.displayName, "notes.txt");
    assert.equal(snapshot.size, "hello snapshot".length);
    assert.match(snapshot.sha256, /^sha256:/);
    assert.match(snapshot.ref, /^[\w.:-]+$/);
    assert.include(snapshot.path, join(ownerRoot, "files"));
    assert.equal(await readFile(snapshot.path, "utf8"), "hello snapshot");

    const read = native.definitions.find((tool) => tool.name === "read")!;
    await read.classify({ path: snapshot.path });
    const readResult = await read.execute(
      { path: snapshot.path },
      { signal: new AbortController().signal, onUpdate: () => undefined },
    );
    assert.deepInclude(readResult.value as object, { text: "hello snapshot" });
    await read.classify({ path: snapshot.ref });
    const byRef = await read.execute(
      { path: snapshot.ref },
      { signal: new AbortController().signal, onUpdate: () => undefined },
    );
    assert.deepInclude(byRef.value as object, { text: "hello snapshot" });
    const missingRef = await read.execute(
      { path: "managed:sha256:deadbeef" },
      { signal: new AbortController().signal, onUpdate: () => undefined },
    );
    assert.equal(missingRef.status, "failed");
    assert.equal(missingRef.code, "pi_snapshot_ref_invalid");

    const write = native.definitions.find((tool) => tool.name === "write")!;
    for (const path of [snapshot.path, join(ownerRoot, "managed-files.json")]) {
      try {
        await write.classify({ path, content: "x" });
        assert.fail("owner file writable");
      } catch (error) {
        assert.include(String(error), "pi_path_");
      }
    }
    try {
      await read.classify({ path: join(ownerRoot, "managed-files.json") });
      assert.fail("owner metadata readable");
    } catch (error) {
      assert.include(String(error), "pi_path_");
    }

    const manifest = await readFile(
      join(ownerRoot, "managed-files.json"),
      "utf8",
    );
    assert.notInclude(manifest, source);
    assert.include(manifest, "notes.txt");
    assert.include(manifest, "snapshot");

    await writeFile(source, "changed after send");
    const again = await read.execute(
      { path: snapshot.path },
      { signal: new AbortController().signal, onUpdate: () => undefined },
    );
    assert.deepInclude(again.value as object, { text: "hello snapshot" });
  });

  it("enforces combined snapshot limits with all-or-nothing preflight", async function () {
    this.timeout(30000);
    const base = await mkdtemp(join(tmpdir(), "pi-native-snap-limit-"));
    const root = join(base, "workspace");
    const ownerRoot = join(base, "owner");
    await mkdir(root);
    await mkdir(ownerRoot);
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot,
      mode: "restricted",
    });
    const small = join(base, "small.txt");
    await writeFile(small, "small");
    try {
      await native.snapshotUserFiles(
        Array.from({ length: 21 }, (_, index) => ({
          path: small,
          displayName: `f${index}.txt`,
        })),
      );
      assert.fail("resources above limit accepted");
    } catch (error) {
      assert.include(String(error), "pi_snapshot_resource_limit");
    }
    const big = join(base, "big.bin");
    await writeFile(big, Buffer.alloc(20 * 1024 * 1024 + 1, 7));
    try {
      await native.snapshotUserFiles([{ path: big, displayName: "big.bin" }]);
      assert.fail("oversize file accepted");
    } catch (error) {
      assert.include(String(error), "pi_snapshot_file_too_large");
    }
    const parts: { path: string; displayName: string }[] = [];
    for (let index = 0; index < 3; index += 1) {
      const path = join(base, `part-${index}.bin`);
      await writeFile(path, Buffer.alloc(18 * 1024 * 1024, 65 + index));
      parts.push({ path, displayName: `part-${index}.bin` });
    }
    try {
      await native.snapshotUserFiles(parts);
      assert.fail("total above limit accepted");
    } catch (error) {
      assert.include(String(error), "pi_snapshot_total_too_large");
    }
    try {
      await native.snapshotUserFiles([{ path: base, displayName: "dir" }]);
      assert.fail("directory accepted");
    } catch (error) {
      assert.include(String(error), "pi_snapshot_not_regular");
    }
    if (process.platform !== "win32") {
      const link = join(base, "link.txt");
      await symlink(small, link);
      try {
        await native.snapshotUserFiles([
          { path: link, displayName: "link.txt" },
        ]);
        assert.fail("link accepted");
      } catch (error) {
        assert.include(String(error), "pi_snapshot_");
      }
    }
    assert.deepEqual(await native.listUserFileSnapshots(), []);
    assert.deepEqual(
      await readdir(join(ownerRoot, "files")).catch(() => []),
      [],
    );
  });

  it("reuses snapshots by digest and exposes historical refs", async function () {
    const base = await mkdtemp(join(tmpdir(), "pi-native-snap-reuse-"));
    const root = join(base, "workspace");
    const ownerRoot = join(base, "owner");
    await mkdir(root);
    await mkdir(ownerRoot);
    const source = join(base, "doc.txt");
    await writeFile(source, "content-v1");
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot,
      mode: "restricted",
    });
    const first = (
      await native.snapshotUserFiles([{ path: source, displayName: "doc.txt" }])
    )[0];
    const reused = (
      await native.snapshotUserFiles([{ path: source, displayName: "doc.txt" }])
    )[0];
    assert.equal(reused.ref, first.ref);
    assert.equal(reused.path, first.path);
    const listed = await native.listUserFileSnapshots();
    assert.lengthOf(listed, 1);
    assert.equal(listed[0].ref, first.ref);
    assert.equal(
      (await native.resolveUserFileSnapshot(first.ref))?.path,
      first.path,
    );
    assert.isNull(
      await native.resolveUserFileSnapshot("managed:sha256:deadbeef"),
    );
    await writeFile(source, "content-v2");
    const next = (
      await native.snapshotUserFiles([{ path: source, displayName: "doc.txt" }])
    )[0];
    assert.notEqual(next.ref, first.ref);
    assert.lengthOf(await native.listUserFileSnapshots(), 2);
    assert.lengthOf(
      await native.snapshotUserFiles([
        { path: source, displayName: "a.txt" },
        { path: source, displayName: "b.txt" },
      ]),
      1,
    );
  });

  it("counts agent-written workspace files against the shared owner quota", async function () {
    const base = await mkdtemp(join(tmpdir(), "pi-native-quota-"));
    const root = join(base, "workspace");
    const ownerRoot = join(base, "owner");
    await mkdir(root);
    await mkdir(ownerRoot);
    const written = join(root, "agent-output.bin");
    await writeFile(written, "");
    await truncate(written, 200 * 1024 * 1024);
    await writeFile(
      join(ownerRoot, "managed-files.json"),
      JSON.stringify({
        version: 1,
        entries: [
          {
            kind: "generated",
            size: 1900 * 1024 * 1024,
            sha256: "sha256:deadbeef",
            name: "managed-old.bin",
          },
        ],
      }),
    );
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot,
      mode: "restricted",
    });
    const source = join(base, "small.txt");
    await writeFile(source, "small");
    try {
      await native.snapshotUserFiles([
        { path: source, displayName: "small.txt" },
      ]);
      assert.fail("agent-written workspace bytes ignored");
    } catch (error) {
      assert.include(String(error), "pi_owner_quota_exceeded");
    }
    const write = native.definitions.find((tool) => tool.name === "write")!;
    const outcome = await write.execute(
      { path: join(root, "another.txt"), content: "x" },
      { signal: new AbortController().signal, onUpdate: () => undefined },
    );
    assert.equal(outcome.status, "failed");
    assert.equal(outcome.code, "pi_owner_quota_exceeded");
  });

  it("fails closed when workspace quota cannot be counted within its scan bound", async function () {
    const base = await mkdtemp(join(tmpdir(), "pi-native-quota-depth-"));
    const root = join(base, "workspace");
    const ownerRoot = join(base, "owner");
    const deep = join(root, ...Array.from({ length: 33 }, (_, i) => `d${i}`));
    await mkdir(deep, { recursive: true });
    const source = join(base, "small.txt");
    await writeFile(source, "small");
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot,
      mode: "restricted",
    });
    let error: unknown;
    try {
      await native.snapshotUserFiles([{ path: source }]);
    } catch (failure) {
      error = failure;
    }
    assert.include(String(error), "pi_owner_quota_unavailable");
    assert.deepEqual(await native.listUserFileSnapshots(), []);
    await rm(base, { recursive: true, force: true });
  });

  it("counts a nested owner workspace that lives inside the owner tree", async function () {
    const base = await mkdtemp(join(tmpdir(), "pi-native-nested-quota-"));
    const ownerRoot = join(base, "owner");
    const root = join(ownerRoot, "workspace");
    await mkdir(root, { recursive: true });
    const written = join(root, "agent-output.bin");
    await writeFile(written, "");
    await truncate(written, 200 * 1024 * 1024);
    await writeFile(
      join(ownerRoot, "managed-files.json"),
      JSON.stringify({
        version: 1,
        entries: [
          {
            kind: "generated",
            size: 1900 * 1024 * 1024,
            sha256: "sha256:deadbeef",
            name: "managed-old.bin",
          },
        ],
      }),
    );
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot,
      mode: "restricted",
    });
    const source = join(base, "small.txt");
    await writeFile(source, "small");
    try {
      await expectFailure(
        () =>
          native.snapshotUserFiles([
            { path: source, displayName: "small.txt" },
          ]),
        /pi_owner_quota_exceeded/,
      );
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it("counts owner runtime-audit bytes exactly once", async function () {
    const base = await mkdtemp(join(tmpdir(), "pi-native-audit-once-"));
    const ownerRoot = join(base, "owner");
    const root = join(ownerRoot, "workspace");
    const audit = join(root, "runtime-audit", "audit.ndjson");
    await mkdir(join(root, "runtime-audit"), { recursive: true });
    await mkdir(ownerRoot, { recursive: true });
    await writeFile(audit, "");
    await truncate(audit, 600 * 1024 * 1024);
    await writeFile(
      join(ownerRoot, "managed-files.json"),
      JSON.stringify({
        version: 1,
        entries: [
          {
            kind: "generated",
            size: 1000 * 1024 * 1024,
            sha256: "sha256:deadbeef",
            name: "managed-old.bin",
          },
        ],
      }),
    );
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot,
      mode: "restricted",
    });
    const source = join(base, "small.txt");
    await writeFile(source, "small");
    try {
      // 1000 MiB manifest + 600 MiB audit stays under the 2 GiB owner quota:
      // hiding the nested workspace (the pre-existing owner exclusion) or
      // counting the audit directory a second time would reject it.
      const snaps = await native.snapshotUserFiles([
        { path: source, displayName: "small.txt" },
      ]);
      assert.lengthOf(snaps, 1);
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it("gates owner runtime-audit writes on the shared owner quota", async function () {
    const base = await mkdtemp(join(tmpdir(), "pi-native-audit-corrupt-"));
    const ownerRoot = join(base, "owner");
    const root = join(base, "workspace");
    await mkdir(root, { recursive: true });
    await mkdir(ownerRoot, { recursive: true });
    await writeFile(
      join(ownerRoot, "managed-files.json"),
      JSON.stringify({ version: 1, entries: [{ kind: "bogus", size: -1 }] }),
    );
    try {
      // A corrupt manifest is missing quota evidence, so the seam fails closed
      // instead of admitting against an unverified owner.
      await expectFailure(
        () =>
          withPiOwnerAuditQuota(
            { ownerRoot, workspaceRoot: root, additionalBytes: 0 },
            async () => true,
          ),
        /pi_manifest_corrupt/,
      );
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it("admits an owner runtime-audit write that fits the shared owner quota", async function () {
    const base = await mkdtemp(join(tmpdir(), "pi-native-audit-quota-"));
    const ownerRoot = join(base, "owner");
    const root = join(ownerRoot, "workspace");
    const audit = join(root, "runtime-audit", "audit.ndjson");
    await mkdir(join(root, "runtime-audit"), { recursive: true });
    await writeFile(audit, "");
    await truncate(audit, 100 * 1024 * 1024);
    let ran = false;
    try {
      await withPiOwnerAuditQuota(
        { ownerRoot, workspaceRoot: root, additionalBytes: 1024 },
        async () => {
          ran = true;
        },
      );
      assert.isTrue(ran, "audit write below the quota was blocked");
      const fat = join(root, "fat.bin");
      await writeFile(fat, "");
      await truncate(fat, 2100 * 1024 * 1024);
      await expectFailure(
        () =>
          withPiOwnerAuditQuota(
            { ownerRoot, workspaceRoot: root, additionalBytes: 1024 },
            async () => undefined,
          ),
        /pi_owner_quota_exceeded/,
      );
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it("reclaims owner audit bytes before rejecting a business allocation", async function () {
    this.timeout(60000);
    await resetPiRuntimeAuditForTests();
    const base = await mkdtemp(join(tmpdir(), "pi-native-audit-reclaim-"));
    const owner = { kind: "conversation" as const, ownerId: "audit-reclaim" };
    await createPiOwner(owner, base);
    // A real owner: the audit path is derived from the canonical owner record,
    // so the reclaim the quota seam performs is the production one.
    const ownerRoot = piOwnerPaths(owner, base).dir;
    const root = join(ownerRoot, "workspace");
    const audit = join(root, "runtime-audit", "audit.ndjson");
    await mkdir(root, { recursive: true });
    record({
      operation: "owner.terminal",
      origin: "conversation",
      owner,
      root: base,
      attributes: { status: "completed" },
    });
    await flushOwner(owner, base);
    // Grow the audit file so it alone can cover the shortfall below: the reclaim
    // has to compact real entries, not remove one oversized record.
    const line = await readFile(audit, "utf8");
    await writeFile(audit, line.repeat(Math.ceil(400_000 / line.length)));
    const auditBytes = (await statRuntimePathStrict(audit)).size;
    assert.isAbove(auditBytes, 200_000);
    const fat = join(root, "fat.bin");
    await writeFile(fat, "");
    // Managed bytes plus the audit overshoot the quota by half the audit size,
    // so the shortfall is real and the audit alone can still cover it: only a
    // real reclaim admits the snapshot below.
    const headroom = Math.floor(auditBytes / 2);
    await writeFile(
      join(ownerRoot, "managed-files.json"),
      JSON.stringify({
        version: 1,
        entries: [
          {
            kind: "generated",
            size: 2_147_483_648 - headroom,
            sha256: "sha256:deadbeef",
            name: "managed-old.bin",
          },
        ],
      }),
    );
    await truncate(fat, 0);
    try {
      const native = await createPiTrustedNativeExecution({
        workspaceRoot: root,
        ownerRoot,
        mode: "restricted",
      });
      const source = join(root, "result.txt");
      await writeFile(source, "result");
      const before = (await statRuntimePathStrict(audit)).size;
      const snaps = await native.snapshotUserFiles([
        { path: source, displayName: "result.txt" },
      ]);
      assert.lengthOf(snaps, 1, "business allocation was not reclaimed into");
      const after = await readFile(audit, "utf8");
      assert.isBelow(
        (await statRuntimePathStrict(audit)).size,
        before,
        "the reclaim released no audit bytes",
      );
      assert.include(
        after,
        "owner_quota",
        "the reclaim left no owner_quota gap",
      );
    } finally {
      await rm(base, { recursive: true, force: true });
      await resetPiRuntimeAuditForTests();
    }
  });

  it("counts in-flight staging against the audit quota seam", async function () {
    const base = await mkdtemp(join(tmpdir(), "pi-native-audit-staged-"));
    const ownerRoot = join(base, "owner");
    const root = join(base, "workspace");
    await mkdir(root, { recursive: true });
    await mkdir(ownerRoot, { recursive: true });
    const source = join(root, "attachment.bin");
    await writeFile(source, "");
    await truncate(source, 40_000_000);
    const extra = join(root, "extra.bin");
    await writeFile(extra, "");
    await truncate(extra, 50_000_000);
    // Managed bytes plus the 90 MB workspace and its 40 MB staging reservation
    // fit the quota. The audit seam has to observe the same held reservation:
    // without it the seam is admitted, and releasing it stays admitted.
    await writeFile(
      join(ownerRoot, "managed-files.json"),
      JSON.stringify({
        version: 1,
        entries: [
          {
            kind: "generated",
            size: 2_000_000_000,
            sha256: "sha256:deadbeef",
            name: "managed-old.bin",
          },
        ],
      }),
    );
    try {
      const native = await createPiTrustedNativeExecution({
        workspaceRoot: root,
        ownerRoot,
        mode: "restricted",
      });
      const prepared = await native.prepareStoredAttachment(source);
      // The staging reservation is keyed by canonical owner identity, so the
      // audit seam must observe the same held bytes. A reservation-scale
      // workspace file is exactly what makes the seam refuse.
      const fill = join(root, "fill.bin");
      await writeFile(fill, "");
      await truncate(fill, 30_000_000);
      await expectFailure(
        () =>
          withPiOwnerAuditQuota(
            { ownerRoot, workspaceRoot: root, additionalBytes: 0 },
            async () => true,
          ),
        /pi_owner_quota_exceeded/,
      );
      await prepared.dispose();
      await rm(fill);
      assert.isTrue(
        await withPiOwnerAuditQuota(
          { ownerRoot, workspaceRoot: root, additionalBytes: 0 },
          async () => true,
        ),
      );
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it("rolls back a source that grows beyond its admitted size during snapshotting", async function () {
    this.timeout(30000);
    const base = await mkdtemp(join(tmpdir(), "pi-native-snap-grow-"));
    const root = join(base, "workspace");
    const ownerRoot = join(base, "owner");
    await mkdir(root);
    await mkdir(ownerRoot);
    const source = join(base, "grow.bin");
    await writeFile(source, Buffer.alloc(8 * 1024 * 1024, 1));
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot,
      mode: "restricted",
    });
    const grow = (async () => {
      for (let index = 0; index < 8; index += 1) {
        await appendFile(source, Buffer.alloc(2 * 1024 * 1024, 2));
      }
    })();
    let failure: unknown;
    try {
      await native.snapshotUserFiles([
        { path: source, displayName: "grow.bin" },
      ]);
    } catch (error) {
      failure = error;
    }
    await grow;
    assert.isDefined(failure, "growth during snapshot was not detected");
    assert.match(String(failure), /pi_snapshot|pi_source_changed/);
    assert.deepEqual(await native.listUserFileSnapshots(), []);
    assert.deepEqual(
      await readdir(join(ownerRoot, "files")).catch(() => []),
      [],
    );
  });

  it("stages a contained immutable stored attachment and cleans private staging", async function () {
    const base = await mkdtemp(join(tmpdir(), "pi-native-stored-"));
    const root = join(base, "workspace");
    const ownerRoot = join(base, "owner");
    await mkdir(root);
    await mkdir(ownerRoot);
    const source = join(root, "paper.pdf");
    await writeFile(source, "attachment-bytes");
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot,
      mode: "restricted",
    });
    const prepared = await native.prepareStoredAttachment(source);
    assert.equal(prepared.manifest.main.relativePath, "paper.pdf");
    assert.equal(prepared.manifest.main.sizeBytes, "attachment-bytes".length);
    assert.match(prepared.manifest.main.sha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(prepared.manifest.companions, []);
    assert.notInclude(JSON.stringify(prepared.manifest), root);
    const resolved = await prepared.preparedFiles.resolveStoredAttachment(
      prepared.prepared,
    );
    assert.include(resolved.stagingDirectory, join(ownerRoot, "staging"));
    assert.equal(await readFile(resolved.mainPath, "utf8"), "attachment-bytes");
    await writeFile(source, "changed-after-prepare");
    assert.equal(await readFile(resolved.mainPath, "utf8"), "attachment-bytes");
    await prepared.dispose();
    await prepared.dispose();
    assert.deepEqual(
      await readdir(join(ownerRoot, "staging")).catch(() => []),
      [],
    );
  });

  it("rejects external, private-owner, aliased and linked stored attachment sources", async function () {
    const base = await mkdtemp(join(tmpdir(), "pi-native-stored-reject-"));
    const root = join(base, "workspace");
    const ownerRoot = join(root, ".owner");
    await mkdir(root);
    await mkdir(ownerRoot, { recursive: true });
    await writeFile(
      join(ownerRoot, "managed-files.json"),
      JSON.stringify({ version: 1, entries: [] }),
    );
    const outside = join(base, "outside.pdf");
    await writeFile(outside, "outside");
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot,
      mode: "restricted",
    });
    await expectFailure(
      () => native.prepareStoredAttachment(outside),
      /pi_path_/,
    );
    await expectFailure(
      () =>
        native.prepareStoredAttachment(join(ownerRoot, "managed-files.json")),
      /pi_path_private_owner/,
    );
    await expectFailure(
      () => native.prepareStoredAttachment("managed:sha256:deadbeef"),
      /pi_path_/,
    );
    await expectFailure(
      () => native.prepareStoredAttachment(root),
      /pi_managed_file_not_regular/,
    );
    if (process.platform !== "win32") {
      const link = join(root, "link.pdf");
      await symlink(outside, link);
      await expectFailure(
        () => native.prepareStoredAttachment(link),
        /pi_path_/,
      );
    }
    assert.deepEqual(
      await readdir(join(ownerRoot, "staging")).catch(() => []),
      [],
    );
  });

  it("rejects stored attachments past the owner quota and retains it across failed cleanup", async function () {
    const base = await mkdtemp(join(tmpdir(), "pi-native-stored-quota-"));
    const root = join(base, "workspace");
    const ownerRoot = join(base, "owner");
    await mkdir(root);
    await mkdir(ownerRoot);
    await writeFile(
      join(ownerRoot, "managed-files.json"),
      JSON.stringify({
        version: 1,
        entries: [
          {
            kind: "generated",
            size: 2147483647,
            sha256: "sha256:deadbeef",
            name: "managed-old.bin",
          },
        ],
      }),
    );
    const source = join(root, "small.pdf");
    await writeFile(source, "small");
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot,
      mode: "restricted",
    });
    await expectFailure(
      () => native.prepareStoredAttachment(source),
      /pi_owner_quota_exceeded/,
    );
    assert.deepEqual(
      await readdir(join(ownerRoot, "staging")).catch(() => []),
      [],
    );

    const cleanRoot = join(base, "clean-workspace");
    const cleanOwner = join(base, "clean-owner");
    await mkdir(cleanRoot);
    await mkdir(cleanOwner);
    await writeFile(
      join(cleanOwner, "managed-files.json"),
      JSON.stringify({
        version: 1,
        entries: [
          {
            kind: "generated",
            size: 2147483628,
            sha256: "sha256:deadbeef",
            name: "managed-old.bin",
          },
        ],
      }),
    );
    const held = join(cleanRoot, "held.pdf");
    const other = join(cleanRoot, "other.pdf");
    await writeFile(held, "held!!");
    await writeFile(other, "other!");
    const clean = await createPiTrustedNativeExecution({
      workspaceRoot: cleanRoot,
      ownerRoot: cleanOwner,
      mode: "restricted",
    });
    const prepared = await clean.prepareStoredAttachment(held);
    await expectFailure(
      () => clean.prepareStoredAttachment(other),
      /pi_owner_quota_exceeded/,
    );
    const resolved = await prepared.preparedFiles.resolveStoredAttachment(
      prepared.prepared,
    );
    await rm(resolved.stagingDirectory, { recursive: true, force: true });
    await expectFailure(() => prepared.dispose(), /pi_managed_cleanup_pending/);
    // A failed cleanup keeps both the residue and its quota reservation: the
    // second dispose must retry instead of reporting success, and the quota
    // must stay held meanwhile.
    await expectFailure(() => prepared.dispose(), /pi_managed_cleanup_pending/);
    await expectFailure(
      () => clean.prepareStoredAttachment(other),
      /pi_owner_quota_exceeded/,
    );
  });

  it("counts in-flight staging against the owner quota until it is released", async function () {
    const base = await mkdtemp(join(tmpdir(), "pi-native-stored-race-"));
    const root = join(base, "workspace");
    const ownerRoot = join(base, "owner");
    await mkdir(root);
    await mkdir(ownerRoot);
    await writeFile(
      join(ownerRoot, "managed-files.json"),
      JSON.stringify({
        version: 1,
        entries: [
          {
            kind: "generated",
            size: 2147483628,
            sha256: "sha256:deadbeef",
            name: "managed-old.bin",
          },
        ],
      }),
    );
    const first = join(root, "first.pdf");
    const second = join(root, "second.pdf");
    await writeFile(first, "first!");
    await writeFile(second, "second");
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot,
      mode: "restricted",
    });
    const held = await native.prepareStoredAttachment(first);
    await expectFailure(
      () => native.prepareStoredAttachment(second),
      /pi_owner_quota_exceeded/,
    );
    await held.dispose();
    const released = await native.prepareStoredAttachment(second);
    await released.dispose();
    assert.deepEqual(
      await readdir(join(ownerRoot, "staging")).catch(() => []),
      [],
    );
  });

  it("admits only one of two concurrent preparations that cannot both fit", async function () {
    // Pins concurrent admission: a regression that sampled the reserved total
    // before the quota check would admit both and fail the count below.
    const base = await mkdtemp(join(tmpdir(), "pi-native-stored-race2-"));
    const root = join(base, "workspace");
    const ownerRoot = join(base, "owner");
    await mkdir(root);
    await mkdir(ownerRoot);
    await writeFile(
      join(ownerRoot, "managed-files.json"),
      JSON.stringify({
        version: 1,
        entries: [
          {
            kind: "generated",
            size: 2147483628,
            sha256: "sha256:deadbeef",
            name: "managed-old.bin",
          },
        ],
      }),
    );
    const first = join(root, "first.pdf");
    const second = join(root, "second.pdf");
    await writeFile(first, "first!");
    await writeFile(second, "second");
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot,
      mode: "restricted",
    });
    const outcomes = await Promise.allSettled([
      native.prepareStoredAttachment(first),
      native.prepareStoredAttachment(second),
    ]);
    assert.lengthOf(
      outcomes.filter((outcome) => outcome.status === "fulfilled"),
      1,
    );
    const rejected = outcomes.find((outcome) => outcome.status === "rejected");
    assert.isDefined(rejected, "both concurrent preparations were admitted");
    if (rejected?.status === "rejected")
      assert.match(String(rejected.reason), /pi_owner_quota_exceeded/);
    const admitted = outcomes.find((outcome) => outcome.status === "fulfilled");
    if (admitted?.status === "fulfilled") {
      await admitted.value.dispose();
      const released = await native.prepareStoredAttachment(second);
      await released.dispose();
    }
    assert.deepEqual(
      await readdir(join(ownerRoot, "staging")).catch(() => []),
      [],
    );
  });

  it("rejects special files that a copy would block on", async function () {
    if (process.platform === "win32") return;
    const base = await mkdtemp(join(tmpdir(), "pi-native-special-"));
    const root = join(base, "workspace");
    const ownerRoot = join(base, "owner");
    await mkdir(root);
    await mkdir(ownerRoot);
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot,
      mode: "restricted",
    });
    const socketPath = join(root, "socket.bin");
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(socketPath, resolve));
    try {
      await expectFailure(
        () => native.prepareStoredAttachment(socketPath),
        /pi_managed_file_not_regular/,
      );
      const fifo = join(root, "pipe.bin");
      execFileSync("mkfifo", [fifo]);
      await expectFailure(
        () => native.prepareStoredAttachment(fifo),
        /pi_managed_file_not_regular/,
      );
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
  it("materializes a generated archive into a unique workspace directory", async function () {
    const base = await mkdtemp(join(tmpdir(), "pi-native-export-"));
    const root = join(base, "workspace");
    const ownerRoot = join(base, "owner");
    await mkdir(root);
    await mkdir(ownerRoot);
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot,
      mode: "restricted",
    });
    const manifestEntry = "runtime/payloads/paper-artifacts-manifest.json";
    const manifest = JSON.stringify({
      schema_id: "synthesis.filtered_paper_artifacts_manifest",
    });
    const zipPath = join(base, "export.zip");
    await writeFile(
      zipPath,
      createStoreZipBytes([
        { name: manifestEntry, text: manifest },
        {
          name: "runtime/payloads/artifacts/p1/digest.md",
          text: "digest body",
        },
        { name: "runtime/payloads/artifacts/p1/references.json", text: "[]" },
      ]),
    );
    const result = await native.materializeGeneratedArchive({
      sourcePath: zipPath,
      requiredEntries: [manifestEntry],
    });
    const canonical = await resolveRuntimePathIdentity({ root, path: root });
    assert.equal(native.outputResourceKey, "workspace:" + canonical.path);
    assert.equal(result.entryCount, 3);
    assert.equal(
      result.totalBytes,
      Buffer.byteLength(manifest) + Buffer.byteLength("digest body") + 2,
    );
    assert.isTrue(result.rootPath.startsWith(join(root, "exports")));
    assert.equal(
      await readFile(join(result.rootPath, manifestEntry), "utf8"),
      manifest,
    );
    assert.equal(
      await readFile(
        join(result.rootPath, "runtime/payloads/artifacts/p1/digest.md"),
        "utf8",
      ),
      "digest body",
    );
    assert.deepEqual(
      await readdir(join(ownerRoot, "staging")).catch(() => []),
      [],
    );
    const second = await native.materializeGeneratedArchive({
      sourcePath: zipPath,
      requiredEntries: [manifestEntry],
    });
    assert.notEqual(second.rootPath, result.rootPath);
    await rm(base, { recursive: true, force: true });
  });

  it("bounds export failure with no published directory or retained staging", async function () {
    const base = await mkdtemp(join(tmpdir(), "pi-native-export-reject-"));
    const root = join(base, "workspace");
    const ownerRoot = join(base, "owner");
    await mkdir(root);
    await mkdir(ownerRoot);
    const native = await createPiTrustedNativeExecution({
      workspaceRoot: root,
      ownerRoot,
      mode: "restricted",
    });
    const assertUnpublished = async () => {
      assert.isNull(await stat(join(root, "exports")).catch(() => null));
      assert.deepEqual(
        await readdir(join(ownerRoot, "staging")).catch(() => []),
        [],
      );
    };
    const missingManifest = join(base, "no-manifest.zip");
    await writeFile(
      missingManifest,
      createStoreZipBytes([
        { name: "runtime/payloads/artifacts/p1/digest.md", text: "x" },
      ]),
    );
    await expectFailure(
      () =>
        native.materializeGeneratedArchive({
          sourcePath: missingManifest,
          requiredEntries: ["runtime/payloads/paper-artifacts-manifest.json"],
        }),
      /pi_generated_archive_entry_missing/,
    );
    await assertUnpublished();
    const tooDeep = join(base, "deep.zip");
    const deepEntry =
      Array.from({ length: 32 }, (_, index) => "d" + index).join("/") +
      "/file.txt";
    await writeFile(
      tooDeep,
      createStoreZipBytes([{ name: deepEntry, text: "x" }]),
    );
    await expectFailure(
      () => native.materializeGeneratedArchive({ sourcePath: tooDeep }),
      /fixed limit/,
    );
    await assertUnpublished();
    const traversalBytes = createStoreZipBytes([
      { name: "safe.txt", text: "x" },
    ]);
    const traversal = join(base, "traversal.zip");
    await writeFile(
      traversal,
      Buffer.from(
        Buffer.from(traversalBytes)
          .toString("latin1")
          .split("safe.txt")
          .join("../x.txt"),
        "latin1",
      ),
    );
    await expectFailure(
      () => native.materializeGeneratedArchive({ sourcePath: traversal }),
      /unsafe/,
    );
    await assertUnpublished();
    const budget = join(base, "budget.zip");
    await writeFile(
      budget,
      createStoreZipBytes([
        { name: "runtime/payloads/a.txt", text: "0123456789" },
      ]),
    );
    await expectFailure(
      () =>
        createWorkflowArchiveApi().withExtractedZip(
          { sourcePath: budget, limits: { entryBytes: 4 } },
          { signal: new AbortController().signal },
          async () => undefined,
        ),
      /fixed limit/,
    );
    const aborted = new AbortController();
    aborted.abort();
    await expectFailure(
      () =>
        native.materializeGeneratedArchive({
          sourcePath: missingManifest,
          signal: aborted.signal,
        }),
      /pi_generated_archive_canceled/,
    );
    await assertUnpublished();
    await writeFile(
      join(ownerRoot, "managed-files.json"),
      JSON.stringify({
        version: 1,
        entries: [
          {
            kind: "generated",
            size: 2100 * 1024 * 1024,
            sha256: "sha256:deadbeef",
            name: "managed-old.bin",
          },
        ],
      }),
    );
    const small = join(base, "small.zip");
    await writeFile(
      small,
      createStoreZipBytes([
        { name: "runtime/payloads/manifest.json", text: "{}" },
      ]),
    );
    await expectFailure(
      () => native.materializeGeneratedArchive({ sourcePath: small }),
      /pi_owner_quota_exceeded/,
    );
    await assertUnpublished();
    await rm(base, { recursive: true, force: true });
  });
});
