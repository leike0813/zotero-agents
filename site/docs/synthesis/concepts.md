# Concept Knowledge Base

The Concept Knowledge Base (Concept KB) is an optional knowledge layer in the Synthesis system that provides structured management of core concepts referenced in the literature. Concepts can be overlaid onto the topic graph and reader, enriching the context for topic synthesis.

## What Is a Concept?

In the Synthesis system, a **concept** is a term or entity with independent meaning within a research domain. Unlike the flat classification of tags, concepts can have a multi-layered structure, including senses, aliases, and relationships.

### Four-Layer Structure of Concepts

```
Concept                 — e.g., "Transformer"
  └── Sense             — e.g., "Transformer (machine learning architecture)"
       ├── Alias        — e.g., "Transformer model", "Transformer network"
       └── Relation     — broader_than "Attention Mechanism"
```

### Concept Types

| Type | Description | Examples |
|------|-------------|----------|
| `method` | Research methods | Deep learning, reinforcement learning |
| `model` | Models or architectures | Transformer, ResNet |
| `dataset` | Datasets | ImageNet, COCO |
| `metric` | Evaluation metrics | BLEU, F1-score |
| `field` | Research fields | Computer vision, natural language processing |
| `task` | Tasks | Image classification, machine translation |
| `tool` | Tools | PyTorch, TensorFlow |

## Concepts Surface Features

### Concept List

On the Synthesis Workbench → Concepts page, you can browse all indexed concepts:

- **Filter**: By type (method / model / dataset, etc.), status, or associated topics
- **Search**: Search concepts by name
- **View Toggle**: Compact / comfortable density

![Synthesis Concepts Page](/img/docs/synthesis/concepts.png)

### Concept Details

After selecting a concept, you can view and edit:

| Information | Description |
|-------------|-------------|
| **Identity** | Concept ID, name, type |
| **Status** | active / deprecated / pending |
| **Definition** | Descriptive definition of the concept |
| **Senses** | Specific meanings of the concept in different contexts |
| **Aliases** | Alternative names for the same concept |
| **Relations** | Associations with other concepts (broader / narrower / related) |
| **Related Topics** | Topics that reference this concept |

### Sense Management

The same concept may have different meanings across disciplines. The sense mechanism allows:

- Adding multiple senses to a concept, each with its own definition
- Annotating the usage context or domain for each sense
- Associating specific senses with papers or topics

### Alias Management

- Recording different naming conventions for the same concept (e.g., full name, abbreviation, alternative terms)
- Aliases are used for citation matching and concept identification

### Overlay Features

Concept information can be overlaid onto other surfaces:

- **Overlay onto Topic Graph**: Display concepts related to a topic in the Topic Graph
- **Overlay onto Reader**: Display concept cards on the Topic Detail page

## Review

Change proposals to the concept knowledge base (new concepts, new senses, new relationships) appear in the Concepts review tab of the [Review Hub](review). You can review and decide whether to accept these proposals.

## Relationship with Tags

Concepts and tags are two complementary approaches to knowledge organization:

| Dimension | Tags | Concepts |
|-----------|------|----------|
| Structure | Flat, facet:value | Multi-layered (senses + aliases + relationships) |
| Purpose | Literature classification and filtering | Knowledge management and association analysis |
| Source | Controlled vocabulary + AI inference | Auto-extracted from literature + user-managed |
| Scope | Covers all literature | Deep coverage of selected core terms |

## Next Steps

- [Review Hub](review) — Review concept suggestions
- [Tags Management](tags) — Manage the controlled tag vocabulary
- [Topic Synthesis](topic-synthesis) — Leverage concept knowledge when creating topic syntheses
