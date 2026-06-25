# Система хуков

Хуки — это точки расширения Workflow. На разных этапах выполнения Workflow Runtime плагина вызывает соответствующие скрипты хуков, позволяя вам вмешиваться в поток выполнения и управлять им с помощью JavaScript.

Workflow может содержать до **3 хуков**, из которых `applyResult` является единственным обязательным.

> **Примечание о фильтрации входных данных:** Старый хук `filterInputs` заменён декларативным механизмом `validateSelection`. Используйте `validateSelection` в `workflow.json` для определения ограничений входных данных без написания JavaScript. Подробности см. в разделе [Создание файла манифеста](manifest#selection-validation).

## Структура скрипта хука

Каждый скрипт хука представляет собой файл `.mjs` (ES Module), который экспортирует именованные функции:

```js
// hooks/buildRequest.mjs
export function buildRequest({ selectionContext, manifest, executionOptions, runtime }) {
  // Логика реализации
  return requestSpec;
}
```

## Контекст выполнения (runtime)

Все хуки получают параметр `runtime`, который предоставляет прямой доступ к Zotero и различным инструментам.

```js
runtime = {
  zotero,           // Глобальный объект Zotero
  handlers,         // Низкоуровневые обработчики данных
  hostApi,          // Высокоуровневый API хоста (рекомендуется)
  helpers,          // Вспомогательные утилитарные функции хуков
  addon,            // Конфигурация плагина

  workflowId,       // ID текущего workflow
  workflowRootDir,  // Абсолютный путь к каталогу, содержащему workflow.json
  workflowSourceKind, // "official" | "dev-local" | "user" | ""
  packageId,        // ID пакета-владельца (доступно только внутри пакетов workflow)
  packageRootDir,   // Абсолютный путь к корневому каталогу пакета

  hostApiVersion,   // Номер версии API хоста
  hookName,         // Имя текущего хука: "buildRequest" | "applyResult" | ""
  debugMode,        // Находится ли в режиме отладки

  fetch,            // Глобальный fetch (если доступен)
  Buffer,           // Node.js Buffer (если доступен)
  btoa,             // Кодирование Base64 (если доступно)
  atob,             // Декодирование Base64 (если доступно)
  TextEncoder,      // Кодировщик текста (если доступен)
  TextDecoder,      // Декодировщик текста (если доступен)
  FileReader,       // Читатель файлов (если доступен)
  navigator,        // Объект Navigator (если доступен)
}
```

**Рекомендация:** Предпочитайте `runtime.hostApi` (высокоуровневый API); используйте `runtime.handlers` или `runtime.zotero` только тогда, когда `hostApi` не удовлетворяет вашим потребностям.

## 1. buildRequest — Построение запроса

Когда декларативного `request` в `workflow.json` недостаточно для описания сложного запроса, используйте `buildRequest` для динамического формирования payload запроса.

**Сигнатура:**

```ts
function buildRequest({
  selectionContext,  // Отфильтрованный контекст выделения
  manifest,         // workflow.json
  executionOptions, // { workflowParams, providerOptions }
  runtime,          // Контекст выполнения
}): unknown
```

**Связь с декларативным запросом:** `buildRequest` является взаимоисключающим с полем `request` в `workflow.json`. Если существуют оба, `buildRequest` имеет приоритет.

**Пример: сквозной запрос**

```js
export function buildRequest({ selectionContext, executionOptions, runtime }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

**Пример: запрос многошаговой последовательности**

```js
export async function buildRequest({ selectionContext, executionOptions, runtime }) {
  const sourcePath = resolveAttachmentPath(selectionContext, runtime);
  const language = executionOptions?.workflowParams?.language || "en-US";

  return {
    kind: "skillrunner.sequence.v1",
    sequence: {
      steps: [
        {
          id: "step1",
          skill_id: "my-analysis-skill",
          mode: "auto",
          workspace: "new",
          parameter: { language, source_path: sourcePath },
        },
        {
          id: "step2",
          skill_id: "my-enrichment-skill",
          mode: "auto",
          workspace: "reuse-workflow",
          handoff: {
            bindings: [
              {
                kind: "value",
                source: "output_field_name",
                target: "/input/field_name",
                step: "step1",
              },
            ],
          },
        },
      ],
    },
  };
}
```

## 2. normalizeSettings — Нормализация параметров

Нормализуйте параметры перед сохранением настроек или перед выполнением.

**Сигнатура:** Этот хук получает разные параметры в зависимости от фазы:

```ts
function normalizeSettings(args: {
  // фаза persisted: когда параметры сохраняются в настройки
  phase: "persisted";
  workflowId: string;
  manifest: WorkflowManifest;
  previous: { backendId?, workflowParams?, providerOptions? };
  incoming: { backendId?, workflowParams?, providerOptions? };
  merged: { backendId?, workflowParams?, providerOptions? };
} | {
  // фаза execution: перед выполнением
  phase: "execution";
  workflowId: string;
  manifest: WorkflowManifest;
  rawWorkflowParams: Record<string, unknown>;
  normalizedWorkflowParams: Record<string, unknown>;
}): unknown
```

**Варианты использования:**

- Перекрёстная проверка между параметрами (например, когда опция A установлена в определённое значение, значение по умолчанию для опции B должно измениться)
- Обработка устаревших параметров (например, миграция старых параметров на новые версии)
- Очистка недействительных значений перед выполнением

## 3. applyResult — Обработка результата (обязательный)

Это **единственный обязательный хук** для workflow, отвечающий за запись результатов выполнения бэкенда в Zotero.

**Сигнатура:**

```ts
function applyResult({
  parent,           // Родительский элемент Zotero
  bundleReader,     // Читатель пакета результатов
  resultContext,    // Структурированный контекст результата
  sequenceStep,     // Метаданные шага последовательности (присутствуют в последовательных запусках)
  productStorage,   // API хранилища артефактов
  request,          // Исходный отправленный запрос
  runResult,        // Метаданные результата выполнения
  manifest,         // workflow.json
  runtime,          // Контекст выполнения
}): unknown

// форма sequenceStep:
// {
//   id: string;           // ID шага
//   index: number;        // Индекс с нулём в последовательности
//   workflowId: string;   // ID под-workflow для этого шага
//   skillId: string;      // ID навыка, выполненного на этом шаге
//   finalStep: boolean;   // Является ли этот шаг последним
//   phase: "sequence-step";
// }
```

**Использование bundleReader:**

```js
// Чтение файлов в пакете ZIP артефактов
const digestMd = await bundleReader.readText("artifacts/digest.md");

// Получение пути к извлечённому каталогу артефактов
const extractedDir = await bundleReader.getExtractedDir();
```

**Пример: запись заметок из пакета**

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  if (!parent) return { applied: false };

  const parentItem = runtime.helpers.resolveItemRef(parent);
  const digestMd = await bundleReader.readText("artifacts/digest.md");

  const htmlContent = runtime.helpers.toHtmlNote("Описание статьи", digestMd);
  const newNote = await runtime.hostApi.mutations.execute({
    operation: "note.createChild",
    parentItem: parentItem.getField("id"),
    data: { content: htmlContent },
  });

  return { applied: true, noteId: newNote.id };
}
```

**Пример: извлечение файлов из пакета на диск (в стиле MinerU)**

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  if (!parent) return { applied: false };

  const extractedDir = await bundleReader.getExtractedDir();
  const { file } = runtime.hostApi;

  const mdContent = await bundleReader.readText("full.md");
  const targetPath = `/path/to/output.md`;
  await file.writeText(targetPath, mdContent);

  return { applied: true, output_path: targetPath };
}
```

## Вспомогательные функции хуков (helpers)

`runtime.helpers` предоставляет набор вспомогательных функций:

| Функция | Описание |
|---------|----------|
| `getAttachmentParentId(entry)` | Получить ID родительского элемента вложения |
| `getAttachmentFilePath(entry)` | Получить локальный путь к файлу вложения |
| `getAttachmentFileName(entry)` | Получить имя файла вложения |
| `getAttachmentFileStem(entry)` | Получить имя файла вложения (без расширения) |
| `getAttachmentDateAdded(entry)` | Получить временную метку `dateAdded` вложения |
| `basenameOrFallback(path, fallback)` | Извлечь базовое имя или вернуть резервную строку |
| `isMarkdownAttachment(entry)` | Проверить, является ли вложение Markdown |
| `isPdfAttachment(entry)` | Проверить, является ли вложение PDF |
| `pickEarliestPdfAttachment(entries)` | Выбрать самый ранний PDF из списка вложений |
| `cloneSelectionContext(ctx)` | Глубоко скопировать контекст выделения |
| `withFilteredAttachments(ctx, items)` | Оставить в контексте только указанные вложения |
| `resolveItemRef(ref)` | Разрешить ссылку на элемент в Zotero.Item |
| `toHtmlNote(title, body)` | Преобразовать Markdown в содержимое HTML-заметки |
| `normalizeReferenceAuthors(value)` | Нормализовать список авторов ссылки |
| `normalizeReferenceEntry(entry, index)` | Нормализовать одну запись ссылки |
| `normalizeReferencesArray(value)` | Нормализовать массив ссылок |
| `normalizeReferencesPayload(payload)` | Нормализовать объект payload ссылок |
| `replacePayloadReferences(payload, refs)` | Заменить ссылки в payload |
| `resolveReferenceSource(entry)` | Разрешить поле source ссылки |
| `renderReferenceLocator(entry)` | Сформировать строку локатора том/выпуск/страницы |
| `renderReferencesTable(references)` | Отрисовать ссылки в виде HTML-таблицы |

## Следующие шаги

- [Контекст выделения](selection-context) — Подробная структура selectionContext
- [Справочник API хоста](host-api) — Полный справочник API
- [Упаковка и развёртывание](packaging) — Как упаковывать и развёртывать workflow
