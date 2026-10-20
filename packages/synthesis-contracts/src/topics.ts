import { SynthesisClientError, toSynthesisJsonObject } from "./common";
import topicDomainSchema from "../contract-set/synthesis-sidecar-protocol-v1/schemas/topic-domain.schema.json" with { type: "json" };
import type { SynthesisDeliveryContext } from "./common";
import type { SynthesisJsonObject } from "./common";
import type {
  SynthesisTopicReportRequest,
  SynthesisTopicReportResult,
} from "./workflow";
import type {
  SynthesisResolvedPaperSet,
  SynthesisTopicArtifact,
  SynthesisTopicAuditContext,
  SynthesisTopicDefinition,
  SynthesisTopicDigestContext,
  SynthesisTopicManifest,
  SynthesisTopicMetadata,
  SynthesisTopicProjection,
  SynthesisTopicResolver,
  SynthesisTopicSemanticContext,
} from "./topicDomain";
import {
  rebuildSynthesisHostExportDeliveryResult,
  type SynthesisHostExportDeliveryProjection,
} from "./exportDelivery";
import {
  rebuildSynthesisProtocolDto,
  SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
} from "./protocolSchema";
import type {
  SynthesisTopicSearchRequest,
  SynthesisTopicSearchResult,
} from "./search";

export type SynthesisWorkflowTopicOption = {
  value: string;
  label: string;
  description: string;
  meta: {
    kind: "synthesis.topic" | "synthesis.planned-topic";
    topicId: string;
    title: string;
    status?: string;
    updatedAt?: string;
    actionLabel?: "Update";
    freshness?: SynthesisTopicFreshness;
    sourceMaterialsStatus?: SynthesisTopicSourceMaterialsStatus;
    lifecycle?: "planned";
    revision?: number;
  };
};

export type SynthesisWorkflowTopicOptionsRequest = {
  filter: "all" | "updatable" | "planned";
};

export type SynthesisTopicPlanningContext = SynthesisJsonObject;

export type SynthesisWorkflowTopicOptionsResult = {
  options: SynthesisWorkflowTopicOption[];
  diagnostics: Array<{
    code: string;
    message: string;
  }>;
};

export type SynthesisTopicArtifactDeleteRequest = {
  topicId: string;
};

export type SynthesisTopicDiscoveryHintRequest = {
  hintId: string;
};

export type SynthesisTopicDiscoveryCandidate = {
  hint_id: string;
  topic_id: string;
  literature_item_id: string;
  status: "open" | "rejected";
  updated_at: string;
  title?: string;
  score?: number;
  method?: string;
  reasons?: string[];
  fallback_metadata?: boolean;
  basis_hash?: string;
};

export type SynthesisTopicCommandResult = {
  ok: boolean;
  status: string;
  hint: SynthesisTopicDiscoveryCandidate | null;
  diagnostics: Array<{
    code: string;
    severity?: "info" | "warning" | "error";
  }>;
};
export type SynthesisTopicArtifactDeleteResult =
  | {
      ok: true;
      status: "deleted";
      topicId: string;
      deletedPathId: string;
      warnings?: string[];
    }
  | {
      ok: false;
      status: "not_found";
      topicId: string;
      reason: string;
      warnings?: string[];
    };
export type SynthesisDeletedTopicArtifactsPurgeResult = {
  ok: true;
  status: "purged";
  purged_count: number;
  warnings?: string[];
};
export type SynthesisTopicListRequest = {
  cursor: string;
  limit: number;
};
export type SynthesisTopicFindRequest = { paper_refs: string[] };
export type SynthesisTopicContextView =
  | "digest"
  | "semantic"
  | "audit"
  | "full";
export type SynthesisTopicContextRequest = {
  topicId?: string;
  topic_id?: string;
  view?: SynthesisTopicContextView;
  includeFull?: boolean;
  include_full?: boolean;
  includeMarkdown?: boolean;
  include_markdown?: boolean;
  includeArtifact?: boolean;
  include_artifact?: boolean;
  includeManifest?: boolean;
  include_manifest?: boolean;
  outputPath?: string;
  output_path?: string;
  overwrite?: boolean;
  mode?: string;
  language?: string;
  updateScope?: string;
  update_scope?: string;
  updateMode?: string;
  update_mode?: string;
  updateReason?: string;
  update_reason?: string;
};
export type SynthesisTopicResolverTag = {
  and?: string[];
  or?: string[];
  not?: string[];
};
export type SynthesisTopicResolverRequest = {
  paper_refs: string[];
  collection_key: string[];
  tag?: SynthesisTopicResolverTag;
  combine: "union" | "intersection";
  cursor: number;
  limit: number;
};
export type SynthesisTopicFreshness =
  | "fresh"
  | "stale"
  | "dirty"
  | "queued"
  | "running"
  | "failed"
  | "unknown";

export type SynthesisTopicSourceMaterialsStatus =
  | "complete"
  | "partial"
  | "missing";

export type SynthesisTopicRecord = {
  topic_id: string;
  path_id: string;
  title: string;
  definition: string;
  language: string;
  operation: string;
  manifest_hash: string;
  artifact_hash: string;
  metadata_hash: string;
  bundle_hash: string;
  paper_count: number;
  updated_at: string;
  topic_definition: SynthesisTopicDefinition;
  topic_resolver: SynthesisTopicResolver;
  resolved_paper_set: SynthesisResolvedPaperSet;
  projection: SynthesisTopicProjection;
  freshness: SynthesisTopicFreshness;
  source_materials_status: SynthesisTopicSourceMaterialsStatus;
  source_materials_percent: number;
  stale_reasons: string[];
  dirty_reasons: string[];
  missing_sections: string[];
  id?: string;
  kind?: "topic_synthesis";
  status?: string;
};

export type SynthesisPlannedTopicInventoryRow = {
  topic_id: string;
  title: string;
  definition: string;
  aliases: string[];
  updated_at: string;
  lifecycle: "planned" | "stale";
  planning: SynthesisTopicPlanningMetadata;
  status?: string;
};

export type SynthesisTopicInventoryRow =
  | SynthesisTopicRecord
  | SynthesisPlannedTopicInventoryRow;

export type SynthesisTopicListResult = {
  topics: SynthesisTopicRecord[];
  cursor: string;
  next_cursor: string;
  has_more: boolean;
  returned: number;
  total: number;
  limit: number;
  diagnostics: {
    count: number;
    total_count: number;
    source: "rust-topic-application";
  };
};

export type SynthesisTopicFindRow = {
  topic_id: string;
  title: string;
  status?: string;
  updated_at?: string;
  matched_paper_refs: string[];
  match_sources: string[];
  freshness: SynthesisTopicFreshness;
  source_materials_status: SynthesisTopicSourceMaterialsStatus;
};

export type SynthesisTopicFindResult = {
  ok: boolean;
  status: string;
  paper_refs: string[];
  topics: SynthesisTopicFindRow[];
  diagnostics: {
    requested_count: number;
    matched_topic_count: number;
    unmatched_paper_refs: string[];
    source: string;
    errors?: string[];
  };
};

export type SynthesisTopicPlanningMetadata = {
  lifecycle?: "planned" | "stale" | "materialized";
  scope?: { include: string[]; exclude: string[] };
  resolver?: Partial<SynthesisTopicResolver>;
  revision?: number;
  basis?: Array<string | Record<string, string>>;
  provenance?: Array<string | Record<string, string>>;
  coverage_manifest_path?: string;
};
export type SynthesisPlannedTopicSemanticContext = {
  topic_id: string;
  lifecycle: "planned" | "stale";
  topic_definition: SynthesisTopicDefinition;
  topic_resolver: Partial<SynthesisTopicResolver>;
  planning: SynthesisTopicPlanningMetadata;
};
export type SynthesisPlannedTopicDigestContext = {
  topic_id: string;
  lifecycle: "planned" | "stale";
  title: string;
  definition: string;
  aliases: string[];
  revision: number;
};
export type SynthesisPlannedTopicAuditContext = {
  topic_id: string;
  lifecycle: "planned" | "stale";
  graph_hash: string;
  planning: SynthesisTopicPlanningMetadata;
};
export type SynthesisTopicContextResult = {
  schema_id: "synthesis.topic_context";
  schema_version: "2.0.0";
  topic_id: string;
  status?: "not_found" | "invalid";
  view?: "digest" | "semantic" | "audit" | "full";
  digest?: SynthesisTopicDigestContext | SynthesisPlannedTopicDigestContext;
  semantic?:
    | SynthesisTopicSemanticContext
    | SynthesisPlannedTopicSemanticContext;
  audit?: SynthesisTopicAuditContext | SynthesisPlannedTopicAuditContext;
  diagnostics?: string[];
};

export type SynthesisTopicContextRequestEcho = {
  mode: string;
  language?: string;
  updateScope?: string;
  updateMode?: string;
  updateReason?: string;
};

export type SynthesisHostTopicContextReadResult = Omit<
  SynthesisTopicContextResult,
  "audit"
> & {
  audit?: NonNullable<SynthesisTopicContextResult["audit"]> & {
    request?: SynthesisTopicContextRequestEcho;
  };
};

export type SynthesisTopicContextFlatResult = {
  topic_id: string;
  lifecycle?: "planned" | "stale" | "materialized";
  planning?: SynthesisTopicPlanningMetadata;
  digest?: SynthesisTopicDigestContext | SynthesisPlannedTopicDigestContext;
  audit?: SynthesisTopicAuditContext | SynthesisPlannedTopicAuditContext;
  paths?: Record<string, string>;
  language?: string;
  current_metadata?: SynthesisTopicMetadata;
  current_hashes?: Record<string, string>;
  section_hashes?: Record<string, string>;
  topic_definition?: SynthesisTopicDefinition;
  topic_resolver?: Partial<SynthesisTopicResolver>;
  resolved_paper_set?: SynthesisResolvedPaperSet;
  prospective_topic_relation_proposals?: SynthesisJsonObject[];
  freshness?: SynthesisJsonObject | null;
  discovery_hints?: SynthesisTopicDiscoveryCandidate[];
  recommended_update?: SynthesisTopicProjection["recommendedUpdate"];
  request: SynthesisTopicContextRequestEcho;
  diagnostics: { bounded: true; omitted: string[] };
  markdown?: string;
  artifact?: SynthesisTopicArtifact;
  current_artifact?: SynthesisTopicArtifact;
  manifest?: SynthesisTopicManifest;
  current_manifest?: SynthesisTopicManifest;
};

export type SynthesisTopicContextInventoryResult = {
  topics: SynthesisTopicInventoryRow[];
  cursor: string;
  next_cursor: string;
  has_more: boolean;
  returned: number;
  total: number;
  limit: number;
  diagnostics: {
    count: number;
    total_count: number;
    source: string;
  };
};

export type SynthesisTopicInventoryResult =
  SynthesisTopicContextInventoryResult;

export type SynthesisTopicContextFailureResult = {
  ok: false;
  status: "invalid_request" | "not_found" | "output_exists";
  topic_id: string;
  view?: SynthesisTopicContextView;
  output?: { mode: "file"; path: string };
  diagnostics: string[] | { message: string };
};

export type SynthesisTopicContextOutputResult = {
  schema_id: "synthesis.topic_context.output";
  schema_version: "2.0.0";
  topic_id: string;
  view: SynthesisTopicContextView;
  output: {
    mode: "file" | "bridge-download";
    path: string;
    bytes: number;
    sha256: string;
  };
  delivery?: SynthesisHostExportDeliveryProjection;
  omitted_inline_result: true;
};

export type SynthesisHostTopicContextResult =
  | SynthesisHostTopicContextReadResult
  | SynthesisTopicContextFlatResult
  | SynthesisTopicContextInventoryResult
  | SynthesisTopicContextFailureResult
  | SynthesisTopicContextOutputResult;

export type SynthesisTopicResolverPaper = {
  paper_ref: string;
  item_key: string;
  title: string;
  year: string;
  match_reasons: string[];
};

export type SynthesisTopicResolverResult = {
  ok: boolean;
  errors: string[];
  papers: SynthesisTopicResolverPaper[];
  normalized_resolver: SynthesisTopicResolverRequest | null;
  cursor: string;
  next_cursor: string;
  has_more: boolean;
  returned: number;
  total: number;
  limit: number;
  diagnostics: {
    final_count: number;
    total_candidates: number;
    rejected: boolean;
  };
};

export type SynthesisTopicQueryResult =
  | SynthesisTopicListResult
  | SynthesisTopicFindResult
  | SynthesisTopicContextResult
  | SynthesisTopicResolverResult;

export function rebuildSynthesisTopicListResult(
  value: unknown,
): SynthesisTopicListResult {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "ListTopicsResult",
    value,
    direction: "result",
  });
}

export function rebuildSynthesisTopicFindResult(
  value: unknown,
): SynthesisTopicFindResult {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "FindTopicsByPaperRefResult",
    value,
    direction: "result",
  });
}

export function rebuildSynthesisTopicContextResult(
  value: unknown,
): SynthesisTopicContextResult {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "GetTopicContextResult",
    value,
    direction: "result",
  });
}

function hostContextRequestEcho(
  value: unknown,
): SynthesisTopicContextRequestEcho {
  const object = exactObject(
    value,
    "topicContextRequestEcho",
    ["mode"],
    ["language", "updateScope", "updateMode", "updateReason"],
  );
  if (typeof object.mode !== "string") invalid("topicContextRequestEcho");
  for (const field of [
    "language",
    "updateScope",
    "updateMode",
    "updateReason",
  ]) {
    if (object[field] !== undefined && typeof object[field] !== "string") {
      invalid(`topicContextRequestEcho.${field}`);
    }
  }
  return object as SynthesisTopicContextRequestEcho;
}

export function rebuildSynthesisHostTopicContextResult(
  value: unknown,
): SynthesisHostTopicContextResult {
  const validateField = (definition: string, value: unknown, domain = false) =>
    rebuildSynthesisProtocolDto({
      schemaId: domain
        ? topicDomainSchema.$id
        : SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
      definition,
      value,
      direction: "result",
    });
  const object = exactObject(
    value,
    "synthesisHostTopicContextResult",
    [],
    [
      "schema_id",
      "schema_version",
      "topic_id",
      "status",
      "view",
      "digest",
      "semantic",
      "audit",
      "diagnostics",
      "topics",
      "cursor",
      "next_cursor",
      "has_more",
      "returned",
      "total",
      "limit",
      "ok",
      "output",
      "delivery",
      "omitted_inline_result",
      "paths",
      "language",
      "lifecycle",
      "planning",
      "current_metadata",
      "current_hashes",
      "section_hashes",
      "topic_definition",
      "topic_resolver",
      "resolved_paper_set",
      "prospective_topic_relation_proposals",
      "freshness",
      "discovery_hints",
      "recommended_update",
      "request",
      "markdown",
      "artifact",
      "current_artifact",
      "manifest",
      "current_manifest",
    ],
  );
  if (object.schema_id === "synthesis.topic_context") {
    const audit =
      object.audit &&
      typeof object.audit === "object" &&
      !Array.isArray(object.audit)
        ? (object.audit as Record<string, unknown>)
        : undefined;
    const request = audit?.request;
    const native = JSON.parse(JSON.stringify(object)) as Record<
      string,
      unknown
    >;
    if (
      native.audit &&
      typeof native.audit === "object" &&
      !Array.isArray(native.audit)
    ) {
      delete (native.audit as Record<string, unknown>).request;
    }
    const validated = rebuildSynthesisTopicContextResult(native);
    if (request === undefined) return validated;
    const echo = hostContextRequestEcho(request);
    return {
      ...validated,
      audit: validated.audit
        ? { ...validated.audit, request: echo }
        : undefined,
    } as SynthesisTopicContextResult & {
      audit: NonNullable<SynthesisTopicContextResult["audit"]> & {
        request: SynthesisTopicContextRequestEcho;
      };
    };
  }
  if (object.schema_id === "synthesis.topic_context.output") {
    exactObject(
      object,
      "synthesisTopicContextOutput",
      [
        "schema_id",
        "schema_version",
        "topic_id",
        "view",
        "output",
        "omitted_inline_result",
      ],
      ["delivery"],
    );
    if (
      object.schema_version !== "2.0.0" ||
      typeof object.topic_id !== "string" ||
      !["digest", "semantic", "audit", "full"].includes(String(object.view)) ||
      object.omitted_inline_result !== true
    ) {
      invalid("synthesisTopicContextOutput");
    }
    const output = exactObject(
      object.output,
      "synthesisTopicContextOutput.output",
      ["mode", "path", "bytes", "sha256"],
    );
    if (
      !["file", "bridge-download"].includes(String(output.mode)) ||
      typeof output.path !== "string" ||
      !output.path ||
      !Number.isSafeInteger(output.bytes) ||
      (output.bytes as number) < 0 ||
      typeof output.sha256 !== "string" ||
      !output.sha256.startsWith("sha256:")
    ) {
      invalid("synthesisTopicContextOutput.output");
    }
    if (object.delivery !== undefined) {
      rebuildSynthesisHostExportDeliveryResult({
        status: "available",
        capability: "topics.get_context",
        delivery: object.delivery,
        diagnostics: [],
      });
    }
    return object as unknown as SynthesisTopicContextOutputResult;
  }
  if (object.ok === false) {
    exactObject(
      object,
      "synthesisTopicContextFailure",
      ["ok", "status", "topic_id", "diagnostics"],
      ["view", "output"],
    );
    if (
      !["invalid_request", "not_found", "output_exists"].includes(
        String(object.status),
      ) ||
      typeof object.topic_id !== "string"
    ) {
      invalid("synthesisTopicContextFailure");
    }
    return object as unknown as SynthesisTopicContextFailureResult;
  }
  if (Array.isArray(object.topics)) {
    exactObject(object, "synthesisTopicInventory", [
      "topics",
      "cursor",
      "next_cursor",
      "has_more",
      "returned",
      "total",
      "limit",
      "diagnostics",
    ]);
    if (
      typeof object.cursor !== "string" ||
      typeof object.next_cursor !== "string" ||
      typeof object.has_more !== "boolean" ||
      !Number.isSafeInteger(object.returned) ||
      !Number.isSafeInteger(object.total) ||
      !Number.isSafeInteger(object.limit)
    ) {
      invalid("synthesisTopicInventory");
    }
    for (const row of object.topics) {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        invalid("synthesisTopicInventoryRow");
      }
      const entry = row as Record<string, unknown>;
      if (
        typeof entry.topic_id !== "string" ||
        typeof entry.title !== "string"
      ) {
        invalid("synthesisTopicInventoryRow");
      }
      if (entry.lifecycle === "planned" || entry.lifecycle === "stale") {
        exactObject(
          entry,
          "plannedTopicInventoryRow",
          [
            "topic_id",
            "title",
            "definition",
            "aliases",
            "updated_at",
            "lifecycle",
            "planning",
          ],
          ["status"],
        );
        for (const field of [
          "topic_id",
          "title",
          "definition",
          "updated_at",
          "status",
        ]) {
          if (entry[field] !== undefined && typeof entry[field] !== "string")
            invalid(`plannedTopicInventoryRow.${field}`);
        }
        strings(entry.aliases, "plannedTopicInventoryRow.aliases");
        validateField("TopicPlanningMetadata", entry.planning);
      } else {
        validateField("TopicRecord", entry);
      }
    }
    return object as unknown as SynthesisTopicContextInventoryResult;
  }
  if (object.topic_id === undefined || object.request === undefined) {
    invalid("synthesisHostTopicContextResult");
  }
  if (typeof object.topic_id !== "string") invalid("topicContextFlat.topic_id");
  hostContextRequestEcho(object.request);
  const diagnostics = exactObject(
    object.diagnostics,
    "topicContextFlat.diagnostics",
    ["bounded", "omitted"],
  );
  if (diagnostics.bounded !== true || !Array.isArray(diagnostics.omitted)) {
    invalid("topicContextFlat.diagnostics");
  }
  strings(diagnostics.omitted, "topicContextFlat.diagnostics.omitted");
  const domainFields: Record<string, string> = {
    paths: "StringMap",
    current_metadata: "TopicMetadata",
    current_hashes: "HashMap",
    section_hashes: "HashMap",
    topic_definition: "TopicDefinition",
    resolved_paper_set: "ResolvedPaperSet",
    artifact: "TopicArtifact",
    current_artifact: "TopicArtifact",
    manifest: "TopicManifest",
    current_manifest: "TopicManifest",
    freshness: "Freshness",
    recommended_update: "TopicRecommendedUpdate",
  };
  for (const [field, definition] of Object.entries(domainFields)) {
    if (object[field] !== undefined)
      validateField(definition, object[field], true);
  }
  for (const field of ["language", "markdown"]) {
    if (object[field] !== undefined && typeof object[field] !== "string")
      invalid(`topicContextFlat.${field}`);
  }
  if (object.topic_resolver !== undefined) {
    validateField("TopicPlanningSelector", object.topic_resolver);
  }
  if (object.planning !== undefined)
    validateField("TopicPlanningMetadata", object.planning);
  if (
    object.lifecycle !== undefined &&
    !["planned", "stale", "materialized"].includes(String(object.lifecycle))
  ) {
    invalid("topicContextFlat.lifecycle");
  }
  if (object.digest !== undefined || object.audit !== undefined) {
    rebuildSynthesisTopicContextResult({
      schema_id: "synthesis.topic_context",
      schema_version: "2.0.0",
      topic_id: object.topic_id,
      ...(object.digest !== undefined ? { digest: object.digest } : {}),
      ...(object.audit !== undefined ? { audit: object.audit } : {}),
    });
  }
  for (const [field, definition, domain] of [
    ["discovery_hints", "TopicDiscoveryCandidate", false],
    ["prospective_topic_relation_proposals", "TopicRelationProposal", true],
  ] as const) {
    if (object[field] !== undefined) {
      if (!Array.isArray(object[field])) invalid(`topicContextFlat.${field}`);
      for (const item of object[field] as unknown[])
        validateField(definition, item, domain);
    }
  }
  return object as unknown as SynthesisTopicContextFlatResult;
}

export function rebuildSynthesisTopicResolverResult(
  value: unknown,
): SynthesisTopicResolverResult {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "ResolveResolverResult",
    value,
    direction: "result",
  });
}

export function rebuildSynthesisWorkflowTopicOptionsResult(
  value: unknown,
): SynthesisWorkflowTopicOptionsResult {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "ListWorkflowTopicOptionsResult",
    value,
    direction: "result",
  });
}

export interface SynthesisTopicsClient {
  list(request: SynthesisTopicListRequest): Promise<SynthesisTopicListResult>;
  findByPaperRef(
    request: SynthesisTopicFindRequest,
  ): Promise<SynthesisTopicFindResult>;
  search(
    request: SynthesisTopicSearchRequest,
  ): Promise<SynthesisTopicSearchResult>;
  getContext(
    request: SynthesisTopicContextRequest,
    delivery?: SynthesisDeliveryContext,
  ): Promise<SynthesisHostTopicContextResult>;
  resolveResolver(
    request: SynthesisTopicResolverRequest,
  ): Promise<SynthesisTopicResolverResult>;
  listWorkflowOptions(
    request: SynthesisWorkflowTopicOptionsRequest,
  ): Promise<SynthesisWorkflowTopicOptionsResult>;
  getPlanningContext(): Promise<SynthesisTopicPlanningContext>;
  getTopicReport(
    request: SynthesisTopicReportRequest,
  ): Promise<SynthesisTopicReportResult>;
  deleteTopicArtifact(
    request: SynthesisTopicArtifactDeleteRequest,
  ): Promise<SynthesisTopicArtifactDeleteResult>;
  purgeDeletedTopicArtifacts(): Promise<SynthesisDeletedTopicArtifactsPurgeResult>;
  rejectTopicDiscoveryHint(
    request: SynthesisTopicDiscoveryHintRequest,
  ): Promise<SynthesisTopicCommandResult>;
  restoreTopicDiscoveryHint(
    request: SynthesisTopicDiscoveryHintRequest,
  ): Promise<SynthesisTopicCommandResult>;
}

function invalid(location: string): never {
  throw new SynthesisClientError("invalid_request", `${location} is invalid`, {
    location,
  });
}

function exactObject(
  value: unknown,
  location: string,
  required: readonly string[],
  optional: readonly string[] = [],
) {
  const object = toSynthesisJsonObject(value, location);
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((field) => !Object.hasOwn(object, field)) ||
    Object.keys(object).some((field) => !allowed.has(field))
  ) {
    invalid(location);
  }
  return object;
}

function strings(value: unknown, location: string, allowEmpty = true) {
  if (
    !Array.isArray(value) ||
    (!allowEmpty && value.length === 0) ||
    value.length > 25_000 ||
    value.some(
      (entry) =>
        typeof entry !== "string" || entry.length === 0 || entry.length > 4_096,
    )
  ) {
    invalid(location);
  }
  return [...value] as string[];
}

export function rebuildSynthesisTopicListRequest(
  value: unknown,
): SynthesisTopicListRequest {
  const object = exactObject(value, "synthesisTopicListRequest", [
    "cursor",
    "limit",
  ]);
  if (
    typeof object.cursor !== "string" ||
    object.cursor.length > 128 ||
    typeof object.limit !== "number" ||
    !Number.isSafeInteger(object.limit) ||
    object.limit < 1 ||
    object.limit > 250
  ) {
    invalid("synthesisTopicListRequest");
  }
  return { cursor: object.cursor, limit: object.limit };
}

export function rebuildSynthesisTopicFindRequest(
  value: unknown,
): SynthesisTopicFindRequest {
  const object = exactObject(value, "synthesisTopicFindRequest", [
    "paper_refs",
  ]);
  return {
    paper_refs: strings(
      object.paper_refs,
      "synthesisTopicFindRequest.paper_refs",
      false,
    ),
  };
}

export function rebuildSynthesisTopicContextRequest(
  value: unknown,
): SynthesisTopicContextRequest {
  const object = toSynthesisJsonObject(value, "synthesisTopicContextRequest");
  const allowed = new Set([
    "topicId",
    "topic_id",
    "view",
    "includeFull",
    "include_full",
    "includeMarkdown",
    "include_markdown",
    "includeArtifact",
    "include_artifact",
    "includeManifest",
    "include_manifest",
    "outputPath",
    "output_path",
    "overwrite",
    "mode",
    "language",
    "updateScope",
    "update_scope",
    "updateMode",
    "update_mode",
    "updateReason",
    "update_reason",
  ]);
  if (Object.keys(object).some((field) => !allowed.has(field))) {
    invalid("synthesisTopicContextRequest");
  }
  const text = (primary: string, alias?: string) => {
    const value = object[primary] ?? (alias ? object[alias] : undefined);
    if (value === undefined) return undefined;
    if (typeof value !== "string") invalid("synthesisTopicContextRequest");
    return value.trim() || undefined;
  };
  const flag = (primary: string, alias: string) => {
    const value = object[primary] ?? object[alias];
    if (value === undefined) return undefined;
    if (typeof value !== "boolean") invalid("synthesisTopicContextRequest");
    return value;
  };
  const topicId = text("topicId", "topic_id");
  const view = text("view");
  if (
    view !== undefined &&
    !["digest", "semantic", "audit", "full"].includes(view)
  ) {
    invalid("synthesisTopicContextRequest");
  }
  const outputPath = text("outputPath", "output_path");
  if (
    (object.outputPath !== undefined || object.output_path !== undefined) &&
    !outputPath
  ) {
    invalid("synthesisTopicContextRequest");
  }
  if (outputPath && !view) invalid("synthesisTopicContextRequest");
  const overwrite = object.overwrite;
  if (overwrite !== undefined && typeof overwrite !== "boolean") {
    invalid("synthesisTopicContextRequest");
  }
  return {
    ...(topicId ? { topicId } : {}),
    ...(view ? { view: view as SynthesisTopicContextView } : {}),
    ...(flag("includeFull", "include_full") !== undefined
      ? { includeFull: flag("includeFull", "include_full") }
      : {}),
    ...(flag("includeMarkdown", "include_markdown") !== undefined
      ? { includeMarkdown: flag("includeMarkdown", "include_markdown") }
      : {}),
    ...(flag("includeArtifact", "include_artifact") !== undefined
      ? { includeArtifact: flag("includeArtifact", "include_artifact") }
      : {}),
    ...(flag("includeManifest", "include_manifest") !== undefined
      ? { includeManifest: flag("includeManifest", "include_manifest") }
      : {}),
    ...(outputPath ? { outputPath } : {}),
    ...(overwrite !== undefined ? { overwrite } : {}),
    ...(text("mode") ? { mode: text("mode") } : {}),
    ...(text("language") ? { language: text("language") } : {}),
    ...(text("updateScope", "update_scope")
      ? { updateScope: text("updateScope", "update_scope") }
      : {}),
    ...(text("updateMode", "update_mode")
      ? { updateMode: text("updateMode", "update_mode") }
      : {}),
    ...(text("updateReason", "update_reason")
      ? { updateReason: text("updateReason", "update_reason") }
      : {}),
  };
}

export function rebuildSynthesisTopicResolverRequest(
  value: unknown,
): SynthesisTopicResolverRequest {
  const object = exactObject(
    value,
    "synthesisTopicResolverRequest",
    ["paper_refs", "collection_key", "combine", "cursor", "limit"],
    ["tag"],
  );
  const paperRefs = strings(
    object.paper_refs,
    "synthesisTopicResolverRequest.paper_refs",
  );
  const collectionKeys = strings(
    object.collection_key,
    "synthesisTopicResolverRequest.collection_key",
  );
  let tag: SynthesisTopicResolverTag | undefined;
  if (object.tag !== undefined) {
    const tagObject = exactObject(
      object.tag,
      "synthesisTopicResolverRequest.tag",
      [],
      ["and", "or", "not"],
    );
    if (Object.keys(tagObject).length === 0)
      invalid("synthesisTopicResolverRequest.tag");
    tag = Object.fromEntries(
      Object.entries(tagObject).map(([field, entries]) => [
        field,
        strings(entries, `synthesisTopicResolverRequest.tag.${field}`, false),
      ]),
    ) as SynthesisTopicResolverTag;
  }
  if (
    (paperRefs.length === 0 && collectionKeys.length === 0 && !tag) ||
    (object.combine !== "union" && object.combine !== "intersection") ||
    typeof object.cursor !== "number" ||
    !Number.isSafeInteger(object.cursor) ||
    object.cursor < 0 ||
    typeof object.limit !== "number" ||
    !Number.isSafeInteger(object.limit) ||
    object.limit < 1 ||
    object.limit > 250
  ) {
    invalid("synthesisTopicResolverRequest");
  }
  return {
    paper_refs: paperRefs,
    collection_key: collectionKeys,
    ...(tag ? { tag } : {}),
    combine: object.combine,
    cursor: object.cursor,
    limit: object.limit,
  };
}

export function rebuildSynthesisWorkflowTopicOptionsRequest(
  value: unknown,
): SynthesisWorkflowTopicOptionsRequest {
  const object = exactObject(value, "synthesisWorkflowTopicOptionsRequest", [
    "filter",
  ]);
  if (
    object.filter !== "all" &&
    object.filter !== "updatable" &&
    object.filter !== "planned"
  ) {
    invalid("synthesisWorkflowTopicOptionsRequest.filter");
  }
  return { filter: object.filter };
}
