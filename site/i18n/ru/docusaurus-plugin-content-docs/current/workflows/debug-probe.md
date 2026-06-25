# Debug Probe

## Назначение

Пакет debug probe в основном используется для тестирования разработки системы Workflow и диагностики проблем. Он содержит несколько Workflow только для отладки, охватывающих контракты `applyResult`, Sequence Orchestration, интерактивное выполнение и сценарии подключения Host Bridge.

Все Workflow отладки помечены как `debug_only: true` и видны только в режиме отладки.

## Включённые Workflow отладки

### Отладка контракта Apply

Проверка различных комбинаций вызова хуков `buildRequest` / `applyResult`:

| Workflow | Описание |
|---------|------|
| Debug: Apply Single Result | Одиночная задача + метод получения результата |
| Debug: Apply Single Bundle | Одиночная задача + метод получения bundle |
| Debug: Apply Sequence Result | Многошаговая последовательность + получение результата |
| Debug: Apply Sequence Bundle | Многошаговая последовательность + получение bundle |
| Debug: Apply Bundle Then Result | Комбинированный вызов bundle, затем result |
| Debug: Apply Result Then Bundle | Комбинированный вызов result, затем bundle |

### Отладка Sequence

Проверка механизма многошаговой координации Sequence Orchestration:

| Workflow | Описание |
|---------|------|
| Debug Sequence Linear Probe | Проверка последовательного выполнения и передачи по умолчанию relay (pass_through) |
| Debug Sequence Workspace Reuse Probe | Проверка повторного использования рабочего пространства между шагами (workspace: reuse-workflow) |
| Debug Sequence Context Isolation Probe | Проверка явной фильтрации relay и изолированного рабочего пространства (workspace: new + селективное отображение handoff) |

### Интерактивная отладка

Проверка интерактивных Workflow, требующих ответов от пользователя:

| Workflow | Описание |
|---------|------|
| Debug: Interactive Choice Probe | Проверка потока интерактивного выбора |
| Debug: Interactive Then Result | Интерактивное выполнение, затем получение результата |

### Отладка Host Bridge

| Workflow | Описание |
|---------|------|
| Debug: Host Bridge Connectivity Probe | Проверка подключения и разрешений Host Bridge |

### Общие

| Workflow | Описание |
|---------|------|
| Workflow Debug Probe | Проверка состояния Workflow перед выполнением и открытие панели диагностики |

## Когда использовать

- Проверка поведения после разработки или изменения системы Workflow
- Устранение неполадок аномального выполнения Workflow
- Проверка механизма реле Sequence Orchestration
- Проверка того, соответствует ли контракт хука `applyResult` ожиданиям
- Проверка подключения и конфигурации разрешений Host Bridge

## Зависимости

- **Бэкенд**: Сервис Skill-Runner
- Все помечены как `debug_only`, появляются только в режиме отладки

## Следующие шаги

- [Отладка и тестирование](custom/debugging) — Методы отладки для пользовательских Workflow
- [Система хуков](custom/hooks) — Сигнатуры API хуков и использование
