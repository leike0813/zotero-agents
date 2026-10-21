## ADDED Requirements

### Requirement: Long timelines SHALL remain contained within Topic Details

Hosted and standalone Topic Details SHALL keep section content within the available Reader width regardless of timeline span. The body SHALL scroll vertically in its content region and a wide timeline SHALL scroll horizontally in its own region.

#### Scenario: A multi-decade timeline is opened
- **WHEN** a Topic spans several decades in a wide or narrow viewport
- **THEN** its selected section body remains visible inside the Reader
- **AND** the timeline can scroll horizontally without widening the section layout

#### Scenario: Reader sections are switched
- **WHEN** the user switches sections with a wide timeline present
- **THEN** the selected content remains visible in hosted and standalone Readers
