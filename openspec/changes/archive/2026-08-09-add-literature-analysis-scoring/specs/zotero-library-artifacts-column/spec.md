## ADDED Requirements

### Requirement: Zotero library SHALL expose a Rating column

The plugin SHALL register a hidden-by-default `literatureRating` custom column
after the Artifacts column and preserve user-persisted column order.

#### Scenario: Valid score is rendered

- **WHEN** a top-level item has a valid `literature_score.v1` payload
- **THEN** Rating SHALL map `overall_score` to the nearest half star
- **AND** 60 SHALL render three filled and two hollow stars
- **AND** 65 SHALL render three filled, one half-filled, and one hollow star.

#### Scenario: Score is missing or invalid

- **WHEN** no valid score payload can be resolved
- **THEN** Rating SHALL render five gray stars
- **AND** its accessible label SHALL identify the score as unavailable.

#### Scenario: Item-tree data is requested repeatedly

- **WHEN** Artifacts and Rating are requested for the same parent item
- **THEN** both columns SHALL share one asynchronous scan and cache entry
- **AND** note or child attachment changes SHALL invalidate and refresh only the
  affected parent rows.

### Requirement: Rating SHALL remain separate from artifact completeness

The Rating column SHALL NOT alter the artifact kinds or completeness state
rendered by the Artifacts column.

#### Scenario: Score exists or is absent

- **WHEN** the Artifacts column computes digest, references, and
  citation-analysis readiness
- **THEN** score state SHALL NOT add an artifact icon or change the existing
  three-artifact semantics.
