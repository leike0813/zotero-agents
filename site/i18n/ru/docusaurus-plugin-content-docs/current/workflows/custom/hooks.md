# Система хуков

Хуки — это точки расширения Workflow. На разных этапах выполнения Workflow Runtime плагина вызывает соответствующие скрипты хуков, позволяя вам вмешиваться в поток выполнения и управлять им с помощью JavaScript.

Workflow может содержать до **4 хуков**, из которых `applyResult` является единственным обязательным.

> **Примечание о фильтрации входных данных:** Старый хук `filterInputs` заменён декларативным механизмом `validateSelection`. Используйте `validateSelection` в `workflow.json` для определения ограничений входных данных без написания JavaScript. Подробности см. в разделе [Создание файла манифеста](manifest#selection-validation).

## Структура скрипта хука

Каждый скрипт хука представляет собой файл `.mjs` (ES Module), который экспортирует именованные функции:

```js
// hooks/buildRequest.mjs
export function buildRequest({ selectionContext, preflight, manifest, executionOptions, runtime }) {
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
  hookName,         // Имя текущего хука: "preflight" | "buildRequest" | "applyResult" | ""
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
  preflight,         // Необязательный preflight-план/unit/контекст
  manifest,         // workflow.json
  executionOptions, // { workflowParams, providerOptions }
  runtime,          // Контекст выполнения
}): unknown
```

**Связь с декларативным запросом:** `buildRequest` является взаимоисключающим с полем `request` в `workflow.json`. Если существуют оба, `buildRequest` имеет приоритет.

Когда workflow объявляет `hooks.preflight`, runtime передаёт нормализованный preflight-контекст в `buildRequest` как `preflight`. Этот контекст не сливается с `selectionContext`; рассматривайте его как отдельные метаданные планирования выполнения.

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

**Пример: запрос с использованием контекста preflight unit**

```js
export async function buildRequest({ selectionContext, preflight, runtime }) {
  const selected = selectionContext.items.find((item) => item.kind === "attachment");
  if (!selected) throw new Error("Source attachment is required");
  const detail = await runtime.hostApi.library.getItemDetail(selected.ref);
  if (detail.kind !== "attachment" || detail.item.file.state !== "available") {
    throw new Error("Source attachment file is unavailable");
  }
  return {
    kind: "generic-http.steps.v1",
    file: {
      path: detail.item.file.path,
      page_ranges: preflight?.unit?.context?.page_ranges,
    },
  };
}
```

**Пример: запрос многошаговой последовательности**

```js
export async function buildRequest({ selectionContext, executionOptions, runtime }) {
  const selected = selectionContext.items.find((item) => item.kind === "attachment");
  if (!selected) throw new Error("Source attachment is required");
  const detail = await runtime.hostApi.library.getItemDetail(selected.ref);
  if (detail.kind !== "attachment" || detail.item.file.state !== "available") {
    throw new Error("Source attachment file is unavailable");
  }
  const sourcePath = detail.item.file.path;
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

## 2. preflight — Планирование или сокращённое выполнение

`preflight` выполняется после декларативного разрешения выделения и перед `buildRequest` или построением декларативного запроса. Используйте его для лёгких локальных решений, которым нужна разрешённая входная единица, но которые не должны участвовать в активации меню.

`preflight` не должен записывать данные в Zotero, не должен строить запросы к провайдеру и не должен заменять `validateSelection`. Все записи в Zotero по-прежнему относятся к `applyResult`, а все payload запросов к провайдеру — к `buildRequest` или полю `request` манифеста.

**Сигнатура:**

```ts
function preflight({
  selectionContext,  // Контекст разрешённой входной единицы
  parent,            // Родительский элемент для текущей единицы, если доступен
  attachment,        // Элемент вложения для текущей единицы, если доступен
  note,              // Элемент заметки для текущей единицы, если доступен
  manifest,          // workflow.json
  executionOptions,  // { workflowParams, providerOptions }
  runtime,           // Контекст выполнения
}): PreflightOutcome
```

**Результат: Continue**

Продолжить с обычным построением запроса и, при необходимости, прикрепить контекст планирования:

```js
export async function preflight({ parent }) {
  return {
    kind: "continue",
    context: {
      doi: parent?.DOI || "",
      source: "selected-parent",
    },
  };
}
```

`context` доступен как `preflight.context` в `buildRequest` и как `resultContext.preflight.context` в `applyResult`.

**Результат: Skip**

Пропустить только текущую входную единицу:

```js
export function preflight({ parent }) {
  if (!parent?.DOI) {
    return { kind: "skip", reason: "missing DOI" };
  }
  return { kind: "continue" };
}
```

Если все входные единицы пропущены, выполнение завершается без отправки задач провайдеру.

**Результат: Short-Circuit Apply**

Пропустить выполнение провайдера и напрямую вызвать стандартный путь `applyResult`:

```js
export async function preflight({ parent, runtime }) {
  const metadata = await lookupMetadataLocally(parent?.DOI, runtime);
  if (!metadata) {
    return { kind: "continue" };
  }
  return {
    kind: "short-circuit-apply",
    apply: {
      result: { ok: true, source: "local-metadata", item: metadata },
      request: { kind: "local.metadata.preflight.v1" },
      runResult: { status: "success" },
    },
    context: { source: "local-metadata" },
  };
}
```

Это полезно для workflow, таких как куратор метаданных: если поиск по доверенному идентификатору успешен локально, `applyResult` может обновить родительский элемент без вызова бэкенда. Если поиск не дал результатов или качество низкое, верните `continue` и позвольте `buildRequest` построить обычный запрос к бэкенду.

**Результат: Replace Units**

Заменить одну разрешённую входную единицу несколькими виртуальными единицами запроса:

```js
export function preflight({ attachment }) {
  const chunks = [
    { id: "part-1", order: 0, context: { page_ranges: "1-200" } },
    { id: "part-2", order: 1, context: { page_ranges: "201-360" } },
  ];
  return {
    kind: "replace-units",
    units: chunks,
  };
}
```

Каждая виртуальная единица проходит через обычный путь `buildRequest`. Специфичный для единицы контекст доступен через `preflight.unit.context`.

**Агрегированное одиночное применение (Aggregate Single Apply)**

Для workflow с разделением входных данных, которым необходимо объединить несколько результатов провайдера в одну финальную запись в Zotero, добавьте агрегированный план:

```js
export function preflight() {
  return {
    kind: "replace-units",
    units: [
      { id: "part-1", order: 0, context: { page_ranges: "1-200" } },
      { id: "part-2", order: 1, context: { page_ranges: "201-360" } },
    ],
    aggregate: {
      id: "pdf-pages",
      mode: "single-apply",
      applyWhen: "all-succeeded",
      orderBy: "unit.order",
    },
  };
}
```

В v1 агрегированное применение поддерживает только `mode: "single-apply"`, `applyWhen: "all-succeeded"` и `orderBy: "unit.order"`. Дочерние задачи провайдера собираются, и `applyResult` вызывается однократно после успешного завершения всех дочерних задач. Если любая дочерняя задача завершается ошибкой, частичное агрегированное применение не выполняется.

## 3. normalizeSettings — Нормализация параметров

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

## 4. applyResult — Обработка результата (обязательный)

Это **единственный обязательный хук** для workflow, отвечающий за запись результатов выполнения бэкенда в Zotero.

**Сигнатура:**

```ts
function applyResult({
  parent,           // Родительский элемент Zotero
  bundleReader,     // Читатель пакета результатов
  resultContext,    // Структурированный контекст результата, включая метаданные preflight/aggregate
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

Когда объявлен `preflight`, `resultContext.preflight` предоставляет план выполнения, id единицы, контекст единицы и общий контекст для текущего вызова `applyResult`. `selectionContext` не изменяется preflight.

Когда `replace-units` использует `aggregate.single-apply`, `resultContext.aggregate.children` содержит упорядоченные дочерние результаты:

```ts
resultContext.aggregate.children = [
  {
    unitId: "part-1",
    order: 0,
    request,
    runResult,
    resultContext,
    bundleReader,
  },
  {
    unitId: "part-2",
    order: 1,
    request,
    runResult,
    resultContext,
    bundleReader,
  },
];
```

Агрегированный `applyResult` должен читать каждый дочерний бандл из `child.bundleReader`, объединять артефакты по порядку и записывать финальный результат в Zotero однократно. Например, workflow в стиле MinerU может отправить один PDF в виде нескольких задач `page_ranges`, а затем объединить файлы `full.md` и неймспейсить пути изображений перед созданием одного финального вложения Markdown.

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

  const htmlContent = runtime.helpers.toHtmlNote("Paper Digest", digestMd);
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
| `basenameOrFallback(path, fallback)` | Извлечь базовое имя или вернуть резервную строку |
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
