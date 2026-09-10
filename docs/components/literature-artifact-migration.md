# Literature Artifact Migration

`src/modules/literatureArtifactMigration.ts` owns the explicit migration
lifecycle for legacy Literature References and Citation payloads, while
`src/modules/literatureArtifactMigration/converter.ts` owns their pure one-way
conversion. The Dashboard owns the user-facing operation; the normal Broker
reader, Workflow Host, Bundle, Synthesis, and ordinary import paths remain
canonical-only.

## Ownership and boundary

The migration is registered with the static identity
`literature-artifacts` and definition version `2`. Its public runtime surface
is the service returned by `createLiteratureArtifactMigrationService()`:

| Operation | Effect |
| --- | --- |
| `scan` | Reads one library and creates a process-local preview plus durable bounded history. |
| `apply` | Accepts only the issued scan operation and candidate IDs, re-reads each set, and applies independent sets. |
| `stop` | Stops claiming later sets while allowing the current set to settle. |
| `continue` | Starts a fresh scan for retryable receipts after explicit user action. |
| `listHistory*` / `listReceipts*` | Returns bounded typed views and opaque cursors. |

The Dashboard action payload contains runtime-issued operation, run, and
candidate references. It never carries a Source Reference, Citation payload,
HTML, file path, native Zotero ID, or migration plan. Workflow Host, Host
Bridge, MCP, Pi, and CLI do not expose a migration command.

The Dashboard `MigrationsRegion` is an observation and command projection. It
keeps the entry visible when the runtime is unavailable or the scan is empty,
and its region signature contains only bounded view facts. Selecting the tab,
opening history, or deep-linking to a run does not scan or write. Scan/apply
are dispatched only from the explicit local actions.

This migration is scoped to the Zotero personal library. Before a preview or
run exists, the Dashboard projection supplies `Zotero.Libraries.userLibraryID`;
the region does not own a separate library selector or infer a library from UI
selection.

## Converter

`convertLegacyArtifactSet()` is the only legacy conversion entry point. The
converter is pure and is shared by the library adapter and the private
ordinary Import preview path. Canonical input is handled by the normal importer
and must not pass through this converter.

The converter preserves the approved evidence order: a unique retained
non-positional identity, normalized DOI, normalized raw citation, and then
normalized title/year/authors. Normalization is limited to NFKC and whitespace,
DOI wrapper/case, author array or semicolon forms, and strict integer year
forms. Positional `ref_number`, fuzzy or model matching, punctuation removal,
year tolerance, and cross-parent lookup cannot establish identity.

Every converted reference has an opaque `sourceReferenceId`. An explicit valid
canonical ID is retained; a legacy ID or positional number is never treated
as a canonical identity. Citation mentions preserve their evidence fields,
while function category and `role_in_context` remain separate. A recovered
Citation snapshot receives a new ID and `review_required` evidence. Missing,
ambiguous, contradictory, damaged, unsupported, or lossy input is represented
as unresolved/review or blocked with bounded diagnostics; dropped facts never
silently pass the apply gate.

The converter does not consume or rewrite source files. A recognized legacy
ordinary Import shows a bounded preview and requires explicit confirmation;
unknown or damaged input fails closed. Citation-only offline input is allowed
only when the target already has canonical References and deterministic
linkage can be retained. The private
`previewLegacyArtifactSetForImport()` editor-owner seam accepts standalone
file payloads and validated bundle note contents through the same converter;
it returns bounded preview facts while retaining canonical payloads in a
process-local result until confirmation.

The Literature Bundle importer applies the same private seam to recognized ZIP
inputs. It reads the bundle's raw note HTML and, when an anchor identifies a
legacy payload image, the original PNG bytes before materializing files. The
editor renders only item/count/reason facts; the conversion payload remains
private until the user confirms. Confirmation then sends one canonical paired
References/Citation import through `researchBundles.importPapers`, strips the
legacy markers from the transferred note body, and excludes only the consumed
legacy payload images. The ZIP and its source entries are never rewritten.
Canonical inline payloads and current v2 payload images stay on the normal
import path. Literature Product projections for custom, conversation, digest,
References, Citation, and score are decoded with the strict contract parsers
where applicable and supplied to the managed writer; duplicate embedded v2
facts are checked by the writer's semantic equality rules. These read-only
projection files are never used as legacy conversion evidence, and a
projection without matching note HTML or embedded-image source evidence is
rejected. A canceled,
unsupported, or damaged legacy candidate returns
`legacy_artifact_requires_migration` before any parent import.

## Library adapter and write order

`createLiteratureArtifactMigrationHostFromZoteroBroker()` is the production
adapter. It obtains regular parents and note summaries through the Broker's
bounded pages. Legacy note HTML and all payload blocks are read through the
private `readLegacyForMigration` control; canonical `getNoteDetail` is not a
legacy parser. The private read keeps the original visible HTML, payload facts,
source note refs, and read errors for the converter.

For each selected set the adapter performs this sequence:

1. Re-read the current legacy facts, permission, revision, and basis.
2. Return `changed_since_scan` without a write when the basis changed or the
   legacy representation disappeared.
3. Submit References and Citation together to the trusted private
   `applyParentSet` seam. The Broker performs one parent-set admission, one
   Zotero transaction, one operation identity, and one durable mutation receipt.
4. Verify that the committed result contains managed canonical notes.
5. Pass the optional cleanup tail with the same private parent-set operation.
   After canonical verification, that operation removes legacy machine markup
   from non-target note HTML and Trashes only legacy payload attachments; the
   target note's visible HTML, images, and auxiliary content remain on the
   reused note. Cleanup failure keeps the canonical pair and settles the same
   authority receipt as `repair_required`.

Canonical verification must precede cleanup. If cleanup fails, canonical data
is retained and the set is `repair_required`; a failed cleanup never deletes or
overwrites the original representation. Ordinary notes and ordinary
`notes.updateContent` remain protected by the Broker.

## Durable lifecycle

`pluginStateStore/literatureMigrationTables.ts` owns the private SQLite records,
while `pluginStateStore.ts` keeps their public composition seam:
`plugin_literature_artifact_migration_runs` and
`plugin_literature_artifact_migration_sets`. A run stores the migration ID,
definition version, library, state, counts, timestamps, and bounded
diagnostics. A set receipt stores its candidate refs, basis hash,
classification, outcome, counts, timestamps, and bounded diagnostics. Full
payloads, hidden backup notes, and a permanent migrated flag are not stored.
Failure diagnostics are stable reason codes; native exception messages, paths,
and raw payload details do not enter durable history.

Only one scan or apply is active in a process. A completed preview releases
the active gate; apply obtains it again. Each set gets its own operation ID.
After restart, nonterminal runs become `failed: interrupted` and an old
process-local preview returns `fresh_scan_required`. Continue creates a fresh
scan, walks all durable receipt pages, and reclassifies current facts. It does
not replay an old plan or queue a background worker.

Broker detail/resource budgets remain distinct from downstream adapters: the
Broker may return complete managed detail up to its approved 1 MiB domain
budget, including exact byte facts. A downstream ToolResult adapter may apply
its own 50 KiB gate when that adapter's contract requires it; the migration
module does not add a new unconditional ToolResult gate.

## Verification boundary

The focused Node migration and Dashboard tests are:

```text
tests/tooling/264-literature-artifact-migration.test.ts
tests/ui/264-literature-migration-region.test.ts
```

They cover deterministic identity, snapshot recovery, citation-only gates,
file preview preservation, bounded receipts, single-flight, stop-at-set,
fresh-scan restart, the bounded Dashboard projection, and the bundle
HTML/legacy-PNG preview-confirmation path. The bundle regression is in
`tests/workflow-literature-workbench-package/47-workflow-literature-bundle.test.ts`.
Node transaction and source-query seams do not establish native Zotero
rollback evidence. A native transaction run, upstream renderer pin, and
sidecar build identity remain separate completion gates.
