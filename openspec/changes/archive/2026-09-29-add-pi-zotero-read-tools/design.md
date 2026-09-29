# Design

## Context

See proposal.md. C12 owns one static native definition. C07 owns schema validation, admission, evidence, and result envelopes. The preceding managed-workspace change gives C08 page-atomic source copies and bounded staged text output. The Broker is the sole Zotero read implementation.

## Goals / Non-Goals

**Goals:** One static catalog of fourteen reviewed read tools, canonical DTO pass-through where safe, and owner-managed file results.

**Non-Goals:** A second Broker, new Gateway policy, owner composition, UI, or generic tool/schema registry.

## Decisions

1. Hard-cut the factory to `{ broker, workspace }`, with `workspace` a member-level pick of the C08 return type. Freeze one definition per reviewed capability; never derive a tool name from a Broker member. The Q98 removal leaves thirteen additions: selected items; list items/collections; item, note and audit detail; item notes/attachments; annotations and export; identifier translation; readiness audit; traversal.
2. Use closed model schemas. Shared portable item and collection refs, page limit/cursor, and list filters mirror canonical DTO fields. Construct Broker request objects explicitly; pass trusted `signal` in `WorkflowCallControl`. Error mapping reuses C12's safe Broker error projection.
3. `get_item_attachments` substitutes paths in a copied DTO only after one `materializeOrReuseMany` succeeds. `get_item_detail` strips only the attachment branch's source path, preserving other metadata. This resolves the otherwise contradictory raw-path and unchanged-DTO requirements without making ordinary detail reads mutate the workspace.
4. Export writes Broker Markdown or JSON to a C08 generated text output. Traversal writes each batch item as one NDJSON line; commit only completed or resource-limited outcomes. Always discard on cancel/error, and report cleanup uncertainty. Keep Broker coverage and cursor facts unchanged.
5. `get_note_detail` lets the Broker produce semantic managed content. If its serialized result exceeds 50 KiB, fail before Gateway publication with safe managed kind and size details. C07 remains the final result gate.

## Risks / Trade-offs

- Broker attachment DTOs carry host paths → project every attachment-bearing result before exposing it to the Gateway.
- Large legal pages can exceed the 50 KiB result bound → return `resource_limited`; callers request a smaller page.
- The Broker currently builds annotation exports in memory → C13 does not add another collection pass or claim streaming from the Broker.

## Migration Plan

No persisted data changes. Update existing factory callers and shared tests in one cut. Verify, sync the catalog delta, and archive after the preceding C08 change is complete.
