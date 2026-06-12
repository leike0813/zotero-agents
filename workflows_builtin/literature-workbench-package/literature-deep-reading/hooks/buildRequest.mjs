import { buildLiteratureDeepReadingSourceBundle } from "../../lib/literatureDeepReadingBundle.mjs";
import { withPackageRuntimeScope } from "../../lib/runtime.mjs";
import { resolveParentItemFromSelection } from "../../lib/tagRegulatorRequest.mjs";

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
  const sourceBundle = await buildLiteratureDeepReadingSourceBundle({
    sourceEntry,
    parentItem,
    runtime,
    workflowParams,
  });

  return {
    kind: "skillrunner.job.v1",
    skill_id: "literature-deep-reading",
    sourceAttachmentPaths: [sourceBundle.sourcePath],
    targetParentID: parentItem.id,
    input: {
      source_bundle_path: "source_bundle_path/source_bundle.zip",
    },
    parameter: {
      target_language: workflowParams.target_language,
    },
    upload_files: [
      {
        key: "source_bundle_path",
        path: sourceBundle.bundlePath,
      },
    ],
    fetch_type: "bundle",
    poll: {
      interval_ms: 2000,
      timeout_ms: 1800000,
    },
    context: {
      source_bundle_path: sourceBundle.bundlePath,
      source_manifest: sourceBundle.manifest,
    },
  };
}

export async function buildRequest(args) {
  return withPackageRuntimeScope(args?.runtime, () => buildRequestImpl(args));
}

export const __literatureDeepReadingBuildRequestTestOnly = {
  resolveWorkflowParams,
};
