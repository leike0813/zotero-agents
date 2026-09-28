/** @jsxRuntime automatic */
/** @jsxImportSource preact */
// Backend Manager dialog page regions (Preact), migrated from the
// hand-written addon/content/dashboard/backend-manager.js. Action names,
// payload shapes, label fallbacks, and class names mirror the frozen wire
// contract with the host (src/modules/workflow/settings/backendManager.ts); the host localizes
// every label and ships them in the snapshot's labels map, so the page never
// calls FTL itself.

import { memo } from "preact/compat";
import { useRef, useState } from "preact/hooks";

export type { BackendManagerActionEnvelope } from "../../shared/dashboardWireContract";
import type { BackendManagerBuiltinAgentSnapshot } from "../../shared/dashboardWireContract";
import type {
  PiProviderConfiguration,
  PiProviderDefaults,
} from "../../shared/piProviderContract";
import { CustomSelect } from "../../shared/customSelect";
import { equalBySignature } from "../../shared/regionEquality";

// ---------------------------------------------------------------------------
// Wire shapes (page-side mirror of the frozen host contract)
// ---------------------------------------------------------------------------

export type BackendManagerLabels = Record<string, string>;

export type BackendManagerEnvDraftItem = {
  key: string;
  value: string;
};

export type BackendManagerDraftRowAcp = {
  connectionTest?: {
    status?: string;
    testedAt?: string;
    error?: string;
  };
  [key: string]: unknown;
};

export type BackendManagerDraftRow = {
  internalId: string;
  displayName: string;
  type: string;
  enabled: boolean;
  baseUrl: string;
  authKind: string;
  authToken: string;
  authTokenPlaceholder: string;
  timeoutMs: string;
  command: string;
  args: string[];
  env: BackendManagerEnvDraftItem[];
  acp?: BackendManagerDraftRowAcp;
};

export type BackendManagerProviderView = {
  type: string;
  label: string;
  title: string;
};

export type BackendManagerAcpPreset = {
  id: string;
  label: string;
  bareCommand: string;
  bareArgs: string[];
  npxPackage?: string;
  npxArgs?: string[];
  defaultEnv?: Record<string, string>;
  defaultUseNpx: boolean;
  supportsNpx: boolean;
  agentFamily: string;
  isolation?: {
    envKey?: string;
    env?: Array<{
      key: string;
      pathSuffix?: string;
    }>;
    args?: Array<{
      flag: string;
      pathSuffix?: string;
    }>;
  };
};

export type BackendManagerGenericHttpPreset = {
  id: string;
  displayName: string;
  baseUrl: string;
  authKind: "none" | "bearer";
  authTokenPlaceholder?: string;
  timeoutMs?: string;
  note?: {
    text: string;
    linkText: string;
    linkUrl: string;
  };
};

export type BackendManagerSnapshot = {
  title: string;
  help: string;
  labels: BackendManagerLabels;
  initialProviderType?: string;
  providers: BackendManagerProviderView[];
  rows: BackendManagerDraftRow[];
  builtinAgent?: BackendManagerBuiltinAgentSnapshot;
  skillRunnerHealth: Record<
    string,
    {
      enabled: boolean;
      reachable: boolean;
      status?: string;
      updatedAt?: string;
      lastReachableAt?: string;
      lastProbeAt?: string;
      lastError?: string;
    }
  >;
  acpPresets: BackendManagerAcpPreset[];
  genericHttpPresets: BackendManagerGenericHttpPreset[];
  acpPresetIsolationRoot: string;
  runtimeCommands: {
    npx: {
      available?: boolean;
      diagnostic?: string;
    };
  };
};

// ---------------------------------------------------------------------------
// Region selections
// ---------------------------------------------------------------------------

export type BackendManagerHeaderSelection = {
  title: string;
  help: string;
  tabs: Array<{ type: string; label: string; active: boolean }>;
};

export type BackendManagerBodyRowEntry = {
  index: number;
  row: BackendManagerDraftRow;
  acpPending: boolean;
  modelCachePending: boolean;
  skillRunnerReachable: boolean;
};

export type BackendManagerBodySelection = {
  providerType: string;
  providerLabel: string;
  providerTitle: string;
  hasGenericHttpPresets: boolean;
  labels: BackendManagerLabels;
  rows: BackendManagerBodyRowEntry[];
  builtinAgent?: BackendManagerBuiltinAgentSnapshot;
};

export type BackendManagerFooterSelection = {
  status: { text: string; tone: string } | null;
  labels: BackendManagerLabels;
  showProfileSave?: boolean;
};

export type BackendManagerAcpPresetDialogState = {
  selectedPresetId: string;
  useNpx: boolean;
  isolated: boolean;
};

export type BackendManagerGenericHttpPresetDialogState = {
  selectedPresetId: string;
};

export type BackendManagerAcpDialogSelection = {
  labels: BackendManagerLabels;
  presets: BackendManagerAcpPreset[];
  dialog: BackendManagerAcpPresetDialogState;
  npxUnavailable: boolean;
  isolationRoot: string;
};

export type BackendManagerGenericHttpDialogSelection = {
  labels: BackendManagerLabels;
  presets: BackendManagerGenericHttpPreset[];
  dialog: BackendManagerGenericHttpPresetDialogState;
};

export type BackendManagerView = {
  header: BackendManagerHeaderSelection;
  body: BackendManagerBodySelection | null;
  footer: BackendManagerFooterSelection;
  acpDialog: BackendManagerAcpDialogSelection | null;
  genericHttpDialog: BackendManagerGenericHttpDialogSelection | null;
};

// Row patches may be functional so list editors (args/env) always resolve
// against the controller's live row: text inputs never re-render, so props
// can lag the draft by several keystrokes.
export type BackendManagerRowPatch =
  | Partial<BackendManagerDraftRow>
  | ((row: BackendManagerDraftRow) => Partial<BackendManagerDraftRow>);

export type BackendManagerRegionHandlers = {
  selectTab(providerType: string): void;
  patchRow(index: number, patch: BackendManagerRowPatch): void;
  changeRowStructure(index: number, patch: BackendManagerRowPatch): void;
  removeRow(index: number): void;
  addRow(): void;
  openAcpPresetDialog(): void;
  openGenericHttpPresetDialog(): void;
  refreshAcp(index: number): void;
  refreshModelCache(index: number): void;
  openManagement(index: number): void;
  toggleSkillRunnerEnabled(index: number, checked: boolean): void;
  reportBodyScroll(scrollTop: number): void;
  cancel(): void;
  save(): void;
  selectAcpDialogPreset(presetId: string): void;
  setAcpDialogUseNpx(useNpx: boolean): void;
  setAcpDialogIsolated(isolated: boolean): void;
  cancelAcpDialog(): void;
  confirmAcpDialog(confirmation: {
    presetId: string;
    useNpx: boolean;
    isolated: boolean;
  }): void;
  openNodejsDownload(): void;
  selectGenericHttpDialogPreset(presetId: string): void;
  cancelGenericHttpDialog(): void;
  confirmGenericHttpDialog(presetId: string): void;
  openPresetLink(url: string): void;
  upsertPiConfiguration(configuration: PiProviderConfiguration): void;
  deletePiConfiguration(id: string): void;
  setPiDefaults(defaults: PiProviderDefaults): void;
  refreshPiOverlay(path: string): void;
  queryPiCatalog(provider: string, query: string): void;
  putPiCredential(input: { id: string; label: string; secret: string }): void;
  deletePiCredential(id: string): void;
  testPiConnection(configurationId: string): void;
  upsertMcpSource(
    source: import("../../shared/piMcpSourceContract").PiMcpSource,
  ): void;
  deleteMcpSource(id: string): void;
  testMcpSource(id: string): void;
  reviewMcpTool(
    sourceId: string,
    name: string,
    digest: string,
    promoted: boolean,
  ): void;
  unreviewMcpTool(sourceId: string, name: string): void;
  putMcpSecret(id: string, label: string, secret: string): void;
  deleteMcpSecret(id: string): void;
  importMcpJson(
    json: string,
    approvals: Array<{ sourceId: string; origin: string; cleartext: boolean }>,
  ): void;
  previewMcpJson(json: string): void;
  exportMcpJson(): void;
  resetMcpRegistry(): void;
};

// ---------------------------------------------------------------------------
// Shared label/text helpers
// ---------------------------------------------------------------------------

function labelText(
  labels: BackendManagerLabels,
  key: string,
  fallback: string,
): string {
  return labels[key] || fallback;
}

function providerAddLabel(
  labels: BackendManagerLabels,
  provider: { type: string; label: string },
): string {
  const raw = String(labelText(labels, "addProfile", "Add Profile"));
  const name = provider.label || provider.type;
  const replaced = raw.replace(/\{\s*\$provider\s*\}/g, name);
  return /\{\s*\$provider\s*\}|\$provider/.test(replaced)
    ? "Add Profile"
    : replaced;
}

function acpRowStatus(row: BackendManagerDraftRow): string {
  return row.acp && row.acp.connectionTest
    ? row.acp.connectionTest.status || "untested"
    : "untested";
}

// ---------------------------------------------------------------------------
// Field primitives
// ---------------------------------------------------------------------------

function TextField(props: {
  className?: string;
  label: string;
  value: string;
  placeholder?: string;
  onInput: (value: string) => void;
}) {
  return (
    <div class={`backend-field ${props.className || ""}`}>
      <label>{props.label}</label>
      <input
        class="backend-input"
        type="text"
        value={props.value || ""}
        placeholder={props.placeholder || ""}
        onInput={(event) =>
          props.onInput((event.target as HTMLInputElement).value)
        }
      />
    </div>
  );
}

function CheckboxField(props: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label class="backend-field backend-checkbox-field">
      <input
        type="checkbox"
        checked={props.checked !== false}
        disabled={!!props.disabled}
        onChange={(event) =>
          props.onChange((event.target as HTMLInputElement).checked)
        }
      />
      {props.label}
    </label>
  );
}

function TokenField(props: {
  label: string;
  value: string;
  placeholder?: string;
  onInput: (value: string) => void;
}) {
  const prevent = (event: Event) => {
    event.preventDefault();
  };
  return (
    <div class="backend-field backend-token-field">
      <label>{props.label}</label>
      <input
        class="backend-input backend-token-input"
        type="password"
        autocomplete="off"
        value={props.value || ""}
        placeholder={props.placeholder || ""}
        onInput={(event) =>
          props.onInput((event.target as HTMLInputElement).value)
        }
        onCopy={prevent}
        onCut={prevent}
        onContextMenu={prevent}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row editors
// ---------------------------------------------------------------------------

function ArgEditor(props: {
  labels: BackendManagerLabels;
  args: string[];
  index: number;
  handlers: BackendManagerRegionHandlers;
}) {
  const { labels, args, index, handlers } = props;
  return (
    <div class="backend-list-editor">
      <div class="backend-list-header">
        <span class="backend-list-label">
          {labelText(labels, "args", "Args")}
        </span>
        <button
          type="button"
          class="backend-button"
          onClick={() =>
            handlers.changeRowStructure(index, (row) => ({
              args: [...row.args, ""],
            }))
          }
        >
          {labelText(labels, "addArg", "Add Argument")}
        </button>
      </div>
      <div class="backend-list-items">
        {args.map((value, argIndex) => (
          <div class="backend-list-row" key={argIndex}>
            <input
              class="backend-input"
              value={value || ""}
              placeholder={labelText(labels, "argPlaceholder", "Argument")}
              onInput={(event) => {
                const next = (event.target as HTMLInputElement).value;
                handlers.patchRow(index, (row) => ({
                  args: row.args.map((entry, i) =>
                    i === argIndex ? next : entry,
                  ),
                }));
              }}
            />
            <button
              type="button"
              class="backend-button icon danger"
              aria-label={labelText(labels, "remove", "Remove")}
              onClick={() =>
                handlers.changeRowStructure(index, (row) => ({
                  args: row.args.filter((_, i) => i !== argIndex),
                }))
              }
            >
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EnvEditor(props: {
  labels: BackendManagerLabels;
  env: BackendManagerEnvDraftItem[];
  index: number;
  handlers: BackendManagerRegionHandlers;
}) {
  const { labels, env, index, handlers } = props;
  return (
    <div class="backend-list-editor backend-env-editor">
      <div class="backend-list-header">
        <span class="backend-list-label">
          {labelText(labels, "env", "Env")}
        </span>
        <button
          type="button"
          class="backend-button"
          onClick={() =>
            handlers.changeRowStructure(index, (row) => ({
              env: [...row.env, { key: "", value: "" }],
            }))
          }
        >
          {labelText(labels, "addEnv", "Add Environment Variable")}
        </button>
      </div>
      <div class="backend-list-items">
        {env.map((item, envIndex) => (
          <div class="backend-list-row backend-env-row" key={envIndex}>
            <input
              class="backend-input"
              value={item.key || ""}
              placeholder={labelText(labels, "envKeyPlaceholder", "Variable")}
              onInput={(event) => {
                const next = (event.target as HTMLInputElement).value;
                handlers.patchRow(index, (row) => ({
                  env: row.env.map((entry, i) =>
                    i === envIndex
                      ? { key: next, value: entry.value || "" }
                      : entry,
                  ),
                }));
              }}
            />
            <input
              class="backend-input"
              value={item.value || ""}
              placeholder={labelText(labels, "envValuePlaceholder", "Value")}
              onInput={(event) => {
                const next = (event.target as HTMLInputElement).value;
                handlers.patchRow(index, (row) => ({
                  env: row.env.map((entry, i) =>
                    i === envIndex
                      ? { key: entry.key || "", value: next }
                      : entry,
                  ),
                }));
              }}
            />
            <button
              type="button"
              class="backend-button icon danger"
              aria-label={labelText(labels, "remove", "Remove")}
              onClick={() =>
                handlers.changeRowStructure(index, (row) => ({
                  env: row.env.filter((_, i) => i !== envIndex),
                }))
              }
            >
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AcpActions(props: {
  labels: BackendManagerLabels;
  status: string;
  pending: boolean;
  index: number;
  handlers: BackendManagerRegionHandlers;
}) {
  const { labels, status, pending, index, handlers } = props;
  return (
    <div class="backend-acp-actions">
      <span class={`backend-status-chip status-${status}`}>{status}</span>
      <button
        type="button"
        class="backend-button"
        disabled={pending}
        onClick={() => handlers.refreshAcp(index)}
      >
        {status === "passed"
          ? labelText(labels, "refreshAcpRuntimeCache", "Refresh Config Cache")
          : labelText(labels, "testAcpConnection", "Test Connection")}
      </button>
      <button
        type="button"
        class="backend-button danger"
        onClick={() => handlers.removeRow(index)}
      >
        {labelText(labels, "remove", "Remove")}
      </button>
    </div>
  );
}

function HttpActions(props: {
  labels: BackendManagerLabels;
  entry: BackendManagerBodyRowEntry;
  handlers: BackendManagerRegionHandlers;
}) {
  const { labels, entry, handlers } = props;
  const { row, index } = entry;
  return (
    <div class="backend-row-actions backend-http-actions">
      {row.type === "skillrunner" ? (
        <button
          type="button"
          class="backend-button"
          disabled={row.enabled === false || !entry.skillRunnerReachable}
          onClick={() => handlers.openManagement(index)}
        >
          {row.enabled === false
            ? labelText(labels, "disabled", "Disabled")
            : entry.skillRunnerReachable
              ? labelText(labels, "openManagement", "Open Management")
              : labelText(labels, "unreachable", "Unreachable")}
        </button>
      ) : null}
      {row.type === "skillrunner" ? (
        <button
          type="button"
          class="backend-button"
          disabled={row.enabled === false || entry.modelCachePending}
          onClick={() => handlers.refreshModelCache(index)}
        >
          {labelText(labels, "refreshModelCache", "Refresh Model Cache")}
        </button>
      ) : null}
      <button
        type="button"
        class="backend-button danger"
        onClick={() => handlers.removeRow(index)}
      >
        {labelText(labels, "remove", "Remove")}
      </button>
    </div>
  );
}

function AcpRow(props: {
  labels: BackendManagerLabels;
  entry: BackendManagerBodyRowEntry;
  handlers: BackendManagerRegionHandlers;
}) {
  const { labels, entry, handlers } = props;
  const { row, index } = entry;
  return (
    <article class="backend-profile-card is-acp">
      <div class="backend-acp-grid">
        <div class="backend-acp-identity">
          <TextField
            className="backend-field-id"
            label={labelText(labels, "displayName", "ID")}
            value={row.displayName}
            onInput={(value) =>
              handlers.patchRow(index, { displayName: value })
            }
          />
          <TextField
            className="backend-field-command"
            label={labelText(labels, "command", "Command")}
            value={row.command}
            onInput={(value) => handlers.patchRow(index, { command: value })}
          />
        </div>
        <div class="backend-acp-column backend-acp-args">
          <ArgEditor
            labels={labels}
            args={row.args}
            index={index}
            handlers={handlers}
          />
        </div>
        <div class="backend-acp-column backend-acp-env">
          <EnvEditor
            labels={labels}
            env={row.env}
            index={index}
            handlers={handlers}
          />
        </div>
        <div class="backend-acp-column backend-acp-action-cell">
          <AcpActions
            labels={labels}
            status={acpRowStatus(row)}
            pending={entry.acpPending}
            index={index}
            handlers={handlers}
          />
        </div>
      </div>
    </article>
  );
}

function HttpRow(props: {
  labels: BackendManagerLabels;
  entry: BackendManagerBodyRowEntry;
  handlers: BackendManagerRegionHandlers;
}) {
  const { labels, entry, handlers } = props;
  const { row, index } = entry;
  return (
    <article
      class={`backend-profile-card is-http${row.type === "skillrunner" ? " is-skillrunner" : ""}`}
    >
      <div class="backend-http-grid">
        <TextField
          className="backend-field-id"
          label={labelText(labels, "displayName", "ID")}
          value={row.displayName}
          onInput={(value) => handlers.patchRow(index, { displayName: value })}
        />
        <TextField
          className="backend-field-url"
          label={labelText(labels, "baseUrl", "Base URL")}
          value={row.baseUrl}
          onInput={(value) => handlers.patchRow(index, { baseUrl: value })}
        />
        {row.type === "skillrunner" ? (
          <CheckboxField
            label={labelText(labels, "enabled", "Enabled")}
            checked={row.enabled !== false}
            onChange={(checked) =>
              handlers.toggleSkillRunnerEnabled(index, checked)
            }
          />
        ) : null}
        <div class="backend-field backend-field-auth">
          <label>{labelText(labels, "auth", "Auth")}</label>
          <CustomSelect
            value={row.authKind}
            options={[
              { value: "none", label: labelText(labels, "authNone", "None") },
              {
                value: "bearer",
                label: labelText(labels, "authBearer", "Bearer"),
              },
            ]}
            onChange={(value) => handlers.patchRow(index, { authKind: value })}
          />
        </div>
        <TokenField
          label={labelText(labels, "token", "Token")}
          value={row.authToken}
          placeholder={row.authTokenPlaceholder || ""}
          onInput={(value) => handlers.patchRow(index, { authToken: value })}
        />
        <TextField
          className="backend-field-timeout"
          label={labelText(labels, "timeoutMs", "Timeout(ms)")}
          value={row.timeoutMs}
          onInput={(value) => handlers.patchRow(index, { timeoutMs: value })}
        />
        <HttpActions labels={labels} entry={entry} handlers={handlers} />
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

type RegionProps<Selection> = {
  selection: Selection;
  handlers: BackendManagerRegionHandlers;
};

function regionEqual<Selection>(
  prev: RegionProps<Selection>,
  next: RegionProps<Selection>,
): boolean {
  return (
    prev.handlers === next.handlers &&
    equalBySignature(prev.selection, next.selection)
  );
}

export const BackendManagerHeaderRegion = memo(
  function BackendManagerHeaderRegion(
    props: RegionProps<BackendManagerHeaderSelection>,
  ) {
    const { selection, handlers } = props;
    return (
      <header class="backend-manager-header">
        <h1 class="backend-manager-title">{selection.title}</h1>
        <p class="backend-manager-help">{selection.help}</p>
        <div class="backend-provider-tabs">
          {selection.tabs.map((tab) => (
            <button
              key={tab.type}
              type="button"
              class={`backend-button backend-provider-tab${tab.active ? " is-active" : ""}`}
              aria-pressed={tab.active ? "true" : "false"}
              onClick={() => handlers.selectTab(tab.type)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>
    );
  },
  regionEqual,
);

const EMPTY_PI_CONFIGURATION: PiProviderConfiguration = {
  id: "",
  label: "",
  provider: "",
  modelId: "",
  authVariant: "api-key",
  enabled: true,
};

function PiConfigurationPanel(props: {
  value: BackendManagerBuiltinAgentSnapshot;
  labels: BackendManagerLabels;
  handlers: BackendManagerRegionHandlers;
}) {
  const { value, labels, handlers } = props;
  const [draft, setDraft] = useState<PiProviderConfiguration>({
    ...EMPTY_PI_CONFIGURATION,
  });
  const [defaults, setDefaults] = useState<PiProviderDefaults>(value.defaults);
  const [overlayPath, setOverlayPath] = useState(value.overlayPath);
  const [credentialLabel, setCredentialLabel] = useState("");
  const secretInput = useRef<HTMLInputElement>(null);
  const statusLabels: Record<string, string> = {
    configured: labelText(labels, "piStatusConfigured", "Configured"),
    disabled: labelText(labels, "disabled", "Disabled"),
    incomplete: labelText(labels, "piStatusIncomplete", "Incomplete"),
    "needs-auth": labelText(labels, "piStatusNeedsAuth", "Credential required"),
    invalid: labelText(labels, "piStatusInvalid", "Model unavailable"),
    unavailable: labelText(
      labels,
      "piStatusUnavailable",
      "Catalog unavailable",
    ),
  };
  const update = (patch: Partial<PiProviderConfiguration>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const field = (
    key: keyof PiProviderConfiguration,
    label: string,
    input: "text" | "url" = "text",
  ) => (
    <label class="backend-field">
      <span>{label}</span>
      <input
        class="backend-input"
        type={input}
        data-pi-field={key}
        value={String(draft[key] || "")}
        onInput={(event) =>
          update({ [key]: (event.target as HTMLInputElement).value })
        }
        onChange={
          key === "provider"
            ? (event) =>
                handlers.queryPiCatalog(
                  (event.target as HTMLInputElement).value,
                  "",
                )
            : undefined
        }
        list={
          key === "provider"
            ? "pi-provider-options"
            : key === "modelId"
              ? "pi-model-options"
              : undefined
        }
      />
    </label>
  );
  const selectDefault = (key: keyof PiProviderDefaults, label: string) => (
    <label class="backend-field">
      <span>{label}</span>
      <select
        class="backend-input"
        value={defaults[key]?.configurationId || ""}
        onChange={(event) => {
          const configurationId = (event.target as HTMLSelectElement).value;
          setDefaults((current) => ({
            ...current,
            [key]: configurationId ? { configurationId } : undefined,
          }));
        }}
      >
        <option value="">
          {labelText(labels, "piNoDefault", "No default")}
        </option>
        {value.configurations
          .filter(
            (entry) => value.configurationStatus[entry.id] === "configured",
          )
          .map((entry) => (
            <option value={entry.id} key={entry.id}>
              {entry.label || entry.id}
            </option>
          ))}
      </select>
    </label>
  );
  return (
    <section class="backend-provider-section backend-pi-section">
      <header class="backend-provider-header">
        <h2 class="backend-provider-title">
          {labelText(labels, "piTitle", "Built-in Agent")}
        </h2>
        <button
          type="button"
          class="backend-button"
          data-pi-action="add"
          onClick={() => setDraft({ ...EMPTY_PI_CONFIGURATION })}
        >
          {labelText(labels, "piAdd", "Add configuration")}
        </button>
      </header>
      <p class="backend-pi-status" role="status">
        {value.catalog.modelCount} {labelText(labels, "piModels", "models")} ·{" "}
        {labelText(
          labels,
          value.catalog.status === "ready"
            ? "piCatalogReady"
            : value.catalog.status === "loading"
              ? "piCatalogLoading"
              : "piCatalogError",
          value.catalog.status === "ready"
            ? "Catalog ready"
            : value.catalog.status === "loading"
              ? "Loading catalog"
              : "Catalog unavailable",
        )}
      </p>
      {value.configurations.every(
        (entry) => value.configurationStatus[entry.id] !== "configured",
      ) ? (
        <p class="backend-pi-unavailable">
          {labelText(
            labels,
            "piUnavailable",
            "No usable provider configuration.",
          )}
        </p>
      ) : null}
      <div class="backend-pi-grid">
        <label class="backend-field">
          <span>{labelText(labels, "piConfigurations", "Configurations")}</span>
          <select
            class="backend-input"
            data-pi-field="configuration"
            value={draft.id}
            onChange={(event) => {
              const id = (event.target as HTMLSelectElement).value;
              setDraft(
                value.configurations.find((entry) => entry.id === id) || {
                  ...EMPTY_PI_CONFIGURATION,
                },
              );
            }}
          >
            <option value="">
              {labelText(labels, "piNew", "New configuration")}
            </option>
            {value.configurations.map((entry) => (
              <option value={entry.id} key={entry.id}>
                {entry.label || entry.id}
              </option>
            ))}
          </select>
        </label>
        {draft.id ? (
          <p class="backend-pi-configuration-status" role="status">
            {statusLabels[value.configurationStatus[draft.id]] || ""}
          </p>
        ) : null}
        {field("label", labelText(labels, "piLabel", "Name"))}
        {field("provider", labelText(labels, "piProvider", "Provider"))}
        <datalist id="pi-provider-options">
          {value.catalog.providers.map((provider) => (
            <option value={provider} key={provider} />
          ))}
        </datalist>
        {field("modelId", labelText(labels, "piModel", "Model"))}
        <datalist id="pi-model-options">
          {value.models
            .filter((model) => model.provider === draft.provider)
            .map((model) => (
              <option value={model.id} key={model.id}>
                {model.name}
              </option>
            ))}
        </datalist>
        <label class="backend-field">
          <span>{labelText(labels, "piAuth", "Authentication")}</span>
          <select
            class="backend-input"
            value={draft.authVariant}
            onChange={(event) =>
              update({
                authVariant: (event.target as HTMLSelectElement)
                  .value as PiProviderConfiguration["authVariant"],
                credentialRef: undefined,
              })
            }
          >
            <option value="api-key">API key</option>
            <option value="openai-codex">OpenAI Codex</option>
            <option value="none">
              {labelText(labels, "authNone", "None")}
            </option>
          </select>
        </label>
        <label class="backend-field">
          <span>{labelText(labels, "piCredential", "Credential")}</span>
          <select
            class="backend-input"
            value={draft.credentialRef || ""}
            onChange={(event) =>
              update({
                credentialRef: (event.target as HTMLSelectElement).value,
              })
            }
          >
            <option value="">
              {labelText(labels, "piNoCredential", "No credential")}
            </option>
            {value.credentials
              .filter((entry) => entry.kind === draft.authVariant)
              .map((entry) => (
                <option value={entry.id} key={entry.id}>
                  {entry.label} ({entry.masked})
                </option>
              ))}
          </select>
        </label>
        {field(
          "baseUrl",
          labelText(labels, "piEndpoint", "Custom endpoint"),
          "url",
        )}
        <label class="backend-field">
          <span>{labelText(labels, "piDialect", "API dialect")}</span>
          <select
            class="backend-input"
            value={draft.api || ""}
            onChange={(event) =>
              update({
                api: (event.target as HTMLSelectElement)
                  .value as PiProviderConfiguration["api"],
              })
            }
          >
            <option value="">
              {labelText(labels, "piCatalogDefault", "Catalog default")}
            </option>
            <option value="openai-responses">openai-responses</option>
            <option value="openai-completions">openai-completions</option>
          </select>
        </label>
        <label class="backend-field">
          <span>{labelText(labels, "piReasoning", "Reasoning")}</span>
          <select
            class="backend-input"
            value={draft.reasoning || "off"}
            onChange={(event) =>
              update({
                reasoning: (event.target as HTMLSelectElement)
                  .value as PiProviderConfiguration["reasoning"],
              })
            }
          >
            {["off", "minimal", "low", "medium", "high", "xhigh", "max"].map(
              (level) => (
                <option value={level} key={level}>
                  {level}
                </option>
              ),
            )}
          </select>
        </label>
        <label class="backend-field backend-checkbox-field">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) =>
              update({ enabled: (event.target as HTMLInputElement).checked })
            }
          />
          {labelText(labels, "enabled", "Enabled")}
        </label>
      </div>
      <div class="backend-provider-actions">
        <button
          type="button"
          class="backend-button primary"
          data-pi-action="save"
          onClick={() => {
            handlers.upsertPiConfiguration(draft);
          }}
        >
          {labelText(labels, "piSave", "Save configuration")}
        </button>
        {draft.id ? (
          <button
            type="button"
            class="backend-button danger"
            data-pi-action="delete"
            onClick={() => {
              handlers.deletePiConfiguration(draft.id);
              setDraft({ ...EMPTY_PI_CONFIGURATION });
            }}
          >
            {labelText(labels, "remove", "Remove")}
          </button>
        ) : null}
        {draft.id ? (
          <button
            type="button"
            class="backend-button"
            data-pi-action="connection-test"
            onClick={() => handlers.testPiConnection(draft.id)}
          >
            {labelText(labels, "piTestConnection", "Test connection")}
          </button>
        ) : null}
      </div>
      <section class="backend-pi-defaults">
        <h3>{labelText(labels, "piDefaults", "Defaults")}</h3>
        <div class="backend-pi-grid">
          {selectDefault("global", labelText(labels, "piGlobal", "Global"))}
          {selectDefault(
            "conversation",
            labelText(labels, "piConversation", "Conversation"),
          )}
          {selectDefault(
            "skillRun",
            labelText(labels, "piSkillRun", "Skill Run"),
          )}
        </div>
        <button
          type="button"
          class="backend-button"
          data-pi-action="defaults"
          onClick={() => handlers.setPiDefaults(defaults)}
        >
          {labelText(labels, "piSaveDefaults", "Save defaults")}
        </button>
      </section>
      <section class="backend-pi-credentials">
        <h3>{labelText(labels, "piCredentials", "Saved credentials")}</h3>
        <div class="backend-pi-grid">
          <label class="backend-field">
            <span>{labelText(labels, "piCredentialLabel", "Key label")}</span>
            <input
              class="backend-input"
              data-pi-field="credential-label"
              value={credentialLabel}
              onInput={(event) =>
                setCredentialLabel((event.target as HTMLInputElement).value)
              }
            />
          </label>
          <label class="backend-field">
            <span>{labelText(labels, "piCredentialSecret", "API key")}</span>
            <input
              class="backend-input"
              type="password"
              data-pi-field="credential-secret"
              ref={secretInput}
              autocomplete="off"
            />
          </label>
        </div>
        <button
          type="button"
          class="backend-button"
          data-pi-action="credential-save"
          onClick={() => {
            const secret = secretInput.current?.value || "";
            if (secretInput.current) secretInput.current.value = "";
            if (!credentialLabel.trim() || !secret.trim()) return;
            handlers.putPiCredential({
              id:
                draft.authVariant === "api-key"
                  ? draft.credentialRef || ""
                  : "",
              label: credentialLabel,
              secret,
            });
          }}
        >
          {labelText(labels, "piSaveCredential", "Save API key")}
        </button>
        {value.credentials.map((entry) => (
          <div class="backend-pi-credential-row" key={entry.id}>
            <span>
              {entry.label} ({entry.masked})
            </span>
            {entry.kind === "api-key" ? (
              <button
                type="button"
                class="backend-button danger"
                onClick={() => handlers.deletePiCredential(entry.id)}
              >
                {labelText(labels, "piClearCredential", "Clear")}
              </button>
            ) : null}
          </div>
        ))}
      </section>
      <section class="backend-pi-overlay">
        <h3>{labelText(labels, "piOverlay", "models.yml overlay")}</h3>
        <input
          class="backend-input"
          type="text"
          value={overlayPath}
          onInput={(event) =>
            setOverlayPath((event.target as HTMLInputElement).value)
          }
        />
        <button
          type="button"
          class="backend-button"
          data-pi-action="refresh"
          onClick={() => handlers.refreshPiOverlay(overlayPath)}
        >
          {labelText(labels, "piRefresh", "Import / refresh")}
        </button>
      </section>
      <PiMcpSourcesPanel value={value} labels={labels} handlers={handlers} />
    </section>
  );
}

function PiMcpSourcesPanel(props: {
  value: BackendManagerBuiltinAgentSnapshot;
  labels: BackendManagerLabels;
  handlers: BackendManagerRegionHandlers;
}) {
  const { value, labels, handlers } = props;
  const label = (key: string, fallback: string) =>
    labelText(labels, `mcp${key}`, fallback);
  const [draft, setDraft] = useState<
    import("../../shared/piMcpSourceContract").PiMcpSource
  >({
    id: "",
    label: "",
    transport: "http",
    url: "",
    enabled: true,
    credentialSlots: {},
    selectedTools: {},
  });
  const [slot, setSlot] = useState("");
  const [secretRef, setSecretRef] = useState("");
  const [secret, setSecret] = useState("");
  const [importJson, setImportJson] = useState("");
  const [previewInput, setPreviewInput] = useState("");
  const [importError, setImportError] = useState(false);
  const [approvedOrigins, setApprovedOrigins] = useState<
    Record<string, boolean>
  >({});
  const approvalKey = (source: { id: string; origin: string }) =>
    `${source.id}\n${source.origin}`;
  const patch = (value: Partial<typeof draft>) =>
    setDraft((current) => ({ ...current, ...value }));
  return (
    <section class="backend-pi-credentials" data-pi-mcp-sources>
      <h3>{label("Sources", "MCP Tool Sources")}</h3>
      {value.mcpError ? (
        <div role="alert">
          <span>
            {label("RegistryCorrupt", "MCP source settings are damaged.")}
          </span>
          <button
            type="button"
            class="backend-button danger"
            onClick={() => {
              if (
                window.confirm(
                  label("ResetConfirm", "Delete all MCP source settings?"),
                )
              )
                handlers.resetMcpRegistry();
            }}
          >
            {label("Reset", "Reset sources")}
          </button>
        </div>
      ) : null}
      <div class="backend-pi-grid">
        <label class="backend-field">
          <span>ID</span>
          <input
            class="backend-input"
            data-mcp-field="id"
            value={draft.id}
            onInput={(event) =>
              patch({ id: (event.target as HTMLInputElement).value })
            }
          />
        </label>
        <label class="backend-field">
          <span>{label("Name", "Name")}</span>
          <input
            class="backend-input"
            data-mcp-field="label"
            value={draft.label}
            onInput={(event) =>
              patch({ label: (event.target as HTMLInputElement).value })
            }
          />
        </label>
        <label class="backend-field">
          <span>{label("Transport", "Transport")}</span>
          <select
            class="backend-input"
            value={draft.transport}
            onChange={(event) =>
              patch({
                transport: (event.target as HTMLSelectElement).value as
                  | "http"
                  | "stdio",
                url: undefined,
                executable: undefined,
                argv: [],
                cwd: undefined,
                selectedTools: {},
              })
            }
          >
            <option value="http">Streamable HTTP</option>
            <option value="stdio">stdio</option>
          </select>
        </label>
        {draft.transport === "http" ? (
          <label class="backend-field">
            <span>URL</span>
            <input
              class="backend-input"
              data-mcp-field="url"
              type="url"
              value={draft.url || ""}
              onInput={(event) =>
                patch({ url: (event.target as HTMLInputElement).value })
              }
            />
          </label>
        ) : (
          <>
            <label class="backend-field">
              <span>{label("Executable", "Executable")}</span>
              <input
                class="backend-input"
                value={draft.executable || ""}
                onInput={(event) =>
                  patch({
                    executable: (event.target as HTMLInputElement).value,
                  })
                }
              />
            </label>
            <label class="backend-field">
              <span>{label("Arguments", "Arguments (one per line)")}</span>
              <textarea
                class="backend-input"
                value={(draft.argv || []).join("\n")}
                onInput={(event) =>
                  patch({
                    argv: (event.target as HTMLTextAreaElement).value.split(
                      "\n",
                    ),
                  })
                }
              />
            </label>
            <label class="backend-field">
              <span>{label("Cwd", "Working directory")}</span>
              <input
                class="backend-input"
                value={draft.cwd || ""}
                onInput={(event) =>
                  patch({ cwd: (event.target as HTMLInputElement).value })
                }
              />
            </label>
          </>
        )}
        <label class="backend-field">
          <span>
            {label(
              "Slot",
              "Credential slot (HTTP header / environment variable)",
            )}
          </span>
          <input
            class="backend-input"
            value={slot}
            onInput={(event) =>
              setSlot((event.target as HTMLInputElement).value)
            }
          />
        </label>
        <label class="backend-field">
          <span>{label("SecretId", "Saved credential ID")}</span>
          <input
            class="backend-input"
            value={secretRef}
            onInput={(event) =>
              setSecretRef((event.target as HTMLInputElement).value)
            }
          />
        </label>
        <label class="backend-field">
          <span>
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) =>
                patch({ enabled: (event.target as HTMLInputElement).checked })
              }
            />{" "}
            {label("Enabled", "Enabled")}
          </span>
        </label>
        {draft.transport === "http" && draft.url ? (
          <label class="backend-field">
            <span>
              <input
                type="checkbox"
                checked={!!draft.localNetworkApproval}
                onChange={(event) =>
                  patch({
                    localNetworkApproval: (event.target as HTMLInputElement)
                      .checked
                      ? new URL(draft.url || "").origin
                      : undefined,
                  })
                }
              />{" "}
              {label("LocalNetwork", "Allow local network endpoint")}
            </span>
          </label>
        ) : null}
        {draft.transport === "http" && draft.url?.startsWith("http:") ? (
          <label class="backend-field">
            <span>
              <input
                type="checkbox"
                checked={!!draft.cleartextApproval}
                onChange={(event) =>
                  patch({
                    cleartextApproval: (event.target as HTMLInputElement)
                      .checked
                      ? new URL(draft.url || "").origin
                      : undefined,
                  })
                }
              />{" "}
              {label("Cleartext", "Allow cleartext private endpoint")}
            </span>
          </label>
        ) : null}
      </div>
      <button
        type="button"
        class="backend-button"
        data-mcp-action="save-source"
        onClick={() =>
          handlers.upsertMcpSource({
            ...draft,
            credentialSlots:
              slot && secretRef ? { [slot]: secretRef } : draft.credentialSlots,
          })
        }
      >
        {label("SaveSource", "Save source")}
      </button>
      <div class="backend-pi-grid">
        <label class="backend-field">
          <span>{label("SecretId", "Secret ID")}</span>
          <input
            class="backend-input"
            value={secretRef}
            onInput={(event) =>
              setSecretRef((event.target as HTMLInputElement).value)
            }
          />
        </label>
        <label class="backend-field">
          <span>{label("Secret", "Secret")}</span>
          <input
            class="backend-input"
            type="password"
            autocomplete="off"
            value={secret}
            onInput={(event) =>
              setSecret((event.target as HTMLInputElement).value)
            }
          />
        </label>
      </div>
      <button
        type="button"
        class="backend-button"
        onClick={() => {
          handlers.putMcpSecret(secretRef, secretRef, secret);
          setSecret("");
        }}
      >
        {label("SaveSecret", "Save secret")}
      </button>
      {value.mcpCredentials.map((entry) => (
        <div class="backend-pi-credential-row" key={entry.id}>
          <span>
            {entry.label} ({entry.masked})
          </span>
          <button
            type="button"
            class="backend-button danger"
            onClick={() => handlers.deleteMcpSecret(entry.id)}
          >
            {label("Clear", "Clear")}
          </button>
        </div>
      ))}
      {value.mcpSources.map((source) => (
        <div class="backend-pi-credential-row" key={source.id}>
          <strong>{source.label}</strong>
          <span>
            {source.transport === "http" ? source.url : source.executable}
          </span>
          <button
            type="button"
            class="backend-button"
            onClick={() => {
              setDraft(source);
              const entry = Object.entries(source.credentialSlots)[0];
              setSlot(entry?.[0] || "");
              setSecretRef(entry?.[1] || "");
            }}
          >
            {label("Edit", "Edit")}
          </button>
          <button
            type="button"
            class="backend-button"
            onClick={() => handlers.testMcpSource(source.id)}
          >
            {label("Test", "Test / discover")}
          </button>
          <button
            type="button"
            class="backend-button danger"
            onClick={() => handlers.deleteMcpSource(source.id)}
          >
            {label("Delete", "Delete")}
          </button>
          {(value.mcpDiscovered[source.id] || []).map((tool) => (
            <div key={tool.name}>
              <span>
                {tool.name}: {tool.description || ""}
              </span>
              <label>
                <input
                  type="checkbox"
                  checked={
                    source.selectedTools[tool.name]?.digest === tool.digest
                  }
                  onChange={(event) =>
                    (event.target as HTMLInputElement).checked
                      ? handlers.reviewMcpTool(
                          source.id,
                          tool.name,
                          tool.digest,
                          false,
                        )
                      : handlers.unreviewMcpTool(source.id, tool.name)
                  }
                />{" "}
                {label("Select", "Select")}
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={!!source.selectedTools[tool.name]?.promoted}
                  disabled={
                    source.selectedTools[tool.name]?.digest !== tool.digest
                  }
                  onChange={(event) =>
                    handlers.reviewMcpTool(
                      source.id,
                      tool.name,
                      tool.digest,
                      (event.target as HTMLInputElement).checked,
                    )
                  }
                />{" "}
                {label("Direct", "Direct")}
              </label>
            </div>
          ))}
        </div>
      ))}
      <label class="backend-field">
        <span>{label("Import", "Import .mcp.json")}</span>
        <input
          type="file"
          accept=".json,application/json"
          onChange={async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) return;
            setPreviewInput("");
            setApprovedOrigins({});
            if (file.size > 1024 * 1024) {
              setImportJson("");
              setImportError(true);
              return;
            }
            try {
              setImportJson(await file.text());
              setImportError(false);
            } catch {
              setImportJson("");
              setImportError(true);
            }
          }}
        />
        <textarea
          class="backend-input"
          value={importJson}
          onInput={(event) =>
            setImportJson((event.target as HTMLTextAreaElement).value)
          }
        />
      </label>
      {importError ? (
        <span role="alert">
          {label(
            "ImportReadFailed",
            "Could not read this file (limit: 1 MiB).",
          )}
        </span>
      ) : null}
      <button
        type="button"
        class="backend-button"
        onClick={() => {
          setPreviewInput(importJson);
          setApprovedOrigins({});
          handlers.previewMcpJson(importJson);
        }}
      >
        {label("Preview", "Preview import")}
      </button>
      {value.mcpImportPreview && previewInput === importJson ? (
        <div>
          <span>
            {value.mcpImportPreview.sources
              .map(
                (source) =>
                  `${source.id} (${source.transport}: ${source.endpoint}${source.localNetwork ? `, ${label("LocalNetwork", "Allow local network endpoint")}` : ""}${source.cleartext ? `, ${label("Cleartext", "Allow cleartext private endpoint")}` : ""})`,
              )
              .join(", ")}
            ; {value.mcpImportPreview.secretSlots.length}{" "}
            {label("SecretSlots", "secret slots")}
          </span>
          {value.mcpImportPreview.sources
            .filter((source) => source.localNetwork)
            .map((source) => (
              <label key={approvalKey(source)}>
                <input
                  type="checkbox"
                  checked={!!approvedOrigins[approvalKey(source)]}
                  onChange={(event) =>
                    setApprovedOrigins((current) => ({
                      ...current,
                      [approvalKey(source)]: (event.target as HTMLInputElement)
                        .checked,
                    }))
                  }
                />{" "}
                {source.id}: {source.origin} —{" "}
                {label("LocalNetwork", "Allow local network endpoint")}
                {source.cleartext
                  ? `; ${label("Cleartext", "Allow cleartext private endpoint")}`
                  : ""}
              </label>
            ))}
          <button
            type="button"
            class="backend-button"
            disabled={value.mcpImportPreview.sources.some(
              (source) =>
                source.localNetwork && !approvedOrigins[approvalKey(source)],
            )}
            onClick={() => {
              handlers.importMcpJson(
                previewInput,
                value
                  .mcpImportPreview!.sources.filter(
                    (source) =>
                      source.localNetwork &&
                      approvedOrigins[approvalKey(source)],
                  )
                  .map((source) => ({
                    sourceId: source.id,
                    origin: source.origin,
                    cleartext: source.cleartext,
                  })),
              );
              setImportJson("");
              setPreviewInput("");
            }}
          >
            {label("ConfirmImport", "Import")}
          </button>
        </div>
      ) : null}
      <button
        type="button"
        class="backend-button"
        onClick={() => handlers.exportMcpJson()}
      >
        {label("Export", "Export template")}
      </button>
    </section>
  );
}

export const BackendManagerBodyRegion = memo(function BackendManagerBodyRegion(
  props: RegionProps<BackendManagerBodySelection>,
) {
  const { selection, handlers } = props;
  const { labels } = selection;
  return (
    <section
      class="backend-manager-body"
      data-zs-role="backend-manager-body"
      onScroll={(event) =>
        handlers.reportBodyScroll((event.target as HTMLElement).scrollTop)
      }
    >
      {selection.builtinAgent ? (
        <PiConfigurationPanel
          value={selection.builtinAgent}
          labels={labels}
          handlers={handlers}
        />
      ) : (
        <section class="backend-provider-section">
          <header class="backend-provider-header">
            <h2 class="backend-provider-title">{selection.providerTitle}</h2>
            <div class="backend-provider-actions">
              {selection.providerType === "acp" ? (
                <button
                  type="button"
                  class="backend-button"
                  onClick={() => handlers.openAcpPresetDialog()}
                >
                  {labelText(labels, "addAcpPreset", "Add ACP Preset")}
                </button>
              ) : null}
              {selection.providerType === "generic-http" &&
              selection.hasGenericHttpPresets ? (
                <button
                  type="button"
                  class="backend-button"
                  onClick={() => handlers.openGenericHttpPresetDialog()}
                >
                  {labelText(
                    labels,
                    "addGenericHttpPreset",
                    "Add Generic HTTP Preset",
                  )}
                </button>
              ) : null}
              <button
                type="button"
                class="backend-button"
                onClick={() => handlers.addRow()}
              >
                {providerAddLabel(labels, {
                  type: selection.providerType,
                  label: selection.providerLabel,
                })}
              </button>
            </div>
          </header>
          <div class="backend-provider-rows">
            {selection.rows.length === 0 ? (
              <p class="backend-empty">
                {labelText(labels, "noProfiles", "No profiles configured.")}
              </p>
            ) : (
              selection.rows.map((entry) =>
                entry.row.type === "acp" ? (
                  <AcpRow
                    key={entry.index}
                    labels={labels}
                    entry={entry}
                    handlers={handlers}
                  />
                ) : (
                  <HttpRow
                    key={entry.index}
                    labels={labels}
                    entry={entry}
                    handlers={handlers}
                  />
                ),
              )
            )}
          </div>
        </section>
      )}
    </section>
  );
}, regionEqual);

export const BackendManagerFooterRegion = memo(
  function BackendManagerFooterRegion(
    props: RegionProps<BackendManagerFooterSelection>,
  ) {
    const { selection, handlers } = props;
    const { labels, status } = selection;
    return (
      <footer class="backend-footer">
        <div
          class="backend-footer-status"
          role="status"
          aria-live="polite"
          data-tone={status && status.text ? status.tone || "info" : undefined}
        >
          {status && status.text ? status.text : ""}
        </div>
        <div class="backend-footer-actions">
          <button
            type="button"
            class="backend-button"
            onClick={() => handlers.cancel()}
          >
            {labelText(labels, "cancel", "Cancel")}
          </button>
          {selection.showProfileSave !== false ? (
            <button
              type="button"
              class="backend-button primary"
              onClick={() => handlers.save()}
            >
              {labelText(labels, "save", "Save")}
            </button>
          ) : null}
        </div>
      </footer>
    );
  },
  regionEqual,
);

// ---------------------------------------------------------------------------
// ACP preset dialog
// ---------------------------------------------------------------------------

function inferPathSeparator(pathValue: string): string {
  return String(pathValue || "").indexOf("\\") >= 0 ? "\\" : "/";
}

function joinPreviewPath(root: string, child: string): string {
  const base = String(root || "").replace(/[\\/]+$/g, "");
  if (!base) return String(child || "");
  return base + inferPathSeparator(base) + String(child || "");
}

function buildAcpPresetProfileId(
  preset: BackendManagerAcpPreset,
  useNpx: boolean,
  isolated: boolean,
): string {
  const suffixes: string[] = [];
  if (useNpx) suffixes.push("npx");
  if (isolated) suffixes.push("isolated");
  return "acp-" + preset.id + (suffixes.length ? "-" + suffixes.join("-") : "");
}

function buildAcpPresetDisplayName(
  preset: BackendManagerAcpPreset,
  useNpx: boolean,
  isolated: boolean,
): string {
  let displayName = String((preset && preset.label) || "");
  if (useNpx) displayName += " (npm)";
  if (isolated) displayName += useNpx ? "(Isolated)" : " (Isolated)";
  return displayName;
}

function hasAcpPresetIsolation(preset: BackendManagerAcpPreset): boolean {
  return !!(
    preset &&
    preset.isolation &&
    (preset.isolation.envKey ||
      (Array.isArray(preset.isolation.env) && preset.isolation.env.length) ||
      (Array.isArray(preset.isolation.args) && preset.isolation.args.length))
  );
}

function buildAcpPresetIsolationEnv(
  preset: BackendManagerAcpPreset,
  isolatedPath: string,
): BackendManagerEnvDraftItem[] {
  if (!preset || !preset.isolation) {
    return [];
  }
  const entries: BackendManagerEnvDraftItem[] = [];
  if (preset.isolation.envKey) {
    entries.push({
      key: preset.isolation.envKey,
      value: isolatedPath,
    });
  }
  if (Array.isArray(preset.isolation.env)) {
    preset.isolation.env.forEach((rule) => {
      const key = String((rule && rule.key) || "").trim();
      if (!key) return;
      entries.push({
        key,
        value: rule.pathSuffix
          ? joinPreviewPath(isolatedPath, rule.pathSuffix)
          : isolatedPath,
      });
    });
  }
  return entries;
}

function buildAcpPresetDefaultEnv(
  preset: BackendManagerAcpPreset,
): BackendManagerEnvDraftItem[] {
  const env = (preset && preset.defaultEnv) || {};
  return Object.keys(env).reduce<BackendManagerEnvDraftItem[]>(
    (entries, key) => {
      const normalizedKey = String(key || "").trim();
      if (!normalizedKey) return entries;
      entries.push({
        key: normalizedKey,
        value: String(env[key] ?? ""),
      });
      return entries;
    },
    [],
  );
}

function buildAcpPresetIsolationArgs(
  preset: BackendManagerAcpPreset,
  isolatedPath: string,
): string[] {
  if (!preset || !preset.isolation || !Array.isArray(preset.isolation.args)) {
    return [];
  }
  return preset.isolation.args.reduce<string[]>((entries, rule) => {
    const flag = String((rule && rule.flag) || "").trim();
    if (!flag) return entries;
    entries.push(
      flag,
      rule.pathSuffix
        ? joinPreviewPath(isolatedPath, rule.pathSuffix)
        : isolatedPath,
    );
    return entries;
  }, []);
}

function buildAcpPresetNpxArgs(
  preset: BackendManagerAcpPreset,
  isolationArgs: string[],
): string[] {
  const rest = [preset.npxPackage]
    .concat(preset.npxArgs || [], isolationArgs)
    .filter(Boolean) as string[];
  return rest.some((entry) => entry === "-y" || entry === "--yes")
    ? rest
    : ["-y"].concat(rest);
}

type AcpPresetPreview = {
  preset: BackendManagerAcpPreset;
  internalId: string;
  displayName: string;
  command: string;
  args: string[];
  env: BackendManagerEnvDraftItem[];
  agentFamily: string;
  useNpx: boolean;
  isolated: boolean;
  isolatedPath: string;
};

function buildAcpPresetPreview(
  selection: BackendManagerAcpDialogSelection,
): AcpPresetPreview | null {
  const dialog = selection.dialog;
  const preset =
    selection.presets.find((entry) => entry.id === dialog.selectedPresetId) ||
    selection.presets[0];
  if (!preset) return null;
  const useNpx = !!(
    dialog.useNpx &&
    preset.supportsNpx &&
    !selection.npxUnavailable
  );
  const isolated = !!(dialog.isolated && hasAcpPresetIsolation(preset));
  const internalId = buildAcpPresetProfileId(preset, useNpx, isolated);
  const isolatedPath = isolated
    ? joinPreviewPath(selection.isolationRoot, internalId)
    : "";
  const env = buildAcpPresetDefaultEnv(preset).concat(
    isolated ? buildAcpPresetIsolationEnv(preset, isolatedPath) : [],
  );
  const isolationArgs = isolated
    ? buildAcpPresetIsolationArgs(preset, isolatedPath)
    : [];
  return {
    preset,
    internalId,
    displayName: buildAcpPresetDisplayName(preset, useNpx, isolated),
    command: useNpx ? "npx" : preset.bareCommand,
    args: useNpx
      ? buildAcpPresetNpxArgs(preset, isolationArgs)
      : (preset.bareArgs || []).concat(isolationArgs),
    env,
    agentFamily: preset.agentFamily,
    useNpx,
    isolated,
    isolatedPath,
  };
}

function PreviewValue(props: { label: string; value: string }) {
  return (
    <div class="backend-preset-preview-row">
      <span class="backend-preset-preview-label">{props.label}</span>
      <code class="backend-preset-preview-value">{props.value || "-"}</code>
    </div>
  );
}

export const BackendManagerAcpPresetDialogRegion = memo(
  function BackendManagerAcpPresetDialogRegion(
    props: RegionProps<BackendManagerAcpDialogSelection>,
  ) {
    const { selection, handlers } = props;
    const { labels } = selection;
    const title = labelText(
      labels,
      "acpPresetDialogTitle",
      "Add ACP Profile from Preset",
    );
    const preview = buildAcpPresetPreview(selection);
    return (
      <div class="backend-preset-modal">
        <section
          class="backend-preset-panel"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <header class="backend-preset-panel-header">
            <h2 class="backend-preset-panel-title">{title}</h2>
          </header>
          <div class="backend-preset-panel-body">
            <nav class="backend-preset-selector">
              {selection.presets.map((preset) => {
                const selected =
                  !!preview && preset.id === selection.dialog.selectedPresetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    class={`backend-button backend-preset-selector-item${selected ? " is-active" : ""}`}
                    aria-pressed={selected ? "true" : "false"}
                    onClick={() => handlers.selectAcpDialogPreset(preset.id)}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </nav>
            <div class="backend-preset-detail">
              {preview ? (
                <div class="backend-preset-options">
                  <CheckboxField
                    label={labelText(labels, "acpPresetUseNpx", "Use npx")}
                    checked={preview.useNpx}
                    disabled={
                      !preview.preset.supportsNpx || selection.npxUnavailable
                    }
                    onChange={(checked) => handlers.setAcpDialogUseNpx(checked)}
                  />
                  <CheckboxField
                    label={labelText(
                      labels,
                      "acpPresetIsolated",
                      "Isolated environment",
                    )}
                    checked={preview.isolated}
                    disabled={!hasAcpPresetIsolation(preview.preset)}
                    onChange={(checked) =>
                      handlers.setAcpDialogIsolated(checked)
                    }
                  />
                </div>
              ) : null}
              {preview && (preview.useNpx || selection.npxUnavailable) ? (
                <p class="backend-preset-note">
                  {labelText(
                    labels,
                    "acpPresetNpxWarning",
                    "Requires Node.js and npm.",
                  )}{" "}
                  <a
                    class="backend-preset-note-link"
                    href="https://nodejs.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handlers.openNodejsDownload();
                    }}
                  >
                    {labelText(labels, "acpPresetNodeLink", "Get Node.js")}
                  </a>
                </p>
              ) : null}
              {preview && preview.isolated && preview.isolatedPath ? (
                <p class="backend-preset-note warning">
                  {labelText(
                    labels,
                    "acpPresetIsolationWarning",
                    "Using an isolated environment requires configuring and authenticating the agent in { $path }. Do not enable this if you are unsure.",
                  ).replace(/\{\s*\$path\s*\}/g, preview.isolatedPath)}
                </p>
              ) : null}
              {preview ? (
                <div class="backend-preset-preview" aria-readonly="true">
                  <PreviewValue
                    label={labelText(labels, "profileId", "Profile ID")}
                    value={preview.internalId}
                  />
                  <PreviewValue
                    label={labelText(labels, "displayName", "Display Name")}
                    value={preview.displayName}
                  />
                  <PreviewValue
                    label={labelText(labels, "command", "Command")}
                    value={preview.command}
                  />
                  <PreviewValue
                    label={labelText(labels, "args", "Args")}
                    value={preview.args.length ? preview.args.join(" ") : "-"}
                  />
                  <PreviewValue
                    label={labelText(labels, "env", "Env")}
                    value={
                      preview.env.length
                        ? preview.env
                            .map((entry) => entry.key + "=" + entry.value)
                            .join("\n")
                        : "-"
                    }
                  />
                  <PreviewValue
                    label={labelText(labels, "agentFamily", "Agent Family")}
                    value={preview.agentFamily}
                  />
                </div>
              ) : null}
            </div>
          </div>
          <footer class="backend-preset-panel-footer">
            <button
              type="button"
              class="backend-button"
              onClick={() => handlers.cancelAcpDialog()}
            >
              {labelText(labels, "cancel", "Cancel")}
            </button>
            <button
              type="button"
              class="backend-button primary"
              disabled={!preview}
              onClick={() => {
                if (!preview) return;
                handlers.confirmAcpDialog({
                  presetId: preview.preset.id,
                  useNpx: preview.useNpx,
                  isolated: preview.isolated,
                });
              }}
            >
              {labelText(labels, "confirm", "Confirm")}
            </button>
          </footer>
        </section>
      </div>
    );
  },
  regionEqual,
);

// ---------------------------------------------------------------------------
// Generic HTTP preset dialog
// ---------------------------------------------------------------------------

type GenericHttpPresetPreview = {
  preset: BackendManagerGenericHttpPreset;
  internalId: string;
  displayName: string;
  baseUrl: string;
  authKind: string;
  authTokenPlaceholder: string;
  timeoutMs: string;
  note: { text: string; linkText: string; linkUrl: string } | null;
};

function buildGenericHttpPresetPreview(
  selection: BackendManagerGenericHttpDialogSelection,
): GenericHttpPresetPreview | null {
  const dialog = selection.dialog;
  const preset =
    selection.presets.find((entry) => entry.id === dialog.selectedPresetId) ||
    selection.presets[0];
  if (!preset) return null;
  return {
    preset,
    internalId: preset.id,
    displayName: preset.displayName,
    baseUrl: preset.baseUrl,
    authKind: preset.authKind || "none",
    authTokenPlaceholder: preset.authTokenPlaceholder || "",
    timeoutMs: preset.timeoutMs || "",
    note: preset.note || null,
  };
}

export const BackendManagerGenericHttpPresetDialogRegion = memo(
  function BackendManagerGenericHttpPresetDialogRegion(
    props: RegionProps<BackendManagerGenericHttpDialogSelection>,
  ) {
    const { selection, handlers } = props;
    const { labels } = selection;
    const title = labelText(
      labels,
      "genericHttpPresetDialogTitle",
      "Add Generic HTTP Profile from Preset",
    );
    const preview = buildGenericHttpPresetPreview(selection);
    return (
      <div class="backend-preset-modal">
        <section
          class="backend-preset-panel"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <header class="backend-preset-panel-header">
            <h2 class="backend-preset-panel-title">{title}</h2>
          </header>
          <div class="backend-preset-panel-body">
            <nav class="backend-preset-selector">
              {selection.presets.map((preset) => {
                const selected =
                  !!preview && preset.id === selection.dialog.selectedPresetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    class={`backend-button backend-preset-selector-item${selected ? " is-active" : ""}`}
                    aria-pressed={selected ? "true" : "false"}
                    onClick={() =>
                      handlers.selectGenericHttpDialogPreset(preset.id)
                    }
                  >
                    {preset.displayName}
                  </button>
                );
              })}
            </nav>
            <div class="backend-preset-detail">
              {preview && preview.note && preview.note.text ? (
                <p class="backend-preset-note">
                  {preview.note.text}
                  {preview.note.linkUrl ? (
                    <span>
                      {" "}
                      <a
                        class="backend-preset-note-link"
                        href={preview.note.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handlers.openPresetLink(preview.note!.linkUrl);
                        }}
                      >
                        {preview.note.linkText || preview.note.linkUrl}
                      </a>
                    </span>
                  ) : null}
                </p>
              ) : null}
              {preview ? (
                <div class="backend-preset-preview" aria-readonly="true">
                  <PreviewValue
                    label={labelText(labels, "profileId", "Profile ID")}
                    value={preview.internalId}
                  />
                  <PreviewValue
                    label={labelText(labels, "displayName", "Display Name")}
                    value={preview.displayName}
                  />
                  <PreviewValue
                    label={labelText(labels, "baseUrl", "Base URL")}
                    value={preview.baseUrl}
                  />
                  <PreviewValue
                    label={labelText(labels, "auth", "Auth")}
                    value={preview.authKind}
                  />
                  <PreviewValue
                    label={labelText(labels, "token", "Token")}
                    value={preview.authTokenPlaceholder || "-"}
                  />
                  <PreviewValue
                    label={labelText(labels, "timeoutMs", "Timeout(ms)")}
                    value={preview.timeoutMs || "-"}
                  />
                </div>
              ) : null}
            </div>
          </div>
          <footer class="backend-preset-panel-footer">
            <button
              type="button"
              class="backend-button"
              onClick={() => handlers.cancelGenericHttpDialog()}
            >
              {labelText(labels, "cancel", "Cancel")}
            </button>
            <button
              type="button"
              class="backend-button primary"
              disabled={!preview}
              onClick={() => {
                if (!preview) return;
                handlers.confirmGenericHttpDialog(preview.preset.id);
              }}
            >
              {labelText(labels, "confirm", "Confirm")}
            </button>
          </footer>
        </section>
      </div>
    );
  },
  regionEqual,
);
