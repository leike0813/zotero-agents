import type {
  MirrorAssetContentType,
  MirrorManifest,
  ShardKind,
} from "./foundation";

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
    | "unsafe_asset_path"
    | "duplicate_asset_id"
    | "asset_identity_mismatch"
    | "asset_content_type_mismatch"
    | "asset_not_recoverable"
    | "duplicate_shard"
    | "ambiguous_manifest"
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
  asset_id?: string;
  asset_path?: string;
  content_type?: MirrorAssetContentType;
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

export type CanonicalRecoveryPlan = {
  status: "ready" | "missing_root" | "degraded";
  executable: boolean;
  requiresConfirmation: boolean;
  writeMode: "temporary_then_promote";
  diagnostics: SynthesisSyncDiagnostic[];
  manifest?: MirrorManifest;
  payloadsByAssetPath: Record<string, string>;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function cleanPositiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function shardKey(kind: ShardKind, assetId: string | undefined, seq: number) {
  return `${assetId || kind}:${seq}`;
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
      cleanString(left.shard?.kind).localeCompare(
        cleanString(right.shard?.kind),
      ) ||
      Number(left.shard?.seq || 0) - Number(right.shard?.seq || 0),
  );
}

function hasAction(
  actions: SynthesisSyncAction[],
  action: SynthesisSyncAction,
) {
  return actions.includes(action);
}

function addAction(
  actions: SynthesisSyncAction[],
  action: SynthesisSyncAction,
) {
  if (!hasAction(actions, action)) {
    actions.push(action);
  }
}

const RECOVERABLE_STATE_ASSETS = new Map<string, string>([
  ["state:index", "state/index.json"],
  ["state:topic-definitions", "state/topic-definitions.json"],
  ["state:resolvers", "state/resolvers.json"],
  ["state:resolved-paper-sets", "state/resolved-paper-sets.json"],
  ["state:artifact-state", "state/artifact-state.json"],
  ["state:deleted-topic-artifacts", "state/deleted-topic-artifacts.json"],
]);

function contentTypeForPath(path: string): MirrorAssetContentType {
  if (path.endsWith(".json")) {
    return "json";
  }
  if (path.endsWith(".md")) {
    return "markdown";
  }
  return "text";
}

function isUnsafeAssetPath(path: string) {
  if (!path) {
    return true;
  }
  if (path.includes("\\") || path.startsWith("/") || path.startsWith("//")) {
    return true;
  }
  if (/^[A-Za-z]:/.test(path)) {
    return true;
  }
  const parts = path.split("/");
  return parts.some((part) => !part || part === "." || part === "..");
}

function expectedPathForAssetId(assetId: string) {
  const statePath = RECOVERABLE_STATE_ASSETS.get(assetId);
  if (statePath) {
    return statePath;
  }
  let match = assetId.match(/^topic:([^:]+):current-manifest$/);
  if (match) {
    return `topics/${match[1]}/current/manifest.json`;
  }
  match = assetId.match(/^topic:([^:]+):current-metadata$/);
  if (match) {
    return `topics/${match[1]}/current/metadata.json`;
  }
  match = assetId.match(/^topic:([^:]+):current-artifact$/);
  if (match) {
    return `topics/${match[1]}/current/artifact.json`;
  }
  match = assetId.match(/^topic:([^:]+):current-export$/);
  if (match) {
    return `topics/${match[1]}/current/export.md`;
  }
  match = assetId.match(/^topic:([^:]+):section:([^:]+)$/);
  if (match) {
    return `topics/${match[1]}/current/sections/${match[2]}.json`;
  }
  return "";
}

function validateAssetIdentity(args: {
  assetId: string;
  assetPath: string;
  contentType: string;
}) {
  const diagnostics: SynthesisSyncDiagnostic[] = [];
  if (!args.assetId && !args.assetPath) {
    return diagnostics;
  }
  if (isUnsafeAssetPath(args.assetPath)) {
    diagnostics.push(
      diagnostic(
        "unsafe_asset_path",
        `Unsafe mirror asset path: ${args.assetPath}`,
        "error",
      ),
    );
  }
  const expectedPath = expectedPathForAssetId(args.assetId);
  if (!expectedPath) {
    diagnostics.push(
      diagnostic(
        "asset_not_recoverable",
        `Mirror asset is not recoverable: ${args.assetId}`,
        "error",
      ),
    );
  } else if (expectedPath !== args.assetPath) {
    diagnostics.push(
      diagnostic(
        "asset_identity_mismatch",
        `Mirror asset ${args.assetId} maps to ${args.assetPath}, expected ${expectedPath}`,
        "error",
      ),
    );
  }
  const expectedContentType = contentTypeForPath(args.assetPath);
  if (args.contentType && args.contentType !== expectedContentType) {
    diagnostics.push(
      diagnostic(
        "asset_content_type_mismatch",
        `Mirror asset ${args.assetId} content type ${args.contentType} does not match ${expectedContentType}`,
        "error",
      ),
    );
  }
  return diagnostics;
}

function normalizeShard(
  shard: DecodedMirrorShardSummary,
): DecodedMirrorShardSummary {
  return {
    library_id: cleanPositiveInteger(shard.library_id),
    mirror_id: cleanString(shard.mirror_id),
    kind: cleanString(shard.kind),
    asset_id: cleanString(shard.asset_id),
    asset_path: cleanString(shard.asset_path),
    content_type: cleanString(shard.content_type) as MirrorAssetContentType,
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
        diagnostic(
          "mirror_missing",
          "Zotero mirror manifest is missing",
          "warning",
        ),
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
  const shardByKey = new Map<string, DecodedMirrorShardSummary>();
  for (const shard of shards) {
    const key = shardKey(shard.kind, shard.asset_id, shard.seq);
    if (shardByKey.has(key)) {
      diagnostics.push(
        diagnostic(
          "duplicate_shard",
          `Duplicate mirror shard ${key}`,
          "error",
          {
            kind: shard.kind,
            seq: shard.seq,
            total: shard.total,
            note_key: shard.note_key,
          },
        ),
      );
    }
    shardByKey.set(key, shard);
  }
  const manifestShardKeys = new Set<string>();
  const seenAssetIds = new Map<string, string>();

  for (const entry of manifest.shards) {
    const entryAssetId = cleanString(entry.asset_id);
    const entryAssetPath = cleanString(entry.asset_path);
    const entryContentType = cleanString(entry.content_type);
    const key = shardKey(entry.kind, entryAssetId, entry.seq);
    manifestShardKeys.add(key);
    if (entryAssetId) {
      const previousPath = seenAssetIds.get(entryAssetId);
      if (previousPath && previousPath !== entryAssetPath) {
        diagnostics.push(
          diagnostic(
            "duplicate_asset_id",
            `Duplicate mirror asset id: ${entryAssetId}`,
            "error",
          ),
        );
      }
      seenAssetIds.set(entryAssetId, entryAssetPath);
    }
    diagnostics.push(
      ...validateAssetIdentity({
        assetId: entryAssetId,
        assetPath: entryAssetPath,
        contentType: entryContentType,
      }),
    );
    const shard = shardByKey.get(key);
    const shardRef = {
      kind: entry.kind,
      seq: entry.seq,
      total: entry.total,
      note_key: entry.note_key,
    };
    if (!shard) {
      diagnostics.push(
        diagnostic(
          "missing_shard",
          `Missing mirror shard ${key}`,
          "error",
          shardRef,
        ),
      );
      continue;
    }
    const shardAssetId = cleanString(shard.asset_id);
    const shardAssetPath = cleanString(shard.asset_path);
    const shardContentType = cleanString(shard.content_type);
    const hasIdentity = Boolean(
      entryAssetId || entryAssetPath || shardAssetId || shardAssetPath,
    );
    if (
      hasIdentity &&
      (entryAssetId !== shardAssetId || entryAssetPath !== shardAssetPath)
    ) {
      diagnostics.push(
        diagnostic(
          "asset_identity_mismatch",
          `Shard ${key} asset identity mismatch`,
          "error",
          shardRef,
        ),
      );
    }
    if (hasIdentity && entryContentType !== shardContentType) {
      diagnostics.push(
        diagnostic(
          "asset_content_type_mismatch",
          `Shard ${key} content type mismatch`,
          "error",
          shardRef,
        ),
      );
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
        diagnostic(
          "mirror_id_mismatch",
          `Shard ${key} mirror id mismatch`,
          "error",
          shardRef,
        ),
      );
    }
    if (shard.note_key !== entry.note_key) {
      diagnostics.push(
        diagnostic(
          "note_key_mismatch",
          `Shard ${key} note key mismatch`,
          "error",
          shardRef,
        ),
      );
    }
    if (shard.title !== entry.title) {
      diagnostics.push(
        diagnostic(
          "title_mismatch",
          `Shard ${key} title mismatch`,
          "warning",
          shardRef,
        ),
      );
    }
    if (shard.payload_hash !== entry.payload_hash) {
      diagnostics.push(
        diagnostic(
          "payload_hash_mismatch",
          `Shard ${key} payload hash mismatch`,
          "error",
          shardRef,
        ),
      );
    }
    if (shard.encoded_hash !== entry.encoded_hash) {
      diagnostics.push(
        diagnostic(
          "encoded_hash_mismatch",
          `Shard ${key} encoded hash mismatch`,
          "error",
          shardRef,
        ),
      );
    }
  }

  const totalEntriesByKey = new Map<string, number>();
  for (const entry of manifest.shards) {
    const key = cleanString(entry.asset_id) || entry.kind;
    totalEntriesByKey.set(
      key,
      Math.max(totalEntriesByKey.get(key) || 0, entry.total),
    );
  }
  for (const entry of manifest.shards) {
    const assetGroupKey = cleanString(entry.asset_id) || entry.kind;
    const total = totalEntriesByKey.get(assetGroupKey) || entry.total;
    for (let seq = 1; seq <= total; seq += 1) {
      const key = shardKey(entry.kind, cleanString(entry.asset_id), seq);
      if (!manifestShardKeys.has(key)) {
        diagnostics.push(
          diagnostic(
            "missing_shard",
            `Manifest missing shard sequence ${key}`,
            "error",
            {
              kind: entry.kind,
              seq,
              total,
            },
          ),
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
  const mirrorValidation = validateMirrorManifestAgainstShards({
    manifest: undefined,
    shards: [],
  });
  const conflicts = normalizeConflictCandidates(input.conflicts);
  const diagnostics: SynthesisSyncDiagnostic[] = [];
  const allowedActions: SynthesisSyncAction[] = [];
  let status: SynthesisSyncStatus = "ready";
  let requiresConfirmation = false;

  if (input.root.state === "unbound") {
    status = "missing_root";
    diagnostics.push(
      diagnostic("root_missing", "Synthesis root is not bound", "warning"),
    );
    addAction(allowedActions, "rebind_root");
  }

  if (input.root.state === "missing") {
    status = "missing_root";
    diagnostics.push(
      diagnostic("root_missing", "Synthesis root is missing", "error"),
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
    requiresConfirmation,
    autoOverwriteCanonical: false,
    conflictCandidates: conflicts,
    mirrorValidation,
  };
}

export function planCanonicalRecoveryFromMirror(args: {
  canonicalRoot: { state: "missing" | "ready" | "unbound" };
  manifests: MirrorManifest[];
  shards: DecodedMirrorShardSummary[];
  confirm: boolean;
}): CanonicalRecoveryPlan {
  const diagnostics: SynthesisSyncDiagnostic[] = [];
  if ((args.manifests || []).length > 1) {
    diagnostics.push(
      diagnostic(
        "ambiguous_manifest",
        "Multiple distinct Zotero mirror manifests are present",
        "error",
      ),
    );
    return {
      status: "degraded",
      executable: false,
      requiresConfirmation: true,
      writeMode: "temporary_then_promote",
      diagnostics: sortDiagnostics(diagnostics),
      payloadsByAssetPath: {},
    };
  }
  const manifest = args.manifests[0];
  const validation = validateMirrorManifestAgainstShards({
    manifest,
    shards: args.shards,
  });
  if (!manifest || !validation.ok) {
    return {
      status: "degraded",
      executable: false,
      requiresConfirmation: true,
      writeMode: "temporary_then_promote",
      diagnostics: sortDiagnostics([
        ...diagnostics,
        ...(validation.ok ? [] : validation.diagnostics),
      ]),
      payloadsByAssetPath: {},
    };
  }
  if (args.canonicalRoot.state !== "missing") {
    diagnostics.push(
      diagnostic(
        "root_missing",
        "Canonical root already exists; shard recovery will not overwrite it",
        "warning",
      ),
    );
    return {
      status: "ready",
      executable: false,
      requiresConfirmation: true,
      writeMode: "temporary_then_promote",
      diagnostics: sortDiagnostics(diagnostics),
      manifest,
      payloadsByAssetPath: {},
    };
  }
  const payloadsByAssetPath: Record<string, string> = {};
  const shardsByKey = new Map(
    args.shards.map((shard) => [
      shardKey(shard.kind, shard.asset_id, shard.seq),
      shard,
    ]),
  );
  const assetPaths = new Set<string>();
  for (const entry of manifest.shards) {
    if (!entry.asset_path || assetPaths.has(entry.asset_path)) {
      continue;
    }
    assetPaths.add(entry.asset_path);
    const total = cleanPositiveInteger(entry.total);
    const chunks: string[] = [];
    for (let seq = 1; seq <= total; seq += 1) {
      chunks.push(
        shardsByKey.get(shardKey(entry.kind, entry.asset_id, seq))?.payload ||
          "",
      );
    }
    payloadsByAssetPath[entry.asset_path] = chunks.join("");
  }
  return {
    status: "missing_root",
    executable: Boolean(args.confirm),
    requiresConfirmation: true,
    writeMode: "temporary_then_promote",
    diagnostics: [],
    manifest,
    payloadsByAssetPath,
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
      mirrorValidation: validateMirrorManifestAgainstShards(
        args.assessment.mirror,
      ),
    };
  }
  return assessSynthesisSyncRecovery(args.assessment);
}
