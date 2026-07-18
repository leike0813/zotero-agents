## Context

The current MCP `tools/list` and `tools/call` paths derive from `listHostBridgeCapabilities()`, but `zoteroMcpProtocol.ts` still contains an older zero-reference `TOOL_REGISTRY` and a service dispatcher used only by that dead registry. Host Bridge remains a live direct consumer through twenty-three normal Synthesis methods plus eight debug methods. Only Topic Report and paper-artifact read already have public client contracts.

The migration must preserve open JSON request aliases, bounded cache-view results, Host Bridge approval, MCP result envelopes, local output paths, remote bridge-download bundles, and the public service method inventory.

## Goals / Non-Goals

**Goals:**

- Make the Host Bridge capability catalog the only MCP tool registry.
- Route all normal and debug Host Bridge Synthesis capabilities through domain-grouped `SynthesisClient` interfaces.
- Keep Host connection mode separate from ordinary request JSON and preserve its two path-sensitive operations.
- Leave `legacyComposition.ts` as the only production complete-service consumer.
- Delete the obsolete MCP service facade types after test injection moves to the client.

**Non-Goals:**

- Add a generic `client.hostBridge` or dynamic operation dispatcher.
- Change Host Bridge/MCP names, schemas, permissions, summaries, result shapes, or CLI documentation surfaces.
- Change Synthesis persistence, cache refresh rules, debug reset behavior, or service ownership.
- Use Sync's fresh-client policy for ordinary Host Bridge calls.

## Decisions

### 1. Extend domain clients instead of creating a proxy god object

Topic, graph, reference, concept, artifact, maintenance, library-index, workflow-review, and debug operations live on their matching client capability. Host Bridge registrations use typed lambdas over those domains. New alias-rich requests and responses are named opaque JSON objects; the Host Bridge manifest remains the public runtime-schema source.

`resolveTopicPaperDigest` moves to the artifacts client and shares its legacy port with the existing Workbench paper-digest projection. `getReviewInput` gets a read-only workflow-review client rather than being added to the command-oriented workflow-apply client. Library index becomes an explicit retained client capability instead of remaining marked for removal.

### 2. Carry delivery mode outside request JSON

`SynthesisDeliveryContext` contains `mode: "local" | "remote"` and is accepted only by Topic Context and filtered artifact export. The in-process composition reconstructs the legacy service call context. Local Topic Context may write the requested output path; remote mode packages a normalized zip entry. Local filtered export validates the run root; remote mode uses a host temporary root and returns a bridge-download bundle. MCP dispatch remains local.

### 3. Reuse the cached default client

Host Bridge resolves `getDefaultSynthesisClient()` lazily for each capability call. The cached client's ports resolve the current default legacy service on every invocation, preserving existing service invalidation behavior. The fresh-client helper remains Sync-only. Debug clean-install reset retains its current dry-run, confirmation, deletion, and post-call lifecycle behavior.

### 4. Keep one flat legacy seam and grouped public capabilities

`LegacySynthesisPort` gains optional ports for the missing normal and debug methods. The in-process adapter validates JSON-safe requests, rebuilds objects, requires the selected port, normalizes returned JSON objects, and uses the existing stable error classifier. Unknown JSON-safe request fields are retained for open Host APIs. Existing strict Topic Report and paper-artifact read contracts are canonicalized at the Host boundary before client invocation.

### 5. Replace service injection and delete the legacy facade

Host Bridge server and MCP handler test hooks expose `resolveSynthesisClient`, accepting a synchronous or asynchronous client resolver. Tests wrap narrow port stubs with `createInProcessSynthesisClient` rather than hand-writing the full client. Once production and tests no longer reference it, `synthesis/mcpService.ts` is removed and the service consumes the package-owned delivery context directly.

### 6. Delete only the registry-exclusive MCP closure

The zero-reference `TOOL_REGISTRY`, `callSynthesisService`, `synthesisTool`, and helpers reachable only from the registry are deleted. Helpers shared by the current Host Bridge MCP adapter and exported `ZOTERO_MCP_TOOL_*` constants remain. TypeScript, symbol search, and focused tests guard against removing shared behavior.

## Risks / Trade-offs

- **Connection-mode drift could expose or write host-local paths** → Keep delivery mode outside request JSON and test local/remote Topic Context plus artifact export at service, Host Bridge, and MCP layers.
- **Deleting the legacy registry could remove a shared helper** → Delete by reference closure and verify current list/call, permission, schema, summary, and result behavior.
- **Opaque APIs could silently accept invalid values** → Require JSON-safe objects at the client boundary and normalize invalid requests/results through stable client errors.
- **Debug reset tests could become destructive** → Cover dry-run and confirmation mismatch only; retain the existing approved real path without executing it in focused tests.
- **A wide migration could recreate the service surface** → Expose only the thirty-one Host-used methods and keep them grouped by domain.

## Migration Plan

1. Add red client-routing, delivery, injection, MCP-catalog, and boundary tests.
2. Add package contracts, optional ports, in-process implementations, and legacy composition.
3. Migrate Host Bridge and MCP, then remove the dead registry and obsolete facade.
4. Update inventory and current-state documents.
5. Run focused, invariant, contract, Host Bridge surface, production, and strict OpenSpec validation.

Rollback restores the service resolvers and dead registry while removing the new client methods. No data or schema rollback is required.

## Open Questions

None.
