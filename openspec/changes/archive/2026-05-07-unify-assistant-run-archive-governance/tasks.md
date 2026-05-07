# Tasks

## 1. OpenSpec Artifacts

- [x] Create proposal, design, tasks, and delta specs for Assistant run archive governance.

## 2. Shared Managed Drawer

- [x] Add `itemActions` support to workspace/task drawer items.
- [x] Render archive as a right-side non-selecting action button with briefcase icon and `归档` tooltip.
- [x] Keep drawer item selection behavior unchanged.

## 3. ACP Chat

- [x] Add archive item action to ACP Chat conversation drawer tasks using existing `archive-conversation` host action.
- [x] Keep ACP Chat archive store/host behavior unchanged.

## 4. ACP Skills

- [x] Add `archivedAt` to ACP Skills run records and summaries.
- [x] Add `archiveAcpSkillRun()` and host/page `archive-run` routing.
- [x] Filter `removedAt || archivedAt` runs from default panel snapshots.
- [x] Show `Cancel Run` only for non-terminal selected runs.
- [x] Show archive item action only for terminal run drawer items.

## 5. SkillRunner

- [x] Add `archivedAt` to SkillRunner request ledger records.
- [x] Add SkillRunner `archive-run` host/page routing that marks terminal records archived without backend cancel.
- [x] Hide archived ledger records from default drawer snapshots.
- [x] Rename user-visible SkillRunner drawer controls from `Sessions` to `Runs`.
- [x] Show archive item action only for terminal run drawer items.

## 6. Validation

- [x] Update UI smoke and regression tests.
- [x] Run JS static checks.
- [x] Run ACP UI smoke tests.
- [x] Run ACP SkillRunner-compatible tests.
- [x] Run SkillRunner UI regression tests.
- [x] Run TypeScript type check.
