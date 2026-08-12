import {
  SynthesisClientError,
  assertSynthesisExactFields,
  toSynthesisJsonObject,
  toSynthesisJsonValue,
  type SynthesisJsonValue,
} from "./common.js";
import type {
  LiteratureQualitySnapshot,
  SynthesisPaperArtifactType,
} from "./literatureArtifacts.js";

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
  diagnostics: string[];
};

export interface SynthesisHostLibraryReadPort {
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
  read(
    request: SynthesisHostArtifactReadRequest,
  ): Promise<SynthesisHostArtifactReadResult>;
}

export interface SynthesisHostReadPort {
  readonly library: SynthesisHostLibraryReadPort;
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
    ["cursor", "nextCursor", "hasMore", "returned", "limit", "items"],
    ["snapshotRevision"],
    "hostLibraryItemsPageResult",
  );
  if (!Array.isArray(record.items) || record.items.length > 100) {
    invalid("hostLibraryItemsPageResult.items");
  }
  return {
    ...rebuildPageFields(record, "hostLibraryItemsPageResult"),
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
    ["payloadHash", "currentHash", "content"],
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
    diagnostics: diagnostics(
      record.diagnostics,
      "hostArtifactReadResult.diagnostics",
    ),
  };
}
