# Host Bridge

## Обзор

Host Bridge — это встроенный HTTP-сервер плагина, который позволяет внешним ИИ-инструментам (Codex, Claude Code, OpenCode и т.д.) напрямую обращаться к вашей библиотеке Zotero. Он является мостом связи между агентами ACP и Zotero и служит базовым транспортом как для CLI `zotero-bridge`, так и для MCP-сервера.

## Архитектура

```
Процесс плагина Zotero
│
├── HTTP-сервер Host Bridge (loopback: 127.0.0.1:<port>)
│     ├── Аутентификация Bearer Token (каждый запрос)
│     ├── Шлюз подтверждения записи (по операции)
│     └── Маршрутизатор возможностей (60+ возможностей)
│
└── CLI zotero-bridge (сопутствующий бинарный файл)
      ├── Семантические команды (context, library, mutation, synthesis)
      ├── Конфигурационные файлы (bridge-profile.json)
      └── Режим stdin/pipe (для интеграции с агентами ACP)
```

Версия протокола: `host-bridge.v2`. Все конечные точки, кроме `GET /bridge/v1/health`, требуют аутентификации Bearer Token. Контракты возможностей используют `host-bridge.capabilities.v2`.

## Конфигурация

Zotero → Настройки → Zotero Agents → Host Bridge

| Настройка | Тип | По умолчанию | Описание |
|---------|------|---------|-------------|
| **Включить MCP-сервер** | boolean | `true` | Также включить протокол MCP для сторонних агентов |
| **Отключить подтверждение записи** | boolean | `false` | Опасно: обойти все подтверждения записи. Отмечено как красная опасная зона |
| **Включить доступ по локальной сети** | boolean | `false` | Привязать к `0.0.0.0` для доступа по локальной сети (принудительно фиксирует порт) |
| **Фиксированный порт** | boolean | `false` | Закрепить порт (по умолчанию 26570) вместо использования случайного порта |
| **Номер порта** | number | `26570` | Порт, используемый в фиксированном режиме (1024-65535) |
| **LAN IP** | string | `""` | Ручное переопределение для объявляемого LAN IP; оставьте пустым для автоопределения |
| **Запустить / Показать конечную точку** | button | — | Убедиться, что сервер работает, и отобразить текущий URL конечной точки |
| **Сменить токен** | button | — | Сменить сессионный токен |
| **Создать / Сменить мастер-токен** | button | — | Сгенерировать постоянный токен для跨-сессионного доступа |
| **Копировать мастер-токен** | button | — | Копировать токен в буфер обмена |
| **Копировать профиль удалённого CLI** | button | — | Копировать полный JSON профиля удалённого CLI |
| **Установить CLI** | button | — | Установка `zotero-bridge` в системный PATH в один клик |

## Модель безопасности

### Аутентификация Bearer Token

- Каждый запрос должен включать заголовок `Authorization: Bearer <token>`
- **Сессионный токен**: автоматически генерируется при запуске плагина (24 байта base64), живёт в течение сессии плагина
- **Мастер-токен**: необязательный постоянный токен, зашифрованное хранилище AES-256-GCM, для跨-сессионного доступа CLI
- Токены никогда не записываются в промпты, логи или вывод агента

### Подтверждение записи

Операции записи требуют подтверждения через UI Zotero:

| Уровень | Описание |
|-------|-------------|
| **Требуется подтверждение** | `mutation.execute`, `workflow submit`, `debug.zotero.eval`, `citation_graph.refresh_metrics` |
| **Автоматически одобрено** | Все операции только для чтения, `diagnostic.get_status`, `mutation.preview` |

**Двойное автоматическое одобрение:**
1. Манифест Workflow объявляет `allowWriteApprovalBypass: true`
2. Пользователь явно отмечает авто-одобрение в диалоге отправки

Оба условия должны быть выполнены для вступления в силу автоматического одобрения.

### Безопасность локальной сети / удалённого доступа

- Режим LAN привязывает `0.0.0.0` и должен быть включён вручную. **Используйте только в доверенных сетях**
- Удалённый доступ требует мастер-токена (созданного вручную), никогда не распространяется автоматически
- Автоопределение LAN IP использует отражение сети бэкенда SkillRunner; может быть переопределено вручную

## CLI `zotero-bridge`

`zotero-bridge` — это CLI-инструмент на Rust для агентов ACP и терминальных пользователей для вызова Host Bridge.

### Установка

Используйте кнопку "Установить CLI" в настройках. Запуски ACP используют бинарный файл, поставляемый с плагином (внедряется в PATH рабочего пространства).

### Приоритет разрешения конечной точки / токена

| Источник | Конечная точка | Токен |
|--------|----------|-------|
| Флаг CLI | `--endpoint` | — |
| Окружение | `ZOTERO_BRIDGE_ENDPOINT` | `ZOTERO_BRIDGE_TOKEN` |
| Файл профиля | Поле `endpoint` | `auth.token` / `auth.tokenEnv` |

### Семантические команды

<details>
<summary>Все 125 канонических команд</summary>

#### surface — Поверхность агента
```
zotero-bridge surface identity --json
zotero-bridge surface describe <command...> --json
zotero-bridge surface search --intent <text>
```

#### bridge — Состояние сервера и профиль
```
zotero-bridge bridge status
zotero-bridge bridge manifest
zotero-bridge bridge profile inspect
zotero-bridge bridge profile diagnose
zotero-bridge bridge backend list
zotero-bridge bridge backend status
zotero-bridge call <capability> [--input <json>]
```

#### library — Чтение библиотеки
```
zotero-bridge library items list [--cursor <c>]
zotero-bridge library item search --query <text>
zotero-bridge library item get --key <key>
zotero-bridge library item notes --key <key>
zotero-bridge library item attachments --key <key>
zotero-bridge library note get --key <key>
zotero-bridge library note payloads --key <key>
zotero-bridge library note payload --key <key> --payload-id <id>
zotero-bridge library annotation list --key <key>
zotero-bridge library annotation export --key <key> --format json|markdown
zotero-bridge library snapshot --input <json>
zotero-bridge library readiness audit --input <json>
zotero-bridge library readiness missing-pdf --input <json>
zotero-bridge library readiness missing-markdown --input <json>
zotero-bridge library readiness missing-analysis --input <json>
```

#### context — Контекст UI и навигация
```
zotero-bridge context current
zotero-bridge context selection get
zotero-bridge context selection open
zotero-bridge context item open --key <key>
zotero-bridge context note open --key <key>
zotero-bridge context collection open --key <key>
```

#### synthesis — Слой синтеза
```
zotero-bridge synthesis topic list --input <json>
zotero-bridge synthesis topic find-by-paper-ref --input <json>
zotero-bridge synthesis topic get-context --input <json>
zotero-bridge synthesis topic get-report --input <json>
zotero-bridge synthesis topic get-review-input --input <json>
zotero-bridge synthesis schema get
zotero-bridge synthesis concept query --input <json>
zotero-bridge synthesis graph overview --input <json>
zotero-bridge synthesis graph query-cluster --input <json>
zotero-bridge synthesis graph get-slice --input <json>
zotero-bridge synthesis graph get-layout --input <json>
zotero-bridge synthesis graph get-metrics --input <json>
zotero-bridge synthesis graph rank-external-references --input <json>
zotero-bridge synthesis graph rank-library-papers --input <json>
zotero-bridge synthesis graph refresh-metrics --input <json>
zotero-bridge synthesis graph update --input <json>
zotero-bridge synthesis index status
zotero-bridge synthesis index library get --input <json>
zotero-bridge synthesis index reference get --input <json>
zotero-bridge synthesis cache status
zotero-bridge synthesis cache refresh-reference-sidecar --input <json>
zotero-bridge synthesis cache invalidate --input <json>
zotero-bridge synthesis resolver resolve --input <json>
zotero-bridge synthesis artifact manifest --input <json>
zotero-bridge synthesis artifact read --input <json>
zotero-bridge synthesis artifact export-filtered --input <json>
zotero-bridge synthesis artifact resolve-topic-digest --input <json>
zotero-bridge synthesis insight attention-queue
```

#### mutation — Операции записи
```
zotero-bridge mutation preview --input <json>
zotero-bridge mutation apply --input <json>
zotero-bridge mutation literature-ingest --input <json>
zotero-bridge mutation tag add --input <json>
zotero-bridge mutation tag remove --input <json>
zotero-bridge mutation collection create --input <json>
zotero-bridge mutation collection add-items --input <json>
zotero-bridge mutation collection remove-items --input <json>
zotero-bridge mutation item update --input <json>
zotero-bridge mutation item attach-file --input <json>
zotero-bridge mutation note create --input <json>
zotero-bridge mutation note update --input <json>
zotero-bridge mutation note upsert-payload --input <json>
```

#### workflow — Управление workflow
```
zotero-bridge workflow list
zotero-bridge workflow submit --workflow <id> (--input <json> | --none)
zotero-bridge workflow queue list [--workflow <id>]
zotero-bridge workflow queue cancel --submission-id <id>
zotero-bridge workflow submission get --submission-id <id>
zotero-bridge workflow describe --workflow <id> [--json]
zotero-bridge workflow validate --input <json>
zotero-bridge workflow requirements --workflow <id> --input <json>
zotero-bridge workflow profile list
zotero-bridge workflow profile describe --profile <id>
zotero-bridge workflow profile validate --profile <id>
zotero-bridge workflow agent-run --workflow <id> (--input <json> | --none) --output-dir <dir>
zotero-bridge workflow agent-bundle inspect --path <path>
zotero-bridge workflow agent-result validate --input <json>
zotero-bridge workflow agent-apply --run-id <id> --input <json>
zotero-bridge workflow agent-apply-status --run-id <id>
zotero-bridge workflow agent-renew --run-id <id>
zotero-bridge workflow agent-abandon --run-id <id>
```

#### run — Наблюдение за выполнением
```
zotero-bridge run get --run-id <id>
zotero-bridge run cancel --run-id <id>
zotero-bridge run list [--workflow <id>]
zotero-bridge run active
zotero-bridge run recent
zotero-bridge run workflow recent
zotero-bridge run skill get --run-id <id>
zotero-bridge run skill reply --run-id <id> --input <json>
zotero-bridge run skill connect --run-id <id>
zotero-bridge run skill recent
zotero-bridge run skill events --run-id <id>
zotero-bridge run notification list [--limit <n>]
zotero-bridge run notification wait [--timeout-ms <ms>]
zotero-bridge run notification ack --notification-id <id>
zotero-bridge run permission pending
zotero-bridge run permission get --request-id <id>
```

#### file — Передача файлов
```
zotero-bridge file download <fileId> --output <path>
zotero-bridge file upload --path <path>
```

#### product — Продукты Dashboard
```
zotero-bridge product list [--limit <n>]
zotero-bridge product get --product-id <id>
zotero-bridge product download --product-id <id> --output <path>
zotero-bridge product remove --product-id <id>
```

#### operation — Постоянные операции
```
zotero-bridge operation get --operation-id <id>
```

</details>

Ввод принимает: встроенный JSON, путь к файлу JSON, синтаксис `@file`, `-` (stdin).

Для получения полного актуального каталога команд выполните `zotero-bridge surface identity --json`, чтобы увидеть текущий `commandCatalogChecksum`, затем `zotero-bridge surface describe <command...>` для контракта любой конкретной команды.

### Контракт вывода

stdout всегда выдаёт ровно один JSON-объект:

```json
{ "ok": true, "data": {...}, "meta": { "cliSchema": "zotero-bridge.cli.v5" } }
{ "ok": false, "error": {...}, "meta": { "cliSchema": "zotero-bridge.cli.v5" } }
```

Коды выхода ошибок:

| Категория | Код выхода |
|----------|----------:|
| использование | 2 |
| конфигурация | 3 |
| подключение | 4 |
| аутентификация | 5 |
| разрешение | 6 |
| валидация | 7 |
| возможность | 8 |
| workflow | 9 |
| загрузка | 10 |
| протокол | 11 |
| внутренняя | 70 |

### Файлы профилей

Известные расположения профилей:

| ОС | Путь |
|----|------|
| Windows | `%LOCALAPPDATA%\zotero-agents\bridge-profile.json` |
| macOS | `~/Library/Application Support/zotero-agents/bridge-profile.json` |
| Linux | `${XDG_DATA_HOME:-~/.local/share}/zotero-agents/bridge-profile.json` |

```json
{
  "schema": "zotero-bridge.profile.v1",
  "protocol": "host-bridge.v2",
  "endpoint": "http://127.0.0.1:26570/bridge/v1",
  "connectionMode": "local",
  "auth": { "type": "bearer", "tokenEnv": "ZOTERO_BRIDGE_TOKEN" }
}
```

## Интеграция с агентами ACP

Когда агент ACP запускает навык, плагин автоматически внедряет:

```
<workspaceDir>/.zotero-bridge/
  bin/zotero-bridge(.cmd)     # Заглушка CLI
  profile.json                # Профиль подключения (токен через переменную окружения)
  README.md                   # Подсказки по использованию
```

Внедряемые переменные окружения:

- `ZOTERO_BRIDGE_PROFILE` — путь к profile.json
- `ZOTERO_BRIDGE_TOKEN` — токен bearer
- `ZOTERO_BRIDGE_SCOPE` — JSON области подтверждения
- `PATH` / `Path` — добавляется `.zotero-bridge/bin` в начало

## Доступные возможности

<details>
<summary>Все 60+ возможностей</summary>

### Контекст

| Возможность | Описание |
|-----------|-------------|
| `context.get_current_view` | Информация о текущем представлении Zotero |
| `context.get_selected_items` | Текущие выбранные элементы |

### Библиотека

| Возможность | Описание |
|-----------|-------------|
| `library.search_items` | Поиск элементов |
| `library.get_item_detail` | Получение деталей элемента |
| `library.list_items` | Список элементов с пагинацией |
| `library.sync_snapshot` | Paginated metadata snapshot for local indexing |
| `library.get_item_notes` | Список заметок |
| `library.get_note_detail` | Чтение содержимого заметки |
| `library.list_note_payloads` | Список полезных нагрузок заметок |
| `library.get_note_payload` | Получение конкретной полезной нагрузки |
| `library.get_item_attachments` | Список вложений |
| `library.list_annotations` | Список аннотаций читалки |
| `library.export_annotations` | Экспорт аннотаций читалки в markdown или JSON |
| `library.readiness_audit` | Постраничный аудит готовности библиотеки (только чтение) |

### Мутация

| Возможность | Описание |
|-----------|-------------|
| `mutation.preview` | Предпросмотр операции записи (без выполнения) |
| `mutation.execute` | Выполнение операции записи (требует подтверждения) |

### Продукты Workflow

| Возможность | Описание |
|-----------|-------------|
| `workflow_products.list` | Список обычных продуктов Dashboard |
| `workflow_products.get` | Получение публичных метаданных одного продукта |
| `workflow_products.read_asset` | Регистрация одного актива продукта для загрузки |
| `workflow_products.export` | Экспорт одного или всех активов продукта |
| `workflow_products.remove` | Удаление одной записи продукта |

### Synthesis — Темы

| Возможность | Описание |
|-----------|-------------|
| `topics.list` | Список всех тем |
| `topics.find_by_paper_ref` | Поиск тем по ссылке на работу |
| `topics.get_context` | Получение контекста темы |
| `topics.get_report` | Получение отчёта по теме |
| `topics.get_review_input` | Сборка пакета рецензирования темы |

### Synthesis — Граф цитирований

| Возможность | Описание |
|-----------|-------------|
| `citation_graph.query_cluster` | Запрос кластера цитирований |
| `citation_graph.get_overview` | Получение обзора графа |
| `citation_graph.get_slice` | Извлечение среза подграфа |
| `citation_graph.get_metrics` | Вычисление метрик графа |
| `citation_graph.get_layout` | Получение сохранённых координат макета |
| `citation_graph.rank_external_references` | Ранжирование внешних ссылок |
| `citation_graph.rank_library_papers` | Ранжирование статей библиотеки |
| `citation_graph.refresh_metrics` | Диагностика: обновить сохранённые метрики |
| `citation_graph.update` | Запуск атомарного обновления графа цитирований |

### Synthesis — Концепции, Схемы, Резолверы

| Возможность | Описание |
|-----------|-------------|
| `concepts.query` | Запрос базы знаний концепций |
| `schemas.get` | Получение определений схемы |
| `resolvers.resolve` | Разрешение резолверов ссылок/тем |

### Synthesis — Артефакты статей

| Возможность | Описание |
|-----------|-------------|
| `paper_artifacts.get_manifest` | Получение манифеста артефактов |
| `paper_artifacts.read` | Чтение содержимого артефактов |
| `paper_artifacts.export_filtered` | Экспорт отфильтрованных артефактов |
| `paper_artifacts.resolve_topic_digest` | Разрешение дайджеста темы |

### Synthesis — Индексы и аналитика

| Возможность | Описание |
|-----------|-------------|
| `reference_index.get` | Получение индекса ссылок |
| `reference_sidecar.refresh` | Запуск обновления sidecar ссылок |
| `library_index.get` | Получение индекса библиотеки |
| `insights.get_attention_queue` | Получение очереди внимания |
| `synthesis.operation.get` | Чтение квитанции постоянной операции синтеза |

### Диагностика

| Возможность | Описание |
|-----------|-------------|
| `diagnostic.get_status` | Получение статуса сервиса |

### Отладка (только в режиме отладки)

| Возможность | Описание |
|-----------|-------------|
| `debug.status` | Снимок статуса отладки Host Bridge |
| `debug.persistence.snapshot` | Снимок runtime-персистентности |
| `debug.tasks.snapshot` | Диагностика задач workflow и запусков ACP |
| `debug.zotero.eval` | Выполнение одобренного JavaScript в контексте Zotero |
| `debug.acpSkillRun.reapplyResult` | Повторный запуск applyResult для запуска навыка ACP |
| `debug.skillrunner.connections.snapshot` | Диагностика управляющего соединения SkillRunner |
| `debug.synthesis.snapshot` | Снимок операций и кэша синтеза |
| `debug.synthesis.diff` | Сравнение полезных нагрузок Zotero и кэшей репозитория |
| `debug.synthesis.cache.list` | Список строк кэша sidecar синтеза |
| `debug.synthesis.operations.list` | Список операций синтеза |
| `debug.synthesis.paper.inspect` | Инспекция одной статьи across кэшей |
| `debug.synthesis.topic.inspect` | Инспекция одной темы across артефактов |
| `debug.synthesis.profiler.list` | Запуски профилировщика синтеза |
| `debug.synthesis.cleanInstallReset` | Опасно: сброс состояния БД синтеза |

</details>

## Поток подтверждения записи

```
Агент вызывает возможность записи
  │
  ├── 1. Запрос прибывает в Host Bridge (с Bearer Token)
  ├── 2. Токен проверен
  ├── 3. Область извлечена
  ├── 4. Проверка подтверждения:
  │     ├── Область только для чтения → выполнить немедленно
  │     ├── autoApproveWrites = true И пользователь предварительно одобрил → выполнить
  │     └── Требуется подтверждение → в очередь в UI Zotero
  ├── 5. Подсказка подтверждения показана в ACP Чате / панели SkillRunner
  │     ├── Пользователь одобряет → выполнить
  │     └── Пользователь отклоняет → вернуть ошибку
  └── 6. Результат возвращён, лог аудита записан
```

Маршрутизация области:

| Область | UI подтверждения |
|-------|-------------|
| `acp-skill-run` | UI навыков ACP |
| `acp-chat` | Панель ACP Чата |
| `skillrunner-run` | Панель SkillRunner |
| Нет области / `global` | Глобальный UI подтверждения Zotero |

## Доступ по локальной сети / удалённый доступ

1. Отметьте **Включить доступ по локальной сети** в настройках
2. Закрепите порт или отметьте текущий порт
3. Создайте / скопируйте **Мастер-токен**
4. Нажмите **Копировать профиль удалённого CLI** для полной конфигурации подключения
5. На удалённой машине настройте `endpoint` (`http://<LAN_IP>:<port>/bridge/v1`) и токен
6. Тест: `zotero-bridge status --endpoint http://<LAN_IP>:<port>/bridge/v1`

**Важно:** Режим LAN обходит защиту loopback. Используйте только в доверенных локальных сетях.

## Следующие шаги

- [MCP-сервер](#doc/backends%2Fmcp-server) — Стандартизированный интерфейс протокола для клиентов, совместимых с MCP (Claude Desktop и т.д.)
- [Hermes Profiles](#doc/backends%2Fhermes-profiles) — Устанавливаемый профиль для управления библиотекой Zotero с помощью ИИ-агентов
- [Настройки](#doc/preferences) — Просмотр всех настроек Host Bridge
- [Бэкенд ACP](#doc/backends%2Facp) — Узнайте о конфигурации агента ACP
