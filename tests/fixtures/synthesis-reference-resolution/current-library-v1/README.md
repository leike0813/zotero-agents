# Synthesis Reference Resolution Fixture: current-library-v1

This fixture is a sanitized snapshot of the current Zotero test library's
Synthesis reference-resolution rows.

- `metadata.json`: fixture counts and provenance.
- `library.json`: active Zotero-bound literature items.
- `references.json`: extracted reference instances and current resolver output.
- `gold-labels.json`: one reference-resolution label per reference instance.
- `danger-pairs.json`: near-neighbor pairs that must not auto-match.

The fixture stores structured DB fields only. It intentionally excludes local
absolute paths, bridge tokens, Zotero profile paths, and full note HTML.
