# Change: reduce-skillrunner-connection-density-idle-reachability

## Summary

Reduce SkillRunner plugin-side connection density under Zotero/Gecko HTTP/1.1 limits. Reachability probing becomes an idle-only recovery mechanism instead of a resident health ping. Reconciler, settlement, and UI observation requests must be bounded and classified so local transport pressure does not make the backend appear terminally unreachable.

## Problem

Dense SkillRunner workflow testing can create many short-lived local HTTP requests and long-lived streams against the same backend. In Zotero/Gecko this can pressure the browser connection pool and the Windows ephemeral port/TIME_WAIT budget. A plugin-side timeout releases the governor slot, but it does not prove Gecko has released the physical socket.

## Goals

- Reduce background reachability/history/reconcile request density.
- Preserve submit, settlement, and request-level reconcile as critical paths.
- Treat reachability probing as an idle recovery mechanism only.
- Avoid marking a backend unreachable from ordinary request-level timeout alone.
- Keep deferred apply/run projections visible while observation is degraded.

## Non-Goals

- No HTTP/2, reverse proxy, certificate, or backend protocol change.
- No ACP Skills behavior change.
- No attempt to flush Gecko's internal connection pool directly.
