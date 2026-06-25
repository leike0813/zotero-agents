# Создание манифеста Workflow

`workflow.json` — это файл манифеста для workflow, определяющий все его метаданные и поведение. Workflow Manager обнаруживает и загружает workflow через этот файл.

## Базовая структура

```json
{
  "id": "my-workflow",
  "label": "My Workflow",
  "version": "1.0.0",
  "provider": "pass-through",
  "display": {
    "core": false,
    "emoji": "🔧"
  },
  "inputs": { "unit": "parent" },
  "parameters": {},
  "execution": {},
  "request": { "kind": "pass-through.run.v1" },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

## Справочник полей

### Базовая идентификация

| Поле | Обязательно | Тип | Описание |
|------|-------------|-----|----------|
| `id` | ✅ | string | Уникальный идентификатор; не должен дублироваться. Рекомендуется kebab-case |
| `label` | ✅ | string | Отображаемое имя, видимое пользователю |
| `version` | | string | Семантический номер версии, например, `"1.0.0"` |
| `provider` | ✅ | string | Тип бэкенда. Доступные значения см. ниже |

### Значения Provider

| Значение | Описание |
|----------|----------|
| `"pass-through"` | Чисто локальное выполнение, бэкенд не требуется. Подходит для файловых операций, экспорта и т.д. |
| `"skillrunner"` | Выполнение навыков через бэкенд Skill-Runner |
| `"acp"` | Выполнение навыков через бэкенд ACP |
| `"generic-http"` | Вызов API через бэкенд Generic HTTP |

`provider` определяет, с какими типами бэкендов совместим workflow, а также какие бэкенды отображаются как исполняемые в Dashboard.

### Управление отображением

```json
{
  "display": {
    "core": true,
    "emoji": "📊"
  },
  "taskNameTemplate": "Обработка: {query}",
  "debug_only": false
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `display.core` | boolean | Отметить как основной workflow (приоритетное отображение в Dashboard с значком основного) |
| `display.emoji` | string | Иконка-префикс отображаемого имени, например, `"📖"` |
| `taskNameTemplate` | string | Шаблон имени задачи, использующий заполнители `{имя параметра}`, заменяемые фактическими значениями во время выполнения |
| `debug_only` | boolean | Когда `true`, отображается только в режиме отладки |

### Определение входных данных

```json
{
  "inputs": {
    "unit": "attachment",
    "accepts": {
      "mime": ["text/markdown", "text/x-markdown", "application/pdf"]
    },
    "per_parent": {
      "min": 1,
      "max": 1
    }
  }
}
```

| Поле | Описание |
|------|----------|
| `unit` | **Тип единицы входных данных**. `"attachment"` (вложение), `"parent"` (родительский элемент), `"note"` (заметка), `"workflow"` (выбор элементов не требуется, запускается непосредственно из Dashboard) |
| `accepts.mime` | Принимаемые MIME-типы (применимо только когда `unit: "attachment"`). Если не указано, принимаются все типы |
| `per_parent.min` | Минимальное количество вложений на родительский элемент |
| `per_parent.max` | Максимальное количество вложений на родительский элемент |

Когда `unit: "workflow"`, для запуска не требуются выбранные пользователем элементы (например, "Создать синтез по теме").

### <a id="selection-validation"></a>validateSelection — Проверка выделения

`validateSelection` — это декларативная проверка выделения. Она покрывает распространённые сценарии, такие как "пропуск элементов, которые уже имеют результаты" или "приём только выделений определённых типов" — без написания JavaScript.

```json
{
  "validateSelection": {
    "select": {
      "policy": "literature-source"
    },
    "require": {
      "counts": {
        "parents": 1
      },
      "allowMixed": false
    },
    "exclude": [
      {
        "kind": "generated-notes-all",
        "noteKinds": ["digest", "references", "citation-analysis"]
      }
    ]
  }
}
```

### `select` — Политика выделения

| Поле | Тип | Описание |
|------|-----|----------|
| `select.policy` | string | Политика выделения. Поддерживаемые значения ниже |
| `select.unit` | string | Переопределить единицу ввода для проверки выделения. `"attachment"` / `"parent"` / `"note"` / `"workflow"` |

**Поддерживаемые значения `select.policy`:**

| Политика | Описание |
|----------|----------|
| `input-unit` | Принимать элементы, соответствующие единице ввода |
| `literature-source` | Принимать источники литературы (вложения или родительские элементы с расширяемыми вложениями) |
| `pdf-attachment` | Принимать только PDF-вложения |
| `selected-parent` | Принимать родительские элементы из выделения |
| `generated-note-candidates` | Принимать элементы-кандидаты для генерации заметок |
| `digest-representative-image` | Целевые элементы для извлечения репрезентативного изображения |

### `require` — Требования к выделению

| Поле | Тип | Описание |
|------|-----|----------|
| `require.counts.parents` | number | Минимальное требуемое количество родительских элементов |
| `require.counts.attachments` | number | Минимальное требуемое количество элементов-вложений |
| `require.counts.notes` | number | Минимальное требуемое количество элементов-заметок |
| `require.counts.children` | number | Минимальное требуемое количество дочерних элементов |
| `require.counts.total` | number | Минимальное общее требуемое количество элементов |
| `require.allowMixed` | boolean | Разрешено ли смешивание разных типов элементов в выделении |

### `exclude` — Правила исключения

| Поле | Тип | Описание |
|------|-----|----------|
| `exclude[]` | array | Список правил исключения. Если какое-либо правило совпадает, текущий элемент пропускается |

**Поддерживаемые значения `exclude.kind`:**

| kind | Описание | Дополнительные параметры |
|------|----------|--------------------------|
| `generated-notes-all` | Элемент уже имеет сгенерированные заметки указанного типа | `noteKinds`: список типов заметок, например, `["digest", "references", "citation-analysis"]` |
| `artifact-exists` | Элемент уже имеет указанный артефакт (чтобы избежать избыточного выполнения) | `target`: `"deep-reading-html"` / `"translator-markdown"` / `"mineru-markdown"`; `parameter`: необязательный параметр языка для сопоставления артефактов |

### `derive` — Производные выделения

| Поле | Тип | Описание |
|------|-----|----------|
| `derive[]` | array | Операции производного выделения. `"exportCandidates"` — вывести кандидатов для экспорта заметок; `"digestRepresentativeImageTarget"` — вывести цели репрезентативного изображения из заметок дайджеста |

**Пример:**

```json
{
  "validateSelection": {
    "select": { "policy": "literature-source" },
    "exclude": [
      { "kind": "artifact-exists", "target": "deep-reading-html" }
    ]
  }
}
```

> В этом примере элементы, которые уже имеют HTML-артефакт глубокого чтения, автоматически пропускаются, не требуя ручной фильтрации пользователем.

### Управление запуском

```json
{
  "trigger": {
    "requiresSelection": false
  }
}
```

| Поле | Описание |
|------|----------|
| `requiresSelection` | Требуются ли выбранные пользователем элементы для запуска. По умолчанию `true`. Когда установлено в `false`, workflow может быть запущен из Dashboard без выбора каких-либо элементов. Обычно устанавливается в `false`, когда `inputs.unit: "workflow"` |

### Управление выполнением

```json
{
  "execution": {
    "timeout_ms": 600000,
    "poll_interval_ms": 2000,
    "mcp": {
      "requiredTools": ["search_items", "get_item_detail"]
    },
    "zoteroHostAccess": {
      "required": false,
      "allowWriteApprovalBypass": false
    },
    "feedback": {
      "showNotifications": true
    }
  }
}
```

| Поле | Описание |
|------|----------|
| `timeout_ms` | Таймаут в миллисекундах (эффективен только для бэкендов Generic HTTP) |
| `poll_interval_ms` | Интервал опроса в миллисекундах, контролирует частоту проверки прогресса |
| `mcp.requiredTools` | MCP-инструменты, требуемые этим workflow (массив строк имён инструментов) |
| `zoteroHostAccess.required` | Требуется ли доступ к хосту Zotero (для чтения/записи данных библиотеки) |
| `zoteroHostAccess.allowWriteApprovalBypass` | Разрешён ли обход подтверждения операций записи |
| `feedback.showNotifications` | Показывать ли уведомления о выполнении. По умолчанию `true`; установите в `false` для тихого выполнения |

> **Режим выполнения** (`auto` / `interactive`) перемещён в `request.create.mode` — см. [Типы запросов](#doc/workflows%2Fcustom%2Frequest-kinds).

### Получение результатов

```json
{
  "result": {
    "fetch": { "type": "bundle" },
    "final_step_id": "finalize",
    "expects": {
      "result_json": "result/result.json",
      "artifacts": [
        "result/artifact1",
        "result/artifact2"
      ]
    }
  }
}
```

| Поле | Описание |
|------|----------|
| `fetch.type` | Метод получения. `"bundle"` (загрузить пакет zip), `"result"` (получить только JSON результата) |
| `final_step_id` | Для workflow последовательности указывает id последнего шага, используемый для определения окончательного результата |
| `expects.result_json` | Ожидаемый путь к файлу JSON результата (относительно рабочего пространства выполнения) |
| `expects.artifacts` | Список ожидаемых путей к файлам артефактов |

### Определение запроса

Декларативное определение запроса, **взаимоисключающее** с `hooks.buildRequest` (если существуют оба, `hooks.buildRequest` имеет приоритет).

```json
{
  "request": {
    "kind": "skillrunner.job.v1",
    "create": {
      "skill_id": "my-skill",
      "skill_source": "local-package"
    },
    "input": {
      "upload": {
        "files": [
          { "key": "source", "from": "selected.markdown" }
        ]
      }
    },
    "poll": {
      "interval_ms": 2000,
      "timeout_ms": 600000
    }
  }
}
```

Для подробной информации по каждому `kind` см. [Типы запросов](#doc/workflows%2Fcustom%2Frequest-kinds).

### Объявление хуков

```json
{
  "hooks": {
    "buildRequest": "hooks/buildRequest.mjs",
    "normalizeSettings": "hooks/normalizeSettings.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

| Поле | Обязательно | Описание |
|------|-------------|----------|
| `applyResult` | ✅ | **Обязательный**. Путь к скрипту для обработки результатов после выполнения |
| `buildRequest` | | Необязательный. Построить запрос для отправки бэкенду. Взаимоисключающий с полем `request` |
| `normalizeSettings` | | Необязательный. Нормализовать установленные пользователем параметры |

> **Фильтрация входных данных** заменена декларативным механизмом `validateSelection` — см. [Проверка выделения](#selection-validation) ниже.

Пути относительно каталога, содержащего `workflow.json`.

### Локализация

```json
{
  "i18n": {
    "defaultLocale": "en-US",
    "messages": {
      "zh-CN": {
        "label": "My Workflow",
        "parameters.language.title": "Язык"
      }
    }
  }
}
```

Подробную информацию см. на странице [Локализация](#doc/workflows%2Fcustom%2Flocalization).

### Полный пример: Workflow анализа литературы с параметрами

```json
{
  "id": "my-literature-analysis",
  "label": "My Literature Analysis",
  "version": "1.0.0",
  "provider": "skillrunner",
  "display": { "emoji": "📄" },
  "inputs": {
    "unit": "attachment",
    "accepts": { "mime": ["application/pdf"] },
    "per_parent": { "min": 1, "max": 1 }
  },
  "parameters": {
    "language": {
      "type": "string",
      "title": "Язык вывода",
      "default": "en-US",
      "enum": ["en-US", "zh-CN", "ja-JP"],
      "allowCustom": true
    }
  },
  "execution": {
    "mode": "auto",
    "skillrunner_mode": "auto",
    "timeout_ms": 600000
  },
  "request": {
    "kind": "skillrunner.job.v1",
    "create": { "skill_id": "literature-analysis" }
  },
  "result": {
    "fetch": { "type": "bundle" },
    "expects": {
      "result_json": "result/result.json"
    }
  },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

## Следующие шаги

- [Система хуков](#doc/workflows%2Fcustom%2Fhooks) — Изучите сигнатуры API и методы написания каждого хука
- [Система параметров](#doc/workflows%2Fcustom%2Fparameters) — Типы параметров, значения перечислений, источники динамических опций
- [Выделение и контекст](#doc/workflows%2Fcustom%2Fselection-context) — Как получить информацию о выбранных пользователем элементах
