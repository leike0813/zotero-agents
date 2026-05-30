## Context

Host Bridge and `zotero-bridge` are now the primary agent-facing path for Zotero
host access. Synthesis Layer debugging needs the same reliability, but the
normal public capability surface should not expose queue mutation, worker
execution, stale job cleanup, DB/cache diffing, or clean-install maintenance
actions.

The follow-up adds a debug-only capability family rather than broadening normal
`synthesis.*` capabilities. This keeps production-facing semantics stable while
giving developers bounded inspection and control over the hardest state to
debug.

## Goals / Non-Goals

**Goals:**

- Expose a debug-only Host Bridge capability family for global and Synthesis
  diagnostics.
- Keep debug capabilities invisible and uncallable when hard-coded debug mode
  is disabled.
- Provide semantic CLI commands under `zotero-bridge debug ...`.
- Support Synthesis queue/job inspection, paper/topic inspection, DB/cache diff,
  worker run, maintenance run, queue control, and stale job cleanup.
- Keep debug outputs bounded, JSON-safe, redacted, and useful for automated
  diagnostics.
- Require Zotero approval and fixed confirmation phrases for dangerous debug
  operations.

**Non-Goals:**

- Do not add a prefs switch for debug mode.
- Do not expose arbitrary SQL, arbitrary filesystem access, or a generic debug
  shell.
- Do not change normal `synthesis.*` public capabilities.
- Do not run data migrations as part of debug command registration.
- Do not make every debug operation user-facing in normal settings UI.

## Decisions

### Decision 1: `debug.*` is a capability family with a double gate

Debug capabilities are registered through a helper that marks category `debug`,
wraps handlers with an `isDebugModeEnabled()` check, and participates in
manifest filtering. `getHostBridgeCapability()` also returns `null` for
`debug.*` when debug mode is off.

Rationale: manifest hiding alone is insufficient because old clients can still
hold capability names. The registry and handler must both reject disabled debug
calls.

### Decision 2: Debug output uses a common bounded envelope

All debug responses include `schema`, `debugMode`, `generatedAt`, `truncated`,
`limits`, and `diagnostics`. Domain payloads are nested below those common
fields.

Rationale: developers need outputs that are easy to diff, save, and feed into
tools. Shared envelope fields also make truncation and redaction visible.

### Decision 3: Synthesis debug handlers use service/repository APIs

Host Bridge handlers call Synthesis service debug methods. They do not assemble
SQL queries directly, and they do not bypass existing queue, worker, repository,
or read-model boundaries.

Rationale: debug capability should reveal the current system state without
creating a parallel runtime model that becomes another source of bugs.

### Decision 4: Worker run is debug-write but not dangerous by default

`debug.synthesis.worker.run` and `debug.synthesis.maintenance.run` can write
Synthesis DB state because they invoke normal Synthesis workers. They do not
require UI approval unless a specific operation clears or discards state.

Rationale: debugging a stuck queue requires advancing the existing worker
pipeline. Forcing UI approval on every bounded worker run would make the tool
too slow for iterative diagnosis.

### Decision 5: Dangerous operations remain bridge-authorized, not CLI-authorized

Queue clear, reset, and other destructive debug operations use
`zotero-ui-required` and validate fixed confirmation phrases inside capability
handlers. CLI commands pass input but do not decide whether the phrase is
correct or whether approval can be skipped.

Rationale: the Host Bridge is the security boundary. CLI-side checks are useful
for UX but must not become authority.

### Decision 6: CLI preflights manifest for semantic debug commands

The CLI reads the manifest before semantic `debug` commands. If the mapped
capability is absent, the CLI returns `debug_mode_disabled` and does not issue a
raw capability call.

Rationale: this gives humans and agents a clear answer when debug mode is off,
while still preserving the Host Bridge's direct-call hard gate.

## Interface Notes

### Common Debug Input

- `limit`: defaults to 100 and is capped at 1000.
- `includeLocalPaths`: defaults to false.
- `includeRawRows`: defaults to false.
- `dryRun`: defaults to true for dangerous operations.

### Synthesis Worker Input

- `worker`: one of `startupReconcile`, `paperRegistryIncremental`,
  `citationGraphStructure`, `citationGraphComplexMetrics`, `topicFreshness`,
  `topicDiscovery`.
- `batchLimit`: defaults to 10.
- `timeBudgetMs`: defaults to 2000.
- `topicIds` and `literatureItemIds`: accepted only for workers that can use
  those filters.

### Dangerous Confirmation Phrases

- Queue clear: `CLEAR SYNTHESIS DEBUG QUEUE`.
- Future dangerous operations must define their own fixed phrase in the
  capability handler and document it in tests.

## Risks / Trade-offs

- [Risk] Debug commands can become a shadow public API.
  - Mitigation: hard debug gate, no prefs toggle, and no normal guidance outside
    debug docs.
- [Risk] Debug output can leak local machine details.
  - Mitigation: local paths and raw rows are opt-in, and tokens are always
    forbidden.
- [Risk] Worker-run debug commands can mutate state while diagnosing.
  - Mitigation: commands are explicit, bounded, and return before/after state.
- [Risk] Synthesis debug APIs can duplicate repository logic.
  - Mitigation: Host Bridge handlers call Synthesis service methods; SQL stays
    in repository-owned code.

## Verification Strategy

- Host Bridge registry tests for debug manifest filtering and direct-call
  rejection.
- Host Bridge approval tests for dangerous debug capabilities.
- Synthesis service tests for queue/jobs/paper/topic/diff/worker-run outputs.
- CLI tests for command mapping, manifest-disabled behavior, input parsing, and
  single JSON stdout.
- Safety tests proving tokens and local paths are not emitted by default.
