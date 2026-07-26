## ADDED Requirements

### Requirement: SkillRunner transcript observation MUST converge on first owner reactivation
SkillRunner run observation MUST publish history accumulated while an owner is detached when that owner first reattaches or is first selected again. Reactivation MUST preserve monotonic transcript revisions, unique chronological history, and continuous history cursor progression.

#### Scenario: Owner returns after another task was selected
- **WHEN** task A detaches, task B becomes selected, history is appended to A, and the user switches from B back to A
- **THEN** the first A transcript publication includes the accumulated eligible history in chronological order
- **AND** no history entry is duplicated
- **AND** the history cursor continues from A's prior cursor without requiring a second selection.
