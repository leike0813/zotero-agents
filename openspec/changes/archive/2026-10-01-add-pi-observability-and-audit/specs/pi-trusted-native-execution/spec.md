## ADDED Requirements

### Requirement: Audit shares owner quota with lower priority

Native Workspace admission SHALL include audit in the existing shared 2 GiB owner budget, including Workspace roots nested inside the owner directory and in-flight reservations. Audit SHALL have its own sub-budget and SHALL NOT displace canonical facts, receipts, results or user files. Business allocation SHALL reclaim eligible audit before rejecting solely because audit consumed remaining space; only the audit retention policy SHALL remove diagnostic records. Missing quota evidence SHALL prevent audit allocation without failing business state.

#### Scenario: Nested Workspace contains audit and business files

- **WHEN** a Conversation Workspace lies inside its private owner tree
- **THEN** Workspace and audit bytes are counted exactly once along with managed files and staging reservations

#### Scenario: Audit consumes remaining quota

- **WHEN** a business allocation needs space currently occupied by audit
- **THEN** audit is reclaimed using its policy without deleting business data
