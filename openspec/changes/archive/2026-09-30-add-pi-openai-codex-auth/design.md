# Design

## Context

C03 already owns frozen `openai-codex` selections and encrypted credential material; C04 owns the native model stream and redacted failure path. The pinned Pi 0.84.4 login module imports Node-only callback support, so the Zotero bundle cannot import it. Its Codex stream adapter has a browser-compatible SSE path.

## Goals / Non-Goals

**Goals:** Complete one selected Codex account connection and execution path while keeping secrets inside the profile store and active invocation.

**Non-Goals:** Generic OAuth registry, callback server, external Codex process, token import, account rotation, remote revocation, and Conversation integration.

## Decisions

- Implement the pinned device-code protocol in one project-owned module using browser primitives. Reuse its endpoint and request shapes as a compatibility baseline; reject malformed JSON and bound polling to 15 minutes. Avoid importing the Node-only login module.
- Add a revision-checked credential replacement inside the existing write queue. Login commits only after complete exchange and claim validation; refresh uses the same compare-and-swap boundary. A concurrent logout wins over a late refresh.
- Rename the API-key-specific model source file and export to a general Pi Provider execution name. Keep its context projection, stream loop, and failure normalization common; select Codex's native `openai-codex-responses` adapter with SSE for Zotero and retain existing adapters for other variants.
- Keep device-code progress in a request-correlated, page-local state. The host owns its AbortController and cancels on dialog unload. The host opens the fixed verification URL through Zotero's existing external URL launcher.
- Refresh uses the official JSON token request. A missing rotated refresh token retains the existing one; expiration comes from `expires_in` or a validated access-token expiry claim. Missing expiration fails closed.
- Query the official Codex `/models?client_version=0.158.0` endpoint with the selected account credential after successful user login or an explicit model refresh. Normalize only bounded visible model facts into an in-memory credential-bound catalog; loading configuration or the bundled catalog performs no network request. Failed refresh preserves previous valid facts, and logout invalidates in-flight discovery and that credential's model entries.
- A missing Codex output ceiling is represented by zero (unknown), with no invented model limit or tool capability. Selection requires known context and text input. Preparation reserves output within that context; the native Codex protocol does not send a fabricated `max_output_tokens`. Other provider admission retains its existing output-limit requirement.

## Risks / Trade-offs

- Direct subscription endpoints are a compatibility path, not a public versioned API. Protocol drift fails only Codex and requires renewed fixture and real-account evidence.
- Browser or account policy may prevent device authorization. Report a redacted failure and leave existing credentials intact; the real-account smoke remains a completion gate.
- The page and host exchange a one-time code. It must never enter persisted snapshots, logs, or diagnostic exports.
