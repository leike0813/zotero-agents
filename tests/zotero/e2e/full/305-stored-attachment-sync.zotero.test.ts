import { assert } from "chai";
import { nativeMutations } from "../../../../src/modules/zoteroHost/zoteroHostNativeMutations";
import { ensureRuntimeDirectoryExclusive } from "../../../../src/modules/runtimePersistence";
import { systemE2ECase } from "../../systemE2ECases";

type PreparedAttachment = Parameters<
  typeof nativeMutations.attachments.importStoredAttachment
>[0]["prepared"];

function preparedAttachment(args: {
  stagingDirectory: string;
  mainPath: string;
  mainFilename: string;
  companions: Array<{ relativePath: string; path: string }>;
}): PreparedAttachment {
  return {
    snapshot: {
      identity: `e2e-${Date.now()}`,
      main: {
        relativePath: args.mainFilename,
        sizeBytes: 0,
        sha256: "0".repeat(64),
      },
      companions: [],
    },
    stagingDirectory: args.stagingDirectory,
    mainPath: args.mainPath,
    companionPaths: args.companions,
    cleanup: () =>
      IOUtils.remove(args.stagingDirectory, {
        recursive: true,
        ignoreAbsent: true,
      }),
    complete() {},
  };
}

function pathBudgetFilename(length: number, extension: string): string {
  const prefix = `e2e-${Date.now().toString(36)}`;
  assert.isAtLeast(length, prefix.length + extension.length + 1);
  return `${prefix}${"x".repeat(length - prefix.length - extension.length)}${extension}`;
}

describe("Stored attachment sync full E2E", function () {
  this.timeout(180_000);

  systemE2ECase(
    "stored-attachment-sync-01",
    undefined,
    "imports permanent attachments and packs changed companions for native sync",
    async function () {
      const root = PathUtils.join(
        Zotero.DataDirectory.dir,
        `stored-attachment-sync-${Date.now()}`,
      );
      await ensureRuntimeDirectoryExclusive(root);
      const sourceRoot = PathUtils.join(root, "source");
      const initialStage = PathUtils.join(root, "initial-stage");
      const replacementStage = PathUtils.join(root, "replacement-stage");
      const parent = new Zotero.Item("journalArticle");
      let zipReader: nsIZipReader | undefined;
      await IOUtils.makeDirectory(sourceRoot, { createAncestors: true });
      await IOUtils.makeDirectory(PathUtils.join(initialStage, "images"), {
        createAncestors: true,
      });
      await IOUtils.makeDirectory(PathUtils.join(replacementStage, "images"), {
        createAncestors: true,
      });
      try {
        await parent.saveTx();
        const sourceMain = PathUtils.join(sourceRoot, "original-title.md");
        const sourceImage = PathUtils.join(sourceRoot, "figure.png");
        const mainContent = "# Stored attachment E2E\n";
        await IOUtils.writeUTF8(sourceMain, mainContent);
        await IOUtils.writeUTF8(sourceImage, "initial image bytes");
        const initialMain = PathUtils.join(initialStage, "safe-title.md");
        const initialImage = PathUtils.join(
          initialStage,
          "images",
          "figure.png",
        );
        await IOUtils.copy(sourceMain, initialMain);
        await IOUtils.copy(sourceImage, initialImage);
        const attachment =
          await nativeMutations.attachments.importStoredAttachment({
            prepared: {
              ...preparedAttachment({
                stagingDirectory: initialStage,
                mainPath: initialMain,
                mainFilename: "safe-title.md",
                companions: [
                  { relativePath: "images/figure.png", path: initialImage },
                ],
              }),
              defaultMetadata: {
                title: "original: title.md",
                contentType: "text/markdown",
              },
            },
            parent,
            libraryId: parent.libraryID,
            admit: (work) => Promise.resolve(work()),
          });
        const storedMain = await attachment.getFilePathAsync();
        assert.isOk(storedMain);
        await IOUtils.remove(sourceRoot, { recursive: true });
        assert.equal(await IOUtils.readUTF8(storedMain), mainContent);
        assert.equal(
          await IOUtils.readUTF8(
            PathUtils.join(
              PathUtils.parent(storedMain),
              "images",
              "figure.png",
            ),
          ),
          "initial image bytes",
        );

        const replacementMain = PathUtils.join(
          replacementStage,
          "safe-title.md",
        );
        const replacementImage = PathUtils.join(
          replacementStage,
          "images",
          "figure.png",
        );
        const syncedTime = await attachment.attachmentModificationTime;
        const syncedHash = await attachment.attachmentHash;
        attachment.attachmentSyncedModificationTime = syncedTime;
        attachment.attachmentSyncedHash = syncedHash;
        attachment.attachmentSyncState = "in_sync";
        await attachment.saveTx();
        await IOUtils.writeUTF8(replacementMain, mainContent);
        await IOUtils.writeUTF8(replacementImage, "replacement image bytes");
        await nativeMutations.attachments.replaceStoredAttachment({
          operationId: `stored-attachment-sync-${Date.now()}`,
          prepared: preparedAttachment({
            stagingDirectory: replacementStage,
            mainPath: replacementMain,
            mainFilename: "safe-title.md",
            companions: [
              { relativePath: "images/figure.png", path: replacementImage },
            ],
          }),
          attachment,
          admit: (work) => Promise.resolve(work()),
        });
        assert.equal(
          attachment.attachmentSyncState,
          Zotero.Sync.Storage.Local.SYNC_STATE_TO_UPLOAD,
        );
        assert.equal(attachment.attachmentSyncedHash, syncedHash);
        assert.equal(attachment.attachmentSyncedModificationTime, syncedTime);
        const storage = Zotero.Sync.Storage as any;
        const webdav = new storage.Mode.WebDAV({});
        webdav._init = async () => {};
        webdav._getStorageFileMetadata = async () => ({
          mtime: syncedTime,
          md5: syncedHash,
        });
        const originalCreateUploadFile = storage.Utilities.createUploadFile;
        let uploadAdmitted = false;
        storage.Utilities.createUploadFile = async () => {
          uploadAdmitted = true;
          return false;
        };
        try {
          await webdav.uploadFile({
            name: `${attachment.libraryID}/${attachment.key}`,
            isRunning: () => true,
          });
          assert.isTrue(
            uploadAdmitted,
            "native WebDAV must upload changed companions even when the main hash is unchanged",
          );
        } finally {
          storage.Utilities.createUploadFile = originalCreateUploadFile;
        }

        const zipPath = PathUtils.join(root, "attachment.zip");
        assert.isTrue(
          await Zotero.File.zipDirectory(PathUtils.parent(storedMain), zipPath),
        );
        zipReader = Components.classes[
          "@mozilla.org/libjar/zip-reader;1"
        ].createInstance(Components.interfaces.nsIZipReader);
        zipReader.open(Zotero.File.pathToFile(zipPath));
        const entries = zipReader.findEntries(null);
        let imageEntry: string | undefined;
        while (entries.hasMore()) {
          const name = entries.getNext();
          if (name.replace(/\\/g, "/") === "images/figure.png")
            imageEntry = name;
        }
        assert.isString(imageEntry);
        const extractedImage = PathUtils.join(root, "zipped-figure.png");
        zipReader.extract(imageEntry!, Zotero.File.pathToFile(extractedImage));
        assert.equal(
          await IOUtils.readUTF8(extractedImage),
          "replacement image bytes",
        );
      } finally {
        zipReader?.close();
        if (parent.id && !parent.deleted)
          await Zotero.Items.trashTx([parent.id]);
        await IOUtils.remove(root, { recursive: true, ignoreAbsent: true });
      }
    },
  );

  systemE2ECase(
    "stored-attachment-path-budget-02",
    undefined,
    "imports near-limit Windows attachments and rejects an over-budget destination before import",
    async function () {
      if (!Zotero.isWin) this.skip();
      const root = PathUtils.join(
        PathUtils.tempDir,
        `zp-${Date.now().toString(36)}`,
      );
      await ensureRuntimeDirectoryExclusive(root);
      const sourceRoot = PathUtils.join(root, "s");
      const successStage = PathUtils.join(root, "n");
      const rejectedStage = PathUtils.join(root, "r");
      const parent = new Zotero.Item("journalArticle");
      try {
        await IOUtils.makeDirectory(sourceRoot);
        await IOUtils.makeDirectory(successStage);
        await IOUtils.makeDirectory(rejectedStage);
        await parent.saveTx();
        const plannedStorage =
          Zotero.Attachments.getStorageDirectoryByLibraryAndKey(
            parent.libraryID,
            "AAAAAAAA",
          ).path;
        const filenameLength = 259 - plannedStorage.length - 1;
        assert.isAtMost(filenameLength, 255);
        assert.isAtMost(
          PathUtils.join(plannedStorage, ".zotero-ft-unprocessed.tmp").length,
          259,
        );

        const content = "near-limit stored attachment\n";
        const source = PathUtils.join(sourceRoot, "source.txt");
        await IOUtils.writeUTF8(source, content);
        const mainFilename = pathBudgetFilename(filenameLength, ".txt");
        const mainPath = PathUtils.join(successStage, mainFilename);
        await IOUtils.copy(source, mainPath);
        assert.equal(PathUtils.join(plannedStorage, mainFilename).length, 259);
        const attachment =
          await nativeMutations.attachments.importStoredAttachment({
            prepared: preparedAttachment({
              stagingDirectory: successStage,
              mainPath,
              mainFilename,
              companions: [],
            }),
            parent,
            libraryId: parent.libraryID,
            admit: (work) => Promise.resolve(work()),
          });
        const storedPath = await attachment.getFilePathAsync();
        assert.isString(storedPath);
        assert.isAtLeast(storedPath!.length, 240);
        assert.isAtMost(storedPath!.length, 259);
        assert.equal(await IOUtils.readUTF8(storedPath!), content);
        assert.equal(await IOUtils.readUTF8(source), content);
        assert.isFalse(await IOUtils.exists(successStage));

        const rejectedFilename = pathBudgetFilename(filenameLength + 1, ".txt");
        const rejectedMain = PathUtils.join(rejectedStage, "source.txt");
        await IOUtils.copy(source, rejectedMain);
        const attachmentIds = parent.getAttachments();
        let rejected: unknown;
        try {
          await nativeMutations.attachments.importStoredAttachment({
            prepared: preparedAttachment({
              stagingDirectory: rejectedStage,
              mainPath: rejectedMain,
              mainFilename: rejectedFilename,
              companions: [],
            }),
            parent,
            libraryId: parent.libraryID,
            admit: (work) => Promise.resolve(work()),
          });
        } catch (error) {
          rejected = error;
        }
        assert.isOk(rejected);
        assert.equal(
          nativeMutations.attachmentFailureStatus(rejected),
          "failed",
        );
        assert.equal((rejected as any).code, "resource_limited");
        assert.equal((rejected as any).details.resource, "path_length");
        assert.equal((rejected as any).details.limit, 259);
        assert.equal((rejected as any).details.observed, 260);
        assert.deepEqual(parent.getAttachments(), attachmentIds);
        assert.equal(await IOUtils.readUTF8(source), content);
        assert.isFalse(await IOUtils.exists(rejectedStage));
      } finally {
        if (parent.id && !parent.deleted)
          await Zotero.Items.trashTx([parent.id]);
        await IOUtils.remove(root, { recursive: true, ignoreAbsent: true });
      }
    },
    "platform_unsupported",
  );
});
