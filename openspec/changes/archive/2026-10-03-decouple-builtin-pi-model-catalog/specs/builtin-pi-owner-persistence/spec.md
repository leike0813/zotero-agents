## ADDED Requirements

### Requirement: Canonical invocation evidence is independent of current directory data
The canonical owner SHALL persist safe frozen selection evidence and invocation-purpose usage/estimate facts without a second history store. Projections SHALL deduplicate invocation identity and preserve aggregate incompleteness. Removing cache or changing prices SHALL NOT alter historical meaning. Legacy absent facts SHALL remain unknown without current-data backfill.

#### Scenario: Rebuild follows cache deletion
- **WHEN** owner projections are rebuilt after the directory cache is removed
- **THEN** the historical model facts and recorded estimates remain interpretable and unchanged

#### Scenario: An invocation has unknown pricing
- **WHEN** one contribution lacks applicable rates or complete usage
- **THEN** its estimate and the aggregate completeness remain unknown rather than displaying a complete free total
