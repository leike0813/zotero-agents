## MODIFIED Requirements

### Requirement: ACP Skills run secondary labels SHALL be consistent

ACP Skills selected-run banners and run drawer task cards SHALL use the same secondary label rule as SkillRunner runs.

#### Scenario: Single ACP Skills workflow shows current skill
- **WHEN** a single ACP Skills workflow run has `skillName`
- **THEN** the banner subtitle SHALL show `skillName`
- **AND** the task-card secondary line SHALL show `skillName -> skillId -> requestId`
- **AND** workflow label SHALL NOT replace the skill label for single runs

#### Scenario: ACP Skills sequence step shows step skill and workflow
- **WHEN** an ACP Skills sequence step has step index `1`, `skillName`, and `workflowLabel`
- **THEN** the banner subtitle SHALL show `2️⃣ <skillName>/<workflowLabel>`
- **AND** the task-card secondary line SHALL show the same value

### Requirement: ACP Skills read model SHALL preserve sequence step index

ACP Skills run records and summaries SHALL preserve `sequenceStepIndex` when a sequence step run is recorded.

#### Scenario: ACP sequence step index reaches UI projection
- **WHEN** an ACP skill run update includes `sequenceStepIndex`
- **THEN** the run record SHALL retain that number
- **AND** list summaries SHALL include that number
