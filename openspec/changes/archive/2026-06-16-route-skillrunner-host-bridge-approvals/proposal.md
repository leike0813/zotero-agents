# Route SkillRunner Host Bridge Approvals

## Summary

Route Host Bridge write approvals raised by SkillRunner backend jobs into the
SkillRunner panel prompt area by using a run-scoped Host Bridge scope.

## Motivation

SkillRunner jobs can now call Host Bridge. Their write approvals are initiated
from a user-visible SkillRunner task, so they should behave like ACP Skills
approvals and stay in the task panel instead of appearing as unrelated global
Host Bridge prompts.

## Scope

- Add `skillrunner-run` as a Host Bridge permission scope kind.
- Inject `ZOTERO_BRIDGE_SCOPE` for SkillRunner Host Bridge runtime access.
- Let `zotero-bridge` read `ZOTERO_BRIDGE_SCOPE` and send it as
  `X-Zotero-Bridge-Scope`.
- Store pending SkillRunner Host Bridge permission requests in SkillRunner run
  workspace state and resolve them from the SkillRunner panel.

## Out Of Scope

- SkillRunner write auto-approval.
- New Host Bridge token semantics.
- Changing ACP Chat or ACP Skills approval routing.
