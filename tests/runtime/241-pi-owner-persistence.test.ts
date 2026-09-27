import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assert } from "chai";
import { piOwnerPersistenceSharedTests } from "./piOwnerPersistenceShared";
import {
  appendPiOwnerEntry,
  createPiOwner,
  inspectPiOwner,
  repairPiOwnerTornTail,
  readPiOwnerPage,
  rebuildPiOwnerProjections,
} from "../../src/modules/piOwnerPersistence";
import {
  getRuntimePersistencePaths,
  removeRuntimePath,
} from "../../src/modules/runtimePersistence";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { getPiOwnerRegistry } from "../../src/modules/pluginStateStore";
import { configurePluginStateTestAdapterFactory } from "../../src/modules/pluginStateStore/core";
import {
  createNodeSqliteAdapter,
  installPluginStateNodeSqliteAdapter,
} from "../helpers/pluginStateNodeSqliteAdapter";

describe("Pi owner persistence in Node", function () {
  let root: string;
  let prior: string | undefined;
  beforeEach(async function () {
    prior = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-owners-"));
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = root;
    resetPluginStateStoreForTests();
  });
  afterEach(async function () {
    resetPluginStateStoreForTests();
    installPluginStateNodeSqliteAdapter();
    if (prior === undefined) delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    else process.env.ZOTERO_SKILLS_RUNTIME_ROOT = prior;
    await removeRuntimePath(root);
  });

  piOwnerPersistenceSharedTests(() => root);

  it("reports a torn tail, repairs only on request, and rebuilds projections", async function () {
    const owner = { kind: "conversation" as const, ownerId: "tail" };
    await createPiOwner(owner, root);
    await appendPiOwnerEntry(
      owner,
      { entryId: "e1", kind: "message", payload: { text: "ok" } },
      root,
    );
    const log = path.join(
      getRuntimePersistencePaths(root).piOwnersDir,
      "conversation",
      "tail",
      "transcript.jsonl",
    );
    await fs.appendFile(log, '{"seq":2');
    assert.equal((await inspectPiOwner(owner, root)).status, "torn_tail");
    await repairPiOwnerTornTail(owner, root);
    assert.equal((await inspectPiOwner(owner, root)).status, "valid");
    await rebuildPiOwnerProjections(owner, root);
    assert.equal((await readPiOwnerPage(owner, {}, root)).entries.length, 2);
  });

  it("refuses committed corruption", async function () {
    const owner = { kind: "skill_run" as const, ownerId: "corrupt" };
    await createPiOwner(owner, root);
    const log = path.join(
      getRuntimePersistencePaths(root).piOwnersDir,
      "skill_run",
      "corrupt",
      "transcript.jsonl",
    );
    await fs.appendFile(log, "{bad}\n");
    assert.equal((await inspectPiOwner(owner, root)).status, "corrupt");
    try {
      await repairPiOwnerTornTail(owner, root);
      assert.fail("committed corruption was truncated");
    } catch (error) {
      assert.match(String(error), /corrupt/);
    }
    try {
      await appendPiOwnerEntry(
        owner,
        { entryId: "e1", kind: "message", payload: {} },
        root,
      );
      assert.fail("corrupt history accepted");
    } catch (error) {
      assert.match(String(error), /corrupt/);
    }
  });

  it("treats a committed missing parent as corruption", async function () {
    const owner = { kind: "skill_run" as const, ownerId: "missing-parent" };
    await createPiOwner(owner, root);
    const log = path.join(
      getRuntimePersistencePaths(root).piOwnersDir,
      "skill_run",
      "missing-parent",
      "transcript.jsonl",
    );
    await fs.appendFile(
      log,
      `${JSON.stringify({
        seq: 1,
        entryId: "e1",
        parentEntryId: "absent",
        kind: "message",
        payload: {},
        createdAt: new Date().toISOString(),
      })}\n`,
    );
    assert.equal((await inspectPiOwner(owner, root)).status, "corrupt");
  });

  it("keeps the committed entry when the index projection fails", async function () {
    const owner = { kind: "conversation" as const, ownerId: "pending-index" };
    await createPiOwner(owner, root);
    const dir = path.join(
      getRuntimePersistencePaths(root).piOwnersDir,
      "conversation",
      "pending-index",
    );
    await fs.rm(path.join(dir, "index.jsonl"));
    await fs.mkdir(path.join(dir, "index.jsonl"));
    const input = {
      entryId: "e1",
      kind: "message",
      payload: { text: "committed" },
    };
    const first = await appendPiOwnerEntry(owner, input, root);
    assert.equal(first.projection, "pending");
    assert.equal(first.sequence, 1);
    assert.equal((await inspectPiOwner(owner, root)).entries.length, 1);
    await fs.rmdir(path.join(dir, "index.jsonl"));
    const retry = await appendPiOwnerEntry(owner, input, root);
    assert.equal(retry.projection, "ready");
    assert.equal(retry.sequence, 1);
    await fs.rm(path.join(dir, "index.jsonl"));
    assert.equal((await readPiOwnerPage(owner, {}, root)).entries.length, 1);
    assert.isTrue((await fs.stat(path.join(dir, "index.jsonl"))).isFile());
  });

  it("rebuilds a failed SQLite projection from canonical JSONL", async function () {
    resetPluginStateStoreForTests();
    configurePluginStateTestAdapterFactory(() => {
      const adapter = createNodeSqliteAdapter();
      return {
        ...adapter,
        run(sql, params) {
          if (sql.includes("INSERT INTO pi_owner_registry"))
            throw new Error("injected_registry_failure");
          adapter.run(sql, params);
        },
      };
    });
    const owner = { kind: "skill_run" as const, ownerId: "pending-registry" };
    assert.equal((await createPiOwner(owner, root)).projection, "pending");
    assert.equal(
      (
        await appendPiOwnerEntry(
          owner,
          { entryId: "s1", kind: "message", payload: { text: "saved" } },
          root,
        )
      ).projection,
      "pending",
    );
    assert.equal((await inspectPiOwner(owner, root)).entries.length, 1);
    resetPluginStateStoreForTests();
    installPluginStateNodeSqliteAdapter();
    const rebuilt = await rebuildPiOwnerProjections(owner, root);
    assert.equal(rebuilt.entryCount, 1);
    assert.equal(getPiOwnerRegistry(owner.kind, owner.ownerId)?.entryCount, 1);
  });
});
