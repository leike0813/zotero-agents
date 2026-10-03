## ADDED Requirements

### Requirement: Directory controls preserve drafts and bounded region identity
The Built-in Agent page SHALL expose safe public/overlay/account source states, independent revision, check/data times, retained-data failures and explicit public refresh, automatic-update toggle, previous recovery, overlay refresh/removal and selected-account discovery. Actions/results SHALL be request-associated. Candidate/status updates SHALL preserve unsaved form/default choices and unrelated region DOM identity, without publishing full directory, credentials or private paths.

#### Scenario: Candidate disappears while a form is unsaved
- **WHEN** directory status or recommendations update during a draft edit
- **THEN** the draft model and defaults remain unchanged and stale results cannot replace another query's candidates
