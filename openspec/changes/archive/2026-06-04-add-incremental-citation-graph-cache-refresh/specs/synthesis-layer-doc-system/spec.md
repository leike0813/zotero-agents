## ADDED Requirements

### Requirement: Docs describe graph incremental and full rebuild modes

Active Synthesis documentation SHALL describe source-slice incremental graph refresh and explicit full graph rebuild as separate maintenance modes.

#### Scenario: Docs no longer say graph cache is only full rebuilt

- **WHEN** readers consult runtime, graph, performance, UI, state-machine, or invariant docs
- **THEN** they SHALL see the incremental refresh trigger rules and bootstrap policy.
