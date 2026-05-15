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
  workflowsPath,
} from "./workflow-test-utils";
import { isFullTestMode } from "../zotero/testMode";

function parseNoteKind(noteContent: string) {
  const match = String(noteContent || "").match(
    /data-zs-note-kind=(["'])([^"']+)\1/i,
  );
  return match ? match[2] : "";
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

async function mkTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-literature-digest-"));
}

const itFullOnly = isFullTestMode() ? it : it.skip;
const itNodeOnly = isZoteroRuntime() ? it.skip : it;

describe("workflow: literature-digest", function () {
  async function getLiteratureDigestWorkflow() {
    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-digest",
    );
    assert.isOk(workflow, "missing literature-digest workflow");
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
    const mdFile = fixturePath("literature-digest", "example.md");
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
    await handlers.parent.addNote(parent, { content: noteContents.citationAnalysis });
  }

  itNodeOnly("loads literature-digest workflow manifest from workflows directory", async function () {
    const loaded = await loadWorkflowManifests(workflowsPath());

    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-digest",
    );
    assert.isOk(workflow, "expected literature-digest workflow");
    assert.equal(workflow?.manifest.request?.kind, "skillrunner.job.v1");
    assert.equal(
      (workflow?.manifest.request?.create as { skill_id?: string } | undefined)
        ?.skill_id,
      "literature-digest",
    );
    assert.equal(
      workflow?.manifest.parameters?.language?.default,
      "zh-CN",
    );
    assert.equal(
      workflow?.manifest.parameters?.auto_reference_matching?.default,
      true,
    );
  });

  it("builds request from selected markdown attachment", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Parent" },
    });

    const mdFile = fixturePath("literature-digest", "example.md");
    const attachment = await handlers.attachment.createFromPath({
      parent,
      path: mdFile,
      title: "example.md",
      mimeType: "text/markdown",
    });

    const context = await buildSelectionContext([attachment]);
    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-digest",
    );
    assert.isOk(workflow, "missing literature-digest workflow");

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
    assert.equal(request.skill_id, "literature-digest");
    assert.equal(request.parameter?.language, "zh-CN");
    assert.equal(request.runtime_options?.execution_mode, "auto");
    assert.equal(request.upload_files?.[0].key, "source_path");
    assert.equal(request.upload_files?.[0].path, mdFile);
    assert.match(String(request.input?.source_path || ""), /^inputs\/source_path\//);
  });

  itNodeOnly("builds request from selected pdf attachment when markdown is unavailable", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Parent PDF Fallback" },
    });

    const pdfFile = fixturePath("selection-context", "attachments/EXKUYHMH/Zhang 等 - 2022 - Accelerating DETR Convergence via Semantic-Aligned Matching.pdf");
    const attachment = await handlers.attachment.createFromPath({
      parent,
      path: pdfFile,
      title: "example.pdf",
      mimeType: "application/pdf",
    });

    const context = await buildSelectionContext([attachment]);
    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-digest",
    );
    assert.isOk(workflow, "missing literature-digest workflow");

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
    assert.match(String(requests[0].input?.source_path || ""), /^inputs\/source_path\//);
  });

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
      fixturePath("literature-digest", "run_bundle.zip"),
    );

    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-digest",
    );
    assert.isOk(workflow, "missing literature-digest workflow");

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
    assert.match(firstNote.getNote(), /data-zs-payload="digest-markdown"/);
    assert.match(firstNote.getNote(), /data-zs-value="/);
    assert.match(secondNote.getNote(), /<h1>References<\/h1>/);
    assert.match(secondNote.getNote(), /<table data-zs-view="references-table">/);
    assert.match(secondNote.getNote(), /data-zs-payload="references-json"/);
    assert.match(secondNote.getNote(), /data-zs-value="/);
    assert.match(thirdNote.getNote(), /<h1>Citation Analysis<\/h1>/);
    assert.match(thirdNote.getNote(), /data-zs-payload="citation-analysis-json"/);
    assert.match(thirdNote.getNote(), /data-zs-value="/);

    const parentNotes = parent.getNotes();
    assert.include(parentNotes, firstNote.id);
    assert.include(parentNotes, secondNote.id);
    assert.include(parentNotes, thirdNote.id);
  });

  itNodeOnly("automatically runs reference matching after writing references note", async function () {
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
        fixturePath("literature-digest", "run_bundle.zip"),
      ),
    })) as {
      notes: Zotero.Item[];
      auto_reference_matching?: {
        enabled?: boolean;
        attempted?: boolean;
        matched?: number;
        total?: number;
      };
    };

    const referencesNote = applied.notes.find(
      (note) => parseNoteKind(Zotero.Items.get(note.id)!.getNote()) === "references",
    );
    assert.isOk(referencesNote);
    const payload = parsePayloadValue(
      Zotero.Items.get(referencesNote!.id)!.getNote(),
      "references-json",
    ) as { references?: Array<{ citekey?: string }>; reference_matching?: unknown };
    assert.equal(payload.references?.[0]?.citekey, "AlRfou2019Character");
    assert.isObject(payload.reference_matching);
    assert.equal(applied.auto_reference_matching?.enabled, true);
    assert.equal(applied.auto_reference_matching?.attempted, true);
    assert.isAtLeast(applied.auto_reference_matching?.matched || 0, 1);
    assert.isAtLeast(applied.auto_reference_matching?.total || 0, 1);
  });

  itNodeOnly("skips auto reference matching when disabled", async function () {
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
        fixturePath("literature-digest", "run_bundle.zip"),
      ),
      request: {
        parameter: {
          auto_reference_matching: false,
        },
      },
    })) as {
      notes: Zotero.Item[];
      auto_reference_matching?: { enabled?: boolean; attempted?: boolean };
    };

    const referencesNote = applied.notes.find(
      (note) => parseNoteKind(Zotero.Items.get(note.id)!.getNote()) === "references",
    );
    assert.isOk(referencesNote);
    const payload = parsePayloadValue(
      Zotero.Items.get(referencesNote!.id)!.getNote(),
      "references-json",
    ) as { references?: Array<{ citekey?: string }>; reference_matching?: unknown };
    assert.isUndefined(payload.references?.[0]?.citekey);
    assert.isUndefined(payload.reference_matching);
    assert.equal(applied.auto_reference_matching?.enabled, false);
    assert.equal(applied.auto_reference_matching?.attempted, false);
  });

  itNodeOnly("runs auto reference matching again after digest updates an existing references note", async function () {
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
        fixturePath("literature-digest", "run_bundle.zip"),
      ),
    });
    const second = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: new ZipBundleReader(
        fixturePath("literature-digest", "run_bundle.zip"),
      ),
    })) as {
      notes: Zotero.Item[];
      auto_reference_matching?: { attempted?: boolean; matched?: number };
    };

    const referencesNote = second.notes.find(
      (note) => parseNoteKind(Zotero.Items.get(note.id)!.getNote()) === "references",
    );
    assert.isOk(referencesNote);
    const payload = parsePayloadValue(
      Zotero.Items.get(referencesNote!.id)!.getNote(),
      "references-json",
    ) as { references?: Array<{ citekey?: string }>; reference_matching?: unknown };
    assert.equal(payload.references?.[0]?.citekey, "ReapplyAutoMatching2019");
    assert.isObject(payload.reference_matching);
    assert.equal(second.auto_reference_matching?.attempted, true);
  });

  itNodeOnly("keeps digest apply successful when auto reference matching fails", async function () {
    this.timeout(5000);
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Auto Matching Warning Parent" },
    });
    const workflow = await getLiteratureDigestWorkflow();
    const hostApi = createWorkflowHostApi();

    const applied = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: new ZipBundleReader(
        fixturePath("literature-digest", "run_bundle.zip"),
      ),
      runtime: {
        hostApi: {
          ...hostApi,
          notes: {
            ...hostApi.notes,
            update: async () => {
              throw new Error("auto matching update failed");
            },
          },
        },
      },
    })) as {
      notes: Zotero.Item[];
      auto_reference_matching?: {
        enabled?: boolean;
        attempted?: boolean;
        warning?: string;
      };
    };

    assert.lengthOf(applied.notes, 3);
    assert.equal(applied.auto_reference_matching?.enabled, true);
    assert.equal(applied.auto_reference_matching?.attempted, true);
    assert.match(applied.auto_reference_matching?.warning || "", /auto matching update failed/);
  });

  itNodeOnly("applies result when artifact paths are uploads-prefixed bundle-relative paths", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Uploads-Prefixed Paths Parent" },
    });
    const digestPath = "uploads/inputs/source_path/artifacts/digest.md";
    const referencesPath = "uploads/inputs/source_path/artifacts/references.json";
    const citationPath = "uploads/inputs/source_path/artifacts/citation_analysis.json";

    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-digest",
    );
    assert.isOk(workflow, "missing literature-digest workflow");

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
      parsePayloadEntryPath(digestNote.getNote(), "digest-markdown"),
      digestPath,
    );
    assert.equal(
      parsePayloadEntryPath(referencesNote.getNote(), "references-json"),
      referencesPath,
    );
    assert.equal(
      parsePayloadEntryPath(citationAnalysisNote.getNote(), "citation-analysis-json"),
      citationPath,
    );
  });

  itNodeOnly("applies ACP local result paths through shared result context without bundle projection", async function () {
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
      await fs.writeFile(citationPath, '{"report_md":"# ACP Citation"}', "utf8");
      const resultJson = {
        digest_path: digestPath,
        references_path: referencesPath,
        citation_analysis_path: citationPath,
      };

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-digest",
      );
      assert.isOk(workflow, "missing literature-digest workflow");
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
        parsePayloadEntryPath(digestNote.getNote(), "digest-markdown"),
        digestPath.replace(/\\/g, "/"),
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  itNodeOnly("surfaces missing artifact path details when all entry candidates fail", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Missing Artifact Path Parent" },
    });
    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-digest",
    );
    assert.isOk(workflow, "missing literature-digest workflow");

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
                  digest_path: "uploads/inputs/source_path/artifacts/digest.md",
                  references_path: "uploads/inputs/source_path/artifacts/references.json",
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
    const message = String(
      thrown instanceof Error ? thrown.message : thrown,
    );
    assert.include(message, "[digest_path] bundle entry not found");
    assert.include(message, "uploads/inputs/source_path/artifacts/digest.md");
    assert.include(message, "artifacts/digest.md");
  });

  itNodeOnly("writes hidden source metadata with markdown attachment itemKey when request is provided", async function () {
    this.timeout(5000);
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Source Metadata Parent" },
    });

    const mdFile = fixturePath("literature-digest", "example.md");
    const attachment = await handlers.attachment.createFromPath({
      parent,
      path: mdFile,
      title: "example.md",
      mimeType: "text/markdown",
    });
    const context = await buildSelectionContext([attachment]);

    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-digest",
    );
    assert.isOk(workflow, "missing literature-digest workflow");

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
      fixturePath("literature-digest", "run_bundle.zip"),
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
    assert.match(digestNote.getNote(), /data-zs-block="meta"/);
    assert.match(digestNote.getNote(), /data-zs-meta="source-attachment"/);
    assert.equal(
      parseSourceAttachmentItemKey(digestNote.getNote()),
      attachment.key,
    );
    assert.match(digestNote.getNote(), /data-zs-payload="digest-markdown"/);
    assert.match(referencesNote.getNote(), /data-zs-payload="references-json"/);
    assert.match(
      citationAnalysisNote.getNote(),
      /data-zs-payload="citation-analysis-json"/,
    );
  });

  itFullOnly("continues apply when source markdown itemKey cannot be resolved", async function () {
    this.timeout(5000);
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Source Metadata Fallback Parent" },
    });

    const bundle = new ZipBundleReader(
      fixturePath("literature-digest", "run_bundle.zip"),
    );
    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-digest",
    );
    assert.isOk(workflow, "missing literature-digest workflow");

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
        upload_files: [{ key: "source_path", path: "D:/not-found/example.md" }],
      },
    })) as { notes: Zotero.Item[] };

    assert.lengthOf(applied.notes, 3);
    const digestNote = Zotero.Items.get(applied.notes[0].id)!;
    const referencesNote = Zotero.Items.get(applied.notes[1].id)!;
    const citationAnalysisNote = Zotero.Items.get(applied.notes[2].id)!;
    assert.notMatch(digestNote.getNote(), /data-zs-source_attachment_item_key=/);
    assert.match(digestNote.getNote(), /data-zs-payload="digest-markdown"/);
    assert.match(referencesNote.getNote(), /data-zs-payload="references-json"/);
    assert.match(
      citationAnalysisNote.getNote(),
      /data-zs-payload="citation-analysis-json"/,
    );
  });

  itFullOnly("upserts existing generated notes and keeps each kind unique", async function () {
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
      fixturePath("literature-digest", "run_bundle.zip"),
    );
    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-digest",
    );
    assert.isOk(workflow, "missing literature-digest workflow");

    await executeApplyResult({
      workflow: workflow!,
      parent,
      bundleReader: bundle,
    });

    const noteItems = (parent.getNotes() || [])
      .map((id) => Zotero.Items.get(id))
      .filter(Boolean) as Zotero.Item[];
    const generated = noteItems.filter((note) =>
      /data-zs-note-kind=/.test(note.getNote()),
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
    assert.match(
      digestNotes[0].getNote(),
      /data-zs-payload="digest-markdown"/,
    );
    assert.match(
      referencesNotes[0].getNote(),
      /data-zs-payload="references-json"/,
    );
    assert.match(
      citationAnalysisNotes[0].getNote(),
      /data-zs-payload="citation-analysis-json"/,
    );
  });

  itNodeOnly("reports skipped count for mixed parent selection", async function () {
    const parentSkipped = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Mixed Skip Parent A" },
    });
    const parentRun = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Mixed Skip Parent B" },
    });

    const mdFile = fixturePath("literature-digest", "example.md");
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
      content:
        '<div data-zs-note-kind="digest"><h1>Digest</h1></div>',
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
  });

  itNodeOnly("reports skipped counts for core idempotent workflow execution paths", async function () {
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

      assert.equal(fetchCalls, 0, `${entry.label}: backend fetch should be skipped`);
      assert.lengthOf(alerts, 1, entry.label);
      expectWorkflowSummaryCounter(alerts[0], "succeeded", 0);
      expectWorkflowSummaryCounter(alerts[0], "failed", 0);
      expectWorkflowSummaryCounter(alerts[0], "skipped", entry.expectedSkipped);
    }
  });

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
      const mdFile = fixturePath("literature-digest", "example.md");
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
        await executeWorkflowFromCurrentSelection({ win: fakeWindow, workflow });
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
      assert.match(
        String(thrown),
        /has no valid input units after filtering/,
      );
    },
  );
});
