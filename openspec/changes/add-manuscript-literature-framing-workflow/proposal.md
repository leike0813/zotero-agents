# Add Manuscript Literature Framing Workflow

## Summary
Add an interactive ACP workflow and self-contained skill for drafting manuscript Introduction and Related Work sections from a paper title, user-confirmed manuscript context, and confirmed Topic Synthesis evidence.

## Motivation
Topic Synthesis already provides structured literature positioning, taxonomy, comparison, debates, evidence maps, and review inputs. Manuscript writing needs a separate downstream workflow because the manuscript's own problem, method, contribution, and target venue are the true source of positioning. The new workflow bridges those two layers and outputs LaTeX artifacts suitable for later Dashboard product storage.

## Goals
- Start from a manuscript title and collect problem/method/contribution/venue/style interactively.
- Recommend relevant Topic Synthesis topics and require user confirmation.
- Use Synthesis and Zotero MCP tools to gather topic context, graph/registry information, citekeys, and selected paper evidence.
- Produce a confirmed writing plan before final LaTeX.
- Write run-local result artifacts only; do not write Zotero notes or Synthesis canonical state.

## Non-Goals
- No Dashboard product storage UI in this change.
- No survey-paper-specific mode in v1.
- No automatic creation of missing Topic Synthesis topics.
- No full-library full-text reading.
