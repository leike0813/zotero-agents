## ADDED Requirements

### Requirement: Supervised shutdown SHALL retire transfer sessions
Authenticated shutdown, host lease expiry, stdin EOF, and process signals SHALL first stop transfer admission and retire every addressable transfer session before service exit.

#### Scenario: Shutdown occurs with staged pages
- **WHEN** any supervised stop path begins while transfer sessions exist
- **THEN** new actions receive `transfer_stopping`, sessions become unaddressable within the 500ms transfer shutdown budget, and filesystem deletion continues best-effort or on next startup

#### Scenario: Supervisor terminates the process directly
- **WHEN** the supervisor escalates to direct Node process termination
- **THEN** no transfer worker or child process can remain because staging is owned only by the service process and no subprocess is created
