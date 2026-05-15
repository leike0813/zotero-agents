import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { executeWorkflowFromCurrentSelection } from "../../src/modules/workflowExecute";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  executeApplyResult,
  executeBuildRequests,
} from "../../src/workflows/runtime";
import { __referenceMatchingFreshnessTestOnly } from "../../workflows_builtin/literature-workbench-package/lib/referenceMatchingFreshness.mjs";
import {
  decodeBase64Utf8,
  encodeBase64Utf8,
  expectWorkflowSummaryCounter,
  isZoteroRuntime,
  workflowsPath,
} from "./workflow-test-utils";
import { isFullTestMode } from "../zotero/testMode";

type ReferenceEntry = {
  title?: string;
  year?: string | number;
  date?: string;
  author?: string[] | string;
  authors?: string[] | string;
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

function escapeAttribute(input: string) {
  return escapeHtml(input).replaceAll('"', "&quot;");
}

function renderReferencesTable(references: ReferenceEntry[]) {
  const rows = references.map((entry, index) => {
    const citekey = String(entry.citekey || "").trim();
    const year = String(entry.year || "");
    const title = String(entry.title || "");
    const authors = Array.isArray(entry.author)
      ? entry.author.join("; ")
      : typeof entry.author === "string"
        ? entry.author
        : Array.isArray(entry.authors)
          ? entry.authors.join("; ")
          : typeof entry.authors === "string"
            ? entry.authors
            : "";
    return [
      "<tr>",
      `<td>${index + 1}</td>`,
      `<td>${escapeHtml(citekey)}</td>`,
      `<td>${escapeHtml(year)}</td>`,
      `<td>${escapeHtml(title)}</td>`,
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

function buildReferencesNoteContent(args: {
  references: ReferenceEntry[];
  wrapperAttrs?: string;
  introHtml?: string;
}) {
  const payloadJson = JSON.stringify({
    version: 1,
    format: "json",
    references: args.references,
  });
  return [
    `<div data-zs-note-kind="references"${args.wrapperAttrs ? ` ${args.wrapperAttrs}` : ""}>`,
    "<h1>References</h1>",
    args.introHtml || "",
    renderReferencesTable(args.references),
    `<span data-zs-block="payload" data-zs-payload="references-json" data-zs-version="1" data-zs-encoding="base64" data-zs-value="${encodeBase64Utf8(payloadJson)}"></span>`,
    "</div>",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildReferencesNoteContentPlainPayload(args: {
  references: ReferenceEntry[];
}) {
  const payloadJson = JSON.stringify({
    version: 1,
    format: "json",
    references: args.references,
  });
  return [
    '<div data-zs-note-kind="references">',
    "<h1>References</h1>",
    renderReferencesTable(args.references),
    `<span data-zs-block="payload" data-zs-payload="references-json" data-zs-version="1" data-zs-encoding="plain" data-zs-value="${escapeAttribute(payloadJson)}"></span>`,
    "</div>",
  ].join("\n");
}

function extractAttribute(tagText: string, attrName: string) {
  const match = tagText.match(
    new RegExp(
      `${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
      "i",
    ),
  );
  if (!match) {
    return "";
  }
  return String(match[1] || match[2] || match[3] || "");
}

function decodeReferencesPayloadFromNote(noteContent: string) {
  const payloadTag = String(noteContent || "").match(
    /<span[^>]*data-zs-payload=(["'])references-json\1[^>]*>/i,
  );
  assert.isOk(payloadTag, "references payload span should exist");
  const encoded = extractAttribute(payloadTag![0], "data-zs-value");
  assert.isNotEmpty(encoded, "data-zs-value should not be empty");
  const parsed = JSON.parse(decodeBase64Utf8(encoded));
  return parsed as { references?: ReferenceEntry[] };
}

async function expectReferenceMatchingNoValidInputs(args: {
  workflow: Awaited<ReturnType<typeof getReferenceMatchingWorkflow>>;
  selectionItems: Zotero.Item[];
  workflowParams?: Record<string, unknown>;
}) {
  const selection = await buildSelectionContext(args.selectionItems);
  let thrown: unknown = null;
  try {
    await executeBuildRequests({
      workflow: args.workflow,
      selectionContext: selection,
      executionOptions: {
        workflowParams: args.workflowParams || {},
      },
    });
  } catch (error) {
    thrown = error;
  }
  assert.isOk(thrown, "expected no valid input units");
  assert.equal(
    (thrown as { code?: string })?.code,
    "NO_VALID_INPUT_UNITS",
    "fresh reference notes should be filtered before request creation",
  );
  return thrown as { skippedUnits?: number; totalUnits?: number };
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

async function getReferenceMatchingWorkflow() {
  const loaded = await loadWorkflowManifests(workflowsPath());
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === "reference-matching",
  );
  assert.isOk(
    workflow,
    `workflow reference-matching not found; loaded=${loaded.workflows.map((entry) => entry.manifest.id).join(",")} warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
  );
  return workflow!;
}

async function createLibraryItem(args: {
  title: string;
  year: string;
  citekey: string;
  firstCreator?: string;
}) {
  const item = await handlers.item.create({
    itemType: "journalArticle",
    fields: {
      title: args.title,
      date: args.year,
      extra: `Citation Key: ${args.citekey}`,
    },
  });
  if (args.firstCreator && typeof (item as any).setCreators === "function") {
    (item as any).setCreators([
      {
        firstName: "",
        lastName: args.firstCreator,
        creatorType: "author",
      },
    ]);
    await item.saveTx();
  }
  return item;
}

async function buildRunResultForNote(note: Zotero.Item, parameter?: Record<string, unknown>) {
  const selectionContext = await buildSelectionContext([note]);
  return {
    resultJson: {
      selectionContext,
      parameter: parameter || {},
    },
  };
}

function listRelatedKeys(itemRef: Zotero.Item | number) {
  const item = typeof itemRef === "number" ? Zotero.Items.get(itemRef)! : itemRef;
  const keys = Array.isArray((item as unknown as { relatedItems?: string[] }).relatedItems)
    ? ((item as unknown as { relatedItems?: string[] }).relatedItems || [])
    : [];
  return keys
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

const itFullOnly = isFullTestMode() ? it : it.skip;
const itNodeOnly = isZoteroRuntime() ? it.skip : it;
const itZoteroFullOrNode = isZoteroRuntime() && !isFullTestMode() ? it.skip : it;

describe("workflow: reference-matching", function () {
  this.timeout(30000);

  itNodeOnly("loads reference-matching workflow manifest from workflows directory", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    assert.equal(workflow.manifest.provider, "pass-through");
    assert.isFunction(workflow.hooks.filterInputs);
    assert.isFunction(workflow.hooks.applyResult);
  });

  itNodeOnly("filterInputs accepts references notes and rejects non-references notes", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Filter Parent" },
    });
    const referencesNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Reference Matching Filter Title",
            year: "2020",
            author: ["Tester"],
          },
        ],
      }),
    });
    const plainNote = await handlers.parent.addNote(parent, {
      content: "<div><h1>Random Note</h1><p>not references</p></div>",
    });

    const cases: Array<{
      label: string;
      selectionItems: Zotero.Item[];
      expectedAcceptedNoteId?: number;
      expectReject?: boolean;
    }> = [
      {
        label: "accepts references note from mixed note selection",
        selectionItems: [plainNote, referencesNote],
        expectedAcceptedNoteId: referencesNote.id,
      },
      {
        label: "rejects plain note selection",
        selectionItems: [plainNote],
        expectReject: true,
      },
    ];

    for (const entry of cases) {
      const selection = await buildSelectionContext(entry.selectionItems);
      if (entry.expectReject) {
        let thrown: unknown = null;
        try {
          await executeBuildRequests({
            workflow,
            selectionContext: selection,
          });
        } catch (error) {
          thrown = error;
        }
        assert.isOk(thrown, `${entry.label}: expected filter rejection`);
        assert.match(String(thrown), /no valid input units/i, entry.label);
        continue;
      }

      const requests = (await executeBuildRequests({
        workflow,
        selectionContext: selection,
      })) as Array<{
        kind: string;
        selectionContext?: {
          items?: { notes?: Array<{ item?: { id?: number } }> };
        };
      }>;
      assert.lengthOf(requests, 1, entry.label);
      assert.equal(requests[0].kind, "pass-through.run.v1", entry.label);
      const notes = requests[0].selectionContext?.items?.notes || [];
      assert.lengthOf(notes, 1, entry.label);
      assert.equal(notes[0]?.item?.id, entry.expectedAcceptedNoteId, entry.label);
    }
  });

  it("accepts parent selection and emits one request per resolved parent note", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    const parentA = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Parent A" },
    });
    const parentB = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Parent B" },
    });
    const noteA = await handlers.parent.addNote(parentA, {
      content: buildReferencesNoteContent({
        references: [{ title: "Parent A Ref", year: "2021", author: ["A"] }],
      }),
    });
    const noteB = await handlers.parent.addNote(parentB, {
      content: buildReferencesNoteContent({
        references: [{ title: "Parent B Ref", year: "2022", author: ["B"] }],
      }),
    });
    await handlers.parent.addNote(parentA, {
      content: "<div><h1>Random Note</h1><p>ignore</p></div>",
    });

    const selection = await buildSelectionContext([parentA, parentB]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: selection,
    })) as unknown as Array<{
      kind: string;
      selectionContext?: {
        items?: { notes?: Array<{ item?: { id?: number } }> };
      };
    }> & {
      __stats?: { totalUnits?: number; skippedUnits?: number };
    };

    assert.lengthOf(requests, 2);
    assert.equal(requests[0].kind, "pass-through.run.v1");
    assert.equal(requests[1].kind, "pass-through.run.v1");
    const noteIds = requests
      .map(
        (entry) =>
          entry.selectionContext?.items?.notes?.[0]?.item?.id,
      )
      .filter((id): id is number => typeof id === "number")
      .sort((a, b) => a - b);
    assert.deepEqual(noteIds, [noteA.id, noteB.id].sort((a, b) => a - b));
    assert.equal(requests.__stats?.totalUnits, 2);
    assert.equal(requests.__stats?.skippedUnits, 0);
  });

  itNodeOnly("reports skipped parent units when only part of selected parents are valid", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    const parentValid = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Valid Parent" },
    });
    const parentInvalid = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Invalid Parent" },
    });
    await handlers.parent.addNote(parentValid, {
      content: buildReferencesNoteContent({
        references: [{ title: "Valid Parent Ref", year: "2020", author: ["V"] }],
      }),
    });
    await handlers.parent.addNote(parentInvalid, {
      content: "<div><h1>Digest</h1><p>not a references note</p></div>",
    });

    const selection = await buildSelectionContext([parentValid, parentInvalid]);
    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: selection,
    })) as unknown as Array<unknown> & {
      __stats?: { totalUnits?: number; skippedUnits?: number };
    };

    assert.lengthOf(requests, 1);
    assert.equal(requests.__stats?.totalUnits, 2);
    assert.equal(requests.__stats?.skippedUnits, 1);
  });

  itNodeOnly("parses references payload and fills citekey for exact title match", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Exact Match for Reference Workflow",
      year: "2021",
      citekey: "Exact2021",
      firstCreator: "Smith",
    });

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Exact Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Exact Match for Reference Workflow",
            year: "2021",
            author: ["Smith"],
          },
        ],
      }),
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote),
    });

    const updated = Zotero.Items.get(referenceNote.id)!;
    const noteContent = updated.getNote();
    assert.match(noteContent, /<td>Exact2021<\/td>/);
    const payload = decodeReferencesPayloadFromNote(noteContent);
    assert.equal(payload.references?.[0]?.citekey, "Exact2021");
  });

  itNodeOnly("prioritizes explicit citekey and short-circuits before score matching", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Reference Matching Direct CiteKey Item",
      year: "2026",
      citekey: "DirectHit2026",
      firstCreator: "Direct",
    });
    await createLibraryItem({
      title: "Reference Matching Explicit Priority Score Candidate",
      year: "2026",
      citekey: "ScoreHit2026",
      firstCreator: "Scoreer",
    });

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Explicit CiteKey Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Reference Matching Explicit Priority Score Candidate",
            year: "2026",
            author: ["Scoreer"],
            citekey: "DirectHit2026",
          },
        ],
      }),
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote),
    });

    const payload = decodeReferencesPayloadFromNote(
      Zotero.Items.get(referenceNote.id)!.getNote(),
    );
    assert.equal(payload.references?.[0]?.citekey, "DirectHit2026");
  });

  itNodeOnly("falls back to predicted/score matching when explicit citekey misses", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Reference Matching Explicit Miss Fallback",
      year: "2027",
      citekey: "Fallback2027",
      firstCreator: "Fallbacker",
    });

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Explicit Miss Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Reference Matching Explicit Miss Fallback",
            year: "2027",
            author: ["Fallbacker"],
            citekey: "MissingKey999",
          },
        ],
      }),
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote),
    });

    const payload = decodeReferencesPayloadFromNote(
      Zotero.Items.get(referenceNote.id)!.getNote(),
    );
    assert.equal(payload.references?.[0]?.citekey, "Fallback2027");
  });

  itNodeOnly("parses html-escaped plain payload JSON and fills citekey", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Plain Payload Html Escaped",
      year: "2024",
      citekey: "Plain2024",
      firstCreator: "Escaper",
    });

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Plain Payload Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContentPlainPayload({
        references: [
          {
            title: "Plain Payload Html Escaped",
            year: "2024",
            author: ["Escaper"],
          },
        ],
      }),
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote),
    });

    const updated = Zotero.Items.get(referenceNote.id)!;
    const payload = decodeReferencesPayloadFromNote(updated.getNote());
    assert.equal(payload.references?.[0]?.citekey, "Plain2024");
  });

  itNodeOnly("matches by predicted citekey using default template when explicit citekey is absent", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Unrelated Candidate Title For Predicted Key",
      year: "2031",
      citekey: "zhao_neural-runtime_2031",
      firstCreator: "Zhao",
    });

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Predicted Default Template Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Neural Runtime Alignment for Agentic Parsing",
            year: "2031",
            author: ["Alice Zhao"],
          },
        ],
      }),
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote),
    });

    const payload = decodeReferencesPayloadFromNote(
      Zotero.Items.get(referenceNote.id)!.getNote(),
    );
    assert.equal(payload.references?.[0]?.citekey, "zhao_neural-runtime_2031");
  });

  itNodeOnly("uses custom citekey template override from workflow parameter", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Unrelated Candidate Title For Custom Template",
      year: "2032",
      citekey: "2032-liu",
      firstCreator: "Liu",
    });

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Predicted Custom Template Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Template Override Candidate",
            year: "2032",
            author: ["Bob Liu"],
          },
        ],
      }),
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote, {
        citekey_template: "{year}-{author}",
      }),
    });

    const payload = decodeReferencesPayloadFromNote(
      Zotero.Items.get(referenceNote.id)!.getNote(),
    );
    assert.equal(payload.references?.[0]?.citekey, "2032-liu");
  });

  itNodeOnly("supports bbt-lite expression template and matches by predicted citekey", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Unrelated Candidate Title For BBT Lite Expression",
      year: "2033",
      citekey: "zhao_signal-flow_2033",
      firstCreator: "Zhao",
    });

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching BBT Lite Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Signal Flow Modeling",
            year: "2033",
            author: ["Alice Zhao"],
          },
        ],
      }),
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote, {
        citekey_template:
          "auth.lower + '_' + title.nopunct.skipwords.select(1,1).lower + '-' + title.nopunct.skipwords.select(2,1).lower + '_' + year",
      }),
    });

    const payload = decodeReferencesPayloadFromNote(
      Zotero.Items.get(referenceNote.id)!.getNote(),
    );
    assert.equal(payload.references?.[0]?.citekey, "zhao_signal-flow_2033");
  });

  itFullOnly("supports bbt-lite year object from date when year field is missing", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Unrelated Candidate Title For Year Object",
      year: "2029",
      citekey: "2029_chen",
      firstCreator: "Chen",
    });

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching BBT Lite Year Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Year Source From Date",
            date: "2029-03-14",
            author: ["Tom Chen"],
          },
        ],
      }),
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote, {
        citekey_template: "year + '_' + auth.lower",
      }),
    });

    const payload = decodeReferencesPayloadFromNote(
      Zotero.Items.get(referenceNote.id)!.getNote(),
    );
    assert.equal(payload.references?.[0]?.citekey, "2029_chen");
  });

  itFullOnly("keeps workflow running when template placeholders cannot be resolved", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Missing Fields Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Template Missing Fields Candidate",
          },
        ],
      }),
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote, {
        citekey_template: "{author}_{year}_{title}",
      }),
    });

    const payload = decodeReferencesPayloadFromNote(
      Zotero.Items.get(referenceNote.id)!.getNote(),
    );
    assert.equal(String(payload.references?.[0]?.citekey || ""), "");
  });

  itFullOnly("falls back to score matching for various bbt-lite template errors", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    const cases = [
      {
        label: "invalid syntax",
        title: "Fallback After Invalid BBT Lite Expression",
        year: "2034",
        author: "Fallbacker",
        citekey: "ScoreAfterInvalid2034",
        parentTitle: "Reference Matching BBT Lite Invalid Syntax Parent",
        template: "auth.lower + (",
      },
      {
        label: "unsupported object",
        title: "Fallback After Unsupported BBT Lite Object",
        year: "2035",
        author: "Fallbacker",
        citekey: "ScoreAfterUnsupported2035",
        parentTitle: "Reference Matching BBT Lite Unsupported Object Parent",
        template: "journal.lower + '_' + year",
      },
    ];

    for (const entry of cases) {
      await createLibraryItem({
        title: entry.title,
        year: entry.year,
        citekey: entry.citekey,
        firstCreator: entry.author,
      });

      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: entry.parentTitle },
      });
      const referenceNote = await handlers.parent.addNote(parent, {
        content: buildReferencesNoteContent({
          references: [
            {
              title: entry.title,
              year: entry.year,
              author: [entry.author],
            },
          ],
        }),
      });

      await executeApplyResult({
        workflow,
        parent,
        bundleReader: { readText: async () => "" },
        runResult: await buildRunResultForNote(referenceNote, {
          citekey_template: entry.template,
        }),
      });

      const payload = decodeReferencesPayloadFromNote(
        Zotero.Items.get(referenceNote.id)!.getNote(),
      );
      assert.equal(payload.references?.[0]?.citekey, entry.citekey, entry.label);
    }
  });

  itNodeOnly("keeps note unchanged when payload is missing or damaged", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Bad Payload Parent" },
    });
    const badNote = await handlers.parent.addNote(parent, {
      content:
        '<div data-zs-note-kind="references"><h1>References</h1><span data-zs-block="payload" data-zs-payload="references-json" data-zs-value="@@bad@@"></span></div>',
    });
    const before = badNote.getNote();

    let thrown: unknown = null;
    try {
      await executeApplyResult({
        workflow,
        parent,
        bundleReader: { readText: async () => "" },
        runResult: await buildRunResultForNote(badNote),
      });
    } catch (error) {
      thrown = error;
    }
    assert.isOk(thrown, "expected applyResult to fail on bad payload");
    assert.equal(Zotero.Items.get(badNote.id)!.getNote(), before);
  });

  itFullOnly("matches fuzzy title using title-major evidence with author/year support", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Large Language Models for Science",
      year: "2024",
      citekey: "Zhang2024LLM",
      firstCreator: "Zhang",
    });
    await createLibraryItem({
      title: "Large Language Model in Medicine",
      year: "2024",
      citekey: "Li2024Med",
      firstCreator: "Li",
    });

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Fuzzy Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Large Language Model for Science",
            year: "2024",
            author: ["Zhang"],
          },
        ],
      }),
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote),
    });

    const payload = decodeReferencesPayloadFromNote(
      Zotero.Items.get(referenceNote.id)!.getNote(),
    );
    assert.equal(payload.references?.[0]?.citekey, "Zhang2024LLM");
  });

  itFullOnly("does not fill citekey on ambiguous or low-confidence candidates", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Ambiguous Matching Case",
      year: "2023",
      citekey: "AmbiguousA2023",
    });
    await createLibraryItem({
      title: "Ambiguous Matching Case",
      year: "2023",
      citekey: "AmbiguousB2023",
    });

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Ambiguous Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Ambiguous Matching Case",
            year: "2023",
            author: [],
          },
        ],
      }),
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote),
    });

    const payload = decodeReferencesPayloadFromNote(
      Zotero.Items.get(referenceNote.id)!.getNote(),
    );
    assert.equal(String(payload.references?.[0]?.citekey || ""), "");
  });

  itFullOnly("falls back to score matching when explicit citekey is ambiguous", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Ambiguous Explicit CiteKey Candidate A",
      year: "2028",
      citekey: "DupCite2028",
      firstCreator: "DupA",
    });
    await createLibraryItem({
      title: "Ambiguous Explicit CiteKey Candidate B",
      year: "2028",
      citekey: "DupCite2028",
      firstCreator: "DupB",
    });
    await createLibraryItem({
      title: "Reference Matching Ambiguous CiteKey Fallback Winner",
      year: "2028",
      citekey: "ScoreWinner2028",
      firstCreator: "Winner",
    });

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Ambiguous CiteKey Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Reference Matching Ambiguous CiteKey Fallback Winner",
            year: "2028",
            author: ["Winner"],
            citekey: "DupCite2028",
          },
        ],
      }),
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote),
    });

    const payload = decodeReferencesPayloadFromNote(
      Zotero.Items.get(referenceNote.id)!.getNote(),
    );
    assert.equal(payload.references?.[0]?.citekey, "ScoreWinner2028");
  });

  itNodeOnly("ignores deleted duplicates when matching by predicted citekey via zotero-api", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    const title = "Deleted Duplicate Filtering Runtime Proof";
    const year = "2037";
    const citekey = "doe_deleted-duplicate_2037";
    await createLibraryItem({
      title,
      year,
      citekey,
      firstCreator: "Doe",
    });
    const deletedDuplicate = await createLibraryItem({
      title,
      year,
      citekey,
      firstCreator: "Doe",
    });
    const maybeTrash = (Zotero.Items as unknown as {
      trashTx?: (ids: number[]) => Promise<void>;
    }).trashTx;
    if (typeof maybeTrash === "function") {
      await (Zotero.Items as unknown as {
        trashTx: (ids: number[]) => Promise<void>;
      }).trashTx([deletedDuplicate.id]);
    } else {
      await deletedDuplicate.eraseTx();
    }

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Deleted Duplicate Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title,
            year,
            author: ["Jane Doe"],
          },
        ],
      }),
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote, {
        data_source: "zotero-api",
        citekey_template:
          "auth.lower + '_' + title.nopunct.skipwords.select(1,1).lower + '-' + title.nopunct.skipwords.select(2,1).lower + '_' + year",
      }),
    });

    const payload = decodeReferencesPayloadFromNote(
      Zotero.Items.get(referenceNote.id)!.getNote(),
    );
    assert.equal(payload.references?.[0]?.citekey, citekey);
  });

  itNodeOnly("keeps payload JSON and html citekey column synchronized after overwrite", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Sync Payload and Html",
      year: "2022",
      citekey: "Sync2022",
      firstCreator: "Syncer",
    });

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Sync Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Sync Payload and Html",
            year: "2022",
            author: ["Syncer"],
          },
        ],
        wrapperAttrs: 'data-custom="keep-wrapper"',
        introHtml: '<p class="intro">keep-intro</p>',
      }),
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote),
    });

    const updatedContent = Zotero.Items.get(referenceNote.id)!.getNote();
    assert.match(updatedContent, /data-custom="keep-wrapper"/);
    assert.match(updatedContent, /<p class="intro">keep-intro<\/p>/);
    assert.match(updatedContent, /<td>Sync2022<\/td>/);
    const payload = decodeReferencesPayloadFromNote(updatedContent);
    assert.equal(payload.references?.[0]?.citekey, "Sync2022");
  });

  itNodeOnly("renders Source by precedence and Locator in deterministic order", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Reference Matching Source Locator",
      year: "2022",
      citekey: "SourceLocator2022",
      firstCreator: "Syncer",
    });

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Source Locator Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Reference Matching Source Locator",
            year: "2022",
            author: ["Syncer"],
            publicationTitle: "Journal A",
            conferenceName: "Conference B",
            archiveID: "arXiv:1234.5678",
            volume: "12",
            issue: "4",
            pages: "11-29",
            place: "Beijing",
          },
        ],
      }),
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote),
    });

    const updatedContent = Zotero.Items.get(referenceNote.id)!.getNote();
    assert.deepEqual(extractRenderedHeaders(updatedContent), [
      "#",
      "Citekey",
      "Year",
      "Title",
      "Authors",
      "Source",
      "Locator",
    ]);
    const firstRow = extractRenderedRowCells(updatedContent, 0);
    assert.equal(firstRow[5], "Journal A");
    assert.equal(firstRow[6], "Vol. 12; No. 4; pp. 11-29; Beijing");
  });

  itFullOnly("matches through bbt-json data source via local json-rpc endpoint", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching BBT Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Better BibTeX JSON-RPC Item",
            year: "2020",
            author: ["RpcTester"],
          },
        ],
      }),
    });

    const runtime = globalThis as { fetch?: typeof fetch };
    const originalFetch = runtime.fetch;
    const calls: string[] = [];
    runtime.fetch = (async (input: string | URL, init?: RequestInit) => {
      calls.push(String(input));
      const body = JSON.parse(String(init?.body || "{}")) as {
        method?: string;
        params?: unknown[];
      };
      if (body.method !== "item.search") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: true,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      assert.deepEqual(body.params, [""], "item.search must use valid empty-term params");
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: [
            {
              title: "Better BibTeX JSON-RPC Item",
              year: "2020",
              author: ["RpcTester"],
              citekey: "BbtRpc2020",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    try {
      await executeApplyResult({
        workflow,
        parent,
        bundleReader: { readText: async () => "" },
        runResult: await buildRunResultForNote(referenceNote, {
          data_source: "bbt-json",
          bbt_port: 24119,
        }),
      });
    } finally {
      runtime.fetch = originalFetch;
    }

    assert.isAtLeast(calls.length, 1);
    assert.equal(
      calls[0],
      "http://127.0.0.1:24119/better-bibtex/json-rpc",
    );
    const payload = decodeReferencesPayloadFromNote(
      Zotero.Items.get(referenceNote.id)!.getNote(),
    );
    assert.equal(payload.references?.[0]?.citekey, "BbtRpc2020");
  });

  itFullOnly("fails fast when bbt-json endpoint is unreachable and keeps note unchanged", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching BBT Unreachable Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "BBT Unreachable Item",
            year: "2020",
            author: ["Switch"],
          },
        ],
      }),
    });
    const before = referenceNote.getNote();

    const runtime = globalThis as { fetch?: typeof fetch };
    const originalFetch = runtime.fetch;
    runtime.fetch = (async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:23119");
    }) as typeof fetch;

    let thrown: unknown = null;
    try {
      await executeApplyResult({
        workflow,
        parent,
        bundleReader: { readText: async () => "" },
        runResult: await buildRunResultForNote(referenceNote, {
          data_source: "bbt-json",
        }),
      });
    } catch (error) {
      thrown = error;
    } finally {
      runtime.fetch = originalFetch;
    }
    assert.isOk(thrown);
    assert.match(String(thrown), /bbt|json-rpc|127\.0\.0\.1|23119/i);
    assert.equal(Zotero.Items.get(referenceNote.id)!.getNote(), before);
  });

  itNodeOnly("adds matched library items to references note parent related items", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    const matched = await createLibraryItem({
      title: "Reference Matching Parent Related Exact",
      year: "2038",
      citekey: "ParentRelated2038",
      firstCreator: "Relator",
    });
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Parent Related Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Reference Matching Parent Related Exact",
            year: "2038",
            author: ["Relator"],
          },
        ],
      }),
    });

    const applied = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote),
    })) as {
      related_added?: number;
      related_existing?: number;
      related_skipped?: number;
    };

    const payload = decodeReferencesPayloadFromNote(
      Zotero.Items.get(referenceNote.id)!.getNote(),
    );
    assert.equal(payload.references?.[0]?.citekey, "ParentRelated2038");
    assert.includeMembers(listRelatedKeys(parent), [matched.key]);
    assert.equal(applied.related_added, 1);
    assert.equal(applied.related_existing, 0);
    assert.equal(applied.related_skipped, 0);
  });

  itNodeOnly("adds only matched subset to parent related items when references are partially matched", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    const matched = await createLibraryItem({
      title: "Reference Matching Parent Related Partial Hit",
      year: "2039",
      citekey: "PartialHit2039",
      firstCreator: "Subset",
    });
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Parent Related Partial Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Reference Matching Parent Related Partial Hit",
            year: "2039",
            author: ["Subset"],
          },
          {
            title: "Reference Matching Parent Related Partial Miss",
            year: "2039",
            author: ["Nope"],
          },
        ],
      }),
    });

    const applied = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote),
    })) as {
      related_added?: number;
      related_existing?: number;
      related_skipped?: number;
    };

    const related = listRelatedKeys(parent);
    assert.includeMembers(related, [matched.key]);
    assert.lengthOf(related, 1);
    assert.equal(applied.related_added, 1);
    assert.equal(applied.related_existing, 0);
    assert.equal(applied.related_skipped, 0);
  });

  itZoteroFullOrNode("keeps parent related updates idempotent and only fills missing links", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    const matchedA = await createLibraryItem({
      title: "Reference Matching Parent Related Idempotent A",
      year: "2040",
      citekey: "IdempotentA2040",
      firstCreator: "StableA",
    });
    const matchedB = await createLibraryItem({
      title: "Reference Matching Parent Related Idempotent B",
      year: "2040",
      citekey: "IdempotentB2040",
      firstCreator: "StableB",
    });
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Parent Related Idempotent Parent" },
    });
    await handlers.parent.addRelated(parent, matchedA);
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Reference Matching Parent Related Idempotent A",
            year: "2040",
            author: ["StableA"],
          },
          {
            title: "Reference Matching Parent Related Idempotent B",
            year: "2040",
            author: ["StableB"],
          },
        ],
      }),
    });

    const first = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote),
    })) as {
      related_added?: number;
      related_existing?: number;
      related_skipped?: number;
    };
    const second = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote),
    })) as {
      related_added?: number;
      related_existing?: number;
      related_skipped?: number;
    };

    const related = listRelatedKeys(parent);
    assert.includeMembers(related, [matchedA.key, matchedB.key]);
    assert.lengthOf(related, 2);
    assert.equal(first.related_added, 1);
    assert.equal(first.related_existing, 1);
    assert.equal(first.related_skipped, 0);
    assert.equal(second.related_added, 0);
    assert.equal(second.related_existing, 2);
    assert.equal(second.related_skipped, 0);
  });

  itNodeOnly("keeps matching flow running when references note has no parent item", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Reference Matching Orphan References Note",
      year: "2041",
      citekey: "Orphan2041",
      firstCreator: "Orphaner",
    });
    const orphanNote = await handlers.note.create({
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Reference Matching Orphan References Note",
            year: "2041",
            author: ["Orphaner"],
          },
        ],
      }),
    });

    const applied = (await executeApplyResult({
      workflow,
      parent: orphanNote,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(orphanNote),
    })) as {
      updated?: number;
      matched?: number;
      related_added?: number;
      related_existing?: number;
      related_skipped?: number;
    };

    const payload = decodeReferencesPayloadFromNote(
      Zotero.Items.get(orphanNote.id)!.getNote(),
    );
    assert.equal(payload.references?.[0]?.citekey, "Orphan2041");
    assert.equal(applied.updated, 1);
    assert.equal(applied.matched, 1);
    assert.equal(applied.related_added, 0);
    assert.equal(applied.related_existing, 0);
    assert.equal(applied.related_skipped, 1);
  });

  itNodeOnly("computes deterministic library snapshot hashes from matching metadata only", async function () {
    const first = __referenceMatchingFreshnessTestOnly.hashLibrarySnapshotRecords([
      {
        libraryID: 1,
        itemKey: "B",
        title: "Snapshot Hash B",
        year: "2025",
        creators: ["Beta"],
        doi: "10.1/b",
        url: "https://example.test/b",
        citekey: "Beta2025",
        tags: ["ignored"],
      },
      {
        libraryID: 1,
        itemKey: "A",
        title: "Snapshot Hash A",
        year: "2024",
        creators: ["Alpha"],
        doi: "10.1/a",
        url: "https://example.test/a",
        citekey: "Alpha2024",
      },
    ]);
    const reorderedAndRetagged =
      __referenceMatchingFreshnessTestOnly.hashLibrarySnapshotRecords([
        {
          libraryID: 1,
          itemKey: "A",
          title: "Snapshot Hash A",
          year: "2024",
          creators: ["Alpha"],
          doi: "10.1/a",
          url: "https://example.test/a",
          citekey: "Alpha2024",
          tags: ["changed-but-ignored"],
        },
        {
          libraryID: 1,
          itemKey: "B",
          title: "Snapshot Hash B",
          year: "2025",
          creators: ["Beta"],
          doi: "10.1/b",
          url: "https://example.test/b",
          citekey: "Beta2025",
        },
      ]);
    const changedTitle =
      __referenceMatchingFreshnessTestOnly.hashLibrarySnapshotRecords([
        {
          libraryID: 1,
          itemKey: "A",
          title: "Snapshot Hash A Changed",
          year: "2024",
          creators: ["Alpha"],
          doi: "10.1/a",
          url: "https://example.test/a",
          citekey: "Alpha2024",
        },
        {
          libraryID: 1,
          itemKey: "B",
          title: "Snapshot Hash B",
          year: "2025",
          creators: ["Beta"],
          doi: "10.1/b",
          url: "https://example.test/b",
          citekey: "Beta2025",
        },
      ]);

    assert.equal(first, reorderedAndRetagged);
    assert.notEqual(first, changedTitle);
  });

  itNodeOnly("writes reference matching baseline metadata after successful apply", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Reference Matching Baseline Item",
      year: "2042",
      citekey: "Baseline2042",
      firstCreator: "Baseline",
    });
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Baseline Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Reference Matching Baseline Item",
            year: "2042",
            author: ["Baseline"],
          },
        ],
      }),
    });

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote, {
        citekey_template: "{author}_{title}_{year}",
      }),
    });

    const payload = decodeReferencesPayloadFromNote(
      Zotero.Items.get(referenceNote.id)!.getNote(),
    ) as {
      reference_matching?: Record<string, string>;
      references?: ReferenceEntry[];
    };
    assert.equal(payload.references?.[0]?.citekey, "Baseline2042");
    assert.isObject(payload.reference_matching);
    assert.match(payload.reference_matching?.input_hash || "", /^[a-f0-9]{64}$/);
    assert.match(payload.reference_matching?.settings_hash || "", /^[a-f0-9]{64}$/);
    assert.match(
      payload.reference_matching?.library_snapshot_hash || "",
      /^[a-f0-9]{64}$/,
    );
    assert.match(payload.reference_matching?.result_hash || "", /^[a-f0-9]{64}$/);
  });

  itNodeOnly("filters fresh reference notes before request creation", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Reference Matching Fresh Gate",
      year: "2043",
      citekey: "FreshGate2043",
      firstCreator: "Gate",
    });
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Fresh Gate Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Reference Matching Fresh Gate",
            year: "2043",
            author: ["Gate"],
          },
        ],
      }),
    });
    const params = { citekey_template: "{author}_{title}_{year}" };

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote, params),
    });

    const error = await expectReferenceMatchingNoValidInputs({
      workflow,
      selectionItems: [referenceNote],
      workflowParams: params,
    });
    assert.equal(error.skippedUnits, 1);
  });

  itNodeOnly("keeps baseline notes executable when references, settings, or library snapshot change", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Reference Matching Stale Gate",
      year: "2044",
      citekey: "StaleGate2044",
      firstCreator: "Gate",
    });
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Stale Gate Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Reference Matching Stale Gate",
            year: "2044",
            author: ["Gate"],
          },
        ],
      }),
    });
    const params = { citekey_template: "{author}_{title}_{year}" };

    await executeApplyResult({
      workflow,
      parent,
      bundleReader: { readText: async () => "" },
      runResult: await buildRunResultForNote(referenceNote, params),
    });

    const settingsChanged = (await executeBuildRequests({
      workflow,
      selectionContext: await buildSelectionContext([referenceNote]),
      executionOptions: {
        workflowParams: { citekey_template: "auth.lower + '_' + year" },
      },
    })) as unknown[];
    assert.lengthOf(settingsChanged, 1);

    await createLibraryItem({
      title: "Reference Matching New Library Candidate",
      year: "2044",
      citekey: "NewCandidate2044",
      firstCreator: "Candidate",
    });
    const libraryChanged = (await executeBuildRequests({
      workflow,
      selectionContext: await buildSelectionContext([referenceNote]),
      executionOptions: {
        workflowParams: params,
      },
    })) as unknown[];
    assert.lengthOf(libraryChanged, 1);

    const currentPayload = decodeReferencesPayloadFromNote(
      Zotero.Items.get(referenceNote.id)!.getNote(),
    ) as { references?: ReferenceEntry[] };
    const editedContent = buildReferencesNoteContent({
      references: [
        {
          ...(currentPayload.references?.[0] || {}),
          title: "Reference Matching Stale Gate Edited",
        },
      ],
    });
    await handlers.note.update(referenceNote, { content: editedContent });
    const referencesChanged = (await executeBuildRequests({
      workflow,
      selectionContext: await buildSelectionContext([referenceNote]),
      executionOptions: {
        workflowParams: params,
      },
    })) as unknown[];
    assert.lengthOf(referencesChanged, 1);
  });

  itNodeOnly("leaves legacy references notes without baseline executable", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching Legacy Gate Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Reference Matching Legacy Gate",
            year: "2045",
            author: ["Legacy"],
          },
        ],
      }),
    });

    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: await buildSelectionContext([referenceNote]),
      executionOptions: {
        workflowParams: { citekey_template: "{author}_{title}_{year}" },
      },
    })) as unknown[];

    assert.lengthOf(requests, 1);
  });

  it("runs end-to-end from references note selection to overwrite", async function () {
    const workflow = await getReferenceMatchingWorkflow();
    await createLibraryItem({
      title: "Reference Matching End To End",
      year: "2025",
      citekey: "E2E2025",
      firstCreator: "Runner",
    });
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Reference Matching E2E Parent" },
    });
    const referenceNote = await handlers.parent.addNote(parent, {
      content: buildReferencesNoteContent({
        references: [
          {
            title: "Reference Matching End To End",
            year: "2025",
            author: ["Runner"],
          },
        ],
      }),
    });
    const alerts: string[] = [];
    const win = {
      ZoteroPane: {
        getSelectedItems: () => [referenceNote],
      },
      alert: (message: string) => {
        alerts.push(message);
      },
    } as unknown as _ZoteroTypes.MainWindow;

    await executeWorkflowFromCurrentSelection({
      win,
      workflow,
    });

    assert.lengthOf(alerts, 1);
    expectWorkflowSummaryCounter(alerts[0], "succeeded", 1);
    expectWorkflowSummaryCounter(alerts[0], "failed", 0);
    const payload = decodeReferencesPayloadFromNote(
      Zotero.Items.get(referenceNote.id)!.getNote(),
    );
    assert.equal(payload.references?.[0]?.citekey, "E2E2025");
  });
});
