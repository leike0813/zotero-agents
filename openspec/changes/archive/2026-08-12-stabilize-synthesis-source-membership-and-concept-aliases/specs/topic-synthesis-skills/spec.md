## ADDED Requirements

### Requirement: Update preparation turns discovery candidates into explicit source-membership decisions

Update topic synthesis SHALL resolve a bounded open discovery candidate set independently of the topic resolver and SHALL use Stage 30 triage to determine candidate membership.

#### Scenario: Relevant discovery candidate joins source papers

- **GIVEN** an open discovery hint resolves to a paper outside the linked source set
- **WHEN** Stage 30 classifies the paper as `core` or `related`
- **THEN** finalization SHALL include it in `source_papers`
- **AND** the resolver manifest SHALL record its accepted outcome and exact hint identity.

#### Scenario: Non-relevant discovery candidate is screened out

- **WHEN** Stage 30 classifies a discovery candidate as `external`, `irrelevant`, or `unknown`
- **THEN** finalization SHALL omit it from the effective paper workset
- **AND** the resolver manifest SHALL record the classification and screened-out outcome.

#### Scenario: Base resolver combine mode cannot suppress discovery triage

- **GIVEN** the topic resolver uses intersection or another selector combination
- **WHEN** update preparation has open discovery candidates
- **THEN** it SHALL resolve candidate paper refs through a separate union resolver
- **AND** it SHALL preserve the unchanged base resolver as the topic resolver contract.

### Requirement: Stage 50 aliases express lexical equivalence

Stage 50 SHALL accept aliases only when they are interchangeable names for the same concept in the same sense.

#### Scenario: Related terms are represented outside aliases

- **WHEN** a term is broader, narrower, a component, task, method, dataset, benchmark, application, or merely associated
- **THEN** the agent SHALL NOT put it in `aliases`
- **AND** it SHALL use a relation proposal or separate concept when appropriate.

#### Scenario: Concept details are structurally bounded

- **WHEN** Stage 50 submits `concept_details`
- **THEN** every entry SHALL provide `label`, `aliases`, `concept_type`, `definition`, and `topic_relevance`
- **AND** unknown fields SHALL be rejected
- **AND** aliases SHALL be unique and bounded.

#### Scenario: Agent checks existing concept identity before proposing

- **WHEN** the agent prepares Stage 50 concept details
- **THEN** it SHALL call the read-only `synthesis concept query` command
- **AND** use the returned canonical labels and aliases as evidence without mutating Concept KB.
