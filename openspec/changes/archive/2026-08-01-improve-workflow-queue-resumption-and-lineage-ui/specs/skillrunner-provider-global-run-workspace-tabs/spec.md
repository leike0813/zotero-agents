## ADDED Requirements

### Requirement: SkillRunner unfinished rows SHALL expose submission identity

SkillRunner queued, running, waiting, and resumption-pending task rows owned by a Host submission SHALL use the shared submission-symbol presentation used by ACP Skills. The symbol SHALL precede the title, remain absent from the subtitle, expose equivalent tooltip and `aria-label` semantics, and disappear for terminal rows.

#### Scenario: SkillRunner submission spans task states

- **WHEN** tasks from one submission are queued, running, waiting, or resumption-pending
- **THEN** every unfinished row SHALL retain the same symbol
- **AND** its existing state text SHALL remain the sole task-state indicator
