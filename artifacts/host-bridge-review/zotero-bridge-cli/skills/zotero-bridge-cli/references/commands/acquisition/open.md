# `zotero-bridge acquisition open`

acquisition open

## 用法

```console
zotero-bridge acquisition open [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--input <JSON_OR_FILE>]
```

全局选项可出现在叶子命令之前或之后。使用 `--schema` 可在不加载 profile、不连接 Zotero 的情况下查看原始结构化输入 schema。

## 全局参数

| Token | Id | Kind | 必需 | 条件要求 | 取值 / 元数 | 可重复 | 环境变量 | 冲突 | 帮助 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --endpoint | endpoint | option | no | — | ENDPOINT | no | ZOTERO_BRIDGE_ENDPOINT | — | Zotero Bridge 服务端点基础 URL。省略时，CLI 会读取 ZOTERO_BRIDGE_ENDPOINT 或 profile 文件。CLI 不会猜测随机 bridge 端口。 |
| --operation-id | operation_id | option | no | — | ID | no | ZOTERO_BRIDGE_OPERATION_ID | — | 用于改变 Zotero 状态的请求的不透明幂等 id |
| --profile | profile | option | no | — | PATH | no | ZOTERO_BRIDGE_PROFILE | — | 指向 Zotero Bridge 连接 profile JSON 文件的路径。省略时，CLI 会尝试 Zotero Agents 的 well-known profile。ACP 运行 profile 通常引用 tokenEnv；本地 well-known profile 可能包含受用户级文件权限保护的 bearer token。 |
| --schema | schema | option | no | — | SCHEMA; values: true, false | no | — | — | 打印某个规范叶子命令的带版本原始 JSON Schema 与受治理示例。schema 模式离线运行，不加载 profile、不读取 Zotero Bridge 配置，也不连接 Zotero。 |

## 本地选项与位置参数

| Token | Id | Kind | 必需 | 条件要求 | 取值 / 元数 | 可重复 | 环境变量 | 冲突 | 帮助 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --input | input | option | no | — | JSON_OR_FILE | no | — | — | acquisition 输入 JSON |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "input": {
      "description": "Acquisition input JSON",
      "type": "string"
    }
  },
  "required": [],
  "type": "object"
}
```

## 结构化输入 schema

### `--input` (input)

必需：`false`。

```json
{
  "additionalProperties": false,
  "properties": {
    "authProfileRef": {
      "maxLength": 160,
      "minLength": 1,
      "type": "string"
    },
    "parentRef": {
      "additionalProperties": false,
      "properties": {
        "key": {
          "maxLength": 32,
          "minLength": 1,
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
    "parentRef"
  ],
  "type": "object"
}
```

## 组合 payload schema

```json
{
  "additionalProperties": false,
  "properties": {
    "authProfileRef": {
      "maxLength": 160,
      "minLength": 1,
      "type": "string"
    },
    "parentRef": {
      "additionalProperties": false,
      "properties": {
        "key": {
          "maxLength": 32,
          "minLength": 1,
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
    "parentRef"
  ],
  "type": "object"
}
```

## payload 组合

该命令没有单独的字段映射程序。其绑定模式可直接执行：passthrough 使用唯一的结构化来源，而 `none` 与 `raw` 保留其声明的封闭行为。

`composition`: `null`。

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
      "const": "acquisition.open"
    },
    "data": {
      "additionalProperties": false,
      "properties": {
        "pageRef": {
          "maxLength": 160,
          "minLength": 1,
          "type": "string"
        },
        "sessionRef": {
          "maxLength": 160,
          "minLength": 1,
          "type": "string"
        },
        "state": {
          "enum": [
            "loading",
            "ready",
            "awaiting_user",
            "closed",
            "timed_out",
            "released",
            "failed"
          ]
        }
      },
      "required": [
        "sessionRef",
        "pageRef",
        "state"
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

### input: shape-only

针对 --input 的受治理 shape-only 示例。

```console
zotero-bridge acquisition open --input '{"parentRef":{"key":"ITEM0001","libraryId":1}}'
```

## 完整命令描述符

该封闭描述符是 `surface describe` 返回的机器可读命令合同；此处包含它，使该卡片无需加载其他命令参考即可独立审计。

```json
{
  "approvalContract": {
    "kind": "none",
    "scope": "The Host live task grant authorizes this command; this is not write approval.",
    "timing": "none"
  },
  "arguments": [
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Acquisition input JSON",
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
    "acquisition",
    "open"
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
  "command": "acquisition open",
  "composition": null,
  "danger": "none",
  "effects": [
    {
      "description": "Opens a task-owned native page from a confirmed parentRef and returns sessionRef and pageRef.",
      "kind": "ui-navigation",
      "stateChanged": true
    }
  ],
  "handleTransitions": [
    {
      "condition": "The parentRef must be confirmed by a successful core ingest in this task. This consume is input validation only and does not invalidate the itemRef after open.",
      "direction": "consume",
      "handle": "itemRef",
      "lifetime": "caller-owned",
      "required": true
    },
    {
      "condition": "Optional native persistent profile selection; the caller-owned ref remains valid across tasks.",
      "direction": "consume",
      "handle": "authProfileRef",
      "lifetime": "caller-owned",
      "required": false
    },
    {
      "condition": "Returned with the task-owned page opened from the confirmed parentRef.",
      "direction": "produce",
      "handle": "sessionRef",
      "lifetime": "short-lived",
      "required": false
    },
    {
      "condition": "Returned with the task-owned page opened from the confirmed parentRef.",
      "direction": "produce",
      "handle": "pageRef",
      "lifetime": "short-lived",
      "required": false
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {
    "input": {
      "examples": [
        {
          "kind": "shape-only",
          "prerequisites": [],
          "value": {
            "parentRef": {
              "key": "ITEM0001",
              "libraryId": 1
            }
          }
        }
      ],
      "required": false,
      "requiredWhen": [],
      "schema": {
        "additionalProperties": false,
        "properties": {
          "authProfileRef": {
            "maxLength": 160,
            "minLength": 1,
            "type": "string"
          },
          "parentRef": {
            "additionalProperties": false,
            "properties": {
              "key": {
                "maxLength": 32,
                "minLength": 1,
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
          "parentRef"
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
        "description": "Acquisition input JSON",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "operationalAliases": [
    "acquisition open"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "authProfileRef": {
        "maxLength": 160,
        "minLength": 1,
        "type": "string"
      },
      "parentRef": {
        "additionalProperties": false,
        "properties": {
          "key": {
            "maxLength": 32,
            "minLength": 1,
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
      "parentRef"
    ],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Confirm that the parentRef came from a successful core ingest in this task and inspect sessionRef/pageRef before any explicit retry. The itemRef remains caller-owned. Do not automatically replay an operation with unknown completion or invalidated task refs.",
      "requiresHandles": [
        "itemRef"
      ],
      "stateCheck": "caller-held-handle",
      "when": "The confirmed parentRef is unavailable, open completion is unknown, or the returned sessionRef/pageRef is invalid."
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
        "const": "acquisition.open"
      },
      "data": {
        "additionalProperties": false,
        "properties": {
          "pageRef": {
            "maxLength": 160,
            "minLength": 1,
            "type": "string"
          },
          "sessionRef": {
            "maxLength": 160,
            "minLength": 1,
            "type": "string"
          },
          "state": {
            "enum": [
              "loading",
              "ready",
              "awaiting_user",
              "closed",
              "timed_out",
              "released",
              "failed"
            ]
          }
        },
        "required": [
          "sessionRef",
          "pageRef",
          "state"
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
  "summary": "acquisition open",
  "targets": [
    {
      "kind": "capability",
      "target": "acquisition.open"
    }
  ]
}
```

## 参数失败与恢复合同

参数失败以单个 JSON 错误信封返回。先检查 `error.code`，再要求 `error.details.schema` 为 `host-bridge.argument-error.v1`，然后才能使用结构化边界字段。保留规范命令、脱敏输入以及任何已返回的类型化 handle；绝不要在证据中包含完整原始 payload。

- `argv` 表示缺少、未知、冲突或无效的 CLI 参数。请依据本卡片的参数表或当前命令帮助重建 argv。
- `json_source` 表示 stdin 或文件来源不可读。请修正该来源，不要将值移动到其他绑定。
- `json_syntax` 表示 JSON 无效，并附带安全的行、列上下文。请先修复语法，再解释领域字段。
- `command_input` 表示结构化输入违反 schema。检查有界的 `violations`，然后用 `--schema` 运行这个确切的叶子命令，并修正声明的字段或类型；不要臆造别名。
- `payload_contract` 表示 CLI 组合出的 capability payload 在网络 I/O 之前违反了可执行合同。将其视为实现故障；不要用原始传输绕过语义命令。
- `command_result` 表示 Host 响应或本地结果未通过其可执行结果 schema。不要将其作为成功证据接受或报告。
- 违规数组经过脱敏、按确定性顺序排列，且最多八项。当 `truncated` 为 true 时，请修正所报告的违规并重新校验，而不要请求披露机密或完整 payload。

## 运行合同

- 规范 argv 路径：`acquisition` `open`。
- 输出边界：`fixed`；受治理细节：{"strategy":"fixed"}。
- 分页：`none`。
- 类别：`navigation`；危险级别：`none`。
- 结构化绑定模式：`passthrough`。
- 意图可见性：`visible`。
- 运行别名：`acquisition open`。

### 效果

```json
[
  {
    "description": "Opens a task-owned native page from a confirmed parentRef and returns sessionRef and pageRef.",
    "kind": "ui-navigation",
    "stateChanged": true
  }
]
```

### 批准

```json
{
  "kind": "none",
  "scope": "The Host live task grant authorizes this command; this is not write approval.",
  "timing": "none"
}
```

### handle 迁移

```json
[
  {
    "condition": "The parentRef must be confirmed by a successful core ingest in this task. This consume is input validation only and does not invalidate the itemRef after open.",
    "direction": "consume",
    "handle": "itemRef",
    "lifetime": "caller-owned",
    "required": true
  },
  {
    "condition": "Optional native persistent profile selection; the caller-owned ref remains valid across tasks.",
    "direction": "consume",
    "handle": "authProfileRef",
    "lifetime": "caller-owned",
    "required": false
  },
  {
    "condition": "Returned with the task-owned page opened from the confirmed parentRef.",
    "direction": "produce",
    "handle": "sessionRef",
    "lifetime": "short-lived",
    "required": false
  },
  {
    "condition": "Returned with the task-owned page opened from the confirmed parentRef.",
    "direction": "produce",
    "handle": "pageRef",
    "lifetime": "short-lived",
    "required": false
  }
]
```

### 恢复

```json
[
  {
    "action": "Confirm that the parentRef came from a successful core ingest in this task and inspect sessionRef/pageRef before any explicit retry. The itemRef remains caller-owned. Do not automatically replay an operation with unknown completion or invalidated task refs.",
    "requiresHandles": [
      "itemRef"
    ],
    "stateCheck": "caller-held-handle",
    "when": "The confirmed parentRef is unavailable, open completion is unknown, or the returned sessionRef/pageRef is invalid."
  }
]
```

### 目标

```json
[
  {
    "kind": "capability",
    "target": "acquisition.open"
  }
]
```
