/**
 * Zotero Agent settings wire contract — the single pure action/snapshot/result
 * boundary between the independently hosted settings page
 * (src/dashboard/zoteroAgentSettingsApp.ts) and its host owner
 * (src/modules/workflow/settings/zoteroAgentSettings.ts).
 *
 * Frozen protocol, implemented by the host session:
 *   page  -> host : { type: "zotero-agent-settings:action", action, requestId,
 *                     objectId, payload }
 *   host  -> page : { type: "zotero-agent-settings:snapshot", payload: snapshot }
 *            and { type: "zotero-agent-settings:action-result",
 *                   payload: { ok, code?, result?, action, requestId, objectId } }
 *
 * Rules this file holds:
 * - No imports from src/modules/** and no page imports. Only reusable domain
 *   DTOs (piProviderContract, piWebSourceContract) cross in; read-only views
 *   extend those types instead of restating them.
 * - Nothing projected here carries plaintext. A saved secret appears only as a
 *   binding status (saved / masked / updatedAt); a submitted secret lives in one
 *   action payload and is never echoed back.
 * - Action names keep the established pi-* spelling so domain actions move out
 *   of the Backend Manager without being renamed.
 * - Every envelope carries requestId and objectId, and every result carries the
 *   same pair. objectId is the identity the action owns: the domain object id
 *   (connection, model card, registration, source, credential) or one of the
 *   registry/window scope tokens. The host supersedes the previous request on
 *   the same objectId, so a page must not share one objectId between two
 *   unrelated operations.
 * - A superseded or closed request never receives a result. The page clears the
 *   pending state of an objectId when it dispatches the next request for it.
 */

import type {
  PiApiDialect,
  PiAuthVariant,
  PiCatalogModel,
  PiCatalogSourceState,
  PiConnectionRemoval,
  PiCredentialMetadata,
  PiModelAvailability,
  PiModelConfiguration,
  PiProviderConnection,
  PiProviderDefaults,
  PiReasoningLevel,
} from "./piProviderContract";
import type { PiMcpSource, PiMcpSourceInput } from "./piMcpSourceContract";
import type { PiWebSourceKind } from "./piWebSourceContract";

// ---------------------------------------------------------------------------
// Channel
// ---------------------------------------------------------------------------

export const ZOTERO_AGENT_SETTINGS_ACTION = "zotero-agent-settings:action";
export const ZOTERO_AGENT_SETTINGS_SNAPSHOT = "zotero-agent-settings:snapshot";
export const ZOTERO_AGENT_SETTINGS_ACTION_RESULT =
  "zotero-agent-settings:action-result";
/**
 * Optional host->page progress for a long request (browser authorization).
 * The page degrades to its own pending state when it never arrives, so a host
 * that only answers on settlement stays correct.
 */
export const ZOTERO_AGENT_SETTINGS_PROGRESS = "zotero-agent-settings:progress";
/**
 * Host->page close guard. The host cannot rely on beforeunload alone, so it
 * asks the page first; the page answers with the close-window action.
 */
export const ZOTERO_AGENT_SETTINGS_REQUEST_CLOSE =
  "zotero-agent-settings:request-close";

/**
 * Object ids for actions that own a whole registry or the window itself.
 * Anything object-shaped uses the domain id instead.
 */
export const ZOTERO_AGENT_SETTINGS_SCOPES = {
  window: "window",
  catalog: "catalog",
  mcpRegistry: "mcp-registry",
  webRegistry: "web-registry",
} as const;

export type ZoteroAgentSettingsScope =
  (typeof ZOTERO_AGENT_SETTINGS_SCOPES)[keyof typeof ZOTERO_AGENT_SETTINGS_SCOPES];

export type ZoteroAgentSettingsObjectId = string;

/** Host-supplied UI text. Every visible string resolves through a label key. */
export type ZoteroAgentSettingsLabels = Record<string, string>;

// ---------------------------------------------------------------------------
// Connections and model cards
// ---------------------------------------------------------------------------

/**
 * Which connection form created this connection. It is not the auth variant:
 * a custom endpoint may still be submitted with a key, and the auth variant
 * stays the fact the transport actually uses.
 */
export type ZoteroAgentSettingsConnectionKind =
  | "chatgpt"
  | "api-key"
  | "custom";

/**
 * Host-classified connection state. The page maps the code to localized text
 * and only branches on ready; the rules behind a code stay in the domain owner.
 */
export type ZoteroAgentSettingsConnectionAvailability = {
  code: string;
  ready: boolean;
};

/** Account/discovery facts scoped to one connection identity. */
export type ZoteroAgentSettingsDiscovery = {
  status: "idle" | "checking" | "ready" | "failed" | "empty" | "unknown";
  /** Identity whose facts the current model list belongs to. */
  identity?: string;
  checkedAt?: string;
  code?: string;
};

export type ZoteroAgentSettingsConnection = PiProviderConnection & {
  kind: ZoteroAgentSettingsConnectionKind;
  providerLabel?: string;
  registrationId?: string;
  /** Redacted metadata only; a saved key is never refilled into the page. */
  credentialRef?: string;
  credentialMasked?: string;
  /** Explicit parameters the admitted adapter requires (account/gateway id…). */
  parameters?: Readonly<Record<string, string>>;
  localNetworkApproved?: boolean;
  availability: ZoteroAgentSettingsConnectionAvailability;
  discovery: ZoteroAgentSettingsDiscovery;
  modelCount: number;
  /** What an explicit removal would release, for the confirmation preview. */
  removal?: PiConnectionRemoval;
};

/**
 * Connection form input. The page submits this with a draft id; host-derived
 * fields (binding, availability, discovery, removal) are never sent back.
 */
export type ZoteroAgentSettingsConnectionInput = {
  id: string;
  kind: ZoteroAgentSettingsConnectionKind;
  label: string;
  provider: string;
  authVariant: PiAuthVariant;
  registrationId?: string;
  /** Distinguishes same-email registrations; saved with the connection. */
  registrationLabel?: string;
  baseUrl?: string;
  api?: PiApiDialect;
  parameters?: Record<string, string>;
  enabled: boolean;
  requiresLocalNetwork?: boolean;
  acceptLocalNetwork?: boolean;
  /** Explicit acceptance of a saved target offered for confirmation. */
  acceptRepair?: boolean;
};

/** One model card under a saved connection. */
export type ZoteroAgentSettingsModelConfiguration = PiModelConfiguration & {
  provider: string;
  name: string;
  baseUrl?: string;
  api?: string;
  /** Reasoning levels this model actually offers. */
  reasoningLevels?: readonly PiReasoningLevel[];
  availability: PiModelAvailability;
  /** Supplemental limits from an adopted overlay are in effect. */
  overlayApplied?: boolean;
  /**
   * Identity of the connection target, authentication and card bindings. The
   * page compares it to keep a test result across rename-only edits and drop it
   * after a real binding change, without recomputing domain rules.
   */
  bindingIdentity?: string;
};

/**
 * Default purposes reference a model configuration card.
 * conversation and skillRun inherit global when absent; an absent auxiliary
 * disables provider-based titles. Nothing falls back to a catalog row or a
 * first-available card.
 */
export type ZoteroAgentSettingsDefaults = PiProviderDefaults;

export type ZoteroAgentSettingsDefaultKey = keyof ZoteroAgentSettingsDefaults;

/** Independent ChatGPT registration summary; no credential material. */
export type ZoteroAgentSettingsRegistration = {
  id: string;
  label: string;
  email?: string;
  workspace?: string;
  clientId: string;
  signedIn: boolean;
  planEnabled: boolean;
  paused: boolean;
  reauthorizationRequired: boolean;
  welcomeAccepted: boolean;
  /** Facts identity; the page uses it to scope discovery and test evidence. */
  identity?: string;
};

/**
 * In-flight browser authorization, bound to one request. The page learns the
 * owning connection from the request it sent, so progress never has to travel
 * in the snapshot.
 */
export type ZoteroAgentSettingsAuthorizationProgress = {
  requestId: string;
  objectId: ZoteroAgentSettingsObjectId;
  phase: "waiting" | "exchange" | "verify" | "failed" | "expired" | "canceled";
  code?: string;
};

// ---------------------------------------------------------------------------
// MCP sources
// ---------------------------------------------------------------------------

/**
 * MCP sources cross the wire as the registry's own DTO and change set, so the
 * page and the registry share one shape: ordered argv items, ordered binding
 * rows keyed by exact field identity, and one common authentication choice.
 * A saved secret appears as an opaque credential reference in credentialSlots
 * (joined with mcpCredentials for its mask), never as a value.
 */
export type ZoteroAgentSettingsMcpSource = PiMcpSource;

export type ZoteroAgentSettingsMcpImportMode = "edit" | "import";

export type ZoteroAgentSettingsMcpImportPreview = {
  /**
   * The registry revision this preview was prepared against. Import adopts it
   * as the expected revision, so a binding edited after the preview fails
   * instead of overwriting it, and the page never re-reads a revision itself.
   */
  revision?: string;
  added: number;
  changed: number;
  removed: number;
  /** Same-name sources whose saved entry is kept. */
  conflicts: readonly { sourceId: string }[];
  grants: readonly {
    sourceId: string;
    origin: string;
    cleartext: boolean;
  }[];
  /** Binding fields the document would write; never their values. */
  secretSlots: readonly { sourceId: string; field: string }[];
  /** Field names that fail validation, never the submitted values. */
  problems: readonly { sourceId: string; field: string; code: string }[];
};

// ---------------------------------------------------------------------------
// Search sources
// ---------------------------------------------------------------------------

export type ZoteroAgentSettingsWebSource = {
  id: string;
  kind: PiWebSourceKind;
  label: string;
  enabled: boolean;
  credentialId?: string;
  credentialMasked?: string;
  modelConfigurationId?: string;
  modelConfigurationLabel?: string;
  searchModelId?: string;
  endpoint?: string;
  executable?: string;
  args?: readonly string[];
  localNetworkApproved?: boolean;
  codeExecutionApproved?: boolean;
  /** Enabling a billable kind is the user's billing consent. */
  billable: boolean;
  /** Whether every field this kind requires is saved. */
  configured: boolean;
  /** Required field names that are still missing. */
  missing?: readonly string[];
  /**
   * Identity of target, authentication and model bindings. The page compares it
   * to keep test evidence across order-only edits and drop it after a real
   * binding change, without recomputing domain rules.
   */
  bindingIdentity?: string;
};

export type ZoteroAgentSettingsWebSourceInput = {
  id: string;
  kind: PiWebSourceKind;
  label: string;
  enabled: boolean;
  credentialId?: string | undefined;
  modelConfigurationId?: string | undefined;
  searchModelId?: string | undefined;
  endpoint?: string | undefined;
  executable?: string | undefined;
  args?: string[] | undefined;
  localNetworkApproved?: boolean | undefined;
  codeExecutionApproved?: boolean | undefined;
};

// ---------------------------------------------------------------------------
// Catalog and maintenance
// ---------------------------------------------------------------------------

/** Why a public provider cannot be configured yet. Safe display code. */
export type ZoteroAgentSettingsProviderGapCode =
  | "unsupported_login"
  | "unsupported_request"
  | "unsupported_provider";

export type ZoteroAgentSettingsCatalogProvider = {
  id: string;
  label?: string;
  modelCount?: number;
  /** Runtime-admitted support fact, not a catalog row's claim. */
  configurable?: boolean;
  requiresParameters?: boolean;
  unavailableReason?: ZoteroAgentSettingsProviderGapCode;
  parameters?: readonly {
    id: string;
    label: string;
    placeholder?: string;
  }[];
};

/**
 * A directory row plus the runtime's support facts. The model facts stay the
 * domain type; configurable and requiresParameters come from the adapters the
 * runtime actually admits, which is the only honest answer for "can I add it".
 */
export type ZoteroAgentSettingsCatalogModel = PiCatalogModel & {
  configurable?: boolean;
  requiresParameters?: boolean;
  /** Display reason a model cannot be added; safe code or provider message. */
  reason?: string;
};

export type ZoteroAgentSettingsModelsQuery = {
  /**
   * The query this page answers. The page compares it with what it asked for
   * and ignores a page that belongs to another provider, text or owner, so a
   * late response cannot overwrite the list the user is looking at.
   */
  requestId?: string;
  provider?: string;
  /** The text this page answers. */
  query: string;
  models: readonly ZoteroAgentSettingsCatalogModel[];
  total: number;
  offset: number;
  pageSize: number;
};

export type ZoteroAgentSettingsCatalog = {
  status?: "loading" | "ready" | "error";
  revision: string;
  modelCount: number;
  providers: readonly ZoteroAgentSettingsCatalogProvider[];
  /**
   * Bounded, safe public/overlay/account source state. It also owns
   * autoUpdate, canRestore and overlayStatus, so the page never keeps a second
   * copy of those settings.
   */
  state?: PiCatalogSourceState;
  /** Display name of the adopted supplemental file; never its local path. */
  overlayLabel?: string;
};

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

/** The provider configuration document, projected for this window. */
export type ZoteroAgentSettingsStateView = {
  connections: readonly ZoteroAgentSettingsConnection[];
  configurations: readonly ZoteroAgentSettingsModelConfiguration[];
  defaults: ZoteroAgentSettingsDefaults;
  /** Local overlay file; the page shows its name, never a full path. */
  overlayPath: string;
};

export type ZoteroAgentSettingsSnapshot = {
  /** Host generation, when the owner tracks one. */
  revision?: string;
  state: ZoteroAgentSettingsStateView;
  /** Model-provider credentials. */
  credentials: readonly PiCredentialMetadata[];
  registrations: readonly ZoteroAgentSettingsRegistration[];
  mcpSources: readonly ZoteroAgentSettingsMcpSource[];
  mcpCredentials: readonly PiCredentialMetadata[];
  /**
   * Per-source test identity owned by the registry: it covers the saved source
   * and the credentials it references, so the page never recomputes an
   * applicability rule and a credential replacement invalidates the evidence.
   */
  mcpTestIdentity?: Readonly<Record<string, string>>;
  webSources: readonly ZoteroAgentSettingsWebSource[];
  webCredentials: readonly PiCredentialMetadata[];
  catalog: ZoteroAgentSettingsCatalog;
  /** Bounded catalog page answering the current query. */
  models: ZoteroAgentSettingsModelsQuery;
  labels: ZoteroAgentSettingsLabels;
};

export type ZoteroAgentSettingsSnapshotMessage = {
  type: typeof ZOTERO_AGENT_SETTINGS_SNAPSHOT;
  payload: ZoteroAgentSettingsSnapshot;
};

export type ZoteroAgentSettingsProgressMessage = {
  type: typeof ZOTERO_AGENT_SETTINGS_PROGRESS;
  payload: ZoteroAgentSettingsAuthorizationProgress;
};

/** Host asks the page whether an unsaved draft may block the window close. */
export type ZoteroAgentSettingsRequestCloseMessage = {
  type: typeof ZOTERO_AGENT_SETTINGS_REQUEST_CLOSE;
  payload: { requestId: string };
};

/**
 * How the user resolved an unsaved draft. "continue" keeps the window open;
 * "save" and "discard" let the host close it. A request-close that arrives
 * while no draft is dirty is answered with "discard" — there is nothing to
 * lose, so the close proceeds.
 */
export type ZoteroAgentSettingsCloseDecision = "save" | "discard" | "continue";

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type ZoteroAgentSettingsActionPayloadShape<Fields extends object> = Fields &
  Record<string, unknown>;

export type ZoteroAgentSettingsEmptyPayload = Record<string, never>;

export type ZoteroAgentSettingsActionName =
  | "ready"
  | "close-window"
  // Connections and model cards
  | "pi-upsert-configuration"
  | "pi-delete-configuration"
  | "pi-upsert-model"
  | "pi-remove-model"
  | "pi-set-defaults"
  | "pi-put-credential"
  | "pi-delete-credential"
  | "pi-test-connection"
  // ChatGPT registrations
  | "pi-chatgpt-connect"
  | "pi-chatgpt-cancel"
  | "pi-chatgpt-sign-out"
  | "pi-chatgpt-accept-welcome"
  | "pi-chatgpt-usage"
  | "pi-chatgpt-refresh-models"
  // Catalog and maintenance
  | "pi-catalog-query"
  | "pi-catalog-refresh-public"
  | "pi-catalog-set-auto-update"
  | "pi-catalog-restore-previous"
  | "pi-catalog-remove-overlay"
  | "pi-select-overlay-file"
  | "pi-refresh-overlay"
  | "pi-export-diagnostics"
  // MCP
  | "pi-mcp-upsert-source"
  | "pi-mcp-delete-source"
  | "pi-mcp-test-source"
  | "pi-mcp-preview-import"
  | "pi-mcp-import"
  | "pi-mcp-export"
  // Search
  | "pi-web-save-sources"
  | "pi-web-test-source";

export const ZOTERO_AGENT_SETTINGS_ACTION_NAMES = [
  "ready",
  "close-window",
  "pi-upsert-configuration",
  "pi-delete-configuration",
  "pi-upsert-model",
  "pi-remove-model",
  "pi-set-defaults",
  "pi-put-credential",
  "pi-delete-credential",
  "pi-test-connection",
  "pi-chatgpt-connect",
  "pi-chatgpt-cancel",
  "pi-chatgpt-sign-out",
  "pi-chatgpt-accept-welcome",
  "pi-chatgpt-usage",
  "pi-chatgpt-refresh-models",
  "pi-catalog-query",
  "pi-catalog-refresh-public",
  "pi-catalog-set-auto-update",
  "pi-catalog-restore-previous",
  "pi-catalog-remove-overlay",
  "pi-select-overlay-file",
  "pi-refresh-overlay",
  "pi-export-diagnostics",
  "pi-mcp-upsert-source",
  "pi-mcp-delete-source",
  "pi-mcp-test-source",
  "pi-mcp-preview-import",
  "pi-mcp-import",
  "pi-mcp-export",
  "pi-web-save-sources",
  "pi-web-test-source",
] as const satisfies readonly ZoteroAgentSettingsActionName[];

export type ZoteroAgentSettingsActionPayloadMap = {
  ready: ZoteroAgentSettingsEmptyPayload;
  /**
   * Answer to a request-close. The page sends it only after "discard", or
   * after every pending save has actually settled, so a failed save keeps the
   * window open with its draft.
   */
  "close-window": ZoteroAgentSettingsActionPayloadShape<{
    /** Echoes the host's request-close request. */
    closeRequestId: string;
    decision: ZoteroAgentSettingsCloseDecision;
  }>;
  /**
   * Save a connection as a form. A submitted secret travels once inside this
   * payload and is never projected back; an empty secret keeps the saved key.
   */
  "pi-upsert-configuration": ZoteroAgentSettingsActionPayloadShape<{
    connection: ZoteroAgentSettingsConnectionInput;
    secret?: string;
    /** Adopt an existing saved credential instead of submitting a secret. */
    credentialRef?: string;
  }>;
  /** Removes the connection, its cards, and affected defaults explicitly. */
  "pi-delete-configuration": ZoteroAgentSettingsEmptyPayload;
  /**
   * Add a model card, or save that card's options. Adding names the
   * connection that receives the card; editing names the card. The target is
   * never inferred from the object identity, so a card ID and a connection ID
   * that happen to collide can never redirect a save onto the wrong card.
   */
  "pi-upsert-model": ZoteroAgentSettingsActionPayloadShape<{
    provider: string;
    modelId: string;
    reasoning?: PiReasoningLevel;
    enabled?: boolean;
    /** Adding: the connection that receives the new card. */
    connectionId?: string;
    /** Editing: the card whose options are saved. */
    configurationId?: string;
  }>;
  "pi-remove-model": ZoteroAgentSettingsActionPayloadShape<{
    modelId: string;
  }>;
  /**
   * Assign or clear one purpose on one card. A missing configurationId clears
   * the purpose, which restores inheritance or disables provider-based titles.
   */
  "pi-set-defaults": ZoteroAgentSettingsActionPayloadShape<{
    purpose: ZoteroAgentSettingsDefaultKey;
    configurationId?: string;
  }>;
  /** Explicit shared-key lifecycle, independent of a connection form. */
  "pi-put-credential": ZoteroAgentSettingsActionPayloadShape<{
    label: string;
    secret: string;
    reuseId?: string;
  }>;
  "pi-delete-credential": ZoteroAgentSettingsEmptyPayload;
  /** Explicit tool-free probe of one model card. */
  "pi-test-connection": ZoteroAgentSettingsActionPayloadShape<{
    configurationId: string;
    /** User confirmed the probe may consume quota (possible-usage gate). */
    allowUsage?: boolean;
  }>;
  /**
   * Browser authorization for one registration. It does not need a saved
   * connection: a completed login owns its registration independently and can
   * outlive a canceled connection draft.
   */
  "pi-chatgpt-connect": ZoteroAgentSettingsActionPayloadShape<{
    registrationId?: string;
    label?: string;
    reconsent?: boolean;
  }>;
  /** Cancels the authorization attempt bound to this request. */
  "pi-chatgpt-cancel": ZoteroAgentSettingsEmptyPayload;
  "pi-chatgpt-sign-out": ZoteroAgentSettingsActionPayloadShape<{
    /** Remove the registration instead of only signing out. */
    remove?: boolean;
  }>;
  "pi-chatgpt-accept-welcome": ZoteroAgentSettingsEmptyPayload;
  /**
   * Opens the plan usage page for one registration. Opening the page belongs
   * to the owner because it owns external navigation: the page never guesses a
   * URL, and no usage action can resume a paused registration.
   */
  "pi-chatgpt-usage": ZoteroAgentSettingsEmptyPayload;
  /** Scoped account discovery for exactly this registration. */
  "pi-chatgpt-refresh-models": ZoteroAgentSettingsActionPayloadShape<{
    registrationId?: string;
  }>;
  "pi-catalog-query": ZoteroAgentSettingsActionPayloadShape<{
    provider?: string;
    query?: string;
    offset?: number;
    /** Defaults to the owner's page size. */
    pageSize?: number;
    /** Scopes discovery to one connection's account facts. */
    connectionId?: string;
    /** Scopes discovery to the identity one saved key authorizes. */
    credentialId?: string;
  }>;
  "pi-catalog-refresh-public": ZoteroAgentSettingsEmptyPayload;
  "pi-catalog-set-auto-update": ZoteroAgentSettingsActionPayloadShape<{
    enabled: boolean;
  }>;
  "pi-catalog-restore-previous": ZoteroAgentSettingsEmptyPayload;
  "pi-catalog-remove-overlay": ZoteroAgentSettingsEmptyPayload;
  /** Host-owned file picker; a canceled selection resolves without a path. */
  /**
   * Host-owned file picker plus adoption. The chosen path never crosses back
   * to the page: a canceled picker adopts nothing, a chosen file is validated
   * and adopted, and the page only learns the display label and the counts.
   */
  "pi-select-overlay-file": ZoteroAgentSettingsEmptyPayload;
  /** Re-reads the file the owner already retains; no path is submitted. */
  "pi-refresh-overlay": ZoteroAgentSettingsEmptyPayload;
  "pi-export-diagnostics": ZoteroAgentSettingsEmptyPayload;
  "pi-mcp-upsert-source": ZoteroAgentSettingsActionPayloadShape<{
    source: PiMcpSourceInput;
  }>;
  "pi-mcp-delete-source": ZoteroAgentSettingsEmptyPayload;
  "pi-mcp-test-source": ZoteroAgentSettingsEmptyPayload;
  "pi-mcp-preview-import": ZoteroAgentSettingsActionPayloadShape<{
    json: string;
    mode: ZoteroAgentSettingsMcpImportMode;
  }>;
  "pi-mcp-import": ZoteroAgentSettingsActionPayloadShape<{
    json: string;
    mode: ZoteroAgentSettingsMcpImportMode;
    /** The revision the preview was prepared against. */
    expectedRevision?: string;
    /**
     * Same-name policy for a merge that reaches an existing source. Unlisted
     * entries keep the saved source, so a plain import never replaces.
     */
    conflicts?: Record<string, "keep" | "replace">;
    /** Explicit approvals for exact targets; imported grants are not trusted. */
    approvals?: {
      sourceId: string;
      localNetwork?: boolean;
      cleartext?: boolean;
    }[];
  }>;
  "pi-mcp-export": ZoteroAgentSettingsEmptyPayload;
  "pi-web-save-sources": ZoteroAgentSettingsActionPayloadShape<{
    sources: ZoteroAgentSettingsWebSourceInput[];
    /** One submitted key; never projected back. */
    secret?: { sourceId: string; secret: string };
    clearSecretSourceIds?: string[];
  }>;
  "pi-web-test-source": ZoteroAgentSettingsActionPayloadShape<{
    allowUsage?: boolean;
  }>;
};

export type ZoteroAgentSettingsActionPayload<
  Action extends ZoteroAgentSettingsActionName,
> = ZoteroAgentSettingsActionPayloadMap[Action];

export type ZoteroAgentSettingsActionEnvelopeFor<
  Action extends ZoteroAgentSettingsActionName,
> = {
  type: typeof ZOTERO_AGENT_SETTINGS_ACTION;
  action: Action;
  /** Unique per attempt; a result for another request is not this attempt's. */
  requestId: string;
  /** Connection / card / registration / source / credential / scope id. */
  objectId: ZoteroAgentSettingsObjectId;
  payload: ZoteroAgentSettingsActionPayload<Action>;
};

export type ZoteroAgentSettingsActionEnvelope = {
  [Action in ZoteroAgentSettingsActionName]: ZoteroAgentSettingsActionEnvelopeFor<Action>;
}[ZoteroAgentSettingsActionName];

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type ZoteroAgentSettingsModelTestOutcome = {
  /** Only an actually completed request counts as a successful test. */
  completed: boolean;
  /** A paused registration was lifted by this user-triggered probe. */
  resumeLifted?: boolean;
  /** The request may have consumed quota. */
  possibleUsage?: boolean;
  /** Identity of the bindings the result belongs to. */
  bindingIdentity?: string;
};

export type ZoteroAgentSettingsSourceTestOutcome = {
  status: "available" | "unavailable" | "failed";
  code?: string;
  toolCount?: number;
  possibleUsage?: boolean;
  /** Identity of the bindings the result belongs to. */
  bindingIdentity?: string;
};

export type ZoteroAgentSettingsActionResultPayloadMap = {
  ready: ZoteroAgentSettingsEmptyPayload;
  "close-window": ZoteroAgentSettingsEmptyPayload;
  "pi-upsert-configuration": ZoteroAgentSettingsEmptyPayload;
  "pi-delete-configuration": ZoteroAgentSettingsEmptyPayload;
  "pi-upsert-model": ZoteroAgentSettingsEmptyPayload;
  "pi-remove-model": ZoteroAgentSettingsEmptyPayload;
  "pi-set-defaults": ZoteroAgentSettingsEmptyPayload;
  "pi-put-credential": ZoteroAgentSettingsEmptyPayload;
  "pi-delete-credential": ZoteroAgentSettingsEmptyPayload;
  "pi-test-connection": ZoteroAgentSettingsModelTestOutcome;
  "pi-chatgpt-connect": {
    /** Only an actually completed login reports a registration. */
    registrationId?: string;
  };
  "pi-chatgpt-cancel": ZoteroAgentSettingsEmptyPayload;
  "pi-chatgpt-sign-out": {
    /** Remote revocation was requested; unconfirmed stays unknown. */
    revoked?: boolean;
  };
  "pi-chatgpt-accept-welcome": ZoteroAgentSettingsEmptyPayload;
  "pi-chatgpt-usage": { opened?: boolean };
  "pi-chatgpt-refresh-models": ZoteroAgentSettingsEmptyPayload;
  "pi-catalog-query": Pick<ZoteroAgentSettingsModelsQuery, "total" | "offset">;
  "pi-catalog-refresh-public": {
    revision?: string;
    modelCount?: number;
  };
  "pi-catalog-set-auto-update": ZoteroAgentSettingsEmptyPayload;
  "pi-catalog-restore-previous": { revision?: string };
  "pi-catalog-remove-overlay": ZoteroAgentSettingsEmptyPayload;
  "pi-select-overlay-file": {
    canceled?: boolean;
    /** Display name of the adopted file; never its path. */
    label?: string;
    /** Counts from the facts actually adopted. */
    changed?: number;
    added?: number;
  };
  "pi-refresh-overlay": {
    label?: string;
    changed?: number;
    added?: number;
  };
  /** A canceled destination selection creates no file. */
  "pi-export-diagnostics": { canceled?: boolean };
  "pi-mcp-upsert-source": ZoteroAgentSettingsEmptyPayload;
  "pi-mcp-delete-source": ZoteroAgentSettingsEmptyPayload;
  "pi-mcp-test-source": ZoteroAgentSettingsSourceTestOutcome;
  "pi-mcp-preview-import": { preview: ZoteroAgentSettingsMcpImportPreview };
  "pi-mcp-import": { added?: number; changed?: number; removed?: number };
  "pi-mcp-export": {
    /** Connection structure only; empty authentication slots. */
    document: string;
  };
  "pi-web-save-sources": ZoteroAgentSettingsEmptyPayload;
  "pi-web-test-source": ZoteroAgentSettingsSourceTestOutcome;
};

export type ZoteroAgentSettingsActionResultFor<
  Action extends ZoteroAgentSettingsActionName,
> = {
  ok: boolean;
  /** Canonical failure code. No message, stack, cause or submitted text. */
  code?: string;
  /** Typed outcome for actions that answer with data. */
  result?: ZoteroAgentSettingsActionResultPayloadMap[Action];
};

export type ZoteroAgentSettingsActionResultMessage = {
  type: typeof ZOTERO_AGENT_SETTINGS_ACTION_RESULT;
  payload: {
    action: ZoteroAgentSettingsActionName;
    requestId: string;
    objectId: ZoteroAgentSettingsObjectId;
  } & ZoteroAgentSettingsActionResultFor<ZoteroAgentSettingsActionName>;
};

export type ZoteroAgentSettingsActionSender = <
  Action extends ZoteroAgentSettingsActionName,
>(
  action: Action,
  requestId: string,
  objectId: ZoteroAgentSettingsObjectId,
  payload: ZoteroAgentSettingsActionPayload<Action>,
) => void;

// ---------------------------------------------------------------------------
// Page-side guards
// ---------------------------------------------------------------------------

export function isZoteroAgentSettingsActionName(
  value: unknown,
): value is ZoteroAgentSettingsActionName {
  return (
    typeof value === "string" &&
    (ZOTERO_AGENT_SETTINGS_ACTION_NAMES as readonly string[]).includes(value)
  );
}

export function isZoteroAgentSettingsSnapshotMessage(
  value: unknown,
): value is ZoteroAgentSettingsSnapshotMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ZoteroAgentSettingsSnapshotMessage>;
  const state = message.payload?.state;
  return (
    message.type === ZOTERO_AGENT_SETTINGS_SNAPSHOT &&
    !!message.payload &&
    typeof message.payload === "object" &&
    !!state &&
    Array.isArray(state.connections) &&
    Array.isArray(state.configurations)
  );
}

export function isZoteroAgentSettingsActionResultMessage(
  value: unknown,
): value is ZoteroAgentSettingsActionResultMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ZoteroAgentSettingsActionResultMessage>;
  return (
    message.type === ZOTERO_AGENT_SETTINGS_ACTION_RESULT &&
    !!message.payload &&
    typeof message.payload === "object" &&
    isZoteroAgentSettingsActionName(message.payload.action) &&
    typeof message.payload.requestId === "string" &&
    typeof message.payload.objectId === "string" &&
    typeof message.payload.ok === "boolean"
  );
}

export function isZoteroAgentSettingsProgressMessage(
  value: unknown,
): value is ZoteroAgentSettingsProgressMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ZoteroAgentSettingsProgressMessage>;
  return (
    message.type === ZOTERO_AGENT_SETTINGS_PROGRESS &&
    !!message.payload &&
    typeof message.payload.requestId === "string" &&
    typeof message.payload.objectId === "string" &&
    typeof message.payload.phase === "string"
  );
}

export function isZoteroAgentSettingsRequestCloseMessage(
  value: unknown,
): value is ZoteroAgentSettingsRequestCloseMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ZoteroAgentSettingsRequestCloseMessage>;
  return (
    message.type === ZOTERO_AGENT_SETTINGS_REQUEST_CLOSE &&
    !!message.payload &&
    typeof message.payload.requestId === "string" &&
    message.payload.requestId.length > 0
  );
}
