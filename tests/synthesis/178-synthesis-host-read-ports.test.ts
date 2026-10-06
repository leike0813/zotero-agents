import { assert } from "chai";
import {
  rebuildSynthesisHostArtifactScanPageResult,
  type SynthesisHostArtifactDescriptor,
  type SynthesisHostReadPort,
  SynthesisClientError,
} from "../../packages/synthesis-contracts/src/index";
import { renderPayloadBlock } from "../../src/modules/zoteroHost/notePayloadCodec";
import { managedArtifactContent } from "../../src/modules/zoteroHost/zoteroManagedNotes";
import { inspectManagedNote } from "../../src/modules/zoteroHost/zoteroManagedNotes";
import { createZoteroSynthesisHostReadPort } from "../../src/modules/synthesis/libraryAdapter";
import { resetZoteroHostSnapshotRuntimeForTests } from "../../src/modules/zoteroHostCapabilityBroker";
import { buildLiteratureQualitySnapshot } from "../../src/shared/literatureScore";
import {
  resetZoteroLibraryPageQueryAdapterForTests,
  resetZoteroLibrarySourcePageQueryAdapterForTests,
  setZoteroLibraryPageQueryAdapterForTests,
  setZoteroLibrarySourcePageQueryAdapterForTests,
  type ZoteroLibrarySourcePageQueryAdapter,
} from "../../src/modules/zoteroHost/zoteroLibraryPageQuery";
import { createMockZoteroLibraryPageQueryAdapter } from "../helpers/zoteroLibraryPageQueryAdapter";
import { mkTempDir, writeUtf8 } from "../zotero/workflow-test-utils";
import { joinPath } from "../../src/utils/path";

function referencesArtifact(title: string) {
  return {
    schema: "source_reference_artifact.v1",
    references: [
      {
        sourceReferenceId: `source-reference-${title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}`,
        extraction: { raw: title, confidence: 1 },
        bibliography: { title, authors: [], year: null },
        matching: {},
      },
    ],
  };
}

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

async function addMarkdownAttachment(parent: Zotero.Item, path: string) {
  const attachment = new Zotero.Item("attachment") as Zotero.Item & {
    attachmentFilename: string;
    attachmentContentType: string;
    attachmentLinkMode: number;
    setFilePath(path: string): void;
  };
  attachment.libraryID = parent.libraryID;
  attachment.parentItemID = parent.id;
  attachment.attachmentFilename = "evidence.md";
  attachment.attachmentContentType = "text/markdown";
  attachment.attachmentLinkMode = 2;
  attachment.setField("title", "evidence.md");
  attachment.setFilePath(path);
  await attachment.saveTx();
  return attachment;
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

  it("keeps evidence on the root Host port and resolves an empty-kind scope", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const port = createZoteroSynthesisHostReadPort({ libraryId });
    const page = await port.evidence.listSources({
      scope: { libraryIds: [libraryId], itemRefs: [] },
      sourceKinds: [],
      limit: 1,
    });
    assert.deepEqual(page.scope, { libraryIds: [libraryId], itemRefs: [] });
    assert.deepEqual(page.descriptors, []);
    assert.isNull(page.nextCursor);
    assert.isFalse(page.hasMore);
    assert.deepEqual(page.issues, []);
  });

  it("reads Markdown through runtime persistence and rejects content changed after catalog", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HOSTMD01", "Markdown evidence");
    const directory = await mkTempDir("synthesis-evidence-markdown");
    const path = joinPath(directory, "evidence.md");
    await writeUtf8(path, "# Evidence\n\n😀 unique source text.");
    const attachment = await addMarkdownAttachment(paper, path);
    const port = createZoteroSynthesisHostReadPort({ libraryId });
    const catalog = await port.evidence.listSources({
      scope: {
        libraryIds: [libraryId],
        itemRefs: [{ libraryId, key: paper.key }],
        tag: "host-read",
      },
      sourceKinds: ["fulltext"],
      limit: 100,
    });
    assert.equal(catalog.descriptors.length, 1, JSON.stringify(catalog));
    const descriptor = catalog.descriptors[0];
    const full = await port.evidence.readSource({
      scope: catalog.scope,
      descriptor,
    });
    assert.equal(full.outcome, "available");
    if (full.outcome !== "available") return;
    assert.equal(full.content, "# Evidence\n\n😀 unique source text.");
    assert.equal(full.location.unit, "paragraph");
    await writeUtf8(path, "# Evidence\n\n😀 changed source text.");
    const stale = await port.evidence.readSource({
      scope: catalog.scope,
      descriptor,
    });
    assert.equal(stale.outcome, "source_changed");
    paper.removeTag("host-read");
    await paper.saveTx();
    const outsideScope = await port.evidence.readSource({
      scope: catalog.scope,
      descriptor,
    });
    assert.equal(outsideScope.outcome, "source_unavailable");
    assert.deepEqual(attachment.parentItemID, paper.id);
  });

  it("locates duplicate JSON leaves by pointer and rechecks changed managed payloads", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HOSTAN01", "Analysis evidence");
    const firstReference = {
      ...referencesArtifact("same 😀").references[0],
      extraction: { raw: "first extraction", confidence: 1 },
    };
    const secondReference = {
      ...referencesArtifact("same 😀").references[0],
      sourceReferenceId: "source-reference-second",
      extraction: { raw: "second extraction", confidence: 1 },
    };
    const payload = {
      schema: "source_reference_artifact.v1",
      references: [firstReference, secondReference],
    };
    const note = new Zotero.Item("note");
    note.libraryID = libraryId;
    note.parentItemID = paper.id;
    note.setField("title", "References");
    note.setNote(
      managedArtifactContent("references", "References", payload).content,
    );
    await note.saveTx();
    const inspection = await inspectManagedNote(note);
    assert.equal(inspection.kind, "managed");
    const port = createZoteroSynthesisHostReadPort({ libraryId });
    const catalog = await port.evidence.listSources({
      scope: {
        libraryIds: [libraryId],
        itemRefs: [{ libraryId, key: paper.key }],
      },
      sourceKinds: ["analysis"],
      limit: 100,
    });
    assert.equal(catalog.descriptors.length, 1, JSON.stringify(catalog));
    const descriptor = catalog.descriptors[0];
    const full = await port.evidence.readSource({
      scope: catalog.scope,
      descriptor,
    });
    assert.equal(full.outcome, "available");
    if (full.outcome !== "available") return;
    assert.equal(full.location.unit, "analysis_field");
    assert.equal(full.location.field, "$");
    assert.equal(full.format, "text");
    const token = '"same 😀"';
    const firstOffset = full.content.indexOf(token);
    const secondOffset = full.content.lastIndexOf(token);
    const passage = await port.evidence.readSource({
      scope: catalog.scope,
      descriptor,
      location: {
        unit: "analysis_field",
        field: "/references/1/bibliography/title",
        range: { start: secondOffset, end: secondOffset + token.length },
      },
    });
    assert.equal(passage.outcome, "available");
    if (passage.outcome === "available") assert.equal(passage.content, token);
    const wrongOccurrence = await port.evidence.readSource({
      scope: catalog.scope,
      descriptor,
      location: {
        unit: "analysis_field",
        field: "/references/1/bibliography/title",
        range: { start: firstOffset, end: firstOffset + token.length },
      },
    });
    assert.equal(wrongOccurrence.outcome, "invalid_source");
    const changedPayload = {
      ...payload,
      references: [
        {
          ...firstReference,
          bibliography: { ...firstReference.bibliography, title: "changed" },
        },
        secondReference,
      ],
    };
    note.setNote(
      managedArtifactContent("references", "References", changedPayload)
        .content,
    );
    await note.saveTx();
    const stale = await port.evidence.readSource({
      scope: catalog.scope,
      descriptor,
    });
    assert.equal(stale.outcome, "source_changed");
  });

  it("reports more catalog work when the per-call item scan budget is reached", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const refs = [];
    for (let index = 0; index < 257; index += 1) {
      const paper = await createPaper(
        `B${index.toString(36).toUpperCase().padStart(7, "0")}`,
        `Budget ${index}`,
      );
      refs.push({ libraryId, key: paper.key });
    }
    const port = createZoteroSynthesisHostReadPort({ libraryId });
    const first = await port.evidence.listSources({
      scope: { libraryIds: [libraryId], itemRefs: refs },
      sourceKinds: ["analysis"],
      limit: 100,
    });
    assert.isTrue(first.hasMore);
    assert.isNotNull(first.nextCursor);
    assert.isTrue(
      first.issues.some(
        (issue) =>
          issue.code === "scan_budget_exhausted" && issue.sourceKind === null,
      ),
    );
    const second = await port.evidence.listSources({
      scope: { libraryIds: [libraryId], itemRefs: refs },
      sourceKinds: ["analysis"],
      limit: 100,
      cursor: first.nextCursor!,
    });
    assert.isFalse(second.hasMore);
    assert.isNull(second.nextCursor);
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
    const stableReferences = referencesArtifact("Stable Reference");
    const note = await addPayloadNote(
      paper,
      "references-json",
      stableReferences,
    );
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
        payload: referencesArtifact("Changed Reference"),
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

  it("reads exact artifact readiness through the Broker without payload locators", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HOSTRDY1", "Host Readiness");
    await addPayloadNote(
      paper,
      "references-json",
      referencesArtifact("Ready Reference"),
    );
    const readiness = await createZoteroSynthesisHostReadPort({
      libraryId,
    }).artifacts.readiness({
      libraryId,
      paperRefs: [`${libraryId}:${paper.key}`],
      artifactTypes: ["references", "literature_score"],
    });

    assert.deepEqual(
      readiness.artifacts.map(({ artifactType, status }) => ({
        artifactType,
        status,
      })),
      [
        { artifactType: "references", status: "available" },
        { artifactType: "literature_score", status: "missing" },
      ],
    );
    readiness.artifacts.forEach((artifact) => {
      assert.notProperty(artifact, "locator");
      assert.notProperty(artifact, "payloadHash");
    });
  });

  it("omits absent optional literature score hashes at the host contract", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HOSTSCR1", "Host Score Without Hash");
    const port = createZoteroSynthesisHostReadPort({ libraryId });
    const scan = await port.artifacts.scanPage({
      libraryId,
      paperRefs: [`${libraryId}:${paper.key}`],
      artifactTypes: ["literature_score"],
      limit: 10,
    });
    const artifact = scan.artifacts[0];
    assert.isDefined(artifact);
    const literatureQuality = buildLiteratureQualitySnapshot({});

    assert.notProperty(literatureQuality, "payload_hash");
    assert.doesNotThrow(() =>
      rebuildSynthesisHostArtifactScanPageResult({
        ...scan,
        artifacts: [{ ...artifact, literatureQuality }],
      }),
    );
  });

  it("follows canonical note and payload pages before selecting an artifact", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HOSTPAGE", "Host Page Reads");
    const laterReferences = referencesArtifact("Later page reference");
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
                  ? laterReferences
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
      assert.deepEqual(read.content.value, laterReferences);
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

  it("reports an ambiguous managed note as decode errors instead of failing the scan", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HOSTAMB1", "Host Ambiguous Artifact");
    const note = new Zotero.Item("note");
    note.libraryID = libraryId;
    note.parentItemID = paper.id;
    note.setNote(
      [
        renderPayloadBlock({
          payloadType: "references-json",
          payload: referencesArtifact("Ambiguous Reference"),
          payloadFormat: "json",
        }),
        renderPayloadBlock({
          payloadType: "citation-analysis-json",
          payload: { schema: "citation_analysis.v1", items: [] },
          payloadFormat: "json",
        }),
      ].join("\n"),
    );
    await note.saveTx();
    const port = createZoteroSynthesisHostReadPort({ libraryId });

    const scan = await port.artifacts.scanPage({
      libraryId,
      paperRefs: [`${libraryId}:${paper.key}`],
      artifactTypes: ["references", "citation_analysis"],
      limit: 1,
    });

    assert.deepEqual(
      scan.artifacts.map(({ artifactType, status }) => ({
        artifactType,
        status,
      })),
      [
        { artifactType: "references", status: "decode_error" },
        { artifactType: "citation_analysis", status: "decode_error" },
      ],
    );
  });

  it("keeps an oversized child note as a bounded artifact diagnostic", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HSTLIMIT", "Host Limited Artifact");
    await addPayloadNote(
      paper,
      "references-json",
      referencesArtifact("Readable Reference"),
    );
    const oversized = new Zotero.Item("note");
    oversized.libraryID = libraryId;
    oversized.parentItemID = paper.id;
    oversized.setNote(`<p>${"文".repeat(360000)}</p>`);
    await oversized.saveTx();
    const port = createZoteroSynthesisHostReadPort({ libraryId });

    const scan = await port.artifacts.scanPage({
      libraryId,
      paperRefs: [`${libraryId}:${paper.key}`],
      artifactTypes: ["references", "citation_analysis"],
      limit: 1,
    });

    const references = scan.artifacts.find(
      (entry) => entry.artifactType === "references",
    );
    const citation = scan.artifacts.find(
      (entry) => entry.artifactType === "citation_analysis",
    );
    assert.equal(references?.status, "available");
    assert.equal(citation?.status, "decode_error");
    assert.isUndefined(citation?.locator);
    assert.include(citation?.diagnostics.join("\n"), "resource_limited");
    assert.notInclude(JSON.stringify(scan), "文文文文");

    const readiness = await port.artifacts.readiness({
      libraryId,
      paperRefs: [`${libraryId}:${paper.key}`],
      artifactTypes: ["references", "citation_analysis"],
    });
    const readinessStatus = new Map(
      readiness.artifacts.map((artifact) => [
        artifact.artifactType,
        artifact.status,
      ]),
    );
    assert.equal(readinessStatus.get("references"), "available");
    assert.notEqual(readinessStatus.get("citation_analysis"), "available");
  });

  it("keeps an oversized payload attachment as a bounded artifact diagnostic", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HSTATT01", "Host Oversized Attachment");
    await addPayloadNote(
      paper,
      "references-json",
      referencesArtifact("Readable Reference"),
    );
    const note = new Zotero.Item("note");
    note.libraryID = libraryId;
    note.parentItemID = paper.id;
    note.setNote("<div><p>Note with an oversized payload attachment</p></div>");
    await note.saveTx();
    const tempDir = await mkTempDir("synthesis-oversized-payload");
    const payloadPath = joinPath(tempDir, "payload.bin");
    await writeUtf8(payloadPath, "x".repeat(1_100_000));
    const attachment = new Zotero.Item("attachment");
    attachment.libraryID = libraryId;
    (attachment as any).parentItemID = note.id;
    (attachment as any).attachmentContentType = "application/octet-stream";
    (attachment as any).setFilePath(payloadPath);
    await attachment.saveTx();
    const port = createZoteroSynthesisHostReadPort({ libraryId });

    const scan = await port.artifacts.scanPage({
      libraryId,
      paperRefs: [`${libraryId}:${paper.key}`],
      artifactTypes: ["references", "citation_analysis"],
      limit: 1,
    });

    const references = scan.artifacts.find(
      (entry) => entry.artifactType === "references",
    );
    const citation = scan.artifacts.find(
      (entry) => entry.artifactType === "citation_analysis",
    );
    assert.equal(references?.status, "available");
    assert.equal(citation?.status, "decode_error");
    assert.include(citation?.diagnostics.join("\n"), "resource_limited");

    const readiness = await port.artifacts.readiness({
      libraryId,
      paperRefs: [`${libraryId}:${paper.key}`],
      artifactTypes: ["references", "citation_analysis"],
    });
    const readinessStatus = new Map(
      readiness.artifacts.map((artifact) => [
        artifact.artifactType,
        artifact.status,
      ]),
    );
    assert.equal(readinessStatus.get("references"), "available");
    assert.notEqual(readinessStatus.get("citation_analysis"), "available");
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
