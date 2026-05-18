# Tasks

## 1. OpenSpec

- [x] Create OpenSpec change `optimize-topic-synthesis-cross-paper-context`.
- [x] Add proposal, design, tasks, and delta spec.

## 2. Runtime

- [x] Add split Markdown context renderers to create/update package-local
  runtime DB modules.
- [x] Update create/update `export_cross_paper_context` to write the main
  context, external context, and manifest.
- [x] Make `persist_cross_paper_synthesis` accept runtime-bound context
  provenance without requiring an agent-authored context hash.
- [x] Ensure LLM-facing contexts and manifest do not expose raw payload,
  `decoded_text`, raw HTML, references `raw`, or `payload_hash`.

## 3. Skill Instructions

- [x] Update create/update `SKILL.md` Stage 5 instructions to read both
  Markdown contexts.
- [x] Update create/update runner prompts to point to Markdown contexts.

## 4. Verification

- [x] Add/update runtime contract tests.
- [x] Add/update synthesize topic workflow contract tests.
- [x] Validate the new OpenSpec change.
- [x] Run targeted tests and build.
- [x] Re-render a temporary copy of the `acp-skill-mp9l5kie-9ur4qz` runtime DB
  to verify size reduction and filtering behavior.
