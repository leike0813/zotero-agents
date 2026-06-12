# Tag Manager

## 用途

标签受控词表 (Controlled Vocabulary) 的完整管理界面，提供增删改查、批量导入导出、分面过滤等功能。

该 workflow 为纯本地执行 (pass-through)，用于维护标准化的标签体系。
当 workflow settings 中配置了以下 GitHub 语义字段后，会进入“订阅模式”，自动订阅/发布远端
`tags/tags.json`：

- `github_owner`
- `github_repo`
- `file_path`
- `github_token`

## 输入约束

| 约束类型 | 说明                       |
| -------- | -------------------------- |
| 输入单元 | 无特定输入（独立 UI 入口） |
| 触发方式 | 右键菜单选择 "Tag Manager" |

## 运行过程

```
1. 启动界面
   ├── 解析当前模式
   │   ├── 本地模式：读取 local committed vocabulary
   │   └── 订阅模式：读取 remote committed snapshot
   └── 加载暂存区 (tagVocabularyStagedJson)

2. 订阅远端词表（可选）
   └── 若 GitHub 同步配置完整
       ├── 自动读取远端 tags/tags.json 并作为 committed snapshot
       └── 编辑器以该 committed snapshot 作为初始 entries

3. 用户操作
   └── 受控词表面板
       ├── 添加标签
       ├── 编辑标签（tag、facet、note、deprecated）
       ├── 删除标签
       ├── 搜索过滤
       ├── 分面过滤 (field/topic/method/model/ai_task/data/tool/status)
       └── 导出标签

   └── 暂存区面板
       ├── 查看暂存标签
       ├── 批量提升到受控词表
       │   ├── 本地模式：立即写入 local committed vocabulary
       │   └── 订阅模式：进入 1000ms debounce 批次发布，发布成功后才进入 committed snapshot
       ├── 删除暂存
       └── 清空暂存区
```

### 导入/导出功能

#### 导入 YAML

- 支持 YAML 格式批量导入
- 支持重复处理策略：skip / overwrite / error
- 支持 Dry Run 模式预览结果

#### 导出

- 导出为纯标签字符串列表（每行一个）
- 支持复制到剪贴板

## 运行产物

### 1. Active Projection

- **位置**: Zotero prefs `tagVocabularyJson`
- **格式**: JSON
- **语义**: 当前模式下 committed vocabulary 的兼容投影，不再是唯一真源

### 2. 本地模式 committed 词表

- **位置**: Zotero prefs `tagVocabularyLocalCommittedJson`
- **格式**: JSON

### 3. 订阅模式 committed snapshot

- **位置**: Zotero prefs `tagVocabularyRemoteCommittedJson`
- **格式**: JSON

### 4. 暂存区存储

- **位置**: Zotero prefs `tagVocabularyStagedJson`
- **格式**: JSON
- **结构**: 类似受控词表，额外包含 `createdAt`, `updatedAt`, `sourceFlow` 字段

### 5. 受控词表结构示例

```json
{
  "version": 1,
  "entries": [
    {
      "tag": "topic:machine-learning",
      "facet": "topic",
      "source": "manual",
      "note": "机器学习相关文献",
      "deprecated": false
    }
  ]
}
```

## 标签格式规范

### 标签格式

- 格式: `facet:value`
- 正则: `^[a-z_]+:[a-zA-Z0-9/_.-]+$`
- 示例: `topic:neural-network`, `method:transformer`

### Facet 类型

| Facet     | 说明     |
| --------- | -------- |
| `field`   | 研究领域 |
| `topic`   | 主题     |
| `method`  | 方法     |
| `model`   | 模型     |
| `ai_task` | AI 任务  |
| `data`    | 数据类型 |
| `tool`    | 工具     |
| `status`  | 状态     |

### 标签字段

| 字段         | 类型    | 说明                                  |
| ------------ | ------- | ------------------------------------- |
| `tag`        | string  | 完整标签 (facet:value)                |
| `facet`      | string  | 分面类型                              |
| `source`     | string  | 来源 (manual/import/agent-suggest 等) |
| `note`       | string  | 备注说明                              |
| `deprecated` | boolean | 是否已废弃                            |

### 6. 远端发布（订阅模式）

- `Save` 与 staged 提升都走远端事务提交
- 仅在发布成功后才更新 committed snapshot
- staged 批次发布失败时：
  - 条目保留在 staged
  - committed snapshot 不变
  - 显示失败提示
- 主编辑区保存失败时：
  - committed snapshot 不变
  - 当前 draft 保留并允许重试

## 依赖

- 无外部依赖（纯本地执行）
- 数据存储在 Zotero prefs 中

## 相关工作流

- [tag-regulator](../tag-regulator/README.md): 使用受控词表规范化标签
