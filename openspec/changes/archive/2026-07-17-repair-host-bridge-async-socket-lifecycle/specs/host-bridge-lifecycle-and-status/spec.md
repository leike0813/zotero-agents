## ADDED Requirements

### Requirement: Accepted connection initialization is exception safe
The unified Host Access listener SHALL own every resource opened for an accepted transport from the start of initialization. Any synchronous initialization failure SHALL close all resources already acquired, SHALL NOT escape the listener callback, and SHALL NOT poison the listener.

#### Scenario: Initialization fails after one stream opens
- **WHEN** accepted-connection initialization fails after an input or output stream has opened
- **THEN** the opened stream and transport SHALL be released exactly once
- **AND** a later connection on the same listener SHALL still be served.

### Requirement: Successful response completion is distinct from abort cleanup
After a complete response has been handed to the output stream and that stream closes successfully, the listener SHALL release its connection registry ownership without immediately abort-closing the transport. Shutdown, stale generation, initialization failure, and response-write failure SHALL instead cancel and close the accepted connection exactly once.

#### Scenario: Response is written successfully
- **WHEN** a handler produces a complete response and output close succeeds
- **THEN** the client SHALL be able to receive the complete response
- **AND** the connection SHALL no longer remain in the accepted-connection registry.

#### Scenario: Shutdown interrupts a pending request
- **WHEN** listener shutdown occurs before response completion
- **THEN** the reader, output stream, and transport SHALL be canceled or closed exactly once
- **AND** no response SHALL be written after shutdown.
