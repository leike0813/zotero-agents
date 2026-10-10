import {
  SynthesisClientError,
  assertSynthesisExactFields,
  toSynthesisJsonObject,
  toSynthesisJsonValue,
  type SynthesisJsonObject,
  type SynthesisJsonValue,
} from "./common.js";
import type {
  LiteratureQualitySnapshot,
  SynthesisPaperArtifactType,
} from "./literatureArtifacts.js";
import type {
  ZoteroLibrarySnapshotPageDto,
  ZoteroLibrarySnapshotRequestDto,
} from "./librarySnapshot.js";
import type {
  SynthesisEvidenceLocation,
  SynthesisEvidenceSource,
  SynthesisLibrarySearchScope,
  SynthesisPortableItemRef,
  SynthesisSearchSourceKind,
  SynthesisSearchIssue,
} from "./search.js";

export const SYNTHESIS_HOST_READ_PAGE_LIMIT_DEFAULT = 50 as const;
export const SYNTHESIS_HOST_READ_PAGE_LIMIT_MAX = 100 as const;
export const SYNTHESIS_HOST_READ_REF_LIMIT_MAX = 100 as const;

export type SynthesisHostLibraryItemSummary = {
  paperRef: string;
  libraryId: number;
  itemKey: string;
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
  updatedAt?: string;
  metadataHash?: string;
};

export type SynthesisHostPageRequest = {
  libraryId: number;
  cursor?: string;
  limit?: number;
};

export type SynthesisHostPageResult = {
  cursor: string;
  nextCursor: string;
  snapshotRevision?: string;
  hasMore: boolean;
  returned: number;
  limit: number;
};

export type SynthesisHostLibraryItemsPageResult = SynthesisHostPageResult & {
  items: SynthesisHostLibraryItemSummary[];
  total: number;
};

export type SynthesisHostLibraryItemsByRefRequest = {
  libraryId: number;
  paperRefs: string[];
};

export type SynthesisHostLibraryItemsByRefResult = {
  items: SynthesisHostLibraryItemSummary[];
  missingPaperRefs: string[];
};

export type SynthesisHostArtifactType = SynthesisPaperArtifactType;

export type SynthesisHostArtifactStatus =
  | "available"
  | "missing"
  | "decode_error"
  | "unsupported";

type SynthesisHostArtifactDescriptorBase = {
  paperRef: string;
  payloadType: string;
  status: SynthesisHostArtifactStatus;
  locator?: string;
  payloadHash?: string;
  estimatedSize?: number;
  diagnostics: string[];
};

export type SynthesisHostArtifactDescriptor =
  | (SynthesisHostArtifactDescriptorBase & {
      artifactType: "literature_score";
      literatureQuality: LiteratureQualitySnapshot;
    })
  | (SynthesisHostArtifactDescriptorBase & {
      artifactType: Exclude<SynthesisHostArtifactType, "literature_score">;
      literatureQuality?: never;
    });

export type SynthesisHostArtifactScanPageRequest = SynthesisHostPageRequest & {
  paperRefs?: string[];
  artifactTypes?: SynthesisHostArtifactType[];
};

export type SynthesisHostArtifactScanPageResult = SynthesisHostPageResult & {
  /** `returned` counts scanned source items; one item may emit several descriptors. */
  artifacts: SynthesisHostArtifactDescriptor[];
};

export type SynthesisHostArtifactReadinessRequest = {
  libraryId: number;
  paperRefs: string[];
  artifactTypes?: SynthesisHostArtifactType[];
};

export type SynthesisHostArtifactReadinessResult = {
  artifacts: SynthesisHostArtifactDescriptor[];
};

export type SynthesisHostArtifactReadRequest = {
  locator: string;
  expectedHash: string;
};

export type SynthesisHostArtifactContent =
  | { kind: "json"; value: SynthesisJsonValue }
  | { kind: "text"; text: string; mediaType: "text/markdown" | "text/plain" };

export type SynthesisHostArtifactReadResult = {
  status: "available" | "missing" | "decode_error" | "stale";
  payloadHash?: string;
  currentHash?: string;
  content?: SynthesisHostArtifactContent;
  /** Runtime Citation provenance; excluded from canonical Citation JSON. */
  referencesBasis?: string;
  diagnostics: string[];
};

export type SynthesisHostEvidenceSource = SynthesisEvidenceSource;
export type SynthesisHostEvidenceLocation = SynthesisEvidenceLocation;

export type SynthesisHostEvidenceDescriptor = {
  itemRef: { libraryId: number; key: string };
  source: SynthesisHostEvidenceSource;
  sourceVersion: string;
  format: "text" | "markdown";
  contentLength: number;
};

export type SynthesisHostEvidenceIssue = {
  code: Extract<
    SynthesisSearchIssue["code"],
    | "source_unavailable"
    | "source_changed"
    | "source_read_failed"
    | "invalid_source"
    | "scan_budget_exhausted"
  >;
  sourceKind: "metadata" | "fulltext" | "analysis" | null;
  affectedCount: number;
};

export type SynthesisHostEvidenceScope = {
  libraryIds: number[];
} & Omit<SynthesisLibrarySearchScope, "libraryIds">;

export type SynthesisHostEvidenceSourcesRequest = {
  scope: SynthesisLibrarySearchScope;
  sourceKinds?: SynthesisSearchSourceKind[];
  limit?: number;
  cursor?: string;
};

export type SynthesisHostEvidenceSourcesResult = {
  scope: SynthesisHostEvidenceScope;
  descriptors: SynthesisHostEvidenceDescriptor[];
  nextCursor: string | null;
  hasMore: boolean;
  issues: SynthesisHostEvidenceIssue[];
};

export type SynthesisHostEvidenceReadRequest = {
  scope: SynthesisHostEvidenceScope;
  descriptor: SynthesisHostEvidenceDescriptor;
  location?: SynthesisHostEvidenceLocation;
};

export type SynthesisHostEvidenceContext = {
  content: string;
  format: "text" | "markdown";
  source: SynthesisHostEvidenceSource;
  sourceVersion: string;
  location: SynthesisHostEvidenceLocation;
};

export type SynthesisHostEvidenceReadResult =
  | ({
      outcome: "available";
      itemRef: { libraryId: number; key: string };
    } & SynthesisHostEvidenceContext)
  | {
      outcome:
        | "invalid_source"
        | "source_changed"
        | "source_unavailable"
        | "source_read_failed";
    };

export interface SynthesisHostLibraryReadPort {
  syncSnapshot(
    request: ZoteroLibrarySnapshotRequestDto,
  ): Promise<ZoteroLibrarySnapshotPageDto>;
  listItemsPage(
    request: SynthesisHostPageRequest,
  ): Promise<SynthesisHostLibraryItemsPageResult>;
  getItemsByRef(
    request: SynthesisHostLibraryItemsByRefRequest,
  ): Promise<SynthesisHostLibraryItemsByRefResult>;
}

export interface SynthesisHostArtifactReadPort {
  scanPage(
    request: SynthesisHostArtifactScanPageRequest,
  ): Promise<SynthesisHostArtifactScanPageResult>;
  readiness(
    request: SynthesisHostArtifactReadinessRequest,
  ): Promise<SynthesisHostArtifactReadinessResult>;
  read(
    request: SynthesisHostArtifactReadRequest,
  ): Promise<SynthesisHostArtifactReadResult>;
}

export interface SynthesisHostReadPort {
  readonly library: SynthesisHostLibraryReadPort;
  readonly evidence: {
    listSources(
      request: SynthesisHostEvidenceSourcesRequest,
    ): Promise<SynthesisHostEvidenceSourcesResult>;
    readSource(
      request: SynthesisHostEvidenceReadRequest,
    ): Promise<SynthesisHostEvidenceReadResult>;
  };
  readonly artifacts: SynthesisHostArtifactReadPort;
}

function invalid(location: string): never {
  throw new SynthesisClientError("invalid_request", `${location} is invalid`, {
    location,
  });
}

function stringValue(value: unknown, location: string, allowEmpty = true) {
  if (
    typeof value !== "string" ||
    (!allowEmpty && value.length === 0) ||
    value.length > 65_536
  ) {
    invalid(location);
  }
  return value;
}

function positiveInteger(
  value: unknown,
  location: string,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > maximum
  ) {
    invalid(location);
  }
  return value;
}

function nonNegativeInteger(
  value: unknown,
  location: string,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > maximum
  ) {
    invalid(location);
  }
  return value;
}

function stringArray(value: unknown, location: string, maximum = 10_000) {
  if (!Array.isArray(value) || value.length > maximum) invalid(location);
  return value.map((entry, index) =>
    stringValue(entry, `${location}[${index}]`),
  );
}

function diagnostics(value: unknown, location: string) {
  return stringArray(value, location, 20);
}

function rebuildLibraryItem(
  value: unknown,
  location: string,
): SynthesisHostLibraryItemSummary {
  const record = toSynthesisJsonObject(value, location);
  assertSynthesisExactFields(
    record,
    [
      "paperRef",
      "libraryId",
      "itemKey",
      "itemType",
      "title",
      "year",
      "date",
      "creators",
      "tags",
      "collections",
      "doi",
      "arxiv",
      "isbn",
      "url",
      "citekey",
      "dateAdded",
    ],
    ["updatedAt", "metadataHash"],
    location,
  );
  const updatedAt =
    record.updatedAt === undefined
      ? undefined
      : stringValue(record.updatedAt, `${location}.updatedAt`);
  const metadataHash =
    record.metadataHash === undefined
      ? undefined
      : stringValue(record.metadataHash, `${location}.metadataHash`, false);
  return {
    paperRef: stringValue(record.paperRef, `${location}.paperRef`, false),
    libraryId: positiveInteger(record.libraryId, `${location}.libraryId`),
    itemKey: stringValue(record.itemKey, `${location}.itemKey`, false),
    itemType: stringValue(record.itemType, `${location}.itemType`),
    title: stringValue(record.title, `${location}.title`),
    year: stringValue(record.year, `${location}.year`),
    date: stringValue(record.date, `${location}.date`),
    creators: stringArray(record.creators, `${location}.creators`),
    tags: stringArray(record.tags, `${location}.tags`),
    collections: stringArray(record.collections, `${location}.collections`),
    doi: stringValue(record.doi, `${location}.doi`),
    arxiv: stringValue(record.arxiv, `${location}.arxiv`),
    isbn: stringValue(record.isbn, `${location}.isbn`),
    url: stringValue(record.url, `${location}.url`),
    citekey: stringValue(record.citekey, `${location}.citekey`),
    dateAdded: stringValue(record.dateAdded, `${location}.dateAdded`),
    ...(updatedAt === undefined ? {} : { updatedAt }),
    ...(metadataHash === undefined ? {} : { metadataHash }),
  };
}

function evidenceObject(value: unknown, location: string) {
  return toSynthesisJsonObject(value, location);
}

function evidenceExact(
  value: SynthesisJsonObject,
  required: readonly string[],
  optional: readonly string[],
  location: string,
) {
  assertSynthesisExactFields(value, required, optional, location);
}

function evidenceRef(value: unknown, location: string) {
  const ref = evidenceObject(value, location);
  evidenceExact(ref, ["libraryId", "key"], [], location);
  const key = stringValue(ref.key, `${location}.key`, false);
  if (key.length > 64 || !/^[A-Za-z0-9]+$/u.test(key)) {
    invalid(`${location}.key`);
  }
  return {
    libraryId: positiveInteger(ref.libraryId, `${location}.libraryId`),
    key,
  } satisfies SynthesisPortableItemRef;
}

function rebuildEvidenceScope(
  value: unknown,
  location: string,
  resolved: boolean,
) {
  const scope = evidenceObject(value, location);
  evidenceExact(
    scope,
    resolved ? ["libraryIds"] : [],
    ["libraryIds", "collectionRef", "tag", "itemType", "itemRefs"],
    location,
  );
  const libraryIds =
    scope.libraryIds === undefined
      ? undefined
      : (() => {
          if (
            !Array.isArray(scope.libraryIds) ||
            scope.libraryIds.length > 100
          ) {
            invalid(`${location}.libraryIds`);
          }
          return scope.libraryIds.map((id, index) =>
            positiveInteger(id, `${location}.libraryIds[${index}]`),
          );
        })();
  if (
    resolved &&
    (!libraryIds?.length || new Set(libraryIds).size !== libraryIds.length)
  ) {
    invalid(`${location}.libraryIds`);
  }
  if (
    scope.itemRefs !== undefined &&
    (!Array.isArray(scope.itemRefs) || scope.itemRefs.length > 100)
  ) {
    invalid(`${location}.itemRefs`);
  }
  return {
    ...(libraryIds ? { libraryIds } : {}),
    ...(scope.collectionRef !== undefined
      ? {
          collectionRef: evidenceRef(
            scope.collectionRef,
            `${location}.collectionRef`,
          ),
        }
      : {}),
    ...(scope.tag !== undefined
      ? { tag: stringValue(scope.tag, `${location}.tag`) }
      : {}),
    ...(scope.itemType !== undefined
      ? { itemType: stringValue(scope.itemType, `${location}.itemType`, false) }
      : {}),
    ...(scope.itemRefs !== undefined
      ? {
          itemRefs: scope.itemRefs.map((ref, index) =>
            evidenceRef(ref, `${location}.itemRefs[${index}]`),
          ),
        }
      : {}),
  };
}

function rebuildEvidenceSource(
  value: unknown,
  location: string,
): SynthesisHostEvidenceSource {
  const source = evidenceObject(value, location);
  if (source.kind === "metadata") {
    evidenceExact(source, ["kind", "field"], [], location);
    const field = stringValue(source.field, `${location}.field`, false);
    if (
      !new Set([
        "title",
        "abstract",
        "creator",
        "tags",
        "date",
        "publicationTitle",
      ]).has(field)
    ) {
      invalid(`${location}.field`);
    }
    return { kind: "metadata", field };
  }
  if (source.kind === "fulltext") {
    evidenceExact(source, ["kind", "attachmentRef"], [], location);
    return {
      kind: "fulltext",
      attachmentRef: evidenceRef(
        source.attachmentRef,
        `${location}.attachmentRef`,
      ),
    };
  }
  if (source.kind === "analysis") {
    evidenceExact(source, ["kind", "artifactType", "noteRef"], [], location);
    const artifactType = source.artifactType;
    if (
      ![
        "digest",
        "references",
        "citation-analysis",
        "literature-score",
      ].includes(String(artifactType))
    ) {
      invalid(`${location}.artifactType`);
    }
    return {
      kind: "analysis",
      artifactType: artifactType as Extract<
        SynthesisHostEvidenceSource,
        { kind: "analysis" }
      >["artifactType"],
      noteRef: evidenceRef(source.noteRef, `${location}.noteRef`),
    };
  }
  invalid(`${location}.kind`);
}

function rebuildEvidenceLocation(
  value: unknown,
  location: string,
): SynthesisHostEvidenceLocation {
  const source = evidenceObject(value, location);
  evidenceExact(source, ["unit", "field", "range"], [], location);
  if (
    ![
      "field",
      "paragraph",
      "list_item",
      "table_row",
      "analysis_field",
    ].includes(String(source.unit))
  ) {
    invalid(`${location}.unit`);
  }
  const range = evidenceObject(source.range, `${location}.range`);
  evidenceExact(range, ["start", "end"], [], `${location}.range`);
  const start = nonNegativeInteger(
    range.start,
    `${location}.range.start`,
    262_144,
  );
  const end = positiveInteger(range.end, `${location}.range.end`, 262_144);
  if (end <= start) invalid(`${location}.range`);
  if (
    source.unit === "analysis_field" &&
    (typeof source.field !== "string" || !source.field)
  ) {
    invalid(`${location}.field`);
  }
  return {
    unit: source.unit as SynthesisHostEvidenceLocation["unit"],
    field:
      source.field === null
        ? null
        : stringValue(source.field, `${location}.field`, false),
    range: { start, end },
  };
}

function rebuildEvidenceDescriptor(
  value: unknown,
  location: string,
): SynthesisHostEvidenceDescriptor {
  const descriptor = evidenceObject(value, location);
  evidenceExact(
    descriptor,
    ["itemRef", "source", "sourceVersion", "format", "contentLength"],
    [],
    location,
  );
  if (descriptor.format !== "text" && descriptor.format !== "markdown")
    invalid(`${location}.format`);
  if (
    typeof descriptor.sourceVersion !== "string" ||
    descriptor.sourceVersion.length > 256
  )
    invalid(`${location}.sourceVersion`);
  return {
    itemRef: evidenceRef(descriptor.itemRef, `${location}.itemRef`),
    source: rebuildEvidenceSource(descriptor.source, `${location}.source`),
    sourceVersion: stringValue(
      descriptor.sourceVersion,
      `${location}.sourceVersion`,
      false,
    ),
    format: descriptor.format,
    contentLength: nonNegativeInteger(
      descriptor.contentLength,
      `${location}.contentLength`,
      262_144,
    ),
  };
}

function rebuildEvidenceIssues(
  value: unknown,
  location: string,
): SynthesisHostEvidenceIssue[] {
  if (!Array.isArray(value) || value.length > 20) invalid(location);
  return value.map((entry, index) => {
    const issue = evidenceObject(entry, `${location}[${index}]`);
    evidenceExact(
      issue,
      ["code", "sourceKind", "affectedCount"],
      [],
      `${location}[${index}]`,
    );
    if (
      ![
        "source_unavailable",
        "source_changed",
        "source_read_failed",
        "invalid_source",
        "scan_budget_exhausted",
      ].includes(String(issue.code))
    )
      invalid(`${location}[${index}].code`);
    if (
      issue.sourceKind !== null &&
      !["metadata", "fulltext", "analysis"].includes(String(issue.sourceKind))
    )
      invalid(`${location}[${index}].sourceKind`);
    return {
      code: issue.code as SynthesisHostEvidenceIssue["code"],
      sourceKind: issue.sourceKind as SynthesisHostEvidenceIssue["sourceKind"],
      affectedCount: nonNegativeInteger(
        issue.affectedCount,
        `${location}[${index}].affectedCount`,
        100_000,
      ),
    };
  });
}

export function rebuildSynthesisHostEvidenceSourcesRequest(
  value: unknown,
): SynthesisHostEvidenceSourcesRequest {
  const request = evidenceObject(value, "hostEvidenceSourcesRequest");
  evidenceExact(
    request,
    ["scope"],
    ["sourceKinds", "limit", "cursor"],
    "hostEvidenceSourcesRequest",
  );
  let sourceKinds: SynthesisHostEvidenceSourcesRequest["sourceKinds"];
  if (request.sourceKinds !== undefined) {
    if (
      !Array.isArray(request.sourceKinds) ||
      request.sourceKinds.some(
        (kind) => !["metadata", "fulltext", "analysis"].includes(String(kind)),
      )
    )
      invalid("hostEvidenceSourcesRequest.sourceKinds");
    sourceKinds =
      request.sourceKinds as SynthesisHostEvidenceSourcesRequest["sourceKinds"];
  }
  const limit =
    request.limit === undefined
      ? undefined
      : positiveInteger(request.limit, "hostEvidenceSourcesRequest.limit", 100);
  return {
    scope: rebuildEvidenceScope(
      request.scope,
      "hostEvidenceSourcesRequest.scope",
      false,
    ),
    ...(sourceKinds !== undefined
      ? { sourceKinds: [...new Set(sourceKinds)] }
      : {}),
    ...(limit !== undefined ? { limit } : {}),
    ...(request.cursor !== undefined
      ? {
          cursor: stringValue(
            request.cursor,
            "hostEvidenceSourcesRequest.cursor",
            false,
          ),
        }
      : {}),
  };
}

export function rebuildSynthesisHostEvidenceSourcesResult(
  value: unknown,
): SynthesisHostEvidenceSourcesResult {
  const result = evidenceObject(value, "hostEvidenceSourcesResult");
  evidenceExact(
    result,
    ["scope", "descriptors", "nextCursor", "hasMore", "issues"],
    [],
    "hostEvidenceSourcesResult",
  );
  if (!Array.isArray(result.descriptors) || result.descriptors.length > 100)
    invalid("hostEvidenceSourcesResult.descriptors");
  if (typeof result.hasMore !== "boolean")
    invalid("hostEvidenceSourcesResult.hasMore");
  if (result.hasMore !== (result.nextCursor !== null))
    invalid("hostEvidenceSourcesResult.nextCursor");
  return {
    scope: rebuildEvidenceScope(
      result.scope,
      "hostEvidenceSourcesResult.scope",
      true,
    ) as SynthesisHostEvidenceScope,
    descriptors: result.descriptors.map((descriptor, index) =>
      rebuildEvidenceDescriptor(
        descriptor,
        `hostEvidenceSourcesResult.descriptors[${index}]`,
      ),
    ),
    nextCursor:
      result.nextCursor === null
        ? null
        : stringValue(
            result.nextCursor,
            "hostEvidenceSourcesResult.nextCursor",
            false,
          ),
    hasMore: result.hasMore,
    issues: rebuildEvidenceIssues(
      result.issues,
      "hostEvidenceSourcesResult.issues",
    ),
  };
}

export function rebuildSynthesisHostEvidenceReadRequest(
  value: unknown,
): SynthesisHostEvidenceReadRequest {
  const request = evidenceObject(value, "hostEvidenceReadRequest");
  evidenceExact(
    request,
    ["scope", "descriptor"],
    ["location"],
    "hostEvidenceReadRequest",
  );
  return {
    scope: rebuildEvidenceScope(
      request.scope,
      "hostEvidenceReadRequest.scope",
      true,
    ) as SynthesisHostEvidenceScope,
    descriptor: rebuildEvidenceDescriptor(
      request.descriptor,
      "hostEvidenceReadRequest.descriptor",
    ),
    ...(request.location !== undefined
      ? {
          location: rebuildEvidenceLocation(
            request.location,
            "hostEvidenceReadRequest.location",
          ),
        }
      : {}),
  };
}

export function rebuildSynthesisHostEvidenceReadResult(
  value: unknown,
): SynthesisHostEvidenceReadResult {
  const result = evidenceObject(value, "hostEvidenceReadResult");
  if (result.outcome !== "available") {
    evidenceExact(result, ["outcome"], [], "hostEvidenceReadResult");
    if (
      ![
        "invalid_source",
        "source_changed",
        "source_unavailable",
        "source_read_failed",
      ].includes(String(result.outcome))
    )
      invalid("hostEvidenceReadResult.outcome");
    return {
      outcome: result.outcome as Exclude<
        SynthesisHostEvidenceReadResult,
        { outcome: "available" }
      >["outcome"],
    };
  }
  evidenceExact(
    result,
    [
      "outcome",
      "itemRef",
      "content",
      "format",
      "source",
      "sourceVersion",
      "location",
    ],
    [],
    "hostEvidenceReadResult",
  );
  if (
    typeof result.content !== "string" ||
    result.content.length > 8 * 1024 * 1024
  )
    invalid("hostEvidenceReadResult.content");
  if (result.format !== "text" && result.format !== "markdown")
    invalid("hostEvidenceReadResult.format");
  return {
    outcome: "available",
    itemRef: evidenceRef(result.itemRef, "hostEvidenceReadResult.itemRef"),
    content: result.content,
    format: result.format,
    source: rebuildEvidenceSource(
      result.source,
      "hostEvidenceReadResult.source",
    ),
    sourceVersion: stringValue(
      result.sourceVersion,
      "hostEvidenceReadResult.sourceVersion",
      false,
    ),
    location: rebuildEvidenceLocation(
      result.location,
      "hostEvidenceReadResult.location",
    ),
  };
}

function rebuildPageFields(value: SynthesisJsonValue, location: string) {
  const record = toSynthesisJsonObject(value, location);
  const snapshotRevision =
    record.snapshotRevision === undefined
      ? undefined
      : stringValue(
          record.snapshotRevision,
          `${location}.snapshotRevision`,
          false,
        );
  if (typeof record.hasMore !== "boolean") invalid(`${location}.hasMore`);
  if (
    typeof record.returned !== "number" ||
    !Number.isSafeInteger(record.returned) ||
    record.returned < 0
  ) {
    invalid(`${location}.returned`);
  }
  return {
    cursor: stringValue(record.cursor, `${location}.cursor`),
    nextCursor: stringValue(record.nextCursor, `${location}.nextCursor`),
    ...(snapshotRevision === undefined ? {} : { snapshotRevision }),
    hasMore: record.hasMore,
    returned: record.returned,
    limit: positiveInteger(record.limit, `${location}.limit`, 100),
  };
}

export function rebuildSynthesisHostPageRequest(
  value: unknown,
): SynthesisHostPageRequest {
  const record = toSynthesisJsonObject(value, "hostPageRequest");
  assertSynthesisExactFields(
    record,
    ["libraryId"],
    ["cursor", "limit"],
    "hostPageRequest",
  );
  return {
    libraryId: positiveInteger(record.libraryId, "hostPageRequest.libraryId"),
    ...(record.cursor === undefined
      ? {}
      : { cursor: stringValue(record.cursor, "hostPageRequest.cursor") }),
    ...(record.limit === undefined
      ? {}
      : {
          limit: positiveInteger(
            record.limit,
            "hostPageRequest.limit",
            SYNTHESIS_HOST_READ_PAGE_LIMIT_MAX,
          ),
        }),
  };
}

export function rebuildSynthesisHostLibraryItemsPageResult(
  value: unknown,
): SynthesisHostLibraryItemsPageResult {
  const record = toSynthesisJsonObject(value, "hostLibraryItemsPageResult");
  assertSynthesisExactFields(
    record,
    ["cursor", "nextCursor", "hasMore", "returned", "limit", "items", "total"],
    ["snapshotRevision"],
    "hostLibraryItemsPageResult",
  );
  if (!Array.isArray(record.items) || record.items.length > 100) {
    invalid("hostLibraryItemsPageResult.items");
  }
  return {
    ...rebuildPageFields(record, "hostLibraryItemsPageResult"),
    total: nonNegativeInteger(record.total, "hostLibraryItemsPageResult.total"),
    items: record.items.map((entry, index) =>
      rebuildLibraryItem(entry, `hostLibraryItemsPageResult.items[${index}]`),
    ),
  };
}

export function rebuildSynthesisHostLibraryItemsByRefRequest(
  value: unknown,
): SynthesisHostLibraryItemsByRefRequest {
  const record = toSynthesisJsonObject(value, "hostLibraryItemsByRefRequest");
  assertSynthesisExactFields(
    record,
    ["libraryId", "paperRefs"],
    [],
    "hostLibraryItemsByRefRequest",
  );
  const paperRefs = stringArray(
    record.paperRefs,
    "hostLibraryItemsByRefRequest.paperRefs",
    SYNTHESIS_HOST_READ_REF_LIMIT_MAX,
  );
  if (paperRefs.length === 0) invalid("hostLibraryItemsByRefRequest.paperRefs");
  return {
    libraryId: positiveInteger(
      record.libraryId,
      "hostLibraryItemsByRefRequest.libraryId",
    ),
    paperRefs,
  };
}

export function rebuildSynthesisHostLibraryItemsByRefResult(
  value: unknown,
): SynthesisHostLibraryItemsByRefResult {
  const record = toSynthesisJsonObject(value, "hostLibraryItemsByRefResult");
  assertSynthesisExactFields(
    record,
    ["items", "missingPaperRefs"],
    [],
    "hostLibraryItemsByRefResult",
  );
  if (!Array.isArray(record.items) || record.items.length > 100) {
    invalid("hostLibraryItemsByRefResult.items");
  }
  return {
    items: record.items.map((entry, index) =>
      rebuildLibraryItem(entry, `hostLibraryItemsByRefResult.items[${index}]`),
    ),
    missingPaperRefs: stringArray(
      record.missingPaperRefs,
      "hostLibraryItemsByRefResult.missingPaperRefs",
      100,
    ),
  };
}

export function rebuildSynthesisHostArtifactScanPageRequest(
  value: unknown,
): SynthesisHostArtifactScanPageRequest {
  const record = toSynthesisJsonObject(value, "hostArtifactScanPageRequest");
  assertSynthesisExactFields(
    record,
    ["libraryId"],
    ["cursor", "limit", "paperRefs", "artifactTypes"],
    "hostArtifactScanPageRequest",
  );
  const page = rebuildSynthesisHostPageRequest({
    libraryId: record.libraryId,
    ...(record.cursor === undefined ? {} : { cursor: record.cursor }),
    ...(record.limit === undefined ? {} : { limit: record.limit }),
  });
  const artifactTypes =
    record.artifactTypes === undefined
      ? undefined
      : stringArray(
          record.artifactTypes,
          "hostArtifactScanPageRequest.artifactTypes",
          4,
        );
  if (
    artifactTypes?.some(
      (entry) =>
        entry !== "digest" &&
        entry !== "references" &&
        entry !== "citation_analysis" &&
        entry !== "literature_score",
    )
  ) {
    invalid("hostArtifactScanPageRequest.artifactTypes");
  }
  return {
    ...page,
    ...(record.paperRefs === undefined
      ? {}
      : {
          paperRefs: stringArray(
            record.paperRefs,
            "hostArtifactScanPageRequest.paperRefs",
            100,
          ),
        }),
    ...(artifactTypes === undefined
      ? {}
      : { artifactTypes: artifactTypes as SynthesisHostArtifactType[] }),
  };
}

export function rebuildSynthesisHostArtifactReadinessRequest(
  value: unknown,
): SynthesisHostArtifactReadinessRequest {
  const record = toSynthesisJsonObject(value, "hostArtifactReadinessRequest");
  assertSynthesisExactFields(
    record,
    ["libraryId", "paperRefs"],
    ["artifactTypes"],
    "hostArtifactReadinessRequest",
  );
  const rebuilt = rebuildSynthesisHostArtifactScanPageRequest(record);
  if (!rebuilt.paperRefs?.length) {
    invalid("hostArtifactReadinessRequest.paperRefs");
  }
  return {
    libraryId: rebuilt.libraryId,
    paperRefs: rebuilt.paperRefs,
    ...(rebuilt.artifactTypes ? { artifactTypes: rebuilt.artifactTypes } : {}),
  };
}

function rebuildLiteratureQuality(
  value: unknown,
  location: string,
): LiteratureQualitySnapshot {
  const record = toSynthesisJsonObject(value, location);
  assertSynthesisExactFields(
    record,
    ["status", "quality_prior", "diagnostics"],
    [
      "schema",
      "rubric_id",
      "paper_type",
      "overall_score",
      "confidence",
      "confidence_adjusted_score",
      "payload_hash",
    ],
    location,
  );
  if (
    record.status !== "available" &&
    record.status !== "missing" &&
    record.status !== "invalid"
  ) {
    invalid(`${location}.status`);
  }
  const status = record.status as LiteratureQualitySnapshot["status"];
  const numeric = (field: string) => {
    const entry = record[field];
    if (
      entry !== undefined &&
      (typeof entry !== "number" || !Number.isFinite(entry))
    ) {
      invalid(`${location}.${field}`);
    }
    return entry as number | undefined;
  };
  const qualityPrior = numeric("quality_prior");
  if (qualityPrior === undefined) invalid(`${location}.quality_prior`);
  const rebuiltDiagnostics = stringArray(
    record.diagnostics,
    `${location}.diagnostics`,
    2,
  );
  if (
    rebuiltDiagnostics.some(
      (entry) =>
        entry !== "literature_score_missing" &&
        entry !== "literature_score_invalid",
    )
  ) {
    invalid(`${location}.diagnostics`);
  }
  return {
    status,
    ...(record.schema === undefined
      ? {}
      : record.schema === "literature_score.v1"
        ? { schema: record.schema }
        : invalid(`${location}.schema`)),
    ...(record.rubric_id === undefined
      ? {}
      : {
          rubric_id: stringValue(
            record.rubric_id,
            `${location}.rubric_id`,
            false,
          ),
        }),
    ...(record.paper_type === undefined
      ? {}
      : {
          paper_type: stringValue(
            record.paper_type,
            `${location}.paper_type`,
            false,
          ),
        }),
    ...(numeric("overall_score") === undefined
      ? {}
      : { overall_score: numeric("overall_score") }),
    ...(numeric("confidence") === undefined
      ? {}
      : { confidence: numeric("confidence") }),
    ...(numeric("confidence_adjusted_score") === undefined
      ? {}
      : { confidence_adjusted_score: numeric("confidence_adjusted_score") }),
    quality_prior: qualityPrior,
    ...(record.payload_hash === undefined
      ? {}
      : {
          payload_hash: stringValue(
            record.payload_hash,
            `${location}.payload_hash`,
            false,
          ),
        }),
    diagnostics: rebuiltDiagnostics as LiteratureQualitySnapshot["diagnostics"],
  };
}

function rebuildArtifactDescriptor(
  value: unknown,
  location: string,
): SynthesisHostArtifactDescriptor {
  const record = toSynthesisJsonObject(value, location);
  assertSynthesisExactFields(
    record,
    ["paperRef", "artifactType", "payloadType", "status", "diagnostics"],
    ["locator", "payloadHash", "estimatedSize", "literatureQuality"],
    location,
  );
  if (
    record.artifactType !== "digest" &&
    record.artifactType !== "references" &&
    record.artifactType !== "citation_analysis" &&
    record.artifactType !== "literature_score"
  ) {
    invalid(`${location}.artifactType`);
  }
  if (
    record.status !== "available" &&
    record.status !== "missing" &&
    record.status !== "decode_error" &&
    record.status !== "unsupported"
  ) {
    invalid(`${location}.status`);
  }
  const status = record.status as SynthesisHostArtifactStatus;
  const base = {
    paperRef: stringValue(record.paperRef, `${location}.paperRef`, false),
    artifactType: record.artifactType,
    payloadType: stringValue(
      record.payloadType,
      `${location}.payloadType`,
      false,
    ),
    status,
    ...(record.locator === undefined
      ? {}
      : { locator: stringValue(record.locator, `${location}.locator`, false) }),
    ...(record.payloadHash === undefined
      ? {}
      : {
          payloadHash: stringValue(
            record.payloadHash,
            `${location}.payloadHash`,
            false,
          ),
        }),
    ...(record.estimatedSize === undefined
      ? {}
      : {
          estimatedSize: nonNegativeInteger(
            record.estimatedSize,
            `${location}.estimatedSize`,
          ),
        }),
    diagnostics: diagnostics(record.diagnostics, `${location}.diagnostics`),
  };
  if (record.artifactType === "literature_score") {
    if (record.literatureQuality === undefined)
      invalid(`${location}.literatureQuality`);
    return {
      ...base,
      artifactType: "literature_score",
      literatureQuality: rebuildLiteratureQuality(
        record.literatureQuality,
        `${location}.literatureQuality`,
      ),
    };
  }
  if (record.literatureQuality !== undefined)
    invalid(`${location}.literatureQuality`);
  return base as SynthesisHostArtifactDescriptor;
}

export function rebuildSynthesisHostArtifactScanPageResult(
  value: unknown,
): SynthesisHostArtifactScanPageResult {
  const record = toSynthesisJsonObject(value, "hostArtifactScanPageResult");
  assertSynthesisExactFields(
    record,
    ["cursor", "nextCursor", "hasMore", "returned", "limit", "artifacts"],
    ["snapshotRevision"],
    "hostArtifactScanPageResult",
  );
  if (!Array.isArray(record.artifacts) || record.artifacts.length > 400) {
    invalid("hostArtifactScanPageResult.artifacts");
  }
  return {
    ...rebuildPageFields(record, "hostArtifactScanPageResult"),
    artifacts: record.artifacts.map((entry, index) =>
      rebuildArtifactDescriptor(
        entry,
        `hostArtifactScanPageResult.artifacts[${index}]`,
      ),
    ),
  };
}

export function rebuildSynthesisHostArtifactReadinessResult(
  value: unknown,
): SynthesisHostArtifactReadinessResult {
  const record = toSynthesisJsonObject(value, "hostArtifactReadinessResult");
  assertSynthesisExactFields(
    record,
    ["artifacts"],
    [],
    "hostArtifactReadinessResult",
  );
  if (!Array.isArray(record.artifacts) || record.artifacts.length > 400) {
    invalid("hostArtifactReadinessResult.artifacts");
  }
  return {
    artifacts: record.artifacts.map((entry, index) =>
      rebuildArtifactDescriptor(
        entry,
        `hostArtifactReadinessResult.artifacts[${index}]`,
      ),
    ),
  };
}

export function rebuildSynthesisHostArtifactReadRequest(
  value: unknown,
): SynthesisHostArtifactReadRequest {
  const record = toSynthesisJsonObject(value, "hostArtifactReadRequest");
  assertSynthesisExactFields(
    record,
    ["locator", "expectedHash"],
    [],
    "hostArtifactReadRequest",
  );
  return {
    locator: stringValue(
      record.locator,
      "hostArtifactReadRequest.locator",
      false,
    ),
    expectedHash: stringValue(
      record.expectedHash,
      "hostArtifactReadRequest.expectedHash",
      false,
    ),
  };
}

export function rebuildSynthesisHostArtifactReadResult(
  value: unknown,
): SynthesisHostArtifactReadResult {
  const record = toSynthesisJsonObject(value, "hostArtifactReadResult");
  assertSynthesisExactFields(
    record,
    ["status", "diagnostics"],
    ["payloadHash", "currentHash", "content", "referencesBasis"],
    "hostArtifactReadResult",
  );
  if (
    record.status !== "available" &&
    record.status !== "missing" &&
    record.status !== "decode_error" &&
    record.status !== "stale"
  ) {
    invalid("hostArtifactReadResult.status");
  }
  const status = record.status as SynthesisHostArtifactReadResult["status"];
  const content =
    record.content === undefined
      ? undefined
      : (() => {
          const item = toSynthesisJsonObject(
            record.content,
            "hostArtifactReadResult.content",
          );
          if (item.kind === "json") {
            assertSynthesisExactFields(
              item,
              ["kind", "value"],
              [],
              "hostArtifactReadResult.content",
            );
            return {
              kind: "json" as const,
              value: toSynthesisJsonValue(
                item.value,
                "hostArtifactReadResult.content.value",
              ),
            };
          }
          if (item.kind === "text") {
            assertSynthesisExactFields(
              item,
              ["kind", "text", "mediaType"],
              [],
              "hostArtifactReadResult.content",
            );
            if (
              item.mediaType !== "text/markdown" &&
              item.mediaType !== "text/plain"
            ) {
              invalid("hostArtifactReadResult.content.mediaType");
            }
            const mediaType = item.mediaType as "text/markdown" | "text/plain";
            return {
              kind: "text" as const,
              text: stringValue(
                item.text,
                "hostArtifactReadResult.content.text",
              ),
              mediaType,
            };
          }
          return invalid("hostArtifactReadResult.content.kind");
        })();
  return {
    status,
    ...(record.payloadHash === undefined
      ? {}
      : {
          payloadHash: stringValue(
            record.payloadHash,
            "hostArtifactReadResult.payloadHash",
            false,
          ),
        }),
    ...(record.currentHash === undefined
      ? {}
      : {
          currentHash: stringValue(
            record.currentHash,
            "hostArtifactReadResult.currentHash",
            false,
          ),
        }),
    ...(content === undefined ? {} : { content }),
    ...(record.referencesBasis === undefined
      ? {}
      : {
          referencesBasis: stringValue(
            record.referencesBasis,
            "hostArtifactReadResult.referencesBasis",
            false,
          ),
        }),
    diagnostics: diagnostics(
      record.diagnostics,
      "hostArtifactReadResult.diagnostics",
    ),
  };
}
