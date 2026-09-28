# Design

## Context

See [proposal](proposal.md). ACP currently combines command planning, byte transport, process cleanup, and ACP diagnostics in one transport file. Its Windows service and Rust daemon are ACP-named although the wire forwards opaque bytes. The project already has a one-shot subprocess seam; long-lived streams need a separate contract.

## Goals / Non-Goals

**Goals:** Give ACP and subsequent native tool callers a single resolved-process boundary, with separate bounded streams and honest exit evidence. Retain ACP's public behavior and Windows broker safeguards.

**Non-Goals:** Implement Pi tools, change ACP JSON-RPC framing, introduce shell command strings, or replace the one-shot subprocess seam.

## Decisions

1. Place the long-lived process interface under `src/platform`. The caller supplies the resolved executable, argv, cwd, and sanitized environment; command resolution remains with its existing owner. Windows ACP maps the process stream/lifecycle result into its current transport DTO. Existing POSIX ACP process-group cleanup remains in place because it has stricter ownership validation than the generic direct-child adapter. This avoids making a future caller depend on ACP.
2. Use late-bound host adapters: Mozilla Subprocess on Linux/macOS Zotero, a singleton loopback WebSocket broker on Windows Zotero, and Node in tests. Keep native APIs out of plugin module initialization. The broker protocol moves to `/v1/stdio`, preserving token, ready-file, content-addressed staging, frame limit, per-connection child, and stdout/stderr separation.
3. Treat stdin EOF as its own control operation. An EOF keeps the socket and read streams alive. On Windows, a terminate request attempts process-tree cleanup; observed child exit is the preferred proof. A socket close or dispatched kill alone yields unknown outcome.
4. Limit pending bytes per stream and input write. Overflow fails explicitly and triggers cleanup. Keep the existing 16 MiB frame ceiling. ACP retains its smaller diagnostic text capture limit.
5. Rename Rust crate, build scripts, and package asset together. A new Windows binary must be built from the renamed source on Windows; an old ACP binary cannot be renamed and called the new protocol.

## Risks / Trade-offs

- Windows host unavailable now → Node/Rust contract tests can run locally, but the new binary and real Zotero canary remain open gates; keep the change active.
- Process-tree termination may race with child exit → record observed exit and explicit uncertainty; never claim kill success from a disconnect.
- ACP transport is large → migrate only process ownership and streams; leave ACP framing and diagnostics in place to minimize behavior drift.

## Migration Plan

1. Add contract tests for EOF, stream separation/bounds, exit evidence, and ACP adapter behavior.
2. Implement the platform seam and migrate ACP.
3. Rename and extend Rust broker, scripts, package checks, and lifecycle shutdown hook.
4. Run Node tests, lint, build, Rust tests, and OpenSpec validation. On Windows, prebuild the binary, verify package hashes, and run the Zotero canary before archiving.
5. If Windows verification fails, keep the active change and retain failure evidence; do not ship a renamed stale binary.
