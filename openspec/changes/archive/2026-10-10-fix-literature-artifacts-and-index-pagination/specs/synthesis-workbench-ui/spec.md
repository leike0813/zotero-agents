## ADDED Requirements

### Requirement: Index SHALL expose current-window navigation and filtering

Index SHALL expose previous/next window controls and loaded source range, with loading and failure state. Search and local filters SHALL explicitly apply to the current supplied window. Library totals SHALL be displayed when available; unknown referenced totals SHALL NOT be represented as the Host library total.

#### Scenario: User navigates with a local filter
- **WHEN** the user moves to another Index window with a search or local filter active
- **THEN** the filter SHALL be preserved and applied to that window only.

#### Scenario: Window navigation starts
- **WHEN** a previous or next window is requested
- **THEN** duplicate navigation SHALL be disabled during loading
- **AND** successful navigation SHALL clear preceding expanded state and begin at the top
- **AND** unrelated regions SHALL preserve their DOM identity.
