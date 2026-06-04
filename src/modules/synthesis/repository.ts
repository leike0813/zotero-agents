import { getRuntimePersistencePaths } from "../runtimePersistence";

export type SqlPrimitive = string | number | null;
export type SqlParams = Record<string, SqlPrimitive | boolean | undefined>;
export type SqlRow = Record<string, unknown>;

export type SqlAdapter = {
  run: (sql: string, params?: SqlParams) => void;
  all: (sql: string, params?: SqlParams) => SqlRow[];
  get: (sql: string, params?: SqlParams) => SqlRow | null;
  transaction: <T>(fn: () => T) => T;
};

export type SynthesisRepositorySchemaEntry = {
  name: string;
  type: "table" | "index";
};

export type SynthesisRepositoryPaginationInput = {
  cursor?: unknown;
  limit?: unknown;
  defaultLimit?: number;
  maxLimit?: number;
};

export type SynthesisRepositoryPage = {
  cursor: number;
  limit: number;
  nextCursor: number | null;
};

export type SynthesisReviewItemRecord = {
  reviewItemId: string;
  reviewKind: string;
  priority: number;
  status: string;
  scopeKind?: string;
  scopeRef?: string;
  blockedByReviewItemId?: string;
  payloadJson?: string;
  diagnosticsJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisOperationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "canceled";

export type SynthesisOperationProgressMode =
  | "determinate"
  | "indeterminate";

export type SynthesisOperationRecord = {
  operationId: string;
  operationType: string;
  libraryId?: number;
  scopeKind?: string;
  scopeRef?: string;
  status?: SynthesisOperationStatus;
  label?: string;
  phase?: string;
  phaseLabel?: string;
  message?: string;
  progressMode?: SynthesisOperationProgressMode;
  processedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  totalCount?: number;
  basisKind?: string;
  basisValue?: string;
  sourceHash?: string;
  diagnosticsJson?: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt?: string;
};

export type SynthesisCacheBasisRecord = {
  cacheKey: string;
  cacheKind: string;
  scopeKind?: string;
  scopeRef?: string;
  status?: "missing" | "ready" | "stale" | "refreshing" | "failed";
  basisKind?: string;
  basisValue?: string;
  sourceHash?: string;
  policyVersion?: string;
  activeOperationId?: string;
  refreshedAt?: string;
  staleReason?: string;
  diagnosticsJson?: string;
  updatedAt?: string;
};

export type SynthesisArtifactSidecarRecord = {
  sourceRef: string;
  libraryId: number;
  itemKey: string;
  artifactType: "digest" | "references" | "citation_analysis" | string;
  status: "available" | "missing" | "decode_error" | "unsupported" | string;
  artifactHash?: string;
  locatorJson?: string;
  diagnosticsJson?: string;
  scannedAt?: string;
  updatedAt?: string;
};

export type SynthesisRawReferenceRecord = {
  rawReferenceId: string;
  sourceRef: string;
  referencesArtifactHash: string;
  referenceIndex: number;
  rawHash: string;
  parsedTitle?: string;
  normalizedTitle?: string;
  year?: string;
  authorsJson?: string;
  rawReference?: string;
  canonicalReferenceId?: string;
  status?: "active" | "stale" | "parse_error" | string;
  diagnosticsJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisCanonicalReferenceRecord = {
  canonicalReferenceId: string;
  title?: string;
  normalizedTitle?: string;
  year?: string;
  authorsJson?: string;
  identifiersJson?: string;
  metadataHash?: string;
  status?: "active" | "merged" | "stale" | string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisCanonicalReferenceRedirectRecord = {
  fromCanonicalReferenceId: string;
  toCanonicalReferenceId: string;
  reason?: string;
  diagnosticsJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisReferenceBindingRecord = {
  bindingId: string;
  canonicalReferenceId: string;
  libraryId: number;
  itemKey: string;
  status: "accepted" | "candidate" | "rejected" | "stale_target";
  confidence?: string;
  reviewer?: string;
  basisHash?: string;
  diagnosticsJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisReferenceMatchProposalKind =
  | "zotero_binding"
  | "canonical_merge";

export type SynthesisReferenceMatchProposalStatus =
  | "open"
  | "accepted"
  | "rejected"
  | "superseded";

export type SynthesisReferenceMatchProposalRecord = {
  proposalId: string;
  kind: SynthesisReferenceMatchProposalKind;
  status: SynthesisReferenceMatchProposalStatus;
  sourceCanonicalReferenceId: string;
  sourceRawReferenceIdsJson?: string;
  targetCanonicalReferenceId?: string;
  targetLibraryId?: number;
  targetItemKey?: string;
  confidence?: string;
  score?: number;
  reasonsJson?: string;
  evidenceJson?: string;
  diagnosticsJson?: string;
  basisHash?: string;
  sourceHash?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisReviewActionDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  details?: Record<string, unknown>;
};

export type SynthesisReviewActionCacheEffect = {
  cacheKey: string;
  cacheKind: string;
  scopeKind: string;
  scopeRef: string;
};

export type SynthesisCitationNodeRecord = {
  literatureItemId: string;
  nodeStatus: string;
  hasZoteroBinding: boolean;
  title?: string;
  year?: string;
  summaryJson?: string;
  updatedAt?: string;
};

export type SynthesisCitationEdgeRecord = {
  edgeId: string;
  sourceLiteratureItemId: string;
  targetLiteratureItemId?: string;
  referenceInstanceId?: string;
  resolutionId?: string;
  edgeStatus: string;
  rolesJson?: string;
  weight?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisCitationSourceOwnershipRecord = {
  sourceLiteratureItemId: string;
  edgeId: string;
  referenceInstanceId?: string;
  targetLiteratureItemId?: string;
  edgeStatus: string;
  updatedAt?: string;
};

export type SynthesisCitationIncomingGroupRecord = {
  targetLiteratureItemId: string;
  sourceLiteratureItemId: string;
  edgeId: string;
  referenceInstanceId?: string;
  edgeStatus: string;
  updatedAt?: string;
};

export type SynthesisCitationLightMetricsRecord = {
  literatureItemId: string;
  outgoingCount: number;
  incomingCount: number;
  matchedOutgoingCount: number;
  unresolvedOutgoingCount: number;
  ambiguousOutgoingCount: number;
  localDegree: number;
  sourceStructureVersion: number;
  updatedAt?: string;
};

export type SynthesisCitationComplexMetricsRecord = {
  literatureItemId: string;
  nodeId: string;
  paperRef?: string;
  itemKey?: string;
  title?: string;
  year?: string;
  internalInDegree: number;
  internalOutDegree: number;
  externalReferenceCount: number;
  unresolvedReferenceCount: number;
  internalPagerank: number;
  componentId: string;
  componentSize: number;
  isIsolated: boolean;
  ageNorm: number;
  recencyNorm: number;
  inDegreeNorm: number;
  outDegreeNorm: number;
  pagerankNorm: number;
  foundationScore: number;
  frontierScore: number;
  synthesisRoleHintsJson?: string;
  sourceStructureVersion: number;
  sourceGraphHash: string;
  metricsHash: string;
  status: string;
  updatedAt?: string;
};

export type SynthesisCitationLayoutStatus =
  | "missing"
  | "ready"
  | "dirty"
  | "running"
  | "failed";

export type SynthesisCitationLayoutRecord = {
  layoutKey: string;
  viewKey: string;
  preset: string;
  graphHash: string;
  status: SynthesisCitationLayoutStatus;
  layoutJson?: string;
  diagnosticsJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisRelatedItemsSyncStatus =
  | "pending_external_write"
  | "applied"
  | "already_existed"
  | "revoked"
  | "already_absent"
  | "failed"
  | "needs_attention";

export type SynthesisRelatedItemsEchoState =
  | "none"
  | "awaiting_echo"
  | "observed"
  | "expired";

export type SynthesisRelatedItemsSyncEffectRecord = {
  effectId: string;
  operationId: string;
  citationEdgeId?: string;
  sourceLiteratureItemId: string;
  targetLiteratureItemId: string;
  sourceLibraryId: number;
  sourceItemKey: string;
  targetLibraryId: number;
  targetItemKey: string;
  action: "add" | "revoke";
  status: SynthesisRelatedItemsSyncStatus;
  createdBySynthesis?: boolean;
  graphBasisHash?: string;
  graphHash?: string;
  externalWriteAt?: string;
  echoState?: SynthesisRelatedItemsEchoState;
  echoObservedAt?: string;
  diagnosticsJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisCitationGraphStateReplacement = {
  nodes: SynthesisCitationNodeRecord[];
  edges?: SynthesisCitationEdgeRecord[];
  sourceOwnership?: SynthesisCitationSourceOwnershipRecord[];
  incomingGroups?: SynthesisCitationIncomingGroupRecord[];
  lightweightMetrics?: SynthesisCitationLightMetricsRecord[];
  complexMetrics?: SynthesisCitationComplexMetricsRecord[];
};

export type SynthesisCitationGraphSourceSliceReplacement = {
  sourceLiteratureItemIds: string[];
  nodes: SynthesisCitationNodeRecord[];
  edges?: SynthesisCitationEdgeRecord[];
  sourceOwnership?: SynthesisCitationSourceOwnershipRecord[];
  incomingGroups?: SynthesisCitationIncomingGroupRecord[];
  updatedAt?: string;
};

export type SynthesisLiteratureMatchingMetadataRecord = {
  literatureItemId: string;
  schemaId?: string;
  keyTermsJson?: string;
  methodsJson?: string;
  problemsJson?: string;
  datasetsJson?: string;
  excludeTermsJson?: string;
  sourceArtifactHash?: string;
  metadataHash?: string;
  diagnosticsJson?: string;
  updatedAt?: string;
};

export type SynthesisTopicInterestMetadataRecord = {
  topicId: string;
  schemaId?: string;
  includeTermsJson?: string;
  mustHaveTermsJson?: string;
  methodsJson?: string;
  excludeTermsJson?: string;
  seedLiteratureItemIdsJson?: string;
  sourceArtifactHash?: string;
  metadataHash?: string;
  diagnosticsJson?: string;
  updatedAt?: string;
};

export type SynthesisTopicDiscoveryHintRecord = {
  hintId: string;
  topicId: string;
  literatureItemId: string;
  score: number;
  method?: string;
  matchingFieldsJson?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisTopicDiscoveryBuildResult = {
  method: string;
  scannedTopics: number;
  scannedLiterature: number;
  upserted: number;
  open: number;
  rejected: number;
  hints: SynthesisTopicDiscoveryHintRecord[];
  diagnostics: SynthesisReviewActionDiagnostic[];
};

export type SynthesisTopicGraphNodeRecord = {
  topicId: string;
  title: string;
  aliasesJson?: string;
  nodeType: string;
  definitionStatus?: string;
  currentArtifactPath?: string;
  isRoot?: boolean;
  level?: string;
  paperCount?: number;
  lastSynthesisAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisTopicGraphEdgeRecord = {
  edgeId: string;
  sourceTopicId: string;
  targetTopicId: string;
  relation: string;
  status: string;
  confidence?: number;
  provenanceJson?: string;
  evidenceRefsJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisTopicGraphReviewItemRecord = {
  reviewId: string;
  status: string;
  sourceTopicId: string;
  targetTopicId: string;
  targetTitle?: string;
  relation: string;
  confidence?: number;
  provenanceJson?: string;
  evidenceRefsJson?: string;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
};

export type SynthesisConceptRecord = {
  conceptId: string;
  label: string;
  aliasesJson?: string;
  conceptType: string;
  domain: string;
  status: string;
  shortDefinition?: string;
  definition?: string;
  usageNote?: string;
  editorialNote?: string;
  senseIdsJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisConceptSenseRecord = {
  senseId: string;
  conceptId: string;
  label: string;
  aliasesJson?: string;
  domain: string;
  shortDefinition?: string;
  definition?: string;
  disambiguation?: string;
  topicRelevance?: string;
  confidence: string;
  sourceTopicIdsJson?: string;
  evidenceJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisConceptAliasRecord = {
  aliasId: string;
  alias: string;
  normalized: string;
  conceptId: string;
  senseId?: string;
  status: string;
  confidence: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisConceptRelationRecord = {
  relationId: string;
  sourceConceptId: string;
  targetConceptId: string;
  relation: string;
  status: string;
  confidence: string;
  provenanceJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisConceptReviewItemRecord = {
  reviewId: string;
  status: string;
  reason: string;
  topicId: string;
  topicPathId: string;
  label: string;
  confidence: string;
  candidateConceptIdsJson?: string;
  proposalJson?: string;
  targetConceptId?: string;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
};

export type SynthesisTopicConceptLinkRecord = {
  topicId: string;
  conceptId: string;
  senseId: string;
  label: string;
  relevance?: string;
  confidence: string;
  source: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisTagVocabularyEntryRecord = {
  tag: string;
  facet: string;
  note?: string;
  source?: string;
  deprecated?: boolean;
  replacement?: string;
  aliasesJson?: string;
  abbrevJson?: string;
  usageCount?: number;
  lastSyncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisTagAliasRecord = {
  alias: string;
  tag: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisTagAbbrevRecord = {
  abbrevKey: string;
  abbrevValue: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisTagProtocolRecord = {
  protocolId: string;
  version?: string;
  tagPattern: string;
  maxTagLength: number;
  facetsJson?: string;
  updatedAt?: string;
};

export type SynthesisTagValidationWarningRecord = {
  warningId: string;
  code: string;
  severity: string;
  tag?: string;
  message: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisDiscoveryMetadataStateReplacement = {
  literatureMatchingMetadata?: SynthesisLiteratureMatchingMetadataRecord[];
  topicInterestMetadata?: SynthesisTopicInterestMetadataRecord[];
  topicDiscoveryHints?: SynthesisTopicDiscoveryHintRecord[];
};

export type SynthesisRepositoryTableName =
  | "synt_cache_basis"
  | "synt_artifact_sidecar"
  | "synt_raw_reference"
  | "synt_canonical_reference"
  | "synt_canonical_reference_redirect"
  | "synt_reference_binding"
  | "synt_reference_match_proposal"
  | "synt_citation_node"
  | "synt_citation_edge"
  | "synt_citation_source_ownership"
  | "synt_citation_incoming_group"
  | "synt_citation_metrics_light"
  | "synt_citation_metrics_complex"
  | "synt_citation_layout_state"
  | "synt_related_items_sync_effect"
  | "synt_literature_matching_metadata"
  | "synt_topic_interest_metadata"
  | "synt_topic_discovery_hint"
  | "synt_topic_graph_node"
  | "synt_topic_graph_edge"
  | "synt_topic_graph_review_item"
  | "synt_concept"
  | "synt_concept_sense"
  | "synt_concept_alias"
  | "synt_concept_relation"
  | "synt_concept_review_item"
  | "synt_topic_concept_link"
  | "synt_tag_vocabulary_entry"
  | "synt_tag_alias"
  | "synt_tag_abbrev"
  | "synt_tag_protocol"
  | "synt_tag_validation_warning"
  | "synt_review_item"
  | "synt_operation";

export type SynthesisRepositoryOptions = {
  runtimeRoot?: string;
  now?: () => string;
  adapter?: SqlAdapter;
};

const SCHEMA_VERSION = "2026-06-01.sidecar-cache-hard-cut";
const DEFAULT_PAGE_LIMIT = 100;
const MAX_PAGE_LIMIT = 250;
const RELATED_ITEMS_SYNC_ECHO_WINDOW_MS = 10 * 60 * 1000;
const SYNTHESIS_RESET_TABLES: SynthesisRepositoryTableName[] = [
  "synt_operation",
  "synt_review_item",
  "synt_topic_discovery_hint",
  "synt_topic_interest_metadata",
  "synt_literature_matching_metadata",
  "synt_topic_graph_review_item",
  "synt_topic_graph_edge",
  "synt_topic_graph_node",
  "synt_topic_concept_link",
  "synt_concept_review_item",
  "synt_concept_relation",
  "synt_concept_alias",
  "synt_concept_sense",
  "synt_concept",
  "synt_tag_validation_warning",
  "synt_tag_protocol",
  "synt_tag_abbrev",
  "synt_tag_alias",
  "synt_tag_vocabulary_entry",
  "synt_citation_layout_state",
  "synt_citation_metrics_complex",
  "synt_citation_metrics_light",
  "synt_related_items_sync_effect",
  "synt_citation_incoming_group",
  "synt_citation_source_ownership",
  "synt_citation_edge",
  "synt_citation_node",
  "synt_reference_binding",
  "synt_reference_match_proposal",
  "synt_canonical_reference_redirect",
  "synt_canonical_reference",
  "synt_raw_reference",
  "synt_artifact_sidecar",
  "synt_cache_basis",
];

export const SYNTHESIS_REPOSITORY_TABLES: SynthesisRepositoryTableName[] = [
  "synt_cache_basis",
  "synt_artifact_sidecar",
  "synt_raw_reference",
  "synt_canonical_reference",
  "synt_canonical_reference_redirect",
  "synt_reference_binding",
  "synt_reference_match_proposal",
  "synt_citation_node",
  "synt_citation_edge",
  "synt_citation_source_ownership",
  "synt_citation_incoming_group",
  "synt_citation_metrics_light",
  "synt_citation_metrics_complex",
  "synt_citation_layout_state",
  "synt_related_items_sync_effect",
  "synt_literature_matching_metadata",
  "synt_topic_interest_metadata",
  "synt_topic_discovery_hint",
  "synt_topic_graph_node",
  "synt_topic_graph_edge",
  "synt_topic_graph_review_item",
  "synt_concept",
  "synt_concept_sense",
  "synt_concept_alias",
  "synt_concept_relation",
  "synt_concept_review_item",
  "synt_topic_concept_link",
  "synt_tag_vocabulary_entry",
  "synt_tag_alias",
  "synt_tag_abbrev",
  "synt_tag_protocol",
  "synt_tag_validation_warning",
  "synt_review_item",
  "synt_operation",
];

let defaultRepository: SynthesisRepository | null = null;
const memoryAdaptersByRuntimeDbPath = new Map<string, SqlAdapter>();

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeSqlParam(value: unknown): SqlPrimitive {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  return String(value);
}

function sqlFingerprint(sql: string) {
  return sql.replace(/\s+/g, " ").trim().slice(0, 240);
}

function collectPlaceholderSequence(sql: string) {
  const regex = /[@:$]([A-Za-z_][A-Za-z0-9_]*)/g;
  const result: string[] = [];
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(sql)) !== null) {
    result.push(match[1]);
  }
  return result;
}

function collectNamedPlaceholders(sql: string) {
  return Array.from(new Set(collectPlaceholderSequence(sql)));
}

function storageError(args: {
  operation: string;
  sql: string;
  placeholders: string[];
  params?: SqlParams;
  dbPath: string;
  cause: unknown;
}) {
  const cause =
    args.cause instanceof Error
      ? `${args.cause.name}: ${args.cause.message}`
      : String(args.cause || "unknown");
  const error = new Error(
    [
      "[synthesisRepository] storage execution failed",
      `operation=${args.operation}`,
      `dbPath=${args.dbPath}`,
      `sql=${sqlFingerprint(args.sql)}`,
      `placeholders=${JSON.stringify(args.placeholders)}`,
      `paramKeys=${JSON.stringify(Object.keys(args.params || {}))}`,
      `cause=${cause}`,
    ].join(" | "),
  );
  (error as Error & { cause?: unknown }).cause = args.cause;
  return error;
}

function normalizeCursor(value: unknown) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeLimit(value: unknown, fallback: number, max: number) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function appendInFilter(
  clauses: string[],
  params: SqlParams,
  column: string,
  keyPrefix: string,
  values: Iterable<unknown>,
) {
  const cleaned = Array.from(values).map(cleanString).filter(Boolean);
  if (!cleaned.length) {
    return;
  }
  const placeholders = cleaned.map((value, index) => {
    const key = `${keyPrefix}_${index}`;
    params[key] = value;
    return `@${key}`;
  });
  clauses.push(`${column} IN (${placeholders.join(", ")})`);
}

function appendLimitClause(
  params: SqlParams,
  limit: number,
  defaultSql = "",
) {
  if (limit <= 0) {
    return defaultSql;
  }
  params.limit = limit;
  return " LIMIT @limit";
}

function parseJsonArray(value: unknown): unknown[] {
  try {
    const parsed = JSON.parse(cleanString(value) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function uniqueCleanStrings(values: unknown[]) {
  return Array.from(new Set(values.map(cleanString).filter(Boolean))).sort();
}

function normalizeJsonStringArrayText(value: unknown, limit: number) {
  const source = Array.isArray(value) ? value : parseJsonArray(value);
  const terms: string[] = [];
  const seen = new Set<string>();
  for (const entry of source) {
    const text = cleanString(entry);
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    terms.push(text);
    if (terms.length >= limit) {
      break;
    }
  }
  return JSON.stringify(terms);
}

function actionDiagnostic(args: {
  code: string;
  message: string;
  severity?: "info" | "warning" | "error";
  details?: Record<string, unknown>;
}): SynthesisReviewActionDiagnostic {
  return {
    code: args.code,
    severity: args.severity || "info",
    message: args.message,
    ...(args.details ? { details: args.details } : {}),
  };
}

function stableShortKey(value: unknown) {
  const text = JSON.stringify(value) || "";
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizeTopicDiscoveryHintStatus(value: unknown) {
  const normalized = cleanString(value);
  if (normalized === "filtered") {
    return "rejected";
  }
  if (normalized === "accepted") {
    return "open";
  }
  if (normalized === "rejected" || normalized === "superseded") {
    return normalized;
  }
  return "open";
}

function nonNegativeInt(value: unknown, fallback = 0) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeOperationStatus(value: unknown): SynthesisOperationStatus {
  const normalized = cleanString(value);
  if (
    normalized === "pending" ||
    normalized === "running" ||
    normalized === "completed" ||
    normalized === "failed" ||
    normalized === "canceled"
  ) {
    return normalized;
  }
  return "pending";
}

function normalizeOperationProgressMode(
  value: unknown,
): SynthesisOperationProgressMode {
  return cleanString(value) === "determinate" ? "determinate" : "indeterminate";
}

function normalizeCacheBasisStatus(
  value: unknown,
): NonNullable<SynthesisCacheBasisRecord["status"]> {
  const normalized = cleanString(value);
  if (
    normalized === "ready" ||
    normalized === "stale" ||
    normalized === "refreshing" ||
    normalized === "failed"
  ) {
    return normalized;
  }
  return "missing";
}

function normalizeReferenceBindingState(
  value: unknown,
): SynthesisReferenceBindingRecord["status"] {
  const normalized = cleanString(value);
  if (normalized === "accepted" || normalized === "auto" || normalized === "confirmed") {
    return "accepted";
  }
  if (
    normalized === "candidate" ||
    normalized === "rejected" ||
    normalized === "stale_target"
  ) {
    return normalized;
  }
  return "candidate";
}

function expandReferenceBindingStatusFilter(value: string) {
  return value === "accepted" ? ["accepted", "auto", "confirmed"] : [value];
}

function applyOptionalMigration(db: SqlAdapter, sql: string) {
  try {
    db.run(sql);
  } catch {
    // Additive compatibility migration. Existing columns raise duplicate errors.
  }
}

function dropRemovedSynchronizationTables(db: SqlAdapter) {
  for (const tableName of [
    "synt_dirty_event",
    "synt_job_state",
    "synt_work_item",
    "synt_work_run",
    "synt_work_queue_meta",
    "synt_registry_rebuild_run",
    "synt_registry_basis_meta",
    "synt_literature_item",
    "synt_literature_identifier",
    "synt_zotero_binding",
    "synt_literature_redirect",
    "synt_artifact_state",
    "synt_reference_instance",
    "synt_reference_resolution",
    "synt_reference_binding_decision",
  ]) {
    db.run(`DROP TABLE IF EXISTS ${tableName}`);
  }
}

function ensureZoteroDirectorySync(
  entry: unknown,
  runtime: {
    Components?: { interfaces?: { nsIFile?: { DIRECTORY_TYPE?: number } } };
  },
) {
  const target = entry as
    | {
        parent?: unknown;
        exists?: () => boolean;
        create?: (type: number, permissions: number) => void;
      }
    | undefined;
  if (!target) {
    return;
  }
  if (typeof target.exists === "function" && target.exists()) {
    return;
  }
  ensureZoteroDirectorySync(target.parent, runtime);
  const directoryType =
    runtime.Components?.interfaces?.nsIFile?.DIRECTORY_TYPE ?? 1;
  target.create?.(directoryType, 0o755);
}

function buildZoteroAdapter(dbPath: string): SqlAdapter {
  const runtime = globalThis as {
    Services?: {
      storage?: {
        openDatabase?: (file: unknown) => unknown;
      };
    };
    Zotero?: {
      File?: {
        pathToFile?: (path: string) => unknown;
      };
    };
    Components?: { interfaces?: { nsIFile?: { DIRECTORY_TYPE?: number } } };
  };
  const file = runtime.Zotero?.File?.pathToFile?.(dbPath);
  ensureZoteroDirectorySync(
    (file as { parent?: unknown } | undefined)?.parent,
    {
      Components: runtime.Components,
    },
  );
  const conn = runtime.Services?.storage?.openDatabase?.(file) as
    | {
        createStatement?: (sql: string) => unknown;
        executeSimpleSQL?: (sql: string) => void;
      }
    | undefined;
  if (!conn?.createStatement || !conn.executeSimpleSQL) {
    throw new Error("Services.storage.openDatabase is unavailable");
  }

  const bindParams = (statement: unknown, sql: string, params?: SqlParams) => {
    const target = statement as {
      bindByIndex?: (idx: number, value: SqlPrimitive) => void;
      bindByName?: (name: string, value: SqlPrimitive) => void;
      params?: Record<string, SqlPrimitive>;
    };
    const placeholderSequence = collectPlaceholderSequence(sql);
    if (!placeholderSequence.length) {
      return;
    }
    if (!params) {
      throw new Error(
        `[synthesisRepository] missing SQL params for placeholders ${JSON.stringify(
          placeholderSequence,
        )}`,
      );
    }
    for (let index = 0; index < placeholderSequence.length; index += 1) {
      const key = placeholderSequence[index];
      if (!Object.prototype.hasOwnProperty.call(params, key)) {
        throw new Error(
          `[synthesisRepository] missing SQL param "${key}" for ${sqlFingerprint(
            sql,
          )}`,
        );
      }
      const value = normalizeSqlParam(params[key]);
      let bound = false;
      if (typeof target.bindByIndex === "function") {
        try {
          target.bindByIndex(index, value);
          bound = true;
        } catch {
          // Fall through to named binding variants.
        }
      }
      if (!bound && typeof target.bindByName === "function") {
        for (const name of [key, `:${key}`, `@${key}`, `$${key}`]) {
          try {
            target.bindByName(name, value);
            bound = true;
            break;
          } catch {
            // Try the next supported placeholder spelling.
          }
        }
      }
      if (!bound && target.params) {
        for (const name of [key, `:${key}`, `@${key}`, `$${key}`]) {
          try {
            target.params[name] = value;
            bound = true;
            break;
          } catch {
            // Try the next supported placeholder spelling.
          }
        }
      }
      if (!bound) {
        throw new Error(
          `[synthesisRepository] failed to bind SQL param "${key}" for ${sqlFingerprint(
            sql,
          )}`,
        );
      }
    }
  };

  const readValue = (statement: unknown, index: number) => {
    const source = statement as {
      getTypeOfIndex?: (index: number) => number;
      getInt64?: (index: number) => number;
      getDouble?: (index: number) => number;
      getUTF8String?: (index: number) => string;
    };
    const type = Number(source.getTypeOfIndex?.(index));
    if (type === 0) {
      return null;
    }
    if (type === 1) {
      return source.getInt64?.(index) ?? null;
    }
    if (type === 2) {
      return source.getDouble?.(index) ?? null;
    }
    return source.getUTF8String?.(index) ?? "";
  };

  return {
    run(sql, params) {
      const placeholders = collectNamedPlaceholders(sql);
      let statement:
        | {
            execute?: () => void;
            finalize?: () => void;
          }
        | undefined;
      try {
        statement = conn.createStatement!(sql) as {
          execute?: () => void;
          finalize?: () => void;
        };
        bindParams(statement, sql, params);
        statement.execute?.();
      } catch (error) {
        throw storageError({
          operation: statement ? "run.execute" : "run.createStatement",
          sql,
          placeholders,
          params,
          dbPath,
          cause: error,
        });
      } finally {
        statement?.finalize?.();
      }
    },
    all(sql, params) {
      const placeholders = collectNamedPlaceholders(sql);
      let statement:
        | {
            columnCount?: number;
            executeStep?: () => boolean;
            finalize?: () => void;
            getColumnName?: (index: number) => string;
          }
        | undefined;
      try {
        statement = conn.createStatement!(sql) as {
          columnCount?: number;
          executeStep?: () => boolean;
          finalize?: () => void;
          getColumnName?: (index: number) => string;
        };
        bindParams(statement, sql, params);
        const rows: SqlRow[] = [];
        while (statement.executeStep?.()) {
          const row: SqlRow = {};
          const count = Number(statement.columnCount || 0);
          for (let index = 0; index < count; index += 1) {
            row[String(statement.getColumnName?.(index) || "")] = readValue(
              statement,
              index,
            );
          }
          rows.push(row);
        }
        return rows;
      } catch (error) {
        throw storageError({
          operation: statement ? "all.executeStep" : "all.createStatement",
          sql,
          placeholders,
          params,
          dbPath,
          cause: error,
        });
      } finally {
        statement?.finalize?.();
      }
    },
    get(sql, params) {
      return this.all(sql, params)[0] || null;
    },
    transaction(fn) {
      conn.executeSimpleSQL!("BEGIN IMMEDIATE");
      try {
        const result = fn();
        conn.executeSimpleSQL!("COMMIT");
        return result;
      } catch (error) {
        try {
          conn.executeSimpleSQL!("ROLLBACK");
        } catch {
          // Ignore rollback failure and surface the original error.
        }
        throw error;
      }
    },
  };
}

export function createSynthesisSqlAdapterForPath(dbPath: string): SqlAdapter {
  return buildZoteroAdapter(dbPath);
}

type MemoryState = {
  schemaMeta: Map<string, string>;
  cacheBasis: Map<string, Record<string, SqlPrimitive>>;
  artifactSidecars: Map<string, Record<string, SqlPrimitive>>;
  rawReferences: Map<string, Record<string, SqlPrimitive>>;
  canonicalReferences: Map<string, Record<string, SqlPrimitive>>;
  canonicalReferenceRedirects: Map<string, Record<string, SqlPrimitive>>;
  referenceBindings: Map<string, Record<string, SqlPrimitive>>;
  referenceMatchProposals: Map<string, Record<string, SqlPrimitive>>;
  citationNodes: Map<string, Record<string, SqlPrimitive>>;
  citationEdges: Map<string, Record<string, SqlPrimitive>>;
  citationSourceOwnership: Map<string, Record<string, SqlPrimitive>>;
  citationIncomingGroups: Map<string, Record<string, SqlPrimitive>>;
  citationLightMetrics: Map<string, Record<string, SqlPrimitive>>;
  citationComplexMetrics: Map<string, Record<string, SqlPrimitive>>;
  citationLayoutStates: Map<string, Record<string, SqlPrimitive>>;
  relatedItemsSyncEffects: Map<string, Record<string, SqlPrimitive>>;
  literatureMatchingMetadata: Map<string, Record<string, SqlPrimitive>>;
  topicInterestMetadata: Map<string, Record<string, SqlPrimitive>>;
  topicDiscoveryHints: Map<string, Record<string, SqlPrimitive>>;
  topicGraphNodes: Map<string, Record<string, SqlPrimitive>>;
  topicGraphEdges: Map<string, Record<string, SqlPrimitive>>;
  topicGraphReviewItems: Map<string, Record<string, SqlPrimitive>>;
  concepts: Map<string, Record<string, SqlPrimitive>>;
  conceptSenses: Map<string, Record<string, SqlPrimitive>>;
  conceptAliases: Map<string, Record<string, SqlPrimitive>>;
  conceptRelations: Map<string, Record<string, SqlPrimitive>>;
  conceptReviewItems: Map<string, Record<string, SqlPrimitive>>;
  topicConceptLinks: Map<string, Record<string, SqlPrimitive>>;
  tagVocabularyEntries: Map<string, Record<string, SqlPrimitive>>;
  tagAliases: Map<string, Record<string, SqlPrimitive>>;
  tagAbbrevs: Map<string, Record<string, SqlPrimitive>>;
  tagProtocols: Map<string, Record<string, SqlPrimitive>>;
  tagValidationWarnings: Map<string, Record<string, SqlPrimitive>>;
  reviewItems: Map<string, Record<string, SqlPrimitive>>;
  operations: Map<string, Record<string, SqlPrimitive>>;
  tables: Set<string>;
  indexes: Set<string>;
};

function cloneMemoryState(state: MemoryState): MemoryState {
  return {
    schemaMeta: new Map(state.schemaMeta),
    cacheBasis: cloneMemoryRows(state.cacheBasis),
    artifactSidecars: cloneMemoryRows(state.artifactSidecars),
    rawReferences: cloneMemoryRows(state.rawReferences),
    canonicalReferences: cloneMemoryRows(state.canonicalReferences),
    canonicalReferenceRedirects: cloneMemoryRows(
      state.canonicalReferenceRedirects,
    ),
    referenceBindings: cloneMemoryRows(state.referenceBindings),
    referenceMatchProposals: cloneMemoryRows(state.referenceMatchProposals),
    citationNodes: cloneMemoryRows(state.citationNodes),
    citationEdges: cloneMemoryRows(state.citationEdges),
    citationSourceOwnership: cloneMemoryRows(state.citationSourceOwnership),
    citationIncomingGroups: cloneMemoryRows(state.citationIncomingGroups),
    citationLightMetrics: cloneMemoryRows(state.citationLightMetrics),
    citationComplexMetrics: cloneMemoryRows(state.citationComplexMetrics),
    citationLayoutStates: cloneMemoryRows(state.citationLayoutStates),
    relatedItemsSyncEffects: cloneMemoryRows(state.relatedItemsSyncEffects),
    literatureMatchingMetadata: cloneMemoryRows(
      state.literatureMatchingMetadata,
    ),
    topicInterestMetadata: cloneMemoryRows(state.topicInterestMetadata),
    topicDiscoveryHints: cloneMemoryRows(state.topicDiscoveryHints),
    topicGraphNodes: cloneMemoryRows(state.topicGraphNodes),
    topicGraphEdges: cloneMemoryRows(state.topicGraphEdges),
    topicGraphReviewItems: cloneMemoryRows(state.topicGraphReviewItems),
    concepts: cloneMemoryRows(state.concepts),
    conceptSenses: cloneMemoryRows(state.conceptSenses),
    conceptAliases: cloneMemoryRows(state.conceptAliases),
    conceptRelations: cloneMemoryRows(state.conceptRelations),
    conceptReviewItems: cloneMemoryRows(state.conceptReviewItems),
    topicConceptLinks: cloneMemoryRows(state.topicConceptLinks),
    tagVocabularyEntries: cloneMemoryRows(state.tagVocabularyEntries),
    tagAliases: cloneMemoryRows(state.tagAliases),
    tagAbbrevs: cloneMemoryRows(state.tagAbbrevs),
    tagProtocols: cloneMemoryRows(state.tagProtocols),
    tagValidationWarnings: cloneMemoryRows(state.tagValidationWarnings),
    reviewItems: cloneMemoryRows(state.reviewItems),
    operations: cloneMemoryRows(state.operations),
    tables: new Set(state.tables),
    indexes: new Set(state.indexes),
  };
}

function cloneMemoryRows(rows: Map<string, Record<string, SqlPrimitive>>) {
  return new Map(
    Array.from(rows.entries()).map(([key, value]) => [key, { ...value }]),
  );
}

function createMemoryAdapter(): SqlAdapter {
  let state: MemoryState = {
    schemaMeta: new Map(),
    cacheBasis: new Map(),
    artifactSidecars: new Map(),
    rawReferences: new Map(),
    canonicalReferences: new Map(),
    canonicalReferenceRedirects: new Map(),
    referenceBindings: new Map(),
    referenceMatchProposals: new Map(),
    citationNodes: new Map(),
    citationEdges: new Map(),
    citationSourceOwnership: new Map(),
    citationIncomingGroups: new Map(),
    citationLightMetrics: new Map(),
    citationComplexMetrics: new Map(),
    citationLayoutStates: new Map(),
    relatedItemsSyncEffects: new Map(),
    literatureMatchingMetadata: new Map(),
    topicInterestMetadata: new Map(),
    topicDiscoveryHints: new Map(),
    topicGraphNodes: new Map(),
    topicGraphEdges: new Map(),
    topicGraphReviewItems: new Map(),
    concepts: new Map(),
    conceptSenses: new Map(),
    conceptAliases: new Map(),
    conceptRelations: new Map(),
    conceptReviewItems: new Map(),
    topicConceptLinks: new Map(),
    tagVocabularyEntries: new Map(),
    tagAliases: new Map(),
    tagAbbrevs: new Map(),
    tagProtocols: new Map(),
    tagValidationWarnings: new Map(),
    reviewItems: new Map(),
    operations: new Map(),
    tables: new Set(),
    indexes: new Set(),
  };

  const addSchemaObject = (sql: string) => {
    const normalized = sql.replace(/\s+/g, " ").trim();
    const table = normalized.match(
      /^CREATE TABLE IF NOT EXISTS ([A-Za-z0-9_]+)/i,
    );
    if (table) {
      state.tables.add(table[1]);
      return true;
    }
    const index = normalized.match(
      /^CREATE INDEX IF NOT EXISTS ([A-Za-z0-9_]+)/i,
    );
    if (index) {
      state.indexes.add(index[1]);
      return true;
    }
    return false;
  };

  return {
    run(sql, params = {}) {
      const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
      if (addSchemaObject(sql) || normalized.startsWith("pragma")) {
        return;
      }
      const dropTable = normalized.match(/^drop table if exists ([a-z0-9_]+)/);
      if (dropTable) {
        const name = dropTable[1];
        state.tables.delete(name);
        const table = memoryTable(state, name, { allowMissing: true });
        table?.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_operation")) {
        state.operations.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_cache_basis")) {
        state.cacheBasis.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_artifact_sidecar")) {
        state.artifactSidecars.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_raw_reference")) {
        const sourceRef = cleanString(params.source_ref);
        const artifactHash = cleanString(params.references_artifact_hash);
        if (sourceRef || artifactHash) {
          for (const [key, row] of Array.from(state.rawReferences.entries())) {
            if (
              (!sourceRef || cleanString(row.source_ref) === sourceRef) &&
              (!artifactHash ||
                cleanString(row.references_artifact_hash) === artifactHash)
            ) {
              state.rawReferences.delete(key);
            }
          }
          return;
        }
        state.rawReferences.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_canonical_reference_redirect")) {
        state.canonicalReferenceRedirects.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_canonical_reference")) {
        state.canonicalReferences.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_reference_binding")) {
        state.referenceBindings.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_reference_match_proposal")) {
        state.referenceMatchProposals.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_citation_node")) {
        const id = cleanString(params.literature_item_id);
        if (id) {
          state.citationNodes.delete(id);
          return;
        }
        state.citationNodes.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_citation_edge")) {
        const source = cleanString(params.source_literature_item_id);
        if (source) {
          for (const [key, row] of Array.from(state.citationEdges.entries())) {
            if (cleanString(row.source_literature_item_id) === source) {
              state.citationEdges.delete(key);
            }
          }
          return;
        }
        state.citationEdges.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_citation_source_ownership")) {
        const source = cleanString(params.source_literature_item_id);
        if (source) {
          for (const [key, row] of Array.from(
            state.citationSourceOwnership.entries(),
          )) {
            if (cleanString(row.source_literature_item_id) === source) {
              state.citationSourceOwnership.delete(key);
            }
          }
          return;
        }
        state.citationSourceOwnership.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_citation_incoming_group")) {
        const source = cleanString(params.source_literature_item_id);
        if (source) {
          for (const [key, row] of Array.from(
            state.citationIncomingGroups.entries(),
          )) {
            if (cleanString(row.source_literature_item_id) === source) {
              state.citationIncomingGroups.delete(key);
            }
          }
          return;
        }
        state.citationIncomingGroups.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_citation_metrics_light")) {
        const id = cleanString(params.literature_item_id);
        if (id) {
          state.citationLightMetrics.delete(id);
          return;
        }
        state.citationLightMetrics.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_citation_metrics_complex")) {
        const id = cleanString(params.literature_item_id);
        if (id) {
          state.citationComplexMetrics.delete(id);
          return;
        }
        state.citationComplexMetrics.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_citation_layout_state")) {
        const layoutKey = cleanString(params.layout_key);
        if (layoutKey) {
          state.citationLayoutStates.delete(layoutKey);
          return;
        }
        state.citationLayoutStates.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_related_items_sync_effect")) {
        state.relatedItemsSyncEffects.clear();
        return;
      }
      if (
        normalized.startsWith("delete from synt_literature_matching_metadata")
      ) {
        state.literatureMatchingMetadata.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_topic_interest_metadata")) {
        state.topicInterestMetadata.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_topic_discovery_hint")) {
        const hintId = cleanString(params.hint_id);
        if (hintId) {
          state.topicDiscoveryHints.delete(hintId);
          return;
        }
        state.topicDiscoveryHints.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_topic_graph_node")) {
        state.topicGraphNodes.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_topic_graph_edge")) {
        state.topicGraphEdges.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_topic_graph_review_item")) {
        state.topicGraphReviewItems.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_topic_concept_link")) {
        state.topicConceptLinks.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_concept_review_item")) {
        state.conceptReviewItems.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_concept_relation")) {
        state.conceptRelations.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_concept_alias")) {
        state.conceptAliases.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_concept_sense")) {
        state.conceptSenses.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_concept")) {
        state.concepts.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_tag_validation_warning")) {
        state.tagValidationWarnings.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_tag_protocol")) {
        state.tagProtocols.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_tag_abbrev")) {
        state.tagAbbrevs.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_tag_alias")) {
        state.tagAliases.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_tag_vocabulary_entry")) {
        state.tagVocabularyEntries.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_review_item")) {
        state.reviewItems.clear();
        return;
      }
      if (normalized.startsWith("insert or replace into synt_schema_meta")) {
        state.schemaMeta.set(
          cleanString(params.meta_key),
          cleanString(params.meta_value),
        );
        return;
      }
      if (normalized.startsWith("insert or replace into synt_cache_basis")) {
        state.cacheBasis.set(cleanString(params.cache_key), memoryRow(params));
        return;
      }
      if (normalized.startsWith("insert or replace into synt_artifact_sidecar")) {
        const key = [
          cleanString(params.source_ref),
          cleanString(params.artifact_type),
        ].join("::");
        state.artifactSidecars.set(key, memoryRow(params));
        return;
      }
      if (normalized.startsWith("insert or replace into synt_raw_reference")) {
        state.rawReferences.set(
          cleanString(params.raw_reference_id),
          memoryRow(params),
        );
        return;
      }
      if (
        normalized.startsWith("insert or replace into synt_canonical_reference ")
      ) {
        state.canonicalReferences.set(
          cleanString(params.canonical_reference_id),
          memoryRow(params),
        );
        return;
      }
      if (
        normalized.startsWith(
          "insert or replace into synt_canonical_reference_redirect",
        )
      ) {
        state.canonicalReferenceRedirects.set(
          cleanString(params.from_canonical_reference_id),
          memoryRow(params),
        );
        return;
      }
      if (normalized.startsWith("insert or replace into synt_reference_binding")) {
        state.referenceBindings.set(
          cleanString(params.binding_id),
          memoryRow(params),
        );
        return;
      }
      if (
        normalized.startsWith(
          "insert or replace into synt_reference_match_proposal",
        )
      ) {
        state.referenceMatchProposals.set(
          cleanString(params.proposal_id),
          memoryRow(params),
        );
        return;
      }
      if (normalized.startsWith("insert or replace into synt_citation_node")) {
        state.citationNodes.set(
          cleanString(params.literature_item_id),
          memoryRow(params),
        );
        return;
      }
      if (normalized.startsWith("insert or replace into synt_citation_edge")) {
        state.citationEdges.set(cleanString(params.edge_id), memoryRow(params));
        return;
      }
      if (
        normalized.startsWith(
          "insert or replace into synt_citation_source_ownership",
        )
      ) {
        const key = [
          cleanString(params.source_literature_item_id),
          cleanString(params.edge_id),
        ].join("::");
        state.citationSourceOwnership.set(key, memoryRow(params));
        return;
      }
      if (
        normalized.startsWith(
          "insert or replace into synt_citation_incoming_group",
        )
      ) {
        const key = [
          cleanString(params.target_literature_item_id),
          cleanString(params.edge_id),
        ].join("::");
        state.citationIncomingGroups.set(key, memoryRow(params));
        return;
      }
      if (
        normalized.startsWith(
          "insert or replace into synt_citation_metrics_light",
        )
      ) {
        state.citationLightMetrics.set(
          cleanString(params.literature_item_id),
          memoryRow(params),
        );
        return;
      }
      if (
        normalized.startsWith(
          "insert or replace into synt_citation_metrics_complex",
        )
      ) {
        state.citationComplexMetrics.set(
          cleanString(params.literature_item_id),
          memoryRow(params),
        );
        return;
      }
      if (
        normalized.startsWith(
          "insert or replace into synt_citation_layout_state",
        )
      ) {
        state.citationLayoutStates.set(
          cleanString(params.layout_key),
          memoryRow(params),
        );
        return;
      }
      if (
        normalized.startsWith(
          "insert or replace into synt_related_items_sync_effect",
        )
      ) {
        state.relatedItemsSyncEffects.set(
          cleanString(params.effect_id),
          memoryRow(params),
        );
        return;
      }
      if (
        normalized.startsWith(
          "insert or replace into synt_literature_matching_metadata",
        )
      ) {
        state.literatureMatchingMetadata.set(
          cleanString(params.literature_item_id),
          memoryRow(params),
        );
        return;
      }
      if (
        normalized.startsWith(
          "insert or replace into synt_topic_interest_metadata",
        )
      ) {
        state.topicInterestMetadata.set(
          cleanString(params.topic_id),
          memoryRow(params),
        );
        return;
      }
      if (
        normalized.startsWith(
          "insert or replace into synt_topic_discovery_hint",
        )
      ) {
        state.topicDiscoveryHints.set(
          cleanString(params.hint_id),
          memoryRow(params),
        );
        return;
      }
      if (
        normalized.startsWith("insert or replace into synt_topic_graph_node")
      ) {
        state.topicGraphNodes.set(
          cleanString(params.topic_id),
          memoryRow(params),
        );
        return;
      }
      if (
        normalized.startsWith("insert or replace into synt_topic_graph_edge")
      ) {
        state.topicGraphEdges.set(
          cleanString(params.edge_id),
          memoryRow(params),
        );
        return;
      }
      if (
        normalized.startsWith(
          "insert or replace into synt_topic_graph_review_item",
        )
      ) {
        state.topicGraphReviewItems.set(
          cleanString(params.review_id),
          memoryRow(params),
        );
        return;
      }
      if (normalized.startsWith("insert or replace into synt_concept ")) {
        state.concepts.set(cleanString(params.concept_id), memoryRow(params));
        return;
      }
      if (normalized.startsWith("insert or replace into synt_concept_sense")) {
        state.conceptSenses.set(
          cleanString(params.sense_id),
          memoryRow(params),
        );
        return;
      }
      if (normalized.startsWith("insert or replace into synt_concept_alias")) {
        state.conceptAliases.set(
          cleanString(params.alias_id),
          memoryRow(params),
        );
        return;
      }
      if (
        normalized.startsWith("insert or replace into synt_concept_relation")
      ) {
        state.conceptRelations.set(
          cleanString(params.relation_id),
          memoryRow(params),
        );
        return;
      }
      if (
        normalized.startsWith("insert or replace into synt_concept_review_item")
      ) {
        state.conceptReviewItems.set(
          cleanString(params.review_id),
          memoryRow(params),
        );
        return;
      }
      if (
        normalized.startsWith("insert or replace into synt_topic_concept_link")
      ) {
        const key = [
          cleanString(params.topic_id),
          cleanString(params.concept_id),
          cleanString(params.sense_id),
        ].join("::");
        state.topicConceptLinks.set(key, memoryRow(params));
        return;
      }
      if (
        normalized.startsWith(
          "insert or replace into synt_tag_vocabulary_entry",
        )
      ) {
        state.tagVocabularyEntries.set(
          cleanString(params.tag),
          memoryRow(params),
        );
        return;
      }
      if (normalized.startsWith("insert or replace into synt_tag_alias")) {
        state.tagAliases.set(cleanString(params.alias), memoryRow(params));
        return;
      }
      if (normalized.startsWith("insert or replace into synt_tag_abbrev")) {
        state.tagAbbrevs.set(cleanString(params.abbrev_key), memoryRow(params));
        return;
      }
      if (normalized.startsWith("insert or replace into synt_tag_protocol")) {
        state.tagProtocols.set(
          cleanString(params.protocol_id),
          memoryRow(params),
        );
        return;
      }
      if (
        normalized.startsWith(
          "insert or replace into synt_tag_validation_warning",
        )
      ) {
        state.tagValidationWarnings.set(
          cleanString(params.warning_id),
          memoryRow(params),
        );
        return;
      }
      if (normalized.startsWith("insert or replace into synt_review_item")) {
        state.reviewItems.set(
          cleanString(params.review_item_id),
          memoryRow(params),
        );
        return;
      }
      if (normalized.startsWith("insert or replace into synt_operation")) {
        state.operations.set(
          cleanString(params.operation_id),
          memoryRow(params),
        );
      }
    },
    all(sql, params = {}) {
      const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
      if (normalized.includes("from sqlite_master")) {
        return [
          ...Array.from(state.tables).map((name) => ({
            name,
            type: "table",
          })),
          ...Array.from(state.indexes).map((name) => ({
            name,
            type: "index",
          })),
        ].sort((left, right) =>
          String(left.name).localeCompare(String(right.name)),
        );
      }
      if (normalized.includes("from synt_schema_meta")) {
        const metaKey = cleanString(params.meta_key);
        if (metaKey) {
          const value = state.schemaMeta.get(metaKey);
          return value === undefined ? [] : [{ key: metaKey, value }];
        }
        return Array.from(state.schemaMeta.entries()).map(([key, value]) => ({
          key,
          value,
        }));
      }
      if (normalized.includes("from synt_cache_basis")) {
        const cacheKey = cleanString(params.cache_key);
        const rows = cacheKey
          ? [state.cacheBasis.get(cacheKey)].filter(
              (row): row is Record<string, SqlPrimitive> => Boolean(row),
            )
          : Array.from(state.cacheBasis.values());
        return rows.map((row) => ({ ...row }));
      }
      if (normalized.includes("from synt_artifact_sidecar")) {
        return Array.from(state.artifactSidecars.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_raw_reference")) {
        return Array.from(state.rawReferences.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_canonical_reference_redirect")) {
        return Array.from(state.canonicalReferenceRedirects.values()).map(
          (row) => ({
            ...row,
          }),
        );
      }
      if (normalized.includes("from synt_canonical_reference")) {
        return Array.from(state.canonicalReferences.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_reference_binding")) {
        return Array.from(state.referenceBindings.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_reference_match_proposal")) {
        return Array.from(state.referenceMatchProposals.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_citation_node")) {
        return Array.from(state.citationNodes.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_citation_edge")) {
        return Array.from(state.citationEdges.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_citation_source_ownership")) {
        return Array.from(state.citationSourceOwnership.values()).map(
          (row) => ({
            ...row,
          }),
        );
      }
      if (normalized.includes("from synt_citation_incoming_group")) {
        return Array.from(state.citationIncomingGroups.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_citation_metrics_light")) {
        return Array.from(state.citationLightMetrics.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_citation_metrics_complex")) {
        return Array.from(state.citationComplexMetrics.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_citation_layout_state")) {
        const layoutKey = cleanString(params.layout_key);
        const rows = layoutKey
          ? [state.citationLayoutStates.get(layoutKey)].filter(
              (row): row is Record<string, SqlPrimitive> => Boolean(row),
            )
          : Array.from(state.citationLayoutStates.values());
        return rows.map((row) => ({ ...row }));
      }
      if (normalized.includes("from synt_related_items_sync_effect")) {
        const effectId = cleanString(params.effect_id);
        const rows = effectId
          ? [state.relatedItemsSyncEffects.get(effectId)].filter(
              (row): row is Record<string, SqlPrimitive> => Boolean(row),
            )
          : Array.from(state.relatedItemsSyncEffects.values());
        return rows.map((row) => ({ ...row }));
      }
      if (normalized.includes("from synt_literature_matching_metadata")) {
        const id = cleanString(params.literature_item_id);
        const rows = id
          ? [state.literatureMatchingMetadata.get(id)].filter(
              (row): row is Record<string, SqlPrimitive> => Boolean(row),
            )
          : Array.from(state.literatureMatchingMetadata.values());
        return rows.map((row) => ({ ...row }));
      }
      if (normalized.includes("from synt_topic_interest_metadata")) {
        const id = cleanString(params.topic_id);
        const rows = id
          ? [state.topicInterestMetadata.get(id)].filter(
              (row): row is Record<string, SqlPrimitive> => Boolean(row),
            )
          : Array.from(state.topicInterestMetadata.values());
        return rows.map((row) => ({ ...row }));
      }
      if (normalized.includes("from synt_topic_discovery_hint")) {
        const hintId = cleanString(params.hint_id);
        const rows = hintId
          ? [state.topicDiscoveryHints.get(hintId)].filter(
              (row): row is Record<string, SqlPrimitive> => Boolean(row),
            )
          : Array.from(state.topicDiscoveryHints.values());
        return rows.map((row) => ({ ...row }));
      }
      if (normalized.includes("from synt_topic_graph_node")) {
        return Array.from(state.topicGraphNodes.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_topic_graph_edge")) {
        return Array.from(state.topicGraphEdges.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_topic_graph_review_item")) {
        return Array.from(state.topicGraphReviewItems.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_concept_sense")) {
        return Array.from(state.conceptSenses.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_concept_alias")) {
        return Array.from(state.conceptAliases.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_concept_relation")) {
        return Array.from(state.conceptRelations.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_concept_review_item")) {
        return Array.from(state.conceptReviewItems.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_topic_concept_link")) {
        return Array.from(state.topicConceptLinks.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_tag_vocabulary_entry")) {
        return Array.from(state.tagVocabularyEntries.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_tag_alias")) {
        return Array.from(state.tagAliases.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_tag_abbrev")) {
        return Array.from(state.tagAbbrevs.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_tag_protocol")) {
        return Array.from(state.tagProtocols.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_tag_validation_warning")) {
        return Array.from(state.tagValidationWarnings.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_concept")) {
        return Array.from(state.concepts.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_review_item")) {
        return Array.from(state.reviewItems.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_operation")) {
        const operationId = cleanString(params.operation_id);
        const rows = operationId
          ? [state.operations.get(operationId)].filter(
              (row): row is Record<string, SqlPrimitive> => Boolean(row),
            )
          : Array.from(state.operations.values());
        return rows.map((row) => ({ ...row }));
      }
      return [];
    },
    get(sql, params = {}) {
      const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
      const countMatch = normalized.match(
        /^select count\(\*\) as value from (synt_[a-z_]+)/,
      );
      if (countMatch) {
        return {
          value: memoryTable(state, countMatch[1], { allowMissing: true })
            ?.size ?? 0,
        };
      }
      return this.all(sql, params)[0] || null;
    },
    transaction(fn) {
      const before = cloneMemoryState(state);
      try {
        return fn();
      } catch (error) {
        state = before;
        throw error;
      }
    },
  };
}

function memoryRow(params: SqlParams) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      normalizeSqlParam(value),
    ]),
  ) as Record<string, SqlPrimitive>;
}

function memoryTable(
  state: MemoryState,
  name: string,
  options: { allowMissing?: boolean } = {},
): Map<string, Record<string, SqlPrimitive>> | undefined {
  switch (name) {
    case "synt_cache_basis":
      return state.cacheBasis;
    case "synt_artifact_sidecar":
      return state.artifactSidecars;
    case "synt_raw_reference":
      return state.rawReferences;
    case "synt_canonical_reference":
      return state.canonicalReferences;
    case "synt_canonical_reference_redirect":
      return state.canonicalReferenceRedirects;
    case "synt_reference_binding":
      return state.referenceBindings;
    case "synt_reference_match_proposal":
      return state.referenceMatchProposals;
    case "synt_citation_node":
      return state.citationNodes;
    case "synt_citation_edge":
      return state.citationEdges;
    case "synt_citation_source_ownership":
      return state.citationSourceOwnership;
    case "synt_citation_incoming_group":
      return state.citationIncomingGroups;
    case "synt_citation_metrics_light":
      return state.citationLightMetrics;
    case "synt_citation_metrics_complex":
      return state.citationComplexMetrics;
    case "synt_citation_layout_state":
      return state.citationLayoutStates;
    case "synt_related_items_sync_effect":
      return state.relatedItemsSyncEffects;
    case "synt_literature_matching_metadata":
      return state.literatureMatchingMetadata;
    case "synt_topic_interest_metadata":
      return state.topicInterestMetadata;
    case "synt_topic_discovery_hint":
      return state.topicDiscoveryHints;
    case "synt_topic_graph_node":
      return state.topicGraphNodes;
    case "synt_topic_graph_edge":
      return state.topicGraphEdges;
    case "synt_topic_graph_review_item":
      return state.topicGraphReviewItems;
    case "synt_concept":
      return state.concepts;
    case "synt_concept_sense":
      return state.conceptSenses;
    case "synt_concept_alias":
      return state.conceptAliases;
    case "synt_concept_relation":
      return state.conceptRelations;
    case "synt_concept_review_item":
      return state.conceptReviewItems;
    case "synt_topic_concept_link":
      return state.topicConceptLinks;
    case "synt_tag_vocabulary_entry":
      return state.tagVocabularyEntries;
    case "synt_tag_alias":
      return state.tagAliases;
    case "synt_tag_abbrev":
      return state.tagAbbrevs;
    case "synt_tag_protocol":
      return state.tagProtocols;
    case "synt_tag_validation_warning":
      return state.tagValidationWarnings;
    case "synt_review_item":
      return state.reviewItems;
    case "synt_operation":
      return state.operations;
    default:
      if (options.allowMissing) {
        return undefined;
      }
      throw new Error(`Unsupported in-memory synthesis table: ${name}`);
  }
}

function resolveAdapter(runtimeRoot?: string) {
  const runtime = globalThis as {
    Services?: unknown;
    Zotero?: unknown;
  };
  const dbPath = getSynthesisRepositoryDatabasePath(runtimeRoot);
  if (runtime.Services && runtime.Zotero) {
    return buildZoteroAdapter(dbPath);
  }
  if (runtimeRoot) {
    const existing = memoryAdaptersByRuntimeDbPath.get(dbPath);
    if (existing) {
      return existing;
    }
    const adapter = createMemoryAdapter();
    memoryAdaptersByRuntimeDbPath.set(dbPath, adapter);
    return adapter;
  }
  return createMemoryAdapter();
}

function ensureSchema(db: SqlAdapter) {
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_cache_basis (
      cache_key TEXT PRIMARY KEY,
      cache_kind TEXT NOT NULL,
      scope_kind TEXT NOT NULL DEFAULT '',
      scope_ref TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'missing',
      basis_kind TEXT NOT NULL DEFAULT '',
      basis_value TEXT NOT NULL DEFAULT '',
      source_hash TEXT NOT NULL DEFAULT '',
      policy_version TEXT NOT NULL DEFAULT '',
      active_operation_id TEXT NOT NULL DEFAULT '',
      refreshed_at TEXT NOT NULL DEFAULT '',
      stale_reason TEXT NOT NULL DEFAULT '',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_artifact_sidecar (
      source_ref TEXT NOT NULL,
      library_id INTEGER NOT NULL DEFAULT 0,
      item_key TEXT NOT NULL DEFAULT '',
      artifact_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'missing',
      artifact_hash TEXT NOT NULL DEFAULT '',
      locator_json TEXT NOT NULL DEFAULT '{}',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      scanned_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (source_ref, artifact_type)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_raw_reference (
      raw_reference_id TEXT PRIMARY KEY,
      source_ref TEXT NOT NULL,
      references_artifact_hash TEXT NOT NULL DEFAULT '',
      reference_index INTEGER NOT NULL DEFAULT 0,
      raw_hash TEXT NOT NULL DEFAULT '',
      parsed_title TEXT NOT NULL DEFAULT '',
      normalized_title TEXT NOT NULL DEFAULT '',
      year TEXT NOT NULL DEFAULT '',
      authors_json TEXT NOT NULL DEFAULT '[]',
      raw_reference TEXT NOT NULL DEFAULT '',
      canonical_reference_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_canonical_reference (
      canonical_reference_id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      normalized_title TEXT NOT NULL DEFAULT '',
      year TEXT NOT NULL DEFAULT '',
      authors_json TEXT NOT NULL DEFAULT '[]',
      identifiers_json TEXT NOT NULL DEFAULT '{}',
      metadata_hash TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_canonical_reference_redirect (
      from_canonical_reference_id TEXT PRIMARY KEY,
      to_canonical_reference_id TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_reference_binding (
      binding_id TEXT PRIMARY KEY,
      canonical_reference_id TEXT NOT NULL,
      library_id INTEGER NOT NULL DEFAULT 0,
      item_key TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'candidate',
      confidence TEXT NOT NULL DEFAULT '',
      reviewer TEXT NOT NULL DEFAULT '',
      basis_hash TEXT NOT NULL DEFAULT '',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      UNIQUE(canonical_reference_id, library_id, item_key)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_reference_match_proposal (
      proposal_id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      source_canonical_reference_id TEXT NOT NULL,
      source_raw_reference_ids_json TEXT NOT NULL DEFAULT '[]',
      target_canonical_reference_id TEXT NOT NULL DEFAULT '',
      target_library_id INTEGER NOT NULL DEFAULT 0,
      target_item_key TEXT NOT NULL DEFAULT '',
      confidence TEXT NOT NULL DEFAULT '',
      score REAL NOT NULL DEFAULT 0,
      reasons_json TEXT NOT NULL DEFAULT '[]',
      evidence_json TEXT NOT NULL DEFAULT '{}',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      basis_hash TEXT NOT NULL DEFAULT '',
      source_hash TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_citation_node (
      literature_item_id TEXT PRIMARY KEY,
      node_status TEXT NOT NULL DEFAULT 'active',
      has_zotero_binding INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL DEFAULT '',
      year TEXT NOT NULL DEFAULT '',
      summary_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_citation_edge (
      edge_id TEXT PRIMARY KEY,
      source_literature_item_id TEXT NOT NULL,
      target_literature_item_id TEXT NOT NULL DEFAULT '',
      reference_instance_id TEXT NOT NULL DEFAULT '',
      resolution_id TEXT NOT NULL DEFAULT '',
      edge_status TEXT NOT NULL DEFAULT 'unbound',
      roles_json TEXT NOT NULL DEFAULT '[]',
      weight REAL NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      UNIQUE(source_literature_item_id, reference_instance_id)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_citation_source_ownership (
      source_literature_item_id TEXT NOT NULL,
      edge_id TEXT NOT NULL,
      reference_instance_id TEXT NOT NULL DEFAULT '',
      target_literature_item_id TEXT NOT NULL DEFAULT '',
      edge_status TEXT NOT NULL DEFAULT 'unbound',
      updated_at TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (source_literature_item_id, edge_id)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_citation_incoming_group (
      target_literature_item_id TEXT NOT NULL,
      source_literature_item_id TEXT NOT NULL,
      edge_id TEXT NOT NULL,
      reference_instance_id TEXT NOT NULL DEFAULT '',
      edge_status TEXT NOT NULL DEFAULT 'unbound',
      updated_at TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (target_literature_item_id, edge_id)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_citation_metrics_light (
      literature_item_id TEXT PRIMARY KEY,
      outgoing_count INTEGER NOT NULL DEFAULT 0,
      incoming_count INTEGER NOT NULL DEFAULT 0,
      matched_outgoing_count INTEGER NOT NULL DEFAULT 0,
      unresolved_outgoing_count INTEGER NOT NULL DEFAULT 0,
      ambiguous_outgoing_count INTEGER NOT NULL DEFAULT 0,
      local_degree INTEGER NOT NULL DEFAULT 0,
      source_structure_version INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_citation_metrics_complex (
      literature_item_id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL DEFAULT '',
      paper_ref TEXT NOT NULL DEFAULT '',
      item_key TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      year TEXT NOT NULL DEFAULT '',
      internal_in_degree INTEGER NOT NULL DEFAULT 0,
      internal_out_degree INTEGER NOT NULL DEFAULT 0,
      external_reference_count INTEGER NOT NULL DEFAULT 0,
      unresolved_reference_count INTEGER NOT NULL DEFAULT 0,
      internal_pagerank REAL NOT NULL DEFAULT 0,
      component_id TEXT NOT NULL DEFAULT '',
      component_size INTEGER NOT NULL DEFAULT 0,
      is_isolated INTEGER NOT NULL DEFAULT 0,
      age_norm REAL NOT NULL DEFAULT 0,
      recency_norm REAL NOT NULL DEFAULT 0,
      in_degree_norm REAL NOT NULL DEFAULT 0,
      out_degree_norm REAL NOT NULL DEFAULT 0,
      pagerank_norm REAL NOT NULL DEFAULT 0,
      foundation_score REAL NOT NULL DEFAULT 0,
      frontier_score REAL NOT NULL DEFAULT 0,
      synthesis_role_hints_json TEXT NOT NULL DEFAULT '[]',
      source_structure_version INTEGER NOT NULL DEFAULT 0,
      source_graph_hash TEXT NOT NULL DEFAULT '',
      metrics_hash TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'ready',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_citation_layout_state (
      layout_key TEXT PRIMARY KEY,
      view_key TEXT NOT NULL DEFAULT 'workbench_overview',
      preset TEXT NOT NULL DEFAULT 'force',
      graph_hash TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'missing',
      layout_json TEXT NOT NULL DEFAULT '{}',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      UNIQUE(view_key, preset)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_related_items_sync_effect (
      effect_id TEXT PRIMARY KEY,
      operation_id TEXT NOT NULL DEFAULT '',
      citation_edge_id TEXT NOT NULL DEFAULT '',
      source_literature_item_id TEXT NOT NULL,
      target_literature_item_id TEXT NOT NULL,
      source_library_id INTEGER NOT NULL DEFAULT 0,
      source_item_key TEXT NOT NULL DEFAULT '',
      target_library_id INTEGER NOT NULL DEFAULT 0,
      target_item_key TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL DEFAULT 'add',
      status TEXT NOT NULL DEFAULT 'pending_external_write',
      created_by_synthesis INTEGER NOT NULL DEFAULT 0,
      graph_basis_hash TEXT NOT NULL DEFAULT '',
      graph_hash TEXT NOT NULL DEFAULT '',
      external_write_at TEXT NOT NULL DEFAULT '',
      echo_state TEXT NOT NULL DEFAULT 'none',
      echo_observed_at TEXT NOT NULL DEFAULT '',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  applyOptionalMigration(
    db,
    "ALTER TABLE synt_related_items_sync_effect ADD COLUMN external_write_at TEXT NOT NULL DEFAULT ''",
  );
  applyOptionalMigration(
    db,
    "ALTER TABLE synt_related_items_sync_effect ADD COLUMN echo_state TEXT NOT NULL DEFAULT 'none'",
  );
  applyOptionalMigration(
    db,
    "ALTER TABLE synt_related_items_sync_effect ADD COLUMN echo_observed_at TEXT NOT NULL DEFAULT ''",
  );
  applyOptionalMigration(
    db,
    "ALTER TABLE synt_related_items_sync_effect ADD COLUMN graph_basis_hash TEXT NOT NULL DEFAULT ''",
  );
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_literature_matching_metadata (
      literature_item_id TEXT PRIMARY KEY,
      schema_id TEXT NOT NULL DEFAULT 'literature_matching_metadata.v1',
      key_terms_json TEXT NOT NULL DEFAULT '[]',
      methods_json TEXT NOT NULL DEFAULT '[]',
      problems_json TEXT NOT NULL DEFAULT '[]',
      datasets_json TEXT NOT NULL DEFAULT '[]',
      exclude_terms_json TEXT NOT NULL DEFAULT '[]',
      source_artifact_hash TEXT NOT NULL DEFAULT '',
      metadata_hash TEXT NOT NULL DEFAULT '',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_topic_interest_metadata (
      topic_id TEXT PRIMARY KEY,
      schema_id TEXT NOT NULL DEFAULT 'topic_interest_metadata.v1',
      include_terms_json TEXT NOT NULL DEFAULT '[]',
      must_have_terms_json TEXT NOT NULL DEFAULT '[]',
      methods_json TEXT NOT NULL DEFAULT '[]',
      exclude_terms_json TEXT NOT NULL DEFAULT '[]',
      seed_literature_item_ids_json TEXT NOT NULL DEFAULT '[]',
      source_artifact_hash TEXT NOT NULL DEFAULT '',
      metadata_hash TEXT NOT NULL DEFAULT '',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_topic_discovery_hint (
      hint_id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      literature_item_id TEXT NOT NULL,
      score REAL NOT NULL DEFAULT 0,
      method TEXT NOT NULL DEFAULT 'metadata-overlap-v1',
      matching_fields_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      UNIQUE(topic_id, literature_item_id, method)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_topic_graph_node (
      topic_id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      aliases_json TEXT NOT NULL DEFAULT '[]',
      node_type TEXT NOT NULL DEFAULT 'placeholder',
      definition_status TEXT NOT NULL DEFAULT '',
      current_artifact_path TEXT NOT NULL DEFAULT '',
      is_root INTEGER NOT NULL DEFAULT 0,
      level TEXT NOT NULL DEFAULT '',
      paper_count INTEGER NOT NULL DEFAULT 0,
      last_synthesis_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_topic_graph_edge (
      edge_id TEXT PRIMARY KEY,
      source_topic_id TEXT NOT NULL,
      target_topic_id TEXT NOT NULL,
      relation TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'suggested',
      confidence REAL,
      provenance_json TEXT NOT NULL DEFAULT '[]',
      evidence_refs_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      UNIQUE(source_topic_id, target_topic_id, relation)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_topic_graph_review_item (
      review_id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'open',
      source_topic_id TEXT NOT NULL,
      target_topic_id TEXT NOT NULL,
      target_title TEXT NOT NULL DEFAULT '',
      relation TEXT NOT NULL,
      confidence REAL,
      provenance_json TEXT NOT NULL DEFAULT '[]',
      evidence_refs_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      resolved_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_concept (
      concept_id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      aliases_json TEXT NOT NULL DEFAULT '[]',
      concept_type TEXT NOT NULL DEFAULT 'concept',
      domain TEXT NOT NULL DEFAULT 'general',
      status TEXT NOT NULL DEFAULT 'active',
      short_definition TEXT NOT NULL DEFAULT '',
      definition TEXT NOT NULL DEFAULT '',
      usage_note TEXT NOT NULL DEFAULT '',
      editorial_note TEXT NOT NULL DEFAULT '',
      sense_ids_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_concept_sense (
      sense_id TEXT PRIMARY KEY,
      concept_id TEXT NOT NULL,
      label TEXT NOT NULL,
      aliases_json TEXT NOT NULL DEFAULT '[]',
      domain TEXT NOT NULL DEFAULT 'general',
      short_definition TEXT NOT NULL DEFAULT '',
      definition TEXT NOT NULL DEFAULT '',
      disambiguation TEXT NOT NULL DEFAULT '',
      topic_relevance TEXT NOT NULL DEFAULT '',
      confidence TEXT NOT NULL DEFAULT 'medium',
      source_topic_ids_json TEXT NOT NULL DEFAULT '[]',
      evidence_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_concept_alias (
      alias_id TEXT PRIMARY KEY,
      alias TEXT NOT NULL,
      normalized TEXT NOT NULL,
      concept_id TEXT NOT NULL,
      sense_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      confidence TEXT NOT NULL DEFAULT 'medium',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_concept_relation (
      relation_id TEXT PRIMARY KEY,
      source_concept_id TEXT NOT NULL,
      target_concept_id TEXT NOT NULL,
      relation TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'suggested',
      confidence TEXT NOT NULL DEFAULT 'medium',
      provenance_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      UNIQUE(source_concept_id, target_concept_id, relation)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_concept_review_item (
      review_id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'open',
      reason TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      topic_path_id TEXT NOT NULL DEFAULT '',
      label TEXT NOT NULL DEFAULT '',
      confidence TEXT NOT NULL DEFAULT 'medium',
      candidate_concept_ids_json TEXT NOT NULL DEFAULT '[]',
      proposal_json TEXT NOT NULL DEFAULT '{}',
      target_concept_id TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      resolved_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_topic_concept_link (
      topic_id TEXT NOT NULL,
      concept_id TEXT NOT NULL,
      sense_id TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      relevance TEXT NOT NULL DEFAULT '',
      confidence TEXT NOT NULL DEFAULT 'medium',
      source TEXT NOT NULL DEFAULT 'topic_synthesis_concept_cards',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      PRIMARY KEY(topic_id, concept_id, sense_id)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_tag_vocabulary_entry (
      tag TEXT PRIMARY KEY,
      facet TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      deprecated INTEGER NOT NULL DEFAULT 0,
      replacement TEXT NOT NULL DEFAULT '',
      aliases_json TEXT NOT NULL DEFAULT '[]',
      abbrev_json TEXT NOT NULL DEFAULT '[]',
      usage_count INTEGER NOT NULL DEFAULT 0,
      last_synced_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_tag_alias (
      alias TEXT PRIMARY KEY,
      tag TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_tag_abbrev (
      abbrev_key TEXT PRIMARY KEY,
      abbrev_value TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_tag_protocol (
      protocol_id TEXT PRIMARY KEY,
      version TEXT NOT NULL DEFAULT '1.0.0',
      tag_pattern TEXT NOT NULL DEFAULT '',
      max_tag_length INTEGER NOT NULL DEFAULT 120,
      facets_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_tag_validation_warning (
      warning_id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'warning',
      tag TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_review_item (
      review_item_id TEXT PRIMARY KEY,
      review_kind TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 2,
      status TEXT NOT NULL DEFAULT 'open',
      scope_kind TEXT NOT NULL DEFAULT '',
      scope_ref TEXT NOT NULL DEFAULT '',
      blocked_by_review_item_id TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL DEFAULT '{}',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_operation (
      operation_id TEXT PRIMARY KEY,
      operation_type TEXT NOT NULL,
      library_id INTEGER NOT NULL DEFAULT 0,
      scope_kind TEXT NOT NULL DEFAULT '',
      scope_ref TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      label TEXT NOT NULL DEFAULT '',
      phase TEXT NOT NULL DEFAULT '',
      phase_label TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      progress_mode TEXT NOT NULL DEFAULT 'indeterminate',
      processed_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      total_count INTEGER NOT NULL DEFAULT 0,
      basis_kind TEXT NOT NULL DEFAULT '',
      basis_value TEXT NOT NULL DEFAULT '',
      source_hash TEXT NOT NULL DEFAULT '',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL DEFAULT '',
      completed_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  dropRemovedSynchronizationTables(db);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_cache_basis_kind_status
      ON synt_cache_basis(cache_kind, status, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_artifact_sidecar_source
      ON synt_artifact_sidecar(source_ref, artifact_type, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_artifact_sidecar_hash
      ON synt_artifact_sidecar(artifact_type, artifact_hash);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_raw_reference_source
      ON synt_raw_reference(source_ref, references_artifact_hash, reference_index);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_raw_reference_canonical_status
      ON synt_raw_reference(canonical_reference_id, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_canonical_reference_title
      ON synt_canonical_reference(normalized_title, year);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_reference_binding_target
      ON synt_reference_binding(library_id, item_key, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_reference_binding_canonical
      ON synt_reference_binding(canonical_reference_id, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_reference_match_proposal_status
      ON synt_reference_match_proposal(status, kind, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_reference_match_proposal_source
      ON synt_reference_match_proposal(source_canonical_reference_id, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_reference_match_proposal_basis
      ON synt_reference_match_proposal(kind, basis_hash, source_hash, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_citation_node_status
      ON synt_citation_node(node_status, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_citation_edge_source_status
      ON synt_citation_edge(source_literature_item_id, edge_status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_citation_edge_target_status
      ON synt_citation_edge(target_literature_item_id, edge_status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_citation_source_owner_source
      ON synt_citation_source_ownership(source_literature_item_id, edge_status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_citation_incoming_target
      ON synt_citation_incoming_group(target_literature_item_id, edge_status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_citation_metrics_light_degree
      ON synt_citation_metrics_light(local_degree, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_citation_metrics_complex_status_foundation
      ON synt_citation_metrics_complex(status, foundation_score DESC, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_citation_metrics_complex_status_frontier
      ON synt_citation_metrics_complex(status, frontier_score DESC, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_citation_metrics_complex_status_pagerank
      ON synt_citation_metrics_complex(status, internal_pagerank DESC, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_citation_layout_view_status
      ON synt_citation_layout_state(view_key, preset, status, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_related_items_sync_effect_status
      ON synt_related_items_sync_effect(status, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_related_items_sync_effect_pair
      ON synt_related_items_sync_effect(source_library_id, source_item_key, target_library_id, target_item_key, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_literature_matching_metadata_updated
      ON synt_literature_matching_metadata(updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_literature_matching_metadata_hash
      ON synt_literature_matching_metadata(metadata_hash);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_topic_interest_metadata_updated
      ON synt_topic_interest_metadata(updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_topic_interest_metadata_hash
      ON synt_topic_interest_metadata(metadata_hash);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_topic_discovery_hint_topic_status
      ON synt_topic_discovery_hint(topic_id, status, score DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_topic_discovery_hint_source_status
      ON synt_topic_discovery_hint(literature_item_id, status, score DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_topic_discovery_hint_updated
      ON synt_topic_discovery_hint(updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_related_items_sync_echo
      ON synt_related_items_sync_effect(source_library_id, source_item_key, echo_state, external_write_at);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_topic_graph_node_type_updated
      ON synt_topic_graph_node(node_type, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_topic_graph_node_definition_updated
      ON synt_topic_graph_node(definition_status, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_topic_graph_edge_source_status
      ON synt_topic_graph_edge(source_topic_id, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_topic_graph_edge_target_status
      ON synt_topic_graph_edge(target_topic_id, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_topic_graph_edge_relation_status
      ON synt_topic_graph_edge(relation, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_topic_graph_review_status_updated
      ON synt_topic_graph_review_item(status, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_topic_graph_review_source
      ON synt_topic_graph_review_item(source_topic_id, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_topic_graph_review_target
      ON synt_topic_graph_review_item(target_topic_id, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_concept_status_updated
      ON synt_concept(status, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_concept_type_domain
      ON synt_concept(concept_type, domain);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_concept_label
      ON synt_concept(label);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_concept_sense_concept
      ON synt_concept_sense(concept_id, confidence);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_concept_sense_domain
      ON synt_concept_sense(domain, confidence);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_concept_alias_normalized_status
      ON synt_concept_alias(normalized, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_concept_alias_concept_status
      ON synt_concept_alias(concept_id, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_concept_relation_source_status
      ON synt_concept_relation(source_concept_id, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_concept_relation_target_status
      ON synt_concept_relation(target_concept_id, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_concept_relation_type_status
      ON synt_concept_relation(relation, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_concept_review_status_updated
      ON synt_concept_review_item(status, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_concept_review_topic_status
      ON synt_concept_review_item(topic_id, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_concept_review_target_status
      ON synt_concept_review_item(target_concept_id, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_topic_concept_link_topic
      ON synt_topic_concept_link(topic_id);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_topic_concept_link_concept
      ON synt_topic_concept_link(concept_id);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_tag_vocabulary_facet_updated
      ON synt_tag_vocabulary_entry(facet, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_tag_vocabulary_deprecated
      ON synt_tag_vocabulary_entry(deprecated, facet);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_tag_alias_tag
      ON synt_tag_alias(tag);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_tag_abbrev_value
      ON synt_tag_abbrev(abbrev_value);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_tag_validation_severity
      ON synt_tag_validation_warning(severity, code);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_review_item_priority_status
      ON synt_review_item(priority, status, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_review_item_scope_status
      ON synt_review_item(scope_kind, scope_ref, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_review_item_blocked_status
      ON synt_review_item(blocked_by_review_item_id, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_operation_type_status_updated
      ON synt_operation(operation_type, status, updated_at DESC);
  `);
  db.run(
    `
      INSERT OR REPLACE INTO synt_schema_meta(key, value)
      VALUES (@meta_key, @meta_value)
    `,
    {
      meta_key: "schema_version",
      meta_value: SCHEMA_VERSION,
    },
  );
}

function rowToArtifactSidecar(row: SqlRow): SynthesisArtifactSidecarRecord {
  return {
    sourceRef: cleanString(row.source_ref),
    libraryId: Math.max(0, Math.floor(Number(row.library_id) || 0)),
    itemKey: cleanString(row.item_key),
    artifactType: cleanString(row.artifact_type),
    status: cleanString(row.status) || "missing",
    artifactHash: cleanString(row.artifact_hash) || undefined,
    locatorJson: cleanString(row.locator_json) || "{}",
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    scannedAt: cleanString(row.scanned_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToRawReference(row: SqlRow): SynthesisRawReferenceRecord {
  return {
    rawReferenceId: cleanString(row.raw_reference_id),
    sourceRef: cleanString(row.source_ref),
    referencesArtifactHash: cleanString(row.references_artifact_hash),
    referenceIndex: Math.max(0, Math.floor(Number(row.reference_index) || 0)),
    rawHash: cleanString(row.raw_hash),
    parsedTitle: cleanString(row.parsed_title) || undefined,
    normalizedTitle: cleanString(row.normalized_title) || undefined,
    year: cleanString(row.year) || undefined,
    authorsJson: cleanString(row.authors_json) || undefined,
    rawReference: cleanString(row.raw_reference) || undefined,
    canonicalReferenceId: cleanString(row.canonical_reference_id) || undefined,
    status: cleanString(row.status) || "active",
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToCanonicalReference(
  row: SqlRow,
): SynthesisCanonicalReferenceRecord {
  return {
    canonicalReferenceId: cleanString(row.canonical_reference_id),
    title: cleanString(row.title) || undefined,
    normalizedTitle: cleanString(row.normalized_title) || undefined,
    year: cleanString(row.year) || undefined,
    authorsJson: cleanString(row.authors_json) || "[]",
    identifiersJson: cleanString(row.identifiers_json) || "{}",
    metadataHash: cleanString(row.metadata_hash) || undefined,
    status: cleanString(row.status) || "active",
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToCanonicalReferenceRedirect(
  row: SqlRow,
): SynthesisCanonicalReferenceRedirectRecord {
  return {
    fromCanonicalReferenceId: cleanString(row.from_canonical_reference_id),
    toCanonicalReferenceId: cleanString(row.to_canonical_reference_id),
    reason: cleanString(row.reason) || undefined,
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToReferenceBinding(row: SqlRow): SynthesisReferenceBindingRecord {
  return {
    bindingId: cleanString(row.binding_id),
    canonicalReferenceId: cleanString(row.canonical_reference_id),
    libraryId: Math.max(0, Math.floor(Number(row.library_id) || 0)),
    itemKey: cleanString(row.item_key),
    status: normalizeReferenceBindingState(row.status),
    confidence: cleanString(row.confidence) || undefined,
    reviewer: cleanString(row.reviewer) || undefined,
    basisHash: cleanString(row.basis_hash) || undefined,
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function normalizeReferenceMatchProposalKind(
  value: unknown,
): SynthesisReferenceMatchProposalKind {
  const text = cleanString(value);
  return text === "canonical_merge" ? "canonical_merge" : "zotero_binding";
}

function normalizeReferenceMatchProposalStatus(
  value: unknown,
): SynthesisReferenceMatchProposalStatus {
  const text = cleanString(value);
  if (
    text === "accepted" ||
    text === "rejected" ||
    text === "superseded"
  ) {
    return text;
  }
  return "open";
}

function rowToReferenceMatchProposal(
  row: SqlRow,
): SynthesisReferenceMatchProposalRecord {
  return {
    proposalId: cleanString(row.proposal_id),
    kind: normalizeReferenceMatchProposalKind(row.kind),
    status: normalizeReferenceMatchProposalStatus(row.status),
    sourceCanonicalReferenceId: cleanString(row.source_canonical_reference_id),
    sourceRawReferenceIdsJson:
      cleanString(row.source_raw_reference_ids_json) || "[]",
    targetCanonicalReferenceId:
      cleanString(row.target_canonical_reference_id) || undefined,
    targetLibraryId: Math.max(0, Math.floor(Number(row.target_library_id) || 0)),
    targetItemKey: cleanString(row.target_item_key) || undefined,
    confidence: cleanString(row.confidence) || undefined,
    score: Number(row.score) || 0,
    reasonsJson: cleanString(row.reasons_json) || "[]",
    evidenceJson: cleanString(row.evidence_json) || "{}",
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    basisHash: cleanString(row.basis_hash) || undefined,
    sourceHash: cleanString(row.source_hash) || undefined,
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToCitationNode(row: SqlRow): SynthesisCitationNodeRecord {
  return {
    literatureItemId: cleanString(row.literature_item_id),
    nodeStatus: cleanString(row.node_status) || "active",
    hasZoteroBinding: Boolean(Number(row.has_zotero_binding) || 0),
    title: cleanString(row.title) || undefined,
    year: cleanString(row.year) || undefined,
    summaryJson: cleanString(row.summary_json) || "{}",
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToCitationEdge(row: SqlRow): SynthesisCitationEdgeRecord {
  return {
    edgeId: cleanString(row.edge_id),
    sourceLiteratureItemId: cleanString(row.source_literature_item_id),
    targetLiteratureItemId:
      cleanString(row.target_literature_item_id) || undefined,
    referenceInstanceId: cleanString(row.reference_instance_id) || undefined,
    resolutionId: cleanString(row.resolution_id) || undefined,
    edgeStatus: cleanString(row.edge_status) || "unbound",
    rolesJson: cleanString(row.roles_json) || "[]",
    weight: Number(row.weight) || 0,
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToCitationSourceOwnership(
  row: SqlRow,
): SynthesisCitationSourceOwnershipRecord {
  return {
    sourceLiteratureItemId: cleanString(row.source_literature_item_id),
    edgeId: cleanString(row.edge_id),
    referenceInstanceId: cleanString(row.reference_instance_id) || undefined,
    targetLiteratureItemId:
      cleanString(row.target_literature_item_id) || undefined,
    edgeStatus: cleanString(row.edge_status) || "unbound",
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToCitationIncomingGroup(
  row: SqlRow,
): SynthesisCitationIncomingGroupRecord {
  return {
    targetLiteratureItemId: cleanString(row.target_literature_item_id),
    sourceLiteratureItemId: cleanString(row.source_literature_item_id),
    edgeId: cleanString(row.edge_id),
    referenceInstanceId: cleanString(row.reference_instance_id) || undefined,
    edgeStatus: cleanString(row.edge_status) || "unbound",
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToCitationLightMetrics(
  row: SqlRow,
): SynthesisCitationLightMetricsRecord {
  return {
    literatureItemId: cleanString(row.literature_item_id),
    outgoingCount: Math.max(0, Math.floor(Number(row.outgoing_count) || 0)),
    incomingCount: Math.max(0, Math.floor(Number(row.incoming_count) || 0)),
    matchedOutgoingCount: Math.max(
      0,
      Math.floor(Number(row.matched_outgoing_count) || 0),
    ),
    unresolvedOutgoingCount: Math.max(
      0,
      Math.floor(Number(row.unresolved_outgoing_count) || 0),
    ),
    ambiguousOutgoingCount: Math.max(
      0,
      Math.floor(Number(row.ambiguous_outgoing_count) || 0),
    ),
    localDegree: Math.max(0, Math.floor(Number(row.local_degree) || 0)),
    sourceStructureVersion: Math.max(
      0,
      Math.floor(Number(row.source_structure_version) || 0),
    ),
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToCitationComplexMetrics(
  row: SqlRow,
): SynthesisCitationComplexMetricsRecord {
  return {
    literatureItemId: cleanString(row.literature_item_id),
    nodeId: cleanString(row.node_id),
    paperRef: cleanString(row.paper_ref) || undefined,
    itemKey: cleanString(row.item_key) || undefined,
    title: cleanString(row.title) || undefined,
    year: cleanString(row.year) || undefined,
    internalInDegree: Math.max(
      0,
      Math.floor(Number(row.internal_in_degree) || 0),
    ),
    internalOutDegree: Math.max(
      0,
      Math.floor(Number(row.internal_out_degree) || 0),
    ),
    externalReferenceCount: Math.max(
      0,
      Math.floor(Number(row.external_reference_count) || 0),
    ),
    unresolvedReferenceCount: Math.max(
      0,
      Math.floor(Number(row.unresolved_reference_count) || 0),
    ),
    internalPagerank: Number(row.internal_pagerank) || 0,
    componentId: cleanString(row.component_id),
    componentSize: Math.max(0, Math.floor(Number(row.component_size) || 0)),
    isIsolated: Boolean(Number(row.is_isolated) || 0),
    ageNorm: Number(row.age_norm) || 0,
    recencyNorm: Number(row.recency_norm) || 0,
    inDegreeNorm: Number(row.in_degree_norm) || 0,
    outDegreeNorm: Number(row.out_degree_norm) || 0,
    pagerankNorm: Number(row.pagerank_norm) || 0,
    foundationScore: Number(row.foundation_score) || 0,
    frontierScore: Number(row.frontier_score) || 0,
    synthesisRoleHintsJson: cleanString(row.synthesis_role_hints_json) || "[]",
    sourceStructureVersion: Math.max(
      0,
      Math.floor(Number(row.source_structure_version) || 0),
    ),
    sourceGraphHash: cleanString(row.source_graph_hash),
    metricsHash: cleanString(row.metrics_hash),
    status: cleanString(row.status) || "ready",
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function normalizeCitationLayoutStatus(
  value: unknown,
): SynthesisCitationLayoutStatus {
  const status = cleanString(value);
  if (
    status === "ready" ||
    status === "dirty" ||
    status === "running" ||
    status === "failed"
  ) {
    return status;
  }
  return "missing";
}

function rowToCitationLayoutState(row: SqlRow): SynthesisCitationLayoutRecord {
  return {
    layoutKey: cleanString(row.layout_key),
    viewKey: cleanString(row.view_key) || "workbench_overview",
    preset: cleanString(row.preset) || "force",
    graphHash: cleanString(row.graph_hash),
    status: normalizeCitationLayoutStatus(row.status),
    layoutJson: cleanString(row.layout_json) || "{}",
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function normalizeRelatedItemsSyncStatus(
  value: unknown,
): SynthesisRelatedItemsSyncStatus {
  const status = cleanString(value);
  if (
    status === "applied" ||
    status === "already_existed" ||
    status === "revoked" ||
    status === "already_absent" ||
    status === "failed" ||
    status === "needs_attention"
  ) {
    return status;
  }
  return "pending_external_write";
}

function normalizeRelatedItemsEchoState(
  value: unknown,
): SynthesisRelatedItemsEchoState {
  const state = cleanString(value);
  if (
    state === "awaiting_echo" ||
    state === "observed" ||
    state === "expired"
  ) {
    return state;
  }
  return "none";
}

function rowToRelatedItemsSyncEffect(
  row: SqlRow,
): SynthesisRelatedItemsSyncEffectRecord {
  const action = cleanString(row.action) === "revoke" ? "revoke" : "add";
  return {
    effectId: cleanString(row.effect_id),
    operationId: cleanString(row.operation_id),
    citationEdgeId: cleanString(row.citation_edge_id) || undefined,
    sourceLiteratureItemId: cleanString(row.source_literature_item_id),
    targetLiteratureItemId: cleanString(row.target_literature_item_id),
    sourceLibraryId: Math.max(
      0,
      Math.floor(Number(row.source_library_id) || 0),
    ),
    sourceItemKey: cleanString(row.source_item_key),
    targetLibraryId: Math.max(
      0,
      Math.floor(Number(row.target_library_id) || 0),
    ),
    targetItemKey: cleanString(row.target_item_key),
    action,
    status: normalizeRelatedItemsSyncStatus(row.status),
    createdBySynthesis: Boolean(Number(row.created_by_synthesis) || 0),
    graphBasisHash: cleanString(row.graph_basis_hash) || undefined,
    graphHash: cleanString(row.graph_hash) || undefined,
    externalWriteAt: cleanString(row.external_write_at) || undefined,
    echoState: normalizeRelatedItemsEchoState(row.echo_state),
    echoObservedAt: cleanString(row.echo_observed_at) || undefined,
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToLiteratureMatchingMetadata(
  row: SqlRow,
): SynthesisLiteratureMatchingMetadataRecord {
  return {
    literatureItemId: cleanString(row.literature_item_id),
    schemaId: cleanString(row.schema_id) || "literature_matching_metadata.v1",
    keyTermsJson: cleanString(row.key_terms_json) || "[]",
    methodsJson: cleanString(row.methods_json) || "[]",
    problemsJson: cleanString(row.problems_json) || "[]",
    datasetsJson: cleanString(row.datasets_json) || "[]",
    excludeTermsJson: cleanString(row.exclude_terms_json) || "[]",
    sourceArtifactHash: cleanString(row.source_artifact_hash) || undefined,
    metadataHash: cleanString(row.metadata_hash) || undefined,
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToTopicInterestMetadata(
  row: SqlRow,
): SynthesisTopicInterestMetadataRecord {
  return {
    topicId: cleanString(row.topic_id),
    schemaId: cleanString(row.schema_id) || "topic_interest_metadata.v1",
    includeTermsJson: cleanString(row.include_terms_json) || "[]",
    mustHaveTermsJson: cleanString(row.must_have_terms_json) || "[]",
    methodsJson: cleanString(row.methods_json) || "[]",
    excludeTermsJson: cleanString(row.exclude_terms_json) || "[]",
    seedLiteratureItemIdsJson:
      cleanString(row.seed_literature_item_ids_json) || "[]",
    sourceArtifactHash: cleanString(row.source_artifact_hash) || undefined,
    metadataHash: cleanString(row.metadata_hash) || undefined,
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToTopicDiscoveryHint(
  row: SqlRow,
): SynthesisTopicDiscoveryHintRecord {
  return {
    hintId: cleanString(row.hint_id),
    topicId: cleanString(row.topic_id),
    literatureItemId: cleanString(row.literature_item_id),
    score: Number(row.score) || 0,
    method: cleanString(row.method) || "metadata-overlap-v1",
    matchingFieldsJson: cleanString(row.matching_fields_json) || "{}",
    status: normalizeTopicDiscoveryHintStatus(row.status),
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToCacheBasis(row: SqlRow): SynthesisCacheBasisRecord {
  return {
    cacheKey: cleanString(row.cache_key),
    cacheKind: cleanString(row.cache_kind),
    scopeKind: cleanString(row.scope_kind) || undefined,
    scopeRef: cleanString(row.scope_ref) || undefined,
    status: normalizeCacheBasisStatus(row.status),
    basisKind: cleanString(row.basis_kind) || undefined,
    basisValue: cleanString(row.basis_value) || undefined,
    sourceHash: cleanString(row.source_hash) || undefined,
    policyVersion: cleanString(row.policy_version) || undefined,
    activeOperationId: cleanString(row.active_operation_id) || undefined,
    refreshedAt: cleanString(row.refreshed_at) || undefined,
    staleReason: cleanString(row.stale_reason) || undefined,
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToTopicGraphNode(row: SqlRow): SynthesisTopicGraphNodeRecord {
  return {
    topicId: cleanString(row.topic_id),
    title: cleanString(row.title),
    aliasesJson: cleanString(row.aliases_json) || "[]",
    nodeType: cleanString(row.node_type) || "placeholder",
    definitionStatus: cleanString(row.definition_status) || undefined,
    currentArtifactPath: cleanString(row.current_artifact_path) || undefined,
    isRoot: Boolean(Number(row.is_root) || 0),
    level: cleanString(row.level) || undefined,
    paperCount: Math.max(0, Math.floor(Number(row.paper_count) || 0)),
    lastSynthesisAt: cleanString(row.last_synthesis_at) || undefined,
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToTopicGraphEdge(row: SqlRow): SynthesisTopicGraphEdgeRecord {
  return {
    edgeId: cleanString(row.edge_id),
    sourceTopicId: cleanString(row.source_topic_id),
    targetTopicId: cleanString(row.target_topic_id),
    relation: cleanString(row.relation),
    status: cleanString(row.status) || "suggested",
    confidence:
      row.confidence === null || row.confidence === undefined
        ? undefined
        : Number(row.confidence),
    provenanceJson: cleanString(row.provenance_json) || "[]",
    evidenceRefsJson: cleanString(row.evidence_refs_json) || "[]",
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToTopicGraphReviewItem(
  row: SqlRow,
): SynthesisTopicGraphReviewItemRecord {
  return {
    reviewId: cleanString(row.review_id),
    status: cleanString(row.status) || "open",
    sourceTopicId: cleanString(row.source_topic_id),
    targetTopicId: cleanString(row.target_topic_id),
    targetTitle: cleanString(row.target_title) || undefined,
    relation: cleanString(row.relation),
    confidence:
      row.confidence === null || row.confidence === undefined
        ? undefined
        : Number(row.confidence),
    provenanceJson: cleanString(row.provenance_json) || "[]",
    evidenceRefsJson: cleanString(row.evidence_refs_json) || "[]",
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
    resolvedAt: cleanString(row.resolved_at) || undefined,
  };
}

function rowToConcept(row: SqlRow): SynthesisConceptRecord {
  return {
    conceptId: cleanString(row.concept_id),
    label: cleanString(row.label),
    aliasesJson: cleanString(row.aliases_json) || "[]",
    conceptType: cleanString(row.concept_type) || "concept",
    domain: cleanString(row.domain) || "general",
    status: cleanString(row.status) || "active",
    shortDefinition: cleanString(row.short_definition) || undefined,
    definition: cleanString(row.definition) || undefined,
    usageNote: cleanString(row.usage_note) || undefined,
    editorialNote: cleanString(row.editorial_note) || undefined,
    senseIdsJson: cleanString(row.sense_ids_json) || "[]",
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToConceptSense(row: SqlRow): SynthesisConceptSenseRecord {
  return {
    senseId: cleanString(row.sense_id),
    conceptId: cleanString(row.concept_id),
    label: cleanString(row.label),
    aliasesJson: cleanString(row.aliases_json) || "[]",
    domain: cleanString(row.domain) || "general",
    shortDefinition: cleanString(row.short_definition) || undefined,
    definition: cleanString(row.definition) || undefined,
    disambiguation: cleanString(row.disambiguation) || undefined,
    topicRelevance: cleanString(row.topic_relevance) || undefined,
    confidence: cleanString(row.confidence) || "medium",
    sourceTopicIdsJson: cleanString(row.source_topic_ids_json) || "[]",
    evidenceJson: cleanString(row.evidence_json) || "[]",
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToConceptAlias(row: SqlRow): SynthesisConceptAliasRecord {
  return {
    aliasId: cleanString(row.alias_id),
    alias: cleanString(row.alias),
    normalized: cleanString(row.normalized),
    conceptId: cleanString(row.concept_id),
    senseId: cleanString(row.sense_id) || undefined,
    status: cleanString(row.status) || "active",
    confidence: cleanString(row.confidence) || "medium",
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToConceptRelation(row: SqlRow): SynthesisConceptRelationRecord {
  return {
    relationId: cleanString(row.relation_id),
    sourceConceptId: cleanString(row.source_concept_id),
    targetConceptId: cleanString(row.target_concept_id),
    relation: cleanString(row.relation),
    status: cleanString(row.status) || "suggested",
    confidence: cleanString(row.confidence) || "medium",
    provenanceJson: cleanString(row.provenance_json) || "[]",
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToConceptReviewItem(row: SqlRow): SynthesisConceptReviewItemRecord {
  return {
    reviewId: cleanString(row.review_id),
    status: cleanString(row.status) || "open",
    reason: cleanString(row.reason),
    topicId: cleanString(row.topic_id),
    topicPathId: cleanString(row.topic_path_id),
    label: cleanString(row.label),
    confidence: cleanString(row.confidence) || "medium",
    candidateConceptIdsJson:
      cleanString(row.candidate_concept_ids_json) || "[]",
    proposalJson: cleanString(row.proposal_json) || "{}",
    targetConceptId: cleanString(row.target_concept_id) || undefined,
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
    resolvedAt: cleanString(row.resolved_at) || undefined,
  };
}

function rowToTopicConceptLink(row: SqlRow): SynthesisTopicConceptLinkRecord {
  return {
    topicId: cleanString(row.topic_id),
    conceptId: cleanString(row.concept_id),
    senseId: cleanString(row.sense_id),
    label: cleanString(row.label),
    relevance: cleanString(row.relevance) || undefined,
    confidence: cleanString(row.confidence) || "medium",
    source: cleanString(row.source) || "topic_synthesis_concept_cards",
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToTagVocabularyEntry(
  row: SqlRow,
): SynthesisTagVocabularyEntryRecord {
  return {
    tag: cleanString(row.tag),
    facet: cleanString(row.facet),
    note: cleanString(row.note) || undefined,
    source: cleanString(row.source) || undefined,
    deprecated: Boolean(Number(row.deprecated) || 0),
    replacement: cleanString(row.replacement) || undefined,
    aliasesJson: cleanString(row.aliases_json) || "[]",
    abbrevJson: cleanString(row.abbrev_json) || "[]",
    usageCount: Math.max(0, Math.floor(Number(row.usage_count) || 0)),
    lastSyncedAt: cleanString(row.last_synced_at) || undefined,
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToTagAlias(row: SqlRow): SynthesisTagAliasRecord {
  return {
    alias: cleanString(row.alias),
    tag: cleanString(row.tag),
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToTagAbbrev(row: SqlRow): SynthesisTagAbbrevRecord {
  return {
    abbrevKey: cleanString(row.abbrev_key),
    abbrevValue: cleanString(row.abbrev_value),
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToTagProtocol(row: SqlRow): SynthesisTagProtocolRecord {
  return {
    protocolId: cleanString(row.protocol_id),
    version: cleanString(row.version) || undefined,
    tagPattern: cleanString(row.tag_pattern),
    maxTagLength: Math.max(0, Math.floor(Number(row.max_tag_length) || 0)),
    facetsJson: cleanString(row.facets_json) || "[]",
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToTagValidationWarning(
  row: SqlRow,
): SynthesisTagValidationWarningRecord {
  return {
    warningId: cleanString(row.warning_id),
    code: cleanString(row.code),
    severity: cleanString(row.severity) || "warning",
    tag: cleanString(row.tag) || undefined,
    message: cleanString(row.message),
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToReviewItem(row: SqlRow): SynthesisReviewItemRecord {
  return {
    reviewItemId: cleanString(row.review_item_id),
    reviewKind: cleanString(row.review_kind),
    priority: Math.max(0, Math.floor(Number(row.priority) || 0)),
    status: cleanString(row.status) || "open",
    scopeKind: cleanString(row.scope_kind) || undefined,
    scopeRef: cleanString(row.scope_ref) || undefined,
    blockedByReviewItemId:
      cleanString(row.blocked_by_review_item_id) || undefined,
    payloadJson: cleanString(row.payload_json) || "{}",
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToOperation(row: SqlRow): SynthesisOperationRecord {
  return {
    operationId: cleanString(row.operation_id),
    operationType: cleanString(row.operation_type),
    libraryId: Math.max(0, Math.floor(Number(row.library_id) || 0)),
    scopeKind: cleanString(row.scope_kind) || undefined,
    scopeRef: cleanString(row.scope_ref) || undefined,
    status: normalizeOperationStatus(row.status),
    label: cleanString(row.label) || undefined,
    phase: cleanString(row.phase) || undefined,
    phaseLabel: cleanString(row.phase_label) || undefined,
    message: cleanString(row.message) || undefined,
    progressMode: normalizeOperationProgressMode(row.progress_mode),
    processedCount: nonNegativeInt(row.processed_count),
    skippedCount: nonNegativeInt(row.skipped_count),
    failedCount: nonNegativeInt(row.failed_count),
    totalCount: nonNegativeInt(row.total_count),
    basisKind: cleanString(row.basis_kind) || undefined,
    basisValue: cleanString(row.basis_value) || undefined,
    sourceHash: cleanString(row.source_hash) || undefined,
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    createdAt: cleanString(row.created_at) || undefined,
    startedAt: cleanString(row.started_at) || undefined,
    completedAt: cleanString(row.completed_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function parsedStringArray(value: unknown) {
  return parseJsonArray(value).map(cleanString).filter(Boolean);
}

function normalizedDiscoveryTerm(value: unknown) {
  return cleanString(value).toLowerCase();
}

function uniqueDiscoveryTerms(values: unknown[]) {
  const terms: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const text = normalizedDiscoveryTerm(value);
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    terms.push(text);
  }
  return terms;
}

function discoveryTextContains(text: string, term: string) {
  const normalizedText = normalizedDiscoveryTerm(text);
  const normalizedTerm = normalizedDiscoveryTerm(term);
  return Boolean(
    normalizedText &&
    normalizedTerm &&
    (normalizedText === normalizedTerm ||
      normalizedText.includes(normalizedTerm)),
  );
}

function discoveryFieldsForLiterature(args: {
  metadata: SynthesisLiteratureMatchingMetadataRecord;
  item?: { displayTitle?: string; normalizedTitle?: string } | null;
  tags?: string[];
}) {
  return {
    title: [
      cleanString(args.item?.displayTitle),
      cleanString(args.item?.normalizedTitle),
    ].filter(Boolean),
    key_terms: parsedStringArray(args.metadata.keyTermsJson),
    methods: parsedStringArray(args.metadata.methodsJson),
    problems: parsedStringArray(args.metadata.problemsJson),
    datasets: parsedStringArray(args.metadata.datasetsJson),
    zotero_tags: args.tags || [],
    literature_exclude_terms: parsedStringArray(args.metadata.excludeTermsJson),
  };
}

const DISCOVERY_FIELD_WEIGHTS: Record<string, number> = {
  title: 4,
  key_terms: 3,
  methods: 2,
  problems: 2,
  datasets: 1.5,
  zotero_tags: 1,
};

function scoreDiscoveryPair(args: {
  topic: SynthesisTopicInterestMetadataRecord;
  literature: SynthesisLiteratureMatchingMetadataRecord;
  item?: { displayTitle?: string; normalizedTitle?: string } | null;
  tags?: string[];
  method: string;
  timestamp: string;
  minScore: number;
}): SynthesisTopicDiscoveryHintRecord | null {
  const seedIds = new Set(
    parsedStringArray(args.topic.seedLiteratureItemIdsJson).map(
      normalizedDiscoveryTerm,
    ),
  );
  if (seedIds.has(normalizedDiscoveryTerm(args.literature.literatureItemId))) {
    return null;
  }
  const fields = discoveryFieldsForLiterature({
    metadata: args.literature,
    item: args.item,
    tags: args.tags,
  });
  const queryTerms = uniqueDiscoveryTerms([
    ...parsedStringArray(args.topic.includeTermsJson),
    ...parsedStringArray(args.topic.mustHaveTermsJson),
    ...parsedStringArray(args.topic.methodsJson),
  ]);
  const mustHaveTerms = uniqueDiscoveryTerms(
    parsedStringArray(args.topic.mustHaveTermsJson),
  );
  const topicExcludeTerms = uniqueDiscoveryTerms(
    parsedStringArray(args.topic.excludeTermsJson),
  );
  const matchedTerms = new Set<string>();
  const fieldMatches: Record<string, string[]> = {};
  let score = 0;
  for (const term of queryTerms) {
    for (const [field, values] of Object.entries(fields)) {
      const weight = DISCOVERY_FIELD_WEIGHTS[field] || 0;
      if (
        !weight ||
        !values.some((value) => discoveryTextContains(value, term))
      ) {
        continue;
      }
      matchedTerms.add(term);
      fieldMatches[field] = fieldMatches[field] || [];
      if (!fieldMatches[field].includes(term)) {
        fieldMatches[field].push(term);
      }
      score += weight;
    }
  }
  const comparableLiteratureText = Object.entries(fields)
    .filter(([field]) => field !== "literature_exclude_terms")
    .flatMap(([, values]) => values)
    .map(normalizedDiscoveryTerm);
  const literatureExcludeTerms = uniqueDiscoveryTerms(
    fields.literature_exclude_terms || [],
  );
  const missingMustHaveTerms = mustHaveTerms.filter(
    (term) => !matchedTerms.has(term),
  );
  const excludeHits = topicExcludeTerms.filter((term) =>
    comparableLiteratureText.some((value) =>
      discoveryTextContains(value, term),
    ),
  );
  const literatureExcludeHits = queryTerms.filter((term) =>
    literatureExcludeTerms.some(
      (excludeTerm) =>
        discoveryTextContains(excludeTerm, term) ||
        discoveryTextContains(term, excludeTerm),
    ),
  );
  if (
    missingMustHaveTerms.length ||
    excludeHits.length ||
    literatureExcludeHits.length
  ) {
    return null;
  }
  if (score < args.minScore) {
    return null;
  }
  const matchingFields = {
    matched_terms: Array.from(matchedTerms).sort(),
    missing_must_have_terms: missingMustHaveTerms.sort(),
    exclude_hits: excludeHits.sort(),
    literature_exclude_hits: literatureExcludeHits.sort(),
    field_matches: Object.fromEntries(
      Object.entries(fieldMatches).map(([field, terms]) => [
        field,
        terms.sort(),
      ]),
    ),
  };
  return {
    hintId: `topic-discovery:${stableShortKey({
      topicId: args.topic.topicId,
      literatureItemId: args.literature.literatureItemId,
      method: args.method,
    })}`,
    topicId: args.topic.topicId,
    literatureItemId: args.literature.literatureItemId,
    score: Math.round(score * 1000) / 1000,
    method: args.method,
    matchingFieldsJson: JSON.stringify(matchingFields),
    status: "open",
    createdAt: args.timestamp,
    updatedAt: args.timestamp,
  };
}

export function getSynthesisRepositoryDatabasePath(runtimeRoot?: string) {
  return getRuntimePersistencePaths(runtimeRoot).stateDbPath;
}

export class SynthesisRepository {
  private initialized = false;
  private readonly db: SqlAdapter;
  private readonly now: () => string;

  constructor(options: SynthesisRepositoryOptions = {}) {
    this.db = options.adapter || resolveAdapter(options.runtimeRoot);
    this.now = options.now || nowIso;
  }

  initialize() {
    if (this.initialized) {
      return;
    }
    ensureSchema(this.db);
    this.initialized = true;
  }

  migrate() {
    this.initialize();
  }

  transaction<T>(fn: () => T) {
    this.initialize();
    return this.db.transaction(fn);
  }

  paginate(
    input: SynthesisRepositoryPaginationInput = {},
  ): SynthesisRepositoryPage {
    const maxLimit = Math.max(1, Math.floor(input.maxLimit || MAX_PAGE_LIMIT));
    const defaultLimit = Math.min(
      maxLimit,
      Math.max(1, Math.floor(input.defaultLimit || DEFAULT_PAGE_LIMIT)),
    );
    const cursor = normalizeCursor(input.cursor);
    const limit = normalizeLimit(input.limit, defaultLimit, maxLimit);
    return {
      cursor,
      limit,
      nextCursor: cursor + limit,
    };
  }

  inspectSchema() {
    this.initialize();
    return this.db
      .all(
        `
          SELECT name, type
          FROM sqlite_master
          WHERE name LIKE 'synt_%'
          ORDER BY name
        `,
      )
      .map(
        (row): SynthesisRepositorySchemaEntry => ({
          name: cleanString(row.name),
          type: cleanString(row.type) === "index" ? "index" : "table",
        }),
      )
      .filter((entry) => entry.name);
  }

  resetSynthesisState() {
    this.initialize();
    return this.db.transaction(() => {
      const deletedRowsByTable: Record<SynthesisRepositoryTableName, number> =
        {} as Record<SynthesisRepositoryTableName, number>;
      for (const tableName of SYNTHESIS_RESET_TABLES) {
        deletedRowsByTable[tableName] = this.countRows(tableName);
        this.db.run(`DELETE FROM ${tableName}`);
      }
      return {
        deletedRowsByTable,
        resetAt: this.now(),
      };
    });
  }

  getCacheBasis(cacheKeyRaw: string) {
    this.initialize();
    const cacheKey = cleanString(cacheKeyRaw);
    if (!cacheKey) {
      return null;
    }
    const row = this.db.get(
      `
        SELECT *
        FROM synt_cache_basis
        WHERE cache_key=@cache_key
        LIMIT 1
      `,
      { cache_key: cacheKey },
    );
    return row ? rowToCacheBasis(row) : null;
  }

  upsertCacheBasis(record: SynthesisCacheBasisRecord) {
    this.initialize();
    const cacheKey = cleanString(record.cacheKey);
    if (!cacheKey) {
      throw new Error("cacheKey must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_cache_basis (
          cache_key,
          cache_kind,
          scope_kind,
          scope_ref,
          status,
          basis_kind,
          basis_value,
          source_hash,
          policy_version,
          active_operation_id,
          refreshed_at,
          stale_reason,
          diagnostics_json,
          updated_at
        )
        VALUES (
          @cache_key,
          @cache_kind,
          @scope_kind,
          @scope_ref,
          @status,
          @basis_kind,
          @basis_value,
          @source_hash,
          @policy_version,
          @active_operation_id,
          @refreshed_at,
          @stale_reason,
          @diagnostics_json,
          @updated_at
        )
      `,
      {
        cache_key: cacheKey,
        cache_kind: cleanString(record.cacheKind),
        scope_kind: cleanString(record.scopeKind),
        scope_ref: cleanString(record.scopeRef),
        status: normalizeCacheBasisStatus(record.status),
        basis_kind: cleanString(record.basisKind),
        basis_value: cleanString(record.basisValue),
        source_hash: cleanString(record.sourceHash),
        policy_version: cleanString(record.policyVersion),
        active_operation_id: cleanString(record.activeOperationId),
        refreshed_at: cleanString(record.refreshedAt),
        stale_reason: cleanString(record.staleReason),
        diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  listCacheBasis(args: { cacheKinds?: string[]; statuses?: string[] } = {}) {
    this.initialize();
    const cacheKinds = new Set(
      (args.cacheKinds || []).map(cleanString).filter(Boolean),
    );
    const statuses = new Set(
      (args.statuses || []).map(cleanString).filter(Boolean),
    );
    const clauses: string[] = [];
    const params: SqlParams = {};
    appendInFilter(clauses, params, "cache_kind", "cache_kind", cacheKinds);
    appendInFilter(clauses, params, "status", "status", statuses);
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .all(
        `
          SELECT *
          FROM synt_cache_basis
          ${where}
          ORDER BY updated_at DESC, cache_key ASC
        `,
        params,
      )
      .map(rowToCacheBasis)
      .filter((row) => !cacheKinds.size || cacheKinds.has(row.cacheKind))
      .filter((row) => !statuses.size || statuses.has(row.status || ""));
  }

  upsertArtifactSidecar(record: SynthesisArtifactSidecarRecord) {
    this.initialize();
    const sourceRef = cleanString(record.sourceRef);
    const artifactType = cleanString(record.artifactType);
    if (!sourceRef || !artifactType) {
      throw new Error("sourceRef and artifactType must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_artifact_sidecar (
          source_ref,
          library_id,
          item_key,
          artifact_type,
          status,
          artifact_hash,
          locator_json,
          diagnostics_json,
          scanned_at,
          updated_at
        )
        VALUES (
          @source_ref,
          @library_id,
          @item_key,
          @artifact_type,
          @status,
          @artifact_hash,
          @locator_json,
          @diagnostics_json,
          @scanned_at,
          @updated_at
        )
      `,
      {
        source_ref: sourceRef,
        library_id: Math.max(0, Math.floor(Number(record.libraryId) || 0)),
        item_key: cleanString(record.itemKey),
        artifact_type: artifactType,
        status: cleanString(record.status) || "missing",
        artifact_hash: cleanString(record.artifactHash),
        locator_json: cleanString(record.locatorJson) || "{}",
        diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
        scanned_at: cleanString(record.scannedAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  listArtifactSidecars(
    args: { sourceRefs?: string[]; artifactTypes?: string[] } = {},
  ) {
    this.initialize();
    const sourceRefs = new Set(
      (args.sourceRefs || []).map(cleanString).filter(Boolean),
    );
    const artifactTypes = new Set(
      (args.artifactTypes || []).map(cleanString).filter(Boolean),
    );
    const clauses: string[] = [];
    const params: SqlParams = {};
    appendInFilter(clauses, params, "source_ref", "source_ref", sourceRefs);
    appendInFilter(
      clauses,
      params,
      "artifact_type",
      "artifact_type",
      artifactTypes,
    );
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .all(
        `
          SELECT *
          FROM synt_artifact_sidecar
          ${where}
          ORDER BY source_ref ASC, artifact_type ASC
        `,
        params,
      )
      .map(rowToArtifactSidecar)
      .filter((row) => !sourceRefs.size || sourceRefs.has(row.sourceRef))
      .filter(
        (row) => !artifactTypes.size || artifactTypes.has(row.artifactType),
      );
  }

  upsertCanonicalReference(record: SynthesisCanonicalReferenceRecord) {
    this.initialize();
    const canonicalReferenceId = cleanString(record.canonicalReferenceId);
    if (!canonicalReferenceId) {
      throw new Error("canonicalReferenceId must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_canonical_reference (
          canonical_reference_id,
          title,
          normalized_title,
          year,
          authors_json,
          identifiers_json,
          metadata_hash,
          status,
          created_at,
          updated_at
        )
        VALUES (
          @canonical_reference_id,
          @title,
          @normalized_title,
          @year,
          @authors_json,
          @identifiers_json,
          @metadata_hash,
          @status,
          @created_at,
          @updated_at
        )
      `,
      {
        canonical_reference_id: canonicalReferenceId,
        title: cleanString(record.title),
        normalized_title: cleanString(record.normalizedTitle),
        year: cleanString(record.year),
        authors_json: cleanString(record.authorsJson) || "[]",
        identifiers_json: cleanString(record.identifiersJson) || "{}",
        metadata_hash: cleanString(record.metadataHash),
        status: cleanString(record.status) || "active",
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  listCanonicalReferences(
    args: { canonicalReferenceIds?: string[]; statuses?: string[] } = {},
  ) {
    this.initialize();
    const canonicalReferenceIds = new Set(
      (args.canonicalReferenceIds || []).map(cleanString).filter(Boolean),
    );
    const statuses = new Set(
      (args.statuses || []).map(cleanString).filter(Boolean),
    );
    const clauses: string[] = [];
    const params: SqlParams = {};
    appendInFilter(
      clauses,
      params,
      "canonical_reference_id",
      "canonical_reference_id",
      canonicalReferenceIds,
    );
    appendInFilter(clauses, params, "status", "status", statuses);
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .all(
        `
          SELECT *
          FROM synt_canonical_reference
          ${where}
          ORDER BY canonical_reference_id ASC
        `,
        params,
      )
      .map(rowToCanonicalReference)
      .filter(
        (row) =>
          !canonicalReferenceIds.size ||
          canonicalReferenceIds.has(row.canonicalReferenceId),
      )
      .filter((row) => !statuses.size || statuses.has(row.status || ""));
  }

  upsertCanonicalReferenceRedirect(
    record: SynthesisCanonicalReferenceRedirectRecord,
  ) {
    this.initialize();
    const from = cleanString(record.fromCanonicalReferenceId);
    const to = cleanString(record.toCanonicalReferenceId);
    if (!from || !to) {
      throw new Error("canonical reference redirect endpoints must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_canonical_reference_redirect (
          from_canonical_reference_id,
          to_canonical_reference_id,
          reason,
          diagnostics_json,
          created_at,
          updated_at
        )
        VALUES (
          @from_canonical_reference_id,
          @to_canonical_reference_id,
          @reason,
          @diagnostics_json,
          @created_at,
          @updated_at
        )
      `,
      {
        from_canonical_reference_id: from,
        to_canonical_reference_id: to,
        reason: cleanString(record.reason),
        diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  listCanonicalReferenceRedirects(
    args: { fromCanonicalReferenceIds?: string[] } = {},
  ) {
    this.initialize();
    const fromCanonicalReferenceIds = new Set(
      (args.fromCanonicalReferenceIds || []).map(cleanString).filter(Boolean),
    );
    const clauses: string[] = [];
    const params: SqlParams = {};
    appendInFilter(
      clauses,
      params,
      "from_canonical_reference_id",
      "from_canonical_reference_id",
      fromCanonicalReferenceIds,
    );
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .all(
        `
          SELECT *
          FROM synt_canonical_reference_redirect
          ${where}
          ORDER BY from_canonical_reference_id ASC
        `,
        params,
      )
      .map(rowToCanonicalReferenceRedirect)
      .filter(
        (row) =>
          !fromCanonicalReferenceIds.size ||
          fromCanonicalReferenceIds.has(row.fromCanonicalReferenceId),
      );
  }

  deleteCanonicalReferenceRedirect(args: {
    fromCanonicalReferenceId: string;
    toCanonicalReferenceId?: string;
  }) {
    this.initialize();
    const from = cleanString(args.fromCanonicalReferenceId);
    const to = cleanString(args.toCanonicalReferenceId);
    if (!from) {
      return 0;
    }
    const params: SqlParams = { from_canonical_reference_id: from };
    const targetClause = to ? " AND to_canonical_reference_id = @to_canonical_reference_id" : "";
    if (to) {
      params.to_canonical_reference_id = to;
    }
    return this.db.run(
      `
        DELETE FROM synt_canonical_reference_redirect
        WHERE from_canonical_reference_id = @from_canonical_reference_id
        ${targetClause}
      `,
      params,
    );
  }

  resolveEffectiveCanonicalReferenceId(canonicalReferenceIdRaw: string) {
    let current = cleanString(canonicalReferenceIdRaw);
    if (!current) {
      return "";
    }
    const redirects = new Map(
      this.listCanonicalReferenceRedirects().map(
        (row) =>
          [
            row.fromCanonicalReferenceId,
            row.toCanonicalReferenceId,
          ] as const,
      ),
    );
    const seen = new Set<string>();
    while (redirects.has(current) && !seen.has(current)) {
      seen.add(current);
      current = redirects.get(current) || current;
    }
    return current;
  }

  resolveEffectiveCanonicalReferenceIds(canonicalReferenceIdsRaw: string[]) {
    const canonicalIds = new Set(
      (canonicalReferenceIdsRaw || []).map(cleanString).filter(Boolean),
    );
    const effective = new Map<string, string>();
    if (!canonicalIds.size) {
      return effective;
    }
    const redirectByFrom = new Map<string, string>();
    let frontier = Array.from(canonicalIds);
    const seenFrontier = new Set<string>();
    while (frontier.length) {
      const pending = frontier.filter((id) => !seenFrontier.has(id));
      frontier = [];
      if (!pending.length) {
        break;
      }
      pending.forEach((id) => seenFrontier.add(id));
      for (const redirect of this.listCanonicalReferenceRedirects({
        fromCanonicalReferenceIds: pending,
      })) {
        redirectByFrom.set(
          redirect.fromCanonicalReferenceId,
          redirect.toCanonicalReferenceId,
        );
        if (!seenFrontier.has(redirect.toCanonicalReferenceId)) {
          frontier.push(redirect.toCanonicalReferenceId);
        }
      }
    }
    for (const canonicalId of canonicalIds) {
      let current = canonicalId;
      const seen = new Set<string>();
      while (redirectByFrom.has(current) && !seen.has(current)) {
        seen.add(current);
        current = redirectByFrom.get(current) || current;
      }
      effective.set(canonicalId, current);
    }
    return effective;
  }

  upsertRawReference(record: SynthesisRawReferenceRecord) {
    this.initialize();
    const rawReferenceId = cleanString(record.rawReferenceId);
    if (!rawReferenceId) {
      throw new Error("rawReferenceId must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_raw_reference (
          raw_reference_id,
          source_ref,
          references_artifact_hash,
          reference_index,
          raw_hash,
          parsed_title,
          normalized_title,
          year,
          authors_json,
          raw_reference,
          canonical_reference_id,
          status,
          diagnostics_json,
          created_at,
          updated_at
        )
        VALUES (
          @raw_reference_id,
          @source_ref,
          @references_artifact_hash,
          @reference_index,
          @raw_hash,
          @parsed_title,
          @normalized_title,
          @year,
          @authors_json,
          @raw_reference,
          @canonical_reference_id,
          @status,
          @diagnostics_json,
          @created_at,
          @updated_at
        )
      `,
      {
        raw_reference_id: rawReferenceId,
        source_ref: cleanString(record.sourceRef),
        references_artifact_hash: cleanString(record.referencesArtifactHash),
        reference_index: Math.max(
          0,
          Math.floor(Number(record.referenceIndex) || 0),
        ),
        raw_hash: cleanString(record.rawHash),
        parsed_title: cleanString(record.parsedTitle),
        normalized_title: cleanString(record.normalizedTitle),
        year: cleanString(record.year),
        authors_json: cleanString(record.authorsJson) || "[]",
        raw_reference: cleanString(record.rawReference),
        canonical_reference_id: cleanString(record.canonicalReferenceId),
        status: cleanString(record.status) || "active",
        diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  listRawReferences(
    args: {
      rawReferenceIds?: string[];
      sourceRefs?: string[];
      statuses?: string[];
      referencesArtifactHashes?: string[];
      limit?: number;
    } = {},
  ) {
    this.initialize();
    const rawReferenceIds = new Set(
      (args.rawReferenceIds || []).map(cleanString).filter(Boolean),
    );
    const sourceRefs = new Set(
      (args.sourceRefs || []).map(cleanString).filter(Boolean),
    );
    const statuses = new Set(
      (args.statuses || []).map(cleanString).filter(Boolean),
    );
    const hashes = new Set(
      (args.referencesArtifactHashes || []).map(cleanString).filter(Boolean),
    );
    const limit = Math.max(0, Math.floor(Number(args.limit) || 0));
    const clauses: string[] = [];
    const params: SqlParams = {};
    appendInFilter(
      clauses,
      params,
      "raw_reference_id",
      "raw_reference_id",
      rawReferenceIds,
    );
    appendInFilter(clauses, params, "source_ref", "source_ref", sourceRefs);
    appendInFilter(clauses, params, "status", "status", statuses);
    appendInFilter(
      clauses,
      params,
      "references_artifact_hash",
      "references_artifact_hash",
      hashes,
    );
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const limitSql = appendLimitClause(params, limit);
    return this.db
      .all(
        `
          SELECT *
          FROM synt_raw_reference
          ${where}
          ORDER BY source_ref ASC, reference_index ASC, raw_reference_id ASC
          ${limitSql}
        `,
        params,
      )
      .map(rowToRawReference)
      .filter(
        (row) =>
          !rawReferenceIds.size || rawReferenceIds.has(row.rawReferenceId),
      )
      .filter((row) => !sourceRefs.size || sourceRefs.has(row.sourceRef))
      .filter((row) => !statuses.size || statuses.has(row.status || ""))
      .filter(
        (row) =>
          !hashes.size || hashes.has(cleanString(row.referencesArtifactHash)),
      )
      .slice(0, limit || Number.POSITIVE_INFINITY);
  }

  markRawReferencesStaleForSource(args: {
    sourceRef: string;
    exceptReferencesArtifactHash?: string;
    timestamp?: string;
  }) {
    this.initialize();
    const sourceRef = cleanString(args.sourceRef);
    if (!sourceRef) {
      return 0;
    }
    const timestamp = cleanString(args.timestamp) || this.now();
    const rows = this.listRawReferences({
      sourceRefs: [sourceRef],
      statuses: ["active"],
    }).filter(
      (row) =>
        !args.exceptReferencesArtifactHash ||
        row.referencesArtifactHash !== args.exceptReferencesArtifactHash,
    );
    for (const row of rows) {
      this.upsertRawReference({
        ...row,
        status: "stale",
        updatedAt: timestamp,
      });
    }
    return rows.length;
  }

  upsertReferenceBinding(record: SynthesisReferenceBindingRecord) {
    this.initialize();
    const bindingId = cleanString(record.bindingId);
    if (!bindingId) {
      throw new Error("bindingId must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_reference_binding (
          binding_id,
          canonical_reference_id,
          library_id,
          item_key,
          status,
          confidence,
          reviewer,
          basis_hash,
          diagnostics_json,
          created_at,
          updated_at
        )
        VALUES (
          @binding_id,
          @canonical_reference_id,
          @library_id,
          @item_key,
          @status,
          @confidence,
          @reviewer,
          @basis_hash,
          @diagnostics_json,
          @created_at,
          @updated_at
        )
      `,
      {
        binding_id: bindingId,
        canonical_reference_id: cleanString(record.canonicalReferenceId),
        library_id: Math.max(0, Math.floor(Number(record.libraryId) || 0)),
        item_key: cleanString(record.itemKey),
        status: normalizeReferenceBindingState(record.status),
        confidence: cleanString(record.confidence),
        reviewer: cleanString(record.reviewer),
        basis_hash: cleanString(record.basisHash),
        diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  listReferenceBindings(
    args: { canonicalReferenceIds?: string[]; statuses?: string[] } = {},
  ) {
    this.initialize();
    const canonicalIds = new Set(
      (args.canonicalReferenceIds || []).map(cleanString).filter(Boolean),
    );
    const statuses = new Set(
      (args.statuses || [])
        .map(cleanString)
        .filter(Boolean)
        .flatMap(expandReferenceBindingStatusFilter),
    );
    const normalizedStatuses = new Set(
      (args.statuses || [])
        .map((status) => normalizeReferenceBindingState(status))
        .filter(Boolean),
    );
    const clauses: string[] = [];
    const params: SqlParams = {};
    appendInFilter(
      clauses,
      params,
      "canonical_reference_id",
      "canonical_reference_id",
      canonicalIds,
    );
    appendInFilter(clauses, params, "status", "status", statuses);
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .all(
        `
          SELECT *
          FROM synt_reference_binding
          ${where}
          ORDER BY canonical_reference_id ASC, binding_id ASC
        `,
        params,
      )
      .map(rowToReferenceBinding)
      .filter(
        (row) =>
          !canonicalIds.size || canonicalIds.has(row.canonicalReferenceId),
      )
      .filter((row) => !normalizedStatuses.size || normalizedStatuses.has(row.status));
  }

  deleteReferenceBinding(args: { bindingId: string; basisHash?: string }) {
    this.initialize();
    const bindingId = cleanString(args.bindingId);
    const basisHash = cleanString(args.basisHash);
    if (!bindingId) {
      return 0;
    }
    const params: SqlParams = { binding_id: bindingId };
    const basisClause = basisHash ? " AND basis_hash = @basis_hash" : "";
    if (basisHash) {
      params.basis_hash = basisHash;
    }
    return this.db.run(
      `
        DELETE FROM synt_reference_binding
        WHERE binding_id = @binding_id
        ${basisClause}
      `,
      params,
    );
  }

  upsertReferenceMatchProposal(
    record: SynthesisReferenceMatchProposalRecord,
  ) {
    this.initialize();
    const proposalId = cleanString(record.proposalId);
    if (!proposalId) {
      throw new Error("proposalId must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_reference_match_proposal (
          proposal_id,
          kind,
          status,
          source_canonical_reference_id,
          source_raw_reference_ids_json,
          target_canonical_reference_id,
          target_library_id,
          target_item_key,
          confidence,
          score,
          reasons_json,
          evidence_json,
          diagnostics_json,
          basis_hash,
          source_hash,
          created_at,
          updated_at
        )
        VALUES (
          @proposal_id,
          @kind,
          @status,
          @source_canonical_reference_id,
          @source_raw_reference_ids_json,
          @target_canonical_reference_id,
          @target_library_id,
          @target_item_key,
          @confidence,
          @score,
          @reasons_json,
          @evidence_json,
          @diagnostics_json,
          @basis_hash,
          @source_hash,
          @created_at,
          @updated_at
        )
      `,
      {
        proposal_id: proposalId,
        kind: normalizeReferenceMatchProposalKind(record.kind),
        status: normalizeReferenceMatchProposalStatus(record.status),
        source_canonical_reference_id: cleanString(
          record.sourceCanonicalReferenceId,
        ),
        source_raw_reference_ids_json:
          cleanString(record.sourceRawReferenceIdsJson) || "[]",
        target_canonical_reference_id: cleanString(
          record.targetCanonicalReferenceId,
        ),
        target_library_id: Math.max(
          0,
          Math.floor(Number(record.targetLibraryId) || 0),
        ),
        target_item_key: cleanString(record.targetItemKey),
        confidence: cleanString(record.confidence),
        score: Number(record.score) || 0,
        reasons_json: cleanString(record.reasonsJson) || "[]",
        evidence_json: cleanString(record.evidenceJson) || "{}",
        diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
        basis_hash: cleanString(record.basisHash),
        source_hash: cleanString(record.sourceHash),
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  listReferenceMatchProposals(
    args: {
      proposalIds?: string[];
      statuses?: string[];
      kinds?: string[];
      confidences?: string[];
      sourceCanonicalReferenceIds?: string[];
      limit?: number;
    } = {},
  ) {
    this.initialize();
    const proposalIds = new Set(
      (args.proposalIds || []).map(cleanString).filter(Boolean),
    );
    const statuses = new Set(
      (args.statuses || [])
        .map(normalizeReferenceMatchProposalStatus)
        .filter(Boolean),
    );
    const kinds = new Set(
      (args.kinds || [])
        .map(normalizeReferenceMatchProposalKind)
        .filter(Boolean),
    );
    const confidences = new Set(
      (args.confidences || []).map(cleanString).filter(Boolean),
    );
    const sourceCanonicalIds = new Set(
      (args.sourceCanonicalReferenceIds || []).map(cleanString).filter(Boolean),
    );
    const limit = Math.max(0, Math.floor(Number(args.limit) || 0));
    const clauses: string[] = [];
    const params: SqlParams = {};
    appendInFilter(clauses, params, "proposal_id", "proposal_id", proposalIds);
    appendInFilter(clauses, params, "status", "status", statuses);
    appendInFilter(clauses, params, "kind", "kind", kinds);
    appendInFilter(clauses, params, "confidence", "confidence", confidences);
    appendInFilter(
      clauses,
      params,
      "source_canonical_reference_id",
      "source_canonical_reference_id",
      sourceCanonicalIds,
    );
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const limitSql = appendLimitClause(params, limit);
    return this.db
      .all(
        `
          SELECT *
          FROM synt_reference_match_proposal
          ${where}
          ORDER BY updated_at DESC, proposal_id ASC
          ${limitSql}
        `,
        params,
      )
      .map(rowToReferenceMatchProposal)
      .filter((row) => !proposalIds.size || proposalIds.has(row.proposalId))
      .filter((row) => !statuses.size || statuses.has(row.status))
      .filter((row) => !kinds.size || kinds.has(row.kind))
      .filter((row) => !confidences.size || confidences.has(cleanString(row.confidence)))
      .filter(
        (row) =>
          !sourceCanonicalIds.size ||
          sourceCanonicalIds.has(row.sourceCanonicalReferenceId),
      )
      .slice(0, limit || Number.POSITIVE_INFINITY);
  }

  updateReferenceMatchProposalStatus(args: {
    proposalId: string;
    status: SynthesisReferenceMatchProposalStatus;
    timestamp?: string;
  }) {
    const proposal = this.listReferenceMatchProposals({
      proposalIds: [args.proposalId],
      limit: 1,
    })[0];
    if (!proposal) {
      return null;
    }
    const updated = {
      ...proposal,
      status: normalizeReferenceMatchProposalStatus(args.status),
      updatedAt: cleanString(args.timestamp) || this.now(),
    };
    this.upsertReferenceMatchProposal(updated);
    return updated;
  }

  hasRejectedReferenceMatchProposal(args: {
    kind: string;
    basisHash: string;
    sourceHash: string;
  }) {
    const kind = normalizeReferenceMatchProposalKind(args.kind);
    const basisHash = cleanString(args.basisHash);
    const sourceHash = cleanString(args.sourceHash);
    return this.listReferenceMatchProposals({
      statuses: ["rejected"],
      kinds: [kind],
    }).some(
      (proposal) =>
        proposal.kind === kind &&
        cleanString(proposal.basisHash) === basisHash &&
        cleanString(proposal.sourceHash) === sourceHash,
    );
  }

  private replaceCitationGraphStateRows(
    state: SynthesisCitationGraphStateReplacement,
  ) {
    for (const table of [
      "synt_citation_metrics_light",
      "synt_citation_metrics_complex",
      "synt_citation_incoming_group",
      "synt_citation_source_ownership",
      "synt_citation_edge",
      "synt_citation_node",
    ]) {
      this.db.run(`DELETE FROM ${table}`);
    }
    for (const record of state.nodes) {
      this.upsertCitationNode(record);
    }
    for (const record of state.edges || []) {
      this.upsertCitationEdge(record);
    }
    for (const record of state.sourceOwnership || []) {
      this.upsertCitationSourceOwnership(record);
    }
    for (const record of state.incomingGroups || []) {
      this.upsertCitationIncomingGroup(record);
    }
    for (const record of state.lightweightMetrics || []) {
      this.upsertCitationLightMetrics(record);
    }
    for (const record of state.complexMetrics || []) {
      this.upsertCitationComplexMetrics(record);
    }
  }

  replaceCitationGraphState(state: SynthesisCitationGraphStateReplacement) {
    this.transaction(() => {
      this.replaceCitationGraphStateRows(state);
    });
  }

  private recomputeCitationLightMetricsRows(
    literatureItemIds: Iterable<unknown>,
    timestamp: string,
  ) {
    const ids = Array.from(
      new Set(Array.from(literatureItemIds).map(cleanString).filter(Boolean)),
    );
    for (const literatureItemId of ids) {
      const node = this.listCitationNodes({
        literatureItemIds: [literatureItemId],
        limit: 1,
      })[0];
      this.db.run(
        "DELETE FROM synt_citation_metrics_light WHERE literature_item_id=@literature_item_id",
        { literature_item_id: literatureItemId },
      );
      if (!node) {
        continue;
      }
      const outgoingEdges = this.listCitationEdges({
        sourceLiteratureItemIds: [literatureItemId],
      });
      const incomingEdges = this.listCitationEdges({
        targetLiteratureItemIds: [literatureItemId],
      });
      const matchedOutgoingCount = outgoingEdges.filter(
        (edge) => edge.edgeStatus === "accepted",
      ).length;
      const unresolvedOutgoingCount = outgoingEdges.filter(
        (edge) => edge.edgeStatus !== "accepted",
      ).length;
      this.upsertCitationLightMetrics({
        literatureItemId,
        outgoingCount: outgoingEdges.length,
        incomingCount: incomingEdges.length,
        matchedOutgoingCount,
        unresolvedOutgoingCount,
        ambiguousOutgoingCount: 0,
        localDegree: outgoingEdges.length + incomingEdges.length,
        sourceStructureVersion: Date.parse(timestamp) || 0,
        updatedAt: timestamp,
      });
    }
  }

  private cleanupCitationOrphanExternalNodes(
    candidateLiteratureItemIds: Iterable<unknown>,
    protectedLiteratureItemIds: Iterable<unknown>,
  ) {
    const protectedIds = new Set(
      Array.from(protectedLiteratureItemIds).map(cleanString).filter(Boolean),
    );
    const candidateIds = Array.from(
      new Set(
        Array.from(candidateLiteratureItemIds).map(cleanString).filter(Boolean),
      ),
    );
    for (const literatureItemId of candidateIds) {
      if (protectedIds.has(literatureItemId)) {
        continue;
      }
      const node = this.listCitationNodes({
        literatureItemIds: [literatureItemId],
        limit: 1,
      })[0];
      if (!node || node.hasZoteroBinding) {
        continue;
      }
      const hasOutgoing = this.listCitationEdges({
        sourceLiteratureItemIds: [literatureItemId],
        limit: 1,
      }).length > 0;
      const hasIncoming = this.listCitationEdges({
        targetLiteratureItemIds: [literatureItemId],
        limit: 1,
      }).length > 0;
      if (hasOutgoing || hasIncoming) {
        continue;
      }
      this.db.run(
        "DELETE FROM synt_citation_node WHERE literature_item_id=@literature_item_id",
        { literature_item_id: literatureItemId },
      );
      this.db.run(
        "DELETE FROM synt_citation_metrics_light WHERE literature_item_id=@literature_item_id",
        { literature_item_id: literatureItemId },
      );
      this.db.run(
        "DELETE FROM synt_citation_metrics_complex WHERE literature_item_id=@literature_item_id",
        { literature_item_id: literatureItemId },
      );
    }
  }

  replaceCitationGraphSourceSlice(
    state: SynthesisCitationGraphSourceSliceReplacement,
  ) {
    const sourceIds = Array.from(
      new Set(
        (state.sourceLiteratureItemIds || []).map(cleanString).filter(Boolean),
      ),
    );
    if (!sourceIds.length) {
      return;
    }
    const timestamp = cleanString(state.updatedAt) || this.now();
    const oldEdges = this.listCitationEdges({
      sourceLiteratureItemIds: sourceIds,
    });
    const affectedNodeIds = new Set<string>(sourceIds);
    const oldTargetIds: string[] = [];
    for (const edge of oldEdges) {
      affectedNodeIds.add(edge.sourceLiteratureItemId);
      if (edge.targetLiteratureItemId) {
        affectedNodeIds.add(edge.targetLiteratureItemId);
        oldTargetIds.push(edge.targetLiteratureItemId);
      }
    }
    for (const node of state.nodes || []) {
      affectedNodeIds.add(node.literatureItemId);
    }
    for (const edge of state.edges || []) {
      affectedNodeIds.add(edge.sourceLiteratureItemId);
      if (edge.targetLiteratureItemId) {
        affectedNodeIds.add(edge.targetLiteratureItemId);
      }
    }
    this.transaction(() => {
      for (const sourceId of sourceIds) {
        this.db.run(
          "DELETE FROM synt_citation_incoming_group WHERE source_literature_item_id=@source_literature_item_id",
          { source_literature_item_id: sourceId },
        );
        this.db.run(
          "DELETE FROM synt_citation_source_ownership WHERE source_literature_item_id=@source_literature_item_id",
          { source_literature_item_id: sourceId },
        );
        this.db.run(
          "DELETE FROM synt_citation_edge WHERE source_literature_item_id=@source_literature_item_id",
          { source_literature_item_id: sourceId },
        );
      }
      for (const record of state.nodes || []) {
        this.upsertCitationNode(record);
      }
      for (const record of state.edges || []) {
        this.upsertCitationEdge(record);
      }
      for (const record of state.sourceOwnership || []) {
        this.upsertCitationSourceOwnership(record);
      }
      for (const record of state.incomingGroups || []) {
        this.upsertCitationIncomingGroup(record);
      }
      this.cleanupCitationOrphanExternalNodes(oldTargetIds, sourceIds);
      this.recomputeCitationLightMetricsRows(affectedNodeIds, timestamp);
    });
  }

  replaceCitationComplexMetrics(
    records: SynthesisCitationComplexMetricsRecord[],
  ) {
    this.initialize();
    this.transaction(() => {
      this.db.run("DELETE FROM synt_citation_metrics_complex");
      for (const record of records) {
        this.upsertCitationComplexMetrics(record);
      }
    });
  }

  replaceDiscoveryMetadataState(
    state: SynthesisDiscoveryMetadataStateReplacement,
  ) {
    this.initialize();
    this.transaction(() => {
      this.db.run("DELETE FROM synt_literature_matching_metadata");
      this.db.run("DELETE FROM synt_topic_interest_metadata");
      this.db.run("DELETE FROM synt_topic_discovery_hint");
      for (const record of state.literatureMatchingMetadata || []) {
        this.upsertLiteratureMatchingMetadata(record);
      }
      for (const record of state.topicInterestMetadata || []) {
        this.upsertTopicInterestMetadata(record);
      }
      for (const record of state.topicDiscoveryHints || []) {
        this.upsertTopicDiscoveryHint(record);
      }
    });
  }

  upsertCitationNode(record: SynthesisCitationNodeRecord) {
    this.initialize();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_citation_node (
          literature_item_id,
          node_status,
          has_zotero_binding,
          title,
          year,
          summary_json,
          updated_at
        )
        VALUES (
          @literature_item_id,
          @node_status,
          @has_zotero_binding,
          @title,
          @year,
          @summary_json,
          @updated_at
        )
      `,
      {
        literature_item_id: cleanString(record.literatureItemId),
        node_status: cleanString(record.nodeStatus) || "active",
        has_zotero_binding: record.hasZoteroBinding ? 1 : 0,
        title: cleanString(record.title),
        year: cleanString(record.year),
        summary_json: cleanString(record.summaryJson) || "{}",
        updated_at: cleanString(record.updatedAt) || this.now(),
      },
    );
  }

  upsertCitationEdge(record: SynthesisCitationEdgeRecord) {
    this.initialize();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_citation_edge (
          edge_id,
          source_literature_item_id,
          target_literature_item_id,
          reference_instance_id,
          resolution_id,
          edge_status,
          roles_json,
          weight,
          created_at,
          updated_at
        )
        VALUES (
          @edge_id,
          @source_literature_item_id,
          @target_literature_item_id,
          @reference_instance_id,
          @resolution_id,
          @edge_status,
          @roles_json,
          @weight,
          @created_at,
          @updated_at
        )
      `,
      {
        edge_id: cleanString(record.edgeId),
        source_literature_item_id: cleanString(record.sourceLiteratureItemId),
        target_literature_item_id: cleanString(record.targetLiteratureItemId),
        reference_instance_id: cleanString(record.referenceInstanceId),
        resolution_id: cleanString(record.resolutionId),
        edge_status: cleanString(record.edgeStatus) || "unbound",
        roles_json: cleanString(record.rolesJson) || "[]",
        weight: Number.isFinite(Number(record.weight))
          ? Number(record.weight)
          : 1,
        created_at: cleanString(record.createdAt) || this.now(),
        updated_at: cleanString(record.updatedAt) || this.now(),
      },
    );
  }

  upsertCitationSourceOwnership(
    record: SynthesisCitationSourceOwnershipRecord,
  ) {
    this.initialize();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_citation_source_ownership (
          source_literature_item_id,
          edge_id,
          reference_instance_id,
          target_literature_item_id,
          edge_status,
          updated_at
        )
        VALUES (
          @source_literature_item_id,
          @edge_id,
          @reference_instance_id,
          @target_literature_item_id,
          @edge_status,
          @updated_at
        )
      `,
      {
        source_literature_item_id: cleanString(record.sourceLiteratureItemId),
        edge_id: cleanString(record.edgeId),
        reference_instance_id: cleanString(record.referenceInstanceId),
        target_literature_item_id: cleanString(record.targetLiteratureItemId),
        edge_status: cleanString(record.edgeStatus) || "unbound",
        updated_at: cleanString(record.updatedAt) || this.now(),
      },
    );
  }

  upsertCitationIncomingGroup(record: SynthesisCitationIncomingGroupRecord) {
    this.initialize();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_citation_incoming_group (
          target_literature_item_id,
          source_literature_item_id,
          edge_id,
          reference_instance_id,
          edge_status,
          updated_at
        )
        VALUES (
          @target_literature_item_id,
          @source_literature_item_id,
          @edge_id,
          @reference_instance_id,
          @edge_status,
          @updated_at
        )
      `,
      {
        target_literature_item_id: cleanString(record.targetLiteratureItemId),
        source_literature_item_id: cleanString(record.sourceLiteratureItemId),
        edge_id: cleanString(record.edgeId),
        reference_instance_id: cleanString(record.referenceInstanceId),
        edge_status: cleanString(record.edgeStatus) || "unbound",
        updated_at: cleanString(record.updatedAt) || this.now(),
      },
    );
  }

  upsertCitationLightMetrics(record: SynthesisCitationLightMetricsRecord) {
    this.initialize();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_citation_metrics_light (
          literature_item_id,
          outgoing_count,
          incoming_count,
          matched_outgoing_count,
          unresolved_outgoing_count,
          ambiguous_outgoing_count,
          local_degree,
          source_structure_version,
          updated_at
        )
        VALUES (
          @literature_item_id,
          @outgoing_count,
          @incoming_count,
          @matched_outgoing_count,
          @unresolved_outgoing_count,
          @ambiguous_outgoing_count,
          @local_degree,
          @source_structure_version,
          @updated_at
        )
      `,
      {
        literature_item_id: cleanString(record.literatureItemId),
        outgoing_count: Math.max(
          0,
          Math.floor(Number(record.outgoingCount) || 0),
        ),
        incoming_count: Math.max(
          0,
          Math.floor(Number(record.incomingCount) || 0),
        ),
        matched_outgoing_count: Math.max(
          0,
          Math.floor(Number(record.matchedOutgoingCount) || 0),
        ),
        unresolved_outgoing_count: Math.max(
          0,
          Math.floor(Number(record.unresolvedOutgoingCount) || 0),
        ),
        ambiguous_outgoing_count: Math.max(
          0,
          Math.floor(Number(record.ambiguousOutgoingCount) || 0),
        ),
        local_degree: Math.max(0, Math.floor(Number(record.localDegree) || 0)),
        source_structure_version: Math.max(
          0,
          Math.floor(Number(record.sourceStructureVersion) || 0),
        ),
        updated_at: cleanString(record.updatedAt) || this.now(),
      },
    );
  }

  upsertCitationComplexMetrics(record: SynthesisCitationComplexMetricsRecord) {
    this.initialize();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_citation_metrics_complex (
          literature_item_id,
          node_id,
          paper_ref,
          item_key,
          title,
          year,
          internal_in_degree,
          internal_out_degree,
          external_reference_count,
          unresolved_reference_count,
          internal_pagerank,
          component_id,
          component_size,
          is_isolated,
          age_norm,
          recency_norm,
          in_degree_norm,
          out_degree_norm,
          pagerank_norm,
          foundation_score,
          frontier_score,
          synthesis_role_hints_json,
          source_structure_version,
          source_graph_hash,
          metrics_hash,
          status,
          updated_at
        )
        VALUES (
          @literature_item_id,
          @node_id,
          @paper_ref,
          @item_key,
          @title,
          @year,
          @internal_in_degree,
          @internal_out_degree,
          @external_reference_count,
          @unresolved_reference_count,
          @internal_pagerank,
          @component_id,
          @component_size,
          @is_isolated,
          @age_norm,
          @recency_norm,
          @in_degree_norm,
          @out_degree_norm,
          @pagerank_norm,
          @foundation_score,
          @frontier_score,
          @synthesis_role_hints_json,
          @source_structure_version,
          @source_graph_hash,
          @metrics_hash,
          @status,
          @updated_at
        )
      `,
      {
        literature_item_id: cleanString(record.literatureItemId),
        node_id: cleanString(record.nodeId),
        paper_ref: cleanString(record.paperRef),
        item_key: cleanString(record.itemKey),
        title: cleanString(record.title),
        year: cleanString(record.year),
        internal_in_degree: Math.max(
          0,
          Math.floor(Number(record.internalInDegree) || 0),
        ),
        internal_out_degree: Math.max(
          0,
          Math.floor(Number(record.internalOutDegree) || 0),
        ),
        external_reference_count: Math.max(
          0,
          Math.floor(Number(record.externalReferenceCount) || 0),
        ),
        unresolved_reference_count: Math.max(
          0,
          Math.floor(Number(record.unresolvedReferenceCount) || 0),
        ),
        internal_pagerank: Number(record.internalPagerank) || 0,
        component_id: cleanString(record.componentId),
        component_size: Math.max(
          0,
          Math.floor(Number(record.componentSize) || 0),
        ),
        is_isolated: record.isIsolated ? 1 : 0,
        age_norm: Number(record.ageNorm) || 0,
        recency_norm: Number(record.recencyNorm) || 0,
        in_degree_norm: Number(record.inDegreeNorm) || 0,
        out_degree_norm: Number(record.outDegreeNorm) || 0,
        pagerank_norm: Number(record.pagerankNorm) || 0,
        foundation_score: Number(record.foundationScore) || 0,
        frontier_score: Number(record.frontierScore) || 0,
        synthesis_role_hints_json:
          cleanString(record.synthesisRoleHintsJson) || "[]",
        source_structure_version: Math.max(
          0,
          Math.floor(Number(record.sourceStructureVersion) || 0),
        ),
        source_graph_hash: cleanString(record.sourceGraphHash),
        metrics_hash: cleanString(record.metricsHash),
        status: cleanString(record.status) || "ready",
        updated_at: cleanString(record.updatedAt) || this.now(),
      },
    );
  }

  upsertLiteratureMatchingMetadata(
    record: SynthesisLiteratureMatchingMetadataRecord,
  ) {
    this.initialize();
    const literatureItemId = cleanString(record.literatureItemId);
    if (!literatureItemId) {
      throw new Error("literatureItemId must be non-empty");
    }
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_literature_matching_metadata (
          literature_item_id,
          schema_id,
          key_terms_json,
          methods_json,
          problems_json,
          datasets_json,
          exclude_terms_json,
          source_artifact_hash,
          metadata_hash,
          diagnostics_json,
          updated_at
        )
        VALUES (
          @literature_item_id,
          @schema_id,
          @key_terms_json,
          @methods_json,
          @problems_json,
          @datasets_json,
          @exclude_terms_json,
          @source_artifact_hash,
          @metadata_hash,
          @diagnostics_json,
          @updated_at
        )
      `,
      {
        literature_item_id: literatureItemId,
        schema_id:
          cleanString(record.schemaId) || "literature_matching_metadata.v1",
        key_terms_json: normalizeJsonStringArrayText(record.keyTermsJson, 12),
        methods_json: normalizeJsonStringArrayText(record.methodsJson, 8),
        problems_json: normalizeJsonStringArrayText(record.problemsJson, 8),
        datasets_json: normalizeJsonStringArrayText(record.datasetsJson, 8),
        exclude_terms_json: normalizeJsonStringArrayText(
          record.excludeTermsJson,
          6,
        ),
        source_artifact_hash: cleanString(record.sourceArtifactHash),
        metadata_hash: cleanString(record.metadataHash),
        diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
        updated_at: cleanString(record.updatedAt) || this.now(),
      },
    );
  }

  upsertTopicInterestMetadata(record: SynthesisTopicInterestMetadataRecord) {
    this.initialize();
    const topicId = cleanString(record.topicId);
    if (!topicId) {
      throw new Error("topicId must be non-empty");
    }
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_topic_interest_metadata (
          topic_id,
          schema_id,
          include_terms_json,
          must_have_terms_json,
          methods_json,
          exclude_terms_json,
          seed_literature_item_ids_json,
          source_artifact_hash,
          metadata_hash,
          diagnostics_json,
          updated_at
        )
        VALUES (
          @topic_id,
          @schema_id,
          @include_terms_json,
          @must_have_terms_json,
          @methods_json,
          @exclude_terms_json,
          @seed_literature_item_ids_json,
          @source_artifact_hash,
          @metadata_hash,
          @diagnostics_json,
          @updated_at
        )
      `,
      {
        topic_id: topicId,
        schema_id: cleanString(record.schemaId) || "topic_interest_metadata.v1",
        include_terms_json: normalizeJsonStringArrayText(
          record.includeTermsJson,
          16,
        ),
        must_have_terms_json: normalizeJsonStringArrayText(
          record.mustHaveTermsJson,
          6,
        ),
        methods_json: normalizeJsonStringArrayText(record.methodsJson, 8),
        exclude_terms_json: normalizeJsonStringArrayText(
          record.excludeTermsJson,
          8,
        ),
        seed_literature_item_ids_json: normalizeJsonStringArrayText(
          record.seedLiteratureItemIdsJson,
          50,
        ),
        source_artifact_hash: cleanString(record.sourceArtifactHash),
        metadata_hash: cleanString(record.metadataHash),
        diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
        updated_at: cleanString(record.updatedAt) || this.now(),
      },
    );
  }

  upsertTopicDiscoveryHint(record: SynthesisTopicDiscoveryHintRecord) {
    this.initialize();
    const topicId = cleanString(record.topicId);
    const literatureItemId = cleanString(record.literatureItemId);
    const method = cleanString(record.method) || "metadata-overlap-v1";
    if (!topicId || !literatureItemId) {
      throw new Error("topicId and literatureItemId must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_topic_discovery_hint (
          hint_id,
          topic_id,
          literature_item_id,
          score,
          method,
          matching_fields_json,
          status,
          created_at,
          updated_at
        )
        VALUES (
          @hint_id,
          @topic_id,
          @literature_item_id,
          @score,
          @method,
          @matching_fields_json,
          @status,
          @created_at,
          @updated_at
        )
      `,
      {
        hint_id:
          cleanString(record.hintId) ||
          `topic-discovery:${stableShortKey({
            topicId,
            literatureItemId,
            method,
          })}`,
        topic_id: topicId,
        literature_item_id: literatureItemId,
        score: Math.max(0, Number(record.score) || 0),
        method,
        matching_fields_json: cleanString(record.matchingFieldsJson) || "{}",
        status: normalizeTopicDiscoveryHintStatus(record.status),
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  upsertReviewItem(record: SynthesisReviewItemRecord) {
    this.initialize();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_review_item (
          review_item_id,
          review_kind,
          priority,
          status,
          scope_kind,
          scope_ref,
          blocked_by_review_item_id,
          payload_json,
          diagnostics_json,
          created_at,
          updated_at
        )
        VALUES (
          @review_item_id,
          @review_kind,
          @priority,
          @status,
          @scope_kind,
          @scope_ref,
          @blocked_by_review_item_id,
          @payload_json,
          @diagnostics_json,
          @created_at,
          @updated_at
        )
      `,
      {
        review_item_id: cleanString(record.reviewItemId),
        review_kind: cleanString(record.reviewKind),
        priority: Math.max(0, Math.floor(Number(record.priority) || 0)),
        status: cleanString(record.status) || "open",
        scope_kind: cleanString(record.scopeKind),
        scope_ref: cleanString(record.scopeRef),
        blocked_by_review_item_id: cleanString(record.blockedByReviewItemId),
        payload_json: cleanString(record.payloadJson) || "{}",
        diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
        created_at: cleanString(record.createdAt) || this.now(),
        updated_at: cleanString(record.updatedAt) || this.now(),
      },
    );
  }

  upsertOperation(record: SynthesisOperationRecord) {
    this.initialize();
    const operationId = cleanString(record.operationId);
    if (!operationId) {
      throw new Error("operationId must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_operation (
          operation_id,
          operation_type,
          library_id,
          scope_kind,
          scope_ref,
          status,
          label,
          phase,
          phase_label,
          message,
          progress_mode,
          processed_count,
          skipped_count,
          failed_count,
          total_count,
          basis_kind,
          basis_value,
          source_hash,
          diagnostics_json,
          created_at,
          started_at,
          completed_at,
          updated_at
        )
        VALUES (
          @operation_id,
          @operation_type,
          @library_id,
          @scope_kind,
          @scope_ref,
          @status,
          @label,
          @phase,
          @phase_label,
          @message,
          @progress_mode,
          @processed_count,
          @skipped_count,
          @failed_count,
          @total_count,
          @basis_kind,
          @basis_value,
          @source_hash,
          @diagnostics_json,
          @created_at,
          @started_at,
          @completed_at,
          @updated_at
        )
      `,
      {
        operation_id: operationId,
        operation_type: cleanString(record.operationType),
        library_id: Math.max(0, Math.floor(Number(record.libraryId) || 0)),
        scope_kind: cleanString(record.scopeKind),
        scope_ref: cleanString(record.scopeRef),
        status: normalizeOperationStatus(record.status),
        label: cleanString(record.label),
        phase: cleanString(record.phase),
        phase_label: cleanString(record.phaseLabel),
        message: cleanString(record.message),
        progress_mode: normalizeOperationProgressMode(record.progressMode),
        processed_count: nonNegativeInt(record.processedCount),
        skipped_count: nonNegativeInt(record.skippedCount),
        failed_count: nonNegativeInt(record.failedCount),
        total_count: nonNegativeInt(record.totalCount),
        basis_kind: cleanString(record.basisKind),
        basis_value: cleanString(record.basisValue),
        source_hash: cleanString(record.sourceHash),
        diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
        created_at: cleanString(record.createdAt) || timestamp,
        started_at: cleanString(record.startedAt) || timestamp,
        completed_at: cleanString(record.completedAt),
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  getOperation(operationIdRaw: string) {
    this.initialize();
    const operationId = cleanString(operationIdRaw);
    if (!operationId) {
      return null;
    }
    const row = this.db.get(
      `
        SELECT *
        FROM synt_operation
        WHERE operation_id=@operation_id
        LIMIT 1
      `,
      { operation_id: operationId },
    );
    return row ? rowToOperation(row) : null;
  }

  updateOperationStatus(args: {
    operationId: string;
    status: SynthesisOperationStatus;
    phase?: string;
    phaseLabel?: string;
    message?: string;
    processedCount?: number;
    skippedCount?: number;
    failedCount?: number;
    totalCount?: number;
    diagnosticsJson?: string;
  }) {
    const existing = this.getOperation(args.operationId);
    if (!existing) {
      return null;
    }
    const timestamp = this.now();
    const completedAt = ["completed", "failed", "canceled"].includes(
      args.status,
    )
      ? timestamp
      : existing.completedAt;
    const next: SynthesisOperationRecord = {
      ...existing,
      status: args.status,
      phase: args.phase !== undefined ? args.phase : existing.phase,
      phaseLabel:
        args.phaseLabel !== undefined ? args.phaseLabel : existing.phaseLabel,
      message: args.message !== undefined ? args.message : existing.message,
      processedCount:
        args.processedCount !== undefined
          ? args.processedCount
          : existing.processedCount,
      skippedCount:
        args.skippedCount !== undefined
          ? args.skippedCount
          : existing.skippedCount,
      failedCount:
        args.failedCount !== undefined ? args.failedCount : existing.failedCount,
      totalCount:
        args.totalCount !== undefined ? args.totalCount : existing.totalCount,
      diagnosticsJson:
        args.diagnosticsJson !== undefined
          ? args.diagnosticsJson
          : existing.diagnosticsJson,
      completedAt,
      updatedAt: timestamp,
    };
    this.upsertOperation(next);
    return next;
  }

  listOperations(
    args: {
      statuses?: string[];
      operationTypes?: string[];
      includeCompleted?: boolean;
      limit?: number;
    } = {},
  ) {
    this.initialize();
    const statuses = new Set(
      (args.statuses || []).map(cleanString).filter(Boolean),
    );
    const operationTypes = new Set(
      (args.operationTypes || []).map(cleanString).filter(Boolean),
    );
    const terminal = new Set(["completed", "failed", "canceled"]);
    const limit = Math.max(0, Math.floor(Number(args.limit) || 0));
    const clauses: string[] = [];
    const params: SqlParams = {};
    appendInFilter(clauses, params, "status", "status", statuses);
    appendInFilter(
      clauses,
      params,
      "operation_type",
      "operation_type",
      operationTypes,
    );
    if (!args.includeCompleted) {
      clauses.push("status NOT IN ('completed', 'failed', 'canceled')");
    }
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const limitSql = appendLimitClause(params, limit);
    const rows = this.db
      .all(
        `
          SELECT *
          FROM synt_operation
          ${where}
          ORDER BY updated_at DESC, operation_id ASC
          ${limitSql}
        `,
        params,
      )
      .map(rowToOperation)
      .filter((row) => !statuses.size || statuses.has(row.status || ""))
      .filter(
        (row) =>
          !operationTypes.size || operationTypes.has(row.operationType),
      )
      .filter(
        (row) =>
          args.includeCompleted ||
          !terminal.has(normalizeOperationStatus(row.status)),
      )
      .sort(
        (left, right) =>
          (right.updatedAt || "").localeCompare(left.updatedAt || "") ||
          left.operationId.localeCompare(right.operationId),
      );
    return limit > 0 ? rows.slice(0, limit) : rows;
  }

  listReferenceFacts(
    args: { sourceLiteratureItemIds?: string[]; rawReferenceIds?: string[] } = {},
  ) {
    this.initialize();
    const sourceIds = new Set(
      (args.sourceLiteratureItemIds || []).map(cleanString).filter(Boolean),
    );
    const rawReferences = this.listRawReferences({
      rawReferenceIds: args.rawReferenceIds,
      sourceRefs: Array.from(sourceIds),
      statuses: ["active"],
    });
    const physicalCanonicalIds = Array.from(
      new Set(
        rawReferences
          .map((row) => cleanString(row.canonicalReferenceId))
          .filter(Boolean),
      ),
    );
    const effectiveCanonicalByPhysical =
      this.resolveEffectiveCanonicalReferenceIds(physicalCanonicalIds);
    const relevantCanonicalIds = Array.from(
      new Set([
        ...physicalCanonicalIds,
        ...Array.from(effectiveCanonicalByPhysical.values()),
      ]),
    );
    const canonicalById = new Map(
      this.listCanonicalReferences({
        canonicalReferenceIds: relevantCanonicalIds,
      }).map(
        (row) => [row.canonicalReferenceId, row] as const,
      ),
    );
    const bindingsByCanonical = new Map<string, SynthesisReferenceBindingRecord>();
    const bindingPriority = (status: string) =>
      status === "accepted"
        ? 4
        : status === "candidate"
          ? 3
          : status === "stale_target"
            ? 2
            : status === "rejected"
              ? 1
              : 0;
    const bindingResolutionStatus = (
      binding: SynthesisReferenceBindingRecord | undefined,
    ) => {
      if (!binding) {
        return "unbound";
      }
      if (binding.status === "candidate") {
        return "candidate";
      }
      if (binding.status === "rejected") {
        return "rejected";
      }
      if (binding.status === "stale_target") {
        return "stale_target";
      }
      return "accepted";
    };
    for (const binding of this.listReferenceBindings({
      canonicalReferenceIds: relevantCanonicalIds,
    })) {
      const effectiveId =
        effectiveCanonicalByPhysical.get(binding.canonicalReferenceId) ||
        binding.canonicalReferenceId;
      const existing = bindingsByCanonical.get(effectiveId);
      if (
        !existing ||
        bindingPriority(binding.status) > bindingPriority(existing.status)
      ) {
        bindingsByCanonical.set(effectiveId, binding);
      }
    }
    return rawReferences
      .sort(
        (left, right) =>
          left.sourceRef.localeCompare(right.sourceRef) ||
          left.referenceIndex - right.referenceIndex,
      )
      .map((reference) => {
        const physicalCanonicalId = cleanString(reference.canonicalReferenceId);
        const canonicalId =
          effectiveCanonicalByPhysical.get(physicalCanonicalId) ||
          physicalCanonicalId;
        const canonical = canonicalById.get(canonicalId);
        const binding = canonicalId
          ? bindingsByCanonical.get(canonicalId)
          : undefined;
        const targetPaperRef = binding?.itemKey
          ? `${binding.libraryId}:${binding.itemKey}`
          : undefined;
        return {
          referenceInstanceId: reference.rawReferenceId,
          sourceLiteratureItemId: reference.sourceRef,
          referenceIndex: reference.referenceIndex,
          title: reference.parsedTitle,
          rawReference: reference.rawReference,
          year: reference.year,
          authorsJson: reference.authorsJson,
          resolutionId: canonicalId,
          resolutionStatus: bindingResolutionStatus(binding),
          confidence: binding?.confidence,
          targetLiteratureItemId: binding ? targetPaperRef : canonicalId,
          targetTitle: binding
            ? targetPaperRef
            : canonical?.title || reference.parsedTitle,
          targetYear: canonical?.year || reference.year,
          targetHasZoteroBinding: Boolean(binding),
          targetPaperRef,
          bindingStatus: binding?.status,
        };
      });
  }

  listReferenceFactSummariesBySource(
    args: { sourceLiteratureItemIds?: string[] } = {},
  ) {
    this.initialize();
    const sourceIds = new Set(
      (args.sourceLiteratureItemIds || []).map(cleanString).filter(Boolean),
    );
    const rawReferences = this.listRawReferences({
      sourceRefs: Array.from(sourceIds),
      statuses: ["active"],
    });
    const physicalCanonicalIds = Array.from(
      new Set(
        rawReferences
          .map((row) => cleanString(row.canonicalReferenceId))
          .filter(Boolean),
      ),
    );
    const effectiveCanonicalByPhysical =
      this.resolveEffectiveCanonicalReferenceIds(physicalCanonicalIds);
    const relevantCanonicalIds = Array.from(
      new Set([
        ...physicalCanonicalIds,
        ...Array.from(effectiveCanonicalByPhysical.values()),
      ]),
    );
    const boundCanonicalIds = new Set<string>();
    for (const binding of this.listReferenceBindings({
      canonicalReferenceIds: relevantCanonicalIds,
    })) {
      if (binding.status !== "accepted") {
        continue;
      }
      boundCanonicalIds.add(
        effectiveCanonicalByPhysical.get(binding.canonicalReferenceId) ||
          binding.canonicalReferenceId,
      );
    }
    const summaries = new Map<
      string,
      { sourceLiteratureItemId: string; referenceCount: number; unboundReferenceCount: number }
    >();
    for (const reference of rawReferences) {
      const source = cleanString(reference.sourceRef);
      if (!source) {
        continue;
      }
      const existing =
        summaries.get(source) ||
        {
          sourceLiteratureItemId: source,
          referenceCount: 0,
          unboundReferenceCount: 0,
        };
      existing.referenceCount += 1;
      const physicalCanonicalId = cleanString(reference.canonicalReferenceId);
      const effectiveCanonicalId =
        effectiveCanonicalByPhysical.get(physicalCanonicalId) ||
        physicalCanonicalId;
      if (!effectiveCanonicalId || !boundCanonicalIds.has(effectiveCanonicalId)) {
        existing.unboundReferenceCount += 1;
      }
      summaries.set(source, existing);
    }
    return Array.from(summaries.values()).sort((left, right) =>
      left.sourceLiteratureItemId.localeCompare(right.sourceLiteratureItemId),
    );
  }

  listCitationNodes(
    args: {
      statuses?: string[];
      literatureItemIds?: string[];
      limit?: unknown;
    } = {},
  ) {
    this.initialize();
    const statuses = new Set(
      (args.statuses || []).map(cleanString).filter(Boolean),
    );
    const literatureItemIds = new Set(
      (args.literatureItemIds || []).map(cleanString).filter(Boolean),
    );
    const limit =
      args.limit === undefined
        ? Number.POSITIVE_INFINITY
        : normalizeLimit(args.limit, MAX_PAGE_LIMIT, MAX_PAGE_LIMIT);
    const sqlLimit = Number.isFinite(limit) ? limit : 0;
    const clauses: string[] = [];
    const params: SqlParams = {};
    appendInFilter(clauses, params, "node_status", "node_status", statuses);
    appendInFilter(
      clauses,
      params,
      "literature_item_id",
      "literature_item_id",
      literatureItemIds,
    );
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const limitSql = appendLimitClause(params, sqlLimit);
    return this.db
      .all(
        `
          SELECT *
          FROM synt_citation_node
          ${where}
          ORDER BY literature_item_id ASC
          ${limitSql}
        `,
        params,
      )
      .map(rowToCitationNode)
      .filter((row) => !statuses.size || statuses.has(row.nodeStatus))
      .filter(
        (row) =>
          !literatureItemIds.size ||
          literatureItemIds.has(row.literatureItemId),
      )
      .slice(0, limit);
  }

  listCitationEdges(
    args: {
      sourceLiteratureItemIds?: string[];
      targetLiteratureItemIds?: string[];
      statuses?: string[];
      limit?: unknown;
    } = {},
  ) {
    this.initialize();
    const sourceIds = new Set(
      (args.sourceLiteratureItemIds || []).map(cleanString).filter(Boolean),
    );
    const targetIds = new Set(
      (args.targetLiteratureItemIds || []).map(cleanString).filter(Boolean),
    );
    const statuses = new Set(
      (args.statuses || []).map(cleanString).filter(Boolean),
    );
    const limit =
      args.limit === undefined
        ? Number.POSITIVE_INFINITY
        : normalizeLimit(args.limit, MAX_PAGE_LIMIT, MAX_PAGE_LIMIT);
    const sqlLimit = Number.isFinite(limit) ? limit : 0;
    const clauses: string[] = [];
    const params: SqlParams = {};
    appendInFilter(
      clauses,
      params,
      "source_literature_item_id",
      "source_literature_item_id",
      sourceIds,
    );
    appendInFilter(
      clauses,
      params,
      "target_literature_item_id",
      "target_literature_item_id",
      targetIds,
    );
    appendInFilter(clauses, params, "edge_status", "edge_status", statuses);
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const limitSql = appendLimitClause(params, sqlLimit);
    return this.db
      .all(
        `
          SELECT *
          FROM synt_citation_edge
          ${where}
          ORDER BY source_literature_item_id ASC, edge_id ASC
          ${limitSql}
        `,
        params,
      )
      .map(rowToCitationEdge)
      .filter(
        (row) =>
          (!sourceIds.size || sourceIds.has(row.sourceLiteratureItemId)) &&
          (!targetIds.size ||
            (row.targetLiteratureItemId
              ? targetIds.has(row.targetLiteratureItemId)
              : false)),
      )
      .filter(
        (row) =>
          !statuses.size || statuses.has(cleanString(row.edgeStatus) || ""),
      )
      .slice(0, limit);
  }

  listCitationSourceOwnership(
    args: { sourceLiteratureItemIds?: string[] } = {},
  ) {
    this.initialize();
    const sourceIds = new Set(
      (args.sourceLiteratureItemIds || []).map(cleanString).filter(Boolean),
    );
    const clauses: string[] = [];
    const params: SqlParams = {};
    appendInFilter(
      clauses,
      params,
      "source_literature_item_id",
      "source_literature_item_id",
      sourceIds,
    );
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .all(
        `
          SELECT *
          FROM synt_citation_source_ownership
          ${where}
          ORDER BY source_literature_item_id ASC, edge_id ASC
        `,
        params,
      )
      .map(rowToCitationSourceOwnership)
      .filter(
        (row) => !sourceIds.size || sourceIds.has(row.sourceLiteratureItemId),
      )
      .sort(
        (left, right) =>
          left.sourceLiteratureItemId.localeCompare(
            right.sourceLiteratureItemId,
          ) || left.edgeId.localeCompare(right.edgeId),
      );
  }

  listCitationIncomingGroups(
    args: { targetLiteratureItemIds?: string[] } = {},
  ) {
    this.initialize();
    const targetIds = new Set(
      (args.targetLiteratureItemIds || []).map(cleanString).filter(Boolean),
    );
    const clauses: string[] = [];
    const params: SqlParams = {};
    appendInFilter(
      clauses,
      params,
      "target_literature_item_id",
      "target_literature_item_id",
      targetIds,
    );
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .all(
        `
          SELECT *
          FROM synt_citation_incoming_group
          ${where}
          ORDER BY target_literature_item_id ASC, edge_id ASC
        `,
        params,
      )
      .map(rowToCitationIncomingGroup)
      .filter(
        (row) => !targetIds.size || targetIds.has(row.targetLiteratureItemId),
      )
      .sort(
        (left, right) =>
          left.targetLiteratureItemId.localeCompare(
            right.targetLiteratureItemId,
          ) || left.edgeId.localeCompare(right.edgeId),
      );
  }

  listCitationLightMetrics(
    args: {
      literatureItemIds?: string[];
      limit?: unknown;
      sortBy?: "local_degree" | "incoming_count" | "outgoing_count";
    } = {},
  ) {
    this.initialize();
    const ids = new Set(
      (args.literatureItemIds || []).map(cleanString).filter(Boolean),
    );
    const limit =
      args.limit === undefined
        ? Number.POSITIVE_INFINITY
        : normalizeLimit(args.limit, MAX_PAGE_LIMIT, MAX_PAGE_LIMIT);
    const sortBy = args.sortBy || "local_degree";
    return this.db
      .all("SELECT * FROM synt_citation_metrics_light")
      .map(rowToCitationLightMetrics)
      .filter((row) => !ids.size || ids.has(row.literatureItemId))
      .sort((left, right) => {
        const metric =
          sortBy === "incoming_count"
            ? right.incomingCount - left.incomingCount
            : sortBy === "outgoing_count"
              ? right.outgoingCount - left.outgoingCount
              : right.localDegree - left.localDegree;
        if (metric !== 0) {
          return metric;
        }
        return left.literatureItemId.localeCompare(right.literatureItemId);
      })
      .slice(0, limit);
  }

  listCitationComplexMetrics(
    args: {
      literatureItemIds?: string[];
      statuses?: string[];
      limit?: unknown;
      sortBy?: "foundation" | "frontier" | "pagerank" | "in_degree";
    } = {},
  ) {
    this.initialize();
    const ids = new Set(
      (args.literatureItemIds || []).map(cleanString).filter(Boolean),
    );
    const statuses = new Set(
      (args.statuses || []).map(cleanString).filter(Boolean),
    );
    const limit =
      args.limit === undefined
        ? Number.POSITIVE_INFINITY
        : normalizeLimit(args.limit, MAX_PAGE_LIMIT, MAX_PAGE_LIMIT);
    const sortBy = args.sortBy || "foundation";
    return this.db
      .all("SELECT * FROM synt_citation_metrics_complex")
      .map(rowToCitationComplexMetrics)
      .filter((row) => !ids.size || ids.has(row.literatureItemId))
      .filter((row) => !statuses.size || statuses.has(row.status))
      .sort((left, right) => {
        const metric =
          sortBy === "frontier"
            ? right.frontierScore - left.frontierScore
            : sortBy === "pagerank"
              ? right.internalPagerank - left.internalPagerank
              : sortBy === "in_degree"
                ? right.internalInDegree - left.internalInDegree
                : right.foundationScore - left.foundationScore;
        if (metric !== 0) {
          return metric;
        }
        return left.literatureItemId.localeCompare(right.literatureItemId);
      })
      .slice(0, limit);
  }

  citationLayoutKey(args: { viewKey?: string; preset?: string }) {
    const viewKey = cleanString(args.viewKey) || "workbench_overview";
    const preset = cleanString(args.preset) || "force";
    return `${viewKey}:${preset}`;
  }

  getCitationGraphLayoutState(args: { viewKey?: string; preset?: string }) {
    this.initialize();
    const layoutKey = this.citationLayoutKey(args);
    const row = this.db.get(
      `
        SELECT *
        FROM synt_citation_layout_state
        WHERE layout_key=@layout_key
        LIMIT 1
      `,
      { layout_key: layoutKey },
    );
    return row ? rowToCitationLayoutState(row) : null;
  }

  listCitationGraphLayoutStates(args: { viewKey?: string } = {}) {
    this.initialize();
    const viewKey = cleanString(args.viewKey);
    return this.db
      .all("SELECT * FROM synt_citation_layout_state")
      .map(rowToCitationLayoutState)
      .filter((row) => !viewKey || row.viewKey === viewKey)
      .sort(
        (left, right) =>
          left.viewKey.localeCompare(right.viewKey) ||
          left.preset.localeCompare(right.preset),
      );
  }

  upsertCitationGraphLayoutState(record: SynthesisCitationLayoutRecord) {
    this.initialize();
    const viewKey = cleanString(record.viewKey) || "workbench_overview";
    const preset = cleanString(record.preset) || "force";
    const timestamp = cleanString(record.updatedAt) || this.now();
    const existing = this.getCitationGraphLayoutState({ viewKey, preset });
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_citation_layout_state (
          layout_key,
          view_key,
          preset,
          graph_hash,
          status,
          layout_json,
          diagnostics_json,
          created_at,
          updated_at
        ) VALUES (
          @layout_key,
          @view_key,
          @preset,
          @graph_hash,
          @status,
          @layout_json,
          @diagnostics_json,
          @created_at,
          @updated_at
        )
      `,
      {
        layout_key: this.citationLayoutKey({ viewKey, preset }),
        view_key: viewKey,
        preset,
        graph_hash: cleanString(record.graphHash),
        status: normalizeCitationLayoutStatus(record.status),
        layout_json: cleanString(record.layoutJson) || "{}",
        diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
        created_at: existing?.createdAt || timestamp,
        updated_at: timestamp,
      },
    );
    return this.getCitationGraphLayoutState({ viewKey, preset });
  }

  markCitationGraphLayoutRunning(args: {
    viewKey?: string;
    preset?: string;
    graphHash?: string;
    diagnosticsJson?: string;
    updatedAt?: string;
  }) {
    const existing = this.getCitationGraphLayoutState(args);
    return this.upsertCitationGraphLayoutState({
      layoutKey: this.citationLayoutKey(args),
      viewKey: cleanString(args.viewKey) || "workbench_overview",
      preset: cleanString(args.preset) || "force",
      graphHash: cleanString(args.graphHash) || existing?.graphHash || "",
      status: "running",
      layoutJson: existing?.layoutJson || "{}",
      diagnosticsJson: cleanString(args.diagnosticsJson) || "[]",
      createdAt: existing?.createdAt,
      updatedAt: cleanString(args.updatedAt) || this.now(),
    });
  }

  markCitationGraphLayoutFailed(args: {
    viewKey?: string;
    preset?: string;
    graphHash?: string;
    diagnosticsJson?: string;
    updatedAt?: string;
  }) {
    const existing = this.getCitationGraphLayoutState(args);
    return this.upsertCitationGraphLayoutState({
      layoutKey: this.citationLayoutKey(args),
      viewKey: cleanString(args.viewKey) || "workbench_overview",
      preset: cleanString(args.preset) || "force",
      graphHash: cleanString(args.graphHash) || existing?.graphHash || "",
      status: "failed",
      layoutJson: existing?.layoutJson || "{}",
      diagnosticsJson: cleanString(args.diagnosticsJson) || "[]",
      createdAt: existing?.createdAt,
      updatedAt: cleanString(args.updatedAt) || this.now(),
    });
  }

  upsertRelatedItemsSyncEffect(record: SynthesisRelatedItemsSyncEffectRecord) {
    this.initialize();
    const timestamp = this.now();
    const effectId = cleanString(record.effectId);
    if (!effectId) {
      throw new Error("effectId must be non-empty");
    }
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_related_items_sync_effect (
          effect_id,
          operation_id,
          citation_edge_id,
          source_literature_item_id,
          target_literature_item_id,
          source_library_id,
          source_item_key,
          target_library_id,
          target_item_key,
          action,
          status,
          created_by_synthesis,
          graph_basis_hash,
          graph_hash,
          external_write_at,
          echo_state,
          echo_observed_at,
          diagnostics_json,
          created_at,
          updated_at
        ) VALUES (
          @effect_id,
          @operation_id,
          @citation_edge_id,
          @source_literature_item_id,
          @target_literature_item_id,
          @source_library_id,
          @source_item_key,
          @target_library_id,
          @target_item_key,
          @action,
          @status,
          @created_by_synthesis,
          @graph_basis_hash,
          @graph_hash,
          @external_write_at,
          @echo_state,
          @echo_observed_at,
          @diagnostics_json,
          @created_at,
          @updated_at
        )
      `,
      {
        effect_id: effectId,
        operation_id: cleanString(record.operationId) || effectId,
        citation_edge_id: cleanString(record.citationEdgeId),
        source_literature_item_id: cleanString(record.sourceLiteratureItemId),
        target_literature_item_id: cleanString(record.targetLiteratureItemId),
        source_library_id: Math.max(
          0,
          Math.floor(Number(record.sourceLibraryId) || 0),
        ),
        source_item_key: cleanString(record.sourceItemKey),
        target_library_id: Math.max(
          0,
          Math.floor(Number(record.targetLibraryId) || 0),
        ),
        target_item_key: cleanString(record.targetItemKey),
        action: record.action === "revoke" ? "revoke" : "add",
        status: normalizeRelatedItemsSyncStatus(record.status),
        created_by_synthesis: record.createdBySynthesis ? 1 : 0,
        graph_basis_hash: cleanString(record.graphBasisHash),
        graph_hash: cleanString(record.graphHash),
        external_write_at: cleanString(record.externalWriteAt),
        echo_state: normalizeRelatedItemsEchoState(record.echoState),
        echo_observed_at: cleanString(record.echoObservedAt),
        diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  getRelatedItemsSyncEffect(effectIdRaw: string) {
    this.initialize();
    const effectId = cleanString(effectIdRaw);
    if (!effectId) {
      return null;
    }
    const row = this.db.get(
      `
        SELECT *
        FROM synt_related_items_sync_effect
        WHERE effect_id=@effect_id
        LIMIT 1
      `,
      { effect_id: effectId },
    );
    return row ? rowToRelatedItemsSyncEffect(row) : null;
  }

  listRelatedItemsSyncEffects(
    args: {
      statuses?: string[];
      citationEdgeIds?: string[];
      sourceItemKeys?: string[];
    } = {},
  ) {
    this.initialize();
    const statuses = new Set(
      (args.statuses || []).map(normalizeRelatedItemsSyncStatus),
    );
    const citationEdgeIds = new Set(
      (args.citationEdgeIds || []).map(cleanString).filter(Boolean),
    );
    const sourceItemKeys = new Set(
      (args.sourceItemKeys || []).map(cleanString).filter(Boolean),
    );
    return this.db
      .all("SELECT * FROM synt_related_items_sync_effect")
      .map(rowToRelatedItemsSyncEffect)
      .filter((row) => !statuses.size || statuses.has(row.status))
      .filter(
        (row) =>
          !citationEdgeIds.size ||
          (row.citationEdgeId
            ? citationEdgeIds.has(row.citationEdgeId)
            : false),
      )
      .filter(
        (row) => !sourceItemKeys.size || sourceItemKeys.has(row.sourceItemKey),
      )
      .sort(
        (left, right) =>
          (right.updatedAt || "").localeCompare(left.updatedAt || "") ||
          left.effectId.localeCompare(right.effectId),
      );
  }

  classifyRelatedItemsSyncEcho(args: {
    libraryId: number;
    itemKey: string;
    relatedItemKey?: string;
  }) {
    const libraryId = Math.max(0, Math.floor(Number(args.libraryId) || 0));
    const itemKey = cleanString(args.itemKey);
    const relatedItemKey = cleanString(args.relatedItemKey);
    return this.listRelatedItemsSyncEffects({
      statuses: ["pending_external_write", "applied", "already_existed"],
    }).find(
      (effect) =>
        effect.sourceLibraryId === libraryId &&
        effect.sourceItemKey === itemKey &&
        (!relatedItemKey || effect.targetItemKey === relatedItemKey),
    );
  }

  consumeRelatedItemsSyncEcho(args: {
    libraryId: number;
    itemKey: string;
    relatedItemKey?: string;
  }) {
    const libraryId = Math.max(0, Math.floor(Number(args.libraryId) || 0));
    const itemKey = cleanString(args.itemKey);
    const relatedItemKey = cleanString(args.relatedItemKey);
    if (!libraryId || !itemKey) {
      return null;
    }
    const timestamp = this.now();
    const nowMs = Date.parse(timestamp);
    const matchingEffects = this.listRelatedItemsSyncEffects({
      statuses: ["pending_external_write", "applied"],
    }).filter((effect) => {
      const sourceMatches =
        effect.sourceLibraryId === libraryId &&
        effect.sourceItemKey === itemKey &&
        (!relatedItemKey || effect.targetItemKey === relatedItemKey);
      const targetMatches =
        effect.targetLibraryId === libraryId &&
        effect.targetItemKey === itemKey &&
        (!relatedItemKey || effect.sourceItemKey === relatedItemKey);
      return sourceMatches || targetMatches;
    });
    for (const effect of matchingEffects) {
      if (
        normalizeRelatedItemsEchoState(effect.echoState) !== "awaiting_echo"
      ) {
        continue;
      }
      const writeMs = Date.parse(
        cleanString(effect.externalWriteAt || effect.updatedAt),
      );
      if (
        Number.isFinite(nowMs) &&
        Number.isFinite(writeMs) &&
        nowMs - writeMs > RELATED_ITEMS_SYNC_ECHO_WINDOW_MS
      ) {
        this.upsertRelatedItemsSyncEffect({
          ...effect,
          echoState: "expired",
          diagnosticsJson: JSON.stringify([
            ...parseJsonArray(effect.diagnosticsJson),
            {
              code: "related_items_sync_echo_window_expired",
              severity: "info",
              message:
                "Related-items sync echo window expired before Zotero notifier event was observed.",
            },
          ]),
          updatedAt: timestamp,
        });
        continue;
      }
      const consumed = {
        ...effect,
        echoState: "observed" as const,
        echoObservedAt: timestamp,
        diagnosticsJson: JSON.stringify([
          ...parseJsonArray(effect.diagnosticsJson),
          {
            code: "related_items_sync_echo_observed",
            severity: "info",
            message:
              "Zotero notifier event was classified as a Synthesis related-items sync echo.",
          },
        ]),
        updatedAt: timestamp,
      };
      this.upsertRelatedItemsSyncEffect(consumed);
      return this.getRelatedItemsSyncEffect(effect.effectId) || consumed;
    }
    return null;
  }

  listLiteratureMatchingMetadata(args: { literatureItemIds?: string[] } = {}) {
    this.initialize();
    const ids = new Set(
      (args.literatureItemIds || []).map(cleanString).filter(Boolean),
    );
    return this.db
      .all("SELECT * FROM synt_literature_matching_metadata")
      .map(rowToLiteratureMatchingMetadata)
      .filter((row) => !ids.size || ids.has(row.literatureItemId))
      .sort((left, right) =>
        left.literatureItemId.localeCompare(right.literatureItemId),
      );
  }

  getLiteratureMatchingMetadata(literatureItemIdRaw: string) {
    this.initialize();
    const literatureItemId = cleanString(literatureItemIdRaw);
    if (!literatureItemId) {
      return null;
    }
    const row = this.db.get(
      `
        SELECT *
        FROM synt_literature_matching_metadata
        WHERE literature_item_id=@literature_item_id
        LIMIT 1
      `,
      {
        literature_item_id: literatureItemId,
      },
    );
    return row ? rowToLiteratureMatchingMetadata(row) : null;
  }

  listTopicInterestMetadata(args: { topicIds?: string[] } = {}) {
    this.initialize();
    const ids = new Set((args.topicIds || []).map(cleanString).filter(Boolean));
    return this.db
      .all("SELECT * FROM synt_topic_interest_metadata")
      .map(rowToTopicInterestMetadata)
      .filter((row) => !ids.size || ids.has(row.topicId))
      .sort((left, right) => left.topicId.localeCompare(right.topicId));
  }

  getTopicInterestMetadata(topicIdRaw: string) {
    this.initialize();
    const topicId = cleanString(topicIdRaw);
    if (!topicId) {
      return null;
    }
    const row = this.db.get(
      `
        SELECT *
        FROM synt_topic_interest_metadata
        WHERE topic_id=@topic_id
        LIMIT 1
      `,
      {
        topic_id: topicId,
      },
    );
    return row ? rowToTopicInterestMetadata(row) : null;
  }

  listTopicDiscoveryHints(
    args: {
      topicIds?: string[];
      literatureItemIds?: string[];
      statuses?: string[];
      method?: string;
      limit?: unknown;
    } = {},
  ) {
    this.initialize();
    const topicIds = new Set(
      (args.topicIds || []).map(cleanString).filter(Boolean),
    );
    const literatureItemIds = new Set(
      (args.literatureItemIds || []).map(cleanString).filter(Boolean),
    );
    const statuses: Set<string> = new Set(
      (args.statuses || [])
        .map(normalizeTopicDiscoveryHintStatus)
        .filter(Boolean),
    );
    const method = cleanString(args.method);
    const limit =
      args.limit === undefined
        ? Number.POSITIVE_INFINITY
        : normalizeLimit(args.limit, MAX_PAGE_LIMIT, MAX_PAGE_LIMIT);
    return this.db
      .all("SELECT * FROM synt_topic_discovery_hint")
      .map(rowToTopicDiscoveryHint)
      .filter((row) => !topicIds.size || topicIds.has(row.topicId))
      .filter(
        (row) =>
          !literatureItemIds.size ||
          literatureItemIds.has(row.literatureItemId),
      )
      .filter((row) => !statuses.size || statuses.has(row.status || ""))
      .filter((row) => !method || row.method === method)
      .sort((left, right) => {
        const score = right.score - left.score;
        if (score !== 0) {
          return score;
        }
        return (
          left.topicId.localeCompare(right.topicId) ||
          left.literatureItemId.localeCompare(right.literatureItemId)
        );
      })
      .slice(0, limit);
  }

  getTopicDiscoveryHint(hintIdRaw: string) {
    this.initialize();
    const hintId = cleanString(hintIdRaw);
    if (!hintId) {
      return null;
    }
    const row = this.db.get(
      `
        SELECT *
        FROM synt_topic_discovery_hint
        WHERE hint_id=@hint_id
        LIMIT 1
      `,
      {
        hint_id: hintId,
      },
    );
    return row ? rowToTopicDiscoveryHint(row) : null;
  }

  updateTopicDiscoveryHintStatus(args: { hintId: string; status: string }) {
    const existing = this.getTopicDiscoveryHint(args.hintId);
    if (!existing) {
      return null;
    }
    this.upsertTopicDiscoveryHint({
      ...existing,
      status: normalizeTopicDiscoveryHintStatus(args.status),
      updatedAt: this.now(),
    });
    return this.getTopicDiscoveryHint(existing.hintId);
  }

  rejectTopicDiscoveryHint(hintId: string) {
    return this.updateTopicDiscoveryHintStatus({ hintId, status: "rejected" });
  }

  restoreTopicDiscoveryHint(hintId: string) {
    return this.updateTopicDiscoveryHintStatus({ hintId, status: "open" });
  }

  clearTopicDiscoveryHints(
    args: {
      topicIds?: string[];
      literatureItemIds?: string[];
      statuses?: string[];
      method?: string;
    } = {},
  ) {
    this.initialize();
    const existing = this.listTopicDiscoveryHints(args);
    for (const hint of existing) {
      this.db.run(
        `
          DELETE FROM synt_topic_discovery_hint
          WHERE hint_id=@hint_id
        `,
        {
          hint_id: hint.hintId,
        },
      );
    }
    return existing.length;
  }

  rebuildTopicDiscoveryHints(
    args: {
      topicIds?: string[];
      literatureItemIds?: string[];
      method?: string;
      minScore?: number;
      timestamp?: string;
    } = {},
  ): SynthesisTopicDiscoveryBuildResult {
    this.initialize();
    const method = cleanString(args.method) || "metadata-overlap-v1";
    const timestamp = cleanString(args.timestamp) || this.now();
    const minScore = Math.max(0, Number(args.minScore) || 1);
    const topics = this.listTopicInterestMetadata({ topicIds: args.topicIds });
    const literature = this.listLiteratureMatchingMetadata({
      literatureItemIds: args.literatureItemIds,
    });
    const scopedExistingRejected = new Map(
      this.listTopicDiscoveryHints({
        topicIds: args.topicIds,
        literatureItemIds: args.literatureItemIds,
        statuses: ["rejected"],
        method,
      }).map((hint) => [
        `${hint.topicId}\u0000${hint.literatureItemId}\u0000${hint.method || method}`,
        hint,
      ]),
    );
    const hints: SynthesisTopicDiscoveryHintRecord[] = [];
    for (const topic of topics) {
      for (const entry of literature) {
        const hint = scoreDiscoveryPair({
          topic,
          literature: entry,
          method,
          timestamp,
          minScore,
        });
        if (hint) {
          const rejected = scopedExistingRejected.get(
            `${hint.topicId}\u0000${hint.literatureItemId}\u0000${hint.method || method}`,
          );
          hints.push(
            rejected
              ? {
                  ...hint,
                  hintId: rejected.hintId || hint.hintId,
                  status: "rejected",
                  createdAt: rejected.createdAt || hint.createdAt,
                }
              : hint,
          );
        }
      }
    }
    this.transaction(() => {
      this.clearTopicDiscoveryHints({
        topicIds: args.topicIds,
        literatureItemIds: args.literatureItemIds,
        statuses: ["open", "superseded"],
        method,
      });
      for (const hint of hints) {
        this.upsertTopicDiscoveryHint(hint);
      }
    });
    const finalHints = this.listTopicDiscoveryHints({
      topicIds: args.topicIds,
      literatureItemIds: args.literatureItemIds,
      method,
    });
    const open = finalHints.filter((hint) => hint.status === "open").length;
    const rejected = finalHints.filter(
      (hint) => hint.status === "rejected",
    ).length;
    return {
      method,
      scannedTopics: topics.length,
      scannedLiterature: literature.length,
      upserted: hints.length,
      open,
      rejected,
      hints: finalHints,
      diagnostics: [],
    };
  }

  upsertTopicGraphNode(record: SynthesisTopicGraphNodeRecord) {
    this.initialize();
    const topicId = cleanString(record.topicId);
    if (!topicId) {
      throw new Error("topicId must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_topic_graph_node (
          topic_id,
          title,
          aliases_json,
          node_type,
          definition_status,
          current_artifact_path,
          is_root,
          level,
          paper_count,
          last_synthesis_at,
          created_at,
          updated_at
        )
        VALUES (
          @topic_id,
          @title,
          @aliases_json,
          @node_type,
          @definition_status,
          @current_artifact_path,
          @is_root,
          @level,
          @paper_count,
          @last_synthesis_at,
          @created_at,
          @updated_at
        )
      `,
      {
        topic_id: topicId,
        title: cleanString(record.title) || topicId,
        aliases_json: cleanString(record.aliasesJson) || "[]",
        node_type: cleanString(record.nodeType) || "placeholder",
        definition_status: cleanString(record.definitionStatus),
        current_artifact_path: cleanString(record.currentArtifactPath),
        is_root: record.isRoot ? 1 : 0,
        level: cleanString(record.level),
        paper_count: Math.max(0, Math.floor(Number(record.paperCount) || 0)),
        last_synthesis_at: cleanString(record.lastSynthesisAt),
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  upsertTopicGraphEdge(record: SynthesisTopicGraphEdgeRecord) {
    this.initialize();
    const edgeId = cleanString(record.edgeId);
    const sourceTopicId = cleanString(record.sourceTopicId);
    const targetTopicId = cleanString(record.targetTopicId);
    const relation = cleanString(record.relation);
    if (!edgeId || !sourceTopicId || !targetTopicId || !relation) {
      throw new Error(
        "edgeId, sourceTopicId, targetTopicId, and relation must be non-empty",
      );
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_topic_graph_edge (
          edge_id,
          source_topic_id,
          target_topic_id,
          relation,
          status,
          confidence,
          provenance_json,
          evidence_refs_json,
          created_at,
          updated_at
        )
        VALUES (
          @edge_id,
          @source_topic_id,
          @target_topic_id,
          @relation,
          @status,
          @confidence,
          @provenance_json,
          @evidence_refs_json,
          @created_at,
          @updated_at
        )
      `,
      {
        edge_id: edgeId,
        source_topic_id: sourceTopicId,
        target_topic_id: targetTopicId,
        relation,
        status: cleanString(record.status) || "suggested",
        confidence:
          record.confidence === undefined || record.confidence === null
            ? null
            : Number(record.confidence),
        provenance_json: cleanString(record.provenanceJson) || "[]",
        evidence_refs_json: cleanString(record.evidenceRefsJson) || "[]",
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  upsertTopicGraphReviewItem(record: SynthesisTopicGraphReviewItemRecord) {
    this.initialize();
    const reviewId = cleanString(record.reviewId);
    const sourceTopicId = cleanString(record.sourceTopicId);
    const targetTopicId = cleanString(record.targetTopicId);
    const relation = cleanString(record.relation);
    if (!reviewId || !sourceTopicId || !targetTopicId || !relation) {
      throw new Error(
        "reviewId, sourceTopicId, targetTopicId, and relation must be non-empty",
      );
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_topic_graph_review_item (
          review_id,
          status,
          source_topic_id,
          target_topic_id,
          target_title,
          relation,
          confidence,
          provenance_json,
          evidence_refs_json,
          created_at,
          updated_at,
          resolved_at
        )
        VALUES (
          @review_id,
          @status,
          @source_topic_id,
          @target_topic_id,
          @target_title,
          @relation,
          @confidence,
          @provenance_json,
          @evidence_refs_json,
          @created_at,
          @updated_at,
          @resolved_at
        )
      `,
      {
        review_id: reviewId,
        status: cleanString(record.status) || "open",
        source_topic_id: sourceTopicId,
        target_topic_id: targetTopicId,
        target_title: cleanString(record.targetTitle),
        relation,
        confidence:
          record.confidence === undefined || record.confidence === null
            ? null
            : Number(record.confidence),
        provenance_json: cleanString(record.provenanceJson) || "[]",
        evidence_refs_json: cleanString(record.evidenceRefsJson) || "[]",
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
        resolved_at: cleanString(record.resolvedAt),
      },
    );
  }

  replaceTopicGraphState(args: {
    nodes: SynthesisTopicGraphNodeRecord[];
    edges: SynthesisTopicGraphEdgeRecord[];
    reviewItems: SynthesisTopicGraphReviewItemRecord[];
  }) {
    this.transaction(() => {
      this.db.run("DELETE FROM synt_topic_graph_node");
      this.db.run("DELETE FROM synt_topic_graph_edge");
      this.db.run("DELETE FROM synt_topic_graph_review_item");
      for (const node of args.nodes) {
        this.upsertTopicGraphNode(node);
      }
      for (const edge of args.edges) {
        this.upsertTopicGraphEdge(edge);
      }
      for (const reviewItem of args.reviewItems) {
        this.upsertTopicGraphReviewItem(reviewItem);
      }
    });
  }

  listTopicGraphNodes(args: { topicIds?: string[] } = {}) {
    this.initialize();
    const topicIds = new Set(
      (args.topicIds || []).map(cleanString).filter(Boolean),
    );
    return this.db
      .all("SELECT * FROM synt_topic_graph_node")
      .map(rowToTopicGraphNode)
      .filter((row) => !topicIds.size || topicIds.has(row.topicId))
      .sort((left, right) => left.topicId.localeCompare(right.topicId));
  }

  listTopicGraphEdges(
    args: {
      sourceTopicIds?: string[];
      targetTopicIds?: string[];
      statuses?: string[];
      relations?: string[];
    } = {},
  ) {
    this.initialize();
    const sourceTopicIds = new Set(
      (args.sourceTopicIds || []).map(cleanString).filter(Boolean),
    );
    const targetTopicIds = new Set(
      (args.targetTopicIds || []).map(cleanString).filter(Boolean),
    );
    const statuses = new Set(
      (args.statuses || []).map(cleanString).filter(Boolean),
    );
    const relations = new Set(
      (args.relations || []).map(cleanString).filter(Boolean),
    );
    return this.db
      .all("SELECT * FROM synt_topic_graph_edge")
      .map(rowToTopicGraphEdge)
      .filter(
        (row) => !sourceTopicIds.size || sourceTopicIds.has(row.sourceTopicId),
      )
      .filter(
        (row) => !targetTopicIds.size || targetTopicIds.has(row.targetTopicId),
      )
      .filter((row) => !statuses.size || statuses.has(row.status))
      .filter((row) => !relations.size || relations.has(row.relation))
      .sort(
        (left, right) =>
          left.sourceTopicId.localeCompare(right.sourceTopicId) ||
          left.targetTopicId.localeCompare(right.targetTopicId) ||
          left.relation.localeCompare(right.relation),
      );
  }

  listTopicGraphReviewItems(args: { statuses?: string[] } = {}) {
    this.initialize();
    const statuses = new Set(
      (args.statuses || []).map(cleanString).filter(Boolean),
    );
    return this.db
      .all("SELECT * FROM synt_topic_graph_review_item")
      .map(rowToTopicGraphReviewItem)
      .filter((row) => !statuses.size || statuses.has(row.status))
      .sort(
        (left, right) =>
          left.status.localeCompare(right.status) ||
          left.reviewId.localeCompare(right.reviewId),
      );
  }

  upsertConcept(record: SynthesisConceptRecord) {
    this.initialize();
    const conceptId = cleanString(record.conceptId);
    if (!conceptId) {
      throw new Error("conceptId must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_concept (
          concept_id,
          label,
          aliases_json,
          concept_type,
          domain,
          status,
          short_definition,
          definition,
          usage_note,
          editorial_note,
          sense_ids_json,
          created_at,
          updated_at
        )
        VALUES (
          @concept_id,
          @label,
          @aliases_json,
          @concept_type,
          @domain,
          @status,
          @short_definition,
          @definition,
          @usage_note,
          @editorial_note,
          @sense_ids_json,
          @created_at,
          @updated_at
        )
      `,
      {
        concept_id: conceptId,
        label: cleanString(record.label) || conceptId,
        aliases_json: cleanString(record.aliasesJson) || "[]",
        concept_type: cleanString(record.conceptType) || "concept",
        domain: cleanString(record.domain) || "general",
        status: cleanString(record.status) || "active",
        short_definition: cleanString(record.shortDefinition),
        definition: cleanString(record.definition),
        usage_note: cleanString(record.usageNote),
        editorial_note: cleanString(record.editorialNote),
        sense_ids_json: cleanString(record.senseIdsJson) || "[]",
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  upsertConceptSense(record: SynthesisConceptSenseRecord) {
    this.initialize();
    const senseId = cleanString(record.senseId);
    const conceptId = cleanString(record.conceptId);
    if (!senseId || !conceptId) {
      throw new Error("senseId and conceptId must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_concept_sense (
          sense_id,
          concept_id,
          label,
          aliases_json,
          domain,
          short_definition,
          definition,
          disambiguation,
          topic_relevance,
          confidence,
          source_topic_ids_json,
          evidence_json,
          created_at,
          updated_at
        )
        VALUES (
          @sense_id,
          @concept_id,
          @label,
          @aliases_json,
          @domain,
          @short_definition,
          @definition,
          @disambiguation,
          @topic_relevance,
          @confidence,
          @source_topic_ids_json,
          @evidence_json,
          @created_at,
          @updated_at
        )
      `,
      {
        sense_id: senseId,
        concept_id: conceptId,
        label: cleanString(record.label) || senseId,
        aliases_json: cleanString(record.aliasesJson) || "[]",
        domain: cleanString(record.domain) || "general",
        short_definition: cleanString(record.shortDefinition),
        definition: cleanString(record.definition),
        disambiguation: cleanString(record.disambiguation),
        topic_relevance: cleanString(record.topicRelevance),
        confidence: cleanString(record.confidence) || "medium",
        source_topic_ids_json: cleanString(record.sourceTopicIdsJson) || "[]",
        evidence_json: cleanString(record.evidenceJson) || "[]",
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  upsertConceptAlias(record: SynthesisConceptAliasRecord) {
    this.initialize();
    const aliasId = cleanString(record.aliasId);
    const conceptId = cleanString(record.conceptId);
    if (!aliasId || !conceptId) {
      throw new Error("aliasId and conceptId must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_concept_alias (
          alias_id,
          alias,
          normalized,
          concept_id,
          sense_id,
          status,
          confidence,
          created_at,
          updated_at
        )
        VALUES (
          @alias_id,
          @alias,
          @normalized,
          @concept_id,
          @sense_id,
          @status,
          @confidence,
          @created_at,
          @updated_at
        )
      `,
      {
        alias_id: aliasId,
        alias: cleanString(record.alias) || aliasId,
        normalized: cleanString(record.normalized),
        concept_id: conceptId,
        sense_id: cleanString(record.senseId),
        status: cleanString(record.status) || "active",
        confidence: cleanString(record.confidence) || "medium",
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  upsertConceptRelation(record: SynthesisConceptRelationRecord) {
    this.initialize();
    const relationId = cleanString(record.relationId);
    const sourceConceptId = cleanString(record.sourceConceptId);
    const targetConceptId = cleanString(record.targetConceptId);
    const relation = cleanString(record.relation);
    if (!relationId || !sourceConceptId || !targetConceptId || !relation) {
      throw new Error(
        "relationId, sourceConceptId, targetConceptId, and relation must be non-empty",
      );
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_concept_relation (
          relation_id,
          source_concept_id,
          target_concept_id,
          relation,
          status,
          confidence,
          provenance_json,
          created_at,
          updated_at
        )
        VALUES (
          @relation_id,
          @source_concept_id,
          @target_concept_id,
          @relation,
          @status,
          @confidence,
          @provenance_json,
          @created_at,
          @updated_at
        )
      `,
      {
        relation_id: relationId,
        source_concept_id: sourceConceptId,
        target_concept_id: targetConceptId,
        relation,
        status: cleanString(record.status) || "suggested",
        confidence: cleanString(record.confidence) || "medium",
        provenance_json: cleanString(record.provenanceJson) || "[]",
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  upsertConceptReviewItem(record: SynthesisConceptReviewItemRecord) {
    this.initialize();
    const reviewId = cleanString(record.reviewId);
    const topicId = cleanString(record.topicId);
    if (!reviewId || !topicId) {
      throw new Error("reviewId and topicId must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_concept_review_item (
          review_id,
          status,
          reason,
          topic_id,
          topic_path_id,
          label,
          confidence,
          candidate_concept_ids_json,
          proposal_json,
          target_concept_id,
          created_at,
          updated_at,
          resolved_at
        )
        VALUES (
          @review_id,
          @status,
          @reason,
          @topic_id,
          @topic_path_id,
          @label,
          @confidence,
          @candidate_concept_ids_json,
          @proposal_json,
          @target_concept_id,
          @created_at,
          @updated_at,
          @resolved_at
        )
      `,
      {
        review_id: reviewId,
        status: cleanString(record.status) || "open",
        reason: cleanString(record.reason),
        topic_id: topicId,
        topic_path_id: cleanString(record.topicPathId),
        label: cleanString(record.label),
        confidence: cleanString(record.confidence) || "medium",
        candidate_concept_ids_json:
          cleanString(record.candidateConceptIdsJson) || "[]",
        proposal_json: cleanString(record.proposalJson) || "{}",
        target_concept_id: cleanString(record.targetConceptId),
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
        resolved_at: cleanString(record.resolvedAt),
      },
    );
  }

  upsertTopicConceptLink(record: SynthesisTopicConceptLinkRecord) {
    this.initialize();
    const topicId = cleanString(record.topicId);
    const conceptId = cleanString(record.conceptId);
    const senseId = cleanString(record.senseId);
    if (!topicId || !conceptId || !senseId) {
      throw new Error("topicId, conceptId, and senseId must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_topic_concept_link (
          topic_id,
          concept_id,
          sense_id,
          label,
          relevance,
          confidence,
          source,
          created_at,
          updated_at
        )
        VALUES (
          @topic_id,
          @concept_id,
          @sense_id,
          @label,
          @relevance,
          @confidence,
          @source,
          @created_at,
          @updated_at
        )
      `,
      {
        topic_id: topicId,
        concept_id: conceptId,
        sense_id: senseId,
        label: cleanString(record.label),
        relevance: cleanString(record.relevance),
        confidence: cleanString(record.confidence) || "medium",
        source: cleanString(record.source) || "topic_synthesis_concept_cards",
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  replaceConceptKbState(args: {
    concepts: SynthesisConceptRecord[];
    senses: SynthesisConceptSenseRecord[];
    aliases: SynthesisConceptAliasRecord[];
    relations: SynthesisConceptRelationRecord[];
    reviewItems: SynthesisConceptReviewItemRecord[];
    topicLinks: SynthesisTopicConceptLinkRecord[];
  }) {
    this.transaction(() => {
      this.db.run("DELETE FROM synt_topic_concept_link");
      this.db.run("DELETE FROM synt_concept_review_item");
      this.db.run("DELETE FROM synt_concept_relation");
      this.db.run("DELETE FROM synt_concept_alias");
      this.db.run("DELETE FROM synt_concept_sense");
      this.db.run("DELETE FROM synt_concept");
      for (const concept of args.concepts) {
        this.upsertConcept(concept);
      }
      for (const sense of args.senses) {
        this.upsertConceptSense(sense);
      }
      for (const alias of args.aliases) {
        this.upsertConceptAlias(alias);
      }
      for (const relation of args.relations) {
        this.upsertConceptRelation(relation);
      }
      for (const reviewItem of args.reviewItems) {
        this.upsertConceptReviewItem(reviewItem);
      }
      for (const topicLink of args.topicLinks) {
        this.upsertTopicConceptLink(topicLink);
      }
    });
  }

  listConcepts(args: { conceptIds?: string[] } = {}) {
    this.initialize();
    const conceptIds = new Set(
      (args.conceptIds || []).map(cleanString).filter(Boolean),
    );
    return this.db
      .all("SELECT * FROM synt_concept")
      .map(rowToConcept)
      .filter((row) => !conceptIds.size || conceptIds.has(row.conceptId))
      .sort(
        (left, right) =>
          left.label.localeCompare(right.label) ||
          left.conceptId.localeCompare(right.conceptId),
      );
  }

  listConceptSenses(args: { conceptIds?: string[] } = {}) {
    this.initialize();
    const conceptIds = new Set(
      (args.conceptIds || []).map(cleanString).filter(Boolean),
    );
    return this.db
      .all("SELECT * FROM synt_concept_sense")
      .map(rowToConceptSense)
      .filter((row) => !conceptIds.size || conceptIds.has(row.conceptId))
      .sort(
        (left, right) =>
          left.label.localeCompare(right.label) ||
          left.senseId.localeCompare(right.senseId),
      );
  }

  listConceptAliases(args: { conceptIds?: string[] } = {}) {
    this.initialize();
    const conceptIds = new Set(
      (args.conceptIds || []).map(cleanString).filter(Boolean),
    );
    return this.db
      .all("SELECT * FROM synt_concept_alias")
      .map(rowToConceptAlias)
      .filter((row) => !conceptIds.size || conceptIds.has(row.conceptId))
      .sort(
        (left, right) =>
          left.normalized.localeCompare(right.normalized) ||
          left.aliasId.localeCompare(right.aliasId),
      );
  }

  listConceptRelations(args: { statuses?: string[] } = {}) {
    this.initialize();
    const statuses = new Set(
      (args.statuses || []).map(cleanString).filter(Boolean),
    );
    return this.db
      .all("SELECT * FROM synt_concept_relation")
      .map(rowToConceptRelation)
      .filter((row) => !statuses.size || statuses.has(row.status))
      .sort((left, right) => left.relationId.localeCompare(right.relationId));
  }

  listConceptReviewItems(args: { statuses?: string[] } = {}) {
    this.initialize();
    const statuses = new Set(
      (args.statuses || []).map(cleanString).filter(Boolean),
    );
    return this.db
      .all("SELECT * FROM synt_concept_review_item")
      .map(rowToConceptReviewItem)
      .filter((row) => !statuses.size || statuses.has(row.status))
      .sort(
        (left, right) =>
          left.status.localeCompare(right.status) ||
          left.label.localeCompare(right.label) ||
          left.reviewId.localeCompare(right.reviewId),
      );
  }

  listTopicConceptLinks(args: { topicIds?: string[] } = {}) {
    this.initialize();
    const topicIds = new Set(
      (args.topicIds || []).map(cleanString).filter(Boolean),
    );
    return this.db
      .all("SELECT * FROM synt_topic_concept_link")
      .map(rowToTopicConceptLink)
      .filter((row) => !topicIds.size || topicIds.has(row.topicId))
      .sort(
        (left, right) =>
          left.topicId.localeCompare(right.topicId) ||
          left.label.localeCompare(right.label) ||
          left.conceptId.localeCompare(right.conceptId) ||
          left.senseId.localeCompare(right.senseId),
      );
  }

  upsertTagVocabularyEntry(record: SynthesisTagVocabularyEntryRecord) {
    this.initialize();
    const tag = cleanString(record.tag);
    if (!tag) {
      throw new Error("tag must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_tag_vocabulary_entry (
          tag,
          facet,
          note,
          source,
          deprecated,
          replacement,
          aliases_json,
          abbrev_json,
          usage_count,
          last_synced_at,
          created_at,
          updated_at
        )
        VALUES (
          @tag,
          @facet,
          @note,
          @source,
          @deprecated,
          @replacement,
          @aliases_json,
          @abbrev_json,
          @usage_count,
          @last_synced_at,
          @created_at,
          @updated_at
        )
      `,
      {
        tag,
        facet: cleanString(record.facet),
        note: cleanString(record.note),
        source: cleanString(record.source),
        deprecated: record.deprecated ? 1 : 0,
        replacement: cleanString(record.replacement),
        aliases_json: cleanString(record.aliasesJson) || "[]",
        abbrev_json: cleanString(record.abbrevJson) || "[]",
        usage_count: Math.max(0, Math.floor(Number(record.usageCount) || 0)),
        last_synced_at: cleanString(record.lastSyncedAt),
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  upsertTagAlias(record: SynthesisTagAliasRecord) {
    this.initialize();
    const alias = cleanString(record.alias);
    const tag = cleanString(record.tag);
    if (!alias || !tag) {
      throw new Error("alias and tag must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_tag_alias (
          alias,
          tag,
          created_at,
          updated_at
        )
        VALUES (
          @alias,
          @tag,
          @created_at,
          @updated_at
        )
      `,
      {
        alias,
        tag,
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  upsertTagAbbrev(record: SynthesisTagAbbrevRecord) {
    this.initialize();
    const abbrevKey = cleanString(record.abbrevKey);
    const abbrevValue = cleanString(record.abbrevValue);
    if (!abbrevKey || !abbrevValue) {
      throw new Error("abbrevKey and abbrevValue must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_tag_abbrev (
          abbrev_key,
          abbrev_value,
          created_at,
          updated_at
        )
        VALUES (
          @abbrev_key,
          @abbrev_value,
          @created_at,
          @updated_at
        )
      `,
      {
        abbrev_key: abbrevKey,
        abbrev_value: abbrevValue,
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  upsertTagProtocol(record: SynthesisTagProtocolRecord) {
    this.initialize();
    const protocolId = cleanString(record.protocolId) || "default";
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_tag_protocol (
          protocol_id,
          version,
          tag_pattern,
          max_tag_length,
          facets_json,
          updated_at
        )
        VALUES (
          @protocol_id,
          @version,
          @tag_pattern,
          @max_tag_length,
          @facets_json,
          @updated_at
        )
      `,
      {
        protocol_id: protocolId,
        version: cleanString(record.version) || "1.0.0",
        tag_pattern: cleanString(record.tagPattern),
        max_tag_length: Math.max(
          1,
          Math.floor(Number(record.maxTagLength) || 120),
        ),
        facets_json: cleanString(record.facetsJson) || "[]",
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  upsertTagValidationWarning(record: SynthesisTagValidationWarningRecord) {
    this.initialize();
    const warningId = cleanString(record.warningId);
    if (!warningId) {
      throw new Error("warningId must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_tag_validation_warning (
          warning_id,
          code,
          severity,
          tag,
          message,
          created_at,
          updated_at
        )
        VALUES (
          @warning_id,
          @code,
          @severity,
          @tag,
          @message,
          @created_at,
          @updated_at
        )
      `,
      {
        warning_id: warningId,
        code: cleanString(record.code),
        severity: cleanString(record.severity) || "warning",
        tag: cleanString(record.tag),
        message: cleanString(record.message),
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  replaceTagVocabularyState(args: {
    entries: SynthesisTagVocabularyEntryRecord[];
    aliases: SynthesisTagAliasRecord[];
    abbrevs: SynthesisTagAbbrevRecord[];
    protocol: SynthesisTagProtocolRecord;
    validationWarnings: SynthesisTagValidationWarningRecord[];
  }) {
    this.transaction(() => {
      this.db.run("DELETE FROM synt_tag_validation_warning");
      this.db.run("DELETE FROM synt_tag_protocol");
      this.db.run("DELETE FROM synt_tag_abbrev");
      this.db.run("DELETE FROM synt_tag_alias");
      this.db.run("DELETE FROM synt_tag_vocabulary_entry");
      for (const entry of args.entries) {
        this.upsertTagVocabularyEntry(entry);
      }
      for (const alias of args.aliases) {
        this.upsertTagAlias(alias);
      }
      for (const abbrev of args.abbrevs) {
        this.upsertTagAbbrev(abbrev);
      }
      this.upsertTagProtocol(args.protocol);
      for (const warning of args.validationWarnings) {
        this.upsertTagValidationWarning(warning);
      }
    });
  }

  listTagVocabularyEntries(args: { tags?: string[] } = {}) {
    this.initialize();
    const tags = new Set((args.tags || []).map(cleanString).filter(Boolean));
    return this.db
      .all("SELECT * FROM synt_tag_vocabulary_entry")
      .map(rowToTagVocabularyEntry)
      .filter((row) => !tags.size || tags.has(row.tag))
      .sort(
        (left, right) =>
          left.facet.localeCompare(right.facet) ||
          left.tag.localeCompare(right.tag, "en", { sensitivity: "base" }),
      );
  }

  listTagAliases() {
    this.initialize();
    return this.db
      .all("SELECT * FROM synt_tag_alias")
      .map(rowToTagAlias)
      .sort((left, right) => left.alias.localeCompare(right.alias));
  }

  listTagAbbrevs() {
    this.initialize();
    return this.db
      .all("SELECT * FROM synt_tag_abbrev")
      .map(rowToTagAbbrev)
      .sort((left, right) => left.abbrevKey.localeCompare(right.abbrevKey));
  }

  getTagProtocol(protocolId = "default") {
    this.initialize();
    const id = cleanString(protocolId) || "default";
    return (
      this.db
        .all("SELECT * FROM synt_tag_protocol")
        .map(rowToTagProtocol)
        .find((row) => row.protocolId === id) || null
    );
  }

  listTagValidationWarnings() {
    this.initialize();
    return this.db
      .all("SELECT * FROM synt_tag_validation_warning")
      .map(rowToTagValidationWarning)
      .sort(
        (left, right) =>
          left.severity.localeCompare(right.severity) ||
          left.code.localeCompare(right.code) ||
          cleanString(left.tag).localeCompare(cleanString(right.tag)),
      );
  }

  listReviewItems(
    args: { statuses?: string[]; reviewKind?: string; limit?: number } = {},
  ) {
    this.initialize();
    const statuses = new Set(
      (args.statuses || []).map(cleanString).filter(Boolean),
    );
    const reviewKind = cleanString(args.reviewKind);
    const limit = Math.max(0, Math.floor(Number(args.limit) || 0));
    const clauses: string[] = [];
    const params: SqlParams = {};
    appendInFilter(clauses, params, "status", "review_status", statuses);
    if (reviewKind) {
      clauses.push("review_kind = @review_kind");
      params.review_kind = reviewKind;
    }
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const limitSql = appendLimitClause(params, limit);
    return this.db
      .all(
        `
          SELECT *
          FROM synt_review_item
          ${where}
          ORDER BY priority ASC, updated_at ASC, review_item_id ASC
          ${limitSql}
        `,
        params,
      )
      .map(rowToReviewItem)
      .filter((row) => !reviewKind || row.reviewKind === reviewKind)
      .filter((row) => !statuses.size || statuses.has(row.status))
      .slice(0, limit || Number.POSITIVE_INFINITY);
  }

  markCitationGraphCacheStale(args: {
    transactionId: string;
    sourceRef?: string;
    rawReferenceIds?: string[];
    diagnostics?: SynthesisReviewActionDiagnostic[];
    timestamp: string;
  }): SynthesisReviewActionCacheEffect[] {
    const referenceScopes = uniqueCleanStrings(
      args.rawReferenceIds || [],
    ).map((rawReferenceId) => ({
      scopeKind: "raw_reference",
      scopeRef: rawReferenceId,
    }));
    const scopes = referenceScopes.length
      ? referenceScopes
      : uniqueCleanStrings([args.sourceRef]).map((sourceRef) => ({
          scopeKind: "source_ref",
          scopeRef: sourceRef,
        }));
    const effects: SynthesisReviewActionCacheEffect[] = [];
    for (const scope of scopes) {
      const cacheKey = `citation-graph:${scope.scopeKind}:${scope.scopeRef}`;
      this.upsertCacheBasis({
        cacheKey,
        cacheKind: "citation_graph",
        scopeKind: scope.scopeKind,
        scopeRef: scope.scopeRef,
        status: "stale",
        basisKind: "review_action",
        basisValue: args.transactionId,
        staleReason: "reference_or_binding_review_changed",
        diagnosticsJson: JSON.stringify([
          ...(args.diagnostics || []),
          actionDiagnostic({
            code: "citation_graph_cache_stale",
            message:
              "Citation graph cache should be refreshed explicitly for this bounded scope.",
            details: {
              scope_kind: scope.scopeKind,
              scope_ref: scope.scopeRef,
              transaction_id: args.transactionId,
            },
          }),
        ]),
        updatedAt: args.timestamp,
      });
      effects.push({
        cacheKey,
        cacheKind: "citation_graph",
        scopeKind: scope.scopeKind,
        scopeRef: scope.scopeRef,
      });
    }
    return effects;
  }
  countRows(tableName: SynthesisRepositoryTableName) {
    this.initialize();
    return Math.max(
      0,
      Math.floor(
        Number(
          this.db.get(`SELECT COUNT(*) AS value FROM ${tableName}`)?.value || 0,
        ),
      ),
    );
  }

  getSchemaVersion() {
    this.initialize();
    const row = this.db.get(
      `
        SELECT value
        FROM synt_schema_meta
        WHERE key=@meta_key
        LIMIT 1
      `,
      {
        meta_key: "schema_version",
      },
    );
    return cleanString(row?.value);
  }
}

export function createSynthesisRepository(
  options: SynthesisRepositoryOptions = {},
) {
  return new SynthesisRepository(options);
}

export function getDefaultSynthesisRepository() {
  if (!defaultRepository) {
    defaultRepository = createSynthesisRepository();
  }
  return defaultRepository;
}

export function resetDefaultSynthesisRepositoryForTests() {
  defaultRepository = null;
}
