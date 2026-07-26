## ADDED Requirements

### Requirement: Tag Regulator skill SHALL be maintained as repository-owned content
The `tag-regulator` skill MUST be stored as ordinary tracked files under `skills_builtin/tag-regulator` while preserving its existing skill id, path, runner contract, schemas, and workflow integration.

#### Scenario: Repository is checked out without submodule initialization
- **WHEN** official skills are collected from a normal repository checkout
- **THEN** all Tag Regulator runtime files SHALL be available without initializing a Tag Regulator submodule
- **AND** workflow requests SHALL continue to invoke skill id `tag-regulator`

### Requirement: Tag Regulator skill SHALL reserve builtin workflow statuses
The Tag Regulator skill MUST treat plugin-provided builtin workflow status tags in `valid_tags` as compliant read-only entries and MUST NOT infer them or emit them in `add_tags`, `remove_tags`, or `suggest_tags`.

#### Scenario: Builtin statuses are present in controlled vocabulary or item tags
- **WHEN** Tag Regulator processes `valid_tags`, item tags, metadata, or digest evidence containing or implying workflow work
- **THEN** builtin workflow statuses SHALL NOT be proposed for addition, removal, or vocabulary intake
- **AND** ordinary controlled tags and user-defined `status:*` tags SHALL retain their normal regulation behavior

#### Scenario: Tag Standard is used for pure inference
- **WHEN** Tag Regulator generates suggestions without a controlled vocabulary
- **THEN** it SHALL limit generated facets to `field`, `topic`, `method`, `model`, `ai_task`, `data`, `tool`, and user-defined `status`
- **AND** it SHALL NOT infer workflow-owned builtin statuses from paper content or metadata
