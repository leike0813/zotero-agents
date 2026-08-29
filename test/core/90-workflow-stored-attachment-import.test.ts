import { assert } from "chai";
import { createWorkflowStoredAttachmentImport } from "../../src/workflows/workflowStoredAttachmentImport";

function createAttachment(path = "/zotero/storage/KEY/main.pdf") {
  return {
    async getFilePathAsync() {
      return path;
    },
  } as Zotero.Item;
}

describe("Workflow Stored Attachment Import", function () {
  it("rejects unsafe companion paths before staging or attachment creation", async function () {
    let imported = false;
    const copiedTargets: string[] = [];
    const importStoredFile = createWorkflowStoredAttachmentImport({
      getStagingRoot: () => "/managed/tmp/attachment-import",
      async ensureDirectory() {},
      async copyFile(_sourcePath, targetPath) {
        copiedTargets.push(targetPath);
      },
      async removePath() {},
      async importStoredFromPath() {
        imported = true;
        return createAttachment();
      },
      async removeAttachment() {},
    });

    try {
      await importStoredFile({
        path: "/source/main.pdf",
        companionFiles: [
          { sourcePath: "/source/data.bin", relativePath: "../data.bin" },
        ],
      });
      assert.fail("expected the unsafe path to fail");
    } catch (error) {
      assert.include(String(error), "Unsafe companion file path");
    }

    assert.isFalse(imported);
    assert.deepEqual(copiedTargets, []);
  });

  it("stages all sources before mutation and copies nested companions into attachment storage", async function () {
    let imported = false;
    const copiedTargets: string[] = [];
    const importStoredFile = createWorkflowStoredAttachmentImport({
      getStagingRoot: () => "/managed/tmp/attachment-import",
      async ensureDirectory() {},
      async copyFile(_sourcePath, targetPath) {
        if (targetPath.startsWith("/managed/tmp/")) {
          assert.isFalse(imported, "all stage copies must precede mutation");
        } else {
          assert.isTrue(imported, "storage copies must follow mutation");
        }
        copiedTargets.push(targetPath);
      },
      async removePath() {},
      async importStoredFromPath() {
        imported = true;
        return createAttachment();
      },
      async removeAttachment() {},
    });

    const attachment = await importStoredFile({
      path: "/source/main.pdf",
      title: "Main",
      companionFiles: [
        {
          sourcePath: "/source/assets/image.png",
          relativePath: "assets/image.png",
        },
        {
          sourcePath: "/source/styles/main.css",
          relativePath: "styles/main.css",
        },
      ],
    });

    assert.strictEqual(
      await attachment.getFilePathAsync?.(),
      "/zotero/storage/KEY/main.pdf",
    );
    assert.include(copiedTargets, "/zotero/storage/KEY/assets/image.png");
    assert.include(copiedTargets, "/zotero/storage/KEY/styles/main.css");
  });

  it("does not create an attachment when companion source staging fails", async function () {
    let imported = false;
    let stagingCleanupAttempted = false;
    const importStoredFile = createWorkflowStoredAttachmentImport({
      getStagingRoot: () => "/managed/tmp/attachment-import",
      async ensureDirectory() {},
      async copyFile() {
        throw new Error("companion source is unreadable");
      },
      async removePath() {
        stagingCleanupAttempted = true;
      },
      async importStoredFromPath() {
        imported = true;
        return createAttachment();
      },
      async removeAttachment() {},
    });

    try {
      await importStoredFile({
        path: "/source/main.pdf",
        companionFiles: [
          { sourcePath: "/source/data.bin", relativePath: "data.bin" },
        ],
      });
      assert.fail("expected source staging to fail");
    } catch (error) {
      assert.include(String(error), "source is unreadable");
    }

    assert.isFalse(imported);
    assert.isTrue(stagingCleanupAttempted);
  });

  it("rolls back a created attachment when a storage copy fails", async function () {
    const attachment = createAttachment();
    let removedAttachment: Zotero.Item | null = null;
    let stagingCleanupAttempted = false;
    const importStoredFile = createWorkflowStoredAttachmentImport({
      getStagingRoot: () => "/managed/tmp/attachment-import",
      async ensureDirectory() {},
      async copyFile(_sourcePath, targetPath) {
        if (targetPath.startsWith("/zotero/storage/")) {
          throw new Error("storage copy failed");
        }
      },
      async removePath() {
        stagingCleanupAttempted = true;
      },
      async importStoredFromPath() {
        return attachment;
      },
      async removeAttachment(item) {
        removedAttachment = item;
      },
    });

    try {
      await importStoredFile({
        path: "/source/main.pdf",
        companionFiles: [
          { sourcePath: "/source/data.bin", relativePath: "data.bin" },
        ],
      });
      assert.fail("expected the storage copy to fail");
    } catch (error) {
      assert.include(String(error), "storage copy failed");
    }

    assert.strictEqual(removedAttachment, attachment);
    assert.isTrue(stagingCleanupAttempted);
  });

  it("rolls back when managed staging reports that cleanup did not complete", async function () {
    const attachment = createAttachment();
    let removedAttachment: Zotero.Item | null = null;
    const importStoredFile = createWorkflowStoredAttachmentImport({
      getStagingRoot: () => "/managed/tmp/attachment-import",
      async ensureDirectory() {},
      async copyFile() {},
      async removePath() {
        return false;
      },
      async importStoredFromPath() {
        return attachment;
      },
      async removeAttachment(item) {
        removedAttachment = item;
      },
    });

    try {
      await importStoredFile({
        path: "/source/main.pdf",
        companionFiles: [
          { sourcePath: "/source/data.bin", relativePath: "data.bin" },
        ],
      });
      assert.fail("expected incomplete staging cleanup to fail");
    } catch (error) {
      assert.include(String(error), "staging cleanup did not complete");
    }

    assert.strictEqual(removedAttachment, attachment);
  });
});
