## Why

The built-in create/update topic synthesis skills have grown into a gated
runtime, but their written instructions still mix schema, semantics, stage
names, and sidecar output rules in ways that are hard for humans and agents to
follow. Agents need a schema-first contract for every payload-writing stage,
and host apply should treat the final analysis manifest as the sidecar source
of truth instead of requiring duplicated sidecar paths in stdout.

## What Changes

- Restructure create/update `SKILL.md` stage instructions so each
  payload-writing action presents a compact schema skeleton before semantic
  guidance and commands.
- Restructure detailed `references/step_*.md` guidance so schema examples come
  first, followed by richer semantic interpretation, examples, and anti-patterns.
- Standardize stage and action names on the canonical `runtime_db.STAGES` and
  gate `next_action` names.
- Move sidecar discovery to the final manifest: sidecars remain fixed-path JSON
  files, but `topic-analysis.json` / `topic-analysis.patch.json` list them in a
  canonical `sidecars` object.
- Make final stdout/result bundles depend only on `analysis_manifest_path` for
  sidecar discovery, while tolerating older top-level sidecar path fields as
  fallback.

## Capabilities

### Modified Capabilities

- `topic-synthesis-skills`: Skill instructions become schema-first and use
  canonical stage/action names.
- `topic-synthesis-runtime-contract`: Final manifests expose all required
  sidecars, and runtime output no longer duplicates sidecar paths in stdout.
- `synthesize-topic-workflow`: Host apply resolves sidecars from the final
  manifest before falling back to legacy bundle fields.

## Impact

- Affected areas: built-in create/update topic synthesis skills, package-local
  runtime scripts/schemas, synthesis workflow bundle validation, host apply, and
  contract tests.
- No data migration, no dependency changes, and no `literature-digest`
  submodule update.
