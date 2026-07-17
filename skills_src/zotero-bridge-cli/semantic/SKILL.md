---
name: zotero-bridge-cli
description: Use when an agent needs the Zotero Bridge CLI connection, exact machine-readable surface identity, command contract, or structured failure recovery.
license: AGPL-3.0-or-later
---

# Zotero Bridge CLI

This wrapper owns CLI installation, connection, exact surface identity, and output/error contracts. For bounded Zotero task routing, use the `zotero-library-agent` Skill. For resident indexing, scheduling, monitoring, and maintenance, use the Zotero Librarian profile.

## Connect

- Prefer the run-local shim supplied by the current workspace.
- Preserve `ZOTERO_BRIDGE_PROFILE`, `ZOTERO_BRIDGE_ENDPOINT`, and `ZOTERO_BRIDGE_TOKEN`; never print token values.
- Use the bundled installer only when the run-local shim and PATH command are unavailable.
- Check `bridge status` before diagnosing authenticated profile or backend state.

## Verify The Exact Surface

Run `zotero-bridge surface identity --json` without connecting to Zotero. Compatibility requires the expected CLI version, build fingerprint, and command catalog checksum to match. SemVer alone is not a compatibility decision.

Use `zotero-bridge surface describe <command> --json` for argv, approval, typed handles, retryability, state-change, and recovery metadata. Use `zotero-bridge surface search --intent <intent> --json` when the canonical command is unknown.

## Control Invariants

Read `references/control-invariants.md` before using handles, approvals, file transfer, workflows, or writeback. Do not exchange `workflowRunId`, `skillRunId`, `agentRunId`, `agentRequestId`, `fileId`, and Zotero object refs.

## Output And Failure

Stdout is one JSON envelope. On failure, use `retryable`, `stateChanged`, `handleConsumed`, `safeNextActions`, and `nextCommand` before retrying. When apply-back status is uncertain, query `workflow agent-apply-status <agentRunId>`; never infer safety from an error message alone.

<!-- host-bridge-surface:wrapper-skill:start -->
<!-- host-bridge-surface:wrapper-skill:end -->

## References

- `references/host-bridge-cli.md`: generated command and capability reference.
- `references/control-invariants.md`: shared protocol-level safety facts.
- `references/agent-guidance.md`: connection, identity, and failure-recovery procedure.
- `references/terminology.md`: shared handle and Host Bridge terminology.
