#### 总体总结
在 Introduction 与 Related Work 范围内，原文先用 DETR、Transformer 和传统检测器综述界定问题：目标检测长期依赖 anchor、规则化 assignment、NMS 与多尺度特征结构，而 DETR 虽然提供端到端集合预测框架，却因图像特征 attention 的全局密集计算而收敛慢、小目标性能不足。随后，原文把 efficient attention 文献分成预定义稀疏模式、数据依赖稀疏模式和低秩/线性近似三条路线，说明已有 Transformer 降复杂度方法虽丰富，但在图像域要么依赖固定局部模式，要么存在实现效率问题。最后，原文通过 deformable convolution、spatial attention 经验研究和多尺度特征金字塔文献，把本文定位为一条结合稀疏空间采样、Transformer 关系建模与多尺度特征聚合的路线：既继承 DETR 的端到端检测目标，又用可学习的少量采样点替代对整张特征图的密集 attention。


#### 关键文献

- [AY-1] Nicolas Carion, 2020: End-to-end object detection with transformers (Baseline)

- [AY-3] Ashish Vaswani, 2017: Attention is all you need (Background)

- [AY-6] Jifeng Dai, 2017: Deformable convolutional networks (Component)

- [AY-7] Tsung-Yi Lin, 2017: Feature pyramid networks for object detection (Background)

- [AY-5] Shaoqing Ren, 2015: Faster r-cnn: Towards real-time object detection with region proposal networks (Baseline)



#### 范围
- 章节: 1 INTRODUCTION + 2 RELATED WORK
- 行号: 16-50

#### 按功能归类


##### Background

- [AY-9] Joshua Ainslie, 2020
  - 标题: Etc: Encoding long and structured data in transformers
  - 关键词: sparse attention, long sequence, global tokens
  - 总结: 原文用该工作补充第一类 efficient attention 的代表，说明预定义稀疏模式能减少复杂度，但仍与本文可学习采样的 deformable attention 不同。

- [AY-10] Iz Beltagy, 2020
  - 标题: Longformer: The long-document transformer
  - 关键词: Longformer, sparse attention, local window
  - 总结: 该引用被用于构成 efficient attention 的背景谱系，原文借它说明局部窗口加全局 token 的做法仍属于预定义稀疏模式。

- [AY-11] Rewon Child, 2019
  - 标题: Generating long sequences with sparse transformers
  - 关键词: Sparse Transformer, fixed pattern, receptive field
  - 总结: 该工作被原文用来说明固定稀疏 attention 可扩展感受野，但其预设模式与本文从 query 预测采样位置的策略形成区别。

- [AY-23] Krzysztof Choromanski, 2020
  - 标题: Masked language modeling for proteins via linearly scalable long-context transformers
  - 关键词: linear attention, kernel approximation, low-rank attention
  - 总结: 原文用该引用补全 efficient attention 的低秩或核化近似分支，反衬本文不是改写全部 attention 矩阵，而是先用稀疏空间采样预过滤关键位置。

- [AY-27] Golnaz Ghiasi, 2019
  - 标题: Nas-fpn: Learning scalable feature pyramid architecture for object detection
  - 关键词: NAS-FPN, multi-scale features, feature pyramid
  - 总结: 该引用帮助原文铺设多尺度检测背景，随后引出本文主张：multi-scale deformable attention 可在不依赖这些金字塔结构的情况下聚合多尺度特征。

- [AY-12] Jonathan Ho, 2019
  - 标题: Axial attention in multidimensional transformers
  - 关键词: axial attention, vision transformer, fixed sparse pattern
  - 总结: 原文用该工作说明图像域已有 attention 降复杂度尝试，但这类方法仍可能受限于固定模式和内存访问效率。

- [AY-14] Zilong Huang, 2019
  - 标题: Ccnet: Criss-cross attention for semantic segmentation
  - 关键词: criss-cross attention, semantic segmentation, fixed sparse attention
  - 总结: 原文用该引用充实视觉 efficient attention 背景，说明已有视觉 attention 的稀疏性多来自人为设定的空间连接。

- [AY-24] Angelos Katharopoulos, 2020
  - 标题: Transformers are rnns: Fast autoregressive transformers with linear attention
  - 关键词: linear attention, kernelization, efficient transformer
  - 总结: 该引用用于界定低秩/线性 attention 方向，原文借它说明本文方法不是同一类数学近似，而是面向图像特征的可学习采样。

- [AY-21] Nikita Kitaev, Łukasz Kaiser, 2020
  - 标题: Reformer: The efficient transformer
  - 关键词: Reformer, LSH attention, data-dependent sparsity
  - 总结: 该工作被用来代表数据依赖稀疏 attention 路线，帮助原文把本文可学习采样的 deformable attention 放到更大的 efficient attention 分类中。

- [AY-28] Tao Kong, 2018
  - 标题: Deep feature pyramid reconfiguration for object detection
  - 关键词: feature pyramid, multi-scale fusion, object detection
  - 总结: 该引用被用于铺设多尺度特征融合背景，原文借此说明检测器通常需要专门结构处理尺度差异。

- [AY-7] Tsung-Yi Lin, 2017
  - 标题: Feature pyramid networks for object detection
  - 关键词: FPN, multi-scale features, small objects
  - 总结: 该工作帮助原文说明多尺度特征是目标检测的成熟需求，随后本文声称 multi-scale deformable attention 可自然聚合多尺度特征而无需 FPN。

- [AY-2] Li Liu, 2020
  - 标题: Deep learning for generic object detection: A survey
  - 关键词: object detection survey, hand-designed components, multi-scale detection
  - 总结: 该引用被原文用作目标检测背景综述，帮助界定 DETR 和本文想摆脱的传统检测器设计负担。

- [AY-15] Peter J Liu, 2018
  - 标题: Generating wikipedia by summarizing long sequences
  - 关键词: local attention, sparse transformer, long sequence
  - 总结: 该引用为 efficient attention 的第一类路线提供例证，原文借它说明预定义局部模式能降复杂度但会损失全局信息。

- [AY-16] Niki Parmar, 2018
  - 标题: Image transformer
  - 关键词: Image Transformer, local window, visual attention
  - 总结: 该工作被用来说明视觉任务中已有局部 attention 方案，但原文借其归类指出这些方法主要依赖预定义稀疏模式。

- [AY-17] Jiezhong Qiu, 2019
  - 标题: Blockwise self-attention for long document understanding
  - 关键词: blockwise attention, long document, distant connections
  - 总结: 该引用帮助原文说明固定稀疏模式的变体可以加入远距连接，但仍属于预定义结构，不是本文的可学习空间采样。

- [AY-22] Aurko Roy, 2020
  - 标题: Efficient content-based sparse attention with routing transformers
  - 关键词: routing transformer, data-dependent sparse attention, clustering
  - 总结: 该引用补充了数据依赖稀疏 attention 分支，帮助原文把本文可学习采样机制与 LSH/k-means/routing 类方法并列比较。

- [AY-29] Mingxing Tan, 2020
  - 标题: Efficientdet: Scalable and efficient object detection
  - 关键词: EfficientDet, BiFPN, multi-scale fusion
  - 总结: 该工作被原文用于多尺度检测背景，随后本文强调自己的 multi-scale deformable attention 可以替代这类专门特征金字塔结构。

- [AY-8] Yi Tay, 2020
  - 标题: Sparse sinkhorn attention
  - 关键词: efficient transformers, Sparse Sinkhorn, block sparse attention
  - 总结: 该引用承担双重作用：提供 efficient attention 分类背景，并作为数据依赖稀疏 attention 的例子衔接本文的可学习采样思想。

- [AY-3] Ashish Vaswani, 2017
  - 标题: Attention is all you need
  - 关键词: Transformer, self-attention, encoder-decoder
  - 总结: 该工作是本文技术背景的基础引用：原文借它交代 DETR 的核心架构来源和 efficient attention 讨论的对象。

- [AY-19] Huiyu Wang, 2020
  - 标题: Axial-deeplab: Stand-alone axial-attention for panoptic segmentation
  - 关键词: Axial-DeepLab, axial attention, vision attention
  - 总结: 该引用被用于说明视觉 attention 的多种降复杂度尝试，原文借它强调图像域已有方案仍多受固定模式或实现效率限制。

- [AY-25] Felix Wu, 2019
  - 标题: Pay less attention with lightweight and dynamic convolutions
  - 关键词: dynamic convolution, lightweight convolution, attention as convolution
  - 总结: 该引用帮助原文把卷积变体纳入 attention 谱系，支持本文从 deformable convolution 发展出 deformable attention 的合理性。

- [AY-30] Hang Xu, 2019
  - 标题: Auto-fpn: Automatic network architecture adaptation for object detection beyond classification
  - 关键词: Auto-FPN, neural architecture search, feature pyramid
  - 总结: 该引用补充了多尺度特征融合背景，原文借它说明本文方法面对的是一系列成熟的特征金字塔设计，而不是单一 FPN 基线。

- [AY-20] Manzil Zaheer, 2020
  - 标题: Big bird: Transformers for longer sequences
  - 关键词: BigBird, global token, sparse attention
  - 总结: 该引用用于完善 fixed sparse attention 分支，原文借它说明已有稀疏模式仍是预定义结构，与本文按 query 特征预测采样点的方式不同。

- [AY-31] Qijie Zhao, 2019
  - 标题: M2det: A single-shot object detector based on multi-level feature pyramid network
  - 关键词: M2Det, multi-level features, object detection
  - 总结: 该引用被用于多尺度目标检测背景，原文借它铺垫本文希望用 attention 机制自然聚合多尺度特征。



##### Baseline

- [AY-1] Nicolas Carion, 2020
  - 标题: End-to-end object detection with transformers
  - 关键词: DETR, end-to-end detection, set prediction
  - 总结: 原文用 DETR 建立核心基线和问题定义，本文的所有改动都围绕保留其端到端集合预测优势并解决其训练与特征分辨率瓶颈展开。

- [AY-5] Shaoqing Ren, 2015
  - 标题: Faster r-cnn: Towards real-time object detection with region proposal networks
  - 关键词: Faster R-CNN, training convergence, detection baseline
  - 总结: 该引用被用来建立传统强检测器的基线参照，原文借它强调本文要解决的不只是精度，而是端到端检测器的收敛成本。



##### Component

- [AY-6] Jifeng Dai, 2017
  - 标题: Deformable convolutional networks
  - 关键词: deformable convolution, spatial sampling, visual attention
  - 总结: 该工作是本文方法构造的关键来源：原文借它说明可学习稀疏采样适合图像特征，但本文进一步补上 Transformer 式关系建模。



##### Contrast

- [AY-13] Han Hu, 2019
  - 标题: Local relation networks for image recognition
  - 关键词: local relation, vision attention, implementation cost
  - 总结: 该工作被原文用作对比对象：它代表视觉局部 attention 路线，原文借其局限强调 deformable attention 在相同 FLOPs 下只比卷积略慢。

- [AY-18] Prajit Ramachandran, 2019
  - 标题: Stand-alone self-attention in vision models
  - 关键词: stand-alone self-attention, vision, memory access
  - 总结: 该工作被原文作为视觉 attention 路线的关键对照，说明仅降低理论复杂度不足以保证工程效率，本文声称 deformable attention 更接近卷积效率。



##### Dataset

- [AY-4] Tsung-Yi Lin, 2014
  - 标题: Microsoft coco: Common objects in context
  - 关键词: COCO, object detection benchmark, evaluation
  - 总结: 该引用为原文提供实验与问题背景的基准语境，说明本文比较的收敛速度、小目标性能和 AP 指标主要围绕 COCO 展开。



##### Historical

- [AY-26] Xizhou Zhu, 2019
  - 标题: An empirical study of spatial attention mechanisms in deep networks
  - 关键词: spatial attention, deformable convolution, attention taxonomy
  - 总结: 该工作被用来建立本文方法的概念桥梁：原文借它把视觉卷积变体与 attention 统一起来，从而支撑 deformable attention 的设计解释。





#### 时间线分析

##### 早期
早期条目主要给出本文论证的基础坐标：COCO 作为检测基准，Faster R-CNN 和 FPN 代表传统检测与多尺度特征路线，Transformer 与 deformable convolution 则分别提供关系建模和稀疏空间采样两个关键技术源头。


- [AY-6] Jifeng Dai, 2017: Deformable convolutional networks

- [AY-4] Tsung-Yi Lin, 2014: Microsoft coco: Common objects in context

- [AY-7] Tsung-Yi Lin, 2017: Feature pyramid networks for object detection

- [AY-5] Shaoqing Ren, 2015: Faster r-cnn: Towards real-time object detection with region proposal networks

- [AY-3] Ashish Vaswani, 2017: Attention is all you need




##### 中期
中期条目集中展开两个背景分支：一方面是图像域 self-attention、局部/轴向/块状稀疏 attention 与 dynamic convolution 的效率讨论，另一方面是 PANet、NAS-FPN、Auto-FPN、M2Det 等多尺度特征融合路线，用来衬托本文对可学习多尺度采样的定位。


- [AY-11] Rewon Child, 2019: Generating long sequences with sparse transformers

- [AY-27] Golnaz Ghiasi, 2019: Nas-fpn: Learning scalable feature pyramid architecture for object detection

- [AY-12] Jonathan Ho, 2019: Axial attention in multidimensional transformers

- [AY-13] Han Hu, 2019: Local relation networks for image recognition

- [AY-14] Zilong Huang, 2019: Ccnet: Criss-cross attention for semantic segmentation

- [AY-28] Tao Kong, 2018: Deep feature pyramid reconfiguration for object detection

- [AY-2] Li Liu, 2020: Deep learning for generic object detection: A survey

- [AY-15] Peter J Liu, 2018: Generating wikipedia by summarizing long sequences

- [AY-16] Niki Parmar, 2018: Image transformer

- [AY-17] Jiezhong Qiu, 2019: Blockwise self-attention for long document understanding

- [AY-18] Prajit Ramachandran, 2019: Stand-alone self-attention in vision models

- [AY-25] Felix Wu, 2019: Pay less attention with lightweight and dynamic convolutions

- [AY-30] Hang Xu, 2019: Auto-fpn: Automatic network architecture adaptation for object detection beyond classification

- [AY-31] Qijie Zhao, 2019: M2det: A single-shot object detector based on multi-level feature pyramid network

- [AY-26] Xizhou Zhu, 2019: An empirical study of spatial attention mechanisms in deep networks




##### 近期
近期条目把论述收束到 efficient Transformer 与 DETR 前沿：DETR 是本文直接基线，Reformer、Routing Transformer、Sparse Sinkhorn、Longformer、BigBird、Linformer/linear attention 等构成高效 attention 分类背景，EfficientDet 则代表强多尺度检测器对照。


- [AY-9] Joshua Ainslie, 2020: Etc: Encoding long and structured data in transformers

- [AY-10] Iz Beltagy, 2020: Longformer: The long-document transformer

- [AY-1] Nicolas Carion, 2020: End-to-end object detection with transformers

- [AY-23] Krzysztof Choromanski, 2020: Masked language modeling for proteins via linearly scalable long-context transformers

- [AY-24] Angelos Katharopoulos, 2020: Transformers are rnns: Fast autoregressive transformers with linear attention

- [AY-21] Nikita Kitaev, Łukasz Kaiser, 2020: Reformer: The efficient transformer

- [AY-22] Aurko Roy, 2020: Efficient content-based sparse attention with routing transformers

- [AY-29] Mingxing Tan, 2020: Efficientdet: Scalable and efficient object detection

- [AY-8] Yi Tay, 2020: Sparse sinkhorn attention

- [AY-19] Huiyu Wang, 2020: Axial-deeplab: Stand-alone axial-attention for panoptic segmentation

- [AY-20] Manzil Zaheer, 2020: Big bird: Transformers for longer sequences
