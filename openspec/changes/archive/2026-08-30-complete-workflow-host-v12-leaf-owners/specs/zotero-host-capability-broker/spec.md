## MODIFIED Requirements

### Requirement: Workflow Host API SHALL Expose Note Image Preparation

The prepared-image owner SHALL accept only the declared file, managed-resource, and base64 portable source variants and SHALL return an opaque workflow-run-scoped prepared-image ref plus bounded JPEG or PNG metadata. It MUST own conversion, registry admission, ref validation, and terminal cleanup without writing the Zotero library or exposing paths, blobs, buffers, or streams.

#### Scenario: Host API exposes image preparation
- **WHEN** a workflow run supplies a valid bounded image source and options
- **THEN** preparation returns an opaque ref, MIME type, dimensions, byte count, and SHA-256 digest
- **AND** the ref resolves only inside the same workflow run

#### Scenario: Prepared-image ref is forged or expired
- **WHEN** a caller supplies a foreign-run or forged ref, or uses a ref after its run terminates
- **THEN** the owner fails with stable `invalid_ref` or `not_found` data identifying only the `prepared_image` target kind
- **AND** no path or prepared bytes are exposed

### Requirement: Workflow note-image preparation remains behavior compatible

Moving note-image preparation behind its owned module SHALL retain the established resize, encoding, quality-candidate, MIME verification, and hard-cap policy as internal conversion behavior while adding portable sources, opaque managed results, per-run accounting, and automatic cleanup. The active v11 adapter MAY continue normalizing its legacy path, Blob, and byte inputs until atomic v12 activation, but those forms MUST NOT enter the new owner contract.

#### Scenario: Workflow prepares a note image
- **WHEN** an active v11 caller supplies a supported legacy source before v12 activation
- **THEN** the adapter normalizes it through the owned conversion path and preserves its existing caller-observable result
- **AND** the owner itself remains portable and does not accept a native Blob or typed array

### Requirement: Broker SHALL own native bibliography rendering semantics

The Broker SHALL provide one bibliography deep-module owner for format availability and native Zotero export rendering. Workflow composition and Research Bundle generation MUST project or consume that owner explicitly and MUST NOT copy translator selection, fallback, option validation, or native error normalization.

#### Scenario: Another Broker capability is added
- **WHEN** the Broker gains a capability unrelated to bibliography
- **THEN** the bibliography surface remains unchanged until explicitly projected
- **AND** no whole-Broker alias or inferred registry widens Workflow Host

#### Scenario: Research Bundle needs a bibliography artifact
- **WHEN** Research Bundle generation requests bibliography content
- **THEN** it consumes the bibliography owner result
- **AND** it retains ownership only of artifact naming and bundle layout
