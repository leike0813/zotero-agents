## REMOVED Requirements

### Requirement: ACP Chat SHALL reject recovery across plugin bundle identity changes

**Reason**: Bundle identity is not a reliable ACP Chat recovery prerequisite: persisted conversations can lack the field, and ACP backends own compatibility of their remote sessions.

**Migration**: Existing persisted conversations require no migration. Their recorded remote session IDs continue through the normal resume or load path.
