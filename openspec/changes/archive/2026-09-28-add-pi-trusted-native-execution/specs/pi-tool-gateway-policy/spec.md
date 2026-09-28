# Spec Delta

## MODIFIED Requirements

### Requirement: Batch admission precedes effects and preserves result order

The Gateway SHALL inspect a complete assistant tool-call batch before starting any executor. Trusted classification MAY complete asynchronously and SHALL settle before policy, permission, resource scheduling, or executor start. Structural failures SHALL prevent the whole batch from starting; independent per-call rejections SHALL NOT suppress eligible calls. Conflicting canonical resource claims SHALL be serialized, while independent eligible calls MAY run concurrently within the supplied resource limits. Deferred interaction tools SHALL follow ordinary eligible tools, and an exclusive tool SHALL not share a batch. Results SHALL return in original call order despite completion order.

#### Scenario: Duplicate identity appears in a batch
- **WHEN** two calls share a tool-call identity
- **THEN** no executor in that batch starts

#### Scenario: Two calls target one resource
- **WHEN** two eligible calls claim the same canonical write resource
- **THEN** their executions do not overlap and their results retain assistant order

#### Scenario: Permission wait and eligible work coexist
- **WHEN** a batch contains eligible and permission-required calls
- **THEN** eligible work settles before the owner receives durable pending-permission handoff

#### Scenario: Asynchronous classification rejects a path
- **WHEN** a tool classifier asynchronously finds that a path has no safe canonical identity
- **THEN** no policy grant or executor starts for that call
