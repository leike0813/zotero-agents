import { joinPath } from "../../../utils/path";
import { copyRuntimeFile, readRuntimeBytes, runtimePathExists, setRuntimeExecutablePermissions, writeRuntimeBytes, writeRuntimeTextFile, } from "../../runtimePersistence";
import { readPackagedBinaryAsset } from "../../packagedAssetResolver";
import { getWindowsPowerShellAbsoluteCandidates } from "../../windowsCommandResolution";
import { readRuntimeEnv, readRuntimePathEnv, splitPathEntries, } from "../../../platform/env";
import { detectRuntimePlatform } from "../../../platform/runtimePlatform";
import { executeOneShotSubprocess } from "../../../platform/subprocess";
import { resolveHostBridgeCliBinary, resolveHostBridgeCliPlatform, } from "./hostBridgeCliResolver";
const dynamicImport = new Function("specifier", "return import(specifier)");
function normalizeString(value) {
    return String(value || "").trim();
}
function dirname(pathRaw) {
    const path = normalizeString(pathRaw);
    const index = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
    return index > 0 ? path.slice(0, index) : "";
}
function joinForInstallPlatform(platform, ...segments) {
    const filtered = segments
        .map((segment) => normalizeString(segment))
        .filter(Boolean);
    const separator = platform === "win32" ? "\\" : "/";
    if (filtered.length === 0) {
        return "";
    }
    const first = filtered[0];
    const absolutePrefix = platform === "win32"
        ? first.match(/^[A-Za-z]:[\\/]?/)?.[0]?.replace(/[\\/]?$/, separator) ||
            ""
        : first.startsWith("/")
            ? separator
            : "";
    const normalized = filtered
        .flatMap((segment) => segment.split(/[\\/]+/))
        .filter(Boolean);
    if (absolutePrefix &&
        platform === "win32" &&
        normalized[0]?.toLowerCase() === absolutePrefix.slice(0, 2).toLowerCase()) {
        normalized.shift();
    }
    if (absolutePrefix === separator && normalized[0] === "") {
        normalized.shift();
    }
    return `${absolutePrefix}${normalized.join(separator)}`;
}
function formatPortablePath(path) {
    return normalizeString(path).replace(/\\/g, "/");
}
function formatShellPath(path) {
    return formatPortablePath(path).replace(/"/g, '\\"');
}
function buildWindowsShellShim(binaryPath) {
    return `#!/usr/bin/env sh\nexec "${formatShellPath(binaryPath)}" "$@"\n`;
}
function resolveWindowsShellShimPath(target) {
    if (target.platform !== "win32") {
        return "";
    }
    return joinForInstallPlatform(target.platform, target.targetDir, "zotero-bridge");
}
function resolvePlatform() {
    return detectRuntimePlatform();
}
function resolveArch() {
    const runtime = globalThis;
    return normalizeString(runtime.process?.arch) || "x64";
}
function readEnv(name) {
    return readRuntimeEnv(name);
}
function resolveHomeDir() {
    return (readEnv("HOME") ||
        readEnv("USERPROFILE") ||
        readEnv("HOMEDRIVE") + readEnv("HOMEPATH"));
}
function resolveLocalAppDataDir() {
    return (readEnv("LOCALAPPDATA") || joinPath(resolveHomeDir(), "AppData", "Local"));
}
function resolvePathEnv() {
    return readEnv("PATH");
}
function packagedCliRelativePath() {
    const platform = resolveHostBridgeCliPlatform({
        platform: resolvePlatform(),
        arch: resolveArch(),
    });
    return `bin/${platform.dir}/${platform.binary}`;
}
export function resolveHostBridgeCliInstallTarget(deps = {}) {
    const platform = deps.platform?.() || resolvePlatform();
    const home = normalizeString(deps.homeDir?.() || resolveHomeDir());
    if (platform === "win32") {
        const root = normalizeString(deps.localAppDataDir?.() || resolveLocalAppDataDir());
        const targetDir = joinForInstallPlatform(platform, root, "zotero-agents", "bin");
        return {
            platform,
            targetDir,
            targetPath: joinForInstallPlatform(platform, targetDir, "zotero-bridge.exe"),
        };
    }
    if (platform === "darwin") {
        const targetDir = resolvePreferredPosixInstallDir({
            platform,
            home,
            pathEnv: deps.pathEnv ? deps.pathEnv() : resolvePathEnv(),
            candidates: ["bin", ".local/bin"],
            fallbackCandidate: ".local/bin",
        });
        return {
            platform,
            targetDir,
            targetPath: joinForInstallPlatform(platform, targetDir, "zotero-bridge"),
        };
    }
    const targetDir = resolvePreferredPosixInstallDir({
        platform,
        home,
        pathEnv: deps.pathEnv ? deps.pathEnv() : resolvePathEnv(),
        candidates: [".local/bin", "bin"],
        fallbackCandidate: ".local/bin",
    });
    return {
        platform,
        targetDir,
        targetPath: joinForInstallPlatform(platform, targetDir, "zotero-bridge"),
    };
}
function resolvePreferredPosixInstallDir(args) {
    const resolvedCandidates = args.candidates.map((candidate) => candidate.startsWith("/")
        ? joinForInstallPlatform(args.platform, candidate)
        : joinForInstallPlatform(args.platform, args.home, candidate));
    const pathEntries = new Set(splitPathEntries(args.pathEnv)
        .map((entry) => formatPortablePath(entry).replace(/\/+$/, ""))
        .filter(Boolean));
    const fallbackCandidate = args.fallbackCandidate.startsWith("/")
        ? joinForInstallPlatform(args.platform, args.fallbackCandidate)
        : joinForInstallPlatform(args.platform, args.home, args.fallbackCandidate);
    return (resolvedCandidates.find((candidate) => pathEntries.has(formatPortablePath(candidate).replace(/\/+$/, ""))) || fallbackCandidate);
}
function defaultPathIncludes(dirRaw) {
    const dir = normalizeString(dirRaw).toLowerCase();
    if (!dir) {
        return false;
    }
    return splitPathEntries(readRuntimePathEnv(), dirRaw)
        .map((entry) => normalizeString(entry).toLowerCase())
        .some((entry) => entry === dir);
}
function quotePowerShellSingle(value) {
    return `'${String(value || "").replace(/'/g, "''")}'`;
}
function buildWindowsUserPathUpdateScript(dirRaw) {
    const dir = normalizeString(dirRaw);
    const literal = quotePowerShellSingle(dir);
    return [
        "$ErrorActionPreference='Stop'",
        `$dir=${literal}`,
        "$current=[Environment]::GetEnvironmentVariable('Path','User')",
        "$entries=if([string]::IsNullOrWhiteSpace($current)){@()}else{$current -split ';'}",
        "$exists=$false",
        "foreach($entry in $entries){if($entry.TrimEnd('\\') -ieq $dir.TrimEnd('\\')){$exists=$true;break}}",
        "if(-not $exists){$next=(@($entries|Where-Object{$_ -and $_.Trim()})+$dir)-join ';';[Environment]::SetEnvironmentVariable('Path',$next,'User');Write-Output 'updated'}else{Write-Output 'present'}",
    ].join("; ");
}
function getPowerShellCandidates() {
    return Array.from(new Set([
        ...getWindowsPowerShellAbsoluteCandidates("win32"),
        "powershell.exe",
        "pwsh.exe",
        "pwsh",
        "powershell",
    ]
        .map(normalizeString)
        .filter(Boolean)));
}
function buildPowerShellArgs(script) {
    return [
        "-NoLogo",
        "-NonInteractive",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
    ];
}
async function runOneShotCommand(command, argv) {
    const result = await executeOneShotSubprocess({
        command,
        args: argv,
        timeoutMs: 60_000,
        hidden: true,
    });
    if (result.outcome === "unavailable") {
        return false;
    }
    if (result.outcome !== "exited" || result.exitCode !== 0) {
        throw new Error(normalizeString(result.stderr) ||
            normalizeString(result.stdout) ||
            (result.timedOut ? "subprocess timed out" : `exit ${result.exitCode}`));
    }
    return true;
}
async function defaultCopyFile(sourcePath, targetPath) {
    await copyRuntimeFile({ sourcePath, targetPath });
}
async function defaultReadFile(path) {
    return readRuntimeBytes(path);
}
async function defaultWriteFile(targetPath, bytes, options) {
    await writeRuntimeBytes(targetPath, bytes, options);
}
async function defaultPathExists(targetPath) {
    return runtimePathExists(targetPath);
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
async function defaultChmodExecutable(targetPath) {
    if (resolvePlatform() === "win32") {
        return false;
    }
    return setRuntimeExecutablePermissions(targetPath, 0o755);
}
async function ensureExecutablePermission(args) {
    if (args.platform === "win32") {
        return false;
    }
    if (args.chmodExecutable) {
        const result = await args.chmodExecutable(args.targetPath);
        return result === false ? false : true;
    }
    return defaultChmodExecutable(args.targetPath);
}
function isBusyInstallError(error) {
    const code = normalizeString(error?.code);
    const message = normalizeString(error instanceof Error ? error.message : String(error || "")).toLowerCase();
    return (["EBUSY", "EPERM", "EACCES"].includes(code) ||
        message.includes("busy") ||
        message.includes("locked") ||
        message.includes("access") ||
        message.includes("permission"));
}
async function readBundledInstallSource(args) {
    if (args.resolved.available && args.resolved.source !== "path") {
        return {
            ok: true,
            bytes: await args.readFile(args.resolved.binaryPath),
            sourcePath: args.resolved.binaryPath,
            diagnostics: {
                checkedPaths: [],
                checkedUris: [],
                failures: [],
            },
        };
    }
    const read = await readPackagedBinaryAsset(packagedCliRelativePath());
    if (read.ok) {
        return {
            ok: true,
            bytes: read.bytes,
            sourcePath: read.source.uri || read.source.path || read.source.source,
            diagnostics: read.diagnostics,
        };
    }
    const checkedPaths = args.resolved.available
        ? [args.resolved.binaryPath, ...read.diagnostics.checkedPaths]
        : [...args.resolved.checkedPaths, ...read.diagnostics.checkedPaths];
    return {
        ok: false,
        diagnostics: {
            ...read.diagnostics,
            checkedPaths,
        },
    };
}
async function writeWindowsShellShim(args) {
    const shimPath = resolveWindowsShellShimPath(args.target);
    if (!shimPath) {
        return;
    }
    await (args.writeTextFile || writeRuntimeTextFile)(shimPath, buildWindowsShellShim(args.target.targetPath));
    await (args.chmodExecutable || defaultChmodExecutable)(shimPath);
}
async function defaultSetWindowsUserPath(_dir) {
    const script = buildWindowsUserPathUpdateScript(_dir);
    const argv = buildPowerShellArgs(script);
    try {
        for (const command of getPowerShellCandidates()) {
            try {
                if (await runOneShotCommand(command, argv)) {
                    return true;
                }
            }
            catch {
                continue;
            }
        }
        return false;
    }
    catch {
        return false;
    }
}
export async function installHostBridgeCli(deps = {}) {
    const resolved = await (deps.resolveCli || resolveHostBridgeCliBinary)();
    const target = resolveHostBridgeCliInstallTarget(deps);
    let sourcePath = "";
    let sourceSha256 = "";
    let targetSha256 = "";
    let changed = false;
    let permissionFixed = false;
    try {
        const legacyInjectedCopy = resolved.available &&
            resolved.source !== "path" &&
            !!deps.copyFile &&
            !deps.readFile &&
            !deps.writeFile &&
            !deps.hashBytes;
        if (legacyInjectedCopy) {
            sourcePath = resolved.binaryPath;
            await (deps.copyFile || defaultCopyFile)(resolved.binaryPath, target.targetPath);
            changed = true;
        }
        else {
            const readFile = deps.readFile || defaultReadFile;
            const writeFile = deps.writeFile || defaultWriteFile;
            const pathExists = deps.pathExists || defaultPathExists;
            const hashBytes = deps.hashBytes || sha256Bytes;
            const source = await readBundledInstallSource({ resolved, readFile });
            if (!source.ok) {
                return {
                    ok: false,
                    stage: "host-bridge-cli-install",
                    code: "cli_binary_unavailable",
                    message: resolved.available
                        ? "Bundled zotero-bridge CLI binary is unavailable for installation."
                        : resolved.message,
                    details: {
                        checkedPaths: source.diagnostics.checkedPaths,
                        checkedAssetPaths: source.diagnostics.checkedPaths,
                        checkedUris: source.diagnostics.checkedUris,
                        assetFailures: source.diagnostics.failures,
                        pathResolvedSource: resolved.available && resolved.source === "path"
                            ? resolved.binaryPath
                            : "",
                        runtime: {
                            rootURI: source.diagnostics.rootURI,
                            resourceURI: source.diagnostics.resourceURI,
                            rootPath: source.diagnostics.rootPath,
                            cwd: source.diagnostics.cwd,
                        },
                    },
                };
            }
            sourcePath = source.sourcePath;
            sourceSha256 = await hashBytes(source.bytes);
            const targetExists = await pathExists(target.targetPath);
            if (targetExists) {
                try {
                    targetSha256 = await hashBytes(await readFile(target.targetPath));
                }
                catch {
                    targetSha256 = "";
                }
            }
            changed = sourceSha256 !== targetSha256;
            if (changed) {
                try {
                    await writeFile(target.targetPath, source.bytes, { overwrite: true });
                }
                catch (error) {
                    return {
                        ok: false,
                        stage: "host-bridge-cli-install",
                        code: isBusyInstallError(error)
                            ? "cli_install_target_busy"
                            : "cli_install_failed",
                        message: isBusyInstallError(error)
                            ? "Failed to replace the existing zotero-bridge CLI binary because the target file is busy or locked."
                            : "Failed to install zotero-bridge CLI binary.",
                        details: {
                            sourcePath,
                            targetPath: target.targetPath,
                            sourceSha256,
                            targetSha256,
                            message: error instanceof Error ? error.message : String(error || ""),
                        },
                    };
                }
                targetSha256 = sourceSha256;
            }
        }
        permissionFixed = await ensureExecutablePermission({
            targetPath: target.targetPath,
            platform: target.platform,
            chmodExecutable: deps.chmodExecutable,
        });
        if (target.platform !== "win32" && !permissionFixed) {
            return {
                ok: false,
                stage: "host-bridge-cli-install",
                code: "cli_permission_update_failed",
                message: "Failed to restore executable permissions on the installed zotero-bridge CLI binary.",
                details: {
                    sourcePath,
                    targetPath: target.targetPath,
                    sourceSha256,
                    targetSha256,
                },
            };
        }
        await writeWindowsShellShim({
            target,
            writeTextFile: deps.writeTextFile,
            chmodExecutable: deps.chmodExecutable,
        });
    }
    catch (error) {
        return {
            ok: false,
            stage: "host-bridge-cli-install",
            code: "cli_install_failed",
            message: "Failed to install zotero-bridge CLI binary.",
            details: {
                sourcePath,
                targetPath: target.targetPath,
                message: error instanceof Error ? error.message : String(error || ""),
            },
        };
    }
    const pathIncludes = deps.pathIncludes || defaultPathIncludes;
    const pathAlreadyConfigured = pathIncludes(target.targetDir);
    let pathUpdated = false;
    if (!pathAlreadyConfigured && target.platform === "win32") {
        const confirmed = await (deps.confirmAddToPath
            ? deps.confirmAddToPath(target.targetDir)
            : false);
        if (!confirmed) {
            return {
                ok: false,
                stage: "host-bridge-cli-install",
                code: "cli_path_update_declined",
                message: "CLI installed, but the user declined adding the install directory to PATH.",
                details: {
                    targetPath: target.targetPath,
                    targetDir: target.targetDir,
                },
            };
        }
        pathUpdated = await (deps.setWindowsUserPath || defaultSetWindowsUserPath)(target.targetDir);
        if (!pathUpdated) {
            return {
                ok: false,
                stage: "host-bridge-cli-install",
                code: "cli_path_update_unavailable",
                message: "CLI installed, but the install directory could not be added to the user PATH automatically.",
                details: {
                    targetPath: target.targetPath,
                    targetDir: target.targetDir,
                },
            };
        }
    }
    const manualPathSetupRequired = target.platform !== "win32" && !pathAlreadyConfigured;
    return {
        ok: true,
        stage: "host-bridge-cli-install",
        message: pathAlreadyConfigured
            ? "zotero-bridge CLI installed and PATH is already configured."
            : pathUpdated
                ? "zotero-bridge CLI installed and user PATH updated. Restart terminals before using bare zotero-bridge."
                : "zotero-bridge CLI installed. Shell profile PATH setup is required before using bare zotero-bridge.",
        sourcePath,
        targetPath: target.targetPath,
        targetDir: target.targetDir,
        pathAlreadyConfigured,
        pathUpdated,
        manualPathSetupRequired,
        terminalRestartRequired: pathUpdated,
        changed,
        sourceSha256,
        targetSha256,
        permissionFixed,
    };
}
export const hostBridgeCliInstallerInternalsForTests = {
    dirname,
    resolvePlatform,
    resolveHomeDir,
    resolveLocalAppDataDir,
    resolvePreferredPosixInstallDir,
    defaultPathIncludes,
    defaultSetWindowsUserPath,
    joinForInstallPlatform,
    packagedCliRelativePath,
    buildWindowsUserPathUpdateScript,
    buildWindowsShellShim,
    resolveWindowsShellShimPath,
};
