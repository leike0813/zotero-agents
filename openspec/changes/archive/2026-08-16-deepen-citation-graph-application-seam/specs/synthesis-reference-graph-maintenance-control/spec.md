## ADDED Requirements

### Requirement: No-argument Citation Graph retry SHALL replan from current facts

The existing no-argument Citation Graph rebuild retry capability SHALL create a fresh graph attempt. It SHALL reuse only the Full or Incremental mode of the most recent failed graph command and SHALL derive concrete scope, Reference facts, cache delta, and Host input from current state. It SHALL NOT replay stored source identifiers, worker payloads, or operation identities.

#### Scenario: The latest failed command was a full rebuild
- **WHEN** the no-argument retry capability is invoked after a failed Full graph command
- **THEN** it starts a new Full attempt using current Reference and Host facts
- **AND** a readable last-good graph does not suppress that explicit retry

#### Scenario: The latest failed command was incremental
- **WHEN** the no-argument retry capability is invoked after a failed Incremental graph command
- **THEN** it starts a new Incremental attempt using the current bounded stale delta
- **AND** it does not copy the failed attempt's stored source scope

#### Scenario: No failed mode is available
- **WHEN** no failed graph command exists and current cache state does not safely determine missing, failed, or stale graph work
- **THEN** the capability returns the existing retry-unavailable outcome without dispatching graph work

