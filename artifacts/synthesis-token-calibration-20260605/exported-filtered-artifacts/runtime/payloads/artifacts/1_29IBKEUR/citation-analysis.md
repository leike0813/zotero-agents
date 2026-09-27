#### 按功能归类

**Background (背景方法):**
- DETR (Carion et al., 2020): 首个端到端目标检测器，通过集合匹配消除 NMS，是本文基础方法
- Transformer (Vaswani et al., 2017): 核心架构但计算开销大
- 可变形卷积 (Dai et al., 2017): 可变形注意力的灵感来源
- 辅助损失 (Lee et al., 2015; Szegedy et al., 2015): 向深层网络传递梯度的经典技术
- RPN (Ren et al., 2015): 成功利用骨干特征进行目标性检测
- Sun et al. (2021): 中间层损失帮助区分混淆特征的分析

**Baseline (基线方法):**
- Deformable DETR (Zhu et al., 2021): 本文直接改进的基线，通过可变形注意力解决收敛问题

**Contrast (对比方法):**
- PnP-DETR (Wang et al., 2021): 同样稀疏化编码器但破坏 2D 结构，无法与 Deformable DETR 集成
- DynamicViT (Rao et al., 2021) & IA-RED² (Pan et al., 2021): 联合学习 token 选择器但关注分类任务
- FPN (Lin et al., 2017): DETR 无法有效利用的多尺度特征方法

**Component (组件方法):**
- Swin Transformer (Liu et al., 2021): 本文使用的先进 Vision Transformer 骨干网络
- Efficient DETR (Yao et al., 2021): 启发 top-k 解码器查询选择策略

**Dataset (数据集):**
- COCO (Lin et al., 2014): 实验评估基准
