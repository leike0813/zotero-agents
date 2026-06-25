# Tag Bootstrapper

## Purpose

Interactively create a controlled tag vocabulary for a research domain with AI. Recommended to run before your first [Literature Analysis](literature-analysis) to establish a foundation for subsequent automatic tag regulation.

## Use Cases

- Starting a new research direction and needing to establish a tag system
- No controlled tag vocabulary yet exists in the current Zotero library
- Wanting AI to help design a domain-specific tag classification

## Input Constraints

| Constraint Type | Description |
|---------|------|
| Input Unit | workflow (no items need to be selected) |
| Trigger Method | Run from Dashboard |

## Execution Flow

```
1. Start Interaction
   └── Converse with AI in Dashboard

2. Define Domain
   └── Describe your research field and areas of interest
       └── AI proposes a tag classification system

3. Iterative Refinement
   └── Review AI-suggested tags
       └── Adjust, add, remove, rename

4. Confirm and Write
   └── Write the final tag vocabulary to the Synthesis system
```

### Interaction Details

- The workflow runs in **interactive** mode, conversing with AI in the Dashboard
- You can adjust the direction at any point during the conversation

## Estimated Duration

| Scenario | Estimated Time |
|------|---------|
| Initial vocabulary creation | 3-8 minutes |
| Adding tags | 3-5 minutes |

## Model Recommendation

🟢 A mid-capability model is sufficient; the strongest model is not needed.

## Outputs

After execution completes, the controlled tag vocabulary is written to the Synthesis system and can be viewed and managed on the Tags page of the Synthesis Workbench.

## Parameters

| Parameter | Type | Description | Default |
|------|------|------|--------|
| `tag_note_language` | string | Tag note language | `zh-CN` |

Available values: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. Custom input is also supported.

## Dependencies

- **Backend**: Skill-Runner service
- **Backend Configuration**: Configure a Skill-Runner type backend in Backend Manager
- **Skill**: The `tag-bootstrapper` skill must be deployed on the Skill-Runner

## Related Workflows

- [Literature Analysis](literature-analysis) — Can automatically cascade tag regulation during analysis
- [Tag Regulator](tag-regulator) — Run tag regulation on existing literature
