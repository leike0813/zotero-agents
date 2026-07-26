# Контекст выделения

Когда пользователь выбирает элементы в Zotero, плагин строит структурированный **контекст выделения (SelectionContext)**, который описывает, что выбрал пользователь и к какому типу относится каждый выбранный элемент. Этот контекст служит входной основой для хука `buildRequest`.

## Типы выделения

На основе комбинации выбранных типов элементов `selectionContext.selectionType` возвращает одно из следующих значений:

| Тип | Описание |
|-----|----------|
| `"parent"` | Все выбранные элементы являются родительскими элементами (элементами верхнего уровня) |
| `"child"` | Все выбранные элементы являются дочерними элементами (элементами не верхнего уровня) |
| `"attachment"` | Все выбранные элементы являются вложениями |
| `"note"` | Все выбранные элементы являются заметками |
| `"mixed"` | Выбранные элементы представляют собой смесь нескольких типов |
| `"none"` | Никакие элементы не выбраны |

## Структура контекста

```ts
selectionContext = {
  selectionType: "parent",       // Тип выделения
  items: {
    parents: [ /* Список родительских элементов */ ],
    children: [ /* Список дочерних элементов */ ],
    attachments: [ /* Список вложений */ ],
    notes: [ /* Список заметок */ ],
  },
  summary: {
    parentCount: 2,
    childCount: 0,
    attachmentCount: 0,
    noteCount: 0,
  },
  warnings: [],                  // Предупреждения
  sampledAt: "2026-01-15T...",   // Время создания контекста
}
```

Каждый тип элемента содержит богатую контекстную информацию.

### Родительский элемент (ParentContext)

Родительский элемент — это элемент верхнего уровня в библиотеке Zotero (например, статья журнала, книга, веб-страница и т.д.). Каждый контекст родительского элемента содержит:

```ts
{
  item: Zotero.Item,         // Объект элемента
  id: number,                // ID элемента
  title: string,             // Заголовок
  attachments: [             // Дочерние вложения под этим элементом
    { type, filePath, mimeType, dateAdded, ... }
  ],
  notes: [                   // Дочерние заметки под этим элементом
    { id, content, ... }
  ],
  tags: string[],            // Список тегов
  collections: string[],     // Содержащие коллекции
  children: [                // Другие дочерние элементы
    { id, type, ... }
  ],
}
```

### Вложение (AttachmentContext)

Вложение — это файловое вложение элемента (PDF, Markdown и т.д.). Каждый контекст вложения содержит:

```ts
{
  item: Zotero.Item,         // Объект элемента вложения
  id: number,                // ID элемента
  filePath: string,          // Локальный путь к файлу
  fileName: string,          // Имя файла
  mimeType: string,          // MIME-тип (например, "application/pdf")
  dateAdded: Date,           // Дата добавления
  parentItem: {              // Владелец родительского элемента
    id: number,
    key: string,
    libraryID: number,
  },
  tags: string[],
  collections: string[],
}
```

### Заметка (NoteContext)

```ts
{
  item: Zotero.Item,
  id: number,
  content: string,           // Содержимое заметки (HTML)
  parentItem: { id, key, libraryID },
  tags: string[],
}
```

## Использование контекста выделения в хуках

### Получение выбранных вложений

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

### Получение выбранных родительских элементов и их дочернего содержимого

```js
export function buildRequest({ selectionContext, runtime }) {
  const parents = selectionContext.items.parents;

  for (const parent of parents) {
    const title = parent.item.getField("title");
    const attachments = parent.attachments;  // Вложения под этим родительским элементом
    const notes = parent.notes;              // Заметки под этим родительским элементом
  }

  // ...
}
```

### Проверка типа выделения для определения поведения

```js
export function preflight({ selectionContext }) {
  const { selectionType } = selectionContext;

  if (selectionType === "none") {
    // Никакие элементы не выбраны, пропустить
    return { kind: "skip", reason: "no selected items" };
  }

  if (selectionType === "attachment") {
    // Пользователь выбрал только вложения, использовать логику обработки вложений
  } else if (selectionType === "parent") {
    // Пользователь выбрал только родительские элементы, расширить первое подходящее вложение
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
## Следующие шаги

- [Справочник API хоста](host-api) — Полный API для управления данными Zotero в хуках
- [Создание манифеста](manifest) — Определите типы единиц ввода workflow
