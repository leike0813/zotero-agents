## ADDED Requirements

### Requirement: ACP Chat and ACP Skills expose the complete shared toolbar contract

Both ACP panels SHALL expose context navigation, Details, Manage Backends, a
right-aligned Live/By message/Silent radiogroup, and a transcript-local
Plain/Bubble switch. Display-mode keyboard navigation SHALL support arrow keys,
Home, and End. View changes SHALL preserve the selected owner's scroll,
expansion, reply draft, and unrelated managed-region identity.

#### Scenario: Display mode changes from the toolbar

- **WHEN** the user selects a different execution display mode
- **THEN** the selected transcript is rebased under that canonical mode
- **AND** unrelated toolbar, banner, plan, hint, composer, and drawer nodes are not rebuilt.

### Requirement: ACP banners expose source-specific current-state controls

Chat SHALL retain the product title/subtitle, backend/session metadata,
connection and Host Bridge indicators, bounded backend/session selectors, and
New, Connect, Disconnect, Authenticate, and Auto-approve actions under their
canonical availability rules. Skills SHALL derive title, subtitle, run status,
backend/workspace metadata, connection and Host Bridge indicators, and Connect,
Disconnect, and Cancel Task availability from run/task SSOT. Neither banner
SHALL render a Zotero MCP LED.

Connection, disconnection, and authentication controls SHALL remain rendered
for the selected Chat conversation, and connection/disconnection controls
SHALL remain rendered for the selected Skills run. Unavailable controls SHALL
be disabled rather than omitted. A restorable remote Chat session SHALL NOT be
presented as a live connection. Indicator status values SHALL NOT render raw
tokens beside the localized Connection and Host Bridge labels. Skills banner
metadata SHALL contain backend and workspace only; workflow and task/backend/
apply status axes remain in the task drawer.

For a sequence workflow task, the Skills subtitle SHALL preserve both semantic
roles as `step-marker skill-name/workflow-name`. The skill and workflow labels
SHALL both remain visible when their text is identical; visual string equality
is not a reason to collapse either role. The same subtitle projection SHALL be
used by owner presentation and task navigation.

#### Scenario: Chat session selector exceeds its bound

- **WHEN** the current backend has more than eight recent sessions
- **THEN** the selector contains at most the recent eight plus the selected session when necessary and localized Show more
- **AND** Show more opens the complete grouped session drawer.

#### Scenario: A sequence step and its workflow have the same label

- **WHEN** the first sequence step has skill name `文献分析` and workflow name
  `文献分析`
- **THEN** the Skills subtitle renders `1️⃣ 文献分析/文献分析`
- **AND** the banner and task navigation entry use the same value.

### Requirement: Hint, permission, and composer form one interaction contract

The hint SHALL prioritize pending permission, recoverable connection/error,
waiting user, running/repairing, completed, and canceled state in that order.
Permission UI SHALL render every backend option plus localized Cancel and use
the same canonical request in hint and drawer. Composer enablement, busy
interrupt/cancel state, runtime selectors, usage gauge, keyboard send,
per-owner drafts, and the latest fifty per-owner history entries SHALL follow
the source-specific canonical control DTO.

The owner-control DTO SHALL provide a semantic hint kind and optional bounded
message. Composer state SHALL NOT be used as a fallback source for the panel
hint and SHALL NOT repeat a stop reason or lifecycle token in the composer
footer. A waiting-user hint without a provider message SHALL use the localized
waiting-reply label. Chat SHALL display a localized disabled Default reasoning
option when the backend exposes no reasoning choices.

#### Scenario: A pending permission replaces ordinary run status

- **WHEN** the selected owner has a pending ACP-tool or Zotero-write request
- **THEN** the permission hint and optional drawer render the same request and actions
- **AND** ordinary send controls are disabled until the request is resolved or canceled.

### Requirement: Context and details drawers restore bounded dev semantics

Context drawers SHALL group Chat sessions by backend and Skills tasks by
running/completed section and backend, preserve keyed card identity, close
synchronously on selection, and expose Archive only for eligible terminal or
idle items. Details SHALL open immediately with localized loading, then render
bounded Chat session/path/diagnostic sections or Skills path/runner/validation/
dependency/revision/log/result sections and the canonical copy/open actions.

#### Scenario: Details opens before data is available

- **WHEN** the user activates Details for a selected owner without cached details
- **THEN** the drawer opens immediately with localized loading and requests owner details
- **AND** transcript page and full mirror reads are not prerequisites.
