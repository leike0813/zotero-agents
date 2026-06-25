# Справочник API хоста

`runtime.hostApi` — это основной интерфейс для взаимодействия хуков workflow с Zotero. Он инкапсулирует полные операционные возможности для библиотек Zotero, элементов, файловых систем, настроек и многого другого.

## Операции с элементами (hostApi.items)

```ts
hostApi.items = {
  get: (ref) => Zotero.Item | null,          // Получить элемент по ссылке
  resolve: (ref) => Zotero.Item,             // То же, что и get, но выбрасывает ошибку, если элемент не существует
  getByLibraryAndKey: (libraryID, key) => Zotero.Item | null,  // Получить по ID библиотеки + Key
  getAll: () => Promise<Zotero.Item[]>,      // Получить все элементы
}
```

`ref` может быть объектом `Zotero.Item`, числовым ID или строковым Key.

**Пример:**

```js
// Получить элемент по ID
const item = hostApi.items.get(12345);

// Получить элемент по Key библиотеки
const item = hostApi.items.getByLibraryAndKey(1, "ABCD1234");
```

## Контекст (hostApi.context)

```ts
hostApi.context = {
  getCurrentView: () => ZoteroHostCurrentViewDto,  // Информация о текущем активном представлении
  getSelectedItems: () => ZoteroHostItemSummaryDto[],  // Список текущих выбранных элементов
}
```

**Пример:**

```js
const view = hostApi.context.getCurrentView();
// { libraryID: 1, selectedItems: [...], ... }

const selected = hostApi.context.getSelectedItems();
// [{ id, key, libraryID, title, ... }, ...]
```

## Операции с библиотекой (hostApi.library)

```ts
hostApi.library = {
  listItems: (args) => Promise<LibraryListResponse>,       // Постраничный список элементов
  searchItems: (args) => Promise<ItemSummaryDto[]>,        // Поиск элементов
  getItemDetail: (ref) => Promise<ItemDetailDto | null>,   // Получить подробную информацию об элементе
  getItemNotes: (ref, args?) => Promise<NoteDto[]>,        // Получить список заметок элемента
  getNoteDetail: (ref, args?) => Promise<NoteDetailChunkDto>, // Получить тело заметки
  listNotePayloads: (ref) => Promise<NotePayloadDto[]>,    // Список встроенных payload заметок
  getNotePayload: (ref, args?) => Promise<NotePayloadDto>, // Получить определённый payload
  getItemAttachments: (ref) => Promise<AttachmentDto[]>,   // Получить список вложений элемента
}
```

**Пример:**

```js
// Поиск элементов
const results = await hostApi.library.searchItems({
  query: "transformer",
  limit: 10,
});

// Получить заметки элемента
const notes = await hostApi.library.getItemNotes(ref);

// Получить вложения элемента
const attachments = await hostApi.library.getItemAttachments(ref);
```

## Операции мутации (hostApi.mutations)

Используются для создания, обновления и удаления данных в Zotero. Операции записи требуют одобрения пользователя (подтверждается в UI Zotero).

```ts
hostApi.mutations = {
  preview: (request) => Promise<MutationPreviewResponse>,   // Предпросмотр эффектов мутации
  execute: (request) => Promise<MutationExecuteResponse>,   // Выполнить мутацию
}
```

### Поддерживаемые операции мутации

| `operation` | Назначение | Описание |
|-------------|------------|----------|
| `item.updateFields` | Обновить поля элемента | Изменить заголовок, автора, дату и другие поля |
| `item.addTags` | Добавить теги | Добавить один или несколько тегов к элементу |
| `item.removeTags` | Удалить теги | Удалить указанные теги из элемента |
| `note.createChild` | Создать дочернюю заметку | Создать новую заметку под родительским элементом |
| `note.update` | Обновить заметку | Изменить содержимое существующей заметки |
| `note.upsertPayload` | Обновить встроенный payload | Обновить вложение payload workflow заметки |
| `literature.ingest` | Импортировать литературу | Импортировать статью в Zotero |
| `collection.addItems` | Добавить в коллекцию | Добавить элементы в коллекцию |
| `collection.removeItems` | Удалить из коллекции | Удалить элементы из коллекции |

**Пример: Создание заметки**

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

**Пример: Добавление тегов**

```js
await hostApi.mutations.execute({
  operation: "item.addTags",
  item: itemId,
  data: { tags: ["field:computer_science", "method:deep_learning"] },
});
```

## Операции с заметками (hostApi.notes)

```ts
hostApi.notes = {
  // ... Все методы из низкоуровневого обработчика заметок
  importEmbeddedImage: (noteRef, image) => Promise<{
    attachmentKey: string;
    attachmentItem: Zotero.Item;
    mimeType: string;
    bytes: number;
  }>,
}
```

### Обработка изображений (hostApi.images)

```ts
hostApi.images = {
  prepareForNoteEmbedding: (source, options?) => Promise<PreparedNoteImage>,
}
```

Используется для обработки изображений в формат, подходящий для встраивания в заметки:

```js
const prepared = await hostApi.images.prepareForNoteEmbedding(filePath, {
  maxLongEdge: 720,
  targetBytes: 180 * 1024,
});

const result = await hostApi.notes.importEmbeddedImage(noteRef, prepared);
```

## Операции с вложениями (hostApi.attachments)

```ts
hostApi.attachments = {
  // Все методы из низкоуровневого обработчика вложений
  // Включая: список вложений, получение путей к вложениям, создание вложений и т.д.
}
```

## Операции с тегами (hostApi.tags)

```ts
hostApi.tags = {
  // Все методы из низкоуровневого обработчика тегов
  // Включая: список тегов, получение тегов, создание тегов и т.д.
}
```

## Операции с коллекциями (hostApi.collections)

```ts
hostApi.collections = {
  // Все методы из низкоуровневого обработчика коллекций
  // Включая: список коллекций, получение подколлекций и т.д.
}
```

## Файловые операции (hostApi.file)

```ts
hostApi.file = {
  readText: (path) => Promise<string>,                    // Прочитать текстовый файл
  writeText: (path, content) => Promise<void>,            // Записать текстовый файл
  readBytes: (path) => Promise<Uint8Array>,               // Прочитать бинарный файл
  writeBytes: (path, bytes) => Promise<void>,             // Записать бинарный файл
  copy: (source, target) => Promise<void>,                // Копировать файл
  exists: (path) => Promise<boolean>,                     // Проверить существование файла
  makeDirectory: (path) => Promise<void>,                 // Создать каталог (включая родительские каталоги)
  pathToFile: (path) => nsIFile,                          // Преобразовать путь в объект файла Zotero
  getTempDirectoryPath: () => string,                     // Получить путь к временному каталогу
  pickDirectory: (args?) => Promise<string | null>,       // Открыть диалог выбора каталога
  pickFile: (args?) => Promise<string | null>,            // Открыть диалог выбора файла
  pickFiles: (args?) => Promise<string[] | null>,         // Открыть диалог выбора нескольких файлов
}
```

**Пример:**

```js
// Прочитать файл
const content = await hostApi.file.readText("/path/to/file.md");

// Записать файл
await hostApi.file.writeText("/path/to/output.md", newContent);

// Открыть диалог выбора каталога, чтобы пользователь выбрал каталог экспорта
const dir = await hostApi.file.pickDirectory({
  title: "Выберите каталог экспорта",
});
if (dir) {
  // Пользователь выбрал каталог
  await hostApi.file.writeText(`${dir}/result.md`, content);
}
```

## Настройки (hostApi.prefs)

```ts
hostApi.prefs = {
  get: (key, global?) => unknown,      // Прочитать настройку
  set: (key, value, global?) => void,  // Записать настройку
  clear: (key, global?) => void,       // Очистить настройку
}
```

Префикс автоматически обрабатывается плагином; вам нужно передать только имя ключа.

**Пример:**

```js
// Прочитать конфигурацию
const vocab = hostApi.prefs.get("tagVocabularyJson");

// Записать конфигурацию
hostApi.prefs.set("mySetting", "myValue");
```

## UI-уведомления (hostApi.notifications)

```ts
hostApi.notifications = {
  toast: ({ text, type? }) => void,
}
// type: "default" | "success" | "error"
```

**Пример:**

```js
hostApi.notifications.toast({
  text: "Обработка завершена!",
  type: "success",
});
```

## Журнал выполнения (hostApi.logging)

```ts
hostApi.logging = {
  appendRuntimeLog: (input) => void,
}
```

Используется для добавления диагностической информации в журнал выполнения.

## Конфигурация плагина (hostApi.addon)

```ts
hostApi.addon = {
  getConfig: () => ({ addonName, addonRef, prefsPrefix }),
}
```

## Версия API (hostApi.version)

```ts
hostApi.version: number
```

Текущий номер версии API хоста. Используйте для защиты от критических изменений при написании хуков, которым нужна совместимость между версиями плагина.

## Операции с родителями (hostApi.parents)

```ts
hostApi.parents = {
  // Операции низкоуровневого обработчика родительских элементов
}
```

Обеспечивает низкоуровневый доступ к управлению родительскими элементами. Предпочитайте использование `hostApi.library` и `hostApi.mutations`, если вам не нужен интерфейс низкоуровневого обработчика.

## Операции с командами (hostApi.command)

```ts
hostApi.command = {
  // Операции низкоуровневого обработчика команд
}
```

Низкоуровневый интерфейс для выполнения команд. Обычно не требуется в хуках workflow.

## Операции с редактором (hostApi.editor)

```ts
hostApi.editor = {
  openSession: (args) => ReturnType<typeof openWorkflowEditorSession>,
  registerRenderer: (rendererId, renderer) => void,
  unregisterRenderer: (rendererId) => void,
}
```

Управляет сессиями редактора workflow. `registerRenderer` и `unregisterRenderer` позволяют использовать пользовательские рендереры для специфичных для workflow форматов вывода.

## Операции синтеза (hostApi.synthesis)

```ts
hostApi.synthesis?: SynthesisService
```

Обеспечивает доступ к сервису Synthesis Workbench (темы, концепции, теги, граф цитирований и т.д.). Доступно только когда система синтеза инициализирована.

## Полный пример

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  const { hostApi, helpers } = runtime;

  // 1. Разрешить родительский элемент
  const parentItem = helpers.resolveItemRef(parent);

  // 2. Прочитать артефакт из пакета
  const markdownContent = await bundleReader.readText("result/output.md");

  // 3. Преобразовать в HTML-заметку
  const htmlContent = helpers.toHtmlNote("Результат обработки", markdownContent);

  // 4. Создать заметку
  const noteResult = await hostApi.mutations.execute({
    operation: "note.createChild",
    parentItem: parentItem.getField("id"),
    data: { content: htmlContent },
  });

  // 5. Добавить теги
  await hostApi.mutations.execute({
    operation: "item.addTags",
    item: parentItem.getField("id"),
    data: { tags: ["processed"] },
  });

  // 6. Уведомить пользователя
  hostApi.notifications.toast({
    text: `Обработка завершена: ${parentItem.getField("title")}`,
    type: "success",
  });

  return { applied: true, noteId: noteResult.id };
}
```

## Следующие шаги

- [Упаковка и развёртывание](packaging) — Опубликуйте пользовательские workflow
- [Отладка и тестирование](debugging) — Проверьте корректность workflow
