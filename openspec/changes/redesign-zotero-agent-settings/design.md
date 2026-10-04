# Design

## Context

See proposal.md for motivation and approved decision links. `backendManager.ts` currently assembles Backend Profile editing and Pi authentication, directory, configuration, MCP and search actions in the same dialog and snapshot. `backendManagerApp.ts` and `BackendManagerRegion.tsx` render this mixed surface. `backendManagerPiAccess.ts` preserves a lazy build edge; it is mostly export forwarding and is not a second domain owner.

`piProviderContract.ts` currently persists a flat configuration containing connection/authentication and one model; `piProviderConfiguration.ts` clears defaults on relevant edits. `piMcpToolSources.ts` admits only selected/reviewed descriptor digests and manual promotion. `piBrokeredWebTools.ts` tests through the enabled turn chain. These behaviors conflict with the approved multiple-model connection, retained-default, automatic MCP and independent-test contracts. Merely moving JSX would not implement the design.

Related functionality is unreleased. The user explicitly excludes migration and compatibility work. Existing authentication, encrypted credential, target binding, network/Gateway, process, runtime, and canonical history owners remain authoritative. Worktree changes predate this proposal and must not be overwritten.

## Goals / Non-Goals

**Goals:** one settings implementation behind a small host/page interface, one source of truth for each configuration and capability fact, bounded independent page regions, and an implementable full-interface handoff that unblocks the user's real login acceptance.

**Non-Goals:** another runtime or credential store, implementing the prototype's simulated state as production logic, expanding provider support by assumption, changing SIWC wire/refresh/consent semantics, rebuilding conversation model picker, migration adapters or data resets, dependencies, Git operations, publication or another test runner.

## Decisions

### 1. Complete the interface before real-account acceptance

Implement and verify all approved pages in this change: onboarding, model workbench, MCP, search, catalog and maintenance, together with entry routing and the Backend Manager summary. Internal tasks can be incremental, but a login-only slice is not the user's handoff. After full UI completion, the user operates this window to resume `replace-builtin-pi-codex-auth-with-chatgpt` tasks 5.2 and 5.3. This change's installed-host verification uses controlled inputs and does not require a real account to mark UI behavior complete. Authentication, real discovery/text/functions/search evidence and release acceptance remain separately recorded in their existing changes; missing service facts remain missing.

The implementation uses the authentication change's already implemented code without requiring that change to be archived. Eventual main-spec synchronization is ordered authentication first, settings second: settings deltas supersede the older surface/default rules. Do not archive authentication early to satisfy this ordering. Any final acceptance affected by the new UI/configuration must bind to the final candidate. UI completion does not close C20.

### 2. A dedicated host owns the independent window

Add `src/modules/workflow/settings/zoteroAgentSettings.ts` as the window, message admission, subscriptions, bounded projection and action orchestration owner. Extract Pi actions from Backend Manager; retain domain actions in their current owners. Use a distinct dialog/window reference rather than `addon.data.dialog`, so both windows can coexist. Opening again focuses the existing settings window and does not reset drafts. Entry routing does not first create Backend Manager.

Create `src/shared/zoteroAgentSettingsWireContract.ts` as the single pure action/snapshot/result contract. Each result carries request and object identity; host admission checks the actual frame source and accepted payload before dispatch. Projection supplies bounded catalog pages/query results, safe registration summaries and secret-slot status, not full directories or credential material. Keep the existing Pi-excluded build lazy import guarantee. Rename/move `backendManagerPiAccess.ts` to `zoteroAgentSettingsPiAccess.ts` if it is still needed as this lazy composition point; do not keep old and new forwarding layers.

Alternative: another tab in Backend Manager preserves the mixed window responsibilities and cannot satisfy the approved standalone host. Copying its Pi action dispatcher would create duplicate business behavior and is excluded.

### 3. Connections own targets and authentication; cards own model choices

Extend the existing `piProviderConfiguration` owner/document and shared contract with `connections` and model `configurations`. A connection owns its ID, label, provider/adapter identity, resolved account/gateway parameters, supported authentication variant, credential or ChatGPT registration reference, enabled state and explicit target inputs. Each model configuration retains its own stable ID, `connectionId`, model, reasoning/options and validated target-specific binding/description. Service adapters may use different model protocols/endpoints within the same provider connection; derive and save each model's binding from the explicitly configured provider parameters and admitted adapter, never from an unrelated directory row. No second connection registry or shadow resolved configuration is persisted.

Reuse existing selection/default resolution to materialize the frozen target/auth snapshot for runtime consumers. Defaults and search bindings continue referencing actual model configuration IDs. Rename-only changes preserve test identity; calling parameters, authentication identity or target changes invalidate applicable test results while retaining default references with explicit admission reasons. New unusable defaults are rejected. Explicit override, saved owner selection, kind default and general default remain the precedence; remove implicit catalog/first-available fallback. Auxiliary absence disables provider-based titles without affecting main selection.

Saving a connection does not require a model or trigger inference. New model cards do not silently become defaults. Removing a card clears only its referenced purposes and retains the connection/authentication. Removing a connection explicitly removes its cards and affected defaults; a ChatGPT registration stays independently owned, while an API key is cleared only after its last reference is removed, including other domains sharing an admitted reference. This cleanup is an explicit operation, not generic credential deletion cascading into unrelated owners.

No unreleased-flat-document reader/migration, auto-grouping converter or duplicate write path is added. Do not turn this instruction into an automatic profile reset. Implement current schema and fixtures directly; corrupted/incompatible saved input is reported without mutating unrelated data. Existing canonical snapshots and historical IDs are not rewritten.

### 4. Guided MCP editing and JSON share one owner operation

Keep `piMcpSourceRegistry`, `piCredentialStore`, `piMcpRuntimeOwner` and the existing process/transport owners. Add safe authentication metadata to the source contract: none, bearer or API-key with explicit field identity; preserve arbitrary supported header bindings as custom entries. Plaintext values exist only in input controls and explicit submitted writes. Bearer token input maps to one Authorization prefix at transport resolution; API keys use their chosen field. Header uniqueness is case-insensitive, environment names follow existing platform rules, and duplicates fail without silent overwrite. Name/argv edits preserve untouched bindings; empty secret slots retain only the same field's binding, never a new field's old secret.

Use ordered argv entries, environment name/value entries and folded advanced HTTP header entries; omit empty cwd and resolve it through `getRuntimePersistencePaths().runtimeRoot`. The hint is presentation, not a saved absolute default. Guided forms, full `mcpServers` JSON, preview and merge import all normalize into one registry change set. JSON omission removes a source only in explicit full-document save after impact preview; import omission does not remove it and same-name conflict defaults to keep. Explicit field/source clearing handles removal; exported empty authentication slots require re-entry on a receiving profile.

The registry owns prepare/validate and serialized commit/rollback using the existing encrypted credential owner's write boundary. Stage values before commit; publish snapshots, invalidate connections/evidence and clear orphan bindings only after success. A configuration-write or credential-write failure restores prior authoritative state and keeps the input draft; never claim transactional behavior based on page memory. Extend the existing credential write interface only as necessary for this coordinated operation rather than adding another store or generic transaction framework. Imported local-network permission is not trusted; target approval remains explicit and scoped.

### 5. Automatic MCP catalogs retain runtime security

Remove manual tool-review, selected-tool and promotion persistence/actions. For future turns, enabled configured sources connect/discover lazily and validate supported descriptors/schema/names before freezing the catalog. The existing search/describe/call proxy gives model access to this bounded catalog; no user promotion flow is needed. Descriptor identity remains internal runtime evidence so drift is validated and never dispatched under stale frozen meaning. Private network and stdio execution still require their existing scoped permissions; server annotations do not reduce conservative effects. Existing unknown-effect, no replay, output limit and process-exit evidence rules remain intact.

Curated MCP search also removes user review gates while retaining its supported search descriptor/shape validation. Testing is optional; it does not enable a source or certify a user's review.

### 6. Search testing shares execution, not enabled-chain admission

Add a single saved-source resolution path inside `piBrokeredWebTools`, used by explicit source testing independently of `enabled`. It validates that saved source's complete target, authentication/model identity and permissions, captures request/configuration/credential identity, and uses the existing real executor. Turn freezing continues selecting only enabled eligible sources and keeps exact model-configuration priority for native search. Do not toggle enablement temporarily or test a fallback chain. Actual complete search evidence is required for success; cancel/late results cannot stamp changed bindings. Retain testing evidence across enable/order-only edits and invalidate it for target/authentication/model changes.

### 7. Page regions preserve local editing and input identity

Use Preact page regions under `src/dashboard/` and the existing dashboard DOM program/build rather than introducing a framework or installing packages. Split controller state by visible page and connection/card/source/request; keep plaintext outside normal snapshots, persisted drafts and status projections. Connection/source forms save as forms, while model options/default purposes save immediately per card. Unsaved navigation/close uses save, discard or continue; save failure keeps the current object and draft. A completed standalone ChatGPT registration survives cancellation of its connection draft.

Regional props compare only relevant visible state and local open/collapse/edit state. Public updates, login progress and a different source test must preserve unrelated form DOM, focus and selections. The sidebar and fixed page header do not scroll with the page body; each selected page has one main content scroller. Use shared `page-chrome.css` tokens/patterns and project theme conventions. Keyboard focus, item order controls, mouse-selectable provider/model menus, compact host size and both themes are acceptance behavior; pixel identity is not a test contract.

Window cleanup cancels its authorization attempts and local probes, invalidates page result generations, releases subscriptions/waiters and clears transient secrets. It does not shut down global catalog/MCP/runtime owners or interrupt shared refresh work required by other consumers. Auth rotation keeps its existing settlement policy.

### 8. Maintenance delegates to existing owners

Catalog browsing remains visible; public checks/previous restore, model overlay import/refresh/removal and global diagnostic export are three folded sections. Use `piModelCatalog` and `piRuntimeAudit`, preserving adoption, rollback, missing-file retention and global-only export rules. Overlay adoption reports changed/add counts from actual adopted facts. Host pickers own local paths; publish safe display labels/identity only where needed. Cancel creates no export, failure stays in its section, and diagnostics introduces no global logging control. Account discovery remains on the corresponding connection.

### File responsibility inventory

| Operation | Files | Responsibility |
| --- | --- | --- |
| Add | `src/modules/workflow/settings/zoteroAgentSettings.ts` | Independent host, admission, lifecycle and projection orchestration |
| Add | `src/shared/zoteroAgentSettingsWireContract.ts` | Pure settings DTO/actions/results; no second contract in view files |
| Add | `src/dashboard/zoteroAgentSettingsApp.ts`, `src/dashboard/zoteroAgentSettingsRenderer.ts`, `src/dashboard/components/ZoteroAgentSettings*.tsx` | Page controller, independent regions and forms; reuse established patterns |
| Add | `addon/content/dashboard/zotero-agent-settings.html`, `zotero-agent-settings.css` | Static containers and page-specific layout using shared tokens; bundle is generated |
| Modify | `zotero-plugin.config.ts`, `tsconfig.dashboard.json`, root `tsconfig.json`, `eslint.config.mjs` only where needed | Build/type/import boundaries and Pi-excluded lazy graph, not dependencies |
| Modify | `addon/content/preferences.xhtml`, `src/modules/preferenceScript.ts`, `src/hooks.ts`, `src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts`, `assistantWorkspaceSidebar.ts` | Direct settings entry points and safe launch/focus wiring |
| Modify | `backendManager.ts`, `src/dashboard/backendManagerApp.ts`, `backendManagerRenderer.ts`, `components/BackendManagerRegion.tsx`, `src/shared/dashboardWireContract.ts` | Retain fixed-backend summary/launch; remove detailed Pi snapshots, forms/actions/subscriptions |
| Move/delete | `backendManagerPiAccess.ts` → `zoteroAgentSettingsPiAccess.ts` as needed | One lazy Pi settings composition point, no legacy parallel facade |
| Modify | `src/shared/piProviderContract.ts`, `src/modules/piProviderConfiguration.ts`, `piProviderExecution.ts`, `piModelCatalog.ts`, relevant selection consumers `piConversation.ts`, `piSkillRun.ts`, `piTurnPreparation.ts` | Connection/card relationships, frozen resolution, target applicability; no new auth or runtime owner |
| Modify | `src/shared/piMcpSourceContract.ts`, `piMcpSourceRegistry.ts`, `piMcpToolSources.ts`, `piMcpRuntimeOwner.ts`, `piToolGateway.ts`, `piCredentialStore.ts`, corresponding existing network/stdio mapping when needed | Guided auth mapping, same-owner atomic config writes, automatic tool admission and invalidation; retained Gateway identity and same-source serialization |
| Modify | `src/shared/piWebSourceContract.ts`, `piBrokeredWebTools.ts`, `piBrokeredWebHttp.ts` only where needed | Single saved-source test path, actual model IDs, retained runtime validation |
| Modify | Existing dashboard/runtime/preferences/assistant/Zotero tests listed below | Replace superseded surface/review expectations; test stable behavior and identity |
| Add if necessary | Focused settings controller/host test under `tests/dashboard/` or `tests/runtime/` | Only behavior not covered by existing tests; no copied prototype suite |
| Modify/add | `docs/components/backend-manager.md`, `docs/components/zotero-agent-settings.md`, `site/docs/backends/backend-manager.md`, relevant `addon/locale/*/addon.ftl`, `typings/i10n.d.ts` | Current-state documentation and localized product controls; generated help uses existing generator |
| Modify if necessary | `AGENTS.md`, `CONTEXT.md`, `docs/dev/pi-runtime-acceptance.md` | Only new enduring constraints/glossary changes and changed acceptance entrypoints; do not rewrite unrelated instructions |
| Planning only | This change's proposal/design/specs/tasks and handoff pointers in existing changes | Full UI dependency, final candidate linkage and later spec sync order; do not mark pending real evidence complete |

The static prototype, its build script and assets remain separate evidence and are excluded from production entry graphs. Remove obsolete Pi-specific panel functions, review/promotion DTO/actions and labels as part of replacement; do not delete whole existing mixed files or other providers' functionality.

## Risks / Trade-offs

- Configuration/credential writes span existing storage → coordinate inside current owners, exercise injected write failure and concurrency before publishing success.
- Catalog entries exceed actual execution support → project executable adapter/auth/required-parameter capability for each provider, expose the reason for unsupported rows, never guess from SDK count or route everything to a custom endpoint.
- Window closure races shared discovery/auth rotation → distinguish page lifetime from owner lifetime and preserve current source/auth settlement semantics.
- UI looks plausible in browser but fails in Zotero → installed-host review must cover compact/normal size, themes, mouse/keyboard and reopen/focus; browser evidence alone is insufficient.
- Concurrent authentication and settings deltas overlap → keep authentication protocol tasks and unchecked 5.2/5.3 intact; sync authentication then settings and verify effective requirements against this handoff.

## Migration Plan

No migration or compatibility layer is required for this unreleased configuration. Implement current schema and fixtures directly, preserving unrelated state and history. The delivery sequence is full settings implementation and UI verification, user real-account operation in the new window, then existing authentication/C20 evidence completion. Publishing, deployment, profile resets and Git history operations are outside this plan.

## Validation and handoff

Use existing `tests/dashboard/251-dashboard-backend-manager.test.ts`, `tests/runtime/57-backend-manager-risk-regression.test.ts`, `tests/ui/40-gui-preferences-menu-scan.test.ts`, `tests/assistant/260-assistant-workspace-source-registry.test.ts`, runtime 242/243/244/246/249/251/261/262 and Zotero UI/core 278, core 283/285/287/289. Test stable contract behavior first for each implementation slice. Replace manual review and old Pi-panel assertions rather than retaining parallel expectations. Add tests only for missing externally visible transaction/lifecycle/identity behavior.

Run relevant Node domains, root/dashboard/sidebar type checks as affected, changed-file lint/format, browser guards, ordinary build and locale/help checks. Installed-host review uses existing Zotero UI infrastructure; integration that needs full E2E uses `tests/zotero/e2e/full` and `npm run test:zotero:e2e`, retaining the fixed compatibility matrix and read-only fixture copying. Record commands, candidate identity, screenshots, behavioral checks and limitations in this change's `verification.md` during implementation. Capture all approved page responsibilities and key failure/cancel paths against revision 7. A production mismatch in hierarchy/navigation/extra steps returns to design discussion; do not treat a functionally passing but reorganized screen as conformant.

Completion requires the entire interface plus necessary runtime behavior, not all external services being available. Controlled login/results do not count as real account proof. After UI completion, hand the actual window entry and final candidate to the user; only actual evidence can complete the existing authentication/C20 gates.
