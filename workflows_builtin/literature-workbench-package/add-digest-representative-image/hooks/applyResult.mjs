import {
  resolveDigestMarkdownPayloadForNote,
  updateDigestNoteRepresentativeImage,
} from "../../lib/literatureDigestNotes.mjs";
import { getBaseName } from "../../lib/path.mjs";
import { parseGeneratedNoteKind } from "../../lib/referencesNote.mjs";
import {
  portableItemRef,
  requireHostApi,
  withPackageRuntimeScope,
} from "../../lib/runtime.mjs";

function normalizeText(value) {
  return String(value || "").trim();
}

function isMarkdownPath(value) {
  return /\.(md|markdown|mmd)$/i.test(normalizeText(value));
}

function isDigestNote(noteItem) {
  return parseGeneratedNoteKind(noteItem?.content) === "digest";
}

async function resolveSourceAttachmentByKey(host, noteItem, payload) {
  const key =
    normalizeText(payload?.source_markdown_item_key) ||
    normalizeText(payload?.source_attachment_item_key);
  if (!key) {
    return null;
  }
  return (await host.library.getItemAttachments(noteItem.parentRef))
    .find((attachment) => attachment.ref.key === key) || null;
}

async function collectParentMarkdownAttachments(host, parentItem) {
  const candidates = [];
  for (const attachment of await host.library.getItemAttachments(parentItem.ref)) {
    const path = attachment.file.state === "available" ? attachment.file.path : "";
    const title = normalizeText(attachment.title);
    const contentType = normalizeText(attachment.contentType);
    if (
      isMarkdownPath(path) ||
      isMarkdownPath(title) ||
      /^(text\/markdown|text\/plain)$/i.test(contentType)
    ) {
      candidates.push({ attachment, path, title });
    }
  }
  return candidates.filter((entry) => entry.path);
}

async function resolveSourcePath(args) {
  const host = args.host;
  const noteItem = args.noteItem;
  const parentItem = args.parentItem;
  const payload = args.payload || {};
  const keyedAttachment = await resolveSourceAttachmentByKey(
    host,
    noteItem,
    payload,
  );
  if (keyedAttachment) {
    const keyedPath = keyedAttachment.file.state === "available"
      ? keyedAttachment.file.path
      : "";
    if (keyedPath) {
      return {
        sourcePath: keyedPath,
        sourceAttachmentItemKey: normalizeText(keyedAttachment.ref.key),
        strategy: "payload-source-key",
      };
    }
  }

  const markdownAttachments = await collectParentMarkdownAttachments(
    host,
    parentItem,
  );
  const entryBase = getBaseName(normalizeText(payload.entry));
  if (entryBase) {
    const matches = markdownAttachments.filter(
      (entry) =>
        getBaseName(entry.path) === entryBase ||
        getBaseName(entry.title) === entryBase,
    );
    if (matches.length === 1) {
      return {
        sourcePath: matches[0].path,
        sourceAttachmentItemKey: normalizeText(matches[0].attachment.ref.key),
        strategy: "payload-entry-basename",
      };
    }
  }
  if (markdownAttachments.length === 1) {
    return {
      sourcePath: markdownAttachments[0].path,
      sourceAttachmentItemKey: normalizeText(markdownAttachments[0].attachment.ref.key),
      strategy: "single-parent-markdown-attachment",
    };
  }
  return {
    sourcePath: "",
    sourceAttachmentItemKey: "",
    strategy: markdownAttachments.length
      ? "ambiguous-parent-markdown-attachment"
      : "source-markdown-attachment-missing",
  };
}

async function assertExistingFile(host, path, reason) {
  if (!path) {
    throw new Error(reason);
  }
  if (typeof host.file?.exists === "function") {
    const exists = await host.file.exists(path);
    if (!exists) {
      throw new Error(`${reason}: ${path}`);
    }
  }
}

async function resolveTarget(args) {
  const host = args.host;
  const target = args.request?.digestRepresentativeImageTarget || {};
  const noteRef = portableItemRef(target.noteRef);
  const parentRef = portableItemRef(target.parentRef);
  const noteItem = await host.library.getNoteDetail(noteRef, { format: "html" });
  const parentDetail = await host.library.getItemDetail(parentRef);
  if (!noteItem || !isDigestNote(noteItem)) {
    throw new Error("add-digest-representative-image requires one digest note");
  }
  if (
    parentDetail?.kind !== "regular" ||
    noteItem.parentRef?.libraryId !== parentRef.libraryId ||
    noteItem.parentRef?.key !== parentRef.key
  ) {
    throw new Error(
      "add-digest-representative-image requires the digest note parent item",
    );
  }
  return { noteItem, parentItem: parentDetail.item };
}

async function applyResultImpl({ request, runtime }) {
  const host = requireHostApi(runtime);
  const markdownSrc = normalizeText(
    request?.markdown_src || request?.parameter?.markdown_src,
  );
  if (!markdownSrc) {
    throw new Error("markdown_src parameter is required");
  }

  const { noteItem, parentItem } = await resolveTarget({ host, request });
  const payload = await resolveDigestMarkdownPayloadForNote({
    runtime,
    noteItem,
  });
  const source = await resolveSourcePath({
    host,
    noteItem,
    parentItem,
    payload,
  });
  await assertExistingFile(
    host,
    source.sourcePath,
    `source markdown not found (${source.strategy})`,
  );

  const applied = await updateDigestNoteRepresentativeImage({
    runtime,
    parentItem,
    digestNote: noteItem,
    payload,
    sourceAttachmentItemKey: source.sourceAttachmentItemKey,
    representativeImage: {
      sourcePaths: [source.sourcePath],
      locator: {
        status: "selected",
        source_kind: "markdown_image_ref",
        label: "Representative image",
        caption_quote: "",
        section_hint: "",
        page_hint: "",
        markdown_src_hint: markdownSrc,
        selection_reason:
          "Selected manually by add-digest-representative-image workflow",
        confidence: "high",
      },
    },
  });

  const result = applied.representativeImage || { status: "none" };
  if (result.status !== "embedded") {
    throw new Error(
      `representative image not embedded: ${normalizeText(result.warning) || normalizeText(result.reason) || result.status}`,
    );
  }

  return {
    status: "embedded",
    noteRef: noteItem.ref,
    parentRef: parentItem.ref,
    markdown_src: markdownSrc,
    sourcePath: source.sourcePath,
    sourcePathStrategy: source.strategy,
    representative_image: result,
  };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}
