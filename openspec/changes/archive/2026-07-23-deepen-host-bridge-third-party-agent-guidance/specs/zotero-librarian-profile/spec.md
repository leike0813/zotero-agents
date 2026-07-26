## ADDED Requirements

### Requirement: Librarian guidance SHALL translate resident user intent
The Librarian Skill SHALL independently route natural-language library questions, one-pass supervision, run monitoring, maintenance proposals, and workflow planning while clarifying scope, schedule assumptions, reporting thresholds, interaction, and mutation authority.

#### Scenario: User requests recurring monitoring
- **WHEN** the user asks the resident agent to monitor on a cadence
- **THEN** the Skill distinguishes a current one-pass operation from an existing external schedule and never claims to create or modify cron

### Requirement: Workflow plans SHALL have immutable durable identity
The resident service SHALL persist a canonical plan digest, live workflow-contract digest, path identity, aggregate plan state, and per-entry state before allowing submission.

#### Scenario: Plan file or workflow contract changes
- **WHEN** a plan file, registered path, stored digest, selection, or live workflow contract differs from the prepared identity
- **THEN** submission fails before any remote workflow request

### Requirement: Workflow entries SHALL submit without unsafe replay
The resident service SHALL reserve and persist each plan entry independently, link successful launches to watched runs, and mark uncertain remote effects for attention without automatic replay.

#### Scenario: Remote submission has an uncertain result
- **WHEN** transport fails after an entry is reserved or no valid workflow run identity is returned
- **THEN** that entry becomes unknown, the plan requires attention, later entries are not submitted, and another invocation does not replay the unknown entry

#### Scenario: Prepared plan is submitted more than once
- **WHEN** a later authorized invocation submits the same plan
- **THEN** only pending entries are eligible and launched or unknown entries are never resubmitted

### Requirement: Workflow validation SHALL use the live selection contract
The resident service SHALL describe the workflow, preserve or normalize selected Zotero objects according to its declared input unit, and validate every actual entry before preparing or submitting a plan.

#### Scenario: Workflow requires attachments
- **WHEN** the workflow selection contract declares attachment input
- **THEN** the service preserves attachment identities and validates those identities instead of unconditionally converting them to parent items
