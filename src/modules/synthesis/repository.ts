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

export type SynthesisLiteratureItemRecord = {
  literatureItemId: string;
  displayTitle: string;
  normalizedTitle: string;
  titleNormalizerVersion: string;
  year?: string;
  venue?: string;
  authorsJson?: string;
  status?: string;
  createdFrom?: string;
  confidence?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisLiteratureIdentifierRecord = {
  literatureItemId: string;
  kind: string;
  normalizedValue: string;
  displayValue?: string;
  source?: string;
  confidence?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisZoteroBindingRecord = {
  libraryId: number;
  itemKey: string;
  literatureItemId: string;
  itemType?: string;
  bindingStatus?: string;
  dateAdded?: string;
  deletedAt?: string;
  tagsJson?: string;
  collectionsJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisLiteratureRedirectRecord = {
  redirectId: string;
  fromLiteratureItemId: string;
  toLiteratureItemId: string;
  reason: string;
  diagnosticsJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisArtifactStateRecord = {
  literatureItemId: string;
  artifactType: string;
  status: string;
  payloadHash?: string;
  noteKey?: string;
  diagnosticsJson?: string;
  updatedAt?: string;
};

export type SynthesisReferenceInstanceRecord = {
  referenceInstanceId: string;
  sourceLiteratureItemId: string;
  referenceIndex: number;
  parsedTitle?: string;
  normalizedTitle?: string;
  year?: string;
  authorsJson?: string;
  rawReference?: string;
  rawReferenceHash?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisReferenceResolutionRecord = {
  resolutionId: string;
  referenceInstanceId: string;
  sourceLiteratureItemId: string;
  targetLiteratureItemId?: string;
  status: string;
  confidence?: string;
  diagnosticsJson?: string;
  createdAt?: string;
  updatedAt?: string;
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

export type SynthesisDirtyEventRecord = {
  eventId: string;
  libraryId?: number;
  eventType: string;
  source?: string;
  scopeKind?: string;
  scopeRef?: string;
  sourceHash?: string;
  status?: string;
  attemptCount?: number;
  coalescedCount?: number;
  nextRetryAt?: string;
  diagnosticsJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisJobProgressStatus =
  | "idle"
  | "queued"
  | "running"
  | "waiting"
  | "completed"
  | "failed_retryable"
  | "failed_terminal";

export type SynthesisJobProgressMode = "determinate" | "indeterminate";

export type SynthesisJobProgressRecord = {
  jobName: string;
  runId?: string;
  source?: string;
  label?: string;
  status?: SynthesisJobProgressStatus;
  phase?: string;
  phaseLabel?: string;
  message?: string;
  queueWaitMs?: number;
  timeBudgetMs?: number;
  batchLimit?: number;
  processedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  totalCount?: number;
  retryAttempt?: number;
  nextRetryAt?: string;
  diagnosticsJson?: string;
  progressMode?: SynthesisJobProgressMode;
  progressJson?: string;
  startedAt?: string;
  completedAt?: string;
  heartbeatAt?: string;
  updatedAt?: string;
};

export type SynthesisReviewActionDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  details?: Record<string, unknown>;
};

export type SynthesisReviewActionDirtyEffect = {
  eventId: string;
  eventType: string;
  scopeKind: string;
  scopeRef: string;
};

export type SynthesisReviewActionIndexSummary = {
  affectedLiteratureItemIds: string[];
  affectedReferenceInstanceIds: string[];
  affectedReviewItemIds: string[];
  affectedArtifactLiteratureItemIds: string[];
};

export type SynthesisIndexReviewActionResult = {
  transactionId: string;
  reviewItemId: string;
  action: string;
  literatureItemId: string;
  targetLiteratureItemId?: string;
  indexSummary: SynthesisReviewActionIndexSummary;
  graphDirtyEffects: SynthesisReviewActionDirtyEffect[];
  dirtyEventIds: string[];
  diagnostics: SynthesisReviewActionDiagnostic[];
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

export type SynthesisCitationGraphStateReplacement = {
  nodes: SynthesisCitationNodeRecord[];
  edges?: SynthesisCitationEdgeRecord[];
  sourceOwnership?: SynthesisCitationSourceOwnershipRecord[];
  incomingGroups?: SynthesisCitationIncomingGroupRecord[];
  lightweightMetrics?: SynthesisCitationLightMetricsRecord[];
  complexMetrics?: SynthesisCitationComplexMetricsRecord[];
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
  filtered: number;
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

type InternalReviewActionEffect = {
  affectedLiteratureItemIds?: string[];
  affectedReferenceInstanceIds?: string[];
  affectedReviewItemIds?: string[];
  affectedArtifactLiteratureItemIds?: string[];
  diagnostics?: SynthesisReviewActionDiagnostic[];
};

export type SynthesisIndexStateReplacement = {
  literatureItems: SynthesisLiteratureItemRecord[];
  identifiers?: SynthesisLiteratureIdentifierRecord[];
  zoteroBindings?: SynthesisZoteroBindingRecord[];
  redirects?: SynthesisLiteratureRedirectRecord[];
  artifactStates?: SynthesisArtifactStateRecord[];
  referenceInstances?: SynthesisReferenceInstanceRecord[];
  referenceResolutions?: SynthesisReferenceResolutionRecord[];
  reviewItems?: SynthesisReviewItemRecord[];
};

export type SynthesisDiscoveryMetadataStateReplacement = {
  literatureMatchingMetadata?: SynthesisLiteratureMatchingMetadataRecord[];
  topicInterestMetadata?: SynthesisTopicInterestMetadataRecord[];
  topicDiscoveryHints?: SynthesisTopicDiscoveryHintRecord[];
};

export type SynthesisPaperRegistryFact = {
  literatureItemId: string;
  displayTitle: string;
  year?: string;
  authorsJson?: string;
  libraryId: number;
  itemKey: string;
  itemType?: string;
  dateAdded?: string;
  tagsJson?: string;
  collectionsJson?: string;
  identifiers: SynthesisLiteratureIdentifierRecord[];
  artifacts: SynthesisArtifactStateRecord[];
};

export type SynthesisPaperRegistryFactPage = {
  entries: SynthesisPaperRegistryFact[];
  cursor: number;
  nextCursor: number | null;
  hasMore: boolean;
  returned: number;
  total: number;
  limit: number;
};

export type SynthesisIndexReferenceFact = {
  referenceInstanceId: string;
  sourceLiteratureItemId: string;
  referenceIndex: number;
  title?: string;
  rawReference?: string;
  year?: string;
  authorsJson?: string;
  resolutionId?: string;
  resolutionStatus: string;
  confidence?: string;
  targetLiteratureItemId?: string;
  targetTitle?: string;
  targetYear?: string;
  targetHasZoteroBinding: boolean;
  targetPaperRef?: string;
};

export type SynthesisRepositoryTableName =
  | "synt_literature_item"
  | "synt_literature_identifier"
  | "synt_zotero_binding"
  | "synt_literature_redirect"
  | "synt_artifact_state"
  | "synt_reference_instance"
  | "synt_reference_resolution"
  | "synt_citation_node"
  | "synt_citation_edge"
  | "synt_citation_source_ownership"
  | "synt_citation_incoming_group"
  | "synt_citation_metrics_light"
  | "synt_citation_metrics_complex"
  | "synt_citation_layout_state"
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
  | "synt_dirty_event"
  | "synt_job_state";

export type SynthesisRepositoryOptions = {
  runtimeRoot?: string;
  now?: () => string;
  adapter?: SqlAdapter;
};

const SCHEMA_VERSION = "2026-05-29.phase7-workbench-db-ui";
const DEFAULT_PAGE_LIMIT = 100;
const MAX_PAGE_LIMIT = 250;
const SYNTHESIS_RESET_TABLES: SynthesisRepositoryTableName[] = [
  "synt_job_state",
  "synt_dirty_event",
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
  "synt_citation_incoming_group",
  "synt_citation_source_ownership",
  "synt_citation_edge",
  "synt_citation_node",
  "synt_reference_resolution",
  "synt_reference_instance",
  "synt_artifact_state",
  "synt_literature_redirect",
  "synt_zotero_binding",
  "synt_literature_identifier",
  "synt_literature_item",
];

export const SYNTHESIS_REPOSITORY_TABLES: SynthesisRepositoryTableName[] = [
  "synt_literature_item",
  "synt_literature_identifier",
  "synt_zotero_binding",
  "synt_literature_redirect",
  "synt_artifact_state",
  "synt_reference_instance",
  "synt_reference_resolution",
  "synt_citation_node",
  "synt_citation_edge",
  "synt_citation_source_ownership",
  "synt_citation_incoming_group",
  "synt_citation_metrics_light",
  "synt_citation_metrics_complex",
  "synt_citation_layout_state",
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
  "synt_dirty_event",
  "synt_job_state",
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

function parseJsonObject(value: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(cleanString(value) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
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

function normalizeLiteratureStatus(value: unknown) {
  const normalized = cleanString(value);
  if (
    normalized === "inactive" ||
    normalized === "unavailable" ||
    normalized === "pending_delete_review" ||
    normalized === "tombstoned" ||
    normalized === "purge_eligible" ||
    normalized === "purged"
  ) {
    return normalized;
  }
  return "active";
}

function nonNegativeInt(value: unknown, fallback = 0) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeJobProgressStatus(
  value: unknown,
): SynthesisJobProgressStatus {
  const normalized = cleanString(value);
  if (
    normalized === "queued" ||
    normalized === "running" ||
    normalized === "waiting" ||
    normalized === "completed" ||
    normalized === "failed_retryable" ||
    normalized === "failed_terminal"
  ) {
    return normalized;
  }
  return "idle";
}

function normalizeJobProgressMode(value: unknown): SynthesisJobProgressMode {
  return cleanString(value) === "determinate" ? "determinate" : "indeterminate";
}

function applyOptionalMigration(db: SqlAdapter, sql: string) {
  try {
    db.run(sql);
  } catch {
    // Additive compatibility migration. Existing columns raise duplicate errors.
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
      const statement = conn.createStatement!(sql) as {
        execute?: () => void;
        finalize?: () => void;
      };
      const placeholders = collectNamedPlaceholders(sql);
      try {
        bindParams(statement, sql, params);
        statement.execute?.();
      } catch (error) {
        throw storageError({
          operation: "run.execute",
          sql,
          placeholders,
          params,
          dbPath,
          cause: error,
        });
      } finally {
        statement.finalize?.();
      }
    },
    all(sql, params) {
      const statement = conn.createStatement!(sql) as {
        columnCount?: number;
        executeStep?: () => boolean;
        finalize?: () => void;
        getColumnName?: (index: number) => string;
      };
      const placeholders = collectNamedPlaceholders(sql);
      try {
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
          operation: "all.executeStep",
          sql,
          placeholders,
          params,
          dbPath,
          cause: error,
        });
      } finally {
        statement.finalize?.();
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
  literatureItems: Map<string, Record<string, SqlPrimitive>>;
  identifiers: Map<string, Record<string, SqlPrimitive>>;
  zoteroBindings: Map<string, Record<string, SqlPrimitive>>;
  redirects: Map<string, Record<string, SqlPrimitive>>;
  artifactStates: Map<string, Record<string, SqlPrimitive>>;
  referenceInstances: Map<string, Record<string, SqlPrimitive>>;
  referenceResolutions: Map<string, Record<string, SqlPrimitive>>;
  citationNodes: Map<string, Record<string, SqlPrimitive>>;
  citationEdges: Map<string, Record<string, SqlPrimitive>>;
  citationSourceOwnership: Map<string, Record<string, SqlPrimitive>>;
  citationIncomingGroups: Map<string, Record<string, SqlPrimitive>>;
  citationLightMetrics: Map<string, Record<string, SqlPrimitive>>;
  citationComplexMetrics: Map<string, Record<string, SqlPrimitive>>;
  citationLayoutStates: Map<string, Record<string, SqlPrimitive>>;
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
  dirtyEvents: Map<string, Record<string, SqlPrimitive>>;
  jobStates: Map<string, Record<string, SqlPrimitive>>;
  tables: Set<string>;
  indexes: Set<string>;
};

function cloneMemoryState(state: MemoryState): MemoryState {
  return {
    schemaMeta: new Map(state.schemaMeta),
    literatureItems: new Map(
      Array.from(state.literatureItems.entries()).map(([key, value]) => [
        key,
        { ...value },
      ]),
    ),
    identifiers: cloneMemoryRows(state.identifiers),
    zoteroBindings: cloneMemoryRows(state.zoteroBindings),
    redirects: cloneMemoryRows(state.redirects),
    artifactStates: cloneMemoryRows(state.artifactStates),
    referenceInstances: cloneMemoryRows(state.referenceInstances),
    referenceResolutions: cloneMemoryRows(state.referenceResolutions),
    citationNodes: cloneMemoryRows(state.citationNodes),
    citationEdges: cloneMemoryRows(state.citationEdges),
    citationSourceOwnership: cloneMemoryRows(state.citationSourceOwnership),
    citationIncomingGroups: cloneMemoryRows(state.citationIncomingGroups),
    citationLightMetrics: cloneMemoryRows(state.citationLightMetrics),
    citationComplexMetrics: cloneMemoryRows(state.citationComplexMetrics),
    citationLayoutStates: cloneMemoryRows(state.citationLayoutStates),
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
    dirtyEvents: cloneMemoryRows(state.dirtyEvents),
    jobStates: cloneMemoryRows(state.jobStates),
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
    literatureItems: new Map(),
    identifiers: new Map(),
    zoteroBindings: new Map(),
    redirects: new Map(),
    artifactStates: new Map(),
    referenceInstances: new Map(),
    referenceResolutions: new Map(),
    citationNodes: new Map(),
    citationEdges: new Map(),
    citationSourceOwnership: new Map(),
    citationIncomingGroups: new Map(),
    citationLightMetrics: new Map(),
    citationComplexMetrics: new Map(),
    citationLayoutStates: new Map(),
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
    dirtyEvents: new Map(),
    jobStates: new Map(),
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
      if (normalized.startsWith("delete from synt_job_state")) {
        state.jobStates.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_dirty_event")) {
        state.dirtyEvents.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_literature_identifier")) {
        state.identifiers.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_zotero_binding")) {
        state.zoteroBindings.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_literature_redirect")) {
        state.redirects.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_artifact_state")) {
        state.artifactStates.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_reference_instance")) {
        state.referenceInstances.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_reference_resolution")) {
        state.referenceResolutions.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_citation_node")) {
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
        state.citationLightMetrics.clear();
        return;
      }
      if (normalized.startsWith("delete from synt_citation_metrics_complex")) {
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
      if (normalized.startsWith("delete from synt_literature_item")) {
        state.literatureItems.clear();
        return;
      }
      if (normalized.startsWith("insert or replace into synt_schema_meta")) {
        state.schemaMeta.set(
          cleanString(params.meta_key),
          cleanString(params.meta_value),
        );
        return;
      }
      if (
        normalized.startsWith("insert or replace into synt_literature_item")
      ) {
        const literatureItemId = cleanString(params.literature_item_id);
        if (!literatureItemId) {
          return;
        }
        state.literatureItems.set(literatureItemId, {
          literature_item_id: literatureItemId,
          display_title: cleanString(params.display_title),
          normalized_title: cleanString(params.normalized_title),
          title_normalizer_version: cleanString(
            params.title_normalizer_version,
          ),
          year: cleanString(params.year),
          venue: cleanString(params.venue),
          authors_json: cleanString(params.authors_json),
          status: cleanString(params.status),
          created_from: cleanString(params.created_from),
          confidence: cleanString(params.confidence),
          created_at: cleanString(params.created_at),
          updated_at: cleanString(params.updated_at),
        });
        return;
      }
      if (
        normalized.startsWith(
          "insert or replace into synt_literature_identifier",
        )
      ) {
        const key = [
          cleanString(params.literature_item_id),
          cleanString(params.kind),
          cleanString(params.normalized_value),
        ].join("::");
        state.identifiers.set(key, memoryRow(params));
        return;
      }
      if (normalized.startsWith("insert or replace into synt_zotero_binding")) {
        const key = [
          cleanString(params.library_id),
          cleanString(params.item_key),
        ].join("::");
        state.zoteroBindings.set(key, memoryRow(params));
        return;
      }
      if (
        normalized.startsWith("insert or replace into synt_literature_redirect")
      ) {
        state.redirects.set(cleanString(params.redirect_id), memoryRow(params));
        return;
      }
      if (normalized.startsWith("insert or replace into synt_artifact_state")) {
        const key = [
          cleanString(params.literature_item_id),
          cleanString(params.artifact_type),
        ].join("::");
        state.artifactStates.set(key, memoryRow(params));
        return;
      }
      if (
        normalized.startsWith("insert or replace into synt_reference_instance")
      ) {
        state.referenceInstances.set(
          cleanString(params.reference_instance_id),
          memoryRow(params),
        );
        return;
      }
      if (
        normalized.startsWith(
          "insert or replace into synt_reference_resolution",
        )
      ) {
        state.referenceResolutions.set(
          cleanString(params.resolution_id),
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
      if (normalized.startsWith("insert or replace into synt_dirty_event")) {
        state.dirtyEvents.set(cleanString(params.event_id), memoryRow(params));
        return;
      }
      if (normalized.startsWith("insert or replace into synt_job_state")) {
        state.jobStates.set(cleanString(params.job_name), memoryRow(params));
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
      if (normalized.includes("from synt_literature_item")) {
        const id = cleanString(params.literature_item_id);
        const rows = id
          ? [state.literatureItems.get(id)].filter(
              (row): row is Record<string, SqlPrimitive> => Boolean(row),
            )
          : Array.from(state.literatureItems.values());
        return rows.map((row) => ({ ...row }));
      }
      if (
        normalized.includes("from synt_zotero_binding") &&
        normalized.includes("join synt_literature_item")
      ) {
        return Array.from(state.zoteroBindings.values())
          .map((binding) => {
            const item = state.literatureItems.get(
              cleanString(binding.literature_item_id),
            );
            return item ? { ...item, ...binding } : null;
          })
          .filter((row): row is Record<string, SqlPrimitive> => Boolean(row))
          .sort((left, right) => {
            const library =
              Number(left.library_id || 0) - Number(right.library_id || 0);
            if (library !== 0) {
              return library;
            }
            return cleanString(left.item_key).localeCompare(
              cleanString(right.item_key),
            );
          });
      }
      if (normalized.includes("from synt_literature_identifier")) {
        return Array.from(state.identifiers.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_zotero_binding")) {
        return Array.from(state.zoteroBindings.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_literature_redirect")) {
        return Array.from(state.redirects.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_artifact_state")) {
        return Array.from(state.artifactStates.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_reference_instance")) {
        return Array.from(state.referenceInstances.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_reference_resolution")) {
        return Array.from(state.referenceResolutions.values()).map((row) => ({
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
      if (normalized.includes("from synt_dirty_event")) {
        return Array.from(state.dirtyEvents.values()).map((row) => ({
          ...row,
        }));
      }
      if (normalized.includes("from synt_job_state")) {
        const jobName = cleanString(params.job_name);
        if (jobName) {
          const row = state.jobStates.get(jobName);
          return row ? [{ ...row }] : [];
        }
        return Array.from(state.jobStates.values()).map((row) => ({
          ...row,
        }));
      }
      return [];
    },
    get(sql, params = {}) {
      const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
      const countMatch = normalized.match(
        /^select count\(\*\) as value from (synt_[a-z_]+)/,
      );
      if (countMatch) {
        return { value: memoryTable(state, countMatch[1]).size };
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
): Map<string, Record<string, SqlPrimitive>> {
  switch (name) {
    case "synt_literature_identifier":
      return state.identifiers;
    case "synt_zotero_binding":
      return state.zoteroBindings;
    case "synt_literature_redirect":
      return state.redirects;
    case "synt_artifact_state":
      return state.artifactStates;
    case "synt_reference_instance":
      return state.referenceInstances;
    case "synt_reference_resolution":
      return state.referenceResolutions;
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
    case "synt_dirty_event":
      return state.dirtyEvents;
    case "synt_job_state":
      return state.jobStates;
    case "synt_literature_item":
    default:
      return state.literatureItems;
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
    CREATE TABLE IF NOT EXISTS synt_literature_item (
      literature_item_id TEXT PRIMARY KEY,
      display_title TEXT NOT NULL DEFAULT '',
      normalized_title TEXT NOT NULL DEFAULT '',
      title_normalizer_version TEXT NOT NULL DEFAULT '',
      year TEXT NOT NULL DEFAULT '',
      venue TEXT NOT NULL DEFAULT '',
      authors_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      created_from TEXT NOT NULL DEFAULT '',
      confidence TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_literature_identifier (
      literature_item_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      normalized_value TEXT NOT NULL,
      display_value TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      confidence TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (literature_item_id, kind, normalized_value)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_zotero_binding (
      library_id INTEGER NOT NULL,
      item_key TEXT NOT NULL,
      literature_item_id TEXT NOT NULL,
      item_type TEXT NOT NULL DEFAULT '',
      binding_status TEXT NOT NULL DEFAULT 'active',
      date_added TEXT NOT NULL DEFAULT '',
      deleted_at TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      collections_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (library_id, item_key)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_literature_redirect (
      redirect_id TEXT PRIMARY KEY,
      from_literature_item_id TEXT NOT NULL,
      to_literature_item_id TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  applyOptionalMigration(
    db,
    "ALTER TABLE synt_zotero_binding ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]'",
  );
  applyOptionalMigration(
    db,
    "ALTER TABLE synt_zotero_binding ADD COLUMN collections_json TEXT NOT NULL DEFAULT '[]'",
  );
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_artifact_state (
      literature_item_id TEXT NOT NULL,
      artifact_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'missing',
      payload_hash TEXT NOT NULL DEFAULT '',
      note_key TEXT NOT NULL DEFAULT '',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (literature_item_id, artifact_type)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_reference_instance (
      reference_instance_id TEXT PRIMARY KEY,
      source_literature_item_id TEXT NOT NULL,
      reference_index INTEGER NOT NULL DEFAULT 0,
      parsed_title TEXT NOT NULL DEFAULT '',
      normalized_title TEXT NOT NULL DEFAULT '',
      year TEXT NOT NULL DEFAULT '',
      authors_json TEXT NOT NULL DEFAULT '[]',
      raw_reference TEXT NOT NULL DEFAULT '',
      raw_reference_hash TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_reference_resolution (
      resolution_id TEXT PRIMARY KEY,
      reference_instance_id TEXT NOT NULL,
      source_literature_item_id TEXT NOT NULL,
      target_literature_item_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'unresolved',
      confidence TEXT NOT NULL DEFAULT '',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
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
      edge_status TEXT NOT NULL DEFAULT 'unresolved',
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
      edge_status TEXT NOT NULL DEFAULT 'unresolved',
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
      edge_status TEXT NOT NULL DEFAULT 'unresolved',
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
      preset TEXT NOT NULL DEFAULT 'balanced',
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
    CREATE TABLE IF NOT EXISTS synt_dirty_event (
      event_id TEXT PRIMARY KEY,
      library_id INTEGER NOT NULL DEFAULT 0,
      event_type TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT '',
      scope_kind TEXT NOT NULL DEFAULT '',
      scope_ref TEXT NOT NULL DEFAULT '',
      source_hash TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'queued',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      coalesced_count INTEGER NOT NULL DEFAULT 1,
      next_retry_at TEXT NOT NULL DEFAULT '',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_job_state (
      job_name TEXT PRIMARY KEY,
      run_id TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      label TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'idle',
      phase TEXT NOT NULL DEFAULT '',
      phase_label TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      queue_wait_ms INTEGER NOT NULL DEFAULT 0,
      time_budget_ms INTEGER NOT NULL DEFAULT 0,
      batch_limit INTEGER NOT NULL DEFAULT 0,
      processed_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      total_count INTEGER NOT NULL DEFAULT 0,
      retry_attempt INTEGER NOT NULL DEFAULT 0,
      next_retry_at TEXT NOT NULL DEFAULT '',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      progress_mode TEXT NOT NULL DEFAULT 'indeterminate',
      progress_json TEXT NOT NULL DEFAULT '{}',
      started_at TEXT NOT NULL DEFAULT '',
      completed_at TEXT NOT NULL DEFAULT '',
      heartbeat_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  for (const sql of [
    "ALTER TABLE synt_dirty_event ADD COLUMN library_id INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE synt_dirty_event ADD COLUMN coalesced_count INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE synt_job_state ADD COLUMN run_id TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE synt_job_state ADD COLUMN source TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE synt_job_state ADD COLUMN label TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE synt_job_state ADD COLUMN phase TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE synt_job_state ADD COLUMN phase_label TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE synt_job_state ADD COLUMN message TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE synt_job_state ADD COLUMN total_count INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE synt_job_state ADD COLUMN progress_mode TEXT NOT NULL DEFAULT 'indeterminate'",
    "ALTER TABLE synt_job_state ADD COLUMN progress_json TEXT NOT NULL DEFAULT '{}'",
    "ALTER TABLE synt_job_state ADD COLUMN started_at TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE synt_job_state ADD COLUMN completed_at TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE synt_job_state ADD COLUMN heartbeat_at TEXT NOT NULL DEFAULT ''",
  ]) {
    applyOptionalMigration(db, sql);
  }
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_literature_item_status_updated
      ON synt_literature_item(status, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_literature_item_normalized_title
      ON synt_literature_item(normalized_title);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_literature_item_created_status
      ON synt_literature_item(created_from, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_literature_identifier_kind_value
      ON synt_literature_identifier(kind, normalized_value);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_zotero_binding_item
      ON synt_zotero_binding(library_id, item_key);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_zotero_binding_literature_status
      ON synt_zotero_binding(literature_item_id, binding_status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_literature_redirect_from
      ON synt_literature_redirect(from_literature_item_id);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_literature_redirect_to
      ON synt_literature_redirect(to_literature_item_id);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_reference_instance_source
      ON synt_reference_instance(source_literature_item_id, reference_index);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_reference_resolution_instance
      ON synt_reference_resolution(reference_instance_id);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_reference_resolution_target_status
      ON synt_reference_resolution(target_literature_item_id, status);
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
    CREATE INDEX IF NOT EXISTS idx_synt_topic_discovery_hint_literature_status
      ON synt_topic_discovery_hint(literature_item_id, status, score DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_topic_discovery_hint_updated
      ON synt_topic_discovery_hint(updated_at DESC);
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
    CREATE INDEX IF NOT EXISTS idx_synt_dirty_event_status_retry
      ON synt_dirty_event(status, next_retry_at, updated_at);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_dirty_event_scope_type_status
      ON synt_dirty_event(scope_kind, scope_ref, event_type, status);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_job_state_status_updated
      ON synt_job_state(status, updated_at DESC);
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

function rowToLiteratureItem(
  row: SqlRow | null,
): SynthesisLiteratureItemRecord | null {
  if (!row) {
    return null;
  }
  return {
    literatureItemId: cleanString(row.literature_item_id),
    displayTitle: cleanString(row.display_title),
    normalizedTitle: cleanString(row.normalized_title),
    titleNormalizerVersion: cleanString(row.title_normalizer_version),
    year: cleanString(row.year) || undefined,
    venue: cleanString(row.venue) || undefined,
    authorsJson: cleanString(row.authors_json) || undefined,
    status: cleanString(row.status) || undefined,
    createdFrom: cleanString(row.created_from) || undefined,
    confidence: cleanString(row.confidence) || undefined,
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToIdentifier(row: SqlRow): SynthesisLiteratureIdentifierRecord {
  return {
    literatureItemId: cleanString(row.literature_item_id),
    kind: cleanString(row.kind),
    normalizedValue: cleanString(row.normalized_value),
    displayValue: cleanString(row.display_value) || undefined,
    source: cleanString(row.source) || undefined,
    confidence: cleanString(row.confidence) || undefined,
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToZoteroBinding(row: SqlRow): SynthesisZoteroBindingRecord {
  return {
    libraryId: Math.max(0, Math.floor(Number(row.library_id) || 0)),
    itemKey: cleanString(row.item_key),
    literatureItemId: cleanString(row.literature_item_id),
    itemType: cleanString(row.item_type) || undefined,
    bindingStatus: cleanString(row.binding_status) || "active",
    dateAdded: cleanString(row.date_added) || undefined,
    deletedAt: cleanString(row.deleted_at) || undefined,
    tagsJson: cleanString(row.tags_json) || undefined,
    collectionsJson: cleanString(row.collections_json) || undefined,
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToRedirect(row: SqlRow): SynthesisLiteratureRedirectRecord {
  return {
    redirectId: cleanString(row.redirect_id),
    fromLiteratureItemId: cleanString(row.from_literature_item_id),
    toLiteratureItemId: cleanString(row.to_literature_item_id),
    reason: cleanString(row.reason),
    diagnosticsJson: cleanString(row.diagnostics_json) || undefined,
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToArtifactState(row: SqlRow): SynthesisArtifactStateRecord {
  return {
    literatureItemId: cleanString(row.literature_item_id),
    artifactType: cleanString(row.artifact_type),
    status: cleanString(row.status) || "missing",
    payloadHash: cleanString(row.payload_hash) || undefined,
    noteKey: cleanString(row.note_key) || undefined,
    diagnosticsJson: cleanString(row.diagnostics_json) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToReferenceInstance(row: SqlRow): SynthesisReferenceInstanceRecord {
  return {
    referenceInstanceId: cleanString(row.reference_instance_id),
    sourceLiteratureItemId: cleanString(row.source_literature_item_id),
    referenceIndex: Math.max(0, Math.floor(Number(row.reference_index) || 0)),
    parsedTitle: cleanString(row.parsed_title) || undefined,
    normalizedTitle: cleanString(row.normalized_title) || undefined,
    year: cleanString(row.year) || undefined,
    authorsJson: cleanString(row.authors_json) || undefined,
    rawReference: cleanString(row.raw_reference) || undefined,
    rawReferenceHash: cleanString(row.raw_reference_hash) || undefined,
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToReferenceResolution(
  row: SqlRow,
): SynthesisReferenceResolutionRecord {
  return {
    resolutionId: cleanString(row.resolution_id),
    referenceInstanceId: cleanString(row.reference_instance_id),
    sourceLiteratureItemId: cleanString(row.source_literature_item_id),
    targetLiteratureItemId:
      cleanString(row.target_literature_item_id) || undefined,
    status: cleanString(row.status) || "unresolved",
    confidence: cleanString(row.confidence) || undefined,
    diagnosticsJson: cleanString(row.diagnostics_json) || undefined,
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
    edgeStatus: cleanString(row.edge_status) || "unresolved",
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
    edgeStatus: cleanString(row.edge_status) || "unresolved",
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
    edgeStatus: cleanString(row.edge_status) || "unresolved",
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
    preset: cleanString(row.preset) || "balanced",
    graphHash: cleanString(row.graph_hash),
    status: normalizeCitationLayoutStatus(row.status),
    layoutJson: cleanString(row.layout_json) || "{}",
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
    status: cleanString(row.status) || "open",
    createdAt: cleanString(row.created_at) || undefined,
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

function rowToDirtyEvent(row: SqlRow): SynthesisDirtyEventRecord {
  return {
    eventId: cleanString(row.event_id),
    libraryId: Math.max(0, Math.floor(Number(row.library_id) || 0)),
    eventType: cleanString(row.event_type),
    source: cleanString(row.source) || undefined,
    scopeKind: cleanString(row.scope_kind) || undefined,
    scopeRef: cleanString(row.scope_ref) || undefined,
    sourceHash: cleanString(row.source_hash) || undefined,
    status: cleanString(row.status) || "queued",
    attemptCount: Math.max(0, Math.floor(Number(row.attempt_count) || 0)),
    coalescedCount: Math.max(1, Math.floor(Number(row.coalesced_count) || 1)),
    nextRetryAt: cleanString(row.next_retry_at) || undefined,
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

function rowToJobProgress(row: SqlRow): SynthesisJobProgressRecord {
  return {
    jobName: cleanString(row.job_name),
    runId: cleanString(row.run_id) || undefined,
    source: cleanString(row.source) || undefined,
    label: cleanString(row.label) || undefined,
    status: normalizeJobProgressStatus(row.status),
    phase: cleanString(row.phase) || undefined,
    phaseLabel: cleanString(row.phase_label) || undefined,
    message: cleanString(row.message) || undefined,
    queueWaitMs: nonNegativeInt(row.queue_wait_ms),
    timeBudgetMs: nonNegativeInt(row.time_budget_ms),
    batchLimit: nonNegativeInt(row.batch_limit),
    processedCount: nonNegativeInt(row.processed_count),
    skippedCount: nonNegativeInt(row.skipped_count),
    failedCount: nonNegativeInt(row.failed_count),
    totalCount: nonNegativeInt(row.total_count),
    retryAttempt: nonNegativeInt(row.retry_attempt),
    nextRetryAt: cleanString(row.next_retry_at) || undefined,
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    progressMode: normalizeJobProgressMode(row.progress_mode),
    progressJson: cleanString(row.progress_json) || "{}",
    startedAt: cleanString(row.started_at) || undefined,
    completedAt: cleanString(row.completed_at) || undefined,
    heartbeatAt: cleanString(row.heartbeat_at) || undefined,
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
  item?: SynthesisLiteratureItemRecord | null;
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
  item?: SynthesisLiteratureItemRecord | null;
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
  const allLiteratureText = Object.values(fields)
    .flat()
    .map(normalizedDiscoveryTerm);
  const missingMustHaveTerms = mustHaveTerms.filter(
    (term) => !matchedTerms.has(term),
  );
  const excludeHits = topicExcludeTerms.filter((term) =>
    allLiteratureText.some((value) => discoveryTextContains(value, term)),
  );
  if (score < args.minScore) {
    return null;
  }
  const status =
    missingMustHaveTerms.length || excludeHits.length ? "filtered" : "open";
  const matchingFields = {
    matched_terms: Array.from(matchedTerms).sort(),
    missing_must_have_terms: missingMustHaveTerms.sort(),
    exclude_hits: excludeHits.sort(),
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
    status,
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

  clearDirtyEvents(args: { statuses?: string[]; eventTypes?: string[] } = {}) {
    this.initialize();
    const events = this.listDirtyEvents(args);
    return this.db.transaction(() => {
      for (const event of events) {
        this.db.run("DELETE FROM synt_dirty_event WHERE event_id=@event_id", {
          event_id: event.eventId,
        });
      }
      return {
        deleted: events.length,
        eventIds: events.map((event) => event.eventId),
        clearedAt: this.now(),
      };
    });
  }

  deleteJobProgress(jobNameRaw: string) {
    this.initialize();
    const jobName = cleanString(jobNameRaw);
    if (!jobName) {
      return 0;
    }
    const before = this.getJobProgress(jobName) ? 1 : 0;
    this.db.run("DELETE FROM synt_job_state WHERE job_name=@job_name", {
      job_name: jobName,
    });
    return before;
  }

  upsertLiteratureItem(record: SynthesisLiteratureItemRecord) {
    this.initialize();
    const literatureItemId = cleanString(record.literatureItemId);
    if (!literatureItemId) {
      throw new Error("literatureItemId must be non-empty");
    }
    const timestamp = this.now();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_literature_item (
          literature_item_id,
          display_title,
          normalized_title,
          title_normalizer_version,
          year,
          venue,
          authors_json,
          status,
          created_from,
          confidence,
          created_at,
          updated_at
        )
        VALUES (
          @literature_item_id,
          @display_title,
          @normalized_title,
          @title_normalizer_version,
          @year,
          @venue,
          @authors_json,
          @status,
          @created_from,
          @confidence,
          @created_at,
          @updated_at
        )
      `,
      {
        literature_item_id: literatureItemId,
        display_title: cleanString(record.displayTitle),
        normalized_title: cleanString(record.normalizedTitle),
        title_normalizer_version: cleanString(record.titleNormalizerVersion),
        year: cleanString(record.year),
        venue: cleanString(record.venue),
        authors_json: cleanString(record.authorsJson) || "[]",
        status: normalizeLiteratureStatus(record.status),
        created_from: cleanString(record.createdFrom),
        confidence: cleanString(record.confidence),
        created_at: cleanString(record.createdAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  replaceIndexState(state: SynthesisIndexStateReplacement) {
    this.transaction(() => {
      for (const table of [
        "synt_review_item",
        "synt_reference_resolution",
        "synt_reference_instance",
        "synt_artifact_state",
        "synt_zotero_binding",
        "synt_literature_identifier",
        "synt_literature_item",
      ]) {
        this.db.run(`DELETE FROM ${table}`);
      }
      for (const record of state.literatureItems) {
        this.upsertLiteratureItem(record);
      }
      for (const record of state.identifiers || []) {
        this.upsertIdentifier(record);
      }
      for (const record of state.zoteroBindings || []) {
        this.upsertZoteroBinding(record);
      }
      for (const record of state.redirects || []) {
        this.upsertRedirect(record);
      }
      for (const record of state.artifactStates || []) {
        this.upsertArtifactState(record);
      }
      for (const record of state.referenceInstances || []) {
        this.upsertReferenceInstance(record);
      }
      for (const record of state.referenceResolutions || []) {
        this.upsertReferenceResolution(record);
      }
      for (const record of state.reviewItems || []) {
        this.upsertReviewItem(record);
      }
      this.syncCitationGraphFromIndex({
        timestamp: this.now(),
      });
    });
  }

  replaceCitationGraphState(state: SynthesisCitationGraphStateReplacement) {
    this.transaction(() => {
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

  syncCitationGraphFromIndex(
    args: {
      sourceLiteratureItemIds?: string[];
      literatureItemIds?: string[];
      referenceInstanceIds?: string[];
      timestamp?: string;
    } = {},
  ) {
    this.initialize();
    const timestamp = cleanString(args.timestamp) || this.now();
    const references = this.listReferenceInstances();
    const resolutionsByReferenceId = new Map(
      this.listReferenceResolutions().map(
        (entry) => [entry.referenceInstanceId, entry] as const,
      ),
    );
    const requestedReferenceIds = new Set(
      (args.referenceInstanceIds || []).map(cleanString).filter(Boolean),
    );
    const scoped =
      Boolean(args.sourceLiteratureItemIds?.length) ||
      Boolean(args.literatureItemIds?.length) ||
      Boolean(args.referenceInstanceIds?.length);
    const sourceIds = new Set(
      (args.sourceLiteratureItemIds || []).map(cleanString).filter(Boolean),
    );
    for (const reference of references) {
      if (requestedReferenceIds.has(reference.referenceInstanceId)) {
        sourceIds.add(reference.sourceLiteratureItemId);
      }
    }
    if (!scoped) {
      for (const table of [
        "synt_citation_metrics_light",
        "synt_citation_incoming_group",
        "synt_citation_source_ownership",
        "synt_citation_edge",
        "synt_citation_node",
      ]) {
        this.db.run(`DELETE FROM ${table}`);
      }
      for (const reference of references) {
        sourceIds.add(reference.sourceLiteratureItemId);
      }
    }

    const oldEdges = sourceIds.size
      ? this.listCitationEdges({
          sourceLiteratureItemIds: Array.from(sourceIds),
        })
      : [];
    const affectedLiteratureIds = new Set(
      (args.literatureItemIds || []).map(cleanString).filter(Boolean),
    );
    for (const sourceId of sourceIds) {
      affectedLiteratureIds.add(sourceId);
    }
    for (const edge of oldEdges) {
      if (edge.targetLiteratureItemId) {
        affectedLiteratureIds.add(edge.targetLiteratureItemId);
      }
    }

    for (const sourceId of sourceIds) {
      this.deleteCitationRowsForSource(sourceId);
      const sourceReferences = references.filter(
        (reference) => reference.sourceLiteratureItemId === sourceId,
      );
      for (const reference of sourceReferences) {
        const resolution = resolutionsByReferenceId.get(
          reference.referenceInstanceId,
        );
        const edge = this.citationEdgeForReference({
          reference,
          resolution,
          timestamp,
        });
        this.upsertCitationEdge(edge);
        this.upsertCitationSourceOwnership({
          sourceLiteratureItemId: edge.sourceLiteratureItemId,
          edgeId: edge.edgeId,
          referenceInstanceId: edge.referenceInstanceId,
          targetLiteratureItemId: edge.targetLiteratureItemId,
          edgeStatus: edge.edgeStatus,
          updatedAt: timestamp,
        });
        if (edge.targetLiteratureItemId && edge.edgeStatus !== "ignored") {
          affectedLiteratureIds.add(edge.targetLiteratureItemId);
          this.upsertCitationIncomingGroup({
            targetLiteratureItemId: edge.targetLiteratureItemId,
            sourceLiteratureItemId: edge.sourceLiteratureItemId,
            edgeId: edge.edgeId,
            referenceInstanceId: edge.referenceInstanceId,
            edgeStatus: edge.edgeStatus,
            updatedAt: timestamp,
          });
        }
      }
    }

    if (!scoped) {
      for (const item of this.listLiteratureItems()) {
        affectedLiteratureIds.add(item.literatureItemId);
      }
    }
    this.upsertCitationNodes(Array.from(affectedLiteratureIds), timestamp);
    this.recomputeCitationLightMetrics(
      Array.from(affectedLiteratureIds),
      timestamp,
    );
  }

  upsertIdentifier(record: SynthesisLiteratureIdentifierRecord) {
    this.initialize();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_literature_identifier (
          literature_item_id,
          kind,
          normalized_value,
          display_value,
          source,
          confidence,
          created_at,
          updated_at
        )
        VALUES (
          @literature_item_id,
          @kind,
          @normalized_value,
          @display_value,
          @source,
          @confidence,
          @created_at,
          @updated_at
        )
      `,
      {
        literature_item_id: cleanString(record.literatureItemId),
        kind: cleanString(record.kind),
        normalized_value: cleanString(record.normalizedValue),
        display_value: cleanString(record.displayValue),
        source: cleanString(record.source),
        confidence: cleanString(record.confidence),
        created_at: cleanString(record.createdAt) || this.now(),
        updated_at: cleanString(record.updatedAt) || this.now(),
      },
    );
  }

  upsertZoteroBinding(record: SynthesisZoteroBindingRecord) {
    this.initialize();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_zotero_binding (
          library_id,
          item_key,
          literature_item_id,
          item_type,
          binding_status,
          date_added,
          deleted_at,
          tags_json,
          collections_json,
          created_at,
          updated_at
        )
        VALUES (
          @library_id,
          @item_key,
          @literature_item_id,
          @item_type,
          @binding_status,
          @date_added,
          @deleted_at,
          @tags_json,
          @collections_json,
          @created_at,
          @updated_at
        )
      `,
      {
        library_id: Math.max(0, Math.floor(Number(record.libraryId) || 0)),
        item_key: cleanString(record.itemKey),
        literature_item_id: cleanString(record.literatureItemId),
        item_type: cleanString(record.itemType),
        binding_status: cleanString(record.bindingStatus) || "active",
        date_added: cleanString(record.dateAdded),
        deleted_at: cleanString(record.deletedAt),
        tags_json: cleanString(record.tagsJson) || "[]",
        collections_json: cleanString(record.collectionsJson) || "[]",
        created_at: cleanString(record.createdAt) || this.now(),
        updated_at: cleanString(record.updatedAt) || this.now(),
      },
    );
  }

  upsertRedirect(record: SynthesisLiteratureRedirectRecord) {
    this.initialize();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_literature_redirect (
          redirect_id,
          from_literature_item_id,
          to_literature_item_id,
          reason,
          diagnostics_json,
          created_at,
          updated_at
        )
        VALUES (
          @redirect_id,
          @from_literature_item_id,
          @to_literature_item_id,
          @reason,
          @diagnostics_json,
          @created_at,
          @updated_at
        )
      `,
      {
        redirect_id: cleanString(record.redirectId),
        from_literature_item_id: cleanString(record.fromLiteratureItemId),
        to_literature_item_id: cleanString(record.toLiteratureItemId),
        reason: cleanString(record.reason),
        diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
        created_at: cleanString(record.createdAt) || this.now(),
        updated_at: cleanString(record.updatedAt) || this.now(),
      },
    );
  }

  upsertArtifactState(record: SynthesisArtifactStateRecord) {
    this.initialize();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_artifact_state (
          literature_item_id,
          artifact_type,
          status,
          payload_hash,
          note_key,
          diagnostics_json,
          updated_at
        )
        VALUES (
          @literature_item_id,
          @artifact_type,
          @status,
          @payload_hash,
          @note_key,
          @diagnostics_json,
          @updated_at
        )
      `,
      {
        literature_item_id: cleanString(record.literatureItemId),
        artifact_type: cleanString(record.artifactType),
        status: cleanString(record.status) || "missing",
        payload_hash: cleanString(record.payloadHash),
        note_key: cleanString(record.noteKey),
        diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
        updated_at: cleanString(record.updatedAt) || this.now(),
      },
    );
  }

  upsertReferenceInstance(record: SynthesisReferenceInstanceRecord) {
    this.initialize();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_reference_instance (
          reference_instance_id,
          source_literature_item_id,
          reference_index,
          parsed_title,
          normalized_title,
          year,
          authors_json,
          raw_reference,
          raw_reference_hash,
          created_at,
          updated_at
        )
        VALUES (
          @reference_instance_id,
          @source_literature_item_id,
          @reference_index,
          @parsed_title,
          @normalized_title,
          @year,
          @authors_json,
          @raw_reference,
          @raw_reference_hash,
          @created_at,
          @updated_at
        )
      `,
      {
        reference_instance_id: cleanString(record.referenceInstanceId),
        source_literature_item_id: cleanString(record.sourceLiteratureItemId),
        reference_index: Math.max(
          0,
          Math.floor(Number(record.referenceIndex) || 0),
        ),
        parsed_title: cleanString(record.parsedTitle),
        normalized_title: cleanString(record.normalizedTitle),
        year: cleanString(record.year),
        authors_json: cleanString(record.authorsJson) || "[]",
        raw_reference: cleanString(record.rawReference),
        raw_reference_hash: cleanString(record.rawReferenceHash),
        created_at: cleanString(record.createdAt) || this.now(),
        updated_at: cleanString(record.updatedAt) || this.now(),
      },
    );
  }

  upsertReferenceResolution(record: SynthesisReferenceResolutionRecord) {
    this.initialize();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_reference_resolution (
          resolution_id,
          reference_instance_id,
          source_literature_item_id,
          target_literature_item_id,
          status,
          confidence,
          diagnostics_json,
          created_at,
          updated_at
        )
        VALUES (
          @resolution_id,
          @reference_instance_id,
          @source_literature_item_id,
          @target_literature_item_id,
          @status,
          @confidence,
          @diagnostics_json,
          @created_at,
          @updated_at
        )
      `,
      {
        resolution_id: cleanString(record.resolutionId),
        reference_instance_id: cleanString(record.referenceInstanceId),
        source_literature_item_id: cleanString(record.sourceLiteratureItemId),
        target_literature_item_id: cleanString(record.targetLiteratureItemId),
        status: cleanString(record.status) || "unresolved",
        confidence: cleanString(record.confidence),
        diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
        created_at: cleanString(record.createdAt) || this.now(),
        updated_at: cleanString(record.updatedAt) || this.now(),
      },
    );
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
        edge_status: cleanString(record.edgeStatus) || "unresolved",
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
        edge_status: cleanString(record.edgeStatus) || "unresolved",
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
        edge_status: cleanString(record.edgeStatus) || "unresolved",
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
        status: cleanString(record.status) || "open",
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

  upsertDirtyEvent(record: SynthesisDirtyEventRecord) {
    this.initialize();
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_dirty_event (
          event_id,
          library_id,
          event_type,
          source,
          scope_kind,
          scope_ref,
          source_hash,
          status,
          attempt_count,
          coalesced_count,
          next_retry_at,
          diagnostics_json,
          created_at,
          updated_at
        )
        VALUES (
          @event_id,
          @library_id,
          @event_type,
          @source,
          @scope_kind,
          @scope_ref,
          @source_hash,
          @status,
          @attempt_count,
          @coalesced_count,
          @next_retry_at,
          @diagnostics_json,
          @created_at,
          @updated_at
        )
      `,
      {
        event_id: cleanString(record.eventId),
        library_id: Math.max(0, Math.floor(Number(record.libraryId) || 0)),
        event_type: cleanString(record.eventType),
        source: cleanString(record.source),
        scope_kind: cleanString(record.scopeKind),
        scope_ref: cleanString(record.scopeRef),
        source_hash: cleanString(record.sourceHash),
        status: cleanString(record.status) || "queued",
        attempt_count: Math.max(
          0,
          Math.floor(Number(record.attemptCount) || 0),
        ),
        coalesced_count: Math.max(
          1,
          Math.floor(Number(record.coalescedCount) || 1),
        ),
        next_retry_at: cleanString(record.nextRetryAt),
        diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
        created_at: cleanString(record.createdAt) || this.now(),
        updated_at: cleanString(record.updatedAt) || this.now(),
      },
    );
  }

  upsertJobProgress(record: SynthesisJobProgressRecord) {
    this.initialize();
    const jobName = cleanString(record.jobName);
    if (!jobName) {
      throw new Error("jobName must be non-empty");
    }
    const timestamp = this.now();
    const status = normalizeJobProgressStatus(record.status || "running");
    const startedAt = cleanString(record.startedAt) || timestamp;
    const totalCount = nonNegativeInt(record.totalCount);
    const progressMode =
      record.progressMode || (totalCount > 0 ? "determinate" : "indeterminate");
    this.db.run(
      `
        INSERT OR REPLACE INTO synt_job_state (
          job_name,
          run_id,
          source,
          label,
          status,
          phase,
          phase_label,
          message,
          queue_wait_ms,
          time_budget_ms,
          batch_limit,
          processed_count,
          skipped_count,
          failed_count,
          total_count,
          retry_attempt,
          next_retry_at,
          diagnostics_json,
          progress_mode,
          progress_json,
          started_at,
          completed_at,
          heartbeat_at,
          updated_at
        )
        VALUES (
          @job_name,
          @run_id,
          @source,
          @label,
          @status,
          @phase,
          @phase_label,
          @message,
          @queue_wait_ms,
          @time_budget_ms,
          @batch_limit,
          @processed_count,
          @skipped_count,
          @failed_count,
          @total_count,
          @retry_attempt,
          @next_retry_at,
          @diagnostics_json,
          @progress_mode,
          @progress_json,
          @started_at,
          @completed_at,
          @heartbeat_at,
          @updated_at
        )
      `,
      {
        job_name: jobName,
        run_id: cleanString(record.runId),
        source: cleanString(record.source),
        label: cleanString(record.label),
        status,
        phase: cleanString(record.phase),
        phase_label: cleanString(record.phaseLabel),
        message: cleanString(record.message),
        queue_wait_ms: nonNegativeInt(record.queueWaitMs),
        time_budget_ms: nonNegativeInt(record.timeBudgetMs),
        batch_limit: nonNegativeInt(record.batchLimit),
        processed_count: nonNegativeInt(record.processedCount),
        skipped_count: nonNegativeInt(record.skippedCount),
        failed_count: nonNegativeInt(record.failedCount),
        total_count: totalCount,
        retry_attempt: nonNegativeInt(record.retryAttempt),
        next_retry_at: cleanString(record.nextRetryAt),
        diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
        progress_mode: progressMode,
        progress_json: cleanString(record.progressJson) || "{}",
        started_at: startedAt,
        completed_at: cleanString(record.completedAt),
        heartbeat_at: cleanString(record.heartbeatAt) || timestamp,
        updated_at: cleanString(record.updatedAt) || timestamp,
      },
    );
  }

  completeJobProgress(record: SynthesisJobProgressRecord) {
    this.upsertJobProgress({
      ...record,
      status: "completed",
      completedAt: record.completedAt || this.now(),
    });
  }

  failJobProgress(
    record: SynthesisJobProgressRecord & {
      status?: "failed_retryable" | "failed_terminal";
    },
  ) {
    this.upsertJobProgress({
      ...record,
      status: record.status || "failed_retryable",
      completedAt: record.completedAt || this.now(),
    });
  }

  listActiveJobProgress(args: { includeCompleted?: boolean } = {}) {
    this.initialize();
    const activeStatuses = new Set([
      "queued",
      "running",
      "waiting",
      "failed_retryable",
      "failed_terminal",
    ]);
    if (args.includeCompleted) {
      activeStatuses.add("completed");
    }
    return this.db
      .all("SELECT * FROM synt_job_state")
      .map(rowToJobProgress)
      .filter((row) => row.jobName && activeStatuses.has(row.status || "idle"))
      .sort(
        (left, right) =>
          (right.updatedAt || "").localeCompare(left.updatedAt || "") ||
          left.jobName.localeCompare(right.jobName),
      );
  }

  getJobProgress(jobNameRaw: string) {
    this.initialize();
    const jobName = cleanString(jobNameRaw);
    if (!jobName) {
      return null;
    }
    const row = this.db.get(
      `
        SELECT *
        FROM synt_job_state
        WHERE job_name=@job_name
        LIMIT 1
      `,
      { job_name: jobName },
    );
    return row ? rowToJobProgress(row) : null;
  }

  clearStaleJobProgress(args: { staleBefore: string }) {
    this.initialize();
    const staleBefore = cleanString(args.staleBefore);
    if (!staleBefore) {
      return [];
    }
    const timestamp = this.now();
    const staleRows = this.db
      .all("SELECT * FROM synt_job_state")
      .map(rowToJobProgress)
      .filter(
        (row) =>
          row.status === "running" &&
          cleanString(row.heartbeatAt || row.updatedAt) &&
          cleanString(row.heartbeatAt || row.updatedAt) < staleBefore,
      );
    for (const row of staleRows) {
      this.upsertJobProgress({
        ...row,
        status: "failed_retryable",
        message: row.message || "Job progress heartbeat became stale.",
        diagnosticsJson:
          row.diagnosticsJson && row.diagnosticsJson !== "[]"
            ? row.diagnosticsJson
            : JSON.stringify([
                {
                  code: "synthesis_job_progress_stale",
                  severity: "warning",
                  message: "Job progress heartbeat became stale.",
                },
              ]),
        completedAt: timestamp,
        updatedAt: timestamp,
      });
    }
    return staleRows;
  }

  listPaperRegistryFacts(
    args: {
      paperRefs?: string[];
      cursor?: unknown;
      limit?: unknown;
    } = {},
  ): SynthesisPaperRegistryFactPage {
    this.initialize();
    const refs = new Set(
      (args.paperRefs || []).map(cleanString).filter(Boolean),
    );
    const rows = this.db
      .all(
        `
          SELECT
            item.literature_item_id,
            item.display_title,
            item.year,
            item.authors_json,
            item.status,
            binding.library_id,
            binding.item_key,
            binding.item_type,
            binding.binding_status,
            binding.date_added,
            binding.tags_json,
            binding.collections_json
          FROM synt_zotero_binding binding
          JOIN synt_literature_item item
            ON item.literature_item_id = binding.literature_item_id
          ORDER BY binding.library_id ASC, binding.item_key ASC
        `,
      )
      .filter((row) => {
        if (cleanString(row.binding_status) !== "active") {
          return false;
        }
        if (normalizeLiteratureStatus(row.status) !== "active") {
          return false;
        }
        if (!refs.size) {
          return true;
        }
        return refs.has(
          `${Math.floor(Number(row.library_id) || 0)}:${cleanString(row.item_key)}`,
        );
      });
    const page = this.paginate({
      cursor: args.cursor,
      limit: args.limit,
      defaultLimit: DEFAULT_PAGE_LIMIT,
      maxLimit: MAX_PAGE_LIMIT,
    });
    const paged = rows.slice(page.cursor, page.cursor + page.limit);
    const literatureIds = new Set(
      paged.map((row) => cleanString(row.literature_item_id)).filter(Boolean),
    );
    const identifiersByItem = new Map<
      string,
      SynthesisLiteratureIdentifierRecord[]
    >();
    for (const row of this.db.all("SELECT * FROM synt_literature_identifier")) {
      const record = rowToIdentifier(row);
      if (!literatureIds.has(record.literatureItemId)) {
        continue;
      }
      const bucket = identifiersByItem.get(record.literatureItemId) || [];
      bucket.push(record);
      identifiersByItem.set(record.literatureItemId, bucket);
    }
    const artifactsByItem = new Map<string, SynthesisArtifactStateRecord[]>();
    for (const row of this.db.all("SELECT * FROM synt_artifact_state")) {
      const record = rowToArtifactState(row);
      if (!literatureIds.has(record.literatureItemId)) {
        continue;
      }
      const bucket = artifactsByItem.get(record.literatureItemId) || [];
      bucket.push(record);
      artifactsByItem.set(record.literatureItemId, bucket);
    }
    const nextCursor = page.cursor + paged.length;
    return {
      entries: paged.map((row) => {
        const literatureItemId = cleanString(row.literature_item_id);
        return {
          literatureItemId,
          displayTitle: cleanString(row.display_title),
          year: cleanString(row.year) || undefined,
          authorsJson: cleanString(row.authors_json) || undefined,
          libraryId: Math.max(0, Math.floor(Number(row.library_id) || 0)),
          itemKey: cleanString(row.item_key),
          itemType: cleanString(row.item_type) || undefined,
          dateAdded: cleanString(row.date_added) || undefined,
          tagsJson: cleanString(row.tags_json) || undefined,
          collectionsJson: cleanString(row.collections_json) || undefined,
          identifiers: identifiersByItem.get(literatureItemId) || [],
          artifacts: artifactsByItem.get(literatureItemId) || [],
        };
      }),
      cursor: page.cursor,
      nextCursor: nextCursor < rows.length ? nextCursor : null,
      hasMore: nextCursor < rows.length,
      returned: paged.length,
      total: rows.length,
      limit: page.limit,
    };
  }

  listReferenceFacts(args: { sourceLiteratureItemIds?: string[] } = {}) {
    this.initialize();
    const sourceIds = new Set(
      (args.sourceLiteratureItemIds || []).map(cleanString).filter(Boolean),
    );
    const itemsById = new Map(
      this.db
        .all("SELECT * FROM synt_literature_item")
        .map((row) => [cleanString(row.literature_item_id), row]),
    );
    const activeBindingsByItem = new Map<string, SqlRow>();
    for (const row of this.db.all("SELECT * FROM synt_zotero_binding")) {
      if (cleanString(row.binding_status) !== "active") {
        continue;
      }
      activeBindingsByItem.set(cleanString(row.literature_item_id), row);
    }
    const resolutionsByInstance = new Map(
      this.db
        .all("SELECT * FROM synt_reference_resolution")
        .map(rowToReferenceResolution)
        .map((row) => [row.referenceInstanceId, row]),
    );
    return this.db
      .all("SELECT * FROM synt_reference_instance")
      .map(rowToReferenceInstance)
      .filter(
        (row) => !sourceIds.size || sourceIds.has(row.sourceLiteratureItemId),
      )
      .sort(
        (left, right) =>
          left.sourceLiteratureItemId.localeCompare(
            right.sourceLiteratureItemId,
          ) || left.referenceIndex - right.referenceIndex,
      )
      .map((reference): SynthesisIndexReferenceFact => {
        const resolution = resolutionsByInstance.get(
          reference.referenceInstanceId,
        );
        const targetItem = resolution?.targetLiteratureItemId
          ? itemsById.get(resolution.targetLiteratureItemId)
          : undefined;
        const targetBinding = resolution?.targetLiteratureItemId
          ? activeBindingsByItem.get(resolution.targetLiteratureItemId)
          : undefined;
        return {
          referenceInstanceId: reference.referenceInstanceId,
          sourceLiteratureItemId: reference.sourceLiteratureItemId,
          referenceIndex: reference.referenceIndex,
          title: reference.parsedTitle,
          rawReference: reference.rawReference,
          year: reference.year,
          authorsJson: reference.authorsJson,
          resolutionId: resolution?.resolutionId,
          resolutionStatus: resolution?.status || "unresolved",
          confidence: resolution?.confidence,
          targetLiteratureItemId: resolution?.targetLiteratureItemId,
          targetTitle: cleanString(targetItem?.display_title) || undefined,
          targetYear: cleanString(targetItem?.year) || undefined,
          targetHasZoteroBinding: Boolean(targetBinding),
          targetPaperRef: targetBinding
            ? `${Math.floor(Number(targetBinding.library_id) || 0)}:${cleanString(
                targetBinding.item_key,
              )}`
            : undefined,
        };
      });
  }

  listLiteratureItems() {
    this.initialize();
    return this.db
      .all("SELECT * FROM synt_literature_item")
      .map(rowToLiteratureItem)
      .filter((row): row is SynthesisLiteratureItemRecord => row !== null)
      .sort((left, right) =>
        left.literatureItemId.localeCompare(right.literatureItemId),
      );
  }

  listZoteroBindings(
    args: { statuses?: string[]; literatureItemIds?: string[] } = {},
  ) {
    this.initialize();
    const statuses = new Set(
      (args.statuses || []).map(cleanString).filter(Boolean),
    );
    const literatureItemIds = new Set(
      (args.literatureItemIds || []).map(cleanString).filter(Boolean),
    );
    return this.db
      .all("SELECT * FROM synt_zotero_binding")
      .map(rowToZoteroBinding)
      .filter((row) => !statuses.size || statuses.has(row.bindingStatus || ""))
      .filter(
        (row) =>
          !literatureItemIds.size ||
          literatureItemIds.has(row.literatureItemId),
      )
      .sort(
        (left, right) =>
          left.libraryId - right.libraryId ||
          left.itemKey.localeCompare(right.itemKey),
      );
  }

  listIdentifiers() {
    this.initialize();
    return this.db
      .all("SELECT * FROM synt_literature_identifier")
      .map(rowToIdentifier);
  }

  listArtifactStates(args: { literatureItemIds?: string[] } = {}) {
    this.initialize();
    const ids = new Set(
      (args.literatureItemIds || []).map(cleanString).filter(Boolean),
    );
    return this.db
      .all("SELECT * FROM synt_artifact_state")
      .map(rowToArtifactState)
      .filter((row) => !ids.size || ids.has(row.literatureItemId));
  }

  listReferenceInstances() {
    this.initialize();
    return this.db
      .all("SELECT * FROM synt_reference_instance")
      .map(rowToReferenceInstance);
  }

  listReferenceResolutions() {
    this.initialize();
    return this.db
      .all("SELECT * FROM synt_reference_resolution")
      .map(rowToReferenceResolution);
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
    return this.db
      .all("SELECT * FROM synt_citation_node")
      .map(rowToCitationNode)
      .filter((row) => !statuses.size || statuses.has(row.nodeStatus))
      .filter(
        (row) =>
          !literatureItemIds.size ||
          literatureItemIds.has(row.literatureItemId),
      )
      .sort((left, right) =>
        left.literatureItemId.localeCompare(right.literatureItemId),
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
    return this.db
      .all("SELECT * FROM synt_citation_edge")
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
      .sort(
        (left, right) =>
          left.sourceLiteratureItemId.localeCompare(
            right.sourceLiteratureItemId,
          ) || left.edgeId.localeCompare(right.edgeId),
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
    return this.db
      .all("SELECT * FROM synt_citation_source_ownership")
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
    return this.db
      .all("SELECT * FROM synt_citation_incoming_group")
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
    const preset = cleanString(args.preset) || "balanced";
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
    const preset = cleanString(record.preset) || "balanced";
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
      preset: cleanString(args.preset) || "balanced",
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
      preset: cleanString(args.preset) || "balanced",
      graphHash: cleanString(args.graphHash) || existing?.graphHash || "",
      status: "failed",
      layoutJson: existing?.layoutJson || "{}",
      diagnosticsJson: cleanString(args.diagnosticsJson) || "[]",
      createdAt: existing?.createdAt,
      updatedAt: cleanString(args.updatedAt) || this.now(),
    });
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
    const statuses = new Set(
      (args.statuses || []).map(cleanString).filter(Boolean),
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
    const itemsById = new Map(
      this.listLiteratureItems().map((item) => [item.literatureItemId, item]),
    );
    const tagsByItem = new Map<string, string[]>();
    for (const binding of this.listZoteroBindings({ statuses: ["active"] })) {
      const tags = parsedStringArray(binding.tagsJson);
      if (!tags.length) {
        continue;
      }
      tagsByItem.set(binding.literatureItemId, [
        ...(tagsByItem.get(binding.literatureItemId) || []),
        ...tags,
      ]);
    }
    const hints: SynthesisTopicDiscoveryHintRecord[] = [];
    for (const topic of topics) {
      for (const entry of literature) {
        const hint = scoreDiscoveryPair({
          topic,
          literature: entry,
          item: itemsById.get(entry.literatureItemId),
          tags: tagsByItem.get(entry.literatureItemId),
          method,
          timestamp,
          minScore,
        });
        if (hint) {
          hints.push(hint);
        }
      }
    }
    this.transaction(() => {
      this.clearTopicDiscoveryHints({
        topicIds: args.topicIds,
        literatureItemIds: args.literatureItemIds,
        method,
      });
      for (const hint of hints) {
        this.upsertTopicDiscoveryHint(hint);
      }
    });
    const open = hints.filter((hint) => hint.status === "open").length;
    const filtered = hints.filter((hint) => hint.status === "filtered").length;
    return {
      method,
      scannedTopics: topics.length,
      scannedLiterature: literature.length,
      upserted: hints.length,
      open,
      filtered,
      hints,
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

  listReviewItems(args: { statuses?: string[]; reviewKind?: string } = {}) {
    this.initialize();
    const statuses = new Set(
      (args.statuses || []).map(cleanString).filter(Boolean),
    );
    const reviewKind = cleanString(args.reviewKind);
    return this.db
      .all("SELECT * FROM synt_review_item")
      .map(rowToReviewItem)
      .filter((row) => !reviewKind || row.reviewKind === reviewKind)
      .filter((row) => !statuses.size || statuses.has(row.status))
      .sort(
        (left, right) =>
          left.priority - right.priority ||
          (left.updatedAt || "").localeCompare(right.updatedAt || "") ||
          left.reviewItemId.localeCompare(right.reviewItemId),
      );
  }

  listRedirects() {
    this.initialize();
    return this.db
      .all("SELECT * FROM synt_literature_redirect")
      .map(rowToRedirect)
      .sort((left, right) => left.redirectId.localeCompare(right.redirectId));
  }

  listDirtyEvents(args: { statuses?: string[]; eventTypes?: string[] } = {}) {
    this.initialize();
    const statuses = new Set(
      (args.statuses || []).map(cleanString).filter(Boolean),
    );
    const eventTypes = new Set(
      (args.eventTypes || []).map(cleanString).filter(Boolean),
    );
    return this.db
      .all("SELECT * FROM synt_dirty_event")
      .map(rowToDirtyEvent)
      .filter((row) => !statuses.size || statuses.has(row.status || ""))
      .filter((row) => !eventTypes.size || eventTypes.has(row.eventType))
      .sort(
        (left, right) =>
          (left.updatedAt || "").localeCompare(right.updatedAt || "") ||
          left.eventId.localeCompare(right.eventId),
      );
  }

  applyIndexReviewAction(args: {
    reviewItemId: string;
    action: string;
    targetLiteratureItemId?: string;
    targetPaperRef?: string;
  }): SynthesisIndexReviewActionResult {
    const reviewItemId = cleanString(args.reviewItemId);
    const action = cleanString(args.action);
    if (!reviewItemId || !action) {
      throw new Error("reviewItemId and action must be non-empty");
    }
    return this.transaction(() => {
      const timestamp = this.now();
      const review = this.listReviewItems().find(
        (entry) => entry.reviewItemId === reviewItemId,
      );
      if (!review) {
        throw new Error("index review item was not found");
      }
      if (
        review.reviewKind !== "zotero_item_delete" &&
        review.reviewKind !== "zotero_dedupe_candidate"
      ) {
        throw new Error(
          "index review action does not support this review kind",
        );
      }
      const payload = parseJsonObject(review.payloadJson);
      const literatureItemId = cleanString(
        payload.literature_item_id || payload.from_literature_item_id,
      );
      const targetLiteratureItemId =
        cleanString(args.targetLiteratureItemId) ||
        this.literatureItemIdFromPaperRef(args.targetPaperRef) ||
        cleanString(
          payload.surviving_literature_item_id ||
            payload.target_literature_item_id,
        );
      if (!literatureItemId) {
        throw new Error("index review payload is missing literature_item_id");
      }
      let effect: InternalReviewActionEffect;
      if (action === "confirm_delete_item") {
        effect = this.confirmDeleteReview({
          review,
          payload,
          literatureItemId,
          timestamp,
        });
      } else if (action === "mark_as_dedupe_merge") {
        if (!targetLiteratureItemId) {
          throw new Error(
            "mark_as_dedupe_merge requires targetLiteratureItemId or targetPaperRef",
          );
        }
        effect = this.applyDedupeMergeReview({
          review,
          payload,
          literatureItemId,
          targetLiteratureItemId,
          timestamp,
        });
      } else if (action === "keep_for_now") {
        effect = this.deferIndexReview({
          review,
          payload,
          literatureItemId,
          timestamp,
        });
      } else {
        throw new Error(`unsupported index review action: ${action}`);
      }
      const indexSummary: SynthesisReviewActionIndexSummary = {
        affectedLiteratureItemIds: uniqueCleanStrings([
          literatureItemId,
          targetLiteratureItemId,
          ...(effect.affectedLiteratureItemIds || []),
        ]),
        affectedReferenceInstanceIds: uniqueCleanStrings(
          effect.affectedReferenceInstanceIds || [],
        ),
        affectedReviewItemIds: uniqueCleanStrings([
          reviewItemId,
          ...(effect.affectedReviewItemIds || []),
        ]),
        affectedArtifactLiteratureItemIds: uniqueCleanStrings(
          effect.affectedArtifactLiteratureItemIds || [],
        ),
      };
      const diagnostics = [
        actionDiagnostic({
          code: "index_review_action_applied",
          message: "Index review action updated domain facts and review state.",
          details: {
            review_item_id: reviewItemId,
            action,
            literature_item_id: literatureItemId,
            target_literature_item_id: targetLiteratureItemId || undefined,
          },
        }),
        actionDiagnostic({
          code: "index_summary_updated",
          message: "Affected Index summary facts are observable from SQLite.",
          details: indexSummary,
        }),
        ...(effect.diagnostics || []),
      ];
      this.syncCitationGraphFromIndex({
        literatureItemIds: indexSummary.affectedLiteratureItemIds,
        referenceInstanceIds: indexSummary.affectedReferenceInstanceIds,
        timestamp,
      });
      const dirtyEventIds: string[] = [];
      const transactionId = `index-review:${stableShortKey({
        reviewItemId,
        action,
        timestamp,
      })}`;
      const actionDirtyEventId = `dirty:${transactionId}`;
      this.upsertDirtyEvent({
        eventId: actionDirtyEventId,
        eventType: "index_review_action",
        source: "synthesis.index_review",
        scopeKind: review.scopeKind,
        scopeRef: review.scopeRef,
        sourceHash: stableShortKey({
          reviewItemId,
          action,
          literatureItemId,
          targetLiteratureItemId,
        }),
        status: "queued",
        diagnosticsJson: JSON.stringify(diagnostics),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      dirtyEventIds.push(actionDirtyEventId);
      const graphDirtyEffects = this.recordCitationGraphDirtyEffects({
        transactionId,
        source: "synthesis.index_review",
        literatureItemId,
        affectedReferenceInstanceIds: indexSummary.affectedReferenceInstanceIds,
        diagnostics,
        timestamp,
      });
      dirtyEventIds.push(...graphDirtyEffects.map((entry) => entry.eventId));
      return {
        transactionId,
        reviewItemId,
        action,
        literatureItemId,
        ...(targetLiteratureItemId ? { targetLiteratureItemId } : {}),
        indexSummary,
        graphDirtyEffects,
        dirtyEventIds,
        diagnostics: [
          ...diagnostics,
          actionDiagnostic({
            code: "citation_graph_structure_dirty_recorded",
            message:
              "Citation graph structure dirty effects were recorded transactionally.",
            details: {
              event_ids: graphDirtyEffects.map((entry) => entry.eventId),
            },
          }),
        ],
      };
    });
  }

  recordCitationGraphDirtyEffects(args: {
    transactionId: string;
    source: string;
    literatureItemId?: string;
    affectedReferenceInstanceIds?: string[];
    diagnostics?: SynthesisReviewActionDiagnostic[];
    timestamp: string;
  }): SynthesisReviewActionDirtyEffect[] {
    const referenceScopes = uniqueCleanStrings(
      args.affectedReferenceInstanceIds || [],
    ).map((referenceInstanceId) => ({
      scopeKind: "reference_instance",
      scopeRef: referenceInstanceId,
    }));
    const scopes = referenceScopes.length
      ? referenceScopes
      : uniqueCleanStrings([args.literatureItemId]).map((literatureItemId) => ({
          scopeKind: "literature_item",
          scopeRef: literatureItemId,
        }));
    const effects: SynthesisReviewActionDirtyEffect[] = [];
    for (const scope of scopes) {
      const eventId = `dirty:citation-graph-structure:${stableShortKey({
        transactionId: args.transactionId,
        scope,
      })}`;
      this.upsertDirtyEvent({
        eventId,
        eventType: "citation_graph_structure_dirty",
        source: cleanString(args.source) || "synthesis.review_action",
        scopeKind: scope.scopeKind,
        scopeRef: scope.scopeRef,
        sourceHash: stableShortKey({
          transactionId: args.transactionId,
          scope,
        }),
        status: "queued",
        diagnosticsJson: JSON.stringify([
          ...(args.diagnostics || []),
          actionDiagnostic({
            code: "citation_graph_structure_dirty_recorded",
            message:
              "Citation graph structure must be refreshed for this bounded scope.",
            details: {
              scope_kind: scope.scopeKind,
              scope_ref: scope.scopeRef,
              transaction_id: args.transactionId,
            },
          }),
        ]),
        createdAt: args.timestamp,
        updatedAt: args.timestamp,
      });
      effects.push({
        eventId,
        eventType: "citation_graph_structure_dirty",
        scopeKind: scope.scopeKind,
        scopeRef: scope.scopeRef,
      });
    }
    return effects;
  }

  private literatureItemIdFromPaperRef(value: unknown) {
    const paperRef = cleanString(value);
    if (!paperRef) {
      return "";
    }
    const binding = this.listZoteroBindings().find(
      (entry) => `${entry.libraryId}:${entry.itemKey}` === paperRef,
    );
    return binding?.literatureItemId || "";
  }

  private closeReview(args: {
    review: SynthesisReviewItemRecord;
    status: string;
    payload: Record<string, unknown>;
    action: string;
    timestamp: string;
  }) {
    this.upsertReviewItem({
      ...args.review,
      status: args.status,
      blockedByReviewItemId: "",
      payloadJson: JSON.stringify({
        ...args.payload,
        action: args.action,
        resolved_at: args.timestamp,
      }),
      diagnosticsJson: JSON.stringify([
        ...parseJsonArray(args.review.diagnosticsJson),
        {
          code: "index_review_action",
          action: args.action,
          applied_at: args.timestamp,
        },
      ]),
      updatedAt: args.timestamp,
    });
  }

  private dependentReferenceReviews(args: {
    literatureItemId: string;
    blockedByReviewItemId?: string;
  }) {
    const referencesById = new Map(
      this.listReferenceInstances().map(
        (entry) => [entry.referenceInstanceId, entry] as const,
      ),
    );
    const resolutionsByReferenceId = new Map(
      this.listReferenceResolutions().map(
        (entry) => [entry.referenceInstanceId, entry] as const,
      ),
    );
    return this.listReviewItems({ reviewKind: "reference_resolution" }).filter(
      (review) => {
        if (
          args.blockedByReviewItemId &&
          review.blockedByReviewItemId === args.blockedByReviewItemId
        ) {
          return true;
        }
        const payload = parseJsonObject(review.payloadJson);
        const scopeRef = cleanString(review.scopeRef || payload.scope_ref);
        const reference = referencesById.get(scopeRef);
        const resolution = resolutionsByReferenceId.get(scopeRef);
        return (
          reference?.sourceLiteratureItemId === args.literatureItemId ||
          resolution?.targetLiteratureItemId === args.literatureItemId ||
          cleanString(payload.target_literature_item_id) ===
            args.literatureItemId
        );
      },
    );
  }

  private unblockDependentReviews(args: {
    reviewItemId: string;
    status?: string;
    timestamp: string;
  }) {
    for (const dependent of this.listReviewItems().filter(
      (review) => review.blockedByReviewItemId === args.reviewItemId,
    )) {
      const payload = parseJsonObject(dependent.payloadJson);
      this.upsertReviewItem({
        ...dependent,
        status: args.status || "open",
        blockedByReviewItemId: "",
        payloadJson: JSON.stringify({
          ...payload,
          dependency_resolved_at: args.timestamp,
        }),
        updatedAt: args.timestamp,
      });
    }
  }

  private confirmDeleteReview(args: {
    review: SynthesisReviewItemRecord;
    payload: Record<string, unknown>;
    literatureItemId: string;
    timestamp: string;
  }): InternalReviewActionEffect {
    const bindings = this.listZoteroBindings().filter(
      (binding) => binding.literatureItemId === args.literatureItemId,
    );
    for (const binding of bindings) {
      this.upsertZoteroBinding({
        ...binding,
        bindingStatus: "deleted_confirmed",
        deletedAt: args.timestamp,
        updatedAt: args.timestamp,
      });
    }
    const item = this.getLiteratureItem(args.literatureItemId);
    if (item) {
      this.upsertLiteratureItem({
        ...item,
        status: "unavailable",
        updatedAt: args.timestamp,
      });
    }
    const artifacts = this.listArtifactStates({
      literatureItemIds: [args.literatureItemId],
    });
    for (const artifact of artifacts) {
      this.upsertArtifactState({
        ...artifact,
        status: "unavailable",
        diagnosticsJson: JSON.stringify([
          ...parseJsonArray(artifact.diagnosticsJson),
          { code: "zotero_binding_deleted_confirmed" },
        ]),
        updatedAt: args.timestamp,
      });
    }
    const dependents = this.dependentReferenceReviews({
      literatureItemId: args.literatureItemId,
      blockedByReviewItemId: args.review.reviewItemId,
    });
    for (const dependent of dependents) {
      const payload = parseJsonObject(dependent.payloadJson);
      this.upsertReviewItem({
        ...dependent,
        status: "superseded",
        blockedByReviewItemId: "",
        payloadJson: JSON.stringify({
          ...payload,
          superseded_by_review_item_id: args.review.reviewItemId,
          superseded_at: args.timestamp,
        }),
        updatedAt: args.timestamp,
      });
    }
    this.closeReview({
      review: args.review,
      status: "resolved",
      payload: args.payload,
      action: "confirm_delete_item",
      timestamp: args.timestamp,
    });
    return {
      affectedLiteratureItemIds: [args.literatureItemId],
      affectedReferenceInstanceIds: uniqueCleanStrings(
        dependents.map((entry) => entry.scopeRef),
      ),
      affectedReviewItemIds: dependents.map((entry) => entry.reviewItemId),
      affectedArtifactLiteratureItemIds: artifacts.map(
        (entry) => entry.literatureItemId,
      ),
      diagnostics: [
        actionDiagnostic({
          code: "zotero_delete_domain_facts_updated",
          message:
            "Zotero binding, literature item, artifact state, and dependent reviews were updated.",
          details: {
            binding_count: bindings.length,
            artifact_count: artifacts.length,
            dependent_review_count: dependents.length,
          },
        }),
      ],
    };
  }

  private applyDedupeMergeReview(args: {
    review: SynthesisReviewItemRecord;
    payload: Record<string, unknown>;
    literatureItemId: string;
    targetLiteratureItemId: string;
    timestamp: string;
  }): InternalReviewActionEffect {
    const target = this.getLiteratureItem(args.targetLiteratureItemId);
    if (!target || normalizeLiteratureStatus(target.status) !== "active") {
      throw new Error("dedupe merge target literature item is not active");
    }
    this.upsertRedirect({
      redirectId: `redirect:${stableShortKey({
        from: args.literatureItemId,
        to: args.targetLiteratureItemId,
        reason: "zotero_dedupe",
      })}`,
      fromLiteratureItemId: args.literatureItemId,
      toLiteratureItemId: args.targetLiteratureItemId,
      reason: "zotero_dedupe",
      diagnosticsJson: JSON.stringify([]),
      createdAt: args.timestamp,
      updatedAt: args.timestamp,
    });
    const item = this.getLiteratureItem(args.literatureItemId);
    if (item) {
      this.upsertLiteratureItem({
        ...item,
        status: "tombstoned",
        updatedAt: args.timestamp,
      });
    }
    for (const binding of this.listZoteroBindings().filter(
      (entry) => entry.literatureItemId === args.literatureItemId,
    )) {
      this.upsertZoteroBinding({
        ...binding,
        bindingStatus: "merged",
        deletedAt: args.timestamp,
        updatedAt: args.timestamp,
      });
    }
    const retargetedResolutions = this.listReferenceResolutions().filter(
      (entry) => entry.targetLiteratureItemId === args.literatureItemId,
    );
    for (const resolution of retargetedResolutions) {
      this.upsertReferenceResolution({
        ...resolution,
        targetLiteratureItemId: args.targetLiteratureItemId,
        diagnosticsJson: JSON.stringify([
          ...parseJsonArray(resolution.diagnosticsJson),
          {
            code: "reference_resolution_retargeted_by_dedupe",
            from_literature_item_id: args.literatureItemId,
            to_literature_item_id: args.targetLiteratureItemId,
          },
        ]),
        updatedAt: args.timestamp,
      });
    }
    const dependents = this.dependentReferenceReviews({
      literatureItemId: args.literatureItemId,
      blockedByReviewItemId: args.review.reviewItemId,
    });
    for (const dependent of dependents) {
      const payload = parseJsonObject(dependent.payloadJson);
      this.upsertReviewItem({
        ...dependent,
        status: "open",
        blockedByReviewItemId: "",
        payloadJson: JSON.stringify({
          ...payload,
          target_literature_item_id:
            cleanString(payload.target_literature_item_id) ===
            args.literatureItemId
              ? args.targetLiteratureItemId
              : payload.target_literature_item_id,
          retargeted_from_literature_item_id: args.literatureItemId,
          retargeted_at: args.timestamp,
        }),
        updatedAt: args.timestamp,
      });
    }
    this.closeReview({
      review: args.review,
      status: "resolved",
      payload: {
        ...args.payload,
        surviving_literature_item_id: args.targetLiteratureItemId,
      },
      action: "mark_as_dedupe_merge",
      timestamp: args.timestamp,
    });
    return {
      affectedLiteratureItemIds: [
        args.literatureItemId,
        args.targetLiteratureItemId,
      ],
      affectedReferenceInstanceIds: [
        ...retargetedResolutions.map((entry) => entry.referenceInstanceId),
        ...uniqueCleanStrings(dependents.map((entry) => entry.scopeRef)),
      ],
      affectedReviewItemIds: dependents.map((entry) => entry.reviewItemId),
      diagnostics: [
        actionDiagnostic({
          code: "zotero_dedupe_domain_facts_updated",
          message:
            "Redirect, tombstone, binding, reference resolution, and dependent review rows were updated.",
          details: {
            retargeted_resolution_count: retargetedResolutions.length,
            dependent_review_count: dependents.length,
          },
        }),
      ],
    };
  }

  private deferIndexReview(args: {
    review: SynthesisReviewItemRecord;
    payload: Record<string, unknown>;
    literatureItemId: string;
    timestamp: string;
  }): InternalReviewActionEffect {
    const dependents = this.dependentReferenceReviews({
      literatureItemId: args.literatureItemId,
      blockedByReviewItemId: args.review.reviewItemId,
    });
    const item = this.getLiteratureItem(args.literatureItemId);
    if (item && item.status === "pending_delete_review") {
      this.upsertLiteratureItem({
        ...item,
        status: "active",
        updatedAt: args.timestamp,
      });
    }
    this.closeReview({
      review: args.review,
      status: "deferred",
      payload: args.payload,
      action: "keep_for_now",
      timestamp: args.timestamp,
    });
    this.unblockDependentReviews({
      reviewItemId: args.review.reviewItemId,
      timestamp: args.timestamp,
    });
    return {
      affectedLiteratureItemIds: [args.literatureItemId],
      affectedReferenceInstanceIds: uniqueCleanStrings(
        dependents.map((entry) => entry.scopeRef),
      ),
      affectedReviewItemIds: dependents.map((entry) => entry.reviewItemId),
      diagnostics: [
        actionDiagnostic({
          code: "index_review_deferred",
          message: "Index review was deferred and dependent reviews unblocked.",
          details: { dependent_review_count: dependents.length },
        }),
      ],
    };
  }

  private deleteCitationRowsForSource(sourceLiteratureItemIdRaw: string) {
    const sourceLiteratureItemId = cleanString(sourceLiteratureItemIdRaw);
    if (!sourceLiteratureItemId) {
      return;
    }
    this.db.run(
      `
        DELETE FROM synt_citation_incoming_group
        WHERE source_literature_item_id=@source_literature_item_id
      `,
      { source_literature_item_id: sourceLiteratureItemId },
    );
    this.db.run(
      `
        DELETE FROM synt_citation_source_ownership
        WHERE source_literature_item_id=@source_literature_item_id
      `,
      { source_literature_item_id: sourceLiteratureItemId },
    );
    this.db.run(
      `
        DELETE FROM synt_citation_edge
        WHERE source_literature_item_id=@source_literature_item_id
      `,
      { source_literature_item_id: sourceLiteratureItemId },
    );
  }

  private citationEdgeForReference(args: {
    reference: SynthesisReferenceInstanceRecord;
    resolution?: SynthesisReferenceResolutionRecord;
    timestamp: string;
  }): SynthesisCitationEdgeRecord {
    const edgeStatus = this.citationEdgeStatus(args.resolution);
    return {
      edgeId: `edge:${stableShortKey({
        source: args.reference.sourceLiteratureItemId,
        reference: args.reference.referenceInstanceId,
      })}`,
      sourceLiteratureItemId: args.reference.sourceLiteratureItemId,
      targetLiteratureItemId:
        edgeStatus === "ignored" ? "" : args.resolution?.targetLiteratureItemId,
      referenceInstanceId: args.reference.referenceInstanceId,
      resolutionId: args.resolution?.resolutionId,
      edgeStatus,
      rolesJson: "[]",
      weight: 1,
      createdAt: args.reference.createdAt || args.timestamp,
      updatedAt: args.timestamp,
    };
  }

  private citationEdgeStatus(resolution?: SynthesisReferenceResolutionRecord) {
    const status = cleanString(resolution?.status);
    if (status === "ignored") {
      return "ignored";
    }
    if (status === "ambiguous") {
      return "ambiguous";
    }
    if (
      status === "blocked_by_review" ||
      status === "blocked_by_upstream_review"
    ) {
      return "blocked_by_review";
    }
    if (
      status === "matched" &&
      cleanString(resolution?.targetLiteratureItemId)
    ) {
      return "matched";
    }
    return "unresolved";
  }

  private upsertCitationNodes(literatureItemIds: string[], timestamp: string) {
    const ids = new Set(literatureItemIds.map(cleanString).filter(Boolean));
    const bindingsByItem = new Map<string, SynthesisZoteroBindingRecord[]>();
    for (const binding of this.listZoteroBindings()) {
      const bucket = bindingsByItem.get(binding.literatureItemId) || [];
      bucket.push(binding);
      bindingsByItem.set(binding.literatureItemId, bucket);
    }
    for (const item of this.listLiteratureItems()) {
      if (!ids.has(item.literatureItemId)) {
        continue;
      }
      const bindings = bindingsByItem.get(item.literatureItemId) || [];
      this.upsertCitationNode({
        literatureItemId: item.literatureItemId,
        nodeStatus:
          item.status === "pending_delete_review"
            ? "review-blocked"
            : normalizeLiteratureStatus(item.status),
        hasZoteroBinding: bindings.some(
          (binding) => binding.bindingStatus === "active",
        ),
        title: item.displayTitle,
        year: item.year,
        summaryJson: JSON.stringify({
          literature_status: normalizeLiteratureStatus(item.status),
          zotero_binding_statuses: bindings
            .map((binding) => binding.bindingStatus || "active")
            .sort(),
        }),
        updatedAt: timestamp,
      });
    }
  }

  private recomputeCitationLightMetrics(
    literatureItemIds: string[],
    timestamp: string,
  ) {
    const ids = new Set(literatureItemIds.map(cleanString).filter(Boolean));
    const edges = this.listCitationEdges();
    const structureVersion = Math.max(
      0,
      Math.floor(Date.parse(timestamp) || 0),
    );
    for (const literatureItemId of ids) {
      const outgoing = edges.filter(
        (edge) => edge.sourceLiteratureItemId === literatureItemId,
      );
      const effectiveOutgoing = outgoing.filter(
        (edge) => edge.edgeStatus !== "ignored",
      );
      const incoming = edges.filter(
        (edge) =>
          edge.targetLiteratureItemId === literatureItemId &&
          edge.edgeStatus !== "ignored",
      );
      this.upsertCitationLightMetrics({
        literatureItemId,
        outgoingCount: effectiveOutgoing.length,
        incomingCount: incoming.length,
        matchedOutgoingCount: outgoing.filter(
          (edge) => edge.edgeStatus === "matched",
        ).length,
        unresolvedOutgoingCount: outgoing.filter(
          (edge) => edge.edgeStatus === "unresolved",
        ).length,
        ambiguousOutgoingCount: outgoing.filter(
          (edge) => edge.edgeStatus === "ambiguous",
        ).length,
        localDegree: effectiveOutgoing.length + incoming.length,
        sourceStructureVersion: structureVersion,
        updatedAt: timestamp,
      });
    }
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

  getLiteratureItem(literatureItemIdRaw: string) {
    this.initialize();
    const literatureItemId = cleanString(literatureItemIdRaw);
    if (!literatureItemId) {
      return null;
    }
    return rowToLiteratureItem(
      this.db.get(
        `
          SELECT *
          FROM synt_literature_item
          WHERE literature_item_id=@literature_item_id
          LIMIT 1
        `,
        {
          literature_item_id: literatureItemId,
        },
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
