## ADDED Requirements

### Requirement: Readonly Dashboard harness snapshots SHALL carry Dashboard labels

Readonly Dashboard harness snapshots SHALL provide the label keys required by the reused Dashboard UI code.

#### Scenario: Dashboard harness renders without Zotero host labels

- **WHEN** the readonly harness serves a Dashboard snapshot
- **THEN** the snapshot MUST include fixed Dashboard labels
- **AND** the harness MUST reuse the real Dashboard UI renderer rather than forking localized copy in harness-only code
