## Overview

Use the content package installer as the single source for progress stages. UI entry points consume the same progress snapshot instead of inventing their own local progress counters.

## Progress Model

The progress DTO is intentionally coarse:

- `stage`: stable stage id.
- `current` / `total`: step count for progress text.
- `percent`: derived integer percent.
- `label`: English developer fallback for non-localized internal consumers.
- `active`: whether an install is currently running.

The installer accepts an optional `onProgress` callback. The hook layer wraps installs with a shared in-memory progress store so Preferences can query the latest snapshot during an active install.

## Stage Mapping

Stages are mapped to a small fixed sequence:

1. `check-feed`
2. `download-package`
3. `verify-package`
4. `extract-package`
5. `stage-content`
6. `promote-content`
7. `write-state`
8. `refresh-registry`
9. `complete`

Failures retain the latest active stage until the hook clears progress after the operation returns.

## Toast Behavior

Startup and workflow menu install flows show a sticky progress window line immediately after the user starts installation. The line uses the same ProgressWindow mechanism as startup feedback, with progress updates when available. On completion, the progress line closes and the existing final success/failure notification behavior remains visible.

If the ProgressWindow API is unavailable, the install still runs and completion notifications keep working.

## Preferences Behavior

The official package section gains a progress row using the existing custom progress bar styling. During install, Preferences shows localized progress text from the shared snapshot and disables install/check actions. When no install is active, the row is hidden and existing status text remains authoritative.

## Non-Goals

- No byte-level download progress.
- No parallel install queue.
- No transport or feed schema change.
- No change to installed package state schema.
