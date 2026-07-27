## MODIFIED Requirements

### Requirement: Native runtime manifest v3 SHALL have one strict identity

Every installable Synthesis runtime MUST use
`synthesis-sidecar-runtime-bundle.v3`, identify `rust-native`, one supported
logical target and target triple, one executable, service/protocol identity,
build and source fingerprints, toolchain and lock provenance, canonical
capabilities, creation/expiry policy, and a complete sorted file inventory.
It SHALL not contain a platform-code-signature field.

#### Scenario: An obsolete or ambiguous manifest is supplied
- **WHEN** a manifest uses v1 or v2, contains a Node version, upstream Node
  archive, JavaScript entrypoint, platform-signature field, unknown field,
  unsafe path, duplicate file, unsupported target, mismatched triple, or
  incomplete identity
- **THEN** the complete manifest SHALL be rejected before any declared file is
  read, written, or executed
