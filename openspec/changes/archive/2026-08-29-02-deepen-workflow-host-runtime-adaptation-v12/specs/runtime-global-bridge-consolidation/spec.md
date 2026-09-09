## ADDED Requirements

### Requirement: Runtime candidate resolution SHALL be feature-detected and invocation-late
Runtime globals, Zotero/addon/toolkit objects, and general Window candidates SHALL be resolved from current capability shape on every call. Version strings MUST NOT select an implementation and cached projections MUST NOT retain resolved runtime objects.

#### Scenario: Hidden window closes between calls
- **WHEN** a previously preferred Window is closed before the next operation
- **THEN** the next call ignores it and resolves a current live candidate

#### Scenario: Runtime version label disagrees with capabilities
- **WHEN** the reported Zotero version differs from the available adapter shape
- **THEN** dispatch follows feature detection rather than the version label

### Requirement: Runtime bridge and picker SHALL have one-way ownership
The runtime bridge SHALL own generic runtime and Window candidate knowledge. The picker SHALL consume current candidates and own picker-compatible parent policy, native/toolkit adapters, filters, and selection normalization. The runtime bridge MUST NOT depend on picker behavior.

#### Scenario: Picker selects a parent
- **WHEN** a picker operation begins with several runtime Window candidates
- **THEN** the picker applies its parent policy to the bridge result without caching the selected Window for later calls
