## ADDED Requirements

### Requirement: Tag Vocabulary cross-language semantics SHALL be explicit
Tag ordering SHALL use a lowercased UTF-16 comparison key with the original UTF-16 value as a total-order tie break, and dynamic `tagPattern` validation/matching SHALL preserve flagless ECMAScript regular-expression behavior in TypeScript and Rust.

#### Scenario: Unicode vocabulary is rebuilt in both languages
- **WHEN** tags, aliases, abbreviations, notes, facets, or patterns contain reviewed Unicode and case boundaries
- **THEN** TypeScript and Rust SHALL produce the same strict request, warning order, index projection, canonical bytes, and hash.

#### Scenario: Pathological pattern exceeds the deadline
- **WHEN** a valid ECMAScript pattern does not complete within the worker deadline
- **THEN** the pool SHALL kill and replace the Rust child and classify the task through the existing timeout/fuse behavior.

