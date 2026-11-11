# Tasks

## 1. Index navigation and counting

- [x] 1.1 Add failing controller pagination coverage, forward every valid existing payload, and pass controller regression tests.
- [x] 1.2 Separate total/count/page feedback and preserve accepted totals on failure; pass Index DOM/host tests and update Workbench UI documentation.

## 2. Index query and view lifecycle

- [x] 2.1 Reproduce same-owner return and hidden-scan races in existing host tests, then retain current pages and pause/resume live enumeration without replaying cursors.
- [x] 2.2 Retain the Index mount and suspend hidden measurement; pass DOM identity/scroll/expansion and shared-window lifecycle tests.
- [x] 2.3 Update Workbench host documentation for live pause/resume, closure, invalidation and unchanged session-cache budgets.

## 3. Tag windows and rating geometry

- [x] 3.1 Add large vocabulary/staged viewport regressions, implement measured Tag windows, and pass selection/edit/expansion/local-scroll tests.
- [x] 3.2 Replace rating glyph overlays with shared SVG geometry and verify rating semantics plus rendered whole/half/empty/missing stars at common Windows scales.

## 4. Integration acceptance

- [x] 4.1 Pass affected Node suites, root/page type checks, formatting/lint checks and strict OpenSpec validation.
- [ ] 4.2 Extend the existing isolated Zotero E2E path to exercise Index pagination/cache and heavy Tag scroll/tab changes, run build preflight/current-source sidecar acceptance, and record stable service identity across two health periods.

## Evidence

Planning baseline: 142 existing tests passed. Read-only probes reproduced rejected pagination payloads, a page-two return resetting to page one, and 1000 Tag rows mounting 26061 elements. Runtime logs show control-timeout-triggered restarts; production stability remains an acceptance requirement.

Implementation verification (2026-11-11):

- Existing Node suites 125, 252, 257, 258 and 259: **197 passing** using `tsx node_modules/mocha/bin/mocha <files> --require tests/setup/zotero-mock.ts --timeout 30000 --reporter dot --exit`.
- `tsc --noEmit` and `tsc --noEmit -p tsconfig.synthesis.json`: passed.
- Affected source/tests ESLint and Prettier checks, localization governance, strict OpenSpec validation and `git diff --check`: passed. Final E2E source checks are recorded separately below.
- Headless Chromium with production components, without a development server: 1000 Tags mounted 21 groups / 584 elements; Index returned to the same table node at page 2, scrollTop 1000, with its expanded row retained. No page errors. A second bottom-scroll check confirmed the sticky header stayed at viewport offset 0.
- Whole/half/empty/missing rating geometry visually checked at 100%, 125%, 150% and 200% browser scaling. Zotero-native rendering remains part of task 4.2.
- Extended the existing `tests/zotero/e2e/full/300-lisongtao-gold.zotero.test.ts` case with 125 owned synthetic parents/reference notes, 1000 owned staged Tags, pagination/return-state assertions and two automatic health observations. Test-project type checking (`tsc -p tests/tsconfig.json --noEmit --pretty false`), ESLint and Prettier passed. Cleanup uses only recorded item IDs and exact generated Tag identities, preserving pre-existing staged Tags. The case has not been executed.

Once build preflight passes, use the existing isolated runner: set `ZOTERO_TEST_GREP='System E2E runner foundation|Synthesis E2E gold library'` and run `npm run test:zotero:e2e` with the configured supported Zotero binary. Do not run against the source library/profile.

Task 4.2 is blocked before plugin build / isolated Zotero execution. Native freshness checks (Synthesis seven-platform bundles, Host Bridge CLI and Windows ACP bridge), Host Bridge content/doc checks, canonical validators, workflow manifest and synchronized built-in skill contracts passed. `npm run check:content-package-release -- --current-branch` failed on branch `dev`: `dev GitHub content feed does not match local generated package semantics`. The local generated package SHA-256 was `22040d5b3857f800a2039ce5936dcdb29f6234e40b8eed1f2174b53c06e2728c`. Build preflight requires fresh published content; this implementation does not authorize publishing it. No plugin build, Zotero E2E or stable-service claim was made. Two automatic health periods and unchanged service identity must still be observed through the existing isolated `index-projection-01` case after that gate is resolved.

Rechecked on Windows, 2026-11-11, branch `dev`, HEAD `00dfc1bce9488e452db8c48dabba83186ddf7a78`, with existing working changes retained: all native freshness and content/doc/validator/workflow checks above passed again, including byte-identical built-in skills. The published-content check again exited 1 with the same semantics mismatch and local SHA-256 (428 files, 5197742 bytes). The supported local Zotero 10.0.2 executable exists, but plugin build and isolated E2E remain blocked by published-content freshness. Task 4.2 remains unchecked; no health-period or service-stability result is inferred from these preparation checks.
