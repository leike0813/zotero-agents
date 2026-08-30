import { handlers } from "../handlers";
import {
  getHostBridgeFileDescriptor,
  markHostBridgeUploadedFileConsumed,
  resolveHostBridgeUploadedFile,
  type HostBridgeFileDescriptor,
} from "./hostBridgeFileRegistry";
import { resolveRuntimeZotero } from "../utils/runtimeBridge";
import {
  buildCurrentAcpHostContext,
  resolveSelectedLibraryIds,
  resolveSelectedLibraryTreeRows,
} from "./acpContextBuilder";
import {
  buildWorkbenchPayloadEnvelope,
  buildWorkbenchPayloadPngBytes,
  decodeBase64Utf8,
  encodeBase64Utf8,
  getNotePayloadDetail,
  type ZoteroNotePayloadBlock,
  type ZoteroNotePayloadDetail,
} from "./notePayloadCodec";
import {
  listNotePayloadBlocksForItem,
  selectPreferredNotePayloadBlock,
} from "./zoteroNotePayloadResolver";
import {
  resolveLibraryArtifactReadiness,
  type LibraryArtifactItem,
} from "./libraryArtifactReadiness";
import type { AcpHostContext } from "./acpTypes";
import {
  queryZoteroLibraryPage,
  ZoteroLibraryCriteriaError,
  ZoteroLibraryCursorError,
  ZoteroLibraryPageLimitError,
} from "./zoteroLibraryPageQuery";
import { createSha256Accumulator, sha256Hex } from "../utils/sha256";
import type {
  AnnotationDetailDto,
  AnnotationItemSummaryDto,
  AttachmentDetailDto,
  AttachmentItemSummaryDto,
  CollectionDto,
  CreatorDto,
  CurrentViewDto,
  ItemDetailDto,
  ItemSummaryDto,
  JsonObject,
  JsonValue,
  LibraryListCollectionsPageDto,
  LibraryListCollectionsRequestDto,
  LibraryListItemsPageDto,
  LibraryListItemsRequestDto,
  LibraryTraversalBatchDto,
  LibraryTraversalCompletionEvidenceDto,
  LibraryTraversalRequestDto,
  LibraryTraversalResultDto,
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
  RegularItemDetailDto,
  RegularItemSummaryDto,
  SelectedItemsSnapshotDto,
  PortableRegularItemDto,
  WorkflowCallControl,
  WorkflowHostCreatorDto as ZoteroHostMetadataCreatorDto,
} from "../workflows/types";
import {
  assertWorkflowHostStrictJsonValue,
  createWorkflowHostErrorData,
  type WorkflowHostErrorCode,
  type WorkflowHostErrorDetailsByCode,
} from "../workflows/workflowHostErrorContract";

export type {
  JsonObject,
  JsonPrimitive,
  JsonValue,
  PortableCollectionRef as ZoteroHostCollectionRefInput,
  PortableItemRef as ZoteroHostItemRefInput,
  WorkflowHostCreatorDto as ZoteroHostMetadataCreatorDto,
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

export type ZoteroHostSelectedSourceDto =
  | ({ kind: "collection" } & ZoteroHostCollectionDto)
  | {
      kind: "saved-search";
      id: number | string;
      key: string;
      name: string;
      libraryId: number;
    }
  | {
      kind: "library";
      libraryId: number;
      name?: string;
    }
  | {
      kind: "special";
      type: string;
      libraryId?: number;
      label?: string;
    };

export type ZoteroHostCurrentViewDto = Omit<AcpHostContext, "libraryIds"> & {
  libraryIds: string[];
  currentItem?: AcpHostContext["currentItem"] &
    Partial<ZoteroHostItemSummaryDto>;
  selectedItems: ZoteroHostItemSummaryDto[];
  selectedSources: ZoteroHostSelectedSourceDto[];
  currentCollection?: ZoteroHostCollectionDto;
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
  currentView: ZoteroHostCurrentViewDto;
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

export type ZoteroHostItemSearchArgs = {
  query: string;
  limit?: number | string;
  libraryId?: number | string;
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

export type ZoteroHostLibrarySyncSnapshotItemDto =
  ZoteroHostLibraryItemSummaryDto & {
    DOI: string;
    ISBN: string;
    ISSN: string;
    url: string;
  };

export type ZoteroHostLibrarySyncSnapshotResponse = {
  schema: "zotero.library.snapshot.v1";
  generatedAt: string;
  snapshotId: string;
  items: ZoteroHostLibrarySyncSnapshotItemDto[];
  nextCursor: string;
  hasMore: boolean;
  returned: number;
  totalScanned: number;
  filters: ZoteroHostLibraryListResponse["filters"];
};

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

export type ZoteroHostNoteDetailArgs = {
  format?: "text" | "html" | string;
  offset?: number | string;
  maxChars?: number | string;
};

export type ZoteroHostNoteDetailChunkDto = {
  id: number;
  key: string;
  libraryId: number;
  title: string;
  format: "text" | "html";
  content: string;
  offset: number;
  nextOffset: number;
  hasMore: boolean;
  totalChars: number;
  truncated: boolean;
  maxChars: number;
  parent?: {
    id: number;
    key: string;
    title: string;
  };
  warnings?: string[];
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

export type ZoteroHostNotePayloadDetailArgs = {
  payloadType?: string;
  offset?: number | string;
  maxChars?: number | string;
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

export type ZoteroHostMetadataIdentifierType =
  | "DOI"
  | "ISBN"
  | "arXiv"
  | "PMID";

export type ZoteroHostMetadataTranslateIdentifierArgs = {
  type?: ZoteroHostMetadataIdentifierType | string;
  value?: string;
  normalized?: string;
};

export type ZoteroHostMetadataTranslatorDto = {
  translatorID: string;
  label: string;
  priority?: number;
  translatorType?: number | string;
};

export type ZoteroHostMetadataItemDto = {
  itemType: string;
  fields: Record<string, string | number | boolean>;
  creators: ZoteroHostMetadataCreatorDto[];
  title?: string;
  DOI?: string;
  ISBN?: string;
  ISSN?: string;
  url?: string;
  abstractNote?: string;
  date?: string;
  publicationTitle?: string;
  archiveID?: string;
  PMID?: string;
  extra?: string;
};

export type ZoteroHostMetadataDiagnosticDto = {
  code: string;
  message: string;
  details?: JsonObject;
};

export type ZoteroHostMetadataTranslateIdentifierResponse = {
  ok: boolean;
  item: ZoteroHostMetadataItemDto | null;
  itemCount: number;
  translators: ZoteroHostMetadataTranslatorDto[];
  diagnostics: ZoteroHostMetadataDiagnosticDto[];
};

export type ZoteroHostAnnotationExportDto = {
  format: string;
  annotations: ZoteroHostAnnotationDto[];
  markdown?: string;
};

export interface ZoteroHostCapabilityBroker {
  readonly context: {
    getCurrentView(): CurrentViewDto;
    getSelectedItems(
      control?: WorkflowCallControl,
    ): Promise<SelectedItemsSnapshotDto>;
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
    syncSnapshot(
      args: ZoteroHostLibraryListArgs,
    ): Promise<ZoteroHostLibrarySyncSnapshotResponse>;
    readinessAudit(
      args: ZoteroHostLibraryReadinessAuditArgs,
    ): Promise<ZoteroHostLibraryReadinessAuditResponse>;
    searchItems(
      args: ZoteroHostItemSearchArgs,
    ): Promise<ZoteroHostItemSummaryDto[]>;
    getItemDetail(
      ref: ZoteroHostItemRefInput,
      control?: WorkflowCallControl,
    ): Promise<ItemDetailDto>;
    getItemNotes(
      ref: ZoteroHostItemRefInput,
      control?: WorkflowCallControl,
    ): Promise<NoteSummaryDto[]>;
    getNoteDetail(
      ref: ZoteroHostItemRefInput,
      options: NoteDetailOptionsDto,
      control?: WorkflowCallControl,
    ): Promise<NoteDetailDto>;
    listNotePayloads(
      ref: ZoteroHostItemRefInput,
      control?: WorkflowCallControl,
    ): Promise<NotePayloadSummaryDto[]>;
    getNotePayload(
      ref: ZoteroHostItemRefInput,
      options: NotePayloadOptionsDto,
      control?: WorkflowCallControl,
    ): Promise<NotePayloadValueDto>;
    listAnnotations(
      ref: ZoteroHostItemRefInput,
      control?: WorkflowCallControl,
    ): Promise<AnnotationDetailDto[]>;
    exportPortableItems(
      refs: ZoteroHostItemRefInput[],
      control?: WorkflowCallControl,
    ): Promise<PortableRegularItemDto[]>;
    exportAnnotations(
      ref: ZoteroHostItemRefInput,
      args?: { format?: string },
    ): Promise<ZoteroHostAnnotationExportDto>;
    getItemAttachments(
      ref: ZoteroHostItemRefInput,
      control?: WorkflowCallControl,
    ): Promise<AttachmentDetailDto[]>;
  };
  readonly metadata: {
    translateIdentifier(
      args: ZoteroHostMetadataTranslateIdentifierArgs,
    ): Promise<ZoteroHostMetadataTranslateIdentifierResponse>;
  };
  readonly mutations: {
    preview(
      request: ZoteroHostMutationRequest,
    ): Promise<ZoteroHostMutationPreviewResponse>;
    execute(
      request: ZoteroHostMutationRequest,
    ): Promise<ZoteroHostMutationExecuteResponse>;
  };
}

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
const SEARCH_LIMIT_DEFAULT = 20;
const SEARCH_LIMIT_MAX = 50;
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
const INGEST_FIELD_LIMIT = 2000;
const NOTE_EXCERPT_DEFAULT = 800;
const NOTE_EXCERPT_MAX = 2000;
const NOTE_DETAIL_CHUNK_DEFAULT = 8000;
const NOTE_DETAIL_CHUNK_MAX = 16000;
const LITERATURE_INGEST_OPERATION = "literature.ingest";

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

function parseNonNegativeInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
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
  return {
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

function canonicalItemRef(item: Zotero.Item): ZoteroHostItemRefInput {
  const ref = {
    libraryId: parsePositiveInteger((item as any).libraryID),
    key: String((item as any).key || "").trim(),
  };
  assertPortableRef(ref, "item");
  return ref;
}

function canonicalCollectionRef(
  collection: Zotero.Collection,
): ZoteroHostCollectionRefInput {
  const ref = {
    libraryId: parsePositiveInteger((collection as any).libraryID),
    key: String((collection as any).key || "").trim(),
  };
  assertPortableRef(ref, "collection");
  return ref;
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

function canonicalCreators(item: Zotero.Item): CreatorDto[] {
  let raw: unknown;
  try {
    raw = (item as any).getCreators?.();
  } catch {
    throw canonicalReadFailure("item");
  }
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
): Promise<AttachmentItemSummaryDto> {
  const base = canonicalBase(item);
  const linkMode = canonicalAttachmentLinkMode(item);
  let path = "";
  if (linkMode !== "linked_url" && linkMode !== "stored_url") {
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

function canonicalRegularDetail(item: Zotero.Item): RegularItemDetailDto {
  const summary = canonicalRegularSummary(item);
  const fields = canonicalRegularFields(item);
  let related: unknown;
  let noteIds: unknown;
  let attachmentIds: unknown;
  try {
    related = (item as any).relatedItems || [];
    noteIds = item.getNotes?.();
    attachmentIds = item.getAttachments?.();
  } catch {
    throw canonicalReadFailure("item");
  }
  if (
    !Array.isArray(related) ||
    !Array.isArray(noteIds) ||
    !Array.isArray(attachmentIds)
  ) {
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
  let annotations = 0;
  for (const id of attachmentIds) {
    const attachment = resolveZotero().Items.get(id as number);
    if (!attachment) throw canonicalReadFailure("attachment");
    let values: unknown;
    try {
      if (typeof (attachment as any).getAnnotations !== "function") {
        throw new Error("missing getAnnotations");
      }
      values = (attachment as any).getAnnotations();
    } catch {
      throw canonicalReadFailure("annotation");
    }
    if (!Array.isArray(values)) throw canonicalReadFailure("annotation");
    annotations += values.length;
  }
  return {
    ...summary,
    fields,
    relatedRefs,
    childCounts: {
      notes: noteIds.length,
      attachments: attachmentIds.length,
      annotations,
    },
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

async function canonicalAttachmentDetail(
  item: Zotero.Item,
): Promise<AttachmentDetailDto> {
  const summary = await canonicalAttachmentSummary(item);
  let path = "";
  if (summary.fileState !== "not_applicable") {
    try {
      path = String((await (item as any).getFilePathAsync?.()) || "").trim();
    } catch {
      throw canonicalReadFailure("attachment");
    }
  }
  let role: AttachmentDetailDto["role"] =
    summary.linkMode === "embedded_image" ? "note_image" : "ordinary";
  if (summary.parentRef) {
    const parent = requireItem(summary.parentRef);
    if (parent.isNote?.()) {
      const blocks = await listNotePayloadBlocksForItem(parent);
      if (blocks.some((block) => block.attachmentKey === summary.ref.key)) {
        role = "note_payload";
      }
    }
  }
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
): Promise<ItemDetailDto> {
  switch (canonicalItemKind(item)) {
    case "regular":
      return { kind: "regular", item: canonicalRegularDetail(item) };
    case "note":
      return { kind: "note", item: canonicalNoteSummaryDto(item) };
    case "attachment":
      return {
        kind: "attachment",
        item: await canonicalAttachmentDetail(item),
      };
    case "annotation":
      return { kind: "annotation", item: canonicalAnnotationDetail(item) };
  }
}

function normalizeMetadataIdentifierType(
  value: unknown,
): ZoteroHostMetadataIdentifierType | "" {
  const type = trimText(value);
  if (
    type === "DOI" ||
    type === "ISBN" ||
    type === "arXiv" ||
    type === "PMID"
  ) {
    return type;
  }
  return "";
}

function serializeMetadataTranslators(
  translators: unknown,
): ZoteroHostMetadataTranslatorDto[] {
  return (Array.isArray(translators) ? translators : [])
    .map((translator) => {
      const source = translator as Record<string, unknown>;
      return {
        translatorID: trimText(source?.translatorID),
        label: trimText(source?.label),
        priority:
          typeof source?.priority === "number" ? source.priority : undefined,
        translatorType:
          typeof source?.translatorType === "number" ||
          typeof source?.translatorType === "string"
            ? source.translatorType
            : undefined,
      };
    })
    .filter((translator) => translator.translatorID || translator.label);
}

function serializeMetadataCreators(
  creators: unknown,
): ZoteroHostMetadataCreatorDto[] {
  return (Array.isArray(creators) ? creators : [])
    .map((creator) => {
      const source = creator as Record<string, unknown>;
      return {
        firstName: trimText(source?.firstName),
        lastName: trimText(source?.lastName),
        name: trimText(source?.name),
        creatorType: trimText(source?.creatorType),
      };
    })
    .map((creator) => {
      return Object.fromEntries(
        Object.entries(creator).filter(([, value]) => Boolean(value)),
      ) as ZoteroHostMetadataCreatorDto;
    })
    .filter((creator) => Object.keys(creator).length > 0)
    .slice(0, 50);
}

function readMetadataPlainField(
  item: Record<string, unknown>,
  field: string,
  limit = FIELD_TEXT_LIMIT,
) {
  return trimText(item[field], limit);
}

function serializeMetadataItem(
  item: unknown,
): ZoteroHostMetadataItemDto | null {
  if (!item || typeof item !== "object") {
    return null;
  }
  const source = item as Record<string, unknown>;
  const fields: Record<string, string | number | boolean> = {};
  for (const field of DETAIL_FIELDS) {
    const value =
      typeof (source as { getField?: unknown }).getField === "function"
        ? readField(item as Zotero.Item, field, FIELD_TEXT_LIMIT)
        : readMetadataPlainField(source, field, FIELD_TEXT_LIMIT);
    if (value) {
      fields[field] = value;
    }
  }
  for (const field of ["archiveID", "PMID", "extra"]) {
    const value = readMetadataPlainField(source, field, FIELD_TEXT_LIMIT);
    if (value) {
      fields[field] = value;
    }
  }
  let creators: ZoteroHostMetadataCreatorDto[] = [];
  try {
    creators = serializeMetadataCreators(
      typeof (source as { getCreators?: unknown }).getCreators === "function"
        ? (source as { getCreators: () => unknown }).getCreators()
        : source.creators,
    );
  } catch {
    creators = [];
  }
  const dto: ZoteroHostMetadataItemDto = {
    itemType: trimText(source.itemType) || "journalArticle",
    fields,
    creators,
  };
  for (const field of [
    "title",
    "DOI",
    "ISBN",
    "ISSN",
    "url",
    "abstractNote",
    "date",
    "publicationTitle",
    "archiveID",
    "PMID",
    "extra",
  ] as const) {
    const value = trimText(fields[field]);
    if (value) {
      dto[field] = value;
    }
  }
  return dto;
}

async function translateMetadataIdentifier(
  args: ZoteroHostMetadataTranslateIdentifierArgs = {},
): Promise<ZoteroHostMetadataTranslateIdentifierResponse> {
  const type = normalizeMetadataIdentifierType(args?.type);
  const value = trimText(args?.normalized || args?.value, FIELD_TEXT_LIMIT);
  const empty = (
    code: string,
    message: string,
    details?: JsonObject,
  ): ZoteroHostMetadataTranslateIdentifierResponse => ({
    ok: false,
    item: null,
    itemCount: 0,
    translators: [],
    diagnostics: [{ code, message, ...(details ? { details } : {}) }],
  });
  if (!type || !value) {
    return empty(
      "invalid_identifier",
      "metadata.translateIdentifier requires a supported non-empty identifier.",
    );
  }

  const Translate = (resolveZotero() as any).Translate;
  if (!Translate?.Search) {
    return empty(
      "translate_search_unavailable",
      "Zotero Translate.Search is unavailable.",
    );
  }

  try {
    const translate = new Translate.Search();
    if (type === "ISBN") {
      translate.setSearch?.({ itemType: "book", ISBN: value });
    } else {
      translate.setIdentifier?.({ [type]: value });
    }
    const rawTranslators = (await translate.getTranslators?.()) || [];
    const translators = serializeMetadataTranslators(rawTranslators);
    if (!Array.isArray(rawTranslators) || rawTranslators.length === 0) {
      return {
        ok: false,
        item: null,
        itemCount: 0,
        translators,
        diagnostics: [
          {
            code: "no_translators",
            message: `No Zotero translator found for ${type}.`,
          },
        ],
      };
    }
    translate.setTranslator?.(rawTranslators);
    const rawItems =
      (await translate.translate?.({
        libraryID: false,
        saveAttachments: false,
      })) || [];
    const itemList = Array.isArray(rawItems) ? rawItems : [];
    const item = serializeMetadataItem(itemList[0]);
    return {
      ok: Boolean(item),
      item,
      itemCount: itemList.length,
      translators,
      diagnostics: item
        ? []
        : [
            {
              code: "no_items",
              message: "No items returned from any translator.",
              details: { itemCount: itemList.length, translators },
            },
          ],
    };
  } catch (error) {
    return empty(
      "translate_search_failed",
      error instanceof Error ? error.message : String(error),
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
  return {
    ...serializeLibraryItemSummary(item),
    DOI: readField(item, "DOI"),
    ISBN: readField(item, "ISBN"),
    ISSN: readField(item, "ISSN"),
    url: readField(item, "url"),
  };
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

function serializeNoteSummary(
  item: Zotero.Item,
  maxExcerptChars = NOTE_EXCERPT_DEFAULT,
): ZoteroHostNoteDto {
  const warnings: string[] = [];
  const html = extractNoteHtml(item, warnings);
  const text = htmlToText(html);
  const parent = noteParentWithWarnings(item, warnings);
  const excerptLimit = Math.min(
    NOTE_EXCERPT_MAX,
    Math.max(1, parsePositiveInteger(maxExcerptChars) || NOTE_EXCERPT_DEFAULT),
  );
  return {
    id: parsePositiveInteger(item.id),
    key: trimText(item.key),
    libraryId: normalizeLibraryId(
      (item as unknown as { libraryID?: unknown }).libraryID,
    ),
    title: getItemTitle(item) || text.slice(0, 80),
    textExcerpt: trimText(text, excerptLimit),
    textLength: text.length,
    htmlLength: html.length,
    ...(parent ? { parent } : {}),
    ...(warnings.length ? { warnings } : {}),
  };
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

function serializeNoteDetailChunk(
  item: Zotero.Item,
  args: ZoteroHostNoteDetailArgs = {},
): ZoteroHostNoteDetailChunkDto {
  const warnings: string[] = [];
  const format = args.format === "html" ? "html" : "text";
  const html = extractNoteHtml(item, warnings);
  const fullContent = format === "html" ? html : htmlToText(html);
  const maxChars = Math.min(
    NOTE_DETAIL_CHUNK_MAX,
    Math.max(
      1,
      parsePositiveInteger(args.maxChars) || NOTE_DETAIL_CHUNK_DEFAULT,
    ),
  );
  const offset = Math.min(
    fullContent.length,
    Math.max(0, parseNonNegativeInteger(args.offset)),
  );
  const content = fullContent.slice(offset, offset + maxChars);
  const nextOffset = Math.min(fullContent.length, offset + content.length);
  const parent = noteParentWithWarnings(item, warnings);
  return {
    id: parsePositiveInteger(item.id),
    key: trimText(item.key),
    libraryId: normalizeLibraryId(
      (item as unknown as { libraryID?: unknown }).libraryID,
    ),
    title: getItemTitle(item) || htmlToText(html).slice(0, 80),
    format,
    content,
    offset,
    nextOffset,
    hasMore: nextOffset < fullContent.length,
    totalChars: fullContent.length,
    truncated: nextOffset < fullContent.length,
    maxChars,
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

function getPayloadDetailFromBlock(
  block: ZoteroNotePayloadBlock,
  args: ZoteroHostNotePayloadDetailArgs = {},
): ZoteroNotePayloadDetail {
  const fullContent = getPayloadContent(block);
  const maxChars = Math.min(
    NOTE_DETAIL_CHUNK_MAX,
    Math.max(
      1,
      parsePositiveInteger(args.maxChars) || NOTE_DETAIL_CHUNK_DEFAULT,
    ),
  );
  const offset = Math.min(
    fullContent.length,
    Math.max(0, parseNonNegativeInteger(args.offset)),
  );
  const content = fullContent.slice(offset, offset + maxChars);
  const nextOffset = Math.min(fullContent.length, offset + content.length);
  return {
    ...block,
    content,
    offset,
    nextOffset,
    hasMore: nextOffset < fullContent.length,
    totalChars: fullContent.length,
    truncated: nextOffset < fullContent.length,
  };
}

async function serializeNotePayloadSummary(
  item: Zotero.Item,
): Promise<ZoteroHostNotePayloadSummaryDto[]> {
  return (await listNotePayloadBlocksForItem(item)).map((entry) => ({
    payloadType: entry.payloadType,
    noteKind: entry.noteKind,
    version: entry.version,
    encoding: entry.encoding,
    estimatedSize: entry.estimatedSize,
    format: entry.format,
    ...(entry.errors ? { errors: entry.errors } : {}),
    ...(entry.source ? { source: entry.source } : {}),
    ...(entry.attachmentKey ? { attachmentKey: entry.attachmentKey } : {}),
  }));
}

async function serializeNotePayloadDetail(
  item: Zotero.Item,
  args: ZoteroHostNotePayloadDetailArgs = {},
): Promise<ZoteroHostNotePayloadDetailDto> {
  const html = extractNoteHtml(item, []);
  const blocks = await listNotePayloadBlocksForItem(item);
  const selected = selectPreferredNotePayloadBlock(blocks, args.payloadType);
  const detail =
    selected?.source === "embedded-image-attachment"
      ? getPayloadDetailFromBlock(selected, args)
      : getNotePayloadDetail(html, args);
  const payload = detail.payload ?? null;
  assertJsonValue(payload, "note payload");
  return {
    payloadType: detail.payloadType,
    noteKind: detail.noteKind,
    version: detail.version,
    encoding: detail.encoding,
    estimatedSize: detail.estimatedSize,
    payload,
    ...(detail.markdown !== undefined ? { markdown: detail.markdown } : {}),
    format: detail.format,
    ...(detail.errors ? { errors: detail.errors } : {}),
    ...(detail.source ? { source: detail.source } : {}),
    ...(detail.attachmentKey ? { attachmentKey: detail.attachmentKey } : {}),
    content: detail.content,
    offset: detail.offset,
    nextOffset: detail.nextOffset,
    hasMore: detail.hasMore,
    totalChars: detail.totalChars,
    truncated: detail.truncated,
    maxChars: Math.min(
      NOTE_DETAIL_CHUNK_MAX,
      Math.max(
        1,
        parsePositiveInteger(args.maxChars) || NOTE_DETAIL_CHUNK_DEFAULT,
      ),
    ),
  };
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

function failedNoteDto(id: unknown, error: unknown): ZoteroHostNoteDto {
  return {
    id: parsePositiveInteger(id),
    key: "",
    libraryId: 0,
    title: "",
    html: "",
    text: "",
    errors: [childError("zotero_note_child_failed", error)],
  };
}

function failedAttachmentDto(
  id: unknown,
  error: unknown,
): ZoteroHostAttachmentDto {
  return {
    id: parsePositiveInteger(id),
    key: "",
    libraryId: 0,
    title: "",
    contentType: "",
    path: "",
    filename: "",
    errors: [childError("zotero_attachment_child_failed", error)],
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

function collectionPath(
  collection: Zotero.Collection,
  byId: Map<string, Zotero.Collection>,
) {
  const names: string[] = [];
  const seen = new Set<string>();
  let current: Zotero.Collection | undefined = collection;
  while (current) {
    const id = String((current as unknown as { id?: unknown }).id || "");
    if (id && seen.has(id)) {
      break;
    }
    if (id) {
      seen.add(id);
    }
    const name = trimText((current as unknown as { name?: unknown }).name);
    if (name) {
      names.unshift(name);
    }
    const parentId = parsePositiveInteger(
      (
        current as unknown as {
          parentID?: unknown;
          parentCollectionID?: unknown;
        }
      ).parentID ||
        (current as unknown as { parentCollectionID?: unknown })
          .parentCollectionID,
    );
    current = parentId ? byId.get(String(parentId)) : undefined;
  }
  return names;
}

export async function listZoteroCollections(args: { libraryId?: number } = {}) {
  const zotero = resolveZotero();
  const libraryId =
    parsePositiveInteger(args.libraryId) ||
    normalizeLibraryId(zotero.Libraries?.userLibraryID);
  const collectionsApi = (zotero.Collections || {}) as unknown as {
    get?: (id: number) => Zotero.Collection | undefined;
    getByLibrary?: (
      libraryId: number,
    ) => Zotero.Collection[] | Promise<Zotero.Collection[]>;
    getByLibraryID?: (
      libraryId: number,
    ) => Zotero.Collection[] | Promise<Zotero.Collection[]>;
    getAll?: () => Zotero.Collection[] | Promise<Zotero.Collection[]>;
  };
  let collections: Zotero.Collection[] = [];
  if (typeof collectionsApi.getByLibrary === "function") {
    const loaded = await collectionsApi.getByLibrary(libraryId);
    if (Array.isArray(loaded)) {
      collections = loaded;
    }
  }
  if (
    collections.length === 0 &&
    typeof collectionsApi.getByLibraryID === "function"
  ) {
    const loaded = await collectionsApi.getByLibraryID(libraryId);
    if (Array.isArray(loaded)) {
      collections = loaded;
    }
  }
  if (collections.length === 0 && typeof collectionsApi.getAll === "function") {
    const loaded = await collectionsApi.getAll();
    if (Array.isArray(loaded)) {
      collections = loaded.filter(
        (collection) =>
          (parsePositiveInteger(
            (collection as unknown as { libraryID?: unknown }).libraryID,
          ) || libraryId) === libraryId,
      );
    }
  }
  if (collections.length === 0 && typeof collectionsApi.get === "function") {
    let misses = 0;
    for (let id = 1; id <= 50000; id += 1) {
      const collection = collectionsApi.get(id);
      if (!collection) {
        misses += 1;
        if (misses >= 200) {
          break;
        }
        continue;
      }
      misses = 0;
      if (
        (parsePositiveInteger(
          (collection as unknown as { libraryID?: unknown }).libraryID,
        ) || libraryId) === libraryId
      ) {
        collections.push(collection);
      }
    }
  }

  const byId = new Map<string, Zotero.Collection>();
  for (const collection of collections) {
    const id = String((collection as unknown as { id?: unknown }).id || "");
    if (id) {
      byId.set(id, collection);
    }
  }
  return collections
    .map((collection) => {
      const serialized = serializeCollection(collection);
      return {
        ...serialized,
        path: collectionPath(collection, byId),
      };
    })
    .sort((a, b) =>
      (a.path || [a.name])
        .join("\u0000")
        .localeCompare((b.path || [b.name]).join("\u0000")),
    );
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

async function upsertNotePayloadAttachment(request: ZoteroHostMutationRequest) {
  const note = requireNote(request.note || request.target);
  const payloadType = normalizePayloadType(request.payloadType);
  const noteKind = trimText(request.noteKind, 80);
  const payloadFormat = normalizePayloadFormat(
    request.payloadFormat,
    payloadType,
  );
  const payloadInput =
    payloadFormat === "json"
      ? request.payload
      : {
          format: payloadFormat,
          content:
            request.payload === undefined
              ? request.content
              : typeof request.payload === "object" && request.payload !== null
                ? (request.payload as Record<string, unknown>).content
                : request.payload,
        };
  const normalized = normalizeJsonSafePayload(payloadInput);
  const previous = (await listNotePayloadBlocksForItem(note)).filter(
    (entry) =>
      entry.source === "embedded-image-attachment" &&
      entry.payloadType === payloadType &&
      entry.attachmentKey,
  );
  const envelope = buildWorkbenchPayloadEnvelope({
    noteId: note.id || null,
    noteKey: note.key,
    parentId:
      (note as unknown as { parentID?: unknown; parentItemID?: unknown })
        .parentID ||
      (note as unknown as { parentItemID?: unknown }).parentItemID ||
      null,
    noteKind,
    payloadType,
    payload: normalized.payload,
  });
  const bytes = buildWorkbenchPayloadImageBytes(envelope);
  const zotero = resolveZotero();
  if (typeof zotero.Attachments?.importEmbeddedImage !== "function") {
    throw new Error("Zotero embedded image import is unavailable");
  }
  const attachment = await zotero.Attachments.importEmbeddedImage({
    blob: blobFromBytes(bytes, "image/png"),
    parentItemID: note.id,
  });
  const attachmentKey = trimText(attachment?.key);
  if (attachmentKey) {
    await updateNoteContentDirect(
      note,
      appendPayloadAnchor(
        (note as unknown as { getNote?: () => unknown }).getNote?.(),
        payloadType,
        attachmentKey,
      ),
    );
  }
  let replaced = 0;
  for (const old of previous) {
    if (!old.attachmentKey || old.attachmentKey === attachmentKey) {
      continue;
    }
    const oldAttachment =
      zotero.Items.getByLibraryAndKey?.(
        normalizeLibraryId(
          (note as unknown as { libraryID?: unknown }).libraryID,
        ),
        old.attachmentKey,
      ) || null;
    if (!oldAttachment) {
      continue;
    }
    const parentId =
      (
        oldAttachment as unknown as {
          parentID?: unknown;
          parentItemID?: unknown;
        }
      ).parentID ||
      (oldAttachment as unknown as { parentItemID?: unknown }).parentItemID;
    if (Number(parentId) !== Number(note.id)) {
      continue;
    }
    await handlers.attachment.remove(oldAttachment);
    replaced += 1;
  }
  return {
    note,
    payload: {
      noteKey: trimText(note.key),
      payloadType,
      noteKind,
      attachmentKey,
      payloadStorageVersion: 2,
      payloadHash: trimText(envelope.payloadHash),
      anchorStatus: attachmentKey ? "present" : "missing",
      bytes: bytes.length,
      replaced,
    },
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
    case "note.upsertPayload": {
      const result = await upsertNotePayloadAttachment(request);
      return {
        ...preview,
        result: {
          notes: [serializeNote(result.note)],
          payloads: [result.payload],
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

export async function listLegacyZoteroLibraryItems(
  args: ZoteroHostLibraryListArgs = {},
): Promise<ZoteroHostLibraryListResponse> {
  const selection = await selectLibraryItemPage(args);
  const { page, ...response } = selection;
  return {
    ...response,
    items: page.map(serializeLibraryItemSummary),
  };
}

async function listLibraryItems(
  input: LibraryListItemsRequestDto = {},
  control: WorkflowCallControl = {},
): Promise<LibraryListItemsPageDto> {
  throwIfWorkflowCallCanceled(control);
  const collection = input.collectionRef
    ? resolveCollection(input.collectionRef)
    : null;
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
    const page = await queryZoteroLibraryPage(
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
    );
    const items = await Promise.all(
      page.items.map(serializeCanonicalItemSummary),
    );
    throwIfWorkflowCallCanceled(control);
    return {
      items,
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
    throw error;
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

type CollectionCursor = {
  version: 1;
  criteriaDigest: string;
  afterKey: string;
};

function decodeCollectionCursor(value: string): CollectionCursor {
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const parsed = JSON.parse(
      decodeBase64Utf8(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
    );
    if (
      parsed?.version !== 1 ||
      typeof parsed.criteriaDigest !== "string" ||
      typeof parsed.afterKey !== "string"
    ) {
      throw new Error("invalid collection cursor");
    }
    return parsed;
  } catch {
    throw capabilityError("invalid_request", "collection cursor is invalid", {
      reason: "invalid_value",
      field: "cursor",
    });
  }
}

function encodeCollectionCursor(cursor: CollectionCursor) {
  return encodeBase64Utf8(JSON.stringify(cursor))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
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
  const limit = input.limit ?? 100;
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw capabilityError(
      "invalid_request",
      "collection page limit is invalid",
      {
        reason: "invalid_value",
        field: "limit",
      },
    );
  }
  if (limit > 500) {
    throw capabilityError(
      "resource_limited",
      "collection page limit is invalid",
      {
        resource: "items",
        limit: 500,
        observed: Number.isFinite(limit) ? Number(limit) : undefined,
      },
    );
  }
  const criteriaDigest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        schema: "zotero-agents.library-live-collections.v1",
        libraryId,
        order: "stable_identity",
      }),
    ),
  );
  if (!criteriaDigest) {
    throw capabilityError(
      "unavailable",
      "collection cursor hashing is unavailable",
      {
        reason: "runtime",
        kind: "collection",
      },
    );
  }
  let afterKey = "";
  if (input.cursor) {
    const cursor = decodeCollectionCursor(input.cursor);
    if (cursor.criteriaDigest !== criteriaDigest) {
      throw capabilityError(
        "invalid_request",
        "collection cursor criteria changed",
        {
          reason: "invalid_value",
          field: "cursor",
        },
      );
    }
    afterKey = cursor.afterKey;
  }
  const legacy = await listZoteroCollections({ libraryId });
  const collections = legacy
    .map((entry) => {
      const raw = resolveCollection({
        libraryId: entry.libraryId,
        key: entry.key,
      });
      if (!raw) throw canonicalReadFailure("collection");
      return canonicalCollectionDto(raw, entry.path || [entry.name]);
    })
    .sort((left, right) => left.ref.key.localeCompare(right.ref.key));
  const remaining = collections.filter((entry) => entry.ref.key > afterKey);
  const page = remaining.slice(0, limit);
  const hasMore = remaining.length > limit;
  throwIfWorkflowCallCanceled(control);
  return {
    collections: page,
    libraryId,
    nextCursor:
      hasMore && page.length
        ? encodeCollectionCursor({
            version: 1,
            criteriaDigest,
            afterKey: page.at(-1)!.ref.key,
          })
        : null,
    hasMore,
    returned: page.length,
    order: "stable_identity",
  };
}

const traversalEvidenceRegistry = new Map<
  string,
  LibraryTraversalCompletionEvidenceDto
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
  traversalEvidenceRegistry.set(evidenceId, evidence);
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
  let cursor = input.resumeCursor;
  let visitedItems = 0;
  let visitedBatches = 0;
  let criteriaDigest = "";
  for (;;) {
    if (control?.signal?.aborted) {
      return { outcome: "canceled", libraryId, visitedItems, visitedBatches };
    }
    const remainingItems = maxItems - visitedItems;
    const page = await listLibraryItems({
      libraryId,
      collectionRef: input.collectionRef,
      tag: input.tag,
      itemType: input.itemType,
      query: input.query,
      limit: Math.min(pageSize, remainingItems),
      cursor,
    });
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
    const items = page.items.map((item) => {
      if (item.kind !== "regular") {
        throw canonicalReadFailure("item");
      }
      return item;
    });
    if (items.length) {
      const batch = { batchIndex: visitedBatches, items };
      await onBatch(batch);
      for (const item of items) {
        const tagDigest = await sha256Hex(
          new TextEncoder().encode(JSON.stringify(item.tags)),
        );
        if (!tagDigest) throw canonicalReadFailure("item");
        coverage.update(
          new TextEncoder().encode(
            `${JSON.stringify([item.ref, item.revision, tagDigest])}\n`,
          ),
        );
      }
      visitedItems += items.length;
      visitedBatches += 1;
    }
    if (control?.signal?.aborted) {
      return { outcome: "canceled", libraryId, visitedItems, visitedBatches };
    }
    if (!page.hasMore) {
      const completionEvidence = await issueTraversalEvidence(
        criteriaDigest,
        coverage.digestHex(),
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

async function syncLibrarySnapshot(
  args: ZoteroHostLibraryListArgs = {},
): Promise<ZoteroHostLibrarySyncSnapshotResponse> {
  const selection = await selectLibraryItemPage(args);
  const generatedAt = new Date().toISOString();
  return {
    schema: "zotero.library.snapshot.v1",
    generatedAt,
    snapshotId: [
      "zotero-library",
      generatedAt.replace(/[^0-9]/g, ""),
      selection.criteriaHash.slice(0, 16),
      selection.afterItemId,
      selection.returned,
      selection.totalScanned,
    ].join("-"),
    items: selection.page.map(serializeLibrarySyncSnapshotItem),
    nextCursor: selection.nextCursor,
    hasMore: selection.hasMore,
    returned: selection.returned,
    totalScanned: selection.totalScanned,
    filters: selection.filters,
  };
}

async function readinessAudit(
  args: ZoteroHostLibraryReadinessAuditArgs = {},
): Promise<ZoteroHostLibraryReadinessAuditResponse> {
  const selection = await selectLibraryItemPage(args);
  const checks = normalizeReadinessChecks(args.checks);
  const missingOnly = parseBooleanInput(args.missingOnly ?? args.missing_only);
  const items: ZoteroHostLibraryReadinessItemDto[] = [];
  for (const item of selection.page) {
    const dto = await serializeLibraryReadinessItem(
      item as LibraryArtifactItem,
      checks,
    );
    if (!missingOnly || dto.missing.length > 0) {
      items.push(dto);
    }
  }
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
): Promise<ZoteroHostLibraryReadinessItemDto> {
  const artifactReadiness = await resolveLibraryArtifactReadiness(item);
  const readiness = {
    pdf: artifactReadiness.pdf.present ? "present" : "missing",
    markdown: artifactReadiness.sourceMarkdown.present ? "present" : "missing",
    analysis: artifactReadiness.generated.complete ? "present" : "missing",
  } satisfies ZoteroHostLibraryReadinessItemDto["readiness"];
  const missing = checks.filter((check) => readiness[check] === "missing");
  return {
    ...serializeLibraryItemSummary(item),
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

export function getLegacyZoteroSelectedItems() {
  const win =
    (globalThis as any).Zotero?.getMainWindow?.() || (globalThis as any).window;
  const items = win?.ZoteroPane?.getSelectedItems?.() || [];
  return (Array.isArray(items) ? items : [])
    .filter(isRawZoteroItem)
    .map(serializeZoteroItemSummary);
}

function selectedRowFlag(row: any, method: string) {
  try {
    return typeof row?.[method] === "function" && row[method]() === true;
  } catch {
    return false;
  }
}

function serializeSelectedSource(row: any): ZoteroHostSelectedSourceDto {
  const ref = row?.ref || {};
  const id = parsePositiveInteger(
    ref?.id ?? ref?.collectionID ?? ref?.searchID,
  );
  const libraryId = normalizeLibraryId(ref?.libraryID ?? ref?.libraryId);
  const collection = id ? resolveZotero().Collections?.get?.(id) : null;
  if (
    collection &&
    trimText((collection as any).key) &&
    !selectedRowFlag(row, "isSearch")
  ) {
    return { kind: "collection", ...serializeCollection(collection) };
  }
  if (selectedRowFlag(row, "isSearch")) {
    return {
      kind: "saved-search",
      id: id || trimText(ref?.key) || "unknown",
      key: trimText(ref?.key),
      name: trimText(ref?.name ?? row?.name),
      libraryId,
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

function getSelectedSources() {
  const win =
    (globalThis as any).Zotero?.getMainWindow?.() || (globalThis as any).window;
  if (!win) return [];
  return resolveSelectedLibraryTreeRows(win).map(serializeSelectedSource);
}

export function getLegacyZoteroCurrentView() {
  let context: AcpHostContext;
  try {
    context = buildCurrentAcpHostContext();
  } catch {
    throw capabilityError(
      "execution_failed",
      "Zotero view read failed",
      {
        phase: "read",
        recovery: "retry_same_operation",
      },
      true,
    );
  }
  const win =
    (globalThis as any).Zotero?.getMainWindow?.() || (globalThis as any).window;
  const selectedSources = getSelectedSources();
  const selectedSourceLibraryIds = selectedSources
    .map((source) => source.libraryId)
    .filter(
      (libraryId): libraryId is number =>
        typeof libraryId === "number" && libraryId > 0,
    )
    .map(String);
  const libraryIds = [
    ...new Set([
      ...(win ? resolveSelectedLibraryIds(win) : []),
      ...selectedSourceLibraryIds,
      ...(context.libraryIds || []),
    ]),
  ];
  const uniqueLibraryId = libraryIds.length === 1 ? libraryIds[0] : undefined;
  const currentItem = context.currentItem
    ? resolveZotero().Items.get(parsePositiveInteger(context.currentItem.id)) ||
      (context.currentItem.key && uniqueLibraryId
        ? resolveZotero().Items.getByLibraryAndKey(
            parsePositiveInteger(uniqueLibraryId),
            context.currentItem.key,
          )
        : null)
    : null;
  const selectedCollection =
    selectedSources.length === 1 && selectedSources[0]?.kind === "collection"
      ? selectedSources[0]
      : undefined;
  const {
    libraryId: _legacyLibraryId,
    libraryIds: _legacyLibraryIds,
    ...rest
  } = context;
  return {
    ...rest,
    libraryIds,
    ...(uniqueLibraryId ? { libraryId: uniqueLibraryId } : {}),
    currentItem: currentItem
      ? {
          ...context.currentItem,
          ...serializeZoteroItemSummary(currentItem),
        }
      : context.currentItem,
    selectedItems: getLegacyZoteroSelectedItems(),
    selectedSources,
    ...(selectedCollection
      ? {
          currentCollection: {
            id: selectedCollection.id,
            key: selectedCollection.key,
            name: selectedCollection.name,
            libraryId: selectedCollection.libraryId,
            ...(selectedCollection.parentId !== undefined
              ? { parentId: selectedCollection.parentId }
              : {}),
            ...(selectedCollection.parentKey
              ? { parentKey: selectedCollection.parentKey }
              : {}),
            ...(selectedCollection.path
              ? { path: selectedCollection.path }
              : {}),
          },
        }
      : {}),
  };
}

async function getSelectedItems(
  control: WorkflowCallControl = {},
): Promise<SelectedItemsSnapshotDto> {
  const win =
    (globalThis as any).Zotero?.getMainWindow?.() || (globalThis as any).window;
  const pane = win?.ZoteroPane;
  if (!pane || typeof pane.getSelectedItems !== "function") {
    throw capabilityError("unavailable", "Zotero selection is unavailable", {
      reason: "navigation",
      kind: "item",
    });
  }
  let raw: unknown;
  try {
    raw = pane.getSelectedItems();
  } catch {
    throw canonicalReadFailure("item");
  }
  if (!Array.isArray(raw)) throw canonicalReadFailure("item");
  if (raw.length > 10_000) {
    throw capabilityError("resource_limited", "selection exceeds the limit", {
      resource: "selection",
      limit: 10_000,
      observed: raw.length,
    });
  }
  const items: SelectedItemsSnapshotDto["items"] = [];
  for (let index = 0; index < raw.length; index += 1) {
    if (control.signal?.aborted) {
      throw capabilityError("canceled", "selection capture was canceled", {
        reason: "caller_signal",
      });
    }
    let item = raw[index];
    if (!isRawZoteroItem(item)) throw canonicalReadFailure("item");
    if (item.isAttachment?.()) {
      const parent = canonicalParentRef(item);
      if (parent) item = requireItem(parent);
    }
    const parentRef = canonicalParentRef(item);
    items.push({
      ref: canonicalItemRef(item),
      itemType: String(item.itemType || ""),
      ...(getItemTitle(item) ? { title: getItemTitle(item) } : {}),
      ...(parentRef ? { parentRef } : {}),
    });
    if (index > 0 && index % 128 === 0) await Promise.resolve();
  }
  return { capturedAt: new Date().toISOString(), items };
}

function getCurrentView(): CurrentViewDto {
  const win =
    (globalThis as any).Zotero?.getMainWindow?.() || (globalThis as any).window;
  if (!win?.ZoteroPane) {
    throw capabilityError("unavailable", "Zotero view context is unavailable", {
      reason: "navigation",
      kind: "library",
    });
  }
  const context = buildCurrentAcpHostContext();
  const selectedSources = getSelectedSources();
  const libraryIds = [
    ...new Set([
      ...resolveSelectedLibraryIds(win),
      ...(context.libraryIds || []),
      ...selectedSources
        .map((source) => source.libraryId)
        .filter((libraryId): libraryId is number => Boolean(libraryId))
        .map(String),
    ]),
  ];
  const libraryId =
    libraryIds.length === 1 ? parsePositiveInteger(libraryIds[0]) : 0;
  const currentItem = context.currentItem
    ? (parsePositiveInteger(context.currentItem.id)
        ? resolveZotero().Items.get(
            parsePositiveInteger(context.currentItem.id),
          )
        : null) ||
      (context.currentItem.key && libraryId
        ? resolveZotero().Items.getByLibraryAndKey(
            libraryId,
            context.currentItem.key,
          )
        : null)
    : null;
  const selectedCollection =
    selectedSources.length === 1 && selectedSources[0]?.kind === "collection"
      ? selectedSources[0]
      : null;
  return {
    target: context.target === "reader" ? "reader" : "library",
    ...(libraryId ? { libraryId } : {}),
    selectionEmpty: context.selectionEmpty,
    ...(currentItem
      ? {
          currentItem: {
            ref: canonicalItemRef(currentItem),
            ...(getItemTitle(currentItem)
              ? { title: getItemTitle(currentItem) }
              : {}),
          },
        }
      : {}),
    ...(selectedCollection
      ? {
          currentCollection: {
            ref: {
              libraryId: selectedCollection.libraryId,
              key: selectedCollection.key,
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
    currentView: getLegacyZoteroCurrentView(),
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
    currentView: getLegacyZoteroCurrentView(),
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
    currentView: getLegacyZoteroCurrentView(),
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
    currentView: getLegacyZoteroCurrentView(),
  };
}

function throwIfWorkflowCallCanceled(control: WorkflowCallControl = {}) {
  if (control.signal?.aborted) {
    throw capabilityError("canceled", "workflow call was canceled", {
      reason: "caller_signal",
    });
  }
}

async function openZoteroItem(
  ref: ZoteroHostItemRefInput,
  control: WorkflowCallControl = {},
): Promise<NavigationResultDto> {
  throwIfWorkflowCallCanceled(control);
  const item = requireItem(ref);
  if (canonicalItemKind(item) !== "regular") {
    throw invalidRefError(
      "item",
      "wrong_kind",
      "ref does not identify a regular item",
    );
  }
  await selectZoteroItems([item]);
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
  const note = requireNote(ref);
  await selectZoteroItems([note]);
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
  const collection = resolveCollection(ref);
  if (!collection) throw notFoundError("collection", ref);
  await selectZoteroCollection(collection);
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
  for (const ref of input.itemRefs) {
    throwIfWorkflowCallCanceled(control);
    const item = requireItem(ref);
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
  }
  await selectZoteroItems(items);
  throwIfWorkflowCallCanceled(control);
  return {
    openedAt: new Date().toISOString(),
    target: { kind: "selection", refs: items.map(canonicalItemRef) },
  };
}

export async function getLegacyZoteroItemDetail(ref: ZoteroHostItemRefInput) {
  const item = resolveItem(ref);
  return item ? serializeItemDetail(item) : null;
}

export async function getLegacyZoteroItemNotes(
  ref: ZoteroHostItemRefInput,
  args: {
    limit?: number | string;
    cursor?: number | string;
    maxExcerptChars?: number | string;
  } = {},
) {
  const item = requireItem(ref, "item");
  let noteIds: unknown[] = [];
  try {
    noteIds = item.getNotes?.() || [];
  } catch {
    return [];
  }
  const limit = Math.min(
    TARGET_LIMIT_MAX,
    Math.max(1, parsePositiveInteger(args.limit) || TARGET_LIMIT_MAX),
  );
  const cursor = parseNonNegativeInteger(args.cursor);
  const maxExcerptChars = Math.min(
    NOTE_EXCERPT_MAX,
    Math.max(
      1,
      parsePositiveInteger(args.maxExcerptChars) || NOTE_EXCERPT_DEFAULT,
    ),
  );
  return noteIds.slice(cursor, cursor + limit).map((id) => {
    try {
      const note = resolveZotero().Items.get(id as number);
      return note
        ? serializeNoteSummary(note, maxExcerptChars)
        : failedNoteDto(id, new Error("child note not found"));
    } catch (error) {
      return failedNoteDto(id, error);
    }
  });
}

export async function getLegacyZoteroNoteDetail(
  ref: ZoteroHostItemRefInput,
  args: ZoteroHostNoteDetailArgs = {},
) {
  return serializeNoteDetailChunk(requireNote(ref), args);
}

export async function listLegacyZoteroNotePayloads(
  ref: ZoteroHostItemRefInput,
) {
  return serializeNotePayloadSummary(requireNote(ref));
}

export async function getLegacyZoteroNotePayload(
  ref: ZoteroHostItemRefInput,
  args: ZoteroHostNotePayloadDetailArgs = {},
) {
  return serializeNotePayloadDetail(requireNote(ref), args);
}

export async function getLegacyZoteroItemAttachments(
  ref: ZoteroHostItemRefInput,
) {
  const item = requireItem(ref, "item");
  let attachmentIds: unknown[] = [];
  try {
    attachmentIds = item.getAttachments?.() || [];
  } catch {
    return [];
  }
  const attachments: ZoteroHostAttachmentDto[] = [];
  for (const id of attachmentIds) {
    try {
      const attachment = resolveZotero().Items.get(id as number);
      attachments.push(
        attachment
          ? await serializeAttachment(attachment)
          : failedAttachmentDto(id, new Error("child attachment not found")),
      );
    } catch (error) {
      attachments.push(failedAttachmentDto(id, error));
    }
  }
  return attachments;
}

async function getCanonicalItemNotes(
  ref: ZoteroHostItemRefInput,
  control: WorkflowCallControl = {},
) {
  throwIfWorkflowCallCanceled(control);
  const item = requireItem(ref, "item");
  let ids: unknown;
  try {
    ids = item.getNotes?.();
  } catch {
    throw canonicalReadFailure("note");
  }
  if (!Array.isArray(ids)) throw canonicalReadFailure("note");
  if (ids.length > 500) {
    throw capabilityError("resource_limited", "child notes exceed the limit", {
      resource: "items",
      limit: 500,
      observed: ids.length,
    });
  }
  const notes = ids.map((id) => {
    const note = resolveZotero().Items.get(id as number);
    if (!note || !note.isNote?.()) throw canonicalReadFailure("note");
    return canonicalNoteSummaryDto(note);
  });
  throwIfWorkflowCallCanceled(control);
  return notes;
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
  const note = requireNote(ref);
  const content = canonicalNoteText(note);
  const detail = {
    ref: canonicalItemRef(note),
    parentRef: canonicalParentRef(note),
    title: canonicalTitle(note) || content.text.slice(0, 80),
    format: options.format,
    content: options.format === "html" ? content.html : content.text,
    revision: canonicalRevision(note),
  };
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
  control: WorkflowCallControl = {},
) {
  throwIfWorkflowCallCanceled(control);
  const note = requireNote(ref);
  const blocks = await listNotePayloadBlocksForItem(note);
  const payloads = blocks.map((block) => canonicalPayloadSummary(block, note));
  throwIfWorkflowCallCanceled(control);
  return payloads;
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
  const note = requireNote(ref);
  const blocks = (await listNotePayloadBlocksForItem(note)).filter(
    (block) => block.payloadType === payloadType,
  );
  if (blocks.length === 0) throw notFoundError("note", ref);
  if (blocks.length > 1) {
    throw capabilityError("conflict", "note payload is ambiguous", {
      reason: "ambiguous_state",
      kind: "note",
    });
  }
  const block = blocks[0];
  const summary = canonicalPayloadSummary(block, note);
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
  control: WorkflowCallControl = {},
) {
  throwIfWorkflowCallCanceled(control);
  const item = requireItem(ref, "item");
  let ids: unknown;
  try {
    ids = item.getAttachments?.();
  } catch {
    throw canonicalReadFailure("attachment");
  }
  if (!Array.isArray(ids)) throw canonicalReadFailure("attachment");
  if (ids.length > 500) {
    throw capabilityError("resource_limited", "attachments exceed the limit", {
      resource: "items",
      limit: 500,
      observed: ids.length,
    });
  }
  const result: AttachmentDetailDto[] = [];
  for (const id of ids) {
    throwIfWorkflowCallCanceled(control);
    const attachment = resolveZotero().Items.get(id as number);
    if (!attachment || !attachment.isAttachment?.()) {
      throw canonicalReadFailure("attachment");
    }
    result.push(await canonicalAttachmentDetail(attachment));
  }
  throwIfWorkflowCallCanceled(control);
  return result;
}

function canonicalAnnotationItems(
  ref: ZoteroHostItemRefInput,
  control: WorkflowCallControl = {},
) {
  throwIfWorkflowCallCanceled(control);
  const item = requireItem(ref, "item");
  const itemKind = canonicalItemKind(item);
  if (itemKind !== "regular" && itemKind !== "attachment") {
    throw invalidRefError(
      "item",
      "wrong_kind",
      "annotation listing requires a regular item or attachment",
    );
  }
  const carriers =
    itemKind === "attachment"
      ? [item]
      : (() => {
          let ids: unknown;
          try {
            ids = item.getAttachments?.();
          } catch {
            throw canonicalReadFailure("annotation");
          }
          if (!Array.isArray(ids)) throw canonicalReadFailure("annotation");
          return ids.map((id) => {
            const attachment = resolveZotero().Items.get(id as number);
            if (!attachment || !attachment.isAttachment?.()) {
              throw canonicalReadFailure("attachment");
            }
            return attachment;
          });
        })();
  const annotations: Zotero.Item[] = [];
  for (const carrier of carriers) {
    throwIfWorkflowCallCanceled(control);
    let values: unknown;
    try {
      values = (carrier as any).getAnnotations?.();
    } catch {
      throw canonicalReadFailure("annotation");
    }
    if (!Array.isArray(values)) throw canonicalReadFailure("annotation");
    for (const value of values) {
      throwIfWorkflowCallCanceled(control);
      const annotation =
        typeof value === "number" ? resolveZotero().Items.get(value) : value;
      if (
        !isRawZoteroItem(annotation) ||
        canonicalItemKind(annotation) !== "annotation"
      ) {
        throw canonicalReadFailure("annotation");
      }
      annotations.push(annotation);
    }
  }
  if (annotations.length > 5_000) {
    throw capabilityError("resource_limited", "annotations exceed the limit", {
      resource: "items",
      limit: 5_000,
      observed: annotations.length,
    });
  }
  const result = annotations
    .map(canonicalAnnotationDetail)
    .sort(
      (left, right) =>
        left.location.sortIndex.localeCompare(right.location.sortIndex) ||
        left.ref.key.localeCompare(right.ref.key),
    );
  throwIfWorkflowCallCanceled(control);
  return result;
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
  const result = refs.map((ref) => {
    throwIfWorkflowCallCanceled(control);
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

export function createZoteroHostCapabilityBroker(): ZoteroHostCapabilityBroker {
  return {
    context: {
      getCurrentView(): CurrentViewDto {
        return getCurrentView();
      },
      getSelectedItems,
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
      syncSnapshot: syncLibrarySnapshot,
      readinessAudit,
      async searchItems(args: ZoteroHostItemSearchArgs) {
        const query = trimText(args?.query, FIELD_TEXT_LIMIT);
        if (!query) {
          throw new Error("query must be non-empty");
        }
        const page = await listLibraryItems({
          libraryId: normalizeLibraryId(args?.libraryId),
          query,
          limit: Math.min(
            SEARCH_LIMIT_MAX,
            Math.max(
              1,
              parsePositiveInteger(args?.limit) || SEARCH_LIMIT_DEFAULT,
            ),
          ),
        });
        return page.items.map((summary) =>
          serializeZoteroItemSummary(requireItem(summary.ref)),
        );
      },
      async getItemDetail(
        ref: ZoteroHostItemRefInput,
        control: WorkflowCallControl = {},
      ) {
        throwIfWorkflowCallCanceled(control);
        const detail = await serializeCanonicalItemDetail(requireItem(ref));
        throwIfWorkflowCallCanceled(control);
        return detail;
      },
      async getItemNotes(
        ref: ZoteroHostItemRefInput,
        control: WorkflowCallControl = {},
      ) {
        return getCanonicalItemNotes(ref, control);
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
        control: WorkflowCallControl = {},
      ) {
        return listCanonicalNotePayloads(ref, control);
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
        control: WorkflowCallControl = {},
      ) {
        return canonicalAnnotationItems(ref, control);
      },
      exportPortableItems: exportCanonicalPortableItems,
      async exportAnnotations(
        ref: ZoteroHostItemRefInput,
        args: { format?: string } = {},
      ) {
        const annotations = annotationsFromItem(requireItem(ref, "item"));
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
        control: WorkflowCallControl = {},
      ) {
        return getCanonicalItemAttachments(ref, control);
      },
    },
    metadata: {
      translateIdentifier: translateMetadataIdentifier,
    },
    mutations: {
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
