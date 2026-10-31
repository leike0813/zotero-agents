# Spec Delta

## ADDED Requirements

### Requirement: Hybrid search SHALL preserve tied lexical contributions

The three existing text searches SHALL enhance available lexical results using equal-weight reciprocal-rank fusion with k=60. Equal lexical relevance SHALL have equal contribution; stable identity SHALL resolve only final ties. Literature fragments SHALL aggregate before fusion. Public results SHALL report actual lexical, vector or hybrid execution and expose no score.

#### Scenario: Semantic enhancement succeeds

- **WHEN** a compatible published index and query vector are available
- **THEN** scoped semantic matches participate in deterministic fusion and method reflects the executed methods

#### Scenario: Enhancement fails

- **WHEN** enhancement is disabled, paused, incompatible or fails within its shared deadline
- **THEN** an executable lexical method continues with the full original query and truthful method and issues

### Requirement: Continuations SHALL bind retrieval publication

An enhanced search round SHALL freeze its actual method and retrieval publication basis together with existing source/filter/result basis. Continuation SHALL fail if any bound basis changes and SHALL not switch methods or reissue embedding work.

#### Scenario: Index is replaced between pages

- **WHEN** a continuation refers to a different retrieval publication than the current index
- **THEN** it fails through the established stale-basis contract
