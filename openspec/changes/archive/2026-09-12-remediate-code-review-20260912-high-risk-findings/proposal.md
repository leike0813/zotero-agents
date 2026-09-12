## Why

The 2026-09-12 review identified several trust-boundary, lifecycle, persistence, and algorithmic risks. Reproduction against the current code confirms a bounded set of real defects, while one reported runtime-persistence issue is obsolete and must not be reintroduced.

## What Changes

- Authenticate and classify Host Access requests before accepting route-sized bodies, cap accepted connections, cache master-token decryption safely, and preserve Broker error metadata through MCP.
- Enforce existing archive limits before extraction and keep output-contract artifacts inside their run directory.
- Settle ACP timers and permission requests on every lifecycle exit, and make Assistant Workspace flush drain work queued during an in-flight flush.
- Harden shared Markdown URL sanitization, parse one-line display math correctly, and regenerate the deep-reading package from its canonical source.
- Remove quadratic mutation and durable-bundle update paths without changing public DTOs.
- Journal stored-attachment replacement so interrupted swaps recover before Host services start.
- **BREAKING** Replace collision-prone Topic directory slugs with a deterministic slug-plus-full-hash identity, migrate supported repositories and canonical Topic roots explicitly, and bump the repository foundation schema.
- Clean up failed Synthesis production endpoint setup while preserving explicit recovery as the only retry path.
- Correct the stale Topic Synthesis skill specification: the minimal runtime does not persist gate/action transcripts, stage receipts, or an artifact registry.
- Record the disposition and verification evidence for every high-risk review item in the originating report.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `host-http-request-reading`: Add header-first admission and route-specific body continuation, plus a bounded accepted-connection count.
- `host-bridge-service`: Require authentication before request-body consumption and preserve stable Broker error metadata through MCP.
- `zotero-host-broker-capability-api`: Recover interrupted stored-attachment replacement before capability service admission.
- `synthesis-topic-path-identity`: Replace the collision-prone path formula and define explicit startup migration.
- `synthesis-production-owner-cutover`: Define cleanup and explicit recovery after endpoint or supervisor construction failure.
- `topic-synthesis-skills`: Remove obsolete transcript, receipt, and registry persistence requirements from the minimal runtime contract.

## Impact

The change affects the Host Access listener and authentication path, MCP projection, workflow archive reader, SkillRunner output finalization, ACP lifecycle helpers, Assistant Workspace publication flushing, shared Markdown/deep-reading generation, Zotero mutation recovery, Synthesis contracts and Rust storage startup, related tests, persistence documentation, and the review report. It adds no dependency and does not publish or prebuild release artifacts.
