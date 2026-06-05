#### 总体总结
在 Introduction 与 Related Work 范围内，原文先用 panoptic segmentation 的任务定义和早期组合式 pipeline 说明问题背景，再把 DETR、Max-Deeplab、MaskFormer、K-Net、Panoptic FCN 等近期统一/端到端路线并置比较，最后将本文定位为对 DETR 式 transformer panoptic segmentation 的深入改造：用 Deformable DETR 解决多尺度效率与收敛问题，用 query decoupling 回应 things/stuff 同一 query set 的干扰问题，用 mask-wise merging 反衬 pixel-wise argmax 与传统后处理的局限。整体引用组织不是简单罗列 SOTA，而是围绕“从子任务组合到 query/transformer 统一，再到保留 things/stuff 差异的任务特定统一”这条论证线展开。


#### 关键文献

- [1] Nicolas Carion,Francisco Massa, Gabriel Synnaeve,Nicolas Usunier, Alexander Kirillov,and Sergey Zagoruyko, 2020: End-toend object detection with transformers (Baseline)

- [3] Bowen Cheng,Alexander G Schwing,and Alexander Kirillov, 2021: Per-pixel classification is not all you need for semantic segmentation (Baseline)

- [6] Alexander Kirillov,Kaiming He,Ross Girshick,Carsten Rother,and Piotr Dollar, 2019: Panoptic segmentation (Historical)

- [12] Xizhou Zhu, Weijie Su,Lewei Lu, Bin Li, Xiaogang Wang, and Jifeng Dai, 2020: Deformable detr: Deformable transformers for end-to-end object detection (Component)

- [2] 2 [21] Yanwei Li, Hengshuang Zhao, Xiaojuan Qi, Liwei Wang, Zeming Li, Jian Sun,and Jiaya Jia, 2021: Fully convolutional networks for panoptic segmentation (Baseline)

- [24] Ashish Vaswani, Noam Shazeer,Niki Parmar, Jakob Uszkoreit,Llion Jones,Aidan N Gomez, Lukasz Kaiser,and Illia Polosukhin, 2017: Attention is all you need (Historical)



#### 范围
- 章节: Introduction + Related Work
- 行号: 9-34

#### 按功能归类


##### Baseline

- [1] Nicolas Carion,Francisco Massa, Gabriel Synnaeve,Nicolas Usunier, Alexander Kirillov,and Sergey Zagoruyko, 2020
  - 标题: End-toend object detection with transformers
  - 关键词: DETR, set prediction, transformer detector, panoptic head
  - 总结: 原文把 DETR 作为核心基线和问题来源，用它说明端到端 transformer 检测器虽能减少手工流程，但在全景分割中暴露出收敛慢、mask 边界粗和 things/stuff 处理不当等限制。

- [3] Bowen Cheng,Alexander G Schwing,and Alexander Kirillov, 2021
  - 标题: Per-pixel classification is not all you need for semantic segmentation
  - 关键词: MaskFormer, query-based segmentation, pixel decoder, semantic segmentation
  - 总结: 该工作被用来说明已有方法已经尝试用 queries 统一分割，但仍依赖额外 pixel decoder 和有限分辨率特征；原文借此突出本文在 mask decoder 与 query decoupling 上的差异。

- [7] Alexander Kirillov,Ross Girshick,Kaiming He,and Piotr Dollar, 2019
  - 标题: Panoptic feature pyramid networks.In CVPR, 2019
  - 关键词: Panoptic FPN, feature pyramid, two-branch pipeline, baseline
  - 总结: 该工作被用来说明传统 panoptic segmentation 往往依赖子任务组合，原文借此铺垫本文希望减少复杂代理任务流程的动机。

- [9] Yuwen Xiong,Renjie Liao,Hengshuang Zhao,Rui Hu,Min Bai,Ersin Yumer,and Raquel Urtasun, 2019
  - 标题: Upsnet:A unifed panoptic segmentation network
  - 关键词: UPSNet, unified network, panoptic segmentation, surrogate tasks
  - 总结: 该工作被用于描述传统统一网络路线的进展与局限：它降低开销但仍围绕实例/语义两个子任务组合，而本文希望从 query/transformer 层面统一处理。

- [13] Yuxin Fang, Shusheng Yang, Xinggang Wang, Yu Li, Chen Fang,Ying Shan, Bin Feng,and Wenyu Liu, 2021
  - 标题: Instances as queries
  - 关键词: QueryInst, instance segmentation, queries, end-to-end
  - 总结: 该引用帮助原文把 Panoptic SegFormer 放入 broader query-based detection/segmentation 脉络，并支撑其实例分割对比对象。

- [14] Kai Chen,Jiangmiao Pang,Jiaqi Wang,Yu Xiong,Xiaoxiao Li, Shuyang Sun, Wansen Feng, Ziwei Liu, Jianping Shi, Wanli Ouyang, et al, 2019
  - 标题: Hybrid task cascade for instance segmentation
  - 关键词: HTC, instance segmentation, strong baseline, comparison
  - 总结: 该工作主要提供实例分割强基线背景，原文借它说明本文不是只优化 panoptic 输出，thing branch 也能与成熟实例分割方法竞争。

- [17] Bowen Cheng, Maxwell D Collins, Yukun Zhu, Ting Liu, Thomas S Huang,Hartwig Adam,and Liang-Chieh Chen, 2020
  - 标题: Panoptic-deeplab: A simple,strong,and fast baseline for bottom-up panoptic segmentation
  - 关键词: Panoptic-DeepLab, bottom-up, panoptic segmentation, baseline
  - 总结: 该引用用于说明非 transformer/query 路线也能做强全景分割，原文借它强调传统 surrogate sub-task 设计的复杂性与本文路线的差异。

- [2] 2 [21] Yanwei Li, Hengshuang Zhao, Xiaojuan Qi, Liwei Wang, Zeming Li, Jian Sun,and Jiaya Jia, 2021
  - 标题: Fully convolutional networks for panoptic segmentation
  - 关键词: Panoptic FCN, top-down meets bottom-up, two-branch, unified framework
  - 总结: 该引用在相关工作中承担直接对比作用：原文承认它简化了 panoptic pipeline，同时用它引出本文从 queries 和 transformer decoder 层面处理 things/stuff 的路线。



##### Contrast

- [4] Wenwei Zhang， Jiangmiao Pang， Kai Chen， and Chen Change Loy.K-Net:Towards unified image segmentation, 2021
  - 标题: In NeurIPS,2021
  - 关键词: K-Net, dynamic kernels, unified segmentation, concurrent work
  - 总结: 该引用用于对比统一 kernel 思路与本文 query decoupling 思路：原文承认两者都关注统一分割，但用它反衬本文保留 things/stuff 差异化处理的立场。

- [8] Soft-nms-improving object detection with one line of code
  - 标题: Soft-nms-improving object detection with one line of code
  - 关键词: Soft-NMS, post-processing, detection heuristic, NMS
  - 总结: 该引用主要作为后处理启发式代表，原文用它衬托 DETR 与本文这类端到端路线希望减少手工 pipeline 的目标。

- [26] Shaoqing Ren, Kaiming He, Ross Girshick, and Jian Sun, 2015
  - 标题: Faster r-cnn: Towards real-time object detection with region proposal networks
  - 关键词: Faster R-CNN, region proposal, handcrafted components, detector
  - 总结: 该引用用于对照传统检测流程，原文通过它说明 DETR 及本文继承的端到端路线如何摆脱 proposal/anchor/NMS 等组件。



##### Component

- [5] Wenhai Wang,Enze Xie,Xiang Li, Deng-Ping Fan,Kaitao Song,Ding Liang,Tong Lu,Ping Luo,and Ling Shao, 2021
  - 标题: Pvtv2: Improved baselines with pyramid vision transformer
  - 关键词: PVTv2, backbone, pyramid transformer, efficiency
  - 总结: 该工作被用作 backbone 选择与效率论证的一部分，帮助原文说明框架性能不只依赖单一大型 backbone。

- [12] Xizhou Zhu, Weijie Su,Lewei Lu, Bin Li, Xiaogang Wang, and Jifeng Dai, 2020
  - 标题: Deformable detr: Deformable transformers for end-to-end object detection
  - 关键词: Deformable DETR, deformable attention, multi-scale features, convergence
  - 总结: 该工作是本文重要组件来源，原文用它解释为什么 Panoptic SegFormer 可以处理多尺度高分辨率特征并减少 DETR 式训练成本。

- [22] Zhi Tian,Chunhua Shen,and Hao Chen, 2020
  - 标题: Conditional convolutions for instance segmentation
  - 关键词: CondInst, conditional convolution, instance segmentation, two-branch
  - 总结: 该引用用于解释被比较方法 Panoptic FCN 的结构背景，不是本文直接组件，而是帮助原文梳理统一分割路线的来源。

- [23] Kaiming He,Xiangyu Zhang, Shaoqing Ren,and Jian Sun, 2016
  - 标题: Deep residual learning for image recognition
  - 关键词: ResNet, backbone, feature maps, mask prediction
  - 总结: 该引用主要作为基础 backbone 来源，原文借它说明 DETR/MaskFormer 这类方法在低分辨率特征上做 mask prediction 的限制。

- [27] Tsung-Yi Lin,Priya Goyal, Ross Girshick, Kaiming He,and Piotr Dollar, 2017
  - 标题: Focal loss for dense object detection
  - 关键词: Focal loss, classification loss, dense detection, training
  - 总结: 该引用既作为传统检测技术背景，也为本文 loss function 中的 classification loss 提供组件来源。



##### Historical

- [6] Alexander Kirillov,Kaiming He,Ross Girshick,Carsten Rother,and Piotr Dollar, 2019
  - 标题: Panoptic segmentation
  - 关键词: panoptic segmentation, things and stuff, benchmark, task definition
  - 总结: 该引用承担任务定义和历史起点功能，原文借它解释 things/stuff 的差异，并说明早期 baseline 直接组合 instance 与 semantic segmentation 输出。

- [24] Ashish Vaswani, Noam Shazeer,Niki Parmar, Jakob Uszkoreit,Llion Jones,Aidan N Gomez, Lukasz Kaiser,and Illia Polosukhin, 2017
  - 标题: Attention is all you need
  - 关键词: Transformer, self-attention, computational complexity, feature resolution
  - 总结: 该工作被用作 transformer 技术基础和复杂度论据，原文借它解释为什么需要 deformable attention 来处理多尺度高分辨率特征。



##### Dataset

- [11] Tsung-Yi Lin, Michael Maire, Serge Belongie, James Hays, Pietro Perona, Deva Ramanan,Piotr Dollar, and C Lawrence Zitnick.Microsoft coco, 2014
  - 标题: Common objects in context.In ECCV,2014. 2, 5
  - 关键词: COCO, dataset, panoptic benchmark, evaluation
  - 总结: 该引用支撑实验环境说明，原文借 COCO 的标准数据和指标比较本文与 DETR、MaskFormer、K-Net 等方法。



##### Background

- [15] Ujwal Bonde,Pablo F Alcantarilla,and Stefan Leutenegger, 2020
  - 标题: Towards bounding-box free panoptic segmentation
  - 关键词: box-free, panoptic segmentation, holistic scene understanding
  - 总结: 该引用用于扩展 panoptic segmentation 相关工作背景，帮助原文说明本文面对的是一个已有多种建模选择的任务谱系。

- [16] Qizhu Li, Xiaojuan Qi,and Philip HS Tor, 2020
  - 标题: Unifying training and inference for panoptic segmentation
  - 关键词: training inference, panoptic segmentation, unification
  - 总结: 该引用补充了全景分割领域中流程统一的研究方向，原文借它铺垫本文进一步统一 things/stuff 表示但保留差异化 query 设计。

- [18] Tien-Ju Yang,Maxwell D Collins,Yukun Zhu,Jyh-Jing Hwang,Ting Liu, Xiao Zhang,Vivienne Sze, George Papandreou,and Liang-Chieh Chen.Deeperlab, 2019
  - 标题: Single-shot image parser. arXiv:1902.05093,2019.2
  - 关键词: single-shot parsing, panoptic segmentation, scene parsing
  - 总结: 该引用提供传统图像解析/全景分割背景，原文用它说明 prior methods 往往围绕 separate sub-tasks 组织模型。

- [19] Naiyu Gao, Yanhu Shan, Yupei Wang, Xin Zhao, Yinan Yu, Ming Yang,and Kaiqi Huang, 2019
  - 标题: SSAP: Single-shot instance segmentation with affinity pyramid
  - 关键词: SSAP, instance segmentation, affinity pyramid, sub-task
  - 总结: 该工作用于补充传统 instance segmentation 背景，原文借它说明先解子任务再组合的路线会带来额外复杂度。

- [25] Bin Dong,Fangao Zeng, Tiancai Wang,Xiangyu Zhang,and Yichen Wei, 2021
  - 标题: Solq: Segmenting objects by learning queries
  - 关键词: SOLQ, object queries, segmentation, end-to-end
  - 总结: 该引用用于扩展端到端/query-based 方法背景，原文借它把 DETR 之后的相关工作作为本文的技术环境。





#### 时间线分析

##### 早期
早期引用主要奠定本文综述范围中的任务、数据和检测基础：COCO 提供评测环境，Transformer/self-attention 与 ResNet 提供架构背景，Faster R-CNN、Soft-NMS 和 Focal Loss 则代表传统检测器及其训练/后处理组件。


- [8] Soft-nms-improving object detection with one line of code: Soft-nms-improving object detection with one line of code

- [11] Tsung-Yi Lin, Michael Maire, Serge Belongie, James Hays, Pietro Perona, Deva Ramanan,Piotr Dollar, and C Lawrence Zitnick.Microsoft coco, 2014: Common objects in context.In ECCV,2014. 2, 5

- [23] Kaiming He,Xiangyu Zhang, Shaoqing Ren,and Jian Sun, 2016: Deep residual learning for image recognition

- [24] Ashish Vaswani, Noam Shazeer,Niki Parmar, Jakob Uszkoreit,Llion Jones,Aidan N Gomez, Lukasz Kaiser,and Illia Polosukhin, 2017: Attention is all you need

- [26] Shaoqing Ren, Kaiming He, Ross Girshick, and Jian Sun, 2015: Faster r-cnn: Towards real-time object detection with region proposal networks

- [27] Tsung-Yi Lin,Priya Goyal, Ross Girshick, Kaiming He,and Piotr Dollar, 2017: Focal loss for dense object detection




##### 中期
中期引用集中在全景分割任务成形和传统组合式 pipeline 的发展上，包括 panoptic segmentation 定义、Panoptic FPN/UPSNet/AUNet/DeepLab 系列，以及 instance/semantic 子任务路线。这些文献帮助原文说明 surrogate sub-tasks 与 handcrafted pipelines 的复杂性。


- [6] Alexander Kirillov,Kaiming He,Ross Girshick,Carsten Rother,and Piotr Dollar, 2019: Panoptic segmentation

- [7] Alexander Kirillov,Ross Girshick,Kaiming He,and Piotr Dollar, 2019: Panoptic feature pyramid networks.In CVPR, 2019

- [9] Yuwen Xiong,Renjie Liao,Hengshuang Zhao,Rui Hu,Min Bai,Ersin Yumer,and Raquel Urtasun, 2019: Upsnet:A unifed panoptic segmentation network

- [14] Kai Chen,Jiangmiao Pang,Jiaqi Wang,Yu Xiong,Xiaoxiao Li, Shuyang Sun, Wansen Feng, Ziwei Liu, Jianping Shi, Wanli Ouyang, et al, 2019: Hybrid task cascade for instance segmentation

- [18] Tien-Ju Yang,Maxwell D Collins,Yukun Zhu,Jyh-Jing Hwang,Ting Liu, Xiao Zhang,Vivienne Sze, George Papandreou,and Liang-Chieh Chen.Deeperlab, 2019: Single-shot image parser. arXiv:1902.05093,2019.2

- [19] Naiyu Gao, Yanhu Shan, Yupei Wang, Xin Zhao, Yinan Yu, Ming Yang,and Kaiqi Huang, 2019: SSAP: Single-shot instance segmentation with affinity pyramid




##### 近期
近期引用直接收束到本文的方法脉络：DETR、Deformable DETR、MaskFormer、Max-Deeplab、K-Net、Panoptic FCN、CondInst、QueryInst/SOLQ 和 PVTv2 等共同构成 transformer/query-based segmentation 与更统一 panoptic framework 的对比对象和组件来源。


- [1] Nicolas Carion,Francisco Massa, Gabriel Synnaeve,Nicolas Usunier, Alexander Kirillov,and Sergey Zagoruyko, 2020: End-toend object detection with transformers

- [3] Bowen Cheng,Alexander G Schwing,and Alexander Kirillov, 2021: Per-pixel classification is not all you need for semantic segmentation

- [4] Wenwei Zhang， Jiangmiao Pang， Kai Chen， and Chen Change Loy.K-Net:Towards unified image segmentation, 2021: In NeurIPS,2021

- [5] Wenhai Wang,Enze Xie,Xiang Li, Deng-Ping Fan,Kaitao Song,Ding Liang,Tong Lu,Ping Luo,and Ling Shao, 2021: Pvtv2: Improved baselines with pyramid vision transformer

- [12] Xizhou Zhu, Weijie Su,Lewei Lu, Bin Li, Xiaogang Wang, and Jifeng Dai, 2020: Deformable detr: Deformable transformers for end-to-end object detection

- [13] Yuxin Fang, Shusheng Yang, Xinggang Wang, Yu Li, Chen Fang,Ying Shan, Bin Feng,and Wenyu Liu, 2021: Instances as queries

- [15] Ujwal Bonde,Pablo F Alcantarilla,and Stefan Leutenegger, 2020: Towards bounding-box free panoptic segmentation

- [16] Qizhu Li, Xiaojuan Qi,and Philip HS Tor, 2020: Unifying training and inference for panoptic segmentation

- [17] Bowen Cheng, Maxwell D Collins, Yukun Zhu, Ting Liu, Thomas S Huang,Hartwig Adam,and Liang-Chieh Chen, 2020: Panoptic-deeplab: A simple,strong,and fast baseline for bottom-up panoptic segmentation

- [2] 2 [21] Yanwei Li, Hengshuang Zhao, Xiaojuan Qi, Liwei Wang, Zeming Li, Jian Sun,and Jiaya Jia, 2021: Fully convolutional networks for panoptic segmentation

- [22] Zhi Tian,Chunhua Shen,and Hao Chen, 2020: Conditional convolutions for instance segmentation

- [25] Bin Dong,Fangao Zeng, Tiancai Wang,Xiangyu Zhang,and Yichen Wei, 2021: Solq: Segmenting objects by learning queries
