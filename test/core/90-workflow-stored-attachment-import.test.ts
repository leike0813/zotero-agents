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
  it("validates and stages the main file before creating a Zotero attachment", async function () {
    const events: string[] = [];
    const importStoredFile = createWorkflowStoredAttachmentImport({
      getStagingRoot: () => "/managed/tmp/attachment-import",
      async validateSource(path) {
        events.push(`validate:${path}`);
      },
      async ensureDirectory() {},
      async copyFile(sourcePath, targetPath) {
        events.push(`copy:${sourcePath}->${targetPath}`);
      },
      async removePath() {},
      async importStoredFromPath(args) {
        events.push(`import:${args.path}`);
        assert.match(args.path, /^\/managed\/tmp\/attachment-import\//);
        return createAttachment();
      },
      async removeAttachment() {},
    });

    await importStoredFile({ path: "/source/main.pdf" });

    assert.deepEqual(events.slice(0, 2), [
      "validate:/source/main.pdf",
      "copy:/source/main.pdf->" + events[1].split("->")[1],
    ]);
    assert.match(events[2], /^import:\/managed\/tmp\/attachment-import\//);
  });

  it("rejects normalized and case-folded target collisions before staging", async function () {
    let imported = false;
    let copied = false;
    const importStoredFile = createWorkflowStoredAttachmentImport({
      getStagingRoot: () => "/managed/tmp/attachment-import",
      async ensureDirectory() {},
      async copyFile() {
        copied = true;
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
          { sourcePath: "/source/A.bin", relativePath: "assets/Data.bin" },
          { sourcePath: "/source/B.bin", relativePath: "assets/data.bin" },
        ],
      });
      assert.fail("expected a normalized target collision");
    } catch (error) {
      assert.include(String(error), "collide");
    }

    assert.isFalse(copied);
    assert.isFalse(imported);
  });

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

  it("preserves the publish failure while attaching rollback and cleanup failures as secondary evidence", async function () {
    const attachment = createAttachment();
    const importStoredFile = createWorkflowStoredAttachmentImport({
      getStagingRoot: () => "/managed/tmp/attachment-import",
      async ensureDirectory() {},
      async copyFile(_sourcePath, targetPath) {
        if (targetPath.startsWith("/zotero/storage/")) {
          throw new Error("primary publish failure");
        }
      },
      async removePath() {
        throw new Error("staging cleanup failure");
      },
      async importStoredFromPath() {
        return attachment;
      },
      async removeAttachment() {
        throw new Error("attachment rollback failure");
      },
    });

    try {
      await importStoredFile({
        path: "/source/main.pdf",
        companionFiles: [
          { sourcePath: "/source/data.bin", relativePath: "data.bin" },
        ],
      });
      assert.fail("expected publish failure");
    } catch (error) {
      assert.include(String(error), "primary publish failure");
      const cleanupErrors = (error as Error & { cleanupErrors?: unknown[] })
        .cleanupErrors;
      assert.lengthOf(cleanupErrors || [], 2);
      assert.include(String(cleanupErrors?.[0]), "rollback failure");
      assert.include(String(cleanupErrors?.[1]), "cleanup failure");
    }
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
