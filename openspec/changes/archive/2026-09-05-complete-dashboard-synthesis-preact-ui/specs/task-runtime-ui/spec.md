## ADDED Requirements

### Requirement: Dashboard refresh preserves region interaction state
Dashboard SHALL preserve unchanged log/trace row identity, input focus, product expansion and applicable scroll positions across snapshot refreshes. Closing a page SHALL stop its timers, observers and event listeners.

#### Scenario: Snapshot repeats during user interaction
- **WHEN** Dashboard receives an equivalent snapshot while the user inspects logs or a product tree
- **THEN** unchanged rows and controls retain identity and the current scroll/expansion state remains intact.

#### Scenario: Dashboard window closes
- **WHEN** Dashboard or a management child window closes
- **THEN** no page-owned delayed callback mutates its disposed DOM.
