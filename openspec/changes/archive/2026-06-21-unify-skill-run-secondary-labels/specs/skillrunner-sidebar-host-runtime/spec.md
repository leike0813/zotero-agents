## MODIFIED Requirements

### Requirement: SkillRunner run secondary labels SHALL be consistent

SkillRunner selected-run banners and run drawer task cards SHALL use the same secondary label rule.

#### Scenario: Single SkillRunner workflow shows current skill
- **WHEN** a single SkillRunner workflow run has `skillName`
- **THEN** the banner subtitle SHALL show `skillName`
- **AND** the task-card secondary line SHALL show the same value
- **AND** workflow label SHALL NOT replace the skill label for single runs

#### Scenario: SkillRunner sequence step shows step skill and workflow
- **WHEN** a SkillRunner sequence step has step index `0`, `skillName`, and `workflowLabel`
- **THEN** the banner subtitle SHALL show `1️⃣ <skillName>/<workflowLabel>`
- **AND** the task-card secondary line SHALL show the same value
