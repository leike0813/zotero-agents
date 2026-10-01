import { assert } from "chai";
import {
  createPiTrustedNativeExecution,
  withPiOwnerAuditQuota,
} from "../../../../src/modules/piTrustedNativeExecution";
import {
  ensureRuntimeDirectoryStrict,
  readRuntimeTextFileStrict,
  removeRuntimePath,
  writeRuntimeBytes,
} from "../../../../src/modules/runtimePersistence";
import { joinPath } from "../../../../src/utils/path";

describe("Pi Trusted Native in real Zotero", function () {
  it("uses host filesystem proof and keeps the restricted catalog independent of Shell", async function () {
    if (
      (globalThis as { process?: { versions?: { node?: string } } }).process
        ?.versions?.node
    )
      throw new Error("Node runtime reached the plugin host");
    const workspaceRoot = joinPath(
      Zotero.getTempDirectory().path,
      `pi-native-${Date.now()}`,
    );
    await ensureRuntimeDirectoryStrict(workspaceRoot);
    try {
      const native = await createPiTrustedNativeExecution({
        workspaceRoot,
        ownerRoot: joinPath(workspaceRoot, ".owner"),
        mode: "restricted",
      });
      assert.deepEqual(
        native.definitions.map((item) => item.name),
        ["read", "edit", "write", "grep", "find", "ls"],
      );
      const write = native.definitions.find((item) => item.name === "write")!;
      const read = native.definitions.find((item) => item.name === "read")!;
      const context = {
        signal: new AbortController().signal,
        onUpdate: () => undefined,
      };
      assert.equal(
        (
          await write.execute(
            { path: "canary.txt", content: "pi-host" },
            context,
          )
        ).status,
        "completed",
      );
      const result = await read.execute({ path: "canary.txt" }, context);
      assert.equal(result.status, "completed");
      assert.deepInclude(result.value as object, { text: "pi-host" });
      const sourcePath = joinPath(workspaceRoot, "attachment.txt");
      await writeRuntimeBytes(sourcePath, new TextEncoder().encode("source"));
      const page = await native.materializeOrReuseMany([
        { sourcePath, sourceId: "attachment:host", revision: "1" },
      ]);
      assert.equal(await readRuntimeTextFileStrict(page[0].path), "source");
      const output = await native.beginGeneratedTextOutput(".ndjson");
      await output.append('{"host":true}\n');
      const artifact = await output.commit();
      assert.equal(
        await readRuntimeTextFileStrict(artifact.path),
        '{"host":true}\n',
      );
    } finally {
      await removeRuntimePath(workspaceRoot).catch(() => false);
    }
  });

  it("runs the native Shell canary with an explicit host adapter", async function () {
    this.timeout(30000);
    const workspaceRoot = joinPath(
      Zotero.getTempDirectory().path,
      `pi-shell-${Date.now()}`,
    );
    await ensureRuntimeDirectoryStrict(workspaceRoot);
    try {
      const native = await createPiTrustedNativeExecution({
        workspaceRoot,
        ownerRoot: joinPath(workspaceRoot, ".owner"),
        mode: "trusted",
      });
      const shell = native.definitions.find(
        (item) => item.name === "bash" || item.name === "powershell",
      );
      assert.isDefined(shell);
      const result = await shell!.execute(
        { command: "pwd", timeout: 10 },
        {
          signal: new AbortController().signal,
          onUpdate: () => undefined,
        },
      );
      assert.equal(result.status, "completed");
      assert.include(
        (result.value as { text: string }).text.toLowerCase(),
        workspaceRoot.toLowerCase(),
      );
      if (Zotero.isWin) {
        const junction = joinPath(workspaceRoot, "junction");
        const target = Zotero.getTempDirectory().path;
        const quote = (path: string) => `'${path.replace(/'/g, "''")}'`;
        const created = await shell!.execute(
          {
            command: `New-Item -ItemType Junction -Path ${quote(junction)} -Target ${quote(target)} | Out-Null`,
            timeout: 10,
          },
          { signal: new AbortController().signal, onUpdate: () => undefined },
        );
        assert.equal(created.status, "completed");
        try {
          const read = native.definitions.find((item) => item.name === "read")!;
          let admitted = true;
          try {
            await read.classify({ path: "junction" });
          } catch {
            admitted = false;
          }
          assert.isFalse(admitted);
        } finally {
          await IOUtils.remove(junction, { recursive: false });
        }
      }
    } finally {
      await removeRuntimePath(workspaceRoot).catch(() => false);
    }
  });

  it("keeps owner diagnostics out of a nested workspace under the real host IO", async function () {
    const ownerRoot = joinPath(
      Zotero.getTempDirectory().path,
      `pi-native-nested-${Date.now()}`,
    );
    const workspaceRoot = joinPath(ownerRoot, "workspace");
    const auditRoot = joinPath(workspaceRoot, "runtime-audit");
    await ensureRuntimeDirectoryStrict(auditRoot);
    try {
      await writeRuntimeBytes(
        joinPath(auditRoot, "audit.ndjson"),
        new Uint8Array(),
      );
      const native = await createPiTrustedNativeExecution({
        workspaceRoot,
        ownerRoot,
        mode: "restricted",
      });
      const context = {
        signal: new AbortController().signal,
        onUpdate: () => undefined,
      };
      const read = native.definitions.find((item) => item.name === "read")!;
      const write = native.definitions.find((item) => item.name === "write")!;
      const list = native.definitions.find((item) => item.name === "ls")!;
      // The workspace root itself is the only listing target: a relative `.`
      // is rejected by the shared path verifier before any tool logic runs.
      const listPath = workspaceRoot;
      for (const [name, definition, args] of [
        ["read", read, { path: "runtime-audit/audit.ndjson" }],
        [
          "write",
          write,
          { path: "runtime-audit/planted.ndjson", content: "x" },
        ],
        ["ls", list, { path: listPath }],
      ] as const) {
        let outcome: unknown;
        try {
          outcome = await definition.classify(args as never);
        } catch (error) {
          outcome = String(error);
        }
        // The structured classify result is part of the failure message so a
        // host run reports why a case failed, not just that it did.
        if (name !== "ls")
          assert.include(
            String(outcome),
            "pi_path_private_owner",
            `${name} admitted private owner metadata: ${JSON.stringify(outcome)}`,
          );
      }
      const listed = await list.execute({ path: listPath }, context);
      assert.equal(
        listed.status,
        "completed",
        `ls failed: ${JSON.stringify(listed)}`,
      );
      assert.notInclude(
        JSON.stringify(listed.value),
        "runtime-audit",
        "the audit tree must stay out of the search walk",
      );
      const source = joinPath(workspaceRoot, "canary.txt");
      await writeRuntimeBytes(source, new TextEncoder().encode("host"));
      const snaps = await native
        .snapshotUserFiles([{ path: source, displayName: "canary.txt" }])
        .catch((error: unknown) => {
          throw new Error(
            `snapshot failed under nested owner: ${String(error)}`,
          );
        });
      assert.lengthOf(snaps, 1, `snapshot returned ${snaps.length}`);
      assert.isTrue(
        await withPiOwnerAuditQuota(
          { ownerRoot, workspaceRoot, additionalBytes: 1024 },
          async () => true,
        ),
      );
    } finally {
      await removeRuntimePath(ownerRoot).catch(() => false);
    }
  });
});
