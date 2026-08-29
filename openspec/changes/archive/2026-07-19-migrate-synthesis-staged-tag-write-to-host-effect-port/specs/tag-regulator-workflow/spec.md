## MODIFIED Requirements

### Requirement: Suggested tags SHALL remain advisory outputs

Tags in `suggest_tags` MUST NOT be written directly to parent items, and SHALL support user-confirmed intake into controlled vocabulary or staged inbox through the Synthesis staged-promotion seam.

#### Scenario: Result-time live reconcile suppresses stale suggestions
- **WHEN** backend returns `suggest_tags`
- **AND** one of those tags has already entered local controlled vocabulary before result application
- **THEN** that tag SHALL NOT appear in the suggest-intake dialog
- **AND** that tag SHALL be treated as result-time `add_tags` input for downstream parent-item mutation

#### Scenario: Result-time live reconcile suppresses stale staged reminders
- **WHEN** backend returns `suggest_tags`
- **AND** one of those tags has already entered local staged inbox before result application
- **THEN** that tag SHALL remain visible in the suggest-intake dialog
- **AND** the workflow SHALL NOT create another staged entry for that tag
- **AND** the workflow SHALL merge the current parent's stable ref into that staged record before opening the dialog

#### Scenario: Suggest intake dialog supports immediate row actions
- **WHEN** output contains non-empty `suggest_tags`
- **THEN** workflow SHALL open a suggest-intake dialog with row-level `加入` and `拒绝` actions
- **AND** row-level `加入` SHALL stage then promote the selected tag through Synthesis and remove the row on success
- **AND** row-level `拒绝` SHALL discard the row immediately

#### Scenario: Suggest intake dialog shows parent binding counts
- **WHEN** the suggest-intake dialog is open
- **THEN** the dialog SHALL render a header row
- **AND** each row SHALL display the current bound-parent count for that suggest tag

#### Scenario: Global actions include join/stage/reject
- **WHEN** suggest-intake dialog is open
- **THEN** global actions SHALL be `全部加入` / `全部暂存` / `全部拒绝`
- **AND** `全部加入` SHALL keep invalid rows visible with diagnostics
- **AND** `全部暂存` SHALL write remaining rows to staged inbox
- **AND** `全部拒绝` SHALL discard all remaining rows

#### Scenario: Staged intake does not mutate parent tags directly
- **WHEN** a suggest tag enters staged inbox through row-level stage, global `全部暂存`, timeout close-policy, or join fallback
- **THEN** the workflow SHALL record deferred stable parent refs for future committed backfill
- **AND** the workflow SHALL NOT append that tag to any parent item at staged time

#### Scenario: Parent tags are backfilled only after committed success
- **WHEN** a user-approved suggest tag successfully enters committed controlled vocabulary
- **THEN** Synthesis Host effects SHALL ensure the tag on every bound parent
- **AND** the workflow SHALL NOT call Zotero item/tag mutation APIs for bound-parent backfill

#### Scenario: Timeout and manual close default to staged intake
- **WHEN** suggest-intake dialog reaches 10-second timeout
- **THEN** system SHALL execute staged intake for all remaining rows and close the dialog
- **AND WHEN** user manually closes the dialog
- **THEN** system SHALL apply the same default staged-intake policy

#### Scenario: Suggest-intake summary is deterministic
- **WHEN** suggest-intake completes
- **THEN** workflow SHALL return deterministic summary fields including `addedDirect`, `staged`, `rejected`, `invalid`, `timedOut`, and `closePolicyApplied`
