## MODIFIED Requirements

### Requirement: Core synthesis instructions

The split topic synthesis core enrichment skill SHALL instruct the agent to preserve the user topic semantic boundary when the library workset is biased toward a subdomain.

#### Scenario: Workset does not redefine topic scope

- **GIVEN** the current topic definition describes a broad topic
- **AND** the resolved workset mostly covers a narrower subdomain
- **WHEN** the agent writes Stage 40 core synthesis
- **THEN** the skill instructions require the agent to treat the workset as evidence coverage
- **AND** the skill instructions require the agent to preserve the topic definition and scope boundary as the topic identity

#### Scenario: Relation proposals use semantic topic scope

- **GIVEN** the current topic has a broader semantic scope than the resolved papers suggest
- **WHEN** the agent writes Stage 50 relation proposals
- **THEN** the skill instructions require relation direction to be judged from the current topic semantic scope
- **AND** the skill instructions do not let the dense library subdomain redefine the current topic

#### Scenario: Coverage captures sample bias

- **GIVEN** the workset under-covers important parts of the topic scope
- **WHEN** the agent writes Stage 60 coverage and collection suggestions
- **THEN** the skill instructions require that gap to be described as library coverage bias
- **AND** collection suggestions identify missing topic directions
