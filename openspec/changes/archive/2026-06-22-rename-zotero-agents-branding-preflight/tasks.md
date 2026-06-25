## 1. OpenSpec artifacts

- [x] 1.1 Create change proposal, tasks, and spec deltas for conservative
      pre-rename branding.

## 2. Active release and plugin branding

- [x] 2.1 Update package metadata, README files, docs URL helpers, and docs
      deployment metadata to Zotero Agents / zotero-agents.
- [x] 2.2 Update plugin UI, localization, workspace, harness, and preference
      page visible text to Zotero Agents.
- [x] 2.3 Update visible default-path examples and ignore rules while keeping
      compatibility identifiers unchanged.

## 3. Host Bridge and workflow surfaces

- [x] 3.1 Update Host Bridge CLI, wrapper-skill, and generated documentation
      text to Zotero Agents Host Bridge.
- [x] 3.2 Update built-in workflow debug and Git-message text to Zotero Agents
      without changing payload kinds or preference prefixes.
- [x] 3.3 Refresh the `skills_src` Synthesis Workbench JS bundle so its embedded
      brand alt text matches the updated source i18n by running the renderer
      generation script. The `skills_builtin` rendered bundle remains out of
      scope for this pre-render source change.

## 4. Verification

- [x] 4.1 Update existing tests whose stable expected behavior is changed by
      the new visible brand/default text.
- [x] 4.2 Run focused checks for UI/locale, Host Bridge docs sync, localization
      governance, and build.
