# Tag Regulator

## 用途

基于受控词表 (Controlled Vocabulary) 规范化 Zotero 条目的标签，并利用 AI 推断可能的新标签。

该 workflow 调用 Skill-Runner 后端的 `tag-regulator` skill，检查当前标签是否符合词表规范，并推荐相关标签。

## 输入约束

| 约束类型 | 说明                                                 |
| -------- | ---------------------------------------------------- |
| 输入单元 | 父条目 (parent)                                      |
| 数据来源 | 从父条目获取：当前标签、元数据（标题、作者、摘要等） |

若存在 literature digest 生成的 digest markdown embedded payload，workflow 会自动作为可选上下文上传。

### 触发方式

- 直接选中一个或多个 Zotero 条目（父条目）
- 选中条目后，在右键菜单中选择 "Tag Regulator"

## 运行过程

```
1. 加载受控词表
   └── 从 Zotero prefs 读取 tagVocabularyJson
       └── 解析词表中的有效标签列表

2. 构建请求
   └── 收集父条目的元数据
       └── 收集当前标签列表
       └── 将受控词表写入临时 YAML 文件
       └── 若父条目已有 digest markdown embedded payload，则写入临时 Markdown 文件
       └── 上传到 Skill-Runner

3. Skill-Runner 处理
   └── 调用 skill_id: "tag-regulator"
       └── 检查标签合规性
       └── 生成建议标签 (suggest_tags)

4. 返回结果
   └── 解析 resultJson
       └── 应用标签变更 (remove_tags, add_tags)
       └── 用当前本地词表/暂存区重整 suggest_tags
       └── 处理建议标签（弹窗交互）
```

### 标签规范化逻辑

- **remove_tags**: 不在受控词表中的当前标签
- **add_tags**: 根据元数据推断的推荐标签
- **suggest_tags**: AI 建议的新标签（需要用户确认）
- **digest_markdown**: 可选增强上下文；只在父条目存在 `digest-markdown` embedded payload 时上传，不提供用户开关，也不影响输出
  schema

### 返回时 live reconcile 规则

`tag-regulator` 使用提交时的受控词表快照给后端推理，但在结果回写阶段会再读取一次**最新本地状态**：

- 若某个返回的 `suggest_tag` 已经进入受控词表，则它不再弹窗提醒，而是按本轮 `add_tags` 语义参与条目标签更新
- 若某个返回的 `suggest_tag` 已经进入暂存区，则它不再弹窗提醒，也不会重复写入暂存区
- 只有“返回时仍未处理”的 suggestion 才会进入 suggest dialog

### 弹窗交互

对于 `suggest_tags`，会弹出对话框让用户选择处理方式：

- **加入**: 直接添加到受控词表
- **暂存**: 放入暂存区（staged）
- **拒绝**: 忽略该建议
- **全部加入/暂存/拒绝**: 批量处理

对话框有 10 秒自动暂存倒计时。

## 运行产物

### 1. 标签变更

- **remove_tags**: 从条目中移除不在词表的标签
- **add_tags**: 向条目添加推荐标签
- 直接应用到选中的 Zotero 条目

### 2. 建议标签处理

- 用户通过弹窗选择处理方式
- 同意的标签：添加到 `tagVocabularyJson` prefs
- 暂存的标签：添加到 `tagVocabularyStagedJson` prefs

## 参数

| 参数                | 类型    | 说明                      | 默认值  |
| ------------------- | ------- | ------------------------- | ------- |
| `infer_tag`         | boolean | 是否启用标签推断          | `true`  |
| `valid_tags_format` | string  | 词表格式 (yaml/json/auto) | `yaml`  |
| `tag_note_language` | string  | 建议说明的语言            | `zh-CN` |

### valid_tags_format 可选值

- `yaml`: 使用 YAML 格式
- `json`: 使用 JSON 格式
- `auto`: 自动检测

### tag_note_language 可选语言

`zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`

## 依赖

- **受控词表**: 需要先通过 [tag-manager](../tag-manager/README.md) 或其他方式创建词表
- **后端**: Skill-Runner 服务
- **Backend 配置**: 在 Backend Manager 中配置 Skill-Runner 类型的后端
- **Skill**: Skill-Runner 端需部署 `tag-regulator` skill

## 相关工作流

- [tag-manager](../tag-manager/README.md): 标签受控词表管理界面
