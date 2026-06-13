## ADDED Requirements

### Requirement: Assistant compact controls SHALL preserve readable alignment
The shared Assistant panel renderer SHALL keep compact context selectors,
reply-footer selectors, indicator rows, and icon actions readable and aligned
across normal and narrow sidebars.

#### Scenario: Selector rows do not overlap action buttons

- **WHEN** ACP Chat, ACP Skills, or SkillRunner renders managed selector rows
  in the Assistant sidebar
- **THEN** selector controls SHALL stay within their allocated region
- **AND** adjacent icon actions such as add, details, backend management, or
  drawer actions SHALL remain separately clickable.

#### Scenario: Compact icon controls remain centered

- **WHEN** the Assistant panel renders compact circular or square icon actions
- **THEN** the icon glyph SHALL be visually centered inside the control
- **AND** the control SHALL keep its tooltip or accessible label.

#### Scenario: Narrow sidebars keep assistant controls usable

- **WHEN** the Assistant sidebar is rendered at a narrow width
- **THEN** selector rows, reply controls, and action groups SHALL wrap or
  constrain without hiding primary send/cancel semantics
- **AND** the panel SHALL preserve existing reply-state behavior.
