## ADDED Requirements

### Requirement: Inline ACP auto-approval provider option
The Zotero Bridge CLI SHALL continue to pass the JSON supplied by `workflow submit --provider-profile` to Host Bridge, including `providerOptions.autoApproveAcpPermissions`. The CLI SHALL NOT add a separate approval command or a persisted provider-profile management surface for this option.

#### Scenario: CLI submits an ACP auto-approval profile

- **WHEN** an external agent invokes `workflow submit` with a provider-profile JSON containing `autoApproveAcpPermissions: true`
- **THEN** the request body preserves that boolean at `providerProfile.providerOptions`
