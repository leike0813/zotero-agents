## MODIFIED Requirements

### Requirement: Canonical writes schedule WebDAV autosync

Successful eligible canonical writes SHALL publish one post-commit event to a composition-owned Rust coordinator after the application write boundary has returned. The eligible set SHALL cover the surviving fixed-baseline Topic, Tag, Concept, and Topic Graph mutation routes plus promoted Reference refresh. Retired checkpoint/JSON routes SHALL remain retired.

#### Scenario: Eligible canonical write commits
- **WHEN** an eligible route returns its committed result and an actual repository write was observed
- **THEN** the caller receives the committed result without waiting for WebDAV
- **AND** the coordinator starts or resets one five-second debounce

#### Scenario: Write does not commit
- **WHEN** validation fails, the route errors, or the result is unchanged, missing, conflicting, rejected, or otherwise non-committing
- **THEN** no autosync opportunity is published
- **AND** projection, cache, job, progress, log, staged-only, and WebDAV-import writes remain outside the trigger boundary

#### Scenario: Autosync is disabled
- **WHEN** an eligible canonical write commits and the current Host description disables autosync
- **THEN** the write succeeds without a remote WebDAV read or write

#### Scenario: Autosync fails after commit
- **WHEN** WebDAV work fails after an eligible canonical commit
- **THEN** no successful remote publication is reported
- **AND** the committed canonical write remains readable in the current process and after reopen

#### Scenario: Canonical writes share a maintenance epoch
- **WHEN** several eligible writes commit before the five-second deadline or within one active Reference maintenance epoch
- **THEN** they produce at most one WebDAV run
- **AND** the deadline is measured from the final eligible commit after active canonical maintenance workers drain

#### Scenario: Projection state changes
- **WHEN** only projection, cache, job, progress, log, staged suggestion, or WebDAV-import state changes
- **THEN** WebDAV autosync is not scheduled

### Requirement: WebDAV automatic work has explicit lifecycle ownership

The production composition SHALL own one autosync worker. Pending debounce work SHALL be canceled by pause, a superseding explicit WebDAV trigger, conflict control, composition invalidation, or process shutdown. Shutdown SHALL stop autosync admission and reclaim the worker before repository and canonical-store owners are released.

#### Scenario: Sidecar stops with pending autosync
- **WHEN** shutdown begins before the debounce expires
- **THEN** the pending callback performs no reverse-Host read or write
- **AND** shutdown does not leave an autosync-owned application reference alive
