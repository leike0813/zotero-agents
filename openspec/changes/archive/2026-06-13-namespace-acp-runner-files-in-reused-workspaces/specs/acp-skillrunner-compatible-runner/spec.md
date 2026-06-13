## ADDED Requirements

### Requirement: ACP runner-owned files are namespaced per skill run

ACP SkillRunner-compatible runs SHALL allocate provider-internal runner-owned
file namespaces inside the run workspace.

#### Scenario: First skill run in a workspace

- **WHEN** an ACP skill run is prepared for skill `prepare-skill`
- **THEN** the runner result path SHALL end with
  `result/prepare-skill.1/result.json`
- **AND** the input manifest path SHALL end with
  `.audit/prepare-skill.1/input_manifest.json`.

#### Scenario: Reused workflow workspace isolates runner files

- **GIVEN** a workflow sequence reuses one ACP workspace
- **WHEN** downstream steps are prepared in that workspace
- **THEN** each step SHALL receive its own `resultJsonPath` and
  `inputManifestPath`
- **AND** the namespace allocation SHALL NOT require additional host/workflow
  request fields.

#### Scenario: Repeated skill id increments namespace index

- **GIVEN** one workspace has already allocated `core-skill.1`
- **WHEN** another run for `core-skill` is prepared in the same workspace
- **THEN** the second run SHALL allocate `core-skill.2`.
