## Why

ACP Skills transcript rendering already uses the shared paginated virtual renderer.
SkillRunner still sends complete transcript snapshots and renders them eagerly,
which makes long runs expensive even though the shared renderer can handle a
bounded DOM window.

This change reuses the existing renderer infrastructure for SkillRunner without
introducing backend paging into the SkillRunner model.

## What Changes

- Add an items-source mode to the shared assistant transcript renderer.
- Keep existing paginated page mode unchanged for ACP Skills.
- Render SkillRunner transcript snapshots through the shared virtualized path
  when transcript virtualization is enabled.
- Expose the existing transcript virtualization preference on SkillRunner
  workspace snapshots.
- Update preference help text so it describes both ACP Skills and SkillRunner.

## Non-goals

- Do not connect ACP Chat to backend transcript pagination in this change.
- Do not add SkillRunner backend paging or `load-transcript-page` actions.
- Do not change SkillRunner transcript snapshot ownership.

## Impact

- `addon/content/shared/assistant/assistant-transcript-renderer.js`
- `addon/content/sidebar/run-dialog.js`
- `src/modules/skillRunnerRunDialog.ts`
- `addon/locale/*/preferences.ftl`
- `test/core/97-acp-ui-smoke.test.ts`
