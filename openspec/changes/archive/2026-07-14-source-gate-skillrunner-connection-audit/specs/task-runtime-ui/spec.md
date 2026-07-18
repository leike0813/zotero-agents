## ADDED Requirements

### Requirement: Disabled connection audit MUST add no governor runtime work

SkillRunner task runtime MUST preserve connection scheduling behavior without connection-audit state or work whenever debug mode or the connection-audit source switch is disabled.

#### Scenario: Audit collection is compiled out

- **WHEN** a non-debug or source-disabled runtime bundle is built
- **THEN** the audit Store and snapshot facade MUST contribute zero bytes to the main runtime output
- **AND** governor hot paths MUST contain no audit event construction, record calls, bounded-ledger maintenance, or audit-summary work

#### Scenario: Scheduling runs without audit collection

- **WHEN** SkillRunner connections are queued, started, aborted, timed out, settled, or evicted while audit collection is disabled
- **THEN** connection admission, lane ordering, timeout, abort, physical-debt, and settlement results MUST match enabled behavior
- **AND** no audit state MUST be allocated on governor instances

#### Scenario: Audit snapshot is observational

- **WHEN** an enabled diagnostic caller reads the connection-audit snapshot
- **THEN** snapshot construction MUST NOT mutate governor scheduling or physical-debt state
