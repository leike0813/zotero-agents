## Why

The Zotero Bridge CLI publishes 125 canonical leaf commands, but response sizing is
currently inferred from capability tags and a command-name cursor allowlist. Several
commands are described as cursor-paged while their runtime responses omit a usable
continuation, and some read or write paths can still place unbounded collections or
large text payloads on stdout. This drift prevents agents from predicting memory,
transport, and recovery behavior from the offline command contract.

## What Changes

- Give every canonical command one explicit output-boundary policy: fixed, cursor,
  offset, limit, file, or raw.
- Add one criteria-bound opaque cursor implementation shared by Host Bridge endpoint
  and capability projections.
- Make cursor pages report the domain collection plus `nextCursor`, `hasMore`,
  `returned`, `total`, and the effective `limit`.
- Lower ordinary rich-object pages to a default of 25 and a maximum of 100.
- Deliver large exports, artifacts, review input, and full diagnostics through
  Host Bridge file handles rather than bulk stdout payloads.
- Keep semantic command responses bounded and reserve `call` for raw-only escape
  hatches; raw calls inherit the target capability's boundary.
- Extend contract, runtime, CLI, MCP mirror, renderer, and package gates so declared
  boundaries and observed DTOs cannot drift.

## Impact

- Affected specs: `host-bridge-output-boundaries`, `host-bridge-cli-interface`, and
  `host-bridge-agent-surfaces`.
- Affected code: CLI argv/path construction and surface search, Host Bridge server and
  capability registry, workflow control, Zotero library broker, Synthesis services,
  command-contract schemas, surface generation, and focused tests.
- No release version, prebuild, branch, commit, release dispatch, or Gitee operation is
  part of this change.
