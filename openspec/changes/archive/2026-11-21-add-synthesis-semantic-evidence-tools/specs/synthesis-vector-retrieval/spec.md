# Spec Delta

## ADDED Requirements

### Requirement: Workbench and agent semantic searches SHALL share retrieval

Workbench semantic search SHALL reuse the agent evidence implementation for ranking and source verification. Workbench retains its result presentation, local threshold and source opening behavior.

#### Scenario: A query is issued through either surface

- **WHEN** effective scope and requested result count agree
- **THEN** the surfaces return the same ordered, verified sources within their respective response budgets.

## MODIFIED Requirements

### Requirement: Reads SHALL NOT initiate index work

Index creation and full rebuild SHALL require explicit user maintenance. Reliable scoped changes MAY enqueue bounded updates only for an existing index. Startup, queries and Home reads SHALL NOT perform a full source scan, encode missing sources or start index maintenance.

#### Scenario: Empty index is opened

- **WHEN** the user opens Home or runs search without an index
- **THEN** no build starts. Existing lexical and hybrid searches keep their independent lexical behavior. Explicit semantic evidence search reports the missing index.
