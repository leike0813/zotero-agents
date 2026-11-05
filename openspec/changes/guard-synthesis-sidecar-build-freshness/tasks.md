# Tasks

## 1. Source patch

- [x] 1.1 Add red/green coverage for an ordinary build: verify a missing, stale, damaged, or fingerprint-mismatched runtime stops before help-document generation and XPI packaging, while all seven fresh bundles allow the next step; verify the focused tests and existing Synthesis runtime fixture suite pass.
- [x] 1.2 Prepend the existing `npm run check:synthesis-sidecar-runtime-freshness` command to the ordinary `build` script and verify a failing freshness fixture exits nonzero before downstream commands while a passing fixture reaches the next build step.
- [x] 1.3 Add the ordinary-build gate sentence to `AGENTS.md`; verify `openspec validate guard-synthesis-sidecar-build-freshness --strict` and Prettier checks for `AGENTS.md` and this change directory pass.

## 2. Delivery verification

- [ ] 2.1 After the concrete source patch is reviewed and committed and pushed under explicit authorization, record the exact commit SHA and verify the remote branch contains it.
- [ ] 2.2 Prebuild the Synthesis sidecar for all seven platforms from that exact pushed SHA, synchronize the result, and verify `npm run check:synthesis-sidecar-runtime-freshness` reports all seven bundles fresh with the expected fingerprint.
- [ ] 2.3 Run the complete build preflight followed by `npm run build`; verify freshness runs first, no native artifact is downloaded automatically, and the existing build chain produces the final universal XPI only after all seven bundles pass.
- [ ] 2.4 Extract the Synthesis runtime from the final XPI and run the seven-platform XPI freshness checker; verify every embedded bundle has the expected fingerprint and passes the checker.
- [ ] 2.5 Use the extracted Windows runtime copy to start the sidecar twice consecutively; after each start verify HTTP 200 and `ready`, read seven topics, and confirm the 230 canonical files remain unchanged.

## Verification record

- Before the script change, both new ordinary-build cases failed: the generation probe ran without a freshness probe.
- `npm exec --no -- tsx node_modules/mocha/bin/mocha tests/synthesis/193-synthesis-sidecar-runtime-packaging.test.ts --require tests/setup/zotero-mock.ts --timeout 120000 --exit`: 19 passing, including stale fingerprint, damaged executable, and missing manifest fixtures.
- `npm exec --no -- eslint tests/synthesis/193-synthesis-sidecar-runtime-packaging.test.ts`: passed.
- Prettier, `git diff --check`, and strict OpenSpec validation: passed.
- Negative acceptance: `npm run build` exited 1 at the initial freshness check against the existing seven stale bundles. The existing XPI was not regenerated. Positive build and packaged-runtime acceptance remain pending tasks 2.1–2.5.
