import { assert } from "chai";
import {
  getSelectedImportCandidateForKind,
  previewLegacyArtifactSetForImport,
} from "../../workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs";
import { nativeFixtureMutations as handlers } from "../helpers/nativeFixtureMutations";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import {
  buildSelectionContext,
  itemRef,
} from "../helpers/workflowSelectionContext";
import { installWorkflowEditorSessionOverrideForTests } from "../../src/modules/workflow/ui/workflowEditorHost";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  executeApplyResult as executeWorkflowApplyResult,
  executeBuildRequests,
} from "../../src/workflows/runtime";
import {
  decodeBase64Utf8,
  encodeBase64Utf8,
  isZoteroRuntime,
  joinPath,
  mkTempDir,
  listDirNames,
  readBytes,
  readUtf8,
  writeBytes,
  workflowsPath,
  writeUtf8,
} from "../zotero/workflow-test-utils";
import { isFullTestMode } from "../zotero/testMode";
import {
  extractExistingRepresentativeImageKeys,
  resolveRepresentativeImageMarkdownImportCandidate,
} from "../../workflows_builtin/literature-workbench-package/lib/representativeImage.mjs";
import { analyzeNoteItemForDebug } from "../../workflows_builtin/literature-workbench-package/debug-note-artifact-inspector/hooks/applyResult.mjs";
import { parseEmbeddedNotePayloadBlock } from "../../src/modules/zoteroHost/notePayloadCodec";
import { createWorkflowHostApi } from "../../src/workflows/hostApi";
import {
  createConversationNote,
  exportGeneratedNoteCandidate,
  importCustomNotes,
} from "../../workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs";
import { createWorkflowPreparedImageScope } from "../../src/workflows/workflowNoteImagePreparation";
import { generateSourceReferenceId } from "../../packages/synthesis-contracts/src/sourceReferenceArtifact";
import {
  resetZoteroLibrarySourcePageQueryAdapterForTests,
  setZoteroLibrarySourcePageQueryAdapterForTests,
} from "../../src/modules/zoteroHost/zoteroLibraryPageQuery";
import { createMockZoteroLibrarySourcePageQueryAdapter } from "../helpers/zoteroLibraryPageQueryAdapter";

type LoadedWorkflow = Awaited<
  ReturnType<typeof loadWorkflowManifests>
>["workflows"][number];

const preparedImageScopes = new Set<
  ReturnType<typeof createWorkflowPreparedImageScope>
>();

async function executeApplyResult(
  args: Parameters<typeof executeWorkflowApplyResult>[0],
) {
  const parent =
    args.parent &&
    typeof args.parent === "object" &&
    "libraryID" in (args.parent as Record<string, unknown>)
      ? itemRef(args.parent as any)
      : args.parent;
  return executeWorkflowApplyResult({ ...args, parent });
}

function createPreparedImageTestHost(onReadPath?: (path: string) => void) {
  const scope = createWorkflowPreparedImageScope({
    runScopeId: `note-import-export:${preparedImageScopes.size + 1}`,
    adapter: {
      async readPathBlob(path, mimeType) {
        onReadPath?.(path);
        const signature =
          mimeType === "image/png"
            ? new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
            : new Uint8Array([255, 216, 255, 224]);
        return new Blob([signature], { type: mimeType });
      },
      async decode() {
        return { image: {}, width: 640, height: 360, close() {} };
      },
      createEncoder() {
        return {
          async encode(mimeType) {
            return new Blob([new Uint8Array([9, 8, 7])], { type: mimeType });
          },
        };
      },
    },
  });
  preparedImageScopes.add(scope);
  return createWorkflowHostApi({
    ownerId: `note-import-export-host:${preparedImageScopes.size}`,
    owners: { images: scope.owner },
    preparedImages: { resolve: scope.resolve },
  });
}

function renderPayloadBlock(payloadType: string, payload: unknown) {
  return `<span data-zs-block="payload" data-zs-payload="${payloadType}" data-zs-version="1" data-zs-encoding="base64" data-zs-value="${encodeBase64Utf8(JSON.stringify(payload))}"></span>`;
}

function renderPlainMarkdownPayloadBlock(
  payloadType: string,
  markdown: string,
) {
  return `<span data-zs-block="payload" data-zs-payload="${payloadType}" data-zs-version="1" data-zs-encoding="base64" data-zs-value="${encodeBase64Utf8(markdown)}"></span>`;
}

function buildDigestNoteContent(markdown: string) {
  return [
    '<div data-zs-note-kind="digest">',
    "<h1>Digest</h1>",
    '<div data-zs-view="digest-html"><p>Digest HTML</p></div>',
    renderPlainMarkdownPayloadBlock("digest-markdown", markdown),
    "</div>",
  ].join("\n");
}

function buildDigestNoteContentWithRepresentativeImage(
  markdown: string,
  attachmentKey: string,
) {
  return [
    '<div data-zs-note-kind="digest">',
    "<h1>Digest</h1>",
    '<div data-zs-block="representative-image" data-zs-version="1" data-zs-representative_image_status="embedded" data-zs-representative_image_attachment_key="' +
      attachmentKey +
      '">',
    '<figure data-zs-block="representative-image-figure">',
    `<img data-attachment-key="${attachmentKey}" alt="Figure 2" />`,
    "<figcaption>Figure 2</figcaption>",
    "</figure>",
    "</div>",
    '<div data-zs-view="digest-html"><p>Digest HTML</p></div>',
    renderPlainMarkdownPayloadBlock("digest-markdown", markdown),
    "</div>",
  ].join("\n");
}

function buildNativeReferencesArtifact() {
  return {
    schema: "source_reference_artifact.v1",
    references: [
      {
        sourceReferenceId: "source-ref-structured",
        extraction: {
          raw: "Alice Zhang. Structured Reference. 2024.",
          confidence: 0.92,
        },
        bibliography: {
          title: "Structured Reference",
          authors: ["Alice Zhang"],
          year: 2024,
        },
        matching: {},
      },
    ],
  };
}

function buildReferencesPayloadWrapper() {
  return buildNativeReferencesArtifact();
}

function buildReferencesNoteContent() {
  return [
    '<div data-zs-note-kind="references">',
    "<h1>References</h1>",
    '<table data-zs-view="references-table"><tbody><tr><td>1</td></tr></tbody></table>',
    renderPayloadBlock("references-json", buildReferencesPayloadWrapper()),
    "</div>",
  ].join("\n");
}

function buildNativeCitationArtifact() {
  return {
    schema: "citation_analysis_artifact.v1",
    meta: {
      language: "en",
      scope: {
        section_title: "Results",
        line_start: 1,
        line_end: 12,
      },
      scope_source: null,
      scope_decision: {
        selection_reason: null,
        covered_sections: [],
        fallback_from: null,
        fallback_reason: null,
      },
      mapping_reliability: "normal",
      reference_extraction: {
        status: "completed",
      },
    },
    summary: "Summary text",
    timeline: {
      early: { summary: "", sourceReferenceIds: [] },
      mid: { summary: "", sourceReferenceIds: [] },
      recent: { summary: "", sourceReferenceIds: [] },
    },
    items: [],
    unresolved: [],
  };
}

function buildCitationPayloadWrapper() {
  return buildNativeCitationArtifact();
}

function buildCitationNoteContent() {
  return [
    '<div data-zs-note-kind="citation-analysis">',
    "<h1>Citation Analysis</h1>",
    '<div data-zs-view="citation-analysis-html"><p>Structured report</p></div>',
    renderPayloadBlock("citation-analysis-json", {
      ...buildCitationPayloadWrapper(),
      referencesBasis: "sha256:test-references-basis",
    }),
    "</div>",
  ].join("\n");
}

function buildNativeLiteratureScoreArtifact() {
  return {
    schema: "literature_score.v1",
    rubric_id: "default.v1",
    paper_type: "empirical",
    paper_type_reason: "Empirical evaluation.",
    overall_score: 60,
    confidence: 0.8,
    confidence_adjusted_score: 58,
    dimensions: [
      "methodological_rigor",
      "evidence_completeness",
      "reproducibility",
      "innovation_signals",
      "research_impact_potential",
      "writing_quality",
    ].map((dimension_key) => ({
      dimension_key,
      name: dimension_key.replaceAll("_", " "),
      score: 60,
      confidence: 0.8,
      summary: `${dimension_key} summary`,
      configured_weight: 1 / 6,
      effective_weight: 1 / 6,
      raw_score: 6,
      applicable_max_score: 10,
      criteria: [
        {
          criterion_key: `${dimension_key}.evidence`,
          name: "Evidence",
          status: "scored",
          score: 6,
          max_score: 10,
          reason: "Source evidence",
          evidence: [],
        },
      ],
    })),
  };
}

function buildLiteratureScoreNoteContent() {
  return [
    '<div data-zs-note-kind="literature-score">',
    "<h1>Literature Score</h1>",
    renderPayloadBlock(
      "literature-score-json",
      buildNativeLiteratureScoreArtifact(),
    ),
    "</div>",
  ].join("\n");
}

function buildConversationNoteContent(
  markdown: string,
  entry = "artifacts/conversation-note.md",
  title = "Conversation Note 2604052113",
) {
  return [
    '<div data-zs-note-kind="conversation-note">',
    `<h1>${title}</h1>`,
    '<div data-zs-view="conversation-note-html"><p>Conversation HTML</p></div>',
    renderPayloadBlock("conversation-note-markdown", {
      version: 1,
      path: entry,
      format: "markdown",
      content: markdown,
    }),
    "</div>",
  ].join("\n");
}

async function getWorkflow(workflowId: string): Promise<LoadedWorkflow> {
  const loaded = await loadWorkflowManifests(workflowsPath());
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === workflowId,
  );
  assert.isOk(
    workflow,
    `workflow ${workflowId} not found; loaded=${loaded.workflows.map((entry) => entry.manifest.id).join(",")} warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
  );
  return workflow!;
}

function parsePayload(noteContent: string, payloadType: string) {
  const match = String(noteContent || "").match(
    new RegExp(
      `data-zs-payload=(["'])${payloadType}\\1[^>]*data-zs-value=(["'])([^"']+)\\2`,
      "i",
    ),
  );
  assert.isOk(match, `payload ${payloadType} should exist`);
  return JSON.parse(decodeBase64Utf8(match![3]));
}

function hasGeneratedHeading(note: Zotero.Item, title: string) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`<h1[^>]*>\\s*${escaped}\\s*</h1>`, "i").test(
    note.getNote(),
  );
}

function findGeneratedNoteByHeading(notes: Zotero.Item[], title: string) {
  return notes.find((entry) => hasGeneratedHeading(entry, title));
}

async function parseStoredPayload(note: Zotero.Item, payloadType: string) {
  try {
    const payload = parsePayload(note.getNote(), payloadType);
    return typeof payload === "string" ? { content: payload } : payload;
  } catch {
    // New literature-workbench generated notes store machine payloads in
    // note-child embedded-image attachments so Zotero's note editor can
    // normalize visible HTML without damaging exports.
  }
  for (const attachmentId of note.getAttachments()) {
    const attachment = Zotero.Items.get(attachmentId);
    const filePath = String((await attachment?.getFilePathAsync?.()) || "");
    if (!filePath) {
      continue;
    }
    const block = parseEmbeddedNotePayloadBlock(await readBytes(filePath), {
      key: attachment?.key,
      id: attachment?.id,
    });
    if (block?.payloadType === payloadType && !block.errors?.length) {
      return typeof block.payload === "string"
        ? { content: block.payload }
        : block.payload;
    }
  }
  assert.fail(`payload ${payloadType} should exist`);
}

function createNodeDatabaseValue() {
  const sourceQueryAdapter = createMockZoteroLibrarySourcePageQueryAdapter();
  return {
    executeTransaction: (run: () => Promise<void>) => run(),
    async queryAsync(sql: string, params: Array<string | number> = []) {
      const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
      const domain = normalized.includes("itemattachments")
        ? ("attachments" as const)
        : normalized.includes("itemnotes")
          ? ("notes" as const)
          : null;
      if (!domain) {
        throw new Error(`unsupported Node Zotero query: ${sql}`);
      }
      const isCount = normalized.startsWith("select count(*)");
      return sourceQueryAdapter.queryAsync(sql, params, {
        kind: isCount ? "count" : "page",
        domain,
        criteria: {
          libraryId: Number(params[1]),
          parentItemId: Number(params[0]),
        },
        position: isCount ? {} : { id: Number(params[2]) || 0 },
        limitPlusOne: isCount ? 0 : Number(params[3]) || 0,
      });
    },
  };
}

const describeImportEditorSuite = isZoteroRuntime() ? describe.skip : describe;
const itNodeOnly = isZoteroRuntime() ? it.skip : it;
const itZoteroFullOrNode =
  isZoteroRuntime() && !isFullTestMode() ? it.skip : it;

describe("workflow: literature-workbench import/export notes", function () {
  this.timeout(30000);
  let previousContentDevRootEnv: string | undefined;
  let databaseDescriptor: PropertyDescriptor | undefined;

  for (const noteKind of ["custom", "conversation-note"] as const) {
    it(`round-trips ${noteKind} through the managed semantic writer`, async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Semantic markdown parent" },
      });
      const hostApi = createWorkflowHostApi();
      const runtime = { hostApi, hostApiVersion: hostApi.version };
      const markdown = "# Reading\n\n中文 notes with **emphasis**.\n";
      let note;
      if (noteKind === "custom") {
        const directory = await mkTempDir("managed-custom-roundtrip");
        const sourcePath = joinPath(directory, "Reading.md");
        await writeUtf8(sourcePath, markdown);
        const result = await importCustomNotes({
          runtime,
          parentItem: itemRef(parent),
          customNotes: [{ sourcePath, fileName: "Reading" }],
        });
        note = result.notes[0];
      } else {
        note = await createConversationNote({
          runtime,
          parentItem: itemRef(parent),
          title: "Reading",
          markdown,
        });
      }
      const detail = await hostApi.library.getNoteDetail(note.ref, {
        format: "html",
      });
      assert.equal(detail.kind, "managed");
      if (detail.kind !== "managed") assert.fail("Expected managed detail");
      assert.equal(detail.noteKind, noteKind);
      assert.deepEqual(detail.parentRef, itemRef(parent));
      assert.deepEqual(detail.payload, { title: "Reading", markdown });
      assert.notProperty(detail, "content");
      const exported = await exportGeneratedNoteCandidate({
        runtime,
        noteRef: note.ref,
        noteKind,
      });
      assert.deepEqual(exported.payload, { title: "Reading", markdown });
      assert.deepEqual(exported.files, [
        { fileName: "Reading.md", content: markdown },
      ]);
      const children = await hostApi.library.getItemNotes(itemRef(parent));
      assert.lengthOf(children.notes, 1);
    });
  }

  it("replays an analysis parent set with one operation identity and unchanged note refs", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Canonical analysis set" },
    });
    const host = createWorkflowHostApi();
    const request = {
      operationId: "analysis-parent-set-roundtrip",
      parentRef: itemRef(parent),
      digest: { markdown: "## Summary\n\nComplete semantic evidence." },
      references: {
        schema: "source_reference_artifact.v1" as const,
        references: [],
      },
    };
    const first = await host.literatureArtifacts.applyAnalysis(request);
    assert.property(first, "result");
    if (!("result" in first)) assert.fail("Expected committed analysis");
    assert.sameMembers(
      first.result.notes.map((note) => note.noteKind),
      ["digest", "references"],
    );
    const replay = await host.literatureArtifacts.applyAnalysis(request);
    assert.property(replay, "result");
    if (!("result" in replay)) assert.fail("Expected canonical replay");
    assert.deepEqual(replay.result, first.result);
    const children = await host.library.getItemNotes(itemRef(parent));
    assert.lengthOf(children.notes, 2);
  });

  beforeEach(function () {
    if (!isZoteroRuntime()) {
      databaseDescriptor = Object.getOwnPropertyDescriptor(Zotero, "DB");
      Object.defineProperty(Zotero, "DB", {
        configurable: true,
        // Node round trips exercise transfer; native Zotero owns rollback evidence.
        value: createNodeDatabaseValue(),
      });
      setZoteroLibrarySourcePageQueryAdapterForTests(
        createMockZoteroLibrarySourcePageQueryAdapter(),
      );
    }
    const processEnv = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process?.env;
    previousContentDevRootEnv = processEnv?.ZOTERO_AGENTS_CONTENT_DEV_ROOT;
    if (processEnv) {
      processEnv.ZOTERO_AGENTS_CONTENT_DEV_ROOT = process.cwd();
    }
    setDebugModeOverrideForTests(true);
  });

  afterEach(function () {
    resetZoteroLibrarySourcePageQueryAdapterForTests();
    if (!isZoteroRuntime()) {
      if (databaseDescriptor)
        Object.defineProperty(Zotero, "DB", databaseDescriptor);
      else Reflect.deleteProperty(Zotero, "DB");
      databaseDescriptor = undefined;
    }
    for (const scope of preparedImageScopes) scope.dispose();
    preparedImageScopes.clear();
    const processEnv = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process?.env;
    if (processEnv) {
      if (previousContentDevRootEnv === undefined) {
        delete processEnv.ZOTERO_AGENTS_CONTENT_DEV_ROOT;
      } else {
        processEnv.ZOTERO_AGENTS_CONTENT_DEV_ROOT = previousContentDevRootEnv;
      }
    }
    setDebugModeOverrideForTests();
    installWorkflowEditorSessionOverrideForTests(null);
  });

  itNodeOnly(
    "maps citation-analysis UI state to citationAnalysis selection slot",
    function () {
      const digest = { sourcePath: "D:/imports/digest.md" };
      const references = { sourcePath: "D:/imports/references.json" };
      const citationAnalysis = {
        sourcePath: "D:/imports/citation_analysis.json",
      };
      const literatureScore = {
        sourcePath: "D:/imports/literature_score.json",
      };
      assert.equal(
        getSelectedImportCandidateForKind(
          { digest, references, citationAnalysis },
          "digest",
        ),
        digest,
      );
      assert.equal(
        getSelectedImportCandidateForKind(
          { digest, references, citationAnalysis },
          "references",
        ),
        references,
      );
      assert.equal(
        getSelectedImportCandidateForKind(
          { digest, references, citationAnalysis },
          "citation-analysis",
        ),
        citationAnalysis,
      );
      assert.equal(
        getSelectedImportCandidateForKind(
          { digest, references, citationAnalysis, literatureScore },
          "literature-score",
        ),
        literatureScore,
      );
    },
  );

  itNodeOnly(
    "loads export-notes and import-notes from literature-workbench-package",
    async function () {
      const loaded = await loadWorkflowManifests(workflowsPath());
      assert.isOk(
        loaded.workflows.find((entry) => entry.manifest.id === "export-notes"),
      );
      assert.isOk(
        loaded.workflows.find((entry) => entry.manifest.id === "import-notes"),
      );
      assert.isOk(
        loaded.workflows.find(
          (entry) => entry.manifest.id === "add-digest-representative-image",
        ),
      );
    },
  );

  itNodeOnly(
    "loads remaining literature-workbench debug-only note artifact workflows",
    async function () {
      const loaded = await loadWorkflowManifests(workflowsPath());
      const debugApply = loaded.workflows.find(
        (entry) => entry.manifest.id === "debug-digest-apply-fixture",
      );
      const debugInspector = loaded.workflows.find(
        (entry) => entry.manifest.id === "debug-note-artifact-inspector",
      );

      assert.isOk(debugApply);
      assert.isOk(debugInspector);
      assert.equal(debugApply?.manifest.debug_only, true);
      assert.equal(debugInspector?.manifest.debug_only, true);
      assert.isFunction(debugApply?.hooks.applyResult);
      assert.isFunction(debugInspector?.hooks.applyResult);
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Canonical debug fixture" },
      });
      const host = createPreparedImageTestHost();
      await debugApply!.hooks.applyResult!({
        parent: itemRef(parent),
        runtime: { hostApi: host, hostApiVersion: 12 },
      } as never);
      const details = await Promise.all(
        parent
          .getNotes()
          .map(async (id: number) =>
            host.library.getNoteDetail(
              itemRef(await Zotero.Items.getAsync(id)),
              { format: "html" },
            ),
          ),
      );
      assert.sameMembers(
        details.map((note) => note.noteKind),
        ["digest", "references", "citation-analysis"],
      );
      const citation = details.find(
        (note) => note.noteKind === "citation-analysis",
      );
      assert.equal(citation?.kind, "managed");
      if (citation?.kind === "managed")
        assert.equal(citation.health?.state, "current");
    },
  );

  itNodeOnly(
    "reports canonical note detail and bounded attachment facts from the debug inspector",
    async function () {
      const ref = { libraryId: 1, key: "NOTE_CANONICAL" };
      const parentRef = { libraryId: 1, key: "PARENT_CANONICAL" };
      const detail = {
        kind: "managed" as const,
        ref,
        parentRef,
        title: "Canonical digest",
        noteKind: "digest" as const,
        payload: { title: "Canonical digest", markdown: "# Digest\n" },
        derived: {},
        revision: 4,
        payloadBytes: 19,
        detailBytes: 27,
        provenance: null,
      };
      const host = {
        library: {
          async getNoteDetail() {
            return detail;
          },
          async getItemAttachments() {
            return {
              attachments: [],
              limit: 100,
              nextCursor: null,
              hasMore: false,
              returned: 0,
              total: 0,
            };
          },
        },
      };
      const result = await analyzeNoteItemForDebug({
        host,
        noteItem: detail,
        runtime: { hostApi: host, hostApiVersion: 12 },
      });

      assert.deepEqual(result.ref, ref);
      assert.deepEqual(result.parentRef, parentRef);
      assert.equal(result.kind, "managed");
      assert.equal(result.noteKind, "digest");
      assert.equal(result.payloadBytes, 19);
      assert.equal(result.detailBytes, 27);
      assert.deepEqual(result.attachments, []);
      assert.deepEqual(result.exportAttempt, {
        attempted: true,
        ok: true,
        files: [{ fileName: "digest.md", hasContent: true, hasBytes: false }],
      });
    },
  );

  it("adds a representative image to an existing digest note from a selected parent", async function () {
    const workflow = await getWorkflow("add-digest-representative-image");
    const root = await mkTempDir("add-digest-rep-image");
    const sourcePath = joinPath(root, "paper.md");
    const imagePath = joinPath(root, "figures", "overview.jpg");
    await writeUtf8(
      sourcePath,
      [
        "# Source Paper",
        "",
        "![Figure 1](figures/overview.jpg)",
        "",
        "Figure 1. Overview.",
      ].join("\n"),
    );
    await writeBytes(imagePath, new Uint8Array([1, 2, 3, 4]));
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Add Representative Image Parent" },
    });
    await handlers.attachment.createFromPath({
      parent,
      path: sourcePath,
      title: "paper.md",
      mimeType: "text/markdown",
    });
    const digestNote = await handlers.parent.addNote(parent, {
      content: buildDigestNoteContent("# Digest\n\nExisting digest body."),
    });
    const selectionContext = await buildSelectionContext([parent]);
    const requests = await executeBuildRequests({
      workflow,
      selectionContext,
      executionOptions: {
        workflowParams: {
          markdown_src: "figures/overview.jpg",
        },
      },
    });
    assert.lengthOf(requests, 1);

    const hostApi = createPreparedImageTestHost((source) => {
      assert.equal(source, imagePath);
    });
    const applied = (await executeApplyResult({
      workflow,
      parent,
      request: requests[0],
      bundleReader: { readText: async () => "" },
      runtime: {
        hostApi,
      },
    })) as {
      status?: string;
      representative_image?: { attachmentKey?: string };
    };

    const updatedDigest = Zotero.Items.get(digestNote.id)!;
    assert.equal(applied.status, "embedded");
    const image = Zotero.Items.get(updatedDigest.getAttachments()[0])!;
    assert.include(
      updatedDigest.getNote(),
      `data-attachment-key="${image.key}"`,
    );
    assert.include(updatedDigest.getNote(), "Existing digest body.");
    assert.equal(
      (await parseStoredPayload(updatedDigest, "digest-markdown")).content,
      "Existing digest body.",
    );
  });

  it("fails when markdown_src cannot be resolved for a selected digest note", async function () {
    const workflow = await getWorkflow("add-digest-representative-image");
    const root = await mkTempDir("add-digest-rep-image-missing");
    const sourcePath = joinPath(root, "paper.md");
    await writeUtf8(sourcePath, "# Source Paper\n\nNo image here.");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Missing Representative Image Parent" },
    });
    await handlers.attachment.createFromPath({
      parent,
      path: sourcePath,
      title: "paper.md",
      mimeType: "text/markdown",
    });
    const digestNote = await handlers.parent.addNote(parent, {
      content: buildDigestNoteContent("# Digest\n\nExisting digest body."),
    });
    const selectionContext = await buildSelectionContext([digestNote]);
    const requests = await executeBuildRequests({
      workflow,
      selectionContext,
      executionOptions: {
        workflowParams: {
          markdown_src: "figures/missing.jpg",
        },
      },
    });

    try {
      await executeApplyResult({
        workflow,
        parent,
        request: requests[0],
        bundleReader: { readText: async () => "" },
      });
      assert.fail("expected missing markdown_src to fail");
    } catch (error) {
      assert.match(
        error instanceof Error ? error.message : String(error),
        /markdown_src_hint_not_resolved/,
      );
    }
  });

  it("rejects an HTML-only digest note without mutating it", async function () {
    const workflow = await getWorkflow("add-digest-representative-image");
    const root = await mkTempDir("add-digest-rep-image-normalized");
    const sourcePath = joinPath(root, "paper.md");
    const imagePath = joinPath(root, "Images", "figure.jpg");
    await writeUtf8(
      sourcePath,
      [
        "# Source Paper",
        "",
        "![Figure 1](Images/figure.jpg)",
        "",
        "Figure 1. Normalized fallback.",
      ].join("\n"),
    );
    await writeBytes(imagePath, new Uint8Array([5, 6, 7]));
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Normalized Representative Image Parent" },
    });
    await handlers.attachment.createFromPath({
      parent,
      path: sourcePath,
      title: "paper.md",
      mimeType: "text/markdown",
    });
    const digestNote = await handlers.parent.addNote(parent, {
      content: [
        '<div data-schema-version="9">',
        "<h1>Digest</h1>",
        "<h2>TL;DR</h2>",
        "<p>Recovered visible body.</p>",
        "</div>",
      ].join("\n"),
    });
    const selectionContext = await buildSelectionContext([digestNote]);
    const beforeContent = digestNote.getNote();
    const beforeAttachments = digestNote.getAttachments();
    let thrown: unknown = null;
    try {
      const requests = await executeBuildRequests({
        workflow,
        selectionContext,
        executionOptions: {
          workflowParams: {
            markdown_src: "Images/figure.jpg",
          },
        },
      });
      assert.lengthOf(requests, 1);
    } catch (error) {
      thrown = error;
    }
    assert.isOk(thrown, "HTML-only digest recovery must fail closed");
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    const code =
      thrown && typeof thrown === "object" && "code" in thrown
        ? String((thrown as { code?: unknown }).code || "")
        : "";
    assert.isTrue(
      ["NO_VALID_INPUT_UNITS", "legacy_artifact_requires_migration"].includes(
        code,
      ) || /canonical digest note|migration|one digest note/i.test(message),
      `unexpected fail-closed diagnostic: ${code} ${message}`,
    );
    assert.equal(digestNote.getNote(), beforeContent);
    assert.deepEqual(digestNote.getAttachments(), beforeAttachments);
  });

  it("scopes representative-image cleanup away from score and payload images", function () {
    const html = [
      '<div data-zs-block="representative-image"><img data-attachment-key="IMGREP"></div>',
      '<img data-attachment-key="IMGREP2" data-zs-representative-image="v1">',
      '<img data-attachment-key="IMGSCORE" data-zs-score-radar="v1">',
      '<img data-attachment-key="IMGPAYLOAD" alt="Zotero Skills artifact payload">',
    ].join("\n");

    assert.deepEqual(extractExistingRepresentativeImageKeys(html), [
      "IMGREP2",
      "IMGREP",
    ]);
  });

  itNodeOnly(
    "builds a single aggregated export request across multiple selected units",
    async function () {
      const workflow = await getWorkflow("export-notes");
      const parentA = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Export Parent A" },
      });
      const parentB = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Export Parent B" },
      });
      const parentInvalid = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Export Parent Invalid" },
      });

      await handlers.parent.addNote(parentA, {
        content: buildDigestNoteContent("# Digest A"),
      });
      const referencesNote = await handlers.parent.addNote(parentB, {
        content: buildReferencesNoteContent(),
      });

      const selection = await buildSelectionContext([
        parentA,
        parentB,
        parentInvalid,
        referencesNote,
      ]);
      const requests = (await executeBuildRequests({
        workflow,
        selectionContext: selection,
      })) as Array<{
        kind: string;
        exportCandidates?: Array<{
          noteKind?: string;
          parentRef?: { libraryId: number; key: string };
        }>;
      }>;

      assert.lengthOf(requests, 1);
      assert.equal(requests[0].kind, "pass-through.run.v1");
      assert.deepEqual(
        (requests[0].exportCandidates || []).map((entry) => ({
          noteKind: entry.noteKind,
          parentRef: entry.parentRef,
        })),
        [
          {
            noteKind: "digest",
            parentRef: { libraryId: parentA.libraryID, key: parentA.key },
          },
          {
            noteKind: "references",
            parentRef: { libraryId: parentB.libraryID, key: parentB.key },
          },
        ],
      );
    },
  );

  it("exports decoded note artifacts into parent title + itemKey folders", async function () {
    const workflow = await getWorkflow("export-notes");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Export Bundle Parent" },
    });
    await handlers.parent.addNote(parent, {
      content: buildDigestNoteContent("# Digest Export"),
    });
    await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent(),
    });
    await handlers.parent.addNote(parent, {
      content: buildCitationNoteContent(),
    });
    await handlers.parent.addNote(parent, {
      content: buildLiteratureScoreNoteContent(),
    });

    const selection = await buildSelectionContext([parent]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: selection,
    })) as Array<Record<string, unknown>>;
    assert.lengthOf(requests, 1);

    const exportRoot = await mkTempDir("reference-workbench-export");
    const baseHostApi = (
      await import("../../src/workflows/hostApi")
    ).createWorkflowHostApi();
    const hostApi = {
      ...baseHostApi,
      file: {
        ...baseHostApi.file,
        async pickDirectory() {
          return exportRoot;
        },
      },
    };

    await executeApplyResult({
      workflow,
      parent,
      request: requests[0],
      bundleReader: { readText: async () => "" },
      runtime: {
        hostApi: hostApi as any,
      },
    });

    const targetDir = joinPath(
      exportRoot,
      `${parent.getField("title")} [${parent.key}]`,
    );
    assert.equal(
      await readUtf8(joinPath(targetDir, "digest.md")),
      "# Digest Export",
    );
    const referencesJson = JSON.parse(
      await readUtf8(joinPath(targetDir, "references.json")),
    );
    assert.deepEqual(referencesJson, buildNativeReferencesArtifact());
    const citationJson = JSON.parse(
      await readUtf8(joinPath(targetDir, "citation_analysis.json")),
    );
    assert.deepEqual(citationJson, buildNativeCitationArtifact());
    const scoreJson = JSON.parse(
      await readUtf8(joinPath(targetDir, "literature_score.json")),
    );
    assert.deepEqual(scoreJson, buildNativeLiteratureScoreArtifact());
    assert.include(
      await readUtf8(joinPath(targetDir, "citation_analysis.md")),
      "Summary text",
    );
  });

  itNodeOnly(
    "publishes remote note exports as one downloadable archive",
    async function () {
      const workflow = await getWorkflow("export-notes");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Remote Export Parent" },
      });
      await handlers.parent.addNote(parent, {
        content: buildDigestNoteContent("# Remote Digest"),
      });
      const requests = (await executeBuildRequests({
        workflow,
        selectionContext: await buildSelectionContext([parent]),
      })) as Array<Record<string, unknown>>;
      const hostModule = await import("../../src/workflows/hostApi");
      const baseHostApi = hostModule.createWorkflowHostApi();
      const exportRoot = await mkTempDir("remote-notes-export");
      const outputPath = joinPath(exportRoot, "notes-export.zip");
      let publishedPath = "";

      const result = (await executeApplyResult({
        workflow,
        parent,
        request: requests[0],
        bundleReader: { readText: async () => "" },
        runtime: {
          invocationMode: "non-interactive",
          hostApi: {
            ...baseHostApi,
            interactionMode: "non_interactive",
            resources: {
              getInput: () => null,
              getInputs: () => [],
              async allocateOutput() {
                return { path: outputPath };
              },
              async publishOutput(args: { path: string }) {
                publishedPath = args.path;
                return {
                  slotId: "notes",
                  fileId: "file-notes-export",
                  sourceKind: "workflow-artifact",
                  displayName: "notes-export.zip",
                  contentType: "application/zip",
                  createdAt: "2026-08-07T00:00:00.000Z",
                  expiresAt: "2026-08-07T02:00:00.000Z",
                  downloadCommand:
                    "zotero-bridge file download file-notes-export --output notes-export.zip",
                };
              },
              listOutputs: () => [],
            },
          } as any,
          hostApiVersion: hostModule.WORKFLOW_HOST_API_VERSION,
        },
      })) as {
        exportedParents: number;
        exportedFiles: number;
        resourceOutputs: Array<{ fileId: string }>;
      };

      assert.equal(result.exportedParents, 1);
      assert.equal(result.exportedFiles, 1);
      assert.equal(result.resourceOutputs[0].fileId, "file-notes-export");
      assert.equal(publishedPath, outputPath);
      assert.isAbove((await readBytes(outputPath)).byteLength, 0);
    },
  );

  it("exports digest representative image as markdown marker and sidecar image", async function () {
    const workflow = await getWorkflow("export-notes");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Representative Export Parent" },
    });
    const digestNote = await handlers.parent.addNote(parent, {
      content: buildDigestNoteContent("# Digest Export\n\nBody"),
    });
    const imageBytes = new Uint8Array([1, 2, 3, 4, 5]);
    const attachment = await Zotero.Attachments.importEmbeddedImage({
      blob: new Blob([imageBytes], { type: "image/jpeg" }),
      parentItemID: digestNote.id,
    });
    await handlers.note.update(digestNote, {
      content: buildDigestNoteContentWithRepresentativeImage(
        "# Digest Export\n\nBody",
        attachment.key,
      ),
    });

    const selection = await buildSelectionContext([parent]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: selection,
    })) as Array<Record<string, unknown>>;
    assert.lengthOf(requests, 1);

    const exportRoot = await mkTempDir("literature-workbench-export-rep");
    const baseHostApi = (
      await import("../../src/workflows/hostApi")
    ).createWorkflowHostApi();
    await executeApplyResult({
      workflow,
      parent,
      request: requests[0],
      bundleReader: { readText: async () => "" },
      runtime: {
        hostApi: {
          ...baseHostApi,
          file: {
            ...baseHostApi.file,
            async pickDirectory() {
              return exportRoot;
            },
          },
        } as any,
      },
    });

    const targetDir = joinPath(
      exportRoot,
      `${parent.getField("title")} [${parent.key}]`,
    );
    const digestMarkdown = await readUtf8(joinPath(targetDir, "digest.md"));
    assert.include(digestMarkdown, "zs:representative-image:v1");
    assert.include(digestMarkdown, "![Figure 2](representative_image.jpg)");
    assert.deepEqual(
      Array.from(
        await readBytes(joinPath(targetDir, "representative_image.jpg")),
      ),
      Array.from(imageBytes),
    );
  });

  it("keeps digest export successful when representative image attachment is unavailable", async function () {
    const workflow = await getWorkflow("export-notes");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Representative Missing Export Parent" },
    });
    await handlers.parent.addNote(parent, {
      content: buildDigestNoteContentWithRepresentativeImage(
        "# Digest Export\n\nBody",
        "ABCD1234",
      ),
    });

    const selection = await buildSelectionContext([parent]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: selection,
    })) as Array<Record<string, unknown>>;
    const exportRoot = await mkTempDir(
      "literature-workbench-export-rep-missing",
    );
    const baseHostApi = (
      await import("../../src/workflows/hostApi")
    ).createWorkflowHostApi();
    await executeApplyResult({
      workflow,
      parent,
      request: requests[0],
      bundleReader: { readText: async () => "" },
      runtime: {
        hostApi: {
          ...baseHostApi,
          file: {
            ...baseHostApi.file,
            async pickDirectory() {
              return exportRoot;
            },
          },
        } as any,
      },
    });

    const targetDir = joinPath(
      exportRoot,
      `${parent.getField("title")} [${parent.key}]`,
    );
    const exportedFiles = await listDirNames(targetDir);
    assert.include(exportedFiles, "digest.md");
    assert.notInclude(exportedFiles, "representative_image.jpg");
    assert.notInclude(
      await readUtf8(joinPath(targetDir, "digest.md")),
      "zs:representative-image:v1",
    );
  });

  itZoteroFullOrNode(
    "exports conversation notes through the unified markdown-backed note codec",
    async function () {
      const workflow = await getWorkflow("export-notes");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Conversation Export Parent" },
      });
      const conversationMarkdown = "# Conversation Export\n\n- one\n- two\n";
      const conversationNote = await handlers.parent.addNote(parent, {
        title: "Conversation Note 2604052113",
        content: buildConversationNoteContent(conversationMarkdown),
      });

      const selection = await buildSelectionContext([conversationNote]);
      const requests = (await executeBuildRequests({
        workflow,
        selectionContext: selection,
      })) as Array<Record<string, unknown>>;
      assert.lengthOf(requests, 1);

      const exportRoot = await mkTempDir(
        "literature-workbench-export-conversation",
      );
      const baseHostApi = (
        await import("../../src/workflows/hostApi")
      ).createWorkflowHostApi();
      const hostApi = {
        ...baseHostApi,
        file: {
          ...baseHostApi.file,
          async pickDirectory() {
            return exportRoot;
          },
        },
      };

      await executeApplyResult({
        workflow,
        parent,
        request: requests[0],
        bundleReader: { readText: async () => "" },
        runtime: {
          hostApi: hostApi as any,
        },
      });

      const targetDir = joinPath(
        exportRoot,
        `${parent.getField("title")} [${parent.key}]`,
      );
      const exportedFiles = await listDirNames(targetDir);
      const markdownFile = exportedFiles.find((entry) => /\.md$/i.test(entry));
      assert.isOk(
        markdownFile,
        `expected markdown export in ${targetDir}; files=${exportedFiles.join(",")}`,
      );
      assert.equal(
        await readUtf8(joinPath(targetDir, markdownFile!)),
        conversationMarkdown,
      );
    },
  );

  itNodeOnly(
    "sanitizes title-derived export file names for conversation and custom notes",
    async function () {
      const workflow = await getWorkflow("export-notes");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Unsafe Export Parent" },
      });
      const conversationMarkdown = "# Unsafe Title\n\ncontent\n";
      const customMarkdown = "# Custom Export\n\nbody\n";
      const conversationNote = await handlers.parent.addNote(parent, {
        title: "Conversation: Note? 260405/2113*",
        content: buildConversationNoteContent(
          conversationMarkdown,
          "artifacts/conversation-note.md",
          "Conversation: Note? 260405/2113*",
        ),
      });
      const customNote = await handlers.parent.addNote(parent, {
        title: 'Custom <Draft> "v1"|final',
        content: [
          '<div data-zs-note-kind="custom">',
          '<h1>Custom &lt;Draft&gt; "v1"|final</h1>',
          '<div data-zs-view="custom-html"><p>Custom Export</p></div>',
          renderPlainMarkdownPayloadBlock("custom-markdown", customMarkdown),
          "</div>",
        ].join("\n"),
      });

      const selection = await buildSelectionContext([
        conversationNote,
        customNote,
      ]);
      const requests = (await executeBuildRequests({
        workflow,
        selectionContext: selection,
      })) as Array<Record<string, unknown>>;
      assert.lengthOf(requests, 1);

      const exportRoot = await mkTempDir(
        "literature-workbench-export-sanitized",
      );
      const baseHostApi = (
        await import("../../src/workflows/hostApi")
      ).createWorkflowHostApi();
      const hostApi = {
        ...baseHostApi,
        file: {
          ...baseHostApi.file,
          async pickDirectory() {
            return exportRoot;
          },
        },
      };

      await executeApplyResult({
        workflow,
        parent,
        request: requests[0],
        bundleReader: { readText: async () => "" },
        runtime: {
          hostApi: hostApi as any,
        },
      });

      const targetDir = joinPath(
        exportRoot,
        `${parent.getField("title")} [${parent.key}]`,
      );
      const exportedFiles = await listDirNames(targetDir);
      assert.include(exportedFiles, "Conversation_ Note_ 260405_2113_.md");
      assert.include(exportedFiles, "Custom _Draft_ _v1__final.md");
      assert.equal(
        await readUtf8(
          joinPath(targetDir, "Conversation_ Note_ 260405_2113_.md"),
        ),
        conversationMarkdown,
      );
      assert.equal(
        await readUtf8(joinPath(targetDir, "Custom _Draft_ _v1__final.md")),
        customMarkdown,
      );
    },
  );

  it("requires exactly one parent item for import-notes", async function () {
    const workflow = await getWorkflow("import-notes");
    const parentA = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Import Parent A" },
    });
    const parentB = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Import Parent B" },
    });

    let thrown: unknown = null;
    try {
      await executeBuildRequests({
        workflow,
        selectionContext: await buildSelectionContext([parentA, parentB]),
      });
    } catch (error) {
      thrown = error;
    }
    assert.isOk(thrown, "multiple parent selection should be rejected");

    const note = await handlers.parent.addNote(parentA, {
      content: buildDigestNoteContent("# Digest"),
    });
    thrown = null;
    try {
      await executeBuildRequests({
        workflow,
        selectionContext: await buildSelectionContext([note]),
      });
    } catch (error) {
      thrown = error;
    }
    assert.isOk(thrown, "note selection should be rejected");
  });

  itNodeOnly(
    "applies structured conflict policies for non-interactive note imports without opening an editor",
    async function () {
      const workflow = await getWorkflow("import-notes");
      const hostModule = await import("../../src/workflows/hostApi");
      const baseHostApi = hostModule.createWorkflowHostApi();
      const importRoot = await mkTempDir(
        "literature-workbench-resource-import",
      );
      const digestPath = joinPath(importRoot, "digest.md");
      await writeUtf8(digestPath, "# Incoming Digest\n\nRemote body");

      for (const testCase of [
        { policy: undefined, outcome: "error" },
        { policy: "skip", outcome: "skip" },
        { policy: "overwrite", outcome: "overwrite" },
      ]) {
        const parent = await handlers.item.create({
          itemType: "journalArticle",
          fields: { title: `Non-interactive ${testCase.outcome}` },
        });
        const existingDigest = await handlers.parent.addNote(parent, {
          content: buildDigestNoteContent("# Existing Digest"),
        });
        const existingDigestContent = existingDigest.getNote();
        let editorCalls = 0;
        let thrown: unknown;
        let result: unknown;
        try {
          result = await executeApplyResult({
            workflow,
            parent,
            bundleReader: { readText: async () => "" },
            executionOptions: testCase.policy
              ? { workflowParams: { conflictPolicy: testCase.policy } }
              : undefined,
            runtime: {
              invocationMode: "non-interactive",
              hostApi: {
                ...baseHostApi,
                editor: {
                  ...baseHostApi.editor,
                  async openSession() {
                    editorCalls += 1;
                    throw new Error("editor must not open");
                  },
                },
                resources: {
                  getInput(slotId: string) {
                    return slotId === "digest"
                      ? {
                          fileId: "file-digest",
                          path: digestPath,
                          displayName: "digest.md",
                          contentType: "text/markdown",
                        }
                      : null;
                  },
                  getInputs(slotId: string) {
                    const input = this.getInput(slotId);
                    return input ? [input] : [];
                  },
                  async allocateOutput() {
                    throw new Error("no output expected");
                  },
                  async publishOutput() {
                    throw new Error("no output expected");
                  },
                  listOutputs() {
                    return [];
                  },
                },
              } as any,
              hostApiVersion: hostModule.WORKFLOW_HOST_API_VERSION,
            },
          });
        } catch (error) {
          thrown = error;
        }

        assert.equal(editorCalls, 0);
        if (testCase.outcome === "error") {
          assert.equal(
            (thrown as { code?: string })?.code,
            "workflow_conflict_requires_policy",
          );
          assert.equal(existingDigest.getNote(), existingDigestContent);
          continue;
        }
        assert.isUndefined(thrown);
        if (testCase.outcome === "skip") {
          assert.deepEqual(result, { imported: 0, skipped: 1 });
          assert.equal(existingDigest.getNote(), existingDigestContent);
          continue;
        }
        assert.equal((result as { imported?: number })?.imported, 1);
        const digest = parent
          .getNotes()
          .map((id) => Zotero.Items.get(id)!)
          .find((entry) => hasGeneratedHeading(entry, "Digest"));
        assert.equal(
          (await parseStoredPayload(digest!, "digest-markdown")).content,
          "# Incoming Digest\n\nRemote body",
        );
      }
    },
  );

  describeImportEditorSuite("import-notes editor-driven flows", function () {
    it("previews legacy bundle note payloads through the private converter seam", async function () {
      const { convertLegacyArtifactSet } =
        await import("../../src/modules/literatureArtifactMigration/converter");
      const legacyHtml = renderPayloadBlock("references-json", {
        items: [
          {
            title: "Legacy bundle reference",
            authors: ["Legacy Author"],
            year: 2024,
            rawCitation: "Legacy Author. Legacy bundle reference. 2024.",
          },
        ],
      });
      const preview = previewLegacyArtifactSetForImport({
        host: { convertLegacyArtifactSet },
        parentRef: { libraryId: 1, key: "ABCD1234" },
        noteContents: [legacyHtml],
        idFactory: generateSourceReferenceId,
      });

      assert.equal(preview.classification, "ready");
      assert.lengthOf(preview.payload.references.references, 1);
      assert.match(
        preview.payload.references.references[0].sourceReferenceId,
        /^[0-9a-f-]{36}$/,
      );
      assert.equal(preview.payload.citation, null);
      assert.lengthOf(preview.diagnostics, 0);
    });

    it("imports a literature score file as a generated score note", async function () {
      const workflow = await getWorkflow("import-notes");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Import Literature Score Parent" },
      });
      const editorResult = {
        saved: true,
        result: {
          literatureScore: {
            sourcePath: "D:/imports/literature_score.json",
            payload: buildNativeLiteratureScoreArtifact(),
          },
        },
      };
      installWorkflowEditorSessionOverrideForTests(async () => editorResult);

      const result = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: { readText: async () => "" },
      })) as { imported?: number };

      assert.equal(result.imported, 1);
      const scoreNote = parent
        .getNotes()
        .map((id) => Zotero.Items.get(id)!)
        .find((note) => hasGeneratedHeading(note, "Literature Score"));
      assert.isOk(scoreNote);
      assert.deepEqual(
        await parseStoredPayload(scoreNote!, "literature-score-json"),
        buildNativeLiteratureScoreArtifact(),
      );
    });

    it("imports selected digest/references/citation files and upserts generated notes", async function () {
      const workflow = await getWorkflow("import-notes");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Import Apply Parent" },
      });
      const hostModule = await import("../../src/workflows/hostApi");
      const baseHostApi = hostModule.createWorkflowHostApi();
      const sidecarCalls: any[] = [];

      const editorResult = {
        saved: true,
        result: {
          digest: {
            sourcePath: "D:/imports/digest.md",
            markdown: "# Imported Digest\n\nBody",
          },
          references: {
            sourcePath: "D:/imports/references.json",
            payload: buildNativeReferencesArtifact(),
          },
          citationAnalysis: {
            sourcePath: "D:/imports/citation_analysis.json",
            payload: buildNativeCitationArtifact(),
          },
        },
      };
      installWorkflowEditorSessionOverrideForTests(async () => editorResult);

      await executeApplyResult({
        workflow,
        parent,
        bundleReader: { readText: async () => "" },
        runtime: {
          hostApi: {
            ...baseHostApi,
            editor: {
              ...baseHostApi.editor,
              async openSession() {
                return editorResult;
              },
            },
            synthesis: {
              ...baseHostApi.synthesis,
              workflowApply: {
                ...baseHostApi.synthesis.workflowApply,
                async applyLiteratureDigest(args: any) {
                  sidecarCalls.push(args);
                  return {
                    ok: true,
                    status: "sidecar_applied",
                    source_ref: "1:IMPORT",
                  };
                },
              },
            },
          } as any,
          hostApiVersion: hostModule.WORKFLOW_HOST_API_VERSION,
        },
      });

      const noteIds = parent.getNotes();
      assert.lengthOf(noteIds, 3);
      const notes = noteIds.map((id) => Zotero.Items.get(id)!);
      const digest = findGeneratedNoteByHeading(notes, "Digest");
      const references = findGeneratedNoteByHeading(notes, "References");
      const citation = findGeneratedNoteByHeading(notes, "Citation Analysis");
      assert.isOk(digest);
      assert.isOk(references);
      assert.isOk(citation);
      assert.equal(
        (await parseStoredPayload(digest!, "digest-markdown")).content,
        "# Imported Digest\n\nBody",
      );
      const importedReferencesPayload = await parseStoredPayload(
        references!,
        "references-json",
      );
      assert.deepEqual(
        importedReferencesPayload,
        buildReferencesPayloadWrapper(),
      );
      const importedCitationPayload = await parseStoredPayload(
        citation!,
        "citation-analysis-json",
      );
      assert.deepInclude(
        importedCitationPayload,
        buildCitationPayloadWrapper(),
      );
      assert.match(importedCitationPayload.referencesBasis, /^sha256:/);
      assert.lengthOf(sidecarCalls, 1);
      assert.equal(sidecarCalls[0].source.workflow, "import-notes");
      assert.equal(sidecarCalls[0].digest.noteKey, digest!.key);
      assert.equal(sidecarCalls[0].digest.content, "# Imported Digest\n\nBody");
      assert.deepEqual(sidecarCalls[0].references, importedReferencesPayload);
      assert.deepEqual(
        sidecarCalls[0].citationAnalysis,
        buildCitationPayloadWrapper(),
      );
    });

    it("refreshes sidecar for references-only import without fabricated sibling artifacts", async function () {
      const workflow = await getWorkflow("import-notes");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Import References Sidecar Parent" },
      });
      const hostModule = await import("../../src/workflows/hostApi");
      const baseHostApi = hostModule.createWorkflowHostApi();
      const sidecarCalls: any[] = [];

      const editorResult = {
        saved: true,
        result: {
          references: {
            sourcePath: "D:/imports/references-only.json",
            payload: buildNativeReferencesArtifact(),
          },
        },
      };
      installWorkflowEditorSessionOverrideForTests(async () => editorResult);

      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: { readText: async () => "" },
        runtime: {
          hostApi: {
            ...baseHostApi,
            editor: {
              ...baseHostApi.editor,
              async openSession() {
                return editorResult;
              },
            },
            synthesis: {
              ...baseHostApi.synthesis,
              workflowApply: {
                ...baseHostApi.synthesis.workflowApply,
                async applyLiteratureDigest(args: any) {
                  sidecarCalls.push(args);
                  return {
                    ok: true,
                    status: "sidecar_applied",
                    source_ref: "1:IMPORTREFS",
                  };
                },
              },
            },
          } as any,
          hostApiVersion: hostModule.WORKFLOW_HOST_API_VERSION,
        },
      })) as { imported?: number; sidecar_apply?: { status?: string } };

      assert.equal(applied.imported, 1);
      assert.equal(applied.sidecar_apply?.status, "sidecar_applied");
      assert.lengthOf(sidecarCalls, 1);
      assert.isUndefined(sidecarCalls[0].digest);
      assert.isUndefined(sidecarCalls[0].citationAnalysis);
      assert.equal(sidecarCalls[0].source.workflow, "import-notes");
      assert.equal(
        sidecarCalls[0].references.references[0].bibliography.title,
        "Structured Reference",
      );
      assert.equal(
        sidecarCalls[0].source.references_entry,
        "D:/imports/references-only.json",
      );
    });

    it("does not refresh sidecar for custom-only import", async function () {
      const workflow = await getWorkflow("import-notes");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Import Custom Only Parent" },
      });
      const hostModule = await import("../../src/workflows/hostApi");
      const baseHostApi = hostModule.createWorkflowHostApi();
      let sidecarCallCount = 0;

      const editorResult = {
        saved: true,
        result: {
          customNotes: [
            {
              sourcePath: "D:/imports/custom-note.md",
              fileName: "custom-note",
            },
          ],
        },
      };
      installWorkflowEditorSessionOverrideForTests(async () => editorResult);

      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: { readText: async () => "" },
        runtime: {
          hostApi: {
            ...baseHostApi,
            editor: {
              ...baseHostApi.editor,
              async openSession() {
                return editorResult;
              },
            },
            file: {
              ...baseHostApi.file,
              async readText(path: string) {
                assert.equal(path, "D:/imports/custom-note.md");
                return "# Custom Note\n\nBody";
              },
            },
            synthesis: {
              ...baseHostApi.synthesis,
              async applyLiteratureDigestSidecar() {
                sidecarCallCount += 1;
                return {
                  ok: true,
                  status: "sidecar_applied",
                };
              },
            },
          } as any,
          hostApiVersion: hostModule.WORKFLOW_HOST_API_VERSION,
        },
      })) as { imported?: number; sidecar_apply?: unknown };

      assert.equal(applied.imported, 1);
      assert.isUndefined(applied.sidecar_apply);
      assert.equal(sidecarCallCount, 0);
    });

    it("imports digest representative image marker as embedded note image", async function () {
      const workflow = await getWorkflow("import-notes");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Import Representative Parent" },
      });
      const importRoot = await mkTempDir("literature-workbench-import-rep");
      const digestPath = joinPath(importRoot, "digest.md");
      const imagePath = joinPath(importRoot, "representative_image.jpg");
      await writeUtf8(
        digestPath,
        [
          "# Imported Digest",
          "",
          '<!-- zs:representative-image:v1 {"src":"representative_image.jpg","alt":"Figure 2"} -->',
          "![Figure 2](representative_image.jpg)",
          "<!-- /zs:representative-image -->",
          "",
          "Body",
        ].join("\n"),
      );
      await writeBytes(imagePath, new Uint8Array([9, 8, 7]));

      let preparedPath = "";
      const baseHostApi = createPreparedImageTestHost((source) => {
        preparedPath = source;
      });
      const resolved = await resolveRepresentativeImageMarkdownImportCandidate({
        runtime: {
          hostApi: baseHostApi,
          hostApiVersion: baseHostApi.version,
        },
        digestPath,
        markdown: await readUtf8(digestPath),
      });
      const editorResult = {
        saved: true,
        result: {
          digest: {
            sourcePath: digestPath,
            markdown: resolved.markdown,
            representativeImage: resolved.representativeImage,
          },
        },
      };

      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: { readText: async () => "" },
        runtime: {
          hostApi: {
            ...baseHostApi,
            editor: {
              ...baseHostApi.editor,
              async openSession() {
                return editorResult;
              },
            },
          } as any,
        },
      })) as {
        imported?: number;
        representative_image?: { status?: string; attachmentKey?: string };
      };

      assert.equal(preparedPath, imagePath);
      assert.equal(applied.imported, 1);
      assert.equal(applied.representative_image?.status, "embedded");
      const digest = parent
        .getNotes()
        .map((id) => Zotero.Items.get(id)!)
        .find((entry) => hasGeneratedHeading(entry, "Digest"));
      assert.isOk(digest);
      assert.match(digest!.getNote(), /data-attachment-key="[^"]+"/);
      assert.notInclude(
        (await parseStoredPayload(digest!, "digest-markdown")).content,
        "zs:representative-image",
      );
    });

    it("skips unsafe imported representative image src while importing clean digest markdown", async function () {
      const workflow = await getWorkflow("import-notes");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Import Unsafe Representative Parent" },
      });
      const hostModule = await import("../../src/workflows/hostApi");
      const baseHostApi = hostModule.createWorkflowHostApi();
      const resolved = await resolveRepresentativeImageMarkdownImportCandidate({
        runtime: {
          hostApi: baseHostApi,
          hostApiVersion: hostModule.WORKFLOW_HOST_API_VERSION,
        },
        digestPath: "D:/imports/digest.md",
        markdown: [
          "# Imported Digest",
          "",
          '<!-- zs:representative-image:v1 {"src":"../outside.jpg","alt":"Figure 2"} -->',
          "![Figure 2](../outside.jpg)",
          "<!-- /zs:representative-image -->",
          "",
          "Body",
        ].join("\n"),
      });

      const editorResult = {
        saved: true,
        result: {
          digest: {
            sourcePath: "D:/imports/digest.md",
            markdown: resolved.markdown,
            representativeImage: resolved.representativeImage,
          },
        },
      };

      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: { readText: async () => "" },
        runtime: {
          hostApi: {
            ...baseHostApi,
            images: {
              async prepareForNoteEmbedding() {
                throw new Error(
                  "unsafe representative image should not prepare",
                );
              },
            },
            editor: {
              ...baseHostApi.editor,
              async openSession() {
                return editorResult;
              },
            },
          } as any,
        },
      })) as {
        imported?: number;
        representative_image?: { status?: string; reason?: string };
      };

      assert.equal(applied.imported, 1);
      assert.equal(applied.representative_image?.status, "skipped");
      assert.equal(
        applied.representative_image?.reason,
        "unsafe_representative_image_src",
      );
      const digest = parent
        .getNotes()
        .map((id) => Zotero.Items.get(id)!)
        .find((entry) => hasGeneratedHeading(entry, "Digest"));
      assert.isOk(digest);
      assert.notInclude(
        digest!.getNote(),
        'data-zs-block="representative-image"',
      );
      assert.notInclude(
        (await parseStoredPayload(digest!, "digest-markdown")).content,
        "zs:representative-image",
      );
    });

    it("uses manually selected representative image over imported marker state", async function () {
      const workflow = await getWorkflow("import-notes");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Import Manual Representative Parent" },
      });
      let preparedPath = "";
      const baseHostApi = createPreparedImageTestHost((source) => {
        preparedPath = source;
      });

      const editorResult = {
        saved: true,
        result: {
          digest: {
            sourcePath: "D:/imports/digest.md",
            markdown: "# Imported Digest\n\nBody",
            representativeImage: {
              status: "selected",
              sourcePath: "D:/imports/manual.jpg",
              alt: "Manual figure",
              mode: "manual",
            },
          },
        },
      };

      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: { readText: async () => "" },
        runtime: {
          hostApi: {
            ...baseHostApi,
            editor: {
              ...baseHostApi.editor,
              async openSession() {
                return editorResult;
              },
            },
          } as any,
        },
      })) as {
        representative_image?: { status?: string; strategy?: string };
      };

      assert.equal(preparedPath, "D:/imports/manual.jpg");
      assert.equal(applied.representative_image?.status, "embedded");
      assert.equal(applied.representative_image?.strategy, "manual_import");
    });

    it("imports a canonical citation analysis artifact", async function () {
      const workflow = await getWorkflow("import-notes");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Import Native Citation Parent" },
      });
      await handlers.parent.addNote(parent, {
        content: buildReferencesNoteContent(),
      });

      installWorkflowEditorSessionOverrideForTests(async () => ({
        saved: true,
        result: {
          citationAnalysis: {
            sourcePath:
              "Y:/Code/Python/Skill-Runner/data/runs/sample/citation_analysis.json",
            payload: buildNativeCitationArtifact(),
          },
        },
      }));

      await executeApplyResult({
        workflow,
        parent,
        bundleReader: { readText: async () => "" },
      });

      const citation = parent
        .getNotes()
        .map((id) => Zotero.Items.get(id)!)
        .find((entry) => hasGeneratedHeading(entry, "Citation Analysis"));
      assert.isOk(citation);
      const storedCitation = await parseStoredPayload(
        citation!,
        "citation-analysis-json",
      );
      assert.deepInclude(storedCitation, buildCitationPayloadWrapper());
      assert.match(storedCitation.referencesBasis, /^sha256:/);
    });

    it("accepts a canonical references artifact object", async function () {
      const workflow = await getWorkflow("import-notes");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Import Object References Parent" },
      });

      installWorkflowEditorSessionOverrideForTests(async () => ({
        saved: true,
        result: {
          references: {
            sourcePath:
              "Y:/Code/Python/Skill-Runner/data/runs/sample/references.json",
            payload: buildNativeReferencesArtifact(),
          },
        },
      }));

      await executeApplyResult({
        workflow,
        parent,
        bundleReader: { readText: async () => "" },
      });

      const references = parent
        .getNotes()
        .map((id) => Zotero.Items.get(id)!)
        .find((entry) => hasGeneratedHeading(entry, "References"));
      assert.isOk(references);
      assert.deepEqual(
        await parseStoredPayload(references!, "references-json"),
        buildReferencesPayloadWrapper(),
      );
    });

    it("aborts the whole import when overwrite is declined for any selected note", async function () {
      const workflow = await getWorkflow("import-notes");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Import Conflict Parent" },
      });
      const existingDigest = await handlers.parent.addNote(parent, {
        content: buildDigestNoteContent("# Existing Digest"),
      });
      const beforeDigestContent = existingDigest.getNote();

      let callIndex = 0;
      installWorkflowEditorSessionOverrideForTests(async () => {
        callIndex += 1;
        if (callIndex === 1) {
          return {
            saved: true,
            result: {
              digest: {
                sourcePath: "D:/imports/digest.md",
                markdown: "# Incoming Digest",
              },
              references: {
                sourcePath: "D:/imports/references.json",
                payload: buildReferencesPayloadWrapper(),
              },
            },
          };
        }
        return {
          saved: false,
          actionId: "skip",
          reason: "action",
        };
      });

      const result = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: { readText: async () => "" },
      })) as { imported?: number; skipped?: number };

      assert.deepEqual(result, { imported: 0, skipped: 2 });
      assert.equal(parent.getNotes().length, 1);
      assert.equal(
        Zotero.Items.get(existingDigest.id)!.getNote(),
        beforeDigestContent,
      );
    });

    it("reopens the import selection window after conflict dialog cancel and can continue with overwrite", async function () {
      const workflow = await getWorkflow("import-notes");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Import Conflict Retry Parent" },
      });
      const existingDigest = await handlers.parent.addNote(parent, {
        content: buildDigestNoteContent("# Old Digest"),
      });

      const importedDigest = {
        sourcePath: "D:/imports/digest.md",
        markdown: "# Reopened Digest",
        representativeImage: {
          status: "selected",
          sourcePath: "D:/imports/reopened.jpg",
          alt: "Reopened figure",
          mode: "manual",
        },
      };

      let callIndex = 0;
      installWorkflowEditorSessionOverrideForTests(async (args) => {
        callIndex += 1;
        if (callIndex === 1) {
          return {
            saved: true,
            result: {
              digest: importedDigest,
            },
          };
        }
        if (callIndex === 2) {
          return {
            saved: false,
            actionId: "cancel",
            reason: "action",
          };
        }
        if (callIndex === 3) {
          assert.deepEqual((args.initialState as any)?.digest, importedDigest);
          return {
            saved: true,
            result: {
              digest: importedDigest,
            },
          };
        }
        return {
          saved: false,
          actionId: "overwrite",
          reason: "action",
        };
      });

      await executeApplyResult({
        workflow,
        parent,
        bundleReader: { readText: async () => "" },
      });

      const digest = Zotero.Items.get(existingDigest.id)!;
      assert.equal(
        (await parseStoredPayload(digest, "digest-markdown")).content,
        "# Reopened Digest",
      );
      assert.equal(callIndex, 4);
    });
  });
});
