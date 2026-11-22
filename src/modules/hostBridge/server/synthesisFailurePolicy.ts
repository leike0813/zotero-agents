const RETRYABLE_SYNTHESIS_REASONS = new Set([
  "transport_unavailable",
  "foreground_search_queue_full",
  "service_not_ready",
]);

export function synthesisFailureReasonCode(
  details: Record<string, unknown> | undefined,
  errorCode: unknown,
) {
  return (
    details?.sidecarReason ??
    details?.reasonCode ??
    details?.reason ??
    errorCode
  );
}

export function isRetryableHostBridgeSynthesisFailure(args: {
  errorCode: unknown;
  reasonCode: unknown;
  retryable: unknown;
}) {
  return (
    args.errorCode === "unavailable" &&
    args.retryable === true &&
    typeof args.reasonCode === "string" &&
    RETRYABLE_SYNTHESIS_REASONS.has(args.reasonCode)
  );
}
