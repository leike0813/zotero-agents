## ADDED Requirements

### Requirement: ACP Chat UI snapshots SHALL support structural transcript item reads

ACP Chat SHALL expose an explicit UI snapshot read mode that returns transcript
structure without complete transcript content. The default UI snapshot read mode
SHALL remain full until the ACP Chat child panel is migrated to page-based
rendering.

#### Scenario: Default UI snapshot remains full

- **WHEN** ACP Chat code requests a UI snapshot without an item mode option
- **THEN** the snapshot retains the existing full transcript item behavior.

#### Scenario: Structural UI snapshot omits transcript content rows

- **WHEN** ACP Chat code requests a UI snapshot with structural item mode
- **THEN** the snapshot items SHALL include plan items only
- **AND** it SHALL NOT include message, thought, or tool-call transcript items
- **AND** transcript metadata such as revision, count, preview, and state SHALL
  remain available.

#### Scenario: Structural publish does not retain full transcript items

- **WHEN** ACP Chat publishes a structural UI snapshot
- **THEN** the published UI snapshot SHALL NOT retain message, thought, or
  tool-call transcript items even if the transcript mirror is loaded.
