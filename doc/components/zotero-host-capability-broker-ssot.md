# Zotero Host Capability Broker SSOT

This document is the human-facing SSOT for how Zotero host capabilities are exposed inside Zotero Agents. It defines the relationship between native Zotero APIs, the canonical broker, workflow projection, Host Bridge, MCP, and private native mutation primitives.

## Core Model

The stable layering is:

1. Zotero native APIs are the raw host runtime.
2. `ZoteroHostCapabilityBroker` is the canonical, process-local owner of portable host capability semantics.
3. `WorkflowHostApi` v12 is the closed workflow surface. It explicitly projects selected broker members and adds trusted local workflow services.
4. Host Bridge v2 is the remote locality, exposure, permission, and file-handle adapter over the canonical broker.
5. MCP is an exact public projection of the Host Bridge registry and reuses its handlers.
6. Broker-private native mutation primitives perform the admitted Zotero effects; Workflow supplies trusted local resources through its adapter.

The architecture has one fact source and deliberately separate public surfaces. Adding a broker member does not implicitly expose it to workflows, Host Bridge, or MCP.

`src/workflows/workflowHostContract.ts` owns the Workflow Host Contract
Identity: the current version, declared top-level capability identities,
diagnostic availability probes, version resolution, and contract-variant
conformance. Capability summaries observe a selected projection; they do not
define its identity. Package compatibility ranges and hook execution modes are
separate policies owned by their respective adapters.

## Current Facts

Canonical mutations cover item metadata/type/tag/related changes, collections and membership, notes, attachments, status tags, Trash state and single-paper ingest. Request/result mappings are closed; Workflow, Bridge and MCP select explicit members from this contract.

`WorkflowHostApi` explicitly projects a subset of the broker for workflow packages:

- `context`: small current Zotero view and exact selected-item pages as DTOs; selection preserves order and child refs, defaults to 25 and permits at most 100 entries per page. The opaque cursor binds the ordered selection ref digest and after-index; a changed basis fails with `conflict.details.reason = basis_mismatch`. Selection has no TTL, persistence, aggregate snapshot cap, promotion or deduplication.
- `library`: bounded item search, item detail, notes, and attachments as DTOs
- `metadata`: controlled read-only metadata translation facade as DTOs
- `mutations`: preview/execute command API and durable getOperation observation

It projects navigation, bounded library reads, canonical mutations, notes,
attachments, status tags, and the other members declared by the single runtime
manifest. Broker-only members remain private unless named by that manifest.

The main read, navigation and mutation entry points are:

- `context`: current view and selection queries
- `navigation`: item, note, collection, and selection opening effects
- `library`: bounded library, note, payload, annotation, and attachment reads
- `metadata`: identifier translation
- `mutations`: preview, execute and getOperation

Workflow hooks receive `runtime.hostApi`; raw handlers and Zotero runtime
objects are not hook capabilities. Interactive and non-interactive variants
have the same complete shape. Interaction-dependent members remain present and
fail with `interaction_required` when invoked non-interactively.

## Ownership Rules

Native mutation primitives remain private to the Broker implementation. Synthesis tag effects use canonical item.updateTags with their stable effect identity; hooks receive only the explicit Workflow projection.

`ZoteroHostCapabilityBroker` owns JSON-safe capability semantics and effects. `createZoteroHostCapabilityBroker()` creates an implementation and `resolveZoteroHostCapabilityBroker()` resolves the default implementation; all instances share process-level FIFO admission for native Host slices. Public refs are portable JSON refs; raw `Zotero.Item` and `Zotero.Collection` inputs are rejected. Trusted call control carries cancellation outside semantic JSON.

`WorkflowHostApi` owns trusted workflow composition. Public inputs use portable
refs and closed DTOs. The projection uses explicit object literals and
member-level types; whole broker domains, spreads, proxies, and capability
catalogs are forbidden.

Workflow Host conformance is strict at test and build seams: a current variant
may not omit a required declared capability or expose an undeclared top-level
capability. Production diagnostics report observed availability and retain
on-demand capability failures; they do not reject an entire projection before
a capability is requested.

`src/workflows/hostApi.ts` is the explicit composition root for those local
services. Runtime filesystem adaptation, input-file materialization, file
selection, note-image preparation, stored-attachment import, and archive
handling are owned by their respective modules. Their internal adapters are not
members of `WorkflowHostApi`.

The workflow-local terms have narrow meanings:

- **Workflow Input Materialization** creates a uniquely named provider input in
  plugin-managed runtime temporary storage.
- **Workflow Note Image Preparation** normalizes and bounds image data without
  mutating a Zotero note; embedded-image import remains a separate note action.
- **Workflow Stored Attachment Import** validates and stages companion sources
  before Zotero mutation, copies staged content into attachment storage, and
  rolls back a newly created attachment when later work fails.
- **Research Bundle Materialization** normalizes and deduplicates canonical
  paper refs, resolves portable paper DTOs through an injected resolver, and
  materializes portable metadata, preferred sources, the standard analysis
  artifacts, and canonical per-paper warnings. The Workflow Host projection
  owns its broker-to-portable resolver adapter.

Each Workflow Host composition binds its run-scoped Research Bundle resources
and prepared-image owner. Runtime globals, filesystem adapters, and Synthesis
clients remain late-bound by their owning modules.

Host Bridge and MCP own authorization, approval, exposure, noninteractive behavior, transport concerns, and remote locality. They must not expose `Zotero.Item`, `Zotero.Collection`, `nsIFile`, DOM windows, local paths, or other host runtime objects.

## Portable Contract Invariants

Broker inputs and DTOs use strict JSON values: null, booleans, strings, finite numbers, arrays, and plain objects. Undefined properties, non-finite numbers, class instances, dates, maps, sets, functions, bigint values, and cycles are outside the contract. Known internal serializers must construct valid DTOs directly; unknown payload ingress is validated recursively before it becomes broker output.

Capability failures use `ZoteroHostCapabilityError` with a stable `code`, `retryable`, and optional strict-JSON `details`. The broker never includes raw refs, native errors, or causes in details. Host Bridge and MCP translate this canonical failure into their existing external envelopes without changing the public error code.

Tests inject a complete fail-closed broker. Any unconfigured member throws, so a test cannot silently fall back to the real Zotero runtime or use a partial object cast as a broker.

## MCP Transport Boundary

The embedded Zotero MCP server is Streamable HTTP-only. It supports stateless `POST /mcp` JSON-RPC requests and notifications, does not return `Mcp-Session-Id`, and does not provide legacy SSE fallback.

Transport rules:

- ACP MCP descriptors for Zotero must use `type: "http"`.
- Authorized MCP requests must use the descriptor-provided bearer header.
  Query-string token authentication is not accepted for `POST /mcp`.
- Requests with an `Origin` header must come from localhost-compatible origins.
- `GET /mcp` is not a receive stream and should return `405 Method Not Allowed`.
- `/mcp/message` is not supported and should return `404 not_found`.
- Oversized or malformed requests should receive structured HTTP/JSON-RPC
  failures before tool handlers run.
- Backends that advertise only SSE MCP capability should not receive the Zotero MCP descriptor; diagnostics should report HTTP MCP as unavailable.

This boundary exists because real agent transcripts showed successful Zotero MCP injection followed by tool-call failures in the legacy SSE path. Future compatibility work should improve Streamable HTTP behavior rather than reintroduce SSE transport state.

## MCP Concurrent Admission

MCP admits nine concurrent `tools/call` handlers. The Broker serializes only native Host slices across callers and instances. `initialize`, `tools/list`, JSON-RPC notifications, and `zotero.get_mcp_status` bypass tool admission.

The tenth inflight request fails before handler entry with JSON-RPC `-32001` and `data.code = "zotero_mcp_inflight_limit"`. Diagnostics report inflight limit/count, count at acceptance, execution duration, limit reason, and outcome. There is no pending tool queue, queue position, or queue-wait timeout.

## MCP Guard, Watchdog, And Circuit Breakers

Broker native admission protects Zotero APIs from concurrent entry. MCP separately guards running tools, request-level failures, and repeated tool crashes.

Reliability rules:

- A running `tools/call` has a 45-second watchdog. Timeout returns JSON-RPC `-32003` with `zotero_mcp_tool_timeout` and signals trusted logical cancellation.
- Timed-out handlers remain inflight until they settle. A native slice also retains its own admission until its underlying Host work settles, even after cancellation.
- Repeated native/runtime failures for the same tool should open a short-lived circuit breaker. Open circuits return `zotero_mcp_tool_circuit_open` with retry guidance instead of executing the tool again.
- Request listener failures should attempt a JSON-RPC fallback response before closing the transport, so clients do not only see `fetch failed` or `terminated`.
- Watchdog restarts should be diagnosable. If a restart changes the endpoint, diagnostics must mark the descriptor as stale because the active ACP agent session may need to reconnect to receive the new descriptor.
- Agents can call `zotero.get_mcp_status` to inspect server, inflight admission, guard, and recent request state. The status tool must never expose bearer tokens.

These guardrails are a reliability layer around the broker; they do not change the broker boundary or permit raw Zotero access.

## Capability Domains

Read/context capabilities include current view, selected items, item search, item detail, notes, attachments, annotations, collection membership, and metadata identifier translation. Host Bridge handlers resolve these through the canonical broker, not through `WorkflowHostApi` or raw Zotero APIs.

`broker.metadata` is the broker-owned Zotero Translate facade for deterministic metadata lookup. `metadata.translateIdentifier()` may call Zotero `Translate.Search` for DOI, ISBN, arXiv, and PMID identifiers, but it must return only JSON-compatible DTOs: translated item fields, creator data, translator summaries, item counts, and diagnostics. It must not return raw `Zotero.Item`, window, `nsIFile`, translator runtime, or other host objects.

Mutation capabilities include note creation, tag changes, collection membership changes, item field updates, and single-paper `literature.ingest`. Remote writes use canonical `mutations.preview()` and `mutations.execute()` with the adapter's explicit permission gate. ACP workflows may opt into a per-run write auto-approval control; when the workflow declares support, the user enables it, and the Host Bridge CLI profile scope is registered for that run, mutation execute may skip UI approval. This bypass does not cover workflow submit, whose bypass remains the global `hostBridgeDisableWriteApproval` debug preference. Permanent deletion retains its explicit exposure restrictions.

`literature.ingest` requires bibliographic item creation/reuse and requested collection membership to complete. Existing matches preserve curated metadata. Required-effect failure rolls back only changes made by this invocation. PDF acquisition and conditional landing-URL attachment are optional enrichment: clean failure is reported separately, while uncertain or residual writes produce unknown or repair_required evidence. Landing creation requires `attachLandingUrlOnMissingPdf` and no PDF. Identity lookup is bounded and does not materialize the complete library.

Every write has effect-free preparation with private revision/state and file evidence. Public preview exposes safe plan facts and `domainPlanDigest`. Approval wait triggers preparation again; changed digests require renewed approval. Execute revalidates inside the admitted native slice before effects, without silently refreshing a stale plan.

`zoteroHostMutationAuthority.ts` owns durable admission through pluginStateStore SQLite. Caller scope plus operationId binds operation kind and normalized semantic digest; only the insert winner executes. Replay checks stored identity before resource acquisition or preflight. Success is returned only after terminal evidence is durable. Interrupted started records and post-effect evidence failures become unknown. Known terminal evidence remains for 30 days; unknown/repair_required is retained. Expiry removes evidence but retains an identity tombstone permanently. Observation returns running, settled or unavailable and propagates storage failure.

Bridge/MCP/CLI use the stable profile-local host-bridge caller namespace and `mutation.get_operation`; generic HTTP operation history remains separate. Workflow explicitly projects mutations.getOperation with its caller scope. Neither observation nor replay reconstructs a historical outcome from current item state.

Host services include file operations, preferences, editor sessions, notifications, and logging. These belong to `WorkflowHostApi`; MCP should expose them only when a user-facing tool contract requires them.

Workflow file services may move binary sidecar artifacts such as representative-note images through `hostApi.file.readBytes`, `hostApi.file.writeBytes`, and `hostApi.file.copy`. These APIs are workflow-host capabilities; MCP tools should still avoid embedding large file bytes in JSON responses.

Diagnostics/logging capabilities should remain separate from user data tools. Diagnostic bundles may reference broker state, but should continue redacting secrets and avoiding raw host objects.

UI/dialog/editor capabilities are host interactions, not agent defaults. They should be exposed to workflow hooks deliberately and to MCP only after a clear interaction model exists.

## Library Page Query Boundary

Broker `library.listItems`, `syncSnapshot`, and `readinessAudit` share `zoteroLibraryPageQuery.ts` as their library-selection SSOT. The service normalizes library, collection, tag, item type, and text criteria; builds one parameterized SQLite predicate for both count and page queries; orders by `items.itemID`; selects `limit + 1` IDs; and hydrates only the returned page through array-form `Zotero.Items.getAsync(ids)`. These broker paths must not use `Zotero.Items.getAll()` as a pagination fallback.

Text queries match title, creator, date, publication, abstract, tag, or item key as independent fields under Zotero SQLite `NOCASE` semantics. `%` and `_` are escaped as literal query characters. The structural predicate excludes deleted items, child notes, and child attachments before paging.

Ordinary library cursors are opaque strings bound to domain, source, normalized criteria, and ordering position. They have no TTL and do not promise snapshot consistency. A first request omits `cursor`; subsequent requests pass through the exact returned `nextCursor`. Clients must not decode, increment, persist as durable identity, or substitute numeric offsets. Malformed, unsupported, criteria-mismatched, and numeric cursors fail with the Broker's non-retryable `invalid_request` and `details.field: cursor`; the existing Bridge item-list adapter maps this to `invalid_library_cursor`. Neither boundary restarts from the first page.

Collections, Saved Searches, child notes, attachments, and annotations use source pages with default 25 and maximum 100, hydrating only current targets. Saved Searches return portable refs and display names; duplicate names remain distinct identities. Any failed target fails the entire page. Payload discovery scans bounded candidates, preserves duplicates, and returns `scanned`, `returned`, `total: null`, and continuation; consumers must follow empty nonterminal pages. Single-type lookup checks the complete candidate set for ambiguity. Note HTML, encoded payload input, and decoded values each have a 1 MiB bound.

Long native loops release admission after at most 100 items or 50 ms, whichever comes first. Network/file work, callbacks, detached JSON processing, and completion hashing stay outside admission. Cancellation is checked before enqueue, before entry, between bounded targets, and after awaited Host work. Snapshot sessions retain their independent 30-minute TTL, 500/1000 public batches, and fixed-basis completion evidence; multiple native slices may serve one public batch.

`totalScanned` remains the total number of items matching the current normalized criteria, while `returned` is the number of DTOs emitted by the capability. The count may therefore exceed the current page size without causing non-page Zotero items to be materialized in JavaScript.

## MCP Projection Rules

The embedded MCP server publishes the public capabilities selected by the Host Bridge contract. Its tool IDs, JSON Schemas, effects, approval requirements, exposure flags, response-sizing policy, and execution handlers all come from the same Host Bridge capability registry. MCP must not maintain a second tool catalog or reconstruct a broker from a workflow API.

MCP is an adapter boundary:

- Resolve one `ZoteroHostCapabilityBroker` through `resolveZoteroHostCapabilityBroker()`.
- Pass that broker to the Host Bridge handler selected by the canonical capability ID.
- Validate input and output against `host-bridge/contracts/capabilities.v2.json`.
- Apply MCP transport formatting and permission interaction outside the broker.
- Keep agent-facing IDs identical to the Host Bridge IDs, such as `context.get_current_view`, `library.list_items`, `mutation.preview`, and `mutation.execute`.

Read capabilities must be bounded, paged, or chunked where their natural result can grow. Write calls first execute `mutation.preview`; `mutation.execute` runs only after the adapter's approval policy succeeds. The broker does not know whether its caller is MCP, Host Bridge, a workflow, or a specific agent backend.

## Attachment Locality Contract

The canonical broker is process-local and may return an attachment DTO containing `path` to trusted in-process callers. Host Bridge is the sole remote-locality adapter. Both `library.get_item_attachments` and attachment results nested under `mutation.execute` use the same projection:

- Remove `path` before output validation and serialization.
- Register readable local files with the Host Bridge file registry.
- Return `access.mode = "bridge-download"` plus an opaque file descriptor when registration succeeds.
- Return `access.mode = "unavailable"` and `file = null` when no safe registered file is available.
- Never infer that an MCP client shares the Zotero process's filesystem, even when the transport endpoint is loopback.

The Host Bridge v2 output schemas explicitly reject attachment objects containing `path`. MCP mirrors the same handler result, so there is no separate MCP attachment policy.



## Workflow Host API v12 Portable Archive Boundary

Workflow Host API v12 provides generic local migration primitives without
embedding concrete workflow semantics in core modules:

- `file.pickSaveFile` uses Zotero's native save picker, including suggested
  filenames and replacement confirmation.
- `archive.measureEntries`, `archive.writeZipAtomic`, and
  `archive.withExtractedZip` validate unique portable entry paths, support
  text/bytes/file-backed entries, expose integrity metadata, preserve an
  existing target on write failure, and scope extracted temporary files to a
  callback.
- An extracted archive exposes `measureEntries(entryNames)` so package code
  can verify enumerated files entirely in the Host without receiving host
  paths or transferring file bytes across the package boundary.
- `researchBundles.materializePapers` and `researchBundles.importPapers`
  transfer the complete portable paper graph through the canonical owner.
- Local attachment import uses trusted managed staging and native importFromFile.
  Stored-file and stored-URL replacement preserves attachment identity, placement
  and link mode; linked-file, linked-URL and embedded-image replacement is unsupported.
  Companion validation, file authority and compensation remain private to the owner.
- `context.getCurrentView()` includes `currentCollection` only when the active
  library-tree row is a real Zotero collection.

Workflow packages own Product schemas, selection roles, bibliography, Topic
layout, registration, and workflow-level diagnostics. Shared Research Bundle
Materialization owns canonical per-paper source, artifact, Markdown-image, and
availability-warning semantics; direct-export delivery and Workflow Host
warning projection remain separate adapters.

## Maintenance Rules

Update this SSOT in the same change when:

- `WorkflowHostApi` public surface changes.
- Canonical mutation ownership or durable result behavior changes.
- Zotero MCP tool names, inputs, or outputs change.
- MCP-exposed mutation permission policy changes.
- Workflow package runtime capability boundaries change.

This document complements `doc/components/workflow-hook-helpers.md` and defines the governance boundary across host APIs.
