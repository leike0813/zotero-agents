# Система параметров

Workflow могут определять настраиваемые параметры, которые вызывают диалоговое окно настроек для заполнения пользователем перед запуском. Система параметров поддерживает несколько типов и источники динамических данных.

## Определение параметров

Параметры определяются в поле `parameters` файла `workflow.json`:

```json
{
  "parameters": {
    "language": {
      "type": "string",
      "title": "Язык вывода",
      "description": "Выберите язык для содержимого вывода",
      "default": "en-US",
      "enum": ["en-US", "zh-CN", "ja-JP"],
      "allowCustom": true
    },
    "maxResults": {
      "type": "number",
      "title": "Максимальное количество результатов",
      "description": "Верхний предел количества возвращаемых результатов",
      "default": 10,
      "min": 1,
      "max": 100
    },
    "enableFilter": {
      "type": "boolean",
      "title": "Включить фильтрацию",
      "description": "Включить ли фильтрацию результатов",
      "default": true,
      "visible_if": { "parameter": "language", "equals": false }
    }
  }
}
```

## Типы параметров

| Тип | Описание | Применимый элемент управления |
|-----|----------|-------------------------------|
| `string` | Текстовая строка | Текстовое поле / выпадающий список / динамический селектор |
| `number` | Число | Числовой ввод (поддерживает ограничения min/max) |
| `boolean` | Логическое значение | Переключатель / флажок |

## Значения перечисления и пользовательские значения

```json
{
  "language": {
    "type": "string",
    "enum": ["en-US", "zh-CN", "ja-JP"],
    "allowCustom": true,
    "default": "en-US"
  }
}
```

- `enum`: Список предлагаемых предустановленных значений. Отображается как выбираемые опции в выпадающем меню
- `allowCustom` (только для типа string): Когда установлено в `true`, значения `enum` являются только рекомендациями; пользователи могут свободно вводить другие значения. Когда установлено в `false` или пропущено, пользователи могут выбирать только из `enum`

## Условное отображение

```json
{
  "advancedMode": {
    "type": "boolean",
    "title": "Расширенный режим",
    "default": false
  },
  "customEndpoint": {
    "type": "string",
    "title": "Пользовательская конечная точка",
    "visible_if": { "parameter": "advancedMode", "equals": true }
  }
}
```

`visible_if` контролирует показ/скрытие параметров в диалоговом окне настроек:

- `equals: true` — Отображать только когда значение целевого параметра истинно
- `equals: false` — Отображать только когда значение целевого параметра ложно

**Пример: связанный показ/скрытие**

```json
{
  "auto_tag_regulator": {
    "type": "boolean",
    "title": "Авторегулятор тегов",
    "default": true
  },
  "auto_tag_infer_tag": {
    "type": "boolean",
    "title": "Выводить теги",
    "default": true,
    "visible_if": { "parameter": "auto_tag_regulator", "equals": true }
  }
}
```

Когда `auto_tag_regulator` снят, параметр `auto_tag_infer_tag` автоматически скрывается.

## Источники динамических опций

Опции значений параметров могут поступать из живых данных Zotero:

```json
{
  "targetCollection": {
    "type": "string",
    "title": "Целевая коллекция",
    "default": "",
    "optionsSource": {
      "kind": "zotero.collections",
      "library": "current",
      "includeEmpty": true,
      "valueFormat": "collectionRef",
      "labelFormat": "path"
    }
  },
  "relatedTopic": {
    "type": "string",
    "title": "Связанная тема",
    "optionsSource": {
      "kind": "synthesis.topics",
      "filter": "updatable"
    }
  }
}
```

### Поддерживаемые источники опций

| `kind` | Описание | Доступные параметры |
|--------|----------|---------------------|
| `zotero.collections` | Список коллекций в текущей библиотеке Zotero | `library` (current/user/number), `includeEmpty`, `valueFormat` (collectionRef), `labelFormat` (path/title) |
| `synthesis.topics` | Список тем в Synthesis Workbench | `filter` (all/updatable), `valueFormat` (topicId), `labelFormat` (title) |

### Общие параметры optionsSource

| Параметр | Описание |
|----------|----------|
| `library` | Область библиотеки. `"current"` (текущая библиотека), `"user"` (библиотека пользователя), число (определённый ID библиотеки) |
| `includeEmpty` | Включать ли пустую опцию (для "без выбора") |
| `valueFormat` | Формат значений опций: `"collectionRef"` / `"topicId"` |
| `labelFormat` | Формат отображения меток опций: `"path"` / `"title"` |
| `allowStale` | Разрешить использование кэшированных данных (избежать повторного запроса при каждом открытии настроек) |
| `filter` | Условие фильтрации (варьируется по kind) |

## Ограничения для числовых параметров

```json
{
  "confidence": {
    "type": "number",
    "title": "Порог уверенности",
    "default": 0.8,
    "min": 0,
    "max": 1
  }
}
```

`min` и `max` ограничивают диапазон значений ввода.

## Чтение параметров в хуках

В `buildRequest`, `filterInputs` и `applyResult` вы можете читать значения параметров, установленных пользователем, через `executionOptions.workflowParams`:

```js
export function buildRequest({ executionOptions, runtime }) {
  const params = executionOptions?.workflowParams || {};
  const language = params.language || "en-US";
  const maxResults = params.maxResults || 10;

  return {
    kind: "skillrunner.job.v1",
    create: { skill_id: "my-skill" },
    parameter: { language, max_results: maxResults },
  };
}
```

## Локализация параметров

`title` и `description` параметров поддерживают локализацию:

```json
{
  "i18n": {
    "messages": {
      "zh-CN": {
        "parameters.language.title": "Язык",
        "parameters.language.description": "Выберите язык для содержимого вывода"
      }
    }
  }
}
```

Полный механизм локализации см. на странице [Локализация](#doc/workflows%2Fcustom%2Flocalization).

## Следующие шаги

- [Контекст выделения](#doc/workflows%2Fcustom%2Fselection-context) — Поймите, как выбор элементов пользователем передаётся в workflow
- [Типы запросов](#doc/workflows%2Fcustom%2Frequest-kinds) — Методы передачи параметров для различных типов запросов
