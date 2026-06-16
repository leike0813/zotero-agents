import { withPackageRuntimeScope } from "../../lib/runtime.mjs";

function normalizeString(value) {
  return String(value || "").trim();
}

function collectAttachments(selectionContext) {
  const attachments = selectionContext?.items?.attachments;
  return Array.isArray(attachments) ? attachments : [];
}

function resolveAttachmentPath(entry, runtime) {
  const fromHelper = runtime?.helpers?.getAttachmentFilePath?.(entry);
  const direct = entry?.filePath || entry?.path || entry?.item?.filePath;
  const path = normalizeString(fromHelper || direct);
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
  const parentFromSelection = Number(
    selectionContext?.items?.parents?.[0]?.item?.id || 0,
  );
  if (Number.isFinite(parentFromSelection) && parentFromSelection > 0) {
    return runtime.helpers.resolveItemRef(parentFromSelection);
  }
  const parentFromAttachment = Number(
    selectionContext?.items?.attachments?.[0]?.parent?.id || 0,
  );
  if (Number.isFinite(parentFromAttachment) && parentFromAttachment > 0) {
    return runtime.helpers.resolveItemRef(parentFromAttachment);
  }
  throw new Error(
    "literature-translator buildRequest cannot resolve parent item",
  );
}

function resolveWorkflowParams(executionOptions) {
  const workflowParams = executionOptions?.workflowParams || {};
  return {
    targetLanguage:
      normalizeString(workflowParams.target_language) || "zh-CN",
  };
}

function buildRequestImpl({ selectionContext, executionOptions, runtime }) {
  const sourcePath = resolveSourceAttachmentPath(selectionContext, runtime);
  const parentItem = resolveParentItemFromSelection(selectionContext, runtime);
  const params = resolveWorkflowParams(executionOptions);
  return {
    kind: "skillrunner.sequence.v1",
    sourceAttachmentPaths: [sourcePath],
    targetParentID: parentItem.id,
    steps: [
      {
        id: "translate",
        skill_id: "literature-translator",
        workspace: "new",
        fetch_type: "bundle",
        input: {
          source_path: sourcePath,
        },
        parameter: {
          target_language: params.targetLanguage,
        },
      },
    ],
    final_step_id: "translate",
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
