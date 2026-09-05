import { assert } from "chai";
import {
  type SynthesisHostArtifactDescriptor,
  type SynthesisHostReadPort,
  SynthesisClientError,
} from "../../packages/synthesis-contracts/src/index";
import { renderPayloadBlock } from "../../src/modules/notePayloadCodec";
import { createZoteroSynthesisHostReadPort } from "../../src/modules/synthesis/libraryAdapter";
import { resetZoteroHostSnapshotRuntimeForTests } from "../../src/modules/zoteroHostCapabilityBroker";
import {
  resetZoteroLibraryPageQueryAdapterForTests,
  resetZoteroLibrarySourcePageQueryAdapterForTests,
  setZoteroLibraryPageQueryAdapterForTests,
  setZoteroLibrarySourcePageQueryAdapterForTests,
  type ZoteroLibrarySourcePageQueryAdapter,
} from "../../src/modules/zoteroLibraryPageQuery";
import { createMockZoteroLibraryPageQueryAdapter } from "../helpers/zoteroLibraryPageQueryAdapter";

function createMockZoteroSourcePageQueryAdapter(
  calls: Array<{ domain: string; kind: string }> = [],
): ZoteroLibrarySourcePageQueryAdapter {
  return {
    async queryAsync(_sql, _params, context) {
      calls.push({ domain: context.domain, kind: context.kind });
      const items = (await (Zotero.Items as any).getAll(
        context.criteria.libraryId,
      )) as Zotero.Item[];
      const parentItemId = Number(context.criteria.parentItemId);
      const matching = items
        .filter((item) => {
          const itemParentId = Number(
            (item as any).parentItemID || (item as any).parentID || 0,
          );
          const matchesDomain =
            context.domain === "notes"
              ? item.isNote?.()
              : item.isAttachment?.();
          return (
            Number((item as any).libraryID) === context.criteria.libraryId &&
            itemParentId === parentItemId &&
            Boolean(matchesDomain)
          );
        })
        .sort(
          (left, right) => Number((left as any).id) - Number((right as any).id),
        );
      if (context.kind === "count") {
        return [{ total: matching.length }];
      }
      const afterId = Number((context.position as any).id || 0);
      return matching
        .filter((item) => Number((item as any).id) > afterId)
        .slice(0, context.limitPlusOne)
        .map((item) => ({ itemID: (item as any).id }));
    },
    async hydrateItems(ids) {
      return (await (Zotero.Items as any).getAsync(ids)) as Zotero.Item[];
    },
  };
}

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
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroSourcePageQueryAdapter(),
    );
  });

  afterEach(function () {
    resetZoteroLibraryPageQueryAdapterForTests();
    resetZoteroLibrarySourcePageQueryAdapterForTests();
    resetZoteroHostSnapshotRuntimeForTests();
  });

  it("consumes the Broker-owned fixed snapshot instead of live pagination", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HOSTSNAP", "Host Snapshot");
    const port = createZoteroSynthesisHostReadPort({ libraryId });

    const page = await port.library.syncSnapshot({
      libraryId,
      batchSize: 500,
    });

    assert.equal(page.outcome, "completed");
    assert.deepEqual(
      page.items.map((item) => item.ref),
      [{ libraryId, key: paper.key }],
    );
    if (page.outcome === "completed") {
      assert.equal(page.completionEvidence.totalItems, 1);
      assert.match(
        page.completionEvidence.contentDigest,
        /^sha256:[a-f0-9]{64}$/u,
      );
    }
    assert.notProperty(page, "path");
    assert.notProperty(page, "registry");
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

  it("follows canonical note and payload pages before selecting an artifact", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HOSTPAGE", "Host Page Reads");
    const sourceCalls: Array<{ domain: string; kind: string }> = [];
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroSourcePageQueryAdapter(sourceCalls),
    );
    for (let index = 0; index < 101; index += 1) {
      const note = new Zotero.Item("note");
      note.libraryID = libraryId;
      note.parentItemID = paper.id;
      note.setField("title", `Host page note ${index}`);
      if (index === 100) {
        note.setNote(
          Array.from({ length: 101 }, (_unused, payloadIndex) =>
            renderPayloadBlock({
              payloadType:
                payloadIndex === 100
                  ? "references-json"
                  : `host-page-${payloadIndex}-json`,
              payload:
                payloadIndex === 100
                  ? { references: [{ title: "Later page reference" }] }
                  : { index: payloadIndex },
              payloadFormat: "json",
            }),
          ).join("\n"),
        );
      } else {
        note.setNote(`<p>Host page note ${index}</p>`);
      }
      await note.saveTx();
    }

    const port = createZoteroSynthesisHostReadPort({ libraryId });
    const scan = await port.artifacts.scanPage({
      libraryId,
      paperRefs: [`${libraryId}:${paper.key}`],
      artifactTypes: ["references"],
      limit: 1,
    });
    const descriptor = scan.artifacts[0];

    assert.equal(descriptor?.status, "available");
    assert.isString(descriptor?.locator);
    assert.isString(descriptor?.payloadHash);
    const read = await port.artifacts.read({
      locator: descriptor!.locator!,
      expectedHash: descriptor!.payloadHash!,
    });
    assert.equal(read.status, "available");
    if (read.status === "available" && read.content?.kind === "json") {
      assert.deepEqual(read.content.value, {
        references: [{ title: "Later page reference" }],
      });
    } else {
      assert.fail("the later payload page was not readable");
    }
    assert.isAtLeast(
      sourceCalls.filter(
        (entry) => entry.domain === "notes" && entry.kind === "page",
      ).length,
      2,
    );
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
});
