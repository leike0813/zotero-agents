# cleanup-host-bridge-control-plane-audit-followups

## Summary

Clean up Host Bridge control-plane audit follow-ups without adding public APIs or CLI commands: remove unreachable legacy CLI wrappers, add local CLI validation for unsafe refs and file handles, reduce notification projection cost, and restore full OpenSpec strict hygiene.

## Motivation

The first audit repair addressed immediate correctness and leakage risks. Remaining findings are governance and maintainability issues that can let dead command shapes, invalid local inputs, repeated history projection, and malformed archived specs accumulate technical debt.

## Non-Goals

- No new Host Bridge API or CLI command surface.
- No transcript, watch, cursor, or webhook implementation.
- No semantic requirement changes while repairing OpenSpec formatting.
- No broad plugin runtime refactor or Node-only logic in Zotero plugin code.
