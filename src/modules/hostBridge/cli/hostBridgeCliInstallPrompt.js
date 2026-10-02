import semver from "semver";
import { installHostBridgeCli, resolveHostBridgeCliInstallTarget, } from "./hostBridgeCliInstaller";
import { resolveHostBridgeCliPlatform } from "./hostBridgeCliResolver";
import { readPackagedBinaryAsset } from "../../packagedAssetResolver";
import { detectRuntimePlatform } from "../../../platform/runtimePlatform";
import { readRuntimeEnv } from "../../../platform/env";
import { executeOneShotSubprocess } from "../../../platform/subprocess";
import { readRuntimeBytes, runtimePathExists } from "../../runtimePersistence";
import { getPref, setPref } from "../../../utils/prefs";
const dynamicImport = new Function("specifier", "return import(specifier)");
const STARTUP_PROMPT_DISABLE_ENV_KEYS = [
    "ZOTERO_AGENTS_DISABLE_HOST_BRIDGE_CLI_STARTUP_PROMPT",
    "ZOTERO_AGENTS_DISABLE_HOST_BRIDGE_CLI_PROMPT",
];
const AUTOMATED_BOOLEAN_ENV_KEYS = [
    "CI",
    "GITHUB_ACTIONS",
    "ZOTERO_PLUGIN_TEST",
];
const AUTOMATED_VALUE_ENV_KEYS = [
    "ZOTERO_TEST_MODE",
    "ZOTERO_TEST_DOMAIN",
    "ZOTERO_TEST_TARGET_SCRIPT",
];
function normalizeString(value) {
    return String(value || "").trim();
}
function resolveBuildRuntimeEnv() {
    return typeof __env__ === "undefined" ? "development" : __env__;
}
function isTruthyEnvFlag(value) {
    const normalized = normalizeString(value).toLowerCase();
    return (normalized === "1" ||
        normalized === "true" ||
        normalized === "yes" ||
        normalized === "on");
}
export function shouldRunHostBridgeCliStartupPrompt(deps = {}) {
    if ((deps.runtimeEnv || resolveBuildRuntimeEnv)() !== "production") {
        return false;
    }
    const readEnv = deps.readEnv || readRuntimeEnv;
    if (STARTUP_PROMPT_DISABLE_ENV_KEYS.some((key) => isTruthyEnvFlag(readEnv(key)))) {
        return false;
    }
    if (AUTOMATED_BOOLEAN_ENV_KEYS.some((key) => isTruthyEnvFlag(readEnv(key)))) {
        return false;
    }
    if (AUTOMATED_VALUE_ENV_KEYS.some((key) => normalizeString(readEnv(key)))) {
        return false;
    }
    return true;
}
function resolveArch() {
    const runtime = globalThis;
    return normalizeString(runtime.process?.arch) || "x64";
}
function packagedCliRelativePath(deps = {}) {
    const platform = resolveHostBridgeCliPlatform({
        platform: deps.platform?.() || detectRuntimePlatform(),
        arch: resolveArch(),
    });
    return `bin/${platform.dir}/${platform.binary}`;
}
async function defaultReadBundledAsset(relativePath) {
    const read = await readPackagedBinaryAsset(relativePath);
    return read.ok ? read.bytes : null;
}
async function sha256Bytes(bytes) {
    const runtime = globalThis;
    if (typeof runtime.crypto?.subtle?.digest === "function") {
        const digest = await runtime.crypto.subtle.digest("SHA-256", bytes);
        return Array.from(new Uint8Array(digest))
            .map((value) => value.toString(16).padStart(2, "0"))
            .join("");
    }
    if (runtime.process) {
        const crypto = await dynamicImport("crypto").catch(() => null);
        if (typeof crypto?.createHash === "function") {
            return crypto.createHash("sha256").update(bytes).digest("hex");
        }
    }
    throw new Error("No SHA-256 digest API is available");
}
function decodeUtf8(bytes) {
    const Decoder = globalThis.TextDecoder ||
        TextDecoder;
    return new Decoder("utf-8").decode(bytes);
}
async function readBundledReleaseVersion(args) {
    const bytes = await args.readBundledAsset("bin/zotero-bridge-release.json");
    if (!bytes) {
        return "";
    }
    try {
        const manifest = JSON.parse(decodeUtf8(bytes));
        return normalizeString(manifest.version);
    }
    catch {
        return "";
    }
}
function buildBundledIdentity(args) {
    return args.version
        ? `${args.version}:${args.sha256}`
        : `sha256:${args.sha256}`;
}
function parseHostBridgeCliVersionOutput(output) {
    const match = normalizeString(output).match(/(?:^|\s)v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?)(?:\s|$)/);
    return match ? match[1] : "";
}
async function readVersionWithOneShotSubprocess(command) {
    const result = await executeOneShotSubprocess({
        command,
        args: ["--version"],
        timeoutMs: 5000,
        hidden: true,
    });
    return result.outcome === "exited" && result.exitCode === 0
        ? result.stdout || result.stderr
        : "";
}
async function defaultReadInstalledVersion(targetPath) {
    const output = await readVersionWithOneShotSubprocess(targetPath).catch(() => "");
    return parseHostBridgeCliVersionOutput(output);
}
function isInstalledVersionNewer(args) {
    const installed = semver.valid(normalizeString(args.installedVersion));
    const bundled = semver.valid(normalizeString(args.bundledVersion));
    return !!installed && !!bundled && semver.gt(installed, bundled);
}
export async function resolveHostBridgeCliInstallPromptState(deps = {}) {
    const target = resolveHostBridgeCliInstallTarget(deps);
    const readBundledAsset = deps.readBundledAsset || defaultReadBundledAsset;
    const readRuntimeFile = deps.readRuntimeFile || readRuntimeBytes;
    const readInstalledVersion = deps.readInstalledVersion || defaultReadInstalledVersion;
    const pathExists = deps.runtimePathExists || runtimePathExists;
    const hashBytes = deps.hashBytes || sha256Bytes;
    const bundledBytes = await readBundledAsset(packagedCliRelativePath(deps));
    const bundledVersion = (await readBundledReleaseVersion({ readBundledAsset })) || "unknown";
    if (!bundledBytes) {
        return {
            status: "unavailable",
            targetPath: target.targetPath,
            targetDir: target.targetDir,
            bundledVersion,
            bundledSha256: "",
            bundledIdentity: "",
            targetSha256: "",
            installedVersion: "",
            message: "Bundled Host Bridge CLI binary is unavailable.",
        };
    }
    const bundledSha256 = await hashBytes(bundledBytes);
    const bundledIdentity = buildBundledIdentity({
        version: bundledVersion === "unknown" ? "" : bundledVersion,
        sha256: bundledSha256,
    });
    let targetSha256 = "";
    if (!(await pathExists(target.targetPath))) {
        return {
            status: "missing",
            targetPath: target.targetPath,
            targetDir: target.targetDir,
            bundledVersion,
            bundledSha256,
            bundledIdentity,
            targetSha256,
            installedVersion: "",
        };
    }
    const installedVersion = normalizeString(await readInstalledVersion(target.targetPath).catch(() => ""));
    try {
        targetSha256 = await hashBytes(await readRuntimeFile(target.targetPath));
    }
    catch (error) {
        return {
            status: isInstalledVersionNewer({ installedVersion, bundledVersion })
                ? "current"
                : "stale",
            targetPath: target.targetPath,
            targetDir: target.targetDir,
            bundledVersion,
            bundledSha256,
            bundledIdentity,
            targetSha256,
            installedVersion,
        };
    }
    return {
        status: targetSha256 === bundledSha256 ||
            isInstalledVersionNewer({ installedVersion, bundledVersion })
            ? "current"
            : "stale",
        targetPath: target.targetPath,
        targetDir: target.targetDir,
        bundledVersion,
        bundledSha256,
        bundledIdentity,
        targetSha256,
        installedVersion,
    };
}
function defaultGetDismissedIdentity() {
    return normalizeString(getPref("hostBridgeCli.installPrompt.dismissedIdentity"));
}
function defaultSetDismissedIdentity(identity) {
    setPref("hostBridgeCli.installPrompt.dismissedIdentity", identity);
}
export function shouldPromptHostBridgeCliInstall(args) {
    if (args.state.status !== "missing" && args.state.status !== "stale") {
        return false;
    }
    return (!!args.state.bundledIdentity &&
        normalizeString(args.dismissedIdentity) !== args.state.bundledIdentity);
}
export async function promptHostBridgeCliInstallOnStartup(args) {
    const deps = args.deps || {};
    const state = await resolveHostBridgeCliInstallPromptState(deps);
    const dismissedIdentity = deps.getDismissedIdentity?.() || defaultGetDismissedIdentity();
    if (!shouldPromptHostBridgeCliInstall({ state, dismissedIdentity })) {
        return {
            prompted: false,
            installed: false,
            state,
        };
    }
    if (!args.win.confirm(args.message(state))) {
        (deps.setDismissedIdentity || defaultSetDismissedIdentity)(state.bundledIdentity);
        return {
            prompted: true,
            installed: false,
            state,
        };
    }
    const install = await (deps.install || installHostBridgeCli)({
        confirmAddToPath: (dir) => args.win.confirm(`Install directory is not in PATH:\n\n${dir}\n\nAdd it to the user PATH? Restarting terminals may be required.`),
    });
    if (install.ok) {
        args.win.alert(args.successMessage(install));
        return {
            prompted: true,
            installed: true,
            state,
            install,
        };
    }
    args.win.alert(args.failureMessage(install));
    return {
        prompted: true,
        installed: false,
        state,
        install,
    };
}
