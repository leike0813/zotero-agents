# Sparse DETR: efficient end-to-end object detection with learnable sparsity (2022)

- Paper ref: 1:29IBKEUR
- Title: Sparse DETR: efficient end-to-end object detection with learnable sparsity
- Year: 2022

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2016 | Ba, Lei Jimmy; Kiros, Jamie Ryan; et al. | Layer normalization |
| ref-2 | 2019 | Baevski, Alexei; Auli, Michael A. | Adaptive input representations for neural language modeling |
| ref-3 | 2020 | Carion, Nicolas; Massa, Francisco; et al. | End-to-end object detection with transformers |
| ref-4 | 2019 | Child, Rewon; Gray, Scott; et al. | Generating long sequences with sparse transformers |
| ref-5 | 2019 | Child, Rewon; Gray, Scott; et al. | Generating long sequences with sparse transformers |
| ref-6 | 2021 | Choromanski, Krzysztof Marcin; Likhosherstov, Valerii; et al. | Rethinking attention with performers |
| ref-7 | 2016 | Dai, Jifeng; Li, Yi; et al. | R-FCN: object detection via region-based fully convolutional networks |
| ref-8 | 2017 | Dai, Jifeng; Qi, Haozhi; et al. | Deformable convolutional networks |
| ref-9 | 2009 | Deng, Jia; Dong, Wei; et al. | Imagenet: A large-scale hierarchical image database |
| ref-10 | 2016 | He, Kaiming; Zhang, Xiangyu; et al. | Deep residual learning for image recognition |
| ref-11 | 2017 | He, Kaiming; Gkioxari, Georgia; et al. | Mask R-CNN |
| ref-12 | 2016 | Hendrycks, Dan; Gimpel, Kevin | Bridging nonlinearities and stochastic regularizers with gaussian error linear units |
| ref-13 | 2019 | Ho, Jonathan; Kalchbrenner, Nal; et al. | Axial attention in multidimensional transformers |
| ref-14 | 2020 | Katharopoulos, Angelos; Vyas, Apoorv; et al. | Transformers are rnns: Fast autoregressive transformers with linear attention |
| ref-15 | 2020 | Kitaev, Nikita; Kaiser, Lukasz; et al. | Reformer: The efficient transformer |
| ref-16 | 2015 | Lee, Chen-Yu; Xie, Saining; et al. | Deeply-Supervised Nets |
| ref-17 | 2014 | Lin, Tsung-Yi; Maire, Michael; et al. | Microsoft coco: Common objects in context |
| ref-18 | 2017 | Lin, Tsung-Yi; Dollar, Piotr; et al. | Feature pyramid networks for object detection |
| ref-19 | 2021 | Liu, Ze; Lin, Yutong; et al. | Swin transformer: Hierarchical vision transformer using shifted windows |
| ref-20 | 2021 | Pan, Bowen; Jiang, Yifan; et al. | IA-RED2: Interpretability-aware redundancy reduction for vision transformers |
| ref-21 | 2018 | Parmar, Niki; Vaswani, Ashish; et al. | Image transformer |
| ref-22 | 2021 | Rao, Yongming; Zhao, Wenliang; et al. | DynamicViT: efficient vision transformers with dynamic token sparsification |
| ref-23 | 2015 | Ren, Shaoqing; He, Kaiming; et al. | Faster R-CNN: towards real-time object detection with region proposal networks |
| ref-24 | 2021 | Roh, Byungseok; Shin, Wuhyun; et al. | Spatially consistent representation learning |
| ref-25 | 2021 | Sun, Peize; Jiang, Yi; et al. | What makes for end-to-end object detection? |
| ref-26 | 2015 | Szegedy, Christian; Liu, Wei; et al. | Going deeper with convolutions |
| ref-27 | 2017 | Vaswani, Ashish; Shazeer, Noam; et al. | Attention is all you need |
| ref-28 | 2020 | Wang, Huiyu; Zhu, Yukun; et al. | Axial-deeplab: Stand-alone axial-attention for panoptic segmentation |
| ref-29 | 2019 | Wang, Qiang; Li, Bei; et al. | Learning deep transformer models for machine translation |
| ref-30 | 2021 | Wang, Tao; Yuan, Li; et al. | PnP-DETR: towards efficient visual analysis with transformers |
| ref-31 | 2021 | Yao, Zhuyu; Ai, Jiangbo; et al. | Efficient DETR: improving end-to-end object detector with dense prior |
| ref-32 | 2021 | Zhu, Xizhou; Su, Weijie; et al. | Deformable DETR: deformable transformers for end-to-end object detection |

## Citation Analysis Report

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
