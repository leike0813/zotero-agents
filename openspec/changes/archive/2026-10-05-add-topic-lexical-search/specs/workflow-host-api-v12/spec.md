# Spec Delta

## ADDED Requirements

### Requirement: Workflow Host SHALL explicitly project Topic search and context reads

Workflow Host v12 SHALL expose `synthesis.topics.search` and `synthesis.topics.getContext` as explicit members mapped to the corresponding Synthesis client operations, using their existing strict DTOs and shared Workflow Host error adaptation.

#### Scenario: Workflow searches canonical Topic text
- **WHEN** a workflow invokes `host.synthesis.topics.search` with a valid request
- **THEN** the Host forwards the request to the Synthesis Topic search owner and returns its bounded typed result
- **AND** the projection exposes no additional Synthesis client members or owner internals

#### Scenario: Workflow reads a matched Topic context
- **WHEN** a workflow invokes `host.synthesis.topics.getContext` with a Topic identity and `view: "semantic"`
- **THEN** the Host returns the existing Topic context DTO through the existing error adapter
- **AND** it performs no search, resolver expansion, or additional paper-scope resolution

#### Scenario: Synthesis Topic owner is unavailable
- **WHEN** the Synthesis Topic application cannot serve search or context
- **THEN** the members remain present and fail using the Workflow Host Synthesis error contract
