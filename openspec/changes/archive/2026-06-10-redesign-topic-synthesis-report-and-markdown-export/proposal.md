# Change: Redesign Topic Synthesis Report and Markdown Export

## Why

Topic synthesis currently maintains two user-facing Markdown surfaces:

- the runtime-owned `synthesis_report.body`;
- the Host-rendered `current/export.md` compatibility export.

This split causes drift. The Report page should display the actual runtime
report, while export should be a user action over that same report body. The
stored topic artifact no longer needs a second persisted Markdown export file or
Markdown-specific hashes.

## What Changes

- Treat `result/sections/synthesis_report.json.body` as the only canonical
  report Markdown source.
- Replace the split runtime report generator with a Chinese fixed template that
  renders from the complete structured artifact sections.
- Stop writing `current/export.md` and stop storing markdown/export hashes in
  current metadata or topic detail DTOs.
- Remove Topic Details toolbar actions for Markdown export and opening the
  topic folder.
- Add Report-tab actions to copy the report body and export it as Markdown via
  a Host save-path picker.

## Impact

This is a hard cut for newly applied topic synthesis artifacts. Existing
`current/export.md` files are not migrated or read as a fallback. The structured
artifact and `synthesis_report.body` remain the topic display and report source
of truth.
