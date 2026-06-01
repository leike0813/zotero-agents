## Why

The current Registry implementation derives Zotero-bound `literature_item_id`
from `paper_ref`, which makes a local Zotero binding look like the canonical
intellectual-work identity. The latest Synthesis design requires IDs to derive
from selected identity anchors, with strong work identifiers taking precedence
over binding fallback.

## What Changes

- Add deterministic identity anchor normalization and ID derivation.
- Resolve accepted redirects and strong identifiers before using binding
  fallback IDs.
- Preserve binding lookup semantics through Zotero binding rows.
- Retarget old binding-derived IDs through redirects when a stronger identity is
  available.
- Update matching metadata and graph materialization paths to use resolved
  literature IDs.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `synthesis-paper-registry`: Literature identity becomes anchor-derived.
- `synthesis-literature-registry-citation-graph`: Graph records use resolved
  literature identities.

## Impact

Affected implementation includes Registry identity helpers,
`src/modules/synthesis/literatureRegistry.ts`, repository binding/identifier/
redirect APIs, metadata cache lookup, and Registry/Citation Graph tests.
