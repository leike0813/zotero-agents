# Shared Assistant Transcript Pagination Virtualization

## Summary

Move paginated transcript virtualization, page caching, scroll anchoring, and
stickiness into the shared Assistant transcript renderer. ACP Skills will pass
its selected transcript page to the shared renderer and stop maintaining a
separate virtualization stack.

## Problem

ACP Skills currently owns a second transcript virtualization implementation on
top of the shared transcript renderer. The duplicated scroll and stickiness
state can fight the shared renderer, forcing sticky bottom behavior after the
user scrolls away and creating scroll/render/page-load loops that can make the
panel jitter or delay run switching.

## Goals

- Make `AssistantTranscriptRenderer` the only owner of transcript virtual page
  cache, virtual windows, spacer rows, scroll anchoring, and stickiness.
- Keep ACP Skills selected transcript data page-based and metadata-only.
- Prevent stale transcript page requests from a previously selected run from
  replacing the current ACP Skills panel snapshot.
- Preserve the existing shared transcript row rendering, markdown, tool,
  permission, and copy behavior.

## Non-Goals

- Change the ACP Skills JSONL transcript store or `selectedTranscriptPage`
  snapshot shape.
- Restore `selectedRun.transcriptItems`.
- Migrate ACP Chat to paginated virtualization in this change.
