# literature-deep-reading-skill Specification

## Purpose

Specifies the `literature-deep-reading` built-in skill: a multi-stage runtime that bootstraps a source bundle, collects Host context, accepts agent-authored enrichment/translation/final-review payloads, and renders a self-contained deep-reading HTML artifact.

## Requirements

### Requirement: Built-in skill package SHALL expose a single bootstrap runtime CLI

The system SHALL provide a built-in `literature-deep-reading` skill package generated from `skills_src/literature-deep-reading/`.

#### Scenario: Generated package is valid

- **WHEN** the plugin skill registry scans built-in skills
- **THEN** `literature-deep-reading` SHALL be discoverable as a valid built-in skill
- **AND** its directory name, `SKILL.md` frontmatter name, and `assets/runner.json` id SHALL all be `literature-deep-reading`.

#### Scenario: Runtime exposes one agent-facing CLI

- **WHEN** the generated package is inspected
- **THEN** it SHALL include `scripts/deep_reading_runtime.py`
- **AND** it SHALL NOT require a separate `gate.py` or `stage_runtime.py` execution entrypoint.

### Requirement: Bootstrap SHALL materialize deterministic runtime views

The first-phase runtime SHALL accept a source bundle and materialize deterministic bootstrap state without semantic enrichment.

#### Scenario: Markdown source bundle is bootstrapped

- **WHEN** `scripts/deep_reading_runtime.py bootstrap --input runtime/input.json` runs with an input whose `source_bundle_path` points to a bundle containing `source.md`
- **THEN** the runtime SHALL create `runtime/literature-deep-reading.sqlite`
- **AND** it SHALL write `runtime/views/source-structure.json`
- **AND** it SHALL write `runtime/views/reading-blocks.json`
- **AND** it SHALL write `runtime/views/image-manifest.json`
- **AND** it SHALL write `runtime/views/source-reading-view.json`
- **AND** it SHALL write `runtime/views/target-artifacts-view.json`
- **AND** it SHALL write `runtime/views/references-seed-view.json`
- **AND** it SHALL write `runtime/views/diagnostics-bootstrap.json`.

#### Scenario: Bootstrap does not claim final HTML completion

- **WHEN** bootstrap completes
- **THEN** its business result SHALL identify the run as bootstrap-only
- **AND** it SHALL NOT declare `result/deep-reading.html` available.

#### Scenario: Missing optional inputs degrade to diagnostics

- **WHEN** source images or sidecar artifacts are missing
- **THEN** bootstrap SHALL record diagnostics
- **AND** it SHALL continue when `source.md` is available.

### Requirement: Bootstrap reading structure

The `literature-deep-reading` runtime SHALL expose stable reading blocks that preserve rich paper structures.

#### Scenario: Rich content is parsed into structured blocks

- **GIVEN** source Markdown contains display math, images with captions, and tables with captions
- **WHEN** bootstrap writes `runtime/views/reading-blocks.json`
- **THEN** display math SHALL be represented as `formula` blocks
- **AND** image references with adjacent captions SHALL be represented as `image` blocks
- **AND** tables with adjacent captions SHALL be represented as `table` blocks
- **AND** each structured block SHALL preserve source order and `block_id`.

#### Scenario: Bibliography is outside translation flow but Appendix remains paper content

- **GIVEN** the source contains a References or Bibliography section
- **AND** the source later contains an Appendix, Appendices, Supplementary Material, or appendix-like subsection heading
- **WHEN** bootstrap marks reading blocks
- **THEN** bibliography blocks SHALL have `role: "bibliography"` and `translate: false`
- **AND** appendix blocks SHALL have `role: "appendix"` and `translate: true`
- **AND** normal paper blocks SHALL have `role: "main"`
- **AND** `references-seed-view.json` fallback extraction SHALL exclude appendix text.

### Requirement: Bootstrap Host Preflight

The `literature-deep-reading` runtime SHALL expose best-effort Host preflight information before the agent writes `context-request.json`.

#### Scenario: Host preflight exports target artifacts

- **GIVEN** bootstrap can infer the target paper ref from `source-manifest.json`
- **AND** Host Bridge returns target digest, references, and citation-analysis artifacts in a filtered export manifest
- **WHEN** `bootstrap` runs
- **THEN** the runtime SHALL write `runtime/views/host-preflight-view.json`
- **AND** it SHALL copy available exported target artifacts into the unpacked source artifact directory
- **AND** `target-artifacts-view.json` and `references-seed-view.json` SHALL reflect those available artifacts.

#### Scenario: Host preflight exposes topic candidates

- **GIVEN** bootstrap can infer the target paper ref from `source-manifest.json`
- **AND** Host Bridge `topics.find_by_paper_ref` returns topic candidates
- **WHEN** `bootstrap` runs
- **THEN** the runtime SHALL write `runtime/views/topic-candidates-view.json`
- **AND** `host-preflight-view.json` SHALL include the normalized candidates
- **AND** a single candidate SHALL be usable as the default topic for later `topics get-context`.

#### Scenario: Ambiguous topic candidates require an agent choice

- **GIVEN** `topic-candidates-view.json` contains multiple topics
- **AND** `context-request.json` requests topic context without `selected_topic_id`
- **WHEN** Stage 10 context collection runs
- **THEN** the runtime SHALL NOT guess a topic id
- **AND** `topic-context.json` SHALL include a diagnostic explaining that `selected_topic_id` is required.

#### Scenario: Host preflight degrades when Host is unavailable

- **GIVEN** Host Bridge is unavailable
- **WHEN** `bootstrap` runs
- **THEN** bootstrap SHALL still succeed
- **AND** `host-preflight-view.json` SHALL include a diagnostic instead of blocking the run.

### Requirement: Stage 10 SHALL accept a flat context request payload

The `literature-deep-reading` runtime SHALL accept `runtime/payloads/context-request.json` as the Stage 10 agent-authored payload after bootstrap.

#### Scenario: Valid context request is submitted

- **GIVEN** `stage_00_bootstrap` has generated source structure and reading views
- **AND** the agent writes a valid `context-request.json`
- **WHEN** the agent runs `python scripts/deep_reading_runtime.py submit-context-request --payload runtime/payloads/context-request.json`
- **THEN** the runtime SHALL validate the payload
- **AND** it SHALL record the submission in runtime state
- **AND** it SHALL not require the agent to provide schema version, stage id, timestamp, status, target paper ref, or raw Host Bridge commands.

### Requirement: Stage 10 SHALL collect Host context as a runtime cascade

The runtime SHALL perform deterministic Host Bridge collection after a valid Stage 10 payload is submitted.

#### Scenario: Host Bridge returns citation graph, layout, concepts, and reference artifacts

- **GIVEN** Host Bridge CLI is available in the run workspace
- **AND** the context request asks for citation graph, concepts, and library reference digests
- **WHEN** Stage 10 is submitted
- **THEN** the runtime SHALL call semantic Host Bridge CLI commands
- **AND** it SHALL write `runtime/views/host-context-view.json`
- **AND** it SHALL write `runtime/views/reference-bindings-view.json`
- **AND** it SHALL write `runtime/views/reference-digests-view.json`
- **AND** it SHALL write `runtime/views/citation-graph-snapshot.json`
- **AND** it SHALL write `runtime/views/citation-graph-layout.json`
- **AND** it SHALL write `runtime/views/concept-candidates-view.json`
- **AND** it SHALL write `runtime/views/diagnostics-host-context.json`.

### Requirement: Host Context Return Shapes

The runtime SHALL normalize the current Host Bridge response shapes used by Stage 10.

#### Scenario: Current Host Bridge response fields are used

- **GIVEN** Host Bridge returns `reference-index get` data under `rows`
- **AND** `concepts query` data under `matches`
- **AND** `paper-artifacts export-filtered` returns `manifest_file` with `papers[].artifacts[].content_file`
- **WHEN** context collection runs
- **THEN** the runtime SHALL consume those fields and generate usable reference, concept, and artifact views.

### Requirement: Citation graph layout SHALL come from Host Bridge layout state

The runtime SHALL use `citation-graph get-layout` for graph coordinates and SHALL NOT compute replacement force layout coordinates.

#### Scenario: Layout is ready

- **GIVEN** `citation-graph get-slice` returns a graph snapshot
- **AND** `citation-graph get-layout` returns ready persisted force-layout coordinates
- **WHEN** Stage 10 is submitted
- **THEN** `citation-graph-snapshot.json` SHALL retain the topology result
- **AND** `citation-graph-layout.json` SHALL retain the raw layout result
- **AND** its normalized nodes SHALL include coordinates keyed by node id.

#### Scenario: Layout is missing or stale

- **GIVEN** `citation-graph get-layout` returns `missing`, `stale`, `too_large`, or `invalid_request`
- **WHEN** Stage 10 is submitted
- **THEN** the runtime SHALL keep the citation graph snapshot if available
- **AND** it SHALL write layout diagnostics
- **AND** it SHALL NOT generate fallback layout coordinates.

### Requirement: Host context collection SHALL degrade without blocking reading

Host Bridge absence or per-command failures SHALL produce diagnostics and empty or partial Host Context Layer views rather than failing Stage 10.

#### Scenario: Host Bridge CLI is unavailable

- **GIVEN** bootstrap outputs exist
- **AND** no Host Bridge CLI can be resolved
- **WHEN** Stage 10 is submitted with an otherwise valid context request
- **THEN** the command SHALL succeed
- **AND** all Stage 10 view files SHALL exist
- **AND** diagnostics SHALL explain that Host Bridge collection was unavailable
- **AND** the final result SHALL still declare that final HTML is not available.

### Requirement: Reference digests SHALL only be attached to library-bound references

The runtime SHALL only collect digest artifacts for references that resolve to library paper refs.

#### Scenario: Mixed library and external references are collected

- **GIVEN** structured references contain both library-bound and external references
- **AND** the context request asks for reference digests
- **WHEN** Stage 10 is submitted
- **THEN** `reference-digests-view.json` SHALL include digest entries only for library-bound references
- **AND** external or unresolved references SHALL not expose digest availability.

#### Scenario: Library reference digests are collected

- **GIVEN** `reference-index get` returns reference rows with `target_binding: "library"` and `target_paper_ref`
- **WHEN** Stage 10 processes `reference_digest_policy: "all_library_references"`
- **THEN** it SHALL export digest artifacts for those target paper refs
- **AND** Stage 20 SHALL mark corresponding structured references with available digest modal data.

### Requirement: Stage 20 SHALL accept a reading enrichment payload

The `literature-deep-reading` runtime SHALL accept `runtime/payloads/reading-enrichment.json` after bootstrap and Host context collection.

#### Scenario: Valid reading enrichment is submitted

- **GIVEN** Stage 00 bootstrap views exist
- **AND** Stage 10 Host Context Layer views exist
- **AND** the agent writes a valid `reading-enrichment.json`
- **WHEN** the agent runs `python scripts/deep_reading_runtime.py submit-reading-enrichment --payload runtime/payloads/reading-enrichment.json`
- **THEN** the runtime SHALL validate the payload
- **AND** it SHALL record the submission in runtime state
- **AND** it SHALL write Analysis Layer views
- **AND** it SHALL return `kind: "literature_deep_reading_enriched"` and `status: "enriched"`
- **AND** it SHALL keep `final_html_available: false`.

### Requirement: Stage 20 SHALL normalize Analysis Layer views

The runtime SHALL normalize enrichment payload and existing runtime views into deterministic Analysis Layer JSON files.

#### Scenario: Analysis views are generated

- **GIVEN** a valid enrichment payload
- **WHEN** Stage 20 is submitted
- **THEN** the runtime SHALL write `runtime/views/preface-view.json`
- **AND** it SHALL write `runtime/views/section-insights-view.json`
- **AND** it SHALL write `runtime/views/concept-overlay-view.json`
- **AND** it SHALL write `runtime/views/references-view.json`
- **AND** it SHALL write `runtime/views/summary-view.json`
- **AND** it SHALL write `runtime/views/extensions-view.json`
- **AND** it SHALL write `runtime/views/diagnostics-enrichment.json`.

### Requirement: Section and reference bindings SHALL be validated

Stage 20 payload references SHALL resolve against existing source sections and reference ids.

#### Scenario: Payload references an unknown source section

- **GIVEN** source structure does not contain `sec-missing`
- **AND** `reading-enrichment.json` contains a section note for `sec-missing`
- **WHEN** Stage 20 is submitted
- **THEN** the runtime SHALL reject the payload.

#### Scenario: Payload references an unknown reference id

- **GIVEN** the references seed and bindings do not contain `ref-999`
- **AND** `reading-enrichment.json` contains a reference digest note for `ref-999`
- **WHEN** Stage 20 is submitted
- **THEN** the runtime SHALL reject the payload.

### Requirement: Summary SHALL prefer target digest artifact

The Stage 20 summary view SHALL use the target paper digest artifact when available.

#### Scenario: Target digest exists

- **GIVEN** `runtime/source/artifacts/digest.md` exists
- **AND** the enrichment payload includes fallback summary sections
- **WHEN** Stage 20 is submitted
- **THEN** `summary-view.json` SHALL declare `source: "digest_artifact"`
- **AND** it SHALL derive summary sections from the digest artifact.

#### Scenario: Target digest is missing

- **GIVEN** `runtime/source/artifacts/digest.md` is missing
- **AND** the enrichment payload enables fallback summary sections
- **WHEN** Stage 20 is submitted
- **THEN** `summary-view.json` SHALL declare `source: "agent_fallback"`
- **AND** it SHALL use the fallback summary sections.

#### Scenario: Digest summary keeps only leading sections

- **GIVEN** `artifacts/digest.md` contains more than five top-level `##` sections
- **WHEN** Stage 20 builds `summary-view.json`
- **THEN** it SHALL include only the first five top-level sections.

### Requirement: Reference digest modal data SHALL require library digest availability

The references view SHALL expose digest modal data only for library-bound references with available digest markdown.

#### Scenario: Mixed reference digest availability

- **GIVEN** one reference is library-bound and has an available digest
- **AND** another reference is external or lacks an available digest
- **WHEN** Stage 20 is submitted
- **THEN** only the library-bound reference with available digest SHALL have `digest_modal.available: true`.

### Requirement: Concept Enrichment Timing

The runtime SHALL NOT create interactive concept overlay entries after the enrichment payload for terms the agent could not see or define.

#### Scenario: Undefined section terms remain plain keywords

- **GIVEN** `reading-enrichment.json` mentions a section concept label with no Host definition and no agent definition
- **WHEN** Stage 20 normalizes the payload
- **THEN** that label SHALL NOT appear in `concept-overlay-view.concepts`
- **AND** the section insight SHALL retain the label as a plain keyword
- **AND** diagnostics SHALL record the unresolved concept reference.

### Requirement: Stage 30 SHALL accept block translations

The `literature-deep-reading` runtime SHALL accept `runtime/payloads/block-translations.json` after Stage 20 enrichment.

#### Scenario: Valid block translations are submitted

- **GIVEN** Stage 00 bootstrap views exist
- **AND** Stage 20 Analysis Layer views exist
- **AND** the agent writes a valid `block-translations.json`
- **WHEN** the agent runs `python scripts/deep_reading_runtime.py submit-block-translations --payload runtime/payloads/block-translations.json`
- **THEN** the runtime SHALL validate the payload
- **AND** it SHALL record the submission in runtime state
- **AND** it SHALL write `runtime/views/translation-view.json`
- **AND** it SHALL write `runtime/views/diagnostics-translation.json`
- **AND** it SHALL return `kind: "literature_deep_reading_translated"` and `status: "translated"`
- **AND** it SHALL keep `final_html_available: false`.

### Requirement: Stage 30 SHALL preserve source block structure

The translation view SHALL preserve the source block order and bind translations to stable block ids.

#### Scenario: Translation view is generated

- **GIVEN** the source reading blocks contain translatable body blocks
- **WHEN** Stage 30 is submitted
- **THEN** `translation-view.json` SHALL list translated rows in source block order
- **AND** each row SHALL include block id, section anchor, kind, source markdown, translated markdown, status, and quality notes.

### Requirement: Stage 30 SHALL reject invalid block coverage

The runtime SHALL reject translations that do not match the bootstrap block structure.

#### Scenario: Unknown or duplicated block id is submitted

- **GIVEN** `block-translations.json` contains an unknown block id or repeats the same block id
- **WHEN** Stage 30 is submitted
- **THEN** the runtime SHALL reject the payload.

#### Scenario: Required body block is missing

- **GIVEN** a non-formula block has `translate: true`
- **AND** no translation row is submitted for that block
- **WHEN** Stage 30 is submitted
- **THEN** the runtime SHALL reject the payload.

#### Scenario: References block is submitted

- **GIVEN** a block is marked `translate: false`
- **AND** the payload contains a translation row for that block
- **WHEN** Stage 30 is submitted
- **THEN** the runtime SHALL reject the payload.

### Requirement: Formula blocks SHALL be carried over when omitted from payload

Formula blocks SHALL not require agent-authored translation.

#### Scenario: Formula translation is omitted

- **GIVEN** a formula block has `translate: true`
- **AND** the payload does not contain that formula block
- **WHEN** Stage 30 is submitted
- **THEN** `translation-view.json` SHALL include the formula block with `status: "carried_over"`
- **AND** its translated markdown SHALL equal the source markdown.

### Requirement: Table translations SHALL remain table-like

Table block translations SHALL preserve table-like Markdown or HTML structure.

#### Scenario: Table translation is not table-like

- **GIVEN** a table block requires translation
- **AND** the submitted translated markdown is plain paragraph text
- **WHEN** Stage 30 is submitted
- **THEN** the runtime SHALL reject the payload.

### Requirement: Image translations preserve image references

Image block translations SHALL preserve source image references.

#### Scenario: Image translation preserves image references

- **GIVEN** an image block translation is submitted
- **WHEN** Stage 30 validates the payload
- **THEN** the translation SHALL preserve the source image references.

### Requirement: Generic Translation Quality Gates

The runtime SHALL reject deterministic lazy or structurally invalid block translations without assuming a single target language.

#### Scenario: Copied source text is rejected for different target languages

- **GIVEN** Stage 30 target language is `fr-FR` or `zh-CN`
- **AND** a translatable prose block translation copies the source text
- **WHEN** `submit-block-translations` runs
- **THEN** the runtime SHALL reject the payload with a translation quality error.

#### Scenario: Translation structure and completeness are checked

- **GIVEN** `block-translations.json` contains placeholders, repeated identical long translations, suspiciously short prose translations, or a table translation that is no longer table-like
- **WHEN** `submit-block-translations` runs
- **THEN** the runtime SHALL reject definite failures
- **AND** it SHALL continue to allow formula blocks to be carried over unchanged.

### Requirement: Stage 40 SHALL accept final review and render final HTML

The `literature-deep-reading` runtime SHALL accept `runtime/payloads/final-review.json` after Stage 30 translation and render the final artifact.

#### Scenario: Valid final review is submitted

- **GIVEN** Stage 00, Stage 10, Stage 20, and Stage 30 views exist
- **AND** the agent writes a valid `final-review.json`
- **WHEN** the agent runs `python scripts/deep_reading_runtime.py submit-final-review --payload runtime/payloads/final-review.json`
- **THEN** the runtime SHALL write `result/deep-reading.html`
- **AND** it SHALL write `result/deep-reading-manifest.json`
- **AND** it SHALL write `result/final-output.candidate.json`
- **AND** it SHALL return `kind: "literature_deep_reading_finalized"` and `status: "completed"`
- **AND** it SHALL declare `final_html_available: true`.

### Requirement: Final HTML renderer

The final renderer SHALL render structured blocks into a self-contained reader without escaping valid paper structures.

#### Scenario: Compare mode aligns source and translation by block

- **GIVEN** `reading-blocks.json` and `translation-view.json` are available
- **WHEN** Stage 40 renders `result/deep-reading.html`
- **THEN** translatable main and appendix body blocks SHALL be rendered as `aligned-block-pair` rows keyed by `block_id`
- **AND** References SHALL be rendered full-width outside the paired reading flow.

#### Scenario: Appendix renders after References

- **GIVEN** bootstrap identified appendix blocks
- **WHEN** Stage 40 renders final sections
- **THEN** `result/sections/sections.json` SHALL contain `reading_blocks` for main content
- **AND** it SHALL contain `appendix_reading_blocks` for appendix content
- **AND** the final HTML order SHALL be Summary, References, Appendix, Citation Graph, then Extensions after the main paper.

#### Scenario: Right reading aid follows scroll position

- **GIVEN** section insights contain Q&A and citation notes
- **WHEN** the reader scrolls through main or appendix sections
- **THEN** the right reading aid SHALL update for the active section
- **AND** questions SHALL appear before citation clues.

#### Scenario: Math is locally pre-rendered

- **GIVEN** source or translated blocks contain inline or display LaTeX
- **WHEN** Stage 40 renders `result/deep-reading.html`
- **THEN** math SHALL be rendered with local HTML/MathML output when possible
- **AND** the final HTML SHALL NOT reference remote math assets.

#### Scenario: Translated tables render as tables

- **GIVEN** a table block translation contains valid HTML or Markdown table content
- **WHEN** Stage 40 renders compare mode data
- **THEN** the translation HTML SHALL contain a rendered table rather than escaped table markup.

#### Scenario: Citation graph uses host layout coordinates

- **GIVEN** citation graph snapshot and layout views are available
- **WHEN** Stage 40 renders the citation graph
- **THEN** graph nodes SHALL be positioned from the layout view
- **AND** browser code SHALL NOT compute a replacement force layout.

#### Scenario: Citation graph uses standalone bundle

- **GIVEN** Stage 40 has rendered `result/deep-reading.html`
- **WHEN** the HTML is inspected
- **THEN** it SHALL inline the standalone citation graph renderer bundle
- **AND** it SHALL NOT include the previous SVG-only graph renderer as the primary graph implementation.

#### Scenario: Missing layout degrades without recompute

- **GIVEN** citation graph snapshot exists but layout coordinates are unavailable
- **WHEN** Stage 40 renders the final HTML
- **THEN** the citation graph model SHALL contain no drawable nodes
- **AND** the final HTML SHALL display a graph unavailable state
- **AND** it SHALL NOT compute layout in the browser.

#### Scenario: Structured references replace Markdown fallback when available

- **GIVEN** `artifacts/references.json` is available in the source bundle
- **WHEN** Stage 20 and Stage 40 render references
- **THEN** the References section SHALL use structured reference entries rather than raw Markdown text.

#### Scenario: Empty image files do not produce empty data URIs

- **GIVEN** an image file in the source bundle has zero bytes
- **WHEN** Stage 40 builds source image data
- **THEN** the image SHALL be marked corrupt or missing
- **AND** no `data:image/...;base64,` URI SHALL be generated for that file.

### Requirement: Final HTML SHALL be self-contained

The final HTML SHALL be usable without sidecar assets or network access.

#### Scenario: HTML is inspected statically

- **GIVEN** Stage 40 has rendered `result/deep-reading.html`
- **WHEN** the HTML is scanned
- **THEN** it SHALL NOT reference `http://`, `https://`, `file://`, `assets/`, or `sections/`
- **AND** it SHALL include CSS, JavaScript, data, images, and citation graph renderer assets inline.

### Requirement: References after body SHALL remain full width

References and post-reading content SHALL not enter the bilingual body columns.

#### Scenario: References are rendered

- **GIVEN** structured references exist
- **WHEN** Stage 40 renders HTML
- **THEN** references SHALL be represented in the post-reading data
- **AND** bibliography blocks SHALL not be included in translation compare body blocks.

#### Scenario: Appendix is rendered as paper content

- **GIVEN** appendix blocks exist after the bibliography
- **WHEN** Stage 40 renders HTML
- **THEN** appendix blocks SHALL be rendered after References
- **AND** appendix blocks SHALL participate in original, translated, compare, and focus reading modes.

### Requirement: Citation graph model SHALL be render-ready

The runtime SHALL normalize Host citation graph snapshot and layout views into a render-ready model for the standalone renderer.

#### Scenario: Snapshot and layout are merged

- **GIVEN** snapshot nodes and layout nodes share node ids
- **WHEN** Stage 40 builds `sections.json`
- **THEN** `citation_graph.model.nodes[]` SHALL include node identity, title, kind, year, metrics, visibility, display tier, and layout coordinates
- **AND** `citation_graph.model.edges[]` SHALL include only edges whose endpoints are drawable nodes.

### Requirement: Skill runtime SHALL remain Python-only

The `literature-deep-reading` runtime SHALL NOT require Node.js during Stage 40 rendering.

#### Scenario: Final render reads prebuilt assets

- **GIVEN** the built-in skill package contains prebuilt citation graph renderer assets
- **WHEN** Python Stage 40 renders final HTML
- **THEN** it SHALL read those assets from the skill package
- **AND** it SHALL NOT execute a bundler or Node command.

### Requirement: Runtime-prepared translation batches

The `literature-deep-reading` skill runtime SHALL prepare deterministic translation batch inputs before the agent writes `block-translations.json`.

#### Scenario: Enrichment cascades translation batch preparation

- **WHEN** `submit-reading-enrichment` succeeds
- **THEN** the runtime SHALL write `runtime/views/translation-batches-view.json`
- **AND** the runtime SHALL write one or more `runtime/payloads/translation-batches/batch-*.json` files when translatable blocks exist
- **AND** each `translate: true` main or appendix block SHALL appear in exactly one batch
- **AND** bibliography/reference-list blocks SHALL NOT appear in any batch

#### Scenario: Batch files are subagent-ready

- **WHEN** a batch file is generated
- **THEN** it SHALL include ordered block ids, source markdown, block kind, section anchor, target language, and a translation prompt
- **AND** the prompt SHALL require full faithful translation, Markdown preservation, formula preservation, table text translation, table structure preservation, and no summarization

### Requirement: Runtime stdout remains small

Runtime commands SHALL return small JSON summaries on stdout and write large content to files.

#### Scenario: Submit commands produce summary output

- **WHEN** a submit or validate command completes
- **THEN** stdout SHALL include status, counts, diagnostics summary, and relevant output paths
- **AND** stdout SHALL NOT include large paper content, full reading blocks, full translation views, full graph models, or HTML content

### Requirement: Stable Preface slots

The runtime SHALL normalize Preface output to a fixed four-card structure.

#### Scenario: Agent submits variable Preface cards

- **WHEN** `reading-enrichment.json` contains any number of `preface_cards`
- **THEN** `preface-view.json.cards` SHALL contain exactly four cards
- **AND** the cards SHALL be ordered as research field, research direction, paper position, and reading path
- **AND** extra agent cards SHALL NOT change the final card count or order

### Requirement: Citation graph render diagnostics

The final renderer SHALL expose citation graph render readiness and diagnostics.

#### Scenario: Graph model and layout are available

- **WHEN** Stage 40 builds final sections with a citation graph snapshot and layout
- **THEN** `sections.json.citation_graph.model.diagnostics` SHALL include snapshot counts, layout counts, drawable node count, drawable edge count, dropped counts, coordinate bounds, and layout status
- **AND** the final HTML SHALL initialize a graph container that reports `data-zs-cg-status="ready"` after successful renderer setup

#### Scenario: Graph rendering fails

- **WHEN** the standalone graph renderer cannot initialize
- **THEN** the graph container SHALL report `data-zs-cg-status="failed"`
- **AND** the user SHALL see a compact fallback message instead of an empty frame

### Requirement: Runtime SHALL materialize stage agent packets

The `literature-deep-reading` runtime SHALL materialize compact agent-facing
packet views at each stage handoff so agents can read one default packet instead
of many runtime-owned intermediate views.

#### Scenario: Bootstrap creates the Stage 10 packet

- **WHEN** `scripts/deep_reading_runtime.py bootstrap --input runtime/input.json`
  succeeds
- **THEN** the runtime SHALL write `runtime/views/stage-10-agent-packet.json`
- **AND** the packet SHALL include the next payload path, submit command,
  validate command, summary, work items, diagnostics summary, and trace paths
- **AND** the packet SHALL NOT inline full source markdown or full reading
  blocks.

#### Scenario: Stage 10 creates the Stage 20 packet

- **WHEN** `submit-context-request` succeeds
- **THEN** the runtime SHALL write `runtime/views/stage-20-agent-packet.json`
- **AND** the packet SHALL summarize Host context availability, topic context,
  concept needs, reference digest availability, diagnostics, and trace paths.

#### Scenario: Stage 20 creates the Stage 30 worklist

- **WHEN** `submit-reading-enrichment` succeeds
- **THEN** the runtime SHALL write
  `runtime/views/stage-30-translation-worklist.json`
- **AND** the worklist SHALL summarize translation source, target language,
  required translation count, required block ids, batch paths, batch counts, and
  diagnostics.
- **AND** if translator alignment already supplies translations, the worklist
  SHALL identify that block translation submission should be skipped.

#### Scenario: Stage 30 creates the Stage 40 review packet

- **WHEN** `submit-block-translations` succeeds
- **THEN** the runtime SHALL write `runtime/views/stage-40-review-packet.json`
- **AND** the packet SHALL summarize translation counts, translation source,
  diagnostics, and trace paths for final review.

### Requirement: Stage validation SHALL require packet handoffs

The `literature-deep-reading` validation commands SHALL verify that the expected
agent-facing packet exists and contains valid JSON before declaring a stage
valid.

#### Scenario: Packet is missing after bootstrap

- **GIVEN** bootstrap views exist
- **AND** `runtime/views/stage-10-agent-packet.json` is missing
- **WHEN** `validate-bootstrap` runs
- **THEN** validation SHALL fail.

#### Scenario: Packet is missing after a submit stage

- **GIVEN** a submit command has generated its normal runtime views
- **AND** the corresponding agent-facing packet is missing
- **WHEN** the matching `validate-*` command runs
- **THEN** validation SHALL fail.

### Requirement: Skill instructions SHALL enforce submit validate gates

The generated `literature-deep-reading` skill instructions SHALL require agents
to validate each stage immediately after submit and to repair the current stage
payload before continuing.

#### Scenario: Generated instructions describe the gate

- **WHEN** the built-in skill package is rendered
- **THEN** `SKILL.md` and `assets/runner.json` SHALL instruct the agent to run
  the matching `validate-*` command after each submit command
- **AND** they SHALL instruct the agent not to continue to the next stage until
  validation returns `ok: true`.

#### Scenario: Generated instructions are packet-first

- **WHEN** the built-in skill package is rendered
- **THEN** Stage 30 instructions SHALL default to reading
  `runtime/views/stage-30-translation-worklist.json` and the listed batch files
- **AND** Stage 40 instructions SHALL default to reading
  `runtime/views/stage-40-review-packet.json`
- **AND** larger runtime views SHALL be described as trace paths for use only
  when needed.

### Requirement: Skill instructions SHALL define reader-first task goals

The generated `literature-deep-reading` skill instructions SHALL state that the
skill produces a self-contained HTML reading experience for the current paper,
with source reading as the primary task and translation, topic context, citation
graph, reference digests, and concept explanations as supporting layers.

#### Scenario: Generated instructions describe the product goal

- **WHEN** the built-in skill package is rendered
- **THEN** `SKILL.md` SHALL include a task goal section
- **AND** the section SHALL state that the source paper remains primary
- **AND** the section SHALL state that the skill is not a generic survey,
  pure translation task, or report generator.

### Requirement: Skill instructions SHALL define LLM and runtime responsibilities

The generated `literature-deep-reading` skill instructions SHALL state which
work is owned by the LLM and which work is owned by the runtime.

#### Scenario: Generated instructions describe responsibility boundaries

- **WHEN** the built-in skill package is rendered
- **THEN** `SKILL.md` SHALL list LLM-owned semantic responsibilities
- **AND** it SHALL list runtime-owned deterministic responsibilities
- **AND** it SHALL forbid hand-editing runtime-owned views, SQLite state, or
  final HTML.

### Requirement: Skill instructions SHALL define general safety and recovery rules

The generated `literature-deep-reading` skill instructions SHALL define
packet-first recovery and runtime-owned artifact safety rules.

#### Scenario: Generated instructions describe recovery

- **WHEN** the built-in skill package is rendered
- **THEN** `SKILL.md` SHALL instruct agents to run `status` before recovery
- **AND** it SHALL instruct agents to read the current stage packet by default
- **AND** it SHALL say missing packets must be repaired through the matching
  validate/submit stage rather than skipped.

### Requirement: Skill instructions SHALL define optional subagent delegation protocol

The generated `literature-deep-reading` skill instructions SHALL define Stage 30
subagent delegation as optional batch-level work with main-agent ownership of
review and submission.

#### Scenario: Generated instructions describe Stage 30 delegation

- **WHEN** the built-in skill package is rendered
- **THEN** Stage 30 instructions SHALL say subagents translate one runtime batch
- **AND** they SHALL define a result shape containing `batch_id`,
  `translations[]`, and `quality_notes[]` or equivalent stdout
- **AND** they SHALL state that the main agent owns merge, quality review,
  `block-translations.json`, submit, and validation.

### Requirement: Context request payloads SHALL include semantic intent

The `literature-deep-reading` skill SHALL require Stage 10 context request
payloads to include enough semantic intent for Host context collection.

#### Scenario: Context request is missing semantic anchors

- **WHEN** `validate-context-request` checks a payload without non-empty
  `main_task` or `method_family`
- **THEN** validation SHALL fail.

#### Scenario: Optional context request lacks required intent

- **WHEN** `request_topic_context` is true without `topic_context_reason`
- **OR** `request_concept_context` is true without `concept_labels`
- **OR** `reference_digest_policy` is `priority_only` without
  `priority_reference_indices`
- **THEN** validation SHALL fail.

### Requirement: Reading enrichment payloads SHALL meet minimum semantic content

The `literature-deep-reading` skill SHALL require Stage 20 reading enrichment
payloads to provide the minimum content needed for a useful reader-first HTML
experience.

#### Scenario: Preface cards are incomplete

- **WHEN** `validate-reading-enrichment` checks a payload whose preface cards do
  not match the four stable slots
- **THEN** validation SHALL fail.

#### Scenario: Section notes are incomplete

- **WHEN** `validate-reading-enrichment` checks a section note missing a
  reading goal, warning list, question list, citation note body, or citation
  reference role list
- **THEN** validation SHALL fail.

#### Scenario: Concept or reference notes are incomplete

- **WHEN** an agent-supplied concept lacks `definition`
- **OR** a reference digest note lacks `role_in_current_paper` or `why_open`
- **THEN** validation SHALL fail.

### Requirement: Citation role guidance SHALL remain recommended not enumerated

The skill instructions SHALL recommend citation role terms from
`literature-analysis`, but the runtime SHALL NOT reject a non-empty custom role
solely because it is outside the recommended examples.

#### Scenario: Custom citation role is non-empty

- **WHEN** `validate-reading-enrichment` checks a citation reference role with a
  known `reference_id` and a non-empty custom `role`
- **THEN** validation SHALL allow that role value.

### Requirement: Translation and final review validation SHALL use runtime-owned checks

The Stage 30 instructions SHALL direct agents to collect batch JSON, merge,
submit, validate, and repair by runtime error. Final review validation SHALL
check assessment consistency.

#### Scenario: Final review assessment is inconsistent

- **WHEN** `overall_assessment` is `needs_revision` without warning/error
  observations
- **OR** `overall_assessment` is `ready` with an error observation
- **THEN** validation SHALL fail.
