## MODIFIED Requirements

### Requirement: Run workspace task navigation SHALL use sidebar-oriented task surfaces grouped by backend profile
SkillRunner tasks and Host-queued SkillRunner execution units SHALL be exposed
through sidebar-oriented navigation surfaces that fit a narrow right shell
while preserving backend grouping. Host-queued units are non-owner rows and
MUST NOT be inserted into the selectable SkillRunner run-session collection.

#### Scenario: running queued and completed task drawer sections
- **WHEN** the sidebar task drawer renders entries for a backend profile
- **THEN** running tasks SHALL appear in a `Running` section grouped by backend profile
- **AND** Host-queued units SHALL appear in a `Queued` section between `Running` and `Completed`, grouped by backend profile
- **AND** succeeded tasks SHALL appear in a `Completed` section grouped by backend profile
- **AND** all three sections SHALL be independently collapsible
- **AND** `Running` SHALL be expanded by default while `Queued` and `Completed` SHALL be collapsed by default
- **AND** the `Queued` section SHALL be hidden when empty
- **AND** section titles, queued state, and queue cancellation SHALL use the shared localized Assistant labels
- **AND** Running, Queued, and Completed SHALL use subtle theme-aware blue, amber, and neutral treatments respectively
- **AND** failed, canceled, disabled, or requestId-less provider placeholder tasks SHALL NOT appear in the sidebar task drawer

#### Scenario: queued backend groups collapse independently
- **WHEN** queued SkillRunner units exist for multiple backend profiles
- **THEN** the queued section SHALL expose one independently collapsible group per backend profile
- **AND** collapsing one group SHALL NOT change another group's state

#### Scenario: queued row is non-selectable
- **WHEN** the user clicks a queued SkillRunner row
- **THEN** the selected run session and foreground transcript owner SHALL remain unchanged
- **AND** the system SHALL NOT fabricate a requestId or disabled run placeholder

#### Scenario: queued row cancellation
- **WHEN** the user activates the queued row's Material icon-only cancel action while it remains pending
- **THEN** the Host SHALL remove the unit from the queue
- **AND** no SkillRunner cancellation request or archived run row SHALL be created

#### Scenario: current parent item shortcut strip
- **WHEN** the current library or reader context resolves a primary parent item
- **THEN** the workspace SHALL expose a top shortcut strip for running tasks related to that parent item
- **AND** each shortcut SHALL display only the workflow title
- **AND** Host-queued units SHALL NOT appear in the shortcut strip
- **AND** selecting a shortcut SHALL switch the global workspace to that task session

#### Scenario: task title fallback in sidebar navigation
- **WHEN** a sidebar task label is resolved
- **THEN** running and completed tasks SHALL use `taskName`, fallback to `workflowLabel`, then `requestId`
- **AND** Host-queued rows SHALL use their queue display `taskName` with the workflow label as fallback
- **AND** only provider tasks with requestId SHALL be selectable in sidebar navigation

Invariant anchors:

- `INV-WS-HOST-QUEUED-SOURCE-ROWS`
