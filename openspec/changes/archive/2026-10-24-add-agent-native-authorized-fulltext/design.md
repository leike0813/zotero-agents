# Design

## Context

See proposal.md for motivation and the eight delta specs for behavior. Baseline is `a991d608188795e5123702179d608fc6c0e43e13`. The finalized wayfinder contract is `artifacts/authorized-fulltext-wayfinder/integration-contract-draft.md`; earlier chronological research notes do not override its decisions.

The native Linux 10.0.5 experiment downloaded one matching PDF using HTTP.request in the authenticated context. HTTP.download returned HTML; the CNKI translator detected a paper but extracted no items. Neither result proves a durable managed authentication profile. The current uploaded-file attachment ingress rejects non-upload origins, while ordinary registered file handles permit remote GET. MCP tools derive from the shared registry. Existing navigation denies skill-run scopes. ACP write grants are local-only and not acquisition grants; SkillRunner's frontendScopeId alone is not trusted live-run evidence.

## Goals / Non-Goals

**Goals:** Keep Agent orchestration, native session ownership, and canonical attachment authority distinct; provide one credential-free browser acquisition interface through existing projections; make partial progress observable and preserve it through cancellation.

**Non-Goals:** External browser/downloader dependencies, a general browser automation platform, CAJ conversion, arbitrary JavaScript evaluation, arbitrary local-path ingress, a second mutation authority, a generic job queue, WorkflowHostApi v12 expansion, hook-lock refactoring, and release publication.

## Decisions

### 1. Risk-first native proof

Before implementing production capabilities, use the existing isolated Zotero test setup to prove a managed native contextual identity can retain actual CARSI authorization across a clean restart and acquire a matching PDF. Prefer the platform ContextualIdentityService and its persisted profile-local identities; `newCookieContext` is a transient ID allocator with disposal semantics and cannot establish this requirement. Native website cookie/storage expiry remains authoritative; no cookie export, password persistence, or expiry rewriting.

Exercise synthetic context isolation/persistence separately from actual institution authentication. Record actual Zotero version and whether each observation is synthetic or real. A proof that only the default context or synthetic persistent cookie survives is insufficient. If a new managed context needs authentication, the user must log in locally. Keep the proof pending until that evidence exists. Failure to meet this requirement stops dependent production tasks instead of weakening the accepted feature.

### 2. One Broker-owned acquisition module

Add a native acquisition owner behind `ZoteroHostCapabilityBroker`. It owns authentication-profile metadata, task pages, observations/targets, downloads, and temporary resources. Native platform adaptation stays private; the owner contains no school-specific or CNKI selectors. The literature Skill owns the site strategy using bounded page facts and target activation.

| Object | Identity and lifetime | Cleanup |
| --- | --- | --- |
| Authentication profile | Opaque authProfileRef, display name, private persisted contextual identity | Explicit user sign-out clears that context; task completion keeps it |
| Task session/page | Opaque sessionRef/pageRef bound to trusted grant and auth profile | Terminal task or explicit release; never implicit logout |
| Page target | Opaque targetRef bound to page and revision | Navigation, document replacement, release, or sign-out invalidates it |
| Download | Opaque downloadRef and task-scoped idempotency key | Terminal task cancels work; stale callbacks cannot publish results |
| Acquired file | Existing opaque fileId, acquisition origin, attachment-ingress-only purpose and owner | Lease-aware cleanup after import/release; committed attachment independent |

Concurrent tasks sharing authentication have separate pages. Authentication/account changes invalidate old page targets so observations from different account states are not conflated. Sign-out and account switching require explicit user action and are not automatic Agent cleanup.

### 3. Minimal acquisition interface

Use a dedicated `acquisition.*` capability family: `profiles`, `open`, `observe`, `navigate`, `activate`, `download`, `get_download`, `cancel_download`, and `release`. Profile list exposes only safe profile references and names. Opening binds a confirmed parentRef/source to a new task-owned page and a selected or newly created named native auth profile. User sign-out is a local profile-management action, not a task-grant privilege.

All calls use the existing capability request/response envelopes and shared registry, from which CLI/MCP contracts are produced. Freeze concrete JSON schemas in the contract task before production implementation. Observation returns page state, revision, bounded identity/text facts, bounded target descriptors, and a bounded continuation when needed. Activation takes an observed targetRef rather than a signed request URL; navigation takes a public source or observed target. Host never returns native DOM/window/context objects, authentication form values, credentials, or signed parameters. Page text remains untrusted source material.

Open/navigation/download operations distinguish acceptance from completion. Calls return well below the CLI 30-second read limit and MCP 45-second watchdog; observation returns current state and suggested polling interval. Ten-minute authentication wait belongs to the session owner, starts when authentication is requested, and is not renewed by polling. Closed/canceled/timed-out waiting suppresses new automatic login prompts for the batch.

Download start binds an idempotency key to canonical semantic input under its owning task. Replay returns the existing download; mismatched reuse fails. Observation distinguishes pending/running/ready/failed/canceled and structured reasons such as stale target, authentication required, unavailable access, unsupported format, non-PDF, mismatch, and network failure. Canonical mutation operation IDs remain separate.

### 4. Trusted task grant through existing admission

Declare native acquisition intent in workflow execution settings and carry it through existing runtime preparation. Host creates an unguessable independent acquisition grant before backend dispatch, bound to its trusted local task owner, and associates backend run identity when assigned. Inject it through existing ACP profile/environment and SkillRunner environment paths. Revoke on submission failure, terminal completion, or cancellation; on restart all in-memory grants/resources expire. A temporary transport disconnection is not terminal unless the task lifecycle declares it so.

Preserve the grant through scope parsing, CLI requests and MCP trusted call control. Resolve it against the live owner rather than trusting caller runId, frontendScopeId, connection locality, or `approved` input. Acquisition authorization is independent of write auto-approval and therefore works when writes still require approval. Canonical write scope and operation identity retain existing authority.

The exact Stage 30 approved candidate set is an Agent conversation decision. Skill enforces that set; Host binds pages to this run's confirmed ingested parents and source facts and rejects cross-task resources. Task submission describes institution access in its normal summary. Host does not claim it can cryptographically verify conversation text. Cross-origin CARSI/IdP/publisher navigation is part of the authentication chain, so a simplistic same-domain filter is unsuitable.

### 5. Same-context acquisition and private file ingress

Reuse native session-aware requests, but do not ship the proof's whole-response buffering as the production large-file path. Select and verify a native file-backed/channel transfer retaining the named context, redirect behavior, cancellation and bounded JavaScript segments. PDF parsing may allocate a full-file buffer after the file passes an explicit size limit; parsing runs in an independently terminable worker with a deadline. This bounded parsing allocation is separate from the file-backed download path. Validate MIME, PDF header and readability locally; return bounded identity evidence sufficient for the Agent to match the approved paper. Never send full PDF contents merely to establish the match.

Extend the existing file registry with explicit acquisition source/purpose/owner. Existing exported file kinds retain download behavior. Acquisition-only handles are rejected by remote GET before file reads. Extend private attachment ingress leasing to support owned acquisition files, without pretending they were uploaded or accepting arbitrary paths. Reuse managed staging, private prepared-file validation, approval-time re-preparation and effect-time checks. Resolve canonical mutation replay before file preparation. Retain active leases across approval waits and ensure cleanup never deletes a committed attachment.

This feature does not invoke a later attachment-export capability to move acquired bytes to the Agent. Other explicitly initiated analysis workflows retain their own transfer policies.

### 6. Skill and result integration

Preserve existing three public routes and metadata qualification. Main Agent performs core ingest, checks current usable PDF facts, then runs native acquisition for missing PDF and applicable CNKI sources. Subagents may research public metadata/PDFs but do not use the main task's browser grant or submit mutations. Main Agent serializes both core and attachment writes and retains exact candidate-bound receipts.

Extend gate state and ledger for independent core-ingest, acquisition, and attachment facts. Keep final output compact and reuse pdfStatus; attachment evidence supersedes the initial missing-PDF snapshot only after canonical success. Unknown/repair_required submission uses canonical operation observation, not blind retry. A stale target permits one same-paper refresh and one new-target retry. Other per-paper acquisition failures preserve successful ingest and allow remaining papers to proceed.

Canceled results retain summary/outcomes/ledger when candidate processing began, with unattempted papers distinct from failures. Apply hook projects confirmed partial results, curation needs, and current usable-PDF availability. Tag changes use distinct semantic operation identities; tag failure reports partial completion without undoing attachments. No downloading occurs in applyResult.

### 7. Tests and governed guidance

Use TDD at the approved owner/Broker, file ingress, registry/CLI/MCP, task lifecycle and Skill output seams. Extend existing relevant tests rather than duplicate fixtures. Synthetic E2E runs use `tests/zotero/e2e/full` and the existing runner; real profiles are read-only sources for isolated copies. Authentication data, original PDFs, titles, local paths and private links are not committed fixtures.

For Host Bridge surfaces, capture baseline materialized metrics and semantic mapping before changes. Approved deletion inventory is empty. Add equally detailed acquisition guidance to semantic sources, then render through existing tooling and review unmapped, downgraded, unauthorized-dropped and intra-package duplicate counts. No static prose tests. Skill-specific guidance changes include removing the superseded public-only restriction, not rewriting unrelated instructions.

## Risks / Trade-offs

- Native persisted contexts may not preserve real CARSI access → verify before dependent implementation; retain an explicit unmet gate if authentication or platform behavior blocks proof.
- Same-context large downloads may differ from the successful request prototype → verify native bounded transfer and redirects; do not globally replace unrelated HTTP.download paths.
- SkillRunner identity arrives after submission → use trusted local task admission and explicit run association, not frontendScopeId as a secret.
- Some existing specs mention Stage 70 while current Skill uses another stage → express touched requirements by semantic phase and update affected documentation only.
- Existing public-source and canceled-result contracts conflict with the feature → include full MODIFIED requirements and preserve unchanged scenarios.

## Migration Plan

This is additive until the declared pilot passes. Existing libraries and attachments need no migration. Authentication metadata is created lazily in the current Zotero profile. Unsupported environments report capability unavailable without weakening other workflows. Cleanup during plugin shutdown preserves persisted authentication metadata but terminates task resources. Rollback must not replay work or remove committed attachments; explicit authentication cleanup remains a user action. No source commit, archive, prebuild dispatch, or publication is part of this change's implementation authorization.
