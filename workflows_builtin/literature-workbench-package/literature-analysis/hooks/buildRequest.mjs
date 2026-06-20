import { withPackageRuntimeScope } from "../../lib/runtime.mjs";
import {
  buildTagRegulatorInputFromParent,
  resolveParentItemFromSelection,
  resolveRequestParameters as resolveTagRegulatorParameters,
} from "../../lib/tagRegulatorRequest.mjs";

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
    throw new Error("literature-analysis buildRequest cannot resolve source attachment path");
  }
  return path;
}

function resolveSourceAttachmentPath(selectionContext, runtime) {
  const attachments = collectAttachments(selectionContext);
  if (attachments.length === 0) {
    throw new Error("literature-analysis buildRequest requires one source attachment");
  }
  return resolveAttachmentPath(attachments[0], runtime);
}

function resolveWorkflowParams(executionOptions) {
  const workflowParams = executionOptions?.workflowParams || {};
  const language = normalizeString(workflowParams.language) || "zh-CN";
  return {
    language,
    autoTagRegulator: workflowParams.auto_tag_regulator === true,
    autoTagInferTag: workflowParams.auto_tag_infer_tag !== false,
  };
}

async function buildRequestImpl({ selectionContext, executionOptions, runtime }) {
  const sourcePath = resolveSourceAttachmentPath(selectionContext, runtime);
  const parentItem = resolveParentItemFromSelection(selectionContext, runtime);
  const params = resolveWorkflowParams(executionOptions);
  const digestStep = {
    id: "digest",
    skill_id: "literature-analysis",
    mode: "auto",
    workspace: "new",
    fetch_type: "bundle",
    apply_result: {
      workflow_id: "literature-analysis",
      on_failure: "continue",
    },
    input: {
      source_path: sourcePath,
    },
    parameter: {
      language: params.language,
    },
  };
  const steps = [digestStep];
  let finalStepId = "digest";

  if (params.autoTagRegulator) {
    const tagInput = await buildTagRegulatorInputFromParent({
      parentItem,
      runtime,
      useAbsoluteValidTagsPath: true,
    });
    steps.push({
      id: "tag-regulator",
      skill_id: "tag-regulator",
      mode: "auto",
      workspace: "reuse-workflow",
      fetch_type: "result",
      apply_result: {
        workflow_id: "tag-regulator",
        on_failure: "continue",
      },
      input: tagInput.input,
      parameter: resolveTagRegulatorParameters(executionOptions, {
        tagNoteLanguage: params.language,
        inferTag: params.autoTagInferTag,
      }),
      handoff: {
        from_step: "digest",
        required: true,
        pass_through: false,
        input: {
          digest_markdown: "digest_path",
        },
      },
    });
    finalStepId = "tag-regulator";
  }

  return {
    kind: "skillrunner.sequence.v1",
    sourceAttachmentPaths: [sourcePath],
    targetParentID: parentItem.id,
    steps,
    final_step_id: finalStepId,
    poll: {
      interval_ms: 2000,
      timeout_ms: 1200000,
    },
  };
}

export async function buildRequest(args) {
  return withPackageRuntimeScope(args?.runtime, () => buildRequestImpl(args));
}

export const __literatureAnalysisBuildRequestTestOnly = {
  resolveWorkflowParams,
};
