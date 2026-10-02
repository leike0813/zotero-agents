let runtimeBridgeOverride = null;
const EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY = "__zsRuntimeBridgeOverride";
function resolveRuntimeGlobal() {
    return globalThis;
}
function readWindowFromGlobalVar() {
    try {
        const runtimeWindow = globalThis.window;
        if (!runtimeWindow) {
            return undefined;
        }
        return runtimeWindow;
    }
    catch {
        return undefined;
    }
}
function readHiddenDomWindow() {
    const runtimeGlobal = resolveRuntimeGlobal();
    try {
        return runtimeGlobal.Services?.appShell?.hiddenDOMWindow;
    }
    catch {
        return undefined;
    }
}
function readMainWindow() {
    try {
        return resolveRuntimeZotero()?.getMainWindow?.();
    }
    catch {
        return undefined;
    }
}
export function resolveRuntimeWindowCandidates() {
    const candidates = [];
    const append = (candidate) => {
        if (candidate && !candidates.includes(candidate)) {
            candidates.push(candidate);
        }
    };
    for (const candidate of runtimeBridgeOverride?.windows || []) {
        append(candidate);
    }
    try {
        const runtimeAddon = resolveRuntimeAddon();
        const data = runtimeAddon?.data;
        try {
            append(data?.dialog?.window);
        }
        catch {
            // Isolate a protected or closing dialog candidate.
        }
        try {
            append(data?.prefs?.window);
        }
        catch {
            // Isolate a protected or closing preferences candidate.
        }
    }
    catch {
        // Isolate an unavailable addon candidate.
    }
    append(readWindowFromGlobalVar());
    append(readMainWindow());
    append(readHiddenDomWindow());
    return candidates;
}
function resolveRuntimeWindow() {
    return resolveRuntimeWindowCandidates()[0];
}
function readExternalRuntimeBridgeOverride() {
    const runtimeGlobal = resolveRuntimeGlobal();
    const runtimeWindow = resolveRuntimeWindow();
    return (runtimeGlobal[EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY] ||
        runtimeWindow?.[EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY] ||
        null);
}
function clearExternalRuntimeBridgeOverrideSlots() {
    const runtimeGlobal = resolveRuntimeGlobal();
    const runtimeAddonWindows = resolveRuntimeAddon()?.data;
    const targets = [
        runtimeGlobal,
        readWindowFromGlobalVar(),
        runtimeAddonWindows?.dialog?.window,
        runtimeAddonWindows?.prefs?.window,
        readMainWindow(),
        readHiddenDomWindow(),
    ];
    const seen = new Set();
    for (const target of targets) {
        if (!target || typeof target !== "object" || seen.has(target)) {
            continue;
        }
        seen.add(target);
        try {
            delete target[EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY];
        }
        catch {
            // ignore protected globals in real Zotero runtime
        }
    }
}
function readAddonFromGlobalVar() {
    if (typeof addon === "undefined" || !addon) {
        return undefined;
    }
    return addon;
}
function readZoteroFromGlobalVar() {
    if (typeof Zotero === "undefined" || !Zotero) {
        return undefined;
    }
    return Zotero;
}
function readToolkitFromGlobalVar() {
    if (typeof ztoolkit === "undefined" || !ztoolkit) {
        return undefined;
    }
    return ztoolkit;
}
function readConsoleFromGlobalVar() {
    if (typeof console === "undefined" || !console) {
        return undefined;
    }
    return console;
}
export function summarizeRuntimeZoteroShape(value) {
    const candidate = value && typeof value === "object"
        ? value
        : null;
    const items = candidate && typeof candidate.Items === "object"
        ? candidate.Items
        : null;
    const prefs = candidate && typeof candidate.Prefs === "object"
        ? candidate.Prefs
        : null;
    const file = candidate && typeof candidate.File === "object"
        ? candidate.File
        : null;
    return {
        hasItems: !!items && typeof items.get === "function",
        hasPrefs: !!prefs &&
            typeof prefs.get === "function" &&
            typeof prefs.set === "function",
        hasFile: !!file && typeof file.pathToFile === "function",
        hasDebug: !!candidate && typeof candidate.debug === "function",
    };
}
function scoreRuntimeZoteroShape(shape) {
    return ((shape.hasItems && shape.hasPrefs ? 100 : 0) +
        (shape.hasItems ? 40 : 0) +
        (shape.hasPrefs ? 20 : 0) +
        (shape.hasFile ? 5 : 0) +
        (shape.hasDebug ? 1 : 0));
}
export function resolveRuntimeZoteroDetails() {
    if (runtimeBridgeOverride && "zotero" in runtimeBridgeOverride) {
        if (typeof runtimeBridgeOverride.zotero === "undefined") {
            return {
                zotero: undefined,
                source: "override",
                shape: summarizeRuntimeZoteroShape(undefined),
            };
        }
    }
    const candidates = [];
    if (runtimeBridgeOverride &&
        "zotero" in runtimeBridgeOverride &&
        runtimeBridgeOverride.zotero) {
        candidates.push({
            source: "override",
            zotero: runtimeBridgeOverride.zotero,
        });
    }
    const fromGlobalThis = resolveRuntimeGlobal().Zotero;
    const suppressGlobalVarCandidate = !!runtimeBridgeOverride?.zotero && typeof fromGlobalThis === "undefined";
    const fromGlobalVar = suppressGlobalVarCandidate
        ? undefined
        : readZoteroFromGlobalVar();
    if (fromGlobalVar) {
        candidates.push({
            source: "global-var",
            zotero: fromGlobalVar,
        });
    }
    if (fromGlobalThis) {
        candidates.push({
            source: "global-this",
            zotero: fromGlobalThis,
        });
    }
    let best = null;
    let bestScore = -1;
    for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const shape = summarizeRuntimeZoteroShape(candidate.zotero);
        const score = scoreRuntimeZoteroShape(shape);
        if (score > bestScore) {
            best = {
                zotero: candidate.zotero,
                source: candidate.source,
                shape,
            };
            bestScore = score;
        }
    }
    if (best) {
        return best;
    }
    return {
        zotero: undefined,
        source: "unresolved",
        shape: summarizeRuntimeZoteroShape(undefined),
    };
}
export function resolveRuntimeAddon() {
    if (runtimeBridgeOverride && "addon" in runtimeBridgeOverride) {
        return runtimeBridgeOverride.addon;
    }
    return readAddonFromGlobalVar() || resolveRuntimeGlobal().addon;
}
export function resolveRuntimeZotero() {
    return resolveRuntimeZoteroDetails().zotero;
}
export function resolveRuntimeConsole() {
    const externalOverride = readExternalRuntimeBridgeOverride();
    const activeOverride = runtimeBridgeOverride || externalOverride;
    if (activeOverride && "console" in activeOverride) {
        return activeOverride.console || undefined;
    }
    return (readConsoleFromGlobalVar() ||
        resolveRuntimeGlobal().console ||
        resolveRuntimeWindow()?.console ||
        undefined);
}
export function resolveRuntimeHostCapabilities() {
    const runtimeGlobal = resolveRuntimeGlobal();
    const runtimeWindow = resolveRuntimeWindow();
    const externalOverride = readExternalRuntimeBridgeOverride();
    const override = runtimeBridgeOverride || externalOverride;
    const fetchImpl = typeof override?.fetch === "function"
        ? override.fetch
        : typeof runtimeWindow?.fetch === "function"
            ? runtimeWindow.fetch
            : typeof runtimeGlobal.fetch === "function"
                ? runtimeGlobal.fetch
                : null;
    const boundFetch = typeof fetchImpl === "function"
        ? fetchImpl.bind(fetchImpl === runtimeWindow?.fetch ? runtimeWindow : runtimeGlobal)
        : null;
    const btoaImpl = typeof override?.btoa === "function"
        ? override.btoa
        : typeof runtimeGlobal.btoa === "function"
            ? runtimeGlobal.btoa
            : typeof runtimeWindow?.btoa === "function"
                ? runtimeWindow.btoa
                : null;
    const boundBtoa = typeof btoaImpl === "function"
        ? btoaImpl.bind(btoaImpl === runtimeWindow?.btoa ? runtimeWindow : runtimeGlobal)
        : null;
    const atobImpl = typeof override?.atob === "function"
        ? override.atob
        : typeof runtimeGlobal.atob === "function"
            ? runtimeGlobal.atob
            : typeof runtimeWindow?.atob === "function"
                ? runtimeWindow.atob
                : null;
    const boundAtob = typeof atobImpl === "function"
        ? atobImpl.bind(atobImpl === runtimeWindow?.atob ? runtimeWindow : runtimeGlobal)
        : null;
    return {
        zotero: resolveRuntimeZotero(),
        addon: resolveRuntimeAddon(),
        fetch: boundFetch,
        Buffer: override && "Buffer" in override
            ? (override.Buffer ?? null)
            : (runtimeGlobal.Buffer ??
                runtimeWindow?.Buffer ??
                null),
        btoa: boundBtoa,
        atob: boundAtob,
        TextEncoder: override && "TextEncoder" in override
            ? (override.TextEncoder ?? null)
            : (runtimeGlobal.TextEncoder ??
                runtimeWindow?.TextEncoder ??
                null),
        TextDecoder: override && "TextDecoder" in override
            ? (override.TextDecoder ?? null)
            : (runtimeGlobal.TextDecoder ??
                runtimeWindow?.TextDecoder ??
                null),
        FileReader: override && "FileReader" in override
            ? (override.FileReader ?? null)
            : (runtimeGlobal.FileReader ??
                runtimeWindow?.FileReader ??
                null),
        navigator: override && "navigator" in override
            ? (override.navigator ?? null)
            : (runtimeGlobal.navigator ??
                runtimeWindow?.navigator ??
                null),
        console: resolveRuntimeConsole(),
    };
}
export function resolveRuntimeToolkit() {
    if (runtimeBridgeOverride && "ztoolkit" in runtimeBridgeOverride) {
        return runtimeBridgeOverride.ztoolkit;
    }
    const fromGlobalVar = readToolkitFromGlobalVar();
    const fromGlobalThis = resolveRuntimeGlobal().ztoolkit;
    const fromAddon = resolveRuntimeAddon()?.data?.ztoolkit;
    return fromGlobalVar || fromGlobalThis || fromAddon;
}
export function resolveToolkitMember(member) {
    const toolkit = resolveRuntimeToolkit();
    const value = toolkit
        ? toolkit[member]
        : undefined;
    if (typeof value === "undefined") {
        return undefined;
    }
    return value;
}
export function resolveAddonName(fallback = "Zotero Agents") {
    const name = String(resolveRuntimeAddon()?.data?.config?.addonName || "").trim();
    return name || fallback;
}
export function resolveAddonRef(fallback = "") {
    const ref = String(resolveRuntimeAddon()?.data?.config?.addonRef || "").trim();
    return ref || fallback;
}
export function resolveRuntimeAlert(win) {
    const candidate = win;
    if (typeof candidate?.alert === "function") {
        return (message) => candidate.alert?.(message);
    }
    const toolkit = resolveRuntimeToolkit();
    const fromToolkit = toolkit?.getGlobal?.("alert");
    if (typeof fromToolkit === "function") {
        return (message) => fromToolkit(message);
    }
    const fromGlobal = resolveRuntimeGlobal().alert;
    if (typeof fromGlobal === "function") {
        return (message) => fromGlobal(message);
    }
    return undefined;
}
export function installRuntimeBridgeOverrideForTests(override) {
    runtimeBridgeOverride = { ...override };
}
export function resetRuntimeBridgeOverrideForTests() {
    runtimeBridgeOverride = null;
    clearExternalRuntimeBridgeOverrideSlots();
}
