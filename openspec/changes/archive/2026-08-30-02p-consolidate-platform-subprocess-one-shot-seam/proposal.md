## Why

One-shot subprocess execution currently depends on a shallow re-export and caller-local runtime selectors, so equivalent commands normalize availability, output, timeout, and termination differently. A dedicated platform seam can hide Zotero 7/9 module differences while leaving long-lived process lifecycle with its domain owners.

The fixed implementation baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`. This companion change can run beside the v12 vertical slices and does not alter the v12 public manifest.

Architecture source: [`artifact/workflow-host-v12-architecture-decisions.md`](../../../artifact/workflow-host-v12-architecture-decisions.md), especially §§4.5, 14.9, 18, and 19. The architecture record is authoritative for the one-shot/long-lived lifecycle boundary, runtime adapter closure, bounded termination, and governance evidence summarized here.

## What Changes

- Deepen `platform/subprocess` into the owner of host subprocess module resolution, one-shot spawn/capture, normalized stdout/stderr/exit, unavailable, timeout, and bounded termination.
- Support Node and Mozilla/XPCOM production adapters, including Windows hidden one-shot execution, through feature detection.
- Migrate SkillRunner, Host Bridge installer, and dependency-probe one-shot callers.
- Keep command search policy in `platform/command`, login-environment parsing in `platform/env`, and domain timeout/result policy in each caller.
- Keep ACP streaming, pipe draining, process-group ownership, graceful/forced close, WebSocket bridge lifecycle, and raw diagnostics outside the one-shot seam.
- Remove `runtimeCompatibility.getMozillaSubprocessModule`, the shallow re-export implementation, and caller-local equivalent selectors.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `runtime-platform-services`: Add one normalized one-shot subprocess interface while preserving command, environment, ACP, bridge, installer, and SkillRunner ownership boundaries.

## Impact

- Owner: `src/platform/subprocess.ts`.
- Callers: ACP dependency wrapper, SkillRunner runtime/controller bridge, Host Bridge CLI installer and install prompt, command and environment adapters.
- Synthesis Git Sync and its command adapter were retired by `2026-07-19-retire-synthesis-hidden-git-sync`; the Rust sidecar's WebDAV sync uses Host reverse capabilities and is not a subprocess caller.
- Compatibility adapters: `src/utils/runtimeCompatibility.ts`; lifecycle owners may require narrow internal-seam adaptations only.
- Tests: runtime platform services, ACP observable close behavior, SkillRunner controller bridge, Node/Mozilla availability, timeout, termination, and Windows hidden execution.
- No Workflow Host member, persisted-data migration, release action, or dependency change.
