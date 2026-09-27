# `zotero-bridge navigation select-saved-search`

navigation select-saved-search

## 用法

```console
zotero-bridge navigation select-saved-search [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--input <JSON_OR_FILE>]
```

全局选项可出现在叶命令之前或之后。使用 `--schema` 检查原始结构化输入 schema，而无需加载 profile 或连接 Zotero。

## 全局参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --endpoint | endpoint | option | no | — | ENDPOINT | no | ZOTERO_BRIDGE_ENDPOINT | — | Zotero Bridge 服务端点基础 URL。若省略，CLI 读取 ZOTERO_BRIDGE_ENDPOINT 或 profile 文件。CLI 不会猜测随机的 bridge 端口。 |
| --operation-id | operation_id | option | no | — | ID | no | ZOTERO_BRIDGE_OPERATION_ID | — | 用于改变状态的 Zotero 请求的不透明 idempotency id |
| --profile | profile | option | no | — | PATH | no | ZOTERO_BRIDGE_PROFILE | — | Zotero Bridge connection-profile JSON 文件的路径。若省略，CLI 会尝试 Zotero Agents 的 well-known profile。ACP run profile 通常引用 tokenEnv；本地 well-known profile 可能包含受用户级文件权限保护的 bearer token。 |
| --schema | schema | option | no | — | SCHEMA; values: true, false | no | — | — | 打印一个规范叶命令的带版本原始 JSON Schema 与受管辖示例。Schema 模式为离线模式，不加载 profile、不读取 Zotero Bridge 配置，也不连接 Zotero。 |

## 局部选项与位置参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --input | input | option | no | — | JSON_OR_FILE | no | — | — | 导航输入 JSON |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "input": {
      "description": "Navigation input JSON",
      "type": "string"
    }
  },
  "required": [],
  "type": "object"
}
```

## 结构化输入 schema

### `--input`（input）

必需：`false`。

```json
{
  "additionalProperties": false,
  "properties": {
    "key": {
      "pattern": "^[A-Z0-9]{8}$",
      "type": "string"
    },
    "libraryId": {
      "minimum": 1,
      "type": "integer"
    }
  },
  "required": [
    "libraryId",
    "key"
  ],
  "type": "object"
}
```

## 组合载荷 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "key": {
      "pattern": "^[A-Z0-9]{8}$",
      "type": "string"
    },
    "libraryId": {
      "minimum": 1,
      "type": "integer"
    }
  },
  "required": [
    "libraryId",
    "key"
  ],
  "type": "object"
}
```

## 载荷组合

此命令没有独立的字段映射程序。其绑定模式为直接可执行：passthrough 使用唯一的结构化来源，而 `none` 与 `raw` 保持其声明的封闭行为。

`composition`：`null`。

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
      "const": "navigation.select_saved_search"
    },
    "data": {
      "additionalProperties": false,
      "properties": {
        "outcome": {
          "const": "selected"
        },
        "target": {
          "additionalProperties": false,
          "properties": {
            "key": {
              "pattern": "^[A-Z0-9]{8}$",
              "type": "string"
            },
            "libraryId": {
              "minimum": 1,
              "type": "integer"
            }
          },
          "required": [
            "libraryId",
            "key"
          ],
          "type": "object"
        }
      },
      "required": [
        "outcome",
        "target"
      ],
      "type": "object"
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

### input：仅形状示例

--input 的受管辖纯形状示例。

```console
zotero-bridge navigation select-saved-search --input '{"key":"ABCDEFGH","libraryId":1}'
```

## 完整命令描述符

此封闭描述符是 `surface describe` 返回的机器可读命令契约；此处包含它，以便在不加载另一份命令参考的情况下，本卡片仍可独立审计。

```json
{
  "approvalContract": {
    "kind": "none",
    "scope": "No per-call approval.",
    "timing": "none"
  },
  "arguments": [
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Navigation input JSON",
      "id": "input",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--input",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "argv": [
    "navigation",
    "select-saved-search"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "input",
      "required": false,
      "takesValue": true,
      "token": "--input",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "binding": "passthrough",
  "category": "navigation",
  "command": "navigation select-saved-search",
  "composition": null,
  "danger": "none",
  "effects": [
    {
      "description": "Selects a saved search.",
      "kind": "ui-navigation",
      "stateChanged": true
    }
  ],
  "handleTransitions": [],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {
    "input": {
      "examples": [
        {
          "kind": "shape-only",
          "prerequisites": [],
          "value": {
            "key": "ABCDEFGH",
            "libraryId": 1
          }
        }
      ],
      "required": false,
      "requiredWhen": [],
      "schema": {
        "additionalProperties": false,
        "properties": {
          "key": {
            "pattern": "^[A-Z0-9]{8}$",
            "type": "string"
          },
          "libraryId": {
            "minimum": 1,
            "type": "integer"
          }
        },
        "required": [
          "libraryId",
          "key"
        ],
        "type": "object"
      },
      "schemaSource": "target-capability",
      "token": "--input"
    }
  },
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "input": {
        "description": "Navigation input JSON",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "operationalAliases": [
    "navigation select-saved-search"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "key": {
        "pattern": "^[A-Z0-9]{8}$",
        "type": "string"
      },
      "libraryId": {
        "minimum": 1,
        "type": "integer"
      }
    },
    "required": [
      "libraryId",
      "key"
    ],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Inspect the structured error before retrying.",
      "requiresHandles": [],
      "stateCheck": "none",
      "when": "The operation fails or completion is uncertain."
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
        "const": "navigation.select_saved_search"
      },
      "data": {
        "additionalProperties": false,
        "properties": {
          "outcome": {
            "const": "selected"
          },
          "target": {
            "additionalProperties": false,
            "properties": {
              "key": {
                "pattern": "^[A-Z0-9]{8}$",
                "type": "string"
              },
              "libraryId": {
                "minimum": 1,
                "type": "integer"
              }
            },
            "required": [
              "libraryId",
              "key"
            ],
            "type": "object"
          }
        },
        "required": [
          "outcome",
          "target"
        ],
        "type": "object"
      }
    },
    "required": [
      "capability",
      "approval",
      "data"
    ],
    "type": "object"
  },
  "summary": "navigation select-saved-search",
  "targets": [
    {
      "kind": "capability",
      "target": "navigation.select_saved_search"
    }
  ]
}
```

## 参数失败与恢复契约

参数失败以单个 JSON 错误信封返回。先检查 `error.code`，然后要求 `error.details.schema` 为 `host-bridge.argument-error.v1`，再使用结构化边界字段。保留规范命令、已净化的输入以及任何已返回的类型化句柄；绝不在证据中包含完整的原始载荷。

- `argv` 报告缺失、未知、冲突或无效的 CLI 参数。请依据本卡片的参数表或当前命令帮助重建 argv。
- `json_source` 报告 stdin 或文件源不可读。请修正该源，而不要将值挪到另一个绑定。
- `json_syntax` 以安全行列上下文报告无效 JSON。在解读领域字段前先修复语法。
- `command_input` 报告结构化输入的 schema 违规。检查有界的 `violations`，然后用 `--schema` 运行此精确叶命令并修正所声明的字段或类型；不要自行发明别名。
- `payload_contract` 表示 CLI 组合出的 capability 载荷在网络 I/O 之前违反了可执行契约。将其视为实现缺陷；不要用原始传输绕过语义命令。
- `command_result` 表示 Host 响应或本地结果未通过其可执行结果 schema。不得将其作为成功证据接受或报告。
- 违规数组经过脱敏、确定性排序，并最多保留八项。当 `truncated` 为 true 时，应修正所报告的违规并重新校验，而不是要求披露秘密或完整载荷。

## 操作契约

- 规范 argv 路径：`navigation` `select-saved-search`。
- 输出边界：`fixed`；受管辖细节：{"strategy":"fixed"}。
- 分页：`none`。
- 类别：`navigation`；危险级别：`none`。
- 结构化绑定模式：`passthrough`。
- 意图可见性：`visible`。
- 操作别名：`navigation select-saved-search`。

### 效果

```json
[
  {
    "description": "Selects a saved search.",
    "kind": "ui-navigation",
    "stateChanged": true
  }
]
```

### 审批

```json
{
  "kind": "none",
  "scope": "No per-call approval.",
  "timing": "none"
}
```

### 句柄转换

```json
[
]
```

### 恢复

```json
[
  {
    "action": "Inspect the structured error before retrying.",
    "requiresHandles": [],
    "stateCheck": "none",
    "when": "The operation fails or completion is uncertain."
  }
]
```

### 目标

```json
[
  {
    "kind": "capability",
    "target": "navigation.select_saved_search"
  }
]
```
