# Proposal

## Why

Pi Conversations cannot yet navigate Zotero despite the canonical Broker already owning the seven reviewed operations. The existing Gateway and Conversation composition lack the foreground/window and batch contracts needed to expose them safely.

## What Changes

- Add the seven static navigation projections and the previously accepted Saved Search discovery read.
- Supply transient turn-origin Workspace authority and preserve it across permission continuation.
- Add descriptor-driven foreground admission and single-per-batch constraints to the existing Gateway.
- Report the Broker's first-effect boundary through trusted call control so cancellation cannot invent no-effect evidence.
- Complete behavior tests, real-host evidence, specification sync and archive.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-zotero-tool-catalog`: reviewed navigation and Saved Search read projections.
- `pi-tool-gateway-policy`: foreground-only descriptors, batch rejection and safe uncertain failure projection.
- `pi-conversation-integration`: transient exact source-window binding.
- `zotero-host-capability-broker`: trusted navigation first-effect notification and revalidation.

## Impact

Fixed baseline: `64ea8d1699293820941767f75733fa5ab1048329`. The user explicitly approved combining the prerequisite repairs and production Conversation wiring into C15, revising #26's catalog-only file boundary. #39's maintainer closure accepts continued development with formal release receipt deferred. No dependency, navigation service, persistence entity, commit or release is added.

Production changes stay in the existing Gateway, native catalog, Conversation, Workspace action router, Broker and navigation call-control type. Extend existing Node/Zotero tests, Broker architecture documentation, AGENTS.md and runtime handoff.
