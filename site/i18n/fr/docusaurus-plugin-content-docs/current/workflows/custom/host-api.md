# Référence de l'API hôte

`runtime.hostApi` est l'interface principale par laquelle les hooks de workflow interagissent avec Zotero. Il encapsule des capacités opérationnelles complètes pour les bibliothèques Zotero, les éléments, les systèmes de fichiers, les préférences et plus encore.

## Opérations sur les éléments (hostApi.items)

```ts
hostApi.items = {
  get: (ref) => Zotero.Item | null,          // Obtenir un élément par référence
  resolve: (ref) => Zotero.Item,             // Identique à get, mais lève une erreur si l'élément n'existe pas
  getByLibraryAndKey: (libraryID, key) => Zotero.Item | null,  // Obtenir par ID de bibliothèque + Key
  getAll: () => Promise<Zotero.Item[]>,      // Obtenir tous les éléments
}
```

`ref` peut être un objet `Zotero.Item`, un ID numérique ou une Key sous forme de chaîne.

**Exemple :**

```js
// Obtenir un élément par ID
const item = hostApi.items.get(12345);

// Obtenir un élément par Key de bibliothèque
const item = hostApi.items.getByLibraryAndKey(1, "ABCD1234");
```

## Contexte (hostApi.context)

```ts
hostApi.context = {
  getCurrentView: () => ZoteroHostCurrentViewDto,  // Informations sur la vue active courante
  getSelectedItems: () => ZoteroHostItemSummaryDto[],  // Liste des éléments actuellement sélectionnés
}
```

**Exemple :**

```js
const view = hostApi.context.getCurrentView();
// { libraryID: 1, selectedItems: [...], ... }

const selected = hostApi.context.getSelectedItems();
// [{ id, key, libraryID, title, ... }, ...]
```

## Opérations sur la bibliothèque (hostApi.library)

```ts
hostApi.library = {
  listItems: (args) => Promise<LibraryListResponse>,       // Liste paginée d'éléments
  searchItems: (args) => Promise<ItemSummaryDto[]>,        // Rechercher des éléments
  getItemDetail: (ref) => Promise<ItemDetailDto | null>,   // Obtenir les détails d'un élément
  getItemNotes: (ref, args?) => Promise<NoteDto[]>,        // Obtenir la liste des notes d'un élément
  getNoteDetail: (ref, args?) => Promise<NoteDetailChunkDto>, // Obtenir le corps d'une note
  listNotePayloads: (ref) => Promise<NotePayloadDto[]>,    // Lister les payloads intégrés de notes
  getNotePayload: (ref, args?) => Promise<NotePayloadDto>, // Obtenir un payload spécifique
  getItemAttachments: (ref) => Promise<AttachmentDto[]>,   // Obtenir la liste des pièces jointes d'un élément
}
```

**Exemple :**

```js
// Rechercher des éléments
const results = await hostApi.library.searchItems({
  query: "transformer",
  limit: 10,
});

// Obtenir les notes d'un élément
const notes = await hostApi.library.getItemNotes(ref);

// Obtenir les pièces jointes d'un élément
const attachments = await hostApi.library.getItemAttachments(ref);
```

## Opérations de mutation (hostApi.mutations)

Utilisées pour créer, mettre à jour et supprimer des données dans Zotero. Les opérations d'écriture nécessitent l'approbation de l'utilisateur (confirmée dans l'interface Zotero).

```ts
hostApi.mutations = {
  preview: (request) => Promise<MutationPreviewResponse>,   // Prévisualiser les effets de la mutation
  execute: (request) => Promise<MutationExecuteResponse>,   // Exécuter la mutation
}
```

### Opérations de mutation prises en charge

| `operation` | Objectif | Description |
|-------------|----------|-------------|
| `item.updateFields` | Mettre à jour les champs d'un élément | Modifier le titre, l'auteur, la date et d'autres champs |
| `item.addTags` | Ajouter des tags | Ajouter un ou plusieurs tags à un élément |
| `item.removeTags` | Supprimer des tags | Supprimer les tags spécifiés d'un élément |
| `note.createChild` | Créer une note enfant | Créer une nouvelle note sous une notice parente |
| `note.update` | Mettre à jour une note | Modifier le contenu d'une note existante |
| `note.upsertPayload` | Mettre à jour le payload intégré | Mettre à jour la pièce jointe de payload de workflow de la note |
| `literature.ingest` | Importer de la littérature | Importer un article dans Zotero |
| `collection.addItems` | Ajouter à une collection | Ajouter des éléments à une collection |
| `collection.removeItems` | Retirer d'une collection | Retirer des éléments d'une collection |

**Exemple : Créer une note**

```js
const result = await hostApi.mutations.execute({
  operation: "note.createChild",
  parentItem: parentItem.getField("id"),
  data: {
    content: htmlContent,
    tags: ["generated"],
  },
});
```

**Exemple : Ajouter des tags**

```js
await hostApi.mutations.execute({
  operation: "item.addTags",
  item: itemId,
  data: { tags: ["field:computer_science", "method:deep_learning"] },
});
```

## Opérations sur les notes (hostApi.notes)

```ts
hostApi.notes = {
  // ... Toutes les méthodes du gestionnaire de notes de bas niveau
  importEmbeddedImage: (noteRef, image) => Promise<{
    attachmentKey: string;
    attachmentItem: Zotero.Item;
    mimeType: string;
    bytes: number;
  }>,
}
```

### Traitement d'images (hostApi.images)

```ts
hostApi.images = {
  prepareForNoteEmbedding: (source, options?) => Promise<PreparedNoteImage>,
}
```

Utilisé pour traiter les images dans un format adapté à l'intégration dans les notes :

```js
const prepared = await hostApi.images.prepareForNoteEmbedding(filePath, {
  maxLongEdge: 720,
  targetBytes: 180 * 1024,
});

const result = await hostApi.notes.importEmbeddedImage(noteRef, prepared);
```

## Opérations sur les pièces jointes (hostApi.attachments)

```ts
hostApi.attachments = {
  // Toutes les méthodes du gestionnaire de pièces jointes de bas niveau
  // Y compris : lister les pièces jointes, obtenir les chemins, créer des pièces jointes, etc.
}
```

## Opérations sur les tags (hostApi.tags)

```ts
hostApi.tags = {
  // Toutes les méthodes du gestionnaire de tags de bas niveau
  // Y compris : lister les tags, obtenir les tags, créer des tags, etc.
}
```

## Opérations sur les collections (hostApi.collections)

```ts
hostApi.collections = {
  // Toutes les méthodes du gestionnaire de collections de bas niveau
  // Y compris : lister les collections, obtenir les sous-collections, etc.
}
```

## Opérations sur les fichiers (hostApi.file)

```ts
hostApi.file = {
  readText: (path) => Promise<string>,                    // Lire un fichier texte
  writeText: (path, content) => Promise<void>,            // Écrire un fichier texte
  readBytes: (path) => Promise<Uint8Array>,               // Lire un fichier binaire
  writeBytes: (path, bytes) => Promise<void>,             // Écrire un fichier binaire
  copy: (source, target) => Promise<void>,                // Copier un fichier
  exists: (path) => Promise<boolean>,                     // Vérifier si un fichier existe
  makeDirectory: (path) => Promise<void>,                 // Créer un répertoire (y compris les répertoires parents)
  pathToFile: (path) => nsIFile,                          // Convertir un chemin en objet fichier Zotero
  getTempDirectoryPath: () => string,                     // Obtenir le chemin du répertoire temporaire
  pickDirectory: (args?) => Promise<string | null>,       // Ouvrir le sélecteur de répertoire
  pickFile: (args?) => Promise<string | null>,            // Ouvrir le sélecteur de fichier
  pickFiles: (args?) => Promise<string[] | null>,         // Ouvrir le sélecteur de fichiers multiples
}
```

**Exemple :**

```js
// Lire un fichier
const content = await hostApi.file.readText("/path/to/file.md");

// Écrire un fichier
await hostApi.file.writeText("/path/to/output.md", newContent);

// Ouvrir le sélecteur de répertoire pour permettre à l'utilisateur de choisir le répertoire d'export
const dir = await hostApi.file.pickDirectory({
  title: "Select Export Directory",
});
if (dir) {
  // L'utilisateur a sélectionné un répertoire
  await hostApi.file.writeText(`${dir}/result.md`, content);
}
```

## Préférences (hostApi.prefs)

```ts
hostApi.prefs = {
  get: (key, global?) => unknown,      // Lire une préférence
  set: (key, value, global?) => void,  // Écrire une préférence
  clear: (key, global?) => void,       // Effacer une préférence
}
```

Le préfixe est automatiquement géré par le plugin ; il suffit de passer le nom de la clé.

**Exemple :**

```js
// Lire une configuration
const vocab = hostApi.prefs.get("tagVocabularyJson");

// Écrire une configuration
hostApi.prefs.set("mySetting", "myValue");
```

## Notifications UI (hostApi.notifications)

```ts
hostApi.notifications = {
  toast: ({ text, type? }) => void,
}
// type: "default" | "success" | "error"
```

**Exemple :**

```js
hostApi.notifications.toast({
  text: "Processing complete!",
  type: "success",
});
```

## Journalisation d'exécution (hostApi.logging)

```ts
hostApi.logging = {
  appendRuntimeLog: (input) => void,
}
```

Utilisé pour ajouter des informations de diagnostic au journal d'exécution.

## Configuration du plugin (hostApi.addon)

```ts
hostApi.addon = {
  getConfig: () => ({ addonName, addonRef, prefsPrefix }),
}
```

## Version de l'API (hostApi.version)

```ts
hostApi.version: number
```

Le numéro de version courant de l'API hôte. À utiliser pour se prémunir contre les changements incompatibles lors de l'écriture de hooks nécessitant une compatibilité entre les versions du plugin.

## Opérations sur les notices parentes (hostApi.parents)

```ts
hostApi.parents = {
  // Opérations du gestionnaire de notices parentes de bas niveau
}
```

Fournit un accès de plus bas niveau à la gestion des notices parentes. Préférer l'utilisation de `hostApi.library` et `hostApi.mutations` sauf si vous avez besoin de l'interface du gestionnaire de plus bas niveau.

## Opérations de commande (hostApi.command)

```ts
hostApi.command = {
  // Opérations du gestionnaire de commandes de bas niveau
}
```

Interface de plus bas niveau pour l'exécution de commandes. Généralement pas nécessaire dans les hooks de workflow.

## Opérations de l'éditeur (hostApi.editor)

```ts
hostApi.editor = {
  openSession: (args) => ReturnType<typeof openWorkflowEditorSession>,
  registerRenderer: (rendererId, renderer) => void,
  unregisterRenderer: (rendererId) => void,
}
```

Gère les sessions de l'éditeur de workflow. `registerRenderer` et `unregisterRenderer` permettent des renderers personnalisés pour les formats de sortie spécifiques aux workflows.

## Opérations de synthèse (hostApi.synthesis)

```ts
hostApi.synthesis?: SynthesisService
```

Fournit l'accès au service Synthesis Workbench (sujets, concepts, tags, graphe de citations, etc.). Disponible uniquement lorsque le système Synthesis est initialisé.

## Exemple complet

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  const { hostApi, helpers } = runtime;

  // 1. Résoudre la notice parente
  const parentItem = helpers.resolveItemRef(parent);

  // 2. Lire l'artefact du bundle
  const markdownContent = await bundleReader.readText("result/output.md");

  // 3. Convertir en note HTML
  const htmlContent = helpers.toHtmlNote("Processing Result", markdownContent);

  // 4. Créer la note
  const noteResult = await hostApi.mutations.execute({
    operation: "note.createChild",
    parentItem: parentItem.getField("id"),
    data: { content: htmlContent },
  });

  // 5. Ajouter des tags
  await hostApi.mutations.execute({
    operation: "item.addTags",
    item: parentItem.getField("id"),
    data: { tags: ["processed"] },
  });

  // 6.Notifier l'utilisateur
  hostApi.notifications.toast({
    text: `Processing complete: ${parentItem.getField("title")}`,
    type: "success",
  });

  return { applied: true, noteId: noteResult.id };
}
```

## Prochaines étapes

- [Empaquetage et déploiement](packaging) — Publier des workflows personnalisés
- [Débogage et tests](debugging) — Vérifier la correction des workflows
