## Context

Issue #36 resolution and c2f60173 are the visual reference. Current source registry and Pi adapters exist, while production pages and projection still assume three sources. The approved plan preserves current Pi execution, permission, attention, persistence and recovery semantics.

## Decisions

- Keep the registry, independent owner selections and shared child renderer. Add the missing Pi Skill Run page instead of introducing a second renderer.
- Use two navigation rows and native keyboard/ARIA behavior. Counts and attention update independently of transcript and active lane attention is suppressed.
- Keep a single shell-owned Preact creation menu, anchored to the invoking banner button. A child control message opens it; existing canonical actions create owners. Read backend groups from navigation publications, not child DOM or a second backend catalog.
- Allow only unowned navigation through inactive-source publication scheduling while the Workspace is visible. Initialize navigation independently, coalesce changes and reject stale document/source deliveries. Owner regions and transcript retain active-owner guards.
- Project Pi metadata and usage from existing durable facts. Shared chrome memoization remains region scoped. No Chat/Research runtime modes, automatic clearing of actionable attention, new persistence or dependencies.

## Risks and validation

Inactive navigation must never hydrate cold transcripts; enforce with public adapter read counters. Cross-source creation must preserve validated group routing and suppress duplicate requests. Browser tests use production HTML/CSS and in-memory bundles; existing Zotero runner provides host validation. Unknown usage stays unknown. User AGENTS.md edits remain untouched.
