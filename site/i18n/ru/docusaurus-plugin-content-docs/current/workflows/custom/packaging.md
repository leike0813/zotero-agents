# Упаковка и развёртывание

Workflow поддерживают две формы: **одиночный Workflow** и **пакет из нескольких Workflow**. Одиночные Workflow подходят для простых сценариев, в то время как пакеты из нескольких Workflow подходят для коллекций Workflow с общим кодом.

## Одиночный Workflow

Самая простая форма: каталог, содержащий `workflow.json` и его скрипты Hook:

```
my-workflow/
├── workflow.json
└── hooks/
    ├── filterInputs.mjs
    └── applyResult.mjs
```

Одиночный Workflow не имеет `packageId`, и скрипты Hook не могут совместно использовать код через относительные импорты.

## Пакет из нескольких Workflow

Когда несколько Workflow совместно используют логику, они могут быть организованы как пакет:

```
my-package/
├── workflow-package.json       # Манифест пакета
├── lib/                        # Общий код
│   └── runtime.mjs
│   └── util.mjs
├── workflow-a/
│   ├── workflow.json
│   └── hooks/
│       ├── filterInputs.mjs
│       └── applyResult.mjs
├── workflow-b/
│   ├── workflow.json
│   └── hooks/
│       └── applyResult.mjs
└── locales/                    # Локализованные файлы на уровне пакета
    ├── zh-CN.json
    └── ja-JP.json
```

### workflow-package.json

```json
{
  "id": "my-package",
  "version": "1.0.0",
  "workflows": [
    "workflow-a/workflow.json",
    "workflow-b/workflow.json"
  ],
  "i18n": {
    "defaultLocale": "en-US",
    "locales": {
      "zh-CN": "locales/zh-CN.json",
      "ja-JP": "locales/ja-JP.json"
    }
  }
}
```

### Общий код внутри пакета

Скрипты Hook в пакете могут импортировать общие модули из `lib/` через относительные пути:

```js
// workflow-a/hooks/applyResult.mjs
import { processResult } from "../../lib/util.mjs";

export async function applyResult({ parent, bundleReader, runtime }) {
  return processResult({ parent, bundleReader, runtime });
}
```

```js
// lib/util.mjs
export function processResult({ parent, bundleReader, runtime }) {
  // Общая логика обработки
}
```

Примечание: Скрипты Hook выполняются как ES Modules, поддерживая операторы `import`, но пути импорта должны быть относительными к самому файлу Hook.

## Методы развёртывания

### Каталог Workflow пользователя

Поместите каталог Workflow в **Каталог Workflow**, настроенный в Настройках Zotero. Менеджер Workflow автоматически сканирует этот каталог (включая подкаталоги) и обнаруживает все файлы `workflow.json`.

Расположение конфигурации: Zotero → Настройки → Zotero Agents → Каталог Workflow.

### Правила сканирования каталогов

- Менеджер Workflow **рекурсивно сканирует** каталог Workflow и его подкаталоги
- Нахождение `workflow.json` регистрирует его как Workflow
- Если `workflow-package.json` найден в каталоге пакета, под-Workflow загружаются в режиме пакета
- Если каталог Workflow не существует или не содержит действительных Workflow, Менеджер Workflow сообщает о предупреждении, но не влияет на работу плагина

### Совместимость с другими форматами

| Место хранения | Видимость | Описание |
|-----------------|------------|-------------|
| Официальный пакет Workflow `content/official/workflows/` | Все пользователи | Устанавливается независимо через Content Feed; не может быть напрямую изменён пользователями |
| Каталог Workflow пользователя | Текущий пользователь | Может быть свободно добавлен/изменён/удалён |
| Официальные + пользовательские каталоги | Комбинированное отображение | Workflow из обоих мест отображаются бок о бок в Панели мониторинга |

## Проверка

После развёртывания Workflow в пользовательский каталог:

1. **Переоткройте Панель мониторинга**; новый Workflow должен появиться в списке Workflow на главной странице
2. После выбора соответствующих элементов щёлкните правой кнопкой мыши → Zotero Agents; новый Workflow должен появиться
3. Перед запуском Workflow проверьте, что параметры в диалоге настроек корректны

## Следующие шаги

- [Локализация](localization) — Добавьте поддержку нескольких языков в Workflow
- [Request Kinds](request-kinds) — Выберите соответствующий бэкенд выполнения и тип запроса
- [Отладка и тестирование](debugging) — Проверьте правильность Workflow
