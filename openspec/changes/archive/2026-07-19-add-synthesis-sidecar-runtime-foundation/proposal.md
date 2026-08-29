## Why

WS3 has completed the environment-neutral Synthesis compute-engine extraction,
but production still has no independent process boundary to host those engines
later. Before packaging, supervision, workers, persistence, or remote clients can
be introduced safely, the repository needs a minimal Node service control plane
with a strict protocol, isolated lifecycle, and explicit proof that it cannot
touch production data.

## What Changes

- Add a private `apps/synthesis-service` workspace with an independently
  buildable Node entrypoint and loopback-only HTTP server.
- Add environment-neutral sidecar system wire contracts for health, authenticated
  handshake, structured failures, and lifecycle-token shutdown.
- Make health and readiness distinct: unauthenticated health proves liveness,
  while authenticated handshake validates protocol, profile, schema,
  capabilities, and mutation-disabled state.
- Enforce bounded JSON input, server-side deadlines, stable error codes,
  structured redacted logs, and fail-fast process behavior.
- Keep the service isolated from Zotero, plugin modules, Synthesis repositories,
  canonical files, Host effects, compute engines, workers, and production
  composition.
- Add build, boundary, invariant, subprocess lifecycle, and current-state
  documentation gates.

## Capabilities

### New Capabilities

- `synthesis-sidecar-runtime-foundation`: Defines the isolated Node service
  control plane, wire protocol, health/readiness semantics, authentication,
  lifecycle, bounds, and production-data exclusion.

### Modified Capabilities

- `synthesis-invariant-guardrails`: Adds executable dependency and ownership
  guards for the isolated service app while preserving the `108 methods / 1
  direct consumer` production inventory.
- `synthesis-layer-doc-system`: Documents the development/test runtime
  foundation as implemented current state without claiming packaging, plugin
  launch, remote client routing, or production ownership.

## Impact

- New private workspace under `apps/synthesis-service`.
- New exports in `packages/synthesis-contracts`.
- Root build/check scripts and focused Node subprocess tests.
- Synthesis boundary/invariant tests and current-state architecture docs.
- No dependency installation, public `SynthesisClient` change, service method
  inventory change, UI change, database migration, runtime packaging, or
  production ownership change.
