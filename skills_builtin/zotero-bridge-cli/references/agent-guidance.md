# CLI Contract And Recovery

## Identity

Use the workspace-local CLI and run:

```text
zotero-bridge surface identity --json
```

The version, build fingerprint, and command catalog checksum must match the loaded surface. If any field differs, use the wrapper and CLI from the same release set. Do not continue by comparing SemVer alone.

## Discovery

Describe a known command with `surface describe <command> --json`. Search by intent with `surface search --intent <intent> --json`. These commands are offline and do not require a Zotero profile or token.

## Connection

After identity succeeds, use `bridge status`, then authenticated profile or backend diagnostics when needed. Preserve injected profile and token environment variables and never print credentials.

## Errors

Treat the structured error envelope as authoritative:

- Retry only when `retryable` is true.
- If `stateChanged` is true, inspect current state before issuing another write.
- If `handleConsumed` is true, do not reuse the handle.
- Execute only a suitable entry from `safeNextActions`; prefer `nextCommand` when present.
- For agent apply-back, query `workflow agent-apply-status <agentRunId>` before recovery.

Load the generated command reference only when `surface describe` does not provide enough payload detail.
