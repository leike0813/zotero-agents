export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type ResourceRef = Readonly<{
  kind: "workflow_resource";
  id: string;
}>;

export type StableIssueDto =
  | Readonly<{
      code:
        | "source_missing"
        | "source_unreadable"
        | "source_unsafe"
        | "resource_missing"
        | "resource_unreadable"
        | "concurrent_modification"
        | "optional_resource_missing";
      target: "paper" | "note" | "attachment" | "image" | "resource";
      logicalPath?: string;
    }>
  | Readonly<{
      code: "bibliography_format_fallback";
      requested: BibliographyFormatRef[];
      used: BibliographyFormatRef;
    }>
  | Readonly<{
      code: "bibliography_renderer_warning";
      itemRef: PortableItemRef | null;
    }>;

export type PortableItemRef = Readonly<{
  libraryId: number;
  key: string;
}>;

export type PortableCollectionRef = Readonly<{
  libraryId: number;
  key: string;
}>;

export type AddonIdentityDto = {
  readonly addonName: string;
  readonly addonRef: string;
  readonly addonVersion: string;
};

export type WorkflowEnvironmentInfo = {
  readonly zoteroVersion: string;
  readonly platform: "win32" | "darwin" | "linux" | "unknown";
  readonly locale: string;
};

export type PreparedNoteImageRef = {
  readonly kind: "prepared_note_image";
  readonly id: string;
};

export type PrepareNoteImageRequestDto = {
  readonly source:
    | Readonly<{ kind: "file"; path: string }>
    | Readonly<{ kind: "resource"; resourceRef: ResourceRef }>
    | Readonly<{ kind: "base64"; data: string; mimeType?: string }>;
  readonly options?: Readonly<{
    maxLongEdge?: number;
    targetBytes?: number;
    hardMaxBytes?: number;
    outputFormat?: "auto" | "jpeg" | "png";
  }>;
};

export type PreparedNoteImageDto = {
  readonly ref: PreparedNoteImageRef;
  readonly mimeType: "image/jpeg" | "image/png";
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
  readonly sha256: string;
};

export type BibliographyFormatRef = {
  readonly id: string;
};

export type BibliographyFormatDto = {
  readonly ref: BibliographyFormatRef;
  readonly label: string;
  readonly fileExtension: string;
  readonly contentType: string;
  readonly availability: "available" | "unavailable";
  readonly optionsSchema: JsonObject | null;
};

export type BibliographyRenderRequestDto = {
  readonly itemRefs: PortableItemRef[];
  readonly formatPreference: BibliographyFormatRef[];
  readonly formatOptions?: JsonObject;
};

export type BibliographyRenderResultDto = {
  readonly content: string;
  readonly requestedFormats: BibliographyFormatRef[];
  readonly usedFormat: BibliographyFormatDto;
  readonly fallbackUsed: boolean;
  readonly issues: StableIssueDto[];
};

export type WorkflowToastRequestDto = {
  readonly text: string;
  readonly type?: "default" | "success" | "error";
};

export type WorkflowRuntimeLogRequestDto = {
  readonly level: "debug" | "info" | "warn" | "error";
  readonly stage: string;
  readonly message: string;
  readonly operation?: string;
  readonly phase?: string;
  readonly details?: JsonObject;
};

export type WorkflowAddonOwner = Readonly<{
  getConfig(): AddonIdentityDto;
}>;

export type WorkflowEnvironmentOwner = Readonly<{
  getInfo(): WorkflowEnvironmentInfo;
}>;

export type WorkflowPreparedImageOwner = Readonly<{
  prepareForNoteEmbedding(
    input: PrepareNoteImageRequestDto,
    control?: WorkflowCallControl,
  ): Promise<PreparedNoteImageDto>;
}>;

export type WorkflowBibliographyOwner = Readonly<{
  listFormats(control?: WorkflowCallControl): Promise<BibliographyFormatDto[]>;
  render(
    input: BibliographyRenderRequestDto,
    control?: WorkflowCallControl,
  ): Promise<BibliographyRenderResultDto>;
}>;

export type WorkflowClipboardOwner = Readonly<{
  readText(control?: WorkflowCallControl): Promise<string | null>;
  writeText(text: string, control?: WorkflowCallControl): Promise<void>;
  hasText(control?: WorkflowCallControl): Promise<boolean>;
  clear(control?: WorkflowCallControl): Promise<void>;
}>;

export type WorkflowEditorOwner = Readonly<{
  openSession(
    input: Parameters<
      typeof import("../modules/workflowEditorHost").openWorkflowEditorSession
    >[0],
  ): ReturnType<
    typeof import("../modules/workflowEditorHost").openWorkflowEditorSession
  >;
}>;

export type WorkflowNotificationOwner = Readonly<{
  toast(input: WorkflowToastRequestDto): void;
}>;

export type WorkflowLoggingOwner = Readonly<{
  appendRuntimeLog(input: WorkflowRuntimeLogRequestDto): void;
}>;

/** Canonical portable representation of a Zotero creator. */
export type CreatorDto =
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

export type ItemSummaryBaseDto = {
  ref: PortableItemRef;
  kind: "regular" | "note" | "attachment" | "annotation";
  itemType: string;
  title: string;
  parentRef: PortableItemRef | null;
  state: "active" | "trashed";
  revision: string;
  tags: string[];
  collectionRefs: PortableCollectionRef[];
};

export type RegularItemSummaryDto = ItemSummaryBaseDto & {
  kind: "regular";
  creators: CreatorDto[];
  date: string;
  year: string | null;
  publicationTitle: string;
};

export type NoteItemSummaryDto = ItemSummaryBaseDto & {
  kind: "note";
  textExcerpt: string;
  textLength: number;
  htmlLength: number;
};

export type AttachmentLinkMode =
  | "stored_file"
  | "stored_url"
  | "linked_file"
  | "linked_url"
  | "embedded_image";

export type AttachmentItemSummaryDto = ItemSummaryBaseDto & {
  kind: "attachment";
  filename: string | null;
  contentType: string | null;
  linkMode: AttachmentLinkMode;
  fileState: "available" | "missing" | "not_applicable";
};

export type AnnotationItemSummaryDto = ItemSummaryBaseDto & {
  kind: "annotation";
  annotationType: string;
  pageLabel: string | null;
  textExcerpt: string;
};

export type ItemSummaryDto =
  | RegularItemSummaryDto
  | NoteItemSummaryDto
  | AttachmentItemSummaryDto
  | AnnotationItemSummaryDto;

export type RegularItemDetailDto = RegularItemSummaryDto & {
  fields: Record<string, string>;
  relatedRefs: PortableItemRef[];
  childCounts: {
    notes: number;
    attachments: number;
    annotations: number;
  };
  createdAt: string;
  modifiedAt: string;
};

export type NoteSummaryDto = {
  ref: PortableItemRef;
  parentRef: PortableItemRef | null;
  title: string;
  textExcerpt: string;
  textLength: number;
  htmlLength: number;
  revision: string;
};

export type NoteDetailDto = {
  ref: PortableItemRef;
  parentRef: PortableItemRef | null;
  title: string;
  format: "html" | "text";
  content: string;
  revision: string;
};

export type NoteDetailOptionsDto = {
  format: "html" | "text";
};

export type NotePayloadOptionsDto = {
  payloadType: string;
};

export type NotePayloadIssueDto =
  | { code: "anchor_stale"; retryable: true }
  | { code: "attachment_missing"; retryable: false }
  | { code: "attachment_unreadable"; retryable: true }
  | { code: "content_invalid"; retryable: false };

export type NotePayloadSummaryDto = {
  payloadType: string;
  noteKind: string;
  version: string;
  format: "json" | "markdown" | "text";
  encoding: string;
  estimatedBytes: number;
  source:
    | { kind: "inline" }
    | {
        kind: "embedded_attachment";
        attachmentRef: PortableItemRef;
      };
  state: "available" | "stale" | "missing" | "invalid";
  issues: NotePayloadIssueDto[];
};

export type NotePayloadValueDto = {
  summary: NotePayloadSummaryDto;
  value: JsonValue;
};

export type AttachmentDetailDto = {
  ref: PortableItemRef;
  parentRef: PortableItemRef | null;
  revision: string;
  title: string;
  filename: string | null;
  contentType: string | null;
  charset: string | null;
  url: string | null;
  linkMode: AttachmentLinkMode;
  role: "ordinary" | "note_image" | "note_payload";
  file:
    | {
        state: "available";
        path: string;
        sizeBytes: number;
        modifiedAt: string | null;
      }
    | { state: "missing" }
    | { state: "not_applicable" };
};

export type AnnotationDetailDto = {
  ref: PortableItemRef;
  itemRef: PortableItemRef;
  attachmentRef: PortableItemRef;
  revision: string;
  annotationType: string;
  text: string;
  comment: string;
  color: string | null;
  location: {
    pageIndex: number | null;
    pageLabel: string | null;
    sortIndex: string;
    position: JsonObject | null;
  };
  tags: string[];
  createdAt: string;
  modifiedAt: string;
};

export type ItemDetailDto =
  | { kind: "regular"; item: RegularItemDetailDto }
  | { kind: "note"; item: NoteSummaryDto }
  | { kind: "attachment"; item: AttachmentDetailDto }
  | { kind: "annotation"; item: AnnotationDetailDto };

export type PortableRegularItemDto = {
  schema: "zotero-agents.portable-regular-item.v1";
  itemType: string;
  fields: Record<string, string>;
  creators: CreatorDto[];
  tags: string[];
};

export type MaterializedAttachmentFileDto =
  | {
      state: "available";
      resourceRef: ResourceRef;
      filename: string;
      contentType: string | null;
      sizeBytes: number;
      sha256: string;
    }
  | { state: "missing"; issue: StableIssueDto }
  | { state: "not_applicable" };

export type MaterializedAttachmentDto = {
  sourceRef: PortableItemRef;
  metadata: AttachmentDetailDto;
  file: MaterializedAttachmentFileDto;
};

export type MaterializedNoteDto = {
  source: { ref: PortableItemRef; revision: string };
  content: {
    format: "html" | "text";
    value: string;
    embeddedImages: Array<{
      slot: string;
      resourceRef: ResourceRef;
      altText: string | null;
      mimeType: "image/jpeg" | "image/png";
      sizeBytes: number;
      sha256: string;
    }>;
  };
  tags: string[];
  payloads: NotePayloadValueDto[];
};

export type MaterializedPaperDto = {
  source: { ref: PortableItemRef; revision: string };
  item: PortableRegularItemDto;
  collectionRefs: PortableCollectionRef[];
  relatedRefs: PortableItemRef[];
  notes: MaterializedNoteDto[];
  attachments: MaterializedAttachmentDto[];
  annotations: AnnotationDetailDto[];
  issues: StableIssueDto[];
};

export type MaterializePapersRequestDto = {
  paperRefs: PortableItemRef[];
  missingFilePolicy: "require_complete" | "record_missing";
};

export type MaterializePapersResultDto = {
  papers: MaterializedPaperDto[];
  completeness: "complete" | "incomplete";
  issues: StableIssueDto[];
};

export type ImportNoteDto = {
  noteId: string;
  content: {
    format: "html" | "text";
    value: string;
    embeddedImages?: Array<{
      slot: string;
      resourceRef: ResourceRef;
      altText?: string;
    }>;
  };
  tags: string[];
  payloads: NotePayloadValueDto[];
};

export type ImportAttachmentDto = {
  attachmentId: string;
  source:
    | {
        kind: "stored_file";
        main: { resourceRef: ResourceRef; targetFilename?: string };
        companions?: Array<{
          resourceRef: ResourceRef;
          targetRelativePath: string;
        }>;
      }
    | { kind: "linked_url"; url: string }
    | { kind: "stored_url"; url: string };
  metadata?: {
    title?: string;
    contentType?: string;
    charset?: string;
    originalUrl?: string;
  };
};

export type ImportPaperGraphDto =
  | {
      graphId: string;
      target: { kind: "create" };
      item: PortableRegularItemDto;
      collectionRefs: PortableCollectionRef[];
      notes: ImportNoteDto[];
      attachments: ImportAttachmentDto[];
      relatedGraphIds: string[];
      relatedExistingRefs: PortableItemRef[];
    }
  | {
      graphId: string;
      target: {
        kind: "existing";
        itemRef: PortableItemRef;
        expectedRevision: string;
      };
    };

export type ImportPapersRequestDto = {
  operationId: string;
  libraryId?: number;
  papers: ImportPaperGraphDto[];
};

export type ImportPaperResultDto =
  | {
      graphId: string;
      outcome: "reused";
      itemRef: PortableItemRef;
      revision: string;
    }
  | {
      graphId: string;
      outcome: "committed";
      consistencyGroupId: string;
      itemRef: PortableItemRef;
      revision: string;
      noteRefs: Array<{ noteId: string; ref: PortableItemRef }>;
      attachmentRefs: Array<{ attachmentId: string; ref: PortableItemRef }>;
      receiptId: string;
    }
  | {
      graphId: string;
      outcome: "failed" | "rolled_back" | "repair_required";
      consistencyGroupId: string;
      attemptId: string;
    }
  | {
      graphId: string;
      outcome: "not_started";
      reason: "canceled" | "dependency_failed";
      blockingGraphIds: string[];
    };

export type ImportPapersResultDto = {
  schema: "zotero-agents.research-import.v1";
  operationId: string;
  libraryId: number;
  outcome: "complete" | "partial" | "failed" | "canceled" | "repair_required";
  papers: ImportPaperResultDto[];
  receipts: MutationReceipt[];
  attempts: MutationAttemptReport[];
  counts: {
    requested: number;
    reused: number;
    committed: number;
    failed: number;
    rolledBack: number;
    repairRequired: number;
    notStarted: number;
  };
};

export type CollectionDto = {
  ref: PortableCollectionRef;
  name: string;
  parentRef: PortableCollectionRef | null;
  revision: string;
  state: "active";
  path: string[];
};

export type LibraryListItemsRequestDto = {
  libraryId?: number;
  collectionRef?: PortableCollectionRef;
  tag?: string;
  itemType?: string;
  query?: string;
  limit?: number;
  cursor?: string;
};

export type LibraryListItemsPageDto = {
  items: ItemSummaryDto[];
  nextCursor: string | null;
  hasMore: boolean;
  returned: number;
  totalScanned: number;
  criteria: {
    libraryId: number;
    collectionRef: PortableCollectionRef | null;
    tag: string | null;
    itemType: string | null;
    query: string | null;
    order: "stable_identity";
  };
};

export type LibraryListCollectionsRequestDto = {
  libraryId?: number;
  limit?: number;
  cursor?: string;
};

export type LibraryListCollectionsPageDto = {
  collections: CollectionDto[];
  libraryId: number;
  nextCursor: string | null;
  hasMore: boolean;
  returned: number;
  order: "stable_identity";
};

export type LibraryTraversalRequestDto = {
  libraryId?: number;
  scope: "top-level-regular";
  collectionRef?: PortableCollectionRef;
  tag?: string;
  itemType?: string;
  query?: string;
  resumeCursor?: string;
  pageSize?: number;
  maxItems?: number;
  maxPages?: number;
  maxDurationMs?: number;
};

export type LibraryTraversalBatchDto = {
  batchIndex: number;
  items: LibraryTraversalItemDto[];
};

export type LibraryTraversalItemDto = RegularItemSummaryDto & {
  tagDigest: string;
};

export type LibraryTraversalCompletionEvidenceDto = {
  evidenceId: string;
  criteriaDigest: string;
  coverageDigest: string;
  completedAt: string;
};

export type LibraryTraversalCompleted = {
  outcome: "completed";
  libraryId: number;
  scope: "top-level-regular";
  visitedItems: number;
  visitedBatches: number;
  completionEvidence: LibraryTraversalCompletionEvidenceDto;
};

export type LibraryTraversalResultDto =
  | LibraryTraversalCompleted
  | {
      outcome: "canceled";
      libraryId: number;
      visitedItems: number;
      visitedBatches: number;
    }
  | {
      outcome: "resource_limited";
      libraryId: number;
      visitedItems: number;
      visitedBatches: number;
      reason: "max_items" | "max_pages" | "max_duration";
      resumeCursor: string;
    };

export type SelectedItemsSnapshotDto = {
  capturedAt: string;
  items: Array<{
    ref: PortableItemRef;
    itemType: string;
    title?: string;
    parentRef?: PortableItemRef;
  }>;
};

export type CurrentViewDto = {
  target: "library" | "reader";
  libraryId?: number;
  selectionEmpty: boolean;
  currentItem?: {
    ref: PortableItemRef;
    title?: string;
  };
  currentCollection?: {
    ref: PortableCollectionRef;
    name: string;
  };
};

export type NavigationSelectionInputDto = {
  itemRefs: PortableItemRef[];
};

export type NavigationResultDto = {
  openedAt: string;
  target:
    | { kind: "item"; ref: PortableItemRef }
    | { kind: "note"; ref: PortableItemRef }
    | { kind: "collection"; ref: PortableCollectionRef }
    | { kind: "selection"; refs: PortableItemRef[] };
};

export type WorkflowCallControl = Readonly<{
  signal?: AbortSignal;
}>;

export type WorkflowHostCreatorDto = {
  firstName?: string;
  lastName?: string;
  name?: string;
  creatorType?: string;
};

export type WorkflowHostMutationReceiptOperation =
  | "item.create"
  | "item.updateMetadata"
  | "item.changeType"
  | "item.remove"
  | "item.updateTags"
  | "item.addRelated"
  | "item.removeRelated"
  | "collection.create"
  | "collection.update"
  | "collection.updateMembership"
  | "collection.remove"
  | "notes.create"
  | "notes.updateContent"
  | "notes.remove"
  | "notes.upsertPayload"
  | "attachments.create"
  | "attachments.updateMetadata"
  | "attachments.replaceFile"
  | "attachments.move"
  | "attachments.remove"
  | "statusTags.transition"
  | "researchBundles.importPapers";

export type MutationOperation =
  | "item.create"
  | "item.updateMetadata"
  | "item.changeType"
  | "item.remove"
  | "item.updateTags"
  | "item.addRelated"
  | "item.removeRelated"
  | "collection.create"
  | "collection.update"
  | "collection.updateMembership"
  | "collection.remove";

export type MutationPreviewOperation =
  | "item.changeType"
  | "item.remove"
  | "collection.remove";

export type RemovalDisposition = "trash" | "permanent";
export type RemovalOutcome =
  | "trashed"
  | "permanently_deleted"
  | "already_trashed"
  | "already_absent";

export type ItemMutationVersionDto = {
  revision: string;
  state: "active" | "trashed" | "deleted";
};

export type CollectionMutationVersionDto = {
  revision: string;
  state: "active" | "deleted";
};

export type MutationEntityRef =
  | { kind: "item"; ref: PortableItemRef }
  | { kind: "collection"; ref: PortableCollectionRef };

export type MutationChangeDto =
  | {
      entity: { kind: "item"; ref: PortableItemRef };
      effect: "created" | "updated" | "trashed" | "deleted" | "unchanged";
      before: ItemMutationVersionDto | null;
      after: ItemMutationVersionDto;
    }
  | {
      entity: { kind: "collection"; ref: PortableCollectionRef };
      effect: "created" | "updated" | "deleted" | "unchanged";
      before: CollectionMutationVersionDto | null;
      after: CollectionMutationVersionDto;
    };

export type MutationReceipt = {
  schema: "zotero-agents.mutation-receipt.v1";
  receiptId: string;
  operationId: string;
  operation: WorkflowHostMutationReceiptOperation;
  outcome: "committed" | "unchanged";
  committedAt: string;
  effectDigest: string;
  changes: MutationChangeDto[];
};

export type MutationAttemptStatus =
  | "failed"
  | "canceled"
  | "unknown"
  | "repair_required";

export type MutationPhase =
  | "validation"
  | "reservation"
  | "read"
  | "staging"
  | "commit"
  | "verification"
  | "compensation"
  | "cleanup";

export type MutationRecovery =
  | "none"
  | "retry_same_operation"
  | "refresh_and_retry_new_operation"
  | "reconcile"
  | "manual_repair";

import type {
  WorkflowHostErrorCode,
  WorkflowHostErrorDetailsByCode,
} from "./workflowHostErrorContract";

export type MutationAttemptError = {
  [Code in WorkflowHostErrorCode]: {
    code: Code;
    phase: MutationPhase;
    recovery: MutationRecovery;
    message?: string;
    details: WorkflowHostErrorDetailsByCode[Code];
  };
}[WorkflowHostErrorCode];

export type MutationAttemptReport = {
  schema: "zotero-agents.mutation-attempt.v1";
  attemptId: string;
  operationId: string;
  operation: WorkflowHostMutationReceiptOperation;
  status: MutationAttemptStatus;
  error: MutationAttemptError;
  affectedRefs: MutationEntityRef[];
  residualRefs: MutationEntityRef[];
};

export type MutationExecutionResult<TResult extends object> =
  | {
      outcome: "committed" | "unchanged";
      receipt: MutationReceipt;
      result: TResult;
    }
  | {
      outcome: MutationAttemptStatus;
      attempt: MutationAttemptReport;
    };

export type MutationItemResultDto = JsonObject & {
  ref: PortableItemRef;
  revision: string;
  itemType: string;
  title: string;
};

export type MutationCollectionResultDto = JsonObject & {
  ref: PortableCollectionRef;
  revision: string;
  name: string;
};

export type ItemRemovalResultDto = JsonObject & {
  itemRef: PortableItemRef;
  outcome: RemovalOutcome;
};

export type RelatedItemMutationResultDto = JsonObject & {
  sourceRef: PortableItemRef;
  relatedRef: PortableItemRef;
  related: boolean;
};

export type CollectionMembershipResultDto = JsonObject & {
  collection: MutationCollectionResultDto;
  addedRefs: PortableItemRef[];
  removedRefs: PortableItemRef[];
};

export type CollectionRemovalResultDto = JsonObject & {
  removedRef: PortableCollectionRef;
};

export type ItemCreateRequest = {
  operation: "item.create";
  operationId: string;
  libraryId?: number;
  itemType: string;
  fields: Record<string, string>;
  creators?: WorkflowHostCreatorDto[];
  initialTags?: string[];
  collectionRefs?: PortableCollectionRef[];
  initialRelatedRefs?: PortableItemRef[];
};

export type ItemUpdateMetadataRequest = {
  operation: "item.updateMetadata";
  operationId: string;
  itemRef: PortableItemRef;
  expectedRevision?: string;
  patch: {
    fields?: Record<string, string | null>;
    creators?: WorkflowHostCreatorDto[];
  };
};

export type ItemChangeTypeRequest = {
  operation: "item.changeType";
  operationId: string;
  itemRef: PortableItemRef;
  expectedRevision: string;
  targetItemType: string;
  incompatibleData: "reject" | "move_to_extra" | "drop";
  previewToken: string;
};

export type ItemRemoveRequest = {
  operation: "item.remove";
  operationId: string;
  itemRef: PortableItemRef;
} & (
  | { disposition: "trash"; expectedRevision?: string }
  | {
      disposition: "permanent";
      expectedRevision: string;
      childPolicy: "reject_if_present" | "cascade";
      previewToken: string;
    }
);

export type ItemUpdateTagsRequest = {
  operation: "item.updateTags";
  operationId: string;
  itemRef: PortableItemRef;
  expectedRevision?: string;
  add: string[];
  remove: string[];
};

export type ItemRelatedRequest = {
  operation: "item.addRelated" | "item.removeRelated";
  operationId: string;
  sourceRef: PortableItemRef;
  relatedRef: PortableItemRef;
  expectedRevision?: string;
};

export type ItemAddRelatedRequest = ItemRelatedRequest & {
  operation: "item.addRelated";
};
export type ItemRemoveRelatedRequest = ItemRelatedRequest & {
  operation: "item.removeRelated";
};

export type CollectionCreateRequest = {
  operation: "collection.create";
  operationId: string;
  name: string;
  placement:
    | { kind: "root"; libraryId?: number }
    | { kind: "child"; parentRef: PortableCollectionRef };
  initialMemberRefs?: PortableItemRef[];
};

export type CollectionUpdateRequest = {
  operation: "collection.update";
  operationId: string;
  collectionRef: PortableCollectionRef;
  expectedRevision?: string;
  patch: { name?: string; parentRef?: PortableCollectionRef | null };
};

export type CollectionUpdateMembershipRequest = {
  operation: "collection.updateMembership";
  operationId: string;
  collectionRef: PortableCollectionRef;
  expectedRevision?: string;
  add: PortableItemRef[];
  remove: PortableItemRef[];
};

export type CollectionRemoveRequest = {
  operation: "collection.remove";
  operationId: string;
  collectionRef: PortableCollectionRef;
  expectedRevision: string;
  childPolicy: "reject_if_present" | "cascade";
  previewToken: string;
};

export type MutationExecuteRequest =
  | ItemCreateRequest
  | ItemUpdateMetadataRequest
  | ItemChangeTypeRequest
  | ItemRemoveRequest
  | ItemUpdateTagsRequest
  | ItemAddRelatedRequest
  | ItemRemoveRelatedRequest
  | CollectionCreateRequest
  | CollectionUpdateRequest
  | CollectionUpdateMembershipRequest
  | CollectionRemoveRequest;

export type MutationRequestByOperation = {
  "item.create": ItemCreateRequest;
  "item.updateMetadata": ItemUpdateMetadataRequest;
  "item.changeType": ItemChangeTypeRequest;
  "item.remove": ItemRemoveRequest;
  "item.updateTags": ItemUpdateTagsRequest;
  "item.addRelated": ItemAddRelatedRequest;
  "item.removeRelated": ItemRemoveRelatedRequest;
  "collection.create": CollectionCreateRequest;
  "collection.update": CollectionUpdateRequest;
  "collection.updateMembership": CollectionUpdateMembershipRequest;
  "collection.remove": CollectionRemoveRequest;
};

export type MutationResultByOperation = {
  "item.create": { item: MutationItemResultDto };
  "item.updateMetadata": { item: MutationItemResultDto };
  "item.changeType": { item: MutationItemResultDto };
  "item.remove": ItemRemovalResultDto;
  "item.updateTags": { item: MutationItemResultDto };
  "item.addRelated": RelatedItemMutationResultDto;
  "item.removeRelated": RelatedItemMutationResultDto;
  "collection.create": { collection: MutationCollectionResultDto };
  "collection.update": { collection: MutationCollectionResultDto };
  "collection.updateMembership": CollectionMembershipResultDto;
  "collection.remove": CollectionRemovalResultDto;
};

export type ItemChangeTypeDataEntryDto =
  | { kind: "field"; field: string; value: string }
  | { kind: "creator"; index: number; creator: WorkflowHostCreatorDto };

export type ItemChangeTypePlan = {
  itemRef: PortableItemRef;
  sourceRevision: string;
  sourceItemType: string;
  targetItemType: string;
  incompatibleData: "reject" | "move_to_extra" | "drop";
  preservedFields: Record<string, string>;
  preservedCreators: WorkflowHostCreatorDto[];
  remappedFields: Array<{
    sourceField: string;
    targetField: string;
    value: string;
  }>;
  movedToExtra: Array<{
    source: ItemChangeTypeDataEntryDto;
    serializedLine: string;
  }>;
  dropped: ItemChangeTypeDataEntryDto[];
  resultFields: Record<string, string>;
  resultCreators: WorkflowHostCreatorDto[];
};

export type ItemPermanentRemovePlan = {
  itemRef: PortableItemRef;
  revision: string;
  childPolicy: "reject_if_present" | "cascade";
  children: Array<{
    ref: PortableItemRef;
    kind: "note" | "attachment" | "annotation";
    revision: string;
  }>;
  managedResources: {
    storedFiles: number;
    noteImages: number;
    notePayloads: number;
    linkedFilesPreserved: number;
  };
  relationInvalidations: Array<{
    sourceRef: PortableItemRef;
    relatedRef: PortableItemRef;
  }>;
};

export type CollectionRemovePlan = {
  collectionRef: PortableCollectionRef;
  childPolicy: "reject_if_present" | "cascade";
  deletedCollections: Array<{
    ref: PortableCollectionRef;
    revision: string;
  }>;
  detachedMemberships: Array<{
    collectionRef: PortableCollectionRef;
    itemRef: PortableItemRef;
    itemRevision: string;
  }>;
};

export type MutationPreviewRequestByOperation = {
  "item.changeType": Omit<
    ItemChangeTypeRequest,
    "operationId" | "expectedRevision" | "previewToken"
  >;
  "item.remove": {
    operation: "item.remove";
    itemRef: PortableItemRef;
    disposition: "permanent";
    childPolicy: "reject_if_present" | "cascade";
  };
  "collection.remove": Omit<
    CollectionRemoveRequest,
    "operationId" | "expectedRevision" | "previewToken"
  >;
};

export type MutationPreviewRequest =
  MutationPreviewRequestByOperation[MutationPreviewOperation];

export type MutationPlanByOperation = {
  "item.changeType": ItemChangeTypePlan;
  "item.remove": ItemPermanentRemovePlan;
  "collection.remove": CollectionRemovePlan;
};

export type MutationEntityObservationDto =
  | {
      entity: { kind: "item"; ref: PortableItemRef };
      version: ItemMutationVersionDto;
    }
  | {
      entity: { kind: "collection"; ref: PortableCollectionRef };
      version: CollectionMutationVersionDto;
    };

export type MutationPreviewTokenDto = {
  value: string;
  expiresAt: string;
};

export type MutationPreviewResult<TPlan extends object> = {
  schema: "zotero-agents.mutation-preview.v1";
  operation: MutationPreviewOperation;
  outcome: "would_change" | "unchanged";
  observedAt: string;
  observations: MutationEntityObservationDto[];
  plan: TPlan;
  token: MutationPreviewTokenDto;
};

export type NoteContentInput = {
  format: "html" | "text";
  value: string;
  embeddedImages?: Array<{
    slot: string;
    preparedImage: PreparedNoteImageRef;
    altText?: string;
  }>;
};

export type NoteCreateRequestDto = {
  operationId: string;
  parentRef?: PortableItemRef;
  content: NoteContentInput;
};
export type NoteUpdateContentRequestDto = {
  operationId: string;
  noteRef: PortableItemRef;
  expectedRevision?: string;
  content: NoteContentInput;
};
export type NoteRemoveRequestDto = {
  operationId: string;
  noteRef: PortableItemRef;
  disposition: RemovalDisposition;
  expectedRevision?: string;
};
export type NotePayloadUpsertRequestDto = {
  operationId: string;
  noteRef: PortableItemRef;
  expectedRevision?: string;
  payloadType: string;
  noteKind: string;
  payload: JsonValue;
};
export type NoteRemovalResultDto = JsonObject & {
  noteRef: PortableItemRef;
  outcome: RemovalOutcome;
};
export type NotePayloadUpsertResultDto = JsonObject & {
  note: MutationItemResultDto;
  payloadType: string;
  payloadHash: string;
  replaced: number;
};

export type WorkflowFileRef =
  | { kind: "local_path"; path: string }
  | { kind: "resource"; resourceRef: JsonObject };
export type StoredFileInput = {
  source: WorkflowFileRef;
  targetFilename?: string;
};
export type CompanionFileInput = {
  source: WorkflowFileRef;
  targetRelativePath: string;
};
export type AttachmentPlacementDto =
  | {
      kind: "top_level";
      libraryId?: number;
      collectionRefs?: PortableCollectionRef[];
    }
  | { kind: "child"; parentRef: PortableItemRef };
export type AttachmentSourceDto =
  | {
      kind: "stored_file";
      main: StoredFileInput;
      companions?: CompanionFileInput[];
    }
  | { kind: "linked_file"; path: string }
  | { kind: "linked_url"; url: string }
  | { kind: "stored_url"; url: string };
export type AttachmentCreateRequestDto = {
  operationId: string;
  placement: AttachmentPlacementDto;
  source: AttachmentSourceDto;
  metadata?: {
    title?: string;
    contentType?: string;
    charset?: string;
    originalUrl?: string;
  };
};
export type AttachmentUpdateMetadataRequestDto = {
  operationId: string;
  attachmentRef: PortableItemRef;
  expectedRevision?: string;
  patch: {
    title?: string | null;
    url?: string | null;
    contentType?: string | null;
    charset?: string | null;
  };
};
export type AttachmentReplaceFileRequestDto = {
  operationId: string;
  attachmentRef: PortableItemRef;
  expectedRevision?: string;
  source:
    | Extract<AttachmentSourceDto, { kind: "stored_file" }>
    | Extract<AttachmentSourceDto, { kind: "linked_file" }>;
};
export type AttachmentMoveRequestDto = {
  operationId: string;
  attachmentRef: PortableItemRef;
  expectedRevision?: string;
  placement: AttachmentPlacementDto;
};
export type AttachmentRemoveRequestDto = {
  operationId: string;
  attachmentRef: PortableItemRef;
  disposition: RemovalDisposition;
  expectedRevision?: string;
};
export type AttachmentReplaceFileResultDto = JsonObject & {
  attachment: JsonObject;
  outcome: "replaced" | "unchanged";
};
export type AttachmentMoveResultDto = JsonObject & {
  attachment: JsonObject;
  outcome: "moved" | "unchanged";
};
export type AttachmentRemovalResultDto = JsonObject & {
  attachmentRef: PortableItemRef;
  outcome: RemovalOutcome;
};

export type StatusTagKey =
  | "need-metadata-curation"
  | "need-fulltext"
  | "need-markdown"
  | "need-analysis"
  | "need-deep-reading";
export type StatusTagValue =
  | "status:need-metadata-curation"
  | "status:need-fulltext"
  | "status:need-markdown"
  | "status:need-analysis"
  | "status:need-deep-reading";
export type StatusTagTransitionRequestDto = {
  operationId: string;
  itemRef: PortableItemRef;
  expectedRevision?: string;
  add?: StatusTagKey[];
  remove?: StatusTagKey[];
};
export type StatusTagTransitionResultDto = JsonObject & {
  itemRef: PortableItemRef;
  added: StatusTagValue[];
  removed: StatusTagValue[];
  unchanged: StatusTagValue[];
  revision: string;
};

export type {
  WorkflowHostErrorCode,
  WorkflowHostErrorData,
  WorkflowHostErrorDetailsByCode,
} from "./workflowHostErrorContract";

import type {
  ZoteroHostAttachmentDto,
  ZoteroHostCapabilityBroker,
  ZoteroHostCollectionRefInput,
  ZoteroHostCurrentViewDto,
  ZoteroHostItemDetailDto,
  ZoteroHostItemRefInput,
  ZoteroHostLibraryListArgs,
  ZoteroHostLibraryListResponse,
  ZoteroHostLibrarySyncSnapshotResponse,
  ZoteroHostItemSearchArgs,
  ZoteroHostItemSummaryDto,
  ZoteroHostMutationExecuteResponse,
  ZoteroHostMutationPreviewResponse,
  ZoteroHostMutationRequest,
  ZoteroHostMetadataTranslateIdentifierArgs,
  ZoteroHostMetadataTranslateIdentifierResponse,
  ZoteroHostNoteDetailArgs,
  ZoteroHostNoteDetailChunkDto,
  ZoteroHostNoteDto,
  ZoteroHostNotePayloadDetailArgs,
  ZoteroHostNotePayloadDetailDto,
  ZoteroHostNotePayloadSummaryDto,
} from "../modules/zoteroHostCapabilityBroker";

export type WorkflowHostItemRefInput =
  | ZoteroHostItemRefInput
  | Zotero.Item
  | number
  | string;
export type WorkflowHostCollectionRefInput =
  | ZoteroHostCollectionRefInput
  | Zotero.Collection
  | number
  | string;

export type WorkflowHostMutationRequest = Omit<
  ZoteroHostMutationRequest,
  "target" | "targets" | "item" | "items" | "parent" | "note" | "collection"
> & {
  target?: WorkflowHostItemRefInput;
  targets?: WorkflowHostItemRefInput[];
  item?: WorkflowHostItemRefInput;
  items?: WorkflowHostItemRefInput[];
  parent?: WorkflowHostItemRefInput;
  note?: WorkflowHostItemRefInput;
  collection?: WorkflowHostCollectionRefInput;
};

type WorkflowHostContextApi = {
  getCurrentView(): ZoteroHostCurrentViewDto;
  getSelectedItems(): ZoteroHostItemSummaryDto[];
};

type WorkflowHostLibraryApi = Pick<
  ZoteroHostCapabilityBroker["library"],
  "syncSnapshot" | "searchItems"
> & {
  listItems(
    args: ZoteroHostLibraryListArgs,
  ): Promise<ZoteroHostLibraryListResponse>;
  getItemDetail(
    ref: WorkflowHostItemRefInput,
  ): Promise<ZoteroHostItemDetailDto | null>;
  getItemNotes(
    ref: WorkflowHostItemRefInput,
    args?: ZoteroHostLibraryListArgs,
  ): Promise<ZoteroHostNoteDto[]>;
  getNoteDetail(
    ref: WorkflowHostItemRefInput,
    args?: ZoteroHostNoteDetailArgs,
  ): Promise<ZoteroHostNoteDetailChunkDto>;
  listNotePayloads(
    ref: WorkflowHostItemRefInput,
  ): Promise<ZoteroHostNotePayloadSummaryDto[]>;
  getNotePayload(
    ref: WorkflowHostItemRefInput,
    args?: ZoteroHostNotePayloadDetailArgs,
  ): Promise<ZoteroHostNotePayloadDetailDto>;
  getItemAttachments(
    ref: WorkflowHostItemRefInput,
  ): Promise<ZoteroHostAttachmentDto[]>;
};

export type WorkflowHostLiveReadAdapters = {
  context: Pick<
    ZoteroHostCapabilityBroker["context"],
    "getCurrentView" | "getSelectedItems"
  >;
  navigation: Pick<
    ZoteroHostCapabilityBroker["navigation"],
    "openItem" | "openNote" | "openCollection" | "openSelection"
  >;
  library: Pick<
    ZoteroHostCapabilityBroker["library"],
    | "listItems"
    | "traverseItems"
    | "listCollections"
    | "getItemDetail"
    | "getItemNotes"
    | "getNoteDetail"
    | "listNotePayloads"
    | "getNotePayload"
    | "getItemAttachments"
    | "listAnnotations"
    | "exportPortableItems"
  >;
};

type WorkflowHostMutationApi = {
  preview(
    request: WorkflowHostMutationRequest,
  ): ReturnType<ZoteroHostCapabilityBroker["legacyMutations"]["preview"]>;
  execute(
    request: WorkflowHostMutationRequest,
  ): ReturnType<ZoteroHostCapabilityBroker["legacyMutations"]["execute"]>;
};

type WorkflowHostMetadataApi = Pick<
  ZoteroHostCapabilityBroker["metadata"],
  "translateIdentifier"
>;
import type { WorkflowResultContext } from "../modules/workflowExecution/resultContext";
import type { ProductStorageApi } from "../modules/workflowProductStore";
import type {
  SynthesisJsonObject,
  SynthesisJsonValue,
  SynthesisLiteratureDigestApplyRequest,
  SynthesisLiteratureDigestApplyResult,
  SynthesisPaperArtifactsRequest,
  SynthesisPaperArtifactsResult,
  SynthesisTagDiscardResult,
  SynthesisTagAuditReplaceRequest,
  SynthesisTagCommandResult,
  SynthesisTagMutationResult,
  SynthesisTagPromotionResult,
  SynthesisTagSelectionRequest,
  SynthesisTagStageResult,
  SynthesisTagSuggestionStageRequest,
  SynthesisTagStagedSuggestion,
  SynthesisTagVocabularySnapshot,
  SynthesisTagVocabularySaveRequest,
  SynthesisTopicApplyRequest,
  SynthesisTopicApplyResult,
  SynthesisTopicPlanApplyRequest,
  SynthesisTopicPlanApplyResult,
  SynthesisTopicReportRequest,
  SynthesisTopicReportResult,
  SynthesisWorkflowItemSnapshot,
  TagAuditRunRequestDto,
  TagAuditRunResultDto,
  TagAuditStagingEntry,
  TagRegulationAcknowledgementResultDto,
  TagVocabularyRegulatorExportDto,
} from "../../packages/synthesis-contracts/src/index";
import type {
  BuiltinStatusKey,
  BuiltinStatusTag,
} from "../modules/synthesis/builtinTagPolicy";
export type { WorkflowResultContext } from "../modules/workflowExecution/resultContext";

export type WorkflowParameterType =
  | "string"
  | "number"
  | "boolean"
  | "array";

export type WorkflowParameterOptionsSource = {
  kind: "zotero.collections" | "synthesis.topics" | string;
  library?: "current" | "user" | number;
  includeEmpty?: boolean;
  valueFormat?: "collectionRef" | "topicId" | string;
  labelFormat?: "path" | "title" | string;
  allowStale?: boolean;
  filter?: "all" | "updatable" | string;
};

export type WorkflowParameterOption = {
  value: string;
  label: string;
  description?: string;
  meta?: {
    kind: string;
    libraryId?: number;
    collectionKey?: string;
    collectionId?: number | string;
    name?: string;
    path?: string[];
    [key: string]: unknown;
  };
};

export type WorkflowParameterSchema = {
  type: WorkflowParameterType;
  required?: boolean;
  visible_if?: {
    parameter: string;
    equals: boolean;
  };
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  items?: {
    type: "string";
  };
  allowCustom?: boolean;
  optionsSource?: WorkflowParameterOptionsSource;
  min?: number;
  max?: number;
  integer?: boolean;
};

export type WorkflowI18nLocaleMessages = Record<string, string>;

export type WorkflowI18nMessages = Record<string, WorkflowI18nLocaleMessages>;

export type WorkflowI18nSpec = {
  defaultLocale?: string;
  messages?: WorkflowI18nMessages;
};

export type WorkflowPackageI18nSpec = {
  defaultLocale?: string;
  locales?: Record<string, string>;
};

export type WorkflowLocalizationResources = {
  packageDefaultLocale?: string;
  packageMessages?: WorkflowI18nMessages;
};

export type WorkflowDisplaySpec = {
  core?: boolean;
  emoji?: string;
};

export type WorkflowHooksSpec = {
  preflight?: string;
  buildRequest?: string;
  normalizeSettings?: string;
  applyResult: string;
};

export type WorkflowSelectionCountRule = {
  min?: number;
  max?: number;
  exact?: number;
};

export type WorkflowInputMemberKind =
  | "selection"
  | "parent"
  | "child"
  | "attachment"
  | "note"
  | "generated-note"
  | "digest-image-target";

export type WorkflowInputGrouping =
  | { mode: "each" }
  | { mode: "all" }
  | { mode: "parent" };

export type WorkflowSelectionRequirements = {
  selection?: {
    counts?: {
      parents?: WorkflowSelectionCountRule;
      attachments?: WorkflowSelectionCountRule;
      notes?: WorkflowSelectionCountRule;
      children?: WorkflowSelectionCountRule;
      total?: WorkflowSelectionCountRule;
    };
    allowMixed?: boolean;
  };
  candidates?: WorkflowSelectionCountRule;
};

export type WorkflowSelectionSelector =
  | {
      policy: "input-member";
      source: "selected" | "related";
    }
  | {
      policy: "selection";
    }
  | {
      policy: "literature-source";
    }
  | {
      policy: "generated-note-candidates";
    }
  | {
      policy: "digest-representative-image";
    };

export type WorkflowSelectionFilter =
  | {
      kind: "source-file-exists";
      phase: "availability";
    }
  | {
      kind: "candidates-per-parent";
      phase: "availability";
      counts: WorkflowSelectionCountRule;
    }
  | {
      kind: "generated-note-kinds-absent";
      phase: "availability";
      noteKinds: string[];
    }
  | WorkflowGeneratedNoteReadinessFilter
  | {
      kind: "artifact-absent";
      phase: "availability" | "execute";
      target:
        | "deep-reading-html"
        | "mineru-markdown"
        | "translator-markdown";
      parameter?: string;
    };

export type WorkflowGeneratedNotePayloadRequirement = {
  pointer: string;
  const?: string | number | boolean | null;
  type?: "string" | "number" | "array" | "object";
  minimum?: number;
  maximum?: number;
  length?: number;
};

export type WorkflowGeneratedNoteArtifactSpec = {
  id: string;
  noteKinds: string[];
  payload?: {
    type: string;
    requirements?: WorkflowGeneratedNotePayloadRequirement[];
  };
};

export type WorkflowGeneratedNoteReadinessFilter = {
  kind: "generated-note-readiness";
  phase: "availability";
  artifacts: WorkflowGeneratedNoteArtifactSpec[];
  modes: Array<{
    id: string;
    allAvailable?: string[];
    allUnavailable?: string[];
    default?: boolean;
  }>;
  acceptModes: string[];
};

export type WorkflowGeneratedNoteReadinessResult = {
  mode: string;
  accepted: boolean;
  evidenceHash: string;
  artifacts: Record<
    string,
    {
      status: "available" | "missing" | "invalid";
      noteIds: number[];
      payload?: unknown;
      diagnostics: string[];
    }
  >;
};

export type WorkflowValidateSelectionSpec = {
  require?: WorkflowSelectionRequirements;
  select: WorkflowSelectionSelector;
  filters: WorkflowSelectionFilter[];
};

export type WorkflowInputsSpec = {
  member: {
    kind: WorkflowInputMemberKind;
    accepts?: {
      mime?: string[];
    };
  };
  grouping: WorkflowInputGrouping;
};

export type WorkflowTriggerSpec = {
  requiresSelection: boolean;
};

export type WorkflowExecutionSpec = {
  mcp?: {
    requiredTools?: string[];
  };
  zoteroHostAccess?: {
    required?: boolean;
    allowWriteApprovalBypass?: boolean;
  };
  poll_interval_ms?: number;
  timeout_ms?: number;
  feedback?: {
    showNotifications?: boolean;
  };
};

export type WorkflowInvocationMode = "interactive" | "non-interactive";

export type WorkflowResourceRequirement = {
  id: string;
  direction: "input" | "output";
  kind: "file" | "archive";
  cardinality: "one" | "many";
  required: boolean;
  accept?: {
    contentTypes?: string[];
    extensions?: string[];
    maxCount?: number;
    maxBytes?: number;
  };
  suggestedName?: string;
};

export type WorkflowResourceBindings = {
  schema: "zotero-bridge.workflow-resources.v1";
  inputs: Record<string, { fileIds: string[] }>;
  outputs: Record<string, { delivery: "bridge-download" }>;
};

export type WorkflowResourceFile = {
  ref?: ResourceRef;
  slotId?: string;
  fileId: string;
  path: string;
  displayName: string;
  contentType: string;
  size?: number;
  sha256?: string;
  kind?: "file" | "archive";
  sizeBytes?: number;
};

export type WorkflowResourceMaterializeFileRequestDto = {
  slotId: string;
  sourcePath: string;
  displayName?: string;
  contentType?: string;
  kind?: "file" | "archive";
};

export type WorkflowResourceOutputDescriptor = {
  ref?: ResourceRef;
  slotId: string;
  fileId: string;
  sourceKind: "workflow-artifact";
  displayName: string;
  contentType: string;
  size?: number;
  sizeBytes?: number;
  sha256?: string;
  createdAt: string;
  expiresAt: string;
  downloadCommand: string;
};

export type WorkflowResourceApi = {
  mode: WorkflowInvocationMode;
  getInput: (slotId: string) => WorkflowResourceFile | null;
  getInputs: (slotId: string) => WorkflowResourceFile[];
  get?: (ref: ResourceRef) => Promise<WorkflowResourceFile>;
  allocateOutput: (args: {
    slotId: string;
    suggestedName?: string;
    contentType?: string;
  }) => Promise<{ allocationId?: string; slotId?: string; path: string }>;
  publishOutput: (args: {
    allocationId?: string;
    slotId: string;
    path: string;
    displayName?: string;
    contentType?: string;
  }) => Promise<WorkflowResourceOutputDescriptor>;
  listOutputs: () => WorkflowResourceOutputDescriptor[];
};

export type WorkflowResearchBundleApi = {
  materializePapers: {
    (args: {
      papers: Array<{ paperRef: string }>;
      sourcePaperRefs?: string[];
    }): Promise<{
      entries: import("../modules/researchBundleService").ResearchBundleEntry[];
      warnings: import("../modules/researchBundleService").ResearchBundleWarning[];
      papers: Record<string, unknown>[];
    }>;
    (
      request: MaterializePapersRequestDto,
      control?: WorkflowCallControl,
    ): Promise<MaterializePapersResultDto>;
  };
  importPapers?: (
    request: ImportPapersRequestDto,
    control?: WorkflowCallControl,
  ) => Promise<ImportPapersResultDto>;
};

export type WorkflowFileStatDto = {
  path: string;
  kind: "file" | "directory" | "other";
  sizeBytes: number | null;
  modifiedAt: string | null;
};

export type WorkflowFileListRequestDto = {
  path: string;
  recursive?: boolean;
  maxDepth?: number;
};

export type WorkflowFileListEntryDto = {
  relativePath: string;
  kind: "file" | "directory" | "other";
  sizeBytes: number | null;
  modifiedAt: string | null;
};

export type WorkflowFileListResultDto = {
  rootPath: string;
  entries: WorkflowFileListEntryDto[];
  totalEntries: number;
  totalFileBytes: number;
};

export type WorkflowFileRemoveResultDto = { removed: boolean };

export type WorkflowResultSpec = {
  fetch?: {
    type?: "bundle" | "result";
  };
  final_step_id?: string;
  expects?: {
    result_json?: string;
    artifacts?: string[];
  };
};

export type WorkflowRequestSpec = {
  kind: string;
  create?: {
    skill_id?: string;
    mode: "auto" | "interactive";
    skill_source?: "local-package" | "installed";
  };
  input?: {
    upload?: {
      files?: Array<{
        key: string;
        from: "selected.markdown" | "selected.pdf" | "selected.source";
      }>;
    };
    [key: string]: unknown;
  };
  poll?: {
    interval_ms?: number;
    timeout_ms?: number;
  };
  sequence?: {
    steps?: Array<{
      id?: string;
      skill_id?: string;
      mode: "auto" | "interactive";
      input?: Record<string, unknown>;
      parameter?: Record<string, unknown>;
      fetch_type?: "bundle" | "result";
      workspace?: "new" | "reuse-workflow";
      apply_result?: {
        workflow_id?: string;
        on_failure?: "continue" | "fail_sequence";
      };
      handoff?: {
        bindings: Array<{
          kind: "value" | "file";
          target: string;
          source?: string;
          step?: string;
          required?: boolean;
          value?: unknown;
        }>;
      };
      include_if?:
        | {
            kind: "parameter";
            parameter: string;
            equals: string | number | boolean | null;
          }
        | {
            kind: "runtime";
            condition: string;
          };
      short_circuit?: {
        when?: {
          path?: string;
          equals?: string | number | boolean | null;
        };
        result?: "step_output";
      };
    }>;
  };
  [key: string]: unknown;
};

export type WorkflowManifest = {
  schemaVersion: 2;
  id: string;
  label: string;
  description?: string;
  executionModes?: Array<"auto" | "interactive">;
  supportedInvocationModes?: WorkflowInvocationMode[];
  resourceRequirements?: WorkflowResourceRequirement[];
  debug_only?: boolean;
  provider: string;
  version?: string;
  display?: WorkflowDisplaySpec;
  taskNameTemplate?: string;
  i18n?: WorkflowI18nSpec;
  parameters?: Record<string, WorkflowParameterSchema>;
  inputs: WorkflowInputsSpec;
  validateSelection: WorkflowValidateSelectionSpec;
  trigger: WorkflowTriggerSpec;
  execution?: WorkflowExecutionSpec;
  result?: WorkflowResultSpec;
  request?: WorkflowRequestSpec;
  hooks: WorkflowHooksSpec;
};

export type WorkflowPackageManifest = {
  id: string;
  version: string;
  workflows: string[];
  i18n?: WorkflowPackageI18nSpec;
};

export type HookHelpers = {
  getAttachmentParentId: (entry: unknown) => number | null;
  getAttachmentFilePath: (entry: unknown) => string;
  getAttachmentFileName: (entry: unknown) => string;
  getAttachmentFileStem: (entry: unknown) => string;
  getAttachmentDateAdded: (entry: unknown) => number;
  isMarkdownAttachment: (entry: unknown) => boolean;
  isPdfAttachment: (entry: unknown) => boolean;
  pickEarliestPdfAttachment: (entries: unknown[]) => unknown | null;
  cloneSelectionContext: <T>(selectionContext: T) => T;
  withFilteredAttachments: <T>(
    selectionContext: T,
    attachments: unknown[],
  ) => T;
  resolveItemRef: (ref: Zotero.Item | number | string) => Zotero.Item;
  basenameOrFallback: (
    targetPath: string | undefined,
    fallback: string,
  ) => string;
  toHtmlNote: (title: string, body: string) => string;
  normalizeReferenceAuthors: (value: unknown) => string[];
  normalizeReferenceEntry: (
    entry: unknown,
    index: number,
  ) => Record<string, unknown>;
  normalizeReferencesArray: (value: unknown) => Record<string, unknown>[];
  normalizeReferencesPayload: (payload: unknown) => Record<string, unknown>[];
  replacePayloadReferences: (
    payload: unknown,
    references: Record<string, unknown>[],
  ) => unknown;
  resolveReferenceSource: (entry: unknown) => string;
  renderReferenceLocator: (entry: unknown) => string;
  renderReferencesTable: (references: unknown) => string;
  inspectGeneratedNoteReadiness: (
    parentRef: Zotero.Item | number | string,
    spec: WorkflowGeneratedNoteReadinessFilter,
  ) => Promise<WorkflowGeneratedNoteReadinessResult>;
};

export type WorkflowHostApi = {
  version: number;
  resources?: WorkflowResourceApi;
  addon: {
    getConfig: () => {
      addonName: string;
      addonRef: string;
      prefsPrefix: string;
    };
  };
  items: {
    get: (ref: Zotero.Item | number | string) => Zotero.Item | null;
    resolve: (ref: Zotero.Item | number | string) => Zotero.Item;
    getByLibraryAndKey: (libraryID: number, key: string) => Zotero.Item | null;
    getAll: () => Promise<Zotero.Item[]>;
    exportPortableJson: (
      ref: Zotero.Item | number | string,
    ) => Record<string, unknown>;
    exportText: (
      args: import("./bibliography").WorkflowItemTextExportArgs,
    ) => Promise<
      import("./bibliography").WorkflowItemTextExportResult
    >;
    createFromJson: (args: {
      itemJson: Record<string, unknown>;
      libraryID?: number;
    }) => Promise<Zotero.Item>;
    remove: (ref: Zotero.Item | number | string) => Promise<void>;
  };
  context: WorkflowHostContextApi;
  library: WorkflowHostLibraryApi;
  mutations: WorkflowHostMutationApi;
  metadata: WorkflowHostMetadataApi;
  researchBundles: WorkflowResearchBundleApi;
  prefs: {
    get: (key: string, global?: boolean) => unknown;
    set: (key: string, value: unknown, global?: boolean) => void;
    clear: (key: string, global?: boolean) => void;
  };
  parents: {
    addNote: (
      parentRef: Zotero.Item | number | string,
      note: { content: string },
    ) => Promise<Zotero.Item>;
    addAttachment: (
      parentRef: Zotero.Item | number | string,
      spec: { file: any } | { filePath: string },
    ) => Promise<Zotero.Item>;
    addRelated: (
      parentRef: Zotero.Item | number | string | Array<Zotero.Item | number | string>,
      relatedRefs: Zotero.Item | number | string | Array<Zotero.Item | number | string>,
    ) => Promise<void>;
    removeRelated: (
      parentRef: Zotero.Item | number | string | Array<Zotero.Item | number | string>,
      relatedRefs: Zotero.Item | number | string | Array<Zotero.Item | number | string>,
    ) => Promise<void>;
    updateFields: (
      parentRef: Zotero.Item | number | string,
      patch: Record<string, string | number | boolean | null>,
    ) => Promise<Zotero.Item>;
    updateMetadata: (
      parentRef: Zotero.Item | number | string,
      metadata: {
        itemType?: string | null;
        fields?: Record<string, string | number | boolean | null> | null;
        creators?: WorkflowHostCreatorDto[] | null;
      },
    ) => Promise<Zotero.Item>;
  };
  notes: {
    create: (note: { content: string }) => Promise<Zotero.Item>;
    update: (
      noteRef: Zotero.Item | number | string,
      patch: { content: string },
    ) => Promise<Zotero.Item>;
    remove: (noteRef: Zotero.Item | number | string) => Promise<void>;
    importEmbeddedImage: (
      noteRef: Zotero.Item | number | string,
      image: WorkflowPreparedNoteImage,
    ) => Promise<{
      attachmentKey: string;
      attachmentItem: Zotero.Item;
      mimeType: string;
      bytes: number;
    }>;
  };
  images: {
    prepareForNoteEmbedding: (
      source:
        | string
        | {
            path?: string;
            blob?: Blob;
            bytes?: Uint8Array | ArrayBuffer;
            mimeType?: string;
          },
      options?: WorkflowImagePreparationOptions,
    ) => Promise<WorkflowPreparedNoteImage>;
  };
  attachments: {
    create: (spec: { file: any } | { filePath: string }) => Promise<Zotero.Item>;
    createFromPath: (options: {
      parent?: Zotero.Item | number | string | null;
      path?: string | null;
      dataPath?: string | null;
      itemKey?: string;
      libraryID?: number;
      title?: string | null;
      mimeType?: string | null;
      charset?: string | null;
      url?: string | null;
      allowMissing?: boolean;
    }) => Promise<Zotero.Item>;
    importStoredFromPath: (options: {
      parent?: Zotero.Item | number | string | null;
      path?: string | null;
      dataPath?: string | null;
      itemKey?: string;
      libraryID?: number;
      title?: string | null;
      mimeType?: string | null;
      charset?: string | null;
      url?: string | null;
      allowMissing?: boolean;
    }) => Promise<Zotero.Item>;
    createFromUrl: (options: {
      parent?: Zotero.Item | number | string | null;
      url: string;
      title?: string | null;
      mimeType?: string | null;
      deduplicate?: boolean;
    }) => Promise<Zotero.Item>;
    update: (
      attachmentRef: Zotero.Item | number | string,
      patch: Record<string, string | number | boolean | null>,
    ) => Promise<Zotero.Item>;
    remove: (
      attachmentRef: Zotero.Item | number | string,
    ) => Promise<void>;
    importStoredFile: (args: {
      parent?: Zotero.Item | number | string | null;
      path: string;
      title?: string | null;
      mimeType?: string | null;
      charset?: string | null;
      url?: string | null;
      companionFiles?: Array<{
        sourcePath: string;
        relativePath: string;
      }>;
    }) => Promise<Zotero.Item>;
  };
  tags: {
    add: (
      itemRef: Zotero.Item | number | string | Array<Zotero.Item | number | string>,
      tags: string[],
    ) => Promise<void>;
    list: (itemRef: Zotero.Item | number | string) => Promise<string[]>;
    remove: (
      itemRef: Zotero.Item | number | string | Array<Zotero.Item | number | string>,
      tags: string[],
    ) => Promise<void>;
    replace: (
      itemRef: Zotero.Item | number | string | Array<Zotero.Item | number | string>,
      tags: string[],
    ) => Promise<void>;
  };
  statusTags: {
    getPolicy: () => Readonly<Record<StatusTagKey, StatusTagValue>>;
    transition: (
      args: StatusTagTransitionRequestDto,
      control?: WorkflowCallControl,
    ) => Promise<MutationExecutionResult<StatusTagTransitionResultDto>>;
  };
  collections: {
    update: (
      collectionRef: number | string | Zotero.Collection,
      patch: { name?: string; parentID?: number | null },
    ) => Promise<Zotero.Collection>;
    create: (options: {
      name: string;
      libraryID?: number;
    }) => Promise<Zotero.Collection>;
    delete: (
      collection: number | string | Zotero.Collection,
    ) => Promise<void>;
    add: (
      itemRef: Zotero.Item | number | string | Array<Zotero.Item | number | string>,
      collection: number | string | Zotero.Collection,
    ) => Promise<void>;
    remove: (
      itemRef: Zotero.Item | number | string | Array<Zotero.Item | number | string>,
      collection: number | string | Zotero.Collection,
    ) => Promise<void>;
    replace: (
      itemRef: Zotero.Item | number | string | Array<Zotero.Item | number | string>,
      collections: Array<number | string | Zotero.Collection>,
    ) => Promise<void>;
  };
  command: {
    run: (
      commandId: string,
      args?: unknown,
      context?: unknown,
    ) => Promise<void>;
  };
  editor: {
    openSession: (
      args: Parameters<
        typeof import("../modules/workflowEditorHost").openWorkflowEditorSession
      >[0],
    ) => ReturnType<
      typeof import("../modules/workflowEditorHost").openWorkflowEditorSession
    >;
    registerRenderer: (
      rendererId: string,
      renderer: Parameters<
        typeof import("../modules/workflowEditorHost").registerWorkflowEditorRenderer
      >[1],
    ) => void;
    unregisterRenderer: (rendererId: string) => void;
  };
  notifications: {
    toast: (args: {
      text: string;
      type?: "default" | "success" | "error";
    }) => void;
  };
  logging: {
    appendRuntimeLog: (
      input: import("../modules/runtimeLogManager").RuntimeLogInput,
    ) => ReturnType<
      typeof import("../modules/runtimeLogManager").appendRuntimeLog
    >;
    recordPerformanceSpanForTests?: (args: {
      name: string;
      startedAt: number;
      durationMs: number;
      labels?: Record<string, unknown>;
    }) => void;
    recordLeakProbeTempArtifactForTests?: (args: {
      kind: "zip-extracted-dir" | "tag-regulator-valid-tags-yaml";
      path: string;
    }) => void;
    releaseLeakProbeTempArtifactForTests?: (path: string) => void;
  };
  file: {
    pathToFile: (path: string) => unknown;
    readText: (path: string) => Promise<string>;
    writeText: (path: string, content: string) => Promise<void>;
    readBytes: (path: string) => Promise<Uint8Array>;
    writeBytes: (
      path: string,
      bytes: Uint8Array | ArrayBuffer,
    ) => Promise<void>;
    copy: (sourcePath: string, targetPath: string) => Promise<void>;
    exists: (path: string) => Promise<boolean>;
    makeDirectory: (path: string) => Promise<void>;
    stat: (path: string) => Promise<WorkflowFileStatDto>;
    list: (
      args: WorkflowFileListRequestDto,
    ) => Promise<WorkflowFileListResultDto>;
    move: (args: {
      sourcePath: string;
      targetPath: string;
      overwrite?: boolean;
    }) => Promise<void>;
    remove: (args: {
      path: string;
      recursive?: boolean;
      missing?: "error" | "ignore";
    }) => Promise<WorkflowFileRemoveResultDto>;
    materializeWorkflowInputFile: (args: {
      workflowId?: string;
      key?: string;
      fileName?: string;
      content?: string;
      bytes?: Uint8Array | ArrayBuffer;
    }) => Promise<{ path: string }>;
    getTempDirectoryPath: () => string;
    pickDirectory: (args?: {
      title?: string;
      directory?: string;
    }) => Promise<string | null>;
    pickFile: (args?: {
      title?: string;
      directory?: string;
      filters?: [string, string][];
    }) => Promise<string | null>;
    pickSaveFile: (args?: {
      title?: string;
      directory?: string;
      filters?: [string, string][];
      suggestedName?: string;
    }) => Promise<string | null>;
    pickFiles: (args?: {
      title?: string;
      directory?: string;
      filters?: [string, string][];
    }) => Promise<string[] | null>;
  };
  archive: import("./archive").WorkflowArchiveApi;
  synthesis?: WorkflowSynthesisV11Api;
};

export type WorkflowSynthesisApplyContext = {
  resultContext?: Pick<WorkflowResultContext, "resolveArtifact">;
  bundleReader?: Pick<WorkflowResultContext["bundleReader"], "readText">;
};

export type WorkflowLiteratureDigestApplyInput = Partial<
  SynthesisWorkflowItemSnapshot
> & {
  parentItem?: Zotero.Item | number | string | null;
  item?: Zotero.Item | number | string | null;
  digest?: unknown;
  references?: unknown;
  citationAnalysis?: unknown;
  literatureMatchingMetadata?: unknown;
  matchedReferences?: unknown;
  source?: unknown;
};

export type TagAuditRunWriter = Readonly<{
  append(entries: TagAuditStagingEntry[]): Promise<void>;
}>;

export type TagRegulationAcknowledgementRequestDto = {
  target: PortableItemRef;
  mutationReceipt: MutationReceipt;
};

export interface WorkflowSynthesisApi {
  readonly workflowApply: Readonly<{
    applyLiteratureDigest(
      input: SynthesisLiteratureDigestApplyRequest,
      control?: WorkflowCallControl,
    ): Promise<SynthesisLiteratureDigestApplyResult>;
    applyTopicPlan(
      input: SynthesisTopicPlanApplyRequest,
      control?: WorkflowCallControl,
    ): Promise<SynthesisTopicPlanApplyResult>;
    applyTopicSynthesisResult(
      input: SynthesisTopicApplyRequest,
      control?: WorkflowCallControl,
    ): Promise<SynthesisTopicApplyResult>;
  }>;
  readonly topics: Readonly<{
    getReport(
      input: SynthesisTopicReportRequest,
      control?: WorkflowCallControl,
    ): Promise<SynthesisTopicReportResult>;
  }>;
  readonly artifacts: Readonly<{
    readPaperArtifacts(
      input: SynthesisPaperArtifactsRequest,
      control?: WorkflowCallControl,
    ): Promise<SynthesisPaperArtifactsResult>;
  }>;
  readonly tags: Readonly<{
    loadVocabulary(
      control?: WorkflowCallControl,
    ): Promise<SynthesisTagVocabularySnapshot>;
    saveVocabulary(
      input: SynthesisTagVocabularySaveRequest,
      control?: WorkflowCallControl,
    ): Promise<SynthesisTagMutationResult>;
    exportVocabularyForRegulator(
      control?: WorkflowCallControl,
    ): Promise<TagVocabularyRegulatorExportDto>;
    listStagedSuggestions(
      control?: WorkflowCallControl,
    ): Promise<SynthesisTagStagedSuggestion[]>;
    stageSuggestions(
      input: SynthesisTagSuggestionStageRequest,
      control?: WorkflowCallControl,
    ): Promise<SynthesisTagStageResult>;
    promoteStagedSuggestions(
      input: SynthesisTagSelectionRequest,
      control?: WorkflowCallControl,
    ): Promise<SynthesisTagPromotionResult>;
    discardStagedSuggestions(
      input: SynthesisTagSelectionRequest,
      control?: WorkflowCallControl,
    ): Promise<SynthesisTagDiscardResult>;
    withAuditRun(
      input: TagAuditRunRequestDto,
      control: WorkflowCallControl,
      callback: (
        run: TagAuditRunWriter,
      ) => Promise<LibraryTraversalResultDto> | LibraryTraversalResultDto,
    ): Promise<TagAuditRunResultDto>;
    acknowledgeRegulation(
      input: TagRegulationAcknowledgementRequestDto,
      control?: WorkflowCallControl,
    ): Promise<TagRegulationAcknowledgementResultDto>;
  }>;
}

export interface WorkflowSynthesisV11Api {
  applyLiteratureDigestSidecar(
    input?: WorkflowLiteratureDigestApplyInput,
  ): Promise<SynthesisJsonObject>;
  applyTopicSynthesisResult(
    bundle: unknown,
    context?: WorkflowSynthesisApplyContext,
  ): Promise<SynthesisJsonObject>;
  getTopicReport(
    request: SynthesisTopicReportRequest,
  ): Promise<SynthesisTopicReportResult>;
  getTopicPlanningContext(): Promise<SynthesisJsonObject>;
  applyTopicPlan(plan: SynthesisJsonObject): Promise<SynthesisJsonObject>;
  readPaperArtifacts(
    request: SynthesisPaperArtifactsRequest,
  ): Promise<SynthesisPaperArtifactsResult>;
  loadTagVocabulary(): Promise<SynthesisTagVocabularySnapshot>;
  saveTagVocabulary(
    request: SynthesisTagVocabularySaveRequest,
  ): Promise<SynthesisJsonValue>;
  exportTagVocabularyForRegulator(): Promise<string[]>;
  listStagedTagSuggestions(): Promise<SynthesisTagStagedSuggestion[]>;
  stageTagSuggestions(
    request: SynthesisTagSuggestionStageRequest,
  ): Promise<SynthesisJsonValue>;
  discardStagedTagSuggestions(
    request: SynthesisTagSelectionRequest,
  ): Promise<SynthesisTagCommandResult>;
  replaceTagAuditRecords(
    request: SynthesisTagAuditReplaceRequest,
  ): Promise<SynthesisJsonObject>;
  clearTagAuditRecord(request: {
    libraryId: number;
    itemKey: string;
  }): Promise<void>;
}

export type WorkflowImagePreparationOptions = {
  maxLongEdge?: number;
  targetBytes?: number;
  hardMaxBytes?: number;
  initialQuality?: number;
  minQuality?: number;
  background?: string;
  sourceKind?: string;
  outputMimeType?: "image/jpeg" | "image/png";
};

export type WorkflowPreparedNoteImage = {
  blob?: Blob;
  bytes?: Uint8Array | ArrayBuffer;
  mimeType: string;
  width: number;
  height: number;
  originalBytes: number;
  compressedBytes: number;
  fileName?: string;
  diagnostics?: Record<string, unknown>;
};

export type WorkflowRuntimeContext = {
  handlers: typeof import("../handlers").handlers;
  zotero: typeof Zotero;
  helpers: HookHelpers;
  addon?: typeof addon | null;
  hostApi: WorkflowHostApi;
  hostApiVersion: number;
  workflowHostLiveReads?: WorkflowHostLiveReadAdapters;
  invocationMode?: WorkflowInvocationMode;
  debugMode?: boolean;
  workflowId?: string;
  packageId?: string;
  workflowRootDir?: string;
  packageRootDir?: string;
  workflowSourceKind?: "official" | "dev-local" | "user" | "";
  hookName?: "preflight" | "buildRequest" | "applyResult" | "";
  locale?: string;
  fetch?: typeof globalThis.fetch | null;
  Buffer?: typeof globalThis.Buffer | null;
  btoa?: typeof globalThis.btoa | null;
  atob?: typeof globalThis.atob | null;
  TextEncoder?: typeof globalThis.TextEncoder | null;
  TextDecoder?: typeof globalThis.TextDecoder | null;
  FileReader?: typeof globalThis.FileReader | null;
  navigator?: typeof globalThis.navigator | null;
};

export type WorkflowPreflightDiagnostic = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type WorkflowPreflightAggregatePlan = {
  id: string;
  mode: "single-apply";
  applyWhen: "all-succeeded";
  orderBy: "unit.order";
};

export type WorkflowPreflightUnit = {
  id: string;
  order?: number;
  label?: string;
  selectionContext?: unknown;
  context?: Record<string, unknown>;
};

export type WorkflowPreflightContext = {
  planId: string;
  unitId: string;
  unitOrder?: number;
  context?: Record<string, unknown>;
  aggregate?: {
    id: string;
    mode: "single-apply";
  };
};

export type WorkflowPreflightApplyInput = {
  resultJson: unknown;
  request?: unknown;
  runResult?: unknown;
  parent?: Zotero.Item | number | string | null;
};

export type WorkflowPreflightOutcome =
  | {
      kind: "continue";
      context?: Record<string, unknown>;
      diagnostics?: WorkflowPreflightDiagnostic[];
    }
  | {
      kind: "replace-units";
      units: WorkflowPreflightUnit[];
      aggregate?: WorkflowPreflightAggregatePlan;
      context?: Record<string, unknown>;
      diagnostics?: WorkflowPreflightDiagnostic[];
    }
  | {
      kind: "short-circuit-apply";
      apply: WorkflowPreflightApplyInput;
      context?: Record<string, unknown>;
      diagnostics?: WorkflowPreflightDiagnostic[];
    }
  | {
      kind: "skip";
      reason?: string;
      diagnostics?: WorkflowPreflightDiagnostic[];
    };

export type PreflightHook = (args: {
  selectionContext: unknown;
  manifest: WorkflowManifest;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
  };
  runtime: WorkflowRuntimeContext;
}) => WorkflowPreflightOutcome | Promise<WorkflowPreflightOutcome>;

export type BuildRequestHook = (args: {
  selectionContext: unknown;
  preflight?: WorkflowPreflightContext;
  manifest: WorkflowManifest;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
  };
  runtime: WorkflowRuntimeContext;
}) => unknown | Promise<unknown>;

export type WorkflowApplyDiagnostics = {
  warningCount?: number;
  warningCodeCounts?: Record<string, number>;
};

export type WorkflowApplyResult = Record<string, unknown> & {
  applyDiagnostics?: WorkflowApplyDiagnostics;
};

export type ApplyResultHook = (args: {
  parent: Zotero.Item | number | string | null;
  bundleReader: {
    readText: (entryPath: string) => Promise<string>;
    getExtractedDir?: () => Promise<string>;
  };
  resultContext?: WorkflowResultContext;
  productStorage?: ProductStorageApi;
  request?: unknown;
  runResult?: unknown;
  sequenceStep?: {
    id: string;
    index: number;
    workflowId: string;
    skillId: string;
    finalStep: boolean;
    phase: "sequence-step";
  };
  manifest: WorkflowManifest;
  runtime: WorkflowRuntimeContext;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
  };
}) => WorkflowApplyResult | void | Promise<WorkflowApplyResult | void>;

export type NormalizeWorkflowSettingsHook = (
  args:
    | {
        phase: "persisted";
        workflowId: string;
        manifest: WorkflowManifest;
        previous: {
          backendId?: string;
          workflowParams?: Record<string, unknown>;
          providerOptions?: Record<string, unknown>;
        };
        incoming: {
          backendId?: string;
          workflowParams?: Record<string, unknown>;
          providerOptions?: Record<string, unknown>;
        };
        merged: {
          backendId?: string;
          workflowParams?: Record<string, unknown>;
          providerOptions?: Record<string, unknown>;
        };
      }
    | {
        phase: "execution";
        workflowId: string;
        manifest: WorkflowManifest;
        rawWorkflowParams: Record<string, unknown>;
        normalizedWorkflowParams: Record<string, unknown>;
      },
) => unknown;

export type WorkflowHooksModule = {
  preflight?: PreflightHook;
  buildRequest?: BuildRequestHook;
  normalizeSettings?: NormalizeWorkflowSettingsHook;
  applyResult: ApplyResultHook;
};

export type ResolvedBuildStrategy = "hook" | "declarative";
export type WorkflowHookExecutionMode =
  | "precompiled-host-hook"
  | "legacy-text-loader"
  | "node-native-module";

export type LoadedWorkflow = {
  manifest: WorkflowManifest;
  rootDir: string;
  packageId?: string;
  packageRootDir?: string;
  manifestPath?: string;
  localization?: WorkflowLocalizationResources;
  workflowSourceKind?: "official" | "dev-local" | "user" | "";
  hooks: WorkflowHooksModule;
  buildStrategy: ResolvedBuildStrategy;
  hookExecutionMode?: WorkflowHookExecutionMode;
};

export type LoadedWorkflows = {
  workflows: LoadedWorkflow[];
  manifests: WorkflowManifest[];
  warnings: string[];
  errors: string[];
  diagnostics?: Array<{
    level: "warning" | "error";
    category:
      | "manifest_parse_error"
      | "manifest_validation_error"
      | "hook_missing_error"
      | "hook_import_error"
      | "hook_export_error"
      | "scan_path_error"
      | "scan_runtime_warning"
      | "skill_dependency_missing";
    message: string;
    entry?: string;
    workflowId?: string;
    path?: string;
    reason?: string;
  }>;
};
