import {
  decodeBase64Utf8,
  decodeHtmlEntities,
  readTagAttribute,
} from "./htmlCodec.mjs";
import {
  parseGeneratedNoteKind,
  parseReferencesPayload,
} from "./referencesNote.mjs";
import { escapeAttribute } from "./htmlCodec.mjs";
import { measureWorkflowTestSpan, requireHostApi } from "./runtime.mjs";
import { getBaseName, sanitizeFileNameSegment } from "./path.mjs";
import {
  attachWorkbenchPayloadToNote,
  resolveWorkbenchEmbeddedPayloadBlock,
} from "./embeddedPayloadAttachments.mjs";
import {
  buildConversationNoteContent,
  buildCustomNoteContent,
  buildLegalGeneratedMarkdownNoteContent,
  buildLegalGeneratedNoteContent,
  buildMarkdownBackedNoteContent,
  createConversationNote,
  parsePayloadBlock,
  renderPayloadBlock,
  renderMarkdownToHtml,
} from "./noteCodecs.mjs";
import {
  cleanupRepresentativeImageAttachments,
  extractRepresentativeImageExportDescriptor,
  insertRepresentativeImageMarkdownExportBlock,
  prepareRepresentativeImageForDigestNote,
  prepareResolvedRepresentativeImageForDigestNote,
  renderRepresentativeImageDiagnosticBlock,
  REPRESENTATIVE_IMAGE_EXPORT_FILE_NAME,
} from "./representativeImage.mjs";

export const LITERATURE_MATCHING_METADATA_PAYLOAD_TYPE =
  "literature-matching-metadata-json";

function renderSourceMetadataBlock(sourceAttachmentItemKey) {
  const itemKey = String(sourceAttachmentItemKey || "").trim();
  if (!itemKey) {
    return "";
  }
  return `<span data-zs-block="meta" data-zs-meta="source-attachment" data-zs-source_attachment_item_key="${escapeAttribute(itemKey)}" hidden="hidden"></span>`;
}

export function parseDigestPayload(noteContent, runtime) {
  return parsePayloadBlock(noteContent, "digest-markdown", runtime, {
    payloadFormat: "json",
  });
}

export function parseCitationAnalysisPayload(noteContent, runtime) {
  return parsePayloadBlock(noteContent, "citation-analysis-json", runtime, {
    payloadFormat: "json",
  });
}

async function resolveGeneratedPayloadForNote(args) {
  let legacyError = null;
  const embedded = await resolveWorkbenchEmbeddedPayloadBlock({
    runtime: args.runtime,
    noteItem: args.noteItem,
    payloadType: args.payloadType,
  });
  if (embedded && !embedded.errors?.length) {
    return {
      payload: embedded.payload,
      payloadTag: "",
      source: "embedded-image-attachment",
      sourceStorage: embedded.sourceStorage,
      payloadStorageVersion: embedded.payloadStorageVersion,
      anchorStatus: embedded.anchorStatus,
    };
  }
  try {
    return {
      ...args.parseLegacy(),
      source: "html-payload-block",
    };
  } catch (error) {
    legacyError = error;
    throw legacyError;
  }
}

function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value || null));
}

function withDigestSourcePayload(payload, sourceAttachmentItemKey) {
  const next = cloneSerializable(payload || {});
  if (typeof next.content === "string") {
    next.content = stripDigestWrapperHeading(next.content);
  }
  const key = String(sourceAttachmentItemKey || "").trim();
  if (key) {
    next.source_attachment_item_key = key;
    next.source_markdown_item_key ||= key;
  }
  return next;
}

function toNativeReferencesYear(value) {
  if (value == null) {
    return null;
  }
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  const text = String(value).trim();
  if (/^-?\d+$/.test(text)) {
    const parsed = Number.parseInt(text, 10);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }
  return null;
}

function toNativeReferencesArtifact(payload) {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.references)
      ? payload.references
      : [];
  return items.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return entry;
    }
    return {
      ...cloneSerializable(entry),
      year: toNativeReferencesYear(entry.year),
    };
  });
}

function toNativeCitationArtifact(payload) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    if (
      payload.citation_analysis &&
      typeof payload.citation_analysis === "object"
    ) {
      return cloneSerializable(payload.citation_analysis);
    }
  }
  return cloneSerializable(payload);
}

export function collectGeneratedNotesByKind(parentItem, runtime) {
  const byKind = new Map([
    ["digest", []],
    ["references", []],
    ["citation-analysis", []],
  ]);
  const noteIds = parentItem.getNotes?.() || [];
  for (const noteRef of noteIds) {
    let noteItem = null;
    try {
      noteItem = runtime.helpers.resolveItemRef(noteRef);
    } catch {
      noteItem = null;
    }
    if (!noteItem) {
      continue;
    }
    const kind = parseGeneratedNoteKind(noteItem.getNote?.() || "");
    if (!byKind.has(kind)) {
      continue;
    }
    byKind.get(kind).push(noteItem);
  }
  return byKind;
}

async function upsertUniqueGeneratedNote(args) {
  const existingNotes = args.existingNotes || [];
  const noteKind = String(args.noteKind || "").trim() || "unknown";
  if (existingNotes.length === 0) {
    return measureWorkflowTestSpan(
      "executeApplyResult:literatureDigest:addNote",
      {
        noteKind,
        existingCount: 0,
      },
      () =>
        requireHostApi(args.runtime).parents.addNote(args.parentItem, {
          content: args.content,
        }),
    );
  }

  const primary = existingNotes[0];
  await measureWorkflowTestSpan(
    "executeApplyResult:literatureDigest:updateNote",
    {
      noteKind,
      existingCount: existingNotes.length,
    },
    () =>
      requireHostApi(args.runtime).notes.update(primary, {
        content: args.content,
      }),
  );
  for (let index = 1; index < existingNotes.length; index += 1) {
    await measureWorkflowTestSpan(
      "executeApplyResult:literatureDigest:removeDuplicateNote",
      {
        noteKind,
        duplicateIndex: index,
      },
      () => requireHostApi(args.runtime).notes.remove(existingNotes[index]),
    );
  }
  return primary;
}

async function removeDuplicateGeneratedNotes(args) {
  const existingNotes = args.existingNotes || [];
  const noteKind = String(args.noteKind || "").trim() || "unknown";
  for (let index = 1; index < existingNotes.length; index += 1) {
    await measureWorkflowTestSpan(
      "executeApplyResult:literatureDigest:removeDuplicateNote",
      {
        noteKind,
        duplicateIndex: index,
      },
      () => requireHostApi(args.runtime).notes.remove(existingNotes[index]),
    );
  }
}

function stripHtmlTags(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function removeLeadingRepresentativeImageHtml(noteContent) {
  return String(noteContent || "")
    .replace(
      /<div\s+data-zs-block=(["'])representative-image\1[\s\S]*?<\/div>\s*/i,
      "",
    )
    .replace(
      /(<h1\b[^>]*>\s*(?:Digest|Literature Digest)\s*<\/h1>\s*)?<p\b[^>]*>\s*<img\b[^>]*\bdata-attachment-key\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)[^>]*>\s*<\/p>\s*(?:<p\b[^>]*>(?!\s*<(?:h[1-6]|ul|ol|table)\b)[\s\S]*?<\/p>\s*)?/i,
      "$1",
    );
}

function htmlBlocksToMarkdown(noteContent) {
  let html = removeLeadingRepresentativeImageHtml(noteContent)
    .replace(/<span\b[^>]*data-zs-block=(["'])payload\1[^>]*>\s*<\/span>/gi, "")
    .replace(
      /<span\b[^>]*data-zs-meta=(["'])source-attachment\1[^>]*>\s*<\/span>/gi,
      "",
    )
    .replace(/<br\s*\/?>/gi, "\n");

  html = html.replace(
    /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_m, level, text) => {
      return `\n${"#".repeat(Number(level))} ${stripHtmlTags(text)}\n\n`;
    },
  );
  html = html.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_m, text) => {
    return `\n- ${stripHtmlTags(text)}`;
  });
  html = html.replace(/<\/(?:ul|ol)>/gi, "\n\n");
  html = html.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_m, text) => {
    if (/<img\b/i.test(text)) {
      return "\n";
    }
    return `\n${stripHtmlTags(text)}\n\n`;
  });
  html = decodeHtmlEntities(html.replace(/<[^>]+>/g, ""));
  return html
    .split(/\n/)
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripDigestWrapperHeading(markdown) {
  let text = String(markdown || "")
    .replace(/\r\n?/g, "\n")
    .trim();
  while (/^#\s+(?:Digest|Literature Digest)\s*(?:\n|$)/i.test(text)) {
    text = text
      .replace(/^#\s+(?:Digest|Literature Digest)\s*(?:\n+|$)/i, "")
      .trimStart();
  }
  return text.trimEnd();
}

export function recoverDigestMarkdownPayloadFromNoteHtml(noteContent) {
  const markdown = stripDigestWrapperHeading(htmlBlocksToMarkdown(noteContent));
  if (!markdown) {
    return null;
  }
  return {
    version: 1,
    entry: "artifacts/digest.md",
    format: "markdown",
    content: markdown,
    recovery: {
      source: "note_html",
    },
  };
}

function buildDigestNoteContent(args) {
  const representativeImage = args.representativeImage || null;
  const afterTitleBlocks = [];
  if (representativeImage?.htmlBlock) {
    afterTitleBlocks.push(representativeImage.htmlBlock);
  }
  return buildLegalGeneratedMarkdownNoteContent({
    title: "Digest",
    markdown: stripDigestWrapperHeading(args.payload.content),
    afterTitleBlocks,
  });
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

async function ensureDigestNoteForRepresentativeImage(args) {
  const existingNotes = args.existingNotes || [];
  const noteKind = "digest";
  if (existingNotes.length > 0) {
    return existingNotes[0];
  }
  return measureWorkflowTestSpan(
    "executeApplyResult:literatureDigest:addNote",
    {
      noteKind,
      existingCount: 0,
    },
    () =>
      requireHostApi(args.runtime).parents.addNote(args.parentItem, {
        content: args.initialContent,
      }),
  );
}

async function upsertDigestGeneratedNote(args) {
  const existingNotes = args.existingNotes || [];
  const payload = withDigestSourcePayload(
    args.payload,
    args.sourceAttachmentItemKey,
  );
  const baseContent = buildDigestNoteContent({
    runtime: args.runtime,
    payload,
    sourceAttachmentItemKey: args.sourceAttachmentItemKey,
  });

  if (!args.representativeImage) {
    const note = await upsertUniqueGeneratedNote({
      runtime: args.runtime,
      parentItem: args.parentItem,
      content: baseContent,
      existingNotes,
      noteKind: "digest",
    });
    await attachWorkbenchPayloadToNote({
      runtime: args.runtime,
      note,
      noteKind: "digest",
      payloadType: "digest-markdown",
      payload,
    });
    return {
      note,
      representativeImage: {
        status: "none",
      },
    };
  }

  const previousNoteContent =
    existingNotes.length > 0
      ? String(existingNotes[0].getNote?.() || "")
      : baseContent;
  const digestNote = await ensureDigestNoteForRepresentativeImage({
    runtime: args.runtime,
    parentItem: args.parentItem,
    existingNotes,
    initialContent: baseContent,
  });
  const representativeImage = await prepareDigestRepresentativeImage({
    runtime: args.runtime,
    digestNote,
    request: args.representativeImage,
    previousNoteContent,
  });
  const finalContent = buildDigestNoteContent({
    runtime: args.runtime,
    payload,
    sourceAttachmentItemKey: args.sourceAttachmentItemKey,
    representativeImage,
  });

  await measureWorkflowTestSpan(
    "executeApplyResult:literatureDigest:updateNote",
    {
      noteKind: "digest",
      existingCount: existingNotes.length,
    },
    () =>
      requireHostApi(args.runtime).notes.update(digestNote, {
        content: finalContent,
      }),
  );
  await attachWorkbenchPayloadToNote({
    runtime: args.runtime,
    note: digestNote,
    noteKind: "digest",
    payloadType: "digest-markdown",
    payload,
  });
  await removeDuplicateGeneratedNotes({
    runtime: args.runtime,
    existingNotes,
    noteKind: "digest",
  });
  if (representativeImage?.status === "embedded") {
    await cleanupRepresentativeImageAttachments({
      runtime: args.runtime,
      digestNote,
      keys: representativeImage.previousAttachmentKeys || [],
    });
  }

  return {
    note: digestNote,
    representativeImage,
  };
}

export async function resolveDigestMarkdownPayloadForNote(args) {
  const noteItem = args.noteItem;
  const noteContent = String(noteItem?.getNote?.() || "");
  try {
    const parsed = await resolveGeneratedPayloadForNote({
      runtime: args.runtime,
      noteItem,
      payloadType: "digest-markdown",
      parseLegacy: () => parseDigestPayload(noteContent, args.runtime),
    });
    return parsed.payload;
  } catch (error) {
    const recovered = recoverDigestMarkdownPayloadFromNoteHtml(noteContent);
    if (recovered) {
      return recovered;
    }
    throw new Error(
      `digest-markdown payload not found in legacy HTML block, embedded payload attachment, or recoverable note HTML: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export async function updateDigestNoteRepresentativeImage(args) {
  const digestNote = args.digestNote;
  const payload = withDigestSourcePayload(
    args.payload,
    args.sourceAttachmentItemKey,
  );
  const previousNoteContent = String(digestNote?.getNote?.() || "");
  const representativeImage = await prepareDigestRepresentativeImage({
    runtime: args.runtime,
    digestNote,
    request: args.representativeImage,
    previousNoteContent,
  });
  const finalContent = buildDigestNoteContent({
    runtime: args.runtime,
    payload,
    sourceAttachmentItemKey: args.sourceAttachmentItemKey,
    representativeImage,
  });

  await measureWorkflowTestSpan(
    "executeApplyResult:addDigestRepresentativeImage:updateNote",
    {
      noteKind: "digest",
    },
    () =>
      requireHostApi(args.runtime).notes.update(digestNote, {
        content: finalContent,
      }),
  );
  await attachWorkbenchPayloadToNote({
    runtime: args.runtime,
    note: digestNote,
    noteKind: "digest",
    payloadType: "digest-markdown",
    payload,
  });
  if (representativeImage?.status === "embedded") {
    await cleanupRepresentativeImageAttachments({
      runtime: args.runtime,
      digestNote,
      keys: representativeImage.previousAttachmentKeys || [],
    });
  }

  return {
    note: digestNote,
    representativeImage,
  };
}

export async function upsertLiteratureDigestGeneratedNotes(args) {
  return measureWorkflowTestSpan(
    "executeApplyResult:literatureDigest:upsertGeneratedNotes",
    {
      hasDigest: !!args.digest,
      hasReferences: !!args.references,
      hasCitationAnalysis: !!args.citationAnalysis,
    },
    async () => {
      const existingByKind = collectGeneratedNotesByKind(
        args.parentItem,
        args.runtime,
      );
      const writtenNotes = [];
      let representativeImage = {
        status: "none",
      };

      if (args.digest) {
        const digestApplied = await upsertDigestGeneratedNote({
          runtime: args.runtime,
          parentItem: args.parentItem,
          payload: args.digest.payload,
          sourceAttachmentItemKey: args.digest.sourceAttachmentItemKey,
          representativeImage: args.digest.representativeImage,
          existingNotes: existingByKind.get("digest"),
        });
        if (args.digest.literatureMatchingMetadata) {
          await attachWorkbenchPayloadToNote({
            runtime: args.runtime,
            note: digestApplied.note,
            noteKind: "digest",
            payloadType: LITERATURE_MATCHING_METADATA_PAYLOAD_TYPE,
            payload: args.digest.literatureMatchingMetadata,
          });
        }
        representativeImage = digestApplied.representativeImage;
        writtenNotes.push(digestApplied.note);
      }

      if (args.references) {
        const referencesNoteContent = buildLegalGeneratedNoteContent({
          title: "References",
          bodyHtml: args.runtime.helpers
            .renderReferencesTable(args.references.payload.references || [])
            .replace(/\sdata-zs-view=(["'])references-table\1/i, ""),
        });
        const referencesNote = await upsertUniqueGeneratedNote({
          runtime: args.runtime,
          parentItem: args.parentItem,
          content: referencesNoteContent,
          existingNotes: existingByKind.get("references"),
          noteKind: "references",
        });
        await attachWorkbenchPayloadToNote({
          runtime: args.runtime,
          note: referencesNote,
          noteKind: "references",
          payloadType: "references-json",
          payload: args.references.payload,
        });
        writtenNotes.push(referencesNote);
      }

      if (args.citationAnalysis) {
        const reportMarkdown = String(
          args.citationAnalysis.payload?.citation_analysis?.report_md || "",
        );
        const citationNoteContent = buildLegalGeneratedMarkdownNoteContent({
          title: "Citation Analysis",
          markdown: reportMarkdown,
        });
        const citationNote = await upsertUniqueGeneratedNote({
          runtime: args.runtime,
          parentItem: args.parentItem,
          content: citationNoteContent,
          existingNotes: existingByKind.get("citation-analysis"),
          noteKind: "citation-analysis",
        });
        await attachWorkbenchPayloadToNote({
          runtime: args.runtime,
          note: citationNote,
          noteKind: "citation-analysis",
          payloadType: "citation-analysis-json",
          payload: args.citationAnalysis.payload,
        });
        writtenNotes.push(citationNote);
      }

      return {
        notes: writtenNotes,
        representative_image: representativeImage,
      };
    },
  );
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
  const existingByKind = collectGeneratedNotesByKind(
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
  const noteItem = args.runtime.helpers.resolveItemRef(args.noteItemID);
  const noteContent = String(noteItem.getNote?.() || "");
  const kind = String(args.kind || "").trim();
  if (kind === "digest") {
    const parsed = await resolveGeneratedPayloadForNote({
      runtime: args.runtime,
      noteItem,
      payloadType: "digest-markdown",
      parseLegacy: () => parseDigestPayload(noteContent, args.runtime),
    });
    const representativeImageFile = await resolveRepresentativeImageExportFile({
      runtime: args.runtime,
      noteItem,
      noteContent,
    });
    const markdown = representativeImageFile
      ? insertRepresentativeImageMarkdownExportBlock(parsed.payload?.content, {
          src: REPRESENTATIVE_IMAGE_EXPORT_FILE_NAME,
          alt: representativeImageFile.alt,
        })
      : String(parsed.payload?.content || "");
    return {
      kind,
      payload: parsed.payload,
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
    const parsed = await resolveGeneratedPayloadForNote({
      runtime: args.runtime,
      noteItem,
      payloadType: "references-json",
      parseLegacy: () => parseReferencesPayload(noteContent, args.runtime),
    });
    const nativeArtifact = toNativeReferencesArtifact(parsed.payload);
    return {
      kind,
      payload: nativeArtifact,
      files: [
        {
          fileName: "references.json",
          content: JSON.stringify(nativeArtifact, null, 2),
        },
      ],
    };
  }
  if (kind === "citation-analysis") {
    const parsed = await resolveGeneratedPayloadForNote({
      runtime: args.runtime,
      noteItem,
      payloadType: "citation-analysis-json",
      parseLegacy: () =>
        parseCitationAnalysisPayload(noteContent, args.runtime),
    });
    const nativeArtifact = toNativeCitationArtifact(parsed.payload);
    return {
      kind,
      payload: nativeArtifact,
      files: [
        {
          fileName: "citation_analysis.json",
          content: JSON.stringify(nativeArtifact, null, 2),
        },
        {
          fileName: "citation_analysis.md",
          content: String(nativeArtifact?.report_md || ""),
        },
      ],
    };
  }
  if (kind === "custom") {
    return exportCustomNote({ noteItem, noteContent, runtime: args.runtime });
  }
  if (kind === "conversation-note") {
    return await exportConversationNote({
      noteItem,
      noteContent,
      runtime: args.runtime,
    });
  }
  throw new Error(`unsupported generated note kind for export: ${kind}`);
}

async function resolveRepresentativeImageExportFile(args) {
  const descriptor = extractRepresentativeImageExportDescriptor(
    args.noteContent,
  );
  if (!descriptor?.attachmentKey) {
    return null;
  }
  try {
    const hostApi = requireHostApi(args.runtime);
    const attachment = hostApi.items?.getByLibraryAndKey?.(
      args.noteItem.libraryID,
      descriptor.attachmentKey,
    );
    if (!attachment || attachment.parentID !== args.noteItem.id) {
      return null;
    }
    const sourcePath = String(
      (await attachment.getFilePathAsync?.()) || "",
    ).trim();
    if (!sourcePath) {
      return null;
    }
    if (
      typeof hostApi.file?.exists === "function" &&
      !(await hostApi.file.exists(sourcePath))
    ) {
      return null;
    }
    return {
      fileName: REPRESENTATIVE_IMAGE_EXPORT_FILE_NAME,
      sourcePath,
      optional: true,
      alt: descriptor.alt,
    };
  } catch {
    return null;
  }
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

function deriveNoteTitleFromContent(noteContent) {
  const headingMatch = String(noteContent || "").match(
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
  );
  if (!headingMatch) {
    return "";
  }
  return decodeHtmlEntities(
    String(headingMatch[1] || "")
      .replace(/<[^>]+>/g, "")
      .trim(),
  );
}

function resolveExportNoteTitle(noteItem, noteContent) {
  const directTitle = String(noteItem.getField?.("title") || "").trim();
  if (directTitle) {
    return directTitle;
  }
  const derivedTitle = deriveNoteTitleFromContent(noteContent);
  if (derivedTitle) {
    return derivedTitle;
  }
  return "untitled";
}

/**
 * Export a custom note.
 * - If the note contains a base64-encoded payload with markdown content
 *   (data-zs-payload ends with "-markdown", e.g. "custom-markdown" or "conversation-note-markdown"),
 *   decode it and write to a .md file.
 * - Otherwise, write the note content as .html.
 */
export function exportCustomNote(args) {
  const { noteItem, noteContent, runtime } = args;
  const noteTitle = resolveExportNoteTitle(noteItem, noteContent);

  // Try to find any markdown payload block (matches *-markdown pattern)
  const payloadTagMatch = noteContent.match(
    /<span[^>]*data-zs-payload=(["'])([a-zA-Z0-9-]+-markdown)\1[^>]*>/i,
  );

  if (payloadTagMatch) {
    // Decode base64 payload
    const payloadTag = payloadTagMatch[0];
    const encodedValue = decodeHtmlEntities(
      readTagAttribute(payloadTag, "data-zs-value"),
    );
    const markdownContent = decodeBase64Utf8(encodedValue, runtime);
    return {
      kind: "custom",
      payload: { markdown: markdownContent },
      files: [
        {
          fileName: buildSafeExportFileName(noteTitle, "md"),
          content: markdownContent,
        },
      ],
    };
  }

  // No payload found - export as HTML
  return {
    kind: "custom",
    payload: { html: noteContent },
    files: [
      {
        fileName: buildSafeExportFileName(noteTitle, "html"),
        content: noteContent,
      },
    ],
  };
}

export async function exportConversationNote(args) {
  const noteTitle = resolveExportNoteTitle(args.noteItem, args.noteContent);
  let payload = null;
  const embedded = await resolveWorkbenchEmbeddedPayloadBlock({
    runtime: args.runtime,
    noteItem: args.noteItem,
    payloadType: "conversation-note-markdown",
  });
  if (embedded && !embedded.errors?.length) {
    payload = embedded.payload;
  } else {
    payload = parsePayloadBlock(
      args.noteContent,
      "conversation-note-markdown",
      args.runtime,
      { payloadFormat: "json" },
    ).payload;
  }
  return {
    kind: "conversation-note",
    payload,
    files: [
      {
        fileName: buildSafeExportFileName(noteTitle, "md"),
        content: String(payload?.content || ""),
      },
    ],
  };
}

/**
 * Import custom notes from markdown files.
 * For each markdown file:
 * - Read the markdown content
 * - Render to HTML
 * - Create a note with data-zs-note-kind="custom" and base64-encoded payload
 * - Note title is the file name (without extension)
 */
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
    const noteContent = buildCustomNoteContent({
      title: fileName,
      markdown: markdownContent,
      runtime,
    });
    const noteItem = await requireHostApi(runtime).parents.addNote(parentItem, {
      content: noteContent,
      title: fileName,
    });
    createdNotes.push(noteItem);
  }

  return {
    notes: createdNotes,
  };
}

export {
  buildConversationNoteContent,
  buildCustomNoteContent,
  createConversationNote,
  renderMarkdownToHtml,
};
