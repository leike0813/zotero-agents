## Why

Hermes cannot safely replace its local Zotero metadata index from ordinary live pages because cross-page drift can make absent-row deletion incorrect. A Host-owned full-library snapshot session must provide explicit completeness while preserving different Workflow and Host Bridge projections.

The fixed implementation baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`; this change depends on `01-establish-workflow-host-v12-contract-foundation`.

Architecture source: [`artifact/workflow-host-v12-architecture-decisions.md`](../../../artifact/workflow-host-v12-architecture-decisions.md), especially §§5.3, 5.9, 17, 18, and 19. The architecture record is authoritative for stable snapshot identity, continuation and rescan semantics, bounded publication, Host Bridge exposure, and required recovery evidence summarized here.

## What Changes

- Add a process-local, TTL-bounded full-library snapshot session with fixed ordering, hard limits, cancellation, and Host-issued completion evidence.
- Project the same owner as callback-scoped `library.withItemSnapshot` for trusted workflows and as an opaque snapshot/cursor protocol for Host Bridge, MCP, and CLI callers.
- Make Hermes/Zotero Librarian refresh transactional: only complete evidence may promote new rows and delete absent rows; every incomplete outcome preserves the old usable index.
- Share canonical snapshot DTOs across TypeScript, CLI, Hermes, and the Rust Synthesis owner without moving Zotero semantics into Synthesis.
- Keep snapshot sessions process-local and non-resumable after Host restart.
- Explicitly reject incremental change logs, deletion tombstone feeds, and pagination caches as correctness sources.
- Govern the affected Host Bridge agent-facing surfaces against the fixed baseline with an empty semantic deletion inventory.

## Capabilities

### New Capabilities

- `zotero-library-full-snapshot-feed`: Own full-library snapshot sessions, completeness, projection differences, transactional index refresh, and failure recovery.

### Modified Capabilities

- `zotero-host-broker-capability-api`: Add the Broker snapshot-session and trusted callback projection semantics.
- `zotero-library-agent-bundle`: Require local index replacement to depend on complete snapshot evidence.
- `host-bridge-output-boundaries`: Define the opaque remote snapshot identity/cursor projection without leaking process-local or filesystem state.

## Impact

- Broker/Workflow projection, Host Bridge registry, MCP protocol, Zotero Bridge CLI, Hermes profile, Synthesis library adapter/client, canonical contracts, and native application/repository paths.
- Tests: Broker snapshot session, Zotero pagination, Host read ports, native client routing, CLI/MCP projection, and Hermes index transactions.
- Agent-facing governance: baseline metrics, empty approved deletion inventory, semantic parity, instruction-depth and duplicate gates; no generated semantic target is edited directly.
- No exposure of unrelated v12 members, incremental feed, release dispatch, or Zotero user-library schema migration.
