import { ACP_RUNTIME_PERFORMANCE_PROFILER_ENABLED, isDebugModeEnabled, } from "../../debugMode";
export const ACP_RUNTIME_PERFORMANCE_PROFILE_SCHEMA = "zotero-agents.acp-runtime-performance-profile.v1";
const MAX_ACTIVE_PROFILES = 8;
const MAX_COMPLETED_PROFILES = 8;
const MAX_METRIC_SERIES = 128;
const MAX_PUBLICATION_LIFECYCLES = 4096;
const DRIFT_INTERVAL_MS = 100;
const DURATION_BUCKETS_MS = [
    1, 4, 8, 16, 33, 50, 100, 250, 500, 1000, 5000,
];
let enabled = false;
let state = null;
let testOptions = {};
function isProfilerDebugModeEnabled() {
    const sourceEnabled = typeof __acp_runtime_performance_profiler_enabled__ !== "undefined"
        ? __acp_runtime_performance_profiler_enabled__
        : ACP_RUNTIME_PERFORMANCE_PROFILER_ENABLED;
    if (!sourceEnabled) {
        return false;
    }
    if (typeof __debug_mode__ !== "undefined") {
        return __debug_mode__;
    }
    return isDebugModeEnabled();
}
export function readAcpRuntimePerformanceClockMs() {
    try {
        const value = (testOptions.now || (() => globalThis.performance?.now?.() ?? Date.now()))();
        return Number.isFinite(value) ? value : 0;
    }
    catch {
        return 0;
    }
}
function setProfilerTimer(callback, delayMs) {
    try {
        return (testOptions.setTimer || ((fn, delay) => setTimeout(fn, delay)))(callback, delayMs);
    }
    catch {
        return null;
    }
}
function clearProfilerTimer(timer) {
    if (timer === null) {
        return;
    }
    try {
        (testOptions.clearTimer ||
            ((value) => clearTimeout(value)))(timer);
    }
    catch {
        // Profiler cleanup must never affect the host operation.
    }
}
function createProfile(context, startedAtMs = readAcpRuntimePerformanceClockMs()) {
    return {
        ...context,
        requestId: String(context.requestId || "").trim(),
        startedAtMs,
        metrics: new Map(),
        publicationLifecycles: new Map(),
        metricSeriesDrops: 0,
        publicationLifecycleDrops: 0,
        publicationDiagnostics: [],
    };
}
function createState() {
    return {
        global: createProfile({
            requestId: "",
            displayMode: "silent",
            transport: "unknown",
            zoteroMajor: "unknown",
        }),
        active: new Map(),
        aliases: new Map(),
        completed: [],
        timer: null,
        expectedDriftAtMs: 0,
    };
}
function normalizeLabels(labels = {}) {
    const result = {};
    for (const key of [
        "updateClass",
        "changeKind",
        "surfaceState",
        "operationClass",
        "persistenceChannel",
        "semanticKind",
        "disposition",
        "publicationKind",
        "publicationCausality",
        "publicationPhase",
        "publicationSurface",
        "publicationForm",
        "publicationCause",
        "materializationSource",
        "renderPath",
    ]) {
        const value = labels[key];
        if (value) {
            result[key] = value;
        }
    }
    return result;
}
function recordPublicationLifecycle(profile, name, labels, delta) {
    const stage = name === "panel_post" ? "post" : null;
    const publicationId = String(labels.publicationId || "").trim();
    if (name === "panel_shell_forward" ||
        name === "panel_child_apply" ||
        name === "panel_render_ack") {
        return false;
    }
    if (!stage)
        return true;
    if (!publicationId)
        return false;
    let lifecycle = profile.publicationLifecycles.get(publicationId);
    if (!lifecycle) {
        if (stage !== "post")
            return false;
        if (profile.publicationLifecycles.size >= MAX_PUBLICATION_LIFECYCLES) {
            profile.publicationLifecycleDrops += 1;
            return false;
        }
        lifecycle = {
            publicationId,
            source: labels.publicationSurface || "acp-chat",
            kind: labels.publicationKind || "owner-control",
            publicationForm: labels.publicationForm === "snapshot" ||
                labels.publicationForm === "delta"
                ? labels.publicationForm
                : "region",
            publicationCause: labels.publicationCause || "steady-state",
            deliverySequence: Math.max(0, Number(labels.publicationDeliverySequence) || 0),
            postedAtMs: readAcpRuntimePerformanceClockMs(),
            acknowledgements: [],
            terminal: null,
            post: 0,
            shellForward: 0,
            childApply: 0,
            renderAck: 0,
        };
        profile.publicationLifecycles.set(publicationId, lifecycle);
    }
    lifecycle[stage] += delta;
    return true;
}
function seriesKey(name, labels) {
    return `${name}|${Object.entries(labels)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${value}`)
        .join("|")}`;
}
function resolveProfile(requestIdRaw) {
    if (!enabled || !state) {
        return null;
    }
    const requestId = String(requestIdRaw || "").trim();
    if (!requestId)
        return state.global;
    const rootRequestId = state.aliases.get(requestId);
    return (state.active.get(requestId) ||
        (rootRequestId ? state.active.get(rootRequestId) : null) ||
        null);
}
function getOrCreateSeries(profile, name, labelsRaw, kind) {
    const labels = normalizeLabels(labelsRaw);
    const key = seriesKey(name, labels);
    const existing = profile.metrics.get(key);
    if (existing) {
        return existing.kind === kind ? existing : null;
    }
    if (profile.metrics.size >= MAX_METRIC_SERIES) {
        profile.metricSeriesDrops += 1;
        return null;
    }
    const series = {
        name,
        labels,
        kind,
        total: 0,
        count: 0,
        max: 0,
        buckets: DURATION_BUCKETS_MS.map(() => 0),
    };
    profile.metrics.set(key, series);
    return series;
}
export function recordAcpRuntimePublicationAck(requestId, ack) {
    recordSafely(() => {
        const profile = resolveProfile(requestId);
        if (!profile)
            return;
        const publicationId = String(ack.publicationId || "").trim();
        const lifecycle = profile.publicationLifecycles.get(publicationId);
        if (!lifecycle) {
            if (profile.publicationDiagnostics.length >= 64) {
                profile.publicationDiagnostics.splice(0, profile.publicationDiagnostics.length - 63);
            }
            profile.publicationDiagnostics.push({
                code: "out-of-window-ack",
                publicationId,
                stage: ack.stage,
                outcome: ack.outcome,
                reason: ack.reason,
                failure: ack.failure || null,
            });
            return;
        }
        const duplicate = lifecycle.acknowledgements.some((entry) => entry.stage === ack.stage &&
            entry.outcome === ack.outcome &&
            entry.reason === ack.reason &&
            (entry.failure?.stage || "") === (ack.failure?.stage || "") &&
            (entry.failure?.code || "") === (ack.failure?.code || ""));
        if (!duplicate) {
            lifecycle.acknowledgements = [
                ...lifecycle.acknowledgements,
                {
                    stage: ack.stage,
                    outcome: ack.outcome,
                    reason: ack.reason,
                    failure: ack.failure || null,
                    atMs: readAcpRuntimePerformanceClockMs(),
                },
            ].slice(-16);
        }
        if (ack.stage === "shell-forward" && ack.outcome === "accepted") {
            lifecycle.shellForward = 1;
        }
        if (ack.stage === "child-apply" && ack.outcome === "accepted") {
            lifecycle.childApply = 1;
        }
        const terminal = ack.outcome === "rejected" || ack.stage === "render-complete";
        if (terminal && !lifecycle.terminal) {
            lifecycle.terminal = {
                outcome: ack.outcome,
                reason: ack.reason,
                failure: ack.failure || null,
                atMs: readAcpRuntimePerformanceClockMs(),
            };
            lifecycle.renderAck =
                ack.stage === "render-complete" && ack.outcome === "accepted" ? 1 : 0;
        }
    });
}
function recordSafely(work) {
    if (!enabled || !isProfilerDebugModeEnabled()) {
        return;
    }
    try {
        work();
    }
    catch {
        // Profiling is observational and must never affect runtime behavior.
    }
}
function scheduleDriftProbe() {
    if (!enabled || !state || state.active.size === 0 || state.timer !== null) {
        return;
    }
    const current = readAcpRuntimePerformanceClockMs();
    state.expectedDriftAtMs = current + DRIFT_INTERVAL_MS;
    state.timer = setProfilerTimer(() => {
        if (!state) {
            return;
        }
        state.timer = null;
        const drift = Math.max(0, readAcpRuntimePerformanceClockMs() - state.expectedDriftAtMs);
        observeAcpRuntimeDuration(null, "event_loop_drift", {}, drift);
        for (const requestId of state.active.keys()) {
            observeAcpRuntimeDuration(requestId, "event_loop_drift", {}, drift);
        }
        scheduleDriftProbe();
    }, DRIFT_INTERVAL_MS);
}
function stopDriftProbe() {
    if (!state) {
        return;
    }
    clearProfilerTimer(state.timer);
    state.timer = null;
    state.expectedDriftAtMs = 0;
}
export function enableAcpRuntimePerformanceProfiler() {
    if (!isProfilerDebugModeEnabled()) {
        return false;
    }
    if (!enabled) {
        enabled = true;
        state = createState();
    }
    return true;
}
export function disableAcpRuntimePerformanceProfiler() {
    stopDriftProbe();
    enabled = false;
    state = null;
}
export function isAcpRuntimePerformanceProfilerEnabled() {
    return enabled && isProfilerDebugModeEnabled();
}
export function startAcpRuntimeProfile(context) {
    recordSafely(() => {
        if (!state) {
            return;
        }
        const requestId = String(context.requestId || "").trim();
        if (!requestId || state.active.has(requestId)) {
            return;
        }
        if (state.active.size >= MAX_ACTIVE_PROFILES) {
            incrementAcpRuntimeMetric(null, "dropped_profile_start");
            return;
        }
        state.active.set(requestId, createProfile({ ...context, requestId }));
        scheduleDriftProbe();
    });
}
export function registerAcpRuntimeProfileAlias(rootRequestIdRaw, aliasRequestIdRaw) {
    if (!enabled || !state || !isProfilerDebugModeEnabled())
        return false;
    const rootRequestId = String(rootRequestIdRaw || "").trim();
    const aliasRequestId = String(aliasRequestIdRaw || "").trim();
    if (!rootRequestId ||
        !aliasRequestId ||
        rootRequestId === aliasRequestId ||
        !state.active.has(rootRequestId) ||
        (state.active.has(aliasRequestId) && aliasRequestId !== rootRequestId)) {
        return false;
    }
    const existingRoot = state.aliases.get(aliasRequestId);
    if (existingRoot && existingRoot !== rootRequestId)
        return false;
    state.aliases.set(aliasRequestId, rootRequestId);
    return true;
}
export function finishAcpRuntimeProfile(requestIdRaw) {
    recordSafely(() => {
        if (!state) {
            return;
        }
        const requestId = String(requestIdRaw || "").trim();
        const profile = state.active.get(requestId);
        if (!profile) {
            return;
        }
        state.active.delete(requestId);
        for (const [aliasRequestId, rootRequestId] of state.aliases) {
            if (rootRequestId === requestId)
                state.aliases.delete(aliasRequestId);
        }
        profile.finishedAtMs = readAcpRuntimePerformanceClockMs();
        state.completed.push(profile);
        if (state.completed.length > MAX_COMPLETED_PROFILES) {
            state.completed.splice(0, state.completed.length - MAX_COMPLETED_PROFILES);
        }
        if (state.active.size === 0) {
            stopDriftProbe();
        }
    });
}
export function incrementAcpRuntimeMetric(requestId, name, labels = {}, delta = 1) {
    recordSafely(() => {
        const profile = resolveProfile(requestId);
        if (!profile) {
            return;
        }
        const ownedPublicationStage = recordPublicationLifecycle(profile, name, labels, Number.isFinite(delta) ? delta : 0);
        if (!ownedPublicationStage)
            return;
        const series = getOrCreateSeries(profile, name, labels, "counter");
        if (series) {
            series.total += Number.isFinite(delta) ? delta : 0;
        }
    });
}
export function observeAcpRuntimeDuration(requestId, name, labels = {}, durationMs = 0) {
    recordSafely(() => {
        const profile = resolveProfile(requestId);
        if (!profile) {
            return;
        }
        const series = getOrCreateSeries(profile, name, labels, "duration");
        if (!series) {
            return;
        }
        const duration = Math.max(0, Number.isFinite(durationMs) ? durationMs : 0);
        series.count += 1;
        series.total += duration;
        series.max = Math.max(series.max, duration);
        const bucketIndex = DURATION_BUCKETS_MS.findIndex((upperBound) => duration <= upperBound);
        series.buckets[bucketIndex >= 0 ? bucketIndex : series.buckets.length - 1] += 1;
    });
}
export function observeAcpRuntimeGauge(requestId, name, labels = {}, value = 0) {
    recordSafely(() => {
        const profile = resolveProfile(requestId);
        if (!profile) {
            return;
        }
        const series = getOrCreateSeries(profile, name, labels, "gauge");
        if (!series) {
            return;
        }
        const normalized = Number.isFinite(value) ? value : 0;
        series.total = normalized;
        series.max = Math.max(series.max, normalized);
    });
}
function metricSnapshot(series) {
    const base = {
        name: series.name,
        labels: { ...series.labels },
    };
    if (series.kind === "counter") {
        return { ...base, counter: { total: series.total } };
    }
    if (series.kind === "gauge") {
        return {
            ...base,
            gauge: { current: series.total, max: series.max },
        };
    }
    return {
        ...base,
        duration: {
            count: series.count,
            totalMs: series.total,
            maxMs: series.max,
            buckets: [...series.buckets],
        },
    };
}
function profileSnapshot(profile) {
    return {
        requestId: profile.requestId,
        displayMode: profile.displayMode,
        transport: profile.transport,
        zoteroMajor: profile.zoteroMajor,
        startedAtMs: profile.startedAtMs,
        ...(typeof profile.finishedAtMs === "number"
            ? { finishedAtMs: profile.finishedAtMs }
            : {}),
        metrics: Array.from(profile.metrics.values(), metricSnapshot),
        publicationLifecycles: Array.from(profile.publicationLifecycles.values(), (entry) => ({
            ...entry,
            acknowledgements: entry.acknowledgements.map((ack) => ({
                ...ack,
                failure: ack.failure ? { ...ack.failure } : null,
            })),
            terminal: entry.terminal
                ? {
                    ...entry.terminal,
                    failure: entry.terminal.failure
                        ? { ...entry.terminal.failure }
                        : null,
                }
                : null,
        })),
        metricSeriesDrops: profile.metricSeriesDrops,
        publicationLifecycleDrops: profile.publicationLifecycleDrops,
        measurement: profile.metricSeriesDrops > 0 || profile.publicationLifecycleDrops > 0
            ? "incomplete"
            : "complete",
        publicationDiagnostics: profile.publicationDiagnostics.map((entry) => ({
            ...entry,
            failure: entry.failure ? { ...entry.failure } : null,
        })),
    };
}
function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
        return value;
    }
    Object.freeze(value);
    for (const child of Object.values(value)) {
        deepFreeze(child);
    }
    return value;
}
export function snapshotAcpRuntimeProfiles() {
    if (!enabled || !state || !isProfilerDebugModeEnabled()) {
        return undefined;
    }
    try {
        return deepFreeze({
            schema: ACP_RUNTIME_PERFORMANCE_PROFILE_SCHEMA,
            generatedAtMs: readAcpRuntimePerformanceClockMs(),
            limits: {
                activeProfiles: MAX_ACTIVE_PROFILES,
                completedProfiles: MAX_COMPLETED_PROFILES,
                metricSeriesPerProfile: MAX_METRIC_SERIES,
                publicationLifecyclesPerProfile: MAX_PUBLICATION_LIFECYCLES,
                durationBucketsMs: DURATION_BUCKETS_MS,
            },
            global: profileSnapshot(state.global),
            active: Array.from(state.active.values(), profileSnapshot),
            completed: state.completed.map(profileSnapshot),
        });
    }
    catch {
        return undefined;
    }
}
export function configureAcpRuntimePerformanceProfilerForTests(options = {}) {
    testOptions = { ...options };
}
export function resetAcpRuntimePerformanceProfilerForTests() {
    disableAcpRuntimePerformanceProfiler();
    testOptions = {};
}
