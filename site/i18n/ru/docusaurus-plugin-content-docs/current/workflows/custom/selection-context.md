# Контекст выбора

Точный порядок выбранных элементов считывается при запуске процесса и фиксируется после всех страниц Broker. Изменение выбора между страницами завершает чтение ошибкой. Предпросмотр и выполнение используют один вход; явные и сохранённые входные данные содержат полные ссылки `{libraryId, key}`.

## Структура

`items` — упорядоченный массив с `kind`, `ref` и `itemType`; поля `title` и `parentRef` необязательны. Вложения могут содержать `filename`, `contentType`, `createdAt` и `fileState`. Нативных объектов, числовых ID элементов и локальных путей нет. Пустой выбор: `items: []`.

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

## Чтение в hooks

Hook обрабатывает подготовленную единицу и получает дополнительные сведения через `runtime.hostApi.library` по фиксированной ссылке. Продолжайте по `nextCursor`, пока `hasMore` истинно; не считывайте текущий выбор повторно.

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

## Файлы и правила

Локальная подготовка обращается к `library.getItemDetail(ref)` и использует `file.path` только при `file.state === "available"`. Выбор, данные задачи и сохранённые входные данные содержат ссылки. Недоступный файл вызывает ошибку подготовки.

Переход к родителю, удаление повторов и приоритет Markdown/PDF определяет именованный селектор `validateSelection`. MinerU обрабатывает только прямо выбранные PDF; выбор родителя раскрывает все подходящие PDF. `inputs.member` и `inputs.grouping` задают единицы ввода.

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

Пустой вход: `member.kind: "selection"`, `grouping.mode: "all"`, селектор `selection` и `trigger.requiresSelection: false`. Требования также должны допускать пустой выбор.

- [Host API](host-api)
- [Manifest](manifest#selection-validation)
