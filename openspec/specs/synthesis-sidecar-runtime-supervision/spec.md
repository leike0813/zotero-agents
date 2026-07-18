## ADDED Requirements

### Requirement: Shutdown drains graph compute before closing SQLite
Controlled shutdown SHALL stop graph mutation admission, cancel and await active graph compute, and close the isolated repository only after the application has drained.

#### Scenario: Active rebuild cannot promote into a closed repository
- **WHEN** shutdown begins during graph worker execution
- **THEN** the computation is canceled and settled before SQLite closes, and restart observes only last-good state
