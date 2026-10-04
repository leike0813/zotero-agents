# Proposal

## Why

The current Backend Manager mixes model connections, authentication, MCP, search and maintenance in one unusable Built-in Agent page, preventing the user from completing real ChatGPT acceptance. A separately hosted Zotero Agent settings window must implement the approved revision-7 prototype in full before the user resumes the blocked authentication change.

## What Changes

- Add one independently owned settings window with left navigation for onboarding, model connections/workbench, MCP, search, and catalog/maintenance. Revision 7 fixes responsibilities, hierarchy and interactions; project styling, themes and accessibility may adapt.
- Add its preferences entry immediately left of Backend Manager. Keep only fixed-backend status and an open-settings action in Backend Manager; route Pi configuration actions directly to the settings window and focus its existing instance on repeated opening.
- Separate a saved model connection from its multiple model configurations, reuse one authentication binding, and manage default purposes on model cards. Preserve independent ChatGPT registration ownership and all approved save/cancel/test behavior.
- **BREAKING, unreleased configuration**: replace the development configuration shape and manual MCP selection/review/promotion workflow without adding migration or compatibility layers. Reuse existing profile, credential, runtime and process owners; do not clear unrelated data.
- Provide guided MCP entry editors and common HTTP authentication, whole-document JSON editing and transactional merge/import/export. Discover and admit tools at runtime without user tool review, retaining Gateway authorization and conservative effects.
- Give search its own source configuration/order/test page, including saved disabled-source testing. Keep `web_fetch` configuration-free and the conversation model picker outside this change.
- Move directory updates, adopted model overlays and global redacted diagnostics into the approved maintenance structure; remove redundant settings and obsolete UI/actions.
- Finish all pages, regression checks and installed-host UI review before handing the window to the user for existing ChatGPT tasks 5.2/5.3. Do not substitute synthetic UI evidence for real service or C20 evidence.

## Capabilities

### New Capabilities

- `zotero-agent-settings-ui`: independently hosted configuration, approved navigation/forms, scoped async feedback, draft protection, bounded projections and real-host UI handoff.

### Modified Capabilities

- `backend-manager-ui`: replace detailed Built-in Agent configuration with fixed-backend summary and settings launch.
- `builtin-pi-provider-configuration`: separate connections and model configurations, card defaults, applicable test identities and explicit credential reference cleanup.
- `pi-mcp-tool-sources`: guided authentication/entries, atomic configuration operations and automatic frozen tool catalogs without manual review or promotion.
- `pi-tool-gateway-policy`: preserve same-source serialization and frozen hidden catalog admission without a user-review classification.
- `pi-brokered-web-tools`: independently test a configured disabled source and remove manual curated MCP review gates while preserving runtime validation and authorization.
- `pi-runtime-audit`: expose global export from the independent configuration window.

## Impact

Extract Pi settings orchestration from `src/modules/workflow/settings/backendManager.ts` and its lazy access composition; introduce a dedicated host/controller/Preact page and pure wire contract using existing build infrastructure. Update preferences, Workspace routing, shared provider/MCP/search contracts and existing configuration/source owners. Reuse existing runtime, dashboard, preferences and installed-Zotero tests, and update source documentation, locales and generated help through the current generator. No dependencies, Git operations, deployment, new Agent owner or parallel E2E runner are required.

Approved decisions: [information architecture](https://github.com/leike0813/zotero-agents/issues/71#issuecomment-5977196376), [model interactions](https://github.com/leike0813/zotero-agents/issues/72#issuecomment-5977561423), [tools and maintenance](https://github.com/leike0813/zotero-agents/issues/73#issuecomment-5977804714), and [implementation handoff](https://github.com/leike0813/zotero-agents/issues/74). Fixed evidence: `artifacts/pi-agent-runtime/settings-prototype/revision-7.html` and its approval/review records.

This change builds on the implemented authentication/runtime contracts of `replace-builtin-pi-codex-auth-with-chatgpt`, not on completion of its blocked real-account tasks. It supersedes the location of that change's Backend Manager controls while retaining their security semantics. Complete this UI change first; the user then resumes real-account task 5.2 and candidate-bound C20 handoff 5.3, with `verify-builtin-pi-runtime-release` retaining release acceptance ownership.
