## ADDED Requirements

### Requirement: Index totals SHALL describe the requested source scope

Host library item pages SHALL preserve their accurate nonnegative source total. Library Index pages SHALL expose this total independently of sidecar readiness and local filters. Referenced Index pages SHALL expose an unknown total because their match scope is filtered after Host pagination.

#### Scenario: Library Index shows a partial window
- **WHEN** 274 Host sources exist and 25 sources have been displayed
- **THEN** the library total SHALL be 274 rather than the loaded row count.

#### Scenario: Referenced Index reads a Host page
- **WHEN** referenced filtering is applied
- **THEN** its total SHALL remain unknown rather than report the Host library total.
