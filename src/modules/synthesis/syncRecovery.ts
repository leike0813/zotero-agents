export type SynthesisSyncAction =
  | "rebind_root"
  | "rebuild_local_indexes"
  | "clear_conflict_candidate"
  | "retry_update";

export type SynthesisSyncStatus =
  | "ready"
  | "missing_root"
  | "index_dirty"
  | "check_skipped";

export type SynthesisSyncDiagnostic = {
  code:
    | "root_missing"
    | "local_index_corrupt"
    | "local_index_missing"
    | "conflict_candidates_present";
  severity: "info" | "warning" | "error";
  message: string;
};

export type SynthesisConflictCandidate = {
  id: string;
  topic_id: string;
  created_at: string;
  bundle_hash: string;
  reason: "base_hash_mismatch" | "divergent_canonical" | string;
  status: "open" | "cleared";
};

export type SynthesisSyncAssessmentInput = {
  root: {
    state: "unbound" | "missing" | "ready";
  };
  localIndexes: {
    state: "healthy" | "missing" | "corrupt";
  };
  conflicts: Array<Partial<SynthesisConflictCandidate>>;
};

export type SynthesisSyncRecoveryAssessment = {
  status: SynthesisSyncStatus;
  diagnostics: SynthesisSyncDiagnostic[];
  allowedActions: SynthesisSyncAction[];
  requiresConfirmation: boolean;
  autoOverwriteCanonical: false;
  conflictCandidates: SynthesisConflictCandidate[];
};

export type ConflictCandidateAction = {
  action: "retry_update" | "clear_conflict_candidate";
  candidate_id: string;
  localOnly: true;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function diagnostic(
  code: SynthesisSyncDiagnostic["code"],
  message: string,
  severity: SynthesisSyncDiagnostic["severity"] = "warning",
): SynthesisSyncDiagnostic {
  return { code, message, severity };
}

function sortDiagnostics(diagnostics: SynthesisSyncDiagnostic[]) {
  return [...diagnostics].sort((left, right) =>
    left.code.localeCompare(right.code),
  );
}

function addAction(
  actions: SynthesisSyncAction[],
  action: SynthesisSyncAction,
) {
  if (!actions.includes(action)) {
    actions.push(action);
  }
}

export function normalizeConflictCandidates(
  candidates: Array<Partial<SynthesisConflictCandidate>>,
): SynthesisConflictCandidate[] {
  return candidates
    .map((candidate): SynthesisConflictCandidate => {
      const status: SynthesisConflictCandidate["status"] =
        candidate.status === "cleared" ? "cleared" : "open";
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
    .sort(
      (left, right) =>
        right.created_at.localeCompare(left.created_at) ||
        left.id.localeCompare(right.id),
    );
}

export function buildConflictCandidateActions(
  candidate: SynthesisConflictCandidate,
): ConflictCandidateAction[] {
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

export function assessSynthesisSyncRecovery(
  input: SynthesisSyncAssessmentInput,
): SynthesisSyncRecoveryAssessment {
  const conflicts = normalizeConflictCandidates(input.conflicts);
  const diagnostics: SynthesisSyncDiagnostic[] = [];
  const allowedActions: SynthesisSyncAction[] = [];
  let status: SynthesisSyncStatus = "ready";

  if (input.root.state === "unbound" || input.root.state === "missing") {
    status = "missing_root";
    diagnostics.push(
      diagnostic(
        "root_missing",
        input.root.state === "unbound"
          ? "Synthesis root is not bound"
          : "Synthesis root is missing",
        input.root.state === "unbound" ? "warning" : "error",
      ),
    );
    addAction(allowedActions, "rebind_root");
  }

  if (
    input.localIndexes.state === "missing" ||
    input.localIndexes.state === "corrupt"
  ) {
    if (status === "ready") {
      status = "index_dirty";
    }
    diagnostics.push(
      diagnostic(
        input.localIndexes.state === "corrupt"
          ? "local_index_corrupt"
          : "local_index_missing",
        `Local indexes are ${input.localIndexes.state}`,
        "info",
      ),
    );
    addAction(allowedActions, "rebuild_local_indexes");
  }

  if (conflicts.length) {
    diagnostics.push(
      diagnostic(
        "conflict_candidates_present",
        `${conflicts.length} local conflict candidate(s) are pending`,
        "warning",
      ),
    );
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

export function planStartupSyncCheck(args: {
  runHashCheckOnStartup: boolean;
  assessment: SynthesisSyncAssessmentInput;
}): SynthesisSyncRecoveryAssessment {
  if (!args.runHashCheckOnStartup) {
    return {
      status: "check_skipped",
      diagnostics: [],
      allowedActions: [],
      requiresConfirmation: false,
      autoOverwriteCanonical: false,
      conflictCandidates: normalizeConflictCandidates(
        args.assessment.conflicts,
      ),
    };
  }
  return assessSynthesisSyncRecovery(args.assessment);
}
