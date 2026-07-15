## MODIFIED Requirements

### Requirement: Recorder completeness is explicit

The recorder SHALL implement `idle`, `armed`, `recording`, `frozen`, and `saved` states. Unowned events, mid-turn binding, active owners at stop, write failures, quota failures, integrity failures, or user cancellation SHALL freeze an incomplete trace that is ineligible for baseline replay. Frozen and saved rounds SHALL expose a reset operation that releases runtime ownership and permits another round without restarting Zotero.

#### Scenario: Recording is canceled
- **WHEN** the user cancels an armed or recording round
- **THEN** buffered writes SHALL drain, an incomplete footer with `user-canceled` SHALL be appended, diagnostic ownership SHALL be released, and the partial file SHALL remain local
- **AND** the user SHALL be able to reset and arm another round.

#### Scenario: Saved round is reset
- **WHEN** a complete trace has been saved and the user starts a new recording round
- **THEN** recorder ownership and counters SHALL be reset without deleting or modifying the saved trace.

#### Scenario: Recorder setup fails
- **WHEN** recorder initialization fails after acquiring diagnostic ownership
- **THEN** ownership SHALL be released and the Dashboard SHALL expose a recoverable state without requiring a host restart.

### Requirement: Raw traces expose no egress workflow

The Dashboard SHALL warn that traces can contain sensitive content and SHALL provide only start, stop, cancel, reset, save, and local-folder operations. It SHALL NOT provide clipboard, upload, submission, or automatic deletion actions.

#### Scenario: Canceled trace is displayed
- **WHEN** a recording is canceled
- **THEN** the UI SHALL identify the trace as incomplete, expose its local partial path, and offer a new recording round without a deletion action.
