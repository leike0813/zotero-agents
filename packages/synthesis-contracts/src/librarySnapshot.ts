import { SynthesisClientError, toSynthesisJsonObject } from "./common.js";
import { rebuildSynthesisProtocolDto } from "./protocolSchema.js";

export const ZOTERO_LIBRARY_SNAPSHOT_SCHEMA =
  "zotero-agents.library-full-index.v1" as const;
export const ZOTERO_LIBRARY_SNAPSHOT_SCOPE = "top-level-regular" as const;
export const ZOTERO_LIBRARY_SNAPSHOT_ORDER = "stable_identity" as const;
export const ZOTERO_LIBRARY_SNAPSHOT_BATCH_SIZE_DEFAULT = 500 as const;
export const ZOTERO_LIBRARY_SNAPSHOT_BATCH_SIZE_MAX = 1_000 as const;
export const ZOTERO_LIBRARY_SNAPSHOT_ITEM_LIMIT = 1_000_000 as const;
export const ZOTERO_LIBRARY_SNAPSHOT_TTL_MS = 30 * 60 * 1_000;

export type ZoteroLibrarySnapshotItemRef = {
  libraryId: number;
  key: string;
};

export type ZoteroLibrarySnapshotCollectionRef = {
  libraryId: number;
  key: string;
};

export type ZoteroLibrarySnapshotCreatorDto =
  | {
      representation: "two_field";
      creatorType: string;
      firstName: string;
      lastName: string;
    }
  | {
      representation: "single_field";
      creatorType: string;
      name: string;
    };

export type ZoteroLibrarySnapshotItemDto = {
  ref: ZoteroLibrarySnapshotItemRef;
  kind: "regular";
  itemType: string;
  title: string;
  parentRef: ZoteroLibrarySnapshotItemRef | null;
  state: "active";
  revision: string;
  tags: string[];
  collectionRefs: ZoteroLibrarySnapshotCollectionRef[];
  creators: ZoteroLibrarySnapshotCreatorDto[];
  date: string;
  year: string | null;
  publicationTitle: string;
  identifiers: {
    doi: string | null;
    isbn: string | null;
    issn: string | null;
    arxiv: string | null;
    pmid: string | null;
  };
  url: string | null;
  noteCount: number;
  attachmentCount: number;
  annotationCount: number;
  modifiedAt: string;
};

export type ZoteroLibrarySnapshotRequestDto = {
  libraryId: number;
  batchSize?: number;
  snapshotId?: string;
  cursor?: string;
};

export type ZoteroLibrarySnapshotCallerScope = {
  ownerId: string;
};

export type ZoteroLibrarySnapshotCompletionEvidenceDto = {
  snapshotId: string;
  schema: typeof ZOTERO_LIBRARY_SNAPSHOT_SCHEMA;
  libraryId: number;
  scope: typeof ZOTERO_LIBRARY_SNAPSHOT_SCOPE;
  totalItems: number;
  totalBatches: number;
  order: typeof ZOTERO_LIBRARY_SNAPSHOT_ORDER;
  contentDigest: string;
  completedAt: string;
};

export type ZoteroLibrarySnapshotBatchDto = {
  schema: typeof ZOTERO_LIBRARY_SNAPSHOT_SCHEMA;
  snapshotId: string;
  batchIndex: number;
  items: ZoteroLibrarySnapshotItemDto[];
};

type ZoteroLibrarySnapshotPageBase = {
  schema: typeof ZOTERO_LIBRARY_SNAPSHOT_SCHEMA;
  snapshotId: string;
  libraryId: number;
  scope: typeof ZOTERO_LIBRARY_SNAPSHOT_SCOPE;
  order: typeof ZOTERO_LIBRARY_SNAPSHOT_ORDER;
  batchSize: number;
  batchIndex: number;
  items: ZoteroLibrarySnapshotItemDto[];
  returned: number;
  deliveredItems: number;
  deliveredBatches: number;
};

export type ZoteroLibrarySnapshotPageDto =
  | (ZoteroLibrarySnapshotPageBase & {
      outcome: "active";
      nextCursor: string;
      hasMore: true;
    })
  | (ZoteroLibrarySnapshotPageBase & {
      outcome: "completed";
      nextCursor: null;
      hasMore: false;
      completionEvidence: ZoteroLibrarySnapshotCompletionEvidenceDto;
    });

export type ZoteroLibrarySnapshotIncompleteResultDto = {
  outcome: "canceled" | "expired" | "resource_limited";
  snapshotId: string;
  deliveredItems: number;
  deliveredBatches: number;
};

export type ZoteroLibrarySnapshotWorkflowResultDto =
  | {
      outcome: "completed";
      completionEvidence: ZoteroLibrarySnapshotCompletionEvidenceDto;
    }
  | ZoteroLibrarySnapshotIncompleteResultDto;

function invalid(location: string): never {
  throw new SynthesisClientError("invalid_request", location + " is invalid", {
    location,
  });
}

function snapshotDto<T>(definition: string, value: unknown): T {
  return rebuildSynthesisProtocolDto<T>({
    schemaId:
      "https://zotero-agents.local/synthesis/sidecar-protocol/v1/reverse-host.schema.json",
    definition,
    value,
    direction: "request",
  });
}

export function rebuildZoteroLibrarySnapshotRequest(
  value: unknown,
): ZoteroLibrarySnapshotRequestDto {
  const { libraryId, ...request } = toSynthesisJsonObject(
    value,
    "librarySnapshotRequest",
  );
  if (
    typeof libraryId !== "number" ||
    !Number.isSafeInteger(libraryId) ||
    libraryId < 1
  ) {
    invalid("librarySnapshotRequest.libraryId");
  }
  return {
    libraryId,
    ...snapshotDto<Omit<ZoteroLibrarySnapshotRequestDto, "libraryId">>(
      "LibrarySnapshotRequest",
      request,
    ),
  };
}

export function rebuildZoteroLibrarySnapshotItem(
  value: unknown,
  _location = "librarySnapshotItem",
): ZoteroLibrarySnapshotItemDto {
  return snapshotDto("LibrarySnapshotItem", value);
}

export function rebuildZoteroLibrarySnapshotCompletionEvidence(
  value: unknown,
  _location = "librarySnapshotCompletionEvidence",
): ZoteroLibrarySnapshotCompletionEvidenceDto {
  return snapshotDto("LibrarySnapshotCompletionEvidence", value);
}

export function rebuildZoteroLibrarySnapshotPage(
  value: unknown,
): ZoteroLibrarySnapshotPageDto {
  const page = snapshotDto<ZoteroLibrarySnapshotPageDto>(
    "LibrarySnapshotResult",
    value,
  );
  if (page.returned !== page.items.length)
    invalid("librarySnapshotPage.returned");
  if (page.outcome === "completed") {
    const evidence = page.completionEvidence;
    if (
      evidence.snapshotId !== page.snapshotId ||
      evidence.libraryId !== page.libraryId ||
      evidence.totalItems !== page.deliveredItems ||
      evidence.totalBatches !== page.deliveredBatches
    ) {
      invalid("librarySnapshotPage.completionEvidence.basis");
    }
  }
  return page;
}
