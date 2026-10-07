# Spec Delta

## MODIFIED Requirements

### Requirement: Update preparation turns discovery candidates into explicit source-membership decisions

Update topic synthesis SHALL resolve a bounded open discovery candidate set independently of the topic resolver and SHALL use Stage 30 triage to determine candidate membership. Stage 30 SHALL interpret Topic must/exclude constraints semantically from actual material; uncertainty SHALL remain pending rather than become user rejection or confirmed screening.

#### Scenario: Relevant discovery candidate joins source papers

- **GIVEN** an open discovery hint resolves to a paper outside the linked source set
- **WHEN** Stage 30 classifies the paper as `core` or `related`
- **THEN** finalization SHALL include it in `source_papers`
- **AND** the resolver manifest SHALL record its accepted outcome and exact hint identity.

#### Scenario: Non-relevant discovery candidate is screened out

- **WHEN** Stage 30 classifies a discovery candidate as `external` or `irrelevant`, or confidently determines a must/exclude constraint failure
- **THEN** finalization SHALL omit it from the effective paper workset
- **AND** the resolver manifest SHALL record the classification and screened-out outcome without creating a user rejection.

#### Scenario: Candidate relevance is uncertain

- **WHEN** Stage 30 classifies a discovery candidate as `unknown` or lacks evidence to resolve a constraint
- **THEN** it remains pending, is omitted from adopted source papers, and is not marked rejected or screened out.

#### Scenario: Base resolver combine mode cannot suppress discovery triage

- **GIVEN** the topic resolver uses intersection or another selector combination
- **WHEN** update preparation has open discovery candidates
- **THEN** it SHALL resolve candidate paper refs through a separate union resolver
- **AND** it SHALL preserve the unchanged base resolver as the topic resolver contract.
