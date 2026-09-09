export type SqlPrimitive = string | number | null;
export type SqlParams = Record<string, SqlPrimitive>;
export type SqlRow = Record<string, unknown>;

export type SqlAdapter = {
  run: (sql: string, params?: SqlParams) => void;
  all: (sql: string, params?: SqlParams) => SqlRow[];
  get: (sql: string, params?: SqlParams) => SqlRow | null;
  transaction: <T>(fn: () => T) => T;
  close?: () => void;
};

export function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export function nowIso() {
  return new Date().toISOString();
}

export function ensureJsonPayload(payload: string) {
  return normalizeString(payload) || "{}";
}

export function normalizeRowLimit(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : 0;
}

export function normalizeStates(values: string[] | undefined) {
  return Array.from(
    new Set((values || []).map(normalizeString).filter(Boolean)),
  );
}

type TestAdapterFactory = () => SqlAdapter;

const TEST_ADAPTER_FACTORY_KEY = Symbol.for(
  "zotero-agents.plugin-state.test-adapter-factory",
);

function testAdapterRuntime() {
  return globalThis as typeof globalThis & Record<symbol, unknown>;
}

export function configurePluginStateTestAdapterFactory(
  factory: TestAdapterFactory | null,
) {
  const runtime = testAdapterRuntime();
  if (factory) {
    runtime[TEST_ADAPTER_FACTORY_KEY] = factory;
  } else {
    delete runtime[TEST_ADAPTER_FACTORY_KEY];
  }
}

export function createPluginStateTestAdapter() {
  const testAdapterFactory = testAdapterRuntime()[TEST_ADAPTER_FACTORY_KEY] as
    | TestAdapterFactory
    | undefined;
  if (!testAdapterFactory) {
    throw new Error(
      "[pluginStateStore] no storage adapter is available outside Zotero",
    );
  }
  return testAdapterFactory();
}
