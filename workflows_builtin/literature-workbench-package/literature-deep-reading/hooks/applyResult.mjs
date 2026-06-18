import { sanitizeFileNameSegment } from "../../lib/path.mjs";
import {
  basenamePath,
  normalizePathForCompare,
  resolveDeepReadingHtmlPathFromSourcePath,
  resolveSourcePathFromRequest,
} from "../../lib/deepReadingResultTarget.mjs";
import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeBundleEntryPath(targetPath) {
  return normalizeString(targetPath)
    .replace(/^file:\/\/+/, "")
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/");
}

function getResultArtifactPath(result, key) {
  if (!result || typeof result !== "object") {
    return "";
  }
  return (
    normalizeString(result?.[key]) ||
    normalizeString(result?.data?.[key])
  );
}

function resolveBundleEntryPath(rawPath, fallbackPath) {
  const normalizedRaw = normalizeBundleEntryPath(rawPath);
  const normalizedFallback = normalizeBundleEntryPath(fallbackPath);
  const candidates = [];
  const seen = new Set();

  const addCandidate = (value) => {
    const normalized = normalizeBundleEntryPath(value);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    candidates.push(normalized);
  };

  addCandidate(normalizedRaw);
  const lowered = normalizedRaw.toLowerCase();
  for (const marker of ["/result/", "/bundle/"]) {
    const index = lowered.lastIndexOf(marker);
    if (index >= 0) {
      addCandidate(normalizedRaw.slice(index + 1));
    }
  }
  addCandidate(normalizedFallback);
  return candidates;
}

async function readBundleTextWithPathFallback(args) {
  const candidates = resolveBundleEntryPath(args.rawPath, args.fallbackPath);
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const text = await args.bundleReader.readText(candidate);
      return {
        entryPath: candidate,
        text,
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(
    `${args.fieldName} bundle entry not found; candidates=${JSON.stringify(candidates)}; last_error=${String(lastError?.message || lastError || "unknown")}`,
  );
}

async function readResultJson({ bundleReader, resultContext }) {
  if (
    resultContext &&
    typeof resultContext === "object" &&
    "resultJson" in resultContext
  ) {
    return resultContext.resultJson;
  }
  for (const entryPath of [
    "literature-deep-reading.result.json",
    "result/literature-deep-reading.result.json",
    "result/final-output.candidate.json",
    "result/deep-reading-manifest.json",
  ]) {
    try {
      return JSON.parse(await bundleReader.readText(entryPath));
    } catch {
      // Try the next supported result entry.
    }
  }
  return {};
}

async function readArtifactText(args) {
  if (
    args.resultContext &&
    typeof args.resultContext.readArtifactText === "function"
  ) {
    return args.resultContext.readArtifactText({
      fieldName: args.fieldName,
      rawPath: args.rawPath,
      fallbackPath: args.fallbackPath,
    });
  }
  return readBundleTextWithPathFallback(args);
}

async function findLinkedAttachmentForPath(parentItem, targetPath, runtime) {
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

async function applyResultImpl({
  parent,
  bundleReader,
  request,
  resultContext,
  runResult,
  runtime,
}) {
  const hostApi = requireHostApi(runtime);
  const parentItem = runtime.helpers.resolveItemRef(parent);
  const diagnostics = [];
  const result = await readResultJson({ bundleReader, resultContext });
  const htmlResolved = await readArtifactText({
    resultContext,
    bundleReader,
    fieldName: "html_path",
    rawPath:
      getResultArtifactPath(result, "html_path") ||
      getResultArtifactPath(result, "deep_reading_html_path"),
    fallbackPath: "result/deep-reading.html",
  });

  let manifest = null;
  try {
    const manifestResolved = await readArtifactText({
      resultContext,
      bundleReader,
      fieldName: "manifest_path",
      rawPath: getResultArtifactPath(result, "manifest_path"),
      fallbackPath: "result/deep-reading-manifest.json",
    });
    manifest = JSON.parse(manifestResolved.text);
  } catch (error) {
    diagnostics.push({
      level: "info",
      code: "manifest_unavailable",
      message: String(error?.message || error || "manifest unavailable"),
    });
  }

  const sourcePath = resolveSourcePathFromRequest(request);
  const htmlPath = resolveDeepReadingHtmlPathFromSourcePath(sourcePath);
  if (!htmlPath) {
    throw new Error(
      "literature-deep-reading applyResult cannot resolve target HTML path from source attachment",
    );
  }
  await hostApi.file.writeText(htmlPath, htmlResolved.text);

  const attachmentTitle = sanitizeFileNameSegment(basenamePath(htmlPath));
  let attachment = await findLinkedAttachmentForPath(
    parentItem,
    htmlPath,
    runtime,
  );
  if (!attachment) {
    attachment = await hostApi.attachments.createFromPath({
      path: htmlPath,
      parent: parentItem,
      title: attachmentTitle,
      mimeType: "text/html",
    });
  }

  return {
    ok: true,
    attachmentKey: normalizeString(attachment?.key),
    attachmentId: attachment?.id || null,
    htmlPath,
    sourcePath,
    htmlEntryPath: htmlResolved.entryPath,
    manifest,
    diagnostics,
  };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}
