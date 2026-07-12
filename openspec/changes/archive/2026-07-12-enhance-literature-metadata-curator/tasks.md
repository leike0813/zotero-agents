## 1. OpenSpec

- [x] 1.1 Add proposal, design, delta specs, and task list for title safety and item-type correction.
- [x] 1.2 Validate the change with strict OpenSpec validation.

## 2. Canonical Contract and Skill

- [x] 2.1 Add optional `metadata.itemType` to the metadata-search output contract and canonical result builder.
- [x] 2.2 Strengthen identifier-free direct-work, title, container, and item-type instructions.
- [x] 2.3 Update runner and workflow behavior versions and workflow documentation.

## 3. Apply Path

- [x] 3.1 Extend `handlers.parent.updateMetadata()` to change valid regular types before applying fields and creators in one save.
- [x] 3.2 Extend the curator apply hook to pass canonical item type and report whether it changed.

## 4. Tests and Verification

- [x] 4.1 Add focused schema, fast-path, type-conversion, and invalid-type regression coverage.
- [ ] 4.2 Run strict OpenSpec validation, focused workflow tests, full Zotero workflow tests, and build validation.
