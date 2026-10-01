## Purpose

Coordinates bounded process admission, durable Pi owner recovery, execution budgets, shutdown and safe maintenance while preserving canonical execution evidence.

## ADDED Requirements

### Requirement: Startup restores reservations before new Skill Runs
Startup SHALL enumerate durable owners and restore admitted Workflow reservations before opening new Pi Skill Run admission. Global inventory/accounting failure SHALL close that admission; an individual owner's corruption SHALL remain isolated while its existing reservation remains accounted for. Deep recovery SHALL process one owner at a time with bounded scans and event-loop yielding.

#### Scenario: One owner is corrupt
- **WHEN** trustworthy inventory contains a corrupt owner and a valid owner
- **THEN** the corrupt owner retains its reservation and recovery state while the valid owner can recover within capacity

#### Scenario: Inventory cannot be trusted
- **WHEN** owner enumeration or reservation accounting fails
- **THEN** no new Pi Skill Run is admitted

### Requirement: Process admission reserves foreground capacity
The process SHALL admit at most twelve active turns with at most ten background turns, preserve fair FIFO progress within each lane and reserve two slots for foreground work. Controls SHALL remain responsive outside ordinary admission. Physical occupancy SHALL remain counted until real settlement evidence.

#### Scenario: Background capacity is full
- **WHEN** ten background turns are active
- **THEN** two foreground turns can enter and additional background work waits

### Requirement: Active budgets survive safe continuation
Conversation turns SHALL have a two-hour budget and Skill Runs an eight-hour cumulative budget, lowerable by Workflow but never raised. Monotonic active timing SHALL exclude queue, durable waits and downtime. Safe checkpoints SHALL persist consumed and remaining budget, and restart SHALL not replenish it. Provider inactivity/hard limits SHALL be five/sixty minutes, ordinary file/Zotero/Web two minutes, long traversal/attachment fifteen minutes, Shell default fifteen and maximum sixty minutes, and individual tool hard maximum sixty minutes.

#### Scenario: Safe restart after partial budget consumption
- **WHEN** a Skill Run restarts from a valid checkpoint
- **THEN** it continues with its recorded remaining budget rather than a new eight hours

### Requirement: Restart recovery does not replay uncertain work
Conversations SHALL never auto-dispatch. Waiting and suspended Skill Runs SHALL retain their durable states. Only a previously running Skill Run with verified safe checkpoint, known effects, valid immutable resources and restored reservation SHALL auto-continue through background admission with its original request identity. Unknown resolution SHALL require explicit continuation.

#### Scenario: Started tool has no receipt
- **WHEN** startup finds an invocation without authoritative completion evidence
- **THEN** the owner retains an unknown recovery hold and neither the original tool nor subsequent model work is dispatched

### Requirement: Shutdown has one absolute cleanup deadline
Shutdown SHALL immediately close admission/scheduling and signal cancellation. All owner, executor, transport and audit waits SHALL share one absolute fifteen-second deadline. Canonical evidence SHALL have priority over best-effort audit. Deadline expiry SHALL retain unproved resources and pending cleanup, and late callbacks SHALL not reopen infrastructure or change sealed outcomes.

#### Scenario: Several executors never settle
- **WHEN** several active owners ignore cancellation
- **THEN** shutdown stops waiting at the common deadline and preserves their unresolved claims and files

### Requirement: Maintenance is serial and hold-safe
Startup SHALL run serial, bounded recovery before age cleanup. One daily trigger SHALL run serial, non-overlapping cleanup without polling unresolved operations. Conversations SHALL not expire by age. Terminal archived/removed Skill Runs SHALL expire after thirty days only without execution, unknown/repair, receipt or apply holds. Explicit deletion SHALL mark deleting before removing owned data, retry cleanup_pending idempotently and retain a minimal receipt after success. External directories and independent products SHALL remain untouched.

#### Scenario: Archived run has unknown effects
- **WHEN** its archive age exceeds thirty days
- **THEN** unresolved recovery files and evidence remain
