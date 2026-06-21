## ADDED Requirements

### Requirement: Task cards SHALL expose unified status axes

ACP Skills and SkillRunner task cards SHALL use the same status display model.

#### Scenario: Card status axes are rendered

- **WHEN** a task card is rendered for an ACP Skills or SkillRunner run
- **THEN** it SHALL show main status as a prominent badge
- **AND** it SHALL show Backend and Apply as compact label-plus-LED rows.

#### Scenario: Failed tasks remain visible

- **WHEN** a task reaches failed, canceled, or apply-failed main status
- **AND** the task is not archived or removed
- **THEN** ACP Skills and SkillRunner panels SHALL keep the task visible.

#### Scenario: Archive icon uses shared icon system

- **WHEN** a task card archive action is rendered
- **THEN** it SHALL use the shared Material Symbols SVG icon classes
- **AND** it SHALL NOT rely on CSS pseudo-element drawing.
