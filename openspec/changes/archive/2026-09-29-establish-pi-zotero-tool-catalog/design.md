# Design

## Context

C07 freezes tool definitions and owns policy, attempt facts, receipts, and result envelopes. The canonical `ZoteroHostCapabilityBroker` is already complete and #39 has a complete v0.9.0 release receipt. Its `context.getCurrentView()` returns a portable `CurrentViewDto`. The #26 C12 plan names a `PiToolDefinition`; the delivered generic type is `PiGatewayToolDefinition`. The old `test/core` and `test:node:core` paths are absent; current tests live under `tests/runtime` and `tests/zotero/core/lite`.

## Goals / Non-Goals

**Goals:** A single broker-bound definition that exercises the complete Broker → catalog → Gateway path, plus a generic Gateway failure projection that retains safe broker facts.

**Non-Goals:** Global Broker resolution, new Broker semantics, Host Bridge/MCP/Workflow Host changes, owner composition, or placeholder definitions for later changes.

## Decisions

1. Export `createZoteroNativeToolDefinitions(broker: ZoteroHostCapabilityBroker): readonly PiGatewayToolDefinition[]`. Require the injected `context.getCurrentView` member at construction. Define one explicit mapping (`context.get_current_view` → `zotero_context_get_current_view`), a closed empty JSON Schema, `bounded-read`, no authorization/resource keys, cost 1, and a 50 KiB serialized result limit. The factory owns no digest or mutable state. C13 will make the accepted object-parameter cutover when it adds owner Workspace projection.
2. The executor calls only `broker.context.getCurrentView()`. On success it returns the broker DTO as its value; Gateway performs its existing strict-JSON validation, bound, and copy. A `ZoteroHostCapabilityError` becomes a failed execution with its safe code, retryability and details. An unknown exception becomes `internal_error` with no native payload. There is no direct Zotero fallback.
3. Extend C07's generic execution type with optional `retryable` and `details`; extend its failure result with optional strict-JSON `details`. On a failed execution, Gateway validates and bounds details before copying them into its existing failure envelope. Its receipt remains payload-free. Gateway-generated failures keep their existing fields and categories. This solves the C12 gap once, without a Zotero-specific Gateway branch or a second failure wrapper.
4. Tests use the public factory and Gateway turn API, `createFailClosedZoteroHostCapabilityBroker` for a complete mock, and one real Zotero lite Broker canary. The Node shard selector gains the new runtime test; Zotero test discovery already scans the lite directory.

## Broker disposition for later changes

This classifies every public member of `ZoteroHostCapabilityBroker`; C12 registers only the one member above. C13–C15 own the approved projections, not blanket exposure of every method in a group.

| Broker members | Disposition |
| --- | --- |
| `context.getCurrentView` | C12 |
| `context.getSelectedItems` | C13 |
| All seven `navigation.*` members | C15 |
| `library.listItems`, `traverseItems`, `listCollections`, `readinessAudit`, `getItemDetail`, `getItemAuditState`, `getItemNotes`, `getNoteDetail`, `listNotePayloads`, `getNotePayload`, `listAnnotations`, `exportAnnotations`, `getItemAttachments` | C13 |
| `metadata.translateIdentifier` | C13 |
| `mutations.getOperation`, `preview`, `execute` | C14 internal observation/preflight/dispatch; no generic model-visible mutation tool |
| `notes.create`, `updateContent`, `upsertPayload`; `managedNotes.writeCustom`, `writeConversation`; all four `literatureArtifacts.upsert*`; `attachments.create`, `updateMetadata`, `replaceFile`, `move` | C14 candidates through its 18 approved semantic tools |
| `library.listSavedSearches`, `syncSnapshot`, `cancelSnapshot`, `getArtifactReadiness`, `exportPortableItems`; `bibliography.*`; `statusTags.getPolicy`, `transition`; `notes.remove`; `attachments.remove` | Not exposed by the approved Native Tool catalog; status tags and bibliography keep their own domain ownership, generic snapshots/exports are excluded, permanent removal is forbidden |

## Risks / Trade-offs

- Broker failure details can contain unexpected values → validate strict JSON and the definition's byte limit before Gateway publication; discard invalid details and return a safe failure.
- The host's current view may be unavailable in a headless test window → run the real canary against Zotero's live main window and require a successful strict-JSON DTO; a missing view is a failed acceptance check to diagnose, not a substitute for success evidence.

## Migration Plan

No persisted schema or existing tool mapping changes. After focused and host verification, sync both delta specs and archive C12; the handoff records achieved evidence and remaining C13–C15 work.
