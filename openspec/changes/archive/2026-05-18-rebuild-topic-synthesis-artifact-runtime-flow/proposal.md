# Rebuild Topic Synthesis Artifact Export and Skill Runtime

## Why

The current topic synthesis Stage 4/5 path still exports full per-paper
artifact payloads into the ACP run workspace and then stores those payloads in
the run SQLite database before filtering them back into Markdown contexts. In
real runs this produces large redundant files with `decoded_text`, duplicated
`payload.content`/`markdown`, raw references internals, and citation-analysis
payload bodies that the agent should not read.

The same workflow also overuses SQLite as storage for long semantic outputs and
does not clearly separate LLM semantic work from mechanical script work. Agents
have started generating scripts to fill per-paper analysis payloads, which
defeats the original intent of that step.

## What Changes

- Replace public `synthesis.export_paper_artifact_bundle` with
  `synthesis.export_filtered_paper_artifacts`.
- Export only a single filtered artifact manifest plus one small content file
  per available artifact.
- Move digest, references, and citation-analysis filtering into the host export
  path.
- Stop storing artifact bodies, cross-paper synthesis, external literature
  analysis, or final section JSON bodies in SQLite.
- Let the agent write final section artifacts directly, then let scripts
  validate, hash, manifest, and register them.
- Make all semantic tasks explicitly LLM-owned and all script tasks explicitly
  mechanical.
- Make the paper-analysis batch schema explicit and testable.

## Impact

- Affects Synthesis MCP tool surface.
- Affects create/update topic synthesis workflow required tools.
- Affects create/update topic synthesis skill prompts, gate scripts, runtime
  DB scripts, schemas, and tests.
- New runs are not compatible with old Stage 4/5 payload shapes.
