# Unify Workflow Run Final Status And Task Cards

## Why

ACP Skills and SkillRunner currently mix backend execution success with workflow apply success. A backend-succeeded run whose apply hook failed can still look successful in task lists, which makes downstream sequence decisions and user-facing summaries ambiguous.

Task cards also present ACP and SkillRunner state differently. SkillRunner exposes apply state prominently while ACP mostly exposes a single status, so users cannot consistently distinguish backend status from apply status.

## What Changes

- Treat user-visible run status as a derived main status.
- Preserve backend execution status as a separate diagnostic axis.
- Preserve apply status as a separate diagnostic axis.
- Mark ACP and SkillRunner runs failed when required apply fails, while keeping backend status succeeded.
- Keep failed and apply-failed tasks visible until the user archives or removes them.
- Render ACP Skills and SkillRunner task cards with the same main badge plus Backend/Apply LED rows.
- Use the shared Material Symbols icon system for task archive actions.

## Impact

- Existing local run records may gain a `backendStatus` field.
- Sidebar grouping and sequence continuation use main status, not backend success alone.
- Dashboard task cards become visually consistent across ACP Skills and SkillRunner.
