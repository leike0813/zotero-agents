# literature-artifact-migration Specification

## Purpose

Provide an explicit, reviewable upgrade path for legacy Literature Artifact payloads while keeping ordinary reads, imports, and Synthesis consumers on the canonical contract.

## Requirements

### Requirement: Artifact migration SHALL be an explicit Dashboard-local operation

The product SHALL expose a permanent Dashboard Migrations region with a statically registered Literature Artifact library migration entry. Opening, rendering, selecting, deep-linking, and observing the entry SHALL be side-effect free. The startup onboarding coordinator MAY invoke the same local service for a read-only personal-library scan. Decision, apply, stop, and continue SHALL remain Dashboard-local actions; Workflow Host, Host Bridge, MCP, Pi, and CLI surfaces SHALL not register or proxy the migration operation. Dashboard SHALL project the migration ID and exact current definition version from the registered migration definition rather than duplicating those values.

#### Scenario: The migration entry is unavailable or the scan is empty
- **WHEN** the user opens the Migrations region and the migration cannot run or finds no candidates
- **THEN** the Migrations region and its entry SHALL remain visible
- **AND** the entry SHALL show its own availability or empty result without hiding the surface.

#### Scenario: A user only navigates to migration history
- **WHEN** the user opens, selects, or deep-links to the migration entry or an existing run
- **THEN** the UI SHALL perform observation or navigation only
- **AND** it SHALL not scan, write, create a run, or dispatch a worker.

#### Scenario: A non-Dashboard transport requests migration
- **WHEN** Workflow Host, Host Bridge, MCP, Pi, or CLI receives a migration operation request
- **THEN** the request SHALL be unavailable or rejected as an unsupported operation
- **AND** it SHALL not create a scan or apply effect.

#### Scenario: Migration service is unavailable
- **WHEN** Dashboard cannot resolve the registered migration service
- **THEN** the view SHALL remain unavailable and SHALL NOT offer Apply
- **AND** an unknown non-positive placeholder version SHALL NOT be presented as an executable migration definition.

### Requirement: A migration scan SHALL bind one library and classify complete artifact sets

Each scan SHALL bind one explicit library, produce plans for regular parents' References/Citation sets, and classify every candidate as `ready`, `review_required`, or `blocked`. References-only sets MAY be candidates; Citation sets SHALL be paired with their References set. Duplicate, citation-only library notes, corrupted or contradictory content, unwritable targets, and representations that would lose data SHALL remain blocked.

#### Scenario: A scan finds deterministic canonical linkage
- **WHEN** every row in a References/Citation set has unique evidence and can be represented without loss
- **THEN** the set SHALL be classified `ready`
- **AND** applying it SHALL still require explicit user confirmation.

#### Scenario: A scan needs user review
- **WHEN** the set can be converted without loss but has unresolved linkage or a recoverable Citation snapshot
- **THEN** it SHALL be classified `review_required`
- **AND** apply SHALL require set-level opt-in.

#### Scenario: A scan detects a blocking condition
- **WHEN** the set has duplicates, contradictory facts, citation-only input without canonical References, damaged payload, no writable target, or unsupported data that would be dropped
- **THEN** it SHALL be classified `blocked`
- **AND** the UI SHALL not offer a force-apply path.

### Requirement: Migration linkage SHALL use deterministic evidence and preserve recovery facts

The converter SHALL match in this order: unique shared non-positional legacy identity, unique normalized DOI, unique normalized raw citation, then unique normalized title-plus-year-plus-authors. It SHALL permit only NFKC, whitespace, DOI wrapper/case, author array/semicolon, and strict integer/string year normalization. Position, `ref_number`, token similarity, punctuation stripping, year tolerance, fuzzy/model matching, and cross-parent lookup SHALL not establish identity.

#### Scenario: A legacy row has no unique match
- **WHEN** zero candidates match the allowed evidence levels
- **THEN** the row SHALL be represented as unresolved and the set SHALL require review or remain blocked
- **AND** the converter SHALL not guess an identity.

#### Scenario: A strong identity conflicts with facts
- **WHEN** a shared legacy identity or normalized DOI maps to a candidate whose authoritative facts conflict
- **THEN** the set SHALL be blocked
- **AND** no Source Reference or Citation write SHALL occur.

#### Scenario: A Citation snapshot can restore a missing reference
- **WHEN** a Citation snapshot contains canonical minimum facts, no equivalent existing row exists, and the evidence is consistent
- **THEN** the converter MAY create a new opaque Source Reference ID in the same plan
- **AND** the set SHALL be `review_required` with a separate recovery count and evidence record.

### Requirement: Migration apply SHALL use a runtime-owned plan and one verified parent-set commit

The UI SHALL submit only a scan operation identity and runtime-issued candidate IDs. The runtime SHALL re-read current facts, permissions, definition version, and basis before each set. For a paired References/Citation set, the trusted writer SHALL commit both artifacts in the same Zotero transaction with one operation identity and one durable set receipt; it SHALL verify the pair and basis before any cleanup.

#### Scenario: A candidate changed after scan
- **WHEN** the current artifact, note revision, permission, or basis no longer matches the scan plan
- **THEN** the set SHALL produce `changed_since_scan` without writing
- **AND** other independent sets MAY continue.

#### Scenario: A paired set passes verification
- **WHEN** staging, References/Citation validation, basis verification, and parent-set commit all succeed
- **THEN** the canonical pair SHALL be visible as one committed semantic result
- **AND** only then MAY old inline payloads be removed and old user payload attachments moved to Trash.

#### Scenario: A reused migration target temporarily contains v1 and v2 payload attachments
- **WHEN** a canonical v2 payload has been written to a reused legacy note while its exact legacy v1 payload attachment is retained for compensation
- **THEN** migration verification SHALL ignore only that identified v1 attachment after verifying the v2 logical hash
- **AND** ordinary managed-note reads SHALL retain their strict ambiguous-payload behavior
- **AND** the identified v1 attachment SHALL remain part of the required cleanup tail.

#### Scenario: A reused migration target contains a superseded v2 payload attachment
- **WHEN** migration replaces an attachment-backed v2 payload whose logical schema or canonical payload hash differs from the requested payload
- **THEN** the superseded v2 attachment SHALL be removed in the same parent-set transaction as its replacement
- **AND** it SHALL NOT be retained or ignored as legacy cleanup evidence
- **AND** final managed-note verification SHALL observe exactly the requested canonical v2 payload.

#### Scenario: Zotero unloads a superseded attachment at commit
- **WHEN** a superseded payload attachment is erased and its native item object becomes unreadable when the transaction commits
- **THEN** the parent-set SHALL still settle as committed with strict-JSON deletion evidence captured before erase
- **AND** receipt construction SHALL NOT read the erased native item after commit.

#### Scenario: Zotero unloads a newly created payload attachment at commit
- **WHEN** the replacement payload attachment has been saved but its native item object becomes unreadable when the transaction commits
- **THEN** the parent-set SHALL still settle as committed with strict-JSON creation evidence captured before the transaction boundary
- **AND** receipt construction SHALL NOT read the newly created native item after commit.

#### Scenario: The parent has an unrelated historical or damaged managed artifact
- **WHEN** migration verifies a References/Citation parent-set and the same parent has a Score, Digest, or other known managed note that is historical, invalid, or unreadable
- **THEN** singleton discovery and Citation dependency enrichment SHALL inspect only the requested managed kind
- **AND** the unrelated artifact SHALL remain unchanged and SHALL NOT turn the committed parent-set into a failed receipt
- **AND** directly reading that unrelated artifact SHALL retain its own normalized result or typed diagnostic.

#### Scenario: Cleanup fails after canonical commit
- **WHEN** canonical verification succeeds but cleanup cannot be completed
- **THEN** the canonical result SHALL be retained
- **AND** the set SHALL be `repair_required` and the run SHALL be `completed_with_attention`.

#### Scenario: An infrastructure failure occurs before a set commits
- **WHEN** a database or transaction failure prevents the set's commit
- **THEN** the set and run SHALL report a typed failure
- **AND** the runtime SHALL stop claiming later sets while preserving every earlier committed receipt
- **AND** independently committed sets SHALL not be rolled back by a global coordinator.

### Requirement: Migration lifecycle SHALL be durable, single-flight, and restart-safe

The migration runtime SHALL permit at most one active scan/apply in a process and SHALL share its active snapshot with multiple Dashboard windows. It SHALL persist an envelope and one receipt per completed set with library, migration ID, definition version, parent title, refs, basis/hash, classification, outcome, timestamps, bounded counts, and bounded diagnostics. Terminal run states SHALL be `completed`, `completed_with_attention`, or `failed`.

#### Scenario: A second run starts while one is active
- **WHEN** a user starts a scan or apply while another migration is active
- **THEN** the request SHALL return typed `busy` with the active run identity
- **AND** it SHALL not queue or duplicate work.

#### Scenario: The user stops a run
- **WHEN** stop is requested
- **THEN** the runtime SHALL stop claiming later sets
- **AND** a set already in commit SHALL finish verification and receipt persistence before stopping
- **AND** the run SHALL report `completed_with_attention` with processed and remaining counts.

#### Scenario: The process restarts with a nonterminal run
- **WHEN** a previously persisted run is found nonterminal after restart
- **THEN** opening migration UI SHALL classify it as `failed: interrupted`
- **AND** the runtime SHALL not replay, scan, dispatch, or continue it automatically.

#### Scenario: The user continues a prior run
- **WHEN** the user chooses Continue
- **THEN** the runtime SHALL create a new apply operation and re-read, reclassify, and revalidate every candidate
- **AND** it SHALL require fresh review when facts or classification changed.

### Requirement: Restart and definition changes SHALL require a fresh scan

After Zotero or the plugin restarts, an old actionable preview SHALL not be executable. Apply SHALL require the current static migration ID and exact definition version. An incompatible old receipt or candidate SHALL fail with a typed stale-plan or version-mismatch outcome while retaining bounded history.

#### Scenario: A user tries to apply a pre-restart preview
- **WHEN** the preview was created before the current process or Zotero restart
- **THEN** apply SHALL reject it as stale
- **AND** the user SHALL be directed to a new explicit scan.

#### Scenario: The migration definition changes
- **WHEN** a stored receipt uses a definition version that is not the current exact version
- **THEN** the receipt's common history summary MAY remain visible
- **AND** no old code or old plan SHALL execute.

#### Scenario: Dashboard projects an actionable migration
- **WHEN** the registered migration service is available or busy
- **THEN** Dashboard SHALL expose the registered migration ID and exact current definition version
- **AND** it SHALL NOT substitute a separately maintained version literal.

### Requirement: Offline legacy import SHALL reuse the migration converter with explicit confirmation

Recognized legacy note or bundle input SHALL be previewed and explicitly confirmed before conversion. Canonical input SHALL use the normal importer. Unknown or damaged input SHALL fail closed. References-only input MAY convert; paired References/Citation input SHALL commit as a set. Citation-only input SHALL be blocked unless the target parent already has canonical References and the converter can produce deterministic or explicitly accepted unresolved linkage. Original files and ZIPs SHALL never be overwritten or deleted. Dashboard migration and offline import SHALL obtain normalized artifacts, classification, reason codes, diagnostics, counts, and basis from the same converter entry and SHALL NOT independently reclassify its result.

#### Scenario: A recognized legacy bundle is imported
- **WHEN** a user selects a recognized legacy file or bundle
- **THEN** the UI SHALL show a bounded preview and require confirmation
- **AND** successful import SHALL write only canonical payloads through the shared converter.

#### Scenario: A Citation-only offline input lacks canonical References
- **WHEN** a selected legacy Citation input targets a parent with no canonical References
- **THEN** conversion SHALL be blocked before any write
- **AND** the original input SHALL remain unchanged.

#### Scenario: An unknown or damaged input is selected
- **WHEN** the converter cannot recognize or safely validate the input
- **THEN** it SHALL fail closed with a validation result
- **AND** it SHALL not create a partial note or attachment.

### Requirement: Migration SHALL preserve known non-target managed payloads

The Literature Artifact migration SHALL migrate only `references-json` and `citation-analysis-json`. It SHALL preserve `digest-markdown`, `literature-score-json`, `literature-matching-metadata-json`, `conversation-note-markdown`, and `custom-markdown` without treating their presence as unsupported input. Unknown payload types SHALL remain blocked unless the user selects a lossless preserve-and-migrate option, and cleanup SHALL remove only migrated References/Citation representations.

#### Scenario: Legacy parent contains target and known non-target payloads
- **WHEN** a writable legacy parent contains migratable References/Citation evidence together with known Digest, Literature Score, Literature Matching Metadata, Conversation, or Custom payloads
- **THEN** classification SHALL be based on the References/Citation conversion evidence without `unsupported_input`
- **AND** applying the candidate SHALL preserve every known non-target payload unchanged.

#### Scenario: Legacy parent contains an unknown payload type
- **WHEN** a legacy parent contains a payload type outside the registered target and non-target managed payload types
- **THEN** the candidate SHALL remain blocked until the user selects an applicable runtime-issued preservation option or skips it
- **AND** Apply SHALL NOT silently discard the unknown payload.

### Requirement: Dashboard candidate selection SHALL be bounded and explicit

The Dashboard SHALL project at most 25 migration candidates per page after filtering the runtime-owned scan plan and persisted candidate receipts. Ready candidates SHALL start included, review-required candidates SHALL become included automatically only after all required decisions are accepted and canonical write eligibility is established, and blocked candidates SHALL remain excluded until every blocking issue has an accepted runtime-owned resolution. The user SHALL review and confirm the final selection before writing. Applying from the Dashboard SHALL consume runtime-owned dispositions and choices and SHALL NOT require the page to hold the complete candidate ID set.

#### Scenario: A scan produces more than one candidate page
- **WHEN** a migration scan produces more than 25 candidates
- **THEN** the Dashboard SHALL render only the current filtered page with forward and backward navigation
- **AND** the candidate list SHALL remain independently scrollable
- **AND** selecting, filtering, opening details, or paging SHALL NOT expose parent refs or raw legacy payloads.

#### Scenario: User reviews candidate classifications
- **WHEN** the candidate page contains ready, review-required, and blocked candidates
- **THEN** ready candidates SHALL be included by default
- **AND** review-required candidates SHALL be included automatically after every required issue decision establishes write eligibility
- **AND** blocked candidates SHALL remain excluded until all blocking issues are resolved or the candidate is explicitly skipped.

### Requirement: Migration scanning SHALL expose bounded real progress

The Dashboard migration view SHALL expose scan progress from real library item counts, remain indeterminate until a total is known, and update through the existing bounded Dashboard snapshot cadence. Stop SHALL prevent admission of later scan items or pages.

#### Scenario: A library scan discovers its total
- **WHEN** the first bounded library page supplies the total item count
- **THEN** the Dashboard SHALL show completed items, total items, and discovered candidate count
- **AND** progress SHALL advance monotonically without an invented percentage.

#### Scenario: Scan or apply is active
- **WHEN** a scan or apply command has entered the migration runtime
- **THEN** the initiating command SHALL show a busy state and the Dashboard SHALL immediately show real progress
- **AND** filters, history selection, paging, and candidate mutation controls SHALL remain locked until the operation settles
- **AND** Stop SHALL remain available for the active run.

### Requirement: Migration history SHALL expose bounded run and set outcomes

The Dashboard SHALL present migration history as a run list and selected-run detail. Run detail SHALL include state, timestamps, processed and remaining counts, reason, and bounded diagnostics. Its paged set receipts SHALL include the persisted parent title, classification, outcome, counts, reason codes, and bounded diagnostics without exposing raw payloads or native refs. Terminal set rows SHALL display their outcome rather than an unchecked selection control. A selected failed or attention-required run SHALL resolve at most one primary non-success set through a bounded durable lookup and SHALL project its safe mutation-authority evidence independently of runtime log availability.

#### Scenario: A user inspects a failed migration
- **WHEN** the user selects a failed run in migration history
- **THEN** the Dashboard SHALL identify which sets applied, failed, were skipped, changed, or still remained pending
- **AND** it SHALL display an inline diagnostic card containing the safe failure message, stable authority and effect phases, recovery, operation identity, attempt identity, and affected/residual counts when settled authority evidence exists
- **AND** sparse run diagnostics or missing correlated runtime logs SHALL NOT hide settled authority evidence
- **AND** unavailable authority evidence SHALL be stated explicitly while bounded receipt diagnostics remain visible
- **AND** it SHALL offer one bounded diagnostic export containing the run, non-success set receipts, mutation authority summaries, and correlated runtime issue logs
- **AND** the export SHALL NOT contain raw payloads, parent or native refs, titles, paths, or unsanitized exceptions
- **AND** Continue SHALL start a fresh scan rather than replaying the old plan.

### Requirement: Migration review SHALL operate on the complete bounded plan

The Dashboard SHALL filter the complete process-local preview before paging and SHALL expose at most 25 summaries at once. A selected summary SHALL open a bounded detail drawer containing safe counts, diagnostics, concrete issues, applicable runtime-issued options, and the candidate disposition without parent refs or payload content.

#### Scenario: A user filters and opens a migration candidate
- **WHEN** the user filters by text, classification, reason, or disposition and opens one result
- **THEN** counts and paging SHALL describe the complete filtered preview
- **AND** the detail drawer SHALL expose only bounded review facts and runtime-issued option identities.

### Requirement: Blocking migration issues SHALL require explicit runtime-owned resolutions

Each independently resolvable duplicate, linkage, recovery, conflict, or declared data-loss issue SHALL have its own runtime-issued identity and applicable choices. The runtime SHALL own selected choices, recompute candidate eligibility, re-read current source facts before apply, and reject a changed basis. A candidate SHALL be included only after every blocking issue is resolved and the user can review its automatic inclusion before final confirmation; skipping SHALL leave source data unchanged.

#### Scenario: A blocked candidate has several issues
- **WHEN** the user chooses a resolution for each issue and confirms the final selection
- **THEN** Apply SHALL replay those runtime-owned choices against a matching current basis
- **AND** canonical verification SHALL precede cleanup of consumed legacy target data.

#### Scenario: Source facts change after review
- **WHEN** a reviewed candidate no longer matches the scan basis at apply time
- **THEN** the candidate SHALL produce `changed_since_scan` without writing or cleanup
- **AND** the user SHALL need a fresh scan and review.

### Requirement: Migration SHALL repair recoverable legacy parent sets without inventing identity

Migration SHALL read embedded legacy payloads through a private bounded recovery path of at most 4 MiB while ordinary Broker reads retain their normal limit. Canonical References SHALL participate in conversion and `no_references` classification. Legacy Citation facts nested under `reference` and `metadata` SHALL be normalized before the existing exact identity matcher. Migration SHALL compact Citation snippets when required to fit the managed-note boundary, preserve all item and mention identities and structure, and write only artifact kinds that require replacement. It SHALL NOT accept, ignore, or leave behind unreadable Citation damage as a successful conversion.

#### Scenario: Canonical References support oversized Citation repair
- **WHEN** a parent has valid canonical References and a recoverable legacy Citation payload between 1 MiB and 4 MiB
- **THEN** migration SHALL use the canonical References to resolve and compact the Citation
- **AND** it SHALL write Citation without replacing the canonical References
- **AND** verified reference count SHALL equal the canonical References count.

#### Scenario: Nested legacy citation facts match exactly
- **WHEN** a legacy Citation item stores bibliographic facts under `reference` and matching metadata under `metadata`
- **THEN** migration SHALL expose those facts to the existing exact matcher
- **AND** unresolved facts SHALL remain unresolved rather than being guessed.

#### Scenario: Oversized legacy payload is not recoverable
- **WHEN** a legacy Citation exceeds 4 MiB, is unreadable, or cannot fit after snippets reach zero characters
- **THEN** the candidate SHALL remain blocked without writing or cleanup
- **AND** migration SHALL NOT offer an accept-damaged-input bypass.

### Requirement: Migration batches SHALL continue only after proven candidate-local terminal failures

Each failed set SHALL preserve its typed authority receipt. A failed set MAY allow later sets to run only when its authority outcome is terminal, has zero residual effects, and has a candidate-local code explicitly classified as continuation-safe. A repair-required or ambiguous outcome SHALL stop further writes. A run that continued past one or more safe failures SHALL finish `completed_with_attention`.

#### Scenario: Candidate-local validation failure has no residual effects
- **WHEN** a set terminates with zero residual effects and code `resource_limited`, `invalid_artifact`, `legacy_artifact_requires_migration`, `conflict`, or `not_found`
- **THEN** the set SHALL remain failed with its receipt
- **AND** later approved sets SHALL continue
- **AND** the run SHALL finish `completed_with_attention`.

#### Scenario: Failure is unsafe to continue
- **WHEN** a set is repair-required, canceled, unavailable, infrastructure-failed, invalid-request, missing or unknown in authority, or has residual effects
- **THEN** migration SHALL stop scheduling new writes
- **AND** it SHALL preserve the terminal evidence for operator attention.

### Requirement: Migration decisions SHALL publish atomically

Individual and batch decisions SHALL compute and validate proposed results before changing any choices, classifications, dispositions or counters. A failed batch SHALL preserve the complete previous state and return bounded candidate and validation-code evidence. Skipping SHALL exclude a candidate without validating an artifact that will not be written.

#### Scenario: A batch fails after some candidates have been evaluated
- **WHEN** a proposed decision cannot be calculated or validated for one candidate
- **THEN** every candidate in that batch SHALL retain its preceding choices and selection
- **AND** retrying SHALL evaluate the same undecided facts rather than skip an incorrectly resolved issue.

#### Scenario: A damaged candidate is skipped
- **WHEN** the user skips a candidate with damaged or oversized artifacts
- **THEN** the candidate SHALL be excluded without artifact validation or a source write.

### Requirement: Migration SHALL guide decisions by problem

The migration UI SHALL lead users through scan overview, present problem groups, final review and outcomes. Each problem SHALL explain affected documents, available decisions and consequences. Batch scope SHALL cover the entire problem group across pages; search SHALL only filter displayed rows. Individual overrides SHALL survive changes to the group policy and SHALL be resettable to that policy.

#### Scenario: A batch policy changes with an individual exception
- **WHEN** the user changes a group decision after making an individual exception
- **THEN** the exception SHALL remain effective and visibly marked
- **AND** unaffected documents SHALL use the new group policy.

#### Scenario: Final selection is reviewed
- **WHEN** all desired decisions have been made
- **THEN** eligible documents SHALL show their original problems, chosen decisions, decision origin and predicted changes
- **AND** the user SHALL be able to exclude documents before explicitly confirming writes.

### Requirement: Migration calculation SHALL cooperate with UI lifecycle

Scanning and bulk decision calculation SHALL yield during large workloads, publish bounded progress, and respond to stopping before claiming more work. Multiple windows SHALL share operation ownership. Stopping a staged batch decision SHALL preserve preceding choices.

#### Scenario: A large calculation is stopped
- **WHEN** stop is requested before the calculation finishes
- **THEN** subsequent work SHALL not be admitted and a staged decision SHALL not publish partial choices.

### Requirement: Migration receipts SHALL retain decision evidence

Terminal set receipts SHALL retain bounded structured decision summaries and selection origin independently of process-local previews. Historical views SHALL expose that evidence without raw payloads or new executable plans.

#### Scenario: A migrated run is opened after restart
- **WHEN** the user opens a terminal run
- **THEN** its set receipts SHALL show which decisions were applied and their origin
- **AND** any further writes SHALL require a fresh scan.

### Requirement: Migration SHALL distinguish empty References from missing sources

Conversion SHALL retain readable valid References source presence independently of entry count. Empty canonical References SHALL qualify as an existing basis. Missing, malformed, unreadable or discarded invalid entries SHALL retain their blocking or review semantics.

#### Scenario: Explicit empty References and Citation
- **WHEN** a readable References artifact explicitly contains an empty collection and Citation has no mentions
- **THEN** conversion SHALL accept a valid canonical empty pair.

#### Scenario: Empty basis has unresolved mentions
- **WHEN** empty References accompany Citation mentions without linkage
- **THEN** mentions SHALL remain unresolved under the existing review policy.

#### Scenario: Citation has no References source
- **WHEN** no valid References source or permitted existing basis exists
- **THEN** the Citation-only input SHALL remain blocked.

### Requirement: Migration SHALL preserve summary meaning and validation evidence

Citation summary SHALL use only the summary field, defaulting to empty when absent. Validation and receipt diagnostics SHALL retain bounded path/code and applicable numeric limit/actual evidence, deduplicating repetitive diagnostics and prioritizing blocking evidence within twenty entries.

#### Scenario: An empty summary accompanies a large report
- **WHEN** summary is empty or absent and report_md is large
- **THEN** the report SHALL NOT become summary and the summary limit SHALL remain unchanged.

#### Scenario: A real summary exceeds its limit
- **WHEN** summary itself exceeds the canonical limit
- **THEN** migration SHALL reject it and retain its validation evidence through exclusion and terminal receipt persistence.

#### Scenario: Repetitive evidence exceeds the diagnostic budget
- **WHEN** repetitive evidence precedes a blocking validation issue
- **THEN** the bounded persisted diagnostics SHALL retain the blocking issue without raw payloads.
