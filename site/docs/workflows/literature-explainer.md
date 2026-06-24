# 交互式文献解读

## 用途

与 AI 进行多轮对话，深入理解文献内容。支持基于文献上下文的自由问答，对话结束后自动生成结构化的学习笔记。

:::tip 不用担心幻觉问题
AI 的回答必须经过**验证门禁**。有疑问的答案会被显式提醒，你可以放心地与 AI 讨论论文细节。
:::

## 适用场景

- 阅读论文时有不理解的概念或术语
- 想深入了解论文的某一部分（方法、实验、推导）
- 与 AI 一起梳理论文的思路和贡献

## 输入约束

| 约束类型 | 说明 |
|---------|------|
| 输入单元 | 附件（attachment） |
| 接受类型 | `text/markdown`、`text/x-markdown`、`text/plain`、`application/pdf` |
| 每父条目限制 | 最多 1 个附件 |

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

### 交互流程

1. Workflow 启动后，Task Dashboard 会自动打开聊天面板
2. 在聊天输入框中输入问题或指令
3. AI 回复会实时显示在面板中
4. 对话可以持续进行，直到用户选择结束
5. 关闭面板时触发结果处理

## 预估耗时

取决于对话轮数。文献加载和初始化约需 1-2 分钟，之后的对话实时进行。

## 模型建议

🟡 建议使用**有网络搜索能力**的模型。Literature Explainer 内置证据验证机制——如果模型能联网验证论文中的引用和事实，验证质量会大幅提升。无法联网时验证功能会严重受限，但仍可进行基于文献内容的推理和问答。

## 运行产物

执行完成后，在父条目下创建 **1 个学习笔记（Conversation Note）**：

- 类型：`data-zs-note-kind="conversation"`
- 内容：问答历史记录（HTML 格式），可作为学习笔记保留
- 更新策略：每次执行会创建新的对话 note（而非覆盖）

## 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `language` | string | 对话语言 | `zh-CN` |

可选值：`zh-CN`、`en-US`、`ja-JP`、`ko-KR`、`de-DE`、`fr-FR`、`es-ES`、`ru-RU`，支持自定义输入。

## 依赖

- **后端**：Skill-Runner 服务
- **Backend 配置**：在 Backend Manager 中配置 Skill-Runner 类型的后端
- **Skill**：Skill-Runner 端需部署 `literature-explainer` skill

## 相关工作流

- [文献分析](literature-analysis) — 自动生成文献摘要（建议先执行）
- [深度阅读](literature-deep-reading) — 生成结构化精读视图
