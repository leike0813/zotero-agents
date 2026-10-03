## ADDED Requirements

### Requirement: Preparation consumes the frozen applicable metadata
Every invocation SHALL reserve input/output and apply reasoning and compaction against the turn's frozen applicable facts. Its durable preparation record SHALL reference safe canonical selection evidence and invocation identity before dispatch. Missing necessary limits SHALL block execution unless the admitted adapter contract supplies a reliable bound. Failed compaction or stale CAS SHALL preserve the original path.

#### Scenario: Public limits change during a turn
- **WHEN** a catalog update lowers a model's limits during an active turn
- **THEN** that turn retains its frozen limits and the next turn validates the new limits without discarding required input

#### Scenario: Automatic and manual compaction choose different models
- **WHEN** automatic compaction belongs to a turn or manual compaction explicitly selects an auxiliary model
- **THEN** each preparation and usage fact references its actual frozen selection and purpose
