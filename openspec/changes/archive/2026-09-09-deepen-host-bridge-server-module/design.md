## Context

See `proposal.md`. `hostBridgeServer.ts` currently owns the correct external
seam and listener lifecycle, but also contains request parsing, response
transfer, centralized admission, a second state-changing path classifier, and
five route families. ADR 0001 requires Host Bridge to retain listener and route
ownership and forbids barrel or compatibility forwarding paths. Existing route
tests already cross `handleHostBridgeHttpRequestForTests`; socket tests cross the
real listener seam.

## Goals / Non-Goals

**Goals:**

- Preserve one deep Host Bridge Server interface while improving implementation
  locality by reason to change.
- Make route matching and generic/canonical admission mode one fact so they
  cannot drift independently.
- Reuse and deepen the existing request-reader and response-writer modules.
- Keep behavior verification at the existing HTTP and socket seams.

**Non-Goals:**

- Change public lifecycle exports, wire DTOs, persistence formats, route order,
  authorization, approval, MCP behavior, or Host Bridge release identity.
- Add a general router, transport abstraction, dependency, barrel, compatibility
  file, or private-handler test interface.
- Rewrite archived OpenSpec changes or agent-facing Skill surfaces.

## Decisions

### One external seam and five private route adapters

`hostBridgeServer.ts` remains the owner of process state, listener/socket
lifecycle, MCP dispatch, unauthenticated health, authentication, body limits,
operation receipts, centralized admission, request profiling, public lifecycle,
and the existing test interface. It composes five private adapters under
`server/routes`: diagnostics, capability/context, workflow/activity, file, and
synthesis.

Each adapter exposes one `match...Route(request, focusedContext)` function. It
owns matching, method validation, route-specific parsing, downstream calls, and
error mapping for its family. Context shapes are declared beside the adapter and
contain only server-owned callbacks or values the family uses. Adapters import
their stable downstream owners directly and never import `hostBridgeServer.ts`.
No barrel is added.

The alternatives were one file per endpoint, which creates shallow modules, and
two broad route files, which preserves mixed ownership. Five adapters give one
real internal seam with enough implementation behind each interface to pass the
deletion test.

### Route match carries admission mode

The private route contract returns either no match or a descriptor containing
an admission mode and an asynchronous handler. Admission mode is one of
`read`, `generic-operation`, or `canonical-mutation`. The mode is declared next
to the path match, eliminating the independent dynamic-path classifier that
drifted to v1.

After global parse/auth/body checks, the server obtains one descriptor, applies
the matching admission policy, and invokes its handler. Generic operation
validation, reservation, replay, conflict, completion, and unknown-outcome
handling remain centralized. Canonical mutations continue to bypass generic
HTTP operation history. A supplied operation id on a read route retains current
generic replay behavior, and the central not-found descriptor preserves current
404 receipt behavior.

`/mcp`, malformed requests, unauthenticated health, authentication failure, and
body-limit failure remain outside family admission so their current order and
effects do not change.

### Existing HTTP modules get deeper

`hostHttpRequestReader.ts` owns the parsed request DTO and strict byte-to-request
projection in addition to bounded fragmented reads. `runtimeHttpResponse.ts`
owns the memory/file response union, JSON/text/file framing, content-disposition
encoding, and memory/file output transfer. The server supplies a focused
response callback to route adapters so status diagnostics remain server-owned.

This reuses existing modules instead of adding a shallow helper collection or a
general transport seam. Request and response behavior remain available to tests
only through the established server testing interface.

### Behavior tests remain the migration safety net

The only new regression test is table-driven through
`handleHostBridgeHttpRequestForTests`: every affected dynamic v2 state-changing
route without an operation id returns 428 and reaches no route effect. Existing
tests already cover canonical dry-run without generic history, operation replay
and conflict, every route family, and socket cleanup. No source-layout or private
matcher assertions are added.

## Risks / Trade-offs

- [Moving handlers changes error or route precedence] → Move one family at a
  time and run its existing HTTP-seam tests after every slice.
- [A broad context recreates the original leakage] → Declare focused context
  shapes per adapter; share only the small request/result and route-descriptor
  contracts.
- [Admission runs after an effect] → Resolve the descriptor and finish central
  admission before invoking its handler closure.
- [The v2 fix breaks direct callers that relied on missing identity] → Return the
  existing typed 428 response; the official CLI already generates operation ids
  for all non-GET requests.
- [Mechanical spec correction rewrites history] → Update current specs only;
  leave archived changes byte-for-byte unchanged.

## Migration Plan

1. Add the failing dynamic-route admission test and confirm the expected red
   result.
2. Deepen request and response modules without changing the server interface.
3. Extract diagnostics, capability/context, workflow/activity, file, and
   synthesis adapters in vertical slices, running focused tests after each.
4. Replace the duplicate classifier with descriptor-driven admission and make
   the regression green.
5. Update the glossary, lifecycle documentation, and current specs, then run
   focused tests, TypeScript/build, formatting/lint, and OpenSpec validation.

Rollback is a normal source revert; there is no data migration or release step.
