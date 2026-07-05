## Context

Recent diagnostics show that the broken state occurs when the Assistant
Workspace host can later receive shell actions through the direct bridge, but
the initial shell ready and child ready events never reached the host. The
current protocol treats those events as one-time edges. Missing an edge leaves
the host with `shellReady=false` and `readyTabs=[]` even though child snapshots
may already have been posted.

## Decisions

1. Host shell readiness is level-triggered.

   The host schedules a bounded recurring handshake whenever it has a shell
   frame window but `shell.ready` is false. Each tick reinstalls the bridge and
   sends lightweight `assistant-workspace:init`. A ready acknowledgement stops
   the loop.

2. Shell ready acknowledgement is direct-bridge only.

   The shell may still send fallback `postMessage`, but fallback delivery is
   not considered an acknowledgement. The shell retries ready until the direct
   bridge returns `ok` without `fallback`.

3. Child payload replay is independent from child ready.

   Cached child payloads are replayed after host snapshots, child frame loads,
   tab switches, and short retry ticks. A successful post to a child frame can
   clear loading for the active tab, but it does not mark the child as ready or
   cause the host to publish child-ready snapshots.

4. Existing wire shapes are preserved.

   Shell ready remains `assistant-workspace:action` with `action:"ready"`.
   Child ready remains `assistant-workspace:child-action` with `action:"ready"`.
   No new public message type is required.

## Risks

- Repeated lightweight init messages could be noisy.
  -> The loop is bounded/coalesced and stops on acknowledgement; debug logging
  makes unexpected repetition visible.
- Child replay may post the same cached payload more than once.
  -> Child panels already revision-gate rendering; replay is preferable to a
  permanent static shell.
