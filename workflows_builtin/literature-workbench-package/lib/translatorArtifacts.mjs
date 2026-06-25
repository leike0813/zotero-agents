import {
  basenamePath,
  dirnamePath,
  joinPath,
  normalizePathForCompare,
  toNativePath,
} from "./deepReadingResultTarget.mjs";
import { sanitizeFileNameSegment } from "./path.mjs";
import { requireHostApi } from "./runtime.mjs";

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

export function isValidTranslatorAlignment(
  payload,
  targetLanguage,
) {
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
  sourcePath,
  targetLanguage,
  hostApi,
}) {
  const paths = resolveTranslatorArtifactTargetPaths(
    sourcePath,
    targetLanguage,
  );
  if (!paths.alignmentPath || !(await hostApi.file.exists(paths.alignmentPath))) {
    return {
      status: "missing",
      path: paths.alignmentPath,
      alignment: null,
      diagnostics: [],
    };
  }
  const diagnostics = [];
  const text = await hostApi.file.readText(paths.alignmentPath);
  const alignment = parseJson(text);
  if (!isValidTranslatorAlignment(alignment, targetLanguage)) {
    diagnostics.push({
      level: "warning",
      code: "translator_alignment_invalid",
      message:
        "Existing translator alignment does not match the expected v1 target language contract.",
      path: paths.alignmentPath,
    });
    return {
      status: "invalid",
      path: paths.alignmentPath,
      alignment: null,
      diagnostics,
    };
  }
  return {
    status: "available",
    path: paths.alignmentPath,
    alignment,
    diagnostics,
  };
}

export async function findLinkedAttachmentForPath(
  parentItem,
  targetPath,
  runtime,
) {
  const normalizedTargetPath = normalizePathForCompare(targetPath);
  if (!normalizedTargetPath) {
    return null;
  }
  for (const attachmentId of parentItem.getAttachments?.() || []) {
    let attachment = null;
    try {
      attachment = runtime.helpers.resolveItemRef(attachmentId);
    } catch {
      attachment = null;
    }
    if (!attachment) {
      continue;
    }
    let attachmentPath = "";
    try {
      attachmentPath = normalizeString(await attachment.getFilePathAsync?.());
    } catch {
      attachmentPath = "";
    }
    if (!attachmentPath) {
      attachmentPath = normalizeString(attachment.getField?.("path"));
    }
    if (normalizePathForCompare(attachmentPath) === normalizedTargetPath) {
      return attachment;
    }
  }
  return null;
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

  await hostApi.file.writeText(paths.markdownPath, String(outputText || ""));
  await hostApi.file.writeText(
    paths.alignmentPath,
    String(alignmentText || ""),
  );

  let attachment = await findLinkedAttachmentForPath(
    parentItem,
    paths.markdownPath,
    runtime,
  );
  if (!attachment) {
    attachment = await hostApi.attachments.createFromPath({
      parent: parentItem,
      path: paths.markdownPath,
      title: sanitizeFileNameSegment(basenamePath(paths.markdownPath)),
      mimeType: "text/markdown",
    });
  }

  return {
    markdownPath: paths.markdownPath,
    alignmentPath: paths.alignmentPath,
    attachment,
  };
}

export const __translatorArtifactsTestOnly = {
  normalizeHostFilePath,
};
