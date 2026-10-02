const activeSyntheticAdapters = new Map();
function adapterKey(backendId, conversationId) {
    return `${backendId}\n${conversationId}`;
}
export function inspectAcpSyntheticConnectionAdapterTimers(args) {
    const active = activeSyntheticAdapters.get(adapterKey(args.backendId, args.conversationId));
    if (!active) {
        return {
            timers: [],
            warnings: ["logical-timer-contamination:acp-synthetic-adapter-missing"],
        };
    }
    // The synthetic adapter currently owns no native timers; the session
    // runtime timer surface is inspected separately by the session manager.
    return { timers: [], warnings: [] };
}
export function createAcpSyntheticConnectionAdapter(args) {
    const updateListeners = new Set();
    const closeListeners = new Set();
    const diagnosticsListeners = new Set();
    const permissionListeners = new Set();
    let activePermission;
    let closed = false;
    const unregister = () => {
        const key = adapterKey(args.backendId, args.conversationId);
        if (activeSyntheticAdapters.get(key) === adapter) {
            activeSyntheticAdapters.delete(key);
        }
    };
    const adapter = {
        initialize: async () => ({
            authMethods: [],
            agentName: "ACP Synthetic Replay",
            agentVersion: "0.0.0",
            commandLabel: "ACP Synthetic Replay",
            commandLine: "",
            canLoadSession: false,
            canResumeSession: false,
            canUseHttpMcp: false,
            canUseSseMcp: false,
        }),
        onUpdate: (listener) => {
            updateListeners.add(listener);
            return () => {
                updateListeners.delete(listener);
            };
        },
        onClose: (listener) => {
            closeListeners.add(listener);
            return () => {
                closeListeners.delete(listener);
            };
        },
        onDiagnostics: (listener) => {
            diagnosticsListeners.add(listener);
            return () => {
                diagnosticsListeners.delete(listener);
            };
        },
        onPermissionRequest: (listener) => {
            permissionListeners.add(listener);
            return () => {
                permissionListeners.delete(listener);
            };
        },
        newSession: async () => ({
            sessionId: args.sessionId,
        }),
        loadSession: async () => ({
            sessionId: args.sessionId,
        }),
        resumeSession: async () => ({
            sessionId: args.sessionId,
        }),
        prompt: async () => ({
            stopReason: "end_turn",
            observedAcpActivity: true,
        }),
        cancel: async () => undefined,
        setConfigOption: async () => false,
        setMode: async () => undefined,
        setModel: async () => undefined,
        authenticate: async () => undefined,
        close: async () => {
            if (closed) {
                return;
            }
            closed = true;
            const event = { message: "ACP synthetic replay closed" };
            for (const listener of [...closeListeners]) {
                try {
                    await listener(event);
                }
                catch {
                    // Close observers cannot block synthetic adapter disposal.
                }
            }
            closeListeners.clear();
            updateListeners.clear();
            diagnosticsListeners.clear();
            permissionListeners.clear();
            unregister();
        },
        emitSessionNotification: (event) => {
            if (closed)
                return;
            for (const listener of [...updateListeners]) {
                void listener(event);
            }
        },
        emitDiagnostic: (entry) => {
            if (closed)
                return;
            for (const listener of [...diagnosticsListeners]) {
                void listener(entry);
            }
        },
        emitPermissionRequest: (request) => {
            if (closed)
                return;
            const requestId = request.requestId ||
                `acp-synthetic-permission-${Date.now().toString(36)}`;
            const pending = {
                ...request,
                requestId,
                resolve: (outcome) => {
                    if (activePermission?.requestId !== requestId)
                        return;
                    activePermission = undefined;
                },
            };
            activePermission = {
                requestId,
                resolve: pending.resolve,
            };
            for (const listener of [...permissionListeners]) {
                void listener(pending);
            }
        },
        resolvePermission: (outcome) => {
            const pending = activePermission;
            if (!pending)
                return false;
            pending.resolve(outcome);
            return true;
        },
        emitClose: (event) => {
            for (const listener of [...closeListeners]) {
                void listener(event);
            }
        },
    };
    activeSyntheticAdapters.set(adapterKey(args.backendId, args.conversationId), adapter);
    return adapter;
}
