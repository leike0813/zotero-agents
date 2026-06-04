import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { installWorkflowEditorSessionOverrideForTests } from "../../src/modules/workflowEditorHost";
import { executeWorkflowFromCurrentSelection } from "../../src/modules/workflowExecute";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  executeApplyResult,
  executeBuildRequests,
} from "../../src/workflows/runtime";
import {
  decodeBase64Utf8,
  encodeBase64Utf8,
  workflowsPath,
} from "./workflow-test-utils";
import { isZoteroRuntime } from "../zotero/workflow-test-utils";

type ReferenceEntry = {
  id?: string;
  title?: string;
  year?: string;
  author?: string[] | string;
  citekey?: string;
  rawText?: string;
  publicationTitle?: string;
  conferenceName?: string;
  university?: string;
  archiveID?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  place?: string;
};

type HostOpenArgs = {
  rendererId?: string;
  title?: string;
  context?: {
    parentTitle?: string;
    progressLabel?: string;
  };
  initialState?: {
    references?: ReferenceEntry[];
  };
};

type HostOpenResult = {
  saved: boolean;
  result?: ReferenceEntry[] | { references?: ReferenceEntry[] };
  reason?: string;
};

type RuntimeWithEditorBridge = typeof globalThis & {
  __zsWorkflowEditorHostOpen?: (
    args: HostOpenArgs,
  ) => Promise<HostOpenResult> | HostOpenResult;
  addon?: {
    data?: {
      workflowEditorHost?: {
        open?: (
          args: HostOpenArgs,
        ) => Promise<HostOpenResult> | HostOpenResult;
      };
    };
  };
};

function escapeHtml(input: string) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderReferencesTable(references: ReferenceEntry[]) {
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
    source: "reference-note-editor-test",
    references,
  });
  return [
    '<div data-zs-note-kind="references">',
    "<h1>References</h1>",
    renderReferencesTable(references),
    `<span data-zs-block="payload" data-zs-payload="references-json" data-zs-version="1" data-zs-encoding="base64" data-zs-value="${encodeBase64Utf8(payloadJson)}"></span>`,
    "</div>",
  ].join("\n");
}

function extractAttribute(tagText: string, attrName: string) {
  const match = String(tagText || "").match(
    new RegExp(
      `${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
      "i",
    ),
  );
  return match ? String(match[1] || match[2] || match[3] || "") : "";
}

function parsePayloadReferences(noteContent: string) {
  const payloadTag = String(noteContent || "").match(
    /<span[^>]*data-zs-payload=(["'])references-json\1[^>]*>/i,
  );
  assert.isOk(payloadTag, "references payload span should exist");
  const encoded = extractAttribute(payloadTag![0], "data-zs-value");
  const payload = JSON.parse(decodeBase64Utf8(encoded));
  const references = Array.isArray(payload?.references) ? payload.references : [];
  return references as ReferenceEntry[];
}

function extractRenderedTitles(noteContent: string) {
  const tbodyMatch = String(noteContent || "").match(
    /<tbody>([\s\S]*?)<\/tbody>/i,
  );
  if (!tbodyMatch) {
    return [] as string[];
  }
  const titleCells = Array.from(
    tbodyMatch[1].matchAll(/<tr>[\s\S]*?<td>[\s\S]*?<\/td>[\s\S]*?<td>[\s\S]*?<\/td>[\s\S]*?<td>[\s\S]*?<\/td>[\s\S]*?<td>([\s\S]*?)<\/td>/g),
  );
  return titleCells.map((match) =>
    String(match[1] || "")
      .replace(/<[^>]+>/g, "")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&")
      .trim(),
  );
}

function decodeHtmlCellText(text: string) {
  return String(text || "")
    .replace(/<[^>]+>/g, "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .trim();
}

function extractRenderedHeaders(noteContent: string) {
  const headerMatch = String(noteContent || "").match(
    /<thead>\s*<tr>([\s\S]*?)<\/tr>\s*<\/thead>/i,
  );
  if (!headerMatch) {
    return [] as string[];
  }
  return Array.from(headerMatch[1].matchAll(/<th>([\s\S]*?)<\/th>/g)).map(
    (match) => decodeHtmlCellText(match[1] || ""),
  );
}

function extractRenderedRowCells(noteContent: string, rowIndex: number) {
  const tbodyMatch = String(noteContent || "").match(
    /<tbody>([\s\S]*?)<\/tbody>/i,
  );
  if (!tbodyMatch) {
    return [] as string[];
  }
  const rows = Array.from(tbodyMatch[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g));
  const row = rows[rowIndex];
  if (!row) {
    return [] as string[];
  }
  return Array.from(row[1].matchAll(/<td>([\s\S]*?)<\/td>/g)).map((match) =>
    decodeHtmlCellText(match[1] || ""),
  );
}

async function getReferenceNoteEditorWorkflow() {
  const loaded = await loadWorkflowManifests(workflowsPath());
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === "reference-note-editor",
  );
  assert.isOk(
    workflow,
    `workflow reference-note-editor not found; loaded=${loaded.workflows.map((entry) => entry.manifest.id).join(",")} warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
  );
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

function installEditorOpenMock(
  mockOpen: (args: HostOpenArgs) => Promise<HostOpenResult> | HostOpenResult,
) {
  installWorkflowEditorSessionOverrideForTests(mockOpen as any);
  return () => {
    installWorkflowEditorSessionOverrideForTests(null);
  };
}

const describeEditorSuite = isZoteroRuntime() ? describe.skip : describe;

describeEditorSuite("workflow: reference-note-editor", function () {
  this.timeout(30000);

  it("accepts same legal inputs as reference-matching (direct note + parent expansion)", async function () {
    const workflow = await getReferenceNoteEditorWorkflow();
    const parentA = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Editor Parent A" },
    });
    const parentB = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Editor Parent B" },
    });
    const noteA = await handlers.parent.addNote(parentA, {
      content: buildReferencesNoteContent([
        { id: "a-1", title: "A1", year: "2024", author: ["A"] },
      ]),
    });
    const noteB = await handlers.parent.addNote(parentB, {
      content: buildReferencesNoteContent([
        { id: "b-1", title: "B1", year: "2025", author: ["B"] },
      ]),
    });
    const normalNote = await handlers.parent.addNote(parentB, {
      content: "<div><h1>Digest</h1><p>Not references</p></div>",
    });
    const directSelection = await buildSelectionContext([normalNote, noteA]);
    const directRequests = (await executeBuildRequests({
      workflow,
      selectionContext: directSelection,
    })) as Array<{
      selectionContext?: {
        items?: { notes?: Array<{ item?: { id?: number } }> };
      };
    }>;
    assert.lengthOf(directRequests, 1);
    assert.equal(directRequests[0].selectionContext?.items?.notes?.[0]?.item?.id, noteA.id);

    const parentSelection = await buildSelectionContext([parentA, parentB]);
    const parentRequests = (await executeBuildRequests({
      workflow,
      selectionContext: parentSelection,
    })) as Array<{
      selectionContext?: {
        items?: { notes?: Array<{ item?: { id?: number } }> };
      };
    }>;
    const resolvedIds = parentRequests
      .map((entry) => entry.selectionContext?.items?.notes?.[0]?.item?.id)
      .filter((id): id is number => typeof id === "number")
      .sort((a, b) => a - b);
    assert.deepEqual(resolvedIds, [noteA.id, noteB.id].sort((a, b) => a - b));
  });

  it("opens editor sequentially for multi-input trigger and exposes parent context", async function () {
    const workflow = await getReferenceNoteEditorWorkflow();
    const parentA = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Editor Sequence Parent A" },
    });
    const parentB = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Editor Sequence Parent B" },
    });
    await handlers.parent.addNote(parentA, {
      content: buildReferencesNoteContent([
        { id: "a-1", title: "A1", year: "2024", author: ["A"] },
      ]),
    });
    await handlers.parent.addNote(parentB, {
      content: buildReferencesNoteContent([
        { id: "b-1", title: "B1", year: "2025", author: ["B"] },
      ]),
    });
    const calls: Array<{ parentTitle: string; rendererId: string }> = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const runtime = globalThis as RuntimeWithEditorBridge & {
      ztoolkit?: {
        ProgressWindow?: new (
          title: string,
          options?: Record<string, unknown>,
        ) => {
          createLine: (args: { text?: string }) => {
            show: () => { startCloseTimer?: (delayMs: number) => unknown };
          };
        };
      };
    };
    const toastLines: string[] = [];
    const hadToolkit = Boolean(runtime.ztoolkit);
    const prevProgressWindow = runtime.ztoolkit?.ProgressWindow;
    runtime.ztoolkit = runtime.ztoolkit || {};
    runtime.ztoolkit.ProgressWindow = class MockProgressWindow {
      createLine(args: { text?: string }) {
        toastLines.push(String(args?.text || ""));
        return {
          show() {
            return {
              startCloseTimer() {
                return undefined;
              },
            };
          },
        };
      }
    };
    const restoreOpen = installEditorOpenMock(async (args) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      calls.push({
        parentTitle: String(args?.context?.parentTitle || ""),
        rendererId: String(args?.rendererId || ""),
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;
      return {
        saved: true,
        result: Array.isArray(args?.initialState?.references)
          ? args.initialState.references
          : [],
      };
    });
    const alerts: string[] = [];
    const win = {
      ZoteroPane: {
        getSelectedItems: () => [parentA, parentB],
      },
      alert: (message: string) => alerts.push(message),
    } as unknown as _ZoteroTypes.MainWindow;

    try {
      await executeWorkflowFromCurrentSelection({
        win,
        workflow,
      });
    } finally {
      if (hadToolkit) {
        runtime.ztoolkit!.ProgressWindow = prevProgressWindow;
      } else {
        delete runtime.ztoolkit;
      }
      restoreOpen();
    }

    assert.equal(maxInFlight, 1, "editor windows must be sequential");
    assert.lengthOf(calls, 2);
    assert.isTrue(
      calls.some(
        (entry) =>
          /Reference Editor Sequence Parent A/.test(entry.parentTitle) &&
          entry.rendererId === "reference-note-editor.default.v1",
      ),
    );
    assert.isTrue(
      calls.some(
        (entry) =>
          /Reference Editor Sequence Parent B/.test(entry.parentTitle) &&
          entry.rendererId === "reference-note-editor.default.v1",
      ),
    );
    assert.lengthOf(alerts, 0);
    assert.lengthOf(toastLines, 0);
  });

  it("persists edit/add/delete/reorder after save", async function () {
    const workflow = await getReferenceNoteEditorWorkflow();
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Editor Save Parent" },
    });
    const note = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent([
        { id: "r-1", title: "First", year: "2020", author: ["Alpha"] },
        { id: "r-2", title: "Second", year: "2021", author: ["Beta"] },
      ]),
    });
    const restoreOpen = installEditorOpenMock(async () => ({
      saved: true,
      result: [
        {
          id: "r-2",
          title: "Second (Edited)",
          year: "2021",
          author: ["Beta", "Gamma"],
          citekey: "beta_second_2021",
          rawText: "Edited second row",
          conferenceName: "VisionConf 2021",
          volume: "42",
          issue: "7",
          pages: "101-120",
        },
        {
          id: "r-3",
          title: "Third (Added)",
          year: "2022",
          author: ["Delta"],
          citekey: "delta_third_2022",
          rawText: "Added row",
          publicationTitle: "Journal of Added Rows",
          archiveID: "arXiv:2201.00001",
          place: "Zurich",
        },
      ],
    }));

    try {
      await executeApplyResult({
        workflow,
        parent,
        bundleReader: { readText: async () => "" },
        runResult: await buildRunResultForNote(note),
      });
    } finally {
      restoreOpen();
    }

    const updated = Zotero.Items.get(note.id)!;
    const updatedNoteContent = updated.getNote();
    const payloadRefs = parsePayloadReferences(updatedNoteContent);
    assert.deepEqual(
      payloadRefs.map((entry) => String(entry.title || "")),
      ["Second (Edited)", "Third (Added)"],
    );
    assert.deepEqual(extractRenderedTitles(updatedNoteContent), [
      "Second (Edited)",
      "Third (Added)",
    ]);
    assert.deepEqual(extractRenderedHeaders(updatedNoteContent), [
      "#",
      "Citekey",
      "Year",
      "Title",
      "Authors",
      "Source",
      "Locator",
    ]);
    const firstRow = extractRenderedRowCells(updatedNoteContent, 0);
    const secondRow = extractRenderedRowCells(updatedNoteContent, 1);
    assert.equal(firstRow[5], "VisionConf 2021");
    assert.equal(firstRow[6], "Vol. 42; No. 7; pp. 101-120");
    assert.equal(secondRow[5], "Journal of Added Rows");
    assert.equal(secondRow[6], "Zurich");
    assert.equal(String(payloadRefs[0]?.citekey || ""), "beta_second_2021");
    assert.equal(String(payloadRefs[1]?.citekey || ""), "delta_third_2022");
    assert.equal(String(payloadRefs[0]?.conferenceName || ""), "VisionConf 2021");
    assert.equal(String(payloadRefs[0]?.volume || ""), "42");
    assert.equal(String(payloadRefs[0]?.issue || ""), "7");
    assert.equal(String(payloadRefs[0]?.pages || ""), "101-120");
    assert.equal(
      String(payloadRefs[1]?.publicationTitle || ""),
      "Journal of Added Rows",
    );
    assert.equal(String(payloadRefs[1]?.archiveID || ""), "arXiv:2201.00001");
    assert.equal(String(payloadRefs[1]?.place || ""), "Zurich");
  });

  it("fails current job on cancel/close without save and keeps note unchanged", async function () {
    const workflow = await getReferenceNoteEditorWorkflow();
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Editor Cancel Parent" },
    });
    const note = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent([
        { id: "r-1", title: "Stable", year: "2024", author: ["Keeper"] },
      ]),
    });
    const before = note.getNote();
    const restoreOpen = installEditorOpenMock(async () => ({
      saved: false,
      reason: "user-canceled",
    }));
    const alerts: string[] = [];
    const win = {
      ZoteroPane: {
        getSelectedItems: () => [note],
      },
      alert: (message: string) => alerts.push(message),
    } as unknown as _ZoteroTypes.MainWindow;

    try {
      await executeWorkflowFromCurrentSelection({
        win,
        workflow,
      });
    } finally {
      restoreOpen();
    }

    assert.lengthOf(alerts, 0);
    assert.equal(Zotero.Items.get(note.id)!.getNote(), before);
  });
});
