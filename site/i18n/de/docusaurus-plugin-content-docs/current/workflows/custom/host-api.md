# Host-API-Referenz

`runtime.hostApi` ist die primäre Schnittstelle für Workflow-Hooks zur Interaktion mit Zotero. Sie kapselt vollständige operative Fähigkeiten für Zotero-Bibliotheken, Elemente, Dateisysteme, Einstellungen und mehr.

## Element-Operationen (hostApi.items)

```ts
hostApi.items = {
  get: (ref) => Zotero.Item | null,          // Element per Referenz abrufen
  resolve: (ref) => Zotero.Item,             // Wie get, aber wirft Fehler, wenn Element nicht existiert
  getByLibraryAndKey: (libraryID, key) => Zotero.Item | null,  // Abrufen per Bibliotheks-ID + Key
  getAll: () => Promise<Zotero.Item[]>,      // Alle Elemente abrufen
}
```

`ref` kann ein `Zotero.Item`-Objekt, eine numerische ID oder ein String-Key sein.

**Beispiel:**

```js
// Element per ID abrufen
const item = hostApi.items.get(12345);

// Element per Bibliotheks-Key abrufen
const item = hostApi.items.getByLibraryAndKey(1, "ABCD1234");
```

## Kontext (hostApi.context)

```ts
hostApi.context = {
  getCurrentView: () => ZoteroHostCurrentViewDto,  // Aktuelle aktive Ansichtsinformationen
  getSelectedItems: () => ZoteroHostItemSummaryDto[],  // Aktuell ausgewählte Elementliste
}
```

**Beispiel:**

```js
const view = hostApi.context.getCurrentView();
// { libraryID: 1, selectedItems: [...], ... }

const selected = hostApi.context.getSelectedItems();
// [{ id, key, libraryID, title, ... }, ...]
```

## Bibliotheks-Operationen (hostApi.library)

```ts
hostApi.library = {
  listItems: (args) => Promise<LibraryListResponse>,       // Paginierte Elementauflistung
  searchItems: (args) => Promise<ItemSummaryDto[]>,        // Elemente suchen
  getItemDetail: (ref) => Promise<ItemDetailDto | null>,   // Element-Detailinformationen abrufen
  getItemNotes: (ref, args?) => Promise<NoteDto[]>,        // Notizliste des Elements abrufen
  getNoteDetail: (ref, args?) => Promise<NoteDetailChunkDto>, // Notizinhalt abrufen
  listNotePayloads: (ref) => Promise<NotePayloadDto[]>,    // Eingebettete Notiz-Nutzlasten auflisten
  getNotePayload: (ref, args?) => Promise<NotePayloadDto>, // Spezifische Nutzlast abrufen
  getItemAttachments: (ref) => Promise<AttachmentDto[]>,   // Anhangsliste des Elements abrufen
}
```

**Beispiel:**

```js
// Elemente suchen
const results = await hostApi.library.searchItems({
  query: "transformer",
  limit: 10,
});

// Notizen des Elements abrufen
const notes = await hostApi.library.getItemNotes(ref);

// Anhänge des Elements abrufen
const attachments = await hostApi.library.getItemAttachments(ref);
```

## Mutations-Operationen (hostApi.mutations)

Wird zum Erstellen, Aktualisieren und Löschen von Daten in Zotero verwendet. Schreiboperationen erfordern Benutzerzustimmung (bestätigt in der Zotero-Benutzeroberfläche).

```ts
hostApi.mutations = {
  preview: (request) => Promise<MutationPreviewResponse>,   // Mutationswirkungen vorschauen
  execute: (request) => Promise<MutationExecuteResponse>,   // Mutation ausführen
}
```

### Unterstützte Mutations-Operationen

| `operation` | Zweck | Beschreibung |
|-------------|-------|-------------|
| `item.updateFields` | Elementfelder aktualisieren | Titel, Autor, Datum und andere Felder ändern |
| `item.addTags` | Tags hinzufügen | Ein oder mehrere Tags zu einem Element hinzufügen |
| `item.removeTags` | Tags entfernen | Angegebene Tags von einem Element entfernen |
| `note.createChild` | Kind-Notiz erstellen | Eine neue Notiz unter einem übergeordneten Element erstellen |
| `note.update` | Notiz aktualisieren | Den Inhalt einer vorhandenen Notiz ändern |
| `note.upsertPayload` | Eingebettete Nutzlast aktualisieren | Die Workflow-Nutzlast-Anhangs der Notiz aktualisieren |
| `literature.ingest` | Literatur aufnehmen | Eine Arbeit in Zotero importieren |
| `collection.addItems` | Zur Sammlung hinzufügen | Elemente zu einer Sammlung hinzufügen |
| `collection.removeItems` | Aus Sammlung entfernen | Elemente aus einer Sammlung entfernen |

**Beispiel: Notiz erstellen**

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

**Beispiel: Tags hinzufügen**

```js
await hostApi.mutations.execute({
  operation: "item.addTags",
  item: itemId,
  data: { tags: ["field:computer_science", "method:deep_learning"] },
});
```

## Notiz-Operationen (hostApi.notes)

```ts
hostApi.notes = {
  // ... Alle Methoden des niedrigstufigen Notiz-Handlers
  importEmbeddedImage: (noteRef, image) => Promise<{
    attachmentKey: string;
    attachmentItem: Zotero.Item;
    mimeType: string;
    bytes: number;
  }>,
}
```

### Bildverarbeitung (hostApi.images)

```ts
hostApi.images = {
  prepareForNoteEmbedding: (source, options?) => Promise<PreparedNoteImage>,
}
```

Wird verwendet, um Bilder in ein Format zur Einbettung in Notizen zu verarbeiten:

```js
const prepared = await hostApi.images.prepareForNoteEmbedding(filePath, {
  maxLongEdge: 720,
  targetBytes: 180 * 1024,
});

const result = await hostApi.notes.importEmbeddedImage(noteRef, prepared);
```

## Anhangs-Operationen (hostApi.attachments)

```ts
hostApi.attachments = {
  // Alle Methoden des niedrigstufigen Anhangs-Handlers
  // Einschließlich: Anhänge auflisten, Anhangspfade abrufen, Anhänge erstellen usw.
}
```

## Tag-Operationen (hostApi.tags)

```ts
hostApi.tags = {
  // Alle Methoden des niedrigstufigen Tag-Handlers
  // Einschließlich: Tags auflisten, Tags abrufen, Tags erstellen usw.
}
```

## Sammlungs-Operationen (hostApi.collections)

```ts
hostApi.collections = {
  // Alle Methoden des niedrigstufigen Sammlungs-Handlers
  // Einschließlich: Sammlungen auflisten, Untersammlungen abrufen usw.
}
```

## Datei-Operationen (hostApi.file)

```ts
hostApi.file = {
  readText: (path) => Promise<string>,                    // Textdatei lesen
  writeText: (path, content) => Promise<void>,            // Textdatei schreiben
  readBytes: (path) => Promise<Uint8Array>,               // Binärdatei lesen
  writeBytes: (path, bytes) => Promise<void>,             // Binärdatei schreiben
  copy: (source, target) => Promise<void>,                // Datei kopieren
  exists: (path) => Promise<boolean>,                     // Prüfen, ob Datei existiert
  makeDirectory: (path) => Promise<void>,                 // Verzeichnis erstellen (einschließlich übergeordneter Verzeichnisse)
  pathToFile: (path) => nsIFile,                          // Pfad in Zotero-Dateiobjekt konvertieren
  getTempDirectoryPath: () => string,                     // Temporäres Verzeichnis abrufen
  pickDirectory: (args?) => Promise<string | null>,       // Verzeichnis-Auswahldialog öffnen
  pickFile: (args?) => Promise<string | null>,            // Datei-Auswahldialog öffnen
  pickFiles: (args?) => Promise<string[] | null>,         // Mehrfachdatei-Auswahldialog öffnen
}
```

**Beispiel:**

```js
// Datei lesen
const content = await hostApi.file.readText("/path/to/file.md");

// Datei schreiben
await hostApi.file.writeText("/path/to/output.md", newContent);

// Verzeichnis-Auswahldialog öffnen, damit Benutzer Exportverzeichnis wählen kann
const dir = await hostApi.file.pickDirectory({
  title: "Exportverzeichnis auswählen",
});
if (dir) {
  // Benutzer hat ein Verzeichnis ausgewählt
  await hostApi.file.writeText(`${dir}/result.md`, content);
}
```

## Einstellungen (hostApi.prefs)

```ts
hostApi.prefs = {
  get: (key, global?) => unknown,      // Einstellung lesen
  set: (key, value, global?) => void,  // Einstellung schreiben
  clear: (key, global?) => void,       // Einstellung löschen
}
```

Das Präfix wird automatisch vom Plugin behandelt; Sie müssen nur den Schlüsselnamen übergeben.

**Beispiel:**

```js
// Konfiguration lesen
const vocab = hostApi.prefs.get("tagVocabularyJson");

// Konfiguration schreiben
hostApi.prefs.set("mySetting", "myValue");
```

## UI-Benachrichtigungen (hostApi.notifications)

```ts
hostApi.notifications = {
  toast: ({ text, type? }) => void,
}
// type: "default" | "success" | "error"
```

**Beispiel:**

```js
hostApi.notifications.toast({
  text: "Verarbeitung abgeschlossen!",
  type: "success",
});
```

## Laufzeit-Protokollierung (hostApi.logging)

```ts
hostApi.logging = {
  appendRuntimeLog: (input) => void,
}
```

Wird verwendet, um Diagnoseinformationen an den Laufzeit-Logger anzuhängen.

## Plugin-Konfiguration (hostApi.addon)

```ts
hostApi.addon = {
  getConfig: () => ({ addonName, addonRef, prefsPrefix }),
}
```

## API-Version (hostApi.version)

```ts
hostApi.version: number
```

Die aktuelle Host-API-Versionsnummer. Verwenden Sie diese, um sich beim Schreiben von Hooks, die versionsübergreifend kompatibel sein müssen, vor Breaking Changes zu schützen.

## Übergeordnete Element-Operationen (hostApi.parents)

```ts
hostApi.parents = {
  // Niedrigstufige Handler-Operationen für übergeordnete Elemente
}
```

Bietet niedrigstufigen Zugriff auf die Verwaltung übergeordneter Elemente. Bevorzugen Sie `hostApi.library` und `hostApi.mutations`, es sei denn, Sie benötigen die niedrigstufige Handler-Schnittstelle.

## Befehls-Operationen (hostApi.command)

```ts
hostApi.command = {
  // Niedrigstufige Befehls-Handler-Operationen
}
```

Niedrigstufige Schnittstelle für Befehlsausführung. Wird typischerweise in Workflow-Hooks nicht benötigt.

## Editor-Operationen (hostApi.editor)

```ts
hostApi.editor = {
  openSession: (args) => ReturnType<typeof openWorkflowEditorSession>,
  registerRenderer: (rendererId, renderer) => void,
  unregisterRenderer: (rendererId) => void,
}
```

Verwaltet Workflow-Editor-Sitzungen. `registerRenderer` und `unregisterRenderer` ermöglichen benutzerdefinierte Renderer für workflow-spezifische Ausgabeformate.

## Synthesis-Operationen (hostApi.synthesis)

```ts
hostApi.synthesis?: SynthesisService
```

Bietet Zugriff auf den Synthesis Workbench-Dienst (Themen, Konzepte, Tags, Zitierungsgraph usw.). Nur verfügbar, wenn das Synthesis-System initialisiert ist.

## Vollständiges Beispiel

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  const { hostApi, helpers } = runtime;

  // 1. Übergeordnetes Element auflösen
  const parentItem = helpers.resolveItemRef(parent);

  // 2. Artefakt aus Bundle lesen
  const markdownContent = await bundleReader.readText("result/output.md");

  // 3. In HTML-Notiz konvertieren
  const htmlContent = helpers.toHtmlNote("Verarbeitungsergebnis", markdownContent);

  // 4. Notiz erstellen
  const noteResult = await hostApi.mutations.execute({
    operation: "note.createChild",
    parentItem: parentItem.getField("id"),
    data: { content: htmlContent },
  });

  // 5. Tags hinzufügen
  await hostApi.mutations.execute({
    operation: "item.addTags",
    item: parentItem.getField("id"),
    data: { tags: ["processed"] },
  });

  // 6. Benutzer benachrichtigen
  hostApi.notifications.toast({
    text: `Verarbeitung abgeschlossen: ${parentItem.getField("title")}`,
    type: "success",
  });

  return { applied: true, noteId: noteResult.id };
}
```

## Nächste Schritte

- [Paketerstellung & Bereitstellung](packaging) — Benutzerdefinierte Workflows veröffentlichen
- [Debugging & Testen](debugging) — Workflow-Korrektheit verifizieren
