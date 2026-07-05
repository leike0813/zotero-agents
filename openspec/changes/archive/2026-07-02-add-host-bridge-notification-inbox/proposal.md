# Add Host Bridge Notification Inbox

## Summary

Add a lightweight Host Bridge notification inbox for workflow and skill-run
runtime events. The inbox lets Hermes and the Zotero Librarian profile list,
wait for, and acknowledge workflow/skill-run state changes without using
transcripts, streaming watch endpoints, webhooks, or cursor event streams.

## Problem

`run active` and `run get` expose current state, but an agent still has to poll
multiple runtime surfaces and infer whether a workflow completed, failed, is
waiting for input, or produced a recoverable skill run. Direct callbacks from
Zotero to the agent are not reliable in every runtime mode and can lose events
when an agent process is unavailable.

## Goals

- Provide a Host Bridge-owned notification inbox as the authoritative v1 event
  source.
- Keep events lightweight and handle-oriented.
- Expose REST and canonical CLI commands under `run notification`.
- Support short polling through a CLI `wait` command.
- Keep webhook delivery, SSE, watch, and transcript access out of this change.

## Non-Goals

- No webhook subscriptions.
- No streaming watch/cursor protocol.
- No transcript, workspace path, provider-private payload, token, or full error
  text in events.
- No durable storage guarantee across Zotero restart in v1.
