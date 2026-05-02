# ACP Shared Skill Catalog Thin Proxy Overlay

## ADDED Requirements

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

Thin proxy `SKILL.md` files MUST include run-specific instructions and resource roots.

#### Scenario: Proxy Declares Resource Roots

When a proxy `SKILL.md` is generated
Then it MUST include the run workspace, input manifest, result JSON path, catalog skill root, assets root, scripts root, and references root.

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
