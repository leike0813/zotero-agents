# Frontend Upgrade Guide (2026-04-04)

本文档面向接入 Skill Runner API 的前端或 SDK 实现者，汇总最近两轮与前端直接相关的协议变化：

1. provider-aware engine 的 `provider_id + model` 规范化；
2. 会话中鉴权 (`waiting_auth`) 的 `auth_code_or_url` 语义统一与 qwen auto-poll 行为。

## 1. 影响概览

这两轮变更里，真正需要前端配合修改的点主要有两类：

- run / model 选择阶段：
  - 对 provider-aware engine，推荐显式传 `provider_id + model`
  - 不再依赖把 provider 编进 `model` 字符串里
- `waiting_auth` 阶段：
  - 会话鉴权的旧值 `authorization_code` 已切为 `auth_code_or_url`
  - `auth_code_or_url` 不再等于“一定需要输入框”
  - 某些 challenge 会自动推进，前端只负责展示 URL / user code 并轮询

## 2. Provider + Model 传值方式

### 新推荐写法

对 provider-aware engine，前端应显式提交：

```json
{
  "engine": "qwen",
  "provider_id": "coding-plan-global",
  "model": "qwen3-coder-plus"
}
```

```json
{
  "engine": "opencode",
  "provider_id": "openai",
  "model": "gpt-5"
}
```

### 旧写法的现状

- `opencode` 旧客户端仍可能使用 `model="openai/gpt-5"` 这类 `provider/model` 写法
- 当前后端对这类旧写法仍保留兼容，但它已经不是推荐协议
- `qwen` 不应继续使用这种写法，尤其是 Coding Plan provider 可能暴露同名模型，必须靠 `provider_id` 区分

### 前端需要改什么

- model picker 的选中结果，内部状态应拆成：
  - `engine`
  - `provider_id`
  - `model`
- 不要再把 provider 只存在 `model` 字符串里
- 从模型列表接口返回值中优先读取：
  - `provider_id`
  - `model`
- `id` 可以继续用于展示或兼容，但新代码不应把它当成唯一规范来源

## 3. 会话中鉴权协议变化

### 旧行为

此前 `waiting_auth` 聊天侧协议会把人工 OAuth 返回内容表示为：

- `auth_method = authorization_code`
- `challenge_kind = authorization_code`
- `input_kind = authorization_code`

前端通常会把这类 challenge 直接理解为“显示输入框，让用户粘贴 code”。

### 新行为

现在统一切为：

- `auth_method = auth_code_or_url`
- `challenge_kind = auth_code_or_url`
- `input_kind = auth_code_or_url`

但这里最重要的变化不是字符串本身，而是：

`auth_code_or_url` 现在只表示“人工 OAuth 返回内容”这一类统一语义，不再隐含“必须要求用户输入”。

前端是否显示输入框，应以以下字段为准：

- `accepts_chat_input`
- `input_kind`

### 新的判断原则

#### 需要显示输入框

当同时满足：

- `accepts_chat_input = true`
- `input_kind` 非空

前端才应显示输入框，并允许用户提交 auth 输入。

#### 不需要显示输入框

当：

- `accepts_chat_input = false`
- `input_kind = null`

前端应隐藏输入框，并继续轮询状态。

这类 challenge 仍可能包含：

- `auth_url`
- `user_code`

此时前端应继续展示这些信息，供用户在浏览器中完成授权。

## 4. Qwen 的特殊可见行为变化

### `qwen-oauth + oauth_proxy`

当前真实行为是：

- 会话进入 `waiting_auth`
- `pending_auth` 返回 `auth_url + user_code`
- `accepts_chat_input = false`
- `input_kind = null`
- 后端自动轮询，不要求用户额外提交一次 `/input`

也就是说，前端不应再做这件事：

- 展示一个“授权码输入框”
- 要求用户随便输入任意非空文本来触发轮询

正确行为是：

- 展示 URL / user code
- 隐藏输入框
- 持续轮询 `interaction/pending` / `auth/session`
- 等待后端自动推进到完成或失败

### `qwen coding-plan`

`coding-plan-china` / `coding-plan-global` 仍然是 API key 语义：

- `accepts_chat_input = true`
- `input_kind = api_key`

这类 challenge 前端仍应展示输入框。

## 5. 前端迁移 Checklist

### Run 创建 / 模型选择

- 将 provider-aware engine 的模型选择状态拆成 `provider_id + model`
- `POST /v1/jobs` 优先按 `engine + provider_id + model` 提交
- 不再把 `provider/model` 当成主写法
- Qwen 前端强制要求显式 `provider_id`

### Waiting Auth 渲染

- 不再识别或发送 `authorization_code`
- 统一改成 `auth_code_or_url`
- 渲染逻辑改为以 `accepts_chat_input` 和 `input_kind` 为准
- 当 `input_kind` 为空时，允许 challenge 仍然展示 `auth_url` / `user_code`

### Auth Input 提交

- 聊天侧 auth 提交 payload 使用：

```json
{
  "mode": "auth",
  "auth_session_id": "auth-xxx",
  "submission": {
    "kind": "auth_code_or_url",
    "value": "..."
  }
}
```

- 不再发送：

```json
{
  "submission": {
    "kind": "authorization_code"
  }
}
```

### Waiting Auth 轮询

- `waiting_auth` 阶段建议同时轮询：
  - `GET /v1/jobs/{request_id}/interaction/pending`
  - `GET /v1/jobs/{request_id}/auth/session`
- `interaction/pending` 用于渲染聊天侧交互
- `auth/session` 用于判断底层 engine auth session 状态

## 6. 推荐的前端判断逻辑

### 模型请求

```ts
const payload = {
  engine,
  provider_id,
  model,
};
```

### Waiting Auth 卡片

```ts
const acceptsChatInput = pendingAuth?.accepts_chat_input === true;
const inputKind = String(pendingAuth?.input_kind || "").trim();

if (acceptsChatInput && inputKind) {
  showInputComposer(inputKind);
} else {
  hideInputComposer();
}

showAuthUrlIfPresent(pendingAuth?.auth_url);
showUserCodeIfPresent(pendingAuth?.user_code);
pollPendingAndAuthSession();
```

### Auth 提交种类

```ts
const submissionKind = inputKind || "auth_code_or_url";
```

注意：这个默认值只适用于“当前 challenge 确实接收聊天输入”的情形。  
如果 `accepts_chat_input=false`，前端根本不应发起 auth input 提交。

## 7. Breaking Changes Summary

以下变化对自定义前端是显式 breaking change：

- 会话鉴权的 `authorization_code` 已移除，改为 `auth_code_or_url`
- 前端不应再把 `auth_code_or_url` 等同于“必须显示输入框”
- qwen `qwen-oauth + oauth_proxy` 在会话中不再要求伪输入确认

以下变化是推荐协议升级，但后端目前仍有一定兼容：

- `opencode` 从 `model=provider/model` 迁移到显式 `provider_id + model`

以下变化建议视为必须升级：

- `qwen` 使用显式 `provider_id + model`

## 8. 参考位置

当前代码中的协议真相可参考：

- [docs/api_reference.md](/home/joshua/Workspace/Code/Python/Skill-Runner/docs/api_reference.md)
- [interaction.py](/home/joshua/Workspace/Code/Python/Skill-Runner/server/models/interaction.py)
- [run_auth_orchestration_service.py](/home/joshua/Workspace/Code/Python/Skill-Runner/server/services/orchestration/run_auth_orchestration_service.py)
- [run_observe.html](/home/joshua/Workspace/Code/Python/Skill-Runner/e2e_client/templates/run_observe.html)
