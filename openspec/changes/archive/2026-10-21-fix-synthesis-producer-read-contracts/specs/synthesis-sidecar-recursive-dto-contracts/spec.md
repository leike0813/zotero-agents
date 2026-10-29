## ADDED Requirements

### Requirement: Shared Topic structures SHALL follow production domain ownership
Topic proposal, coverage, summary and source-assessment contracts SHALL describe actual producer structures. Canonical proposals and narrower resolver or Concept-fact views SHALL use explicit projections without redefining domain semantics.

#### Scenario: Prospective proposal is read
- **WHEN** a producer emits a prospective relation with `target_topic_seed` and `relation_type`
- **THEN** audit and review accept that shape without requiring graph edge identity fields.

#### Scenario: Historical Concept confidence is read
- **WHEN** a stored Concept proposal contains a numeric confidence in the historical range
- **THEN** reads preserve the number and flag review without inferring a categorical confidence
- **AND** newly produced Concept proposals accept only the categorical confidence values.

### Requirement: Producer continuity evidence SHALL include nonempty domain structures
Contract evidence SHALL exercise real production participants with nonempty shared structures through production, apply, reopen and consumer reads. Schema-only or mock-only checks SHALL remain distinct from execution evidence.

#### Scenario: A valid producer payload crosses the boundary
- **WHEN** the integration suite runs a rich Topic payload
- **THEN** prospective relations, Concept metadata, summary, coverage and source triage remain observable at their declared consumer boundaries.
