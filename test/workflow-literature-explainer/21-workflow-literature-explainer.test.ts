import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { handlers } from "../../src/handlers";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { listNotePayloadBlocksForItem } from "../../src/modules/zoteroNotePayloadResolver";
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
  const block = (await listNotePayloadBlocksForItem(note)).find(
    (entry) => entry.payloadType === "conversation-note-markdown",
  );
  return block?.payload as
    | {
        path?: string;
        format?: string;
        content?: string;
        version?: number;
      }
    | null
    | undefined;
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
    "creates a conversation note when applyResult receives parent id instead of item object",
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
        parent: parent.id,
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
      })) as { notes?: Zotero.Item[]; parent_item_id?: number };

      assert.lengthOf(applied.notes || [], 1);
      assert.equal(applied.parent_item_id, parent.id);
      const note = Zotero.Items.get((applied.notes || [])[0].id)!;
      assert.equal(Number(note.parentID || 0), parent.id);
      assert.include(note.getNote(), "Parent Id Path");
    },
  );

  itNodeOnly(
    "falls back to runtime btoa when Buffer is null",
    async function () {
      const originalBuffer = (
        globalThis as typeof globalThis & { Buffer?: unknown }
      ).Buffer;
      const nodeBuffer = originalBuffer as typeof Buffer;
      let capturedContent = "";
      const fakeNote = {
        id: 9001,
        key: "FAKENOTE1",
        libraryID: 1,
        parentID: 42,
        getAttachments() {
          return [];
        },
        getNote() {
          return capturedContent;
        },
      };
      const runtimeBtoa = (source: string) => {
        if (typeof globalThis.btoa === "function") {
          return globalThis.btoa(source);
        }
        if (nodeBuffer) {
          return nodeBuffer.from(source, "binary").toString("base64");
        }
        throw new Error("expected btoa or Buffer support in test runtime");
      };

      try {
        (globalThis as typeof globalThis & { Buffer?: unknown }).Buffer = null;
        const applied = (await applyLiteratureExplainerResult({
          parent: 42,
          bundleReader: {
            async readText(entryPath: string) {
              if (entryPath === "result/result.json") {
                return JSON.stringify({
                  note_path: "result/note.buffer-null.md",
                });
              }
              if (entryPath === "result/note.buffer-null.md") {
                return "# Buffer Null\n\nfallback path";
              }
              throw new Error(`missing bundle entry: ${entryPath}`);
            },
          },
          runtime: {
            hostApiVersion: 2,
            Buffer: null,
            btoa: runtimeBtoa,
            hostApi: {
              items: {
                resolve(value: unknown) {
                  return {
                    id: Number(value),
                  };
                },
              },
              parents: {
                async addNote(_parent: unknown, args: { content: string }) {
                  capturedContent = args.content;
                  return fakeNote;
                },
              },
              notes: {
                async importEmbeddedImage() {
                  return { attachmentKey: "PAYLOADIMG1" };
                },
                async update(_note: unknown, args: { content: string }) {
                  capturedContent = args.content;
                },
              },
            },
          },
        })) as {
          notes?: Array<{ id: number }>;
          parent_item_id?: number;
        };

        (globalThis as typeof globalThis & { Buffer?: unknown }).Buffer =
          originalBuffer;
        assert.lengthOf(applied.notes || [], 1);
        assert.equal(applied.parent_item_id, 42);
        assert.equal((applied.notes || [])[0]?.id, 9001);
        assert.notInclude(
          capturedContent,
          'data-zs-payload="conversation-note-markdown"',
        );
        assert.include(
          capturedContent,
          'data-zs-payload-anchor="conversation-note-markdown"',
        );
      } finally {
        (globalThis as typeof globalThis & { Buffer?: unknown }).Buffer =
          originalBuffer;
      }
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
        parent_item_id?: number;
        created_note_id?: number;
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
      if (applied.parent_item_id !== parent.id) {
        throw new Error(
          `parent_item_id mismatch; expected=${parent.id}; actual=${String(applied.parent_item_id || "")}`,
        );
      }
      if (applied.created_note_id !== (applied.notes || [])[0]?.id) {
        throw new Error(
          `created_note_id mismatch; created=${String(applied.created_note_id || "")}; noteId=${String((applied.notes || [])[0]?.id || "")}`,
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
    "keeps oversized markdown payload fully inlined while still creating the parent note",
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
