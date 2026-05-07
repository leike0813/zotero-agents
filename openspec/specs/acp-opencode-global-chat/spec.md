# acp-opencode-global-chat Specification

## Purpose
TBD - created by archiving change add-acp-opencode-global-chat-foundation. Update Purpose after archive.
## Requirements
### Requirement: OpenCode ACP backend profile uses the reference `npx` command metadata
The system SHALL expose a built-in OpenCode ACP backend profile that launches OpenCode through the same `npx` command line used by `reference/vscode-acp`.

#### Scenario: Normalize the built-in ACP backend
- **WHEN** the plugin loads backend profiles
- **THEN** the built-in ACP backend MUST use `command="npx"` and `args=["opencode-ai@latest", "acp"]`
- **THEN** it MUST remain compatible with existing backend consumers via a stable local `baseUrl`

### Requirement: ACP command availability and lifecycle are observable
The system SHALL surface ACP backend launch and connection lifecycle states to the sidebar.

#### Scenario: Host command is missing
- **WHEN** the user opens the ACP sidebar or triggers ACP connection
- **AND** `npx` is not available in the host `PATH`
- **THEN** the sidebar MUST show a visible prerequisite failure
- **THEN** diagnostics MUST include the attempted command line and the command lookup failure

#### Scenario: ACP session becomes ready
- **WHEN** the ACP sidebar opens and OpenCode ACP is available
- **THEN** the plugin MUST progress through command check, spawn, initialize, and session creation on demand
- **THEN** the sidebar MUST expose the current phase, agent label/version, session id/title, command line, session cwd, runtime path, and the latest diagnostics

### Requirement: ACP session updates are projected into structured sidebar state
The system SHALL project ACP session updates into structured conversation items and session metadata instead of only appending assistant text.

#### Scenario: Render ACP event stream
- **WHEN** the agent emits `session/update`
- **THEN** the system MUST project `agent_message_chunk`, `agent_thought_chunk`, `tool_call`, `tool_call_update`, `plan`, `available_commands_update`, `current_mode_update`, `session_info_update`, and `usage_update`
- **THEN** the sidebar MUST render the resulting transcript, mode/model state, available commands, session metadata, and usage summary

### Requirement: ACP sidebar supports basic interactive controls
The system SHALL provide the minimum control surface required to complete an interactive OpenCode ACP turn.

#### Scenario: User changes mode or model
- **WHEN** the active ACP session advertises available modes or models
- **THEN** the sidebar MUST show mode/model selectors
- **THEN** changing either selector MUST call the corresponding ACP session control and update local snapshot state

#### Scenario: Agent requires authentication or permission confirmation
- **WHEN** `session/new` requires authentication
- **THEN** the sidebar MUST expose the available auth methods and allow the user to trigger authentication
- **THEN** successful authentication MUST retry `session/new`

- **WHEN** the agent requests permission for a tool call
- **THEN** the sidebar MUST enter a visible permission-required state
- **THEN** the user MUST be able to allow or deny the request from the sidebar

### Requirement: ACP transcript and diagnostics persist locally
The system SHALL persist local conversation state for the single OpenCode ACP slot.

#### Scenario: Persist local sidebar state
- **WHEN** ACP transcript items, diagnostics, or session metadata change
- **THEN** the plugin MUST persist the local conversation id, transcript items, recent diagnostics, and current sidebar-visible state
- **THEN** a later plugin startup MUST restore that local state before the next prompt is sent

### Requirement: ACP diagnostics can be copied for remote debugging
The system SHALL provide a copyable diagnostics bundle when ACP connection fails inside Zotero.

#### Scenario: User copies ACP diagnostics
- **WHEN** the ACP sidebar is open
- **THEN** the diagnostics panel MUST expose a copy action
- **THEN** the copied bundle MUST include host runtime flags, backend command metadata, session cwd, workspace/runtime paths, last error, stderr tail, recent diagnostics, recent transcript items, and host context
- **THEN** ACP errors MUST preserve stage, stack, code/data, and raw error metadata when available

#### Scenario: ACP JSON-RPC fails before a session is ready
- **WHEN** ACP JSON-RPC or NDJSON framing fails during initialize or session creation
- **THEN** diagnostics MUST include recent JSON-RPC direction/method/id trace entries
- **THEN** stream parse/read/write errors MUST include a stage label

### Requirement: ACP sidebar actions use a direct host bridge in sidebar mode
The system SHALL use an injected sidebar bridge for ACP actions inside Zotero sidebar panes, while preserving `postMessage` only as a fallback channel.

#### Scenario: Sidebar iframe sends an ACP action
- **WHEN** the ACP sidebar iframe is loaded inside a Zotero sidebar pane
- **THEN** it MUST send `ready`, `send-prompt`, `reconnect`, `cancel`, `authenticate`, `resolve-permission`, `set-mode`, and `set-model` through an injected `__zsAcpSidebarBridge`
- **THEN** host-side ACP action handlers MUST receive those actions without requiring `window.parent.postMessage`

### Requirement: ACP runtime workspace placement
The system SHALL keep ACP storage paths under the plugin-owned runtime area while using a separate session cwd for the live OpenCode conversation.

#### Scenario: Resolve ACP storage directories
- **WHEN** the ACP runtime prepares filesystem paths for OpenCode
- **THEN** it MUST use the central runtime persistence resolver for ACP Chat private storage
- **THEN** it MUST keep conversation-private storage under `<runtime-root>/acp/chat/conversations/<backend-id>/<conversation-id>/`
- **THEN** conversation-private storage MUST NOT be located under `<runtime-root>/acp/chat/workspace/`
- **THEN** it MUST keep ACP runtime state under `<runtime-root>/acp/chat/runtime/<backend-id>/`
- **THEN** it MUST NOT label private storage paths as user-facing workspace paths

#### Scenario: Resolve ACP session cwd
- **WHEN** the ACP runtime prepares the working directory used for `npx opencode-ai@latest acp` and `session/new`
- **THEN** it MUST use `<runtime-root>/acp/chat/workspace` as the shared ACP Chat session cwd for all ACP Chat conversations
- **THEN** `Workspace` in the ACP Chat UI MUST mean this shared agent working directory
- **THEN** it MUST NOT use `Zotero.DataDirectory` as the default ACP Chat session cwd
- **THEN** it MUST NOT expose ACP Chat private storage/runtime directories as normal user-facing workspace metadata

### Requirement: ACP remains outside workflow execution v1
The system SHALL keep ACP global chat outside the workflow execution path during this phase.

#### Scenario: Exclude ACP from workflow backend execution
- **WHEN** workflow settings, request compilation, or run execution enumerate workflow-capable backends and providers
- **THEN** they MUST NOT treat the `acp` backend as a workflow-executable target
- **THEN** existing SkillRunner, generic-http, and pass-through workflow behavior MUST remain unchanged
