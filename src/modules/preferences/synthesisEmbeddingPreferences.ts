import { config } from "../../../package.json";
import { canonicalizeSynthesisContractJson } from "../../../packages/synthesis-contracts/src";
import type {
  SynthesisRetrievalConnection,
  SynthesisRetrievalProtocol,
  SynthesisRetrievalScope,
} from "../../../packages/synthesis-contracts/src";
import { getStringOrFallback } from "../../utils/locale";
import {
  personalRetrievalScope,
  type SynthesisEmbeddingPrefsStatus,
} from "../synthesis/synthesisEmbeddingPrefs";
import type { SynthesisEmbeddingPreset } from "../synthesis/synthesisEmbeddingProvider";
import {
  getSynthesisEmbeddingEncodingOptionsKey,
  resolveSynthesisEmbeddingEndpoints,
  synthesisEmbeddingRequestUrl,
} from "../synthesis/synthesisEmbeddingProtocol";

type Draft = SynthesisRetrievalConnection & {
  persisted?: boolean;
  endpointDirty?: boolean;
  embeddingUrlExplicit?: boolean;
  discoveryProtocolExplicit?: boolean;
  authExplicit?: boolean;
  modified?: boolean;
  credentialConfigured?: boolean;
  credentialUpdatedAt?: string;
};

type HookResult = {
  ok?: boolean;
  status?: SynthesisEmbeddingPrefsStatus;
  diagnostics?: Array<{ code?: string; message?: string }>;
  test?: {
    ok?: boolean;
    dimensions?: number;
    latency_ms?: number;
    tested_at?: string;
    max_concurrency?: 1 | 2;
    performance?: NonNullable<
      SynthesisEmbeddingPrefsStatus["connectionTest"]
    >["performance"];
    diagnostics?: Array<{ code?: string; message?: string }>;
  };
};

type Compatibility = "compatible" | "incompatible" | "unknown";

const PROTOCOLS: SynthesisRetrievalProtocol[] = [
  "openai",
  "ollama",
  "tei",
  "cohere",
  "voyage",
  "gemini",
];
const LOCAL = (
  key: string,
  fallback: string,
  args?: Record<string, unknown>,
) => getStringOrFallback(key, fallback, { args });

const defaultAuth = (protocol: SynthesisRetrievalProtocol) =>
  protocol === "gemini"
    ? { type: "header" as const, headerName: "x-goog-api-key" }
    : { type: "bearer" as const };
const defaultDiscovery = (protocol: SynthesisRetrievalProtocol) =>
  protocol === "voyage" ? "none" : protocol;

let nextDraftId = 0;
function draftId() {
  const uuid = (
    globalThis as { crypto?: { randomUUID?: () => string } }
  ).crypto?.randomUUID?.();
  return `embedding-${uuid || `${Date.now().toString(36)}-${++nextDraftId}`}`;
}

/** Binds the Synthesis embedding editor without changing any other preference row. */
export function bindSynthesisEmbeddingPreferences(window: Window) {
  const doc = window.document;
  const query = <T>(suffix: string) =>
    doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-retrieval-${suffix}`,
    ) as T | null;
  const connectionsSelect = query<XUL.MenuList>("connections");
  const saveButton = query<XUL.Button>("save");
  if (!connectionsSelect || !saveButton) return () => {};

  const enabled = query<HTMLInputElement>("enabled");
  const addButton = query<XUL.Button>("add");
  const deleteButton = query<XUL.Button>("delete");
  const primarySelect = query<XUL.MenuList>("primary");
  const fallbacksSelect = query<XUL.MenuList>("fallbacks");
  const fallbackAdd = query<XUL.Button>("fallback-add");
  const fallbackRemove = query<XUL.Button>("fallback-remove");
  const fallbackUp = query<XUL.Button>("fallback-up");
  const fallbackDown = query<XUL.Button>("fallback-down");
  const presetSelect = query<XUL.MenuList>("preset");
  const name = query<HTMLInputElement>("name");
  const protocol = query<XUL.MenuList>("protocol");
  const baseUrl = query<HTMLInputElement>("base-url");
  const model = query<HTMLInputElement>("model");
  const discoverButton = query<XUL.Button>("discover");
  const modelPopup = query<XUL.MenuPopup>("model-popup");
  const modelToggle = query<XUL.Button>("model-toggle");
  const credential = query<HTMLInputElement>("credential");
  const clearCredential = query<XUL.Button>("clear-credential");
  const embeddingUrl = query<HTMLInputElement>("embedding-url");
  const discoveryProtocol = query<XUL.MenuList>("discovery-protocol");
  const discoveryUrl = query<HTMLInputElement>("discovery-url");
  const authType = query<XUL.MenuList>("auth-type");
  const headerName = query<HTMLInputElement>("header-name");
  const dimensions = query<HTMLInputElement>("dimensions");
  const queryPrefix = query<HTMLTextAreaElement>("query-prefix");
  const documentPrefix = query<HTMLTextAreaElement>("document-prefix");
  const parameters = query<HTMLTextAreaElement>("parameters");
  const preview = query<HTMLElement>("preview");
  const sourceMetadata = query<HTMLInputElement>("source-metadata");
  const sourceFulltext = query<HTMLInputElement>("source-fulltext");
  const sourceAnalysis = query<HTMLInputElement>("source-analysis");
  const includeTopics = query<HTMLInputElement>("include-topics");
  const saveTestButton = query<XUL.Button>("save-test");
  const statusText = query<HTMLElement>("status");
  const performanceText = query<HTMLElement>("performance-status");

  const cleanups: Array<() => void> = [];
  const drafts = new Map<string, Draft>();
  const clearingOwners = new Set<string>();
  const savingOwners = new Set<string>();
  let presets: SynthesisEmbeddingPreset[] = [];
  let selectedId = "";
  let primaryId: string | null = null;
  let fallbackIds: string[] = [];
  let revision = 0;
  let discoveryRevision = -1;
  let inspectRevision = -1;
  let activeModel: Element | null = null;
  let disposed = false;

  const listen = (
    target: EventTarget | null,
    type: string,
    handler: EventListener,
  ) => {
    if (!target) return;
    target.addEventListener(type, handler);
    cleanups.push(() => target.removeEventListener(type, handler));
  };
  const call = (type: string, data: Record<string, unknown> = {}) =>
    addon.hooks.onPrefsEvent(type, { ...data, window }) as Promise<any>;
  const setStatus = (value: string) => {
    if (!disposed && statusText) statusText.textContent = value;
  };
  const diagnosticText = (result: HookResult | null) => {
    const entries = [
      ...(Array.isArray(result?.test?.diagnostics)
        ? result.test.diagnostics
        : []),
      ...(Array.isArray(result?.diagnostics) ? result.diagnostics : []),
      ...(Array.isArray((result?.status as any)?.diagnostics)
        ? (result!.status as any).diagnostics
        : []),
    ];
    return entries
      .map((entry) => String(entry?.message || entry?.code || "").trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(" ");
  };
  const current = () => drafts.get(selectedId);
  const menuPopup = (menu: XUL.MenuList | null) =>
    menu ? doc.getElementById(`${menu.id}-popup`) : null;
  const clear = (element: Element | null) => {
    if (!element) return;
    while (element.firstChild) element.removeChild(element.firstChild);
  };
  const option = (value: string, label: string) => {
    const entry = doc.createXULElement("menuitem") as XUL.MenuItem;
    entry.setAttribute("value", value);
    entry.setAttribute("label", label);
    entry.value = value;
    return entry;
  };
  const clearModels = () => {
    activateModel(null);
    modelPopup?.hidePopup?.();
    clear(modelPopup);
    if (modelToggle) modelToggle.disabled = true;
    model?.setAttribute("aria-expanded", "false");
  };
  const activateModel = (entry: Element | null) => {
    activeModel?.removeAttribute("aria-selected");
    activeModel = entry;
    if (entry) {
      entry.setAttribute("aria-selected", "true");
      model?.setAttribute("aria-activedescendant", entry.id);
      entry.scrollIntoView?.({ block: "nearest" });
    } else model?.removeAttribute("aria-activedescendant");
  };
  const filterModels = (showAll = false) => {
    activateModel(null);
    const needle = showAll ? "" : model?.value.toLocaleLowerCase() || "";
    for (const entry of Array.from(modelPopup?.children || [])) {
      (entry as XUL.MenuItem).hidden =
        !`${entry.getAttribute("value")} ${entry.getAttribute("label")}`
          .toLocaleLowerCase()
          .includes(needle);
    }
  };
  const openModels = (showAll = false) => {
    filterModels(showAll);
    if (!modelPopup || !model) return;
    if (
      !Array.from(modelPopup.children).some(
        (entry) => !(entry as XUL.MenuItem).hidden,
      )
    ) {
      modelPopup.hidePopup();
      return;
    }
    modelPopup.style.minWidth = `${model.getBoundingClientRect().width}px`;
    if (modelPopup.state !== "open")
      modelPopup.openPopup(model, "after_start", 0, 0, false, false);
  };
  const connectionLabel = (connection: Draft) =>
    String(connection.name || connection.modelId || connection.id);

  const compatibility = (connection: Draft): Compatibility | null => {
    const primary = primaryId ? drafts.get(primaryId) : undefined;
    if (!primary) return null;
    const optionsKey = (value: Draft) => {
      try {
        return getSynthesisEmbeddingEncodingOptionsKey(value) ?? "";
      } catch {
        return "invalid";
      }
    };
    if (
      primary.modelId !== connection.modelId ||
      primary.queryPrefix !== connection.queryPrefix ||
      primary.documentPrefix !== connection.documentPrefix ||
      optionsKey(primary) !== optionsKey(connection)
    ) {
      return "incompatible";
    }
    if (
      primary.dimensions === undefined ||
      connection.dimensions === undefined
    ) {
      return "unknown";
    }
    return primary.dimensions === connection.dimensions
      ? "compatible"
      : "incompatible";
  };
  const compatibilityLabel = (entry: Compatibility) =>
    entry === "compatible"
      ? LOCAL("pref-retrieval-compatible", "Compatible")
      : entry === "incompatible"
        ? LOCAL("pref-retrieval-incompatible", "Incompatible")
        : LOCAL(
            "pref-retrieval-compatibility-unknown",
            "Compatibility unknown",
          );

  const connectionFromFields = (): SynthesisRetrievalConnection | null => {
    const draft = current();
    if (!draft) return null;
    const explicitUrl = draft.embeddingUrlExplicit
      ? embeddingUrl?.value.trim() || ""
      : "";
    return {
      id: draft.id,
      name: name?.value || "",
      protocol: PROTOCOLS.includes(
        protocol?.value as SynthesisRetrievalProtocol,
      )
        ? (protocol!.value as SynthesisRetrievalProtocol)
        : "openai",
      baseUrl: baseUrl?.value.trim() || "",
      modelId: model?.value.trim() || "",
      queryPrefix: queryPrefix?.value || "",
      documentPrefix: documentPrefix?.value || "",
      discovery: {
        protocol: (discoveryProtocol?.value ||
          defaultDiscovery(draft.protocol)) as NonNullable<
          SynthesisRetrievalConnection["discovery"]
        >["protocol"],
        ...(discoveryUrl?.value.trim()
          ? { url: discoveryUrl.value.trim() }
          : {}),
      },
      auth: {
        type: (authType?.value || "none") as NonNullable<
          SynthesisRetrievalConnection["auth"]
        >["type"],
        ...(authType?.value === "header" && headerName?.value.trim()
          ? { headerName: headerName.value.trim() }
          : {}),
      },
      ...(explicitUrl ? { embeddingUrl: explicitUrl } : {}),
    };
  };

  const draftEndpoints = (connection: SynthesisRetrievalConnection) => {
    const draft = current()!;
    const resolved = resolveSynthesisEmbeddingEndpoints(connection);
    if (
      draft.persisted &&
      !draft.endpointDirty &&
      !draft.embeddingUrlExplicit
    ) {
      const url =
        draft.embeddingUrl || synthesisEmbeddingRequestUrl(connection);
      return resolveSynthesisEmbeddingEndpoints({
        ...connection,
        embeddingUrl: url,
      });
    }
    return resolved;
  };

  const updatePreset = () => {
    if (!presetSelect) return;
    const normalize = (connection: SynthesisRetrievalConnection) => {
      let endpoints;
      let base = connection.baseUrl.trim();
      try {
        base = new URL(base).toString();
        endpoints = resolveSynthesisEmbeddingEndpoints(connection);
      } catch {
        endpoints = {
          embeddingUrl: connection.embeddingUrl || "",
          discoveryUrl: connection.discovery?.url || "",
          discoveryProtocol:
            connection.discovery?.protocol ||
            defaultDiscovery(connection.protocol),
        };
      }
      return canonicalizeSynthesisContractJson({
        protocol: connection.protocol,
        baseUrl: base,
        ...endpoints,
        modelId: connection.modelId,
        dimensions: connection.dimensions ?? null,
        queryPrefix: connection.queryPrefix || "",
        documentPrefix: connection.documentPrefix || "",
        auth: connection.auth || defaultAuth(connection.protocol),
        parameters: connection.parameters || {},
      });
    };
    try {
      const connection = connectionFromFields();
      if (!connection) {
        presetSelect.value = "";
        return;
      }
      const value = normalize({
        ...connection,
        ...(dimensions?.value.trim()
          ? { dimensions: Number(dimensions.value) }
          : {}),
        parameters: parseParameters(),
      });
      presetSelect.value =
        presets.find(
          (preset) =>
            normalize({
              ...preset.connection,
              id: "",
              name: "",
            }) === value,
        )?.id || "";
    } catch {
      presetSelect.value = "";
    }
  };

  const renderPreview = () => {
    const draft = current();
    const connection = connectionFromFields();
    let value = "";
    if (draft && connection) {
      try {
        const endpoints = draftEndpoints(connection);
        value = endpoints.embeddingUrl;
        if (discoveryUrl)
          discoveryUrl.placeholder = endpoints.discoveryUrl || "";
      } catch {
        value = "";
        if (discoveryUrl) discoveryUrl.placeholder = "";
      }
    }
    if (embeddingUrl && !draft?.embeddingUrlExplicit)
      embeddingUrl.value = value;
    if (preview) {
      preview.textContent =
        value || LOCAL("pref-retrieval-preview-empty", "No endpoint yet");
    }
  };

  const renderEditor = () => {
    const connection = current();
    const disabled = !connection;
    for (const button of [saveButton, saveTestButton, deleteButton]) {
      if (button)
        button.disabled =
          disabled || (Boolean(connection) && savingOwners.has(connection!.id));
    }
    if (name) name.value = connection?.name || "";
    if (protocol) protocol.value = connection?.protocol || "openai";
    if (baseUrl) baseUrl.value = connection?.baseUrl || "";
    if (model) model.value = connection?.modelId || "";
    if (embeddingUrl) embeddingUrl.value = connection?.embeddingUrl || "";
    if (discoveryProtocol)
      discoveryProtocol.value = connection
        ? connection.discovery?.protocol ||
          defaultDiscovery(connection.protocol)
        : "none";
    if (discoveryUrl)
      discoveryUrl.value = String(connection?.discovery?.url || "");
    const auth = connection
      ? connection.auth || defaultAuth(connection.protocol)
      : { type: "none" as const };
    if (authType) authType.value = auth.type;
    if (headerName)
      headerName.value = String(
        auth.headerName ||
          (connection?.protocol === "gemini" ? "x-goog-api-key" : ""),
      );
    if (dimensions)
      dimensions.value =
        connection?.dimensions === undefined
          ? ""
          : String(connection.dimensions);
    if (queryPrefix) queryPrefix.value = connection?.queryPrefix || "";
    if (documentPrefix) documentPrefix.value = connection?.documentPrefix || "";
    if (parameters)
      parameters.value = connection?.parameters
        ? JSON.stringify(connection.parameters, null, 2)
        : "";
    if (headerName) headerName.disabled = authType?.value !== "header";
    if (clearCredential) {
      clearCredential.disabled =
        !connection?.persisted || connection.credentialConfigured !== true;
    }
    if (credential) {
      credential.value = "";
      credential.placeholder = connection?.credentialConfigured
        ? LOCAL("pref-retrieval-credential-placeholder-saved", "Saved")
        : LOCAL(
            "pref-retrieval-credential-placeholder-empty",
            "Enter a key before saving",
          );
    }
    clearModels();
    renderPreview();
    updatePreset();
  };

  const renderConnections = () => {
    const popup = menuPopup(connectionsSelect);
    clear(popup);
    for (const connection of drafts.values()) {
      popup?.appendChild(option(connection.id, connectionLabel(connection)));
    }
    connectionsSelect.value =
      selectedId && drafts.has(selectedId) ? selectedId : "";
  };

  const renderRouting = () => {
    if (primarySelect) {
      const popup = menuPopup(primarySelect);
      clear(popup);
      popup?.appendChild(option("", LOCAL("pref-retrieval-none", "None")));
      for (const connection of drafts.values()) {
        popup?.appendChild(option(connection.id, connectionLabel(connection)));
      }
      primarySelect.value = primaryId || "";
    }
    if (!fallbacksSelect) return;
    const previous = fallbacksSelect.value;
    const popup = menuPopup(fallbacksSelect);
    clear(popup);
    const ordered = [
      ...fallbackIds.map((id) => drafts.get(id)).filter(Boolean),
      ...[...drafts.values()].filter(
        (entry) => entry.id !== primaryId && !fallbackIds.includes(entry.id),
      ),
    ] as Draft[];
    for (const connection of ordered) {
      const state = compatibility(connection);
      const position = fallbackIds.indexOf(connection.id);
      const prefix =
        position >= 0
          ? `${position + 1}. `
          : `${LOCAL("pref-retrieval-fallback-available", "Available fallback")}: `;
      const entry = option(
        connection.id,
        `${prefix}${connectionLabel(connection)}${state ? ` · ${compatibilityLabel(state)}` : ""}`,
      );
      entry.setAttribute(
        "data-fallback",
        position >= 0 ? "active" : "candidate",
      );
      if (state) entry.setAttribute("data-compatibility", state);
      popup?.appendChild(entry);
    }
    if (ordered.some((entry) => entry.id === previous)) {
      fallbacksSelect.value = previous;
    } else {
      fallbacksSelect.value = ordered[0]?.id || "";
    }
  };

  const renderPresets = () => {
    if (!presetSelect) return;
    const popup = menuPopup(presetSelect);
    clear(popup);
    popup?.appendChild(
      option("", LOCAL("pref-retrieval-preset-custom", "Custom")),
    );
    for (const preset of presets) {
      popup?.appendChild(option(preset.id, preset.name || preset.id));
    }
  };

  const sourceKindsState = new Set<string>([
    "metadata",
    "fulltext",
    "analysis",
  ]);
  let includeTopicsState = true;
  const renderScopeState = () => {
    if (sourceMetadata)
      sourceMetadata.checked = sourceKindsState.has("metadata");
    if (sourceFulltext)
      sourceFulltext.checked = sourceKindsState.has("fulltext");
    if (sourceAnalysis)
      sourceAnalysis.checked = sourceKindsState.has("analysis");
    if (includeTopics) includeTopics.checked = includeTopicsState;
  };

  const applyStatus = (
    status: SynthesisEmbeddingPrefsStatus,
    savedId?: string,
  ) => {
    if (!status || !Array.isArray(status.connections)) return;
    const ids = new Set(status.connections.map((entry) => entry.id));
    for (const id of [...drafts.keys()]) {
      if (drafts.get(id)?.persisted && !ids.has(id)) drafts.delete(id);
    }
    for (const entry of status.connections) {
      if (drafts.get(entry.id)?.modified && entry.id !== savedId) continue;
      let inferredUrl = "";
      try {
        inferredUrl = resolveSynthesisEmbeddingEndpoints({
          ...entry,
          embeddingUrl: undefined,
        }).embeddingUrl;
      } catch {
        inferredUrl = "";
      }
      drafts.set(entry.id, {
        ...entry,
        persisted: true,
        endpointDirty: false,
        embeddingUrlExplicit: Boolean(
          entry.embeddingUrl && entry.embeddingUrl !== inferredUrl,
        ),
        discoveryProtocolExplicit: Boolean(
          entry.discovery?.protocol &&
          entry.discovery.protocol !== defaultDiscovery(entry.protocol),
        ),
        authExplicit: Boolean(
          entry.auth &&
          canonicalizeSynthesisContractJson(entry.auth) !==
            canonicalizeSynthesisContractJson(defaultAuth(entry.protocol)),
        ),
      });
    }
    presets = Array.isArray(status.presets) ? status.presets : [];
    if (!drafts.has(selectedId)) {
      selectedId =
        (status.primaryConnectionId && drafts.has(status.primaryConnectionId)
          ? status.primaryConnectionId
          : drafts.keys().next().value) || "";
    }
    primaryId = status.primaryConnectionId || null;
    fallbackIds = (status.fallbackConnectionIds || []).filter(
      (id) => drafts.has(id) && id !== primaryId,
    );
    if (enabled) enabled.checked = status.enabled === true;
    const performance = status.connectionTests[selectedId];
    if (performanceText) {
      const measures = performance?.performance;
      performanceText.textContent = performance
        ? [
            ...(performance.diagnostics || []).map((entry) => entry.message),
            ...(measures
              ? [
                  LOCAL(
                    "pref-retrieval-performance-measurements",
                    "First { $first } ms ({ $firstSuccess }/1); warm { $warm } ms ({ $warmSuccess }/1); pairs { $pairOne } ms ({ $pairOneSuccess }/2) and { $pairTwo } ms ({ $pairTwoSuccess }/2), slowest { $slowest } ms; 8 docs { $documents } ms ({ $documentSuccess }/8)",
                    {
                      first: Math.round(measures.firstQuery.latencyMs),
                      firstSuccess: measures.firstQuery.successCount,
                      warm: Math.round(measures.warmQuery.latencyMs),
                      warmSuccess: measures.warmQuery.successCount,
                      pairOne: Math.round(measures.pairRounds[0]?.latencyMs ?? 0),
                      pairOneSuccess: measures.pairRounds[0]?.successCount ?? 0,
                      pairTwo: Math.round(measures.pairRounds[1]?.latencyMs ?? 0),
                      pairTwoSuccess: measures.pairRounds[1]?.successCount ?? 0,
                      slowest: Math.round(measures.slowestPairMs),
                      documents: Math.round(measures.documentBatch.latencyMs),
                      documentSuccess: measures.documentBatch.successCount,
                    },
                  ),
                ]
              : []),
            `${LOCAL("pref-retrieval-capacity", "Capacity")}: ${performance.max_concurrency ?? 1}`,
            `${LOCAL("pref-retrieval-tested", "Tested")}: ${performance.tested_at}`,
          ].join(" · ")
        : "";
      performanceText.setAttribute(
        "data-severity",
        performance?.diagnostics?.some((entry) => entry.severity === "error")
          ? "error"
          : performance?.diagnostics?.length
            ? "warning"
            : "info",
      );
    }
    sourceKindsState.clear();
    for (const kind of status.pendingScope?.sourceKinds || [
      "metadata",
      "fulltext",
      "analysis",
    ]) {
      sourceKindsState.add(kind);
    }
    includeTopicsState = status.pendingScope?.includeTopics !== false;
    renderConnections();
    renderPresets();
    renderRouting();
    renderScopeState();
    renderEditor();
  };

  const refresh = async () => {
    const owner = selectedId;
    const atRevision = revision;
    try {
      const response = await call("getEmbeddingPrefsStatus");
      if (!disposed && selectedId === owner && revision === atRevision)
        applyStatus(response as SynthesisEmbeddingPrefsStatus);
    } catch (error) {
      if (!disposed && selectedId === owner && revision === atRevision)
        setStatus(String(error));
    }
  };

  const selectionPayload = (primary: string | null, fallbacks: string[]) => ({
    primaryConnectionId: primary,
    fallbackConnectionIds: fallbacks,
  });
  const saveRouting = async (primary: string | null, fallbacks: string[]) => {
    // Native menus stop responding if their items are replaced while closing.
    const render = () =>
      setTimeout(() => {
        if (!disposed) renderRouting();
      }, 0);
    try {
      const response = (await call(
        "saveEmbeddingPrefs",
        selectionPayload(primary, fallbacks),
      )) as HookResult;
      if (disposed) return;
      if (response.ok === false) {
        setStatus(
          [
            LOCAL("pref-retrieval-save-failed", "Save failed"),
            diagnosticText(response),
          ]
            .filter(Boolean)
            .join(" "),
        );
        render();
        return;
      }
      primaryId = response.status?.primaryConnectionId ?? primary;
      fallbackIds = response.status?.fallbackConnectionIds ?? fallbacks;
      render();
      setStatus(LOCAL("pref-retrieval-save-success", "Saved"));
    } catch (error) {
      setStatus(String(error));
      render();
    }
  };

  const parseParameters = () => {
    const raw = parameters?.value.trim() || "";
    if (!raw) return undefined;
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw new Error(
        LOCAL("pref-retrieval-parameters-invalid", "Invalid JSON parameters"),
      );
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(
        LOCAL("pref-retrieval-parameters-invalid", "Invalid JSON parameters"),
      );
    }
    const source = value as Record<string, unknown>;
    if (
      Object.keys(source).some(
        (key) => !["common", "query", "document"].includes(key),
      )
    ) {
      throw new Error(
        LOCAL("pref-retrieval-parameters-invalid", "Invalid JSON parameters"),
      );
    }
    const result: NonNullable<SynthesisRetrievalConnection["parameters"]> = {};
    for (const part of ["common", "query", "document"] as const) {
      const entry = source[part];
      if (entry === undefined) continue;
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new Error(
          LOCAL("pref-retrieval-parameters-invalid", "Invalid JSON parameters"),
        );
      }
      result[part] = entry as Record<string, any>;
    }
    return result;
  };

  const buildConnection = () => {
    const draft = current();
    if (!draft)
      throw new Error(
        LOCAL("pref-retrieval-no-connection", "Select a connection"),
      );
    const rawDimensions = dimensions?.value.trim() || "";
    const parsedDimensions = rawDimensions ? Number(rawDimensions) : undefined;
    if (
      parsedDimensions !== undefined &&
      (!Number.isInteger(parsedDimensions) || parsedDimensions <= 0)
    ) {
      throw new Error(
        LOCAL(
          "pref-retrieval-dimensions-invalid",
          "Dimensions must be a positive integer",
        ),
      );
    }
    const parsedParameters = parseParameters();
    const connection: SynthesisRetrievalConnection = {
      ...connectionFromFields()!,
      name: name?.value.trim() || "",
      ...(parsedDimensions ? { dimensions: parsedDimensions } : {}),
      ...(parsedParameters ? { parameters: parsedParameters } : {}),
    };
    if (
      draft.embeddingUrlExplicit ||
      draft.endpointDirty ||
      !draft.persisted ||
      draft.embeddingUrl
    )
      connection.embeddingUrl = draftEndpoints(connection).embeddingUrl;
    return connection;
  };

  const pendingScope = (): SynthesisRetrievalScope =>
    personalRetrievalScope({
      sourceKinds: (["metadata", "fulltext", "analysis"] as const).filter(
        (kind) => sourceKindsState.has(kind),
      ),
      includeTopics: includeTopics?.checked !== false,
    });

  const setSaveBusy = (owner: string, busy: boolean) => {
    if (current()?.id !== owner) return;
    if (saveButton) saveButton.disabled = busy;
    if (saveTestButton) saveTestButton.disabled = busy;
  };
  const saveConnection = async (test: boolean) => {
    const draft = current();
    if (!draft || savingOwners.has(draft.id)) return;
    let connection: SynthesisRetrievalConnection;
    let scope: SynthesisRetrievalScope;
    try {
      scope = pendingScope();
      connection = buildConnection();
    } catch (error) {
      setStatus(String((error as Error)?.message || error));
      return;
    }
    const owner = draft.id;
    const atRevision = revision;
    savingOwners.add(owner);
    setSaveBusy(owner, true);
    const typedCredential = credential?.value || "";
    try {
      const response = (await call("saveEmbeddingPrefs", {
        connection,
        ...(typedCredential ? { credential: typedCredential } : {}),
        enabled: enabled?.checked === true,
        pendingScope: scope,
        ...(test ? { test: true } : {}),
      })) as HookResult;
      if (disposed || selectedId !== owner || revision !== atRevision) return;
      if (response.ok === false) {
        setStatus(
          [
            LOCAL("pref-retrieval-save-failed", "Save failed"),
            diagnosticText(response),
          ]
            .filter(Boolean)
            .join(" "),
        );
        return;
      }
      if (response.status) applyStatus(response.status, connection.id);
      if (typedCredential && credential) credential.value = "";
      if (test) {
        const details =
          response.test?.ok !== true
            ? ""
            : ` · ${response.test.dimensions} · ${response.test.latency_ms} ms · ${LOCAL("pref-retrieval-capacity", "Capacity")} ${response.test.max_concurrency ?? 1}`;
        const warnings = diagnosticText(response);
        setStatus(
          response.test?.ok !== true
            ? [
                LOCAL("pref-retrieval-save-success", "Saved"),
                LOCAL("pref-retrieval-test-failed", "Connection failed"),
                diagnosticText(response),
              ]
                .filter(Boolean)
                .join(" ")
            : `${LOCAL("pref-retrieval-test-success", "Connection OK")}${details}${warnings ? ` · ${warnings}` : ""}`,
        );
      } else {
        setStatus(LOCAL("pref-retrieval-save-success", "Saved"));
      }
    } catch (error) {
      if (selectedId === owner && revision === atRevision)
        setStatus(String(error));
    } finally {
      savingOwners.delete(owner);
      if (!disposed) setSaveBusy(owner, false);
    }
  };

  const cancelPending = () => {
    const id = current()?.persisted ? current()!.id : undefined;
    void call("cancelEmbeddingDiscovery", {
      ...(id ? { connectionId: id } : {}),
    }).catch(() => {});
    discoveryRevision = -1;
    inspectRevision = -1;
  };

  const discoveryDraft = () => {
    const draft = current();
    if (!draft) return undefined;
    const connection = connectionFromFields()!;
    const parsedParameters = parseParameters();
    return {
      protocol: connection.protocol,
      baseUrl: connection.baseUrl,
      embeddingUrl: draftEndpoints(connection).embeddingUrl,
      discovery: connection.discovery,
      auth: connection.auth,
      ...(parsedParameters ? { parameters: parsedParameters } : {}),
    };
  };

  const discover = async () => {
    const draft = current();
    let partial: any;
    try {
      partial = discoveryDraft();
      if (!draft || !partial) return;
    } catch (error) {
      setStatus(String((error as Error)?.message || error));
      return;
    }
    const atRevision = revision;
    const requestRevision = ++discoveryRevision;
    setStatus(LOCAL("pref-retrieval-discovering", "Discovering models…"));
    const key = credential?.value || "";
    try {
      const response = await call("discoverEmbeddingModels", {
        connection: partial,
        ...(draft.persisted ? { connectionId: draft.id } : {}),
        ...(key ? { credential: key } : {}),
      });
      if (
        disposed ||
        requestRevision !== discoveryRevision ||
        atRevision !== revision
      )
        return;
      const models = Array.isArray(response?.models) ? response.models : [];
      const available = models.filter(
        (candidate: any) =>
          candidate?.id && candidate.embedding !== "unsupported",
      );
      if (available.length) clearModels();
      for (const candidate of available) {
        const unknown = candidate.embedding !== "supported";
        const label = `${candidate.name || candidate.id}${unknown ? ` · ${LOCAL("pref-retrieval-model-pending-test", "Test required")}` : ""}`;
        const entry = option(String(candidate.id), label);
        entry.id = `${modelPopup?.id}-${modelPopup?.children.length}`;
        entry.setAttribute("role", "option");
        entry.setAttribute("data-state", unknown ? "unknown" : "supported");
        if (Number(candidate.dimensions) > 0)
          entry.setAttribute("data-dimensions", String(candidate.dimensions));
        modelPopup?.appendChild(entry);
      }
      if (modelToggle) modelToggle.disabled = !modelPopup?.children.length;
      const candidates = Array.from(modelPopup?.children || []);
      const chosen =
        available.length &&
        !candidates.some(
          (entry) => entry.getAttribute("value") === model?.value,
        )
          ? candidates[0]?.getAttribute("value")
          : null;
      if (chosen) selectModel(chosen, false);
      const state =
        response?.status === "ok"
          ? LOCAL(
              "pref-retrieval-discovery-complete",
              "Model discovery complete",
            )
          : response?.status === "unsupported"
            ? LOCAL(
                "pref-retrieval-discovery-unsupported",
                "This service does not support model discovery",
              )
            : LOCAL(
                "pref-retrieval-discovery-failed",
                "Model discovery failed",
              );
      const notice = [
        state,
        response?.partial
          ? LOCAL("pref-retrieval-discovery-partial", "Partial results")
          : "",
        diagnosticText(response),
      ]
        .filter(Boolean)
        .join(" ");
      setStatus(notice);
      if (chosen) void inspectModel(chosen, notice);
    } catch (error) {
      if (!disposed && atRevision === revision) setStatus(String(error));
    }
  };

  const inspectModel = async (candidateId: string, notice = "") => {
    const draft = current();
    if (!draft || draft.protocol !== "ollama" || !candidateId) return;
    const atRevision = revision;
    const requestRevision = ++inspectRevision;
    const partial = discoveryDraft();
    if (!partial) return;
    try {
      const response = await call("inspectEmbeddingModel", {
        connection: { ...partial, modelId: candidateId },
        ...(draft.persisted ? { connectionId: draft.id } : {}),
        ...(credential?.value ? { credential: credential.value } : {}),
      });
      if (
        disposed ||
        requestRevision !== inspectRevision ||
        atRevision !== revision
      )
        return;
      const embedding = response?.embedding;
      const reportedDimensions = Number(response?.dimensions);
      const capability =
        embedding === "supported"
          ? `${LOCAL("pref-retrieval-model-supported", "Embedding supported")}${
              Number.isInteger(reportedDimensions) && reportedDimensions > 0
                ? ` · ${reportedDimensions} ${LOCAL("pref-retrieval-dimensions", "Dimensions")}`
                : ""
            }`
          : embedding === "unsupported"
            ? LOCAL("pref-retrieval-model-unsupported", "Embedding unsupported")
            : LOCAL("pref-retrieval-model-pending-test", "Test required");
      setStatus([notice, capability].filter(Boolean).join(" "));
    } catch (error) {
      if (!disposed && atRevision === revision) setStatus(String(error));
    }
  };

  const selectModel = (candidate: string, inspect = true) => {
    const draft = current();
    if (!draft || !model) return;
    model.value = candidate;
    draft.modelId = candidate;
    draft.modified = true;
    if (draft.protocol === "gemini") draft.endpointDirty = true;
    revision += 1;
    cancelPending();
    renderPreview();
    updatePreset();
    renderConnections();
    renderRouting();
    if (inspect && draft.protocol === "ollama") void inspectModel(candidate);
  };

  const chooseConnection = (id: string) => {
    if (!drafts.has(id)) return;
    selectedId = id;
    revision += 1;
    setStatus("");
    cancelPending();
    if (credential) credential.value = "";
    renderEditor();
  };

  listen(connectionsSelect, "command", () => {
    chooseConnection(connectionsSelect.value);
  });
  listen(addButton, "command", () => {
    const id = draftId();
    drafts.set(id, {
      id,
      name: "",
      protocol: "openai",
      baseUrl: "",
      modelId: "",
      queryPrefix: "",
      documentPrefix: "",
      auth: { type: "bearer" },
      discovery: { protocol: "openai" },
      persisted: false,
      endpointDirty: true,
    });
    selectedId = id;
    revision += 1;
    cancelPending();
    renderConnections();
    renderEditor();
  });
  listen(deleteButton, "command", () => {
    const draft = current();
    if (!draft) return;
    if (!draft.persisted) {
      drafts.delete(draft.id);
      selectedId =
        primaryId && drafts.has(primaryId)
          ? primaryId
          : drafts.keys().next().value || "";
      revision += 1;
      cancelPending();
      renderConnections();
      renderEditor();
      return;
    }
    if (
      !window.confirm(
        `${LOCAL("pref-retrieval-delete-confirm", "Delete this connection?")} ${connectionLabel(draft)}`,
      )
    )
      return;
    const owner = draft.id;
    const atRevision = revision;
    void (async () => {
      try {
        const response = (await call("saveEmbeddingPrefs", {
          removeConnectionId: draft.id,
        })) as HookResult;
        if (disposed || selectedId !== owner || revision !== atRevision) return;
        if (response.ok === false) {
          setStatus(
            [
              LOCAL("pref-retrieval-save-failed", "Save failed"),
              diagnosticText(response),
            ]
              .filter(Boolean)
              .join(" "),
          );
          return;
        }
        if (response.status) applyStatus(response.status);
        setStatus(LOCAL("pref-retrieval-deleted", "Connection deleted"));
      } catch (error) {
        setStatus(String(error));
      }
    })();
  });

  listen(presetSelect, "command", () => {
    const target = presetSelect;
    const preset = presets.find((entry) => entry.id === target?.value);
    if (!preset) return;
    const id = draftId();
    drafts.set(id, {
      ...JSON.parse(JSON.stringify(preset.connection)),
      id,
      name: preset.name,
      queryPrefix: preset.connection.queryPrefix || "",
      documentPrefix: preset.connection.documentPrefix || "",
      ...(preset.connection.dimensions
        ? { dimensions: preset.connection.dimensions }
        : {}),
      persisted: false,
      endpointDirty: true,
      embeddingUrlExplicit: Boolean(preset.connection.embeddingUrl),
      discoveryProtocolExplicit: Boolean(
        preset.connection.discovery?.protocol &&
        preset.connection.discovery.protocol !==
          defaultDiscovery(preset.connection.protocol),
      ),
      authExplicit: Boolean(
        preset.connection.auth &&
        canonicalizeSynthesisContractJson(preset.connection.auth) !==
          canonicalizeSynthesisContractJson(
            defaultAuth(preset.connection.protocol),
          ),
      ),
    });
    selectedId = id;
    revision += 1;
    cancelPending();
    renderConnections();
    renderEditor();
  });

  listen(primarySelect, "command", () => {
    const nextPrimary = primarySelect?.value || null;
    void saveRouting(
      nextPrimary,
      fallbackIds.filter((id) => id !== nextPrimary),
    );
  });
  const saveFallbacks = (next: string[]) => void saveRouting(primaryId, next);
  listen(fallbackAdd, "command", () => {
    const id = fallbacksSelect?.value;
    if (!id || !drafts.has(id) || fallbackIds.includes(id)) return;
    saveFallbacks([...fallbackIds, id]);
  });
  listen(fallbackRemove, "command", () => {
    const id = fallbacksSelect?.value;
    if (!id || !fallbackIds.includes(id)) return;
    saveFallbacks(fallbackIds.filter((entry) => entry !== id));
  });
  const moveFallback = (delta: -1 | 1) => {
    const id = fallbacksSelect?.value;
    const index = id ? fallbackIds.indexOf(id) : -1;
    const target = index + delta;
    if (index < 0 || target < 0 || target >= fallbackIds.length) return;
    const next = [...fallbackIds];
    [next[index], next[target]] = [next[target], next[index]];
    saveFallbacks(next);
  };
  listen(fallbackUp, "command", () => moveFallback(-1));
  listen(fallbackDown, "command", () => moveFallback(1));

  const changed =
    (
      update: (draft: Draft) => void,
      endpoint: boolean | ((draft: Draft) => boolean) = false,
      keepModels = false,
    ) =>
    () => {
      const draft = current();
      if (!draft) return;
      update(draft);
      draft.modified = true;
      const dirty = typeof endpoint === "function" ? endpoint(draft) : endpoint;
      if (dirty) draft.endpointDirty = true;
      revision += 1;
      setStatus("");
      cancelPending();
      if (!keepModels) clearModels();
      renderConnections();
      renderRouting();
      renderPreview();
      updatePreset();
    };
  listen(
    name,
    "input",
    changed((draft) => (draft.name = name?.value || "")),
  );
  listen(
    protocol,
    "command",
    changed((draft) => {
      draft.protocol = PROTOCOLS.includes(
        protocol?.value as SynthesisRetrievalProtocol,
      )
        ? (protocol!.value as SynthesisRetrievalProtocol)
        : "openai";
      if (discoveryProtocol && !draft.discoveryProtocolExplicit) {
        discoveryProtocol.value = defaultDiscovery(draft.protocol);
        draft.discovery = {
          ...draft.discovery,
          protocol: defaultDiscovery(draft.protocol),
        };
      }
      if (authType && !draft.authExplicit) {
        draft.auth = defaultAuth(draft.protocol);
        authType.value = draft.auth.type;
        if (headerName) headerName.value = draft.auth.headerName ?? "";
      }
      if (headerName) headerName.disabled = authType?.value !== "header";
    }, true),
  );
  listen(
    baseUrl,
    "input",
    changed((draft) => (draft.baseUrl = baseUrl?.value.trim() || ""), true),
  );
  listen(
    model,
    "input",
    changed(
      (draft) => (draft.modelId = model?.value.trim() || ""),
      (draft) => draft.protocol === "gemini",
      true,
    ),
  );
  listen(
    embeddingUrl,
    "input",
    changed((draft) => {
      const value = embeddingUrl?.value.trim() || "";
      draft.embeddingUrlExplicit = Boolean(value);
      if (value) draft.embeddingUrl = value;
      else delete draft.embeddingUrl;
    }, true),
  );
  listen(
    discoveryProtocol,
    "command",
    changed((draft) => {
      const value = discoveryProtocol?.value || "none";
      draft.discoveryProtocolExplicit = true;
      draft.discovery = {
        protocol: value as any,
        ...(discoveryUrl?.value.trim()
          ? { url: discoveryUrl.value.trim() }
          : {}),
      };
    }),
  );
  listen(
    discoveryUrl,
    "input",
    changed((draft) => {
      const value = discoveryUrl?.value.trim() || "";
      const mode = discoveryProtocol?.value || "none";
      draft.discovery = {
        protocol: mode as any,
        ...(value ? { url: value } : {}),
      };
    }),
  );
  listen(
    authType,
    "command",
    changed((draft) => {
      const value = authType?.value || "none";
      draft.authExplicit = true;
      draft.auth = {
        type: value as any,
        ...(value === "header" && headerName?.value.trim()
          ? { headerName: headerName.value.trim() }
          : {}),
      };
      if (headerName) headerName.disabled = value !== "header";
    }),
  );
  listen(
    headerName,
    "input",
    changed((draft) => {
      if (draft.auth?.type !== "header") return;
      draft.authExplicit = true;
      draft.auth.headerName = headerName?.value.trim() || "";
    }),
  );
  listen(
    dimensions,
    "input",
    changed((draft) => {
      const value = Number(dimensions?.value);
      if (dimensions?.value.trim() && Number.isInteger(value) && value > 0)
        draft.dimensions = value;
      else delete draft.dimensions;
    }),
  );
  listen(
    queryPrefix,
    "input",
    changed((draft) => (draft.queryPrefix = queryPrefix?.value || "")),
  );
  listen(
    documentPrefix,
    "input",
    changed((draft) => (draft.documentPrefix = documentPrefix?.value || "")),
  );
  listen(
    parameters,
    "input",
    changed((draft) => {
      try {
        const parsed = parseParameters();
        if (parsed) draft.parameters = parsed;
        else delete draft.parameters;
      } catch {
        // The raw field remains authoritative until a valid object can be parsed.
      }
    }),
  );
  listen(credential, "input", () => {
    revision += 1;
    setStatus("");
    cancelPending();
    clearModels();
  });
  listen(enabled, "change", () => setStatus(""));

  for (const [target, setter] of [
    [sourceMetadata, "metadata"],
    [sourceFulltext, "fulltext"],
    [sourceAnalysis, "analysis"],
  ] as const) {
    listen(target, "change", () => {
      if (!target) return;
      if (target.checked) sourceKindsState.add(setter);
      else sourceKindsState.delete(setter);
      setStatus("");
    });
  }
  listen(includeTopics, "change", () => {
    includeTopicsState = includeTopics?.checked !== false;
    setStatus("");
  });

  listen(discoverButton, "command", () => void discover());
  if (modelToggle) {
    const label = LOCAL("pref-retrieval-models", "Models");
    modelToggle.setAttribute("aria-label", label);
    modelToggle.setAttribute("tooltiptext", label);
  }
  listen(model, "input", () => {
    if (modelPopup?.children.length) openModels();
  });
  listen(modelToggle, "command", () => {
    if (modelPopup?.state === "open") modelPopup.hidePopup();
    else {
      model?.focus();
      openModels(true);
    }
  });
  listen(modelPopup, "popupshown", () =>
    model?.setAttribute("aria-expanded", "true"),
  );
  listen(modelPopup, "popuphidden", () => {
    model?.setAttribute("aria-expanded", "false");
    activateModel(null);
  });
  listen(modelPopup, "mouseover", (event) => {
    const entry = event.target as Element;
    if (entry.parentNode === modelPopup) activateModel(entry);
  });
  listen(modelPopup, "command", (event) => {
    const target = event.target as XUL.MenuItem;
    const candidate = target.getAttribute("value");
    if (target.parentNode !== modelPopup || !candidate) return;
    selectModel(candidate);
    modelPopup?.hidePopup?.();
    model?.focus?.();
  });
  listen(model, "keydown", (event) => {
    const key = event as KeyboardEvent;
    if (!modelPopup) return;
    if (key.key === "Escape" || key.key === "Tab") {
      if (modelPopup.state === "open") {
        modelPopup.hidePopup();
        if (key.key === "Escape") key.preventDefault();
      }
      return;
    }
    if (key.key === "Enter" && modelPopup.state === "open" && activeModel) {
      selectModel(activeModel.getAttribute("value")!);
      modelPopup.hidePopup();
      key.preventDefault();
    } else if (key.key === "ArrowDown" || key.key === "ArrowUp") {
      if (modelPopup.state !== "open") openModels(true);
      const entries = Array.from(modelPopup.children).filter(
        (entry) => !(entry as XUL.MenuItem).hidden,
      );
      if (!entries.length) return;
      const index = entries.indexOf(activeModel!);
      const next =
        index < 0
          ? key.key === "ArrowDown"
            ? 0
            : entries.length - 1
          : (index + (key.key === "ArrowDown" ? 1 : -1) + entries.length) %
            entries.length;
      activateModel(entries[next]);
      key.preventDefault();
    }
  });

  listen(saveButton, "command", () => void saveConnection(false));
  listen(saveTestButton, "command", () => void saveConnection(true));
  listen(clearCredential, "command", () => {
    const draft = current();
    if (!draft?.persisted || clearingOwners.has(draft.id)) return;
    const owner = draft.id;
    const atRevision = revision;
    clearingOwners.add(owner);
    if (clearCredential) clearCredential.disabled = true;
    void (async () => {
      try {
        const response = (await call("clearEmbeddingCredential", {
          connectionId: owner,
        })) as HookResult;
        if (disposed || selectedId !== owner || revision !== atRevision) return;
        if (response.ok === false) {
          setStatus(LOCAL("pref-retrieval-save-failed", "Save failed"));
          return;
        }
        draft.credentialConfigured = false;
        revision += 1;
        cancelPending();
        clearModels();
        if (credential) credential.value = "";
        if (credential)
          credential.placeholder = LOCAL(
            "pref-retrieval-credential-placeholder-empty",
            "Enter a key before saving",
          );
        if (clearCredential) clearCredential.disabled = true;
        setStatus(LOCAL("pref-retrieval-credential-cleared", "Key cleared"));
      } catch (error) {
        if (selectedId === owner && revision === atRevision)
          setStatus(String(error));
      } finally {
        clearingOwners.delete(owner);
        if (!disposed && selectedId === owner && clearCredential)
          clearCredential.disabled = !draft.credentialConfigured;
      }
    })();
  });

  for (const [menu, values, prefix] of [
    [protocol, PROTOCOLS, "pref-retrieval-protocol-"],
    [
      discoveryProtocol,
      ["none", ...PROTOCOLS.filter((value) => value !== "voyage")],
      "pref-retrieval-protocol-",
    ],
    [authType, ["none", "bearer", "header"], "pref-retrieval-auth-"],
  ] as const) {
    const popup = menuPopup(menu);
    clear(popup);
    for (const value of values) {
      popup?.appendChild(
        option(
          value,
          LOCAL(
            value === "none" ? "pref-retrieval-none" : `${prefix}${value}`,
            value,
          ),
        ),
      );
    }
  }

  void refresh();

  return () => {
    if (disposed) return;
    if (discoveryRevision >= 0 || inspectRevision >= 0) cancelPending();
    clearModels();
    disposed = true;
    for (const cleanup of cleanups.splice(0)) cleanup();
  };
}
