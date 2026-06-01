## 1. Performance and Drift

- [x] 1.1 Add or verify indexes for basis, related sync, discovery, dirty event, job, and identity lookup paths.
- [x] 1.2 Implement bounded drift incident rows or debug summaries for bulk/structural drift.
- [x] 1.3 Add performance acceptance coverage for representative 1k/10k synthetic datasets or existing scalable fixtures.

## 2. Verification

- [x] 2.1 Run focused performance/drift tests.
- [x] 2.2 Run `npm run test:node:core`, `npm run build`, and `npm run lint:check`.
- [x] 2.3 Run `openspec validate add-synthesis-performance-and-drift-acceptance --strict`.

Note: `npm run lint:check` remains blocked by existing repository-wide Prettier debt outside the touched Synthesis files; touched-file Prettier check passes.
