# Topic Synthesis

## Purpose

Create a Topic Synthesis through a three-step automated pipeline, performing systematic analysis and synthesis of a group of related papers.

Corresponding to the Topic creation flow in the Synthesis Workbench, this workflow provides end-to-end processing from topic seed to a complete analysis report.

## Use Cases

- Creating a comprehensive topic analysis around a research direction
- Automatically building a taxonomy, key claims, timeline, and future directions
- Generating a structured synthesis analysis report

## Input Constraints

| Constraint Type | Description |
|---------|------|
| Input Unit | workflow (no items need to be selected) |
| Trigger Method | Run from Dashboard, or triggered in the Synthesis Workbench |

## Execution Flow

This workflow consists of **3 sequentially executed skills** that automatically hand off to each other:

```
1. create-topic-synthesis-prepare
   └── Receive topic seed
       └── Create topic intent
       └── Build paper workset
       └── Prepare analysis context

2. topic-synthesis-core-enrichment
   └── Core enrichment
       └── Write Taxonomy (classification system)
       └── Build Timeline
       └── Extract Claims
       └── Analyze Future Directions
       └── Generate Review Outline
       └── Knowledge graph completion

3. topic-synthesis-finalize
   └── Coverage determination
       └── Generate external context summary
       └── Curation suggestions
       └── Generate final analysis summary
```

## Outputs

After execution completes, the topic synthesis results are written to the Synthesis system's persistent storage and reflected in the Topics and Graph views of the Synthesis Workbench.

Specific outputs include:

- **Topic Metadata**: Name, description, creation time
- **Taxonomy**: Hierarchical topic classification system
- **Timeline Events**: Important events organized chronologically
- **Claims**: Extracted key claims and their evidence
- **Comparisons**: Multi-dimensional comparative analysis
- **Future Directions**: Future research direction suggestions
- **Coverage**: Literature coverage analysis
- **Report**: Synthesis analysis report

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_overview.webp" alt="Topic Synthesis Overview Page" title="Topic Synthesis Overview Page" loading="lazy" /><figcaption>Topic Synthesis Overview Page</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_taxonomy.webp" alt="Topic Synthesis Taxonomy Page" title="Topic Synthesis Taxonomy Page" loading="lazy" /><figcaption>Topic Synthesis Taxonomy Page</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_claims.webp" alt="Topic Synthesis Claims Page" title="Topic Synthesis Claims Page" loading="lazy" /><figcaption>Topic Synthesis Claims Page</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_compare.webp" alt="Topic Synthesis Compare Page" title="Topic Synthesis Compare Page" loading="lazy" /><figcaption>Topic Synthesis Compare Page</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_future-directions.webp" alt="Topic Synthesis Future Directions Page" title="Topic Synthesis Future Directions Page" loading="lazy" /><figcaption>Topic Synthesis Future Directions Page</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_coverage.webp" alt="Topic Synthesis Coverage Page" title="Topic Synthesis Coverage Page" loading="lazy" /><figcaption>Topic Synthesis Coverage Page</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_report.webp" alt="Topic Synthesis Report Page" title="Topic Synthesis Report Page" loading="lazy" /><figcaption>Topic Synthesis Report Page</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_references.webp" alt="Topic Synthesis References Page" title="Topic Synthesis References Page" loading="lazy" /><figcaption>Topic Synthesis References Page</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_subgraph.webp" alt="Topic Synthesis Paper Subgraph" title="Topic Synthesis Paper Subgraph" loading="lazy" /><figcaption>Topic Synthesis Paper Subgraph</figcaption></figure>

## Parameters

| Parameter | Type | Description | Default |
|------|------|------|--------|
| `topicSeed` | string | Topic seed describing the topic to create | — |
| `language` | string | Output language | `auto` |

### language Description

- `auto`: Automatically detect (typically uses the plugin UI language)
- `zh-CN`: Chinese
- `en-US`: English

## Dependencies

- **Backend**: ACP backend
- **Synthesis System**: Requires the Synthesis Workbench to be initialized
- **Library Papers**: It is recommended to have a sufficient number of related paper items already in the library

:::tip Recommended Preparation
Before creating a Topic, it is recommended to:
1. Ensure all related papers have been run through [Literature Analysis](#doc/workflows%2Fliterature-analysis)
2. Ensure related papers have been run through [Tag Regulator](#doc/workflows%2Ftag-regulator)
3. Run **Advance Matching** (advanced citation matching deduplication) on the Index page of the Synthesis Workbench
4. Handle all approval items on the Review page (remember to "Apply" pending decisions)

Accurate citation graph relationships directly affect the quality of paper importance calculation in Topic Synthesis (PageRank, frontier score, etc.), thereby improving the overall quality of the Topic overview.
:::

## Estimated Duration

| Topic Size | Estimated Time |
|---------|---------|
| Small topic (≤10 papers) | 8-12 minutes |
| Medium topic (10-30 papers) | 12-18 minutes |
| Large topic (30+ papers) | 18-25 minutes |

If there are many papers, it is recommended to use the update feature for incremental iteration instead.

## Model Recommendation

🔴 Models with **strong text comprehension + long context** are recommended. Topic Synthesis requires comprehensive analysis of a large number of paper digests, citation relationships, tags, and conceptual knowledge, making it a compute-intensive task. If the backend supports subagent delegation, the multi-step pipeline can be executed more efficiently.

## Related Workflows

- [Synthesis Workbench Overview](#doc/synthesis%2Findex) — Guide to using the Synthesis Workbench
- [Manuscript Literature Framing](#doc/workflows%2Fmanuscript-literature-framing) — Write paper introductions based on Topic Synthesis results
