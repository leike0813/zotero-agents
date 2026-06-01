## 1. Matcher Policy

- [x] 1.1 Adjust matcher result status/confidence for low-confidence title tiers.
- [x] 1.2 Adjust Registry reference resolution storage for suggested output.
- [x] 1.3 Adjust Citation Graph edge materialization to reject suggestion-only matches.

## 2. Verification

- [x] 2.1 Add matcher tests for suggested title tiers and danger pairs.
- [x] 2.2 Add graph materialization tests proving suggestions do not create matched edges.
- [x] 2.3 Run focused tests and `openspec validate harden-synthesis-reference-resolution-policy --strict`.
