# Tags Management

## What Is Tag Vocabulary?

Tag Vocabulary is a standardized tagging system used for consistent annotation of literature. Unlike Zotero's native free-form tags, tags in a controlled vocabulary follow unified naming conventions, which facilitates statistics and retrieval.

## Facets

Each tag belongs to a Facet (dimension). The following facets are currently supported:

| Facet | Description | Example |
|-------|-------------|---------|
| `field` | Research field | `field:natural_language_processing` |
| `topic` | Research topic | `topic:transformer_architecture` |
| `method` | Research method | `method:reinforcement_learning` |
| `model` | Model used | `model:gpt-4` |
| `ai_task` | AI task type | `ai_task:text_summarization` |
| `data` | Dataset | `data:imagenet` |
| `tool` | Tool | `tool:python` |
| `status` | Status marker | `status:to_read` |

Tag format: `^[a-z_]+:[a-zA-Z0-9/_.-]+$`, maximum 120 characters.

## Vocabulary Tab

On the Synthesis Workbench → Tags → Vocabulary page, you can:

- **View**: All defined canonical tags, showing status, facet, aliases, and usage count
- **Add**: Create new canonical tags
- **Edit**: Modify tag metadata
- **Deprecate**: Mark a tag as deprecated, optionally specifying a replacement tag
- **Import JSON**: Import a tag vocabulary from a JSON file (supports preview before confirmation)
- **Export JSON**: Export the current vocabulary to a JSON file

![Synthesis Tags Page](/img/docs/synthesis/tags.png)

Tag statuses:
- `active`: Active
- `deprecated`: Deprecated (has a replacement tag)
- `warning`: Warning (may need review)

## Staged Tab (Pending Tags)

The **tag-regulator** skill automatically analyzes literature metadata and generates controlled tag suggestions, displayed on the Staged page.

### Approval Workflow

1. Review the list of suggested tags
2. For each tag, you can:
   - **Promote**: Add the tag to the canonical vocabulary
   - **Discard**: Reject the suggestion
   - **Clear Staged**: Batch-discard all suggestions

### Import/Export Format

The tag vocabulary supports JSON format import/export (TagVocab format), enabling:

- Cross-library migration of tag systems
- Team sharing of tag conventions
- Backup and version control

## Related Workflow

Tag standardization and automatic inference are driven by the [Tag Regulator](../workflows/tag-regulator) workflow. Running this workflow can automatically clean up and supplement tags based on the controlled vocabulary.
