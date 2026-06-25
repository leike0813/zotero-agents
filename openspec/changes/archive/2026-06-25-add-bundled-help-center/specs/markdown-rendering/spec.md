## MODIFIED Requirements

### Requirement: Shared Markdown Rendering Core

All user-visible plugin Markdown preview or reader surfaces SHALL render through
a shared Markdown rendering core unless they are not UI rendering paths.

#### Scenario: Transcript line breaks are preserved

- **WHEN** ACP chat, ACP skill-run, or SkillRunner run dialog renders transcript
  Markdown
- **THEN** single line breaks, consecutive blank lines, code blocks, and fallback
  error text SHALL match the legacy transcript behavior.

#### Scenario: Document Markdown supports rich rendering

- **WHEN** the internal Markdown reader, bundled help center, Dashboard README,
  or Synthesis document surfaces render Markdown
- **THEN** headings, lists, tables, links, images, code blocks, and math SHALL
  render through the shared renderer.

#### Scenario: Unsafe HTML is removed

- **WHEN** Markdown contains script-like tags, event attributes, or dangerous URL
  schemes
- **THEN** the renderer SHALL remove those unsafe constructs before insertion
  into the DOM.

#### Scenario: Bundled help may use safe generated HTML figures

- **WHEN** the bundled help generator rewrites documentation images into HTML
  figure blocks
- **THEN** the document rendering profile SHALL allow those safe image figure
  blocks while preserving normal sanitizer protections against unsafe tags,
  event attributes, and dangerous URL schemes.
