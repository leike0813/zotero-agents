# assistant-workspace-hardening Specification

## Purpose
TBD - created by archiving change 2026-08-07-assistant-workspace-hardening-merge-prep. Update Purpose after archive.
## Requirements
### Requirement: Region signature guard emits R3 metrics

The Assistant Workspace publication coordinator's region signature guard
SHALL emit runtime performance metrics at its single comparison point.
Building a region signature SHALL emit a `panel_signature` counter
increment, a `panel_signature_bytes` counter accumulation of the
signature byte length, and a `panel_signature_duration` duration
observation. A signature hit that skips publication SHALL emit a
`panel_signature_skip` counter increment. Emissions SHALL be labeled by
publication surface and publication kind, and SHALL be synchronous
observations that do not change publication control flow.

#### Scenario: Region publication with changed content

- **WHEN** a region publication is built whose signature differs from the
  stored signature
- **THEN** `panel_signature`, `panel_signature_bytes`, and
  `panel_signature_duration` reflect the build
- **AND** the publication proceeds exactly as before.

#### Scenario: Region publication skipped by signature hit

- **WHEN** a region publication is requested whose signature equals the
  stored signature
- **THEN** `panel_signature_skip` increments
- **AND** no publication is enqueued, exactly as before.

### Requirement: Transcript page reads emit R3 metrics

Every transcript page read performed by the publication runtime — for any
owner source (ACP Chat, ACP Skills, SkillRunner) — SHALL emit a
`transcript_page_read` counter increment, a `transcript_page_scan_items`
counter accumulation of the returned page's item count, and a
`transcript_page_read_duration` duration observation, labeled by
publication surface, cause, and phase. The instrumentation SHALL NOT add
or remove microtask yields on the read path, and SHALL NOT change page
read semantics, ordering, or resolution timing.

#### Scenario: Initial page read for a newly selected owner

- **WHEN** the runtime reads the first transcript page of an owner during
  initialization or owner switch
- **THEN** the three page-read metrics are emitted with the
  `initialization` phase label
- **AND** the owner-first paint sequence is unchanged.

#### Scenario: Steady-state page read timing is not perturbed

- **WHEN** a steady-state or page-request read resolves
- **THEN** its resolution observes the same microtask ordering as without
  instrumentation
- **AND** the node-identity invariant suites (97) pass unchanged.

### Requirement: Post-refactor performance baseline is deterministically re-recordable

A governance baseline reflecting the post-refactor publication plane
SHALL be recorded under `artifact/performance-baselines/` with an
output prefix distinct from the 2026-07-18 pre-refactor recording, and
the historical files SHALL be preserved untouched. The recording SHALL
remain machine-independent (fixed test clock, deterministic double-run
gate) and SHALL include the real region-signature and transcript
page-read R3 metrics.

#### Scenario: Refresh the baseline

- **WHEN** the baseline recording command runs with the post-refactor
  output prefix
- **THEN** per-surface JSON artifacts and a markdown summary are produced
  whose two consecutive runs are byte-identical
- **AND** the R3 group contains production-emitted signature and
  page-read series for every surface state.

### Requirement: Live replay matrix outcome is recorded

Execution of the live replay matrix procedure on an available Zotero
host SHALL produce archived `acp-replay-*` artifacts and a written
outcome record. Host families not exercised SHALL be recorded as open
pre-merge items rather than silently dropped.

#### Scenario: Zotero 9 matrix executed

- **WHEN** the nine-record replay matrix completes on the Zotero 9 host
- **THEN** the result artifacts are archived under
  `artifact/performance-baselines/`
- **AND** the outcome is recorded in the refactor plan artifact.

#### Scenario: Zotero 7 host unavailable

- **WHEN** no Zotero 7 host is available during this change
- **THEN** the merge-prep artifact lists the Zotero 7 replay matrix as an
  open pre-merge item.

### Requirement: Merge preparation is documented before merge

Before the refactor branch is proposed for merge, a merge-prep artifact
SHALL record the per-phase gate status, the open pre-merge items, the
AGENTS.md hard-constraint rewrite draft describing the component/props
memoization implementation while preserving every behavioral invariant,
and the merge procedure. The AGENTS.md rewrite SHALL NOT be applied
before the merge itself.

#### Scenario: Merge prep artifact reviewed

- **WHEN** the merge-prep artifact is complete
- **THEN** every open item is either verified green or explicitly listed
  with its blocker
- **AND** the AGENTS.md draft preserves each behavioral invariant of the
  current hard-constraint sections.
