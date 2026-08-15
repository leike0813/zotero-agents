## Context

`resolveProviderTerminalOutcome` currently lives in `applySeam.ts` even though
`runSeam.ts` also consumes it. The run seam surrounds that helper with its own
sequence-root gate, local queue terminal checks, deterministic SkillRunner
run-key fallback, and ACP record fallback. The apply seam calls the helper in
two branches and separately owns missing, recoverable, deferred, and local
apply reduction.

Sequence, SkillRunner, and ACP stores remain independent lifecycle owners with
other callers. Their getters can perform existing lazy hydration or legacy
migration, so the new module is synchronous and read-only with respect to
lifecycle ownership, but it is not described as a pure function.

## Goals / Non-Goals

**Goals:**

- Give terminal interpretation one neutral module and one small interface.
- Hide request identity derivation, sequence-root gating, canonical-record
  lookup, local/deferred fallback, and evidence priority from both callers.
- Preserve current apply, recovery, subscription, cleanup, and store-write
  behavior.
- Make a missing queue job terminate observation so the existing apply reducer
  can report a deterministic failure.

**Non-Goals:**

- Merging sequence, SkillRunner, or ACP persistence ownership.
- Moving lifecycle writes, observation subscriptions, or submission-slot
  yield/resume sampling into the resolution module.
- Adding a public evidence-reader factory, provider registry, polling loop, or
  asynchronous resolution interface.
- Changing transcript, Assistant Workspace, workflow manifest, or provider
  transport behavior.

## Decisions

### Use one decision-oriented resolution union

The module exposes `WorkflowJobTerminalResolution` with four variants:
`missing`, `pending`, `local-ready`, and `canonical-ready`. `local-ready` is a
marker because the apply seam already owns the queue job and its reducer.
`canonical-ready` carries the terminal state, resolved request identity, and
optional reason needed to summarize without reading lifecycle stores again.

The interface receives only `queue`, `workflowRunId`, and `jobId`. It derives
request identity from the job and, for a completed sequence root, from the last
materialized step. A caller-supplied request-id override would reintroduce the
identity drift this module is intended to remove.

### Keep resolution synchronous and store readers internal

The production resolver reads the existing queue, sequence, SkillRunner, and
ACP stores. The run and apply seam dependency objects accept the complete
resolver function, giving seam tests a stable adapter without exposing a
second shallow interface for individual store readers. Existing local stores
remain the stand-ins for direct resolver tests.

Store read and parse errors propagate. `pending` means terminal evidence is
legitimately incomplete; it must not hide infrastructure or invariant errors.

### Centralize evidence priority without changing lifecycle ownership

Resolution applies this order:

1. A sequence root that is failed or canceled produces the matching canonical
   terminal result.
2. A running or missing sequence root remains pending. A completed root selects
   its last materialized request; absent or non-terminal child evidence remains
   pending rather than becoming a false success.
3. A canonical SkillRunner or ACP record that is failed or canceled wins over
   stale simultaneous apply-failure evidence.
4. Backend success becomes canonical success only after terminal successful or
   accepted skipped apply. Apply failure after backend success becomes failure.
5. A non-deferred terminal queue job is local-ready. A deferred job without
   canonical terminal evidence remains pending.

The module does not rewrite lifecycle records or add backend-product special
cases. SkillRunner and ACP keep their current record shapes and writers.

### Keep observation and reduction in their owning modules

`runSeam` maps `pending` to continued observation and all other variants to
observer settlement. It retains subscriptions, settle-once cleanup, and direct
store reads used only for submission-slot yield/resume status sampling.

`applySeam` maps `missing` to its existing explicit failure, lets
`local-ready` continue through its current reducer and apply hook, leaves
recoverable/deferred pending behavior intact, and consumes `canonical-ready`
without running apply again. All lifecycle writes and bundle cleanup remain in
the apply seam.

## Risks / Trade-offs

- [Missing jobs can be transient] -> Terminal observation starts only after
  queue admission has returned job ids; a missing admitted job has no recovery
  path, so settling into the existing apply failure is safer than waiting.
- [Getter hydration is mistaken for a pure read] -> Documentation says the
  module owns no lifecycle writes rather than claiming it has no internal side
  effects.
- [A broad refactor removes status sampling imports] -> Run-seam imports used
  for subscription-slot yield/resume remain; only terminal interpretation moves.
- [Decision-table tests duplicate caller tests] -> Complete state combinations
  live at the resolver interface, while run/apply tests retain only timing and
  reducer integration invariants.

## Migration Plan

No data migration is required. Introduce the resolver and tests, inject it into
both seams, remove the apply-owned helper and duplicate observer fallbacks, then
update documentation. Rollback consists of reverting these source and contract
changes; persisted lifecycle records remain compatible.
