# Synthesis R9 / Stage 1 acceptance evidence

The active change is `complete-synthesis-r9-stage1-acceptance`. Its decision
uses one pushed source commit and one unpublished universal XPI. The two R9b
retirement changes are archived; that fact alone does not complete R9 or Stage 1.

## Evidence joins

| Fact | Existing owner | Acceptance check |
| --- | --- | --- |
| Source, build recipe, Cargo lock and seven archives | prebuild result v4 and immutable set | Rebuild the result and set, check workflow run identity, source SHA, fingerprints, archive digests and seven targets. |
| Linux, Windows and macOS verification | verification result v2 | Revalidate the successful workflow run and its source/build identity. |
| Packaged bytes | one universal XPI | Record its SHA-256; verify each manifest-v3 bundle, exact declared files, hashes, common build identity, native-only inventory and size budgets. |
| Zotero behavior | compatibility receipt v1, Run Manifest v1 and sidecar-runtime-evidence v1 | Join the receipt's XPI digest and source SHA to the candidate; join the installed bundle ID to the manifest inside that XPI; require all 15 Phase 1 cases, cleanup and health. |
| Upgrade, migration and lifecycle failures | isolated profile/process case receipts | Record exact candidate identity, outcome, original-source hashes and cleanup; unit or source-shape results are diagnostic evidence only. |

`scripts/system-e2e/acceptance.ts` reads the candidate XPI and evaluates one
compatibility cell or the current release plan. Missing blocking cells are
pending; mismatched or failed cells are failed. The existing compatibility
receipt already contains the XPI digest, while sidecar runtime evidence
contains the installed bundle ID and build fingerprint. No second release-set
format is needed for this join. Remote workflow trust and the remaining case
receipts still need verification before a final acceptance decision.

The current local package check passes the seven manifest/file integrity and
100 MiB XPI checks, and the native process lifecycle test passes its ten
cases. These are diagnostic checks on locally built bytes. The freshness
checker reports `build_fingerprint_mismatch` for all seven packaged targets,
so this XPI is not an acceptance candidate. No blocking compatibility cell or
upgrade/migration rehearsal is marked passed by these local checks.

## Environment and data boundaries

`tests/zotero/compatibility-matrix.json` and the release plan define six
blocking Phase 1 cells: Zotero 7, 9 and 10 on Linux x64 and Windows x64.
Zotero 10 macOS XPI-smoke cells retain their nonblocking policy. The matrix's
exact host versions apply; a different local patch release is supplementary.
Ordinary source-built System E2E evidence cannot replace a run proven to
install the pinned XPI digest and its selected bundle.

The existing System E2E runner owns fresh copied profiles, run layouts,
process and port cleanup, Run Manifests and sanitized runtime evidence.
Existing-data and legacy rehearsals read their sources only through read-only
snapshots and mutate isolated copies. Evidence may include source/build
identities, hashes, counts, status codes and workspace-relative references;
it excludes titles, authors, document text, tokens and local source paths.
The committed seed and synthetic migration fixtures are available without a
private LiSongTao source. Any private gold run requires separately supplied
read-only data and profile roots.

Remote prebuild dispatch and controlled real-machine runs remain pending until
a pushed candidate and their execution authority exist. The governed prebuild
may write its immutable content-addressed set and workflows may upload
run-scoped evidence. Acceptance does not create a release tag or asset,
advance a feed or production pointer, or synchronize Gitee.
