## Overview

This change closes two review loops without expanding the Synthesis KG surface beyond the plugin service and Workbench. Topic Graph review is a status transition on existing suggested edges. Concept KB review stores proposal-derived review items as canonical assets and applies explicit user decisions later.

## Topic Graph Review

Topic Graph adds a relation decision helper that loads the current graph, finds the requested `edgeId`, and only updates edges whose status is `suggested`. Accept sets `confirmed`; reject sets `rejected`. The transaction keeps the same edge id, endpoints, relation, provenance, evidence, and confidence, only updating status and `updated_at`.

Missing edges or non-suggested edges return structured diagnostics and do not throw for normal UI use. Successful decisions use canonical transactions, mark `topic-graph-index` stale, and are exposed through `SynthesisService` with Git Sync autosync.

## Concept KB Review Queue

Concept proposal ingestion already identifies low-confidence and ambiguous matches. Instead of only writing diagnostics, those cases now write canonical review items under `synthesis/concepts/review/*.json`.

Each review item stores the normalized proposal, source topic, topic path id, reason, candidate concept ids, status, and timestamps. Open review items are included in Concept KB snapshots and the rebuildable projection DTO.

Review actions:

- `approve_create`: create a new concept/sense/alias/topic link from the stored proposal.
- `merge_into_existing`: create a sense/alias/topic link under `targetConceptId`.
- `reject`: mark the item rejected without creating concept assets.

Review action transactions update the review item and any affected concept assets together, mark `concept-kb-index` stale, and trigger service-level autosync.

## Workbench Integration

Topic Inspector exposes suggested relation rows with `edge_id`, relation, status, and neighbor topic. Accept/Reject buttons send the specific edge id to host commands.

Concepts tab gains a Review Queue section that lists open review items, their reason, label, confidence, and candidates. It offers Approve as New, Merge, and Reject host commands. Merge v1 chooses an explicit candidate concept id from the item candidate list.

## Non-Goals

- No drag-and-drop graph editor.
- No batch review.
- No concept field editing inside the review queue.
- No semantic merge algorithm beyond the existing candidate detection.
- No external MCP tool or hosted review API.
