# Design: Assistant Workspace Contract Safety Net

## Context

Phase 0 of the Assistant Workspace refactor
(`artifact/assistant-workspace-refactor-plan-20260718.md`). Every later phase
(framework migration, SkillRunner convergence, data-plane merge) assumes this
safety net exists on `main` as the drift contract between the long-lived
refactor branch and the evolving mainline.

## Decisions

### D1. Importable field registries over source extraction

Both peers' key lists were function-local constants. Alternatives: parse
source text/AST in tests (brittle), or probe validator behavior with generated
fixtures (coarse errors). We hoist the lists to exported constants on both
sides — a minimal, behavior-preserving change — and compare them directly in
`test/core/190`. This is also the natural first step toward the Phase 1
single-source codegen. Nested coverage stops at the permission-request key
list; deeper nesting stays behavior-tested by `test/core/184` until Phase 1.

### D2. Producer self-check at the construction funnel

`AssistantWorkspacePublicationCoordinator.createPublication` is the sole
construction point for all region and transcript publications. Asserting
there (debug builds only) catches producer-side drift at the moment it is
introduced, before any transport. The gate follows the existing
`SKILLRUNNER_CONNECTION_AUDIT_ENABLED` pattern: a literal capability switch in
`debugMode.ts`, an esbuild define, and a test override setter, so release
builds fold the check out entirely.

### D3. Fixtures from production constructors, with two documented exceptions

Data-plane tests keep their scenario assertions but source payloads from
`readAcpSkillRunWorkspaceRegions` / `readAcpChatWorkspaceRegions` /
`createAssistantWorkspaceTranscriptPage`. `service-status` (host-bridge
singleton) and acp-skills `owner-details` (runtime directory files) keep
hand-written fixtures, each guarded by a smoke assertion that the production
constructor's current output passes `assertAssistantWorkspacePublication`.

### D4. SkillRunner boundary: production/consumption contract over source text

The old `test/core/71` matched regexes against source files. The rewrite
captures a real `RunWorkspaceSnapshot` through `attachSkillRunnerSidebarHost`
with injected `publishSnapshot`, consumes it through the vm-loaded
`projectSkillRunnerPanelSnapshot`, and records receiver field access with a
recursive Proxy: phantom reads (receiver consuming fields the producer never
sends) fail; a curated set of critical fields must be consumed;
produced-but-unconsumed fields are reported, not failed. Assertions already
covered behaviorally by tests 65/83/84 are deleted, not re-implemented.

### D5. Subtree-depth identity for region isolation

`test/core/97` already asserted node identity but only for region mount
nodes, which the renderer reuses permanently — a guard miss rebuilding mount
content was invisible. Assertions now capture each region's full subtree node
list and compare element-wise by reference, locking the behavior the Phase 2
framework migration must preserve (framework keyed diff satisfies the same
identity semantics).

## Risks

- Deepened 97 assertions could expose a pre-existing guard miss; if so, it is
  reported before any fix decision — assertions are not relaxed to pass.
- The SkillRunner snapshot capture path starts background observers; seeds use
  terminal runs or the mock backend, and every case resets the host singleton.
- Standalone single-file mocha runs may exceed the default 2s hook timeout on
  cold tsx compilation of the global cleanup hook; use `--timeout 20000` for
  standalone runs. The aggregated suite is unaffected.
