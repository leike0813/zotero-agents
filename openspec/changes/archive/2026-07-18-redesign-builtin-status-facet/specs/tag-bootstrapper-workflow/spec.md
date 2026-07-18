## ADDED Requirements

### Requirement: Tag Bootstrapper SHALL manage only custom controlled vocabulary entries
Bootstrapper MUST accept builtin status definitions in existing vocabulary as read-only reserved entries, MUST NOT emit them in `add_tags`, and MAY suggest custom `status:*` only for explicit durable workflow semantics.

#### Scenario: Bootstrapper receives initialized builtin vocabulary
- **WHEN** a generation request includes the five builtin definitions in `existing_tags`
- **THEN** the skill SHALL treat them as already present and reserved
- **AND** SHALL NOT output them as additions

### Requirement: Tag Standard SHALL describe only runtime-supported facets and current workflow status semantics
The standard MUST list `field`, `topic`, `method`, `model`, `ai_task`, `data`, `tool`, and `status`; MUST NOT define `match_status` or `matching_status`; and MUST describe status as a zero-or-many workflow pending facet rather than a single reading progress axis.

#### Scenario: Status cannot be inferred from literature content
- **WHEN** Bootstrapper evaluates a paper's topic, language, metadata, or body
- **THEN** it SHALL NOT infer builtin workflow status definitions or item status instances
