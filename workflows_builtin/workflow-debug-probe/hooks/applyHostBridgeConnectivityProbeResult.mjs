function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolvePayload(runResult) {
  if (isRecord(runResult?.resultJson)) {
    return runResult.resultJson;
  }
  if (isRecord(runResult?.responseJson?.result)) {
    return runResult.responseJson.result;
  }
  if (isRecord(runResult?.responseJson)) {
    return runResult.responseJson;
  }
  if (isRecord(runResult)) {
    return runResult;
  }
  return {};
}

export async function applyResult(args) {
  const payload = resolvePayload(args?.runResult);
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
