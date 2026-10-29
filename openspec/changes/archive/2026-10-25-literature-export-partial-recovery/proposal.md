# Proposal

## Why

An unreadable payload or note currently aborts an entire literature export. Intact canonical data with missing anchors is also rejected, preventing users from retrieving healthy material from mixed collections.

## What Changes

- Recover unique, valid main and auxiliary payload associations in detached export copies, leaving the library unchanged.
- Add opt-in partial materialization with per-unit diagnostics; preserve strict defaults and missing-file policy.
- Deliver healthy content alongside recovery material and an integrity-tracked export report. Report completed, partial, or failed according to actual delivered content.
- Continue after local payload, image, note, attachment, and paper failures; propagate cancellation, timeout, shutdown, write failure, and global resource exhaustion.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `managed-literature-artifacts`: private transfer recovery and isolated bundle materialization failures.

## Impact

Private managed-note transfer, Workflow Host DTOs and resource ownership, shared research materialization, literature/research workflow packaging and feedback, existing regression tests, codec documentation and export help. No dependencies, source-library writes, publication, or Git operations are required.
