## Purpose

Run workflow-owned Skills through the built-in Pi Agent with durable results, controlled user interaction, bounded recovery and the existing Assistant Workspace.

## ADDED Requirements

### Requirement: Workflow admission creates an immutable durable owner

Only validated `skillrunner.job.v1` Workflow requests SHALL create Pi Skill Runs. Canonical builtin-pi selection SHALL create one request owner before asynchronous setup, retain source Workflow identity, and record pipeline v1 and immutable mode. Missing mode SHALL default to Auto; malformed explicit mode SHALL fail structurally. Setup failures SHALL persist a redacted terminal. Workspace SHALL expose no New action.

#### Scenario: Setup fails after provider selection
- **WHEN** model configuration is unavailable after builtin-pi admission
- **THEN** the same request owner contains a structured failure and no model/tool dispatch

### Requirement: New ACP and Pi runs share frozen preparation and finalization

New ACP and Pi requests SHALL use v1 preparation/finalization, with immutable Prepared Skill provenance, inputs/resources and output schema reused throughout continuation. Existing ACP records without a version SHALL remain legacy for their entire lifetime. External SkillRunner persistence and behavior SHALL remain unchanged. Result finalization SHALL validate owner-bound artifacts and expose sanitized `zotero-agents.skill-run-response.v1` responseJson and the actual Skill output as resultJson.

#### Scenario: Skill configuration changes during a wait
- **WHEN** an admitted v1 run continues after installed Skill content changes
- **THEN** it retains its prepared provenance and schema instead of reselecting the Skill

### Requirement: Explicit result submission seals one provider outcome

Skill success SHALL require exactly one schema-valid `submit_skill_result` call in a batch containing no other tool. Invalid submissions SHALL return safe validation feedback. End-of-text without submission SHALL not imply success. Durable provider outcome SHALL be single-assignment; sealed success SHALL not be overwritten by cancellation. Workflow ApplyReceipt and terminal acknowledgement SHALL remain distinct idempotent durable facts.

#### Scenario: Cancellation races a sealed result
- **WHEN** cancellation arrives after result seal but before Workflow apply
- **THEN** the sealed successful provider outcome remains available for apply and acknowledgement

### Requirement: Interactive questions use one durable revisioned batch

Interactive runs SHALL expose versioned `ask_user` with text, single_select, multi_select, confirm and files questions. Each call SHALL contain one to four questions and each batch at most sixteen. Selects SHALL contain two to eight distinct bounded JSON values; required SHALL default to true. A mixed batch SHALL prevalidate the question subset, settle ordinary tools, then persist the interaction wait. Host-assigned batch/question/option/slot identities SHALL bind answers and original calls. Drafts and submission SHALL use revision CAS, required validation, Review/Submit/Decline and owner-bound opaque file references without paths or bytes. File admission SHALL be all-or-nothing with twenty files per batch, twenty MiB per file and fifty MiB total, within the existing two GiB owner quota. Auto SHALL not expose ask_user.

#### Scenario: Two windows submit different draft revisions
- **WHEN** one window commits a draft and another submits an older revision
- **THEN** stale submission is rejected without dispatch and the current draft remains intact

#### Scenario: A question batch includes a filesystem write
- **WHEN** the model emits ask_user and write tools together
- **THEN** questions are prevalidated, the write settles through policy admission, and only then does the owner publish the durable question wait

### Requirement: Interrupt and cancellation retain request identity

Auto and Interactive runs SHALL support user Interrupt into suspended followed by text-only continuation on the same request. Suspension SHALL preserve prepared facts and whole-run LoopGuard state without settling Workflow ownership. Cancel SHALL settle an unsealed run exactly once. Permission continuation SHALL revalidate original tool identity and current facts through the existing Gateway; unknown effects SHALL not be replayed.

#### Scenario: An interrupted Auto run continues
- **WHEN** the user supplies continuation text to a suspended Auto run
- **THEN** a new turn on the same owner uses the same prepared Skill and cumulative limits

### Requirement: Known-owner recovery reconstructs safe checkpoints without replay

Recovery SHALL reconstruct one explicitly named owner from durable preparation, suspended/user/permission waits, sealed outcome and independent ApplyReceipt/ack checkpoints. Unfinished dispatched model/tool work SHALL require actionable recovery rather than repeated dispatch. Process startup discovery and scheduling SHALL remain outside this capability.

#### Scenario: Restart follows a tool start without a receipt
- **WHEN** recovery reads the known owner with unconfirmed tool effects
- **THEN** it presents recovery_required and dispatches neither tool nor model automatically

### Requirement: Workspace uses bounded shared source controls

Pi Skill Runs SHALL use the existing lane/source shell, canonical actions, Reply region, permission drawer, notifications and bounded transcript pagination. Interactive launch SHALL focus the originating or fallback window once and select the exact owner; Auto and later updates SHALL not steal focus. Attention SHALL include waiting_user, waiting_permission and actionable recovery_required. Only terminal owners SHALL archive, without Restore. Transcript-only updates SHALL preserve every non-transcript managed region DOM identity; owner switches SHALL first publish loading before page reads.

#### Scenario: A model streams while the Reply draft is unchanged
- **WHEN** transcript chunks arrive for the selected owner
- **THEN** Reply and all other unchanged chrome subtrees preserve their DOM identities
