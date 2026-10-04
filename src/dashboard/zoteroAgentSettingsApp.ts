// Built-in Agent settings window controller: the snapshot -> draft -> selection
// pipeline plus every action this page sends.
//
// Wire protocol (frozen in src/shared/zoteroAgentSettingsWireContract.ts, host
// side in src/modules/workflow/settings/zoteroAgentSettings.ts):
//   page  -> host : { type: "zotero-agent-settings:action", action, requestId,
//                     objectId, payload }
//   host  -> page : ":snapshot" (payload is the snapshot), ":action-result"
//             (payload { ok, code?, result?, action, requestId, objectId }),
//             optional ":progress" and ":request-close".
//
// Two rules shape everything here:
// - The host supersedes the previous request on the same objectId, so a
//   superseded request never receives a result. The controller therefore
//   replaces the pending entry for an objectId when it dispatches the next
//   request for it, and ignores any result whose requestId is not the current
//   one for that object.
// - A secret is a control-state value. It is sent once inside a save payload,
//   cleared when that save settles successfully, kept when it fails, and never
//   put into a selection, a fingerprint or a status message.

import type {
  ZoteroAgentSettingsActionEnvelopeFor,
  ZoteroAgentSettingsActionName,
  ZoteroAgentSettingsActionPayload,
  ZoteroAgentSettingsActionResultMessage,
  ZoteroAgentSettingsActionSender,
  ZoteroAgentSettingsCatalogModel,
  ZoteroAgentSettingsCloseDecision,
  ZoteroAgentSettingsConnection,
  ZoteroAgentSettingsConnectionInput,
  ZoteroAgentSettingsLabels,
  ZoteroAgentSettingsMcpImportPreview,
  ZoteroAgentSettingsMcpSource,
  ZoteroAgentSettingsModelConfiguration,
  ZoteroAgentSettingsModelTestOutcome,
  ZoteroAgentSettingsRegistration,
  ZoteroAgentSettingsSnapshot,
  ZoteroAgentSettingsSourceTestOutcome,
  ZoteroAgentSettingsWebSource,
} from "../shared/zoteroAgentSettingsWireContract";
import {
  ZOTERO_AGENT_SETTINGS_ACTION,
  ZOTERO_AGENT_SETTINGS_SCOPES,
} from "../shared/zoteroAgentSettingsWireContract";
import {
  isZoteroAgentSettingsProgressMessage,
  isZoteroAgentSettingsRequestCloseMessage,
  isZoteroAgentSettingsSnapshotMessage,
  isZoteroAgentSettingsActionResultMessage,
} from "../shared/zoteroAgentSettingsWireContract";
import type { PiMcpSourceInput } from "../shared/piMcpSourceContract";
import type {
  PiExecutionApi,
  PiReasoningLevel,
} from "../shared/piProviderContract";
import { PI_API_AUTH_VARIANTS } from "../shared/piProviderContract";
import type {
  AccountView,
  CatalogModelRow,
  ConnectionDraftFields,
  DialogSelection,
  MaintenanceSection,
  McpDraftFields,
  McpEntryDraft,
  ZoteroAgentSettingsMcpAuthKind,
  McpJsonDraftFields,
  ModelCardView,
  PurposeKey,
  SettingsPage,
  StatusSelection,
  Tone,
  WebDraftFields,
  ZoteroAgentSettingsHandlers,
  ZoteroAgentSettingsView,
} from "./components/ZoteroAgentSettingsView";
import { text } from "./components/ZoteroAgentSettingsControls";
import { createZoteroAgentSettingsRenderer } from "./zoteroAgentSettingsRenderer";

export const PURPOSES: {
  key: PurposeKey;
  label: string;
  fallback: string;
}[] = [
  { key: "global", label: "purposeGeneral", fallback: "General" },
  {
    key: "conversation",
    label: "purposeConversation",
    fallback: "Conversation",
  },
  { key: "skillRun", label: "purposeSkillRun", fallback: "Skill Run" },
  { key: "auxiliary", label: "purposeTitle", fallback: "Title" },
];

const REASONING_LABELS: Record<string, string> = {
  off: "Off",
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "Very high",
  max: "Max",
};

const KIND_MARKS: Record<string, string> = {
  chatgpt: "C",
  "api-key": "API",
  custom: "API",
};

export type ZoteroAgentSettingsControllerDeps = {
  sendAction: ZoteroAgentSettingsActionSender;
  renderView: (view: ZoteroAgentSettingsView) => void;
};

type PendingRequest = { action: string; requestId: string; label: string };

type ModelTestRecord = {
  requestId: string;
  bindingIdentity?: string;
  outcome: ZoteroAgentSettingsModelTestOutcome;
};

type SourceTestRecord = {
  requestId: string;
  bindingIdentity?: string;
  outcome: ZoteroAgentSettingsSourceTestOutcome;
};

type LeaveNext =
  | { kind: "navigate"; page: SettingsPage; after?: () => void }
  | { kind: "cancel" }
  | { kind: "switch"; connectionId: string }
  | { kind: "close"; requestId: string };

type LeaveTrigger = {
  scope: "connection" | "mcp" | "json" | "web";
  next: LeaveNext;
};

type ActiveDialog =
  | { kind: "connection-methods" }
  | { kind: "connection-editor" }
  | { kind: "mcp-editor" }
  | { kind: "mcp-json" }
  | { kind: "web-editor" }
  | { kind: "model-picker" }
  | {
      kind: "confirm";
      id: string;
      subject: {
        connectionId?: string;
        cardId?: string;
        sourceId?: string;
        registrationId?: string;
        remove?: boolean;
      };
    }
  | { kind: "test"; targetId: string; domain: "model" | "mcp" | "web" }
  | null;

type ConnectionDraft = {
  id: string;
  kind: "chatgpt" | "api-key" | "custom";
  existing: boolean;
  fields: ConnectionDraftFields;
  baseline: string;
  /** Registration this draft will bind; a fresh draft gets a draft id. */
  registrationId: string;
};

type McpDraft = {
  id: string;
  existing: boolean;
  fields: McpDraftFields;
  baseline: string;
};

type McpJsonDraft = {
  mode: "edit" | "import" | "export";
  fields: McpJsonDraftFields;
  baseline: string;
  preview?: ZoteroAgentSettingsMcpImportPreview;
};

type WebDraft = {
  id: string;
  fields: WebDraftFields;
  baseline: string;
};

type SettingsState = {
  snapshot: ZoteroAgentSettingsSnapshot | null;
  page: SettingsPage;
  selectedConnectionId: string;
  status: StatusSelection;
  pending: Record<string, PendingRequest>;
  failures: Record<string, string>;
  modelTests: Record<string, ModelTestRecord>;
  sourceTests: Record<string, SourceTestRecord>;
  auth: {
    requestId: string;
    objectId: string;
    connectionId: string;
    phase: string;
  } | null;
  connectionDraft: ConnectionDraft | null;
  mcpDraft: McpDraft | null;
  mcpJsonDraft: McpJsonDraft | null;
  webDraft: WebDraft | null;
  dialog: ActiveDialog;
  leave: LeaveTrigger | null;
  modelPicker: { connectionId: string; query: string; offset: number } | null;
  catalogProvider: string;
  catalogQuery: string;
  catalogOffset: number;
  maintenanceFeedback: Record<string, { tone: Tone; text: string }>;
  windowClosed: boolean;
};

// ---------------------------------------------------------------------------
// Small pure helpers
// ---------------------------------------------------------------------------

let idCounter = 0;

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

function fingerprint(value: unknown): string {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return String(value);
  }
}

function isLocalEndpoint(value: string): boolean {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(value || "");
}

function isAbsolutePath(value: string): boolean {
  return /^(\/|[A-Za-z]:[\\/])/.test(value || "");
}

function isValidEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

// A custom endpoint speaks one of the OpenAI-shaped execution APIs, and the
// executor's own admission table decides which authentication each of them
// takes. The form projects that table instead of holding a second rule: a
// keyless connection has no authorization to send, so only an API that admits
// "none" is offered for it.
const CUSTOM_DIALECTS: readonly PiExecutionApi[] = [
  "openai-responses",
  "openai-completions",
];

const CUSTOM_DIALECT_LABELS: Readonly<Record<string, string>> = {
  "openai-responses": "OpenAI Responses",
  "openai-completions": "OpenAI Chat Completions",
};

function dialectsFor(
  authVariant: "none" | "api-key",
): readonly PiExecutionApi[] {
  return CUSTOM_DIALECTS.filter((api) =>
    PI_API_AUTH_VARIANTS[api].includes(authVariant),
  );
}

function parseStringArray(value: string): string[] | null {
  try {
    const parsed = JSON.parse(value);
    if (
      !Array.isArray(parsed) ||
      parsed.some((item) => typeof item !== "string")
    )
      return null;
    return parsed as string[];
  } catch {
    return null;
  }
}

function availabilityTone(ready: boolean): Tone {
  return ready ? "success" : "warning";
}

function connectionStateLabel(
  labels: ZoteroAgentSettingsLabels,
  connection: ZoteroAgentSettingsConnection,
): string {
  return text(
    labels,
    `connectionState_${connection.availability.code}`,
    connection.availability.ready
      ? "Ready"
      : connection.availability.code.replace(/_/g, " "),
  );
}

function discoveryMessage(
  labels: ZoteroAgentSettingsLabels,
  connection: ZoteroAgentSettingsConnection,
): { tone: Tone; text: string } | null {
  const key = `discovery_${connection.discovery.status}`;
  const text_ = text(labels, key, "");
  if (!text_) return null;
  const tone: Tone =
    connection.discovery.status === "ready"
      ? "success"
      : connection.discovery.status === "checking"
        ? "info"
        : "warning";
  return { tone, text: text_ };
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export function createZoteroAgentSettingsController(
  deps: ZoteroAgentSettingsControllerDeps,
) {
  const state: SettingsState = {
    snapshot: null,
    page: "overview",
    selectedConnectionId: "",
    status: null,
    pending: {},
    failures: {},
    modelTests: {},
    sourceTests: {},
    auth: null,
    connectionDraft: null,
    mcpDraft: null,
    mcpJsonDraft: null,
    webDraft: null,
    dialog: null,
    leave: null,
    modelPicker: null,
    catalogProvider: "",
    catalogQuery: "",
    catalogOffset: 0,
    maintenanceFeedback: {},
    windowClosed: false,
  };

  const labels = (): ZoteroAgentSettingsLabels => state.snapshot?.labels || {};

  function connections(): readonly ZoteroAgentSettingsConnection[] {
    return state.snapshot?.state.connections || [];
  }

  function cards(): readonly ZoteroAgentSettingsModelConfiguration[] {
    return state.snapshot?.state.configurations || [];
  }

  function defaults() {
    return state.snapshot?.state.defaults || {};
  }

  function registration(
    id: string | undefined,
  ): ZoteroAgentSettingsRegistration | undefined {
    if (!id) return undefined;
    return (state.snapshot?.registrations || []).find(
      (entry) => entry.id === id,
    );
  }

  function cardsOf(connectionId: string) {
    return cards().filter((card) => card.connectionId === connectionId);
  }

  function cardById(id: string) {
    return cards().find((card) => card.id === id);
  }

  function connectionById(id: string | undefined) {
    if (!id) return undefined;
    return connections().find((entry) => entry.id === id);
  }

  function credentialMask(ref: string | undefined): string | undefined {
    if (!ref) return undefined;
    const all = [
      ...(state.snapshot?.credentials || []),
      ...(state.snapshot?.mcpCredentials || []),
      ...(state.snapshot?.webCredentials || []),
    ];
    return all.find((entry) => entry.id === ref)?.masked;
  }

  function render(): void {
    deps.renderView(buildView());
  }

  function setStatus(message: string, tone: Tone = "muted"): void {
    state.status = message ? { text: message, tone } : null;
  }

  function isPending(objectId: string, action?: string): boolean {
    const entry = state.pending[objectId];
    return !!entry && (!action || entry.action === action);
  }

  function dispatch<Action extends ZoteroAgentSettingsActionName>(
    action: Action,
    objectId: string,
    payload: ZoteroAgentSettingsActionPayload<Action>,
  ): string {
    // The host aborts the previous request on this objectId, so the superseded
    // one will never answer: replace its pending entry instead of stacking.
    const requestId = nextId(action);
    state.pending[objectId] = { action, requestId, label: action };
    deps.sendAction(action, requestId, objectId, payload);
    return requestId;
  }

  function connectionInput(
    draft: ConnectionDraft,
  ): ZoteroAgentSettingsConnectionInput {
    const fields = draft.fields;
    return {
      id: draft.id,
      kind: draft.kind,
      label: fields.label.trim(),
      provider: fields.provider,
      authVariant:
        draft.kind === "chatgpt"
          ? "chatgpt"
          : draft.kind === "custom" && fields.keyless
            ? "none"
            : "api-key",
      registrationId:
        draft.kind === "chatgpt" ? draft.registrationId : undefined,
      registrationLabel:
        draft.kind === "chatgpt"
          ? fields.registrationLabel.trim() || undefined
          : undefined,
      baseUrl: draft.kind === "custom" ? fields.baseUrl.trim() : undefined,
      api: draft.kind === "custom" && fields.api ? fields.api : undefined,
      parameters: Object.keys(fields.parameters).length
        ? { ...fields.parameters }
        : undefined,
      enabled: fields.enabled,
      requiresLocalNetwork:
        draft.kind === "custom" ? isLocalEndpoint(fields.baseUrl) : undefined,
      acceptLocalNetwork: fields.localApproved || undefined,
      acceptRepair: fields.acceptRepair || undefined,
    };
  }

  function connectionBaseline(fields: ConnectionDraftFields): string {
    const { secret: _secret, ...comparable } = fields;
    void _secret;
    return fingerprint(comparable);
  }

  function connectionDirty(draft: ConnectionDraft): boolean {
    return (
      !!draft.fields.secret.trim() ||
      connectionBaseline(draft.fields) !== draft.baseline
    );
  }

  function openConnectionEditor(
    kind: "chatgpt" | "api-key" | "custom",
    existing?: ZoteroAgentSettingsConnection,
  ): void {
    const fields: ConnectionDraftFields = existing
      ? {
          label: existing.label,
          provider: existing.provider,
          registrationId: existing.registrationId || "",
          registrationLabel: registration(existing.registrationId)?.label || "",
          baseUrl: existing.baseUrl || "",
          api:
            existing.api === "openai-completions"
              ? "openai-completions"
              : "openai-responses",
          enabled: existing.enabled,
          keyless: existing.authVariant === "none",
          localApproved: !!existing.localNetworkApproved,
          acceptRepair: false,
          parameters: { ...(existing.parameters || {}) },
          secret: "",
        }
      : {
          label: "",
          provider: kind === "api-key" ? firstProviderId() : "openai",
          registrationId: "",
          registrationLabel: "",
          baseUrl: kind === "custom" ? "http://localhost:8000/v1" : "",
          // A custom endpoint starts keyless, and only an API that admits no
          // authentication can serve it, so that is where the form starts.
          api: kind === "custom" ? dialectsFor("none")[0] : "openai-responses",
          enabled: true,
          keyless: kind === "custom",
          localApproved: false,
          acceptRepair: false,
          parameters: {},
          secret: "",
        };
    const draft: ConnectionDraft = {
      id: existing?.id || nextId("connection"),
      kind: existing?.kind || kind,
      existing: !!existing,
      fields,
      baseline: connectionBaseline(fields),
      registrationId:
        existing?.registrationId ||
        (kind === "chatgpt" ? nextId("registration") : ""),
    };
    state.connectionDraft = draft;
    state.dialog = { kind: "connection-editor" };
    if (kind === "api-key" && !existing) {
      const provider = catalogProviders().find(
        (entry) => entry.id === fields.provider,
      );
      if (provider) fields.label = provider.label || fields.provider;
    }
    render();
  }

  function firstProviderId(): string {
    const providers = catalogProviders();
    return providers.find((entry) => entry.configurable)?.id || "openai";
  }

  function catalogProviders() {
    return state.snapshot?.catalog.providers || [];
  }

  // -- MCP drafts ------------------------------------------------------------

  function mcpSource(id: string) {
    return (state.snapshot?.mcpSources || []).find((entry) => entry.id === id);
  }

  function bindingEntries(
    source?: ZoteroAgentSettingsMcpSource,
  ): McpEntryDraft[] {
    if (!source) return [];
    return Object.keys(source.credentialSlots || {}).map((field) => ({
      id: nextId("binding"),
      field,
      value: "",
      saved: !!source.credentialSlots[field],
    }));
  }

  function openMcpEditor(source?: ZoteroAgentSettingsMcpSource): void {
    const authentication = source?.authentication || { kind: "none" };
    const fields: McpDraftFields = {
      label: source?.label || "",
      transport: source?.transport || "http",
      address: source ? source.url || source.executable || "" : "",
      argv: [...(source?.argv || [])],
      cwd: source?.cwd || "",
      authKind: authentication.kind,
      authField:
        authentication.kind === "none" ? "" : authentication.field || "",
      secret: "",
      localApproved: !!source?.localNetworkApproval,
      cleartextApproved: !!source?.cleartextApproval,
      bindings: bindingEntries(source),
      headersOpen: false,
    };
    state.mcpDraft = {
      id: source?.id || nextId("mcp"),
      existing: !!source,
      fields,
      baseline: mcpBaseline(fields),
    };
    state.dialog = { kind: "mcp-editor" };
    render();
  }

  function mcpBaseline(fields: McpDraftFields): string {
    return fingerprint({
      label: fields.label,
      transport: fields.transport,
      address: fields.address,
      argv: fields.argv,
      cwd: fields.cwd,
      authKind: fields.authKind,
      authField: fields.authField,
      localApproved: fields.localApproved,
      cleartextApproved: fields.cleartextApproved,
      // A row's identity and its explicit removal matter; its typed value is a
      // secret in control state and never part of the baseline.
      bindings: fields.bindings.map((row) => [row.field, row.saved]),
    });
  }

  function mcpDirty(draft: McpDraft): boolean {
    return (
      !!draft.fields.secret.trim() ||
      mcpBaseline(draft.fields) !== draft.baseline
    );
  }

  function mcpAuthEntry(fields: McpDraftFields): McpEntryDraft | undefined {
    if (fields.authKind === "none" || !fields.authField) return undefined;
    return fields.bindings.find((row) => row.field === fields.authField);
  }

  function mcpOtherBindings(fields: McpDraftFields): McpEntryDraft[] {
    const auth = mcpAuthEntry(fields);
    return fields.bindings.filter((row) => !auth || row.id !== auth.id);
  }

  function mcpInput(draft: McpDraft): PiMcpSourceInput {
    const fields = draft.fields;
    const authentication =
      fields.authKind === "none" || !fields.authField
        ? { kind: "none" as const }
        : fields.authKind === "bearer"
          ? { kind: "bearer" as const, field: fields.authField }
          : { kind: "apiKey" as const, field: fields.authField };
    const bindings = fields.bindings
      .filter((row) => row.field.trim())
      .map((row) => ({
        field: row.field.trim(),
        ...(row.value.trim() ? { secret: row.value } : {}),
      }));
    const isStdio = fields.transport === "stdio";
    return {
      id: draft.id,
      label: fields.label.trim(),
      transport: fields.transport,
      enabled: mcpSource(draft.id)?.enabled ?? true,
      ...(isStdio
        ? {
            executable: fields.address.trim(),
            argv: fields.argv.filter((item) => item !== ""),
            // An empty cwd is omitted, so transport resolves the managed
            // runtime directory instead of persisting a stale absolute path.
            ...(fields.cwd.trim() ? { cwd: fields.cwd.trim() } : {}),
          }
        : { url: fields.address.trim() }),
      authentication,
      bindings,
      ...(fields.localApproved ? { approveLocalNetwork: true } : {}),
      ...(fields.cleartextApproved ? { approveCleartext: true } : {}),
    };
  }

  function mcpProblem(draft: McpDraft): string | null {
    const input = mcpInput(draft);
    if (!input.label)
      return text(labels(), "mcpProblemLabel", "Give the source a name.");
    if (input.transport === "stdio") {
      if (!isAbsolutePath(input.executable || ""))
        return text(
          labels(),
          "mcpProblemExecutable",
          "Enter the executable as an absolute path.",
        );
      if (input.cwd && !isAbsolutePath(input.cwd))
        return text(
          labels(),
          "mcpProblemCwd",
          "Enter the working directory as an absolute path.",
        );
    } else {
      if (!isValidEndpoint(input.url || ""))
        return text(
          labels(),
          "mcpProblemUrl",
          "Enter a valid http or https address.",
        );
      if (isLocalEndpoint(input.url || "") && !draft.fields.localApproved)
        return text(
          labels(),
          "mcpProblemLocal",
          "Approve this local tool service before saving.",
        );
    }
    const seen = new Set<string>();
    for (const row of input.bindings) {
      const key =
        input.transport === "http" ? row.field.toLowerCase() : row.field;
      if (seen.has(key))
        return text(
          labels(),
          "mcpProblemDuplicate",
          "Two rows use the same field name. Remove or rename one.",
        );
      seen.add(key);
    }
    return null;
  }

  /** The registry owns the test identity; the page only compares it. */
  function mcpTestIdentity(source: ZoteroAgentSettingsMcpSource): string {
    return state.snapshot?.mcpTestIdentity?.[source.id] ?? "";
  }

  // -- Search drafts ---------------------------------------------------------

  function webSource(id: string) {
    return (state.snapshot?.webSources || []).find((entry) => entry.id === id);
  }

  function openWebEditor(source: ZoteroAgentSettingsWebSource): void {
    const fields: WebDraftFields = {
      modelConfigurationId: source.modelConfigurationId || "",
      searchModelId: source.searchModelId || "",
      endpoint: source.endpoint || "",
      executable: source.executable || "",
      args: JSON.stringify(source.args || []),
      secret: "",
      localApproved: !!source.localNetworkApproved,
      codeExecutionApproved: !!source.codeExecutionApproved,
    };
    state.webDraft = {
      id: source.id,
      fields,
      baseline: webBaseline(fields),
    };
    state.dialog = { kind: "web-editor" };
    render();
  }

  function webBaseline(fields: WebDraftFields): string {
    const { secret: _secret, ...comparable } = fields;
    void _secret;
    return fingerprint(comparable);
  }

  function webDirty(draft: WebDraft): boolean {
    return (
      !!draft.fields.secret.trim() ||
      webBaseline(draft.fields) !== draft.baseline
    );
  }

  function webInput(source: ZoteroAgentSettingsWebSource, draft: WebDraft) {
    return {
      id: source.id,
      kind: source.kind,
      label: source.label,
      enabled: source.enabled,
      credentialId: source.credentialId,
      modelConfigurationId: draft.fields.modelConfigurationId || undefined,
      searchModelId: draft.fields.searchModelId || undefined,
      endpoint: draft.fields.endpoint.trim() || source.endpoint,
      executable: draft.fields.executable.trim() || source.executable,
      args:
        parseStringArray(draft.fields.args) ||
        (source.args ? [...source.args] : undefined),
      localNetworkApproved:
        draft.fields.localApproved || source.localNetworkApproved,
      codeExecutionApproved:
        draft.fields.codeExecutionApproved || source.codeExecutionApproved,
    };
  }

  // -- Purposes --------------------------------------------------------------

  function effectiveDefault(key: PurposeKey) {
    const explicit = defaults()[key];
    if (explicit) return explicit;
    return key === "conversation" || key === "skillRun"
      ? defaults().global
      : undefined;
  }

  /**
   * What an explicit removal actually changes, derived from the projected
   * defaults: a removed general default leaves specialized purposes unset, a
   * removed specialized purpose falls back to inheritance, and a removed title
   * purpose disables provider-based titles. No arbitrary replacement is chosen.
   */
  function removalEffects(connectionId: string, cardId?: string): string[] {
    const affected = PURPOSES.filter(({ key }) => {
      const value = defaults()[key];
      if (!value) return false;
      const card = cardById(value.configurationId);
      if (!card || card.connectionId !== connectionId) return false;
      return cardId ? card.id === cardId : true;
    });
    const removesGeneral = affected.some((entry) => entry.key === "global");
    void cardId;
    const general = defaults().global;
    const effects = affected.map(({ key, label, fallback }) => {
      const name = text(labels(), label, fallback);
      if (key === "global") return `${name}: becomes unset`;
      if (key === "auxiliary")
        return `${name}: provider-based titles are disabled`;
      if (removesGeneral || !general)
        return `${name}: returns to inheritance, but the general default is unset`;
      const owner = connectionById(
        cardById(general.configurationId)?.connectionId,
      );
      const model = cardById(general.configurationId);
      return `${name}: returns to the general default ${owner?.label || ""} · ${model?.name || ""}`;
    });
    if (removesGeneral) {
      for (const { key, label, fallback } of PURPOSES) {
        if (key !== "conversation" && key !== "skillRun") continue;
        if (defaults()[key]) continue;
        effects.push(
          `${text(labels(), label, fallback)}: the inherited general default becomes unset`,
        );
      }
    }
    return effects;
  }

  // -- Leave flow ------------------------------------------------------------

  function dirtyScope(): LeaveTrigger["scope"] | null {
    if (state.connectionDraft && connectionDirty(state.connectionDraft))
      return "connection";
    if (state.mcpDraft && mcpDirty(state.mcpDraft)) return "mcp";
    if (
      state.mcpJsonDraft &&
      state.mcpJsonDraft.mode !== "export" &&
      fingerprint({ text: state.mcpJsonDraft.fields.text }) !==
        state.mcpJsonDraft.baseline
    )
      return "json";
    if (state.webDraft && webDirty(state.webDraft)) return "web";
    return null;
  }

  /** What to do once a leave dialog resolves without a draft in the way. */
  let pendingLeave: (() => void) | null = null;

  function requestLeave(next: LeaveNext): void {
    const scope = dirtyScope();
    if (!scope) {
      const then = pendingLeave;
      pendingLeave = null;
      applyNext(next);
      then?.();
      return;
    }
    // The guard stacks over the editor: the editor is never unmounted, so
    // continuing to edit keeps the same DOM, focus and selection.
    state.leave = { scope, next };
    render();
  }

  function requestLeaveThen(next: LeaveNext, then: () => void): void {
    pendingLeave = then;
    requestLeave(next);
  }

  function applyNext(next: LeaveNext): void {
    if (next.kind === "navigate") {
      state.page = next.page;
      closeDrafts();
      next.after?.();
      render();
      return;
    }
    if (next.kind === "switch") {
      const target = connectionById(next.connectionId);
      state.selectedConnectionId = next.connectionId;
      closeDrafts();
      if (target) openConnectionEditor(target.kind, target);
      else render();
      return;
    }
    if (next.kind === "cancel") {
      closeDrafts();
      render();
      return;
    }
    answerClose(next.requestId, "discard");
  }

  function closeDrafts(): void {
    cancelAuthAttempt();
    state.leave = null;
    state.connectionDraft = null;
    state.mcpDraft = null;
    state.mcpJsonDraft = null;
    state.webDraft = null;
    state.dialog = null;
  }

  function answerClose(
    closeRequestId: string,
    decision: ZoteroAgentSettingsCloseDecision,
  ): void {
    dispatch("close-window", ZOTERO_AGENT_SETTINGS_SCOPES.window, {
      closeRequestId,
      decision,
    });
  }

  function resolveLeave(decision: "save" | "discard" | "continue"): void {
    const trigger = state.leave;
    if (!trigger) return;
    const { scope, next } = trigger;
    if (decision === "continue") {
      // Continuing keeps the form and its draft exactly as the user left it:
      // the editor was never unmounted underneath the guard.
      state.leave = null;
      pendingLeave = null;
      if (next.kind === "close") answerClose(next.requestId, "continue");
      else render();
      return;
    }
    if (decision === "discard") {
      closeDrafts();
      const then = pendingLeave;
      pendingLeave = null;
      applyNext(next);
      then?.();
      return;
    }
    const continuation = pendingLeave;
    pendingLeave = null;
    const after = () => {
      closeDrafts();
      applyNext(next);
      continuation?.();
    };
    if (scope === "connection") saveConnectionDraft(after);
    else if (scope === "mcp") saveMcpDraft(after);
    else if (scope === "json") saveMcpJson(after);
    else saveWebDraft(after);
  }

  function navigate(page: SettingsPage): void {
    if (page === state.page) return;
    requestLeave({
      kind: "navigate",
      page,
      after: () => onPageEntered(state.page),
    });
  }

  /** Opening a page asks its owner for the bounded facts it needs, once. */
  function onPageEntered(page: SettingsPage): void {
    if (page !== "catalog") return;
    dispatch("pi-catalog-query", ZOTERO_AGENT_SETTINGS_SCOPES.catalog, {
      provider: state.catalogProvider || undefined,
      query: state.catalogQuery || undefined,
      offset: state.catalogOffset || 0,
    });
  }

  // -- Authorization ---------------------------------------------------------

  function cancelAuthAttempt(): void {
    if (!state.auth) return;
    const { requestId } = state.auth;
    state.auth = null;
    // Cancelling stops this attempt only; a completed registration stays owned
    // by its own registration, independent of any connection draft.
    dispatch("pi-chatgpt-cancel", requestId, {});
  }

  function beginAuth(
    connectionId: string,
    registrationId: string,
    reconsent?: boolean,
  ): void {
    if (state.auth) return;
    const objectId = registrationId;
    const requestId = dispatch("pi-chatgpt-connect", objectId, {
      // Only a registration the snapshot already knows is reused; a fresh
      // draft id asks the owner to create one.
      registrationId: registration(registrationId) ? registrationId : undefined,
      label:
        state.connectionDraft?.fields.registrationLabel.trim() || undefined,
      reconsent,
    });
    state.auth = { requestId, objectId, connectionId, phase: "waiting" };
    setStatus(
      text(
        labels(),
        "authWaiting",
        "Waiting for the browser sign-in. This attempt can be cancelled.",
      ),
    );
    render();
  }

  // -- Saves -----------------------------------------------------------------

  function connectionCanSave(draft: ConnectionDraft): boolean {
    if (isPending(draft.id) || !draft.fields.label.trim()) return false;
    if (draft.kind === "chatgpt") return !!draft.registrationId;
    if (draft.kind === "custom") {
      if (!isValidEndpoint(draft.fields.baseUrl.trim())) return false;
      if (isLocalEndpoint(draft.fields.baseUrl) && !draft.fields.localApproved)
        return false;
    }
    const existing = connectionById(draft.id);
    if (existing?.repairRequired && !draft.fields.acceptRepair) return false;
    if (
      draft.fields.keyless !==
      (existing?.authVariant === "none" && draft.kind === "custom")
    ) {
      // A connection that uses a key needs one: a submitted secret, or the key
      // it already saved.
      if (
        !draft.fields.keyless &&
        !draft.fields.secret.trim() &&
        !existing?.credentialRef
      )
        return false;
    }
    return true;
  }

  function saveConnectionDraft(after?: () => void): void {
    const draft = state.connectionDraft;
    if (!draft || !connectionCanSave(draft)) return;
    const objectId = draft.id;
    const secret = draft.fields.secret.trim();
    const continuation = after;
    state.connectionDraft = { ...draft, fields: { ...draft.fields } };
    dispatch("pi-upsert-configuration", objectId, {
      connection: connectionInput(draft),
      ...(secret ? { secret } : {}),
    });
    delete state.failures[objectId];
    setStatus(text(labels(), "savingConnection", "Saving the connection..."));
    pendingAfter[objectId] = continuation;
    render();
  }

  function saveMcpDraft(after?: () => void): void {
    const draft = state.mcpDraft;
    if (!draft || mcpProblem(draft)) return;
    const secret = draft.fields.secret.trim();
    const input = mcpInput(draft);
    const authentication = input.authentication;
    if (authentication.kind !== "none" && secret) {
      input.bindings = [
        ...input.bindings.filter((row) => row.field !== authentication.field),
        { field: authentication.field, secret },
      ];
    }
    const objectId = draft.id;
    dispatch("pi-mcp-upsert-source", objectId, { source: input });
    delete state.failures[objectId];
    setStatus(text(labels(), "savingMcpSource", "Saving the MCP source..."));
    pendingAfter[objectId] = after;
    render();
  }

  function openMcpJson(mode: "edit" | "import" | "export"): void {
    const document_ =
      mode === "export"
        ? JSON.stringify({ mcpServers: {} }, null, 2)
        : JSON.stringify(
            {
              mcpServers: Object.fromEntries(
                (state.snapshot?.mcpSources || []).map((source) => [
                  source.id,
                  mcpDocumentEntry(source),
                ]),
              ),
            },
            null,
            2,
          );
    const fields: McpJsonDraftFields = {
      text: document_,
      replaceSourceIds: [],
      grantIds: [],
      removeMissing: mode === "edit",
    };
    state.mcpJsonDraft = {
      mode,
      fields,
      baseline: fingerprint({ text: document_ }),
    };
    state.dialog = { kind: "mcp-json" };
    render();
  }

  // The document carries connection structure only. A saved secret is shown as
  // an empty value that the receiving profile has to fill again.
  function mcpDocumentEntry(source: ZoteroAgentSettingsMcpSource) {
    const bindingRows = Object.fromEntries(
      Object.keys(source.credentialSlots || {}).map((field) => [field, ""]),
    );
    if (source.transport === "stdio") {
      return {
        label: source.label,
        enabled: source.enabled,
        command: source.executable,
        ...(source.argv?.length ? { args: source.argv } : {}),
        ...(source.cwd ? { cwd: source.cwd } : {}),
        ...(Object.keys(bindingRows).length ? { env: bindingRows } : {}),
      };
    }
    const authentication = source.authentication;
    const headers = { ...bindingRows };
    if (authentication.kind !== "none") headers[authentication.field] = "";
    return {
      label: source.label,
      enabled: source.enabled,
      url: source.url,
      // The document carries the authentication identity as well as the empty
      // header slot: without it a full save would drop whether the field is a
      // bearer token or an API key, and the Bearer prefix would be lost.
      authentication:
        authentication.kind === "none"
          ? { kind: "none" }
          : { kind: authentication.kind, field: authentication.field },
      ...(Object.keys(headers).length ? { headers } : {}),
    };
  }

  function requestMcpJsonPreview(): void {
    const draft = state.mcpJsonDraft;
    if (!draft || draft.mode === "export") return;
    dispatch(
      "pi-mcp-preview-import",
      ZOTERO_AGENT_SETTINGS_SCOPES.mcpRegistry,
      {
        json: draft.fields.text,
        mode: draft.mode,
      },
    );
    render();
  }

  function saveMcpJson(after?: () => void): void {
    const draft = state.mcpJsonDraft;
    if (!draft || draft.mode === "export") return;
    const objectId = ZOTERO_AGENT_SETTINGS_SCOPES.mcpRegistry;
    dispatch("pi-mcp-import", objectId, {
      json: draft.fields.text,
      mode: draft.mode,
      // The preview's own revision is the concurrency basis; the page never
      // re-reads one, so a binding edited after the preview fails adoption
      // instead of being overwritten.
      expectedRevision: draft.preview?.revision,
      conflicts: Object.fromEntries(
        draft.fields.replaceSourceIds.map((id) => [id, "replace" as const]),
      ),
      approvals: draft.fields.grantIds.map((id) => ({
        sourceId: id,
        localNetwork: true,
      })),
    });
    delete state.failures[objectId];
    setStatus(
      text(labels(), "savingMcpDocument", "Saving the MCP document..."),
    );
    pendingAfter[objectId] = after;
    render();
  }

  function saveWebDraft(after?: () => void): void {
    const draft = state.webDraft;
    const source = draft ? webSource(draft.id) : undefined;
    if (!draft || !source) return;
    const objectId = draft.id;
    const secret = draft.fields.secret.trim();
    dispatch("pi-web-save-sources", objectId, {
      sources: (state.snapshot?.webSources || []).map((entry) =>
        entry.id === draft.id ? webInput(entry, draft) : webInputSaved(entry),
      ),
      ...(secret ? { secret: { sourceId: draft.id, secret } } : {}),
    });
    delete state.failures[objectId];
    setStatus(text(labels(), "savingWebSource", "Saving the search source..."));
    pendingAfter[objectId] = after;
    render();
  }

  function webInputSaved(source: ZoteroAgentSettingsWebSource) {
    return {
      id: source.id,
      kind: source.kind,
      label: source.label,
      enabled: source.enabled,
      credentialId: source.credentialId,
      modelConfigurationId: source.modelConfigurationId,
      searchModelId: source.searchModelId,
      endpoint: source.endpoint,
      executable: source.executable,
      args: source.args ? [...source.args] : undefined,
      localNetworkApproved: source.localNetworkApproved,
      codeExecutionApproved: source.codeExecutionApproved,
    };
  }

  // -- Result handling -------------------------------------------------------

  const pendingAfter: Record<string, (() => void) | undefined> = {};

  function failureText(code: string | undefined): string {
    return text(
      labels(),
      "failure_" + (code || "settings_action_failed"),
      "The action did not complete. The previous value is kept; try again.",
    );
  }

  function handleResult(message: ZoteroAgentSettingsActionResultMessage): void {
    const payload = message.payload;
    const entry = state.pending[payload.objectId];
    // A result for a superseded request, another object or another action is
    // not this page's answer: it must not clear a live pending state.
    if (
      !entry ||
      entry.requestId !== payload.requestId ||
      entry.action !== payload.action
    ) {
      return;
    }
    delete state.pending[payload.objectId];
    const after = pendingAfter[payload.objectId];
    delete pendingAfter[payload.objectId];
    if (state.auth && state.auth.objectId === payload.objectId) {
      state.auth = null;
    }
    if (!payload.ok) {
      // A failed action keeps its object, its draft and any submitted secret,
      // so the user can fix the cause and retry without retyping.
      state.failures[payload.objectId] = failureText(payload.code);
      // Each maintenance operation reports in its own section: a failed public
      // refresh never writes into the supplement or diagnostics section, and the
      // adopted content and every other form stay untouched.
      const section =
        payload.action === "pi-export-diagnostics"
          ? "diagnostics"
          : payload.action === "pi-refresh-overlay" ||
              payload.action === "pi-select-overlay-file" ||
              payload.action === "pi-catalog-remove-overlay"
            ? "overlay"
            : "directory";
      state.maintenanceFeedback[section] = {
        tone: "warning",
        text: failureText(payload.code),
      };
      setStatus(failureText(payload.code), "warning");
      render();
      return;
    }
    delete state.failures[payload.objectId];
    applyResult(payload);
    after?.();
    render();
  }

  function applyResult(
    payload: ZoteroAgentSettingsActionResultMessage["payload"],
  ): void {
    const result = (payload.result || {}) as Record<string, unknown>;
    const draft = state.connectionDraft;
    if (
      payload.action === "pi-upsert-configuration" &&
      draft &&
      draft.id === payload.objectId
    ) {
      // Only a settled save drops the submitted secret; a failed save returned
      // above, so its input still holds what the user typed.
      draft.fields = { ...draft.fields, secret: "" };
      state.selectedConnectionId = draft.id;
      state.page = "connections";
      state.connectionDraft = null;
      state.dialog = null;
      setStatus(
        text(
          labels(),
          "connectionSaved",
          "Connection saved. Default purposes and test results stay on the model cards.",
        ),
        "success",
      );
      return;
    }
    if (payload.action === "pi-mcp-upsert-source") {
      if (state.mcpDraft && state.mcpDraft.id === payload.objectId) {
        state.mcpDraft = null;
        state.dialog = null;
        // A changed source invalidates its own test evidence only.
        delete state.sourceTests[payload.objectId];
      }
      setStatus(
        text(
          labels(),
          "mcpSourceSaved",
          "MCP source saved. Later tasks use this configuration.",
        ),
        "success",
      );
      return;
    }
    if (payload.action === "pi-mcp-preview-import") {
      if (state.mcpJsonDraft) {
        state.mcpJsonDraft.preview =
          (result.preview as ZoteroAgentSettingsMcpImportPreview) || undefined;
      }
      return;
    }
    if (payload.action === "pi-mcp-import") {
      state.mcpJsonDraft = null;
      state.dialog = null;
      setStatus(
        text(labels(), "mcpDocumentSaved", "MCP configuration saved."),
        "success",
      );
      return;
    }
    if (payload.action === "pi-mcp-export") {
      if (state.mcpJsonDraft) {
        state.mcpJsonDraft.fields = {
          ...state.mcpJsonDraft.fields,
          text: String(result.document || ""),
        };
      }
      return;
    }
    if (payload.action === "pi-web-save-sources") {
      if (state.webDraft && state.webDraft.id === payload.objectId) {
        state.webDraft = null;
        state.dialog = null;
      }
      setStatus(
        text(
          labels(),
          "webSourceSaved",
          "Search source saved. It can be tested before it is enabled.",
        ),
        "success",
      );
      return;
    }
    if (payload.action === "pi-test-connection") {
      const outcome = result as unknown as ZoteroAgentSettingsModelTestOutcome;
      const record = state.modelTests[payload.objectId];
      if (record) {
        record.outcome = outcome;
        record.bindingIdentity =
          outcome.bindingIdentity || record.bindingIdentity;
      }
      setStatus(
        outcome.completed
          ? text(
              labels(),
              outcome.resumeLifted ? "testCompletedResumed" : "testCompleted",
              outcome.resumeLifted
                ? "The probe completed and lifted the pause. Existing tasks still continue manually."
                : "This model's test request completed.",
            )
          : text(
              labels(),
              "testIncomplete",
              "The request did not complete. Configuration and default purposes are kept, and the pause stays.",
            ),
        outcome.completed ? "success" : "warning",
      );
      return;
    }
    if (
      payload.action === "pi-mcp-test-source" ||
      payload.action === "pi-web-test-source"
    ) {
      const outcome = result as unknown as ZoteroAgentSettingsSourceTestOutcome;
      const record = state.sourceTests[payload.objectId];
      if (record) {
        record.outcome = outcome;
        record.bindingIdentity =
          outcome.bindingIdentity || record.bindingIdentity;
      }
      setStatus(
        outcome.status === "available"
          ? text(labels(), "sourceTestAvailable", "The source answered.")
          : failureText(outcome.code),
        outcome.status === "available" ? "success" : "warning",
      );
      return;
    }
    if (payload.action === "pi-chatgpt-connect") {
      const registrationId = result.registrationId
        ? String(result.registrationId)
        : "";
      if (registrationId) {
        const pending = state.connectionDraft;
        if (pending) {
          pending.registrationId = registrationId;
          pending.fields = {
            ...pending.fields,
            registrationId,
            registrationLabel:
              pending.fields.registrationLabel.trim() ||
              pending.fields.label.trim(),
          };
          pending.baseline = connectionBaseline(pending.fields);
        }
        // A completed login belongs to the registration alone: the owner that
        // signed in already refreshed the models it discovered, so the page
        // asks for nothing here. A settled attempt can never open a second
        // browser authorization, and the account is not fetched twice.
      }
      setStatus(
        registrationId
          ? text(
              labels(),
              "authCompleted",
              "Signed in. Confirm the plan statement, then save the connection.",
            )
          : failureText("provider_auth_failed"),
        registrationId ? "success" : "warning",
      );
      return;
    }
    if (
      payload.action === "pi-catalog-refresh-public" ||
      payload.action === "pi-catalog-restore-previous" ||
      payload.action === "pi-catalog-remove-overlay" ||
      payload.action === "pi-refresh-overlay" ||
      payload.action === "pi-select-overlay-file" ||
      payload.action === "pi-export-diagnostics"
    ) {
      applyMaintenanceResult(payload, result);
      return;
    }
    if (payload.action === "pi-upsert-model") {
      if (
        state.modelPicker &&
        state.modelPicker.connectionId === payload.objectId
      ) {
        // The card exists only once the owner adopted the model, so the picker
        // closes on that result and not when the request was sent.
        state.modelPicker = null;
        state.dialog = null;
        setStatus(
          text(
            labels(),
            "modelAdded",
            "Model added. Set its default purposes on the card.",
          ),
          "success",
        );
        return;
      }
      setStatus(
        text(labels(), "modelSaved", "Model options saved."),
        "success",
      );
      return;
    }
    if (payload.action === "pi-remove-model") {
      delete state.modelTests[payload.objectId];
      setStatus(
        text(
          labels(),
          "modelRemoved",
          "Model removed. Default purposes follow the confirmed effect; the connection and its credential are kept.",
        ),
        "success",
      );
      return;
    }
    if (payload.action === "pi-delete-configuration") {
      state.selectedConnectionId = "";
      setStatus(
        text(
          labels(),
          "connectionRemoved",
          "Connection removed. Other connections and existing requests are untouched.",
        ),
        "success",
      );
      return;
    }
    if (payload.action === "pi-set-defaults") {
      setStatus(
        text(labels(), "purposeSaved", "Default purpose saved."),
        "success",
      );
      return;
    }
    if (payload.action === "close-window") {
      state.windowClosed = true;
      setStatus(text(labels(), "windowClosing", "Closing..."));
      return;
    }
    setStatus(text(labels(), "done_" + payload.action, "Done."), "success");
  }

  function applyMaintenanceResult(
    payload: ZoteroAgentSettingsActionResultMessage["payload"],
    result: Record<string, unknown>,
  ): void {
    const sectionId =
      payload.action === "pi-export-diagnostics" ? "diagnostics" : "overlay";
    if (result.canceled) {
      state.maintenanceFeedback[sectionId] = {
        tone: "muted",
        text: text(
          labels(),
          "maintenanceCanceled",
          "Canceled. Nothing changed.",
        ),
      };
      return;
    }
    if (
      payload.action === "pi-refresh-overlay" ||
      payload.action === "pi-select-overlay-file"
    ) {
      const changed = Number(result.changed || 0);
      const added = Number(result.added || 0);
      state.maintenanceFeedback[sectionId] = {
        tone: "success",
        text: text(
          labels(),
          "overlayAdopted",
          "Adopted the supplement: " +
            changed +
            " changed, " +
            added +
            " added.",
        ),
      };
      return;
    }
    if (payload.action === "pi-export-diagnostics") {
      state.maintenanceFeedback[sectionId] = {
        tone: "success",
        text: text(
          labels(),
          "diagnosticsExported",
          "Diagnostics exported. The file holds no account credential or conversation text.",
        ),
      };
      return;
    }
    if (payload.action === "pi-catalog-restore-previous") {
      state.maintenanceFeedback[sectionId] = {
        tone: "success",
        text: text(
          labels(),
          "catalogRestored",
          "The previous directory is restored and automatic updates are off.",
        ),
      };
      return;
    }
    state.maintenanceFeedback[sectionId] = {
      tone: "success",
      text: text(
        labels(),
        "catalogUpdated",
        "Directory checked. Account model lists refresh on their own connection.",
      ),
    };
  }

  // -- View builders ---------------------------------------------------------

  function modelTestFor(card: ZoteroAgentSettingsModelConfiguration) {
    const record = state.modelTests[card.id];
    if (!record) return null;
    // Evidence belongs to the bindings it was produced for: a rename keeps it,
    // a real target, authentication or card change drops it.
    if (
      card.bindingIdentity &&
      record.bindingIdentity &&
      card.bindingIdentity !== record.bindingIdentity
    ) {
      return null;
    }
    return record;
  }

  function modelCardView(
    card: ZoteroAgentSettingsModelConfiguration,
    connection: ZoteroAgentSettingsConnection,
  ): ModelCardView {
    const test = modelTestFor(card);
    const ready = connection.availability.ready;
    const paused = registration(connection.registrationId)?.paused === true;
    const purposes = PURPOSES.map(({ key, label, fallback }) => {
      const name = text(labels(), label, fallback);
      const explicit = defaults()[key];
      const assigned = explicit?.configurationId === card.id;
      const inherited =
        !explicit &&
        (key === "conversation" || key === "skillRun") &&
        effectiveDefault(key)?.configurationId === card.id;
      const disabled =
        isPending(card.id) ||
        (!ready && !assigned) ||
        (key === "global" && assigned);
      return {
        key,
        label: name,
        state: assigned
          ? ("assigned" as const)
          : inherited
            ? ("inherited" as const)
            : ("unset" as const),
        disabled,
        title: assigned
          ? key === "global"
            ? text(
                labels(),
                "purposeCurrentGeneral",
                "The current general model",
              )
            : key === "auxiliary"
              ? text(
                  labels(),
                  "purposeDisableTitle",
                  "Click to disable automatic titles",
                )
              : text(
                  labels(),
                  "purposeInherit",
                  "Click to return to the general default",
                )
          : key === "auxiliary"
            ? text(
                labels(),
                "purposeEnableTitle",
                "Use for automatic conversation titles",
              )
            : text(
                labels(),
                "purposeAssign",
                "Set as the " + name.toLowerCase() + " default",
              ),
      };
    });
    return {
      id: card.id,
      name: card.name,
      note: card.binding?.model
        ? text(
            labels(),
            "modelContextNote",
            "Context " +
              (card.binding.model.contextWindow || 0).toLocaleString() +
              " · output " +
              (card.binding.model.maxTokens || 0).toLocaleString(),
          )
        : text(
            labels(),
            "modelNoNote",
            "Configured for this connection target",
          ),
      overlayApplied: card.binding?.model?.provenance?.source === "overlay",
      availability: {
        label: card.availability.usable
          ? text(labels(), "modelUsable", "Usable")
          : text(
              labels(),
              "modelUnavailable_" + card.availability.reason,
              card.availability.reason.replace(/_/g, " "),
            ),
        tone: card.availability.usable
          ? ("success" as const)
          : ("warning" as const),
      },
      reasoning:
        card.reasoningLevels && card.reasoningLevels.length
          ? {
              value: card.reasoning || card.reasoningLevels[0],
              options: card.reasoningLevels.map((level) => ({
                value: level,
                label: REASONING_LABELS[level] || level,
              })),
            }
          : null,
      purposes,
      test: test
        ? {
            label: test.outcome.completed
              ? text(labels(), "testBadgeCompleted", "Test completed")
              : text(labels(), "testBadgeIncomplete", "Test did not complete"),
            tone: test.outcome.completed
              ? ("success" as const)
              : ("warning" as const),
          }
        : null,
      testDetail: test
        ? test.outcome.possibleUsage
          ? text(
              labels(),
              "testPossibleUsage",
              "This probe may have consumed quota.",
            )
          : test.outcome.completed
            ? ""
            : text(
                labels(),
                "testIncomplete",
                "The request did not complete; the pause stays.",
              )
        : null,
      canTest: ready || paused,
      testLabel: paused
        ? text(labels(), "testAndResume", "Test and resume")
        : text(labels(), "testModel", "Test this model"),
      testPending: isPending(card.id, "pi-test-connection"),
      pending: isPending(card.id),
      removable: !isPending(card.id),
    };
  }

  function accountView(
    connection: ZoteroAgentSettingsConnection,
  ): AccountView | null {
    if (connection.kind !== "chatgpt") return null;
    const entry = registration(connection.registrationId);
    const pending =
      state.auth?.connectionId === connection.id ? state.auth : null;
    const notices: AccountView["notice"][] = [];
    if (entry?.signedIn && !entry.planEnabled) {
      notices.push({
        id: "permission",
        tone: "warning",
        title: text(
          labels(),
          "accountNoPlan",
          "Signed in, but this account has not allowed the ChatGPT plan.",
        ),
        description: text(
          labels(),
          "accountNoPlanHelp",
          "Reauthorization lets this application use your plan, then returns here.",
        ),
        actionLabel: text(labels(), "reauthorize", "Reauthorize"),
        action: "reauthorize",
      });
    }
    if (entry?.signedIn && entry.planEnabled && !entry.welcomeAccepted) {
      notices.push({
        id: "welcome",
        tone: "info",
        title: text(
          labels(),
          "accountWelcomeTitle",
          "Allow Built-in Agent to use this ChatGPT plan?",
        ),
        description: text(
          labels(),
          "accountWelcomeHelp",
          "Running conversations, Skill Runs or a connection test uses plan quota. Signing in alone does not.",
        ),
        actionLabel: text(labels(), "acceptPlan", "Allow this plan"),
        action: "accept-welcome",
      });
    }
    if (entry?.signedIn && entry.reauthorizationRequired) {
      notices.push({
        id: "reauthorize",
        tone: "warning",
        title: text(
          labels(),
          "accountReauthorizeTitle",
          "Authorization needs an update",
        ),
        description: text(
          labels(),
          "accountReauthorizeHelp",
          "New model requests for this account are disabled until it is authorized again.",
        ),
        actionLabel: text(labels(), "reauthorize", "Reauthorize"),
        action: "reauthorize",
      });
    }
    if (entry?.signedIn && entry.paused) {
      notices.push({
        id: "paused",
        tone: "warning",
        title: text(
          labels(),
          "accountPausedTitle",
          "This account's model calls are paused",
        ),
        description: text(
          labels(),
          "accountPausedHelp",
          "Check usage, then send one trial request to see whether it recovered. No task resumes by itself.",
        ),
        actionLabel: text(labels(), "manageUsage", "Manage usage"),
        action: "usage",
      });
    }
    return {
      registration: entry || null,
      registrationId:
        connection.registrationId ||
        state.connectionDraft?.registrationId ||
        "",
      stateLabel: !entry
        ? text(labels(), "accountNone", "No account yet")
        : entry.signedIn
          ? text(labels(), "accountSignedIn", "Signed in")
          : text(labels(), "accountSignedOut", "Signed out"),
      stateTone: entry?.signedIn ? "success" : "warning",
      signedIn: !!entry?.signedIn,
      notice: notices[0] || null,
      progress: pending
        ? {
            phase: text(
              labels(),
              "authPhase_" + pending.phase,
              pending.phase === "waiting"
                ? "Waiting for the browser sign-in..."
                : pending.phase === "exchange"
                  ? "Exchanging the authorization..."
                  : pending.phase === "verify"
                    ? "Verifying the account..."
                    : "The attempt ended; sign in again.",
            ),
            cancelLabel: text(labels(), "cancelAuth", "Cancel sign-in"),
          }
        : null,
      canConnect: !pending,
      connectLabel: entry
        ? text(labels(), "reconnectChatgpt", "Sign in again")
        : text(labels(), "connectChatgpt", "Sign in with ChatGPT"),
      canSignOut: !!entry?.signedIn,
      canRemove: !!entry,
      pending: !!pending,
    };
  }

  function connectionDetailView(connection: ZoteroAgentSettingsConnection) {
    const stateLabel = connectionStateLabel(labels(), connection);
    const account = accountView(connection);
    return {
      id: connection.id,
      label: connection.label,
      kind: connection.kind,
      stateLabel,
      stateTone: availabilityTone(connection.availability.ready),
      account,
      lines:
        connection.kind === "chatgpt"
          ? []
          : [
              {
                label: text(labels(), "detailService", "Service"),
                value:
                  connection.kind === "custom"
                    ? connection.baseUrl || ""
                    : connection.providerLabel || connection.provider,
              },
              {
                label: text(labels(), "detailAuth", "Authentication"),
                value:
                  connection.authVariant === "none"
                    ? text(labels(), "authNoKey", "No key required")
                    : connection.credentialMasked ||
                      credentialMask(connection.credentialRef) ||
                      text(labels(), "authKeyMissing", "No key saved yet"),
              },
            ],
      repair: connection.repairRequired
        ? {
            label: text(
              labels(),
              "repairTitle",
              "The connection target needs confirmation",
            ),
            description: text(
              labels(),
              "repairHelp",
              "Confirm this service address before it can serve new tasks. Models and default purposes are kept.",
            ),
          }
        : null,
      models: cardsOf(connection.id).map((card) =>
        modelCardView(card, connection),
      ),
      modelsEmptyHint:
        cardsOf(connection.id).length === 0
          ? connection.kind === "chatgpt"
            ? text(
                labels(),
                "modelsHintChatgpt",
                "Sign in, then add a model from the account list.",
              )
            : text(
                labels(),
                "modelsHintApi",
                "Add a model from this provider's directory, then set its default purpose on the card.",
              )
          : null,
      discovery: discoveryMessage(labels(), connection),
      // Whether models can be added is a fact about the transport, not about
      // which form created the connection: a keyless custom endpoint lists its
      // provider's directory exactly like a keyed one. The owner's readiness
      // verdict is the gate, and an account adds its own prerequisite because
      // its model list only exists once it is signed in.
      canAddModel:
        connection.availability.ready &&
        !isPending(connection.id) &&
        (connection.kind !== "chatgpt" || !!account?.signedIn),
      refreshLabel:
        connection.kind === "chatgpt"
          ? text(labels(), "refreshModels", "Refresh models")
          : text(labels(), "refreshDirectory", "Refresh directory"),
      refreshPending: isPending(connection.id, "pi-chatgpt-refresh-models"),
      saveFailure: state.failures[connection.id] || null,
    };
  }

  function buildNav() {
    return {
      labels: labels(),
      page: state.page,
      groups: [
        {
          label: "",
          items: [
            {
              id: "overview" as const,
              label: text(labels(), "navOverview", "Get started"),
            },
          ],
        },
        {
          label: text(labels(), "navGroupModels", "Models"),
          items: [
            {
              id: "connections" as const,
              label: text(labels(), "navWorkbench", "Model workbench"),
              badge: connections().length
                ? String(connections().length)
                : undefined,
            },
          ],
        },
        {
          label: text(labels(), "navGroupExtensions", "Extensions"),
          items: [
            { id: "mcp" as const, label: "MCP" },
            {
              id: "search" as const,
              label: text(labels(), "navSearch", "Search"),
            },
          ],
        },
        {
          label: text(labels(), "navGroupAdvanced", "Advanced"),
          items: [
            {
              id: "catalog" as const,
              label: text(labels(), "navCatalog", "Directory and maintenance"),
            },
          ],
        },
      ],
    };
  }

  function buildOverview() {
    const ready = connections().filter((entry) => entry.availability.ready);
    const general = defaults().global;
    const hasGeneral =
      !!general &&
      connectionById(cardById(general.configurationId)?.connectionId)
        ?.availability.ready;
    return {
      labels: labels(),
      hero: {
        title: !connections().length
          ? text(labels(), "heroEmpty", "Get Built-in Agent ready")
          : hasGeneral
            ? text(labels(), "heroReady", "You can start using it")
            : text(labels(), "heroFinish", "Finish the model setup"),
        description: !connections().length
          ? text(
              labels(),
              "heroEmptyHelp",
              "Choose an account or model service you already use.",
            )
          : hasGeneral
            ? text(
                labels(),
                "heroReadyHelp",
                "Adjust models and extension tools at any time.",
              )
            : text(
                labels(),
                "heroFinishHelp",
                "After connecting, pick a general model.",
              ),
      },
      steps: [
        {
          id: "connect",
          label: text(labels(), "stepConnect", "Connect a service"),
          state: ready.length ? ("complete" as const) : ("current" as const),
        },
        {
          id: "model",
          label: text(labels(), "stepModel", "Choose a model"),
          state: hasGeneral
            ? ("complete" as const)
            : ready.length
              ? ("current" as const)
              : ("todo" as const),
        },
        {
          id: "use",
          label: text(labels(), "stepUse", "Start using"),
          state: hasGeneral ? ("current" as const) : ("todo" as const),
        },
      ],
      setupChoices: connections().length ? null : connectionMethods(),
      tasks: [
        {
          id: "connections",
          title: text(labels(), "taskConnections", "Model connections"),
          detail: text(
            labels(),
            "taskConnectionsHelp",
            ready.length + " usable, " + connections().length + " in total",
          ),
          actionLabel: text(
            labels(),
            "manageConnections",
            "Manage connections",
          ),
          primary: false,
        },
        {
          id: "general",
          title: text(labels(), "taskGeneral", "General model"),
          detail: hasGeneral
            ? cardById(general.configurationId)?.name || ""
            : text(
                labels(),
                "taskGeneralEmpty",
                "No usable general model is set yet",
              ),
          actionLabel: hasGeneral
            ? text(labels(), "adjustModel", "Adjust model")
            : text(labels(), "chooseModel", "Choose model"),
          primary: !hasGeneral,
        },
        {
          id: "mcp",
          title: text(labels(), "taskMcp", "MCP tools"),
          detail: text(
            labels(),
            "taskMcpHelp",
            "Optional; connect external tool services",
          ),
          actionLabel: text(labels(), "configureMcp", "Configure MCP"),
          primary: false,
        },
        {
          id: "search",
          title: text(labels(), "taskSearch", "Search"),
          detail: text(
            labels(),
            "taskSearchHelp",
            "Configure search sources and their order",
          ),
          actionLabel: text(labels(), "configureSearch", "Configure search"),
          primary: false,
        },
      ],
    };
  }

  function connectionMethods() {
    return [
      {
        id: "chatgpt",
        mark: "C",
        title: text(labels(), "setupChatgpt", "Use the ChatGPT plan"),
        description: text(
          labels(),
          "setupChatgptHelp",
          "Sign in in the browser; no model has to be picked first.",
        ),
      },
      {
        id: "api-key",
        mark: "API",
        title: text(labels(), "setupApiKey", "Use an API key"),
        description: text(
          labels(),
          "setupApiKeyHelp",
          "Connect a model service you already pay for.",
        ),
      },
      {
        id: "custom",
        mark: "API",
        title: text(labels(), "setupCustom", "Connect a custom service"),
        description: text(
          labels(),
          "setupCustomHelp",
          "Use a compatible endpoint or a local model.",
        ),
      },
    ];
  }

  function buildWorkbench() {
    const rows = connections().map((connection) => {
      const purposes = PURPOSES.filter(
        ({ key }) =>
          defaults()[key]?.configurationId &&
          cardById(defaults()[key]!.configurationId)?.connectionId ===
            connection.id,
      ).map(({ label, fallback }) => text(labels(), label, fallback));
      return {
        id: connection.id,
        label: connection.label,
        kind: connection.kind,
        mark: KIND_MARKS[connection.kind] || "API",
        stateLabel: connectionStateLabel(labels(), connection),
        stateTone: availabilityTone(connection.availability.ready),
        purposes,
        selected: connection.id === selectedConnection(),
      };
    });
    const selected = connectionById(selectedConnection());
    return {
      labels: labels(),
      title: text(labels(), "workbenchTitle", "Model workbench"),
      description: text(
        labels(),
        "workbenchHelp",
        "Connect once, then set default purposes on each model card.",
      ),
      addLabel: text(labels(), "addConnection", "+ Add connection"),
      empty: connections().length
        ? null
        : {
            title: text(
              labels(),
              "workbenchEmptyTitle",
              "Connect a model service first",
            ),
            description: text(
              labels(),
              "workbenchEmptyHelp",
              "Use the ChatGPT plan, an API key, or a custom service. Connecting does not require picking a model.",
            ),
            primaryLabel: text(
              labels(),
              "workbenchEmptyChatgpt",
              "Sign in with ChatGPT",
            ),
            secondaryLabel: text(
              labels(),
              "workbenchEmptyOther",
              "Other ways to connect",
            ),
          },
      purposes: PURPOSES.map(({ key, label, fallback }) => {
        const name = text(labels(), label, fallback);
        const explicit = defaults()[key];
        const effective = effectiveDefault(key);
        const card = effective
          ? cardById(effective.configurationId)
          : undefined;
        const connection = card ? connectionById(card.connectionId) : undefined;
        return {
          key,
          label: name,
          note:
            !explicit && (key === "conversation" || key === "skillRun")
              ? text(labels(), "purposeFollowsGeneral", "Follows general")
              : key === "auxiliary" && !effective
                ? text(labels(), "purposeDisabled", "Not enabled")
                : "",
          value: card
            ? card.name
            : key === "auxiliary"
              ? text(labels(), "titlesOff", "Automatic titles are off")
              : text(labels(), "notChosen", "Not chosen yet"),
          detail: connection ? connection.label : "",
          disabled: !card,
          connectionId: connection?.id || "",
        };
      }),
      rows,
      detail: selected ? connectionDetailView(selected) : null,
      failure: null,
    };
  }

  function selectedConnection(): string {
    const list = connections();
    if (
      state.selectedConnectionId &&
      list.some((c) => c.id === state.selectedConnectionId)
    )
      return state.selectedConnectionId;
    return list[0]?.id || "";
  }

  function buildMcp() {
    const sources = (state.snapshot?.mcpSources || []).map((source) => {
      const test = sourceTestFor(source.id, mcpTestIdentity(source));
      const missingSecret = Object.keys(source.credentialSlots || {}).some(
        (field) => !source.credentialSlots[field],
      );
      return {
        id: source.id,
        label: source.label,
        transportLabel:
          source.transport === "stdio"
            ? text(labels(), "transportStdio", "Local program")
            : "HTTP",
        address: source.url || source.executable || "",
        enabled: source.enabled,
        pendingSecret: missingSecret,
        admission: {
          tone: (source.enabled ? "muted" : "warning") as Tone,
          text: source.enabled
            ? text(labels(), "testNone", "Not tested")
            : text(labels(), "mcpDisabled", "Disabled"),
        },
        test: test
          ? {
              label:
                test.outcome.status === "available"
                  ? text(labels(), "testBadgeCompleted", "Test completed")
                  : text(
                      labels(),
                      "testBadgeIncomplete",
                      "Test did not complete",
                    ),
              tone: (test.outcome.status === "available"
                ? "success"
                : "warning") as Tone,
            }
          : null,
        testDetail: test?.outcome.code ? failureText(test.outcome.code) : null,
        canTest: !missingSecret && !isPending(source.id, "pi-mcp-test-source"),
        testPending: isPending(source.id, "pi-mcp-test-source"),
        editLabel: text(labels(), "editSource", "Edit source"),
        removeLabel: text(labels(), "removeSource", "Remove source"),
      };
    });
    return {
      labels: labels(),
      title: text(labels(), "mcpTitle", "MCP tools"),
      description: text(
        labels(),
        "mcpHelp",
        "Manage external tool services. Saved configuration takes effect on the next task.",
      ),
      addLabel: text(labels(), "addMcpSource", "+ Add source"),
      jsonLabels: {
        edit: text(labels(), "mcpJsonEdit", "Edit JSON"),
        import: text(labels(), "mcpJsonImport", "Import configuration"),
        export: text(labels(), "mcpJsonExport", "Export configuration"),
      },
      empty: sources.length
        ? null
        : {
            title: text(labels(), "mcpEmptyTitle", "Add an external tool"),
            description: text(
              labels(),
              "mcpEmptyHelp",
              "Fill in an MCP service address or a local program, and it is usable after saving.",
            ),
            actionLabel: text(labels(), "addMcpSourceAction", "Add MCP source"),
          },
      sources,
      failure: null,
    };
  }

  function sourceTestFor(id: string, bindingIdentity: string) {
    const record = state.sourceTests[id];
    if (!record) return null;
    // A test belongs to the bindings it ran against. Order-only or enablement
    // edits keep it; a changed target, authentication or model drops it.
    if (record.bindingIdentity && record.bindingIdentity !== bindingIdentity)
      return null;
    return record;
  }

  function buildSearch() {
    const sources = state.snapshot?.webSources || [];
    return {
      labels: labels(),
      title: text(labels(), "searchTitle", "Search"),
      description: text(
        labels(),
        "searchHelp",
        "Manage search sources, their order and their tests. Saved configuration takes effect on the next task.",
      ),
      banner: text(
        labels(),
        "searchBanner",
        "Enabled sources provide search in order. When the current model configuration supports native search, its native source is used first. A test only asks the chosen source and does not change the enabled state.",
      ),
      rows: sources.map((source, index) => {
        const test = sourceTestFor(source.id, source.bindingIdentity || "");
        return {
          id: source.id,
          label: source.label,
          enabled: source.enabled,
          enabledDisabled: !source.configured || isPending(source.id),
          detail: !source.configured
            ? text(labels(), "searchNeedsConfig", "Needs configuration")
            : test
              ? ""
              : text(labels(), "testNone", "Not tested"),
          billable: source.billable,
          order: {
            canMoveUp: index > 0,
            canMoveDown: index < sources.length - 1,
          },
          configureLabel: text(labels(), "configureSource", "Configure"),
          testLabel: text(labels(), "testSource", "Test source"),
          canTest:
            source.configured && !isPending(source.id, "pi-web-test-source"),
          testPending: isPending(source.id, "pi-web-test-source"),
          test: test
            ? {
                label:
                  test.outcome.status === "available"
                    ? text(labels(), "testBadgeCompleted", "Test completed")
                    : text(
                        labels(),
                        "testBadgeIncomplete",
                        "Test did not complete",
                      ),
                tone: (test.outcome.status === "available"
                  ? "success"
                  : "warning") as Tone,
              }
            : null,
          testDetail: test?.outcome.code
            ? failureText(test.outcome.code)
            : test?.outcome.possibleUsage
              ? text(
                  labels(),
                  "testPossibleUsage",
                  "This test may have produced provider charges.",
                )
              : null,
        };
      }),
      failure: null,
    };
  }

  function catalogPaging() {
    const models = state.snapshot?.models;
    const pageSize = Math.max(1, models?.pageSize || 1);
    const total = models?.total || 0;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(
      Math.floor((state.catalogOffset || 0) / pageSize) + 1,
      pageCount,
    );
    return {
      canPrevious: (state.catalogOffset || 0) > 0,
      canNext: (state.catalogOffset || 0) + pageSize < total,
      page,
      pageCount,
    };
  }

  function catalogRows(
    ownerConnectionId?: string,
    source: readonly ZoteroAgentSettingsCatalogModel[] = [],
  ): CatalogModelRow[] {
    const added = ownerConnectionId
      ? cardsOf(ownerConnectionId).map((card) => card.modelId)
      : [];
    const models = source;
    return models.map((model) => {
      const configurable = model.configurable !== false;
      const already = added.includes(model.id);
      return {
        key: model.provider + "/" + model.id,
        name: model.name,
        detail:
          (model.provider || "") +
          " · " +
          (model.contextWindow
            ? text(
                labels(),
                "catalogContext",
                "context " + model.contextWindow.toLocaleString(),
              )
            : text(
                labels(),
                "catalogContextUnknown",
                "context to be confirmed",
              )),
        badge: configurable
          ? {
              label: model.requiresParameters
                ? text(
                    labels(),
                    "catalogBadgeParameters",
                    "Configurable · needs provider parameters",
                  )
                : text(labels(), "catalogBadgeConfigurable", "Configurable"),
              tone: "muted" as Tone,
            }
          : {
              label:
                model.availability === "retired"
                  ? text(labels(), "catalogBadgeRetired", "Retired")
                  : text(
                      labels(),
                      "catalogBadgeNotConfigurable",
                      "Not configurable yet",
                    ),
              tone: "warning" as Tone,
            },
        added: already,
        addLabel: already
          ? text(labels(), "catalogAdded", "Added")
          : configurable
            ? text(labels(), "catalogAdd", "Add")
            : text(labels(), "catalogNotConfigurable", "Not configurable yet"),
        addDisabled: already || !configurable,
      };
    });
  }

  function maintenanceSections(): MaintenanceSection[] {
    const catalog = state.snapshot?.catalog;
    const overlayStatus = catalog?.state?.overlayStatus || "none";
    const present = overlayStatus !== "none";
    return [
      {
        id: "directory",
        title: text(
          labels(),
          "maintenanceDirectory",
          "Public directory updates",
        ),
        badge:
          catalog?.state?.updatedAt &&
          Number.isFinite(Date.parse(catalog.state.updatedAt))
            ? new Date(catalog.state.updatedAt).toLocaleDateString()
            : text(labels(), "catalogReady", "Catalog ready"),
        description: text(
          labels(),
          "maintenanceDirectoryHelp",
          "Update public model facts. Account model lists refresh on their own connection; saved connection targets and default purposes are kept.",
        ),
        controls: [
          {
            id: "refresh",
            label: text(labels(), "maintenanceCheck", "Check for updates"),
            disabled: isPending("catalog", "pi-catalog-refresh-public"),
          },
          {
            id: "restore",
            label: text(labels(), "maintenanceRestore", "Restore previous"),
            disabled:
              isPending("catalog", "pi-catalog-restore-previous") ||
              !catalog?.state?.canRestore,
          },
        ],
        switch: {
          label: text(
            labels(),
            "maintenanceAutoUpdate",
            "Check for directory updates automatically",
          ),
          checked: catalog?.state?.autoUpdate !== false,
          disabled: isPending("catalog", "pi-catalog-set-auto-update"),
        },
        hint: text(
          labels(),
          "maintenanceRestoreHint",
          "A successful restore turns automatic updates off.",
        ),
        feedback: state.maintenanceFeedback.directory || null,
        pending: Object.keys(state.pending).some((id) => id === "catalog"),
      },
      {
        id: "overlay",
        title: text(labels(), "maintenanceOverlay", "Model supplements"),
        badge: present
          ? text(
              labels(),
              "maintenanceOverlayAdopted",
              "adopted " + (catalog?.overlayLabel || "models.yml"),
            )
          : text(labels(), "maintenanceOverlayNone", "none adopted"),
        description: text(
          labels(),
          "maintenanceOverlayHelp",
          "Import a models.yml supplement. A valid file is adopted directly; its limits show on the model cards. Removing it keeps connections and default purposes.",
        ),
        controls: [
          {
            id: "select",
            label: text(labels(), "maintenanceImport", "Import models.yml"),
            disabled: isPending("catalog", "pi-select-overlay-file"),
          },
          {
            id: "refresh",
            label: text(labels(), "maintenanceRefreshFile", "Refresh file"),
            disabled: !present || isPending("catalog", "pi-refresh-overlay"),
          },
          {
            id: "remove",
            label: text(
              labels(),
              "maintenanceRemoveOverlay",
              "Remove supplement",
            ),
            disabled:
              !present || isPending("catalog", "pi-catalog-remove-overlay"),
            danger: true,
          },
        ],
        switch: null,
        hint: null,
        feedback: state.maintenanceFeedback.overlay || null,
        pending: false,
      },
      {
        id: "diagnostics",
        title: text(labels(), "maintenanceDiagnostics", "Diagnostics"),
        badge: text(labels(), "maintenanceExportOnly", "export on demand"),
        description: text(
          labels(),
          "maintenanceDiagnosticsHelp",
          "Choose a destination and export the redacted global run log. It holds directory and source state, no account credential and no conversation text.",
        ),
        controls: [
          {
            id: "export",
            label: text(labels(), "maintenanceExport", "Export diagnostics"),
            disabled: isPending("catalog", "pi-export-diagnostics"),
          },
        ],
        switch: null,
        hint: null,
        feedback: state.maintenanceFeedback.diagnostics || null,
        pending: false,
      },
    ];
  }

  /**
   * A directory page is shown only to the request that asked for it. The owner
   * filters case-insensitively and reports the text it filtered, so both sides
   * are compared in lower case; a page bound to another owner, provider or text
   * belongs to a request the user has already moved on from.
   */
  function modelsQueryFor(expected: { provider: string; query: string }) {
    const models = state.snapshot?.models;
    if (!models) return null;
    if (
      (models.query || "").trim().toLowerCase() !==
      (expected.query || "").trim().toLowerCase()
    ) {
      return null;
    }
    if (
      (models.provider || "").trim().toLowerCase() !==
      (expected.provider || "").trim().toLowerCase()
    ) {
      return null;
    }
    return models;
  }

  function activeModelsQuery() {
    return modelsQueryFor({
      provider: state.catalogProvider,
      query: state.catalogQuery,
    });
  }

  /** The picker asks for one connection's provider, so it reads its own page. */
  function pickerModelsQuery() {
    const picker = state.modelPicker;
    if (!picker) return null;
    return modelsQueryFor({
      provider: connectionById(picker.connectionId)?.provider || "",
      query: picker.query,
    });
  }

  function buildCatalog() {
    const provider = catalogProviders().find(
      (entry) => entry.id === state.catalogProvider,
    );
    const paging = catalogPaging();
    return {
      labels: labels(),
      title: text(labels(), "catalogTitle", "Model directory and maintenance"),
      description: text(
        labels(),
        "catalogHelp",
        "Browse preset providers and models, and manage directory updates and supplements.",
      ),
      providerOptions: [
        {
          value: "",
          label: text(labels(), "catalogAllProviders", "All providers"),
          disabled: false,
        },
        ...catalogProviders().map((entry) => {
          const gap = entry.unavailableReason
            ? text(
                labels(),
                "providerGap_" + entry.unavailableReason,
                "This provider's interface is not adapted yet",
              )
            : entry.requiresParameters
              ? text(
                  labels(),
                  "providerNeedsParameters",
                  "Needs provider parameters",
                )
              : entry.configurable
                ? text(
                    labels(),
                    "providerConfigurable",
                    "Preset service address",
                  )
                : text(
                    labels(),
                    "providerNotConfigurable",
                    "Not configurable yet",
                  );
          return {
            value: entry.id,
            label:
              (entry.label || entry.id) +
              (entry.modelCount != null
                ? " · " + entry.modelCount + " models"
                : ""),
            description: gap,
            disabled: entry.configurable === false,
          };
        }),
      ],
      providerId: state.catalogProvider,
      providerSummary: provider
        ? provider.configurable
          ? text(
              labels(),
              "providerPreset",
              "The service address is preset; add the API key after connecting.",
            )
          : text(
              labels(),
              "providerUnavailable",
              "This provider's interface or sign-in is not adapted yet.",
            )
        : "",
      providerReason:
        provider && !provider.configurable
          ? text(
              labels(),
              "providerReason_" +
                (provider.unavailableReason || "unsupported_provider"),
              "Adding this provider is unavailable.",
            )
          : null,
      providerAction: provider
        ? {
            label: text(
              labels(),
              "providerAddConnection",
              "Add this provider connection",
            ),
            disabled: provider.configurable === false,
          }
        : null,
      query: state.catalogQuery,
      counts: text(
        labels(),
        "catalogCounts",
        (activeModelsQuery()?.total || 0) +
          " directory models · not a statement of account access",
      ),
      models: catalogRows(undefined, activeModelsQuery()?.models || []),
      emptyHint: (activeModelsQuery()?.models || []).length
        ? null
        : text(labels(), "catalogEmpty", "No model matches."),
      paging,
      sections: maintenanceSections(),
      failure: null,
    };
  }

  // -- Dialog selections -----------------------------------------------------

  function buildConnectionEditor() {
    const draft = state.connectionDraft;
    if (!draft) return null;
    const fields = draft.fields;
    const existing = connectionById(draft.id);
    const providers = catalogProviders();
    const provider = providers.find((entry) => entry.id === fields.provider);
    const repair = existing?.repairRequired
      ? {
          title: text(
            labels(),
            "repairTitle",
            "The connection target needs confirmation",
          ),
          description: text(
            labels(),
            "repairHelp",
            "Confirm this service address before it can serve new tasks. Models and default purposes are kept.",
          ),
          accepted: fields.acceptRepair,
        }
      : null;
    return {
      mode: (draft.existing ? "edit" : "add") as "add" | "edit",
      title: draft.existing
        ? text(labels(), "editorTitleEdit", "Manage connection · ") +
          draft.fields.label
        : text(
            labels(),
            draft.kind === "chatgpt"
              ? "editorTitleAddChatgpt"
              : draft.kind === "api-key"
                ? "editorTitleAddApiKey"
                : "editorTitleAddCustom",
            "Add connection",
          ),
      existing: draft.existing,
      canSwitch: draft.existing && connections().length > 1,
      connectionOptions: connections().map((entry) => ({
        value: entry.id,
        label: entry.label,
      })),
      kind: draft.kind,
      repairNotice: repair,
      label: fields.label,
      provider:
        draft.kind === "api-key"
          ? {
              label: text(labels(), "providerField", "Model service"),
              value: fields.provider,
              locked: draft.existing,
              options: providers.map((entry) => ({
                value: entry.id,
                label: entry.label || entry.id,
                description: entry.configurable
                  ? entry.requiresParameters
                    ? text(
                        labels(),
                        "providerNeedsParameters",
                        "Needs provider parameters",
                      )
                    : text(
                        labels(),
                        "providerConfigurable",
                        "Preset service address",
                      )
                  : text(
                      labels(),
                      "providerNotConfigurable",
                      "Not configurable yet",
                    ),
                disabled: entry.configurable === false,
              })),
            }
          : null,
      parameters: (provider?.parameters || []).map((entry) => ({
        id: entry.id,
        label: entry.label,
        value: fields.parameters[entry.id] || "",
        placeholder: entry.placeholder,
      })),
      resolvedEndpoint: null,
      registration:
        draft.kind === "chatgpt"
          ? {
              options: [
                {
                  value: "",
                  label: text(
                    labels(),
                    "registrationNew",
                    "Connect a new account or space",
                  ),
                  disabled: false,
                },
                ...(state.snapshot?.registrations || []).map((entry) => ({
                  value: entry.id,
                  label:
                    (entry.label || entry.email || entry.id) +
                    (entry.workspace ? " · " + entry.workspace : "") +
                    (entry.signedIn ? "" : " · signed out"),
                  description: entry.paused
                    ? text(labels(), "registrationPaused", "Paused")
                    : undefined,
                  disabled: false,
                })),
              ],
              value: fields.registrationId,
              labelValue: fields.registrationLabel,
              identity: {
                id: fields.registrationId,
                label: text(
                  labels(),
                  "registrationIdentity",
                  "Registration label",
                ),
                value: fields.registrationLabel,
                help: text(
                  labels(),
                  "registrationIdentityHelp",
                  "Distinguishes different authorized spaces with the same email; saved with the connection.",
                ),
              },
            }
          : null,
      account: existing ? accountView(existing) : null,
      models: [],
      endpoint:
        draft.kind === "custom"
          ? {
              value: fields.baseUrl,
              placeholder: "https://api.example.com/v1",
            }
          : null,
      dialect:
        draft.kind === "custom"
          ? {
              value: fields.api,
              options: dialectsFor(fields.keyless ? "none" : "api-key").map(
                (api) => ({ value: api, label: CUSTOM_DIALECT_LABELS[api] }),
              ),
            }
          : null,
      keyless:
        draft.kind === "custom"
          ? {
              checked: fields.keyless,
              label: text(labels(), "keyless", "This service needs no key"),
            }
          : null,
      localApproval:
        draft.kind === "custom" && isLocalEndpoint(fields.baseUrl)
          ? {
              checked: fields.localApproved,
              label: text(
                labels(),
                "allowLocalService",
                "Allow connecting to this local model service",
              ),
              address: fields.baseUrl,
            }
          : null,
      secret: needsSecret(draft)
        ? {
            label: existing?.credentialRef
              ? text(labels(), "replaceKey", "Replace API key")
              : text(labels(), "apiKey", "API key"),
            value: fields.secret,
            placeholder: existing?.credentialRef
              ? text(
                  labels(),
                  "keySavedPlaceholder",
                  "saved; leave empty to keep it",
                )
              : "",
            help: text(
              labels(),
              "keyHelp",
              "The key is used for this model service only.",
            ),
          }
        : null,
      hint:
        draft.kind === "chatgpt"
          ? text(
              labels(),
              "editorHintChatgpt",
              "Sign in, confirm the plan statement, then save. Saving the connection does not pick a model.",
            )
          : text(
              labels(),
              "editorHintKey",
              "After saving, fetch the model list and set default purposes on its cards.",
            ),
      failure: state.failures[draft.id] || null,
      pending: isPending(draft.id),
      canSave: connectionCanSave(draft),
      saveLabel: text(labels(), "saveConnection", "Save connection"),
      cancelLabel: draft.existing
        ? text(labels(), "cancelEdit", "Cancel edit")
        : text(labels(), "cancel", "Cancel"),
      discardLabel: text(labels(), "discard", "Discard"),
    };
  }

  function needsSecret(draft: ConnectionDraft): boolean {
    if (draft.kind === "chatgpt") return false;
    if (draft.kind === "custom" && draft.fields.keyless) return false;
    return true;
  }

  function buildMcpEditor() {
    const draft = state.mcpDraft;
    if (!draft) return null;
    const fields = draft.fields;
    const auth = mcpAuthEntry(fields);
    const isStdio = fields.transport === "stdio";
    const bindings = isStdio ? fields.bindings : mcpOtherBindings(fields);
    const entryView = (row: McpEntryDraft, group: string) => ({
      id: row.id,
      field: row.field,
      value: row.value,
      saved: row.saved,
      placeholder: row.saved
        ? text(
            labels(),
            "bindingSavedPlaceholder",
            "saved; leave empty to keep",
          )
        : text(labels(), "bindingPlaceholder", "fill in a value"),
      ariaField: group + " " + (bindings.indexOf(row) + 1) + " field",
      ariaValue: group + " " + (bindings.indexOf(row) + 1) + " value",
      removeLabel: text(labels(), "removeEntry", "Remove"),
    });
    return {
      title: draft.existing
        ? text(labels(), "mcpEditorTitle", "MCP source")
        : text(labels(), "mcpEditorAddTitle", "Add MCP source"),
      label: fields.label,
      transport: {
        value: fields.transport,
        options: [
          { value: "http", label: "HTTP / HTTPS" },
          {
            value: "stdio",
            label: text(labels(), "transportStdio", "Local program (stdio)"),
          },
        ],
      },
      address: {
        label: isStdio
          ? text(labels(), "mcpExecutable", "Executable (absolute path)")
          : text(labels(), "mcpAddress", "Service address"),
        value: fields.address,
      },
      argv: fields.argv.map((value, index) => ({
        value,
        removeLabel: text(
          labels(),
          "removeArg",
          "Remove argument " + (index + 1),
        ),
      })),
      addArgLabel: text(labels(), "addArg", "Add argument"),
      argvHelp: text(
        labels(),
        "mcpArgHelp",
        "One entry is one argument. A path with spaces can be typed as it is; no quoting is needed.",
      ),
      cwd: {
        value: fields.cwd,
        placeholder: text(
          labels(),
          "mcpCwdPlaceholder",
          "default: Built-in Agent runtime directory",
        ),
        help: fields.cwd.trim()
          ? text(
              labels(),
              "mcpCwdHelp",
              "Absolute path used when the program starts.",
            )
          : text(
              labels(),
              "mcpCwdEmptyHelp",
              "Leave empty to use the Built-in Agent runtime directory.",
            ),
      },
      env: isStdio ? bindings.map((row) => entryView(row, "variable")) : [],
      envLabel: text(labels(), "mcpEnv", "Environment variables"),
      addEnvLabel: text(labels(), "addEnv", "Add variable"),
      localApproval:
        !isStdio && isLocalEndpoint(fields.address)
          ? {
              checked: fields.localApproved,
              label: text(
                labels(),
                "allowLocalTool",
                "Allow access to this local tool service",
              ),
              address: fields.address,
            }
          : null,
      auth: {
        value: fields.authKind as ZoteroAgentSettingsMcpAuthKind,
        options: [
          {
            value: "none",
            label: text(labels(), "authNone", "No authentication"),
          },
          { value: "bearer", label: "Bearer token" },
          { value: "api-key", label: "API key" },
        ],
        headerLabel: text(labels(), "mcpAuth", "Authentication"),
        apiType:
          fields.authKind === "api-key"
            ? {
                value: commonApiKeyField(fields.authField),
                options: [
                  { value: "X-API-Key", label: "X-API-Key (common)" },
                  { value: "api-key", label: "api-key" },
                  {
                    value: "custom",
                    label: text(
                      labels(),
                      "authApiKeyCustom",
                      "Provider's own name",
                    ),
                  },
                ],
                customField:
                  commonApiKeyField(fields.authField) === "custom"
                    ? {
                        label: text(
                          labels(),
                          "authApiKeyField",
                          "Field name the provider specifies",
                        ),
                        value: fields.authField,
                        placeholder: "X-Service-Key",
                      }
                    : null,
              }
            : null,
        secret:
          fields.authKind === "bearer" || fields.authKind === "api-key"
            ? {
                label:
                  fields.authKind === "bearer"
                    ? text(labels(), "authToken", "Authorization token")
                    : text(labels(), "authApiKey", "API key"),
                value: fields.secret,
                placeholder: auth?.saved
                  ? text(
                      labels(),
                      "bindingSavedPlaceholder",
                      "saved; leave empty to keep",
                    )
                  : "",
                help:
                  fields.authKind === "bearer"
                    ? text(
                        labels(),
                        "authTokenHelp",
                        "Enter the token only; the Bearer prefix is added once when the request is built.",
                      )
                    : text(
                        labels(),
                        "authApiKeyHelp",
                        "Enter the key as the provider sends it. Leave empty to keep a saved key.",
                      ),
              }
            : null,
      },
      headers: isStdio ? [] : bindings.map((row) => entryView(row, "header")),
      headersLabel: text(labels(), "mcpHeaders", "Extra request headers"),
      addHeaderLabel: text(labels(), "addHeader", "Add header"),
      headersOpen: fields.headersOpen,
      problem: mcpProblem(draft),
      hint: text(
        labels(),
        "mcpEditorHint",
        "Later tasks can use it after saving. Test the connection on the source card when you need to check it.",
      ),
      failure: state.failures[draft.id] || null,
      pending: isPending(draft.id),
      canSave: !mcpProblem(draft) && !isPending(draft.id),
      saveLabel: text(labels(), "saveMcpSource", "Save source"),
      cancelLabel: text(labels(), "cancel", "Cancel"),
      discardLabel: text(labels(), "discard", "Discard"),
    };
  }

  function commonApiKeyField(field: string): string {
    if (field === "X-API-Key" || field === "api-key") return field;
    return field ? "custom" : "X-API-Key";
  }

  function buildMcpJson() {
    const draft = state.mcpJsonDraft;
    if (!draft) return null;
    const preview = draft.preview;
    return {
      mode: draft.mode,
      title: text(
        labels(),
        draft.mode === "export"
          ? "jsonTitleExport"
          : draft.mode === "import"
            ? "jsonTitleImport"
            : "jsonTitleEdit",
        draft.mode === "export"
          ? "Export MCP configuration"
          : draft.mode === "import"
            ? "Import MCP configuration"
            : "Edit MCP JSON",
      ),
      description: text(
        labels(),
        draft.mode === "export"
          ? "jsonExportHelp"
          : draft.mode === "import"
            ? "jsonImportHelp"
            : "jsonEditHelp",
        draft.mode === "export"
          ? "Copy the connection structure. Authentication fields stay empty, so a receiving profile has to fill them again."
          : draft.mode === "import"
            ? "Paste a whole mcpServers configuration. New sources are added; a same-name source keeps the saved one."
            : "Edit the whole mcpServers document. It shares the configuration with the form; an existing authentication slot stays empty and is not refilled.",
      ),
      value: draft.fields.text,
      readOnly: draft.mode === "export",
      conflictIds: draft.fields.replaceSourceIds,
      grantIds: draft.fields.grantIds,
      summary: preview
        ? text(
            labels(),
            "jsonSummary",
            "Saving affects: added " +
              preview.added +
              " · changed " +
              preview.changed +
              " · removed " +
              preview.removed,
          )
        : null,
      problems: preview?.problems || [],
      pending: isPending("mcp-registry"),
      failure: state.failures["mcp-registry"] || null,
      saveLabel: text(
        labels(),
        draft.mode === "import" ? "mergeAndSave" : "saveJson",
        draft.mode === "import" ? "Merge and save" : "Save JSON",
      ),
      cancelLabel: text(labels(), "cancel", "Cancel"),
      discardLabel: text(labels(), "discard", "Discard"),
      canSave:
        draft.mode !== "export" &&
        !isPending("mcp-registry") &&
        !preview?.problems.length,
    };
  }

  function nativeCards(source: ZoteroAgentSettingsWebSource) {
    return cards()
      .filter((card) => card.provider === nativeProvider(source))
      .map((card) => ({
        value: card.id,
        label: card.name,
        description: connectionById(card.connectionId)?.label,
      }));
  }

  function nativeProvider(source: ZoteroAgentSettingsWebSource): string {
    return source.kind === "openai-native"
      ? "openai"
      : source.kind === "anthropic-native"
        ? "anthropic"
        : "";
  }

  function buildWebEditor() {
    const draft = state.webDraft;
    const source = draft ? webSource(draft.id) : undefined;
    if (!draft || !source) return null;
    const fields = draft.fields;
    const isNative = source.kind.endsWith("-native");
    const choices = nativeCards(source);
    const selected = cards().find(
      (card) => card.id === fields.modelConfigurationId,
    );
    const argsValid = parseStringArray(fields.args) !== null;
    return {
      title: text(labels(), "webEditorTitle", "Configure ") + source.label,
      kind: source.kind,
      kindLabel: source.label,
      note: isNative
        ? text(
            labels(),
            "webNativeNote",
            "Reuses that connection's account and credential; the search model is chosen separately.",
          )
        : source.kind === "exa-mcp"
          ? text(
              labels(),
              "webExaNote",
              "Exa provides a preset search service; test it or change its enabled state directly.",
            )
          : null,
      connection: isNative
        ? {
            value: selected?.connectionId || "",
            label: text(labels(), "webConnection", "Model connection"),
            options: [
              {
                value: "",
                label: text(
                  labels(),
                  "webPickConnection",
                  "Choose a saved model connection",
                ),
              },
              ...choices.map((card) => ({
                ...card,
                label:
                  (connectionById(
                    cards().find((entry) => entry.id === card.value)
                      ?.connectionId,
                  )?.label || "") +
                  " · " +
                  card.label,
              })),
            ],
            emptyHint: choices.length
              ? null
              : text(
                  labels(),
                  "webNoCompatibleConnection",
                  "No compatible connection yet. Add this provider's connection in the model workbench first.",
                ),
          }
        : null,
      model: isNative
        ? {
            value: fields.searchModelId,
            label: text(labels(), "webModel", "Search model"),
            options: [
              {
                value: "",
                label: text(labels(), "webPickModel", "Choose a search model"),
              },
              ...(selected?.reasoningLevels
                ? selected.reasoningLevels.map((level) => ({
                    value: level,
                    label: REASONING_LABELS[level] || level,
                  }))
                : []),
              ...(selected
                ? [{ value: selected.modelId, label: selected.name }]
                : []),
            ],
          }
        : null,
      endpoint:
        !isNative && source.kind === "searxng"
          ? {
              label: text(labels(), "webEndpoint", "SearXNG address"),
              value: fields.endpoint,
            }
          : null,
      localApproval:
        !isNative && isLocalEndpoint(fields.endpoint)
          ? {
              checked: fields.localApproved,
              label: text(
                labels(),
                "allowLocalSearch",
                "Allow access to this local search service",
              ),
              address: fields.endpoint,
            }
          : null,
      executable:
        source.kind === "brave-mcp"
          ? {
              label: text(
                labels(),
                "webExecutable",
                "Search program (absolute path)",
              ),
              value: fields.executable,
            }
          : null,
      args:
        source.kind === "brave-mcp"
          ? {
              label: text(
                labels(),
                "webArgs",
                "Search program arguments (JSON array)",
              ),
              value: fields.args,
              invalid: !argsValid,
            }
          : null,
      secret:
        !isNative && source.kind !== "exa-mcp"
          ? {
              label: source.credentialId
                ? text(labels(), "replaceSearchKey", "Replace search key")
                : text(labels(), "searchKey", "Search API key"),
              value: fields.secret,
              placeholder: source.credentialId
                ? text(
                    labels(),
                    "bindingSavedPlaceholder",
                    "saved; leave empty to keep",
                  )
                : "",
              help: text(
                labels(),
                "searchKeyHelp",
                "Used for this search source only.",
              ),
            }
          : null,
      billable: source.billable,
      hint: text(
        labels(),
        "webEditorHint",
        "Saving only updates this source. Test it first, then enable it; the general model keeps its own choice.",
      ),
      failure: state.failures[draft.id] || null,
      pending: isPending(draft.id),
      canSave:
        !isPending(draft.id) &&
        argsValid &&
        (!isNative ||
          (!!selected && (!!fields.searchModelId || !!selected.modelId))) &&
        (isNative ||
          source.kind === "exa-mcp" ||
          !!fields.secret.trim() ||
          !!source.credentialId) &&
        !(source.kind === "searxng" && !isValidEndpoint(fields.endpoint)),
      saveLabel: text(labels(), "saveWebSource", "Save search configuration"),
      cancelLabel: text(labels(), "cancel", "Cancel"),
      discardLabel: text(labels(), "discard", "Discard"),
    };
  }

  function buildDialog(): DialogSelection {
    const dialog = state.dialog;
    if (!dialog) return null;
    if (dialog.kind === "connection-methods") {
      return {
        kind: "connection-methods",
        value: {
          title: text(labels(), "addConnection", "Add model connection"),
          choices: connectionMethods(),
        },
      };
    }
    if (dialog.kind === "connection-editor") {
      const value = buildConnectionEditor();
      return value ? { kind: "connection-editor", value } : null;
    }
    if (dialog.kind === "mcp-editor") {
      const value = buildMcpEditor();
      return value ? { kind: "mcp-editor", value } : null;
    }
    if (dialog.kind === "mcp-json") {
      const value = buildMcpJson();
      return value ? { kind: "mcp-json", value } : null;
    }
    if (dialog.kind === "web-editor") {
      const value = buildWebEditor();
      return value ? { kind: "web-editor", value } : null;
    }
    if (dialog.kind === "model-picker") {
      return { kind: "model-picker", value: buildModelPicker() };
    }
    if (dialog.kind === "test") {
      const card = cardById(dialog.targetId);
      const connection = card ? connectionById(card.connectionId) : undefined;
      const registrationEntry = registration(connection?.registrationId);
      return {
        kind: "test",
        value: {
          id: dialog.targetId,
          title: text(
            labels(),
            registrationEntry?.paused ? "testTitleResume" : "testTitle",
            registrationEntry?.paused ? "Test and resume" : "Test this model",
          ),
          subject: (connection?.label || "") + " · " + (card?.name || ""),
          description: text(
            labels(),
            dialog.domain === "model"
              ? "testDescription"
              : dialog.domain === "mcp"
                ? "testMcpDescription"
                : "testWebDescription",
            dialog.domain === "model"
              ? "Sends one short reasoning request. It may consume quota. No tool is called and no existing task continues."
              : dialog.domain === "mcp"
                ? "Connects this source and reads its tool catalog. No tool task is executed."
                : "Sends one search test to this source only. It does not try other sources and does not change the enabled state.",
          ),
          usageWarning:
            dialog.domain === "model"
              ? text(
                  labels(),
                  "testUsageWarning",
                  "This test may consume plan quota.",
                )
              : dialog.domain === "web" && webSource(dialog.targetId)?.billable
                ? text(
                    labels(),
                    "testBillableWarning",
                    "This test may produce provider charges.",
                  )
                : null,
          confirmLabel: text(labels(), "sendTest", "Send one test request"),
          cancelLabel: text(labels(), "cancel", "Cancel"),
        },
      };
    }
    return { kind: "confirm", value: buildConfirm(dialog) };
  }

  function buildModelPicker() {
    const picker = state.modelPicker;
    if (!picker) {
      return {
        title: "",
        providerLabel: "",
        connectionId: "",
        query: "",
        counts: "",
        models: [],
        emptyHint: null,
        paging: { canPrevious: false, canNext: false, page: 1, pageCount: 1 },
        closeLabel: text(labels(), "backToWorkbench", "Back to workbench"),
        pending: false,
        failure: null,
      };
    }
    const connection = connectionById(picker.connectionId);
    return {
      title:
        text(labels(), "pickerTitle", "Add model · ") +
        (connection?.providerLabel || connection?.provider || ""),
      providerLabel: connection?.providerLabel || connection?.provider || "",
      connectionId: picker.connectionId,
      query: picker.query,
      counts: text(
        labels(),
        "pickerCounts",
        "Choose a model that needs configuration; the connection credential is reused.",
      ),
      models: catalogRows(
        picker.connectionId,
        pickerModelsQuery()?.models || [],
      ),
      emptyHint: text(labels(), "catalogEmpty", "No model matches."),
      paging: catalogPaging(),
      closeLabel: text(labels(), "backToWorkbench", "Back to workbench"),
      pending: isPending(picker.connectionId, "pi-upsert-model"),
      failure: state.failures[picker.connectionId] || null,
    };
  }

  function buildLeave(trigger: LeaveTrigger) {
    const scope = trigger.scope;
    const canSave =
      scope === "connection"
        ? !!state.connectionDraft && connectionCanSave(state.connectionDraft)
        : scope === "mcp"
          ? !!state.mcpDraft && !mcpProblem(state.mcpDraft)
          : scope === "web"
            ? !!buildWebEditor()?.canSave
            : true;
    const pendingObject =
      scope === "connection"
        ? state.connectionDraft?.id
        : scope === "mcp"
          ? state.mcpDraft?.id
          : scope === "web"
            ? state.webDraft?.id
            : "mcp-registry";
    return {
      id: "leave",
      title: text(
        labels(),
        scope === "connection" ? "leaveTitleConnection" : "leaveTitleSource",
        scope === "connection"
          ? "Unsaved connection changes"
          : "Unsaved source configuration",
      ),
      body: text(
        labels(),
        scope === "connection" ? "leaveBodyConnection" : "leaveBodySource",
        scope === "connection"
          ? "This connection is not saved yet. A completed ChatGPT sign-in is kept; an attempt in progress is cancelled when you leave."
          : "Save to continue, or discard this change. The saved source configuration is kept.",
      ),
      continueLabel: text(labels(), "continueEditing", "Continue editing"),
      discardLabel: text(labels(), "discardChanges", "Discard changes"),
      saveLabel:
        trigger.next.kind === "close"
          ? text(labels(), "saveAndClose", "Save and close")
          : trigger.next.kind === "switch"
            ? text(labels(), "saveAndSwitch", "Save and switch")
            : text(labels(), "saveAndReturn", "Save and return"),
      canSave,
      pending: !!pendingObject && isPending(pendingObject),
      failure: pendingObject ? state.failures[pendingObject] || null : null,
    };
  }

  function buildConfirm(dialog: Extract<ActiveDialog, { kind: "confirm" }>) {
    const subject = dialog.subject;
    if (subject.cardId) {
      const card = cardById(subject.cardId);
      const connection = card ? connectionById(card.connectionId) : undefined;
      return {
        id: dialog.id,
        title: text(
          labels(),
          "confirmRemoveModel",
          "Remove model configuration",
        ),
        body: [
          text(
            labels(),
            "confirmRemoveModelBody",
            'Remove "' +
              (card?.name || "") +
              '"? The connection and its credential are kept.',
          ),
        ],
        list: removalEffects(connection?.id || "", subject.cardId),
        emptyList: text(
          labels(),
          "confirmNoPurpose",
          "No default purpose references this model.",
        ),
        confirmLabel: text(labels(), "confirmRemove", "Confirm removal"),
        cancelLabel: text(labels(), "keepModel", "Keep model"),
        danger: true,
        pending: isPending(subject.cardId, "pi-remove-model"),
      };
    }
    if (subject.sourceId) {
      const source = mcpSource(subject.sourceId);
      return {
        id: dialog.id,
        title: text(labels(), "confirmRemoveSource", "Remove MCP source"),
        body: [
          text(
            labels(),
            "confirmRemoveSourceBody",
            'Remove "' +
              (source?.label || "") +
              '" and its own authentication. Later tasks no longer use it; a running task reports its own result.',
          ),
        ],
        list: [],
        emptyList: null,
        confirmLabel: text(labels(), "confirmRemove", "Confirm removal"),
        cancelLabel: text(labels(), "cancel", "Cancel"),
        danger: true,
        pending: isPending(subject.sourceId, "pi-mcp-delete-source"),
      };
    }
    if (subject.registrationId) {
      const entry = registration(subject.registrationId);
      const bound = connections().filter(
        (connection) => connection.registrationId === subject.registrationId,
      );
      return {
        id: dialog.id,
        title: subject.remove
          ? text(
              labels(),
              "confirmRemoveRegistration",
              "Remove ChatGPT registration",
            )
          : text(labels(), "confirmSignOut", "Sign out of ChatGPT"),
        body: [
          (entry?.label || "") +
            (entry?.email ? " · " + entry.email : "") +
            (entry?.workspace ? " · " + entry.workspace : ""),
          text(
            labels(),
            "confirmRegistrationBody",
            subject.remove
              ? "These connections, their models and default purposes are kept, but they need the registration bound again:"
              : "These connections, their models and default purposes are kept, but they need a sign-in again:",
          ),
          text(
            labels(),
            "confirmRegistrationEffect",
            "This clears the local authorization and attempts to revoke the remote one; both results are reported separately.",
          ),
        ],
        list: bound.map((connection) => connection.label),
        emptyList: null,
        confirmLabel: subject.remove
          ? text(labels(), "confirmRemove", "Confirm removal")
          : text(labels(), "confirmSignOut", "Sign out"),
        cancelLabel: text(labels(), "cancel", "Cancel"),
        danger: true,
        pending: isPending(subject.registrationId, "pi-chatgpt-sign-out"),
      };
    }
    const connection = connectionById(subject.connectionId);
    return {
      id: dialog.id,
      title: text(
        labels(),
        "confirmRemoveConnection",
        "Remove model connection",
      ),
      body: [
        text(
          labels(),
          "confirmRemoveConnectionBody",
          'Remove "' + (connection?.label || "") + '"?',
        ),
        text(
          labels(),
          "confirmRemoveConnectionEffect",
          (connection?.kind === "chatgpt"
            ? "The account sign-in is kept. "
            : connection?.credentialRef &&
                connections().some(
                  (entry) =>
                    entry.id !== connection?.id &&
                    entry.credentialRef === connection?.credentialRef,
                )
              ? "A key other connections still use is kept. "
              : "A key only this connection uses is cleared. ") +
            "Other connections are kept, and existing requests do not rerun by themselves.",
        ),
      ],
      list: removalEffects(subject.connectionId || ""),
      emptyList: text(
        labels(),
        "confirmNoPurpose",
        "No default purpose references this connection.",
      ),
      confirmLabel: text(labels(), "confirmRemove", "Confirm removal"),
      cancelLabel: text(labels(), "keepConnection", "Keep connection"),
      danger: true,
      pending: isPending(subject.connectionId || "", "pi-delete-configuration"),
    };
  }

  function buildView(): ZoteroAgentSettingsView {
    if (!state.snapshot || state.windowClosed) {
      return {
        nav: buildNav(),
        status: state.status,
        overview: null,
        workbench: null,
        mcp: null,
        search: null,
        catalog: null,
        dialog: null,
        leave: null,
      };
    }
    return {
      nav: buildNav(),
      status: state.status,
      overview: state.page === "overview" ? buildOverview() : null,
      workbench: state.page === "connections" ? buildWorkbench() : null,
      mcp: state.page === "mcp" ? buildMcp() : null,
      search: state.page === "search" ? buildSearch() : null,
      catalog: state.page === "catalog" ? buildCatalog() : null,
      dialog: buildDialog(),
      leave: state.leave
        ? { kind: "leave", value: buildLeave(state.leave) }
        : null,
    };
  }

  // -- Handlers --------------------------------------------------------------

  function patchDraftFields(
    draft: { fields: ConnectionDraftFields } | null,
    patch: Partial<ConnectionDraftFields>,
  ): boolean {
    if (!draft) return false;
    draft.fields = { ...draft.fields, ...patch };
    return true;
  }

  function patchConnectionDraft(
    patch: Partial<ConnectionDraftFields>,
  ): boolean {
    return patchDraftFields(state.connectionDraft, patch);
  }

  const handlers: ZoteroAgentSettingsHandlers = {
    navigate,
    openConnectionMethods() {
      requestLeaveThen({ kind: "cancel" }, () => {
        state.dialog = { kind: "connection-methods" };
        render();
      });
    },
    startAddConnection(kind) {
      // Opening another editor is a leave like any other: an unsaved draft is
      // resolved first instead of being overwritten.
      requestLeaveThen({ kind: "cancel" }, () => openConnectionEditor(kind));
    },
    selectConnection(id) {
      state.selectedConnectionId = id;
      render();
    },
    editConnection(id) {
      const connection = connectionById(id);
      if (!connection) return;
      openConnectionEditor(connection.kind, connection);
    },
    switchEditedConnection(id) {
      if (state.connectionDraft) {
        requestLeave({ kind: "switch", connectionId: id });
      }
    },
    patchConnectionDraft(patch) {
      // A keystroke updates the draft without re-rendering, so typing keeps
      // focus, selection and IME composition intact.
      const structural =
        "provider" in patch ||
        "registrationId" in patch ||
        "api" in patch ||
        "keyless" in patch ||
        "localApproved" in patch ||
        "acceptRepair" in patch;
      if (!patchConnectionDraft(patch)) return;
      const draft = state.connectionDraft;
      if (draft && "keyless" in patch && draft.fields.keyless) {
        // Turning the key off leaves the connection without authentication, so
        // the API follows the executor's admission table instead of keeping a
        // target that would refuse to run.
        if (!PI_API_AUTH_VARIANTS[draft.fields.api].includes("none")) {
          draft.fields = { ...draft.fields, api: dialectsFor("none")[0] };
        }
      }
      if (structural) render();
    },
    commitConnectionDraftField() {
      render();
    },
    saveConnectionDraft() {
      saveConnectionDraft();
    },
    closeConnectionEditor() {
      requestLeave({ kind: "cancel" });
    },
    resolveLeave,
    refreshAccountModels(connectionId) {
      const connection = connectionById(connectionId);
      if (!connection) return;
      // Two connections on one registration share these facts, so the request
      // is keyed by the registration and a newer one supersedes the older.
      const objectId = connection.registrationId || connectionId;
      dispatch("pi-chatgpt-refresh-models", objectId, {
        registrationId: connection.registrationId,
      });
      setStatus(text(labels(), "refreshingModels", "Refreshing models..."));
      render();
    },
    connectAccount(connectionId, registrationId, reconsent) {
      beginAuth(connectionId, registrationId, reconsent);
    },
    cancelAuthorization() {
      cancelAuthAttempt();
      setStatus(
        text(
          labels(),
          "authCanceled",
          "Sign-in canceled. The connection configuration is kept.",
        ),
      );
      render();
    },
    acceptWelcome(registrationId) {
      dispatch("pi-chatgpt-accept-welcome", registrationId, {});
      setStatus(
        text(
          labels(),
          "welcomeAccepted",
          "Plan use confirmed. The model is not tested yet.",
        ),
      );
      render();
    },
    openUsage(registrationId) {
      dispatch("pi-chatgpt-usage", registrationId, {});
      setStatus(
        text(
          labels(),
          "usageOpening",
          "Opening the plan usage page for this account.",
        ),
      );
      render();
    },
    openModelPicker(connectionId) {
      state.modelPicker = { connectionId, query: "", offset: 0 };
      state.dialog = { kind: "model-picker" };
      dispatch("pi-catalog-query", connectionId, {
        connectionId,
        provider: connectionById(connectionId)?.provider,
        offset: 0,
      });
      render();
    },
    setModelPickerQuery(query) {
      if (!state.modelPicker) return;
      state.modelPicker = { ...state.modelPicker, query, offset: 0 };
      dispatch("pi-catalog-query", state.modelPicker.connectionId, {
        connectionId: state.modelPicker.connectionId,
        provider: connectionById(state.modelPicker.connectionId)?.provider,
        query,
        offset: 0,
      });
      render();
    },
    addModelFromPicker(modelId) {
      const picker = state.modelPicker;
      const connection = picker
        ? connectionById(picker.connectionId)
        : undefined;
      if (!picker || !connection) return;
      // The card appears, and the picker closes, only once the owner has
      // actually adopted the model; a failed save keeps the list open.
      dispatch("pi-upsert-model", picker.connectionId, {
        provider: connection.provider,
        modelId,
        connectionId: picker.connectionId,
      });
      setStatus(text(labels(), "addingModel", "Adding the model..."));
      render();
    },
    assignPurpose(cardId, key, value) {
      dispatch("pi-set-defaults", cardId, {
        purpose: key,
        ...(value ? { configurationId: value } : {}),
      });
      render();
    },
    setCardReasoning(cardId, reasoning) {
      const card = cardById(cardId);
      if (!card) return;
      dispatch("pi-upsert-model", cardId, {
        provider: card.provider,
        modelId: card.modelId,
        configurationId: cardId,
        reasoning: reasoning as PiReasoningLevel,
      });
      render();
    },
    requestModelTest(cardId) {
      const card = cardById(cardId);
      if (!card) return;
      state.modelTests[cardId] = {
        requestId: "",
        bindingIdentity: card.bindingIdentity,
        outcome: { completed: false },
      };
      state.dialog = { kind: "test", targetId: cardId, domain: "model" };
      render();
    },
    requestRemoveModel(cardId) {
      state.dialog = {
        kind: "confirm",
        id: "remove-model",
        subject: { cardId },
      };
      render();
    },
    requestRemoveConnection(connectionId) {
      state.dialog = {
        kind: "confirm",
        id: "remove-connection",
        subject: { connectionId },
      };
      render();
    },
    requestRegistrationRemoval(registrationId, remove) {
      state.dialog = {
        kind: "confirm",
        id: remove ? "remove-registration" : "sign-out",
        subject: { registrationId, remove },
      };
      render();
    },
    runModelTest(allowUsage) {
      const dialog = state.dialog;
      if (!dialog || dialog.kind !== "test") return;
      const objectId = dialog.targetId;
      if (dialog.domain === "model") {
        const record = state.modelTests[objectId];
        const requestId = dispatch("pi-test-connection", objectId, {
          configurationId: objectId,
          allowUsage: allowUsage || undefined,
        });
        if (record) record.requestId = requestId;
      } else {
        dispatch(
          dialog.domain === "web" ? "pi-web-test-source" : "pi-mcp-test-source",
          objectId,
          { allowUsage: allowUsage || undefined },
        );
      }
      state.dialog = null;
      setStatus(text(labels(), "testRunning", "Running one test request..."));
      render();
    },
    confirmDialog() {
      const dialog = state.dialog;
      if (!dialog || dialog.kind !== "confirm") return;
      const subject = dialog.subject;
      if (subject.cardId) {
        const card = cardById(subject.cardId);
        if (!card) return;
        dispatch("pi-remove-model", subject.cardId, { modelId: card.modelId });
      } else if (subject.sourceId) {
        dispatch("pi-mcp-delete-source", subject.sourceId, {});
        delete state.sourceTests[subject.sourceId];
      } else if (subject.registrationId) {
        dispatch("pi-chatgpt-sign-out", subject.registrationId, {
          remove: subject.remove,
        });
      } else if (subject.connectionId) {
        dispatch("pi-delete-configuration", subject.connectionId, {});
        // Removing a connection releases only its own cards' evidence.
        for (const card of cardsOf(subject.connectionId)) {
          delete state.modelTests[card.id];
        }
      }
      state.dialog = null;
      render();
    },
    cancelDialog() {
      // A canceled editor is a normal leave: an unsaved draft still asks.
      if (
        state.dialog?.kind === "connection-editor" ||
        state.dialog?.kind === "mcp-editor" ||
        state.dialog?.kind === "mcp-json" ||
        state.dialog?.kind === "web-editor"
      ) {
        requestLeave({ kind: "cancel" });
        return;
      }
      state.dialog = null;
      render();
    },
    addMcpSource() {
      requestLeaveThen({ kind: "cancel" }, () => openMcpEditor());
    },
    editMcpSource(id) {
      openMcpEditor(mcpSource(id));
    },
    patchMcpDraft(patch) {
      const draft = state.mcpDraft;
      if (!draft) return;
      const structural =
        "transport" in patch ||
        "authKind" in patch ||
        "authField" in patch ||
        "localApproved" in patch ||
        "cleartextApproved" in patch ||
        "headersOpen" in patch;
      draft.fields = { ...draft.fields, ...patch };
      if ("transport" in patch && draft.fields.transport !== patch.transport) {
        // Transport decides what a binding row means, so switching it resets
        // the rows instead of reinterpreting an environment name as a header.
        draft.fields = {
          ...draft.fields,
          bindings: [],
          secret: "",
          authField: "",
        };
      }
      if ("authKind" in patch && draft.fields.authKind !== patch.authKind) {
        // Only the intended field binding is kept or dropped: a new field never
        // borrows the previous field's secret.
        draft.fields = {
          ...draft.fields,
          secret: "",
          authField:
            patch.authKind === "bearer"
              ? "Authorization"
              : patch.authKind === "api-key"
                ? "X-API-Key"
                : "",
          bindings: draft.fields.bindings.filter(
            (row) => row.field !== draft.fields.authField,
          ),
        };
      }
      if (structural) render();
    },
    mcpArg(operation) {
      const draft = state.mcpDraft;
      if (!draft) return;
      const argv = [...draft.fields.argv];
      if (operation.type === "add") argv.push("");
      else argv.splice(operation.index, 1);
      draft.fields = { ...draft.fields, argv };
      render();
    },
    setMcpArg(index, value) {
      const draft = state.mcpDraft;
      if (!draft) return;
      draft.fields = {
        ...draft.fields,
        argv: draft.fields.argv.map((item, position) =>
          position === index ? value : item,
        ),
      };
    },
    mcpEntry(scope, operation) {
      const draft = state.mcpDraft;
      if (!draft) return;
      if (operation.type === "add") {
        const row: McpEntryDraft = {
          id: nextId("binding"),
          field: "",
          value: "",
          saved: false,
        };
        draft.fields = {
          ...draft.fields,
          bindings: [...draft.fields.bindings, row],
        };
        render();
        return;
      }
      if (operation.type === "remove") {
        // Removing the row clears that field's binding on the next save.
        draft.fields = {
          ...draft.fields,
          bindings: draft.fields.bindings.filter(
            (row) => row.id !== operation.id,
          ),
        };
        render();
        return;
      }
      draft.fields = {
        ...draft.fields,
        bindings: draft.fields.bindings.map((row) =>
          row.id === operation.id ? { ...row, ...operation.patch } : row,
        ),
      };
      void scope;
    },
    toggleMcpSourceEnabled(id, enabled) {
      const source = mcpSource(id);
      if (!source) return;
      dispatch("pi-mcp-upsert-source", id, {
        source: {
          id: source.id,
          label: source.label,
          transport: source.transport,
          enabled,
          ...(source.transport === "stdio"
            ? {
                executable: source.executable,
                argv: source.argv,
                cwd: source.cwd,
              }
            : { url: source.url }),
          authentication: source.authentication,
          // Enablement carries no submitted value, so every saved binding keeps
          // its own field and the change set stays authoritative.
          bindings: Object.keys(source.credentialSlots || {}).map((field) => ({
            field,
          })),
          ...(source.localNetworkApproval ? { approveLocalNetwork: true } : {}),
          ...(source.cleartextApproval ? { approveCleartext: true } : {}),
        },
      });
      render();
    },
    requestTestMcpSource(id) {
      state.sourceTests[id] = {
        requestId: "",
        bindingIdentity: mcpTestIdentity(mcpSource(id)!),
        outcome: { status: "failed" },
      };
      state.dialog = { kind: "test", targetId: id, domain: "mcp" };
      render();
    },
    requestRemoveMcpSource(id) {
      state.dialog = {
        kind: "confirm",
        id: "remove-mcp",
        subject: { sourceId: id },
      };
      render();
    },
    saveMcpDraft() {
      saveMcpDraft();
    },
    openMcpJson,
    patchMcpJsonDraft(patch) {
      if (!state.mcpJsonDraft) return;
      state.mcpJsonDraft.fields = { ...state.mcpJsonDraft.fields, ...patch };
      if ("text" in patch) {
        // A changed document invalidates the previous impact preview.
        state.mcpJsonDraft.preview = undefined;
        requestMcpJsonPreview();
      }
    },
    saveMcpJson() {
      saveMcpJson();
    },
    editWebSource(id) {
      openWebEditor(webSource(id)!);
    },
    patchWebDraft(patch) {
      const draft = state.webDraft;
      if (!draft) return;
      const structural =
        "modelConfigurationId" in patch ||
        "localApproved" in patch ||
        "codeExecutionApproved" in patch;
      draft.fields = { ...draft.fields, ...patch };
      if (structural) render();
    },
    saveWebDraft() {
      saveWebDraft();
    },
    toggleWebSourceEnabled(id, enabled) {
      const source = webSource(id);
      if (!source) return;
      dispatch("pi-web-save-sources", id, {
        sources: (state.snapshot?.webSources || []).map((entry) => {
          const input = webInputSaved(entry);
          return entry.id === id ? { ...input, enabled } : input;
        }),
      });
      setStatus(
        text(
          labels(),
          enabled ? "webEnabled" : "webDisabled",
          enabled
            ? "Search source enabled; it applies to the next task."
            : "Search source disabled; it applies to the next task.",
        ),
      );
      render();
    },
    moveWebSource(id, offset) {
      const sources = [...(state.snapshot?.webSources || [])];
      const index = sources.findIndex((entry) => entry.id === id);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= sources.length) return;
      const [moved] = sources.splice(index, 1);
      sources.splice(target, 0, moved);
      dispatch("pi-web-save-sources", id, {
        sources: sources.map((entry) => webInputSaved(entry)),
      });
      render();
    },
    requestTestWebSource(id) {
      const source = webSource(id);
      state.sourceTests[id] = {
        requestId: "",
        bindingIdentity: source?.bindingIdentity,
        outcome: { status: "failed" },
      };
      state.dialog = { kind: "test", targetId: id, domain: "web" };
      render();
    },
    setCatalogProvider(provider) {
      state.catalogProvider = provider;
      state.catalogOffset = 0;
      dispatch("pi-catalog-query", ZOTERO_AGENT_SETTINGS_SCOPES.catalog, {
        provider: provider || undefined,
        query: state.catalogQuery || undefined,
        offset: 0,
      });
      render();
    },
    setCatalogQuery(query) {
      state.catalogQuery = query;
      state.catalogOffset = 0;
      dispatch("pi-catalog-query", ZOTERO_AGENT_SETTINGS_SCOPES.catalog, {
        provider: state.catalogProvider || undefined,
        query: query || undefined,
        offset: 0,
      });
    },
    moveCatalogPage(delta) {
      const pageSize = Math.max(1, state.snapshot?.models.pageSize || 1);
      const next = Math.max(0, (state.catalogOffset || 0) + delta * pageSize);
      state.catalogOffset = next;
      dispatch("pi-catalog-query", ZOTERO_AGENT_SETTINGS_SCOPES.catalog, {
        provider: state.catalogProvider || undefined,
        query: state.catalogQuery || undefined,
        offset: next,
      });
      render();
    },
    runMaintenance(sectionId, controlId, value) {
      const objectId = ZOTERO_AGENT_SETTINGS_SCOPES.catalog;
      if (sectionId === "directory") {
        if (controlId === "auto-update") {
          dispatch("pi-catalog-set-auto-update", objectId, {
            enabled: value === true,
          });
        } else if (controlId === "refresh") {
          dispatch("pi-catalog-refresh-public", objectId, {});
        } else if (controlId === "restore") {
          dispatch("pi-catalog-restore-previous", objectId, {});
        }
      } else if (sectionId === "overlay") {
        if (controlId === "select") {
          dispatch("pi-select-overlay-file", objectId, {});
        } else if (controlId === "refresh") {
          dispatch("pi-refresh-overlay", objectId, {});
        } else if (controlId === "remove") {
          dispatch("pi-catalog-remove-overlay", objectId, {});
        }
      } else if (sectionId === "diagnostics" && controlId === "export") {
        dispatch("pi-export-diagnostics", objectId, {});
      }
      render();
    },
  };

  // -- Inbound messages ------------------------------------------------------

  function handleMessage(event: { source?: unknown; data?: unknown }): void {
    const message = event.data;
    if (isZoteroAgentSettingsSnapshotMessage(message)) {
      state.snapshot = message.payload;
      // A page that already shows a connection keeps showing it; the first
      // snapshot simply selects the first connection.
      render();
      return;
    }
    if (isZoteroAgentSettingsActionResultMessage(message)) {
      handleResult(message);
      return;
    }
    if (isZoteroAgentSettingsProgressMessage(message)) {
      handleProgress(message);
      return;
    }
    if (isZoteroAgentSettingsRequestCloseMessage(message)) {
      handleRequestClose(message);
    }
  }

  function handleProgress(message: {
    type: string;
    payload: { requestId: string; objectId: string; phase: string };
  }): void {
    const auth = state.auth;
    if (!auth || auth.objectId !== message.payload.objectId) return;
    state.auth = { ...auth, phase: message.payload.phase };
    render();
  }

  function handleRequestClose(message: {
    type: string;
    payload: { requestId: string };
  }): void {
    const requestId = message.payload.requestId;
    // The host guards every close; the page decides whether a draft blocks it.
    // A clean window answers immediately so the close can proceed.
    requestLeave({ kind: "close", requestId });
  }

  function clearSecrets(): void {
    if (state.connectionDraft) {
      state.connectionDraft.fields = {
        ...state.connectionDraft.fields,
        secret: "",
      };
    }
    if (state.mcpDraft) {
      state.mcpDraft.fields = { ...state.mcpDraft.fields, secret: "" };
      state.mcpDraft.fields = {
        ...state.mcpDraft.fields,
        bindings: state.mcpDraft.fields.bindings.map((row) => ({
          ...row,
          value: "",
        })),
      };
    }
    if (state.mcpJsonDraft) {
      state.mcpJsonDraft.fields = { ...state.mcpJsonDraft.fields, text: "" };
    }
    if (state.webDraft) {
      state.webDraft.fields = { ...state.webDraft.fields, secret: "" };
    }
  }

  return {
    handlers,
    handleMessage,
    handlePageHide: clearSecrets,
    announceReady() {
      dispatch("ready", ZOTERO_AGENT_SETTINGS_SCOPES.window, {});
    },
    renderCurrent: render,
    getState: () => state,
  };
}

// ---------------------------------------------------------------------------
// Page bootstrap
// ---------------------------------------------------------------------------

export function sendZoteroAgentSettingsAction<
  Action extends ZoteroAgentSettingsActionName,
>(
  action: Action,
  requestId: string,
  objectId: string,
  payload: ZoteroAgentSettingsActionPayload<Action>,
): void {
  const message: ZoteroAgentSettingsActionEnvelopeFor<Action> = {
    type: ZOTERO_AGENT_SETTINGS_ACTION,
    action,
    requestId,
    objectId,
    payload,
  };
  try {
    const parent = window.parent;
    parent.dispatchEvent(
      new (
        parent as Window & { MessageEvent: typeof MessageEvent }
      ).MessageEvent("message", {
        source: window,
        data: JSON.parse(JSON.stringify(message)),
      }),
    );
  } catch {
    // A closed host window is not a page error: the next snapshot simply
    // stops arriving.
  }
}

export function bootstrapZoteroAgentSettingsPage(): void {
  const root = document.getElementById("zs-agent-settings-root");
  if (!root) return;
  let renderer: { renderView: (view: ZoteroAgentSettingsView) => void } | null =
    null;
  const controller = createZoteroAgentSettingsController({
    sendAction: sendZoteroAgentSettingsAction,
    renderView: (view) => renderer?.renderView(view),
  });
  renderer = createZoteroAgentSettingsRenderer({
    root: root as HTMLElement,
    handlers: controller.handlers,
  });
  const onMessage = (event: MessageEvent) => {
    // Only the embedding host frame may drive this page. The host delivers its
    // module-level postMessage as a MessageEvent whose source is the parent
    // window, so this stays a strict identity check.
    if (window.parent && event.source !== window.parent) return;
    controller.handleMessage(event);
  };
  window.addEventListener("message", onMessage);
  // A hidden or closing page drops every plaintext secret it still holds; the
  // owner's saved values are unaffected.
  window.addEventListener("pagehide", () => controller.handlePageHide());
  controller.renderCurrent();
  controller.announceReady();
}

// The bundled page runs inside the settings iframe. A page loaded at the top
// level (a test document, a manual open) never announces itself, so importing
// this module in a test has no side effect.
if (
  typeof window !== "undefined" &&
  typeof document !== "undefined" &&
  window.parent &&
  window.parent !== window &&
  document.getElementById("zs-agent-settings-root")
) {
  bootstrapZoteroAgentSettingsPage();
}
