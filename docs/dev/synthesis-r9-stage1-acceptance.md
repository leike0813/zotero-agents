# Synthesis R9 / Stage 1 acceptance evidence

The active change is `complete-synthesis-r9-stage1-acceptance`. Its decision
uses one pushed source commit and one unpublished universal XPI. The two R9b
retirement changes are archived; that fact alone does not complete R9 or Stage 1.
The first candidate was invalidated by the HB-03 source repair. A replacement
source commit, seven-platform build, and XPI are now fixed below; real-machine
and data-safety results remain pending.

## Evidence joins

| Fact | Existing owner | Acceptance check |
| --- | --- | --- |
| Source, build recipe, Cargo lock and seven archives | prebuild result v4 and immutable set | Rebuild the result and set, check workflow run identity, source SHA, fingerprints, archive digests and seven targets. |
| Linux, Windows and macOS verification | verification result v2 | Revalidate the successful workflow run and its source/build identity. |
| Packaged bytes | one universal XPI | Record its SHA-256; verify each manifest-v3 bundle, exact declared files, hashes, common build identity, native-only inventory and size budgets. |
| Zotero behavior | compatibility receipt v1, Run Manifest v1 and sidecar-runtime-evidence v1 | Join the receipt's XPI digest and source SHA to the candidate; join the installed bundle ID to the manifest inside that XPI; require all 15 Phase 1 cases, cleanup and health. |
| Upgrade, migration and lifecycle failures | isolated profile/process case receipts | Record exact candidate identity, outcome, original-source hashes and cleanup; unit or source-shape results are diagnostic evidence only. |

`scripts/system-e2e/acceptance.ts` reads the candidate XPI and evaluates one
compatibility cell or the six-cell acceptance plan. Missing blocking cells are
pending; mismatched or failed cells are failed. The existing compatibility
receipt already contains the XPI digest, while sidecar runtime evidence
contains the installed bundle ID and build fingerprint. No second release-set
format is needed for this join. Remote workflow trust and the remaining case
receipts still need verification before a final acceptance decision.

## Current unpublished candidate (2026-09-26)

- Pushed source: `a7dd12b5980373ca204c91433e474e21bc262b23` on `dev`.
  The two R9b retirement changes are archived; the blocking compatibility
  matrix revision remains
  `c8c75de3106d5348d66dba6313fecde91bf060098592133d0c17508a02ec87ab`.
- Source/build fingerprints:
  `77170f86e6bb188742f1ff8e710338ffd2130fcb8993a1129ab924641457859b` /
  `74fc56c1bf04d0dcfd571ba42abbc8fb042d8119a6c0cd88a178e652b88a4f18`.
  Rust toolchain is `nightly-2026-07-25`; Cargo lock SHA-256 remains
  `5c891779150a6771ddb9eeca779411b50a43dd3ab7c8e669cd0ffc6e0745fa5f`.
- Trusted prebuild v4: run `36211055224`, aggregate
  `3ec157d3b1665289d0eb34f9cfd46417f430fe983e2ac1c8430d449905ed9c11`,
  exact immutable-set commit `49d4deeb99649727b2953cc5ff3a9ae8e158a176`,
  pipeline revision
  `bfce80f74ed638d48f252945bd939fa2dbced46c1882955b3b39592660ca0234`.
  All seven targets and their smoke evidence passed. The governed command
  atomically synchronized seven roots and reported freshness without diagnostics.
  Compressed archives total 23,519,023 bytes; each is below 15 MiB.
- Matching trusted verification v2: run `36210862555` from source commit
  `21d0a03550bec6fef82be2491322175c49d09088`. The governed resolver
  reported `eligible` for the current source/build/verification fingerprints;
  the verification run's commit differs because the later commit changed only
  prebuild cache API output projection.
- Unpublished universal XPI: `.scaffold/build/zotero-agents.xpi`, SHA-256
  `c94c23df7d1a25e9863f682fcb9c1b7f5324cdb482f8c106bec2e270d2ecc1d4`,
  56,309,181 compressed bytes. The XPI check passed exact seven-target inventory
  and file hashes with no missing or forbidden runtime files. The 100 MiB
  compressed budget passed. The Cargo-lock-matched `licenses.json` check found
  71 licensed packages and one bundled component. Native smoke covers the
  launch/handshake signature states for this unpublished candidate.

The acceptance runner uses a clean checkout of this same pushed commit with
the fixed XPI as an explicit build-root input. The materialized binaries in
the main worktree are dirty because they are delivered from the immutable set;
they are never treated as a clean-source test receipt. The acceptance invocation
sets `GITHUB_SHA` to the checked-out, pushed commit so the Run Manifest records
the same source identity as the compatibility receipt.

Zotero 7 Linux 7.0.32 passed in receipt
`/tmp/zotero-agents-compat/zotero-7-linux-x64-5a418ae4/receipt.json` and
Run Manifest `70a3d8f3-6e1a-492d-b418-2214f3f5d50e`: all 15 Phase 1 cases,
including HB-03, passed once each; cleanup and health passed. The read-only
candidate-cell evaluator returned no reasons. Its installed XPI SHA-256 is
`c94c23df7d1a25e9863f682fcb9c1b7f5324cdb482f8c106bec2e270d2ecc1d4`;
the installed Linux bundle ID is
`2a9b4b6ab1d132b8e780b8082fb5b4bd743a3d67da8acf761120361096df1c30`,
matching the pinned XPI.

Zotero 9 Linux 9.0.6 passed with receipt
`/tmp/zotero-agents-compat/zotero-9-linux-x64-6f2a9fdd/receipt.json` and
Run Manifest `83d02107-5067-4ab5-99b0-0d31a08977e4`. Zotero 10 Linux
10.0.1 passed with receipt
`/tmp/zotero-agents-compat/zotero-10-linux-x64-9b392685/receipt.json` and
Run Manifest `23006745-a4c7-4ebe-8056-907eac2a3b8b`. Each had all 15
Phase 1 cases once, complete cleanup and health, the pinned XPI digest, and
the same installed Linux bundle ID. The candidate-cell evaluator returned no
reasons for either. The read-only six-cell matrix decision is `pending`: the
three Linux cells passed and Zotero 7/9/10 Windows x64 each have `missing`.
The Windows machine is currently unavailable for remote execution; no Windows
result is inferred from the Linux or native smoke evidence.

A separate isolated installer rehearsal read the exact Linux assets from the
pinned XPI. It installed the previous tracked bundle
`915268be3470df48f1aee9d9d9baf3878957affd2364fe855e52ee01f28a53b2`,
then replaced it with the candidate bundle while preserving unrelated data and
inert legacy lifecycle files. Installation used only local XPI bytes. Corrupt
executable bytes and a Windows manifest supplied to the Linux installer were
both rejected; the already installed candidate remained ready. This covers
bundle-level upgrade and fail-closed behavior, but does not establish a full
Zotero XPI upgrade, the stale-bundle case, or the remaining migration and
operator runbook cases.

The acceptance decision remains `pending`. The open blocking work is the
three Windows real-machine cells; complete isolated clean/offline and Zotero
XPI-upgrade cases; stale-bundle recovery; registered migration success and
failure cases with original-source hash preservation; and packaged-executable
EOF, crash/fuse, lock-conflict, and operator-runbook rehearsals. Rust native
process tests and the Linux Phase 1 lifecycle cases are diagnostic or partial
evidence for those broader gates. No R9 or Stage 1 completion claim is made.

## Earlier candidate, invalidated by the HB-03 repair (2026-09-26)

- Pushed source: `9aaad221dbe4538d525de1c378985e81ac31cbcd` on `dev`.
  Both R9b retirement changes are archived. The matrix revision is
  `c8c75de3106d5348d66dba6313fecde91bf060098592133d0c17508a02ec87ab`.
- Governed source/build fingerprints:
  `84389be1c9394b924c22e3617f16ce79d5a6ca856bc6aeb483d9dc3095cac4bf` /
  `565beec42ee679a70da74d6416be53f73bca8cb67ece3f8b47bab12ac3ff1c5e`.
  Rust toolchain is `nightly-2026-07-25`; Cargo lock SHA-256 is
  `5c891779150a6771ddb9eeca779411b50a43dd3ab7c8e669cd0ffc6e0745fa5f`.
- Trusted prebuild v4: run `36154842506`, aggregate
  `ff4b3511b3dcb311ab9776ac6a535fddc9e413b14aa5425db01f411902ac5f4e`,
  exact set commit `97e244e062903689928db3ce8d9f1874731f3705`, producer revision
  `15b05581844ac4c769a09dd921aae41d24bc9d7a78edc47cc0404a6e2976c41d`.
  The downloaded result and remote set validate; all seven local bundle roots
  compare byte-for-byte with a separate transactional synchronization of that
  set. Their archives total 23,515,035 bytes; each is below 15 MiB.
- Trusted verification v2: run `36154729112`, Linux/Windows/macOS passed,
  producer revision
  `a89a32cc576fb2aff7b08bfdec1429eacb4f7d7a44b1f50def962da0b880313a`.
- Unpublished universal XPI: `.scaffold/build/zotero-agents.xpi`, SHA-256
  `1ea20457283c64a314dc809cf047337edf93f82084c71493a14b39157478619f`,
  56,303,471 compressed bytes. Its seven manifest-v3 bundle IDs, declared file
  hashes and inventory pass the package check; freshness passes. No forbidden
  Node/npm service tree, D3 runtime or implementation selector was found.

The unpublished-candidate gate uses the Cargo-lock-matched `licenses.json`
inventory and native smoke/handshake platform-signature status. It does not
claim a separate SBOM receipt or signed release binaries. Manifest v3 has no
platform-signature field; the native handshake reports `unsigned-candidate` on
Windows/macOS and `not-applicable` on Linux. This evidence matched the first
candidate, but the HB-03 repair changes source bytes and requires a new
seven-platform prebuild, matching verification, XPI, and recheck of task 2.3.
No installation, migration or real-machine cell is counted merely from build
and package checks.

The first local `acceptance`-lane Zotero 7 Linux cell has receipt
`zotero-7-linux-x64-f3e706cb` and Run Manifest
`efd3cbc9-e86a-4898-ba27-37e7b9663222`. Zotero observed version 7.0.32;
the XPI install/start check passed and installed sidecar evidence matched the
pinned Linux bundle ID and build fingerprint. The cell failed at HB-03 after a
forced owner restart: family cleanup passed, health was indeterminate, and
stale ready discovery files remained for exited processes. Its receipt is
`failed`, so this cell and the other five required cells remain open. The
working tree was dirty from the prepared native bundles and acceptance tooling;
the receipt records that fact and cannot be promoted to a clean-source result.
The read-only matrix evaluator reports this cell as `failed`
(`cell_not_passed`, `source_mismatch`, `run_incomplete`) and the other five as
`pending` (`missing`). R9 and Stage 1 completion is therefore unclaimed.
The HB-03 repair is now in scope. The earlier prebuild/XPI identity remains a
diagnostic baseline only; it cannot satisfy acceptance after the source edit.
Local Rust validation passed 102 library tests and all 10 native process
integration tests, including removal of an older session before readiness and
preservation of a live lock owner's session. The freshness check now reports
`build_fingerprint_mismatch` on all seven old bundles, as expected. HB-03 has
not yet been rerun on a rebuilt universal XPI.

Separate local Linux XPI-smoke receipts passed for Zotero 7.0.32
(`zotero-7-linux-x64-24d8c9e7`), 9.0.6
(`zotero-9-linux-x64-98f0caa4`), and 10.0.1
(`zotero-10-linux-x64-dd788eec`). All three installed the same XPI digest
above and completed cleanup. They are installation diagnostics; the receipts
record the dirty working tree and do not satisfy Phase 1 or Windows cells.

## Environment and data boundaries

`tests/zotero/compatibility-matrix.json` and the acceptance plan define six
blocking Phase 1 cells: Zotero 7, 9 and 10 on Linux x64 and Windows x64.
Zotero 10 macOS XPI-smoke cells retain their nonblocking policy. The matrix's
exact host versions apply; a different local patch release is supplementary.
The `acceptance` lane uses these six targets with the fixed unpublished XPI.
It leaves the tag-bound `release` lane intact. Its worker first replaces the
temporary directory add-on with the pinned XPI, then runs the Phase 1 catalog
on that installation. Ordinary source-built System E2E evidence cannot
replace a run proven to install the pinned XPI digest and selected bundle.

The existing System E2E runner owns fresh copied profiles, run layouts,
process and port cleanup, Run Manifests and sanitized runtime evidence.
Existing-data and legacy rehearsals read their sources only through read-only
snapshots and mutate isolated copies. Evidence may include source/build
identities, hashes, counts, status codes and workspace-relative references;
it excludes titles, authors, document text, tokens and local source paths.
The committed seed and synthetic migration fixtures are available without a
private LiSongTao source. Any private gold run requires separately supplied
read-only data and profile roots.

The governed prebuild wrote its immutable content-addressed set and workflows
uploaded run-scoped evidence. Acceptance does not create a release tag or
asset, advance a feed or production pointer, or synchronize Gitee.
