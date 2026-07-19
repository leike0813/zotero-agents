## MODIFIED Requirements

### Requirement: ACP Chat routes runtime changes to bounded regions

ACP Chat SHALL classify runtime UI changes as baseline/status, message-counts, transcript, plan, permission, reply/hint, or context/details. Message-count changes SHALL NOT be treated as metadata/status, and transcript append, streaming, loading, page, or revision changes SHALL request only transcript-region work.

A runtime transition that changes more than one managed-region DTO SHALL classify every affected change kind additively. A queued transcript boundary SHALL NOT suppress a concurrent lifecycle status change. Lifecycle status SHALL route through independently guarded owner-control and composer publications.

Only backend or session scope changes, lifecycle structure, or a user-visible baseline status change SHALL request a baseline publication. ACP Chat SHALL NOT use a generalized reason fallback to build a full panel snapshot.

#### Scenario: Message count changes

- **WHEN** only ACP Chat semantic message counts change
- **THEN** baseline or full snapshot prepare, signature, and post counts SHALL remain zero
- **AND** any visible count update SHALL use its own bounded region publication.

#### Scenario: Transcript advances

- **WHEN** only transcript content streams, appends, loads, changes page, or advances revision
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
