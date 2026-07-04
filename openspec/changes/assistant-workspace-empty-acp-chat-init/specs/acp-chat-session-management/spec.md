## ADDED Requirements

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
