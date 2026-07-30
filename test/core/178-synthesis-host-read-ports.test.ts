import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  type SynthesisHostArtifactDescriptor,
  type SynthesisHostReadPort,
  SynthesisClientError,
} from "../../packages/synthesis-contracts/src/index";
import { renderPayloadBlock } from "../../src/modules/notePayloadCodec";
import { createZoteroSynthesisHostReadPort } from "../../src/modules/synthesis/libraryAdapter";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import {
  resetZoteroLibraryPageQueryAdapterForTests,
  setZoteroLibraryPageQueryAdapterForTests,
} from "../../src/modules/zoteroLibraryPageQuery";
import { createMockZoteroLibraryPageQueryAdapter } from "../helpers/zoteroLibraryPageQueryAdapter";

async function createPaper(key: string, title: string) {
  const item = new Zotero.Item("journalArticle");
  item.key = key;
  item.libraryID = Zotero.Libraries.userLibraryID;
  item.setField("title", title);
  item.setField("date", "2026");
  item.addTag("host-read");
  await item.saveTx();
  return item;
}

async function addPayloadNote(
  parent: Zotero.Item,
  payloadType: string,
  payload: unknown,
) {
  const note = new Zotero.Item("note");
  note.libraryID = parent.libraryID;
  note.parentItemID = parent.id;
  note.setField("title", payloadType);
  note.setNote(
    renderPayloadBlock({
      payloadType,
      payload,
      payloadFormat: payloadType === "digest-markdown" ? "text" : "json",
    }),
  );
  await note.saveTx();
  return note;
}

describe("Synthesis Host read capability ports", function () {
  beforeEach(function () {
    setZoteroLibraryPageQueryAdapterForTests(
      createMockZoteroLibraryPageQueryAdapter(),
    );
  });

  afterEach(function () {
    resetZoteroLibraryPageQueryAdapterForTests();
  });

  it("pages JSON-safe library summaries and resolves finite stable refs", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paperA = await createPaper("HOSTREADA", "Host Read A");
    const paperB = await createPaper("HOSTREADB", "Host Read B");
    const sortedKeys = [paperA.key, paperB.key].sort((left, right) =>
      left.localeCompare(right),
    );
    const adapter = createMockZoteroLibraryPageQueryAdapter();
    const hydrated: number[][] = [];
    setZoteroLibraryPageQueryAdapterForTests({
      ...adapter,
      async hydrateItems(ids) {
        hydrated.push([...ids]);
        return adapter.hydrateItems(ids);
      },
    });
    const port: SynthesisHostReadPort = createZoteroSynthesisHostReadPort({
      libraryId,
    });

    const first = await port.library.listItemsPage({ libraryId, limit: 1 });
    const second = await port.library.listItemsPage({
      libraryId,
      cursor: first.nextCursor,
      limit: 1,
    });
    const lookup = await port.library.getItemsByRef({
      libraryId,
      paperRefs: [`${libraryId}:${paperB.key}`, `${libraryId}:MISSING`],
    });

    assert.deepEqual(
      first.items.map((item) => item.itemKey),
      [sortedKeys[0]],
    );
    assert.deepEqual(
      second.items.map((item) => item.itemKey),
      [sortedKeys[1]],
    );
    assert.equal(first.hasMore, true);
    assert.equal(second.hasMore, false);
    assert.notEqual(first.nextCursor, sortedKeys[0]);
    assert.deepEqual(
      lookup.items.map((item) => item.itemKey),
      [paperB.key],
    );
    assert.deepEqual(lookup.missingPaperRefs, [`${libraryId}:MISSING`]);
    assert.doesNotThrow(() => JSON.stringify({ first, second, lookup }));
    assert.notProperty(first.items[0], "notes");
    assert.deepEqual(hydrated, [[paperA.id], [paperB.id]]);
  });

  it("scans payload-free descriptors and reads one hash-guarded locator", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HOSTARTA", "Host Artifact A");
    const note = await addPayloadNote(paper, "references-json", {
      references: [{ title: "Stable Reference" }],
    });
    const port = createZoteroSynthesisHostReadPort({ libraryId });

    const scan = await port.artifacts.scanPage({
      libraryId,
      paperRefs: [`${libraryId}:${paper.key}`],
      artifactTypes: ["references", "citation_analysis"],
      limit: 10,
    });
    const descriptor = scan.artifacts.find(
      (
        entry,
      ): entry is SynthesisHostArtifactDescriptor & {
        locator: string;
        payloadHash: string;
      } =>
        entry.artifactType === "references" &&
        Boolean(entry.locator && entry.payloadHash),
    );
    assert.isDefined(descriptor);
    assert.notProperty(descriptor, "payload");
    assert.notProperty(descriptor, "markdown");
    assert.notMatch(descriptor!.locator, /[/\\]/);

    const available = await port.artifacts.read({
      locator: descriptor!.locator,
      expectedHash: descriptor!.payloadHash,
    });
    assert.equal(available.status, "available");
    assert.equal(available.content?.kind, "json");

    note.setNote(
      renderPayloadBlock({
        payloadType: "references-json",
        payload: { references: [{ title: "Changed Reference" }] },
        payloadFormat: "json",
      }),
    );
    await note.saveTx();
    const stale = await port.artifacts.read({
      locator: descriptor!.locator,
      expectedHash: descriptor!.payloadHash,
    });
    assert.equal(stale.status, "stale");
    assert.notEqual(stale.currentHash, descriptor!.payloadHash);
    assert.isUndefined(stale.content);
  });

  it("rejects invalid bounds before touching the Host", async function () {
    const port = createZoteroSynthesisHostReadPort({
      libraryId: Zotero.Libraries.userLibraryID,
    });
    let failure: unknown;
    try {
      await port.library.listItemsPage({ libraryId: 0, limit: 101 });
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, SynthesisClientError);
    assert.equal((failure as SynthesisClientError).code, "invalid_request");
  });

  it("reads reference payloads only when scanned hashes change", async function () {
    const libraryId = 1;
    let referenceHash = "sha256:reference-v1";
    let staleReferenceRead = false;
    const reads: string[] = [];
    const port: SynthesisHostReadPort = {
      library: {
        async listItemsPage() {
          return {
            items: [
              {
                paperRef: "1:HOSTREF1",
                libraryId,
                itemKey: "HOSTREF1",
                itemType: "journalArticle",
                title: "Host Reference Source",
                year: "2026",
                date: "2026",
                creators: ["Author"],
                tags: [],
                collections: [],
                doi: "",
                arxiv: "",
                isbn: "",
                url: "",
                citekey: "",
                dateAdded: "2026-01-01",
              },
            ],
            cursor: "",
            nextCursor: "",
            hasMore: false,
            returned: 1,
            limit: 50,
          };
        },
        async getItemsByRef(request) {
          return {
            items: request.paperRefs.includes("1:HOSTREF1")
              ? [
                  {
                    paperRef: "1:HOSTREF1",
                    libraryId,
                    itemKey: "HOSTREF1",
                    itemType: "journalArticle",
                    title: "Host Reference Source",
                    year: "2026",
                    date: "2026",
                    creators: ["Author"],
                    tags: [],
                    collections: [],
                    doi: "",
                    arxiv: "",
                    isbn: "",
                    url: "",
                    citekey: "",
                    dateAdded: "2026-01-01",
                  },
                ]
              : [],
            missingPaperRefs: request.paperRefs.filter(
              (ref) => ref !== "1:HOSTREF1",
            ),
          };
        },
      },
      artifacts: {
        async scanPage() {
          return {
            artifacts: [
              {
                paperRef: "1:HOSTREF1",
                artifactType: "references",
                payloadType: "references-json",
                status: "available",
                locator: "host-artifact:references",
                payloadHash: referenceHash,
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF1",
                artifactType: "citation_analysis",
                payloadType: "citation-analysis-json",
                status: "available",
                locator: "host-artifact:citation-analysis",
                payloadHash: "sha256:citation-v1",
                diagnostics: [],
              },
            ],
            cursor: "",
            nextCursor: "",
            hasMore: false,
            returned: 2,
            limit: 50,
          };
        },
        async read(request) {
          reads.push(request.locator);
          if (request.locator === "host-artifact:references") {
            if (staleReferenceRead) {
              return {
                status: "stale",
                currentHash: "sha256:reference-raced",
                diagnostics: ["artifact_hash_changed"],
              };
            }
            return {
              status: "available",
              payloadHash: referenceHash,
              content: {
                kind: "json",
                value: { references: [{ title: "Referenced Paper" }] },
              },
              diagnostics: [],
            };
          }
          return {
            status: "available",
            payloadHash: "sha256:citation-v1",
            content: { kind: "json", value: { citations: [] } },
            diagnostics: [],
          };
        },
      },
    };
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-host-read-"));
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const service = createSynthesisService({
      root,
      libraryId,
      hostReadPort: port,
      synthesisRepository: repository,
    });

    await service.refreshReferenceSidecarNow();
    assert.deepEqual(reads.sort(), [
      "host-artifact:citation-analysis",
      "host-artifact:references",
    ]);
    reads.length = 0;
    await service.refreshReferenceSidecarNow();
    assert.deepEqual(reads, []);

    referenceHash = "sha256:reference-v2";
    await service.refreshReferenceSidecarNow();
    assert.deepEqual(reads.sort(), [
      "host-artifact:citation-analysis",
      "host-artifact:references",
    ]);

    const lastGoodReferences = repository.listRawReferences({
      sourceRefs: ["1:HOSTREF1"],
      statuses: ["active"],
    });
    reads.length = 0;
    referenceHash = "sha256:reference-v3";
    staleReferenceRead = true;
    const staleRefresh = await service.refreshReferenceSidecarNow();

    assert.equal(staleRefresh.status, "ready");
    assert.deepEqual(
      repository.listRawReferences({
        sourceRefs: ["1:HOSTREF1"],
        statuses: ["active"],
      }),
      lastGoodReferences,
    );
    assert.equal(
      repository.getCacheBasis("reference-sidecar:library")?.status,
      "ready",
    );
  });
});
