import {
  portableItemRef,
  resolveAttachmentPath,
  resolveSelectionParentRef,
  selectionItems,
  withPackageRuntimeScope,
} from "../../lib/runtime.mjs";

function normalizeString(value) {
  return String(value || "").trim();
}

function resolveSourceAttachment(selectionContext) {
  const attachment = selectionItems(selectionContext).find(
    (item) => item?.kind === "attachment",
  );
  if (!attachment?.ref) {
    throw new Error(
      "literature-translator buildRequest requires one source attachment",
    );
  }
  return portableItemRef(attachment.ref);
}

function resolveWorkflowParams(executionOptions) {
  const workflowParams = executionOptions?.workflowParams || {};
  return {
    targetLanguage: normalizeString(workflowParams.target_language) || "zh-CN",
    mode: normalizeString(workflowParams.mode) || "fast",
  };
}

async function buildRequestImpl({
  selectionContext,
  executionOptions,
  runtime,
}) {
  const sourceAttachmentRef = resolveSourceAttachment(selectionContext);
  const sourcePath = await resolveAttachmentPath(sourceAttachmentRef, runtime);
  const targetParentRef = portableItemRef(
    resolveSelectionParentRef(selectionContext) ||
      selectionItems(selectionContext).find(
        (item) => item?.kind === "attachment",
      )?.parentRef,
  );
  const params = resolveWorkflowParams(executionOptions);
  return {
    kind: "skillrunner.job.v1",
    skill_id: "literature-translator",
    mode: "auto",
    sourceAttachmentRefs: [sourceAttachmentRef],
    targetParentRef,
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
