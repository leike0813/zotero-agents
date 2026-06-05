# acp-shared-skill-catalog-thin-proxy-overlay Specification

## Purpose
TBD - created by archiving change add-acp-shared-skill-catalog-thin-proxy-overlay. Update Purpose after archive.
## Requirements
### Requirement: Shared Skill Catalog

ACP SkillRunner-compatible runs MUST build or reuse a shared read-only catalog of effective plugin-side skills.

#### Scenario: User Skill Overrides Builtin

Given a builtin skill and a user skill have the same skill id
When the ACP shared catalog is built
Then the user skill MUST be the effective catalog entry.

### Requirement: Thin Proxy Injection

ACP SkillRunner-compatible runs MUST inject run-local thin proxy skills for all effective catalog skills.

#### Scenario: Proxy Does Not Copy Heavy Resources

Given a catalog skill contains `assets`, `scripts`, and `references`
When a run-local proxy is materialized
Then the proxy directory MUST contain `SKILL.md` and a lightweight manifest
And it MUST NOT contain copied `assets`, `scripts`, or `references` directories by default.

### Requirement: Run-Specific Patch

Thin proxy `SKILL.md` files MUST include run-specific instructions, resource
roots, and Skill-Runner-aligned runtime output contract sections.

#### Scenario: Proxy Declares Resource Roots

When a proxy `SKILL.md` is generated
Then it MUST include the run workspace and shared catalog skill root
And it MUST describe the assets, scripts, and references roots relative to that shared catalog skill root.

#### Scenario: Proxy Preserves Skill Frontmatter

Given a source `SKILL.md` starts with YAML frontmatter
When a proxy `SKILL.md` is generated
Then the YAML frontmatter MUST remain the first content in the file
And the thin proxy resource mapping MUST be inserted after the YAML frontmatter
And this MUST work for both LF and CRLF frontmatter line endings.

#### Scenario: Proxy Resource Mapping Stays Compact

When a proxy `SKILL.md` is generated
Then the thin proxy resource mapping MUST include the run workspace and shared catalog skill root
And it MUST describe assets, scripts, and references with `<shared catalog skill root>/...` placeholders
And it MUST NOT include proxy mode, input manifest, runner result envelope path, or duplicated final-result contract instructions.

#### Scenario: Proxy Patch Sections Are Ordered

When a proxy `SKILL.md` is generated
Then the thin proxy resource mapping MUST appear before the original skill body
And the runtime enforcement, output format contract, output contract details, and selected execution mode patch MUST appear after the original skill body in that order
And the Skill-Runner artifact redirection section MUST NOT be injected.

#### Scenario: Proxy Patch Text Is Template-Based

When ACP Skills prepares runtime patch sections
Then the fixed patch prose MUST be loaded from packaged Markdown template assets
And the materializer MUST only render dynamic Zotero-specific values, schema summaries, examples, and execution mode selection
And missing templates, empty templates, or missing required placeholders MUST fail before writing the proxy `SKILL.md`
And template heading/prose changes MUST NOT fail solely because a fixed marker string is absent.

#### Scenario: Interactive Proxy Documents Renderable Ui Hints

Given a skill run uses interactive execution mode
When a proxy `SKILL.md` is generated
Then it MUST document the pending branch as `__SKILL_DONE__ = false` with `message` and `ui_hints`
And it MUST document `ui_hints.prompt`, `ui_hints.hint`, `ui_hints.options`, and `ui_hints.files`
And it MUST document the supported `ui_hints.kind` values as `open_text`, `choose_one`, `confirm`, and `upload_files`
And the pending branch example MUST use `ui_hints.options` entries with `label` and `value`.

### Requirement: Resource Reference Rewrite

Thin proxy generation MUST rewrite stable resource references to absolute catalog paths.

#### Scenario: Script Reference Rewrite

Given an original `SKILL.md` references `scripts/stage_runtime.py`
When the proxy `SKILL.md` is generated
Then that reference MUST point at the catalog skill root `scripts/stage_runtime.py`.

### Requirement: Catalog-Rooted Runtime Metadata

Runtime dependencies and output schema validation MUST use the real catalog skill package, not the proxy directory.

#### Scenario: Output Schema In Catalog

Given a proxy does not contain `assets/output.schema.json`
When output validation runs
Then it MUST resolve the schema from the requested skill catalog root.

### Requirement: ACP runner SHALL maintain a shared skill catalog

ACP SkillRunner-compatible runs MUST build or reuse a shared read-only catalog
of effective plugin-side skills.

#### Scenario: Hermes uses shared catalog without proxy overlay

- **GIVEN** the resolved ACP agent family is `hermes`
- **WHEN** the shared catalog is built or reused
- **THEN** the catalog entries SHALL include the source skill ID, description,
  catalog skill root, and `SKILL.md` path
- **AND** the runner SHALL NOT create run-local thin proxy skill directories
  for Hermes.

### Requirement: ACP runner SHALL materialize thin proxy skills for proxy-based families

ACP SkillRunner-compatible runs MUST inject run-local thin proxy skills for all
effective catalog skills for families that use project-level skill roots.

#### Scenario: Non-Hermes proxy materialization is preserved

- **GIVEN** the resolved ACP agent family is not `hermes`
- **WHEN** ACP Skills prepares a run
- **THEN** the runner SHALL materialize thin proxy skills into the resolved
  skill roots as before.

