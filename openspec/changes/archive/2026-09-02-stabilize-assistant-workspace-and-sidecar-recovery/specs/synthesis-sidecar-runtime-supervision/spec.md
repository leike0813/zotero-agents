## ADDED Requirements

### Requirement: The production-lock winner SHALL reconcile stale discovery

Startup SHALL remove a pre-existing discovery document only after winning the
production lock. Missing discovery SHALL succeed. Other cleanup failures SHALL
return `stale_discovery_cleanup_failed` and release the acquired lock.

#### Scenario: A prior owner died after readiness
- **WHEN** no live process holds the lock but discovery remains
- **THEN** the next owner removes it before publishing its own ready document

#### Scenario: A competing owner is live
- **WHEN** lock acquisition returns `production_lock_conflict`
- **THEN** the losing process leaves the live owner's discovery unchanged

#### Scenario: Parent input closes after readiness
- **WHEN** the real sidecar process observes parent EOF
- **THEN** it exits successfully within the lifecycle bound and removes discovery
