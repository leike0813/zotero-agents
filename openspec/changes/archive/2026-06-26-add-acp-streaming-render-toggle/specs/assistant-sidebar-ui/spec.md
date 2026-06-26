## ADDED Requirements

### Requirement: ACP Panels Expose Streaming Render Toggle

ACP Chat and ACP Skills SHALL show a toolbar switch for the global streaming
render preference. The switch SHALL be right-aligned in the managed toolbar,
use a green visual state when enabled, and use a red visual state when disabled.

The Preferences checkbox and both ACP toolbar switches SHALL read and write the
same global preference. Changing the state from any of these surfaces SHALL
update the other open surfaces.

SkillRunner SHALL NOT show this switch and SHALL NOT change behavior for this
preference.

#### Scenario: ACP Chat switch updates ACP Skills
- **GIVEN** ACP Chat and ACP Skills surfaces are open
- **WHEN** the user changes the streaming render switch in ACP Chat
- **THEN** ACP Skills receives the same preference state on its next snapshot.

#### Scenario: Preferences checkbox updates ACP panels
- **WHEN** the user changes the Preferences checkbox
- **THEN** ACP Chat and ACP Skills toolbar switches reflect the same state
- **AND** SkillRunner remains unchanged.
