## ADDED Requirements

### Requirement: ACP children share one exact implementation

ACP Chat and ACP Skills SHALL load one shared child JS/CSS implementation over
equivalent data-role DOM. Canonical publication state and local drawer, collapse,
draft, focus, and display-mode state SHALL remain separate.

#### Scenario: A local drawer opens

- **WHEN** the user opens or closes a drawer
- **THEN** the child reprojects from unchanged canonical state
- **AND** no owner presentation publication field is rewritten.

### Requirement: ACP action routing has one strict envelope

The shared child SHALL use one bridge key, message type, and action envelope.
Owner identity SHALL exist only in the canonical owner envelope, and missing
bridge/shared modules SHALL fail explicitly.

#### Scenario: The bridge is absent

- **WHEN** an ACP action is attempted without the Workspace bridge
- **THEN** the child reports a bounded local failure
- **AND** it does not broadcast a postMessage fallback.
