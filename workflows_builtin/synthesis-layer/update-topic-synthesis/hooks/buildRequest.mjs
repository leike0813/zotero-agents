function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : undefined;
}

function resolveRecommendedUpdate(context) {
  const recommended = isObject(context?.recommended_update)
    ? context.recommended_update
    : {};
  const prefill = isObject(recommended.prefill) ? recommended.prefill : {};
  return { recommended, prefill };
}

export async function buildRequest({ manifest, executionOptions, runtime }) {
  const workflowParams = isObject(executionOptions?.workflowParams)
    ? executionOptions.workflowParams
    : {};
  const topicId = normalizeString(workflowParams.topicId);
  if (!topicId) {
    throw new Error("update-topic-synthesis requires topicId");
  }

  const synthesis = runtime?.hostApi?.synthesis;
  if (!synthesis || typeof synthesis.getTopicContext !== "function") {
    throw new Error("Host synthesis service is unavailable for update-topic-synthesis");
  }

  const context = await synthesis.getTopicContext({
    topicId,
    mode: "update",
    includeArtifact: false,
    includeManifest: false,
  });
  const { recommended, prefill } = resolveRecommendedUpdate(context);
  if (recommended.allowed === false) {
    throw new Error(`Topic does not need update: ${topicId}`);
  }
  const parameter = {
    topicId,
    language:
      normalizeString(prefill.language) ||
      normalizeString(context?.language) ||
      "auto",
    updateScope:
      normalizeString(prefill.updateScope) ||
      normalizeString(recommended.scope) ||
      "auto",
    updateMode:
      normalizeString(prefill.updateMode) ||
      normalizeString(recommended.mode) ||
      "auto",
    updateReason:
      normalizeString(prefill.updateReason) ||
      normalizeString(recommended.reason) ||
      "manual",
  };
  const timeoutMs = normalizePositiveInteger(manifest?.execution?.timeout_ms);
  const pollIntervalMs = normalizePositiveInteger(
    manifest?.execution?.poll_interval_ms,
  );
  const poll =
    timeoutMs || pollIntervalMs
      ? {
          ...(pollIntervalMs ? { interval_ms: pollIntervalMs } : {}),
          ...(timeoutMs ? { timeout_ms: timeoutMs } : {}),
        }
      : undefined;

  return {
    kind: "skillrunner.job.v1",
    taskName: `Update synthesis: ${topicId}`,
    skill_id: "update-topic-synthesis",
    parameter,
    input: {
      topicId,
      host_derived_update: {
        ...parameter,
        recommended_update: recommended,
      },
    },
    ...(poll ? { poll } : {}),
    fetch_type: manifest?.result?.fetch?.type === "bundle" ? "bundle" : "result",
  };
}
