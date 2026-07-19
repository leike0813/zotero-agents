## 1. Contract and Regression Tests

- [x] 1.1 Add v2 Product record, fixed-width storage, immutable update, collision, concurrency, and failure-policy tests.
- [x] 1.2 Add startup migration and v2 integrity-scanner tests.
- [x] 1.3 Add Host Bridge logical read/export and Dashboard export-action tests.
- [x] 1.4 Add a Research Bundle regression using a long nested image Product path.

## 2. Unified Product Store

- [x] 2.1 Replace the persisted Product model and workflow-facing API with strict v2 logical records and bounded receipts.
- [x] 2.2 Implement derived opaque object paths, immutable revisions, per-Product serialization, and atomic DB publication.
- [x] 2.3 Centralize asset resolution, preview, directory export, and ZIP entry projection.

## 3. Migration and Persistence Governance

- [x] 3.1 Implement retryable one-time v1-to-v2 migration and startup readiness gating.
- [x] 3.2 Update integrity scanning and orphan detection for derived v2 paths and legacy residue.

## 4. Consumers

- [x] 4.1 Update Host Bridge DTOs, selectors, errors, and exports to use the centralized Product services.
- [x] 4.2 Replace Dashboard Open Folder with directory export and update localized labels.
- [x] 4.3 Update built-in workflows and Skill feedback to consume the new registration receipt.

## 5. Validation

- [x] 5.1 Run targeted Product Storage, Runtime Persistence, Host Bridge, Dashboard, and Research Bundle tests plus TypeScript checking.
- [x] 5.2 Run changed-file formatting, lint, strict OpenSpec validation, and `git diff --check`.
