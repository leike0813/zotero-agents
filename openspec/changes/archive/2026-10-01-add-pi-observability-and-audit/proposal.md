# Proposal

## Why

The completed Pi Conversation and Skill Run owners lack bounded structural audit and user-requested diagnostic export. C18 completes the accepted issue #26 contract; the user also approved minimal canonical failure-contract completion within this change because the prerequisite code has only separate error-code projections.

## What Changes

- Persist one typed canonical failure observation with stable references and reuse a shared failure-code policy.
- Generalize the existing ACP audit append queue, preserving ACP behavior, and use it for bounded Pi owner audit.
- Reuse RuntimeLogEntry normalization for structural-only, tier-controlled, canonical-first evidence with explicit gaps.
- Export one owner or global diagnostics as a bounded atomic ZIP through existing Workspace and Backend Manager surfaces.
- Include audit in the existing owner quota and cleanup, keeping business resources ahead of diagnostic evidence.

## Capabilities

### New Capabilities

- `pi-failure-contract`: Canonical structured failure identity, classification and non-context references.
- `pi-runtime-audit`: Fact ownership, tiers, bounded storage/queues, lifecycle and privacy-safe diagnostic export.

### Modified Capabilities

- `runtime-log-pipeline`: Add typed Pi correlation fields and reusable normalization without a second log schema.
- `pi-trusted-native-execution`: Account and reclaim audit within the existing shared owner quota, including nested workspaces.

## Impact

Pi Runtime/Provider/Gateway/persistence/owner seams, ACP append infrastructure, Runtime Log, existing Workspace and Backend Manager contracts/components, locale resources and ADR 0003. No new dependency, Node runtime, health subsystem, event bus or automatic upload. C19 process lifecycle and C20 release acceptance stay separate.
