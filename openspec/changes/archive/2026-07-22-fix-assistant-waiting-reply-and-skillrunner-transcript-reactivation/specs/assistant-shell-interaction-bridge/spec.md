## ADDED Requirements

### Requirement: Managed reply controls MUST dispatch the current interaction action
The shared managed reply region MUST keep its textarea and action button stable across equivalent publications while updating the live action state used by its listener. An interaction token or action-payload update MUST NOT require reply-region reconstruction, and dispatch MUST retain existing current-token validation.

#### Scenario: Interaction token advances on a stable reply mount
- **WHEN** the same reply DOM receives interaction token N and then token N+1 without a structural reply-state change
- **THEN** the textarea, reply button, and unrelated managed regions retain DOM identity
- **AND** a subsequent reply dispatch contains token N+1 and the current typed response
- **AND** token N is not dispatched.
