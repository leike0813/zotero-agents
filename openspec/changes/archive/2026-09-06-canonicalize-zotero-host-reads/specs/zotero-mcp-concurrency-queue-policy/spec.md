## REMOVED Requirements

### Requirement: Streamable HTTP tool calls are serialized
**Reason**: Host serialization belongs to shared Broker native slices; tool transport uses independent inflight admission.
**Migration**: Use the inflight admission and diagnostic contract below; no pending queue or queue wait continuation remains.

### Requirement: Queue capacity failures are structured
**Reason**: Host serialization belongs to shared Broker native slices; tool transport uses independent inflight admission.
**Migration**: Use the inflight admission and diagnostic contract below; no pending queue or queue wait continuation remains.

### Requirement: Queue diagnostics are exported
**Reason**: Host serialization belongs to shared Broker native slices; tool transport uses independent inflight admission.
**Migration**: Use the inflight admission and diagnostic contract below; no pending queue or queue wait continuation remains.

### Requirement: Running timeout preserves host-call serialization
**Reason**: Host serialization belongs to shared Broker native slices; tool transport uses independent inflight admission.
**Migration**: Use the inflight admission and diagnostic contract below; no pending queue or queue wait continuation remains.

## ADDED Requirements

### Requirement: MCP tool requests SHALL have bounded concurrent admission
MCP SHALL admit up to nine inflight tools/call requests concurrently without a whole-tool FIFO. A tenth request SHALL receive JSON-RPC -32001 with error.data.code zotero_mcp_inflight_limit before its handler executes. Initialize, tools/list, notifications and the status tool SHALL bypass tool admission.

#### Scenario: Network waits overlap
- **WHEN** multiple admitted tools wait on work outside native Host slices
- **THEN** those tools can progress concurrently while the Broker serializes their native slices.

#### Scenario: Admission is full
- **WHEN** nine tool handlers have not settled
- **THEN** the next ordinary tool request is immediately rejected with the structured admission error.

### Requirement: MCP inflight diagnostics SHALL reflect underlying execution
Status and logs SHALL describe inflight limit, count, count at acceptance, execution duration, tool outcome and limit reason. They SHALL NOT report fictitious pending positions, queue wait times or queue timeout policy. A timed-out handler SHALL remain counted until it settles.

#### Scenario: Timeout precedes handler settle
- **WHEN** a caller has received timeout but its handler is still running
- **THEN** the admission remains occupied and diagnostics distinguish that state from a settled call.
