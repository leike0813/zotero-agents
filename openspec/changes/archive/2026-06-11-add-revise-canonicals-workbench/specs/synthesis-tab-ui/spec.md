## ADDED Requirements

### Requirement: Index SHALL expose Revise Canonicals as an on-demand workbench

The Synthesis Workbench Index page SHALL expose `Revise Canonicals` beside the existing matching controls and SHALL render it as an Index functional subview rather than a top-level tab.

#### Scenario: User opens and leaves Revise Canonicals

- **WHEN** the user clicks `Revise Canonicals`
- **THEN** the Index main area SHALL switch to the canonical workbench
- **AND** the normal Index table and Index review drawer SHALL be hidden
- **AND** `Back to Index` SHALL restore the normal Index view without clearing Index filters or drawer state.

### Requirement: Revise Canonicals SHALL show effective canonical rows

Revise Canonicals SHALL display effective projected canonical references with human-readable summaries and diagnostics.

#### Scenario: User inspects canonical rows

- **WHEN** canonical rows are available on the registry surface
- **THEN** the workbench SHALL show title, year, binding, graph state, raw references, redirects, reviews, and action controls
- **AND** bound rows SHALL be projected by Zotero binding target
- **AND** unbound rows SHALL be projected by effective canonical id
- **AND** possible duplicates SHALL be diagnostics, not automatic merge actions.

### Requirement: Revise Canonicals SHALL support pending merge selection

Revise Canonicals SHALL stage merge decisions locally and apply them only through an explicit `Apply pending` action.

#### Scenario: User stages a single merge

- **WHEN** the user clicks `Merge` on one row
- **THEN** that row SHALL become the merge source
- **AND** other eligible rows SHALL expose target selection
- **AND** choosing a target SHALL add a pending merge request without writing storage.

#### Scenario: User stages batch merges

- **WHEN** the user selects multiple rows and clicks `Merge Selected`
- **THEN** selected rows SHALL become merge sources
- **AND** choosing a target SHALL create one pending merge request per source
- **AND** pending source rows SHALL be hidden from the active table until pending state is applied or cleared.

### Requirement: Canonical Details SHALL host metadata edit mode

The Canonical Details area SHALL support a structured edit mode for eligible unbound external canonicals.

#### Scenario: User edits canonical metadata

- **WHEN** the user opens Edit on an eligible row
- **THEN** Canonical Details SHALL show editable title/year/authors/identifiers fields
- **AND** it SHALL show incoming redirect source metadata in a matching readonly comparison panel
- **AND** `Copy to draft` SHALL copy the compared source metadata into the draft
- **AND** dirty drafts SHALL mark the row Edit control until saved or reverted.

### Requirement: Revise Canonicals SHALL preserve Review boundaries

Revise Canonicals SHALL not act as a second approval workflow for Canonical Revision proposals.

#### Scenario: Canonical is managed by Review

- **WHEN** a canonical row has an open Canonical Revision proposal
- **THEN** Revise Canonicals SHALL show the row as Review-managed
- **AND** SHALL NOT expose a second stale lifecycle approve/reject action for that row.
