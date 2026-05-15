# Change: Add Reference Matching Freshness Gate

## Why

`reference-matching` currently rewrites a references note whenever the workflow
is invoked, even when the note has already been matched against the same library
state and settings. This makes repeated runs noisy and prevents the workflow from
acting as a reliable "update only when needed" operation.

## What Changes

- Add a deterministic Zotero metadata library snapshot hash for matching
  candidates.
- Store reference-matching baseline metadata in the `references-json` payload
  after successful matching.
- Pass execution workflow parameters into `filterInputs` so the workflow can
  decide whether the current note/settings/library snapshot are already fresh.
- Filter fresh references notes before request creation.
- Preserve the existing matching algorithm, note payload structure, and parent
  related-item synchronization.

## Impact

- Specs: `reference-matching-workflow`
- Code: workflow runtime hook args, reference-matching package helpers and hooks
- Tests: reference-matching workflow tests and workflow runtime hook tests
