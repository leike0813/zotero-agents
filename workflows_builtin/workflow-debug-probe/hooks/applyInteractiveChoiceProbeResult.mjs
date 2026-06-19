function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolvePayload(args) {
  if (isRecord(args?.resultContext?.resultJson)) {
    return args.resultContext.resultJson;
  }
  const runResult = args?.runResult;
  if (isRecord(runResult?.resultJson)) {
    return runResult.resultJson;
  }
  return {};
}

export async function applyResult(args) {
  const payload = resolvePayload(args);
  if (payload.ok !== true || payload.accepted_any_reply !== true) {
    throw new Error("Debug interactive choice probe did not complete");
  }
  return {
    ok: true,
    kind: String(payload.kind || ""),
    acceptedAnyReply: true,
    message: String(payload.message || ""),
    warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
    rawResult: payload,
  };
}
