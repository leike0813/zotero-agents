import { assert } from "chai";
import {
  appendPiOwnerEntry,
  createPiOwner,
  inspectPiOwner,
  readPiOwnerPage,
  rebuildPiOwnerProjections,
} from "../../src/modules/piOwnerPersistence";

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
}
