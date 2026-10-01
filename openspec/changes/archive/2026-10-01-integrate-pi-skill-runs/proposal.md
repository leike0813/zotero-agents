# Proposal

## Why

Pi currently exposes Conversations but cannot execute workflow-owned Skills. C17 supplies the missing Skill Run owner and consolidates new ACP and Pi runs onto one versioned preparation and finalization contract, as accepted in issue #26.

## What Changes

- Add a local `builtin-pi` provider for validated `skillrunner.job.v1` requests with early durable admission, immutable execution mode and prepared provenance.
- Share v1 preparation/finalization with new ACP runs; existing ACP records without a pipeline version remain legacy, and external SkillRunner stays unchanged.
- Add explicit result submission, structured Interactive questions and files, durable drafts, suspension, cancellation, LoopGuard and known-owner recovery without replay.
- Seal workflow provider outcomes independently of idempotent ApplyReceipt and delivery acknowledgements.
- Enable the existing Pi Skill Runs Workspace source with Reply interaction controls, bounded transcript pages, permission controls, attention and terminal archive.

## Capabilities

### New Capabilities

- `pi-skill-run-integration`: Workflow-owned Pi lifecycle, preparation/finalization, result and interaction protocols, recovery and Workspace integration.

### Modified Capabilities

- `builtin-pi-runtime-spine`: Whole-run invocation/tool limits and structured interaction suspension.

## Impact

Touches provider/backend selection, ACP skill orchestration, existing workflow seams, Pi persistence/runtime and shared Workspace publication/Reply components. Reuses C02–C16 modules and installed dependencies. C18 audit, C19 startup discovery/cleanup scheduling and C20 release verification remain separate changes. No standalone run creation, sequence engine, replacement store or Node runtime is introduced.
