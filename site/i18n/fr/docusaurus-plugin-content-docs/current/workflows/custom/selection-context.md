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

### Filtrer les Pièces Jointes

Utilisez `validateSelection` déclaratif pour le filtrage courant des pièces jointes :

```json
{
  "validateSelection": {
    "select": { "policy": "pdf-attachment" },
    "require": {
      "counts": { "attachments": 1 },
      "allowMixed": false
    }
  }
}
```

Pour les décisions d'exécution uniquement qui dépendent de l'unité résolue, utilisez `preflight` pour ignorer ou continuer :

```js
export function preflight({ selectionContext, runtime }) {
  const { helpers } = runtime;

  const hasPdf = selectionContext.items.attachments.some(
    a => helpers.isPdfAttachment(a)
  );

  if (!hasPdf) {
    return { kind: "skip", reason: "no PDF attachments" };
  }

  return { kind: "continue" };
}
```

### Workflows Sans Sélection d'Éléments

Lorsque `inputs.unit: "workflow"` et `trigger.requiresSelection: false`, le workflow peut être déclenché sans aucune sélection d'éléments. Dans ce cas, `selectionContext.selectionType` est `"none"`, et tous les tableaux dans `items` sont vides. Ce mode convient à la création d'opérations globales (par ex. « Créer une synthèse de sujet »).

## Validation Déclarative de la Sélection

Si votre workflow a uniquement besoin d'**ignorer les éléments qui ont déjà des résultats** ou de **filtrer des types d'entrée spécifiques**, utilisez le champ déclaratif `validateSelection` sans écrire de hook JavaScript.

```json
{
  "validateSelection": {
    "select": { "policy": "literature-source" },
    "exclude": [
      { "kind": "generated-notes-all", "noteKinds": ["digest"] }
    ]
  }
}
```

Voir la documentation complète dans [Rédaction du Manifeste](manifest#selection-validation).

> **Guide de sélection :** Utilisez `validateSelection` déclaratif autant que possible — il ne nécessite ni JavaScript ni maintenance. La logique de sélection complexe peut être implémentée dans le hook `buildRequest`.

## Prochaines Étapes

- [Référence de l'API Hôte](host-api) — API complète pour manipuler les données Zotero dans les hooks
- [Rédaction du Manifeste](manifest) — Définir les types d'unités d'entrée du workflow
