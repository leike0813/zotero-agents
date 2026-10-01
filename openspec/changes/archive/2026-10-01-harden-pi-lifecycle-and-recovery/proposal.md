# C19: Harden Pi lifecycle and recovery

## Why

Pi owners already persist execution facts, but production startup does not discover them and shutdown does not dispose Skill Runs. Missing process admission, physical settlement and retention coordination can leave unresolved work unaccounted for or remove files still needed by executors.

## What Changes

- Introduce one process lifecycle owner for startup inventory, restored Workflow reservations, foreground/background admission, durable active budgets and a shared shutdown deadline.
- Reconcile original tool invocations with authoritative Broker evidence without replay; preserve unknown outcomes and require explicit continuation after resolution.
- Recover safe checkpoints serially, repair only torn tails, preserve damaged histories, and complete existing idempotent result/apply/ack paths.
- Add hold-safe two-phase Skill Run deletion and daily non-overlapping retention maintenance, while keeping Conversation histories until explicit deletion.
- Compose existing Runtime, Gateway, native/MCP/Web executors and Workspace recovery actions with physical settlement, timeout and cancellation evidence.

## Capabilities

### New Capabilities

- `pi-runtime-lifecycle`: Process admission, owner recovery isolation, execution budgets, shared shutdown and maintenance.

### Modified Capabilities

- `builtin-pi-owner-persistence`: Bounded owner inventory, safe checkpoints and hold-safe cleanup.
- `pi-tool-gateway-policy`: Durable Broker invocation binding and physical claims after logical cancellation.
- `pi-skill-run-integration`: Restored reservation and budget integration, safe continuation and result reconciliation.
- `pi-conversation-integration`: Process admission, explicit recovery checks and safe deletion.
- `pi-trusted-native-execution`: Physical settlement and crash-safe staging cleanup.
- `pi-runtime-audit`: Lifecycle evidence and deadline-bounded shutdown flush.

## Impact

Baseline: `7efd7044def0f91e3d99805ca1df149fe9845f4d`. Implements the accepted C19 plan and Q205–Q227 in GitHub #26. Affects hooks, existing Workflow submission queue/seams, Pi owner persistence/coordinators, execution adapters, Workspace actions and their behavior tests. Reuses the canonical Broker observation and existing plugin database/filesystem adapters; adds no dependency, runtime framework, database or separate UI. Full candidate matrix, account smoke and performance selection remain C20.
