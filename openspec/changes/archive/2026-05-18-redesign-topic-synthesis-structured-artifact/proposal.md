# Redesign Topic Synthesis Structured Artifact

## Why

Topic synthesis is currently governed by a rendered Markdown artifact, which makes
timeline, evidence, coverage, and external-literature relationships difficult to
validate, reuse, or render interactively. The Synthesis workbench now needs a
structured source of truth so topic outputs can become stable machine-readable
assets while retaining Markdown as a compatibility export.

## What Changes

- Add a structured `topic_synthesis` artifact contract composed from section
  files for topic, summary, claims, timeline events, paper evidence, external
  literature analysis, coverage, gaps, source artifacts, and diagnostics.
- Split the current mode-driven `synthesize-topic` skill into create and update
  skills/workflows with separate inputs, prompts, and output constraints.
- Replace a single `structured_path` with a section manifest such as
  `topic-analysis.json`, whose fields point to the section files written by the
  skill. Markdown remains an export and MUST NOT be embedded in the final JSON
  bundle.
- Add language selection to create/update workflows so generated structured
  prose, external literature analysis, and Markdown export use the requested
  output language.
- Add host-derived `TopicUpdateIntent` so stale or incomplete topic rows expose
  a simple prefilled update action while complete update context is resolved at
  job time.
- Replace the old `current.md`/`current.json` topic contract with an explicit
  `current/` directory containing manifest, section files, materialized
  artifact, metadata, and Markdown export.
- Replace the primary topic reader with a structured Topic Detail view using a
  tabbed main reading surface, full-height Evidence Explorer, bottom horizontal
  timeline, and temporary paper-evidence modals that resolve original
  `digest-markdown` payloads through host-owned artifact locators.
- Add an External Literature Analysis section generated from
  `references-json` and `citation-analysis-json`; external references are not
  first-class main timeline evidence nodes.
- Keep downstream Markdown compatibility for existing review workflows while
  exposing structured topic content for future review workflow upgrades.

## Capabilities

### New Capabilities

- `topic-synthesis-structured-artifact`: Structured canonical topic synthesis
  artifact and validation contract.

### Modified Capabilities

- `synthesize-topic-workflow`: Skill/workflow contract changes from a single
  mode-driven skill to create/update skills with section-file outputs,
  language-aware generation, and update patch support.
- `synthesis-layer-integration`: Persistence, metadata, index, v2 current
  directory semantics, and mirror payload behavior changes.
- `synthesis-tab-ui`: Workbench topic reader changes from Markdown reader to
  structured Topic Detail with timeline, modal evidence, and external analysis.
- `synthesis-review-input-contract`: Review input remains Markdown-compatible
  but includes structured topic artifact content for downstream consumers.

## Impact

- Affects topic synthesis skills by replacing the old mode-driven
  `synthesize-topic` package with create/update topic synthesis skills, output
  schemas, workflow manifests, and apply-result handling.
- Affects Synthesis service topic persistence, metadata, snapshot rows, topic
  artifact read APIs, and host-routed paper digest resolution.
- Affects Synthesis Workbench UI model and static app rendering for topic detail.
- Requires targeted schema, persistence, UI model, and review-input tests before
  implementation.
