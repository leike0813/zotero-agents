import { getRuntimeCommandRegistrySnapshot, } from "./command";
import { detectRuntimePlatform } from "./runtimePlatform";
function normalizeString(value) {
    return String(value || "").trim();
}
let processControlSnapshot = {
    initialized: false,
    platform: detectRuntimePlatform(),
    preferredCleanupStrategy: "unsupported",
    supportsProcessTreeCleanup: false,
    supportsProcessGroupLaunch: false,
    supportsNegativePidSignal: false,
    supportsPidFileSupervisor: false,
    supportsProcessIdentityQuery: false,
};
function isCommandAvailable(snapshot, command) {
    return snapshot.commands[command]?.available === true;
}
function isSafeProcessGroupIdentity(identity) {
    return (Number.isSafeInteger(identity.pid) &&
        Number.isSafeInteger(identity.pgid) &&
        Number.isSafeInteger(identity.sid) &&
        identity.pid > 1 &&
        identity.pgid > 1 &&
        identity.sid > 1);
}
export function validatePosixProcessGroupOwnership(args) {
    if (args.strategy !== args.expectedStrategy) {
        return { ok: false, reason: "strategy-not-isolated" };
    }
    if (!args.identityQuerySupported) {
        return { ok: false, reason: "identity-query-unavailable" };
    }
    if (!args.childPid || !args.launchIdentity) {
        return { ok: false, reason: "launch-identity-unavailable" };
    }
    if (args.childPid <= 1 || !isSafeProcessGroupIdentity(args.launchIdentity)) {
        return { ok: false, reason: "unsafe-process-group" };
    }
    if (args.pidfileIdentity === null) {
        return { ok: false, reason: "pidfile-missing-or-invalid" };
    }
    if (args.pidfileIdentity && args.pidfileIdentity.pid !== args.childPid) {
        return { ok: false, reason: "pidfile-pid-mismatch" };
    }
    if (args.pidfileIdentity &&
        args.pidfileIdentity.token !== args.supervisorToken) {
        return { ok: false, reason: "pidfile-token-mismatch" };
    }
    if (!args.liveIdentity) {
        return { ok: false, reason: "live-process-missing" };
    }
    if (!isSafeProcessGroupIdentity(args.liveIdentity)) {
        return { ok: false, reason: "unsafe-process-group" };
    }
    if (args.liveIdentity.pid !== args.childPid ||
        args.liveIdentity.pid !== args.launchIdentity.pid) {
        return { ok: false, reason: "live-pid-mismatch" };
    }
    if (args.liveIdentity.pgid !== args.childPid ||
        args.liveIdentity.pgid !== args.launchIdentity.pgid) {
        return { ok: false, reason: "live-pgid-mismatch" };
    }
    if (args.liveIdentity.sid !== args.childPid ||
        args.liveIdentity.sid !== args.launchIdentity.sid) {
        return { ok: false, reason: "live-sid-mismatch" };
    }
    return {
        ok: true,
        target: Object.freeze({
            ...args.liveIdentity,
        }),
    };
}
export function buildPosixProcessGroupSignalInvocation(target, signal) {
    if (target.pgid <= 1 || !Number.isSafeInteger(target.pgid)) {
        throw new Error("validated POSIX process group target is unsafe");
    }
    return {
        signal,
        targetPgid: target.pgid,
        arguments: ["-s", signal, "--", `-${target.pgid}`],
    };
}
function cloneProcessControlSnapshot(snapshot) {
    return {
        ...snapshot,
        diagnostics: snapshot.diagnostics
            ? snapshot.diagnostics.map((entry) => ({ ...entry }))
            : undefined,
    };
}
function buildProcessControlSnapshot(options = {}) {
    const platform = normalizeString(options.platform) || detectRuntimePlatform();
    const commandRegistry = options.commandRegistry || getRuntimeCommandRegistrySnapshot();
    const diagnostics = [];
    const now = options.now || (() => new Date().toISOString());
    if (platform === "win32") {
        diagnostics.push({
            stage: "startup-process-control",
            ok: true,
            message: "Windows ACP process tree cleanup is delegated to bridge transports when available",
        });
        return {
            initialized: true,
            initializedAt: now(),
            platform,
            preferredCleanupStrategy: "windows-bridge",
            supportsProcessTreeCleanup: true,
            supportsProcessGroupLaunch: false,
            supportsNegativePidSignal: false,
            supportsPidFileSupervisor: false,
            supportsProcessIdentityQuery: false,
            diagnostics,
        };
    }
    const hasShell = isCommandAvailable(commandRegistry, "sh");
    const hasSetsid = isCommandAvailable(commandRegistry, "setsid");
    const hasKill = isCommandAvailable(commandRegistry, "kill");
    const hasProcessIdentityQuery = isCommandAvailable(commandRegistry, "ps");
    if (hasShell && hasSetsid && hasKill) {
        diagnostics.push({
            stage: "startup-process-control",
            ok: hasProcessIdentityQuery,
            message: hasProcessIdentityQuery
                ? "POSIX pidfile supervisor process-group cleanup with live identity validation is available"
                : "POSIX group launch is available but group signaling is disabled because live identity validation is unavailable",
        });
        return {
            initialized: true,
            initializedAt: now(),
            platform,
            preferredCleanupStrategy: "posix-pidfile-supervisor",
            supportsProcessTreeCleanup: hasProcessIdentityQuery,
            supportsProcessGroupLaunch: true,
            supportsNegativePidSignal: hasProcessIdentityQuery,
            supportsPidFileSupervisor: true,
            supportsProcessIdentityQuery: hasProcessIdentityQuery,
            diagnostics,
        };
    }
    diagnostics.push({
        stage: "startup-process-control",
        ok: false,
        message: `POSIX process tree cleanup unavailable; sh=${hasShell}, setsid=${hasSetsid}, kill=${hasKill}`,
    });
    return {
        initialized: true,
        initializedAt: now(),
        platform,
        preferredCleanupStrategy: "direct-kill-only",
        supportsProcessTreeCleanup: false,
        supportsProcessGroupLaunch: false,
        supportsNegativePidSignal: hasKill,
        supportsPidFileSupervisor: false,
        supportsProcessIdentityQuery: hasProcessIdentityQuery,
        diagnostics,
    };
}
export async function preflightRuntimeProcessControlOnStartup(options = {}) {
    if (processControlSnapshot.initialized) {
        return getRuntimeProcessControlSnapshot();
    }
    processControlSnapshot = buildProcessControlSnapshot(options);
    return getRuntimeProcessControlSnapshot();
}
export function getRuntimeProcessControlSnapshot() {
    return cloneProcessControlSnapshot(processControlSnapshot);
}
export function seedRuntimeProcessControlSnapshotForTests(snapshot) {
    processControlSnapshot = cloneProcessControlSnapshot(snapshot);
}
export function resetRuntimeProcessControlSnapshotForTests() {
    processControlSnapshot = {
        initialized: false,
        platform: detectRuntimePlatform(),
        preferredCleanupStrategy: "unsupported",
        supportsProcessTreeCleanup: false,
        supportsProcessGroupLaunch: false,
        supportsNegativePidSignal: false,
        supportsPidFileSupervisor: false,
        supportsProcessIdentityQuery: false,
    };
}
