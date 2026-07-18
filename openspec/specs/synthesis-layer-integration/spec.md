## ADDED Requirements

### Requirement: Topic artifact engine failures SHALL preserve canonical state

Topic apply SHALL not promote any current files or downstream durable effects
unless all required engine operations complete and their results pass strict
rebuilding.

#### Scenario: Engine fails before promotion
- **WHEN** the configured engine throws, is cancelled, exceeds bounds, or returns malformed output
- **THEN** apply SHALL fail before current files, state maps, topic index, Concept KB, Topic Graph, Discovery, event success, or autosync are updated.

#### Scenario: Patch conflict is returned
- **WHEN** engine section-patch computation returns a read-set conflict
- **THEN** apply SHALL preserve the existing `patch_conflict` response and canonical state.
