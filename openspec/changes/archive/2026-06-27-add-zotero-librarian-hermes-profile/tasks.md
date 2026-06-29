## 1. OpenSpec

- [x] Add proposal, design, tasks, and delta specs for the profile change.
- [x] Validate the change with OpenSpec.

## 2. Host Bridge And CLI

- [x] Add `library.sync_snapshot` DTOs and capability implementation.
- [x] Add `zotero-bridge library list` and `library snapshot` commands.
- [x] Include the new library command family in generated Host Bridge surfaces.

## 3. Profile Distribution

- [x] Add the `profiles/hermes/zotero-librarian` source tree.
- [x] Add the SQLite index/workflow/run helper script.
- [x] Add Hermes cron templates for refresh, monitoring, triage, hygiene, and
  attention queue jobs.

## 4. Rendering And Release

- [x] Add profile rendering and check scripts.
- [x] Publish profile assets, CLI prebuilds, profile example, and manifest to a
  dedicated branch.
- [x] Update the GitHub Host Bridge CLI workflow and release-pipeline skill.

## 5. Tests And Verification

- [x] Add profile distribution, SSOT, and helper-script tests.
- [x] Update existing Host Bridge CLI packaging tests.
- [x] Run targeted validation commands.
