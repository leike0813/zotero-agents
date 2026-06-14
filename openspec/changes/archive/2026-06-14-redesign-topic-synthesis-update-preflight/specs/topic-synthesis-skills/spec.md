## ADDED Requirements

### Requirement: Update prepare uses preflight audit before resolver proposal

Update topic synthesis prepare SHALL use Stage 00 to validate the target topic through `topics.get_context` digest, read audit context, resolve the current topic resolver, and generate an update audit report before the agent submits an update decision.

#### Scenario: Target topic is missing

- **WHEN** update Stage 00 cannot read a digest for the requested topic
- **THEN** the prepare skill SHALL produce a `topic_synthesis_canceled` business result
- **AND** downstream update stages SHALL NOT be required.

#### Scenario: Target topic exists

- **WHEN** update Stage 00 reads digest and audit context successfully
- **THEN** it SHALL persist topic definition, base hashes, current resolver, saved triage summary, baseline resolve result, and an update audit report.

### Requirement: Update Stage 10 decides cancel or additive resolver

Update Stage 10 SHALL accept either a cancel decision or a continue decision with a resolver proposal. Continue decisions SHALL validate that the proposal preserves the current resolver content and only adds content.

#### Scenario: Additive resolver is submitted

- **WHEN** the proposal contains every primitive, object field, and array element present in the current resolver
- **THEN** the gate SHALL resolve the proposal and persist the updated resolve result.

#### Scenario: Resolver modifies current content

- **WHEN** the proposal deletes or changes current resolver content
- **THEN** the gate SHALL reject the payload.

### Requirement: Update Stage 30 triages only required papers

Update Stage 30 SHALL compute the diff between baseline and updated resolve results. Removed papers SHALL NOT block update, but SHALL be excluded from prepared context. If saved triage exists, only added papers require triage. If no saved triage exists, every paper in the updated resolve result requires triage.

#### Scenario: Saved triage exists

- **WHEN** the updated resolve result adds papers
- **THEN** Stage 30 SHALL require triage for the added papers only
- **AND** SHALL merge saved triage with new triage for context selection.

#### Scenario: Saved triage is missing

- **WHEN** no saved topic triage is available
- **THEN** Stage 30 SHALL require triage for every paper in the updated resolve result.

### Requirement: Topic artifacts persist paper triage

Topic synthesis finalization SHALL persist paper triage under each `source_papers[]` entry so later update preflight can reuse it.

#### Scenario: Create finalizes source papers

- **WHEN** create topic synthesis finalizes
- **THEN** each source paper with submitted triage SHALL include a `triage` object in the topic artifact.
