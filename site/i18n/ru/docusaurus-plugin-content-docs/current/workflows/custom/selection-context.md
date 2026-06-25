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
export function filterInputs({ selectionContext, runtime }) {
  const attachments = selectionContext.items.attachments;

  for (const attachment of attachments) {
    const filePath = runtime.helpers.getAttachmentFilePath(attachment);
    const fileName = runtime.helpers.getAttachmentFileName(attachment);
    // Обработка вложения
  }

  return selectionContext;
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
export function filterInputs({ selectionContext, runtime }) {
  const { selectionType } = selectionContext;

  if (selectionType === "none") {
    // Никакие элементы не выбраны, пропустить
    return null;
  }

  if (selectionType === "attachment") {
    // Пользователь выбрал только вложения, использовать логику обработки вложений
  } else if (selectionType === "parent") {
    // Пользователь выбрал только родительские элементы, расширить первое подходящее вложение
  }

  return selectionContext;
}
```

### Фильтрация вложений

Используйте `helpers.withFilteredAttachments` для обновления контекста выделения после обработки:

```js
export function filterInputs({ selectionContext, runtime }) {
  const { helpers } = runtime;

  // Оставить только PDF-вложения
  const pdfs = selectionContext.items.attachments.filter(
    a => helpers.isPdfAttachment(a)
  );

  // Оставить только родительские элементы, имеющие PDF-вложения из всех элементов
  const matched = selectionContext.items.parents.filter(parent => {
    return parent.attachments.some(
      a => helpers.isPdfAttachment(a)
    );
  });

  // Если совпадений нет, пропустить выполнение
  if (matched.length === 0) return null;

  // Обновить контекст отфильтрованным результатом
  return helpers.withFilteredAttachments(selectionContext, matched);
}
```

### Workflow, когда никакие элементы не выбраны

Когда `inputs.unit: "workflow"` и `trigger.requiresSelection: false`, workflow может быть запущен без выбора каких-либо элементов. В этом случае `selectionContext.selectionType` равен `"none"`, и все массивы в `items` пусты. Этот режим подходит для создания глобальных операций (например, "Создать синтез по теме").

## Декларативная проверка выделения

Если вашему workflow нужно только **пропускать элементы, которые уже имеют результаты**, или **фильтровать определённые типы входных данных**, вы можете использовать декларативное поле `validateSelection` без написания хука `filterInputs`.

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

Полную документацию см. в разделе [Создание манифеста](manifest#selection-validation).

> **Руководство по выделению:** Используйте декларативный `validateSelection` всякий раз, когда это возможно — он не требует ни JavaScript, ни обслуживания. Сложная логика выделения может быть реализована в хуке `buildRequest`.

## Следующие шаги

- [Справочник API хоста](host-api) — Полный API для управления данными Zotero в хуках
- [Создание манифеста](manifest) — Определите типы единиц ввода workflow
