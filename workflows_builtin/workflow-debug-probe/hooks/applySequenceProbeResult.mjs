function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveFinalPayload(runResult) {
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
  const payload = resolveFinalPayload(args?.runResult);
  const status = String(payload.status || "").trim();
  if (status !== "ok") {
    throw new Error(
      `debug sequence probe failed: ${String(payload.probe_id || "unknown")} status=${status || "missing"}`,
    );
  }
  return {
    ok: true,
    probeId: String(payload.probe_id || ""),
    checks: Array.isArray(payload.checks) ? payload.checks : [],
    sequence: isRecord(args?.runResult?.responseJson?.sequence)
      ? args.runResult.responseJson.sequence
      : undefined,
    rawResult: payload,
  };
}
