# Contexte de Sélection

Lorsqu'un utilisateur sélectionne des éléments dans Zotero, le plugin construit un **Contexte de Sélection (SelectionContext)** structuré qui décrit ce que l'utilisateur a sélectionné et le type de chaque élément sélectionné. Ce contexte sert de base d'entrée pour le hook `buildRequest`.

## Types de Sélection

Selon la combinaison des types d'éléments sélectionnés, `selectionContext.selectionType` retourne l'une des valeurs suivantes :

| Type | Description |
|------|-------------|
| `"parent"` | Tous les éléments sélectionnés sont des notices parentes (éléments de niveau supérieur) |
| `"child"` | Tous les éléments sélectionnés sont des éléments enfants (éléments non de niveau supérieur) |
| `"attachment"` | Tous les éléments sélectionnés sont des pièces jointes |
| `"note"` | Tous les éléments sélectionnés sont des notes |
| `"mixed"` | Les éléments sélectionnés sont un mélange de plusieurs types |
| `"none"` | Aucun élément n'est sélectionné |

## Structure du Contexte

```ts
selectionContext = {
  selectionType: "parent",       // Type de sélection
  items: {
    parents: [ /* Liste de notices parentes */ ],
    children: [ /* Liste d'éléments enfants */ ],
    attachments: [ /* Liste de pièces jointes */ ],
    notes: [ /* Liste de notes */ ],
  },
  summary: {
    parentCount: 2,
    childCount: 0,
    attachmentCount: 0,
    noteCount: 0,
  },
  warnings: [],                  // Messages d'avertissement
  sampledAt: "2026-01-15T...",   // Date de création du contexte
}
```

Chaque type d'élément contient des informations contextuelles riches.

### Notice Parente (ParentContext)

Une notice parente est un élément de niveau supérieur dans la bibliothèque Zotero (par ex. article de revue, livre, page web, etc.). Chaque contexte de notice parente contient :

```ts
{
  item: Zotero.Item,         // Objet élément
  id: number,                // ID de l'élément
  title: string,             // Titre
  attachments: [             // Pièces jointes enfants sous cet élément
    { type, filePath, mimeType, dateAdded, ... }
  ],
  notes: [                   // Notes enfants sous cet élément
    { id, content, ... }
  ],
  tags: string[],            // Liste de tags
  collections: string[],     // Collections contenant cet élément
  children: [                // Autres éléments enfants
    { id, type, ... }
  ],
}
```

### Pièce Jointe (AttachmentContext)

Une pièce jointe est un fichier attaché à un élément (PDF, Markdown, etc.). Chaque contexte de pièce jointe contient :

```ts
{
  item: Zotero.Item,         // Objet élément de la pièce jointe
  id: number,                // ID de l'élément
  filePath: string,          // Chemin du fichier local
  fileName: string,          // Nom du fichier
  mimeType: string,          // Type MIME (par ex. "application/pdf")
  dateAdded: Date,           // Date d'ajout
  parentItem: {              // Notice parente propriétaire
    id: number,
    key: string,
    libraryID: number,
  },
  tags: string[],
  collections: string[],
}
```

### Note (NoteContext)

```ts
{
  item: Zotero.Item,
  id: number,
  content: string,           // Contenu de la note (HTML)
  parentItem: { id, key, libraryID },
  tags: string[],
}
```

## Utilisation du Contexte de Sélection dans les Hooks

### Obtenir les Pièces Jointes Sélectionnées

```js
export function buildRequest({ selectionContext, runtime }) {
  const attachments = selectionContext.items.attachments;

  return {
    kind: "skillrunner.job.v1",
    create: { skill_id: "my-skill" },
    input: {
      files: attachments.map((attachment) => ({
        path: runtime.helpers.getAttachmentFilePath(attachment),
        name: runtime.helpers.getAttachmentFileName(attachment),
      })),
    },
  };
}
```

### Obtenir les Notices Parentes Sélectionnées et leur Contenu Enfant

```js
export function buildRequest({ selectionContext, runtime }) {
  const parents = selectionContext.items.parents;

  for (const parent of parents) {
    const title = parent.item.getField("title");
    const attachments = parent.attachments;  // Pièces jointes sous cette notice parente
    const notes = parent.notes;              // Notes sous cette notice parente
  }

  // ...
}
```

### Vérifier le Type de Sélection pour Déterminer le Comportement

```js
export function preflight({ selectionContext }) {
  const { selectionType } = selectionContext;

  if (selectionType === "none") {
    // Aucun élément sélectionné, ignorer
    return { kind: "skip", reason: "no selected items" };
  }

  if (selectionType === "attachment") {
    // L'utilisateur a sélectionné uniquement des pièces jointes, utiliser la logique de traitement des pièces jointes
  } else if (selectionType === "parent") {
    // L'utilisateur a sélectionné uniquement des notices parentes, développer la première pièce jointe qualifiée
  }

  return { kind: "continue", context: { selectionType } };
}
```

### Attachment Candidate Planning

```json
{
  "inputs": {
    "member": {
      "kind": "attachment",
      "accepts": { "mime": ["application/pdf"] }
    },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "require": {
      "selection": {
        "counts": { "attachments": { "min": 1 } },
        "allowMixed": false
      }
    },
    "select": { "policy": "input-member", "source": "selected" },
    "filters": [
      { "kind": "source-file-exists", "phase": "availability" }
    ]
  }
}
```

`require.selection` reads the original SelectionContext once. The selector
produces ordered candidates, attachment MIME compatibility runs before filters,
and `inputs.grouping` creates immutable top-level units.

### Workflows Without Selected Items

Use `member.kind: "selection"`, `grouping.mode: "all"`, the `selection`
selector, and `trigger.requiresSelection: false`. The selector then produces
the complete empty SelectionContext as the single member. Selection
requirements remain active and must not make the empty selection impossible.

## Declarative Candidate Filters

```json
{
  "validateSelection": {
    "select": { "policy": "generated-note-candidates" },
    "filters": [
      {
        "kind": "generated-note-kinds-absent",
        "phase": "availability",
        "noteKinds": ["digest"]
      }
    ]
  }
}
```

`validateSelection` owns candidate production and filtering. `inputs` owns
the execution member and grouping. Hooks consume the prepared unit and must not
reconstruct selection planning.
## Prochaines Étapes

- [Référence de l'API Hôte](#doc/workflows%2Fcustom%2Fhost-api) — API complète pour manipuler les données Zotero dans les hooks
- [Rédaction du Manifeste](#doc/workflows%2Fcustom%2Fmanifest) — Définir les types d'unités d'entrée du workflow
