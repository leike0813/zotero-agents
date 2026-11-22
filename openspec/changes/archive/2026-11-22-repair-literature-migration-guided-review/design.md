# Design

## Context

The run settles each parent independently. Its progress currently reports only a completed count, and the generic fallback can hide the step that failed. Review pages are already bounded and filter the complete preview.

## Goals

- Make selected writes and pending review legible before and during application.
- Preserve the pre-write source checks, explicit confirmation, and parent-set transaction boundary.
- Reproduce the failing write with the same host and data on an isolated copy.

## Decisions

- Publish applying outcome counts after each receipt is persisted, using the existing Dashboard progress snapshot.
- Keep pending and skipped counts independent of document filters. Link each pending reason to its strategy step and preserve existing choices and issue identities when recalculating eligibility.
- Place the problem-step controls directly below the strategies and retain the fixed final application footer.
- Capture the original exception only in the isolated investigation. Persist stable stages and sanitized diagnostic facts through the existing attempt and run contracts.
- Keep each staged file associated with the exact directory reservation. The Windows host may return a path with repeated separators even though the staged file path is normalized.
- Defer retirement of replaced v1 and v2 source images to the verified cleanup tail. If the new attachment cannot be read, use the existing compensation path to restore the source note and record the verification failure.

## Risks

- A different build, profile, or data snapshot may bypass the failing write. Record their identities and compare the same eligible group before and after the repair.
- New issues can change group ordering. Keep the active group keyed by reason.
