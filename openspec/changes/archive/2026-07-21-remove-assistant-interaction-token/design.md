## Context

`interactionToken` was added by `36df9366` to bind rendered Assistant controls to a waiting turn. Before that commit, ACP replies were selected by request owner, waiting status, and the current live or recovered controller. The token is not an ACP field: ACP derives it from output revision or pending-content hashes, while SkillRunner stringifies its pre-existing numeric `interactionId`. Commit `1dafa40a` then had to add live action state so stable reply DOM would not retain an old token.

Git history confirms that token introduction did not change the ACP reply state machine. `replyAcpSkillRun` already recorded `submitted`, `accepted`, and `idle`/`rejected`; live pending replies used a one-shot resolver, while detached replies used the existing serialized prompt chain. The token removal must restore that implementation exactly instead of adding another state gate.

## Goals / Non-Goals

**Goals:**

- Remove the Assistant `interactionToken` entity from current code, wire contracts, tests, and specifications.
- Preserve the ACP reply lifecycle that existed before `36df9366`.
- Keep SkillRunner's backend-required `interactionId` and asynchronous file safety.
- Preserve structured JSON option values, file privacy/staging limits, and managed-region DOM identity.

**Non-Goals:**

- Add a turn id, generation, nonce, digest, version, reply-state mutex, or duplicate-submission protocol.
- Change ACP or SkillRunner backend protocols.
- Change ACP pending resolvers, detached continuation, prompt-chain, or recovery semantics.
- Support multi-client or concurrent prompts within one ACP session.

## Decisions

### Remove token from the shared interaction boundary

`AssistantPendingInteraction` contains only input kind, visible prompt/hint, typed options, file slots, and file-reply capability. Text, option, and file actions carry only the data required to perform that action. Exact-key validation rejects the former `interactionToken` field as stale wire shape.

### Preserve the pre-token ACP reply lifecycle

`replyAcpSkillRun` retains the owner/status/controller validation and the existing `submitted`, `accepted`, and `idle`/`rejected` acknowledgement states. Those states are not interaction identities and do not reject a later waiting turn. A live controller continues to consume its pending resolver, while interrupted or detached continuations remain serialized by the existing prompt chain. No orchestrator transition or return timing changes.

### Re-read canonical interaction state for structured actions

Option actions re-read the selected owner's current pending interaction and accept only a value present in its canonical options. ACP file selection uses one in-flight flow per request id, re-reading waiting/upload/workspace state after the picker completes. Its shallow staging key uses the existing request id plus the existing random submission key. No replacement interaction identity is created.

SkillRunner continues to use its numeric `interactionId` because that is a backend protocol field. The run-dialog derives it from current canonical state, verifies it again after asynchronous selection, and sends it directly to the backend. It is never mirrored as an Assistant token.

### Preserve region-scoped rendering

Removing token-only live action payload state does not change managed-region signatures. Transcript-only publications remain unable to rebuild reply, hint, file, drawer, or other non-transcript regions. Sequential waiting turns update visible interaction regions while keeping structurally equivalent reply controls stable.

## Risks / Trade-offs

- Two indistinguishable ACP waiting interactions cannot distinguish a delayed old click without an explicit protocol identity. This matches the pre-token serialized execution model instead of inventing a local identity.
- File-picker state can change while native UI is open. Re-read canonical waiting/upload state and keep one request-scoped picker flow.
- Reply acknowledgement may span a detached continuation that publishes another waiting turn. The later reply must remain routable through the current one-shot resolver; `replyState` must not become a cross-turn lock.
