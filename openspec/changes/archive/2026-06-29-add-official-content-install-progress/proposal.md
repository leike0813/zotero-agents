## Why

Official Workflow package installation currently has no visible in-progress feedback when started from the startup update prompt or the workflow shortcut menu. Users only see a toast after the install finishes, so long downloads or package writes look idle. The preferences page also has official package controls, but it does not share a progress model with the install runtime.

## What Changes

- Add a shared official content package install progress snapshot with coarse stages.
- Emit progress from the official content package installer while it checks, downloads, verifies, extracts, stages, promotes, rescans, and completes.
- Show an in-progress spinner/progress toast immediately after users confirm startup install or trigger install from the workflow menu.
- Keep the final success/failure toast text aligned with the current completion behavior.
- Reuse the shared progress snapshot in Preferences and render it with the existing custom progress bar style.

## Capabilities

### Modified Capabilities

- `content-package-subscription`: Official content package installation exposes coarse, UI-consumable install progress.
- `workflow-menu`: Workflow shortcut installs show immediate install-in-progress feedback.

## Impact

- Affects official content package installer progress reporting.
- Affects startup update prompt and workflow menu install feedback.
- Affects Preferences official Workflow package UI.
- Adds localized progress labels for all shipped locales.
