## ADDED Requirements

### Requirement: Preparation seams SHALL exchange prepared units
The workflow execution preparation seam SHALL accept and return typed v2 candidates, prepared units, and statistics rather than legacy unit-kind or per-parent splitting hints.

#### Scenario: Runtime builds a prepared unit
- **WHEN** `buildPreparedWorkflowUnitExecution` is invoked
- **THEN** it consumes the provided unit directly and does not call selection planning

### Requirement: Scoped context merging SHALL preserve member order
Grouping SHALL merge candidate scoped contexts in member order, deduplicate stable Zotero identities by first occurrence, and expose a shared target parent only when all members resolve to that same parent.

#### Scenario: All grouping combines related attachments
- **WHEN** an all-group contains ordered attachment candidates with overlapping scoped relations
- **THEN** the merged context preserves first occurrence and does not duplicate related objects

### Requirement: Selection validation SHALL be removed from downstream seams
Duplicate, preflight, request-build, and queue seams SHALL NOT infer selection requirements or grouping from a scoped unit context.

#### Scenario: Downstream seam sees one-parent scoped context
- **WHEN** the original confirmed selection required multiple parents but the seam receives a one-parent prepared unit
- **THEN** the seam does not reapply the original selection requirement
