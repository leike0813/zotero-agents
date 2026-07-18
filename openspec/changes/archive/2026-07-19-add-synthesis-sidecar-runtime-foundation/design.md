## Context

The production Synthesis topology is still entirely in-process. The client seam,
Host ports, and eight environment-neutral compute engines are complete, but
there is no independent process that later WS4 changes can package, supervise,
attach workers to, or address through a remote client.

This change creates only the service control-plane foundation. It must be
executable by Node in development and tests while remaining disconnected from
plugin composition and all production data. Product-owned Node distribution,
process supervision, compute workers, remote `SynthesisClient`, persistence, and
ownership cutover remain separate changes.

## Goals / Non-Goals

**Goals:**

- Create an independently typechecked and compiled private Node service app.
- Define one bounded, environment-neutral system wire contract.
- Prove loopback binding, authentication separation, health/readiness
  separation, graceful shutdown, redacted diagnostics, and fail-fast behavior.
- Preserve the current in-process production topology and `108 / 1` inventory.

**Non-Goals:**

- Package Node or the service bundle into the plugin.
- Add a plugin launcher, discovery record, owner lock, parent lease, restart
  policy, crash-loop fuse, install/upgrade/rollback, or platform signatures.
- Add workers, operation events, SSE, remote domain capabilities, SQLite,
  canonical file access, Host Capability calls, or production consumer routing.

## Decisions

### 1. The first runtime is a private Node workspace app

`apps/synthesis-service` owns the Node-only entrypoint, runtime config
rebuilding, HTTP server, and lifecycle. The root build invokes a dedicated
service typecheck and emit step. Emitted files live under ignored `.scaffold`
output and are not packaged into the XPI.

Alternative: add the server under plugin `src/`. Rejected because Node imports
must never enter the Firefox/Zotero bundle.

### 2. TypeScript emits a self-contained internal source tree without a new dependency

The service build includes its own sources plus the two environment-neutral
contract source files and preserves their relative layout under
`.scaffold/synthesis-service`. Node runs the emitted ESM entrypoint directly.
This avoids installing a bundler or changing current source-oriented workspace
exports.

Alternative: rely on `tsx` at runtime. Rejected because that would not prove an
independent plain-Node executable artifact.

### 3. One protocol and two routes form the control plane

The protocol ID is `synthesis-sidecar.v1`.

- `GET /synthesis/v1/health` is unauthenticated and reports only liveness,
  protocol, service version, instance ID, and lifecycle state.
- `POST /synthesis/v1/call` accepts a strict request envelope. The initial
  capabilities are `system.handshake` and `system.shutdown`.

Handshake requires the client token and validates protocol, profile, and schema
before returning the authenticated runtime identity, capabilities, opaque root
IDs, and `mutationEnabled: false`. Shutdown requires a separate lifecycle
token; neither token substitutes for the other.

Alternative: separate endpoint per capability. Rejected because later grouped
capabilities need one stable bounded envelope and common error mapping.

### 4. Config is a strict absolute-path JSON document

The entrypoint accepts `--config <absolute-path>`. Config contains profile and
opaque root identities, version/schema identity, port, and the two tokens.
Unknown keys, non-loopback host configuration, weak/matching tokens, invalid
bounds, and any `mutationEnabled` value other than literal `false` fail before
listen. Tokens never appear in argv, responses, or logs.

Production token generation, secure provisioning, file permissions, and config
lifecycle belong to the supervisor change.

### 5. Control-flow truth is structured and bounded

Requests are limited to 1 MiB, depth 32, 50,000 JSON nodes, 64 KiB per string,
512 characters for request/profile IDs, and 128 characters for capability IDs.
The server enforces a request deadline. Responses use HTTP status plus stable
error codes and structured details; messages remain diagnostic.

### 6. Lifecycle is explicit and fail-fast

The service moves through `starting`, `ready`, and `stopping`. A structured
`service_listening` JSONL event announces the selected port. Shutdown stops
accepting work, closes idle connections, force-closes remaining sockets after a
bounded grace interval, and exits. Uncaught exceptions and unhandled rejections
emit a redacted fatal event and exit non-zero.

### 7. Isolation is enforced statically and behaviorally

The app may import Node standard-library modules and environment-neutral
contracts only. It must not import plugin modules, Zotero globals, the
application service, repositories, canonical writers, Host effects, sync
runtime, or `synthesis-engine`. Production default composition remains
in-process.

## Risks / Trade-offs

- [A compiled source tree is less compact than a bundle] → Keep it in ignored
  build output; the packaging change can introduce a signed bundle later.
- [Config contains plaintext development tokens] → Require an external config
  file, never log its path/content, and defer secure production provisioning to
  the supervisor change.
- [A health endpoint can leak identity] → Expose only process-level identity and
  keep profile/root identity behind authenticated handshake.
- [This runtime does not yet deliver user-visible behavior] → Treat the
  subprocess and boundary tests as the exit gate and keep active docs explicit
  that production remains in-process.

## Migration Plan

1. Add contracts and failing subprocess/boundary tests.
2. Add and compile the isolated service app.
3. Add build and invariant gates.
4. Update current-state docs to record the development/test-only runtime.

Rollback deletes the private app, contract, tests, scripts, and documentation
updates. No production data or ownership migration is involved.

## Open Questions

None. Packaging, supervision, worker scheduling, remote client routing, and
production ownership are deliberately deferred.
