## 1. Red Tests

- [x] 1.1 Add Related Items Host contract/adapter tests for JSON safety, batch bounds, duplicate IDs, invalid-before-Zotero, idempotent ensure actions, missing items, save failures, and canonical receipts.
- [x] 1.2 Update Related Items service tests for pending-before-Host, mixed receipts, transport failure, deterministic retry, user-existing provenance, revoke guard, and echo-before-receipt preservation.
- [x] 1.3 Update composition and boundary tests to require default Host effect injection, forbid service Zotero fallback/function overrides, and preserve 128 methods / 1 direct consumer.

## 2. Host Effect Contract and Adapter

- [x] 2.1 Add environment-neutral Related Items effect plan, receipt, batch, permission, and port contracts with a fifty-effect cap.
- [x] 2.2 Implement strict canonical request rebuilding and the idempotent Zotero Related Items effect adapter.
- [x] 2.3 Inject the production adapter from legacy composition while leaving readonly composition write-disabled.

## 3. Durable Service Orchestration

- [x] 3.1 Replace `RelatedItemsSyncHost` and the default Zotero fallback with the injected Host effect port and twenty-five-effect dispatch batches.
- [x] 3.2 Persist pending plans before Host IO and reconcile complete, mixed, malformed, and transport-failed batches without repository transactions around Host calls.
- [x] 3.3 Preserve deterministic retry provenance, Synthesis-only revoke authorization, operation/progress behavior, and observer echo races.

## 4. Documentation and Validation

- [x] 4.1 Update active runtime, persistence, sequence, and boundary documentation for receipt-based Related Items effects and deferred mirror/tag writes.
- [x] 4.2 Run focused Core 125, 130, 143, 152, 158, 168, 175, 176, 179 and Synthesis invariants.
- [x] 4.3 Run contracts/root TypeScript, service-boundary, targeted Prettier/ESLint, `git diff --check`, production build, and strict OpenSpec validation without archiving, committing, publishing, or touching the known stale Host Bridge release manifest.
