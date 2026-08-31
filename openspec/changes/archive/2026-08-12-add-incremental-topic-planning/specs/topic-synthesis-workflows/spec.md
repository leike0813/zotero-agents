## ADDED Requirements

### Requirement: Create supports planned and ad-hoc entry modes
Create Topic Synthesis SHALL require exactly one source: an active Planned Topic identifier when `usePlannedTopic` is true, or an ad-hoc `topicSeed` when it is false.

#### Scenario: Planned Topic entry
- **WHEN** the user enables planned-topic mode
- **THEN** the settings surface requires an active Planned Topic and hides the ad-hoc seed

#### Scenario: Ad-hoc entry
- **WHEN** the user disables planned-topic mode
- **THEN** the settings surface requires the topic seed and hides the Planned Topic selector

### Requirement: Ad-hoc seeds prefer an existing Planned Topic identity
Create Topic Synthesis SHALL resolve an ad-hoc seed against the complete visible topic inventory before creating a new topic. An active Planned Topic SHALL be reused only when its definition and scope represent the same topic identity without broadening, narrowing, or otherwise rewriting the seed intent.

#### Scenario: Seed matches an active Planned Topic
- **WHEN** an ad-hoc seed has an active Planned Topic with the same topic identity
- **THEN** Create automatically materializes the Planned Topic with its existing identifier, definition, and resolver

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
- **WHEN** the selected Planned Topic is no longer active or complete when runtime re-reads it
- **THEN** Create cancels with a retryable state-change diagnosis and does not fall back to ad-hoc creation

### Requirement: Planned Topic materialization re-resolves papers
Create Topic Synthesis SHALL use the stored Planned Topic definition and SHALL execute its stored resolver against the current library rather than consuming a persisted provisional membership list.

#### Scenario: Library changed after planning
- **WHEN** papers were added or edited after the Planned Topic was created
- **THEN** synthesis resolves the current matching paper set before generating content

### Requirement: Relation discovery remains available during synthesis
Create Topic Synthesis SHALL continue to propose relations found from substantive topic content, and those proposals SHALL reconcile with planner proposals by canonical tuple and producer provenance.

#### Scenario: Parallel ad-hoc creates omit their mutual relation
- **WHEN** two ad-hoc create runs execute concurrently before either node is visible to the other
- **THEN** both topics can materialize and a later planner run can propose the missing relation

### Requirement: Update responds to all stable staleness signals
Update Topic Synthesis SHALL be eligible when stable artifact, score, resolver dependency, or paper-set evidence has changed; it SHALL NOT require newly added papers as the sole update signal.

#### Scenario: Score changes without added papers
- **WHEN** a topic score or stable dependency changes while its paper set is unchanged
- **THEN** the update workflow may regenerate the affected synthesis stages
