## ADDED Requirements

### Requirement: Matcher output affects graph only through explicit decisions or safe apply
Reference matcher output SHALL become graph-affecting state only through deterministic safe apply for the current item or explicit user-approved sidecar decisions.

#### Scenario: Suggested candidate is produced
- **WHEN** the matcher returns suggested, ambiguous, or low-confidence output
- **THEN** Synthesis SHALL store it only as bounded review evidence or diagnostics
- **AND** it SHALL NOT refresh graph cache or create matched graph edges automatically.

## REMOVED Requirements

### Requirement: Literature registry uses the production matcher
**Reason**: The Registry as graph materialization owner is removed.
**Migration**: Sidecar reference apply and explicit binding review use the production matcher where needed.
