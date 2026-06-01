## ADDED Requirements

### Requirement: Related-items sync is graph-owned and idempotent

Synthesis SHALL derive Zotero related-items sync only from accepted
library-to-library Citation Graph edges.

#### Scenario: Matched library edge lacks native relation

- **WHEN** a matched citation edge connects source and target literature items
  with active Zotero bindings
- **THEN** the sync worker SHALL add the native Zotero related-item relation if
  it is missing
- **AND** it SHALL record whether the relation was added or already existed.

#### Scenario: Edge is suggestion-only or external-only

- **WHEN** a reference is unresolved, ambiguous, suggestion-only, rejected, or
  external-only
- **THEN** related-items sync SHALL skip it
- **AND** no Zotero relation SHALL be added.

### Requirement: Echo suppression is durable

Synthesis SHALL classify Zotero item change events caused by related-items sync
through durable sync attempt/effect rows.

#### Scenario: Zotero emits change event after sync write

- **WHEN** the emitted change matches a durable sync attempt or effect
- **THEN** routing SHALL classify it as a sync echo
- **AND** it SHALL NOT enqueue Registry reindex or another related-items sync
  loop.

#### Scenario: Plugin restarts after pending attempt

- **WHEN** startup recovery finds a pending related-items sync attempt
- **THEN** it SHALL inspect current Zotero relation state
- **AND** mark the attempt observed, retryable, failed, or needs attention.

### Requirement: Revocation requires Synthesis-created provenance

Synthesis SHALL revoke only Zotero related-item relations that were created by
Synthesis and still match recorded source/target provenance.

#### Scenario: Backing edge is no longer active

- **WHEN** a previously synced edge is rejected, retargeted, superseded, or loses
  an active binding
- **THEN** the worker MAY revoke the Zotero relation only if provenance proves
  Synthesis created it
- **AND** it SHALL leave pre-existing or user-created relations untouched.
