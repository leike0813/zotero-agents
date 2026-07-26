## ADDED Requirements

### Requirement: Assistant Workspace publishes owner-scoped managed regions

Assistant Workspace SHALL represent runtime UI work as typed, owner-scoped region publications. A publication SHALL carry only the DTO required by its managed region, and the host SHALL apply source and owner guards before reading transcript pages, building DTOs, or serializing payloads.

Chat owners SHALL be identified by backend plus conversation and Skills owners SHALL be identified by request. A Chat change SHALL NOT publish the active Skills panel, and a Skills change SHALL NOT publish the active Chat panel.

#### Scenario: Inactive source changes

- **GIVEN** Assistant Workspace is closed or a source is not the active target
- **WHEN** that source emits a runtime change
- **THEN** the host SHALL drop the publication request before DTO construction
- **AND** it SHALL NOT build either the matching or opposite tab publication.

#### Scenario: Owner does not match selection

- **WHEN** a runtime change belongs to a conversation or request other than the selected owner
- **THEN** the host SHALL reject it before transcript page read, DTO construction, or serialization.

### Requirement: Managed regions use independent stable signatures

Toolbar, banner, plan, hint, reply, context drawer, details drawer, permission drawer, transcript, and other managed regions SHALL each use a signature containing only that region's user-visible content and open or collapsed state. Equal owner, kind, and signature SHALL be skipped before post unless the publication is an explicit initialization or activation.

Baseline or chrome DTOs SHALL NOT contain selected transcript pages, transcript revisions, streaming or event counts, message-count revisions, or transcript loading state.

#### Scenario: Transcript-only publication preserves chrome identity

- **WHEN** a selected owner receives a transcript-only or message-count-only change
- **THEN** toolbar, banner, plan, hint, reply, context drawer, details drawer, permission drawer, and Runner pane DOM identity SHALL remain unchanged.

#### Scenario: Repeated region DTO is skipped

- **GIVEN** a region DTO has already been posted for an owner
- **WHEN** the host requests an equal owner, kind, and DTO again
- **THEN** the host SHALL skip the publication before post.

### Requirement: Region publications are acknowledged and stale-safe

The shell SHALL forward typed region publications without combining transcript and chrome state. The child SHALL reject publications for an old owner or a stale same-owner revision, apply only the addressed region, and acknowledge shell receipt, child apply, and render completion with owner, kind, revision, and signature identity.

#### Scenario: Old owner publication arrives after selection

- **GIVEN** the child has switched from owner A to owner B
- **WHEN** a delayed publication for owner A arrives
- **THEN** the publication SHALL NOT modify visible DOM
- **AND** its acknowledgement SHALL identify the rejection rather than successful render completion.

#### Scenario: Successful publication completes acknowledgement chain

- **WHEN** a current-owner publication is posted and applied
- **THEN** shell receive, child apply, and render completion SHALL be attributable to the same publication identity.

#### Scenario: Multiple full snapshots arrive before one render frame

- **WHEN** multiple identified Chat or Skills snapshots reach a child before its scheduled render frame
- **THEN** the child SHALL apply and acknowledge them in delivery order
- **AND** it SHALL NOT silently replace an earlier posted snapshot without a lifecycle terminal state.

#### Scenario: A newer shell cache generation replaces an identified snapshot

- **WHEN** a newer identified snapshot replaces an init or snapshot cache generation before the older publication completes in the child
- **THEN** the shell SHALL acknowledge the older identity as superseded
- **AND** the host lifecycle ledger SHALL no longer leave that publication pending.

### Requirement: Region publication preserves transcript loading invariants

Owner switching SHALL remain owner-first, loading-first, and page-first. Indexed page read and full mirror hydrate SHALL NOT block first paint; live or prompting mirrors SHALL remain pinned, and owner-scoped cold full mirror caches SHALL remain optional performance caches rather than visibility requirements.

#### Scenario: Cold owner is selected

- **WHEN** the selected Chat conversation or Skills request changes to a cold owner
- **THEN** the child SHALL first receive that owner's loading or empty transcript publication
- **AND** indexed page content MAY render before full mirror hydrate completes.
