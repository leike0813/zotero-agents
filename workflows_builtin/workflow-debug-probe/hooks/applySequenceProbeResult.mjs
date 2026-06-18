function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveFinalPayload(args) {
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
  const payload = resolveFinalPayload(args);
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
    sequence: isRecord(args?.runResult?.sequence)
      ? args.runResult.sequence
      : undefined,
    rawResult: payload,
  };
}
