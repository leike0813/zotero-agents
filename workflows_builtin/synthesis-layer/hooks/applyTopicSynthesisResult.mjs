import { materializeTopicApplyRequest } from "../lib/topicApplyRequest.mjs";

function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readJsonCandidate(args) {
  const runResult = args?.runResult;
  if (isObject(runResult?.json)) {
    return runResult.json;
  }
  if (isObject(runResult?.resultJson)) {
    return runResult.resultJson;
  }
  if (isObject(runResult?.result_json)) {
    return runResult.result_json;
  }
  if (isObject(args?.resultContext?.resultJson)) {
    return args.resultContext.resultJson;
  }
  if (typeof runResult?.text === "string") {
    try {
      return JSON.parse(runResult.text);
    } catch {
      return null;
    }
  }
  return null;
}

function requireBundleCandidate(bundle) {
  if (!isObject(bundle)) {
    throw new Error(
      "topic synthesis applyResult requires a JSON result bundle",
    );
  }
  return bundle;
}

function normalizeString(value) {
  return String(value || "").trim();
}

function isCanceledBundle(bundle) {
  return (
    normalizeString(bundle?.kind) === "topic_synthesis_canceled" ||
    normalizeString(bundle?.status) === "canceled"
  );
}

function requireClosedBundle(bundle) {
  if (normalizeString(bundle.markdown)) {
    throw new Error("topic synthesis result must not embed markdown");
  }
  if (normalizeString(bundle.markdown_path)) {
    throw new Error("topic synthesis result must not depend on markdown_path");
  }
}

export async function applyResult(args) {
  const bundle = requireBundleCandidate(readJsonCandidate(args));
  if (isCanceledBundle(bundle)) {
    return {
      ok: true,
      status: "canceled",
      skipped: true,
      reason: normalizeString(bundle.reason) || "user_cancelled",
      message: normalizeString(bundle.message) || "topic synthesis canceled",
      topicId:
        normalizeString(bundle.topic_id) ||
        normalizeString(bundle.duplicate_topic_id) ||
        undefined,
    };
  }
  requireClosedBundle(bundle);
  const applyTopicSynthesisResult =
    args?.runtime?.hostApi?.synthesis?.workflowApply?.applyTopicSynthesisResult;
  if (typeof applyTopicSynthesisResult !== "function") {
    throw new Error(
      "topic synthesis applyResult requires Workflow Host topic-synthesis apply",
    );
  }
  const request = await materializeTopicApplyRequest(
    {
      ...bundle,
      artifact_metadata: isObject(bundle.artifact_metadata)
        ? bundle.artifact_metadata
        : {},
    },
    {
      resultContext: args?.resultContext,
      bundleReader: args?.bundleReader,
    },
  );
  const result = await applyTopicSynthesisResult(request);
  if (isObject(result) && result.ok === false) {
    const status = normalizeString(result.status) || "failed";
    const topicId = normalizeString(result.topicId);
    const error = new Error(
      `topic synthesis applyResult ${status}${topicId ? ` for ${topicId}` : ""}`,
    );
    error.structuredResult = result;
    error.code = status;
    error.warnings = Array.isArray(result.warnings) ? result.warnings : [];
    throw error;
  }
  return result;
}
