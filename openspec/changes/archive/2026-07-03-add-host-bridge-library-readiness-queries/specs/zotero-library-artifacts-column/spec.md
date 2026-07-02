## MODIFIED Requirements

### Requirement: Artifacts column SHALL render artifact presence icons

The library column SHALL display source Markdown, digest, references, and
citation-analysis artifact presence as compact icons for top-level regular
items. The same artifact detection logic SHALL be reusable by Host Bridge
readiness queries so the UI column and agent-facing readiness output agree.

#### Scenario: Source Markdown attachment exists

- **GIVEN** a top-level regular item has a best PDF attachment
- **AND** the same parent item has an attached `.md` or `.markdown` file with
  the same filename stem
- **WHEN** the Artifacts column renders that item or Host Bridge evaluates
  readiness for that item
- **THEN** the shared artifact evaluator SHALL report source Markdown present.

#### Scenario: Generated note markers exist

- **GIVEN** a top-level regular item has direct child notes
- **AND** child note HTML is classified by `parseNoteKind()` as `digest`,
  `references`, or `citation-analysis`, or carries the matching generated
  payload-anchor marker
- **WHEN** the Artifacts column renders that item or Host Bridge evaluates
  readiness for that item
- **THEN** the shared artifact evaluator SHALL report the matching generated
  artifacts.
- **AND** `literature-analysis` readiness SHALL require `digest`, `references`,
  and `citation-analysis` to all be present.
