import { assert } from "chai";
import { getSelectedImportCandidateForKind } from "../../workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs";
import { handlers } from "../../src/handlers";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { installWorkflowEditorSessionOverrideForTests } from "../../src/modules/workflowEditorHost";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  executeApplyResult,
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
import { resolveRepresentativeImageMarkdownImportCandidate } from "../../workflows_builtin/literature-workbench-package/lib/representativeImage.mjs";
import {
  analyzeNoteHtmlForDebug,
  parsePseudoEmbeddedPayloadBytesForDebug,
} from "../../workflows_builtin/literature-workbench-package/debug-note-artifact-inspector/hooks/applyResult.mjs";
import { parseEmbeddedNotePayloadBlock } from "../../src/modules/notePayloadCodec";

type LoadedWorkflow = Awaited<
  ReturnType<typeof loadWorkflowManifests>
>["workflows"][number];

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
    renderPayloadBlock("digest-markdown", {
      version: 1,
      entry: "artifacts/digest.md",
      format: "markdown",
      content: markdown,
    }),
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
    renderPayloadBlock("digest-markdown", {
      version: 1,
      entry: "artifacts/digest.md",
      format: "markdown",
      content: markdown,
    }),
    "</div>",
  ].join("\n");
}

function buildNativeReferencesArtifact() {
  return [
    {
      author: ["Alice Zhang"],
      title: "Structured Reference",
      year: 2024,
      raw: "Alice Zhang. Structured Reference. 2024.",
      confidence: 0.92,
    },
  ];
}

function buildSchemaWrappedReferencesArtifact() {
  return {
    items: buildNativeReferencesArtifact(),
  };
}

function buildReferencesPayloadWrapper() {
  return {
    version: 1,
    entry: "artifacts/references.json",
    format: "json",
    references: buildNativeReferencesArtifact(),
  };
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
    meta: {
      language: "en",
      scope: {
        section_title: "Results",
        line_start: 1,
        line_end: 12,
      },
    },
    items: [],
    unmapped_mentions: [],
    summary: "Summary text",
    timeline: {
      early: {},
      mid: {},
      recent: {},
    },
    report_md: "# Citation Analysis\n\nStructured report",
  };
}

function buildCitationPayloadWrapper() {
  return {
    version: 1,
    entry: "artifacts/citation_analysis.json",
    format: "json",
    citation_analysis: buildNativeCitationArtifact(),
  };
}

function buildCitationNoteContent() {
  return [
    '<div data-zs-note-kind="citation-analysis">',
    "<h1>Citation Analysis</h1>",
    '<div data-zs-view="citation-analysis-html"><p>Structured report</p></div>',
    renderPayloadBlock("citation-analysis-json", buildCitationPayloadWrapper()),
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
    return parsePayload(note.getNote(), payloadType);
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
      return block.payload;
    }
  }
  assert.fail(`payload ${payloadType} should exist`);
}

const describeImportEditorSuite = isZoteroRuntime() ? describe.skip : describe;
const itNodeOnly = isZoteroRuntime() ? it.skip : it;
const itZoteroFullOrNode =
  isZoteroRuntime() && !isFullTestMode() ? it.skip : it;

describe("workflow: literature-workbench import/export notes", function () {
  this.timeout(30000);

  afterEach(function () {
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
          (entry) =>
            entry.manifest.id === "add-digest-representative-image",
        ),
      );
    },
  );

  itNodeOnly(
    "loads literature-workbench debug-only note artifact workflows",
    async function () {
      const loaded = await loadWorkflowManifests(workflowsPath());
      const debugApply = loaded.workflows.find(
        (entry) => entry.manifest.id === "debug-digest-apply-fixture",
      );
      const debugInspector = loaded.workflows.find(
        (entry) => entry.manifest.id === "debug-note-artifact-inspector",
      );
      const debugMigrator = loaded.workflows.find(
        (entry) => entry.manifest.id === "debug-migrate-note-payloads",
      );

      assert.isOk(debugApply);
      assert.isOk(debugInspector);
      assert.isOk(debugMigrator);
      assert.equal(debugApply?.manifest.debug_only, true);
      assert.equal(debugInspector?.manifest.debug_only, true);
      assert.equal(debugMigrator?.manifest.debug_only, true);
      assert.isFunction(debugApply?.hooks.applyResult);
      assert.isFunction(debugInspector?.hooks.applyResult);
      assert.isFunction(debugMigrator?.hooks.applyResult);
    },
  );

  it("debug migrator converts legacy digest payload blocks to payload attachments", async function () {
    const workflow = await getWorkflow("debug-migrate-note-payloads");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Debug Migrator Legacy Parent" },
    });
    const digestNote = await handlers.parent.addNote(parent, {
      content: [
        '<div data-zs-note-kind="digest">',
        "<h1>Digest</h1>",
        '<div data-zs-view="digest-html">',
        "<h2>TL;DR</h2>",
        "<p>Legacy visible body.</p>",
        "</div>",
        renderPayloadBlock("digest-markdown", {
          version: 1,
          entry: "artifacts/digest.md",
          format: "markdown",
          content: "# Digest\n\nStale legacy payload.",
        }),
        "</div>",
      ].join("\n"),
    });

    const result = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
    })) as {
      summary?: { migratedCount?: number; recoveredDigestCount?: number };
      notes?: Array<{ status?: string; payloadType?: string }>;
    };

    const migratedNote = Zotero.Items.get(digestNote.id)!;
    assert.equal(result.summary?.migratedCount, 1);
    assert.equal(result.summary?.recoveredDigestCount, 1);
    assert.equal(result.notes?.[0]?.status, "migrated");
    assert.equal(result.notes?.[0]?.payloadType, "digest-markdown");
    assert.include(migratedNote.getNote(), 'data-schema-version="9"');
    assert.notInclude(migratedNote.getNote(), "data-zs-payload");
    assert.notInclude(migratedNote.getNote(), "data-zs-note-kind");
    assert.equal(
      (await parseStoredPayload(migratedNote, "digest-markdown")).content,
      "## TL;DR\n\nLegacy visible body.",
    );
  });

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

    const hostModule = await import("../../src/workflows/hostApi");
    const baseHostApi = hostModule.createWorkflowHostApi();
    const applied = (await executeApplyResult({
      workflow,
      parent,
      request: requests[0],
      bundleReader: { readText: async () => "" },
      runtime: {
        hostApi: {
          ...baseHostApi,
          images: {
            ...baseHostApi.images,
            async prepareForNoteEmbedding(source: unknown) {
              assert.equal(String(source), imagePath);
              return {
                mimeType: "image/jpeg",
                bytes: new Uint8Array([9, 8, 7]),
                width: 640,
                height: 360,
                originalBytes: 4,
                compressedBytes: 3,
              };
            },
          },
          notes: {
            ...baseHostApi.notes,
            async importEmbeddedImage(note: Zotero.Item, image: any) {
              if (image?.diagnostics?.workbenchPayload === true) {
                return baseHostApi.notes.importEmbeddedImage(note, image);
              }
              return {
                attachmentKey: "IMGADD1",
                attachmentItem: {} as Zotero.Item,
              };
            },
          },
        } as any,
        hostApiVersion: hostModule.WORKFLOW_HOST_API_VERSION,
      },
    })) as { status?: string; representative_image?: { attachmentKey?: string } };

    const updatedDigest = Zotero.Items.get(digestNote.id)!;
    assert.equal(applied.status, "embedded");
    assert.equal(applied.representative_image?.attachmentKey, "IMGADD1");
    assert.include(updatedDigest.getNote(), 'data-attachment-key="IMGADD1"');
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

  it("adds a representative image to a normalized digest note without stored payload", async function () {
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

    const hostModule = await import("../../src/workflows/hostApi");
    const baseHostApi = hostModule.createWorkflowHostApi();
    const applied = (await executeApplyResult({
      workflow,
      parent,
      request: requests[0],
      bundleReader: { readText: async () => "" },
      runtime: {
        hostApi: {
          ...baseHostApi,
          images: {
            ...baseHostApi.images,
            async prepareForNoteEmbedding(source: unknown) {
              assert.equal(String(source), imagePath);
              return {
                mimeType: "image/jpeg",
                bytes: new Uint8Array([7, 6, 5]),
                width: 500,
                height: 200,
                originalBytes: 3,
                compressedBytes: 3,
              };
            },
          },
          notes: {
            ...baseHostApi.notes,
            async importEmbeddedImage(note: Zotero.Item, image: any) {
              if (image?.diagnostics?.workbenchPayload === true) {
                return baseHostApi.notes.importEmbeddedImage(note, image);
              }
              return {
                attachmentKey: "IMGREC1",
                attachmentItem: {} as Zotero.Item,
              };
            },
          },
        } as any,
        hostApiVersion: hostModule.WORKFLOW_HOST_API_VERSION,
      },
    })) as { status?: string };

    const updatedDigest = Zotero.Items.get(digestNote.id)!;
    assert.equal(applied.status, "embedded");
    assert.include(updatedDigest.getNote(), 'data-attachment-key="IMGREC1"');
    assert.equal(
      (await parseStoredPayload(updatedDigest, "digest-markdown")).content,
      "## TL;DR\n\nRecovered visible body.",
    );
  });

  it("debug migrator recovers normalized digest markdown from visible HTML", async function () {
    const workflow = await getWorkflow("debug-migrate-note-payloads");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Debug Migrator Normalized Parent" },
    });
    const digestNote = await handlers.parent.addNote(parent, {
      content: [
        '<div data-schema-version="9">',
        "<h1>Digest</h1>",
        '<p><img alt="Figure 1" width="720" height="200" data-attachment-key="IMGDEBUG1"></p>',
        "<p>Figure 1. Normalized figure caption.</p>",
        "<h2>TL;DR</h2>",
        "<p>Recovered body.</p>",
        "</div>",
      ].join("\n"),
    });

    const result = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
    })) as {
      summary?: { migratedCount?: number; recoveredDigestCount?: number };
      notes?: Array<{ source?: string }>;
    };

    const migratedNote = Zotero.Items.get(digestNote.id)!;
    const payload = await parseStoredPayload(migratedNote, "digest-markdown");
    assert.equal(result.summary?.migratedCount, 1);
    assert.equal(result.summary?.recoveredDigestCount, 1);
    assert.equal(result.notes?.[0]?.source, "rebuilt-digest-html");
    assert.include(migratedNote.getNote(), 'data-attachment-key="IMGDEBUG1"');
    assert.notInclude(migratedNote.getNote(), "data-zs-payload");
    assert.notInclude(payload.content, "# Digest");
    assert.include(payload.content, "## TL;DR");
    assert.include(payload.content, "Recovered body.");
    assert.match(payload.content, /^## TL;DR\s*\n\s*Recovered body\./);
    assert.equal(payload.recovery?.source, "note_html");
  });

  it("debug migrator rebuilds digest payload attachments from current visible HTML", async function () {
    const workflow = await getWorkflow("debug-migrate-note-payloads");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Debug Migrator Rebuild Parent" },
    });
    const digestNote = await handlers.parent.addNote(parent, {
      content: [
        '<div data-schema-version="9">',
        "<h1>Digest</h1>",
        "<h2>TL;DR</h2>",
        "<p>Old visible body.</p>",
        "</div>",
      ].join("\n"),
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
    });
    await handlers.note.update(digestNote, {
      content: [
        '<div data-schema-version="9">',
        "<h1>Digest</h1>",
        "<h2>TL;DR</h2>",
        "<p>Fresh visible body.</p>",
        "</div>",
      ].join("\n"),
    });

    const result = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
    })) as {
      summary?: { migratedCount?: number };
      notes?: Array<{ status?: string; source?: string; reason?: string }>;
    };

    const migratedNote = Zotero.Items.get(digestNote.id)!;
    const payload = await parseStoredPayload(migratedNote, "digest-markdown");
    assert.equal(result.summary?.migratedCount, 1);
    assert.equal(result.notes?.[0]?.status, "migrated");
    assert.equal(result.notes?.[0]?.source, "rebuilt-digest-html");
    assert.notEqual(result.notes?.[0]?.reason, "already_attachment_backed");
    assert.equal(payload.content, "## TL;DR\n\nFresh visible body.");
  });

  it("classifies payload-backed and editor-rewritten digest note HTML", function () {
    const payloadBacked = analyzeNoteHtmlForDebug(
      buildDigestNoteContentWithRepresentativeImage(
        "# Digest\n\nBody",
        "ABCD1234",
      ),
    );
    assert.equal(payloadBacked.currentExportKindGuess, "digest");
    assert.equal(payloadBacked.hasDigestPayload, true);
    assert.equal(payloadBacked.hasRepresentativeImageBlock, true);
    assert.equal(payloadBacked.diagnosis, "payload_backed_digest");

    const editorRewritten = analyzeNoteHtmlForDebug(
      [
        '<div data-schema-version="9">',
        "<h1>Digest</h1>",
        '<p><img alt="Figure 1" data-attachment-key="ABCD1234"></p>',
        "<p>Visible digest body.</p>",
        "</div>",
      ].join("\n"),
    );
    assert.equal(editorRewritten.currentExportKindGuess, "digest");
    assert.equal(editorRewritten.hasSchemaVersion, true);
    assert.equal(editorRewritten.hasDigestPayload, false);
    assert.equal(
      editorRewritten.diagnosis,
      "html_only_digest_after_editor_rewrite",
    );
  });

  it("decodes debug pseudo embedded-image payload markers", function () {
    const envelope = {
      schemaVersion: 1,
      kind: "zotero-skills-debug-pseudo-embedded-image-payload",
      noteKind: "digest",
      noteKey: "NOTEKEY",
      payloadType: "digest-markdown",
      payload: {
        format: "markdown",
        entry: "artifacts/digest.md",
        content: "# Digest\n\nDebug payload.",
      },
    };
    const suffix = new TextEncoder().encode(
      `\nZS_EMBEDDED_PAYLOAD_V1:${encodeBase64Utf8(JSON.stringify(envelope))}\n`,
    );
    const bytes = new Uint8Array(8 + suffix.length);
    bytes.set(new Uint8Array([137, 80, 78, 71, 0, 0, 0, 0]), 0);
    bytes.set(suffix, 8);

    const parsed = parsePseudoEmbeddedPayloadBytesForDebug(bytes, {
      TextDecoder,
      Buffer,
    });
    assert.equal(parsed?.payloadType, "digest-markdown");
    assert.equal(parsed?.noteKind, "digest");
    assert.equal(parsed?.payloadEntry, "artifacts/digest.md");
    assert.equal(parsed?.contentLength, 24);
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
        exportCandidates?: Array<{ kind?: string; parentItemID?: number }>;
      }>;

      assert.lengthOf(requests, 1);
      assert.equal(requests[0].kind, "pass-through.run.v1");
      assert.deepEqual(
        (requests[0].exportCandidates || []).map((entry) => ({
          kind: entry.kind,
          parentItemID: entry.parentItemID,
        })),
        [
          { kind: "digest", parentItemID: parentA.id },
          { kind: "references", parentItemID: parentB.id },
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
    assert.equal(
      await readUtf8(joinPath(targetDir, "citation_analysis.md")),
      "# Citation Analysis\n\nStructured report",
    );
  });

  it("exports digest representative image as markdown marker and sidecar image", async function () {
    const workflow = await getWorkflow("export-notes");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Representative Export Parent" },
    });
    const digestNote = await handlers.parent.addNote(parent, {
      content: buildDigestNoteContent("# Digest Export\n\nBody"),
    });
    const imageRoot = await mkTempDir("literature-workbench-rep-export-image");
    const sourceImagePath = joinPath(imageRoot, "source.jpg");
    const imageBytes = new Uint8Array([1, 2, 3, 4, 5]);
    await writeBytes(sourceImagePath, imageBytes);
    const attachment = await handlers.attachment.createFromPath({
      parent: digestNote,
      path: sourceImagePath,
      title: "representative_image.jpg",
      mimeType: "image/jpeg",
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
        "MISSINGIMG",
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

  describeImportEditorSuite("import-notes editor-driven flows", function () {
    it("imports selected digest/references/citation files and upserts generated notes", async function () {
      const workflow = await getWorkflow("import-notes");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Import Apply Parent" },
      });

      installWorkflowEditorSessionOverrideForTests(async () => ({
        saved: true,
        result: {
          digest: {
            sourcePath: "D:/imports/digest.md",
            markdown: "# Imported Digest\n\nBody",
          },
          references: {
            sourcePath: "D:/imports/references.json",
            payload: {
              version: 1,
              entry: "D:/imports/references.json",
              format: "json",
              references: buildNativeReferencesArtifact(),
            },
          },
          citationAnalysis: {
            sourcePath: "D:/imports/citation_analysis.json",
            payload: {
              version: 1,
              entry: "D:/imports/citation_analysis.json",
              format: "json",
              citation_analysis: buildNativeCitationArtifact(),
            },
          },
        },
      }));

      await executeApplyResult({
        workflow,
        parent,
        bundleReader: { readText: async () => "" },
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
      assert.deepEqual(importedReferencesPayload, {
        ...buildReferencesPayloadWrapper(),
        entry: "D:/imports/references.json",
      });
      const importedCitationPayload = await parseStoredPayload(
        citation!,
        "citation-analysis-json",
      );
      assert.deepEqual(importedCitationPayload, {
        ...buildCitationPayloadWrapper(),
        entry: "D:/imports/citation_analysis.json",
      });
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

      const hostModule = await import("../../src/workflows/hostApi");
      const baseHostApi = hostModule.createWorkflowHostApi();
      const resolved = await resolveRepresentativeImageMarkdownImportCandidate({
        runtime: {
          hostApi: baseHostApi,
          hostApiVersion: hostModule.WORKFLOW_HOST_API_VERSION,
        },
        digestPath,
        markdown: await readUtf8(digestPath),
      });
      let preparedPath = "";

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
            images: {
              async prepareForNoteEmbedding(source: unknown) {
                preparedPath = String(source || "");
                return {
                  bytes: new Uint8Array([1, 2, 3]),
                  mimeType: "image/jpeg",
                  width: 720,
                  height: 405,
                  originalBytes: 1024,
                  compressedBytes: 100 * 1024,
                };
              },
            },
            editor: {
              ...baseHostApi.editor,
              async openSession() {
                return editorResult;
              },
            },
            notes: {
              ...baseHostApi.notes,
              async importEmbeddedImage(note: Zotero.Item, image: any) {
                if (image?.mimeType === "image/png") {
                  return baseHostApi.notes.importEmbeddedImage(note, image);
                }
                return {
                  attachmentKey: "IMGIMPORT1",
                  attachmentItem: {} as Zotero.Item,
                  mimeType: "image/jpeg",
                  bytes: 100 * 1024,
                };
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
      assert.equal(applied.representative_image?.attachmentKey, "IMGIMPORT1");
      const digest = parent
        .getNotes()
        .map((id) => Zotero.Items.get(id)!)
        .find((entry) => hasGeneratedHeading(entry, "Digest"));
      assert.isOk(digest);
      assert.include(digest!.getNote(), 'data-attachment-key="IMGIMPORT1"');
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
      const hostModule = await import("../../src/workflows/hostApi");
      const baseHostApi = hostModule.createWorkflowHostApi();
      let preparedPath = "";

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
            images: {
              async prepareForNoteEmbedding(source: unknown) {
                preparedPath = String(source || "");
                return {
                  bytes: new Uint8Array([1, 2, 3]),
                  mimeType: "image/jpeg",
                  width: 640,
                  height: 360,
                  originalBytes: 1024,
                  compressedBytes: 90 * 1024,
                };
              },
            },
            editor: {
              ...baseHostApi.editor,
              async openSession() {
                return editorResult;
              },
            },
            notes: {
              ...baseHostApi.notes,
              async importEmbeddedImage(note: Zotero.Item, image: any) {
                if (image?.mimeType === "image/png") {
                  return baseHostApi.notes.importEmbeddedImage(note, image);
                }
                return {
                  attachmentKey: "IMGMANUAL",
                  attachmentItem: {} as Zotero.Item,
                  mimeType: "image/jpeg",
                  bytes: 90 * 1024,
                };
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

    it("imports a native citation analysis artifact and rejects wrapper-shaped citation imports", async function () {
      const workflow = await getWorkflow("import-notes");
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Import Native Citation Parent" },
      });

      installWorkflowEditorSessionOverrideForTests(async () => ({
        saved: true,
        result: {
          citationAnalysis: {
            sourcePath:
              "Y:/Code/Python/Skill-Runner/data/runs/sample/citation_analysis.json",
            payload: {
              version: 1,
              entry:
                "Y:/Code/Python/Skill-Runner/data/runs/sample/citation_analysis.json",
              format: "json",
              citation_analysis: buildNativeCitationArtifact(),
            },
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
      assert.deepEqual(
        await parseStoredPayload(citation!, "citation-analysis-json"),
        {
          ...buildCitationPayloadWrapper(),
          entry:
            "Y:/Code/Python/Skill-Runner/data/runs/sample/citation_analysis.json",
        },
      );
    });

    it("accepts schema-style native references artifact object with top-level items", async function () {
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
            payload: {
              version: 1,
              entry:
                "Y:/Code/Python/Skill-Runner/data/runs/sample/references.json",
              format: "json",
              references: buildNativeReferencesArtifact(),
            },
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
        {
          ...buildReferencesPayloadWrapper(),
          entry: "Y:/Code/Python/Skill-Runner/data/runs/sample/references.json",
        },
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
