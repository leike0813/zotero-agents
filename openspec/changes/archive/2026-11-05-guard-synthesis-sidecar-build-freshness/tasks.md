# Tasks

## 1. Source patch

- [x] 1.1 Add red/green coverage for an ordinary build: verify a missing, stale, damaged, or fingerprint-mismatched runtime stops before help-document generation and XPI packaging, while all seven fresh bundles allow the next step; verify the focused tests and existing Synthesis runtime fixture suite pass.
- [x] 1.2 Prepend the existing `npm run check:synthesis-sidecar-runtime-freshness` command to the ordinary `build` script and verify a failing freshness fixture exits nonzero before downstream commands while a passing fixture reaches the next build step.
- [x] 1.3 Add the ordinary-build gate sentence to `AGENTS.md`; verify `openspec validate guard-synthesis-sidecar-build-freshness --strict` and Prettier checks for `AGENTS.md` and this change directory pass.

## 2. Delivery verification

- [x] 2.1 After the concrete source patch is reviewed and committed and pushed under explicit authorization, record the exact commit SHA and verify the remote branch contains it.
- [x] 2.2 Prebuild the Synthesis sidecar for all seven platforms from that exact pushed SHA, synchronize the result, and verify `npm run check:synthesis-sidecar-runtime-freshness` reports all seven bundles fresh with the expected fingerprint.
- [x] 2.3 Run the complete build preflight followed by `npm run build`; verify freshness runs first, no native artifact is downloaded automatically, and the existing build chain produces the final universal XPI only after all seven bundles pass.
- [x] 2.4 Extract the Synthesis runtime from the final XPI and run the seven-platform XPI freshness checker; verify every embedded bundle has the expected fingerprint and passes the checker.
- [x] 2.5 Use the extracted Windows runtime copy to start the sidecar twice consecutively; after each start verify HTTP 200 and `ready`, read seven topics, and confirm the 230 canonical files remain unchanged.

## Verification record

- Before the script change, both new ordinary-build cases failed: the generation probe ran without a freshness probe.
- `npm exec --no -- tsx node_modules/mocha/bin/mocha tests/synthesis/193-synthesis-sidecar-runtime-packaging.test.ts --require tests/setup/zotero-mock.ts --timeout 120000 --exit`: 19 passing, including stale fingerprint, damaged executable, and missing manifest fixtures.
- `npm exec --no -- eslint tests/synthesis/193-synthesis-sidecar-runtime-packaging.test.ts`: passed.
- Prettier, `git diff --check`, and strict OpenSpec validation: passed.
- Negative acceptance: `npm run build` exited 1 at the initial freshness check against the existing seven stale bundles. That attempt did not regenerate the existing XPI.
- Authorized source commit: `33d44e1727ddf3b2de3654de8c350854e8ecbbe5`; `git ls-remote origin refs/heads/dev` confirmed the same SHA after push.
- Seven-platform prebuild: [run 41984414974](https://github.com/leike0813/zotero-agents/actions/runs/41984414974), request `ssdp-b121ab40-16b9-442f-bbfc-f73366e256cf`, aggregate `15afb1683d2c4c1c5ad9562a11ae17a8072c30bcd015a33fab0c9e743378dea2`, exact prebuild commit `7bf44357659c96a39c7b7b0731b9a88812a7c189`. Transactional synchronization and all-seven freshness passed with build fingerprint `55723d76f7f39309cfb450b2a0597f13bd1301c17fa2456bc4af4980a88b5272`. Formal release verification is separately blocked because no matching receipt exists.
- Other preflight checks passed: Host Bridge CLI freshness/governance/content/doc sync, aligned built-in Skill submodules and contracts, canonical validators, workflow manifest, ACP bridge freshness, and Content Package release verification for the `dev` channel. The content package contained 428 files and matched ZIP SHA-256 `05c7be7c5bc78e6b59a7ddb37282f13ea3546476023fe2466be8e23f003bca15`.
- Positive acceptance: the complete `npm run build` exited 0 after all-seven freshness passed. Shared-package, plugin, and page TypeScript checks passed. `npm run check:help-docs` verified 504 documents and 53 assets; `npm run check:synthesis-sidecar-runtime-xpi` found no missing or forbidden entries.
- Final artifact: `.scaffold/build/zotero-agents.xpi`, 61,636,883 bytes, SHA-256 `efa9dd9a9d5912b3950b64141118a6d04f8bd29d5feeb30365e4cc762aeda0db`. All seven bundles extracted from these exact XPI bytes passed the existing freshness checker using its `--asset-root` option.
- Packaged Windows runtime: bundle `94810e1d1eb2b88321965518e3babffa95209a11952c5f39dbca26d9a4280491`, executable SHA-256 `34b9ca7b841032d15505cd021917bd80bc9e8dca9e18ff313a848bc2541dbce3`. The production-route harness used a byte-identical extracted executable via an isolated `CARGO_TARGET_DIR`; both consecutive runs returned HTTP 200 / `ready`, read the current contents of all seven Topics, and preserved all 230 canonical files byte-for-byte, including the conflicting historical snapshot.
- No real Zotero instance was restarted or modified. Its installed XPI remained at SHA-256 `d23542599627c91ecf2169656c4ed6d69dba753bd4456e36aacec241abce757d`. No release was published. The synchronized seven-platform bundle updates are committed together with this change's finalization.
