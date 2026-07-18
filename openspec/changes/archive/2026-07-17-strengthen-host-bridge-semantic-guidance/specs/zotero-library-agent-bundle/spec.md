## ADDED Requirements

### Requirement: Library Agent guidance SHALL be composed from facts and bounded task semantics

The Zotero Library Agent bundle SHALL generate domain-oriented intent-to-command-to-evidence guidance by composing Agent Surface facts, shared family defaults, and Library-Agent-owned semantic supplements.

#### Scenario: Agent routes a bounded task
- **WHEN** an agent needs connectivity or context, library data, workflow/run control, mutation/file/Product operations, Synthesis data, or diagnostics
- **THEN** the bundle SHALL route the intent to canonical commands and the evidence needed to finish that bounded task
- **AND** it SHALL load detailed command and error contracts only when relevant.

#### Scenario: Agent avoids a misleading command
- **WHEN** two commands have related names but different ownership, freshness, approval, handle, or state-change behavior
- **THEN** the guidance SHALL provide a current-state `avoidWhen` or equivalent negative selection rule.

#### Scenario: Bundle is rendered
- **WHEN** semantic source or command facts change
- **THEN** the generated bundle SHALL be rebuilt through the canonical renderer
- **AND** no generated command table SHALL require independent manual maintenance.

### Requirement: Library Agent SHALL preserve evidence across control boundaries

Task recipes SHALL distinguish current Host facts, local files, returned typed handles, approval state, and apply-back receipts.

#### Scenario: Task crosses a workflow or mutation boundary
- **WHEN** an agent submits, monitors, interacts with, applies, or mutates Host state
- **THEN** the recipe SHALL identify the required handle, review or approval boundary, observable completion evidence, and safe recovery command.

### Requirement: Library Agent repository README SHALL select the bounded surface

The Library Agent release repository README SHALL explain when to choose the bounded on-demand surface, how to verify the bundled CLI identity, where to enter common task journeys, and when resident Librarian behavior is the appropriate alternative.

#### Scenario: User or agent opens the bundle repository
- **WHEN** the repository README is the first document read
- **THEN** it SHALL identify the bundle as the bounded task surface
- **AND** SHALL route connection details to the CLI wrapper and resident indexing, scheduling, and maintenance to the Librarian Profile.

### Requirement: Library Agent references SHALL provide executable bounded journeys

The bundle SHALL provide detailed input-to-command-to-evidence-to-recovery playbooks for current context, library and note reads, readiness, synthesis research context, Host-owned workflows, agent-owned handoff and apply-back, concrete writeback, and Product/file delivery.

#### Scenario: Agent executes a bounded journey
- **WHEN** the agent receives only the materialized Library Agent bundle
- **THEN** it SHALL be able to choose the correct command plane, construct inputs, preserve typed handles, identify approval boundaries, and prove completion without repository source access.
