## ADDED Requirements

### Requirement: Legacy tag-manager remains compatible but not primary

The legacy tag-manager workflow SHALL remain available as a compatibility path while Synthesis Workbench Tags becomes the primary tag vocabulary management surface.

#### Scenario: Existing tag-manager workflow is still loadable

- **WHEN** workflow packages are loaded
- **THEN** the legacy tag-manager workflow SHALL remain loadable
- **AND** this change SHALL NOT remove existing prefs-backed vocabulary behavior.

#### Scenario: New Synthesis Tags page is the preferred entry

- **WHEN** users manage Synthesis KG tag vocabulary
- **THEN** the Synthesis Workbench Tags page SHALL be the primary path
- **AND** old tag-manager persistence SHALL only be used as compatibility or fallback state.
