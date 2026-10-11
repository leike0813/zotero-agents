import {
  basenamePath,
  dirnamePath,
  joinPath,
  toNativePath,
} from "./deepReadingResultTarget.mjs";
import { sanitizeFileNameSegment } from "./path.mjs";
import {
  portableItemRef,
  readHostPages,
  resolveAttachmentPath,
  requireCommittedMutation,
  requireHostApi,
} from "./runtime.mjs";

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeHostFilePath(value) {
  return toNativePath(normalizeString(value).replace(/^file:\/\/+/, ""));
}

function replaceExtension(filePath, extension) {
  const normalized = normalizeString(filePath);
  if (!normalized) {
    return "";
  }
  if (/\.[^./\\]+$/.test(normalized)) {
    return normalized.replace(/\.[^./\\]+$/, extension);
  }
  return `${normalized}${extension}`;
}

function targetStemForSource(sourcePath, targetLanguage) {
  const sourceName = basenamePath(sourcePath);
  const sourceMarkdownName = replaceExtension(sourceName, ".md");
  const stem = sourceMarkdownName.replace(/\.md$/i, "");
  const suffix = sanitizeFileNameSegment(targetLanguage);
  if (!stem || !suffix) {
    return "";
  }
  return `${stem}_${suffix}`;
}

export function resolveTranslatorArtifactTargetPaths(
  sourcePath,
  targetLanguage,
) {
  const sourceDir = dirnamePath(sourcePath);
  const targetStem = targetStemForSource(sourcePath, targetLanguage);
  if (!sourceDir || !targetStem) {
    return {
      markdownPath: "",
      alignmentPath: "",
    };
  }
  return {
    markdownPath: joinPath(sourceDir, `${targetStem}.md`),
    alignmentPath: joinPath(sourceDir, `${targetStem}.json`),
  };
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function isValidTranslatorAlignment(payload, targetLanguage) {
  return (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    payload.format === "v1" &&
    payload.target_language === targetLanguage &&
    Array.isArray(payload.blocks)
  );
}

export async function findExistingTranslatorAlignment({
  parentItem,
  runtime,
  sourcePath,
  targetLanguage,
  hostApi,
}) {
  const paths = resolveTranslatorArtifactTargetPaths(
    sourcePath,
    targetLanguage,
  );
  if (!paths.alignmentPath) {
    return {
      status: "missing",
      path: paths.alignmentPath,
      alignment: null,
      diagnostics: [],
    };
  }
  let alignmentPath = paths.alignmentPath;
  if (parentItem && runtime) {
    const attachment = await findOutputAttachmentForPath(
      parentItem,
      paths.markdownPath,
      runtime,
      sourcePath,
    );
    if (attachment) {
      const translatedPath = await resolveAttachmentPath(
        attachment.ref,
        runtime,
      );
      const attachmentDirectory = dirnamePath(translatedPath);
      const attachmentAlignmentPath = attachmentDirectory
        ? joinPath(attachmentDirectory, basenamePath(paths.alignmentPath))
        : "";
      if (
        attachmentAlignmentPath &&
        (await hostApi.file.exists(attachmentAlignmentPath))
      ) {
        alignmentPath = attachmentAlignmentPath;
      }
    }
  }
  if (!(await hostApi.file.exists(alignmentPath))) {
    return {
      status: "missing",
      path: alignmentPath,
      alignment: null,
      diagnostics: [],
    };
  }
  const diagnostics = [];
  const text = await hostApi.file.readText(alignmentPath);
  const alignment = parseJson(text);
  if (!isValidTranslatorAlignment(alignment, targetLanguage)) {
    diagnostics.push({
      level: "warning",
      code: "translator_alignment_invalid",
      message:
        "Existing translator alignment does not match the expected v1 target language contract.",
      path: alignmentPath,
    });
    return {
      status: "invalid",
      path: alignmentPath,
      alignment: null,
      diagnostics,
    };
  }
  return {
    status: "available",
    path: alignmentPath,
    alignment,
    diagnostics,
  };
}

export async function findOutputAttachmentForPath(
  parentItem,
  targetPath,
  runtime,
  sourcePath,
) {
  const normalizedTargetPath = normalizeArtifactPath(targetPath);
  if (!normalizedTargetPath) {
    return null;
  }
  const host = requireHostApi(runtime);
  const attachments = await readHostPages({
    readPage: (page) =>
      host.library.getItemAttachments(portableItemRef(parentItem), page),
    getItems: (page) => page.attachments,
    operation: "translator attachment read",
  });
  const exact = [];
  const sameStoredName = [];
  const unavailable = [];
  for (const attachment of attachments) {
    const attachmentPath =
      attachment.file?.state === "available" ? attachment.file.path : "";
    if (
      !attachmentPath &&
      normalizeArtifactPath(attachment.filename) ===
        normalizeArtifactPath(basenamePath(targetPath))
    )
      unavailable.push(attachment);
    if (
      sourcePath &&
      normalizeArtifactPath(
        attachment.filename || basenamePath(attachmentPath),
      ) === normalizeArtifactPath(basenamePath(sourcePath)) &&
      normalizeArtifactPath(attachmentPath) !==
        normalizeArtifactPath(sourcePath)
    ) {
      throw new Error(
        `Source filename is ambiguous: ${basenamePath(sourcePath)}`,
      );
    }
    if (normalizeArtifactPath(attachmentPath) === normalizedTargetPath) {
      exact.push(attachment);
    } else if (
      attachment.linkMode === "stored_file" &&
      normalizeArtifactPath(attachment.filename) ===
        normalizeArtifactPath(basenamePath(targetPath))
    ) {
      sameStoredName.push(attachment);
    }
  }
  if (exact.length > 1 || (!exact.length && sameStoredName.length > 1)) {
    throw new Error(`translator output attachment is ambiguous: ${targetPath}`);
  }
  if (!exact.length && unavailable.length)
    throw new Error(`Output attachment file is unavailable: ${targetPath}`);
  const match = exact[0] || sameStoredName[0] || null;
  if (
    match &&
    (match.file?.state !== "available" ||
      !match.file.path ||
      !(await host.file.exists(match.file.path)))
  ) {
    throw new Error(`Output attachment file is unavailable: ${targetPath}`);
  }
  return match;
}

function normalizeArtifactPath(value) {
  const raw = normalizeString(value);
  const normalized = raw
    .replace(/^file:\/\/+/, "")
    .replaceAll("\\", "/")
    .replace(/\/{2,}/g, "/")
    .replace(/\/$/, "");
  return globalThis.Zotero?.isWin ||
    /^[A-Za-z]:\//.test(normalized) ||
    raw.startsWith("\\\\")
    ? normalized.toLowerCase()
    : normalized;
}

export async function withAdjacentTextFiles({ file, entries, apply }) {
  const directory = joinPath(
    dirnamePath(entries[0].path),
    `.attachment-output-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
  );
  const staged = entries.map((entry, index) => ({
    ...entry,
    staged: joinPath(directory, `new-${index}`),
    backup: joinPath(directory, `old-${index}`),
    existed: false,
    promoted: false,
  }));
  let mutationInFlight = false;
  let preserve = false;
  const remove = (path) =>
    file.remove({ path, recursive: true, missing: "ignore" });
  const move = (sourcePath, targetPath) =>
    file.move({ sourcePath, targetPath, overwrite: false });
  const recoveryError = (cause) =>
    Object.assign(
      new Error(`${cause?.message || cause}; recovery files: ${directory}`),
      {
        code: "attachment_recovery_required",
        recoveryDirectory: directory,
        cause,
      },
    );
  try {
    await file.makeDirectory({ path: directory });
    for (const entry of staged) {
      entry.existed = await file.exists(entry.path);
      await file.writeText(entry.staged, String(entry.text || ""));
    }
    for (const entry of staged) {
      if (entry.existed) await move(entry.path, entry.backup);
      await move(entry.staged, entry.path);
      entry.promoted = true;
    }
    mutationInFlight = true;
    const execution = await apply();
    mutationInFlight = false;
    preserve =
      execution?.outcome === "unknown" ||
      execution?.outcome === "repair_required";
    const result = requireCommittedMutation(execution);
    preserve = true;
    await remove(directory);
    return result;
  } catch (error) {
    if (mutationInFlight || preserve) throw recoveryError(error);
    try {
      for (const entry of staged.slice().reverse()) {
        if (await file.exists(entry.backup)) {
          await remove(entry.path);
          await move(entry.backup, entry.path);
        } else if (entry.promoted) {
          await remove(entry.path);
        }
      }
      await remove(directory);
    } catch (restoreError) {
      throw recoveryError(
        new Error(
          `${error?.message || error}; restore failed: ${restoreError?.message || restoreError}`,
        ),
      );
    }
    throw error;
  }
}

export async function materializeTranslatorArtifacts({
  parentItem,
  runtime,
  sourcePath,
  targetLanguage,
  outputPath,
  alignmentPath,
}) {
  const hostApi = requireHostApi(runtime);
  const outputFilePath = normalizeHostFilePath(outputPath);
  const alignmentFilePath = normalizeHostFilePath(alignmentPath);
  if (!outputFilePath) {
    throw new Error("output_path is unavailable");
  }
  if (!alignmentFilePath) {
    throw new Error("alignment_path is unavailable");
  }
  if (!(await hostApi.file.exists(outputFilePath))) {
    throw new Error(`output_path does not exist: ${outputPath}`);
  }
  if (!(await hostApi.file.exists(alignmentFilePath))) {
    throw new Error(`alignment_path does not exist: ${alignmentPath}`);
  }

  return materializeTranslatorArtifactTexts({
    parentItem,
    runtime,
    sourcePath,
    targetLanguage,
    outputText: await hostApi.file.readText(outputFilePath),
    alignmentText: await hostApi.file.readText(alignmentFilePath),
  });
}

export async function materializeTranslatorArtifactTexts({
  parentItem,
  runtime,
  sourcePath,
  targetLanguage,
  outputText,
  alignmentText,
}) {
  const hostApi = requireHostApi(runtime);
  const paths = resolveTranslatorArtifactTargetPaths(
    sourcePath,
    targetLanguage,
  );
  if (!paths.markdownPath) {
    throw new Error("target markdown path is unavailable");
  }
  if (!paths.alignmentPath) {
    throw new Error("target alignment path is unavailable");
  }

  let attachment = await findOutputAttachmentForPath(
    parentItem,
    paths.markdownPath,
    runtime,
    sourcePath,
  );
  const source = {
    kind: "stored_file",
    main: { source: { kind: "local_path", path: paths.markdownPath } },
    companions: [
      {
        source: { kind: "local_path", path: paths.alignmentPath },
        targetRelativePath: basenamePath(paths.alignmentPath),
      },
    ],
  };
  const result = await withAdjacentTextFiles({
    file: hostApi.file,
    entries: [
      { path: paths.markdownPath, text: outputText },
      { path: paths.alignmentPath, text: alignmentText },
    ],
    apply: async () => {
      if (attachment?.linkMode === "stored_file") {
        return hostApi.attachments.replaceFile({
          operationId: `translator:replace:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`,
          attachmentRef: attachment.ref,
          source,
        });
      } else if (!attachment) {
        return hostApi.attachments.create({
          operationId: `translator:attachment:${Date.now().toString(36)}`,
          placement: { kind: "child", parentRef: portableItemRef(parentItem) },
          source,
          metadata: {
            title: sanitizeFileNameSegment(basenamePath(paths.markdownPath)),
            contentType: "text/markdown",
          },
        });
      }
      return { outcome: "unchanged", result: { attachment } };
    },
  });
  attachment = result.attachment;

  return {
    markdownPath: paths.markdownPath,
    alignmentPath: paths.alignmentPath,
    attachment,
  };
}

export const __translatorArtifactsTestOnly = {
  normalizeHostFilePath,
};
