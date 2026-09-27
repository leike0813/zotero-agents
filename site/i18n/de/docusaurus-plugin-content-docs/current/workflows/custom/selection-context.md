# Auswahlkontext

Die genaue, geordnete Auswahl wird beim Start des Workflows erfasst und nach allen Broker-Seiten festgeschrieben. Eine Änderung zwischen Seiten lässt die Erfassung fehlschlagen. Vorschau und Ausführung verwenden dieselbe Eingabe; explizite und gespeicherte Eingaben enthalten vollständige `{libraryId, key}`-Referenzen.

## Struktur

`items` ist ein geordnetes Array mit `kind`, `ref` und `itemType`, optional `title` und `parentRef`. Anhänge können `filename`, `contentType`, `createdAt` und `fileState` enthalten. Native Objekte, numerische Eintrags-IDs und lokale Pfade gehören nicht hinein. Leer: `items: []`.

```ts
const selectionContext = {
  items: [
    {
      kind: "attachment",
      ref: { libraryId: 1, key: "ATTACH01" },
      itemType: "attachment",
      title: "Paper.pdf",
      parentRef: { libraryId: 1, key: "PARENT01" },
    },
  ],
  sampledAt: "2026-09-06T00:00:00.000Z",
};
```

## Fakten in Hooks lesen

Der Hook verarbeitet seine vorbereitete Einheit. Weitere Fakten liest er mit der festgeschriebenen Referenz über `runtime.hostApi.library`. Bei `hasMore` dem `nextCursor` folgen; die aktuelle Auswahl nicht erneut erfassen.

```js
export async function buildRequest({ selectionContext, runtime }) {
  const refs = selectionContext.items.map((item) => item.ref);
  const details = [];
  for (const ref of refs) {
    details.push(await runtime.hostApi.library.getItemDetail(ref));
  }
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: { titles: details.map((detail) => detail.item.title || "") },
  };
}
```

## Dateien und Aufgabenregeln

Die lokale Vorbereitung löst `library.getItemDetail(ref)` auf und verwendet `file.path` nur bei `file.state === "available"`. Auswahl-, Aufgaben- und persistierte Daten behalten Referenzen. Fehlende Dateien lassen die Vorbereitung fehlschlagen.

Übergeordnete Einträge, Deduplizierung und Markdown/PDF-Priorität bestimmt der benannte Selektor in `validateSelection`. MinerU verarbeitet direkt ausgewählte PDFs genau; nur ausgewählte übergeordnete Einträge erweitern alle passenden PDFs. `inputs.member` und `inputs.grouping` definieren die Einheiten.

```json
{
  "inputs": {
    "member": { "kind": "attachment", "accepts": { "mime": ["application/pdf"] } },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "select": { "policy": "input-member", "source": "selected" },
    "filters": [{ "kind": "source-file-exists", "phase": "availability" }]
  }
}
```

Leere Eingabe: `member.kind: "selection"`, `grouping.mode: "all"`, Selektor `selection` und `trigger.requiresSelection: false`. Die Anforderungen müssen eine leere Auswahl zulassen.

- [Host API](host-api)
- [Manifest](manifest#selection-validation)
