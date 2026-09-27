# 全景分割变换器：深入探索基于Transformer模型的全景分割

李志奇1,王文海2,谢恩泽,于志定4,阿尼玛·阿南德库马尔4,5,何塞·M·阿尔瓦雷斯4,罗平,卢通"南京大学²上海人工智能实验室香港大学4英伟达 加州理工学院lzq@smail.nju.edu.cnwangwenhai@pjlab.org.cn xieenze@hku.hk zhidingy@nvidia.comaanandkumar@nvidia.com josea@nvidia.com pluo@cs.hku.hk lutong@nju.edu.cn

# 摘要

全景分割结合了联合语义分割与实例分割，将图像内容划分为可数物体和背景两类。我们提出全景分割变换器，这是一个基于Transformer模型的全景分割通用框架。它包含三个创新组件：高效的深度监督掩码解码器、查询解耦策略以及改进的后处理方法。我们还采用可变形DETR高效处理多尺度特征，这是DETR的快速高效版本。具体而言，我们以逐层方式监督掩码解码器中的注意力模块。这种深度监督策略使注意力模块能快速聚焦于有意义的语义区域，不仅提升了性能，相比可变形DETR还将所需训练轮次减少了一半。我们的查询解耦策略通过解耦查询集的职责，避免了可数物体与背景之间的相互干扰。此外，我们的后处理策略通过综合考虑分类与分割质量来解决掩码重叠冲突，在不增加额外成本的情况下提升了性能。该方法将基线DETR模型的全景质量提升了 $6 . 2 \%$ 。全景分割变换器在COCO测试开发集上以 $5 6 . 2 \%$ 的全景质量取得了最先进的结果，同时展现出比现有方法更强的零样本鲁棒性。

# 1.引言

语义分割和实例分割是两个重要且相关的视觉任务。它们的内在联系最近催生了全景分割，作为这两项任务的统一[6]。在全景分割中，图像内容被分为两种类型:可数物体和背景。可数物体指的是可数实例（例如，人、汽车），每个实例都有一个唯一的ID以区别于其他

![](Images_J3PD2ISP/72dafa82296b44e7656b433a4991c70648e77498a7670e3796dcd21f190534d6.jpg)  
#参数 (百万)图1.在COCOval2017数据集划分上与先前全景分割方法的比较。Panoptic SegFormer 模型在不同模型中优于其他对应模型。Panoptic SegFormer (PVTv2-B5 [5])实现了$5 5 . 4 \%$ 的全景质量，以显著更少的参数量超越了先前的方法。

实例。背景指的是无定形且不可数的区域（例如，天空、草地），没有实例ID $[ 6 ] _ { \circ }$

近期研究[1-3]尝试利用Transformer模型通过一个查询集来处理可数物体和背景。例如，DETR[1]通过在一个端到端目标检测器之上添加一个全景分割头，简化了全景分割的工作流程。与先前的方法[6,7],不同,DETR不需要额外的手工设计的流程[8,9]。虽然简单,但DETR也带来了一些问题： (1)它需要漫长的训练过程才能收敛； (2)由于自注意力机制的计算复杂度与输入序列长度的平方成正比，DETR的特征分辨率受到限制。因此它使用一个FPN风格[1,1O]的全景分割头来生成掩码，这通常会导致边界保真度较低； (3)它平等地处理可数物体和背景，但用边界框来表示它们，这对于背景[2,3]可能不是最优的。尽管DETR在目标检测任务上取得了优异的性能，但其在全景分割上的优势尚未得到充分证明。为了

# Panoptic SegFormer: Delving Deeper into Panoptic Segmentation with Transformers

Zhiqi $\mathrm { L i ^ { 1 } }$ , Wenhai Wang²,Enze $\mathrm { X i e ^ { 3 } }$ , Zhiding $\mathrm { Y u ^ { 4 } }$ ， Anima Anandkumar4,5, Jose M. Alvarez4, Ping Luo³, Tong Lu1 1Nanjing University ²Shanghai AI Laboratory The University of Hong Kong 4NVIDIA 5Caltech lzq@ smail.nju.edu.cn wangwenhai $@$ pjlab.org.cn xieenze $@$ hku.hkzhidingy $@$ nvidia.com aanandkumar $@$ nvidia.com josea $@$ nvidia.com pluo $@$ cs.hku.hk lutong $@$ nju.edu.cn

# Abstract

Panoptic segmentation involves a combination of joint semantic segmentation and instance segmentation,where image contents are divided into two types: things and stuff. We present Panoptic SegFormer, a general framework for panoptic segmentation with transformers. It contains three innovative components: an efficient deeply-supervised mask decoder, a query decoupling strategy, and an improved post-processing method. We also use Deformable DETR to efficiently process multi-scale features,which is a fast and efficient version of DETR. Specifically， we supervise the attention modules in the mask decoder in a layer-wise manner. This deep supervision strategy lets the attention modules quickly focus on meaningful semantic regions. It improves performance and reduces the number of required training epochs by half compared to $D e$ formable DETR. Our query decoupling strategy decouples the responsibilities of the query set and avoids mutual interference between things and stuff. In addition,our postprocessing strategy improves performance without additional costs by jointly considering classification and segmentation qualities to resolve conflicting mask overlaps. Our approach increases the accuracy $6 . 2 \%$ $P Q$ over the baseline DETR model. Panoptic SegFormer achieves stateof-the-art results on COCO test-dev with $56 . 2 \%$ PQ. It also shows stronger zero-shot robustness over existing methods.

# 1. Introduction

Semantic segmentation and instance segmentation are two important and related vision tasks. Their underlying connections recently motivated panoptic segmentation as a unification of both the tasks [6]. In panoptic segmentation, image contents are divided into two types: things and stuff. Things refer to countable instances (e.g., person, car) and each instance has a unique id to distinguish it from the other instances. Stuff refers to the amorphous and uncountable regions (e.g., sky, grassland) and has no instance id [6].

![](Images_J3PD2ISP/f5329265894940a110325c402e94e11a14ae5082ba4db40107814e5fc55cf0a8.jpg)  
Figure 1. Comparison to the prior arts in panoptic segmentation methods on the COCO val2017 split.Panoptic SegFormer models outperform the other counterparts among different models. Panoptic SegFormer (PVTv2-B5 [5]） achieves $5 5 . 4 \%$ PQ, surpassing previous methods with significantly fewer parameters.

Recent works [1-3] attempt to employ transformers to handle both things and stuf through a query set. For example,DETR[1] simplifies the workflow of panoptic segmentation by adding a panoptic head on top of an end-to-end object detector. Unlike previous methods [6,7],DETR does not require additional handcrafted pipelines [8,9]. While being simple,DETR also causes some issues: (1) It requires a lengthy training process to converge; (2) Because the computational complexity of self-attention is squared with the length of the input sequence, the feature resolution of DETR is limited. So that it uses an FPN-style [1,1O] panoptic head to generate masks,which always suffer low-fidelity boundaries;(3) It handles things and stuff equally, yet representing them with bounding boxes,which may be suboptimal for stuff [2,3]. Although DETR achieves excellent performance on the object detection task,its superiority on panoptic segmentation has not been well demonstrated.In order 克服DETR在全景分割上的缺陷，我们提出了一系列 新颖有效的策略，这些策略大幅提升了基于 Transformer模型的全景分割模型的性能。

![](Images_J3PD2ISP/318652739a19045235a41f33adef7a97fa612da98620859784928e8f986be841.jpg)  
图2.Panoptic SegFormer概述。Panoptic SegFormer 由骨干网络、编码器和解码器组成。骨干网络和编码器输出并精炼多尺度特征。位置解码器的输入是 $N _ { \mathrm { t h } }$ 物体查询和多尺度特征。我们将来自位置解码器的 $N _ { \mathrm { t h } }$ 物体查询和 $N _ { \mathrm { s t } }$ 背景查询输入到掩码解码器。位置解码器的目标是学习查询的参考点，而掩码解码器则预测最终的类别和掩码。解码器的细节将在下文介绍。我们使用掩码级合并方法，而非常用的像素级argmax方法来进行推理。

我们在COCO数据集上进行了大量实验。如图 [11]1所示，全景分割变换器以少得多的参数量显著超越了MaskFormer[3]和K-Net等先前技术。借助可变形注意力[12]和我们深度监督的掩码解码器，我们的方法所需的训练轮次远少于之前的基于Transformer的方法（24轮对比．300+轮）。此外，我们的方法在实例分割任务上也与当前方法取得了具有竞争力的性能。[13,14]。

我们的方法。在这项工作中，我们提出了全景分割变换器（Panoptic SegFormer），一个用于Transformer模型全景分割的简洁而有效的框架。我们的框架设计基于以下观察：1）深度监督对于在掩码解码器中学习高质量的判别性注意力表示至关重要。2）使用相同的方案处理可数物体和背景[1]是次优的，因为可数物体和背景之间存在不同的特性[6]。3）常用的后处理方法，如像素级Argmax[1-3]，由于极端异常值，往往会产生假阳性结果。我们在全景分割变换器框架中通过以下方式克服这些挑战：

# 2.相关工作

·我们提出了一个掩码解码器，它利用多尺度注意力图来生成高保真掩码。该掩码解码器采用深度监督，在中间层促进判别性注意力表示，从而获得更好的掩码质量和更快收敛。

全景分割。全景分割已成为整体场景理解的热门任务[6,15-17]。全景分割的相关研究主要将这一问题视为实例分割和语义分割的联合任务，其中可数物体和背景被分开处理[18,19]。Kirillov 等人。[6]提出了全景分割的概念和基准，并提供了一个基线方法,该方法直接结合了单独的实例分割模型和语义分割模型的输出。此后，诸如全景特征金字塔网络[7],、统一全景分割网络[9]和注意力U型网络[20]等模型通过将实例分割和语义分割整合到单一模型中，提高了精度并减少了计算开销。然而，这些方法通过解决替代的子任务来逼近目标任务，因此引入了不必要的模型复杂性和次优性能。

·我们提出了一种查询解耦策略，将查询集分解为一个通过二分匹配来匹配可数物体的物体查询集，以及另一个通过类别固定分配来处理背景的背景查询集。该策略避免了每个查询内部可数物体和背景之间的相互干扰，并显著提高了背景分割的质量。更多细节请参阅第3.3.1节和图3。

·我们提出了一种改进的后处理方法，用于生成全景格式的结果。除了比广泛使用的像素级Argmax方法更高效外，我们的方法还包含一种掩码级合并策略，该策略同时考虑了分类概率和预测掩码质量。仅我们的后处理方法就为DETR带来了 $1 . 3 \%$ 的PQ改进。[1].

最近，人们致力于统一全景分割的框架。Li等人[21]提出了PanopticFCN，其中全景分割流程通过一种类似于CondInst[22]的“自上而下与自下而上相遇”的双分支设计得以简化。在他们的工作中，可数物体和背景通过一个对象/区域级内核分支和一个图像级特征分支联合建模。最近的几项工作将可数物体和背景表示为查询，并通过Transformer模型执行端到端全景分割。

![](Images_J3PD2ISP/c47d212d8581d3519da00aa6ef36c653de3a56742c6f11e6873861318d5d058c.jpg)  
Figure2.Overviewof Panoptic SegFormer.Panoptic SegFormeriscomposedofbackbone,encoder,anddecoder.Thebackbonend the encoder output and refine multi-scale features.Inputs of the location decoder are $N _ { \mathrm { t h } }$ thing queries and the multi-scale features. We feed $N _ { \mathrm { t h } }$ thing queries from the location decoder and $N _ { \mathrm { s t } }$ stuff queries to the mask decoder. The location decoder aims to learn reference pointsofqueries,andthe maskdecoderpredictsthefialcategoryandmask.Detailsofthedecoderwillbe introducedbelow.Weusea mask-wise merging method instead of the commonly used pixel-wise argmax method to perform inference.

to overcome the defects of DETR on panoptic segmentation,we propose a series of novel and effective strategies that improve the performance of transformer-based panoptic segmentation models by a large margin.

Our approach. In this work, we propose Panoptic SegFormer, a concise and effective framework for panoptic segmentation with transformers. Our framework design is motivated by the following observations: 1) Deep supervision matters in learning high-qualities discriminative attention representations in the mask decoder. 2) Treating things and stuff with the same recipe [1] is suboptimal due to the different properties between things and stuff [6].3) Commonly used post-processing such as pixel-wise argmax [1-3] tends to generate false-positive results due to extreme anomalies. We overcome these challenges in Panoptic SegFormer framework as follows:

· We propose a mask decoder that utilizes multi-scale attention maps to generate high-fidelity masks. The mask decoder is deeply-supervised, promoting discriminative attention representations in the intermediate layers with better mask qualities and faster convergence.

· We propose a query decoupling strategy that decomposes the query set into a thing query set to match things via bipartite matching and another stuff query set to process stuff with class-fixed assign. This strategy avoids mutual interference between things and stuff within each query and significantly improves the qualities of stuff segmentation. Kindly refer to Sec.3.3.1 and Fig.3 for more details.

We conduct extensive experiments on COCO [11] dataset. As shown in Fig.1, Panoptic SegFormer significantly surpasses priors arts such as MaskFormer [3] and K-Net [4] with much fewer parameters. With deformable attention [12] and our deeply-supervised mask decoder, our method requires much fewer training epochs than previous transformer-based methods (24 vs. $3 0 0 +$ [1,3]. Inaddition,our approach also achieves competitive performance with current methods [13,14] on the instance segmentation task.

· We propose an improved post-processing method to generate results in panoptic format. Besides being more efficient than the widely used pixel-wise argmax method,our method contains a mask-wise merging strategy that considers both classification probability and predicted mask qualities. Our post-processing method alone renders a $1 . 3 \%$ PQ improvement to DETR [1].

# 2. Related Work

Panoptic Segmentation. Panoptic segmentation becomes a popular task for holistic scene understanding [6, 15-17]. The panoptic segmentation literature mainly treats this problem as a joint task of instance segmentation and semantic segmentation where things and stuff are handled separately [18,19]. Kirillov et al.[6] proposed the concept of and benchmark of panoptic segmentation together with a baseline that directly combines the outputs of individual instance segmentation and semantic segmentation models. Since then, models such as Panoptic FPN[7], UPSNet [9] and AUNet [2O] have improved the accuracy and reduced the computational overhead by combining instance segmentation and semantic segmentation into a single model. However,these methods approximate the target task by solving the surrogate sub-tasks, therefore introducing undesired model complexities and suboptimal performance.

Recently, efforts have been made to unify the framework of panoptic segmentation. Li et al.[21] proposed Panoptic FCN where the panoptic segmentation pipeline is simplified with a“top-down meets bottom-up” two-branch design similar to CondInst [22]. In their work,things and stuff are jointly modeled by an object/region-level kernel branch and an image-level feature branch. Several recent works represent things and stuff as queries and perform end

DETR[1]预测可数物体和背景的边界框，并组合Transformer解码器的注意力图和ResNet[23]的特征图来执行全景分割。Max-Deeplab[2]通过一个双路径Transformer直接预测对象类别和掩码，无论类别是可数物体还是背景。在DETR的基础上,

MaskFormer[3]使用了一个额外的像素解码器来精炼高空间分辨率的特征，并通过将查询与像素解码器的特征相乘来生成掩码。由于自注意力[24],的计算复杂度，DETR和MaskFormer都使用空间分辨率有限的特征图进行全景分割，这损害了性能，并需要在最终的掩码预测中结合额外的高分辨率特征图。与上述方法不同，我们的查询解耦策略使用独立的查询集处理可数物体和背景。尽管可数物体查询和背景查询是为不同目标设计的，但它们由掩码解码器以相同的工作流程处理。这些查询的预测结果格式相同，因此我们可以在后处理过程中以平等的方式处理它们。一项同期工作[4]采用了类似思路，使用动态内核执行实例和语义分割，旨在利用统一的内核处理各种分割任务。与之相反，我们的目标是更深入地研究基于

Transformer的全景分割。由于各种任务性质不同,统一的流程是否适合这些任务仍然是一个开放性问题。在本工作中，我们利用一个额外的位置解码器来辅助可数物体学习位置线索并获得更好的结果。

端到端目标检测。近期流行的端到端目标检测框架启发了许多其他相关研究[13,25]。其中，DETR[1]可以说是这些方法中最具代表性的端到端目标检测器。DETR将目标检测任务建模为一个带有可学习查询的字典查找问题，并采用编码器-解码器Transformer来预测边界框，无需额外的后处理。DETR极大地简化了传统的检测框架，并移除了许多手工设计的组件，例如非极大值抑制(NMS）[26,27]和锚框[27]。Zhu等人．[12]提出了可变形DETR,它通过可变形注意力层进一步降低了内存和计算成本。在本工作中，我们采用可变形注意力[12]，因为它相比DETR[1]具有更高的效率和更快的收敛速度。

# 3.方法

# 3.1.整体架构

如图2所示，全景分割变换器由三个关键模块组成：Transformer编码器、位置解码器和掩码解码器，其中（1)Transformer编码器用于精炼骨干网络提供的多尺度特征图,(2）位置解码器旨在捕获可数物体的位置线索，（3)掩码解码器用于最终的分类和分割。

![](Images_J3PD2ISP/c57b0c754cdd8b27db6008dd0292abe6a742bab1e6c64e4cde991bc08e4dc18c.jpg)  
图3.(a)方法[1-3]采用一个查询集来联合匹配可数物体 (紫色方块)和背景 (绿色方块）。(b)我们使用一个物体查询集(紫色圆圈）通过二分匹配来定位可数物体，并使用一个背景查询集（(绿色圆圈）通过类别固定分配策略来预测背景。 $\emptyset$ 被分配给未匹配的查询。

我们的架构将输入图像 $X \in \mathbb { R } ^ { H \times W \times 3 }$ 馈送到骨干网络，并从最后三个阶段获取特征图 $C _ { 3 } .$ 、 $C _ { 4 }$ 和 $C _ { 5 }$ ，其分辨率相对于输入图像分别为1/8、 $1 / 1 6$ 和1/32。我们通过一个全连接层将这三个特征图投影到具有256个通道的特征图，并将它们展平为特征令牌 $C _ { 3 { \bf { \cdot } } } ^ { \prime }$ $C _ { 4 } ^ { \prime }$ 和$C _ { 5 ^ { \circ } } ^ { \prime }$ 这里，我们将 $L _ { i }$ 定义为 $\underset { 2 ^ { i + 2 } } { H } \times \underset { 2 ^ { i + 2 } } { W }$ 而 $C _ { 3 ^ { \mathbf { \hat { \nu } } } } ^ { \prime }$ $C _ { 4 } ^ { \prime }$ 和 $C _ { 5 } ^ { \prime }$ 的形状分别为 $L _ { 1 } \times 2 5 6 _ { \cdot }$ $L _ { 2 } \times 2 5 6$ 和 $L _ { 3 } \times 2 5 6 _ { \circ }$ 接下来，使用拼接后的特征令牌作为输入，变换器编码器输出尺寸为 $( L _ { 1 } + L _ { 2 } + L _ { 3 } ) { \times } 2 5 6$ 的精炼特征。之后，我们分别使用 $N _ { \mathrm { t h } }$ 个和 $N _ { \mathrm { s t } }$ 个随机初始化的物体查询和背景查询来描述可数物体和背景。位置解码器通过检测物体的边界框来精炼 $N _ { \mathrm { t h } }$ 个物体查询，以捕获位置信息。随后，掩码解码器将物体查询和背景查询同时作为输入,并在每一层预测掩码和类别。

在推理过程中，我们采用掩码级合并策略，将最终掩码解码器层预测的掩码转换为全景分割结果，具体细节将在第3.5节详细介绍。

# 3.2.Transformer编码器

高分辨率和多尺度特征图对于分割任务至关重要[7,21,28]。由于自注意力层的高计算成本，以往的基于Transformer的方法[1,3]只能在其编码器中处理低分辨率特征图（例如，ResNet $C _ { 5 } )$ ，这限制了分割性能。与这些方法不同，我们采用可变形注意力[12]来实现我们的Transformer编码器。得益于可变形注意力的低计算复杂度，我们的编码器能够精炼高分辨率和多尺度特征图并为其引入位置编码[24]。 $F$

# 3.3.解码器

在本节中，我们首先介绍我们的查询解耦策略,然后详细解释我们的位置解码器和掩码解码器。

to-end panoptic segmentation via transformers. DETR[1] predicts the bounding boxes of things and stuff and combines the attention maps of the transformer decoder and the feature maps of ResNet [23] to perform panoptic segmentation.Max-Deeplab [2] directly predicts object categories and masks through a dual-path transformer regardless of the category being things or stuff. On top of DETR, MaskFomer [3] used an additional pixel decoder to refine high spatial resolution features and generated the masks by multiplying queries and features from the pixel decoder. Due to the computational complexity of self attention [24], both DETR and MaskFormer use feature maps with limited spatial resolutions for panoptic segmentation,which hurts the performance and requires combining additional highresolution feature maps in final mask prediction. Unlike the methods mentioned above, our query decoupling strategy deals with things and stuff with separate query sets. Although thing and stuff queries are designed for different targets,they are processed by the mask decoder with the same workflow. Prediction results of these queries are in the same format so that we can process them in an equal manner during the post-processing procedure. One concurrent work [4] employs a similar line of thinking to use dynamic kernels to perform instance and semantic segmentation,and it aims to utilize unified kernels to handle various segmentation tasks. In contrast to it, we aim to delve deeper into the transformerbased panoptic segmentation.Due to the different nature of various tasks,whether a unified pipeline is suitable for these tasks is still an open problem. In this work,we utilize an additional location decoder to assist things to learn location clues and get better results.

End-to-end Object Detection. The recent popular endto-end object detection frameworks have inspired many other related works [13,25]. DETR [1] is arguably the most representative end-to-end object detector among these methods.DETR models the object detection task as a dictionary lookup problem with learnable queries and employs an encoder-decoder transformer to predict bounding boxes without extra post-processing.DETR greatly simplifies the conventional detection framework and removes many handcrafted components such as Non-Maximum Suppression (NMS) [26,27] and anchors [27]. Zhu et al.[12] proposed Deformable DETR,which further reduces the memory and computational cost through deformable attention layers.In this work,we adopt deformable attention [12] for the improved efficiency and convergence over DETR[1].

# 3. Methods

# 3.1. Overall Architecture

As illustrated in Fig.2, Panoptic SegFormer consists of three key modules: transformer encoder,location decoder, and mask decoder, where (1) the transformer encoder is applied to refine the multi-scale feature maps given by the backbone,(2) the location decoder is designed to capturing location clues of things,and (3) the mask decoder is for final classification and segmentation.

![](Images_J3PD2ISP/43934f5e8da166098ee60e5206aec5b45339c43295a93f6b0213df9d5762fa09.jpg)  
Figure 3. (a) Methods [1-3] adopt one query set to match things (purple squares) and stuff (green squares) jointly. (b) We use one thing query set (purple circles) to target things through bipartite matching and one stuff query set (green circles) to predict stuff by a class-fixed assign strategy. $\emptyset$ is assigned to not-matched queries.

Our architecture feeds an input image $X \in \mathbb { R } ^ { H \times W \times 3 }$ to the backbone network,and obtains the feature maps $C _ { 3 } , C _ { 4 }$ ， and $C _ { 5 }$ from the last three stages,of which the resolutions are $1 / 8$ ,1/16 and $1 / 3 2$ compared to the input image, respectively. We project the three feature maps to the ones with 256 channels by a fully-connected (FC) layer, and flatten them into feature tokens $C _ { 3 } ^ { \prime }$ ， $C _ { 4 } ^ { \prime }$ ,and $C _ { 5 } ^ { \prime }$ . Here, we define $L _ { i }$ as ${ \frac { H } { 2 ^ { i + 2 } } } \times { \frac { W } { 2 ^ { i + 2 } } }$ , and the shapes of $C _ { 3 } ^ { \prime } , C _ { 4 } ^ { \prime }$ and $C _ { 5 } ^ { \prime }$ are $L _ { 1 } \times 2 5 6$ ， $L _ { 2 } \times 2 5 6$ ,and $L _ { 3 } \times 2 5 6$ ,respectively. Next, using the concatenated feature tokens as input, the transformer encoder outputs the refined features of size $( L _ { 1 } + L _ { 2 } + L _ { 3 } ) { \times } 2 5 6$ After that, we use $N _ { \mathrm { t h } }$ and $N _ { \mathrm { s t } }$ randomly initialized things and stuff queries to describe things and stuff separately. Location decoder refines $N _ { \mathrm { t h } }$ thing queries by detecting the bounding boxes of things to capture location information. The mask decoder then takes both things and stuff queries as input and predicts mask and category at each layer.

During inference,we adopt a mask-wise merging strategy to convert the predicted masks from final mask decoder layer into the panoptic segmentation results,which will be introduced in detail in Sec.3.5.

# 3.2.Transformer Encoder

High-resolution and the multi-scale features maps are important for the segmentation tasks [7,21,28].Since the high computational cost of self-attention layer, previous transformer-based methods [1,3] can only process lowresolution feature maps (e.g., ResNet $C _ { 5 }$ )in their encoders, which limits the segmentation performance.Different from these methods,we employ the deformable attention [12] to implement our transformer encoder. Due to the low computational complexity of the deformable attention, our encoder can refine and involve positional encoding [24] to high-resolution and multi-scale feature maps $F$

# 3.3. Decoder

In this section, we introduce our query decoupling strategy firstly,and then we will explain the details of our location decoder and mask decoder.

# 3.3.1查询解耦策略

我们认为，使用一个查询集来同等处理可数物体和背景是次优的。由于它们之间存在许多不同的属性，可数物体和背景很可能相互干扰并损害模型性能，尤其是对于全景质量st。为了防止可数物体和背景相互干扰我们在全景分割变换器中应用了查询解耦策略，如图3所示。具体来说， $N _ { \mathrm { t h } }$ 物体查询用于预测可数物体的结果，而 $N _ { \mathrm { s t } }$ 背景查询仅针对背景。采用这种形式,物体查询和背景查询可以共享相同的处理流程，因为它们的格式相同。我们也可以根据不同任务的特点,为可数物体或背景定制私有的工作流程。在本工作中,我们使用一个额外的位置解码器来检测单个实例（使用物体查询），这将有助于区分不同的实例[6]。掩码解码器同时接受物体查询和背景查询，并生成最终的掩码和类别。请注意，对于物体查询，真实标注通过二分图匹配策略进行分配。对于背景，我们使用类别固定分配策略，每个背景查询对应一个背景类别。物体查询和背景查询将以相同的格式输出结果，我们使用统一的后处理方法处理这些结果。

# 3.3.2位置解码器

在全景分割任务中，位置信息在区分具有不同实例ID的可数物体方面起着重要作用 $[ 2 2 , 2 8 , 2 9 ] _ { \circ }$ 受此启发,我们采用一个位置解码器，将可数物体的位置信息引入到可学习的查询中。具体来说，给定 $N _ { \mathrm { t h } }$ 随机初始化的物体查询和由Transformer编码器生成的精炼特征令牌，该解码器将输出 $N _ { \mathrm { t h } }$ 位置感知查询。

在训练阶段，我们在位置感知查询之上应用一个辅助的多层感知机头，以预测目标对象的边界框和类别。我们使用检测损失 $\mathcal { L } _ { \mathrm { d e t } }$ 来监督预测结果。该多层感知机头是一个辅助分支，可以在推理阶段丢弃。位置解码器遵循可变形DETR[12]。值得注意的是，位置解码器可以通过预测掩码的质心而不是边界框来学习位置信息。这种无框模型仍然可以达到与我们基于框的模型相当的结果。

A∈RN×h×(L1+L2+L3）以及来自每个解码器层的精炼查询 $Q _ { \mathrm { r e f i n e } } ~ \in \mathbb { R } ^ { N \times { 2 5 6 } }$ ，其中 $N = N _ { \mathrm { t h } } + N _ { \mathrm { s t } }$ 是查询总数， $h$ 是注意力头数量， $L _ { 1 } + L _ { 2 } + L _ { 3 }$ 是特征令牌 $F$ 的长度。

与[1,2],等方法类似，我们直接在每个解码器层精炼后的查询 $Q _ { \mathrm { r e f i n } \epsilon }$ 之上通过一个全连接层进行分类。每个物体查询需要预测所有物体类别的概率。背景查询仅预测其对应背景类别的概率。

同时，为了预测掩码，我们首先将注意力图 $A$ 分割并重塑为注意力图 $A _ { 3 } ,$ $A _ { 4 }$ 和 $A _ { 5 }$ ，它们分别与 $C _ { 3 } { \mathrm { . } }$ $C _ { 4 }$ 和 $C _ { 5 }$ 具有相同的空间分辨率。此过程可表述为：

$$
\begin{array} { r } { ( A _ { 3 } , A _ { 4 } , A _ { 5 } ) = \mathrm { S p l i t } ( A ) , \quad A _ { i } \in \mathbb { R } ^ { \frac { H } { 2 ^ { i + 2 } } \times \frac { W } { 2 ^ { i + 2 } } \times h } , } \end{array}
$$

其中 $\operatorname { S p l i t } ( { \mathord { \cdot } } )$ 表示分割和重塑操作。之后，如公式(2)所示，我们将这些注意力图上采样到 $H / 8 { \times } W / 8$ 的分辨率，并沿通道维度进行拼接,

$$
A _ { \mathrm { f u s e d } } = \operatorname { C o n c a t } ( A _ { 1 } , \operatorname { U p } _ { \times 2 } ( A _ { 2 } ) , \operatorname { U p } _ { \times 4 } ( A _ { 3 } ) ) ,
$$

其中 $\mathrm { U p } { \times } 2 ( \cdot )$ 和 $\mathrm { U p } { \times } 4 ( \cdot )$ 分别表示2倍和4倍的双线性插值操作。Concat()是拼接操作。最后，基于融合后的注意力图 $A _ { \mathrm { f u s e d } }$ ，我们通过一个 $1 \times 1$ 卷积来预测二值掩码。

先前的研究[12]认为，DETR收敛缓慢的原因在于注意力模块会平等地关注特征图中的所有像素，而学习聚焦于稀疏的有意义位置需要大量努力。我们在掩码解码器中采用两个关键设计来解决此问题：(1)使用一个超轻量的全连接头从注意力图生成掩码，确保注意力模块能够被真实掩码引导以学习应聚焦于何处。该全连接头仅包含200个参数量，这保证了注意力图的语义信息与掩码高度相关。直观地说，真实掩码正是我们希望注意力模块聚焦的有意义区域。 (2)我们在掩码解码器中采用深度监督。每一层的注意力图都将受到掩码的监督，使得注意力模块能够在更早的阶段捕获有意义的信息。这可以极大地加速注意力模块的学习过程。

# 3.3.1Query Decoupling Strategy

We argue that using one query set to handle both things and stuff equally is suboptimal. Since there many different properties between them,things and stuf is likely to interfere with each other and hurt the model performance, especially for $\mathrm { P Q } ^ { \mathrm { s t } }$ . To prevent things and stuff from interfering with each other, we apply a query decoupling strategy in Panoptic SegFormer,as shown in Fig. 3. Specifically, $N _ { \mathrm { t h } }$ thing queries are used to predict things results, and $N _ { \mathrm { s t } }$ stuff queries target stuff only. Using this form,things and stuff queries can share the same pipeline since they are in the same format. We can also customize private workflow for things or stuff according to the characteristics of different tasks.In this work,we use an additional location decoder to detect individual instances with thing queries,and this will assist in distinguishing between different instances [6]. Mask decoder accepts both thing queries and stuff queries and generates the final masks and categories. Note that, for thing queries,ground truths are assigned by bipartite matching strategy. For stuff,We use a class-fixed assign strategy,and each stuff query corresponds to one stuff category. Thing and stuff queries will output results in the same format, and we handle these results with a uniform postprocessing method.

# 3.3.2 Location Decoder

Location information plays an important role in distinguishing things with different instance ids in the panoptic segmentation task [22,28,29]. Inspired by this,we employ a location decoder to introduce the location information of things into the learnable queries. Specifically，given $N _ { \mathrm { t h } }$ randomly initialized thing queries and the refined feature tokens generated by transformer encoder, the decoder will output $N _ { \mathrm { t h } }$ location-aware queries.

In the training phase, we apply an auxiliary MLP head on top of location-aware queries to predict the bounding boxes and categories of the target object,We supervise the prediction results with a detection loss $\mathcal { L } _ { \mathrm { d e t } }$ . The MLP head is an auxiliary branch,which can be discarded during the inference phase.The location decoder follows Deformable DETR [12]. Notably, the location decoder can learn location information by predicting the mass centers of masks instead of bounding boxes. This box-free model can still achieve comparable results to our box-based model.

$A \ \in \ \mathbb { R } ^ { N \times h \times ( L _ { 1 } + L _ { 2 } + L _ { 3 } ) }$ and the refined query $Q _ { \mathrm { r e f i n e } } \in$ $\mathbb { R } ^ { N \times 2 5 6 }$ from each decoder layer, where $N = N _ { \mathrm { t h } } + N _ { \mathrm { s t } }$ is the whole query number, $h$ is the number of attention heads, and $L _ { 1 } + L _ { 2 } + L _ { 3 }$ is the length of feature tokens $F$ .

Similar to methods [1,2], we directly perform classification through a FC layer on top of the refined query $Q _ { \mathrm { r e f i n e } }$ from each decoder layer. Each thing query needs to predict probabilities over all thing categories. Stuff query only predicts the probability of its corresponding stuff category.

At the same time, to predict the masks, we first split and reshape the attention maps $A$ into attention maps $A _ { 3 }$ ， $A _ { 4 }$ ， and $A _ { 5 }$ , which have the same spatial resolution as $C _ { 3 } , C _ { 4 }$ ， and $C _ { 5 }$ . This process can be formulated as:

$$
\begin{array} { r } { ( A _ { 3 } , A _ { 4 } , A _ { 5 } ) = \mathrm { S p l i t } ( A ) , \ : \ : \ : A _ { i } \in \mathbb { R } ^ { \frac { H } { 2 ^ { i + 2 } } \times \frac { W } { 2 ^ { i + 2 } } \times h } , } \end{array}
$$

where $\operatorname { S p l i t } ( \cdot )$ denotes the split and reshaping operation. After that, as illustrated in Eq. (2), we upsample these attention maps to the resolution of $H / 8 { \times } W / 8$ and concatenate them along the channel dimension,

$$
A _ { \mathrm { f u s e d } } = \operatorname { C o n c a t } ( A _ { 1 } , \operatorname { U p } _ { \times 2 } ( A _ { 2 } ) , \operatorname { U p } _ { \times 4 } ( A _ { 3 } ) ) ,
$$

where $\mathrm { U p } _ { \times 2 } ( \cdot )$ and $\mathrm { U p } _ { \times 4 } ( \cdot )$ mean the 2 times and 4 times bilinear interpolation operations,respectively. Concat(·) is the concatenation operation. Finally, based on the fused attention maps $A _ { \mathrm { f u s e d } }$ ,we predict the binary mask through a $1 \times 1$ convolution.

Previous literature [12] argues that the reason for slow convergence of DETR is that attention modules equally pay attention to all the pixels in the feature maps,and learning to focus on sparse meaningful locations requires plenty of effort. We use two key designs to solve this problem in our mask decoder: (1) Using an ultra-light FC head to generate masks from the attention maps,ensuring attention modules can be guided by ground truth mask to learn where to focus on. This FC head only contains 2OO parameters,which ensures the semantic information of attention maps is highly related to the mask. Intuitively, the ground truth mask is exactly the meaningful region on which we expect the attention module to focus.(2) We employ deep supervision in the mask decoder. Attention maps of each layer will be supervised by the mask, the attention module can capture meaningful information in the earlier stage.This can highly accelerate the learning process of attention modules.

# 3.3.3掩码解码器

如图2 (d)所示，掩码解码器被提出来根据给定的查询预测类别和掩码。掩码解码器的查询 $Q$ 是来自位置解码器的位置感知物体查询或类别固定的背景查询。掩码解码器的键向量 $K$ 和值向量 $V$ 是从Transformer编码器精炼后的特征令牌 $F$ 投影得到的。我们首先将物体查询通过掩码解码器，然后获取注意力图

# 3.4.损失函数

在训练期间，我们的全景分割变换器的总体损失函数可以写为：

物体损失。遵循常见做法[1,30],，我们在预测集与真实标注集之间搜索最佳的二分匹配。

$$
\mathcal { L } = \lambda _ { \mathrm { t h i n g s } } \mathcal { L } _ { \mathrm { t h i n g s } } + \lambda _ { \mathrm { s t u f f } } \mathcal { L } _ { \mathrm { s t u f f } } ,
$$

其中 $L _ { \mathrm { t h i n g s } }$ 和 $L _ { \mathrm { s t u f f } }$ 分别是针对可数物体和背景的损失。  
$\lambda _ { \mathrm { t h i n g s } }$ 和 $\lambda _ { \mathrm { s t u f f } }$ 是超参数。

# 3.3.3Mask Decoder

As shown in Fig. 2 (d), the mask decoder is proposed to predict the categories and masks according to the given queries. The queries $Q$ of the mask decoder are the locationaware thing queries from the location decoder or the classfixed stuff queries. The keys $K$ and values $V$ of the mask decoder are projected from the refined feature tokens $F$ from the transformer encoder. We first pass thing queries through the mask decoder, and then fetch the attention map

# 3.4. Loss Function

During training,our overall loss function of Panoptic SegFormer can be written as:

$$
\mathcal { L } = \lambda _ { \mathrm { t h i n g s } } \mathcal { L } _ { \mathrm { t h i n g s } } + \lambda _ { \mathrm { s t u f f } } \mathcal { L } _ { \mathrm { s t u f f } } ,
$$

where $L _ { \mathrm { t h i n g s } }$ and $L _ { \mathrm { s t u f f } }$ are loss for things and stuff, separately. $\lambda _ { \mathrm { t h i n g s } }$ and $\lambda _ { \mathrm { s t u f f } }$ are hyperparameters.

Things Loss. Following common practices [1,30], wesearch the best bipartite matching between the prediction具体而言，我们利用匈牙利算法[31]来搜索具有最小匹配成本的排列，该成本是分类损失 ${ \mathcal { L } } _ { \mathrm { c l s } }$ 检测损失${ \mathcal { L } } _ { \mathrm { d e t } }$ 与分割损失 $\mathcal { L } _ { \mathrm { s e g } }$ 的总和。因此，物体类别的总体损失函数定义如下：

$\mathcal { L } _ { \mathrm { t h i n g s } } = \lambda _ { \mathrm { d e t } } \mathcal { L } _ { \mathrm { d e t } } + \sum _ { i } ^ { D _ { m } } { ( \lambda _ { \mathrm { c l s } } \mathcal { L } _ { \mathrm { c l s } } ^ { i } + \lambda _ { \mathrm { s e g } } \mathcal { L } _ { \mathrm { s e g } } ^ { i } ) } ,$ (4其中 $\lambda _ { \mathrm { c l s } }$ $\lambda _ { \mathrm { s e g } }$ 和 $\lambda _ { \mathrm { l o c } }$ 是用于平衡三种损失的权重。$D _ { m }$ 是掩码解码器中的层数。 $\mathcal { L } _ { \mathrm { c l s } } ^ { i }$ 是由Focal损失[27]，实现的分类损失，而 $\mathcal { L } _ { \mathrm { s e g } } ^ { i }$ 是由Dice 损失 [32]实现的分割损失。 $\mathcal { L } _ { \mathrm { d e t } }$ 是用于执行检测的可变形DETR 的损失。

背景损失。我们对背景使用固定的匹配策略。因此，背景查询与背景类别之间存在一一对应的映射关系。背景类别的损失定义类似如下：

$$
\mathcal { L } _ { \mathrm { s t u f f } } = \sum _ { i } ^ { D _ { m } } { ( \lambda _ { \mathrm { c l s } } \mathcal { L } _ { \mathrm { c l s } } ^ { i } + \lambda _ { \mathrm { s e g } } \mathcal { L } _ { \mathrm { s e g } } ^ { i } ) } ,
$$

其中 $\mathcal { L } _ { \mathrm { c l s } } ^ { i }$ 和 $\mathcal { L } _ { \mathrm { s e g } } ^ { i }$ 与公式(4)中的相同。

# 3.5.掩码级合并推理

全景分割要求为每个像素分配一个类别标签（或空值）和实例ID（对于背景则忽略）[6]。全景分割的一个挑战在于它要求生成非重叠的结果。最近的方法[1-3]直接使用像素级argmax来确定每个像素的归属，这可以自然地解决重叠问题。尽管像素级argmax策略简单有效，但我们观察到，由于异常的像素值，它总是会产生假阳性结果。

与像素级Argmax在每个像素上解决冲突不同，我们提出掩码级合并策略，通过重新解决预测掩码之间的冲突。具体而言，我们使用掩码的置信度分数来确定重叠区域的归属。受先前NMS方法[28],的启发,置信度分数同时考虑了分类概率和预测掩码质量。第i个结果的置信度分数可表述为：

$s _ { i } = p _ { i } ^ { \alpha } \times \mathrm { a v e r a g e } \big ( \mathbb { 1 } _ { \{ m _ { i } [ h , w ] > 0 . 5 \} } m _ { i } [ h , w ] \big ) ^ { \beta } ,$ (6)其中 $p _ { i }$ 是第i个结果最可能的类别概率。 $m _ { i } [ h , w ]$ 是像素 $[ h , w ]$ 处的掩码逻辑值， $\alpha , \beta$ 用于平衡分类概率和分割质量的权重。

如算法1所示，掩码级合并策略以 $c _ { \mathrm { > } }$ s和 $m$ 作为输入，分别表示预测的类别、置信度分数和分割掩码。它输出一个语义掩码SemMsk 和一个实例ID掩码IdMsk，为每个像素分配一个类别标签和一个实例ID。具体来说，SemMsk 和IdMsk 首先

# 算法1：掩码级合并

<table><tr><td>def MaskWiseMergeing(c,s,m) : #类别C∈RN #置信度分数Ｓ∈RN #掩码m ∈RNXHxW 语义掩码 = np.zeros(H,W) ID掩码 = np.zeros(H,W) 顺序= np.argsort(-s) id = 0 对于i按顺序: mi=m[i]&gt;0.5&amp;(语义掩码==0) 如果s[i]&lt;tcnf 或 &lt; tkeep: m[i]&gt;0.5 继续 语义掩码[mi]= c[i] ID掩码[mi]= id 编号+= 1 五兴梳到</td></tr></table>

返回语义掩码 ，ID掩码

初始化为零。然后，我们按置信度分数降序对预测结果进行排序，并按顺序将排序后的预测掩码填充到SemMsk和IdMsk中。接着，我们丢弃置信度分数低于tcls的结果，并移除与较低置信度分数重叠的部分。只有保留的、与原始掩码有足够比例tkeep 的非重叠部分才会被保留。最后，添加每个掩码的类别标签和唯一ID，以生成无重叠的全景格式结果。

# 4.实验

我们在COCO数据集和ADE20K数据集上评估了全景分割变换器，并将其与多种先进方法进行比较。我们提供了全景分割和实例分割的主要结果，同时进行了详细的消融研究以验证各模块的效果。具体实现细节请参阅附录。

# 4.1.数据集

我们在COCO2017数据集上进行了实验[11]，未使用外部数据。COCO数据集包含118K张训练图像和5K张验证图像，其中包含80类可数物体和53类背景。我们进一步在ADE20K数据集上验证了模型的通用性[33],，该数据集包含100类可数物体和50类背景。

# 4.2.主要结果

全景分割。我们在COCO数据集验证集和测试开发集上进行实验。在表1和表2中，我们报告了主要结果，并与其他最先进的方法进行了比较。全景分割变换器以ResNet-50作为骨干网络和单尺度输入，在COCO数据集验证集上取得了 $4 9 . 6 \%$ 的全景质量，并且分别超越了先前的方法K-Net[4]和DETR[1]超过2.5%和 $1 6 . 2 \%$ 的全景质量。除了卓越的性能外,

set and the ground truth set. Specifically,we utilize Hungarian algorithm [31] to search for the permutation with the minimum matching cost, which is the sum of the classification loss $\mathcal { L } _ { \mathrm { c l s } }$ ,detection loss $\mathcal { L } _ { \mathrm { d e t } }$ and the segmentation loss $\mathcal { L } _ { \mathrm { s e g } }$ . The overall loss function for the thing categories is accordingly defined as follows:

$$
\mathcal { L } _ { \mathrm { t h i n g s } } = \lambda _ { \mathrm { d e t } } \mathcal { L } _ { \mathrm { d e t } } + \sum _ { i } ^ { D _ { m } } { ( \lambda _ { \mathrm { c l s } } \mathcal { L } _ { \mathrm { c l s } } ^ { i } + \lambda _ { \mathrm { s e g } } \mathcal { L } _ { \mathrm { s e g } } ^ { i } ) } ,
$$

where $\lambda _ { \mathrm { c l s } } , \lambda _ { \mathrm { s e g } }$ ,and $\lambda _ { \mathrm { l o c } }$ are the weights to balance three losses. $D _ { m }$ is the number of layers in the mask decoder. $\mathcal { L } _ { \mathrm { c l s } } ^ { i }$ is theclassifcationostatisimplementedbyFocal loss[27], and $\mathcal { L } _ { \mathrm { s e g } } ^ { i }$ is hesegmentationossimplemented by Dice loss [32]. $\dot { \mathcal { L } _ { \mathrm { d e t } } }$ is the loss of Deformable DETR that used to perform detection.

Stuff Loss. We use a fixed matching strategy for stuff. Thus there is a one-to-one mapping between stuff queries and stuff categories. The loss for the stuff categories is similarly defined as:

$$
\mathcal { L } _ { \mathrm { s t u f f } } = \sum _ { i } ^ { D _ { m } } { ( \lambda _ { \mathrm { c l s } } \mathcal { L } _ { \mathrm { c l s } } ^ { i } + \lambda _ { \mathrm { s e g } } \mathcal { L } _ { \mathrm { s e g } } ^ { i } ) } ,
$$

where $\mathcal { L } _ { \mathrm { c l s } } ^ { i }$ and Cseg are the same as those in Eq. (4).

# 3.5. Mask-Wise Merging Inference

Panoptic Segmentation requires each pixel to be assigned a category label (or void) and instance id (ignored for stuff) [6]. One challenge of panoptic segmentation is that it requires generating non-overlap results. Recent methods [1-3] directly use pixel-wise argmax to determine the attribution of each pixel,and this can solve the overlap problem naturally. Although pixel-wise argmax strategy is simple and effective,we observe that it consistently produces false-positive results due to the abnormal pixel values.

Unlike pixel-wise argmax resolves conflicts on each pixel,we propose the mask-wise merging strategy by resolving the conflicts among predicted masks. Specifically, we use the confidence scores of masks to determine the attribution of the overlap region.Inspired by previous NMS methods [28], the confidence scores take into both classifcation probability and predicted mask qualities.The confidence score of the i-th result can be formulated as:

$$
s _ { i } = p _ { i } ^ { \alpha } \times \mathrm { a v e r a g e } \big ( \mathbb { 1 } _ { \{ m _ { i } [ h , w ] > 0 . 5 \} } m _ { i } [ h , w ] \big ) ^ { \beta } ,
$$

where $p _ { i }$ is the most likely class probability of i-th result. $m _ { i } [ h , w ]$ is the mask logit at pixel $[ h , w ] , \alpha , \beta$ are used to balance the weight of classification probability and segmentation qualities.

As illustrated in Algorithm 1, mask-wise merging strategy takes $c , s ,$ and $m$ as input, denoting the predicted categories,confidence scores,and segmentation masks, respectively.It outputs a semantic mask SemMsk and an instance id mask IdMsk, to assign a category label and an instance id to each pixel. Specifically, SemMsk and IdMsk are first initialized by zeros. Then,we sort prediction results in descending order of confidence score and fill the sorted predicted masks into SemMsk and IdMsk in order. Then we discard the results with confidence scores below $\mathrm { { t _ { c l s } } }$ and remove the overlaps with lower confidence scores. Only remained non-overlap part with a sufficient fraction $\mathrm { { t } _ { k e e p } }$ to origin mask will be kept. Finally, the category label and unique id of each mask are added to generate non-overlap panoptic format results.

Algorithm 1: Mask-Wise Merging   

<table><tr><td>def MaskWiseMergeing g(c,s,m): # category c∈RN # confidence score s ERN # mask m∈ RNxHxw SemMsk = np.zeros(H,W) IdMsk = np.zeros (H,W) order = np.argsort(-s) id=0 for i in order: mi = m[i]&gt;0.5 &amp; (SemMsk==0) if s[i]&lt; tcnf Or continue SemMsk[mi]= c[i] IdMsk[mi] = id id += 1 return SemMsk,IdMsk</td></tr></table>

# 4. Experiments

We evaluate Panoptic SegFormer on COCO [11] and ADE2OK dataset [33],comparing it with several state-ofthe-art methods. We provide the main results of panoptic segmentation and instance segmentation. We also conduct detailed ablation studies to verify the effects of each module.Please refer to Appendix for implementation details.

# 4.1. Dataset

We perform experiments on COCO 2017 datasets [11] without external data. The COCO dataset contains 118K training images and 5k validation images,and it contains 80 things and 53 stuff. We further demonstrate the generality of our model on the ADE2OK dataset [33], which contains 100 things and 50 stuff.

# 4.2.Main Results

Panoptic segmentation. We conduct experiments on COCO val set and test-dev set. In Tab.1 and Tab. 2, we report our main results, comparing with other state-ofthe-art methods.Panoptic SegFormer attains $4 9 . 6 \%$ PQ on COCO val with ResNet-5O as the backbone and singlescale input, and it surpasses previous methods K-Net [4] and DETR[1] over $2 . 5 \%$ PQ and $6 . 2 \%$ PQ, respectively. Except for the remarkable performance,the training of 表1.在COCO 验证集上的实验。#P和 #F分别表示参数量(M)和 浮点运算次数(G)。全景分割变换器 (R50)在COCO 验证集上取得 了 $4 9 . 6 \%$ 的全景质量，超越了之前的方法，如DETR[1]和 MaskFormer[3]，分别高出 $6 . 2 \%$ 全景质量和 $3 . 1 \%$ 全景质量。 $^ \dagger$ 表示骨干网络是在ImageNet-22K上预训练的。

<table><tr><td>骨干网络训练轮次全景质量PQthPQst</td></tr><tr><td>方法 全景特征金字塔网络[7]</td><td></td><td>41.5 48.5</td><td></td><td>#P</td><td>#F</td></tr><tr><td>SOLOv2[28]</td><td>R50 R50</td><td>36 36</td><td>42.149.6</td><td>31.1 30.7</td><td>=</td><td>- -</td></tr><tr><td>DETR[1]</td><td>R50</td><td>325</td><td>43.4 48.2</td><td>36.3</td><td>42.9</td><td>248</td></tr><tr><td>全景FCN[21]</td><td>R50</td><td>36</td><td>43.6 49.3</td><td>35.0</td><td>37.0</td><td>244</td></tr><tr><td>K-Net [4]</td><td>R50</td><td>36</td><td>47.151.7</td><td>40.3</td><td>=</td><td>-</td></tr><tr><td>MaskFormer [3]</td><td>R50</td><td>300</td><td>46.5 51.0</td><td>39.8</td><td>45.0</td><td>181</td></tr><tr><td>全景分割变换器</td><td>R50</td><td>12</td><td>48.0 52.3</td><td>41.5</td><td>51.0</td><td>214</td></tr><tr><td>全景分割变换器</td><td>R50</td><td>24</td><td>49.6 54.4</td><td>42.4</td><td>51.0</td><td>214</td></tr><tr><td>DETR[1]</td><td>R101</td><td>325</td><td>45.150.5</td><td>37.0</td><td>61.8</td><td>306</td></tr><tr><td>Max-Deeplab-S [2]</td><td>Max-S [2]</td><td>54</td><td>48.4 53.0 41.5</td><td></td><td>61.9</td><td>162</td></tr><tr><td>MaskFormer [3]</td><td>R101</td><td>300</td><td>47.6 52.5 40.3</td><td></td><td>64.0</td><td>248</td></tr><tr><td>全景分割变换器</td><td>R101</td><td>24</td><td>50.6 55.5</td><td>43.2</td><td>69.9</td><td>286</td></tr><tr><td>Max-Deeplab-L [2] Max-L [2]</td><td></td><td>54</td><td>51.157.0</td><td></td><td>42.2 451.0 1846</td><td></td></tr><tr><td>全景FCN[36]</td><td>Swin-L</td><td>36</td><td>51.8 58.6</td><td>41.6--</td><td></td><td></td></tr><tr><td>MaskFormer [3]</td><td>Swin-L†</td><td>300</td><td>52.7 58.5</td><td></td><td>44.0 212.0 792</td><td></td></tr><tr><td></td><td>Swin-L+</td><td>36</td><td>54.6 60.2</td><td></td><td>46.0 208.9-</td><td></td></tr><tr><td>K-Net [4]</td><td></td><td>24</td><td>55.8 61.7</td><td></td><td></td><td></td></tr><tr><td>全景分割变换器 Swin-L 全景分割变换器 PVTv2-B5t</td><td></td><td>24</td><td>55.4 61.2</td><td></td><td>46.9221.4 816 46.6 104.9 349</td><td></td></tr></table>

表5.我们将DETR的全景分割性能[1](R50[23])从43.4%PQ提升至 $4 9 . 6 \%$ PQ，同时训练轮次更少、计算成本更低、推理速度更快。

在表4中，我们报告了在COCO数据集test-dev 集上的实例分割结果。我们取得了与当前最先进的方法(如QueryInst[13]和HTC[14],）相当的结果，并且比K-Net[4]高出 $1 . 8 \mathrm { A P _ { o } }$ 在训练期间使用随机裁剪将AP提升了1.3个百分点。

全景分割变换器是高效的。在1×训练策略（12个训练轮次）下,全景分割变换器（R50）取得了 $4 8 . 0 \%$ 的全景质量，这比训练了300个训练轮次的MaskFormer[3]高出1.5%的全景质量。通过视觉变换器骨干网络Swin-L增强后[34],，全景分割变换器在COCO数据集测试开发集上取得了 $5 6 . 2 \%$ 的全景质量的新记录，无需任何额外技巧，超越了MaskFormer[3]超过2.9%的全景质量。我们的方法甚至超越了先前的竞赛级方法Innovation[35超过2.7%的全景质量。通过采用PVTv2-B5[5],，我们也获得了可比的性能，同时与Swin-L相比，模型参数量和浮点运算次数显著减少。全景分割变换器在ADE20K数据集上也比MaskFormer高出1.7%的全景质量[33],，见表3。

<table><tr><td>方法</td><td>骨干网络</td><td>PQ</td><td>全景质量全景质量“t</td><td>SQ</td></tr><tr><td>BGRNet [37]</td><td>R50 31.8</td><td></td><td></td><td></td></tr><tr><td>自动全景分割[38]</td><td>ShuffleNetV2 [39]</td><td>32.4</td><td></td><td></td></tr><tr><td>MaskFormer [3]</td><td>R50 34.7</td><td>32.2</td><td></td><td>39.776.742.8</td></tr><tr><td>MaskFormer [3]</td><td>R10135.7</td><td>34.5</td><td></td><td>38.0 77.4 43.8</td></tr><tr><td>全景分割变换器</td><td>R50</td><td>36.435.3</td><td></td><td>38.678.0 44.9</td></tr></table>

Ta表3.ADE20K数据集验证集上的全景分割结果set.

# 4.3.消融研究

<table><tr><td></td><td>训练轮次</td><td>PQ</td><td>参数量</td><td>浮点运算次数</td><td>FPS</td></tr><tr><td>基线 (DETR[1])</td><td>325</td><td>43.4</td><td>42.9M</td><td>247.5G</td><td>4.9</td></tr><tr><td>+掩码级合并</td><td>325</td><td>44.7</td><td>42.9M</td><td>247.5G</td><td>6.1</td></tr><tr><td>++多尺度可变形注意力[12]</td><td>50</td><td>47.3</td><td>44.9M</td><td>618.7G</td><td>2.7</td></tr><tr><td>+++掩码解码器</td><td>24</td><td>48.5</td><td>51.0M</td><td>214.8G</td><td>7.8</td></tr><tr><td>++++查询解藕</td><td>24</td><td>49.6</td><td>51.0M</td><td>214.2G</td><td>7.8</td></tr></table>

表4.COCO测试开发集上的实例分割。  

<table><tr><td>方法</td><td>骨干网络</td><td>平均精度*08</td><td>平均精度</td><td>平均精度</td><td>平均精度</td></tr><tr><td>掩码区域卷积神经网络[40]</td><td>R50</td><td>37.5</td><td>21.1</td><td>39.6</td><td>48.3</td></tr><tr><td>SOLOv2 [28]</td><td>R50</td><td>38.8</td><td>16.5</td><td>41.7</td><td>56.2</td></tr><tr><td>K-Net [4]</td><td>R50</td><td>38.6</td><td>19.1</td><td>42.0</td><td>57.7</td></tr><tr><td>SOLQ [25]</td><td>R50</td><td>39.7</td><td>21.5</td><td>42.5</td><td>53.1</td></tr><tr><td>HTC[14]</td><td>R50</td><td>39.7</td><td>22.6</td><td>42.2</td><td>50.6</td></tr><tr><td>QueryInst [13]</td><td>R50</td><td>40.6</td><td>23.4</td><td>42.5</td><td>52.8</td></tr><tr><td>我们的方法 (无裁剪)</td><td>R50</td><td>40.4</td><td>21.1</td><td>43.8</td><td>54.7</td></tr><tr><td>我们的方法 (带裁剪)</td><td>R50</td><td>41.7</td><td>21.9</td><td>45.3</td><td>56.3</td></tr></table>

首先，我们在表5中展示每个模块的效果。与基线DETR相比，我们的模型实现了更好的性能、更快的推理速度，并显著减少了训练轮次。我们默认使用全景分割变换器 (R50)进行消融实验。

<table><tr><td>方法</td><td>骨干网络</td><td>PQ</td><td>PQth</td><td>PQst</td><td>sQ RQ</td></tr><tr><td>Max-Deeplab-L [2]</td><td>Max-L [2]</td><td>51.3</td><td>57.2</td><td>42.4</td><td>82.5 61.3</td></tr><tr><td>创新方法[35]</td><td>集成，</td><td>53.5</td><td>61.8</td><td>41.1</td><td>83.463.3</td></tr><tr><td>MaskFormer [3]</td><td>Swin-L+</td><td>53.3</td><td>59.1</td><td>44.5</td><td>82.0 64.1</td></tr><tr><td>K-Net [4]</td><td>Swin-L†</td><td>55.2</td><td>61.2</td><td>46.2</td><td>82.4 66.1</td></tr><tr><td>全景分割变换器</td><td>R50</td><td>50.2</td><td>55.3</td><td>42.4</td><td>81.9 60.4</td></tr><tr><td>全景分割变换器</td><td>R101</td><td>50.9</td><td>56.2</td><td>43.0</td><td>82.0 61.2</td></tr><tr><td>全景分割变换器</td><td>Swin-L+</td><td>56.2</td><td>62.3</td><td>47.0</td><td>82.8 67.1</td></tr><tr><td>全景分割变换器 PVTv2-B5t</td><td></td><td>55.8</td><td>61.9</td><td>46.5</td><td>83.0 66.5</td></tr></table>

表2.在COCO测试开发集上的实验。†表示骨干网络在ImageNet-22K上进行了预训练。

位置解码器的影响。位置解码器协助查询捕获可数物体的位置信息。表6展示了改变位置解码器中层数的结果。

实例分割。全景分割变换器只需丢弃背景查询即可转换为实例分割模型。

<table><tr><td>#层</td><td>PQ</td><td>PQth</td><td>PQst</td></tr><tr><td>0</td><td>47.0</td><td>50.0</td><td>42.5</td></tr><tr><td>1</td><td>47.7</td><td>51.1</td><td>42.5</td></tr><tr><td>2</td><td>48.1</td><td>51.8</td><td>42.5</td></tr><tr><td>6*(无框)</td><td>49.2</td><td>53.5</td><td>42.6</td></tr><tr><td>6</td><td>49.6</td><td>54.4</td><td>42.4</td></tr></table>

表6.消融位置解码器。

当位置解码器层数较少时，我们的模型在可数物体上表现更差，这表明通过位置解码器学习位置线索有助于模型更好地处理可数物体。\*注：我们在位置解码器中预测的是质心而非边界框，这种无框模型取得了可比的结果（ $4 9 . 2 \%$ PQ对比 $4 9 . 6 \%$ PQ)

掩码级合并。如表格7所示，我们在多种模型上将我们的掩码级合并策略与像素级argmax策略进行了比较。我们同时使用掩码全景质量和边界全景质量[41]以使我们的结论更具可信度。采用掩码级合并策略的模型始终表现更优。采用掩码级合并的DETR比原始DETR在PQ上高出 $1 . 3 \%$ [1]。此外，我们的掩码级合并比DETR的像素级argmax耗时少$2 0 \%$ ，因为DETR在其代码中使用了更多技巧，例如合并具有相同类别的背景以及迭代地移除

Table 1.Experiments on COCO val set. #P and #F indicate number of parameters (M) and number of FLOPs (G). Panoptic SegFormer (R50)achieves $4 9 . 6 \%$ PQ on COCO val, surpassing previous methods such as DETR[1] and MaskFormer[3] over $6 . 2 \%$ PQ and $3 . 1 \%$ PQ respectively. † notes that backbones are pretrained on ImageNet-22K.   

<table><tr><td>Method</td><td>Backbone</td><td>Epochs</td><td>PQ</td><td>PQth</td><td>PQst</td><td>#P</td><td>#F</td></tr><tr><td>Panoptic FPN [7]</td><td>R50</td><td>36</td><td>41.5</td><td>48.5</td><td>31.1</td><td>1</td><td>-</td></tr><tr><td>SOLOv2 [28]</td><td>R50</td><td>36</td><td>42.1</td><td>49.6</td><td>30.7</td><td>1</td><td>-</td></tr><tr><td>DETR[1]</td><td>R50</td><td>325</td><td>43.4</td><td>48.2</td><td>36.3</td><td>42.9</td><td>248</td></tr><tr><td>Panoptic FCN [21]</td><td>R50</td><td>36</td><td>43.6</td><td>49.3</td><td>35.0</td><td>37.0</td><td>244</td></tr><tr><td>K-Net [4]</td><td>R50</td><td>36</td><td>47.1</td><td>51.7</td><td>40.3</td><td>-</td><td>1</td></tr><tr><td>MaskFormer[3]</td><td>R50</td><td>300</td><td>46.5</td><td>51.0</td><td>39.8</td><td>45.0</td><td>181</td></tr><tr><td>Panoptic SegFormer</td><td>R50</td><td>12</td><td>48.0</td><td>52.3</td><td>41.5</td><td>51.0</td><td>214</td></tr><tr><td>Panoptic SegFormer</td><td>R50</td><td>24</td><td>49.6</td><td>54.4</td><td>42.4</td><td>51.0</td><td>214</td></tr><tr><td>DETR[1]</td><td>R101</td><td>325</td><td>45.1</td><td>50.5</td><td>37.0</td><td>61.8</td><td>306</td></tr><tr><td>Max-Deeplab-S [2]</td><td>Max-S [2]</td><td>54</td><td>48.4</td><td>53.0</td><td>41.5</td><td>61.9</td><td>162</td></tr><tr><td>MaskFormer [3]</td><td>R101</td><td>300</td><td>47.6</td><td>52.5</td><td>40.3</td><td>64.0</td><td>248</td></tr><tr><td>Panoptic SegFormer</td><td>R101</td><td>24</td><td>50.6</td><td>55.5</td><td>43.2</td><td>69.9</td><td>286</td></tr><tr><td>Max-Deeplab-L [2]</td><td>Max-L [2]</td><td>54</td><td>51.1</td><td>57.0</td><td>42.2</td><td>451.0</td><td>1846</td></tr><tr><td>Panoptic FCN [36]</td><td>Swin-L</td><td>36</td><td>51.8</td><td>58.6</td><td>41.6</td><td>-</td><td>-</td></tr><tr><td>MaskFormer [3]</td><td>Swin-L</td><td>300</td><td>52.7</td><td>58.5</td><td>44.0</td><td>212.0</td><td>792</td></tr><tr><td>K-Net [4]</td><td>Swin-L</td><td>36</td><td>54.6</td><td>60.2</td><td>46.0</td><td>208.9</td><td>-</td></tr><tr><td>Panoptic SegFormer</td><td>Swin-L+</td><td>24</td><td>55.8</td><td>61.7</td><td>46.9</td><td>221.4</td><td>816</td></tr><tr><td>Panoptic SegFormer</td><td>：PVTv2-B5†</td><td>24</td><td>55.4</td><td>61.2</td><td>46.6</td><td>104.9</td><td>349</td></tr></table>

Table 2.Experiments on COCO test-dev set.† notes that backbones are pre-trained on ImageNet-22K.   

<table><tr><td>Method</td><td>Backbone</td><td>PQ</td><td>PQth</td><td>PQst</td><td>SQ</td><td>RQ</td></tr><tr><td>Max-Deeplab-L [2]</td><td>Max-L [2]</td><td>51.3</td><td>57.2</td><td>42.4</td><td>82.5</td><td>61.3</td></tr><tr><td>Innovation [35]</td><td>ensemble</td><td>53.5</td><td>61.8</td><td>41.1</td><td>83.4</td><td>63.3</td></tr><tr><td>MaskFormer [3]</td><td>Swin-L</td><td>53.3</td><td>59.1</td><td>44.5</td><td>82.0</td><td>64.1</td></tr><tr><td>K-Net [4]</td><td>Swin-L†</td><td>55.2</td><td>61.2</td><td>46.2</td><td>82.4</td><td>66.1</td></tr><tr><td>Panoptic SegFormer</td><td>R50</td><td>50.2</td><td>55.3</td><td>42.4</td><td>81.9</td><td>60.4</td></tr><tr><td>Panoptic SegFormer</td><td>R101</td><td>50.9</td><td>56.2</td><td>43.0</td><td>82.0</td><td>61.2</td></tr><tr><td>Panoptic SegFormer</td><td>Swin-L</td><td>56.2</td><td>62.3</td><td>47.0</td><td>82.8</td><td>67.1</td></tr><tr><td>Panoptic SegFormer</td><td>PVTv2-B5†</td><td>55.8</td><td>61.9</td><td>46.5</td><td>83.0</td><td>66.5</td></tr></table>

<table><tr><td></td><td>Epochs</td><td>PQ</td><td>#Params</td><td>FLOPs</td><td>FPS</td></tr><tr><td>baseline (DETR [1])</td><td>325</td><td>43.4</td><td>42.9M</td><td>247.5G</td><td>4.9</td></tr><tr><td>+ mask-wise merging</td><td>325</td><td>44.7</td><td>42.9M</td><td>247.5G</td><td>6.1</td></tr><tr><td>++ ms deformable attention [12]</td><td>50</td><td>47.3</td><td>44.9M</td><td>618.7G</td><td>2.7</td></tr><tr><td>+++ mask decoder</td><td>24</td><td>48.5</td><td>51.0M</td><td>214.8G</td><td>7.8</td></tr><tr><td>++++ query decoupling</td><td>24</td><td>49.6</td><td>51.0M</td><td>214.2G</td><td>7.8</td></tr></table>

Table 4. Instance segmentation on COCO te st-dev set.   

<table><tr><td>Method</td><td>Backbone</td><td>Apseg</td><td>APsg</td><td>AP M</td><td>APg</td></tr><tr><td>Mask R-CNN [40]</td><td>R50</td><td>37.5</td><td>21.1</td><td>39.6</td><td>48.3</td></tr><tr><td>SOLOv2 [28]</td><td>R50</td><td>38.8</td><td>16.5</td><td>41.7</td><td>56.2</td></tr><tr><td>K-Net [4]</td><td>R50</td><td>38.6</td><td>19.1</td><td>42.0</td><td>57.7</td></tr><tr><td>SOLQ[25]</td><td>R50</td><td>39.7</td><td>21.5</td><td>42.5</td><td>53.1</td></tr><tr><td>HTC[14]</td><td>R50</td><td>39.7</td><td>22.6</td><td>42.2</td><td>50.6</td></tr><tr><td>QueryInst [13]</td><td>R50</td><td>40.6</td><td>23.4</td><td>42.5</td><td>52.8</td></tr><tr><td>Ours (w/o crop)</td><td>R50</td><td>40.4</td><td>21.1</td><td>43.8</td><td>54.7</td></tr><tr><td>Ours (w/ crop)</td><td>R50</td><td>41.7</td><td>21.9</td><td>45.3</td><td>56.3</td></tr></table>

Table 3.Panoptic segmentation results on ADE2OK val set.   

<table><tr><td>Method</td><td>Backbone</td><td>PQ</td><td>PQth</td><td>PQst</td><td>SQ</td><td>RQ</td></tr><tr><td>BGRNet[37]</td><td>R50</td><td>31.8</td><td>-</td><td></td><td>-</td><td>-</td></tr><tr><td>Auto-Panoptic [38]</td><td>ShuffleNetV2 [39]</td><td>32.4</td><td>-</td><td>-</td><td>-</td><td>-</td></tr><tr><td>MaskFormer [3]</td><td>R50</td><td>34.7</td><td>32.2</td><td>39.7</td><td>76.7</td><td>42.8</td></tr><tr><td>MaskFormer [3]</td><td>R101</td><td>35.7</td><td>34.5</td><td>38.0</td><td>77.4</td><td>43.8</td></tr><tr><td>Panoptic SegFormer</td><td>R50</td><td>36.4</td><td>35.3</td><td>38.6</td><td>78.0</td><td>44.9</td></tr></table>

Panoptic SegFormer is efficient. Under $1 \times$ training strategy (12 epochs),Panoptic SegFormer (R5O) achieves $4 8 . 0 \%$ PQ that outperforms MaskFormer [3] that training 3OO epochs by $1 . 5 \%$ PQ.Enhanced by vision transformer backbone Swin-L [34], Panoptic SegFormer attains a new record of $5 6 . 2 \%$ PQ on COCO test-dev without bells and whistles, surpassing MaskFormer[3] over $2 . 9 \%$ PQ. Our method even surpasses the previous competition-level method Innovation [35] over $2 . 7 ~ \%$ PQ.We also obtain comparable performance by employing PVTv2-B5 [5], while the model parameters and FLOPs are reduced significantly compared to Swin-L. Panoptic SegFormer also outperforms MaskFormer by $1 . 7 \%$ PQ on ADE20K dataset [33], see Tab. 3.

Instance segmentation. Panoptic SegFormer can be converted to an instance segmentation model by just dis

Table 5.We increase the panoptic segmentation performance of DETR[1](R50 [23]) from $4 3 . 4 \%$ PQ to $4 9 . 6 \%$ PQ with fewer training epochs,less computation cost,and faster inference speed.

carding stuf queries. In Tab. 4, we report our instance segmentation results on COCO test-dev set. We achieve results comparable to the current state-of-the-art methods such as QueryInst [13] and HTC [14],and $1 . 8 \mathrm { \ A P }$ higher than K-Net [4]. Using random crops during training boosts the AP by 1.3 percentage points.

# 4.3. Ablation Studies

First, we show the effect of each module in Tab.5. Compared to baseline DETR,our model achieves better performance,faster inference speed and significantly reduces the training epochs. We use Panoptic SegFormer (R5O) to perform ablation experiments by default.

Effect of Location Decoder.Location decoder assists queries to capture the location information of things. Tab. 6 shows the results with varying the num

<table><tr><td>#Layer</td><td>PQ</td><td>PQth</td><td>PQst</td></tr><tr><td>0</td><td>47.0</td><td>50.0</td><td>42.5</td></tr><tr><td>1</td><td>47.7</td><td>51.1</td><td>42.5</td></tr><tr><td>2</td><td>48.1</td><td>51.8</td><td>42.5</td></tr><tr><td>6*(box-free)</td><td>49.2</td><td>53.5</td><td>42.6</td></tr><tr><td>6</td><td>49.6</td><td>54.4</td><td>42.4</td></tr></table>

Table 6.Ablate location decoder.

ber of layers in the location decoder. With fewer location decoder layers,our model performs worse on things,and it demonstrates that learning location clues through the location decoder is beneficial to the model to handle things better. \* notes we predict mass centers rather than bounding boxes in our location decoder,and this box-free model achieves comparable results $( 4 9 . 2 \%$ PQ vs. $4 9 . 6 \%$ PQ).

Mask-wise Merging. As shows in Tab. 7, we compare our mask-wise merging strategy against pixel-wise argmax strategy on various models. We use both Mask PQ and Boundary PQ[41] to make our conclusions more credible. Models with mask-wise merging strategy always performs better. DETR with mask-wise merging outperforms origin DETR by $1 . 3 \%$ PQ[1]. In addition, our mask-wise merging is $20 \%$ less time-consuming than DETR's pixel-wise argmax since DETR uses more tricks in its code,such as merging stuff with the same category and iteratively remov图4.在使用像素级argmax时，键盘被覆盖在笔记本电脑上 (如(e)中红圈所示）。然而，笔记本电脑的分类概率高于键 盘。像素级argmax策略未能利用这一重要线索。掩码逻辑 值是通过DETR-R50[1]生成的。

![](Images_J3PD2ISP/ec7dffa434637e52e28da9e471965c7ed8fd5c8a9cc896dbe451e9036db53007.jpg)

<table><tr><td rowspan="2">方法</td><td colspan="3">掩码全景质量</td><td colspan="3">边界全景质量[ [41]</td></tr><tr><td>PQ</td><td>SQ</td><td>RQ</td><td>PQ</td><td>SQ</td><td>RQ</td></tr><tr><td>DETR (p)</td><td>43.4</td><td>79.3</td><td>53.8</td><td>32.8</td><td>71.0</td><td>45.2</td></tr><tr><td>DETR (m)</td><td>44.7</td><td>80.2</td><td>54.7</td><td>33.7</td><td>71.1</td><td>46.5</td></tr><tr><td>D-DETR-MS (p)</td><td>46.3</td><td>80.0</td><td>56.5</td><td>37.1</td><td>72.1</td><td>50.2</td></tr><tr><td>D-DETR-MS (m)</td><td>47.3</td><td>81.1</td><td>56.8</td><td>38.0</td><td>72.3</td><td>51.0</td></tr><tr><td>MaskFormer (p)</td><td>45.6</td><td>80.2</td><td>55.8</td><td>-</td><td>-</td><td>1</td></tr><tr><td>MaskFormer (p*)</td><td>46.5</td><td>80.4</td><td>56.8</td><td>36.8</td><td>72.5</td><td>49.8</td></tr><tr><td>MaskFormer (m)</td><td>46.8</td><td>80.4</td><td>57.2</td><td>37.6</td><td>72.6</td><td>51.1</td></tr><tr><td>全景分割变换器 (p)</td><td>48.4</td><td>80.7</td><td>58.9</td><td>39.3</td><td>73.0</td><td>52.9</td></tr><tr><td>全景分割变换器 (m)</td><td>49.6</td><td>81.6</td><td>59.9</td><td>40.4</td><td>73.4</td><td>54.2</td></tr></table>

表7.掩码级合并策略的效果。该表展示了采用不同后处理方法的模型结果，骨干网络为ResNet-50。“(p)”指使用像素级argmax作为后处理方法。“ $\left( \mathrm { p } ^ { \ast } \right)$ ”在其像素级argmax策略[3]中同时考虑了类别概率和掩码预测概率。采用掩码级合并的“(m)”模型在掩码全景质量和边界全景质量[41]上始终优于像素级argmax方法。

<table><tr><td>方法</td><td>PQ</td><td>PQth</td><td>PQst</td><td>平均精度box</td><td>平均精度seg</td></tr><tr><td>DETR[1]</td><td>43.4</td><td>48.2</td><td>36.3</td><td>38.8</td><td>31.1</td></tr><tr><td>D-DETR-MS_[12]</td><td>47.3</td><td>52.6</td><td>39.0</td><td>45.3</td><td>37.6</td></tr><tr><td>Panoptic FCN [21]</td><td>43.6</td><td>49.3</td><td>35.0</td><td>36.6</td><td>34.5</td></tr><tr><td>我们的方法 (联合匹配)</td><td>48.5</td><td>54.5</td><td>39.5</td><td>44.1</td><td>37.7</td></tr><tr><td>我们的方法 (查询解耦)</td><td>49.6</td><td>54.4</td><td>42.4</td><td>45.6</td><td>39.5</td></tr></table>

表8.查询解耦策略的效果。各种全景分割模型在COCOval2017上的全景质量和平均精度分数。

面积较小的掩码。图4展示了一个使用像素级argmax策略的典型失败案例。

掩码解码器。我们提出的掩码解码器收敛更快，因为真实掩码引导注意力模块关注有意义的区域。图5展示了几个模型的收敛曲线。我们仅监督掩码解码器的最后一层，而未采用深度监督。我们可以观察到，我们的方法在训练24个训练轮次后达到 $4 9 . 6 \%$ 的全景质量，更长的训练效果甚微。然而，D-DETR-MS至少需要50个训练轮次才能达到更好的性能。深度监督对于我们的掩码解码器获得更好性能和更快收敛至关重要。图6展示了

![](Images_J3PD2ISP/07096d647b3cd6576ff246396e12bdd2afe37d57a3ae877bb87f6ede32a2343b.jpg)  
图5.Panoptic SegFormer与D-DETR-MS 的收敛曲线。我们使用不同的训练计划训练模型。“W/ods”表示我们在掩码解码器中未采用深度监督。学习率在曲线跃升处降低。

![](Images_J3PD2ISP/dc0b2a337bc3fbbec7772dff7ed596924d7504af5d8588719b50f2bba5479016.jpg)  
图6.掩码解码器中不同层的注意力图。“ds”指深度监督。

掩码解码器中不同层的注意力图，当使用深度监督时,注意力模块会关注前一层中的目标汽车。这些注意力图与最终预测的掩码非常相似，因为掩码是由注意力图通过一个轻量级的全连接头生成的。

由于我们的掩码解码器可以从每一层生成掩码，我们评估了掩码解码器中每一层的性能,参见表10。在推

<table><tr><td>层</td><td>PQ</td><td>PQth</td><td>PQst</td><td>Fps</td></tr><tr><td>1st</td><td>48.8</td><td>54.3</td><td>40.5</td><td>10.6</td></tr><tr><td>2nd</td><td>49.5</td><td>54.5</td><td>42.0</td><td>9.8</td></tr><tr><td>3rd</td><td>49.6</td><td>54.5</td><td>42.3</td><td>9.3</td></tr><tr><td>Last</td><td>49.6</td><td>54.4</td><td>42.4</td><td>7.8</td></tr></table>

表10.掩码解码器中各层的结果。

理过程中，使用掩码解码器的前两层将与整个掩码解码器性能相当。由于计算成本降低，其推理速度也更快。全景质量th几乎不受层数影响，全景质量st 在第一层表现稍差。原因是位置解码器对物体查询进行了额外的精炼。

查询解耦策略的效果。我们将我们提出的查询解耦策略与先前DETR的匹配方法（此处描述为“联合匹配”）进行比较[1],，如表格8所示。遵循DETR，联合匹配使用一组查询来同时定位可数物体和背景，并将所有查询馈送到位置解码器和掩码解码器。对于我们提出的查询解耦策略，我们使用物体查询通过二分匹配检测可数物体,并使用位置解码器对它们进行精炼。背景查询通过类别固定分配策略进行分配。为了公平比较，联合匹配策略和我们的查询解耦策略都使用了353个查询。我们可以观察到

![](Images_J3PD2ISP/cbfc3c354660de08d9249bdd394db50afd0156a4b3017f4008dc1b17c5863cf4.jpg)

Figure 4.While using pixel-wise argmax,the keyboard is covered on the laptop (noted by the red circle in (e). However, the laptop has a higher classification probability than the keyboard. The pixel-wise argmax strategy fails to use this important clue.Masks logits were generated through DETR-R50 [1].   

<table><tr><td rowspan="2">Method</td><td colspan="3">Mask PQ</td><td colspan="3">Boundary PQ[41]</td></tr><tr><td>PQ</td><td>SQ</td><td>RQ</td><td>PQ</td><td>SQ</td><td>RQ</td></tr><tr><td>DETR (p)</td><td>43.4</td><td>79.3</td><td>53.8</td><td>32.8</td><td>71.0</td><td>45.2</td></tr><tr><td>DETR (m)</td><td>44.7</td><td>80.2</td><td>54.7</td><td>33.7</td><td>71.1</td><td>46.5</td></tr><tr><td>D-DETR-MS (p) D-DETR-MS (m)</td><td>46.3 47.3</td><td>80.0 81.1</td><td>56.5 56.8</td><td>37.1 38.0</td><td>72.1 72.3</td><td>50.2 51.0</td></tr><tr><td>MaskFormer (p)</td><td>45.6</td><td></td><td></td><td></td><td></td><td></td></tr><tr><td>MaskFormer (p*)</td><td>46.5</td><td>80.2</td><td>55.8</td><td>-</td><td>-</td><td>：</td></tr><tr><td></td><td></td><td>80.4</td><td>56.8</td><td>36.8</td><td>72.5</td><td>49.8</td></tr><tr><td>MaskFormer (m)</td><td>46.8</td><td>80.4</td><td>57.2</td><td>37.6</td><td>72.6</td><td>51.1</td></tr><tr><td>Panoptic SegFormer (p)</td><td>48.4</td><td>80.7</td><td>58.9</td><td>39.3</td><td>73.0</td><td>52.9</td></tr><tr><td>Panoptic SegFormer (m)</td><td>49.6</td><td>81.6</td><td>59.9</td><td>40.4</td><td>73.4</td><td>54.2</td></tr></table>

Table 7.Effect of mask-wise merging strategy. The table shows the results of models with different post-processing methods,and the backbone is ResNet-50. $\ " ( \boldsymbol { \mathrm { p } } ) \}$ ’refers to using pixel-wise argmax as the post-processing method.‘ $\mathbf { \bar { \rho } } ( \mathbf { p } ^ { * } ) ^ { * }$ considers both class probability and mask prediction probability in its pixel-wise argmax strategy [3]. Models with $^ { \ast } ( \mathrm { m } ) ^ { \ast }$ that employ mask-wise merging always perform better in both Mask PQ and Boundary PQ[41] than pixel-wise argmax method.   

<table><tr><td>Method</td><td>PQ</td><td>PQth</td><td>PQst</td><td>Apbox</td><td>Apseg</td></tr><tr><td>DETR[1]</td><td>43.4</td><td>48.2</td><td>36.3</td><td>38.8</td><td>31.1</td></tr><tr><td>D-DETR-MS [12]</td><td>47.3</td><td>52.6</td><td>39.0</td><td>45.3</td><td>37.6</td></tr><tr><td>Panoptic FCN [21]</td><td>43.6</td><td>49.3</td><td>35.0</td><td>36.6</td><td>34.5</td></tr><tr><td>Ours (Joint Matching)</td><td>48.5</td><td>54.5</td><td>39.5</td><td>44.1</td><td>37.7</td></tr><tr><td>Ours (Query Decoupling)</td><td>49.6</td><td>54.4</td><td>42.4</td><td>45.6</td><td>39.5</td></tr></table>

Table 8.Effect of query decoupling strategy.PQ and AP scores of various panoptic segmentation models on COCO val2017.

ing masks with small areas.Fig. 4 shows one typical fail case of using pixel-wise argmax.

Mask Decoder. Our proposed mask decoder converges faster since the ground truth masks guide the attention module to focus on meaningful regions. Fig.5 shows the convergence curves of several models. We only supervise the last layer of the mask decoder while not employing deep supervision.We can observe that our method achieves $4 9 . 6 \%$ PQ with training for 24 epochs,and longer training has little effect.However, D-DETR-MS needs at least 5O epochs to achieve better performance.Deep supervision is vital for our mask decoder to perform better and converge faster. Fig.6 shows the attention maps of different layers in the mask decoder,and the attention module focuses on the target car in the previous layer when using deep supervision. The attention maps are very similar to the final predicted masks,since masks are generated by attention maps with a lightweight FC head.

![](Images_J3PD2ISP/e75d42af8ea573cca167042d576746654c03ffe3db5145279661cadb32ad2803.jpg)  
Figure 5.Convergence curves of Panoptic SegFormer and DDETR-MS.We train models with different training schedules. “w/o ds”refers that we do not employ deep supervision in the mask decoder. The learning rate is reduced where the curves leap.

![](Images_J3PD2ISP/bf2bebd081dc8d9c2d47d0a7086857a6b83a2dd5d1f7490321e76a3c0ceb65e2.jpg)  
Figure 6.Attention maps of different layers in the mask decoder. “ds”refers to deep supervision.

Since our mask decoder can generate masks from each layer, we evaluate the performance of each layer in the mask decoder, see Tab. 10. During infer

<table><tr><td>Layer</td><td>PQ</td><td>PQth</td><td>PQst</td><td>Fps</td></tr><tr><td>1st</td><td>48.8</td><td>54.3</td><td>40.5</td><td>10.6</td></tr><tr><td>2nd</td><td>49.5</td><td>54.5</td><td>42.0</td><td>9.8</td></tr><tr><td>3rd</td><td>49.6</td><td>54.5</td><td>42.3</td><td>9.3</td></tr><tr><td>Last</td><td>49.6</td><td>54.4</td><td>42.4</td><td>7.8</td></tr></table>

Table 10.Results of each layer in the mask decoder.

ence,using the first two layers of mask decoder will be on par with the whole mask decoder. It also inferences faster because the computational cost decreases. $\mathrm { P Q } ^ { \mathrm { t h } }$ is hardly affected by the number of layers, $\mathrm { P Q } ^ { \mathrm { s t } }$ performs a little poorly in the first layer. The reason is that the location decoder has made additional refinements to the thing queries.

Effect of Query Decoupling Strategy. We compare our proposed query decoupling strategy with previous DETR's matching method (described here as“joint matching"） [1], as shown in Tab. 8. Following DETR, joint matching uses a set of queries to target both things and stuff and feeds all queries to both location decoder and mask decoder. For our proposed query decoupling strategy，we use thing queries to detect things through bipartite matching and use location decoder to refine them. Stuff queries are assigned through class-fixed assign strategy. For a fair comparison, both the joint matching strategy and our query decoupling strategy employ 353 queries. We can observe 我们提出的策略极大地提升了全景质量st。此外，全景 分割模型可以仅利用其物体类别结果来执行实例分割。 然而，先前的全景分割方法在实例分割任务上总是表 现不佳，尽管这两个任务密切相关。表格8展示了各 种方法在全景分割和实例分割上的性能。我们的查询 解耦策略可以在全景分割任务上实现最先进性能，同 时获得具有竞争力的实例分割性能。

<table><tr><td rowspan="2">方法</td><td rowspan="2" colspan="2">清洁均值</td><td colspan="4">Blur</td><td colspan="4">噪声</td><td colspan="4">数字</td><td colspan="2">天气</td></tr><tr><td>运动散焦玻璃高斯高斯脉冲散粒斑点亮度对比度饱和度JPEG雪斑点雾</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>霜冻</td></tr><tr><td>全景FCN (R50)</td><td>43.8</td><td>26.8</td><td>22.5</td><td>23.7</td><td>14.1</td><td>25.0</td><td>28.2</td><td>20.0</td><td>28.3</td><td>31.9</td><td>39.4</td><td>24.3</td><td>38.0</td><td>22.9</td><td>20.0</td><td>29.6 35.3 25.3</td></tr><tr><td>MaskFormer (R50)</td><td>47.0</td><td>29.5</td><td>24.9</td><td>28.1</td><td>16.4</td><td>29.5</td><td>31.2</td><td>24.7</td><td>30.9</td><td>34.8</td><td>42.5</td><td>27.5</td><td>41.2</td><td>22.0</td><td>20.4</td><td>31.0 38.5 27.7</td></tr><tr><td>D-DETR (R50)</td><td>47.6</td><td>30.3</td><td>25.6</td><td>28.7</td><td>16.8</td><td>29.7</td><td>32.5</td><td>24.9</td><td>31.4</td><td>35.9</td><td>43.1</td><td>28.6</td><td>41.3</td><td>24.5</td><td>21.7</td><td>31.739.7 28.7</td></tr><tr><td>我们的方法(R50)</td><td>50.0</td><td>32.9</td><td>26.9</td><td>30.2</td><td>17.5</td><td>31.6</td><td>35.5</td><td>27.9</td><td>35.4</td><td>38.6</td><td>45.7</td><td>31.3</td><td>43.9</td><td>29.0</td><td>24.3</td><td>35.0 41.9 32.3</td></tr><tr><td>MaskFormer (Swin-L) 我们的方法(Swin-L)</td><td>52.9</td><td>41.7</td><td>37.3</td><td>38.0</td><td>30.4</td><td>39.3</td><td>42.3</td><td>42.5</td><td>42.8</td><td>45.3</td><td>49.7</td><td>43.9</td><td>49.4</td><td>39.7</td><td>35.2</td><td>45.2 48.8 37.9</td></tr><tr><td></td><td>55.8</td><td>47.2</td><td>41.3</td><td>41.5</td><td>34.3</td><td>42.7</td><td>48.6</td><td>49.5</td><td>48.8</td><td>50.3</td><td>53.8</td><td>50.1</td><td>53.5</td><td>46.9</td><td>44.8</td><td>51.5 53.3 44.3</td></tr><tr><td>我们的方法 (PVTy2-B5)</td><td>55.6</td><td>47.0</td><td>41.5</td><td>41.1</td><td>36.1</td><td>42.5</td><td>48.4</td><td></td><td>49.648.4</td><td>50.4</td><td>53.5</td><td>50.8</td><td>53.0</td><td>46.2</td><td>42.4</td><td>50.3 52.9 44.3</td></tr></table>

表11.COCO-C 上的全景分割结果。为减轻实验工作量，我们使用了COCOval2017中的 2000张图像子集。第三列是16种损坏数据上的平均结果。

我们的实验结果也表明，基于Transformer的骨干网络(Swin-L和PVTv2-B5）能为模型带来更好的鲁棒性。然而，对于需要更复杂流程的任务，例如全景分割，我们认为任务头的设计也对模型的鲁棒性起着重要作用。例如，Panoptic SegFormer (Swin-L)在COCO-C上的平均结果为 $4 7 . 2 \%$ PQ，比MaskFormer (Swin-L)高出$5 . 5 \%$ PQ，这比它们在干净数据上的差距（ $2 . 9 \%$ PQ)更大。我们认为这是由于我们基于Transformer的掩码解码器比MaskFormer基于卷积的像素解码器具有更强的鲁棒性。

简而言之，与联合匹配相比,查询解耦策略实现了更高的全景质量st和平均精度seg。我们分析了联合匹配的实验结果,发现如果一个查询更偏好可数物体，那么它检测出的背景类别精度就会更低，参见

# 5.结论

![](Images_J3PD2ISP/aedff9dd5cffa3054c95d2c43909f597284780245fb037ec4f21c23598df010a.jpg)  
图7.物体类别偏好vs.背景类别精度。

局限性。本工作依赖可变形注意力来处理多尺度特征，速度稍慢。我们的模型仍然难以处理空间形状更大的特征，并且对于小目标表现不佳。

图 $7 \sb { \circ }$ 每个点代表每个查询对应的事物偏好和背景类别精度，具体定义见附录。红线是这些点的线性回归。当使用一个查询集同时检测可数物体和背景时，会导致每个查询内部产生干扰。我们的查询解耦策略防止了可数物体和背景在同一查询内相互干扰。

讨论。最近，分割领域尝试使用统一的流程来处理各种任务，包括语义分割、实例分割和全景分割。然而，我们认为完全的统一在概念上令人兴奋，但不一定是合适的策略。考虑到各种分割任务之间的异同,“求同存异”是更合理的指导理念。通过查询解耦策略，我们可以在同一范式中处理可数物体和背景，因为它们都被表示为查询。此外，我们也可以为可数物体或背景设计定制化的流程。这种灵活的策略更适合各种分割任务。目前，针对特定任务的设计仍然能带来更好的性能。我们鼓励社区进一步探索统一的分割框架，并期望全景分割变换器能够启发未来的工作。

# 4.4.对自然损坏的鲁棒性

全景分割在自动驾驶等许多领域具有广阔的应用前景。模型鲁棒性是自动驾驶最关注的问题之一。在本实验中，我们评估了模型对扰动数据的鲁棒性。我们遵循[42]并生成了COCO-C，它扩展了COCO验证集，包含了由模糊、噪声、数字和天气四大类别的16种算法生成的扰动数据。我们将我们的模型与Panoptic FCN[21],、D-DETR-MS和MaskFormer[3]进行比较。结果如表11所示。我们计算了COCO-C上扰动数据的平均结果。使用相同的骨干网络，我们的模型始终优于其他模型。先前的研究[43-45]发现，基于Transformer的模型在图像分类和语义分割任务上具有更强的鲁棒性。

# 6.致谢

本研究由国家自然科学基金项目61672273和项目61832008资助。罗平获得香港普通研究基金编号27208720和17212120的资助。王文海和卢通是通讯作者。

<table><tr><td rowspan="2">Method</td><td rowspan="2">Clean Mean</td><td rowspan="2"></td><td colspan="4">Blur</td><td colspan="4">Noise</td><td colspan="4">Digital</td><td colspan="4">Weather</td></tr><tr><td>Motion Defoc Glass Gauss</td><td></td><td></td><td></td><td></td><td></td><td>Gauss Impul Shot Speck</td><td></td><td></td><td></td><td>Bright Contr Satur JPEG</td><td></td><td></td><td></td><td>Snow Spatt Fog</td><td>Frost</td></tr><tr><td>Panoptic FCN (R50)</td><td>43.8</td><td>26.8</td><td>22.5</td><td>23.7</td><td>14.1</td><td>25.0</td><td>28.2</td><td>20.0</td><td>28.3</td><td>31.9</td><td>39.4</td><td>24.3</td><td>38.0</td><td>22.9</td><td>20.0</td><td>29.6</td><td>35.3</td><td>25.3</td></tr><tr><td>MaskFormer (R50)</td><td>47.0</td><td>29.5</td><td>24.9</td><td>28.1</td><td>16.4</td><td>29.5</td><td>31.2</td><td>24.7</td><td>30.9</td><td>34.8</td><td>42.5</td><td>27.5</td><td>41.2</td><td>22.0</td><td>20.4</td><td>31.0</td><td>38.5</td><td>27.7</td></tr><tr><td>D-DETR (R50)</td><td>47.6</td><td>30.3</td><td>25.6</td><td>28.7</td><td>16.8</td><td>29.7</td><td>32.5</td><td>24.9</td><td>31.4</td><td>35.9</td><td>43.1</td><td>28.6</td><td>41.3</td><td>24.5</td><td>21.7</td><td></td><td>31.739.7 28.7</td><td></td></tr><tr><td>Ours (R50)</td><td>50.0</td><td>32.9</td><td>26.9</td><td>30.2</td><td>17.5</td><td>31.6</td><td>35.5</td><td>27.9</td><td>35.4</td><td>38.6</td><td>45.7</td><td>31.3</td><td>43.9</td><td>29.0</td><td>24.3</td><td></td><td>35.041.932.3</td><td></td></tr><tr><td>MaskFormer (Swin-L)</td><td>52.9</td><td>41.7</td><td>37.3</td><td>38.0</td><td>30.4</td><td>39.3</td><td>42.3</td><td>42.5</td><td>42.8</td><td>45.3</td><td>49.7</td><td>43.9</td><td>49.4</td><td>39.7</td><td>35.2</td><td>45.2</td><td>48.8</td><td>37.9</td></tr><tr><td>Ours (Swin-L)</td><td>55.8</td><td>47.2</td><td>41.3</td><td>41.5</td><td>34.3</td><td>42.7</td><td>48.6</td><td>49.5</td><td>48.8</td><td>50.3</td><td>53.8</td><td>50.1</td><td>53.5</td><td>46.9</td><td>44.8</td><td>51.5</td><td>53.3</td><td>44.3</td></tr><tr><td>Ours (PVTv2-B5)</td><td>55.6</td><td>47.0</td><td>41.5</td><td>41.1</td><td>36.1</td><td>42.5</td><td>48.4</td><td></td><td>49.648.4</td><td>50.4</td><td>53.5</td><td>50.8</td><td>53.0</td><td>46.2</td><td>42.4</td><td></td><td></td><td>50.3 52.9 44.3</td></tr></table>

Table11.PanopticsegmentationresultsonCOCO-C.Toease theworkloadoftheexperiment,weuseasubsetof0 imagesfromthe COCO val2 O17. The third column is the average results on 16 types of corruption data.

that our proposed strategy highly boost $\mathrm { P Q } ^ { \mathrm { s t } }$ .In addition,panoptic segmentation model can perform instance segmentation by utilizing its thing results only. However, previous panoptic segmentation methods always perform poorly on instance segmentation task even though the two tasks are closely related. Tab. 8 shows both panoptic segmentation and instance segmentation performance of various methods. Our query decoupling strategy can achieve sota performance on panoptic segmentation task while obtaining a competitive instance segmentation performance.

In short， query decoupling strategy achieves higher PQst and $\mathbf { A P } ^ { \mathrm { s e g } }$ compared to joint matching.We analyze the experimental results of joint matching and find that if one query prefers things more, the precision of stuff results detected by it will be lower, see

![](Images_J3PD2ISP/0c2a27e819203fa56dfb7597c91326bb5358cf51cc7d53cbdbb45e4f3e912d3f.jpg)  
Figure 7.Things-Preference vs. StuffPrecision.

Fig.7. Each point represents the Thing-Preference and Stuff-Precision corresponding to each query,and the specific definitions are in Appendix. The red line is the linear regression of these points. When using one query set to detect things and stuff together, it will cause interference within each query. Our query decoupling strategy prevents things and stuf from interfering within the same query.

# 4.4. Robustness to Natural Corruptions

tic segmentation tasks. Our experimental results also show that the transformer-based backbone (Swin-L and PVTv2- B5) can bring better robustness to the model.However, for tasks requiring a more complex pipeline, such as panoptic segmentation,we argue that the design of the task head also plays an important role for the robustness of the model. For example, Panoptic SegFormer (Swin-L) has an average result of $4 7 . 2 \%$ PQ on COCO-C,outperforming MaskFormer (Swin-L) by $5 . 5 \%$ PQ, higher than their gap $( 2 . 9 \%$ PQ) on clean data.We posit it is due to our transformer-based mask decoder having stronger robustness than the convolutionbased pixel decoder of MaskFormer.

Panoptic segmentation has promising applications in many fields,such as autonomous driving.Model robustness is one of the top concerns of autonomous driving.In this experiment, we evaluate the robustness of our model to disturbed data. We follow [42] and generate COCO-C, which extends the COCO validation set to include disturbed data generated by 16 algorithms from blur, noise,digital and weather categories. We compare our model to Panoptic FCN [21], D-DETR-MS and MaskFormer [3]. The results are shown in Tab.11. We calculated the mean results of disturbed data on COCO-C.Using the same backbone,our model always performs better than others.Previous literature [43-45] found that transformer-based model has stronger robustness on image classification and seman

# 5. Conclusion

Limitation. This work relies on deformable attention to process multi-scale features,and the speed is a litle slow. Our model is still hard to handle features with a larger spatial shape and does not perform well for small targets.

Discussion. Recently, the segmentation field attempted to use a uniform pipeline to process various tasks, including semantic segmentation, instance segmentation, and panoptic segmentation. However, we think that complete unification is conceptually exciting but not necessarily a suitable strategy. Given the similarities and differences among the various segmentation tasks,“seek common ground while reserving differences” is a more reasonable guiding ideology. With query decoupling strategy, we can handle things and stuff in the same paradigm since they are represented as queries. In addition，we can also design customized pipelines for things or stuff. Such a flexible strategy is more suitable for various segmentation tasks.At present, taskspecific designs still bring better performance.We encourage the community to further explore the unified segmentation frameworks and expect that Panoptic SegFormer can inspire future works.

# 6. Acknowledge

This work is supported by the Natural Science Foundation of China under Grant 61672273 and Grant 61832008. Ping Luo is supported by the General Research Fund of HK No.27208720 and 17212120. Wenhai Wang and Tong Lu are corresponding authors.

# 参考文献

[1]尼古拉斯·卡里昂、弗朗西斯科·马萨、加布里埃尔·辛纳夫、尼古拉斯·乌苏尼尔、亚历山大·基里洛夫和谢尔盖·扎戈鲁伊科。使用Transformer模型的端到端目标检测。发表于欧洲计算机视觉会议，2020年。1,2,3,4,5,6,7[2]王慧宇、朱宇坤、哈特维希·亚当、艾伦·尤尔和陈良杰。

Max-Deeplab：使用掩码Transformer的端到端全景分割。发表于计算机视觉与模式识别会议，2021年。1,2,3,4,5,6[3]程博文、亚历山大·G·施温和亚历山大·基里洛夫。逐像素分类并非语义分割的全部。发表于神经信息处理系统大会,2021年。1,2,3,5,6,7,8[4]张文伟、庞江淼、陈恺和罗成昌。K-Net：迈向统一的图像分割。发表于神经信息处理系统大会，2021年。1,2,3,5,6[5]王文海、谢恩泽、李翔、范登平、宋凯涛、梁定、卢通、罗平和邵岭。PVTv2：使用金字塔视觉Transformer改进基线。arXiv:2l06.13797,2021年。1,6[6]亚历山大·基里洛夫、何恺明、罗斯·吉尔希克、卡斯滕·罗瑟和彼得罗·佩罗纳。全景分割。发表于计算机视觉与模式识别会议，2019年。1,2,4,5[7]亚历山大·基里洛夫、罗斯·吉尔希克、何恺明和彼得罗·佩罗纳。全景特征金字塔网络。发表于计算机视觉与模式识别会议，2019年。1,2,3,6[8]纳瓦尼特·博德拉、巴拉特·辛格、拉马·切拉帕和拉里·S·戴维斯。Soft-NMS-一用一行代码改进目标检测。发表于IEEE国际计算机视觉会议论文集，第5561-5569页，2017年。1[9]熊宇文、廖仁杰、赵恒爽、胡锐、白敏、埃尔辛·尤默和拉克尔·乌尔塔松。UPSNet：统一的泛视分割网络。发表于计算机视觉与模式识别会议，2019年。1,2[10]林宗仪、彼得罗·佩罗纳、罗斯·吉尔希克、何恺明、巴拉特·哈里哈兰和谢尔盖·贝隆吉。用于目标检测的特征金字塔网络。发表于计算机视觉与模式识别会议，2017年。1[11]林宗仪、迈克尔·梅尔、谢尔盖·贝隆吉、詹姆斯·海斯、彼得罗·佩罗纳、德瓦·拉马南、彼得罗·佩罗纳和C·劳伦斯·齐特尼克。微软COCO：上下文中的常见物体。发表于欧洲计算机视觉会议，2014年。2,5[12]朱锡洲、苏伟杰、陆乐威、李斌、王晓刚和戴继峰。可变形DETR：用于端到端目标检测的可变形Transformer。发表于国际学习表征会议，2020年。2,3,4,6,7[13]方宇新、杨树生、王兴刚、李玉、方晨、单莹、冯斌和刘文予。实例作为查询。发表于IEEE/CVF国际计算机视觉大会（ICCV），第6910-6919页，2021年10月。2,3,6[14]陈恺、庞江淼、王家齐、熊宇、李晓晓、孙书阳、冯万森、刘子纬、史建平、欧阳万里等。用于实例分割的混合任务级联。发表于计算机视觉与模式识别会议，2019年。2,6[15]乌杰瓦尔·邦德、巴勃罗·F·阿尔坎塔里利亚和斯特凡·洛伊滕埃格。迈向无边界框的全景分割。发表于德国模式识别会议，2020年。2

[16]李奇竹、齐晓娟和菲利普·H·S·托尔。统一全景分割的训练与推理。载于IEEE/CVF计算机视觉与模式识别会议论文集，第13320-13328页，2020年。[17] 程博文、麦克斯韦·D·柯林斯、朱宇坤、刘婷、黄煦涛、哈特维希·亚当和陈良杰。全景DeepLab：一个简单、强大且快速的底部全景分割基线。载于CVPR，2020年。2[18]杨天如、麦克斯韦·D·柯林斯、朱宇坤、黄志靖、刘婷、张骁、施薇薇、乔治·帕潘德鲁和陈良杰。Deeperlab：单次图像解析器。arXiv:1902.05093,2019年。2[19]高乃宇、单彦虎、王玉培、赵鑫、余一楠、杨明和黄凯奇。SSAP：具有亲和力金字塔的单次实例分割。载于ICCV，2019年。2[20]李彦伟、陈新泽、朱征、谢凌曦、黄冠、杜大龙和王新刚。注意力引导的统一网络用于全景分割。载于CVPR，2019年。2[21]李彦伟、赵恒爽、齐晓娟、王立威、李泽铭、孙剑和贾佳亚。用于全景分割的全卷积网络。载于CVPR，2021年。2,3,6,7,8[22]田植、沈春华和陈浩。用于实例分割的条件卷积。载于ECCV，2020年。2,4[23]何恺明、张祥雨、任少卿和孙剑。用于图像识别的深度残差学习。载于CVPR，2016年。3,6[24]阿希什·瓦斯瓦尼、诺姆·沙泽尔、尼基·帕尔马、雅各布·乌斯佐凯特、利昂·琼斯、艾丹·N·戈麦斯、乌卡什·凯泽和伊利亚·波洛苏欣。注意力就是一切。载于NeurIPS，2017年。3[25]董斌、曾凡高、王天财、张祥雨和韦毅辰。SOLQ：通过学习查询分割对象。NeurIPS，2021年。3,6[26] 任少卿、何恺明、罗斯·吉尔希克和孙剑。FasterR-CNN：通过区域提议网络实现实时目标检测。NeurIPS，2015年。3[27]林宗仪、普里亚·戈亚尔、罗斯·吉尔希克、何恺明和皮奥特·多拉尔。用于密集目标检测的Focal损失。载于ICCV，2017年。3,5[28]王新龙、张汝峰、孔涛、李磊和沈春华。SOLOv2：动态且快速的实例分割。NeurIPS，2020年。3,4,5,6[29]王新龙、孔涛、沈春华、蒋宇宁和李磊。SOLO：按位置分割对象。载于ECCV，2020年。4[30]拉塞尔·斯图尔特、米哈伊洛·安德里卢卡和吴恩达。拥挤场景中的端到端行人检测。载于CVPR,2016年。4[31]哈罗德·W·库恩。用于分配问题的匈牙利算法。海军研究物流季刊，297，1955年12835（-）：-。

# References

[1] Nicolas Carion,Francisco Massa,Gabriel Synnaeve,Nicolas Usunier,Alexander Kirillov,and Sergey Zagoruyko.End-toend object detection with transformers.In ECCV,2020.1, 2,3,4,5,6,7   
[2] Huiyu Wang,Yukun Zhu,Hartwig Adam,Alan Yuille,and Liang-Chieh Chen. Max-deeplab: End-to-end panoptic segmentation with mask transformers.In CVPR,2021.1,2,3, 4,5,6   
[3] Bowen Cheng,Alexander G Schwing,and Alexander Kirillov.Per-pixel classification is not all you need for semantic segmentation. In NeurIPS,2021. 1,2,3,5,6,7, 8   
[4] Wenwei Zhang， Jiangmiao Pang， Kai Chen， and Chen Change Loy.K-Net:Towards unified image segmentation. In NeurIPS,2021.1,2,3,5,6   
[5] Wenhai Wang,Enze Xie,Xiang Li, Deng-Ping Fan, Kaitao Song,Ding Liang，Tong Lu,Ping Luo,and Ling Shao. Pvtv2:Improved baselines with pyramid vision transformer. arXiv:2106.13797,2021. 1, 6 [6] Alexander Kirillov,Kaiming He,Ross Girshick,Carsten Rother,and Piotr Dollar. Panoptic segmentation.In CVPR, 2019. 1, 2, 4, 5   
[7] Alexander Kirillov,Ross Girshick,Kaiming He,and Piotr Dollar. Panoptic feature pyramid networks. In CVPR,2019. 1,2,3, 6   
[8] Navaneeth Bodla,Bharat Singh，Rama Chellappa，and Larry S Davis. Soft-nms-improving object detection with one line of code. In Proceedings of the IEEE international conference on computer vision, pages 5561-5569,2017.1 [9] Yuwen Xiong,Renjie Liao,Hengshuang Zhao,Rui Hu,Min Bai,Ersin Yumer,and Raquel Urtasun．Upsnet:A unified panoptic segmentation network. In CVPR,2019.1,2   
[10] Tsung-Yi Lin,Piotr Dollar,Ross Girshick,Kaiming He, Bharath Hariharan,and Serge Belongie.Feature pyramid networks for object detection.In CVPR,2017.1   
[11] Tsung-Yi Lin,Michael Maire, Serge Belongie, James Hays, Pietro Perona,Deva Ramanan,Piotr Dollar,and C Lawrence Zitnick. Microsoft coco: Common objects in context.In ECCV,2014. 2,5   
[12] Xizhou Zhu, Weijie Su, Lewei Lu, Bin Li, Xiaogang Wang, and Jifeng Dai. Deformable detr:Deformable transformers for end-to-end object detection.In ICLR,2020.2,3,4,6,7   
[13] Yuxin Fang, Shusheng Yang, Xinggang Wang, Yu Li, Chen Fang,Ying Shan, Bin Feng,and Wenyu Liu. Instances as queries.In Proceedings of the IEEE/CVF International Conference on Computer Vision (ICCV), pages 6910-6919, October 2021.2,3,6   
[14] Kai Chen,Jiangmiao Pang, Jiaqi Wang,Yu Xiong,Xiaoxiao Li, Shuyang Sun,Wansen Feng,Ziwei Liu,Jianping Shi, Wanli Ouyang, et al. Hybrid task cascade for instance segmentation. In CVPR,2019.2,6   
[15] Ujwal Bonde,Pablo F Alcantarilla,and Stefan Leutenegger. Towards bounding-box free panoptic segmentation.In DAGM German Conference on Pattern Recognition, 2020. 2 [16] Qizhu Li, Xiaojuan Qi,and Philip HS Torr. Unifying training and inference for panoptic segmentation. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition,pages 13320-13328,2020. [17] Bowen Cheng,Maxwell D Collins,Yukun Zhu, Ting Liu, Thomas S Huang,Hartwig Adam,and Liang-Chieh Chen. Panoptic-deeplab:A simple,strong,and fast baseline for bottom-up panoptic segmentation. In CVPR, 2020.2 [18] Tien-Ju Yang,Maxwell D Collins，Yukun Zhu,Jyh-Jing Hwang,Ting Liu, Xiao Zhang, Vivienne Sze, George Papandreou,and Liang-Chieh Chen.Deeperlab: Single-shot image parser. arXiv:1902.05093,2019.2 [19] Naiyu Gao, Yanhu Shan, Yupei Wang,Xin Zhao, Yinan Yu, Ming Yang,and Kaiqi Huang. SSAP: Single-shot instance segmentation with affinity pyramid. In ICCV,2019.2 [20] Yanwei Li,Xinze Chen, Zheng Zhu,Lingxi Xie,Guan Huang,Dalong Du,and Xingang Wang. Attention-guided unified network for panoptic segmentation. In CVPR,2019.   
2 [21] Yanwei Li, Hengshuang Zhao, Xiaojuan Qi, Liwei Wang, Zeming Li,Jian Sun,and Jiaya Jia. Fully convolutional networks for panoptic segmentation. In CVPR, 2021. 2,3, 6,7,   
8 [22] Zhi Tian, Chunhua Shen,and Hao Chen. Conditional convolutions for instance segmentation.In ECCV,2020.2, 4 [23] Kaiming He, Xiangyu Zhang, Shaoqing Ren,and Jian Sun. Deep residual learning for image recognition．In CVPR,   
2016. 3, 6 [24] Ashish Vaswani,Noam Shazeer,Niki Parmar,Jakob Uszkoreit,Llion Jones,Aidan N Gomez,Lukasz Kaiser,and Illia Polosukhin. Attention is all you need. In NeurIPS,2017. 3 [25] Bin Dong,Fangao Zeng, Tiancai Wang, Xiangyu Zhang,and Yichen Wei. Solq: Segmenting objects by learning queries. NeurIPS,2021. 3,6 [26] Shaoqing Ren,Kaiming He,Ross Girshick,and Jian Sun. Faster r-cnn: Towards real-time object detection with region proposal networks. NeurIPS,2015.3 [27] Tsung-Yi Lin,Priya Goyal,Ross Girshick, Kaiming He,and Piotr Dollar. Focal loss for dense object detection. In ICCV,   
2017. 3,5 [28] Xinlong Wang, Rufeng Zhang,Tao Kong,Lei Li,and Chunhua Shen. SOLOv2: Dynamic and fast instance segmentation. NeurIPS,2020. 3,4,5,6 [29] Xinlong Wang,Tao Kong, Chunhua Shen, Yuning Jiang,and Lei Li. Solo: Segmenting objects by locations. In ECCV,   
2020.4 [30] Russell Stewart,Mykhaylo Andriluka,and Andrew Y Ng. End-to-end people detection in crowded scenes. In CVPR,   
2016. 4 [31] Harold W Kuhn. The hungarian method for the assignment problem. Naval research logistics quarterly, 2(1-2):83-97,   
1955. 5 [32]福斯托·米莱塔里、纳西尔·纳瓦布和赛义德-艾哈迈德·艾 哈迈迪。V-网络：用于体积医学图像分割的全卷积神经网络。 载于国际三维视觉会议（3DV），2016年。5[33]周博磊、 赵航、泽维尔·普伊格、桑贾·菲德勒、阿德拉·巴里乌索和安 东尼奥·托拉尔巴。通过ADE20K数据集进行场景解析。载于 IEEE计算机视觉与模式识别会议论文集，第633-641页， 2017年。5,6[34]刘泽、林雨桐、曹越、胡涵、魏一轩、张 正、林史蒂芬和郭柏宁。Swin Transformer：使用移位窗 口的分层视觉Transformer。ICCV，2021年。6[35] 陈崇松、 任佳伟、金岱升、蔡忠昂、余存俊、王柏润、张明远和吴金 毅。ICCV2019联合COCO与Mapillary研讨会：COCO全景 分割挑战赛赛道技术报告：具有类别引导融合的全景HTC。 SHR,56(84.1):67- $\cdot 2 _ { \circ }$ 6[36]李彦伟、赵恒爽、齐晓娟、陈 宇康、齐璐、王立威、李泽铭、孙剑和贾佳亚。具有基于点 监督的全景分割全卷积网络。arXiv预印本   
arXiv:2108.07682，2021年。6[37]吴阳欣、张耕玮、高益 明、邓夏军、龚柯、梁小丹和林係。用于全景分割的双向图 推理网络。载于IEEE/CVF计算机视觉与模式识别会议论文 集，第9080-9089页，2020年。6[38]吴阳欣、张耕玮、徐航、 梁小丹和林惊。Auto-Panoptic：用于全景分割的协作式多 组件架构搜索。神经信息处理系统进展，33，2020年。6 [39]马宁宁、张祥雨、郑海涛和孙剑。ShuffleNetV2：高效 CNN架构设计的实用指南。载于欧洲计算机视觉会议论文集 (ECCV），第116-131页，2018年。6[40]何恺明、乔治亚· 吉奥克萨里、皮奥特·多拉尔和罗斯·吉尔希克。掩码区域卷 积神经网络。载于ICCV，2017年。6[41]程博文、罗斯·吉尔 希克、皮奥特·多拉尔、亚历山大·C·伯格和亚历山大·基里洛 夫。边界交并比：改进以对象为中心的图像分割评估。载于 IEEE/CVF计算机视觉与模式识别会议论文集，第15334- 15342页，2021年。6,7[42]克里斯托夫·卡曼和卡斯滕·罗瑟。 语义分割模型的鲁棒性基准测试。载于IEEE/CVF计算机视 觉与模式识别会议论文集，第8828-8838页，2020年。8 [43]谢恩泽、王文海、于志定、阿尼玛·阿南德库马尔、何塞· M·阿尔瓦雷斯和罗平。Segformer：使用Transformer进 行语义分割的简单高效设计。载于NeurIPS，2021年。8[44] 斯里纳德·博贾纳帕利、阿扬·查克拉巴蒂、丹尼尔·格拉斯纳、 李大亮、托马斯·温特希纳和安德烈亚斯·法伊特。理解用于 图像分类的Transformer模型的鲁棒性。arXiv预印本   
arXiv:2103.14586，2021年。8

[45] 穆扎马尔·纳西尔、坎查纳·拉纳辛格、萨尔曼·汗、穆纳瓦尔·哈亚特、法哈德·沙赫巴兹·汗和杨明玄。视觉Transformer的有趣特性。arXiv预印本arXiv:2105.10497，2021年。 8

[32] Fausto Milletari, Nassir Navab,and Seyed-Ahmad Ahmadi. V-net: Fully convolutional neural networks for volumetric medical image segmentation. In International conference on 3D vision (3DV),2016. 5   
[33] Bolei Zhou,Hang Zhao,Xavier Puig,Sanja Fidler,Adela Barriuso,and Antonio Torralba.Scene parsing through ade20k dataset. In Proceedings of the IEEE conference on computer vision and pattern recognition,pages 633-641, 2017. 5, 6   
[34] Ze Liu,Yutong Lin，Yue Cao,Han Hu,Yixuan Wei, Zheng Zhang, Stephen Lin,and Baining Guo. Swin transformer: Hierarchical vision transformer using shifted windows. ICCV,2021. 6   
[35] Chongsong Chen， Jiawei Ren，Daisheng_Jin, Zhongang Cai, Cunjun Yu,Bairun Wang,Mingyuan Zhang,and Jinyi Wu.Joint coco and mapillary workshop at iccv 2019: Coco panoptic segmentation challenge track technical report: Panoptic htc with class-guided fusion. SHR,56(84.1):67-2. 6   
[36] Yanwei Li, Hengshuang Zhao,Xiaojuan Qi, Yukang Chen, Lu Qi,Liwei Wang, Zeming Li, Jian Sun,and Jiaya Jia. Fully convolutional networks for panoptic segmentation with point-based supervision.arXiv preprint arXiv:2108.0768, 2021.6   
[37] Yangxin Wu, Gengwei Zhang, Yiming Gao, Xiajun Deng, Ke Gong, Xiaodan Liang,and Liang Lin. Bidirectional graph reasoning network for panoptic segmentation. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 9080-9089,2020. 6   
[38] Yangxin Wu, Gengwei Zhang, Hang Xu, Xiaodan Liang, and Liang Lin. Auto-panoptic: Cooperative multi-component architecture search for panoptic segmentation. Advances in Neural Information Processing Systems,33,2020. 6   
[39] Ningning Ma, Xiangyu Zhang,Hai-Tao Zheng,and Jian Sun. Shufflenet v2: Practical guidelines for efficient cnn architecture design. In Proceedings of the European conference on computer vision (ECCV), pages 116-131,2018. 6   
[40] Kaiming He,Georgia Gkioxari, Piotr Dollar,and Ross Girshick.Mask R-CNN. In ICCV,2017.6   
[41] Bowen Cheng,Ross Girshick,Piotr Dollar,Alexander C Berg,and Alexander Kirillov. Boundary iou: Improving object-centric image segmentation evaluation. In Proceedingsof the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 15334-15342, 2021. 6,7   
[42] Christoph Kamann and Carsten Rother. Benchmarking the robustness of semantic segmentation models.In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 8828-8838,2020. 8   
[43] Enze Xie,Wenhai Wang, Zhiding Yu,Anima Anandkumar, Jose M Alvarez,and PingLuo.Segformer: Simple and efficient design for semantic segmentation with transformers. In NeurIPS,2021. 8   
[44] Srinadh Bhojanapalli,Ayan Chakrabarti,Daniel Glasner, Daliang Li, Thomas Unterthiner,and Andreas Veit.Understanding robustness of transformers for image classification. arXiv preprint arXiv:2103.14586,2021. 8

[45] Muzammal Naseer,Kanchana Ranasinghe, Salman Khan, Munawar Hayat,Fahad Shahbaz Khan,and Ming-Hsuan Yang． Intriguing properties of vision transformers.arXiv preprint arXiv:2105.10497,2021. 8