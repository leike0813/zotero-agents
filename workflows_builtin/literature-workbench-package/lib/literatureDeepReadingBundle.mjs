import { parsePayloadBlock, parseWorkbenchNoteKind } from "./noteCodecs.mjs";
import { resolveWorkbenchEmbeddedPayloadBlock } from "./embeddedPayloadAttachments.mjs";
import { getBaseName, joinPath, sanitizeFileNameSegment } from "./path.mjs";
import { asUint8Array, createStoreZipBytes } from "./zipStore.mjs";

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizePathForCompare(targetPath) {
  return String(targetPath || "")
    .trim()
    .replace(/^file:\/\/+/, "")
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/")
    .toLowerCase();
}

function getDirName(targetPath) {
  const normalized = String(targetPath || "").replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  if (index < 0) {
    return "";
  }
  return normalized.slice(0, index);
}

function isRemoteOrInlineImage(src) {
  return /^(https?:|data:|blob:|about:|zotero:)/i.test(normalizeString(src));
}

function isAbsolutePath(src) {
  return /^[A-Za-z]:[\\/]/.test(src) || /^[\\/]/.test(src);
}

function normalizeRelativePath(baseDir, relativePath) {
  const raw = String(relativePath || "").replaceAll("\\", "/");
  const base = String(baseDir || "").replaceAll("\\", "/");
  const parts = [];
  for (const part of raw.split("/")) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      if (parts.length === 0) {
        return "";
      }
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return joinPath(base, parts.join("/"));
}

function isWithinDirectory(baseDir, targetPath) {
  const base = normalizePathForCompare(baseDir);
  const target = normalizePathForCompare(targetPath);
  return (
    !!base && !!target && (target === base || target.startsWith(`${base}/`))
  );
}

async function sha256Hex(bytes) {
  const normalized = asUint8Array(bytes);
  const subtle = globalThis?.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== "function") {
    return "";
  }
  try {
    const digest = await subtle.digest("SHA-256", normalized);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "";
  }
}

function extractMarkdownImageReferences(markdown) {
  const refs = [];
  const text = String(markdown || "");
  const markdownPattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  let match;
  while ((match = markdownPattern.exec(text))) {
    refs.push({
      kind: "markdown",
      src: match[2],
      start: match.index + match[0].indexOf(match[2]),
      end: match.index + match[0].indexOf(match[2]) + match[2].length,
    });
  }

  const htmlPattern = /<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi;
  while ((match = htmlPattern.exec(text))) {
    refs.push({
      kind: "html",
      src: match[2],
      start: match.index + match[0].indexOf(match[2]),
      end: match.index + match[0].indexOf(match[2]) + match[2].length,
    });
  }

  return refs.sort((a, b) => a.start - b.start);
}

async function rewriteMarkdownImages({
  markdown,
  sourcePath,
  hostFile,
  entries,
  diagnostics,
}) {
  const sourceDir = getDirName(sourcePath);
  const refs = extractMarkdownImageReferences(markdown);
  const replacements = [];
  const imageManifest = [];
  let copiedCount = 0;

  for (const ref of refs) {
    const rawSrc = normalizeString(ref.src);
    if (!rawSrc) {
      continue;
    }
    if (isRemoteOrInlineImage(rawSrc)) {
      diagnostics.push({
        level: "info",
        code: "image_not_bundled",
        message: `Image reference is remote or inline: ${rawSrc}`,
        source: rawSrc,
      });
      continue;
    }
    if (isAbsolutePath(rawSrc)) {
      diagnostics.push({
        level: "warning",
        code: "image_outside_source_dir",
        message: `Absolute image path was not bundled: ${rawSrc}`,
        source: rawSrc,
      });
      continue;
    }

    const resolvedPath = normalizeRelativePath(
      sourceDir,
      decodeURIComponent(rawSrc),
    );
    if (!resolvedPath || !isWithinDirectory(sourceDir, resolvedPath)) {
      diagnostics.push({
        level: "warning",
        code: "image_outside_source_dir",
        message: `Image path escapes the source directory: ${rawSrc}`,
        source: rawSrc,
      });
      continue;
    }

    try {
      if (!(await hostFile.exists(resolvedPath))) {
        diagnostics.push({
          level: "warning",
          code: "image_missing",
          message: `Markdown image was not found: ${rawSrc}`,
          source: rawSrc,
        });
        continue;
      }
      const bytes = asUint8Array(await hostFile.readBytes(resolvedPath));
      if (!bytes.length) {
        diagnostics.push({
          level: "warning",
          code: "image_empty",
          message: `Markdown image was copied as an empty file: ${rawSrc}`,
          source: rawSrc,
          source_path: resolvedPath,
        });
        imageManifest.push({
          id: `img-${String(copiedCount + 1).padStart(3, "0")}`,
          source: rawSrc,
          source_path: resolvedPath,
          bundle_path: "",
          status: "corrupt",
          bytes: 0,
          sha256: "",
          reason: "source image byte content is empty",
        });
        continue;
      }
      copiedCount += 1;
      const imageName = `${String(copiedCount).padStart(3, "0")}-${sanitizeFileNameSegment(getBaseName(resolvedPath))}`;
      const bundlePath = `images/${imageName}`;
      const hash = await sha256Hex(bytes);
      entries.push({
        name: bundlePath,
        bytes,
      });
      replacements.push({
        start: ref.start,
        end: ref.end,
        value: bundlePath,
      });
      imageManifest.push({
        id: `img-${String(copiedCount).padStart(3, "0")}`,
        source: rawSrc,
        source_path: resolvedPath,
        bundle_path: bundlePath,
        status: "available",
        bytes: bytes.length,
        sha256: hash ? `sha256:${hash}` : "",
      });
    } catch (error) {
      diagnostics.push({
        level: "warning",
        code: "image_copy_failed",
        message: String(error?.message || error || "failed to copy image"),
        source: rawSrc,
      });
    }
  }

  let rewritten = String(markdown || "");
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    rewritten =
      rewritten.slice(0, replacement.start) +
      replacement.value +
      rewritten.slice(replacement.end);
  }

  return {
    markdown: rewritten,
    imageManifest,
  };
}

function getAttachmentFileName(entry, runtime) {
  const viaHelper = runtime?.helpers?.getAttachmentFileName?.(entry);
  return (
    normalizeString(viaHelper) ||
    normalizeString(entry?.item?.getField?.("title")) ||
    getBaseName(normalizeString(entry?.filePath || entry?.path || ""))
  );
}

async function resolveAttachmentFilePath(entry, runtime) {
  const viaHelper = runtime?.helpers?.getAttachmentFilePath?.(entry);
  const direct = entry?.filePath || entry?.path || entry?.item?.filePath;
  const fromItem = await entry?.item?.getFilePathAsync?.();
  const resolved = normalizeString(viaHelper || direct || fromItem);
  if (!resolved) {
    throw new Error(
      "literature-deep-reading cannot resolve source attachment path",
    );
  }
  return resolved;
}

function readParentField(parentItem, fieldName) {
  return normalizeString(parentItem?.getField?.(fieldName));
}

function normalizePaperRef(parentItem) {
  const itemKey = normalizeString(parentItem?.key);
  if (!itemKey) {
    return "";
  }
  return `1:${itemKey}`;
}

function normalizeArtifactKind(kind) {
  const text = normalizeString(kind).replaceAll("_", "-").toLowerCase();
  if (text === "citation-analysis") {
    return "citation-analysis";
  }
  if (text === "digest" || text === "references") {
    return text;
  }
  return "";
}

function sidecarManifestKey(kind) {
  return kind === "citation-analysis" ? "citation_analysis" : kind;
}

function sidecarBundlePath(kind, payloadType = "") {
  const normalizedKind = normalizeArtifactKind(kind);
  const normalizedPayloadType = normalizeString(payloadType).toLowerCase();
  if (normalizedKind === "digest") {
    return "artifacts/digest.md";
  }
  if (normalizedKind === "references") {
    return "artifacts/references.json";
  }
  if (normalizedKind === "citation-analysis") {
    return normalizedPayloadType.includes("markdown") ||
      normalizedPayloadType.endsWith("-md")
      ? "artifacts/citation-analysis.md"
      : "artifacts/citation_analysis.json";
  }
  return "";
}

function payloadTextFromHostArtifact(artifact, kind) {
  const payloadType = normalizeString(
    artifact?.payload_type || artifact?.payloadType,
  );
  const normalizedKind = normalizeArtifactKind(kind);
  if (normalizedKind === "digest") {
    return normalizeString(
      artifact?.markdown || artifact?.decoded_text || artifact?.decodedText,
    );
  }
  if (normalizedKind === "references") {
    const payload = artifact?.payload;
    if (payload && typeof payload === "object") {
      return JSON.stringify(payload, null, 2);
    }
    return normalizeString(artifact?.decoded_text || artifact?.decodedText);
  }
  if (normalizedKind === "citation-analysis") {
    const markdown = normalizeString(
      artifact?.markdown || artifact?.decoded_text || artifact?.decodedText,
    );
    if (markdown) {
      return markdown;
    }
    const payload = artifact?.payload;
    if (payload && typeof payload === "object") {
      const reportMarkdown = normalizeString(
        payload.report_md || payload.reportMarkdown || payload.markdown,
      );
      return reportMarkdown || JSON.stringify(payload, null, 2);
    }
    return payloadType.includes("json")
      ? normalizeString(artifact?.decoded_text || artifact?.decodedText)
      : "";
  }
  return "";
}

async function addArtifactEntry({
  kind,
  payloadType,
  content,
  source,
  sourceNote,
  entries,
  artifactEntries,
  artifactManifest,
}) {
  const normalizedKind = normalizeArtifactKind(kind);
  const destination = sidecarBundlePath(normalizedKind, payloadType);
  if (!normalizedKind || !destination) {
    return false;
  }
  const text = String(content || "");
  const bytes = new TextEncoder().encode(text);
  if (!bytes.length) {
    throw new Error(
      `${payloadType || normalizedKind} payload decoded to empty content`,
    );
  }
  entries.push({ name: destination, text });
  const hash = await sha256Hex(bytes);
  const row = {
    type: normalizedKind,
    status: "available",
    bundle_path: destination,
    payload_type: payloadType || "",
    bytes: bytes.length,
    sha256: hash ? `sha256:${hash}` : "",
    source,
  };
  if (sourceNote) {
    row.source_note_key = normalizeString(sourceNote.key);
    row.source_note_id = sourceNote.id || null;
  }
  artifactEntries[normalizedKind] = row;
  artifactManifest.push(row);
  return true;
}

async function resolveNotePayload(noteItem, noteContent, kind, runtime) {
  const normalizedKind =
    kind === "citation_analysis" ? "citation-analysis" : kind;
  if (normalizedKind === "digest") {
    const embedded = await resolveWorkbenchEmbeddedPayloadBlock({
      runtime,
      noteItem,
      payloadType: "digest-markdown",
    });
    return {
      name: "artifacts/digest.md",
      payloadType: "digest-markdown",
      payloadFormat: "text",
      payload:
        embedded?.markdown ??
        embedded?.decodedText ??
        parsePayloadBlock(noteContent, "digest-markdown", runtime, {
          payloadFormat: "text",
        }).payload,
    };
  }
  if (normalizedKind === "references") {
    const embedded = await resolveWorkbenchEmbeddedPayloadBlock({
      runtime,
      noteItem,
      payloadType: "references-json",
    });
    return {
      name: "artifacts/references.json",
      payloadType: "references-json",
      payloadFormat: "json",
      payload:
        embedded?.payload ??
        parsePayloadBlock(noteContent, "references-json", runtime).payload,
    };
  }
  if (normalizedKind === "citation-analysis") {
    const embeddedJson = await resolveWorkbenchEmbeddedPayloadBlock({
      runtime,
      noteItem,
      payloadType: "citation-analysis-json",
    });
    const embeddedMarkdown = await resolveWorkbenchEmbeddedPayloadBlock({
      runtime,
      noteItem,
      payloadType: "citation-analysis-markdown",
    });
    if (embeddedMarkdown?.decodedText || embeddedMarkdown?.markdown) {
      return {
        name: "artifacts/citation-analysis.md",
        payloadType: "citation-analysis-markdown",
        payloadFormat: "text",
        payload: embeddedMarkdown.markdown || embeddedMarkdown.decodedText,
      };
    }
    return {
      name: "artifacts/citation_analysis.json",
      payloadType: "citation-analysis-json",
      payloadFormat: "json",
      payload:
        embeddedJson?.payload ??
        parsePayloadBlock(noteContent, "citation-analysis-json", runtime)
          .payload,
    };
  }
  return null;
}

async function collectSidecarArtifacts({
  parentItem,
  runtime,
  entries,
  diagnostics,
}) {
  const artifactEntries = {};
  const artifactManifest = [];
  const kinds = new Set(["digest", "references", "citation-analysis"]);
  const attemptedByKind = {
    digest: 0,
    references: 0,
    "citation-analysis": 0,
  };
  const noteIds = parentItem?.getNotes?.() || [];
  const paperRef = normalizePaperRef(parentItem);

  if (
    paperRef &&
    runtime?.hostApi?.synthesis &&
    typeof runtime.hostApi.synthesis.readPaperArtifacts === "function"
  ) {
    try {
      const result = await runtime.hostApi.synthesis.readPaperArtifacts({
        paper_refs: [paperRef],
        artifact_types: ["digest", "references", "citation_analysis"],
      });
      const artifacts = Array.isArray(result?.artifacts)
        ? result.artifacts
        : [];
      for (const artifact of artifacts) {
        const kind = normalizeArtifactKind(
          artifact?.artifact_type || artifact?.artifactType,
        );
        if (!kinds.has(kind) || artifactEntries[kind]) {
          continue;
        }
        if (normalizeString(artifact?.status || "available") !== "available") {
          diagnostics.push({
            level: "info",
            code: "sidecar_artifact_host_unavailable",
            message:
              normalizeString(
                artifact?.missing_reason || artifact?.missingReason,
              ) || `${kind} artifact is not available from Host.`,
            artifact_type: kind,
            status: normalizeString(artifact?.status),
          });
          continue;
        }
        try {
          const payloadType = normalizeString(
            artifact?.payload_type || artifact?.payloadType,
          );
          const content = payloadTextFromHostArtifact(artifact, kind);
          await addArtifactEntry({
            kind,
            payloadType,
            content,
            source: "host_synthesis_read_paper_artifacts",
            entries,
            artifactEntries,
            artifactManifest,
          });
        } catch (error) {
          diagnostics.push({
            level: "warning",
            code: "sidecar_host_decode_failed",
            message: String(
              error?.message || error || "Host sidecar artifact decode failed",
            ),
            artifact_type: kind,
          });
        }
      }
    } catch (error) {
      diagnostics.push({
        level: "warning",
        code: "sidecar_host_read_failed",
        message: String(
          error?.message || error || "Host sidecar artifact read failed",
        ),
        paper_ref: paperRef,
      });
    }
  } else if (paperRef) {
    diagnostics.push({
      level: "info",
      code: "sidecar_host_api_unavailable",
      message:
        "Host synthesis.readPaperArtifacts is unavailable; falling back to note payload scanning.",
      paper_ref: paperRef,
    });
  }

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
    const noteContent = noteItem.getNote?.() || "";
    const kind = parseWorkbenchNoteKind(noteContent);
    if (!kinds.has(kind) || artifactEntries[kind]) {
      continue;
    }
    attemptedByKind[kind] += 1;
    try {
      const decoded = await resolveNotePayload(
        noteItem,
        noteContent,
        kind,
        runtime,
      );
      if (!decoded) {
        continue;
      }
      const content =
        decoded.payloadFormat === "text"
          ? String(decoded.payload || "")
          : JSON.stringify(decoded.payload, null, 2);
      await addArtifactEntry({
        kind,
        payloadType: decoded.payloadType,
        content,
        source: "note_payload_fallback",
        sourceNote: noteItem,
        entries,
        artifactEntries,
        artifactManifest,
      });
    } catch (error) {
      diagnostics.push({
        level: "warning",
        code: "sidecar_decode_failed",
        message: String(
          error?.message || error || "sidecar artifact decode failed",
        ),
        artifact_type: kind,
      });
    }
  }

  for (const kind of kinds) {
    if (!artifactEntries[kind]) {
      const attempted = attemptedByKind[kind] || 0;
      artifactEntries[kind] = {
        type: kind,
        status: "missing",
        attempted_note_count: attempted,
      };
      diagnostics.push({
        level: attempted ? "warning" : "info",
        code: attempted
          ? "sidecar_artifact_decode_unavailable"
          : "sidecar_artifact_missing",
        message: attempted
          ? `${attempted} ${kind} sidecar note(s) were found but no payload could be decoded.`
          : `No ${kind} sidecar artifact was found for the selected parent item.`,
        artifact_type: kind,
        attempted_note_count: attempted,
      });
    }
  }

  entries.push({
    name: "artifacts/artifact-manifest.json",
    text: JSON.stringify(
      {
        artifacts: artifactManifest,
      },
      null,
      2,
    ),
  });
  return artifactEntries;
}

export async function buildLiteratureDeepReadingSourceBundle(args) {
  const { sourceEntry, parentItem, runtime, workflowParams } = args;
  const hostFile = runtime.hostApi.file;
  const sourcePath = await resolveAttachmentFilePath(sourceEntry, runtime);
  const diagnostics = [];
  const entries = [];
  const sourceFileName = getAttachmentFileName(sourceEntry, runtime);
  const sourceIsMarkdown = runtime.helpers.isMarkdownAttachment(sourceEntry);
  const sourceIsPdf = runtime.helpers.isPdfAttachment(sourceEntry);

  let sourceMarkdownStatus = "unavailable";
  let imageManifest = [];
  if (sourceIsMarkdown) {
    const markdown = await hostFile.readText(sourcePath);
    const rewritten = await rewriteMarkdownImages({
      markdown,
      sourcePath,
      hostFile,
      entries,
      diagnostics,
    });
    sourceMarkdownStatus = "available";
    imageManifest = rewritten.imageManifest;
    entries.push({
      name: "source.md",
      text: rewritten.markdown,
    });
  } else if (sourceIsPdf) {
    const bytes = asUint8Array(await hostFile.readBytes(sourcePath));
    entries.push({
      name: "original.pdf",
      bytes,
    });
    diagnostics.push({
      level: "info",
      code: "pdf_fallback",
      message:
        "Source bundle contains only PDF input; Markdown parsing is left to skill fallback.",
    });
  }

  const sidecarArtifacts = await collectSidecarArtifacts({
    parentItem,
    runtime,
    entries,
    diagnostics,
  });

  const sourceManifest = {
    version: 1,
    workflow: "literature-deep-reading",
    source: {
      kind: sourceIsMarkdown
        ? "markdown"
        : sourceIsPdf
          ? "pdf_fallback"
          : "unknown",
      path: sourcePath,
      file_name: sourceFileName,
      source_markdown_status: sourceMarkdownStatus,
      source_markdown_path: sourceIsMarkdown ? "source.md" : "",
      original_pdf_path: sourceIsPdf ? "original.pdf" : "",
    },
    paper: {
      item_id: parentItem?.id || null,
      item_key: normalizeString(parentItem?.key),
      paper_ref: normalizePaperRef(parentItem),
      title: readParentField(parentItem, "title"),
      creators: [],
      year: readParentField(parentItem, "date"),
    },
    parameters: {
      target_language: workflowParams.target_language,
    },
    images: imageManifest,
    sidecar_artifacts: {
      digest: sidecarArtifacts[sidecarManifestKey("digest")],
      references: sidecarArtifacts[sidecarManifestKey("references")],
      citation_analysis: sidecarArtifacts["citation-analysis"],
    },
    diagnostics,
  };

  entries.push({
    name: "source-manifest.json",
    text: JSON.stringify(sourceManifest, null, 2),
  });

  const tempRoot = await hostFile.getTempDirectoryPath();
  const runDir = joinPath(
    tempRoot,
    `literature-deep-reading-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  await hostFile.makeDirectory(runDir);
  const bundlePath = joinPath(runDir, "source_bundle.zip");
  await hostFile.writeBytes(bundlePath, createStoreZipBytes(entries));

  return {
    bundlePath,
    sourcePath,
    manifest: sourceManifest,
  };
}

export const __literatureDeepReadingBundleTestOnly = {
  extractMarkdownImageReferences,
  normalizeRelativePath,
  isWithinDirectory,
};
