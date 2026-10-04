# Tasks

Complete all groups before handing the new interface to the user for existing ChatGPT tasks 5.2/5.3. An internal implementation slice is not a login-first handoff. For each changed stable behavior, first adjust the relevant existing test, then implement and run it; add focused tests only where the current suite lacks a meaningful contract. No migration/compatibility layer, profile reset, dependency operation, Git operation or development server is part of these tasks.

## 1. Connection and model ownership

- [ ] 1.1 Define current connection/model configuration DTOs in the existing provider contract/owner, preserving frozen selection and model configuration identities; first adapt runtime 242 tests for one connection/multiple models, explicit precedence and no implicit fallback, then implement and pass those tests with affected type checks.
- [ ] 1.2 Implement explicit default retention/admission, connection/card removal impacts and last-reference credential cleanup through existing owners; first cover rename, authentication/target changes, shared credential removal and title fallback in runtime 242/244, then verify unchanged unrelated configuration and history.
- [ ] 1.3 Adapt existing selection/model discovery/search consumers to actual card and connection identities without duplicate persisted resolved state; verify runtime 243/246/251/261 and affected Conversation/Skill Run selection regressions, documenting the current relationship in the settings component document.

## 2. Independent window and routing

- [ ] 2.1 Add the pure settings wire contract and extract host orchestration into the independent window owner/lazy composition point; first test message admission, repeated-open focus, request identity, subscriptions and window cleanup, then implement and verify root/dashboard typing and the Pi-excluded build graph.
- [ ] 2.2 Add prefs entry to the left of Backend Manager and route Workspace/Pi configuration directly to settings; first update preferences/assistant routing tests, then implement and verify both windows coexist and reopening does not reset drafts.
- [ ] 2.3 Replace the Backend Manager detailed Pi pane with read-only fixed-backend summary/launch and remove obsolete detailed snapshots, actions, forms and subscriptions; verify dashboard 251 and runtime 57 retain ACP/SkillRunner/Generic HTTP behavior and Backend Profile drafts, and update Backend Manager source documentation.
- [ ] 2.4 Add the static page shell, dashboard controller/renderer and Preact regional components using shared tokens/build/type boundaries; verify production imports exclude prototype code, region memoization preserves unrelated DOM and navigation/header/content scrolling matches the fixed prototype.

## 3. Complete onboarding and model workbench

- [ ] 3.1 Implement onboarding and connection forms for actually supported public providers, their required parameters, keyless/custom endpoints and independent ChatGPT registrations; first cover save/cancel/failed-save and unsupported-provider reasons, then verify no duplicate key input or implicit inference/default assignment.
- [ ] 3.2 Implement registration selection, request-bound browser authorization/cancel/reauthorization, welcome/plan/usage controls and sign out/removal using the existing auth owner; verify runtime 251 and directed Zotero 285 controlled cases retain registration isolation, returning identity, rotation and late-result rules without collecting real-account evidence yet.
- [ ] 3.3 Implement scoped discovery and bounded provider/model browsing, per-model options/default purposes and removal previews; verify same-identity retained failure versus valid-empty behavior, unknown facts and card defaults against runtime 242/243 plus dashboard behavioral tests, then update relevant locale/help source.
- [ ] 3.4 Implement explicit per-model tool-free tests and one registration recovery probe with preserved applicable result identity; verify actual-completed versus partial/stale results, possible-usage confirmation, unchanged defaults and no task auto-resume using runtime 246/251 and focused page behavior checks.

## 4. Complete MCP configuration and automatic admission

- [ ] 4.1 Implement stdio argument/environment entries, default cwd hint and common HTTP none/Bearer/API-key guidance plus folded extra headers; first extend runtime 249 for exact argv, header field identity, one Bearer prefix, duplicates, preserved blank slots and transport authorization, then pass form and runtime checks.
- [ ] 4.2 Implement one validated registry change-set path for forms/full JSON/merge import/export with source/credential commit and rollback; first cover conflict keep/replace, omission semantics, explicit removal, failed credential/config writes and concurrent binding edits, then verify old authoritative state/drafts survive failures and exports contain no reusable secret.
- [ ] 4.3 Remove persisted manual selection/review/promotion and associated actions/types; implement bounded automatic descriptor validation/frozen proxy catalogs and source-change invalidation; replace superseded runtime 249 tests and verify Gateway 245/279 and Zotero 283 retain conservative effects, catalog-bound approval, same-source scheduling, bounded results and unknown-effect no replay.
- [ ] 4.4 Implement independent MCP page/source state and optional source tests against its real owner; verify secrets are not refilled/projected, tests are optional, unrelated draft DOM remains stable and close/cancel rejects obsolete results; update source docs/locales for configuration-based admission.

## 5. Complete search and maintenance

- [ ] 5.1 Separate saved-source test resolution from enabled turn-chain selection inside the existing brokered Web owner, retaining curated schema/descriptor validation without user digest review; first update runtime 261/262 for disabled-source tests, one-source dispatch, exact native model configuration priority, permissions and actual completion, then implement and pass directed Zotero 287 cases.
- [ ] 5.2 Implement the independent search page, guided per-kind configuration, accessible ordering/enablement and source-specific test feedback; verify no temporary enablement/fallback chain, changed-binding invalidation versus order-only retention, billing confirmation and no subscription/task recovery; update source docs/locales.
- [ ] 5.3 Implement catalog browsing and the three folded public-update, model-supplement and global-diagnostics sections using current owners; first reuse runtime 243/audit and page tests for recovery/adoption failure, missing-file retention, canceled picker and global-only export, then implement and verify no owner scan or unrelated draft/DOM reset; update maintenance source docs.

## 6. Full interface verification and handoff

- [ ] 6.1 Run affected Node domains, root/dashboard/sidebar typing as applicable, changed-file lint/format, Pi browser guards, ordinary build and locale/help generation/checks; record exact commands/results and final candidate identity in verification.md, retaining all missing service/C20 evidence as missing.
- [ ] 6.2 Verify every approved page in installed Zotero using existing UI/core infrastructure and fixed compatibility targets: normal/compact windows, themes, mouse/keyboard entry controls, independent scrolling, reopen/focus, unsaved navigation/close, failed save, account/source/request isolation and unrelated DOM identity. Capture screenshots and behavior results against revision 7; use the existing full E2E runner for integration that requires it.
- [ ] 6.3 Confirm complete implementation of all pages and necessary runtime behavior, remove remaining obsolete Pi UI/review labels/actions, regenerate help and reconcile current-state docs/constraints. Record the usable new-window entry and candidate for the user, then hand off to existing ChatGPT tasks 5.2/5.3; do not perform or mark those real-account/C20 tasks complete from controlled UI results. Preserve eventual authentication-then-settings spec synchronization order.
