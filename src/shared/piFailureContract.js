/**
 * Canonical Pi failure identity and classification.
 *
 * One observed failure gets one {@link PiFailureCore}. The owning module
 * commits it to its canonical transcript; every higher projection (turn,
 * owner, audit, export) references the same `failureId` instead of
 * re-classifying or re-describing the cause. A core carries no message, stack,
 * exception cause, credential or free-form detail: those stay in the owner
 * that produced them, if anywhere.
 */
/** Canonical owner-transcript fact kinds for failure observations. */
export const PI_FAILURE_KINDS = ["failure_observed"];
// Single source of truth for classification and severity. Both the Runtime and
// the Tool Gateway project through this table, so a code means one thing
// everywhere. `origin` is accepted (and ignored) so callers can pass their own
// origin for readability without forking the policy.
const POLICY = {
    // Provider / model availability
    credential_missing: {
        level: "error",
        category: "availability",
        retryable: false,
    },
    provider_auth_failed: {
        level: "error",
        category: "availability",
        retryable: true,
    },
    unsupported_provider: {
        level: "error",
        category: "contract",
        retryable: false,
    },
    unsupported_model: { level: "error", category: "contract", retryable: false },
    provider_unavailable: {
        level: "error",
        category: "availability",
        retryable: true,
    },
    provider_rate_limited: {
        level: "warn",
        category: "availability",
        retryable: true,
    },
    provider_network_error: {
        level: "error",
        category: "availability",
        retryable: true,
    },
    provider_http_error: {
        level: "error",
        category: "availability",
        retryable: true,
    },
    provider_stream_error: {
        level: "error",
        category: "availability",
        retryable: true,
    },
    // Runtime / preparation
    provider_timeout: {
        level: "warn",
        category: "availability",
        retryable: true,
    },
    model_failed: { level: "error", category: "execution", retryable: true },
    runtime_failed: { level: "error", category: "execution", retryable: true },
    preparation_failed: {
        level: "error",
        category: "contract",
        retryable: false,
    },
    agent_loop_limit_exceeded: {
        level: "warn",
        category: "resource",
        retryable: false,
    },
    // Gateway
    invalid_request: { level: "warn", category: "input", retryable: false },
    policy_denied: { level: "warn", category: "policy", retryable: false },
    security_denied: { level: "warn", category: "policy", retryable: false },
    capability_unavailable: {
        level: "warn",
        category: "availability",
        retryable: true,
    },
    resource_limited: { level: "warn", category: "resource", retryable: true },
    persistence_failed: {
        level: "error",
        category: "persistence",
        retryable: true,
    },
    owner_busy: { level: "info", category: "lifecycle", retryable: true },
    cleanup_pending: { level: "warn", category: "resource", retryable: true },
    execution_failed: { level: "error", category: "execution", retryable: true },
    // A logical tool deadline: the caller stops waiting, but the effect's
    // outcome stays unknown until the physical claim settles.
    execution_timeout: { level: "warn", category: "lifecycle", retryable: true },
    // Cancellation / lifecycle
    aborted: { level: "info", category: "lifecycle", retryable: true },
    canceled: { level: "info", category: "lifecycle", retryable: true },
    // Integrity
    transcript_integrity_failed: {
        level: "error",
        category: "integrity",
        retryable: false,
    },
    pi_transcript_corrupt: {
        level: "error",
        category: "integrity",
        retryable: false,
    },
    pi_transcript_torn_tail: {
        level: "warn",
        category: "integrity",
        retryable: true,
    },
    // Owner / run
    admission_failed: { level: "error", category: "lifecycle", retryable: false },
    compaction_failed: {
        level: "warn",
        category: "persistence",
        retryable: true,
    },
    skill_run_preparation_failed: {
        level: "error",
        category: "contract",
        retryable: false,
    },
    skill_run_execution_failed: {
        level: "error",
        category: "execution",
        retryable: true,
    },
    skill_result_finalization_failed: {
        level: "error",
        category: "persistence",
        retryable: true,
    },
    skill_result_not_submitted: {
        level: "error",
        category: "contract",
        retryable: false,
    },
    invalid_execution_mode: {
        level: "error",
        category: "contract",
        retryable: false,
    },
    tool_effect_unknown: {
        level: "error",
        category: "execution",
        retryable: true,
    },
    title_failed: { level: "warn", category: "execution", retryable: true },
    record_failed: { level: "error", category: "persistence", retryable: true },
    // Audit / export
    audit_gap: { level: "warn", category: "persistence", retryable: true },
    diagnostic_export_failed: {
        level: "error",
        category: "persistence",
        retryable: true,
    },
};
// An unmapped code is still a failure. It must never degrade to info-level:
// a code this table has not seen is a gap in the table, not a benign event.
const UNMAPPED = {
    level: "error",
    category: "execution",
    retryable: false,
};
export function getPiFailurePolicy(code, _origin) {
    const policy = POLICY[code];
    return policy ? { ...policy } : { ...UNMAPPED };
}
/**
 * Narrowing guard over the canonical code set. Export uses it so an unknown
 * stored code is classified structurally and reported as an evidence gap
 * rather than trusted as a known classification.
 */
export function isPiFailureCode(code) {
    return typeof code === "string" && Object.hasOwn(POLICY, code);
}
export function createPiFailureCore(input) {
    const policy = getPiFailurePolicy(input.code, input.origin);
    return {
        failureId: input.failureId,
        origin: input.origin,
        code: input.code,
        category: policy.category,
        retryable: policy.retryable,
        severity: policy.level,
        effectCertainty: input.effectCertainty ?? "not_applicable",
        createdAt: input.at ?? new Date().toISOString(),
    };
}
