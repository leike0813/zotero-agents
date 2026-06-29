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
│     └── Маршрутизатор возможностей (30+ возможностей)
│
└── CLI zotero-bridge (сопутствующий бинарный файл)
      ├── Семантические команды (context, library, mutation, synthesis)
      ├── Конфигурационные файлы (bridge-profile.json)
      └── Режим stdin/pipe (для интеграции с агентами ACP)
```

Версия протокола: `host-bridge.v1`. Все конечные точки, кроме `GET /bridge/v1/health`, требуют аутентификации Bearer Token.

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

```
zotero-bridge status                           # Проверка работоспособности (без аутентификации)
zotero-bridge manifest                         # Полный манифест возможностей
zotero-bridge call <capability> [--input]      # Сырой вызов возможности
zotero-bridge item search --query <text>
zotero-bridge item get --key <key>
zotero-bridge item notes --key <key>
zotero-bridge item attachments --key <key>
zotero-bridge note get --key <key>
zotero-bridge note payloads --key <key>
zotero-bridge note payload --key <key>
zotero-bridge library list --input '{"limit":50}'
zotero-bridge library snapshot --input '{"limit":200,"cursor":"0"}'
zotero-bridge topics list
zotero-bridge topics get-context --input <JSON>
zotero-bridge topics get-report --input <JSON>
zotero-bridge schemas get
zotero-bridge concepts query --input <JSON>
zotero-bridge citation-graph query-cluster --input <JSON>
zotero-bridge citation-graph get-overview
zotero-bridge library-index get
zotero-bridge resolvers resolve --input <JSON>
zotero-bridge reference-index get
zotero-bridge paper-artifacts get-manifest --input <JSON>
zotero-bridge paper-artifacts read --input <JSON>
zotero-bridge insights get-attention-queue
zotero-bridge literature ingest --input <JSON>
zotero-bridge workflow list
zotero-bridge workflow describe --workflow <id>
zotero-bridge workflow submit --workflow <id> (--input <JSON> | --none)
zotero-bridge workflow agent-run --workflow <id> (--input <JSON> | --none) --output-dir <DIR>
zotero-bridge workflow run <runId>
zotero-bridge task list [--workflow <id>] [--active-only]
zotero-bridge file download <fileId> --output <path>
```

Ввод принимает: встроенный JSON, путь к файлу JSON, синтаксис `@file`, `-` (stdin).

### Контракт вывода

stdout всегда выдаёт ровно один JSON-объект:

```json
{ "ok": true, "data": {...}, "meta": { "cli": "zotero-bridge", "schema": "zotero-bridge.cli.v1" } }
{ "ok": false, "error": {...}, "meta": { "cli": "zotero-bridge", "schema": "zotero-bridge.cli.v1" } }
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
  "protocol": "host-bridge.v1",
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
<summary>Все 30+ возможностей</summary>

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

### Мутация

| Возможность | Описание |
|-----------|-------------|
| `mutation.preview` | Предпросмотр операции записи (без выполнения) |
| `mutation.execute` | Выполнение операции записи (требует подтверждения) |

### Synthesis

| Возможность | Описание |
|-----------|-------------|
| `topics.list` | Список всех тем |
| `topics.get_context` | Получение контекста темы |
| `topics.get_report` | Получение отчёта по теме |
| `topics.get_review_input` | Сборка пакета рецензирования темы |
| `schemas.get` | Получение определений схемы |
| `concepts.query` | Запрос базы знаний концепций |
| `citation_graph.query_cluster` | Запрос кластера цитирований |
| `citation_graph.get_overview` | Получение обзора графа |
| `citation_graph.get_slice` | Извлечение среза подграфа |
| `citation_graph.get_metrics` | Вычисление метрик графа |
| `citation_graph.rank_external_references` | Ранжирование внешних ссылок |
| `citation_graph.rank_library_papers` | Ранжирование статей библиотеки |
| `paper_artifacts.get_manifest` | Получение манифеста артефактов |
| `paper_artifacts.read` | Чтение содержимого артефактов |
| `paper_artifacts.export_filtered` | Экспорт отфильтрованных артефактов |
| `paper_artifacts.resolve_topic_digest` | Разрешение дайджеста темы |
| `insights.get_attention_queue` | Получение очереди внимания |
| `resolvers.resolve` | Разрешение резолверов ссылок/тем |
| `reference_index.get` | Получение индекса ссылок |
| `library_index.get` | Получение индекса библиотеки |

### Диагностика

| Возможность | Описание |
|-----------|-------------|
| `diagnostic.get_status` | Получение статуса сервиса |

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
