## Why

`literature-search-ingest` rejects empty `query` values even though an interactive agent can gather a research need through conversation. Users also need a way to plan a search from an undecided topic without treating a generic strategy as the hidden implementation detail.

## What Changes

- Accept blank `query` values and add the public `guided` search mode.
- Route blank `query` plus `auto` to guided planning.
- Let guided mode clarify the research need, inspect local Zotero/Synthesis coverage read-only, present a structured search brief, and execute that confirmed brief directly.
- Add `guided` to the final result `search_mode` enum while preserving the existing concise result shape.
- Make `SKILL.md` the sole business-workflow authority and reduce the runner prompt to parameter injection and delegation.

## Impact

- Affected assets: literature-search-ingest schemas, runner, Skill instructions, workflow manifest/locales, and user documentation.
- Affected tests: focused literature-search-ingest workflow contract and localization governance.
- No new UI, backend session state, Host Bridge mutation API, or apply-result behavior.
