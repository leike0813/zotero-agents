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
    throw new Error("topic synthesis applyResult requires a JSON result bundle");
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

async function readMarkdownArtifact(args, bundle) {
  if (normalizeString(bundle.markdown)) {
    throw new Error("topic synthesis result must not embed markdown");
  }
  if (normalizeString(bundle.operation)) {
    if (normalizeString(bundle.markdown_path)) {
      throw new Error(
        "structured topic synthesis result must not depend on markdown_path",
      );
    }
    return "";
  }
  const markdownPath = normalizeString(
    bundle.markdown_path || bundle.artifact_metadata?.markdown_path,
  );
  if (!markdownPath) {
    throw new Error("topic synthesis result requires markdown_path");
  }
  const resultContext = args?.resultContext;
  if (typeof resultContext?.resolveArtifact === "function") {
    const artifact = await resultContext.resolveArtifact({
      fieldName: "markdown_path",
      rawPath: markdownPath,
      fallbackPath: "result/synthesis.md",
    });
    return artifact.text;
  }
  if (typeof args?.bundleReader?.readText === "function") {
    return args.bundleReader.readText(markdownPath);
  }
  throw new Error("topic synthesis applyResult cannot read markdown_path artifact");
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
  const markdown = await readMarkdownArtifact(args, bundle);
  const applyTopicSynthesisResult =
    args?.runtime?.hostApi?.synthesis?.applyTopicSynthesisResult;
  if (typeof applyTopicSynthesisResult !== "function") {
    throw new Error(
      "topic synthesis applyResult requires runtime.hostApi.synthesis.applyTopicSynthesisResult",
    );
  }
  const result = await applyTopicSynthesisResult(
    normalizeString(bundle.operation)
      ? {
          ...bundle,
          artifact_metadata: {
            ...(isObject(bundle.artifact_metadata) ? bundle.artifact_metadata : {}),
          },
        }
      : {
          ...bundle,
          markdown,
          artifact_metadata: {
            ...(isObject(bundle.artifact_metadata) ? bundle.artifact_metadata : {}),
            markdown_path: normalizeString(bundle.markdown_path),
          },
        },
    {
      manifest: args?.manifest,
      parent: args?.parent,
      request: args?.request,
      resultContext: args?.resultContext,
      bundleReader: args?.bundleReader,
    },
  );
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
