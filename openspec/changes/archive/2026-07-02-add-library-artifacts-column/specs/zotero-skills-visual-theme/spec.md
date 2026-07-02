## ADDED Requirements

### Requirement: Artifact status icons SHALL use a reusable bundled SVG set

The plugin SHALL provide a bundled SVG icon set for source Markdown, digest,
references, and citation-analysis artifact status indicators.

#### Scenario: Artifact icons render in Zotero and browser UI

- **WHEN** the Zotero library Artifacts column or Synthesis Index artifact cell
  renders an artifact state
- **THEN** it SHALL use the bundled artifact SVG for that artifact type
- **AND** the icons SHALL remain visually distinct while sharing one file-style
  visual language.

#### Scenario: Missing artifacts are visually distinct

- **WHEN** Synthesis Index renders a missing digest, references, or
  citation-analysis artifact
- **THEN** the same icon shape MAY be shown with a muted or translucent missing
  treatment rather than substituting a text badge.
