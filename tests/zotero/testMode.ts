export type TestMode = "lite" | "full";
export type TestDomain = "all" | "core" | "ui" | "workflow";

function normalizeMode(value: unknown): TestMode {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  return raw === "full" ? "full" : "lite";
}

function readFromProcessEnv() {
  if (typeof process === "undefined" || !process.env) {
    return "";
  }
  return process.env.ZOTERO_TEST_MODE || "";
}

function readDomainFromProcessEnv() {
  if (typeof process === "undefined" || !process.env) {
    return "";
  }
  return process.env.ZOTERO_TEST_DOMAIN || "";
}

function readGrepFromProcessEnv() {
  if (typeof process === "undefined" || !process.env) {
    return "";
  }
  return process.env.ZOTERO_TEST_GREP || "";
}

function readFromServicesEnv() {
  const runtime = globalThis as {
    Services?: { env?: { get?: (key: string) => string } };
  };
  if (!runtime.Services?.env?.get) {
    return "";
  }
  try {
    return runtime.Services.env.get("ZOTERO_TEST_MODE") || "";
  } catch {
    return "";
  }
}

function readDomainFromServicesEnv() {
  const runtime = globalThis as {
    Services?: { env?: { get?: (key: string) => string } };
  };
  if (!runtime.Services?.env?.get) {
    return "";
  }
  try {
    return runtime.Services.env.get("ZOTERO_TEST_DOMAIN") || "";
  } catch {
    return "";
  }
}

function readGrepFromServicesEnv() {
  const runtime = globalThis as {
    Services?: { env?: { get?: (key: string) => string } };
  };
  if (!runtime.Services?.env?.get) {
    return "";
  }
  try {
    return runtime.Services.env.get("ZOTERO_TEST_GREP") || "";
  } catch {
    return "";
  }
}

function normalizeDomain(value: unknown): TestDomain {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (raw === "core" || raw === "ui" || raw === "workflow") {
    return raw;
  }
  return "all";
}

export function getTestMode(): TestMode {
  const fromProcess = readFromProcessEnv();
  if (fromProcess) {
    return normalizeMode(fromProcess);
  }
  const fromServices = readFromServicesEnv();
  if (fromServices) {
    return normalizeMode(fromServices);
  }
  return "lite";
}

export function isFullTestMode() {
  return getTestMode() === "full";
}

export function getTestDomain(): TestDomain {
  const fromProcess = readDomainFromProcessEnv();
  if (fromProcess) {
    return normalizeDomain(fromProcess);
  }
  const fromServices = readDomainFromServicesEnv();
  if (fromServices) {
    return normalizeDomain(fromServices);
  }
  return "all";
}

export function getTestGrepPattern() {
  const fromProcess = readGrepFromProcessEnv();
  if (fromProcess) {
    return String(fromProcess || "").trim();
  }
  const fromServices = readGrepFromServicesEnv();
  if (fromServices) {
    return String(fromServices || "").trim();
  }
  return "";
}
