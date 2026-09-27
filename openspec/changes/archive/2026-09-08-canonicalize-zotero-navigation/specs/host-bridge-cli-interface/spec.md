## ADDED Requirements

### Requirement: CLI SHALL expose canonical navigation commands

The CLI SHALL expose one leaf command for each canonical navigation capability:
`navigation focus-zotero`, `navigation select-library-view`,
`navigation select-collection`, `navigation select-saved-search`,
`navigation reveal-items`, `navigation open-item`, and
`navigation open-reader-location`. Each leaf SHALL derive its input, result,
effect, approval, target, and recovery metadata from the executable command
contract and SHALL use the existing one-JSON-envelope boundary.

#### Scenario: Agent requests a navigation schema
- **WHEN** an agent invokes a canonical navigation leaf with `--schema`
- **THEN** the CLI returns its strict structured input and result contract without network access.

#### Scenario: Agent invokes a canonical navigation leaf
- **WHEN** a caller supplies valid portable input and an authenticated profile
- **THEN** the CLI invokes the matching `navigation.*` capability and preserves the structured result and stable error code.

#### Scenario: Removed context-open command is supplied
- **WHEN** a caller invokes `context item|note|collection|selection open`
- **THEN** argument parsing returns a structured usage failure
- **AND** no direct-route alias or fallback is attempted.
