## ADDED Requirements

### Requirement: Stored attachment inputs SHALL be fully staged before Host mutation
Stored attachment source and companion paths SHALL be normalized, validated for safe relative placement, proven readable, and copied into managed staging before a Zotero attachment is created. Linked-file inputs SHALL validate their declared locality without being copied into managed storage.

#### Scenario: Companion path escapes its source root
- **WHEN** a companion path is absolute, traverses outside the allowed root, collides after normalization, or cannot be read
- **THEN** the request fails before creating a Zotero attachment

### Requirement: Post-create attachment failure SHALL preserve the primary error
After attachment creation, failure to install staged files, update placement, verify final state, or clean staging SHALL trigger best-effort removal of the new attachment. Cleanup failures SHALL be secondary evidence and MUST NOT replace the original failure.

#### Scenario: File installation and rollback both fail
- **WHEN** the staged file cannot be installed and the new attachment cannot be removed
- **THEN** the mutation returns `repair_required`, preserves installation failure as primary, and reports bounded residual attachment evidence
