## 1. Tests

- [x] 1.1 Add failing tests for grouped lifecycle/reset/notification adapter behavior and bounded echo receipts.
- [x] 1.2 Add dependency guards proving hooks, Host Bridge server, and item observer no longer access the full service.

## 2. Contracts and Adapter

- [x] 2.1 Add JSON-safe system, maintenance, and notification capability contracts.
- [x] 2.2 Extend the narrow in-process port and normalize legacy echo rows to bounded receipts.
- [x] 2.3 Add synchronous default-client invalidation without eager legacy service loading.

## 3. Consumer Migration

- [x] 3.1 Migrate startup reconcile, protected reset, and preference invalidation in hooks.
- [x] 3.2 Migrate Host Bridge server invalidation.
- [x] 3.3 Migrate item observer injection and echo classification to the notification client.
- [x] 3.4 Update the migration inventory and current-state documentation.

## 4. Validation

- [x] 4.1 Run contracts/root typechecks, targeted tests, boundary/invariant checks, formatting/lint, and production build.
- [x] 4.2 Run `openspec validate` and verify completeness, requirement coverage, and design coherence.
