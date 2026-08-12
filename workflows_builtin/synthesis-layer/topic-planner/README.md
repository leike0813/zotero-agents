# Topic Planner

Topic Planner 总览当前 Zotero 文献库、已有 Topic 与 Topic Graph，计算全库覆盖情况，并原子地协调 Planned Topic 空壳和主题关系。它适合首次设计主题结构，也适合在文献库或 Topic 明显变化后再次运行；结构无需调整时会返回 no-op。

覆盖率以当前全库文献为分母，每篇文献只能有一个主状态：`materialized_covered`、`planned_covered`、`uncovered` 或 `indeterminate`。重叠关系单独记录。Planner 先使用元数据判断，只为不确定或未覆盖的批次读取 digest。

Planned Topic 只保存稳定的 Topic ID、标题、定义、别名、scope、resolver、revision、basis、provenance 和 lifecycle，不保存临时文献成员，也不代表已经生成综述。Planner 可以新建、更新、标记 stale 或重新激活空壳，并提出 Topic Graph 关系；它只能为已物化 Topic 给出更新建议，不能直接改写其内容。

整份 plan 通过 Topic Graph hash 做 compare-and-swap，并作为一个事务应用。图已变化时不会部分落库，需要从新 planning context 重跑。文献库变化不会破坏图事务，但会把覆盖结论标为 stale。

规划完成后，在 Create Topic Synthesis 中选择有效的 Planned Topic 来填充内容。各个创建任务会在执行时重新运行所存 resolver，并沿用 Planned Topic 的 ID，因此可以独立或并行执行。stale 空壳不会出现在可填充列表中。
