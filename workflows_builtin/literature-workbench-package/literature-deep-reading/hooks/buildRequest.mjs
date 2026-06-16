import { buildLiteratureDeepReadingSourceBundle } from "../../lib/literatureDeepReadingBundle.mjs";
import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";
import { resolveParentItemFromSelection } from "../../lib/tagRegulatorRequest.mjs";
import { findExistingTranslatorAlignment } from "../../lib/translatorArtifacts.mjs";

function normalizeString(value) {
  return String(value || "").trim();
}

function collectAttachments(selectionContext) {
  const attachments = selectionContext?.items?.attachments;
  return Array.isArray(attachments) ? attachments : [];
}

function resolveWorkflowParams(executionOptions) {
  const workflowParams = executionOptions?.workflowParams || {};
  return {
    target_language: normalizeString(workflowParams.target_language) || "zh-CN",
  };
}

async function buildRequestImpl({
  selectionContext,
  executionOptions,
  runtime,
}) {
  const attachments = collectAttachments(selectionContext);
  if (attachments.length === 0) {
    throw new Error(
      "literature-deep-reading buildRequest requires one source attachment",
    );
  }
  const sourceEntry = attachments[0];
  const parentItem = resolveParentItemFromSelection(selectionContext, runtime);
  const workflowParams = resolveWorkflowParams(executionOptions);
  const sourcePath = await runtime.helpers.getAttachmentFilePath?.(sourceEntry) ||
    sourceEntry?.filePath ||
    sourceEntry?.path ||
    sourceEntry?.item?.filePath;
  const existingAlignment = await findExistingTranslatorAlignment({
    sourcePath,
    targetLanguage: workflowParams.target_language,
    hostApi: requireHostApi(runtime),
  });
  const sourceBundle = await buildLiteratureDeepReadingSourceBundle({
    sourceEntry,
    parentItem,
    runtime,
    workflowParams,
    translatorAlignmentPath:
      existingAlignment.status === "available" ? existingAlignment.path : "",
  });

  const deepReadingStep = {
    id: "deep_reading",
    skill_id: "literature-deep-reading",
    workspace: existingAlignment.status === "available" ? "new" : "reuse-workflow",
    fetch_type: "bundle",
    apply_result: {
      workflow_id: "literature-deep-reading",
      on_failure: "continue",
    },
    input: {
      source_bundle_path: sourceBundle.bundlePath,
    },
    parameter: {
      target_language: workflowParams.target_language,
    },
  };
  if (existingAlignment.status !== "available") {
    deepReadingStep.handoff = {
      from_step: "translate",
      required: false,
      pass_through: false,
      input: {
        translator_alignment_path: "alignment_path",
        translator_output_path: "output_path",
        translator_status: "status",
      },
    };
  }

  const steps =
    existingAlignment.status === "available"
      ? [deepReadingStep]
      : [
          {
            id: "translate",
            skill_id: "literature-translator",
            workspace: "new",
            fetch_type: "bundle",
            apply_result: {
              workflow_id: "literature-translator",
              on_failure: "continue",
            },
            input: {
              source_path: sourceBundle.sourcePath,
            },
            parameter: {
              target_language: workflowParams.target_language,
            },
          },
          deepReadingStep,
        ];

  return {
    kind: "skillrunner.sequence.v1",
    sourceAttachmentPaths: [sourceBundle.sourcePath],
    targetParentID: parentItem.id,
    steps,
    final_step_id: "deep_reading",
    parameter: {
      target_language: workflowParams.target_language,
    },
    poll: {
      interval_ms: 2000,
      timeout_ms: 1800000,
    },
    context: {
      source_bundle_path: sourceBundle.bundlePath,
      source_manifest: sourceBundle.manifest,
      translator_alignment_path:
        existingAlignment.status === "available" ? existingAlignment.path : "",
      translator_alignment_status: existingAlignment.status,
    },
  };
}

export async function buildRequest(args) {
  return withPackageRuntimeScope(args?.runtime, () => buildRequestImpl(args));
}

export const __literatureDeepReadingBuildRequestTestOnly = {
  resolveWorkflowParams,
};
