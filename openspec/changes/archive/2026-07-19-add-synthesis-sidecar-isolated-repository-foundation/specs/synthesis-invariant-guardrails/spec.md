## ADDED Requirements

### Requirement: Repository canary preserves public migration invariants
The service migration inventory SHALL remain 108 public methods and one direct consumer, all eight engines SHALL retain their declared production owner, the two existing production workers SHALL remain unchanged, and `mutationEnabled` SHALL remain false.

#### Scenario: Governance inventory remains stable
- **WHEN** invariant checks parse the migration manifest and service contracts
- **THEN** no public method, consumer, production worker, engine route, or production mutation authority has moved to the repository canary
