# Fix ACP Permission UI And Transcript Noise

## Summary

Unify ACP Chat and ACP Skills permission approval rendering so requests are compact, readable, and inspectable without exposing raw transcript payloads. Also reduce ACP Skills transcript noise by collapsing permission request/resolution into one transcript item, simplifying workspace activity, and hiding low-signal success status events.

## Motivation

The current permission UI regressed after the shared Assistant panel refactor: full-request disclosure can close the drawer unexpectedly, approval details expose raw protocol payloads, and ACP Skills transcripts contain noisy internal status events. These issues make approval flows harder to review and distract from the agent conversation.

## Scope

- Compact permission cards in the shared Assistant panel renderer for ACP Chat and ACP Skills.
- Internal details drawer payload for a readable permission request DTO.
- ACP Skills transcript projection changes for permission and workspace activity.
- Tests for renderer/model/store behavior and validation commands.

## Out Of Scope

- Changing ACP permission protocol semantics.
- Redesigning the full Assistant layout.
- Changing SkillRunner non-ACP permission UX.
