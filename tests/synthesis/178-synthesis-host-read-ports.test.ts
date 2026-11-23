import { assert } from "chai";
import { rejects } from "node:assert/strict";
import { canonicalizeSynthesisContractJson } from "../../packages/synthesis-contracts/src/canonicalJson";
import {
  rebuildSynthesisHostArtifactScanPageResult,
  SYNTHESIS_MARKDOWN_READ_PAGE_UTF16,
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
import { hashMarkdown } from "../../src/modules/synthesis/foundation";
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
import { createCancellationController } from "../../src/utils/wait";

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

function literatureScoreV2() {
  return {
    schema: "literature_score.v2",
    rubric_id: "literature-score.interpretive_historical.v1",
    literature_classification: {
      disciplines: ["synthetic history"],
      profile_id: "interpretive_historical",
      confidence: "high",
      reason: "Synthetic historical source interpretation.",
    },
    overall_score: 68,
    confidence: 0.8,
    confidence_adjusted_score: 64.4,
    dimensions: Array.from({ length: 6 }, (_unused, index) => ({
      dimension_key: `dimension-${index}`,
      name: "Dimension",
      configured_weight: 1 / 6,
      effective_weight: 1 / 6,
      raw_score: 1,
      applicable_max_score: 2,
      score: 50,
      confidence: 0.8,
      summary: "Evidence summary",
      criteria: [
        {
          criterion_key: "criterion-1",
          name: "Criterion",
          status: "scored",
          score: 1,
          max_score: 2,
          reason: "Evidence is sufficient",
          evidence: [{ line_start: 1, line_end: 2, quote: "A source quote" }],
        },
      ],
    })),
  };
}

function createMockZoteroSourcePageQueryAdapter(
  calls: Array<{ domain: string; kind: string; parentItemId: number }> = [],
  delayMs = 0,
): ZoteroLibrarySourcePageQueryAdapter {
  return {
    async queryAsync(_sql, _params, context) {
      calls.push({
        domain: context.domain,
        kind: context.kind,
        parentItemId: Number(context.criteria.parentItemId),
      });
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
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

  it("pages large Markdown by absolute UTF-16 ranges and rejects oversized whole reads", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HOSTMD02", "Paged Markdown evidence");
    const directory = await mkTempDir("synthesis-evidence-markdown-pages");
    const path = joinPath(directory, "evidence.md");
    const content =
      `${"x".repeat(SYNTHESIS_MARKDOWN_READ_PAGE_UTF16 - 1)}😀` +
      "y".repeat(200_000);
    await writeUtf8(path, content);
    await addMarkdownAttachment(paper, path);
    const companion = joinPath(directory, "companion.md");
    await writeUtf8(companion, "Second Markdown source");
    await addMarkdownAttachment(paper, companion);
    const port = createZoteroSynthesisHostReadPort({ libraryId });
    const request = {
      scope: {
        libraryIds: [libraryId],
        itemRefs: [{ libraryId, key: paper.key }],
      },
      sourceKinds: ["fulltext"] as ["fulltext"],
      limit: 1,
    };
    const catalog = await port.evidence.listSources(request);
    assert.isString(catalog.nextCursor);
    const next = await port.evidence.listSources({
      ...request,
      cursor: catalog.nextCursor!,
    });
    assert.lengthOf(next.descriptors, 1);
    assert.notDeepEqual(
      next.descriptors[0].source,
      catalog.descriptors[0].source,
    );
    const descriptor = catalog.descriptors[0];
    assert.equal(descriptor.contentLength, content.length);

    const whole = await port.evidence.readSource({
      scope: catalog.scope,
      descriptor,
    });
    assert.deepEqual(whole, { outcome: "source_read_failed" });

    const first = await port.evidence.readSource({
      scope: catalog.scope,
      descriptor,
      location: {
        unit: "paragraph",
        field: null,
        range: { start: 0, end: SYNTHESIS_MARKDOWN_READ_PAGE_UTF16 },
      },
    });
    assert.equal(first.outcome, "available");
    if (first.outcome !== "available") return;
    assert.equal(
      first.content,
      content.slice(0, SYNTHESIS_MARKDOWN_READ_PAGE_UTF16 - 1),
    );
    assert.deepEqual(first.location.range, {
      start: 0,
      end: SYNTHESIS_MARKDOWN_READ_PAGE_UTF16 - 1,
    });
    assert.equal(first.sourceVersion, descriptor.sourceVersion);

    const secondStart = first.location.range.end;
    const second = await port.evidence.readSource({
      scope: catalog.scope,
      descriptor,
      location: {
        unit: "paragraph",
        field: null,
        range: {
          start: secondStart,
          end: secondStart + SYNTHESIS_MARKDOWN_READ_PAGE_UTF16,
        },
      },
    });
    assert.equal(second.outcome, "available");
    if (second.outcome !== "available") return;
    assert.equal(
      second.content,
      content.slice(
        secondStart,
        secondStart + SYNTHESIS_MARKDOWN_READ_PAGE_UTF16,
      ),
    );
    assert.deepEqual(second.location.range, {
      start: secondStart,
      end: secondStart + SYNTHESIS_MARKDOWN_READ_PAGE_UTF16,
    });
    assert.equal(second.sourceVersion, descriptor.sourceVersion);

    const oversizedPage = await port.evidence.readSource({
      scope: catalog.scope,
      descriptor,
      location: {
        unit: "paragraph",
        field: null,
        range: { start: 0, end: SYNTHESIS_MARKDOWN_READ_PAGE_UTF16 + 1 },
      },
    });
    assert.deepEqual(oversizedPage, { outcome: "invalid_source" });

    const beforeChange = await port.evidence.listSources(request);
    assert.isString(beforeChange.nextCursor);
    await writeUtf8(path, `${content}changed`);
    await rejects(
      port.evidence.listSources({
        ...request,
        cursor: beforeChange.nextCursor!,
      }),
      { code: "conflict" },
    );
    const stale = await port.evidence.readSource({
      scope: catalog.scope,
      descriptor,
      location: {
        unit: "paragraph",
        field: null,
        range: { start: secondStart, end: secondStart + 10 },
      },
    });
    assert.equal(stale.outcome, "source_changed");

    await writeUtf8(path, "x".repeat(8 * 1024 * 1024 + 1));
    const tooLarge = await port.evidence.readSource({
      scope: catalog.scope,
      descriptor,
      location: {
        unit: "paragraph",
        field: null,
        range: { start: 0, end: 1 },
      },
    });
    assert.deepEqual(tooLarge, { outcome: "source_read_failed" });
  });

  it("can verify an indexed title after Zotero evicts the paper from memory", async function () {
    const paper = await createPaper("COLD0001", "隧道衬砌台车");
    const ref = { libraryId: paper.libraryID, key: paper.key };
    const scope = { libraryIds: [ref.libraryId], itemRefs: [ref] };
    const port = createZoteroSynthesisHostReadPort({
      libraryId: ref.libraryId,
    });
    const items = Zotero.Items;
    const sync = items.getByLibraryAndKey;
    const asyncLookup = Object.getOwnPropertyDescriptor(
      items,
      "getByLibraryAndKeyAsync",
    );
    let cold = true;
    items.getByLibraryAndKey = function (...args) {
      if (cold) throw new Error("Item not yet loaded");
      return sync.apply(items, args);
    };
    Object.defineProperty(items, "getByLibraryAndKeyAsync", {
      configurable: true,
      value: async (library: number, key: string) => {
        cold = false;
        return sync.call(items, library, key);
      },
    });
    try {
      const page = await port.evidence.listSources({
        scope,
        sourceKinds: ["metadata"],
      });
      const descriptor = page.descriptors.find(
        (row) => row.source.kind === "metadata" && row.source.field === "title",
      )!;
      cold = true;
      const read = await port.evidence.readSource({ scope, descriptor });
      assert.equal(read.outcome, "available");
      if (read.outcome === "available")
        assert.equal(read.content, paper.getField("title"));
    } finally {
      items.getByLibraryAndKey = sync;
      if (asyncLookup)
        Object.defineProperty(items, "getByLibraryAndKeyAsync", asyncLookup);
      else Reflect.deleteProperty(items, "getByLibraryAndKeyAsync");
    }
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

  it("pages large canonical analysis only in retrieval mode", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const shortPaper = await createPaper("HOSTAN03", "Short analysis evidence");
    const shortNote = new Zotero.Item("note");
    shortNote.libraryID = libraryId;
    shortNote.parentItemID = shortPaper.id;
    shortNote.setField("title", "References");
    shortNote.setNote(
      managedArtifactContent("references", "References", {
        schema: "source_reference_artifact.v1",
        references: Array.from({ length: 2 }, (_, index) => ({
          ...referencesArtifact("short").references[0],
          sourceReferenceId: `short-${index}`,
          extraction: { raw: "x".repeat(40_000), confidence: 1 },
        })),
      }).content,
    );
    await shortNote.saveTx();
    const shortPort = createZoteroSynthesisHostReadPort({ libraryId });
    const shortCatalog = await shortPort.evidence.listSources({
      scope: {
        libraryIds: [libraryId],
        itemRefs: [{ libraryId, key: shortPaper.key }],
      },
      sourceKinds: ["analysis"],
    });
    const shortRead = await shortPort.evidence.readSource({
      scope: shortCatalog.scope,
      descriptor: shortCatalog.descriptors[0],
    });
    assert.equal(shortRead.outcome, "available");

    const paper = await createPaper("HOSTAN02", "Large analysis evidence");
    const payload = {
      schema: "source_reference_artifact.v1",
      references: Array.from({ length: 5 }, (_, index) => ({
        ...referencesArtifact("large").references[0],
        sourceReferenceId: `large-${index}`,
        extraction: {
          raw: `${"x".repeat(59_998)}${index === 4 ? "😀" : "xx"}`,
          confidence: 1,
        },
      })),
    };
    const note = new Zotero.Item("note");
    note.libraryID = libraryId;
    note.parentItemID = paper.id;
    note.setField("title", "References");
    note.setNote(
      managedArtifactContent("references", "References", payload).content,
    );
    await note.saveTx();
    const port = createZoteroSynthesisHostReadPort({ libraryId });
    const scope = {
      libraryIds: [libraryId],
      itemRefs: [{ libraryId, key: paper.key }],
    };
    const lexical = await port.evidence.listSources({
      scope,
      sourceKinds: ["analysis"],
    });
    assert.isEmpty(lexical.descriptors);
    const retrieval = await port.evidence.listSources({
      scope,
      sourceKinds: ["analysis"],
      scanMode: "retrieval",
    });
    assert.equal(retrieval.descriptors.length, 1, JSON.stringify(retrieval));
    const descriptor = retrieval.descriptors[0];
    assert.isAbove(descriptor.contentLength, 262_144);
    const unbounded = await port.evidence.readSource({
      scope: retrieval.scope,
      descriptor,
    });
    assert.equal(unbounded.outcome, "source_read_failed");
    const start = 270_000;
    const page = await port.evidence.readSource({
      scope: retrieval.scope,
      descriptor,
      location: {
        unit: "analysis_field",
        field: "$",
        range: { start, end: start + 8 },
      },
    });
    assert.equal(page.outcome, "available");
    if (page.outcome === "available") {
      assert.equal(page.location.range.end, start + 8);
      assert.equal(page.content, "xxxxxxxx");
    }
    const canonicalContent = canonicalizeSynthesisContractJson(payload)!;
    const emojiOffset = canonicalContent.lastIndexOf("😀");
    const splitSurrogate = await port.evidence.readSource({
      scope: retrieval.scope,
      descriptor,
      location: {
        unit: "analysis_field",
        field: "$",
        range: { start: emojiOffset - 3, end: emojiOffset + 1 },
      },
    });
    assert.equal(splitSurrogate.outcome, "available");
    if (splitSurrogate.outcome === "available") {
      assert.equal(splitSurrogate.location.range.end, emojiOffset);
      assert.equal(
        splitSurrogate.content,
        canonicalContent.slice(emojiOffset - 3, emojiOffset),
      );
    }
    const oversized = await port.evidence.readSource({
      scope: retrieval.scope,
      descriptor,
      location: {
        unit: "analysis_field",
        field: "$",
        range: { start: 0, end: 65_537 },
      },
    });
    assert.equal(oversized.outcome, "invalid_source");
    const changedPayload = {
      ...payload,
      references: payload.references.map((reference, index) =>
        index === 0
          ? {
              ...reference,
              extraction: { ...reference.extraction, raw: "changed" },
            }
          : reference,
      ),
    };
    note.setNote(
      managedArtifactContent("references", "References", changedPayload)
        .content,
    );
    await note.saveTx();
    const staleRange = await port.evidence.readSource({
      scope: retrieval.scope,
      descriptor,
      location: {
        unit: "analysis_field",
        field: "$",
        range: { start, end: start + 8 },
      },
    });
    assert.equal(staleRange.outcome, "source_changed");
  });

  it("continues sparse catalog batches with the appropriate scan-mode diagnostics", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const papers = [];
    for (let index = 0; index < 257; index += 1) {
      const paper = await createPaper(
        `B${index.toString(36).toUpperCase().padStart(7, "0")}`,
        `Budget ${index}`,
      );
      papers.push(paper);
    }
    const directory = await mkTempDir("synthesis-evidence-sparse-catalog");
    const path = joinPath(directory, "evidence.md");
    await writeUtf8(path, "Markdown after the first scan batch");
    const attachment = await addMarkdownAttachment(papers[256], path);
    const port = createZoteroSynthesisHostReadPort({ libraryId });
    const explicitScope = {
      libraryIds: [libraryId],
      itemRefs: papers.map(({ key }) => ({ libraryId, key })),
    };
    const request = {
      scope: explicitScope,
      sourceKinds: ["fulltext"] as ["fulltext"],
    };
    const first = await port.evidence.listSources(request);
    assert.isTrue(first.hasMore);
    assert.isNotNull(first.nextCursor);
    assert.isTrue(
      first.issues.some(
        (issue) =>
          issue.code === "scan_budget_exhausted" && issue.sourceKind === null,
      ),
    );
    const second = await port.evidence.listSources({
      ...request,
      cursor: first.nextCursor!,
    });
    assert.isFalse(second.hasMore);
    assert.isNull(second.nextCursor);

    const scan = {
      ...request,
      scope: { libraryIds: [libraryId], tag: "host-read" },
      scanMode: "retrieval" as const,
    };
    const empty = await port.evidence.listSources(scan);
    assert.isEmpty(empty.descriptors);
    assert.isEmpty(empty.issues);
    assert.isTrue(empty.hasMore);
    assert.isString(empty.nextCursor);
    const terminal = await port.evidence.listSources({
      ...scan,
      cursor: empty.nextCursor!,
    });
    assert.deepEqual(
      terminal.descriptors.map((row) => row.source),
      [{ kind: "fulltext", attachmentRef: { libraryId, key: attachment.key } }],
    );
    assert.isFalse(terminal.hasMore);
    const ordinary = await port.evidence.listSources({
      scope: scan.scope,
      sourceKinds: scan.sourceKinds,
    });
    assert.isString(ordinary.nextCursor);
    await rejects(
      port.evidence.listSources({ ...scan, cursor: ordinary.nextCursor! }),
      { code: "conflict" },
    );
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

  it("reads a canonical digest note body and hash instead of its payload object", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HOSTDIG1", "Host Digest");
    const markdown = "# Digest\n\nVisible digest body 😀";
    const note = new Zotero.Item("note");
    note.libraryID = libraryId;
    note.parentItemID = paper.id;
    note.setField("title", "digest");
    note.setNote(
      managedArtifactContent("digest", "Host Digest", { markdown }).content,
    );
    await note.saveTx();
    const port = createZoteroSynthesisHostReadPort({ libraryId });

    const scan = await port.artifacts.scanPage({
      libraryId,
      paperRefs: [`${libraryId}:${paper.key}`],
      artifactTypes: ["digest"],
      limit: 10,
    });
    const descriptor = scan.artifacts.find(
      (
        entry,
      ): entry is SynthesisHostArtifactDescriptor & {
        locator: string;
        payloadHash: string;
      } => entry.artifactType === "digest" && Boolean(entry.locator),
    );
    assert.isDefined(descriptor);
    assert.equal(descriptor!.status, "available");
    assert.equal(descriptor!.payloadHash, hashMarkdown(markdown));
    assert.equal(descriptor!.noteKey, note.key);
    assert.isNotEmpty(descriptor!.noteTitle);

    const available = await port.artifacts.read({
      locator: descriptor!.locator,
      expectedHash: descriptor!.payloadHash,
    });
    assert.equal(available.status, "available");
    assert.equal(available.content?.kind, "text");
    if (available.content?.kind !== "text") return;
    assert.equal(available.content.text, markdown);

    const changedMarkdown = "Changed digest body";
    note.setNote(
      managedArtifactContent("digest", "Host Digest", {
        markdown: changedMarkdown,
      }).content,
    );
    await note.saveTx();
    const stale = await port.artifacts.read({
      locator: descriptor!.locator,
      expectedHash: descriptor!.payloadHash,
    });
    assert.equal(stale.status, "stale");
    assert.equal(stale.currentHash, hashMarkdown(changedMarkdown));
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

  it("reads Synthesis readiness without the parent attachment list", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HOSTFST1", "Host Fast Readiness");
    await addPayloadNote(
      paper,
      "references-json",
      referencesArtifact("Fast Reference"),
    );
    const sourceCalls: Array<{
      domain: string;
      kind: string;
      parentItemId: number;
    }> = [];
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroSourcePageQueryAdapter(sourceCalls),
    );
    const port = createZoteroSynthesisHostReadPort({ libraryId });

    const readiness = await port.artifacts.readiness({
      libraryId,
      paperRefs: [`${libraryId}:${paper.key}`],
      artifactTypes: ["references"],
    });

    assert.equal(readiness.artifacts[0]?.status, "available");
    assert.isTrue(
      sourceCalls.some(
        (call) => call.domain === "notes" && call.parentItemId === paper.id,
      ),
    );
    assert.isFalse(
      sourceCalls.some(
        (call) =>
          call.domain === "attachments" && call.parentItemId === paper.id,
      ),
    );
  });

  it("fails the Synthesis readiness with a timeout after the deadline expires", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HOSTDLM1", "Host Deadline Readiness");
    await addPayloadNote(
      paper,
      "references-json",
      referencesArtifact("Deadline Reference"),
    );
    const port = createZoteroSynthesisHostReadPort({ libraryId });

    let failure: unknown;
    try {
      await port.artifacts.readiness(
        {
          libraryId,
          paperRefs: [`${libraryId}:${paper.key}`],
          artifactTypes: ["references"],
        },
        { deadlineAtMs: Date.now() - 1 },
      );
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, SynthesisClientError);
    assert.equal((failure as SynthesisClientError).code, "timeout");
    assert.equal(
      (failure as SynthesisClientError).details?.reason,
      "request_timeout",
    );
  });

  it("stops the Synthesis readiness when the caller signal is aborted", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HOSTABT1", "Host Canceled Readiness");
    await addPayloadNote(
      paper,
      "references-json",
      referencesArtifact("Canceled Reference"),
    );
    const port = createZoteroSynthesisHostReadPort({ libraryId });
    const cancellation = createCancellationController();
    cancellation.abort();

    let failure: unknown;
    try {
      await port.artifacts.readiness(
        {
          libraryId,
          paperRefs: [`${libraryId}:${paper.key}`],
          artifactTypes: ["references"],
        },
        { signal: cancellation.signal },
      );
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, SynthesisClientError);
    assert.equal((failure as SynthesisClientError).code, "timeout");
    assert.equal(
      (failure as SynthesisClientError).details?.reason,
      "request_canceled",
    );
  });

  it("stops the Host read at the deadline instead of scanning the next paper", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const first = await createPaper("HOSTDLM2", "Host Deadline First");
    const second = await createPaper("HOSTDLM3", "Host Deadline Second");
    await addPayloadNote(
      first,
      "references-json",
      referencesArtifact("Deadline First"),
    );
    await addPayloadNote(
      second,
      "references-json",
      referencesArtifact("Deadline Second"),
    );
    const sourceCalls: Array<{
      domain: string;
      kind: string;
      parentItemId: number;
    }> = [];
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroSourcePageQueryAdapter(sourceCalls, 40),
    );
    const port = createZoteroSynthesisHostReadPort({ libraryId });

    let failure: unknown;
    try {
      await port.artifacts.readiness(
        {
          libraryId,
          paperRefs: [
            `${libraryId}:${first.key}`,
            `${libraryId}:${second.key}`,
          ],
          artifactTypes: ["references"],
        },
        { deadlineAtMs: Date.now() + 20 },
      );
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, SynthesisClientError);
    assert.equal((failure as SynthesisClientError).code, "timeout");
    assert.equal(
      (failure as SynthesisClientError).details?.reason,
      "request_timeout",
    );

    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.isFalse(
      sourceCalls.some((call) => call.parentItemId === second.id),
      "the deadline must abort the Host read before the next paper",
    );
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

  it("keeps v2 literature quality without a fabricated paper type", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HOSTSCR2", "Host Score V2");
    await addPayloadNote(paper, "literature-score-json", literatureScoreV2());
    const port = createZoteroSynthesisHostReadPort({ libraryId });
    const scan = await port.artifacts.scanPage({
      libraryId,
      paperRefs: [`${libraryId}:${paper.key}`],
      artifactTypes: ["literature_score"],
      limit: 10,
    });
    const artifact = scan.artifacts[0];
    assert.isDefined(artifact);
    const literatureQuality = artifact.literatureQuality;
    assert.equal(literatureQuality?.schema, "literature_score.v2");
    assert.notProperty(literatureQuality, "paper_type");
    assert.doesNotThrow(() => rebuildSynthesisHostArtifactScanPageResult(scan));
    assert.throws(() =>
      rebuildSynthesisHostArtifactScanPageResult({
        ...scan,
        artifacts: [
          {
            ...artifact,
            literatureQuality: {
              ...literatureQuality,
              paper_type: "empirical",
            },
          },
        ],
      }),
    );
  });

  it("follows canonical note and payload pages before selecting an artifact", async function () {
    const libraryId = Zotero.Libraries.userLibraryID;
    const paper = await createPaper("HOSTPAGE", "Host Page Reads");
    const laterReferences = referencesArtifact("Later page reference");
    const sourceCalls: Array<{
      domain: string;
      kind: string;
      parentItemId: number;
    }> = [];
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
