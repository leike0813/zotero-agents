## ADDED Requirements

### Requirement: Recovery inventory and checkpoints preserve canonical authority
Owner inventory SHALL include canonical directories and registry identities, expose reliable accounting failure and support bounded serial inspection. Lifecycle SHALL automatically invoke safe torn-tail repair and rebuild lagging projections while preserving committed corruption. Versioned budget/checkpoint, invocation binding and deletion facts SHALL remain canonical; SQLite SHALL contain only rebuildable scalars or minimal deletion receipts.

#### Scenario: Registry misses a committed owner
- **WHEN** a valid owner directory exists without its registry projection
- **THEN** startup discovers and reconstructs it without losing admitted execution facts

#### Scenario: Budget evidence is missing
- **WHEN** an already-dispatched owner has no trustworthy active-budget checkpoint
- **THEN** automatic continuation is refused and its canonical history is preserved

## MODIFIED Requirements

### Requirement: Transcript inspection protects committed facts

The store SHALL distinguish a final uncommitted torn line from corruption in committed history. It SHALL refuse writes to corrupt history. A torn tail SHALL be repaired only after rechecking the source, either on explicit request or during lifecycle recovery; committed entries SHALL remain intact.

#### Scenario: Tail is incomplete
- **WHEN** a log ends in a partial JSONL line after valid committed entries
- **THEN** inspection reports the last valid byte offset and explicit or lifecycle repair preserves valid entries with a repair fact

#### Scenario: Committed history is corrupt
- **WHEN** a middle line is invalid or a parent entry is missing
- **THEN** inspection reports recovery required without truncating the log
