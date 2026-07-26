# workflow-execution-seams Specification

## Purpose
Define the stable workflow execution boundaries, package workflow loading contract, and workflow-host integration contract used by the plugin core and builtin workflows.

## Requirements

### Requirement: Workflow execution orchestration SHALL expose explicit seam boundaries
The execution pipeline SHALL be organized into explicit seams for preparation, run coordination, result application, and feedback reporting.

#### Scenario: Preparation seam is independently invocable
- **WHEN** workflow execution starts
- **THEN** selection validation and request preparation are executed through a dedicated preparation seam contract

#### Scenario: Apply seam is isolated from queue orchestration
- **WHEN** provider run results are available
- **THEN** result application is executed through a dedicated apply seam contract rather than inline queue logic

### Requirement: Sequence step apply SHALL remain an explicit execution seam

The run seam SHALL provide the sequence runtime with an explicit callback for
applying opt-in sequence step results.

#### Scenario: Run seam resolves step apply workflow

- **GIVEN** a sequence step declares `apply_result.workflow_id`
- **WHEN** that step succeeds
- **THEN** the run seam SHALL resolve the target workflow by id
- **AND** invoke its `applyResult` hook with step-scoped result context.

#### Scenario: Final apply seam skips step-owned final result

- **GIVEN** a completed sequence job whose final step declares `apply_result`
- **WHEN** the final apply seam processes the job
- **THEN** it SHALL record a skipped final apply outcome
- **AND** it SHALL NOT duplicate the final step's workflow apply.

### Requirement: Seam refactor SHALL preserve observable behavior
Refactoring into seams SHALL preserve current observable behavior of execution outcomes and user-facing summaries.

#### Scenario: No-valid-input behavior parity
- **WHEN** filtered inputs produce zero executable units
- **THEN** skipped semantics and finish messaging remain equivalent to current behavior

#### Scenario: Mixed job outcomes behavior parity
- **WHEN** a trigger includes succeeded and failed jobs
- **THEN** succeeded/failed/skipped counts and failure reason aggregation remain equivalent to current behavior

### Requirement: Seam handoff SHALL use explicit contracts
Data transfer between seams SHALL use explicit typed handoff contracts, not hidden mutation across mixed stages.

#### Scenario: Run seam consumes preparation output
- **WHEN** queue execution begins
- **THEN** run seam receives explicit handoff data (requests, stats, execution context) from preparation seam

#### Scenario: Feedback seam consumes per-job outcomes
- **WHEN** execution completes
- **THEN** feedback seam receives explicit outcome summaries to render final reporting

### Requirement: Backend-backed workflow batches SHALL dispatch fully in parallel
The execution seam SHALL use full-parallel dispatch for backend-backed providers
unless a supported ACP Skills or SkillRunner submission has captured a positive
Host maximum-concurrency value. Host admission SHALL limit top-level execution
units, while provider-owned concurrency inside an admitted unit remains
authoritative.

#### Scenario: SkillRunner batch uses full-parallel dispatch by default
- **WHEN** the execution seam runs a SkillRunner batch with blank or zero Host maximum concurrency
- **THEN** Host admission concurrency equals the top-level execution-unit count
- **AND** the frontend SHALL NOT impose an extra fixed concurrency cap

#### Scenario: SkillRunner batch uses an explicit Host limit
- **WHEN** the execution seam runs a SkillRunner batch with positive Host maximum concurrency `N`
- **THEN** the Host SHALL admit at most `N` top-level execution units from that submission
- **AND** provider request fan-out inside each admitted unit SHALL retain its existing semantics

#### Scenario: ACP Skills batch uses full-parallel dispatch by default
- **WHEN** the execution seam runs an ACP Skills batch with blank or zero Host maximum concurrency
- **THEN** the Host SHALL admit every top-level execution unit without throttling
- **AND** the prior implicit serial default SHALL NOT apply

#### Scenario: ACP Skills batch uses an explicit Host limit
- **WHEN** the execution seam runs an ACP Skills batch with positive Host maximum concurrency `N`
- **THEN** the Host SHALL admit at most `N` top-level execution units from that submission

#### Scenario: Generic HTTP batch uses full-parallel dispatch
- **WHEN** the execution seam runs a batch for provider `generic-http`
- **THEN** queue concurrency equals the batch request count
- **AND** backend-side capacity control remains authoritative

#### Scenario: Pass-through batch keeps serialized execution
- **WHEN** the execution seam runs a batch for provider `pass-through`
- **THEN** queue concurrency remains `1`
- **AND** pass-through local execution semantics remain unchanged

### Requirement: Local queue lifecycle SHALL remain the frontend execution model
Host admission control MUST compose with, rather than replace, the existing
frontend execution lifecycle. An admitted unit MUST still use the provider run,
terminal-result, result-apply, and feedback seams, and trigger-level completion
MUST wait for all admitted, queued, skipped, and canceled units to converge.

#### Scenario: Admitted unit converges through apply before releasing its slot
- **WHEN** a supported backend-backed unit reaches a provider terminal result
- **THEN** the execution seam MUST complete unit-scoped result application
- **AND** only then SHALL Host admission release that unit's slot

#### Scenario: Submission completion waits for queued units
- **WHEN** a submission still contains Host-queued units
- **THEN** final feedback aggregation SHALL remain pending
- **AND** it SHALL complete only after every unit has reached succeeded, failed, or skipped outcome

#### Scenario: Pass-through keeps serialized execution semantics
- **WHEN** the execution seam runs a batch for provider `pass-through`
- **THEN** frontend dispatch MUST remain serialized
- **AND** this change MUST NOT alter pass-through local execution semantics

### Requirement: Preparation SHALL return explicit execution-unit plans

The preparation seam MUST return a typed execution plan whose top-level entries
correspond to legal declarative execution units. Each entry MUST retain the
source identity, display label, workflow and backend context, and the data needed
to execute provider preflight only after Host admission.

#### Scenario: Multiple selected parent items are legal

- **WHEN** declarative selection validation accepts multiple parent items for a workflow
- **THEN** preparation SHALL produce one ordered top-level execution unit per accepted parent item
- **AND** that order SHALL define the submission's FIFO queue order

#### Scenario: Preflight remains deferred until admission

- **WHEN** a prepared unit is waiting in the Host queue
- **THEN** provider preflight and provider submission for that unit SHALL NOT run
- **AND** the explicit plan SHALL retain enough data to run them after admission

### Requirement: Seam boundaries SHALL support deterministic testing
Each seam SHALL be testable through dependency injection of side-effectful collaborators.

#### Scenario: Preparation seam test without provider execution
- **WHEN** seam-level tests run
- **THEN** preparation seam can be tested without invoking provider or applyResult side effects

#### Scenario: Feedback seam test without UI runtime
- **WHEN** feedback seam tests run in mock environment
- **THEN** message generation and toast-trigger decisions can be asserted via injected adapters

### Requirement: Configurable workflow trigger failures SHALL be observable
Configurable workflows that require a settings gate MUST NOT silently no-op
when the gate fails before execution starts.

#### Scenario: Settings gate creation fails
- **WHEN** a configurable workflow trigger reaches settings-gate dialog opening
- **AND** dialog initialization fails
- **THEN** the system SHALL emit a trigger failure runtime log
- **AND** the user SHALL receive explicit failure feedback
- **AND** the workflow SHALL NOT silently disappear

### Requirement: Workflow source SHALL be included in trigger diagnostics
Trigger diagnostics MUST identify whether the loaded workflow came from the
builtin registry or a user override.

#### Scenario: Builtin workflow is shadowed by user workflow
- **WHEN** a workflow trigger fails for a workflow ID that exists in both builtin and user directories
- **THEN** runtime diagnostics SHALL include the currently loaded workflow source
- **AND** operators SHALL be able to distinguish builtin regression from user override behavior

### Requirement: Workflow loader SHALL support multi-workflow packages
The workflow loader SHALL support a package root that declares multiple child workflow manifests while remaining compatible with the existing single-workflow directory format.

#### Scenario: Package root yields multiple loaded workflows
- **WHEN** a workflow directory contains `workflow-package.json`
- **AND** that package manifest lists multiple child workflow manifests
- **THEN** the loader SHALL register one loaded workflow per listed child manifest
- **AND** each loaded workflow SHALL retain its own `workflowId`

#### Scenario: Legacy single-workflow directory remains valid
- **WHEN** a workflow directory contains a root `workflow.json`
- **THEN** the loader SHALL continue to load it as a single workflow

### Requirement: Builtin workflow packages SHALL preserve workflow-level UX identity
Bundling multiple workflows into one package SHALL NOT change workflow-level UI identity, settings identity, or user override identity.

#### Scenario: Settings and UI continue to address workflowId
- **WHEN** a bundled builtin workflow is shown in menus, dashboard, or settings
- **THEN** it SHALL still be addressed by its workflow `id`
- **AND** packaging metadata SHALL NOT become a new UI grouping requirement

#### Scenario: User override remains workflow-scoped
- **WHEN** a user workflow and a builtin packaged workflow share the same workflow `id`
- **THEN** the user workflow SHALL override only that workflow
- **AND** the rest of the builtin package SHALL remain available

### Requirement: Workflow package internal sharing
Builtin workflow packages SHALL be allowed to expose package-local implementation modules under `lib/` for use by workflows declared inside the same package.

#### Scenario: same-package lib reuse
- **WHEN** two workflows are declared from the same `workflow-package.json`
- **THEN** their hooks MAY import modules from that package's `lib/` directory
- **AND** this does not change workflow registration identity, which remains keyed by `workflowId`

### Requirement: Workflow package refactors are behavior-preserving
Refactoring builtin workflow-package internals into package-local shared modules MUST NOT change workflow manifests, settings keys, or user-facing behavior.

#### Scenario: package-local refactor keeps external contract stable
- **WHEN** builtin workflows are reorganized to use package-local `lib/` modules
- **THEN** their `workflowId`, manifest shape, settings persistence, and UI entry points remain unchanged

### Requirement: Tag Manager SHALL support configurable GitHub vocabulary sync
The `tag-manager` workflow SHALL support persisted workflow parameters for
GitHub-backed controlled vocabulary subscribe/publish.

#### Scenario: Tag Manager opens with complete GitHub sync config
- **WHEN** the user opens workflow `tag-manager`
- **AND** `github_owner`, `github_repo`, `file_path`, and `github_token` are configured
- **THEN** the workflow SHALL attempt to subscribe remote `tags/tags.json` before the editor opens
- **AND** successful remote tags SHALL seed the editor initial entries

#### Scenario: GitHub config is incomplete
- **WHEN** the user opens workflow `tag-manager`
- **AND** the GitHub sync config is incomplete
- **THEN** the workflow SHALL continue in local-only mode
- **AND** it SHALL NOT block the editor

### Requirement: Tag Manager SHALL distinguish local and subscription committed vocab sources
`tag-manager` SHALL resolve its committed controlled vocabulary from different
sources depending on whether GitHub sync is configured.

#### Scenario: Local mode reads local committed vocabulary
- **WHEN** GitHub sync config is incomplete
- **THEN** Tag Manager SHALL use local committed vocabulary as controlled vocab truth

#### Scenario: Subscription mode reads remote committed snapshot
- **WHEN** GitHub sync config is complete
- **THEN** Tag Manager SHALL use the remote committed snapshot as controlled vocab truth
- **AND** staged or pending entries SHALL NOT appear in committed controlled vocab

### Requirement: Tag Manager staged promotion SHALL be transactional in subscription mode
Staged entries promoted while GitHub sync is configured SHALL be published in a
debounced transaction before becoming committed controlled vocabulary.

#### Scenario: Subscription-mode staged batch succeeds
- **WHEN** one or more staged entries are promoted within the debounce window
- **THEN** Tag Manager SHALL issue one publish transaction for the batch
- **AND** only after publish succeeds SHALL those entries be removed from staged
- **AND** the committed controlled vocab SHALL refresh to include them

#### Scenario: Subscription-mode staged batch fails
- **WHEN** a staged promotion batch publish fails
- **THEN** Tag Manager SHALL keep the batch entries in staged
- **AND** the committed controlled vocab SHALL remain unchanged
- **AND** the user SHALL receive explicit failure feedback

### Requirement: Tag Manager save SHALL commit remotely before updating subscription-mode controlled vocab
Saving edited controlled vocabulary in subscription mode SHALL update committed
state only after the remote transaction succeeds.

#### Scenario: Subscription-mode save publish fails
- **WHEN** the user saves edited controlled vocabulary while GitHub sync is configured
- **AND** the remote publish fails
- **THEN** the remote committed snapshot SHALL remain unchanged
- **AND** the editor session SHALL preserve the failed draft with explicit retry feedback

#### Scenario: GitHub Contents API conflict happens once
- **WHEN** a publish attempt receives `409 Conflict`
- **THEN** the workflow SHALL re-fetch the latest remote contents
- **AND** retry publish once using the latest remote metadata plus current local tags

### Requirement: Active committed vocabulary SHALL back runtime consumers
Runtime consumers of controlled vocabulary SHALL resolve the active committed
vocabulary for the current mode rather than reading staged or pending data.

#### Scenario: Tag Regulator builds requests in subscription mode
- **WHEN** Tag Regulator builds `valid_tags` while GitHub sync is configured
- **THEN** it SHALL read the remote committed snapshot
- **AND** it SHALL NOT include staged or pending entries

### Requirement: Suggest and staged tag UIs SHALL expose parent binding counts
Workflow UIs that surface staged or stage-backed suggested tags SHALL display
the current number of bound parent items.

#### Scenario: Tag Manager staged inbox shows parent binding count
- **WHEN** a staged entry carries `parentBindings`
- **THEN** the staged inbox SHALL display the current binding count for that row

#### Scenario: Tag-Regulator suggest dialog shows staged-hit binding count
- **WHEN** a returned suggest tag already exists in staged storage
- **THEN** the suggest dialog SHALL still display that tag
- **AND** it SHALL display the merged parent binding count for that row

### Requirement: The system SHALL merge current parent bindings before the suggest dialog opens


When a returned suggest tag already exists in staged storage, the system SHALL merge the current parent's stable `{ libraryId, itemKey }` ref into that staged record before the suggest dialog opens.

#### Scenario: Returned staged-hit suggest tag merges current parent
- **WHEN** `tag-regulator` receives a suggest tag that is already present in staged storage
- **THEN** the current parent stable ref SHALL be merged into that staged record's `parentBindings`
- **AND** the dialog SHALL render using the merged binding count

### Requirement: Builtin workflow hooks remain pluggable and self-contained
Builtin workflow code under `workflows_builtin/**` MUST remain self-contained.
It MAY depend on plugin-core generic host/runtime capabilities, but it MUST NOT
depend on sibling builtin workflow code or workflow-side shared business modules.

#### Scenario: Builtin workflow uses host runtime capability
- **GIVEN** a builtin workflow needs toast or runtime-log output
- **WHEN** it uses plugin-core workflow runtime host capabilities
- **THEN** the capability is limited to generic host behavior
- **AND** no tag-vocabulary business semantics are exposed by plugin core

#### Scenario: Builtin workflow avoids sibling workflow imports
- **GIVEN** a builtin workflow hook file
- **WHEN** it is loaded from `workflows_builtin/**`
- **THEN** it MUST NOT import another builtin workflow directory or `workflows_builtin/shared/*`

### Requirement: Workflow package hooks SHALL execute through a core host API facade
Workflow-package hooks MUST consume host capabilities through the plugin core `hostApi` facade rather than reading raw `Zotero`, `addon`, or bridge-carried globals.

#### Scenario: Package hook reads host capabilities
- **WHEN** a workflow-package hook needs prefs, items, editor, file, logging, or notification capabilities
- **THEN** the hook SHALL resolve them from `runtime.hostApi`
- **AND** the hook SHALL fail explicitly when `hostApi` or a required host capability is missing

### Requirement: Workflow package execution SHALL advertise precompiled host-hook contract
Package workflow diagnostics MUST describe the precompiled host-hook contract instead of raw-runtime bridge metadata.

#### Scenario: Debug probe inspects a package workflow after migration
- **WHEN** workflow debug probe evaluates a workflow-package hook
- **THEN** the result includes `executionMode=precompiled-host-hook`
- **AND** the result includes `contract=package-host-api-facade`
- **AND** the result includes `hostApiVersion` and `hostApiSummary`
- **AND** the result SHALL NOT include raw Zotero shape or bridge/token carrier fields

### Requirement: Workflow package direct test/runtime helpers SHALL use the active host-api contract
Direct package helper tests and package-local utilities MUST execute under the same host-api contract used by production package hooks.

#### Scenario: Test invokes package-local helper without workflow execution pipeline
- **WHEN** a test directly invokes package-local helper code or renderer actions
- **THEN** it SHALL provide the active `hostApi` contract through runtime scope or host-api globals used by the package runtime adapter
- **AND** the test SHALL NOT depend on deprecated workflow runtime bridge shims

### Requirement: Workflow package runtime diagnostics SHALL be debug-gated
Workflow-package runtime diagnostics MUST remain silent in normal mode and MUST emit structured diagnostics only when the hardcoded debug mode is enabled.

#### Scenario: Debug mode disabled
- **WHEN** workflow-package loader, execution scope, or package-local runtime accessors run in normal mode
- **THEN** no additional workflow-package diagnostic log entries are emitted

#### Scenario: Debug mode enabled
- **WHEN** the hardcoded debug mode is enabled
- **THEN** workflow-package diagnostics are emitted to runtime logs and Zotero console output

### Requirement: Workflow package execution diagnostics SHALL describe host-api contract
Workflow hook execution diagnostics MUST record hook execution start and failure with the active host-api contract summary.

#### Scenario: Package hook executes in debug mode
- **WHEN** a package hook executes in debug mode
- **THEN** diagnostics include workflow id, package id, hook name, workflow source kind, `executionMode`, `contract`, `hostApiVersion`, and `hostApiSummary`

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

### Requirement: Debug-only workflow visibility SHALL be gated by debug mode
The system SHALL allow builtin workflows to declare `debug_only: true` and SHALL
hide those workflows from normal workflow menus, workflow lists, and Host Bridge
workflow discovery when hardcoded debug mode is disabled. Host Bridge workflow
submit SHALL also treat hidden debug-only workflows as not found.

#### Scenario: Debug mode enabled
- **WHEN** hardcoded debug mode is enabled
- **THEN** `debug_only` workflows are visible in workflow menus and workflow lists
- **AND** Host Bridge workflow list includes `debug_only` workflows
- **AND** Host Bridge workflow submit may invoke `debug_only` workflows.

#### Scenario: Debug mode disabled
- **WHEN** hardcoded debug mode is disabled
- **THEN** `debug_only` workflows are hidden from workflow menus and workflow lists
- **AND** Host Bridge workflow list excludes `debug_only` workflows
- **AND** Host Bridge workflow submit for a `debug_only` workflow id returns `workflow_not_found`.

#### Scenario: Existing run status remains queryable
- **WHEN** hardcoded debug mode is disabled after a debug-only workflow has already produced task or run records
- **THEN** Host Bridge task and run status endpoints may still return those existing records.

### Requirement: Workflow Debug Probe
The system SHALL provide a debug-only builtin workflow that reuses the real workflow preflight chain and reports why loaded workflows are enabled or disabled for the current selection.

#### Scenario: Probe execution
- **WHEN** the debug probe workflow is triggered with a non-empty selection
- **THEN** it runs selection-context rebuild, execution-context resolution, provider resolution, and build-request preflight for visible non-debug workflows
- **AND** it opens a read-only diagnostic panel
- **AND** it writes the same structured result to runtime logs

### Requirement: Structured Hook Failure Logging
The system SHALL preserve structured hook failure diagnostics in normal execution logs.

#### Scenario: Hook failure
- **WHEN** `filterInputs`, `buildRequest`, or `applyResult` throws
- **THEN** logs retain `error.message`, `error.stack`, hook name, and package metadata

### Requirement: Workflow trigger selection gating SHALL follow explicit manifest policy
Workflow trigger gating MUST read the manifest-level `trigger.requiresSelection` contract rather than inferring empty-selection eligibility from provider shape.

#### Scenario: Workflow omits explicit no-selection trigger policy
- **WHEN** a workflow is triggered with no selected items
- **AND** the manifest omits `trigger.requiresSelection` or does not set it to `false`
- **THEN** the menu SHALL render that workflow as disabled for `no selection`
- **AND** the preparation seam SHALL reject execution before request build

#### Scenario: Workflow explicitly allows no-selection trigger
- **WHEN** a workflow manifest declares `"trigger": { "requiresSelection": false }`
- **AND** the workflow is triggered with no selected items
- **THEN** the menu SHALL keep that workflow enabled
- **AND** the preparation seam SHALL allow execution to continue
- **AND** runtime request build SHALL create exactly one empty-selection execution unit for that trigger

### Requirement: Empty-selection eligibility SHALL NOT be inferred from provider kind
The execution system MUST NOT treat `provider`, `request.kind`, or missing `inputs.unit` as implicit permission to run without selection.

#### Scenario: Pass-through workflow still requires selection by default
- **WHEN** a `pass-through` workflow does not declare `trigger.requiresSelection: false`
- **AND** the current selection is empty
- **THEN** the workflow SHALL remain disabled and non-executable
- **AND** the system SHALL NOT silently fall back to provider-based no-selection execution

### Requirement: Workflow Package Hooks SHALL Be Able To Request File And Directory Selection Through Host API
Workflow package hooks MUST access user-driven file system pickers through the core host API facade rather than direct toolkit globals.

#### Scenario: Package hook picks export directory
- **WHEN** a package workflow needs the user to choose an export destination
- **THEN** it SHALL request the destination through `runtime.hostApi.file.pickDirectory(...)`
- **AND** a user cancel SHALL return `null`

#### Scenario: Package hook picks import file
- **WHEN** a package workflow needs the user to choose an import file
- **THEN** it SHALL request the file through `runtime.hostApi.file.pickFile(...)`
- **AND** the hook MAY provide title, starting directory, and file filters

### Requirement: Workflow Runtime Context SHALL Expose Workflow Asset Roots To Package Hooks
Package hooks that read packaged assets MUST receive the workflow and package root directories through runtime context.

#### Scenario: Import workflow loads copied schema assets
- **WHEN** a package workflow needs to read local schema assets bundled under its workflow directory
- **THEN** runtime context SHALL expose `workflowRootDir`
- **AND** the hook SHALL be able to resolve workflow-local asset paths through the host file API

### Requirement: Tag-Regulator Suggest Intake Must Respect Subscription Publish Transactions
`tag-regulator` suggest intake SHALL use the active tag vocabulary mode to decide whether a selected suggest tag is committed locally or published remotely.

#### Scenario: Subscription-mode join publish fails
- **WHEN** a user joins a suggest tag from the `tag-regulator` suggest dialog while Tag Manager is in subscription mode
- **AND** the remote vocabulary publish fails
- **THEN** the tag SHALL be written to staged storage with tag-regulator parent bindings
- **AND** the user SHALL receive a short publish failure toast
- **AND** the failure SHALL be logged

### Requirement: Staged Suggest Tags Must Retain Parent Bindings


Staged entries created from `tag-regulator` suggestions SHALL retain the set of stable parent item refs that proposed the tag.

#### Scenario: Same staged tag is suggested by multiple parents
- **WHEN** two or more `tag-regulator` runs stage the same suggest tag for different parent items
- **THEN** the staged entry SHALL retain the deterministic union of those stable parent refs

#### Scenario: Staged intake remains deferred
- **WHEN** a `tag-regulator` suggest tag is written to staged storage
- **THEN** the staged entry SHALL retain deferred stable parent refs
- **AND** the workflow SHALL NOT append that tag to any parent item until committed vocabulary update succeeds

### Requirement: Successful Staged Publish Must Backfill Bound Parent Tags


When a staged tag with parent bindings successfully enters committed vocabulary, Synthesis SHALL ensure that tag on every bound parent through its Host Tag effect port.

#### Scenario: Tag Manager promotes staged tag with parent bindings
- **WHEN** Tag Manager successfully publishes a staged tag that carries tag-regulator parent bindings
- **THEN** one semantic ensure-present effect SHALL be planned for each stable parent ref
- **AND** the staged entry SHALL be removed after the canonical commit
- **AND** Host effect failure SHALL be reported without rolling back the committed vocabulary

### Requirement: Workflow package hooks SHALL support multi-file import selection through host API

Workflow package hooks MUST be able to request multi-file selection through
the core host API facade.

#### Scenario: package hook requests multiple import files

- **WHEN** a package workflow needs the user to select multiple import files in one interaction
- **THEN** it SHALL call `runtime.hostApi.file.pickFiles(...)`
- **AND** the host API SHALL return an ordered array of absolute file paths

#### Scenario: user cancels multi-file picker

- **WHEN** the user dismisses the multi-file picker without choosing files
- **THEN** `runtime.hostApi.file.pickFiles(...)` SHALL return `null`
- **AND** the workflow SHALL be able to abort import cleanly without partial selection

### Requirement: Tag vocabulary workflows use Synthesis storage seams

Builtin tag vocabulary execution SHALL use Synthesis service APIs as the storage
boundary.

#### Scenario: Tag-regulator needs controlled tags

- **WHEN** tag-regulator builds a request
- **THEN** it SHALL read controlled tags through `hostApi.synthesis`
- **AND** it SHALL NOT read tag-manager prefs.

#### Scenario: Tag-regulator handles suggestions

- **WHEN** tag-regulator applies accepted or staged suggestions
- **THEN** it SHALL call Synthesis tag vocabulary APIs
- **AND** it SHALL NOT branch on tag-manager local/subscription mode.

### Requirement: Workflow execution seams support agent-owned prepared results

Workflow preparation and apply seams SHALL expose reusable contracts for
preparing requests without dispatch and applying externally finalized results.

#### Scenario: Preparation can produce raw requests for handoff

- **WHEN** Host Bridge prepares an agent-owned workflow handoff
- **THEN** the preparation seam SHALL provide request payloads built from the
  explicit selection without starting provider execution.

#### Scenario: Apply helper accepts externally finalized bundle results

- **WHEN** Host Bridge applies an agent-owned finalized bundle
- **THEN** it SHALL invoke workflow `applyResult` through the same runtime
  contract used by Host-owned workflow execution.

### Requirement: SkillRunner terminal success uses foreground apply

Normal SkillRunner terminal success SHALL be applied by the foreground workflow
apply seam.

#### Scenario: Single job success runs apply in foreground

- **WHEN** a `skillrunner.job.v1` provider result is terminal success
- **THEN** the apply seam SHALL execute the workflow `applyResult` hook
- **AND** update the owning SkillRunner run apply state.

#### Scenario: Sequence root success converges apply state

- **WHEN** a `skillrunner.sequence.v1` foreground run completes
- **THEN** root apply SHALL update the final result request record apply state
  to `succeeded`, `failed`, or `skipped`
- **AND** startup recovery SHALL NOT treat that run as unapplied work.

#### Scenario: Recovery-owned pending still registers deferred completion

- **WHEN** a request-ready run crosses a recoverable local or network failure
  boundary
- **THEN** startup or backend recovery MAY register an explicit recovery
  context
- **AND** the normal apply seam SHALL NOT return reconcile-owned pending jobs.

#### Scenario: SkillRunner apply summary has no reconcile-owned output

- **WHEN** a normal SkillRunner job is waiting or terminal
- **THEN** the apply summary SHALL only report succeeded, failed, or pending
  counts and job outcomes
- **AND** it SHALL NOT expose a reconcile-owned pending jobs collection.

### Requirement: Workflow apply outcome SHALL contribute to main run status

Workflow execution seams SHALL treat a run as user-visible succeeded only when backend execution succeeded and required apply succeeded, was skipped, or was not required.

#### Scenario: Apply failure after backend success

- **WHEN** an ACP Skills or SkillRunner run reaches backend `succeeded`
- **AND** required `applyResult` fails
- **THEN** the run's main status SHALL be `failed`
- **AND** the run's backend status SHALL remain `succeeded`
- **AND** summaries and task projections SHALL expose the apply failure.

#### Scenario: Apply skipped is successful

- **WHEN** backend execution succeeds
- **AND** apply is skipped or not required
- **THEN** the run's main status SHALL be `succeeded`.

### Requirement: SkillRunner run seam MUST be shared by single jobs and sequence steps

Workflow execution MUST route single SkillRunner jobs and sequence SkillRunner steps through the same SkillRunner run lifecycle seam.

#### Scenario: Single job creates run before provider request

- **GIVEN** workflow execution is about to submit a single SkillRunner job
- **WHEN** execution enters the SkillRunner seam
- **THEN** the seam MUST create a `SkillRunnerRunRecord` with stable `runKey`
  before backend request creation.

#### Scenario: Sequence step creates run before provider request

- **GIVEN** sequence orchestration is about to submit a SkillRunner step
- **WHEN** execution enters the SkillRunner seam
- **THEN** the seam MUST create a `SkillRunnerRunRecord` with stable `runKey`
  before backend request creation
- **AND** it MUST attach sequence association fields to the run record.

#### Scenario: Request progress uses runKey

- **GIVEN** provider progress references a SkillRunner execution
- **WHEN** workflow execution records the progress
- **THEN** it MUST update the run identified by `runKey`
- **AND** it MUST NOT re-key lifecycle state around `requestId`.

### Requirement: Sequence runtime MUST orchestrate without owning SkillRunner lifecycle truth

The sequence runtime MUST maintain sequence order and aggregate sequence state only; per-step SkillRunner lifecycle truth remains in the SkillRunner run store.

#### Scenario: Sequence state reads step run status

- **GIVEN** a sequence workflow contains SkillRunner steps
- **WHEN** the sequence runtime computes current orchestration state
- **THEN** it MUST read each step execution state from the SkillRunner run
  lifecycle projection
- **AND** it MUST NOT infer terminal step state from a synthetic job record.

#### Scenario: Observer detachment does not terminalize sequence

- **GIVEN** a sequence SkillRunner step has `requestId`
- **WHEN** local observation detaches after a network, abort, shutdown, or
  timeout error
- **THEN** the sequence runtime MUST keep the sequence recoverable
- **AND** it MUST NOT mark the step or sequence terminal solely from that
  observer failure.

### Requirement: SkillRunner run model MUST persist only lifecycle recovery execution facts

Workflow seams MUST avoid persisting display and registry-derived fields in the SkillRunner run record.

#### Scenario: Registry facts are resolved outside the run record

- **GIVEN** a SkillRunner run references `backendId`, `workflowId`, and
  optional `skillId`
- **WHEN** workflow execution persists the run
- **THEN** it MUST persist those identifiers
- **AND** it MUST NOT persist `backendBaseUrl`, `backendType`, `providerId`,
  `workflowLabel`, `skillName`, or `skillLabel` as lifecycle facts.

#### Scenario: Sequence display facts stay in sequence state

- **GIVEN** a SkillRunner run belongs to a sequence workflow
- **WHEN** workflow execution persists the run
- **THEN** it MUST persist sequence association ids when present
- **AND** it MUST NOT persist `sequenceStepIndex` or `sequenceFinalStepId` as
  run lifecycle facts.

### Requirement: Workflow execution seam SHALL project only concrete task runs

The workflow execution seam SHALL treat `skillrunner.sequence.v1` root jobs as
orchestration carriers and SHALL NOT project them into taskRuntime, Dashboard
history, ACP Skills run records, SkillRunner run projections, or Host Bridge
skill-run handles.

#### Scenario: ACP sequence root is not projected

- **GIVEN** a `skillrunner.sequence.v1` workflow runs on an ACP backend
- **WHEN** the root workflow job changes state
- **THEN** the seam SHALL NOT call taskRuntime or Dashboard history writers for
  that root job.

#### Scenario: SkillRunner sequence root remains non-projectable

- **GIVEN** a `skillrunner.sequence.v1` workflow runs on a SkillRunner backend
- **WHEN** the root workflow job changes state
- **THEN** the seam SHALL preserve the existing behavior where only concrete
  SkillRunner step runs are projected.

#### Scenario: Task writers reject sequence roots

- **GIVEN** any caller attempts to write a `skillrunner.sequence.v1` root job to
  taskRuntime or Dashboard history
- **WHEN** the write helper evaluates the job
- **THEN** the helper SHALL return no row and SHALL NOT mutate taskRuntime or
  Dashboard history.

### Requirement: Workflow package hooks SHALL use managed materialization for generated provider inputs

Workflow package hooks SHALL materialize files they generate for provider input through the workflow host API instead of writing those files to Zotero core temp directories.

#### Scenario: Build hook generates a provider input file

- **WHEN** a workflow package build hook creates a file that will be referenced by a provider request input or upload file entry
- **THEN** the hook SHALL call `runtime.hostApi.file.materializeWorkflowInputFile(...)`
- **AND** the resulting request SHALL reference the returned absolute local path or the backend-specific upload mapping derived from that path

#### Scenario: Hook needs ephemeral scratch storage

- **WHEN** a workflow package hook needs short-lived scratch storage that is not referenced by a provider request
- **THEN** it MAY use ephemeral temp storage
- **AND** it SHALL NOT rely on that storage for ACP schema validation inputs.

### Requirement: Successful apply hooks SHALL expose bounded warning diagnostics

An apply hook MAY return structured `applyDiagnostics` without changing successful apply semantics, and the apply seam SHALL record only a bounded warning summary in the corresponding success log.

#### Scenario: Apply succeeds with warnings

- **WHEN** an apply hook succeeds and returns a valid non-zero warning count with warning code counts
- **THEN** the apply outcome SHALL remain successful
- **AND** the success log SHALL use warning severity and include the normalized count summary.

#### Scenario: Apply succeeds without diagnostics

- **WHEN** an apply hook succeeds without `applyDiagnostics`
- **THEN** existing info-level success logging SHALL remain unchanged.

#### Scenario: Apply diagnostics are malformed

- **WHEN** a successful hook returns invalid or unbounded diagnostics
- **THEN** the apply seam SHALL ignore or bound the invalid fields without failing apply
- **AND** it SHALL NOT log the complete hook result or unrestricted warning messages.

### Requirement: Prepared workflow submission SHALL have one shared execution seam
Workflow UI and Host Bridge SHALL call one submission seam after confirmed planning and duplicate guarding. The seam SHALL accept resolved prepared execution state and immutable allowed prepared units, and SHALL own queue admission plus direct-provider fallback.

#### Scenario: ACP unit is admitted
- **WHEN** the submission queue admits an ACP or SkillRunner prepared unit
- **THEN** the seam SHALL build and preflight that unit, run it to terminal state, and complete Host apply before releasing its queue slot

#### Scenario: Input plan already exists
- **WHEN** the seam receives a prepared execution and allowed units
- **THEN** it SHALL NOT inspect raw selection, invoke the planner, delete members, or regroup units

#### Scenario: UI and Host submit concurrently
- **WHEN** UI and Host Bridge submit queue-managed workflows
- **THEN** each entry path SHALL invoke the shared seam once
- **AND** no path SHALL enqueue the same unit twice or bypass the native queue
