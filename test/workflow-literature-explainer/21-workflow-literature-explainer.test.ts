import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { handlers } from "../../src/handlers";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { createZoteroHostCapabilityBroker } from "../../src/modules/zoteroHostCapabilityBroker";
import {
  resetZoteroLibrarySourcePageQueryAdapterForTests,
  setZoteroLibrarySourcePageQueryAdapterForTests,
} from "../../src/modules/zoteroLibraryPageQuery";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  executeApplyResult,
  executeBuildRequests,
} from "../../src/workflows/runtime";
import {
  isZoteroRuntime,
  joinPath,
  mkTempDir,
  workflowsPath,
  writeUtf8,
} from "./workflow-test-utils";
import { isFullTestMode } from "../zotero/testMode";
import { applyResult as applyLiteratureExplainerResult } from "../../workflows_builtin/literature-workbench-package/literature-explainer/hooks/applyResult.mjs";
import { createUnavailableBundleReader } from "../../src/modules/workflowExecution/bundleIO";
import { createWorkflowResultContext } from "../../src/modules/workflowExecution/resultContext";
import { createMockZoteroLibrarySourcePageQueryAdapter } from "../helpers/zoteroLibraryPageQueryAdapter";

const itNodeOnly = isZoteroRuntime() ? it.skip : it;
const itZoteroFullOrNode =
  isZoteroRuntime() && !isFullTestMode() ? it.skip : it;

async function writeZoteroDebugSnapshot(name: string, payload: unknown) {
  try {
    const tempFile = Zotero.getTempDirectory();
    tempFile.append(name);
    await Zotero.File.putContentsAsync(
      tempFile,
      JSON.stringify(payload, null, 2),
    );
  } catch {
    // best-effort diagnostics only
  }
}

async function readConversationPayload(note: Zotero.Item) {
  const ref = {
    libraryId: Number(note.libraryID),
    key: String(note.key || ""),
  };
  const broker = createZoteroHostCapabilityBroker();
  let cursor: string | undefined;
  for (;;) {
    const page = await broker.library.listNotePayloads(ref, {
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });
    const summary = page.payloads.find(
      (entry) => entry.payloadType === "conversation-note-markdown",
    );
    if (summary) {
      if (summary.state !== "available") {
        return undefined;
      }
      const value = await broker.library.getNotePayload(ref, {
        payloadType: summary.payloadType,
      });
      return value.value as {
        path?: string;
        format?: string;
        content?: string;
        version?: number;
      };
    }
    if (!page.hasMore) {
      return undefined;
    }
    const nextCursor = String(page.nextCursor || "").trim();
    if (!nextCursor || nextCursor === cursor) {
      throw new Error("note payload page cursor did not advance");
    }
    cursor = nextCursor;
  }
}

async function getWorkflow() {
  const loaded = await loadWorkflowManifests(workflowsPath());
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === "literature-explainer",
  );
  assert.isOk(workflow, "expected literature-explainer workflow");
  return workflow!;
}

async function mkNodeTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-literature-explainer-"));
}

describe("workflow: literature-explainer", function () {
  beforeEach(function () {
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroLibrarySourcePageQueryAdapter(),
    );
  });

  afterEach(function () {
    resetZoteroLibrarySourcePageQueryAdapterForTests();
  });

  itNodeOnly("loads literature-explainer workflow manifest", async function () {
    const workflow = await getWorkflow();
    assert.equal(workflow.manifest.provider, "skillrunner");
    assert.equal(workflow.manifest.request?.kind, "skillrunner.job.v1");
    assert.equal(
      (workflow.manifest.request?.create as { skill_id?: string } | undefined)
        ?.skill_id,
      "literature-explainer",
    );
    assert.equal(workflow.manifest.request?.create?.mode, "interactive");
  });

  it("builds request from selected markdown attachment", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Literature Explainer Parent Markdown" },
    });
    const sourceDir = await mkTempDir("zotero-skills-literature-explainer");
    const mdPath = joinPath(sourceDir, "paper.md");
    await writeUtf8(mdPath, "# Source");

    const attachment = await handlers.attachment.createFromPath({
      parent,
      path: mdPath,
      title: "paper.md",
      mimeType: "text/markdown",
    });
    const context = await buildSelectionContext([attachment]);
    const workflow = await getWorkflow();

    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: context,
      executionOptions: {
        providerOptions: {
          engine: "gemini",
        },
      },
    })) as Array<{
      kind: string;
      skill_id: string;
      targetParentID?: number;
      taskName?: string;
      runtime_options?: { execution_mode?: string };
      input?: { source_path?: string };
      upload_files?: Array<{ key: string; path: string }>;
    }>;

    assert.lengthOf(requests, 1);
    assert.equal(requests[0].kind, "skillrunner.job.v1");
    assert.equal(requests[0].skill_id, "literature-explainer");
    assert.equal(requests[0].targetParentID, parent.id);
    assert.equal(requests[0].taskName, "paper.md");
    assert.equal(requests[0].runtime_options?.execution_mode, "interactive");
    assert.equal(requests[0].upload_files?.[0]?.key, "source_path");
    assert.equal(requests[0].upload_files?.[0]?.path, mdPath);
    assert.match(
      String(requests[0].input?.source_path || ""),
      /^inputs\/source_path\//,
    );
  });

  itNodeOnly(
    "builds request from selected pdf when markdown is unavailable",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Literature Explainer Parent PDF" },
      });
      const sourceDir = await mkTempDir("zotero-skills-literature-explainer");
      const pdfPath = joinPath(sourceDir, "paper.pdf");
      await writeUtf8(pdfPath, "pdf");

      const attachment = await handlers.attachment.createFromPath({
        parent,
        path: pdfPath,
        title: "paper.pdf",
        mimeType: "application/pdf",
      });
      const context = await buildSelectionContext([attachment]);
      const workflow = await getWorkflow();

      const requests = (await executeBuildRequests({
        workflow,
        selectionContext: context,
      })) as Array<{
        targetParentID?: number;
        taskName?: string;
        upload_files?: Array<{ key: string; path: string }>;
        input?: { source_path?: string };
      }>;

      assert.lengthOf(requests, 1);
      assert.equal(requests[0].targetParentID, parent.id);
      assert.equal(requests[0].taskName, "paper.pdf");
      assert.equal(requests[0].upload_files?.[0]?.key, "source_path");
      assert.equal(requests[0].upload_files?.[0]?.path, pdfPath);
      assert.match(
        String(requests[0].input?.source_path || ""),
        /^inputs\/source_path\//,
      );
    },
  );

  it("creates a conversation note when note_path is bundle-relative", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Literature Explainer Apply Parent" },
    });
    const notePath = "result/note.paper.md";
    const markdown = "# Summary\n\n- Point A\n- Point B\n";

    const workflow = await getWorkflow();
    const notesBefore = parent.getNotes().length;
    const applied = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: {
        async readText(entryPath: string) {
          if (entryPath === "result/result.json") {
            return JSON.stringify({
              note_path: notePath,
            });
          }
          if (entryPath === notePath) {
            return markdown;
          }
          throw new Error(`missing bundle entry: ${entryPath}`);
        },
      },
    })) as { notes?: Zotero.Item[] };

    assert.lengthOf(applied.notes || [], 1);
    const note = Zotero.Items.get((applied.notes || [])[0].id)!;
    assert.equal(parent.getNotes().length, notesBefore + 1);
    assert.equal(Number(note.parentID || 0), parent.id);
    const noteContent = note.getNote();
    assert.match(noteContent, /data-zs-note-kind="conversation-note"/);
    assert.match(noteContent, /<h1>Conversation Note \d{10}<\/h1>/);
    assert.notMatch(
      noteContent,
      /data-zs-payload="conversation-note-markdown"/,
    );
    assert.match(
      noteContent,
      /data-zs-payload-anchor="conversation-note-markdown"/,
    );
    assert.include(noteContent, 'alt="ZA"');
    assert.include(noteContent, 'title="Zotero Agents artifact payload"');
    assert.include(noteContent, 'width="32"');
    assert.include(noteContent, 'height="32"');
    assert.match(noteContent, /<div data-zs-view="conversation-note-html">/);

    const payload = await readConversationPayload(note);
    assert.isOk(payload);
    assert.equal(payload?.path, notePath);
    assert.equal(payload?.format, "markdown");
    assert.equal(payload?.version, 1);
    assert.equal(payload?.content, markdown);
  });

  itNodeOnly(
    "creates a conversation note when output includes a non-null error diagnostic",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Literature Explainer Diagnostic Error Parent" },
      });
      const notePath = "result/note.diagnostic.md";
      const markdown = "# Diagnostic Note\n\nApply should proceed.\n";

      const workflow = await getWorkflow();
      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: {
          async readText(entryPath: string) {
            if (entryPath === "result/result.json") {
              return JSON.stringify({
                status: "failed",
                data: {
                  note_path: notePath,
                  warnings: ["conversation has caveats"],
                  error: {
                    code: "partial_result",
                    message: "agent marked the note partial",
                  },
                },
              });
            }
            if (entryPath === notePath) {
              return markdown;
            }
            throw new Error(`missing bundle entry: ${entryPath}`);
          },
        },
      })) as {
        notes?: Zotero.Item[];
        warnings?: string[];
        skill_diagnostics?: { error?: { message?: string }; status?: string };
      };

      assert.lengthOf(applied.notes || [], 1);
      assert.deepEqual(applied.warnings, ["conversation has caveats"]);
      assert.equal(applied.skill_diagnostics?.status, "failed");
      assert.equal(
        applied.skill_diagnostics?.error?.message,
        "agent marked the note partial",
      );
      const note = Zotero.Items.get((applied.notes || [])[0].id)!;
      const payload = await readConversationPayload(note);
      assert.equal(payload?.content, markdown);
    },
  );

  itNodeOnly(
    "creates a conversation note from ACP local note_path through shared result context",
    async function () {
      const root = await mkNodeTempRoot();
      try {
        const parent = await handlers.item.create({
          itemType: "journalArticle",
          fields: { title: "Literature Explainer ACP Result Context Parent" },
        });
        const resultDir = path.join(root, "result");
        await fs.mkdir(resultDir, { recursive: true });
        const notePath = path.join(resultDir, "conversation-note.md");
        const markdown = "# ACP Conversation\n\n- Direct local note path.\n";
        await fs.writeFile(notePath, markdown, "utf8");
        const resultJson = {
          note_path: notePath,
        };
        const workflow = await getWorkflow();
        const bundleReader = createUnavailableBundleReader(
          "acp-explainer-result",
        );
        const resultContext = await createWorkflowResultContext({
          runResult: {
            requestId: "acp-explainer-result",
            resultJson,
            responseJson: {
              workspaceDir: root,
            },
          },
          bundleReader,
          manifest: workflow.manifest,
        });

        const applied = (await executeApplyResult({
          workflow,
          parent,
          bundleReader,
          resultContext,
          runResult: {
            requestId: "acp-explainer-result",
            resultJson,
            responseJson: {
              workspaceDir: root,
            },
          },
        })) as { notes?: Zotero.Item[]; note_path?: string };

        assert.lengthOf(applied.notes || [], 1);
        assert.equal(applied.note_path, notePath.replace(/\\/g, "/"));
        const note = Zotero.Items.get((applied.notes || [])[0].id)!;
        const payload = await readConversationPayload(note);
        assert.equal(payload?.path, notePath.replace(/\\/g, "/"));
        assert.equal(payload?.content, markdown);
      } finally {
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );

  itNodeOnly(
    "creates a conversation note when applyResult receives a portable parent ref",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Literature Explainer Parent Id Apply Parent" },
      });
      const notePath = "result/note.parent-id.md";
      const markdown =
        "# Parent Id Path\n\n- HostApi addNote should resolve raw parent refs.\n";

      const workflow = await getWorkflow();
      const applied = (await executeApplyResult({
        workflow,
        parent: { libraryId: parent.libraryID, key: parent.key },
        bundleReader: {
          async readText(entryPath: string) {
            if (entryPath === "result/result.json") {
              return JSON.stringify({
                note_path: notePath,
              });
            }
            if (entryPath === notePath) {
              return markdown;
            }
            throw new Error(`missing bundle entry: ${entryPath}`);
          },
        },
      })) as {
        notes?: Array<{ ref: { libraryId: number; key: string } }>;
        parent_ref?: { libraryId: number; key: string };
      };

      assert.lengthOf(applied.notes || [], 1);
      assert.deepEqual(applied.parent_ref, {
        libraryId: parent.libraryID,
        key: parent.key,
      });
      const noteRef = (applied.notes || [])[0].ref;
      const note = await Zotero.Items.getByLibraryAndKey(
        noteRef.libraryId,
        noteRef.key,
      );
      assert.isOk(note);
      assert.equal(Number(note.parentID || 0), parent.id);
      assert.include(note.getNote(), "Parent Id Path");
    },
  );

  itZoteroFullOrNode(
    "creates a conversation note from backend-shaped result/result.json payload",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Literature Explainer Backend-Shaped Result Parent" },
      });
      const notePath = "artifacts/note.3dcbb6ddcea81cb8.md";
      const markdown = "# Backend Result\n\n- Evidence-backed note\n";

      const workflow = await getWorkflow();
      const notesBefore = parent.getNotes().length;
      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: {
          async readText(entryPath: string) {
            if (entryPath === "result/result.json") {
              return JSON.stringify({
                status: "success",
                data: {
                  note_path: notePath,
                  provenance: {
                    generated_at: "2026-04-05T08:05:58Z",
                    input_hash: "sha256:3dcbb6ddcea81cb8",
                    model: "pymupdf4llm",
                  },
                  warnings: [],
                  error: null,
                },
                artifacts: [notePath],
                error: null,
              });
            }
            if (entryPath === notePath) {
              return markdown;
            }
            throw new Error(`missing bundle entry: ${entryPath}`);
          },
        },
      })) as {
        notes?: Zotero.Item[];
        requested_note_path?: string;
        note_path?: string;
        parent_ref?: { libraryId: number; key: string };
        created_note_ref?: { libraryId: number; key: string };
      };

      await writeZoteroDebugSnapshot("zs-literature-explainer-debug.json", {
        stage: "after-executeApplyResult",
        applied,
        parentId: parent.id,
        parentNoteIds: parent.getNotes(),
        notesBefore,
      });
      if ((applied.notes || []).length !== 1) {
        throw new Error(
          `expected exactly one created note; actual=${(applied.notes || []).length}; applied=${JSON.stringify(applied)}`,
        );
      }
      if (applied.requested_note_path !== notePath) {
        throw new Error(
          `requested_note_path mismatch; expected=${notePath}; actual=${String(applied.requested_note_path || "")}`,
        );
      }
      if (applied.note_path !== notePath) {
        throw new Error(
          `note_path mismatch; expected=${notePath}; actual=${String(applied.note_path || "")}`,
        );
      }
      if (applied.parent_ref?.key !== parent.key) {
        throw new Error(
          `parent_ref mismatch; expected=${parent.key}; actual=${String(applied.parent_ref?.key || "")}`,
        );
      }
      if (applied.created_note_ref?.key !== (applied.notes || [])[0]?.key) {
        throw new Error(
          `created_note_ref mismatch; created=${String(applied.created_note_ref?.key || "")}; noteKey=${String((applied.notes || [])[0]?.key || "")}`,
        );
      }
      const note = Zotero.Items.get((applied.notes || [])[0].id)!;
      if (parent.getNotes().length !== notesBefore + 1) {
        throw new Error(
          `parent note count mismatch; before=${notesBefore}; after=${parent.getNotes().length}; parentNotes=${JSON.stringify(parent.getNotes())}`,
        );
      }
      if (Number(note.parentID || 0) !== parent.id) {
        throw new Error(
          `note parent mismatch; expected=${parent.id}; actual=${String(note.parentID || "")}`,
        );
      }
      const payload = await readConversationPayload(note);
      await writeZoteroDebugSnapshot("zs-literature-explainer-debug.json", {
        stage: "after-read-note",
        noteId: note.id,
        parentId: parent.id,
        parentNoteIds: parent.getNotes(),
        requestedNotePath: applied.requested_note_path,
        resolvedNotePath: applied.note_path,
        payload,
        noteHtml: note.getNote(),
      });
      if (!payload) {
        throw new Error(
          `conversation payload missing after Zotero save; noteId=${note.id}; parentNoteIds=${JSON.stringify(parent.getNotes())}; noteHtml=${note.getNote()}`,
        );
      }
      if (payload.path !== notePath) {
        throw new Error(
          `conversation payload path mismatch; expected=${notePath}; actual=${String(payload.path || "")}; noteId=${note.id}; noteHtml=${note.getNote()}`,
        );
      }
      if (payload.content !== markdown) {
        throw new Error(
          `conversation payload content mismatch; expectedLength=${markdown.length}; actualLength=${String(payload.content || "").length}; noteId=${note.id}; noteHtml=${note.getNote()}`,
        );
      }
    },
  );

  itNodeOnly(
    "keeps an oversized markdown payload complete while creating a bounded parent note",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Literature Explainer Oversized Payload Parent" },
      });
      const notePath = "artifacts/note.large.md";
      const markdown = `${"# Oversized Note\n\n"}${"Long paragraph.\n".repeat(2500)}`;

      const workflow = await getWorkflow();
      const notesBefore = parent.getNotes().length;
      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: {
          async readText(entryPath: string) {
            if (entryPath === "result/result.json") {
              return JSON.stringify({
                status: "success",
                data: {
                  note_path: notePath,
                },
              });
            }
            if (entryPath === notePath) {
              return markdown;
            }
            throw new Error(`missing bundle entry: ${entryPath}`);
          },
        },
      })) as {
        notes?: Zotero.Item[];
      };

      assert.lengthOf(applied.notes || [], 1);
      assert.equal(parent.getNotes().length, notesBefore + 1);

      const note = Zotero.Items.get((applied.notes || [])[0].id)!;
      const payload = (await readConversationPayload(note)) as {
        path?: string;
        format?: string;
        content?: string;
      } | null;
      assert.isOk(payload);
      assert.equal(payload?.path, notePath);
      assert.equal(payload?.format, "markdown");
      assert.equal(payload?.content, markdown);
      assert.include(note.getNote(), "<h1>Oversized Note</h1>");
    },
  );

  itNodeOnly(
    "maps absolute note_path to bundle entry suffix and creates note",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Literature Explainer Absolute note_path Parent" },
      });
      const absolutePath = "C:/tmp/run-1/result/note.abs.md";
      const markdown = "# From Absolute\n\nResolved by bundle suffix.\n";

      const workflow = await getWorkflow();
      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: {
          async readText(entryPath: string) {
            if (entryPath === "result/result.json") {
              return JSON.stringify({
                note_path: absolutePath,
              });
            }
            if (entryPath === "result/note.abs.md") {
              return markdown;
            }
            throw new Error(`missing bundle entry: ${entryPath}`);
          },
        },
      })) as { notes?: Zotero.Item[] };

      assert.lengthOf(applied.notes || [], 1);
      const note = Zotero.Items.get((applied.notes || [])[0].id)!;
      const payload = await readConversationPayload(note);
      assert.equal(payload?.path, "result/note.abs.md");
      assert.equal(payload?.content, markdown);
    },
  );

  itNodeOnly(
    "prefers uploads-prefixed note_path without forcing artifacts/result rewrite",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Literature Explainer Uploads note_path Parent" },
      });
      const uploadsPath =
        "uploads/inputs/source_path/artifacts/conversation-note.md";
      const markdown =
        "# Uploads Path\n\nResolved from bundle-relative uploads path.\n";

      const workflow = await getWorkflow();
      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: {
          async readText(entryPath: string) {
            if (entryPath === "result/result.json") {
              return JSON.stringify({
                note_path: uploadsPath,
              });
            }
            if (entryPath === uploadsPath) {
              return markdown;
            }
            throw new Error(`missing bundle entry: ${entryPath}`);
          },
        },
      })) as { notes?: Zotero.Item[] };

      assert.lengthOf(applied.notes || [], 1);
      const note = Zotero.Items.get((applied.notes || [])[0].id)!;
      const payload = await readConversationPayload(note);
      assert.equal(payload?.path, uploadsPath);
      assert.equal(payload?.content, markdown);
    },
  );

  itNodeOnly("skips note creation when note_path is empty", async function () {
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Literature Explainer Empty note_path Parent" },
    });
    const workflow = await getWorkflow();

    const applied = (await executeApplyResult({
      workflow,
      parent,
      bundleReader: {
        async readText(entryPath: string) {
          if (entryPath === "result/result.json") {
            return JSON.stringify({
              note_path: "",
            });
          }
          throw new Error(`unexpected bundle entry: ${entryPath}`);
        },
      },
    })) as { notes?: Zotero.Item[]; skipped?: boolean };

    assert.lengthOf(applied.notes || [], 0);
    assert.equal(applied.skipped, true);
    assert.lengthOf(parent.getNotes() || [], 0);
  });

  itNodeOnly(
    "skips note creation when note_path cannot be resolved in bundle",
    async function () {
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Literature Explainer Missing note_path Parent" },
      });
      const workflow = await getWorkflow();

      const applied = (await executeApplyResult({
        workflow,
        parent,
        bundleReader: {
          async readText(entryPath: string) {
            if (entryPath === "result/result.json") {
              return JSON.stringify({
                note_path: "D:/__missing__/note.paper.md",
              });
            }
            throw new Error(`missing bundle entry: ${entryPath}`);
          },
        },
      })) as { notes?: Zotero.Item[]; skipped?: boolean; reason?: string };

      assert.lengthOf(applied.notes || [], 0);
      assert.equal(applied.skipped, true);
      assert.equal(applied.reason, "note_path not found in bundle");
      assert.lengthOf(parent.getNotes() || [], 0);
    },
  );
});
