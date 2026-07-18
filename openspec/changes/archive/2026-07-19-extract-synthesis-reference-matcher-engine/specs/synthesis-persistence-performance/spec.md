## ADDED Requirements

### Requirement: Advanced matcher compute SHALL use bounded lock sections

Advanced Reference Matching SHALL hold the per-library write lock only while capturing or recapturing its durable repository basis and while transactionally promoting validated results.

#### Scenario: Host or engine work is running

- **WHEN** Host library metadata is loading or binding/dedupe computation is executing
- **THEN** the per-library write lock SHALL be released
- **AND** the engine SHALL perform no repository or Host I/O.

### Requirement: Reference matcher requests SHALL be explicitly bounded

Production matcher contracts SHALL enforce stress-tier collection bounds, bounded per-row evidence, bounded candidate output, and fixed cluster block and pair budgets.

#### Scenario: A matcher bound is exceeded

- **WHEN** library papers, binding inputs, dedupe canonicals, evidence arrays, strings, cluster blocks, or candidate pairs exceed policy
- **THEN** computation SHALL fail before durable promotion
- **AND** prior durable matcher decisions SHALL remain readable.

### Requirement: Advanced matcher promotion SHALL be atomic

Validated binding and canonical-dedupe results for one captured basis SHALL be promoted in one repository transaction.

#### Scenario: Matcher transaction fails

- **WHEN** any binding, redirect, proposal, graph-stale, or operation-completion write fails
- **THEN** the transaction SHALL roll back the entire matcher promotion
- **AND** no partial pass result SHALL remain durable.
