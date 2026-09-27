## ADDED Requirements

### Requirement: Durable Reference facts SHALL retain resolvable Canonical References

Reference projection replacement SHALL preserve every Canonical Reference required by a persisted canonical redirect or Canonical Revision review, even when the Canonical Reference has no current Source Reference or accepted binding.

#### Scenario: Refresh no longer produces a protected canonical
- **WHEN** projection replacement no longer receives a Canonical Reference that is an endpoint of a persisted redirect or is referenced by an active Canonical Revision review
- **THEN** the Canonical Reference SHALL remain available to production Reference reads
- **AND** the durable redirect or review fact SHALL remain unchanged.

### Requirement: Unresolvable canonical redirect components SHALL be repaired before production reads

Production repository preparation SHALL repair every persisted redirect component whose effective target is not an existing Canonical Reference. Repair SHALL be backup-backed, transactional, deterministic, auditable, and SHALL mark dependent projections stale when it changes Reference facts.

#### Scenario: Prior repository contains an unresolvable redirect component
- **WHEN** startup opens a supported prior repository containing redirects that resolve to a missing Canonical Reference
- **THEN** migration SHALL remove the unresolvable component without synthesizing Canonical Reference metadata
- **AND** supersede open or accepted proposals corresponding to removed redirect facts
- **AND** record the repair before production reads begin.

#### Scenario: Alias source is absent but its effective target exists
- **WHEN** a persisted redirect source has no Canonical Reference row but its redirect chain resolves to an existing Canonical Reference
- **THEN** migration SHALL retain the redirect as a valid alias.

#### Scenario: Repair is reopened
- **WHEN** repository preparation runs after the repair marker has committed
- **THEN** it SHALL leave the repaired graph and repair receipt unchanged
- **AND** it SHALL NOT create another migration backup.
