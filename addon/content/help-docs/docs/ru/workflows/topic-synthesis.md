# Topic Synthesis

## Назначение

Создайте Topic Synthesis через трёхшаговый автоматизированный конвейер, выполняя систематический анализ и синтез группы связанных статей.

Соответствуя потоку создания Темы в Synthesis Workbench, этот Workflow обеспечивает сквозную обработку от семени темы до полного аналитического отчёта.

## Сценарии использования

- Создание комплексного анализа темы вокруг исследовательского направления
- Автоматическое построение таксономии, ключевых утверждений, хронологии и будущих направлений
- Генерация структурированного отчёта анализа синтеза

## Ограничения ввода

| Тип ограничения | Описание |
|---------|------|
| Единица ввода | workflow (не нужно выбирать элементы) |
| Способ запуска | Запуск из Панели мониторинга или запуск в Synthesis Workbench |

## Поток выполнения

Этот Workflow состоит из **3 последовательно выполняемых навыков**, которые автоматически передают управление друг другу:

```
1. create-topic-synthesis-prepare
   └── Получение семени темы
       └── Создание намерения темы
       └── Построение набора статей
       └── Подготовка контекста анализа

2. topic-synthesis-core-enrichment
   └── Основное обогащение
       └── Запись таксономии (система классификации)
       └── Построение хронологии
       └── Извлечение утверждений
       └── Анализ будущих направлений
       └── Генерация обзора обзора
       └── Завершение графа знаний

3. topic-synthesis-finalize
   └── Определение покрытия
       └── Генерация сводки внешнего контекста
       └── Предложения по курированию
       └── Генерация окончательной сводки анализа
```

## Выходы

После завершения выполнения результаты синтеза темы записываются в постоянное хранилище системы Synthesis и отражаются в представлениях Тем и Графа Synthesis Workbench.

Конкретные выходы включают:

- **Метаданные темы**: Имя, описание, время создания
- **Таксономия**: Иерархическая система классификации тем
- **События хронологии**: Важные события, организованные в хронологическом порядке
- **Утверждения**: Извлечённые ключевые утверждения и их доказательства
- **Сравнения**: Многомерный сравнительный анализ
- **Будущие направления**: Предложения по будущим исследовательским направлениям
- **Покрытие**: Анализ покрытия литературы
- **Отчёт**: Отчёт анализа синтеза

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_overview.webp" alt="Страница обзора Topic Synthesis" title="Страница обзора Topic Synthesis" loading="lazy" /><figcaption>Страница обзора Topic Synthesis</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_taxonomy.webp" alt="Страница таксономии Topic Synthesis" title="Страница таксономии Topic Synthesis" loading="lazy" /><figcaption>Страница таксономии Topic Synthesis</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_claims.webp" alt="Страница утверждений Topic Synthesis" title="Страница утверждений Topic Synthesis" loading="lazy" /><figcaption>Страница утверждений Topic Synthesis</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_compare.webp" alt="Страница сравнения Topic Synthesis" title="Страница сравнения Topic Synthesis" loading="lazy" /><figcaption>Страница сравнения Topic Synthesis</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_future-directions.webp" alt="Страница будущих направлений Topic Synthesis" title="Страница будущих направлений Topic Synthesis" loading="lazy" /><figcaption>Страница будущих направлений Topic Synthesis</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_coverage.webp" alt="Страница покрытия Topic Synthesis" title="Страница покрытия Topic Synthesis" loading="lazy" /><figcaption>Страница покрытия Topic Synthesis</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_report.webp" alt="Страница отчёта Topic Synthesis" title="Страница отчёта Topic Synthesis" loading="lazy" /><figcaption>Страница отчёта Topic Synthesis</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_references.webp" alt="Страница ссылок Topic Synthesis" title="Страница ссылок Topic Synthesis" loading="lazy" /><figcaption>Страница ссылок Topic Synthesis</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_subgraph.webp" alt="Подграф статьи Topic Synthesis" title="Подграф статьи Topic Synthesis" loading="lazy" /><figcaption>Подграф статьи Topic Synthesis</figcaption></figure>

## Параметры

| Параметр | Тип | Описание | По умолчанию |
|------|------|------|--------|
| `topicSeed` | string | Семя темы, описывающее тему для создания | — |
| `language` | string | Язык вывода | `auto` |

### Описание language

- `auto`: Автоматическое определение (обычно использует язык UI плагина)
- `zh-CN`: Китайский
- `en-US`: Английский

## Зависимости

- **Бэкенд**: Бэкенд ACP
- **Система Synthesis**: Требуется инициализация Synthesis Workbench
- **Статьи библиотеки**: Рекомендуется иметь достаточное количество связанных элементов статей уже в библиотеке

:::tip Рекомендуемая подготовка
Перед созданием Темы рекомендуется:
1. Убедиться, что все связанные статьи прошли [Анализ литературы](#doc/workflows%2Fliterature-analysis)
2. Убедиться, что связанные статьи прошли [Tag Regulator](#doc/workflows%2Ftag-regulator)
3. Запустить **Расширенное сопоставление** (расширенное сопоставление и дедупликация цитирований) на странице Индекса Synthesis Workbench
4. Обработать все элементы подтверждения на странице Рецензирования (не забудьте "Применить" ожидающие решения)

Точные отношения графа цитирований напрямую влияют на качество вычисления важности статей в Topic Synthesis (PageRank, оценка фронта и т.д.), тем самым улучшая общее качество обзора Темы.
:::

## Оценочная продолжительность

| Размер темы | Оценочное время |
|---------|---------|
| Малая тема (≤10 статей) | 8-12 минут |
| Средняя тема (10-30 статей) | 12-18 минут |
| Большая тема (30+ статей) | 18-25 минут |

Если статей много, рекомендуется использовать функцию обновления для инкрементальной итерации вместо этого.

## Рекомендации по модели

🔴 Рекомендуются модели с **сильным пониманием текста + длинным контекстом**. Topic Synthesis требует комплексного анализа большого количества дайджестов статей, отношений цитирований, тегов и концептуальных знаний, что делает её вычислительно интенсивной задачей. Если бэкенд поддерживает делегирование подагентов, многошаговый конвейер может быть выполнен более эффективно.

## Связанные Workflow

- [Обзор Synthesis Workbench](#doc/synthesis%2Findex) — Руководство по использованию Synthesis Workbench
- [Manuscript Literature Framing](#doc/workflows%2Fmanuscript-literature-framing) — Написание введений к статьям на основе результатов Topic Synthesis
