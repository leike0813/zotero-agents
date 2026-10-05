# Spec Delta

## ADDED Requirements

### Requirement: Workflow Host SHALL expose Broker Library item search explicitly
Workflow Host v12 SHALL expose `library.searchItems` with the canonical Broker search request, result, and `WorkflowCallControl` types as a member-level explicit projection.

#### Scenario: Workflow searches the current Library scope
- **WHEN** a workflow calls `host.library.searchItems` with a valid request
- **THEN** the projection delegates to the canonical Broker search owner and returns its complete typed search result

#### Scenario: Broker search execution is unavailable
- **WHEN** the Broker search mechanism is unavailable
- **THEN** `host.library.searchItems` remains present in both Workflow Host variants and returns the stable unavailable error without a list or SynthesisClient fallback

#### Scenario: Workflow surface conformance is inspected
- **WHEN** the code-native Workflow Host v12 manifest is compared with its public type and runtime projection
- **THEN** `library.searchItems` is present in all three and no additional Broker members are exposed
