# Proposal

## Why

Native Topic migration narrowed the public context and inventory contracts, so both planned and seed creation can fail before material preparation. Update preparation also loses definition, scope and discovery evidence, while successful apply can leave a running audit status.

## What Changes

- Restore public topic context views, flat/include options, request-intent echoes and local/remote output delivery, including planned topics.
- Restore complete public inventory and selector/page defaults without changing internal artifact inventory semantics.
- Capture a complete planned snapshot in the existing create workflow `buildRequest` after queue admission; send exactly the active entry parameters and name the actual target.
- Consume the captured snapshot during explicit planned preparation, preserve update semantics and complete resolver pagination.
- Refresh terminal ACP audit state after apply and controller cleanup while preserving canonical transcript projection.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `topic-synthesis-workflows`: request-time planned snapshots and exclusive entry parameters replace execution-time revalidation of an explicit planned selection.

## Impact

Synthesis TypeScript contracts/protocol schemas, Rust topic application and wire adapter, public Host Bridge normalization and host delivery, create workflow hooks, generated topic skills/runtime and focused production contract tests. Existing context and ACP state specifications remain authoritative. No hook lifecycle, dependency, publishing or data migration is introduced.
