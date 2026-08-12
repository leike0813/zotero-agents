import {
  SynthesisClientError,
  toSynthesisJsonObject,
  type SynthesisJsonObject,
} from "./common.js";
import type {
  SynthesisClaim,
  SynthesisCoverage,
  SynthesisDebate,
  SynthesisFutureDirection,
  SynthesisImprovementDimensions,
  SynthesisResolvedPaper,
  SynthesisReviewOutline,
  SynthesisSourceArtifacts,
  SynthesisStatistics,
  SynthesisReport,
  SynthesisTaxonomy,
  SynthesisTextSummary,
  SynthesisTimeline,
  SynthesisTopicArtifact,
  SynthesisTopicDefinition,
  SynthesisTopicManifest,
  SynthesisTopicMetadata,
} from "./topicDomain.js";
import {
  rebuildSynthesisProtocolDto,
  SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
} from "./protocolSchema.js";

export const SYNTHESIS_WORKBENCH_SURFACES = [
  "home",
  "topics",
  "index",
  "review",
  "graph",
  "tags",
  "concepts",
  "reader",
] as const;

export type SynthesisWorkbenchSurfaceName =
  (typeof SYNTHESIS_WORKBENCH_SURFACES)[number];

export type SynthesisWorkbenchTopicFreshness =
  | "fresh"
  | "stale"
  | "dirty"
  | "queued"
  | "running"
  | "failed"
  | "unknown";

export type SynthesisWorkbenchTopicSourceMaterialsStatus =
  | "complete"
  | "partial"
  | "missing";

export type SynthesisWorkbenchTopicUpdateIntent = {
  topicId: string;
  language: string;
  updateScope: string;
  updateMode: "auto" | "update_patch" | "update_full";
  updateReason: string;
  actionLabel: "Update";
  changedSections: string[];
  blocked?: boolean;
};

export type SynthesisWorkbenchTopicArtifactRow = {
  id: string;
  title: string;
  kind: "topic_synthesis";
  source_materials_status: SynthesisWorkbenchTopicSourceMaterialsStatus;
  source_materials_percent: number;
  freshness: SynthesisWorkbenchTopicFreshness;
  updated_at?: string;
  definition?: string;
  markdown_preview?: string;
  paper_count?: number;
  summary?: string;
  status?: string;
  readerMode?: string;
  language?: string;
  external_literature_count?: number;
  discovery_status?: "none" | "candidates" | "rejected" | "unknown";
  candidate_count?: number;
  stale_reasons?: string[];
  dirty_reasons?: string[];
  missing_sections?: string[];
  updateIntent?: SynthesisWorkbenchTopicUpdateIntent;
};

export type SynthesisWorkbenchReadState = SynthesisJsonObject;
export type SynthesisWorkbenchProjection = SynthesisJsonObject;

export type SynthesisWorkbenchSidecarStatus = {
  lifecycle:
    | "stopped"
    | "starting"
    | "ready"
    | "unavailable"
    | "incompatible"
    | "stopping";
  recoveryState: "none" | "scheduled" | "manual-recovery-required";
  reasonCode?: string;
  healthObservedAt?: string;
  serviceInstanceId?: string;
  serviceVersion?: string;
  bundleId?: string;
  nextRestartAt?: string;
  computePool?: {
    state: "idle" | "busy" | "degraded" | "stopping";
    active: 0 | 1;
    queued: number;
  };
};

export type SynthesisWorkbenchChromeReadRequest = {
  state: SynthesisWorkbenchReadState;
};

export type SynthesisWorkbenchOperationalChromeReadRequest = Record<
  string,
  never
>;

export const SYNTHESIS_WORKBENCH_OPERATIONAL_CACHE_DESCRIPTORS = [
  {
    cacheKey: "reference-sidecar:library",
    cacheKind: "reference-sidecar",
  },
  {
    cacheKey: "citation-graph:library",
    cacheKind: "citation_graph",
  },
] as const;

export const SYNTHESIS_WORKBENCH_RUNNING_JOB_LIMIT = 50;
export const SYNTHESIS_WORKBENCH_FAILED_JOB_LIMIT = 20;

export type SynthesisWorkbenchCacheReadiness = {
  cacheKey: string;
  cacheKind: string;
  status: "missing" | "ready" | "stale" | "refreshing" | "failed";
  refreshedAt?: string;
  updatedAt?: string;
  staleReason?: string;
};

export type SynthesisWorkbenchBackgroundJobSource =
  | "workbench"
  | "operation"
  | "reference_sidecar_refresh"
  | "citation_graph_cache_rebuild"
  | "citation_graph_layout"
  | "webdav_sync"
  | "canonical_maintenance";

export type SynthesisWorkbenchBackgroundJobStatus =
  | "submitted"
  | "queued"
  | "running"
  | "waiting"
  | "failed";

export type SynthesisWorkbenchBackgroundJobProgress =
  | { mode: "indeterminate"; label?: string }
  | {
      mode: "determinate";
      percent: number;
      current?: number;
      total?: number;
      label?: string;
    };

export type SynthesisWorkbenchBackgroundJobRow = {
  job_id: string;
  source: SynthesisWorkbenchBackgroundJobSource;
  status: SynthesisWorkbenchBackgroundJobStatus;
  label: string;
  detail?: string;
  updated_at?: string;
  progress: SynthesisWorkbenchBackgroundJobProgress;
};

export type SynthesisWorkbenchOperationalChromeResult = {
  maintenance: {
    cacheReadiness: SynthesisWorkbenchCacheReadiness[];
    backgroundJobs: SynthesisWorkbenchBackgroundJobRow[];
  };
};

export type SynthesisWorkbenchSurfaceReadRequest = {
  surface: SynthesisWorkbenchSurfaceName;
  state: SynthesisWorkbenchReadState;
};

export type SynthesisWorkbenchTopicDetailReadRequest = {
  topicId: string;
};

export type SynthesisWorkbenchTopicDetailResult = {
  ok: boolean;
  status: "ready" | "unavailable";
  topicId: string;
  title: string;
  language?: string;
  updated_at?: string;
  artifact_hash?: string;
  paper_count?: number;
  source_papers: SynthesisResolvedPaper[];
  topic?: SynthesisTopicDefinition;
  summary?: SynthesisTextSummary;
  taxonomy?: SynthesisTaxonomy;
  improvement_dimensions?: SynthesisImprovementDimensions;
  claims?: SynthesisClaim[];
  timeline_events?: SynthesisTimeline;
  debates?: SynthesisDebate[];
  coverage?: SynthesisCoverage;
  statistics?: SynthesisStatistics;
  synthesis_report?: SynthesisReport;
  future_directions?: SynthesisFutureDirection[];
  review_outline?: SynthesisReviewOutline;
  source_artifacts?: SynthesisSourceArtifacts;
  artifact?: SynthesisTopicArtifact;
  manifest?: SynthesisTopicManifest;
  metadata?: SynthesisTopicMetadata;
  pathId?: string;
  diagnostics: string[];
};

export function rebuildSynthesisWorkbenchTopicDetailResult(
  value: unknown,
): SynthesisWorkbenchTopicDetailResult {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "ReadTopicDetailResult",
    value,
    direction: "result",
  });
}

export type SynthesisWorkbenchPaperDigestReadRequest = {
  topicId?: string;
  paperRef: string;
  digestRef?: {
    paperRef: string;
    locator?: string;
    payloadHash: string;
    libraryId?: number;
    noteKey?: string;
  };
  includeRepresentativeImage: boolean;
};

export type SynthesisWorkbenchRepresentativeImage = {
  status: "available" | "unavailable" | "absent";
  attachment_key?: string;
  alt?: string;
  caption?: string;
  mime_type?: string;
  data_url?: string;
  width?: number;
  height?: number;
  compressed_bytes?: number;
  source_kind?: string;
  strategy?: string;
  diagnostics: string[];
};

export type SynthesisWorkbenchPaperDigestResult = {
  ok: boolean;
  status: "available" | "unavailable";
  paper_ref: string;
  digest_markdown: string;
  recorded_hash: string;
  current_hash: string;
  source_changed: boolean;
  diagnostics: string[];
  note_key?: string;
  note_title?: string;
  representative_image?: SynthesisWorkbenchRepresentativeImage;
};

export function rebuildSynthesisWorkbenchPaperDigestReadRequest(
  value: unknown,
): SynthesisWorkbenchPaperDigestReadRequest {
  const object = strictObject(
    value,
    "synthesisWorkbenchPaperDigestReadRequest",
    ["paperRef", "includeRepresentativeImage"],
    ["topicId", "digestRef"],
  );
  if (typeof object.includeRepresentativeImage !== "boolean") {
    invalid(
      "synthesisWorkbenchPaperDigestReadRequest.includeRepresentativeImage",
    );
  }
  const paperRef = boundedString(
    object.paperRef,
    "synthesisWorkbenchPaperDigestReadRequest.paperRef",
  );
  const topicId = optionalString(
    object.topicId,
    "synthesisWorkbenchPaperDigestReadRequest.topicId",
  );
  let digestRef: SynthesisWorkbenchPaperDigestReadRequest["digestRef"];
  if (object.digestRef !== undefined) {
    const ref = strictObject(
      object.digestRef,
      "synthesisWorkbenchPaperDigestReadRequest.digestRef",
      ["paperRef", "payloadHash"],
      ["locator", "libraryId", "noteKey"],
    );
    if (ref.paperRef !== paperRef) {
      invalid("synthesisWorkbenchPaperDigestReadRequest.digestRef.paperRef");
    }
    const libraryId =
      ref.libraryId === undefined
        ? undefined
        : nonNegativeInteger(
            ref.libraryId,
            "synthesisWorkbenchPaperDigestReadRequest.digestRef.libraryId",
            Number.MAX_SAFE_INTEGER,
          );
    if (libraryId === 0) {
      invalid("synthesisWorkbenchPaperDigestReadRequest.digestRef.libraryId");
    }
    const locator = optionalString(
      ref.locator,
      "synthesisWorkbenchPaperDigestReadRequest.digestRef.locator",
    );
    const noteKey = optionalString(
      ref.noteKey,
      "synthesisWorkbenchPaperDigestReadRequest.digestRef.noteKey",
    );
    digestRef = {
      paperRef,
      payloadHash: boundedString(
        ref.payloadHash,
        "synthesisWorkbenchPaperDigestReadRequest.digestRef.payloadHash",
      ),
      ...(locator ? { locator } : {}),
      ...(libraryId === undefined ? {} : { libraryId }),
      ...(noteKey ? { noteKey } : {}),
    };
  }
  return {
    ...(topicId ? { topicId } : {}),
    paperRef,
    ...(digestRef ? { digestRef } : {}),
    includeRepresentativeImage: object.includeRepresentativeImage,
  };
}

function rebuildRepresentativeImage(
  value: unknown,
): SynthesisWorkbenchRepresentativeImage {
  const location = "synthesisWorkbenchPaperDigestResult.representative_image";
  const object = strictObject(
    value,
    location,
    ["status", "diagnostics"],
    [
      "attachment_key",
      "alt",
      "caption",
      "mime_type",
      "data_url",
      "width",
      "height",
      "compressed_bytes",
      "source_kind",
      "strategy",
    ],
  );
  if (
    object.status !== "available" &&
    object.status !== "unavailable" &&
    object.status !== "absent"
  ) {
    invalid(`${location}.status`);
  }
  if (
    !Array.isArray(object.diagnostics) ||
    object.diagnostics.some((entry) => typeof entry !== "string")
  ) {
    invalid(`${location}.diagnostics`);
  }
  const optionalInteger = (field: "width" | "height" | "compressed_bytes") =>
    object[field] === undefined
      ? undefined
      : nonNegativeInteger(
          object[field],
          `${location}.${field}`,
          Number.MAX_SAFE_INTEGER,
        );
  return {
    status: object.status,
    ...Object.fromEntries(
      [
        "attachment_key",
        "alt",
        "caption",
        "mime_type",
        "data_url",
        "source_kind",
        "strategy",
      ]
        .map((field) => [
          field,
          optionalString(object[field], `${location}.${field}`),
        ])
        .filter((entry): entry is [string, string] => Boolean(entry[1])),
    ),
    ...Object.fromEntries(
      (["width", "height", "compressed_bytes"] as const)
        .map((field) => [field, optionalInteger(field)] as const)
        .filter(
          (entry): entry is readonly [(typeof entry)[0], number] =>
            entry[1] !== undefined,
        ),
    ),
    diagnostics: [...object.diagnostics] as string[],
  };
}

export function rebuildSynthesisWorkbenchPaperDigestResult(
  value: unknown,
): SynthesisWorkbenchPaperDigestResult {
  const location = "synthesisWorkbenchPaperDigestResult";
  const object = strictObject(
    value,
    location,
    [
      "ok",
      "status",
      "paper_ref",
      "digest_markdown",
      "recorded_hash",
      "current_hash",
      "source_changed",
      "diagnostics",
    ],
    ["note_key", "note_title", "representative_image"],
  );
  if (
    typeof object.ok !== "boolean" ||
    (object.status !== "available" && object.status !== "unavailable") ||
    typeof object.source_changed !== "boolean" ||
    !Array.isArray(object.diagnostics) ||
    object.diagnostics.some((entry) => typeof entry !== "string")
  ) {
    invalid(location);
  }
  const noteKey = optionalString(object.note_key, `${location}.note_key`);
  const noteTitle = optionalString(object.note_title, `${location}.note_title`);
  return {
    ok: object.ok,
    status: object.status,
    paper_ref: boundedString(object.paper_ref, `${location}.paper_ref`),
    digest_markdown: boundedString(
      object.digest_markdown,
      `${location}.digest_markdown`,
      true,
    ),
    recorded_hash: boundedString(
      object.recorded_hash,
      `${location}.recorded_hash`,
      true,
    ),
    current_hash: boundedString(
      object.current_hash,
      `${location}.current_hash`,
      true,
    ),
    source_changed: object.source_changed,
    diagnostics: [...object.diagnostics] as string[],
    ...(noteKey ? { note_key: noteKey } : {}),
    ...(noteTitle ? { note_title: noteTitle } : {}),
    ...(object.representative_image === undefined
      ? {}
      : {
          representative_image: rebuildRepresentativeImage(
            object.representative_image,
          ),
        }),
  };
}

export interface SynthesisWorkbenchClient {
  readProgress(): Promise<SynthesisWorkbenchProjection>;
  readChrome(
    request: SynthesisWorkbenchChromeReadRequest,
  ): Promise<SynthesisWorkbenchProjection>;
  readSurface(
    request: SynthesisWorkbenchSurfaceReadRequest,
  ): Promise<SynthesisWorkbenchProjection>;
  readTopicDetail(
    request: SynthesisWorkbenchTopicDetailReadRequest,
  ): Promise<SynthesisWorkbenchTopicDetailResult>;
  readPaperDigest(
    request: SynthesisWorkbenchPaperDigestReadRequest,
  ): Promise<SynthesisWorkbenchPaperDigestResult>;
}

function invalid(location: string): never {
  throw new SynthesisClientError("invalid_request", `${location} is invalid`, {
    location,
  });
}

function strictObject(
  value: unknown,
  location: string,
  required: readonly string[],
  optional: readonly string[] = [],
) {
  const object = toSynthesisJsonObject(value, location);
  const keys = Object.keys(object).sort();
  const allowed = [...required, ...optional].sort();
  if (
    required.some((key) => !Object.hasOwn(object, key)) ||
    keys.some((key) => !allowed.includes(key))
  ) {
    invalid(location);
  }
  return object;
}

function boundedString(value: unknown, location: string, allowEmpty = false) {
  if (
    typeof value !== "string" ||
    (!allowEmpty && value.length === 0) ||
    value.length > 4096
  ) {
    invalid(location);
  }
  return value;
}

function optionalString(value: unknown, location: string) {
  return value === undefined
    ? undefined
    : boundedString(value, location, true) || undefined;
}

function nonNegativeInteger(value: unknown, location: string, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > max
  ) {
    invalid(location);
  }
  return value;
}

export function rebuildSynthesisWorkbenchChromeReadRequest(
  value: unknown,
): SynthesisWorkbenchChromeReadRequest {
  const object = strictObject(value, "synthesisWorkbenchChromeReadRequest", [
    "state",
  ]);
  return {
    state: toSynthesisJsonObject(
      object.state,
      "synthesisWorkbenchChromeReadRequest.state",
    ),
  };
}

export function rebuildSynthesisWorkbenchOperationalChromeReadRequest(
  value: unknown,
): SynthesisWorkbenchOperationalChromeReadRequest {
  strictObject(value, "synthesisWorkbenchOperationalChromeReadRequest", []);
  return {};
}

function rebuildCacheReadiness(
  value: unknown,
  index: number,
): SynthesisWorkbenchCacheReadiness {
  const location = `synthesisWorkbenchOperationalChromeResult.maintenance.cacheReadiness[${index}]`;
  const object = strictObject(
    value,
    location,
    ["cacheKey", "cacheKind", "status"],
    ["refreshedAt", "updatedAt", "staleReason"],
  );
  const descriptor = SYNTHESIS_WORKBENCH_OPERATIONAL_CACHE_DESCRIPTORS[index];
  if (
    !descriptor ||
    object.cacheKey !== descriptor.cacheKey ||
    object.cacheKind !== descriptor.cacheKind ||
    (object.status !== "missing" &&
      object.status !== "ready" &&
      object.status !== "stale" &&
      object.status !== "refreshing" &&
      object.status !== "failed")
  ) {
    invalid(location);
  }
  const refreshedAt = optionalString(
    object.refreshedAt,
    `${location}.refreshedAt`,
  );
  const updatedAt = optionalString(object.updatedAt, `${location}.updatedAt`);
  const staleReason = optionalString(
    object.staleReason,
    `${location}.staleReason`,
  );
  return {
    cacheKey: descriptor.cacheKey,
    cacheKind: descriptor.cacheKind,
    status: object.status,
    ...(refreshedAt ? { refreshedAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    ...(staleReason ? { staleReason } : {}),
  };
}

function rebuildProgress(
  value: unknown,
  location: string,
): SynthesisWorkbenchBackgroundJobProgress {
  const object = toSynthesisJsonObject(value, location);
  if (object.mode === "indeterminate") {
    strictObject(value, location, ["mode"], ["label"]);
    const label = optionalString(object.label, `${location}.label`);
    return {
      mode: "indeterminate",
      ...(label ? { label } : {}),
    };
  }
  if (object.mode !== "determinate") invalid(location);
  strictObject(
    value,
    location,
    ["mode", "percent"],
    ["current", "total", "label"],
  );
  const current =
    object.current === undefined
      ? undefined
      : nonNegativeInteger(
          object.current,
          `${location}.current`,
          Number.MAX_SAFE_INTEGER,
        );
  const total =
    object.total === undefined
      ? undefined
      : nonNegativeInteger(
          object.total,
          `${location}.total`,
          Number.MAX_SAFE_INTEGER,
        );
  const label = optionalString(object.label, `${location}.label`);
  return {
    mode: "determinate",
    percent: nonNegativeInteger(object.percent, `${location}.percent`, 100),
    ...(current === undefined ? {} : { current }),
    ...(total === undefined ? {} : { total }),
    ...(label ? { label } : {}),
  };
}

function rebuildBackgroundJob(
  value: unknown,
  index: number,
): SynthesisWorkbenchBackgroundJobRow {
  const location = `synthesisWorkbenchOperationalChromeResult.maintenance.backgroundJobs[${index}]`;
  const object = strictObject(
    value,
    location,
    ["job_id", "source", "status", "label", "progress"],
    ["detail", "updated_at"],
  );
  const sources: readonly string[] = [
    "workbench",
    "operation",
    "reference_sidecar_refresh",
    "citation_graph_cache_rebuild",
    "citation_graph_layout",
    "webdav_sync",
    "canonical_maintenance",
  ];
  const statuses: readonly string[] = [
    "submitted",
    "queued",
    "running",
    "waiting",
    "failed",
  ];
  if (
    typeof object.source !== "string" ||
    !sources.includes(object.source) ||
    typeof object.status !== "string" ||
    !statuses.includes(object.status)
  ) {
    invalid(location);
  }
  const detail = optionalString(object.detail, `${location}.detail`);
  const updatedAt = optionalString(object.updated_at, `${location}.updated_at`);
  return {
    job_id: boundedString(object.job_id, `${location}.job_id`),
    source: object.source as SynthesisWorkbenchBackgroundJobSource,
    status: object.status as SynthesisWorkbenchBackgroundJobStatus,
    label: boundedString(object.label, `${location}.label`),
    ...(detail ? { detail } : {}),
    ...(updatedAt ? { updated_at: updatedAt } : {}),
    progress: rebuildProgress(object.progress, `${location}.progress`),
  };
}

export function rebuildSynthesisWorkbenchOperationalChromeResult(
  value: unknown,
): SynthesisWorkbenchOperationalChromeResult {
  const root = strictObject(
    value,
    "synthesisWorkbenchOperationalChromeResult",
    ["maintenance"],
  );
  const maintenance = strictObject(
    root.maintenance,
    "synthesisWorkbenchOperationalChromeResult.maintenance",
    ["cacheReadiness", "backgroundJobs"],
  );
  if (
    !Array.isArray(maintenance.cacheReadiness) ||
    maintenance.cacheReadiness.length !==
      SYNTHESIS_WORKBENCH_OPERATIONAL_CACHE_DESCRIPTORS.length ||
    !Array.isArray(maintenance.backgroundJobs) ||
    maintenance.backgroundJobs.length >
      SYNTHESIS_WORKBENCH_RUNNING_JOB_LIMIT +
        SYNTHESIS_WORKBENCH_FAILED_JOB_LIMIT
  ) {
    invalid("synthesisWorkbenchOperationalChromeResult.maintenance");
  }
  return {
    maintenance: {
      cacheReadiness: maintenance.cacheReadiness.map(rebuildCacheReadiness),
      backgroundJobs: maintenance.backgroundJobs.map(rebuildBackgroundJob),
    },
  };
}
