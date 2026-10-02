import { SYNTHESIS_SIDECAR_LAUNCH_CONFIG_SCHEMA, SYNTHESIS_SIDECAR_PROTOCOL, rebuildSynthesisProductionDiscovery, rebuildSynthesisSidecarLaunchConfig, } from "../../../../packages/synthesis-contracts/src";
import { sha256Hex } from "../../../platform/hash";
import { readRuntimeEnv } from "../../../platform/env";
import { joinPath } from "../../../utils/path";
import { yieldToEventLoop } from "../../../utils/runtimeCompatibility";
import { getMozillaSubprocessModule, normalizeSubprocessExitCode, } from "../../../platform/subprocess";
import { ensureRuntimeDirectory, getRuntimePersistencePaths, getSynthesisSidecarLifecyclePaths, readRuntimeTextFile, removeRuntimePath, runtimePathExists, replacePrivateRuntimeTextFileAtomically, } from "../../runtimePersistence";
import { isSystemE2ELaunchFaultArmed, isSystemE2ETestRun, } from "../../systemE2ETestRun";
import { appendRuntimeLog } from "../../runtimeLogManager";
import { SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION } from "../../../../packages/synthesis-contracts/src/schemaVersion";
import { createSynthesisProductionSidecarControlClient, } from "./synthesisSidecarControlClient";
import { createSynthesisSidecarRuntimeInstaller, } from "./synthesisSidecarRuntimeInstaller";
import { rebuildSynthesisSidecarObservationEvent } from "../../../../packages/synthesis-contracts/src/sidecarObservability";
import { isSynthesisSidecarDiagnosticsAvailable } from "../../debugMode";
import { retainSynthesisSidecarNativeTraceEvent } from "./synthesisSidecarTrace";
export function narrowSynthesisSidecarHealth(health) {
    return {
        serviceVersion: health.serviceVersion,
        serviceInstanceId: health.serviceInstanceId,
        bundleId: health.bundleId,
        computePool: {
            state: health.computePool.state,
            active: health.computePool.active,
            queued: health.computePool.queued,
        },
    };
}
const DEFAULT_DISCOVERY_TIMEOUT_MS = 10_000;
const DEFAULT_HEALTH_INTERVAL_MS = 60_000;
const DEFAULT_RESTART_DELAYS_MS = [1_000, 5_000, 15_000];
const DIAGNOSTIC_TAIL_LIMIT = 64 * 1024;
const DISCOVERY_POLL_MS = 100;
function errorCode(error) {
    return ((error instanceof Error ? error.message : String(error || ""))
        .trim()
        .split(/\s+/)[0]
        ?.slice(0, 128) || "sidecar_unknown_failure");
}
const XPCOM_FAILURE_PATTERN = /failure code: (0x[0-9a-f]+) \(([A-Z][A-Z0-9_]*)\)/i;
function launchStageForStep(step) {
    if (step === "spawn") {
        return "spawn";
    }
    return step === "discovery" ? "pre-discovery" : "pre-create";
}
/**
 * Reads the platform error identity a classification needs. Gecko exposes the
 * nsresult as a structured `result` on the thrown object and repeats it inside
 * the message; the message is only inspected when the structured value is
 * missing.
 */
function launchErrorIdentity(error) {
    const candidate = (error ?? {});
    const message = typeof candidate.message === "string"
        ? candidate.message
        : String(error ?? "");
    const parsed = XPCOM_FAILURE_PATTERN.exec(message);
    const declaredName = typeof candidate.name === "string" &&
        candidate.name.length > 0 &&
        candidate.name !== "Error"
        ? candidate.name
        : undefined;
    const errorName = parsed?.[2] ?? declaredName;
    const errorNumber = typeof candidate.result === "number"
        ? `0x${(candidate.result >>> 0).toString(16)}`
        : parsed?.[1]?.toLowerCase();
    return {
        ...(errorName ? { errorName } : {}),
        ...(errorNumber ? { errorNumber } : {}),
    };
}
function defaultRandomHex(byteCount) {
    const bytes = new Uint8Array(byteCount);
    const crypto = globalThis.crypto;
    if (typeof crypto?.getRandomValues !== "function") {
        throw new Error("sidecar_secure_random_unavailable");
    }
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function normalizeProfilePath(pathRaw) {
    const normalized = String(pathRaw || "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/\/+$/g, "");
    if (!normalized) {
        throw new Error("sidecar_profile_path_unavailable");
    }
    return normalized;
}
function resolveProfilePath() {
    const runtime = globalThis;
    return normalizeProfilePath(String(runtime.Services?.dirsvc?.get?.("ProfD", runtime.Components?.interfaces?.nsIFile)?.path || ""));
}
async function hashText(value) {
    return sha256Hex(new TextEncoder().encode(value));
}
function sealedEnvironment() {
    const environment = {};
    for (const key of [
        "SystemRoot",
        "WINDIR",
        "TEMP",
        "TMP",
        "TMPDIR",
        "LANG",
        "LC_ALL",
        "TZ",
    ]) {
        const value = readRuntimeEnv(key);
        if (value) {
            environment[key] = value;
        }
    }
    return environment;
}
/**
 * The launch step and sanitized error identity of one failed attempt. The
 * sidecar stderr tail stays private, so evidence would otherwise only ever see
 * a reason code with no way to tell a launch that never created a process from
 * one that never reached discovery (observed on Windows runners).
 *
 * The fields are added only for a System E2E run: production entries keep the
 * business-level facts they always carried.
 */
function launchFailureClassification(failure) {
    return failure && isSystemE2ETestRun()
        ? {
            stage: launchStageForStep(failure.step),
            step: failure.step,
            ...launchErrorIdentity(failure.error),
            ...(failure.attemptedChars === undefined
                ? {}
                : { attemptedChars: failure.attemptedChars }),
        }
        : {};
}
/**
 * Records the sanitized facts of a terminal sidecar launch failure.
 */
function recordSidecarLaunchFailure(args) {
    const classification = launchFailureClassification(args.failure);
    appendRuntimeLog({
        level: "error",
        scope: "system",
        component: "synthesis-sidecar-runtime",
        operation: "launch",
        phase: "launch",
        stage: "failed",
        message: `Synthesis sidecar launch failed: ${args.code}`,
        details: {
            code: args.code,
            lastFailureCode: args.lastFailureCode,
            restartCount: args.restartCount,
            exitCode: args.exitCode,
            ...classification,
        },
    });
}
function appendTail(current, chunk) {
    const combined = `${current}${chunk}`;
    return combined.length <= DIAGNOSTIC_TAIL_LIMIT
        ? combined
        : combined.slice(-DIAGNOSTIC_TAIL_LIMIT);
}
export function parseNativeDiagnosticEvent(source) {
    let value;
    try {
        value = JSON.parse(source);
    }
    catch {
        return undefined;
    }
    try {
        const event = rebuildSynthesisSidecarObservationEvent(value);
        return event.source === "rust-sidecar" || event.source === "child-worker"
            ? event
            : undefined;
    }
    catch {
        return undefined;
    }
}
export function parseNativeStableFailureCode(source) {
    const match = source.trim().match(/^([a-z][a-z0-9_.-]{0,127})(?::|$)/);
    return match?.[1];
}
function waitForPromise(promise, timeoutMs) {
    return Promise.race([
        promise.then(() => true, () => true),
        new Promise((resolve) => {
            globalThis.setTimeout(() => resolve(false), timeoutMs);
        }),
    ]);
}
function validateInstall(install) {
    if (install.state !== "ready" ||
        install.implementation !== "rust-native" ||
        !install.bundleId ||
        !install.executablePath ||
        !install.buildFingerprint ||
        !install.targetTriple ||
        !install.serviceVersion ||
        install.protocolVersion !== SYNTHESIS_SIDECAR_PROTOCOL ||
        !install.platformSignature) {
        throw new Error(install.diagnostics[0]?.code || "synthesis_sidecar_runtime_unavailable");
    }
}
export function createSynthesisProductionRuntimeSupervisor(options) {
    const persistence = getRuntimePersistencePaths();
    const runtimeRoot = options.runtimeRoot || persistence.runtimeRoot;
    const now = options.now || Date.now;
    const randomHex = options.randomHex || defaultRandomHex;
    const setTimer = options.setTimeout || globalThis.setTimeout;
    const clearTimer = options.clearTimeout || globalThis.clearTimeout;
    const discoveryTimeoutMs = options.discoveryTimeoutMs ?? DEFAULT_DISCOVERY_TIMEOUT_MS;
    const healthIntervalMs = options.healthIntervalMs ?? DEFAULT_HEALTH_INTERVAL_MS;
    const restartDelaysMs = options.restartDelaysMs ?? DEFAULT_RESTART_DELAYS_MS;
    const installer = options.installer ||
        createSynthesisSidecarRuntimeInstaller({ runtimeRoot });
    const subprocess = options.subprocess === undefined
        ? getMozillaSubprocessModule()
        : options.subprocess;
    const controlClient = options.controlClient || createSynthesisProductionSidecarControlClient();
    const diagnosticsEnabled = options.diagnosticsEnabled ??
        (isSynthesisSidecarDiagnosticsAvailable() || isSystemE2ETestRun());
    let snapshot = {
        status: "stopped",
        recoveryState: "none",
        restartCount: 0,
    };
    let session = null;
    let controlledStop = false;
    let restartTimer = null;
    let healthTimer = null;
    let generation = 0;
    const subscribers = new Set();
    const publish = (update) => {
        snapshot = { ...snapshot, ...update };
        for (const subscriber of subscribers) {
            subscriber({ ...snapshot });
        }
    };
    const clearTimers = () => {
        if (restartTimer !== null) {
            clearTimer(restartTimer);
            restartTimer = null;
        }
        if (healthTimer !== null) {
            clearTimer(healthTimer);
            healthTimer = null;
        }
    };
    const drainStream = async (current, stream, kind) => {
        if (typeof stream?.readString !== "function") {
            return;
        }
        for (;;) {
            const chunk = await stream.readString();
            if (!chunk) {
                if (kind === "stderr" && current.stderrLineBuffer) {
                    current.stableFailureCode ||= parseNativeStableFailureCode(current.stderrLineBuffer);
                    current.stderrLineBuffer = "";
                }
                return;
            }
            if (diagnosticsEnabled) {
                if (kind === "stdout") {
                    current.stdoutTail = appendTail(current.stdoutTail, chunk);
                }
                else {
                    current.stderrTail = appendTail(current.stderrTail, chunk);
                }
            }
            const bufferKey = kind === "stdout" ? "stdoutLineBuffer" : "stderrLineBuffer";
            const source = `${current[bufferKey]}${chunk}`;
            const lines = source.split(/\r?\n/);
            current[bufferKey] = lines.pop()?.slice(-DIAGNOSTIC_TAIL_LIMIT) || "";
            for (const line of lines) {
                const event = kind === "stderr" ? parseNativeDiagnosticEvent(line) : undefined;
                if (event) {
                    retainSynthesisSidecarNativeTraceEvent(event);
                    options.recordTraceEvent?.(event);
                }
                if (kind === "stderr") {
                    current.stableFailureCode ||= parseNativeStableFailureCode(line);
                }
            }
            await yieldToEventLoop();
        }
    };
    const stopProcess = async (current) => {
        try {
            if (current.connection) {
                await controlClient.shutdown(current.connection).catch(() => undefined);
            }
        }
        finally {
            await current.proc?.stdin?.close?.().catch(() => undefined);
        }
        if (current.closed && (await waitForPromise(current.closed, 500))) {
            return;
        }
        try {
            current.proc?.kill?.(0);
        }
        catch {
            // The process may already have observed parent-pipe EOF.
        }
        if (current.closed) {
            await waitForPromise(current.closed, 200);
        }
    };
    const cleanupSession = async (current) => {
        const removed = await removeRuntimePath(current.paths.sessionRoot).catch(() => false);
        // A session root that survives publishes a discovery for a generation that
        // is gone, so a removal that did not take effect is reported rather than
        // swallowed.
        if (!removed && (await runtimePathExists(current.paths.sessionRoot))) {
            console.error(`[system-e2e] sidecar session cleanup left ${current.paths.sessionRoot}`);
        }
    };
    // A deterministic failure is the same failure on every attempt, so retrying
    // it only delays the terminal state. A production-lock conflict is not one of
    // them: it means another generation was still running when this launch
    // started, which the bounded retry policy resolves as soon as that process is
    // gone and the fuse bounds it otherwise.
    const classifyTerminal = (code) => code !== "production_lock_conflict" &&
        [
            "invalid_config",
            "unsupported_target",
            "sidecar_runtime_",
            "sidecar_discovery_identity_mismatch",
            "sidecar_health_identity_mismatch",
            "sidecar_handshake_identity_mismatch",
            "protocol_mismatch",
            "schema_mismatch",
            "profile_mismatch",
            "repository_",
            "legacy_schema_",
            "canonical_",
        ].some((prefix) => code.startsWith(prefix));
    const fail = async (code, current, launchGeneration = generation, failure) => {
        if (launchGeneration !== generation) {
            return;
        }
        clearTimers();
        if (current) {
            await stopProcess(current);
            await cleanupSession(current);
        }
        if (session === current) {
            session = null;
        }
        if (controlledStop) {
            return;
        }
        const terminal = classifyTerminal(code);
        const restartCount = terminal
            ? snapshot.restartCount
            : snapshot.restartCount + 1;
        if (terminal || restartCount > restartDelaysMs.length) {
            const reasonCode = terminal || restartCount <= restartDelaysMs.length
                ? code
                : "sidecar_crash_loop_fused";
            publish({
                status: code.includes("mismatch") ? "incompatible" : "unavailable",
                recoveryState: "manual-recovery-required",
                reasonCode,
                restartCount,
                nextRestartAt: undefined,
            });
            recordSidecarLaunchFailure({
                code: reasonCode,
                lastFailureCode: code,
                restartCount,
                exitCode: current?.exitCode ?? null,
                ...(failure ? { failure } : {}),
            });
            return;
        }
        const restartAt = now() + restartDelaysMs[restartCount - 1];
        publish({
            status: "unavailable",
            recoveryState: "scheduled",
            reasonCode: code,
            restartCount,
            nextRestartAt: new Date(restartAt).toISOString(),
        });
        // A scheduled restart is the one lifecycle state that used to leave no
        // evidence at all: the terminal entry only lands when the budget is spent,
        // so a runtime that kept restarting inside its budget looked idle.
        appendRuntimeLog({
            level: "warn",
            scope: "system",
            component: "synthesis-sidecar-runtime",
            operation: "launch",
            phase: "launch",
            stage: "restart-scheduled",
            message: `Synthesis sidecar restart scheduled: ${code}`,
            details: {
                code,
                restartCount,
                attemptBudget: restartDelaysMs.length,
                nextRestartAt: new Date(restartAt).toISOString(),
                exitCode: current?.exitCode ?? null,
                ...launchFailureClassification(failure),
            },
        });
        restartTimer = setTimer(() => {
            restartTimer = null;
            if (launchGeneration === generation && !controlledStop) {
                void launch(launchGeneration);
            }
        }, Math.max(0, restartAt - now()));
    };
    const waitForDiscovery = async (current) => {
        const deadline = now() + discoveryTimeoutMs;
        while (now() < deadline && session === current && !controlledStop) {
            const source = (await readRuntimeTextFile(current.paths.discoveryPath)).trim();
            if (source) {
                try {
                    return rebuildSynthesisProductionDiscovery(JSON.parse(source));
                }
                catch {
                    throw new Error("sidecar_discovery_identity_mismatch");
                }
            }
            await new Promise((resolve) => {
                setTimer(resolve, DISCOVERY_POLL_MS);
            });
        }
        throw new Error("sidecar_discovery_timeout");
    };
    const waitForDiscoveryOrExit = async (current) => {
        if (!current.closed) {
            return waitForDiscovery(current);
        }
        return Promise.race([
            waitForDiscovery(current),
            current.closed.then(async () => {
                await current.stderrDrain?.catch(() => undefined);
                throw new Error(current.stableFailureCode ||
                    "sidecar_process_exited_before_discovery");
            }),
        ]);
    };
    const scheduleHealth = (current) => {
        if (healthIntervalMs <= 0 || controlledStop || session !== current) {
            return;
        }
        healthTimer = setTimer(async () => {
            healthTimer = null;
            if (!current.connection || controlledStop || session !== current) {
                return;
            }
            try {
                const health = await controlClient.health(current.connection);
                publish({
                    ...narrowSynthesisSidecarHealth(health),
                    healthObservedAt: new Date(now()).toISOString(),
                });
                if (health.computePool.state === "degraded") {
                    await fail("sidecar_compute_pool_degraded", current);
                    return;
                }
                scheduleHealth(current);
            }
            catch {
                await fail("sidecar_health_failed", current);
            }
        }, healthIntervalMs);
    };
    async function launch(launchGeneration = generation) {
        if (launchGeneration !== generation || controlledStop) {
            return;
        }
        clearTimers();
        publish({
            status: "starting",
            recoveryState: "none",
            reasonCode: undefined,
            readyAt: undefined,
            nextRestartAt: undefined,
        });
        let current = null;
        let launchStep = "profile";
        let attemptedPathLength;
        try {
            if (!subprocess?.call) {
                throw new Error("sidecar_subprocess_unavailable");
            }
            const profilePath = normalizeProfilePath(options.profilePath || resolveProfilePath());
            const profileId = await hashText(profilePath);
            const supervisorInstanceId = `sup-${randomHex(16)}`;
            const paths = getSynthesisSidecarLifecyclePaths({
                runtimeRoot,
                profileId,
                supervisorInstanceId,
            });
            launchStep = "runtime-directory";
            attemptedPathLength = paths.sessionRoot.length;
            await ensureRuntimeDirectory(paths.sessionRoot);
            launchStep = "install";
            attemptedPathLength = undefined;
            const install = options.resolvedInstall ?? (await installer.ensureInstalled());
            validateInstall(install);
            current = {
                paths,
                install,
                stdoutTail: "",
                stderrTail: "",
                stdoutLineBuffer: "",
                stderrLineBuffer: "",
            };
            session = current;
            const config = rebuildSynthesisSidecarLaunchConfig({
                schema: SYNTHESIS_SIDECAR_LAUNCH_CONFIG_SCHEMA,
                profileId,
                libraryId: options.libraryId ?? 1,
                profileRuntimeRoot: paths.sessionRoot,
                // The E2E test seam shares its checkpoints with the sidecar through this
                // directory. It hangs off the plugin data root rather than the session
                // root, which is already close to the Windows path limit.
                ...(isSystemE2ETestRun()
                    ? { testCheckpointRoot: joinPath(runtimeRoot, "test-checkpoints") }
                    : {}),
                runtimeRootId: await hashText(runtimeRoot),
                dataRootId: await hashText(options.canonicalRoot),
                bundleId: install.bundleId,
                implementation: install.implementation,
                target: install.target,
                targetTriple: install.targetTriple,
                buildFingerprint: install.buildFingerprint,
                platformSignature: install.platformSignature,
                serviceVersion: install.serviceVersion,
                protocolVersion: install.protocolVersion,
                schemaVersion: SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION,
                supervisorInstanceId,
                diagnosticsEnabled,
                ...(options.startupTrace ? { startupTrace: options.startupTrace } : {}),
                repositoryDbPath: options.repositoryDbPath,
                canonicalRoot: options.canonicalRoot,
                reverseHost: options.reverseHost,
                clientToken: randomHex(32),
                lifecycleToken: randomHex(32),
                port: 0,
            });
            launchStep = "config-write";
            attemptedPathLength = paths.configPath.length;
            if (isSystemE2ELaunchFaultArmed()) {
                // The catalog's launch-failure case owns this fault: the launch input
                // is invalid before anything is written or spawned, which is the one
                // pre-ready failure the runner can produce deterministically on every
                // platform.
                throw new Error("invalid_config");
            }
            await replacePrivateRuntimeTextFileAtomically(paths.configPath, `${JSON.stringify(config)}\n`);
            launchStep = "spawn";
            attemptedPathLength = install.executablePath.length;
            const proc = await subprocess.call({
                command: install.executablePath,
                arguments: ["serve", "--config", paths.configPath],
                workdir: paths.sessionRoot,
                environment: sealedEnvironment(),
                environmentAppend: false,
                stderr: "pipe",
            });
            current.proc = proc;
            void drainStream(current, proc.stdout, "stdout").catch(() => undefined);
            current.stderrDrain = drainStream(current, proc.stderr, "stderr").catch(() => undefined);
            const exitedSession = current;
            exitedSession.closed = Promise.resolve()
                .then(() => proc.wait?.())
                .then((value) => {
                exitedSession.exitCode =
                    normalizeSubprocessExitCode(value) ??
                        normalizeSubprocessExitCode(proc.exitCode) ??
                        normalizeSubprocessExitCode(proc.exitValue);
                return undefined;
            }, () => undefined);
            void exitedSession.closed.then(() => {
                if (session !== current) {
                    // The supervisor already moved on before this generation's exit was
                    // observed, so no `fail`/`stop` path will ever run for it. Its
                    // runtime path and discovery still have to go: leaving them behind
                    // publishes a ready discovery for a dead process, and every reader
                    // that trusts it keeps failing on a generation that is gone
                    // (observed as a stuck run on Windows).
                    void cleanupSession(exitedSession);
                    return;
                }
                if (!controlledStop && snapshot.status !== "starting") {
                    void exitedSession.stderrDrain?.finally(() => fail(exitedSession.stableFailureCode || "sidecar_process_exited", exitedSession, launchGeneration, {
                        step: "discovery",
                        attemptedChars: exitedSession.paths.discoveryPath.length,
                    }));
                }
            });
            launchStep = "discovery";
            attemptedPathLength = paths.discoveryPath.length;
            const discovery = await waitForDiscoveryOrExit(current);
            if (discovery.profileId !== profileId ||
                discovery.supervisorInstanceId !== supervisorInstanceId ||
                discovery.bundleId !== install.bundleId ||
                discovery.buildFingerprint !== install.buildFingerprint ||
                discovery.schemaVersion !==
                    SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION ||
                discovery.runtimeRootId !== config.runtimeRootId ||
                discovery.dataRootId !== config.dataRootId) {
                throw new Error("sidecar_discovery_identity_mismatch");
            }
            const connection = {
                discovery,
                clientToken: config.clientToken,
                lifecycleToken: config.lifecycleToken,
            };
            const health = await controlClient.health(connection);
            await controlClient.handshake(connection);
            current.connection = connection;
            publish({
                status: "ready",
                recoveryState: "none",
                reasonCode: undefined,
                profileId,
                supervisorInstanceId,
                ...narrowSynthesisSidecarHealth(health),
                healthObservedAt: new Date(now()).toISOString(),
                readyAt: new Date(now()).toISOString(),
                nextRestartAt: undefined,
                // A generation that reached ready ends the failure episode, so the
                // retry budget and the fuse measure consecutive failures rather than
                // every isolated restart of one long-lived session.
                restartCount: 0,
            });
            scheduleHealth(current);
        }
        catch (error) {
            await fail(errorCode(error), current, launchGeneration, {
                step: launchStep,
                error,
                ...(attemptedPathLength === undefined
                    ? {}
                    : { attemptedChars: attemptedPathLength }),
            });
        }
    }
    async function stop() {
        generation += 1;
        controlledStop = true;
        clearTimers();
        const current = session;
        publish({
            status: "stopping",
            recoveryState: "none",
            nextRestartAt: undefined,
        });
        if (current) {
            await stopProcess(current);
            await cleanupSession(current);
        }
        if (session === current) {
            session = null;
        }
        publish({
            status: "stopped",
            recoveryState: "none",
            reasonCode: undefined,
            profileId: undefined,
            supervisorInstanceId: undefined,
            serviceInstanceId: undefined,
            bundleId: undefined,
            serviceVersion: undefined,
            healthObservedAt: undefined,
            computePool: undefined,
            readyAt: undefined,
            nextRestartAt: undefined,
            restartCount: 0,
        });
    }
    return {
        start() {
            if (snapshot.status === "starting" ||
                snapshot.status === "ready" ||
                snapshot.recoveryState === "scheduled") {
                return;
            }
            controlledStop = false;
            generation += 1;
            void launch(generation);
        },
        stop,
        recover() {
            if (snapshot.recoveryState !== "manual-recovery-required") {
                return;
            }
            controlledStop = false;
            publish({ restartCount: 0, reasonCode: undefined });
            generation += 1;
            void launch(generation);
        },
        getSnapshot() {
            return { ...snapshot };
        },
        getDiagnosticEvidence() {
            return {
                snapshot: { ...snapshot },
                stdoutTail: session?.stdoutTail || "",
                stderrTail: session?.stderrTail || "",
            };
        },
        subscribe(subscriber) {
            subscribers.add(subscriber);
            return () => subscribers.delete(subscriber);
        },
        getReadyConnection() {
            return snapshot.status === "ready" && session?.connection
                ? { ...session.connection }
                : null;
        },
        async observeHealth() {
            const current = session;
            if (snapshot.status !== "ready" ||
                !current?.connection ||
                controlledStop) {
                return { ...snapshot };
            }
            try {
                const health = await controlClient.health(current.connection);
                publish({
                    ...narrowSynthesisSidecarHealth(health),
                    healthObservedAt: new Date(now()).toISOString(),
                });
                if (health.computePool.state === "degraded") {
                    await fail("sidecar_compute_pool_degraded", current);
                }
            }
            catch {
                await fail("sidecar_health_failed", current);
            }
            return { ...snapshot };
        },
    };
}
export function createSynthesisSidecarRuntimeSupervisor(options = {}) {
    const persistence = getRuntimePersistencePaths();
    return createSynthesisProductionRuntimeSupervisor({
        ...options,
        libraryId: options.libraryId ?? 1,
        repositoryDbPath: options.repositoryDbPath || persistence.synthesisDbPath,
        canonicalRoot: options.canonicalRoot || persistence.synthesisDataRoot,
        reverseHost: options.reverseHost ||
            {
                host: "127.0.0.1",
                port: 1,
                authorizationToken: "0".repeat(64),
            },
    });
}
let defaultSupervisor = null;
let productionSupervisor = null;
function getDefaultSupervisor() {
    defaultSupervisor ||= createSynthesisSidecarRuntimeSupervisor();
    return defaultSupervisor;
}
export function startSynthesisSidecarRuntimeSupervisor() {
    getDefaultSupervisor().start();
}
export function stopSynthesisSidecarRuntimeSupervisor() {
    return getDefaultSupervisor().stop();
}
export function recoverSynthesisSidecarRuntimeSupervisor() {
    return getDefaultSupervisor().recover();
}
export function getSynthesisSidecarRuntimeSupervisorSnapshot() {
    return getDefaultSupervisor().getSnapshot();
}
export function subscribeSynthesisSidecarRuntimeSupervisor(subscriber) {
    return getDefaultSupervisor().subscribe(subscriber);
}
export function getReadySynthesisSidecarControlConnection() {
    return getDefaultSupervisor().getReadyConnection();
}
export function startSynthesisProductionRuntimeSupervisor(options) {
    if (productionSupervisor) {
        throw new Error("production_supervisor_already_configured");
    }
    productionSupervisor = createSynthesisProductionRuntimeSupervisor(options);
    productionSupervisor.start();
    return productionSupervisor;
}
export async function stopSynthesisProductionRuntimeSupervisor() {
    const current = productionSupervisor;
    productionSupervisor = null;
    await current?.stop();
}
export function recoverSynthesisProductionRuntimeSupervisor() {
    return productionSupervisor?.recover();
}
export function getReadySynthesisProductionControlConnection() {
    return productionSupervisor?.getReadyConnection() ?? null;
}
function workbenchSidecarStatus(value) {
    const snapshot = value || {
        status: "stopped",
        recoveryState: "none",
        restartCount: 0,
    };
    return {
        lifecycle: snapshot.status,
        recoveryState: snapshot.recoveryState,
        ...(snapshot.reasonCode ? { reasonCode: snapshot.reasonCode } : {}),
        ...(snapshot.healthObservedAt
            ? { healthObservedAt: snapshot.healthObservedAt }
            : {}),
        ...(snapshot.serviceInstanceId
            ? { serviceInstanceId: snapshot.serviceInstanceId }
            : {}),
        ...(snapshot.serviceVersion
            ? { serviceVersion: snapshot.serviceVersion }
            : {}),
        ...(snapshot.bundleId ? { bundleId: snapshot.bundleId } : {}),
        ...(snapshot.nextRestartAt
            ? { nextRestartAt: snapshot.nextRestartAt }
            : {}),
        ...(snapshot.computePool
            ? { computePool: { ...snapshot.computePool } }
            : {}),
    };
}
export function getSynthesisWorkbenchSidecarStatus() {
    return workbenchSidecarStatus(productionSupervisor?.getSnapshot() ?? defaultSupervisor?.getSnapshot());
}
export function subscribeSynthesisWorkbenchSidecarStatus(subscriber) {
    const supervisor = productionSupervisor ?? defaultSupervisor;
    if (!supervisor)
        return () => undefined;
    subscriber(workbenchSidecarStatus(supervisor.getSnapshot()));
    return supervisor.subscribe((snapshot) => subscriber(workbenchSidecarStatus(snapshot)));
}
export async function observeSynthesisWorkbenchSidecarStatus() {
    const supervisor = productionSupervisor ?? defaultSupervisor;
    if (supervisor)
        await supervisor.observeHealth();
    return getSynthesisWorkbenchSidecarStatus();
}
export async function resetSynthesisSidecarRuntimeSupervisorForTests() {
    if (defaultSupervisor) {
        await defaultSupervisor.stop();
        defaultSupervisor = null;
    }
    await stopSynthesisProductionRuntimeSupervisor();
}
export const synthesisSidecarRuntimeSupervisorInternalsForTests = {
    sealedEnvironment,
    appendTail,
    normalizeProfilePath,
    DEFAULT_DISCOVERY_TIMEOUT_MS,
    DEFAULT_HEALTH_INTERVAL_MS,
    DEFAULT_RESTART_DELAYS_MS,
    DIAGNOSTIC_TAIL_LIMIT,
};
