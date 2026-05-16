## 1. OpenSpec

- [x] 1.1 Add delta specs for ACP thin proxy patching, ACP runner repair prompt, and ACP interactive pending guidance.
- [x] 1.2 Validate the change with `openspec validate align-acp-skills-skill-patching-with-skill-runner --strict`.

## 2. Tests

- [x] 2.1 Add tests for ordered ACP proxy patch sections and absence of artifact redirection.
- [x] 2.2 Add tests for interactive pending branch details including `ui_hints.options`.
- [x] 2.3 Add tests for Skill-Runner-aligned repair prompt and continuation guard.
- [x] 2.4 Add tests proving ACP patch templates load from packaged asset files and patch prose is not hardcoded in the materializer.
- [x] 2.5 Add tests proving run-level instruction files and Skill-Runner-style prompt bodies are materialized for ACP Skills.
- [x] 2.6 Add regression tests for CRLF YAML frontmatter preservation and compact resource mapping.

## 3. Implementation

- [x] 3.1 Update ACP thin proxy materialization to generate modular runtime patch sections.
- [x] 3.2 Share output contract details with repair prompt generation.
- [x] 3.3 Align initial run prompt, continuation guard, and repair prompt wording.
- [x] 3.4 Move ACP SKILL.md patch prose into packaged Markdown templates and render dynamic placeholders from the materializer.
- [x] 3.5 Split proxy patch placement so resource mapping stays at the head while runtime/output/mode patches append after the original skill body.
- [x] 3.6 Materialize Skill-Runner-style run execution instructions and initial prompt bodies from packaged templates.
- [x] 3.7 Preserve YAML frontmatter before proxy patch insertion and trim duplicated resource mapping prompt content.

## 4. Verification

- [x] 4.1 Run targeted ACP SkillRunner-compatible runner tests.
- [x] 4.2 Run `npm run check:builtin-workflow-manifest`.
- [x] 4.3 Run `npx tsc --noEmit`.
