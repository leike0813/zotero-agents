import {
  portableItemRef,
  readHostPages,
  requireCommittedMutation,
  requireHostApi,
  resolveAttachmentDescriptor,
} from "./runtime.mjs";
import { getBaseName, sanitizeFileNameSegment } from "./path.mjs";
import { resolveWorkbenchEmbeddedPayloadBlock } from "./embeddedPayloadAttachments.mjs";
import {
  insertRepresentativeImageMarkdownExportBlock,
  prepareRepresentativeImageForDigestNote,
  prepareResolvedRepresentativeImageForDigestNote,
  renderRepresentativeImageDiagnosticBlock,
  REPRESENTATIVE_IMAGE_EXPORT_FILE_NAME,
} from "./representativeImage.mjs";

export const LITERATURE_MATCHING_METADATA_PAYLOAD_TYPE =
  "literature-matching-metadata-json";

export async function collectGeneratedNotesByKind(parentItem, runtime) {
  const byKind = new Map([
    ["digest", []],
    ["references", []],
    ["citation-analysis", []],
    ["literature-score", []],
  ]);
  const host = requireHostApi(runtime);
  const summaries = await readHostPages({
    readPage: (page) =>
      host.library.getItemNotes(portableItemRef(parentItem), page),
    getItems: (page) => page.notes,
    operation: "literature digest note read",
  });
  for (const summary of summaries) {
    const detail = await host.library.getNoteDetail(summary.ref, {
      format: "html",
    });
    const kind = detail.kind === "managed" ? detail.noteKind : null;
    if (!byKind.has(kind)) {
      continue;
    }
    byKind.get(kind).push(detail);
  }
  return byKind;
}

function withRepresentativeImageDiagnostic(result) {
  if (
    result?.status &&
    result.status !== "none" &&
    result.status !== "embedded" &&
    !result.diagnosticBlock
  ) {
    return {
      ...result,
      diagnosticBlock: renderRepresentativeImageDiagnosticBlock(result),
    };
  }
  return result;
}

async function prepareDigestRepresentativeImage(args) {
  const request = args.request || null;
  if (!request) {
    return {
      status: "none",
    };
  }
  if (request.skippedResult) {
    return withRepresentativeImageDiagnostic(request.skippedResult);
  }
  if (request.imagePath) {
    return prepareResolvedRepresentativeImageForDigestNote({
      runtime: args.runtime,
      digestNote: args.digestNote,
      locator: request.locator,
      imagePath: request.imagePath,
      sourcePath: request.sourcePath,
      strategy: request.strategy,
      previousNoteContent: args.previousNoteContent,
    });
  }
  return prepareRepresentativeImageForDigestNote({
    runtime: args.runtime,
    digestNote: args.digestNote,
    sourcePaths: request.sourcePaths,
    locator: request.locator,
    previousNoteContent: args.previousNoteContent,
  });
}

export async function updateDigestNoteRepresentativeImage(args) {
  const result = await upsertLiteratureDigestGeneratedNotes({
    runtime: args.runtime,
    parentItem: args.parentItem,
    digest: {
      payload: { content: args.payload.markdown },
      sourceAttachmentItemKey: args.sourceAttachmentItemKey,
      representativeImage: args.representativeImage,
    },
  });
  return {
    note: result.notes.find((note) => note.noteKind === "digest"),
    representativeImage: result.representative_image,
  };
}

export async function upsertLiteratureDigestGeneratedNotes(args) {
  const host = requireHostApi(args.runtime);
  const parentRef = portableItemRef(args.parentItem);
  const representativeImage = args.digest?.representativeImage
    ? await prepareDigestRepresentativeImage({
        runtime: args.runtime,
        request: args.digest.representativeImage,
      })
    : { status: "none" };
  const image = representativeImage.embeddedImages?.[0];
  const sourceKey = args.digest?.sourceAttachmentItemKey;
  const execution = await host.literatureArtifacts.applyAnalysis({
      operationId: `literature-analysis:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`,
      parentRef,
      ...(args.digest
        ? {
            digest: {
              markdown: args.digest.payload.content,
              ...(sourceKey
                ? {
                    sourceRef: {
                      libraryId: parentRef.libraryId,
                      key: sourceKey,
                    },
                  }
                : {}),
              ...(image
                ? {
                    representativeImage: {
                      preparedImage: image.preparedImage,
                      altText: image.altText,
                    },
                  }
                : {}),
            },
          }
        : {}),
      ...(args.references ? { references: args.references.payload } : {}),
      ...(args.citationAnalysis
        ? { citationAnalysis: args.citationAnalysis.payload }
        : {}),
      ...(args.literatureScore ? { score: args.literatureScore.payload } : {}),
      ...(args.digest?.literatureMatchingMetadata
        ? { matchingMetadata: args.digest.literatureMatchingMetadata }
        : {}),
    });
  const result = requireCommittedMutation(execution);
  return { notes: result.notes, representative_image: representativeImage };
}

export async function resolveLiteratureMatchingMetadataForDigestNote(args) {
  const embedded = await resolveWorkbenchEmbeddedPayloadBlock({
    runtime: args.runtime,
    noteItem: args.noteItem || args.note,
    payloadType: LITERATURE_MATCHING_METADATA_PAYLOAD_TYPE,
  });
  if (!embedded || embedded.errors?.length) {
    return {
      metadata: null,
      diagnostics: [
        {
          code: "literature_matching_metadata_missing",
          severity: "warning",
          message: "digest note has no literature matching metadata payload",
        },
      ],
    };
  }
  return {
    metadata: embedded.payload,
    source: embedded.source || "embedded-image-attachment",
    payloadType: LITERATURE_MATCHING_METADATA_PAYLOAD_TYPE,
    diagnostics: [],
  };
}

export async function resolveLiteratureMatchingMetadataForParentItem(args) {
  const existingByKind = await collectGeneratedNotesByKind(
    args.parentItem,
    args.runtime,
  );
  const digestNote = existingByKind.get("digest")?.[0] || null;
  if (!digestNote) {
    return {
      metadata: null,
      diagnostics: [
        {
          code: "digest_note_missing",
          severity: "warning",
          message: "parent item has no generated digest note",
        },
      ],
    };
  }
  return resolveLiteratureMatchingMetadataForDigestNote({
    runtime: args.runtime,
    noteItem: digestNote,
  });
}

export async function exportGeneratedNoteCandidate(args) {
  const host = requireHostApi(args.runtime);
  const noteRef = portableItemRef(args.noteRef || args.noteItemRef || args.ref);
  const noteItem = await host.library.getNoteDetail(noteRef, {
    format: "html",
  });
  if (noteItem.kind === "ordinary") {
    return {
      kind: "ordinary",
      files: [
        {
          fileName: buildSafeExportFileName(noteItem.title, "html"),
          content: noteItem.content,
        },
      ],
    };
  }
  if (args.noteKind && args.noteKind !== noteItem.noteKind) {
    throw new Error("Managed note type changed before export");
  }
  const noteKind = noteItem.noteKind;
  const kind = noteKind;
  if (kind === "digest") {
    const representativeImageFile = await resolveRepresentativeImageExportFile({
      runtime: args.runtime,
      noteItem,
    });
    const markdown = representativeImageFile
      ? insertRepresentativeImageMarkdownExportBlock(
          noteItem.payload.markdown,
          {
            src: REPRESENTATIVE_IMAGE_EXPORT_FILE_NAME,
            alt: representativeImageFile.alt,
          },
        )
      : noteItem.payload.markdown;
    return {
      kind,
      payload: noteItem.payload,
      files: [
        {
          fileName: "digest.md",
          content: markdown,
        },
        ...(representativeImageFile ? [representativeImageFile] : []),
      ],
    };
  }
  if (kind === "references") {
    return {
      kind,
      payload: noteItem.payload,
      files: [
        {
          fileName: "references.json",
          content: JSON.stringify(noteItem.payload, null, 2),
        },
      ],
    };
  }
  if (kind === "citation-analysis") {
    const nativeArtifact = noteItem.payload;
    return {
      kind,
      payload: nativeArtifact,
      files: [
        {
          fileName: "citation_analysis.json",
          content: JSON.stringify(nativeArtifact, null, 2),
        },
        ...(typeof noteItem.derived?.markdown === "string"
          ? [{ fileName: "citation_analysis.md", content: noteItem.derived.markdown }]
          : []),
      ],
    };
  }
  if (kind === "literature-score") {
    return {
      kind,
      payload: noteItem.payload,
      files: [
        {
          fileName: "literature_score.json",
          content: JSON.stringify(noteItem.payload, null, 2),
        },
      ],
    };
  }
  if (kind === "custom" || kind === "conversation-note") {
    return exportMarkdownNote(noteItem);
  }
  throw new Error(`unsupported generated note kind for export: ${kind}`);
}

async function resolveRepresentativeImageExportFile(args) {
  const descriptor = args.noteItem.derived?.representativeImage;
  if (!descriptor) return null;
  let attachment;
  try {
    attachment = await resolveAttachmentDescriptor(
      descriptor.attachmentRef,
      args.runtime,
    );
  } catch (error) {
    if (error?.code === "not_found") return null;
    throw error;
  }
  if (attachment.file.state !== "available" || !attachment.file.path) {
    return null;
  }
  return {
    fileName: REPRESENTATIVE_IMAGE_EXPORT_FILE_NAME,
    sourcePath: attachment.file.path,
    alt: descriptor.alt,
  };
}

function buildSafeExportFileName(title, extension) {
  const safeTitle = sanitizeFileNameSegment(title);
  const normalizedExtension = String(extension || "")
    .trim()
    .replace(/^\.+/, "");
  return normalizedExtension
    ? `${safeTitle}.${normalizedExtension}`
    : safeTitle;
}

function exportMarkdownNote(noteItem) {
  return {
    kind: noteItem.noteKind,
    payload: noteItem.payload,
    files: [
      {
        fileName: buildSafeExportFileName(noteItem.payload.title, "md"),
        content: noteItem.payload.markdown,
      },
    ],
  };
}

/** Import selected Markdown files through the managed-note semantic owner. */
export async function importCustomNotes(args) {
  const { runtime, parentItem, customNotes } = args;
  const createdNotes = [];

  for (const customNote of customNotes) {
    const sourcePath = String(customNote.sourcePath || "").trim();
    const fileName = String(
      customNote.fileName ||
        getBaseName(sourcePath).replace(/\.md$/i, "") ||
        "untitled",
    ).trim();

    const markdownContent = await runtime.hostApi.file.readText(sourcePath);
    const noteItem = requireCommittedMutation(
      await requireHostApi(runtime).managedNotes.writeCustom({
        operationId: `custom-note:create:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`,
        target: { kind: "create", parentRef: portableItemRef(parentItem) },
        content: { title: fileName, markdown: markdownContent },
      }),
    ).note;
    createdNotes.push(noteItem);
  }

  return {
    notes: createdNotes,
  };
}

export async function createConversationNote(args) {
  return requireCommittedMutation(
    await requireHostApi(args.runtime).managedNotes.writeConversation({
      operationId: `conversation-note:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`,
      target: { kind: "create", parentRef: portableItemRef(args.parentItem) },
      content: {
        title: String(args.title || ""),
        markdown: String(args.markdown || ""),
      },
    }),
  ).note;
}
