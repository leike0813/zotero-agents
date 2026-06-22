## MODIFIED Requirements

### Requirement: User-visible plugin brand text

The plugin SHALL present the current public brand as `Zotero Agents` in active
menus, toolbar labels, preference titles, workspace titles, harness titles, and
Synthesis workbench brand text.

#### Scenario: Visible labels use the current brand
- **WHEN** the plugin renders an active user-facing label for the product
- **THEN** the label uses `Zotero Agents`
- **AND** it does not use `Zotero Skills` or `Zotero-Skills` unless describing
  a compatibility-only internal identifier.

#### Scenario: Compatibility identifiers are preserved
- **WHEN** code refers to add-on identity, resource namespaces, global bridge
  object names, event names, or preference prefixes
- **THEN** existing `zotero-skills` / `ZoteroSkills` identifiers MAY remain
  unchanged for upgrade compatibility.
