## MODIFIED Requirements

### Requirement: Windows ACP bridge startup SHALL be bounded and cancellation-aware

Windows WebSocket bridge transport startup SHALL observe the adapter startup cancellation signal while waiting for socket connection and the bridge `spawned` acknowledgment. The transport phase SHALL fail after 60 seconds and close its socket. A late acknowledgment or child result SHALL not restore ownership.

#### Scenario: Socket opens without spawned acknowledgment

- **WHEN** the bridge socket opens but no `spawned` acknowledgment arrives
- **AND** startup is canceled or reaches 60 seconds
- **THEN** the socket SHALL close
- **AND** transport creation SHALL settle as canceled or timed out with structured phase diagnostics.

#### Scenario: Two bridge launches overlap

- **WHEN** one pending launch is canceled while another launch is starting
- **THEN** only the canceled launch's socket and waiter SHALL be closed
- **AND** the other launch SHALL be able to receive its own acknowledgment and complete.
