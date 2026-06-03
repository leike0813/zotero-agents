## MODIFIED Requirements

### Requirement: Reference binding status is minimal
Reference binding facts SHALL represent accepted canonical-reference-to-Zotero targets; proposal and review state SHALL be represented separately.

#### Scenario: Legacy accepted bindings are read
- **WHEN** existing binding rows contain previous `auto` or `confirmed` values
- **THEN** active Index and graph code SHALL normalize them to accepted facts
- **AND** automatic or user-confirmed provenance SHALL be represented as evidence, not as separate states.

#### Scenario: Candidate binding is produced
- **WHEN** advanced matching produces a candidate or ambiguous Zotero binding
- **THEN** it SHALL create or update a reference match proposal
- **AND** it SHALL NOT persist that candidate as a binding fact.

## ADDED Requirements

### Requirement: Reference match proposals separate review from facts
Synthesis SHALL store advanced matcher review candidates in `synt_reference_match_proposal`.

#### Scenario: Zotero binding proposal is open
- **WHEN** a candidate Zotero target needs review
- **THEN** the proposal SHALL store source canonical reference, target library/item key, confidence, score, reasons, diagnostics, and basis hash.

#### Scenario: Canonical merge proposal is open
- **WHEN** a canonical dedupe candidate needs review
- **THEN** the proposal SHALL store source canonical reference, target canonical reference, confidence, score, reasons, diagnostics, and basis hash.

### Requirement: Accepted proposals write graph-affecting facts
Accepting a reference match proposal SHALL write the corresponding accepted fact and mark citation graph cache stale.

#### Scenario: Binding proposal is accepted
- **WHEN** the user accepts a `zotero_binding` proposal
- **THEN** Synthesis SHALL write an accepted reference binding fact
- **AND** mark the proposal accepted.

#### Scenario: Canonical merge proposal is accepted
- **WHEN** the user accepts a `canonical_merge` proposal
- **THEN** Synthesis SHALL write a canonical reference redirect fact
- **AND** mark the proposal accepted.

