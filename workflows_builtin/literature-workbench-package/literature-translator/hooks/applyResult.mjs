import { resolveSourcePathFromRequest } from "../../lib/deepReadingResultTarget.mjs";
import {
  appendSkillDiagnosticsToResult,
  collectSkillOutputDiagnostics,
  formatSkillDiagnosticsForError,
} from "../../lib/resultOutput.mjs";
import { withPackageRuntimeScope } from "../../lib/runtime.mjs";
import {
  materializeTranslatorArtifacts,
  materializeTranslatorArtifactTexts,
} from "../../lib/translatorArtifacts.mjs";

function normalizeString(value) {
  return String(value || "").trim();
}

function stringifyUnknownError(error) {
  if (error instanceof Error) {
    return error.message || error.name || "unknown error";
  }
  if (!error || typeof error !== "object") {
    return String(error || "unknown error");
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "unknown object error";
  }
}

function getResultJsonFromRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }
  const candidate = record.resultJson;
  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
    return candidate;
  }
  return null;
}

async function readResultJson({ bundleReader, resultContext, runResult }) {
  if (
    resultContext &&
    typeof resultContext === "object" &&
    "resultJson" in resultContext
  ) {
    return resultContext.resultJson;
  }
  const fromRunResult = getResultJsonFromRecord(runResult);
  if (fromRunResult) {
    return fromRunResult;
  }
  try {
    return JSON.parse(await bundleReader.readText("result/result.json"));
  } catch {
    return {};
  }
}

async function readTranslatorArtifactTexts({
  resultContext,
  outputPath,
  alignmentPath,
  targetLanguage,
}) {
  if (!resultContext || typeof resultContext.readArtifactText !== "function") {
    return null;
  }
  const output = await resultContext.readArtifactText({
    fieldName: "output_path",
    rawPath: outputPath,
    fallbackPath: `output_${targetLanguage}.md`,
  });
  const alignment = await resultContext.readArtifactText({
    fieldName: "alignment_path",
    rawPath: alignmentPath,
    fallbackPath: "alignment.json",
  });
  return {
    outputText: output.text,
    alignmentText: alignment.text,
  };
}

async function applyResultImpl({
  parent,
  bundleReader,
  request,
  resultContext,
  runResult,
  runtime,
}) {
  let stage = "resolve-result";
  let skillOutputDiagnostics = { warnings: [] };
  try {
    const parentItem = runtime.helpers.resolveItemRef(parent);
    const result = await readResultJson({
      bundleReader,
      resultContext,
      runResult,
    });
    skillOutputDiagnostics = collectSkillOutputDiagnostics(result);

    stage = "resolve-paths";
    const sourcePath =
      resolveSourcePathFromRequest(request) ||
      normalizeString(result?.provenance?.source_path);
    const outputPath = normalizeString(result?.output_path);
    const alignmentPath = normalizeString(result?.alignment_path);
    const targetLanguage =
      normalizeString(result?.provenance?.target_language) ||
      normalizeString(request?.parameter?.target_language) ||
      normalizeString(request?.steps?.[0]?.parameter?.target_language) ||
      "zh-CN";
    if (!sourcePath) {
      throw new Error("source path is unavailable");
    }
    stage = "materialize-artifacts";
    let artifactTexts = null;
    try {
      artifactTexts = await readTranslatorArtifactTexts({
        resultContext,
        outputPath,
        alignmentPath,
        targetLanguage,
      });
    } catch {
      artifactTexts = null;
    }
    const materialized = artifactTexts
      ? await materializeTranslatorArtifactTexts({
          parentItem,
          runtime,
          sourcePath,
          targetLanguage,
          outputText: artifactTexts.outputText,
          alignmentText: artifactTexts.alignmentText,
        })
      : await materializeTranslatorArtifacts({
          parentItem,
          runtime,
          sourcePath,
          targetLanguage,
          outputPath,
          alignmentPath,
        });

    return appendSkillDiagnosticsToResult(
      {
        ok: true,
        source_path: sourcePath,
        output_path: outputPath,
        alignment_path: alignmentPath,
        markdown_path: materialized.markdownPath,
        materialized_alignment_path: materialized.alignmentPath,
        target_language: targetLanguage,
        attached_to_parent_id: parentItem.id,
        attachment_id: materialized.attachment?.id || null,
        attachment_key: normalizeString(materialized.attachment?.key),
      },
      skillOutputDiagnostics,
    );
  } catch (error) {
    throw new Error(
      `literature-translator applyResult failed at ${stage}: ${stringifyUnknownError(error)}${formatSkillDiagnosticsForError(skillOutputDiagnostics)}`,
    );
  }
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}

export const __literatureTranslatorApplyResultTestOnly = {
  getResultJsonFromRecord,
};
