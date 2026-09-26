# Synthesis R9 / Stage 1 acceptance evidence

The active change is `complete-synthesis-r9-stage1-acceptance`. Its decision
uses one pushed source commit and one unpublished universal XPI. The two R9b
retirement changes are archived; that fact alone does not complete R9 or Stage 1.
The first candidate is invalidated by the HB-03 source repair; a replacement
source commit, seven-platform build, and XPI are still pending.

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
