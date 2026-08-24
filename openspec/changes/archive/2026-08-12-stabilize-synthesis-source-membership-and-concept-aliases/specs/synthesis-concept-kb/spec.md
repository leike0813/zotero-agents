## MODIFIED Requirements

### Requirement: Concept enrichment ingests normalized canonical records

Concept enrichment SHALL normalize proposals and preflight the complete batch against one immutable canonical snapshot before writing any proposal.

#### Scenario: Unique canonical label match merges into existing concept

- **WHEN** a proposal label exactly matches the canonical label of one existing concept
- **THEN** ingestion SHALL add or update a sense and topic link for that concept
- **AND** validated aliases MAY be added to that owner.

#### Scenario: Alias-only match is reviewable

- **WHEN** a proposal has no unique canonical-label match but its label or alias matches an existing alias
- **THEN** ingestion SHALL create an open review item
- **AND** it SHALL NOT write concept, sense, alias, or topic-link records for that proposal.

#### Scenario: Batch order does not change decisions

- **GIVEN** the same proposals are submitted in different orders
- **WHEN** ingestion preflights them
- **THEN** the set of automatic writes and review reasons SHALL be equivalent.

#### Scenario: Batch identity conflict has zero writes

- **WHEN** labels or aliases in the batch claim conflicting concept owners
- **THEN** every affected proposal SHALL enter review with an alias or ambiguity reason
- **AND** no affected proposal SHALL partially mutate Concept KB.

## ADDED Requirements

### Requirement: Existing aliases have an explicit structural audit workflow

Concept KB SHALL expose a deterministic audit that creates review items for structurally risky aliases without automatically changing canonical records.

#### Scenario: Alias collides with another canonical label

- **WHEN** an active alias normalizes to another concept's canonical label
- **THEN** audit SHALL create an open `alias_conflict` review item for that exact alias and owner
- **AND** repeated audit SHALL not duplicate the same open item.

#### Scenario: User keeps an audited alias

- **WHEN** the user applies `keep_alias` to an open alias audit item
- **THEN** the alias records SHALL remain unchanged
- **AND** the review item SHALL close as approved.

#### Scenario: User removes an audited alias

- **WHEN** the user applies `remove_alias` to an open alias audit item
- **THEN** Concept KB SHALL remove the exact alias record and synchronize the owning concept and its senses
- **AND** it SHALL NOT delete a concept or sense
- **AND** the review item SHALL close as rejected.
