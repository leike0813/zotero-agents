# Harden Assistant Shell Interaction Bridge

## Summary

The unified Assistant shell currently relies on nested iframe `postMessage` paths for several child actions. In Zotero/XUL embedded browser contexts this can silently drop interactions, which breaks SkillRunner and ACP Skills `waiting_user` replies and other controls.

This change makes the Assistant shell interaction transport explicit and diagnosable by using a host-injected bridge between the Zotero host and `assistant-workspace.html`, while preserving standalone child page fallback behavior.

## Goals

- Route SkillRunner, ACP Chat, and ACP Skills actions through a reliable host bridge.
- Preserve child page independence outside the Assistant shell.
- Make failed action delivery diagnosable instead of silent.
- Keep SkillRunner UI and session semantics unchanged.

## Non-Goals

- Redesigning SkillRunner, ACP Chat, or ACP Skills UI.
- Changing ACP Skills session recovery/controller semantics.
- Reworking SkillRunner drawer layout.
