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
  if (payload.ok !== true) {
    throw new Error(
      `Host Bridge connectivity probe failed: ${String(
        payload.failure_code || "unknown",
      )}`,
    );
  }
  return {
    ok: true,
    checks: Array.isArray(payload.checks) ? payload.checks : [],
    connection: isRecord(payload.connection) ? payload.connection : {},
    diagnostics: isRecord(payload.diagnostics) ? payload.diagnostics : {},
    rawResult: payload,
  };
}
