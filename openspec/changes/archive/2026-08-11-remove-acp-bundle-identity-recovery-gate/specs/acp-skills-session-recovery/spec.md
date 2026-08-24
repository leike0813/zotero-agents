## REMOVED Requirements

### Requirement: ACP Skills SHALL bind recoverable runs to the plugin Skill bundle identity

**Reason**: A local bundle-version gate must not override ACP backend recovery compatibility and can turn a valid recoverable run into an artificial failure.

**Migration**: Existing run records require no migration. Recovery ignores any legacy bundle identity metadata and follows the established reconstruction flow.
