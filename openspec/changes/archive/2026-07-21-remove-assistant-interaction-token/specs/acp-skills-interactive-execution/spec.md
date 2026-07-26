## MODIFIED Requirements

### Requirement: ACP Skills publishes structured waiting-user controls

ACP Skills SHALL preserve validated `ui_hints` in its Assistant pending-interaction projection. A pending message SHALL appear in transcript only, while prompt, hint, options, and file declarations SHALL drive only the interaction region. Reply submission SHALL use the selected request's current waiting lifecycle without deriving an interaction token from output state or introducing a reply-state lock.

#### Scenario: Choice interaction is published

- **WHEN** ACP output enters waiting-user with structured options
- **THEN** the selected owner snapshot SHALL include a typed choice interaction without a synthetic token
- **AND** choosing a current option SHALL deterministically convert its JSON value to continuation prompt text

#### Scenario: Detached continuation asks for another reply

- **GIVEN** an interrupted live run continues through its existing serialized prompt chain
- **WHEN** that continuation publishes another waiting-user interaction
- **THEN** the next reply SHALL reach the current controller without requiring a synthetic interaction identity
- **AND** its visible response SHALL be appended to the user transcript once.

### Requirement: ACP file replies use shallow managed workspace staging

ACP Skills SHALL select declared files through host-native pickers and atomically stage them under `.acp-inputs/<short-request-key>-<submission-key>/<safe-file-name>`. The final directory SHALL contain no per-slot directories, original paths, or file bytes in its manifest.

#### Scenario: Pending interaction changes during selection

- **WHEN** the selected request is no longer waiting for a file interaction before picker completion
- **THEN** the host SHALL not stage or submit those selections
- **AND** one request SHALL have at most one in-flight native file-selection flow.
