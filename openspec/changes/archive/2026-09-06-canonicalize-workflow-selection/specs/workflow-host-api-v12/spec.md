## ADDED Requirements

### Requirement: V12 selection SHALL project the canonical page contract
The explicit v12 context projection SHALL expose getSelectedItems(request?, control?) with the Broker exact selection page contract. The synchronous current-view member SHALL retain canonical library-tree source facts without an embedded selected-item array. These signature changes SHALL NOT add a callable or expose owner internals.

#### Scenario: Scoped selection read is invoked
- **WHEN** a Workflow calls context.getSelectedItems with a page request
- **THEN** the projection forwards the request and effective trusted control and returns the canonical page
