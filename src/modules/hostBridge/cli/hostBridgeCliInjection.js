import { joinPath } from "../../../utils/path";
import { mergePathEntries as mergePlatformPathEntries, readRuntimePathEnv, splitPathEntries as splitPlatformPathEntries, } from "../../../platform/env";
import { getHostBridgeToken, redactHostBridgeToken, } from "../server/hostBridgeAuth";
import { ensureHostBridgeServer } from "../server/hostBridgeServer";
import { resolveHostBridgeCliBinary, } from "./hostBridgeCliResolver";
import { HOST_BRIDGE_PROTOCOL_VERSION, } from "../server/hostBridgeProtocol";
import { ensureRuntimeDirectory, setRuntimeExecutablePermissions, writeRuntimeTextFile, } from "../../runtimePersistence";
import { issueHostBridgeWriteAutoApprovalGrant, revokeHostBridgeWriteAutoApprovalGrant, } from "../permissions/hostBridgeWriteAutoApprovalRegistry";
function normalizeString(value) {
    return String(value || "").trim();
}
function resolveRuntimePathEnv() {
    return readRuntimePathEnv();
}
function splitPathEntries(pathValue) {
    return splitPlatformPathEntries(pathValue);
}
function mergePathEntries(pathValue, entriesRaw) {
    return mergePlatformPathEntries(pathValue, entriesRaw);
}
function prependPath(pathValue, entryRaw) {
    return mergePathEntries(pathValue, [entryRaw]);
}
function formatPortablePath(path) {
    return normalizeString(path).replace(/\\/g, "/");
}
function formatShellPath(path) {
    return formatPortablePath(path).replace(/"/g, '\\"');
}
function formatBatchPath(path) {
    return normalizeString(path).replace(/"/g, '""');
}
function buildShellShim(binaryPath) {
    return `#!/usr/bin/env sh\nexec "${formatShellPath(binaryPath)}" "$@"\n`;
}
function buildCmdShim(binaryPath) {
    return `@echo off\r\n"${formatBatchPath(binaryPath)}" %*\r\n`;
}
function buildScopeJson(args) {
    const scopeKind = args.scopeKind === "acp-chat" ? "acp-chat" : "acp-skill-run";
    return {
        kind: scopeKind,
        requestId: args.requestId,
        runId: args.requestId,
        ...(args.autoApproveWrites ? { autoApproveWrites: true } : {}),
        ...(args.grantId ? { grantId: args.grantId } : {}),
    };
}
function buildProfileJson(args) {
    return {
        schema: "zotero-bridge.profile.v1",
        protocol: HOST_BRIDGE_PROTOCOL_VERSION,
        endpoint: args.endpoint,
        connectionMode: "local",
        auth: {
            type: "bearer",
            tokenEnv: "ZOTERO_BRIDGE_TOKEN",
        },
        ...(args.scopeKind === "acp-chat"
            ? {}
            : {
                scope: buildScopeJson(args),
            }),
    };
}
function buildReadme(args) {
    return [
        "# Zotero Bridge Runtime",
        "",
        `Endpoint: ${args.endpoint || "(unavailable)"}`,
        `Profile: ${formatPortablePath(args.profilePath)}`,
        `CLI availability: ${args.available
            ? "available"
            : `unavailable (${args.fallbackReason || "cli_binary_unavailable"})`}`,
        `Auto-approve Zotero writes for this run: ${args.autoApproveWrites === true ? "enabled" : "disabled"}.`,
        "",
        "Host Bridge CLI guidance is provided by the built-in `zotero-bridge-cli` wrapper skill.",
        "Read that skill, use `references/command-catalog.md` for discovery, and load only the selected generated card under `references/commands/`.",
        "",
    ].join("\n");
}
export async function materializeHostBridgeCliRunInjection(args) {
    const workspaceDir = normalizeString(args.workspaceDir);
    const requestId = normalizeString(args.requestId);
    const autoApproveWrites = args.autoApproveWrites === true;
    if (!workspaceDir) {
        throw new Error("workspaceDir is required for Host Bridge CLI injection");
    }
    if (!requestId) {
        throw new Error("requestId is required for Host Bridge CLI injection");
    }
    let server = null;
    let bridgeUnavailable = "";
    try {
        server = await (args.ensureServer || ensureHostBridgeServer)();
    }
    catch (error) {
        bridgeUnavailable =
            error instanceof Error
                ? error.message
                : String(error || "Host Bridge unavailable");
    }
    let token = "";
    try {
        token = (args.getToken || getHostBridgeToken)();
    }
    catch {
        token = "";
    }
    const cli = await (args.resolveCli || resolveHostBridgeCliBinary)();
    const bridgeDir = joinPath(workspaceDir, ".zotero-bridge");
    const shimDir = joinPath(bridgeDir, "bin");
    const profilePath = joinPath(bridgeDir, "profile.json");
    const readmePath = joinPath(bridgeDir, "README.md");
    const endpoint = normalizeString(server?.endpoint);
    const available = cli.available && !!endpoint && !!token;
    const fallbackReason = bridgeUnavailable
        ? "host_bridge_unavailable"
        : cli.available
            ? token
                ? ""
                : "host_bridge_token_unavailable"
            : cli.code;
    await ensureRuntimeDirectory(bridgeDir);
    await ensureRuntimeDirectory(shimDir);
    const grantId = available && autoApproveWrites
        ? issueHostBridgeWriteAutoApprovalGrant({ requestId, runId: requestId })
        : undefined;
    try {
        await writeRuntimeTextFile(profilePath, `${JSON.stringify(buildProfileJson({
            endpoint,
            requestId,
            scopeKind: args.scopeKind,
            autoApproveWrites,
            grantId,
        }), null, 2)}\n`);
        await writeRuntimeTextFile(readmePath, buildReadme({
            available,
            fallbackReason,
            endpoint,
            profilePath,
            autoApproveWrites,
        }));
        if (cli.available) {
            const shellShimPath = joinPath(shimDir, "zotero-bridge");
            await writeRuntimeTextFile(shellShimPath, buildShellShim(cli.binaryPath));
            await setRuntimeExecutablePermissions(shellShimPath);
            await writeRuntimeTextFile(joinPath(shimDir, "zotero-bridge.cmd"), buildCmdShim(cli.binaryPath));
        }
    }
    catch (error) {
        if (grantId)
            revokeHostBridgeWriteAutoApprovalGrant(grantId);
        throw error;
    }
    const env = {
        ZOTERO_BRIDGE_PROFILE: profilePath,
    };
    if (args.scopeKind === "acp-chat") {
        env.ZOTERO_BRIDGE_SCOPE = JSON.stringify(buildScopeJson({
            requestId,
            scopeKind: args.scopeKind,
            autoApproveWrites,
            grantId,
        }));
    }
    if (token) {
        env.ZOTERO_BRIDGE_TOKEN = token;
    }
    if (available) {
        env.PATH = mergePathEntries(undefined, [shimDir, cli.cliDir]);
        env.Path = env.PATH;
    }
    return {
        available,
        endpoint,
        tokenMasked: redactHostBridgeToken(token),
        profilePath,
        readmePath,
        shimDir: cli.available ? shimDir : undefined,
        cliDir: cli.available ? cli.cliDir : undefined,
        binaryPath: cli.available ? cli.binaryPath : undefined,
        binarySource: cli.available ? cli.source : undefined,
        pathInjected: available,
        autoApproveWrites,
        fallbackReason: available ? undefined : fallbackReason,
        env,
    };
}
export function createDisabledHostBridgeCliRunInjection() {
    return {
        available: false,
        endpoint: "",
        tokenMasked: "",
        profilePath: "",
        readmePath: "",
        pathInjected: false,
        autoApproveWrites: false,
        fallbackReason: "zotero_host_access_disabled",
        env: {},
    };
}
export function applyHostBridgeCliEnvToBackend(args) {
    const existingEnv = args.backend.env || {};
    const nextEnv = {
        ...existingEnv,
        ...args.injection.env,
    };
    if (args.injection.env.PATH) {
        const mergedPath = mergePathEntries(existingEnv.PATH || existingEnv.Path || resolveRuntimePathEnv(), splitPathEntries(args.injection.env.PATH));
        nextEnv.PATH = mergedPath;
        nextEnv.Path = mergedPath;
    }
    return {
        ...args.backend,
        env: nextEnv,
    };
}
export function summarizeHostBridgeCliRunInjection(injection) {
    return {
        available: injection.available,
        endpoint: injection.endpoint,
        tokenMasked: injection.tokenMasked,
        profilePath: injection.profilePath,
        readmePath: injection.readmePath,
        shimDir: injection.shimDir,
        cliDir: injection.cliDir,
        binarySource: injection.binarySource,
        pathInjected: injection.pathInjected,
        autoApproveWrites: injection.autoApproveWrites,
        fallbackReason: injection.fallbackReason,
    };
}
export const hostBridgeCliInjectionInternalsForTests = {
    prependPath,
    splitPathEntries,
    mergePathEntries,
    resolveRuntimePathEnv,
    buildShellShim,
    buildCmdShim,
    buildProfileJson,
    buildReadme,
};
