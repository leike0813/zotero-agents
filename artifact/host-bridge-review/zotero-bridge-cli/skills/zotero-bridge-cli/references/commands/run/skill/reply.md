# `zotero-bridge run skill reply`

回复一个等待中的 ACP Skill run

## 用法

```console
zotero-bridge run skill reply [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] SKILL_RUN_ID <SKILL_RUN_ID> --message <MESSAGE>
```

全局选项可位于叶命令之前或之后。使用 `--schema` 可在不加载 profile、也不连接 Zotero 的情况下检查原始结构化输入 schema。

## 全局参数

| Token | Id | 类型 | 必填 | 条件必填 | 值 / 数量 | 可重复 | 环境变量 | 冲突 | 说明 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --endpoint | endpoint | option | no | — | ENDPOINT | no | ZOTERO_BRIDGE_ENDPOINT | — | Zotero Bridge service endpoint base URL. If omitted, the CLI reads ZOTERO_BRIDGE_ENDPOINT or a profile file. The CLI does not guess random bridge ports. |
| --operation-id | operation_id | option | no | — | ID | no | ZOTERO_BRIDGE_OPERATION_ID | — | Opaque idempotency id for a state-changing Zotero request |
| --profile | profile | option | no | — | PATH | no | ZOTERO_BRIDGE_PROFILE | — | Path to a Zotero Bridge connection-profile JSON file. If omitted, the CLI tries the Zotero Agents well-known profile. ACP run profiles usually reference tokenEnv; the local well-known profile may contain a bearer token protected by user-level file permissions. |
| --schema | schema | option | no | — | SCHEMA; values: true, false | no | — | — | Print the versioned raw JSON Schemas and governed examples for one canonical leaf command. Schema mode is offline and does not load a profile, read Zotero Bridge configuration, or connect to Zotero. |

## 本地选项与位置参数

| Token | Id | 类型 | 必填 | 条件必填 | 值 / 数量 | 可重复 | 环境变量 | 冲突 | 说明 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SKILL_RUN_ID | skill_run_id | positional | yes | — | SKILL_RUN_ID | no | — | — | Opaque skill run id |
| --message | message | option | yes | — | MESSAGE | no | — | — | Reply message |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "skill_run_id": {
      "type": "string",
      "description": "Opaque skill run id",
      "position": 1
    },
    "message": {
      "type": "string",
      "description": "Reply message"
    }
  },
  "required": [
    "skill_run_id",
    "message"
  ],
  "additionalProperties": false
}
```

## 结构化输入 schema

此命令没有结构化 JSON 输入参数。

## 合成 payload schema

```json
{
  "type": "object",
  "properties": {
    "skill_run_id": {
      "type": "string",
      "description": "Opaque skill run id"
    },
    "message": {
      "type": "string",
      "description": "Reply message"
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## 结果 schema

```json
{
  "type": "object",
  "properties": {
    "response": {
      "type": "object",
      "description": "Response object returned by POST /bridge/v1/skill-runs/{skillRunId}/reply.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
    }
  },
  "additionalProperties": true,
  "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
}
```

## 示例

此命令没有适用的结构化输入示例。请根据参数表构造 argv，并在执行前通过 `surface describe` 确认命令。

## 完整命令 descriptor

此封闭 descriptor 是 `surface describe` 返回的机器可读命令契约；将其收录于此，使本命令卡无需加载其他命令参考即可独立审计。

```json
{
  "command": "run skill reply",
  "argv": [
    "run",
    "skill",
    "reply"
  ],
  "summary": "Reply to a waiting ACP skill run",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "skill_run_id": {
        "type": "string",
        "description": "Opaque skill run id",
        "position": 1
      },
      "message": {
        "type": "string",
        "description": "Reply message"
      }
    },
    "required": [
      "skill_run_id",
      "message"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "skill_run_id",
      "kind": "positional",
      "token": "SKILL_RUN_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Opaque skill run id",
      "valueNames": [
        "SKILL_RUN_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "message",
      "kind": "option",
      "token": "--message",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Reply message",
      "valueNames": [
        "MESSAGE"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    }
  ],
  "argvBindings": [
    {
      "property": "skill_run_id",
      "kind": "positional",
      "token": "SKILL_RUN_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "SKILL_RUN_ID"
      ]
    },
    {
      "property": "message",
      "kind": "option",
      "token": "--message",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "MESSAGE"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "skill_run_id": {
        "type": "string",
        "description": "Opaque skill run id"
      },
      "message": {
        "type": "string",
        "description": "Reply message"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "response": {
        "type": "object",
        "description": "Response object returned by POST /bridge/v1/skill-runs/{skillRunId}/reply.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
      }
    },
    "additionalProperties": true,
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "pagination": "none",
  "effects": [
    {
      "kind": "workflow-control",
      "stateChanged": true,
      "description": "May change workflow control state."
    }
  ],
  "approvalContract": {
    "kind": "none",
    "timing": "none",
    "scope": "No Zotero UI approval; provider runtimes may still request their own permission."
  },
  "handleTransitions": [
    {
      "handle": "skillRunId",
      "direction": "consume",
      "required": true,
      "condition": "Required by the command invocation.",
      "lifetime": "caller-owned"
    }
  ],
  "recovery": [
    {
      "when": "The operation fails or completion is uncertain.",
      "stateCheck": "none",
      "requiresHandles": [],
      "action": "Inspect stateChange and handleConsumption before repeating the operation.",
      "nextCommand": "surface describe"
    }
  ],
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v1/skill-runs/{skillRunId}/reply"
    }
  ],
  "operationalAliases": [
    "run skill reply",
    "run",
    "skill",
    "reply",
    "skill_run_id",
    "SKILL_RUN_ID",
    "message",
    "MESSAGE"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `run` `skill` `reply`.
- 分页： `none`.
- 类别： `write`; 危险级别： `review`.
- Intent 可见性： `visible`.
- 操作别名： `run skill reply`, `run`, `skill`, `reply`, `skill_run_id`, `SKILL_RUN_ID`, `message`, `MESSAGE`.

### Effects

```json
[
  {
    "kind": "workflow-control",
    "stateChanged": true,
    "description": "May change workflow control state."
  }
]
```

### Approval

```json
{
  "kind": "none",
  "timing": "none",
  "scope": "No Zotero UI approval; provider runtimes may still request their own permission."
}
```

### Handle 转移

```json
[
  {
    "handle": "skillRunId",
    "direction": "consume",
    "required": true,
    "condition": "Required by the command invocation.",
    "lifetime": "caller-owned"
  }
]
```

### 恢复

```json
[
  {
    "when": "The operation fails or completion is uncertain.",
    "stateCheck": "none",
    "requiresHandles": [],
    "action": "Inspect stateChange and handleConsumption before repeating the operation.",
    "nextCommand": "surface describe"
  }
]
```

### 目标

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v1/skill-runs/{skillRunId}/reply"
  }
]
```
