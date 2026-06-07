# DETR 主题综合报告

DETR 将目标检测建模为集合预测问题，核心机制是 object queries、Transformer encoder-decoder 和 Hungarian matching。该范式减少了 anchor、proposal 和 NMS 等手工组件，但早期版本存在训练收敛慢、多尺度特征利用不足和实时部署困难。

后续路线大致分为三类：第一类通过 Deformable DETR 的稀疏多尺度注意力降低计算和优化难度；第二类通过 Conditional DETR、DINO 等 query/anchor/denoising 训练设计改善收敛和精度；第三类把 DETR 推向实时检测，与 YOLO 系检测器在延迟和精度上直接比较。

本 playbook 只使用 5 篇样例论文，因此适合作为 schema 和流程基准，不适合作为完整综述结论。
