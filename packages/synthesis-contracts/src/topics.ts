import { SynthesisClientError, toSynthesisJsonObject } from "./common";
import type { SynthesisDeliveryContext } from "./common";
import type { SynthesisJsonObject } from "./common";
import type {
  SynthesisTopicReportRequest,
  SynthesisTopicReportResult,
} from "./workflow";
import type {
  SynthesisResolvedPaperSet,
  SynthesisTopicAuditContext,
  SynthesisTopicDefinition,
  SynthesisTopicDigestContext,
  SynthesisTopicProjection,
  SynthesisTopicResolver,
  SynthesisTopicSemanticContext,
} from "./topicDomain";
import {
  rebuildSynthesisProtocolDto,
  SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
} from "./protocolSchema";

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

export type SynthesisTopicCommandResult = {
  ok: boolean;
  status: string;
  hint: null | {
    hint_id: string;
    status: "open" | "rejected";
    topic_id: string;
    title: string;
  };
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
export type SynthesisTopicContextRequest = {
  topicId: string;
  view: "digest" | "semantic" | "audit" | "full";
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

export type SynthesisTopicContextResult = {
  schema_id: "synthesis.topic_context";
  schema_version: "2.0.0";
  topic_id: string;
  status?: "not_found" | "invalid";
  view?: "digest" | "semantic" | "audit" | "full";
  digest?: SynthesisTopicDigestContext;
  semantic?: SynthesisTopicSemanticContext;
  audit?: SynthesisTopicAuditContext;
  diagnostics?: string[];
};

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
  getContext(
    request: SynthesisTopicContextRequest,
    delivery?: SynthesisDeliveryContext,
  ): Promise<SynthesisTopicContextResult>;
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
  const object = exactObject(value, "synthesisTopicContextRequest", [
    "topicId",
    "view",
  ]);
  if (
    typeof object.topicId !== "string" ||
    !object.topicId.trim() ||
    !["digest", "semantic", "audit", "full"].includes(String(object.view))
  ) {
    invalid("synthesisTopicContextRequest");
  }
  return {
    topicId: object.topicId.trim(),
    view: object.view as SynthesisTopicContextRequest["view"],
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
