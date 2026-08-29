## Context

See `proposal.md` for motivation. `src/platform/subprocess.ts` currently re-exports Mozilla resolution while several callers combine resolution, spawn, output decoding, timeout, and normalization. ACP and WebSocket bridge modules already own much deeper long-lived lifecycle semantics that must not move.

The fixed baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`. This companion is independent of public Workflow Host activation, though the runtime-adaptation completion report includes it.

The authoritative architecture source is [`artifact/workflow-host-v12-architecture-decisions.md`](../../../artifact/workflow-host-v12-architecture-decisions.md), especially §§4.5, 14.9, 18, and 19. Its one-shot/long-lived lifecycle split, adapter closure, timeout and termination requirements, and validation evidence take precedence over abbreviated wording in this design.

## Goals / Non-Goals

**Goals:**

- Hide Node/Mozilla host differences behind one small one-shot interface.
- Normalize observable command evidence and bounded termination.
- Remove duplicated module resolution and spawn/capture selectors.
- Preserve command, environment, streaming, supervision, and domain-result locality.

**Non-Goals:**

- Building a generic process manager or command registry.
- Moving ACP framing, pipe draining, process groups, bridge health, Git policy, installer recovery, or SkillRunner state into the platform module.
- Adding a Workflow Host command member or changing public v12 types.

## Decisions

### One-shot execution is the external interface

`src/platform/subprocess.ts` owns host module resolution plus a bounded spawn/capture operation. Its result contains normalized streams, exit classification, timeout, and termination facts. Callers map those facts to their existing domain outcomes.

Exposing a native module or process handle was rejected because every caller would again learn adapter differences. Absorbing long-lived lifecycle was rejected because the interface would become as complex as all of its callers combined.

### Policy remains above the seam

`src/platform/command.ts` resolves what to run. `src/platform/env.ts` builds environment facts. Installers, Git, dependency probes, and SkillRunner set their own timeouts, recovery, and diagnostics. This module executes the resolved one-shot request and reports evidence.

### Feature detection chooses production adapters

Resolution inspects current capability shape per call and supports both Node and Mozilla/XPCOM adapters. Windows hidden execution is selected through adapter support. Raw diagnostics may enumerate candidates but cannot become dispatch SSOT.

### Tests observe results, not fallback order

The module interface tests cover output, exit, unavailable, timeout, termination, and hidden execution with injected adapters. Caller tests retain observable ACP, bridge, installer, Git, and SkillRunner behavior. Shallow re-export and internal fallback-order tests are deleted.

## Risks / Trade-offs

- [Termination differs by adapter] → Return explicit bounded termination evidence and let domain owners decide recovery.
- [Caller policy leaks downward] → Keep command search, environment, timeout choice, and domain errors out of the platform request/result.
- [ACP behavior regresses during reuse] → Treat ACP as a lifecycle owner and run its full observable close tests after any narrow adaptation.
- [Raw probe becomes a second selector] → Governance permits enumeration for diagnostics only and checks production dispatch imports.

## Migration Plan

1. Add failing platform-interface tests for Node, Mozilla, unavailable, output, exit, timeout, termination, and Windows hidden execution.
2. Implement the one-shot owner in `src/platform/subprocess.ts`.
3. Migrate dependency probe, SkillRunner, Git, and Host Bridge installer callers while preserving domain outcomes.
4. Adapt ACP/bridge only where their existing interface consumes the new internal seam.
5. Remove `getMozillaSubprocessModule`, shallow re-export code, caller selectors, and shallow tests; run focused and final gates.

Rollback restores caller-local execution together with the previous platform re-export; no persisted data or release identity changes.
