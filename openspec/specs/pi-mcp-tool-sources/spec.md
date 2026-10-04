# pi-mcp-tool-sources Specification

## Purpose

MCP Tool Sources let the Built-in Pi Agent Runtime use explicitly configured remote or local tools through one reviewed, bounded, policy-mediated outbound path.

## Requirements

### Requirement: MCP sources are explicit profile configuration

The system SHALL store one profile-scoped registry of source transport, address or executable, ordered arguments, optional working directory, opaque header/environment credential bindings and authentication field identity. Guided forms and whole-document JSON SHALL operate on this registry. Explicit import SHALL preview and merge sources, default same-name conflicts to keeping existing entries, move accepted literal secrets into the existing credential store and export only secret-free rebinding slots. Saving SHALL NOT connect, test or require tool review; enabled saved sources SHALL be eligible for later runtime discovery.

#### Scenario: Import and export
- **WHEN** a user previews and accepts configuration containing literal header or environment secrets
- **THEN** the registry contains opaque references and export contains only credential slots requiring rebinding

#### Scenario: New source
- **WHEN** an enabled source is saved without a connection test
- **THEN** no connection is made during save and a subsequent turn can discover and validate its tools without manual selection, review or promotion

#### Scenario: Import has a name conflict
- **WHEN** a source already exists under an imported identity
- **THEN** existing configuration is kept by default, explicit replacement is available and omitted existing sources are retained

### Requirement: Source transport and credentials are admitted at every boundary

The system SHALL require HTTPS for public non-loopback HTTP sources. Private/LAN cleartext HTTP SHALL require source-and-origin-bound local-network approval and SHALL carry no credential. Loopback HTTP MAY carry credentials with that approval. Approval SHALL admit scoped discovery; tool calls SHALL also require Gateway local-network effect authorization. Cross-origin redirects SHALL fail. Stdio SHALL launch an explicit executable and ordered argv with a minimal environment and explicit credential slots through the long-lived process bridge. Empty working directory SHALL use the managed runtime directory. OAuth challenges SHALL fail as `oauth_not_supported`.

#### Scenario: Private cleartext endpoint with credential
- **WHEN** a source attempts to save, test, import or execute an HTTP private/LAN endpoint with a credential binding
- **THEN** admission fails before sending the credential

#### Scenario: OAuth challenge
- **WHEN** a remote source requests OAuth authorization
- **THEN** no browser opens and the user receives only `oauth_not_supported`

#### Scenario: Source changes its private-network origin
- **WHEN** an edit or import changes the approved target
- **THEN** the old approval does not authorize discovery or tool dispatch to the new target

### Requirement: Tool discovery and review are turn-frozen

The system SHALL lazily discover bounded protocol-valid tool pages from enabled configured sources and automatically validate descriptors/schema/names for admission. No user selection, descriptor review or promotion SHALL be required. A turn SHALL retain frozen descriptors, schemas, conservative effects and identity; list changes SHALL affect future turns, with new/changed descriptors validated and removed tools absent. Remote tools SHALL require external-egress and external-mutation, and stdio tools code-execution and host-control. Remote annotations SHALL NOT lower effects.

#### Scenario: Descriptor changes mid-turn
- **WHEN** a server changes a tool descriptor after the turn freezes
- **THEN** the active turn retains its original binding and later turns use the new validated descriptor without a user-review step

#### Scenario: Invalid discovered tool
- **WHEN** a returned descriptor or schema cannot be admitted
- **THEN** it cannot be called, no fake review record is created and unrelated valid tool/source facts retain their ordinary admission

### Requirement: MCP calls use Gateway admission and bounded results

The system SHALL expose one fixed `mcp` search/describe/call proxy over the automatically admitted frozen catalog without user-promoted direct tools. Every call SHALL pass Gateway admission, durable started evidence, scheduling and receipt. A dispatched call SHALL NOT retry automatically; connection loss or timeout after dispatch SHALL report unknown outcome. MCP results SHALL be validated once and projected to bounded text, supported image, strict-JSON structured content and metadata-only resource links. Unsupported content without model-usable content SHALL fail with `unsupported_result_content`; `isError` SHALL be a typed tool failure. Raw remote content, binary bodies, credentials and response headers SHALL NOT become transcript or audit facts.

#### Scenario: Call outcome is unknown
- **WHEN** a connection fails after `tools/call` dispatch without an authoritative result
- **THEN** the Gateway reports an unknown effect and does not replay the call

#### Scenario: Unsupported result
- **WHEN** a server returns only unsupported binary content
- **THEN** the call fails with `unsupported_result_content` and preserves only bounded metadata

### Requirement: Curated Search uses the shared network boundary

HTTP MCP SHALL use the shared Web URL/DNS/peer/credential policy. Aggregate search SHALL preselect only project-curated web_search_exa, tavily-search and brave_web_search descriptors. Brave stdio SHALL require explicit credential and code-execution approval with an exact installed package name/version. Other configured MCP tools SHALL remain available only through the ordinary MCP proxy, not automatically enter aggregate search.

The curated connection SHALL automatically discover and validate the supported descriptor and project-owned argument mapping, and freeze name, description and schema identity for the turn. Dispatch SHALL require that validated frozen identity; mismatch or unsupported mapping SHALL stop with `source_descriptor_changed` without a user approval gate. An explicit source test SHALL execute only that configured source and return safe evidence, not a digest awaiting user review. Brave SHALL check its installed manifest before launching the configured entry.

#### Scenario: Hosted descriptor changes
- **WHEN** the actual descriptor differs from the validated turn-frozen identity
- **THEN** no search dispatch occurs and the chain stops with `source_descriptor_changed`

#### Scenario: Arbitrary MCP search is configured
- **WHEN** a user configures another tool named search
- **THEN** it does not enter the aggregate Web Search chain

#### Scenario: A new turn sees an updated compatible descriptor
- **WHEN** discovery validates its supported name, schema and argument mapping for a later turn
- **THEN** that turn can freeze it without asking the user to approve its digest

### Requirement: MCP authentication binds typed input to one exact field

HTTP authentication SHALL support none, Bearer token and API key field/name guidance plus supported custom header entries. Bearer SHALL be formed once from its token. Credential replacement/clearing SHALL affect only explicitly selected bindings. Empty edits SHALL retain same-field bindings; different fields SHALL NOT reuse them. Ordered arguments and environment/header entries SHALL reject ambiguous duplicates without silent overwrites. Secret values SHALL never be exported or projected.

#### Scenario: API-key field changes with an empty value
- **WHEN** a user changes the authentication field name without entering its required new secret
- **THEN** the previous field's secret is not silently rebound and incomplete input does not replace valid saved configuration

#### Scenario: A name or parameter is edited
- **WHEN** source naming or argv changes without a secret replacement
- **THEN** untouched credential bindings remain, while affected configuration-specific test evidence becomes inapplicable

### Requirement: MCP configuration adoption is atomic across bindings

Forms, full-document JSON and merge import SHALL validate one proposed change set before adoption. Source changes, credential writes/cleanup and permission invalidation SHALL commit consistently or retain all previous authoritative state. Full-document removal SHALL have explicit impact preview; import omission SHALL not remove sources. Failure SHALL preserve editable input and SHALL not publish partial success. Runtime tools for active turns SHALL retain their frozen catalog.

#### Scenario: Credential persistence succeeds but configuration write fails
- **WHEN** adoption cannot commit all proposed source and binding changes
- **THEN** old configuration and credential bindings remain authoritative, no partial adopted state is published and the draft remains available for correction or retry

#### Scenario: User cancels document impact confirmation
- **WHEN** the user cancels a JSON replacement/removal preview
- **THEN** neither registry nor credentials nor permissions change
