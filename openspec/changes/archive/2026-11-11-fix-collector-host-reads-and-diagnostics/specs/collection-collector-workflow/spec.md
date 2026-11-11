# Spec Delta

## ADDED Requirements

### Requirement: Collector SHALL use platform-correct Bridge launchers

The collector SHALL preserve an existing explicit Bridge executable override. Automatic Windows workspace selection SHALL prefer the supplied CMD wrapper, then a native executable; POSIX selection SHALL use the shell shim. If no workspace candidate exists, selection SHALL fall back to PATH. Automatic Windows selection MUST NOT execute the POSIX shim.

#### Scenario: Both workspace shims are supplied on Windows

- **WHEN** the workspace contains the POSIX shim and CMD wrapper and no explicit override is selected
- **THEN** the collector SHALL execute the CMD wrapper successfully.

#### Scenario: Explicit executable is supplied

- **WHEN** an existing explicit Bridge executable override is configured
- **THEN** it SHALL take precedence over workspace and PATH candidates.

### Requirement: Collector SHALL preserve JSON query bytes across launchers

Collector Bridge queries SHALL reach the CLI as complete UTF-8 JSON independently of launcher shell expansion. Receipts SHALL retain the semantic query payload.

#### Scenario: Query contains shell-sensitive or non-ASCII content

- **WHEN** a query contains Chinese text, spaces, quotes, percent signs, or shell metacharacters
- **THEN** the CLI SHALL receive the original JSON values without expansion or reinterpretation.
