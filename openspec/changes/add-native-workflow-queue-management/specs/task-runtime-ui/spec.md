## ADDED Requirements

### Requirement: Dashboard queued entries SHALL be backend-tab-only

Host-queued units MUST be visible only in the matching ACP Skills or SkillRunner
backend tab. They MUST NOT appear on Dashboard Home, in Home task counts or
summary cards, in active-task popovers, or in completed/history projections.

#### Scenario: Dashboard Home is rendered with pending units

- **WHEN** one or more Host-queued units exist
- **THEN** Dashboard Home task lists, counts, and summary cards SHALL ignore them
- **AND** Home SHALL continue to reflect only its existing provider-task sources

#### Scenario: Active-task popover is opened

- **WHEN** Host-queued units exist and the user opens the Dashboard active-task popover
- **THEN** the popover SHALL not list or count those units

#### Scenario: Matching backend tab is opened

- **WHEN** the user opens the ACP Skills or SkillRunner backend tab that owns queued units
- **THEN** the tab SHALL display those units alongside its provider-task projection with an explicit queued presentation
- **AND** queued rows SHALL remain distinguishable from backend `queued` or `running` states

### Requirement: Dashboard queued actions SHALL remain Host-local

A Dashboard queued row MUST provide a Material icon-only pending-cancel action
and MUST NOT provide open-details, archive, provider retry, or provider cancel
actions. Successful cancellation MUST remove the row and contribute a skipped
outcome to its originating workflow submission.

#### Scenario: User clicks a queued row body

- **WHEN** the user clicks a Host-queued Dashboard row outside its cancel action
- **THEN** no task details, transcript, or foreground workspace SHALL open

#### Scenario: User cancels a queued row

- **WHEN** the Host confirms that the row is still pending
- **THEN** the unit SHALL be removed from the backend-tab projection
- **AND** no backend API SHALL be called
- **AND** no completed or archived Dashboard row SHALL be created

### Requirement: Dashboard queue refresh SHALL be subscription-driven and scoped

Dashboard backend-tab queue projections MUST refresh from Host queue change
subscriptions. A queue-only event MUST NOT force Dashboard Home or an unrelated
backend tab to rebuild.

#### Scenario: Visible backend queue changes

- **WHEN** a queued unit changes for the currently visible backend tab
- **THEN** that backend's queue projection SHALL refresh without polling

#### Scenario: Hidden backend queue changes

- **WHEN** a queued unit changes for a backend other than the currently visible tab
- **THEN** Dashboard SHALL update the stored backend snapshot or dirty marker
- **AND** it SHALL NOT rebuild the visible unrelated tab

