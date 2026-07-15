## Why

Synthesis library and artifact reads now cross an environment-neutral Host port, but Related Items writes still cross a private function-valued adapter defined inside `service.ts`. Production falls back to direct Zotero object access, and successful Host writes are recorded as pending only after mutation. This blocks a future Node application owner and leaves a crash window with no durable intended effect.

## What Changes

- Add a bounded, JSON-safe Related Items Host effect contract with stable item refs, semantic ensure-present/ensure-absent plans, and per-effect receipts.
- Add a Zotero adapter that validates a whole batch before Host access and applies each relation idempotently.
- Persist deterministic pending effects before each Host batch, reconcile receipts afterward, and retain pending state on transport failure for explicit retry.
- Preserve Synthesis-created versus user-existing provenance, notifier echo classification, revoke safety, operation progress, and graph/reference fallback behavior.
- Move production Host adapter injection into the single legacy composition root and remove Related Items Zotero access and function-valued overrides from the service.
- Preserve the 128-method public service surface and its single complete-service consumer.

## Capabilities

### New Capabilities

- `synthesis-host-related-items-effect-port`: Defines bounded Related Items effect plans, strict Host validation, idempotent Zotero mutation receipts, durable pending-before-Host ordering, and safe retry/provenance behavior.

### Modified Capabilities

None.

## Impact

The change affects shared contracts, a new Zotero Host adapter, Related Items application orchestration, default composition, repository effect transitions, tests, and current-state Synthesis documentation. It does not migrate Topic mirror or staged-tag writes, add a process or transport, change database schema, add public client methods, or change the 128-method inventory.
