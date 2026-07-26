## Why

ACP Trace & Replay is intended to be debug-exclusive, but production bundles still retain diagnostic ownership/context construction, recorder calls, Replay synthetic seams, and Workspace publication acknowledgement plumbing. The repository needs one auditable release-elision contract that prevents debug diagnostics from adding production bytes or hot-path work across ACP and SkillRunner.

## What Changes

- Introduce a shared production-isolation capability that defines debug-exclusive modules, forbidden production runtime markers, narrow static allowlists, and non-debug/source-disabled acceptance rules.
- Strengthen ACP semantic trace isolation so production builds contain neither recorder bodies nor owner/context construction, update-field reads, or empty recorder calls.
- Strengthen Replay and performance-profiler isolation so production Chat, Skills, and Workspace paths contain no Replay state, profile-context lookup, synthetic helper, acknowledgement branch, or publication-drain bookkeeping.
- Move Replay publication acknowledgement into a debug-exclusive sidecar with a narrow, fully elidable Workspace port while preserving rendered-snapshot confirmation, owner/readiness rules, logical cadence, and DOM identity.
- Keep existing SkillRunner governor instrumentation unchanged, but verify its audit store, projection, and recorder calls through the same release-elision gate.
- Preserve static Dashboard templates, locale content, hidden route keys, and type-only DTOs; do not introduce asset splitting, storage migration, protocol changes, or compatibility layers.

## Capabilities

### New Capabilities

- `debug-diagnostics-production-isolation`: Cross-module release-elision contract, build-manifest SSOT, production marker policy, static allowlist, and artifact acceptance gate for ACP and SkillRunner diagnostics.

### Modified Capabilities

- `acp-runtime-semantic-trace`: Require all trace owner/context construction, update access, recorder calls, schema/runtime markers, and exclusive modules to be absent from non-debug and source-disabled bundles.
- `acp-runtime-replay-profiler`: Require Replay state, synthetic seams, logical-time helpers, Workspace acknowledgement plumbing, and replay-only publication behavior to be absent from production hot paths while retaining debug behavior.
- `acp-runtime-performance-profiler`: Extend zero-byte and marker-free production acceptance to profile-context computation and Replay publication attribution seams.

## Impact

The change affects the runtime diagnostics build configuration and release-elision tests; ACP adapter/session/orchestrator/store instrumentation; Replay production ports and a new publication sidecar; Assistant Workspace host and child-sidebar publication code; focused Node/UI tests; and debug, Trace & Replay, and test-framework documentation. It does not change backend protocols, persisted trace/result formats, public workflow contracts, user data, dependencies, or the existing SkillRunner governor call layout.
