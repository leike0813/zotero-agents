## ADDED Requirements

### Requirement: Tag vocabulary workflows use Synthesis storage seams

Builtin tag vocabulary execution SHALL use Synthesis service APIs as the storage
boundary.

#### Scenario: Tag-regulator needs controlled tags

- **WHEN** tag-regulator builds a request
- **THEN** it SHALL read controlled tags through `hostApi.synthesis`
- **AND** it SHALL NOT read tag-manager prefs.

#### Scenario: Tag-regulator handles suggestions

- **WHEN** tag-regulator applies accepted or staged suggestions
- **THEN** it SHALL call Synthesis tag vocabulary APIs
- **AND** it SHALL NOT branch on tag-manager local/subscription mode.
