# Design: Assistant Workspace Hardening And Merge Prep

## R3 metric emission points

### Region signature metrics — coordinator single point

`AssistantWorkspacePublicationCoordinator.publishRegion`
(`src/modules/assistantWorkspacePublicationCoordinator.ts:106-120`) is the
only region-signature compare in the system: it builds
`JSON.stringify(payload)` and skips publication when the signature is
unchanged. Instrumenting this one function covers every chrome region of
every source:

- signature built → `panel_signature` counter +1,
  `panel_signature_bytes` counter += byte length,
  `panel_signature_duration` duration observation (profiler clock);
- signature hit (publication skipped) → `panel_signature_skip` counter +1.

Labels: `publicationSurface` (owner source), `publicationKind`. Both are
already in `sanitizeLabels` (`acpRuntimePerformanceBaseline.ts:225-249`),
so no sanitizer change is needed. All emissions are synchronous counter /
duration observations inside a function that is already synchronous; no
control-flow change.

### Transcript page-read metrics — runtime funnel

The publication runtime calls `adapter.readTranscriptPage(...)` at three
sites (`src/modules/assistantWorkspacePublicationRuntime.ts:227,480,573`
— page-request action, initial/owner-switch page read, snapshot re-read).
All three go through the same adapter method signature. Each call is
wrapped:

- `transcript_page_read` counter +1;
- `transcript_page_scan_items` counter += number of items in the returned
  page;
- `transcript_page_read_duration` duration observation.

Labels: `publicationSurface`, `publicationCause`, `publicationPhase`
(`initialization` vs `steady-state` — the first-paint proxy: an
`initialization`-phase page read that resolves the owner's first page is
the measurable transcript-first-paint cost on the host side).

**Timing constraint (Phase 4 lesson).** The wrap observes an existing
`await`; it must not add or remove microtask yields. Concretely: capture
the profiler clock before the call, `await` the same promise, observe the
duration in a `finally`-equivalent path. No new intermediate promises, no
reordering of the resolution path. Test 97's mount-preservation cases are
the regression tripwire.

### Determinism in tests

The profiler's test clock
(`configureAcpRuntimePerformanceProfilerForTests`) makes all durations
deterministic in the harness, so the refreshed baseline stays
machine-independent — same discipline as the 2026-07-18 recording.

## Harness alignment

`test/helpers/acpRuntimePerformanceHarness.ts:369-386` currently
synthesizes the seven R3 metrics. After production emission exists, the
harness drives the real paths (its publication-runtime initialization
already flows through the coordinator and `readTranscriptPage`; the
scenario is extended where needed so each surface state produces
signature builds, at least one signature skip, and page reads) and the
synthetic block is deleted. `test/core/176` assertions are updated to the
real counts. This is the only sanctioned test migration in this change.

## Baseline naming

`scripts/record-acp-runtime-governance-baseline.ts` gains
`--output-prefix <name>` (default preserves today's
`acp-runtime-before-governance`). The post-refactor recording uses
`acp-runtime-after-workspace-refactor`, producing per-surface JSON plus
the markdown summary under `artifact/performance-baselines/`. The
2026-07-18 files are retained untouched: they are the pre-refactor
historical record, and their label shape is no longer comparable by
design. The script's built-in double-run determinism gate applies
unchanged.

## Live replay matrix execution

Procedure: `doc/components/acp-runtime-performance-profiler.md`
§"Manual Zotero Acceptance", on the local Zotero 9 host (`.env`:
`/usr/bin/zotero`, profile `v3g4pnq9.dev`). Prerequisites verified at
execution time: a configured ACP backend for trace recording. Outputs
(`acp-replay-*.json/.md`) are copied from the runtime result directory
into `artifact/performance-baselines/` — establishing the archival
convention. Zotero 7 is an open pre-merge item (host not installed).

## Merge prep artifact

`artifact/assistant-workspace-merge-prep-20260807.md` collects: per-phase
gate status, this change's gate results, open items (Zotero 7 matrix,
dual-host smoke), the AGENTS.md hard-constraint rewrite draft, and the
merge procedure. The rewrite draft restates the Assistant Workspace UI
hard constraints in terms of the implemented mechanism — Preact
components with props-level memoization and signature equality replacing
hand-written signature guards — preserving every behavioral invariant
verbatim in substance; it is applied to AGENTS.md only at merge time.
