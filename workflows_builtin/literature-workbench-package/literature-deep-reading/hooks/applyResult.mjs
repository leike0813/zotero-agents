import { joinPath, sanitizeFileNameSegment } from "../../lib/path.mjs";
import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizePathForCompare(targetPath) {
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
    normalizeString(result?.data?.[key]) ||
    normalizeString(result?.result?.[key])
  );
}

function resolveBundleEntryPath(rawPath, fallbackPath) {
  const normalizedRaw = normalizePathForCompare(rawPath);
  const normalizedFallback = normalizePathForCompare(fallbackPath);
  const candidates = [];
  const seen = new Set();

  const addCandidate = (value) => {
    const normalized = normalizePathForCompare(value);
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

function makeAttachmentTitle(parentItem) {
  const title = normalizeString(parentItem?.getField?.("title")) || "Untitled";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `Deep Reading - ${title} - ${timestamp}`;
}

async function applyResultImpl({
  parent,
  bundleReader,
  resultContext,
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

  const tempRoot = await hostApi.file.getTempDirectoryPath();
  const runDir = joinPath(
    tempRoot,
    `literature-deep-reading-result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  await hostApi.file.makeDirectory(runDir);
  const htmlPath = joinPath(runDir, "deep-reading.html");
  await hostApi.file.writeText(htmlPath, htmlResolved.text);

  const attachmentTitle = sanitizeFileNameSegment(
    makeAttachmentTitle(parentItem),
  );
  const attachment = await hostApi.attachments.createFromPath({
    path: htmlPath,
    parent: parentItem,
    title: attachmentTitle,
    mimeType: "text/html",
  });

  return {
    ok: true,
    attachmentKey: normalizeString(attachment?.key),
    attachmentId: attachment?.id || null,
    htmlPath,
    htmlEntryPath: htmlResolved.entryPath,
    manifest,
    diagnostics,
  };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}
