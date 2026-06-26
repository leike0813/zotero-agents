export type RuntimePlatform = "win32" | "darwin" | "linux" | "unknown";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export function detectRuntimePlatform(
  platformOverride?: unknown,
): RuntimePlatform {
  const explicit = normalizeString(platformOverride).toLowerCase();
  if (explicit === "win32" || explicit === "darwin" || explicit === "linux") {
    return explicit;
  }

  const runtime = globalThis as {
    Zotero?: { isWin?: boolean; isMac?: boolean; isLinux?: boolean };
    process?: { platform?: string };
    Services?: { appinfo?: { OS?: string } };
  };

  if (runtime.Zotero?.isWin === true) {
    return "win32";
  }
  if (runtime.Zotero?.isMac === true) {
    return "darwin";
  }
  if (runtime.Zotero?.isLinux === true) {
    return "linux";
  }

  const nodePlatform = normalizeString(runtime.process?.platform).toLowerCase();
  if (
    nodePlatform === "win32" ||
    nodePlatform === "darwin" ||
    nodePlatform === "linux"
  ) {
    return nodePlatform;
  }

  const appOs = normalizeString(runtime.Services?.appinfo?.OS).toLowerCase();
  if (appOs.includes("win")) {
    return "win32";
  }
  if (appOs.includes("darwin") || appOs.includes("mac")) {
    return "darwin";
  }
  if (appOs.includes("linux")) {
    return "linux";
  }

  return "unknown";
}

export function isWindowsRuntime(platformOverride?: unknown) {
  return detectRuntimePlatform(platformOverride) === "win32";
}

export function isMacRuntime(platformOverride?: unknown) {
  return detectRuntimePlatform(platformOverride) === "darwin";
}

export function isLinuxRuntime(platformOverride?: unknown) {
  return detectRuntimePlatform(platformOverride) === "linux";
}
