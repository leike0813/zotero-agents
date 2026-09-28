import { assert } from "chai";
import { createPiTrustedNativeExecution } from "../../../../src/modules/piTrustedNativeExecution";
import {
  ensureRuntimeDirectoryStrict,
  removeRuntimePath,
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
});
