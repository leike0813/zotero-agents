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
## Nächste Schritte

- [Host-API-Referenz](#doc/workflows%2Fcustom%2Fhost-api) — Vollständige API zur manipulation von Zotero-Daten in Hooks
- [Manifest schreiben](#doc/workflows%2Fcustom%2Fmanifest) — Eingabeeinheitstypen des Workflows definieren
