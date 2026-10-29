# Spec Delta

## MODIFIED Requirements

### Requirement: Artifact migration SHALL be an explicit Dashboard-local operation

The product SHALL expose a permanent Dashboard Migrations region with a statically registered Literature Artifact library migration entry. Opening, rendering, selecting, deep-linking, and observing the entry SHALL be side-effect free. The startup onboarding coordinator MAY invoke the same local service for a read-only personal-library scan. Decision, apply, stop, and continue SHALL remain Dashboard-local actions; Workflow Host, Host Bridge, MCP, Pi, and CLI surfaces SHALL not register or proxy the migration operation. Dashboard SHALL project the migration ID and exact current definition version from the registered migration definition rather than duplicating those values.

#### Scenario: The migration entry is unavailable or the scan is empty
- **WHEN** the user opens the Migrations region and the migration cannot run or finds no candidates
- **THEN** the Migrations region and its entry SHALL remain visible
- **AND** the entry SHALL show its own availability or empty result without hiding the surface.

#### Scenario: A user only navigates to migration history
- **WHEN** the user opens, selects, or deep-links to the migration entry or an existing run
- **THEN** the UI SHALL perform observation or navigation only
- **AND** it SHALL not scan, write, create a run, or dispatch a worker.

#### Scenario: A non-Dashboard transport requests migration
- **WHEN** Workflow Host, Host Bridge, MCP, Pi, or CLI receives a migration operation request
- **THEN** the request SHALL be unavailable or rejected as an unsupported operation
- **AND** it SHALL not create a scan or apply effect.

#### Scenario: Migration service is unavailable
- **WHEN** Dashboard cannot resolve the registered migration service
- **THEN** the view SHALL remain unavailable and SHALL NOT offer Apply
- **AND** an unknown non-positive placeholder version SHALL NOT be presented as an executable migration definition.

### Requirement: Dashboard candidate selection SHALL be bounded and explicit

The Dashboard SHALL project at most 25 migration candidates per page after filtering the runtime-owned scan plan and persisted candidate receipts. Ready candidates SHALL start included, review-required candidates SHALL become included automatically only after all required decisions are accepted and canonical write eligibility is established, and blocked candidates SHALL remain excluded until every blocking issue has an accepted runtime-owned resolution. The user SHALL review and confirm the final selection before writing. Applying from the Dashboard SHALL consume runtime-owned dispositions and choices and SHALL NOT require the page to hold the complete candidate ID set.

#### Scenario: A scan produces more than one candidate page
- **WHEN** a migration scan produces more than 25 candidates
- **THEN** the Dashboard SHALL render only the current filtered page with forward and backward navigation
- **AND** the candidate list SHALL remain independently scrollable
- **AND** selecting, filtering, opening details, or paging SHALL NOT expose parent refs or raw legacy payloads.

#### Scenario: User reviews candidate classifications
- **WHEN** the candidate page contains ready, review-required, and blocked candidates
- **THEN** ready candidates SHALL be included by default
- **AND** review-required candidates SHALL be included automatically after every required issue decision establishes write eligibility
- **AND** blocked candidates SHALL remain excluded until all blocking issues are resolved or the candidate is explicitly skipped.

### Requirement: Blocking migration issues SHALL require explicit runtime-owned resolutions

Each independently resolvable duplicate, linkage, recovery, conflict, or declared data-loss issue SHALL have its own runtime-issued identity and applicable choices. The runtime SHALL own selected choices, recompute candidate eligibility, re-read current source facts before apply, and reject a changed basis. A candidate SHALL be included only after every blocking issue is resolved and the user can review its automatic inclusion before final confirmation; skipping SHALL leave source data unchanged.

#### Scenario: A blocked candidate has several issues
- **WHEN** the user chooses a resolution for each issue and confirms the final selection
- **THEN** Apply SHALL replay those runtime-owned choices against a matching current basis
- **AND** canonical verification SHALL precede cleanup of consumed legacy target data.

#### Scenario: Source facts change after review
- **WHEN** a reviewed candidate no longer matches the scan basis at apply time
- **THEN** the candidate SHALL produce `changed_since_scan` without writing or cleanup
- **AND** the user SHALL need a fresh scan and review.

## ADDED Requirements

### Requirement: Migration decisions SHALL publish atomically

Individual and batch decisions SHALL compute and validate proposed results before changing any choices, classifications, dispositions or counters. A failed batch SHALL preserve the complete previous state and return bounded candidate and validation-code evidence. Skipping SHALL exclude a candidate without validating an artifact that will not be written.

#### Scenario: A batch fails after some candidates have been evaluated
- **WHEN** a proposed decision cannot be calculated or validated for one candidate
- **THEN** every candidate in that batch SHALL retain its preceding choices and selection
- **AND** retrying SHALL evaluate the same undecided facts rather than skip an incorrectly resolved issue.

#### Scenario: A damaged candidate is skipped
- **WHEN** the user skips a candidate with damaged or oversized artifacts
- **THEN** the candidate SHALL be excluded without artifact validation or a source write.

### Requirement: Migration SHALL guide decisions by problem

The migration UI SHALL lead users through scan overview, present problem groups, final review and outcomes. Each problem SHALL explain affected documents, available decisions and consequences. Batch scope SHALL cover the entire problem group across pages; search SHALL only filter displayed rows. Individual overrides SHALL survive changes to the group policy and SHALL be resettable to that policy.

#### Scenario: A batch policy changes with an individual exception
- **WHEN** the user changes a group decision after making an individual exception
- **THEN** the exception SHALL remain effective and visibly marked
- **AND** unaffected documents SHALL use the new group policy.

#### Scenario: Final selection is reviewed
- **WHEN** all desired decisions have been made
- **THEN** eligible documents SHALL show their original problems, chosen decisions, decision origin and predicted changes
- **AND** the user SHALL be able to exclude documents before explicitly confirming writes.

### Requirement: Migration calculation SHALL cooperate with UI lifecycle

Scanning and bulk decision calculation SHALL yield during large workloads, publish bounded progress, and respond to stopping before claiming more work. Multiple windows SHALL share operation ownership. Stopping a staged batch decision SHALL preserve preceding choices.

#### Scenario: A large calculation is stopped
- **WHEN** stop is requested before the calculation finishes
- **THEN** subsequent work SHALL not be admitted and a staged decision SHALL not publish partial choices.

### Requirement: Migration receipts SHALL retain decision evidence

Terminal set receipts SHALL retain bounded structured decision summaries and selection origin independently of process-local previews. Historical views SHALL expose that evidence without raw payloads or new executable plans.

#### Scenario: A migrated run is opened after restart
- **WHEN** the user opens a terminal run
- **THEN** its set receipts SHALL show which decisions were applied and their origin
- **AND** any further writes SHALL require a fresh scan.
