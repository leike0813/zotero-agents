# Contexte de sélection

Lorsqu'un utilisateur sélectionne des éléments dans Zotero, le plugin construit un **contexte de sélection (SelectionContext)** structuré qui décrit ce que l'utilisateur a sélectionné et le type de chaque élément sélectionné. Ce contexte sert de base d'entrée pour le hook `buildRequest`.

## Types de sélection

Selon la combinaison des types d'éléments sélectionnés, `selectionContext.selectionType` retourne l'une des valeurs suivantes :

| Type | Description |
|------|-------------|
| `"parent"` | Tous les éléments sélectionnés sont des notices parentes (éléments de niveau supérieur) |
| `"child"` | Tous les éléments sélectionnés sont des éléments enfants (éléments non de niveau supérieur) |
| `"attachment"` | Tous les éléments sélectionnés sont des pièces jointes |
| `"note"` | Tous les éléments sélectionnés sont des notes |
| `"mixed"` | Les éléments sélectionnés sont un mélange de plusieurs types |
| `"none"` | Aucun élément n'est sélectionné |

## Structure du contexte

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

### Notice parente (ParentContext)

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

### Pièce jointe (AttachmentContext)

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

## Utilisation du contexte de sélection dans les hooks

### Obtenir les pièces jointes sélectionnées

```js
export function filterInputs({ selectionContext, runtime }) {
  const attachments = selectionContext.items.attachments;

  for (const attachment of attachments) {
    const filePath = runtime.helpers.getAttachmentFilePath(attachment);
    const fileName = runtime.helpers.getAttachmentFileName(attachment);
    // Traiter la pièce jointe
  }

  return selectionContext;
}
```

### Obtenir les notices parentes sélectionnées et leur contenu enfant

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

### Vérifier le type de sélection pour déterminer le comportement

```js
export function filterInputs({ selectionContext, runtime }) {
  const { selectionType } = selectionContext;

  if (selectionType === "none") {
    // Aucun élément sélectionné, ignorer
    return null;
  }

  if (selectionType === "attachment") {
    // L'utilisateur a sélectionné uniquement des pièces jointes, utiliser la logique de traitement des pièces jointes
  } else if (selectionType === "parent") {
    // L'utilisateur a sélectionné uniquement des notices parentes, développer la première pièce jointe qualifiée
  }

  return selectionContext;
}
```

### Filtrer les pièces jointes

Utiliser `helpers.withFilteredAttachments` pour mettre à jour le contexte de sélection après le traitement :

```js
export function filterInputs({ selectionContext, runtime }) {
  const { helpers } = runtime;

  // Conserver uniquement les pièces jointes PDF
  const pdfs = selectionContext.items.attachments.filter(
    a => helpers.isPdfAttachment(a)
  );

  // Conserver uniquement les notices parentes ayant des pièces jointes PDF parmi tous les éléments
  const matched = selectionContext.items.parents.filter(parent => {
    return parent.attachments.some(
      a => helpers.isPdfAttachment(a)
    );
  });

  // Si aucune correspondance, ignorer l'exécution
  if (matched.length === 0) return null;

  // Mettre à jour le contexte avec le résultat filtré
  return helpers.withFilteredAttachments(selectionContext, matched);
}
```

### Workflows sans sélection d'éléments

Lorsque `inputs.unit: "workflow"` et `trigger.requiresSelection: false`, le workflow peut être déclenché sans aucune sélection d'éléments. Dans ce cas, `selectionContext.selectionType` est `"none"`, et tous les tableaux dans `items` sont vides. Ce mode convient à la création d'opérations globales (par ex. « Créer une synthèse de sujet »).

## Validation déclarative de la sélection

Si votre workflow a uniquement besoin d'**ignorer les éléments qui ont déjà des résultats** ou de **filtrer des types d'entrée spécifiques**, vous pouvez utiliser le champ déclaratif `validateSelection` sans écrire de hook `filterInputs`.

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

Voir la documentation complète dans [Rédaction du manifeste](manifest#selection-validation).

> **Guide de sélection :** Utilisez `validateSelection` déclaratif autant que possible — il ne nécessite ni JavaScript ni maintenance. La logique de sélection complexe peut être implémentée dans le hook `buildRequest`.

## Prochaines étapes

- [Référence de l'API hôte](host-api) — API complète pour manipuler les données Zotero dans les hooks
- [Rédaction du manifeste](manifest) — Définir les types d'unités d'entrée du workflow
