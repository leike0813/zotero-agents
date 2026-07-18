## Context

The SkillRunner connection governor currently owns both scheduling state and a bounded audit ledger. Every connection lifecycle records event objects and maintains the ledger even when debug mode is disabled; only Dashboard and Host Bridge reads are gated. ACP Trace and Replay already establish the project pattern for an independent source literal, a compile-time define composed with debug mode, dynamic diagnostic imports, and metafile/marker release-elision checks.

The connection-audit DTO and UI are useful during local diagnosis and must remain unchanged when enabled. The default source switch is disabled, and production elision follows the existing ACP contract: the main TypeScript runtime bundle and governor hot path contain no feature module bytes or audit work. Directly copied Dashboard JS/CSS/localization assets are outside that byte-elision boundary.

## Goals / Non-Goals

**Goals:**

- Require both an explicit source switch and debug mode before audit collection or exposure.
- Remove audit allocations, calls, retention, and derived summaries from disabled governor paths.
- Preserve enabled audit events, limits, snapshot shape, Dashboard behavior, and Host Bridge output.
- Prove debug-off and source-off elision with the shared runtime-diagnostics build harness.

**Non-Goals:**

- Adding SkillRunner trace capture, persistence, replay, or scheduler simulation.
- Changing connection admission, lane priority, timeouts, abort, physical-debt, or settlement behavior.
- Removing dormant renderer, CSS, or localized strings from copied Dashboard assets.
- Changing the capability name or audit snapshot wire contract.

## Decisions

### Use one default-off source literal composed with debug mode

`debugMode.ts` owns `SKILLRUNNER_CONNECTION_AUDIT_ENABLED = false`, a test-only override for unbundled tests, and the availability helper. `zotero-plugin.config.ts` injects `__skillrunner_connection_audit_enabled__`; call sites combine that define with `__debug_mode__` so esbuild can fold disabled branches. A runtime preference is rejected because it cannot guarantee source elision.

### Move audit ownership out of the governor

`skillRunnerConnectionAuditStore.ts` owns a `WeakMap` keyed by governor object, event IDs, the bounded 200-event ledger, reset, and audit-derived counters without importing the governor. `skillRunnerConnectionAudit.ts` is the read facade that combines Store data with a pure governor core snapshot and exports the existing DTO. This direction avoids a governor/facade cycle and leaves governor instances without audit fields when the feature is disabled.

Every audit event point gates before constructing its event input. Merely guarding inside `recordAuditEvent`, installing a no-op observer, or keeping optional callbacks is rejected because calls, arguments, or instance fields would remain on the hot path.

### Dynamically import diagnostic readers

Dashboard and Host Bridge remove static imports of the audit facade. Dashboard tab normalization requires source availability and debug mode, then imports the facade only for the selected audit surface. The Host capability is included only when source code is compiled in and remains subject to the existing runtime debug capability gate so test overrides keep working after module initialization.

### Generalize the ACP elision harness as runtime diagnostics infrastructure

The existing side-effects plugin and release-elision checker become data-driven runtime-diagnostics infrastructure shared by ACP profiler/trace/replay and SkillRunner audit. The audit group checks module bytes and stable markers in debug-off, source-off, and fully enabled builds. This is preferable to a second build harness with divergent definitions and reporting.

## Risks / Trade-offs

- [A module-level availability value captures a stale test override] → Keep runtime debug gating at capability invocation/visibility boundaries and use compile constants only for inclusion and dynamic-import reachability.
- [Refactoring snapshot calculation changes scheduling state] → Expose a pure core snapshot and preserve audit-derived calculations in the Store/facade; add a regression that reads do not release debt or otherwise mutate governor state.
- [Static imports retain disabled modules] → Mark the isolated diagnostic modules side-effect-free, use type-only imports where applicable, and verify metafile bytes plus markers.
- [Default-off source switch makes enabled behavior hard to test] → Provide a test-only source override for unbundled tests and explicit enabled defines in the build harness; production defines always take precedence.
- [Generic harness rename breaks scripts] → Update every repository import and package script in the same change and run focused node/build gates.

## Migration Plan

Introduce tests and build fixtures first, then add the source define, extract audit state, update diagnostic readers, and finally enable the new elision group. The feature is disabled after merge until a developer explicitly changes the source literal. Rollback consists of reverting this change; there is no persisted data or user configuration to migrate.

## Open Questions

None.
