## MODIFIED Requirements

### Requirement: Workflow hooks can register products

The system SHALL inject a product storage API into workflow `applyResult` hooks that can persist result artifacts, inline text, and host-local text or binary files.

#### Scenario: Hook registers a binary local asset

- **WHEN** a hook registers a PDF or image from a readable host-local file
- **THEN** product storage SHALL copy the original bytes into managed storage
- **AND** SHALL record the byte size and SHA-256
- **AND** SHALL NOT decode and rewrite the asset as text.

#### Scenario: Hook registers a binary bundle asset

- **WHEN** a hook registers a binary result-bundle entry
- **THEN** the managed copy SHALL be byte-identical to that entry.

#### Scenario: Existing result artifact input is used

- **WHEN** an existing hook supplies `rawPath` and `fallbackPath`
- **THEN** product storage SHALL normalize it to the result-artifact source without changing existing text behavior.

### Requirement: Workflow product registration can be atomic

Product storage SHALL support opt-in atomic multi-asset registration.

#### Scenario: Atomic registration succeeds

- **WHEN** every declared asset is materialized successfully
- **THEN** the managed directory and product row SHALL become visible as one completed product.

#### Scenario: Atomic registration fails

- **WHEN** any required asset cannot be materialized or two assets target the same product path
- **THEN** no product row or final managed directory SHALL remain
- **AND** temporary staging assets SHALL be cleaned up.

### Requirement: Dashboard exposes product storage

The Dashboard SHALL distinguish previewable text from binary product assets.

#### Scenario: Binary product asset is selected

- **WHEN** a PDF, image, or other binary asset is selected
- **THEN** the Dashboard SHALL report it as non-text-previewable without corrupting or deleting the managed file.
