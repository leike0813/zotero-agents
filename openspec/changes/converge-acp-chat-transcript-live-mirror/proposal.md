# ACP Chat Transcript Direct Rendering

## Summary

Converge ACP Chat transcript rendering to the same direct snapshot model used by ACP Skills. JSONL remains the durable transcript source, while connected active conversations and the foreground conversation hold an in-memory transcript mirror for live UI rendering.

## Problem

ACP Chat still splits transcript truth across JSONL pages, live deltas, host delta queues, and front-end local transcript state. That makes cold switching, streaming updates, and stale resyncs fragile. The panel shell also rebuilds on transcript-only changes, so prompting text chunks can disrupt banner controls and drawers.

The session drawer has drifted too: the back end already publishes `backendChatSessions`, but the front-end drawer only projects the active backend's `chatSessions`.

## Goals

- Make the foreground ACP Chat snapshot carry the transcript items rendered by the front-end.
- Keep JSONL as durable storage and cold hydrate source.
- Keep full transcript mirrors for connected active conversations and the foreground conversation.
- Remove ACP Chat transcript page/delta wire paths.
- Return cold conversation selection immediately with transcript loading state, then render after hydrate.
- Prevent transcript-only updates from rebuilding banner, drawer, reply, permission, and details regions.
- Show all backend sessions in the ACP Chat session drawer.

## Non-Goals

- Rework ACP Skills transcript rendering.
- Rework legacy SkillRunner transcript rendering.
- Preserve removed ACP Chat page/delta protocol compatibility.
