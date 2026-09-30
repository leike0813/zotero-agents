## ADDED Requirements

### Requirement: Conversation preserves mutation identity and renewed permission

Conversation SHALL persist trusted operation and generated source identities before mutation dispatch, keyed by owner, original source turn and call. It SHALL record the full domain receipt once and keep Gateway evidence as a reference. Approval continuation SHALL retain a renewed pending call and safe actual plan in Workspace, remain waiting without model reissue, and preserve original source identity. Permission rendering SHALL use its own stable signature and SHALL NOT rebuild unrelated transcript or chrome regions.

#### Scenario: Approval finds a changed item revision
- **WHEN** renewed preflight produces a different domain plan
- **THEN** Workspace displays the new pending plan and Conversation waits for its decision

#### Scenario: Domain outcome is unknown
- **WHEN** Broker evidence reports unknown or repair required
- **THEN** canonical history and model projection preserve bounded recovery facts without replay
