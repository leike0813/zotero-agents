# Literature Explainer

## 用途

交互式文献解读工具，支持用户与 AI 进行多轮对话，深入理解文献内容，并自动生成结构化的对话笔记。

该 workflow 以交互模式调用 Skill-Runner 后端的 `literature-explainer` skill，适合需要深入分析特定文献的场景。

## 输入约束

| 约束类型     | 说明                                                                |
| ------------ | ------------------------------------------------------------------- |
| 输入单元     | 附件 (attachment)                                                   |
| 接受类型     | `text/markdown`, `text/x-markdown`, `text/plain`, `application/pdf` |
| 每父条目限制 | 最多 1 个附件                                                       |

### 触发方式

- 直接选中一个 PDF 或 Markdown 附件
- 选中父条目，插件自动展开其第一个符合条件的附件

## 运行过程

```
1. 构建请求
   └── 上传源文件到 Skill-Runner
       └── 调用 skill_id: "literature-explainer"

2. Skill-Runner 处理
   └── 启动 interactive 模式
       └── 打开 Dashboard 聊天面板

3. 用户交互
   └── 在 Task Dashboard 中与 AI 对话
       └── 可发送消息、查看回复

4. 结束对话
   └── 用户手动关闭或取消
       └── 生成对话结果
```

### 执行模式

- `request.create.mode`: `interactive` - 交互模式，打开聊天面板
- `poll_interval_ms`: 2000 - 轮询间隔 2 秒
- `timeout_ms`: 1200000 - 超时 20 分钟

### 交互流程

1. workflow 启动后，Task Dashboard 自动打开
2. 切换到对应任务的 Detail 面板
3. 在聊天输入框中输入问题或指令
4. AI 回复会实时显示在面板中
5. 对话可以持续进行，直到用户选择结束
6. 关闭面板时触发结果处理

## 运行产物

执行完成后，在父条目下创建 **1 个 Zotero Note**：

### Conversation Note

- **类型**: `data-zs-note-kind="conversation"`
- **内容**:
  - 对话历史记录（HTML 格式）
  - Payload: JSON 格式对话数据 (`conversation-json`)
- **更新策略**: 每次执行会创建新的对话 note（而非覆盖）

## 参数

| 参数       | 类型   | 说明     | 默认值  |
| ---------- | ------ | -------- | ------- |
| `language` | string | 对话语言 | `zh-CN` |

### 可选语言

`zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`

支持自定义输入（`allowCustom: true`）

## 依赖

- **后端**: Skill-Runner 服务
- **Backend 配置**: 在 Backend Manager 中配置 Skill-Runner 类型的后端
- **Skill**: Skill-Runner 端需部署 `literature-explainer` skill

## 相关工作流

- [literature-analysis](../literature-analysis/README.md): 自动生成文献摘要
- note-level `reference-note-editor` 已归档到 `deprecated/workflows_builtin`
