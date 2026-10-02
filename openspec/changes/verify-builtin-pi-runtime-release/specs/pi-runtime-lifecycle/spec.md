## MODIFIED Requirements

### Requirement: Process admission reserves foreground capacity

The process SHALL admit at most twelve active turns with at most ten background turns, preserve fair FIFO progress within each lane and reserve two slots for foreground work. Conversation and Interactive Skill Run turns SHALL use foreground admission. Auto Skill Run turns, including explicit continuations under their fixed admission mode, and safe startup Skill Run continuations SHALL use background admission. Controls SHALL remain responsive outside ordinary admission. Physical occupancy SHALL remain counted until real settlement evidence.

#### Scenario: Background capacity is full

- **WHEN** ten background turns are active
- **THEN** two foreground turns can enter and additional background work waits

#### Scenario: Auto work waits without consuming foreground reserve

- **WHEN** background capacity is full and a new Auto Skill Run is submitted
- **THEN** it waits for background capacity, a Conversation or Interactive Skill Run can use the foreground reserve, and the queued Auto proceeds after physical capacity settles

#### Scenario: Interactive continuation after startup recovery

- **WHEN** a safe startup Interactive Skill Run continuation has paused and the user explicitly continues it while background capacity is full
- **THEN** the new turn uses foreground admission under its fixed Interactive mode; the prior startup continuation does not change later lane selection
