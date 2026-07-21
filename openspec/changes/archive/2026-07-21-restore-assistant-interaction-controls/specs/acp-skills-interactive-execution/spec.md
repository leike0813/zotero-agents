## MODIFIED Requirements

### Requirement: ACP Skills publishes structured waiting-user controls

ACP Skills SHALL preserve validated `ui_hints` in its Assistant pending-interaction projection. A pending message SHALL appear in transcript only, while prompt, hint, options, and file declarations SHALL drive only the interaction region.

#### Scenario: Choice interaction is published

- **WHEN** ACP output enters waiting-user with structured options
- **THEN** the selected owner snapshot SHALL include a token-bound choice interaction
- **AND** choosing it SHALL deterministically convert its JSON value to continuation prompt text

### Requirement: ACP file replies use shallow managed workspace staging

ACP Skills SHALL select declared files through host-native pickers and atomically stage them under `.acp-inputs/<short-turn-key>-<submission-key>/<safe-file-name>`. The final directory SHALL contain no per-slot directories, raw tokens, original paths, or file bytes in its manifest.

#### Scenario: Required file selection is cancelled

- **WHEN** a required slot picker is cancelled
- **THEN** the whole submission SHALL stop without continuation

#### Scenario: Optional file selection is cancelled

- **WHEN** an optional slot picker is cancelled
- **THEN** that slot SHALL be skipped
- **AND** the submission SHALL continue only if at least one file remains

#### Scenario: Files are staged successfully

- **WHEN** all accepted selections copy and the manifest is written
- **THEN** the temporary sibling directory SHALL be atomically renamed to the final shallow directory
- **AND** transcript SHALL show display filenames only
- **AND** ACP prompt text SHALL use shallow workspace-relative paths only

#### Scenario: Pending interaction changes during selection

- **WHEN** owner, status, or token changes before picker completion
- **THEN** the host SHALL not stage or submit those selections to the new interaction
