# ACP Runner 文件命名空间化：Skill-Runner 升级参考

日期：2026-06-13

## 背景

Zotero-Skills 在支持 ACP workflow workspace 复用后，发现 runner-owned 固定相对路径会互相覆盖：

- `result/result.json`
- `.audit/input_manifest.json`

当一个 sequence 中多个 skill 共享同一个 workspace 执行时，后执行的 step 会覆盖先执行 step 的 runner result envelope 和 input manifest。此次修复将这些 runner-owned 文件改为 provider 内部命名空间化路径。

## 新路径规则

每个 ACP skill run 在当前 workspace 内分配一个 provider-owned 子空间：

```text
<safeSkillId>.<n>
```

其中：

- `safeSkillId` 来自当前 requested skill id，使用路径安全化规则清洗。
- `n` 是同一 workspace 内、同一 `safeSkillId` 的 1-based 计数。
- 命名空间分配完全是 provider/runner 内部逻辑，不新增 host/workflow request 字段。

## 路径安全化规则

Zotero-Skills 本轮实现复用 `safeSegment(value, fallback)` 规则生成
`safeSkillId`。Skill-Runner 如果要保持一致，建议按以下顺序实现：

1. 将输入值转为字符串；`null`、`undefined`、空值按空字符串处理。
2. 对字符串执行 `trim()`，去掉首尾空白。
3. 将所有不属于 ASCII 安全集合 `[A-Za-z0-9._-]` 的连续字符替换为单个 `-`。
4. 去掉替换后字符串首尾的 `-`。
5. 如果结果为空，使用 fallback；本场景 fallback 为 `skill`。

等价 TypeScript：

```typescript
function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function safeSegment(value: unknown, fallback: string) {
  const normalized = normalizeString(value)
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}
```

示例：

| 原始 skill id | `safeSkillId` | 说明 |
|---|---|---|
| `core-skill` | `core-skill` | 已经安全，保持不变 |
| `topic.synthesis_finalize` | `topic.synthesis_finalize` | `.`、`_`、`-` 保留 |
| `  literature analysis  ` | `literature-analysis` | 空白折叠为 `-` 并 trim |
| `Lin 等 / DETR` | `Lin-DETR` | 非 ASCII 与路径分隔符折叠为 `-` |
| `***` | `skill` | 替换并去掉首尾 `-` 后为空，使用 fallback |

注意：当前规则不做大小写归一化，因此 `Core-Skill` 与 `core-skill` 会被视为不同 namespace key。它也不保留非 ASCII 字符；这是为了让子路径在 Windows、POSIX shell、日志、JSON payload 和 agent prompt 中都保持可预测。

实际文件路径：

```text
result/<safeSkillId>.<n>/result.json
.audit/<safeSkillId>.<n>/input_manifest.json
```

示例：

```text
result/prepare-skill.1/result.json
.audit/prepare-skill.1/input_manifest.json
result/core-skill.1/result.json
.audit/core-skill.1/input_manifest.json
result/core-skill.2/result.json
.audit/core-skill.2/input_manifest.json
```

## Contract 边界

### 不改变 host/workflow 协议

workflow request 仍只表达：

```json
{
  "runtime_options": {
    "workflow_workspace": {
      "mode": "reuse",
      "workflow_run_id": "..."
    }
  }
}
```

provider 根据 workflow workspace reuse intent、当前 skill id 和已分配 namespace 自行推导文件子空间。

### 已有 response/record 字段继续作为 SSOT

调用方不应拼接固定路径，而应读取 run result / persisted record 中的实际路径：

```text
workspaceDir
resultJsonPath
inputManifestPath
```

`resultJsonPath` 是 runner-owned final envelope 的实际路径；`inputManifestPath` 是当前 run 的 input manifest 实际路径。

### 不维护 latest alias

本轮修复刻意不维护 `result/result.json` 作为 latest/final alias。原因：

- latest alias 会重新引入覆盖语义。
- sequence apply 应读取 final step record 的 `resultJsonPath`，而不是扫描 workspace 固定路径。
- 单独保留 alias 容易让业务脚本误以为可以手写 runner envelope。

## Runner-owned vs package-owned 文件

runner-owned result envelope：

- 由 runner 在 final payload validation 通过后写入。
- 路径由 `resultJsonPath` 指定。
- skill/agent 不应直接手写。

package-owned fallback result file：

- 由 skill runtime 自己生成，用于 assistant turn 没有产出有效 JSON 时的 fallback recovery。
- 默认文件名仍可来自 `${skill_id}.result.json` 或 `runner.entrypoint.result_json_filename`。
- fallback discovery 仍应忽略 `result/` 和 `.audit/` 子树，避免把 runner-owned 文件当作 package fallback。

## Zotero-Skills 本轮实现点

主要代码改动：

- `src/modules/acpSkillRunnerWorkspace.ts`
  - `createAcpSkillRunnerWorkspace()` 新增 `skillId` 参数。
  - workflow workspace record 保存 `namespaceCountsBySkillId`。
  - 新 workspace 和 reused workspace 都统一走 namespaced result/audit paths。

- `src/modules/acpSkillRunnerOrchestrator.ts`
  - 创建 workspace 时传入 `request.skill_id`。

- `src/modules/acpSkillOutputValidator.ts`
  - repair prompt 不再写死 `result/result.json`，改为 runner-owned result JSON path。

- `addon/content/acp-runtime-prompts/templates/recovered_continuation_guard.md`
  - continuation guard 使用实际 `{RESULT_JSON_PATH}`，并强调不要手写 runner-owned path。

相关测试：

- `test/core/154-skillrunner-sequence-runtime.test.ts`
  - 覆盖 reused workspace 下不同 skill 的 path 隔离。
  - 覆盖同一 skill 重复执行时 `.2` namespace。
  - 覆盖 input manifest 不互相覆盖。

- `test/core/107-acp-skillrunner-compatible-runner.test.ts`
  - 固定 `workspace/result/result.json` 断言改为读取 selected run 的 `resultJsonPath`。
  - prompt 文案断言改为 runner-owned path 语义。

- `test/core/110-acp-shared-skill-catalog-thin-proxy.test.ts`
  - 直接创建 workspace 的测试传入 `skillId`。

## Skill-Runner 升级建议

如果 Skill-Runner 也支持多 step / 多 skill 共享同一 run workspace，建议按同一模型升级：

1. 在 run workspace manager 中引入 provider-owned file namespace allocator。
2. allocator 以 workspace identity 为作用域保存 `safeSkillId -> nextIndex`。
3. 创建每个 skill run 时传入 requested skill id，并生成：
   - `resultJsonPath`
   - `inputManifestPath`
4. 持久化 run record 时保存实际路径，而不是让下游根据固定相对路径推导。
5. result resolution / apply / recovery 全部优先使用 run record 的实际 `resultJsonPath`。
6. 保留 bundle/legacy `result/result.json` fallback 时，必须在文档和代码中明确它不是 reused workspace 下 runner-owned result 的 SSOT。
7. fallback package result discovery 继续排除 runner-owned result/audit 目录。

## 验收场景

推荐为 Skill-Runner 增加以下测试：

1. 单个 skill run：
   - `resultJsonPath` 位于 `result/<skillId>.1/result.json`。
   - `inputManifestPath` 位于 `.audit/<skillId>.1/input_manifest.json`。

2. sequence workspace reuse：
   - prepare/core/finalize 的 `workspaceDir` 相同。
   - 三个 step 的 `resultJsonPath` 和 `inputManifestPath` 均不同。
   - prepare 写入的 result/audit 在 core/finalize 后仍可读取。

3. 重复 skill：
   - 第一次 `core-skill` 使用 `core-skill.1`。
   - 第二次 `core-skill` 使用 `core-skill.2`。

4. apply/recovery：
   - final step apply 读取 final step record 中的 `resultJsonPath`。
   - 不依赖 `workspace/result/result.json`。

5. fallback：
   - package fallback 文件仍能恢复输出。
   - `result/` 和 `.audit/` 下的 runner-owned 文件不会被 fallback discovery 误选中。

## 迁移注意事项

- 如果历史 run record 只保存固定 `result/result.json`，读取历史记录时可以继续按旧 path 尝试，但新 run 必须写入 namespaced path。
- 不建议把 namespace 写入 workflow manifest 或公开 request schema。
- UI 可继续展示 workspace short id；具体 result/audit 子路径属于 diagnostics/details 层信息。
- 文档中应避免再说 runner “writes `result/result.json`”，改为 “writes the run-owned `resultJsonPath`”。

## Zotero-Skills 本轮验证

已通过：

```powershell
npx openspec validate namespace-acp-runner-files-in-reused-workspaces --type change --strict
npx tsc --noEmit
npx tsx node_modules/mocha/bin/mocha "test/core/154-skillrunner-sequence-runtime.test.ts" "test/core/107-acp-skillrunner-compatible-runner.test.ts" "test/core/110-acp-shared-skill-catalog-thin-proxy.test.ts" --require test/setup/zotero-mock.ts --grep "workspace|result files|repair prompts|runtime prompt|fallback|interactive pending"
git diff --check
```
