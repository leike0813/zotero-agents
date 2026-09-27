import { buildLiteratureDeepReadingSourceBundle } from "../../lib/literatureDeepReadingBundle.mjs";
import {
  portableItemRef,
  requireHostApi,
  resolveAttachmentPath,
  resolveSelectionParentRef,
  selectionItems,
  withPackageRuntimeScope,
} from "../../lib/runtime.mjs";
import { findExistingTranslatorAlignment } from "../../lib/translatorArtifacts.mjs";

function normalizeString(value) {
  return String(value || "").trim();
}

function resolveWorkflowParams(executionOptions) {
  const workflowParams = executionOptions?.workflowParams || {};
  return {
    target_language: normalizeString(workflowParams.target_language) || "zh-CN",
    mode: normalizeString(workflowParams.mode) || "fast",
  };
}

async function buildRequestImpl({
  selectionContext,
  executionOptions,
  manifest,
  runtime,
}) {
  const sourceEntry = selectionItems(selectionContext).find(
    (item) => item?.kind === "attachment",
  );
  if (!sourceEntry?.ref) {
    throw new Error(
      "literature-deep-reading buildRequest requires one source attachment",
    );
  }
  const sourceAttachmentRef = portableItemRef(sourceEntry.ref);
  const parentRef = portableItemRef(
    resolveSelectionParentRef(selectionContext),
  );
  const parentDetail =
    await requireHostApi(runtime).library.getItemDetail(parentRef);
  if (parentDetail?.kind !== "regular") {
    throw new Error("literature-deep-reading requires one regular parent item");
  }
  const parentItem = parentDetail.item;
  const workflowParams = resolveWorkflowParams(executionOptions);
  const sourcePath = await resolveAttachmentPath(sourceAttachmentRef, runtime);
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
    workflowId: manifest?.id || "literature-deep-reading",
    translatorAlignmentPath:
      existingAlignment.status === "available" ? existingAlignment.path : "",
  });

  const deepReadingStep = {
    id: "deep_reading",
    skill_id: "literature-deep-reading",
    mode: "auto",
    workspace:
      existingAlignment.status === "available" ? "new" : "reuse-workflow",
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
      bindings: [
        {
          kind: "value",
          step: "translate",
          source: "alignment_path",
          target: "/input/translator_alignment_path",
          required: false,
        },
        {
          kind: "value",
          step: "translate",
          source: "output_path",
          target: "/input/translator_output_path",
          required: false,
        },
        {
          kind: "value",
          step: "translate",
          source: "status",
          target: "/input/translator_status",
          required: false,
        },
      ],
    };
  }

  const steps =
    existingAlignment.status === "available"
      ? [deepReadingStep]
      : [
          {
            id: "translate",
            skill_id: "literature-translator",
            mode: "auto",
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
              mode: workflowParams.mode,
            },
          },
          deepReadingStep,
        ];

  return {
    kind: "skillrunner.sequence.v1",
    sourceAttachmentRefs: [sourceAttachmentRef],
    targetParentRef: parentRef,
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
