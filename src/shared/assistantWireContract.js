/**
 * Assistant Workspace / SkillRunner sidebar wire contract — single source of
 * truth for cross-process message envelope types, bridge keys, out-of-band
 * action vocabulary, and publication wire field lists.
 *
 * Imported both by the Zotero-side modules (src/modules/**) and by the
 * sidebar page bundles (src/sidebar/**). This file must stay free of imports
 * from src/modules/** so page bundles never pull in privileged code.
 */
// ---------------------------------------------------------------------------
// Publication wire identity and field lists
// ---------------------------------------------------------------------------
export const ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA = "zotero-agents.assistant-workspace-publication.v1";
export const ASSISTANT_WORKSPACE_FORBIDDEN_WIRE_FIELDS = new Set([
    "regions",
    "selectedTranscript",
    "selectedTranscriptPage",
    "transcriptState",
    "transcriptRegion",
    "selectedRun",
    "selectedRequestId",
    "activeConversationId",
    "deliveryRevision",
    "initialization",
    "tab",
    "totalItemCount",
    "eventSeq",
    "uiRevision",
    "baseUiRevision",
]);
export const ASSISTANT_WORKSPACE_PUBLICATION_ENVELOPE_KEYS = [
    "schema",
    "publicationId",
    "owner",
    "publicationKind",
    "publicationForm",
    "publicationCause",
    "regionRevision",
    "deliverySequence",
    "payload",
];
export const ASSISTANT_WORKSPACE_TRANSCRIPT_SNAPSHOT_KEYS = [
    "owner",
    "status",
    "error",
    "page",
    "transcriptRevision",
];
export const ASSISTANT_WORKSPACE_TRANSCRIPT_DELTA_KEYS = [
    "page",
    "baseTranscriptRevision",
    "transcriptRevision",
    "mutations",
];
/**
 * Payload keys per non-transcript publication kind. The authoritative kind
 * list lives in ASSISTANT_WORKSPACE_REGION_REGISTRY (src/modules); this map
 * must cover every kind except "transcript" (guarded by tests/core/190).
 */
export const ASSISTANT_WORKSPACE_PUBLICATION_PAYLOAD_KEYS = {
    "owner-navigation": [
        "selectedOwner",
        "selectedGroupId",
        "groups",
        "entries",
        "queuedEntries",
        "canCreateOwner",
        "notice",
    ],
    "service-status": ["items"],
    "owner-control": [
        "status",
        "busy",
        "hint",
        "interaction",
        "connection",
        "execution",
        "authentication",
        "permissionPolicy",
        "badges",
    ],
    "message-counts": ["counts"],
    plan: ["items"],
    permission: ["request"],
    composer: ["reply", "runtimeOptions"],
    "owner-presentation": [
        "title",
        "subtitle",
        "description",
        "notice",
        "metadata",
        "usage",
    ],
    "owner-details": [
        "status",
        "title",
        "subtitle",
        "sections",
        "actions",
        "error",
    ],
};
/**
 * Payload keys a publication kind accepts on top of its required keys.
 * Adapters that do not carry the optional field may omit it; the exact-key
 * wire assertion admits the declared superset only. "composer.resources"
 * carries Pi Conversation one-send composer resources.
 */
export const ASSISTANT_WORKSPACE_OPTIONAL_PUBLICATION_PAYLOAD_KEYS = {
    composer: [
        "resources",
        "errors",
        "sendAdmissionRevision",
        "interactionBatch",
    ],
    "owner-navigation": ["archivedEntries"],
};
export const ASSISTANT_WORKSPACE_PERMISSION_REQUEST_KEYS = [
    "requestId",
    "approvalKind",
    "title",
    "summary",
    "tool",
    "review",
    "options",
];
// ---------------------------------------------------------------------------
// Message envelope types (host <-> shell <-> child pages)
// ---------------------------------------------------------------------------
export const ASSISTANT_WORKSPACE_MESSAGE_PREFIX = "assistant-workspace:";
export const ASSISTANT_WORKSPACE_MESSAGE_TYPES = {
    // Host -> shell.
    INIT: "assistant-workspace:init",
    SURFACE_CONFIG: "assistant-workspace:surface-config",
    CHILD_PUBLICATION: "assistant-workspace:child-publication",
    // Host -> shell, harness only: sent by addon/content/harness/harness-host.js
    // (the read-only test harness); production host code never sends it.
    SET_TAB: "assistant-workspace:set-tab",
    // Shell -> host.
    ACTION: "assistant-workspace:action",
    CHILD_ACTION: "assistant-workspace:child-action",
    PUBLICATION_ACK: "assistant-workspace:publication-ack",
    // Shell -> child pages.
    CHILD_READY_REQUEST: "assistant-workspace:child-ready-request",
    ACP_PUBLICATION: "assistant-workspace:acp-publication",
    SURFACE_BOOTSTRAP: "assistant-workspace:surface-bootstrap",
    CLOSE_DRAWERS: "assistant-workspace:close-drawers",
};
// ---------------------------------------------------------------------------
// Bridge keys (window globals installed by host/shell, read by child pages)
// ---------------------------------------------------------------------------
export const ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY = "__zsAssistantWorkspaceBridge";
export const ASSISTANT_WORKSPACE_ACP_CHILD_BRIDGE_KEY = "__zsAssistantWorkspaceAcpBridge";
// ---------------------------------------------------------------------------
// Out-of-band action vocabulary
//
// These actions travel on the bridge envelopes directly; they are not routed
// through ASSISTANT_WORKSPACE_ACTION_REGISTRY (which is delivered to children
// at runtime via the surface configuration).
// ---------------------------------------------------------------------------
/** Shell -> host actions handled by handleShellAction. */
export const ASSISTANT_WORKSPACE_SHELL_ACTIONS = {
    READY: "ready",
    SET_TAB: "set-tab",
    CLOSE_SIDEBAR: "close-sidebar",
};
/** Child -> host control-plane actions handled inline by the child dispatcher. */
export const ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS = {
    READY: "ready",
    PUBLICATION_ACK: "publication-ack",
    PUBLICATION_RENDER_OBSERVATION: "publication-render-observation",
    // These two also exist in ASSISTANT_WORKSPACE_ACTION_REGISTRY, but the host
    // short-circuits them inline inside the child dispatcher before registry
    // routing; listed here so both sides share one vocabulary.
    LOAD_TRANSCRIPT_PAGE: "load-transcript-page",
    REQUEST_OWNER_DETAILS: "request-owner-details",
};
