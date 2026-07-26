## MODIFIED Requirements

### Requirement: Prompt interruption and transcript rendering remain region-scoped

Assistant Workspace SHALL project prompt interruption state independently from transcript revisions and SHALL preserve managed region DOM identity when an unrelated region changes.

#### Scenario: Trailing transcript update arrives while cancellation is requested
- **WHEN** an ACP Chat or ACP Skills prompt is in requested interruption state
- **AND** the backend emits a trailing transcript update
- **THEN** only the transcript region MUST render the transcript change
- **AND** toolbar, banner, plan, hint, reply, context drawer, details drawer, and permission drawer DOM MUST retain identity when their own visible state is unchanged.

#### Scenario: Interruption state changes without transcript content
- **WHEN** the interruption state changes from idle to requested
- **AND** transcript content is unchanged
- **THEN** only regions whose visible interruption controls or status changed MAY rebuild
- **AND** transcript and unrelated managed regions MUST retain DOM identity.

#### Scenario: Requested interruption disables repeated input
- **WHEN** interruption state is `requested`
- **THEN** the reply input and submit action MUST be disabled
- **AND** model and reasoning controls MUST remain disabled
- **AND** the connected mode control MUST remain enabled
- **AND** a repeated cancel action MUST NOT be emitted.

### Requirement: ACP Chat routes runtime changes to bounded regions

ACP Chat SHALL classify runtime UI changes as baseline/status, message-counts, transcript, plan, permission, reply/hint, or context/details. Message-count changes SHALL NOT be treated as metadata/status, and transcript append, streaming, loading, page, or revision changes SHALL request only transcript-region work.

A runtime transition that changes more than one managed-region DTO SHALL classify every affected change kind additively. A queued transcript boundary SHALL NOT suppress a concurrent lifecycle status change. Lifecycle status SHALL route through independently guarded owner-control and composer publications.

Only backend or session scope changes, lifecycle structure, or a user-visible baseline status change SHALL request a baseline publication. ACP Chat SHALL NOT use a generalized reason fallback to build a full panel snapshot.

#### Scenario: Message count changes

- **WHEN** only ACP Chat semantic message counts change
- **THEN** baseline or full snapshot prepare, signature, and post counts SHALL remain zero
- **AND** any visible count update SHALL use its own bounded region publication.

#### Scenario: Transcript advances

- **WHEN** transcript content streams, appends, loads, changes page, or advances revision
- **THEN** ACP Chat SHALL publish only the selected owner's transcript region
- **AND** unrelated managed regions SHALL retain DOM identity.

#### Scenario: Structural status changes

- **WHEN** backend/session scope, lifecycle structure, or user-visible baseline status changes
- **THEN** ACP Chat MAY publish only the affected baseline or status region.

#### Scenario: Continuation resumes prompting after cancellation

- **GIVEN** an ACP Chat turn has confirmed cancellation and the composer accepts a continuation
- **WHEN** the new user transcript boundary and `prompting` lifecycle state occur in the same critical transition
- **THEN** ACP Chat SHALL publish transcript, owner-control, and composer work for that owner
- **AND** the composer SHALL show its busy interruption state without an owner or tab switch
- **AND** managed regions whose DTOs are unchanged SHALL retain DOM identity.

#### Scenario: Concurrent live state cannot suppress a terminal boundary

- **GIVEN** a non-transcript live region change is pending for an ACP Chat owner
- **WHEN** the same flush completes a streaming transcript item
- **THEN** the publication SHALL retain the pending region kind and add transcript-boundary and status kinds
- **AND** the hard-boundary completion patch SHALL be delivered in that mutation.

#### Scenario: Permission policy change updates its owning regions

- **WHEN** the active conversation's permission auto-approval policy changes
- **THEN** ACP Chat SHALL publish both permission and owner-control regions
- **AND** unrelated transcript, composer, toolbar, plan, and drawer regions SHALL retain identity when their DTOs are unchanged.
