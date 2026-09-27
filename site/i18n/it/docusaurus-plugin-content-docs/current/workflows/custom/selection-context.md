# Contesto di selezione

La selezione esatta e ordinata viene acquisita all’avvio del workflow e fissata dopo tutte le pagine del Broker. Una modifica tra le pagine fa fallire l’acquisizione. Anteprima ed esecuzione condividono questa entrata; gli input espliciti e persistiti usano riferimenti completi `{libraryId, key}`.

## Struttura

`items` è un array ordinato con `kind`, `ref` e `itemType`, ed eventualmente `title` e `parentRef`. Gli allegati possono includere `filename`, `contentType`, `createdAt` e `fileState`. Non contiene oggetti nativi, ID numerici degli elementi o percorsi locali. Vuoto: `items: []`.

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

## Lettura nei hook

Il hook consuma la propria unità preparata e legge altri dati tramite `runtime.hostApi.library` con il riferimento fissato. Segui `nextCursor` finché `hasMore` è vero, senza rileggere la selezione attiva.

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

## File e criteri

La preparazione locale risolve `library.getItemDetail(ref)` e usa `file.path` solo se `file.state === "available"`. Selezione, dati del task e dati persistiti conservano riferimenti. Un file non disponibile fa fallire la preparazione.

Promozione, deduplicazione e preferenza Markdown/PDF appartengono al selettore in `validateSelection`. MinerU elabora esattamente i PDF selezionati; un elemento padre selezionato espande tutti i PDF idonei. `inputs.member` e `inputs.grouping` definiscono le unità.

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

Input vuoto: `member.kind: "selection"`, `grouping.mode: "all"`, selettore `selection` e `trigger.requiresSelection: false`. I requisiti devono consentirlo.

- [Host API](host-api)
- [Manifest](manifest#selection-validation)
