export function normalizeAcpPromptInterruptState(value) {
    switch (String(value || "").trim()) {
        case "requested":
        case "confirmed":
        case "forced":
        case "unconfirmed":
            return String(value).trim();
        default:
            return "idle";
    }
}
export function createEmptyAcpConversationSnapshot() {
    return {
        backend: null,
        backendId: "",
        conversationId: "",
        conversationTitle: "",
        conversationCreatedAt: "",
        sessionId: "",
        remoteSessionId: "",
        canLoadRemoteSession: false,
        canResumeRemoteSession: false,
        remoteSessionRestoreStatus: "none",
        remoteSessionRestoreMessage: "",
        status: "idle",
        busy: false,
        promptInterruptState: "idle",
        showDiagnostics: false,
        statusExpanded: false,
        chatDisplayMode: "plain",
        autoApproveAcpPermissions: false,
        lastError: "",
        prerequisiteError: "",
        authMethods: [],
        authMethodIds: [],
        commandLabel: "",
        commandLine: "",
        agentLabel: "",
        agentVersion: "",
        sessionTitle: "",
        sessionUpdatedAt: "",
        modeOptions: [],
        currentMode: undefined,
        modelOptions: [],
        currentModel: undefined,
        displayModelOptions: [],
        currentDisplayModel: undefined,
        reasoningEffortOptions: [],
        currentReasoningEffort: undefined,
        availableCommands: [],
        lastStopReason: "",
        usage: null,
        pendingPermissionRequest: null,
        diagnostics: [],
        transcriptPath: "",
        transcriptIndexPath: "",
        transcriptRevision: 0,
        transcriptEventSeq: 0,
        transcriptItemCount: 0,
        transcriptPreview: undefined,
        messageCounts: undefined,
        items: [],
        lastHostContext: null,
        agentWorkspaceDir: "",
        conversationStorageDir: "",
        sessionCwd: "",
        workspaceDir: "",
        runtimeDir: "",
        stderrTail: "",
        lastLifecycleEvent: "",
        updatedAt: new Date(0).toISOString(),
    };
}
export function normalizeAcpStatus(value) {
    switch (String(value || "").trim()) {
        case "checking-command":
        case "checking_command":
            return "checking-command";
        case "spawning":
            return "spawning";
        case "initializing":
            return "initializing";
        case "disconnecting":
            return "disconnecting";
        case "connected":
            return "connected";
        case "prompting":
            return "prompting";
        case "auth-required":
        case "auth_required":
            return "auth-required";
        case "permission-required":
        case "permission_required":
            return "permission-required";
        case "error":
            return "error";
        default:
            return "idle";
    }
}
export function cloneAcpSelectableOption(value) {
    if (!value) {
        return undefined;
    }
    return {
        id: value.id,
        label: value.label,
        description: value.description,
    };
}
export function cloneAcpConversationItem(item) {
    if (item.kind === "plan") {
        return {
            ...item,
            entries: item.entries.map((entry) => ({ ...entry })),
        };
    }
    return {
        ...item,
    };
}
