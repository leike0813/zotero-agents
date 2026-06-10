# Topic Synthesis Operational Instruction Migration Notes

本工件记录第二轮指令吸收的判断过程。它补的是“怎么实际跑”的说明，不改变 runtime 合同。

## 本轮需要补齐的缺口

- 每个 stage 必须明确：先运行 gate、读 gate JSON 哪些字段、执行哪个命令、何时重新 gate。
- Host context 不能写成不可执行标签，必须给出 `zotero-bridge` 命令、input shape 和用途。
- 全局产品目标要回到旧 skill 中成熟的 topic synthesis 质量标准。
- `zotero-bridge` CLI 说明要解释 ACP run workspace 中如何自检和调用 read-only synthesis 能力。
- LLM 与脚本职责边界必须明确，防止 agent 手写 runtime-owned 文件。

## 转换后的执行模型

- 初始 gate：

```bash
python scripts/gate.py --db "runtime/topic-synthesis.sqlite"
```

- command stage：确认 `needs_payload=false`，执行 gate JSON 的 `command` 字段，成功后重新 gate。
- payload stage：确认 `needs_payload=true`，读取 `required_reads` / `payload_path` / `payload_schema` / `submit_command`，获取上下文，手写 payload JSON，执行 `submit_command`，成功后重新 gate。
- gate JSON 字段是执行真源；`SKILL.md` 中的命令模板只是帮助 agent 理解等价形态。
- skill 指令只写通用裸 Python 命令；本机开发环境使用的 `uv run --project="$HOME/.ar" --locked` 不进入 skill。

## Skill-local 内容转换

- 产品目标第一段是全局定位；“最低质量目标”必须按 skill 当前职责渲染。
- LLM/runtime 职责边界必须按 skill 当前 payload 和 runtime-owned artifacts 渲染。
- prepare skill 不列 core/finalize 的 LLM 任务。
- core skill 不列 duplicate/update/finalize 任务。
- finalize skill 不列 resolver/core synthesis/KG enrichment 任务。

## Host read 转换

| 旧/抽象说法 | 新指令 |
| --- | --- |
| Host 主题列表 | `zotero-bridge synthesis list-topics --input '{}'`，用于 create duplicate check |
| Host 文库索引 | `zotero-bridge synthesis get-library-index --input '{"cursor":0,"limit":200}'`，用于 resolver proposal |
| Host 主题上下文 | 从 `runtime/input.json` 读取 topic id，再调用 `zotero-bridge synthesis get-topic-context --input '{"topicId":"<topic_id>"}'` |
| filtered artifacts | 由 Stage 20 submit 后的 runtime resolver cascade 导出，Stage 30 只读取 run-local files |

## 继续禁止迁移

- 不迁移旧 `stage_0` 到 `stage_12` 编号。
- 不迁移旧 `persist_*` action 名。
- 不迁移旧 payload path。
- 不迁移旧 `analyses[]` paper-triage wrapper。
- 不迁移旧 render/validate stage。
- 不让 core enrichment 读取 finalize 专用 context。
