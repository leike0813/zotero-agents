import { assert } from "chai";
import { createZoteroHostCapabilityBroker } from "../../../../src/modules/zoteroHostCapabilityBroker";
import { getZoteroManagedNoteLocalControl } from "../../../../src/modules/zoteroHost/zoteroManagedNotes";
import {
  buildWorkbenchPayloadPngBytes,
  encodeBase64Utf8,
  WORKBENCH_EMBEDDED_PAYLOAD_MARKER,
} from "../../../../src/modules/zoteroHost/notePayloadCodec";
import { runtimePathExists } from "../../../../src/modules/runtimePersistence";
import {
  createLiteratureArtifactMigrationHostFromZoteroBroker,
  createLiteratureArtifactMigrationService,
  resetLiteratureArtifactMigrationRuntimeForTests,
} from "../../../../src/modules/literatureArtifactMigration";
import { resetPluginStateStoreForTests } from "../../../../src/modules/pluginStateStore";
import { convertLegacyArtifactSet } from "../../../../src/modules/literatureArtifactMigration/converter";

function isRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: {
      __parity?: { runtime?: string };
    };
    IOUtils?: unknown;
    PathUtils?: unknown;
  };
  return (
    !!runtime.Zotero &&
    !!runtime.IOUtils &&
    !!runtime.PathUtils &&
    runtime.Zotero.__parity?.runtime !== "node-mock"
  );
}

const describeZotero = isRealZoteroRuntime() ? describe : describe.skip;

function operationId(label: string) {
  return `managed-note-transaction-${label}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

async function createParent(title: string) {
  const parent = new Zotero.Item("journalArticle");
  parent.setField("title", title);
  await parent.saveTx();
  return parent;
}

async function createLegacyNote(parent: Zotero.Item, content: string) {
  const note = new Zotero.Item("note");
  note.parentID = parent.id;
  note.setNote(content);
  await note.saveTx();
  return note;
}

async function createLegacyAttachmentPayloadNote(args: {
  parent: Zotero.Item;
  title: string;
  noteKind: "references" | "citation-analysis" | "literature-score";
  payloadType:
    | "references-json"
    | "citation-analysis-json"
    | "literature-score-json";
  payload: unknown;
  storageVersion?: 1 | 2;
}) {
  const note = await createLegacyNote(
    args.parent,
    `<div><h1>${args.title}</h1></div>`,
  );
  const envelope = {
    schemaVersion: 1,
    ...(args.storageVersion === 2
      ? {
          payloadStorageVersion: 2,
          format: "json",
          payloadHash: "pre-current-v2-hash",
        }
      : {}),
    kind: "zotero-skills-workbench-note-payload",
    noteKind: args.noteKind,
    payloadType: args.payloadType,
    payload: args.payload,
  };
  const png = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    ),
    (character) => character.charCodeAt(0),
  );
  const bytes =
    args.storageVersion === 2
      ? buildWorkbenchPayloadPngBytes(png, envelope)
      : (() => {
          const suffix = new TextEncoder().encode(
            `\n${WORKBENCH_EMBEDDED_PAYLOAD_MARKER}${encodeBase64Utf8(
              JSON.stringify(envelope),
            )}\n`,
          );
          const value = new Uint8Array(png.length + suffix.length);
          value.set(png);
          value.set(suffix, png.length);
          return value;
        })();
  const attachment = await Zotero.Attachments.importEmbeddedImage({
    blob: new Blob([bytes], { type: "image/png" }),
    parentItemID: note.id,
  });
  note.setNote(
    `<div><h1>${args.title}</h1><p data-zs-payload-anchor-container="1"><img data-attachment-key="${attachment.key}" data-zs-payload-anchor="${args.payloadType}"></p></div>`,
  );
  await note.saveTx();
  return { note, attachment };
}

function literatureScore(overallScore = 69.5) {
  return {
    schema: "literature_score.v1",
    rubric_id: "default-v1",
    paper_type: "empirical",
    paper_type_reason: "Measured evidence",
    overall_score: overallScore,
    confidence: 1,
    confidence_adjusted_score: overallScore,
    dimensions: [
      "methodological_rigor",
      "evidence_completeness",
      "reproducibility",
      "innovation_signals",
      "research_impact_potential",
      "writing_quality",
    ].map((dimension_key) => ({
      dimension_key,
      name: dimension_key,
      configured_weight: 1 / 6,
      effective_weight: 1 / 6,
      raw_score: 7,
      applicable_max_score: 10,
      score: overallScore,
      confidence: 1,
      summary: "Supported",
      criteria: [
        {
          criterion_key: dimension_key,
          name: "Evidence",
          status: "scored",
          score: 7,
          max_score: 10,
          reason: "Supported",
          evidence: [],
        },
      ],
    })),
  };
}

function parentRef(parent: Zotero.Item) {
  return { libraryId: parent.libraryID, key: parent.key };
}

function customEntry(title: string, markdown: string) {
  return {
    noteKind: "custom" as const,
    title,
    payload: { title, markdown },
  };
}

async function queryChildIds(parentId: number) {
  const rows = (await (Zotero.DB as any).queryAsync(
    "SELECT itemID FROM itemNotes WHERE parentItemID = ? ORDER BY itemID",
    [parentId],
  )) as Array<{ itemID: number }>;
  return rows.map((row) => Number(row.itemID));
}

describeZotero("managed note transaction in Zotero", function () {
  it("migrates v1/v2 and dual-v2 payload pairs through the Dashboard service", async function () {
    this.timeout(180000);
    const score = literatureScore();
    const cases = [
      { label: "without Score", referencesStorageVersion: 1 as const },
      {
        label: "with canonical Score",
        referencesStorageVersion: 2 as const,
        scorePayload: score,
        expectedScore: score.overall_score,
      },
      {
        label: "with historical Score",
        referencesStorageVersion: 1 as const,
        scorePayload: {
          version: 1,
          entry: "artifacts/literature_score.json",
          format: "json",
          literature_score: score,
        },
        expectedScore: score.overall_score,
      },
      {
        label: "with damaged Score",
        referencesStorageVersion: 2 as const,
        scorePayload: { invalid: true },
      },
    ];
    for (const migrationCase of cases) {
      const { referencesStorageVersion } = migrationCase;
      const parent = await createParent(
        `Dashboard migration transaction ${migrationCase.label}`,
      );
      const references = {
        items: [{ title: "A Study", year: 2024, authors: ["Ada Lovelace"] }],
      };
      const citation = {
        items: [
          {
            title: "A Study",
            year: 2024,
            authors: ["Ada Lovelace"],
            mentions: [{ rawCitation: "Lovelace (2024)" }],
          },
        ],
      };
      const legacyReferences = await createLegacyAttachmentPayloadNote({
        parent,
        title: "References",
        noteKind: "references",
        payloadType: "references-json",
        payload: references,
        storageVersion: referencesStorageVersion,
      });
      const legacyCitation = await createLegacyAttachmentPayloadNote({
        parent,
        title: "Citation Analysis",
        noteKind: "citation-analysis",
        payloadType: "citation-analysis-json",
        payload: citation,
        storageVersion: 2,
      });
      const scoreNote = migrationCase.scorePayload
        ? await createLegacyAttachmentPayloadNote({
            parent,
            title: "Literature Score",
            noteKind: "literature-score",
            payloadType: "literature-score-json",
            payload: migrationCase.scorePayload,
            storageVersion: 2,
          })
        : null;
      const scoreBytesBefore = scoreNote
        ? await IOUtils.read(await scoreNote.attachment.getFilePathAsync())
        : null;
      try {
        const db = Zotero.DB as any;
        const originalExecuteTransaction = db.executeTransaction;
        const sourceAttachmentIds = new Set([
          legacyReferences.attachment.id,
          legacyCitation.attachment.id,
          ...(scoreNote ? [scoreNote.attachment.id] : []),
        ]);
        const poisonedAttachments: Array<{
          attachment: Zotero.Item;
          getField: Zotero.Item["getField"];
          getDisplayTitle: unknown;
        }> = [];
        const broker = createZoteroHostCapabilityBroker();
        const service = createLiteratureArtifactMigrationService({
          host: createLiteratureArtifactMigrationHostFromZoteroBroker(broker),
        });
        const preview = await service.scan({ libraryId: parent.libraryID });
        assert.isTrue(preview.ok);
        if (!preview.ok) throw new Error("expected migration preview");
        const candidate = preview.candidates.find(
          (entry) => entry.parentRef.key === parent.key,
        );
        assert.isOk(candidate);
        assert.equal(candidate?.classification, "ready");

        if (referencesStorageVersion === 2) {
          db.executeTransaction = async function (
            work: () => Promise<unknown>,
            options?: unknown,
          ) {
            const transactionResult = await originalExecuteTransaction.call(
              this,
              work,
              options,
            );
            for (const noteId of await queryChildIds(parent.id)) {
              const note = Zotero.Items.get(noteId);
              for (const attachmentId of note?.getAttachments?.() || []) {
                if (sourceAttachmentIds.has(attachmentId)) continue;
                const attachment = Zotero.Items.get(attachmentId)!;
                poisonedAttachments.push({
                  attachment,
                  getField: attachment.getField,
                  getDisplayTitle: (attachment as any).getDisplayTitle,
                });
                attachment.getField = () => {
                  throw new Error("committed attachment is unloaded");
                };
                (attachment as any).getDisplayTitle = () => {
                  throw new Error("committed attachment is unloaded");
                };
              }
            }
            return transactionResult;
          };
        }
        let result;
        try {
          result = await service.apply({
            scanOperationId: preview.operationId,
            candidateIds: [candidate!.candidateId],
          });
        } finally {
          db.executeTransaction = originalExecuteTransaction;
          for (const poisoned of poisonedAttachments) {
            poisoned.attachment.getField = poisoned.getField;
            (poisoned.attachment as any).getDisplayTitle =
              poisoned.getDisplayTitle;
          }
        }
        assert.isTrue(result.ok);
        if (!result.ok) throw new Error("expected migration result");
        assert.equal(result.state, "completed");
        assert.deepEqual(JSON.parse(JSON.stringify(result)), result);

        const control = getZoteroManagedNoteLocalControl(broker);
        const kinds = await Promise.all(
          (await queryChildIds(parent.id))
            .filter((itemId) => itemId !== scoreNote?.note.id)
            .map(async (itemId) => {
              const note = Zotero.Items.get(itemId)!;
              assert.lengthOf(note.getAttachments(), 1);
              const transfer = await control.readForTransfer({
                libraryId: note.libraryID,
                key: note.key,
              });
              return transfer.detail.kind === "managed"
                ? transfer.detail.noteKind
                : transfer.detail.kind;
            }),
        );
        assert.sameMembers(kinds, ["references", "citation-analysis"]);
        if (scoreNote && scoreBytesBefore) {
          const retainedNote = Zotero.Items.get(scoreNote.note.id)!;
          const retainedAttachment = Zotero.Items.get(scoreNote.attachment.id)!;
          assert.equal(retainedNote.key, scoreNote.note.key);
          assert.equal(retainedAttachment.key, scoreNote.attachment.key);
          assert.isFalse(Boolean(retainedNote.deleted));
          assert.isFalse(Boolean(retainedAttachment.deleted));
          assert.deepEqual(
            Array.from(
              await IOUtils.read(await retainedAttachment.getFilePathAsync()),
            ),
            Array.from(scoreBytesBefore),
          );
          let scoreDetail;
          let scoreError: unknown;
          try {
            scoreDetail = await broker.library.getNoteDetail(
              { libraryId: retainedNote.libraryID, key: retainedNote.key },
              { format: "html" },
            );
          } catch (error) {
            scoreError = error;
          }
          if (migrationCase.expectedScore !== undefined) {
            assert.equal(
              scoreDetail?.kind,
              "managed",
              `${migrationCase.label}: ${JSON.stringify({
                code: (scoreError as { code?: string } | undefined)?.code,
                message:
                  scoreError instanceof Error ? scoreError.message : scoreError,
              })}`,
            );
            if (scoreDetail?.kind === "managed") {
              assert.equal(scoreDetail.noteKind, "literature-score");
              assert.equal(
                (scoreDetail.payload as { overall_score?: number })
                  .overall_score,
                migrationCase.expectedScore,
              );
            }
          } else {
            assert.equal(
              (scoreError as { code?: string } | undefined)?.code,
              "invalid_artifact",
            );
          }
        }
        const oldReferences = Zotero.Items.get(legacyReferences.attachment.id);
        assert.isTrue(
          referencesStorageVersion === 1
            ? Boolean(oldReferences?.deleted)
            : !oldReferences || Boolean(oldReferences.deleted),
        );
        assert.isTrue(
          !Zotero.Items.get(legacyCitation.attachment.id) ||
            Boolean(Zotero.Items.get(legacyCitation.attachment.id)?.deleted),
        );
      } finally {
        resetLiteratureArtifactMigrationRuntimeForTests();
        resetPluginStateStoreForTests();
        await Zotero.Items.trashTx([parent.id]);
      }
    }
  });

  it("repairs an oversized nested Citation against canonical References", async function () {
    this.timeout(180000);
    const parent = await createParent("Managed oversized Citation repair");
    try {
      const conversion = convertLegacyArtifactSet(
        {
          libraryId: parent.libraryID,
          parentRef: parentRef(parent),
          references: [
            { title: "A Study", year: 2024, authors: ["Ada Lovelace"] },
          ],
        },
        { idFactory: () => "source-reference-1" },
      );
      const broker = createZoteroHostCapabilityBroker();
      const control = getZoteroManagedNoteLocalControl(broker);
      const referencesWrite = await control.applyParentSet(
        {
          operationId: operationId("canonical-references"),
          parentRef: parentRef(parent),
          references: conversion.references,
        },
        { ownerId: "test-managed-note-transaction" },
      );
      assert.oneOf(referencesWrite.outcome, ["committed", "unchanged"]);

      const canonicalReferencesNote = (
        await Promise.all(
          (await queryChildIds(parent.id)).map(async (itemId) => {
            const note = Zotero.Items.get(itemId)!;
            const transfer = await control.readForTransfer({
              libraryId: note.libraryID,
              key: note.key,
            });
            return transfer.detail.kind === "managed" &&
              transfer.detail.noteKind === "references"
              ? note
              : null;
          }),
        )
      ).find(Boolean)!;
      const snippet = `${"x".repeat(900)} [1] ${"y".repeat(900)}`;
      const oversizedCitation = await createLegacyAttachmentPayloadNote({
        parent,
        title: "Citation Analysis",
        noteKind: "citation-analysis",
        payloadType: "citation-analysis-json",
        payload: {
          items: [
            {
              reference: {
                title: "A Study",
                year: 2024,
                authors: ["Ada Lovelace"],
              },
              metadata: { role_in_context: "baseline" },
              mentions: Array.from({ length: 800 }, () => ({
                marker: "[1]",
                snippet,
              })),
            },
          ],
        },
        storageVersion: 2,
      });
      const sourceBytes = await IOUtils.read(
        await oversizedCitation.attachment.getFilePathAsync(),
      );
      assert.isAbove(sourceBytes.byteLength, 1024 * 1024);
      assert.isBelow(sourceBytes.byteLength, 4 * 1024 * 1024);

      const service = createLiteratureArtifactMigrationService({
        host: createLiteratureArtifactMigrationHostFromZoteroBroker(broker),
      });
      const preview = await service.scan({ libraryId: parent.libraryID });
      assert.isTrue(preview.ok);
      if (!preview.ok) throw new Error("expected migration preview");
      const candidate = preview.candidates.find(
        (entry) => entry.parentRef.key === parent.key,
      );
      assert.equal(candidate?.classification, "ready");

      const result = await service.apply({
        scanOperationId: preview.operationId,
        candidateIds: [candidate!.candidateId],
      });
      assert.isTrue(result.ok);
      if (!result.ok) throw new Error("expected migration result");
      const diagnostics = service.buildDiagnosticBundle({
        runId: result.runId,
      });
      assert.equal(
        result.state,
        "completed",
        JSON.stringify(diagnostics.ok ? diagnostics.bundle : diagnostics),
      );

      const managed = await Promise.all(
        (await queryChildIds(parent.id)).map(async (itemId) => {
          const note = Zotero.Items.get(itemId)!;
          return {
            note,
            transfer: await control.readForTransfer({
              libraryId: note.libraryID,
              key: note.key,
            }),
          };
        }),
      );
      const references = managed.find(
        ({ transfer }) =>
          transfer.detail.kind === "managed" &&
          transfer.detail.noteKind === "references",
      );
      const citation = managed.find(
        ({ transfer }) =>
          transfer.detail.kind === "managed" &&
          transfer.detail.noteKind === "citation-analysis",
      );
      assert.equal(references?.note.key, canonicalReferencesNote.key);
      assert.isOk(citation);
      if (citation?.transfer.detail.kind !== "managed") {
        throw new Error("expected managed Citation");
      }
      const payload = citation.transfer.detail.payload as {
        items: Array<{
          sourceReferenceId: string;
          role_in_context: string | null;
          mentions: Array<{ marker: string; snippet: string }>;
        }>;
      };
      assert.equal(payload.items[0]?.sourceReferenceId, "source-reference-1");
      assert.equal(payload.items[0]?.role_in_context, "baseline");
      assert.equal(payload.items[0]?.mentions.length, 800);
      assert.isTrue(
        payload.items[0]!.mentions.every(
          (mention) =>
            Array.from(mention.snippet).length <= 512 &&
            mention.snippet.includes(mention.marker),
        ),
      );
      assert.isTrue(
        !Zotero.Items.get(oversizedCitation.attachment.id) ||
          Boolean(Zotero.Items.get(oversizedCitation.attachment.id)?.deleted),
      );
    } finally {
      resetLiteratureArtifactMigrationRuntimeForTests();
      resetPluginStateStoreForTests();
      await Zotero.Items.trashTx([parent.id]);
    }
  });

  it("returns canonical Citation detail when optional enrichment exceeds the limit", async function () {
    this.timeout(120000);
    const parent = await createParent("Managed Citation preserved view");
    try {
      const conversion = convertLegacyArtifactSet(
        {
          libraryId: parent.libraryID,
          parentRef: parentRef(parent),
          references: [
            {
              sourceReferenceId: "REF-A",
              title: "A Study",
              year: 2024,
              authors: ["Ada Lovelace"],
            },
          ],
          citation: {
            items: [
              {
                sourceReferenceId: "REF-A",
                mentions: [{ rawCitation: "Lovelace (2024)" }],
              },
            ],
          },
        },
        { idFactory: () => "REF-A" },
      );
      const citation = {
        ...conversion.citation!,
        items: Array.from({ length: 5 }, (_, index) => ({
          ...conversion.citation!.items[0],
          role_in_context: "&".repeat(30_000),
          topic: "&".repeat(30_000),
          usage: "&".repeat(30_000),
          summary: "&".repeat(50_000),
          key_reference_reason: "&".repeat(30_000),
          mentions: conversion.citation!.items[0]!.mentions.map((mention) => ({
            ...mention,
            mention_id: `${mention.mention_id}-${index}`,
          })),
        })),
      };
      const visibleHtml =
        "<div><h1>Citation Analysis</h1><p>Preserved migration view</p></div>";
      const result = await getZoteroManagedNoteLocalControl(
        createZoteroHostCapabilityBroker(),
      ).applyParentSet(
        {
          operationId: operationId("preserved-citation-view"),
          parentRef: parentRef(parent),
          entries: [
            {
              noteKind: "references",
              title: "References",
              payload: conversion.references,
            },
            {
              noteKind: "citation-analysis",
              title: "Citation Analysis",
              payload: citation,
              visibleHtml,
            },
          ],
        },
        { ownerId: "test-managed-note-transaction" },
      );

      assert.oneOf(
        result.outcome,
        ["committed", "unchanged"],
        JSON.stringify(result),
      );
      if (result.outcome !== "committed" && result.outcome !== "unchanged") {
        throw new Error("Citation parent-set write must commit");
      }
      assert.isUndefined(result.result.notes[1]?.markdown);
      const citationNote = (await queryChildIds(parent.id))
        .map((itemId) => Zotero.Items.get(itemId))
        .find((note) => note?.getNote().includes("Preserved migration view"));
      assert.isOk(citationNote);
    } finally {
      resetPluginStateStoreForTests();
      await Zotero.Items.trashTx([parent.id]);
    }
  });

  it("tightens opted-in Citation snippets until the exact managed envelope fits", async function () {
    this.timeout(120000);
    const parent = await createParent("Managed Citation snippet compaction");
    try {
      const conversion = convertLegacyArtifactSet(
        {
          libraryId: parent.libraryID,
          parentRef: parentRef(parent),
          references: [
            {
              sourceReferenceId: "REF-A",
              title: "A Study",
              year: 2024,
              authors: ["Ada Lovelace"],
            },
          ],
          citation: {
            items: [
              {
                sourceReferenceId: "REF-A",
                mentions: [{ rawCitation: "Lovelace (2024)" }],
              },
            ],
          },
        },
        { idFactory: () => "REF-A" },
      );
      const citation = {
        ...conversion.citation!,
        unresolved: Array.from({ length: 1_000 }, (_, index) => ({
          mention_id: `unresolved-${index}`,
          marker: null,
          style: null,
          line_start: null,
          line_end: null,
          snippet: "&".repeat(512),
          ref_number_hint: null,
          year_hint: null,
          surname_hint: null,
          citation_label_hint: null,
          citekey_hint: null,
          reason: "unmatched",
        })),
      };
      const broker = createZoteroHostCapabilityBroker();
      const control = getZoteroManagedNoteLocalControl(broker);
      const strict = await control.applyParentSet(
        {
          operationId: operationId("strict-citation-size"),
          parentRef: parentRef(parent),
          references: conversion.references,
          citationAnalysis: citation,
        },
        { ownerId: "test-managed-note-transaction" },
      );
      assert.equal(strict.outcome, "failed");
      if (strict.outcome !== "failed") {
        throw new Error(
          "strict Citation write must reject the oversized envelope",
        );
      }
      assert.equal(strict.attempt.error.code, "resource_limited");

      const compacted = await control.applyParentSet(
        {
          operationId: operationId("compact-citation-size"),
          parentRef: parentRef(parent),
          compactCitationSnippets: true,
          references: conversion.references,
          citationAnalysis: citation,
        },
        { ownerId: "test-managed-note-transaction" },
      );
      assert.oneOf(
        compacted.outcome,
        ["committed", "unchanged"],
        JSON.stringify(compacted),
      );
      if (
        compacted.outcome !== "committed" &&
        compacted.outcome !== "unchanged"
      ) {
        throw new Error("compacted Citation write must commit");
      }
      const report = compacted.result.citationSnippetCompaction!;
      assert.isBelow(report.finalMaxCharacters, 512);
      assert.equal(report.truncatedSnippetCount, 1_000);
      assert.isBelow(report.finalPayloadBytes, report.originalPayloadBytes);
      const storedCitation = compacted.result.notes.find(
        (note) => note.noteKind === "citation-analysis",
      )!;
      assert.isTrue(
        (storedCitation.payload as any).unresolved.every(
          (mention: any) =>
            Array.from(String(mention.snippet || "")).length <=
            report.finalMaxCharacters,
        ),
      );
    } finally {
      resetPluginStateStoreForTests();
      await Zotero.Items.trashTx([parent.id]);
    }
  });

  it("commits the private parent set and its payload attachment in one native transaction", async function () {
    this.timeout(120000);
    const parent = await createParent("Managed note transaction success");
    const db = Zotero.DB as any;
    const attachmentsApi = Zotero.Attachments as any;
    const originalStorageDirectory =
      attachmentsApi.getStorageDirectoryByLibraryAndKey;
    const preparedStoragePaths = new Set<string>();
    attachmentsApi.getStorageDirectoryByLibraryAndKey = function (
      ...args: any[]
    ) {
      const file = originalStorageDirectory.apply(this, args);
      const path = String(file?.path || "").trim();
      if (path) preparedStoragePaths.add(path);
      return file;
    };
    const originalExecuteTransaction = db.executeTransaction;
    let depth = 0;
    let maxDepth = 0;
    db.executeTransaction = async function (
      run: () => Promise<unknown>,
      options?: unknown,
    ) {
      depth += 1;
      maxDepth = Math.max(maxDepth, depth);
      try {
        return await originalExecuteTransaction.call(this, run, options);
      } finally {
        depth -= 1;
      }
    };
    try {
      const broker = createZoteroHostCapabilityBroker();
      const result = await getZoteroManagedNoteLocalControl(
        broker,
      ).applyParentSet(
        {
          operationId: operationId("success"),
          parentRef: parentRef(parent),
          entries: [customEntry("Transaction success", "first managed note")],
        },
        { ownerId: "test-managed-note-transaction" },
      );
      assert.oneOf(result.outcome, ["committed", "unchanged"]);
      const childIds = await queryChildIds(parent.id);
      assert.lengthOf(childIds, 1);
      const note = Zotero.Items.get(childIds[0]);
      assert.isOk(note);
      assert.isTrue(note.isNote());
      const attachmentIds = note.getAttachments();
      assert.lengthOf(attachmentIds, 1);
      const attachment = Zotero.Items.get(attachmentIds[0]);
      assert.isOk(attachment);
      assert.isTrue(await runtimePathExists(String(attachment!.getFilePath())));
      assert.strictEqual(maxDepth, 1);
    } finally {
      attachmentsApi.getStorageDirectoryByLibraryAndKey =
        originalStorageDirectory;
      db.executeTransaction = originalExecuteTransaction;
      await Zotero.Items.trashTx([parent.id]);
    }
  });

  it("retains canonical notes and settles one parent-set receipt when migration cleanup fails", async function () {
    this.timeout(120000);
    const parent = await createParent("Managed migration cleanup failure");
    const legacyNote = await createLegacyNote(
      parent,
      '<p data-zs-payload="references-json">legacy</p>',
    );
    try {
      const broker = createZoteroHostCapabilityBroker();
      const control = getZoteroManagedNoteLocalControl(broker);
      const transferred = await control.readLegacyForMigration({
        libraryId: parent.libraryID,
        key: legacyNote.key,
      });
      const op = operationId("cleanup-failure");
      const result = await control.applyParentSet(
        {
          operationId: op,
          parentRef: parentRef(parent),
          entries: [
            customEntry("Canonical after cleanup failure", "canonical"),
          ],
          migrationCleanup: {
            notes: [
              {
                ref: { libraryId: parent.libraryID, key: legacyNote.key },
                expectedRevision: transferred.revision,
                cleanHtml: "<p>cleaned</p>",
              },
            ],
            payloadRefs: [
              { libraryId: parent.libraryID, key: "MISSING-PAYLOAD" },
            ],
          },
        },
        { ownerId: "test-managed-note-transaction" },
      );
      assert.equal(result.outcome, "repair_required");
      assert.equal(result.attempt.error.code, "execution_failed");
      assert.equal(result.attempt.error.phase, "cleanup");
      assert.equal(result.attempt.operationId, op);

      const childIds = await queryChildIds(parent.id);
      assert.lengthOf(childIds, 2);
      const details = await Promise.all(
        childIds
          .filter((id) => id !== legacyNote.id)
          .map(async (id) => {
            const note = Zotero.Items.get(id);
            assert.isOk(note);
            return control.readForTransfer({
              libraryId: parent.libraryID,
              key: note!.key,
            });
          }),
      );
      assert.isTrue(
        details.some(
          (entry) =>
            entry.detail.kind === "managed" &&
            entry.detail.noteKind === "custom" &&
            entry.detail.payload &&
            typeof entry.detail.payload === "object" &&
            !Array.isArray(entry.detail.payload) &&
            entry.detail.payload.markdown === "canonical",
        ),
      );
      assert.equal(
        Zotero.Items.get(legacyNote.id)?.getNote(),
        '<p data-zs-payload="references-json">legacy</p>',
      );
    } finally {
      await Zotero.Items.trashTx([parent.id]);
    }
  });
});
