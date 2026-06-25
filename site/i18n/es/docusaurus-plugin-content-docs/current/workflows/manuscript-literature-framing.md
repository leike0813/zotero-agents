# Manuscript Literature Framing

## Purpose

Assist in writing the Introduction and Related Work sections of an academic paper. Through interactive dialogue, clarify the paper's positioning, collect relevant literature, analyze writing frameworks, and generate LaTeX drafts.

## Use Cases

- Drafting a paper and needing to organize the literature framework
- Determining the paper's positioning and innovations
- Generating LaTeX drafts for Introduction and Related Work sections

## Input Constraints

| Constraint Type | Description |
|---------|------|
| Input Unit | workflow (no items need to be selected) |
| Trigger Method | Run directly from Dashboard |

## Execution Flow

This workflow runs interactively, proceeding through the following stages:

```
1. Paper Information Confirmation
   └── Confirm paper title and research scope
       └── Clarify target journal/venue and writing style

2. Material Collection
   └── Retrieve relevant literature from the Zotero library
       └── Obtain literature metadata and citation information

3. Multi-perspective Framework Analysis
   └── Analyze the paper's positioning in the field
       └── Identify available writing angles and narrative threads

4. Writing Plan
   └── Generate Introduction structure plan
       └── Generate Related Work organization plan

5. Draft Generation
   └── Output Introduction LaTeX draft
       └── Output Related Work LaTeX draft
       └── Include citation mapping and evidence inventory
```

### Interaction Details

- Each stage requires user confirmation before proceeding
- The user can adjust direction during the conversation
- Progress can be monitored in the Dashboard

## Estimated Duration

Depends on the number of conversation turns and the size of the literature library. The AI analysis stage takes approximately 5-10 minutes, plus user confirmation time for each stage.

## Outputs

After execution completes, artifacts can be written to Zotero (as notes) via the Apply Result hook or downloaded:

| Artifact | Format | Description |
|------|------|------|
| `introduction.tex` | LaTeX | Introduction draft |
| `related-work.tex` | LaTeX | Related Work draft |
| `framing-analysis.json` | JSON | Multi-perspective framework analysis |
| `writing-plan.json` | JSON | Writing plan |
| `evidence-inventory.json` | JSON | Evidence/citation inventory |
| `citation-map.json` | JSON | Citation mapping relationships |
| `intent-brief.json` | JSON | Paper positioning summary |

:::tip Accessing Artifacts
Generated LaTeX drafts and other artifacts can be found in the **Dashboard's artifact area**. You can directly place the artifacts into your LaTeX manuscript or export them for further processing.
:::

## Parameters

| Parameter | Type | Description | Default |
|------|------|------|--------|
| `paperTitle` | string | Paper title | — |
| `language` | string | Output language | `auto` |
| `targetVenue` | string | Target journal/venue (optional) | Empty |
| `articleType` | string | Article type | `original research` |
| `stylePreference` | string | Writing style preference (optional) | Empty |

### Writing Style Examples

- `concise`: Concise style
- `IEEE-like`: IEEE style
- `Nature-like`: Nature style
- `Chinese draft`: Chinese draft

## Dependencies

- **Backend**: ACP backend
- **Zotero Library**: Requires related paper items in the library

:::tip Recommended Workflow
For best results, it is recommended to complete the following preparation before running this workflow:
1. Collect and ingest a sufficient number of related papers
2. Run [Literature Analysis](literature-analysis) + [Tag Regulator](tag-regulator) on all papers
3. Run Advance Matching in the Synthesis Workbench and handle approval items
4. Create several related [Topic Syntheses](topic-synthesis)
:::

## Model Recommendation

🟡 Models with **long context** are recommended. Writing Introduction and Related Work requires integrating digests, citation analysis, and Topic Synthesis results from a large number of papers, placing high demands on the context window.

## Related Workflows

- [Literature Analysis](literature-analysis) — Establish a structured knowledge foundation for papers
- [Topic Synthesis](topic-synthesis) — Create topic syntheses first, then write the paper based on analysis results
