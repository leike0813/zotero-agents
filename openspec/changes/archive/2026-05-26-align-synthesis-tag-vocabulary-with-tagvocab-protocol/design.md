## Design

### Protocol adapter

The Synthesis tag vocabulary module owns a small TagVocab v1 adapter. It defines the protocol version, tag pattern, max length, ordered facets, and protocol-native field names from `reference/Zotero_TagVocab/protocol/protocol.yaml`. Runtime code does not read YAML files or depend on the `reference/` checkout.

### Canonical shape

`synthesis/tags/vocabulary.json` uses TagVocab-native vocabulary shape:

- `version`
- `updated_at`
- `facets`
- `tags`
- `abbrevs`
- `tag_count`

The public service snapshot keeps the existing `entries` array for UI/service compatibility, but reads both new `tags` and old `entries` canonical files. The separate `tags/abbrev.json` canonical asset uses `{ abbrevs }`; old `{ abbrev }` files remain readable.

### Import workflow

Import parsing accepts three formats:

- TagVocab-native `{ tags: [...] }`
- legacy `{ entries: [...] }`
- plain arrays of tag strings or tag-entry objects

Preview is non-mutating and returns additions, unchanged entries, conflicts, and validation warnings. Apply remains explicit: `merge-non-conflicting` adds additions only, and `use-imported` replaces matching imported tags while retaining local-only tags. Imported `abbrevs` participate in validation and are committed when an import action writes canonical state.

### Validation

Validation follows TagVocab v1:

- tag format matches `^[a-z_]+:[a-zA-Z0-9/_.-]+$`
- max tag length is 120
- facet is one of `field`, `topic`, `method`, `model`, `ai_task`, `data`, `tool`, `status`
- tag facet matches the prefix before `:`
- registered abbreviation segments must use the canonical casing from `abbrevs`

Existing deprecated replacement, alias target, and duplicate checks remain.

### UI and tag-regulator boundary

The Workbench import wizard continues sending raw pasted text to the host. The service parser handles TagVocab-native JSON so the UI can show non-empty additions/conflicts for `tags/tags.json`. `exportTagVocabularyForRegulator()` continues to return only active canonical tag strings, preserving the tag-regulator request contract.
