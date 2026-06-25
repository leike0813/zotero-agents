# Riferimento API host

`runtime.hostApi` è l'interfaccia principale tramite cui gli hook dei Workflow interagiscono con Zotero. Incapsula capacità operative complete per le librerie Zotero, gli elementi, i file system, le preferenze e altro ancora.

## Operazioni sugli elementi (hostApi.items)

```ts
hostApi.items = {
  get: (ref) => Zotero.Item | null,          // Ottiene un elemento per riferimento
  resolve: (ref) => Zotero.Item,             // Come get, ma lancia un'eccezione se l'elemento non esiste
  getByLibraryAndKey: (libraryID, key) => Zotero.Item | null,  // Ottiene per ID libreria + Key
  getAll: () => Promise<Zotero.Item[]>,      // Ottiene tutti gli elementi
}
```

`ref` può essere un oggetto `Zotero.Item`, un ID numerico o una Key stringa.

**Esempio:**

```js
// Ottiene un elemento per ID
const item = hostApi.items.get(12345);

// Ottiene un elemento per Key della libreria
const item = hostApi.items.getByLibraryAndKey(1, "ABCD1234");
```

## Contesto (hostApi.context)

```ts
hostApi.context = {
  getCurrentView: () => ZoteroHostCurrentViewDto,  // Informazioni sulla vista attiva corrente
  getSelectedItems: () => ZoteroHostItemSummaryDto[],  // Elenco degli elementi attualmente selezionati
}
```

**Esempio:**

```js
const view = hostApi.context.getCurrentView();
// { libraryID: 1, selectedItems: [...], ... }

const selected = hostApi.context.getSelectedItems();
// [{ id, key, libraryID, title, ... }, ...]
```

## Operazioni sulla libreria (hostApi.library)

```ts
hostApi.library = {
  listItems: (args) => Promise<LibraryListResponse>,       // Elenco paginato degli elementi
  searchItems: (args) => Promise<ItemSummaryDto[]>,        // Ricerca elementi
  getItemDetail: (ref) => Promise<ItemDetailDto | null>,   // Ottiene informazioni dettagliate sull'elemento
  getItemNotes: (ref, args?) => Promise<NoteDto[]>,        // Ottiene l'elenco delle note dell'elemento
  getNoteDetail: (ref, args?) => Promise<NoteDetailChunkDto>, // Ottiene il corpo della nota
  listNotePayloads: (ref) => Promise<NotePayloadDto[]>,    // Elenca i payload incorporati delle note
  getNotePayload: (ref, args?) => Promise<NotePayloadDto>, // Ottiene un payload specifico
  getItemAttachments: (ref) => Promise<AttachmentDto[]>,   // Ottiene l'elenco degli allegati dell'elemento
}
```

**Esempio:**

```js
// Ricerca elementi
const results = await hostApi.library.searchItems({
  query: "transformer",
  limit: 10,
});

// Ottiene le note dell'elemento
const notes = await hostApi.library.getItemNotes(ref);

// Ottiene gli allegati dell'elemento
const attachments = await hostApi.library.getItemAttachments(ref);
```

## Operazioni di mutazione (hostApi.mutations)

Utilizzate per creare, aggiornare ed eliminare dati in Zotero. Le operazioni di scrittura richiedono l'approvazione dell'utente (confermata nell'interfaccia di Zotero).

```ts
hostApi.mutations = {
  preview: (request) => Promise<MutationPreviewResponse>,   // Anteprima degli effetti della mutazione
  execute: (request) => Promise<MutationExecuteResponse>,   // Esegue la mutazione
}
```

### Operazioni di mutazione supportate

| `operation` | Scopo | Descrizione |
|-------------|-------|-------------|
| `item.updateFields` | Aggiorna campi dell'elemento | Modifica titolo, autore, data e altri campi |
| `item.addTags` | Aggiunge tag | Aggiunge uno o più tag a un elemento |
| `item.removeTags` | Rimuove tag | Rimuove i tag specificati da un elemento |
| `note.createChild` | Crea nota figlia | Crea una nuova nota sotto un elemento genitore |
| `note.update` | Aggiorna nota | Modifica il contenuto di una nota esistente |
| `note.upsertPayload` | Aggiorna payload incorporato | Aggiorna l'allegato payload del Workflow della nota |
| `literature.ingest` | Acquisisci letteratura | Importa un articolo in Zotero |
| `collection.addItems` | Aggiungi alla collezione | Aggiunge elementi a una collezione |
| `collection.removeItems` | Rimuovi dalla collezione | Rimuove elementi da una collezione |

**Esempio: Creare una nota**

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

**Esempio: Aggiungere tag**

```js
await hostApi.mutations.execute({
  operation: "item.addTags",
  item: itemId,
  data: { tags: ["field:computer_science", "method:deep_learning"] },
});
```

## Operazioni sulle note (hostApi.notes)

```ts
hostApi.notes = {
  // ... Tutti i metodi dal gestore di note di basso livello
  importEmbeddedImage: (noteRef, image) => Promise<{
    attachmentKey: string;
    attachmentItem: Zotero.Item;
    mimeType: string;
    bytes: number;
  }>,
}
```

### Elaborazione delle immagini (hostApi.images)

```ts
hostApi.images = {
  prepareForNoteEmbedding: (source, options?) => Promise<PreparedNoteImage>,
}
```

Utilizzato per elaborare le immagini in un formato adatto all'incorporamento nelle note:

```js
const prepared = await hostApi.images.prepareForNoteEmbedding(filePath, {
  maxLongEdge: 720,
  targetBytes: 180 * 1024,
});

const result = await hostApi.notes.importEmbeddedImage(noteRef, prepared);
```

## Operazioni sugli allegati (hostApi.attachments)

```ts
hostApi.attachments = {
  // Tutti i metodi dal gestore di allegati di basso livello
  // Inclusi: elencare allegati, ottenere percorsi degli allegati, creare allegati, ecc.
}
```

## Operazioni sui tag (hostApi.tags)

```ts
hostApi.tags = {
  // Tutti i metodi dal gestore di tag di basso livello
  // Inclusi: elencare tag, ottenere tag, creare tag, ecc.
}
```

## Operazioni sulle collezioni (hostApi.collections)

```ts
hostApi.collections = {
  // Tutti i metodi dal gestore di collezioni di basso livello
  // Inclusi: elencare collezioni, ottenere sotto-collezioni, ecc.
}
```

## Operazioni sui file (hostApi.file)

```ts
hostApi.file = {
  readText: (path) => Promise<string>,                    // Legge file di testo
  writeText: (path, content) => Promise<void>,            // Scrive file di testo
  readBytes: (path) => Promise<Uint8Array>,               // Legge file binari
  writeBytes: (path, bytes) => Promise<void>,             // Scrive file binari
  copy: (source, target) => Promise<void>,                // Copia file
  exists: (path) => Promise<boolean>,                     // Verifica se il file esiste
  makeDirectory: (path) => Promise<void>,                 // Crea directory (incluse le directory genitore)
  pathToFile: (path) => nsIFile,                          // Converte il percorso in oggetto file Zotero
  getTempDirectoryPath: () => string,                     // Ottiene il percorso della directory temporanea
  pickDirectory: (args?) => Promise<string | null>,       // Apre il selettore di directory
  pickFile: (args?) => Promise<string | null>,            // Apre il selettore di file
  pickFiles: (args?) => Promise<string[] | null>,         // Apre il selettore di file multipli
}
```

**Esempio:**

```js
// Legge file
const content = await hostApi.file.readText("/path/to/file.md");

// Scrive file
await hostApi.file.writeText("/path/to/output.md", newContent);

// Apre il selettore di directory per far scegliere all'utente la directory di esportazione
const dir = await hostApi.file.pickDirectory({
  title: "Seleziona directory di esportazione",
});
if (dir) {
  // L'utente ha selezionato una directory
  await hostApi.file.writeText(`${dir}/result.md`, content);
}
```

## Preferenze (hostApi.prefs)

```ts
hostApi.prefs = {
  get: (key, global?) => unknown,      // Legge preferenza
  set: (key, value, global?) => void,  // Scrive preferenza
  clear: (key, global?) => void,       // Cancella preferenza
}
```

Il prefisso è gestito automaticamente dal plugin; è sufficiente passare il nome della chiave.

**Esempio:**

```js
// Legge configurazione
const vocab = hostApi.prefs.get("tagVocabularyJson");

// Scrive configurazione
hostApi.prefs.set("mySetting", "myValue");
```

## Notifiche UI (hostApi.notifications)

```ts
hostApi.notifications = {
  toast: ({ text, type? }) => void,
}
// type: "default" | "success" | "error"
```

**Esempio:**

```js
hostApi.notifications.toast({
  text: "Elaborazione completata!",
  type: "success",
});
```

## Logging di runtime (hostApi.logging)

```ts
hostApi.logging = {
  appendRuntimeLog: (input) => void,
}
```

Utilizzato per aggiungere informazioni diagnostiche al logger di runtime.

## Configurazione del plugin (hostApi.addon)

```ts
hostApi.addon = {
  getConfig: () => ({ addonName, addonRef, prefsPrefix }),
}
```

## Versione API (hostApi.version)

```ts
hostApi.version: number
```

Il numero di versione corrente delle API host. Utilizzarlo per proteggersi da breaking changes quando si scrivono hook che devono essere compatibili tra versioni del plugin.

## Operazioni sui genitori (hostApi.parents)

```ts
hostApi.parents = {
  // Operazioni del gestore di elementi genitore di basso livello
}
```

Fornisce accesso di livello inferiore alla gestione degli elementi genitore. Preferire l'uso di `hostApi.library` e `hostApi.mutations` a meno che non sia necessaria l'interfaccia del gestore di livello inferiore.

## Operazioni sui comandi (hostApi.command)

```ts
hostApi.command = {
  // Operazioni del gestore di comandi di basso livello
}
```

Interfaccia di livello inferiore per l'esecuzione di comandi. Tipicamente non necessaria negli hook dei Workflow.

## Operazioni sull'editor (hostApi.editor)

```ts
hostApi.editor = {
  openSession: (args) => ReturnType<typeof openWorkflowEditorSession>,
  registerRenderer: (rendererId, renderer) => void,
  unregisterRenderer: (rendererId) => void,
}
```

Gestisce le sessioni dell'editor dei Workflow. `registerRenderer` e `unregisterRenderer` consentono renderer personalizzati per formati di output specifici dei Workflow.

## Operazioni di sintesi (hostApi.synthesis)

```ts
hostApi.synthesis?: SynthesisService
```

Fornisce accesso al servizio Synthesis Workbench (argomenti, concetti, tag, grafo delle citazioni, ecc.). Disponibile solo quando il sistema Synthesis è inizializzato.

## Esempio completo

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  const { hostApi, helpers } = runtime;

  // 1. Risolve l'elemento genitore
  const parentItem = helpers.resolveItemRef(parent);

  // 2. Legge l'artifact dal bundle
  const markdownContent = await bundleReader.readText("result/output.md");

  // 3. Converte in nota HTML
  const htmlContent = helpers.toHtmlNote("Risultato dell'elaborazione", markdownContent);

  // 4. Crea la nota
  const noteResult = await hostApi.mutations.execute({
    operation: "note.createChild",
    parentItem: parentItem.getField("id"),
    data: { content: htmlContent },
  });

  // 5. Aggiunge tag
  await hostApi.mutations.execute({
    operation: "item.addTags",
    item: parentItem.getField("id"),
    data: { tags: ["processed"] },
  });

  // 6. Notifica l'utente
  hostApi.notifications.toast({
    text: `Elaborazione completata: ${parentItem.getField("title")}`,
    type: "success",
  });

  return { applied: true, noteId: noteResult.id };
}
```

## Prossimi passi

- [Pacchettizzazione e distribuzione](packaging) — Pubblicare Workflow personalizzati
- [Debug e testing](debugging) — Verificare la correttezza dei Workflow
