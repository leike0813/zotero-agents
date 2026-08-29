export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type PortableItemRef = Readonly<{
  libraryId: number;
  key: string;
}>;

export type PortableCollectionRef = Readonly<{
  libraryId: number;
  key: string;
}>;

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

type WorkflowHostContextApi = Pick<
  ZoteroHostCapabilityBroker["context"],
  "getCurrentView" | "getSelectedItems"
>;

type WorkflowHostLibraryApi = Pick<
  ZoteroHostCapabilityBroker["library"],
  "listItems" | "syncSnapshot" | "searchItems"
> & {
  getItemDetail(
    ref: WorkflowHostItemRefInput,
  ): ReturnType<ZoteroHostCapabilityBroker["library"]["getItemDetail"]>;
  getItemNotes(
    ref: WorkflowHostItemRefInput,
    args?: Parameters<
      ZoteroHostCapabilityBroker["library"]["getItemNotes"]
    >[1],
  ): ReturnType<ZoteroHostCapabilityBroker["library"]["getItemNotes"]>;
  getNoteDetail(
    ref: WorkflowHostItemRefInput,
    args?: ZoteroHostNoteDetailArgs,
  ): ReturnType<ZoteroHostCapabilityBroker["library"]["getNoteDetail"]>;
  listNotePayloads(
    ref: WorkflowHostItemRefInput,
  ): ReturnType<ZoteroHostCapabilityBroker["library"]["listNotePayloads"]>;
  getNotePayload(
    ref: WorkflowHostItemRefInput,
    args?: ZoteroHostNotePayloadDetailArgs,
  ): ReturnType<ZoteroHostCapabilityBroker["library"]["getNotePayload"]>;
  getItemAttachments(
    ref: WorkflowHostItemRefInput,
  ): ReturnType<
    ZoteroHostCapabilityBroker["library"]["getItemAttachments"]
  >;
};

type WorkflowHostMutationApi = {
  preview(
    request: WorkflowHostMutationRequest,
  ): ReturnType<ZoteroHostCapabilityBroker["mutations"]["preview"]>;
  execute(
    request: WorkflowHostMutationRequest,
  ): ReturnType<ZoteroHostCapabilityBroker["mutations"]["execute"]>;
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
  SynthesisPaperArtifactsRequest,
  SynthesisPaperArtifactsResult,
  SynthesisTagAuditReplaceRequest,
  SynthesisTagCommandResult,
  SynthesisTagSelectionRequest,
  SynthesisTagSuggestionStageRequest,
  SynthesisTagStagedSuggestion,
  SynthesisTagVocabularySnapshot,
  SynthesisTagVocabularySaveRequest,
  SynthesisTopicReportRequest,
  SynthesisTopicReportResult,
  SynthesisWorkflowItemSnapshot,
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
  fileId: string;
  path: string;
  displayName: string;
  contentType: string;
  size?: number;
  sha256?: string;
};

export type WorkflowResourceOutputDescriptor = {
  slotId: string;
  fileId: string;
  sourceKind: "workflow-artifact";
  displayName: string;
  contentType: string;
  size?: number;
  sha256?: string;
  createdAt: string;
  expiresAt: string;
  downloadCommand: string;
};

export type WorkflowResourceApi = {
  mode: WorkflowInvocationMode;
  getInput: (slotId: string) => WorkflowResourceFile | null;
  getInputs: (slotId: string) => WorkflowResourceFile[];
  allocateOutput: (args: {
    slotId: string;
    suggestedName?: string;
    contentType?: string;
  }) => Promise<{ path: string }>;
  publishOutput: (args: {
    slotId: string;
    path: string;
    displayName?: string;
    contentType?: string;
  }) => Promise<WorkflowResourceOutputDescriptor>;
  listOutputs: () => WorkflowResourceOutputDescriptor[];
};

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
      args: import("../modules/zoteroItemTextExporter").WorkflowItemTextExportArgs,
    ) => Promise<
      import("../modules/zoteroItemTextExporter").WorkflowItemTextExportResult
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
  researchBundles: {
    materializePapers: (args: {
      papers: Array<{ paperRef: string }>;
      sourcePaperRefs?: string[];
    }) => Promise<{
      entries: import("../modules/researchBundleService").ResearchBundleEntry[];
      warnings: import("../modules/researchBundleService").ResearchBundleWarning[];
      papers: Record<string, unknown>[];
    }>;
  };
  prefs: {
    get: (key: string, global?: boolean) => unknown;
    set: (key: string, value: unknown, global?: boolean) => void;
    clear: (key: string, global?: boolean) => void;
  };
  parents: typeof import("../handlers").handlers.parent;
  notes: typeof import("../handlers").handlers.note & {
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
  attachments: typeof import("../handlers").handlers.attachment & {
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
  tags: typeof import("../handlers").handlers.tag;
  statusTags: {
    getPolicy: () => Readonly<Record<BuiltinStatusKey, BuiltinStatusTag>>;
    transition: (args: {
      item: Zotero.Item | number | string;
      add?: BuiltinStatusKey[];
      remove?: BuiltinStatusKey[];
    }) => Promise<{
      added: BuiltinStatusTag[];
      removed: BuiltinStatusTag[];
      warnings: Array<{
        code: string;
        operation: "add" | "remove";
        tags: BuiltinStatusTag[];
        message: string;
      }>;
    }>;
  };
  collections: typeof import("../handlers").handlers.collection;
  command: typeof import("../handlers").handlers.command;
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
  synthesis?: WorkflowSynthesisApi;
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

export interface WorkflowSynthesisApi {
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
