## MODIFIED Requirements

### Requirement: Native loopback HTTP admission SHALL be bounded

The native sidecar SHALL admit at most sixteen active HTTP connections. When
all slots are occupied, the listener SHALL leave later loopback connections in
the operating-system listen backlog until capacity becomes available instead
of accepting and immediately rejecting them. It SHALL NOT create an
application-owned wait queue or an additional handler thread. Every terminal
handler path, including panic and transport failure, MUST release its slot.

#### Scenario: Partial connections saturate admission

- **WHEN** sixteen clients hold incomplete loopback requests open
- **AND** another client establishes a request while those slots remain occupied
- **THEN** at most sixteen connections own handler capacity
- **AND** the additional connection is not accepted into a handler until capacity becomes available
- **AND** it is not immediately rejected with `service_unavailable` solely because all handler slots were occupied

#### Scenario: Capacity is released

- **WHEN** an admitted connection completes, fails, times out, or is interrupted
- **THEN** its slot becomes available to the next queued loopback connection
- **AND** the listener remains ready unless lifecycle shutdown has begun

