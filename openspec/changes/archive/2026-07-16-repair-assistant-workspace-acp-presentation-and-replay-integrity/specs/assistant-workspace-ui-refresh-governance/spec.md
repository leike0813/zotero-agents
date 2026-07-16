## MODIFIED Requirements

### Requirement: ACP surfaces use one host publication runtime

ACP Chat and ACP Skills SHALL use one shared runtime for active guards, intent
coalescing, owner reads, signatures, revisions, delivery, ACK, rebase, lifecycle,
activation, and cleanup. Sidebar and adapters SHALL NOT maintain a second
scheduler.

#### Scenario: An inactive source emits a change

- **WHEN** a producer change targets a hidden or non-selected ACP source
- **THEN** the runtime drops it before invoking any owner read-model builder.

### Requirement: Initialization is owner-first and page-first

The runtime SHALL initialize only the active source by publishing navigation and
services, a new loading selection, the indexed transcript page, and one batch
read of remaining owned regions.

#### Scenario: Chat backend refresh changes navigation

- **WHEN** refresh completes and selects or updates a session
- **THEN** the typed navigation change follows normal publication ordering
- **AND** the selected historical session does not remain permanently empty.

### Requirement: Managed regions render by their own signatures

The runtime SHALL commit toolbar, banner, plan, hint, reply, context, details,
and permission signatures only after successful rendering. Transcript, loading,
streaming, and count-only changes SHALL NOT rebuild unrelated regions.

#### Scenario: A region renderer fails

- **WHEN** a render throws before commit
- **THEN** the previous signature remains uncommitted
- **AND** the same publication content can be retried.
