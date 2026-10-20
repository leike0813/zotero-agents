# Design

## Context

See proposal.md for motivation. The actual pre-merge baseline is `77834172aa5aaf366bddfc538919fb844173a620`; the retained `e210997a` fixture is an earlier independent identity. Native bounded operations currently share ten seconds, CLI HTTP reads thirty seconds, and MCP execution forty-five seconds. Export input admits 100 refs but Host delivery admits only 256 entries.

## Goals / Non-Goals

**Goals:** preserve existing synchronous results and repair confirmed observable regressions in their current semantic owners; provide an explicit disposition for every baseline method and honest evidence classifications.

**Non-Goals:** restore retired owners, add automatic retries, introduce caller batching or an export operation-polling API, install dependencies, commit, or publish.

## Decisions

1. Use the existing production operation manifest as the deadline source. Artifact read, manifest, and export receive 120 seconds; transport consumers derive their waiting windows with grace. Project the three artifact capabilities into CLI/MCP without adding a second duration table. Keep unrelated deadlines unchanged. Raising only the sidecar timeout would still fail at outer transports.
2. Derive export entry capacity from the existing artifact request schema (paper capacity × artifact kinds + manifest). Keep byte limits and pre-I/O path validation; a fixed 15-paper batch would encode machine speed rather than a contract.
3. Preserve timeout IO errors at the Rust transport boundary and typed native errors through grouped client and Host Bridge projection. Reuse the existing error response vocabulary, preserving maintenance conflict and redaction behavior. No text matching or provider-specific fallback.
4. Add a new source-fixed pre-merge inventory/behavior fixture alongside the existing earlier fixture. Map moves and approved retirements to their current owner and approval evidence; do not infer loss from a name change. Reuse native production scenarios and existing domain suites, adding tests only for uncovered stable risks.
5. Keep content validation before materialization and the manifest as the final write. Exercise delayed Host retrieval and delivery failures so a successful receipt cannot precede complete output. Reuse the unified isolated Zotero runner for the Planned Topic prepare path and current-source native binaries.

## Risks / Trade-offs

- Longer synchronous work occupies its admitted slot longer → preserve admission limits and bounded total deadlines; verify delayed cases without widening unrelated timeouts.
- A broader entry count can still exceed byte limits → retain explicit pre-I/O byte rejection and test both capacities.
- Historical source contains obsolete ownership details → isolate baseline evidence, preserve approved changes, and keep missing runtime evidence marked uncovered.
- Prebuild/content freshness can prevent an XPI acceptance run → record the exact failed requirement and retain incomplete task status rather than substituting mock evidence.

## Migration Plan

No data schema migration is required for these shared-boundary fixes. Build current Rust binaries, run focused regression and domain checks, complete build preflight, then exercise the current plugin on an isolated copy. Keep source profiles read-only. Audit-discovered fixes follow the same red/green and acceptance sequence.
