# pi-mcp-tool-sources Specification

## Purpose

MCP Tool Sources let the Built-in Pi Agent Runtime use explicitly configured remote or local tools through one reviewed, bounded, policy-mediated outbound path.

## Requirements

### Requirement: MCP sources are explicit profile configuration

The system SHALL store one profile-scoped source registry with source transport, address or executable and arguments, opaque credential references, tool selection, promotions, and descriptor-bound review. It SHALL offer explicit `.mcp.json` preview/import and secret-free rebinding-template export. Import SHALL move accepted literal secrets into the Built-in Agent Credential Store. Saving a source SHALL NOT connect or expose tools.

#### Scenario: Import and export
- **WHEN** a user previews and accepts a configuration containing literal header or environment secrets
- **THEN** the registry contains opaque references and the export contains only credential slots requiring rebinding

#### Scenario: New source
- **WHEN** a source is saved without a connection test
- **THEN** it remains unverified and exposes no tools

### Requirement: Source transport and credentials are admitted at every boundary

The system SHALL require HTTPS for public non-loopback HTTP sources. Private/LAN cleartext HTTP SHALL require source-and-origin-bound local-network approval and SHALL carry no credential. Loopback HTTP MAY carry credentials with that approval. The approval authorizes user-initiated discovery; selected tool calls also require the Gateway's `local-network` effect authorization. Cross-origin redirects SHALL fail. Stdio SHALL launch an explicit executable and argv with a minimal environment and explicit credential slots through the long-lived process bridge. OAuth challenges SHALL fail as `oauth_not_supported`.

#### Scenario: Private cleartext endpoint with credential
- **WHEN** a source attempts to save, test, import, or execute an HTTP private/LAN endpoint with a credential binding
- **THEN** admission fails before sending the credential

#### Scenario: OAuth challenge
- **WHEN** a remote source requests OAuth authorization
- **THEN** no browser opens and the user receives only `oauth_not_supported`

### Requirement: Tool discovery and review are turn-frozen

The system SHALL lazily discover bounded protocol-valid tool pages. Only selected, reviewed tools SHALL enter the active callable catalog. A turn SHALL retain its frozen descriptors, schemas, effects and identity; `tools/listChanged` SHALL affect only future turns. New tools remain unselected, removed tools disappear, and changed selected descriptors require renewed review. A selected remote tool without an explicit effect assessment SHALL require `external-egress` and `external-mutation`; a selected stdio tool SHALL require `code-execution` and `host-control`. Remote annotations SHALL NOT lower effects.

#### Scenario: Descriptor changes mid-turn
- **WHEN** a server changes a selected tool descriptor after the turn freezes
- **THEN** the active turn retains its original binding and later turns exclude that tool until review

### Requirement: MCP calls use Gateway admission and bounded results

The system SHALL expose one fixed `mcp` search/describe/call proxy over the frozen hidden catalog and user-promoted namespaced direct tools. Every call SHALL pass Gateway admission, durable started evidence, scheduling and receipt. A dispatched call SHALL NOT retry automatically; connection loss or timeout after dispatch SHALL report unknown outcome. MCP results SHALL be validated once and projected to bounded text, supported image, strict-JSON structured content and metadata-only resource links. Unsupported content without model-usable content SHALL fail with `unsupported_result_content`; `isError` SHALL be a typed tool failure. Raw remote content, binary bodies, credentials and response headers SHALL NOT become transcript or audit facts.

#### Scenario: Call outcome is unknown
- **WHEN** a connection fails after `tools/call` dispatch without an authoritative result
- **THEN** the Gateway reports an unknown effect and does not replay the call

#### Scenario: Unsupported result
- **WHEN** a server returns only unsupported binary content
- **THEN** the call fails with `unsupported_result_content` and preserves only bounded metadata
