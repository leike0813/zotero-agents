## ADDED Requirements

### Requirement: Mock reset SHALL isolate shared prototype changes

Resetting the Node Zotero mock SHALL restore the initial behavior and property descriptors of shared mock prototypes. Toolkit hooks and test mutations SHALL NOT affect subsequent tests or accumulate across resets.

#### Scenario: Toolkit field hooks are reset

- **WHEN** a test installs toolkit field hooks and resets the mock
- **THEN** newly created items SHALL use the original field read and write behavior
- **AND** repeated resets SHALL NOT retain earlier hooks

#### Scenario: Prototype members are added, removed, or replaced

- **WHEN** a test changes shared prototype methods or accessors, removes an existing member, or adds string or symbol members
- **AND** the mock is reset
- **THEN** original descriptors SHALL be restored and added members SHALL be absent
