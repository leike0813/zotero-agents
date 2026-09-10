# Test Taxonomy by Domain

测试目录表达唯一所有权；一个文件只能被一个常规 Node 分片选中。

| 所有权域 | 目录 | 执行块 |
| --- | --- | --- |
| ACP | `tests/acp` | session、skill-run、runtime/transport |
| Assistant Workspace | `tests/assistant` | assistant |
| Dashboard | `tests/dashboard` | dashboard |
| Host Bridge | `tests/host-bridge` | runtime、surface/release |
| Shared runtime | `tests/runtime` | runtime |
| SkillRunner | `tests/skillrunner` | runtime、surface/release |
| Synthesis | `tests/synthesis` | engine、application、workbench；native stage1 独立 |
| Tooling/release contracts | `tests/tooling` | tooling |
| UI | `tests/ui` | ui |
| Workflow engine | `tests/workflows` | workflow-engine |
| Workflow packages | `tests/workflow-*` | workflow-packages |
| Zotero adapter contracts | `tests/zotero-host` | zotero-host |

真实宿主测试不属于上述 Node inventory，直接由 `tests/zotero/<domain>/<mode>` 的目录成员关系持有。

## 放置判断

先按被测生产 owner 选择目录，而不是按测试使用了哪个 helper 选择。跨域场景归给发起稳定行为的 owner；无法说清 owner 的大文件应先拆 seam。

共享 fixture 留在 `tests/fixtures`，共享 helper 留在 `tests/helpers` 或 `tests/zotero`。不要为每个域增加只做 re-export 的 shim。

新增或移动测试后运行 `npm run test:node:shards:list`。结果必须没有 unassigned 和 duplicate assignment；无需再维护另一张 allowlist。
