import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { handlers } from "../../src/handlers";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  executeApplyResult,
  executeBuildRequests,
} from "../../src/workflows/runtime";
import { executeWorkflowFromCurrentSelection } from "../../src/modules/workflowExecute";
import { ZipBundleReader } from "../../src/workflows/zipBundleReader";
import { createWorkflowHostApi } from "../../src/workflows/hostApi";
import { createUnavailableBundleReader } from "../../src/modules/workflowExecution/bundleIO";
import { createWorkflowResultContext } from "../../src/modules/workflowExecution/resultContext";
import {
  decodeBase64Utf8,
  expectWorkflowSummaryCounter,
  fixturePath,
  isZoteroRuntime,
  readBytes,
  workflowsPath,
} from "./workflow-test-utils";
import { isFullTestMode } from "../zotero/testMode";
import { parseEmbeddedNotePayloadBlock } from "../../src/modules/notePayloadCodec";
import {
  classifyReferenceExtractionQuality,
  filterReferencesForDigestApply,
} from "../../workflows_builtin/literature-workbench-package/lib/referenceQualityGate.mjs";

function parseNoteKind(noteContent: string) {
  const text = String(noteContent || "");
  const match = text.match(/data-zs-note-kind=(["'])([^"']+)\1/i);
  if (match) {
    return match[2];
  }
  if (!/<[^>]+data-schema-version=/i.test(text)) {
    return "";
  }
  if (/<h1[^>]*>\s*Digest\s*<\/h1>/i.test(text)) {
    return "digest";
  }
  if (/<h1[^>]*>\s*References\s*<\/h1>/i.test(text)) {
    return "references";
  }
  if (/<h1[^>]*>\s*Citation Analysis\s*<\/h1>/i.test(text)) {
    return "citation-analysis";
  }
  return "";
}

function parseSourceAttachmentItemKey(noteContent: string) {
  const match = String(noteContent || "").match(
    /data-zs-source_attachment_item_key=(["'])([^"']+)\1/i,
  );
  return match ? match[2] : "";
}

function parsePayloadEntryPath(noteContent: string, payloadType: string) {
  const pattern = new RegExp(
    `data-zs-payload=(["'])${payloadType}\\1[^>]*data-zs-value=(["'])([^"']+)\\2`,
    "i",
  );
  const match = String(noteContent || "").match(pattern);
  if (!match) {
    return "";
  }
  const decoded = decodeBase64Utf8(match[3]);
  const parsed = JSON.parse(decoded) as { entry?: string };
  return String(parsed.entry || "").trim();
}

function parsePayloadValue(noteContent: string, payloadType: string) {
  const pattern = new RegExp(
    `data-zs-payload=(["'])${payloadType}\\1[^>]*data-zs-value=(["'])([^"']+)\\2`,
    "i",
  );
  const match = String(noteContent || "").match(pattern);
  assert.isOk(match, `${payloadType} payload should exist`);
  return JSON.parse(decodeBase64Utf8(match![3]));
}

async function parseStoredPayload(note: Zotero.Item, payloadType: string) {
  try {
    return parsePayloadValue(note.getNote(), payloadType);
  } catch {
    // New generated workbench notes store machine payloads in note-child
    // embedded-image attachments so Zotero can normalize visible note HTML.
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

async function parseStoredPayloadEntryPath(
  note: Zotero.Item,
  payloadType: string,
) {
  const payload = (await parseStoredPayload(note, payloadType)) as {
    entry?: string;
    path?: string;
  };
  return String(payload.entry || payload.path || "").trim();
}

async function assertStoredPayloadExists(
  note: Zotero.Item,
  payloadType: string,
) {
  assert.isOk(await parseStoredPayload(note, payloadType));
}

async function importEmbeddedImageForRepresentativeTest(
  baseHostApi: ReturnType<typeof createWorkflowHostApi>,
  note: Zotero.Item,
  image: any,
  visibleImageHandler: (note: Zotero.Item, image: any) => Promise<any>,
) {
  if (image?.mimeType === "image/png") {
    return baseHostApi.notes.importEmbeddedImage(note, image);
  }
  return visibleImageHandler(note, image);
}

function createRepresentativeImageBundleReader(args: {
  representativeImage?: Record<string, unknown>;
}) {
  return {
    async readText(entryPath: string) {
      if (entryPath === "result/result.json") {
        return JSON.stringify({
          status: "success",
          data: {
            digest_path: "artifacts/digest.md",
            references_path: "artifacts/references.json",
            citation_analysis_path: "artifacts/citation_analysis.json",
            ...(args.representativeImage
              ? { representative_image: args.representativeImage }
              : {}),
          },
        });
      }
      if (entryPath === "artifacts/digest.md") {
        return "# Digest\n\nRepresentative content.";
      }
      if (entryPath === "artifacts/references.json") {
        return "[]";
      }
      if (entryPath === "artifacts/citation_analysis.json") {
        return '{"report_md":"# Citation Analysis"}';
      }
      throw new Error(`missing bundle entry: ${entryPath}`);
    },
  };
}

async function mkTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-literature-analysis-"));
}

const itFullOnly = isFullTestMode() ? it : it.skip;
const itNodeOnly = isZoteroRuntime() ? it.skip : it;

describe("workflow: literature-analysis", function () {
  async function getLiteratureDigestWorkflow() {
    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-analysis",
    );
    assert.isOk(workflow, "missing literature-analysis workflow");
    return workflow!;
  }

  async function createDigestAttachmentParent(args: {
    title: string;
    attachmentTitle?: string;
    attachmentMimeType?: string;
  }) {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: args.title },
    });
    const mdFile = fixturePath("literature-analysis", "example.md");
    const attachment = await handlers.attachment.createFromPath({
      parent,
      path: mdFile,
      title: args.attachmentTitle || "example.md",
      mimeType: args.attachmentMimeType || "text/markdown",
    });
    return { parent, attachment };
  }

  async function addGeneratedDigestNotes(
    parent: Zotero.Item,
    noteContents: {
      digest: string;
      references: string;
      citationAnalysis: string;
    },
  ) {
    await handlers.parent.addNote(parent, { content: noteContents.digest });
    await handlers.parent.addNote(parent, { content: noteContents.references });
    await handlers.parent.addNote(parent, {
      content: noteContents.citationAnalysis,
    });
  }

  itNodeOnly(
    "loads literature-analysis workflow manifest from workflows directory",
    async function () {
      const loaded = await loadWorkflowManifests(workflowsPath());

      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow, "expected literature-analysis workflow");
      assert.equal(workflow?.manifest.request?.kind, "skillrunner.job.v1");
      assert.equal(
        (
          workflow?.manifest.request?.create as
            | { skill_id?: string }
            | undefined
        )?.skill_id,
        "literature-analysis",
      );
      assert.equal(workflow?.manifest.parameters?.language?.default, "zh-CN");
      assert.notProperty(
        workflow?.manifest.parameters || {},
        "auto_reference_matching",
      );
    },
  );

  it("classifies deterministic invalid references without rejecting warning-only rows", function () {
    const invalid = classifyReferenceExtractionQuality({
      title: "https://doi.org/10.1007/978-3-319-10602-1_48",
      raw: "https://doi.org/10.1007/978-3-319-10602-1_48",
    });
    assert.equal(invalid.disposition, "reject");
    assert.include(invalid.rejectReasons, "bare_identifier_or_url_title");

    const warning = classifyReferenceExtractionQuality({
      title:
        "Conditional DETR for fast training convergence. In Proceedings of the IEEE/CVF international conference on computer vision, pp",
      raw: "Conditional DETR for fast training convergence. In Proceedings of the IEEE/CVF international conference on computer vision, pp. 2021.",
      year: "2021",
    });
    assert.equal(warning.disposition, "accept");
    assert.include(warning.warningReasons, "bibliographic_suffix_in_title");

    const filtered = filterReferencesForDigestApply([
      { title: "Layer normalization", year: "2016" },
      { title: "Sensors 18(10), 3337" },
    ]);
    assert.equal(filtered.accepted.length, 1);
    assert.equal(filtered.rejected.length, 1);
    assert.include(
      filtered.summary.rejected[0]?.reasons || [],
      "publication_metadata_only_title",
    );
  });

  it("builds request from selected markdown attachment", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Parent" },
    });

    const mdFile = fixturePath("literature-analysis", "example.md");
    const attachment = await handlers.attachment.createFromPath({
      parent,
      path: mdFile,
      title: "example.md",
      mimeType: "text/markdown",
    });

    const context = await buildSelectionContext([attachment]);
    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-analysis",
    );
    assert.isOk(workflow, "missing literature-analysis workflow");

    const requests = (await executeBuildRequests({
      workflow: workflow!,
      selectionContext: context,
      executionOptions: {
        providerOptions: {
          engine: "gemini",
        },
      },
    })) as Array<{
      kind: string;
      targetParentID: number;
      skill_id: string;
      parameter?: { language?: string };
      runtime_options?: { execution_mode?: string };
      input?: { source_path?: string };
      upload_files: Array<{ key: string; path: string }>;
    }>;
    assert.lengthOf(requests, 1);
    const request = requests[0];
    assert.equal(request.kind, "skillrunner.job.v1");
    assert.equal(request.targetParentID, parent.id);
    assert.equal(request.skill_id, "literature-analysis");
    assert.equal(request.parameter?.language, "zh-CN");
    assert.equal(request.runtime_options?.execution_mode, "auto");
    assert.equal(request.upload_files?.[0].key, "source_path");
    assert.equal(request.upload_files?.[0].path, mdFile);
    assert.match(
      String(request.input?.source_path || ""),
      /^inputs\/source_path\//,
    );
  });

  itNodeOnly(
    "builds request from selected pdf attachment when markdown is unavailable",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Workflow Parent PDF Fallback" },
      });

      const pdfFile = fixturePath(
        "selection-context",
        "attachments/EXKUYHMH/Zhang 等 - 2022 - Accelerating DETR Convergence via Semantic-Aligned Matching.pdf",
      );
      const attachment = await handlers.attachment.createFromPath({
        parent,
        path: pdfFile,
        title: "example.pdf",
        mimeType: "application/pdf",
      });

      const context = await buildSelectionContext([attachment]);
      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow, "missing literature-analysis workflow");

      const requests = (await executeBuildRequests({
        workflow: workflow!,
        selectionContext: context,
      })) as Array<{
        kind: string;
        runtime_options?: { execution_mode?: string };
        input?: { source_path?: string };
        upload_files: Array<{ key: string; path: string }>;
      }>;

      assert.lengthOf(requests, 1);
      assert.equal(requests[0].kind, "skillrunner.job.v1");
      assert.equal(requests[0].runtime_options?.execution_mode, "auto");
      assert.equal(requests[0].upload_files?.[0].key, "source_path");
      assert.equal(requests[0].upload_files?.[0].path, pdfFile);
      assert.match(
        String(requests[0].input?.source_path || ""),
        /^inputs\/source_path\//,
      );
    },
  );

  it("skips build for core idempotent note shapes", async function () {
    const workflow = await getLiteratureDigestWorkflow();
    const cases = [
      {
        label: "generated note-kind markers",
        title: "Workflow Skip Parent",
        noteContents: {
          digest: '<div data-zs-note-kind="digest"><h1>Digest</h1></div>',
          references:
            '<div data-zs-note-kind="references"><h1>References</h1></div>',
          citationAnalysis:
            '<div data-zs-note-kind="citation-analysis"><h1>Citation Analysis</h1></div>',
        },
      },
    ];

    for (const entry of cases) {
      const { parent, attachment } = await createDigestAttachmentParent({
        title: entry.title,
      });
      await addGeneratedDigestNotes(parent, entry.noteContents);
      const context = await buildSelectionContext([attachment]);

      let thrown: unknown = null;
      try {
        await executeBuildRequests({
          workflow,
          selectionContext: context,
        });
      } catch (error) {
        thrown = error;
      }

      assert.isOk(thrown, `${entry.label}: expected build request to skip`);
      assert.match(
        String(thrown),
        /has no valid input units after filtering/,
        entry.label,
      );
    }
  });

  const legacySkipCases = [
    {
      label: "payload markers",
      title: "Workflow Payload Skip Parent",
      noteContents: {
        digest:
          '<div><h1>Literature Digest</h1><span data-zs-block="payload" data-zs-payload="digest-markdown" data-zs-value="e30="></span></div>',
        references:
          '<div><h1>References</h1><span data-zs-block="payload" data-zs-payload="references-json" data-zs-value="e30="></span></div>',
        citationAnalysis:
          '<div><h1>Citation Analysis</h1><span data-zs-block="payload" data-zs-payload="citation-analysis-json" data-zs-value="e30="></span></div>',
      },
    },
    {
      label: "legacy heading-only",
      title: "Workflow Legacy Skip Parent",
      noteContents: {
        digest: "<div><h1>Literature Digest</h1><p>legacy content</p></div>",
        references: "<div><h1>References JSON</h1><pre>[]</pre></div>",
        citationAnalysis: "<div><h1>Citation Analysis</h1><pre>{}</pre></div>",
      },
    },
    {
      label: "legacy paragraph strong headings",
      title: "Workflow Legacy Paragraph Skip Parent",
      noteContents: {
        digest:
          "<div><p><strong>Literature Digest</strong></p><p>legacy paragraph</p></div>",
        references:
          "<div><p><strong>References JSON</strong></p><pre>[]</pre></div>",
        citationAnalysis:
          "<div><p><strong>Citation Analysis</strong></p><pre>{}</pre></div>",
      },
    },
  ] as const;

  for (const entry of legacySkipCases) {
    itFullOnly(
      `skips build for legacy and payload-marker note formats (${entry.label})`,
      async function () {
        const workflow = await getLiteratureDigestWorkflow();
        const { parent, attachment } = await createDigestAttachmentParent({
          title: entry.title,
        });
        await addGeneratedDigestNotes(parent, entry.noteContents);
        const context = await buildSelectionContext([attachment]);

        let thrown: unknown = null;
        try {
          await executeBuildRequests({
            workflow,
            selectionContext: context,
          });
        } catch (error) {
          thrown = error;
        }

        assert.isOk(thrown, `${entry.label}: expected build request to skip`);
        assert.match(
          String(thrown),
          /has no valid input units after filtering/,
          entry.label,
        );
      },
    );
  }

  it("applies bundle by creating digest/references/citation-analysis child notes", async function () {
    this.timeout(5000);
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Result Parent" },
    });

    const bundle = new ZipBundleReader(
      fixturePath("literature-analysis", "run_bundle.zip"),
    );

    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-analysis",
    );
    assert.isOk(workflow, "missing literature-analysis workflow");

    const applied = (await executeApplyResult({
      workflow: workflow!,
      parent,
      bundleReader: bundle,
    })) as { notes: Zotero.Item[] };

    assert.lengthOf(applied.notes, 3);
    const firstNote = Zotero.Items.get(applied.notes[0].id)!;
    const secondNote = Zotero.Items.get(applied.notes[1].id)!;
    const thirdNote = Zotero.Items.get(applied.notes[2].id)!;
    assert.equal(firstNote.parentItemID, parent.id);
    assert.equal(secondNote.parentItemID, parent.id);
    assert.equal(thirdNote.parentItemID, parent.id);
    assert.match(firstNote.getNote(), /<h1>Digest<\/h1>/);
    assert.notMatch(firstNote.getNote(), /data-zs-payload="digest-markdown"/);
    await assertStoredPayloadExists(firstNote, "digest-markdown");
    assert.match(secondNote.getNote(), /<h1>References<\/h1>/);
    assert.match(secondNote.getNote(), /<table\b/i);
    await assertStoredPayloadExists(secondNote, "references-json");
    assert.match(thirdNote.getNote(), /<h1>Citation Analysis<\/h1>/);
    await assertStoredPayloadExists(thirdNote, "citation-analysis-json");

    const parentNotes = parent.getNotes();
    assert.include(parentNotes, firstNote.id);
    assert.include(parentNotes, secondNote.id);
    assert.include(parentNotes, thirdNote.id);
  });

  it("applies valid artifacts when skill output includes a non-null error diagnostic", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Diagnostic Error Parent" },
    });
    const workflow = await getLiteratureDigestWorkflow();

    const applied = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: {
        async readText(entryPath: string) {
          if (entryPath === "result/result.json") {
            return JSON.stringify({
              status: "failed",
              data: {
                digest_path: "artifacts/digest.md",
                references_path: "artifacts/references.json",
                citation_analysis_path: "artifacts/citation_analysis.json",
                warnings: ["partial extraction"],
                error: {
                  type: "agent_warning",
                  message: "agent reported a recoverable issue",
                },
              },
            });
          }
          if (entryPath === "artifacts/digest.md") {
            return "# Digest\n\nDiagnostic apply still works.";
          }
          if (entryPath === "artifacts/references.json") {
            return "[]";
          }
          if (entryPath === "artifacts/citation_analysis.json") {
            return '{"report_md":"# Citation Analysis"}';
          }
          throw new Error(`missing bundle entry: ${entryPath}`);
        },
      },
    })) as {
      notes?: Zotero.Item[];
      warnings?: string[];
      skill_diagnostics?: {
        status?: string;
        error?: { message?: string };
      };
    };

    assert.lengthOf(applied.notes || [], 3);
    assert.deepEqual(applied.warnings, ["partial extraction"]);
    assert.equal(applied.skill_diagnostics?.status, "failed");
    assert.equal(
      applied.skill_diagnostics?.error?.message,
      "agent reported a recoverable issue",
    );
  });

  it("filters deterministic invalid references before writing the references note", async function () {
    this.timeout(5000);
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Reference Quality Parent" },
    });
    const workflow = await getLiteratureDigestWorkflow();

    const applied = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: {
        async readText(entryPath: string) {
          if (entryPath === "result/result.json") {
            return JSON.stringify({
              status: "success",
              data: {
                digest_path: "artifacts/digest.md",
                references_path: "artifacts/references.json",
                citation_analysis_path: "artifacts/citation_analysis.json",
              },
            });
          }
          if (entryPath === "artifacts/digest.md") {
            return "# Digest\n\nBody";
          }
          if (entryPath === "artifacts/references.json") {
            return JSON.stringify([
              {
                title: "Attention is all you need",
                year: "2017",
                raw: "Ashish Vaswani et al. Attention is all you need. In NeurIPS, 2017.",
              },
              {
                title: "https://doi.org/10.1007/978-3-319-10602-1_48",
                raw: "https://doi.org/10.1007/978-3-319-10602-1_48",
              },
              {
                title: "Sensors 18(10), 3337",
                raw: "Sensors 18(10), 3337",
              },
              {
                title: "Ashish Vaswani, Noam Shazeer",
                raw: "Ashish Vaswani, Noam Shazeer",
              },
              {
                title:
                  "Conditional DETR for fast training convergence. In Proceedings of the IEEE/CVF international conference on computer vision, pp",
                year: "2021",
                raw: "Conditional DETR for fast training convergence. In Proceedings of the IEEE/CVF international conference on computer vision, pp. 2021.",
              },
            ]);
          }
          if (entryPath === "artifacts/citation_analysis.json") {
            return '{"report_md":"# Citation Analysis"}';
          }
          throw new Error(`missing bundle entry: ${entryPath}`);
        },
      },
      request: {
        parameter: {
          auto_reference_matching: false,
        },
      },
    })) as {
      notes: Zotero.Item[];
      reference_quality?: {
        accepted_count?: number;
        rejected_count?: number;
        warning_count?: number;
        rejected?: Array<{ reasons?: string[] }>;
        warnings?: Array<{ reasons?: string[] }>;
      };
    };

    const referencesNote = applied.notes.find(
      (note) =>
        parseNoteKind(Zotero.Items.get(note.id)!.getNote()) === "references",
    );
    assert.isOk(referencesNote);
    const payload = (await parseStoredPayload(
      Zotero.Items.get(referencesNote!.id)!,
      "references-json",
    )) as {
      references?: Array<{ title?: string }>;
      reference_quality?: unknown;
    };
    assert.deepEqual(
      (payload.references || []).map((entry) => entry.title),
      [
        "Attention is all you need",
        "Conditional DETR for fast training convergence. In Proceedings of the IEEE/CVF international conference on computer vision, pp",
      ],
    );
    assert.isUndefined(payload.reference_quality);
    assert.equal(applied.reference_quality?.accepted_count, 2);
    assert.equal(applied.reference_quality?.rejected_count, 3);
    assert.isAtLeast(applied.reference_quality?.warning_count || 0, 1);
    assert.include(
      applied.reference_quality?.rejected?.flatMap(
        (row) => row.reasons || [],
      ) || [],
      "bare_identifier_or_url_title",
    );
    assert.include(
      applied.reference_quality?.warnings?.flatMap(
        (row) => row.reasons || [],
      ) || [],
      "bibliographic_suffix_in_title",
    );
  });

  it("writes an empty references array when all references are deterministic invalid", async function () {
    this.timeout(5000);
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Empty Reference Quality Parent" },
    });
    const workflow = await getLiteratureDigestWorkflow();

    const applied = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: {
        async readText(entryPath: string) {
          if (entryPath === "result/result.json") {
            return JSON.stringify({
              status: "success",
              data: {
                digest_path: "artifacts/digest.md",
                references_path: "artifacts/references.json",
                citation_analysis_path: "artifacts/citation_analysis.json",
              },
            });
          }
          if (entryPath === "artifacts/digest.md") {
            return "# Digest\n\nBody";
          }
          if (entryPath === "artifacts/references.json") {
            return JSON.stringify([
              { title: "" },
              { title: "//doi.org/10.1007/978-3-319-10602-1_48" },
            ]);
          }
          if (entryPath === "artifacts/citation_analysis.json") {
            return '{"report_md":"# Citation Analysis"}';
          }
          throw new Error(`missing bundle entry: ${entryPath}`);
        },
      },
      request: {
        parameter: {
          auto_reference_matching: false,
        },
      },
    })) as {
      notes: Zotero.Item[];
      reference_quality?: { accepted_count?: number; rejected_count?: number };
    };

    const referencesNote = applied.notes.find(
      (note) =>
        parseNoteKind(Zotero.Items.get(note.id)!.getNote()) === "references",
    );
    assert.isOk(referencesNote);
    const payload = (await parseStoredPayload(
      Zotero.Items.get(referencesNote!.id)!,
      "references-json",
    )) as { references?: unknown[] };
    assert.deepEqual(payload.references, []);
    assert.equal(applied.reference_quality?.accepted_count, 0);
    assert.equal(applied.reference_quality?.rejected_count, 2);
  });

  it("keeps citekey in references payload while hiding the Citekey table column", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow References Citekey Hidden Parent" },
    });
    const workflow = await getLiteratureDigestWorkflow();
    const applied = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: {
        async readText(entryPath: string) {
          if (entryPath === "result/result.json") {
            return JSON.stringify({
              status: "success",
              data: {
                digest_path: "artifacts/digest.md",
                references_path: "artifacts/references.json",
                citation_analysis_path: "artifacts/citation_analysis.json",
              },
            });
          }
          if (entryPath === "artifacts/digest.md") {
            return "# Digest\n\nBody";
          }
          if (entryPath === "artifacts/references.json") {
            return JSON.stringify([
              {
                title: "Reference With Citekey",
                year: "2026",
                author: ["Cite Key"],
                citekey: "citekey_hidden_2026",
              },
            ]);
          }
          if (entryPath === "artifacts/citation_analysis.json") {
            return '{"report_md":"# Citation Analysis"}';
          }
          throw new Error(`missing bundle entry: ${entryPath}`);
        },
      },
    })) as { notes: Zotero.Item[] };

    const referencesNote = applied.notes.find(
      (note) =>
        parseNoteKind(Zotero.Items.get(note.id)!.getNote()) === "references",
    );
    assert.isOk(referencesNote);
    const noteContent = Zotero.Items.get(referencesNote!.id)!.getNote();
    assert.notInclude(noteContent, "<th>Citekey</th>");
    assert.notInclude(noteContent, "citekey_hidden_2026");

    const payload = (await parseStoredPayload(
      Zotero.Items.get(referencesNote!.id)!,
      "references-json",
    )) as { references?: Array<{ citekey?: string }> };
    assert.equal(payload.references?.[0]?.citekey, "citekey_hidden_2026");
  });

  it("stores literature matching metadata as a hidden digest note payload", async function () {
    this.timeout(5000);
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Matching Metadata Parent" },
    });
    const workflow = await getLiteratureDigestWorkflow();
    const baseHostApi = createWorkflowHostApi();
    const matchingMetadata = {
      schema: "literature_matching_metadata.v1",
      key_terms: ["set prediction", "object query"],
      methods: ["Hungarian matching"],
      problems: ["object detection"],
      datasets: ["COCO"],
      exclude_terms: ["speech recognition"],
    };

    const applied = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: {
        async readText(entryPath: string) {
          if (entryPath === "result/result.json") {
            return JSON.stringify({
              status: "success",
              data: {
                digest_path: "artifacts/digest.md",
                references_path: "artifacts/references.json",
                citation_analysis_path: "artifacts/citation_analysis.json",
                literature_matching_metadata_path:
                  "artifacts/literature_matching_metadata.json",
              },
            });
          }
          if (entryPath === "artifacts/digest.md") {
            return "# Digest\n\nBody";
          }
          if (entryPath === "artifacts/references.json") {
            return "[]";
          }
          if (entryPath === "artifacts/citation_analysis.json") {
            return '{"report_md":"# Citation Analysis"}';
          }
          if (entryPath === "artifacts/literature_matching_metadata.json") {
            return JSON.stringify(matchingMetadata);
          }
          throw new Error(`missing bundle entry: ${entryPath}`);
        },
      },
      request: {
        parameter: {
          auto_reference_matching: false,
        },
      },
      runtime: {
        hostApi: {
          ...baseHostApi,
        } as any,
      },
    })) as {
      notes: Zotero.Item[];
      literature_matching_metadata?: { status?: string };
    };

    assert.lengthOf(applied.notes, 3);
    assert.equal(applied.literature_matching_metadata?.status, "attached");
    const digestNote = Zotero.Items.get(applied.notes[0].id)!;
    assert.deepEqual(
      await parseStoredPayload(digestNote, "literature-matching-metadata-json"),
      matchingMetadata,
    );
    assert.equal(String(parent.getField("extra") || ""), "");
  });

  itNodeOnly(
    "automatically runs reference matching after writing references note",
    async function () {
      this.timeout(5000);
      const matched = await handlers.item.create({
        itemType: "journalArticle",
        fields: {
          title: "Character-level language modeling with deeper self-attention",
          date: "2019",
          extra: "Citation Key: AlRfou2019Character",
        },
      });
      if (typeof (matched as any).setCreators === "function") {
        (matched as any).setCreators([
          {
            firstName: "",
            lastName: "Al-Rfou",
            creatorType: "author",
          },
        ]);
        await matched.saveTx();
      }
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Workflow Auto Matching Parent" },
      });
      const workflow = await getLiteratureDigestWorkflow();

      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: new ZipBundleReader(
          fixturePath("literature-analysis", "run_bundle.zip"),
        ),
      })) as {
        notes: Zotero.Item[];
        auto_reference_matching?: unknown;
      };

      const referencesNote = applied.notes.find(
        (note) =>
          parseNoteKind(Zotero.Items.get(note.id)!.getNote()) === "references",
      );
      assert.isOk(referencesNote);
      const payload = (await parseStoredPayload(
        Zotero.Items.get(referencesNote!.id)!,
        "references-json",
      )) as {
        references?: Array<{ citekey?: string }>;
        reference_matching?: unknown;
      };
      assert.isUndefined(payload.references?.[0]?.citekey);
      assert.isUndefined(payload.reference_matching);
      assert.isUndefined(applied.auto_reference_matching);
    },
  );

  itNodeOnly(
    "ignores removed auto reference matching parameter",
    async function () {
      this.timeout(5000);
      await handlers.item.create({
        itemType: "journalArticle",
        fields: {
          title: "Character-level language modeling with deeper self-attention",
          date: "2019",
          extra: "Citation Key: DisabledAutoMatching2019",
        },
      });
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Workflow Auto Matching Disabled Parent" },
      });
      const workflow = await getLiteratureDigestWorkflow();

      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: new ZipBundleReader(
          fixturePath("literature-analysis", "run_bundle.zip"),
        ),
        request: {
          parameter: {
            auto_reference_matching: false,
          },
        },
      })) as {
        notes: Zotero.Item[];
        auto_reference_matching?: unknown;
      };

      const referencesNote = applied.notes.find(
        (note) =>
          parseNoteKind(Zotero.Items.get(note.id)!.getNote()) === "references",
      );
      assert.isOk(referencesNote);
      const payload = (await parseStoredPayload(
        Zotero.Items.get(referencesNote!.id)!,
        "references-json",
      )) as {
        references?: Array<{ citekey?: string }>;
        reference_matching?: unknown;
      };
      assert.isUndefined(payload.references?.[0]?.citekey);
      assert.isUndefined(payload.reference_matching);
      assert.isUndefined(applied.auto_reference_matching);
    },
  );

  itNodeOnly(
    "updates an existing references note without automatic reference matching",
    async function () {
      this.timeout(7000);
      const matched = await handlers.item.create({
        itemType: "journalArticle",
        fields: {
          title: "Character-level language modeling with deeper self-attention",
          date: "2019",
          extra: "Citation Key: ReapplyAutoMatching2019",
        },
      });
      if (typeof (matched as any).setCreators === "function") {
        (matched as any).setCreators([
          {
            firstName: "",
            lastName: "Al-Rfou",
            creatorType: "author",
          },
        ]);
        await matched.saveTx();
      }
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Workflow Auto Matching Reapply Parent" },
      });
      const workflow = await getLiteratureDigestWorkflow();

      await executeApplyResult({
        workflow,
        parent,
        bundleReader: new ZipBundleReader(
          fixturePath("literature-analysis", "run_bundle.zip"),
        ),
      });
      const second = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: new ZipBundleReader(
          fixturePath("literature-analysis", "run_bundle.zip"),
        ),
      })) as {
        notes: Zotero.Item[];
        auto_reference_matching?: unknown;
      };

      const referencesNote = second.notes.find(
        (note) =>
          parseNoteKind(Zotero.Items.get(note.id)!.getNote()) === "references",
      );
      assert.isOk(referencesNote);
      const payload = (await parseStoredPayload(
        Zotero.Items.get(referencesNote!.id)!,
        "references-json",
      )) as {
        references?: Array<{ citekey?: string }>;
        reference_matching?: unknown;
      };
      assert.isUndefined(payload.references?.[0]?.citekey);
      assert.isUndefined(payload.reference_matching);
      assert.isUndefined(second.auto_reference_matching);
    },
  );

  itNodeOnly(
    "applies result when artifact paths are uploads-prefixed bundle-relative paths",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Workflow Uploads-Prefixed Paths Parent" },
      });
      const digestPath = "uploads/inputs/source_path/artifacts/digest.md";
      const referencesPath =
        "uploads/inputs/source_path/artifacts/references.json";
      const citationPath =
        "uploads/inputs/source_path/artifacts/citation_analysis.json";

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow, "missing literature-analysis workflow");

      const applied = (await executeApplyResult({
        workflow: workflow!,
        parent,
        bundleReader: {
          async readText(entryPath: string) {
            if (entryPath === "result/result.json") {
              return JSON.stringify({
                status: "success",
                data: {
                  digest_path: digestPath,
                  references_path: referencesPath,
                  citation_analysis_path: citationPath,
                },
              });
            }
            if (entryPath === digestPath) {
              return "# Digest";
            }
            if (entryPath === referencesPath) {
              return "[]";
            }
            if (entryPath === citationPath) {
              return '{"report_md":"# Citation Analysis"}';
            }
            throw new Error(`missing bundle entry: ${entryPath}`);
          },
        },
      })) as { notes: Zotero.Item[] };

      assert.lengthOf(applied.notes, 3);
      const digestNote = Zotero.Items.get(applied.notes[0].id)!;
      const referencesNote = Zotero.Items.get(applied.notes[1].id)!;
      const citationAnalysisNote = Zotero.Items.get(applied.notes[2].id)!;
      assert.equal(
        await parseStoredPayloadEntryPath(digestNote, "digest-markdown"),
        digestPath,
      );
      assert.equal(
        await parseStoredPayloadEntryPath(referencesNote, "references-json"),
        referencesPath,
      );
      assert.equal(
        await parseStoredPayloadEntryPath(
          citationAnalysisNote,
          "citation-analysis-json",
        ),
        citationPath,
      );
    },
  );

  itNodeOnly(
    "applies ACP local result paths through shared result context without bundle projection",
    async function () {
      const root = await mkTempRoot();
      try {
        const parent = await handlers.item.create({
          itemType: "journalArticle",
          fields: { title: "Workflow ACP Result Context Parent" },
        });
        const resultDir = path.join(root, "result");
        await fs.mkdir(resultDir, { recursive: true });
        const digestPath = path.join(resultDir, "digest.md");
        const referencesPath = path.join(resultDir, "references.json");
        const citationPath = path.join(resultDir, "citation_analysis.json");
        await fs.writeFile(digestPath, "# ACP Digest", "utf8");
        await fs.writeFile(referencesPath, "[]", "utf8");
        await fs.writeFile(
          citationPath,
          '{"report_md":"# ACP Citation"}',
          "utf8",
        );
        const resultJson = {
          digest_path: digestPath,
          references_path: referencesPath,
          citation_analysis_path: citationPath,
        };

        const loaded = await loadWorkflowManifests(workflowsPath());
        const workflow = loaded.workflows.find(
          (entry) => entry.manifest.id === "literature-analysis",
        );
        assert.isOk(workflow, "missing literature-analysis workflow");
        const bundleReader = createUnavailableBundleReader("acp-local-result");
        const resultContext = await createWorkflowResultContext({
          runResult: {
            requestId: "acp-local-result",
            resultJson,
            responseJson: {
              workspaceDir: root,
              resultJsonPath: path.join(resultDir, "result.json"),
            },
          },
          bundleReader,
          manifest: workflow!.manifest,
        });

        const applied = (await executeApplyResult({
          workflow: workflow!,
          parent,
          bundleReader,
          resultContext,
          runResult: {
            requestId: "acp-local-result",
            resultJson,
            responseJson: {
              workspaceDir: root,
            },
          },
        })) as { notes: Zotero.Item[] };

        assert.lengthOf(applied.notes, 3);
        const digestNote = Zotero.Items.get(applied.notes[0].id)!;
        assert.equal(
          await parseStoredPayloadEntryPath(digestNote, "digest-markdown"),
          digestPath.replace(/\\/g, "/"),
        );
      } finally {
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );

  itNodeOnly(
    "surfaces missing artifact path details when all entry candidates fail",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Workflow Missing Artifact Path Parent" },
      });
      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow, "missing literature-analysis workflow");

      let thrown: unknown = null;
      try {
        await executeApplyResult({
          workflow: workflow!,
          parent,
          bundleReader: {
            async readText(entryPath: string) {
              if (entryPath === "result/result.json") {
                return JSON.stringify({
                  status: "success",
                  data: {
                    digest_path:
                      "uploads/inputs/source_path/artifacts/digest.md",
                    references_path:
                      "uploads/inputs/source_path/artifacts/references.json",
                    citation_analysis_path:
                      "uploads/inputs/source_path/artifacts/citation_analysis.json",
                  },
                });
              }
              throw new Error(`missing bundle entry: ${entryPath}`);
            },
          },
        });
      } catch (error) {
        thrown = error;
      }

      assert.isOk(thrown);
      const message = String(thrown instanceof Error ? thrown.message : thrown);
      assert.include(message, "[digest_path] bundle entry not found");
      assert.include(message, "uploads/inputs/source_path/artifacts/digest.md");
      assert.include(message, "artifacts/digest.md");
    },
  );

  itNodeOnly(
    "stores source metadata in digest payload when request is provided",
    async function () {
      this.timeout(5000);
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Workflow Source Metadata Parent" },
      });

      const mdFile = fixturePath("literature-analysis", "example.md");
      const attachment = await handlers.attachment.createFromPath({
        parent,
        path: mdFile,
        title: "example.md",
        mimeType: "text/markdown",
      });
      const context = await buildSelectionContext([attachment]);

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow, "missing literature-analysis workflow");

      const requests = (await executeBuildRequests({
        workflow: workflow!,
        selectionContext: context,
      })) as Array<{
        kind: string;
        targetParentID: number;
        sourceAttachmentPaths?: string[];
        input?: { source_path?: string };
        upload_files?: Array<{ key: string; path: string }>;
      }>;
      assert.lengthOf(requests, 1);

      const bundle = new ZipBundleReader(
        fixturePath("literature-analysis", "run_bundle.zip"),
      );
      const applied = (await executeApplyResult({
        workflow: workflow!,
        parent,
        bundleReader: bundle,
        request: requests[0],
      })) as { notes: Zotero.Item[] };

      assert.lengthOf(applied.notes, 3);
      const digestNote = Zotero.Items.get(applied.notes[0].id)!;
      const referencesNote = Zotero.Items.get(applied.notes[1].id)!;
      const citationAnalysisNote = Zotero.Items.get(applied.notes[2].id)!;
      assert.notMatch(digestNote.getNote(), /data-zs-block="meta"/);
      assert.notMatch(digestNote.getNote(), /data-zs-meta="source-attachment"/);
      assert.equal(
        ((await parseStoredPayload(digestNote, "digest-markdown")) as any)
          .source_attachment_item_key,
        attachment.key,
      );
      await assertStoredPayloadExists(digestNote, "digest-markdown");
      await assertStoredPayloadExists(referencesNote, "references-json");
      await assertStoredPayloadExists(
        citationAnalysisNote,
        "citation-analysis-json",
      );
    },
  );

  itFullOnly(
    "continues apply when source markdown itemKey cannot be resolved",
    async function () {
      this.timeout(5000);
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Workflow Source Metadata Fallback Parent" },
      });

      const bundle = new ZipBundleReader(
        fixturePath("literature-analysis", "run_bundle.zip"),
      );
      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow, "missing literature-analysis workflow");

      const applied = (await executeApplyResult({
        workflow: workflow!,
        parent,
        bundleReader: bundle,
        request: {
          targetParentID: parent.id,
          sourceAttachmentPaths: ["D:/not-found/example.md"],
          input: {
            source_path: "inputs/source_path/example.md",
          },
          upload_files: [
            { key: "source_path", path: "D:/not-found/example.md" },
          ],
        },
      })) as { notes: Zotero.Item[] };

      assert.lengthOf(applied.notes, 3);
      const digestNote = Zotero.Items.get(applied.notes[0].id)!;
      const referencesNote = Zotero.Items.get(applied.notes[1].id)!;
      const citationAnalysisNote = Zotero.Items.get(applied.notes[2].id)!;
      assert.notMatch(
        digestNote.getNote(),
        /data-zs-source_attachment_item_key=/,
      );
      await assertStoredPayloadExists(digestNote, "digest-markdown");
      await assertStoredPayloadExists(referencesNote, "references-json");
      await assertStoredPayloadExists(
        citationAnalysisNote,
        "citation-analysis-json",
      );
    },
  );

  itNodeOnly(
    "embeds representative image from safe markdown locator through host api",
    async function () {
      const root = await mkTempRoot();
      try {
        const figuresDir = path.join(root, "figures");
        await fs.mkdir(figuresDir, { recursive: true });
        const mdPath = path.join(root, "paper.md");
        const imagePath = path.join(figuresDir, "overview.png");
        await fs.writeFile(
          mdPath,
          [
            "# Paper",
            "",
            "![Overview](figures/overview.png)",
            "",
            "Figure 1. Overview architecture.",
          ].join("\n"),
          "utf8",
        );
        await fs.writeFile(imagePath, "fake image bytes", "utf8");

        const parent = await handlers.item.create({
          itemType: "journalArticle",
          fields: { title: "Workflow Representative Image Parent" },
        });
        const workflow = await getLiteratureDigestWorkflow();
        const baseHostApi = createWorkflowHostApi();
        const representativeLogs: any[] = [];
        let preparedPath = "";
        let importedForNoteID = 0;

        const applied = (await executeApplyResult({
          workflow,
          parent,
          bundleReader: createRepresentativeImageBundleReader({
            representativeImage: {
              status: "selected",
              source_kind: "markdown_image_ref",
              label: "Figure 1",
              caption_quote: "Overview architecture",
              markdown_src_hint: "figures/overview.png",
              selection_reason: "overview figure",
              confidence: "high",
            },
          }),
          request: {
            sourceAttachmentPaths: [mdPath],
            parameter: {
              auto_reference_matching: false,
            },
          },
          runtime: {
            hostApi: {
              ...baseHostApi,
              images: {
                async prepareForNoteEmbedding(source: unknown, options: any) {
                  preparedPath = String(source || "");
                  assert.equal(options.maxLongEdge, 720);
                  assert.equal(options.hardMaxBytes, 320 * 1024);
                  return {
                    bytes: new Uint8Array([1, 2, 3]),
                    mimeType: "image/jpeg",
                    width: 720,
                    height: 405,
                    originalBytes: 2048,
                    compressedBytes: 120 * 1024,
                  };
                },
              },
              notes: {
                ...baseHostApi.notes,
                async importEmbeddedImage(note: Zotero.Item, image: any) {
                  return importEmbeddedImageForRepresentativeTest(
                    baseHostApi,
                    note,
                    image,
                    async () => {
                      importedForNoteID = note.id;
                      assert.equal(image.mimeType, "image/jpeg");
                      return {
                        attachmentKey: "IMGREP1",
                        attachmentItem: {} as Zotero.Item,
                        mimeType: "image/jpeg",
                        bytes: image.compressedBytes,
                      };
                    },
                  );
                },
              },
              logging: {
                ...baseHostApi.logging,
                appendRuntimeLog(entry: any) {
                  representativeLogs.push(entry);
                },
              },
            } as any,
          },
        })) as {
          notes: Zotero.Item[];
          representative_image?: {
            status?: string;
            attachmentKey?: string;
            compressedBytes?: number;
          };
        };

        const digestNote = Zotero.Items.get(applied.notes[0].id)!;
        assert.equal(importedForNoteID, digestNote.id);
        assert.equal(
          preparedPath.replace(/\\/g, "/"),
          imagePath.replace(/\\/g, "/"),
        );
        assert.equal(applied.representative_image?.status, "embedded");
        assert.equal(applied.representative_image?.attachmentKey, "IMGREP1");
        assert.equal(applied.representative_image?.compressedBytes, 120 * 1024);
        assert.notInclude(
          digestNote.getNote(),
          'data-zs-block="representative-image"',
        );
        assert.notInclude(
          digestNote.getNote(),
          'data-zs-payload="digest-markdown"',
        );
        assert.include(digestNote.getNote(), 'data-attachment-key="IMGREP1"');
        await assertStoredPayloadExists(digestNote, "digest-markdown");
        const logEntry = representativeLogs.find(
          (entry) => entry?.stage === "representative-image-embedded",
        );
        assert.equal(logEntry?.details?.attachmentKey, "IMGREP1");
        assert.equal(logEntry?.details?.status, "embedded");
      } finally {
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );

  itNodeOnly(
    "keeps digest payload when representative image note object reads stale content",
    async function () {
      const root = await mkTempRoot();
      try {
        const figuresDir = path.join(root, "figures");
        await fs.mkdir(figuresDir, { recursive: true });
        const mdPath = path.join(root, "paper.md");
        const imagePath = path.join(figuresDir, "overview.png");
        await fs.writeFile(
          mdPath,
          [
            "# Paper",
            "",
            "![Overview](figures/overview.png)",
            "",
            "Figure 1. Overview architecture.",
          ].join("\n"),
          "utf8",
        );
        await fs.writeFile(imagePath, "fake image bytes", "utf8");

        const parent = await handlers.item.create({
          itemType: "journalArticle",
          fields: { title: "Workflow Representative Stale Note Parent" },
        });
        const workflow = await getLiteratureDigestWorkflow();
        const baseHostApi = createWorkflowHostApi();
        let realDigestNote: Zotero.Item | null = null;
        let staleDigestNote: Zotero.Item | null = null;

        const applied = (await executeApplyResult({
          workflow,
          parent,
          bundleReader: createRepresentativeImageBundleReader({
            representativeImage: {
              status: "selected",
              source_kind: "markdown_image_ref",
              label: "Figure 1",
              markdown_src_hint: "figures/overview.png",
              selection_reason: "overview figure",
              confidence: "high",
            },
          }),
          request: {
            sourceAttachmentPaths: [mdPath],
            parameter: {
              auto_reference_matching: false,
            },
          },
          runtime: {
            hostApi: {
              ...baseHostApi,
              parents: {
                ...baseHostApi.parents,
                async addNote(
                  parentItem: Zotero.Item,
                  note: { content: string },
                ) {
                  const created = await baseHostApi.parents.addNote(
                    parentItem,
                    note,
                  );
                  if (/<h1[^>]*>\s*Digest\s*<\/h1>/i.test(note.content)) {
                    realDigestNote = created;
                    staleDigestNote = Object.create(created) as Zotero.Item;
                    Object.defineProperty(staleDigestNote, "getNote", {
                      value: () => "",
                      configurable: true,
                    });
                    return staleDigestNote;
                  }
                  return created;
                },
              },
              images: {
                async prepareForNoteEmbedding() {
                  return {
                    bytes: new Uint8Array([1, 2, 3]),
                    mimeType: "image/jpeg",
                    width: 720,
                    height: 405,
                    originalBytes: 2048,
                    compressedBytes: 120 * 1024,
                  };
                },
              },
              notes: {
                ...baseHostApi.notes,
                async update(note: Zotero.Item, patch: { content: string }) {
                  if (realDigestNote && note.id === realDigestNote.id) {
                    assert.notInclude(
                      patch.content,
                      'data-zs-payload="digest-markdown"',
                    );
                    assert.notInclude(
                      patch.content,
                      'data-zs-block="representative-image"',
                    );
                    assert.include(
                      patch.content,
                      'data-attachment-key="IMGSTALE1"',
                    );
                    return baseHostApi.notes.update(realDigestNote, patch);
                  }
                  return baseHostApi.notes.update(note, patch);
                },
                async importEmbeddedImage(note: Zotero.Item, image: any) {
                  return importEmbeddedImageForRepresentativeTest(
                    baseHostApi,
                    note,
                    image,
                    async () => ({
                      attachmentKey: "IMGSTALE1",
                      attachmentItem: {} as Zotero.Item,
                      mimeType: "image/jpeg",
                      bytes: 120 * 1024,
                    }),
                  );
                },
              },
            } as any,
          },
        })) as {
          notes: Zotero.Item[];
          representative_image?: { status?: string; attachmentKey?: string };
        };

        assert.equal(applied.representative_image?.status, "embedded");
        assert.equal(applied.representative_image?.attachmentKey, "IMGSTALE1");
        assert.isOk(realDigestNote);
        const digestNote = Zotero.Items.get(realDigestNote!.id)!;
        await assertStoredPayloadExists(digestNote, "digest-markdown");
        assert.notInclude(
          digestNote.getNote(),
          'data-zs-block="representative-image"',
        );
        assert.include(digestNote.getNote(), 'data-attachment-key="IMGSTALE1"');
        assert.equal(applied.notes[0].id, digestNote.id);
      } finally {
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );

  itNodeOnly(
    "skips unsafe markdown representative image paths without blocking apply",
    async function () {
      const root = await mkTempRoot();
      try {
        const mdPath = path.join(root, "paper.md");
        await fs.writeFile(
          mdPath,
          "# Paper\n\n![Remote](https://example.test/figure.png)\n",
          "utf8",
        );

        const parent = await handlers.item.create({
          itemType: "journalArticle",
          fields: { title: "Workflow Representative Unsafe Parent" },
        });
        const workflow = await getLiteratureDigestWorkflow();
        const baseHostApi = createWorkflowHostApi();
        const representativeLogs: any[] = [];

        const applied = (await executeApplyResult({
          workflow,
          parent,
          bundleReader: createRepresentativeImageBundleReader({
            representativeImage: {
              status: "selected",
              source_kind: "markdown_image_ref",
              label: "Figure 1",
              markdown_src_hint: "../outside.png",
            },
          }),
          request: {
            sourceAttachmentPaths: [mdPath],
            parameter: {
              auto_reference_matching: false,
            },
          },
          runtime: {
            hostApi: {
              ...baseHostApi,
              images: {
                async prepareForNoteEmbedding() {
                  throw new Error(
                    "unsafe path should not reach image preparation",
                  );
                },
              },
              notes: {
                ...baseHostApi.notes,
                async importEmbeddedImage(note: Zotero.Item, image: any) {
                  if (image?.mimeType === "image/png") {
                    return baseHostApi.notes.importEmbeddedImage(note, image);
                  }
                  throw new Error(
                    "unsafe path should not import visible image",
                  );
                },
              },
              logging: {
                ...baseHostApi.logging,
                appendRuntimeLog(entry: any) {
                  representativeLogs.push(entry);
                },
              },
            } as any,
          },
        })) as {
          notes: Zotero.Item[];
          representative_image?: { status?: string; reason?: string };
        };

        assert.lengthOf(applied.notes, 3);
        assert.equal(applied.representative_image?.status, "skipped");
        assert.equal(
          applied.representative_image?.reason,
          "unsafe_markdown_image_path",
        );
        const digestNote = Zotero.Items.get(applied.notes[0].id)!;
        assert.notInclude(
          digestNote.getNote(),
          'data-zs-block="representative-image"',
        );
        assert.notInclude(
          digestNote.getNote(),
          'data-zs-block="representative-image-diagnostic"',
        );
        await assertStoredPayloadExists(digestNote, "digest-markdown");
        const logEntry = representativeLogs.find(
          (entry) => entry?.stage === "representative-image-skipped",
        );
        assert.equal(logEntry?.level, "warn");
        assert.equal(logEntry?.details?.reason, "unsafe_markdown_image_path");
        assert.equal(
          logEntry?.details?.locator?.source_kind,
          "markdown_image_ref",
        );
      } finally {
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );

  itNodeOnly(
    "skips unresolved markdown_src_hint without falling back to another image",
    async function () {
      const root = await mkTempRoot();
      try {
        const figuresDir = path.join(root, "figures");
        await fs.mkdir(figuresDir, { recursive: true });
        const mdPath = path.join(root, "paper.md");
        const fallbackImagePath = path.join(figuresDir, "fallback.png");
        await fs.writeFile(
          mdPath,
          [
            "# Paper",
            "",
            "![Fallback](figures/fallback.png)",
            "",
            "Figure 1. Fallback image.",
          ].join("\n"),
          "utf8",
        );
        await fs.writeFile(fallbackImagePath, "fallback bytes", "utf8");

        const parent = await handlers.item.create({
          itemType: "journalArticle",
          fields: { title: "Workflow Representative Missing Hint Parent" },
        });
        const workflow = await getLiteratureDigestWorkflow();
        const baseHostApi = createWorkflowHostApi();

        const applied = (await executeApplyResult({
          workflow,
          parent,
          bundleReader: createRepresentativeImageBundleReader({
            representativeImage: {
              status: "selected",
              source_kind: "markdown_image_ref",
              label: "Figure 1",
              caption_quote: "Fallback image",
              markdown_src_hint: "figures/missing.png",
            },
          }),
          request: {
            sourceAttachmentPaths: [mdPath],
            parameter: {
              auto_reference_matching: false,
            },
          },
          runtime: {
            hostApi: {
              ...baseHostApi,
              images: {
                async prepareForNoteEmbedding() {
                  throw new Error(
                    "missing hint should not fall back to another image",
                  );
                },
              },
              notes: {
                ...baseHostApi.notes,
                async importEmbeddedImage(note: Zotero.Item, image: any) {
                  if (image?.mimeType === "image/png") {
                    return baseHostApi.notes.importEmbeddedImage(note, image);
                  }
                  throw new Error(
                    "missing hint should not import visible image",
                  );
                },
              },
            } as any,
          },
        })) as {
          notes: Zotero.Item[];
          representative_image?: { status?: string; reason?: string };
        };

        assert.lengthOf(applied.notes, 3);
        assert.equal(applied.representative_image?.status, "skipped");
        assert.equal(
          applied.representative_image?.reason,
          "markdown_src_hint_not_resolved",
        );
        const digestNote = Zotero.Items.get(applied.notes[0].id)!;
        assert.notInclude(
          digestNote.getNote(),
          "markdown_src_hint_not_resolved",
        );
        await assertStoredPayloadExists(digestNote, "digest-markdown");
      } finally {
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );

  itNodeOnly(
    "uses caption quote to select the correct markdown image among multiple refs",
    async function () {
      const root = await mkTempRoot();
      try {
        const figuresDir = path.join(root, "figures");
        await fs.mkdir(figuresDir, { recursive: true });
        const mdPath = path.join(root, "paper.md");
        const earlierImagePath = path.join(figuresDir, "earlier.png");
        const selectedImagePath = path.join(figuresDir, "selected.png");
        await fs.writeFile(
          mdPath,
          [
            "# Paper",
            "",
            "![Earlier](figures/earlier.png)",
            "",
            "Figure 1. Baseline diagram.",
            "",
            "![Selected](figures/selected.png)",
            "",
            "Figure 2. Selected architecture and pipeline overview.",
          ].join("\n"),
          "utf8",
        );
        await fs.writeFile(earlierImagePath, "earlier bytes", "utf8");
        await fs.writeFile(selectedImagePath, "selected bytes", "utf8");

        const parent = await handlers.item.create({
          itemType: "journalArticle",
          fields: { title: "Workflow Representative Caption Parent" },
        });
        const workflow = await getLiteratureDigestWorkflow();
        const baseHostApi = createWorkflowHostApi();
        let preparedPath = "";

        const applied = (await executeApplyResult({
          workflow,
          parent,
          bundleReader: createRepresentativeImageBundleReader({
            representativeImage: {
              status: "selected",
              source_kind: "markdown_image_ref",
              label: "Figure 2",
              caption_quote: "Selected architecture and pipeline overview",
              selection_reason: "overview figure",
              confidence: "medium",
            },
          }),
          request: {
            sourceAttachmentPaths: [mdPath],
            parameter: {
              auto_reference_matching: false,
            },
          },
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
                    originalBytes: 2048,
                    compressedBytes: 100 * 1024,
                  };
                },
              },
              notes: {
                ...baseHostApi.notes,
                async importEmbeddedImage() {
                  return {
                    attachmentKey: "IMGREP2",
                    attachmentItem: {} as Zotero.Item,
                    mimeType: "image/jpeg",
                    bytes: 100 * 1024,
                  };
                },
              },
            } as any,
          },
        })) as {
          representative_image?: { status?: string; strategy?: string };
        };

        assert.equal(
          preparedPath.replace(/\\/g, "/"),
          selectedImagePath.replace(/\\/g, "/"),
        );
        assert.equal(applied.representative_image?.status, "embedded");
        assert.equal(applied.representative_image?.strategy, "near_caption");
      } finally {
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );

  itNodeOnly(
    "skips ambiguous label-only markdown locator instead of guessing",
    async function () {
      const root = await mkTempRoot();
      try {
        const figuresDir = path.join(root, "figures");
        await fs.mkdir(figuresDir, { recursive: true });
        const mdPath = path.join(root, "paper.md");
        const beforeImagePath = path.join(figuresDir, "before.png");
        const afterImagePath = path.join(figuresDir, "after.png");
        await fs.writeFile(
          mdPath,
          [
            "# Paper",
            "",
            "![Before](figures/before.png)",
            "",
            "Figure 1",
            "",
            "![After](figures/after.png)",
          ].join("\n"),
          "utf8",
        );
        await fs.writeFile(beforeImagePath, "before bytes", "utf8");
        await fs.writeFile(afterImagePath, "after bytes", "utf8");

        const parent = await handlers.item.create({
          itemType: "journalArticle",
          fields: { title: "Workflow Representative Ambiguous Label Parent" },
        });
        const workflow = await getLiteratureDigestWorkflow();
        const baseHostApi = createWorkflowHostApi();

        const applied = (await executeApplyResult({
          workflow,
          parent,
          bundleReader: createRepresentativeImageBundleReader({
            representativeImage: {
              status: "selected",
              source_kind: "markdown_image_ref",
              label: "Figure 1",
              selection_reason: "figure label only",
              confidence: "low",
            },
          }),
          request: {
            sourceAttachmentPaths: [mdPath],
            parameter: {
              auto_reference_matching: false,
            },
          },
          runtime: {
            hostApi: {
              ...baseHostApi,
              images: {
                async prepareForNoteEmbedding() {
                  throw new Error("ambiguous label should not prepare image");
                },
              },
              notes: {
                ...baseHostApi.notes,
                async importEmbeddedImage(note: Zotero.Item, image: any) {
                  if (image?.mimeType === "image/png") {
                    return baseHostApi.notes.importEmbeddedImage(note, image);
                  }
                  throw new Error(
                    "ambiguous label should not import visible image",
                  );
                },
              },
            } as any,
          },
        })) as {
          representative_image?: { status?: string; reason?: string };
        };

        assert.equal(applied.representative_image?.status, "skipped");
        assert.equal(
          applied.representative_image?.reason,
          "ambiguous_markdown_label_locator",
        );
      } finally {
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );

  itNodeOnly(
    "preserves native Windows separators when resolving markdown_src_hint",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Workflow Representative Windows Path Parent" },
      });
      const workflow = await getLiteratureDigestWorkflow();
      const baseHostApi = createWorkflowHostApi();
      const mdPath = "C:\\papers\\paper.md";
      const expectedImagePath = "C:\\papers\\figures\\overview.png";
      let preparedPath = "";

      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: createRepresentativeImageBundleReader({
          representativeImage: {
            status: "selected",
            source_kind: "markdown_image_ref",
            label: "Figure 1",
            caption_quote: "Overview architecture",
            markdown_src_hint: "figures/overview.png",
            selection_reason: "overview figure",
            confidence: "high",
          },
        }),
        request: {
          sourceAttachmentPaths: [mdPath],
          parameter: {
            auto_reference_matching: false,
          },
        },
        runtime: {
          hostApi: {
            ...baseHostApi,
            file: {
              ...baseHostApi.file,
              async readText(targetPath: string) {
                assert.equal(targetPath, mdPath);
                return [
                  "# Paper",
                  "",
                  "![Overview](figures/overview.png)",
                  "",
                  "Figure 1. Overview architecture.",
                ].join("\n");
              },
              async exists(targetPath: string) {
                return targetPath === expectedImagePath;
              },
            },
            images: {
              async prepareForNoteEmbedding(source: unknown) {
                preparedPath = String(source || "");
                return {
                  bytes: new Uint8Array([1, 2, 3]),
                  mimeType: "image/jpeg",
                  width: 720,
                  height: 405,
                  originalBytes: 2048,
                  compressedBytes: 120 * 1024,
                };
              },
            },
            notes: {
              ...baseHostApi.notes,
              async importEmbeddedImage() {
                return {
                  attachmentKey: "IMGREPWIN",
                  attachmentItem: {} as Zotero.Item,
                  mimeType: "image/jpeg",
                  bytes: 120 * 1024,
                };
              },
            },
          } as any,
        },
      })) as {
        representative_image?: { status?: string; strategy?: string };
      };

      assert.equal(preparedPath, expectedImagePath);
      assert.equal(applied.representative_image?.status, "embedded");
      assert.equal(applied.representative_image?.strategy, "markdown_src_hint");
    },
  );

  itNodeOnly(
    "skips pdf representative image resolution as best effort without blocking apply",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Workflow Representative PDF Parent" },
      });
      const workflow = await getLiteratureDigestWorkflow();
      const baseHostApi = createWorkflowHostApi();
      const representativeLogs: any[] = [];

      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: createRepresentativeImageBundleReader({
          representativeImage: {
            status: "selected",
            source_kind: "pdf_figure_caption",
            label: "Figure 2",
            caption_quote: "Pipeline overview",
            page_hint: 4,
          },
        }),
        request: {
          sourceAttachmentPaths: ["D:/paper.pdf"],
          parameter: {
            auto_reference_matching: false,
          },
        },
        runtime: {
          hostApi: {
            ...baseHostApi,
            images: {
              async prepareForNoteEmbedding() {
                throw new Error(
                  "pdf best-effort skip should not prepare image",
                );
              },
            },
            logging: {
              ...baseHostApi.logging,
              appendRuntimeLog(entry: any) {
                representativeLogs.push(entry);
              },
            },
          } as any,
        },
      })) as {
        notes: Zotero.Item[];
        representative_image?: { status?: string; reason?: string };
      };

      assert.lengthOf(applied.notes, 3);
      assert.equal(applied.representative_image?.status, "skipped");
      assert.equal(
        applied.representative_image?.reason,
        "pdf_resolution_best_effort_unavailable",
      );
      const digestNote = Zotero.Items.get(applied.notes[0].id)!;
      assert.notInclude(
        digestNote.getNote(),
        'data-zs-block="representative-image-diagnostic"',
      );
      assert.notInclude(
        digestNote.getNote(),
        "pdf_resolution_best_effort_unavailable",
      );
      await assertStoredPayloadExists(digestNote, "digest-markdown");
      const logEntry = representativeLogs.find(
        (entry) => entry?.stage === "representative-image-skipped",
      );
      assert.equal(logEntry?.level, "warn");
      assert.equal(
        logEntry?.details?.reason,
        "pdf_resolution_best_effort_unavailable",
      );
      assert.equal(
        logEntry?.details?.locator?.source_kind,
        "pdf_figure_caption",
      );
    },
  );

  itFullOnly(
    "upserts existing generated notes and keeps each kind unique",
    async function () {
      this.timeout(5000);
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Workflow Upsert Parent" },
      });

      await handlers.parent.addNote(parent, {
        content:
          '<div data-zs-note-kind="digest"><h1>Digest</h1><p>old-a</p></div>',
      });
      await handlers.parent.addNote(parent, {
        content:
          '<div data-zs-note-kind="digest"><h1>Digest</h1><p>old-b</p></div>',
      });

      const bundle = new ZipBundleReader(
        fixturePath("literature-analysis", "run_bundle.zip"),
      );
      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow, "missing literature-analysis workflow");

      await executeApplyResult({
        workflow: workflow!,
        parent,
        bundleReader: bundle,
      });

      const noteItems = (parent.getNotes() || [])
        .map((id) => Zotero.Items.get(id))
        .filter(Boolean) as Zotero.Item[];
      const generated = noteItems.filter((note) =>
        parseNoteKind(note.getNote()),
      );
      const digestNotes = generated.filter(
        (note) => parseNoteKind(note.getNote()) === "digest",
      );
      const referencesNotes = generated.filter(
        (note) => parseNoteKind(note.getNote()) === "references",
      );
      const citationAnalysisNotes = generated.filter(
        (note) => parseNoteKind(note.getNote()) === "citation-analysis",
      );

      assert.lengthOf(digestNotes, 1);
      assert.lengthOf(referencesNotes, 1);
      assert.lengthOf(citationAnalysisNotes, 1);
      await assertStoredPayloadExists(digestNotes[0], "digest-markdown");
      await assertStoredPayloadExists(referencesNotes[0], "references-json");
      await assertStoredPayloadExists(
        citationAnalysisNotes[0],
        "citation-analysis-json",
      );
    },
  );

  itNodeOnly(
    "reports skipped count for mixed parent selection",
    async function () {
      const parentSkipped = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Workflow Mixed Skip Parent A" },
      });
      const parentRun = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Workflow Mixed Skip Parent B" },
      });

      const mdFile = fixturePath("literature-analysis", "example.md");
      await handlers.attachment.createFromPath({
        parent: parentSkipped,
        path: mdFile,
        title: "a.md",
        mimeType: "text/markdown",
      });
      await handlers.attachment.createFromPath({
        parent: parentRun,
        path: mdFile,
        title: "b.md",
        mimeType: "text/markdown",
      });

      await handlers.parent.addNote(parentSkipped, {
        content: '<div data-zs-note-kind="digest"><h1>Digest</h1></div>',
      });
      await handlers.parent.addNote(parentSkipped, {
        content:
          '<div data-zs-note-kind="references"><h1>References</h1></div>',
      });
      await handlers.parent.addNote(parentSkipped, {
        content:
          '<div data-zs-note-kind="citation-analysis"><h1>Citation Analysis</h1></div>',
      });

      const context = await buildSelectionContext([parentSkipped, parentRun]);
      const workflow = await getLiteratureDigestWorkflow();

      const requests = (await executeBuildRequests({
        workflow: workflow!,
        selectionContext: context,
      })) as unknown as Array<unknown> & {
        __stats?: { skippedUnits?: number; totalUnits?: number };
      };

      assert.lengthOf(requests, 1);
      assert.equal(requests.__stats?.totalUnits, 2);
      assert.equal(requests.__stats?.skippedUnits, 1);
    },
  );

  itNodeOnly(
    "reports skipped counts for core idempotent workflow execution paths",
    async function () {
      const workflow = await getLiteratureDigestWorkflow();
      const cases = [
        {
          label: "single skipped attachment",
          selectedItemsFactory: async () => {
            const { parent, attachment } = await createDigestAttachmentParent({
              title: "Workflow Execute Skip Parent",
            });
            await addGeneratedDigestNotes(parent, {
              digest: '<div data-zs-note-kind="digest"><h1>Digest</h1></div>',
              references:
                '<div data-zs-note-kind="references"><h1>References</h1></div>',
              citationAnalysis:
                '<div data-zs-note-kind="citation-analysis"><h1>Citation Analysis</h1></div>',
            });
            return [attachment];
          },
          expectedSkipped: 1,
        },
      ];

      for (const entry of cases) {
        const runtime = globalThis as { fetch?: typeof fetch };
        const originalFetch = runtime.fetch;
        let fetchCalls = 0;
        runtime.fetch = (async () => {
          fetchCalls += 1;
          throw new Error("fetch should not be called when skipped");
        }) as typeof fetch;
        const alerts: string[] = [];
        const selectedItems = await entry.selectedItemsFactory();
        const fakeWindow = {
          ZoteroPane: {
            getSelectedItems: () => selectedItems,
          },
          alert: (message: string) => {
            alerts.push(message);
          },
        } as unknown as _ZoteroTypes.MainWindow;

        try {
          await executeWorkflowFromCurrentSelection({
            win: fakeWindow,
            workflow,
          });
        } finally {
          runtime.fetch = originalFetch;
        }

        assert.equal(
          fetchCalls,
          0,
          `${entry.label}: backend fetch should be skipped`,
        );
        assert.lengthOf(alerts, 1, entry.label);
        expectWorkflowSummaryCounter(alerts[0], "succeeded", 0);
        expectWorkflowSummaryCounter(alerts[0], "failed", 0);
        expectWorkflowSummaryCounter(
          alerts[0],
          "skipped",
          entry.expectedSkipped,
        );
      }
    },
  );

  itFullOnly(
    "reports accurate skipped counts for filtered and parent-selected idempotent inputs (all selected parents are filtered out before backend call)",
    async function () {
      const workflow = await getLiteratureDigestWorkflow();
      const parentA = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Workflow Execute Skip Parent A" },
      });
      const parentB = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Workflow Execute Skip Parent B" },
      });
      const mdFile = fixturePath("literature-analysis", "example.md");
      await handlers.attachment.createFromPath({
        parent: parentA,
        path: mdFile,
        title: "a.md",
        mimeType: "text/markdown",
      });
      await handlers.attachment.createFromPath({
        parent: parentB,
        path: mdFile,
        title: "b.md",
        mimeType: "text/markdown",
      });
      for (const parent of [parentA, parentB]) {
        await addGeneratedDigestNotes(parent, {
          digest: '<div data-zs-note-kind="digest"><h1>Digest</h1></div>',
          references:
            '<div data-zs-note-kind="references"><h1>References</h1></div>',
          citationAnalysis:
            '<div data-zs-note-kind="citation-analysis"><h1>Citation Analysis</h1></div>',
        });
      }

      const runtime = globalThis as { fetch?: typeof fetch };
      const originalFetch = runtime.fetch;
      let fetchCalls = 0;
      runtime.fetch = (async () => {
        fetchCalls += 1;
        throw new Error("fetch should not be called when skipped");
      }) as typeof fetch;
      const alerts: string[] = [];
      const fakeWindow = {
        ZoteroPane: { getSelectedItems: () => [parentA, parentB] },
        alert: (message: string) => {
          alerts.push(message);
        },
      } as unknown as _ZoteroTypes.MainWindow;

      try {
        await executeWorkflowFromCurrentSelection({
          win: fakeWindow,
          workflow,
        });
      } finally {
        runtime.fetch = originalFetch;
      }

      assert.equal(fetchCalls, 0, "backend fetch should be skipped");
      assert.lengthOf(alerts, 1);
      expectWorkflowSummaryCounter(alerts[0], "succeeded", 0);
      expectWorkflowSummaryCounter(alerts[0], "failed", 0);
      expectWorkflowSummaryCounter(alerts[0], "skipped", 2);
    },
  );

  itFullOnly(
    "reports accurate skipped counts for filtered and parent-selected idempotent inputs (selected parent item is skipped during build)",
    async function () {
      const workflow = await getLiteratureDigestWorkflow();
      const { parent } = await createDigestAttachmentParent({
        title: "Workflow Parent Selection Skip",
      });
      await addGeneratedDigestNotes(parent, {
        digest: '<div data-zs-note-kind="digest"><h1>Digest</h1></div>',
        references:
          '<div data-zs-note-kind="references"><h1>References</h1></div>',
        citationAnalysis:
          '<div data-zs-note-kind="citation-analysis"><h1>Citation Analysis</h1></div>',
      });

      const context = await buildSelectionContext([parent]);
      let thrown: unknown = null;
      try {
        await executeBuildRequests({
          workflow,
          selectionContext: context,
        });
      } catch (error) {
        thrown = error;
      }

      assert.isOk(thrown, "expected parent-selection build request to skip");
      assert.match(String(thrown), /has no valid input units after filtering/);
    },
  );
});
