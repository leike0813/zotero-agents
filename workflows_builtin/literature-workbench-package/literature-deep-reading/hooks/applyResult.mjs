import { sanitizeFileNameSegment } from "../../lib/path.mjs";
import {
  basenamePath,
  normalizePathForCompare,
  resolveDeepReadingHtmlPathFromSourcePath,
} from "../../lib/deepReadingResultTarget.mjs";
import {
  appendSkillDiagnosticsToResult,
  collectSkillOutputDiagnostics,
} from "../../lib/resultOutput.mjs";
import {
  portableItemRef,
  requireHostApi,
  resolveAttachmentPath,
  withPackageRuntimeScope,
} from "../../lib/runtime.mjs";
import { collectStatusTransitionDiagnostics } from "../../lib/statusTransition.mjs";
import { findOutputAttachmentForPath } from "../../lib/translatorArtifacts.mjs";
import { requireCommittedMutation } from "../../lib/runtime.mjs";

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
  return normalizeString(result?.[key]) || normalizeString(result?.data?.[key]);
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

async function applyResultImpl({
  parent,
  bundleReader,
  request,
  resultContext,
  runResult,
  runtime,
}) {
  const hostApi = requireHostApi(runtime);
  const parentRef = portableItemRef(parent);
  const parentDetail = await hostApi.library.getItemDetail(parentRef);
  if (!parentDetail || parentDetail.kind !== "regular")
    throw new Error("deep-reading parent is unavailable");
  const parentItem = parentDetail.item;
  const diagnostics = [];
  const result = await readResultJson({ bundleReader, resultContext });
  const skillOutputDiagnostics = collectSkillOutputDiagnostics(result);
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

  const sourceAttachmentRef = request?.sourceAttachmentRefs?.[0];
  if (!sourceAttachmentRef) {
    throw new Error(
      "literature-deep-reading applyResult requires one source attachment ref",
    );
  }
  const sourcePath = await resolveAttachmentPath(sourceAttachmentRef, runtime);
  const htmlPath = resolveDeepReadingHtmlPathFromSourcePath(sourcePath);
  if (!htmlPath) {
    throw new Error(
      "literature-deep-reading applyResult cannot resolve target HTML path from source attachment",
    );
  }
  await hostApi.file.writeText(htmlPath, htmlResolved.text);

  const attachmentTitle = sanitizeFileNameSegment(basenamePath(htmlPath));
  let attachment = await findOutputAttachmentForPath(
    parentItem,
    htmlPath,
    runtime,
  );
  const source = {
    kind: "stored_file",
    main: { source: { kind: "local_path", path: htmlPath } },
  };
  if (attachment?.linkMode === "stored_file") {
    attachment = requireCommittedMutation(await hostApi.attachments.replaceFile({
      operationId: `deep-reading:replace:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`,
      attachmentRef: attachment.ref,
      source,
    })).attachment;
  } else if (!attachment) {
    attachment = requireCommittedMutation(
      await hostApi.attachments.create({
        operationId: `deep-reading:attachment:${Date.now().toString(36)}`,
        placement: { kind: "child", parentRef },
        source,
        metadata: { title: attachmentTitle, contentType: "text/html" },
      }),
    ).attachment;
  }

  const statusWarnings = [];
  let statusTransition;
  try {
    const transition = hostApi?.statusTags?.transition;
    if (typeof transition !== "function") {
      throw new Error("literature-deep-reading statusTags API is unavailable");
    }
    statusTransition = await transition({
      operationId: `deep-reading:status:${Date.now().toString(36)}`,
      itemRef: parentRef,
      remove: ["need-deep-reading"],
    });
    statusWarnings.push(
      ...collectStatusTransitionDiagnostics(
        statusTransition,
        "literature_deep_reading_status_transition_failed",
      ),
    );
  } catch (error) {
    statusWarnings.push({
      code: "literature_deep_reading_status_transition_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return appendSkillDiagnosticsToResult(
    {
      ok: true,
      attachmentKey: normalizeString(attachment?.ref?.key),
      attachmentId: null,
      htmlPath,
      sourcePath,
      htmlEntryPath: htmlResolved.entryPath,
      manifest,
      diagnostics,
      partial: statusWarnings.length > 0,
      statusTransition,
      statusWarnings,
    },
    skillOutputDiagnostics,
  );
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}
