# Assistant Transcript Rendering Preference

## Summary

Add a user-facing preference for ACP Skills transcript pagination and
virtualization, group UI-related preferences into a dedicated preferences
section, and rename the Host Bridge preferences section to Agent Interface.

## Problem

The shared transcript pagination/virtualization path is now the default for ACP
Skills long transcripts. If the virtualized path regresses in a Zotero/Gecko
environment, users need a safe kill switch that does not immediately mutate the
currently loaded transcript view.

The preferences page also mixes UI preferences into the workflow configuration
section, while Host Bridge is now part of the broader agent interface surface.

## Goals

- Add a default-on preference for ACP Skills transcript pagination and
  virtualization.
- Apply preference changes only to the next selected transcript scope, not the
  currently loaded transcript.
- Move Markdown Reader and Assistant Workspace live rendering preferences into
  a new User Interface section between Backends and Agent Interface.
- Rename the Host Bridge preferences section title to Agent Interface in all
  active locales.

## Non-Goals

- Restore full transcript snapshots on `selectedRun`.
- Change JSONL transcript persistence or `selectedTranscriptPage` wire shape.
- Add immediate live re-rendering when the preference changes.
