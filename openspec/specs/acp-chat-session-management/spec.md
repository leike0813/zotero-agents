# acp-chat-session-management Specification

## Purpose
TBD - created by archiving change add-acp-chat-session-management. Update Purpose after archive.
## Requirements
### Requirement: ACP chat stores multiple local sessions per backend


The system SHALL allow each ACP backend to maintain multiple local chat sessions with one active session.

#### Scenario: User creates a new conversation

- **WHEN** the user chooses New Conversation
- **THEN** a new local chat session MUST be created for the active backend
- **AND** existing sessions for that backend MUST remain available.
### Requirement: ACP chat can switch active session


The system SHALL switch the visible transcript and command target when the active chat session changes.

#### Scenario: User selects another session

- **WHEN** the user selects a different chat session
- **THEN** the active snapshot, transcript, diagnostics, and workspace metadata MUST reflect that session
- **AND** subsequent chat actions MUST target that session.
### Requirement: Remote session attachments are not durable


The system SHALL restore local chat state without assuming a stored remote ACP session id is valid.

#### Scenario: Stored session is restored or selected

- **WHEN** a stored local session becomes active after restart or switch
- **THEN** its local transcript and UI state MUST be restored
- **AND** the remote `sessionId` MUST be cleared before reconnecting
- **AND** the next reconnect or prompt MUST create a new remote ACP session.
### Requirement: Busy sessions cannot be switched or deleted


The system SHALL prevent unsafe local session changes while the active session has an in-flight prompt or permission request.

#### Scenario: Session is prompting

- **WHEN** the active session status is `prompting` or `permission-required`
- **THEN** switching sessions and deleting the active session MUST be rejected or disabled.
### Requirement: Session deletion selects a safe fallback


The system SHALL maintain an active session after deleting the current session.

#### Scenario: User deletes the active session

- **WHEN** the active session is deleted
- **THEN** the most recently updated remaining session for the backend SHOULD become active
- **AND** if no session remains, a new empty session MUST be created.
### Requirement: Legacy conversation storage is migrated


The system SHALL migrate previous single-conversation ACP storage into the multi-session model.

#### Scenario: Legacy conversation exists

- **WHEN** the system reads ACP chat sessions for a backend with legacy `conversation:<backendId>` storage
- **THEN** it MUST create a default local session containing the legacy transcript
- **AND** it MUST remove the legacy storage after successful migration.
### Requirement: ACP sidebar exposes session controls


The ACP sidebar SHALL expose the active backend's chat session list and session management actions.

#### Scenario: Sidebar renders chat controls

- **WHEN** the ACP sidebar receives a frontend snapshot
- **THEN** it MUST render a session selector for the active backend
- **AND** it MUST provide actions to create, rename, and delete chat sessions.
### Requirement: ACP Chat exposes registry-backed helper skills in all known project skill roots

ACP Chat SHALL materialize its injected skill whitelist into every known project skill root for the shared chat workspace. The injected skill source SHALL be the plugin skill registry effective entry for each skill id, preserving official, dev-local, and user source priority.

#### Scenario: Chat materializes whitelisted skills into all known roots

- **GIVEN** an ACP Chat session is preparing an adapter
- **WHEN** the plugin skill registry contains `zotero-bridge-cli` and `literature-search-ingest`
- **THEN** the chat workspace SHALL receive both skills under `.agents/skills`, `.codex/skills`, `.claude/skills`, `.gemini/skills`, `.qwen/skills`, and `.kilo/skills`
- **AND** each copied skill SHALL come from the registry effective entry for that skill id.

#### Scenario: Chat appends configured skill roots

- **GIVEN** an ACP Chat backend profile declares `acp.skillRoots`
- **WHEN** the chat injected skill target roots are resolved
- **THEN** the configured roots SHALL be added to the known project skill roots
- **AND** duplicate roots SHALL be materialized only once.

#### Scenario: Missing injected skill records a warning

- **GIVEN** an ACP Chat injected skill id is not present in the plugin skill registry
- **WHEN** ACP Chat prepares injected skills
- **THEN** ACP Chat SHALL record a warning diagnostic for that missing skill
- **AND** it SHALL continue preparing the chat adapter.

#### Scenario: Stale family root is replaced

- **GIVEN** a shared ACP Chat workspace already contains an older injected skill copy under any known project skill root
- **WHEN** ACP Chat prepares injected skills
- **THEN** the old skill copy SHALL be replaced by the current registry effective entry.

### Requirement: ACP chat limits live remote sessions

ACP Chat SHALL allow multiple local sessions per backend while limiting the
number of live ACP adapters/remote connections retained by the plugin.

#### Scenario: Fourth live chat evicts idle least-recently-active session

- **GIVEN** three ACP Chat sessions have live adapters
- **AND** at least one live adapter is idle
- **WHEN** another chat session needs a live adapter
- **THEN** the least recently active idle adapter SHALL be disconnected
- **AND** the new chat session MAY create its adapter.

#### Scenario: Busy live chats are protected

- **GIVEN** three ACP Chat sessions have live adapters
- **AND** all three are prompting or waiting on permission
- **WHEN** another chat session needs a live adapter
- **THEN** ACP Chat SHALL reject the new live connection
- **AND** existing busy sessions SHALL remain connected.

#### Scenario: Live chat slot does not own complete transcript text

- **WHEN** an ACP Chat session remains connected across many prompts
- **THEN** the live slot SHALL retain only adapter/session state, active
  transcript item ids, and bounded metadata needed for updates
- **AND** it SHALL NOT retain the complete conversation transcript.

### Requirement: ACP Chat conversations SHALL optionally auto-approve ACP tool permissions

ACP Chat conversations SHALL persist an `autoApproveAcpPermissions` setting.
The setting SHALL default to disabled for new conversations and SHALL apply only
to the conversation that owns the active permission request.

#### Scenario: ACP allow-once option is selected

- **GIVEN** an ACP Chat conversation has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission with `source: "acp-tool-call"` and an
  ACP-standard `kind: "allow_once"` option
- **THEN** ACP Chat SHALL resolve the permission with that option
- **AND** it SHALL NOT publish `pendingPermissionRequest` for that request.

#### Scenario: Allow once is preferred over allow always

- **GIVEN** an ACP Chat conversation has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission with both ACP-standard
  `kind: "allow_always"` and `kind: "allow_once"` options
- **THEN** ACP Chat SHALL resolve the permission with the first `allow_once`
  option.

#### Scenario: Allow always option is selected when no allow once exists

- **GIVEN** an ACP Chat conversation has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission with an ACP-standard
  `kind: "allow_always"` option and no `allow_once` option
- **THEN** ACP Chat SHALL resolve the permission with the first `allow_always`
  option.

#### Scenario: Non-standard requests remain manual

- **GIVEN** an ACP Chat conversation has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission without an ACP-standard
  `kind: "allow_once"` or `kind: "allow_always"` option
- **THEN** ACP Chat SHALL keep the permission pending for manual user action.

#### Scenario: Other permission channels are unaffected

- **GIVEN** an ACP Chat conversation has `autoApproveAcpPermissions: true`
- **WHEN** a permission request source is not `acp-tool-call`
- **THEN** ACP Chat SHALL NOT auto-approve that request.

#### Scenario: Conversation scope is preserved

- **GIVEN** one ACP Chat conversation enables `autoApproveAcpPermissions`
- **WHEN** the user switches to another conversation for the same backend
- **THEN** the second conversation SHALL use its own persisted setting.

### Requirement: ACP Chat cleanup SHALL use the shared controller close

ACP Chat SHALL use the same bounded, idempotent shared-controller close for every local conversation lifecycle boundary.

#### Scenario: Conversation lifecycle cleanup is controlled

- **WHEN** disconnect, forced interruption, LRU eviction, initialization failure, reconnect, backend removal, or Zotero shutdown closes a local ACP Chat connection
- **THEN** ACP Chat SHALL await or reuse the owned shared-controller close
- **AND** it SHALL NOT implement process-group signaling policy.

#### Scenario: Session operations retain one controller

- **WHEN** ACP Chat creates, loads, resumes, or lazily starts a session for a prompt
- **THEN** the resulting local transport SHALL remain owned by its shared controller until the conversation ownership boundary closes it.

#### Scenario: Pending request settles on close

- **WHEN** a local ACP Chat connection closes with pending JSON-RPC work
- **THEN** pending requests SHALL fail in bounded time
- **AND** controller close SHALL not remain blocked on those requests.

### Requirement: ACP Chat panel SHALL expose explicit empty availability states

ACP Chat panel snapshots SHALL distinguish a complete no-backend state from a
backend-without-conversation state and a selected-conversation state.

Snapshots SHALL include `backendAvailability: "none" | "selected"` and
`conversationAvailability: "none" | "selected"`. When no ACP backend is
available, ACP Chat SHALL publish a stable no-backend panel snapshot with empty
backend and conversation selections. When an ACP backend is available but no
conversation is selected, ACP Chat SHALL publish a stable backend-level panel
snapshot without reading transcript pages.

#### Scenario: No backend disables ACP Chat conversation controls

- **GIVEN** no ACP backend is available
- **WHEN** the ACP Chat panel snapshot is prepared
- **THEN** the snapshot has `backendAvailability: "none"`
- **AND** the snapshot has `conversationAvailability: "none"`
- **AND** `activeBackendId`, `activeConversationId`, `backendOptions`, and
  `chatSessions` are empty
- **AND** ACP Chat conversation controls for backend selection, conversation
  selection, new conversation, connect, disconnect, authentication, runtime
  options, and reply are disabled.

#### Scenario: No backend does not read transcript pages

- **GIVEN** no ACP backend is available
- **WHEN** the ACP Chat panel snapshot is prepared with transcript pagination
  enabled
- **THEN** the read-model does not request a transcript page
- **AND** the snapshot does not include `selectedTranscriptPage`
- **AND** the child panel does not emit `load-transcript-page`.

#### Scenario: Backend without conversation allows backend-level actions

- **GIVEN** an ACP backend is available
- **AND** no ACP Chat conversation is selected for that backend
- **WHEN** the ACP Chat panel snapshot is prepared
- **THEN** the snapshot has `backendAvailability: "selected"`
- **AND** the snapshot has `conversationAvailability: "none"`
- **AND** the snapshot includes the selected backend id and backend options
- **AND** new conversation and connect actions are enabled with backend-only
  payloads
- **AND** transcript page reads are skipped until a conversation is selected.

#### Scenario: Selected conversation enables conversation-scoped transcript paging

- **GIVEN** an ACP backend is available
- **AND** an ACP Chat conversation is selected
- **WHEN** the ACP Chat panel snapshot is prepared with transcript pagination
  enabled
- **THEN** the snapshot has `backendAvailability: "selected"`
- **AND** the snapshot has `conversationAvailability: "selected"`
- **AND** the selected transcript page request is scoped to the selected backend
  and conversation.

### Requirement: ACP Chat local transport cleanup SHALL release plugin-managed process trees

ACP Chat disconnect, live-adapter eviction, and plugin shutdown SHALL close
plugin-managed local ACP transports through the shared transport cleanup path.

#### Scenario: Chat disconnect uses cached process-control cleanup

- **GIVEN** an ACP Chat conversation has a plugin-managed local ACP transport
- **WHEN** the conversation disconnects, is evicted, or the plugin shuts down
- **THEN** the transport close path SHALL use the cached platform
  process-control strategy
- **AND** it SHALL record unsupported process tree cleanup diagnostics when only
  direct process kill is available.

#### Scenario: Remote recovery does not retain local orphan processes

- **WHEN** ACP Chat preserves local state for later reconnection or recovery
- **THEN** it SHALL NOT preserve orphaned local backend processes as part of that
  recovery state.

### Requirement: ACP Chat cancellation distinguishes request from completion

ACP Chat SHALL keep an active prompt busy after sending `session/cancel` and SHALL expose a requested interruption state until the original `session/prompt` settles or the owned adapter is force-closed.

#### Scenario: Cancellation notification is written while prompt remains active
- **WHEN** the user cancels an in-flight ACP Chat prompt
- **AND** the cancellation notification is written successfully
- **THEN** the conversation MUST remain busy
- **AND** a second prompt or cancellation MUST remain disabled
- **AND** the interruption state MUST be `requested`.

#### Scenario: Agent confirms cancellation
- **WHEN** the original prompt returns `stopReason: "cancelled"`
- **THEN** ACP Chat MUST set the interruption state to `confirmed`
- **AND** it MUST finish the prompt without closing the adapter.

#### Scenario: Agent completes with another result
- **WHEN** cancellation was requested
- **AND** the original prompt returns a non-cancelled result
- **THEN** ACP Chat MUST preserve that result and stop reason
- **AND** it MUST set the interruption state to `unconfirmed`.

### Requirement: ACP Chat cancellation has a bounded force-stop fallback

ACP Chat SHALL close only the active conversation's adapter and process tree when its cancellation remains unconfirmed for 10 seconds.

#### Scenario: Cancellation grace period expires
- **WHEN** the original prompt remains unsettled for 10 seconds after cancellation was requested
- **THEN** ACP Chat MUST close the active conversation adapter
- **AND** it MUST set the interruption state to `forced`
- **AND** other conversation adapters MUST remain unaffected.

#### Scenario: Force-stopped conversation is used again
- **WHEN** the user sends another prompt after a force-stop
- **THEN** ACP Chat MUST create a new adapter
- **AND** it MUST try resume, then load, then new-session fallback using the existing recovery policy.

#### Scenario: Cancellation notification cannot be written
- **WHEN** the client cannot write `session/cancel` to the active connection
- **THEN** ACP Chat MUST enter the force-stop cleanup path without waiting for the grace period.

### Requirement: ACP Chat cancellation resolves pending permission requests

ACP Chat SHALL answer a pending ACP permission request with the cancelled outcome before requesting prompt cancellation.

#### Scenario: Cancel is selected during a permission request
- **WHEN** an active prompt has a pending ACP permission request
- **AND** the user cancels the prompt
- **THEN** the pending permission request MUST be resolved as cancelled
- **AND** prompt cancellation MUST continue through the same interruption lifecycle.

### Requirement: ACP Chat process-tree cleanup SHALL preserve validated signal targets
ACP Chat SHALL delegate local transport teardown to the shared controller whose POSIX signal actuation preserves the complete validated process-group target.

#### Scenario: Wrapper-backed Chat conversation closes
- **WHEN** an ACP Chat conversation using a wrapper-prone local backend does not exit during EOF grace
- **THEN** any TERM or KILL escalation SHALL use the shared controller's validated target
- **AND** an actuation failure SHALL fall back only to the directly held child process
