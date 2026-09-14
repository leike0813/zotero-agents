# Literature Artifact Migration

`src/modules/literatureArtifactMigration.ts` owns the explicit migration
lifecycle for legacy Literature References and Citation payloads, while
`src/modules/literatureArtifactMigration/converter.ts` owns their pure one-way
conversion. The Dashboard owns the user-facing operation; the normal Broker
reader, Workflow Host, Bundle, Synthesis, and ordinary import paths remain
canonical-only.

## Ownership and boundary

The migration is registered with the static identity
`literature-artifacts` and definition version `4`. Its public runtime surface
is the service returned by `createLiteratureArtifactMigrationService()`:

| Operation | Effect |
| --- | --- |
| `scan` | Reads one library, reports bounded item/candidate progress, and creates a process-local preview plus durable bounded history. |
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

The Dashboard filters the complete process-local plan by search,
classification, reason, and disposition before returning 25 candidates per
page. Ready sets start included. Review and blocked sets expose bounded issue
choices in a details drawer and remain pending until every issue is resolved
and the user approves the set; Skip leaves the source unchanged. The page
shows real scan/apply progress immediately, marks the initiating command busy,
and locks filters, history selection, paging, and candidate controls until the
active transaction settles; Stop remains available. Its full-width toolbar
keeps commands, summary pills, search, and three filters on one row when wide,
moves search and filters to a second row below 1100 px, and uses a two-column
filter grid below 560 px. It renders no library selector and stays within the
personal library bound by the scan.

Migration history is a run-list/detail view rather than a flat operation log.
Selecting a run projects its status, timestamps, processed/remaining counts,
reason and bounded diagnostics, followed by paged set receipts with the
persisted parent title, classification, outcome, counts, reason codes, and
diagnostics. Terminal receipts render outcome badges instead of selection
checkboxes. Failed and attention-required runs offer Continue, which always
starts from a fresh scan. The selected run also shows its primary non-success
set inline, including the sanitized authority message, error code,
mutation/effect phases, recovery, operation and attempt IDs, and
affected/residual counts. This evidence is read directly from the durable
mutation authority and remains available when correlated runtime logs are
empty. The diagnostic export combines the same bounded facts with runtime
issue logs correlated by run ID. It omits raw payloads, titles, parent or
native refs, paths, and unsanitized exceptions.

## Migratable payload

The converter treats References and Citation payload blocks as the migratable
target. Known non-target managed payloads (digest, score, literature matching
metadata, conversation, custom markdown) are preserved on the target note and ignored by the migration. Any
unknown payload block not in the approved managed set still blocks the set
with `unsupported_input`.

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

When a legacy note is reused, only its old attachment-backed v1 payload and the
new v2 payload may coexist until verification finishes. A superseded v2
attachment is replaced inside the parent-set transaction; retaining it would
make the subsequent canonical read ambiguous. The writer verifies the exact
new v2 logical hash and excludes only the matching v1 attachment already
queued for cleanup from its migration-local detail read. The normal
managed-note reader remains strict. Cleanup moves the identified v1 attachment
to Trash, and source pagination excludes trashed child items from later payload
reads.

Zotero may unload erased and newly created attachment objects when its
transaction commits. The writer therefore captures each attachment's portable
ref and active version while the object is still readable: immediately before
erase for the old attachment and before leaving the write helper for the new
one. Post-commit receipt construction uses only that immutable evidence, so a
successful replacement cannot be reclassified as a generic commit failure
while projecting either receipt change. The native item for a new attachment
is retained only for failure compensation.

Parent-set verification is scoped to the requested managed-note kind. Citation
health may read the paired References note, but singleton discovery skips a
child whose visible managed markers consistently identify Score, Digest, or
another different known kind. Unknown, conflicting, and same-kind content is
still inspected and fails closed when invalid. An unrelated damaged artifact
therefore cannot turn an already committed References/Citation set into a
failed receipt.

Migration does not convert or rewrite Literature Score. Managed reads accept
both the current bare `literature_score.v1` payload and the exact historical
`{ version: 1, entry, format: "json", literature_score }` storage envelope,
normalizing the latter to its canonical inner artifact. Generic wrappers and
external producer/import contracts remain strict. Score notes and attachments
are preserved byte-for-byte by References/Citation migration.

Native attachment bytes are staged under short opaque temporary names before
the Zotero transaction. Operation and attempt identity belongs to durable
authority records, not staging paths; keeping it out of filenames avoids the
Windows path-length failure that otherwise prevents payload files from being
written before the transaction starts.

Mutation authority outcomes retain their side-effect meaning. `committed` and
`unchanged` become `applied`; `repair_required` and `unknown` remain
repair-required because an effect may exist; pre-commit `failed` and `canceled`
become a failed set and failed run. A failed set stops admission of later sets,
while earlier committed set receipts remain intact.

## Durable lifecycle

`pluginStateStore/literatureMigrationTables.ts` owns the private SQLite records,
while `pluginStateStore.ts` keeps their public composition seam:
`plugin_literature_artifact_migration_runs` and
`plugin_literature_artifact_migration_sets`. A run stores the migration ID,
definition version, library, state, counts, timestamps, and bounded
diagnostics. A set receipt stores its parent title, candidate refs, basis hash,
classification, outcome, counts, timestamps, and bounded diagnostics. Full
payloads, hidden backup notes, and a permanent migrated flag are not stored.
Failure diagnostics retain stable reason codes plus the sanitized public
message, phase/recovery, operation and attempt IDs, and affected/residual
counts. Native exception text, paths, refs, titles, and raw payload details do
not enter durable history or the migration diagnostic bundle.

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
tests/ui/264-literature-migration-browser.test.ts
```

They cover deterministic identity, snapshot recovery, citation-only gates,
file preview preservation, bounded receipts, single-flight, scan/apply stop,
fresh-scan restart, complete-plan filtering, issue resolution, the bounded
Dashboard projection and browser layout, and the bundle
HTML/legacy-PNG preview-confirmation path. The bundle regression is in
`tests/workflow-literature-workbench-package/47-workflow-literature-bundle.test.ts`.
The real Zotero References/Citation migration path is covered by
`tests/zotero/core/lite/275-managed-note-transaction.zotero.test.ts`, including
v1/v2 and dual-v2 replacement pairs and a newly created payload attachment
becoming unreadable after transaction commit. The Broker regression separately
models an attachment becoming unreadable immediately after erase in
`tests/zotero-host/102-zotero-host-broker-capability-api.test.ts`. Upstream
renderer pins and sidecar build identity remain separate completion gates.
