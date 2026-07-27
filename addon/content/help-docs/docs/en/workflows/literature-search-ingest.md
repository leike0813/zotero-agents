# Literature Search & Ingest

## Purpose

Search academic literature with AI and ingest approved results into Zotero. A blank query can start a guided conversation that turns a research need into a confirmed search brief.

## Search Modes

| Mode | Description |
|------|------|
| `auto` | Detect a suitable mode for a non-blank query; a blank query starts guided planning. |
| `guided` | Clarify the research need, inspect local Zotero/Synthesis coverage, and execute the confirmed brief directly. |
| `topic_expansion` | Search by research direction or topic. |
| `paper_seed_expansion` | Expand from a seed paper. |
| `targeted_ingest` | Precisely locate and ingest one paper. |

## Execution Flow

```
1. Guided planning (blank auto query or guided mode)
   └── Clarify the research goal in short rounds
   └── Read local Zotero/Synthesis coverage only
   └── Present a structured search brief
   └── Wait for confirmation; no web search or writes before confirmation

2. Candidate search and selection
   └── Search according to the confirmed brief or explicit mode
   └── Verify identifiers, authoritative metadata, landing pages, and legal public-PDF evidence
   └── User selects items to ingest

3. Ingest and completion
   └── Ingest each approved paper through zotero-bridge
   └── Output concise ingest JSON, including missing-PDF links
```

## Parameters

| Parameter | Type | Description | Default |
|------|------|------|------|
| `query` | string | Search topic, paper identifier, seed, or an empty value for guided planning. | Empty |
| `searchMode` | string | `auto`, `guided`, `topic_expansion`, `paper_seed_expansion`, or `targeted_ingest`. | `auto` |
| `searchBreadth` | string | Choose broad multi-lane discovery, balanced coverage, or a quick first pass. | `broad` |
| `languageHints` | string[] | Optional BCP 47 language hints such as `en`, `zh-CN`, `ja`, or `de`. They expand queries and sources but never filter other languages. | `[]` |
| `targetCollection` | string | Optional target Collection. | Empty |

## Outputs

- Candidate evidence is verified before a user can approve ingest.
- Each successful ingest is created or reused in Zotero; legal landing-page links remain available when no PDF is attached.
- Guided runs report `search_mode: "guided"`; other runs retain their concrete search mode.

## Dependencies

- **Backend**: ACP backend with interactive execution
- **Skill**: `literature-search-ingest`
