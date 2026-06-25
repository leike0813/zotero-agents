## Context

The dashboard directory currently owns three unrelated concerns: the dashboard UI itself, the Assistant sidebar shell/panels, and vendor libraries used by several content surfaces. The desired structure is to make static ownership match runtime ownership while keeping behavior unchanged.

## Decisions

- `addon/content/sidebar` owns sidebar entry pages and panel-local assets only.
- `addon/content/shared/assistant` owns Assistant panel shared JS/CSS used by ACP Chat, ACP Skills, and SkillRunner.
- `addon/content/shared/vendor` owns third-party browser assets used by multiple content surfaces.
- Old dashboard paths will be removed rather than preserved as redirect/stub files, because these are plugin-internal packaged resources and keeping duplicate paths would undermine the cleanup.

## Path Mapping

- `addon/content/dashboard/assistant-workspace.*` -> `addon/content/sidebar/assistant-workspace.*`
- `addon/content/dashboard/acp-chat.*` -> `addon/content/sidebar/acp-chat.*`
- `addon/content/dashboard/acp-skill-run.*` -> `addon/content/sidebar/acp-skill-run.*`
- `addon/content/dashboard/run-dialog.*` -> `addon/content/sidebar/run-dialog.*`
- `addon/content/dashboard/chat_thinking_core.js` -> `addon/content/sidebar/chat_thinking_core.js`
- `addon/content/dashboard/assistant-conversation-view.js` -> `addon/content/shared/assistant/assistant-conversation-view.js`
- `addon/content/dashboard/assistant-transcript-renderer.js` -> `addon/content/shared/assistant/assistant-transcript-renderer.js`
- `addon/content/dashboard/assistant-panel-model.js` -> `addon/content/shared/assistant/assistant-panel-model.js`
- `addon/content/dashboard/assistant-panel-renderer.js` -> `addon/content/shared/assistant/assistant-panel-renderer.js`
- `addon/content/dashboard/assistant-panel-shared.css` -> `addon/content/shared/assistant/assistant-panel-shared.css`
- `addon/content/dashboard/vendor/*` -> `addon/content/shared/vendor/*`

## Reference Rules

- Sidebar workspace child iframe paths remain page-local: `./acp-chat.html`, `./acp-skill-run.html`, and `./run-dialog.html`.
- Sidebar panel local CSS/JS paths remain page-local.
- Sidebar panel shared Assistant layer paths use `../shared/assistant/...`.
- All markdown/math/highlight vendor references use `../shared/vendor/...` in content HTML and `content/shared/vendor/...` in packaged asset reads.
- Dashboard-specific pages remain in `addon/content/dashboard`.

## Validation

Targeted tests should prove that new paths are used and stale dashboard-owned sidebar/vendor paths are gone from active source, addon HTML, and tests. Artifact archives are historical records and are not part of this cleanup.
