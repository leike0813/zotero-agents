## MODIFIED Requirements

### Requirement: Reference resolution states match matcher output contract

Reference-resolution state documentation SHALL use `matched`, `suggested`, `unmatched`, and `ambiguous` as the current runtime status contract.

#### Scenario: Suggested candidate is produced

- **WHEN** the matcher returns a `suggested` candidate
- **THEN** no matched citation graph edge SHALL be materialized
- **AND** the state-machine contract SHALL NOT require `matched_auto` or `matched_confirmed` runtime states for this behavior.
