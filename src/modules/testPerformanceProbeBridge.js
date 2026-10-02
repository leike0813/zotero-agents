const HOOKS_KEY = "__zs_test_performance_probe_hooks__";
function getRuntime() {
    return globalThis;
}
function getHooks() {
    return getRuntime()[HOOKS_KEY] || null;
}
export function installTestPerformanceProbeHooksForTests(hooks) {
    getRuntime()[HOOKS_KEY] = hooks;
}
export function resetTestPerformanceProbeHooksForTests() {
    delete getRuntime()[HOOKS_KEY];
}
export function isTestPerformanceProbeEnabled() {
    return getHooks()?.enabled === true;
}
export function recordTestPerformanceSpan(args) {
    const hooks = getHooks();
    if (!hooks?.enabled || typeof hooks.recordSpan !== "function") {
        return;
    }
    hooks.recordSpan(args);
}
export async function measureAsyncTestPerformanceSpan(name, labels, work) {
    const hooks = getHooks();
    if (!hooks?.enabled || typeof hooks.recordSpan !== "function") {
        return work();
    }
    const startedAt = Date.now();
    try {
        return await work();
    }
    finally {
        hooks.recordSpan({
            name,
            startedAt,
            durationMs: Date.now() - startedAt,
            labels,
        });
    }
}
export function measureSyncTestPerformanceSpan(name, labels, work) {
    const hooks = getHooks();
    if (!hooks?.enabled || typeof hooks.recordSpan !== "function") {
        return work();
    }
    const startedAt = Date.now();
    try {
        return work();
    }
    finally {
        hooks.recordSpan({
            name,
            startedAt,
            durationMs: Date.now() - startedAt,
            labels,
        });
    }
}
