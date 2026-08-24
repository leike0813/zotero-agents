function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readJsonCandidate(args) {
  const runResult = args?.runResult;
  if (isObject(runResult?.json)) return runResult.json;
  if (isObject(runResult?.resultJson)) return runResult.resultJson;
  if (isObject(runResult?.result_json)) return runResult.result_json;
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

export async function applyResult(args) {
  const plan = readJsonCandidate(args);
  if (!isObject(plan) || plan.kind !== "topic_plan" || plan.operation !== "reconcile") {
    throw new Error("topic planner applyResult requires a topic_plan/reconcile JSON result");
  }
  const applyTopicPlan = args?.runtime?.hostApi?.synthesis?.applyTopicPlan;
  if (typeof applyTopicPlan !== "function") {
    throw new Error("topic planner applyResult requires runtime.hostApi.synthesis.applyTopicPlan");
  }
  const result = await applyTopicPlan(plan);
  if (isObject(result) && result.status === "conflict") {
    const error = new Error("topic planner applyResult conflict; rerun from a fresh planning context");
    error.code = "topic_plan_conflict";
    error.structuredResult = result;
    throw error;
  }
  return result;
}
