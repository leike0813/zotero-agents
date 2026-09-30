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
  admitPiConversationTurn,
  appendPiConversationFact,
  cleanupPiConversation,
  createPiConversationOwner,
  createPiConversationPreparationAdapter,
  getPiConversationMetadata,
  getPiConversationReadFacts,
  markPiConversationDeleting,
  readPiConversationPage,
  readPiConversationTranscriptSnapshot,
  updatePiConversationMetadata,
} from "../../src/modules/piOwnerPersistence";
import { piOwnerPaths } from "../../src/modules/piTranscriptStore";
import type {
  PiCompactionSummary,
  TurnPreparationRecord,
} from "../../src/modules/piTurnPreparation";
import {
  getRuntimePersistencePaths,
  removeRuntimePath,
  runtimePathExists,
} from "../../src/modules/runtimePersistence";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { getPiOwnerRegistry } from "../../src/modules/pluginStateStore";
import { configurePluginStateTestAdapterFactory } from "../../src/modules/pluginStateStore/core";
import {
  createNodeSqliteAdapter,
  installPluginStateNodeSqliteAdapter,
} from "../helpers/pluginStateNodeSqliteAdapter";

async function rejectsWith(promise: Promise<unknown>, pattern: RegExp) {
  try {
    await promise;
  } catch (error) {
    assert.match(String(error), pattern);
    return;
  }
  assert.fail(`expected rejection matching ${pattern}`);
}

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

  it("retains cleanup_pending when Conversation cleanup fails and finishes on retry", async function () {
    let failReceipts = true;
    resetPluginStateStoreForTests();
    configurePluginStateTestAdapterFactory(() => {
      const adapter = createNodeSqliteAdapter();
      return {
        ...adapter,
        run(sql, params) {
          if (
            failReceipts &&
            sql.includes("INSERT INTO pi_conversation_cleanup_receipts")
          )
            throw new Error("injected_receipt_failure");
          adapter.run(sql, params);
        },
      };
    });
    const created = await createPiConversationOwner(
      { conversationId: "cleanup-pending" },
      root,
    );
    updatePiConversationMetadata("cleanup-pending", { lifecycle: "archived" });
    markPiConversationDeleting("cleanup-pending");
    const pending = await cleanupPiConversation(created.ref, root);
    assert.equal(pending.status, "cleanup_pending");
    assert.equal(
      getPiConversationMetadata("cleanup-pending")?.lifecycle,
      "cleanup_pending",
    );
    assert.throws(
      () =>
        updatePiConversationMetadata("cleanup-pending", {
          lifecycle: "active",
        }),
      /pi_conversation_lifecycle_invalid/,
    );
    await rejectsWith(
      admitPiConversationTurn(
        created.ref,
        {
          turnId: "turn-1",
          expectedBasis: { revision: 0, activeLeaf: null },
          entries: [
            {
              entryId: "u1",
              kind: "message",
              payload: { role: "user", text: "blocked" },
            },
          ],
        },
        root,
      ),
      /pi_conversation_lifecycle_frozen/,
    );
    assert.isFalse(
      await runtimePathExists(piOwnerPaths(created.ref, root).dir),
    );
    failReceipts = false;
    const done = await cleanupPiConversation(created.ref, root);
    assert.equal(done.status, "deleted");
    assert.isNull(getPiConversationMetadata("cleanup-pending"));
  });

  it("records preparation facts and commits compaction under basis CAS", async function () {
    const created = await createPiConversationOwner(
      { conversationId: "prep-cas" },
      root,
    );
    const adapter = createPiConversationPreparationAdapter(created.ref, root);
    const summary: PiCompactionSummary = {
      schemaVersion: 1,
      inputDigest: "digest",
      coveredEntryIds: [],
      retainedEntryIds: [],
      goals: ["goal"],
      decisions: [],
      constraints: [],
      unfinishedWork: [],
      artifactRefs: [],
      effectReceiptRefs: [],
      unresolved: [],
      facts: [],
    };
    const record = {
      schema: "zotero-agents.pi-turn-preparation.v1",
      kind: "model",
      owner: created.ref,
      turnId: "turn-1",
      invocationId: "invocation-1",
      runtimeGeneration: "generation-1",
    } as unknown as TurnPreparationRecord;
    await rejectsWith(
      adapter.record(record, { revision: 3, activeLeaf: null }),
      /pi_conversation_basis_mismatch/,
    );
    const basis = await adapter.record(record, {
      revision: 0,
      activeLeaf: null,
    });
    // A preparation record is durable but not model-visible, so the basis it
    // reports is unchanged; C06 accepts an equal revision with an equal leaf.
    assert.equal(basis.revision, 0);
    assert.equal(basis.activeLeaf, null);
    const staleCommit = await adapter.commitCompaction({
      owner: created.ref,
      turnId: "turn-1",
      expectedRevision: 5,
      expectedLeaf: basis.activeLeaf,
      summary,
    });
    assert.equal(staleCommit.status, "stale");
    const committed = await adapter.commitCompaction({
      owner: created.ref,
      turnId: "turn-1",
      expectedRevision: basis.revision,
      expectedLeaf: basis.activeLeaf,
      summary,
    });
    assert.equal(committed.status, "committed");
    if (committed.status === "committed") {
      assert.isAbove(committed.transcript.revision, basis.revision);
      assert.equal(committed.transcript.revision, 1);
      assert.isNotNull(committed.transcript.activeLeaf);
    }
  });

  it("runs projection SQL on a host that binds distinct named parameters only", async function () {
    resetPluginStateStoreForTests();
    configurePluginStateTestAdapterFactory(() => {
      const adapter = createNodeSqliteAdapter();
      // The real Zotero adapter binds one value per distinct named parameter
      // and stores a bound null as an empty string.
      const assertBindable = (sql: string) => {
        const seen = new Set<string>();
        for (const raw of sql.match(/[@:$]([A-Za-z_][A-Za-z0-9_]*)/g) || []) {
          if (seen.has(raw))
            throw new Error(`duplicate named parameter ${raw}`);
          seen.add(raw);
        }
      };
      const bind = (params?: Record<string, unknown>) => {
        if (!params) return undefined;
        const bound: Record<string, string | number | null> = {};
        for (const [key, value] of Object.entries(params))
          bound[key] =
            value === null || value === undefined
              ? ""
              : (value as string | number);
        return bound;
      };
      return {
        ...adapter,
        run(sql, params) {
          assertBindable(sql);
          adapter.run(sql, bind(params));
        },
        all(sql, params) {
          assertBindable(sql);
          return adapter.all(sql, bind(params));
        },
        get(sql, params) {
          assertBindable(sql);
          return adapter.get(sql, bind(params));
        },
      };
    });
    const created = await createPiConversationOwner(
      { conversationId: "host-bind" },
      root,
    );
    assert.equal(created.metadata.lifecycle, "active");
    await appendPiConversationFact(
      created.ref,
      { kind: "message", payload: { role: "user", text: "hi" } },
      root,
    );
    const facts = getPiConversationReadFacts("host-bind");
    assert.equal(facts?.counts.user, 1);
    assert.isNull(facts?.latestTurnId);
    assert.isNull(facts?.usage);
    const snapshot = await readPiConversationTranscriptSnapshot(
      created.ref,
      root,
    );
    const tail = (await inspectPiOwner(created.ref, root)).entries.at(
      -1,
    )?.entryId;
    assert.equal(snapshot.activeLeaf, tail);
  });

  it("retains one receipt identity when it is published again after later facts", async function () {
    const created = await createPiConversationOwner(
      { conversationId: "receipt-dedup" },
      root,
    );
    const receipt = {
      entryId: "domain-receipt",
      turnId: "original",
      kind: "zotero_mutation_receipt",
      payload: { receiptId: "r1" },
    };
    await appendPiConversationFact(created.ref, receipt, root);
    await appendPiConversationFact(
      created.ref,
      { kind: "tool_result", payload: { status: "completed" } },
      root,
    );
    await appendPiConversationFact(created.ref, receipt, root);
    assert.lengthOf(
      (await inspectPiOwner(created.ref, root)).entries.filter(
        (entry) => entry.entryId === receipt.entryId,
      ),
      1,
    );
    await rejectsWith(
      appendPiConversationFact(
        created.ref,
        { ...receipt, payload: { receiptId: "r2" } },
        root,
      ),
      /pi_entry_conflict/,
    );
  });

  it("allows only a title preparation record on an archived Conversation", async function () {
    const created = await createPiConversationOwner(
      { conversationId: "archived-title" },
      root,
    );
    const adapter = createPiConversationPreparationAdapter(created.ref, root);
    const record = {
      schema: "zotero-agents.pi-turn-preparation.v1",
      kind: "model",
      owner: created.ref,
      turnId: "title-1",
      invocationId: "title-invocation",
      runtimeGeneration: "title-1",
    } as unknown as TurnPreparationRecord;
    updatePiConversationMetadata("archived-title", { lifecycle: "archived" });
    await rejectsWith(
      adapter.record(record, { revision: 0, activeLeaf: null }),
      /pi_conversation_lifecycle_frozen/,
    );
    const titleBasis = await adapter.record(
      { ...record, purpose: "title" } as unknown as TurnPreparationRecord,
      { revision: 0, activeLeaf: null },
    );
    assert.equal(titleBasis.revision, 0);
    const archivedCompaction = await adapter.commitCompaction({
      owner: created.ref,
      turnId: "title-1",
      expectedRevision: titleBasis.revision,
      expectedLeaf: titleBasis.activeLeaf,
      summary: {
        schemaVersion: 1,
        inputDigest: "digest",
        coveredEntryIds: [],
        retainedEntryIds: [],
        goals: ["goal"],
        decisions: [],
        constraints: [],
        unfinishedWork: [],
        artifactRefs: [],
        effectReceiptRefs: [],
        unresolved: [],
        facts: [],
      },
    });
    assert.equal(archivedCompaction.status, "stale");
  });

  it("pages Conversation history tail-first from the visible index", async function () {
    const created = await createPiConversationOwner(
      { conversationId: "paging" },
      root,
    );
    for (let index = 0; index < 5; index += 1) {
      await appendPiConversationFact(
        created.ref,
        { kind: "message", payload: { role: "user", text: `m${index}` } },
        root,
      );
    }
    const page = await readPiConversationPage(created.ref, { limit: 2 }, root);
    assert.equal(page.totalVisible, 5);
    assert.equal(page.cursor, 3);
    assert.deepEqual(
      page.entries.map((entry) => (entry.payload as { text: string }).text),
      ["m3", "m4"],
    );
    assert.isNull(page.nextCursor);
    const earlier = await readPiConversationPage(
      created.ref,
      { cursor: 0, limit: 2 },
      root,
    );
    assert.equal(earlier.nextCursor, 2);
  });

  it("fails closed on a corrupted lifecycle row instead of throwing a type error", async function () {
    let captured: ReturnType<typeof createNodeSqliteAdapter> | undefined;
    resetPluginStateStoreForTests();
    configurePluginStateTestAdapterFactory(() => {
      const adapter = createNodeSqliteAdapter();
      captured = adapter;
      return adapter;
    });
    await createPiConversationOwner(
      { conversationId: "corrupt-lifecycle" },
      root,
    );
    captured!.run(
      "UPDATE pi_conversation_metadata SET lifecycle=@lifecycle WHERE conversation_id=@id",
      { lifecycle: "bogus", id: "corrupt-lifecycle" },
    );
    try {
      updatePiConversationMetadata("corrupt-lifecycle", {
        lifecycle: "archived",
      });
      assert.fail("a corrupted lifecycle accepted a transition");
    } catch (error) {
      assert.match(String(error), /pi_conversation_lifecycle_invalid/);
    }
    assert.equal(
      updatePiConversationMetadata("corrupt-lifecycle", { title: "kept" })
        .title,
      "kept",
    );
  });

  it("refuses to create over an owner in irreversible deletion", async function () {
    await createPiConversationOwner({ conversationId: "irreversible" }, root);
    updatePiConversationMetadata("irreversible", { lifecycle: "archived" });
    markPiConversationDeleting("irreversible");
    await rejectsWith(
      createPiConversationOwner({ conversationId: "irreversible" }, root),
      /pi_conversation_owner_unavailable/,
    );
    updatePiConversationMetadata("irreversible", {
      lifecycle: "cleanup_pending",
    });
    await rejectsWith(
      createPiConversationOwner({ conversationId: "irreversible" }, root),
      /pi_conversation_owner_unavailable/,
    );
  });
});
