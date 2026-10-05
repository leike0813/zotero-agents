# synthesis-lexical-search-kernel Specification

## Purpose

Defines one reusable Rust lexical kernel for Library item, Topic, and evidence search, with bounded Unicode-safe matching and deterministic ordering inside the Synthesis runtime.

## Requirements

### Requirement: Lexical matching SHALL normalize multilingual text consistently
The lexical kernel SHALL apply deterministic Unicode normalization and case normalization, and SHALL tokenize or match phrase units using boundaries suitable for the scripts present in the text.

#### Scenario: Text differs only by Unicode form or case
- **WHEN** a query and source contain canonically equivalent text or case variants
- **THEN** the kernel compares them under the same normalized matching rules

#### Scenario: Text uses scripts without whitespace word boundaries
- **WHEN** a query or source uses a script whose words are not reliably separated by spaces
- **THEN** matching uses script-aware lexical units and does not require ASCII or whitespace-only token boundaries

### Requirement: Lexical matching SHALL preserve original source locations
Normalization and matching preparation SHALL retain a mapping to the original source so returned ranges identify complete Unicode characters in the original text.

#### Scenario: A normalized match maps to source text
- **WHEN** normalization changes the representation or code-unit length of matched text
- **THEN** the reported source range still selects the corresponding original text without splitting a surrogate pair

### Requirement: Lexical ordering SHALL use explicit non-frequency keys
The kernel SHALL rank by query-unit coverage, phrase match, declared field priority, and stable identity, and SHALL NOT use BM25 or term frequency.

#### Scenario: Search candidates are ranked
- **WHEN** candidates match different query units, phrases, fields, or identities
- **THEN** ordering follows the declared keys in that order and is deterministic for every application that calls the shared Rust kernel

### Requirement: Lexical execution SHALL remain request-bounded
The kernel SHALL process only the bounded candidates and text admitted by its caller, SHALL NOT maintain a persistent lexical index, and SHALL expose whether its caller completed or exhausted a work bound.

#### Scenario: Caller exhausts a source-work bound
- **WHEN** the caller reaches its declared candidate or source-byte bound before completing the scope
- **THEN** it reports limited coverage rather than presenting partial matches as complete

#### Scenario: Independent searches are issued
- **WHEN** the same search is issued again after source content changes
- **THEN** the kernel searches the current supplied source facts without relying on persistent lexical state
