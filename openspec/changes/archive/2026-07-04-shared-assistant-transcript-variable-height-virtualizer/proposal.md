# Shared Assistant Transcript Variable-Height Virtualizer

## Summary

Upgrade the shared Assistant transcript virtualizer from fixed estimated row
height windows to measured variable-height windows with scroll anchor
preservation.

## Problem

The current virtual transcript window maps `scrollTop` to an item index using a
single estimated row height. A single wrapped message can be much taller than
the viewport, so the fixed-height mapping becomes inaccurate. When the user
scrolls through such a row, spacer recalculation can jump the viewport or pull
the scroll position back toward the previous window.

## Goals

- Use measured row heights when available for virtual window selection and
  spacer sizing.
- Preserve user scroll continuity with a stable row anchor when the virtual
  window rerenders.
- Keep sticky-bottom behavior for transcript tails that are already sticky.
- Keep ACP Skills delegated to the shared transcript renderer without adding
  panel-specific scroll logic.

## Non-Goals

- Change ACP Skills transcript JSONL storage, hydrate, or page DTO shape.
- Restore full transcript payloads in `selectedRun`.
- Introduce a tall-row virtualization disable fallback as the primary fix.
- Add `ResizeObserver` in this change.
