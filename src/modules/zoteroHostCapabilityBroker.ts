import { resolveRuntimeZotero } from "../utils/runtimeBridge";
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020";
import {
  buildWorkbenchPayloadEnvelope,
  buildWorkbenchPayloadPngBytes,
  canonicalLogicalNotePayloadHash,
  decodeBase64Utf8,
  encodeBase64Utf8,
  ZoteroNotePayloadResourceLimitError,
  type ZoteroNotePayloadBlock,
  type ZoteroNotePayloadDetail,
} from "./zoteroHost/notePayloadCodec";
import {
  listNotePayloadBlocksForItemPage,
  ZoteroNotePayloadCursorError,
  ZoteroNotePayloadPageLimitError,
} from "./zoteroHost/zoteroNotePayloadResolver";
import {
  resolveLibraryArtifactReadiness,
  type LibraryArtifactItem,
  type LibraryArtifactReadOptions,
} from "./zoteroHost/libraryArtifactReadiness";
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
} from "./zoteroHost/zoteroLibraryPageQuery";
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
  LiteratureIngestEnrichmentOutcomeDto,
  LiteratureIngestPaperDto,
  LiteratureIngestRequestDto,
  LiteratureIngestResultDto,
  LogicalNotePayloadDto,
  MetadataLookupRequestDto,
  MetadataLookupResultDto,
  MetadataTranslationEvidenceDto,
  NavigationSelectionInputDto,
  NavigationResult,
  NavigationLibraryViewRef,
  ReaderLocation,
  NoteDetailDto,
  NoteDetailResultDto,
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
  MutationEntityObservationDto,
  MutationItemResultDto,
  MutationOperation,
  MutationOperationObservation,
  MutationPlanByOperation,
  MutationPreviewOperation,
  MutationPreviewRequestByOperation,
  MutationPreviewResult,
  MutationRequestByOperation,
  MutationResultByOperation,
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
  ManagedNoteWriteRequestDto,
  ManagedNoteWriteResultDto,
  ManagedNoteDetailDto,
  ManagedNoteKind,
  LiteratureDigestUpsertRequestDto,
  LiteratureReferencesUpsertRequestDto,
  LiteratureCitationAnalysisUpsertRequestDto,
  LiteratureScoreUpsertRequestDto,
  LiteratureArtifactApplyAnalysisResultDto,
  LiteratureArtifactUpsertResultDto,
  PreparedNoteImageRef,
  StatusTagTransitionRequestDto,
  StatusTagTransitionResultDto,
  TrashSetItemsStateRequest,
  TrashSetItemsStateResultDto,
  WorkflowCallControl,
  WorkflowHostMutationReceiptOperation,
  WorkflowBibliographyOwner,
  WorkflowHostCreatorDto as ZoteroHostMetadataCreatorDto,
} from "../workflows/types";
import {
  attachReferencesBasis,
  validateCitationAgainstReferences,
  validateCitationAnalysisArtifact,
  validateSourceReferenceArtifact,
  type CitationAnalysisArtifact,
  type SourceReferenceArtifact,
} from "../../packages/synthesis-contracts/src/sourceReferenceArtifact";
import { renderCitationAnalysisMarkdown } from "../../packages/synthesis-application/src/referenceProjection";
import {
  validateLiteratureScoreArtifact,
  type LiteratureScoreArtifact,
} from "../../packages/synthesis-contracts/src/literatureArtifacts";
import {
  registerZoteroManagedNoteLocalControl,
  inspectManagedNote,
  managedArtifactContent,
  managedArtifactTitle,
  managedMarkdownPayload,
  MANAGED_NOTE_PAYLOAD_TYPES,
  MANAGED_NOTE_RESULT_LIMIT,
  readManagedNoteDetail,
  finalizeManagedNoteDetail,
  transferPayloadValueFromBlock,
  deriveCitationHealth,
  readLegacyManagedNoteForMigration,
  managedNotePayloadSemanticHash,
  type LegacyMigrationCleanupPlan,
  ManagedNoteOwnerError,
  type ManagedParentSetSemanticInput,
} from "./zoteroHost/zoteroManagedNotes";
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
  MUTATION_EXECUTE_INPUT_SCHEMA,
  MUTATION_PREVIEW_INPUT_SCHEMA,
} from "../schemas/zoteroHostMutationSchemas";
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
  executeReservedMutation,
  getMutationOperation,
  lookupReservedMutation,
  MutationAuthorityAdmissionError,
  MutationAuthorityExecutionError,
  resetMutationAuthorityRuntimeForTests,
  type ZoteroHostMutationCallerScope,
} from "./zoteroHostMutationAuthority";
import {
  createZoteroHostPreparedFiles,
  type PreparedStoredAttachment,
  type ResolvedPreparedStoredAttachment,
  type ZoteroHostPreparedFiles,
} from "./zoteroHost/zoteroHostPreparedFiles";
export type { PreparedStoredAttachment } from "./zoteroHost/zoteroHostPreparedFiles";
import {
  copyRuntimeFile,
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  readRuntimeBytes,
  removeRuntimePath,
  statRuntimePathStrict,
  runtimePathExists,
  writeRuntimeBytes,
} from "./runtimePersistence";
import {
  createWorkflowStoredAttachmentStager,
  WorkflowStoredAttachmentInputError,
} from "../workflows/workflowStoredAttachmentImport";
import { joinPath } from "../utils/path";
import {
  nativeMutations,
  type StoredAttachmentMetadata,
} from "./zoteroHost/zoteroHostNativeMutations";
import { brokerMutationPrimitives } from "./zoteroHost/zoteroHostBrokerPrimitives";
import {
  executeHostTrashMutation,
  prepareHostTrashMutation,
  type PreparedHostTrashMutation,
} from "./zoteroHost/zoteroHostTrash";
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
  errors?: ZoteroHostCapabilityIssue[];
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
  errors?: ZoteroHostCapabilityIssue[];
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

export type ZoteroHostReaderLocation = ReaderLocation;

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

export type ZoteroHostCapabilityIssue = {
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

type ManagedArtifactDiagnosticCode =
  | "invalid_artifact"
  | "legacy_artifact_requires_migration";

/**
 * Managed-artifact diagnostics are semantic reader outcomes. They are kept
 * separate from the eleven-code Workflow Host transport taxonomy so callers
 * can classify a legacy/corrupt note without exposing a native exception or
 * pretending that it is an ordinary read failure.
 */
class ZoteroManagedArtifactDiagnostic extends Error {
  readonly retryable: boolean;

  constructor(
    readonly code: ManagedArtifactDiagnosticCode,
    message: string,
    readonly details: JsonObject = {},
    retryable = false,
  ) {
    super(message);
    this.name = "ZoteroManagedArtifactDiagnostic";
    this.retryable = retryable;
  }
}

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
    focusZotero(control?: WorkflowCallControl): Promise<NavigationResult>;
    selectLibraryView(
      view: NavigationLibraryViewRef,
      control?: WorkflowCallControl,
    ): Promise<NavigationResult>;
    selectCollection(
      ref: ZoteroHostCollectionRefInput,
      control?: WorkflowCallControl,
    ): Promise<NavigationResult>;
    selectSavedSearch(
      ref: PortableSavedSearchRef,
      control?: WorkflowCallControl,
    ): Promise<NavigationResult>;
    revealItems(
      input: NavigationSelectionInputDto,
      control?: WorkflowCallControl,
    ): Promise<NavigationResult>;
    openItem(
      ref: ZoteroHostItemRefInput,
      control?: WorkflowCallControl,
    ): Promise<NavigationResult>;
    openReaderLocation(
      input: ReaderLocation,
      control?: WorkflowCallControl,
    ): Promise<NavigationResult>;
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
    ): Promise<NoteDetailResultDto>;
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
    getOperation(
      request: { operationId: string },
      scope: ZoteroHostMutationCallerScope,
    ): Promise<MutationOperationObservation>;
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
  readonly managedNotes: {
    writeCustom(
      request: ManagedNoteWriteRequestDto,
      scope: ZoteroHostMutationCallerScope,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<ManagedNoteWriteResultDto>>;
    writeConversation(
      request: ManagedNoteWriteRequestDto,
      scope: ZoteroHostMutationCallerScope,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<ManagedNoteWriteResultDto>>;
  };
  readonly literatureArtifacts: {
    upsertDigest(
      request: LiteratureDigestUpsertRequestDto,
      scope: ZoteroHostMutationCallerScope,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<LiteratureArtifactUpsertResultDto>>;
    upsertReferences(
      request: LiteratureReferencesUpsertRequestDto,
      scope: ZoteroHostMutationCallerScope,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<LiteratureArtifactUpsertResultDto>>;
    upsertCitationAnalysis(
      request: LiteratureCitationAnalysisUpsertRequestDto,
      scope: ZoteroHostMutationCallerScope,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<LiteratureArtifactUpsertResultDto>>;
    upsertScore(
      request: LiteratureScoreUpsertRequestDto,
      scope: ZoteroHostMutationCallerScope,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<LiteratureArtifactUpsertResultDto>>;
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

type ZoteroHostAttachmentMutationPrimitives = Readonly<{
  createStoredFile?: (
    request: AttachmentCreateRequestDto,
    parent: Zotero.Item | null,
  ) => Promise<Zotero.Item>;
  replaceFile?: (
    request: AttachmentReplaceFileRequestDto,
    attachment: Zotero.Item,
  ) => Promise<Zotero.Item>;
  cleanupPreparedFile?: () => Promise<void>;
}>;

declare const preparedCanonicalMutationBrand: unique symbol;

/**
 * Process-local authority for a previously scanned canonical mutation. It has
 * no serializable representation and is only meaningful to its originating
 * Broker control.
 */
export type PreparedCanonicalMutation<K extends MutationOperation> = Readonly<{
  readonly [preparedCanonicalMutationBrand]: K;
}>;

export type DeferredPreparedStoredAttachment = Readonly<{
  prepare(control?: WorkflowCallControl): Promise<PreparedStoredAttachment>;
}>;

export type BrokerTrustedMutationResources = Readonly<{
  deferredStoredAttachment?: DeferredPreparedStoredAttachment;
  preparedFiles?: ZoteroHostPreparedFiles;
}>;

export type PreparedCanonicalMutationResult<K extends MutationOperation> =
  | Readonly<{
      state: "settled";
      result: MutationExecutionResult<MutationResultByOperation[K]>;
    }>
  | Readonly<{
      state: "prepared";
      preview: MutationPreviewResult<MutationPlanByOperation[K]>;
      prepared: PreparedCanonicalMutation<K>;
    }>;

export type ZoteroHostCanonicalMutationControl = Readonly<{
  prepare<K extends MutationOperation>(args: {
    input: MutationRequestByOperation[K];
    scope: ZoteroHostMutationCallerScope;
    resources?: BrokerTrustedMutationResources;
    control?: WorkflowCallControl;
  }): Promise<PreparedCanonicalMutationResult<K>>;
  execute<K extends MutationOperation>(args: {
    input: MutationRequestByOperation[K];
    scope: ZoteroHostMutationCallerScope;
    prepared: PreparedCanonicalMutation<K>;
    control?: WorkflowCallControl;
    onPreparedFileOwnershipTransferred?: () => void;
  }): Promise<MutationExecutionResult<MutationResultByOperation[K]>>;
}>;

type PreparedCanonicalMutationRecord = Readonly<{
  operation: MutationOperation;
  scope: string;
  semanticDigest: string;
  observations: MutationEntityObservationDto[];
  observationDigest: string;
  planDigest: string;
  destructivePrepared?: LegacyDestructivePreparedMutation;
  trashPrepared?: PreparedHostTrashMutation;
  ingestPrepared?: CanonicalLiteratureIngestPrepared;
  expiresAt: number;
  deferredStoredAttachment?: DeferredPreparedStoredAttachment;
  preparedStoredAttachment?: PreparedStoredAttachment;
  preparedFileSnapshot?: PreparedStoredAttachment["snapshot"];
  preparedFiles?: ZoteroHostPreparedFiles;
}>;

const canonicalMutationControls = new WeakMap<
  ZoteroHostCapabilityBroker,
  ZoteroHostCanonicalMutationControl
>();

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
  kind: "item" | "note" | "collection" | "saved-search",
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
  if (typeof item.isNote === "function" && item.isNote()) return "note";
  if (typeof item.isAttachment === "function" && item.isAttachment())
    return "attachment";
  const annotation =
    typeof (item as any).isAnnotation === "function"
      ? (item as any).isAnnotation()
      : Boolean((item as any).isAnnotation);
  if (annotation || String(item.itemType) === "annotation") {
    return "annotation";
  }
  const regular =
    typeof item.isRegularItem === "function"
      ? item.isRegularItem()
      : (item as any).isRegularItem;
  if (regular !== false) return "regular";
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
  if (typeof html !== "string" || html.length > NOTE_PAYLOAD_MAX_BYTES) {
    throw capabilityError(
      "resource_limited",
      "note content exceeds the limit",
      {
        resource: "characters",
        limit: NOTE_PAYLOAD_MAX_BYTES,
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

function childError(code: string, error: unknown): ZoteroHostCapabilityIssue {
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
  const note =
    typeof item.isNote === "function"
      ? item.isNote()
      : Boolean((item as any).isNote);
  const attachment =
    typeof item.isAttachment === "function"
      ? item.isAttachment()
      : Boolean((item as any).isAttachment);
  const regular =
    typeof item.isRegularItem === "function"
      ? item.isRegularItem()
      : !note && !attachment;
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

/**
 * Metadata curation may carry a portable field set that spans item types. A
 * field unknown to Zotero is invalid input; a known field that the current
 * item type cannot store is simply outside this item's writable projection.
 * Keep that distinction here so preview, preflight, and the native write all
 * derive the same effective patch.
 */
function applicableMetadataFieldPatch(
  item: Zotero.Item,
  fields: Record<string, string | null>,
) {
  const zotero = resolveZotero();
  const applicable: Record<string, string | null> = {};
  for (const [field, value] of Object.entries(fields)) {
    const fieldName = trimText(field);
    if (!fieldName) throw new Error("field name must be non-empty");
    if (!zotero.ItemFields?.getID) {
      applicable[fieldName] = value;
      continue;
    }
    const fieldID = zotero.ItemFields.getID(fieldName);
    if (!fieldID) throw new Error(`Invalid field: ${fieldName}`);
    const itemTypeID =
      (item as unknown as { itemTypeID?: number }).itemTypeID ||
      zotero.ItemTypes?.getID?.(item.itemType);
    if (!itemTypeID) throw new Error(`Invalid item type: ${item.itemType}`);
    if (isValidFieldForItemType(Number(fieldID), Number(itemTypeID))) {
      applicable[fieldName] = value;
    }
  }
  return applicable;
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

function normalizeNoteContentInput(
  input: NoteContentInput,
  options: { allowManagedMarkers?: boolean } = {},
) {
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
  if (
    !options.allowManagedMarkers &&
    /data-zs-(?:payload|note-kind|payload-anchor)\s*=/iu.test(value)
  ) {
    throw capabilityError(
      "invalid_request",
      "ordinary note content uses a reserved managed marker",
      { reason: "unsupported_value", field: "content.value" },
    );
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

type NoteCreateDomainRequest = Omit<NoteCreateRequestDto, "operationId"> & {
  operationId?: string;
};

function resolveNoteCreateRequest(request: NoteCreateDomainRequest) {
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

function assertManagedPayloadImageBudget(args: {
  payload: LogicalNotePayloadDto;
  noteId?: unknown;
  noteKey?: unknown;
  parentId?: unknown;
}) {
  const envelope = buildWorkbenchPayloadEnvelope({
    noteId: args.noteId || null,
    noteKey: args.noteKey || "",
    parentId: args.parentId || null,
    noteKind: args.payload.noteKind,
    payloadType: args.payload.payloadType,
    schemaVersion: args.payload.schemaVersion,
    format: args.payload.format,
    value: args.payload.value,
  });
  try {
    buildWorkbenchPayloadImageBytes(envelope);
  } catch (error) {
    if (
      error instanceof ZoteroNotePayloadResourceLimitError ||
      /exceed(?:s|ed)/iu.test(error instanceof Error ? error.message : "")
    ) {
      throw capabilityError(
        "resource_limited",
        "managed note payload exceeds the Broker limit",
        {
          resource: "bytes",
          limit: NOTE_PAYLOAD_MAX_BYTES,
        },
      );
    }
    throw error;
  }
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

function stripPayloadImageSlots(
  noteContent: unknown,
  payloadTypes: ReadonlySet<string>,
  declaredSlots: ReadonlySet<string>,
) {
  return String(noteContent || "").replace(/<img\b[^>]*>/giu, (tag) => {
    const payloadType = tag.match(
      /\bdata-zs-payload-anchor\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/iu,
    );
    const slot = tag.match(
      /\bdata-zotero-agents-image-slot\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/iu,
    );
    const type = String(
      payloadType?.[1] || payloadType?.[2] || payloadType?.[3] || "",
    ).trim();
    const imageSlot = String(slot?.[1] || slot?.[2] || slot?.[3] || "").trim();
    if (
      !type ||
      !imageSlot ||
      !payloadTypes.has(type) ||
      (declaredSlots.size > 0 && !declaredSlots.has(`${type}\n${imageSlot}`))
    ) {
      return tag;
    }
    return tag.replace(
      /\sdata-zotero-agents-image-slot\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/iu,
      "",
    );
  });
}

function payloadImageSlotKeys(
  noteContent: unknown,
  payloadTypes: ReadonlySet<string>,
) {
  const keys = new Set<string>();
  for (const tag of String(noteContent || "").match(/<img\b[^>]*>/giu) || []) {
    const payloadTypeMatch = tag.match(
      /\bdata-zs-payload-anchor\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/iu,
    );
    const slotMatch = tag.match(
      /\bdata-zotero-agents-image-slot\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/iu,
    );
    const payloadType = String(
      payloadTypeMatch?.[1] ||
        payloadTypeMatch?.[2] ||
        payloadTypeMatch?.[3] ||
        "",
    ).trim();
    const slot = String(
      slotMatch?.[1] || slotMatch?.[2] || slotMatch?.[3] || "",
    ).trim();
    if (payloadTypes.has(payloadType) && slot) {
      keys.add(`${payloadType}\n${slot}`);
    }
  }
  return keys;
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

async function updateNoteContentDirect(
  note: Zotero.Item,
  content: string,
  options: {
    inNativeTransaction?: boolean;
    stagedPath?: string;
  } = {},
) {
  const target = note as unknown as {
    setNote?: (value: string) => void;
    save?: () => Promise<unknown>;
    saveTx?: () => Promise<unknown>;
  };
  target.setNote?.(content);
  if (options.inNativeTransaction) {
    if (typeof target.save !== "function") {
      throw new Error(
        "Zotero item save is unavailable inside a native transaction",
      );
    }
    await target.save();
  } else if (typeof target.saveTx === "function") {
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

function normalizeLiteratureIngestPaper(input: LiteratureIngestPaperDto) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("paper must be an object");
  }
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
  paper: ReturnType<typeof normalizeLiteratureIngestPaper>,
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
  paper: ReturnType<typeof normalizeLiteratureIngestPaper>,
  libraryID: number,
) {
  const item = new Zotero.Item(paper.itemType as any);
  (item as any).libraryID = libraryID;
  for (const [field, value] of Object.entries(paper.fields)) {
    setItemFieldIfPresent(item, field, value);
  }
  setItemCreators(item, paper.creators);
  await item.save();
  return item;
}

function optionalEnrichmentFailure(
  item: Zotero.Item,
  code: string,
  fallbackMessage: string,
  error: unknown,
) {
  const status =
    error instanceof MutationAuthorityExecutionError
      ? error.status
      : nativeMutations.attachmentFailureStatus(error);
  if (status === "unknown" || status === "repair_required") {
    if (error instanceof MutationAuthorityExecutionError) throw error;
    const itemRef = canonicalItemRef(item);
    throw new MutationAuthorityExecutionError(
      status,
      "execution_failed",
      status === "repair_required" ? "cleanup" : "commit",
      status === "repair_required" ? "manual_repair" : "reconcile",
      {
        phase: status === "repair_required" ? "cleanup" : "commit",
        recovery: status === "repair_required" ? "manual_repair" : "reconcile",
      },
      error instanceof Error ? error.message : fallbackMessage,
      [{ kind: "item", ref: itemRef }],
      status === "repair_required" ? [{ kind: "item", ref: itemRef }] : [],
    );
  }
  return {
    status: "failed" as const,
    attachment: undefined,
    error: {
      code,
      message: error instanceof Error ? error.message : fallbackMessage,
    },
  };
}

function createBrokerPreparedStoredAttachmentFiles(): ZoteroHostPreparedFiles {
  const validateStoredSource = async (path: string) => {
    const stat = await statRuntimePathStrict(path).catch(() => null);
    if (!stat?.exists || stat.isDir) {
      throw new WorkflowStoredAttachmentInputError(
        "Stored attachment source must be a regular file",
      );
    }
    return { sizeBytes: stat.size };
  };
  const stageStoredAttachmentSources = createWorkflowStoredAttachmentStager({
    getStagingRoot: () =>
      joinPath(
        getRuntimePersistencePaths().tmpDir,
        "workflow-attachment-import",
      ),
    validateSource: validateStoredSource,
    ensureDirectory: ensureRuntimeDirectory,
    copyFile: (sourcePath, targetPath) =>
      copyRuntimeFile({ sourcePath, targetPath }).then(() => undefined),
    removePath: removeRuntimePath,
  });
  return createZoteroHostPreparedFiles({
    stageStoredAttachmentSources,
    readBytes: readRuntimeBytes,
  });
}

function storedUrlFallbackFilename(contentType: string | undefined) {
  switch (
    String(contentType || "")
      .trim()
      .toLowerCase()
  ) {
    case "application/pdf":
      return "download.pdf";
    case "text/html":
      return "download.html";
    case "text/plain":
      return "download.txt";
    case "application/json":
      return "download.json";
    case "text/markdown":
      return "download.md";
    default:
      return "download";
  }
}

async function importDownloadedStoredUrlAttachment(args: {
  url: string;
  fallbackFilename: string;
  referrer?: string;
  parent: Zotero.Item | null;
  libraryId: number;
  metadata?: StoredAttachmentMetadata;
  control?: WorkflowCallControl;
  beforeEffect?: CanonicalMutationEffectGuard;
  beforeFirstEffect?: () => Promise<void>;
  writtenEntities?: readonly MutationEntityRef[];
}): Promise<Zotero.Item> {
  const downloaded =
    await nativeMutations.attachments.downloadStoredUrlToManagedStaging({
      url: args.url,
      referrer: args.referrer,
      fallbackFilename: args.fallbackFilename,
    });
  const files = createBrokerPreparedStoredAttachmentFiles();
  let downloadedCleanupAttempted = false;
  const cleanupDownloaded = async () => {
    if (downloadedCleanupAttempted) return;
    downloadedCleanupAttempted = true;
    await downloaded.cleanup();
  };
  const cleanupAll = async () => {
    let cleanupError: unknown;
    try {
      await cleanupDownloaded();
    } catch (error) {
      cleanupError = error;
    }
    try {
      await files.dispose();
    } catch (error) {
      if (cleanupError === undefined) cleanupError = error;
    }
    if (cleanupError !== undefined) throw cleanupError;
  };
  return withPreparedFileCleanup(cleanupAll, async () => {
    const prepared = await files.prepareStoredAttachment({
      path: downloaded.path,
      targetFilename: args.fallbackFilename,
    });
    await cleanupDownloaded();
    const resolved = await files.resolveStoredAttachment(prepared);
    await args.beforeFirstEffect?.();
    return nativeMutations.attachments.importStoredAttachment({
      prepared: resolved,
      parent: args.parent,
      libraryId: args.libraryId,
      metadata: {
        ...args.metadata,
        originalUrl: args.metadata?.originalUrl || args.url,
      },
      admit: (work, phase = "effect") =>
        withZoteroHostSlice(args.control, async () => {
          await args.beforeEffect?.(phase);
          return work();
        }),
      afterImport: () =>
        args.beforeEffect?.markWritten(args.writtenEntities || []),
      afterMetadataSave: () =>
        args.beforeEffect?.markWritten(args.writtenEntities || []),
    });
  });
}

async function attachPdfBestEffort(
  item: Zotero.Item,
  paper: ReturnType<typeof normalizeLiteratureIngestPaper>,
  control?: WorkflowCallControl,
  beforeEffect?: CanonicalMutationEffectGuard,
  beforeFirstEffect?: () => Promise<void>,
) {
  if (!paper.pdfUrl) {
    return {
      status: "skipped" as const,
      attachment: undefined,
      error: undefined,
    };
  }
  try {
    const attachment = await importDownloadedStoredUrlAttachment({
      url: paper.pdfUrl,
      fallbackFilename: "full-text.pdf",
      referrer: paper.landingUrl || undefined,
      parent: item,
      libraryId: normalizeLibraryId((item as any).libraryID),
      metadata: {
        title: paper.title ? `${paper.title} PDF` : "Full Text PDF",
        contentType: "application/pdf",
        originalUrl: paper.pdfUrl,
      },
      control,
      beforeEffect,
      beforeFirstEffect,
      writtenEntities: [{ kind: "item", ref: canonicalItemRef(item) }],
    });
    return {
      status: "attached" as const,
      attachment: await withZoteroHostSlice(control, async () => {
        await beforeEffect?.("read");
        return serializeAttachment(attachment);
      }),
      error: undefined,
    };
  } catch (error) {
    return optionalEnrichmentFailure(
      item,
      "pdf_attachment_failed",
      "PDF attachment import failed",
      error,
    );
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
  const attachmentIds = item.getAttachments?.();
  if (!Array.isArray(attachmentIds)) {
    throw new Error("PDF attachment membership is unavailable");
  }
  for (const id of attachmentIds) {
    const attachment = resolveZotero().Items.get(id as number);
    if (!attachment) {
      throw new Error("PDF attachment membership could not be resolved");
    }
    if (isPdfAttachment(attachment)) {
      return true;
    }
  }
  return false;
}

async function attachLandingUrlWhenMissingPdf(
  item: Zotero.Item,
  paper: ReturnType<typeof normalizeLiteratureIngestPaper>,
  hasPdfAttachment: boolean,
  control?: WorkflowCallControl,
  beforeEffect?: CanonicalMutationEffectGuard,
  beforeFirstEffect?: () => Promise<void>,
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
    await beforeFirstEffect?.();
    const attachment =
      await nativeMutations.attachments.createLinkedUrlAttachment({
        parent: item,
        libraryId: normalizeLibraryId((item as any).libraryID),
        url: paper.landingUrl,
        title: paper.title
          ? `${paper.title} Landing Page`
          : "Literature Landing Page",
        contentType: "text/html",
        admit: (work, phase = "effect") =>
          withZoteroHostSlice(control, async () => {
            await beforeEffect?.(phase);
            return work();
          }),
      });
    beforeEffect?.markWritten([{ kind: "item", ref: canonicalItemRef(item) }]);
    return {
      status: "attached" as const,
      attachment: await withZoteroHostSlice(control, async () => {
        await beforeEffect?.("read");
        return serializeAttachment(attachment);
      }),
      error: undefined,
    };
  } catch (error) {
    return optionalEnrichmentFailure(
      item,
      "landing_url_attachment_failed",
      "Landing-page attachment failed",
      error,
    );
  }
}

type CanonicalLiteratureIngestPrepared = Readonly<{
  paper: ReturnType<typeof normalizeLiteratureIngestPaper>;
  collectionRef: ZoteroHostCollectionRefInput;
  collectionVersion: ReturnType<typeof canonicalCollectionVersion>;
  existing: Readonly<{
    ref: ZoteroHostItemRefInput;
    version: ReturnType<typeof canonicalItemVersion>;
  }> | null;
  observations: MutationEntityObservationDto[];
}>;

function normalizeCanonicalLiteratureIngestPaper(
  paper: LiteratureIngestPaperDto,
) {
  return normalizeLiteratureIngestPaper(paper);
}

async function findCanonicalIngestIdentityMatch(
  paper: ReturnType<typeof normalizeLiteratureIngestPaper>,
  libraryId: number,
  control: WorkflowCallControl = {},
) {
  const query = await buildCanonicalIngestIdentityQuery(
    paper,
    libraryId,
    control,
  );
  return withZoteroHostSlice(control, () =>
    findCanonicalIngestIdentityMatchInHost(paper, libraryId, query),
  );
}

type CanonicalIngestIdentityQuery = Readonly<{
  sql: string;
  params: unknown[];
}>;

async function buildCanonicalIngestIdentityQuery(
  paper: ReturnType<typeof normalizeLiteratureIngestPaper>,
  libraryId: number,
  control: WorkflowCallControl = {},
) {
  const Search = await withZoteroHostSlice(
    control,
    () =>
      (
        resolveZotero() as unknown as {
          Search?: new () => {
            libraryID?: number;
            addCondition?: (
              field: string,
              operator: string,
              value: string,
            ) => void;
            getSQL?: () => Promise<unknown>;
            getSQLParams?: () => Promise<unknown>;
          };
        }
      ).Search,
  );
  if (typeof Search !== "function") {
    throw new MutationAuthorityExecutionError(
      "failed",
      "unavailable",
      "read",
      "retry_same_operation",
      { reason: "capability", kind: "item" },
      "bounded Zotero identity search is unavailable",
    );
  }
  const candidates = [
    paper.doi ? ["DOI", "is", paper.doi] : null,
    paper.isbn ? ["ISBN", "is", paper.isbn] : null,
    paper.landingUrl ? ["url", "is", paper.landingUrl] : null,
    paper.arxiv ? ["extra", "contains", paper.arxiv] : null,
    paper.pmid ? ["extra", "contains", paper.pmid] : null,
    paper.title ? ["title", "is", paper.title] : null,
  ].filter((entry): entry is [string, string, string] => Boolean(entry));
  const queries: string[] = [];
  const params: unknown[] = [];
  for (const [field, operator, value] of candidates) {
    const compiled = await withZoteroHostSlice(control, async () => {
      const search = new Search();
      if (
        typeof search.addCondition !== "function" ||
        typeof search.getSQL !== "function" ||
        typeof search.getSQLParams !== "function"
      ) {
        throw new MutationAuthorityExecutionError(
          "failed",
          "unavailable",
          "read",
          "retry_same_operation",
          { reason: "capability", kind: "item" },
          "bounded Zotero identity search is unavailable",
        );
      }
      search.libraryID = libraryId;
      search.addCondition(field, operator, value);
      return {
        sql: await search.getSQL(),
        params: await search.getSQLParams(),
      };
    });
    if (
      typeof compiled.sql !== "string" ||
      !compiled.sql.trim() ||
      (compiled.params !== false && !Array.isArray(compiled.params))
    ) {
      throw new MutationAuthorityExecutionError(
        "failed",
        "execution_failed",
        "read",
        "retry_same_operation",
        { phase: "read", recovery: "retry_same_operation" },
        "bounded Zotero identity search returned an invalid query",
      );
    }
    queries.push(compiled.sql);
    if (Array.isArray(compiled.params)) params.push(...compiled.params);
  }
  return {
    sql: `SELECT itemID FROM (${queries.join(" UNION ")}) LIMIT ?`,
    params: [...params, 26],
  } satisfies CanonicalIngestIdentityQuery;
}

async function findCanonicalIngestIdentityMatchInHost(
  paper: ReturnType<typeof normalizeLiteratureIngestPaper>,
  libraryId: number,
  query: CanonicalIngestIdentityQuery,
) {
  const zotero = resolveZotero() as unknown as {
    DB?: {
      columnQueryAsync?: (
        sql: string,
        params: unknown[],
        options?: { noCache?: boolean },
      ) => Promise<unknown>;
    };
    Items: typeof Zotero.Items & {
      getAsync?: (ids: number[]) => Promise<Zotero.Item[]>;
    };
  };
  const columnQueryAsync = zotero.DB?.columnQueryAsync;
  if (typeof columnQueryAsync !== "function") {
    throw new MutationAuthorityExecutionError(
      "failed",
      "unavailable",
      "read",
      "retry_same_operation",
      { reason: "capability", kind: "item" },
      "bounded Zotero identity query is unavailable",
    );
  }
  const ids = await columnQueryAsync.call(zotero.DB, query.sql, query.params, {
    noCache: true,
  });
  if (!Array.isArray(ids)) {
    throw new MutationAuthorityExecutionError(
      "failed",
      "execution_failed",
      "read",
      "retry_same_operation",
      { phase: "read", recovery: "retry_same_operation" },
      "bounded Zotero identity search returned an invalid result",
    );
  }
  if (ids.length > 25) {
    throw new MutationAuthorityExecutionError(
      "failed",
      "resource_limited",
      "read",
      "refresh_and_retry_new_operation",
      { resource: "items", limit: 25, observed: ids.length },
      "bounded Zotero identity search returned too many candidates",
    );
  }
  if (typeof zotero.Items.getAsync !== "function") {
    throw new MutationAuthorityExecutionError(
      "failed",
      "unavailable",
      "read",
      "retry_same_operation",
      { reason: "capability", kind: "item" },
      "bounded Zotero identity hydration is unavailable",
    );
  }
  const items = await zotero.Items.getAsync(ids.map(Number));
  if (
    !Array.isArray(items) ||
    items.length !== ids.length ||
    ids.some((id) => !items.some((item) => Number(item.id) === Number(id)))
  ) {
    throw new MutationAuthorityExecutionError(
      "failed",
      "execution_failed",
      "read",
      "retry_same_operation",
      { phase: "read", recovery: "retry_same_operation" },
      "bounded Zotero identity hydration was incomplete",
    );
  }
  const matches = new Map<
    string,
    NonNullable<CanonicalLiteratureIngestPrepared["existing"]>
  >();
  for (const item of items) {
    if (
      normalizeLibraryId(item.libraryID) === libraryId &&
      !item.isNote?.() &&
      !item.isAttachment?.() &&
      !(item as { isAnnotation?: () => boolean }).isAnnotation?.() &&
      !(item as { deleted?: unknown }).deleted &&
      itemMatchesIngestPaper(item, paper)
    ) {
      const match = {
        ref: canonicalItemRef(item),
        version: canonicalItemVersion(item),
      };
      matches.set(`${match.ref.libraryId}:${match.ref.key}`, match);
    }
  }
  if (matches.size > 1) {
    throw new MutationAuthorityExecutionError(
      "failed",
      "conflict",
      "read",
      "refresh_and_retry_new_operation",
      { reason: "ambiguous_state", kind: "item" },
      "literature identity resolves to multiple items",
    );
  }
  return matches.values().next().value;
}

async function prepareCanonicalLiteratureIngest(
  request: Pick<LiteratureIngestRequestDto, "collectionRef" | "paper">,
  control: WorkflowCallControl = {},
): Promise<CanonicalLiteratureIngestPrepared> {
  const collectionRef = canonicalCollectionRef(request.collectionRef);
  const collectionFacts = await withZoteroHostSlice(control, () => {
    const collection = resolveCollection(collectionRef);
    if (!collection) throw notFoundError("collection", collectionRef);
    return {
      version: canonicalCollectionVersion(collection),
      libraryId: normalizeLibraryId(
        (collection as { libraryID?: unknown }).libraryID,
      ),
    };
  });
  let paper: ReturnType<typeof normalizeLiteratureIngestPaper>;
  try {
    paper = normalizeCanonicalLiteratureIngestPaper(request.paper);
  } catch (error) {
    if (error instanceof MutationAuthorityExecutionError) throw error;
    throw new MutationAuthorityExecutionError(
      "failed",
      "invalid_request",
      "validation",
      "refresh_and_retry_new_operation",
      { reason: "invalid_schema", operation: "literature.ingest" },
      error instanceof Error
        ? error.message
        : "literature ingest request is invalid",
    );
  }
  const existing = await findCanonicalIngestIdentityMatch(
    paper,
    collectionFacts.libraryId,
    control,
  );
  return {
    paper,
    collectionRef,
    collectionVersion: collectionFacts.version,
    existing: existing || null,
    observations: [
      {
        entity: { kind: "collection", ref: collectionRef },
        version: collectionFacts.version,
      },
      ...(existing
        ? [
            {
              entity: { kind: "item" as const, ref: existing.ref },
              version: existing.version,
            },
          ]
        : []),
    ],
  };
}

async function revalidateCanonicalLiteratureIngest(
  prepared: CanonicalLiteratureIngestPrepared,
  request: Pick<LiteratureIngestRequestDto, "collectionRef" | "paper">,
  control: WorkflowCallControl = {},
) {
  const current = await prepareCanonicalLiteratureIngest(request, control);
  if (
    hashSynthesisContractCanonicalJson(current.observations) !==
      hashSynthesisContractCanonicalJson(prepared.observations) ||
    hashSynthesisContractCanonicalJson(current.paper) !==
      hashSynthesisContractCanonicalJson(prepared.paper)
  ) {
    throw preparedMutationStaleError();
  }
}

async function executeCanonicalLiteratureIngest(
  request: LiteratureIngestRequestDto,
  scope: ZoteroHostMutationCallerScope,
  control?: WorkflowCallControl,
  trustedPrepared?: CanonicalLiteratureIngestPrepared,
  beforeEffect?: CanonicalMutationEffectGuard,
  semanticInput?: JsonValue,
): Promise<MutationExecutionResult<LiteratureIngestResultDto>> {
  const operationId = trimText(request.operationId, 129);
  if (!operationId || operationId.length > 128) {
    throw capabilityError("invalid_request", "operationId is invalid", {
      reason: "invalid_value",
      field: "operationId",
      operation: request.operation,
    });
  }
  let prepared = trustedPrepared;
  try {
    return await executeReservedMutation<LiteratureIngestResultDto>({
      scope,
      operationId,
      operation: request.operation,
      semanticInput: semanticInput || (request as unknown as JsonValue),
      control,
      async preflight() {
        if (!prepared) {
          prepared = await prepareCanonicalLiteratureIngest(request, control);
        }
      },
      async execute() {
        if (!prepared) throw preparedMutationStaleError();
        let firstEffectChecked = false;
        const beforeFirstEffect = async () => {
          if (firstEffectChecked) return;
          if (beforeEffect) await beforeEffect("read");
          else
            await revalidateCanonicalLiteratureIngest(
              prepared!,
              request,
              control,
            );
          firstEffectChecked = true;
        };
        const collection = await withZoteroHostSlice(control, () => {
          const value = resolveCollection(prepared!.collectionRef);
          if (!value)
            throw notFoundError("collection", prepared!.collectionRef);
          return value;
        });
        let item: Zotero.Item;
        let created = false;
        let membershipAdded = false;
        let before: ReturnType<typeof canonicalItemVersion> | null = null;
        try {
          await beforeFirstEffect();
          const identityQuery = await buildCanonicalIngestIdentityQuery(
            prepared.paper,
            normalizeLibraryId(
              (collection as { libraryID?: unknown }).libraryID,
            ),
            control,
          );
          await withZoteroHostSlice(control, async () => {
            const db = (
              resolveZotero() as unknown as {
                DB?: {
                  executeTransaction?: <T>(run: () => Promise<T>) => Promise<T>;
                };
              }
            ).DB;
            if (typeof db?.executeTransaction !== "function") {
              throw new MutationAuthorityExecutionError(
                "failed",
                "unavailable",
                "read",
                "retry_same_operation",
                { reason: "capability", kind: "item" },
                "Zotero transaction support is unavailable",
              );
            }
            const finalIdentity = await db.executeTransaction(async () => {
              const current = await findCanonicalIngestIdentityMatchInHost(
                prepared!.paper,
                normalizeLibraryId(
                  (collection as { libraryID?: unknown }).libraryID,
                ),
                identityQuery,
              );
              if (
                hashSynthesisContractCanonicalJson(current || null) !==
                hashSynthesisContractCanonicalJson(prepared!.existing || null)
              ) {
                throw preparedMutationStaleError();
              }
              if (current) {
                return {
                  item: requireItem(current.ref, "existing literature item"),
                  created: false,
                };
              }
              await beforeEffect?.("effect");
              return {
                item: await createMetadataPaperItem(
                  prepared!.paper,
                  normalizeLibraryId(
                    (collection as { libraryID?: unknown }).libraryID,
                  ),
                ),
                created: true,
              };
            });
            item = finalIdentity.item;
            created = finalIdentity.created;
            before = prepared!.existing?.version || null;
            if (created) {
              beforeEffect?.markWritten([
                { kind: "item", ref: canonicalItemRef(item) },
              ]);
            }
          });
          const collectionId = Number((collection as { id?: unknown }).id);
          const isMember = await withZoteroHostSlice(control, () =>
            item.getCollections().includes(collectionId),
          );
          if (!isMember) {
            await beforeFirstEffect();
            await withZoteroHostSlice(control, async () => {
              await beforeEffect?.("effect");
              await brokerMutationPrimitives.collection.add(item, collection);
              beforeEffect?.markWritten([
                { kind: "item", ref: canonicalItemRef(item) },
                { kind: "collection", ref: prepared!.collectionRef },
              ]);
            });
            membershipAdded = true;
          }
          const confirmed = await withZoteroHostSlice(control, () =>
            item.getCollections().includes(collectionId),
          );
          if (!confirmed)
            throw new Error("required collection membership was not confirmed");
        } catch (primary) {
          if (
            primary instanceof MutationAuthorityExecutionError &&
            !created &&
            !membershipAdded
          ) {
            throw primary;
          }
          const residualRefs: MutationEntityRef[] = [];
          if (membershipAdded && !created) {
            try {
              await withZoteroHostSlice(control, () =>
                brokerMutationPrimitives.collection.remove(item!, collection),
              );
            } catch {
              residualRefs.push({ kind: "item", ref: canonicalItemRef(item!) });
            }
          }
          if (created) {
            try {
              await withZoteroHostSlice(control, () =>
                brokerMutationPrimitives.item.remove(item!),
              );
            } catch {
              residualRefs.push({ kind: "item", ref: canonicalItemRef(item!) });
            }
          }
          throw new MutationAuthorityExecutionError(
            residualRefs.length ? "repair_required" : "failed",
            "execution_failed",
            residualRefs.length ? "compensation" : "commit",
            residualRefs.length ? "manual_repair" : "retry_same_operation",
            {
              phase: residualRefs.length ? "cleanup" : "commit",
              recovery: residualRefs.length
                ? "manual_repair"
                : "retry_same_operation",
              residualCount: residualRefs.length,
            },
            primary instanceof Error
              ? primary.message
              : "literature core ingest failed",
            [],
            residualRefs,
          );
        }
        try {
          const enrichment: LiteratureIngestEnrichmentOutcomeDto[] = [];
          const pdf = await attachPdfBestEffort(
            item!,
            prepared!.paper,
            control,
            beforeEffect,
            beforeFirstEffect,
          );
          enrichment.push(
            pdf.status === "attached"
              ? { kind: "pdf", outcome: "attached" }
              : pdf.status === "failed"
                ? {
                    kind: "pdf",
                    outcome: "failed",
                    code: pdf.error?.code || "attachment_failed",
                  }
                : { kind: "pdf", outcome: "skipped" },
          );
          const hasPdf = await withZoteroHostSlice(control, () =>
            itemHasPdfAttachment(item!),
          );
          const landing = await attachLandingUrlWhenMissingPdf(
            item!,
            prepared!.paper,
            hasPdf,
            control,
            beforeEffect,
            beforeFirstEffect,
          );
          if (landing.status) {
            enrichment.push(
              landing.status === "attached"
                ? { kind: "landing", outcome: "attached" }
                : landing.status === "failed"
                  ? {
                      kind: "landing",
                      outcome: "failed",
                      code: landing.error?.code || "landing_attachment_failed",
                    }
                  : { kind: "landing", outcome: "skipped" },
            );
          }
          await beforeFirstEffect();
          return await withZoteroHostSlice(control, () => {
            const finalItem = requireItem(
              canonicalItemRef(item!),
              "ingested literature item",
            );
            const after = canonicalItemVersion(finalItem);
            return {
              outcome:
                created || membershipAdded
                  ? ("committed" as const)
                  : ("unchanged" as const),
              changes: [
                {
                  entity: {
                    kind: "item" as const,
                    ref: canonicalItemRef(finalItem),
                  },
                  effect: created
                    ? ("created" as const)
                    : membershipAdded
                      ? ("updated" as const)
                      : ("unchanged" as const),
                  before: created ? null : before,
                  after,
                },
              ],
              result: {
                item: canonicalMutationItemResult(finalItem),
                collectionRef: prepared!.collectionRef,
                itemOutcome: created
                  ? ("created" as const)
                  : ("existing" as const),
                collectionOutcome: membershipAdded
                  ? ("added" as const)
                  : ("already_present" as const),
                enrichment,
              },
            };
          });
        } catch (error) {
          if (error instanceof MutationAuthorityExecutionError) throw error;
          throw new MutationAuthorityExecutionError(
            "unknown",
            "execution_failed",
            "verification",
            "reconcile",
            { phase: "verification", recovery: "reconcile" },
            "Literature ingest completed its required effects but verification failed",
            [{ kind: "item", ref: canonicalItemRef(item!) }],
          );
        }
      },
    });
  } catch (error) {
    if (error instanceof MutationAuthorityAdmissionError)
      throw mutationAdmissionError(error);
    throw error;
  }
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

function migrationPayloadSourceFacts(
  blocks: ReadonlyArray<ZoteroNotePayloadBlock>,
) {
  return hashSynthesisContractCanonicalJson({
    blocks: blocks
      .map((block) => ({
        payloadType: block.payloadType,
        noteKind: block.noteKind,
        source: block.source,
        sourceStorage: block.sourceStorage,
        payloadStorageVersion: block.payloadStorageVersion,
        payloadHash: block.payloadHash,
        logicalPayloadHash: logicalPayloadHashFromBlock(block),
        attachmentKey: block.attachmentKey,
        attachmentId: block.attachmentId,
        encodedValueHash: hashSynthesisContractCanonicalJson(
          block.encodedValue,
        ),
        errors: block.errors,
      }))
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      ),
  });
}

function semanticPayloadHashFromBlock(block: ZoteroNotePayloadBlock) {
  return (
    managedNotePayloadSemanticHash(block.noteKind as ManagedNoteKind, block) ||
    ""
  );
}

function semanticPayloadHashFromPayload(payload: LogicalNotePayloadDto) {
  return (
    managedNotePayloadSemanticHash(payload.noteKind as ManagedNoteKind, {
      payloadType: payload.payloadType,
      noteKind: payload.noteKind,
      version: payload.schemaVersion,
      logicalSchemaVersion: payload.schemaVersion,
      encoding: "embedded-image-attachment",
      encodedValue: "",
      estimatedSize: 0,
      format: payload.format,
      payload: payload.value,
    }) || ""
  );
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
  beforeEffect?: CanonicalMutationEffectGuard,
  options: {
    inNativeTransaction?: boolean;
    stagedFile?: PreparedNativeAttachmentFile;
    /** Migration keeps legacy attachments until post-verification Trash. */
    deferLegacyAttachmentCleanup?: boolean;
  } = {},
) {
  const native = <T>(run: () => Promise<T> | T) =>
    options.inNativeTransaction
      ? Promise.resolve().then(run)
      : withZoteroHostSlice(control, run);
  let previousBlock = previous[0];
  if (previous.length > 1) {
    const embedded = previous.filter(
      (block) =>
        block.source === "embedded-image-attachment" &&
        block.payloadStorageVersion === 2,
    );
    const inline = previous.filter(
      (block) => block.source === "html-payload-block",
    );
    const embeddedKeys = new Set(
      embedded.map((block) => trimText(block.attachmentKey)).filter(Boolean),
    );
    const requestedSemanticHash = semanticPayloadHashFromPayload(payload);
    const inlineMatchesRequested = inline.some(
      (block) =>
        semanticPayloadHashFromBlock(block) === requestedSemanticHash &&
        requestedSemanticHash !== "",
    );
    // A content update writes the new inline payload before the old v2
    // attachment is replaced. Treat that pair as a pending replacement when
    // the inline view is exactly the requested semantic value. Two embedded
    // attachments, or an unrelated inline value, remain a conflict.
    if (
      embeddedKeys.size > 1 ||
      inline.length > 1 ||
      (!inlineMatchesRequested && embedded.length > 0)
    ) {
      throw new MutationAuthorityExecutionError(
        "failed",
        "conflict",
        "validation",
        "refresh_and_retry_new_operation",
        { reason: "ambiguous_state", kind: "note" },
        "note payload is ambiguous",
      );
    }
    previousBlock = embedded[0] || inline[0] || previous[0];
  }
  const requestedHash = canonicalLogicalNotePayloadHash(payload);
  if (
    previousBlock &&
    logicalPayloadHashFromBlock(previousBlock) === requestedHash
  ) {
    return {
      note,
      payload: canonicalPayloadSummary(previousBlock, note),
      outcome: "unchanged" as const,
      createdAttachment: null,
      removedAttachment: null,
      attachmentStoragePath: null,
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
  const bytes = options.stagedFile
    ? null
    : buildWorkbenchPayloadImageBytes(envelope);
  const zotero = resolveZotero();
  if (
    (!options.inNativeTransaction &&
      typeof zotero.Attachments?.importEmbeddedImage !== "function") ||
    (options.inNativeTransaction && !options.stagedFile)
  ) {
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
  let attachmentStoragePath = "";
  try {
    attachment = await native(async () => {
      await beforeEffect?.("effect");
      const imported = options.inNativeTransaction
        ? await importPreparedNoteImageInNativeTransaction(note, {
            preparedFile: options.stagedFile!,
          })
        : {
            attachment: await zotero.Attachments.importEmbeddedImage({
              blob: blobFromBytes(bytes!, "image/png"),
              parentItemID: note.id,
            }),
            storagePath: "",
          };
      attachmentStoragePath = imported.storagePath;
      beforeEffect?.markWritten([
        {
          kind: "item",
          ref: {
            libraryId: normalizeLibraryId(note.libraryID),
            key: trimText(note.key),
          },
        },
      ]);
      return imported.attachment;
    });
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
  const attachmentKey = await native(() => trimText(attachment?.key));
  const originalContent = await native(() => String(note.getNote?.() || ""));
  try {
    if (!attachmentKey) throw new Error("payload attachment has no key");
    await native(async () => {
      await beforeEffect?.("effect");
      await updateNoteContentDirect(
        note,
        appendPayloadAnchor(
          stripInlinePayloadForType(originalContent, payloadType),
          payloadType,
          attachmentKey,
        ),
        { inNativeTransaction: options.inNativeTransaction },
      );
      beforeEffect?.markWritten([
        {
          kind: "item",
          ref: {
            libraryId: normalizeLibraryId(note.libraryID),
            key: trimText(note.key),
          },
        },
      ]);
    });
  } catch (error) {
    if (attachmentStoragePath) {
      try {
        await removeRuntimePath(attachmentStoragePath);
      } catch {
        // The attachment compensation below remains the primary cleanup path.
      }
    }
    try {
      await native(() =>
        updateNoteContentDirect(note, originalContent, {
          inNativeTransaction: options.inNativeTransaction,
        }),
      );
    } catch {
      // Preserve the payload commit failure and continue attachment cleanup.
    }
    const attachmentRef = await native(() => ({
      kind: "item" as const,
      ref: {
        libraryId: normalizeLibraryId(attachment.libraryID),
        key: trimText(attachment.key),
      },
    }));
    let residualRefs: (typeof attachmentRef)[] = [];
    try {
      await native(() =>
        brokerMutationPrimitives.attachment.remove(attachment, {
          inNativeTransaction: options.inNativeTransaction,
        }),
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
  const old = previousBlock;
  if (old?.attachmentKey && old.attachmentKey !== attachmentKey) {
    const oldAttachment = await native(
      () =>
        zotero.Items.getByLibraryAndKey?.(
          normalizeLibraryId(
            (note as unknown as { libraryID?: unknown }).libraryID,
          ),
          old.attachmentKey!,
        ) || null,
    );
    if (oldAttachment) {
      const parentId = await native(
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
        if (options.deferLegacyAttachmentCleanup) {
          removedAttachment = oldAttachment;
        } else {
          try {
            await native(async () => {
              await beforeEffect?.("effect");
              return brokerMutationPrimitives.attachment.remove(
                oldAttachment!,
                {
                  inNativeTransaction: options.inNativeTransaction,
                },
              );
            });
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
    attachmentStoragePath: attachmentStoragePath || null,
  };
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
  beforeEffect?: CanonicalMutationEffectGuard,
  semanticInput?: JsonValue,
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
      semanticInput: semanticInput || (request as unknown as JsonValue),
      control,
      async preflight() {
        await withZoteroHostSlice(control, () => {
          if (collectionRefs.length) {
            for (const ref of collectionRefs) {
              if (!resolveCollection(ref))
                throw notFoundError("collection", ref);
            }
          }
          for (const ref of relatedRefs) requireItem(ref, "related item");
        });
      },
      async execute() {
        let created: Zotero.Item | null = null;
        try {
          created = await withZoteroHostSlice(control, async () => {
            await beforeEffect?.("effect");
            return brokerMutationPrimitives.item.create({
              itemType,
              libraryID: libraryId,
              fields,
            });
          });
          if (request.creators !== undefined) {
            await withZoteroHostSlice(control, () =>
              brokerMutationPrimitives.parent.updateMetadata(created!, {
                creators: request.creators,
              }),
            );
          }
          if (tags.length)
            await withZoteroHostSlice(control, () =>
              brokerMutationPrimitives.tag.add(created!, tags),
            );
          for (const collection of collections) {
            await withZoteroHostSlice(control, () =>
              brokerMutationPrimitives.collection.add(created!, collection),
            );
          }
          if (related.length)
            await withZoteroHostSlice(control, () =>
              brokerMutationPrimitives.parent.addRelated(created!, related),
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
              brokerMutationPrimitives.item.remove(created!),
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
  beforeEffect?: CanonicalMutationEffectGuard,
  semanticInput?: JsonValue,
): Promise<MutationExecutionResult<JsonObject>> {
  const normalized = {
    operation: "item.changeType" as const,
    operationId: trimText(request.operationId, 129),
    itemRef: canonicalItemRef(request.itemRef),
    targetItemType: trimText(request.targetItemType, 128),
    incompatibleData: request.incompatibleData,
  };
  if (
    !normalized.operationId ||
    normalized.operationId.length > 128 ||
    !normalized.targetItemType ||
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
      semanticInput: semanticInput || (request as unknown as JsonValue),
      control,
      async preflight() {
        await withZoteroHostSlice(control, () => {
          const basis = buildItemChangeTypePreview(normalized);
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
        });
      },
      async execute() {
        const basis = await withZoteroHostSlice(control, async () => {
          await beforeEffect?.("read");
          return buildItemChangeTypePreview(normalized);
        });
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
            await withZoteroHostSlice(control, async () => {
              await beforeEffect?.("effect");
              await brokerMutationPrimitives.parent.updateMetadata(item, {
                itemType: normalized.targetItemType,
                fields: basis.plan.resultFields,
                creators: basis.plan.resultCreators,
              });
              beforeEffect?.markWritten([
                { kind: "item", ref: normalized.itemRef },
              ]);
            });
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

type CanonicalRelatedMutationRequest =
  | Extract<MutationExecuteRequest, { operation: "item.addRelated" }>
  | Extract<MutationExecuteRequest, { operation: "item.removeRelated" }>;

type CanonicalRelatedMutationInput = Readonly<{
  operation: "item.addRelated" | "item.removeRelated";
  sourceRef: ZoteroHostItemRefInput;
  relatedRefs: ZoteroHostItemRefInput[];
}>;

type PreparedCanonicalRelatedMutation = CanonicalRelatedMutationInput &
  Readonly<{
    source: Zotero.Item;
    related: Zotero.Item[];
    before: ReturnType<typeof canonicalItemVersion>;
    current: string[];
  }>;

function isCanonicalRelatedMutationRequest(request: {
  operation?: unknown;
}): request is CanonicalRelatedMutationRequest {
  return (
    request.operation === "item.addRelated" ||
    request.operation === "item.removeRelated"
  );
}

function relatedMutationValidationError(
  operation: CanonicalRelatedMutationInput["operation"],
  reason: "invalid_value" | "invalid_combination",
  message: string,
  field?: string,
): never {
  throw capabilityError("invalid_request", message, {
    reason,
    operation,
    ...(field ? { field } : {}),
  });
}

function normalizeCanonicalRelatedMutationInput(
  request: Pick<
    CanonicalRelatedMutationInput,
    "operation" | "sourceRef" | "relatedRefs"
  >,
): CanonicalRelatedMutationInput {
  if (!Array.isArray(request.relatedRefs)) {
    throw capabilityError("invalid_request", "relatedRefs must be an array", {
      reason: "invalid_type",
      field: "relatedRefs",
      operation: request.operation,
    });
  }
  if (!request.relatedRefs.length) {
    throw capabilityError("invalid_request", "relatedRefs must not be empty", {
      reason: "missing_field",
      field: "relatedRefs",
      operation: request.operation,
    });
  }
  const relatedRefs = Array.from(
    new Map(
      request.relatedRefs
        .map(canonicalItemRef)
        .map((ref) => [`${ref.libraryId}\n${ref.key}`, ref] as const),
    ).values(),
  );
  if (relatedRefs.length > 100) {
    throw capabilityError(
      "resource_limited",
      "relatedRefs exceeds the target limit",
      { resource: "entries", limit: 100, observed: relatedRefs.length },
    );
  }
  return {
    operation: request.operation,
    sourceRef: canonicalItemRef(request.sourceRef),
    relatedRefs,
  };
}

function normalizeCanonicalRelatedMutationRequest(
  request: CanonicalRelatedMutationRequest,
): CanonicalRelatedMutationRequest {
  const normalized = normalizeCanonicalRelatedMutationInput(request);
  const operationId = trimText(request.operationId, 129);
  return normalized.operation === "item.addRelated"
    ? { ...normalized, operationId }
    : { ...normalized, operationId };
}

function prepareCanonicalRelatedMutation(
  input: CanonicalRelatedMutationInput,
): PreparedCanonicalRelatedMutation {
  const source = requireItem(input.sourceRef, "source item");
  if (canonicalItemState(source) !== "active") {
    relatedMutationValidationError(
      input.operation,
      "invalid_value",
      "source item is deleted or trashed",
      "sourceRef",
    );
  }
  const related = input.relatedRefs.map((relatedRef) => {
    if (
      input.sourceRef.libraryId === relatedRef.libraryId &&
      input.sourceRef.key === relatedRef.key
    ) {
      relatedMutationValidationError(
        input.operation,
        "invalid_combination",
        "related item endpoints must be distinct",
        "relatedRefs",
      );
    }
    if (input.sourceRef.libraryId !== relatedRef.libraryId) {
      relatedMutationValidationError(
        input.operation,
        "invalid_combination",
        "related item endpoints must belong to one library",
        "relatedRefs",
      );
    }
    const item = requireItem(relatedRef, "related item");
    if (canonicalItemState(item) !== "active") {
      relatedMutationValidationError(
        input.operation,
        "invalid_value",
        "related item is deleted or trashed",
        "relatedRefs",
      );
    }
    return item;
  });
  return {
    ...input,
    source,
    related,
    before: canonicalItemVersion(source),
    current: Array.isArray((source as { relatedItems?: unknown }).relatedItems)
      ? [...(source as { relatedItems: string[] }).relatedItems]
      : [],
  };
}

async function preflightOtherCanonicalMutationDomain(
  request: Exclude<
    MutationExecuteRequest,
    | { operation: "item.create" }
    | { operation: "item.updateMetadata" }
    | { operation: "item.changeType" }
    | { operation: "collection.remove" }
  >,
  control?: WorkflowCallControl,
) {
  const semanticRequest = isCanonicalRelatedMutationRequest(request)
    ? normalizeCanonicalRelatedMutationRequest(request)
    : request;
  if (request.operation === "item.updateTags") {
    await withZoteroHostSlice(control, () =>
      requireItem(canonicalItemRef(request.itemRef), "item"),
    );
    return;
  }
  if (isCanonicalRelatedMutationRequest(semanticRequest)) {
    await withZoteroHostSlice(control, () =>
      prepareCanonicalRelatedMutation(semanticRequest),
    );
    return;
  }
  if (request.operation === "collection.create") {
    const name = trimText(request.name, 1024);
    if (!name) {
      throw capabilityError("invalid_request", "collection name is required", {
        reason: "invalid_value",
        field: "name",
        operation: request.operation,
      });
    }
    await withZoteroHostSlice(control, () => {
      const libraryId =
        request.placement.kind === "child"
          ? (() => {
              const parent = resolveCollection(
                canonicalCollectionRef(request.placement.parentRef),
              );
              if (!parent)
                throw notFoundError("collection", request.placement.parentRef);
              return normalizeLibraryId((parent as any).libraryID);
            })()
          : parsePositiveInteger(request.placement.libraryId) ||
            normalizeLibraryId(undefined);
      const refs = normalizeCollectionMembershipRefs(
        request.operation,
        request.initialMemberRefs || [],
        [],
        { allowEmpty: true },
      ).addRefs;
      resolveCollectionMembershipTargets(request.operation, refs, libraryId);
    });
    return;
  }
  if (request.operation === "collection.update") {
    await withZoteroHostSlice(control, () => {
      const collectionRef = canonicalCollectionRef(request.collectionRef);
      const collection = resolveCollection(collectionRef);
      if (!collection) throw notFoundError("collection", collectionRef);
      if (
        request.patch.name !== undefined &&
        !trimText(request.patch.name, 1024)
      ) {
        throw capabilityError(
          "invalid_request",
          "collection name is required",
          {
            reason: "invalid_value",
            field: "patch.name",
            operation: request.operation,
          },
        );
      }
      if (
        request.patch.parentRef !== undefined &&
        request.patch.parentRef !== null
      ) {
        assertCollectionPlacementTarget(
          request.operation,
          collection,
          collectionRef,
          canonicalCollectionRef(request.patch.parentRef),
        );
      }
    });
    return;
  }
  if (request.operation === "collection.updateMembership") {
    const { addRefs, removeRefs } = normalizeCollectionMembershipRefs(
      request.operation,
      request.add,
      request.remove,
    );
    await withZoteroHostSlice(control, () => {
      const collectionRef = canonicalCollectionRef(request.collectionRef);
      if (!resolveCollection(collectionRef))
        throw notFoundError("collection", collectionRef);
      resolveCollectionMembershipTargets(
        request.operation,
        [...addRefs, ...removeRefs],
        collectionRef.libraryId,
      );
    });
  }
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
  beforeEffect?: CanonicalMutationEffectGuard,
  canonicalSemanticInput?: JsonValue,
): Promise<MutationExecutionResult<JsonObject>> {
  const semanticRequest = isCanonicalRelatedMutationRequest(request)
    ? normalizeCanonicalRelatedMutationRequest(request)
    : request;
  const operationId = trimText(request.operationId, 129);
  if (!operationId || operationId.length > 128) {
    throw capabilityError("invalid_request", "operationId is invalid", {
      reason: "invalid_value",
      field: "operationId",
      operation: semanticRequest.operation,
    });
  }
  assertWorkflowHostStrictJsonValue(request as unknown as JsonValue);
  try {
    return (await executeReservedMutation<object>({
      scope,
      operationId,
      operation: request.operation,
      semanticInput:
        canonicalSemanticInput || (semanticRequest as unknown as JsonValue),
      control,
      preflight: () => preflightOtherCanonicalMutationDomain(request, control),
      async execute() {
        switch (request.operation) {
          case "item.updateTags": {
            const itemRef = canonicalItemRef(request.itemRef);
            const { item, before, current } = await withZoteroHostSlice(
              control,
              async () => {
                await beforeEffect?.("read");
                const item = requireItem(itemRef, "item");
                const before = canonicalItemVersion(item);
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
              await withZoteroHostSlice(control, async () => {
                await beforeEffect?.("effect");
                return brokerMutationPrimitives.tag.update(item, next);
              });
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
            const preparedRelated = await withZoteroHostSlice(
              control,
              async () => {
                await beforeEffect?.("read");
                return prepareCanonicalRelatedMutation(
                  normalizeCanonicalRelatedMutationInput(request),
                );
              },
            );
            const { sourceRef, relatedRefs, source, related, before, current } =
              preparedRelated;
            const shouldBePresent =
              preparedRelated.operation === "item.addRelated";
            const relations = relatedRefs.map((relatedRef) => {
              const present = current.includes(relatedRef.key);
              const changed = present !== shouldBePresent;
              return {
                relatedRef,
                changed,
                outcome: shouldBePresent
                  ? changed
                    ? ("added" as const)
                    : ("already_present" as const)
                  : changed
                    ? ("removed" as const)
                    : ("already_absent" as const),
              };
            });
            const changed = relations.some((relation) => relation.changed);
            if (changed) {
              if (shouldBePresent)
                await withZoteroHostSlice(control, async () => {
                  await beforeEffect?.("effect");
                  return brokerMutationPrimitives.parent.addRelated(
                    source,
                    related,
                  );
                });
              else
                await withZoteroHostSlice(control, async () => {
                  await beforeEffect?.("effect");
                  return brokerMutationPrimitives.parent.removeRelated(
                    source,
                    related,
                  );
                });
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
                  relatedRefs,
                  relations: relations.map(({ relatedRef, outcome }) => ({
                    relatedRef,
                    outcome,
                  })),
                  sourceRevision: after.revision,
                },
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
              await withZoteroHostSlice(control, async () => {
                await beforeEffect?.("read");
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
              created = await withZoteroHostSlice(control, async () => {
                await beforeEffect?.("effect");
                return brokerMutationPrimitives.collection.create({
                  name,
                  libraryID: libraryId,
                });
              });
              if (parent) {
                await withZoteroHostSlice(control, async () => {
                  await beforeEffect?.("effect");
                  return brokerMutationPrimitives.collection.update(created!, {
                    parentID: Number((parent as any).id),
                  });
                });
              }
              for (const { item, ref } of members) {
                await withZoteroHostSlice(control, async () => {
                  await beforeEffect?.("effect");
                  await brokerMutationPrimitives.collection.add(item, created!);
                  beforeEffect?.markWritten([{ kind: "item", ref }]);
                });
              }
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
                    brokerMutationPrimitives.collection.delete(created!),
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
              await withZoteroHostSlice(control, async () => {
                await beforeEffect?.("read");
                const collection = resolveCollection(collectionRef);
                if (!collection)
                  throw notFoundError("collection", collectionRef);
                const before = canonicalCollectionVersion(collection);
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
              await withZoteroHostSlice(control, async () => {
                await beforeEffect?.("effect");
                return brokerMutationPrimitives.collection.update(
                  collection,
                  patch,
                );
              });
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
            } = await withZoteroHostSlice(control, async () => {
              await beforeEffect?.("read");
              const collection = resolveCollection(collectionRef);
              if (!collection) throw notFoundError("collection", collectionRef);
              const before = canonicalCollectionVersion(collection);
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
                await withZoteroHostSlice(control, async () => {
                  await beforeEffect?.("effect");
                  await brokerMutationPrimitives.collection.add(
                    item,
                    collection,
                  );
                  beforeEffect?.markWritten([
                    { kind: "collection", ref: collectionRef },
                    { kind: "item", ref },
                  ]);
                });
                applied.push({ kind: "add", ref, item });
                addedRefs.push(ref);
              }
              for (const { ref, item } of removals) {
                await withZoteroHostSlice(control, async () => {
                  await beforeEffect?.("effect");
                  await brokerMutationPrimitives.collection.remove(
                    item,
                    collection,
                  );
                  beforeEffect?.markWritten([
                    { kind: "collection", ref: collectionRef },
                    { kind: "item", ref },
                  ]);
                });
                applied.push({ kind: "remove", ref, item });
                removedRefs.push(ref);
              }
            } catch (primary) {
              const residualRefs: MutationEntityRef[] = [];
              for (const entry of [...applied].reverse()) {
                try {
                  if (entry.kind === "add") {
                    await withZoteroHostSlice(control, () =>
                      brokerMutationPrimitives.collection.remove(
                        entry.item,
                        collection,
                      ),
                    );
                  } else {
                    await withZoteroHostSlice(control, () =>
                      brokerMutationPrimitives.collection.add(
                        entry.item,
                        collection,
                      ),
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
          default:
            throw capabilityError(
              "unsupported_operation",
              "mutation operation is unsupported",
              { memberOrOperation: request.operation },
            );
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
  beforeEffect?: CanonicalMutationEffectGuard,
  semanticInput?: JsonValue,
): Promise<MutationExecutionResult<JsonObject>> {
  const operationId = trimText(request.operationId, 129);
  if (!operationId || operationId.length > 128) {
    throw capabilityError("invalid_request", "operationId is invalid", {
      reason: "invalid_value",
      field: "operationId",
      operation: request.operation,
    });
  }
  const previewRequest =
    request.operation === "item.remove"
      ? {
          operation: "item.remove" as const,
          itemRef: canonicalItemRef(request.itemRef),
          disposition: "permanent" as const,
          childPolicy: request.childPolicy,
        }
      : {
          operation: "collection.remove" as const,
          collectionRef: canonicalCollectionRef(request.collectionRef),
          childPolicy: request.childPolicy,
        };
  let prepared: LegacyDestructivePreparedMutation | null = null;
  try {
    return (await executeReservedMutation<object>({
      scope,
      operationId,
      operation: request.operation,
      semanticInput: semanticInput || (request as unknown as JsonValue),
      control,
      async preflight() {
        prepared = await withZoteroHostSlice(control, () =>
          prepareLegacyDestructiveMutation(previewRequest, scope),
        );
        await withZoteroHostSlice(control, () =>
          revalidateLegacyDestructiveMutation(prepared!, previewRequest, scope),
        );
      },
      async execute() {
        if (!prepared) throw preparedMutationStaleError();
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
          const plan = prepared.plan as MutationPlanByOperation["item.remove"];
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
            prepared.observations
              .filter((entry) => entry.entity.kind === "item")
              .map((entry) => [entry.entity.ref.key, entry.version]),
          );
          const deleted: typeof targetRefs = [];
          try {
            for (const ref of targetRefs) {
              await withZoteroHostSlice(control, async () => {
                await beforeEffect?.("effect");
                const item = requireItem(ref, "removal target");
                await brokerMutationPrimitives.item.remove(item);
                beforeEffect?.markRemoved([{ kind: "item", ref }]);
                beforeEffect?.markWritten(
                  targetRefs
                    .filter(
                      (candidate) =>
                        mutationObservationEntityKey({
                          kind: "item",
                          ref: candidate,
                        }) !==
                        mutationObservationEntityKey({ kind: "item", ref }),
                    )
                    .map((candidate) => ({
                      kind: "item" as const,
                      ref: candidate,
                    })),
                );
              });
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

        const plan =
          prepared.plan as MutationPlanByOperation["collection.remove"];
        const target = plan.deletedCollections[0];
        if (!target) {
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
          prepared.observations
            .filter((entry) => entry.entity.kind === "item")
            .map((entry) => [entry.entity.ref.key, entry.version]),
        );
        try {
          for (const membership of plan.detachedMemberships) {
            await withZoteroHostSlice(control, async () => {
              await beforeEffect?.("effect");
              const item = requireItem(membership.itemRef, "collection member");
              const collection = resolveCollection(membership.collectionRef);
              if (!collection) return;
              await brokerMutationPrimitives.collection.remove(
                item,
                collection,
              );
              beforeEffect?.markWritten([
                { kind: "item", ref: membership.itemRef },
                { kind: "collection", ref: membership.collectionRef },
              ]);
            });
          }
          for (const entry of [...plan.deletedCollections].reverse()) {
            await withZoteroHostSlice(control, async () => {
              await beforeEffect?.("effect");
              const collection = resolveCollection(entry.ref);
              if (!collection) return;
              await brokerMutationPrimitives.collection.delete(collection);
              beforeEffect?.markRemoved([
                { kind: "collection", ref: entry.ref },
              ]);
              beforeEffect?.markWritten(
                plan.deletedCollections
                  .filter(
                    (candidate) =>
                      mutationObservationEntityKey({
                        kind: "collection",
                        ref: candidate.ref,
                      }) !==
                      mutationObservationEntityKey({
                        kind: "collection",
                        ref: entry.ref,
                      }),
                  )
                  .map((candidate) => ({
                    kind: "collection" as const,
                    ref: candidate.ref,
                  })),
              );
            });
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
  "notes.create",
  "notes.updateContent",
  "notes.remove",
  "notes.upsertPayload",
  "attachments.create",
  "attachments.updateMetadata",
  "attachments.replaceFile",
  "attachments.move",
  "attachments.remove",
  "statusTags.transition",
  "trash.setItemsState",
  "literature.ingest",
  "managed_note.write_custom",
  "managed_note.write_conversation",
  "literature_artifact.upsert_digest",
  "literature_artifact.upsert_references",
  "literature_artifact.upsert_citation_analysis",
  "literature_artifact.upsert_score",
]);

type CanonicalMutationEffectOptions = Readonly<{
  attachmentPrimitives?: ZoteroHostAttachmentMutationPrimitives;
  beforeEffect?: CanonicalMutationEffectGuard;
  trashPrepared?: PreparedHostTrashMutation;
  ingestPrepared?: CanonicalLiteratureIngestPrepared;
  semanticInput?: JsonValue;
}>;

type CanonicalMutationEffectGuard = ((
  phase: "read" | "effect",
) => Promise<void>) & {
  markWritten(entities: readonly MutationEntityRef[]): void;
  markRemoved(entities: readonly MutationEntityRef[]): void;
};

type ManagedSemanticOperation =
  | "managed_note.write_custom"
  | "managed_note.write_conversation"
  | "literature_artifact.upsert_digest"
  | "literature_artifact.upsert_references"
  | "literature_artifact.upsert_citation_analysis"
  | "literature_artifact.upsert_score";

type ManagedSemanticRequest = Extract<
  MutationExecuteRequest,
  { operation: ManagedSemanticOperation }
>;

type ManagedSemanticPrepared = Readonly<{
  operation: ManagedSemanticOperation;
  kind: ManagedNoteKind;
  parentRef?: ZoteroHostItemRefInput;
  target?: ManagedNoteWriteRequestDto["target"];
  title: string;
  content: string;
  payload: LogicalNotePayloadDto;
  publicPayload: JsonValue;
  referencesBasis?: string;
  dependentStale?: boolean;
}>;

function isManagedSemanticOperation(
  operation: unknown,
): operation is ManagedSemanticOperation {
  return (
    operation === "managed_note.write_custom" ||
    operation === "managed_note.write_conversation" ||
    operation === "literature_artifact.upsert_digest" ||
    operation === "literature_artifact.upsert_references" ||
    operation === "literature_artifact.upsert_citation_analysis" ||
    operation === "literature_artifact.upsert_score"
  );
}

function managedKindForOperation(
  operation: ManagedSemanticOperation,
): ManagedNoteKind {
  switch (operation) {
    case "managed_note.write_custom":
      return "custom";
    case "managed_note.write_conversation":
      return "conversation-note";
    case "literature_artifact.upsert_digest":
      return "digest";
    case "literature_artifact.upsert_references":
      return "references";
    case "literature_artifact.upsert_citation_analysis":
      return "citation-analysis";
    case "literature_artifact.upsert_score":
      return "literature-score";
  }
}

function managedErrorDetails(error: ManagedNoteOwnerError) {
  const raw = error.details;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      phase: "read",
      recovery: error.retryable
        ? "retry_same_operation"
        : "refresh_and_retry_new_operation",
    } as WorkflowHostErrorDetailsByCode["execution_failed"];
  }
  const value = raw as Record<string, unknown>;
  const phases = new Set([
    "validation",
    "read",
    "staging",
    "write",
    "commit",
    "verification",
    "cleanup",
    "adapter",
  ]);
  const recoveries = new Set([
    "none",
    "retry_same_operation",
    "refresh_and_retry_new_operation",
    "reconcile",
    "manual_repair",
  ]);
  const phase = phases.has(String(value.phase)) ? String(value.phase) : "read";
  const recovery = recoveries.has(String(value.recovery))
    ? String(value.recovery)
    : error.retryable
      ? "retry_same_operation"
      : "refresh_and_retry_new_operation";
  const details: WorkflowHostErrorDetailsByCode["execution_failed"] = {
    phase: phase as WorkflowHostErrorDetailsByCode["execution_failed"]["phase"],
    recovery:
      recovery as WorkflowHostErrorDetailsByCode["execution_failed"]["recovery"],
  };
  if (
    Number.isSafeInteger(value.affectedCount) &&
    Number(value.affectedCount) >= 0
  ) {
    details.affectedCount = Number(value.affectedCount);
  }
  if (
    Number.isSafeInteger(value.residualCount) &&
    Number(value.residualCount) >= 0
  ) {
    details.residualCount = Number(value.residualCount);
  }
  return details;
}

function mapManagedOwnerError(error: unknown): never {
  if (!(error instanceof ManagedNoteOwnerError)) throw error;
  if (error.code === "invalid_request") {
    throw capabilityError(
      "invalid_request",
      error.message,
      (error.details || {
        reason: "invalid_value",
      }) as WorkflowHostErrorDetailsByCode["invalid_request"],
      error.retryable,
    );
  }
  if (error.code === "invalid_ref") {
    throw capabilityError(
      "invalid_ref",
      error.message,
      (error.details || {
        kind: "note",
        reason: "invalid_shape",
      }) as WorkflowHostErrorDetailsByCode["invalid_ref"],
      error.retryable,
    );
  }
  if (error.code === "not_found") {
    throw capabilityError(
      "not_found",
      error.message,
      (error.details || {
        kind: "note",
      }) as WorkflowHostErrorDetailsByCode["not_found"],
      error.retryable,
    );
  }
  if (error.code === "resource_limited") {
    throw capabilityError(
      "resource_limited",
      error.message,
      (error.details || {
        resource: "bytes",
        limit: NOTE_PAYLOAD_MAX_BYTES,
      }) as WorkflowHostErrorDetailsByCode["resource_limited"],
      error.retryable,
    );
  }
  if (error.code === "conflict") {
    throw capabilityError(
      "conflict",
      error.message,
      (error.details || {
        reason: "ambiguous_state",
        kind: "note",
      }) as WorkflowHostErrorDetailsByCode["conflict"],
      error.retryable,
    );
  }
  throw capabilityError(
    "execution_failed",
    error.message,
    managedErrorDetails(error),
    error.retryable,
  );
}

function normalizeLiteratureScore(value: unknown): LiteratureScoreArtifact {
  assertWorkflowHostStrictJsonValue(value as JsonValue);
  const validated = validateLiteratureScoreArtifact(value);
  if (!validated.ok) {
    throw capabilityError("invalid_request", "literature score is invalid", {
      reason: "invalid_schema",
      field: "score",
    });
  }
  return validated.value;
}

function normalizeManagedSemanticRequest(
  request: ManagedSemanticRequest,
): ManagedSemanticPrepared {
  const operation = request.operation;
  const kind = managedKindForOperation(operation);
  if (
    operation === "managed_note.write_custom" ||
    operation === "managed_note.write_conversation"
  ) {
    const content = managedMarkdownPayload(
      kind as "custom" | "conversation-note",
      request.content.title,
      request.content.markdown,
    );
    const parentRef =
      request.target.kind === "create"
        ? canonicalItemRef(request.target.parentRef)
        : undefined;
    return {
      operation,
      kind,
      ...(parentRef ? { parentRef } : {}),
      target: request.target,
      title: content.title,
      content: content.content,
      payload: content.payload,
      publicPayload: { title: content.title, markdown: content.markdown },
    };
  }
  const parentRef = canonicalItemRef(request.parentRef);
  if (operation === "literature_artifact.upsert_digest") {
    const markdown = String(request.markdown || "");
    if (!markdown.trim()) {
      throw capabilityError("invalid_request", "digest markdown is empty", {
        reason: "invalid_value",
        field: "markdown",
        operation,
      });
    }
    const publicPayload = { markdown } as JsonValue;
    const artifactKind = kind as Exclude<
      ManagedNoteKind,
      "custom" | "conversation-note"
    >;
    const content = managedArtifactContent(
      artifactKind,
      managedArtifactTitle(artifactKind),
      publicPayload,
    );
    return {
      operation,
      kind,
      parentRef,
      title: managedArtifactTitle(artifactKind),
      content: content.content,
      payload: content.payload,
      publicPayload,
    };
  }
  if (operation === "literature_artifact.upsert_references") {
    const validated = validateSourceReferenceArtifact(request.references);
    if (!validated.ok) {
      throw capabilityError(
        "invalid_request",
        "references artifact is invalid",
        {
          reason: "invalid_value",
          field: "references",
          operation,
        },
      );
    }
    const publicPayload = validated.value as unknown as JsonValue;
    const artifactKind = kind as Exclude<
      ManagedNoteKind,
      "custom" | "conversation-note"
    >;
    const content = managedArtifactContent(
      artifactKind,
      managedArtifactTitle(artifactKind),
      publicPayload,
    );
    return {
      operation,
      kind,
      parentRef,
      title: managedArtifactTitle(artifactKind),
      content: content.content,
      payload: content.payload,
      publicPayload,
    };
  }
  if (operation === "literature_artifact.upsert_citation_analysis") {
    const validated = validateCitationAnalysisArtifact(
      request.citationAnalysis,
    );
    if (!validated.ok) {
      throw capabilityError(
        "invalid_request",
        "citation analysis artifact is invalid",
        {
          reason: "invalid_value",
          field: "citationAnalysis",
          operation,
        },
      );
    }
    const publicPayload = validated.value as unknown as JsonValue;
    const artifactKind = kind as Exclude<
      ManagedNoteKind,
      "custom" | "conversation-note"
    >;
    const content = managedArtifactContent(
      artifactKind,
      managedArtifactTitle(artifactKind),
      publicPayload,
    );
    return {
      operation,
      kind,
      parentRef,
      title: managedArtifactTitle(artifactKind),
      content: content.content,
      payload: content.payload,
      publicPayload,
    };
  }
  const score = normalizeLiteratureScore(request.score);
  const publicPayload = score as unknown as JsonValue;
  const artifactKind = kind as Exclude<
    ManagedNoteKind,
    "custom" | "conversation-note"
  >;
  const content = managedArtifactContent(
    artifactKind,
    managedArtifactTitle(artifactKind),
    publicPayload,
  );
  return {
    operation,
    kind,
    parentRef,
    title: managedArtifactTitle(artifactKind),
    content: content.content,
    payload: content.payload,
    publicPayload,
  };
}

async function managedChildNotes(
  parent: Zotero.Item,
  control?: WorkflowCallControl,
) {
  const ids = await withZoteroHostSlice(control, () =>
    getChildItemIds(parent, "getNotes"),
  );
  if (ids.length > 100) {
    throw capabilityError(
      "resource_limited",
      "managed note scan is too large",
      {
        resource: "items",
        limit: 100,
        observed: ids.length,
      },
    );
  }
  const notes: Array<{
    note: Zotero.Item;
    inspection: Awaited<ReturnType<typeof inspectManagedNote>>;
  }> = [];
  for (const id of ids) {
    const note = await withZoteroHostSlice(control, () =>
      resolveZotero().Items.get(id),
    );
    if (!note?.isNote?.()) continue;
    const inspection = await inspectManagedNote(note, {
      runNativeSlice: (run) => withZoteroHostSlice(control, run),
      checkCanceled: () => throwIfWorkflowCallCanceled(control),
    });
    notes.push({ note, inspection });
  }
  return notes;
}

async function managedSingleton(
  parentRef: ZoteroHostItemRefInput,
  kind: ManagedNoteKind,
  control?: WorkflowCallControl,
) {
  const parent = await withZoteroHostSlice(control, () =>
    requireItem(parentRef, "artifact parent"),
  );
  if (parent.isNote?.() || parent.isAttachment?.() || parent.isAnnotation?.()) {
    throw invalidRefError(
      "item",
      "wrong_kind",
      "artifact parent must be a regular item",
    );
  }
  const matches = (await managedChildNotes(parent, control)).filter(
    ({ inspection }) =>
      inspection.kind === "managed" && inspection.noteKind === kind,
  );
  if (matches.length > 1) {
    throw capabilityError("conflict", "managed artifact is ambiguous", {
      reason: "ambiguous_state",
      kind: "note",
    });
  }
  return {
    parent,
    note: matches[0]?.note || null,
    inspection: matches[0]?.inspection || null,
  };
}

async function preflightManagedSemanticRequest(
  request: ManagedSemanticRequest,
  prepared: ManagedSemanticPrepared,
  control?: WorkflowCallControl,
) {
  if (prepared.target?.kind === "create") {
    const parent = await withZoteroHostSlice(control, () => {
      const parent = requireItem(prepared.parentRef, "note parent");
      if (
        parent.isNote?.() ||
        parent.isAttachment?.() ||
        parent.isAnnotation?.()
      ) {
        throw invalidRefError(
          "item",
          "wrong_kind",
          "note parent must be a regular item",
        );
      }
      return parent;
    });
    assertManagedPayloadImageBudget({
      payload: prepared.payload,
      parentId: parent.id,
    });
    return;
  }
  const target = prepared.target;
  if (target?.kind === "update") {
    const note = await withZoteroHostSlice(control, () =>
      requireNote(target.noteRef),
    );
    assertManagedPayloadImageBudget({
      payload: prepared.payload,
      noteId: note.id,
      noteKey: note.key,
      parentId:
        (note as unknown as { parentID?: unknown; parentItemID?: unknown })
          .parentID ||
        (note as unknown as { parentItemID?: unknown }).parentItemID ||
        null,
    });
    const inspection = await inspectManagedNote(note, {
      runNativeSlice: (run) => withZoteroHostSlice(control, run),
      checkCanceled: () => throwIfWorkflowCallCanceled(control),
    });
    if (
      inspection.kind !== "managed" ||
      inspection.noteKind !== prepared.kind
    ) {
      throw capabilityError(
        "conflict",
        "managed note kind does not match the writer",
        {
          reason: "ambiguous_state",
          kind: "note",
        },
      );
    }
    return;
  }
  const singleton = await managedSingleton(
    prepared.parentRef!,
    prepared.kind,
    control,
  );
  assertManagedPayloadImageBudget({
    payload: prepared.payload,
    noteId: singleton.note?.id,
    noteKey: singleton.note?.key,
    parentId: singleton.parent.id,
  });
  if (prepared.kind === "citation-analysis") {
    const references = await managedSingleton(
      prepared.parentRef!,
      "references",
      control,
    );
    if (!references.inspection || references.inspection.kind !== "managed") {
      throw capabilityError(
        "conflict",
        "citation analysis requires references",
        {
          reason: "basis_mismatch",
          kind: "note",
        },
      );
    }
    const validated = validateCitationAgainstReferences(
      prepared.publicPayload as unknown as CitationAnalysisArtifact,
      references.inspection.payload as unknown as SourceReferenceArtifact,
    );
    if (!validated.ok) {
      throw capabilityError(
        "conflict",
        "citation analysis references are stale",
        {
          reason: "basis_mismatch",
          kind: "note",
        },
      );
    }
  }
  void singleton;
}

async function executeCanonicalMutationEffects(
  request: MutationExecuteRequest,
  scope: ZoteroHostMutationCallerScope,
  control?: WorkflowCallControl,
  options: CanonicalMutationEffectOptions = {},
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
    return executeItemCreate(
      request,
      scope,
      control,
      options.beforeEffect,
      options.semanticInput,
    );
  }
  if (isManagedSemanticOperation(request?.operation)) {
    return executeManagedSemanticMutationEffects(
      request as ManagedSemanticRequest,
      scope,
      control,
      options.semanticInput,
      options.beforeEffect,
    );
  }
  if (
    request?.operation === "notes.create" ||
    request?.operation === "notes.updateContent" ||
    request?.operation === "notes.remove" ||
    request?.operation === "notes.upsertPayload"
  ) {
    const { operation, ...noteRequest } = request;
    return executeNoteMutation(
      noteRequest,
      operation,
      scope,
      control,
      options.semanticInput || (request as unknown as JsonValue),
      options.beforeEffect,
    );
  }
  if (
    request?.operation === "attachments.create" ||
    request?.operation === "attachments.updateMetadata" ||
    request?.operation === "attachments.replaceFile" ||
    request?.operation === "attachments.move" ||
    request?.operation === "attachments.remove"
  ) {
    const { operation, ...attachmentRequest } = request;
    return executeAttachmentMutation(
      attachmentRequest,
      operation,
      scope,
      options.attachmentPrimitives || {},
      control,
      options.semanticInput || (request as unknown as JsonValue),
      options.beforeEffect,
    );
  }
  if (request?.operation === "statusTags.transition") {
    const { operation: _operation, ...statusRequest } = request;
    return executeStatusTagTransition(
      statusRequest,
      scope,
      control,
      options.semanticInput || (request as unknown as JsonValue),
      options.beforeEffect,
    );
  }
  if (request?.operation === "trash.setItemsState") {
    return executeCanonicalTrashMutation(
      request,
      scope,
      control,
      options.trashPrepared,
      options.beforeEffect,
      options.semanticInput,
    );
  }
  if (request?.operation === "literature.ingest") {
    return executeCanonicalLiteratureIngest(
      request,
      scope,
      control,
      options.ingestPrepared,
      options.beforeEffect,
      options.semanticInput,
    );
  }
  if (request?.operation === "item.changeType") {
    return executeItemChangeType(
      request,
      scope,
      control,
      options.beforeEffect,
      options.semanticInput,
    );
  }
  if (
    request?.operation === "collection.remove" ||
    (request?.operation === "item.remove" &&
      request.disposition === "permanent")
  ) {
    return executeDestructiveCanonicalMutation(
      request,
      scope,
      control,
      options.beforeEffect,
      options.semanticInput,
    );
  }
  if (request?.operation !== "item.updateMetadata") {
    return executeOtherCanonicalMutation(
      request,
      scope,
      control,
      options.beforeEffect,
      options.semanticInput,
    );
  }
  const normalized = normalizeItemUpdateMetadataRequest(request);
  try {
    return await executeReservedMutation({
      scope,
      operationId: normalized.operationId,
      operation: normalized.operation,
      // This executor's field projection is only for the native write. The
      // durable operation identity remains the control-normalized request.
      semanticInput: options.semanticInput || (request as unknown as JsonValue),
      control,
      async preflight() {
        await withZoteroHostSlice(control, () =>
          requireItem(normalized.itemRef, "item"),
        );
      },
      async execute() {
        const item = await withZoteroHostSlice(control, async () => {
          await options.beforeEffect?.("read");
          return requireItem(normalized.itemRef, "item");
        });
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
        const { fields, fieldsChanged, creatorsChanged } =
          await withZoteroHostSlice(control, () => {
            let fields: Record<string, string | null> | undefined;
            if (normalized.patch.fields) {
              try {
                fields = applicableMetadataFieldPatch(
                  item,
                  normalized.patch.fields,
                );
              } catch (error) {
                const invalidField = Object.entries(
                  normalized.patch.fields,
                ).find(([field, value]) => {
                  try {
                    applicableMetadataFieldPatch(item, { [field]: value });
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
            await withZoteroHostSlice(control, async () => {
              await options.beforeEffect?.("effect");
              return brokerMutationPrimitives.parent.updateMetadata(item, {
                fields,
                creators: normalized.patch.creators,
              });
            });
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

async function executeManagedSemanticMutationEffects(
  request: ManagedSemanticRequest,
  scope: ZoteroHostMutationCallerScope,
  control?: WorkflowCallControl,
  semanticInput?: JsonValue,
  beforeEffect?: CanonicalMutationEffectGuard,
): Promise<MutationExecutionResult<JsonObject>> {
  let prepared: ManagedSemanticPrepared;
  try {
    prepared = normalizeManagedSemanticRequest(request);
  } catch (error) {
    mapManagedOwnerError(error);
  }

  const normalized = prepared!;
  const operationId = trimText(request.operationId, 129);
  if (!operationId || operationId.length > 128) {
    throw capabilityError("invalid_request", "operationId is invalid", {
      reason: "invalid_value",
      field: "operationId",
      operation: request.operation,
    });
  }
  assertWorkflowHostStrictJsonValue(
    (semanticInput || (request as unknown as JsonValue)) as JsonValue,
  );

  try {
    return await executeReservedMutation<JsonObject>({
      scope,
      operationId,
      operation: request.operation,
      semanticInput: semanticInput || (request as unknown as JsonValue),
      control,
      preflight: async () => {
        try {
          await preflightManagedSemanticRequest(request, normalized, control);
        } catch (error) {
          mapManagedOwnerError(error);
        }
      },
      execute: async () => {
        let target = normalized.target;
        let parent: Zotero.Item | null = null;
        let note: Zotero.Item | null = null;
        let before: ReturnType<typeof canonicalNoteVersion> | null = null;
        let dependentStale = false;
        let referencesBasis: string | undefined;

        if (normalized.parentRef) {
          const singleton = await managedSingleton(
            normalized.parentRef,
            normalized.kind,
            control,
          );
          parent = singleton.parent;
          note = singleton.note;
          if (!note) {
            target = { kind: "create", parentRef: normalized.parentRef };
          } else {
            target = {
              kind: "update",
              noteRef: canonicalItemRef(note),
            };
          }
          if (normalized.kind === "citation-analysis") {
            const references = await managedSingleton(
              normalized.parentRef,
              "references",
              control,
            );
            if (
              !references.inspection ||
              references.inspection.kind !== "managed"
            ) {
              throw capabilityError(
                "conflict",
                "citation analysis requires references",
                {
                  reason: "basis_mismatch",
                  kind: "note",
                },
              );
            }
            const sourceReferences = references.inspection
              .payload as unknown as SourceReferenceArtifact;
            const citation =
              normalized.publicPayload as unknown as CitationAnalysisArtifact;
            const validated = validateCitationAgainstReferences(
              citation,
              sourceReferences,
            );
            if (!validated.ok) {
              throw capabilityError(
                "conflict",
                "citation analysis references are stale",
                {
                  reason: "basis_mismatch",
                  kind: "note",
                },
              );
            }
            referencesBasis =
              hashSynthesisContractCanonicalJson(sourceReferences);
            const stored = attachReferencesBasis(citation, referencesBasis);
            const content = managedArtifactContent(
              normalized.kind,
              normalized.title,
              stored as unknown as JsonValue,
            );
            prepared = {
              ...normalized,
              content: content.content,
              payload: content.payload,
              referencesBasis,
              publicPayload: stored as unknown as JsonValue,
            };
          } else if (normalized.kind === "references") {
            referencesBasis = hashSynthesisContractCanonicalJson(
              normalized.publicPayload,
            );
            const citation = await managedSingleton(
              normalized.parentRef,
              "citation-analysis",
              control,
            );
            if (citation.inspection?.kind === "managed") {
              const citationPayload = citation.inspection.payload as Record<
                string,
                unknown
              >;
              dependentStale =
                citationPayload.referencesBasis !== referencesBasis;
            }
          }
        } else {
          const directTarget = target;
          if (directTarget?.kind === "update") {
            note = await withZoteroHostSlice(control, () =>
              requireNote(directTarget.noteRef),
            );
          } else {
            parent = await withZoteroHostSlice(control, () =>
              requireItem(normalized.parentRef!, "note parent"),
            );
          }
        }

        const finalTarget = target;
        if (finalTarget?.kind === "update") {
          if (!note)
            note = await withZoteroHostSlice(control, () =>
              requireNote(finalTarget.noteRef),
            );
          before = await withZoteroHostSlice(control, async () => {
            await beforeEffect?.("read");
            return canonicalNoteVersion(note!);
          });
          const inspection = await inspectManagedNote(note!, {
            runNativeSlice: (run) => withZoteroHostSlice(control, run),
            checkCanceled: () => throwIfWorkflowCallCanceled(control),
          });
          if (
            inspection.kind !== "managed" ||
            inspection.noteKind !== normalized.kind
          ) {
            throw capabilityError(
              "conflict",
              "managed note kind does not match the writer",
              {
                reason: "ambiguous_state",
                kind: "note",
              },
            );
          }
        } else {
          if (!parent) throw notFoundError("item", normalized.parentRef);
          note = await withZoteroHostSlice(control, async () => {
            await beforeEffect?.("effect");
            const created = await brokerMutationPrimitives.note.create({
              content: normalized.content,
              parent,
              libraryID: normalizeLibraryId(parent!.libraryID),
              tags: [],
              collections: [],
            });
            beforeEffect?.markWritten([]);
            return created;
          });
        }

        const currentHtml = await withZoteroHostSlice(control, () =>
          String(note!.getNote?.() || ""),
        );
        if (currentHtml !== normalized.content) {
          await withZoteroHostSlice(control, async () => {
            await beforeEffect?.("effect");
            await brokerMutationPrimitives.note.update(
              note!,
              normalized.content,
            );
            beforeEffect?.markWritten([]);
          });
        }

        let payloadResult: Awaited<
          ReturnType<typeof upsertNotePayloadAttachment>
        >;
        try {
          const matches = (
            await listMutationPayloadBlocks(note!, control)
          ).filter(
            (block) => block.payloadType === normalized.payload.payloadType,
          );
          payloadResult = await upsertNotePayloadAttachment(
            note!,
            normalized.payload,
            matches,
            control,
            beforeEffect,
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
              : "managed note payload upsert failed",
            note ? [{ kind: "item", ref: canonicalItemRef(note) }] : [],
          );
        }

        const committed = await withZoteroHostSlice(control, () => {
          const committedNote = requireNote(canonicalItemRef(note!));
          return {
            ref: canonicalItemRef(committedNote),
            after: canonicalNoteVersion(committedNote),
            note: committedNote,
          };
        });
        let detail: NoteDetailResultDto;
        try {
          detail = await readManagedNoteDetail(
            committed.note,
            { format: "html" },
            {
              runNativeSlice: (run) => withZoteroHostSlice(control, run),
              checkCanceled: () => throwIfWorkflowCallCanceled(control),
              readRevision: () => canonicalNoteVersion(committed.note).revision,
            },
          );
        } catch (error) {
          mapManagedOwnerError(error);
        }
        detail = await enrichManagedNoteDetail(detail!, control || {});
        if (detail!.kind !== "managed") {
          throw new MutationAuthorityExecutionError(
            "unknown",
            "execution_failed",
            "verification",
            "reconcile",
            { phase: "verification", recovery: "reconcile" },
            "managed note final state could not be confirmed",
            [{ kind: "item", ref: committed.ref }],
          );
        }
        const created = !before;
        const attachmentChanges: MutationChangeDto[] = [];
        if (payloadResult.createdAttachment) {
          attachmentChanges.push({
            entity: {
              kind: "item",
              ref: canonicalItemRef(payloadResult.createdAttachment),
            },
            effect: "created",
            before: null,
            after: canonicalItemVersion(payloadResult.createdAttachment),
          });
        }
        if (payloadResult.removedAttachment) {
          const removedRef = canonicalItemRef(payloadResult.removedAttachment);
          attachmentChanges.push({
            entity: { kind: "item", ref: removedRef },
            effect: "deleted",
            before: canonicalItemVersion(payloadResult.removedAttachment),
            after: {
              revision: hashSynthesisContractCanonicalJson({
                ref: removedRef,
                state: "deleted",
                operationId,
              }),
              state: "deleted",
            },
          });
        }
        return {
          outcome:
            created || payloadResult.outcome !== "unchanged"
              ? "committed"
              : "unchanged",
          changes: [
            {
              entity: { kind: "item", ref: committed.ref },
              effect: created
                ? "created"
                : payloadResult.outcome !== "unchanged"
                  ? "updated"
                  : "unchanged",
              before,
              after: committed.after,
            },
            ...attachmentChanges,
          ],
          result: strictJsonObject({
            note: detail,
            ...(referencesBasis ? { referencesBasis } : {}),
            ...(dependentStale ? { dependentStale: true } : {}),
          }),
        };
      },
    });
  } catch (error) {
    if (error instanceof MutationAuthorityAdmissionError)
      throw mutationAdmissionError(error);
    throw error;
  }
}

function canonicalMutationScope(scope: ZoteroHostMutationCallerScope) {
  return trimText(scope?.ownerId, 256);
}

function preparedMutationInput(
  input: MutationRequestByOperation[MutationOperation],
) {
  assertCanonicalMutationExecuteInput(input);
  const semanticInput = isCanonicalRelatedMutationRequest(input)
    ? normalizeCanonicalRelatedMutationRequest(input)
    : input;
  assertWorkflowHostStrictJsonValue(semanticInput as unknown as JsonValue);
  return semanticInput as unknown as JsonValue;
}

const mutationSchemaAjv = new Ajv2020({
  allErrors: true,
  strict: false,
  logger: false,
});
const validateCanonicalMutationExecuteInput: ValidateFunction =
  mutationSchemaAjv.compile(MUTATION_EXECUTE_INPUT_SCHEMA);
const validateCanonicalMutationPreviewInput: ValidateFunction =
  mutationSchemaAjv.compile(MUTATION_PREVIEW_INPUT_SCHEMA);

function assertCanonicalMutationExecuteInput(value: unknown) {
  assertCanonicalMutationOperation(value);
  if (validateCanonicalMutationExecuteInput(value)) return;
  const first = validateCanonicalMutationExecuteInput.errors?.[0];
  throw capabilityError(
    "invalid_request",
    "mutation request does not match the canonical schema",
    {
      reason: "invalid_schema",
      ...(first?.instancePath
        ? { field: trimText(first.instancePath, 128) }
        : {}),
    },
  );
}

function assertCanonicalMutationPreviewInput(value: unknown) {
  assertCanonicalMutationOperation(value);
  if (validateCanonicalMutationPreviewInput(value)) return;
  const first = validateCanonicalMutationPreviewInput.errors?.[0];
  throw capabilityError(
    "invalid_request",
    "mutation preview request does not match the canonical schema",
    {
      reason: "invalid_schema",
      ...(first?.instancePath
        ? { field: trimText(first.instancePath, 128) }
        : {}),
    },
  );
}

function assertCanonicalMutationOperation(value: unknown) {
  const request =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as { operation?: unknown; source?: { kind?: unknown } })
      : null;
  const operation = request ? trimText(request.operation, 256) : "";
  if (
    operation === "attachments.replaceFile" &&
    request?.source?.kind === "linked_file"
  ) {
    throw capabilityError(
      "unsupported_operation",
      "linked-file replacement is unsupported",
      { memberOrOperation: "attachments.replaceFile" },
    );
  }
  if (CANONICAL_MUTATION_OPERATIONS.has(operation)) return;
  throw capabilityError(
    "unsupported_operation",
    "mutation operation is unsupported",
    { memberOrOperation: operation || "mutations.execute" },
  );
}

function preparedPreviewInput(
  input: MutationRequestByOperation[MutationOperation],
) {
  const { operationId: _operationId, ...preview } = input;
  return preview as MutationPreviewRequestByOperation[MutationPreviewOperation];
}

function isDestructivePreviewRequest(
  input: MutationRequestByOperation[MutationOperation],
): input is
  | MutationRequestByOperation["item.changeType"]
  | MutationRequestByOperation["item.remove"]
  | MutationRequestByOperation["collection.remove"] {
  return (
    input.operation === "item.changeType" ||
    input.operation === "collection.remove" ||
    (input.operation === "item.remove" && input.disposition === "permanent")
  );
}

function prepareCanonicalTrashMutation(request: TrashSetItemsStateRequest) {
  return prepareHostTrashMutation(request, {
    resolve: resolveItem,
    version: canonicalItemVersion,
  });
}

async function executeCanonicalTrashMutation(
  request: TrashSetItemsStateRequest,
  scope: ZoteroHostMutationCallerScope,
  control?: WorkflowCallControl,
  trustedPrepared?: PreparedHostTrashMutation,
  beforeEffect?: CanonicalMutationEffectGuard,
  semanticInput?: JsonValue,
): Promise<MutationExecutionResult<TrashSetItemsStateResultDto>> {
  const operationId = trimText(request.operationId, 129);
  if (!operationId || operationId.length > 128) {
    throw capabilityError("invalid_request", "operationId is invalid", {
      reason: "invalid_value",
      field: "operationId",
      operation: request.operation,
    });
  }
  assertWorkflowHostStrictJsonValue(request as unknown as JsonValue);
  let prepared = trustedPrepared;
  try {
    return await executeReservedMutation<TrashSetItemsStateResultDto>({
      scope,
      operationId,
      operation: request.operation,
      semanticInput: semanticInput || (request as unknown as JsonValue),
      control,
      async preflight() {
        if (!prepared) {
          prepared = await withZoteroHostSlice(control, () =>
            prepareCanonicalTrashMutation(request),
          );
        }
      },
      async execute() {
        if (!prepared) throw preparedMutationStaleError();
        return withZoteroHostSlice(control, async () => {
          await beforeEffect?.("effect");
          throwIfWorkflowCallCanceled(control);
          return executeHostTrashMutation(prepared!, {
            resolve: resolveItem,
            version: canonicalItemVersion,
          });
        });
      },
    });
  } catch (error) {
    if (error instanceof MutationAuthorityAdmissionError) {
      throw mutationAdmissionError(error);
    }
    throw error;
  }
}

function mutationObservationEntityKey(entity: MutationEntityRef) {
  return `${entity.kind}:${entity.ref.libraryId}:${entity.ref.key}`;
}

function collectCanonicalMutationObservations(
  input: CanonicalMutationDomainInput,
  excludedEntities: ReadonlySet<string> = new Set(),
): MutationEntityObservationDto[] {
  const items = new Map<string, ZoteroHostItemRefInput>();
  const collections = new Map<string, ZoteroHostCollectionRefInput>();
  const addItem = (ref: ZoteroHostItemRefInput) => {
    const canonical = canonicalItemRef(ref);
    if (
      excludedEntities.has(
        mutationObservationEntityKey({ kind: "item", ref: canonical }),
      )
    ) {
      return;
    }
    items.set(`${canonical.libraryId}\n${canonical.key}`, canonical);
  };
  const addCollection = (ref: ZoteroHostCollectionRefInput) => {
    const canonical = canonicalCollectionRef(ref);
    if (
      excludedEntities.has(
        mutationObservationEntityKey({ kind: "collection", ref: canonical }),
      )
    ) {
      return;
    }
    collections.set(`${canonical.libraryId}\n${canonical.key}`, canonical);
  };
  switch (input.operation) {
    case "item.updateMetadata":
    case "item.changeType":
    case "item.remove":
    case "item.updateTags":
      addItem(input.itemRef);
      break;
    case "item.addRelated":
    case "item.removeRelated":
      addItem(input.sourceRef);
      input.relatedRefs.forEach(addItem);
      break;
    case "item.create":
      input.initialRelatedRefs?.forEach(addItem);
      input.collectionRefs?.forEach(addCollection);
      break;
    case "collection.create":
      if (input.placement.kind === "child")
        addCollection(input.placement.parentRef);
      input.initialMemberRefs?.forEach(addItem);
      break;
    case "collection.update":
      addCollection(input.collectionRef);
      if (input.patch.parentRef) addCollection(input.patch.parentRef);
      break;
    case "collection.updateMembership":
      addCollection(input.collectionRef);
      input.add.forEach(addItem);
      input.remove.forEach(addItem);
      break;
    case "collection.remove":
      addCollection(input.collectionRef);
      break;
    case "notes.create":
      if (input.placement.kind === "child") addItem(input.placement.parentRef);
      else input.placement.collectionRefs?.forEach(addCollection);
      break;
    case "notes.updateContent":
    case "notes.remove":
    case "notes.upsertPayload":
      addItem(input.noteRef);
      break;
    case "attachments.create":
      if (input.placement.kind === "child") addItem(input.placement.parentRef);
      else input.placement.collectionRefs?.forEach(addCollection);
      break;
    case "attachments.updateMetadata":
    case "attachments.replaceFile":
    case "attachments.move":
    case "attachments.remove":
      addItem(input.attachmentRef);
      if (input.operation === "attachments.move") {
        if (input.placement.kind === "child")
          addItem(input.placement.parentRef);
        else input.placement.collectionRefs?.forEach(addCollection);
      }
      break;
    case "statusTags.transition":
      addItem(input.itemRef);
      break;
    case "trash.setItemsState":
      input.itemRefs.forEach(addItem);
      break;
    case "literature.ingest":
      addCollection(input.collectionRef);
      break;
    case "managed_note.write_custom":
    case "managed_note.write_conversation": {
      if (input.target.kind === "create") addItem(input.target.parentRef);
      else addItem(input.target.noteRef);
      break;
    }
    case "literature_artifact.upsert_digest":
    case "literature_artifact.upsert_references":
    case "literature_artifact.upsert_citation_analysis":
    case "literature_artifact.upsert_score": {
      addItem(input.parentRef);
      const parent = resolveItem(canonicalItemRef(input.parentRef));
      if (parent) {
        for (const id of getChildItemIds(parent, "getNotes")) {
          const child = resolveZotero().Items.get(id);
          if (child?.isNote?.()) addItem(canonicalItemRef(child));
        }
      }
      break;
    }
  }
  const observations: MutationEntityObservationDto[] = [];
  for (const ref of items.values()) {
    const item = requireItem(ref, "mutation target");
    observations.push({
      entity: { kind: "item", ref },
      version: canonicalItemVersion(item),
    });
  }
  for (const ref of collections.values()) {
    const collection = resolveCollection(ref);
    if (!collection) throw notFoundError("collection", ref);
    observations.push({
      entity: { kind: "collection", ref },
      version: canonicalCollectionVersion(collection),
    });
  }
  observations.sort((left, right) =>
    JSON.stringify(left.entity).localeCompare(JSON.stringify(right.entity)),
  );
  return observations;
}

function assertCanonicalMutationObservations(
  expected: MutationEntityObservationDto[],
  input: MutationRequestByOperation[MutationOperation],
  excludedEntities: ReadonlySet<string> = new Set(),
) {
  const current = collectCanonicalMutationObservations(input, excludedEntities);
  const remainingExpected = expected.filter(
    ({ entity }) => !excludedEntities.has(mutationObservationEntityKey(entity)),
  );
  if (
    hashSynthesisContractCanonicalJson(current) !==
    hashSynthesisContractCanonicalJson(remainingExpected)
  ) {
    throw preparedMutationStaleError();
  }
}

function currentMutationEntityObservation(entity: MutationEntityRef) {
  if (entity.kind === "item") {
    const ref = canonicalItemRef(entity.ref);
    return {
      entity: { kind: "item" as const, ref },
      version: canonicalItemVersion(requireItem(ref, "mutation target")),
    };
  }
  const ref = canonicalCollectionRef(entity.ref);
  const collection = resolveCollection(ref);
  if (!collection) throw notFoundError("collection", ref);
  return {
    entity: { kind: "collection" as const, ref },
    version: canonicalCollectionVersion(collection),
  };
}

function assertPreparedMutationEntityObservations(
  expected: readonly MutationEntityObservationDto[],
  removedEntities: ReadonlySet<string>,
) {
  const current = expected
    .filter(
      ({ entity }) =>
        !removedEntities.has(mutationObservationEntityKey(entity)),
    )
    .map(({ entity }) => currentMutationEntityObservation(entity));
  const remainingExpected = expected.filter(
    ({ entity }) => !removedEntities.has(mutationObservationEntityKey(entity)),
  );
  if (
    hashSynthesisContractCanonicalJson(current) !==
    hashSynthesisContractCanonicalJson(remainingExpected)
  ) {
    throw preparedMutationStaleError();
  }
}

type CanonicalMutationDomainInput =
  | MutationExecuteRequest
  | MutationPreviewRequestByOperation[MutationPreviewOperation];

function preflightItemUpdateMetadataDomain(
  input: Extract<
    CanonicalMutationDomainInput,
    { operation: "item.updateMetadata" }
  >,
) {
  const itemRef = canonicalItemRef(input.itemRef);
  const fields = input.patch?.fields;
  const creators = input.patch?.creators;
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
  return { itemRef, patch: input.patch };
}

async function preflightCanonicalMutationDomain(
  input: CanonicalMutationDomainInput,
  scope: ZoteroHostMutationCallerScope,
  control?: WorkflowCallControl,
) {
  if (input.operation === "item.create") {
    const itemType = trimText(input.itemType, 128);
    if (!itemType) {
      throw capabilityError(
        "invalid_request",
        "item create request is invalid",
        {
          reason: "invalid_value",
          operation: input.operation,
        },
      );
    }
    await withZoteroHostSlice(control, () => {
      resolveZotero().ItemTypes.getID(itemType);
      const probe = new (resolveZotero().Item as typeof Zotero.Item)(
        itemType as any,
      );
      validateFieldPatch(probe, input.fields || {});
      const libraryId =
        parsePositiveInteger(input.libraryId) || normalizeLibraryId(undefined);
      for (const ref of input.collectionRefs || []) {
        const collection = resolveCollection(canonicalCollectionRef(ref));
        if (!collection) throw notFoundError("collection", ref);
        if (
          normalizeLibraryId(
            (collection as { libraryID?: unknown }).libraryID,
          ) !== libraryId
        ) {
          throw capabilityError(
            "invalid_request",
            "item placement crosses libraries",
            {
              reason: "invalid_combination",
              operation: input.operation,
            },
          );
        }
      }
      for (const ref of input.initialRelatedRefs || []) {
        const related = requireItem(canonicalItemRef(ref), "related item");
        if (
          canonicalItemState(related) !== "active" ||
          normalizeLibraryId(related.libraryID) !== libraryId
        ) {
          throw capabilityError(
            "invalid_request",
            "initial related items are invalid",
            {
              reason: "invalid_combination",
              operation: input.operation,
            },
          );
        }
      }
    });
    return;
  }
  if (input.operation === "item.updateMetadata") {
    const normalized = preflightItemUpdateMetadataDomain(input);
    await withZoteroHostSlice(control, () => {
      const item = requireItem(normalized.itemRef, "item");
      if (item.isNote?.() || item.isAttachment?.() || item.isAnnotation?.()) {
        throw capabilityError("invalid_ref", "item is not a regular item", {
          kind: "item",
          reason: "wrong_kind",
        });
      }
      if (normalized.patch.fields)
        applicableMetadataFieldPatch(item, normalized.patch.fields);
    });
    return;
  }
  if (input.operation === "item.changeType") {
    const normalized = {
      itemRef: canonicalItemRef(input.itemRef),
      targetItemType: trimText(input.targetItemType, 128),
      incompatibleData: input.incompatibleData,
    };
    await withZoteroHostSlice(control, () => {
      const basis = buildItemChangeTypePreview(normalized);
      if (
        normalized.incompatibleData === "reject" &&
        (basis.plan.dropped.length || basis.plan.movedToExtra.length)
      ) {
        throw capabilityError(
          "conflict",
          "incompatible item data prevents conversion",
          {
            reason: "ambiguous_state",
            kind: "item",
          },
        );
      }
    });
    return;
  }
  if (
    input.operation === "item.remove" ||
    input.operation === "collection.remove"
  ) {
    const preview = (
      "operationId" in input ? preparedPreviewInput(input) : input
    ) as
      | MutationPreviewRequestByOperation["item.remove"]
      | MutationPreviewRequestByOperation["collection.remove"];
    await withZoteroHostSlice(control, () =>
      prepareLegacyDestructiveMutation(preview, scope),
    );
    return;
  }
  if (input.operation === "trash.setItemsState") {
    await withZoteroHostSlice(control, () =>
      prepareCanonicalTrashMutation(input as TrashSetItemsStateRequest),
    );
    return;
  }
  if (input.operation === "literature.ingest") {
    await prepareCanonicalLiteratureIngest(input, control);
    return;
  }
  if (input.operation === "statusTags.transition") {
    normalizeStatusTransitionKeys(input.add, "add");
    normalizeStatusTransitionKeys(input.remove, "remove");
    await withZoteroHostSlice(control, () =>
      requireItem(canonicalItemRef(input.itemRef), "status item"),
    );
    return;
  }
  if (isManagedSemanticOperation(input.operation)) {
    const managedRequest = input as ManagedSemanticRequest;
    let prepared: ManagedSemanticPrepared;
    try {
      prepared = normalizeManagedSemanticRequest(managedRequest);
      await preflightManagedSemanticRequest(managedRequest, prepared, control);
    } catch (error) {
      mapManagedOwnerError(error);
    }
    return;
  }
  if (
    input.operation === "notes.create" ||
    input.operation === "notes.updateContent" ||
    input.operation === "notes.remove" ||
    input.operation === "notes.upsertPayload"
  ) {
    const { operation, ...noteRequest } = input;
    const noteCreate =
      operation === "notes.create"
        ? resolveNoteCreateRequest(noteRequest as NoteCreateRequestDto)
        : null;
    if (operation === "notes.create" || operation === "notes.updateContent") {
      normalizeNoteContentInput(
        (noteRequest as NoteCreateRequestDto | NoteUpdateContentRequestDto)
          .content,
      );
    }
    const logicalPayload =
      operation === "notes.upsertPayload"
        ? normalizeLogicalNotePayloadRequest(
            noteRequest as NotePayloadUpsertRequestDto,
          )
        : null;
    if (noteCreate) {
      await withZoteroHostSlice(control, () => {
        if (noteCreate.placement.kind === "child") {
          requireItem(noteCreate.placement.parentRef, "note parent");
        }
      });
      return;
    }
    const noteRef = canonicalItemRef(
      (
        noteRequest as
          | NoteUpdateContentRequestDto
          | NoteRemoveRequestDto
          | NotePayloadUpsertRequestDto
      ).noteRef,
    );
    const note = await withZoteroHostSlice(control, () => requireNote(noteRef));
    if (operation === "notes.updateContent") {
      const detail = await readManagedNoteDetail(
        note,
        { format: "text" },
        {
          readRevision: () => canonicalNoteVersion(note).revision,
        },
      );
      if (detail.kind === "managed") {
        throw capabilityError(
          "conflict",
          "ordinary note content cannot update a managed note",
          { reason: "ambiguous_state", kind: "note" },
        );
      }
    }
    if (logicalPayload) {
      let inspection: Awaited<ReturnType<typeof inspectManagedNote>>;
      try {
        inspection = await inspectManagedNote(note, {
          runNativeSlice: (run) => withZoteroHostSlice(control, run),
          checkCanceled: () => throwIfWorkflowCallCanceled(control),
        });
      } catch (error) {
        mapManagedOwnerError(error);
      }
      if (
        Object.values(MANAGED_NOTE_PAYLOAD_TYPES).some(
          (payloadType) => payloadType === logicalPayload.payloadType,
        )
      ) {
        throw capabilityError(
          "conflict",
          "reserved managed payload requires its semantic owner",
          { reason: "ambiguous_state", kind: "note" },
        );
      }
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
    return;
  }
  if (
    input.operation === "attachments.create" ||
    input.operation === "attachments.updateMetadata" ||
    input.operation === "attachments.replaceFile" ||
    input.operation === "attachments.move" ||
    input.operation === "attachments.remove"
  ) {
    // Attachment execution owns the source and native file lifecycle. Its
    // structural validation is exercised below without a resource primitive.
    await withZoteroHostSlice(control, () => {
      if (input.operation === "attachments.create") {
        if (input.placement.kind === "child") {
          requireItem(
            canonicalItemRef(input.placement.parentRef),
            "parent item",
          );
        } else {
          const libraryId =
            parsePositiveInteger(input.placement.libraryId) ||
            normalizeLibraryId(undefined);
          for (const ref of input.placement.collectionRefs || []) {
            const collection = resolveCollection(canonicalCollectionRef(ref));
            if (!collection) throw notFoundError("collection", ref);
            if (
              normalizeLibraryId(
                (collection as { libraryID?: unknown }).libraryID,
              ) !== libraryId
            ) {
              throw capabilityError(
                "invalid_request",
                "attachment placement crosses libraries",
                { reason: "invalid_combination", operation: input.operation },
              );
            }
          }
        }
      } else {
        const attachment = requireAttachment(
          canonicalItemRef(input.attachmentRef),
        );
        if (attachment.isAnnotation?.() || attachment.isNote?.()) {
          throw capabilityError("invalid_ref", "attachment is invalid", {
            kind: "attachment",
            reason: "wrong_kind",
          });
        }
      }
    });
    return;
  }
  await preflightOtherCanonicalMutationDomain(
    input as Exclude<
      MutationExecuteRequest,
      | { operation: "item.create" }
      | { operation: "item.updateMetadata" }
      | { operation: "item.changeType" }
      | { operation: "collection.remove" }
    >,
    control,
  );
}

async function preflightCanonicalMutationForPublicSurface(
  input: CanonicalMutationDomainInput,
  scope: ZoteroHostMutationCallerScope,
  control?: WorkflowCallControl,
) {
  try {
    await preflightCanonicalMutationDomain(input, scope, control);
  } catch (error) {
    if (error instanceof MutationAuthorityExecutionError) {
      throw new ZoteroHostCapabilityError(
        error.code,
        error.message,
        error.details as WorkflowHostErrorDetailsByCode[WorkflowHostErrorCode],
      );
    }
    if (error instanceof TypeError) {
      throw capabilityError("invalid_request", "mutation request is invalid", {
        reason: "invalid_schema",
      });
    }
    throw error;
  }
}

async function authorityUnavailableMutationResult<
  TResult extends object,
>(args: {
  scope: ZoteroHostMutationCallerScope;
  operationId: string;
  operation: MutationOperation;
  semanticInput: JsonValue;
}) {
  return executeReservedMutation<TResult>({
    ...args,
    async execute() {
      throw new Error("unavailable mutation must not execute");
    },
  });
}

async function withPreparedFileCleanup<TResult>(
  cleanup: (() => Promise<void>) | undefined,
  work: () => Promise<TResult>,
): Promise<TResult> {
  let result!: TResult;
  let hasPrimaryError = false;
  let primaryError: unknown;
  try {
    result = await work();
  } catch (error) {
    hasPrimaryError = true;
    primaryError = error;
  }
  let cleanupFailed = false;
  let cleanupError: unknown;
  if (cleanup) {
    try {
      await cleanup();
    } catch (error) {
      cleanupFailed = true;
      cleanupError = error;
    }
  }
  if (hasPrimaryError) {
    if (!cleanupFailed) throw primaryError;
    if (primaryError instanceof MutationAuthorityExecutionError) {
      const primary = primaryError;
      const residualCount = Math.max(1, primary.residualRefs.length);
      const details =
        primary.code === "execution_failed"
          ? {
              phase: "cleanup" as const,
              recovery: "manual_repair" as const,
              affectedCount: Math.max(
                primary.affectedRefs.length,
                residualCount,
              ),
              residualCount,
            }
          : primary.details;
      throw new MutationAuthorityExecutionError(
        primary.status === "unknown" ? "unknown" : "repair_required",
        primary.code,
        "cleanup",
        "manual_repair",
        details,
        primary.message,
        primary.affectedRefs,
        primary.residualRefs,
      );
    }
    throw new MutationAuthorityExecutionError(
      "repair_required",
      "execution_failed",
      "cleanup",
      "manual_repair",
      {
        phase: "cleanup",
        recovery: "manual_repair",
        affectedCount: 1,
        residualCount: 1,
      },
      primaryError instanceof Error
        ? primaryError.message
        : "Mutation execution failed",
    );
  }
  if (cleanupFailed) {
    throw new MutationAuthorityExecutionError(
      "repair_required",
      "execution_failed",
      "cleanup",
      "manual_repair",
      {
        phase: "cleanup",
        recovery: "manual_repair",
        affectedCount: 1,
        residualCount: 1,
      },
      cleanupError instanceof Error
        ? cleanupError.message
        : "prepared attachment cleanup failed",
    );
  }
  return result;
}

function createCanonicalMutationControl(): ZoteroHostCanonicalMutationControl {
  const records = new WeakMap<object, PreparedCanonicalMutationRecord>();

  return Object.freeze({
    async prepare(args) {
      const input = preparedMutationInput(args.input);
      const replay = await lookupReservedMutation<object>({
        scope: args.scope,
        operationId: args.input.operationId,
        operation: args.input.operation,
        semanticInput: input,
      });
      if (replay.state === "settled") {
        return {
          state: "settled",
          result: replay.result as MutationExecutionResult<
            MutationResultByOperation[typeof args.input.operation]
          >,
        };
      }
      if (replay.state === "unavailable") {
        return {
          state: "settled",
          result: await authorityUnavailableMutationResult<
            MutationResultByOperation[typeof args.input.operation]
          >({
            scope: args.scope,
            operationId: args.input.operationId,
            operation: args.input.operation,
            semanticInput: input,
          }),
        };
      }

      const destructivePrepared = isDestructivePreviewRequest(args.input)
        ? await withZoteroHostSlice(args.control, () =>
            prepareLegacyDestructiveMutation(
              preparedPreviewInput(args.input) as
                | MutationPreviewRequestByOperation["item.changeType"]
                | MutationPreviewRequestByOperation["item.remove"]
                | MutationPreviewRequestByOperation["collection.remove"],
              args.scope,
            ),
          )
        : undefined;
      const trashPrepared =
        args.input.operation === "trash.setItemsState"
          ? await withZoteroHostSlice(args.control, () =>
              prepareCanonicalTrashMutation(
                args.input as TrashSetItemsStateRequest,
              ),
            )
          : undefined;
      const ingestPrepared =
        args.input.operation === "literature.ingest"
          ? await prepareCanonicalLiteratureIngest(
              args.input as LiteratureIngestRequestDto,
              args.control,
            )
          : undefined;
      if (!destructivePrepared && !trashPrepared && !ingestPrepared) {
        await preflightCanonicalMutationForPublicSurface(
          args.input,
          args.scope,
          args.control,
        );
      }
      const observations = destructivePrepared
        ? destructivePrepared.observations
        : trashPrepared
          ? trashPrepared.observations
          : ingestPrepared
            ? ingestPrepared.observations
            : await withZoteroHostSlice(args.control, () =>
                collectCanonicalMutationObservations(args.input),
              );
      const preview = await previewCanonicalMutation(
        preparedPreviewInput(args.input),
        args.scope,
      );
      const preparedStoredAttachment =
        args.input.operation === "attachments.create" ||
        args.input.operation === "attachments.replaceFile"
          ? await args.resources?.deferredStoredAttachment?.prepare(
              args.control,
            )
          : undefined;
      const prepared = Object.freeze({}) as PreparedCanonicalMutation<
        typeof args.input.operation
      >;
      records.set(prepared, {
        operation: args.input.operation,
        scope: canonicalMutationScope(args.scope),
        semanticDigest: hashSynthesisContractCanonicalJson(input),
        observations,
        observationDigest: hashSynthesisContractCanonicalJson(observations),
        planDigest: destructivePrepared
          ? destructivePrepared.planDigest
          : trashPrepared
            ? hashSynthesisContractCanonicalJson(trashPrepared.result)
            : hashSynthesisContractCanonicalJson(preview.plan),
        ...(destructivePrepared ? { destructivePrepared } : {}),
        ...(trashPrepared ? { trashPrepared } : {}),
        ...(ingestPrepared ? { ingestPrepared } : {}),
        expiresAt: Date.now() + PRIVATE_PREPARED_MUTATION_TTL_MS,
        ...(args.resources?.deferredStoredAttachment
          ? {
              deferredStoredAttachment: args.resources.deferredStoredAttachment,
            }
          : {}),
        ...(preparedStoredAttachment
          ? {
              preparedStoredAttachment,
              preparedFileSnapshot: preparedStoredAttachment.snapshot,
            }
          : {}),
        ...(args.resources?.preparedFiles
          ? { preparedFiles: args.resources.preparedFiles }
          : {}),
      });
      return {
        state: "prepared",
        preview: preview as MutationPreviewResult<
          MutationPlanByOperation[typeof args.input.operation]
        >,
        prepared,
      };
    },

    async execute(args) {
      const record = records.get(args.prepared as object);
      if (!record) {
        throw preparedMutationStaleError();
      }
      args.onPreparedFileOwnershipTransferred?.();
      let preparedFileCleanupAttempted = false;
      const releasePreparedFiles = async () => {
        if (!record.preparedFiles || preparedFileCleanupAttempted) return;
        preparedFileCleanupAttempted = true;
        await record.preparedFiles.dispose();
      };
      const withOwnershipCleanup = async <T>(work: () => Promise<T>) => {
        let result!: T;
        let primaryError: unknown;
        try {
          result = await work();
        } catch (error) {
          primaryError = error;
        }
        let cleanupError: unknown;
        try {
          await releasePreparedFiles();
        } catch (error) {
          cleanupError = error;
        }
        if (primaryError !== undefined) throw primaryError;
        if (cleanupError !== undefined) throw cleanupError;
        return result;
      };
      return withOwnershipCleanup(async () => {
        const input = preparedMutationInput(args.input);
        if (
          record.operation !== args.input.operation ||
          record.scope !== canonicalMutationScope(args.scope) ||
          record.semanticDigest !== hashSynthesisContractCanonicalJson(input) ||
          record.expiresAt < Date.now()
        ) {
          throw preparedMutationStaleError();
        }
        const replay = await lookupReservedMutation<object>({
          scope: args.scope,
          operationId: args.input.operationId,
          operation: args.input.operation,
          semanticInput: input,
        });
        if (replay.state === "settled") {
          return replay.result as MutationExecutionResult<
            MutationResultByOperation[typeof args.input.operation]
          >;
        }
        if (replay.state === "unavailable") {
          return authorityUnavailableMutationResult<
            MutationResultByOperation[typeof args.input.operation]
          >({
            scope: args.scope,
            operationId: args.input.operationId,
            operation: args.input.operation,
            semanticInput: input,
          });
        }
        let expectedObservations = record.observations;
        const removedEntities = new Set<string>();
        let destructiveEffectStarted = false;
        let ingestRevalidated = false;
        const refreshExpectedEntities = (
          entities: readonly MutationEntityRef[],
        ) => {
          const refreshed = new Map(
            expectedObservations.map((entry) => [
              mutationObservationEntityKey(entry.entity),
              entry,
            ]),
          );
          for (const entity of entities) {
            const key = mutationObservationEntityKey(entity);
            if (removedEntities.has(key)) continue;
            refreshed.set(key, currentMutationEntityObservation(entity));
          }
          expectedObservations = [...refreshed.values()].sort((left, right) =>
            JSON.stringify(left.entity).localeCompare(
              JSON.stringify(right.entity),
            ),
          );
        };
        const beforeEffect = (async (phase) => {
          if (record.destructivePrepared) {
            if (!destructiveEffectStarted) {
              await revalidateLegacyDestructiveMutation(
                record.destructivePrepared,
                preparedPreviewInput(args.input) as
                  | MutationPreviewRequestByOperation["item.changeType"]
                  | MutationPreviewRequestByOperation["item.remove"]
                  | MutationPreviewRequestByOperation["collection.remove"],
                args.scope,
              );
              if (phase === "effect") destructiveEffectStarted = true;
            } else {
              assertPreparedMutationEntityObservations(
                expectedObservations,
                removedEntities,
              );
            }
            return;
          }
          if (record.ingestPrepared) {
            if (!ingestRevalidated) {
              await revalidateCanonicalLiteratureIngest(
                record.ingestPrepared,
                args.input as LiteratureIngestRequestDto,
                args.control,
              );
              ingestRevalidated = true;
              return;
            }
            assertPreparedMutationEntityObservations(
              expectedObservations,
              removedEntities,
            );
            return;
          }
          if (!record.trashPrepared) {
            assertCanonicalMutationObservations(
              expectedObservations,
              args.input,
            );
          }
        }) as CanonicalMutationEffectGuard;
        beforeEffect.markWritten = (entities) => {
          if (record.trashPrepared) {
            return;
          }
          if (record.destructivePrepared || record.ingestPrepared) {
            refreshExpectedEntities(entities);
            return;
          }
          expectedObservations = collectCanonicalMutationObservations(
            args.input,
          );
        };
        beforeEffect.markRemoved = (entities) => {
          for (const entity of entities) {
            removedEntities.add(mutationObservationEntityKey(entity));
          }
        };

        let primitives: ZoteroHostAttachmentMutationPrimitives = {};
        if (record.preparedStoredAttachment && record.preparedFiles) {
          const resolvedPreparedFile =
            await record.preparedFiles.resolveStoredAttachment(
              record.preparedStoredAttachment,
            );
          const admit = <T>(
            work: () => Promise<T> | T,
            phase: "read" | "effect" = "effect",
          ) =>
            withZoteroHostSlice(args.control, async () => {
              await beforeEffect(phase);
              const result = await work();
              if (phase === "effect") beforeEffect.markWritten([]);
              return result;
            });
          primitives = {
            createStoredFile: async (request, parent) =>
              nativeMutations.attachments.importStoredAttachment({
                prepared: resolvedPreparedFile!,
                parent,
                libraryId: parent
                  ? normalizeLibraryId(parent.libraryID)
                  : request.placement.kind === "top_level"
                    ? parsePositiveInteger(request.placement.libraryId) ||
                      normalizeLibraryId(undefined)
                    : normalizeLibraryId(undefined),
                metadata: request.metadata,
                admit,
              }),
            replaceFile: async (_request, attachment) =>
              nativeMutations.attachments.replaceStoredAttachment({
                prepared: resolvedPreparedFile!,
                attachment,
                admit,
              }),
            cleanupPreparedFile: async () => {
              preparedFileCleanupAttempted = true;
              await resolvedPreparedFile!.cleanup();
            },
          };
        }
        try {
          return (await executeCanonicalMutationEffects(
            args.input,
            args.scope,
            args.control,
            {
              attachmentPrimitives: primitives,
              beforeEffect,
              semanticInput: input,
              ...(record.trashPrepared
                ? { trashPrepared: record.trashPrepared }
                : {}),
              ...(record.ingestPrepared
                ? { ingestPrepared: record.ingestPrepared }
                : {}),
            },
          )) as MutationExecutionResult<
            MutationResultByOperation[typeof args.input.operation]
          >;
        } catch (error) {
          if (
            record.preparedStoredAttachment &&
            !preparedFileCleanupAttempted
          ) {
            preparedFileCleanupAttempted = true;
            await record.preparedFiles?.dispose();
          }
          throw error;
        }
      });
    },
  }) as ZoteroHostCanonicalMutationControl;
}

export function getZoteroHostCanonicalMutationControl(
  broker: ZoteroHostCapabilityBroker,
) {
  const control = canonicalMutationControls.get(broker);
  if (!control) {
    throw new Error("Broker does not own a canonical mutation control");
  }
  return control;
}

async function executeCanonicalMutationLifecycle(
  broker: ZoteroHostCapabilityBroker,
  input: MutationExecuteRequest,
  scope: ZoteroHostMutationCallerScope,
  control?: WorkflowCallControl,
): Promise<MutationExecutionResult<JsonObject>> {
  try {
    const trusted = getZoteroHostCanonicalMutationControl(broker);
    const prepared = await trusted.prepare({ input, scope, control });
    if (prepared.state === "settled") {
      return prepared.result;
    }
    return await trusted.execute({
      input,
      scope,
      prepared: prepared.prepared,
      control,
    });
  } catch (error) {
    if (error instanceof MutationAuthorityAdmissionError) {
      throw mutationAdmissionError(error);
    }
    if (error instanceof MutationAuthorityExecutionError) {
      throw new ZoteroHostCapabilityError(
        error.code,
        error.message,
        error.details as WorkflowHostErrorDetailsByCode[WorkflowHostErrorCode],
      );
    }
    if (error instanceof TypeError) {
      if (/exceeds|too large|limit/i.test(error.message)) {
        throw capabilityError(
          "resource_limited",
          "mutation request exceeds a resource limit",
          { resource: "characters", limit: 1_048_576, observed: 1_048_577 },
        );
      }
      throw capabilityError("invalid_request", "mutation request is invalid", {
        reason: "invalid_schema",
      });
    }
    throw error;
  }
}

async function executeManagedSemanticMutation(
  broker: ZoteroHostCapabilityBroker,
  request:
    | ManagedNoteWriteRequestDto
    | LiteratureDigestUpsertRequestDto
    | LiteratureReferencesUpsertRequestDto
    | LiteratureCitationAnalysisUpsertRequestDto
    | LiteratureScoreUpsertRequestDto,
  kind: ManagedNoteKind,
  scope: ZoteroHostMutationCallerScope,
  control?: WorkflowCallControl,
): Promise<MutationExecutionResult<JsonObject>> {
  const operation: ManagedSemanticOperation =
    kind === "custom"
      ? "managed_note.write_custom"
      : kind === "conversation-note"
        ? "managed_note.write_conversation"
        : kind === "digest"
          ? "literature_artifact.upsert_digest"
          : kind === "references"
            ? "literature_artifact.upsert_references"
            : kind === "citation-analysis"
              ? "literature_artifact.upsert_citation_analysis"
              : "literature_artifact.upsert_score";
  return executeCanonicalMutationLifecycle(
    broker,
    { ...request, operation } as MutationExecuteRequest,
    scope,
    control,
  );
}

function logicalPayloadFromTransferValue(
  value: NotePayloadValueDto,
): LogicalNotePayloadDto {
  if (value.summary.state !== "available") {
    throw capabilityError(
      "execution_failed",
      "managed note auxiliary payload could not be transferred",
      { phase: "read", recovery: "retry_same_operation" },
    );
  }
  assertWorkflowHostStrictJsonValue(value.value);
  return {
    payloadType: value.summary.payloadType,
    noteKind: value.summary.noteKind,
    schemaVersion: value.summary.version,
    format: value.summary.format,
    value: value.value,
  };
}

type PreparedLegacyMigrationCleanup = {
  notes: Array<{
    ref: ZoteroHostItemRefInput;
    note: Zotero.Item;
    before: ReturnType<typeof canonicalNoteVersion>;
    cleanHtml: string;
  }>;
  payloadRefs: ZoteroHostItemRefInput[];
  preparedTrash: PreparedHostTrashMutation[];
};

type LegacyMigrationCleanupExecution = {
  changes: MutationChangeDto[];
  cleanedNoteRefs: ZoteroHostItemRefInput[];
  trashedPayloadRefs: ZoteroHostItemRefInput[];
};

function normalizeLegacyMigrationCleanupPlan(
  input: LegacyMigrationCleanupPlan,
): LegacyMigrationCleanupPlan {
  if (
    !input ||
    !Array.isArray(input.notes) ||
    !Array.isArray(input.payloadRefs)
  ) {
    throw capabilityError(
      "invalid_request",
      "migration cleanup plan is invalid",
      { reason: "invalid_schema", field: "migrationCleanup" },
    );
  }
  const noteRefs = new Set<string>();
  const notes = input.notes.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw capabilityError(
        "invalid_request",
        "migration cleanup note is invalid",
        { reason: "invalid_schema", field: `migrationCleanup.notes.${index}` },
      );
    }
    const ref = canonicalItemRef(entry.ref);
    const identity = `${ref.libraryId}:${ref.key}`;
    if (noteRefs.has(identity)) {
      throw capabilityError(
        "conflict",
        "migration cleanup note is duplicated",
        { reason: "ambiguous_state", kind: "note" },
      );
    }
    noteRefs.add(identity);
    const expectedRevision = trimText(entry.expectedRevision, 256);
    if (!expectedRevision || typeof entry.cleanHtml !== "string") {
      throw capabilityError(
        "invalid_request",
        "migration cleanup note facts are invalid",
        { reason: "invalid_schema", field: `migrationCleanup.notes.${index}` },
      );
    }
    const bytes = new TextEncoder().encode(entry.cleanHtml).byteLength;
    if (bytes > MANAGED_NOTE_RESULT_LIMIT) {
      throw capabilityError(
        "resource_limited",
        "legacy note HTML is too large",
        {
          resource: "characters",
          limit: MANAGED_NOTE_RESULT_LIMIT,
          observed: bytes,
        },
      );
    }
    return { ref, expectedRevision, cleanHtml: entry.cleanHtml };
  });
  const payloadRefs = [
    ...new Map(
      input.payloadRefs.map((entry) => {
        const ref = canonicalItemRef(entry);
        return [`${ref.libraryId}:${ref.key}`, ref] as const;
      }),
    ).values(),
  ];
  const identities = new Set([
    ...notes.map((entry) => `${entry.ref.libraryId}:${entry.ref.key}`),
    ...payloadRefs.map((entry) => `${entry.libraryId}:${entry.key}`),
  ]);
  const libraries = new Set([
    ...notes.map((entry) => entry.ref.libraryId),
    ...payloadRefs.map((entry) => entry.libraryId),
  ]);
  if (libraries.size > 1) {
    throw capabilityError(
      "invalid_request",
      "migration cleanup scope spans multiple libraries",
      { reason: "invalid_combination", field: "migrationCleanup" },
    );
  }
  if (identities.size > 100) {
    throw capabilityError(
      "resource_limited",
      "migration cleanup scope exceeds its bounded native slice",
      { resource: "items", limit: 100, observed: identities.size },
    );
  }
  return { notes, payloadRefs };
}

async function prepareLegacyMigrationCleanup(
  input: LegacyMigrationCleanupPlan,
  operationId: string,
  control?: WorkflowCallControl,
): Promise<PreparedLegacyMigrationCleanup> {
  const sliceSize = 25;
  const notes: PreparedLegacyMigrationCleanup["notes"] = [];
  for (let offset = 0; offset < input.notes.length; offset += sliceSize) {
    const page = input.notes.slice(offset, offset + sliceSize);
    const preparedPage = await withZoteroHostSlice(control, () =>
      page.map((entry) => {
        const note = requireNote(entry.ref);
        const before = canonicalNoteVersion(note);
        if (before.revision !== entry.expectedRevision) {
          throw new MutationAuthorityExecutionError(
            "failed",
            "conflict",
            "read",
            "refresh_and_retry_new_operation",
            { reason: "revision_mismatch", kind: "note" },
            "legacy note changed before migration cleanup",
            [{ kind: "item", ref: canonicalItemRef(note) }],
          );
        }
        return {
          ref: canonicalItemRef(note),
          note,
          before,
          cleanHtml: entry.cleanHtml,
        };
      }),
    );
    notes.push(...preparedPage);
  }
  const preparedTrash: PreparedHostTrashMutation[] = [];
  for (let offset = 0; offset < input.payloadRefs.length; offset += sliceSize) {
    const itemRefs = input.payloadRefs.slice(offset, offset + sliceSize);
    preparedTrash.push(
      await withZoteroHostSlice(control, () =>
        prepareCanonicalTrashMutation({
          operation: "trash.setItemsState",
          // This is an internal request inside the parent-set authority. It
          // deliberately reuses the parent-set identity; no receipt is made.
          operationId,
          itemRefs,
          state: "trashed",
        }),
      ),
    );
  }
  return {
    notes,
    payloadRefs: input.payloadRefs,
    preparedTrash,
  };
}

async function executeLegacyMigrationCleanupDirect(
  prepared: PreparedLegacyMigrationCleanup,
  control?: WorkflowCallControl,
): Promise<LegacyMigrationCleanupExecution> {
  const changes: MutationChangeDto[] = [];
  // Each note is one bounded Host slice. The outer authority identity remains
  // the same even though the local native work yields between notes.
  for (const plan of prepared.notes) {
    const change = await withZoteroHostSlice(control, async () => {
      const note = requireNote(plan.ref);
      const current = canonicalNoteVersion(note);
      if (current.revision !== plan.before.revision) {
        throw new MutationAuthorityExecutionError(
          "failed",
          "conflict",
          "read",
          "refresh_and_retry_new_operation",
          { reason: "revision_mismatch", kind: "note" },
          "legacy note changed before migration cleanup",
          [{ kind: "item", ref: plan.ref }],
        );
      }
      if (String(note.getNote?.() || "") !== plan.cleanHtml) {
        await updateNoteContentDirect(note, plan.cleanHtml);
      }
      const after = canonicalNoteVersion(note);
      return {
        entity: { kind: "item" as const, ref: plan.ref },
        effect:
          after.revision === plan.before.revision
            ? ("unchanged" as const)
            : ("updated" as const),
        before: plan.before,
        after,
      } satisfies MutationChangeDto;
    });
    changes.push(change);
  }
  for (const preparedTrash of prepared.preparedTrash) {
    const trash = await withZoteroHostSlice(control, () =>
      executeHostTrashMutation(preparedTrash, {
        resolve: resolveItem,
        version: canonicalItemVersion,
      }),
    );
    changes.push(...trash.changes);
  }
  return {
    changes,
    cleanedNoteRefs: prepared.notes.map((entry) => entry.ref),
    trashedPayloadRefs: prepared.payloadRefs,
  };
}

function migrationCleanupRepairError(
  error: unknown,
  plans: ReadonlyArray<{ note: Zotero.Item | null }>,
  cleanup: LegacyMigrationCleanupPlan,
): MutationAuthorityExecutionError {
  const affectedRefs: MutationEntityRef[] = [
    ...plans.flatMap((plan) =>
      plan.note
        ? [{ kind: "item" as const, ref: canonicalItemRef(plan.note) }]
        : [],
    ),
    ...cleanup.notes.map((entry) => ({
      kind: "item" as const,
      ref: entry.ref,
    })),
    ...cleanup.payloadRefs.map((ref) => ({ kind: "item" as const, ref })),
  ];
  const residualRefs =
    error instanceof MutationAuthorityExecutionError ? error.residualRefs : [];
  return new MutationAuthorityExecutionError(
    "repair_required",
    "execution_failed",
    "cleanup",
    "manual_repair",
    {
      phase: "cleanup",
      recovery: "manual_repair",
      affectedCount: affectedRefs.length,
      ...(residualRefs.length ? { residualCount: residualRefs.length } : {}),
    },
    error instanceof Error
      ? error.message
      : "legacy migration cleanup requires repair",
    affectedRefs,
    residualRefs,
  );
}

/**
 * Trusted local composition seam used by bundle/migration owners. It keeps a
 * single authority identity while applying the supplied semantic note set.
 * Public Workflow/Bridge projections never expose this route.
 */
async function executeManagedParentSetMutation(
  _broker: ZoteroHostCapabilityBroker,
  input: ManagedParentSetSemanticInput & { operationId: string },
  scope: ZoteroHostMutationCallerScope,
  control?: WorkflowCallControl,
): Promise<MutationExecutionResult<LiteratureArtifactApplyAnalysisResultDto>> {
  // This is a private composition seam.  Its durable authority identity must
  // describe the whole parent-set commit, rather than whichever public
  // operation happens to be present in the set.  The operation is deliberately
  // absent from MutationOperation/preview/request projections, so workflows
  // cannot expose it as a seventh wire mutation.
  const operation: WorkflowHostMutationReceiptOperation =
    "managed_note.apply_parent_set";
  const migrationCleanup = input.migrationCleanup
    ? normalizeLegacyMigrationCleanupPlan(input.migrationCleanup)
    : undefined;
  const semanticInput = strictJsonObject({
    parentRef: input.parentRef,
    ...(input.entries ? { entries: input.entries } : {}),
    ...(input.references ? { references: input.references } : {}),
    ...(input.citationAnalysis
      ? { citationAnalysis: input.citationAnalysis }
      : {}),
    ...(input.matchingMetadata
      ? { matchingMetadata: input.matchingMetadata }
      : {}),
    ...(input.sourceRef ? { sourceRef: input.sourceRef } : {}),
    ...(input.preparedImage ? { preparedImage: input.preparedImage } : {}),
    ...(input.imageAltText ? { imageAltText: input.imageAltText } : {}),
    ...(migrationCleanup
      ? {
          migrationCleanup: {
            notes: migrationCleanup.notes.map((note) => ({
              ref: note.ref,
              expectedRevision: note.expectedRevision,
              cleanHtml: note.cleanHtml,
            })),
            payloadRefs: migrationCleanup.payloadRefs,
          },
        }
      : {}),
  });
  assertWorkflowHostStrictJsonValue(semanticInput);
  try {
    return await executeReservedMutation<LiteratureArtifactApplyAnalysisResultDto>(
      {
        scope,
        operationId: trimText(input.operationId, 129),
        operation,
        semanticInput,
        control,
        preflight: async () => {
          await withZoteroHostSlice(control, () => {
            const parent = requireItem(input.parentRef, "artifact parent");
            if (
              parent.isNote?.() ||
              parent.isAttachment?.() ||
              parent.isAnnotation?.()
            ) {
              throw invalidRefError(
                "item",
                "wrong_kind",
                "artifact parent must be a regular item",
              );
            }
            const db = (
              resolveZotero() as unknown as {
                DB?: { executeTransaction?: unknown };
              }
            ).DB;
            if (typeof db?.executeTransaction !== "function") {
              throw capabilityError(
                "unavailable",
                "Zotero transaction support is unavailable",
                {
                  reason: "capability",
                  kind: "note",
                },
              );
            }
            if (input.sourceRef) {
              const parentRef = canonicalItemRef(input.parentRef);
              const sourceRef = canonicalItemRef(input.sourceRef);
              if (sourceRef.libraryId !== parentRef.libraryId) {
                throw capabilityError(
                  "invalid_request",
                  "digest source reference must use the parent library",
                  { reason: "invalid_combination", field: "sourceRef" },
                );
              }
            }
            if (
              input.imageAltText !== undefined &&
              (typeof input.imageAltText !== "string" ||
                !input.imageAltText.trim() ||
                input.imageAltText.length > 4096)
            ) {
              throw capabilityError(
                "invalid_request",
                "representative image alt text is invalid",
                { reason: "invalid_value", field: "imageAltText" },
              );
            }
          });
          if (input.references) {
            const validated = validateSourceReferenceArtifact(input.references);
            if (!validated.ok) {
              throw capabilityError(
                "invalid_request",
                "references artifact is invalid",
                {
                  reason: "invalid_value",
                  field: "references",
                },
              );
            }
          }
          if (input.citationAnalysis) {
            const validated = validateCitationAnalysisArtifact(
              input.citationAnalysis,
            );
            if (!validated.ok) {
              throw capabilityError(
                "invalid_request",
                "citation analysis artifact is invalid",
                {
                  reason: "invalid_value",
                  field: "citationAnalysis",
                },
              );
            }
          }
          if (input.references && input.citationAnalysis) {
            const valid = validateCitationAgainstReferences(
              input.citationAnalysis,
              input.references,
            );
            if (!valid.ok) {
              throw capabilityError(
                "conflict",
                "citation analysis references are stale",
                {
                  reason: "basis_mismatch",
                  kind: "note",
                },
              );
            }
          }
          if (input.citationAnalysis && !input.references) {
            const refs = await managedSingleton(
              input.parentRef,
              "references",
              control,
            );
            if (!refs.inspection || refs.inspection.kind !== "managed") {
              throw capabilityError(
                "conflict",
                "citation analysis requires references",
                {
                  reason: "basis_mismatch",
                  kind: "note",
                },
              );
            }
            const valid = validateCitationAgainstReferences(
              input.citationAnalysis,
              refs.inspection.payload as unknown as SourceReferenceArtifact,
            );
            if (!valid.ok) {
              throw capabilityError(
                "conflict",
                "citation analysis references are stale",
                {
                  reason: "basis_mismatch",
                  kind: "note",
                },
              );
            }
          }
        },
        execute: async () => {
          try {
            const entries = [...(input.entries || [])];
            if (input.references) {
              entries.push({
                noteKind: "references",
                title: "References",
                payload: input.references as unknown as JsonValue,
              });
            }
            if (input.citationAnalysis) {
              let citationPayload: JsonValue =
                input.citationAnalysis as unknown as JsonValue;
              if (input.references) {
                citationPayload = attachReferencesBasis(
                  input.citationAnalysis,
                  hashSynthesisContractCanonicalJson(input.references),
                ) as unknown as JsonValue;
              } else {
                const refs = await managedSingleton(
                  input.parentRef,
                  "references",
                  control,
                );
                if (refs.inspection?.kind === "managed") {
                  citationPayload = attachReferencesBasis(
                    input.citationAnalysis,
                    hashSynthesisContractCanonicalJson(refs.inspection.payload),
                  ) as unknown as JsonValue;
                }
              }
              entries.push({
                noteKind: "citation-analysis",
                title: "Citation Analysis",
                payload: citationPayload,
              });
            }
            if (entries.length === 0) {
              throw capabilityError(
                "invalid_request",
                "parent set has no semantic entries",
                {
                  reason: "missing_field",
                  field: "entries",
                },
              );
            }

            type ParentSetEntry = NonNullable<
              ManagedParentSetSemanticInput["entries"]
            >[number];
            type PreparedParentSetEntry = {
              entry: ParentSetEntry;
              content: string;
              payload: LogicalNotePayloadDto;
              parent: Zotero.Item;
              note: Zotero.Item | null;
              before: ReturnType<typeof canonicalNoteVersion> | null;
              beforeHtml: string;
              beforeTags: string[];
              payloadBlocks: ZoteroNotePayloadBlock[];
              legacyPayloadBlocks: ZoteroNotePayloadBlock[];
              auxiliaryPayloads: Array<{
                payload: LogicalNotePayloadDto;
                blocks: ZoteroNotePayloadBlock[];
              }>;
              imageContent?: string;
              imageBindings?: ResolvedNoteImageBinding[];
              stagedImageFiles?: ReadonlyMap<
                string,
                PreparedNativeAttachmentFile
              >;
              stagedPayloadFiles?: ReadonlyMap<
                string,
                PreparedNativeAttachmentFile
              >;
            };

            const singletonKinds = new Set<ManagedNoteKind>([
              "digest",
              "references",
              "citation-analysis",
              "literature-score",
            ]);
            const seenKinds = new Set<ManagedNoteKind>();
            const plans: PreparedParentSetEntry[] = [];
            let referencesBasis: string | undefined;
            let dependentStale = false;
            const referenceEntry = entries.find(
              (entry) => entry.noteKind === "references",
            );
            const citationEntryIndex = entries.findIndex(
              (entry) => entry.noteKind === "citation-analysis",
            );
            let referencePayload: SourceReferenceArtifact | undefined;
            if (referenceEntry) {
              const validated = validateSourceReferenceArtifact(
                referenceEntry.payload,
              );
              if (!validated.ok) {
                throw capabilityError(
                  "invalid_request",
                  "references artifact is invalid",
                  {
                    reason: "invalid_schema",
                    field: "entries.payload",
                  },
                );
              }
              referencePayload = validated.value;
              referencesBasis =
                hashSynthesisContractCanonicalJson(referencePayload);
              if (citationEntryIndex < 0) {
                const existingCitation = await managedSingleton(
                  input.parentRef,
                  "citation-analysis",
                  control,
                );
                if (existingCitation.inspection?.kind === "managed") {
                  const existingPayload = existingCitation.inspection
                    .payload as Record<string, unknown>;
                  dependentStale =
                    existingPayload.referencesBasis !== referencesBasis;
                }
              }
            }
            if (citationEntryIndex >= 0) {
              const citationEntry = entries[citationEntryIndex];
              const raw = citationEntry.payload as Record<string, unknown>;
              const { referencesBasis: _storedBasis, ...canonical } =
                raw && typeof raw === "object" && !Array.isArray(raw)
                  ? raw
                  : { value: raw };
              const validated = validateCitationAnalysisArtifact(canonical);
              if (!validated.ok) {
                throw capabilityError(
                  "invalid_request",
                  "citation analysis artifact is invalid",
                  { reason: "invalid_schema", field: "entries.payload" },
                );
              }
              let refsForCitation = referencePayload;
              if (!refsForCitation) {
                const existingReferences = await managedSingleton(
                  input.parentRef,
                  "references",
                  control,
                );
                if (existingReferences.inspection?.kind !== "managed") {
                  throw capabilityError(
                    "conflict",
                    "citation analysis requires references",
                    {
                      reason: "basis_mismatch",
                      kind: "note",
                    },
                  );
                }
                const validatedReferences = validateSourceReferenceArtifact(
                  existingReferences.inspection.payload,
                );
                if (!validatedReferences.ok) {
                  throw capabilityError(
                    "invalid_request",
                    "stored references artifact is invalid",
                    { reason: "invalid_schema", field: "references" },
                  );
                }
                refsForCitation = validatedReferences.value;
              }
              const valid = validateCitationAgainstReferences(
                validated.value,
                refsForCitation,
              );
              if (!valid.ok) {
                throw capabilityError(
                  "conflict",
                  "citation analysis references are stale",
                  {
                    reason: "basis_mismatch",
                    kind: "note",
                  },
                );
              }
              referencesBasis =
                hashSynthesisContractCanonicalJson(refsForCitation);
              entries[citationEntryIndex] = {
                ...citationEntry,
                payload: attachReferencesBasis(
                  validated.value,
                  referencesBasis,
                ) as unknown as JsonValue,
              };
            }
            for (const entry of entries) {
              const artifactKind = entry.noteKind;
              if (!MANAGED_NOTE_PAYLOAD_TYPES[artifactKind]) {
                throw capabilityError(
                  "invalid_request",
                  "managed note kind is invalid",
                  {
                    reason: "invalid_value",
                    field: "entries.noteKind",
                  },
                );
              }
              if (
                singletonKinds.has(artifactKind) &&
                seenKinds.has(artifactKind)
              ) {
                throw capabilityError(
                  "conflict",
                  "managed parent set contains duplicate note kinds",
                  {
                    reason: "ambiguous_state",
                    kind: "note",
                  },
                );
              }
              if (singletonKinds.has(artifactKind)) seenKinds.add(artifactKind);
              if (typeof entry.title !== "string" || !entry.title.trim()) {
                throw capabilityError(
                  "invalid_request",
                  "managed note title is invalid",
                  {
                    reason: "invalid_value",
                    field: "entries.title",
                  },
                );
              }
              assertWorkflowHostStrictJsonValue(entry.payload);
              if (artifactKind === "references") {
                const validated = validateSourceReferenceArtifact(
                  entry.payload,
                );
                if (!validated.ok) {
                  throw capabilityError(
                    "invalid_request",
                    "references artifact is invalid",
                    {
                      reason: "invalid_schema",
                      field: "entries.payload",
                    },
                  );
                }
              } else if (artifactKind === "citation-analysis") {
                const raw = entry.payload as Record<string, unknown>;
                const { referencesBasis: _referencesBasis, ...canonical } =
                  raw && typeof raw === "object" && !Array.isArray(raw)
                    ? raw
                    : { value: raw };
                const validated = validateCitationAnalysisArtifact(canonical);
                if (!validated.ok) {
                  throw capabilityError(
                    "invalid_request",
                    "citation analysis artifact is invalid",
                    {
                      reason: "invalid_schema",
                      field: "entries.payload",
                    },
                  );
                }
              } else if (artifactKind === "literature-score") {
                const validated = validateLiteratureScoreArtifact(
                  entry.payload,
                );
                if (!validated.ok) {
                  throw capabilityError(
                    "invalid_request",
                    "literature score artifact is invalid",
                    {
                      reason: "invalid_schema",
                      field: "entries.payload",
                    },
                  );
                }
              }
              let built: { content: string; payload: LogicalNotePayloadDto };
              if (
                artifactKind === "custom" ||
                artifactKind === "conversation-note"
              ) {
                const semantic = entry.payload as {
                  title?: unknown;
                  markdown?: unknown;
                };
                built = managedMarkdownPayload(
                  artifactKind,
                  entry.title || String(semantic.title || "Note"),
                  String(semantic.markdown || ""),
                );
              } else {
                built = managedArtifactContent(
                  artifactKind as Exclude<
                    ManagedNoteKind,
                    "custom" | "conversation-note"
                  >,
                  entry.title,
                  entry.payload,
                );
              }
              const migrationTarget = entry.migrationSourceRef
                ? await withZoteroHostSlice(control, () => {
                    const parent = requireItem(input.parentRef, "note parent");
                    const target = requireNote(entry.migrationSourceRef);
                    const targetParentId = Number(
                      (
                        target as unknown as {
                          parentID?: unknown;
                          parentItemID?: unknown;
                        }
                      ).parentID ||
                        (target as unknown as { parentItemID?: unknown })
                          .parentItemID ||
                        0,
                    );
                    if (!targetParentId) {
                      throw capabilityError(
                        "invalid_request",
                        "migration target note has no parent",
                        {
                          reason: "invalid_value",
                          field: "entries.migrationSourceRef",
                        },
                      );
                    }
                    if (targetParentId !== Number(parent.id)) {
                      throw capabilityError(
                        "conflict",
                        "migration target note belongs to a different parent",
                        { reason: "basis_mismatch", kind: "note" },
                      );
                    }
                    return { parent, note: target, inspection: null };
                  })
                : null;
              const singleton =
                migrationTarget ||
                (artifactKind === "custom" ||
                artifactKind === "conversation-note"
                  ? {
                      parent: await withZoteroHostSlice(control, () =>
                        requireItem(input.parentRef, "note parent"),
                      ),
                      note: null,
                      inspection: null,
                    }
                  : await managedSingleton(
                      input.parentRef,
                      artifactKind,
                      control,
                    ));
              const note = singleton.note;
              const before = note
                ? await withZoteroHostSlice(control, () =>
                    canonicalNoteVersion(note),
                  )
                : null;
              const beforeHtml = note
                ? await withZoteroHostSlice(control, () =>
                    String(note.getNote?.() || ""),
                  )
                : "";
              const beforeTags = note
                ? await withZoteroHostSlice(control, () => getTags(note))
                : [];
              if (
                entry.tags !== undefined &&
                (!Array.isArray(entry.tags) ||
                  entry.tags.some((tag) => typeof tag !== "string"))
              ) {
                throw capabilityError(
                  "invalid_request",
                  "managed note tags are invalid",
                  {
                    reason: "invalid_type",
                    field: "entries.tags",
                  },
                );
              }
              if (
                entry.visibleHtml !== undefined &&
                typeof entry.visibleHtml !== "string"
              ) {
                throw capabilityError(
                  "invalid_request",
                  "managed note visibleHtml is invalid",
                  {
                    reason: "invalid_type",
                    field: "entries.visibleHtml",
                  },
                );
              }
              if (entry.embeddedImages !== undefined) {
                assertWorkflowHostStrictJsonValue(
                  entry.embeddedImages as unknown as JsonValue,
                );
                if (
                  !Array.isArray(entry.embeddedImages) ||
                  entry.embeddedImages.some(
                    (image) =>
                      !image ||
                      typeof image.slot !== "string" ||
                      !image.slot.trim() ||
                      !image.preparedImage ||
                      image.preparedImage.kind !== "prepared_note_image" ||
                      typeof image.preparedImage.id !== "string" ||
                      !image.preparedImage.id.trim(),
                  )
                ) {
                  throw capabilityError(
                    "invalid_request",
                    "embedded images are invalid",
                    {
                      reason: "invalid_schema",
                      field: "entries.embeddedImages",
                    },
                  );
                }
              }
              const auxiliaryPayloads = (entry.auxiliaryPayloads || [])
                .map(logicalPayloadFromTransferValue)
                .filter(
                  (payload) =>
                    payload.payloadType !== built.payload.payloadType,
                );
              const auxiliaryPayloadTypes = new Set<string>();
              for (const payload of auxiliaryPayloads) {
                if (auxiliaryPayloadTypes.has(payload.payloadType)) {
                  throw capabilityError(
                    "conflict",
                    "auxiliary payload type is duplicated",
                    { reason: "ambiguous_state", kind: "note" },
                  );
                }
                auxiliaryPayloadTypes.add(payload.payloadType);
              }
              const payloadTypes = new Set<string>([
                built.payload.payloadType,
                ...auxiliaryPayloadTypes,
                ...(input.matchingMetadata && artifactKind === "digest"
                  ? ["literature-matching-metadata-json"]
                  : []),
              ]);
              const declaredPayloadSlots = new Set<string>();
              if (entry.payloadImageSlots !== undefined) {
                if (!Array.isArray(entry.payloadImageSlots)) {
                  throw capabilityError(
                    "invalid_request",
                    "payload image slots are invalid",
                    {
                      reason: "invalid_type",
                      field: "entries.payloadImageSlots",
                    },
                  );
                }
                for (const [
                  index,
                  payloadSlot,
                ] of entry.payloadImageSlots.entries()) {
                  if (
                    !payloadSlot ||
                    typeof payloadSlot.slot !== "string" ||
                    !NOTE_IMAGE_SLOT_PATTERN.test(payloadSlot.slot.trim()) ||
                    typeof payloadSlot.payloadType !== "string" ||
                    !payloadTypes.has(payloadSlot.payloadType.trim())
                  ) {
                    throw capabilityError(
                      "invalid_request",
                      "payload image slot is invalid",
                      {
                        reason: "invalid_schema",
                        field: `entries.payloadImageSlots.${index}`,
                      },
                    );
                  }
                  const key = `${payloadSlot.payloadType.trim()}\n${payloadSlot.slot.trim()}`;
                  if (declaredPayloadSlots.has(key)) {
                    throw capabilityError(
                      "conflict",
                      "payload image slot is duplicated",
                      { reason: "ambiguous_state", kind: "note" },
                    );
                  }
                  declaredPayloadSlots.add(key);
                }
              }
              let plannedContent =
                entry.visibleHtml !== undefined
                  ? entry.visibleHtml
                  : built.content;
              if (
                input.preparedImage &&
                artifactKind === "digest" &&
                !/data-zs-block\s*=\s*["']representative-image["']/iu.test(
                  plannedContent,
                )
              ) {
                const marker = `<div data-zs-block="representative-image" data-zs-version="1" data-zs-representative_image_status="pending"><figure data-zs-block="representative-image-figure"><img data-zotero-agents-image-slot="representative" alt="${escapeAttribute(input.imageAltText || "Representative image")}"></figure></div>`;
                plannedContent = /<\/div>\s*$/iu.test(plannedContent)
                  ? plannedContent.replace(/<\/div>\s*$/iu, `${marker}</div>`)
                  : `${plannedContent}${marker}`;
              }
              if (input.sourceRef && artifactKind === "digest") {
                const marker = `<span data-zs-block="meta" data-zs-meta="source-attachment" data-zs-source_attachment_item_key="${escapeAttribute(input.sourceRef.key)}" data-zs-source_attachment_library_id="${input.sourceRef.libraryId}"></span>`;
                plannedContent =
                  /<[^>]*data-zs-meta\s*=\s*["']source-attachment["'][^>]*>/iu.test(
                    plannedContent,
                  )
                    ? plannedContent.replace(
                        /<[^>]*data-zs-meta\s*=\s*["']source-attachment["'][^>]*>/iu,
                        marker,
                      )
                    : `${plannedContent}${marker}`;
              }
              const discoveredPayloadSlots = payloadImageSlotKeys(
                plannedContent,
                payloadTypes,
              );
              if (
                declaredPayloadSlots.size > 0 &&
                (discoveredPayloadSlots.size !== declaredPayloadSlots.size ||
                  [...declaredPayloadSlots].some(
                    (slot) => !discoveredPayloadSlots.has(slot),
                  ) ||
                  [...discoveredPayloadSlots].some(
                    (slot) => !declaredPayloadSlots.has(slot),
                  ))
              ) {
                throw capabilityError(
                  "conflict",
                  "payload image slots do not match the note content",
                  { reason: "ambiguous_state", kind: "note" },
                );
              }
              const payloadSlotsToStrip =
                declaredPayloadSlots.size > 0
                  ? declaredPayloadSlots
                  : discoveredPayloadSlots;
              plannedContent = stripPayloadImageSlots(
                plannedContent,
                payloadTypes,
                payloadSlotsToStrip,
              );
              const payloadImageSlotNames = new Set(
                [...payloadSlotsToStrip].map((key) =>
                  key.slice(key.indexOf("\n") + 1),
                ),
              );
              const imageContent =
                input.preparedImage && artifactKind === "digest"
                  ? normalizeNoteContentInput(
                      {
                        format: "html",
                        value: plannedContent,
                        embeddedImages: [
                          {
                            slot: "representative",
                            preparedImage: input.preparedImage,
                            altText:
                              input.imageAltText || "Representative image",
                          },
                        ],
                      },
                      { allowManagedMarkers: true },
                    )
                  : entry.embeddedImages && entry.embeddedImages.length > 0
                    ? normalizeNoteContentInput(
                        {
                          format: "html",
                          value: plannedContent,
                          embeddedImages: entry.embeddedImages.filter(
                            (image) => !payloadImageSlotNames.has(image.slot),
                          ),
                        },
                        { allowManagedMarkers: true },
                      )
                    : undefined;
              const preparedAuxiliaryPayloads = auxiliaryPayloads.map(
                (payload) => ({
                  payload,
                  blocks: [] as ZoteroNotePayloadBlock[],
                }),
              );
              if (input.matchingMetadata && artifactKind === "digest") {
                if (
                  auxiliaryPayloadTypes.has("literature-matching-metadata-json")
                ) {
                  throw capabilityError(
                    "conflict",
                    "matching metadata payload is duplicated",
                    { reason: "ambiguous_state", kind: "note" },
                  );
                }
                preparedAuxiliaryPayloads.push({
                  payload: {
                    payloadType: "literature-matching-metadata-json",
                    noteKind: "digest",
                    schemaVersion: "literature_matching_metadata.v1",
                    format: "json",
                    value: input.matchingMetadata,
                  },
                  blocks: [],
                });
              }
              plans.push({
                entry,
                content: plannedContent,
                payload: built.payload,
                parent: singleton.parent,
                note,
                before,
                beforeHtml,
                beforeTags,
                payloadBlocks: [],
                legacyPayloadBlocks: [],
                auxiliaryPayloads: preparedAuxiliaryPayloads,
                ...(imageContent
                  ? {
                      imageContent: imageContent.value,
                      imageBindings: resolveNoteImageBindings(
                        imageContent,
                        scope,
                      ),
                    }
                  : {}),
              });
            }
            if (
              input.matchingMetadata &&
              !plans.some((plan) => plan.entry.noteKind === "digest")
            ) {
              throw capabilityError(
                "invalid_request",
                "matching metadata requires a digest entry",
                {
                  reason: "invalid_combination",
                  field: "matchingMetadata",
                },
              );
            }

            // Re-read the prepared scope immediately before the native transaction.
            // This keeps the private composition seam from applying a stale scan.
            for (const plan of plans) {
              const current = plan.entry.migrationSourceRef
                ? await withZoteroHostSlice(control, () => {
                    const parent = requireItem(input.parentRef, "note parent");
                    const target = requireNote(plan.entry.migrationSourceRef!);
                    const targetParentId = Number(
                      (
                        target as unknown as {
                          parentID?: unknown;
                          parentItemID?: unknown;
                        }
                      ).parentID ||
                        (target as unknown as { parentItemID?: unknown })
                          .parentItemID ||
                        0,
                    );
                    if (
                      !targetParentId ||
                      targetParentId !== Number(parent.id)
                    ) {
                      throw capabilityError(
                        "conflict",
                        "migration target note belongs to a different parent",
                        { reason: "basis_mismatch", kind: "note" },
                      );
                    }
                    return { parent, note: target, inspection: null };
                  })
                : plan.entry.noteKind === "custom" ||
                    plan.entry.noteKind === "conversation-note"
                  ? {
                      parent: await withZoteroHostSlice(control, () =>
                        requireItem(input.parentRef, "note parent"),
                      ),
                      note: null,
                      inspection: null,
                    }
                  : await managedSingleton(
                      input.parentRef,
                      plan.entry.noteKind,
                      control,
                    );
              const currentRef = current.note
                ? canonicalItemRef(current.note)
                : null;
              const preparedRef = plan.note
                ? canonicalItemRef(plan.note)
                : null;
              const sameRef =
                currentRef === preparedRef ||
                (currentRef !== null &&
                  preparedRef !== null &&
                  currentRef.libraryId === preparedRef.libraryId &&
                  currentRef.key === preparedRef.key);
              if (!sameRef) {
                throw capabilityError(
                  "conflict",
                  "managed parent set changed during preparation",
                  {
                    reason: "revision_mismatch",
                    kind: "note",
                  },
                );
              }
              if (plan.note && plan.before) {
                const currentRevision = await withZoteroHostSlice(
                  control,
                  () => canonicalNoteVersion(current.note!).revision,
                );
                if (currentRevision !== plan.before.revision) {
                  throw capabilityError(
                    "conflict",
                    "managed parent set changed during preparation",
                    {
                      reason: "revision_mismatch",
                      kind: "note",
                    },
                  );
                }
              }
              plan.parent = current.parent;
              plan.note = current.note;
              if (plan.note) {
                const blocks = await listMutationPayloadBlocks(
                  plan.note,
                  control,
                );
                plan.legacyPayloadBlocks = blocks;
                plan.payloadBlocks = blocks.filter(
                  (block) => block.payloadType === plan.payload.payloadType,
                );
                for (const auxiliary of plan.auxiliaryPayloads) {
                  auxiliary.blocks = blocks.filter(
                    (block) =>
                      block.payloadType === auxiliary.payload.payloadType,
                  );
                }
              }
            }

            const db = (
              resolveZotero() as unknown as {
                DB: {
                  executeTransaction: (
                    run: () => Promise<void>,
                  ) => Promise<void>;
                };
              }
            ).DB;
            // Validate the exact embedded payload envelope before allocating any
            // storage.  Parent-set execution must fail before staging when the
            // native payload budget would be exceeded.
            for (const plan of plans) {
              const payloads = [
                plan.payload,
                ...plan.auxiliaryPayloads.map((entry) => entry.payload),
              ];
              for (const payload of payloads) {
                assertManagedPayloadImageBudget({
                  payload,
                  noteId: plan.note?.id,
                  noteKey: plan.note?.key,
                  parentId: plan.parent.id,
                });
              }
            }
            const stagedParentSetPaths = new Set<string>();
            const preparedStorageDirectories = new Set<string>();
            try {
              // All bytes are prepared before the native transaction.  In
              // particular, do not call Attachments.importEmbeddedImage from the
              // transaction: Zotero implements that helper with its own
              // executeTransaction wrapper.
              for (const plan of plans) {
                if (plan.imageBindings?.length) {
                  const files = new Map<string, PreparedNativeAttachmentFile>();
                  for (const binding of plan.imageBindings) {
                    const bytes = new Uint8Array(
                      await binding.blob.arrayBuffer(),
                    );
                    const file = await stageNativeAttachmentFile({
                      bytes,
                      operationId: input.operationId,
                      label: `image-${binding.slot}`,
                      libraryId: normalizeLibraryId(plan.parent.libraryID),
                      contentType: binding.blob.type || "image/png",
                    });
                    files.set(binding.slot, file);
                    stagedParentSetPaths.add(file.stagedPath);
                    preparedStorageDirectories.add(file.storageDirectory);
                  }
                  plan.stagedImageFiles = files;
                }
                const payloadFiles = new Map<
                  string,
                  PreparedNativeAttachmentFile
                >();
                const payloads = [
                  plan.payload,
                  ...plan.auxiliaryPayloads.map((entry) => entry.payload),
                ];
                for (const payload of payloads) {
                  const envelope = buildWorkbenchPayloadEnvelope({
                    // New notes do not have an identity until the native
                    // transaction inserts them.  The envelope identity is
                    // diagnostic only; semantic payloadHash is independent of it.
                    noteId: plan.note?.id || null,
                    noteKey: plan.note?.key || "",
                    parentId: plan.parent.id || null,
                    noteKind: payload.noteKind,
                    payloadType: payload.payloadType,
                    schemaVersion: payload.schemaVersion,
                    format: payload.format,
                    value: payload.value,
                  });
                  const file = await stageNativeAttachmentFile({
                    bytes: buildWorkbenchPayloadImageBytes(envelope),
                    operationId: input.operationId,
                    label: `payload-${payload.payloadType}`,
                    libraryId: normalizeLibraryId(plan.parent.libraryID),
                    contentType: "image/png",
                  });
                  payloadFiles.set(payload.payloadType, file);
                  stagedParentSetPaths.add(file.stagedPath);
                  preparedStorageDirectories.add(file.storageDirectory);
                }
                plan.stagedPayloadFiles = payloadFiles;
              }

              // Staging can yield to the runtime and therefore cannot be the
              // final admission check. Revalidate parent/note revisions and every
              // migration source payload immediately before the native write.
              for (const plan of plans) {
                const current = plan.entry.migrationSourceRef
                  ? await withZoteroHostSlice(control, () => {
                      const parent = requireItem(
                        input.parentRef,
                        "note parent",
                      );
                      const target = requireNote(
                        plan.entry.migrationSourceRef!,
                      );
                      const targetParentId = Number(
                        (
                          target as unknown as {
                            parentID?: unknown;
                            parentItemID?: unknown;
                          }
                        ).parentID ||
                          (target as unknown as { parentItemID?: unknown })
                            .parentItemID ||
                          0,
                      );
                      if (
                        !targetParentId ||
                        targetParentId !== Number(parent.id)
                      ) {
                        throw capabilityError(
                          "conflict",
                          "migration target note belongs to a different parent",
                          { reason: "basis_mismatch", kind: "note" },
                        );
                      }
                      return { parent, note: target };
                    })
                  : plan.entry.noteKind === "custom" ||
                      plan.entry.noteKind === "conversation-note"
                    ? {
                        parent: await withZoteroHostSlice(control, () =>
                          requireItem(input.parentRef, "note parent"),
                        ),
                        note: null,
                      }
                    : await managedSingleton(
                        input.parentRef,
                        plan.entry.noteKind,
                        control,
                      );
                const currentRef = current.note
                  ? canonicalItemRef(current.note)
                  : null;
                const preparedRef = plan.note
                  ? canonicalItemRef(plan.note)
                  : null;
                const sameRef =
                  currentRef === preparedRef ||
                  (currentRef !== null &&
                    preparedRef !== null &&
                    currentRef.libraryId === preparedRef.libraryId &&
                    currentRef.key === preparedRef.key);
                if (!sameRef) {
                  throw capabilityError(
                    "conflict",
                    "managed parent set changed during staging",
                    { reason: "revision_mismatch", kind: "note" },
                  );
                }
                if (plan.note && plan.before) {
                  const currentRevision = await withZoteroHostSlice(
                    control,
                    () => canonicalNoteVersion(current.note!).revision,
                  );
                  if (currentRevision !== plan.before.revision) {
                    throw capabilityError(
                      "conflict",
                      "managed parent set changed during staging",
                      { reason: "revision_mismatch", kind: "note" },
                    );
                  }
                }
                if (plan.entry.migrationSourceRef && plan.note) {
                  const currentBlocks = await listMutationPayloadBlocks(
                    plan.note,
                    control,
                  );
                  if (
                    migrationPayloadSourceFacts(currentBlocks) !==
                    migrationPayloadSourceFacts(plan.legacyPayloadBlocks)
                  ) {
                    throw capabilityError(
                      "conflict",
                      "migration source payload changed during staging",
                      { reason: "revision_mismatch", kind: "note" },
                    );
                  }
                }
              }
            } catch (error) {
              await cleanupPreparedNativeAttachmentDirectories(
                preparedStorageDirectories,
              );
              await cleanupStagedNoteAttachmentPaths(stagedParentSetPaths);
              if (error instanceof MutationAuthorityExecutionError) {
                throw error;
              }
              if (error instanceof ZoteroHostCapabilityError) {
                const status: "failed" | "canceled" =
                  error.code === "canceled" ? "canceled" : "failed";
                const recovery:
                  | "none"
                  | "retry_same_operation"
                  | "refresh_and_retry_new_operation" =
                  error.code === "canceled"
                    ? "none"
                    : error.retryable
                      ? "retry_same_operation"
                      : "refresh_and_retry_new_operation";
                throw new MutationAuthorityExecutionError(
                  status,
                  error.code,
                  "staging",
                  recovery,
                  error.details as WorkflowHostErrorDetailsByCode[WorkflowHostErrorCode],
                  error.message,
                );
              }
              throw new MutationAuthorityExecutionError(
                "failed",
                "execution_failed",
                "staging",
                "retry_same_operation",
                { phase: "staging", recovery: "retry_same_operation" },
                error instanceof Error
                  ? error.message
                  : "managed parent set staging failed",
              );
            }
            const committedPlans: PreparedParentSetEntry[] = [];
            const payloadResults: Array<{
              plan: PreparedParentSetEntry;
              result: Awaited<ReturnType<typeof upsertNotePayloadAttachment>>;
            }> = [];
            const imageAttachments: Array<{
              plan: PreparedParentSetEntry;
              attachments: Zotero.Item[];
              storagePaths: ReadonlyMap<string, string>;
            }> = [];
            const compensate = async (primary: unknown) => {
              const residualRefs: MutationEntityRef[] = [];
              for (const { attachments, storagePaths } of [
                ...imageAttachments,
              ].reverse()) {
                await cleanupStagedNoteAttachmentPaths(storagePaths.values());
                for (const attachment of [...attachments].reverse()) {
                  try {
                    const existing = await withZoteroHostSlice(control, () =>
                      resolveZotero().Items.getByLibraryAndKey?.(
                        normalizeLibraryId(attachment.libraryID),
                        trimText(attachment.key),
                      ),
                    );
                    if (!existing) continue;
                    await withZoteroHostSlice(control, () =>
                      brokerMutationPrimitives.attachment.remove(attachment),
                    );
                  } catch {
                    residualRefs.push({
                      kind: "item",
                      ref: canonicalItemRef(attachment),
                    });
                  }
                }
              }
              for (const { result } of [...payloadResults].reverse()) {
                if (result.attachmentStoragePath) {
                  await cleanupStagedNoteAttachmentPaths([
                    result.attachmentStoragePath,
                  ]);
                }
                if (!result.createdAttachment) continue;
                try {
                  const existing = await withZoteroHostSlice(control, () =>
                    resolveZotero().Items.getByLibraryAndKey?.(
                      normalizeLibraryId(result.createdAttachment!.libraryID),
                      trimText(result.createdAttachment!.key),
                    ),
                  );
                  if (!existing) continue;
                  await withZoteroHostSlice(control, () =>
                    brokerMutationPrimitives.attachment.remove(
                      result.createdAttachment!,
                    ),
                  );
                } catch {
                  residualRefs.push({
                    kind: "item",
                    ref: canonicalItemRef(result.createdAttachment),
                  });
                }
              }
              for (const plan of [...committedPlans].reverse()) {
                const note = plan.note;
                if (!note) continue;
                try {
                  const existing = await withZoteroHostSlice(control, () =>
                    resolveZotero().Items.getByLibraryAndKey?.(
                      normalizeLibraryId(note.libraryID),
                      trimText(note.key),
                    ),
                  );
                  if (!existing) continue;
                  if (!plan.before) {
                    await withZoteroHostSlice(control, () =>
                      brokerMutationPrimitives.note.remove(note),
                    );
                  } else {
                    await withZoteroHostSlice(control, () =>
                      brokerMutationPrimitives.note.update(
                        note,
                        plan.beforeHtml,
                      ),
                    );
                    if (plan.entry.tags !== undefined) {
                      await withZoteroHostSlice(control, () =>
                        brokerMutationPrimitives.tag.update(
                          note,
                          plan.beforeTags,
                        ),
                      );
                    }
                  }
                } catch {
                  residualRefs.push({
                    kind: "item",
                    ref: canonicalItemRef(note),
                  });
                }
              }
              if (!residualRefs.length) {
                if (primary instanceof MutationAuthorityExecutionError) {
                  throw primary;
                }
                if (primary instanceof ZoteroHostCapabilityError) {
                  const recovery:
                    | "none"
                    | "retry_same_operation"
                    | "refresh_and_retry_new_operation" =
                    primary.code === "canceled"
                      ? "none"
                      : primary.retryable
                        ? "retry_same_operation"
                        : "refresh_and_retry_new_operation";
                  throw new MutationAuthorityExecutionError(
                    primary.code === "canceled" ? "canceled" : "failed",
                    primary.code,
                    "commit",
                    recovery,
                    primary.details,
                    primary.message,
                    committedPlans.map((plan) => ({
                      kind: "item",
                      ref: canonicalItemRef(plan.note!),
                    })),
                    [],
                  );
                }
              }
              throw new MutationAuthorityExecutionError(
                residualRefs.length ? "repair_required" : "failed",
                "execution_failed",
                "compensation",
                residualRefs.length ? "manual_repair" : "retry_same_operation",
                {
                  phase: residualRefs.length ? "cleanup" : "commit",
                  recovery: residualRefs.length
                    ? "manual_repair"
                    : "retry_same_operation",
                  affectedCount: committedPlans.length,
                  residualCount: residualRefs.length,
                },
                primary instanceof Error
                  ? primary.message
                  : "managed parent set failed",
                committedPlans.map((plan) => ({
                  kind: "item",
                  ref: canonicalItemRef(plan.note!),
                })),
                residualRefs,
              );
            };

            try {
              // The only native DB transaction in this composition. All reads and
              // file/payload work stay outside it; native calls here are direct so
              // they do not queue a second FIFO host slice while this one is held.
              await withZoteroHostSlice(control, async () => {
                await db.executeTransaction(async () => {
                  for (const plan of plans) {
                    throwIfWorkflowCallCanceled(control);
                    if (!committedPlans.includes(plan))
                      committedPlans.push(plan);
                    if (!plan.note) {
                      plan.note = await brokerMutationPrimitives.note.create({
                        content: plan.content,
                        parent: plan.parent,
                        libraryID: normalizeLibraryId(plan.parent.libraryID),
                        tags: plan.entry.tags || [],
                        collections: [],
                        transaction: { inNativeTransaction: true },
                      });
                    } else {
                      const existing = String(plan.note.getNote?.() || "");
                      const comparableExisting = stripPayloadAnchorForType(
                        existing,
                        plan.payload.payloadType,
                      );
                      const comparableDesired = stripPayloadAnchorForType(
                        plan.content,
                        plan.payload.payloadType,
                      );
                      if (comparableExisting !== comparableDesired) {
                        await brokerMutationPrimitives.note.update(
                          plan.note,
                          plan.content,
                          {
                            inNativeTransaction: true,
                          },
                        );
                      }
                      if (plan.entry.tags !== undefined) {
                        await brokerMutationPrimitives.tag.update(
                          plan.note,
                          plan.entry.tags,
                          {
                            inNativeTransaction: true,
                          },
                        );
                      }
                    }
                    if (plan.imageBindings && plan.imageContent) {
                      const staged = await importPreparedNoteImages(
                        plan.note,
                        plan.imageBindings,
                        control,
                        undefined,
                        {
                          inNativeTransaction: true,
                          stagedFiles: plan.stagedImageFiles,
                        },
                      );
                      imageAttachments.push({
                        plan,
                        attachments: staged.attachments,
                        storagePaths: staged.storagePaths,
                      });
                      plan.content = bindNoteImageSlots(
                        plan.imageContent,
                        staged.attachmentKeys,
                      );
                      await brokerMutationPrimitives.note.update(
                        plan.note,
                        plan.content,
                        { inNativeTransaction: true },
                      );
                    }
                    const primaryPayloadResult =
                      await upsertNotePayloadAttachment(
                        plan.note,
                        plan.payload,
                        plan.payloadBlocks,
                        control,
                        undefined,
                        {
                          inNativeTransaction: true,
                          stagedFile: plan.stagedPayloadFiles?.get(
                            plan.payload.payloadType,
                          ),
                          deferLegacyAttachmentCleanup: Boolean(
                            plan.entry.migrationSourceRef,
                          ),
                        },
                      );
                    payloadResults.push({ plan, result: primaryPayloadResult });
                    for (const auxiliary of plan.auxiliaryPayloads) {
                      const auxiliaryPayloadResult =
                        await upsertNotePayloadAttachment(
                          plan.note,
                          auxiliary.payload,
                          auxiliary.blocks,
                          control,
                          undefined,
                          {
                            inNativeTransaction: true,
                            stagedFile: plan.stagedPayloadFiles?.get(
                              auxiliary.payload.payloadType,
                            ),
                            deferLegacyAttachmentCleanup: Boolean(
                              plan.entry.migrationSourceRef,
                            ),
                          },
                        );
                      payloadResults.push({
                        plan,
                        result: auxiliaryPayloadResult,
                      });
                    }
                  }
                });
              });
              const usedStorageDirectories = new Set<string>();
              for (const { storagePaths } of imageAttachments) {
                for (const path of storagePaths.values()) {
                  const directory = runtimeDirectoryForPath(path);
                  if (directory) usedStorageDirectories.add(directory);
                }
              }
              for (const { result } of payloadResults) {
                if (!result.attachmentStoragePath) continue;
                const directory = runtimeDirectoryForPath(
                  result.attachmentStoragePath,
                );
                if (directory) usedStorageDirectories.add(directory);
              }
              await cleanupPreparedNativeAttachmentDirectories(
                [...preparedStorageDirectories].filter(
                  (directory) => !usedStorageDirectories.has(directory),
                ),
              );
            } catch (error) {
              await cleanupPreparedNativeAttachmentDirectories(
                preparedStorageDirectories,
              );
              await compensate(error);
            } finally {
              await cleanupStagedNoteAttachmentPaths(stagedParentSetPaths);
            }

            // Migration targets may still have legacy payload attachments after
            // the paired canonical write. Verify the new v2 payload first, then
            // combine those discovered attachments with the caller's private
            // cleanup tail. The cleanup remains part of this parent-set authority
            // operation; it never claims a second receipt.
            const legacyPayloadRefs = new Map<string, ZoteroHostItemRefInput>();
            for (const plan of plans) {
              if (!plan.entry.migrationSourceRef) continue;
              const blocks = await listMutationPayloadBlocks(
                plan.note!,
                control,
              );
              const canonicalBlocks = blocks.filter(
                (block) =>
                  block.payloadType === plan.payload.payloadType &&
                  block.sourceStorage === "embedded-image-attachment-v2" &&
                  block.payloadStorageVersion === 2 &&
                  logicalPayloadHashFromBlock(block) ===
                    canonicalLogicalNotePayloadHash(plan.payload),
              );
              if (canonicalBlocks.length !== 1) {
                throw new MutationAuthorityExecutionError(
                  "failed",
                  "execution_failed",
                  "verification",
                  "reconcile",
                  { phase: "verification", recovery: "reconcile" },
                  "canonical migration payload could not be verified",
                  [{ kind: "item", ref: canonicalItemRef(plan.note!) }],
                );
              }
              for (const block of plan.legacyPayloadBlocks) {
                // Migration only replaces the semantic primary represented by
                // this plan. Auxiliary payload attachments stay untouched even
                // when they use legacy storage; they were not converted or
                // verified by this parent-set entry.
                if (
                  block.payloadType !== plan.payload.payloadType ||
                  block.payloadStorageVersion === 2 ||
                  !block.attachmentKey
                ) {
                  continue;
                }
                const ref = {
                  libraryId: normalizeLibraryId(plan.note!.libraryID),
                  key: trimText(block.attachmentKey),
                };
                if (ref.key)
                  legacyPayloadRefs.set(`${ref.libraryId}:${ref.key}`, ref);
              }
            }
            // Verify and normalize every canonical detail before starting any
            // migration cleanup. Once cleanup begins, canonical data must remain
            // durable even if a later cleanup step needs repair.
            const notes: ManagedNoteDetailDto[] = [];
            const changes: MutationChangeDto[] = [];
            for (const plan of plans) {
              const note = plan.note!;
              let detail: NoteDetailResultDto;
              try {
                detail = await readManagedNoteDetail(
                  note,
                  { format: "html" },
                  {
                    runNativeSlice: (run) => withZoteroHostSlice(control, run),
                    checkCanceled: () => throwIfWorkflowCallCanceled(control),
                    readRevision: () => canonicalNoteVersion(note).revision,
                  },
                );
              } catch (error) {
                await compensate(error);
                throw error;
              }
              detail = await enrichManagedNoteDetail(detail, control || {});
              if (detail.kind !== "managed") {
                await compensate(
                  new Error(
                    "managed parent set final state could not be confirmed",
                  ),
                );
              }
              notes.push(detail as ManagedNoteDetailDto);
              const planPayloadResults = payloadResults
                .filter((item) => item.plan === plan)
                .map((item) => item.result);
              const payloadResult = planPayloadResults[0];
              const after = await withZoteroHostSlice(control, () =>
                canonicalNoteVersion(note),
              );
              const noteChanged =
                !plan.before || plan.before.revision !== after.revision;
              changes.push({
                entity: { kind: "item", ref: canonicalItemRef(note) },
                effect: !plan.before
                  ? "created"
                  : noteChanged || payloadResult?.outcome !== "unchanged"
                    ? "updated"
                    : "unchanged",
                before: plan.before,
                after,
              });
              for (const result of planPayloadResults) {
                if (result.createdAttachment) {
                  changes.push({
                    entity: {
                      kind: "item",
                      ref: canonicalItemRef(result.createdAttachment),
                    },
                    effect: "created",
                    before: null,
                    after: canonicalItemVersion(result.createdAttachment),
                  });
                }
                if (result.removedAttachment) {
                  const removedRef = canonicalItemRef(result.removedAttachment);
                  changes.push({
                    entity: { kind: "item", ref: removedRef },
                    effect: "deleted",
                    before: canonicalItemVersion(result.removedAttachment),
                    after: {
                      revision: hashSynthesisContractCanonicalJson({
                        ref: removedRef,
                        state: "deleted",
                        operationId: input.operationId,
                      }),
                      state: "deleted",
                    },
                  });
                }
              }
            }
            const cleanupInput =
              migrationCleanup || legacyPayloadRefs.size
                ? {
                    notes: migrationCleanup?.notes || [],
                    payloadRefs: [
                      ...(migrationCleanup?.payloadRefs || []),
                      ...legacyPayloadRefs.values(),
                    ],
                  }
                : undefined;
            let cleanupPlan: LegacyMigrationCleanupPlan | undefined;
            if (cleanupInput) {
              try {
                cleanupPlan = normalizeLegacyMigrationCleanupPlan(cleanupInput);
              } catch (error) {
                // Cleanup planning is part of the required migration tail.
                // Canonical notes have already been verified, so a bounded
                // plan failure must retain them as repair_required too.
                throw migrationCleanupRepairError(error, plans, cleanupInput);
              }
            }
            if (cleanupPlan) {
              try {
                const preparedCleanup = await prepareLegacyMigrationCleanup(
                  cleanupPlan,
                  input.operationId,
                  control,
                );
                const cleanupResult = await executeLegacyMigrationCleanupDirect(
                  preparedCleanup,
                  control,
                );
                changes.push(...cleanupResult.changes);
              } catch (error) {
                // Canonical notes are deliberately retained. The parent-set
                // authority must settle as repair_required when this required
                // migration tail cannot be completed.
                throw migrationCleanupRepairError(error, plans, cleanupPlan);
              }
            }

            const changed = changes.some(
              (change) => change.effect !== "unchanged",
            );
            return {
              outcome: changed ? "committed" : "unchanged",
              changes,
              result: {
                notes,
                ...(referencesBasis ? { referencesBasis } : {}),
                ...(dependentStale ? { dependentStale: true } : {}),
              },
            };
          } catch (error) {
            if (error instanceof MutationAuthorityExecutionError) {
              throw error;
            }
            if (error instanceof ZoteroHostCapabilityError) {
              const status: "failed" | "canceled" =
                error.code === "canceled" ? "canceled" : "failed";
              const recovery:
                | "none"
                | "retry_same_operation"
                | "refresh_and_retry_new_operation" =
                error.code === "canceled"
                  ? "none"
                  : error.retryable
                    ? "retry_same_operation"
                    : "refresh_and_retry_new_operation";
              throw new MutationAuthorityExecutionError(
                status,
                error.code,
                "commit",
                recovery,
                error.details as WorkflowHostErrorDetailsByCode[WorkflowHostErrorCode],
                error.message,
              );
            }
            throw error;
          }
        },
      },
    );
  } catch (error) {
    if (error instanceof MutationAuthorityAdmissionError)
      throw mutationAdmissionError(error);
    throw error;
  }
}

async function callManagedOwner<T extends object>(
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!(error instanceof ManagedNoteOwnerError)) throw error;
    const knownCodes = new Set<ZoteroHostCapabilityErrorCode>([
      "invalid_request",
      "invalid_ref",
      "not_found",
      "resource_limited",
      "conflict",
      "execution_failed",
    ]);
    if (knownCodes.has(error.code as ZoteroHostCapabilityErrorCode)) {
      throw capabilityError(
        error.code as ZoteroHostCapabilityErrorCode,
        error.message,
        error.details as WorkflowHostErrorDetailsByCode[WorkflowHostErrorCode],
        error.retryable,
      );
    }
    throw new ZoteroManagedArtifactDiagnostic(
      error.code as ManagedArtifactDiagnosticCode,
      error.message,
      error.details,
      error.retryable,
    );
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
  semanticInput?: JsonValue,
  beforeEffect?: CanonicalMutationEffectGuard,
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
    add: addKeys,
    remove: removeKeys,
  };
  try {
    return await executeReservedMutation({
      scope,
      operationId,
      operation: "statusTags.transition",
      semanticInput: semanticInput || (normalized as unknown as JsonValue),
      control,
      async preflight() {
        await withZoteroHostSlice(control, () => {
          const item = requireItem(itemRef, "status item");
          failClosedMutationTags(item, itemRef);
        });
      },
      async execute() {
        const { item, before, current } = await withZoteroHostSlice(
          control,
          async () => {
            await beforeEffect?.("read");
            const item = requireItem(itemRef, "status item");
            return {
              item,
              before: canonicalItemVersion(item),
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
            await withZoteroHostSlice(control, async () => {
              await beforeEffect?.("effect");
              return brokerMutationPrimitives.tag.update(item, next);
            });
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

type NotePayloadDomainRequest = Omit<
  NotePayloadUpsertRequestDto,
  "operationId"
> & { operationId?: string };

function normalizeLogicalNotePayloadRequest(
  request: NotePayloadDomainRequest,
): LogicalNotePayloadDto {
  const requestKeys = Object.keys(request as object);
  const unexpectedRequestKey = requestKeys.find(
    (key) => key !== "operationId" && key !== "noteRef" && key !== "payload",
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

type NativeAttachmentImport = {
  attachment: Zotero.Item;
  storagePath: string;
  storageDirectory: string;
};

type PreparedNativeAttachmentFile = Readonly<{
  key: string;
  filename: string;
  contentType: string;
  storageDirectory: string;
  storagePath: string;
  stagedPath: string;
}>;

function stagedNoteFileId() {
  const crypto = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
    Math.random().toString(36).slice(2),
  ].join("-");
}

async function stageNoteAttachmentBytes(
  bytes: Uint8Array,
  operationId: string,
  label: string,
) {
  const operationToken = String(operationId || "operation")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .slice(0, 64);
  const directory = joinPath(
    getRuntimePersistencePaths().tmpDir,
    "managed-note-parent-set",
    `${operationToken}-${stagedNoteFileId()}`,
  );
  await ensureRuntimeDirectory(directory);
  const path = joinPath(directory, `${label}-${stagedNoteFileId()}.bin`);
  await writeRuntimeBytes(path, bytes, { overwrite: false });
  return path;
}

function generateNativeAttachmentKey(zotero: typeof Zotero) {
  const utilities = zotero as typeof Zotero & {
    DataObjectUtilities?: { generateKey?: () => string };
    Utilities?: { generateObjectKey?: () => string };
    randomString?: (length: number) => string;
  };
  const generators = [
    utilities.DataObjectUtilities?.generateKey,
    utilities.Utilities?.generateObjectKey,
    utilities.randomString ? () => utilities.randomString!(8) : undefined,
  ].filter(
    (generator): generator is () => string => typeof generator === "function",
  );
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const generated = String(
      generators[attempt % Math.max(1, generators.length)]?.() ||
        Math.random().toString(36).slice(2, 10),
    )
      .trim()
      .toUpperCase();
    if (/^[A-Z0-9]{8}$/.test(generated)) return generated;
  }
  throw new MutationAuthorityExecutionError(
    "failed",
    "unavailable",
    "staging",
    "retry_same_operation",
    { reason: "capability", kind: "attachment" },
    "Zotero attachment key generation is unavailable",
  );
}

async function prepareNativeAttachmentFile(args: {
  stagedPath: string;
  libraryId: number;
  contentType: string;
  operationId: string;
  label: string;
}): Promise<PreparedNativeAttachmentFile> {
  const zotero = resolveZotero() as typeof Zotero & {
    Attachments?: typeof Zotero.Attachments & {
      getStorageDirectoryByLibraryAndKey?: (
        libraryId: number,
        key: string,
      ) => { path?: string };
    };
  };
  const attachments = zotero.Attachments;
  if (typeof attachments?.getStorageDirectoryByLibraryAndKey !== "function") {
    throw new MutationAuthorityExecutionError(
      "failed",
      "unavailable",
      "staging",
      "retry_same_operation",
      { reason: "capability", kind: "attachment" },
      "Zotero attachment storage directory support is unavailable",
    );
  }
  const normalizedType = String(args.contentType || "image/png")
    .trim()
    .toLowerCase();
  const extension = normalizedType === "image/jpeg" ? "jpg" : "png";
  const filename = `image.${extension}`;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const key = generateNativeAttachmentKey(zotero);
    const storageDirectory = String(
      attachments.getStorageDirectoryByLibraryAndKey(args.libraryId, key)
        ?.path || "",
    ).trim();
    if (!storageDirectory || (await runtimePathExists(storageDirectory))) {
      continue;
    }
    const storagePath = joinPath(storageDirectory, filename);
    try {
      await ensureRuntimeDirectory(storageDirectory);
      await copyRuntimeFile({
        sourcePath: args.stagedPath,
        targetPath: storagePath,
      });
      return {
        key,
        filename,
        contentType: normalizedType,
        storageDirectory,
        storagePath,
        stagedPath: args.stagedPath,
      };
    } catch (error) {
      try {
        await removeRuntimePath(storageDirectory);
      } catch {
        // Preserve the staging error; the caller reports residual files.
      }
      if (attempt === 15) throw error;
    }
  }
  throw new MutationAuthorityExecutionError(
    "failed",
    "conflict",
    "staging",
    "refresh_and_retry_new_operation",
    { reason: "ambiguous_state", kind: "attachment" },
    "unable to reserve a unique Zotero attachment storage key",
  );
}

async function stageNativeAttachmentFile(args: {
  bytes: Uint8Array;
  operationId: string;
  label: string;
  libraryId: number;
  contentType: string;
}): Promise<PreparedNativeAttachmentFile> {
  const stagedPath = await stageNoteAttachmentBytes(
    args.bytes,
    args.operationId,
    args.label,
  );
  try {
    return await prepareNativeAttachmentFile({ ...args, stagedPath });
  } catch (error) {
    await cleanupStagedNoteAttachmentPaths([stagedPath]);
    throw error;
  }
}

async function cleanupPreparedNativeAttachmentDirectories(
  directories: Iterable<string>,
) {
  for (const directory of directories) {
    try {
      await removeRuntimePath(directory);
    } catch {
      // The durable mutation result keeps the primary failure.
    }
  }
}

function runtimeDirectoryForPath(path: string) {
  const separator = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return separator > 0 ? path.slice(0, separator) : "";
}

async function cleanupStagedNoteAttachmentPaths(paths: Iterable<string>) {
  for (const path of paths) {
    try {
      await removeRuntimePath(path);
      const parent = runtimeDirectoryForPath(path);
      if (parent) await removeRuntimePath(parent);
    } catch {
      // Staging cleanup is best-effort; the mutation's primary failure remains
      // the durable authority error.
    }
  }
}

async function importPreparedNoteImageInNativeTransaction(
  note: Zotero.Item,
  args: {
    preparedFile: PreparedNativeAttachmentFile;
  },
): Promise<NativeAttachmentImport> {
  const zotero = resolveZotero();
  const attachment = new zotero.Item("attachment");
  (attachment as unknown as { libraryID: number }).libraryID =
    normalizeLibraryId(note.libraryID);
  (attachment as unknown as { parentID: number }).parentID = note.id;
  (attachment as unknown as { key: string }).key = args.preparedFile.key;
  (attachment as unknown as { attachmentLinkMode: number }).attachmentLinkMode =
    zotero.Attachments.LINK_MODE_EMBEDDED_IMAGE ?? 4;
  (attachment as unknown as { attachmentPath: string }).attachmentPath =
    `storage:${args.preparedFile.filename}`;
  (
    attachment as unknown as { attachmentContentType: string }
  ).attachmentContentType = args.preparedFile.contentType;
  const save = (attachment as unknown as { save?: () => Promise<unknown> })
    .save;
  if (typeof save !== "function") {
    throw new MutationAuthorityExecutionError(
      "failed",
      "unavailable",
      "staging",
      "retry_same_operation",
      { reason: "capability", kind: "attachment" },
      "Zotero item save is unavailable inside a native transaction",
    );
  }
  await save.call(attachment);
  return {
    attachment,
    storagePath: args.preparedFile.storagePath,
    storageDirectory: args.preparedFile.storageDirectory,
  };
}

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
      await withZoteroHostSlice(control, () =>
        brokerMutationPrimitives.item.remove(item),
      );
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
  beforeEffect?: CanonicalMutationEffectGuard,
  options: {
    inNativeTransaction?: boolean;
    stagedFiles?: ReadonlyMap<string, PreparedNativeAttachmentFile>;
  } = {},
) {
  const native = <T>(run: () => Promise<T> | T) =>
    options.inNativeTransaction
      ? Promise.resolve().then(run)
      : withZoteroHostSlice(control, run);
  const zotero = resolveZotero();
  if (
    !options.inNativeTransaction &&
    typeof zotero.Attachments?.importEmbeddedImage !== "function"
  ) {
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
  const storagePaths = new Map<string, string>();
  try {
    for (const binding of bindings) {
      const imported = await native(async () => {
        await beforeEffect?.("effect");
        if (options.inNativeTransaction) {
          const preparedFile = options.stagedFiles?.get(binding.slot);
          if (!preparedFile) {
            throw new MutationAuthorityExecutionError(
              "failed",
              "unavailable",
              "staging",
              "retry_same_operation",
              { reason: "capability", kind: "attachment" },
              "native embedded image staging is missing",
            );
          }
          return importPreparedNoteImageInNativeTransaction(note, {
            preparedFile,
          });
        }
        const attachment = await zotero.Attachments.importEmbeddedImage({
          blob: binding.blob,
          parentItemID: note.id,
        });
        return { attachment, storagePath: "", storageDirectory: "" };
      });
      const attachment = imported.attachment;
      beforeEffect?.markWritten([
        {
          kind: "item",
          ref: {
            libraryId: normalizeLibraryId(note.libraryID),
            key: trimText(note.key),
          },
        },
      ]);
      const key = trimText(attachment?.key);
      if (!key) throw new Error("embedded image attachment has no key");
      attachments.push(attachment);
      attachmentKeys.set(binding.slot, key);
      if (imported.storagePath)
        storagePaths.set(binding.slot, imported.storagePath);
    }
    return { attachments, attachmentKeys, storagePaths };
  } catch (error) {
    await cleanupStagedNoteAttachmentPaths(storagePaths.values());
    const residualRefs: MutationEntityRef[] = [];
    for (const attachment of [...attachments].reverse()) {
      try {
        await native(() =>
          brokerMutationPrimitives.item.remove(attachment, {
            inNativeTransaction: options.inNativeTransaction,
          }),
        );
      } catch {
        residualRefs.push({
          kind: "item",
          ref: canonicalItemRef(attachment),
        });
      }
    }
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
  semanticInput?: JsonValue,
  beforeEffect?: CanonicalMutationEffectGuard,
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
      semanticInput: semanticInput || normalized,
      control,
      preflight: () =>
        preflightCanonicalMutationDomain(
          { ...request, operation } as MutationExecuteRequest,
          scope,
          control,
        ),
      async execute() {
        if (operation === "notes.create") {
          const content = noteContent as NonNullable<typeof noteContent>;
          let note: Zotero.Item;
          try {
            note = await withZoteroHostSlice(control, async () => {
              await beforeEffect?.("effect");
              const created = await brokerMutationPrimitives.note.create({
                content: content.value,
                parent: noteCreate!.parent,
                libraryID: noteCreate!.libraryId,
                tags: noteCreate!.initialTags,
                collections: noteCreate!.collections,
              });
              beforeEffect?.markWritten([]);
              return created;
            });
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
                beforeEffect,
              );
              attachments = staged.attachments;
              await withZoteroHostSlice(control, async () => {
                await beforeEffect?.("effect");
                await brokerMutationPrimitives.note.update(
                  note,
                  bindNoteImageSlots(content.value, staged.attachmentKeys),
                );
                beforeEffect?.markWritten([]);
              });
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
        const { note, before } = await withZoteroHostSlice(
          control,
          async () => {
            await beforeEffect?.("read");
            const note = requireNote(noteRef);
            return {
              note,
              before: canonicalNoteVersion(note),
            };
          },
        );

        if (operation === "notes.updateContent") {
          const contentInput = noteContent as NonNullable<typeof noteContent>;
          let content = contentInput.value;
          let attachments: Zotero.Item[] = [];
          if (resolvedImages.length > 0) {
            const staged = await importPreparedNoteImages(
              note,
              resolvedImages,
              control,
              beforeEffect,
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
              await withZoteroHostSlice(control, async () => {
                await beforeEffect?.("effect");
                return brokerMutationPrimitives.note.update(note, content);
              });
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
                  brokerMutationPrimitives.item.remove(attachment!),
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
          await withZoteroHostSlice(control, async () => {
            await beforeEffect?.("effect");
            return brokerMutationPrimitives.note.remove(note);
          });
          const after = {
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
                effect: "deleted",
                before,
                after,
              },
            ],
            result: strictJsonObject({
              noteRef,
              outcome: "permanently_deleted",
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
            beforeEffect,
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
  semanticInput?: JsonValue,
  beforeEffect?: CanonicalMutationEffectGuard,
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
  const isPreparedStoredFile =
    (operation === "attachments.create" &&
      (request as AttachmentCreateRequestDto).source.kind === "stored_file") ||
    operation === "attachments.replaceFile";
  const cleanup = isPreparedStoredFile
    ? primitives.cleanupPreparedFile
    : undefined;
  try {
    return await executeReservedMutation<JsonObject>({
      scope,
      operationId,
      operation,
      semanticInput: semanticInput || normalized,
      control,
      async execute() {
        return withPreparedFileCleanup(cleanup, async () => {
          if (operation === "attachments.create") {
            const input = request as AttachmentCreateRequestDto;
            const parent =
              input.placement.kind === "child"
                ? await (async () => {
                    const placement = input.placement;
                    if (placement.kind !== "child") return null;
                    return withZoteroHostSlice(control, async () => {
                      await beforeEffect?.("read");
                      return requireItem(
                        canonicalItemRef(placement.parentRef),
                        "parent item",
                      );
                    });
                  })()
                : null;
            const libraryId = await withZoteroHostSlice(control, async () => {
              if (!parent) await beforeEffect?.("read");
              return parent
                ? normalizeLibraryId(parent.libraryID)
                : parsePositiveInteger(
                    input.placement.kind === "top_level"
                      ? input.placement.libraryId
                      : undefined,
                  ) || normalizeLibraryId(undefined);
            });
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
              const collectionLibraryId = await withZoteroHostSlice(
                control,
                () => normalizeLibraryId((collection as any).libraryID),
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
              } else if (input.source.kind === "linked_url") {
                const source = input.source;
                created = await withZoteroHostSlice(control, async () => {
                  await beforeEffect?.("effect");
                  const attachment =
                    await brokerMutationPrimitives.attachment.createFromUrl({
                      parent,
                      libraryID: libraryId,
                      url: source.url,
                      title: input.metadata?.title,
                      contentType: input.metadata?.contentType,
                    });
                  beforeEffect?.markWritten([]);
                  return attachment;
                });
              } else {
                const source = input.source;
                created = await importDownloadedStoredUrlAttachment({
                  url: source.url,
                  fallbackFilename: storedUrlFallbackFilename(
                    input.metadata?.contentType,
                  ),
                  parent,
                  libraryId,
                  metadata: {
                    ...input.metadata,
                    originalUrl: input.metadata?.originalUrl || source.url,
                  },
                  control,
                  beforeEffect,
                  writtenEntities: [],
                });
              }
              for (const collection of collections) {
                await withZoteroHostSlice(control, async () => {
                  await beforeEffect?.("effect");
                  await brokerMutationPrimitives.collection.add(
                    created!,
                    collection,
                  );
                  beforeEffect?.markWritten([]);
                });
              }
            } catch (primary) {
              if (!created) {
                const nativeStatus =
                  nativeMutations.attachmentFailureStatus(primary);
                if (
                  nativeStatus === "unknown" ||
                  nativeStatus === "repair_required"
                ) {
                  throw new MutationAuthorityExecutionError(
                    nativeStatus,
                    "execution_failed",
                    nativeStatus === "repair_required" ? "cleanup" : "commit",
                    nativeStatus === "repair_required"
                      ? "manual_repair"
                      : "reconcile",
                    {
                      phase:
                        nativeStatus === "repair_required"
                          ? "cleanup"
                          : "commit",
                      recovery:
                        nativeStatus === "repair_required"
                          ? "manual_repair"
                          : "reconcile",
                      affectedCount: 1,
                      residualCount: nativeStatus === "repair_required" ? 1 : 0,
                    },
                    primary instanceof Error
                      ? primary.message
                      : "attachment creation outcome is unknown",
                  );
                }
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
                  brokerMutationPrimitives.attachment.remove(created!),
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
              await beforeEffect?.("read");
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
                before: await canonicalAttachmentVersion(attachment),
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
              await withZoteroHostSlice(control, async () => {
                await beforeEffect?.("effect");
                return brokerMutationPrimitives.attachment.update(
                  attachment,
                  fields,
                );
              });
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
              const oldCollections = attachment.getCollections().map((id) => {
                const collection = resolveZotero().Collections?.get?.(id);
                if (!collection) {
                  throw new Error(
                    "attachment collection could not be resolved",
                  );
                }
                return collection;
              });
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
                JSON.stringify(
                  oldCollections.map((entry) => entry.id).sort(),
                ) !==
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
                await withZoteroHostSlice(control, async () => {
                  await beforeEffect?.("effect");
                  await brokerMutationPrimitives.item.setParent(
                    attachment,
                    nextParent,
                  );
                  beforeEffect?.markWritten([]);
                });
                await withZoteroHostSlice(control, async () => {
                  await beforeEffect?.("effect");
                  await brokerMutationPrimitives.collection.replace(
                    attachment,
                    nextCollections,
                  );
                  beforeEffect?.markWritten([]);
                });
              } catch (primary) {
                try {
                  await withZoteroHostSlice(control, () =>
                    brokerMutationPrimitives.item.setParent(
                      attachment,
                      oldParent,
                    ),
                  );
                  await withZoteroHostSlice(control, () =>
                    brokerMutationPrimitives.collection.replace(
                      attachment,
                      oldCollections,
                    ),
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

          await withZoteroHostSlice(control, async () => {
            await beforeEffect?.("effect");
            return brokerMutationPrimitives.attachment.remove(attachment);
          });
          const after = {
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
                effect: "deleted",
                before,
                after,
              },
            ],
            result: strictJsonObject({
              attachmentRef,
              outcome: "permanently_deleted",
            }),
          };
        });
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

type LegacyDestructivePreparedMutation = {
  semanticInput: JsonObject;
  plan: MutationPlanByOperation[
    | "item.changeType"
    | "item.remove"
    | "collection.remove"];
  observations: MutationEntityObservationDto[];
  outcome: "would_change" | "unchanged";
  preparedAt: number;
  scope: string;
  semanticDigest: string;
  planDigest: string;
  observationDigest: string;
};

const PRIVATE_PREPARED_MUTATION_TTL_MS = 15 * 60 * 1000;

function preparedMutationScope(scope: ZoteroHostMutationCallerScope) {
  const ownerId = trimText(scope?.ownerId, 256);
  if (!ownerId) {
    throw capabilityError("invalid_request", "caller scope is invalid", {
      reason: "invalid_value",
      field: "callerScope",
    });
  }
  return ownerId;
}

async function prepareLegacyDestructiveMutation(
  request:
    | MutationPreviewRequestByOperation["item.changeType"]
    | MutationPreviewRequestByOperation["item.remove"]
    | MutationPreviewRequestByOperation["collection.remove"],
  scope: ZoteroHostMutationCallerScope,
): Promise<LegacyDestructivePreparedMutation> {
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
  const prepared = {
    ...built,
    plan: built.plan as LegacyDestructivePreparedMutation["plan"],
    observations: built.observations as MutationEntityObservationDto[],
    preparedAt: Date.now(),
    scope: preparedMutationScope(scope),
    semanticDigest: hashSynthesisContractCanonicalJson(built.semanticInput),
    planDigest: hashSynthesisContractCanonicalJson(built.plan),
    observationDigest: hashSynthesisContractCanonicalJson(built.observations),
  };
  return prepared;
}

function preparedMutationStaleError() {
  return new MutationAuthorityExecutionError(
    "failed",
    "conflict",
    "read",
    "refresh_and_retry_new_operation",
    { reason: "revision_mismatch" },
    "prepared mutation no longer matches current Zotero state",
  );
}

async function revalidateLegacyDestructiveMutation(
  prepared: LegacyDestructivePreparedMutation,
  request:
    | MutationPreviewRequestByOperation["item.changeType"]
    | MutationPreviewRequestByOperation["item.remove"]
    | MutationPreviewRequestByOperation["collection.remove"],
  scope: ZoteroHostMutationCallerScope,
) {
  if (prepared.scope !== preparedMutationScope(scope)) {
    throw preparedMutationStaleError();
  }
  if (Date.now() - prepared.preparedAt > PRIVATE_PREPARED_MUTATION_TTL_MS) {
    throw preparedMutationStaleError();
  }
  const semanticDigest = hashSynthesisContractCanonicalJson(
    prepared.semanticInput,
  );
  if (semanticDigest !== prepared.semanticDigest) {
    throw preparedMutationStaleError();
  }
  const current = await prepareLegacyDestructiveMutation(request, scope);
  if (
    current.semanticDigest !== prepared.semanticDigest ||
    current.planDigest !== prepared.planDigest ||
    current.observationDigest !== prepared.observationDigest
  ) {
    throw preparedMutationStaleError();
  }
}

function publicMutationPreviewPlan(
  operation: "item.changeType" | "item.remove" | "collection.remove",
  plan: LegacyDestructivePreparedMutation["plan"],
): JsonObject {
  switch (operation) {
    case "item.changeType": {
      const value = plan as MutationPlanByOperation["item.changeType"];
      return {
        itemRef: value.itemRef,
        sourceItemType: value.sourceItemType,
        targetItemType: value.targetItemType,
        incompatibleData: value.incompatibleData,
        remappedFields: value.remappedFields,
        movedToExtra: value.movedToExtra.map(({ source, serializedLine }) => ({
          source,
          serializedLine,
        })),
        dropped: value.dropped,
      };
    }
    case "item.remove": {
      const value = plan as MutationPlanByOperation["item.remove"];
      return {
        itemRef: value.itemRef,
        childPolicy: value.childPolicy,
        children: value.children.map(({ ref, kind }) => ({ ref, kind })),
        managedResources: value.managedResources,
        relationInvalidations: value.relationInvalidations,
      };
    }
    case "collection.remove": {
      const value = plan as MutationPlanByOperation["collection.remove"];
      return {
        collectionRef: value.collectionRef,
        childPolicy: value.childPolicy,
        deletedCollections: value.deletedCollections.map(({ ref }) => ({
          ref,
        })),
        detachedMemberships: value.detachedMemberships.map(
          ({ collectionRef, itemRef }) => ({ collectionRef, itemRef }),
        ),
      };
    }
  }
}

function publicCanonicalLiteratureIngestPlan(
  prepared: CanonicalLiteratureIngestPrepared,
): JsonObject {
  const paper = prepared.paper;
  return {
    collectionRef: prepared.collectionRef,
    target: prepared.existing
      ? { outcome: "existing", itemRef: prepared.existing.ref }
      : { outcome: "created" },
    required: {
      itemType: paper.itemType,
      fields: paper.fields,
      creators: paper.creators.map((creator) => ({
        ...(creator.name ? { name: creator.name } : {}),
        ...(creator.firstName ? { firstName: creator.firstName } : {}),
        ...(creator.lastName ? { lastName: creator.lastName } : {}),
        ...(creator.creatorType ? { creatorType: creator.creatorType } : {}),
      })),
      identifiers: {
        ...(paper.doi ? { doi: paper.doi } : {}),
        ...(paper.arxiv ? { arxiv: paper.arxiv } : {}),
        ...(paper.pmid ? { pmid: paper.pmid } : {}),
        ...(paper.isbn ? { isbn: paper.isbn } : {}),
      },
      collection: prepared.collectionRef,
    },
    enrichment: {
      pdf: paper.pdfUrl ? "requested" : "skipped",
      landing:
        paper.attachLandingUrlOnMissingPdf && paper.landingUrl
          ? "requested_if_pdf_missing"
          : "skipped",
    },
  };
}

async function canonicalMutationPreviewFacts(
  request: MutationPreviewRequestByOperation[MutationPreviewOperation],
): Promise<{ changed: boolean; plan: JsonObject }> {
  if (isManagedSemanticOperation(request.operation)) {
    const managedRequest = request as ManagedSemanticRequest;
    const prepared = normalizeManagedSemanticRequest(managedRequest);
    if (prepared.target?.kind === "update") {
      const target = prepared.target;
      const note = await withZoteroHostSlice({}, () =>
        requireNote(target.noteRef),
      );
      const inspection = await inspectManagedNote(note, {
        runNativeSlice: (run) => withZoteroHostSlice({}, run),
      });
      if (
        inspection.kind !== "managed" ||
        inspection.noteKind !== prepared.kind
      ) {
        throw capabilityError(
          "conflict",
          "managed note kind does not match the writer",
          {
            reason: "ambiguous_state",
            kind: "note",
          },
        );
      }
      return {
        changed: true,
        plan: {
          kind: prepared.kind,
          target: prepared.target,
          payloadBytes: new TextEncoder().encode(
            JSON.stringify(prepared.publicPayload),
          ).byteLength,
        },
      };
    }
    const parentRef = prepared.parentRef || prepared.target?.parentRef;
    if (!parentRef)
      throw capabilityError("invalid_request", "managed target is missing", {
        reason: "missing_field",
      });
    const singleton = await managedSingleton(parentRef, prepared.kind);
    return {
      changed: true,
      plan: {
        kind: prepared.kind,
        parentRef,
        outcome: singleton.note ? "replaced" : "created",
        payloadBytes: new TextEncoder().encode(
          JSON.stringify(prepared.publicPayload),
        ).byteLength,
      },
    };
  }
  if (request.operation === "attachments.replaceFile") {
    const attachment = await withZoteroHostSlice({}, () =>
      requireAttachment(request.attachmentRef),
    );
    const unchanged =
      await nativeMutations.attachments.matchesStoredContentManifest({
        attachment,
        content: request.source.content,
        admit: (work) => withZoteroHostSlice({}, work),
      });
    return {
      changed: !unchanged,
      plan: {
        attachmentRef: request.attachmentRef,
        filename:
          request.source.targetFilename ||
          request.source.content.main.relativePath,
        sizeBytes: request.source.content.main.sizeBytes,
        companionCount: request.source.content.companions.length,
      },
    };
  }
  if (request.operation === "notes.upsertPayload") {
    const note = await withZoteroHostSlice({}, () =>
      requireNote(request.noteRef),
    );
    const { operation: _operation, ...payloadRequest } = request;
    const payload = normalizeLogicalNotePayloadRequest(payloadRequest);
    const matches = (await listMutationPayloadBlocks(note)).filter(
      (block) => block.payloadType === payload.payloadType,
    );
    const unchanged =
      matches.length === 1 &&
      logicalPayloadHashFromBlock(matches[0]) ===
        canonicalLogicalNotePayloadHash(payload);
    return {
      changed: !unchanged,
      plan: {
        noteRef: request.noteRef,
        payloadType: payload.payloadType,
        noteKind: payload.noteKind,
        format: payload.format,
        schemaVersion: payload.schemaVersion,
        outcome: unchanged
          ? "unchanged"
          : matches.length
            ? "replaced"
            : "created",
      },
    };
  }
  return withZoteroHostSlice({}, (): { changed: boolean; plan: JsonObject } => {
    switch (request.operation) {
      case "item.create":
        return {
          changed: true,
          plan: strictJsonObject({
            itemType: request.itemType,
            fields: request.fields || {},
            creators: request.creators || [],
            collectionRefs: request.collectionRefs || [],
            relatedRefs: request.initialRelatedRefs || [],
            tags: request.initialTags || [],
          }),
        };
      case "item.updateMetadata": {
        const item = requireItem(request.itemRef);
        const fields = request.patch.fields
          ? applicableMetadataFieldPatch(item, request.patch.fields)
          : {};
        const changed =
          Object.entries(fields).some(
            ([field, value]) =>
              readField(item, field, FIELD_TEXT_LIMIT) !== String(value ?? ""),
          ) ||
          (request.patch.creators !== undefined &&
            JSON.stringify(item.getCreators()) !==
              JSON.stringify(request.patch.creators));
        return {
          changed,
          plan: strictJsonObject({
            itemRef: request.itemRef,
            fields,
            ...(request.patch.creators
              ? { creators: request.patch.creators }
              : {}),
          }),
        };
      }
      case "item.updateTags":
      case "statusTags.transition": {
        const item = requireItem(request.itemRef);
        const current = failClosedMutationTags(item, request.itemRef);
        const add =
          request.operation === "statusTags.transition"
            ? normalizeStatusTransitionKeys(request.add, "add").map(
                getBuiltinStatusTag,
              )
            : request.add.map((tag) => trimText(tag, TAG_TEXT_LIMIT));
        const remove =
          request.operation === "statusTags.transition"
            ? normalizeStatusTransitionKeys(request.remove, "remove").map(
                getBuiltinStatusTag,
              )
            : request.remove.map((tag) => trimText(tag, TAG_TEXT_LIMIT));
        const added = [...new Set(add)].filter((tag) => !current.includes(tag));
        const removed = [...new Set(remove)].filter((tag) =>
          current.includes(tag),
        );
        return {
          changed: !!(added.length || removed.length),
          plan: { itemRef: request.itemRef, added, removed },
        };
      }
      case "collection.create":
        return {
          changed: true,
          plan: strictJsonObject({
            name: request.name,
            placement: request.placement,
            memberRefs: request.initialMemberRefs || [],
          }),
        };
      case "collection.update": {
        const collection = resolveCollection(request.collectionRef)!;
        const parent = request.patch.parentRef
          ? resolveCollection(request.patch.parentRef)
          : null;
        const changed =
          (request.patch.name !== undefined &&
            collection.name !== request.patch.name.trim()) ||
          (request.patch.parentRef !== undefined &&
            Number(collection.parentID || 0) !== Number(parent?.id || 0));
        return {
          changed,
          plan: strictJsonObject({
            collectionRef: request.collectionRef,
            patch: request.patch,
          }),
        };
      }
      case "collection.updateMembership": {
        const collection = resolveCollection(request.collectionRef)!;
        const { addRefs, removeRefs } = normalizeCollectionMembershipRefs(
          request.operation,
          request.add,
          request.remove,
        );
        const added = addRefs.filter(
          (ref) => !requireItem(ref).getCollections().includes(collection.id),
        );
        const removed = removeRefs.filter((ref) =>
          requireItem(ref).getCollections().includes(collection.id),
        );
        return {
          changed: !!(added.length || removed.length),
          plan: { collectionRef: request.collectionRef, added, removed },
        };
      }
      case "notes.create":
        return {
          changed: true,
          plan: strictJsonObject({
            placement: request.placement,
            format: request.content.format,
            contentBytes: new TextEncoder().encode(request.content.value)
              .byteLength,
            imageCount: request.content.embeddedImages?.length || 0,
            tags: request.initialTags || [],
          }),
        };
      case "notes.updateContent": {
        const note = requireNote(request.noteRef);
        const content = normalizeNoteContentInput(request.content);
        return {
          changed:
            content.bindings.size > 0 || note.getNote() !== content.value,
          plan: {
            noteRef: request.noteRef,
            format: content.format,
            contentBytes: new TextEncoder().encode(content.value).byteLength,
            imageCount: content.bindings.size,
          },
        };
      }
      case "notes.remove":
        return {
          changed: true,
          plan: { noteRef: request.noteRef, disposition: request.disposition },
        };
      case "attachments.create": {
        const source =
          request.source.kind === "stored_file"
            ? {
                kind: request.source.kind,
                filename:
                  request.source.targetFilename ||
                  request.source.content.main.relativePath,
                sizeBytes: request.source.content.main.sizeBytes,
                companionCount: request.source.content.companions.length,
              }
            : request.source;
        return {
          changed: true,
          plan: strictJsonObject({
            placement: request.placement,
            source,
            metadata: request.metadata || {},
          }),
        };
      }
      case "attachments.updateMetadata": {
        const attachment = requireAttachment(request.attachmentRef);
        const changed = Object.entries(request.patch).some(([field, value]) => {
          const current =
            field === "contentType"
              ? attachment.attachmentContentType
              : field === "charset"
                ? attachment.attachmentCharset
                : attachment.getField(field);
          return String(current || "") !== String(value ?? "");
        });
        return {
          changed,
          plan: strictJsonObject({
            attachmentRef: request.attachmentRef,
            patch: request.patch,
          }),
        };
      }
      case "attachments.move": {
        const attachment = requireAttachment(request.attachmentRef);
        const parent =
          request.placement.kind === "child"
            ? requireItem(request.placement.parentRef)
            : null;
        const collections =
          request.placement.kind === "top_level"
            ? (request.placement.collectionRefs || [])
                .map((ref) => resolveCollection(ref)!.id)
                .sort()
            : [];
        const changed =
          Number(attachment.parentID || 0) !== Number(parent?.id || 0) ||
          JSON.stringify(attachment.getCollections().sort()) !==
            JSON.stringify(collections);
        return {
          changed,
          plan: strictJsonObject({
            attachmentRef: request.attachmentRef,
            placement: request.placement,
          }),
        };
      }
      case "attachments.remove":
        return {
          changed: true,
          plan: {
            attachmentRef: request.attachmentRef,
            disposition: request.disposition,
          },
        };
      default:
        throw capabilityError(
          "unsupported_operation",
          "mutation preview has no domain plan",
          { memberOrOperation: request.operation },
        );
    }
  });
}

async function previewCanonicalMutation(
  request: MutationPreviewRequestByOperation[MutationPreviewOperation],
  scope: ZoteroHostMutationCallerScope,
): Promise<MutationPreviewResult<JsonObject>> {
  assertCanonicalMutationPreviewInput(request);
  if (
    request.operation === "item.addRelated" ||
    request.operation === "item.removeRelated"
  ) {
    const input = normalizeCanonicalRelatedMutationInput(request);
    const prepared = await withZoteroHostSlice({}, () =>
      prepareCanonicalRelatedMutation(input),
    );
    const shouldBePresent = input.operation === "item.addRelated";
    const relations = input.relatedRefs.map((relatedRef) => {
      const present = prepared.current.includes(relatedRef.key);
      const changed = present !== shouldBePresent;
      return {
        relatedRef,
        outcome: shouldBePresent
          ? changed
            ? "added"
            : "already_present"
          : changed
            ? "removed"
            : "already_absent",
      };
    });
    const plan = {
      sourceRef: input.sourceRef,
      relatedRefs: input.relatedRefs,
      relations,
    };
    return {
      schema: "zotero-agents.mutation-preview.v1",
      operation: input.operation,
      outcome: relations.some(
        (relation) =>
          relation.outcome === "added" || relation.outcome === "removed",
      )
        ? "would_change"
        : "unchanged",
      observedAt: new Date().toISOString(),
      domainPlanDigest: hashSynthesisContractCanonicalJson({
        operation: input.operation,
        input,
        plan,
      }),
      plan,
    };
  }
  if (request.operation === "trash.setItemsState") {
    const prepared = await withZoteroHostSlice({}, () =>
      prepareCanonicalTrashMutation(
        request as MutationPreviewRequestByOperation["trash.setItemsState"] &
          Pick<TrashSetItemsStateRequest, "operationId">,
      ),
    );
    return {
      schema: "zotero-agents.mutation-preview.v1",
      operation: request.operation,
      outcome: prepared.targets.length ? "would_change" : "unchanged",
      observedAt: new Date().toISOString(),
      domainPlanDigest: hashSynthesisContractCanonicalJson({
        operation: request.operation,
        input: { itemRefs: request.itemRefs, state: request.state },
        result: prepared.result,
      }),
      plan: prepared.result,
    };
  }
  const destructive =
    request.operation === "item.changeType" ||
    request.operation === "item.remove" ||
    request.operation === "collection.remove";
  if (destructive) {
    const prepared = await withZoteroHostSlice({}, () =>
      prepareLegacyDestructiveMutation(request, scope),
    );
    const plan = publicMutationPreviewPlan(request.operation, prepared.plan);
    return {
      schema: "zotero-agents.mutation-preview.v1",
      operation: request.operation,
      outcome: prepared.outcome,
      observedAt: new Date().toISOString(),
      domainPlanDigest: hashSynthesisContractCanonicalJson({
        operation: request.operation,
        semanticInput: prepared.semanticInput,
        plan: prepared.plan,
      }),
      plan,
    };
  }
  if (request.operation === "literature.ingest") {
    const prepared = await prepareCanonicalLiteratureIngest(request);
    const plan = publicCanonicalLiteratureIngestPlan(prepared);
    const changes = await withZoteroHostSlice({}, () => {
      const item = prepared.existing
        ? requireItem(prepared.existing.ref)
        : null;
      const collection = resolveCollection(prepared.collectionRef)!;
      const membership =
        !item || !item.getCollections().includes(collection.id);
      const hasPdf = item ? itemHasPdfAttachment(item) : false;
      const enrichment =
        !hasPdf &&
        Boolean(
          prepared.paper.pdfUrl ||
          (prepared.paper.attachLandingUrlOnMissingPdf &&
            prepared.paper.landingUrl),
        );
      return { membership, enrichment };
    });
    plan.collectionOutcome = changes.membership ? "added" : "already_present";
    return {
      schema: "zotero-agents.mutation-preview.v1",
      operation: request.operation,
      outcome:
        !prepared.existing || changes.membership || changes.enrichment
          ? "would_change"
          : "unchanged",
      observedAt: new Date().toISOString(),
      domainPlanDigest: hashSynthesisContractCanonicalJson({
        operation: request.operation,
        input: request,
        observations: prepared.observations,
        plan,
      }),
      plan,
    };
  }

  await preflightCanonicalMutationForPublicSurface(request, scope);
  const observations = await withZoteroHostSlice({}, () =>
    collectCanonicalMutationObservations(request),
  );
  const domain = await canonicalMutationPreviewFacts(request);
  const plan: JsonObject = {
    operation: request.operation,
    targets: observations.map(({ entity, version }) => ({
      entity,
      ...("state" in version ? { state: version.state } : {}),
    })),
    ...domain.plan,
  };
  return {
    schema: "zotero-agents.mutation-preview.v1",
    operation: request.operation,
    outcome: domain.changed ? "would_change" : "unchanged",
    observedAt: new Date().toISOString(),
    domainPlanDigest: hashSynthesisContractCanonicalJson({
      operation: request.operation,
      semanticInput: request,
      observations,
      plan,
    }),
    plan,
  };
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

function resolveNavigationPane(control: WorkflowCallControl = {}) {
  const win = control.target?.resolveAndValidate?.();
  throwIfWorkflowCallCanceled(control);
  const pane = win?.ZoteroPane;
  if (!win || win.closed || !pane) {
    throw navigationUnavailableError("Zotero pane navigation is unavailable");
  }
  return { win, pane };
}

function assertNavigationObject(value: unknown, keys: readonly string[]) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw capabilityError(
      "invalid_request",
      "navigation input must be an object",
      {
        reason: "invalid_type",
      },
    );
  }
  const actual = Object.keys(value as object).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, i) => key !== expected[i])
  ) {
    throw capabilityError(
      "invalid_request",
      "navigation input has unknown fields",
      {
        reason: "invalid_schema",
      },
    );
  }
}

function assertSavedSearchRef(
  ref: unknown,
): asserts ref is PortableSavedSearchRef {
  assertNavigationObject(ref, ["libraryId", "key"]);
  const candidate = ref as any;
  if (
    !Number.isSafeInteger(candidate.libraryId) ||
    candidate.libraryId <= 0 ||
    typeof candidate.key !== "string" ||
    !ZOTERO_OBJECT_KEY_PATTERN.test(candidate.key)
  ) {
    throw capabilityError("invalid_request", "saved search ref is invalid", {
      reason: "invalid_value",
      field: "ref",
    });
  }
}

function assertLibraryViewRef(
  ref: unknown,
): asserts ref is NavigationLibraryViewRef {
  assertNavigationObject(ref, ["libraryId", "view"]);
  const candidate = ref as any;
  const views = [
    "library",
    "trash",
    "duplicates",
    "unfiled",
    "retracted",
    "publications",
  ];
  if (
    !views.includes(candidate.view) ||
    !Number.isSafeInteger(candidate.libraryId) ||
    candidate.libraryId <= 0
  ) {
    throw capabilityError("invalid_request", "library view is invalid", {
      reason: "invalid_value",
      field: "view",
    });
  }
}

function navigationWindow(control: WorkflowCallControl = {}) {
  throwIfWorkflowCallCanceled(control);
  return resolveNavigationPane(control);
}

async function focusZotero(
  control: WorkflowCallControl = {},
): Promise<NavigationResult> {
  throwIfWorkflowCallCanceled(control);
  const { win } = navigationWindow(control);
  win.restore?.();
  win.focus?.();
  return { outcome: "focus_dispatched" };
}

async function runNavigationAdapter<T>(operation: () => T | Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ZoteroHostCapabilityError) throw error;
    throw capabilityError("execution_failed", "Zotero navigation failed", {
      phase: "adapter",
      recovery: "none",
    });
  }
}

async function activateNavigationLibraryPane(win: any) {
  if (typeof win?.Zotero_Tabs?.select !== "function") {
    throw navigationUnavailableError("Zotero Library tab is unavailable");
  }
  await win.Zotero_Tabs.select("zotero-pane", false);
}

async function restoreAndFocusNavigationWindow(win: any) {
  win.restore?.();
  win.focus?.();
}

async function selectNavigationTreeRow(
  tree: any,
  rowId: string,
  allowFilterClear: boolean,
) {
  if (typeof tree?.selectByID !== "function") {
    throw navigationUnavailableError("Zotero collection tree is unavailable");
  }
  let selected = await tree.selectByID(rowId);
  if (
    selected === false &&
    allowFilterClear &&
    typeof tree.setFilter === "function"
  ) {
    await tree.setFilter("");
    selected = await tree.selectByID(rowId);
  }
  if (selected === false) {
    throw navigationUnavailableError(
      "Zotero collection-tree target is unavailable",
    );
  }
}

function assertNavigationTreeSelection(
  win: any,
  matches: (row: any) => boolean,
) {
  const rows = resolveSelectedLibraryTreeRows(win);
  if (rows.length !== 1 || !matches(rows[0])) {
    throw navigationUnavailableError(
      "Zotero navigation selection did not settle",
    );
  }
}

function rowLibraryId(row: any) {
  return normalizeLibraryId(row?.ref?.libraryID ?? row?.ref?.libraryId);
}

function matchesLibraryViewRow(row: any, target: NavigationLibraryViewRef) {
  if (rowLibraryId(row) !== target.libraryId) return false;
  if (target.view === "library") {
    return selectedRowFlag(row, "isLibrary") || selectedRowFlag(row, "isGroup");
  }
  const method: Record<NavigationLibraryViewRef["view"], string> = {
    library: "isLibrary",
    trash: "isTrash",
    duplicates: "isDuplicates",
    unfiled: "isUnfiled",
    retracted: "isRetracted",
    publications: "isPublications",
  };
  return selectedRowFlag(row, method[target.view]);
}

function viewUnsupportedError() {
  return new ZoteroHostCapabilityError(
    "unsupported_operation",
    "Zotero library view is unsupported",
    {
      memberOrOperation: "navigation.selectLibraryView",
      reason: "view_unsupported",
    },
  );
}

async function selectLibraryView(
  view: NavigationLibraryViewRef,
  control: WorkflowCallControl = {},
): Promise<NavigationResult> {
  assertLibraryViewRef(view);
  throwIfWorkflowCallCanceled(control);
  const { win, pane } = navigationWindow(control);
  const tree = pane.collectionsView || pane.collectionsTree;
  const idPrefix: Record<string, string> = {
    library: "L",
    trash: "T",
    duplicates: "D",
    unfiled: "U",
    retracted: "R",
    publications: "P",
  };
  const id = `${idPrefix[view.view]}${view.libraryId}`;
  if (
    !resolveZotero().Libraries?.get?.(view.libraryId) ||
    typeof tree?.selectByID !== "function"
  ) {
    throw viewUnsupportedError();
  }
  await activateNavigationLibraryPane(win);
  if (
    ["retracted", "publications"].includes(view.view) &&
    typeof tree.expandLibrary === "function"
  ) {
    await tree.expandLibrary(view.libraryId);
  }
  await selectNavigationTreeRow(tree, id, false);
  assertNavigationTreeSelection(win, (row) => matchesLibraryViewRow(row, view));
  await restoreAndFocusNavigationWindow(win);
  return { outcome: "selected", target: view };
}

async function selectSavedSearch(
  ref: PortableSavedSearchRef,
  control: WorkflowCallControl = {},
): Promise<NavigationResult> {
  assertSavedSearchRef(ref);
  throwIfWorkflowCallCanceled(control);
  const zotero = resolveZotero();
  const search =
    zotero.Searches?.getByLibraryAndKey?.(ref.libraryId, ref.key) || null;
  if (!search) throw notFoundError("saved-search", ref);
  const { win, pane } = navigationWindow(control);
  const tree = pane.collectionsView || pane.collectionsTree;
  const id = (search as any).id || (search as any).searchID;
  if (!id || typeof tree?.selectByID !== "function")
    throw navigationUnavailableError(
      "Zotero pane cannot select saved searches",
    );
  await activateNavigationLibraryPane(win);
  await selectNavigationTreeRow(tree, `S${id}`, true);
  assertNavigationTreeSelection(win, (row) => {
    if (!selectedRowFlag(row, "isSearch")) return false;
    const selected = row?.ref;
    return (
      normalizeLibraryId(selected?.libraryID ?? selected?.libraryId) ===
        ref.libraryId && trimText(selected?.key) === ref.key
    );
  });
  await restoreAndFocusNavigationWindow(win);
  return { outcome: "selected", target: ref };
}

async function selectCollectionCanonical(
  ref: ZoteroHostCollectionRefInput,
  control: WorkflowCallControl = {},
): Promise<NavigationResult> {
  assertPortableRef(ref, "collection");
  throwIfWorkflowCallCanceled(control);
  const collection = resolveCollection(ref);
  if (!collection) throw notFoundError("collection", ref);
  const { win, pane } = navigationWindow(control);
  const tree = pane.collectionsView || pane.collectionsTree;
  const collectionId = parsePositiveInteger((collection as any).id);
  if (!collectionId || typeof tree?.selectByID !== "function")
    throw navigationUnavailableError("Zotero collection has no native id");
  await activateNavigationLibraryPane(win);
  await selectNavigationTreeRow(tree, `C${collectionId}`, true);
  const target = canonicalCollectionRef(collection);
  assertNavigationTreeSelection(win, (row) => {
    if (!selectedRowFlag(row, "isCollection")) return false;
    const selected = row?.ref;
    return (
      normalizeLibraryId(selected?.libraryID ?? selected?.libraryId) ===
        target.libraryId && trimText(selected?.key) === target.key
    );
  });
  await restoreAndFocusNavigationWindow(win);
  return { outcome: "selected", target };
}

async function revealItems(
  input: NavigationSelectionInputDto,
  control: WorkflowCallControl = {},
): Promise<NavigationResult> {
  assertNavigationObject(input, ["items"]);
  if (
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > 100
  ) {
    throw capabilityError(
      "invalid_request",
      "items must contain 1 to 100 refs",
      { reason: "invalid_value", field: "items" },
    );
  }
  throwIfWorkflowCallCanceled(control);
  const items: Zotero.Item[] = [];
  const seen = new Set<string>();
  let libraryId = 0;
  for (const ref of input.items) {
    const item = requireItem(ref);
    const kind = canonicalItemKind(item);
    if (!["regular", "note", "attachment"].includes(kind)) {
      throw new ZoteroHostCapabilityError(
        "unsupported_operation",
        "item kind cannot be revealed",
        {
          memberOrOperation: "navigation.revealItems",
          reason: "target_kind_unsupported",
        },
      );
    }
    const normalized = canonicalItemRef(item);
    const id = `${normalized.libraryId}:${normalized.key}`;
    if (seen.has(id))
      throw capabilityError("invalid_request", "duplicate item ref", {
        reason: "duplicate_value",
        field: "items",
      });
    seen.add(id);
    if (!libraryId) libraryId = normalized.libraryId;
    if (libraryId !== normalized.libraryId)
      throw capabilityError("invalid_request", "items must share a library", {
        reason: "invalid_combination",
        field: "items",
      });
    const deleted = Boolean(
      (item as any).isDeleted?.() ?? (item as any).deleted,
    );
    if (
      items.length &&
      deleted !==
        Boolean((items[0] as any).isDeleted?.() ?? (items[0] as any).deleted)
    ) {
      throw capabilityError(
        "invalid_request",
        "items must share active state",
        { reason: "invalid_combination", field: "items" },
      );
    }
    items.push(item);
  }
  const { win, pane } = navigationWindow(control);
  const tree = pane.collectionsView || pane.collectionsTree;
  if (
    typeof tree?.selectByID !== "function" ||
    typeof (pane.itemsView || tree.itemTreeView)?.selectItems !== "function"
  ) {
    throw navigationUnavailableError("Zotero pane cannot select items");
  }
  const itemIds = items.map((item) => parsePositiveInteger((item as any).id));
  if (itemIds.some((id) => !id)) {
    throw navigationUnavailableError("Zotero item has no native id");
  }
  await activateNavigationLibraryPane(win);
  let itemTree: any = pane.itemsView || tree.itemTreeView;
  let selected = await itemTree.selectItems(itemIds);
  if (selected !== itemIds.length) {
    if (typeof itemTree?.setFilter === "function") {
      await itemTree.setFilter("search", "");
      await itemTree.setFilter("tags", []);
      selected = await itemTree.selectItems(itemIds);
    }
  }
  if (selected !== itemIds.length) {
    const deleted = Boolean(
      (items[0] as any).isDeleted?.() ?? (items[0] as any).deleted,
    );
    await selectNavigationTreeRow(
      tree,
      `${deleted ? "T" : "L"}${libraryId}`,
      false,
    );
    itemTree = pane.itemsView || tree.itemTreeView;
    if (typeof itemTree?.selectItems !== "function") {
      throw navigationUnavailableError("Zotero pane cannot select items");
    }
    selected = await itemTree.selectItems(itemIds);
  }
  if (selected !== itemIds.length) {
    throw navigationUnavailableError("Zotero items are not jointly visible");
  }
  const selectedIds =
    typeof pane.getSelectedItems === "function"
      ? pane.getSelectedItems(true)
      : (pane.itemsView as any)?.getSelectedItems?.(true);
  const expectedIds = new Set(itemIds);
  if (
    !Array.isArray(selectedIds) ||
    selectedIds.length !== expectedIds.size ||
    selectedIds.some(
      (id: unknown) => !expectedIds.has(parsePositiveInteger(id)),
    )
  ) {
    throw navigationUnavailableError("Zotero item selection did not settle");
  }
  await restoreAndFocusNavigationWindow(win);
  return { outcome: "revealed", targets: items.map(canonicalItemRef) };
}

async function openCanonicalItem(
  ref: ZoteroHostItemRefInput,
  control: WorkflowCallControl = {},
): Promise<NavigationResult> {
  throwIfWorkflowCallCanceled(control);
  const item = requireItem(ref);
  const { win, pane } = navigationWindow(control);
  if (typeof pane.viewItems !== "function")
    throw navigationUnavailableError("Zotero pane cannot open items");
  await activateNavigationLibraryPane(win);
  await pane.viewItems([item]);
  await restoreAndFocusNavigationWindow(win);
  return { outcome: "dispatched", target: canonicalItemRef(item) };
}

async function openReaderLocation(
  location: ReaderLocation,
  control: WorkflowCallControl = {},
): Promise<NavigationResult> {
  if (!location || typeof location !== "object")
    throw capabilityError("invalid_request", "reader location is invalid", {
      reason: "invalid_type",
      field: "location",
    });
  const zotero = resolveZotero();
  let item: Zotero.Item;
  let nativeLocation: Record<string, unknown>;
  if (location.kind === "page") {
    assertNavigationObject(location, ["attachment", "kind", "pageIndex"]);
    assertPortableRef(location.attachment, "item");
    item = requireItem(location.attachment);
    if (!item.isPDFAttachment?.()) {
      throw invalidRefError(
        "item",
        "wrong_kind",
        "page locations require a PDF attachment",
      );
    }
    if (!Number.isSafeInteger(location.pageIndex) || location.pageIndex < 0)
      throw capabilityError("invalid_request", "page index is invalid", {
        reason: "invalid_value",
        field: "pageIndex",
      });
    nativeLocation = { pageIndex: location.pageIndex };
  } else if (location.kind === "annotation") {
    assertNavigationObject(location, ["annotation", "kind"]);
    assertPortableRef(location.annotation, "item");
    const annotation = requireItem(location.annotation);
    if (canonicalItemKind(annotation) !== "annotation") {
      throw invalidRefError(
        "item",
        "wrong_kind",
        "annotation ref does not identify an annotation",
      );
    }
    const parentId = parsePositiveInteger(
      (annotation as any).parentItemID ?? (annotation as any).parentID,
    );
    item = zotero.Items.get(parentId);
    if (!item || canonicalItemKind(item) !== "attachment") {
      throw invalidRefError(
        "item",
        "wrong_kind",
        "annotation has no supported parent attachment",
      );
    }
    nativeLocation = { annotationID: trimText((annotation as any).key) };
  } else if (location.kind === "epub") {
    assertNavigationObject(location, ["attachment", "cfi", "kind"]);
    assertPortableRef(location.attachment, "item");
    item = requireItem(location.attachment);
    if (!item.isEPUBAttachment?.()) {
      throw invalidRefError(
        "item",
        "wrong_kind",
        "EPUB locations require an EPUB attachment",
      );
    }
    if (
      typeof location.cfi !== "string" ||
      !location.cfi ||
      location.cfi.length > 4096
    )
      throw capabilityError("invalid_request", "EPUB CFI is invalid", {
        reason: "invalid_value",
        field: "cfi",
      });
    nativeLocation = {
      position: {
        type: "FragmentSelector",
        conformsTo: "http://www.idpf.org/epub/linking/cfi/epub-cfi.html",
        value: location.cfi,
      },
    };
  } else {
    throw capabilityError(
      "invalid_request",
      "reader location kind is invalid",
      { reason: "invalid_value", field: "kind" },
    );
  }

  const readerApi = zotero.Reader as any;
  const itemId = parsePositiveInteger((item as any).id);
  const { win } = navigationWindow(control);
  const tabs = win?.Zotero_Tabs as any;
  if (
    !itemId ||
    typeof readerApi?.getByTabID !== "function" ||
    typeof tabs?.getTabIDByItemID !== "function" ||
    typeof tabs?.select !== "function"
  ) {
    throw readerLocationUnsupported();
  }

  let tabId = tabs.getTabIDByItemID(itemId);
  let readerInstance = tabId ? readerApi.getByTabID(tabId) : undefined;
  let effectStarted = false;
  if (!readerInstance) {
    const library = zotero.Libraries?.get?.(
      normalizeLibraryId((item as any).libraryID),
    ) as any;
    await library?.waitForDataLoad?.("item");
    const exact = navigationWindow(control);
    if (exact.win !== win) throw readerLocationUnsupported();
    tabId = tabs.getTabIDByItemID(itemId);
    readerInstance = tabId ? readerApi.getByTabID(tabId) : undefined;
    if (!readerInstance) {
      if (
        typeof readerApi.open !== "function" ||
        typeof tabs.add !== "function" ||
        typeof tabs.markAsLoaded !== "function" ||
        typeof tabs._getTab !== "function" ||
        typeof zotero.getMainWindow !== "function" ||
        typeof zotero.getMainWindows !== "function"
      ) {
        throw readerLocationUnsupported();
      }
      const windows = zotero.getMainWindows();
      if (
        !Array.isArray(windows) ||
        !windows.includes(win) ||
        windows.some(
          (candidate: any) =>
            typeof candidate?.Zotero_Tabs?._getTab !== "function" ||
            typeof candidate?.document?.getElementById !== "function",
        )
      ) {
        throw readerLocationUnsupported();
      }
      const owns = (candidate: any, id: string) =>
        candidate.Zotero_Tabs._getTab(id)?.tab ||
        candidate.document.getElementById(id);
      if (
        tabId &&
        windows.some(
          (candidate: any) => candidate !== win && owns(candidate, tabId!),
        )
      ) {
        throw readerLocationUnsupported();
      }
      let reserved: any;
      if (tabId) {
        reserved = tabs._getTab(tabId)?.tab;
        const state =
          typeof tabs.parseTabType === "function"
            ? tabs.parseTabType(reserved?.type)
            : {
                tabContentType: reserved?.type?.split("-")[0],
                tabState: reserved?.type?.split("-")[1],
              };
        if (
          state?.tabContentType !== "reader" ||
          state?.tabState !== "unloaded" ||
          !win.document.getElementById(tabId)
        ) {
          throw readerLocationUnsupported();
        }
      } else {
        const windowCrypto = (win as { crypto?: Crypto }).crypto;
        const nativeUuid = (
          globalThis as {
            Services?: {
              uuid?: { generateUUID?: () => { toString(): string } };
            };
          }
        ).Services?.uuid;
        const randomUUID =
          typeof windowCrypto?.randomUUID === "function"
            ? () => windowCrypto.randomUUID()
            : typeof nativeUuid?.generateUUID === "function"
              ? () => nativeUuid.generateUUID!().toString().replace(/[{}]/g, "")
              : undefined;
        if (!randomUUID) {
          throw readerLocationUnsupported();
        }
        for (let attempts = 0; attempts < 8; attempts++) {
          const candidate = `zotero-agents-reader-${randomUUID()}`;
          if (
            !windows.some((candidateWindow: any) =>
              owns(candidateWindow, candidate),
            )
          ) {
            tabId = candidate;
            break;
          }
        }
        if (!tabId) throw readerLocationUnsupported();
      }

      if (navigationWindow(control).win !== win) {
        throw readerLocationUnsupported();
      }
      effectStarted = true;
      win.restore?.();
      win.focus?.();
      if (win.closed || zotero.getMainWindow() !== win) {
        throw readerLocationUnsupported();
      }
      if (!reserved) {
        const owned = tabs.add({
          id: tabId,
          type:
            typeof tabs.parseTabType === "function"
              ? "reader-loading"
              : "reader-unloaded",
          title:
            (item as any).getDisplayTitle?.() ||
            (item as any).getField?.("title") ||
            "",
          data: { itemID: itemId },
          select: false,
          preventJumpback: true,
        });
        if (
          owned?.id !== tabId ||
          owned?.container?.ownerDocument !== win.document ||
          !owned.container.isConnected
        ) {
          throw readerLocationUnsupported();
        }
        reserved = tabs._getTab(tabId)?.tab;
        if (!reserved) throw readerLocationUnsupported();
      }
      reserved.type = "reader-loading";
      // Focus/tab reservation is already a UI effect. Leave the target-window
      // tab in place on later failure; do not report cancellation or replay.
      readerInstance = await readerApi.open(itemId, nativeLocation, {
        tabID: tabId,
        allowDuplicate: true,
        openInBackground: true,
        preventJumpback: true,
      });
      readerInstance ||= readerApi.getByTabID(tabId);
    }
  }
  if (
    !readerInstance ||
    readerInstance._window !== win ||
    readerInstance.tabID !== tabId ||
    typeof readerInstance.navigate !== "function" ||
    !readerInstance._initPromise
  ) {
    throw readerLocationUnsupported();
  }
  await readerInstance._initPromise;
  if (!effectStarted) {
    const exact = navigationWindow(control);
    if (exact.win !== win) throw readerLocationUnsupported();
  } else if (win.closed || control.target?.resolveAndValidate?.() !== win) {
    throw readerLocationUnsupported();
  }
  if (effectStarted) tabs.markAsLoaded(tabId);
  await tabs.select(tabId, true);
  await readerInstance.navigate(nativeLocation);
  await restoreAndFocusNavigationWindow(win);
  return {
    outcome: "reader_location_dispatched",
    target: canonicalItemRef(item),
    location,
  };
}

function readerLocationUnsupported() {
  return new ZoteroHostCapabilityError(
    "unsupported_operation",
    "Reader location is unsupported",
    {
      memberOrOperation: "navigation.openReaderLocation",
      reason: "location_unsupported",
    },
  );
}

async function selectZoteroItems(
  items: Zotero.Item[],
  target?: { win: any; pane: any },
) {
  const itemIds = items
    .map((item) => parsePositiveInteger(item.id))
    .filter((id) => id > 0);
  if (itemIds.length === 0) {
    throw capabilityError("execution_failed", "item has no numeric id", {
      phase: "adapter",
      recovery: "none",
    });
  }
  const { win, pane } = target || resolveZoteroPane();
  if (itemIds.length === 1 && typeof pane.selectItem === "function") {
    await pane.selectItem(itemIds[0]);
  } else if (typeof pane.selectItems === "function") {
    await pane.selectItems(itemIds);
  } else {
    throw navigationUnavailableError("Zotero pane cannot select items");
  }
  win?.focus?.();
}

async function selectZoteroCollection(
  collection: Zotero.Collection,
  target?: { win: any; pane: any },
) {
  const collectionId = parsePositiveInteger(
    (collection as unknown as { id?: unknown }).id,
  );
  const collectionKey = trimText(
    (collection as unknown as { key?: unknown }).key,
  );
  const { win, pane } = target || resolveZoteroPane();
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

export function createZoteroHostCapabilityBroker(
  selectionWindow?: () => _ZoteroTypes.MainWindow,
): ZoteroHostCapabilityBroker {
  const broker: ZoteroHostCapabilityBroker = {
    context: {
      getCurrentView(): CurrentViewDto {
        return getCurrentView(selectionWindow?.());
      },
      getSelectedItems: (request, control) =>
        getSelectedItems(request, control, selectionWindow?.()),
    },
    navigation: {
      focusZotero: (control) =>
        runNavigationAdapter(() => focusZotero(control)),
      selectLibraryView: (view, control) =>
        runNavigationAdapter(() => selectLibraryView(view, control)),
      selectCollection: (ref, control) =>
        runNavigationAdapter(() => selectCollectionCanonical(ref, control)),
      selectSavedSearch: (ref, control) =>
        runNavigationAdapter(() => selectSavedSearch(ref, control)),
      revealItems: (input, control) =>
        runNavigationAdapter(() => revealItems(input, control)),
      openItem: (ref, control) =>
        runNavigationAdapter(() => openCanonicalItem(ref, control)),
      openReaderLocation: (input, control) =>
        runNavigationAdapter(() => openReaderLocation(input, control)),
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
      async getOperation(request, scope) {
        return getMutationOperation({
          scope,
          operationId: request.operationId,
        }) as MutationOperationObservation;
      },
      preview: previewCanonicalMutation,
      execute: (request, scope, control) =>
        executeCanonicalMutationLifecycle(broker, request, scope, control),
    },
    statusTags: {
      getPolicy: getBuiltinStatusPolicy,
      transition: (request, scope, control) =>
        executeCanonicalMutationLifecycle(
          broker,
          { ...request, operation: "statusTags.transition" },
          scope,
          control,
        ) as Promise<MutationExecutionResult<StatusTagTransitionResultDto>>,
    },
    notes: {
      create: (request, scope, control) =>
        executeCanonicalMutationLifecycle(
          broker,
          { ...request, operation: "notes.create" },
          scope,
          control,
        ),
      updateContent: (request, scope, control) =>
        executeCanonicalMutationLifecycle(
          broker,
          { ...request, operation: "notes.updateContent" },
          scope,
          control,
        ),
      remove: (request, scope, control) =>
        executeCanonicalMutationLifecycle(
          broker,
          { ...request, operation: "notes.remove" },
          scope,
          control,
        ),
      upsertPayload: (request, scope, control) =>
        executeCanonicalMutationLifecycle(
          broker,
          { ...request, operation: "notes.upsertPayload" },
          scope,
          control,
        ),
    },
    managedNotes: {
      writeCustom: (request, scope, control) =>
        executeManagedSemanticMutation(
          broker,
          request,
          "custom",
          scope,
          control,
        ) as Promise<MutationExecutionResult<ManagedNoteWriteResultDto>>,
      writeConversation: (request, scope, control) =>
        executeManagedSemanticMutation(
          broker,
          request,
          "conversation-note",
          scope,
          control,
        ) as Promise<MutationExecutionResult<ManagedNoteWriteResultDto>>,
    },
    literatureArtifacts: {
      upsertDigest: (request, scope, control) =>
        executeManagedSemanticMutation(
          broker,
          request,
          "digest",
          scope,
          control,
        ) as Promise<
          MutationExecutionResult<LiteratureArtifactUpsertResultDto>
        >,
      upsertReferences: (request, scope, control) =>
        executeManagedSemanticMutation(
          broker,
          request,
          "references",
          scope,
          control,
        ) as Promise<
          MutationExecutionResult<LiteratureArtifactUpsertResultDto>
        >,
      upsertCitationAnalysis: (request, scope, control) =>
        executeManagedSemanticMutation(
          broker,
          request,
          "citation-analysis",
          scope,
          control,
        ) as Promise<
          MutationExecutionResult<LiteratureArtifactUpsertResultDto>
        >,
      upsertScore: (request, scope, control) =>
        executeManagedSemanticMutation(
          broker,
          request,
          "literature-score",
          scope,
          control,
        ) as Promise<
          MutationExecutionResult<LiteratureArtifactUpsertResultDto>
        >,
    },
    attachments: {
      create: (request, scope, control) =>
        executeCanonicalMutationLifecycle(
          broker,
          { ...request, operation: "attachments.create" },
          scope,
          control,
        ),
      updateMetadata: (request, scope, control) =>
        executeCanonicalMutationLifecycle(
          broker,
          { ...request, operation: "attachments.updateMetadata" },
          scope,
          control,
        ),
      replaceFile: (request, scope, control) =>
        executeCanonicalMutationLifecycle(
          broker,
          { ...request, operation: "attachments.replaceFile" },
          scope,
          control,
        ),
      move: (request, scope, control) =>
        executeCanonicalMutationLifecycle(
          broker,
          { ...request, operation: "attachments.move" },
          scope,
          control,
        ),
      remove: (request, scope, control) =>
        executeCanonicalMutationLifecycle(
          broker,
          { ...request, operation: "attachments.remove" },
          scope,
          control,
        ),
    },
  };
  canonicalMutationControls.set(broker, createCanonicalMutationControl());
  registerZoteroManagedNoteLocalControl(broker, {
    isLibraryWritable: async (libraryId, control = {}) =>
      withZoteroHostSlice(control, () => {
        const libraries = (
          resolveZotero() as unknown as {
            Libraries?: { get?: (id: number) => { editable?: boolean } | null };
          }
        ).Libraries;
        const library = libraries?.get?.(libraryId);
        return Boolean(library && library.editable !== false);
      }),
    applyParentSet: (input, scope, control) =>
      executeManagedParentSetMutation(broker, input, scope, control),
    readForTransfer: async (ref, control = {}) => {
      const note = await withZoteroHostSlice(control, () => requireNote(ref));
      let detail: NoteDetailResultDto;
      try {
        detail = await readManagedNoteDetail(
          note,
          { format: "html" },
          {
            runNativeSlice: (run) => withZoteroHostSlice(control, run),
            checkCanceled: () => throwIfWorkflowCallCanceled(control),
            readRevision: () => canonicalNoteVersion(note).revision,
          },
        );
      } catch (error) {
        mapManagedOwnerError(error);
      }
      detail = await enrichManagedNoteDetail(detail!, control);
      const transferFacts = await withZoteroHostSlice(control, () => ({
        html: String(note.getNote?.() || ""),
        tags: getTags(note),
        revision: canonicalNoteVersion(note).revision,
      }));
      const blocks = await listMutationPayloadBlocks(note, control);
      const payloads: NotePayloadValueDto[] = [];
      for (const block of blocks) {
        const summary = await withZoteroHostSlice(control, () =>
          canonicalPayloadSummary(block, note),
        );
        if (summary.state !== "available") {
          throw capabilityError(
            "execution_failed",
            "managed note payload could not be transferred",
            { phase: "read", recovery: "retry_same_operation" },
          );
        }
        let value: JsonValue;
        try {
          value = transferPayloadValueFromBlock(block);
          assertJsonValue(value, "note payload");
        } catch (error) {
          if (error instanceof ManagedNoteOwnerError)
            mapManagedOwnerError(error);
          throw capabilityError(
            "execution_failed",
            "managed note payload could not be decoded",
            { phase: "read", recovery: "retry_same_operation" },
            error instanceof Error ? true : false,
          );
        }
        payloads.push({ summary, value });
      }
      const finalRevision = await withZoteroHostSlice(
        control,
        () => canonicalNoteVersion(note).revision,
      );
      if (
        finalRevision !== detail!.revision ||
        transferFacts.revision !== finalRevision
      ) {
        throw capabilityError(
          "conflict",
          "managed note changed while it was being transferred",
          { reason: "revision_mismatch", kind: "note" },
          true,
        );
      }
      return {
        detail: detail!,
        html: transferFacts.html,
        payloads,
        tags: transferFacts.tags,
      };
    },
    readLegacyForMigration: async (ref, control = {}) => {
      const note = await withZoteroHostSlice(control, () => requireNote(ref));
      return readLegacyManagedNoteForMigration(note, {
        runNativeSlice: (run) => withZoteroHostSlice(control, run),
        checkCanceled: () => throwIfWorkflowCallCanceled(control),
        readRevision: () => canonicalNoteVersion(note).revision,
      });
    },
  });
  return broker;
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
): Promise<NoteDetailResultDto> {
  throwIfWorkflowCallCanceled(control);
  if (options?.format !== "html" && options?.format !== "text") {
    throw capabilityError("invalid_request", "note format is required", {
      reason: "invalid_value",
      field: "format",
    });
  }
  const note = await withZoteroHostSlice(control, () => requireNote(ref));
  let detail: NoteDetailResultDto;
  try {
    detail = await readManagedNoteDetail(note, options, {
      runNativeSlice: (run) => withZoteroHostSlice(control, run),
      checkCanceled: () => throwIfWorkflowCallCanceled(control),
      readRevision: () => canonicalNoteVersion(note).revision,
    });
  } catch (error) {
    if (error instanceof ManagedNoteOwnerError) {
      const supported = new Set([
        "invalid_request",
        "invalid_ref",
        "not_found",
        "resource_limited",
        "conflict",
        "unavailable",
        "execution_failed",
        "invalid_artifact",
        "legacy_artifact_requires_migration",
      ]);
      const code = supported.has(error.code) ? error.code : "execution_failed";
      if (
        code === "invalid_artifact" ||
        code === "legacy_artifact_requires_migration"
      ) {
        throw new ZoteroManagedArtifactDiagnostic(
          code as ManagedArtifactDiagnosticCode,
          error.message,
          error.details,
          error.retryable,
        );
      }
      throw capabilityError(
        code as ZoteroHostCapabilityErrorCode,
        error.message,
        error.details as WorkflowHostErrorDetailsByCode[WorkflowHostErrorCode],
        error.retryable,
      );
    }
    throw error;
  }
  throwIfWorkflowCallCanceled(control);
  return enrichManagedNoteDetail(detail, control);
}

async function enrichManagedNoteDetail(
  detail: NoteDetailResultDto,
  control: WorkflowCallControl,
): Promise<NoteDetailResultDto> {
  if (detail.kind !== "managed" || detail.noteKind !== "citation-analysis") {
    return detail;
  }
  if (!detail.parentRef) {
    return finalizeManagedNoteDetail({ ...detail, health: { state: "stale" } });
  }
  let references: Awaited<ReturnType<typeof managedSingleton>>;
  try {
    references = await managedSingleton(
      detail.parentRef,
      "references",
      control,
    );
  } catch (error) {
    // A damaged, legacy, or ambiguous References dependency makes Citation
    // health unavailable, but does not invalidate the Citation payload that
    // was read successfully. Infrastructure/read failures still propagate.
    if (!isCitationReferenceDependencyFailure(error)) throw error;
    return finalizeManagedNoteDetail({ ...detail, health: { state: "stale" } });
  }
  if (
    !references.inspection ||
    references.inspection.kind !== "managed" ||
    references.inspection.noteKind !== "references"
  ) {
    return finalizeManagedNoteDetail({ ...detail, health: { state: "stale" } });
  }
  const health = deriveCitationHealth(
    detail.provenance?.referencesBasis,
    references.inspection.payload,
  );
  let markdown: string | undefined;
  try {
    markdown = renderCitationAnalysisMarkdown({
      citation: detail.payload,
      references: references.inspection.payload,
    });
  } catch {
    // Keep the semantic detail and explicit basis health even if the derived
    // renderer cannot project the current report. Export/readiness callers
    // must classify health from the basis, never from renderer success.
  }
  const enriched = {
    ...detail,
    health,
    derived: {
      ...detail.derived,
      ...(markdown !== undefined ? { markdown } : {}),
    },
  } satisfies ManagedNoteDetailDto;
  assertWorkflowHostStrictJsonValue(enriched as unknown as JsonValue);
  try {
    return finalizeManagedNoteDetail(enriched);
  } catch (error) {
    if (error instanceof ManagedNoteOwnerError) mapManagedOwnerError(error);
    throw error;
  }
}

function isCitationReferenceDependencyFailure(error: unknown) {
  if (error instanceof ManagedNoteOwnerError) {
    if (error.code === "legacy_artifact_requires_migration") return true;
    const noteKind = String(
      error.details.noteKind || error.details.managedType || "",
    );
    if (error.code === "invalid_artifact") return noteKind === "references";
    return (
      error.code === "conflict" &&
      error.details.reason === "ambiguous_state" &&
      (!noteKind || noteKind === "references")
    );
  }
  if (error instanceof ZoteroHostCapabilityError && error.code === "conflict") {
    const details = error.details as WorkflowHostErrorDetailsByCode["conflict"];
    return details.reason === "ambiguous_state" && details.kind === "note";
  }
  return false;
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
