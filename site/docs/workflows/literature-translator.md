# Literature Translator

## Purpose

Translate a literature attachment (Markdown or PDF) into a specified target language, producing a translated Markdown file and bilingual alignment data. It is strongly recommended to convert PDFs to Markdown first using [MinerU](mineru) for significantly better translation quality.

## Inputs

| Parameter | Required | Description |
| --- | --- | --- |
| `target_language` | No | Target language (default: `zh-CN`). Supported: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. Custom values are accepted. |
| `mode` | No | Translation mode: `fast` (default) or `high_quality` (slower). |

Accepted attachment types: `text/markdown`, `text/x-markdown`, `text/plain`, `application/pdf`.

### Trigger Methods

- Select an attachment directly (PDF or Markdown)
- Select a parent item — the plugin automatically finds the first qualifying attachment
- Only one attachment per parent item is processed
- Items with an existing translation in the target language are automatically skipped

## Behavior

1. Resolve the target attachment from the selection (direct attachment or first qualifying attachment under the parent item).
2. Check whether a translation artifact already exists for the target language; skip if so.
3. Submit the translation job to the Skill-Runner backend with the `literature-translator` skill.
4. The translation pipeline runs multiple stages: alignment analysis, translation execution, and QA verification.
5. Write the translated Markdown file to the same directory as the source, named `<source-name>_<target-language>.md`, and create a linked attachment under the parent item.

The workflow is fully automatic and does not pause for user intervention.

## Output And Apply

| Artifact | Description |
|----------|-------------|
| Translated Markdown | Written alongside the source file as `<source-name>_<target-language>.md` |
| Linked attachment | Created under the parent item pointing to the translated Markdown |
| Alignment data | Bilingual alignment JSON in the skill workspace |
| Glossary | Extracted glossary JSON in the skill workspace |
| QA report | Quality assurance report JSON in the skill workspace |

## Estimated Duration

| File Size | Estimated Time |
|-----------|---------------|
| Short paper (≤10 pages) | 3–5 minutes |
| Standard (10–30 pages) | 5–10 minutes |
| Long paper (30+ pages) | 10–18 minutes |

## Model Recommendation

A model with subagent delegation capability is recommended. The translation pipeline includes alignment analysis, translation execution, and QA verification stages. Subagent delegation enables parallel processing of these subtasks, significantly improving efficiency and translation consistency.

## Dependencies

- **Backend**: Skill-Runner
- **Skill**: `literature-translator`

## Related Workflows

- [MinerU PDF Parsing](mineru) — Convert PDF to Markdown first for better translation quality
- [Literature Analysis](literature-analysis) — Generate literature digest and analysis artifacts
