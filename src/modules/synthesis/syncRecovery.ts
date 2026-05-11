import type { MirrorManifest, ShardKind } from "./foundation";

export type SynthesisSyncAction =
  | "rebind_root"
  | "recover_from_shards"
  | "rebuild_mirror_from_canonical"
  | "save_conflict_copy"
  | "rebuild_local_indexes"
  | "clear_conflict_candidate"
  | "retry_update";

export type SynthesisSyncStatus =
  | "ready"
  | "missing_root"
  | "mirror_missing"
  | "mirror_degraded"
  | "divergent"
  | "index_dirty"
  | "check_skipped";

export type SynthesisSyncDiagnostic = {
  code:
    | "root_missing"
    | "mirror_missing"
    | "mirror_degraded"
    | "manifest_hash_mismatch"
    | "payload_hash_mismatch"
    | "encoded_hash_mismatch"
    | "note_key_mismatch"
    | "title_mismatch"
    | "missing_shard"
    | "mirror_id_mismatch"
    | "library_id_mismatch"
    | "local_index_corrupt"
    | "local_index_missing"
    | "conflict_candidates_present";
  severity: "info" | "warning" | "error";
  message: string;
  shard?: {
    kind: ShardKind;
    seq: number;
    total: number;
    note_key?: string;
  };
};

export type DecodedMirrorShardSummary = {
  library_id: number;
  mirror_id: string;
  kind: ShardKind;
  seq: number;
  total: number;
  note_key: string;
  title: string;
  payload_hash: string;
  encoded_hash: string;
  payload?: string;
};

export type MirrorValidationResult =
  | {
      ok: true;
      state: "ready";
      diagnostics: [];
      payloadsByKind: Record<string, string>;
    }
  | {
      ok: false;
      state: "missing" | "degraded";
      diagnostics: SynthesisSyncDiagnostic[];
      payloadsByKind: Record<string, string>;
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
    canonical_manifest_hash?: string;
  };
  mirror: {
    manifest?: MirrorManifest;
    shards?: DecodedMirrorShardSummary[];
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
  mirrorValidation: MirrorValidationResult;
};

export type ConflictCandidateAction = {
  action: "retry_update" | "clear_conflict_candidate";
  candidate_id: string;
  localOnly: true;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function cleanPositiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function shardKey(kind: ShardKind, seq: number) {
  return `${kind}:${seq}`;
}

function diagnostic(
  code: SynthesisSyncDiagnostic["code"],
  message: string,
  severity: SynthesisSyncDiagnostic["severity"] = "warning",
  shard?: SynthesisSyncDiagnostic["shard"],
): SynthesisSyncDiagnostic {
  return { code, message, severity, shard };
}

function sortDiagnostics(diagnostics: SynthesisSyncDiagnostic[]) {
  return [...diagnostics].sort(
    (left, right) =>
      left.code.localeCompare(right.code) ||
      cleanString(left.shard?.kind).localeCompare(cleanString(right.shard?.kind)) ||
      Number(left.shard?.seq || 0) - Number(right.shard?.seq || 0),
  );
}

function hasAction(actions: SynthesisSyncAction[], action: SynthesisSyncAction) {
  return actions.includes(action);
}

function addAction(actions: SynthesisSyncAction[], action: SynthesisSyncAction) {
  if (!hasAction(actions, action)) {
    actions.push(action);
  }
}

function normalizeShard(shard: DecodedMirrorShardSummary): DecodedMirrorShardSummary {
  return {
    library_id: cleanPositiveInteger(shard.library_id),
    mirror_id: cleanString(shard.mirror_id),
    kind: cleanString(shard.kind),
    seq: cleanPositiveInteger(shard.seq),
    total: cleanPositiveInteger(shard.total),
    note_key: cleanString(shard.note_key),
    title: cleanString(shard.title),
    payload_hash: cleanString(shard.payload_hash),
    encoded_hash: cleanString(shard.encoded_hash),
    payload: typeof shard.payload === "string" ? shard.payload : undefined,
  };
}

export function validateMirrorManifestAgainstShards(args: {
  manifest?: MirrorManifest;
  shards?: DecodedMirrorShardSummary[];
}): MirrorValidationResult {
  const manifest = args.manifest;
  const shards = (args.shards || []).map(normalizeShard);
  if (!manifest) {
    return {
      ok: false,
      state: "missing",
      diagnostics: [
        diagnostic("mirror_missing", "Zotero mirror manifest is missing", "warning"),
      ],
      payloadsByKind: {},
    };
  }
  if (shards.length === 0) {
    return {
      ok: true,
      state: "ready",
      diagnostics: [],
      payloadsByKind: {},
    };
  }
  const diagnostics: SynthesisSyncDiagnostic[] = [];
  const shardByKey = new Map(shards.map((shard) => [shardKey(shard.kind, shard.seq), shard]));
  const manifestShardKeys = new Set<string>();

  for (const entry of manifest.shards) {
    const key = shardKey(entry.kind, entry.seq);
    manifestShardKeys.add(key);
    const shard = shardByKey.get(key);
    const shardRef = {
      kind: entry.kind,
      seq: entry.seq,
      total: entry.total,
      note_key: entry.note_key,
    };
    if (!shard) {
      diagnostics.push(diagnostic("missing_shard", `Missing mirror shard ${key}`, "error", shardRef));
      continue;
    }
    if (shard.library_id !== manifest.library_id) {
      diagnostics.push(
        diagnostic(
          "library_id_mismatch",
          `Shard ${key} belongs to library ${shard.library_id}, expected ${manifest.library_id}`,
          "error",
          shardRef,
        ),
      );
    }
    if (shard.mirror_id !== manifest.mirror_id) {
      diagnostics.push(
        diagnostic("mirror_id_mismatch", `Shard ${key} mirror id mismatch`, "error", shardRef),
      );
    }
    if (shard.note_key !== entry.note_key) {
      diagnostics.push(
        diagnostic("note_key_mismatch", `Shard ${key} note key mismatch`, "error", shardRef),
      );
    }
    if (shard.title !== entry.title) {
      diagnostics.push(
        diagnostic("title_mismatch", `Shard ${key} title mismatch`, "warning", shardRef),
      );
    }
    if (shard.payload_hash !== entry.payload_hash) {
      diagnostics.push(
        diagnostic("payload_hash_mismatch", `Shard ${key} payload hash mismatch`, "error", shardRef),
      );
    }
    if (shard.encoded_hash !== entry.encoded_hash) {
      diagnostics.push(
        diagnostic("encoded_hash_mismatch", `Shard ${key} encoded hash mismatch`, "error", shardRef),
      );
    }
  }

  const totalsByKind = new Map<ShardKind, number>();
  for (const entry of manifest.shards) {
    totalsByKind.set(entry.kind, Math.max(totalsByKind.get(entry.kind) || 0, entry.total));
  }
  for (const [kind, total] of totalsByKind.entries()) {
    for (let seq = 1; seq <= total; seq += 1) {
      const key = shardKey(kind, seq);
      if (!manifestShardKeys.has(key)) {
        diagnostics.push(
          diagnostic("missing_shard", `Manifest missing shard sequence ${key}`, "error", {
            kind,
            seq,
            total,
          }),
        );
      }
    }
  }

  const payloadsByKind: Record<string, string> = {};
  if (diagnostics.length === 0) {
    const grouped = new Map<string, DecodedMirrorShardSummary[]>();
    for (const shard of shards) {
      const group = grouped.get(shard.kind) || [];
      group.push(shard);
      grouped.set(shard.kind, group);
    }
    for (const [kind, group] of grouped.entries()) {
      payloadsByKind[kind] = group
        .sort((left, right) => left.seq - right.seq)
        .map((shard) => shard.payload || "")
        .join("");
    }
  }

  if (diagnostics.length) {
    return {
      ok: false,
      state: "degraded",
      diagnostics: sortDiagnostics(diagnostics),
      payloadsByKind: {},
    };
  }
  return {
    ok: true,
    state: "ready",
    diagnostics: [],
    payloadsByKind,
  };
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
  const mirrorValidation = validateMirrorManifestAgainstShards(input.mirror);
  const conflicts = normalizeConflictCandidates(input.conflicts);
  const diagnostics: SynthesisSyncDiagnostic[] = [];
  const allowedActions: SynthesisSyncAction[] = [];
  let status: SynthesisSyncStatus = "ready";
  let requiresConfirmation = false;

  if (input.root.state === "unbound") {
    status = "missing_root";
    diagnostics.push(diagnostic("root_missing", "Synthesis root is not bound", "warning"));
    addAction(allowedActions, "rebind_root");
  }

  if (input.root.state === "missing") {
    status = "missing_root";
    diagnostics.push(diagnostic("root_missing", "Synthesis root is missing", "error"));
    addAction(allowedActions, "rebind_root");
    if (mirrorValidation.ok) {
      addAction(allowedActions, "recover_from_shards");
      requiresConfirmation = true;
    }
  }

  if (input.root.state === "ready") {
    if (!input.mirror.manifest) {
      status = "mirror_missing";
      diagnostics.push(diagnostic("mirror_missing", "Zotero mirror is missing", "warning"));
      addAction(allowedActions, "rebuild_mirror_from_canonical");
    } else if (!mirrorValidation.ok && mirrorValidation.state === "degraded") {
      status = "mirror_degraded";
      diagnostics.push(...mirrorValidation.diagnostics);
      addAction(allowedActions, "rebuild_mirror_from_canonical");
    } else if (
      input.root.canonical_manifest_hash &&
      input.mirror.manifest.manifest_hash &&
      input.root.canonical_manifest_hash !== input.mirror.manifest.manifest_hash
    ) {
      status = "divergent";
      diagnostics.push(
        diagnostic(
          "manifest_hash_mismatch",
          "Canonical manifest hash differs from Zotero mirror manifest",
          "warning",
        ),
      );
      addAction(allowedActions, "save_conflict_copy");
      addAction(allowedActions, "rebuild_mirror_from_canonical");
    }
  }

  if (input.localIndexes.state === "missing" || input.localIndexes.state === "corrupt") {
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
    requiresConfirmation,
    autoOverwriteCanonical: false,
    conflictCandidates: conflicts,
    mirrorValidation,
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
      conflictCandidates: normalizeConflictCandidates(args.assessment.conflicts),
      mirrorValidation: validateMirrorManifestAgainstShards(args.assessment.mirror),
    };
  }
  return assessSynthesisSyncRecovery(args.assessment);
}
