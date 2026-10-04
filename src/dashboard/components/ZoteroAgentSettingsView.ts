// Page-side view model for the Zotero Agent settings window.
//
// The controller turns a snapshot plus its own transient draft state into
// these pure-data selections; every region compares its own selection by
// signature (see ZoteroAgentSettingsRenderer). Nothing here crosses postMessage
// except through the wire contract, and no selection may carry a plaintext
// secret: a submitted secret lives only in the controller draft until the save
// settles.

import type {
  ZoteroAgentSettingsCatalogModel,
  ZoteroAgentSettingsCatalogProvider,
  ZoteroAgentSettingsConnection,
  ZoteroAgentSettingsLabels,
  ZoteroAgentSettingsMcpSource,
  ZoteroAgentSettingsModelConfiguration,
  ZoteroAgentSettingsRegistration,
  ZoteroAgentSettingsWebSource,
} from "../../shared/zoteroAgentSettingsWireContract";
import type {
  PiExecutionApi,
  PiReasoningLevel,
} from "../../shared/piProviderContract";
import type { Tone } from "./ZoteroAgentSettingsControls";

/** Common authentication choices; every other header is a binding row. */
export type ZoteroAgentSettingsMcpAuthKind = "none" | "bearer" | "api-key";

export type SettingsPage =
  | "overview"
  | "connections"
  | "mcp"
  | "search"
  | "catalog";

export type NavSelection = {
  labels: ZoteroAgentSettingsLabels;
  page: SettingsPage;
  groups: {
    label: string;
    items: { id: SettingsPage; label: string; badge?: string }[];
  }[];
};

export type StatusSelection = { text: string; tone: Tone } | null;

// Onboarding ---------------------------------------------------------------

export type OverviewSelection = {
  labels: ZoteroAgentSettingsLabels;
  hero: { title: string; description: string };
  steps: {
    id: string;
    label: string;
    state: "complete" | "current" | "todo";
  }[];
  setupChoices:
    | { id: string; title: string; description: string; mark: string }[]
    | null;
  tasks: {
    id: string;
    title: string;
    detail: string;
    actionLabel: string;
    primary: boolean;
  }[];
};

// Model workbench ----------------------------------------------------------

export type PurposeKey = "global" | "conversation" | "skillRun" | "auxiliary";

export type PurposeSummaryItem = {
  key: PurposeKey;
  label: string;
  note: string;
  value: string;
  detail: string;
  disabled: boolean;
  connectionId: string;
};

export type ConnectionRow = {
  id: string;
  label: string;
  kind: string;
  mark: string;
  stateLabel: string;
  stateTone: Tone;
  purposes: string[];
  selected: boolean;
};

export type ModelCardView = {
  id: string;
  name: string;
  note: string;
  overlayApplied: boolean;
  availability: { label: string; tone: Tone };
  reasoning: {
    value: string;
    options: { value: string; label: string }[];
  } | null;
  purposes: {
    key: PurposeKey;
    label: string;
    state: "assigned" | "inherited" | "unset";
    disabled: boolean;
    title: string;
  }[];
  test: { label: string; tone: Tone } | null;
  testDetail: string | null;
  canTest: boolean;
  testLabel: string;
  testPending: boolean;
  /**
   * Any action of this card is in flight. Purpose buttons stay disabled while
   * it is, so the selection has to carry it: a card that is only re-rendered
   * when its own visible facts change must still reflect the pending state.
   */
  pending: boolean;
  removable: boolean;
};

export type AccountView = {
  registration: ZoteroAgentSettingsRegistration | null;
  /** Identity every account action uses: a saved registration or a draft id. */
  registrationId: string;
  /** The authorization fact itself; `stateLabel` is its localized wording. */
  signedIn: boolean;
  stateLabel: string;
  stateTone: Tone;
  notice: {
    id: string;
    tone: Tone;
    title: string;
    description: string;
    actionLabel?: string;
    action?: "reauthorize" | "accept-welcome" | "usage";
  } | null;
  progress: { phase: string; cancelLabel: string } | null;
  canConnect: boolean;
  connectLabel: string;
  canSignOut: boolean;
  canRemove: boolean;
  pending: boolean;
};

export type ConnectionDetailView = {
  id: string;
  label: string;
  kind: string;
  stateLabel: string;
  stateTone: Tone;
  account: AccountView | null;
  lines: { label: string; value: string }[];
  repair: { label: string; description: string } | null;
  models: ModelCardView[];
  modelsEmptyHint: string | null;
  discovery: { tone: Tone; text: string } | null;
  canAddModel: boolean;
  refreshLabel: string;
  refreshPending: boolean;
  saveFailure: string | null;
};

export type WorkbenchSelection = {
  labels: ZoteroAgentSettingsLabels;
  title: string;
  description: string;
  addLabel: string;
  empty: {
    title: string;
    description: string;
    primaryLabel: string;
    secondaryLabel: string;
  } | null;
  purposes: PurposeSummaryItem[];
  rows: ConnectionRow[];
  detail: ConnectionDetailView | null;
  failure: string | null;
};

// MCP ----------------------------------------------------------------------

export type McpSourceCardView = {
  id: string;
  label: string;
  transportLabel: string;
  address: string;
  enabled: boolean;
  pendingSecret: boolean;
  admission: { tone: Tone; text: string };
  test: { label: string; tone: Tone } | null;
  testDetail: string | null;
  canTest: boolean;
  testPending: boolean;
  editLabel: string;
  removeLabel: string;
};

export type McpSelection = {
  labels: ZoteroAgentSettingsLabels;
  title: string;
  description: string;
  addLabel: string;
  jsonLabels: { edit: string; import: string; export: string };
  empty: { title: string; description: string; actionLabel: string } | null;
  sources: McpSourceCardView[];
  failure: string | null;
};

// Search -------------------------------------------------------------------

export type WebSourceRowView = {
  id: string;
  label: string;
  enabled: boolean;
  enabledDisabled: boolean;
  detail: string;
  billable: boolean;
  order: { canMoveUp: boolean; canMoveDown: boolean };
  configureLabel: string;
  testLabel: string;
  canTest: boolean;
  testPending: boolean;
  test: { label: string; tone: Tone } | null;
  testDetail: string | null;
};

export type SearchSelection = {
  labels: ZoteroAgentSettingsLabels;
  title: string;
  description: string;
  banner: string;
  rows: WebSourceRowView[];
  failure: string | null;
};

// Catalog and maintenance --------------------------------------------------

export type CatalogModelRow = {
  key: string;
  name: string;
  detail: string;
  badge: { label: string; tone: Tone } | null;
  added: boolean;
  addLabel: string;
  addDisabled: boolean;
};

export type MaintenanceSection = {
  id: string;
  title: string;
  badge: string;
  description: string;
  controls: {
    id: string;
    label: string;
    disabled: boolean;
    danger?: boolean;
  }[];
  switch: { label: string; checked: boolean; disabled: boolean } | null;
  hint: string | null;
  feedback: { tone: Tone; text: string } | null;
  pending: boolean;
};

export type CatalogSelection = {
  labels: ZoteroAgentSettingsLabels;
  title: string;
  description: string;
  providerOptions: {
    value: string;
    label: string;
    description?: string;
    disabled: boolean;
  }[];
  providerId: string;
  providerSummary: string;
  providerReason: string | null;
  providerAction: { label: string; disabled: boolean } | null;
  query: string;
  counts: string;
  models: CatalogModelRow[];
  emptyHint: string | null;
  paging: {
    canPrevious: boolean;
    canNext: boolean;
    page: number;
    pageCount: number;
  };
  sections: MaintenanceSection[];
  failure: string | null;
};

// Dialogs ------------------------------------------------------------------

export type BindingEntryView = {
  id: string;
  field: string;
  value: string;
  saved: boolean;
  placeholder: string;
  ariaField: string;
  ariaValue: string;
  removeLabel: string;
};

export type ConnectionEditorSelection = {
  mode: "add" | "edit";
  title: string;
  existing: boolean;
  canSwitch: boolean;
  connectionOptions: { value: string; label: string }[];
  kind: string;
  repairNotice: {
    title: string;
    description: string;
    accepted: boolean;
  } | null;
  label: string;
  provider: {
    label: string;
    value: string;
    locked: boolean;
    options: {
      value: string;
      label: string;
      description?: string;
      disabled: boolean;
    }[];
  } | null;
  parameters: {
    id: string;
    label: string;
    value: string;
    placeholder?: string;
  }[];
  resolvedEndpoint: string | null;
  registration: {
    options: {
      value: string;
      label: string;
      description?: string;
      disabled: boolean;
    }[];
    value: string;
    labelValue: string;
    identity: { id: string; label: string; value: string; help: string };
  } | null;
  account: AccountView | null;
  models: ModelCardView[];
  endpoint: { value: string; placeholder?: string } | null;
  dialect: {
    value: PiExecutionApi;
    options: {
      value: PiExecutionApi;
      label: string;
      description?: string;
    }[];
  } | null;
  keyless: { checked: boolean; label: string } | null;
  localApproval: {
    checked: boolean;
    label: string;
    address: string;
  } | null;
  secret: {
    label: string;
    value: string;
    placeholder: string;
    help: string;
  } | null;
  hint: string;
  failure: string | null;
  pending: boolean;
  canSave: boolean;
  saveLabel: string;
  cancelLabel: string;
  discardLabel: string;
};

export type McpEditorSelection = {
  title: string;
  label: string;
  transport: {
    value: string;
    options: { value: string; label: string; description?: string }[];
  };
  address: { label: string; value: string };
  argv: { value: string; removeLabel: string }[];
  addArgLabel: string;
  argvHelp: string;
  cwd: { value: string; placeholder: string; help: string };
  env: BindingEntryView[];
  envLabel: string;
  addEnvLabel: string;
  localApproval: { checked: boolean; label: string; address: string } | null;
  auth: {
    value: ZoteroAgentSettingsMcpAuthKind;
    options: { value: string; label: string; description?: string }[];
    headerLabel: string;
    apiType: {
      value: string;
      options: { value: string; label: string; description?: string }[];
      customField: { label: string; value: string; placeholder: string } | null;
    } | null;
    secret: {
      label: string;
      value: string;
      placeholder: string;
      help: string;
    } | null;
  };
  headers: BindingEntryView[];
  headersLabel: string;
  addHeaderLabel: string;
  headersOpen: boolean;
  problem: string | null;
  hint: string;
  failure: string | null;
  pending: boolean;
  canSave: boolean;
  saveLabel: string;
  cancelLabel: string;
  discardLabel: string;
};

export type McpJsonSelection = {
  mode: "edit" | "import" | "export";
  title: string;
  description: string;
  value: string;
  readOnly: boolean;
  conflictIds: string[];
  grantIds: string[];
  summary: string | null;
  problems: readonly { sourceId: string; field: string; code: string }[];
  pending: boolean;
  failure: string | null;
  saveLabel: string;
  cancelLabel: string;
  discardLabel: string;
  canSave: boolean;
};

export type WebEditorSelection = {
  title: string;
  kind: string;
  kindLabel: string;
  note: string | null;
  connection: {
    value: string;
    options: { value: string; label: string; description?: string }[];
    label: string;
    emptyHint: string | null;
  } | null;
  model: {
    value: string;
    options: { value: string; label: string; description?: string }[];
    label: string;
  } | null;
  endpoint: { label: string; value: string } | null;
  localApproval: { checked: boolean; label: string; address: string } | null;
  executable: { label: string; value: string } | null;
  args: { label: string; value: string; invalid: boolean } | null;
  secret: {
    label: string;
    value: string;
    placeholder: string;
    help: string;
  } | null;
  billable: boolean;
  hint: string;
  failure: string | null;
  pending: boolean;
  canSave: boolean;
  saveLabel: string;
  cancelLabel: string;
  discardLabel: string;
};

export type ConfirmSelection = {
  id: string;
  title: string;
  body: string[];
  list: string[];
  emptyList: string | null;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  pending: boolean;
};

export type TestConfirmSelection = {
  id: string;
  title: string;
  subject: string;
  description: string;
  usageWarning: string | null;
  confirmLabel: string;
  cancelLabel: string;
};

export type LeaveSelection = {
  id: string;
  title: string;
  body: string;
  continueLabel: string;
  discardLabel: string;
  saveLabel: string;
  canSave: boolean;
  pending: boolean;
  failure: string | null;
};

export type ModelPickerSelection = {
  title: string;
  providerLabel: string;
  connectionId: string;
  query: string;
  counts: string;
  models: CatalogModelRow[];
  emptyHint: string | null;
  paging: {
    canPrevious: boolean;
    canNext: boolean;
    page: number;
    pageCount: number;
  };
  closeLabel: string;
  pending: boolean;
  /** Feedback for an add that has not settled yet. */
  failure: string | null;
};

export type DialogSelection =
  | { kind: "connection-editor"; value: ConnectionEditorSelection }
  | { kind: "mcp-editor"; value: McpEditorSelection }
  | { kind: "mcp-json"; value: McpJsonSelection }
  | { kind: "web-editor"; value: WebEditorSelection }
  | { kind: "confirm"; value: ConfirmSelection }
  | { kind: "test"; value: TestConfirmSelection }
  | { kind: "model-picker"; value: ModelPickerSelection }
  | null;

/**
 * The unsaved-change guard is a separate layer rather than a replacement: the
 * editor it guards stays mounted underneath, so continuing to edit restores the
 * same inputs with the same focus, selection and caret.
 */
export type LeaveGuardSelection = {
  kind: "leave";
  value: LeaveSelection;
} | null;

export type ZoteroAgentSettingsView = {
  nav: NavSelection;
  status: StatusSelection;
  overview: OverviewSelection | null;
  workbench: WorkbenchSelection | null;
  mcp: McpSelection | null;
  search: SearchSelection | null;
  catalog: CatalogSelection | null;
  dialog: DialogSelection;
  leave: LeaveGuardSelection;
};

export type {
  PiReasoningLevel,
  Tone,
  ZoteroAgentSettingsCatalogModel,
  ZoteroAgentSettingsCatalogProvider,
  ZoteroAgentSettingsConnection,
  ZoteroAgentSettingsMcpSource,
  ZoteroAgentSettingsModelConfiguration,
  ZoteroAgentSettingsRegistration,
  ZoteroAgentSettingsWebSource,
};

// Handlers -----------------------------------------------------------------
//
// One handler object, created once per controller, is shared by every region,
// so a handler identity change never invalidates a region memo. Draft edits go
// through the four patch handlers instead of one handler per field: the draft
// field bags are plain data, and the controller decides which edits are
// structural (re-render) and which are keystrokes (silent).

export type ConnectionDraftFields = {
  label: string;
  provider: string;
  registrationId: string;
  registrationLabel: string;
  baseUrl: string;
  api: PiExecutionApi;
  enabled: boolean;
  keyless: boolean;
  localApproved: boolean;
  acceptRepair: boolean;
  parameters: Record<string, string>;
  secret: string;
};

export type McpEntryDraft = {
  id: string;
  field: string;
  value: string;
  saved: boolean;
  cleared?: boolean;
};

export type McpDraftFields = {
  label: string;
  transport: "http" | "stdio";
  address: string;
  argv: string[];
  cwd: string;
  authKind: string;
  authField: string;
  secret: string;
  localApproved: boolean;
  cleartextApproved: boolean;
  /**
   * One ordered list of binding rows keyed by exact field identity. The form
   * presents them as environment rows for stdio and as advanced header rows
   * plus the primary authentication field for HTTP, but the save always sends
   * this single list, so a row cannot be claimed by two fields.
   */
  bindings: McpEntryDraft[];
  headersOpen: boolean;
};

export type McpJsonDraftFields = {
  text: string;
  replaceSourceIds: string[];
  grantIds: string[];
  removeMissing: boolean;
};

export type WebDraftFields = {
  modelConfigurationId: string;
  searchModelId: string;
  endpoint: string;
  executable: string;
  args: string;
  secret: string;
  localApproved: boolean;
  codeExecutionApproved: boolean;
};

export type McpEntryScope = "env" | "headers";
export type McpEntryOperation =
  | { type: "add" }
  | { type: "remove"; id: string }
  | { type: "patch"; id: string; patch: Partial<McpEntryDraft> };

export type ZoteroAgentSettingsHandlers = {
  navigate(page: SettingsPage): void;
  startAddConnection(kind: "chatgpt" | "api-key" | "custom"): void;
  selectConnection(id: string): void;
  editConnection(id: string): void;
  switchEditedConnection(id: string): void;
  patchConnectionDraft(patch: Partial<ConnectionDraftFields>): void;
  commitConnectionDraftField(): void;
  saveConnectionDraft(): void;
  closeConnectionEditor(): void;
  resolveLeave(decision: "save" | "discard" | "continue"): void;
  refreshAccountModels(connectionId: string): void;
  connectAccount(
    connectionId: string,
    registrationId: string,
    reconsent?: boolean,
  ): void;
  cancelAuthorization(): void;
  acceptWelcome(registrationId: string): void;
  openUsage(registrationId: string): void;
  openModelPicker(connectionId: string): void;
  setModelPickerQuery(query: string): void;
  addModelFromPicker(modelId: string): void;
  assignPurpose(cardId: string, key: PurposeKey, value?: string): void;
  setCardReasoning(cardId: string, reasoning: string): void;
  requestModelTest(cardId: string): void;
  requestRemoveModel(cardId: string): void;
  requestRemoveConnection(connectionId: string): void;
  requestRegistrationRemoval(registrationId: string, remove: boolean): void;
  runModelTest(allowUsage: boolean): void;
  confirmDialog(): void;
  cancelDialog(): void;
  addMcpSource(): void;
  editMcpSource(id: string): void;
  patchMcpDraft(patch: Partial<McpDraftFields>): void;
  mcpArg(operation: { type: "add" } | { type: "remove"; index: number }): void;
  setMcpArg(index: number, value: string): void;
  mcpEntry(scope: McpEntryScope, operation: McpEntryOperation): void;
  toggleMcpSourceEnabled(id: string, enabled: boolean): void;
  requestTestMcpSource(id: string): void;
  requestRemoveMcpSource(id: string): void;
  saveMcpDraft(): void;
  openMcpJson(mode: "edit" | "import" | "export"): void;
  patchMcpJsonDraft(patch: Partial<McpJsonDraftFields>): void;
  saveMcpJson(): void;
  editWebSource(id: string): void;
  patchWebDraft(patch: Partial<WebDraftFields>): void;
  saveWebDraft(): void;
  toggleWebSourceEnabled(id: string, enabled: boolean): void;
  moveWebSource(id: string, offset: number): void;
  requestTestWebSource(id: string): void;
  setCatalogProvider(provider: string): void;
  setCatalogQuery(query: string): void;
  moveCatalogPage(delta: number): void;
  runMaintenance(sectionId: string, controlId: string, value?: boolean): void;
};
