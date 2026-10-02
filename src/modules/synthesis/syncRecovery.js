function cleanString(value) {
    return String(value || "").trim();
}
function diagnostic(code, message, severity = "warning") {
    return { code, message, severity };
}
function sortDiagnostics(diagnostics) {
    return [...diagnostics].sort((left, right) => left.code.localeCompare(right.code));
}
function addAction(actions, action) {
    if (!actions.includes(action)) {
        actions.push(action);
    }
}
export function normalizeConflictCandidates(candidates) {
    return candidates
        .map((candidate) => {
        const status = candidate.status === "cleared" ? "cleared" : "open";
        return {
            id: cleanString(candidate.id),
            topic_id: cleanString(candidate.topic_id),
            created_at: cleanString(candidate.created_at),
            bundle_hash: cleanString(candidate.bundle_hash),
            reason: cleanString(candidate.reason) || "base_hash_mismatch",
            status,
        };
    })
        .filter((candidate) => candidate.id && candidate.status === "open")
        .sort((left, right) => right.created_at.localeCompare(left.created_at) ||
        left.id.localeCompare(right.id));
}
export function buildConflictCandidateActions(candidate) {
    return [
        {
            action: "retry_update",
            candidate_id: candidate.id,
            localOnly: true,
        },
        {
            action: "clear_conflict_candidate",
            candidate_id: candidate.id,
            localOnly: true,
        },
    ];
}
export function assessSynthesisSyncRecovery(input) {
    const conflicts = normalizeConflictCandidates(input.conflicts);
    const diagnostics = [];
    const allowedActions = [];
    let status = "ready";
    if (input.root.state === "unbound" || input.root.state === "missing") {
        status = "missing_root";
        diagnostics.push(diagnostic("root_missing", input.root.state === "unbound"
            ? "Synthesis root is not bound"
            : "Synthesis root is missing", input.root.state === "unbound" ? "warning" : "error"));
        addAction(allowedActions, "rebind_root");
    }
    if (input.localIndexes.state === "missing" ||
        input.localIndexes.state === "corrupt") {
        if (status === "ready") {
            status = "index_dirty";
        }
        diagnostics.push(diagnostic(input.localIndexes.state === "corrupt"
            ? "local_index_corrupt"
            : "local_index_missing", `Local indexes are ${input.localIndexes.state}`, "info"));
        addAction(allowedActions, "rebuild_local_indexes");
    }
    if (conflicts.length) {
        diagnostics.push(diagnostic("conflict_candidates_present", `${conflicts.length} local conflict candidate(s) are pending`, "warning"));
        addAction(allowedActions, "retry_update");
        addAction(allowedActions, "clear_conflict_candidate");
    }
    return {
        status,
        diagnostics: sortDiagnostics(diagnostics),
        allowedActions,
        requiresConfirmation: false,
        autoOverwriteCanonical: false,
        conflictCandidates: conflicts,
    };
}
export function planStartupSyncCheck(args) {
    if (!args.runHashCheckOnStartup) {
        return {
            status: "check_skipped",
            diagnostics: [],
            allowedActions: [],
            requiresConfirmation: false,
            autoOverwriteCanonical: false,
            conflictCandidates: normalizeConflictCandidates(args.assessment.conflicts),
        };
    }
    return assessSynthesisSyncRecovery(args.assessment);
}
