export function normalizeString(value) {
    return String(value || "").trim();
}
export function nowIso() {
    return new Date().toISOString();
}
export function ensureJsonPayload(payload) {
    return normalizeString(payload) || "{}";
}
export function normalizeRowLimit(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return 0;
    }
    const normalized = Math.floor(value);
    return normalized > 0 ? normalized : 0;
}
export function normalizeStates(values) {
    return Array.from(new Set((values || []).map(normalizeString).filter(Boolean)));
}
const TEST_ADAPTER_FACTORY_KEY = Symbol.for("zotero-agents.plugin-state.test-adapter-factory");
function testAdapterRuntime() {
    return globalThis;
}
export function configurePluginStateTestAdapterFactory(factory) {
    const runtime = testAdapterRuntime();
    if (factory) {
        runtime[TEST_ADAPTER_FACTORY_KEY] = factory;
    }
    else {
        delete runtime[TEST_ADAPTER_FACTORY_KEY];
    }
}
export function createPluginStateTestAdapter() {
    const testAdapterFactory = testAdapterRuntime()[TEST_ADAPTER_FACTORY_KEY];
    if (!testAdapterFactory) {
        throw new Error("[pluginStateStore] no storage adapter is available outside Zotero");
    }
    return testAdapterFactory();
}
