# Unified Assistant Sidebar And ACP Skill Interaction UI

## Summary

Unify the three existing assistant sidebars (SkillRunner, ACP Chat, ACP Skills) behind one Zotero side-pane button and a tabbed shell. Align the ACP Chat and ACP Skills visual language, add an ACP Skills reply composer scaffold for future interactive runs, and keep the existing page bridges intact to minimize risk.

## Motivation

ACP Chat has the more mature chat and plan UX, while ACP Skills has a cleaner running-state surface and tool LED rendering. Keeping three separate sidebar buttons also creates avoidable UI clutter. A tab shell gives users one entry point while preserving current backend/session behavior.

## Scope

- Add a unified Assistant sidebar shell with tabs for SkillRunner, ACP Chat, and ACP Skills.
- Route Dashboard and sidebar entry points to the unified shell.
- Align ACP Chat interaction/tool visuals and ACP Skills plan/status/reply UI.
- Do not implement full interactive ACP SkillRunner execution in this change.
