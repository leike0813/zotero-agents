# Design

## Context

See proposal.md for the approved replacement. Baseline f0b1e7dd contains Change B and matched Pi 1.0.0. The current SDK guesses SIWC from key shape, builds flat tools and can normalize incomplete into done/length. Its onPayload and onProviderStreamEvent hooks allow project policy without another parser. Existing encrypted envelopes, source generations, owner checkpoints, region signatures and sealed network profiles are authoritative.

## Goals / Non-Goals

Goals: enforce the approved authentication and inference resolutions at production seams, with separately verifiable real-service evidence.
Non-goals: new dependencies, SDK fork, another Agent owner, hosted MCP, account-wide automation approval, backend-api fallback, historical repricing, release publication or a parallel acceptance runner.

## Decisions

- Authentication owns a profile metadata document and stable urn:uuid host identity. Each registration references an encrypted kind=chatgpt credential containing access/refresh/idToken/expiry/issuer/subject/clientId/granted scope. Explicit authVariant=chatgpt uses provider=openai, api=openai-responses and the fixed official endpoint. Registration identity is independent of rotation IV; arbitrary credential replacement changes identity and invalidates frozen callers.
- The callback owner uses the accepted native XPCOM server-socket route with bounded accepted transports, requests and timeout. It listens before Zotero.launchURL, validates a single state/client/code result and closes on cancel/window/timeout/shutdown. WebCrypto verifies fixed-algorithm RS256 keys from OpenAI discovery/JWKS, never token-supplied URLs. Production does not import the prototype or Node facilities.
- Authentication exposes connectPiChatGPT, resolvePiChatGPTAccess, registration inspection, cancellation/sign-out/remove, assertPiChatGPTInferenceAllowed, pausePiChatGPTInference and a single explicit recovery-probe permit. UI never receives token material or authorization URLs. The access resolver permits non-inference discovery while every inference purpose passes fresh admission.
- Refresh is single-flight per registration with an owner signal independent of caller waits. Encrypted material CAS and publication generation guard both commits. A started rotation that cannot be confirmed is not replayed; a durable recovery marker requires reauthorization. Logout serializes with refresh, revokes the latest available token within its bound, clears local tokens even when remote revocation is unconfirmed and retains the client/host mapping.
- The catalog isolates ChatGPT account visibility and target-specific metadata from public API rows, including same-name models. Applicable overlay facts must explicitly name ChatGPT authentication and official target; absent annotations retain existing API-key-only semantics. Discovery preserves server order and fields whose meaning can be validated; absent context blocks execution instead of borrowing another target.
- piChatGPTProvider adapts the existing Pi Responses implementation at final payload and raw decoded event hooks. Client function definitions use a frozen zotero_agents namespace map, included in preparation budgets and reversed for Gateway dispatch. Generated forbidden fields are omitted; explicitly requested forbidden sampling/compat options reject before dispatch. API-key policy explicitly restores eligible named parameters incorrectly omitted by SDK key-shape guessing.
- Provider evidence separates actual completed/incomplete/failed/missing-terminal from SDK done. Successful complete-batch validation gates all tool effects. Usage preserves observed field presence and complete/partial/unknown status, with no applicable ChatGPT pricing inferred from public API. Source and Runtime keep one per-actual-request identity; temporary pre-output 503 retries reuse original context/lease/deadline and create distinct canonical invocations. Search keeps its stricter one-dispatch source contract and never retries.
- Registration pause is durable, applies to main/Skill/compaction/title/search and is checked immediately before transport. The existing explicit connection test consumes one opaque auth-owner recovery permit; successful actual completion releases pause. No timer probes or automatic task restarts follow recovery.
- Skill Run Details exposes task restart consent, absent/off by default, stored canonically against request/prepared task scope and registration identity. Ordinary Send/Workflow start/explicit Continue authorizes current work, not future unattended restart. Startup checks consent in addition to existing reservation/checkpoint/effect/resource gates. Existing Continue controls resume held work without creating a new owner.
- Native search injects the existing sealed OpenAI operation fetch into the SIWC provider, wraps its bounded response for Pi parsing and feeds only an actual completed response to existing grounding/citation extraction. Remove the obsolete Codex profile; retain all other profiles and source attempt receipts.
- Initialization performs idempotent scoped cleanup before catalog/owner recovery. Existing canonical old snapshots remain readable as unavailable historical choices and never become execution input. Auth cleanup joins the existing absolute shutdown deadline; token commits and callbacks cannot reopen closed infrastructure.

## Risks / Trade-offs

- Real discovery may omit executable metadata → retain visible unknown models and require validated SIWC-specific facts; never invent capacities.
- Official search may be unavailable for a registration → record a failed/missing acceptance gate, preserving the selected source contract.
- Refresh may rotate before a transport failure → persist recovery-required, retain local evidence and require reauthorization rather than reuse an unknown token.
- Mocked terminal streams cannot prove installed-host behavior → require redacted real-host/account evidence and candidate-bound C20 handoff.

## Migration Plan

Run idempotent cleanup using existing persisted state, deleting only legacy Codex configuration, credential, account-cache and default references. Preserve API-key and unrelated records and all owner histories/workspaces/effect receipts. Require new ChatGPT registration authorization. Update help source, all locale strings, AGENTS and ADR 0003, then regenerate help through the ordinary build. Replace old auth tests and acceptance smoke IDs; keep the fixed C20 baseline/matrix/thresholds. No automatic rollback into the removed authentication path is available.
