## REMOVED Requirements

### Requirement: Runtime admission SHALL be generation scoped

**Reason:** The sidecar has no independent runtime update channel; persisted
runtime generations and process identities model an unsupported product.

**Migration:** Start the one verified runtime shipped by the current XPI.

### Requirement: Automatic upgrade SHALL require exact compatibility

**Reason:** Runtime replacement occurs only when the XPI itself changes.

**Migration:** Verify and atomically materialize the current XPI bundle.

### Requirement: Upgrade recovery SHALL preserve a matching production basis

**Reason:** There is no candidate promotion or pre-activation runtime upgrade.

**Migration:** Use transactional repository migrations with a schema-change-only backup.

### Requirement: Upgrade SHALL verify backup and candidate before activation

**Reason:** Ordinary startup has no upgrade candidate or activation phase.

**Migration:** Verify the packaged bundle before launch and back up only before a registered schema migration.

### Requirement: Recovery SHALL use durable activation as its boundary

**Reason:** Activation evidence and pending promotion state are removed.

**Migration:** Process readiness is current-session health/handshake; migration recovery is owned by the repository transaction.
