import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { installWorkflowEditorSessionOverrideForTests } from "../../src/modules/workflowEditorHost";
import { createHookHelpers } from "../../src/workflows/helpers";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { executeApplyResult } from "../../src/workflows/runtime";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { encodeBase64Utf8, workflowsPath } from "./workflow-test-utils";
import { isZoteroRuntime } from "../zotero/workflow-test-utils";

type ReferenceEntry = {
  id?: string;
  title?: string;
  year?: string;
  author?: string[] | string;
  citekey?: string;
  publicationTitle?: string;
  conferenceName?: string;
  university?: string;
  archiveID?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  place?: string;
};

function escapeHtml(input: string) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderLegacyReferencesTable(references: ReferenceEntry[]) {
  const rows = references.map((entry, index) => {
    const authors = Array.isArray(entry.author)
      ? entry.author.join("; ")
      : String(entry.author || "");
    return [
      "<tr>",
      `<td>${index + 1}</td>`,
      `<td>${escapeHtml(String(entry.citekey || ""))}</td>`,
      `<td>${escapeHtml(String(entry.year || ""))}</td>`,
      `<td>${escapeHtml(String(entry.title || ""))}</td>`,
      `<td>${escapeHtml(authors)}</td>`,
      "</tr>",
    ].join("");
  });
  return [
    '<table data-zs-view="references-table">',
    "<thead><tr><th>#</th><th>Citekey</th><th>Year</th><th>Title</th><th>Authors</th></tr></thead>",
    `<tbody>${rows.join("")}</tbody>`,
    "</table>",
  ].join("");
}

function buildReferencesNoteContent(references: ReferenceEntry[]) {
  const payloadJson = JSON.stringify({
    schemaVersion: 1,
    source: "reference-parity-test",
    references,
  });
  return [
    '<div data-zs-note-kind="references">',
    "<h1>References</h1>",
    renderLegacyReferencesTable(references),
    `<span data-zs-block="payload" data-zs-payload="references-json" data-zs-version="1" data-zs-encoding="base64" data-zs-value="${encodeBase64Utf8(payloadJson)}"></span>`,
    "</div>",
  ].join("\n");
}

function extractReferencesTable(noteContent: string) {
  const match = String(noteContent || "").match(
    /<table\b[^>]*>[\s\S]*?<\/table>/i,
  );
  return match ? match[0] : "";
}

function normalizeTableHtml(text: string) {
  return String(text || "")
    .replace(/\sdata-zs-view=(["'])references-table\1/gi, "")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();
}

async function getWorkflowById(workflowId: string) {
  const loaded = await loadWorkflowManifests(workflowsPath());
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === workflowId,
  );
  assert.isOk(workflow, `workflow ${workflowId} should exist`);
  return workflow!;
}

async function buildRunResultForNote(note: Zotero.Item) {
  const selectionContext = await buildSelectionContext([note]);
  return {
    resultJson: {
      selectionContext,
      parameter: {},
    },
  };
}

function installEditorOpenPassthroughMock() {
  const mockOpen = async (args: {
    initialState?: { references?: ReferenceEntry[] };
  }) => ({
    saved: true,
    result: Array.isArray(args?.initialState?.references)
      ? args.initialState.references
      : [],
  });
  installWorkflowEditorSessionOverrideForTests(mockOpen as any);
  return () => {
    installWorkflowEditorSessionOverrideForTests(null);
  };
}

const describeEditorParitySuite = isZoteroRuntime() ? describe.skip : describe;

describeEditorParitySuite("reference table canonical rendering parity", function () {
  this.timeout(30000);

  it("keeps Source/Locator rendering identical across all reference note writers", async function () {
    const digestWorkflow = await getWorkflowById("literature-digest");
    const matchingWorkflow = await getWorkflowById("reference-matching");
    const editorWorkflow = await getWorkflowById("reference-note-editor");
    const references: ReferenceEntry[] = [
      {
        id: "p-1",
        title: "Canonical Parity Title",
        year: "2026",
        author: ["Parity Author"],
        citekey: "parity_canonical_2026",
        publicationTitle: "Parity Journal",
        conferenceName: "Ignored Conference",
        archiveID: "arXiv:2601.00001",
        volume: "8",
        issue: "2",
        pages: "21-30",
        place: "Paris",
      },
    ];
    const expectedTable = createHookHelpers(
      Zotero,
    ).renderReferencesTable(references);

    await handlers.item.create({
      itemType: "journalArticle",
      fields: {
        title: "Canonical Parity Title",
        date: "2026",
        extra: "Citation Key: parity_canonical_2026",
      },
    });

    const digestParent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Digest Parity Parent" },
    });
    const digestBundleReader = {
      readText: async (entryPath: string) => {
        if (entryPath === "result/result.json") {
          return JSON.stringify({
            data: {
              digest_path: "digest.md",
              references_path: "references.json",
              citation_analysis_path: "citation_analysis.json",
            },
          });
        }
        if (entryPath === "artifacts/digest.md") {
          return "# Digest\n\nParity content";
        }
        if (entryPath === "artifacts/references.json") {
          return JSON.stringify({ references });
        }
        if (entryPath === "artifacts/citation_analysis.json") {
          return JSON.stringify({ report_md: "## Citation Analysis\n\n- parity" });
        }
        throw new Error(`unexpected bundle entry: ${entryPath}`);
      },
    };
    await executeApplyResult({
      workflow: digestWorkflow,
      parent: digestParent,
      bundleReader: digestBundleReader,
    });
    const digestNotes = (digestParent.getNotes() || [])
      .map((id) => Zotero.Items.get(id))
      .filter(Boolean) as Zotero.Item[];
    const digestReferencesNote = digestNotes.find((note) =>
      /<h1[^>]*>\s*References\s*<\/h1>/i.test(note.getNote()),
    );
    assert.isOk(digestReferencesNote, "digest references note should exist");

    const matchingParent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Matching Parity Parent" },
    });
    const matchingNote = await handlers.parent.addNote(matchingParent, {
      content: buildReferencesNoteContent(references),
    });
    await executeApplyResult({
      workflow: matchingWorkflow,
      parent: matchingParent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(matchingNote),
    });

    const editorParent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Editor Parity Parent" },
    });
    const editorNote = await handlers.parent.addNote(editorParent, {
      content: buildReferencesNoteContent(references),
    });
    const restoreEditorOpen = installEditorOpenPassthroughMock();
    try {
      await executeApplyResult({
        workflow: editorWorkflow,
        parent: editorParent,
        bundleReader: { readText: async () => "" },
        runResult: await buildRunResultForNote(editorNote),
      });
    } finally {
      restoreEditorOpen();
    }

    const digestTable = extractReferencesTable(digestReferencesNote!.getNote());
    const matchingTable = extractReferencesTable(
      Zotero.Items.get(matchingNote.id)!.getNote(),
    );
    const editorTable = extractReferencesTable(Zotero.Items.get(editorNote.id)!.getNote());

    assert.equal(normalizeTableHtml(digestTable), normalizeTableHtml(expectedTable));
    assert.equal(
      normalizeTableHtml(matchingTable),
      normalizeTableHtml(expectedTable),
    );
    assert.equal(normalizeTableHtml(editorTable), normalizeTableHtml(expectedTable));
  });
});
