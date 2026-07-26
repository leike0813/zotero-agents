# Создание манифеста Workflow

`workflow.json` — это файл манифеста для workflow, определяющий все его метаданные и поведение. Workflow Manager обнаруживает и загружает workflow через этот файл.

## Базовая структура

```json
{
  "schemaVersion": 2,
  "id": "my-workflow",
  "label": "My Workflow",
  "version": "1.0.0",
  "provider": "pass-through",
  "display": {
    "core": false,
    "emoji": "🔧"
  },
  "trigger": { "requiresSelection": true },
  "inputs": {
    "member": { "kind": "parent" },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "select": { "policy": "input-member", "source": "selected" },
    "filters": []
  },
  "parameters": {},
  "execution": {},
  "request": { "kind": "pass-through.run.v1" },
  "hooks": {
    "preflight": "hooks/preflight.mjs",
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

### Input Planning Contracts

`inputs` and `validateSelection` have separate, non-interchangeable roles.
`inputs` is the consumer contract for prepared execution members and grouping;
`validateSelection` is the producer contract for raw-selection validation,
candidate selection, ordered filtering, and candidate cardinality.

#### `inputs` — Execution Input Contract

```json
{
  "inputs": {
    "member": {
      "kind": "attachment",
      "accepts": {
        "mime": ["text/markdown", "text/x-markdown", "application/pdf"]
      }
    },
    "grouping": { "mode": "parent" }
  }
}
```

- `member.kind`: `selection`, `parent`, `child`, `attachment`,
  `note`, `generated-note`, or `digest-image-target`.
- `member.accepts.mime` applies only to attachment execution members.
- `grouping.mode: "each"` creates one unit per candidate.
- `grouping.mode: "all"` creates one unit containing all candidates.
- `grouping.mode: "parent"` creates stable parent groups. Candidates without
  parent identity are skipped as `missing-parent`.

#### `validateSelection` — Candidate Production Contract {#selection-validation}

```json
{
  "validateSelection": {
    "require": {
      "selection": {
        "counts": {
          "parents": { "min": 1 },
          "total": { "min": 1 }
        },
        "allowMixed": false
      },
      "candidates": { "min": 1 }
    },
    "select": {
      "policy": "input-member",
      "source": "related"
    },
    "filters": [
      {
        "kind": "source-file-exists",
        "phase": "availability"
      }
    ]
  }
}
```

`require.selection` checks the raw SelectionContext exactly once.
`select` then produces ordered atomic candidates. MIME compatibility and
`filters` run before `require.candidates`. Count rules use either
`{ "exact": n }` or non-negative `min`/`max` values.

Supported selectors are `input-member` (`source: selected|related`),
`selection`, `literature-source`, `generated-note-candidates`, and
`digest-representative-image`. Supported filters are
`source-file-exists`, `candidates-per-parent`,
`generated-note-kinds-absent`, and `artifact-absent`. Parameter-dependent
artifact checks require `phase: "execute"`; availability filters run during
preview and are reapplied during confirmed planning.

#### `trigger` — Empty-selection Gate

```json
{
  "trigger": {
    "requiresSelection": true
  }
}
```

`trigger.requiresSelection` is required in schema v2. It controls only whether
an empty selection may enter planning; it does not replace
`require.selection`.
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

> **Режим выполнения** (`auto` / `interactive`) перемещён в `request.create.mode` — см. [Типы запросов](request-kinds).

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

Для подробной информации по каждому `kind` см. [Типы запросов](request-kinds).

### Объявление хуков

```json
{
  "hooks": {
    "preflight": "hooks/preflight.mjs",
    "buildRequest": "hooks/buildRequest.mjs",
    "normalizeSettings": "hooks/normalizeSettings.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

| Поле | Обязательно | Описание |
|------|-------------|----------|
| `applyResult` | ✅ | **Обязательный**. Путь к скрипту для обработки результатов после выполнения |
| `preflight` | | Необязательный. Выполняется после разрешения выделения и перед построением запроса. Может продолжить, пропустить, сократить до `applyResult` или заменить одну входную единицу виртуальными единицами запроса |
| `buildRequest` | | Необязательный. Построить запрос для отправки бэкенду. Взаимоисключающий с полем `request` |
| `normalizeSettings` | | Необязательный. Нормализовать установленные пользователем параметры |

> **Фильтрация входных данных** заменена декларативным механизмом `validateSelection` — см. [Проверка выделения](#selection-validation) ниже.

`preflight` не участвует в активации меню, классификации выделения debug-probe или проверках готовности Host Bridge. Ограничения выделения оставляйте в `validateSelection`, построение запросов к провайдеру — в `buildRequest` или `request`, а записи в Zotero — в `applyResult`.

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

Подробную информацию см. на странице [Локализация](localization).

### Полный пример: Workflow анализа литературы с параметрами

```json
{
  "schemaVersion": 2,
  "id": "my-literature-analysis",
  "label": "My Literature Analysis",
  "version": "1.0.0",
  "provider": "skillrunner",
  "display": { "emoji": "📄" },
  "trigger": { "requiresSelection": true },
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

- [Система хуков](hooks) — Изучите сигнатуры API и методы написания каждого хука
- [Система параметров](parameters) — Типы параметров, значения перечислений, источники динамических опций
- [Выделение и контекст](selection-context) — Как получить информацию о выбранных пользователем элементах
