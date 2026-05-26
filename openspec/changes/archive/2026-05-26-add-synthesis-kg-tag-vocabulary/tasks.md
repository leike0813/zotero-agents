## 1. OpenSpec and Context

- [x] 1.1 Validate the new OpenSpec change artifacts in strict mode.

## 2. Canonical Tag Vocabulary Service

- [x] 2.1 Add Synthesis tag vocabulary types, protocol defaults, normalization, validation, and deterministic sorting.
- [x] 2.2 Implement canonical asset initialization, load, save, import preview/apply, export, diagnostics, and transaction writes under `synthesis/tags/`.
- [x] 2.3 Implement rebuildable `tag-index` projection DTO and projection registry updates.

## 3. Integration

- [x] 3.1 Add Synthesis service facade and workflow host API access for tag vocabulary export.
- [x] 3.2 Add Synthesis Workbench Tags tab, snapshot state, layout, validation status, and import-preview state.
- [x] 3.3 Update tag-regulator buildRequest to prefer Synthesis canonical export and preserve prefs fallback.

## 4. Tests and Validation

- [x] 4.1 Add core tests for canonical tag vocabulary initialization, validation, transactions, projection rebuild, failure behavior, and sanitized diagnostics.
- [x] 4.2 Extend Workbench UI tests for Tags tab rendering, actions, and import conflict preview state.
- [x] 4.3 Extend tag-regulator workflow tests for Synthesis export priority and prefs fallback compatibility.
- [x] 4.4 Run focused OpenSpec, core, workflow, TypeScript, and formatting validations.
