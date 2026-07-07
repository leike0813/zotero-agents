# Auswahlkontext

Wenn ein Benutzer Elemente in Zotero auswählt, erstellt das Plugin einen strukturierten **Auswahlkontext (SelectionContext)**, der beschreibt, was der Benutzer ausgewählt hat und welchem Typ jedes ausgewählte Element angehört. Dieser Kontext dient als Eingabegrundlage für den `buildRequest`-Hook.

## Auswahltypen

Basierend auf der Kombination der ausgewählten Elementtypen gibt `selectionContext.selectionType` einen der folgenden Werte zurück:

| Typ | Beschreibung |
|-----|-------------|
| `"parent"` | Alle ausgewählten Elemente sind übergeordnete Elemente (Elemente der obersten Ebene) |
| `"child"` | Alle ausgewählten Elemente sind Kindelemente (nicht der obersten Ebene) |
| `"attachment"` | Alle ausgewählten Elemente sind Anhänge |
| `"note"` | Alle ausgewählten Elemente sind Notizen |
| `"mixed"` | Ausgewählte Elemente sind eine Mischung mehrerer Typen |
| `"none"` | Keine Elemente sind ausgewählt |

## Kontextstruktur

```ts
selectionContext = {
  selectionType: "parent",       // Auswahltyp
  items: {
    parents: [ /* Liste der übergeordneten Elemente */ ],
    children: [ /* Liste der Kindelemente */ ],
    attachments: [ /* Liste der Anhänge */ ],
    notes: [ /* Liste der Notizen */ ],
  },
  summary: {
    parentCount: 2,
    childCount: 0,
    attachmentCount: 0,
    noteCount: 0,
  },
  warnings: [],                  // Warnmeldungen
  sampledAt: "2026-01-15T...",   // Kontexterstellungszeit
}
```

Jede Art von Element enthält reichhaltige Kontextinformationen.

### Übergeordnetes Element (ParentContext)

Ein übergeordnetes Element ist ein Element der obersten Ebene in der Zotero-Bibliothek (z. B. Zeitschriftenartikel, Buch, Webseite usw.). Jeder übergeordnete Elementkontext enthält:

```ts
{
  item: Zotero.Item,         // Elementobjekt
  id: number,                // Element-ID
  title: string,             // Titel
  attachments: [             // Kind-Anhänge unter diesem Element
    { type, filePath, mimeType, dateAdded, ... }
  ],
  notes: [                   // Kind-Notizen unter diesem Element
    { id, content, ... }
  ],
  tags: string[],            // Tag-Liste
  collections: string[],     // Enthaltende Sammlungen
  children: [                // Andere Kindelemente
    { id, type, ... }
  ],
}
```

### Anhang (AttachmentContext)

Ein Anhang ist ein Datei-Anhang eines Elements (PDF, Markdown usw.). Jeder Anhangskontext enthält:

```ts
{
  item: Zotero.Item,         // Anhangs-Elementobjekt
  id: number,                // Element-ID
  filePath: string,          // Lokaler Dateipfad
  fileName: string,          // Dateiname
  mimeType: string,          // MIME-Typ (z. B. "application/pdf")
  dateAdded: Date,           // Hinzufügedatum
  parentItem: {              // Besitzendes übergeordnetes Element
    id: number,
    key: string,
    libraryID: number,
  },
  tags: string[],
  collections: string[],
}
```

### Notiz (NoteContext)

```ts
{
  item: Zotero.Item,
  id: number,
  content: string,           // Notizinhalt (HTML)
  parentItem: { id, key, libraryID },
  tags: string[],
}
```

## Auswahlkontext in Hooks verwenden

### Ausgewählte Anhänge abrufen

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

### Ausgewählte übergeordnete Elemente und ihre Kindinhalte abrufen

```js
export function buildRequest({ selectionContext, runtime }) {
  const parents = selectionContext.items.parents;

  for (const parent of parents) {
    const title = parent.item.getField("title");
    const attachments = parent.attachments;  // Anhänge unter diesem übergeordneten Element
    const notes = parent.notes;              // Notizen unter diesem übergeordneten Element
  }

  // ...
}
```

### Auswahltyp prüfen, um das Verhalten zu bestimmen

```js
export function preflight({ selectionContext }) {
  const { selectionType } = selectionContext;

  if (selectionType === "none") {
    // Keine Elemente ausgewählt, überspringen
    return { kind: "skip", reason: "no selected items" };
  }

  if (selectionType === "attachment") {
    // Benutzer hat nur Anhänge ausgewählt, Anhangsverarbeitungslogik verwenden
  } else if (selectionType === "parent") {
    // Benutzer hat nur übergeordnete Elemente ausgewählt, ersten passenden Anhang erweitern
  }

  return { kind: "continue", context: { selectionType } };
}
```

### Anhänge filtern

Verwenden Sie deklaratives `validateSelection` für gängige Anhangsfilterung:

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

Für laufzeitabhängige Entscheidungen, die von der aufgelösten Unit abhängen, verwenden Sie `preflight`, um zu überspringen oder fortzusetzen:

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

### Workflows, wenn keine Elemente ausgewählt sind

Wenn `inputs.unit: "workflow"` und `trigger.requiresSelection: false`, kann der Workflow ohne ausgewählte Elemente ausgelöst werden. In diesem Fall ist `selectionContext.selectionType` `"none"`, und alle Arrays in `items` sind leer. Dieser Modus eignet sich zum Erstellen globaler Operationen (z. B. "Topic Synthesis erstellen").

## Deklarative Auswahlvalidierung

Wenn Ihr Workflow nur **Elemente überspringen muss, die bereits Ergebnisse haben** oder **bestimmte Eingabetypen filtern** muss, verwenden Sie das deklarative `validateSelection`-Feld, ohne einen JavaScript-Hook zu schreiben.

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

Siehe die vollständige Dokumentation in [Manifest schreiben](manifest#selection-validation).

> **Auswahlleitfaden:** Verwenden Sie wann immer möglich die deklarative `validateSelection` — sie erfordert kein JavaScript und keine Wartung. Komplexe Auswahllogik kann im `buildRequest`-Hook implementiert werden.

## Nächste Schritte

- [Host-API-Referenz](host-api) — Vollständige API zur manipulation von Zotero-Daten in Hooks
- [Manifest schreiben](manifest) — Eingabeeinheitstypen des Workflows definieren
