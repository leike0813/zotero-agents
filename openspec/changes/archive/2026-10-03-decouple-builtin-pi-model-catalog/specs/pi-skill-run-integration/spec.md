## ADDED Requirements

### Requirement: Skill continuation anchors selection without resetting execution
A new Skill Run turn SHALL revalidate the last actual configuration/model/reasoning against current applicable metadata unless the user explicitly changes it. It SHALL retain mode, lane, prepared skill, cumulative budgets, LoopGuard and pending/unknown-effect gates. Automatic compaction within a turn SHALL share its frozen selection and canonical invocation accounting.

#### Scenario: Default changes before interactive continuation
- **WHEN** an interactive run admitted through a default pauses and that default changes
- **THEN** continuation validates the original choice without resetting budgets or replaying tools
