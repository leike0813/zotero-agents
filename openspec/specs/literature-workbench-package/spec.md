# literature-workbench-package Specification

## Purpose
Define the stable workflow and artifact-management contracts provided by the builtin `literature-workbench-package`.
## Requirements
### Requirement: Literature Workbench Package SHALL Provide Export-Notes Workflow For Literature-Digest Generated Notes
The `literature-workbench-package` MUST provide workflow `export-notes` to export literature-digest generated notes from selected parent items or selected generated notes.

#### Scenario: Parent selection expands generated notes
- **WHEN** the user triggers `export-notes` on one or more parent items
- **THEN** the workflow SHALL collect existing `digest`, `references`, and `citation-analysis` notes under each parent
- **AND** a parent with none of the three notes SHALL be treated as an invalid input unit

#### Scenario: Direct generated note selection is accepted
- **WHEN** the user selects one or more generated notes directly
- **THEN** only `digest`, `references`, and `citation-analysis` notes SHALL be accepted
- **AND** other note types SHALL be filtered out

#### Scenario: Mixed multi-selection exports in one trigger
- **WHEN** the user triggers `export-notes` with multiple parents, multiple notes, or a mixed selection
- **THEN** the workflow SHALL aggregate the export into one execution job
- **AND** it SHALL prompt for export destination only once

### Requirement: Export-Notes SHALL Materialize Canonical Artifact Files Per Parent Folder

The export workflow MUST write canonical literature-digest artifact files into
per-parent folders.

#### Scenario: Export digest representative image marker and sidecar
- **WHEN** a digest note contains a valid representative image block backed by a note-child embedded-image attachment
- **THEN** `export-notes` SHALL write `representative_image.jpg` beside `digest.md`
- **AND** `digest.md` SHALL include a `zs:representative-image:v1` Markdown marker block referencing `representative_image.jpg`
- **AND** the digest payload text before marker insertion SHALL otherwise keep its existing export contract.

#### Scenario: Representative image export is unavailable
- **WHEN** the representative image block cannot be resolved to a readable note-child attachment
- **THEN** `export-notes` SHALL still export `digest.md`
- **AND** it SHALL NOT fail the export batch because of the missing image.

### Requirement: Literature Workbench Package SHALL Provide Import-Notes Workflow For Literature-Digest Artifacts
The `literature-workbench-package` MUST provide workflow `import-notes` to import literature-digest artifact files into exactly one selected parent item.

#### Scenario: Import accepts exactly one parent item
- **WHEN** the user triggers `import-notes`
- **THEN** the workflow SHALL accept exactly one selected parent item
- **AND** it SHALL reject no-selection, multi-parent, note-selection, and mixed-selection triggers

#### Scenario: Import dialog selects independent artifact types
- **WHEN** the import workflow opens
- **THEN** the dialog SHALL expose independent file-selection controls for `digest`, `references`, and `citation-analysis`
- **AND** it SHALL show whether each corresponding generated note already exists under the target parent

### Requirement: Import-Notes SHALL Validate Structured JSON Artifacts Before Candidate Acceptance
The import workflow MUST validate structured JSON artifacts before allowing them into the pending import candidate set.

#### Scenario: References import candidate uses copied local schema
- **WHEN** the user selects a references JSON file
- **THEN** the workflow SHALL validate it against the copied local `references.schema.json`
- **AND** only a valid candidate SHALL proceed to import

#### Scenario: Bare-array references artifact is accepted
- **WHEN** the user selects a bare-array references JSON file produced by Skill-Runner
- **THEN** the workflow SHALL accept it as a native references artifact
- **AND** it MAY wrap the array to `{ items: [...] }` internally for schema validation only

#### Scenario: Citation analysis import candidate uses copied local schema
- **WHEN** the user selects a citation-analysis JSON file
- **THEN** the workflow SHALL validate it against the copied local `citation_analysis.schema.json`
- **AND** only a valid candidate SHALL proceed to import

#### Scenario: Wrapper-shaped JSON is rejected
- **WHEN** the user selects a legacy wrapper-shaped references or citation-analysis JSON file
- **THEN** the workflow SHALL reject it during validation
- **AND** it SHALL NOT add that file to the pending import candidates

### Requirement: Import-Notes SHALL Confirm Conflicts Once Per Import Batch
If any selected artifact would overwrite an existing generated note, the workflow MUST use one conflict confirmation for the whole import batch.

#### Scenario: Overwrite all selected artifacts
- **WHEN** one or more selected artifact kinds already exist under the parent
- **AND** the user chooses `覆盖`
- **THEN** the workflow SHALL overwrite all selected candidates
- **AND** the workflow SHALL finish successfully

#### Scenario: Decline overwrite for the whole batch
- **WHEN** one or more selected artifact kinds already exist under the parent
- **AND** the user chooses `不覆盖`
- **THEN** the workflow SHALL abandon the whole import batch
- **AND** it SHALL finish without mutating any generated note

#### Scenario: Return from conflict prompt to import window
- **WHEN** one or more selected artifact kinds already exist under the parent
- **AND** the user chooses `取消`
- **THEN** the workflow SHALL close the conflict prompt
- **AND** it SHALL return to the import selection window with the current pending choices preserved

### Requirement: literature-workbench-package SHALL unify builtin literature workflows under one package

The builtin package `literature-workbench-package` MUST provide the stable package home for active literature note generation, import/export, explainer, and ingestion workflows. Deprecated note-level workflows MUST NOT remain exposed as active built-in workflow ids.

#### Scenario: active workflow identity remains stable across package rename

- **WHEN** the package is loaded
- **THEN** workflow ids such as `literature-digest`, `literature-explainer`, `export-notes`, and `import-notes` SHALL remain unchanged
- **AND** deprecated note-level workflows `reference-matching` and `reference-note-editor` SHALL NOT be exposed as active built-in workflow ids.

### Requirement: literature-workbench-package SHALL provide a unified note and artifact codec
The package MUST use the shared v2 payload storage codec for digest-family notes, custom markdown notes, and conversation notes.

#### Scenario: conversation note round-trip is supported
- **WHEN** a conversation note created from `literature-explainer` is exported through `export-notes`
- **THEN** it SHALL export the original conversation markdown from the v2 payload attachment
- **AND** legacy hidden conversation-note payloads SHALL remain readable until migrated.

### Requirement: literature-explainer SHALL execute as a package workflow using the shared codec

`literature-explainer` MUST be hosted inside `literature-workbench-package`
and MUST reuse the package note codec for conversation-note creation.

#### Scenario: explainer bundle apply creates conversation note through shared codec

- **WHEN** `literature-explainer` applies a successful interactive bundle result
- **THEN** it SHALL resolve the conversation markdown artifact from the bundle
- **AND** it SHALL create a parent conversation note through the shared package codec
- **AND** the note DOM and payload contract SHALL remain compatible with existing export behavior

### Requirement: export-notes SHALL support package-managed generated and markdown-backed notes through the unified codec

`export-notes` MUST export all package-managed note kinds using the unified
codec rather than workflow-specific bespoke transformations.

#### Scenario: export handles digest and conversation notes together

- **WHEN** a selection contains both literature-digest generated notes and conversation notes
- **THEN** `export-notes` SHALL use the same package codec layer to determine note kind and export artifact shape
- **AND** each note SHALL still export according to its existing user-visible format

#### Scenario: export handles custom notes together with generated notes

- **WHEN** a selection contains both custom notes and generated notes
- **THEN** `export-notes` SHALL export them in one batch
- **AND** custom notes with markdown payload SHALL export as markdown

### Requirement: import-notes SHALL use the unified codec for structured and custom note creation

`import-notes` MUST create digest-family notes and custom markdown notes through
the same package codec layer.

#### Scenario: Import digest representative image marker
- **WHEN** an imported `digest.md` contains a valid `zs:representative-image:v1` marker with a safe relative sidecar path
- **THEN** `import-notes` SHALL remove that marker from the digest payload
- **AND** it SHALL recreate the image as a Zotero embedded-image attachment under the digest note
- **AND** it SHALL write the representative image HTML block through the same digest note builder that writes the canonical `digest-markdown` payload block.

#### Scenario: Import representative image can be manually overridden
- **WHEN** the import dialog has a selected digest candidate
- **THEN** the user SHALL be able to manually select or clear a representative image candidate
- **AND** a manual image selection SHALL take precedence over an automatically detected marker image.

#### Scenario: Representative image import is best-effort
- **WHEN** the marker path is unsafe, missing, or image preparation/import fails
- **THEN** `import-notes` SHALL still import the selected digest note
- **AND** it SHALL expose a skipped/warning representative image result for diagnostics.

#### Scenario: Representative image writing preserves digest payload
- **WHEN** a digest representative image is embedded or skipped with diagnostics
- **THEN** the digest note final HTML SHALL still contain the canonical `digest-markdown` payload block
- **AND** representative image helpers SHALL NOT patch digest note HTML from a stale `note.getNote()` snapshot after the digest writer has completed.

### Requirement: Literature Digest Apply SHALL NOT Auto Run Reference Matching

The `literature-digest` workflow SHALL NOT expose or execute an automatic Reference Matching option during digest apply. Related-items updates are handled by the Synthesis sidecar update chain after the digest artifacts are applied.

#### Scenario: Digest apply ignores removed auto matching option

- **WHEN** `literature-digest` successfully writes generated digest, references, and citation-analysis notes
- **THEN** it SHALL NOT call the note-level Reference Matching apply helper
- **AND** it SHALL NOT write an `auto_reference_matching` result field
- **AND** stale callers that still pass `auto_reference_matching` SHALL NOT prevent apply from succeeding.

### Requirement: Literature search ingest target collection uses dynamic options

The Literature Search Ingest workflow SHALL offer Zotero collection choices for
its target collection parameter.

#### Scenario: User configures target collection

- **WHEN** the workflow settings UI renders Literature Search Ingest
- **THEN** `targetCollection` SHALL use the `zotero.collections` dynamic option
  source
- **AND** the user SHALL see collection path labels
- **AND** the submitted value SHALL remain a collection ref string accepted by
  single-paper `ingest_paper` calls.

### Requirement: Literature Digest Apply SHALL Consume Optional Representative Image Metadata

The `literature-digest` workflow apply step SHALL consume optional `representative_image` result metadata after writing generated notes.

#### Scenario: Representative image metadata is absent
- **WHEN** `literature-digest` result JSON does not include `representative_image`
- **THEN** the apply step SHALL write digest, references, and citation-analysis notes with the existing behavior.

#### Scenario: Representative image materialization succeeds
- **WHEN** `representative_image.status = "selected"` and Host resolves a safe Markdown image
- **THEN** the digest note SHALL include exactly one representative image block
- **AND** repeated apply runs SHALL replace the prior representative image block rather than append duplicates.

#### Scenario: Representative image materialization is skipped
- **WHEN** representative image resolution, compression, import, or PDF extraction fails best-effort
- **THEN** the apply step SHALL still return successfully with the generated notes
- **AND** the result SHALL expose a representative image skipped/warning status for diagnostics.

### Requirement: Literature search ingest is ACP interactive and context aware

`literature-search-ingest` SHALL run only as an interactive SkillRunner Skill
and SHALL support `auto`, `guided`, `topic_expansion`,
`paper_seed_expansion`, and `targeted_ingest` search modes. It SHALL require
user approval of the search plan before external discovery and user approval of
the ingest scope before selected-candidate research or Zotero mutation. After
scope approval it SHALL automatically complete metadata resolution,
direct-work identity verification, public-PDF probing, per-paper payload
preparation, and serial ingest without another waiting state.

#### Scenario: Blank auto query starts guided planning

- **WHEN** the workflow starts with a blank `query` and `searchMode` is omitted
  or `auto`
- **THEN** the skill SHALL ask focused questions until it has a minimum research
  goal
- **AND** it SHALL inspect Zotero/Synthesis context read-only before presenting
  a structured search brief
- **AND** it SHALL NOT perform web search, download, or Zotero writes before
  the user confirms that brief

#### Scenario: Guided brief is confirmed

- **WHEN** a user confirms the guided search brief
- **THEN** the skill SHALL begin candidate search directly from that brief
- **AND** it SHALL preserve `search_mode: "guided"` in a completed result

#### Scenario: Explicit mode has no query

- **WHEN** `query` is blank and the user explicitly selects
  `topic_expansion`, `paper_seed_expansion`, or `targeted_ingest`
- **THEN** the skill SHALL ask for the minimum seed required by that mode
- **AND** it SHALL retain the selected mode

#### Scenario: User selects non-blank auto mode

- **WHEN** the workflow starts with a non-blank `query` and `searchMode` is
  omitted or `auto`
- **THEN** the skill SHALL compare the query against read-only
  library/Synthesis context to recommend an effective mode and search brief
- **AND** it SHALL NOT perform external discovery until the user approves that
  brief

#### Scenario: User approves ingest scope

- **WHEN** the user approves a set of ingestible candidate ids after discovery
- **THEN** the skill SHALL treat that decision as authorization to research and
  ingest those same direct bibliographic works
- **AND** it SHALL continue through metadata resolution, legal public-PDF
  probing, payload preparation, and per-paper mutation
- **AND** it SHALL NOT enter another waiting state

#### Scenario: User requests focused discovery expansion

- **WHEN** Stage 30 receives an expansion request for the current discovery
  round
- **THEN** the skill SHALL retain the accumulated candidate set and accepted
  evidence while returning to Stage 20
- **AND** it SHALL return to the same ingest-scope decision after the expanded
  round

#### Scenario: Expanded discovery omits an accepted candidate

- **WHEN** a later discovery round omits a candidate accepted in an earlier
  round without evidence-backed reclassification
- **THEN** the skill SHALL keep that candidate in the cumulative set

#### Scenario: User cancels at a decision stage

- **WHEN** the user cancels at Stage 10 or Stage 30
- **THEN** the workflow SHALL return the canceled kind, status, reason, and
  message required by `output.schema.json`

#### Scenario: Selected candidate fails direct-work identity

- **WHEN** post-selection research cannot verify that a candidate is the same
  direct bibliographic work or cannot resolve a material version conflict
- **THEN** the workflow SHALL record that candidate as `not_attempted`
- **AND** it SHALL continue processing the remaining approved candidates
- **AND** it SHALL NOT substitute a different work or request a replacement

#### Scenario: Targeted ingest identifies one exact record

- **WHEN** the user selects `targeted_ingest`
- **THEN** the skill SHALL locate and present only the requested record with its
  identity, authoritative landing page, metadata match, and duplicate status
- **AND** after scope approval it SHALL research and ingest that record without
  expanding to related literature

#### Scenario: Candidate has no resolved identifier

- **WHEN** a traceable candidate has completed applicable identifier searches
  without a DOI, ISBN, arXiv, or PMID
- **THEN** the skill SHALL retain authoritative metadata provenance, landing
  URL, and PDF outcome
- **AND** it MAY classify the candidate as `needs_curation`
- **AND** it SHALL retain a bare title or unverified snippet only as
  non-ingestible `lead_only` evidence.

### Requirement: Literature search ingest performs legal public PDF best effort

The skill SHALL resolve direct-work identity and authoritative metadata before
accepting a legal public PDF. It SHALL execute the authoritative landing-page,
open-access, and public web-search routes for each approved paper, stopping
later routes only after an earlier route produces a verified matching PDF.
Failure to find a PDF SHALL NOT block otherwise eligible metadata ingest.

#### Scenario: Public PDF is uncertain

- **WHEN** a candidate PDF cannot be matched confidently to the direct work
- **THEN** the skill SHALL omit that PDF from the Host payload
- **AND** it SHALL preserve the eligible metadata-only ingest path

#### Scenario: No public PDF is found

- **WHEN** all applicable PDF routes complete without a verified public PDF
- **THEN** the skill SHALL prepare a metadata-only Host payload
- **AND** it MAY request landing-page attachment through the existing Host
  field

### Requirement: Literature search ingest SHALL preserve original-script ingest metadata

Literature Search Ingest SHALL prefer authoritative metadata in the work's
original script, preserve complete verified creator lists, and keep Zotero
field roles semantically correct while preparing each direct Host payload.

#### Scenario: Original-script title is authoritative

- **WHEN** an authoritative record supplies the title in the work's original
  script
- **THEN** the Host payload SHALL preserve that title
- **AND** a translated or romanized title SHALL NOT replace it

#### Scenario: Creator list is incomplete

- **WHEN** the available evidence cannot verify a complete creator list
- **THEN** the candidate SHALL remain `needs_curation` or `not_attempted`
- **AND** the skill SHALL NOT present a partial list as complete

### Requirement: Literature search ingest SHALL require three public-PDF routes

Every approved direct work SHALL receive ordered PDF research through its
authoritative landing page, applicable open-access sources, and public web
search. A later route MAY be marked `skipped_after_verified_pdf` only when an
earlier route has already produced a verified legal matching PDF.

#### Scenario: Earlier route finds a verified PDF

- **WHEN** the authoritative landing page or open-access route produces a
  verified public PDF
- **THEN** later routes MAY be marked `skipped_after_verified_pdf`

#### Scenario: No earlier route finds a PDF

- **WHEN** no completed earlier route has produced a verified public PDF
- **THEN** every remaining route SHALL be attempted before the paper is treated
  as missing a PDF

### Requirement: Literature search ingest SHALL use flexible research delegation with independent paper outputs

After Stage 30 approval, the main agent SHALL choose subagent grouping,
concurrency, dispatch timing, and waiting strategy. A subagent MAY receive one
or multiple approved candidate file paths. Every candidate SHALL retain an
independent identity decision and the writable `payloadPath` embedded in its
candidate file.

#### Scenario: Main agent groups several candidate files

- **GIVEN** several approved candidates require similar research
- **WHEN** the main agent delegates their candidate file paths to one subagent
- **THEN** the subagent SHALL process each candidate independently
- **AND** it SHALL use the `payloadPath` in that candidate's file

#### Scenario: Research is not delegated before scope approval

- **WHEN** Stage 30 has not approved an ingest scope
- **THEN** the main agent SHALL NOT delegate candidate metadata or PDF research
- **AND** no Host ingest payload SHALL be prepared

#### Scenario: Candidate scope remains stable

- **WHEN** a subagent researches an approved candidate file
- **THEN** it SHALL resolve that same direct bibliographic work
- **AND** it SHALL NOT replace it with a related work, another material type,
  or a materially different version

### Requirement: The static research prompt SHALL have one source of truth in SKILL.md

The full subagent contract SHALL be written in
`skills_builtin/literature-search-ingest/SKILL.md`. Dynamic context SHALL
contain `CANDIDATE_FILES_JSON`, a JSON array of one or more approved candidate
file paths, and the selected collection. Each candidate file SHALL contain its
candidate identity and writable `payloadPath`. The prompt SHALL require
metadata resolution, direct-work identity, the three-route PDF probe, canonical
fields, file output, and completion of the assigned candidate files.

#### Scenario: Main agent supplies candidate file paths

- **WHEN** the main agent constructs a subagent dispatch
- **THEN** it SHALL use the static prompt from `SKILL.md`
- **AND** it SHALL provide the chosen candidate file paths as dynamic context
- **AND** the worker SHALL read each file's `payloadPath`

#### Scenario: Worker returns a structured research report

- **WHEN** a subagent finishes its assigned candidate files
- **THEN** it SHALL return one `literature_search_research_report` JSON object in
  stdout
- **AND** `candidateResults` SHALL contain exactly one entry for each assigned
  candidate file
- **AND** each entry SHALL reuse that file's candidate id, candidate path, and
  payload path
- **AND** each entry SHALL report metadata status, paper-level PDF probe status,
  compact metadata sources, the applicable three-route PDF results, and
  uncertainties
- **AND** the report SHALL NOT contain a Host payload, receipt, mutation result,
  or final workflow output

#### Scenario: Main agent projects research results into the ledger

- **WHEN** the main agent receives a structured research report
- **THEN** it MAY reuse the shared candidate result fields in the search ledger
- **AND** it SHALL derive receipt, ingest, item, attachment, and final curation
  fields from payload inspection and Host results
- **AND** a missing or malformed report for one candidate SHALL NOT block another
  candidate's valid payload

### Requirement: Each metadata-qualified paper SHALL produce one direct Host ingest payload

For each metadata-qualified approved paper, the subagent SHALL write one
single-paper Host ingest payload containing canonical paper fields and optional
collection. The main agent SHALL perform a final semantic check before Host
mutation. A candidate whose direct-work identity or minimum metadata cannot be
resolved SHALL remain `not_attempted` without a mutation payload.

#### Scenario: Worker writes a qualified paper payload

- **WHEN** direct-work identity and minimum metadata are resolved
- **THEN** the worker SHALL write one payload with one `paper` object
- **AND** that file SHALL be independently usable for a single Host ingest
  command

#### Scenario: No public PDF is found

- **WHEN** metadata is qualified and all applicable PDF routes find no verified
  public PDF
- **THEN** the worker SHALL write a metadata-only Host payload
- **AND** the absence of `pdfUrl` SHALL NOT make the paper `not_attempted`

#### Scenario: Direct-work identity is unresolved

- **WHEN** the worker cannot verify the candidate's direct bibliographic work
- **THEN** it SHALL report the unresolved result to the main agent
- **AND** it SHALL NOT fabricate a mutation payload

### Requirement: Literature search ingest SHALL allow incremental payload collection

The main agent SHALL be allowed to inspect and process any completed per-paper
payload while other subagents continue research. Missing or malformed output
SHALL be recoverable per paper.

#### Scenario: Early payload is collected

- **GIVEN** one valid payload is ready while unrelated subagents are running
- **WHEN** the main agent observes that payload
- **THEN** it MAY validate and ingest that paper immediately

#### Scenario: One failed payload does not block others

- **WHEN** one candidate's payload is missing or invalid
- **THEN** the main agent SHALL repair or re-delegate only that candidate
- **AND** it SHALL continue processing valid payloads for other candidates

### Requirement: Literature Digest SHALL persist generated-note payloads through Zotero-safe storage
Generated digest-family notes MUST keep machine-readable payloads available after Zotero note editor normalization by using v2 anchored embedded payload storage.

#### Scenario: New generated notes use v2 anchored payloads
- **WHEN** `literature-digest` or `import-notes` writes digest, references, or citation-analysis notes
- **THEN** the visible note HTML SHALL NOT include hidden `data-zs-payload` blocks
- **AND** each generated note SHALL have a parseable v2 embedded payload attachment
- **AND** each payload attachment SHALL be referenced by a matching payload anchor in note HTML.

#### Scenario: Legacy payloads remain exportable
- **WHEN** `export-notes` reads a note with a v2 payload, v1 tail-marker payload, or hidden HTML payload
- **THEN** it SHALL export the same canonical artifact content.

### Requirement: Digest representative images SHALL use Zotero-legal note HTML

Representative images MUST be written as normal Zotero embedded images and remain optional.

#### Scenario: Representative image is embedded
- **WHEN** Host resolves and imports a representative image for a digest note
- **THEN** the digest note SHALL reference it with a normal `<img data-attachment-key="...">` element
- **AND** it SHALL NOT wrap the image in a custom `data-zs-block="representative-image"` block.

#### Scenario: Representative image export uses legal image markup
- **WHEN** a digest note contains a valid note-child embedded image in the digest body
- **THEN** `export-notes` SHALL export `representative_image.jpg` and insert the existing `zs:representative-image:v1` Markdown marker into `digest.md`.

#### Scenario: Representative image remains best-effort
- **WHEN** representative image resolution, import, read, or export fails
- **THEN** digest text payload import/export SHALL still succeed.

### Requirement: Literature Digest Apply SHALL Filter Deterministic Invalid References Before Note Writing
The `literature-digest` workflow apply step SHALL run a precision-first
reference quality gate before writing the generated references note.

#### Scenario: Deterministic invalid rows are present
- **WHEN** the references artifact contains rows with empty titles, bare DOI/URL titles, publication-metadata-only titles, author-only titles, or no usable content tokens
- **THEN** apply SHALL remove those rows before writing the references note
- **AND** it SHALL expose rejected counters and stable reason codes in apply diagnostics.

#### Scenario: Low-quality but plausible rows are present
- **WHEN** the references artifact contains rows with bibliographic suffixes, possible author-prefix noise, missing year/authors, or short but plausible titles
- **THEN** apply SHALL keep those rows in the references note
- **AND** it SHALL expose warning counters and stable reason codes in apply diagnostics.

#### Scenario: All references are rejected
- **WHEN** every row in the references artifact is deterministically invalid
- **THEN** apply SHALL write an empty references array
- **AND** apply SHALL still finish successfully.

#### Scenario: References note payload shape is inspected
- **WHEN** the generated references payload is read after apply
- **THEN** it SHALL contain the existing `references` array
- **AND** it SHALL NOT contain quality diagnostics as native references artifact data.

### Requirement: Deprecated reference note workflows SHALL be archived only

Historical `reference-matching` and `reference-note-editor` implementations MAY remain under `deprecated/**`, but active built-in packaging SHALL NOT load, copy, menu-render, or settings-render them.

#### Scenario: Built-in manifest excludes deprecated workflows

- **WHEN** active built-in workflow files are synchronized and loaded
- **THEN** `workflows_builtin/manifest.json` SHALL NOT list `reference-matching` or `reference-note-editor` files
- **AND** `literature-workbench-package/workflow-package.json` SHALL NOT list either workflow id.

### Requirement: Import-Notes SHALL refresh literature sidecars after standard generated-note import

The `import-notes` workflow SHALL trigger the literature digest sidecar apply pipeline after it imports at least one standard generated note kind: `digest`, `references`, or `citation-analysis`.

#### Scenario: Importing a complete standard artifact set refreshes sidecar

- **WHEN** `import-notes` imports digest, references, and citation-analysis artifacts for a parent item
- **THEN** it SHALL call the literature digest sidecar apply host API for that parent item
- **AND** the sidecar source workflow SHALL identify `import-notes`.

#### Scenario: Importing a partial standard artifact set refreshes sidecar with only selected artifacts

- **WHEN** `import-notes` imports only a subset of digest, references, and citation-analysis artifacts
- **THEN** it SHALL call the literature digest sidecar apply host API
- **AND** it SHALL include only the imported standard artifact inputs
- **AND** it SHALL NOT fabricate missing sibling artifact payloads.

#### Scenario: Importing only custom notes does not refresh sidecar

- **WHEN** `import-notes` imports custom markdown notes without any standard generated note artifact
- **THEN** it SHALL NOT call the literature digest sidecar apply host API.

### Requirement: Literature Workbench Package SHALL distribute portable literature bundle workflows

The built-in `literature-workbench-package` SHALL register and distribute `export-literature-bundle` and `import-literature-bundle` alongside its existing note and analysis workflows.

#### Scenario: Package manifest is loaded
- **WHEN** the built-in literature workbench package is loaded
- **THEN** both portable bundle workflow manifests SHALL be present
- **AND** each SHALL declare `provider: "pass-through"`
- **AND** neither SHALL be classified as a core workflow.

#### Scenario: Workflow labels are localized
- **WHEN** either workflow is shown under a supported package locale
- **THEN** its label SHALL resolve through the package locale catalog
- **AND** the raw English manifest label SHALL remain the fallback.

### Requirement: Portable bundle logic SHALL reuse package-owned note and artifact codecs

The bundle workflows SHALL keep literature-specific traversal, note payload recognition, Markdown dependency collection, manifest normalization, and result shaping in shared modules owned by `literature-workbench-package`.

#### Scenario: Existing package-managed note kinds are exported
- **WHEN** bundle export encounters digest-family, custom Markdown, or conversation notes
- **THEN** it SHALL use the package's note and embedded-payload codecs to identify their semantic payloads
- **AND** core runtime modules SHALL NOT branch on those workflow or note-kind identities.

#### Scenario: Existing note export remains independent
- **WHEN** `export-notes` or `import-notes` runs after portable bundle workflows are added
- **THEN** their editable artifact exchange behavior SHALL remain unchanged
- **AND** portable item migration SHALL use the new workflow ids rather than widening the existing note workflow contract.

### Requirement: Research bundle semantics remain package-owned

The literature workbench package SHALL own research selection validation, Markdown dependency collection, v2 payload export, Product manifest rendering, and warning codes.

#### Scenario: Workflow is packaged

- **WHEN** builtin content manifests are rendered
- **THEN** the workflow, hooks, shared module, locale labels, and documentation SHALL be included
- **AND** core workflow modules SHALL NOT contain research-bundle identities or literature payload recognition rules.

### Requirement: Collection collector semantics remain package-owned

The literature workbench package SHALL own collection selection apply validation and mutation semantics.

#### Scenario: Workflow is packaged

- **WHEN** built-in content manifests are checked or rendered
- **THEN** the collection collector workflow, apply hook, documentation, and locales SHALL be included
- **AND** core workflow runtime modules SHALL NOT contain collection-collector identities or threshold rules.

### Requirement: Literature search ingest routes Chinese literature to applicable sources

The skill SHALL use additional Chinese metadata sources when the query or
candidate indicates Chinese literature.

#### Scenario: Chinese journal, thesis, or book candidate

- **WHEN** a Chinese literature candidate is resolved
- **THEN** the skill SHALL add China DOI, CNKI, Wanfang, official publishers,
  institutions, or repositories as applicable
- **AND** it SHALL add PDC and library catalogs for Chinese books or ISBNs
- **AND** when the direct work's original publication language is Chinese, each personal author SHALL use the complete authoritative Chinese name in the single Zotero `name` field rather than `firstName` and `lastName`
- **AND** it SHALL use only public metadata, landing pages, and legally public
  PDFs without login, proxy, or restricted full-text access.

### Requirement: Literature Workbench Package SHALL distribute tag-auditor
The built-in literature workbench package MUST register and localize the `tag-auditor` workflow together with its hook and shared tag-compliance module.

#### Scenario: Built-in package loads tag-auditor
- **WHEN** the built-in literature workbench package is loaded
- **THEN** `tag-auditor` SHALL be available as a non-debug workflow
- **AND** its workflow label SHALL resolve through the package locale catalog.

### Requirement: Literature search ingest SHALL separate broad discovery from ingest eligibility
The workflow SHALL discover candidates across applicable query and source lanes without requiring every candidate to have an identifier, complete authoritative metadata, or an accessible PDF before it can be shown to the user.

#### Scenario: Traceable incomplete candidate remains visible
- **WHEN** discovery finds a candidate with an original title and stable landing URL but incomplete creators or no standard identifier
- **THEN** the workflow exposes it as `needs_curation` instead of filtering it out

#### Scenario: Untraceable lead cannot be ingested
- **WHEN** a candidate lacks a direct-work title or stable source
- **THEN** the workflow retains it only as `lead_only` and does not offer it for ingest

### Requirement: Literature search ingest SHALL execute multilingual query and source lanes
The workflow SHALL plan core, multilingual, seed, and gap lanes as applicable, preserve the user's original concepts, and route Chinese-language searches through simplified, traditional, English, mainland-Chinese, Taiwan, and authoritative original-source strategies without treating a translation as the original record.

#### Scenario: Chinese topic receives multilingual expansion
- **WHEN** the query or confirmed brief targets Chinese-language literature
- **THEN** the plan includes distinct simplified-Chinese, traditional-Chinese, and English semantic variants and applicable Chinese/Taiwan source lanes

#### Scenario: Seed paper enables citation expansion
- **WHEN** a seed paper has local reference or citation-analysis artifacts
- **THEN** the workflow uses those artifacts for backward citation discovery and attempts forward citation discovery only when supported by available tools

### Requirement: Literature search ingest SHALL deduplicate before expensive enrichment
The workflow SHALL compare discovery hits with the target collection, the full Zotero library, and the current batch before performing selected-candidate metadata enrichment or PDF probing.

#### Scenario: PDF probing is deferred
- **WHEN** discovery returns duplicate and unselected candidates
- **THEN** the workflow does not perform PDF probing for those candidates

### Requirement: Literature search ingest SHALL add the metadata-curation status after the run
The final apply hook SHALL add `status:need-metadata-curation` only to successfully created or reused outcomes marked `needsCuration`, after idempotently inserting the tag into the controlled vocabulary.

#### Scenario: Controlled vocabulary write precedes item tagging
- **WHEN** at least one final outcome requires metadata curation
- **THEN** apply saves the governed tag to the Synthesis vocabulary before adding it to deduplicated numeric Zotero item IDs

#### Scenario: No eligible outcomes cause no tag mutation
- **WHEN** the run is cancelled or no successful outcome is marked `needsCuration`
- **THEN** apply does not change the vocabulary or item tags

#### Scenario: Tagging can report partial completion
- **WHEN** some item tag writes fail after the vocabulary entry is saved
- **THEN** apply preserves successful writes and returns per-item failures without rolling back ingested items

### Requirement: Literature Workbench package documentation SHALL use workflow pending status semantics
Package documentation and localized copies MUST state that builtin statuses exist after plugin startup, may coexist on an item, are not created by Bootstrapper or Regulator, and are not automatically cleared by manual PDF attachment.

#### Scenario: User consults status documentation
- **WHEN** the user reads package or site documentation
- **THEN** it SHALL present the five builtin statuses and lifecycle transition table
- **AND** SHALL NOT recommend numeric reading progress, `status:to_read`, `status:0-inbox`, `match_status`, or `matching_status`
