function normalizeString(value) {
    return String(value || "").trim();
}
export function detectRuntimePlatform(platformOverride) {
    const explicit = normalizeString(platformOverride).toLowerCase();
    if (explicit === "win32" || explicit === "darwin" || explicit === "linux") {
        return explicit;
    }
    const runtime = globalThis;
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
    if (nodePlatform === "win32" ||
        nodePlatform === "darwin" ||
        nodePlatform === "linux") {
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
export function detectRuntimeArchitecture(architectureOverride) {
    const explicit = normalizeString(architectureOverride).toLowerCase();
    if (explicit === "x64" || explicit === "amd64" || explicit === "x86_64") {
        return "x64";
    }
    if (explicit === "x86" || explicit === "ia32" || explicit === "i686") {
        return "x86";
    }
    if (explicit === "arm" || explicit === "armv7" || explicit === "armv7l") {
        return "arm";
    }
    if (explicit === "arm64" ||
        explicit === "aarch64" ||
        explicit === "arm64-v8a") {
        return "arm64";
    }
    if (explicit) {
        return "unknown";
    }
    const runtime = globalThis;
    const nodeArchitecture = normalizeString(runtime.process?.arch);
    if (nodeArchitecture) {
        return detectRuntimeArchitecture(nodeArchitecture);
    }
    const abi = normalizeString(runtime.Services?.appinfo?.XPCOMABI).toLowerCase();
    if (/\b(?:x86_64|amd64|x64)\b/.test(abi)) {
        return "x64";
    }
    if (/\b(?:aarch64|arm64)\b/.test(abi)) {
        return "arm64";
    }
    return "unknown";
}
export function detectSynthesisSidecarRuntimeTarget(options = {}) {
    const platform = detectRuntimePlatform(options.platform);
    const architecture = detectRuntimeArchitecture(options.architecture);
    if (platform === "win32" && architecture === "x64") {
        return "win32-x64";
    }
    if ((platform === "darwin" &&
        (architecture === "x64" || architecture === "arm64")) ||
        (platform === "linux" &&
            (architecture === "x86" ||
                architecture === "x64" ||
                architecture === "arm" ||
                architecture === "arm64"))) {
        return `${platform}-${architecture}`;
    }
    return "unsupported";
}
export function isWindowsRuntime(platformOverride) {
    return detectRuntimePlatform(platformOverride) === "win32";
}
export function isMacRuntime(platformOverride) {
    return detectRuntimePlatform(platformOverride) === "darwin";
}
export function isLinuxRuntime(platformOverride) {
    return detectRuntimePlatform(platformOverride) === "linux";
}
