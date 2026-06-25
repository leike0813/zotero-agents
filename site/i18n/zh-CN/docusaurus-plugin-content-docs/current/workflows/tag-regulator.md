# 标签规范化

## 用途

基于受控词表（Controlled Vocabulary）规范化 Zotero 条目的标签，并利用 AI 推断可能的新标签。

该 workflow 调用 Skill-Runner 后端的 `tag-regulator` skill，检查标签是否符合词表规范，并推荐相关标签。

## 适用场景

- 批量清理不规范标签
- 基于已有受控词表为条目自动推荐标签
- 维护受控词表的持续更新和完善

## 输入约束

| 约束类型 | 说明 |
|---------|------|
| 输入单元 | 父条目（parent） |
| 数据来源 | 从父条目获取：当前标签、元数据（标题、作者、摘要等） |

若存在 literature-analysis 生成的 digest markdown embedded payload，workflow 会自动将其作为可选上下文上传，以提升推断质量。

### 触发方式

- 直接选中一个或多个 Zotero 条目（父条目）
- 选中条目后，在右键菜单中选择"Tag Regulator"

## 运行过程

```
1. 加载受控词表
   └── 从 Zotero 偏好设置读取 tagVocabularyJson
       └── 解析词表中的有效标签列表

2. 构建请求
   └── 收集父条目的元数据和当前标签列表
       └── 将受控词表写入临时 YAML 文件
       └── 上传到 Skill-Runner

3. Skill-Runner 处理
   └── 调用 skill_id: "tag-regulator"
       └── 检查标签合规性
       └── 生成建议标签（suggest_tags）

4. 返回结果
   └── 应用标签变更（移除不合规标签，添加推荐标签）
       └── 用当前本地词表重整建议标签
       └── 处理建议标签（弹窗交互）
```

### 标签处理逻辑

- **remove_tags**：不在受控词表中的当前标签将被移除
- **add_tags**：根据元数据推断的推荐标签，直接添加到条目
- **suggest_tags**：AI 建议的新标签，需要用户确认
- **digest_markdown**：可选增强上下文，仅在存在 digest markdown embedded payload 时上传

### 实时同步规则

返回结果时会读取最新本地状态：

- 若某个 `suggest_tag` 已经进入受控词表，则不再弹窗，按 `add_tags` 语义参与条目更新
- 若某个 `suggest_tag` 已经在暂存区，则不会重复写入暂存区
- 只有仍未处理的 suggestion 才会进入弹窗

### 预估耗时

| 场景 | 单篇预估耗时 |
|------|-------------|
| 无摘要（未执行 Literature Analysis） | 约 1 分钟 |
| 有摘要（已执行 Literature Analysis） | 1-3 分钟 |

如果条目已有 digest，AI 会将摘要作为额外上下文输入，推断更精准但耗时更长。

### 建议标签弹窗

对于 `suggest_tags`，弹出对话框让用户选择处理方式：

- **加入**：直接添加到受控词表
- **暂存**：放入暂存区（Staged），后续审核
- **拒绝**：忽略该建议
- **全部加入/暂存/拒绝**：批量处理

对话框有 10 秒自动暂存倒计时，超时自动暂存。

## 运行产物

### 1. 标签变更
- **remove_tags**：从条目中移除不在词表的标签
- **add_tags**：向条目添加推荐标签
- 直接应用到选中的 Zotero 条目

### 2. 建议标签处理
- 用户通过弹窗选择处理方式
- 同意的标签：添加到 `tagVocabularyJson` 偏好设置
- 暂存的标签：添加到 `tagVocabularyStagedJson` 偏好设置

## 模型建议

🟢 轻量模型即可——标签规范化本质上是简单的分类和匹配任务，不需要最强模型。

## 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `infer_tag` | boolean | 是否启用标签推断 | `true` |
| `valid_tags_format` | string | 词表格式 | `yaml` |
| `tag_note_language` | string | 建议说明的语言 | `zh-CN` |

### valid_tags_format 可选值

- `yaml`：使用 YAML 格式
- `json`：使用 JSON 格式
- `auto`：自动检测

## 依赖

- **受控词表**：需要先创建受控词表，参见 [Tags 管理](../synthesis/tags)
- **后端**：Skill-Runner 服务
- **Backend 配置**：在 Backend Manager 中配置 Skill-Runner 类型的后端
- **Skill**：Skill-Runner 端需部署 `tag-regulator` skill

## 相关工作流

- [Tags 管理](../synthesis/tags) — 管理受控标签词表
