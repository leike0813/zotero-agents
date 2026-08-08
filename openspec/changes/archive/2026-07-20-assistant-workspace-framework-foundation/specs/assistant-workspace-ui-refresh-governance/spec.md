## MODIFIED Requirements

### Requirement: Transcript-only refreshes SHALL preserve non-transcript DOM

Assistant Workspace child panels SHALL treat transcript rendering as isolated from managed panel chrome. A snapshot whose only visible change is transcript content, transcript pagination, transcript revision, streaming text or thought chunks, or transcript loading state SHALL NOT rebuild toolbar, banner, plan, hint, reply, context drawer, details drawer, or permission drawer DOM.

Panel chrome equivalence inputs SHALL exclude transcript revision, transcript page signatures, streaming chunk contents, transcript item counts, and transcript event counts. Details drawer equivalence inputs SHALL be derived from details drawer content, drawer actions, and drawer open or collapse state, not from transcript activity.

Every managed non-transcript Assistant Workspace region SHALL have an explicit region-level equivalence boundary containing only that region's user-visible content and open or collapsed state; on the ACP child this boundary is implemented as component props memoization. Toolbar, banner, plan, hint, reply, context drawer, details drawer, and permission drawer regions SHALL NOT be cleared, rebuilt, or otherwise mutated in the DOM when their own equivalence input is unchanged.

Transcript loading indicators SHALL be scoped by the selected transcript owner, such as backend/conversation, request id, or task key. Repeated snapshots for the same owner and same loading semantic state SHALL preserve the loading indicator DOM node identity.

#### Scenario: ACP Skills transcript update preserves details drawer DOM

- **GIVEN** the ACP Skills child panel has rendered a selected run and its details drawer
- **WHEN** the selected run receives a transcript-only snapshot during prompting
- **THEN** the transcript region MAY update
- **AND** the details drawer DOM nodes SHALL keep their identity
- **AND** the Runner details section SHALL NOT be cleared or recreated.

#### Scenario: Transcript pagination does not rebuild panel chrome

- **GIVEN** an Assistant Workspace child panel has rendered managed toolbar, banner, drawer, details, hint, reply, and permission regions
- **WHEN** a later snapshot changes only transcript page cursor, transcript revision, transcript item contents, or transcript loading state
- **THEN** only the transcript region SHALL be eligible for repaint
- **AND** all non-transcript managed regions SHALL preserve their DOM node identity.

#### Scenario: Details content changes still refresh details drawer

- **GIVEN** the details drawer has rendered with details equivalence input `A`
- **WHEN** a later snapshot changes details sections, details actions, or drawer open/collapse state and produces details equivalence input `B`
- **THEN** the details drawer MAY rebuild to reflect the new details content.

#### Scenario: Repeated loading snapshots preserve transcript spinner DOM

- **GIVEN** an Assistant Workspace child panel is showing a transcript loading indicator for selected owner `A`
- **WHEN** repeated snapshots report the same selected owner and the same loading state
- **THEN** the transcript loading indicator DOM node SHALL keep its identity
- **AND** the transcript window SHALL NOT be cleared and rebuilt.

#### Scenario: Cross-owner loading still clears stale transcript content

- **GIVEN** an Assistant Workspace child panel has rendered transcript content for owner `A`
- **WHEN** the selected owner changes to owner `B` and owner `B` is loading
- **THEN** the transcript region SHALL clear owner `A` content
- **AND** render owner `B` loading state.

#### Scenario: Non-selected prompting summaries do not repost selected loading snapshots

- **GIVEN** ACP Skills selected run `A` is hydrating and its selected transcript is loading
- **AND** another run `B` is actively prompting
- **WHEN** only run `B` transcript revision, event sequence, item count, or preview changes
- **THEN** the Assistant Workspace host snapshot signature SHALL remain unchanged for the selected loading snapshot
- **AND** the child panel SHALL NOT receive a repost that can rebuild owner `A` loading DOM.

### Requirement: Managed regions render by their own equivalence boundaries

The child SHALL apply toolbar, banner, plan, hint, reply, context, details,
and permission region updates only after successful rendering. A failed
region render SHALL leave the previously committed DOM and equivalence
state untouched. Transcript, loading, streaming, and count-only changes
SHALL NOT rebuild unrelated regions.

#### Scenario: A region renderer fails

- **WHEN** a render throws before commit
- **THEN** the previous region DOM and equivalence state remain committed
- **AND** the same publication content can be retried.

### Requirement: Every shared ACP managed region has an independent equivalence boundary

The Assistant Workspace SHALL reconcile toolbar, banner, message counts,
transcript, plan, hint, composer, context drawer, details drawer, and
permission drawer from an independent region equivalence boundary —
component props on the ACP child — containing only that region's visible
content and local open or
collapsed state. Transcript revision, page signature, streaming chunks, item
counts, prompting tail, and log tail SHALL NOT enter non-transcript region
props.

#### Scenario: A transcript-only publication is accepted

- **WHEN** a transcript delta, loading state, or streaming chunk changes for the selected owner
- **THEN** only the transcript region is rendered
- **AND** toolbar, banner, plan, hint, composer, context, details, permission, and Runner pane nodes retain identity.
