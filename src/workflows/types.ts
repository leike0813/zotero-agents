import type {
  ZoteroHostAttachmentDto,
  ZoteroHostCurrentViewDto,
  ZoteroHostItemDetailDto,
  ZoteroHostItemRefInput,
  ZoteroHostLibraryListArgs,
  ZoteroHostLibraryListResponse,
  ZoteroHostItemSearchArgs,
  ZoteroHostItemSummaryDto,
  ZoteroHostMutationExecuteResponse,
  ZoteroHostMutationPreviewResponse,
  ZoteroHostMutationRequest,
  ZoteroHostNoteDetailArgs,
  ZoteroHostNoteDetailChunkDto,
  ZoteroHostNoteDto,
  ZoteroHostNotePayloadDetailArgs,
  ZoteroHostNotePayloadDetailDto,
  ZoteroHostNotePayloadSummaryDto,
} from "../modules/zoteroHostCapabilityBroker";
import type { WorkflowResultContext } from "../modules/workflowExecution/resultContext";
import type { ProductStorageApi } from "../modules/workflowProductStore";
import type { SynthesisService } from "../modules/synthesis/service";
export type { WorkflowResultContext } from "../modules/workflowExecution/resultContext";

export type WorkflowParameterType = "string" | "number" | "boolean";

export type WorkflowParameterOptionsSource = {
  kind: "zotero.collections" | string;
  library?: "current" | "user" | number;
  includeEmpty?: boolean;
  valueFormat?: "collectionRef" | string;
  labelFormat?: "path" | string;
  allowStale?: boolean;
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
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  allowCustom?: boolean;
  optionsSource?: WorkflowParameterOptionsSource;
  min?: number;
  max?: number;
};

export type WorkflowHooksSpec = {
  filterInputs?: string;
  buildRequest?: string;
  normalizeSettings?: string;
  applyResult: string;
};

export type WorkflowInputsSpec = {
  unit: "attachment" | "parent" | "note" | "workflow";
  accepts?: {
    mime?: string[];
  };
  per_parent?: {
    min?: number;
    max?: number;
  };
};

export type WorkflowTriggerSpec = {
  requiresSelection?: boolean;
};

export type WorkflowExecutionSpec = {
  mode?: "auto" | "sync" | "async";
  mcp?: {
    requiredTools?: string[];
  };
  skillrunner_mode?: "auto" | "interactive";
  poll_interval_ms?: number;
  timeout_ms?: number;
  feedback?: {
    showNotifications?: boolean;
  };
};

export type WorkflowResultSpec = {
  fetch?: {
    type?: "bundle" | "result";
  };
  expects?: {
    result_json?: string;
    artifacts?: string[];
  };
};

export type WorkflowRequestSpec = {
  kind: string;
  create?: {
    skill_id?: string;
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
  [key: string]: unknown;
};

export type WorkflowManifest = {
  id: string;
  label: string;
  debug_only?: boolean;
  provider: string;
  version?: string;
  taskNameTemplate?: string;
  parameters?: Record<string, WorkflowParameterSchema>;
  inputs?: WorkflowInputsSpec;
  trigger?: WorkflowTriggerSpec;
  execution?: WorkflowExecutionSpec;
  result?: WorkflowResultSpec;
  request?: WorkflowRequestSpec;
  hooks: WorkflowHooksSpec;
};

export type WorkflowPackageManifest = {
  id: string;
  version: string;
  workflows: string[];
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
  basenameOrFallback: (targetPath: string | undefined, fallback: string) => string;
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
};

export type WorkflowHostApi = {
  version: number;
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
    getByLibraryAndKey: (
      libraryID: number,
      key: string,
    ) => Zotero.Item | null;
    getAll: () => Promise<Zotero.Item[]>;
  };
  context: {
    getCurrentView: () => ZoteroHostCurrentViewDto;
    getSelectedItems: () => ZoteroHostItemSummaryDto[];
  };
  library: {
    listItems: (
      args: ZoteroHostLibraryListArgs,
    ) => Promise<ZoteroHostLibraryListResponse>;
    searchItems: (
      args: ZoteroHostItemSearchArgs,
    ) => Promise<ZoteroHostItemSummaryDto[]>;
    getItemDetail: (
      ref: ZoteroHostItemRefInput,
    ) => Promise<ZoteroHostItemDetailDto | null>;
    getItemNotes: (
      ref: ZoteroHostItemRefInput,
      args?: {
        limit?: number | string;
        cursor?: number | string;
        maxExcerptChars?: number | string;
      },
    ) => Promise<ZoteroHostNoteDto[]>;
    getNoteDetail: (
      ref: ZoteroHostItemRefInput,
      args?: ZoteroHostNoteDetailArgs,
    ) => Promise<ZoteroHostNoteDetailChunkDto>;
    listNotePayloads: (
      ref: ZoteroHostItemRefInput,
    ) => Promise<ZoteroHostNotePayloadSummaryDto[]>;
    getNotePayload: (
      ref: ZoteroHostItemRefInput,
      args?: ZoteroHostNotePayloadDetailArgs,
    ) => Promise<ZoteroHostNotePayloadDetailDto>;
    getItemAttachments: (
      ref: ZoteroHostItemRefInput,
    ) => Promise<ZoteroHostAttachmentDto[]>;
  };
  mutations: {
    preview: (
      request: ZoteroHostMutationRequest,
    ) => Promise<ZoteroHostMutationPreviewResponse>;
    execute: (
      request: ZoteroHostMutationRequest,
    ) => Promise<ZoteroHostMutationExecuteResponse>;
  };
  prefs: {
    get: (key: string, global?: boolean) => unknown;
    set: (key: string, value: unknown, global?: boolean) => void;
    clear: (key: string, global?: boolean) => void;
  };
  parents: typeof import("../handlers").handlers.parent;
  notes: typeof import("../handlers").handlers.note;
  attachments: typeof import("../handlers").handlers.attachment;
  tags: typeof import("../handlers").handlers.tag;
  collections: typeof import("../handlers").handlers.collection;
  command: typeof import("../handlers").handlers.command;
  editor: {
    openSession: (
      args: Parameters<typeof import("../modules/workflowEditorHost").openWorkflowEditorSession>[0],
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
    toast: (args: { text: string; type?: "default" | "success" | "error" }) => void;
  };
  logging: {
    appendRuntimeLog: (
      input: import("../modules/runtimeLogManager").RuntimeLogInput,
    ) => ReturnType<typeof import("../modules/runtimeLogManager").appendRuntimeLog>;
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
    exists: (path: string) => Promise<boolean>;
    makeDirectory: (path: string) => Promise<void>;
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
    pickFiles: (args?: {
      title?: string;
      directory?: string;
      filters?: [string, string][];
    }) => Promise<string[] | null>;
  };
  synthesis?: SynthesisService;
};

export type WorkflowRuntimeContext = {
  handlers: typeof import("../handlers").handlers;
  zotero: typeof Zotero;
  helpers: HookHelpers;
  addon?: typeof addon | null;
  hostApi: WorkflowHostApi;
  hostApiVersion: number;
  debugMode?: boolean;
  workflowId?: string;
  packageId?: string;
  workflowRootDir?: string;
  packageRootDir?: string;
  workflowSourceKind?: "builtin" | "user" | "";
  hookName?: "filterInputs" | "buildRequest" | "applyResult" | "";
  fetch?: typeof globalThis.fetch | null;
  Buffer?: typeof globalThis.Buffer | null;
  btoa?: typeof globalThis.btoa | null;
  atob?: typeof globalThis.atob | null;
  TextEncoder?: typeof globalThis.TextEncoder | null;
  TextDecoder?: typeof globalThis.TextDecoder | null;
  FileReader?: typeof globalThis.FileReader | null;
  navigator?: typeof globalThis.navigator | null;
};

export type BuildRequestHook = (args: {
  selectionContext: unknown;
  manifest: WorkflowManifest;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
  };
  runtime: WorkflowRuntimeContext;
}) => unknown | Promise<unknown>;

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
  manifest: WorkflowManifest;
  runtime: WorkflowRuntimeContext;
}) => unknown | Promise<unknown>;

export type FilterInputsHook = (args: {
  selectionContext: unknown;
  manifest: WorkflowManifest;
  executionOptions?: {
    workflowParams?: Record<string, unknown>;
    providerOptions?: Record<string, unknown>;
  };
  runtime: WorkflowRuntimeContext;
}) => unknown | Promise<unknown>;

export type NormalizeWorkflowSettingsHook = (args:
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
    }) => unknown;

export type WorkflowHooksModule = {
  filterInputs?: FilterInputsHook;
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
  workflowSourceKind?: "builtin" | "user" | "";
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
      | "scan_runtime_warning";
    message: string;
    entry?: string;
    workflowId?: string;
    path?: string;
    reason?: string;
  }>;
};
