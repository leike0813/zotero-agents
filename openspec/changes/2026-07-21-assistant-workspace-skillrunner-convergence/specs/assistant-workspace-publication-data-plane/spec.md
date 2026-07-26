## MODIFIED Requirements

### Requirement: Workspace publication uses one strict v1 registry

ACP Chat, ACP Skills, and SkillRunner SHALL use the v1 region and
presentation registries as the sole source of publication kind, payload,
semantic presentation fields, browser key, managed region, and source
support. Non-v1 publications, generic banner arrays, producer labels,
presentation tasks, aliases, and dual writes SHALL be rejected.

#### Scenario: A non-v1 presentation reaches the child

- **WHEN** a publication uses a non-v1 schema or a removed presentation field
- **THEN** the receiver rejects it as invalid
- **AND** canonical state and DOM remain unchanged.

## REMOVED Requirements

### Requirement: Domain mappings are exhaustive for both surfaces

Reason: superseded by "Domain mappings are exhaustive for every registered
source" now that the registry admits a third source.

## ADDED Requirements

### Requirement: Domain mappings are exhaustive for every registered source

Every publication kind SHALL have a compile-time mapping or an explicit
`not-applicable` declaration for each registered source (ACP Chat, ACP
Skills, SkillRunner). Unknown runtime changes SHALL NOT fall back to a
baseline or a full snapshot.

#### Scenario: A new domain kind is introduced

- **WHEN** one surface mapping is missing
- **THEN** type checking or conformance validation fails before publication.

### Requirement: SkillRunner owner identity is request scoped

The SkillRunner workspace owner SHALL carry `source: "skillrunner"`, an
`ownerKey`, the `requestId`, and the `runKey`. The `ownerKey` SHALL be the
request id when one is assigned and SHALL fall back to the run key for
unassigned local runs. A late request-id assignment SHALL surface as an
owner switch and SHALL follow the owner-first loading sequence.

#### Scenario: A local run receives its request id

- **GIVEN** a SkillRunner run was selected before its request id was assigned
- **WHEN** the backend assigns the request id
- **THEN** the owner key changes to the request id
- **AND** the workspace republishes the new owner with a loading-first transcript snapshot.

### Requirement: SkillRunner transcript publishes as snapshots

The SkillRunner surface SHALL publish transcript updates only as
transcript snapshots, never as incremental mutations, because the
SkillRunner channel has no incremental event stream at this boundary.
Transcript revisions SHALL come from the producer-side boundary signature,
unchanged region payloads SHALL be absorbed by coordinator signature
dedup, and conversation entries SHALL be projected to canonical transcript
items producer-side.

#### Scenario: A streaming SkillRunner run appends chat entries

- **WHEN** new SkillRunner chat entries cross a producer boundary signature
- **THEN** a transcript snapshot with an incremented revision is published
- **AND** non-transcript regions with unchanged payloads are not republished.
