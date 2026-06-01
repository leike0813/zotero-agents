## MODIFIED Requirements

### Requirement: Active docs SHALL define stable literature identity semantics

Active docs SHALL state that `paper_ref` is a public Zotero-bound locator and
binding fallback, not the default canonical literature identity seed.
`literature_item_id` SHALL be deterministic from the selected identity anchor.

#### Scenario: A Zotero-bound paper is registered

- **WHEN** a Zotero-bound paper has DOI, arXiv, ISBN, or stable canonical URL
- **THEN** active docs require the strong work identity anchor to take priority
  over the binding fallback
- **AND** `paper_ref` remains available as a lookup/display binding.

#### Scenario: A paper has no strong work identity

- **WHEN** no accepted redirect or non-conflicting strong identity is available
- **THEN** active docs allow a binding fallback derived from `paper_ref`
- **AND** the fallback can later redirect to a stronger work identity.

### Requirement: Active docs SHALL keep Discovery lightweight by default

Active docs SHALL define discovery hints as lightweight suggestions with only
`open`, `rejected`, and `superseded` lifecycle states.

#### Scenario: A discovery hint is rejected

- **WHEN** digest rerun, metadata hash drift, or Registry rebuild recomputes the
  same topic-literature pair
- **THEN** the rejected hint remains suppressed
- **AND** it is not reopened unless the user restores it, resets history, or a
  force repair is requested.

### Requirement: Active docs SHALL define critical runtime edge cases

Active docs SHALL document transaction-local basis gates for Registry-dependent
derived workers and durable echo suppression for related-items sync.

#### Scenario: A derived worker basis becomes stale

- **WHEN** a Graph, metrics, layout, or related read-model worker finishes after
  Registry basis advancement
- **THEN** its final promotion transaction SHALL reject the stale output
- **AND** active visible state SHALL remain unchanged.

#### Scenario: A related-items sync writes Zotero relations

- **WHEN** Zotero emits item change events caused by Synthesis related-items sync
- **THEN** active docs require echo classification through durable sync
  attempt/effect rows
- **AND** in-memory recent-write markers are not sufficient for correctness.
