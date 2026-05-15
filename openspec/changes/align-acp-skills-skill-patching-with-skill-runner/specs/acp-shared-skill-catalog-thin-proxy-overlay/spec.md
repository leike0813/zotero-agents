## MODIFIED Requirements

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
