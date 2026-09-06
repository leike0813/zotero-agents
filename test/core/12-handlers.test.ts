import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { nativeMutations } from "../../src/modules/zoteroHostNativeMutations";
import { brokerMutationPrimitives } from "../../src/modules/zoteroHostBrokerPrimitives";
import { createZoteroHostCapabilityBroker } from "../../src/modules/zoteroHostCapabilityBroker";
import type { ResolvedPreparedStoredAttachment } from "../../src/modules/zoteroHostPreparedFiles";
import { sha256Hex } from "../../src/utils/sha256";

function resolvedPrepared(args: {
  stagingDirectory: string;
  mainPath: string;
  mainFilename?: string;
  companions?: Array<{ relativePath: string; path: string }>;
  cleanup: () => Promise<void>;
  complete?: () => void;
}): ResolvedPreparedStoredAttachment {
  return {
    snapshot: {
      identity: "prepared",
      main: {
        relativePath: args.mainFilename || "main.pdf",
        sizeBytes: 4,
        sha256: "a".repeat(64),
      },
      companions: [],
    },
    stagingDirectory: args.stagingDirectory,
    mainPath: args.mainPath,
    companionPaths: args.companions || [],
    cleanup: args.cleanup,
    complete: args.complete || (() => {}),
  };
}

async function withTemporaryDirectory<T>(work: (root: string) => Promise<T>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "zotero-native-"));
  try {
    return await work(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function installZoteroMock(
  attachments: Record<string, unknown>,
  http?: Record<string, unknown>,
) {
  const runtime = globalThis as { Zotero?: unknown };
  const original = Object.getOwnPropertyDescriptor(runtime, "Zotero");
  Object.defineProperty(runtime, "Zotero", {
    configurable: true,
    writable: true,
    value: {
      File: { pathToFile: (filePath: string) => ({ path: filePath }) },
      Attachments: attachments,
      HTTP: http,
    },
  });
  return () => {
    if (original) {
      Object.defineProperty(runtime, "Zotero", original);
    } else {
      delete runtime.Zotero;
    }
  };
}

describe("Zotero host native attachment mutations", function () {
  it("creates a linked URL in the requested top-level library", async function () {
    const calls: Array<Record<string, unknown>> = [];
    const restore = installZoteroMock({
      linkFromURL: async (input: Record<string, unknown>) => {
        calls.push(input);
        return {};
      },
    });
    try {
      await brokerMutationPrimitives.attachment.createFromUrl({
        parent: null,
        libraryID: 42,
        url: "https://example.org/paper",
      });
      assert.lengthOf(calls, 1);
      assert.equal(calls[0].libraryID, 42);
      assert.notProperty(calls[0], "parentItemID");
    } finally {
      restore();
    }
  });

  it("downloads stored URLs into managed staging without importFromURL", async function () {
    const downloads: Array<{
      url: string;
      path: string;
      options: unknown;
    }> = [];
    let importedFromUrl = 0;
    const restore = installZoteroMock(
      {
        importFromURL: async () => {
          importedFromUrl += 1;
          throw new Error("importFromURL must not be used");
        },
      },
      {
        download: async (url: string, filePath: string, options: unknown) => {
          downloads.push({ url, path: filePath, options });
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, "downloaded");
        },
      },
    );
    try {
      const downloaded =
        await nativeMutations.attachments.downloadStoredUrlToManagedStaging({
          url: "https://example.org/article.html",
          referrer: "https://example.org/landing",
          fallbackFilename: "download.html",
        });
      assert.lengthOf(downloads, 1);
      assert.equal(downloads[0].url, "https://example.org/article.html");
      assert.include(downloads[0].path, "stored-url-download");
      assert.deepInclude(downloads[0].options as object, {
        headers: { Referer: "https://example.org/landing" },
      });
      assert.equal(importedFromUrl, 0);
      assert.isTrue(await pathExists(downloaded.path));
      await downloaded.cleanup();
      assert.isFalse(await pathExists(path.dirname(downloaded.path)));
    } finally {
      restore();
    }
  });

  it("uses the explicitly returned URL attachment without inspecting parent membership", async function () {
    let membershipReads = 0;
    let unrelatedErases = 0;
    const returnedAttachment = {} as Zotero.Item;
    const unrelatedAttachment = {
      async eraseTx() {
        unrelatedErases += 1;
      },
    };
    const restore = installZoteroMock({
      linkFromURL: async () => returnedAttachment,
    });
    const parent = {
      id: 17,
      getAttachments() {
        membershipReads += 1;
        throw new Error("parent membership must not be inspected");
      },
      unrelatedAttachment,
    } as unknown as Zotero.Item;
    try {
      const attachment =
        await nativeMutations.attachments.createLinkedUrlAttachment({
          parent,
          libraryId: 1,
          url: "https://example.org/landing",
          admit: (work) => Promise.resolve(work()),
        });
      assert.strictEqual(attachment, returnedAttachment);
      assert.equal(membershipReads, 0);
      assert.equal(unrelatedErases, 0);
    } finally {
      restore();
    }
  });

  it("imports generic stored URLs through managed download while preserving HTML metadata", async function () {
    const runtime = Zotero as unknown as {
      HTTP: {
        download: (
          url: string,
          filePath: string,
          options?: unknown,
        ) => Promise<unknown>;
      };
      Attachments: { importFromURL?: () => Promise<unknown> };
    };
    const originalDownload = runtime.HTTP.download;
    const originalImportFromUrl = runtime.Attachments.importFromURL;
    let downloads = 0;
    let importFromUrlCalls = 0;
    runtime.HTTP.download = async (...args) => {
      downloads += 1;
      return originalDownload(...args);
    };
    runtime.Attachments.importFromURL = async () => {
      importFromUrlCalls += 1;
      throw new Error("importFromURL must not be used");
    };
    try {
      const result = await createZoteroHostCapabilityBroker().mutations.execute(
        {
          operation: "attachments.create",
          operationId: `stored-url-html-${Date.now()}`,
          placement: { kind: "top_level", libraryId: 1 },
          source: {
            kind: "stored_url",
            url: "https://example.org/article.html",
          },
          metadata: {
            title: "Article HTML",
            contentType: "text/html",
            charset: "utf-8",
          },
        },
        { ownerId: "stored-url-native-path" },
      );
      assert.strictEqual(result.outcome, "committed");
      assert.equal(downloads, 1);
      assert.equal(importFromUrlCalls, 0);
      if (result.outcome !== "committed") {
        assert.fail("expected stored URL import to commit");
      }
      assert.equal(result.result.attachment.contentType, "text/html");
      assert.equal(
        result.result.attachment.url,
        "https://example.org/article.html",
      );
    } finally {
      runtime.HTTP.download = originalDownload;
      runtime.Attachments.importFromURL = originalImportFromUrl;
    }
  });

  it("does not persist a new item when setting its fields fails", async function () {
    const original = Object.getOwnPropertyDescriptor(globalThis, "Zotero");
    let persisted = false;
    Object.defineProperty(globalThis, "Zotero", {
      configurable: true,
      value: {
        Item: class {
          setField() {
            throw new TypeError("Invalid field");
          }
          async saveTx() {
            persisted = true;
          }
        },
      },
    });
    try {
      const failure = await brokerMutationPrimitives.item
        .create({
          itemType: "journalArticle",
          libraryID: 1,
          fields: { title: "Example" },
        })
        .then(
          () => null,
          (error: unknown) => error,
        );
      assert.instanceOf(failure, TypeError);
      assert.isFalse(persisted);
    } finally {
      if (original) Object.defineProperty(globalThis, "Zotero", original);
      else Reflect.deleteProperty(globalThis, "Zotero");
    }
  });

  it("erases an attachment through the Broker admission callback", async function () {
    const events: string[] = [];
    const attachment = {
      async eraseTx() {
        events.push("erase");
      },
    } as unknown as Zotero.Item;

    await nativeMutations.attachments.eraseAttachment({
      attachment,
      admit: async (work) => {
        events.push("admit");
        return work();
      },
    });

    assert.deepEqual(events, ["admit", "erase"]);
  });

  it("compares stored content to a canonical manifest through one read admission", async function () {
    await withTemporaryDirectory(async (root) => {
      const storage = path.join(root, "storage");
      const mainPath = path.join(storage, "paper.md");
      const companionPath = path.join(storage, "assets", "figure.png");
      await fs.mkdir(path.dirname(companionPath), { recursive: true });
      await fs.writeFile(mainPath, "paper");
      await fs.writeFile(companionPath, "figure");
      const main = new TextEncoder().encode("paper");
      const companion = new TextEncoder().encode("figure");
      const mainSha256 = await sha256Hex(main);
      const companionSha256 = await sha256Hex(companion);
      assert.isString(mainSha256);
      assert.isString(companionSha256);
      const phases: string[] = [];
      const attachment = {
        attachmentLinkMode: 0,
        async getFilePathAsync() {
          return mainPath;
        },
      } as unknown as Zotero.Item;
      const matches =
        await nativeMutations.attachments.matchesStoredContentManifest({
          attachment,
          content: {
            schema: "zotero-agents.attachment-content.v1",
            identity: "content-identity",
            main: {
              relativePath: "paper.md",
              sizeBytes: main.byteLength,
              sha256: `sha256:${mainSha256}`,
            },
            companions: [
              {
                relativePath: "assets/figure.png",
                sizeBytes: companion.byteLength,
                sha256: `sha256:${companionSha256}`,
              },
            ],
          },
          admit: async (work, phase) => {
            phases.push(phase || "effect");
            return work();
          },
        });

      assert.isTrue(matches);
      assert.deepEqual(phases, ["read"]);

      const changed =
        await nativeMutations.attachments.matchesStoredContentManifest({
          attachment,
          content: {
            schema: "zotero-agents.attachment-content.v1",
            identity: "content-identity",
            main: {
              relativePath: "paper.md",
              sizeBytes: main.byteLength + 1,
              sha256: `sha256:${mainSha256}`,
            },
            companions: [],
          },
          admit: async (work) => work(),
        });
      assert.isFalse(changed);
    });
  });

  it("imports into the requested library and removes the new attachment when a companion copy fails", async function () {
    await withTemporaryDirectory(async (root) => {
      const stage = path.join(root, "stage");
      const storage = path.join(root, "storage", "KEY");
      await fs.mkdir(stage, { recursive: true });
      await fs.mkdir(storage, { recursive: true });
      const mainPath = path.join(stage, "main.pdf");
      await fs.writeFile(mainPath, "main");
      let erased = 0;
      const calls: Array<Record<string, unknown>> = [];
      const restoreZotero = installZoteroMock({
        async importFromFile(input: Record<string, unknown>) {
          calls.push(input);
          return {
            async getFilePathAsync() {
              return path.join(storage, "main.pdf");
            },
            setField() {},
            async saveTx() {},
            async eraseTx() {
              erased += 1;
            },
          };
        },
      });
      try {
        await nativeMutations.attachments.importStoredAttachment({
          prepared: resolvedPrepared({
            stagingDirectory: stage,
            mainPath,
            companions: [
              {
                relativePath: "assets/missing.bin",
                path: path.join(stage, "missing.bin"),
              },
            ],
            cleanup: () => fs.rm(stage, { recursive: true, force: true }),
          }),
          parent: null,
          libraryId: 42,
          admit: (work) => Promise.resolve(work()),
        });
        assert.fail("expected companion copy failure");
      } catch (error) {
        assert.equal(nativeMutations.attachmentFailureStatus(error), "failed");
      } finally {
        restoreZotero();
      }

      assert.lengthOf(calls, 1);
      assert.equal(calls[0].libraryID, 42);
      assert.equal(erased, 1);
      assert.isFalse(await pathExists(stage));
    });
  });

  it("classifies a dispatched import without a returned attachment as unknown", async function () {
    await withTemporaryDirectory(async (root) => {
      const stage = path.join(root, "stage");
      const mainPath = path.join(stage, "main.pdf");
      await fs.mkdir(stage, { recursive: true });
      await fs.writeFile(mainPath, "main");
      let importCalls = 0;
      let cleanupCalls = 0;
      let parentAttachmentReads = 0;
      const restoreZotero = installZoteroMock({
        async importFromFile() {
          importCalls += 1;
          throw new Error("Zotero import transaction rejected");
        },
      });
      const parent = {
        id: 17,
        getAttachments() {
          parentAttachmentReads += 1;
          throw new Error("parent attachments must not be inspected");
        },
      } as unknown as Zotero.Item;

      try {
        await nativeMutations.attachments.importStoredAttachment({
          prepared: resolvedPrepared({
            stagingDirectory: stage,
            mainPath,
            cleanup: async () => {
              cleanupCalls += 1;
              await fs.rm(stage, { recursive: true, force: true });
            },
          }),
          parent,
          libraryId: 42,
          admit: (work) => Promise.resolve(work()),
        });
        assert.fail("expected import rejection");
      } catch (error) {
        assert.equal(nativeMutations.attachmentFailureStatus(error), "unknown");
      } finally {
        restoreZotero();
      }

      assert.equal(importCalls, 1);
      assert.equal(parentAttachmentReads, 0);
      assert.equal(cleanupCalls, 1);
      assert.isFalse(await pathExists(stage));
    });
  });

  it("keeps an import failure before dispatch classified as failed", async function () {
    await withTemporaryDirectory(async (root) => {
      const stage = path.join(root, "stage");
      const mainPath = path.join(stage, "main.pdf");
      await fs.mkdir(stage, { recursive: true });
      await fs.writeFile(mainPath, "main");
      let cleanupCalls = 0;
      const restoreZotero = installZoteroMock({});
      try {
        await nativeMutations.attachments.importStoredAttachment({
          prepared: resolvedPrepared({
            stagingDirectory: stage,
            mainPath,
            cleanup: async () => {
              cleanupCalls += 1;
              await fs.rm(stage, { recursive: true, force: true });
            },
          }),
          parent: null,
          libraryId: 42,
          admit: (work) => Promise.resolve(work()),
        });
        assert.fail("expected unavailable native import");
      } catch (error) {
        assert.equal(nativeMutations.attachmentFailureStatus(error), "failed");
      } finally {
        restoreZotero();
      }
      assert.equal(cleanupCalls, 1);
      assert.isFalse(await pathExists(stage));
    });
  });

  it("runs the import refresh callback in the effect admission slice", async function () {
    await withTemporaryDirectory(async (root) => {
      const stage = path.join(root, "stage");
      const storage = path.join(root, "storage", "KEY");
      const mainPath = path.join(stage, "main.pdf");
      await fs.mkdir(stage, { recursive: true });
      await fs.mkdir(storage, { recursive: true });
      await fs.writeFile(mainPath, "main");
      const phases: Array<"read" | "effect" | undefined> = [];
      let activePhase: "read" | "effect" | undefined;
      let refreshPhase: "read" | "effect" | undefined;
      const restoreZotero = installZoteroMock({
        async importFromFile() {
          return {
            async getFilePathAsync() {
              return path.join(storage, "main.pdf");
            },
            setField() {},
            async saveTx() {},
            async eraseTx() {},
          };
        },
      });
      try {
        await nativeMutations.attachments.importStoredAttachment({
          prepared: resolvedPrepared({
            stagingDirectory: stage,
            mainPath,
            cleanup: () => fs.rm(stage, { recursive: true, force: true }),
          }),
          parent: null,
          libraryId: 42,
          admit: async (work, phase) => {
            phases.push(phase);
            activePhase = phase;
            try {
              return await work();
            } finally {
              activePhase = undefined;
            }
          },
          afterImport: () => {
            refreshPhase = activePhase;
          },
        });
      } finally {
        restoreZotero();
      }

      assert.equal(refreshPhase, "effect");
      assert.deepEqual(phases, ["effect", "read", "effect"]);
    });
  });

  it("does not repeat prepared cleanup after an import cleanup failure", async function () {
    await withTemporaryDirectory(async (root) => {
      const stage = path.join(root, "stage");
      const storage = path.join(root, "storage", "KEY");
      const mainPath = path.join(stage, "main.pdf");
      await fs.mkdir(stage, { recursive: true });
      await fs.mkdir(storage, { recursive: true });
      await fs.writeFile(mainPath, "main");
      let cleanupCalls = 0;
      let erased = 0;
      const restoreZotero = installZoteroMock({
        async importFromFile() {
          return {
            async getFilePathAsync() {
              return path.join(storage, "main.pdf");
            },
            setField() {},
            async saveTx() {},
            async eraseTx() {
              erased += 1;
            },
          };
        },
      });
      try {
        await nativeMutations.attachments.importStoredAttachment({
          prepared: resolvedPrepared({
            stagingDirectory: stage,
            mainPath,
            cleanup: async () => {
              cleanupCalls += 1;
              throw new Error("staging cleanup failed");
            },
          }),
          parent: null,
          libraryId: 42,
          admit: (work) => Promise.resolve(work()),
        });
        assert.fail("expected staging cleanup failure");
      } catch (error) {
        assert.match(String(error), /staging cleanup failed/);
        assert.equal(
          nativeMutations.attachmentFailureStatus(error),
          "repair_required",
        );
      } finally {
        restoreZotero();
      }

      assert.equal(cleanupCalls, 1);
      assert.equal(erased, 1);
    });
  });

  it("rejects linked-file replacement before moving staged content", async function () {
    await withTemporaryDirectory(async (root) => {
      const stage = path.join(root, "stage");
      await fs.mkdir(stage);
      let cleaned = 0;
      try {
        await nativeMutations.attachments.replaceStoredAttachment({
          prepared: resolvedPrepared({
            stagingDirectory: stage,
            mainPath: path.join(stage, "new.pdf"),
            cleanup: async () => {
              cleaned += 1;
            },
          }),
          attachment: {
            attachmentLinkMode: 2,
            async getFilePathAsync() {
              return path.join(root, "linked.pdf");
            },
          } as unknown as Zotero.Item,
          admit: (work) => Promise.resolve(work()),
        });
        assert.fail("expected linked attachment rejection");
      } catch (error) {
        assert.equal(nativeMutations.attachmentFailureStatus(error), "failed");
      }
      assert.equal(cleaned, 1);
      assert.isTrue(await fs.stat(stage).then(() => true));
    });
  });

  it("updates the stored filename after an atomic replacement", async function () {
    await withTemporaryDirectory(async (root) => {
      const storage = path.join(root, "storage");
      const stage = path.join(root, "stage");
      await fs.mkdir(storage);
      await fs.mkdir(stage);
      await fs.writeFile(path.join(storage, "old.pdf"), "old");
      await fs.writeFile(path.join(stage, "new.pdf"), "new");
      let completed = 0;
      let attachmentPath = "storage:old.pdf";
      const attachment = {
        attachmentLinkMode: 0,
        attachmentContentType: "application/pdf",
        parentItemID: 17,
        get attachmentFilename() {
          return attachmentPath.replace(/^storage:/, "");
        },
        set attachmentFilename(value: string) {
          attachmentPath = `storage:${value}`;
        },
        setFilePath() {
          throw new Error("setFilePath is not a production stored-file API");
        },
        async getFilePathAsync() {
          return path.join(storage, "old.pdf");
        },
        async saveTx() {},
      } as unknown as Zotero.Item & {
        attachmentFilename: string;
        attachmentContentType: string;
        parentItemID: number;
      };

      await nativeMutations.attachments.replaceStoredAttachment({
        prepared: resolvedPrepared({
          stagingDirectory: stage,
          mainPath: path.join(stage, "new.pdf"),
          mainFilename: "new.pdf",
          cleanup: () => fs.rm(stage, { recursive: true, force: true }),
          complete: () => {
            completed += 1;
          },
        }),
        attachment,
        admit: (work) => Promise.resolve(work()),
      });

      assert.equal(attachment.attachmentFilename, "new.pdf");
      assert.equal(attachmentPath, "storage:new.pdf");
      assert.equal(attachment.attachmentContentType, "application/pdf");
      assert.equal(attachment.parentItemID, 17);
      assert.equal(
        await fs.readFile(path.join(storage, "new.pdf"), "utf8"),
        "new",
      );
      assert.equal(completed, 1);
      assert.isFalse(await pathExists(stage));
    });
  });

  it("restores files and persisted attachment metadata when replacement save fails", async function () {
    await withTemporaryDirectory(async (root) => {
      const storage = path.join(root, "storage");
      const stage = path.join(root, "stage");
      await fs.mkdir(storage);
      await fs.mkdir(stage);
      await fs.writeFile(path.join(storage, "old.pdf"), "old");
      await fs.writeFile(path.join(stage, "new.pdf"), "new");
      let saves = 0;
      const attachment = {
        attachmentLinkMode: 1,
        attachmentFilename: "old.pdf",
        attachmentContentType: "application/pdf",
        async getFilePathAsync() {
          return path.join(storage, "old.pdf");
        },
        async saveTx() {
          saves += 1;
          if (saves === 1) throw new Error("metadata save failed");
        },
      } as unknown as Zotero.Item & {
        attachmentFilename: string;
        attachmentContentType: string;
      };
      let completed = 0;

      try {
        await nativeMutations.attachments.replaceStoredAttachment({
          prepared: resolvedPrepared({
            stagingDirectory: stage,
            mainPath: path.join(stage, "new.pdf"),
            mainFilename: "new.pdf",
            cleanup: () => fs.rm(stage, { recursive: true, force: true }),
            complete: () => {
              completed += 1;
            },
          }),
          attachment,
          admit: (work) => Promise.resolve(work()),
        });
        assert.fail("expected replacement failure");
      } catch (error) {
        assert.equal(nativeMutations.attachmentFailureStatus(error), "failed");
      }

      assert.equal(attachment.attachmentFilename, "old.pdf");
      assert.equal(attachment.attachmentContentType, "application/pdf");
      assert.equal(saves, 2);
      assert.equal(completed, 0);
      assert.equal(
        await fs.readFile(path.join(storage, "old.pdf"), "utf8"),
        "old",
      );
      assert.isFalse(await pathExists(stage));
    });
  });

  it("preserves backup cleanup errors for Broker repair classification", async function () {
    await withTemporaryDirectory(async (root) => {
      const storage = path.join(root, "storage");
      const stage = path.join(root, "stage");
      await fs.mkdir(storage);
      await fs.mkdir(stage);
      await fs.writeFile(path.join(storage, "old.pdf"), "old");
      await fs.writeFile(path.join(stage, "new.pdf"), "new");
      const attachment = {
        attachmentLinkMode: 0,
        attachmentFilename: "old.pdf",
        attachmentContentType: "application/pdf",
        async getFilePathAsync() {
          return path.join(storage, "old.pdf");
        },
        async saveTx() {},
      } as unknown as Zotero.Item & {
        attachmentFilename: string;
        attachmentContentType: string;
      };
      const runtime = globalThis as {
        IOUtils?: {
          exists?: (path: string) => Promise<boolean>;
          remove?: (path: string, options?: unknown) => Promise<void>;
        };
      };
      const originalIOUtils = runtime.IOUtils;
      runtime.IOUtils = {
        async exists(candidate) {
          try {
            await fs.access(candidate);
            return true;
          } catch {
            return false;
          }
        },
        async move(source, target) {
          await fs.rename(source, target);
        },
        async remove() {
          throw new Error("backup cleanup failed");
        },
      };
      try {
        await nativeMutations.attachments.replaceStoredAttachment({
          prepared: resolvedPrepared({
            stagingDirectory: stage,
            mainPath: path.join(stage, "new.pdf"),
            mainFilename: "new.pdf",
            cleanup: () => fs.rm(stage, { recursive: true, force: true }),
          }),
          attachment,
          admit: (work) => Promise.resolve(work()),
        });
        assert.fail("expected backup cleanup failure");
      } catch (error) {
        assert.equal(
          nativeMutations.attachmentFailureStatus(error),
          "repair_required",
        );
        const cleanupErrors = (error as { cleanupErrors?: unknown[] })
          .cleanupErrors;
        assert.isArray(cleanupErrors);
        assert.isTrue(cleanupErrors!.some((entry) => entry instanceof Error));
        assert.notEqual(cleanupErrors![0], error);
      } finally {
        runtime.IOUtils = originalIOUtils;
      }
      assert.equal(
        await fs.readFile(path.join(storage, "new.pdf"), "utf8"),
        "new",
      );
    });
  });
});
