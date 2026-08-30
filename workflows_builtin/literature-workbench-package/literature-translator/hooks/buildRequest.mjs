import { withPackageRuntimeScope } from "../../lib/runtime.mjs";

function normalizeString(value) {
  return String(value || "").trim();
}

function collectAttachments(selectionContext) {
  const attachments = selectionContext?.items?.attachments;
  return Array.isArray(attachments) ? attachments : [];
}

function resolveAttachmentPath(entry, runtime) {
  void runtime;
  const direct = entry?.filePath || entry?.path || entry?.item?.filePath;
  const path = normalizeString(direct);
  if (!path) {
    throw new Error(
      "literature-translator buildRequest cannot resolve source attachment path",
    );
  }
  return path;
}

function resolveSourceAttachmentPath(selectionContext, runtime) {
  const attachments = collectAttachments(selectionContext);
  if (attachments.length === 0) {
    throw new Error(
      "literature-translator buildRequest requires one source attachment",
    );
  }
  return resolveAttachmentPath(attachments[0], runtime);
}

function resolveParentItemFromSelection(selectionContext, runtime) {
  void runtime;
  const parent = selectionContext?.items?.parents?.[0]?.item ||
    selectionContext?.items?.attachments?.[0]?.parent;
  if (Number(parent?.id) > 0) return parent;
  throw new Error(
    "literature-translator buildRequest cannot resolve parent item",
  );
}

function resolveWorkflowParams(executionOptions) {
  const workflowParams = executionOptions?.workflowParams || {};
  return {
    targetLanguage:
      normalizeString(workflowParams.target_language) || "zh-CN",
    mode: normalizeString(workflowParams.mode) || "fast",
  };
}

function buildRequestImpl({ selectionContext, executionOptions, runtime }) {
  const sourcePath = resolveSourceAttachmentPath(selectionContext, runtime);
  const parentItem = resolveParentItemFromSelection(selectionContext, runtime);
  const params = resolveWorkflowParams(executionOptions);
  return {
    kind: "skillrunner.job.v1",
    skill_id: "literature-translator",
    mode: "auto",
    sourceAttachmentPaths: [sourcePath],
    targetParentID: parentItem.id,
    input: {
      source_path: sourcePath,
    },
    parameter: {
      target_language: params.targetLanguage,
      mode: params.mode,
    },
    fetch_type: "bundle",
    poll: {
      interval_ms: 2000,
      timeout_ms: 1200000,
    },
  };
}

export function buildRequest(args) {
  return withPackageRuntimeScope(args?.runtime, () => buildRequestImpl(args));
}

export const __literatureTranslatorBuildRequestTestOnly = {
  resolveWorkflowParams,
};
