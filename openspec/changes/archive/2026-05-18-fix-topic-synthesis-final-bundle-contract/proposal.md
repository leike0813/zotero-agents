# Fix Topic Synthesis Final Bundle Contract

## Summary

Create/update topic synthesis currently lets Stage 1 persist payloads without a
standard `topic_definition.id`, and the final result bundle embeds large,
duplicated resolver objects. Host apply then fails late with
`topic synthesis bundle requires topic_definition.id`.

This change makes `topic_definition` mandatory at Stage 1 and moves full
resolver state behind a run-local manifest path in the final bundle.

## Non-Goals

- Do not change MCP resolver tool output.
- Do not change topic artifact section schemas.
- Do not preserve compatibility with already malformed run outputs.
