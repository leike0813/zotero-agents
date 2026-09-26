# Synthesis R9 / Stage 1 acceptance evidence

The active change is `complete-synthesis-r9-stage1-acceptance`. Its decision
uses one pushed source commit and pinned host-built universal XPIs. The two R9b
retirement changes are archived; that fact alone does not complete R9 or Stage 1.
The first candidate was invalidated by the HB-03 source repair. The current
candidate and its outstanding gates are recorded below.

## Evidence joins

| Fact | Existing owner | Acceptance check |
| --- | --- | --- |
| Source, build recipe, Cargo lock and seven archives | prebuild result v4 and immutable set | Rebuild the result and set, check workflow run identity, source SHA, fingerprints, archive digests and seven targets. |
| Linux, Windows and macOS verification | verification result v2 | Revalidate the successful workflow run and its source/build identity. |
| Packaged bytes | one universal XPI per build host | Record each SHA-256; verify each manifest-v3 bundle, exact declared files, hashes, common source/native identity, native-only inventory and size budgets. |
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

The pinned candidate source is pushed commit
`8632cfd537ae9aa3eae9b05da2c907764c932a77` on `dev`. Its governed
seven-platform prebuild is run `36220332872` (successful retry of the Windows
job in the same run), aggregate
`565ebab01a97dd675781c40b82d232632eaab774949171c05c46e133b2c719f7`,
immutable-set commit `7054c0d13f95076f28470e2aef40ad44012fdd24`.
Freshness, the seven-target synchronization, and the existing verification-v2
resolver passed. The native build fingerprint is
`74fc56c1bf04d0dcfd571ba42abbc8fb042d8119a6c0cd88a178e652b88a4f18`.
The Windows-built universal XPI is `.scaffold/build/zotero-agents.xpi`,
SHA-256 `080d2b35d68c42c79f844eb631920059ff219d3cc4b60af8a2f99e07b38856cf`,
56,309,177 compressed bytes. Its package check found all seven manifest-v3
bundles with no missing or forbidden files. Its Windows bundle ID is
`46efcfbd11138e7d6a8bf9f8cd2d47bb2665c3cc022771983ea2acdbaefa3881`;
the Linux bundle ID in the same native set is
`cc5120c507f88d5545f1a1a6bf89330f6422e1e291e3db476f496725e742e36b`.

A clean detached checkout of that source, with `GITHUB_SHA` and `GITHUB_REF`
fixed, ran the acceptance lane against this XPI. Windows Zotero 7.0.32, 9.0.6,
and 10.0.1 passed at
`C:/Users/leike/zr9new/zotero-7-windows-x64-c00d8db6/receipt.json`,
`C:/Users/leike/zr9new/zotero-9-windows-x64-9e863c89/receipt.json`, and
`C:/Users/leike/zr9new/zotero-10-windows-x64-c4447ab6/receipt.json`.
Each receipt has `dirty=false`, the pinned XPI hash, complete cleanup, and a
complete Run Manifest with all 16 records passed. Each installed the bundle
ID and build fingerprint above. The read-only candidate-cell evaluator returns
no reasons for these three cells after correcting the Windows host-platform to
native-target comparison (`windows-x64` → `win32-x64`). The first Zotero 7 run
failed before starting Zotero because the isolated checkout lacked a
`node_modules` junction; its failed receipt is excluded.

The isolated Zotero 7 XPI upgrade smoke at
`C:/Users/leike/zr9upgrade8632/zotero-7-windows-x64-c45b8ebd/receipt.json`
passed with `dirty=false`: it replaced local XPI 0.6.2 with the pinned 0.9.0
XPI and preserved an unrelated profile marker. The candidate-bound installer
rehearsal `.scaffold/r9-installer-cases-8632-receipt.json` replaced a previous
bundle with this bundle, preserved unrelated data and inert legacy lifecycle
files, and rejected corrupt, wrong-platform, and stale assets while retaining
the installed runtime. The candidate-bound real-process receipt
`.scaffold/native-r9-rehearsal-8632-receipt.json` passed authenticated shutdown,
parent EOF, active-handler drain, production-lock rejection with unchanged
repository and owner discovery bytes, and owner release followed by a successful
new lock winner. A forced process death left old discovery; the next lock winner
removed it before publishing its own readiness. The new Windows Phase 1 HB-03
case also passed on these candidate bytes. The same real-process harness then
confirmed a pre-ready launch failure published no discovery and recovered on a
fresh launch, while a forced post-ready death left stale discovery that the
next lock winner cleared. A separate real supervisor rehearsal at
`.scaffold/r9-real-supervisor-8632-receipt.json` used the packaged executable
with actual OS child processes. Three injected pre-ready process deaths used
the configured two-retry budget and produced one `sidecar_crash_loop_fused`
terminal snapshot; no fourth child launched until explicit recovery. Recovery
reached ready, a post-ready forced death restarted successfully, and an
injected missed graceful-stop path caused one forced kill after 507 ms with no
live child. The fault adapter only injects process death and suppresses the
graceful signal in the deadline case; the supervisor and native executable are
the production implementations.

An isolated migration rehearsal used the same packaged executable and a
synthetic foundation-v5 database copied from a read-only source. Receipt
`.scaffold/r9-migration-cases-8632-receipt.json` records a registered v5→v6
migration, verified v5 backup with one durable reference binding, restart on
the v6 database, backup failure, an injected migration transaction failure,
unknown schema variant, and retry after removing the injected fault. Failures
published no ready discovery. The original SQLite and canonical-tree SHA-256
values remained unchanged. The fixture tests the registered schema path; it
does not claim coverage of private user data or every historical schema.
The operator rehearsal receipt `.scaffold/r9-operator-runbook-8632-receipt.json`
records a compatible v6 restart, repair and retry after a failed migration,
forward migration with a verified backup, and a stopped-service restore from
that v5 backup into an isolated copy followed by native startup and a durable
reference-binding check. Network-disabled Zotero installation remains open.

The six-cell read-only decision is `pending`: all three Windows cells passed,
while Linux 7/9/10 receipts for this **same source and native set** are missing.
The older Linux receipts below belong to `a7dd12b5…` and cannot be combined
with these Windows receipts. macOS Zotero 10 XPI smoke has no current receipt;
it remains nonblocking under the matrix policy. R9 and Stage 1 are not complete.

## Previous unpublished candidate (2026-09-26)

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
reasons for either. The clean-source six-cell decision remains `pending`:
the three Linux cells passed, while the three Windows results below are
diagnostic and do not satisfy that gate.

Windows host-built XPI bytes may differ from the Linux XPI by the user's
acceptance choice. The first Windows diagnostic build from the current `dev`
checkout produced `.scaffold/build/zotero-agents.xpi`, SHA-256
`7b96006c8d061956336059aa475814df5bf5fec447a45fe5b1ca142130bc0366`.
Its package check passed all seven manifest-v3 bundles; the selected Windows
bundle ID is `0ec89c17bc4b81471cd29c13520a255718f0e70a868f44e83c75c2a320e1d584`
and build fingerprint is the same `74fc56c1…` as the Linux candidate. The
source checkout is `c1e169bb7afd7154f2b45e3d77bce19a0b22f70b`, which
differs from the pinned prebuild source `a7dd12b5…` by documentation; the
runner worktree also contains an uncommitted Phase 1 test-selection repair.
These receipts are diagnostic and cannot satisfy the clean, same-source gate.

The Windows diagnostic receipts are
`C:/Users/leike/zr9/zotero-7-windows-x64-f04cb083/receipt.json`
(Run Manifest `0152ef99-362a-4dd4-a277-8c2e4736976b`),
`C:/Users/leike/zr9/zotero-9-windows-x64-00585d8c/receipt.json`
(`91f20917-1470-4e4c-b54a-9fad74dd6c61`), and
`C:/Users/leike/zr9/zotero-10-windows-x64-0d1b8d5d/receipt.json`
(`b8043664-9796-4b11-acca-a4eaf654ce9c`). They observed Zotero
7.0.32/9.0.6/10.0.1 respectively. Each receipt passed with complete cleanup;
each Run Manifest completed the 15 Phase 1 cases and foundation, with all 16
records passed. Each installed the Windows XPI digest and bundle ID above.
The first default-path Windows attempt never reached sidecar readiness: its
session `config.json` path reached 263 characters. A short isolated run root
removed that failure. The original acceptance worker also included Phase 2
test file `303`, whose `AC-05` restart failed and reran Phase 1 in the same
attempt. The worker now selects only Phase 1 files `300`–`302` for acceptance;
its focused test and the three diagnostic real-machine cells passed.

A clean detached checkout of `a7dd12b5…` built the Windows host XPI at
`.scaffold/acceptance-a7-stage2/.scaffold/build/zotero-agents.xpi`, SHA-256
`5d80826d256b74963cf0d5cca06fcd9933d2c80285728d54b1aa598f94e07d94`.
Its source and seven native identities match the Linux candidate. A separate
Zotero 7.0.32 Windows XPI-smoke receipt at
`C:/Users/leike/zr9xpi/zotero-7-windows-x64-5fb59370/receipt.json` passed
with `dirty=false`, this XPI digest, active add-on startup and complete cleanup.
The first detached-checkout smoke attempt lacked the explicit source ref and
was recorded as `unknown/dirty`; only the second receipt is counted. The
smoke verifies local-file installation on an isolated profile, but does not
establish a network-disabled offline case or a full XPI upgrade.

The existing XPI-smoke runner now has an opt-in old-XPI upgrade path. On an
isolated Zotero 7.0.32 Windows profile, it installed the local 0.6.2 XPI,
then replaced it with the pinned 0.9.0 Windows XPI and preserved an unrelated
profile file. Receipt
`C:/Users/leike/zr9upgrade/zotero-7-windows-x64-b51255d4/receipt.json`
passed and cleaned up; its runner log records both installed versions. The
runner source had uncommitted test changes (`dirty=true`), so this is a
diagnostic upgrade rehearsal and not a clean candidate-bound 4.2 receipt.

A separate isolated installer rehearsal read the exact Linux assets from the
pinned XPI. It installed the previous tracked bundle
`915268be3470df48f1aee9d9d9baf3878957affd2364fe855e52ee01f28a53b2`,
then replaced it with the candidate bundle while preserving unrelated data and
inert legacy lifecycle files. Installation used only local XPI bytes. Corrupt
executable bytes and a Windows manifest supplied to the Linux installer were
both rejected; the already installed candidate remained ready. This covers
bundle-level upgrade and fail-closed behavior, but does not establish a full
Zotero XPI upgrade or the remaining migration and operator runbook cases.

The Windows candidate-specific installer receipt at
`.scaffold/r9-installer-cases-receipt.json` records offline reads from the
pinned `5d80826d…` XPI into a fresh isolated runtime root. Corrupt executable
bytes and a wrong-platform manifest were rejected before replacing `current`.
The previous actual Windows bundle (`aa8f7a2b…`, build fingerprint `565beec4…`)
failed the governed freshness preflight with `build_fingerprint_mismatch`.
After each rejection, the installed candidate bundle remained unchanged;
unrelated profile data and inert legacy lifecycle files retained their bytes.
The installed executable then passed the production durable smoke: two read
canaries, four compute operations, authenticated shutdown and reopened
repository. This completes the corrupt/stale/wrong-platform fail-closed gate.
The local asset reader does not establish network-disabled Zotero installation.

An isolated native-process rehearsal used the packaged Linux executable whose
SHA-256 is `d8285bdb49085f3d6435fc920118a183eee64cefc9b14053f766c9d23494ece6`.
It passed authenticated handshake, shutdown response followed by process exit,
parent-input EOF exit, and discovery removal. A second process targeting the
same repository exited with `production_lock_conflict`, published no discovery,
and left the database hash unchanged while the first owner remained responsive.
After that owner stopped, a new owner acquired the lock and passed handshake.
The rehearsal does not cover active-handler drain, the complete crash/fuse
matrix, or stopped-service restore.

The packaged Windows executable (`861a7bc132a2feaef8d87bbbb3cc25e032494239e4c7ce0b111ff05d2f38c865`)
also passed an isolated native-process rehearsal bound to the Windows XPI
`5d80826d256b74963cf0d5cca06fcd9933d2c80285728d54b1aa598f94e07d94`.
Its local receipt is `.scaffold/native-r9-rehearsal-receipt.json`.
Authenticated shutdown flushed a successful response, removed discovery, and
exited 0 in 156 ms; parent-input EOF removed discovery and exited 0 in 152 ms.
With an active, incomplete HTTP request, shutdown flushed its response, closed
the socket, removed discovery, and exited 0 in 253 ms (15 ms after the
shutdown response). A subsequent Windows process query found no remaining
`synthesis-sidecar.exe`. The rehearsal used new short profile roots and a
loopback reverse host; no network download was required. The packaged-binary
durable smoke also passed two representative read canaries, four compute
operations, graceful shutdown, and a reopened production repository. Together
these results satisfy the real-process shutdown/EOF/drain gate. They do not
cover a fuse, migration, or operator restore.

The acceptance decision remains `pending`. The open blocking work is clean,
same-source Windows real-machine receipts; complete isolated clean/offline and Zotero
XPI-upgrade cases; registered migration success and
failure cases with original-source hash preservation; the complete crash/fuse
matrix, and operator-runbook rehearsals. Rust native
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
