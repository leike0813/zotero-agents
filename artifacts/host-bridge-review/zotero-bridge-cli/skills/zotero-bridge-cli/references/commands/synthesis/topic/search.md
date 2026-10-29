# `zotero-bridge synthesis topic search`

搜索规范主题内容

## 用法

```console
zotero-bridge synthesis topic search [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --query <JSON_OR_FILE>
```

全局选项可放在叶命令之前或之后。使用 `--schema` 检查原始结构化输入 schema，无需加载 profile 或连接 Zotero。

## 全局参数

| 参数 | ID | 类型 | 必填 | 条件要求 | 值 / 数量 | 可重复 | 环境变量 | 冲突 | 帮助 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --endpoint | endpoint | option | no | — | ENDPOINT | no | ZOTERO_BRIDGE_ENDPOINT | — | Zotero Bridge 服务端点基础 URL。省略时，CLI 读取 ZOTERO_BRIDGE_ENDPOINT 或 profile 文件，不猜测随机 bridge 端口。 |
| --operation-id | operation_id | option | no | — | ID | no | ZOTERO_BRIDGE_OPERATION_ID | — | 改变 Zotero 状态的请求所使用的不透明幂等 ID |
| --profile | profile | option | no | — | PATH | no | ZOTERO_BRIDGE_PROFILE | — | Zotero Bridge connection-profile JSON 文件的路径。省略时，CLI 尝试 Zotero Agents 的 well-known profile。ACP run profile 通常引用 tokenEnv；本地 well-known profile 可能包含由用户级文件权限保护的 bearer token。 |
| --schema | schema | option | no | — | SCHEMA; values: true, false | no | — | — | 打印一个规范叶命令的带版本原始 JSON Schemas 和受治理示例。Schema 模式离线运行，不加载 profile、不读取 Zotero Bridge 配置，也不连接 Zotero。 |

## 局部选项与位置参数

| 参数 | ID | 类型 | 必填 | 条件要求 | 值 / 数量 | 可重复 | 环境变量 | 冲突 | 帮助 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --query | query | option | yes | — | JSON_OR_FILE | no | — | — | 规范有界主题搜索请求 JSON。可使用内联 JSON，如 '{"query":"graph","limit":10,"maxResults":100}'，也可提供 JSON 文件路径、@file，或用 '-' 从 stdin 读取。继续查询时，在同一个请求容器中原样保留返回的 cursor。 |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "query": {
      "description": "Canonical bounded topic search request as JSON",
      "type": "string"
    }
  },
  "required": [
    "query"
  ],
  "type": "object"
}
```

## 结构化输入 schema

### `--query`（query）

必填：`true`。

```json
{
  "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/TopicSearchRequest"
}
```

## 组合后的 payload schema

```json
{
  "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/TopicSearchRequest"
}
```

## Payload 组合

此命令没有独立的字段映射程序。其绑定模式可直接执行：passthrough 使用唯一的结构化来源，`none` 和 `raw` 保持各自声明的封闭行为。

`composition`: `null`.

## 结果 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "approval": {
      "minLength": 1,
      "type": "string"
    },
    "capability": {
      "const": "topics.search"
    },
    "data": {
      "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/TopicSearchResult"
    }
  },
  "required": [
    "capability",
    "approval",
    "data"
  ],
  "type": "object"
}
```

## 示例

### query：形状示例

通过 --query 完整传递的规范有界主题搜索请求。

```console
zotero-bridge synthesis topic search --query '{"limit":25,"maxResults":100,"query":"example phrase","sections":["summary","claims"]}'
```

前提条件：

- 使用非空查询，长度不超过 4096 个 UTF-16 代码单元；将示例章节名替换为当前 Synthesis 数据根中有效的规范主题章节。

## 完整命令描述符

此封闭描述符是 `surface describe` 返回的机器可读命令契约；在此完整列出，便于独立审阅本命令卡，无需加载另一份命令参考。

```json
{
  "approvalContract": {
    "kind": "none",
    "scope": "No Zotero UI approval; provider runtimes may still request their own permission.",
    "timing": "none"
  },
  "arguments": [
    {
      "aliases": [
        "input"
      ],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Canonical bounded topic search request as JSON",
      "id": "query",
      "kind": "option",
      "longHelp": "Canonical bounded topic search request JSON. Use inline JSON such as '{\"query\":\"graph\",\"limit\":10,\"maxResults\":100}', a file path containing JSON, @file syntax, or '-' to read JSON from stdin. Keep the returned cursor unchanged in this same request container to continue.",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--query",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "argv": [
    "synthesis",
    "topic",
    "search"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "query",
      "required": true,
      "takesValue": true,
      "token": "--query",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "binding": "passthrough",
  "category": "read",
  "command": "synthesis topic search",
  "composition": null,
  "danger": "none",
  "effects": [
    {
      "description": "Searches bounded current canonical topic content without changing Zotero-managed data.",
      "kind": "none",
      "stateChanged": false
    }
  ],
  "handleTransitions": [],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {
    "query": {
      "examples": [
        {
          "description": "Canonical bounded topic search request carried intact by --query.",
          "kind": "shape-only",
          "prerequisites": [
            "Use a non-empty query no longer than 4096 UTF-16 code units; replace example section names with canonical topic sections valid for the current Synthesis data root."
          ],
          "value": {
            "limit": 25,
            "maxResults": 100,
            "query": "example phrase",
            "sections": [
              "summary",
              "claims"
            ]
          }
        }
      ],
      "required": true,
      "requiredWhen": [],
      "schema": {
        "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/TopicSearchRequest"
      },
      "schemaSource": "target-capability",
      "token": "--query"
    }
  },
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "query": {
        "description": "Canonical bounded topic search request as JSON",
        "type": "string"
      }
    },
    "required": [
      "query"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "synthesis topic search",
    "synthesis",
    "topic",
    "search",
    "query",
    "JSON_OR_FILE"
  ],
  "outputBoundary": {
    "continuation": [
      "data.nextCursor",
      "data.hasMore",
      "data.total"
    ],
    "cursorInput": "cursor",
    "defaultLimit": 25,
    "maxLimit": 100,
    "section": "data.results",
    "strategy": "cursor"
  },
  "pagination": "cursor",
  "payloadSchema": {
    "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/TopicSearchRequest"
  },
  "recovery": [
    {
      "action": "Preserve the structured search error. Do not retry or rerun with the rejected cursor; start a fresh search only when a new search is intended and inspect every returned coverage issue before claiming completeness. Run `zotero-bridge surface describe 'synthesis topic search'` to confirm the live request and cursor contract.",
      "nextCommand": "surface describe",
      "requiresHandles": [],
      "stateCheck": "none",
      "when": "The read fails or returns a stale, expired, or basis-mismatched search cursor."
    }
  ],
  "resultSchema": {
    "additionalProperties": false,
    "properties": {
      "approval": {
        "minLength": 1,
        "type": "string"
      },
      "capability": {
        "const": "topics.search"
      },
      "data": {
        "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/TopicSearchResult"
      }
    },
    "required": [
      "capability",
      "approval",
      "data"
    ],
    "type": "object"
  },
  "summary": "Search canonical topic content",
  "targets": [
    {
      "kind": "capability",
      "target": "topics.search"
    }
  ]
}
```

## 参数失败与恢复契约

参数失败以单个 JSON 错误封装返回。先检查 `error.code`，再确认 `error.details.schema` 为 `host-bridge.argument-error.v1`，随后才能使用结构化边界字段。保留规范命令、脱敏输入及已返回的类型化 handles；证据中不得包含完整原始 payload。

- `argv` 表示 CLI 参数缺失、未知、冲突或无效。根据本卡的参数表或当前命令帮助重建 argv。
- `json_source` 表示无法读取 stdin 或文件来源。修正该来源，保持值的原有绑定。
- `json_syntax` 表示 JSON 无效，并提供安全的行列信息。先修正语法，再解释领域字段。
- `command_input` 表示结构化输入违反 schema。检查有界的 `violations`，然后为这个精确叶命令运行 `--schema`，修正已声明的字段或类型；不得自行编造别名。
- `payload_contract` 表示 CLI 组合后的 capability payload 在网络 I/O 之前违反可执行契约。这是实现故障；不得通过 raw transport 绕过语义命令。
- `command_result` 表示 Host 响应或本地结果未通过可执行结果 schema。不得接受它或将其报告为成功证据。
- 违规数组经过脱敏、按确定顺序排列，最多包含八项。`truncated` 为 true 时，修正已报告的违规项后重新验证，不得请求披露秘密或完整 payload。

## 操作契约

- 规范 argv 路径： `synthesis` `topic` `search`.
- 输出边界： `cursor`; 受治理详情： {"continuation":["data.nextCursor","data.hasMore","data.total"],"cursorInput":"cursor","defaultLimit":25,"maxLimit":100,"section":"data.results","strategy":"cursor"}.
- 分页： `cursor`.
- 类别： `read`; 危险级别： `none`.
- 结构化绑定模式： `passthrough`.
- 意图可见性： `visible`.
- 操作别名： `synthesis topic search`, `synthesis`, `topic`, `search`, `query`, `JSON_OR_FILE`.

### 效果

```json
[
  {
    "description": "Searches bounded current canonical topic content without changing Zotero-managed data.",
    "kind": "none",
    "stateChanged": false
  }
]
```

### 审批

```json
{
  "kind": "none",
  "scope": "No Zotero UI approval; provider runtimes may still request their own permission.",
  "timing": "none"
}
```

### Handle 状态转换

```json
[
]
```

### 恢复

```json
[
  {
    "action": "Preserve the structured search error. Do not retry or rerun with the rejected cursor; start a fresh search only when a new search is intended and inspect every returned coverage issue before claiming completeness. Run `zotero-bridge surface describe 'synthesis topic search'` to confirm the live request and cursor contract.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "none",
    "when": "The read fails or returns a stale, expired, or basis-mismatched search cursor."
  }
]
```

### 目标

```json
[
  {
    "kind": "capability",
    "target": "topics.search"
  }
]
```
