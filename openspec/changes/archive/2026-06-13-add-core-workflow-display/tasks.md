## 1. Specs

- [x] Add OpenSpec deltas for manifest display metadata, menu grouping, Dashboard badge rendering, and workflow-owned copy.

## 2. Implementation

- [x] Extend workflow manifest types and schema with `display.core` and `display.emoji`.
- [x] Add centralized helpers for core status, emoji label formatting, and core-first ordering.
- [x] Update workflow menu grouping and Dashboard home render models.
- [x] Mark selected built-in workflows as core with emoji and fill missing zh-CN locale resources.
- [x] Document display metadata and localization ownership.

## 3. Validation

- [x] Extend focused schema/display/UI/builtin smoke tests.
- [x] Run focused node tests, built-in manifest check, TypeScript check, and strict OpenSpec validation.
