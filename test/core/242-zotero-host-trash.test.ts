import { assert } from "chai";
import {
  executeHostTrashMutation,
  prepareHostTrashMutation,
} from "../../src/modules/zoteroHostTrash";
import type {
  PortableItemRef,
  ItemMutationVersionDto,
} from "../../src/workflows/types";

describe("canonical Host Trash planning", function () {
  const ref = (item: Zotero.Item): PortableItemRef => ({
    libraryId: item.libraryID,
    key: item.key,
  });
  const facts = {
    resolve: (value: PortableItemRef) =>
      Zotero.Items.getByLibraryAndKey(value.libraryId, value.key),
    version: (item: Zotero.Item): ItemMutationVersionDto => ({
      revision: `${item.key}:${Boolean(item.deleted)}`,
      state: item.deleted ? "trashed" : "active",
    }),
  };
  async function family() {
    const parent = new Zotero.Item("journalArticle");
    await parent.saveTx();
    const children = [];
    for (let index = 0; index < 2; index += 1) {
      const child = new Zotero.Item("note");
      child.parentID = parent.id;
      await child.saveTx();
      children.push(child);
    }
    await Zotero.Items.trashTx([parent.id, ...children.map((item) => item.id)]);
    return { parent, children };
  }

  for (const selection of ["parent", "parent-child", "child"] as const) {
    it(`restores the native ${selection} scope`, async function () {
      const { parent, children } = await family();
      const requested =
        selection === "parent"
          ? [parent]
          : selection === "parent-child"
            ? [parent, children[0]]
            : [children[0]];
      const plan = prepareHostTrashMutation(
        {
          operation: "trash.setItemsState",
          operationId: `restore:${selection}`,
          itemRefs: requested.map(ref),
          state: "active",
        },
        facts,
      );
      assert.sameDeepMembers(
        plan.result.expandedRefs,
        (selection === "parent" ? [parent, ...children] : requested).map(ref),
      );
      assert.isTrue(parent.deleted);
      assert.isTrue(children.every((item) => item.deleted));
    });
  }

  it("rejects duplicate and oversized input before resolving targets", function () {
    let resolved = 0;
    const failClosed = {
      ...facts,
      resolve(value: PortableItemRef) {
        resolved += 1;
        return facts.resolve(value);
      },
    };
    for (const itemRefs of [
      [
        { libraryId: 1, key: "TARGET01" },
        { libraryId: 1, key: "TARGET01" },
      ],
      Array.from({ length: 101 }, (_, index) => ({
        libraryId: 1,
        key: `T${String(index).padStart(7, "0")}`,
      })),
    ]) {
      assert.throws(() =>
        prepareHostTrashMutation(
          {
            operation: "trash.setItemsState",
            operationId: "invalid",
            state: "active",
            itemRefs,
          },
          failClosed,
        ),
      );
    }
    assert.equal(resolved, 0);
  });

  for (const failure of ["none", "save", "verification"] as const) {
    it(`reports transaction ${failure} without claiming an unverified commit`, async function () {
      const { parent, children } = await family();
      const items = [parent, ...children];
      const states = new Map(items.map((item) => [item.key, true]));
      let saves = 0;
      const descriptors = items.map((item) => ({
        item,
        deleted: Object.getOwnPropertyDescriptor(item, "deleted"),
        save: Object.getOwnPropertyDescriptor(item, "save"),
      }));
      const db = Object.getOwnPropertyDescriptor(Zotero, "DB");
      for (const item of items) {
        Object.defineProperty(item, "deleted", {
          configurable: true,
          get: () => states.get(item.key),
          set: (value: boolean) => states.set(item.key, value),
        });
        Object.defineProperty(item, "save", {
          configurable: true,
          value: async () => {
            saves += 1;
            if (failure === "save" && saves === 2)
              throw new Error("native failure");
          },
        });
      }
      Object.defineProperty(Zotero, "DB", {
        configurable: true,
        value: {
          async executeTransaction(work: () => Promise<void>) {
            await work();
            if (failure === "verification") states.set(parent.key, true);
          },
        },
      });
      try {
        const plan = prepareHostTrashMutation(
          {
            operation: "trash.setItemsState",
            operationId: `transaction:${failure}`,
            itemRefs: [ref(parent)],
            state: "active",
          },
          facts,
        );
        if (failure === "none") {
          const result = await executeHostTrashMutation(plan, facts);
          assert.equal(result.outcome, "committed");
          assert.lengthOf(result.changes, 3);
          assert.isTrue(items.every((item) => !item.deleted));
          const unchanged = await executeHostTrashMutation(
            prepareHostTrashMutation(plan.input, facts),
            facts,
          );
          assert.equal(unchanged.outcome, "unchanged");
          assert.equal(saves, 3);
        } else {
          let error: unknown;
          try {
            await executeHostTrashMutation(plan, facts);
          } catch (caught) {
            error = caught;
          }
          assert.equal((error as { status: string }).status, "unknown");
          assert.equal((error as { code: string }).code, "execution_failed");
        }
      } finally {
        for (const entry of descriptors) {
          for (const key of ["deleted", "save"] as const) {
            const descriptor = entry[key];
            if (descriptor) Object.defineProperty(entry.item, key, descriptor);
            else Reflect.deleteProperty(entry.item, key);
          }
        }
        if (db) Object.defineProperty(Zotero, "DB", db);
        else Reflect.deleteProperty(Zotero, "DB");
      }
    });
  }

  it("rejects changed scope inside the transaction without saving", async function () {
    const { parent } = await family();
    const plan = prepareHostTrashMutation(
      {
        operation: "trash.setItemsState",
        operationId: "stale",
        itemRefs: [ref(parent)],
        state: "active",
      },
      facts,
    );
    const originalDb = Zotero.DB;
    let entered = 0;
    let saved = 0;
    Object.defineProperty(parent, "save", {
      configurable: true,
      value: async () => {
        saved += 1;
      },
    });
    (Zotero as any).DB = {
      async executeTransaction(work: () => Promise<void>) {
        entered += 1;
        return work();
      },
    };
    try {
      let error: unknown;
      try {
        await executeHostTrashMutation(plan, {
          ...facts,
          version: (item) => ({ ...facts.version(item), revision: "changed" }),
        });
      } catch (caught) {
        error = caught;
      }
      assert.equal((error as { code: string }).code, "conflict");
      assert.equal(entered, 1);
      assert.equal(saved, 0);
    } finally {
      (Zotero as any).DB = originalDb;
    }
  });
});
