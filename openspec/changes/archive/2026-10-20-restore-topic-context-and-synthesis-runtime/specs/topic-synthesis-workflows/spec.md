## MODIFIED Requirements

### Requirement: Create supports planned and ad-hoc entry modes
Create Topic Synthesis SHALL require exactly one source: a complete Planned Topic snapshot when `usePlannedTopic` is true, or an ad-hoc `topicSeed` when it is false. The request SHALL omit inactive entry parameters and name the active target.

#### Scenario: Planned Topic entry
- **WHEN** the user enables planned-topic mode
- **THEN** the settings surface requires an active Planned Topic and hides the ad-hoc seed
- **AND** request construction after submission queue admission reads the current complete plan into prepare input
- **AND** the outgoing request omits `topicSeed`

#### Scenario: Ad-hoc entry
- **WHEN** the user disables planned-topic mode
- **THEN** the settings surface requires the topic seed and hides the Planned Topic selector
- **AND** the outgoing request omits `plannedTopicId`

#### Scenario: Plan changes after request construction
- **WHEN** the selected plan changes or disappears after the request has been constructed
- **THEN** execution and recovery use the captured snapshot without revalidating its planning lifecycle
- **AND** final apply retains collision and no-overwrite protection

#### Scenario: Plan unavailable at request construction
- **WHEN** the selected plan is unavailable or incomplete after queue admission
- **THEN** request construction fails with a concrete input error before the agent starts

### Requirement: Ad-hoc seeds prefer an existing Planned Topic identity
Create Topic Synthesis SHALL resolve an ad-hoc seed against the complete visible topic inventory before creating a new topic. An active Planned Topic SHALL be reused only when its definition and scope represent the same topic identity without broadening, narrowing, or otherwise rewriting the seed intent.

#### Scenario: Seed matches an active Planned Topic
- **WHEN** an ad-hoc seed has an active Planned Topic with the same topic identity
- **THEN** Create automatically materializes a snapshot of the Planned Topic with its existing identifier, definition, and resolver

#### Scenario: Several Planned Topics match
- **WHEN** several active Planned Topics satisfy the same-identity test
- **THEN** the agent selects the best definition-and-scope match, using aliases and title as secondary evidence

#### Scenario: Only related topics exist
- **WHEN** visible topics are related, broader, or narrower but none represent the same identity
- **THEN** Create proceeds with a new topic identity

#### Scenario: A materialized duplicate exists
- **WHEN** an existing materialized topic represents the same identity as the seed
- **THEN** Create cancels instead of selecting a Planned Topic or creating another topic

#### Scenario: Selected Planned Topic changes before use
- **WHEN** the selected Planned Topic is no longer active or complete when its snapshot is captured
- **THEN** Create cancels with a retryable state-change diagnosis and does not fall back to ad-hoc creation
