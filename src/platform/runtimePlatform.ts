import type { SynthesisSidecarRuntimeTarget } from "../../packages/synthesis-contracts/src/sidecarRuntimeBundle";

export type RuntimePlatform = "win32" | "darwin" | "linux" | "unknown";
export type RuntimeArchitecture = "x64" | "arm64" | "unknown";
export type SynthesisSidecarRuntimeTargetDetection =
  | SynthesisSidecarRuntimeTarget
  | "unsupported";

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

export function detectRuntimeArchitecture(
  architectureOverride?: unknown,
): RuntimeArchitecture {
  const explicit = normalizeString(architectureOverride).toLowerCase();
  if (explicit === "x64" || explicit === "amd64" || explicit === "x86_64") {
    return "x64";
  }
  if (
    explicit === "arm64" ||
    explicit === "aarch64" ||
    explicit === "arm64-v8a"
  ) {
    return "arm64";
  }
  if (explicit) {
    return "unknown";
  }
  const runtime = globalThis as {
    process?: { arch?: string };
    Services?: { appinfo?: { XPCOMABI?: string } };
  };
  const nodeArchitecture = normalizeString(runtime.process?.arch);
  if (nodeArchitecture) {
    return detectRuntimeArchitecture(nodeArchitecture);
  }
  const abi = normalizeString(
    runtime.Services?.appinfo?.XPCOMABI,
  ).toLowerCase();
  if (/\b(?:x86_64|amd64|x64)\b/.test(abi)) {
    return "x64";
  }
  if (/\b(?:aarch64|arm64)\b/.test(abi)) {
    return "arm64";
  }
  return "unknown";
}

export function detectSynthesisSidecarRuntimeTarget(
  options: {
    platform?: unknown;
    architecture?: unknown;
  } = {},
): SynthesisSidecarRuntimeTargetDetection {
  const platform = detectRuntimePlatform(options.platform);
  const architecture = detectRuntimeArchitecture(options.architecture);
  if (platform === "win32" && architecture === "x64") {
    return "win32-x64";
  }
  if (
    (platform === "darwin" || platform === "linux") &&
    (architecture === "x64" || architecture === "arm64")
  ) {
    return `${platform}-${architecture}` as SynthesisSidecarRuntimeTarget;
  }
  return "unsupported";
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
