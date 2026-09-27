# Contexto de selección

La selección exacta y ordenada se obtiene al iniciar el flujo y se fija al completar todas las páginas del Broker. Un cambio entre páginas hace fallar la adquisición. La vista previa y la ejecución comparten esa entrada; las entradas explícitas y persistidas usan referencias completas `{libraryId, key}`.

## Estructura

`items` es un arreglo ordenado con `kind`, `ref` e `itemType`, y opcionalmente `title` y `parentRef`. Los adjuntos pueden incluir `filename`, `contentType`, `createdAt` y `fileState`. No contiene objetos nativos, IDs numéricos de elementos ni rutas locales. Vacío: `items: []`.

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

## Leer datos en hooks

El hook consume su unidad preparada. Lee datos adicionales mediante `runtime.hostApi.library` con la referencia fijada. Sigue `nextCursor` mientras `hasMore` sea verdadero, sin volver a leer la selección activa.

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

## Archivos y políticas

La preparación local resuelve `library.getItemDetail(ref)` y usa `file.path` solo si `file.state === "available"`. Los datos de selección, tarea y persistencia conservan referencias. Un archivo no disponible hace fallar la preparación.

La promoción, deduplicación y preferencia Markdown/PDF pertenecen al selector de `validateSelection`. MinerU procesa exactamente los PDF seleccionados; al seleccionar un padre expande todos sus PDF admisibles. `inputs.member` e `inputs.grouping` definen las unidades.

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

Entrada vacía: `member.kind: "selection"`, `grouping.mode: "all"`, selector `selection` y `trigger.requiresSelection: false`. Los requisitos deben permitirla.

- [Host API](host-api)
- [Manifest](manifest#selection-validation)
