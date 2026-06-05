## REMOVED Requirements

### Requirement: Legacy tag-manager remains compatible but not primary

The legacy tag-manager workflow SHALL remain available as a compatibility path
while Synthesis Workbench Tags becomes the primary tag vocabulary management
surface.

#### Scenario: Existing tag-manager workflow is still loadable

- **WHEN** workflow packages are loaded
- **THEN** the legacy tag-manager workflow SHALL remain loadable
- **AND** this change SHALL NOT remove existing prefs-backed vocabulary
  behavior.

#### Scenario: New Synthesis Tags page is the preferred entry

- **WHEN** users manage Synthesis KG tag vocabulary
- **THEN** the Synthesis Workbench Tags page SHALL be the primary path
- **AND** old tag-manager persistence SHALL only be used as compatibility or
  fallback state.

## ADDED Requirements

### Requirement: Legacy tag-manager is no longer builtin

The legacy tag-manager workflow SHALL be deprecated and excluded from builtin
workflow registration.

#### Scenario: Builtin workflows are loaded

- **WHEN** builtin workflow packages are scanned
- **THEN** `tag-manager` SHALL NOT be loaded as a builtin workflow
- **AND** `tag-vocabulary-package` SHALL NOT be required for builtin workflow
  operation.

#### Scenario: Existing prefs-backed vocabulary exists

- **WHEN** old `tagVocabularyJson`, `tagVocabularyStagedJson`, or tag-manager
  GitHub workflow settings exist
- **THEN** this migration SHALL NOT import them into Synthesis automatically
- **AND** Synthesis Tag Vocabulary SHALL remain the canonical tag state.

### Requirement: Legacy staged inbox is replaced by Synthesis Workbench

The staged tag management capabilities formerly owned by `tag-manager` SHALL be
provided by the Synthesis Workbench Tags page instead of the legacy workflow UI.

#### Scenario: User needs staged tag management

- **WHEN** a user needs to review staged tag suggestions
- **THEN** the builtin path SHALL be the Synthesis Workbench Tags Staged subview
- **AND** the legacy `tag-manager` renderer SHALL NOT be reused as the builtin
  staged inbox.

#### Scenario: Old prefs-backed staged data exists

- **WHEN** old `tagVocabularyStagedJson` data exists
- **THEN** the Synthesis Workbench staged inbox SHALL NOT display that prefs
  data
- **AND** it SHALL display only staged suggestions stored by Synthesis.
