## Context

ACP Chat and ACP Skills share the transcript renderer, but ACP Chat owns its workspace change classifier and runtime-control projection. The observed failures cross those boundaries: a shared bottom-stick marker hides user scroll intent, ACP Chat pending explicit change kinds suppress a terminal transcript boundary, permission auto-approval publishes the wrong bounded region, and the Chat surface erases runtime option domains while busy. Existing wire DTOs and renderer region guards already support the required behavior once the correct state is published.

## Goals / Non-Goals

**Goals:**

- Preserve explicit user scroll-away during sustained streaming on both ACP surfaces.
- Deliver ACP Chat terminal completion patches in the same critical mutation even when another live region kind is pending.
- Make conversation-scoped auto-approval and runtime controls converge immediately through their owning regions.
- Keep transcript and non-transcript DOM identity scoped to the region whose visible DTO changed.
- Remove duplicate runtime-option projection logic.

**Non-Goals:**

- Changing ACP protocol messages, public workspace actions, wire schemas, transcript persistence, pagination, or Markdown rendering rules.
- Introducing optimistic browser-side permission state or backend-specific transcript behavior.
- Replacing the existing publication coordinator, revision, or acknowledgement model.

## Decisions

1. Treat an observed upward `scrollTop` movement as explicit scroll-away even while the transcript carries its programmatic-scroll marker. Bottom-stick itself only moves toward the tail, so upward movement is the stable signal needed to cancel the active generation and clear stickiness. This keeps scroll intent inside the shared renderer instead of adding ACP Chat/Skills variants or CSS workarounds.

2. Make ACP Chat workspace change kinds additive. Explicit pending kinds remain, while critical/boundary reason semantics and queued transcript events contribute `status`, `permission`, and `transcript-boundary` as applicable. This keeps the resolver as the classification SSOT and prevents a side-channel composer update from draining or stranding a terminal patch.

3. Route a permission change to both `permission` and `owner-control`. Auto-approval is stored in `owner-control.permissionPolicy`, so publishing only the permission drawer region cannot update the banner. A targeted host publication is preferred over optimistic child mutation because the persisted conversation snapshot remains authoritative.

4. Project complete runtime option groups whenever an ACP Chat owner is connected. Mode enablement depends only on connection and available options; model and reasoning enablement additionally requires a non-busy lifecycle. Prompting, permission wait, and requested interruption therefore preserve values and permit mode changes while freezing model and reasoning. Disconnected/no-owner state remains empty and disabled.

5. Move runtime option group normalization into the shared workspace publication module and have both ACP surfaces consume it. The wire shape remains unchanged; only duplicated local construction is removed.

## Risks / Trade-offs

- Upward scroll caused by unexpected browser geometry changes could be interpreted as user intent. → Limit the override to the active programmatic bottom-stick window and preserve existing near-bottom reactivation.
- Additive critical kinds can publish more than one bounded region in a single transition. → Region signatures still suppress unchanged DOM work, and tests assert unrelated identity.
- Routing all permission changes to owner-control can prepare an unchanged owner-control DTO for ordinary permission requests. → The owner-control signature guard prevents rebuild; the simpler change-kind SSOT avoids a new one-off permission-policy discriminant.
- Shared option projection refactoring could alter ACP Skills accidentally. → Retain the existing Skills cases and run its frozen-configuration regression tests unchanged.
