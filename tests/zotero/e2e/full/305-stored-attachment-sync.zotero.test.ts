import { assert } from "chai";
import { nativeMutations } from "../../../../src/modules/zoteroHost/zoteroHostNativeMutations";
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

describe("Stored attachment sync full E2E", function () {
  this.timeout(180_000);

  systemE2ECase(
    "stored-attachment-sync-01",
    undefined,
    "imports permanent attachments and packs changed companions for native sync",
    async function () {
      const root = PathUtils.join(
        Zotero.getTempDirectory().path,
        `stored-attachment-sync-${Date.now()}`,
      );
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
        assert.isTrue(zipReader.hasEntry("images/figure.png"));
        const extractedImage = PathUtils.join(root, "zipped-figure.png");
        zipReader.extract(
          "images/figure.png",
          Zotero.File.pathToFile(extractedImage),
        );
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
});
