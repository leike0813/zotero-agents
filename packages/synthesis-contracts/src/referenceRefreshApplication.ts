import {
  SynthesisClientError,
  toSynthesisJsonObject,
  type SynthesisJsonValue,
} from "./common.js";
import type {
  SynthesisHostArtifactDescriptor,
  SynthesisHostArtifactReadResult,
  SynthesisHostArtifactType,
  SynthesisHostLibraryItemSummary,
} from "./hostRead.js";

export const SYNTHESIS_REFERENCE_REFRESH_APPLICATION_LIMITS = {
  scopedSources: 100,
  page: 100,
  preparationBytes: 8 * 1024 * 1024,
  preparationJsonNodes: 250_000,
  materializedBatchBytes: 2 * 8 * 1024 * 1024 + 64 * 1024,
  materializedBatchJsonNodes: 2 * 250_000 + 1_024,
  deltaSources: 100,
} as const;

export type SynthesisReferenceRefreshScope =
  | { kind: "full" }
  | { kind: "sources"; sourceRefs: string[] };

export type SynthesisReferenceRefreshPrepareRequest = {
  expectedReferenceHash: string | null;
  force: boolean;
  scope: SynthesisReferenceRefreshScope;
  items: SynthesisHostLibraryItemSummary[];
  artifacts: SynthesisHostArtifactDescriptor[];
};

export type SynthesisReferenceRefreshRead = {
  paperRef: string;
  artifactType: "references" | "citation_analysis";
  locator: string;
  expectedHash: string;
};

export type SynthesisReferenceRefreshPayload = {
  locator: string;
  expectedHash: string;
  result: SynthesisHostArtifactReadResult;
};

export type SynthesisReferenceRefreshApplyRequest = {
  preparationId: string;
  payloads: SynthesisReferenceRefreshPayload[];
};

export type SynthesisReferenceRefreshPageRequest = {
  cursor: string;
  limit: number;
};

export type SynthesisReferenceRefreshInspectResult = {
  referenceHash: string | null;
  inputHash: string | null;
  sourceCount: number;
  referenceCount: number;
  canonicalCount: number;
  bindingCount: number;
  referenceReady: boolean;
  graphReady: boolean;
  relatedItemsReady: boolean;
};

export type SynthesisReferenceRefreshMutationStatus =
  | "prepared"
  | "promoted"
  | "unchanged"
  | "basis_mismatch"
  | "reference_refresh_busy"
  | "preparation_missing"
  | "payload_stale"
  | "invalid_request"
  | "projection_failed"
  | "repair_required"
  | "stopping";

export type SynthesisReferenceRefreshMutationResult = {
  status: SynthesisReferenceRefreshMutationStatus;
  referenceHash: string | null;
  inputHash: string | null;
  warnings: string[];
  affectedSourceRefs: string[];
};

export type SynthesisReferenceRefreshPrepareResult =
  | (SynthesisReferenceRefreshMutationResult & {
      status: "prepared";
      preparationId: string;
      reads: SynthesisReferenceRefreshRead[];
    })
  | (SynthesisReferenceRefreshMutationResult & {
      status: Exclude<SynthesisReferenceRefreshMutationStatus, "prepared">;
    });

const artifactOrder: Record<SynthesisHostArtifactType, number> = {
  digest: 0,
  references: 1,
  citation_analysis: 2,
};

function invalid(location: string): never {
  throw new SynthesisClientError(
    "invalid_request",
    `Invalid Reference Refresh application value at ${location}`,
    { location },
  );
}

function exactFields(
  input: Record<string, unknown>,
  fields: readonly string[],
  location: string,
) {
  const allowed = new Set(fields);
  if (Object.keys(input).some((field) => !allowed.has(field))) {
    invalid(`${location}.fields`);
  }
}

function requiredString(value: unknown, location: string, max = 4096) {
  if (
    typeof value !== "string" ||
    value !== value.trim() ||
    value.length === 0 ||
    value.length > max ||
    [...value].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 0x1f || code === 0x7f;
    })
  ) {
    invalid(location);
  }
  return value;
}

function optionalString(value: unknown, location: string, max = 16_384) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > max) invalid(location);
  return value;
}

function hashOrNull(value: unknown, location: string) {
  if (value === null) return null;
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value)) {
    invalid(location);
  }
  return value;
}

function requiredHash(value: unknown, location: string) {
  const hash = hashOrNull(value, location);
  if (!hash) invalid(location);
  return hash;
}

function stringList(value: unknown, location: string, max = 10_000) {
  if (!Array.isArray(value) || value.length > max) invalid(location);
  return value.map((entry, index) => {
    if (typeof entry !== "string" || entry.length > 4096) {
      invalid(`${location}[${index}]`);
    }
    return entry;
  });
}

function rebuildItem(
  value: unknown,
  index: number,
): SynthesisHostLibraryItemSummary {
  const location = `referenceRefreshPrepare.items[${index}]`;
  const input = toSynthesisJsonObject(value, location);
  exactFields(
    input,
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
      "updatedAt",
      "metadataHash",
    ],
    location,
  );
  if (
    typeof input.libraryId !== "number" ||
    !Number.isSafeInteger(input.libraryId) ||
    input.libraryId <= 0
  ) {
    invalid(`${location}.libraryId`);
  }
  const metadataHash =
    input.metadataHash === undefined
      ? undefined
      : requiredHash(input.metadataHash, `${location}.metadataHash`);
  return {
    paperRef: requiredString(input.paperRef, `${location}.paperRef`, 512),
    libraryId: input.libraryId,
    itemKey: requiredString(input.itemKey, `${location}.itemKey`, 512),
    itemType: requiredString(input.itemType, `${location}.itemType`, 128),
    title: optionalString(input.title, `${location}.title`) ?? "",
    year: optionalString(input.year, `${location}.year`, 64) ?? "",
    date: optionalString(input.date, `${location}.date`, 256) ?? "",
    creators: stringList(input.creators, `${location}.creators`, 512),
    tags: stringList(input.tags, `${location}.tags`, 2048),
    collections: stringList(input.collections, `${location}.collections`, 2048),
    doi: optionalString(input.doi, `${location}.doi`, 1024) ?? "",
    arxiv: optionalString(input.arxiv, `${location}.arxiv`, 1024) ?? "",
    isbn: optionalString(input.isbn, `${location}.isbn`, 1024) ?? "",
    url: optionalString(input.url, `${location}.url`) ?? "",
    citekey: optionalString(input.citekey, `${location}.citekey`, 1024) ?? "",
    dateAdded:
      optionalString(input.dateAdded, `${location}.dateAdded`, 256) ?? "",
    ...(input.updatedAt === undefined
      ? {}
      : {
          updatedAt: optionalString(
            input.updatedAt,
            `${location}.updatedAt`,
            256,
          )!,
        }),
    ...(metadataHash ? { metadataHash } : {}),
  };
}

function rebuildDescriptor(
  value: unknown,
  index: number,
): SynthesisHostArtifactDescriptor {
  const location = `referenceRefreshPrepare.artifacts[${index}]`;
  const input = toSynthesisJsonObject(value, location);
  exactFields(
    input,
    [
      "paperRef",
      "artifactType",
      "payloadType",
      "status",
      "locator",
      "payloadHash",
      "estimatedSize",
      "diagnostics",
    ],
    location,
  );
  if (
    input.artifactType !== "digest" &&
    input.artifactType !== "references" &&
    input.artifactType !== "citation_analysis"
  ) {
    invalid(`${location}.artifactType`);
  }
  if (
    input.status !== "available" &&
    input.status !== "missing" &&
    input.status !== "decode_error" &&
    input.status !== "unsupported"
  ) {
    invalid(`${location}.status`);
  }
  const locator = optionalString(input.locator, `${location}.locator`);
  const payloadHash =
    input.payloadHash === undefined
      ? undefined
      : requiredHash(input.payloadHash, `${location}.payloadHash`);
  if (input.status === "available" && (!locator || !payloadHash)) {
    invalid(`${location}.available`);
  }
  if (
    input.estimatedSize !== undefined &&
    (typeof input.estimatedSize !== "number" ||
      !Number.isSafeInteger(input.estimatedSize) ||
      input.estimatedSize < 0)
  ) {
    invalid(`${location}.estimatedSize`);
  }
  return {
    paperRef: requiredString(input.paperRef, `${location}.paperRef`, 512),
    artifactType: input.artifactType,
    payloadType: requiredString(
      input.payloadType,
      `${location}.payloadType`,
      256,
    ),
    status: input.status,
    ...(locator ? { locator } : {}),
    ...(payloadHash ? { payloadHash } : {}),
    ...(input.estimatedSize === undefined
      ? {}
      : { estimatedSize: input.estimatedSize }),
    diagnostics: stringList(input.diagnostics, `${location}.diagnostics`, 256),
  };
}

function rebuildScope(value: unknown): SynthesisReferenceRefreshScope {
  const input = toSynthesisJsonObject(value, "referenceRefreshPrepare.scope");
  if (input.kind === "full") {
    exactFields(input, ["kind"], "referenceRefreshPrepare.scope");
    return { kind: "full" };
  }
  if (input.kind === "sources") {
    exactFields(input, ["kind", "sourceRefs"], "referenceRefreshPrepare.scope");
    const refs = stringList(
      input.sourceRefs,
      "referenceRefreshPrepare.scope.sourceRefs",
      SYNTHESIS_REFERENCE_REFRESH_APPLICATION_LIMITS.scopedSources,
    ).map((entry, index) =>
      requiredString(
        entry,
        `referenceRefreshPrepare.scope.sourceRefs[${index}]`,
        512,
      ),
    );
    if (!refs.length || new Set(refs).size !== refs.length) {
      invalid("referenceRefreshPrepare.scope.sourceRefs");
    }
    return {
      kind: "sources",
      sourceRefs: refs.sort((left, right) => left.localeCompare(right)),
    };
  }
  return invalid("referenceRefreshPrepare.scope.kind");
}

export function rebuildSynthesisReferenceRefreshPrepareRequest(
  value: unknown,
): SynthesisReferenceRefreshPrepareRequest {
  const input = toSynthesisJsonObject(value, "referenceRefreshPrepare");
  exactFields(
    input,
    ["expectedReferenceHash", "force", "scope", "items", "artifacts"],
    "referenceRefreshPrepare",
  );
  if (typeof input.force !== "boolean")
    invalid("referenceRefreshPrepare.force");
  if (!Array.isArray(input.items) || !Array.isArray(input.artifacts)) {
    invalid("referenceRefreshPrepare.collections");
  }
  const scope = rebuildScope(input.scope);
  const items = input.items
    .map(rebuildItem)
    .sort((left, right) => left.paperRef.localeCompare(right.paperRef));
  if (
    (scope.kind === "sources" && !items.length) ||
    new Set(items.map((item) => item.paperRef)).size !== items.length
  ) {
    invalid("referenceRefreshPrepare.items");
  }
  const sourceRefs = items.map((item) => item.paperRef);
  if (
    scope.kind === "sources" &&
    (scope.sourceRefs.length !== sourceRefs.length ||
      scope.sourceRefs.some(
        (paperRef, index) => paperRef !== sourceRefs[index],
      ))
  ) {
    invalid("referenceRefreshPrepare.scope.sourceRefs");
  }
  const sourceSet = new Set(sourceRefs);
  const artifacts = input.artifacts
    .map(rebuildDescriptor)
    .sort(
      (left, right) =>
        left.paperRef.localeCompare(right.paperRef) ||
        artifactOrder[left.artifactType] - artifactOrder[right.artifactType],
    );
  const keys = artifacts.map(
    (artifact) => `${artifact.paperRef}\n${artifact.artifactType}`,
  );
  if (
    artifacts.length !== items.length * 3 ||
    new Set(keys).size !== keys.length ||
    artifacts.some((artifact) => !sourceSet.has(artifact.paperRef)) ||
    sourceRefs.some((paperRef) =>
      (["digest", "references", "citation_analysis"] as const).some(
        (artifactType) => !keys.includes(`${paperRef}\n${artifactType}`),
      ),
    )
  ) {
    invalid("referenceRefreshPrepare.artifacts");
  }
  return {
    expectedReferenceHash: hashOrNull(
      input.expectedReferenceHash,
      "referenceRefreshPrepare.expectedReferenceHash",
    ),
    force: input.force,
    scope,
    items,
    artifacts,
  };
}

function rebuildReadResult(
  value: unknown,
  location: string,
): SynthesisHostArtifactReadResult {
  const input = toSynthesisJsonObject(value, location);
  exactFields(
    input,
    ["status", "payloadHash", "currentHash", "content", "diagnostics"],
    location,
  );
  if (
    input.status !== "available" &&
    input.status !== "missing" &&
    input.status !== "decode_error" &&
    input.status !== "stale"
  ) {
    invalid(`${location}.status`);
  }
  const payloadHash =
    input.payloadHash === undefined
      ? undefined
      : requiredHash(input.payloadHash, `${location}.payloadHash`);
  const currentHash =
    input.currentHash === undefined
      ? undefined
      : requiredHash(input.currentHash, `${location}.currentHash`);
  let content: SynthesisHostArtifactReadResult["content"];
  if (input.content !== undefined) {
    const contentInput = toSynthesisJsonObject(
      input.content,
      `${location}.content`,
    );
    if (contentInput.kind === "json") {
      exactFields(contentInput, ["kind", "value"], `${location}.content`);
      content = {
        kind: "json",
        value: contentInput.value as SynthesisJsonValue,
      };
    } else if (contentInput.kind === "text") {
      exactFields(
        contentInput,
        ["kind", "text", "mediaType"],
        `${location}.content`,
      );
      if (
        typeof contentInput.text !== "string" ||
        (contentInput.mediaType !== "text/markdown" &&
          contentInput.mediaType !== "text/plain")
      ) {
        invalid(`${location}.content`);
      }
      content = {
        kind: "text",
        text: contentInput.text,
        mediaType: contentInput.mediaType,
      };
    } else {
      invalid(`${location}.content.kind`);
    }
  }
  if (input.status === "available" && (!payloadHash || !content)) {
    invalid(`${location}.available`);
  }
  return {
    status: input.status,
    ...(payloadHash ? { payloadHash } : {}),
    ...(currentHash ? { currentHash } : {}),
    ...(content ? { content } : {}),
    diagnostics: stringList(input.diagnostics, `${location}.diagnostics`, 256),
  };
}

export function rebuildSynthesisReferenceRefreshApplyRequest(
  value: unknown,
): SynthesisReferenceRefreshApplyRequest {
  const input = toSynthesisJsonObject(value, "referenceRefreshApply");
  exactFields(input, ["preparationId", "payloads"], "referenceRefreshApply");
  if (!Array.isArray(input.payloads)) invalid("referenceRefreshApply.payloads");
  const payloads = input.payloads.map((value, index) => {
    const location = `referenceRefreshApply.payloads[${index}]`;
    const payload = toSynthesisJsonObject(value, location);
    exactFields(payload, ["locator", "expectedHash", "result"], location);
    return {
      locator: requiredString(payload.locator, `${location}.locator`),
      expectedHash: requiredHash(
        payload.expectedHash,
        `${location}.expectedHash`,
      ),
      result: rebuildReadResult(payload.result, `${location}.result`),
    };
  });
  return {
    preparationId: requiredString(
      input.preparationId,
      "referenceRefreshApply.preparationId",
      512,
    ),
    payloads,
  };
}

export function rebuildSynthesisReferenceRefreshPageRequest(
  value: unknown = {},
): SynthesisReferenceRefreshPageRequest {
  const input = toSynthesisJsonObject(value, "referenceRefreshPage");
  exactFields(input, ["cursor", "limit"], "referenceRefreshPage");
  const cursor = input.cursor === undefined ? "" : input.cursor;
  const limit = input.limit === undefined ? 50 : input.limit;
  if (
    typeof cursor !== "string" ||
    !/^\d*$/.test(cursor) ||
    (cursor && !Number.isSafeInteger(Number(cursor))) ||
    typeof limit !== "number" ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > SYNTHESIS_REFERENCE_REFRESH_APPLICATION_LIMITS.page
  ) {
    invalid("referenceRefreshPage");
  }
  return { cursor, limit };
}

export function rebuildSynthesisReferenceRefreshInspectResult(
  value: unknown,
): SynthesisReferenceRefreshInspectResult {
  const input = toSynthesisJsonObject(value, "referenceRefreshInspectResult");
  exactFields(
    input,
    [
      "referenceHash",
      "inputHash",
      "sourceCount",
      "referenceCount",
      "canonicalCount",
      "bindingCount",
      "referenceReady",
      "graphReady",
      "relatedItemsReady",
    ],
    "referenceRefreshInspectResult",
  );
  const count = (field: string) => {
    const value = input[field];
    if (
      typeof value !== "number" ||
      !Number.isSafeInteger(value) ||
      value < 0
    ) {
      invalid(`referenceRefreshInspectResult.${field}`);
    }
    return value;
  };
  for (const field of ["referenceReady", "graphReady", "relatedItemsReady"]) {
    if (typeof input[field] !== "boolean") {
      invalid(`referenceRefreshInspectResult.${field}`);
    }
  }
  return {
    referenceHash: hashOrNull(
      input.referenceHash,
      "referenceRefreshInspectResult.referenceHash",
    ),
    inputHash: hashOrNull(
      input.inputHash,
      "referenceRefreshInspectResult.inputHash",
    ),
    sourceCount: count("sourceCount"),
    referenceCount: count("referenceCount"),
    canonicalCount: count("canonicalCount"),
    bindingCount: count("bindingCount"),
    referenceReady: input.referenceReady as boolean,
    graphReady: input.graphReady as boolean,
    relatedItemsReady: input.relatedItemsReady as boolean,
  };
}

const mutationStatuses = new Set<SynthesisReferenceRefreshMutationStatus>([
  "prepared",
  "promoted",
  "unchanged",
  "basis_mismatch",
  "reference_refresh_busy",
  "preparation_missing",
  "payload_stale",
  "invalid_request",
  "projection_failed",
  "repair_required",
  "stopping",
]);

export function rebuildSynthesisReferenceRefreshMutationResult(
  value: unknown,
): SynthesisReferenceRefreshMutationResult {
  const input = toSynthesisJsonObject(value, "referenceRefreshMutationResult");
  exactFields(
    input,
    ["status", "referenceHash", "inputHash", "warnings", "affectedSourceRefs"],
    "referenceRefreshMutationResult",
  );
  if (
    typeof input.status !== "string" ||
    !mutationStatuses.has(
      input.status as SynthesisReferenceRefreshMutationStatus,
    ) ||
    !Array.isArray(input.warnings)
  ) {
    invalid("referenceRefreshMutationResult");
  }
  const warnings = stringList(
    input.warnings,
    "referenceRefreshMutationResult.warnings",
    1,
  );
  if (
    warnings.some(
      (warning) => warning !== "reference_refresh_operation_receipt_failed",
    ) ||
    new Set(warnings).size !== warnings.length
  ) {
    invalid("referenceRefreshMutationResult.warnings");
  }
  const affectedSourceRefs = stringList(
    input.affectedSourceRefs,
    "referenceRefreshMutationResult.affectedSourceRefs",
    SYNTHESIS_REFERENCE_REFRESH_APPLICATION_LIMITS.deltaSources,
  );
  if (new Set(affectedSourceRefs).size !== affectedSourceRefs.length) {
    invalid("referenceRefreshMutationResult.affectedSourceRefs");
  }
  return {
    status: input.status as SynthesisReferenceRefreshMutationStatus,
    referenceHash: hashOrNull(
      input.referenceHash,
      "referenceRefreshMutationResult.referenceHash",
    ),
    inputHash: hashOrNull(
      input.inputHash,
      "referenceRefreshMutationResult.inputHash",
    ),
    warnings,
    affectedSourceRefs,
  };
}
