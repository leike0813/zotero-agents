# Design

## MVP Closure Rule

Public Synthesis methods must either read real canonical assets / Zotero library
state or return diagnostics explaining why no data exists. Static empty arrays
are not acceptable as successful behavior.

## Library Adapter

The plugin owns a personal-library adapter that scans regular, visible Zotero
items for:

- stable paper refs: `libraryID:itemKey`;
- title, year/date, item type, DOI, URL, creators, tags, and collection refs;
- child notes containing existing `data-zs-payload` workflow artifact markers.

The adapter returns bounded DTOs and never exposes raw Zotero objects outside
the adapter boundary.

## Projections

Paper Registry remains a rebuildable projection from adapter DTOs. Unified
Citation Graph is derived from registry metadata and reference/citation-analysis
payloads. The graph builder remains deterministic and LLM-free.

## Resolver

The resolver engine evaluates topic resolvers against Paper Registry rows:

- `tag_query` supports `and`, `or`, and `not`;
- `collection` matches collection IDs or keys recorded on rows;
- `explicit` matches paper refs or item keys;
- `mixed` unions included resolvers and applies excludes last.

## Artifact Reads

Paper artifact reads use the registry artifact manifest to locate child note
payloads and return decoded payload content with hashes and diagnostics.

## ACP Skill Backend

The `synthesize-topic` workflow invokes a builtin `synthesize-topic` ACP Skill.
The skill is instruction-only and relies on MCP tools for schemas, library
index, resolver execution, artifact reads, and graph context. It returns a
validated `topic_synthesis` result bundle; persistence remains plugin-owned via
the workflow `applyResult` hook.

## Workbench Submission Entry

The Workbench `Run synthesis` action is a real workflow submission entry. It
collects `topicSeed` and `mode`, resolves the loaded `synthesize-topic`
workflow, and delegates execution to the same workflow pipeline used by the
Zotero workflow menu.
