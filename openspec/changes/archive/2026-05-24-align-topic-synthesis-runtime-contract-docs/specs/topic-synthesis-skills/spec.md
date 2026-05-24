## ADDED Requirements

### Requirement: Topic synthesis skills SHALL keep bundled runtime guidance aligned
The create and update topic synthesis skills MUST present the same executable stage contracts for shared runtime actions.

#### Scenario: Shared persist stages have matching contracts
- **WHEN** create/update topic synthesis `SKILL.md` files describe shared persist stages
- **THEN** they SHALL both document `paper_refs[]` for citation metrics, `payload_types_seen[]` for filtered artifact manifests, `analyses[]` for paper units, and the full cross-paper evidence-map skeleton.

#### Scenario: Reference examples are schema-valid guidance
- **WHEN** bundled reference docs provide JSON examples for paper units or cross-paper evidence maps
- **THEN** those examples SHALL use field names, enum values, and nested object shapes accepted by the package-local runtime schemas.
