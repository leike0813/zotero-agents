# Validation

## Result

Source implementation and the six tracked tasks are complete. No plugin build,
installation, production-data operation, native binary change, archive, or Git
commit was performed. The running Zotero instance still uses its installed
plugin; these results verify the source implementation only.

## Regression evidence

- The delayed-stderr regression first failed because the replacement connection
  changed from `service-2` to an unintended `service-3`; it now retains the
  replacement and one live child.
- A child exiting during handshake first published a ready connection; it now
  schedules recovery without exposing that dead connection.
- Safe-control-cause tests first found the cause missing; lifecycle logs now
  retain `sidecar_control_timeout` or normalize unsafe exceptions to
  `control_failed`, without raw credentials or paths.
- Unknown `service_not_ready` progress initially ignored backoff and issued a
  second read before five seconds; it now uses the same unavailable backoff as
  other unavailable progress results. Accepted maintenance retains its prior
  distinct transient-error semantics.
- Sync chrome progress initially swallowed unavailable failures and read again
  on the next poll; it now shares the progress backoff and retains successful
  cached chrome content.
- Unmounting an observer initially produced an obsolete stopped-observing
  alert; the disposed owner now suppresses that feedback and subsequent reads
  and publications.
- Additional tests cover concurrent health failures, late spawn/health/handshake
  completion after stop, multiple mounted Workbench owners, readiness resumption,
  maintenance identity without mutation replay, and the original observer deadline.

The Workbench auxiliary draft was received before its new behavior tests were
written; those initial readiness behaviors were verified after integration.
The regression failures listed above were actually observed before their fixes.

## Commands and outcomes

```powershell
node --import ./node_modules/tsx/dist/loader.mjs node_modules/mocha/bin/mocha.js tests/synthesis/125-synthesis-tab-ui.test.ts tests/synthesis/228-synthesis-production-runtime-supervisor.test.ts tests/synthesis/231-synthesis-sidecar-debug-observability.test.ts --require tests/setup/zotero-mock.ts --timeout 10000 --grep "locates a page beyond|invalidates Index, Topics, and Home" --invert --reporter dot --exit
```

**152 passing (14s).** The two excluded cases are described below. The supervisor
and observability suites alone also passed all 42 cases without exclusions.

- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- Targeted ESLint over the three changed source files and two changed test
  files: passed.
- Targeted `prettier --check` over changed source/tests, lifecycle documentation,
  `AGENTS.md`, and the change artifacts: passed.
- `git diff --check`: passed.
- `npm run check:synthesis-production-capabilities`: passed, 107 capabilities
  and 107 operations.
- `openspec validate fix-synthesis-sidecar-session-recovery --strict`: passed.

## Existing failures and test-order limitation

1. `Index progressive reads and session cache / locates a page beyond the bounded
   matching directory with a fresh scan` fails with `matching directory did not
   settle`, both in the working tree and with the HEAD test plus HEAD Workbench
   source copied into a temporary ESM package. No tracked source was reverted
   for that comparison.
2. An ordered full Workbench run stalls with sustained CPU after `classifies
   Zotero item notifications for library read-model invalidation`, before the
   score-note invalidation test finishes. The HEAD test/Workbench pair reproduces
   the same stall. The score-note test passes alone; the remaining group was
   therefore validated separately. Stalled test processes were stopped.
3. `npm run check:synthesis-service-boundary` fails because
   `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reset.rs` opens
   a production root outside `runtime_service.rs`. The same offending calls
   exist in HEAD, and neither the Rust file nor checker was modified.

These limitations were retained rather than expanding the incident repair into
Index test-order debugging or native runtime governance work.
