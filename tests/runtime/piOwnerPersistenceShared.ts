import { assert } from "chai";
import {
  admitPiConversationTurn,
  appendPiOwnerEntry,
  appendPiConversationFact,
  cleanupPiConversation,
  createPiConversationOwner,
  createPiOwner,
  getPiConversationCleanupReceipt,
  getPiConversationMetadata,
  getPiConversationReadFacts,
  inspectPiOwner,
  listPiConversations,
  markPiConversationDeleting,
  readPiConversationPage,
  readPiConversationTranscriptSnapshot,
  readPiOwnerPage,
  rebuildPiOwnerProjections,
  updatePiConversationMetadata,
} from "../../src/modules/piOwnerPersistence";

async function rejectsWith(promise: Promise<unknown>, pattern: RegExp) {
  try {
    await promise;
  } catch (error) {
    assert.match(String(error), pattern);
    return;
  }
  assert.fail(`expected rejection matching ${pattern}`);
}

export function piOwnerPersistenceSharedTests(getRoot: () => string) {
  describe("Pi owner persistence shared behavior", function () {
    it("keeps Conversation and Skill Run histories isolated and pages UTF-8 entries", async function () {
      const root = getRoot();
      const conversation = {
        kind: "conversation" as const,
        ownerId: "conversation-1",
      };
      const skillRun = { kind: "skill_run" as const, ownerId: "skill-1" };
      await createPiOwner(conversation, root);
      await createPiOwner(skillRun, root);
      const first = await appendPiOwnerEntry(
        conversation,
        {
          entryId: "e1",
          turnId: "t1",
          kind: "message",
          payload: { text: "甲😀", role: "assistant" },
        },
        root,
      );
      assert.equal(first.sequence, 1);
      assert.equal(first.projection, "ready");
      await appendPiOwnerEntry(
        conversation,
        {
          entryId: "e2",
          turnId: "t1",
          parentEntryId: "e1",
          kind: "message",
          payload: { text: "second" },
        },
        root,
      );
      await appendPiOwnerEntry(
        skillRun,
        {
          entryId: "s1",
          kind: "message",
          payload: { text: "skill" },
        },
        root,
      );
      const repeat = await appendPiOwnerEntry(
        conversation,
        {
          entryId: "e1",
          turnId: "t1",
          kind: "message",
          payload: { text: "甲😀", role: "assistant" },
        },
        root,
      );
      assert.equal(repeat.sequence, 1);
      const reordered = await appendPiOwnerEntry(
        conversation,
        {
          entryId: "e1",
          turnId: "t1",
          kind: "message",
          payload: { role: "assistant", text: "甲😀" },
        },
        root,
      );
      assert.equal(reordered.sequence, 1);
      const page = await readPiOwnerPage(conversation, { limit: 1 }, root);
      assert.deepEqual(
        page.entries.map((entry) => entry.payload),
        [{ text: "甲😀", role: "assistant" }],
      );
      assert.equal(page.nextCursor, 1);
      const second = await readPiOwnerPage(
        conversation,
        { cursor: page.nextCursor },
        root,
      );
      assert.deepEqual(
        second.entries.map((entry) => entry.entryId),
        ["e2"],
      );
      assert.equal(
        (await readPiOwnerPage(skillRun, {}, root)).entries.length,
        1,
      );
      assert.equal((await inspectPiOwner(conversation, root)).status, "valid");
      await createPiOwner(conversation, root);
      assert.equal(
        (await readPiOwnerPage(conversation, {}, root)).entries.length,
        2,
      );
      await rebuildPiOwnerProjections(conversation, root);
      assert.equal(
        (await readPiOwnerPage(conversation, {}, root)).entries.length,
        2,
      );
    });
  });

  describe("Pi Conversation owner metadata shared behavior", function () {
    it("drives metadata, admission, paging and two-phase cleanup", async function () {
      const root = getRoot();
      const conversationId = `conversation-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const created = await createPiConversationOwner(
        { conversationId, selection: "config-1" },
        root,
      );
      assert.equal(created.ref.kind, "conversation");
      assert.equal(created.ref.ownerId, conversationId);
      assert.equal(created.metadata.lifecycle, "active");
      assert.equal(created.metadata.selection, "config-1");
      assert.equal(created.metadata.title, "");
      assert.equal(created.metadata.generation, 1);

      const agent = updatePiConversationMetadata(
        conversationId,
        { title: "  Agent   title ", titleSource: "agent" },
        { titleRevision: 0 },
      );
      assert.equal(agent.title, "Agent title");
      assert.equal(agent.titleSource, "agent");
      assert.equal(agent.titleRevision, 1);
      assert.equal(agent.generation, 1);
      const manual = updatePiConversationMetadata(
        conversationId,
        { title: "Manual", titleSource: "user" },
        { titleRevision: agent.titleRevision },
      );
      assert.equal(manual.title, "Manual");
      assert.equal(manual.titleRevision, 2);
      assert.throws(
        () =>
          updatePiConversationMetadata(
            conversationId,
            { title: "Late", titleSource: "agent" },
            { titleRevision: agent.titleRevision },
          ),
        /pi_conversation_metadata_stale/,
      );

      const archived = updatePiConversationMetadata(
        conversationId,
        { lifecycle: "archived" },
        { lifecycle: "active" },
      );
      assert.equal(archived.generation, 1);
      const late = updatePiConversationMetadata(
        conversationId,
        { title: "Archived title", titleSource: "agent" },
        { titleRevision: archived.titleRevision },
      );
      assert.equal(late.title, "Archived title");
      const restored = updatePiConversationMetadata(
        conversationId,
        { lifecycle: "active" },
        { lifecycle: "archived" },
      );
      assert.equal(restored.conversationId, conversationId);
      assert.equal(restored.title, "Archived title");

      assert.throws(
        () => markPiConversationDeleting(conversationId),
        /pi_conversation_lifecycle_invalid/,
      );

      const before = await readPiConversationTranscriptSnapshot(
        created.ref,
        root,
      );
      assert.equal(before.revision, 0);
      assert.equal(before.activeLeaf, null);
      const admitted = await admitPiConversationTurn(
        created.ref,
        {
          turnId: "turn-1",
          expectedBasis: { revision: 0, activeLeaf: null },
          entries: [
            {
              entryId: "u1",
              kind: "message",
              payload: { role: "user", text: "hello" },
            },
          ],
          frozen: {
            model: {
              selectionRef: "config-1",
              provider: "fixture",
              modelId: "fixture-model",
              api: "openai-completions",
            },
            resources: [{ ref: "1:ABC", kind: "selection" }],
          },
        },
        root,
      );
      assert.deepEqual(
        admitted.entries.map((entry) => entry.kind),
        ["message", "turn_started"],
      );
      assert.equal(admitted.basis.revision, 1);
      assert.equal(admitted.basis.activeLeaf, admitted.entries.at(-1)?.entryId);

      await rejectsWith(
        admitPiConversationTurn(
          created.ref,
          {
            turnId: "turn-2",
            expectedBasis: admitted.basis,
            entries: [
              {
                entryId: "u2",
                kind: "message",
                payload: { role: "user", text: "again" },
              },
            ],
          },
          root,
        ),
        /pi_conversation_turn_open/,
      );
      await rejectsWith(
        admitPiConversationTurn(
          created.ref,
          {
            turnId: "turn-3",
            expectedBasis: { revision: 0, activeLeaf: null },
            entries: [
              {
                entryId: "u3",
                kind: "message",
                payload: { role: "user", text: "stale" },
              },
            ],
          },
          root,
        ),
        /pi_conversation_basis_mismatch/,
      );

      await appendPiConversationFact(
        created.ref,
        {
          kind: "turn_terminal",
          turnId: "turn-1",
          payload: { turnId: "turn-1", status: "completed" },
        },
        root,
      );
      const beforeFact = await readPiConversationTranscriptSnapshot(
        created.ref,
        root,
      );
      await appendPiConversationFact(
        created.ref,
        {
          kind: "title_usage",
          payload: {
            titleRevision: 1,
            inputTokens: 4,
            outputTokens: 8,
            totalTokens: 12,
            cost: 0.001,
          },
        },
        root,
      );
      await appendPiConversationFact(
        created.ref,
        { kind: "thought", turnId: "turn-1", payload: { text: "reasoning" } },
        root,
      );
      const afterFact = await readPiConversationTranscriptSnapshot(
        created.ref,
        root,
      );
      assert.equal(afterFact.revision, beforeFact.revision);
      // The CAS revision is frozen against non-context facts, while the active
      // path always ends at the last committed entry.
      assert.isNotNull(afterFact.activeLeaf);

      const factsBeforeUsage = getPiConversationReadFacts(conversationId);
      assert.equal(factsBeforeUsage?.contextRevision, 1);
      assert.isNotNull(factsBeforeUsage?.activeLeaf);
      assert.equal(factsBeforeUsage?.usageTotals.titleTokens, 12);
      assert.equal(factsBeforeUsage?.usageTotals.titleInput, 4);

      await appendPiConversationFact(
        created.ref,
        {
          kind: "model_invocation_terminal",
          turnId: "turn-1",
          payload: {
            invocationId: "invocation-1",
            usage: {
              input: 10,
              output: 5,
              cacheRead: 2,
              cacheWrite: 3,
              totalTokens: 15,
              cost: { total: 0.002 },
            },
          },
        },
        root,
      );
      const page = await readPiConversationPage(
        created.ref,
        { limit: 2 },
        root,
      );
      assert.equal(page.totalVisible, 2);
      assert.equal(page.cursor, 0);
      assert.deepEqual(
        page.entries.map((entry) => entry.kind),
        ["message", "thought"],
      );
      assert.isNull(page.nextCursor);

      const facts = getPiConversationReadFacts(conversationId);
      assert.equal(facts?.counts.user, 1);
      assert.equal(facts?.counts.thought, 1);
      assert.equal(facts?.latestTurnId, "turn-1");
      assert.equal(facts?.latestTurnStatus, "completed");
      // Model usage totals stay distinct from title tokens.
      assert.equal(facts?.usage?.totalTokens, 15);
      assert.equal(facts?.usage?.input, 10);
      assert.equal(facts?.usage?.output, 5);
      assert.equal(facts?.usage?.cost, 0.002);
      assert.equal(facts?.usageTotals.totalTokens, 15);
      assert.equal(facts?.usageTotals.input, 10);
      assert.equal(facts?.usageTotals.output, 5);
      assert.equal(facts?.usageTotals.cacheRead, 2);
      assert.equal(facts?.usageTotals.cost, 0.002);
      assert.equal(facts?.usageTotals.titleTokens, 12);
      assert.equal(facts?.usageTotals.titleCost, 0.001);

      // An unprovable effect survives restart as state_unknown.
      await appendPiConversationFact(
        created.ref,
        {
          kind: "turn_terminal",
          turnId: "turn-2",
          payload: { turnId: "turn-2", status: "failed", outcome: "unknown" },
        },
        root,
      );
      const unknown = getPiConversationReadFacts(conversationId);
      assert.equal(unknown?.latestTurnId, "turn-2");
      assert.equal(unknown?.latestTurnStatus, "state_unknown");

      updatePiConversationMetadata(conversationId, { lifecycle: "archived" });
      assert.notInclude(
        (await listPiConversations({ lifecycles: ["active"] })).map(
          (item) => item.conversationId,
        ),
        conversationId,
      );
      assert.include(
        (await listPiConversations({ lifecycles: ["archived"] })).map(
          (item) => item.conversationId,
        ),
        conversationId,
      );

      const deleting = markPiConversationDeleting(conversationId);
      assert.equal(deleting.lifecycle, "deleting");
      assert.equal(deleting.generation, 2);
      assert.throws(
        () =>
          updatePiConversationMetadata(conversationId, {
            lifecycle: "active",
          }),
        /pi_conversation_lifecycle_invalid/,
      );
      const cleaned = await cleanupPiConversation(created.ref, root);
      assert.equal(cleaned.status, "deleted");
      assert.isNull(getPiConversationMetadata(conversationId));
      assert.equal(
        getPiConversationCleanupReceipt(conversationId)?.conversationId,
        conversationId,
      );
      assert.notInclude(
        (await listPiConversations()).map((item) => item.conversationId),
        conversationId,
      );
      const again = await cleanupPiConversation(created.ref, root);
      assert.equal(again.status, "deleted");
    });
  });
}
