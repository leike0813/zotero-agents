import {
  SynthesisClientError,
  toSynthesisJsonObject,
  type SynthesisJsonObject,
} from "./common.js";
import {
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
  type SynthesisSidecarProductionClientCapability,
} from "./sidecarSystem.js";

export const SYNTHESIS_SIDECAR_TRANSFER_LIMITS = {
  pageBytes: 4 * 1024 * 1024,
  pageJsonNodes: 100_000,
  directionPages: 256,
  directionBytes: 1024 * 1024 * 1024,
  activeSessions: 2,
  serviceBytes: 2 * 1024 * 1024 * 1024,
  idempotencyKeyLength: 128,
  sessionIdLength: 128,
  idleTtlMs: 5 * 60 * 1000,
  absoluteTtlMs: 30 * 60 * 1000,
  reaperIntervalMs: 30 * 1000,
  shutdownBudgetMs: 500,
} as const;

export const SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION =
  "synthesis-production-content-transfer.v1" as const;
export const SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING =
  "canonical_json_text_chunks.v1" as const;
export const SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_TARGETS = [
  "topic_apply_assets",
  "production_client_result",
  "host_export_entries",
] as const;

export type SynthesisProductionContentTransferTarget =
  (typeof SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_TARGETS)[number];

export type SynthesisSidecarTransferDirection = "input" | "output";
export type SynthesisSidecarCitationTransferInputPageKind =
  | "library_nodes"
  | "references";
export type SynthesisSidecarCitationTransferOutputPageKind =
  | "nodes"
  | "resolved_edges"
  | "aggregate_edges"
  | "source_ownership"
  | "incoming_groups"
  | "light_metrics";
export type SynthesisSidecarTransferPageKind =
  | SynthesisSidecarCitationTransferInputPageKind
  | SynthesisSidecarCitationTransferOutputPageKind
  | "content";
export type SynthesisSidecarTransferPageDescriptor<
  Kind extends SynthesisSidecarTransferPageKind =
    SynthesisSidecarTransferPageKind,
> = {
  kind: Kind;
  pageIndex: number;
  rowCount: number;
  byteLength: number;
  sha256: string;
};

export type SynthesisSidecarCitationGraphScope = {
  kind: "full" | "source_slice";
  sourceIds: string[];
};

export type SynthesisSidecarCitationGraphInputHeader = {
  contractVersion: "synthesis-citation-graph-build.v1";
  scope: SynthesisSidecarCitationGraphScope;
  rolePriority: string[];
};

export type SynthesisSidecarCitationGraphOutputHeader = {
  contractVersion: "synthesis-citation-graph-build.v1";
  scope: SynthesisSidecarCitationGraphScope;
  diagnostics: {
    nodeCounts: {
      library_paper: number;
      external_reference: number;
      unresolved_reference: number;
    };
    referenceCount: number;
    aggregateEdgeCount: number;
  };
};

export type SynthesisSidecarTopicAssetTransferDescriptor = {
  id: string;
  mediaType: "application/json" | "text/markdown" | "text/plain";
  byteLength: number;
  sha256: string;
  firstPage: number;
  pageCount: number;
};

type SynthesisSidecarTransferManifestBase<
  Direction extends SynthesisSidecarTransferDirection,
  Header,
  Kind extends SynthesisSidecarTransferPageKind,
> = {
  direction: Direction;
  header: Header;
  pages: SynthesisSidecarTransferPageDescriptor<Kind>[];
  rootSha256: string;
};

export type SynthesisSidecarCitationInputManifest =
  SynthesisSidecarTransferManifestBase<
    "input",
    SynthesisSidecarCitationGraphInputHeader,
    SynthesisSidecarCitationTransferInputPageKind
  > & {
    transferVersion: "synthesis-citation-graph-build-transfer.v1";
    encoding: "canonical_json_rows.v1";
  };

export type SynthesisSidecarCitationOutputManifest =
  SynthesisSidecarTransferManifestBase<
    "output",
    SynthesisSidecarCitationGraphOutputHeader,
    SynthesisSidecarCitationTransferOutputPageKind
  > & {
    transferVersion: "synthesis-citation-graph-build-transfer.v1";
    encoding: "canonical_json_rows.v1";
  };

export type SynthesisSidecarTopicAssetsManifest =
  SynthesisSidecarTransferManifestBase<
    "input",
    {
      target: "topic_apply_assets";
      assets: SynthesisSidecarTopicAssetTransferDescriptor[];
    },
    "content"
  > & {
    transferVersion: typeof SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION;
    encoding: typeof SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING;
  };

export type SynthesisSidecarPublishedContentInputManifest =
  SynthesisSidecarTransferManifestBase<
    "input",
    { target: "production_client_result" | "host_export_entries" },
    never
  > & {
    transferVersion: typeof SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION;
    encoding: typeof SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING;
  };

export type SynthesisSidecarPublishedContentOutputManifest =
  SynthesisSidecarTransferManifestBase<
    "output",
    | {
        target: "production_client_result";
        capability: SynthesisSidecarProductionClientCapability;
        byteLength: number;
        sha256: string;
      }
    | {
        target: "host_export_entries";
        capability: "paper_artifacts.export_filtered";
        byteLength: number;
        sha256: string;
      },
    "content"
  > & {
    transferVersion: typeof SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION;
    encoding: typeof SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING;
  };

export type SynthesisSidecarTransferManifest =
  | SynthesisSidecarCitationInputManifest
  | SynthesisSidecarCitationOutputManifest
  | SynthesisSidecarTopicAssetsManifest
  | SynthesisSidecarPublishedContentInputManifest
  | SynthesisSidecarPublishedContentOutputManifest;

export type SynthesisSidecarCitationGraphLibraryNode = {
  nodeId: string;
  title?: string;
  year?: string;
  authors: string[];
  aliases: string[];
};

export type SynthesisSidecarCitationGraphReference = {
  referenceId: string;
  edgeId: string;
  sourceId: string;
  sourceRef?: string;
  targetId: string;
  targetKind: "library_paper" | "external_reference" | "unresolved_reference";
  targetTitle?: string;
  targetYear?: string;
  targetAuthors: string[];
  targetAliases: string[];
  roles: string[];
  weight: number;
};

export type SynthesisSidecarCitationGraphNode = {
  nodeId: string;
  kind: "library_paper" | "external_reference" | "unresolved_reference";
  title?: string;
  year?: string;
  authors: string[];
  aliases: string[];
};

export type SynthesisSidecarCitationGraphResolvedEdge = {
  edgeId: string;
  referenceId: string;
  sourceId: string;
  targetId: string;
  status: "accepted" | "unbound";
  roles: string[];
  weight: number;
};

export type SynthesisSidecarCitationGraphRoleEvidence = {
  role: string;
  count: number;
};

export type SynthesisSidecarCitationGraphAggregateEdge = {
  sourceId: string;
  targetId: string;
  mentionCount: number;
  primaryRole: string;
  auxRoles: SynthesisSidecarCitationGraphRoleEvidence[];
  roleEvidence: SynthesisSidecarCitationGraphRoleEvidence[];
  sourceRefs: string[];
};

export type SynthesisSidecarCitationGraphOwnership = {
  sourceId: string;
  edgeId: string;
  referenceId: string;
  targetId: string;
  status: "accepted" | "unbound";
};

export type SynthesisSidecarCitationGraphLightMetric = {
  nodeId: string;
  outgoingCount: number;
  incomingCount: number;
  localDegree: number;
  matchedOutgoingCount: number;
  unresolvedOutgoingCount: number;
  ambiguousOutgoingCount: 0;
};

export type SynthesisSidecarTransferPage =
  | {
      descriptor: SynthesisSidecarTransferPageDescriptor<"library_nodes">;
      rows: SynthesisSidecarCitationGraphLibraryNode[];
    }
  | {
      descriptor: SynthesisSidecarTransferPageDescriptor<"references">;
      rows: SynthesisSidecarCitationGraphReference[];
    }
  | {
      descriptor: SynthesisSidecarTransferPageDescriptor<"content">;
      rows: [string];
    }
  | {
      descriptor: SynthesisSidecarTransferPageDescriptor<"nodes">;
      rows: SynthesisSidecarCitationGraphNode[];
    }
  | {
      descriptor: SynthesisSidecarTransferPageDescriptor<"resolved_edges">;
      rows: SynthesisSidecarCitationGraphResolvedEdge[];
    }
  | {
      descriptor: SynthesisSidecarTransferPageDescriptor<"aggregate_edges">;
      rows: SynthesisSidecarCitationGraphAggregateEdge[];
    }
  | {
      descriptor: SynthesisSidecarTransferPageDescriptor<"source_ownership">;
      rows: SynthesisSidecarCitationGraphOwnership[];
    }
  | {
      descriptor: SynthesisSidecarTransferPageDescriptor<"incoming_groups">;
      rows: SynthesisSidecarCitationGraphOwnership[];
    }
  | {
      descriptor: SynthesisSidecarTransferPageDescriptor<"light_metrics">;
      rows: SynthesisSidecarCitationGraphLightMetric[];
    };
export type SynthesisSidecarTransferState =
  | "receiving_input"
  | "input_sealed"
  | "queued"
  | "executing"
  | "publishing_output"
  | "completed";
export type SynthesisSidecarTransferExecutionFailureCode =
  | "worker_timeout"
  | "worker_canceled"
  | "worker_crashed"
  | "worker_result_invalid"
  | "worker_unavailable"
  | "transfer_limit_exceeded"
  | "transfer_conflict"
  | "internal_error";
export type SynthesisSidecarTransferExecution = {
  attempts: number;
  lastFailure?: {
    code: SynthesisSidecarTransferExecutionFailureCode;
    retryable: boolean;
    atMs: number;
  };
};
export type SynthesisSidecarTransferProgress = {
  receivedPages: number;
  totalPages: number;
  stagedBytes: number;
};
export type SynthesisSidecarTransferStatus = {
  sessionId: string;
  state: SynthesisSidecarTransferState;
  input: SynthesisSidecarTransferProgress;
  output?: SynthesisSidecarTransferProgress;
  execution: SynthesisSidecarTransferExecution;
  stagedBytes: number;
  createdAtMs: number;
  lastActivityAtMs: number;
};
export type SynthesisSidecarTransferSnapshot = {
  state: "idle" | "active" | "stopping";
  sessions: number;
  stagedBytes: number;
};

export type SynthesisSidecarOutputTransferReference = {
  sessionId: string;
  rootSha256: string;
};

export type SynthesisSidecarTransferAction =
  | {
      action: "begin";
      idempotencyKey: string;
      manifest: SynthesisSidecarTransferManifest;
    }
  | {
      action: "put_input_page";
      sessionId: string;
      page: SynthesisSidecarTransferPage;
    }
  | {
      action:
        | "seal_input"
        | "execute"
        | "status"
        | "get_output_manifest"
        | "cancel";
      sessionId: string;
    }
  | {
      action: "get_output_page";
      sessionId: string;
      kind: string;
      pageIndex: number;
    };

function invalid(location: string): never {
  throw new SynthesisClientError(
    "invalid_request",
    `Invalid Synthesis sidecar transfer value at ${location}`,
    { location },
  );
}

function exactFields(
  object: SynthesisJsonObject,
  expected: readonly string[],
  location: string,
) {
  const actual = Object.keys(object).sort();
  const fields = [...expected].sort();
  if (
    actual.length !== fields.length ||
    actual.some((field, index) => field !== fields[index])
  ) {
    invalid(`${location}.fields`);
  }
}

function exactOptionalFields(
  object: SynthesisJsonObject,
  required: readonly string[],
  optional: readonly string[],
  location: string,
) {
  const actual = Object.keys(object);
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((field) => !(field in object)) ||
    actual.some((field) => !allowed.has(field))
  ) {
    invalid(`${location}.fields`);
  }
}

function hasControlCharacter(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function boundedString(value: unknown, location: string, max: number) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > max ||
    hasControlCharacter(value)
  ) {
    return invalid(location);
  }
  return value;
}

function nonNegativeInteger(value: unknown, location: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    return invalid(location);
  }
  return Number(value);
}

function positiveInteger(value: unknown, location: string) {
  const rebuilt = nonNegativeInteger(value, location);
  if (rebuilt === 0) {
    return invalid(location);
  }
  return rebuilt;
}

function finitePositive(value: unknown, location: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return invalid(location);
  }
  return value;
}

function sha256(value: unknown, location: string) {
  const hash = boundedString(value, location, 71);
  if (!/^sha256:[a-f0-9]{64}$/.test(hash)) {
    return invalid(location);
  }
  return hash;
}

function jsonNodes(value: unknown) {
  let count = 0;
  const visit = (entry: unknown) => {
    count += 1;
    if (Array.isArray(entry)) {
      entry.forEach(visit);
    } else if (entry && typeof entry === "object") {
      Object.entries(entry).forEach(([key, child]) => {
        visit(key);
        visit(child);
      });
    }
  };
  visit(value);
  return count;
}

const TRANSFER_PAGE_KINDS = new Set<string>([
  "library_nodes",
  "references",
  "nodes",
  "resolved_edges",
  "aggregate_edges",
  "source_ownership",
  "incoming_groups",
  "light_metrics",
  "content",
]);

function pageKind(
  value: unknown,
  location: string,
): SynthesisSidecarTransferPageKind {
  if (typeof value !== "string" || !TRANSFER_PAGE_KINDS.has(value)) {
    return invalid(location);
  }
  return value as SynthesisSidecarTransferPageKind;
}

function stringArray(
  value: unknown,
  location: string,
  options: { max?: number; unique?: boolean } = {},
) {
  if (!Array.isArray(value) || value.length > (options.max ?? 256)) {
    return invalid(location);
  }
  const rebuilt = value.map((entry, index) =>
    boundedString(entry, `${location}[${index}]`, 4096),
  );
  if (options.unique && new Set(rebuilt).size !== rebuilt.length) {
    return invalid(location);
  }
  return rebuilt;
}

function optionalString(
  object: SynthesisJsonObject,
  field: string,
  location: string,
  max = 4096,
) {
  return object[field] === undefined
    ? undefined
    : boundedString(object[field], `${location}.${field}`, max);
}

function scope(
  value: unknown,
  location: string,
): SynthesisSidecarCitationGraphScope {
  const object = toSynthesisJsonObject(value, location);
  exactFields(object, ["kind", "sourceIds"], location);
  if (object.kind !== "full" && object.kind !== "source_slice") {
    invalid(`${location}.kind`);
  }
  return {
    kind: object.kind,
    sourceIds: stringArray(object.sourceIds, `${location}.sourceIds`, {
      max: 25_000,
      unique: true,
    }),
  };
}

function graphDiagnostics(
  value: unknown,
  location: string,
): SynthesisSidecarCitationGraphOutputHeader["diagnostics"] {
  const object = toSynthesisJsonObject(value, location);
  exactFields(
    object,
    ["nodeCounts", "referenceCount", "aggregateEdgeCount"],
    location,
  );
  const counts = toSynthesisJsonObject(
    object.nodeCounts,
    `${location}.nodeCounts`,
  );
  exactFields(
    counts,
    ["library_paper", "external_reference", "unresolved_reference"],
    `${location}.nodeCounts`,
  );
  return {
    nodeCounts: {
      library_paper: nonNegativeInteger(
        counts.library_paper,
        `${location}.nodeCounts.library_paper`,
      ),
      external_reference: nonNegativeInteger(
        counts.external_reference,
        `${location}.nodeCounts.external_reference`,
      ),
      unresolved_reference: nonNegativeInteger(
        counts.unresolved_reference,
        `${location}.nodeCounts.unresolved_reference`,
      ),
    },
    referenceCount: nonNegativeInteger(
      object.referenceCount,
      `${location}.referenceCount`,
    ),
    aggregateEdgeCount: nonNegativeInteger(
      object.aggregateEdgeCount,
      `${location}.aggregateEdgeCount`,
    ),
  };
}

function inputHeader(value: unknown): SynthesisSidecarCitationGraphInputHeader {
  const location = "transferManifest.header";
  const object = toSynthesisJsonObject(value, location);
  exactFields(object, ["contractVersion", "scope", "rolePriority"], location);
  if (object.contractVersion !== "synthesis-citation-graph-build.v1") {
    invalid(`${location}.contractVersion`);
  }
  return {
    contractVersion: "synthesis-citation-graph-build.v1",
    scope: scope(object.scope, `${location}.scope`),
    rolePriority: stringArray(object.rolePriority, `${location}.rolePriority`, {
      unique: true,
    }),
  };
}

function outputHeader(
  value: unknown,
): SynthesisSidecarCitationGraphOutputHeader {
  const location = "transferManifest.header";
  const object = toSynthesisJsonObject(value, location);
  exactFields(object, ["contractVersion", "scope", "diagnostics"], location);
  if (object.contractVersion !== "synthesis-citation-graph-build.v1") {
    invalid(`${location}.contractVersion`);
  }
  return {
    contractVersion: "synthesis-citation-graph-build.v1",
    scope: scope(object.scope, `${location}.scope`),
    diagnostics: graphDiagnostics(
      object.diagnostics,
      `${location}.diagnostics`,
    ),
  };
}

function assetDescriptor(
  value: unknown,
  index: number,
): SynthesisSidecarTopicAssetTransferDescriptor {
  const location = `transferManifest.header.assets[${index}]`;
  const object = toSynthesisJsonObject(value, location);
  exactFields(
    object,
    ["id", "mediaType", "byteLength", "sha256", "firstPage", "pageCount"],
    location,
  );
  if (
    object.mediaType !== "application/json" &&
    object.mediaType !== "text/markdown" &&
    object.mediaType !== "text/plain"
  ) {
    invalid(`${location}.mediaType`);
  }
  return {
    id: boundedString(object.id, `${location}.id`, 4096),
    mediaType: object.mediaType,
    byteLength: nonNegativeInteger(object.byteLength, `${location}.byteLength`),
    sha256: sha256(object.sha256, `${location}.sha256`),
    firstPage: nonNegativeInteger(object.firstPage, `${location}.firstPage`),
    pageCount: positiveInteger(object.pageCount, `${location}.pageCount`),
  };
}

function descriptorKinds<Kind extends SynthesisSidecarTransferPageKind>(
  pages: SynthesisSidecarTransferPageDescriptor[],
  allowed: readonly Kind[],
  location: string,
): SynthesisSidecarTransferPageDescriptor<Kind>[] {
  const kinds = new Set<string>(allowed);
  if (pages.some((page) => !kinds.has(page.kind))) {
    invalid(location);
  }
  return pages as SynthesisSidecarTransferPageDescriptor<Kind>[];
}

export function rebuildSynthesisSidecarTransferPageDescriptor(
  value: unknown,
): SynthesisSidecarTransferPageDescriptor {
  const object = toSynthesisJsonObject(value, "transferPageDescriptor");
  exactFields(
    object,
    ["kind", "pageIndex", "rowCount", "byteLength", "sha256"],
    "transferPageDescriptor",
  );
  const byteLength = nonNegativeInteger(
    object.byteLength,
    "transferPageDescriptor.byteLength",
  );
  if (byteLength > SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageBytes) {
    invalid("transferPageDescriptor.byteLength");
  }
  return {
    kind: pageKind(object.kind, "transferPageDescriptor.kind"),
    pageIndex: nonNegativeInteger(
      object.pageIndex,
      "transferPageDescriptor.pageIndex",
    ),
    rowCount: nonNegativeInteger(
      object.rowCount,
      "transferPageDescriptor.rowCount",
    ),
    byteLength,
    sha256: sha256(object.sha256, "transferPageDescriptor.sha256"),
  };
}

export function rebuildSynthesisSidecarTransferManifest(
  value: unknown,
): SynthesisSidecarTransferManifest {
  const object = toSynthesisJsonObject(value, "transferManifest");
  exactFields(
    object,
    [
      "transferVersion",
      "encoding",
      "direction",
      "header",
      "pages",
      "rootSha256",
    ],
    "transferManifest",
  );
  if (object.direction !== "input" && object.direction !== "output") {
    invalid("transferManifest.direction");
  }
  if (!Array.isArray(object.pages)) {
    invalid("transferManifest.pages");
  }
  if (object.pages.length > SYNTHESIS_SIDECAR_TRANSFER_LIMITS.directionPages) {
    invalid("transferManifest.pages");
  }
  const pages = object.pages.map(rebuildSynthesisSidecarTransferPageDescriptor);
  if (
    pages.reduce((sum, page) => sum + page.byteLength, 0) >
    SYNTHESIS_SIDECAR_TRANSFER_LIMITS.directionBytes
  ) {
    invalid("transferManifest.bytes");
  }
  const rootSha256 = sha256(object.rootSha256, "transferManifest.rootSha256");
  if (object.transferVersion === "synthesis-citation-graph-build-transfer.v1") {
    if (object.encoding !== "canonical_json_rows.v1") {
      invalid("transferManifest.encoding");
    }
    if (object.direction === "input") {
      return {
        transferVersion: "synthesis-citation-graph-build-transfer.v1",
        encoding: "canonical_json_rows.v1",
        direction: "input",
        header: inputHeader(object.header),
        pages: descriptorKinds(
          pages,
          ["library_nodes", "references"],
          "transferManifest.pages.kind",
        ),
        rootSha256,
      };
    }
    return {
      transferVersion: "synthesis-citation-graph-build-transfer.v1",
      encoding: "canonical_json_rows.v1",
      direction: "output",
      header: outputHeader(object.header),
      pages: descriptorKinds(
        pages,
        [
          "nodes",
          "resolved_edges",
          "aggregate_edges",
          "source_ownership",
          "incoming_groups",
          "light_metrics",
        ],
        "transferManifest.pages.kind",
      ),
      rootSha256,
    };
  }
  if (
    object.transferVersion !== SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION ||
    object.encoding !== SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING
  ) {
    invalid("transferManifest.version");
  }
  const header = toSynthesisJsonObject(
    object.header,
    "transferManifest.header",
  );
  if (object.direction === "input") {
    if (header.target === "topic_apply_assets") {
      exactFields(header, ["target", "assets"], "transferManifest.header");
      if (!Array.isArray(header.assets) || header.assets.length > 256) {
        invalid("transferManifest.header.assets");
      }
      return {
        transferVersion: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION,
        encoding: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING,
        direction: "input",
        header: {
          target: "topic_apply_assets",
          assets: header.assets.map(assetDescriptor),
        },
        pages: descriptorKinds(
          pages,
          ["content"],
          "transferManifest.pages.kind",
        ),
        rootSha256,
      };
    }
    exactFields(header, ["target"], "transferManifest.header");
    if (
      header.target !== "production_client_result" &&
      header.target !== "host_export_entries"
    ) {
      invalid("transferManifest.header.target");
    }
    if (pages.length !== 0) {
      invalid("transferManifest.pages");
    }
    return {
      transferVersion: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION,
      encoding: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING,
      direction: "input",
      header: { target: header.target },
      pages: [],
      rootSha256,
    };
  }
  exactFields(
    header,
    ["target", "capability", "byteLength", "sha256"],
    "transferManifest.header",
  );
  const contentHeaderBase = {
    byteLength: nonNegativeInteger(
      header.byteLength,
      "transferManifest.header.byteLength",
    ),
    sha256: sha256(header.sha256, "transferManifest.header.sha256"),
  };
  const contentPages = descriptorKinds(
    pages,
    ["content"],
    "transferManifest.pages.kind",
  );
  if (header.target === "host_export_entries") {
    if (header.capability !== "paper_artifacts.export_filtered") {
      invalid("transferManifest.header.capability");
    }
    return {
      transferVersion: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION,
      encoding: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING,
      direction: "output",
      header: {
        target: "host_export_entries",
        capability: "paper_artifacts.export_filtered",
        ...contentHeaderBase,
      },
      pages: contentPages,
      rootSha256,
    };
  }
  if (
    header.target !== "production_client_result" ||
    typeof header.capability !== "string" ||
    !(
      SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES as readonly string[]
    ).includes(header.capability)
  ) {
    invalid("transferManifest.header.capability");
  }
  return {
    transferVersion: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION,
    encoding: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING,
    direction: "output",
    header: {
      target: "production_client_result",
      capability:
        header.capability as SynthesisSidecarProductionClientCapability,
      ...contentHeaderBase,
    },
    pages: contentPages,
    rootSha256,
  };
}

function rebuildLibraryNode(
  value: unknown,
  location: string,
): SynthesisSidecarCitationGraphLibraryNode {
  const object = toSynthesisJsonObject(value, location);
  exactOptionalFields(
    object,
    ["nodeId", "authors", "aliases"],
    ["title", "year"],
    location,
  );
  const node: SynthesisSidecarCitationGraphLibraryNode = {
    nodeId: boundedString(object.nodeId, `${location}.nodeId`, 4096),
    authors: stringArray(object.authors, `${location}.authors`),
    aliases: stringArray(object.aliases, `${location}.aliases`, {
      unique: true,
    }),
  };
  const title = optionalString(object, "title", location);
  const year = optionalString(object, "year", location, 64);
  if (title !== undefined) node.title = title;
  if (year !== undefined) node.year = year;
  return node;
}

function graphTargetKind(value: unknown, location: string) {
  if (
    value !== "library_paper" &&
    value !== "external_reference" &&
    value !== "unresolved_reference"
  ) {
    return invalid(location);
  }
  return value;
}

function edgeStatus(value: unknown, location: string) {
  if (value !== "accepted" && value !== "unbound") {
    return invalid(location);
  }
  return value;
}

function rebuildReference(
  value: unknown,
  location: string,
): SynthesisSidecarCitationGraphReference {
  const object = toSynthesisJsonObject(value, location);
  exactOptionalFields(
    object,
    [
      "referenceId",
      "edgeId",
      "sourceId",
      "targetId",
      "targetKind",
      "targetAuthors",
      "targetAliases",
      "roles",
      "weight",
    ],
    ["sourceRef", "targetTitle", "targetYear"],
    location,
  );
  const reference: SynthesisSidecarCitationGraphReference = {
    referenceId: boundedString(
      object.referenceId,
      `${location}.referenceId`,
      4096,
    ),
    edgeId: boundedString(object.edgeId, `${location}.edgeId`, 4096),
    sourceId: boundedString(object.sourceId, `${location}.sourceId`, 4096),
    targetId: boundedString(object.targetId, `${location}.targetId`, 4096),
    targetKind: graphTargetKind(object.targetKind, `${location}.targetKind`),
    targetAuthors: stringArray(
      object.targetAuthors,
      `${location}.targetAuthors`,
    ),
    targetAliases: stringArray(
      object.targetAliases,
      `${location}.targetAliases`,
      { unique: true },
    ),
    roles: stringArray(object.roles, `${location}.roles`),
    weight: finitePositive(object.weight, `${location}.weight`),
  };
  const sourceRef = optionalString(object, "sourceRef", location);
  const targetTitle = optionalString(object, "targetTitle", location);
  const targetYear = optionalString(object, "targetYear", location, 64);
  if (sourceRef !== undefined) reference.sourceRef = sourceRef;
  if (targetTitle !== undefined) reference.targetTitle = targetTitle;
  if (targetYear !== undefined) reference.targetYear = targetYear;
  return reference;
}

function rebuildGraphNode(
  value: unknown,
  location: string,
): SynthesisSidecarCitationGraphNode {
  const object = toSynthesisJsonObject(value, location);
  exactOptionalFields(
    object,
    ["nodeId", "kind", "authors", "aliases"],
    ["title", "year"],
    location,
  );
  const node: SynthesisSidecarCitationGraphNode = {
    nodeId: boundedString(object.nodeId, `${location}.nodeId`, 4096),
    kind: graphTargetKind(object.kind, `${location}.kind`),
    authors: stringArray(object.authors, `${location}.authors`),
    aliases: stringArray(object.aliases, `${location}.aliases`, {
      unique: true,
    }),
  };
  const title = optionalString(object, "title", location);
  const year = optionalString(object, "year", location, 64);
  if (title !== undefined) node.title = title;
  if (year !== undefined) node.year = year;
  return node;
}

function rebuildResolvedEdge(
  value: unknown,
  location: string,
): SynthesisSidecarCitationGraphResolvedEdge {
  const object = toSynthesisJsonObject(value, location);
  exactFields(
    object,
    [
      "edgeId",
      "referenceId",
      "sourceId",
      "targetId",
      "status",
      "roles",
      "weight",
    ],
    location,
  );
  return {
    edgeId: boundedString(object.edgeId, `${location}.edgeId`, 4096),
    referenceId: boundedString(
      object.referenceId,
      `${location}.referenceId`,
      4096,
    ),
    sourceId: boundedString(object.sourceId, `${location}.sourceId`, 4096),
    targetId: boundedString(object.targetId, `${location}.targetId`, 4096),
    status: edgeStatus(object.status, `${location}.status`),
    roles: stringArray(object.roles, `${location}.roles`),
    weight: finitePositive(object.weight, `${location}.weight`),
  };
}

function rebuildRoleEvidence(
  value: unknown,
  location: string,
): SynthesisSidecarCitationGraphRoleEvidence {
  const object = toSynthesisJsonObject(value, location);
  exactFields(object, ["role", "count"], location);
  return {
    role: boundedString(object.role, `${location}.role`, 4096),
    count: positiveInteger(object.count, `${location}.count`),
  };
}

function rebuildAggregateEdge(
  value: unknown,
  location: string,
): SynthesisSidecarCitationGraphAggregateEdge {
  const object = toSynthesisJsonObject(value, location);
  exactFields(
    object,
    [
      "sourceId",
      "targetId",
      "mentionCount",
      "primaryRole",
      "auxRoles",
      "roleEvidence",
      "sourceRefs",
    ],
    location,
  );
  if (!Array.isArray(object.auxRoles) || !Array.isArray(object.roleEvidence)) {
    invalid(location);
  }
  return {
    sourceId: boundedString(object.sourceId, `${location}.sourceId`, 4096),
    targetId: boundedString(object.targetId, `${location}.targetId`, 4096),
    mentionCount: positiveInteger(
      object.mentionCount,
      `${location}.mentionCount`,
    ),
    primaryRole: boundedString(
      object.primaryRole,
      `${location}.primaryRole`,
      4096,
    ),
    auxRoles: object.auxRoles.map((entry, index) =>
      rebuildRoleEvidence(entry, `${location}.auxRoles[${index}]`),
    ),
    roleEvidence: object.roleEvidence.map((entry, index) =>
      rebuildRoleEvidence(entry, `${location}.roleEvidence[${index}]`),
    ),
    sourceRefs: stringArray(object.sourceRefs, `${location}.sourceRefs`, {
      unique: true,
    }),
  };
}

function rebuildOwnership(
  value: unknown,
  location: string,
): SynthesisSidecarCitationGraphOwnership {
  const object = toSynthesisJsonObject(value, location);
  exactFields(
    object,
    ["sourceId", "edgeId", "referenceId", "targetId", "status"],
    location,
  );
  return {
    sourceId: boundedString(object.sourceId, `${location}.sourceId`, 4096),
    edgeId: boundedString(object.edgeId, `${location}.edgeId`, 4096),
    referenceId: boundedString(
      object.referenceId,
      `${location}.referenceId`,
      4096,
    ),
    targetId: boundedString(object.targetId, `${location}.targetId`, 4096),
    status: edgeStatus(object.status, `${location}.status`),
  };
}

function rebuildLightMetric(
  value: unknown,
  location: string,
): SynthesisSidecarCitationGraphLightMetric {
  const object = toSynthesisJsonObject(value, location);
  exactFields(
    object,
    [
      "nodeId",
      "outgoingCount",
      "incomingCount",
      "localDegree",
      "matchedOutgoingCount",
      "unresolvedOutgoingCount",
      "ambiguousOutgoingCount",
    ],
    location,
  );
  if (object.ambiguousOutgoingCount !== 0) {
    invalid(`${location}.ambiguousOutgoingCount`);
  }
  return {
    nodeId: boundedString(object.nodeId, `${location}.nodeId`, 4096),
    outgoingCount: nonNegativeInteger(
      object.outgoingCount,
      `${location}.outgoingCount`,
    ),
    incomingCount: nonNegativeInteger(
      object.incomingCount,
      `${location}.incomingCount`,
    ),
    localDegree: nonNegativeInteger(
      object.localDegree,
      `${location}.localDegree`,
    ),
    matchedOutgoingCount: nonNegativeInteger(
      object.matchedOutgoingCount,
      `${location}.matchedOutgoingCount`,
    ),
    unresolvedOutgoingCount: nonNegativeInteger(
      object.unresolvedOutgoingCount,
      `${location}.unresolvedOutgoingCount`,
    ),
    ambiguousOutgoingCount: 0,
  };
}

export function rebuildSynthesisSidecarTransferPage(
  value: unknown,
): SynthesisSidecarTransferPage {
  const object = toSynthesisJsonObject(value, "transferPage");
  exactFields(object, ["descriptor", "rows"], "transferPage");
  if (!Array.isArray(object.rows)) {
    invalid("transferPage.rows");
  }
  const rows = object.rows;
  if (jsonNodes(rows) > SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageJsonNodes) {
    invalid("transferPage.rows");
  }
  const descriptor = rebuildSynthesisSidecarTransferPageDescriptor(
    object.descriptor,
  );
  if (descriptor.rowCount !== rows.length) {
    invalid("transferPage.descriptor.rowCount");
  }
  const rebuildRows = <Row>(
    rebuild: (entry: unknown, location: string) => Row,
  ) =>
    rows.map((entry, index) => rebuild(entry, `transferPage.rows[${index}]`));
  switch (descriptor.kind) {
    case "library_nodes":
      return {
        descriptor: { ...descriptor, kind: "library_nodes" },
        rows: rebuildRows(rebuildLibraryNode),
      };
    case "references":
      return {
        descriptor: { ...descriptor, kind: "references" },
        rows: rebuildRows(rebuildReference),
      };
    case "nodes":
      return {
        descriptor: { ...descriptor, kind: "nodes" },
        rows: rebuildRows(rebuildGraphNode),
      };
    case "resolved_edges":
      return {
        descriptor: { ...descriptor, kind: "resolved_edges" },
        rows: rebuildRows(rebuildResolvedEdge),
      };
    case "aggregate_edges":
      return {
        descriptor: { ...descriptor, kind: "aggregate_edges" },
        rows: rebuildRows(rebuildAggregateEdge),
      };
    case "source_ownership":
      return {
        descriptor: { ...descriptor, kind: "source_ownership" },
        rows: rebuildRows(rebuildOwnership),
      };
    case "incoming_groups":
      return {
        descriptor: { ...descriptor, kind: "incoming_groups" },
        rows: rebuildRows(rebuildOwnership),
      };
    case "light_metrics":
      return {
        descriptor: { ...descriptor, kind: "light_metrics" },
        rows: rebuildRows(rebuildLightMetric),
      };
    case "content":
      if (
        rows.length !== 1 ||
        typeof rows[0] !== "string" ||
        rows[0].length > SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageBytes
      ) {
        invalid("transferPage.rows");
      }
      return {
        descriptor: { ...descriptor, kind: "content" },
        rows: [rows[0]],
      };
  }
}

export function rebuildSynthesisSidecarOutputTransferReference(
  value: unknown,
): SynthesisSidecarOutputTransferReference {
  const object = toSynthesisJsonObject(value, "outputTransferReference");
  exactFields(object, ["sessionId", "rootSha256"], "outputTransferReference");
  return {
    sessionId: boundedString(
      object.sessionId,
      "outputTransferReference.sessionId",
      SYNTHESIS_SIDECAR_TRANSFER_LIMITS.sessionIdLength,
    ),
    rootSha256: sha256(object.rootSha256, "outputTransferReference.rootSha256"),
  };
}

function sessionAction(
  object: SynthesisJsonObject,
  action:
    | "seal_input"
    | "execute"
    | "status"
    | "get_output_manifest"
    | "cancel",
) {
  exactFields(object, ["action", "sessionId"], "transferAction");
  return {
    action,
    sessionId: boundedString(
      object.sessionId,
      "transferAction.sessionId",
      SYNTHESIS_SIDECAR_TRANSFER_LIMITS.sessionIdLength,
    ),
  };
}

export function rebuildSynthesisSidecarTransferAction(
  value: unknown,
): SynthesisSidecarTransferAction {
  const object = toSynthesisJsonObject(value, "transferAction");
  switch (object.action) {
    case "begin":
      exactFields(
        object,
        ["action", "idempotencyKey", "manifest"],
        "transferAction",
      );
      return {
        action: "begin",
        idempotencyKey: boundedString(
          object.idempotencyKey,
          "transferAction.idempotencyKey",
          SYNTHESIS_SIDECAR_TRANSFER_LIMITS.idempotencyKeyLength,
        ),
        manifest: rebuildSynthesisSidecarTransferManifest(object.manifest),
      };
    case "put_input_page":
      exactFields(object, ["action", "sessionId", "page"], "transferAction");
      return {
        action: "put_input_page",
        sessionId: boundedString(
          object.sessionId,
          "transferAction.sessionId",
          SYNTHESIS_SIDECAR_TRANSFER_LIMITS.sessionIdLength,
        ),
        page: rebuildSynthesisSidecarTransferPage(object.page),
      };
    case "seal_input":
    case "execute":
    case "status":
    case "get_output_manifest":
    case "cancel":
      return sessionAction(object, object.action);
    case "get_output_page":
      exactFields(
        object,
        ["action", "sessionId", "kind", "pageIndex"],
        "transferAction",
      );
      return {
        action: "get_output_page",
        sessionId: boundedString(
          object.sessionId,
          "transferAction.sessionId",
          SYNTHESIS_SIDECAR_TRANSFER_LIMITS.sessionIdLength,
        ),
        kind: boundedString(object.kind, "transferAction.kind", 64),
        pageIndex: nonNegativeInteger(
          object.pageIndex,
          "transferAction.pageIndex",
        ),
      };
    default:
      return invalid("transferAction.action");
  }
}

function progress(
  value: unknown,
  location: string,
): SynthesisSidecarTransferProgress {
  const object = toSynthesisJsonObject(value, location);
  exactFields(object, ["receivedPages", "totalPages", "stagedBytes"], location);
  return {
    receivedPages: nonNegativeInteger(
      object.receivedPages,
      `${location}.receivedPages`,
    ),
    totalPages: nonNegativeInteger(object.totalPages, `${location}.totalPages`),
    stagedBytes: nonNegativeInteger(
      object.stagedBytes,
      `${location}.stagedBytes`,
    ),
  };
}

const EXECUTION_FAILURE_CODES = new Set<string>([
  "worker_timeout",
  "worker_canceled",
  "worker_crashed",
  "worker_result_invalid",
  "worker_unavailable",
  "transfer_limit_exceeded",
  "transfer_conflict",
  "internal_error",
]);

function execution(value: unknown): SynthesisSidecarTransferExecution {
  const object = toSynthesisJsonObject(value, "transferStatus.execution");
  exactFields(
    object,
    ["attempts", ...(object.lastFailure === undefined ? [] : ["lastFailure"])],
    "transferStatus.execution",
  );
  const rebuilt: SynthesisSidecarTransferExecution = {
    attempts: nonNegativeInteger(
      object.attempts,
      "transferStatus.execution.attempts",
    ),
  };
  if (object.lastFailure !== undefined) {
    const failure = toSynthesisJsonObject(
      object.lastFailure,
      "transferStatus.execution.lastFailure",
    );
    exactFields(
      failure,
      ["code", "retryable", "atMs"],
      "transferStatus.execution.lastFailure",
    );
    if (
      typeof failure.code !== "string" ||
      !EXECUTION_FAILURE_CODES.has(failure.code) ||
      typeof failure.retryable !== "boolean"
    ) {
      invalid("transferStatus.execution.lastFailure");
    }
    rebuilt.lastFailure = {
      code: failure.code as SynthesisSidecarTransferExecutionFailureCode,
      retryable: failure.retryable,
      atMs: nonNegativeInteger(
        failure.atMs,
        "transferStatus.execution.lastFailure.atMs",
      ),
    };
  }
  return rebuilt;
}

export function rebuildSynthesisSidecarTransferStatus(
  value: unknown,
): SynthesisSidecarTransferStatus {
  const object = toSynthesisJsonObject(value, "transferStatus");
  const expected = [
    "sessionId",
    "state",
    "input",
    "execution",
    "stagedBytes",
    "createdAtMs",
    "lastActivityAtMs",
    ...(object.output === undefined ? [] : ["output"]),
  ];
  exactFields(object, expected, "transferStatus");
  if (
    object.state !== "receiving_input" &&
    object.state !== "input_sealed" &&
    object.state !== "queued" &&
    object.state !== "executing" &&
    object.state !== "publishing_output" &&
    object.state !== "completed"
  ) {
    invalid("transferStatus.state");
  }
  const status: SynthesisSidecarTransferStatus = {
    sessionId: boundedString(
      object.sessionId,
      "transferStatus.sessionId",
      SYNTHESIS_SIDECAR_TRANSFER_LIMITS.sessionIdLength,
    ),
    state: object.state,
    input: progress(object.input, "transferStatus.input"),
    execution: execution(object.execution),
    stagedBytes: nonNegativeInteger(
      object.stagedBytes,
      "transferStatus.stagedBytes",
    ),
    createdAtMs: nonNegativeInteger(
      object.createdAtMs,
      "transferStatus.createdAtMs",
    ),
    lastActivityAtMs: nonNegativeInteger(
      object.lastActivityAtMs,
      "transferStatus.lastActivityAtMs",
    ),
  };
  if (object.output !== undefined) {
    status.output = progress(object.output, "transferStatus.output");
  }
  return status;
}

export function rebuildSynthesisSidecarTransferSnapshot(
  value: unknown,
): SynthesisSidecarTransferSnapshot {
  const object = toSynthesisJsonObject(value, "transferSnapshot");
  exactFields(object, ["state", "sessions", "stagedBytes"], "transferSnapshot");
  if (
    object.state !== "idle" &&
    object.state !== "active" &&
    object.state !== "stopping"
  ) {
    invalid("transferSnapshot.state");
  }
  return {
    state: object.state,
    sessions: nonNegativeInteger(object.sessions, "transferSnapshot.sessions"),
    stagedBytes: nonNegativeInteger(
      object.stagedBytes,
      "transferSnapshot.stagedBytes",
    ),
  };
}
