## 1. ACP Skills Runtime Selection Tests

- [x] 1.1 Replace the live-current-over-run regression test with submitted-selection, direct-reply, explicit-edit, and run-to-composer continuity coverage.
- [x] 1.2 Extend initial/recovery and backend-registry tests for absent-selection fallback and `reasoningSource` preservation.

## 2. ACP Skills Runtime Selection Implementation

- [x] 2.1 Split shared runtime option normalization into catalog metadata and run-owned selection without writable per-run `current*` snapshots.
- [x] 2.2 Normalize submitted selections once, persist them immediately, and remove long-lived frozen/result/Host Bridge runtime-option plumbing.
- [x] 2.3 Reuse one latest-run transport applicator for initial execution and recovery; keep ordinary replies setter-free.
- [x] 2.4 Make waiting-user setters atomically update only persisted run fields after remote success and preserve reasoning provenance on cache reload.

## 3. Transcript Integrity Tests

- [x] 3.1 Add shared Chat/Skills renderer coverage for tail plus older pages, terminal patches, keyed spacer order/heights, stable anchors, and stale bottom-stick callbacks.
- [x] 3.2 Add publication coordinator coverage for canonical live-tail isolation, out-of-order page responses, and owner-scoped loading/empty state.

## 4. Transcript Integrity Implementation

- [x] 4.1 Reconcile virtual transcript pages by same/overlapping range and preserve all non-overlapping cached pages.
- [x] 4.2 Reconcile keyed rows and spacers with stable anchor restoration and owner/generation/scroll-away guarded bottom following.
- [x] 4.3 Separate publication canonical live-tail mutation state from page response cache and owner-scope loading/empty signatures.

## 5. Cleanup And Verification

- [x] 5.1 Remove obsolete snapshot conversion helpers, frozen selection propagation, response echo, and discarded Host Bridge runtime fields.
- [x] 5.2 Run focused 96/97/107/111/184 tests, TypeScript no-emit, targeted ESLint/Prettier checks, and strict OpenSpec validation.
- [x] 5.3 Record Zotero 7/9 manual smoke and adapter wire-audit status, including any environment limitation.

## Verification Notes

- The adapter wire audit is covered by the three-turn interactive regression: observed prompt models are `medium`, `medium`, then explicitly selected `high`; model setters occur only for initial `medium` and the explicit `high` edit.
- Zotero 7 and Zotero 9 manual smoke was not run because this environment does not provide either interactive Zotero host. Automated Node/Zotero-mock coverage and static gates passed; real-host smoke remains a release-time validation step.
