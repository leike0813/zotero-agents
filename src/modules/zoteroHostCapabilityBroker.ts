import { handlers } from "../handlers";
import {
  getHostBridgeFileDescriptor,
  markHostBridgeUploadedFileConsumed,
  resolveHostBridgeUploadedFile,
  type HostBridgeFileDescriptor,
} from "./hostBridgeFileRegistry";
import { resolveRuntimeZotero } from "../utils/runtimeBridge";
import {
  buildWorkbenchPayloadEnvelope,
  buildWorkbenchPayloadPngBytes,
  canonicalLogicalNotePayloadHash,
  decodeBase64Utf8,
  encodeBase64Utf8,
  ZoteroNotePayloadResourceLimitError,
  type ZoteroNotePayloadBlock,
  type ZoteroNotePayloadDetail,
} from "./notePayloadCodec";
import {
  listNotePayloadBlocksForItemPage,
  ZoteroNotePayloadCursorError,
  ZoteroNotePayloadPageLimitError,
} from "./zoteroNotePayloadResolver";
import {
  resolveLibraryArtifactReadiness,
  type LibraryArtifactItem,
  type LibraryArtifactReadOptions,
} from "./libraryArtifactReadiness";
import {
  queryZoteroLibraryPage,
  queryZoteroAnnotationPage,
  queryZoteroChildItemPage,
  queryZoteroCollectionPage,
  queryZoteroSavedSearchPage,
  ZoteroLibraryCriteriaError,
  ZoteroLibraryCursorError,
  ZoteroLibraryPageLimitError,
  ZoteroLibrarySourceQueryError,
} from "./zoteroLibraryPageQuery";
import { createSha256Accumulator, sha256Hex } from "../utils/sha256";
import { yieldToEventLoop } from "../utils/runtimeCompatibility";
import type {
  AnnotationDetailDto,
  AnnotationItemSummaryDto,
  AttachmentDetailDto,
  AttachmentItemSummaryDto,
  CollectionDto,
  CreatorDto,
  CurrentViewDto,
  CurrentViewSourceDto,
  ItemDetailDto,
  ItemSummaryDto,
  JsonObject,
  JsonValue,
  LibraryListCollectionsPageDto,
  LibraryListCollectionsRequestDto,
  LibraryListItemAttachmentsPageDto,
  LibraryListItemNotesPageDto,
  LibraryListAnnotationsPageDto,
  LibraryListNotePayloadsPageDto,
  LibraryListSavedSearchesPageDto,
  LibraryListSavedSearchesRequestDto,
  LibraryPageRequestDto,
  LibraryListItemsPageDto,
  LibraryListItemsRequestDto,
  LibraryTraversalBatchDto,
  LibraryTraversalCompletionEvidenceDto,
  LibraryTraversalRequestDto,
  LibraryTraversalResultDto,
  LogicalNotePayloadDto,
  MetadataLookupRequestDto,
  MetadataLookupResultDto,
  MetadataTranslationEvidenceDto,
  NavigationSelectionInputDto,
  NavigationResultDto,
  NoteDetailDto,
  NoteDetailOptionsDto,
  NoteItemSummaryDto,
  NotePayloadOptionsDto,
  NotePayloadSummaryDto,
  NotePayloadValueDto,
  NoteSummaryDto,
  PortableCollectionRef as ZoteroHostCollectionRefInput,
  PortableItemRef as ZoteroHostItemRefInput,
  PortableSavedSearchRef,
  RegularItemDetailDto,
  RegularItemSummaryDto,
  SelectedItemSummaryDto,
  SelectedItemsPageDto,
  SelectedItemsPageRequestDto,
  PortableRegularItemDto,
  ItemUpdateMetadataRequest,
  MutationChangeDto,
  MutationEntityRef,
  MutationExecuteRequest,
  MutationExecutionResult,
  MutationItemResultDto,
  MutationOperation,
  MutationPlanByOperation,
  MutationPreviewOperation,
  MutationPreviewRequestByOperation,
  MutationPreviewResult,
  AttachmentCreateRequestDto,
  AttachmentMoveRequestDto,
  AttachmentRemoveRequestDto,
  AttachmentReplaceFileRequestDto,
  AttachmentUpdateMetadataRequestDto,
  NoteCreateRequestDto,
  NoteContentInput,
  NotePayloadUpsertRequestDto,
  NoteRemoveRequestDto,
  NoteUpdateContentRequestDto,
  PreparedNoteImageRef,
  StatusTagTransitionRequestDto,
  StatusTagTransitionResultDto,
  WorkflowCallControl,
  WorkflowBibliographyOwner,
  WorkflowHostCreatorDto as ZoteroHostMetadataCreatorDto,
} from "../workflows/types";
import {
  getBuiltinStatusPolicy,
  getBuiltinStatusTag,
  isBuiltinStatusKey,
} from "./synthesis/builtinTagPolicy";
import {
  assertWorkflowHostStrictJsonValue,
  createWorkflowHostErrorData,
  type WorkflowHostErrorCode,
  type WorkflowHostErrorDetailsByCode,
} from "../workflows/workflowHostErrorContract";
import {
  hashSynthesisContractCanonicalJson,
  ZOTERO_LIBRARY_SNAPSHOT_BATCH_SIZE_DEFAULT,
  ZOTERO_LIBRARY_SNAPSHOT_BATCH_SIZE_MAX,
  ZOTERO_LIBRARY_SNAPSHOT_ITEM_LIMIT,
  ZOTERO_LIBRARY_SNAPSHOT_ORDER,
  ZOTERO_LIBRARY_SNAPSHOT_SCHEMA,
  ZOTERO_LIBRARY_SNAPSHOT_SCOPE,
  ZOTERO_LIBRARY_SNAPSHOT_TTL_MS,
  type ZoteroLibrarySnapshotCallerScope,
  type ZoteroLibrarySnapshotIncompleteResultDto,
  type ZoteroLibrarySnapshotItemDto,
  type ZoteroLibrarySnapshotPageDto,
  type ZoteroLibrarySnapshotRequestDto,
} from "../../packages/synthesis-contracts/src/index";
import {
  configureMutationAuthorityRuntimeForTests,
  discardMutationPreviewToken,
  executeReservedMutation,
  issueMutationPreviewToken,
  MutationAuthorityAdmissionError,
  MutationAuthorityExecutionError,
  resetMutationAuthorityRuntimeForTests,
  validateMutationPreviewToken,
  type ZoteroHostMutationCallerScope,
} from "./zoteroHostMutationAuthority";
import { createWorkflowBibliographyOwner } from "../workflows/bibliography";

type ZoteroHostNoteMutationCallerScope = ZoteroHostMutationCallerScope &
  Readonly<{
    preparedImages?: Readonly<{
      resolve(ref: PreparedNoteImageRef): { blob: Blob };
    }>;
  }>;

export type {
  JsonObject,
  JsonPrimitive,
  JsonValue,
  PortableCollectionRef as ZoteroHostCollectionRefInput,
  PortableItemRef as ZoteroHostItemRefInput,
  WorkflowHostCreatorDto as ZoteroHostMetadataCreatorDto,
  WorkflowBibliographyOwner,
} from "../workflows/types";

export type ZoteroHostItemSummaryDto = {
  id: number;
  key: string;
  libraryId: number;
  itemType: string;
  title: string;
  creators: string[];
  year: string;
  date: string;
  publicationTitle: string;
  tags: string[];
  collections: Array<number | string>;
  parent?: {
    id: number;
    key: string;
  };
};

export type ZoteroHostItemDetailDto = ZoteroHostItemSummaryDto & {
  revision: string;
  fields: Record<string, string | number | boolean>;
  noteCount: number;
  attachmentCount: number;
  relatedItemKeys: string[];
};

export type ZoteroHostNoteDto = {
  id: number;
  key: string;
  libraryId: number;
  title: string;
  html?: string;
  text?: string;
  textExcerpt?: string;
  textLength?: number;
  htmlLength?: number;
  warnings?: string[];
  errors?: ZoteroHostMutationError[];
  parent?: {
    id: number;
    key: string;
    title: string;
  };
};

export type ZoteroHostAttachmentDto = {
  id: number;
  key: string;
  libraryId: number;
  title: string;
  contentType: string;
  path: string;
  filename: string;
  warnings?: string[];
  errors?: ZoteroHostMutationError[];
  parent?: {
    id: number;
    key: string;
    title: string;
  };
};

export type ZoteroHostCollectionDto = {
  id: number | string;
  key: string;
  name: string;
  libraryId: number;
  parentId?: number | string;
  parentKey?: string;
  path?: string[];
};

export type ZoteroHostNavigationTargetDto =
  | {
      kind: "item" | "note";
      item: ZoteroHostItemSummaryDto;
    }
  | {
      kind: "collection";
      collection: ZoteroHostCollectionDto;
    }
  | {
      kind: "selection";
      items: ZoteroHostItemSummaryDto[];
    };

export type ZoteroHostNavigationResultDto = {
  opened: boolean;
  found: boolean;
  target: ZoteroHostNavigationTargetDto;
  currentView: CurrentViewDto;
};

export type ZoteroHostSelectionOpenArgs = {
  items?: ZoteroHostItemRefInput[];
};

export type ZoteroHostCollectionOpenArgs = {
  key?: string;
  collectionKey?: string;
  libraryId?: number | string;
  libraryID?: number | string;
};

export type ZoteroHostLibraryListArgs = {
  libraryId?: number | string;
  collection?: ZoteroHostCollectionRefInput;
  collectionId?: number | string;
  collectionKey?: string;
  collectionLibraryId?: number | string;
  tag?: string;
  itemType?: string;
  query?: string;
  limit?: number | string;
  cursor?: string;
};

export type ZoteroHostLibraryReadinessCheck = "pdf" | "markdown" | "analysis";

export type ZoteroHostLibraryReadinessAuditArgs = ZoteroHostLibraryListArgs & {
  checks?: ZoteroHostLibraryReadinessCheck[] | string;
  missingOnly?: boolean | string | number;
  missing_only?: boolean | string | number;
};

export type ZoteroHostLibraryItemSummaryDto = ZoteroHostItemSummaryDto & {
  noteCount: number;
  attachmentCount: number;
};

export type ZoteroHostLibraryListResponse = {
  items: ZoteroHostLibraryItemSummaryDto[];
  nextCursor: string;
  totalScanned: number;
  returned: number;
  hasMore: boolean;
  filters: {
    libraryId?: number;
    collection?: ZoteroHostCollectionDto;
    tag?: string;
    itemType?: string;
    query?: string;
  };
};

export type ZoteroHostLibrarySyncSnapshotItemDto = ZoteroLibrarySnapshotItemDto;
export type ZoteroHostLibrarySyncSnapshotResponse =
  ZoteroLibrarySnapshotPageDto;
export type ZoteroHostLibrarySyncSnapshotRequest =
  ZoteroLibrarySnapshotRequestDto;
export type ZoteroHostLibrarySnapshotCallerScope =
  ZoteroLibrarySnapshotCallerScope;

export type ZoteroHostLibraryReadinessItemDto =
  ZoteroHostLibraryItemSummaryDto & {
    readiness: {
      pdf: "present" | "missing";
      markdown: "present" | "missing";
      analysis: "present" | "missing";
    };
    missing: ZoteroHostLibraryReadinessCheck[];
    evidence: {
      artifacts: string[];
      artifactState: string;
      pdf: {
        present: boolean;
        filename?: string;
      };
      markdown: {
        present: boolean;
        matchingStem?: string;
        markdownStemCount: number;
      };
      analysis: {
        present: boolean;
        missingParts: Array<"digest" | "references" | "citation-analysis">;
      };
    };
  };

export type ZoteroHostLibraryReadinessAuditResponse = {
  schema: "zotero.library.readiness_audit.v1";
  generatedAt: string;
  checks: ZoteroHostLibraryReadinessCheck[];
  missingOnly: boolean;
  items: ZoteroHostLibraryReadinessItemDto[];
  nextCursor: string;
  hasMore: boolean;
  returned: number;
  totalScanned: number;
  filters: ZoteroHostLibraryListResponse["filters"];
};

export type ZoteroHostNotePayloadSummaryDto = Omit<
  ZoteroNotePayloadBlock,
  "encodedValue" | "decodedText" | "payload" | "markdown"
>;

export type ZoteroHostNotePayloadDetailDto = Omit<
  ZoteroNotePayloadDetail,
  "encodedValue" | "decodedText" | "payload"
> & {
  payload: JsonValue | null;
  maxChars: number;
};

export type ZoteroHostMutationOperation =
  | "item.updateFields"
  | "item.addTags"
  | "item.removeTags"
  | "item.attachFile"
  | "note.createChild"
  | "note.update"
  | "note.upsertPayload"
  | "literature.ingest"
  | "collection.create"
  | "collection.addItems"
  | "collection.removeItems";

export type ZoteroHostIngestPaperInput = {
  itemType: string;
  fields: Record<string, string | number | boolean | null>;
  creators: ZoteroHostMetadataCreatorDto[];
  identifiers: {
    doi?: string;
    arxiv?: string;
    pmid?: string;
    isbn?: string;
  };
  landingUrl?: string;
  pdfUrl?: string;
  attachLandingUrlOnMissingPdf?: boolean;
};

export type ZoteroHostIngestPaperResult = {
  index: number;
  status: "created" | "existing" | "failed";
  title: string;
  identifiers: {
    doi?: string;
    arxiv?: string;
    pmid?: string;
    isbn?: string;
  };
  item?: ZoteroHostItemSummaryDto;
  attachmentStatus: "attached" | "skipped" | "failed";
  attachment?: ZoteroHostAttachmentDto;
  hasPdfAttachment: boolean;
  landingAttachmentStatus?: "attached" | "skipped" | "failed";
  landingAttachment?: ZoteroHostAttachmentDto;
  landingAttachmentError?: ZoteroHostMutationError;
  error?: ZoteroHostMutationError;
};

export type ZoteroHostMutationRequest = {
  operation: ZoteroHostMutationOperation | string;
  target?: ZoteroHostItemRefInput;
  targets?: ZoteroHostItemRefInput[];
  item?: ZoteroHostItemRefInput;
  items?: ZoteroHostItemRefInput[];
  parent?: ZoteroHostItemRefInput;
  note?: ZoteroHostItemRefInput;
  collection?: ZoteroHostCollectionRefInput;
  collectionName?: string;
  name?: string;
  libraryId?: number | string;
  libraryID?: number | string;
  fileId?: string;
  displayName?: string;
  contentType?: string;
  metadata?: Record<string, unknown>;
  fields?: Record<string, string | number | boolean | null>;
  tags?: string[];
  content?: string;
  noteKind?: string;
  payloadType?: string;
  payload?: unknown;
  payloadFormat?: "json" | "markdown" | "text" | string;
  paper?: ZoteroHostIngestPaperInput;
  papers?: unknown;
};

export type ZoteroHostAnnotationDto = {
  id?: number;
  key?: string;
  libraryId?: number;
  parentItemId?: number;
  parentItemKey?: string;
  type: string;
  text: string;
  comment: string;
  color: string;
  pageLabel: string;
  sortIndex: string;
};

export type ZoteroHostMutationError = {
  code: string;
  message: string;
  details?: JsonValue;
};

export type ZoteroHostCapabilityErrorCode = WorkflowHostErrorCode;

export class ZoteroHostCapabilityError extends Error {
  readonly schema: "zotero-agents.workflow-host-error.v1";
  readonly retryable: boolean;
  readonly details: WorkflowHostErrorDetailsByCode[WorkflowHostErrorCode];

  constructor(
    readonly code: ZoteroHostCapabilityErrorCode,
    message: string,
    details: WorkflowHostErrorDetailsByCode[WorkflowHostErrorCode],
    retryable = false,
  ) {
    super(message);
    const data = createWorkflowHostErrorData(code, details as never, {
      retryable,
    });
    this.name = "ZoteroHostCapabilityError";
    this.schema = data.schema;
    this.retryable = data.retryable;
    this.details = data.details;
  }
}

type ZoteroHostMutationBaseResponse = {
  operation: string;
  targetRefs: ZoteroHostItemSummaryDto[];
  summary: string;
  warnings: string[];
  requiresConfirmation: true;
};

export type ZoteroHostMutationPreviewResponse =
  | (ZoteroHostMutationBaseResponse & {
      ok: true;
      collection?: ZoteroHostCollectionDto;
    })
  | (ZoteroHostMutationBaseResponse & {
      ok: false;
      error: ZoteroHostMutationError;
    });

export type ZoteroHostMutationExecuteResponse =
  | (ZoteroHostMutationBaseResponse & {
      ok: true;
      result: {
        items?: ZoteroHostItemSummaryDto[];
        notes?: ZoteroHostNoteDto[];
        attachments?: ZoteroHostAttachmentDto[];
        file?: HostBridgeFileDescriptor;
        payloads?: Array<{
          noteKey: string;
          payloadType: string;
          noteKind: string;
          attachmentKey: string;
          bytes: number;
          replaced: number;
        }>;
        collections?: ZoteroHostCollectionDto[];
        collection?: ZoteroHostCollectionDto;
        ingest?: ZoteroHostIngestPaperResult;
      };
    })
  | (ZoteroHostMutationBaseResponse & {
      ok: false;
      error: ZoteroHostMutationError;
    });

export type ZoteroHostAnnotationExportDto = {
  format: string;
  annotations: ZoteroHostAnnotationDto[];
  markdown?: string;
};

export type ZoteroHostItemAuditStateDto = {
  target: { libraryId: number; itemKey: string };
  revision: string;
  tagDigest: string;
  tags: string[];
};

export interface ZoteroHostCapabilityBroker {
  readonly context: {
    getCurrentView(): CurrentViewDto;
    getSelectedItems(
      request?: SelectedItemsPageRequestDto,
      control?: WorkflowCallControl,
    ): Promise<SelectedItemsPageDto>;
  };
  readonly navigation: {
    openItem(
      ref: ZoteroHostItemRefInput,
      control?: WorkflowCallControl,
    ): Promise<NavigationResultDto>;
    openNote(
      ref: ZoteroHostItemRefInput,
      control?: WorkflowCallControl,
    ): Promise<NavigationResultDto>;
    openCollection(
      ref: ZoteroHostCollectionRefInput,
      control?: WorkflowCallControl,
    ): Promise<NavigationResultDto>;
    openSelection(
      input: NavigationSelectionInputDto,
      control?: WorkflowCallControl,
    ): Promise<NavigationResultDto>;
  };
  readonly library: {
    listItems(
      input: LibraryListItemsRequestDto,
      control?: WorkflowCallControl,
    ): Promise<LibraryListItemsPageDto>;
    traverseItems(
      input: LibraryTraversalRequestDto,
      control: WorkflowCallControl,
      onBatch: (batch: LibraryTraversalBatchDto) => Promise<void> | void,
    ): Promise<LibraryTraversalResultDto>;
    listCollections(
      input: LibraryListCollectionsRequestDto,
      control?: WorkflowCallControl,
    ): Promise<LibraryListCollectionsPageDto>;
    listSavedSearches(
      input: LibraryListSavedSearchesRequestDto,
      control?: WorkflowCallControl,
    ): Promise<LibraryListSavedSearchesPageDto>;
    syncSnapshot(
      args: ZoteroHostLibrarySyncSnapshotRequest,
      scope?: ZoteroHostLibrarySnapshotCallerScope,
      control?: WorkflowCallControl,
    ): Promise<ZoteroHostLibrarySyncSnapshotResponse>;
    cancelSnapshot(
      snapshotId: string,
      scope?: ZoteroHostLibrarySnapshotCallerScope,
    ): ZoteroLibrarySnapshotIncompleteResultDto;
    readinessAudit(
      args: ZoteroHostLibraryReadinessAuditArgs,
      control?: WorkflowCallControl,
    ): Promise<ZoteroHostLibraryReadinessAuditResponse>;
    getItemDetail(
      ref: ZoteroHostItemRefInput,
      control?: WorkflowCallControl,
    ): Promise<ItemDetailDto>;
    getItemAuditState(
      ref: ZoteroHostItemRefInput,
      control?: WorkflowCallControl,
    ): Promise<ZoteroHostItemAuditStateDto>;
    getItemNotes(
      ref: ZoteroHostItemRefInput,
      page?: LibraryPageRequestDto,
      control?: WorkflowCallControl,
    ): Promise<LibraryListItemNotesPageDto>;
    getNoteDetail(
      ref: ZoteroHostItemRefInput,
      options: NoteDetailOptionsDto,
      control?: WorkflowCallControl,
    ): Promise<NoteDetailDto>;
    listNotePayloads(
      ref: ZoteroHostItemRefInput,
      page?: LibraryPageRequestDto,
      control?: WorkflowCallControl,
    ): Promise<LibraryListNotePayloadsPageDto>;
    getNotePayload(
      ref: ZoteroHostItemRefInput,
      options: NotePayloadOptionsDto,
      control?: WorkflowCallControl,
    ): Promise<NotePayloadValueDto>;
    listAnnotations(
      ref: ZoteroHostItemRefInput,
      page?: LibraryPageRequestDto,
      control?: WorkflowCallControl,
    ): Promise<LibraryListAnnotationsPageDto>;
    exportPortableItems(
      refs: ZoteroHostItemRefInput[],
      control?: WorkflowCallControl,
    ): Promise<PortableRegularItemDto[]>;
    exportAnnotations(
      ref: ZoteroHostItemRefInput,
      args?: { format?: string },
      control?: WorkflowCallControl,
    ): Promise<ZoteroHostAnnotationExportDto>;
    getItemAttachments(
      ref: ZoteroHostItemRefInput,
      page?: LibraryPageRequestDto,
      control?: WorkflowCallControl,
    ): Promise<LibraryListItemAttachmentsPageDto>;
  };
  readonly metadata: {
    translateIdentifier(
      args: MetadataLookupRequestDto,
      control?: WorkflowCallControl,
    ): Promise<MetadataLookupResultDto>;
  };
  readonly bibliography: WorkflowBibliographyOwner;
  readonly mutations: {
    preview(
      request: MutationPreviewRequestByOperation[MutationPreviewOperation],
      scope: ZoteroHostMutationCallerScope,
    ): Promise<
      MutationPreviewResult<MutationPlanByOperation[MutationPreviewOperation]>
    >;
    execute(
      request: MutationExecuteRequest,
      scope: ZoteroHostMutationCallerScope,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<JsonObject>>;
  };
  readonly legacyMutations: {
    preview(
      request: ZoteroHostMutationRequest,
    ): Promise<ZoteroHostMutationPreviewResponse>;
    execute(
      request: ZoteroHostMutationRequest,
    ): Promise<ZoteroHostMutationExecuteResponse>;
  };
  readonly statusTags: {
    getPolicy(): ReturnType<typeof getBuiltinStatusPolicy>;
    transition(
      request: StatusTagTransitionRequestDto,
      scope: ZoteroHostMutationCallerScope,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<StatusTagTransitionResultDto>>;
  };
  readonly notes: {
    create(
      request: NoteCreateRequestDto,
      scope: ZoteroHostNoteMutationCallerScope,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<JsonObject>>;
    updateContent(
      request: NoteUpdateContentRequestDto,
      scope: ZoteroHostNoteMutationCallerScope,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<JsonObject>>;
    remove(
      request: NoteRemoveRequestDto,
      scope: ZoteroHostMutationCallerScope,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<JsonObject>>;
    upsertPayload(
      request: NotePayloadUpsertRequestDto,
      scope: ZoteroHostMutationCallerScope,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<JsonObject>>;
  };
  readonly attachments: {
    create(
      request: AttachmentCreateRequestDto,
      scope: ZoteroHostMutationCallerScope,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<JsonObject>>;
    updateMetadata(
      request: AttachmentUpdateMetadataRequestDto,
      scope: ZoteroHostMutationCallerScope,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<JsonObject>>;
    replaceFile(
      request: AttachmentReplaceFileRequestDto,
      scope: ZoteroHostMutationCallerScope,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<JsonObject>>;
    move(
      request: AttachmentMoveRequestDto,
      scope: ZoteroHostMutationCallerScope,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<JsonObject>>;
    remove(
      request: AttachmentRemoveRequestDto,
      scope: ZoteroHostMutationCallerScope,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<JsonObject>>;
  };
}

export type ZoteroHostAttachmentMutationPrimitives = Readonly<{
  createStoredFile?: (
    request: AttachmentCreateRequestDto,
    parent: Zotero.Item | null,
  ) => Promise<Zotero.Item>;
  replaceFile?: (
    request: AttachmentReplaceFileRequestDto,
    attachment: Zotero.Item,
  ) => Promise<Zotero.Item>;
}>;

const SUMMARY_TEXT_LIMIT = 300;
const FIELD_TEXT_LIMIT = 4000;
const NOTE_TEXT_LIMIT = 4000;
const NOTE_HTML_INPUT_LIMIT = 50000;
const NOTE_PAYLOAD_TYPE_RE = /^[a-z0-9][a-z0-9._-]*$/;
const NOTE_PAYLOAD_MAX_BYTES = 1024 * 1024;
const PAYLOAD_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAJ9GlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDUgNzkuMTYzNDk5LCAyMDE4LzA4LzEzLTE2OjQwOjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNi0wNS0yMFQyMjowODo0MCswODowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjYtMDUtMjFUMDA6MDA6MDUrMDg6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjYtMDUtMjFUMDA6MDA6MDUrMDg6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6ODlhNTNjMGYtMDBiMy1lYTQ5LWI3ZDAtODM5MDg0ZjJhYzc3IiB4bXBNTTpEb2N1bWVudElEPSJhZG9iZTpkb2NpZDpwaG90b3Nob3A6MDgwODY0ZDAtNmJmMi0zMTQ5LTk5YTctODYzMTY3YzRlNWVmIiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6YzQzYzZkZDgtZGI3Yy0yYzQ4LWI4ZjctZjQyM2VlMmQ5OGUyIj4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjNDNjNmRkOC1kYjdjLTJjNDgtYjhmNy1mNDIzZWUyZDk4ZTIiIHN0RXZ0OndoZW49IjIwMjYtMDUtMjBUMjI6MDg6NDArMDg6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY29udmVydGVkIiBzdEV2dDpwYXJhbWV0ZXJzPSJmcm9tIGltYWdlL3BuZyB0byBhcHBsaWNhdGlvbi92bmQuYWRvYmUucGhvdG9zaG9wIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDoyNzFiM2YwZi0xMmU5LTFjNDAtODUwYS04MDY4Y2Y1YzM4MmMiIHN0RXZ0OndoZW49IjIwMjYtMDUtMjBUMjM6Mzg6MDcrMDg6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8cmRmOmxpIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6YzRkNzc5NWYtZmVlMi1iMDQzLTk1NmItYWMyYzg2NWMwOGNiIiBzdEV2dDp3aGVuPSIyMDI2LTA1LTIxVDAwOjAwOjA1KzA4OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNvbnZlcnRlZCIgc3RFdnQ6cGFyYW1ldGVycz0iZnJvbSBhcHBsaWNhdGlvbi92bmQuYWRvYmUucGhvdG9zaG9wIHRvIGltYWdlL3BuZyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iZGVyaXZlZCIgc3RFdnQ6cGFyYW1ldGVycz0iY29udmVydGVkIGZyb20gYXBwbGljYXRpb24vdm5kLmFkb2JlLnBob3Rvc2hvcCB0byBpbWFnZS9wbmciLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjg5YTUzYzBmLTAwYjMtZWE0OS1iN2QwLTgzOTA4NGYyYWM3NyIgc3RFdnQ6d2hlbj0iMjAyNi0wNS0yMVQwMDowMDowNSswODowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKFdpbmRvd3MpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpjNGQ3Nzk1Zi1mZWUyLWIwNDMtOTU2Yi1hYzJjODY1YzA4Y2IiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6YzQzYzZkZDgtZGI3Yy0yYzQ4LWI4ZjctZjQyM2VlMmQ5OGUyIiBzdFJlZjpvcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6YzQzYzZkZDgtZGI3Yy0yYzQ4LWI4ZjctZjQyM2VlMmQ5OGUyIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+EN29wgAACL5JREFUWIWFl39wVNUVxz/3/dxkdxNDEkK0QXTUgYqISou/RRSsdVQoZSw69Ucda7GidhSnHZEidfAX4y+srRXUKopWQK3tdKrTKpXqiKUVW0EJQRETAmTzczfZ9/bde/rH280mSPDuvnnv7d5zz/ed7/ecc58yxjQAOYYPUzxCpTCg+JqRLB7VIKN0JLbtWFtBsiIkDmWnjDGDd0qN6MgDakFqo0DqwrypCbNmdNAjh+d7TGPQy5h8lxld6Kcx6qc+7BE1epL7u+Mu8m5WlkJERkSgjDFVSqleAIST80E4sRBGTWFe14b5qCHImdFBn24o5EkWcuKbvKoygUrrCGyxsbBwXBsnYeElFRWHWdiuoqetEDRNTUxM1jo7DgEg5QBh8eb63V/uWZzLDRxu4SBagdhY2sJJ2CRSNs4YC8ez8RIWTsLCrVA4vsIG1CBNsbP6ybavAzMN2HEIClAiQl82y972TE9TU2OV73uAEBUibNcuLjt0cRn8GAOipRhiVQahwLIsoshs8H1nGoxIQ8pesmQJCnh4xaofd3b31mht8H2XyspKjDYYIxhTOgvGKMQoxACisJRCKWtQP0rFMBSC4zJuzV+lMpdX+5sa2HsQAJ4D4Hke2Wyf/H71OjzPZeEt13LmGVOJomIClNCr8iVI6Vu8jaNSNMBSkHCEp9fZtx81VmVPnWhtOVgInEEovkc6XYkYjWUNzwbPUSilYmciw4EIoAREIWIR6jIIUIytM1TYkiv/NgIAMYYwDFEHTFKAcgwgw6qBKoEpnS1AK9AWIkIpo3e1FqittQ8b4urgALTWBPk8IgaRuDZ4HvTmhFtXC51ZRTIRexbAqaRmJAqt0YYxQKIREUaFcNIp8iwgYhUic4aB49X3Nr163EQOFguGl+UJdNWRz4NqKyiTgCiQMe0J91EgABiNgjCaKIozigKolBIVyEiUSFtt2h1z2mMJzLXoymmcXwKRxMJCDVEpAG57foOjustkZWHtuOt++7WsjoHVMgflKyYyf2EjsPAgKXLrcEEY2Ax2aG78r/PCc2KYiaXjzQ8NPn4H2fp/JExNcU1vtdL7pTnjn06ge1Fc67hANGLTWxCIzwyaJAd9XQMQVKwo0f+aBbTh9krDiR/GCrfs1j78BmX6by8/yOHt8L80fb+OM80+of3tr4qU174bvvvWxvuHmC70t1RXl3lDWgMQ0GKPLBUdiOixbsGzD8lcD1r1hgSdUpYW1t8QzN/5Pc9tzMLbe4bfXWZw93ubL1oC7H1pDJqOZ9k2Xx6+2Tq9J6g/nrxy4/aMvdLoYCcsqP6bEAjSmXOCKxd73Ld75b8DClQpSCrIFXrkVGutgZ6vm2Q2weK7H9TMN4ANQlU7xwD2/xPO9IpMJFlygmD+d+1b9Pbg7F4BSqn+QAqViHRQUgxQYbUimHDp7AmYvi8B4uEazepHD9BNtQNi1XzH+G4oJTYYw9Ml07mfRkmW0tu5h3JFjadn5GWPHHsGypYsYVVPDWceHbN5ZmLN9j775pHF2NCQNDSIS66AYAc+3yPYX+N49AZl2B8/XnDpec9KRmk2fhHywPc972wISbmzgeTYPPfo42Wwfc+dcwhO/fpAr5s0hk8nwyGNP4Lrx1sW1TH9JA+VSHMVZoLCKbRVcV/HmZs2GDUKySeMqoWUPTLwpT5gXCA1o4ak7/UEmT/v2ybyz8V1efPEPKDfJc6vX0NPTw7VXzRucY7TJKjHVQE+5RakYxPBOLOTyQEeBnERgQ7dYoIupkSuAKyhLARYSBMyedTGjkkmat3/KfQtv4IOt25kwcQJnn3seURTiOApjJBARf1gEYknG3sXEEQgC4aSjFY8uS+D4pZ1OeWPm2TabtmuSWhgAjtqsuP+IPFfOmM6RM6azsgtuPG8mY4C71uZY/pqh9xmPqgpRxogaBkBEMEYDZjBHg7zh6EabBXMdGLLbKQ9DU2PIrnZFBXDjaCHMC++39VOXtEh1WEQubNwdUOVofnGxg7ItBkKpiozoYQByuVxlFEXYdjkzlQW5vEHyB/gl7mqVnuYwN8/Tn2guP3cUi46J525qF/IGrqwTeveFuJHws1kVgE9La45/NYfNl03zeiEuRDZAKpn8vHVXM319WUyRgnTaI510qUq5OLYqNqYSFqG/4HBsbR9T6nftm/fA3s717w2gEi5Tx1n840s4YqHFpjaLqSdUAj4vvNXN/BVt//zBOanLa9N2KCIVGGNSIkJzc8vUCy6ctSldPbr/tT/+WaIwLz0de6WrY590798rmY5O6ezslkxnt2QyXdLZ2a3b2/dnmnd8vlake/LGLXsr5y7dNue6h3dLS1u/iGhZubEgIiLbvsjJNffvCOfe+e+rP2rJpGO6DcaYKmWMSQN9xdLotrS0TBg1qsZf3Hdlup0Zd/QucWRckrOS3/GaygcL1E/8yeJ9fPOtNbf8XywuDewmw6ywEGAKOpq0vklV6c3gmwsvVWNYJdVI7yeq137ovHjGuytYOVyA9GxPQMkGmvsz0b0foC9UioCCiCuSCz0g4zk/wHAy6N4uRY+pQAAAABJRU5ErkJggg==";
const PAYLOAD_IMAGE_FALLBACK_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
const LIBRARY_LIST_LIMIT_DEFAULT = 25;
const LIBRARY_LIST_LIMIT_MAX = 100;
const LIBRARY_READINESS_CHECKS: ZoteroHostLibraryReadinessCheck[] = [
  "pdf",
  "markdown",
  "analysis",
];
const TARGET_LIMIT_MAX = 50;
const TAG_LIMIT_MAX = 100;
const TAG_TEXT_LIMIT = 200;
const SELECTED_ITEMS_CURSOR_VERSION = 1;

export function resolveSelectedLibraryTreeRows(
  win: _ZoteroTypes.MainWindow,
): unknown[] {
  const pane = (win as any).ZoteroPane;
  for (const getRows of [
    pane?.getCollectionTreeRows,
    pane?.collectionsView?.getSelectedRows,
  ]) {
    if (typeof getRows !== "function") continue;
    try {
      const rows = getRows.call(
        getRows === pane?.getCollectionTreeRows ? pane : pane?.collectionsView,
      );
      if (Array.isArray(rows)) return rows;
    } catch {
      // Fall through to the legacy single-row shape.
    }
  }
  const itemViewRows = pane?.itemsView?.collectionTreeRows;
  if (Array.isArray(itemViewRows)) return itemViewRows;
  const row = pane?.collectionsView?.selectedTreeRow;
  return row ? [row] : [];
}

export function resolveSelectedLibraryIds(
  win: _ZoteroTypes.MainWindow,
  rows = resolveSelectedLibraryTreeRows(win),
): string[] {
  const pane = (win as any).ZoteroPane;
  let candidates: unknown[] = [];
  if (typeof pane?.getSelectedLibraryIDs === "function") {
    try {
      const selected = pane.getSelectedLibraryIDs();
      if (Array.isArray(selected)) candidates = selected;
    } catch {
      candidates = [];
    }
  }
  if (candidates.length === 0) {
    candidates = rows.map(
      (row: any) => row?.ref?.libraryID ?? row?.ref?.libraryId,
    );
  }
  if (
    candidates.length === 0 &&
    typeof pane?.getSelectedLibraryID === "function"
  ) {
    try {
      candidates = [pane.getSelectedLibraryID()];
    } catch {
      candidates = [];
    }
  }
  const libraryIds: string[] = [];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (!Number.isFinite(value) || value <= 0) continue;
    const normalized = String(Math.floor(value));
    if (!libraryIds.includes(normalized)) libraryIds.push(normalized);
  }
  return libraryIds;
}

type SelectedItemsCursor = Readonly<{
  version: typeof SELECTED_ITEMS_CURSOR_VERSION;
  basis: string;
  afterIndex: number;
}>;

function encodeSelectedItemsCursor(cursor: SelectedItemsCursor) {
  return encodeBase64Utf8(JSON.stringify(cursor))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeSelectedItemsCursor(value: string): SelectedItemsCursor {
  if (!value || !/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw capabilityError("invalid_request", "selection cursor is malformed", {
      reason: "invalid_value",
      field: "cursor",
    });
  }
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const decoded = JSON.parse(
      decodeBase64Utf8(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
    ) as Record<string, unknown>;
    if (
      decoded.version !== SELECTED_ITEMS_CURSOR_VERSION ||
      typeof decoded.basis !== "string" ||
      !/^[a-f0-9]{64}$/u.test(decoded.basis) ||
      !Number.isSafeInteger(decoded.afterIndex) ||
      Number(decoded.afterIndex) < 0
    ) {
      throw new Error("invalid selection cursor");
    }
    return decoded as unknown as SelectedItemsCursor;
  } catch {
    throw capabilityError("invalid_request", "selection cursor is invalid", {
      reason: "invalid_value",
      field: "cursor",
    });
  }
}

async function selectedItemsBasis(refs: readonly ZoteroHostItemRefInput[]) {
  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({ schema: "zotero.selection.v1", refs }),
    ),
  );
  if (!digest) throw canonicalReadFailure("item");
  return digest;
}

function legacyMutationOperationId(operation: string) {
  const crypto = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;
  return `${operation}:${
    crypto?.randomUUID?.() ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }`;
}
const INGEST_FIELD_LIMIT = 2000;
const NOTE_EXCERPT_DEFAULT = 800;
const NOTE_EXCERPT_MAX = 2000;
const LITERATURE_INGEST_OPERATION = "literature.ingest";
const SNAPSHOT_CAPTURE_PAGE_SIZE = 100;
const SNAPSHOT_ACTIVE_SESSION_LIMIT = 16;

type ZoteroHostSnapshotRuntimeConfiguration = {
  now: () => number;
  randomId: () => string;
  maxItems: number;
};

type ZoteroHostSnapshotCapturedItem = {
  ref: ZoteroHostItemRefInput;
  revision: string;
};

type ZoteroHostSnapshotSession = {
  processId: string;
  snapshotId: string;
  ownerId: string;
  libraryId: number;
  batchSize: number;
  createdAt: number;
  expiresAt: number;
  items: ZoteroHostSnapshotCapturedItem[];
  basisDigest: string;
  deliveredItems: number;
  deliveredBatches: number;
  expectedCursor: string | null;
  expectedOffset: number;
};

function defaultSnapshotRandomId() {
  const crypto = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
    Math.random().toString(36).slice(2),
  ].join("-");
}

function defaultSnapshotRuntime(): ZoteroHostSnapshotRuntimeConfiguration {
  return {
    now: () => Date.now(),
    randomId: defaultSnapshotRandomId,
    maxItems: ZOTERO_LIBRARY_SNAPSHOT_ITEM_LIMIT,
  };
}

let snapshotRuntime = defaultSnapshotRuntime();
let snapshotProcessId = snapshotRuntime.randomId();
const snapshotSessions = new Map<string, ZoteroHostSnapshotSession>();

export function configureZoteroHostSnapshotRuntimeForTests(
  configuration: Partial<ZoteroHostSnapshotRuntimeConfiguration>,
) {
  const defaults = defaultSnapshotRuntime();
  snapshotRuntime = {
    now: configuration.now || defaults.now,
    randomId: configuration.randomId || defaults.randomId,
    maxItems: Math.min(
      ZOTERO_LIBRARY_SNAPSHOT_ITEM_LIMIT,
      Math.max(1, Math.floor(configuration.maxItems || defaults.maxItems)),
    ),
  };
  snapshotSessions.clear();
  snapshotProcessId = snapshotRuntime.randomId();
}

export function resetZoteroHostSnapshotRuntimeForTests() {
  snapshotRuntime = defaultSnapshotRuntime();
  snapshotSessions.clear();
  snapshotProcessId = snapshotRuntime.randomId();
}

const DETAIL_FIELDS = [
  "title",
  "abstractNote",
  "date",
  "publicationTitle",
  "journalAbbreviation",
  "DOI",
  "url",
  "pages",
  "volume",
  "issue",
  "publisher",
  "place",
  "ISBN",
  "ISSN",
  "language",
  "shortTitle",
];

function resolveZotero() {
  const zotero =
    resolveRuntimeZotero() ||
    (typeof Zotero !== "undefined" ? Zotero : undefined);
  if (!zotero) {
    throw new Error("Zotero runtime is unavailable in host capability broker");
  }
  return zotero;
}

function trimText(value: unknown, limit = SUMMARY_TEXT_LIMIT) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function escapeAttribute(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parsePositiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function assertJsonValue(
  value: unknown,
  _path = "$",
): asserts value is JsonValue {
  assertWorkflowHostStrictJsonValue(value);
}

function strictJsonObject(value: object): JsonObject {
  assertWorkflowHostStrictJsonValue(value);
  return value as JsonObject;
}

function capabilityError<Code extends ZoteroHostCapabilityErrorCode>(
  code: Code,
  message: string,
  details: WorkflowHostErrorDetailsByCode[Code],
  retryable = false,
) {
  return new ZoteroHostCapabilityError(code, message, details, retryable);
}

function invalidRefError(
  kind: "item" | "note" | "collection",
  reason: WorkflowHostErrorDetailsByCode["invalid_ref"]["reason"],
  message: string,
) {
  return capabilityError("invalid_ref", message, { kind, reason });
}

function notFoundError(
  kind: "item" | "note" | "collection",
  ref?: ZoteroHostItemRefInput | ZoteroHostCollectionRefInput | null,
) {
  return capabilityError("not_found", `${kind} not found`, {
    kind,
    ...(ref?.key ? { opaqueKey: ref.key } : {}),
  });
}

function navigationUnavailableError(message: string) {
  return capabilityError("unavailable", message, { reason: "navigation" });
}

function parseBooleanInput(value: unknown) {
  if (value === true || value === false) {
    return value;
  }
  const normalized = trimText(value).toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return false;
}

function normalizeLibraryId(value: unknown) {
  const explicit = parsePositiveInteger(value);
  if (explicit) {
    return explicit;
  }
  return parsePositiveInteger(resolveZotero().Libraries?.userLibraryID) || 1;
}

function isRawZoteroItem(value: unknown): value is Zotero.Item {
  return !!(
    value &&
    typeof value === "object" &&
    ("getField" in value || "itemType" in value) &&
    ("id" in value || "key" in value)
  );
}

function readField(
  item: Zotero.Item,
  field: string,
  limit = SUMMARY_TEXT_LIMIT,
) {
  try {
    return trimText(item.getField?.(field), limit);
  } catch {
    return "";
  }
}

function getItemTitle(item: Zotero.Item) {
  return (
    readField(item, "title") ||
    trimText(
      (
        item as unknown as { getDisplayTitle?: () => unknown }
      ).getDisplayTitle?.(),
    )
  );
}

function getCreators(item: Zotero.Item) {
  const source = item as unknown as {
    getCreators?: () => Array<{
      firstName?: string;
      lastName?: string;
      name?: string;
      creatorType?: string;
    }>;
    firstCreator?: string;
  };
  try {
    const creators = source.getCreators?.() || [];
    const names = creators
      .map((creator) =>
        trimText(
          [creator.firstName, creator.lastName].filter(Boolean).join(" ") ||
            creator.name ||
            creator.lastName ||
            creator.firstName,
        ),
      )
      .filter(Boolean);
    if (names.length > 0) {
      return names.slice(0, 10);
    }
  } catch {
    // fall through to firstCreator
  }
  const firstCreator = trimText(source.firstCreator);
  return firstCreator ? [firstCreator] : [];
}

function getYear(date: string) {
  const match = date.match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/);
  return match?.[1] || "";
}

function getTags(item: Zotero.Item) {
  try {
    return (item.getTags?.() || [])
      .map((entry: { tag?: unknown }) => trimText(entry?.tag, TAG_TEXT_LIMIT))
      .filter(Boolean)
      .slice(0, TAG_LIMIT_MAX);
  } catch {
    return [];
  }
}

function getCollections(item: Zotero.Item) {
  try {
    const collections = (item.getCollections?.() || []) as unknown[];
    if (!Array.isArray(collections)) {
      return [];
    }
    const result: Array<number | string> = [];
    for (const entry of collections) {
      if (typeof entry === "number" && Number.isFinite(entry) && entry > 0) {
        result.push(Math.floor(entry));
      } else if (typeof entry === "string" && entry.trim()) {
        result.push(entry.trim());
      }
      if (result.length >= TARGET_LIMIT_MAX) break;
    }
    return result;
  } catch {
    return [];
  }
}

function getParentSummary(item: Zotero.Item) {
  const parentId = parsePositiveInteger(
    (item as unknown as { parentItemID?: unknown; parentID?: unknown })
      .parentItemID || (item as unknown as { parentID?: unknown }).parentID,
  );
  if (!parentId) {
    return undefined;
  }
  const parent = resolveZotero().Items.get(parentId);
  if (!parent) {
    return undefined;
  }
  return {
    id: parsePositiveInteger(parent.id),
    key: trimText(parent.key),
    title: getItemTitle(parent),
  };
}

export function serializeZoteroItemSummary(
  item: Zotero.Item,
): ZoteroHostItemSummaryDto {
  const date = readField(item, "date");
  let parentSummary: ReturnType<typeof getParentSummary> | undefined;
  try {
    parentSummary = getParentSummary(item);
  } catch {
    parentSummary = undefined;
  }
  return {
    id: parsePositiveInteger(item.id),
    key: trimText(item.key),
    libraryId: normalizeLibraryId(
      (item as unknown as { libraryID?: unknown }).libraryID,
    ),
    itemType: trimText(item.itemType),
    title: getItemTitle(item),
    creators: getCreators(item),
    year: getYear(date),
    date,
    publicationTitle: readField(item, "publicationTitle"),
    tags: getTags(item),
    collections: getCollections(item),
    ...(parentSummary
      ? {
          parent: {
            id: parentSummary.id,
            key: parentSummary.key,
          },
        }
      : {}),
  };
}

function serializeItemDetail(item: Zotero.Item): ZoteroHostItemDetailDto {
  const fields: Record<string, string | number | boolean> = {};
  for (const field of DETAIL_FIELDS) {
    const value = readField(item, field, FIELD_TEXT_LIMIT);
    if (value) {
      fields[field] = value;
    }
  }
  let noteCount = 0;
  let attachmentCount = 0;
  try {
    noteCount = (item.getNotes?.() || []).length;
  } catch {
    noteCount = 0;
  }
  try {
    attachmentCount = (item.getAttachments?.() || []).length;
  } catch {
    attachmentCount = 0;
  }
  const detail = {
    ...serializeZoteroItemSummary(item),
    fields,
    noteCount,
    attachmentCount,
    relatedItemKeys: Array.isArray(
      (item as unknown as { relatedItems?: unknown }).relatedItems,
    )
      ? ((item as unknown as { relatedItems: string[] }).relatedItems || [])
          .map((entry) => trimText(entry))
          .filter(Boolean)
      : [],
  };
  return {
    ...detail,
    revision: hashSynthesisContractCanonicalJson(detail),
  };
}

function canonicalReadFailure(
  kind: "item" | "note" | "attachment" | "annotation" | "collection",
) {
  return capabilityError(
    "execution_failed",
    `${kind} read is incomplete`,
    {
      phase: "read",
      recovery: "retry_same_operation",
    },
    true,
  );
}

function canonicalItemRef(item: Zotero.Item): ZoteroHostItemRefInput;
function canonicalItemRef(ref: ZoteroHostItemRefInput): ZoteroHostItemRefInput;
function canonicalItemRef(
  value: Zotero.Item | ZoteroHostItemRefInput,
): ZoteroHostItemRefInput {
  if (isRawZoteroItem(value)) {
    const ref = {
      libraryId: parsePositiveInteger((value as any).libraryID),
      key: String((value as any).key || "").trim(),
    };
    assertPortableRef(ref, "item");
    return ref;
  }
  const ref = value as ZoteroHostItemRefInput;
  const libraryId = parsePositiveInteger(ref?.libraryId);
  const key = trimText(ref?.key, 64);
  if (!libraryId || !key) {
    throw capabilityError("invalid_ref", "item ref is invalid", {
      kind: "item",
      reason: !libraryId ? "invalid_library_id" : "invalid_key",
    });
  }
  return { libraryId, key };
}

function isRawZoteroCollection(value: unknown): value is Zotero.Collection {
  return !!(
    value &&
    typeof value === "object" &&
    ("libraryID" in value ||
      typeof (value as { getChildItems?: unknown }).getChildItems ===
        "function")
  );
}

function canonicalCollectionRef(
  collection: Zotero.Collection,
): ZoteroHostCollectionRefInput;
function canonicalCollectionRef(
  ref: ZoteroHostCollectionRefInput,
): ZoteroHostCollectionRefInput;
function canonicalCollectionRef(
  value: Zotero.Collection | ZoteroHostCollectionRefInput,
): ZoteroHostCollectionRefInput {
  if (isRawZoteroCollection(value)) {
    const ref = {
      libraryId: parsePositiveInteger((value as any).libraryID),
      key: String((value as any).key || "").trim(),
    };
    assertPortableRef(ref, "collection");
    return ref;
  }
  const ref = value as ZoteroHostCollectionRefInput;
  const libraryId = parsePositiveInteger(ref?.libraryId);
  const key = trimText(ref?.key, 64);
  if (!libraryId || !key) {
    throw capabilityError("invalid_ref", "collection ref is invalid", {
      kind: "collection",
      reason: !libraryId ? "invalid_library_id" : "invalid_key",
    });
  }
  return { libraryId, key };
}

function canonicalRevision(item: Zotero.Item) {
  let jsonVersion: unknown;
  try {
    jsonVersion = (item as any).toJSON?.()?.version;
  } catch {
    throw canonicalReadFailure("item");
  }
  const value =
    (item as any).version ?? (item as any).dateModified ?? jsonVersion;
  if (value === undefined || value === null || String(value).trim() === "") {
    throw canonicalReadFailure("item");
  }
  return String(value);
}

function canonicalField(
  item: Zotero.Item,
  field: string,
  limit = FIELD_TEXT_LIMIT,
) {
  let raw: unknown;
  try {
    if (typeof item.getField !== "function")
      throw new Error("missing getField");
    raw = item.getField(field);
  } catch {
    throw canonicalReadFailure("item");
  }
  const value = String(raw ?? "").trim();
  if (value.length > limit) {
    throw capabilityError("resource_limited", "item field exceeds the limit", {
      resource: "characters",
      limit,
      observed: value.length,
    });
  }
  return value;
}

function canonicalTitle(item: Zotero.Item) {
  const title = canonicalField(item, "title");
  if (title) return title;
  try {
    const displayTitle = String((item as any).getDisplayTitle?.() ?? "").trim();
    if (displayTitle.length > FIELD_TEXT_LIMIT) {
      throw capabilityError(
        "resource_limited",
        "item title exceeds the limit",
        {
          resource: "characters",
          limit: FIELD_TEXT_LIMIT,
          observed: displayTitle.length,
        },
      );
    }
    return displayTitle;
  } catch (error) {
    if (error instanceof ZoteroHostCapabilityError) throw error;
    throw canonicalReadFailure("item");
  }
}

function canonicalItemState(item: Zotero.Item): "active" | "trashed" {
  const trashed =
    typeof (item as any).isDeleted === "function"
      ? (item as any).isDeleted() === true
      : (item as any).deleted === true;
  return trashed ? "trashed" : "active";
}

function canonicalParentRef(item: Zotero.Item): ZoteroHostItemRefInput | null {
  const parentId = parsePositiveInteger(
    (item as any).parentItemID ?? (item as any).parentID,
  );
  if (!parentId) return null;
  const parent = resolveZotero().Items.get(parentId);
  if (!parent) throw canonicalReadFailure("item");
  return canonicalItemRef(parent);
}

function compareCanonicalTextCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalTags(item: Zotero.Item) {
  let raw: unknown;
  try {
    raw = item.getTags?.();
  } catch {
    throw canonicalReadFailure("item");
  }
  if (!Array.isArray(raw)) throw canonicalReadFailure("item");
  if (raw.length > TAG_LIMIT_MAX) {
    throw capabilityError("resource_limited", "item tags exceed the limit", {
      resource: "entries",
      limit: TAG_LIMIT_MAX,
      observed: raw.length,
    });
  }
  return raw.map((entry) => {
    const value = String((entry as any)?.tag ?? "").trim();
    if (!value || value.length > TAG_TEXT_LIMIT) {
      throw capabilityError("resource_limited", "item tag exceeds the limit", {
        resource: "characters",
        limit: TAG_TEXT_LIMIT,
        observed: value.length,
      });
    }
    return value;
  });
}

function failClosedMutationTags(
  item: Zotero.Item,
  ref: ZoteroHostItemRefInput,
): string[] {
  try {
    return canonicalTags(item);
  } catch (error) {
    if (
      error instanceof ZoteroHostCapabilityError &&
      error.code === "resource_limited"
    ) {
      throw new MutationAuthorityExecutionError(
        "failed",
        "resource_limited",
        "read",
        "none",
        error.details as WorkflowHostErrorDetailsByCode["resource_limited"],
        error.message,
        [{ kind: "item", ref }],
      );
    }
    throw new MutationAuthorityExecutionError(
      "failed",
      "execution_failed",
      "read",
      "retry_same_operation",
      { phase: "read", recovery: "retry_same_operation" },
      "current item tags could not be read completely",
      [{ kind: "item", ref }],
    );
  }
}

function canonicalCreatorsFromRaw(raw: unknown): CreatorDto[] {
  if (!Array.isArray(raw)) throw canonicalReadFailure("item");
  if (raw.length > 100) {
    throw capabilityError(
      "resource_limited",
      "item creators exceed the limit",
      {
        resource: "entries",
        limit: 100,
        observed: raw.length,
      },
    );
  }
  return raw.map((creator: any) => {
    const creatorType = String(creator?.creatorType || "").trim();
    if (!creatorType) throw canonicalReadFailure("item");
    if (creator?.representation === "single_field") {
      const name = String(creator?.name || "").trim();
      if (!name) throw canonicalReadFailure("item");
      return { representation: "single_field", creatorType, name };
    }
    if (creator?.representation === "two_field") {
      const firstName = String(creator?.firstName || "").trim();
      const lastName = String(creator?.lastName || "").trim();
      if (!firstName && !lastName) throw canonicalReadFailure("item");
      return {
        representation: "two_field",
        creatorType,
        firstName,
        lastName,
      };
    }
    const name = String(creator?.name || "").trim();
    if (name) {
      return { representation: "single_field", creatorType, name };
    }
    const firstName = String(creator?.firstName || "").trim();
    const lastName = String(creator?.lastName || "").trim();
    if (!firstName && !lastName) throw canonicalReadFailure("item");
    return {
      representation: "two_field",
      creatorType,
      firstName,
      lastName,
    };
  });
}

function canonicalCreators(item: Zotero.Item): CreatorDto[] {
  let raw: unknown;
  try {
    raw = item.getCreatorsJSON();
  } catch {
    throw canonicalReadFailure("item");
  }
  return canonicalCreatorsFromRaw(raw);
}

function canonicalCollectionRefs(item: Zotero.Item) {
  let raw: unknown;
  try {
    raw = item.getCollections?.();
  } catch {
    throw canonicalReadFailure("item");
  }
  if (!Array.isArray(raw)) throw canonicalReadFailure("item");
  if (raw.length > 10_000) {
    throw capabilityError(
      "resource_limited",
      "item collections exceed the limit",
      {
        resource: "entries",
        limit: 10_000,
        observed: raw.length,
      },
    );
  }
  return raw.map((value) => {
    const collection =
      typeof value === "number" || /^\d+$/u.test(String(value))
        ? resolveZotero().Collections?.get?.(Number(value))
        : resolveZotero().Collections?.getByLibraryAndKey?.(
            canonicalItemRef(item).libraryId,
            String(value),
          );
    if (!collection) throw canonicalReadFailure("collection");
    return canonicalCollectionRef(collection);
  });
}

function canonicalItemKind(item: Zotero.Item): ItemSummaryDto["kind"] {
  if (item.isNote?.()) return "note";
  if (item.isAttachment?.()) return "attachment";
  if (
    (item as any).isAnnotation?.() ||
    String(item.itemType) === "annotation"
  ) {
    return "annotation";
  }
  if (item.isRegularItem?.() !== false) return "regular";
  throw capabilityError(
    "unsupported_operation",
    "unsupported Zotero item kind",
    {
      memberOrOperation: "library.getItemDetail",
    },
  );
}

function canonicalBase(item: Zotero.Item) {
  const itemType = String(item.itemType || "").trim();
  if (!itemType) throw canonicalReadFailure("item");
  return {
    ref: canonicalItemRef(item),
    itemType,
    title: canonicalTitle(item),
    parentRef: canonicalParentRef(item),
    state: canonicalItemState(item),
    revision: canonicalRevision(item),
    tags: canonicalTags(item),
    collectionRefs: canonicalCollectionRefs(item),
  };
}

function canonicalNoteText(item: Zotero.Item) {
  let html: unknown;
  try {
    html = (item as any).getNote?.();
  } catch {
    throw canonicalReadFailure("note");
  }
  if (typeof html !== "string" || html.length > NOTE_HTML_INPUT_LIMIT) {
    throw capabilityError(
      "resource_limited",
      "note content exceeds the limit",
      {
        resource: "characters",
        limit: NOTE_HTML_INPUT_LIMIT,
        observed: typeof html === "string" ? html.length : 0,
      },
    );
  }
  const text = html
    .replace(/<style[\s\S]*?<\/style>/giu, " ")
    .replace(/<script[\s\S]*?<\/script>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return { html, text };
}

function canonicalRegularSummary(item: Zotero.Item): RegularItemSummaryDto {
  const base = canonicalBase(item);
  const date = canonicalField(item, "date");
  return {
    ...base,
    kind: "regular",
    creators: canonicalCreators(item),
    date,
    year: getYear(date) || null,
    publicationTitle: canonicalField(item, "publicationTitle"),
  };
}

function canonicalNoteSummary(item: Zotero.Item): NoteItemSummaryDto {
  const base = canonicalBase(item);
  const { html, text } = canonicalNoteText(item);
  return {
    ...base,
    kind: "note",
    textExcerpt: text.slice(0, NOTE_EXCERPT_DEFAULT),
    textLength: text.length,
    htmlLength: html.length,
  };
}

function canonicalAttachmentLinkMode(
  item: Zotero.Item,
): AttachmentItemSummaryDto["linkMode"] {
  let value: number;
  try {
    value = Number(
      (item as any).attachmentLinkMode ??
        (item as any).getAttachmentLinkMode?.(),
    );
  } catch {
    throw canonicalReadFailure("attachment");
  }
  if (value === 0) return "stored_file";
  if (value === 1) return "stored_url";
  if (value === 2) return "linked_file";
  if (value === 3) return "linked_url";
  if (value === 4) return "embedded_image";
  throw canonicalReadFailure("attachment");
}

async function canonicalAttachmentSummary(
  item: Zotero.Item,
  pathOverride?: string,
): Promise<AttachmentItemSummaryDto> {
  const base = canonicalBase(item);
  const linkMode = canonicalAttachmentLinkMode(item);
  let path = pathOverride || "";
  if (
    pathOverride === undefined &&
    linkMode !== "linked_url" &&
    linkMode !== "stored_url"
  ) {
    try {
      path = String((await (item as any).getFilePathAsync?.()) || "").trim();
    } catch {
      throw canonicalReadFailure("attachment");
    }
  }
  return {
    ...base,
    kind: "attachment",
    filename:
      String((item as any).attachmentFilename || "").trim() ||
      path.split(/[\\/]/u).filter(Boolean).at(-1) ||
      null,
    contentType:
      String((item as any).attachmentContentType || "").trim() ||
      canonicalField(item, "contentType") ||
      null,
    linkMode,
    fileState:
      linkMode === "linked_url" || linkMode === "stored_url"
        ? "not_applicable"
        : path
          ? "available"
          : "missing",
  };
}

function canonicalAnnotationSummary(
  item: Zotero.Item,
): AnnotationItemSummaryDto {
  const base = canonicalBase(item);
  return {
    ...base,
    kind: "annotation",
    annotationType:
      canonicalAnnotationTextField(item, "annotationType", FIELD_TEXT_LIMIT) ||
      "annotation",
    pageLabel:
      canonicalAnnotationTextField(
        item,
        "annotationPageLabel",
        FIELD_TEXT_LIMIT,
      ) || null,
    textExcerpt: canonicalAnnotationTextField(
      item,
      "annotationText",
      NOTE_HTML_INPUT_LIMIT,
    ).slice(0, NOTE_EXCERPT_DEFAULT),
  };
}

async function serializeCanonicalItemSummary(
  item: Zotero.Item,
): Promise<ItemSummaryDto> {
  switch (canonicalItemKind(item)) {
    case "regular":
      return canonicalRegularSummary(item);
    case "note":
      return canonicalNoteSummary(item);
    case "attachment":
      return canonicalAttachmentSummary(item);
    case "annotation":
      return canonicalAnnotationSummary(item);
  }
}

function canonicalTimestamp(
  item: Zotero.Item,
  field: "dateAdded" | "dateModified",
) {
  const value = String(
    (item as any)[field] ?? item.getField?.(field) ?? "",
  ).trim();
  if (!value) throw canonicalReadFailure("item");
  return value;
}

function canonicalRegularFields(item: Zotero.Item) {
  let json: unknown;
  try {
    json = (item as any).toJSON?.();
  } catch {
    throw canonicalReadFailure("item");
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw canonicalReadFailure("item");
  }
  const zotero = resolveZotero();
  const itemTypeId =
    parsePositiveInteger((item as any).itemTypeID) ||
    parsePositiveInteger(zotero.ItemTypes?.getID?.(item.itemType));
  if (!itemTypeId || typeof zotero.ItemFields?.getID !== "function") {
    throw canonicalReadFailure("item");
  }
  const fieldNames = Object.keys(json).filter((field) => {
    const fieldId = parsePositiveInteger(zotero.ItemFields.getID(field));
    return fieldId && isValidFieldForItemType(fieldId, itemTypeId);
  });
  const fields: Record<string, string> = {};
  for (const field of fieldNames) {
    const value = canonicalField(item, field);
    if (value) fields[field] = value;
  }
  return fields;
}

async function canonicalRegularDetail(
  item: Zotero.Item,
): Promise<RegularItemDetailDto> {
  const summary = canonicalRegularSummary(item);
  const fields = canonicalRegularFields(item);
  let related: unknown;
  try {
    related = (item as any).relatedItems || [];
  } catch {
    throw canonicalReadFailure("item");
  }
  if (!Array.isArray(related)) {
    throw canonicalReadFailure("item");
  }
  const relatedRefs = related.map((key) => {
    const target = resolveZotero().Items.getByLibraryAndKey(
      summary.ref.libraryId,
      String(key),
    );
    if (!target) throw canonicalReadFailure("item");
    return canonicalItemRef(target);
  });
  let childCounts: RegularItemDetailDto["childCounts"];
  try {
    const libraryId = summary.ref.libraryId;
    const parentItemId = parsePositiveInteger((item as any).id);
    const notes = await queryZoteroChildItemPage({
      domain: "notes",
      libraryId,
      parentItemId,
      limit: 1,
    });
    const attachments = await queryZoteroChildItemPage({
      domain: "attachments",
      libraryId,
      parentItemId,
      limit: 1,
    });
    const annotations = await queryZoteroAnnotationPage({
      libraryId,
      parentItemId,
      parentKind: "regular",
      limit: 1,
    });
    childCounts = {
      notes: notes.total,
      attachments: attachments.total,
      annotations: annotations.total,
    };
  } catch (error) {
    if (error instanceof ZoteroHostCapabilityError) throw error;
    throw canonicalReadFailure("item");
  }
  return {
    ...summary,
    fields,
    relatedRefs,
    childCounts,
    createdAt: canonicalTimestamp(item, "dateAdded"),
    modifiedAt: canonicalTimestamp(item, "dateModified"),
  };
}

function canonicalNoteSummaryDto(item: Zotero.Item): NoteSummaryDto {
  const summary = canonicalNoteSummary(item);
  return {
    ref: summary.ref,
    parentRef: summary.parentRef,
    title: summary.title,
    textExcerpt: summary.textExcerpt,
    textLength: summary.textLength,
    htmlLength: summary.htmlLength,
    revision: summary.revision,
  };
}

async function canonicalAttachmentRole(
  item: Zotero.Item,
): Promise<AttachmentDetailDto["role"]> {
  let role: AttachmentDetailDto["role"] =
    canonicalAttachmentLinkMode(item) === "embedded_image"
      ? "note_image"
      : "ordinary";
  const parentRef = canonicalParentRef(item);
  if (parentRef) {
    const parent = resolveItem(parentRef);
    if (parent?.isNote?.()) {
      let html = "";
      try {
        html = String((parent as any).getNote?.() || "");
      } catch {
        throw canonicalReadFailure("note");
      }
      const attachmentKey = trimText(item.key);
      const hasPayloadAnchor = Array.from(
        html.matchAll(/<img\b[^>]*>/giu),
      ).some((match) => {
        const tag = match[0];
        if (!/\bdata-zs-payload-anchor\s*=/iu.test(tag)) return false;
        const key = tag.match(
          /\bdata-attachment-key\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/iu,
        );
        return trimText(key?.[1] || key?.[2] || key?.[3]) === attachmentKey;
      });
      if (hasPayloadAnchor) {
        role = "note_payload";
      }
    }
  }
  return role;
}

async function canonicalAttachmentDetail(
  item: Zotero.Item,
  pathOverride?: string,
): Promise<AttachmentDetailDto> {
  const summary = await canonicalAttachmentSummary(item, pathOverride);
  let path = pathOverride || "";
  if (pathOverride === undefined && summary.fileState !== "not_applicable") {
    try {
      path = String((await (item as any).getFilePathAsync?.()) || "").trim();
    } catch {
      throw canonicalReadFailure("attachment");
    }
  }
  const role = await canonicalAttachmentRole(item);
  return {
    ref: summary.ref,
    parentRef: summary.parentRef,
    revision: summary.revision,
    title: summary.title,
    filename: summary.filename,
    contentType: summary.contentType,
    charset: canonicalField(item, "charset") || null,
    url: canonicalField(item, "url") || null,
    linkMode: summary.linkMode,
    role,
    createdAt: canonicalTimestamp(item, "dateAdded"),
    file:
      summary.fileState === "available"
        ? {
            state: "available",
            path,
            sizeBytes: Math.max(0, Number((item as any).fileSize) || 0),
            modifiedAt: null,
          }
        : summary.fileState === "missing"
          ? { state: "missing" }
          : { state: "not_applicable" },
  };
}

async function readAttachmentPathOutsideHostSlice(
  item: Zotero.Item,
  linkMode: AttachmentItemSummaryDto["linkMode"],
) {
  if (linkMode === "linked_url" || linkMode === "stored_url") return "";
  try {
    return String((await (item as any).getFilePathAsync?.()) || "").trim();
  } catch {
    throw canonicalReadFailure("attachment");
  }
}

function annotationField(item: Zotero.Item, name: string) {
  try {
    return (item as any)[name] ?? item.getField?.(name) ?? "";
  } catch {
    throw canonicalReadFailure("annotation");
  }
}

function canonicalAnnotationTextField(
  item: Zotero.Item,
  name: string,
  limit: number,
) {
  const value = String(annotationField(item, name) ?? "").trim();
  if (value.length > limit) {
    throw capabilityError(
      "resource_limited",
      "annotation field exceeds the limit",
      {
        resource: "characters",
        limit,
        observed: value.length,
      },
    );
  }
  return value;
}

function canonicalAnnotationDetail(item: Zotero.Item): AnnotationDetailDto {
  const ref = canonicalItemRef(item);
  const attachmentRef = canonicalParentRef(item);
  if (!attachmentRef) throw canonicalReadFailure("annotation");
  const attachment = requireItem(attachmentRef, "attachment");
  if (!attachment.isAttachment?.()) throw canonicalReadFailure("attachment");
  const itemRef = canonicalParentRef(attachment) || attachmentRef;
  const rawPosition = annotationField(item, "annotationPosition");
  let position: JsonObject | null = null;
  if (rawPosition) {
    try {
      if (
        typeof rawPosition === "string" &&
        rawPosition.length > NOTE_HTML_INPUT_LIMIT
      ) {
        throw capabilityError(
          "resource_limited",
          "annotation position exceeds the limit",
          {
            resource: "characters",
            limit: NOTE_HTML_INPUT_LIMIT,
            observed: rawPosition.length,
          },
        );
      }
      const parsed =
        typeof rawPosition === "string" ? JSON.parse(rawPosition) : rawPosition;
      assertJsonValue(parsed, "annotation position");
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        throw new Error("invalid annotation position");
      }
      position = parsed as JsonObject;
    } catch (error) {
      if (error instanceof ZoteroHostCapabilityError) throw error;
      throw canonicalReadFailure("annotation");
    }
  }
  const rawPageIndex = canonicalAnnotationTextField(
    item,
    "annotationPageIndex",
    32,
  );
  const pageIndexValue = rawPageIndex ? Number(rawPageIndex) : null;
  if (
    pageIndexValue !== null &&
    (!Number.isSafeInteger(pageIndexValue) || pageIndexValue < 0)
  ) {
    throw canonicalReadFailure("annotation");
  }
  return {
    ref,
    itemRef,
    attachmentRef,
    revision: canonicalRevision(item),
    annotationType:
      canonicalAnnotationTextField(item, "annotationType", FIELD_TEXT_LIMIT) ||
      "annotation",
    text: canonicalAnnotationTextField(
      item,
      "annotationText",
      NOTE_HTML_INPUT_LIMIT,
    ),
    comment: canonicalAnnotationTextField(
      item,
      "annotationComment",
      NOTE_HTML_INPUT_LIMIT,
    ),
    color:
      canonicalAnnotationTextField(item, "annotationColor", FIELD_TEXT_LIMIT) ||
      null,
    location: {
      pageIndex: pageIndexValue,
      pageLabel:
        canonicalAnnotationTextField(
          item,
          "annotationPageLabel",
          FIELD_TEXT_LIMIT,
        ) || null,
      sortIndex: canonicalAnnotationTextField(
        item,
        "annotationSortIndex",
        FIELD_TEXT_LIMIT,
      ),
      position,
    },
    tags: canonicalTags(item),
    createdAt: canonicalTimestamp(item, "dateAdded"),
    modifiedAt: canonicalTimestamp(item, "dateModified"),
  };
}

async function serializeCanonicalItemDetail(
  item: Zotero.Item,
  attachmentPath?: string,
): Promise<ItemDetailDto> {
  switch (canonicalItemKind(item)) {
    case "regular":
      return {
        kind: "regular",
        item: await canonicalRegularDetail(item),
      };
    case "note":
      return { kind: "note", item: canonicalNoteSummaryDto(item) };
    case "attachment":
      return {
        kind: "attachment",
        item: await canonicalAttachmentDetail(item, attachmentPath),
      };
    case "annotation":
      return { kind: "annotation", item: canonicalAnnotationDetail(item) };
  }
}

type MetadataIdentifierType = MetadataLookupRequestDto["type"];

const METADATA_INPUT_CHARACTER_LIMIT = 2_048;
const METADATA_TRANSLATOR_LIMIT = 32;
const METADATA_TRANSLATOR_ID_LIMIT = 128;
const METADATA_TRANSLATOR_LABEL_LIMIT = 256;
const METADATA_CANDIDATE_LIMIT = 64;
const METADATA_RESPONSE_BYTE_LIMIT = 4 * 1024 * 1024;

function isbn13CheckDigit(value: string) {
  const sum = [...value].reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3),
    0,
  );
  return String((10 - (sum % 10)) % 10);
}

const METADATA_IDENTIFIER_NORMALIZERS: Record<
  MetadataIdentifierType,
  (value: string) => string
> = {
  DOI(value) {
    const normalized = value
      .trim()
      .replace(/^https?:\/\/(?:dx\.)?doi\.org\//iu, "")
      .replace(/^doi:\s*/iu, "")
      .toLowerCase();
    return /^10\.\d{4,9}\/\S+$/u.test(normalized) ? normalized : "";
  },
  ISBN(value) {
    const normalized = value
      .trim()
      .replace(/^https?:\/\/(?:openlibrary\.org|isbnsearch\.org)\/isbn\//iu, "")
      .replace(/^isbn(?:-1[03])?:\s*/iu, "")
      .replace(/[\s-]/gu, "")
      .toUpperCase();
    if (/^\d{13}$/u.test(normalized)) {
      return isbn13CheckDigit(normalized.slice(0, 12)) === normalized[12]
        ? normalized
        : "";
    }
    if (!/^\d{9}[\dX]$/u.test(normalized)) return "";
    const checksum = [...normalized].reduce(
      (total, digit, index) =>
        total + (digit === "X" ? 10 : Number(digit)) * (10 - index),
      0,
    );
    if (checksum % 11 !== 0) return "";
    const prefix = `978${normalized.slice(0, 9)}`;
    return `${prefix}${isbn13CheckDigit(prefix)}`;
  },
  arXiv(value) {
    const normalized = value
      .trim()
      .replace(/^arxiv:\s*/iu, "")
      .replace(/^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf)\//iu, "")
      .replace(/\.pdf(?:[?#].*)?$/iu, "")
      .replace(/[?#].*$/u, "")
      .replace(/v\d+$/iu, "")
      .toLowerCase();
    return /^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?\/\d{7})$/u.test(
      normalized,
    )
      ? normalized
      : "";
  },
  PMID(value) {
    const normalized = value
      .trim()
      .replace(/^pmid:\s*/iu, "")
      .replace(/^https?:\/\/(?:www\.)?pubmed\.ncbi\.nlm\.nih\.gov\//iu, "")
      .replace(/[/?#].*$/u, "");
    return /^\d{1,12}$/u.test(normalized) ? normalized : "";
  },
};

function normalizeMetadataRequest(value: unknown): {
  type: MetadataIdentifierType;
  normalizedIdentifier: string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw capabilityError("invalid_request", "metadata lookup is invalid", {
      reason: "invalid_type",
    });
  }
  const input = value as Record<string, unknown>;
  const keys = Object.keys(input);
  const extra = keys.find((key) => key !== "type" && key !== "value");
  if (extra || keys.length !== 2) {
    throw capabilityError("invalid_request", "metadata lookup is invalid", {
      reason: "invalid_schema",
      ...(extra ? { field: extra } : {}),
    });
  }
  if (
    input.type !== "DOI" &&
    input.type !== "ISBN" &&
    input.type !== "arXiv" &&
    input.type !== "PMID"
  ) {
    throw capabilityError("invalid_request", "metadata type is invalid", {
      reason: "unsupported_value",
      field: "type",
    });
  }
  if (typeof input.value !== "string" || !input.value.trim()) {
    throw capabilityError("invalid_request", "metadata value is invalid", {
      reason:
        typeof input.value === "string" ? "invalid_value" : "invalid_type",
      field: "value",
    });
  }
  if (input.value.length > METADATA_INPUT_CHARACTER_LIMIT) {
    throw capabilityError("invalid_request", "metadata value is too long", {
      reason: "invalid_value",
      field: "value",
    });
  }
  const normalizedIdentifier = METADATA_IDENTIFIER_NORMALIZERS[input.type](
    input.value,
  );
  if (!normalizedIdentifier) {
    throw capabilityError("invalid_request", "metadata value is invalid", {
      reason: input.type === "ISBN" ? "checksum_failed" : "invalid_format",
      field: "value",
    });
  }
  return { type: input.type, normalizedIdentifier };
}

function serializeMetadataTranslators(
  raw: unknown,
): MetadataTranslationEvidenceDto["translators"] {
  if (!Array.isArray(raw)) {
    throw capabilityError("execution_failed", "translator list is invalid", {
      phase: "adapter",
      recovery: "retry_same_operation",
    });
  }
  if (raw.length > METADATA_TRANSLATOR_LIMIT) {
    throw capabilityError("resource_limited", "translator limit exceeded", {
      resource: "translators",
      limit: METADATA_TRANSLATOR_LIMIT,
      observed: raw.length,
    });
  }
  return raw.map((value) => {
    const translator = value as Record<string, unknown>;
    const id = String(translator?.translatorID ?? "").trim();
    const label = String(translator?.label ?? "").trim();
    for (const [text, limit] of [
      [id, METADATA_TRANSLATOR_ID_LIMIT],
      [label, METADATA_TRANSLATOR_LABEL_LIMIT],
    ] as const) {
      if (text.length > limit) {
        throw capabilityError(
          "resource_limited",
          "translator text exceeds the limit",
          {
            resource: "characters",
            limit,
            observed: text.length,
          },
        );
      }
    }
    return { id, label };
  });
}

function readMetadataCandidateField(
  source: Record<string, unknown>,
  field: string,
) {
  let raw: unknown;
  try {
    const fields = source.fields as Record<string, unknown> | undefined;
    const data = source.data as Record<string, unknown> | undefined;
    raw =
      typeof (source as { getField?: unknown }).getField === "function"
        ? (source as { getField: (name: string) => unknown }).getField(field)
        : (fields?.[field] ?? data?.[field] ?? source[field]);
  } catch {
    throw canonicalReadFailure("item");
  }
  const text = String(raw ?? "").trim();
  if (text.length > FIELD_TEXT_LIMIT) {
    throw capabilityError("resource_limited", "item field exceeds the limit", {
      resource: "characters",
      limit: FIELD_TEXT_LIMIT,
      observed: text.length,
    });
  }
  return text;
}

function serializeMetadataItem(item: unknown): PortableRegularItemDto {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw canonicalReadFailure("item");
  }
  const source = item as Record<string, unknown>;
  const fields: Record<string, string> = {};
  for (const field of [...DETAIL_FIELDS, "archiveID", "PMID", "extra"]) {
    const text = readMetadataCandidateField(source, field);
    if (text) fields[field] = text;
  }
  let rawCreators: unknown = source.creators;
  try {
    if (
      typeof (source as { getCreators?: unknown }).getCreators === "function"
    ) {
      rawCreators = (source as { getCreators: () => unknown }).getCreators();
    }
  } catch {
    throw canonicalReadFailure("item");
  }
  const itemType = String(source.itemType ?? "journalArticle").trim();
  if (!itemType || itemType.length > FIELD_TEXT_LIMIT) {
    throw canonicalReadFailure("item");
  }
  return {
    schema: "zotero-agents.portable-regular-item.v1",
    itemType,
    fields,
    creators: canonicalCreatorsFromRaw(rawCreators ?? []),
    tags: [],
  };
}

function metadataCandidateMatches(
  type: MetadataIdentifierType,
  normalizedIdentifier: string,
  item: PortableRegularItemDto,
) {
  const field =
    type === "arXiv" ? "archiveID" : type === "PMID" ? "PMID" : type;
  return (
    METADATA_IDENTIFIER_NORMALIZERS[type](item.fields[field] ?? "") ===
    normalizedIdentifier
  );
}

function boundedMetadataResult(result: MetadataLookupResultDto) {
  const bytes = new TextEncoder().encode(JSON.stringify(result)).byteLength;
  if (bytes > METADATA_RESPONSE_BYTE_LIMIT) {
    throw capabilityError(
      "resource_limited",
      "metadata result exceeds the limit",
      {
        resource: "response_bytes",
        limit: METADATA_RESPONSE_BYTE_LIMIT,
        observed: bytes,
      },
    );
  }
  return result;
}

async function translateMetadataIdentifier(
  args: MetadataLookupRequestDto,
  control: WorkflowCallControl = {},
): Promise<MetadataLookupResultDto> {
  throwIfWorkflowCallCanceled(control);
  const { type, normalizedIdentifier } = normalizeMetadataRequest(args);
  const Translate = (resolveZotero() as any).Translate;
  if (!Translate?.Search) {
    throw capabilityError(
      "unavailable",
      "metadata translation is unavailable",
      {
        reason: "capability",
      },
    );
  }

  try {
    const translate = await withZoteroHostSlice(control, () => {
      const instance = new Translate.Search();
      if (type === "ISBN") {
        if (typeof instance.setSearch !== "function") {
          throw capabilityError(
            "unavailable",
            "metadata translation is unavailable",
            { reason: "capability" },
          );
        }
        instance.setSearch({ itemType: "book", ISBN: normalizedIdentifier });
      } else {
        if (typeof instance.setIdentifier !== "function") {
          throw capabilityError(
            "unavailable",
            "metadata translation is unavailable",
            { reason: "capability" },
          );
        }
        instance.setIdentifier({ [type]: normalizedIdentifier });
      }
      if (typeof instance.getTranslators !== "function") {
        throw capabilityError(
          "unavailable",
          "metadata translation is unavailable",
          { reason: "capability" },
        );
      }
      return instance;
    });
    const rawTranslators = await translate.getTranslators();
    throwIfWorkflowCallCanceled(control);
    const translators = serializeMetadataTranslators(rawTranslators);
    const emptyEvidence: MetadataTranslationEvidenceDto = {
      normalizedIdentifier,
      candidateCount: 0,
      matchingCandidateCount: 0,
      translators,
    };
    if (rawTranslators.length === 0) {
      return boundedMetadataResult({
        outcome: "not_found",
        reason: "no_translator",
        evidence: emptyEvidence,
      });
    }
    if (
      typeof translate.setTranslator !== "function" ||
      typeof translate.translate !== "function"
    ) {
      throw capabilityError(
        "unavailable",
        "metadata translation is unavailable",
        {
          reason: "capability",
        },
      );
    }
    await withZoteroHostSlice(control, () =>
      translate.setTranslator(rawTranslators),
    );
    const rawItems = await translate.translate({
      libraryID: false,
      saveAttachments: false,
    });
    throwIfWorkflowCallCanceled(control);
    if (!Array.isArray(rawItems)) {
      throw capabilityError(
        "execution_failed",
        "translator result is invalid",
        {
          phase: "adapter",
          recovery: "retry_same_operation",
        },
      );
    }
    if (rawItems.length > METADATA_CANDIDATE_LIMIT) {
      throw capabilityError("resource_limited", "candidate limit exceeded", {
        resource: "candidates",
        limit: METADATA_CANDIDATE_LIMIT,
        observed: rawItems.length,
      });
    }
    const candidates = await withZoteroHostSlice(control, () =>
      rawItems.map(serializeMetadataItem),
    );
    throwIfWorkflowCallCanceled(control);
    const matches = candidates.filter((item) =>
      metadataCandidateMatches(type, normalizedIdentifier, item),
    );
    const evidence: MetadataTranslationEvidenceDto = {
      normalizedIdentifier,
      candidateCount: candidates.length,
      matchingCandidateCount: matches.length,
      translators,
    };
    if (matches.length === 1) {
      return boundedMetadataResult({
        outcome: "matched",
        item: matches[0],
        evidence,
      });
    }
    if (matches.length > 1) {
      return boundedMetadataResult({
        outcome: "ambiguous",
        candidates: matches,
        evidence,
      });
    }
    return boundedMetadataResult({
      outcome: "not_found",
      reason: candidates.length === 0 ? "no_candidate" : "identifier_mismatch",
      evidence,
    });
  } catch (error) {
    if (error instanceof ZoteroHostCapabilityError) throw error;
    throw capabilityError(
      "execution_failed",
      "metadata translation failed",
      {
        phase: "adapter",
        recovery: "retry_same_operation",
      },
      true,
    );
  }
}

function countChildItems(
  item: Zotero.Item,
  getter: "getNotes" | "getAttachments",
) {
  try {
    return ((item[getter]?.() || []) as unknown[]).length;
  } catch {
    return 0;
  }
}

function serializeLibraryItemSummary(
  item: Zotero.Item,
): ZoteroHostLibraryItemSummaryDto {
  return {
    ...serializeZoteroItemSummary(item),
    noteCount: countChildItems(item, "getNotes"),
    attachmentCount: countChildItems(item, "getAttachments"),
  };
}

function serializeLibrarySyncSnapshotItem(
  item: Zotero.Item,
): ZoteroHostLibrarySyncSnapshotItemDto {
  const summary = canonicalRegularSummary(item);
  const noteIds = getChildItemIds(item, "getNotes");
  const attachmentIds = getChildItemIds(item, "getAttachments");
  let annotationCount = 0;
  for (const attachmentId of attachmentIds) {
    const attachment = resolveZotero().Items.get(attachmentId);
    if (!attachment) continue;
    try {
      annotationCount += (
        (
          attachment as Zotero.Item & {
            getAnnotations?: () => unknown[];
          }
        ).getAnnotations?.() || []
      ).length;
    } catch {
      // A failed child read changes the basis into a failed snapshot later.
      throw capabilityError(
        "execution_failed",
        "snapshot annotation count could not be read",
        { phase: "read", recovery: "refresh_and_retry_new_operation" },
      );
    }
  }
  const modifiedAt = trimText(
    (item as Zotero.Item & { dateModified?: unknown; dateAdded?: unknown })
      .dateModified ||
      (item as Zotero.Item & { dateAdded?: unknown }).dateAdded,
    FIELD_TEXT_LIMIT,
  );
  const base = {
    ref: summary.ref,
    kind: "regular" as const,
    itemType: summary.itemType,
    title: summary.title,
    parentRef: summary.parentRef,
    state: "active" as const,
    tags: summary.tags,
    collectionRefs: summary.collectionRefs,
    creators: summary.creators,
    date: summary.date,
    year: summary.year,
    publicationTitle: summary.publicationTitle,
    identifiers: {
      doi: readField(item, "DOI") || null,
      isbn: readField(item, "ISBN") || null,
      issn: readField(item, "ISSN") || null,
      arxiv: readField(item, "arXiv") || null,
      pmid: readField(item, "PMID") || null,
    },
    url: readField(item, "url") || null,
    noteCount: noteIds.length,
    attachmentCount: attachmentIds.length,
    annotationCount,
    modifiedAt,
  };
  return {
    ...base,
    revision: hashSynthesisContractCanonicalJson(base),
  };
}

function getChildItemIds(
  item: Zotero.Item,
  getter: "getNotes" | "getAttachments",
) {
  const values = item[getter]?.() || [];
  if (!Array.isArray(values)) {
    throw capabilityError(
      "execution_failed",
      "snapshot child list is invalid",
      {
        phase: "read",
        recovery: "refresh_and_retry_new_operation",
      },
    );
  }
  return values
    .map((value) => parsePositiveInteger(value))
    .filter((value) => value > 0);
}

function htmlToText(html: string) {
  return trimText(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
    NOTE_TEXT_LIMIT,
  );
}

function extractNoteHtml(item: Zotero.Item, warnings: string[]) {
  try {
    return trimText(
      (item as unknown as { getNote?: () => unknown }).getNote?.(),
      NOTE_HTML_INPUT_LIMIT,
    );
  } catch (error) {
    warnings.push(
      `Failed to read note HTML: ${error instanceof Error ? error.message : String(error)}`,
    );
    return "";
  }
}

function noteParentWithWarnings(item: Zotero.Item, warnings: string[]) {
  try {
    return getParentSummary(item);
  } catch (error) {
    warnings.push(
      `Failed to read note parent: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}

function serializeNote(item: Zotero.Item): ZoteroHostNoteDto {
  const warnings: string[] = [];
  const html = extractNoteHtml(item, warnings);
  const parent = noteParentWithWarnings(item, warnings);
  const text = htmlToText(html);
  return {
    id: parsePositiveInteger(item.id),
    key: trimText(item.key),
    libraryId: normalizeLibraryId(
      (item as unknown as { libraryID?: unknown }).libraryID,
    ),
    title: getItemTitle(item) || text.slice(0, 80),
    html,
    text,
    textExcerpt: trimText(text, NOTE_EXCERPT_DEFAULT),
    textLength: text.length,
    htmlLength: html.length,
    ...(parent ? { parent } : {}),
    ...(warnings.length ? { warnings } : {}),
  };
}

function getPayloadContent(block: ZoteroNotePayloadBlock) {
  if (block.errors?.length) {
    throw new Error(block.errors.join("; "));
  }
  if (block.format === "markdown") {
    return String(block.markdown || block.decodedText || "");
  }
  if (block.format === "json") {
    return JSON.stringify(block.payload, null, 2);
  }
  return String(block.decodedText || "");
}

async function serializeAttachment(
  item: Zotero.Item,
): Promise<ZoteroHostAttachmentDto> {
  const warnings: string[] = [];
  let path = "";
  try {
    path = trimText(
      await (
        item as unknown as { getFilePathAsync?: () => Promise<unknown> }
      ).getFilePathAsync?.(),
      FIELD_TEXT_LIMIT,
    );
  } catch (error) {
    warnings.push(
      `Failed to read attachment path: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const filename = path.split(/[\\/]/).filter(Boolean).pop() || "";
  let parent: ReturnType<typeof getParentSummary> | undefined;
  try {
    parent = getParentSummary(item);
  } catch (error) {
    warnings.push(
      `Failed to read attachment parent: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return {
    id: parsePositiveInteger(item.id),
    key: trimText(item.key),
    libraryId: normalizeLibraryId(
      (item as unknown as { libraryID?: unknown }).libraryID,
    ),
    title: getItemTitle(item),
    contentType: readField(item, "contentType"),
    path,
    filename,
    parent,
    warnings: warnings.length ? warnings : undefined,
  };
}

function childError(code: string, error: unknown): ZoteroHostMutationError {
  return {
    code,
    message: error instanceof Error ? error.message : String(error || code),
  };
}

function serializeCollection(
  collection: Zotero.Collection,
): ZoteroHostCollectionDto {
  const parentId = parsePositiveInteger(
    (
      collection as unknown as {
        parentID?: unknown;
        parentCollectionID?: unknown;
      }
    ).parentID ||
      (collection as unknown as { parentCollectionID?: unknown })
        .parentCollectionID,
  );
  const parent = parentId ? resolveZotero().Collections?.get?.(parentId) : null;
  const rawId = (collection as unknown as { id?: unknown }).id;
  const numericId = parsePositiveInteger(rawId);
  const stringId = typeof rawId === "string" ? rawId.trim() : "";
  return {
    id: numericId || stringId,
    key: trimText((collection as unknown as { key?: unknown }).key),
    name: trimText((collection as unknown as { name?: unknown }).name),
    libraryId: normalizeLibraryId(
      (collection as unknown as { libraryID?: unknown }).libraryID,
    ),
    ...(parentId ? { parentId } : {}),
    ...(parent
      ? { parentKey: trimText((parent as unknown as { key?: unknown }).key) }
      : {}),
  };
}

function serializeAnnotation(
  annotation: unknown,
  parent?: Zotero.Item | null,
): ZoteroHostAnnotationDto {
  const source = annotation as Record<string, unknown> & {
    getField?: (field: string) => unknown;
  };
  const readAnnotationField = (field: string) =>
    trimText(source[field] ?? source.getField?.(field), NOTE_EXCERPT_MAX);
  return {
    id: parsePositiveInteger(source.id),
    key: trimText(source.key),
    libraryId: normalizeLibraryId(source.libraryID),
    parentItemId:
      parsePositiveInteger(source.parentItemID ?? source.parentID) ||
      parsePositiveInteger(parent?.id),
    parentItemKey: trimText(parent?.key),
    type:
      readAnnotationField("annotationType") ||
      readAnnotationField("type") ||
      "annotation",
    text:
      readAnnotationField("annotationText") ||
      readAnnotationField("text") ||
      readAnnotationField("quote"),
    comment:
      readAnnotationField("annotationComment") ||
      readAnnotationField("comment") ||
      "",
    color:
      readAnnotationField("annotationColor") || readAnnotationField("color"),
    pageLabel:
      readAnnotationField("annotationPageLabel") ||
      readAnnotationField("pageLabel"),
    sortIndex:
      readAnnotationField("annotationSortIndex") ||
      readAnnotationField("sortIndex"),
  };
}

export async function getAllRegularZoteroItems(libraryId?: number | string) {
  const zotero = resolveZotero();
  const resolvedLibraryId = normalizeLibraryId(libraryId);
  if (typeof (zotero.Items as any).getAll !== "function") {
    throw new Error("Zotero.Items.getAll(libraryId) is not available");
  }
  try {
    const loaded = await (zotero.Items as any).getAll(resolvedLibraryId);
    if (!Array.isArray(loaded)) {
      throw new Error("Zotero.Items.getAll(libraryId) did not return an array");
    }
    return loaded.filter(isRegularVisibleItem);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Zotero.Items.getAll(${resolvedLibraryId}) failed: ${message}`,
    );
  }
}

function isRegularVisibleItem(item: Zotero.Item) {
  const regular =
    typeof item.isRegularItem === "function"
      ? item.isRegularItem()
      : !item.isNote?.() && !item.isAttachment?.();
  const deleted =
    typeof (item as any).isDeleted === "function"
      ? (item as any).isDeleted()
      : Boolean((item as any).deleted);
  return regular && !deleted;
}

const ZOTERO_OBJECT_KEY_PATTERN = /^[A-Z0-9]{8}$/;

function assertPortableRef(
  ref: unknown,
  kind: "item" | "note" | "collection",
): asserts ref is ZoteroHostItemRefInput | ZoteroHostCollectionRefInput {
  if (
    !ref ||
    typeof ref !== "object" ||
    Array.isArray(ref) ||
    (Object.getPrototypeOf(ref) !== Object.prototype &&
      Object.getPrototypeOf(ref) !== null)
  ) {
    throw invalidRefError(
      kind,
      "invalid_shape",
      `${kind} ref must be portable`,
    );
  }
  const candidate = ref as Record<string, unknown>;
  const keys = Object.keys(candidate).sort();
  if (keys.length !== 2 || keys[0] !== "key" || keys[1] !== "libraryId") {
    throw invalidRefError(
      kind,
      "invalid_shape",
      `${kind} ref has an invalid shape`,
    );
  }
  if (
    typeof candidate.libraryId !== "number" ||
    !Number.isSafeInteger(candidate.libraryId) ||
    candidate.libraryId <= 0
  ) {
    throw invalidRefError(
      kind,
      "invalid_library_id",
      `${kind} ref has an invalid library id`,
    );
  }
  if (
    typeof candidate.key !== "string" ||
    !ZOTERO_OBJECT_KEY_PATTERN.test(candidate.key)
  ) {
    throw invalidRefError(
      kind,
      "invalid_key",
      `${kind} ref has an invalid key`,
    );
  }
}

function resolveItem(ref: ZoteroHostItemRefInput | undefined | null) {
  assertPortableRef(ref, "item");
  const zotero = resolveZotero();
  return zotero.Items.getByLibraryAndKey(ref.libraryId, ref.key) || null;
}

function requireItem(
  ref: ZoteroHostItemRefInput | undefined | null,
  label = "item",
) {
  const item = resolveItem(ref);
  if (!item) {
    throw notFoundError("item", ref);
  }
  return item;
}

function requireNote(ref: ZoteroHostItemRefInput | undefined | null) {
  assertPortableRef(ref, "note");
  const zotero = resolveZotero();
  const item = zotero.Items.getByLibraryAndKey(ref.libraryId, ref.key) || null;
  if (!item) {
    throw notFoundError("note", ref);
  }
  if (!item.isNote?.()) {
    throw invalidRefError("note", "wrong_kind", "ref does not identify a note");
  }
  return item;
}

function resolveCollection(
  ref: ZoteroHostCollectionRefInput | undefined | null,
) {
  assertPortableRef(ref, "collection");
  const zotero = resolveZotero();
  return (
    zotero.Collections?.getByLibraryAndKey?.(ref.libraryId, ref.key) || null
  );
}

function resolveCollectionFromListArgs(args: ZoteroHostLibraryListArgs) {
  if (args.collection !== undefined) {
    return resolveCollection(args.collection);
  }
  if (args.collectionId !== undefined) {
    return (
      resolveZotero().Collections?.get?.(
        parsePositiveInteger(args.collectionId),
      ) || null
    );
  }
  if (args.collectionKey !== undefined) {
    return resolveCollection({
      libraryId: normalizeLibraryId(args.collectionLibraryId),
      key: args.collectionKey,
    });
  }
  return null;
}

function requireCollectionForList(args: ZoteroHostLibraryListArgs) {
  const hasCollectionRef =
    args.collection !== undefined ||
    args.collectionId !== undefined ||
    args.collectionKey !== undefined;
  if (!hasCollectionRef) {
    return null;
  }
  const collection = resolveCollectionFromListArgs(args);
  if (!collection) {
    throw notFoundError("collection", args.collection);
  }
  return collection;
}

function resolveCollectionHandlerRef(ref: ZoteroHostCollectionRefInput) {
  const collection = resolveCollection(ref);
  return (
    parsePositiveInteger(
      (collection as unknown as { id?: unknown } | null)?.id,
    ) || ref.key
  );
}

function validateFieldPatch(item: Zotero.Item, fields: unknown) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    throw new Error("fields must be a non-empty object");
  }
  const patch = fields as Record<string, unknown>;
  const entries = Object.entries(patch);
  if (entries.length === 0) {
    throw new Error("fields must be a non-empty object");
  }
  const normalized: Record<string, string | number | boolean | null> = {};
  for (const [field, value] of entries) {
    const fieldName = trimText(field);
    if (!fieldName) {
      throw new Error("field name must be non-empty");
    }
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean" &&
      value !== null
    ) {
      throw new Error(`Invalid value for field: ${fieldName}`);
    }
    if (typeof value === "string" && value.length > FIELD_TEXT_LIMIT) {
      throw new Error(`Field value is too long: ${fieldName}`);
    }
    assertValidFieldForItem(item, fieldName);
    normalized[fieldName] = value;
  }
  return normalized;
}

function isValidFieldForItemType(fieldID: number, itemTypeID: number) {
  const zotero = resolveZotero();
  let isValid = zotero.ItemFields.isValidForType(fieldID, itemTypeID);
  if (!isValid) {
    const baseFieldID = zotero.ItemFields.getBaseIDFromTypeAndField(
      itemTypeID,
      fieldID,
    );
    if (baseFieldID) {
      const mappedFieldID = zotero.ItemFields.getFieldIDFromTypeAndBase(
        itemTypeID,
        baseFieldID,
      );
      isValid = Boolean(mappedFieldID);
    }
  }
  return isValid;
}

function itemTypeSupportsField(itemType: string, field: string) {
  const zotero = resolveZotero();
  const fieldID = zotero.ItemFields?.getID?.(field);
  const itemTypeID = zotero.ItemTypes?.getID?.(itemType);
  return Boolean(
    fieldID &&
    itemTypeID &&
    isValidFieldForItemType(Number(fieldID), Number(itemTypeID)),
  );
}

function assertValidFieldForItem(item: Zotero.Item, field: string) {
  const zotero = resolveZotero();
  if (!zotero.ItemFields?.getID) {
    return;
  }
  const fieldID = zotero.ItemFields.getID(field);
  if (!fieldID) {
    throw new Error(`Invalid field: ${field}`);
  }
  const itemTypeID =
    (item as unknown as { itemTypeID?: number }).itemTypeID ||
    zotero.ItemTypes?.getID?.(item.itemType);
  const isValid =
    Boolean(itemTypeID) &&
    isValidFieldForItemType(Number(fieldID), Number(itemTypeID));
  if (!isValid) {
    throw new Error(`Invalid field for item type: ${field}`);
  }
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("tags must be a non-empty array");
  }
  if (value.length > TAG_LIMIT_MAX) {
    throw new Error(`tags cannot exceed ${TAG_LIMIT_MAX} entries`);
  }
  const tags = value
    .map((entry) => trimText(entry, TAG_TEXT_LIMIT))
    .filter(Boolean);
  if (tags.length !== value.length || tags.length === 0) {
    throw new Error("tags must contain only non-empty strings");
  }
  return Array.from(new Set(tags));
}

function normalizeContent(value: unknown) {
  const content = String(value ?? "").trim();
  if (!content) {
    throw new Error("content must be non-empty");
  }
  if (content.length > NOTE_HTML_INPUT_LIMIT) {
    throw new Error(
      `content cannot exceed ${NOTE_HTML_INPUT_LIMIT} characters`,
    );
  }
  return content;
}

const NOTE_IMAGE_SLOT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function normalizeNoteContentInput(input: NoteContentInput) {
  if (!input || typeof input !== "object") {
    throw capabilityError("invalid_request", "note content is required", {
      reason: "invalid_type",
      field: "content",
    });
  }
  if (input.format !== "html" && input.format !== "text") {
    throw capabilityError("invalid_request", "note content format is invalid", {
      reason: "invalid_value",
      field: "content.format",
    });
  }
  let value: string;
  try {
    value = normalizeContent(input.value);
  } catch {
    throw capabilityError("invalid_request", "note content is invalid", {
      reason: "invalid_value",
      field: "content.value",
    });
  }
  const embeddedImages = Array.isArray(input.embeddedImages)
    ? input.embeddedImages
    : [];
  if (input.format === "text" && embeddedImages.length > 0) {
    throw capabilityError(
      "invalid_request",
      "text note content cannot contain embedded images",
      { reason: "invalid_combination", field: "content.embeddedImages" },
    );
  }
  const bindings = new Map<
    string,
    { preparedImage: PreparedNoteImageRef; altText?: string }
  >();
  for (const [index, entry] of embeddedImages.entries()) {
    const slot = String(entry?.slot || "").trim();
    if (!NOTE_IMAGE_SLOT_PATTERN.test(slot)) {
      throw capabilityError("invalid_request", "image slot is invalid", {
        reason: "invalid_format",
        field: `content.embeddedImages.${index}.slot`,
      });
    }
    if (bindings.has(slot)) {
      throw capabilityError("invalid_request", "image slot is duplicated", {
        reason: "duplicate_value",
        field: "content.embeddedImages.slot",
      });
    }
    bindings.set(slot, {
      preparedImage: entry.preparedImage,
      ...(entry.altText === undefined
        ? {}
        : { altText: trimText(entry.altText, 4096) }),
    });
  }
  const referencedSlots = [
    ...value.matchAll(
      /\sdata-zotero-agents-image-slot\s*=\s*(?:"([^"]+)"|'([^']+)')/gi,
    ),
  ].map((match) => String(match[1] || match[2] || "").trim());
  const referenceCounts = new Map<string, number>();
  for (const slot of referencedSlots) {
    referenceCounts.set(slot, (referenceCounts.get(slot) || 0) + 1);
  }
  for (const slot of new Set([...bindings.keys(), ...referenceCounts.keys()])) {
    if (!bindings.has(slot) || referenceCounts.get(slot) !== 1) {
      throw capabilityError(
        "invalid_request",
        "note image slots and bindings do not match",
        { reason: "invalid_combination", field: "content.embeddedImages" },
      );
    }
  }
  return { format: input.format, value, bindings };
}

function resolveNoteCreateRequest(request: NoteCreateRequestDto) {
  const requestKeys = Object.keys(request as object);
  const unexpectedRequestKey = requestKeys.find(
    (key) =>
      key !== "operationId" &&
      key !== "placement" &&
      key !== "content" &&
      key !== "initialTags",
  );
  if (unexpectedRequestKey) {
    throw capabilityError("invalid_request", "note create request is invalid", {
      reason: "invalid_schema",
      field: unexpectedRequestKey,
      operation: "notes.create",
    });
  }
  const placement = request.placement as unknown as Record<string, unknown>;
  if (!placement || typeof placement !== "object" || Array.isArray(placement)) {
    throw capabilityError("invalid_request", "note placement is invalid", {
      reason: "invalid_type",
      field: "placement",
      operation: "notes.create",
    });
  }
  const kind = placement.kind;
  const allowedPlacementKeys =
    kind === "top_level"
      ? new Set(["kind", "libraryId", "collectionRefs"])
      : kind === "child"
        ? new Set(["kind", "parentRef"])
        : null;
  const unexpectedPlacementKey = allowedPlacementKeys
    ? Object.keys(placement).find((key) => !allowedPlacementKeys.has(key))
    : undefined;
  if (!allowedPlacementKeys || unexpectedPlacementKey) {
    throw capabilityError("invalid_request", "note placement is invalid", {
      reason: "invalid_schema",
      field: unexpectedPlacementKey
        ? `placement.${unexpectedPlacementKey}`
        : "placement.kind",
      operation: "notes.create",
    });
  }

  let initialTags: string[] = [];
  if (request.initialTags !== undefined) {
    if (!Array.isArray(request.initialTags)) {
      throw capabilityError("invalid_request", "initialTags is invalid", {
        reason: "invalid_type",
        field: "initialTags",
        operation: "notes.create",
      });
    }
    if (request.initialTags.length > TAG_LIMIT_MAX) {
      throw capabilityError(
        "resource_limited",
        "initialTags exceeds the limit",
        {
          resource: "entries",
          limit: TAG_LIMIT_MAX,
          observed: request.initialTags.length,
        },
      );
    }
    initialTags = Array.from(
      new Set(
        request.initialTags.map((entry, index) => {
          if (typeof entry !== "string" || !entry.trim()) {
            throw capabilityError("invalid_request", "initialTags is invalid", {
              reason: "invalid_value",
              field: `initialTags.${index}`,
              operation: "notes.create",
            });
          }
          const tag = entry.trim();
          if (tag.length > TAG_TEXT_LIMIT) {
            throw capabilityError(
              "resource_limited",
              "initial tag exceeds the limit",
              {
                resource: "characters",
                limit: TAG_TEXT_LIMIT,
                observed: tag.length,
              },
            );
          }
          return tag;
        }),
      ),
    );
  }

  if (kind === "child") {
    const parentRef = canonicalItemRef(
      placement.parentRef as ZoteroHostItemRefInput,
    );
    const parent = requireItem(parentRef, "parent item");
    if (canonicalItemState(parent) !== "active") {
      throw capabilityError("invalid_ref", "parent item is not active", {
        kind: "item",
        reason: "wrong_kind",
      });
    }
    return {
      placement: { kind: "child" as const, parentRef },
      parent,
      libraryId: normalizeLibraryId(parent.libraryID),
      collections: [] as Zotero.Collection[],
      initialTags,
    };
  }

  if (
    placement.libraryId !== undefined &&
    (typeof placement.libraryId !== "number" ||
      !Number.isSafeInteger(placement.libraryId) ||
      placement.libraryId <= 0)
  ) {
    throw capabilityError("invalid_request", "note libraryId is invalid", {
      reason: "invalid_value",
      field: "placement.libraryId",
      operation: "notes.create",
    });
  }
  const libraryId =
    (placement.libraryId as number | undefined) ||
    normalizeLibraryId(undefined);
  if (
    placement.collectionRefs !== undefined &&
    !Array.isArray(placement.collectionRefs)
  ) {
    throw capabilityError("invalid_request", "collectionRefs is invalid", {
      reason: "invalid_type",
      field: "placement.collectionRefs",
      operation: "notes.create",
    });
  }
  const collectionRefs = Array.from(
    new Map(
      ((placement.collectionRefs as ZoteroHostCollectionRefInput[]) || []).map(
        (entry) => {
          const ref = canonicalCollectionRef(entry);
          return [`${ref.libraryId}\n${ref.key}`, ref] as const;
        },
      ),
    ).values(),
  );
  const collections = collectionRefs.map((ref) => {
    const collection = resolveCollection(ref);
    if (!collection) throw notFoundError("collection", ref);
    if (
      (collection as unknown as { deleted?: unknown }).deleted === true ||
      (collection as unknown as { isDeleted?: () => boolean }).isDeleted?.()
    ) {
      throw capabilityError("invalid_ref", "collection is not active", {
        kind: "collection",
        reason: "wrong_kind",
      });
    }
    if (normalizeLibraryId((collection as any).libraryID) !== libraryId) {
      throw capabilityError(
        "invalid_request",
        "note placement crosses libraries",
        {
          reason: "invalid_combination",
          operation: "notes.create",
        },
      );
    }
    return collection;
  });
  return {
    placement: {
      kind: "top_level" as const,
      libraryId,
      ...(collectionRefs.length ? { collectionRefs } : {}),
    },
    parent: null,
    libraryId,
    collections,
    initialTags,
  };
}

function bindNoteImageSlots(
  content: string,
  attachmentKeys: ReadonlyMap<string, string>,
) {
  return content.replace(
    /\sdata-zotero-agents-image-slot\s*=\s*(?:"([^"]+)"|'([^']+)')/gi,
    (_attribute, doubleQuoted: string, singleQuoted: string) => {
      const slot = String(doubleQuoted || singleQuoted || "").trim();
      const attachmentKey = attachmentKeys.get(slot);
      if (!attachmentKey) {
        throw capabilityError("invalid_request", "image slot is unbound", {
          reason: "invalid_combination",
          field: "content.embeddedImages",
        });
      }
      return ` data-attachment-key="${attachmentKey}" data-zotero-agents-managed-image="1"`;
    },
  );
}

function managedNoteImageKeys(content: string) {
  const keys = new Set<string>();
  for (const match of content.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\sdata-zotero-agents-managed-image\s*=\s*(?:"1"|'1')/i.test(tag)) {
      continue;
    }
    const key = tag.match(
      /\sdata-attachment-key\s*=\s*(?:"([^"]+)"|'([^']+)')/i,
    );
    const normalized = trimText(key?.[1] || key?.[2]);
    if (normalized) keys.add(normalized);
  }
  return keys;
}

function normalizeCollectionName(request: ZoteroHostMutationRequest) {
  const name = trimText(request.name || request.collectionName, 200);
  if (!name) {
    throw new Error("collection name is required");
  }
  return name;
}

function mutationLibraryId(request: ZoteroHostMutationRequest) {
  const parsed = parsePositiveInteger(request.libraryId ?? request.libraryID);
  return parsed || undefined;
}

function requireUploadedFileId(request: ZoteroHostMutationRequest) {
  const fileId = trimText(request.fileId, 200);
  if (!fileId) {
    throw new Error("fileId is required");
  }
  return fileId;
}

function annotationsFromItem(item: Zotero.Item): ZoteroHostAnnotationDto[] {
  const annotations: ZoteroHostAnnotationDto[] = [];
  const pushAnnotation = (entry: unknown, parent?: Zotero.Item | null) => {
    if (!entry) {
      return;
    }
    annotations.push(serializeAnnotation(entry, parent));
  };
  const source = item as unknown as {
    getAnnotations?: () => unknown[];
    getAttachments?: () => unknown[];
  };
  try {
    for (const entry of source.getAnnotations?.() || []) {
      if (typeof entry === "number") {
        pushAnnotation(resolveZotero().Items?.get?.(entry), item);
      } else {
        pushAnnotation(entry, item);
      }
    }
  } catch {
    // Annotation APIs are runtime-dependent; return what can be read safely.
  }
  try {
    for (const attachmentId of source.getAttachments?.() || []) {
      const attachment = resolveZotero().Items?.get?.(attachmentId as number);
      const attachmentSource = attachment as unknown as {
        getAnnotations?: () => unknown[];
      };
      for (const entry of attachmentSource?.getAnnotations?.() || []) {
        if (typeof entry === "number") {
          pushAnnotation(resolveZotero().Items?.get?.(entry), attachment);
        } else {
          pushAnnotation(entry, attachment);
        }
      }
    }
  } catch {
    // Ignore partial annotation lookup failures.
  }
  return annotations.filter(
    (entry) => entry.text || entry.comment || entry.key,
  );
}

function exportAnnotationsMarkdown(annotations: ZoteroHostAnnotationDto[]) {
  if (annotations.length === 0) {
    return "";
  }
  return annotations
    .map((annotation, index) => {
      const heading = [
        `### Annotation ${index + 1}`,
        annotation.pageLabel ? `page ${annotation.pageLabel}` : "",
      ]
        .filter(Boolean)
        .join(" - ");
      const parts = [heading];
      if (annotation.text) {
        parts.push("", `> ${annotation.text.replace(/\n+/g, "\n> ")}`);
      }
      if (annotation.comment) {
        parts.push("", annotation.comment);
      }
      return parts.join("\n");
    })
    .join("\n\n");
}

function normalizePayloadType(value: unknown) {
  const payloadType = trimText(value, 120);
  if (!payloadType || !NOTE_PAYLOAD_TYPE_RE.test(payloadType)) {
    throw new Error(
      "payloadType must match [a-z0-9][a-z0-9._-]* and be non-empty",
    );
  }
  return payloadType;
}

function normalizePayloadFormat(value: unknown, payloadType: string) {
  const explicit = trimText(value, 40).toLowerCase();
  if (explicit === "json" || explicit === "markdown" || explicit === "text") {
    return explicit;
  }
  if (payloadType.endsWith("-markdown")) {
    return "markdown";
  }
  if (payloadType.endsWith("-json")) {
    return "json";
  }
  return "json";
}

function normalizeJsonSafePayload(value: unknown) {
  if (value === undefined) {
    throw new Error("payload is required");
  }
  assertJsonValue(value, "payload");
  const text = JSON.stringify(value);
  if (text.length > NOTE_PAYLOAD_MAX_BYTES) {
    throw new Error(`payload cannot exceed ${NOTE_PAYLOAD_MAX_BYTES} bytes`);
  }
  return { payload: value, text };
}

function base64ToBytes(value: string) {
  const buffer = (globalThis as { Buffer?: any }).Buffer;
  if (buffer) {
    return new Uint8Array(buffer.from(value, "base64"));
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function blobFromBytes(bytes: Uint8Array, mimeType: string) {
  const BlobCtor = (globalThis as { Blob?: typeof Blob }).Blob;
  if (!BlobCtor) {
    throw new Error("Blob constructor is unavailable");
  }
  return new BlobCtor([bytes], { type: mimeType });
}

function buildWorkbenchPayloadImageBytes(envelope: Record<string, unknown>) {
  const imageBytes = base64ToBytes(PAYLOAD_IMAGE_BASE64);
  let bytes: Uint8Array;
  try {
    bytes = buildWorkbenchPayloadPngBytes(imageBytes, envelope);
  } catch (error) {
    if (
      !String((error as Error)?.message || "").includes(
        "base PNG is missing IEND chunk",
      )
    ) {
      throw error;
    }
    bytes = buildWorkbenchPayloadPngBytes(
      base64ToBytes(PAYLOAD_IMAGE_FALLBACK_BASE64),
      envelope,
    );
  }
  if (bytes.length > NOTE_PAYLOAD_MAX_BYTES) {
    throw new Error(
      `embedded payload cannot exceed ${NOTE_PAYLOAD_MAX_BYTES} bytes`,
    );
  }
  return bytes;
}

function stripPayloadAnchorForType(noteContent: unknown, payloadType: string) {
  const escaped = payloadType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(noteContent || "").replace(
    new RegExp(
      `<img\\b(?=[^>]*\\bdata-zs-payload-anchor\\s*=\\s*(?:"${escaped}"|'${escaped}'|${escaped}))(?:[^>]*?)>`,
      "gi",
    ),
    "",
  );
}

function appendPayloadAnchor(
  noteContent: unknown,
  payloadType: string,
  attachmentKey: string,
) {
  const stripped = stripPayloadAnchorForType(noteContent, payloadType);
  const anchor = `<img data-attachment-key="${escapeAttribute(attachmentKey)}" data-zs-payload-anchor="${escapeAttribute(payloadType)}" alt="ZA" title="Zotero Agents artifact payload" width="32" height="32">`;
  const block = `<p data-zs-payload-anchor-container="1">${anchor}</p>`;
  if (/<\/div>\s*$/i.test(stripped)) {
    return stripped.replace(/<\/div>\s*$/i, `${block}</div>`);
  }
  return `${stripped}\n${block}`;
}

async function updateNoteContentDirect(note: Zotero.Item, content: string) {
  const target = note as unknown as {
    setNote?: (value: string) => void;
    saveTx?: () => Promise<unknown>;
    save?: () => Promise<unknown>;
  };
  target.setNote?.(content);
  if (typeof target.saveTx === "function") {
    await target.saveTx();
  } else {
    await target.save?.();
  }
}

function normalizePaperText(value: unknown, limit = INGEST_FIELD_LIMIT) {
  return trimText(value, limit);
}

function normalizeIdentifier(value: unknown) {
  return normalizePaperText(value, 300)
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim();
}

function normalizePaperCreators(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("paper.creators must be an array");
  }
  return value.slice(0, 50).map((creator, index) => {
    if (!creator || typeof creator !== "object" || Array.isArray(creator)) {
      throw new Error(`paper.creators[${index}] must be an object`);
    }
    const input = creator as ZoteroHostMetadataCreatorDto;
    const name = normalizePaperText(input.name, 300);
    const firstName = normalizePaperText(input.firstName, 150);
    const lastName = normalizePaperText(input.lastName, 150);
    const creatorType = normalizePaperText(input.creatorType, 80) || "author";
    if (name) {
      return { name, creatorType };
    }
    if (firstName || lastName) {
      return { firstName, lastName, creatorType };
    }
    throw new Error(
      `paper.creators[${index}] requires name or firstName/lastName`,
    );
  });
}

function normalizePaperFields(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("paper.fields must be an object");
  }
  const fields: Record<string, string | number | boolean> = {};
  for (const [field, raw] of Object.entries(value)) {
    const key = String(field || "").trim();
    if (!key || raw === null || raw === undefined || raw === "") {
      continue;
    }
    if (!["string", "number", "boolean"].includes(typeof raw)) {
      throw new Error(`paper.fields.${key} must be a scalar value`);
    }
    fields[key] = typeof raw === "string" ? normalizePaperText(raw, 4000) : raw;
  }
  return fields;
}

function normalizeIngestPaper(request: ZoteroHostMutationRequest) {
  if ("papers" in request) {
    throw new Error(
      "literature.ingest accepts a single paper field; papers is not supported",
    );
  }
  if (
    !request.paper ||
    typeof request.paper !== "object" ||
    Array.isArray(request.paper)
  ) {
    throw new Error("paper must be an object");
  }
  const input = request.paper;
  const itemType = normalizePaperText(input.itemType, 100);
  if (!itemType) {
    throw new Error("paper.itemType is required");
  }
  const fields = normalizePaperFields(input.fields);
  const creators = normalizePaperCreators(input.creators);
  if (
    !input.identifiers ||
    typeof input.identifiers !== "object" ||
    Array.isArray(input.identifiers)
  ) {
    throw new Error("paper.identifiers must be an object");
  }
  const identifierDoi = normalizeIdentifier(input.identifiers.doi);
  const fieldDoi = normalizeIdentifier(fields.DOI);
  if (
    identifierDoi &&
    fieldDoi &&
    normalizedComparable(identifierDoi) !== normalizedComparable(fieldDoi)
  ) {
    throw new Error("paper DOI representations conflict");
  }
  const doi = identifierDoi || fieldDoi;
  const arxiv = normalizeIdentifier(input.identifiers.arxiv);
  const pmid = normalizeIdentifier(input.identifiers.pmid);
  const isbn = normalizeIdentifier(input.identifiers.isbn || fields.ISBN);
  const supportsNativeDoi = Boolean(
    doi && itemTypeSupportsField(itemType, "DOI"),
  );
  if (supportsNativeDoi) {
    fields.DOI = doi;
  } else {
    delete fields.DOI;
  }
  const title = normalizePaperText(fields.title, 500);
  if (!title && !doi && !arxiv && !pmid && !isbn) {
    throw new Error("paper requires title or identifier");
  }
  const landingUrl = normalizePaperText(input.landingUrl, 1000);
  const existingExtra = normalizePaperText(fields.extra, 4000);
  const existingLines = existingExtra
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const doiExtraPattern = /^DOI:\s*(.+)$/i;
  if (doi) {
    for (const line of existingLines) {
      const extraDoi = line.match(doiExtraPattern)?.[1];
      if (
        extraDoi &&
        normalizedComparable(extraDoi) !== normalizedComparable(doi)
      ) {
        throw new Error("paper DOI representations conflict");
      }
    }
  }
  const retainedExtraLines = doi
    ? existingLines.filter((line) => !doiExtraPattern.test(line))
    : existingLines;
  const extraIdentifiers = [
    doi && !supportsNativeDoi ? `DOI: ${doi}` : "",
    isbn && !fields.ISBN ? `ISBN: ${isbn}` : "",
    arxiv ? `arXiv: ${arxiv}` : "",
    pmid ? `PMID: ${pmid}` : "",
  ].filter(Boolean);
  if (doi || extraIdentifiers.length > 0) {
    const seen = new Set(retainedExtraLines.map((line) => line.toLowerCase()));
    fields.extra = [
      ...retainedExtraLines,
      ...extraIdentifiers.filter((line) => {
        const key = line.toLowerCase();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      }),
    ].join("\n");
    if (!fields.extra) {
      delete fields.extra;
    }
  }
  return {
    itemType,
    fields,
    creators,
    title,
    doi,
    arxiv,
    pmid,
    isbn,
    landingUrl,
    pdfUrl: normalizePaperText(input.pdfUrl, 1000),
    attachLandingUrlOnMissingPdf: input.attachLandingUrlOnMissingPdf === true,
  };
}

function normalizeMutationOperation(value: unknown) {
  return trimText(value);
}

function normalizedComparable(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
    .replace(/^doi:\s*/, "")
    .replace(/\s+/g, " ");
}

function itemMatchesIngestPaper(
  item: Zotero.Item,
  paper: ReturnType<typeof normalizeIngestPaper>,
) {
  const doi = normalizedComparable(readField(item, "DOI", 500));
  const isbn = normalizedComparable(readField(item, "ISBN", 500));
  const title = normalizedComparable(getItemTitle(item));
  const url = normalizedComparable(readField(item, "url", 1000));
  const extra = normalizedComparable(readField(item, "extra", 2000));
  if (paper.doi && doi && doi === normalizedComparable(paper.doi)) {
    return true;
  }
  if (paper.isbn && isbn && isbn === normalizedComparable(paper.isbn)) {
    return true;
  }
  if (paper.arxiv && extra.includes(normalizedComparable(paper.arxiv))) {
    return true;
  }
  if (paper.pmid && extra.includes(normalizedComparable(paper.pmid))) {
    return true;
  }
  if (
    paper.landingUrl &&
    url &&
    url === normalizedComparable(paper.landingUrl)
  ) {
    return true;
  }
  return (
    !!paper.title && !!title && title === normalizedComparable(paper.title)
  );
}

async function findExistingPaper(
  paper: ReturnType<typeof normalizeIngestPaper>,
) {
  const items = await getAllRegularZoteroItems();
  return items.find((item) => itemMatchesIngestPaper(item, paper)) || null;
}

function setItemFieldIfPresent(
  item: Zotero.Item,
  field: string,
  value: string | number | boolean | null | undefined,
) {
  const normalized =
    typeof value === "string" ? normalizePaperText(value, 4000) : value;
  if (normalized === undefined || normalized === null || normalized === "") {
    return;
  }
  item.setField(field as any, normalized as any);
}

function setItemCreators(
  item: Zotero.Item,
  creators: ZoteroHostMetadataCreatorDto[],
) {
  if (!creators.length) {
    return;
  }
  const target = item as unknown as {
    setCreators?: (creators: ZoteroHostMetadataCreatorDto[]) => void;
  };
  target.setCreators?.(creators);
}

async function createMetadataPaperItem(
  paper: ReturnType<typeof normalizeIngestPaper>,
  libraryID: number,
) {
  const item = new Zotero.Item(paper.itemType as any);
  (item as any).libraryID = libraryID;
  for (const [field, value] of Object.entries(paper.fields)) {
    setItemFieldIfPresent(item, field, value);
  }
  setItemCreators(item, paper.creators);
  await item.saveTx();
  return item;
}

async function attachPdfBestEffort(
  item: Zotero.Item,
  paper: ReturnType<typeof normalizeIngestPaper>,
) {
  if (!paper.pdfUrl) {
    return {
      status: "skipped" as const,
      attachment: undefined,
      error: undefined,
    };
  }
  const attachments = (resolveZotero() as any).Attachments;
  if (typeof attachments?.importFromURL !== "function") {
    return {
      status: "failed" as const,
      attachment: undefined,
      error: {
        code: "attachment_import_from_url_unavailable",
        message: "Zotero.Attachments.importFromURL is unavailable",
      },
    };
  }
  try {
    const attachment = (await attachments.importFromURL({
      libraryID: normalizeLibraryId((item as any).libraryID),
      url: paper.pdfUrl,
      parentItemID: item.id,
      title: paper.title ? `${paper.title} PDF` : "Full Text PDF",
      contentType: "application/pdf",
      referrer: paper.landingUrl || undefined,
    })) as Zotero.Item;
    return {
      status: "attached" as const,
      attachment: await serializeAttachment(attachment),
      error: undefined,
    };
  } catch (error) {
    return {
      status: "failed" as const,
      attachment: undefined,
      error: childError("pdf_attachment_failed", error),
    };
  }
}

function isPdfAttachment(item: Zotero.Item) {
  const contentType =
    readField(item, "contentType", 200).toLowerCase() ||
    String(
      (item as unknown as { attachmentContentType?: unknown })
        .attachmentContentType || "",
    )
      .trim()
      .toLowerCase();
  if (contentType === "application/pdf") {
    return true;
  }
  const title = getItemTitle(item).toLowerCase();
  if (title.endsWith(".pdf")) {
    return true;
  }
  const path = String((item as unknown as { path?: unknown }).path || "")
    .trim()
    .toLowerCase();
  return path.endsWith(".pdf");
}

function itemHasPdfAttachment(item: Zotero.Item) {
  let attachmentIds: unknown[] = [];
  try {
    attachmentIds = item.getAttachments?.() || [];
  } catch {
    attachmentIds = [];
  }
  for (const id of attachmentIds) {
    const attachment = resolveZotero().Items.get(id as number);
    if (attachment && isPdfAttachment(attachment)) {
      return true;
    }
  }
  return false;
}

async function attachLandingUrlWhenMissingPdf(
  item: Zotero.Item,
  paper: ReturnType<typeof normalizeIngestPaper>,
  hasPdfAttachment: boolean,
) {
  if (!paper.attachLandingUrlOnMissingPdf) {
    return {
      status: undefined,
      attachment: undefined,
      error: undefined,
    };
  }
  if (hasPdfAttachment || !paper.landingUrl) {
    return {
      status: "skipped" as const,
      attachment: undefined,
      error: undefined,
    };
  }
  try {
    const attachment = await handlers.attachment.createFromUrl({
      parent: item,
      url: paper.landingUrl,
      title: paper.title
        ? `${paper.title} Landing Page`
        : "Literature Landing Page",
      mimeType: "text/html",
    });
    return {
      status: "attached" as const,
      attachment: await serializeAttachment(attachment),
      error: undefined,
    };
  } catch (error) {
    return {
      status: "failed" as const,
      attachment: undefined,
      error: childError("landing_url_attachment_failed", error),
    };
  }
}

async function ingestOnePaper(
  paper: ReturnType<typeof normalizeIngestPaper>,
  index: number,
  collection: Zotero.Collection | null,
): Promise<ZoteroHostIngestPaperResult> {
  const identifiers = {
    ...(paper.doi ? { doi: paper.doi } : {}),
    ...(paper.arxiv ? { arxiv: paper.arxiv } : {}),
    ...(paper.pmid ? { pmid: paper.pmid } : {}),
    ...(paper.isbn ? { isbn: paper.isbn } : {}),
  };
  try {
    const existing = await findExistingPaper(paper);
    let item = existing;
    const status: ZoteroHostIngestPaperResult["status"] = existing
      ? "existing"
      : "created";
    if (!item) {
      const libraryID = collection
        ? normalizeLibraryId(
            (collection as unknown as { libraryID?: unknown }).libraryID,
          )
        : normalizeLibraryId(undefined);
      item = await createMetadataPaperItem(paper, libraryID);
    }
    if (collection) {
      try {
        await handlers.collection.add(item, collection);
      } catch {
        // Collection placement is best-effort and should not convert a created
        // bibliographic item into a failed ingest result.
      }
    }
    const attachment = await attachPdfBestEffort(item, paper);
    const hasPdfAttachment = itemHasPdfAttachment(item);
    const landingAttachment = await attachLandingUrlWhenMissingPdf(
      item,
      paper,
      hasPdfAttachment,
    );
    return {
      index,
      status,
      title: paper.title || getItemTitle(item),
      identifiers,
      item: serializeZoteroItemSummary(item),
      attachmentStatus: attachment.status,
      attachment: attachment.attachment,
      hasPdfAttachment,
      landingAttachmentStatus: landingAttachment.status,
      landingAttachment: landingAttachment.attachment,
      landingAttachmentError: landingAttachment.error,
      error: attachment.error,
    };
  } catch (error) {
    return {
      index,
      status: "failed",
      title: paper.title,
      identifiers,
      attachmentStatus: paper.pdfUrl ? "failed" : "skipped",
      hasPdfAttachment: false,
      error: childError("paper_ingest_failed", error),
    };
  }
}

async function ingestPaper(request: ZoteroHostMutationRequest) {
  const paper = normalizeIngestPaper(request);
  const collection = request.collection
    ? resolveCollection(request.collection)
    : null;
  if (request.collection && !collection) {
    throw new Error("collection not found");
  }
  return ingestOnePaper(paper, 1, collection);
}

function normalizeTargetItems(request: ZoteroHostMutationRequest) {
  const raw =
    request.targets || request.items || request.target || request.item;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (list.length === 0) {
    throw new Error("target item is required");
  }
  if (list.length > TARGET_LIMIT_MAX) {
    throw new Error(`target item count cannot exceed ${TARGET_LIMIT_MAX}`);
  }
  return list.map((ref) => requireItem(ref, "target item"));
}

function errorResponse(
  operation: string,
  error: unknown,
): ZoteroHostMutationPreviewResponse | ZoteroHostMutationExecuteResponse {
  const message =
    error instanceof Error ? error.message : String(error || "Unknown error");
  const codeFromError = trimText((error as { code?: unknown })?.code);
  return {
    ok: false,
    operation,
    targetRefs: [],
    summary: "",
    warnings: [],
    requiresConfirmation: true,
    error: {
      code:
        codeFromError ||
        message
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "") ||
        "mutation_error",
      message,
    },
  };
}

function okPreview(args: {
  operation: string;
  targetRefs: ZoteroHostItemSummaryDto[];
  summary: string;
  warnings?: string[];
  collection?: ZoteroHostCollectionDto;
}): ZoteroHostMutationPreviewResponse {
  return {
    ok: true,
    operation: args.operation,
    targetRefs: args.targetRefs,
    summary: args.summary,
    warnings: args.warnings || [],
    requiresConfirmation: true,
    collection: args.collection,
  };
}

function logicalPayloadHashFromBlock(block: ZoteroNotePayloadBlock) {
  if (!block.logicalSchemaVersion) return "";
  return canonicalLogicalNotePayloadHash({
    payloadType: block.payloadType,
    noteKind: block.noteKind,
    schemaVersion: block.logicalSchemaVersion,
    format: block.format,
    value:
      block.format === "markdown"
        ? (block.markdown ?? block.payload)
        : block.payload,
  });
}

function stripInlinePayloadForType(noteContent: unknown, payloadType: string) {
  const escaped = payloadType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(noteContent || "").replace(
    new RegExp(
      `<span\\b(?=[^>]*\\bdata-zs-payload\\s*=\\s*(?:"${escaped}"|'${escaped}'|${escaped}))(?:[^>]*?)><\\/span>`,
      "giu",
    ),
    "",
  );
}

async function upsertNotePayloadAttachment(
  note: Zotero.Item,
  payload: LogicalNotePayloadDto,
  previous: ZoteroNotePayloadBlock[],
  control?: WorkflowCallControl,
) {
  if (previous.length > 1) {
    throw new MutationAuthorityExecutionError(
      "failed",
      "conflict",
      "validation",
      "refresh_and_retry_new_operation",
      { reason: "ambiguous_state", kind: "note" },
      "note payload is ambiguous",
    );
  }
  const requestedHash = canonicalLogicalNotePayloadHash(payload);
  if (
    previous.length === 1 &&
    logicalPayloadHashFromBlock(previous[0]) === requestedHash
  ) {
    return {
      note,
      payload: canonicalPayloadSummary(previous[0], note),
      outcome: "unchanged" as const,
      createdAttachment: null,
      removedAttachment: null,
    };
  }
  const payloadType = payload.payloadType;
  const envelope = buildWorkbenchPayloadEnvelope({
    noteId: note.id || null,
    noteKey: note.key,
    parentId:
      (note as unknown as { parentID?: unknown; parentItemID?: unknown })
        .parentID ||
      (note as unknown as { parentItemID?: unknown }).parentItemID ||
      null,
    noteKind: payload.noteKind,
    payloadType,
    schemaVersion: payload.schemaVersion,
    format: payload.format,
    value: payload.value,
  });
  const bytes = buildWorkbenchPayloadImageBytes(envelope);
  const zotero = resolveZotero();
  if (typeof zotero.Attachments?.importEmbeddedImage !== "function") {
    throw new MutationAuthorityExecutionError(
      "failed",
      "unavailable",
      "staging",
      "retry_same_operation",
      { reason: "capability", kind: "attachment" },
      "Zotero embedded image import is unavailable",
    );
  }
  let attachment: Zotero.Item;
  try {
    attachment = await withZoteroHostSlice(control, () =>
      zotero.Attachments.importEmbeddedImage({
        blob: blobFromBytes(bytes, "image/png"),
        parentItemID: note.id,
      }),
    );
  } catch (error) {
    throw new MutationAuthorityExecutionError(
      "failed",
      "execution_failed",
      "staging",
      "retry_same_operation",
      { phase: "staging", recovery: "retry_same_operation" },
      error instanceof Error ? error.message : "payload staging failed",
      [
        {
          kind: "item",
          ref: {
            libraryId: normalizeLibraryId(note.libraryID),
            key: trimText(note.key),
          },
        },
      ],
    );
  }
  const attachmentKey = await withZoteroHostSlice(control, () =>
    trimText(attachment?.key),
  );
  const originalContent = await withZoteroHostSlice(control, () =>
    String(note.getNote?.() || ""),
  );
  try {
    if (!attachmentKey) throw new Error("payload attachment has no key");
    await withZoteroHostSlice(control, () =>
      updateNoteContentDirect(
        note,
        appendPayloadAnchor(
          stripInlinePayloadForType(originalContent, payloadType),
          payloadType,
          attachmentKey,
        ),
      ),
    );
  } catch (error) {
    await withZoteroHostSlice(control, () => note.setNote?.(originalContent));
    const attachmentRef = await withZoteroHostSlice(control, () => ({
      kind: "item" as const,
      ref: {
        libraryId: normalizeLibraryId(attachment.libraryID),
        key: trimText(attachment.key),
      },
    }));
    let residualRefs: (typeof attachmentRef)[] = [];
    try {
      await withZoteroHostSlice(control, () =>
        handlers.attachment.remove(attachment),
      );
    } catch {
      residualRefs = [attachmentRef];
    }
    throw new MutationAuthorityExecutionError(
      residualRefs.length ? "repair_required" : "failed",
      "execution_failed",
      "compensation",
      residualRefs.length ? "manual_repair" : "retry_same_operation",
      {
        phase: "cleanup",
        recovery: residualRefs.length
          ? "manual_repair"
          : "retry_same_operation",
        affectedCount: 1,
        residualCount: residualRefs.length,
      },
      error instanceof Error ? error.message : "note payload commit failed",
      [attachmentRef],
      residualRefs,
    );
  }
  let removedAttachment: Zotero.Item | null = null;
  const old = previous[0];
  if (old?.attachmentKey && old.attachmentKey !== attachmentKey) {
    const oldAttachment = await withZoteroHostSlice(
      control,
      () =>
        zotero.Items.getByLibraryAndKey?.(
          normalizeLibraryId(
            (note as unknown as { libraryID?: unknown }).libraryID,
          ),
          old.attachmentKey!,
        ) || null,
    );
    if (oldAttachment) {
      const parentId = await withZoteroHostSlice(
        control,
        () =>
          (
            oldAttachment as unknown as {
              parentID?: unknown;
              parentItemID?: unknown;
            }
          ).parentID ||
          (oldAttachment as unknown as { parentItemID?: unknown }).parentItemID,
      );
      if (Number(parentId) === Number(note.id)) {
        try {
          await withZoteroHostSlice(control, () =>
            handlers.attachment.remove(oldAttachment!),
          );
          removedAttachment = oldAttachment;
        } catch (error) {
          const residualRef = {
            kind: "item" as const,
            ref: {
              libraryId: normalizeLibraryId(oldAttachment.libraryID),
              key: trimText(oldAttachment.key),
            },
          };
          throw new MutationAuthorityExecutionError(
            "repair_required",
            "execution_failed",
            "compensation",
            "manual_repair",
            {
              phase: "cleanup",
              recovery: "manual_repair",
              affectedCount: 2,
              residualCount: 1,
            },
            error instanceof Error
              ? error.message
              : "old payload cleanup failed",
            [
              {
                kind: "item",
                ref: {
                  libraryId: normalizeLibraryId(note.libraryID),
                  key: trimText(note.key),
                },
              },
              residualRef,
            ],
            [residualRef],
          );
        }
      }
    }
  }
  return {
    note,
    payload: canonicalPayloadSummary(
      {
        source: "embedded-image-attachment",
        sourceStorage: "embedded-image-attachment-v2",
        payloadStorageVersion: 2,
        payloadHash: requestedHash,
        logicalSchemaVersion: payload.schemaVersion,
        anchorStatus: "present",
        payloadType,
        noteKind: payload.noteKind,
        version: payload.schemaVersion,
        encoding: "embedded-image-attachment",
        encodedValue: "",
        estimatedSize: new TextEncoder().encode(
          payload.format === "json"
            ? JSON.stringify(payload.value)
            : String(payload.value),
        ).byteLength,
        payload: payload.value,
        ...(payload.format === "markdown"
          ? { markdown: String(payload.value) }
          : {}),
        format: payload.format,
        attachmentKey,
        attachmentId: attachment.id || null,
      },
      note,
    ),
    outcome:
      previous.length === 0 ? ("created" as const) : ("replaced" as const),
    createdAttachment: attachment,
    removedAttachment,
  };
}

function previewMutationOrThrow(
  request: ZoteroHostMutationRequest,
): ZoteroHostMutationPreviewResponse {
  const operation = normalizeMutationOperation(request.operation);
  switch (operation) {
    case "item.updateFields": {
      const item = requireItem(request.target || request.item, "target item");
      const patch = validateFieldPatch(item, request.fields);
      return okPreview({
        operation,
        targetRefs: [serializeZoteroItemSummary(item)],
        summary: `Update ${Object.keys(patch).length} field(s) on "${getItemTitle(item)}".`,
      });
    }
    case "item.addTags":
    case "item.removeTags": {
      const items = normalizeTargetItems(request);
      const tags = normalizeTags(request.tags);
      return okPreview({
        operation,
        targetRefs: items.map(serializeZoteroItemSummary),
        summary: `${operation === "item.addTags" ? "Add" : "Remove"} ${tags.length} tag(s) on ${items.length} item(s).`,
      });
    }
    case "item.attachFile": {
      const item = requireItem(request.target || request.item, "target item");
      const descriptor = getHostBridgeFileDescriptor(
        requireUploadedFileId(request),
      );
      if (descriptor.sourceKind !== "bridge-upload") {
        throw new Error("fileId must reference an uploaded Host Bridge file");
      }
      return okPreview({
        operation,
        targetRefs: [serializeZoteroItemSummary(item)],
        summary: `Attach uploaded file "${descriptor.displayName}" to "${getItemTitle(item)}".`,
      });
    }
    case "note.createChild": {
      const parent = requireItem(
        request.parent || request.target,
        "parent item",
      );
      const content = normalizeContent(request.content);
      return okPreview({
        operation,
        targetRefs: [serializeZoteroItemSummary(parent)],
        summary: `Create a child note under "${getItemTitle(parent)}" (${content.length} chars).`,
      });
    }
    case "note.update": {
      const note = requireItem(request.note || request.target, "target note");
      if (!note.isNote?.()) {
        throw new Error("target item is not a note");
      }
      const content = normalizeContent(request.content);
      return okPreview({
        operation,
        targetRefs: [serializeZoteroItemSummary(note)],
        summary: `Update note "${serializeNote(note).title}" (${content.length} chars).`,
      });
    }
    case "note.upsertPayload": {
      const note = requireNote(request.note || request.target);
      const payloadType = normalizePayloadType(request.payloadType);
      const payloadFormat = normalizePayloadFormat(
        request.payloadFormat,
        payloadType,
      );
      normalizeJsonSafePayload(
        payloadFormat === "json"
          ? request.payload
          : {
              format: payloadFormat,
              content:
                request.payload === undefined
                  ? request.content
                  : request.payload,
            },
      );
      return okPreview({
        operation,
        targetRefs: [serializeZoteroItemSummary(note)],
        summary: `Upsert embedded note payload "${payloadType}" on "${serializeNote(note).title}".`,
      });
    }
    case LITERATURE_INGEST_OPERATION: {
      const paper = normalizeIngestPaper(request);
      const collection = request.collection
        ? resolveCollection(request.collection)
        : null;
      if (request.collection && !collection) {
        throw new Error("collection not found");
      }
      return okPreview({
        operation,
        targetRefs: [],
        summary: `Ingest one paper${
          paper.pdfUrl ? " with best-effort PDF attachment" : ""
        }${
          paper.attachLandingUrlOnMissingPdf
            ? " with missing-PDF landing link attachment"
            : ""
        }.`,
        collection: collection ? serializeCollection(collection) : undefined,
      });
    }
    case "collection.create": {
      const name = normalizeCollectionName(request);
      const libraryId = mutationLibraryId(request);
      return okPreview({
        operation,
        targetRefs: [],
        summary: `Create collection "${name}".`,
        collection: {
          id: "",
          key: "",
          name,
          libraryId: libraryId || 0,
        },
      });
    }
    case "collection.addItems":
    case "collection.removeItems": {
      const items = normalizeTargetItems(request);
      const collection = resolveCollection(request.collection);
      if (!collection) {
        throw new Error("collection not found");
      }
      return okPreview({
        operation,
        targetRefs: items.map(serializeZoteroItemSummary),
        summary: `${operation === "collection.addItems" ? "Add" : "Remove"} ${items.length} item(s) ${operation === "collection.addItems" ? "to" : "from"} collection "${trimText((collection as any).name)}".`,
        collection: serializeCollection(collection),
      });
    }
    default:
      throw new Error(
        `Unsupported mutation operation: ${operation || "(empty)"}`,
      );
  }
}

async function executeMutationOrThrow(
  request: ZoteroHostMutationRequest,
): Promise<ZoteroHostMutationExecuteResponse> {
  const preview = previewMutationOrThrow(request);
  if (!preview.ok) {
    return preview;
  }
  switch (preview.operation) {
    case "item.updateFields": {
      const item = requireItem(request.target || request.item, "target item");
      const patch = validateFieldPatch(item, request.fields);
      const updated = await handlers.parent.updateFields(item, patch);
      return {
        ...preview,
        result: {
          items: [serializeZoteroItemSummary(updated)],
        },
      };
    }
    case "item.addTags":
    case "item.removeTags": {
      const items = normalizeTargetItems(request);
      const tags = normalizeTags(request.tags);
      if (preview.operation === "item.addTags") {
        await handlers.tag.add(items, tags);
      } else {
        await handlers.tag.remove(items, tags);
      }
      return {
        ...preview,
        result: {
          items: items.map(serializeZoteroItemSummary),
        },
      };
    }
    case "item.attachFile": {
      const item = requireItem(request.target || request.item, "target item");
      const uploaded = await resolveHostBridgeUploadedFile(
        requireUploadedFileId(request),
      );
      const attachment = await handlers.attachment.createFromPath({
        parent: item,
        path: uploaded.source.path,
        title: request.displayName || uploaded.descriptor.displayName,
        mimeType: request.contentType || uploaded.descriptor.contentType,
      });
      markHostBridgeUploadedFileConsumed(uploaded.descriptor.fileId);
      return {
        ...preview,
        result: {
          items: [serializeZoteroItemSummary(item)],
          attachments: [await serializeAttachment(attachment)],
          file: uploaded.descriptor,
        },
      };
    }
    case "note.createChild": {
      const parent = requireItem(
        request.parent || request.target,
        "parent item",
      );
      const note = await handlers.parent.addNote(parent, {
        content: normalizeContent(request.content),
      });
      return {
        ...preview,
        result: {
          notes: [serializeNote(note)],
        },
      };
    }
    case "note.update": {
      const note = requireItem(request.note || request.target, "target note");
      const updated = await handlers.note.update(note, {
        content: normalizeContent(request.content),
      });
      return {
        ...preview,
        result: {
          notes: [serializeNote(updated)],
        },
      };
    }
    case LITERATURE_INGEST_OPERATION: {
      const ingest = await ingestPaper(request);
      return {
        ...preview,
        result: {
          items: ingest.item ? [ingest.item] : [],
          ingest,
        },
      };
    }
    case "collection.create": {
      const collection = await handlers.collection.create({
        name: normalizeCollectionName(request),
        libraryID: mutationLibraryId(request),
      });
      return {
        ...preview,
        result: {
          collection: serializeCollection(collection),
          collections: [serializeCollection(collection)],
        },
      };
    }
    case "collection.addItems":
    case "collection.removeItems": {
      const items = normalizeTargetItems(request);
      const collectionRef = request.collection as ZoteroHostCollectionRefInput;
      const collection = resolveCollection(collectionRef);
      if (!collection) {
        throw new Error("collection not found");
      }
      if (preview.operation === "collection.addItems") {
        await handlers.collection.add(
          items,
          resolveCollectionHandlerRef(collectionRef),
        );
      } else {
        await handlers.collection.remove(
          items,
          resolveCollectionHandlerRef(collectionRef),
        );
      }
      return {
        ...preview,
        result: {
          items: items.map(serializeZoteroItemSummary),
          collections: [serializeCollection(collection)],
        },
      };
    }
    default:
      throw new Error(`Unsupported mutation operation: ${preview.operation}`);
  }
}

function canonicalItemVersion(item: Zotero.Item) {
  const detail = serializeItemDetail(item);
  const deleted = Boolean(
    (item as Zotero.Item & { deleted?: unknown }).deleted,
  );
  return {
    revision: detail.revision,
    state: deleted ? ("trashed" as const) : ("active" as const),
  };
}

function canonicalMutationItemResult(item: Zotero.Item): MutationItemResultDto {
  const detail = serializeItemDetail(item);
  return {
    ref: { libraryId: detail.libraryId, key: detail.key },
    revision: detail.revision,
    itemType: detail.itemType,
    title: detail.title,
    fields: detail.fields,
    creators: detail.creators,
    tags: detail.tags,
    collectionIds: detail.collections,
    relatedItemKeys: detail.relatedItemKeys,
  };
}

function normalizeItemUpdateMetadataRequest(
  request: ItemUpdateMetadataRequest,
): ItemUpdateMetadataRequest {
  const itemRef = canonicalItemRef(request.itemRef);
  const operationId = trimText(request.operationId, 129);
  if (!operationId || operationId.length > 128) {
    throw capabilityError("invalid_request", "operationId is invalid", {
      reason: "invalid_value",
      field: "operationId",
      operation: "item.updateMetadata",
    });
  }
  const fields = request.patch?.fields;
  const creators = request.patch?.creators;
  if (fields === undefined && creators === undefined) {
    throw capabilityError("invalid_request", "metadata patch is empty", {
      reason: "missing_field",
      field: "patch",
      operation: "item.updateMetadata",
    });
  }
  if (fields !== undefined) {
    if (!fields || Array.isArray(fields) || typeof fields !== "object") {
      throw capabilityError("invalid_request", "fields patch is invalid", {
        reason: "invalid_type",
        field: "patch.fields",
        operation: "item.updateMetadata",
      });
    }
    if (Object.keys(fields).length > 512) {
      throw capabilityError("resource_limited", "fields patch is too large", {
        resource: "entries",
        limit: 512,
        observed: Object.keys(fields).length,
      });
    }
    for (const [field, value] of Object.entries(fields)) {
      if (
        !field.trim() ||
        (typeof value !== "string" && value !== null) ||
        (typeof value === "string" && value.length > FIELD_TEXT_LIMIT)
      ) {
        throw capabilityError("invalid_request", "field patch is invalid", {
          reason: "invalid_value",
          field: `patch.fields.${field}`,
          operation: "item.updateMetadata",
        });
      }
    }
  }
  if (creators !== undefined && !Array.isArray(creators)) {
    throw capabilityError("invalid_request", "creators patch is invalid", {
      reason: "invalid_type",
      field: "patch.creators",
      operation: "item.updateMetadata",
    });
  }
  const normalized = {
    operation: "item.updateMetadata" as const,
    operationId,
    itemRef,
    ...(request.expectedRevision
      ? { expectedRevision: trimText(request.expectedRevision, 512) }
      : {}),
    patch: {
      ...(fields !== undefined
        ? {
            fields: Object.fromEntries(
              Object.entries(fields)
                .map(([field, value]) => [field.trim(), value] as const)
                .sort(([left], [right]) => left.localeCompare(right)),
            ),
          }
        : {}),
      ...(creators !== undefined
        ? {
            creators: creators.map((creator) => ({
              ...(trimText(creator.firstName)
                ? { firstName: trimText(creator.firstName) }
                : {}),
              ...(trimText(creator.lastName)
                ? { lastName: trimText(creator.lastName) }
                : {}),
              ...(trimText(creator.name)
                ? { name: trimText(creator.name) }
                : {}),
              ...(trimText(creator.creatorType)
                ? { creatorType: trimText(creator.creatorType) }
                : {}),
            })),
          }
        : {}),
    },
  };
  assertWorkflowHostStrictJsonValue(normalized as unknown as JsonValue);
  return normalized;
}

function mutationAdmissionError(error: MutationAuthorityAdmissionError) {
  return new ZoteroHostCapabilityError(
    error.code,
    error.message,
    error.details as never,
  );
}

async function listMutationPayloadBlocks(
  note: Zotero.Item,
  control?: WorkflowCallControl,
) {
  const blocks: ZoteroNotePayloadBlock[] = [];
  let cursor: string | undefined;
  for (;;) {
    throwIfWorkflowCallCanceled(control);
    const page = await listNotePayloadBlocksForItemPage(
      note,
      { limit: 100, ...(cursor ? { cursor } : {}) },
      {
        runNativeSlice: (run) => withZoteroHostSlice(control, run),
        checkCanceled: () => throwIfWorkflowCallCanceled(control),
      },
    );
    blocks.push(...page.blocks);
    if (!page.hasMore) return blocks;
    if (!page.nextCursor) {
      throw capabilityError(
        "execution_failed",
        "note payload source returned an invalid continuation",
        { phase: "adapter", recovery: "retry_same_operation" },
      );
    }
    cursor = page.nextCursor;
  }
}

async function executeItemCreate(
  request: Extract<MutationExecuteRequest, { operation: "item.create" }>,
  scope: ZoteroHostMutationCallerScope,
  control?: WorkflowCallControl,
): Promise<MutationExecutionResult<JsonObject>> {
  const operationId = trimText(request.operationId, 129);
  const itemType = trimText(request.itemType, 128);
  const libraryId =
    parsePositiveInteger(request.libraryId) || normalizeLibraryId(undefined);
  if (!operationId || operationId.length > 128 || !itemType) {
    throw capabilityError("invalid_request", "item create request is invalid", {
      reason: "invalid_value",
      operation: "item.create",
    });
  }
  try {
    await withZoteroHostSlice(control, () =>
      resolveZotero().ItemTypes.getID(itemType),
    );
  } catch {
    throw capabilityError("invalid_request", "item type is unsupported", {
      reason: "unsupported_value",
      field: "itemType",
      operation: "item.create",
    });
  }
  const fields = await withZoteroHostSlice(control, () => {
    const probe = new (resolveZotero().Item as typeof Zotero.Item)(
      itemType as any,
    );
    return Object.keys(request.fields || {}).length
      ? validateFieldPatch(probe, request.fields)
      : {};
  });
  const tags = Array.from(new Set(request.initialTags || [])).map((tag) =>
    trimText(tag, TAG_TEXT_LIMIT),
  );
  const collectionRefs = (request.collectionRefs || []).map(
    canonicalCollectionRef,
  );
  const collections: Zotero.Collection[] = [];
  for (const ref of collectionRefs) {
    const collection = await withZoteroHostSlice(control, () =>
      resolveCollection(ref),
    );
    if (!collection) throw notFoundError("collection", ref);
    collections.push(collection);
  }
  const relatedRefs = (request.initialRelatedRefs || []).map(canonicalItemRef);
  const related: Zotero.Item[] = [];
  for (const ref of relatedRefs) {
    related.push(
      await withZoteroHostSlice(control, () =>
        requireItem(ref, "related item"),
      ),
    );
  }
  const normalized = {
    operation: "item.create" as const,
    operationId,
    libraryId,
    itemType,
    fields,
    creators: request.creators || [],
    initialTags: tags,
    collectionRefs,
    initialRelatedRefs: relatedRefs,
  };
  try {
    return (await executeReservedMutation<object>({
      scope,
      operationId,
      operation: "item.create",
      semanticInput: normalized as unknown as JsonValue,
      control,
      async execute() {
        let created: Zotero.Item | null = null;
        try {
          created = await withZoteroHostSlice(control, () =>
            handlers.item.create({
              itemType,
              libraryID: libraryId,
              fields,
            }),
          );
          if (request.creators !== undefined) {
            await withZoteroHostSlice(control, () =>
              handlers.parent.updateMetadata(created!, {
                creators: request.creators,
              }),
            );
          }
          if (tags.length)
            await withZoteroHostSlice(control, () =>
              handlers.tag.add(created!, tags),
            );
          for (const collection of collections) {
            await withZoteroHostSlice(control, () =>
              handlers.collection.add(created!, collection),
            );
          }
          if (related.length)
            await withZoteroHostSlice(control, () =>
              handlers.parent.addRelated(created!, related),
            );
        } catch (primary) {
          if (!created) {
            throw new MutationAuthorityExecutionError(
              "failed",
              "execution_failed",
              "commit",
              "retry_same_operation",
              { phase: "commit", recovery: "retry_same_operation" },
              primary instanceof Error ? primary.message : "item create failed",
            );
          }
          const ref = await withZoteroHostSlice(control, () => ({
            libraryId: normalizeLibraryId(created!.libraryID),
            key: trimText(created!.key),
          }));
          try {
            await withZoteroHostSlice(control, () =>
              handlers.item.remove(created!),
            );
          } catch {
            throw new MutationAuthorityExecutionError(
              "repair_required",
              "execution_failed",
              "compensation",
              "manual_repair",
              {
                phase: "cleanup",
                recovery: "manual_repair",
                affectedCount: 1,
                residualCount: 1,
              },
              primary instanceof Error
                ? primary.message
                : "item initialization failed",
              [{ kind: "item", ref }],
              [{ kind: "item", ref }],
            );
          }
          throw new MutationAuthorityExecutionError(
            "failed",
            "execution_failed",
            "compensation",
            "retry_same_operation",
            {
              phase: "cleanup",
              recovery: "retry_same_operation",
              affectedCount: 1,
            },
            primary instanceof Error
              ? primary.message
              : "item initialization failed",
            [{ kind: "item", ref }],
          );
        }
        return withZoteroHostSlice(control, () => {
          const ref = {
            libraryId: normalizeLibraryId(created!.libraryID),
            key: trimText(created!.key),
          };
          const afterItem = requireItem(ref, "created item");
          const after = canonicalItemVersion(afterItem);
          return {
            outcome: "committed" as const,
            changes: [
              {
                entity: { kind: "item" as const, ref },
                effect: "created" as const,
                before: null,
                after,
              },
            ],
            result: { item: canonicalMutationItemResult(afterItem) },
          };
        });
      },
    })) as MutationExecutionResult<JsonObject>;
  } catch (error) {
    if (error instanceof MutationAuthorityAdmissionError) {
      throw mutationAdmissionError(error);
    }
    throw error;
  }
}

async function executeItemChangeType(
  request: Extract<MutationExecuteRequest, { operation: "item.changeType" }>,
  scope: ZoteroHostMutationCallerScope,
  control?: WorkflowCallControl,
): Promise<MutationExecutionResult<JsonObject>> {
  const normalized = {
    operation: "item.changeType" as const,
    operationId: trimText(request.operationId, 129),
    itemRef: canonicalItemRef(request.itemRef),
    expectedRevision: trimText(request.expectedRevision, 512),
    targetItemType: trimText(request.targetItemType, 128),
    incompatibleData: request.incompatibleData,
    previewToken: trimText(request.previewToken, 512),
  };
  if (
    !normalized.operationId ||
    normalized.operationId.length > 128 ||
    !normalized.expectedRevision ||
    !normalized.targetItemType ||
    !normalized.previewToken ||
    !["reject", "move_to_extra", "drop"].includes(normalized.incompatibleData)
  ) {
    throw capabilityError("invalid_request", "change type request is invalid", {
      reason: "invalid_value",
      operation: "item.changeType",
    });
  }
  try {
    return await executeReservedMutation<JsonObject>({
      scope,
      operationId: normalized.operationId,
      operation: normalized.operation,
      semanticInput: normalized as unknown as JsonValue,
      control,
      async execute() {
        const basis = await withZoteroHostSlice(control, () =>
          buildItemChangeTypePreview(normalized),
        );
        validateMutationPreviewToken({
          scope,
          token: normalized.previewToken,
          operation: normalized.operation,
          semanticInput: basis.semanticInput,
          plan: basis.plan,
          observations: basis.observations,
        });
        if (basis.plan.sourceRevision !== normalized.expectedRevision) {
          throw new MutationAuthorityExecutionError(
            "failed",
            "conflict",
            "read",
            "refresh_and_retry_new_operation",
            { reason: "revision_mismatch", kind: "item" },
            "item revision no longer matches the preview",
          );
        }
        if (
          normalized.incompatibleData === "reject" &&
          (basis.plan.dropped.length || basis.plan.movedToExtra.length)
        ) {
          throw new MutationAuthorityExecutionError(
            "failed",
            "conflict",
            "read",
            "refresh_and_retry_new_operation",
            { reason: "ambiguous_state", kind: "item" },
            "incompatible item data prevents conversion",
          );
        }
        const { item, before } = await withZoteroHostSlice(control, () => {
          const item = requireItem(normalized.itemRef, "item");
          return { item, before: canonicalItemVersion(item) };
        });
        if (item.itemType !== normalized.targetItemType) {
          try {
            await withZoteroHostSlice(control, () =>
              handlers.parent.updateMetadata(item, {
                itemType: normalized.targetItemType,
                fields: basis.plan.resultFields,
                creators: basis.plan.resultCreators,
              }),
            );
          } catch (error) {
            throw new MutationAuthorityExecutionError(
              "failed",
              "execution_failed",
              "commit",
              "retry_same_operation",
              { phase: "commit", recovery: "retry_same_operation" },
              error instanceof Error ? error.message : "item conversion failed",
              [{ kind: "item", ref: normalized.itemRef }],
            );
          }
        }
        const afterItem = await withZoteroHostSlice(control, () =>
          requireItem(normalized.itemRef, "item"),
        );
        if (afterItem.itemType !== normalized.targetItemType) {
          throw new MutationAuthorityExecutionError(
            "unknown",
            "execution_failed",
            "verification",
            "reconcile",
            { phase: "verification", recovery: "reconcile" },
            "item type conversion could not be confirmed",
            [{ kind: "item", ref: normalized.itemRef }],
          );
        }
        const after = canonicalItemVersion(afterItem);
        const outcome =
          before.revision === after.revision ? "unchanged" : "committed";
        return {
          outcome,
          changes: [
            {
              entity: { kind: "item", ref: normalized.itemRef },
              effect: outcome === "committed" ? "updated" : "unchanged",
              before,
              after,
            },
          ],
          result: { item: canonicalMutationItemResult(afterItem) },
        };
      },
    });
  } catch (error) {
    if (error instanceof MutationAuthorityAdmissionError) {
      throw mutationAdmissionError(error);
    }
    throw error;
  }
}

function canonicalMutationCollectionResult(collection: Zotero.Collection) {
  const dto = serializeCollection(collection);
  return {
    ref: { libraryId: dto.libraryId, key: dto.key },
    revision: canonicalCollectionVersion(collection).revision,
    name: dto.name,
    parentRef: dto.parentKey
      ? { libraryId: dto.libraryId, key: dto.parentKey }
      : null,
  };
}

function assertExpectedItemRevision(
  item: Zotero.Item,
  expectedRevision: string | undefined,
) {
  const version = canonicalItemVersion(item);
  if (expectedRevision && expectedRevision !== version.revision) {
    throw new MutationAuthorityExecutionError(
      "failed",
      "conflict",
      "read",
      "refresh_and_retry_new_operation",
      { reason: "revision_mismatch", kind: "item" },
      "item revision no longer matches expectedRevision",
    );
  }
  return version;
}

function assertExpectedCollectionRevision(
  collection: Zotero.Collection,
  expectedRevision: string | undefined,
) {
  const version = canonicalCollectionVersion(collection);
  if (expectedRevision && expectedRevision !== version.revision) {
    throw new MutationAuthorityExecutionError(
      "failed",
      "conflict",
      "read",
      "refresh_and_retry_new_operation",
      { reason: "revision_mismatch", kind: "collection" },
      "collection revision no longer matches expectedRevision",
    );
  }
  return version;
}

function membershipRefIdentity(ref: ZoteroHostItemRefInput) {
  return `${ref.libraryId}:${ref.key}`;
}

function normalizeCollectionMembershipRefs(
  operation: "collection.create" | "collection.updateMembership",
  add: ZoteroHostItemRefInput[],
  remove: ZoteroHostItemRefInput[],
  options: { allowEmpty?: boolean } = {},
) {
  const normalizeRefs = (refs: ZoteroHostItemRefInput[]) =>
    Array.from(
      new Map(
        refs
          .map(canonicalItemRef)
          .map((ref) => [membershipRefIdentity(ref), ref]),
      ).values(),
    ).sort((left, right) => {
      const leftId = membershipRefIdentity(left);
      const rightId = membershipRefIdentity(right);
      return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
    });
  const addRefs = normalizeRefs(add);
  const removeRefs = normalizeRefs(remove);
  if (
    (!options.allowEmpty && addRefs.length + removeRefs.length === 0) ||
    addRefs.length + removeRefs.length > mutationPreviewTargetLimit ||
    addRefs.some((ref) =>
      removeRefs.some(
        (other) => membershipRefIdentity(other) === membershipRefIdentity(ref),
      ),
    )
  ) {
    throw new MutationAuthorityExecutionError(
      "failed",
      "invalid_request",
      "validation",
      "refresh_and_retry_new_operation",
      { reason: "invalid_combination", operation },
      "membership delta is empty, overlapping, or exceeds the hard limit",
    );
  }
  return { addRefs, removeRefs };
}

function resolveCollectionMembershipTargets(
  operation: "collection.create" | "collection.updateMembership",
  refs: ZoteroHostItemRefInput[],
  libraryId: number,
) {
  return refs.map((ref) => {
    if (ref.libraryId !== libraryId) {
      throw new MutationAuthorityExecutionError(
        "failed",
        "invalid_request",
        "validation",
        "refresh_and_retry_new_operation",
        { reason: "invalid_combination", operation },
        "collection membership targets must belong to one library",
      );
    }
    const item = requireItem(ref, "member item");
    if (normalizeLibraryId(item.libraryID) !== libraryId) {
      throw new MutationAuthorityExecutionError(
        "failed",
        "invalid_request",
        "validation",
        "refresh_and_retry_new_operation",
        { reason: "invalid_combination", operation },
        "collection membership targets must belong to one library",
      );
    }
    if (canonicalItemState(item) !== "active") {
      throw new MutationAuthorityExecutionError(
        "failed",
        "invalid_request",
        "validation",
        "refresh_and_retry_new_operation",
        { reason: "invalid_value", operation },
        "collection membership targets must be active items",
      );
    }
    if (item.isAttachment?.() || (item as any).isAnnotation?.()) {
      throw new MutationAuthorityExecutionError(
        "failed",
        "invalid_ref",
        "validation",
        "refresh_and_retry_new_operation",
        { kind: "item", reason: "wrong_kind" },
        "collection membership targets must be regular items or notes",
      );
    }
    return { ref, item };
  });
}

function assertCollectionPlacementTarget(
  operation: "collection.update",
  collection: Zotero.Collection,
  collectionRef: ZoteroHostCollectionRefInput,
  parentRef: ZoteroHostCollectionRefInput,
) {
  const parent = resolveCollection(parentRef);
  if (!parent) throw notFoundError("collection", parentRef);
  if (
    normalizeLibraryId((parent as any).libraryID) !== collectionRef.libraryId
  ) {
    throw new MutationAuthorityExecutionError(
      "failed",
      "invalid_request",
      "validation",
      "refresh_and_retry_new_operation",
      { reason: "invalid_combination", operation },
      "collection parent must belong to the same library",
    );
  }
  const targetId = Number((collection as any).id);
  const visited = new Set<number>();
  let cursor: Zotero.Collection | null = parent;
  while (cursor) {
    const cursorId = Number((cursor as any).id);
    if (cursorId === targetId) {
      throw new MutationAuthorityExecutionError(
        "failed",
        "invalid_request",
        "validation",
        "refresh_and_retry_new_operation",
        { reason: "invalid_combination", operation },
        "collection parent would create a cycle",
      );
    }
    if (visited.has(cursorId)) {
      throw new MutationAuthorityExecutionError(
        "failed",
        "conflict",
        "validation",
        "refresh_and_retry_new_operation",
        { reason: "ambiguous_state" },
        "collection ancestor chain contains a cycle",
      );
    }
    visited.add(cursorId);
    const parentId: number = Number((cursor as any).parentID || 0);
    if (!parentId) break;
    cursor =
      (
        resolveZotero().Collections as unknown as {
          get?: (id: number) => Zotero.Collection | undefined;
        }
      ).get?.(parentId) || null;
    if (!cursor) {
      throw new MutationAuthorityExecutionError(
        "failed",
        "conflict",
        "validation",
        "refresh_and_retry_new_operation",
        { reason: "ambiguous_state" },
        "collection ancestor chain could not be fully read",
      );
    }
  }
  return parent;
}

async function executeOtherCanonicalMutation(
  request: Exclude<
    MutationExecuteRequest,
    | { operation: "item.create" }
    | { operation: "item.updateMetadata" }
    | { operation: "item.changeType" }
    | { operation: "collection.remove" }
  >,
  scope: ZoteroHostMutationCallerScope,
  control?: WorkflowCallControl,
): Promise<MutationExecutionResult<JsonObject>> {
  const operationId = trimText(request.operationId, 129);
  if (!operationId || operationId.length > 128) {
    throw capabilityError("invalid_request", "operationId is invalid", {
      reason: "invalid_value",
      field: "operationId",
      operation: request.operation,
    });
  }
  assertWorkflowHostStrictJsonValue(request as unknown as JsonValue);
  try {
    return (await executeReservedMutation<object>({
      scope,
      operationId,
      operation: request.operation,
      semanticInput: request as unknown as JsonValue,
      control,
      async execute() {
        switch (request.operation) {
          case "item.updateTags": {
            const itemRef = canonicalItemRef(request.itemRef);
            const { item, before, current } = await withZoteroHostSlice(
              control,
              () => {
                const item = requireItem(itemRef, "item");
                const before = assertExpectedItemRevision(
                  item,
                  request.expectedRevision,
                );
                return {
                  item,
                  before,
                  current: failClosedMutationTags(item, itemRef),
                };
              },
            );
            const add = Array.from(
              new Set(request.add.map((tag) => trimText(tag, TAG_TEXT_LIMIT))),
            );
            const remove = Array.from(
              new Set(
                request.remove.map((tag) => trimText(tag, TAG_TEXT_LIMIT)),
              ),
            );
            if (
              add.length > TAG_LIMIT_MAX ||
              remove.length > TAG_LIMIT_MAX ||
              add.some((tag) => !tag) ||
              remove.some((tag) => !tag) ||
              add.some((tag) => remove.includes(tag)) ||
              [...add, ...remove].some((tag) => tag.startsWith("status:"))
            ) {
              throw new MutationAuthorityExecutionError(
                "failed",
                "invalid_request",
                "validation",
                "refresh_and_retry_new_operation",
                { reason: "invalid_combination", operation: request.operation },
                "tag delta is invalid",
              );
            }
            const next = current
              .filter((tag) => !remove.includes(tag))
              .concat(add.filter((tag) => !current.includes(tag)))
              .sort();
            const changed =
              JSON.stringify([...current].sort()) !== JSON.stringify(next);
            if (changed)
              await withZoteroHostSlice(control, () =>
                handlers.tag.update(item, next),
              );
            return withZoteroHostSlice(control, () => {
              const afterItem = requireItem(itemRef, "item");
              const after = canonicalItemVersion(afterItem);
              return {
                outcome: changed
                  ? ("committed" as const)
                  : ("unchanged" as const),
                changes: [
                  {
                    entity: { kind: "item" as const, ref: itemRef },
                    effect: changed
                      ? ("updated" as const)
                      : ("unchanged" as const),
                    before,
                    after,
                  },
                ],
                result: { item: canonicalMutationItemResult(afterItem) },
              };
            });
          }
          case "item.addRelated":
          case "item.removeRelated": {
            const sourceRef = canonicalItemRef(request.sourceRef);
            const relatedRef = canonicalItemRef(request.relatedRef);
            const rejectRelatedValidation = (
              reason: "invalid_value" | "invalid_combination",
              message: string,
              field?: string,
            ): never => {
              throw new MutationAuthorityExecutionError(
                "failed",
                "invalid_request",
                "validation",
                "refresh_and_retry_new_operation",
                {
                  reason,
                  operation: request.operation,
                  ...(field ? { field } : {}),
                },
                message,
              );
            };
            if (
              sourceRef.libraryId === relatedRef.libraryId &&
              sourceRef.key === relatedRef.key
            ) {
              rejectRelatedValidation(
                "invalid_combination",
                "related item endpoints must be distinct",
              );
            }
            if (sourceRef.libraryId !== relatedRef.libraryId) {
              rejectRelatedValidation(
                "invalid_combination",
                "related item endpoints must belong to one library",
              );
            }
            const { source, related, before, current } =
              await withZoteroHostSlice(control, () => {
                const source = requireItem(sourceRef, "source item");
                const related = requireItem(relatedRef, "related item");
                if (canonicalItemState(source) !== "active") {
                  rejectRelatedValidation(
                    "invalid_value",
                    "source item is deleted or trashed",
                    "sourceRef",
                  );
                }
                if (canonicalItemState(related) !== "active") {
                  rejectRelatedValidation(
                    "invalid_value",
                    "related item is deleted or trashed",
                    "relatedRef",
                  );
                }
                const before = assertExpectedItemRevision(
                  source,
                  request.expectedRevision,
                );
                const current = Array.isArray((source as any).relatedItems)
                  ? [...(source as any).relatedItems]
                  : [];
                return { source, related, before, current };
              });
            const present = current.includes(related.key);
            const shouldBePresent = request.operation === "item.addRelated";
            const changed = present !== shouldBePresent;
            if (changed) {
              if (shouldBePresent)
                await withZoteroHostSlice(control, () =>
                  handlers.parent.addRelated(source, related),
                );
              else
                await withZoteroHostSlice(control, () =>
                  handlers.parent.removeRelated(source, related),
                );
            }
            return withZoteroHostSlice(control, () => {
              const afterItem = requireItem(sourceRef, "source item");
              const after = canonicalItemVersion(afterItem);
              return {
                outcome: changed
                  ? ("committed" as const)
                  : ("unchanged" as const),
                changes: [
                  {
                    entity: { kind: "item" as const, ref: sourceRef },
                    effect: changed
                      ? ("updated" as const)
                      : ("unchanged" as const),
                    before,
                    after,
                  },
                ],
                result: {
                  sourceRef,
                  relatedRef,
                  outcome:
                    request.operation === "item.addRelated"
                      ? changed
                        ? "added"
                        : "already_present"
                      : changed
                        ? "removed"
                        : "already_absent",
                  sourceRevision: after.revision,
                },
              };
            });
          }
          case "item.remove": {
            const itemRef = canonicalItemRef(request.itemRef);
            const { item, before } = await withZoteroHostSlice(control, () => {
              const item = requireItem(itemRef, "item");
              return {
                item,
                before: assertExpectedItemRevision(
                  item,
                  request.expectedRevision,
                ),
              };
            });
            if (request.disposition !== "trash") {
              throw new MutationAuthorityExecutionError(
                "failed",
                "unsupported_operation",
                "validation",
                "refresh_and_retry_new_operation",
                { memberOrOperation: "item.remove:permanent" },
                "permanent item removal requires validated preview execution",
              );
            }
            if (before.state === "trashed") {
              return {
                outcome: "unchanged",
                changes: [
                  {
                    entity: { kind: "item", ref: itemRef },
                    effect: "unchanged",
                    before,
                    after: before,
                  },
                ],
                result: { itemRef, outcome: "already_trashed" },
              };
            }
            await withZoteroHostSlice(control, () => handlers.item.trash(item));
            return withZoteroHostSlice(control, () => {
              const afterItem = requireItem(itemRef, "item");
              const after = canonicalItemVersion(afterItem);
              return {
                outcome: "committed" as const,
                changes: [
                  {
                    entity: { kind: "item" as const, ref: itemRef },
                    effect: "trashed" as const,
                    before,
                    after,
                  },
                ],
                result: { itemRef, outcome: "trashed" },
              };
            });
          }
          case "collection.create": {
            const name = trimText(request.name, 1024);
            if (!name) {
              throw new MutationAuthorityExecutionError(
                "failed",
                "invalid_request",
                "validation",
                "retry_same_operation",
                {
                  reason: "invalid_value",
                  field: "name",
                  operation: request.operation,
                },
                "collection name is required",
              );
            }
            const initialMemberRefs = (request.initialMemberRefs || []).map(
              (ref) => canonicalItemRef(ref),
            );
            const { parent, libraryId, members, memberBefore } =
              await withZoteroHostSlice(control, () => {
                let parent: Zotero.Collection | null = null;
                let libraryId = normalizeLibraryId(undefined);
                if (request.placement.kind === "root") {
                  libraryId =
                    parsePositiveInteger(request.placement.libraryId) ||
                    libraryId;
                } else {
                  parent = resolveCollection(
                    canonicalCollectionRef(request.placement.parentRef),
                  );
                  if (!parent)
                    throw notFoundError(
                      "collection",
                      request.placement.parentRef,
                    );
                  libraryId = normalizeLibraryId((parent as any).libraryID);
                }
                const members = initialMemberRefs.length
                  ? resolveCollectionMembershipTargets(
                      request.operation,
                      normalizeCollectionMembershipRefs(
                        request.operation,
                        initialMemberRefs,
                        [],
                        { allowEmpty: true },
                      ).addRefs,
                      libraryId,
                    )
                  : [];
                const memberBefore = new Map(
                  members.map(({ ref, item }) => [
                    membershipRefIdentity(ref),
                    canonicalItemVersion(item),
                  ]),
                );
                return { parent, libraryId, members, memberBefore };
              });
            let created: Zotero.Collection | null = null;
            try {
              created = await withZoteroHostSlice(control, () =>
                handlers.collection.create({
                  name,
                  libraryID: libraryId,
                }),
              );
              if (parent) {
                await withZoteroHostSlice(control, () =>
                  handlers.collection.update(created!, {
                    parentID: Number((parent as any).id),
                  }),
                );
              }
              for (const { item } of members)
                await withZoteroHostSlice(control, () =>
                  handlers.collection.add(item, created!),
                );
              const createdId = await withZoteroHostSlice(control, () =>
                Number((created as any).id),
              );
              for (const { ref } of members) {
                const confirmed = await withZoteroHostSlice(control, () =>
                  requireItem(ref, "initial member")
                    .getCollections()
                    .includes(createdId),
                );
                if (!confirmed) {
                  throw new MutationAuthorityExecutionError(
                    "unknown",
                    "execution_failed",
                    "verification",
                    "reconcile",
                    { phase: "verification", recovery: "reconcile" },
                    "initial collection membership could not be confirmed",
                    [{ kind: "item", ref }],
                  );
                }
              }
            } catch (error) {
              if (created) {
                try {
                  await withZoteroHostSlice(control, () =>
                    handlers.collection.delete(created!),
                  );
                } catch {
                  const ref = await withZoteroHostSlice(control, () => ({
                    libraryId,
                    key: trimText((created as any).key),
                  }));
                  throw new MutationAuthorityExecutionError(
                    "repair_required",
                    "execution_failed",
                    "compensation",
                    "manual_repair",
                    {
                      phase: "cleanup",
                      recovery: "manual_repair",
                      residualCount: 1,
                    },
                    error instanceof Error
                      ? error.message
                      : "collection create failed",
                    [{ kind: "collection", ref }],
                    [{ kind: "collection", ref }],
                  );
                }
              }
              throw error;
            }
            return withZoteroHostSlice(control, () => {
              const ref = { libraryId, key: trimText((created as any).key) };
              const after = canonicalCollectionVersion(created!);
              return {
                outcome: "committed" as const,
                changes: [
                  {
                    entity: { kind: "collection" as const, ref },
                    effect: "created" as const,
                    before: null,
                    after,
                  },
                  ...members.map(({ ref: memberRef }) => ({
                    entity: { kind: "item" as const, ref: memberRef },
                    effect: "updated" as const,
                    before: memberBefore.get(membershipRefIdentity(memberRef))!,
                    after: canonicalItemVersion(
                      requireItem(memberRef, "initial member"),
                    ),
                  })),
                ],
                result: {
                  collection: canonicalMutationCollectionResult(created!),
                },
              };
            });
          }
          case "collection.update": {
            const collectionRef = canonicalCollectionRef(request.collectionRef);
            const { collection, before, patch, changed } =
              await withZoteroHostSlice(control, () => {
                const collection = resolveCollection(collectionRef);
                if (!collection)
                  throw notFoundError("collection", collectionRef);
                const before = assertExpectedCollectionRevision(
                  collection,
                  request.expectedRevision,
                );
                const patch: { name?: string; parentID?: number | null } = {};
                if (request.patch.name !== undefined)
                  patch.name = trimText(request.patch.name, 1024);
                if (request.patch.parentRef !== undefined) {
                  if (request.patch.parentRef === null) patch.parentID = null;
                  else {
                    const parent = assertCollectionPlacementTarget(
                      request.operation,
                      collection,
                      collectionRef,
                      canonicalCollectionRef(request.patch.parentRef),
                    );
                    patch.parentID = Number((parent as any).id);
                  }
                }
                const dto = serializeCollection(collection);
                const changed =
                  (patch.name !== undefined && patch.name !== dto.name) ||
                  (patch.parentID !== undefined &&
                    patch.parentID !== Number(dto.parentId || 0));
                return { collection, before, patch, changed };
              });
            if (changed)
              await withZoteroHostSlice(control, () =>
                handlers.collection.update(collection, patch),
              );
            return withZoteroHostSlice(control, () => {
              const afterCollection = resolveCollection(collectionRef)!;
              const after = canonicalCollectionVersion(afterCollection);
              return {
                outcome: changed
                  ? ("committed" as const)
                  : ("unchanged" as const),
                changes: [
                  {
                    entity: { kind: "collection" as const, ref: collectionRef },
                    effect: changed
                      ? ("updated" as const)
                      : ("unchanged" as const),
                    before,
                    after,
                  },
                ],
                result: {
                  collection:
                    canonicalMutationCollectionResult(afterCollection),
                },
              };
            });
          }
          case "collection.updateMembership": {
            const collectionRef = canonicalCollectionRef(request.collectionRef);
            const refIdentity = membershipRefIdentity;
            const { addRefs, removeRefs } = normalizeCollectionMembershipRefs(
              request.operation,
              request.add,
              request.remove,
            );
            const {
              collection,
              before,
              collectionId,
              itemBefore,
              additions,
              removals,
            } = await withZoteroHostSlice(control, () => {
              const collection = resolveCollection(collectionRef);
              if (!collection) throw notFoundError("collection", collectionRef);
              const before = assertExpectedCollectionRevision(
                collection,
                request.expectedRevision,
              );
              const collectionId = Number((collection as { id?: unknown }).id);
              const targets = resolveCollectionMembershipTargets(
                request.operation,
                [...addRefs, ...removeRefs],
                collectionRef.libraryId,
              );
              const itemBefore = new Map(
                targets.map(({ ref, item }) => [
                  refIdentity(ref),
                  canonicalItemVersion(item),
                ]),
              );
              const additions = targets.filter(
                ({ ref, item }) =>
                  addRefs.some(
                    (candidate) => refIdentity(candidate) === refIdentity(ref),
                  ) && !item.getCollections().includes(collectionId),
              );
              const removals = targets.filter(
                ({ ref, item }) =>
                  removeRefs.some(
                    (candidate) => refIdentity(candidate) === refIdentity(ref),
                  ) && item.getCollections().includes(collectionId),
              );
              return {
                collection,
                before,
                collectionId,
                itemBefore,
                additions,
                removals,
              };
            });
            const addedRefs: typeof addRefs = [];
            const removedRefs: typeof removeRefs = [];
            const applied: Array<{
              kind: "add" | "remove";
              ref: ZoteroHostItemRefInput;
              item: Zotero.Item;
            }> = [];
            try {
              for (const { ref, item } of additions) {
                await withZoteroHostSlice(control, () =>
                  handlers.collection.add(item, collection),
                );
                applied.push({ kind: "add", ref, item });
                addedRefs.push(ref);
              }
              for (const { ref, item } of removals) {
                await withZoteroHostSlice(control, () =>
                  handlers.collection.remove(item, collection),
                );
                applied.push({ kind: "remove", ref, item });
                removedRefs.push(ref);
              }
            } catch (primary) {
              const residualRefs: MutationEntityRef[] = [];
              for (const entry of [...applied].reverse()) {
                try {
                  if (entry.kind === "add") {
                    await withZoteroHostSlice(control, () =>
                      handlers.collection.remove(entry.item, collection),
                    );
                  } else {
                    await withZoteroHostSlice(control, () =>
                      handlers.collection.add(entry.item, collection),
                    );
                  }
                } catch {
                  residualRefs.push({ kind: "item", ref: entry.ref });
                }
              }
              throw new MutationAuthorityExecutionError(
                residualRefs.length ? "repair_required" : "failed",
                "execution_failed",
                "compensation",
                residualRefs.length ? "manual_repair" : "retry_same_operation",
                {
                  phase: "cleanup",
                  recovery: residualRefs.length
                    ? "manual_repair"
                    : "retry_same_operation",
                  affectedCount: applied.length,
                  residualCount: residualRefs.length,
                },
                primary instanceof Error
                  ? primary.message
                  : "collection membership update failed",
                applied.map((entry) => ({ kind: "item", ref: entry.ref })),
                residualRefs,
              );
            }
            const changed = addedRefs.length + removedRefs.length > 0;
            for (const { ref } of additions) {
              const confirmed = await withZoteroHostSlice(control, () =>
                requireItem(ref, "member item")
                  .getCollections()
                  .includes(collectionId),
              );
              if (!confirmed) {
                throw new MutationAuthorityExecutionError(
                  "unknown",
                  "execution_failed",
                  "verification",
                  "reconcile",
                  { phase: "verification", recovery: "reconcile" },
                  "added collection membership could not be confirmed",
                  [{ kind: "item", ref }],
                );
              }
            }
            for (const { ref } of removals) {
              const confirmed = await withZoteroHostSlice(control, () =>
                requireItem(ref, "member item")
                  .getCollections()
                  .includes(collectionId),
              );
              if (confirmed) {
                throw new MutationAuthorityExecutionError(
                  "unknown",
                  "execution_failed",
                  "verification",
                  "reconcile",
                  { phase: "verification", recovery: "reconcile" },
                  "removed collection membership could not be confirmed",
                  [{ kind: "item", ref }],
                );
              }
            }
            const final = await withZoteroHostSlice(control, () => {
              const afterCollection = resolveCollection(collectionRef);
              if (!afterCollection) {
                throw new MutationAuthorityExecutionError(
                  "unknown",
                  "execution_failed",
                  "verification",
                  "reconcile",
                  { phase: "verification", recovery: "reconcile" },
                  "collection disappeared during membership verification",
                );
              }
              const after = canonicalCollectionVersion(afterCollection);
              const itemAfter = new Map(
                [...addedRefs, ...removedRefs].map((ref) => [
                  refIdentity(ref),
                  canonicalItemVersion(requireItem(ref, "member item")),
                ]),
              );
              return {
                after,
                itemAfter,
                collection: canonicalMutationCollectionResult(afterCollection),
              };
            });
            const changedItems = [...addedRefs, ...removedRefs];
            const changes: MutationChangeDto[] = [
              {
                entity: { kind: "collection", ref: collectionRef },
                effect: changed ? "updated" : "unchanged",
                before,
                after: final.after,
              },
              ...changedItems.map((ref) => ({
                entity: { kind: "item" as const, ref },
                effect: "updated" as const,
                before: itemBefore.get(refIdentity(ref)) || null,
                after: final.itemAfter.get(refIdentity(ref))!,
              })),
            ];
            return {
              outcome: changed ? "committed" : "unchanged",
              changes,
              result: {
                collection: final.collection,
                addedRefs,
                removedRefs,
              },
            };
          }
        }
      },
    })) as MutationExecutionResult<JsonObject>;
  } catch (error) {
    if (error instanceof MutationAuthorityAdmissionError)
      throw mutationAdmissionError(error);
    throw error;
  }
}

async function executeDestructiveCanonicalMutation(
  request:
    | Extract<MutationExecuteRequest, { operation: "item.remove" }>
    | Extract<MutationExecuteRequest, { operation: "collection.remove" }>,
  scope: ZoteroHostMutationCallerScope,
  control?: WorkflowCallControl,
): Promise<MutationExecutionResult<JsonObject>> {
  const operationId = trimText(request.operationId, 129);
  if (!operationId || operationId.length > 128) {
    throw capabilityError("invalid_request", "operationId is invalid", {
      reason: "invalid_value",
      field: "operationId",
      operation: request.operation,
    });
  }
  try {
    return (await executeReservedMutation<object>({
      scope,
      operationId,
      operation: request.operation,
      semanticInput: request as unknown as JsonValue,
      control,
      async execute() {
        if (request.operation === "item.remove") {
          if (request.disposition !== "permanent") {
            throw new MutationAuthorityExecutionError(
              "failed",
              "invalid_request",
              "validation",
              "refresh_and_retry_new_operation",
              { reason: "invalid_combination", operation: request.operation },
              "destructive execution requires permanent disposition",
            );
          }
          const previewRequest = {
            operation: "item.remove" as const,
            itemRef: canonicalItemRef(request.itemRef),
            disposition: "permanent" as const,
            childPolicy: request.childPolicy,
          };
          const preview = await withZoteroHostSlice(control, () =>
            previewCanonicalMutation(previewRequest, scope),
          );
          discardMutationPreviewToken(preview.token.value);
          validateMutationPreviewToken({
            scope,
            token: request.previewToken,
            operation: "item.remove",
            semanticInput: previewRequest,
            plan: preview.plan,
            observations: preview.observations,
          });
          const plan = preview.plan as MutationPlanByOperation["item.remove"];
          if (plan.revision !== request.expectedRevision) {
            throw new MutationAuthorityExecutionError(
              "failed",
              "conflict",
              "read",
              "refresh_and_retry_new_operation",
              { reason: "revision_mismatch", kind: "item" },
              "item removal revision no longer matches preview",
            );
          }
          if (
            request.childPolicy === "reject_if_present" &&
            plan.children.length
          ) {
            throw new MutationAuthorityExecutionError(
              "failed",
              "conflict",
              "read",
              "refresh_and_retry_new_operation",
              { reason: "ambiguous_state", kind: "item" },
              "item has children and childPolicy rejects removal",
            );
          }
          const targetRefs = [
            ...plan.children.map((entry) => entry.ref),
            plan.itemRef,
          ];
          const beforeVersions = new Map(
            preview.observations
              .filter((entry) => entry.entity.kind === "item")
              .map((entry) => [entry.entity.ref.key, entry.version]),
          );
          const deleted: typeof targetRefs = [];
          try {
            for (const ref of targetRefs) {
              const item = await withZoteroHostSlice(control, () =>
                requireItem(ref, "removal target"),
              );
              await withZoteroHostSlice(control, () =>
                handlers.item.remove(item),
              );
              deleted.push(ref);
            }
          } catch (error) {
            const remaining = targetRefs.filter(
              (ref) => !deleted.some((entry) => entry.key === ref.key),
            );
            throw new MutationAuthorityExecutionError(
              deleted.length ? "repair_required" : "failed",
              "execution_failed",
              "commit",
              deleted.length ? "manual_repair" : "retry_same_operation",
              {
                phase: "commit",
                recovery: deleted.length
                  ? "manual_repair"
                  : "retry_same_operation",
                affectedCount: deleted.length,
                residualCount: remaining.length,
              },
              error instanceof Error ? error.message : "item removal failed",
              deleted.map((ref) => ({ kind: "item" as const, ref })),
              remaining.map((ref) => ({ kind: "item" as const, ref })),
            );
          }
          const changes: MutationChangeDto[] = targetRefs.map((ref) => ({
            entity: { kind: "item", ref },
            effect: "deleted",
            before: beforeVersions.get(ref.key) || null,
            after: {
              revision: hashSynthesisContractCanonicalJson({
                ref,
                state: "deleted",
                operationId,
              }),
              state: "deleted",
            },
          }));
          return {
            outcome: "committed",
            changes,
            result: { itemRef: plan.itemRef, outcome: "permanently_deleted" },
          };
        }

        const previewRequest = {
          operation: "collection.remove" as const,
          collectionRef: canonicalCollectionRef(request.collectionRef),
          childPolicy: request.childPolicy,
        };
        const preview = await withZoteroHostSlice(control, () =>
          previewCanonicalMutation(previewRequest, scope),
        );
        discardMutationPreviewToken(preview.token.value);
        validateMutationPreviewToken({
          scope,
          token: request.previewToken,
          operation: "collection.remove",
          semanticInput: previewRequest,
          plan: preview.plan,
          observations: preview.observations,
        });
        const plan =
          preview.plan as MutationPlanByOperation["collection.remove"];
        const target = plan.deletedCollections[0];
        if (!target || target.revision !== request.expectedRevision) {
          throw new MutationAuthorityExecutionError(
            "failed",
            "conflict",
            "read",
            "refresh_and_retry_new_operation",
            { reason: "revision_mismatch", kind: "collection" },
            "collection removal revision no longer matches preview",
          );
        }
        if (
          request.childPolicy === "reject_if_present" &&
          plan.deletedCollections.length > 1
        ) {
          throw new MutationAuthorityExecutionError(
            "failed",
            "conflict",
            "read",
            "refresh_and_retry_new_operation",
            { reason: "ambiguous_state", kind: "collection" },
            "collection has descendants and childPolicy rejects removal",
          );
        }
        const itemBefore = new Map(
          preview.observations
            .filter((entry) => entry.entity.kind === "item")
            .map((entry) => [entry.entity.ref.key, entry.version]),
        );
        try {
          for (const membership of plan.detachedMemberships) {
            const target = await withZoteroHostSlice(control, () => {
              const item = requireItem(membership.itemRef, "collection member");
              const collection = resolveCollection(membership.collectionRef);
              return { item, collection };
            });
            if (target.collection)
              await withZoteroHostSlice(control, () =>
                handlers.collection.remove(target.item, target.collection!),
              );
          }
          for (const entry of [...plan.deletedCollections].reverse()) {
            const collection = await withZoteroHostSlice(control, () =>
              resolveCollection(entry.ref),
            );
            if (collection)
              await withZoteroHostSlice(control, () =>
                handlers.collection.delete(collection),
              );
          }
        } catch (error) {
          throw new MutationAuthorityExecutionError(
            "repair_required",
            "execution_failed",
            "commit",
            "manual_repair",
            {
              phase: "commit",
              recovery: "manual_repair",
              residualCount: plan.deletedCollections.length,
            },
            error instanceof Error
              ? error.message
              : "collection removal failed",
            [],
            plan.deletedCollections.map((entry) => ({
              kind: "collection" as const,
              ref: entry.ref,
            })),
          );
        }
        const detachedItems = await withZoteroHostSlice(
          control,
          () =>
            new Map(
              plan.detachedMemberships.map((entry) => [
                entry.itemRef.key,
                canonicalItemVersion(
                  requireItem(entry.itemRef, "detached member"),
                ),
              ]),
            ),
        );
        const changes: MutationChangeDto[] = [
          ...plan.deletedCollections.map((entry) => ({
            entity: { kind: "collection" as const, ref: entry.ref },
            effect: "deleted" as const,
            before: { revision: entry.revision, state: "active" as const },
            after: {
              revision: hashSynthesisContractCanonicalJson({
                ref: entry.ref,
                state: "deleted",
                operationId,
              }),
              state: "deleted" as const,
            },
          })),
          ...Array.from(
            new Map(
              plan.detachedMemberships.map((entry) => [
                entry.itemRef.key,
                entry.itemRef,
              ]),
            ).values(),
          ).map((ref) => {
            return {
              entity: { kind: "item" as const, ref },
              effect: "updated" as const,
              before: itemBefore.get(ref.key) || null,
              after: detachedItems.get(ref.key)!,
            };
          }),
        ];
        return {
          outcome: "committed",
          changes,
          result: { removedRef: plan.collectionRef },
        };
      },
    })) as MutationExecutionResult<JsonObject>;
  } catch (error) {
    if (error instanceof MutationAuthorityAdmissionError)
      throw mutationAdmissionError(error);
    throw error;
  }
}

const CANONICAL_MUTATION_OPERATIONS: ReadonlySet<string> = new Set([
  "item.create",
  "item.updateMetadata",
  "item.changeType",
  "item.remove",
  "item.updateTags",
  "item.addRelated",
  "item.removeRelated",
  "collection.create",
  "collection.update",
  "collection.updateMembership",
  "collection.remove",
]);

async function executeCanonicalMutation(
  request: MutationExecuteRequest,
  scope: ZoteroHostMutationCallerScope,
  control?: WorkflowCallControl,
): Promise<MutationExecutionResult<JsonObject>> {
  if (!CANONICAL_MUTATION_OPERATIONS.has(String(request?.operation))) {
    throw capabilityError(
      "unsupported_operation",
      "mutation operation is unsupported",
      {
        memberOrOperation:
          trimText((request as { operation?: unknown } | null)?.operation) ||
          "mutations.execute",
      },
    );
  }
  if (request?.operation === "item.create") {
    return executeItemCreate(request, scope, control);
  }
  if (request?.operation === "item.changeType") {
    return executeItemChangeType(request, scope, control);
  }
  if (
    request?.operation === "collection.remove" ||
    (request?.operation === "item.remove" &&
      request.disposition === "permanent")
  ) {
    return executeDestructiveCanonicalMutation(request, scope, control);
  }
  if (request?.operation !== "item.updateMetadata") {
    return executeOtherCanonicalMutation(request, scope, control);
  }
  const normalized = normalizeItemUpdateMetadataRequest(request);
  try {
    return await executeReservedMutation({
      scope,
      operationId: normalized.operationId,
      operation: normalized.operation,
      semanticInput: normalized as unknown as JsonValue,
      control,
      async execute() {
        const item = await withZoteroHostSlice(control, () =>
          requireItem(normalized.itemRef, "item"),
        );
        if (item.isNote?.() || item.isAttachment?.() || item.isAnnotation?.()) {
          throw new MutationAuthorityExecutionError(
            "failed",
            "invalid_ref",
            "read",
            "refresh_and_retry_new_operation",
            { kind: "item", reason: "wrong_kind" },
            "item.updateMetadata requires an active regular item",
          );
        }
        const before = await withZoteroHostSlice(control, () =>
          canonicalItemVersion(item),
        );
        if (
          normalized.expectedRevision &&
          normalized.expectedRevision !== before.revision
        ) {
          throw new MutationAuthorityExecutionError(
            "failed",
            "conflict",
            "read",
            "refresh_and_retry_new_operation",
            { reason: "revision_mismatch", kind: "item" },
            "item revision no longer matches expectedRevision",
          );
        }
        const { fields, fieldsChanged, creatorsChanged } =
          await withZoteroHostSlice(control, () => {
            let fields: ReturnType<typeof validateFieldPatch> | undefined;
            if (normalized.patch.fields) {
              try {
                fields = validateFieldPatch(item, normalized.patch.fields);
              } catch (error) {
                const invalidField = Object.entries(
                  normalized.patch.fields,
                ).find(([field, value]) => {
                  try {
                    validateFieldPatch(item, { [field]: value });
                    return false;
                  } catch {
                    return true;
                  }
                })?.[0];
                throw new MutationAuthorityExecutionError(
                  "failed",
                  "invalid_request",
                  "validation",
                  "refresh_and_retry_new_operation",
                  {
                    reason: "invalid_value",
                    field: invalidField
                      ? `patch.fields.${invalidField}`
                      : "patch.fields",
                    operation: "item.updateMetadata",
                  },
                  error instanceof Error
                    ? error.message
                    : "metadata field is invalid",
                );
              }
            }
            const currentCreators = (() => {
              try {
                return (
                  (
                    item as Zotero.Item & {
                      getCreators?: () => ZoteroHostMetadataCreatorDto[];
                    }
                  ).getCreators?.() || []
                );
              } catch {
                return [];
              }
            })();
            const fieldsChanged = Object.entries(fields || {}).some(
              ([field, value]) =>
                readField(item, field, FIELD_TEXT_LIMIT) !==
                String(value ?? ""),
            );
            const creatorsChanged =
              normalized.patch.creators !== undefined &&
              JSON.stringify(currentCreators) !==
                JSON.stringify(normalized.patch.creators);
            return { fields, fieldsChanged, creatorsChanged };
          });
        if (fieldsChanged || creatorsChanged) {
          try {
            await withZoteroHostSlice(control, () =>
              handlers.parent.updateMetadata(item, {
                fields,
                creators: normalized.patch.creators,
              }),
            );
          } catch (error) {
            throw new MutationAuthorityExecutionError(
              "failed",
              "execution_failed",
              "commit",
              "retry_same_operation",
              { phase: "commit", recovery: "retry_same_operation" },
              error instanceof Error ? error.message : "metadata update failed",
              [{ kind: "item", ref: normalized.itemRef }],
            );
          }
        }
        const { afterItem, after } = await withZoteroHostSlice(control, () => {
          const afterItem = requireItem(normalized.itemRef, "item");
          const after = canonicalItemVersion(afterItem);
          for (const [field, value] of Object.entries(fields || {})) {
            if (
              readField(afterItem, field, FIELD_TEXT_LIMIT) !==
              String(value ?? "")
            ) {
              throw new MutationAuthorityExecutionError(
                "unknown",
                "execution_failed",
                "verification",
                "reconcile",
                { phase: "verification", recovery: "reconcile" },
                "item metadata final state could not be confirmed",
                [{ kind: "item", ref: normalized.itemRef }],
              );
            }
          }
          return { afterItem, after };
        });
        const outcome =
          fieldsChanged || creatorsChanged ? "committed" : "unchanged";
        const change: MutationChangeDto = {
          entity: { kind: "item", ref: normalized.itemRef },
          effect: outcome === "committed" ? "updated" : "unchanged",
          before,
          after,
        };
        return {
          outcome,
          changes: [change],
          result: { item: canonicalMutationItemResult(afterItem) },
        };
      },
    });
  } catch (error) {
    if (error instanceof MutationAuthorityAdmissionError) {
      throw mutationAdmissionError(error);
    }
    throw error;
  }
}

function normalizeStatusTransitionKeys(
  values: unknown,
  field: "add" | "remove",
) {
  if (values === undefined) return [];
  if (!Array.isArray(values)) {
    throw capabilityError("invalid_request", "status key list is invalid", {
      reason: "invalid_type",
      field,
      operation: "statusTags.transition",
    });
  }
  const keys = Array.from(new Set(values.map((value) => trimText(value))));
  if (keys.length > 16) {
    throw capabilityError("resource_limited", "status key list is too large", {
      resource: "entries",
      limit: 16,
      observed: keys.length,
    });
  }
  if (keys.some((key) => !isBuiltinStatusKey(key))) {
    throw capabilityError("invalid_request", "status key is invalid", {
      reason: "unsupported_value",
      field,
      operation: "statusTags.transition",
    });
  }
  return keys as Array<Parameters<typeof getBuiltinStatusTag>[0]>;
}

async function executeStatusTagTransition(
  request: StatusTagTransitionRequestDto,
  scope: ZoteroHostMutationCallerScope,
  control?: WorkflowCallControl,
): Promise<MutationExecutionResult<StatusTagTransitionResultDto>> {
  const operationId = trimText(request.operationId, 129);
  const itemRef = canonicalItemRef(request.itemRef);
  const addKeys = normalizeStatusTransitionKeys(request.add, "add");
  const removeKeys = normalizeStatusTransitionKeys(request.remove, "remove");
  if (
    !operationId ||
    operationId.length > 128 ||
    (!addKeys.length && !removeKeys.length)
  ) {
    throw capabilityError("invalid_request", "status transition is empty", {
      reason: "missing_field",
      field: "add|remove",
      operation: "statusTags.transition",
    });
  }
  if (addKeys.some((key) => removeKeys.includes(key))) {
    throw capabilityError("invalid_request", "status add/remove sets overlap", {
      reason: "invalid_combination",
      operation: "statusTags.transition",
    });
  }
  const normalized = {
    operationId,
    itemRef,
    ...(request.expectedRevision
      ? { expectedRevision: trimText(request.expectedRevision, 512) }
      : {}),
    add: addKeys,
    remove: removeKeys,
  };
  try {
    return await executeReservedMutation({
      scope,
      operationId,
      operation: "statusTags.transition",
      semanticInput: normalized as unknown as JsonValue,
      control,
      async execute() {
        const { item, before, current } = await withZoteroHostSlice(
          control,
          () => {
            const item = requireItem(itemRef, "status item");
            return {
              item,
              before: assertExpectedItemRevision(
                item,
                normalized.expectedRevision,
              ),
              current: failClosedMutationTags(item, itemRef),
            };
          },
        );
        const addTags = addKeys.map(getBuiltinStatusTag);
        const removeTags = removeKeys.map(getBuiltinStatusTag);
        const added = addTags.filter((tag) => !current.includes(tag));
        const removed = removeTags.filter((tag) => current.includes(tag));
        const unchanged = [
          ...addTags.filter((tag) => current.includes(tag)),
          ...removeTags.filter((tag) => !current.includes(tag)),
        ];
        const next = current
          .filter((tag) => !removed.includes(tag as any))
          .concat(added)
          .sort();
        const changed = added.length + removed.length > 0;
        if (changed) {
          try {
            await withZoteroHostSlice(control, () =>
              handlers.tag.update(item, next),
            );
          } catch (error) {
            throw new MutationAuthorityExecutionError(
              "failed",
              "execution_failed",
              "commit",
              "retry_same_operation",
              { phase: "commit", recovery: "retry_same_operation" },
              error instanceof Error
                ? error.message
                : "status transition failed",
              [{ kind: "item", ref: itemRef }],
            );
          }
        }
        const { afterItem, after } = await withZoteroHostSlice(control, () => {
          const afterItem = requireItem(itemRef, "status item");
          let finalTags: string[];
          try {
            finalTags = canonicalTags(afterItem);
          } catch {
            throw new MutationAuthorityExecutionError(
              "unknown",
              "execution_failed",
              "verification",
              "reconcile",
              { phase: "verification", recovery: "reconcile" },
              "status transition final tags could not be read completely",
              [{ kind: "item", ref: itemRef }],
            );
          }
          if (
            addTags.some((tag) => !finalTags.includes(tag)) ||
            removeTags.some((tag) => finalTags.includes(tag))
          ) {
            throw new MutationAuthorityExecutionError(
              "unknown",
              "execution_failed",
              "verification",
              "reconcile",
              { phase: "verification", recovery: "reconcile" },
              "status transition final state could not be confirmed",
              [{ kind: "item", ref: itemRef }],
            );
          }
          return { afterItem, after: canonicalItemVersion(afterItem) };
        });
        return {
          outcome: changed ? "committed" : "unchanged",
          changes: [
            {
              entity: { kind: "item", ref: itemRef },
              effect: changed ? "updated" : "unchanged",
              before,
              after,
            },
          ],
          result: {
            itemRef,
            added,
            removed,
            unchanged,
            revision: after.revision,
          },
        };
      },
    });
  } catch (error) {
    if (error instanceof MutationAuthorityAdmissionError) {
      throw mutationAdmissionError(error);
    }
    throw error;
  }
}

function canonicalNoteResult(note: Zotero.Item) {
  const dto = serializeNote(note);
  return {
    ...dto,
    ref: { libraryId: dto.libraryId, key: dto.key },
    revision: canonicalNoteVersion(note).revision,
  };
}

function canonicalNoteVersion(note: Zotero.Item) {
  const base = canonicalItemVersion(note);
  return {
    ...base,
    revision: hashSynthesisContractCanonicalJson({
      baseRevision: base.revision,
      content: String(note.getNote?.() || ""),
    }),
  };
}

function assertExpectedNoteRevision(
  note: Zotero.Item,
  expectedRevision: string | undefined,
) {
  const version = canonicalNoteVersion(note);
  if (expectedRevision && expectedRevision !== version.revision) {
    throw new MutationAuthorityExecutionError(
      "failed",
      "conflict",
      "read",
      "refresh_and_retry_new_operation",
      { reason: "revision_mismatch", kind: "item" },
      "note revision no longer matches expectedRevision",
    );
  }
  return version;
}

function normalizeLogicalNotePayloadRequest(
  request: NotePayloadUpsertRequestDto,
): LogicalNotePayloadDto {
  const requestKeys = Object.keys(request as object);
  const unexpectedRequestKey = requestKeys.find(
    (key) =>
      key !== "operationId" &&
      key !== "noteRef" &&
      key !== "expectedRevision" &&
      key !== "payload",
  );
  if (unexpectedRequestKey || !request.payload) {
    throw capabilityError("invalid_request", "payload request is invalid", {
      reason: "invalid_schema",
      field: unexpectedRequestKey || "payload",
      operation: "notes.upsertPayload",
    });
  }
  const raw = request.payload as unknown as Record<string, unknown>;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw capabilityError("invalid_request", "logical payload is invalid", {
      reason: "invalid_type",
      field: "payload",
      operation: "notes.upsertPayload",
    });
  }
  const keys = Object.keys(raw);
  const unexpected = keys.find(
    (key) =>
      key !== "payloadType" &&
      key !== "noteKind" &&
      key !== "schemaVersion" &&
      key !== "format" &&
      key !== "value",
  );
  if (unexpected || keys.length !== 5) {
    throw capabilityError("invalid_request", "logical payload is invalid", {
      reason: "invalid_schema",
      field: unexpected ? `payload.${unexpected}` : "payload",
      operation: "notes.upsertPayload",
    });
  }
  const payloadType = String(raw.payloadType || "").trim();
  const noteKind = String(raw.noteKind || "").trim();
  const schemaVersion = String(raw.schemaVersion || "").trim();
  const format = raw.format;
  if (!NOTE_PAYLOAD_TYPE_RE.test(payloadType)) {
    throw capabilityError("invalid_request", "payload type is invalid", {
      reason: "invalid_value",
      field: "payload.payloadType",
      operation: "notes.upsertPayload",
    });
  }
  if (
    !noteKind ||
    noteKind.length > 80 ||
    !schemaVersion ||
    schemaVersion.length > 200
  ) {
    throw capabilityError("invalid_request", "payload identity is invalid", {
      reason: "invalid_value",
      field:
        !noteKind || noteKind.length > 80
          ? "payload.noteKind"
          : "payload.schemaVersion",
      operation: "notes.upsertPayload",
    });
  }
  if (format !== "json" && format !== "markdown" && format !== "text") {
    throw capabilityError("invalid_request", "payload format is invalid", {
      reason: "invalid_value",
      field: "payload.format",
      operation: "notes.upsertPayload",
    });
  }
  if (
    (format === "markdown" || format === "text") &&
    typeof raw.value !== "string"
  ) {
    throw capabilityError("invalid_request", "payload value is invalid", {
      reason: "invalid_type",
      field: "payload.value",
      operation: "notes.upsertPayload",
    });
  }
  let serialized: string;
  if (format === "json") {
    try {
      assertJsonValue(raw.value, "payload.value");
      serialized = JSON.stringify(raw.value);
    } catch {
      throw capabilityError("invalid_request", "payload value is invalid", {
        reason: "invalid_type",
        field: "payload.value",
        operation: "notes.upsertPayload",
      });
    }
  } else {
    serialized = raw.value as string;
  }
  const bytes = new TextEncoder().encode(serialized).byteLength;
  if (bytes > NOTE_PAYLOAD_MAX_BYTES) {
    throw capabilityError(
      "resource_limited",
      "note payload exceeds the limit",
      {
        resource: "bytes",
        limit: NOTE_PAYLOAD_MAX_BYTES,
        observed: bytes,
      },
    );
  }
  return {
    payloadType,
    noteKind,
    schemaVersion,
    format,
    value: raw.value as JsonValue,
  };
}

type ResolvedNoteImageBinding = {
  slot: string;
  blob: Blob;
};

function resolveNoteImageBindings(
  content: ReturnType<typeof normalizeNoteContentInput>,
  scope: ZoteroHostNoteMutationCallerScope,
): ResolvedNoteImageBinding[] {
  if (content.bindings.size === 0) return [];
  if (!scope.preparedImages) {
    throw capabilityError(
      "unavailable",
      "prepared-image owner is unavailable",
      {
        reason: "capability",
        kind: "prepared_image",
      },
    );
  }
  return [...content.bindings].map(([slot, binding]) => {
    const resolved = scope.preparedImages?.resolve(binding.preparedImage);
    if (!resolved?.blob) {
      throw capabilityError("invalid_ref", "prepared image is invalid", {
        kind: "prepared_image",
        reason: "forged",
      });
    }
    if (
      resolved.blob.type !== "image/jpeg" &&
      resolved.blob.type !== "image/png"
    ) {
      throw capabilityError("invalid_ref", "prepared image has invalid MIME", {
        kind: "prepared_image",
        reason: "wrong_kind",
      });
    }
    return { slot, blob: resolved.blob };
  });
}

async function cleanupNoteMutationItems(
  items: Zotero.Item[],
  control?: WorkflowCallControl,
) {
  const residualRefs: MutationEntityRef[] = [];
  for (const item of [...items].reverse()) {
    try {
      await withZoteroHostSlice(control, () => handlers.item.remove(item));
    } catch {
      const key = trimText(item.key);
      if (key) {
        residualRefs.push({
          kind: "item",
          ref: {
            libraryId: normalizeLibraryId(item.libraryID),
            key,
          },
        });
      }
    }
  }
  return residualRefs;
}

async function importPreparedNoteImages(
  note: Zotero.Item,
  bindings: ResolvedNoteImageBinding[],
  control?: WorkflowCallControl,
) {
  const zotero = resolveZotero();
  if (typeof zotero.Attachments?.importEmbeddedImage !== "function") {
    throw new MutationAuthorityExecutionError(
      "failed",
      "unavailable",
      "staging",
      "retry_same_operation",
      { reason: "capability", kind: "attachment" },
      "Zotero embedded image import is unavailable",
    );
  }
  const attachments: Zotero.Item[] = [];
  const attachmentKeys = new Map<string, string>();
  try {
    for (const binding of bindings) {
      const attachment = await withZoteroHostSlice(control, () =>
        zotero.Attachments.importEmbeddedImage({
          blob: binding.blob,
          parentItemID: note.id,
        }),
      );
      const key = trimText(attachment?.key);
      if (!key) throw new Error("embedded image attachment has no key");
      attachments.push(attachment);
      attachmentKeys.set(binding.slot, key);
    }
    return { attachments, attachmentKeys };
  } catch (error) {
    const residualRefs = await cleanupNoteMutationItems(attachments, control);
    throw new MutationAuthorityExecutionError(
      residualRefs.length ? "repair_required" : "failed",
      "execution_failed",
      "staging",
      residualRefs.length ? "manual_repair" : "retry_same_operation",
      {
        phase: "staging",
        recovery: residualRefs.length
          ? "manual_repair"
          : "retry_same_operation",
        affectedCount: attachments.length,
        residualCount: residualRefs.length,
      },
      error instanceof Error ? error.message : "embedded image staging failed",
      attachments.map((attachment) => ({
        kind: "item" as const,
        ref: {
          libraryId: normalizeLibraryId(attachment.libraryID),
          key: trimText(attachment.key),
        },
      })),
      residualRefs,
    );
  }
}

async function executeNoteMutation(
  request:
    | NoteCreateRequestDto
    | NoteUpdateContentRequestDto
    | NoteRemoveRequestDto
    | NotePayloadUpsertRequestDto,
  operation:
    | "notes.create"
    | "notes.updateContent"
    | "notes.remove"
    | "notes.upsertPayload",
  scope: ZoteroHostNoteMutationCallerScope,
  control?: WorkflowCallControl,
): Promise<MutationExecutionResult<JsonObject>> {
  const operationId = trimText(request.operationId, 129);
  if (!operationId || operationId.length > 128) {
    throw capabilityError("invalid_request", "operationId is invalid", {
      reason: "invalid_value",
      field: "operationId",
      operation,
    });
  }
  const noteCreate =
    operation === "notes.create"
      ? resolveNoteCreateRequest(request as NoteCreateRequestDto)
      : null;
  const noteContent =
    operation === "notes.create" || operation === "notes.updateContent"
      ? normalizeNoteContentInput(
          (request as NoteCreateRequestDto | NoteUpdateContentRequestDto)
            .content,
        )
      : null;
  const resolvedImages = noteContent
    ? resolveNoteImageBindings(noteContent, scope)
    : [];
  const logicalPayload =
    operation === "notes.upsertPayload"
      ? normalizeLogicalNotePayloadRequest(
          request as NotePayloadUpsertRequestDto,
        )
      : null;
  if (logicalPayload) {
    const note = await withZoteroHostSlice(control, () =>
      requireNote(
        canonicalItemRef((request as NotePayloadUpsertRequestDto).noteRef),
      ),
    );
    const matches = (await listMutationPayloadBlocks(note, control)).filter(
      (block) => block.payloadType === logicalPayload.payloadType,
    );
    if (matches.length > 1) {
      throw capabilityError("conflict", "note payload is ambiguous", {
        reason: "ambiguous_state",
        kind: "note",
      });
    }
  }
  const normalized = (noteCreate
    ? {
        operationId,
        placement: noteCreate.placement,
        content: (request as NoteCreateRequestDto).content,
        initialTags: noteCreate.initialTags,
      }
    : { ...request, operationId }) as unknown as JsonObject;
  assertWorkflowHostStrictJsonValue(normalized);
  try {
    return await executeReservedMutation<JsonObject>({
      scope,
      operationId,
      operation,
      semanticInput: normalized,
      control,
      async execute() {
        if (operation === "notes.create") {
          const content = noteContent as NonNullable<typeof noteContent>;
          let note: Zotero.Item;
          try {
            note = await withZoteroHostSlice(control, () =>
              handlers.note.create({
                content: content.value,
                parent: noteCreate!.parent,
                libraryID: noteCreate!.libraryId,
                tags: noteCreate!.initialTags,
                collections: noteCreate!.collections,
              }),
            );
          } catch (error) {
            throw new MutationAuthorityExecutionError(
              "unknown",
              "execution_failed",
              "commit",
              "reconcile",
              { phase: "commit", recovery: "reconcile" },
              error instanceof Error ? error.message : "note create failed",
            );
          }
          let attachments: Zotero.Item[] = [];
          if (resolvedImages.length > 0) {
            try {
              const staged = await importPreparedNoteImages(
                note,
                resolvedImages,
                control,
              );
              attachments = staged.attachments;
              await withZoteroHostSlice(control, () =>
                handlers.note.update(note, {
                  content: bindNoteImageSlots(
                    content.value,
                    staged.attachmentKeys,
                  ),
                }),
              );
            } catch (error) {
              const residualRefs = await cleanupNoteMutationItems(
                [...attachments, note],
                control,
              );
              if (error instanceof MutationAuthorityExecutionError) {
                if (residualRefs.length === 0) throw error;
                throw new MutationAuthorityExecutionError(
                  "repair_required",
                  error.code,
                  error.phase,
                  "manual_repair",
                  error.details,
                  error.message,
                  error.affectedRefs,
                  [...error.residualRefs, ...residualRefs],
                );
              }
              throw new MutationAuthorityExecutionError(
                residualRefs.length ? "repair_required" : "failed",
                "execution_failed",
                "commit",
                residualRefs.length ? "manual_repair" : "retry_same_operation",
                {
                  phase: "commit",
                  recovery: residualRefs.length
                    ? "manual_repair"
                    : "retry_same_operation",
                  affectedCount: attachments.length + 1,
                  residualCount: residualRefs.length,
                },
                error instanceof Error
                  ? error.message
                  : "note image commit failed",
                [],
                residualRefs,
              );
            }
          }
          const committed = await withZoteroHostSlice(control, () => {
            const ref = {
              libraryId: normalizeLibraryId(note.libraryID),
              key: trimText(note.key),
            };
            const committedNote = requireNote(ref);
            return {
              ref,
              committedNote,
              after: canonicalNoteVersion(committedNote),
              noteResult: canonicalNoteResult(committedNote),
              attachmentVersions: attachments.map((attachment) => ({
                entity: {
                  kind: "item" as const,
                  ref: {
                    libraryId: normalizeLibraryId(attachment.libraryID),
                    key: trimText(attachment.key),
                  },
                },
                effect: "created" as const,
                before: null,
                after: canonicalItemVersion(attachment),
              })),
            };
          });
          return {
            outcome: "committed",
            changes: [
              {
                entity: { kind: "item", ref: committed.ref },
                effect: "created",
                before: null,
                after: committed.after,
              },
              ...committed.attachmentVersions,
            ],
            result: strictJsonObject({
              note: committed.noteResult,
            }),
          };
        }

        const noteRef = canonicalItemRef(
          (
            request as
              | NoteUpdateContentRequestDto
              | NoteRemoveRequestDto
              | NotePayloadUpsertRequestDto
          ).noteRef,
        );
        const expectedRevision =
          "expectedRevision" in request ? request.expectedRevision : undefined;
        const { note, before } = await withZoteroHostSlice(control, () => {
          const note = requireNote(noteRef);
          return {
            note,
            before: assertExpectedNoteRevision(note, expectedRevision),
          };
        });

        if (operation === "notes.updateContent") {
          const contentInput = noteContent as NonNullable<typeof noteContent>;
          let content = contentInput.value;
          let attachments: Zotero.Item[] = [];
          if (resolvedImages.length > 0) {
            const staged = await importPreparedNoteImages(
              note,
              resolvedImages,
              control,
            );
            attachments = staged.attachments;
            content = bindNoteImageSlots(content, staged.attachmentKeys);
          }
          const current = await withZoteroHostSlice(control, () =>
            trimText(note.getNote?.(), NOTE_HTML_INPUT_LIMIT),
          );
          const oldManagedImageKeys = managedNoteImageKeys(current);
          const retainedImageKeys = managedNoteImageKeys(content);
          const changed = current !== content;
          if (changed) {
            try {
              await withZoteroHostSlice(control, () =>
                handlers.note.update(note, { content }),
              );
            } catch (error) {
              const residualRefs = await cleanupNoteMutationItems(
                attachments,
                control,
              );
              throw new MutationAuthorityExecutionError(
                residualRefs.length ? "repair_required" : "failed",
                "execution_failed",
                "commit",
                residualRefs.length ? "manual_repair" : "retry_same_operation",
                {
                  phase: "commit",
                  recovery: residualRefs.length
                    ? "manual_repair"
                    : "retry_same_operation",
                  affectedCount: attachments.length,
                  residualCount: residualRefs.length,
                },
                error instanceof Error ? error.message : "note update failed",
                [{ kind: "item", ref: noteRef }],
                residualRefs,
              );
            }
          }
          const removedImageChanges: MutationChangeDto[] = [];
          if (changed) {
            for (const key of oldManagedImageKeys) {
              if (retainedImageKeys.has(key)) continue;
              const attachment = await withZoteroHostSlice(
                control,
                () =>
                  resolveZotero().Items.getByLibraryAndKey?.(
                    normalizeLibraryId(note.libraryID),
                    key,
                  ) || null,
              );
              if (!attachment) continue;
              const { attachmentRef, attachmentBefore } =
                await withZoteroHostSlice(control, () => ({
                  attachmentRef: {
                    libraryId: normalizeLibraryId(attachment!.libraryID),
                    key,
                  },
                  attachmentBefore: canonicalItemVersion(attachment!),
                }));
              try {
                await withZoteroHostSlice(control, () =>
                  handlers.item.remove(attachment!),
                );
              } catch (error) {
                throw new MutationAuthorityExecutionError(
                  "repair_required",
                  "execution_failed",
                  "cleanup",
                  "manual_repair",
                  {
                    phase: "cleanup",
                    recovery: "manual_repair",
                    affectedCount: 1 + attachments.length,
                    residualCount: 1,
                  },
                  error instanceof Error
                    ? error.message
                    : "old embedded image cleanup failed",
                  [
                    { kind: "item", ref: noteRef },
                    ...attachments.map((created) => ({
                      kind: "item" as const,
                      ref: {
                        libraryId: normalizeLibraryId(created.libraryID),
                        key: trimText(created.key),
                      },
                    })),
                  ],
                  [{ kind: "item", ref: attachmentRef }],
                );
              }
              removedImageChanges.push({
                entity: { kind: "item", ref: attachmentRef },
                effect: "deleted",
                before: attachmentBefore,
                after: {
                  revision: hashSynthesisContractCanonicalJson({
                    ref: attachmentRef,
                    state: "deleted",
                    operationId,
                  }),
                  state: "deleted",
                },
              });
            }
          }
          const { after, attachmentVersions, noteResult } =
            await withZoteroHostSlice(control, () => {
              const afterNote = requireNote(noteRef);
              if (
                trimText(afterNote.getNote?.(), NOTE_HTML_INPUT_LIMIT) !==
                content
              ) {
                throw new MutationAuthorityExecutionError(
                  "unknown",
                  "execution_failed",
                  "verification",
                  "reconcile",
                  { phase: "verification", recovery: "reconcile" },
                  "note content final state could not be confirmed",
                  [{ kind: "item", ref: noteRef }],
                );
              }
              return {
                afterNote,
                after: canonicalNoteVersion(afterNote),
                noteResult: canonicalNoteResult(afterNote),
                attachmentVersions: attachments.map((attachment) => ({
                  entity: {
                    kind: "item" as const,
                    ref: {
                      libraryId: normalizeLibraryId(attachment.libraryID),
                      key: trimText(attachment.key),
                    },
                  },
                  effect: "created" as const,
                  before: null,
                  after: canonicalItemVersion(attachment),
                })),
              };
            });
          return {
            outcome: changed ? "committed" : "unchanged",
            changes: [
              {
                entity: { kind: "item", ref: noteRef },
                effect: changed ? "updated" : "unchanged",
                before,
                after,
              },
              ...attachmentVersions,
              ...removedImageChanges,
            ],
            result: strictJsonObject({ note: noteResult }),
          };
        }

        if (operation === "notes.remove") {
          const disposition = (request as NoteRemoveRequestDto).disposition;
          if (disposition === "trash")
            await withZoteroHostSlice(control, () => handlers.item.trash(note));
          else
            await withZoteroHostSlice(control, () =>
              handlers.note.remove(note),
            );
          const after =
            disposition === "trash"
              ? await withZoteroHostSlice(control, () =>
                  canonicalNoteVersion(requireNote(noteRef)),
                )
              : {
                  revision: hashSynthesisContractCanonicalJson({
                    ref: noteRef,
                    state: "deleted",
                    operationId,
                  }),
                  state: "deleted" as const,
                };
          return {
            outcome: "committed",
            changes: [
              {
                entity: { kind: "item", ref: noteRef },
                effect: disposition === "trash" ? "trashed" : "deleted",
                before,
                after,
              },
            ],
            result: strictJsonObject({
              noteRef,
              outcome:
                disposition === "trash" ? "trashed" : "permanently_deleted",
            }),
          };
        }

        let payloadResult: Awaited<
          ReturnType<typeof upsertNotePayloadAttachment>
        >;
        try {
          const matches = (
            await listMutationPayloadBlocks(note, control)
          ).filter(
            (block) => block.payloadType === logicalPayload!.payloadType,
          );
          payloadResult = await upsertNotePayloadAttachment(
            note,
            logicalPayload!,
            matches,
            control,
          );
        } catch (error) {
          if (error instanceof MutationAuthorityExecutionError) throw error;
          throw new MutationAuthorityExecutionError(
            "failed",
            "execution_failed",
            "commit",
            "retry_same_operation",
            { phase: "commit", recovery: "retry_same_operation" },
            error instanceof Error
              ? error.message
              : "note payload upsert failed",
            [{ kind: "item", ref: noteRef }],
          );
        }
        const noteChanged = payloadResult.outcome !== "unchanged";
        const { after, noteResult, attachmentChanges } =
          await withZoteroHostSlice(control, () => {
            const afterNote = requireNote(noteRef);
            const attachmentChanges: MutationChangeDto[] = [];
            if (payloadResult.createdAttachment) {
              attachmentChanges.push({
                entity: {
                  kind: "item" as const,
                  ref: canonicalItemRef(payloadResult.createdAttachment),
                },
                effect: "created" as const,
                before: null,
                after: canonicalItemVersion(payloadResult.createdAttachment),
              });
            }
            if (payloadResult.removedAttachment) {
              attachmentChanges.push({
                entity: {
                  kind: "item" as const,
                  ref: canonicalItemRef(payloadResult.removedAttachment),
                },
                effect: "deleted" as const,
                before: canonicalItemVersion(payloadResult.removedAttachment),
                after: {
                  revision: hashSynthesisContractCanonicalJson({
                    ref: canonicalItemRef(payloadResult.removedAttachment),
                    state: "deleted",
                    operationId,
                  }),
                  state: "deleted" as const,
                },
              });
            }
            return {
              after: canonicalNoteVersion(afterNote),
              noteResult: canonicalNoteSummaryDto(afterNote),
              attachmentChanges,
            };
          });
        return {
          outcome: noteChanged ? "committed" : "unchanged",
          changes: [
            {
              entity: { kind: "item", ref: noteRef },
              effect: noteChanged ? "updated" : "unchanged",
              before,
              after,
            },
            ...attachmentChanges,
          ],
          result: strictJsonObject({
            note: noteResult,
            payload: payloadResult.payload,
            outcome: payloadResult.outcome,
          }),
        };
      },
    });
  } catch (error) {
    if (error instanceof MutationAuthorityAdmissionError) {
      throw mutationAdmissionError(error);
    }
    throw error;
  }
}

function requireAttachment(ref: ZoteroHostItemRefInput) {
  const attachment = requireItem(ref, "attachment");
  if (!attachment.isAttachment?.()) {
    throw capabilityError("invalid_ref", "item is not an attachment", {
      kind: "attachment",
      reason: "wrong_kind",
    });
  }
  return attachment;
}

async function canonicalAttachmentVersion(attachment: Zotero.Item) {
  const base = canonicalItemVersion(attachment);
  let path = "";
  try {
    path = trimText(await attachment.getFilePathAsync?.(), FIELD_TEXT_LIMIT);
  } catch {
    path = "";
  }
  return {
    ...base,
    revision: hashSynthesisContractCanonicalJson({
      baseRevision: base.revision,
      linkMode: Number(
        (attachment as Zotero.Item & { attachmentLinkMode?: unknown })
          .attachmentLinkMode,
      ),
      path,
      title: trimText(attachment.getField?.("title"), FIELD_TEXT_LIMIT),
      url: trimText(attachment.getField?.("url"), FIELD_TEXT_LIMIT),
      contentType: trimText(
        (attachment as Zotero.Item & { attachmentContentType?: unknown })
          .attachmentContentType,
        512,
      ),
      charset: trimText(
        (attachment as Zotero.Item & { attachmentCharset?: unknown })
          .attachmentCharset,
        512,
      ),
    }),
  };
}

async function assertExpectedAttachmentRevision(
  attachment: Zotero.Item,
  expectedRevision: string | undefined,
) {
  const version = await canonicalAttachmentVersion(attachment);
  if (expectedRevision && expectedRevision !== version.revision) {
    throw new MutationAuthorityExecutionError(
      "failed",
      "conflict",
      "read",
      "refresh_and_retry_new_operation",
      { reason: "revision_mismatch", kind: "attachment" },
      "attachment revision no longer matches expectedRevision",
    );
  }
  return version;
}

async function canonicalAttachmentResult(attachment: Zotero.Item) {
  const ref = {
    libraryId: normalizeLibraryId(attachment.libraryID),
    key: trimText(attachment.key),
  };
  const parent = (attachment as Zotero.Item & { parentItem?: Zotero.Item })
    .parentItem;
  let path = "";
  try {
    path = trimText(await attachment.getFilePathAsync?.(), FIELD_TEXT_LIMIT);
  } catch {
    path = "";
  }
  const linkMode = Number(
    (attachment as Zotero.Item & { attachmentLinkMode?: unknown })
      .attachmentLinkMode,
  );
  const semanticLinkMode =
    linkMode === 0
      ? "stored_file"
      : linkMode === 1
        ? "stored_url"
        : linkMode === 2
          ? "linked_file"
          : linkMode === 3
            ? "linked_url"
            : "embedded_image";
  return strictJsonObject({
    ref,
    parentRef: parent
      ? {
          libraryId: normalizeLibraryId(parent.libraryID),
          key: trimText(parent.key),
        }
      : null,
    revision: (await canonicalAttachmentVersion(attachment)).revision,
    title: trimText(attachment.getField?.("title"), FIELD_TEXT_LIMIT),
    filename:
      trimText(
        (attachment as Zotero.Item & { attachmentFilename?: unknown })
          .attachmentFilename,
        FIELD_TEXT_LIMIT,
      ) || null,
    contentType:
      trimText(
        (attachment as Zotero.Item & { attachmentContentType?: unknown })
          .attachmentContentType,
        512,
      ) || null,
    charset:
      trimText(
        (attachment as Zotero.Item & { attachmentCharset?: unknown })
          .attachmentCharset,
        512,
      ) || null,
    url: trimText(attachment.getField?.("url"), FIELD_TEXT_LIMIT) || null,
    linkMode: semanticLinkMode,
    role: semanticLinkMode === "embedded_image" ? "note_image" : "ordinary",
    file:
      semanticLinkMode === "linked_url"
        ? { state: "not_applicable" }
        : path
          ? { state: "available", path, sizeBytes: 0, modifiedAt: null }
          : { state: "missing" },
  });
}

function attachmentRefFromItem(attachment: Zotero.Item) {
  return {
    libraryId: normalizeLibraryId(attachment.libraryID),
    key: trimText(attachment.key),
  };
}

async function executeAttachmentMutation(
  request:
    | AttachmentCreateRequestDto
    | AttachmentUpdateMetadataRequestDto
    | AttachmentReplaceFileRequestDto
    | AttachmentMoveRequestDto
    | AttachmentRemoveRequestDto,
  operation:
    | "attachments.create"
    | "attachments.updateMetadata"
    | "attachments.replaceFile"
    | "attachments.move"
    | "attachments.remove",
  scope: ZoteroHostMutationCallerScope,
  primitives: ZoteroHostAttachmentMutationPrimitives,
  control?: WorkflowCallControl,
): Promise<MutationExecutionResult<JsonObject>> {
  const operationId = trimText(request.operationId, 129);
  if (!operationId || operationId.length > 128) {
    throw capabilityError("invalid_request", "operationId is invalid", {
      reason: "invalid_value",
      field: "operationId",
      operation,
    });
  }
  const normalized = strictJsonObject({ ...request, operationId });
  try {
    return await executeReservedMutation<JsonObject>({
      scope,
      operationId,
      operation,
      semanticInput: normalized,
      control,
      async execute() {
        if (operation === "attachments.create") {
          const input = request as AttachmentCreateRequestDto;
          const parent =
            input.placement.kind === "child"
              ? await (async () => {
                  const placement = input.placement;
                  if (placement.kind !== "child") return null;
                  return withZoteroHostSlice(control, () =>
                    requireItem(
                      canonicalItemRef(placement.parentRef),
                      "parent item",
                    ),
                  );
                })()
              : null;
          const libraryId = await withZoteroHostSlice(control, () =>
            parent
              ? normalizeLibraryId(parent.libraryID)
              : parsePositiveInteger(
                  input.placement.kind === "top_level"
                    ? input.placement.libraryId
                    : undefined,
                ) || normalizeLibraryId(undefined),
          );
          const collectionRefs =
            input.placement.kind === "top_level"
              ? (input.placement.collectionRefs || []).map(
                  canonicalCollectionRef,
                )
              : [];
          const collections: Zotero.Collection[] = [];
          for (const ref of collectionRefs) {
            const collection = await withZoteroHostSlice(control, () =>
              resolveCollection(ref),
            );
            if (!collection) throw notFoundError("collection", ref);
            const collectionLibraryId = await withZoteroHostSlice(control, () =>
              normalizeLibraryId((collection as any).libraryID),
            );
            if (collectionLibraryId !== libraryId) {
              throw capabilityError(
                "invalid_request",
                "attachment placement crosses libraries",
                {
                  reason: "invalid_combination",
                  operation,
                },
              );
            }
            collections.push(collection);
          }
          let created: Zotero.Item | null = null;
          try {
            if (input.source.kind === "stored_file") {
              if (!primitives.createStoredFile) {
                throw new Error("stored attachment import is unavailable");
              }
              created = await primitives.createStoredFile(input, parent);
            } else if (input.source.kind === "linked_file") {
              const source = input.source;
              created = await withZoteroHostSlice(control, () =>
                handlers.attachment.createFromPath({
                  parent,
                  path: source.path,
                  title: input.metadata?.title,
                  mimeType: input.metadata?.contentType,
                }),
              );
            } else if (input.source.kind === "linked_url") {
              const source = input.source;
              created = await withZoteroHostSlice(control, () =>
                handlers.attachment.createFromUrl({
                  parent,
                  url: source.url,
                  title: input.metadata?.title,
                  mimeType: input.metadata?.contentType,
                  deduplicate: false,
                }),
              );
            } else {
              const source = input.source;
              created = await withZoteroHostSlice(control, () =>
                handlers.attachment.importStoredFromUrl({
                  parent,
                  url: source.url,
                  title: input.metadata?.title,
                  mimeType: input.metadata?.contentType,
                  deduplicate: false,
                }),
              );
            }
            for (const collection of collections) {
              await withZoteroHostSlice(control, () =>
                handlers.collection.add(created!, collection),
              );
            }
          } catch (primary) {
            if (!created) {
              throw new MutationAuthorityExecutionError(
                "failed",
                "execution_failed",
                "commit",
                "retry_same_operation",
                { phase: "commit", recovery: "retry_same_operation" },
                primary instanceof Error
                  ? primary.message
                  : "attachment creation failed",
              );
            }
            const ref = await withZoteroHostSlice(control, () =>
              attachmentRefFromItem(created!),
            );
            try {
              await withZoteroHostSlice(control, () =>
                handlers.attachment.remove(created!),
              );
            } catch {
              throw new MutationAuthorityExecutionError(
                "repair_required",
                "execution_failed",
                "compensation",
                "manual_repair",
                {
                  phase: "cleanup",
                  recovery: "manual_repair",
                  affectedCount: 1,
                  residualCount: 1,
                },
                primary instanceof Error
                  ? primary.message
                  : "attachment initialization failed",
                [{ kind: "item", ref }],
                [{ kind: "item", ref }],
              );
            }
            throw new MutationAuthorityExecutionError(
              "failed",
              "execution_failed",
              "compensation",
              "retry_same_operation",
              {
                phase: "cleanup",
                recovery: "retry_same_operation",
                affectedCount: 1,
                residualCount: 0,
              },
              primary instanceof Error
                ? primary.message
                : "attachment initialization failed",
              [{ kind: "item", ref }],
            );
          }
          return withZoteroHostSlice(control, async () => {
            const ref = attachmentRefFromItem(created!);
            const confirmed = requireAttachment(ref);
            return {
              outcome: "committed" as const,
              changes: [
                {
                  entity: { kind: "item" as const, ref },
                  effect: "created" as const,
                  before: null,
                  after: await canonicalAttachmentVersion(confirmed),
                },
              ],
              result: strictJsonObject({
                attachment: await canonicalAttachmentResult(confirmed),
              }),
            };
          });
        }

        const input = request as
          | AttachmentUpdateMetadataRequestDto
          | AttachmentReplaceFileRequestDto
          | AttachmentMoveRequestDto
          | AttachmentRemoveRequestDto;
        const attachmentRef = canonicalItemRef(input.attachmentRef);
        const { attachment, before } = await withZoteroHostSlice(
          control,
          async () => {
            const attachment = requireAttachment(attachmentRef);
            if ((await canonicalAttachmentRole(attachment)) !== "ordinary") {
              throw new MutationAuthorityExecutionError(
                "failed",
                "invalid_ref",
                "read",
                "refresh_and_retry_new_operation",
                { kind: "attachment", reason: "wrong_kind" },
                `${operation} requires an ordinary attachment`,
                [{ kind: "item", ref: attachmentRef }],
              );
            }
            return {
              attachment,
              before: await assertExpectedAttachmentRevision(
                attachment,
                input.expectedRevision,
              ),
            };
          },
        );

        if (operation === "attachments.updateMetadata") {
          const patch = (input as AttachmentUpdateMetadataRequestDto).patch;
          const fields = Object.fromEntries(
            Object.entries(patch || {}).map(([key, value]) => [
              key === "contentType" ? "contentType" : key,
              value ?? "",
            ]),
          );
          if (!Object.keys(fields).length) {
            throw new MutationAuthorityExecutionError(
              "failed",
              "invalid_request",
              "validation",
              "refresh_and_retry_new_operation",
              { reason: "missing_field", field: "patch", operation },
              "attachment metadata patch is empty",
            );
          }
          const current = await withZoteroHostSlice(control, () =>
            Object.fromEntries(
              Object.keys(fields).map((field) => [
                field,
                trimText(attachment.getField?.(field)),
              ]),
            ),
          );
          const changed = Object.entries(fields).some(
            ([field, value]) => current[field] !== String(value),
          );
          if (changed)
            await withZoteroHostSlice(control, () =>
              handlers.attachment.update(attachment, fields as any),
            );
          return withZoteroHostSlice(control, async () => {
            const afterAttachment = requireAttachment(attachmentRef);
            const after = await canonicalAttachmentVersion(afterAttachment);
            return {
              outcome: changed
                ? ("committed" as const)
                : ("unchanged" as const),
              changes: [
                {
                  entity: { kind: "item" as const, ref: attachmentRef },
                  effect: changed
                    ? ("updated" as const)
                    : ("unchanged" as const),
                  before,
                  after,
                },
              ],
              result: strictJsonObject({
                attachment: await canonicalAttachmentResult(afterAttachment),
              }),
            };
          });
        }

        if (operation === "attachments.replaceFile") {
          if (!primitives.replaceFile) {
            throw new MutationAuthorityExecutionError(
              "failed",
              "unsupported_operation",
              "validation",
              "none",
              { memberOrOperation: operation },
              "attachment replacement is unavailable",
            );
          }
          let replaced: Zotero.Item;
          try {
            replaced = await primitives.replaceFile(
              input as AttachmentReplaceFileRequestDto,
              attachment,
            );
          } catch (error) {
            if (error instanceof MutationAuthorityExecutionError) throw error;
            throw new MutationAuthorityExecutionError(
              "unknown",
              "execution_failed",
              "commit",
              "reconcile",
              { phase: "commit", recovery: "reconcile" },
              error instanceof Error
                ? error.message
                : "attachment replacement failed",
              [{ kind: "item", ref: attachmentRef }],
            );
          }
          return withZoteroHostSlice(control, async () => {
            const after = await canonicalAttachmentVersion(replaced);
            const changed = before.revision !== after.revision;
            return {
              outcome: changed
                ? ("committed" as const)
                : ("unchanged" as const),
              changes: [
                {
                  entity: { kind: "item" as const, ref: attachmentRef },
                  effect: changed
                    ? ("updated" as const)
                    : ("unchanged" as const),
                  before,
                  after,
                },
              ],
              result: strictJsonObject({
                attachment: await canonicalAttachmentResult(replaced),
                outcome: changed ? "replaced" : "unchanged",
              }),
            };
          });
        }

        if (operation === "attachments.move") {
          const placement = (input as AttachmentMoveRequestDto).placement;
          const {
            oldParent,
            oldCollections,
            nextParent,
            nextCollections,
            changed,
          } = await withZoteroHostSlice(control, () => {
            const oldParent = (attachment as any).parentItem || null;
            const oldCollections = attachment.getCollections();
            const nextParent =
              placement.kind === "child"
                ? requireItem(
                    canonicalItemRef(placement.parentRef),
                    "parent item",
                  )
                : null;
            const nextCollections =
              placement.kind === "top_level"
                ? (placement.collectionRefs || []).map((ref) => {
                    const collection = resolveCollection(
                      canonicalCollectionRef(ref),
                    );
                    if (!collection) throw notFoundError("collection", ref);
                    return collection;
                  })
                : [];
            const changed =
              Number(oldParent?.id || 0) !== Number(nextParent?.id || 0) ||
              JSON.stringify([...oldCollections].sort()) !==
                JSON.stringify(
                  nextCollections.map((entry: any) => entry.id).sort(),
                );
            return {
              oldParent,
              oldCollections,
              nextParent,
              nextCollections,
              changed,
            };
          });
          if (changed) {
            try {
              await withZoteroHostSlice(control, () =>
                handlers.item.setParent(attachment, nextParent),
              );
              await withZoteroHostSlice(control, () =>
                handlers.collection.replace(attachment, nextCollections),
              );
            } catch (primary) {
              try {
                await withZoteroHostSlice(control, () =>
                  handlers.item.setParent(attachment, oldParent),
                );
                await withZoteroHostSlice(control, () =>
                  handlers.collection.replace(attachment, oldCollections),
                );
              } catch {
                throw new MutationAuthorityExecutionError(
                  "repair_required",
                  "execution_failed",
                  "compensation",
                  "manual_repair",
                  {
                    phase: "cleanup",
                    recovery: "manual_repair",
                    affectedCount: 1,
                    residualCount: 1,
                  },
                  primary instanceof Error
                    ? primary.message
                    : "attachment move failed",
                  [{ kind: "item", ref: attachmentRef }],
                  [{ kind: "item", ref: attachmentRef }],
                );
              }
              throw new MutationAuthorityExecutionError(
                "failed",
                "execution_failed",
                "compensation",
                "retry_same_operation",
                {
                  phase: "cleanup",
                  recovery: "retry_same_operation",
                  affectedCount: 1,
                  residualCount: 0,
                },
                primary instanceof Error
                  ? primary.message
                  : "attachment move failed",
                [{ kind: "item", ref: attachmentRef }],
              );
            }
          }
          return withZoteroHostSlice(control, async () => {
            const afterAttachment = requireAttachment(attachmentRef);
            const after = await canonicalAttachmentVersion(afterAttachment);
            return {
              outcome: changed
                ? ("committed" as const)
                : ("unchanged" as const),
              changes: [
                {
                  entity: { kind: "item" as const, ref: attachmentRef },
                  effect: changed
                    ? ("updated" as const)
                    : ("unchanged" as const),
                  before,
                  after,
                },
              ],
              result: strictJsonObject({
                attachment: await canonicalAttachmentResult(afterAttachment),
                outcome: changed ? "moved" : "unchanged",
              }),
            };
          });
        }

        const disposition = (input as AttachmentRemoveRequestDto).disposition;
        if (disposition === "trash")
          await withZoteroHostSlice(control, () =>
            handlers.item.trash(attachment),
          );
        else
          await withZoteroHostSlice(control, () =>
            handlers.attachment.remove(attachment),
          );
        const after =
          disposition === "trash"
            ? await withZoteroHostSlice(control, () =>
                canonicalAttachmentVersion(requireAttachment(attachmentRef)),
              )
            : {
                revision: hashSynthesisContractCanonicalJson({
                  ref: attachmentRef,
                  state: "deleted",
                  operationId,
                }),
                state: "deleted" as const,
              };
        return {
          outcome: "committed",
          changes: [
            {
              entity: { kind: "item", ref: attachmentRef },
              effect: disposition === "trash" ? "trashed" : "deleted",
              before,
              after,
            },
          ],
          result: strictJsonObject({
            attachmentRef,
            outcome:
              disposition === "trash" ? "trashed" : "permanently_deleted",
          }),
        };
      },
    });
  } catch (error) {
    if (error instanceof MutationAuthorityAdmissionError) {
      throw mutationAdmissionError(error);
    }
    throw error;
  }
}

let mutationPreviewTargetLimit = 10_000;

function buildItemChangeTypePreview(request: {
  itemRef: ZoteroHostItemRefInput;
  targetItemType: string;
  incompatibleData: "reject" | "move_to_extra" | "drop";
}) {
  const itemRef = canonicalItemRef(request.itemRef);
  const item = requireItem(itemRef, "item");
  if (item.isNote?.() || item.isAttachment?.() || item.isAnnotation?.()) {
    throw capabilityError("invalid_ref", "item is not a regular item", {
      kind: "item",
      reason: "wrong_kind",
    });
  }
  const targetItemType = trimText(request.targetItemType, 128);
  try {
    resolveZotero().ItemTypes.getID(targetItemType);
    const target = new (resolveZotero().Item as typeof Zotero.Item)(
      targetItemType as any,
    );
    if (
      target.isNote?.() ||
      target.isAttachment?.() ||
      target.isAnnotation?.()
    ) {
      throw new Error("not a regular item type");
    }
  } catch {
    throw capabilityError("invalid_request", "target item type is invalid", {
      reason: "unsupported_value",
      field: "targetItemType",
      operation: "item.changeType",
    });
  }
  const detail = serializeItemDetail(item);
  const fields = Object.fromEntries(
    Object.entries(detail.fields).map(([field, value]) => [
      field,
      String(value),
    ]),
  );
  const preservedFields: Record<string, string> = {};
  const incompatible: Array<{ kind: "field"; field: string; value: string }> =
    [];
  for (const [field, value] of Object.entries(fields)) {
    if (itemTypeSupportsField(targetItemType, field))
      preservedFields[field] = value;
    else incompatible.push({ kind: "field", field, value });
  }
  const creators = (() => {
    try {
      return (
        (
          item as Zotero.Item & {
            getCreators?: () => ZoteroHostMetadataCreatorDto[];
          }
        ).getCreators?.() || []
      );
    } catch {
      return [];
    }
  })();
  const movedToExtra =
    request.incompatibleData === "move_to_extra"
      ? incompatible.map((source) => ({
          source,
          serializedLine: `${source.field}: ${source.value}`,
        }))
      : [];
  const resultFields = { ...preservedFields };
  if (movedToExtra.length) {
    resultFields.extra = [
      resultFields.extra || "",
      ...movedToExtra.map((entry) => entry.serializedLine),
    ]
      .filter(Boolean)
      .join("\n");
  }
  const version = canonicalItemVersion(item);
  const plan: MutationPlanByOperation["item.changeType"] = {
    itemRef,
    sourceRevision: version.revision,
    sourceItemType: item.itemType,
    targetItemType,
    incompatibleData: request.incompatibleData,
    preservedFields,
    preservedCreators: creators,
    remappedFields: [],
    movedToExtra,
    dropped: request.incompatibleData === "drop" ? incompatible : [],
    resultFields,
    resultCreators: creators,
  };
  return {
    semanticInput: {
      operation: "item.changeType" as const,
      itemRef,
      targetItemType,
      incompatibleData: request.incompatibleData,
    },
    plan,
    observations: [
      { entity: { kind: "item" as const, ref: itemRef }, version },
    ],
    outcome:
      item.itemType === targetItemType
        ? ("unchanged" as const)
        : ("would_change" as const),
  };
}

function canonicalCollectionVersion(collection: Zotero.Collection) {
  const members = (() => {
    let children: Zotero.Item[];
    try {
      children = collection.getChildItems(false, false);
    } catch {
      throw canonicalReadFailure("collection");
    }
    if (!Array.isArray(children)) throw canonicalReadFailure("collection");
    return children
      .map((item) => ({
        libraryId: normalizeLibraryId(item.libraryID),
        key: trimText(item.key),
      }))
      .sort((left, right) => {
        const leftId = `${left.libraryId}:${left.key}`;
        const rightId = `${right.libraryId}:${right.key}`;
        return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
      });
  })();
  return {
    revision: hashSynthesisContractCanonicalJson({
      collection: serializeCollection(collection),
      members,
    }),
    state: "active" as const,
  };
}

async function previewCanonicalMutation(
  request: MutationPreviewRequestByOperation[MutationPreviewOperation],
  scope: ZoteroHostMutationCallerScope,
): Promise<
  MutationPreviewResult<MutationPlanByOperation[MutationPreviewOperation]>
> {
  let built: {
    semanticInput: JsonObject;
    plan: JsonObject;
    observations: Array<any>;
    outcome: "would_change" | "unchanged";
  };
  if (request.operation === "item.changeType") {
    built = buildItemChangeTypePreview(request);
  } else if (request.operation === "item.remove") {
    if (request.disposition !== "permanent") {
      throw capabilityError(
        "invalid_request",
        "preview requires permanent removal",
        {
          reason: "invalid_value",
          field: "disposition",
          operation: "item.remove",
        },
      );
    }
    const itemRef = canonicalItemRef(request.itemRef);
    const item = requireItem(itemRef, "item");
    const ids = Array.from(
      new Set([
        ...(item.getNotes?.() || []),
        ...(item.getAttachments?.() || []),
        ...((
          item as Zotero.Item & { getChildren?: () => number[] }
        ).getChildren?.() || []),
      ]),
    );
    if (ids.length > mutationPreviewTargetLimit) {
      throw capabilityError("resource_limited", "removal plan is too large", {
        resource: "items",
        limit: mutationPreviewTargetLimit,
        observed: ids.length,
      });
    }
    const children = ids
      .map((id) => resolveZotero().Items.get(id))
      .filter((child): child is Zotero.Item => Boolean(child));
    const version = canonicalItemVersion(item);
    const childPlans = children.map((child) => ({
      ref: {
        libraryId: normalizeLibraryId(child.libraryID),
        key: trimText(child.key),
      },
      kind: child.isNote?.()
        ? ("note" as const)
        : child.isAttachment?.()
          ? ("attachment" as const)
          : ("annotation" as const),
      revision: canonicalItemVersion(child).revision,
    }));
    built = {
      semanticInput: { ...request, itemRef },
      plan: {
        itemRef,
        revision: version.revision,
        childPolicy: request.childPolicy,
        children: childPlans,
        managedResources: {
          storedFiles: children.filter((child) => child.isAttachment?.())
            .length,
          noteImages: 0,
          notePayloads: 0,
          linkedFilesPreserved: 0,
        },
        relationInvalidations: [],
      },
      observations: [
        { entity: { kind: "item", ref: itemRef }, version },
        ...children.map((child, index) => ({
          entity: { kind: "item", ref: childPlans[index].ref },
          version: canonicalItemVersion(child),
        })),
      ],
      outcome: "would_change",
    };
  } else if (request.operation === "collection.remove") {
    const collectionRef = canonicalCollectionRef(request.collectionRef);
    const collection = resolveCollection(collectionRef);
    if (!collection) throw notFoundError("collection", collectionRef);
    const allCollections = (
      resolveZotero().Collections as unknown as {
        getByLibrary?: (libraryId: number) => Zotero.Collection[];
      }
    ).getByLibrary?.(collectionRef.libraryId) || [collection];
    const descendants: Zotero.Collection[] = [];
    const pending = [collection];
    while (pending.length) {
      const current = pending.shift()!;
      descendants.push(current);
      pending.push(
        ...allCollections.filter(
          (candidate) =>
            Number((candidate as any).parentID || 0) ===
            Number((current as any).id),
        ),
      );
      if (descendants.length > mutationPreviewTargetLimit) {
        throw capabilityError(
          "resource_limited",
          "collection plan is too large",
          {
            resource: "items",
            limit: mutationPreviewTargetLimit,
            observed: descendants.length,
          },
        );
      }
    }
    const deletedCollections = descendants.map((entry) => ({
      ref: {
        libraryId: collectionRef.libraryId,
        key: trimText((entry as any).key),
      },
      revision: canonicalCollectionVersion(entry).revision,
    }));
    const detachedMemberships: Array<{
      collectionRef: (typeof deletedCollections)[number]["ref"];
      itemRef: { libraryId: number; key: string };
      itemRevision: string;
    }> = [];
    for (const [index, entry] of descendants.entries()) {
      const collectionId = parsePositiveInteger((entry as any).id);
      if (!collectionId) {
        throw capabilityError(
          "execution_failed",
          "collection descendant identity is invalid",
          { phase: "read", recovery: "refresh_and_retry_new_operation" },
        );
      }
      let cursor: string | undefined;
      do {
        const page: Awaited<ReturnType<typeof queryZoteroLibraryPage>> =
          await queryZoteroLibraryPage(
            {
              libraryId: collectionRef.libraryId,
              collectionId,
              limit: LIBRARY_LIST_LIMIT_MAX,
              ...(cursor ? { cursor } : {}),
            },
            {
              defaultLibraryId: collectionRef.libraryId,
              defaultLimit: LIBRARY_LIST_LIMIT_MAX,
              maxLimit: LIBRARY_LIST_LIMIT_MAX,
            },
          );
        for (const item of page.items) {
          detachedMemberships.push({
            collectionRef: deletedCollections[index].ref,
            itemRef: {
              libraryId: normalizeLibraryId(item.libraryID),
              key: trimText(item.key),
            },
            itemRevision: canonicalItemVersion(item).revision,
          });
          if (detachedMemberships.length > mutationPreviewTargetLimit) {
            throw capabilityError(
              "resource_limited",
              "collection membership detach plan is too large",
              {
                resource: "items",
                limit: mutationPreviewTargetLimit,
                observed: detachedMemberships.length,
              },
            );
          }
        }
        cursor = page.nextCursor || undefined;
      } while (cursor);
    }
    built = {
      semanticInput: { ...request, collectionRef },
      plan: {
        collectionRef,
        childPolicy: request.childPolicy,
        deletedCollections,
        detachedMemberships,
      },
      observations: [
        ...descendants.map((entry, index) => ({
          entity: { kind: "collection", ref: deletedCollections[index].ref },
          version: canonicalCollectionVersion(entry),
        })),
        ...detachedMemberships.map((entry) => ({
          entity: { kind: "item", ref: entry.itemRef },
          version: { revision: entry.itemRevision, state: "active" },
        })),
      ],
      outcome: "would_change",
    };
  } else {
    throw capabilityError(
      "unsupported_operation",
      "unsupported preview operation",
      {
        memberOrOperation: trimText(
          (request as { operation?: unknown }).operation,
        ),
      },
    );
  }
  const token = issueMutationPreviewToken({
    scope,
    operation: request.operation,
    semanticInput: built.semanticInput,
    plan: built.plan,
    observations: built.observations,
  });
  return {
    schema: "zotero-agents.mutation-preview.v1",
    operation: request.operation,
    outcome: built.outcome,
    observedAt: new Date().toISOString(),
    observations: built.observations,
    plan: built.plan,
    token,
  } as MutationPreviewResult<MutationPlanByOperation[MutationPreviewOperation]>;
}

async function selectLibraryItemPage(args: ZoteroHostLibraryListArgs = {}) {
  const limit = Math.min(
    LIBRARY_LIST_LIMIT_MAX,
    Math.max(1, parsePositiveInteger(args.limit) || LIBRARY_LIST_LIMIT_DEFAULT),
  );
  const requestedLibraryId = parsePositiveInteger(args.libraryId);
  const collection = requireCollectionForList(args);
  const collectionId = collection
    ? parsePositiveInteger((collection as unknown as { id?: unknown }).id)
    : 0;
  const collectionLibraryId = collection
    ? parsePositiveInteger(
        (collection as unknown as { libraryID?: unknown }).libraryID,
      )
    : 0;
  const scanLibraryId =
    requestedLibraryId || collectionLibraryId || normalizeLibraryId(undefined);
  const selection = await queryZoteroLibraryPage(
    {
      libraryId: scanLibraryId,
      collectionId,
      tag: args.tag,
      itemType: args.itemType,
      query: args.query,
      limit,
      cursor: args.cursor,
    },
    {
      defaultLibraryId: scanLibraryId,
      defaultLimit: LIBRARY_LIST_LIMIT_DEFAULT,
      maxLimit: LIBRARY_LIST_LIMIT_MAX,
    },
  );
  return {
    page: selection.items,
    nextCursor: selection.nextCursor,
    totalScanned: selection.totalScanned,
    returned: selection.returned,
    hasMore: selection.hasMore,
    criteriaHash: selection.criteriaHash,
    afterItemId: selection.afterItemId,
    filters: {
      libraryId: requestedLibraryId || undefined,
      collection: collection ? serializeCollection(collection) : undefined,
      tag: selection.criteria.tag || undefined,
      itemType: selection.criteria.itemType || undefined,
      query: selection.criteria.query || undefined,
    },
  };
}

async function listLibraryItems(
  input: LibraryListItemsRequestDto = {},
  control: WorkflowCallControl = {},
): Promise<LibraryListItemsPageDto> {
  throwIfWorkflowCallCanceled(control);
  const collection = await withZoteroHostSlice(control, () =>
    input.collectionRef ? resolveCollection(input.collectionRef) : null,
  );
  if (input.collectionRef && !collection) {
    throw notFoundError("collection", input.collectionRef);
  }
  const libraryId = normalizeLibraryId(
    input.libraryId ?? input.collectionRef?.libraryId,
  );
  if (input.collectionRef && input.collectionRef.libraryId !== libraryId) {
    throw invalidRefError(
      "collection",
      "foreign_scope",
      "collection is outside the requested library",
    );
  }
  try {
    const page = await withZoteroHostSlice(control, () =>
      queryZoteroLibraryPage(
        {
          libraryId,
          collectionId: collection
            ? parsePositiveInteger((collection as any).id)
            : undefined,
          tag: input.tag,
          itemType: input.itemType,
          query: input.query,
          limit: input.limit,
          cursor: input.cursor,
        },
        {
          defaultLibraryId: libraryId,
          defaultLimit: LIBRARY_LIST_LIMIT_DEFAULT,
          maxLimit: LIBRARY_LIST_LIMIT_MAX,
        },
      ),
    );
    const items = await mapZoteroHostTargets(
      page.items,
      control,
      serializeCanonicalItemSummary,
    );
    throwIfWorkflowCallCanceled(control);
    return {
      items,
      limit: page.limit,
      nextCursor: page.nextCursor || null,
      hasMore: page.hasMore,
      returned: items.length,
      totalScanned: page.totalScanned,
      criteria: {
        libraryId: page.criteria.libraryId,
        collectionRef: input.collectionRef || null,
        tag: page.criteria.tag || null,
        itemType: page.criteria.itemType || null,
        query: page.criteria.query || null,
        order: "stable_identity",
      },
    };
  } catch (error) {
    if (error instanceof ZoteroLibraryPageLimitError) {
      throw capabilityError("resource_limited", error.message, {
        resource: "items",
        limit: error.limit,
        observed: Number.isFinite(error.observed) ? error.observed : undefined,
      });
    }
    if (error instanceof ZoteroLibraryCriteriaError) {
      throw capabilityError("invalid_request", error.message, {
        reason:
          error.reason === "invalid_type" ? "invalid_type" : "invalid_value",
        field: error.field,
      });
    }
    if (error instanceof ZoteroLibraryCursorError) {
      throw capabilityError("invalid_request", error.message, {
        reason: "invalid_value",
        field: "cursor",
      });
    }
    if (error instanceof ZoteroHostCapabilityError) throw error;
    throw canonicalReadFailure("item");
  }
}

function canonicalCollectionDto(
  collection: Zotero.Collection,
  path: string[],
): CollectionDto {
  const ref = canonicalCollectionRef(collection);
  const parentId = parsePositiveInteger(
    (collection as any).parentID ?? (collection as any).parentCollectionID,
  );
  const parent = parentId ? resolveZotero().Collections?.get?.(parentId) : null;
  if (parentId && !parent) throw canonicalReadFailure("collection");
  const revision =
    (collection as any).version ??
    (collection as any).dateModified ??
    `local:${JSON.stringify([
      String((collection as any).name || ""),
      parent ? canonicalCollectionRef(parent) : null,
    ])}`;
  return {
    ref,
    name: String((collection as any).name || "").trim(),
    parentRef: parent ? canonicalCollectionRef(parent) : null,
    revision: String(revision),
    state: "active",
    path,
  };
}

function canonicalCollectionPath(collection: Zotero.Collection) {
  const names: string[] = [];
  const seen = new Set<number>();
  let current: Zotero.Collection | null = collection;
  for (let depth = 0; current && depth < 1_000; depth += 1) {
    const id = parsePositiveInteger((current as any).id);
    if (id && seen.has(id)) break;
    if (id) seen.add(id);
    const name = trimText((current as any).name);
    if (name) names.unshift(name);
    const parentId = parsePositiveInteger(
      (current as any).parentID ?? (current as any).parentCollectionID,
    );
    current = parentId
      ? resolveZotero().Collections?.get?.(parentId) || null
      : null;
  }
  return names;
}

async function listLibraryCollections(
  input: LibraryListCollectionsRequestDto = {},
  control: WorkflowCallControl = {},
): Promise<LibraryListCollectionsPageDto> {
  throwIfWorkflowCallCanceled(control);
  if (
    input.libraryId !== undefined &&
    (!Number.isSafeInteger(input.libraryId) || input.libraryId <= 0)
  ) {
    throw capabilityError("invalid_request", "library id is invalid", {
      reason: "invalid_value",
      field: "libraryId",
    });
  }
  const libraryId = normalizeLibraryId(input.libraryId);
  let page;
  try {
    page = await withZoteroHostSlice(control, () =>
      queryZoteroCollectionPage({
        libraryId,
        limit: input.limit,
        cursor: input.cursor,
      }),
    );
  } catch (error) {
    if (error instanceof ZoteroLibraryPageLimitError) {
      throw capabilityError("resource_limited", error.message, {
        resource: "items",
        limit: error.limit,
        observed: Number.isFinite(error.observed) ? error.observed : undefined,
      });
    }
    if (error instanceof ZoteroLibraryCursorError) {
      throw capabilityError("invalid_request", error.message, {
        reason: "invalid_value",
        field: "cursor",
      });
    }
    if (error instanceof ZoteroLibrarySourceQueryError) {
      throw canonicalReadFailure("collection");
    }
    throw error;
  }
  const collections = await mapZoteroHostTargets(page.rows, control, (row) => {
    const id = parsePositiveInteger(
      (row as any).collectionID ?? (row as any).collectionId,
    );
    const raw = id ? resolveZotero().Collections?.get?.(id) : null;
    if (!raw || normalizeLibraryId((raw as any).libraryID) !== libraryId) {
      throw canonicalReadFailure("collection");
    }
    return canonicalCollectionDto(raw, canonicalCollectionPath(raw));
  });
  throwIfWorkflowCallCanceled(control);
  return {
    collections,
    libraryId,
    limit: page.limit,
    total: page.total,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    returned: collections.length,
    order: "stable_identity",
  };
}

async function listLibrarySavedSearches(
  input: LibraryListSavedSearchesRequestDto = {},
  control: WorkflowCallControl = {},
): Promise<LibraryListSavedSearchesPageDto> {
  throwIfWorkflowCallCanceled(control);
  const libraryId = normalizeLibraryId(input.libraryId);
  let page;
  try {
    page = await withZoteroHostSlice(control, () =>
      queryZoteroSavedSearchPage({
        libraryId,
        limit: input.limit,
        cursor: input.cursor,
      }),
    );
  } catch (error) {
    if (error instanceof ZoteroLibraryPageLimitError) {
      throw capabilityError("resource_limited", error.message, {
        resource: "items",
        limit: error.limit,
        observed: Number.isFinite(error.observed) ? error.observed : undefined,
      });
    }
    if (error instanceof ZoteroLibraryCursorError) {
      throw capabilityError("invalid_request", error.message, {
        reason: "invalid_value",
        field: "cursor",
      });
    }
    if (error instanceof ZoteroLibrarySourceQueryError) {
      throw canonicalReadFailure("item");
    }
    throw error;
  }
  const savedSearches = page.rows.map((row) => {
    const key = trimText((row as any).key, 64);
    const rowLibraryId = normalizeLibraryId(
      (row as any).libraryID ?? (row as any).libraryId,
    );
    const name = trimText((row as any).savedSearchName ?? (row as any).name);
    if (!key || rowLibraryId !== libraryId) {
      throw canonicalReadFailure("item");
    }
    return {
      ref: { libraryId, key },
      name,
    };
  });
  throwIfWorkflowCallCanceled(control);
  return {
    savedSearches,
    libraryId,
    limit: page.limit,
    total: page.total,
    returned: savedSearches.length,
    hasMore: page.hasMore,
    nextCursor: page.nextCursor,
    order: "stable_identity",
  };
}

const traversalEvidenceRegistry = new Map<
  string,
  LibraryTraversalCompletionEvidenceDto & {
    libraryId: number;
    scope: LibraryTraversalRequestDto["scope"];
    filtered: boolean;
    resumed: boolean;
    visitedItems: number;
    visitedBatches: number;
  }
>();
let traversalEvidenceSequence = 0;

export function verifyLibraryTraversalCompletionEvidence(
  evidence: LibraryTraversalCompletionEvidenceDto,
) {
  const registered = traversalEvidenceRegistry.get(evidence.evidenceId);
  return Boolean(
    registered &&
    registered.criteriaDigest === evidence.criteriaDigest &&
    registered.coverageDigest === evidence.coverageDigest &&
    registered.completedAt === evidence.completedAt,
  );
}

export function consumeTagAuditTraversalCompletionEvidence(args: {
  evidence: LibraryTraversalCompletionEvidenceDto;
  libraryId: number;
  visitedItems: number;
  visitedBatches: number;
}) {
  const registered = traversalEvidenceRegistry.get(args.evidence.evidenceId);
  if (!registered) return false;
  traversalEvidenceRegistry.delete(args.evidence.evidenceId);
  return Boolean(
    registered.libraryId === args.libraryId &&
    registered.scope === "top-level-regular" &&
    !registered.filtered &&
    !registered.resumed &&
    registered.visitedItems === args.visitedItems &&
    registered.visitedBatches === args.visitedBatches &&
    registered.criteriaDigest === args.evidence.criteriaDigest &&
    registered.coverageDigest === args.evidence.coverageDigest &&
    registered.completedAt === args.evidence.completedAt,
  );
}

function traversalLimit(
  value: number | undefined,
  fallback: number,
  hardMax: number,
  resource: "items" | "pages" | "duration_ms",
  field: "pageSize" | "maxItems" | "maxPages" | "maxDurationMs",
) {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved <= 0) {
    throw capabilityError("invalid_request", "traversal budget is invalid", {
      reason: "invalid_value",
      field,
    });
  }
  if (resolved > hardMax) {
    throw capabilityError("resource_limited", "traversal budget is invalid", {
      resource,
      limit: hardMax,
      observed: Number.isFinite(resolved) ? Number(resolved) : undefined,
    });
  }
  return resolved;
}

async function issueTraversalEvidence(
  criteriaDigest: string,
  coverageDigest: string,
  facts: Omit<
    NonNullable<ReturnType<typeof traversalEvidenceRegistry.get>>,
    keyof LibraryTraversalCompletionEvidenceDto
  >,
) {
  const completedAt = new Date().toISOString();
  traversalEvidenceSequence += 1;
  const evidenceId = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        criteriaDigest,
        coverageDigest,
        completedAt,
        sequence: traversalEvidenceSequence,
      }),
    ),
  );
  if (!evidenceId) {
    throw capabilityError(
      "unavailable",
      "traversal evidence hashing is unavailable",
      {
        reason: "runtime",
        kind: "library",
      },
    );
  }
  const evidence = {
    evidenceId,
    criteriaDigest,
    coverageDigest,
    completedAt,
  } satisfies LibraryTraversalCompletionEvidenceDto;
  traversalEvidenceRegistry.set(evidenceId, { ...evidence, ...facts });
  while (traversalEvidenceRegistry.size > 256) {
    const oldest = traversalEvidenceRegistry.keys().next().value;
    if (!oldest) break;
    traversalEvidenceRegistry.delete(oldest);
  }
  return evidence;
}

async function traverseLibraryItems(
  input: LibraryTraversalRequestDto,
  control: WorkflowCallControl,
  onBatch: (batch: LibraryTraversalBatchDto) => Promise<void> | void,
): Promise<LibraryTraversalResultDto> {
  if (input?.scope !== "top-level-regular") {
    throw capabilityError("invalid_request", "traversal scope is unsupported", {
      reason: "unsupported_value",
      field: "scope",
    });
  }
  if (typeof onBatch !== "function") {
    throw capabilityError("invalid_request", "traversal callback is required", {
      reason: "invalid_type",
      field: "onBatch",
    });
  }
  const pageSize = traversalLimit(
    input.pageSize,
    100,
    500,
    "items",
    "pageSize",
  );
  const maxItems = traversalLimit(
    input.maxItems,
    100_000,
    1_000_000,
    "items",
    "maxItems",
  );
  const maxPages = traversalLimit(
    input.maxPages,
    1_000,
    10_000,
    "pages",
    "maxPages",
  );
  const maxDurationMs = traversalLimit(
    input.maxDurationMs,
    300_000,
    1_800_000,
    "duration_ms",
    "maxDurationMs",
  );
  const libraryId = normalizeLibraryId(input.libraryId);
  const startedAt = Date.now();
  const coverage = await createSha256Accumulator();
  if (!coverage) {
    throw capabilityError("unavailable", "traversal hashing is unavailable", {
      reason: "runtime",
      kind: "library",
    });
  }
  const coverageTuples: Array<{
    ref: { libraryId: number; key: string };
    revision: string;
    tagDigest: string;
  }> = [];
  let cursor = input.resumeCursor;
  let visitedItems = 0;
  let visitedBatches = 0;
  let criteriaDigest = "";
  for (;;) {
    if (control?.signal?.aborted) {
      return { outcome: "canceled", libraryId, visitedItems, visitedBatches };
    }
    const remainingItems = maxItems - visitedItems;
    const page = await listLibraryItems(
      {
        libraryId,
        collectionRef: input.collectionRef,
        tag: input.tag,
        itemType: input.itemType,
        query: input.query,
        limit: Math.min(pageSize, remainingItems),
        cursor,
      },
      control,
    );
    if (!criteriaDigest) {
      criteriaDigest =
        (await sha256Hex(
          new TextEncoder().encode(
            JSON.stringify({ ...page.criteria, scope: input.scope }),
          ),
        )) || "";
      if (!criteriaDigest) {
        throw capabilityError(
          "unavailable",
          "traversal hashing is unavailable",
          {
            reason: "runtime",
            kind: "library",
          },
        );
      }
    }
    const items = await Promise.all(
      page.items.map(async (item) => {
        if (item.kind !== "regular") {
          throw canonicalReadFailure("item");
        }
        const tags = Array.from(new Set(item.tags)).sort(
          compareCanonicalTextCodeUnits,
        );
        const tagDigest = await sha256Hex(
          new TextEncoder().encode(JSON.stringify(tags)),
        );
        if (!tagDigest) throw canonicalReadFailure("item");
        return { ...item, tags, tagDigest };
      }),
    );
    if (items.length) {
      const batch = { batchIndex: visitedBatches, items };
      await onBatch(batch);
      for (const item of items) {
        coverageTuples.push({
          ref: item.ref,
          revision: item.revision,
          tagDigest: item.tagDigest,
        });
      }
      visitedItems += items.length;
      visitedBatches += 1;
    }
    if (control?.signal?.aborted) {
      return { outcome: "canceled", libraryId, visitedItems, visitedBatches };
    }
    if (!page.hasMore) {
      coverageTuples.sort(
        (left, right) =>
          left.ref.libraryId - right.ref.libraryId ||
          (left.ref.key < right.ref.key
            ? -1
            : left.ref.key > right.ref.key
              ? 1
              : 0),
      );
      for (const tuple of coverageTuples) {
        coverage.update(
          new TextEncoder().encode(
            `${JSON.stringify([tuple.ref, tuple.revision, tuple.tagDigest])}\n`,
          ),
        );
      }
      const completionEvidence = await issueTraversalEvidence(
        criteriaDigest,
        coverage.digestHex(),
        {
          libraryId,
          scope: input.scope,
          filtered: Boolean(
            input.collectionRef || input.tag || input.itemType || input.query,
          ),
          resumed: Boolean(input.resumeCursor),
          visitedItems,
          visitedBatches,
        },
      );
      return {
        outcome: "completed",
        libraryId,
        scope: "top-level-regular",
        visitedItems,
        visitedBatches,
        completionEvidence,
      };
    }
    if (!page.nextCursor) throw canonicalReadFailure("item");
    const resumeCursor = page.nextCursor;
    if (visitedItems >= maxItems) {
      return {
        outcome: "resource_limited",
        libraryId,
        visitedItems,
        visitedBatches,
        reason: "max_items",
        resumeCursor,
      };
    }
    if (visitedBatches >= maxPages) {
      return {
        outcome: "resource_limited",
        libraryId,
        visitedItems,
        visitedBatches,
        reason: "max_pages",
        resumeCursor,
      };
    }
    if (Date.now() - startedAt >= maxDurationMs) {
      return {
        outcome: "resource_limited",
        libraryId,
        visitedItems,
        visitedBatches,
        reason: "max_duration",
        resumeCursor,
      };
    }
    cursor = resumeCursor;
  }
}

function snapshotOwnerId(scope?: ZoteroHostLibrarySnapshotCallerScope) {
  const ownerId = trimText(scope?.ownerId, 128);
  return ownerId || "broker-process";
}

function snapshotLibraryId(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw capabilityError(
      "invalid_request",
      "snapshot libraryId must be a positive integer",
      { reason: "invalid_value", field: "libraryId" },
    );
  }
  return value;
}

function snapshotBatchSize(value: unknown, fallback?: number) {
  if (value === undefined) {
    return fallback || ZOTERO_LIBRARY_SNAPSHOT_BATCH_SIZE_DEFAULT;
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw capabilityError(
      "invalid_request",
      "snapshot batchSize must be a positive integer",
      { reason: "invalid_value", field: "batchSize" },
    );
  }
  if (value > ZOTERO_LIBRARY_SNAPSHOT_BATCH_SIZE_MAX) {
    throw capabilityError(
      "resource_limited",
      "snapshot batchSize exceeds the fixed maximum",
      {
        resource: "items",
        limit: ZOTERO_LIBRARY_SNAPSHOT_BATCH_SIZE_MAX,
        observed: value,
      },
    );
  }
  return value;
}

function purgeExpiredSnapshotSessions(now: number) {
  for (const [snapshotId, session] of snapshotSessions) {
    if (session.processId !== snapshotProcessId || now > session.expiresAt) {
      snapshotSessions.delete(snapshotId);
    }
  }
}

function uniqueSnapshotToken(prefix: "snapshot" | "cursor") {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const token = `${prefix}-${snapshotRuntime.randomId()}`;
    if (prefix === "cursor") return token;
    if (!snapshotSessions.has(token)) return token;
  }
  throw capabilityError(
    "unavailable",
    "snapshot identity generation is unavailable",
    { reason: "runtime", kind: "library" },
  );
}

async function captureSnapshotItems(
  libraryId: number,
  control: WorkflowCallControl = {},
) {
  let cursor: string | undefined;
  const captured: ZoteroHostSnapshotCapturedItem[] = [];
  let expectedTotal: number | null = null;
  for (;;) {
    const sourcePage = await withZoteroHostSlice(control, () =>
      queryZoteroLibraryPage(
        {
          libraryId,
          limit: SNAPSHOT_CAPTURE_PAGE_SIZE,
          ...(cursor ? { cursor } : {}),
        },
        {
          defaultLibraryId: libraryId,
          defaultLimit: SNAPSHOT_CAPTURE_PAGE_SIZE,
          maxLimit: SNAPSHOT_CAPTURE_PAGE_SIZE,
        },
      ),
    );
    const snapshots = await mapZoteroHostTargets(
      sourcePage.items,
      control,
      serializeLibrarySyncSnapshotItem,
    );
    if (expectedTotal === null) {
      expectedTotal = sourcePage.totalScanned;
      if (expectedTotal > snapshotRuntime.maxItems) {
        throw capabilityError(
          "resource_limited",
          "snapshot item count exceeds the fixed maximum",
          {
            resource: "items",
            limit: snapshotRuntime.maxItems,
            observed: expectedTotal,
          },
        );
      }
    } else if (sourcePage.totalScanned !== expectedTotal) {
      throw capabilityError(
        "conflict",
        "snapshot item set changed during capture",
        { reason: "concurrent_modification", kind: "library" },
      );
    }
    if (sourcePage.items.length !== sourcePage.returned) {
      throw capabilityError(
        "execution_failed",
        "snapshot item hydration was incomplete",
        { phase: "read", recovery: "refresh_and_retry_new_operation" },
      );
    }
    for (const snapshot of snapshots) {
      captured.push({ ref: snapshot.ref, revision: snapshot.revision });
      if (captured.length > snapshotRuntime.maxItems) {
        throw capabilityError(
          "resource_limited",
          "snapshot item count exceeds the fixed maximum",
          {
            resource: "items",
            limit: snapshotRuntime.maxItems,
            observed: captured.length,
          },
        );
      }
    }
    if (!sourcePage.hasMore) break;
    if (!sourcePage.nextCursor) {
      throw capabilityError(
        "execution_failed",
        "snapshot capture continuation is missing",
        { phase: "read", recovery: "refresh_and_retry_new_operation" },
      );
    }
    cursor = sourcePage.nextCursor;
  }
  if (captured.length !== (expectedTotal || 0)) {
    throw capabilityError("conflict", "snapshot captured item count changed", {
      reason: "concurrent_modification",
      kind: "library",
    });
  }
  // Validate captured membership and revisions before publishing a session.
  // Counts alone miss edits to pages read earlier in the capture.
  cursor = undefined;
  let verified = 0;
  for (;;) {
    const source = await withZoteroHostSlice(control, () =>
      queryZoteroLibraryPage(
        {
          libraryId,
          limit: SNAPSHOT_CAPTURE_PAGE_SIZE,
          ...(cursor ? { cursor } : {}),
        },
        {
          defaultLibraryId: libraryId,
          defaultLimit: SNAPSHOT_CAPTURE_PAGE_SIZE,
          maxLimit: SNAPSHOT_CAPTURE_PAGE_SIZE,
        },
      ),
    );
    const page = {
      total: source.totalScanned,
      hasMore: source.hasMore,
      nextCursor: source.nextCursor,
      items: await mapZoteroHostTargets(source.items, control, (item) => {
        const snapshot = serializeLibrarySyncSnapshotItem(item);
        return { ref: snapshot.ref, revision: snapshot.revision };
      }),
    };
    if (
      page.total !== captured.length ||
      page.items.some((item, index) => {
        const expected = captured[verified + index];
        return (
          !expected ||
          item.ref.key !== expected.ref.key ||
          item.ref.libraryId !== expected.ref.libraryId ||
          item.revision !== expected.revision
        );
      })
    ) {
      throw capabilityError(
        "conflict",
        "snapshot source changed during capture",
        {
          reason: "concurrent_modification",
          kind: "library",
        },
      );
    }
    verified += page.items.length;
    if (!page.hasMore) break;
    if (!page.nextCursor) throw canonicalReadFailure("item");
    cursor = page.nextCursor;
  }
  if (verified !== captured.length) {
    throw capabilityError(
      "conflict",
      "snapshot membership changed during capture",
      {
        reason: "concurrent_modification",
        kind: "library",
      },
    );
  }
  captured.sort((left, right) =>
    `${left.ref.libraryId}\n${left.ref.key}`.localeCompare(
      `${right.ref.libraryId}\n${right.ref.key}`,
    ),
  );
  const seen = new Set<string>();
  for (const item of captured) {
    const identity = `${item.ref.libraryId}\n${item.ref.key}`;
    if (seen.has(identity)) {
      throw capabilityError(
        "conflict",
        "snapshot captured duplicate item identity",
        { reason: "ambiguous_state", kind: "library" },
      );
    }
    seen.add(identity);
  }
  const basisDigest = hashSynthesisContractCanonicalJson({
    libraryId,
    items: captured,
  });
  return { items: captured, basisDigest };
}

async function openSnapshotSession(
  args: {
    libraryId: number;
    batchSize: number;
    ownerId: string;
  },
  control: WorkflowCallControl = {},
) {
  throwIfWorkflowCallCanceled(control);
  const now = snapshotRuntime.now();
  purgeExpiredSnapshotSessions(now);
  if (snapshotSessions.size >= SNAPSHOT_ACTIVE_SESSION_LIMIT) {
    throw capabilityError(
      "resource_limited",
      "too many snapshot sessions are active",
      {
        resource: "entries",
        limit: SNAPSHOT_ACTIVE_SESSION_LIMIT,
        observed: snapshotSessions.size,
      },
    );
  }
  const capture = await captureSnapshotItems(args.libraryId, control);
  throwIfWorkflowCallCanceled(control);
  const snapshotId = uniqueSnapshotToken("snapshot");
  const session: ZoteroHostSnapshotSession = {
    processId: snapshotProcessId,
    snapshotId,
    ownerId: args.ownerId,
    libraryId: args.libraryId,
    batchSize: args.batchSize,
    createdAt: now,
    expiresAt: now + ZOTERO_LIBRARY_SNAPSHOT_TTL_MS,
    items: capture.items,
    basisDigest: capture.basisDigest,
    deliveredItems: 0,
    deliveredBatches: 0,
    expectedCursor: null,
    expectedOffset: 0,
  };
  snapshotSessions.set(snapshotId, session);
  return session;
}

function snapshotSessionOrThrow(args: {
  snapshotId: string;
  ownerId: string;
  libraryId: number;
  batchSize?: number;
  cursor: string;
}) {
  const session = snapshotSessions.get(args.snapshotId);
  if (!session || session.processId !== snapshotProcessId) {
    throw capabilityError(
      "invalid_ref",
      "snapshot identity is invalid for this Host process",
      { kind: "library", reason: "expired" },
    );
  }
  const now = snapshotRuntime.now();
  if (now > session.expiresAt) {
    snapshotSessions.delete(session.snapshotId);
    throw capabilityError("invalid_ref", "snapshot session has expired", {
      kind: "library",
      reason: "expired",
    });
  }
  if (session.ownerId !== args.ownerId) {
    throw capabilityError(
      "invalid_ref",
      "snapshot identity belongs to another caller",
      { kind: "library", reason: "foreign_scope" },
    );
  }
  if (session.libraryId !== args.libraryId) {
    snapshotSessions.delete(session.snapshotId);
    throw capabilityError("invalid_ref", "snapshot library basis changed", {
      kind: "library",
      reason: "foreign_scope",
    });
  }
  const batchSize = snapshotBatchSize(args.batchSize, session.batchSize);
  if (batchSize !== session.batchSize) {
    snapshotSessions.delete(session.snapshotId);
    throw capabilityError("conflict", "snapshot batch basis changed", {
      reason: "revision_mismatch",
      kind: "library",
    });
  }
  if (!session.expectedCursor || args.cursor !== session.expectedCursor) {
    snapshotSessions.delete(session.snapshotId);
    throw capabilityError("invalid_ref", "snapshot cursor is invalid", {
      kind: "library",
      reason: "forged",
    });
  }
  session.expectedCursor = null;
  return session;
}

function cancelLibrarySnapshot(
  snapshotId: string,
  scope?: ZoteroHostLibrarySnapshotCallerScope,
): ZoteroLibrarySnapshotIncompleteResultDto {
  const normalizedId = trimText(snapshotId, 256);
  const session = snapshotSessions.get(normalizedId);
  if (!session || session.processId !== snapshotProcessId) {
    throw capabilityError("invalid_ref", "snapshot identity is invalid", {
      kind: "library",
      reason: "expired",
    });
  }
  if (session.ownerId !== snapshotOwnerId(scope)) {
    throw capabilityError(
      "invalid_ref",
      "snapshot identity belongs to another caller",
      { kind: "library", reason: "foreign_scope" },
    );
  }
  snapshotSessions.delete(session.snapshotId);
  return {
    outcome: "canceled",
    snapshotId: session.snapshotId,
    deliveredItems: session.deliveredItems,
    deliveredBatches: session.deliveredBatches,
  };
}

async function readSnapshotSession(
  session: ZoteroHostSnapshotSession,
  control: WorkflowCallControl = {},
): Promise<ZoteroHostLibrarySyncSnapshotResponse> {
  const offset = session.expectedOffset;
  const captured = session.items.slice(offset, offset + session.batchSize);
  const items: ZoteroHostLibrarySyncSnapshotItemDto[] = [];
  try {
    const serialized = await mapZoteroHostTargets(
      captured,
      control,
      (expected) => {
        const item = resolveItem(expected.ref);
        if (!item) {
          throw capabilityError(
            "conflict",
            "snapshot item disappeared after capture",
            { reason: "concurrent_modification", kind: "library" },
          );
        }
        const value = serializeLibrarySyncSnapshotItem(item);
        if (value.revision !== expected.revision) {
          throw capabilityError(
            "conflict",
            "snapshot item revision changed after capture",
            { reason: "revision_mismatch", kind: "library" },
          );
        }
        return value;
      },
    );
    items.push(...serialized);
    throwIfWorkflowCallCanceled(control);
  } catch (error) {
    snapshotSessions.delete(session.snapshotId);
    throw error;
  }
  session.deliveredItems += items.length;
  session.deliveredBatches += 1;
  const batchIndex = session.deliveredBatches - 1;
  const nextOffset = offset + items.length;
  const hasMore = nextOffset < session.items.length;
  const base = {
    schema: ZOTERO_LIBRARY_SNAPSHOT_SCHEMA,
    snapshotId: session.snapshotId,
    libraryId: session.libraryId,
    scope: ZOTERO_LIBRARY_SNAPSHOT_SCOPE,
    order: ZOTERO_LIBRARY_SNAPSHOT_ORDER,
    batchSize: session.batchSize,
    batchIndex,
    items,
    returned: items.length,
    deliveredItems: session.deliveredItems,
    deliveredBatches: session.deliveredBatches,
  };
  if (hasMore) {
    const nextCursor = uniqueSnapshotToken("cursor");
    session.expectedCursor = nextCursor;
    session.expectedOffset = nextOffset;
    return {
      ...base,
      outcome: "active",
      nextCursor,
      hasMore: true,
    };
  }
  const completedAt = new Date(snapshotRuntime.now()).toISOString();
  const completionEvidence = {
    snapshotId: session.snapshotId,
    schema: ZOTERO_LIBRARY_SNAPSHOT_SCHEMA,
    libraryId: session.libraryId,
    scope: ZOTERO_LIBRARY_SNAPSHOT_SCOPE,
    totalItems: session.items.length,
    totalBatches: session.deliveredBatches,
    order: ZOTERO_LIBRARY_SNAPSHOT_ORDER,
    contentDigest: hashSynthesisContractCanonicalJson({
      schema: ZOTERO_LIBRARY_SNAPSHOT_SCHEMA,
      snapshotId: session.snapshotId,
      libraryId: session.libraryId,
      scope: ZOTERO_LIBRARY_SNAPSHOT_SCOPE,
      order: ZOTERO_LIBRARY_SNAPSHOT_ORDER,
      items: session.items,
    }),
    completedAt,
  };
  snapshotSessions.delete(session.snapshotId);
  return {
    ...base,
    outcome: "completed",
    nextCursor: null,
    hasMore: false,
    completionEvidence,
  };
}

async function syncLibrarySnapshot(
  args: ZoteroHostLibrarySyncSnapshotRequest,
  scope?: ZoteroHostLibrarySnapshotCallerScope,
  control: WorkflowCallControl = {},
): Promise<ZoteroHostLibrarySyncSnapshotResponse> {
  throwIfWorkflowCallCanceled(control);
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw capabilityError("invalid_request", "snapshot request is invalid", {
      reason: "invalid_type",
    });
  }
  const libraryId = snapshotLibraryId(args.libraryId);
  const ownerId = snapshotOwnerId(scope);
  const snapshotId = trimText(args.snapshotId, 256);
  const cursor = trimText(args.cursor, 256);
  if ((snapshotId && !cursor) || (!snapshotId && cursor)) {
    throw capabilityError(
      "invalid_request",
      "snapshotId and cursor must be supplied together",
      { reason: "invalid_combination" },
    );
  }
  const session = snapshotId
    ? snapshotSessionOrThrow({
        snapshotId,
        ownerId,
        libraryId,
        batchSize: args.batchSize,
        cursor,
      })
    : await openSnapshotSession(
        {
          libraryId,
          batchSize: snapshotBatchSize(args.batchSize),
          ownerId,
        },
        control,
      );
  return readSnapshotSession(session, control);
}

async function readinessAudit(
  args: ZoteroHostLibraryReadinessAuditArgs = {},
  control: WorkflowCallControl = {},
): Promise<ZoteroHostLibraryReadinessAuditResponse> {
  throwIfWorkflowCallCanceled(control);
  const selection = await withZoteroHostSlice(control, () =>
    selectLibraryItemPage(args),
  );
  const checks = normalizeReadinessChecks(args.checks);
  const missingOnly = parseBooleanInput(args.missingOnly ?? args.missing_only);
  const items: ZoteroHostLibraryReadinessItemDto[] = [];
  let sliceStartedAt = Date.now();
  let sliceProcessed = 0;
  for (const item of selection.page) {
    throwIfWorkflowCallCanceled(control);
    const dto = await serializeLibraryReadinessItem(
      item as LibraryArtifactItem,
      checks,
      {
        runNativeSlice: (run) => withZoteroHostSlice(control, run),
        checkCanceled: () => throwIfWorkflowCallCanceled(control),
      },
    );
    throwIfWorkflowCallCanceled(control);
    if (!missingOnly || dto.missing.length > 0) {
      items.push(dto);
    }
    sliceProcessed += 1;
    if (shouldYieldHostSlice(sliceStartedAt, sliceProcessed)) {
      await yieldToEventLoop();
      sliceStartedAt = Date.now();
      sliceProcessed = 0;
    }
  }
  throwIfWorkflowCallCanceled(control);
  return {
    schema: "zotero.library.readiness_audit.v1",
    generatedAt: new Date().toISOString(),
    checks,
    missingOnly,
    items,
    nextCursor: selection.nextCursor,
    hasMore: selection.hasMore,
    returned: items.length,
    totalScanned: selection.totalScanned,
    filters: selection.filters,
  };
}

function normalizeReadinessChecks(value: unknown) {
  const raw = Array.isArray(value)
    ? value
    : trimText(value)
      ? trimText(value)
          .split(",")
          .map((entry) => entry.trim())
      : LIBRARY_READINESS_CHECKS;
  const checks = raw.filter((entry): entry is ZoteroHostLibraryReadinessCheck =>
    LIBRARY_READINESS_CHECKS.includes(entry as ZoteroHostLibraryReadinessCheck),
  );
  return checks.length ? Array.from(new Set(checks)) : LIBRARY_READINESS_CHECKS;
}

async function serializeLibraryReadinessItem(
  item: LibraryArtifactItem,
  checks: ZoteroHostLibraryReadinessCheck[],
  options: LibraryArtifactReadOptions = {},
): Promise<ZoteroHostLibraryReadinessItemDto> {
  const artifactReadiness = await resolveLibraryArtifactReadiness(
    item,
    options,
  );
  const summary = options.runNativeSlice
    ? await options.runNativeSlice(() => serializeLibraryItemSummary(item))
    : serializeLibraryItemSummary(item);
  const readiness = {
    pdf: artifactReadiness.pdf.present ? "present" : "missing",
    markdown: artifactReadiness.sourceMarkdown.present ? "present" : "missing",
    analysis: artifactReadiness.generated.complete ? "present" : "missing",
  } satisfies ZoteroHostLibraryReadinessItemDto["readiness"];
  const missing = checks.filter((check) => readiness[check] === "missing");
  return {
    ...summary,
    readiness,
    missing,
    evidence: {
      artifacts: artifactReadiness.artifacts,
      artifactState: artifactReadiness.state,
      pdf: {
        present: artifactReadiness.pdf.present,
        filename: artifactReadiness.pdf.filename || undefined,
      },
      markdown: {
        present: artifactReadiness.sourceMarkdown.present,
        matchingStem:
          artifactReadiness.sourceMarkdown.matchingStem || undefined,
        markdownStemCount:
          artifactReadiness.sourceMarkdown.markdownStems.length,
      },
      analysis: {
        present: artifactReadiness.generated.complete,
        missingParts: artifactReadiness.generated.missingParts,
      },
    },
  };
}

function selectedRowFlag(row: any, method: string) {
  try {
    return typeof row?.[method] === "function" && row[method]() === true;
  } catch {
    return false;
  }
}

function serializeSelectedSource(row: any): CurrentViewSourceDto {
  const ref = row?.ref || {};
  const rowType = trimText(row?.type).toLowerCase();
  const isCollection =
    selectedRowFlag(row, "isCollection") || rowType === "collection";
  const id = parsePositiveInteger(
    ref?.id ?? ref?.collectionID ?? ref?.searchID,
  );
  const libraryId = normalizeLibraryId(ref?.libraryID ?? ref?.libraryId);
  const collection =
    isCollection && id ? resolveZotero().Collections?.get?.(id) : null;
  if (
    collection &&
    trimText((collection as any).key) &&
    !selectedRowFlag(row, "isSearch")
  ) {
    const serialized = serializeCollection(collection);
    return {
      kind: "collection",
      ref: { libraryId: serialized.libraryId, key: serialized.key },
      name: serialized.name,
      libraryId: serialized.libraryId,
    };
  }
  if (selectedRowFlag(row, "isSearch")) {
    return {
      kind: "saved-search",
      ref: { libraryId, key: trimText(ref?.key) },
      name: trimText(ref?.name ?? row?.name),
    };
  }
  if (
    selectedRowFlag(row, "isLibrary") ||
    selectedRowFlag(row, "isGroup") ||
    ["library", "group"].includes(trimText(row?.type).toLowerCase())
  ) {
    return {
      kind: "library",
      libraryId,
      ...(trimText(ref?.name ?? row?.name)
        ? { name: trimText(ref?.name ?? row?.name) }
        : {}),
    };
  }
  return {
    kind: "special",
    type:
      trimText(row?.type ?? row?.id ?? ref?.type).toLowerCase() || "unknown",
    ...(libraryId ? { libraryId } : {}),
    ...(trimText(ref?.name ?? row?.name)
      ? { label: trimText(ref?.name ?? row?.name) }
      : {}),
  };
}

function getCurrentViewSources(
  win = (globalThis as any).Zotero?.getMainWindow?.() ||
    (globalThis as any).window,
): CurrentViewSourceDto[] {
  if (!win) return [];
  return resolveSelectedLibraryTreeRows(win).map(serializeSelectedSource);
}

function buildCurrentViewFacts(win: _ZoteroTypes.MainWindow): {
  target: "library" | "reader";
  selectionEmpty: boolean;
  currentItem?: { ref: ZoteroHostItemRefInput; title?: string };
} {
  const selectedTabId = trimText((win as any).Zotero_Tabs?.selectedID);
  const tabRecord = selectedTabId
    ? (win as any).Zotero_Tabs?._getTab?.(selectedTabId)
    : null;
  const target =
    trimText(tabRecord?.type).toLowerCase() === "reader" ? "reader" : "library";
  const itemId = parsePositiveInteger(tabRecord?.tab?.data?.itemID);
  const readerItem = itemId ? resolveZotero().Items.get(itemId) : null;
  const selected: unknown =
    target === "reader"
      ? readerItem
      : (win as any).ZoteroPane?.getSelectedItems?.()?.[0];
  if (!selected) {
    return { target, selectionEmpty: true };
  }
  if (!isRawZoteroItem(selected)) throw canonicalReadFailure("item");
  const ref = canonicalItemRef(selected);
  const title = getItemTitle(selected);
  return {
    target,
    selectionEmpty: false,
    currentItem: { ref, ...(title ? { title } : {}) },
  };
}

function currentViewSourceLibraryId(source: CurrentViewSourceDto) {
  if (source.kind === "collection" || source.kind === "library") {
    return source.libraryId;
  }
  if (source.kind === "saved-search") return source.ref.libraryId;
  return source.libraryId;
}

async function getSelectedItems(
  request: SelectedItemsPageRequestDto = {},
  control: WorkflowCallControl = {},
  selectionWindow?: _ZoteroTypes.MainWindow,
): Promise<SelectedItemsPageDto> {
  const limit = Math.min(
    LIBRARY_LIST_LIMIT_MAX,
    Math.max(
      1,
      parsePositiveInteger(request.limit) || LIBRARY_LIST_LIMIT_DEFAULT,
    ),
  );
  const cursor = request.cursor
    ? decodeSelectedItemsCursor(request.cursor)
    : null;
  const win =
    (globalThis as any).Zotero?.getMainWindow?.() || (globalThis as any).window;
  const pane = (selectionWindow || win)?.ZoteroPane;
  if (!pane || typeof pane.getSelectedItems !== "function") {
    throw capabilityError("unavailable", "Zotero selection is unavailable", {
      reason: "navigation",
      kind: "item",
    });
  }
  const raw = await withZoteroHostSlice(control, () => {
    try {
      return pane.getSelectedItems();
    } catch {
      throw canonicalReadFailure("item");
    }
  });
  if (!Array.isArray(raw)) throw canonicalReadFailure("item");

  const refs: ZoteroHostItemRefInput[] = [];
  let sliceStartedAt = Date.now();
  let sliceProcessed = 0;
  for (let offset = 0; offset < raw.length; offset += 1) {
    throwIfWorkflowCallCanceled(control);
    const ref = await withZoteroHostSlice(control, () => {
      const item = raw[offset];
      if (!isRawZoteroItem(item)) throw canonicalReadFailure("item");
      return canonicalItemRef(item);
    });
    refs.push(ref);
    throwIfWorkflowCallCanceled(control);
    sliceProcessed += 1;
    if (shouldYieldHostSlice(sliceStartedAt, sliceProcessed)) {
      await yieldToEventLoop();
      sliceStartedAt = Date.now();
      sliceProcessed = 0;
    }
  }

  const basis = await selectedItemsBasis(refs);
  if (cursor && cursor.basis !== basis) {
    throw capabilityError(
      "conflict",
      "selection changed during page acquisition",
      { reason: "basis_mismatch", kind: "workflow_input" },
    );
  }
  const afterIndex = cursor?.afterIndex || 0;
  if (afterIndex > refs.length) {
    throw capabilityError(
      "invalid_request",
      "selection cursor is beyond the current selection",
      { reason: "invalid_value", field: "cursor" },
    );
  }

  const pageItems: SelectedItemSummaryDto[] = [];
  const pageEnd = Math.min(refs.length, afterIndex + limit);
  sliceStartedAt = Date.now();
  sliceProcessed = 0;
  for (let offset = afterIndex; offset < pageEnd; offset += 1) {
    throwIfWorkflowCallCanceled(control);
    const selected = await withZoteroHostSlice(control, () => {
      const item = raw[offset];
      if (!isRawZoteroItem(item)) throw canonicalReadFailure("item");
      const parentRef = canonicalParentRef(item);
      const title = getItemTitle(item);
      return {
        ref: refs[offset],
        itemType: String(item.itemType || ""),
        ...(title ? { title } : {}),
        ...(parentRef ? { parentRef } : {}),
      };
    });
    throwIfWorkflowCallCanceled(control);
    pageItems.push(selected);
    sliceProcessed += 1;
    if (shouldYieldHostSlice(sliceStartedAt, sliceProcessed)) {
      await yieldToEventLoop();
      sliceStartedAt = Date.now();
      sliceProcessed = 0;
    }
  }

  const hasMore = pageEnd < refs.length;
  return {
    items: pageItems,
    returned: pageItems.length,
    total: refs.length,
    hasMore,
    nextCursor: hasMore
      ? encodeSelectedItemsCursor({
          version: SELECTED_ITEMS_CURSOR_VERSION,
          basis,
          afterIndex: pageEnd,
        })
      : null,
  };
}

function getCurrentView(viewWindow?: _ZoteroTypes.MainWindow): CurrentViewDto {
  const win =
    viewWindow ||
    (globalThis as any).Zotero?.getMainWindow?.() ||
    (globalThis as any).window;
  if (!win?.ZoteroPane) {
    throw capabilityError("unavailable", "Zotero view context is unavailable", {
      reason: "navigation",
      kind: "library",
    });
  }
  const context = buildCurrentViewFacts(win);
  const selectedSources = getCurrentViewSources(win);
  const libraryIds = Array.from(
    new Set(
      [
        ...resolveSelectedLibraryIds(win),
        ...selectedSources.map(currentViewSourceLibraryId),
      ]
        .map(parsePositiveInteger)
        .filter((libraryId): libraryId is number => libraryId > 0),
    ),
  );
  const libraryId = libraryIds.length === 1 ? libraryIds[0] : 0;
  const selectedCollection =
    selectedSources.length === 1 && selectedSources[0]?.kind === "collection"
      ? selectedSources[0]
      : null;
  return {
    target: context.target,
    libraryIds,
    selectedSources,
    ...(libraryId ? { libraryId } : {}),
    selectionEmpty: context.selectionEmpty,
    ...(context.currentItem ? { currentItem: context.currentItem } : {}),
    ...(selectedCollection
      ? {
          currentCollection: {
            ref: {
              libraryId: selectedCollection.ref.libraryId,
              key: selectedCollection.ref.key,
            },
            name: selectedCollection.name,
          },
        }
      : {}),
  };
}

function resolveZoteroPane() {
  const win =
    (globalThis as any).Zotero?.getMainWindow?.() || (globalThis as any).window;
  const pane = win?.ZoteroPane;
  if (!pane) {
    throw navigationUnavailableError("Zotero pane navigation is unavailable");
  }
  return { win, pane };
}

async function selectZoteroItems(items: Zotero.Item[]) {
  const itemIds = items
    .map((item) => parsePositiveInteger(item.id))
    .filter((id) => id > 0);
  if (itemIds.length === 0) {
    throw capabilityError("execution_failed", "item has no numeric id", {
      phase: "adapter",
      recovery: "none",
    });
  }
  const { win, pane } = resolveZoteroPane();
  if (itemIds.length === 1 && typeof pane.selectItem === "function") {
    await pane.selectItem(itemIds[0]);
  } else if (typeof pane.selectItems === "function") {
    await pane.selectItems(itemIds);
  } else {
    throw navigationUnavailableError("Zotero pane cannot select items");
  }
  win?.focus?.();
}

async function selectZoteroCollection(collection: Zotero.Collection) {
  const collectionId = parsePositiveInteger(
    (collection as unknown as { id?: unknown }).id,
  );
  const collectionKey = trimText(
    (collection as unknown as { key?: unknown }).key,
  );
  const { win, pane } = resolveZoteroPane();
  const collectionsView = pane.collectionsView || pane.collectionsTree;
  if (typeof pane.selectCollection === "function") {
    await pane.selectCollection(collectionId || collectionKey);
  } else if (typeof collectionsView?.selectCollection === "function") {
    await collectionsView.selectCollection(collectionId || collectionKey);
  } else if (typeof collectionsView?.selectByID === "function") {
    await collectionsView.selectByID(collectionId || collectionKey);
  } else {
    throw navigationUnavailableError("Zotero pane cannot select collections");
  }
  win?.focus?.();
}

function collectionRefFromOpenArgs(args: ZoteroHostCollectionOpenArgs) {
  const key = trimText(args.key || args.collectionKey);
  if (!key) {
    throw invalidRefError(
      "collection",
      "invalid_key",
      "collection key is required",
    );
  }
  const ref = {
    key,
    libraryId: parsePositiveInteger(args.libraryId ?? args.libraryID),
  };
  assertPortableRef(ref, "collection");
  return ref;
}

export async function openLegacyZoteroItem(
  ref: ZoteroHostItemRefInput,
): Promise<ZoteroHostNavigationResultDto> {
  const item = requireItem(ref);
  await selectZoteroItems([item]);
  return {
    opened: true,
    found: true,
    target: {
      kind: "item",
      item: serializeZoteroItemSummary(item),
    },
    currentView: getCurrentView(),
  };
}

export async function openLegacyZoteroNote(
  ref: ZoteroHostItemRefInput,
): Promise<ZoteroHostNavigationResultDto> {
  const note = requireNote(ref);
  await selectZoteroItems([note]);
  return {
    opened: true,
    found: true,
    target: {
      kind: "note",
      item: serializeZoteroItemSummary(note),
    },
    currentView: getCurrentView(),
  };
}

export async function openLegacyZoteroCollection(
  args: ZoteroHostCollectionOpenArgs,
): Promise<ZoteroHostNavigationResultDto> {
  const ref = collectionRefFromOpenArgs(args);
  const collection = resolveCollection(ref);
  if (!collection) {
    throw notFoundError("collection", ref);
  }
  await selectZoteroCollection(collection);
  return {
    opened: true,
    found: true,
    target: {
      kind: "collection",
      collection: serializeCollection(collection),
    },
    currentView: getCurrentView(),
  };
}

export async function openLegacyZoteroSelection(
  args: ZoteroHostSelectionOpenArgs,
): Promise<ZoteroHostNavigationResultDto> {
  const refs = Array.isArray(args.items) ? args.items : [];
  if (refs.length === 0) {
    throw capabilityError("invalid_request", "selection open requires items", {
      reason: "missing_field",
      field: "items",
    });
  }
  const items = refs.map((ref) => requireItem(ref));
  await selectZoteroItems(items);
  return {
    opened: true,
    found: true,
    target: {
      kind: "selection",
      items: items.map(serializeZoteroItemSummary),
    },
    currentView: getCurrentView(),
  };
}

export function createZoteroHostCapabilityBroker(
  attachmentPrimitives: ZoteroHostAttachmentMutationPrimitives = {},
  selectionWindow?: () => _ZoteroTypes.MainWindow,
): ZoteroHostCapabilityBroker {
  return {
    context: {
      getCurrentView(): CurrentViewDto {
        return getCurrentView(selectionWindow?.());
      },
      getSelectedItems: (request, control) =>
        getSelectedItems(request, control, selectionWindow?.()),
    },
    navigation: {
      openItem: openZoteroItem,
      openNote: openZoteroNote,
      openCollection: openZoteroCollection,
      openSelection: openZoteroSelection,
    },
    library: {
      listItems: listLibraryItems,
      traverseItems: traverseLibraryItems,
      listCollections: listLibraryCollections,
      listSavedSearches: listLibrarySavedSearches,
      syncSnapshot: (
        args: ZoteroHostLibrarySyncSnapshotRequest,
        scope?: ZoteroHostLibrarySnapshotCallerScope,
        control?: WorkflowCallControl,
      ) => syncLibrarySnapshot(args, scope, control),
      cancelSnapshot: cancelLibrarySnapshot,
      readinessAudit: (
        args: ZoteroHostLibraryReadinessAuditArgs,
        control?: WorkflowCallControl,
      ) => readinessAudit(args, control),
      async getItemDetail(
        ref: ZoteroHostItemRefInput,
        control: WorkflowCallControl = {},
      ) {
        throwIfWorkflowCallCanceled(control);
        const target = await withZoteroHostSlice(control, () => {
          const item = requireItem(ref);
          const kind = canonicalItemKind(item);
          return {
            item,
            kind,
            ...(kind === "attachment"
              ? { linkMode: canonicalAttachmentLinkMode(item) }
              : {}),
          };
        });
        let attachmentPath: string | undefined;
        if (target.kind === "attachment") {
          throwIfWorkflowCallCanceled(control);
          attachmentPath = await readAttachmentPathOutsideHostSlice(
            target.item,
            target.linkMode!,
          );
          throwIfWorkflowCallCanceled(control);
        }
        const detail = await withZoteroHostSlice(control, () =>
          serializeCanonicalItemDetail(target.item, attachmentPath),
        );
        throwIfWorkflowCallCanceled(control);
        return detail;
      },
      async getItemAuditState(
        ref: ZoteroHostItemRefInput,
        control: WorkflowCallControl = {},
      ) {
        throwIfWorkflowCallCanceled(control);
        const { summary, revision } = await withZoteroHostSlice(
          control,
          async () => {
            const item = requireItem(ref);
            if (canonicalItemKind(item) !== "regular") {
              throw capabilityError("invalid_request", "item is not regular", {
                reason: "invalid_type",
                field: "itemRef",
              });
            }
            const summary = canonicalRegularSummary(item);
            return { summary, revision: canonicalItemVersion(item).revision };
          },
        );
        const tags = Array.from(new Set(summary.tags)).sort(
          compareCanonicalTextCodeUnits,
        );
        const tagDigest = await sha256Hex(
          new TextEncoder().encode(JSON.stringify(tags)),
        );
        if (!tagDigest) throw canonicalReadFailure("item");
        throwIfWorkflowCallCanceled(control);
        return {
          target: {
            libraryId: summary.ref.libraryId,
            itemKey: summary.ref.key,
          },
          revision,
          tagDigest,
          tags,
        };
      },
      async getItemNotes(
        ref: ZoteroHostItemRefInput,
        page: LibraryPageRequestDto = {},
        control: WorkflowCallControl = {},
      ) {
        return getCanonicalItemNotes(ref, page, control);
      },
      async getNoteDetail(
        ref: ZoteroHostItemRefInput,
        options: NoteDetailOptionsDto,
        control: WorkflowCallControl = {},
      ) {
        return getCanonicalNoteDetail(ref, options, control);
      },
      async listNotePayloads(
        ref: ZoteroHostItemRefInput,
        page: LibraryPageRequestDto = {},
        control: WorkflowCallControl = {},
      ) {
        return listCanonicalNotePayloads(ref, page, control);
      },
      async getNotePayload(
        ref: ZoteroHostItemRefInput,
        options: NotePayloadOptionsDto,
        control: WorkflowCallControl = {},
      ) {
        return getCanonicalNotePayload(ref, options, control);
      },
      async listAnnotations(
        ref: ZoteroHostItemRefInput,
        page: LibraryPageRequestDto = {},
        control: WorkflowCallControl = {},
      ) {
        return canonicalAnnotationItems(ref, page, control);
      },
      exportPortableItems: exportCanonicalPortableItems,
      async exportAnnotations(
        ref: ZoteroHostItemRefInput,
        args: { format?: string } = {},
        control: WorkflowCallControl = {},
      ) {
        throwIfWorkflowCallCanceled(control);
        const item = await withZoteroHostSlice(control, () =>
          requireItem(ref, "item"),
        );
        const itemRef = canonicalItemRef(item);
        const annotations: ZoteroHostAnnotationDto[] = [];
        let sliceStartedAt = Date.now();
        let sliceProcessed = 0;
        let cursor: string | undefined;
        do {
          throwIfWorkflowCallCanceled(control);
          const page = await canonicalAnnotationItems(
            itemRef,
            { limit: 100, ...(cursor ? { cursor } : {}) },
            control,
          );
          for (const annotation of page.annotations) {
            throwIfWorkflowCallCanceled(control);
            const serialized = await withZoteroHostSlice(control, () => {
              const rawAnnotation = resolveItem(annotation.ref);
              const rawAttachment = resolveItem(annotation.attachmentRef);
              if (!rawAnnotation || !rawAttachment) {
                throw canonicalReadFailure("annotation");
              }
              return serializeAnnotation(rawAnnotation, rawAttachment);
            });
            throwIfWorkflowCallCanceled(control);
            annotations.push(serialized);
            sliceProcessed += 1;
            if (shouldYieldHostSlice(sliceStartedAt, sliceProcessed)) {
              await yieldToEventLoop();
              sliceStartedAt = Date.now();
              sliceProcessed = 0;
            }
          }
          cursor = page.nextCursor || undefined;
          if (!page.hasMore) break;
        } while (cursor);
        throwIfWorkflowCallCanceled(control);
        const format = trimText(args.format).toLowerCase() || "markdown";
        if (format === "json") {
          return {
            format,
            annotations,
          };
        }
        return {
          format: "markdown",
          markdown: exportAnnotationsMarkdown(annotations),
          annotations,
        };
      },
      async getItemAttachments(
        ref: ZoteroHostItemRefInput,
        page: LibraryPageRequestDto = {},
        control: WorkflowCallControl = {},
      ) {
        return getCanonicalItemAttachments(ref, page, control);
      },
    },
    metadata: {
      translateIdentifier: translateMetadataIdentifier,
    },
    bibliography: createWorkflowBibliographyOwner(),
    mutations: {
      preview: previewCanonicalMutation,
      execute: executeCanonicalMutation,
    },
    statusTags: {
      getPolicy: getBuiltinStatusPolicy,
      transition: executeStatusTagTransition,
    },
    notes: {
      create: (request, scope, control) =>
        executeNoteMutation(request, "notes.create", scope, control),
      updateContent: (request, scope, control) =>
        executeNoteMutation(request, "notes.updateContent", scope, control),
      remove: (request, scope, control) =>
        executeNoteMutation(request, "notes.remove", scope, control),
      upsertPayload: (request, scope, control) =>
        executeNoteMutation(request, "notes.upsertPayload", scope, control),
    },
    attachments: {
      create: (request, scope, control) =>
        executeAttachmentMutation(
          request,
          "attachments.create",
          scope,
          attachmentPrimitives,
          control,
        ),
      updateMetadata: (request, scope, control) =>
        executeAttachmentMutation(
          request,
          "attachments.updateMetadata",
          scope,
          attachmentPrimitives,
          control,
        ),
      replaceFile: (request, scope, control) =>
        executeAttachmentMutation(
          request,
          "attachments.replaceFile",
          scope,
          attachmentPrimitives,
          control,
        ),
      move: (request, scope, control) =>
        executeAttachmentMutation(
          request,
          "attachments.move",
          scope,
          attachmentPrimitives,
          control,
        ),
      remove: (request, scope, control) =>
        executeAttachmentMutation(
          request,
          "attachments.remove",
          scope,
          attachmentPrimitives,
          control,
        ),
    },
    legacyMutations: {
      async preview(
        request: ZoteroHostMutationRequest,
      ): Promise<ZoteroHostMutationPreviewResponse> {
        const operation = normalizeMutationOperation(request?.operation);
        try {
          return previewMutationOrThrow(request);
        } catch (error) {
          return errorResponse(
            operation,
            error,
          ) as ZoteroHostMutationPreviewResponse;
        }
      },
      async execute(
        request: ZoteroHostMutationRequest,
      ): Promise<ZoteroHostMutationExecuteResponse> {
        const operation = normalizeMutationOperation(request?.operation);
        try {
          if (
            operation === "note.createChild" ||
            operation === "note.update" ||
            operation === "note.upsertPayload"
          ) {
            const preview = previewMutationOrThrow(request);
            const scope = { ownerId: "workflow-host-v11:legacy-mutations" };
            const operationId = legacyMutationOperationId(operation);
            const execution =
              operation === "note.createChild"
                ? await executeNoteMutation(
                    {
                      operationId,
                      placement: {
                        kind: "child",
                        parentRef: canonicalItemRef(request.parent!),
                      },
                      content: {
                        format: "html",
                        value: normalizeContent(request.content),
                      },
                    },
                    "notes.create",
                    scope,
                  )
                : operation === "note.update"
                  ? await executeNoteMutation(
                      {
                        operationId,
                        noteRef: canonicalItemRef(
                          request.note || request.target!,
                        ),
                        content: {
                          format: "html",
                          value: normalizeContent(request.content),
                        },
                      },
                      "notes.updateContent",
                      scope,
                    )
                  : await executeNoteMutation(
                      {
                        operationId,
                        noteRef: canonicalItemRef(
                          request.note || request.target!,
                        ),
                        payload: {
                          payloadType: normalizePayloadType(
                            request.payloadType,
                          ),
                          noteKind: trimText(request.noteKind, 80),
                          schemaVersion: trimText(
                            (request.payload as Record<string, unknown> | null)
                              ?.schemaVersion ||
                              (
                                request.payload as Record<
                                  string,
                                  unknown
                                > | null
                              )?.schema ||
                              (
                                request.payload as Record<
                                  string,
                                  unknown
                                > | null
                              )?.version ||
                              `${normalizePayloadType(request.payloadType)}.v1`,
                            200,
                          ),
                          format: normalizePayloadFormat(
                            request.payloadFormat,
                            normalizePayloadType(request.payloadType),
                          ),
                          value: (request.payload === undefined
                            ? request.content
                            : request.payload) as JsonValue,
                        },
                      },
                      "notes.upsertPayload",
                      scope,
                    );
            if (!("result" in execution)) {
              return {
                ...preview,
                ok: false,
                error: {
                  code: execution.attempt.error.code,
                  message:
                    execution.attempt.error.message ||
                    "Canonical note mutation failed",
                  details: execution.attempt as unknown as JsonValue,
                },
              };
            }
            const result = execution.result as JsonObject;
            if (operation === "note.upsertPayload") {
              const note = result.note as JsonObject;
              const payload = result.payload as JsonObject;
              const source = payload.source as JsonObject;
              return {
                ...preview,
                ok: true,
                result: {
                  payloads: [
                    {
                      noteKey: String((note.ref as JsonObject).key || ""),
                      payloadType: String(payload.payloadType || ""),
                      noteKind: String(payload.noteKind || ""),
                      attachmentKey:
                        source?.kind === "embedded_attachment"
                          ? String(
                              (source.attachmentRef as JsonObject)?.key || "",
                            )
                          : "",
                      bytes: Number(payload.estimatedBytes) || 0,
                      replaced: result.outcome === "replaced" ? 1 : 0,
                    },
                  ],
                },
              };
            }
            return {
              ...preview,
              ok: true,
              result: {
                notes: [result.note as unknown as ZoteroHostNoteDto],
              },
            };
          }
          return await executeMutationOrThrow(request);
        } catch (error) {
          return errorResponse(
            operation,
            error,
          ) as ZoteroHostMutationExecuteResponse;
        }
      },
    },
  };
}

export function resolveZoteroHostCapabilityBroker(): ZoteroHostCapabilityBroker {
  return createZoteroHostCapabilityBroker();
}

export function configureZoteroHostMutationRuntimeForTests(
  configuration: Parameters<
    typeof configureMutationAuthorityRuntimeForTests
  >[0] & {
    maxPreviewTargets?: number;
  },
) {
  const { maxPreviewTargets, ...authorityConfiguration } = configuration;
  configureMutationAuthorityRuntimeForTests(authorityConfiguration);
  if (maxPreviewTargets !== undefined) {
    mutationPreviewTargetLimit = Math.max(1, Math.floor(maxPreviewTargets));
  }
}

export function resetZoteroHostMutationRuntimeForTests() {
  resetMutationAuthorityRuntimeForTests();
  mutationPreviewTargetLimit = 10_000;
}
function throwIfWorkflowCallCanceled(control: WorkflowCallControl = {}) {
  if (control.signal?.aborted) {
    throw capabilityError("canceled", "workflow call was canceled", {
      reason: "caller_signal",
    });
  }
}

type HostSliceWaiter<T> = {
  control: WorkflowCallControl;
  run: () => Promise<T> | T;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (error: unknown) => void;
  queued: boolean;
  started: boolean;
  settled: boolean;
  canceled: boolean;
  abort?: () => void;
};

const hostSliceQueue: Array<HostSliceWaiter<unknown>> = [];
let hostSliceActive = false;

function pumpHostSlices() {
  if (hostSliceActive) return;
  let waiter = hostSliceQueue.shift();
  while (waiter && !waiter.queued) waiter = hostSliceQueue.shift();
  if (!waiter) return;
  waiter.queued = false;
  waiter.started = true;
  hostSliceActive = true;
  Promise.resolve()
    .then(() => {
      if (waiter.canceled || waiter.control.signal?.aborted) {
        throw capabilityError("canceled", "workflow call was canceled", {
          reason: "caller_signal",
        });
      }
      return waiter.run();
    })
    .then(
      (value) => {
        if (waiter.canceled || waiter.control.signal?.aborted) {
          waiter.reject(
            capabilityError("canceled", "workflow call was canceled", {
              reason: "caller_signal",
            }),
          );
        } else {
          waiter.resolve(value);
        }
      },
      (error) => {
        if (waiter.canceled || waiter.control.signal?.aborted) {
          waiter.reject(
            capabilityError("canceled", "workflow call was canceled", {
              reason: "caller_signal",
            }),
          );
        } else {
          waiter.reject(error);
        }
      },
    )
    .finally(() => {
      waiter.settled = true;
      if (waiter.abort) {
        waiter.control.signal?.removeEventListener("abort", waiter.abort);
      }
      hostSliceActive = false;
      pumpHostSlices();
    });
}

function withZoteroHostSlice<T>(
  control: WorkflowCallControl = {},
  run: () => Promise<T> | T,
): Promise<T> {
  throwIfWorkflowCallCanceled(control);
  return new Promise<T>((resolve, reject) => {
    const waiter: HostSliceWaiter<T> = {
      control,
      run,
      resolve,
      reject,
      queued: true,
      started: false,
      settled: false,
      canceled: false,
    };
    const abort = () => {
      if (waiter.settled) return;
      waiter.canceled = true;
      if (!waiter.started) {
        waiter.queued = false;
        const index = hostSliceQueue.indexOf(
          waiter as unknown as HostSliceWaiter<unknown>,
        );
        if (index >= 0) hostSliceQueue.splice(index, 1);
        waiter.settled = true;
        reject(
          capabilityError("canceled", "workflow call was canceled", {
            reason: "caller_signal",
          }),
        );
        pumpHostSlices();
      }
    };
    waiter.abort = abort;
    control.signal?.addEventListener("abort", abort, { once: true });
    hostSliceQueue.push(waiter as unknown as HostSliceWaiter<unknown>);
    pumpHostSlices();
  });
}

export function resetZoteroHostSliceGateForTests() {
  while (hostSliceQueue.length) {
    const waiter = hostSliceQueue.shift();
    if (!waiter) break;
    waiter.queued = false;
    waiter.canceled = true;
    waiter.settled = true;
    if (waiter.abort) {
      waiter.control.signal?.removeEventListener("abort", waiter.abort);
    }
    waiter.reject(
      capabilityError("canceled", "host slice gate was reset", {
        reason: "caller_signal",
      }),
    );
  }
}

function shouldYieldHostSlice(startedAt: number, processed: number) {
  return processed >= 100 || Date.now() - startedAt >= 50;
}

async function mapZoteroHostTargets<T, R>(
  targets: readonly T[],
  control: WorkflowCallControl,
  project: (target: T) => R | Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let startedAt = Date.now();
  let processed = 0;
  for (const target of targets) {
    results.push(await withZoteroHostSlice(control, () => project(target)));
    processed += 1;
    if (shouldYieldHostSlice(startedAt, processed)) {
      await yieldToEventLoop();
      throwIfWorkflowCallCanceled(control);
      startedAt = Date.now();
      processed = 0;
    }
  }
  return results;
}

async function openZoteroItem(
  ref: ZoteroHostItemRefInput,
  control: WorkflowCallControl = {},
): Promise<NavigationResultDto> {
  throwIfWorkflowCallCanceled(control);
  const item = await withZoteroHostSlice(control, () => requireItem(ref));
  if (canonicalItemKind(item) !== "regular") {
    throw invalidRefError(
      "item",
      "wrong_kind",
      "ref does not identify a regular item",
    );
  }
  await withZoteroHostSlice(control, () => selectZoteroItems([item]));
  throwIfWorkflowCallCanceled(control);
  return {
    openedAt: new Date().toISOString(),
    target: { kind: "item", ref: canonicalItemRef(item) },
  };
}

async function openZoteroNote(
  ref: ZoteroHostItemRefInput,
  control: WorkflowCallControl = {},
): Promise<NavigationResultDto> {
  throwIfWorkflowCallCanceled(control);
  const note = await withZoteroHostSlice(control, () => requireNote(ref));
  await withZoteroHostSlice(control, () => selectZoteroItems([note]));
  throwIfWorkflowCallCanceled(control);
  return {
    openedAt: new Date().toISOString(),
    target: { kind: "note", ref: canonicalItemRef(note) },
  };
}

async function openZoteroCollection(
  ref: ZoteroHostCollectionRefInput,
  control: WorkflowCallControl = {},
): Promise<NavigationResultDto> {
  throwIfWorkflowCallCanceled(control);
  const collection = await withZoteroHostSlice(control, () =>
    resolveCollection(ref),
  );
  if (!collection) throw notFoundError("collection", ref);
  await withZoteroHostSlice(control, () => selectZoteroCollection(collection));
  throwIfWorkflowCallCanceled(control);
  return {
    openedAt: new Date().toISOString(),
    target: { kind: "collection", ref: canonicalCollectionRef(collection) },
  };
}

async function openZoteroSelection(
  input: NavigationSelectionInputDto,
  control: WorkflowCallControl = {},
): Promise<NavigationResultDto> {
  if (!input || !Array.isArray(input.itemRefs) || input.itemRefs.length === 0) {
    throw capabilityError(
      "invalid_request",
      "selection open requires item refs",
      {
        reason: "missing_field",
        field: "itemRefs",
      },
    );
  }
  if (input.itemRefs.length > 10_000) {
    throw capabilityError("resource_limited", "selection exceeds the limit", {
      resource: "selection",
      limit: 10_000,
      observed: input.itemRefs.length,
    });
  }
  const seen = new Set<string>();
  const items: Zotero.Item[] = [];
  let sliceStartedAt = Date.now();
  let sliceProcessed = 0;
  for (const ref of input.itemRefs) {
    throwIfWorkflowCallCanceled(control);
    const item = await withZoteroHostSlice(control, () => requireItem(ref));
    const normalized = canonicalItemRef(item);
    const identity = `${normalized.libraryId}:${normalized.key}`;
    if (seen.has(identity)) {
      throw capabilityError(
        "invalid_request",
        "selection contains a duplicate ref",
        {
          reason: "duplicate_value",
          field: "itemRefs",
        },
      );
    }
    seen.add(identity);
    items.push(item);
    sliceProcessed += 1;
    if (shouldYieldHostSlice(sliceStartedAt, sliceProcessed)) {
      await yieldToEventLoop();
      sliceStartedAt = Date.now();
      sliceProcessed = 0;
    }
  }
  await withZoteroHostSlice(control, () => selectZoteroItems(items));
  throwIfWorkflowCallCanceled(control);
  return {
    openedAt: new Date().toISOString(),
    target: { kind: "selection", refs: items.map(canonicalItemRef) },
  };
}

async function getCanonicalItemNotes(
  ref: ZoteroHostItemRefInput,
  page: LibraryPageRequestDto = {},
  control: WorkflowCallControl = {},
): Promise<LibraryListItemNotesPageDto> {
  throwIfWorkflowCallCanceled(control);
  const item = await withZoteroHostSlice(control, () =>
    requireItem(ref, "item"),
  );
  const itemKind = await withZoteroHostSlice(control, () =>
    canonicalItemKind(item),
  );
  if (itemKind !== "regular") {
    throw invalidRefError("item", "wrong_kind", "notes require a regular item");
  }
  let sourcePage;
  try {
    sourcePage = await withZoteroHostSlice(control, () =>
      queryZoteroChildItemPage({
        domain: "notes",
        libraryId: normalizeLibraryId((item as any).libraryID),
        parentItemId: parsePositiveInteger((item as any).id),
        limit: page.limit,
        cursor: page.cursor,
      }),
    );
  } catch (error) {
    if (error instanceof ZoteroLibraryPageLimitError) {
      throw capabilityError("resource_limited", error.message, {
        resource: "items",
        limit: error.limit,
        observed: Number.isFinite(error.observed) ? error.observed : undefined,
      });
    }
    if (error instanceof ZoteroLibraryCursorError) {
      throw capabilityError("invalid_request", error.message, {
        reason: "invalid_value",
        field: "cursor",
      });
    }
    if (error instanceof ZoteroHostCapabilityError) throw error;
    throw canonicalReadFailure("note");
  }
  const notes = await mapZoteroHostTargets(
    sourcePage.items,
    control,
    (note) => {
      if (!note.isNote?.()) throw canonicalReadFailure("note");
      return canonicalNoteSummaryDto(note);
    },
  );
  throwIfWorkflowCallCanceled(control);
  return {
    notes,
    limit: sourcePage.limit,
    total: sourcePage.total,
    returned: notes.length,
    hasMore: sourcePage.hasMore,
    nextCursor: sourcePage.nextCursor,
  };
}

async function getCanonicalNoteDetail(
  ref: ZoteroHostItemRefInput,
  options: NoteDetailOptionsDto,
  control: WorkflowCallControl = {},
): Promise<NoteDetailDto> {
  throwIfWorkflowCallCanceled(control);
  if (options?.format !== "html" && options?.format !== "text") {
    throw capabilityError("invalid_request", "note format is required", {
      reason: "invalid_value",
      field: "format",
    });
  }
  const detail = await withZoteroHostSlice(control, () => {
    const note = requireNote(ref);
    const content = canonicalNoteText(note);
    return {
      ref: canonicalItemRef(note),
      parentRef: canonicalParentRef(note),
      title: canonicalTitle(note) || content.text.slice(0, 80),
      format: options.format,
      content: options.format === "html" ? content.html : content.text,
      revision: canonicalNoteVersion(note).revision,
    };
  });
  throwIfWorkflowCallCanceled(control);
  return detail;
}

function canonicalPayloadSummary(
  block: ZoteroNotePayloadBlock,
  note: Zotero.Item,
): NotePayloadSummaryDto {
  const issues: NotePayloadSummaryDto["issues"] = [];
  if (block.errors?.length) {
    issues.push({ code: "content_invalid", retryable: false });
  }
  const attachment = block.attachmentKey
    ? resolveZotero().Items.getByLibraryAndKey(
        canonicalItemRef(note).libraryId,
        block.attachmentKey,
      )
    : null;
  if (block.attachmentKey && !attachment) {
    issues.push({ code: "attachment_missing", retryable: false });
  }
  if (
    attachment &&
    (block.anchorStatus === "stale" || block.anchorStatus === "missing")
  ) {
    issues.push({ code: "anchor_stale", retryable: true });
  }
  const state: NotePayloadSummaryDto["state"] = issues.some(
    (issue) => issue.code === "attachment_missing",
  )
    ? "missing"
    : issues.some((issue) => issue.code === "anchor_stale")
      ? "stale"
      : issues.length
        ? "invalid"
        : "available";
  const attachmentRef = block.attachmentKey
    ? {
        libraryId: canonicalItemRef(note).libraryId,
        key: block.attachmentKey,
      }
    : null;
  if (attachmentRef) assertPortableRef(attachmentRef, "item");
  return {
    payloadType: block.payloadType,
    noteKind: block.noteKind,
    version: block.version,
    format: block.format,
    encoding: block.encoding,
    estimatedBytes: Math.max(0, Number(block.estimatedSize) || 0),
    source: attachmentRef
      ? { kind: "embedded_attachment", attachmentRef }
      : { kind: "inline" },
    state,
    issues,
  };
}

async function listCanonicalNotePayloads(
  ref: ZoteroHostItemRefInput,
  page: LibraryPageRequestDto = {},
  control: WorkflowCallControl = {},
): Promise<LibraryListNotePayloadsPageDto> {
  throwIfWorkflowCallCanceled(control);
  const note = await withZoteroHostSlice(control, () => requireNote(ref));
  let sourcePage;
  try {
    sourcePage = await listNotePayloadBlocksForItemPage(
      note,
      {
        limit: page.limit,
        cursor: page.cursor,
      },
      {
        runNativeSlice: (run) => withZoteroHostSlice(control, run),
        checkCanceled: () => throwIfWorkflowCallCanceled(control),
      },
    );
  } catch (error) {
    if (error instanceof ZoteroNotePayloadResourceLimitError) {
      throw capabilityError("resource_limited", error.message, {
        resource: "bytes",
        limit: error.limit,
      });
    }
    if (error instanceof ZoteroLibraryPageLimitError) {
      throw capabilityError("resource_limited", error.message, {
        resource: "items",
        limit: error.limit,
        observed: Number.isFinite(error.observed) ? error.observed : undefined,
      });
    }
    if (error instanceof ZoteroLibraryCursorError) {
      throw capabilityError("invalid_request", error.message, {
        reason: "invalid_value",
        field: "cursor",
      });
    }
    if (error instanceof ZoteroNotePayloadCursorError) {
      throw capabilityError("invalid_request", error.message, {
        reason: "invalid_value",
        field: "cursor",
      });
    }
    if (error instanceof ZoteroNotePayloadPageLimitError) {
      throw capabilityError("resource_limited", error.message, {
        resource: "items",
        limit: error.limit,
        observed: Number.isFinite(error.observed) ? error.observed : undefined,
      });
    }
    if (error instanceof ZoteroHostCapabilityError) throw error;
    throw canonicalReadFailure("note");
  }
  const payloads = await mapZoteroHostTargets(
    sourcePage.blocks,
    control,
    (block) => canonicalPayloadSummary(block, note),
  );
  throwIfWorkflowCallCanceled(control);
  const limit =
    page.limit === undefined || page.limit === null ? 25 : Number(page.limit);
  return {
    payloads,
    limit,
    scanned: sourcePage.scanned,
    total: null,
    returned: payloads.length,
    hasMore: sourcePage.hasMore,
    nextCursor: sourcePage.nextCursor,
  };
}

async function getCanonicalNotePayload(
  ref: ZoteroHostItemRefInput,
  options: NotePayloadOptionsDto,
  control: WorkflowCallControl = {},
): Promise<NotePayloadValueDto> {
  throwIfWorkflowCallCanceled(control);
  const payloadType = String(options?.payloadType || "").trim();
  if (!payloadType) {
    throw capabilityError("invalid_request", "payload type is required", {
      reason: "missing_field",
      field: "payloadType",
    });
  }
  const note = await withZoteroHostSlice(control, () => requireNote(ref));
  const blocks: ZoteroNotePayloadBlock[] = [];
  let cursor: string | undefined;
  for (;;) {
    throwIfWorkflowCallCanceled(control);
    let sourcePage;
    try {
      sourcePage = await listNotePayloadBlocksForItemPage(
        note,
        {
          limit: 100,
          ...(cursor ? { cursor } : {}),
        },
        {
          runNativeSlice: (run) => withZoteroHostSlice(control, run),
          checkCanceled: () => throwIfWorkflowCallCanceled(control),
        },
      );
    } catch (error) {
      if (error instanceof ZoteroNotePayloadResourceLimitError) {
        throw capabilityError("resource_limited", error.message, {
          resource: "bytes",
          limit: error.limit,
        });
      }
      if (error instanceof ZoteroLibraryCursorError) {
        throw capabilityError("invalid_request", error.message, {
          reason: "invalid_value",
          field: "cursor",
        });
      }
      if (error instanceof ZoteroNotePayloadCursorError) {
        throw capabilityError("invalid_request", error.message, {
          reason: "invalid_value",
          field: "cursor",
        });
      }
      if (error instanceof ZoteroNotePayloadPageLimitError) {
        throw capabilityError("resource_limited", error.message, {
          resource: "items",
          limit: error.limit,
          observed: Number.isFinite(error.observed)
            ? error.observed
            : undefined,
        });
      }
      if (error instanceof ZoteroHostCapabilityError) throw error;
      throw canonicalReadFailure("note");
    }
    blocks.push(
      ...sourcePage.blocks.filter((block) => block.payloadType === payloadType),
    );
    throwIfWorkflowCallCanceled(control);
    if (!sourcePage.hasMore) break;
    if (!sourcePage.nextCursor) throw canonicalReadFailure("note");
    cursor = sourcePage.nextCursor;
  }
  if (blocks.length === 0) throw notFoundError("note", ref);
  if (blocks.length > 1) {
    throw capabilityError("conflict", "note payload is ambiguous", {
      reason: "ambiguous_state",
      kind: "note",
    });
  }
  const block = blocks[0];
  const summary = await withZoteroHostSlice(control, () =>
    canonicalPayloadSummary(block, note),
  );
  if (summary.state !== "available") {
    throw capabilityError(
      "execution_failed",
      "note payload is unavailable",
      {
        phase: "read",
        recovery:
          summary.state === "stale" ? "retry_same_operation" : "manual_repair",
      },
      summary.state === "stale",
    );
  }
  let content: string;
  try {
    content = getPayloadContent(block);
  } catch {
    throw canonicalReadFailure("note");
  }
  if (new TextEncoder().encode(content).byteLength > NOTE_PAYLOAD_MAX_BYTES) {
    throw capabilityError(
      "resource_limited",
      "note payload exceeds the limit",
      {
        resource: "bytes",
        limit: NOTE_PAYLOAD_MAX_BYTES,
      },
    );
  }
  let value: JsonValue;
  try {
    value =
      block.format === "json"
        ? ((block.payload ?? JSON.parse(content)) as JsonValue)
        : block.format === "markdown"
          ? block.markdown || content
          : content;
    assertJsonValue(value, "note payload");
  } catch {
    throw canonicalReadFailure("note");
  }
  throwIfWorkflowCallCanceled(control);
  return { summary, value };
}

async function getCanonicalItemAttachments(
  ref: ZoteroHostItemRefInput,
  page: LibraryPageRequestDto = {},
  control: WorkflowCallControl = {},
): Promise<LibraryListItemAttachmentsPageDto> {
  throwIfWorkflowCallCanceled(control);
  const item = await withZoteroHostSlice(control, () =>
    requireItem(ref, "item"),
  );
  const itemKind = await withZoteroHostSlice(control, () =>
    canonicalItemKind(item),
  );
  if (itemKind !== "regular" && itemKind !== "note") {
    throw invalidRefError(
      "item",
      "wrong_kind",
      "attachments require a regular item or note",
    );
  }
  let sourcePage;
  try {
    sourcePage = await withZoteroHostSlice(control, () =>
      queryZoteroChildItemPage({
        domain: "attachments",
        libraryId: normalizeLibraryId((item as any).libraryID),
        parentItemId: parsePositiveInteger((item as any).id),
        limit: page.limit,
        cursor: page.cursor,
      }),
    );
  } catch (error) {
    if (error instanceof ZoteroLibraryPageLimitError) {
      throw capabilityError("resource_limited", error.message, {
        resource: "items",
        limit: error.limit,
        observed: Number.isFinite(error.observed) ? error.observed : undefined,
      });
    }
    if (error instanceof ZoteroLibraryCursorError) {
      throw capabilityError("invalid_request", error.message, {
        reason: "invalid_value",
        field: "cursor",
      });
    }
    if (error instanceof ZoteroHostCapabilityError) throw error;
    throw canonicalReadFailure("attachment");
  }
  const attachments = await mapZoteroHostTargets(
    sourcePage.items,
    control,
    (attachment) => {
      if (!attachment || !attachment.isAttachment?.()) {
        throw canonicalReadFailure("attachment");
      }
      return {
        item: attachment,
        linkMode: canonicalAttachmentLinkMode(attachment),
      };
    },
  );
  const paths: string[] = [];
  for (const attachment of attachments) {
    throwIfWorkflowCallCanceled(control);
    paths.push(
      await readAttachmentPathOutsideHostSlice(
        attachment.item,
        attachment.linkMode,
      ),
    );
  }
  const result = await mapZoteroHostTargets(
    [...attachments.entries()],
    control,
    ([index, attachment]) =>
      canonicalAttachmentDetail(attachment.item, paths[index]),
  );
  throwIfWorkflowCallCanceled(control);
  return {
    attachments: result,
    limit: sourcePage.limit,
    total: sourcePage.total,
    returned: result.length,
    hasMore: sourcePage.hasMore,
    nextCursor: sourcePage.nextCursor,
  };
}

async function canonicalAnnotationItems(
  ref: ZoteroHostItemRefInput,
  page: LibraryPageRequestDto = {},
  control: WorkflowCallControl = {},
): Promise<LibraryListAnnotationsPageDto> {
  throwIfWorkflowCallCanceled(control);
  const item = await withZoteroHostSlice(control, () =>
    requireItem(ref, "item"),
  );
  const itemKind = await withZoteroHostSlice(control, () =>
    canonicalItemKind(item),
  );
  if (itemKind !== "regular" && itemKind !== "attachment") {
    throw invalidRefError(
      "item",
      "wrong_kind",
      "annotation listing requires a regular item or attachment",
    );
  }
  let sourcePage;
  try {
    sourcePage = await withZoteroHostSlice(control, () =>
      queryZoteroAnnotationPage({
        libraryId: normalizeLibraryId((item as any).libraryID),
        parentItemId: parsePositiveInteger((item as any).id),
        parentKind: itemKind,
        limit: page.limit,
        cursor: page.cursor,
      }),
    );
  } catch (error) {
    if (error instanceof ZoteroLibraryPageLimitError) {
      throw capabilityError("resource_limited", error.message, {
        resource: "items",
        limit: error.limit,
        observed: Number.isFinite(error.observed) ? error.observed : undefined,
      });
    }
    if (error instanceof ZoteroLibraryCursorError) {
      throw capabilityError("invalid_request", error.message, {
        reason: "invalid_value",
        field: "cursor",
      });
    }
    if (error instanceof ZoteroHostCapabilityError) throw error;
    throw canonicalReadFailure("annotation");
  }
  const result = await mapZoteroHostTargets(
    sourcePage.items,
    control,
    (annotation) => {
      if (
        !isRawZoteroItem(annotation) ||
        canonicalItemKind(annotation) !== "annotation"
      ) {
        throw canonicalReadFailure("annotation");
      }
      return canonicalAnnotationDetail(annotation);
    },
  );
  throwIfWorkflowCallCanceled(control);
  return {
    annotations: result,
    limit: sourcePage.limit,
    total: sourcePage.total,
    returned: result.length,
    hasMore: sourcePage.hasMore,
    nextCursor: sourcePage.nextCursor,
  };
}

async function exportCanonicalPortableItems(
  refs: ZoteroHostItemRefInput[],
  control: WorkflowCallControl = {},
): Promise<PortableRegularItemDto[]> {
  throwIfWorkflowCallCanceled(control);
  if (!Array.isArray(refs) || refs.length > 10_000) {
    throw capabilityError(
      "resource_limited",
      "portable export exceeds the limit",
      {
        resource: "items",
        limit: 10_000,
        observed: Array.isArray(refs) ? refs.length : undefined,
      },
    );
  }
  const result: PortableRegularItemDto[] = [];
  let sliceStartedAt = Date.now();
  let sliceProcessed = 0;
  for (const ref of refs) {
    throwIfWorkflowCallCanceled(control);
    const portable = await withZoteroHostSlice(control, () => {
      const item = requireItem(ref);
      if (canonicalItemKind(item) !== "regular") {
        throw invalidRefError(
          "item",
          "wrong_kind",
          "portable export requires regular items",
        );
      }
      const summary = canonicalRegularSummary(item);
      return {
        schema: "zotero-agents.portable-regular-item.v1" as const,
        itemType: summary.itemType,
        fields: canonicalRegularFields(item),
        creators: summary.creators,
        tags: summary.tags,
      };
    });
    throwIfWorkflowCallCanceled(control);
    result.push(portable);
    sliceProcessed += 1;
    if (shouldYieldHostSlice(sliceStartedAt, sliceProcessed)) {
      await yieldToEventLoop();
      sliceStartedAt = Date.now();
      sliceProcessed = 0;
    }
  }
  const bytes = new TextEncoder().encode(JSON.stringify(result)).byteLength;
  if (bytes > 64 * 1024 * 1024) {
    throw capabilityError(
      "resource_limited",
      "portable export exceeds the limit",
      {
        resource: "bytes",
        limit: 64 * 1024 * 1024,
        observed: bytes,
      },
    );
  }
  throwIfWorkflowCallCanceled(control);
  return result;
}
