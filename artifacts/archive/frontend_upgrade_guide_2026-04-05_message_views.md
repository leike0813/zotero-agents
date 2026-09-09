# Frontend Upgrade Guide (2026-04-05): Message Semantics and Dual Views

本文档是 [frontend_upgrade_guide_2026-04-04.md](/home/joshua/Workspace/Code/Python/Skill-Runner/artifacts/frontend_upgrade_guide_2026-04-04.md) 的续篇，补充最近几轮与聊天区消息语义、去重逻辑、以及 `plain / bubble` 双视图直接相关的升级要求。

如果你正在实现一个自定义前端，建议把两份文档一起看：

1. [frontend_upgrade_guide_2026-04-04.md](/home/joshua/Workspace/Code/Python/Skill-Runner/artifacts/frontend_upgrade_guide_2026-04-04.md)
2. 本文档

## 1. 本轮变更概览

这轮前端相关改动可以归纳为四件事：

1. 非终态 agent 文本不再伪装成 `reasoning`
2. 前端支持两种稳定视图：`plain` 和 `bubble`
3. 最终消息去重不再主要依赖“文本相等”，而是依赖显式收敛关系
4. 共享聊天脚本需要做缓存破坏，否则新模板可能调用到旧对象

## 2. 新的聊天语义模型

### 2.1 旧问题

旧实现里，很多 engine 的非终态 agent 文本会先被当成“推理过程”或“临时 reasoning”暴露，然后再在终态阶段 promote 成最终消息。

这会导致几个问题：

- 前端很难区分“真正的 reasoning”与“中间态 agent message”
- 不同 engine 的表现不一致
- 终态容易双显

### 2.2 新语义

现在前端应当区分三类 assistant 侧语义：

- `assistant_process`
  - 真正的过程事件
  - 来源于 FCMP：
    - `assistant.reasoning`
    - `assistant.tool_call`
    - `assistant.command_execution`
- `assistant_message`
  - 非终态 agent 文本
  - 来源于 FCMP：
    - `assistant.message.intermediate`
- `assistant_final`
  - 最终 assistant 文本
  - 来源于 FCMP：
    - `assistant.message.final`

换句话说：

- `assistant_message` 不再等价于 reasoning
- `assistant_message` 是独立消息语义

## 3. Chat Replay 的新消费方式

前端不应直接自己拼 FCMP 事件为 UI 项，推荐继续消费 canonical chat replay。

当前 chat replay 里关键 kind 为：

- `assistant_process`
- `assistant_message`
- `assistant_final`

建议前端先把它们投影成一份与视图模式无关的 canonical timeline，再做 `plain / bubble` 两种渲染。

## 4. `plain` 与 `bubble` 的正确语义

### 4.1 核心原则

`plain` 和 `bubble` 必须共享同一条 canonical timeline。

这意味着：

- 用户何时切换模式，不应影响消息分组结果
- 消息到达时当前前端处于哪种模式，不应影响之后的切换效果
- 两种模式的差异只在“投影渲染”，不在“历史组织”

### 4.2 `plain` 视图

`plain` 是默认视图，目标更接近终端式日志 + 对话混排。

规则：

- `assistant_message` 直接进入消息区
- `assistant_process` 仍放在过程抽屉中
- 过程抽屉允许折叠
- 抽屉内部不使用气泡/card 视觉
- 抽屉内部只用轻量分隔：
  - 分隔线
  - 左边界
  - 小标签
  - 弱背景
  - 紧凑字体

这点很重要：

- `plain` 不是“完全无抽屉”
- `plain` 只是“中间态 agent message 不再并入抽屉，抽屉内部也不再像聊天气泡”

### 4.3 `bubble` 视图

`bubble` 是传统视图。

规则：

- 非终态 `assistant_message` 必须与 `assistant_process` 一起进入过程抽屉
- 最终 `assistant_final` 仍单独显示为对话消息
- 这保持了旧的“推理抽屉 + 终态气泡”的使用习惯

换句话说：

- `plain` 看见的是“过程抽屉 + 中间消息直出”
- `bubble` 看见的是“过程抽屉中包含中间消息 + 最终消息单独成泡”

## 5. 去重不再依赖文本猜测

### 5.1 新的显式字段

`assistant.message.final` 及其对应 chat replay row 现在会带显式收敛关系：

- `replaces_message_id`

这表示：

- 当前 final 消息是由哪条 intermediate 消息收敛而来

### 5.2 前端去重优先级

前端去重应按以下优先级处理：

1. `replaces_message_id`
2. 相同 `message_id`
3. 文本完全相同，仅作为最后兜底

不要再只靠“文案相同”判断是否重复。

### 5.3 推荐处理方式

当出现一条 `assistant_final`：

- 若带 `replaces_message_id`
  - 先从当前 timeline 中移除对应的 intermediate message
- 再插入最终消息

如果你消费的是 chat replay 而不是实时 FCMP，也应按同样逻辑在本地 projection 中去重。

## 6. 缓存与兼容性要求

### 6.1 为什么会出现 `setDisplayMode is not a function`

如果模板已经引用了新版本的聊天区脚本接口，但浏览器仍缓存旧版 `chat_thinking_core.js`，就会出现：

`chatModel.setDisplayMode is not a function`

### 6.2 前端需要做什么

- 静态脚本引用必须做 cache-busting
  - 例如：
    - `chat_thinking_core.js?v=20260405a`
    - 或内容指纹/hash
- 页面初始化时要做兼容保护
  - 只有对象真的支持 `setDisplayMode/getDisplayMode` 时才调用
  - 否则至少降级为默认 `plain` 模式，而不是整个页面初始化失败

### 6.3 推荐写法

```js
function createCompatibleThinkingChatModel(initialMode) {
  const core = window.SkillRunnerThinkingChatCore;
  if (!core || typeof core.createThinkingChatModel !== "function") {
    return null;
  }
  const model = core.createThinkingChatModel(initialMode);
  if (model && typeof model.setDisplayMode === "function") {
    model.setDisplayMode(initialMode);
  }
  return model && typeof model.getEntries === "function" ? model : null;
}
```

## 7. 推荐的前端投影实现

### 7.1 不推荐

不要这样做：

- 在消息到达时，直接根据“当前 mode”把它塞进某种 UI 结构

这会导致：

- 切换 mode 后历史分组错乱
- `plain / bubble` 表现依赖“消息到达时的当前状态”

### 7.2 推荐

先维护 canonical entries / atoms：

- user messages
- system notices
- assistant process atoms
- assistant intermediate messages
- assistant finals

然后提供两个纯投影函数：

- `projectPlain(canonicalTimeline)`
- `projectBubble(canonicalTimeline)`

这样切换模式时，只需要：

1. 重新读取同一份 canonical timeline
2. 用另一种投影函数渲染

## 8. 与 2026-04-04 升级要求的关系

这轮文档是对 2026-04-04 指南的补充，而不是替代。

你仍然需要同时满足下面这些旧要求：

- provider-aware engine 使用显式 `provider_id + model`
- `waiting_auth` 使用 `auth_code_or_url`
- 是否显示 auth 输入框由：
  - `accepts_chat_input`
  - `input_kind`
  决定，而不是由 `auth_method` 名字决定

因此对自定义前端来说，完整升级目标现在是三组：

1. 模型选择：
  - `engine + provider_id + model`
2. 会话鉴权：
  - `auth_code_or_url`
  - auto-poll aware
3. 聊天区渲染：
  - `assistant_process / assistant_message / assistant_final`
  - `plain / bubble`
  - `replaces_message_id`

## 9. 前端迁移 Checklist

- 将聊天区数据模型扩展为三类 assistant 语义：
  - `assistant_process`
  - `assistant_message`
  - `assistant_final`
- 不再把 `assistant_message` 当成 reasoning
- 引入 mode-independent canonical timeline
- 将 `plain` 设为默认视图
- `bubble` 视图下，把非终态 `assistant_message` 放回过程抽屉
- `plain` 视图下，抽屉内部不再使用气泡/card
- 使用 `replaces_message_id` 去重 intermediate/final
- 模板静态脚本加 cache-busting
- 初始化时对旧缓存对象做防御式兼容
- 保持与 2026-04-04 指南中的 `provider_id + model` 和 `auth_code_or_url` 要求一致

## 10. 最小参考结构

### Canonical event rows

```ts
type ChatSemanticRow =
  | { kind: "user_message"; text: string }
  | { kind: "system_notice"; text: string }
  | { kind: "assistant_process"; messageId?: string; processType: string; text: string }
  | { kind: "assistant_message"; messageId?: string; text: string }
  | { kind: "assistant_final"; messageId?: string; replacesMessageId?: string; text: string };
```

### Plain projection

```ts
function projectPlain(rows: ChatSemanticRow[]) {
  // assistant_message -> message area
  // assistant_process -> lightweight drawer
}
```

### Bubble projection

```ts
function projectBubble(rows: ChatSemanticRow[]) {
  // assistant_message + assistant_process -> same thinking drawer
  // assistant_final -> assistant bubble
}
```

## 11. 参考实现位置

- [chat_thinking_core.js](/home/joshua/Workspace/Code/Python/Skill-Runner/server/assets/static/js/chat_thinking_core.js)
- [run_detail.html](/home/joshua/Workspace/Code/Python/Skill-Runner/server/assets/templates/ui/run_detail.html)
- [run_observe.html](/home/joshua/Workspace/Code/Python/Skill-Runner/e2e_client/templates/run_observe.html)
- [runtime_contract.schema.json](/home/joshua/Workspace/Code/Python/Skill-Runner/server/contracts/schemas/runtime_contract.schema.json)
- [factories.py](/home/joshua/Workspace/Code/Python/Skill-Runner/server/runtime/chat_replay/factories.py)
- [frontend_upgrade_guide_2026-04-04.md](/home/joshua/Workspace/Code/Python/Skill-Runner/artifacts/frontend_upgrade_guide_2026-04-04.md)

## 12. Breaking Changes Summary

对自定义前端而言，本轮新增的关键 breaking changes 是：

- 聊天区不能再把所有 assistant 中间文本当作 reasoning
- `assistant_message` 需要作为独立语义处理
- 最终消息去重不应再只靠文本比较
- `plain / bubble` 必须基于同一 canonical timeline 做投影
- 静态共享聊天脚本需要 cache-busting，否则新模板可能调用旧缓存对象

## 13. Markdown 与 LaTeX 公式渲染升级

### 13.1 背景

此前聊天区使用纯文本渲染（`white-space: pre-wrap`），无法正确显示结构化内容：

- 代码块无语法区分
- 表格无法显示
- 列表/标题无层次
- LaTeX 公式无法渲染

### 13.2 技术栈

前端现在使用以下本地化 vendor 资源：

| 库 | 版本 | 用途 | 文件大小 |
|---|---|---|---|
| markdown-it | v14 | Markdown 解析器 | 121KB |
| KaTeX | v0.16.9 | LaTeX 公式渲染 | 271KB + 23KB CSS |
| markdown-it-texmath | v1.0.1 | Markdown 与 KaTeX 集成 | 6KB |
| KaTeX Fonts | - | 数学符号字体 | 15 个文件，约 320KB |

所有资源存放于 `server/assets/static/vendor/` 目录，不依赖外部 CDN。

### 13.3 渲染配置

```javascript
// Markdown 解析器初始化
let mdParser = window.markdownit({
    html: false,        // 禁用 HTML 标签（XSS 防护）
    xhtmlOut: false,
    breaks: true,       // 支持段落内换行
    langPrefix: 'language-',
    linkify: false,
    typographer: false,
    quotes: '""\'\'',
    highlight: null
});

// LaTeX 公式支持
if (window.texmath && window.katex) {
    mdParser.use(window.texmath, {
        engine: window.katex,
        delimiters: 'dollars',  // 支持 $inline$ 和 $$display$$
        katexOptions: {
            throwOnError: false,
            output: 'htmlAndMath',
            displayMode: false
        }
    });
}

// 渲染辅助函数
function renderMarkdown(text) {
    if (!mdParser || typeof text !== 'string') {
        return safeText(text);
    }
    try {
        return mdParser.render(text).trimEnd();
    } catch (e) {
        console.warn('Markdown render error, falling back to plain text:', e);
        return safeText(text);
    }
}
```

### 13.4 支持的语法

**基础 Markdown：**

- 标题（h1-h6）
- 粗体、斜体
- 无序/有序列表
- 行内代码与代码块
- 表格（带边框和斑马纹）
- 引用块（左边界 + 弱色）
- 链接（可点击）

**LaTeX 公式：**

- 行内公式：`$E = mc^2$`
- 块级公式：`$$\sum_{i=1}^n x_i$$`
- 分数：`$\frac{a}{b}$`
- 上下标：`$x^2$, $x_i$`
- 根号：`$\sqrt{x}$`
- 希腊字母：`$\alpha$, $\beta$`
- 积分：`$\int_a^b f(x)dx$`

### 13.5 样式调整

```css
/* 聊天气泡行距优化 */
.chat-bubble {
    line-height: 1.4;  /* 原 1.5 */
}

/* 纯文本模式行距 */
.chat-plain-body {
    line-height: 1.5;  /* 原 1.65 */
}

/* 代码块样式 */
.chat-bubble pre {
    background: #f6f8fa;
    padding: 12px;
    border-radius: 6px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
}

/* 表格样式 */
.chat-bubble table {
    border-collapse: collapse;
    width: 100%;
}
.chat-bubble th,
.chat-bubble td {
    border: 1px solid #d0d7de;
    padding: 8px 12px;
}
.chat-bubble th {
    background: #f6f8fa;
}
.chat-bubble tr:nth-child(even) {
    background: #f6f8fa;
}

/* 引用样式 */
.chat-bubble blockquote {
    border-left: 4px solid #d0d7de;
    padding-left: 16px;
    color: #656d76;
}

/* 移除末尾元素多余间距 */
.chat-bubble > :last-child {
    margin-bottom: 0;
}
```

### 13.6 XSS 防护

- `markdown-it` 配置 `html: false` 禁用原始 HTML
- 所有 HTML 标签自动转义
- 不支持用户注入脚本

### 13.7 Plain/Bubble 视图兼容

两种视图共享同一 Markdown 渲染逻辑：

```javascript
// Bubble 模式
bubble.innerHTML = renderMarkdown(message.text);

// Plain 模式
plainBody.innerHTML = renderMarkdown(message.text);
```

切换视图时 Markdown 格式保持不丢失。

### 13.8 参考实现位置

- [run_observe.html](/home/joshua/Workspace/Code/Python/Skill-Runner/e2e_client/templates/run_observe.html) (line 1054-1058, 1249-1289)
- Vendor 资源目录：`server/assets/static/vendor/`

## 14. Breaking Changes Summary（补充）

除了前述变更外，自定义前端还需要注意：

- 聊天区现在使用 Markdown 渲染而非纯文本
- 需要引入 markdown-it + KaTeX + texmath 三个 vendor 资源
- 样式需要相应调整以支持代码块、表格、引用等元素
- 行距参数已优化：bubble 1.4, plain 1.5
