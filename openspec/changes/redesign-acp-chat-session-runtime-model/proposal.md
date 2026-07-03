# Redesign ACP Chat Session Runtime Model

## Summary

Redesign ACP Chat so the chat session, not the backend, is the runtime unit. Each local session owns its connection state, optional live adapter, remote session id, permission state, diagnostics, and transcript mirror. The selected backend/session pair is only the foreground UI target.

## Problem

ACP Chat currently exposes multiple local conversations, but runtime state is still owned by a single backend slot. Switching or creating a session disconnects the backend slot, prompting blocks unrelated session actions, and connection status is projected from the backend rather than the session. This conflicts with the intended task-like ACP Chat model and causes state splits between drawer rows, banner controls, and active transcript rendering.

## Goals

- Make `backendId + conversationId` the ACP Chat runtime identity.
- Allow multiple sessions under the same backend to be independently connected, prompting, disconnected, selected, and archived.
- Allow creating and switching sessions while another session is prompting.
- Keep connected/prompting sessions and the foreground session backed by a complete transcript mirror.
- Release an idle session mirror only after it is no longer foreground.
- Keep JSONL as transcript persistence and cold hydrate source.
- Preserve existing ACP Chat status values and remote session restore behavior.

## Non-Goals

- Simplify or rename `AcpConnectionStatus` values.
- Reintroduce ACP Chat transcript page/delta UI protocols.
- Preserve the backend-slot runtime model.
