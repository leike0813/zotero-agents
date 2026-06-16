## ADDED Requirements

### Requirement: Skill feedback product kind
Workflow product storage SHALL support a dedicated product kind `skill_run_feedback` for collected skill run feedback.

#### Scenario: Feedback is collected
- **WHEN** `_skill_run_feedback.md` is collected after successful apply
- **THEN** storage registers a product with `kind: "skill_run_feedback"`
- **AND** the original Markdown is stored as the only feedback asset without body rewriting
- **AND** host audit metadata records workflow, backend, skill, request, run, job, source path, collection time, content hash, and apply success status

### Requirement: Skill feedback dashboard
The Dashboard Products UI SHALL separate skill feedback from normal workflow products.

#### Scenario: View normal products
- **WHEN** the normal Products subsection is selected
- **THEN** records with `kind: "skill_run_feedback"` are excluded

#### Scenario: View skill feedback
- **WHEN** the Skill Feedback subsection is selected
- **THEN** only records with `kind: "skill_run_feedback"` are shown
- **AND** the user can filter records by skill
- **AND** the user can multi-select records with checkboxes
- **AND** the user can preview the Markdown body

### Requirement: Export selected skill feedback
The Dashboard SHALL export selected skill feedback records as one aggregate Markdown document.

#### Scenario: Export selected feedback
- **WHEN** one or more feedback records are selected
- **THEN** the exported Markdown contains one section per feedback record
- **AND** each section includes host audit metadata before the original Markdown body
