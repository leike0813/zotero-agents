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

![Topic Synthesis Overview Page](/img/docs/workflows/topic-synthesis_overview.png)

![Topic Synthesis Taxonomy Page](/img/docs/workflows/topic-synthesis_taxonomy.png)

![Topic Synthesis Claims Page](/img/docs/workflows/topic-synthesis_claims.png)

![Topic Synthesis Compare Page](/img/docs/workflows/topic-synthesis_compare.png)

![Topic Synthesis Future Directions Page](/img/docs/workflows/topic-synthesis_future-directions.png)

![Topic Synthesis Coverage Page](/img/docs/workflows/topic-synthesis_coverage.png)

![Topic Synthesis Report Page](/img/docs/workflows/topic-synthesis_report.png)

![Topic Synthesis References Page](/img/docs/workflows/topic-synthesis_references.png)

![Topic Synthesis Paper Subgraph](/img/docs/workflows/topic-synthesis_subgraph.png)

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
1. Ensure all related papers have been run through [Literature Analysis](literature-analysis)
2. Ensure related papers have been run through [Tag Regulator](tag-regulator)
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

- [Synthesis Workbench Overview](../synthesis/) — Guide to using the Synthesis Workbench
- [Manuscript Literature Framing](manuscript-literature-framing) — Write paper introductions based on Topic Synthesis results
