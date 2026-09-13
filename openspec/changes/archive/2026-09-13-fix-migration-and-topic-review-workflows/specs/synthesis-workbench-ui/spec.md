## ADDED Requirements

### Requirement: Workbench review areas show only open work

The Topics graph relation review area SHALL list only still-open work: `suggested`
topic graph edges and `open` review items. The Review Center status filter SHALL
apply the same terminal semantics.

#### Scenario: Topics relation review area drops terminal entries

- **WHEN** a topic graph edge is `confirmed` or `rejected`, or a review item is
  `approved` or `rejected`
- **THEN** the Topics graph relation review area SHALL NOT list that entry.

#### Scenario: Review Center Open filter excludes terminal entries

- **WHEN** the Review Center topic graph status filter is `open`
- **THEN** confirmed or rejected edges and approved or rejected review items
  SHALL NOT appear.

#### Scenario: Review Center Accepted and All keep terminal entries

- **WHEN** the Review Center topic graph status filter is `accepted` or `all`
- **THEN** confirmed edges and approved review items SHALL remain visible.
