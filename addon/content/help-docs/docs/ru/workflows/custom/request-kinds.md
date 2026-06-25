# Типы запросов

Workflow определяют, какой Provider (исполнитель) обрабатывает запрос, объявляя `request.kind`. Система имеет несколько встроенных типов запросов, соответствующих различным бэкендам и режимам выполнения.

## Обзор типов запросов

| `kind` | Применимый Provider | Описание |
|--------|---------------------|----------|
| `pass-through.run.v1` | pass-through | Чисто локальное выполнение, удалённый бэкенд не задействован |
| `skillrunner.job.v1` | skillrunner / acp | Одношаговое выполнение навыка SkillRunner |
| `skillrunner.sequence.v1` | acp | Многошаговое цепочечное выполнение навыков |
| `acp.prompt.v1` | acp | Отправить промпт непосредственно бэкенду ACP |
| `acp.skill.run.v1` | acp | Отправить запуск навыка непосредственно бэкенду ACP |
| `generic-http.request.v1` | generic-http | Одношаговый вызов HTTP API |
| `generic-http.steps.v1` | generic-http | Многошаговые вызовы HTTP API |

## pass-through.run.v1 — Чисто локальное выполнение

Удалённый бэкенд не требуется; выполняется непосредственно внутри плагина. Подходит для чисто локальных сценариев, таких как файловые операции и экспорт данных.

```json
{
  "provider": "pass-through",
  "request": {
    "kind": "pass-through.run.v1"
  }
}
```

При построении запроса в хуке `buildRequest` обычно передают `selectionContext` и `parameter`:

```js
export function buildRequest({ selectionContext, executionOptions }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

## skillrunner.job.v1 — Одношаговое выполнение навыка

Отправить один запрос на выполнение навыка бэкенду Skill-Runner. Опрос для получения результатов после отправки.

```json
{
  "provider": "skillrunner",
  "request": {
    "kind": "skillrunner.job.v1",
    "create": {
      "skill_id": "literature-analysis",
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

| Поле | Описание |
|------|----------|
| `create.skill_id` | Идентификатор навыка для выполнения |
| `create.skill_source` | Источник навыка. `"local-package"` (входит в пакет), `"installed"` (уже установлен) |
| `input.upload.files` | Список файлов для загрузки. `from` может быть `"selected.markdown"`, `"selected.pdf"`, `"selected.source"` |
| `poll.interval_ms` | Интервал опроса (миллисекунды) |
| `poll.timeout_ms` | Общий таймаут (миллисекунды) |

Когда workflow выбирает бэкенд ACP, `skillrunner.job.v1` автоматически адаптируется к `acp.skill.run.v1`, поэтому workflow, объявленные как `skillrunner.job.v1`, также совместимы с бэкендом ACP.

## skillrunner.sequence.v1 — Многошаговое цепочечное выполнение навыков

Когда несколько навыков нужно выстроить в последовательность (где выход одного шага становится входом следующего), используйте последовательное выполнение. Типичные сценарии включают многоэтапные конвейеры (например, трёхшаговый поток синтеза по теме: подготовка → основное обогащение → завершение), где каждый шаг обрабатывается разным навыком, передавая промежуточные результаты через механизм handoff.

Свяжите несколько навыков в последовательность, где выход одного шага может служить входом для следующего (handoff).

```json
{
  "provider": "acp",
  "request": {
    "kind": "skillrunner.sequence.v1",
    "sequence": {
      "steps": [
        {
          "id": "prepare",
          "skill_id": "create-topic-synthesis-prepare",
          "workspace": "new",
          "parameter": { "language": "en-US" }
        },
        {
          "id": "core",
          "skill_id": "topic-synthesis-core-enrichment",
          "workspace": "reuse-workflow",
          "handoff": {
            "from_step": "prepare",
            "pass_through": true
          }
        },
        {
          "id": "finalize",
          "skill_id": "topic-synthesis-finalize",
          "workspace": "reuse-workflow"
        }
      ]
    }
  }
}
```

### Конфигурация шага

| Поле | Описание |
|------|----------|
| `id` | Уникальный идентификатор шага, на который ссылается handoff |
| `skill_id` | Идентификатор навыка для выполнения |
| `mode` | **Обязательный.** Режим выполнения: `"auto"` (неинтерактивный) или `"interactive"` (требует ввода пользователя) |
| `workspace` | Политика рабочего пространства. `"new"` (создать новое рабочее пространство), `"reuse-workflow"` (переиспользовать родительское рабочее пространство) |
| `parameter` | Параметры, передаваемые навыку |
| `input` | Входные данные, передаваемые навыку |
| `short_circuit` | Правила раннего завершения. См. ниже |
| `fetch_type` | Указать тип получения для каждого шага. `"bundle"` (загрузить пакет zip артефактов); если не указано, используется `result.fetch.type` на уровне workflow |
| `apply_result` | Применение результата на уровне шага: `workflow_id` указывает, какой `applyResult` под-workflow вызывать; `on_failure` контролирует поведение при ошибке (`"continue"` или `"fail_sequence"`) |
| `include_if` | Условное выполнение шага. Либо `{ kind: "parameter", parameter: "...", equals: ... }` для проверки параметра workflow, либо `{ kind: "runtime", condition: "..." }` для условий выполнения |

### Раннее завершение (short_circuit)

Когда возвращаемое значение шага удовлетворяет условиям, пропустите последующие шаги и используйте выход текущего шага как окончательный результат.

```json
{
  "id": "prepare",
  "skill_id": "create-topic-synthesis-prepare",
  "workspace": "new",
  "short_circuit": {
    "when": {
      "path": "status",
      "equals": "canceled"
    },
    "result": "step_output"
  }
}
```

| Поле | Описание |
|------|----------|
| `when.path` | Какое поле в выходном JSON шага проверять |
| `when.equals` | Запустить завершение, когда значение поля равно этому значению |
| `result` | Результат после завершения: `"step_output"` (полный выход текущего шага) |

### Конфигурация Handoff

Handoff передаёт данные от одного шага к последующим шагам через массив `bindings`. Каждая привязка описывает одну передачу значения или файла.

**Полная передача (все выходные поля из предшествующего шага):**

```json
{
  "handoff": {
    "bindings": [
      {
        "kind": "value",
        "target": "/input/handoff"
      }
    ]
  }
}
```

**Выборочное сопоставление полей:**

```json
{
  "handoff": {
    "bindings": [
      {
        "kind": "value",
        "step": "step1",
        "source": "output_field_name",
        "target": "/input/field_name",
        "required": false
      },
      {
        "kind": "value",
        "step": "step1",
        "source": "status",
        "target": "/input/step1_status",
        "required": false
      }
    ]
  }
}
```

| Поле привязки | Описание |
|---------------|----------|
| `kind` | `"value"` для данных, `"file"` для ссылок на файлы |
| `step` | ID исходного шага (из выхода какого шага читать). Если пропущено, читается из непосредственно предшествующего шага |
| `source` | Имя поля в выходном JSON исходного шага |
| `target` | JSON-путь, куда должно быть записано значение во входе текущего шага (например, `"/input/field_name"`) |
| `required` | Если `true`, шаг завершится с ошибкой, когда исходное значение отсутствует. По умолчанию `false` |
| `value` | Для `kind: "value"`, буквальное значение для передачи (используется, когда `step`/`source` пропущены) |

## generic-http.request.v1 — Вызов HTTP API

Отправить один HTTP-запрос бэкенду Generic HTTP.

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.request.v1"
  }
}
```

Обычно используется для вызова внешних REST API (например, сервиса разбора PDF MinerU).

## generic-http.steps.v1 — Многошаговые вызовы HTTP

Выполнить несколько шагов HTTP-запросов последовательно.

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.steps.v1"
  }
}
```

## Как выбрать правильный Provider

| Что должен делать ваш workflow... | Выберите provider | Тип запроса |
|-----------------------------------|-------------------|-------------|
| Выполнять чисто локальные операции, без удалённых вызовов | `pass-through` | `pass-through.run.v1` |
| Отправить один навык в Skill-Runner | `skillrunner` | `skillrunner.job.v1` |
| Связать несколько навыков в последовательность | `acp` | `skillrunner.sequence.v1` |
| Вызвать HTTP API | `generic-http` | `generic-http.request.v1` |

Примечание: `provider` — это единственное поле, определяющее, с какими бэкендами совместим workflow. `request.kind` используется только для маршрутизации к правильному исполнителю и не участвует в выводе совместимости бэкендов.

## Следующие шаги

- [Отладка и тестирование](#doc/workflows%2Fcustom%2Fdebugging) — Проверьте запросы и ответы workflow
- [Упаковка и развёртывание](#doc/workflows%2Fcustom%2Fpackaging) — Опубликуйте workflow для пользователей
