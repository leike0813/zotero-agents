## ADDED Requirements

### Requirement: Lifecycle evidence respects the shutdown deadline
Lifecycle recovery, physical uncertainty and cleanup facts SHALL use existing bounded structural audit policy. Shutdown flush SHALL remain best-effort within the shared deadline and SHALL not prevent canonical evidence persistence or recreate a closed/deleted owner.

#### Scenario: Audit sink is stalled at shutdown
- **WHEN** canonical evidence has committed but audit cannot flush
- **THEN** shutdown still ends at the common deadline without changing owner outcomes
