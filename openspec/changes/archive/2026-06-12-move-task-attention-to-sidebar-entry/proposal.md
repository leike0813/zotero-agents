# Assistant Sidebar Entry Attention Badge

## Summary

Move task attention affordances to the Assistant Sidebar entry. The sidebar entry badge becomes the persistent indicator for tasks waiting for user input/auth/permission, and the existing Running Tasks hover popover moves from the Workbench toolbar button to Assistant Sidebar entry surfaces. The Zotero library toolbar sidebar button and the Workbench header sidebar button both count as entry surfaces because the library toolbar is not visible while the Workbench tab is active.

## Motivation

Waiting ACP Skills and SkillRunner jobs can currently be missed when users are not looking at the relevant panel. The Workbench toolbar popover also mixes Workbench entry behavior with backend task status. A sidebar-centered affordance better matches where users resolve ACP/SkillRunner interactions.

## Scope

- Keep the badge meaning limited to human-attention tasks.
- Keep the popover as the existing active task list.
- Remove Running Tasks hover behavior from the Workbench launch button.
- Keep the Workbench header sidebar button aligned with the library toolbar sidebar button.
- Do not add OS notifications, modal alerts, or a new toast system.
