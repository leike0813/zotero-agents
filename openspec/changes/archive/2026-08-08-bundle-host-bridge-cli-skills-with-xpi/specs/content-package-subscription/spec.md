## ADDED Requirements

### Requirement: Official content installation SHALL not own reserved Host Bridge Skills
The seven Host Bridge Skill IDs resolved from the surface manifest SHALL be owned exclusively by the plugin bundle. Installing, upgrading, rolling back, removing, or failing to install an official Content Package SHALL not create, replace, remove, or select those Skills.

#### Scenario: Official content root is replaced
- **WHEN** a Content Package installation transaction replaces the official content root
- **THEN** the plugin-owned Host Bridge Skill root and its selected registry entries remain unchanged

#### Scenario: Content Package is absent
- **WHEN** no official Content Package has been installed
- **THEN** the validated plugin-bundled Host Bridge Skills remain available to plugin consumers

