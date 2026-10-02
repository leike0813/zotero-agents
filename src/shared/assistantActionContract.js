/**
 * Assistant Workspace action payload contract — compile-time types for the
 * action payloads that travel between the shell/child pages and the host.
 *
 * The runtime action vocabulary stays single-sourced in
 * ASSISTANT_WORKSPACE_ACTION_REGISTRY (src/modules/assistant/publication/assistantWorkspacePublication.ts,
 * delivered to child pages via the surface configuration) and in the
 * out-of-band action constants of assistantWireContract.ts. This file is the
 * type-level mirror describing the payload each action carries;
 * src/modules/assistant/publication/assistantWorkspacePublication.ts holds drift guards that fail
 * tsc when the registry and this contract fall out of sync.
 *
 * Field types follow what the current senders emit; host handlers keep their
 * defensive runtime validation unchanged (types are a compile-time layer, not
 * a runtime gate).
 *
 * Like assistantWireContract.ts, this file must stay free of imports from
 * src/modules/** so sidebar page bundles never pull in privileged code.
 */
export {};
