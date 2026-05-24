# Synthesis Knowledge Graph Tag Vocabulary Design

Date: 2026-05-24

Parent design: `artifact/topic_graph_lightweight_design_20260519.md`

## Scope

Tag Vocabulary 是最独立的业务域，适合在 Foundation 后优先实现，用来验证 canonical store、projection、UI 和 Git sync 之前的本地管理模式。

本域包括：

- `synthesis/tags/vocabulary.json`
- `aliases.json`
- `abbrev.json`
- `protocol.json`
- tag-index projection。
- Tags UI。
- import merge wizard。
- tag-regulator / ingest / digest / synthesis 统一消费。

本域不包括：

- 多源 tag subscription。
- package registry。
- tag marketplace。
- old tag manager workflow 主路径。

## Canonical Files

```text
synthesis/tags/
  vocabulary.json
  aliases.json
  abbrev.json
  protocol.json
  manifest.json
```

`vocabulary.json` 是消费与同步真源。`aliases.json` 和 `abbrev.json` 是 canonical supporting files。

## Protocol

保留 TagVocab 核心约束：

```text
tag_pattern: ^[a-z_]+:[a-zA-Z0-9/_.-]+$
max_tag_length: 120
```

Facet enum:

```text
field
topic
method
model
ai_task
data
tool
status
```

## Import

Import 使用 merge wizard，不静默 replace。

Wizard actions:

```text
keep local
use imported
merge non-conflicting
review conflicts
```

旧 TagVocab 的 `subscribe` naming 只作为协议兼容概念。v1 使用：

```text
load_vocabulary(source)
```

## Tags UI

Tags 是独立页面，不再由 workflow 承担主路径。

布局：

```text
Facet sidebar
  -> tag table / grouped list
  -> tag inspector
```

Top actions:

```text
Search
Validate
Import / Export
Sync status
```

Inspector fields:

```text
canonical tag
facet
note
aliases
abbrev
deprecated / replacement
usage count
source
last synced
validation warnings
```

## Projection

`tag-index.sqlite` 负责：

- tag vocabulary lookup。
- alias / abbrev lookup。
- vocabulary manifest / validation status。
- normalized tag search。

## Acceptance Criteria

- 新 UI 能替代旧 tag manager workflow 主路径。
- 可导入 TagVocab-compatible `tags.json`。
- conflict import 进入 merge wizard。
- tag-regulator 能从同一 tag index 读取 vocabulary。
- validation warning 可定位到具体 tag。

## Dependencies

- Foundation canonical store。
- Foundation projection rebuild。

