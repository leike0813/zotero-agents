# literature-deep-reading-skill Delta

## MODIFIED Requirements

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

### Requirement: Host Context Return Shapes

The runtime SHALL normalize the current Host Bridge response shapes used by Stage 10.

#### Scenario: Current Host Bridge response fields are used

- **GIVEN** Host Bridge returns `reference-index get` data under `rows`
- **AND** `concepts query` data under `matches`
- **AND** `paper-artifacts export-filtered` returns `manifest_file` with `papers[].artifacts[].content_file`
- **WHEN** context collection runs
- **THEN** the runtime SHALL consume those fields and generate usable reference, concept, and artifact views.

### Requirement: Concept Enrichment Timing

The runtime SHALL NOT create interactive concept overlay entries after the enrichment payload for terms the agent could not see or define.

#### Scenario: Undefined section terms remain plain keywords

- **GIVEN** `reading-enrichment.json` mentions a section concept label with no Host definition and no agent definition
- **WHEN** Stage 20 normalizes the payload
- **THEN** that label SHALL NOT appear in `concept-overlay-view.concepts`
- **AND** the section insight SHALL retain the label as a plain keyword
- **AND** diagnostics SHALL record the unresolved concept reference.

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
