# Dashboard i18n management

## Why

Dashboard-family surfaces still mixed localized snapshot labels with hardcoded English UI fallback. This made non-English locales incomplete across the main Dashboard, ACP Chat, ACP Skill Runs, Run Dialog, Workflow Settings Dialog, and readonly harness snapshots.

## What Changes

- Route fixed Dashboard-family UI copy through host/model `labels` snapshots backed by Fluent keys.
- Keep workflow/backend/task names, runtime logs, ACP transcripts, tool output, generated content, and free-form errors raw.
- Extend localization governance so Dashboard static renderers cannot reintroduce direct English fallback at common UI call sites.
- Keep existing Dashboard and ACP snapshot/action protocols unchanged.

## Impact

- Affected specs: `plugin-localization-governance`, `task-runtime-ui`, `assistant-sidebar-ui`, `ui-readonly-harness`
- Affected code: Dashboard host models, Dashboard static JS, locale files, i18n typings, readonly harness model, localization governance tests
