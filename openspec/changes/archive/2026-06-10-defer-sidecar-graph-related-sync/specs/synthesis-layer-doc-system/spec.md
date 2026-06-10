## MODIFIED Requirements

### Requirement: Docs describe deferred sidecar graph maintenance

Active Synthesis documentation SHALL state that digest apply and Reference Sidecar refresh write sidecar facts and mark graph/related-items sync stale, while graph refresh is an explicit follow-up maintenance action.

#### Scenario: Docs describe sidecar update ordering

- **WHEN** readers consult runtime, graph, UI, or contract documentation
- **THEN** they SHALL see that digest apply and Reference Sidecar refresh do not automatically run graph incremental refresh
- **AND** they SHALL see that related-items sync is deferred until successful manual stale graph refresh or explicit sync.

### Requirement: Docs describe scoped post-refresh related-items sync

Active Synthesis documentation SHALL state that manual stale graph refresh may run scoped related-items sync after graph refresh succeeds.

#### Scenario: Docs describe graph refresh follow-up

- **WHEN** readers consult graph or related-items documentation
- **THEN** they SHALL see that post-refresh related-items sync uses the final affected source refs
- **AND** full graph rebuild SHALL NOT be described as automatically running full-library related-items sync.
