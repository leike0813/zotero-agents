# Synthesis 生产与读取契约修复

## 根因与证据

调查基线：`371b9a72d50789887e24dd167b6133b7f8a71b1e`。

ACP run `acp-skill-mvhrhibe-w657mm` 的外层执行成功，但业务输出为 `topic_synthesis_canceled`，失败位置为 audit metadata 中的 prospective proposal。运行时命令卡、仓库内容和已安装 CLI 的 command catalog 身份一致；Host Bridge 内容检查无漂移。

`b2c057e45a171593a435b21c0a2933dc2eec1b03` 建立 seed/type 生产契约。`ce9764f98d71f25eec510d83959c7579b6171af3`（2026-08-12，`chore: harden synthesis sidecar recursive DTO contracts(stage 1)`）在递归 DTO 硬化时将其误写为 graph 对象，且没有生产格式转换或迁移。提交意图是收紧 DTO；实际却将另一种领域对象的字段套到已有生产格式上。同步只能传播这份错误定义，不能纠正其领域含义。

SSOT 的缺口是共享定义没有覆盖完整的生产链：Skill payload、公开 Schema、Python 校验和 Rust 投影各自维护形状；corpus 又使用错误形状或空集合。修复同时对齐领域定义与生产证据。

## 实现边界

- prospective 使用 `target_topic_seed` / `relation_type`，从既有 manifest assets 读取并写入 canonical metadata；patch 省略继承、显式空清空。
- summary 正文、coverage 结构和 canonical source-paper triage 保留到相应消费者。resolver/semantic 是显式精简视图。
- Concept 提案保留 local id 和 merge hints。Hints 是不参与决策的元数据，复用 registry 的有界 opaque-leaf 机制声明所有权，不猜测其结构或合并语义。
- 新 Concept confidence 只用三级枚举；历史数字保留并报告 `concept_confidence_review_required`。KB adapter 不把数字转换为 medium。
- Topic 在提交前验证 sidecar DTO、resolved paper set 和共享消费者结构；Python runtimes 使用正式 jsonschema，再执行领域检查。
- Skill renderer 复用既有 Schema materializer；构建、内容打包和现有 CI gate 调用统一的隔离生成物检查。没有新增平行测试 runner 或全量 DTO codegen。
- CI 在执行 gate 前准备 Python，并从 runner manifest 读取依赖安装；本机仍使用已有共享环境，没有安装或升级依赖。

## 验证记录

四个新增非空生产路由场景在修改前全部失败；修复后通过。另覆盖非法输入提交前拒绝和历史数字读取。

- Topic/Workflow 生产路由：29 项通过。
- builtin request contract + Reader：68 项通过，实际清单为 32 个 Skill producer、10 个非 Skill workflow。
- renderer/checker：21 项通过。
- Deep Reading：在稳定生成物上完整重跑，30 项全部通过。
- Topic runtime 全套 18 项通过，包含真实 Python finalize → Workflow apply → native reopen/list/audit/default review → Reader 消费。
- `check:builtin-skill-contracts`、`check:synthesis-contracts`、`check:builtin-workflow-manifest`、Host Bridge 内容检查及 TS 检查通过。
- 首轮完整 stage1 在源码仍修改时出现 identity/evidence 失效，并检出旧 fixture 与硬编码清单问题；这些结果不作为最终验收证据。稳定源码上的完整 stage1 四段共 57 个测试文件全部通过，但最终覆盖门禁退出 1。

### 最终覆盖结果

完整执行命令：`npm run test:synthesis-native:stage1`。完整日志位于 `.scaffold/test/synthesis-producer-contract-stage1-acceptance.log`。

该轮还暴露出门禁顺序问题：worker 检查先记录执行证据，随后 workspace build 改变 sidecar 可执行文件身份，最终汇总因此排除 worker 证据。已把 `package.json` 中的 stage1 调整为先构建、再采集证据。保持测试源码和当前可执行文件不变，分别重跑 `npm run check:synthesis-native-worker-transfer-parity` 和 `npm run check:synthesis-cross-language-contracts`；前者通过，后者仍因结构覆盖不完整退出 1。没有复制或改写旧身份的 evidence，也没有降低门禁要求。

| 维度 | 已覆盖 / 总数 | 结果 |
| --- | --- | --- |
| 协议入口正负例 | 483 / 483 | 通过 |
| 跨语言消息真实执行 | 483 / 483 | 通过，含 worker 75 / 75 |
| 工作流生产者持久化 | 10 / 10 | 通过 |
| 递归结构探测 | 14467 / 14781 | 314 项未覆盖 |
| TS/Rust 接收端结构执行 | 14553 / 14781 | 228 项未覆盖；TS 9794 / 10022，Rust 5903 / 5903 |

最终报告中 `errors`、结构执行 `violations`、预算 `exhausted` 均为空，`truncated` 为 false；这些结果不表示覆盖完整。314 个结构缺口中，262 个是 `maxItems`，其余含可选字段、union 分支、required、enum 及 map 边界。当前普通检查将探测限制在 4096 行和 8 MiB，超过资源限制的边界仍计为 uncovered。本次新增的 triage、Concept proposal 元数据和结构化 coverage 也有通用探测未覆盖项，不能把剩余缺口全部归为既有问题；它们的非空生产链行为已由定向回归验证。

两份最后检查日志分别为 `.scaffold/test/synthesis-worker-final-acceptance.log` 和 `.scaffold/test/synthesis-cross-language-final-acceptance.log`。当前结论为：实现及定向回归已完成，完整覆盖门禁尚未闭合，不报告 100%，不作为发布验收通过。后续须补足真实分支种子和有界压力边界证据，再重跑既有门禁；不能仅扩大预算或修改计数来消除缺口。

## 交付限制

没有修改真实用户库、提交代码、派发远端预构建或发布。Synthesis 发布二进制因源码变化而 stale，preflight 阻止完整插件 build；Host Bridge CLI 与 Windows ACP bridge 仍 fresh。原始 sidecar 已丢失的数据无法从空 metadata 自动恢复。
