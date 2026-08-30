import {
  assertSynthesisExactFields,
  SynthesisClientError,
  toSynthesisJsonObject,
} from "./common";
import { byteLengthSynthesisContractText } from "./canonicalJson";
import type {
  SynthesisDeliveryContext,
  SynthesisJsonObject,
  SynthesisJsonValue,
} from "./common";
import type {
  SynthesisCitationAnalysisArtifact,
  SynthesisDigestArtifact,
  SynthesisLiteratureMatchingMetadata,
  SynthesisLiteratureScore,
  SynthesisMatchedReference,
  SynthesisReferencesArtifact,
  SynthesisTopicMetadata,
  SynthesisTopicResultBundle,
  SynthesisWorkflowSource,
} from "./topicDomain";
import type {
  LiteratureQualitySnapshot,
  SynthesisPaperArtifactType,
} from "./literatureArtifacts.js";
import type { SynthesisTopicApplicationApplyResult } from "./topicApplication";
import {
  rebuildSynthesisProtocolCapabilityDto,
  rebuildSynthesisProtocolDto,
  SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
} from "./protocolSchema";
import type {
  SynthesisWorkbenchPaperDigestReadRequest,
  SynthesisWorkbenchPaperDigestResult,
} from "./workbench";

export type SynthesisWorkflowItemSnapshot = {
  libraryId: number;
  itemKey: string;
  paperRef: string;
  itemType: string;
  title: string;
  year: string;
  date: string;
  creators: string[];
  tags: string[];
  collections: string[];
  doi: string;
  arxiv: string;
  isbn: string;
  url: string;
  citekey: string;
  dateAdded: string;
};

export type SynthesisLiteratureDigestApplyRequest =
  SynthesisWorkflowItemSnapshot & {
    digest?: SynthesisDigestArtifact;
    references?: SynthesisReferencesArtifact;
    citationAnalysis?: SynthesisCitationAnalysisArtifact;
    literatureScore?: SynthesisLiteratureScore;
    literatureMatchingMetadata?: SynthesisLiteratureMatchingMetadata;
    matchedReferences?: SynthesisMatchedReference[];
    source?: SynthesisWorkflowSource;
  };

export type SynthesisMaterializedAsset = {
  id: string;
  mediaType: "application/json" | "text/markdown" | "text/plain";
  text: string;
};

export type SynthesisTopicApplyRequest = {
  bundle: SynthesisTopicResultBundle;
  assets: SynthesisMaterializedAsset[];
};

export type SynthesisTopicApplyResult = SynthesisTopicApplicationApplyResult;

export type SynthesisTopicPlanActionDto = {
  action: "create" | "update" | "mark_stale" | "reactivate";
  topic_id: string;
  title?: string;
  definition?: string;
  aliases?: string[];
  scope?: { include: string[]; exclude: string[] };
  resolver?: SynthesisJsonObject;
  revision?: number;
  basis?: SynthesisJsonValue[];
  provenance?: SynthesisJsonValue[];
};

export type SynthesisTopicRelationProposalDto = {
  source_topic_id: string;
  target_topic_id: string;
  relation: "broader_than" | "related_to" | "overlaps_with" | "contrasts_with";
  status?: "suggested" | "confirmed" | "rejected";
  confidence?: number;
  provenance?: SynthesisJsonValue[];
  evidence_refs?: SynthesisJsonValue[];
};

export type SynthesisTopicPlanApplyRequest = {
  kind: "topic_plan";
  operation: "reconcile";
  base_graph_hash: string;
  library_index_hash: string;
  topic_actions: SynthesisTopicPlanActionDto[];
  relation_proposals: SynthesisTopicRelationProposalDto[];
  coverage_manifest_path?: string;
  recommended_updates: string[];
};

export type SynthesisTopicPlanDiagnosticDto = {
  code:
    | "topic_action_noop"
    | "topic_revision_conflict"
    | "relation_duplicate"
    | "relation_endpoint_missing"
    | "relation_cycle"
    | "coverage_stale";
  message: string;
  source_topic_id?: string;
  target_topic_id?: string;
};

export type SynthesisCanonicalTransactionReceipt = {
  schema: "zotero-agents.synthesis-canonical-transaction-receipt.v1";
  transaction_id: string;
  operation: "topic_plan.reconcile";
  before_graph_hash: string;
  after_graph_hash: string;
  committed_at: string;
};

export type SynthesisTopicPlanApplyResult = {
  status: "persisted" | "no_change" | "already_applied" | "conflict";
  graph_hash: string;
  coverage_stale: boolean;
  recommended_updates: string[];
  diagnostics: SynthesisTopicPlanDiagnosticDto[];
  receipt: SynthesisCanonicalTransactionReceipt | null;
};

const TOPIC_PLAN_ACTION_LIMIT = 10_000;
const TOPIC_PLAN_RELATION_LIMIT = 20_000;
const TOPIC_PLAN_SERIALIZED_LIMIT = 64 * 1024 * 1024;

function invalidTopicPlan(location: string): never {
  throw new SynthesisClientError(
    "invalid_request",
    `Topic plan contract is invalid at ${location}`,
    { location },
  );
}

function boundedTopicPlanString(
  value: SynthesisJsonValue | undefined,
  location: string,
  maximum = 4096,
) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    invalidTopicPlan(location);
  }
  return value;
}

function topicPlanStringArray(
  value: SynthesisJsonValue | undefined,
  location: string,
  maximum = TOPIC_PLAN_ACTION_LIMIT,
) {
  if (!Array.isArray(value) || value.length > maximum) {
    invalidTopicPlan(location);
  }
  return value.map((entry, index) =>
    boundedTopicPlanString(entry, `${location}[${index}]`),
  );
}

function topicPlanJsonArray(
  value: SynthesisJsonValue | undefined,
  location: string,
) {
  if (!Array.isArray(value)) invalidTopicPlan(location);
  return value;
}

function rebuildTopicPlanAction(value: unknown, index: number) {
  const location = `topicPlan.topic_actions[${index}]`;
  const action = toSynthesisJsonObject(value, location);
  assertSynthesisExactFields(
    action,
    ["action", "topic_id"],
    [
      "title",
      "definition",
      "aliases",
      "scope",
      "resolver",
      "revision",
      "basis",
      "provenance",
    ],
    location,
  );
  if (
    action.action !== "create" &&
    action.action !== "update" &&
    action.action !== "mark_stale" &&
    action.action !== "reactivate"
  ) {
    invalidTopicPlan(`${location}.action`);
  }
  boundedTopicPlanString(action.topic_id, `${location}.topic_id`);
  for (const field of ["title", "definition"] as const) {
    if (action[field] !== undefined) {
      boundedTopicPlanString(action[field], `${location}.${field}`, 16_384);
    }
  }
  if (action.aliases !== undefined) {
    topicPlanStringArray(action.aliases, `${location}.aliases`, 1_000);
  }
  if (action.scope !== undefined) {
    const scope = toSynthesisJsonObject(action.scope, `${location}.scope`);
    assertSynthesisExactFields(
      scope,
      ["include", "exclude"],
      [],
      `${location}.scope`,
    );
    topicPlanStringArray(scope.include, `${location}.scope.include`, 10_000);
    topicPlanStringArray(scope.exclude, `${location}.scope.exclude`, 10_000);
  }
  if (action.resolver !== undefined) {
    toSynthesisJsonObject(action.resolver, `${location}.resolver`);
  }
  if (
    action.revision !== undefined &&
    (!Number.isSafeInteger(action.revision) || Number(action.revision) < 0)
  ) {
    invalidTopicPlan(`${location}.revision`);
  }
  for (const field of ["basis", "provenance"] as const) {
    if (action[field] !== undefined) {
      topicPlanJsonArray(action[field], `${location}.${field}`);
    }
  }
  return action as unknown as SynthesisTopicPlanActionDto;
}

function rebuildTopicPlanRelation(value: unknown, index: number) {
  const location = `topicPlan.relation_proposals[${index}]`;
  const relation = toSynthesisJsonObject(value, location);
  assertSynthesisExactFields(
    relation,
    ["source_topic_id", "target_topic_id", "relation"],
    ["status", "confidence", "provenance", "evidence_refs"],
    location,
  );
  boundedTopicPlanString(
    relation.source_topic_id,
    `${location}.source_topic_id`,
  );
  boundedTopicPlanString(
    relation.target_topic_id,
    `${location}.target_topic_id`,
  );
  if (
    relation.relation !== "broader_than" &&
    relation.relation !== "related_to" &&
    relation.relation !== "overlaps_with" &&
    relation.relation !== "contrasts_with"
  ) {
    invalidTopicPlan(`${location}.relation`);
  }
  if (
    relation.status !== undefined &&
    relation.status !== "suggested" &&
    relation.status !== "confirmed" &&
    relation.status !== "rejected"
  ) {
    invalidTopicPlan(`${location}.status`);
  }
  if (
    relation.confidence !== undefined &&
    (typeof relation.confidence !== "number" ||
      relation.confidence < 0 ||
      relation.confidence > 1)
  ) {
    invalidTopicPlan(`${location}.confidence`);
  }
  for (const field of ["provenance", "evidence_refs"] as const) {
    if (relation[field] !== undefined) {
      topicPlanJsonArray(relation[field], `${location}.${field}`);
    }
  }
  return relation as unknown as SynthesisTopicRelationProposalDto;
}

export function rebuildSynthesisTopicPlanApplyRequest(
  value: unknown,
): SynthesisTopicPlanApplyRequest {
  const request = toSynthesisJsonObject(value, "topicPlan");
  assertSynthesisExactFields(
    request,
    [
      "kind",
      "operation",
      "base_graph_hash",
      "library_index_hash",
      "topic_actions",
      "relation_proposals",
      "recommended_updates",
    ],
    ["coverage_manifest_path"],
    "topicPlan",
  );
  if (request.kind !== "topic_plan") invalidTopicPlan("topicPlan.kind");
  if (request.operation !== "reconcile") {
    invalidTopicPlan("topicPlan.operation");
  }
  boundedTopicPlanString(request.base_graph_hash, "topicPlan.base_graph_hash");
  boundedTopicPlanString(
    request.library_index_hash,
    "topicPlan.library_index_hash",
  );
  if (
    !Array.isArray(request.topic_actions) ||
    request.topic_actions.length > TOPIC_PLAN_ACTION_LIMIT
  ) {
    invalidTopicPlan("topicPlan.topic_actions");
  }
  if (
    !Array.isArray(request.relation_proposals) ||
    request.relation_proposals.length > TOPIC_PLAN_RELATION_LIMIT
  ) {
    invalidTopicPlan("topicPlan.relation_proposals");
  }
  request.topic_actions = request.topic_actions.map(rebuildTopicPlanAction);
  request.relation_proposals = request.relation_proposals.map(
    rebuildTopicPlanRelation,
  );
  if (request.coverage_manifest_path !== undefined) {
    boundedTopicPlanString(
      request.coverage_manifest_path,
      "topicPlan.coverage_manifest_path",
      16_384,
    );
  }
  request.recommended_updates = topicPlanStringArray(
    request.recommended_updates,
    "topicPlan.recommended_updates",
  );
  if (
    byteLengthSynthesisContractText(JSON.stringify(request)) >
    TOPIC_PLAN_SERIALIZED_LIMIT
  ) {
    invalidTopicPlan("topicPlan");
  }
  return request as unknown as SynthesisTopicPlanApplyRequest;
}

export function rebuildSynthesisTopicPlanApplyResult(
  value: unknown,
): SynthesisTopicPlanApplyResult {
  const result = toSynthesisJsonObject(value, "topicPlanResult");
  assertSynthesisExactFields(
    result,
    [
      "status",
      "graph_hash",
      "coverage_stale",
      "recommended_updates",
      "diagnostics",
      "receipt",
    ],
    [],
    "topicPlanResult",
  );
  if (
    result.status !== "persisted" &&
    result.status !== "no_change" &&
    result.status !== "already_applied" &&
    result.status !== "conflict"
  ) {
    invalidTopicPlan("topicPlanResult.status");
  }
  boundedTopicPlanString(result.graph_hash, "topicPlanResult.graph_hash");
  if (typeof result.coverage_stale !== "boolean") {
    invalidTopicPlan("topicPlanResult.coverage_stale");
  }
  result.recommended_updates = topicPlanStringArray(
    result.recommended_updates,
    "topicPlanResult.recommended_updates",
  );
  if (!Array.isArray(result.diagnostics)) {
    invalidTopicPlan("topicPlanResult.diagnostics");
  }
  result.diagnostics = result.diagnostics.map((value, index) => {
    const location = `topicPlanResult.diagnostics[${index}]`;
    const diagnostic = toSynthesisJsonObject(value, location);
    assertSynthesisExactFields(
      diagnostic,
      ["code", "message"],
      ["source_topic_id", "target_topic_id"],
      location,
    );
    if (
      diagnostic.code !== "topic_action_noop" &&
      diagnostic.code !== "topic_revision_conflict" &&
      diagnostic.code !== "relation_duplicate" &&
      diagnostic.code !== "relation_endpoint_missing" &&
      diagnostic.code !== "relation_cycle" &&
      diagnostic.code !== "coverage_stale"
    ) {
      invalidTopicPlan(`${location}.code`);
    }
    boundedTopicPlanString(diagnostic.message, `${location}.message`, 16_384);
    for (const field of ["source_topic_id", "target_topic_id"] as const) {
      if (diagnostic[field] !== undefined) {
        boundedTopicPlanString(diagnostic[field], `${location}.${field}`);
      }
    }
    return diagnostic;
  });
  if (result.receipt !== null) {
    const receipt = toSynthesisJsonObject(
      result.receipt,
      "topicPlanResult.receipt",
    );
    assertSynthesisExactFields(
      receipt,
      [
        "schema",
        "transaction_id",
        "operation",
        "before_graph_hash",
        "after_graph_hash",
        "committed_at",
      ],
      [],
      "topicPlanResult.receipt",
    );
    if (
      receipt.schema !==
        "zotero-agents.synthesis-canonical-transaction-receipt.v1" ||
      receipt.operation !== "topic_plan.reconcile"
    ) {
      invalidTopicPlan("topicPlanResult.receipt");
    }
    for (const field of [
      "transaction_id",
      "before_graph_hash",
      "after_graph_hash",
      "committed_at",
    ] as const) {
      boundedTopicPlanString(
        receipt[field],
        `topicPlanResult.receipt.${field}`,
      );
    }
    result.receipt = receipt;
  }
  if ((result.status === "persisted") !== (result.receipt !== null)) {
    invalidTopicPlan("topicPlanResult.receipt");
  }
  return result as unknown as SynthesisTopicPlanApplyResult;
}

export type SynthesisLiteratureDigestApplyResult = {
  ok: boolean;
  status: "sidecar_applied";
  sourceRef: string;
  source_ref: string;
  paperRef: string;
  reference_count: number;
  input_reference_count: number;
  rejected_reference_count: number;
  warning_reference_count: number;
  matched_count: number;
  decision_count: number;
  stale_canonical_governance: {
    affected: number;
    autoRedirected: number;
    autoStaled: number;
    proposalsCreated: number;
    blocked: number;
  };
  operationId: string;
  idempotent: boolean;
};

export function rebuildSynthesisLiteratureDigestApplyRequest(
  value: unknown,
): SynthesisLiteratureDigestApplyRequest {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "LiteratureDigestPayload",
    value,
    direction: "request",
  });
}

export function rebuildSynthesisLiteratureDigestApplyResult(
  value: unknown,
): SynthesisLiteratureDigestApplyResult {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "ApplyLiteratureDigestSidecarResult",
    value,
    direction: "result",
  });
}

export function rebuildSynthesisTopicApplyRequest(
  value: unknown,
): SynthesisTopicApplyRequest {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "TopicApplyPayload",
    value,
    direction: "request",
  });
}

export function rebuildSynthesisTopicApplyResult(
  value: unknown,
): SynthesisTopicApplyResult {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "ApplyTopicSynthesisResultResult",
    value,
    direction: "result",
  });
}

export interface SynthesisWorkflowApplyClient {
  applyLiteratureDigestSidecar(
    request: SynthesisLiteratureDigestApplyRequest,
  ): Promise<SynthesisLiteratureDigestApplyResult>;
  applyTopicPlan(
    request: SynthesisTopicPlanApplyRequest,
  ): Promise<SynthesisTopicPlanApplyResult>;
  applyTopicSynthesisResult(
    request: SynthesisTopicApplyRequest,
  ): Promise<SynthesisTopicApplyResult>;
}

export type SynthesisTopicReportRequest = {
  topicId: string;
};

export type SynthesisTopicReportResult = {
  ok: boolean;
  status: "available" | "not_found";
  topic_id: string;
  title?: string;
  format: "markdown";
  markdown: string;
  source?: SynthesisWorkflowSource;
  metadata?: SynthesisTopicMetadata;
  diagnostics: string[];
};

export function rebuildSynthesisTopicReportResult(
  value: unknown,
): SynthesisTopicReportResult {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "GetTopicReportResult",
    value,
    direction: "result",
  });
}

export type SynthesisPaperArtifactsRequest = {
  paper_refs: string[];
  artifact_types?: string[];
};

export type SynthesisPaperArtifactRow = {
  paper_ref: string;
  artifact_type: SynthesisPaperArtifactType;
  payload_type: string;
  status: "available" | "missing" | "invalid" | "unavailable";
  payload_hash?: string;
  payload?: import("./common.js").SynthesisOpaqueCanonicalJson;
  markdown?: string;
  decoded_text?: string;
  literature_quality?: LiteratureQualitySnapshot;
  payload_types_seen: string[];
  diagnostics: string[];
};

export type SynthesisPaperArtifactsResult = {
  artifacts: SynthesisPaperArtifactRow[];
  diagnostics: string[];
  total?: number;
};

export type SynthesisArtifactQueryRequest = {
  paper_refs?: string[];
  artifact_types?: SynthesisPaperArtifactType[];
  run_root?: string;
};

export type SynthesisArtifactDeliveryDescriptor = {
  fileId: string;
  sourceKind: "bridge-export";
  displayName: string;
  contentType: "application/zip";
  size: number;
  sha256: string;
  createdAt: string;
  expiresAt: string;
  owner: {
    capability: "topics.get_context" | "paper_artifacts.export_filtered";
  };
};

export type SynthesisArtifactDeliveryProjection = {
  mode: "bridge-download";
  bundle: SynthesisArtifactDeliveryDescriptor;
  downloadCommand: string;
  unpackHint: string;
};

export type SynthesisArtifactQueryResult = SynthesisPaperArtifactsResult;

export type SynthesisArtifactExportResult = {
  paper_refs: string[];
  paper_ref?: string;
  manifest_file: string;
  artifact_statuses: Array<{
    paper_ref: string;
    artifact_type: string;
    payload_type: string;
    status: string;
    missing_reason: string;
  }>;
  diagnostics: string[];
  delivery?: SynthesisArtifactDeliveryProjection;
};

type SynthesisArtifactCapabilityResultMap = {
  "client.getPaperArtifactManifest": SynthesisArtifactQueryResult;
  "client.readPaperArtifacts": SynthesisPaperArtifactsResult;
  "client.exportFilteredPaperArtifacts": SynthesisArtifactExportResult;
};

export function rebuildSynthesisArtifactCapabilityResult<
  Capability extends keyof SynthesisArtifactCapabilityResultMap,
>(
  capability: Capability,
  value: unknown,
): SynthesisArtifactCapabilityResultMap[Capability] {
  return rebuildSynthesisProtocolCapabilityDto({
    capability,
    direction: "result",
    value,
  });
}

export interface SynthesisArtifactsClient {
  getManifest(
    request?: SynthesisArtifactQueryRequest,
  ): Promise<SynthesisArtifactQueryResult>;
  readPaperArtifacts(
    request: SynthesisPaperArtifactsRequest,
  ): Promise<SynthesisPaperArtifactsResult>;
  exportFiltered(
    request: SynthesisArtifactQueryRequest,
    delivery?: SynthesisDeliveryContext,
  ): Promise<SynthesisArtifactExportResult>;
  resolveTopicPaperDigest(
    request: SynthesisWorkbenchPaperDigestReadRequest,
  ): Promise<SynthesisWorkbenchPaperDigestResult>;
}
