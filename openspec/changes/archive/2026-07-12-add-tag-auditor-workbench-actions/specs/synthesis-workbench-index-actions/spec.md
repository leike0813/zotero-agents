## ADDED Requirements

### Requirement: New Index rows SHALL receive a tag audit
Before a Zotero-backed item without an audit-ledger entry is projected into the Index, the Synthesis Index surface MUST evaluate its tags and persist its audit state.

#### Scenario: A new Index item has an invalid tag
- **WHEN** a previously unaudited Zotero-backed item enters the Index
- **AND** its tags are not compliant
- **THEN** the Index row SHALL expose `needsTagRegulation=true` in the same surface response.

#### Scenario: An item was already audited
- **WHEN** an Index item already has an audit-ledger entry
- **THEN** normal Index rendering SHALL use that stored state
- **AND** it SHALL not repeat the first-entry audit solely because the UI rerendered.

### Requirement: Index SHALL expose localized row actions
The Index table MUST display a localized rightmost Actions column for Zotero-backed rows.

#### Scenario: Analyze availability
- **WHEN** a row does not have all digest, references, and citation-analysis artifacts
- **THEN** its localized Analyze action SHALL be enabled
- **AND** activating it SHALL select that Zotero item and run `literature-analysis` through the normal settings gate.

#### Scenario: Tag regulation availability
- **WHEN** a row has `needsTagRegulation=true`
- **THEN** its localized Regulate tags action SHALL be enabled
- **AND** activating it SHALL select that Zotero item and run `tag-regulator` through the normal settings gate.

#### Scenario: External reference rows
- **WHEN** the Index displays a row without a Zotero-backed item
- **THEN** it SHALL retain the Actions column layout
- **AND** it SHALL not expose either executable row action.
