# fix-host-bridge-audit-findings-round-1

## Summary

Repair confirmed Host Bridge audit findings without changing the public CLI command surface: bound the notification inbox, harden diagnostic redaction, make cache invalidation effect wording match the current implementation, tighten profile semantic checks, fix an in-scope OpenSpec parser issue, and remove duplicated Artifacts column item classification.

## Motivation

The audit found several control-plane and governance issues that can create runtime memory growth, leak diagnostic implementation details, or let semantic/generated profile guidance drift from the SSOT. These are correctness and maintenance problems rather than new product capabilities.

## Non-Goals

- No new Host Bridge API or CLI commands.
- No scoped Synthesis cache invalidation implementation.
- No broad cleanup of legacy CLI structs or defensive client-side validation.
- No repair of unrelated OpenSpec strict-validation failures.
