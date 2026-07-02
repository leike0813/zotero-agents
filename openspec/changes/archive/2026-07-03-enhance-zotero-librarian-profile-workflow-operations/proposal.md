# enhance-zotero-librarian-profile-workflow-operations

## Summary

Enhance the Zotero Librarian profile with stronger workflow execution guidance, a dedicated agent-owned workflow skill, common task playbooks, and short-running helper scripts for workflow planning, submission, and notification inbox management.

## Motivation

The profile already exposes Host Bridge commands and workflow catalog data, but agents still need clearer operating guidance for choosing `workflow agent-run` versus Host-owned `workflow submit`, normalizing workflow selections to parent items, avoiding accidental backend concurrency, and using the notification inbox without blocking the agent loop.

## Non-Goals

- No new Host Bridge API or CLI commands.
- No changes to workflow manifests or backend runtime behavior.
- No long-polling monitor scripts.
- No generated-output-only profile edits.
