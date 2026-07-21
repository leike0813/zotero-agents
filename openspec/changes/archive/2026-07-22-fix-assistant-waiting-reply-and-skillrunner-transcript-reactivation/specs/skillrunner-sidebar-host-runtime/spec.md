## ADDED Requirements

### Requirement: Temporary SkillRunner host detach MUST preserve transcript publication continuity
The SkillRunner host runtime MUST distinguish temporary host detachment from complete runtime teardown. Temporary detachment MUST preserve the owner transcript revision and published transcript cache, while complete runtime teardown MUST clear them.

#### Scenario: Same owner reattaches after backend history advances
- **WHEN** a selected SkillRunner owner publishes revision N, its host temporarily detaches, backend history advances, and the same runtime reattaches to the retained consumer
- **THEN** the reattached publication revision is not lower than N
- **AND** the first eligible transcript update advances the revision and displays the new history without another owner switch.

#### Scenario: Runtime is completely destroyed
- **WHEN** plugin shutdown, test reset, or standalone dialog destruction performs complete runtime teardown
- **THEN** the runtime clears its transcript publication clock and published transcript cache.
