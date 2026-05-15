# Design

## Patch Composition

ACP Skills will generate two proxy patch regions. The Zotero-specific thin proxy
resource mapping remains near the head of the generated `SKILL.md`, immediately
after frontmatter when present, because it explains how local resource paths map
to the shared catalog. The Skill-Runner-aligned runtime enforcement, output
format, output contract details, and execution mode sections are appended after
the original skill body, matching Skill-Runner's tail patching model.

The frontmatter boundary is part of the skill discovery protocol, so ACP Skills
must preserve YAML frontmatter as the first bytes of the generated proxy
`SKILL.md`, including source files that use CRLF line endings. The head patch is
inserted only after that frontmatter block.

The resource mapping patch stays intentionally short. It includes the run
workspace and one shared catalog skill root, then describes `assets`, `scripts`,
and `references` as `<shared catalog skill root>/...` placeholders. It does not
repeat input manifest, runner result envelope, proxy mode, or output-result
contract instructions because those are handled by the run-level instruction
file and tail runtime patch.

Patch section prose is stored as packaged Markdown template assets under
`addon/content/acp-skill-patches/templates/`. Runtime code loads templates by
module metadata, validates template presence and required placeholders, renders
Zotero-specific values, and then joins the ordered patch plan. Template prose is
intentionally editable; the loader must not require fixed heading/marker text.
This keeps patch text governed like Skill-Runner's template-based patcher instead
of burying long runtime contracts in business logic.

The artifact redirection section from Skill-Runner is intentionally omitted.
ACP Skills workflow results are consumed through `WorkflowResultContext`, and
skill-specific artifacts can remain under the run workspace and be referenced by
the final JSON payload.

## Run Execution Instructions

ACP Skills will also materialize a run-level instruction file from a packaged
template before the first ACP prompt. The filename follows the resolved ACP agent
family: `CLAUDE.md` for Claude Code, `GEMINI.md` for Gemini CLI, and `AGENTS.md`
for Codex, Qwen, OpenCode, and other ACP-compatible agents. The file provides
global run discipline, workspace scope, engine-local skill directories, and
contract layering. It does not replace the runtime-patched `SKILL.md`.

The first prompt uses a Skill-Runner-style skill invocation line plus a compact
body rendered from a packaged prompt template with `Inputs`, `Parameters`, and
the task sentence. ACP-specific workspace paths remain as a short context block
after that common body.

## Output Contract Details

The patch will include a compact output contract section derived from the
resolved output schema when available. Interactive mode appends a pending branch
contract with Skill-Runner-aligned `ui_hints.kind` vocabulary:
`open_text`, `choose_one`, `confirm`, and `upload_files`. The concrete example
uses `ui_hints.options` items shaped as `{ label, value }`.

The same contract text is passed to repair prompts so the agent receives the
same branch rules after validation failure as it received in the run-local
`SKILL.md`.

## Repair And Continuation

Repair prompt wording follows the current Skill-Runner implementation:

- previous output failed the Skill Runner output contract;
- show previous candidate and validation errors;
- state the final/pending branch rule;
- forbid explanations and Markdown fences;
- append target output contract details.

Continuation prompts for user replies use the same JSON-only branch language so
resumed turns do not regress to informal text or non-renderable `ui_hints`.
