## 1. Collapse Controller

- [x] 1.1 Add failing tests for the auto-stage hysteresis state machine, override precedence, and toggle-back-to-auto clearing.
- [x] 1.2 Implement `src/sidebar/assistantRegionCollapse.ts` (stage rules, override state machine, controller with toggle buttons, ResizeObserver height source, idempotent class application) until tests pass.

## 2. Panel Wiring

- [x] 2.1 Instantiate the controller from `assistantWorkspaceAcpChild.js` with toolbar/banner/composer region containers and a labels getter.
- [x] 2.2 Refresh toggle labels when the `configure` payload delivers the labels bundle.

## 3. Collapse Styles

- [x] 3.1 Add toggle button styles and the collapsed forms for toolbar (slim strip), banner (title-only with warning/danger notice and new-conversation exceptions), and reply zone (single-line textarea, single-row selector+send footer) to `assistant-panel-shared.css`.
- [x] 3.2 Restyle existing toolbar/banner/reply containers to host the toggle without changing expanded layout semantics.

## 4. Localization

- [x] 4.1 Add the `collapse` label group to `assistantPanelLabels.ts`.
- [x] 4.2 Add the six `assistant-panel-action-{collapse,expand}-{toolbar,banner,composer}` keys to all eleven `addon.ftl` locales and pass `check:localization-governance`.

## 5. Invariants, Documentation, and Verification

- [x] 5.1 Add controller tests locking region subtree identity across collapse toggles (`test/core/200-assistant-region-collapse.test.ts`).
- [x] 5.2 Update `doc/components/assistant-sidebar-panel-ui-ssot.md` (Region Collapse Under Limited Height) and the Assistant Workspace UI constraints in `AGENTS.md`.
- [x] 5.3 Run the 200/192/97 suites, both TypeScript configs, prettier/eslint, localization governance, and `zotero-plugin build`.
