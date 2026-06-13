## ADDED Requirements

### Requirement: Synthesis Topic Detail visual hierarchy SHALL remain readable
Synthesis Topic Detail SHALL render left navigation tabs, primary content
cards, and summary hero surfaces with clear visual hierarchy while preserving
the existing host-owned action and data contracts.

#### Scenario: Topic detail left tabs expose active state clearly

- **WHEN** Topic Detail renders left-side section tabs
- **THEN** the active tab SHALL use a high-contrast active treatment that is
  distinguishable from hover and default states
- **AND** the tab state SHALL not depend on rewriting the underlying topic DTO
  or host action payload.

#### Scenario: Topic detail content cards remain readable

- **WHEN** Topic Detail renders claims, findings, debates, outline rows, or
  other structured content cards
- **THEN** the cards SHALL provide enough internal spacing for generated text
  to be readable
- **AND** hover elevation SHALL remain decorative without changing selection,
  navigation, or data state.

#### Scenario: Summary hero is visually separated

- **WHEN** the Synthesis overview or topic summary hero renders above dense
  workbench content
- **THEN** the hero SHALL be visually separated from surrounding sections
- **AND** the separation SHALL use theme-compatible surface, border, and shadow
  styling.
