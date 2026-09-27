import { exportGeneratedNoteCandidate } from "../../lib/literatureDigestNotes.mjs";
import { copyTextToClipboard } from "../../lib/clipboard.mjs";
import {
  portableItemRef,
  readHostPages,
  requireHostApi,
  withPackageRuntimeScope,
} from "../../lib/runtime.mjs";

function uniqueRefs(values) {
  const refs = new Map();
  for (const value of values) {
    const ref = portableItemRef(value?.ref || value);
    refs.set(`${ref.libraryId}:${ref.key}`, ref);
  }
  return [...refs.values()];
}

export async function analyzeNoteItemForDebug({ host, noteItem, runtime }) {
  const detail =
    noteItem.kind === "managed" || noteItem.kind === "ordinary"
      ? noteItem
      : await host.library.getNoteDetail(portableItemRef(noteItem), {
          format: "html",
        });
  const attachments = await readHostPages({
    readPage: (page) => host.library.getItemAttachments(detail.ref, page),
    getItems: (page) => page.attachments,
    operation: "debug note inspector attachment read",
  });
  let exportAttempt = { attempted: false };
  if (detail.kind === "managed") {
    try {
      const exported = await exportGeneratedNoteCandidate({
        noteKind: detail.noteKind,
        noteItemRef: detail.ref,
        runtime,
      });
      exportAttempt = {
        attempted: true,
        ok: true,
        files: exported.files.map((file) => ({
          fileName: file.fileName,
          hasContent: typeof file.content === "string",
          hasBytes: !!file.bytes,
        })),
      };
    } catch (error) {
      exportAttempt = {
        attempted: true,
        ok: false,
        code: error.code || "export_failed",
        message: String(error.message || error),
      };
    }
  }
  return {
    ref: detail.ref,
    parentRef: detail.parentRef,
    title: detail.title,
    kind: detail.kind,
    ...(detail.kind === "managed"
      ? {
          noteKind: detail.noteKind,
          payloadBytes: detail.payloadBytes,
          detailBytes: detail.detailBytes,
          provenance: detail.provenance || null,
        }
      : { contentLength: detail.content.length }),
    revision: detail.revision,
    attachments: attachments.map(({ ref, role, contentType, file }) => ({
      ref,
      role,
      contentType,
      fileState: file.state,
    })),
    exportAttempt,
  };
}

async function applyResultImpl(args) {
  const runtime = args?.runtime || {};
  const host = requireHostApi(runtime);
  const selection =
    args?.request?.selectionContext ||
    args?.runResult?.resultJson?.selectionContext ||
    args?.runResult?.responseJson?.selectionContext;
  const refs = uniqueRefs([
    ...(selection?.items || [])
      .map((item) =>
        item.kind === "parent" || item.kind === "note"
          ? item.ref
          : item.parentRef,
      )
      .filter(Boolean),
    ...(args?.parent ? [args.parent] : []),
  ]);
  const noteRefs = [];
  for (const ref of refs) {
    const detail = await host.library.getItemDetail(ref);
    if (detail.kind === "note") {
      noteRefs.push(detail.item.ref);
      continue;
    }
    const parentRef =
      detail.kind === "regular" ? detail.item.ref : detail.item.parentRef;
    if (!parentRef) continue;
    const notes = await readHostPages({
      readPage: (page) => host.library.getItemNotes(parentRef, page),
      getItems: (page) => page.notes,
      operation: "debug note inspector read",
    });
    noteRefs.push(...notes.map((note) => note.ref));
  }
  const notes = [];
  for (const ref of uniqueRefs(noteRefs)) {
    try {
      notes.push(
        await analyzeNoteItemForDebug({ host, noteItem: ref, runtime }),
      );
    } catch (error) {
      notes.push({
        ref,
        error: {
          code: error.code || "read_failed",
          retryable: error.retryable === true,
          message: String(error.message || error),
        },
      });
    }
  }
  const result = {
    generatedAt: new Date().toISOString(),
    selectedRefs: refs,
    notes,
    summary: {
      selectedItemCount: refs.length,
      noteCount: notes.length,
      exportableCount: notes.filter((note) => note.exportAttempt?.ok).length,
      failedCount: notes.filter((note) => note.error).length,
    },
  };
  return {
    ...result,
    clipboard: await copyTextToClipboard(
      JSON.stringify(result, null, 2),
      runtime,
    ),
  };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}
