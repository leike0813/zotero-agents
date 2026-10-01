# Design

## Context

See proposal.md for motivation and issue #26 comment 5550641826 for the accepted plan. C16 already supplies the two-lane/five-source shell. C02 canonical transcripts support skill_run owners but have no production Skill Run coordinator. ACP currently embeds preparation/result collection in its orchestrator and controller.

## Goals / Non-Goals

**Goals:** A single request owner, shared v1 prepared provenance/finalization, atomic durable interaction and provider sealing, reusable Gateway/Turn Preparation/tool composition, bounded Workspace projection, and direct recovery of a known owner.

**Non-Goals:** C18 audit, C19 startup discovery/recovery scheduling/cleanup, C20 release harness, standalone Skill Run creation, Restore and free-form attachment continuation.

## Decisions

- `PiSkillRun` is one deep lifecycle module. Workflow retains apply and terminal acknowledgements. C02 persists canonical lifecycle, prepared references, interaction, guard, outcome and receipts once; projections contain safe list facts only.
- Admit canonical builtin-pi requests before asynchronous setup. Persist source request identities, immutable Auto/Interactive mode and v1 provenance. Selection/setup failures become structured durable terminals. Missing execution mode means Auto; malformed explicit modes fail.
- New ACP admissions use shared `SkillRunPreparation` and `SkillRunFinalizer`; missing-version records remain legacy for their entire lifetime. Frozen prepared Skill facts survive continuation; no re-selection/materialization on resume.
- Compose C03 selection, C04 model execution, C06 preparation and C07 native/MCP/Web/Zotero tools through their existing seams. Owner callbacks persist tool start, receipt, permission, user interactions and guard counters before exposing success or dispatching continuation.
- `submit_skill_result` validates early against the prepared output schema. A successful exactly-one submit excludes other tools in its batch and seals one provider outcome; Finalizer subsequently collects owner files and constructs `zotero-agents.skill-run-response.v1`. Workflow ApplyReceipt and delivery acknowledgements are independent durable identities.
- `ask_user` is Interactive-only. Its complete subset is validated before execution; ordinary tools settle first through Gateway, then the owner persists one versioned interaction batch. Durable drafts use owner-serialized revision CAS; submission validates every required answer before making original-call tool results. Files are owner-bound opaque Gateway refs with the shared 20-file, 20 MiB/file and 50 MiB/batch limits; cancellation/decline never synthesizes partial answers.
- Interrupt settles the turn into suspended without settling the run; text continuation uses the same request with freshly frozen runtime facts and persisted guard counters. Unknown dispatched effects require recovery, never automatic replay.
- Workspace uses the existing `pi-skill-runs` source and shared Reply region. Launch focus is once and Interactive-only; later state changes merely publish. Owner switches publish loading before indexed pages; transcript updates do not change chrome signatures.

## Risks / Trade-offs

- ACP extraction risks changing established resource/result behavior → characterize before extracting and keep legacy continuation intact.
- Crash between dispatch and receipt makes effects uncertain → durable dispatch checkpoints and actionable recovery_required instead of replay.
- Interaction drafts from multiple windows can race → canonical revision CAS rejects stale edits/submission.
- Long transcript writes currently inspect complete history → retain C02 correctness and defer measured throughput optimization.

## Migration Plan

No dependencies or native assets change. New requests persist v1 on admission; old ACP records remain legacy without rewriting. External SkillRunner is unchanged. Keep this change active until deterministic integration, build, lint and supported-host evidence are recorded; do not archive on partial checks.
