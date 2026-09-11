## MODIFIED Requirements

### Requirement: Readonly Dashboard harness snapshots SHALL carry Dashboard labels

Readonly Dashboard harness snapshots SHALL provide the label keys required by the reused Dashboard UI code and SHALL carry the sidebar placement facts the reused UI groups by.

#### Scenario: Dashboard harness renders without Zotero host labels

- **WHEN** the readonly harness serves a Dashboard snapshot
- **THEN** the snapshot MUST include fixed Dashboard labels
- **AND** the harness MUST reuse the real Dashboard UI renderer rather than forking localized copy in harness-only code

#### Scenario: Dashboard harness renders the sidebar groups

- **WHEN** the readonly harness serves the Dashboard sidebar tabs
- **THEN** every tab MUST carry its sidebar group placement
- **AND** the sidebar MUST render the system group header above its tabs and the backend group header above the backend tabs, matching production placement
- **AND** no group header MUST be rendered detached below its tabs.
