## 1. OpenSpec contract

- [x] 1.1 Create and validate the repair change under strict OpenSpec rules.
- [x] 1.2 Remove stale discovery accept wording from active Synthesis specs.
- [x] 1.3 Normalize touched active Synthesis spec structure needed for strict validation.

## 2. Related-items validation and scheduling

- [x] 2.1 Relax Registry candidate validation for stale applied Synthesis-created effects while keeping pending external writes blocking.
- [x] 2.2 Queue `related_items_sync_dirty` after successful full Registry rebuild promotion when related sync may be needed.
- [x] 2.3 Preserve idempotent related-items worker revocation using durable source/target Zotero keys.

## 3. Echo, identity, and docs

- [x] 3.1 Route notifier related target keys into durable echo suppression when available.
- [x] 3.2 Clarify ISBN convergence and DOI/arXiv dedupe-review policy in specs/docs.
- [x] 3.3 Document item-level echo fallback risk.

## 4. Tests and verification

- [x] 4.1 Extend focused tests for stale applied effect revocation, pending effect blocking, full rebuild scheduling, discovery reject-only contract, ISBN/DOI policy, and pair-specific echo suppression.
- [x] 4.2 Run focused Synthesis tests plus strict OpenSpec validation, TypeScript/build checks, touched-file Prettier check, and core-suite baseline rerun.

Note: Full-repository `npm run lint:check` still fails on existing Prettier debt outside this change; touched-file Prettier check passes.
