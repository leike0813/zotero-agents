import {
  upsertLiteratureDigestGeneratedNotes,
} from "../../lib/literatureDigestNotes.mjs";
import { parseGeneratedNoteKind } from "../../lib/referencesNote.mjs";
import { applyReferenceMatchingToNote } from "../../lib/referenceMatchingApply.mjs";
import { measureWorkflowTestSpan, withPackageRuntimeScope } from "../../lib/runtime.mjs";

function normalizePathForCompare(targetPath) {
  const text = String(targetPath || "").trim();
  if (!text) {
    return "";
  }
  return text
    .replace(/^file:\/\/+/, "")
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/");
}

function getBaseNameFromPath(targetPath) {
  const normalized = normalizePathForCompare(targetPath);
  if (!normalized) {
    return "";
  }
  const parts = normalized.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1].toLowerCase() : "";
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
  for (const marker of ["/uploads/", "/artifacts/", "/result/", "/bundle/"]) {
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
  const reason = String(lastError && lastError.message ? lastError.message : lastError || "unknown");
  throw new Error(
    `[${args.fieldName}] bundle entry not found; raw_path=${normalizePathForCompare(args.rawPath) || "<empty>"}; candidates=${JSON.stringify(candidates)}; fallback=${normalizePathForCompare(args.fallbackPath) || "<empty>"}; last_error=${reason}`,
  );
}

function getResultArtifactPath(result, key) {
  if (!result || typeof result !== "object") {
    return "";
  }
  return (
    String(result?.[key] || "").trim() ||
    String(result?.data?.[key] || "").trim() ||
    String(result?.result?.[key] || "").trim()
  );
}

function isExplicitFalse(value) {
  if (value === false) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "false";
  }
  return false;
}

function resolveWorkflowParameter(args) {
  const candidates = [
    args?.request?.parameter,
    args?.request?.request?.json?.parameter,
    args?.runResult?.resultJson?.parameter,
    args?.runResult?.responseJson?.parameter,
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate;
    }
  }
  return {};
}

function findReferencesNote(notes) {
  for (const note of Array.isArray(notes) ? notes : []) {
    try {
      if (parseGeneratedNoteKind(note?.getNote?.() || "") === "references") {
        return note;
      }
    } catch {
      // ignore malformed note objects and continue
    }
  }
  return null;
}

async function readResultJson({ resultContext, bundleReader }) {
  if (resultContext && typeof resultContext === "object" && "resultJson" in resultContext) {
    return resultContext.resultJson;
  }
  const resultJsonText = await bundleReader.readText("result/result.json");
  return JSON.parse(resultJsonText);
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
  return readBundleTextWithPathFallback({
    bundleReader: args.bundleReader,
    fieldName: args.fieldName,
    rawPath: args.rawPath,
    fallbackPath: args.fallbackPath,
  });
}

function collectSourceAttachmentPathsFromRequest(request) {
  if (!request || typeof request !== "object") {
    return [];
  }

  const typed = request;
  const fromSource = Array.isArray(typed.sourceAttachmentPaths)
    ? typed.sourceAttachmentPaths
    : [];
  const fromUploadFiles = Array.isArray(typed.upload_files)
    ? typed.upload_files.map((entry) => entry?.path)
    : [];
  const fromNestedUploadFiles = Array.isArray(typed?.request?.json?.upload_files)
    ? typed.request.json.upload_files.map((entry) => entry?.path)
    : [];

  return Array.from(
    new Set(
      [...fromSource, ...fromUploadFiles, ...fromNestedUploadFiles]
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    ),
  );
}

async function resolveSourceAttachmentItemKey({ parentItem, request, runtime }) {
  if (!parentItem) {
    return "";
  }

  const sourcePaths = collectSourceAttachmentPathsFromRequest(request);
  if (sourcePaths.length === 0) {
    return "";
  }

  const sourcePathSet = new Set(
    sourcePaths.map(normalizePathForCompare).filter(Boolean),
  );
  const sourcePathInsensitiveSet = new Set(
    Array.from(sourcePathSet).map((entry) => entry.toLowerCase()),
  );
  const sourceBasenames = new Set(
    sourcePaths.map(getBaseNameFromPath).filter(Boolean),
  );

  const basenameMatchKeys = new Set();
  const attachmentRefs = parentItem.getAttachments?.() || [];
  for (const attachmentRef of attachmentRefs) {
    let attachment = null;
    try {
      attachment = runtime.helpers.resolveItemRef(attachmentRef);
    } catch {
      attachment = null;
    }
    if (!attachment) {
      continue;
    }

    const attachmentKey = String(attachment.key || "").trim();
    if (!attachmentKey) {
      continue;
    }

    let attachmentPath = "";
    try {
      attachmentPath = String((await attachment.getFilePathAsync?.()) || "").trim();
    } catch {
      attachmentPath = "";
    }

    if (!attachmentPath) {
      attachmentPath = String(attachment.getField?.("path") || "").trim();
    }

    const normalizedAttachmentPath = normalizePathForCompare(attachmentPath);
    if (
      normalizedAttachmentPath &&
      (sourcePathSet.has(normalizedAttachmentPath) ||
        sourcePathInsensitiveSet.has(normalizedAttachmentPath.toLowerCase()))
    ) {
      return attachmentKey;
    }

    const attachmentBasename =
      getBaseNameFromPath(attachmentPath) ||
      getBaseNameFromPath(String(attachment.getField?.("title") || ""));
    if (attachmentBasename && sourceBasenames.has(attachmentBasename)) {
      basenameMatchKeys.add(attachmentKey);
    }
  }

  if (basenameMatchKeys.size === 1) {
    return Array.from(basenameMatchKeys)[0];
  }
  return "";
}

async function applyResultImpl({ parent, bundleReader, resultContext, request, runResult, runtime }) {
  const parentItem = runtime.helpers.resolveItemRef(parent);
  const workflowParameter = resolveWorkflowParameter({ request, runResult });
  const result = await measureWorkflowTestSpan(
    "executeApplyResult:literatureDigest:readResultJson",
    {},
    () => readResultJson({ resultContext, bundleReader }),
  );

  const digestResolved = await measureWorkflowTestSpan(
    "executeApplyResult:literatureDigest:readDigestArtifact",
    {},
    () =>
      readArtifactText({
        resultContext,
        bundleReader,
        fieldName: "digest_path",
        rawPath: getResultArtifactPath(result, "digest_path"),
        fallbackPath: "artifacts/digest.md",
      }),
  );
  const referencesResolved = await measureWorkflowTestSpan(
    "executeApplyResult:literatureDigest:readReferencesArtifact",
    {},
    () =>
      readArtifactText({
        resultContext,
        bundleReader,
        fieldName: "references_path",
        rawPath: getResultArtifactPath(result, "references_path"),
        fallbackPath: "artifacts/references.json",
      }),
  );
  const citationAnalysisResolved = await measureWorkflowTestSpan(
    "executeApplyResult:literatureDigest:readCitationArtifact",
    {},
    () =>
      readArtifactText({
        resultContext,
        bundleReader,
        fieldName: "citation_analysis_path",
        rawPath: getResultArtifactPath(result, "citation_analysis_path"),
        fallbackPath: "artifacts/citation_analysis.json",
      }),
  );

  const referencesPayload = await measureWorkflowTestSpan(
    "executeApplyResult:literatureDigest:normalizeReferencesPayload",
    {},
    async () => ({
      version: 1,
      entry: referencesResolved.entryPath,
      format: "json",
      references: runtime.helpers.normalizeReferencesPayload(
        JSON.parse(referencesResolved.text),
      ),
    }),
  );
  const citationPayload = await measureWorkflowTestSpan(
    "executeApplyResult:literatureDigest:normalizeCitationPayload",
    {},
    async () => ({
      version: 1,
      entry: citationAnalysisResolved.entryPath,
      format: "json",
      citation_analysis: JSON.parse(citationAnalysisResolved.text) || {},
    }),
  );
  const sourceAttachmentItemKey = await measureWorkflowTestSpan(
    "executeApplyResult:literatureDigest:resolveSourceAttachment",
    {},
    () =>
      resolveSourceAttachmentItemKey({
        parentItem,
        request,
        runtime,
      }),
  );

  const applied = await measureWorkflowTestSpan(
    "executeApplyResult:literatureDigest:writeGeneratedNotes",
    {},
    () =>
      upsertLiteratureDigestGeneratedNotes({
        runtime,
        parentItem,
        digest: {
          payload: {
            version: 1,
            entry: digestResolved.entryPath,
            format: "markdown",
            content: digestResolved.text,
          },
          sourceAttachmentItemKey,
        },
        references: {
          payload: referencesPayload,
        },
        citationAnalysis: {
          payload: citationPayload,
        },
      }),
  );
  const autoReferenceMatching = {
    enabled: !isExplicitFalse(workflowParameter?.auto_reference_matching),
    attempted: false,
  };
  if (!autoReferenceMatching.enabled) {
    return {
      ...applied,
      auto_reference_matching: autoReferenceMatching,
    };
  }

  const referencesNote = findReferencesNote(applied?.notes);
  if (!referencesNote) {
    return {
      ...applied,
      auto_reference_matching: {
        ...autoReferenceMatching,
        warning: "references note was not produced by literature-digest apply",
      },
    };
  }

  autoReferenceMatching.attempted = true;
  try {
    const matchingResult = await measureWorkflowTestSpan(
      "executeApplyResult:literatureDigest:autoReferenceMatching",
      {},
      () =>
        applyReferenceMatchingToNote({
          noteItem: referencesNote,
          parentItem,
          parameter: {},
          runtime,
          manifest: { version: "0.1.0" },
        }),
    );
    return {
      ...applied,
      auto_reference_matching: {
        ...autoReferenceMatching,
        matched: matchingResult?.matched || 0,
        total: matchingResult?.total || 0,
        related_added: matchingResult?.related_added || 0,
        related_existing: matchingResult?.related_existing || 0,
        related_skipped: matchingResult?.related_skipped || 0,
      },
    };
  } catch (error) {
    return {
      ...applied,
      auto_reference_matching: {
        ...autoReferenceMatching,
        warning: String(error?.message || error || "auto reference matching failed"),
      },
    };
  }
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}
