## ADDED Requirements

### Requirement: Shared catalogs SHALL identify the Host Bridge plugin Skill bundle
Each shared Skill catalog SHALL record the selected Host Bridge plugin bundle aggregate digest and CLI identity when the validated bundle is present. Catalog identity SHALL continue to incorporate the selected Skill content checksums so any bundle identity or selected content change produces a distinct catalog.

#### Scenario: Plugin bundle identity changes
- **WHEN** a plugin upgrade changes the Host Bridge bundle aggregate digest or bound CLI identity
- **THEN** the shared catalog identity changes even if the catalog layout is otherwise unchanged

#### Scenario: Bundle is unavailable
- **WHEN** no validated plugin bundle is registered
- **THEN** the catalog contains no reserved Host Bridge Skill proxy and does not substitute an alternate source
