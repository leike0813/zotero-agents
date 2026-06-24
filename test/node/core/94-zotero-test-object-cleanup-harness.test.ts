import { assert } from "chai";
import { handlers } from "../../../src/handlers";
import { setBackgroundRuntimeCleanupDepsForTests } from "../../../src/modules/testRuntimeCleanup";
import { runZoteroSharedTeardownForTests } from "../../zotero/diagnosticBridge";
import {
  cleanupTrackedZoteroTestObjects,
  getTrackedZoteroTestObjectIdsForTests,
  installZoteroTestObjectCleanupHarness,
  registerZoteroTestObjectForCleanup,
  resetTrackedZoteroTestObjectsForTests,
} from "../../zotero/objectCleanupHarness";

async function createTempFile(name: string, content: string) {
  const file = Zotero.getTempDirectory();
  file.append(name);
  await Zotero.File.putContentsAsync(file, content);
  return file;
}

describe("zotero test real object cleanup harness", function () {
  let previousIOUtils: unknown;
  let hadIOUtils = false;

  beforeEach(function () {
    installZoteroTestObjectCleanupHarness();
    hadIOUtils = "IOUtils" in globalThis;
    previousIOUtils = (globalThis as { IOUtils?: unknown }).IOUtils;
    (globalThis as { IOUtils?: unknown }).IOUtils = {};
    delete process.env.ZOTERO_KEEP_TEST_OBJECTS;
    resetTrackedZoteroTestObjectsForTests();
  });

  afterEach(async function () {
    delete process.env.ZOTERO_KEEP_TEST_OBJECTS;
    try {
      await cleanupTrackedZoteroTestObjects();
    } finally {
      resetTrackedZoteroTestObjectsForTests();
      setBackgroundRuntimeCleanupDepsForTests();
      if (hadIOUtils) {
        (globalThis as { IOUtils?: unknown }).IOUtils = previousIOUtils;
      } else {
        delete (globalThis as { IOUtils?: unknown }).IOUtils;
      }
    }
  });

  it("tracks handlers-created real Zotero items and collections", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Cleanup Harness Parent" },
    });
    const note = await handlers.parent.addNote(parent, {
      content: "<div><p>cleanup note</p></div>",
    });
    const file = await createTempFile("cleanup-harness.txt", "attachment");
    const attachment = await handlers.attachment.create({ file });
    const collection = await handlers.collection.create({
      name: "Cleanup Harness Collection",
    });

    assert.deepEqual(getTrackedZoteroTestObjectIdsForTests(), {
      itemIds: [attachment.id, note.id, parent.id].sort(
        (left, right) => left - right,
      ),
      collectionIds: [collection.id],
    });

    await cleanupTrackedZoteroTestObjects();

    assert.isUndefined(Zotero.Items.get(parent.id));
    assert.isUndefined(Zotero.Items.get(note.id));
    assert.isUndefined(Zotero.Items.get(attachment.id));
    assert.isUndefined(Zotero.Collections.get(collection.id));
    assert.deepEqual(getTrackedZoteroTestObjectIdsForTests(), {
      itemIds: [],
      collectionIds: [],
    });
  });

  it("untracks items and collections when handlers remove or delete them explicitly", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Cleanup Harness Remove Parent" },
    });
    const collection = await handlers.collection.create({
      name: "Cleanup Harness Remove Collection",
    });
    let parentEraseCount = 0;
    let collectionEraseCount = 0;
    const originalParentErase = parent.eraseTx.bind(parent);
    const originalCollectionErase = collection.eraseTx.bind(collection);
    parent.eraseTx = async () => {
      parentEraseCount += 1;
      return originalParentErase();
    };
    collection.eraseTx = async () => {
      collectionEraseCount += 1;
      return originalCollectionErase();
    };

    await handlers.item.remove(parent);
    await handlers.collection.delete(collection);
    await cleanupTrackedZoteroTestObjects();

    assert.equal(parentEraseCount, 1);
    assert.equal(collectionEraseCount, 1);
    assert.deepEqual(getTrackedZoteroTestObjectIdsForTests(), {
      itemIds: [],
      collectionIds: [],
    });
  });

  it("deletes tracked objects in note -> attachment -> child -> parent -> collection order", async function () {
    const order: string[] = [];
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Cleanup Order Parent" },
    });
    const note = await handlers.parent.addNote(parent, {
      content: "<div><p>cleanup order note</p></div>",
    });
    const file = await createTempFile("cleanup-order.txt", "attachment");
    const attachment = await handlers.parent.addAttachment(parent, { file });
    const child = new Zotero.Item("bookSection");
    child.setField("title", "Cleanup Order Child");
    child.parentID = parent.id;
    child.parentItemID = parent.id;
    await child.saveTx();
    registerZoteroTestObjectForCleanup(child);
    const collection = await handlers.collection.create({
      name: "Cleanup Order Collection",
    });

    const patchErase = <T extends { eraseTx: () => Promise<unknown> }>(
      label: string,
      target: T,
    ) => {
      const original = target.eraseTx.bind(target);
      target.eraseTx = async () => {
        order.push(label);
        return original();
      };
    };

    patchErase("note", note);
    patchErase("attachment", attachment);
    patchErase("child", child);
    patchErase("parent", parent);
    patchErase("collection", collection);

    await cleanupTrackedZoteroTestObjects();

    assert.deepEqual(order, [
      "note",
      "attachment",
      "child",
      "parent",
      "collection",
    ]);
  });

  it("respects ZOTERO_KEEP_TEST_OBJECTS and keeps real objects for inspection", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Keep Cleanup Harness Parent" },
    });
    process.env.ZOTERO_KEEP_TEST_OBJECTS = "1";

    await cleanupTrackedZoteroTestObjects();

    assert.isOk(Zotero.Items.get(parent.id));
  });

  it("runs background cleanup before real-object cleanup in shared teardown", async function () {
    const order: string[] = [];
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Teardown Order Parent" },
    });
    const originalErase = parent.eraseTx.bind(parent);
    parent.eraseTx = async () => {
      order.push("object-cleanup");
      return originalErase();
    };

    setBackgroundRuntimeCleanupDepsForTests({
      resetSkillRunnerRunDialogForTests: async () => {
        order.push("background-cleanup");
      },
      resetTaskManagerDialogRuntimeForTests: async () => undefined,
      resetSkillRunnerTaskReconcilerForTests: async () => undefined,
      resetSkillRunnerSessionSyncForTests: async () => undefined,
      stopSkillRunnerModelCacheAutoRefresh: () => undefined,
      resetManagedLocalRuntimeLoopsForTests: () => undefined,
      resetManagedLocalRuntimeStateChangeListenersForTests: () => undefined,
      resetLocalRuntimeToastStateForTests: () => undefined,
      resetSkillRunnerBackendHealthRegistryForTests: () => undefined,
      resetPluginStateStoreForTests: () => undefined,
      setSkillRunnerBackendReconcileFailureToastEmitterForTests: () =>
        undefined,
      setSkillRunnerTaskLifecycleToastEmitterForTests: () => undefined,
      resetWorkflowTasks: () => undefined,
      clearRuntimeLogs: () => undefined,
    });

    await runZoteroSharedTeardownForTests();

    assert.deepEqual(order, ["background-cleanup", "object-cleanup"]);
  });
});
