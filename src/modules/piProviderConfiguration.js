import { getPref, setPref } from "../utils/prefs";
export const PI_REASONING_LEVELS = [
    "off",
    "minimal",
    "low",
    "medium",
    "high",
    "xhigh",
    "max",
];
const PI_DEFAULT_KEYS = [
    "global",
    "conversation",
    "skillRun",
    "auxiliary",
];
function emptyState() {
    return { version: 1, configurations: [], defaults: {}, overlayPath: "" };
}
function text(value) {
    return typeof value === "string" ? value.trim() : "";
}
function isReasoning(value) {
    return PI_REASONING_LEVELS.includes(value);
}
export function classifyPiEndpoint(raw) {
    const value = text(raw);
    let url;
    try {
        url = new URL(value);
    }
    catch {
        throw new Error("Invalid Pi endpoint URL");
    }
    if (url.username ||
        url.password ||
        url.search ||
        url.hash ||
        !["http:", "https:"].includes(url.protocol)) {
        throw new Error("Invalid Pi endpoint URL");
    }
    const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (host.startsWith("::ffff:"))
        throw new Error("IPv4-mapped Pi endpoints are unsupported");
    const v4 = host.split(".").map(Number);
    const ipv4 = v4.length === 4 &&
        v4.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
    const local = host === "localhost" ||
        host.endsWith(".localhost") ||
        host === "::1" ||
        (host.includes(":") &&
            (host.startsWith("fe80:") ||
                host.startsWith("fc") ||
                host.startsWith("fd"))) ||
        (ipv4 &&
            (v4[0] === 10 ||
                v4[0] === 127 ||
                v4[0] === 0 ||
                (v4[0] === 172 && v4[1] >= 16 && v4[1] <= 31) ||
                (v4[0] === 192 && v4[1] === 168) ||
                (v4[0] === 169 && v4[1] === 254)));
    if (url.protocol !== "https:" && !local)
        throw new Error("Remote Pi endpoint requires HTTPS");
    return {
        baseUrl: url.toString().replace(/\/$/, ""),
        requiresLocalNetwork: local,
    };
}
function normalizeConfiguration(raw) {
    if (!raw || typeof raw !== "object")
        throw new Error("Invalid Pi configuration");
    const id = text(raw.id);
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(id) ||
        ["__proto__", "constructor", "prototype"].includes(id))
        throw new Error("Pi configuration ID is required");
    const authVariant = raw.authVariant;
    if (authVariant !== "none" &&
        authVariant !== "api-key" &&
        authVariant !== "openai-codex")
        throw new Error("Invalid Pi auth variant");
    if (authVariant === "openai-codex" &&
        (text(raw.provider) !== "openai-codex" || text(raw.baseUrl)))
        throw new Error("OpenAI Codex authentication requires the native Codex provider");
    if (raw.reasoning !== undefined && !isReasoning(raw.reasoning))
        throw new Error("Invalid Pi reasoning level");
    const baseUrl = text(raw.baseUrl);
    const endpoint = baseUrl ? classifyPiEndpoint(baseUrl) : undefined;
    if (endpoint &&
        raw.api !== "openai-responses" &&
        raw.api !== "openai-completions")
        throw new Error("Custom Pi endpoint requires an API dialect");
    return {
        id,
        label: text(raw.label),
        provider: text(raw.provider),
        modelId: text(raw.modelId),
        authVariant,
        credentialRef: authVariant === "none" ? undefined : text(raw.credentialRef) || undefined,
        enabled: raw.enabled === true,
        baseUrl: endpoint?.baseUrl,
        api: endpoint ? raw.api : undefined,
        reasoning: raw.reasoning,
        requiresLocalNetwork: endpoint?.requiresLocalNetwork || false,
    };
}
function parseState() {
    const raw = text(getPref("piProviderConfigurationJson"));
    if (!raw)
        return emptyState();
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !Array.isArray(parsed.configurations))
        throw new Error("Invalid Pi config version");
    const defaults = {};
    for (const key of PI_DEFAULT_KEYS) {
        const selection = parsed.defaults?.[key];
        if (!selection)
            continue;
        if (selection.reasoning !== undefined && !isReasoning(selection.reasoning))
            throw new Error("Invalid Pi reasoning level");
        defaults[key] = {
            configurationId: text(selection.configurationId),
            modelId: text(selection.modelId) || undefined,
            reasoning: selection.reasoning,
        };
    }
    return {
        version: 1,
        configurations: parsed.configurations.map(normalizeConfiguration),
        defaults,
        overlayPath: text(parsed.overlayPath),
    };
}
export function loadPiProviderConfigurationState() {
    try {
        return parseState();
    }
    catch {
        return emptyState();
    }
}
function save(state) {
    setPref("piProviderConfigurationJson", JSON.stringify(state));
    return state;
}
export function upsertPiProviderConfiguration(raw) {
    const config = normalizeConfiguration(raw);
    const state = parseState();
    const index = state.configurations.findIndex((entry) => entry.id === config.id);
    const previous = index >= 0 ? state.configurations[index] : undefined;
    if (index < 0)
        state.configurations.push(config);
    else
        state.configurations[index] = config;
    if (!config.enabled ||
        !config.provider ||
        !config.modelId ||
        (previous &&
            JSON.stringify([
                previous.provider,
                previous.modelId,
                previous.authVariant,
                previous.credentialRef,
                previous.baseUrl,
                previous.api,
                previous.reasoning,
            ]) !==
                JSON.stringify([
                    config.provider,
                    config.modelId,
                    config.authVariant,
                    config.credentialRef,
                    config.baseUrl,
                    config.api,
                    config.reasoning,
                ]))) {
        for (const key of PI_DEFAULT_KEYS) {
            if (state.defaults[key]?.configurationId === config.id)
                delete state.defaults[key];
        }
    }
    return save(state);
}
export function deletePiProviderConfiguration(idRaw) {
    const id = text(idRaw);
    const state = parseState();
    state.configurations = state.configurations.filter((entry) => entry.id !== id);
    for (const key of PI_DEFAULT_KEYS) {
        if (state.defaults[key]?.configurationId === id)
            delete state.defaults[key];
    }
    return save(state);
}
function isSelectable(config, credentials) {
    return (config.enabled &&
        !!config.provider &&
        !!config.modelId &&
        (config.authVariant === "none"
            ? !!config.baseUrl
            : credentials.some((credential) => credential.id === config.credentialRef &&
                credential.kind === config.authVariant)));
}
export function setPiProviderDefaults(defaults, credentials, catalog) {
    const state = parseState();
    const next = {};
    for (const key of PI_DEFAULT_KEYS) {
        const selection = defaults[key];
        if (!selection)
            continue;
        const config = state.configurations.find((entry) => entry.id === selection.configurationId);
        const model = config
            ? findPiCatalogModel(catalog, config, selection.modelId || config.modelId)
            : undefined;
        if (!config ||
            !isSelectable(config, credentials) ||
            !hasPiModelCapabilities(model))
            throw new Error("Pi default configuration is unavailable");
        if (selection.reasoning !== undefined && !isReasoning(selection.reasoning))
            throw new Error("Invalid Pi reasoning level");
        if (!model.reasoning.includes(selection.reasoning || config.reasoning || "off"))
            throw new Error("Unsupported Pi reasoning level");
        next[key] = {
            configurationId: config.id,
            modelId: text(selection.modelId) || undefined,
            reasoning: selection.reasoning,
        };
    }
    state.defaults = next;
    return save(state);
}
export function setPiOverlayPath(pathRaw) {
    const state = parseState();
    state.overlayPath = text(pathRaw);
    return save(state);
}
export function findPiCatalogModel(catalog, config, modelId) {
    return catalog.models.find((entry) => entry.provider === config.provider &&
        entry.id === modelId &&
        (config.authVariant !== "openai-codex" ||
            (entry.source === "discovered" &&
                entry.credentialRef === config.credentialRef)));
}
export function hasPiModelCapabilities(model) {
    return (!!model &&
        model.contextWindow > 0 &&
        (model.maxTokens > 0 ||
            (model.api === "openai-codex-responses" && model.maxTokens === 0)) &&
        model.input.includes("text"));
}
export function resolvePiModelSelection(args) {
    const state = loadPiProviderConfigurationState();
    const credentials = args.credentials || [];
    const options = [
        args.explicit,
        args.ownerSelection,
        state.defaults[args.kind],
        state.defaults.global,
    ];
    let selected;
    let config;
    for (const option of options) {
        if (!option)
            continue;
        const found = state.configurations.find((entry) => entry.id === option.configurationId);
        if (!found || !isSelectable(found, credentials))
            throw new Error("Pi selection is unavailable");
        selected = option;
        config = found;
        break;
    }
    if (!config)
        config = state.configurations.find((entry) => {
            const model = findPiCatalogModel(args.catalog, entry, entry.modelId);
            return (isSelectable(entry, credentials) &&
                hasPiModelCapabilities(model) &&
                model.reasoning.includes(entry.reasoning || "off"));
        });
    if (!config)
        throw new Error("No Pi provider configuration is available");
    const modelId = selected?.modelId || config.modelId;
    const model = findPiCatalogModel(args.catalog, config, modelId);
    if (!model)
        throw new Error("Pi model is absent from catalog");
    if (!hasPiModelCapabilities(model))
        throw new Error("Pi model has incomplete capabilities");
    const reasoning = selected?.reasoning || config.reasoning || "off";
    if (!isReasoning(reasoning) || !model.reasoning.includes(reasoning))
        throw new Error("Unsupported Pi reasoning level");
    const policy = Object.freeze({
        contextWindow: model.contextWindow,
        maxTokens: model.maxTokens,
        input: Object.freeze([...model.input]),
        supportsTools: model.supportsTools === true,
    });
    return Object.freeze({
        configurationId: config.id,
        configurationLabel: config.label,
        provider: config.provider,
        modelId,
        authVariant: config.authVariant,
        credentialRef: config.credentialRef,
        api: config.api || model.api,
        baseUrl: config.baseUrl || model.baseUrl,
        reasoning,
        catalogRevision: args.catalog.revision,
        adapterVersion: "0.84.4",
        runtimeVersion: "0.84.4",
        requiresLocalNetwork: config.requiresLocalNetwork ||
            (!!model.baseUrl &&
                classifyPiEndpoint(model.baseUrl).requiresLocalNetwork),
        policy,
    });
}
