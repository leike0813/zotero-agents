## ADDED Requirements

### Requirement: Target-active drain is bounded by an exact delivery barrier

An ACP target force operation SHALL return a barrier containing source, tab, publication identity, and delivery sequence. Replay SHALL wait for every same-source, same-tab publication with delivery sequence at or below the barrier to reach terminal acknowledgement, and SHALL exclude later or unrelated publication work.

#### Scenario: Preparation and forced publications overlap

- **WHEN** target preparation publications are still in flight when the forced target publication is issued
- **THEN** drain waits for all matching publications through the returned delivery sequence
- **AND** it does not return merely because the forced identity finishes first.

### Requirement: Replay readiness requires visible target transcript

For ACP Chat and ACP Skills target-active runs, readiness and final drain SHALL require successful render acknowledgement for the selected owner and a ready transcript region in the current child generation. SkillRunner SHALL use its own readiness result and SHALL NOT require an ACP publication identity.

#### Scenario: Child accepts model but rendering fails

- **WHEN** target transcript model apply succeeds but the DOM render fails
- **THEN** target-active measurement is incomplete with a structured render failure
- **AND** replay does not report successful publication completion.

### Requirement: Replay provenance stem and phase are one value

Replay SHALL derive the internal normalized stage and result filename stage slug from the same frozen replay configuration. Persistence and comparison SHALL reject an artifact whose internal stage does not match the generated artifact stem metadata.

#### Scenario: Persisted phase and artifact stem diverge

- **WHEN** a replay result is about to be accepted with inconsistent phase provenance
- **THEN** the result is rejected as provenance-incomplete
- **AND** it is not eligible for governance comparison.
