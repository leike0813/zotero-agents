# Contexte de sélection

La sélection exacte et ordonnée est acquise au déclenchement du workflow, puis verrouillée après toutes les pages du Broker. Un changement entre les pages fait échouer l’acquisition. L’aperçu et l’exécution utilisent cette même entrée ; les entrées explicites et persistées utilisent des références complètes `{libraryId, key}`.

## Structure

`items` est un tableau ordonné de faits avec `kind`, `ref` et `itemType`, et éventuellement `title` et `parentRef`. Les pièces jointes peuvent fournir `filename`, `contentType`, `createdAt` et `fileState`. Aucun objet natif, ID numérique d’élément ou chemin local. Une sélection vide vaut `items: []`.

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

## Lecture dans les hooks

Le hook consomme son unité préparée et lit les faits complémentaires via `runtime.hostApi.library` avec la référence verrouillée. Suivez `nextCursor` tant que `hasMore` est vrai ; ne relisez pas la sélection active.

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

## Fichiers et politiques

La préparation locale résout `library.getItemDetail(ref)` et utilise `file.path` uniquement si `file.state === "available"`. Les données de sélection, de tâche et persistées gardent les références. Un fichier indisponible fait échouer la préparation.

La promotion, la déduplication et la préférence Markdown/PDF appartiennent au sélecteur nommé de `validateSelection`. MinerU traite le PDF sélectionné directement ; un parent sélectionné développe tous ses PDF admissibles. `inputs.member` et `inputs.grouping` définissent les unités.

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

Pour une entrée vide : `member.kind: "selection"`, `grouping.mode: "all"`, sélecteur `selection` et `trigger.requiresSelection: false`. Les exigences doivent autoriser une sélection vide.

- [Host API](host-api)
- [Manifest](manifest#selection-validation)
