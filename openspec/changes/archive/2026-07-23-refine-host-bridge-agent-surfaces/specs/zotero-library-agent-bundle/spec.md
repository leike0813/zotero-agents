## ADDED Requirements

### Requirement: Generic task references SHALL use progressive disclosure
The coordinator and each bounded task Skill SHALL contain a complete executable primary contract in `SKILL.md`. Direct references SHALL expand named complex scenarios and SHALL NOT be a mandatory first workflow step.

#### Scenario: Task has no complex branch
- **WHEN** a request can be completed by the task Skill's primary workflow
- **THEN** the agent completes it without loading the task playbook

#### Scenario: Complex branch is encountered
- **WHEN** the request requires a detailed object model, decision matrix, worked path, or recovery analysis
- **THEN** `SKILL.md` identifies the directly linked comprehensive reference and the applicable section

### Requirement: Generic coordinator SHALL expose official built-in workflows
The coordinator SHALL own one generated catalog of the official non-debug built-in workflows and one separate cross-task research model. The catalog SHALL own inventory and declared invocation inputs; the research model SHALL own cross-task execution, authority, evidence, and recovery policy.

#### Scenario: Catalog and policy remain non-duplicative
- **WHEN** a workflow entry is rendered
- **THEN** its manifest facts appear in the catalog
- **AND** cross-task execution policy remains in the coordinator contract and research model
