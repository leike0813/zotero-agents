# Design

## Workflow Shape
The workflow id and skill id are both `manuscript-literature-framing`. It is ACP-only and interactive. Its primary input is `paperTitle`; optional parameters are `language`, `targetVenue`, `articleType`, and `stylePreference`.

The workflow depends on MCP because it needs both Synthesis context and direct Zotero inspection. Required tools are:

- `synthesis.list_topics`
- `synthesis.get_review_input`
- `synthesis.get_paper_registry`
- `synthesis.get_citation_graph_metrics`
- `synthesis.get_citation_graph_slice`
- `synthesis.resolve_topic_paper_digest`
- `list_library_items`
- `search_items`
- `get_item_detail`
- `get_item_notes`
- `list_note_payloads`
- `get_note_payload`
- `get_item_attachments`
- `prepare_paper_reading_context`

## Runtime State
The skill uses package-local scripts and a run-local JSON state file. The state records:

- manuscript context supplied by the user
- topic recommendations
- confirmed topic ids
- review inputs and citation/citekey diagnostics
- confirmed writing plan
- final artifact paths and diagnostics

Gate output is authoritative: the agent asks users or calls MCP according to the current gate action.

## Interaction Contract
The skill has three required interaction points:

1. Collect manuscript context from the paper title.
2. Confirm recommended Topic Synthesis topics.
3. Confirm the structured writing plan before LaTeX rendering.

If no relevant Topic Synthesis topic can be recommended, the skill returns a pending or canceled branch suggesting that the user create a topic synthesis first.

## Output Contract
The final render writes:

- `result/introduction.tex`
- `result/related-work.tex`
- `result/writing-plan.json`
- `result/citation-map.json`
- `result/diagnostics.json`
- `result/result.json`

`result/result.json` includes `kind: "writing.manuscript_literature_framing"` and artifact metadata suitable for future Dashboard product storage indexing.

## Citation Policy
LaTeX citations use Zotero/Better BibTeX citekeys. If a source lacks a citekey, the final text must not invent one. The runtime accepts `% TODO citation: <paper_ref>` comments and records missing citekeys in diagnostics.

## Skill Writing Guide
The skill package carries a package-local Chinese writing guide at `references/scientific_introduction_related_work_writing_guide_zh.md`, derived from `artifact/introduction_guide.md`. `SKILL.md` embeds the hard constraints from that guide: Introduction follows a functional chain, Related Work is taxonomy/method/benchmark/debate oriented rather than chronological, survey-of-surveys is considered when recent reviews exist, and contribution claims come only from manuscript context.
