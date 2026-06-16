import { collectSelectedLiteratureSources } from "../../lib/sourceSelection.mjs";
import { resolveAttachmentSourcePath } from "../../lib/deepReadingResultTarget.mjs";
import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";
import { resolveTranslatorArtifactTargetPaths } from "../../lib/translatorArtifacts.mjs";

function normalizeString(value) {
  return String(value || "").trim();
}

function resolveWorkflowParams(executionOptions) {
  const workflowParams = executionOptions?.workflowParams || {};
  return {
    targetLanguage:
      normalizeString(workflowParams.target_language) || "zh-CN",
  };
}

export function resolveTranslatorMarkdownTargetPath(sourcePath, targetLanguage) {
  return resolveTranslatorArtifactTargetPaths(sourcePath, targetLanguage)
    .markdownPath;
}

async function hasTranslatorMarkdownTarget(entry, runtime, targetLanguage) {
  const sourcePath = await resolveAttachmentSourcePath(entry, runtime);
  const targetPath = resolveTranslatorMarkdownTargetPath(
    sourcePath,
    targetLanguage,
  );
  if (!targetPath) {
    return true;
  }
  const hostApi = requireHostApi(runtime);
  return hostApi.file.exists(targetPath);
}

async function filterInputsImpl({ selectionContext, executionOptions, runtime }) {
  const helpers = runtime.helpers;
  const params = resolveWorkflowParams(executionOptions);
  const chosen = collectSelectedLiteratureSources({
    selectionContext,
    helpers,
  });
  const accepted = [];
  const skipped = [];
  for (const entry of chosen) {
    if (await hasTranslatorMarkdownTarget(entry, runtime, params.targetLanguage)) {
      skipped.push(entry);
      continue;
    }
    accepted.push(entry);
  }

  if (console && typeof console.info === "function" && skipped.length > 0) {
    console.info(
      `[literature-translator/filterInputs] skipped existing translations: ${JSON.stringify(skipped.map((entry) => entry?.item?.id || entry?.filePath || ""))}`,
    );
  }

  return helpers.withFilteredAttachments(selectionContext, accepted);
}

export async function filterInputs(args) {
  return withPackageRuntimeScope(args?.runtime, () => filterInputsImpl(args));
}

export const __literatureTranslatorFilterInputsTestOnly = {
  resolveTranslatorMarkdownTargetPath,
  resolveWorkflowParams,
};
