## MODIFIED Requirements

### Requirement: Runtime persistence naming remains compatibility-safe

The system SHALL use `zotero-agents` for current visible persistence root
defaults and examples while continuing to recognize legacy `zotero-skills`
locations during migration and diagnostics.

#### Scenario: Current default paths are visible
- **WHEN** preferences, docs, or diagnostics describe the current managed
  persistence root
- **THEN** they describe `zotero-agents` paths.

#### Scenario: Legacy identifiers remain recognized
- **WHEN** migration or compatibility code checks existing runtime roots,
  database files, or environment overrides
- **THEN** it SHALL continue to support the existing legacy names required for
  safe upgrades.
