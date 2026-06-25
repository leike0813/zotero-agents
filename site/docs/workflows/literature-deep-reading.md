# Deep Reading

## Purpose

Perform deep reading of a paper, generating a structured, multi-perspective reading comprehension analysis view. Automatically extracts chapter structure, core concepts, and references, supports paragraph-by-paragraph translation, and outputs a standalone HTML reading document.

## Use Cases

- Systematically deep reading an important paper
- Obtaining a comprehensive analysis including chapter annotations, key concepts, and further reading
- Needing bilingual parallel reading (original text + target language translation)

## Input Constraints

| Constraint Type | Description |
|---------|------|
| Input Unit | Attachment |
| Accepted Types | `text/markdown`, `text/x-markdown`, `text/plain`, `application/pdf` |
| Per-parent limit | At most 1 attachment |

### Trigger Methods

- Directly select a PDF or Markdown attachment
- Select the parent item, and the plugin will automatically expand its first qualifying attachment

## Execution Flow

The Deep Reading workflow is a **fully automatic** multi-stage processing pipeline requiring no user intervention:

## Estimated Duration

| File Size | Estimated Time |
|---------|---------|
| Short paper (≤10 pages) | 8-12 minutes |
| Standard (10-30 pages) | 12-18 minutes |
| Long paper (30+ pages) | 18-25 minutes |

This workflow involves multi-stage processing (guidance → enrichment → translation → organization → rendering), making it the longest-running single-paper analysis workflow.

## Model Recommendation

🟡 Models with **strong text comprehension** are recommended. This workflow requires multi-layer deep analysis of the paper (structure, concepts, argumentation logic), placing high demands on the model's semantic understanding. If subagent delegation capability is available, stages can be executed in parallel, significantly reducing total time.

## Outputs

```
1. Preparation Phase
   └── Upload source file, generate source_bundle.zip
       └── Contains original text, images, and existing references

2. Guidance & Context Collection
   └── Analyze original text structure and metadata
       └── Collect related context via Host Bridge

3. Reading Enrichment
   └── Generate chapter annotations, key concepts, reference analysis
       └── Summary and further reading views

4. Block-by-Block Translation
   └── Normalize translation by stable blocks
       └── Generate bilingual parallel translation view

5. Final Rendering
   └── Integrate all analysis views
       └── Render as a standalone HTML file
```

## Output Artifacts

After execution completes, a linked attachment pointing to the generated HTML file is created under the parent item:

- **Format**: Standalone HTML file (can be opened in a browser)
- **Content**: Complete deep reading view including original text structure, chapter annotations, concept analysis, references, bilingual translations, etc.
- **Lifecycle**: Each execution overwrites and updates

![Deep Reading Opening Guide](/img/docs/workflows/literature-deep-reading_1.png)

![Deep Reading Bilingual Dynamic Reading](/img/docs/workflows/literature-deep-reading_2.png)

![Deep Reading Reference Abstract Reading](/img/docs/workflows/literature-deep-reading_3.png)

![Deep Reading Reference 2-hop Subgraph](/img/docs/workflows/literature-deep-reading_4.png)

## Parameters

| Parameter | Type | Description | Default |
|------|------|------|--------|
| `target_language` | string | Target language | `zh-CN` |

Available values: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. Custom input is also supported.

## Dependencies

- **Backend**: ACP backend (requires ACP protocol support)
- **Backend Configuration**: Configure an ACP type backend in Backend Manager

## Related Workflows

- [Literature Analysis](literature-analysis) — Automatically generate literature digests and citation analysis
- [Interactive Literature Explainer](literature-explainer) — Dialogue with AI for deep literature understanding
