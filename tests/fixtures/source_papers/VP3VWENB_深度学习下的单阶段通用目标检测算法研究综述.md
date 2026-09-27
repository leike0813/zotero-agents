# 深度学习下的单阶段通用目标检测算法研究综述

王 宁，智 敏+

内蒙古师范大学 计算机科学技术学院，呼和浩特 010022+ 通信作者 E-mail: cieczm@imnu.edu.cn

摘 要：近年来，目标检测算法作为计算机视觉领域中的核心任务，逐渐成为热门研究方向。它使得计算机能够识别和定位图像或视频帧中的目标物体，广泛应用于自动驾驶、生物个体检测、农业检测、医疗影像分析等领域。随着深度学习的发展，通用目标检测算法从传统的目标检测方法转变为基于深度学习下的目标检测方法。其中深度学习下的通用目标检测算法主要分为单阶段目标检测与两阶段目标检测，以单阶段目标检测为切入点，根据采用经典卷积与Transformer两种不同架构，对首个单阶段目标检测算法YOLO系列（YOLOv1\~YOLOv11、YOLO主要改进版本）、SSD等和以Transformer为基础架构的DETR系列的主流单阶段检测算法进行分析总结。介绍各个算法的网络结构以及其研究进展，根据各个算法的结构归纳出其特点优势以及局限性，概括目标检测领域主要通用数据集与评价指标，分析各算法以及其改进方法的性能，讨论各算法在不同领域的应用现状，展望单阶段目标检测算法在未来的研究方向。

关键词：目标检测；深度学习；计算机视觉；单阶段；YOLO；DETR

文献标志码：A 中图分类号：TP391

# Review of One-Stage Universal Object Detection Algorithms in Deep Learning

WANG Ning, ZHI Min+

College of Computer Science and Technology, Inner Mongolia Normal University, Hohhot 010022, China

Abstract: In recent years, object detection algorithms have gradually become a hot research direction as a core task in the field of computer vision. They enable computers to recognize and locate target objects in images or video frames, and are widely used in fields such as autonomous driving, biological individual detection, agricultural detection, medical image analysis, etc. With the development of deep learning, general object detection algorithms have shifted from traditional object detection methods to object detection methods based on deep learning. The general object detection algorithms under deep learning are mainly divided into one- stage object detection and two- stage object detection. This paper takes onestage object detection as the starting point and analyzes and summarizes the mainstream one-stage detection algorithms of the first one-stage object detection algorithm YOLO series (YOLOv1 to YOLOv11, YOLO main improved version), SSD, and DETR series based on Transformer architecture, based on the use of two different architectures: classical convolution and Transformer. This paper introduces the network structure and research progress of various algorithms, summarizes their characteristics, advantages, and limitations based on their structures, summarizes the main common datasets and evaluation indicators in the field of object detection, analyzes the performance of various algorithms and their improvement methods, discusses the application status of various algorithms in different fields, and finally looks forward to the future

research directions of one-stage object detection algorithms.

Key words: object detection; deep learning; computer vision; one-stage; YOLO; DETR

目标检测是计算机视觉领域的一个核心任务，旨在从图像或视频中识别并定位出感兴趣的物体。随着深度学习技术的迅猛发展，目标检测算法在过去几年取得了显著的进展，不仅在学术界引起了广泛关注，也在工业界得到了广泛应用[1]。如目前在交通检测的自动驾驶中，目标检测用于识别和定位周围的车辆、行人、交通标志和信号灯等，这对于安全导航和决策至关重要。在农业检测中，目标检测可以用于作物监测、病虫害检测和产量评估，帮助农民更好地管理作物。在生物个体检测方面，目标检测对动物的个体身份溯源、生态学研究、野生动物保护等领域有重要作用。从自动驾驶汽车到智能安防，从医疗影像分析到无人机视角航拍，目标检测技术正逐渐渗透到各个领域，成为推动现代科技发展的重要力量。

传统的目标检测方法通常依赖于手工设计的特征和经典的机器学习算法，如滑动窗口、HOG（histogramof oriented gradients）和支持向量机（support vector ma-chine，SVM）[2]，如图1（a）所示。然而，这些方法在处理复杂场景时往往表现不佳，难以满足实际应用的需求。

![](Images_PSFFPN9I/68b3e72b64d3da88c2543c9ac07d2d97ee82e8d635980e880f1944542ccc0d05.jpg)  
图1 传统检测器、单阶段与两阶段检测器对比  
Fig.1 Comparison among traditional detector, one-stage detector and two-stage detector

自从 2012 年 Krizhevsky 等人[3] 提出 AlexNet，并在当年的 ImageNet 大规模视觉识别挑战赛（ImageNetlarge scale visual recognition challenge，ILSVRC）中取得了优异的成绩后，卷积神经网络（convolutional neuralnetwork，CNN）的强大特征提取能力引起了学术界和工业界的广泛关注，也为目标检测带来了革命性的变化，开启了目标检测的新纪元。Girshick等人[4]基于深度卷积神经网络提出首个两阶段检测器 R-CNN（region-based convolutional neural network），也因此将基于深度学习的目标检测器划分为两种检测器，即单阶段检测器（one-stage detector）和两阶段检测器（two-stagedetector）。

两阶段检测器通常分为两个主要步骤：生成候选区域（region proposals）和对候选区域进行分类和回归。例如，Faster R-CNN[5] 通过引入 RPN（region proposal net-work）来生成候选区域，然后再对这些区域进行分类和回归，显著提高了检测精度，如图1（c）所示。尽管两阶段检测器在精度上表现出色，但其复杂的流程和较长的推理时间限制了其在实时应用中的使用。而单阶段检测器直接从输入图像中预测目标的边界框和类别标签，省去了生成候选区域的步骤，如图1（b）所示，这种简化的设计使得单阶段检测器具有较高的推理速度和良好的实时性能，适用于需要快速响应的应用场景。例如，YOLO（you only look once）[6] 通过在特征图上直接预测目标的类别和边界框位置，实现了高效的实时检测；而RetinaNet[7] 通过引入 Focal Loss 解决了类别不平衡问题，进一步提高了检测精度。

目标检测算法通常会以不同的置信度分数在同一目标周围生成多个边界框。然后通过非极大值抑制（non-maximum suppression，NMS）过滤掉冗余和不相关的边界框，只保留最准确的边界框。NMS是一种目标检测算法的后处理技术，也是目标检测算法中不可或缺的一环，其主要是解决同一对象被多次检测的问题，即减少冗余框，从而使得每个目标只有一个边界框来表示，提高整体检测质量。图2（a）为包含多个重叠边界框的目标检测模型的冗余输出，图2（b）表示经过NMS操作后的输出。

随着研究的深入，以经典卷积为架构的单阶段检测器（如YOLO、SSD[8]和RetinaNet等）因其高效的推理速度越来越受到青睐，尤其适用于实时应用，但经典卷积的感受野（即每个神经元所能看到的输入范围）是有限的，并且随着网络深度增加而逐步扩大，致使检测精度

![](Images_PSFFPN9I/267a18ece07c6a25310eff76e91ec877152106d4272cb2d715f46ec2bca0ab29.jpg)

图2 非极大值抑制（NMS）

Fig.2 Non-maximum suppression (NMS)

一直与两阶段检测器有差距。与此同时，Transformer架构以其自注意力机制的存在，理论上任何一个位置都可以直接与序列中其他任何位置建立联系，这意味着它的“感受野”从一开始就是全局的，因此结合最新的高效基础框架 Transformer 架构出现了以 DETR（detectiontransformer）[9]为代表的许多创新的方法和技术。其通过对全局上下文建模以及并行计算的特点进一步提升了检测性能，特别是在处理复杂场景时，如DETR一经发布就展现了与成熟且高度优化的两阶段基线检测器Faster R-CNN 相当的准确性和运行性能。其在 COCO数据集上的AP高达42%，后续的实时检测器RT-DETR-L[10] 在 COCO 数据集 AP 高达 53%，甚至超越最新的YOLOv11m[11]版本性能。此外，轻量化模型（如Mobile-Net[12] 和 ShuffleNet[13）] 和多模态融合技术（如Vision-Language

Models[14]）也为单阶段检测器的发展注入了新的活力。

在众多优秀单阶段检测器的综述中，米增等人[15]对首个单阶段检测算法YOLO系列从YOLOv1\~YOLOv10以及其各类变体的特点与差异等角度进行全面的回顾总结；董甲东等人[16]对单阶段检测器在金属表面缺陷检测的发展上进行了总结与对比，包括在该类数据集上各个检测器的性能分析；陈恒星等人[17]以无锚点（anchor-free）的视角梳理了无锚点的部分单阶段检测器，总结这些检测器的改进点与优缺点；任书玉等人[18]从注意力机制入手，分析了DETR系列在单阶段目标检测中的发展历程，分析各类变体的改进点；陈金林等人[19]针对YOLO系列单阶段检测算法在无人机视角下的应用成果进行全面总结与分析，梳理了一些无人机视角下的应用数据集以及数据扩展方法。

相比前者均从某一角度或某一方面针对部分单阶段目标检测器的总结分析，本文旨在从宏观角度将目前主要单阶段检测模型的算法划分为以经典卷积为架构和以 Transformer 为架构两种类型，更侧重于系统全面地梳理整个基于深度学习下的单阶段通用目标检测器的最新进展，归纳出现有单阶段检测器的优势以及局限性；总结目标检测领域的各类通用数据集以及评价指标并分析主要模型的性能；整理出目前单阶段目标检测器在各领域的主要应用场景并展望未来的研究方向。主要单阶段检测模型发展历程如图3所示。

![](Images_PSFFPN9I/b1470ca59f975efb2849eba3226f606a1cd1509c97e8c9a67e50b62555beb1d8.jpg)  
图3 主要单阶段检测模型发展历程  
Fig.3 Development history of main one-stage detection models

## 1 以经典卷积为架构的单阶段检测器

## 1.1 YOLO系列

YOLO是一个将目标检测任务视为一个回归问题的实时单阶段目标检测框架，其主要特点是直接从图像像素预测边界框和概率。随着YOLOv1到YOLOv11版本的不断更新，YOLO的精度也越来越与两阶段检测器持平甚至在某些领域超过基线水平。本文依据改进的速度与提高的精度水平将其划分为三个阶段。

## 1.1.1 初期YOLOv1\~YOLOv2

YOLOv1[6]是由Redmon等人于2016年首次在CVPR2016上提出的实时目标检测系统。YOLOv1的架构受到GoogLeNet[20] 架构的启发，在数据集PASCAL VOC 2007和 PASCAL VOC 2012[21] 上参照 Darknet 框架完成模型训练。虽然YOLOv1实现了实时检测，但其对小物体的检测效果和定位精度都有待提高，与两阶段目标检测器仍然有较大的差距。

YOLOv2 作为 YOLOv1 的改进版本，是在 2017 年由Redmon等人[22]提出。由于目标检测任务的标记数据稀缺，作者将ImageNet和COCO数据集结合产生超过9 000个类别的对象实例，因此YOLOv2也被称为YOLO 9000。YOLOv2与YOLOv1结构相似，其主要特点是引入锚点框（anchor boxes），这样做既可以避免原来手动设置的纵横比解决难以学习到目标对象的边界框的问题，也能比无锚点方法的边界框回归更容易收敛。总体来讲，虽然YOLOv2进一步提高了模型性能，但其对小物体的检测效果仍然不是很理想。

## 1.1.2 进阶YOLOv3\~YOLOv7

针对初期YOLO模型定位精度和小物体目标检测不敏感的问题，YOLOv3[23]引入了多尺度预测和特征金字塔（feature pyramid network，FPN）[24] 结构。YOLOv3的主要特点是使用二元交叉熵替换Softmax来训练独立的逻辑分类器，并将问题定义为多标签分类。这种改进可以将多个标签分配到同一个框中，例如同一个对象可以是人，同时也是女人。其次，为解决对不同尺度的检测还引入 SPP（spatial pyramid pooling）[25] 模块以及设计多个最大值池化层，池化窗口大小从局部到全局多个不同尺度，最后将这些池化层的输出拼接在一起，可以大大增强模型的多分辨率和全局感知能力。

从YOLOv3开始YOLO目标检测器的架构开始被描述为骨干网络（backbone network）、颈部网络（necknetwork）和头部检测器（head detector）三个部分，如图 4所示。骨干网络负责从输入图像中捕获图像不同尺度的多层次特征。颈部网络是连接骨干网络与头部检测器对骨干网络提取的特征进行融合和细化，以及增强不同尺度之间的空间和语义信息的中间部件。头部检测器是目标检测器的最后预测部分，头部检测器一般由多个子网络组成，这些子网络分别执行分类、定位以及实例分割，为每个候选对象生成预测。最终通过后处理操作（如非极大值抑制NMS）对模型预测结果进行筛选，以有效去除重叠冗余的目标框，仅保留置信度最高的有效预测。

![](Images_PSFFPN9I/b65aea4dfd759f3041963121cd56487b4caa6669ad2e5240d1bce36acbd10e16.jpg)  
图4 骨干网络、颈部网络和头部检测器示意图  
Fig.4 Schematic diagram of backbone network, neck network and head detector

YOLOv4[26]于YOLOv3版本发布两年后的2020年4月由Bochkovskiy等人在ArXiv正式发布。新的YOLOv4经过两年的时间整合了近年来计算机视觉不同领域的各种技术，如BoF（bag-of-freebies）和BoS（bag-of-specials）技术。BoF是改变训练策略和增加训练成本而不增加推理时间的方法，包括数据增强、正则化技术，提高了模型的鲁棒性和泛化能力。BoS是对推理时间影响很小但能大大提高准确性的方法，包括引入通过减少计算量和内存占用，提高了模型效率的CSPNet（cross stage partialnetwork）[27] 模块以及相比 ReLU 函数和 Leaky ReLU 函数具有更好非线性表达能力的Mish[20]激活函数[28]。这些改进使得YOLOv4在高精度和实时检测方面更加精准快速。

YOLOv5[29] 是 YOLOv4 发布几个月之后由 Ultralytics团队基于PyTorch框架发布的。YOLOv5的特点是其简化了网络结构，通过改进的特征融合和上采样技术，提高了对不同大小目标的检测能力。此外，还引入了动态锚点生成和自适应锚点调整，使得其在实时检测和资源受限设备上的应用更有优势。YOLOv5也因易于使用、训练和部署成为YOLO系列最受欢迎的版本之一，目前仍然在积极维护，且截至本文编写时也有新的改进。

YOLOv6[30]是由美团公司视觉 AI 团队专为工业设计的系统，于2022年9月在ArXiv发布。YOLOv6的主要特点是引入了一种基于RepVGG[31]网络，被称为Effi-cient Rep块的新骨干网络。该骨干网络具有更高的并行度，可以加快模型的速度。此外，YOLOv6还使用Rep-OPT[32] 使量化模型更稳定，以及使用量化感知训练（quantization aware training，QAT）和知识蒸馏来提高YOLO量化模型的准确性。通过减少内存占用和优化计算效率，其在资源受限的设备上也能高效运行，因此YOLOv6在工业应用中的实时检测和高精度要求方面更加强大。

YOLOv7[33] 于 2022 年 由 YOLOv4 相 同 作 者 所 提出。YOLOv7 主要特点是使用 ELAN（ensemble learn-ing and aggregation network）[34] 来替换 YOLOv4 使用的CSPNet，在此基础上提出了 E-ELAN（enhanced efficientlayer aggregation network）结构。E-ELAN 是通过对基数移动和合并的方式组合不同组的特征，在不破坏原有梯度路径的情况下增强网络的学习，提高了模型的表达能力。此外，还提出了粗细标签分配机制，可以直接使用辅助损失来指导特征空间中的粗到细特征，在不改变架构的情况下提供预测细化效果。

## 1.1.3 更快更强YOLOv8\~YOLOv11

为了将检测模型与各种下游任务（如实例分割、姿态估计、多目标跟踪等）连接起来，Ultralytics 公司于2023年1月发布YOLOv8[35]。YOLOv8建立在YOLOv5成功的基础上，主要特点是具有增强的特征提取和无锚点检测功能，提供了一个简单的 API（application pro-gramming interface），其将 YOLOv5 的 CSP 模块替换为C2f（cross-layer feature fusion）模块。C2f 模块将高层特征与上下文信息相结合，提高模型对不同尺度目标的检测能力。

YOLOv8 更重要的是它是一个技术集成平台，YOLOv8 r2.0 集成了后续将提到的 YOLOv9 等最新技术。它的最新版本是YOLOv8 r3.0，也称为YOLOv11，在架构上更新了YOLOv9的Dark-ELAN、CSP-ELAN、CSPNet和后续即将介绍的 YOLOv10 的 PSA（parallel spatial at-tention）组合，进而来实现更高的速度与精度平衡。

针对信息丢失导致梯度流偏差的问题，YOLOv9[36]最主要的特点就是提出了一种重要的可信技术——可编程梯度信息（programmable gradient information，PGI），其主要由三个组件构成：主分支（main branch）、辅助可 逆 分 支（auxiliary reversible branch）、多级辅助信息（multi-level auxiliary information）。主分支用于推理，利用辅助可逆分支生成可靠梯度来更新网络参数，从而缓解深度监督中的信息断裂问题。PGI 提出的多级辅助信息的思想，通过在辅助监督的特征金字塔层和主分支之间插入一个集成网络，来聚合来自不同预测头的返回梯度，使主分支特征的每一层都尽可能地保留了所有任务目标所需的信息，这可以避免在浅层丢失重要信息而导致无法获得足够深层信息的问题。虽然YOLOv9的PGI展示了很高的检测精度，如YOLOv9-S在保持较小模型大小的同时，实现了46.8%的AP，而YOLOv9-E在更大的模型规模下，实现了55.6%的AP，还帮助模型更好地处理重叠目标的检测任务，但是PGI作为一种辅助训练的思想，在训练阶段需要额外的辅助可逆分支，这会导致模型在训练阶段的参数量变大很多，且其在检测小目标和效率方面表现不佳。

YOLOv10[37] 由 Wang 等 人 于 2024 年 5 月 推 出 ，YOLOv10 整体架构与 YOLOv6 类似，其标志着 YOLO系列的重大进步。YOLOv10 的主要特点是采用无NMS一对多和一对一组合训练的新方法。该方法通过引入一对一的头（one-to- one head）和一致匹配度量（consistent matching metric），在训练时利用一对多的丰富监督信号，在推理时则使用一对一的头进行预测。这种方法在推理过程中无需使用传统NMS即可确保训练和推理之间的一致性。一对多策略允许对每个真实值进行多次预测，从而提高召回率，而一对一策略通过选择最佳预测来确保精度[38]。除此之外，YOLOv10 对整个架构进行如下改进：

（1）分类头设计为轻量级，减少了分类过程中的计算冗余；

（2）采用空间通道解耦下采样，即在下采样过程中分离空间和通道信息，优化特征提取过程；

（3）采用了大核卷积，大核卷积能够更好地理解图像中对象的上下文，进而提高模型在更大空间区域捕获详细特征的能力；

（4）为增强对全局特征的提取引入自注意模块，该模块结合CSPNet和Transformer并提出了自注意力模块。

YOLOv10通过省略NMS步骤，显著提高了推理速度，如 YOLOv10-S 在与 RT-DETR-R18[10] 相似的 AP 下，速度提升了1.8倍，但是与传统使用NMS的原始一对多训练相比，特别是在小模型中，仍存在一定的性能差距。YOLOv10同样提供了多种预训练模型，来应对在资源受限的边缘设备的应用，但是由于架构的选择，其在重叠物体检测方面的准确性相对较低。

2024年10月提出的YOLOv11[11]是最新的YOLO版本。其特点是采用一种更高效的 C3k2（cross stage par-tial with kernel size 2）模块替换 YOLOv8 中的 C2f 模块，该模块使用两个卷积操作（每个具有2个较小的卷积核），而不是C2f模块中的单一大卷积核，使得在减少参数量和计算复杂度的同时，提升了计算效率和处理速度。其次，针对检测复杂或部分遮挡的物体，引入结合空间注意机制的 CSPNet 的 C2PSA（convolutional blockwith parallel spatial attention）模块，增强了模型在目标关键区域的聚焦能力，还有用于多尺度特征提取的快速空间金字塔池化 SPPF（spatial pyramid pooling-fast）模块。这些改进提高了模型对不同尺度和方向目标的检测能力，尤其是在小目标和重叠目标的检测上表现更为出色。

尽管YOLOv11通过引入C3k2和C2PSA模块提高了对小目标和重叠目标的检测准确性，但同时也增加了一定的实现复杂度，导致更高的训练成本和资源需求，特别是在大规模数据集和复杂场景下。

## 1.1.4 主要改进YOLO模型

PP-YOLO（paddlepaddle YOLO）[39] 于 2020 年 7 月由百度公司在ArXiv上发布。PP-YOLO最初是在YOLOv3的基础上改进而来，并且从YOLOv3开始便随着YOLO主版本逐步更新，如 PP- YOLOv2、PP- YOLOE。PP-YOLOE进行了重大更改，修改了RepVGG并设计了CSP-RepResStage，然后在 TOOD（task-aligned one- stage ob-ject detection）基于分布的回归过程中使用了边界框回归。此外，YOLOv6之后的YOLO系列几乎都遵循上述格式。

YOLOR（you only learn one representation）[40] 于 2021年5月由YOLOv4的同一研究团队Bochkovskiy等人在ArXiv上发表。YOLOR开发了一种多任务学习方法，旨在通过学习一个通用的表示，并使用子网络创建任务特定的表示，为各种任务创建一个单一的模型。由于传统的联合学习方法往往会导致次优的特征生成，YOLOR旨在通过编码神经网络的隐含知识来适用于多个任务，类似于人类如何利用过去积累的旧经验来处理新的问题。YOLOR还在其模型中使用了大型数据集预训练、知识蒸馏、自我监督学习和自我蒸馏技术。到目前为止，使用上述方法训练的YOLOR仍然是所有YOLO系列中最准确的模型。

与PP-YOLO相同，YOLOX[41]同样以YOLOv3为起点，并于 2021 年 7 月由 MegviiTechnology 公司发布在ArXiv上。而YOLOX是在Pytorch上开发的。YOLOX主要特点是提出了 SimOTA（simple online target assign-ment）动态标签分配方法，当多个对象的边界框重叠时，真实标签分配存在歧义，并将分配过程描述为一个最优传输（optimal transport，OT）问题。除此之外，YOLOX还有如下改进：

（1）借鉴 FCOS（fully convolutional one-stage object

detection）模型，引入了无先验架构；

（2）采用解耦的头部，YOLOX将分类置信度和定位精度分离成两个头，一个用于分类任务，另一个用于回归任务，加快了模型收敛。

DAMO-YOLO[42]于2022年11月由阿里巴巴集团在ArXiv上发布。DAMO-YOLO使用了一个不同的网络架构，即大颈部网络和小的分类检测头。其也因此需要一个强大的骨干网络来提取特征，于是采用了阿里巴巴开发的 MAE-NAS（masked autoencoder neural architec-ture search）[43] 方法来自动寻找一个高效的架构，搜索CSPNet和ELAN。通过MAE-NAS方法设计了一个结合 CSPNet 和 EfficientRep 的 CSP-EfficientRep 网络作为骨干网络以及一个可以实时工作称为Efficient-RepGFPN的颈部网络。此外，在训练策略上还使用了知识蒸馏，包括两个阶段，第一阶段教师指导学生，第二阶段学生自主微调。

YOLO-NAS[44]于2023年5月由Deci公司发布，YOLO-NAS是一种基于神经架构搜索（NAS）的YOLO检测器，主要用于检测小目标，提高定位精度与计算性能，使YOLO适用于实时边缘设备应用。该模型主要特点是使用了量化感知模块[45]，称为 QSP（quantization-sensitivepruning）和 QCI（quantization- compatible inference），结合重新参数化进行8位量化，来尽量减少训练后量化过程中的精度损失。

为了进一步提高检测精度以及定位精细度，浙江大学的 Zhou 于 2024 年 3 月提出了 YOLO-NL（you onlylook once and none left）[46] 。YOLO-NL 的主要特点是提出一种以特定的锚点分配标签的全局动态标签分配策略。为了增强复杂场景中多尺度目标的检测能力，还使用最短-最长梯度策略和自注意力机制分别升级了CSPNet 和 PANet（path aggregation network）模块。同时为了提升检测速度，提出了重新参数化方法的 Rep-CSPNet 网络，将残差卷积转换为Ghost 卷积。这些改进虽然大幅提高了模型的检查精度，但是模型复杂度也随之升高，计算资源以及部署成本都大大增加。

由于 YOLO 存在的信道信息丢失和感受野缺失的问题，Su等人设计了一种保持原始维度的YOLO算法——MOD-YOLO（maintain original depthwise you onlylook once）[47]。该模型主要特点是设计了保持原始信息的深度可分离卷积（maintain original depthwise separa-ble convolution，MODSConv）来解决经典深度可分离卷积中通道间信息交互的问题。提出融合全局背景信息和显著信息与局部信息的全局感受野空间金字塔池化快速模块（global receptive field-spatial pyramid poolingfast，GRF-SPPF）以及显著性与平均特征坐标注意力机制 模 块（dual attention fusion with coordinate attention，DAF-CA），引入显著性信息使注意力权重分配更加合理。尽管MOD-YOLO在特定数据集上展示了良好性能，但其泛化能力较弱。

## 1.1.5 YOLO系列分析总结

根据YOLO各个版本的骨干网络和颈部网络以及所使用的框架不同，整理如表1所示。YOLOv1提出了第一个单阶段无锚点目标检测架构。YOLOv2中引入了锚框，改进了对象定位并实现了高准确率。YOLOv3设计了基于 ResNet 的 backbone 和基于 FPN 的颈部网络，而YOLOv4设计了基于CSPNet的骨干网络和基于PANet的颈部网络，二者分别集成了当时最先进的技术为后续的YOLO系列版本奠定了主要架构。YOLOv6提出了包括anchor box 和 decoupled head 等概念。YOLO-v7主要关注于架构的改革，通过减少遮挡和微小目标检测问题来构建基于ELAN的骨干网络，从而成为当今的主流架构。YOLOv8 旨在通过引入 C2f 模块负责使用两个卷积层查找语义分割，进而来解决以前版本中检测精度较低的问题。而最新的YOLOv10，它提出在标签分配中加入一对一的匹配机制，然后设计了端到端的单阶段目标检测器。YOLOX将FCOS的无锚头引入

表1 YOLO系列主要版本结构  
Table 1 Main version structure of YOLO series
<table><tr><td>模型版本</td><td>骨干网络</td><td>颈部</td><td>框架</td></tr><tr><td>YOLOv1[6]</td><td>Darknet-24</td><td>1</td><td>原生Darknet</td></tr><tr><td>YOLOv2[22]</td><td>Darknet-19</td><td>Passthrough layer</td><td>Darknet</td></tr><tr><td>YOLOv3[23]</td><td>Darknet-53</td><td>FPN</td><td>Darknet</td></tr><tr><td>YOLOv4[26]</td><td>CSPDarknet-53</td><td>SPP+PANet</td><td>Darknet</td></tr><tr><td>YOLOv5[29]1</td><td>Focus+CSP Darknet</td><td>PANet</td><td>PyTorch</td></tr><tr><td>YOLOv6[30]</td><td>CSP Darknet</td><td>PANet</td><td>PyTorch</td></tr><tr><td>YOLOv7[33]1</td><td>E-ELAN</td><td>PANet</td><td>PyTorch</td></tr><tr><td>YOLOv8[35]</td><td>CSPDarknet-53</td><td>PANet</td><td>PyTorch</td></tr><tr><td>YOLOv9[36]</td><td>GELAN</td><td>PANet</td><td>PyTorch</td></tr><tr><td>YOLOv10[37]</td><td>CSPDarknet-53</td><td>PANet</td><td>PyTorch</td></tr><tr><td>YOLOv11[11]</td><td>C3k2</td><td>改进的PANet</td><td>PyTorch</td></tr><tr><td>PP-YOLO[39]</td><td>ResNet</td><td>FPN</td><td>PaddlePaddle</td></tr><tr><td>YOLOR[40]</td><td>CSPDarknet-53</td><td>PANet</td><td>PyTorch</td></tr><tr><td>YOLOX[41</td><td>CSPDarknet-53</td><td>PANet</td><td>PyTorch</td></tr><tr><td>DAMO-YOLO[42]</td><td>CSP-EfficientRep</td><td>Efficient- RepGFPN</td><td>PyTorch</td></tr><tr><td>YOLO-NAS[44]</td><td>神经架构搜索(NAS）P</td><td>PANet</td><td>PyTorch</td></tr><tr><td>YOLO-NL[46]</td><td>Rep-CSP Net</td><td>改进的PANet</td><td>PyTorch</td></tr><tr><td>MOD-YOLO[47]</td><td>MOD-CSP Net</td><td>GRF-SPPF、 DAF-CA</td><td>PyTorch</td></tr></table>

YOLO机制，开启了YOLO系列在无锚方向的研究。PP-YOLOE进一步使用TOOD基于分布的预测头来增强无锚点头的设计，从而成为后续的主流预测头。

总体上，YOLO系列变得更快更强也更简单，YOLO提出后，原来许多需要使用多阶段和自下而上方法的算法转变为端到端、自上而下的单阶段算法，使检测框架变得更快。YOLO通过巧妙的设计（如YOLOv3的SPP模块）将特殊模块转换为结构简单的模块，使得其可以部署在各种计算设备上。YOLO系列模型将伸缩方式直接集成到框架中，在执行模型缩放时不需要特殊设置，拥有更强的可扩展性。但是，由于YOLO固有的架构限制，其在处理被遮挡的对象、检测小对象和适应不同的部署环境方面仍然面临很多挑战。

## 1.2 SSD

SSD（single shot multi-box detector）[8] 由 Liu 等人于2015年提出。这是基于深度学习的第二个单阶段目标检测器。SSD 与 YOLO 架构区别如图 5 所示。SSD 检测器的主要特点是采用多参考检测方法（multi-referencedetection）。该方法主要思想是首先在图像的每个位置定义一组参考（如锚框、点），然后根据这些参考来预测检测框。SSD为每个特征图位置预设多个Default Boxes（先验框），这些框具有不同的尺寸和宽高比，来匹配不同形状和尺寸的目标。其次采用了多分辨率检测方法（multi-resolution detection），即通过在网络的不同层检测不同尺度的对象，融合了多尺度特征将每层的网络都参与到目标检测中，使得模型显著提高了对不同比例的物体检测精度，特别是弥补了 YOLO 对于一些小物体检测不敏感的缺陷。但是由于SSD卷积层较少，初代的SSD模型缺少对深层信息的提取，限制了模型的检测性能。

针对初代SSD模型缺陷，后续有不少研究者对其进行了改进，如结合了Residual-101与SSD，通过增加反卷积层来引入额外的大规模上下文信息所提出的DSSD（deconvolutional single shot multi-box detector）[48] 。通过引入特征融合模块，连接不同尺度的特征层，然后经过一些下采样块生成新的特征金字塔，提出了FSSD（fea-ture fusion single shot multi-box detector）[49] 。还有引入对比学习思想，通过图像截块的方式随机截取样本图片中的目标图片与背景图片，提高背景和目标在特征空间中的区分度[50]。上海交通大学面向精确检测器提出PSSD（precise single-stage detector）[51] ，除了向 SSD 添加额外的层来改进特征外，还构造了一个简单高效的特征增强模块，来逐步扩展每一层的感受野，进而增强其局部和语义信息；其次设计了一个更高效的损失函数来预测预测框和真实框之间的IoU。

![](Images_PSFFPN9I/c64200da98bf7113a6ea99a6f56ab7d46e63fbcd7ce3b42d7dda3ff951317aef.jpg)  
图5 SSD与YOLO架构对比简图  
Fig.5 Schematic diagram of SSD and YOLO architecture comparison

## 1.3 RetinaNet

虽然单阶段目标检测器既简单又快速，但是其精度一直与两阶段目标检测器相差较大。Facebook AI Re-search（FAIR）的Lin等人[7]发现单阶段目标检测器精度落后的主要原因是在密集检测器的训练过程中遇到极端前景-背景类不平衡，并于 2017 年提出了 RetinaNet。他们认为通过重塑标准交叉熵损失来解决这种类不平衡，使其降低分配给分类良好的样本的损失。为此，RetinaNet 中引入了一个名为“Focal Loss”的新损失函数，使得检测器在训练过程中将更多关注放在困难的、分类错误的实例上。Focal Loss损失函数使得单阶段检测器能够保持极快的实时检测速度的同时实现与两阶段检测器相当的检测精度。FocalLoss损失函数如下：

$$
F L ( p _ { \it \cdot } ) = - \alpha _ { \it \cdot } ( 1 - p _ { \it \cdot } ) ^ { \gamma } \ln p _ { \it \cdot }\tag{1}
$$

式中， ${ \boldsymbol { p } } _ { t }$ 是模型预测的概率，对于正样本 $p _ { t } = p$ ，对于负样本 $p _ { \mathrm { { \ell } } } = 1 - p _ { \mathrm { ~ o ~ } } \alpha _ { \mathrm { { \ell } } }$ 是平衡正负样本权重的超参数。 γ是调节难易样本权重的超参数。通过 $( 1 - p _ { t } ) ^ { \gamma }$ 项，FocalLoss降低了易分类样本的权重，使模型更加关注难分类样本。通过 $\alpha _ { \iota }$ 项，Focal Loss平衡了正负样本的数量差异。总体来讲，RetinaNet虽然提高了对困难分类样本的关注度，但是模型复杂度很高，推理速度也很慢。

## 1.4 FCOS

FCOS（fully convolutional one- stage object detec-tion）[52] 是 Tian 等人于 2019 年在 ArXiv 上提出的，FCOS是一种完全卷积的单阶段目标检测算法。在此之前的大部分目标检测器均需要预定义的锚框（anchor），它摒弃了传统的anchor机制，直接预测每个像素点作为目标中心的可能性以及目标的大小。也因此，FCOS消除了如在训练期间计算交集与并集（IoU）分数等与锚框相关的复杂计算。更重要的是还减少了所有与锚框相关的超参数，这些超参数通常对最终检测性能很敏感。这样的改进既简化了模型的设计，又使FCOS保持了良好的检测性能，但是仍然存在模型复杂度很高对资源受限设备不友好的问题。

后续如Tiny FCOS[53]用轻量级骨干网络与标准化的扩张卷积组构建FPN以及堆叠卷积块的方式将FCOS模型轻量化，使其能直接应用于边缘设备的实时检测。NAS-FCOS[54] 通过引入神经架构搜索（NAS）自动搜索最佳架构来大大减少网络设计中的人工手动操作，进而提高目标检测器性能。

## 1.5 EfficientDet

EfficientDet[55] 是 一 种 高 效 的 目 标 检 测 模 型 ，由Google团队于2020年开发。它提出了一种复合缩放技术，可以同时统一缩放所有骨干、特征网络和盒/类预测网络的分辨率、深度和宽度，进而实现了高性能和高效率的目标检测。EfficientDet 基于 EfficientNet[56] 骨干网络，并提出了一种加权双向特征金字塔网络（bi-directionalfeature pyramid network，BiFPN），通过精简快速地在多尺度特征图之间进行双向特征融合显著提高了模型的精度和效率，进一步提高了特征的丰富性和层次性。这些改进使得EfficientDet在资源限制的情况下始终优于现有模型技术。

TransEffiDet[57] 通过引入 Transformer 对特征图的长期依赖关系建模，将 EfficientDet 算法与 Transformer 相结合来改进 EfficientDet 算法。采用 EfficientDet 作为骨干网络，它可以有效地融合不同尺度的特征图，使用Deformable Transformer 提取全局特征信息，进而使得模型整体的检测精度提高，但是随之而来模型复杂度也增高。

## 1.6 CenterNet

CenterNet[58]是一种基于关键点检测的目标检测模型，由Zhou等人于2019年提出。CenterNet将目标检测问题转化为关键点检测问题，通过检测每个物体中心的关键点，根据中心点的位置和尺度信息生成边界框来实现高效的目标检测。CenterNet将每个目标检测任务视为三元组，而不是一对关键点，从而提高了精度和召回率。CenterNet使用堆叠的hourglass网络模块作为骨干网络，增强多尺度特征的提取。采用这种方法同样避免了传统的锚框机制，不仅简化了模型结构，还提高了检测精度和速度。

CenterNet 的局限性是主要依赖于中心点的检测，对于小目标，中心点的定位会不够准确。此外当检测目标非常密集时，中心点之间的距离非常接近，导致模型难以区分不同的目标。此外，所使用的hourglass骨干网络的计算量较大，在资源受限的设备上，训练过程会比较慢，需要较多的计算资源，对部署在边缘设备很不友好。

## 1.7 CornerNet

CornerNet[59]是一种首次采用关键点预测的无锚框单阶段目标检测器，由Law和Deng于2018年提出。该模型主要特点是使用单个卷积神经网络将对象边界框检测为一对关键点，即左上角和右下角，并将它们分组以形成最终检测到的边界框。将目标检测转变为成对的关键点，进而无需设计锚框省去了很多手工设计步骤以及减少了超参数的数量。但是，CornerNet需要更复杂的后处理来对属于同一对象的角对关键点进行分组，为了分组需要学习额外的距离度量。

为了解决上述问题，作者又于2019年提出CornerNet-Lite[60] 。CornerNet-Lite 是由使用注意力机制不需要详尽处理图像的所有像素的 CornerNet-Saccade 以及引入了紧凑骨干架构的 CornerNet-Squeeze 两种高效变体的组合而成。这两种变体共同使得CornerNet-Lite在不牺牲准确性的情况下提高效率。

CornerNet系列的局限性也是由于其特点而来，因为其只关注边缘和角点，当边界框的角点落在了对象信息之外，其就会缺失对象内部特征信息，进而影响检测精度。

## 1.8 RTMDet

为了设计一种超越YOLO系列的更高效实时单阶段目标检测器，Lyu等人于2022年在ArXiv上发表了RTMDet（real-time models for object detection）[61] ，该模型的主要创新如下：

（1）模型架构上，在骨干网络和颈部网络中使用大核深度卷积作为基本构建模块，显著提升对全局上下文的建模能力，同时降低计算开销。

（2）标签分配上，在计算动态标签分配中的匹配成本时，引入了动态软标签分配策略（dynamic soft labelassignment）代替原有硬标签，改善了标签匹配的稳定性和准确性，尤其对高质量匹配的目标效果显著。

（3）训练策略上，使用缓存机制减少数据加载需求，加快训练速度。

RTMDet检测器在COCO数据集上AP达到了52.8%，在GPU NVIDIA 3090上实现了300多FPS，性能优于当时主流的工业检测器。此外，RTMDet在旋转目标检测任务上也取得了最先进性能，如在DOTA v1.0数据集上达到了 81.33%的 AP。虽然该模型拥有优越的速度与精度平衡，但其使用的优化策略以及大核卷积的使用对训练设备的算力要求较高，不适合资源有限的环境，而且尽管RTMDet 提升了全局上下文建模能力，但在小目标检测上的性能与部分两阶段检测器相比仍有差距。

## 1.9 总结分析

在使用以经典卷积为架构的单阶段目标检测器中，YOLO系列以其实时性和端到端训练著称。YOLO基于网格的方法不需要进行区域建议的步骤，通过端到端、自上而下的训练，直接从图像像素预测边界框和概率，从而大大提高了计算效率，适合实时应用，但缺陷是在复杂场景下（如被遮挡的对象、检测小目标等）的检测精度较低。SSD也像YOLO一样预测多个边界框，但它使用一组不同比例和纵横比的预定义默认框（或锚点），即通过在网络的不同层检测不同尺度的对象，融合了多尺度特征将每层的网络都参与到目标检测中，使得模型显著提高了对不同比例的物体检测精度，特别是弥补了YOLO对于一些小物体检测不敏感的缺陷，但是其卷积层数较少缺少对深层语义信息的提取。RetinaNet针对小目标的检测精度低问题，引入了Focal Loss损失函数和FPN特征提取层，虽然提高了对困难分类样本的关注度，但是模型复杂度很高，其与YOLO、SSD相比推理速度较慢，进而在边缘设备上的性能表现有限。而FCOS是一种完全卷积的单阶段目标检测算法，采用无锚点和中心点预测，简化了模型结构并提高了精度，使得整体的参数量下降，但与上述模型相比其推理速度相对较慢。EfficientDet通过复合缩放可以同时统一缩放所有骨干网络等，以及BiFPN在多尺度特征图之间进行双向特征融合提高了特征的丰富性和层次性，进而实现了高性能和低计算成本的平衡，但模型训练时间长、收敛慢。此外，CenterNet 和 CornerNet 均采用无锚点方法，分别通过中心点和角点检测提高精度，适合更高精度的检测任务且二者均保持速度与精度的平衡，但是前者对中心点定位精度需求较高使得需要更多的计算资源，而后者容易缺失对象内部特征信息。RTMDet拥有高效的结构设计，使用大核卷积使得其拥有更全面的全局信息，动态软标签的策略使得标签的分配更加稳定且准确，但大核卷积对训练设备算力要求高，同时也意味着其对小目标检测存在一定的挑战。

## 2 以Transformer为架构的单阶段检测器

近年来，Transformer已经深深地影响了整个深度学习领域，Transformer摒弃了传统卷积算子偏向于注意力的单独计算，来克服传统卷积神经网络的局限性，获得全局尺度的感受野。而从 ViT（vision transformer）[62] 的提出开始Transformer由自然语言处理领域正式进入计算机视觉领域，进而其为目标检测领域也引入了新的范式。

## 2.1 DETR

DETR 是由 Facebook AI Research 的 Carion 等人[9]于2020年在ECCV上提出的首个基于Transformer的端到端目标检测模型，其架构如图6所示。DETR主要特点是通过将目标检测问题转化为集合预测问题，消除了对许多手动设计组件（如非极大值抑制操作或锚点生成）

的需求，使用Transformer的编码器-解码器结构来处理图像特征和生成边界框。此外，DETR引入了位置编码和匈牙利匹配算法（二分匹配算法），确保了每个预测结果与真实标签的一对一匹配，避免了传统目标检测中的重复检测问题。DETR的优势是端到端的训练过程和强大的全文建模能力，使其能够在复杂场景中取得良好的检测效果。而且由于自注意力机制执行的全局信息处理，其在大型物体上的检测性能也明显优于常见的两阶段检测器Faster R-CNN。同样DETR的缺点也很明显，那就是引入Transformer使得训练收敛很慢；其次是Transformer关注于全局的信息特征，对细粒度特征不敏感，因此其对小物体检测性能差。

此外，随着DETR的提出，传统的目标检测框架被打破，以及Transformer对全局特征提取的突出优势，越来越多的学者从不同角度分别对原始的DETR进行改进。

## 2.2 Deformable DETR

针对注意力机制的改进，Zhu等人[63]借鉴DCN的思想在ICLR2021上提出了Deformable DETR。其通过引入可变形卷积（deformable convolution）和可变形注意力机制（deformable attention）来解决原始 DETR 收敛时间长和对小目标检测性能有限的问题。所谓可变形卷积是在每个卷积核位置上添加一个偏移量，这些偏移量是通过另一个卷积层学习得到的。动态调整卷积核的位置，使得卷积操作能够适应不同尺度和形状的目标，从而提高了模型对不同尺度和形状目标的适应能力，增强了特征提取的灵活性。而可变形注意力机制是在Transformer 解码器中，每个查询向量（query vector）通过可变形注意力机制选择一组参考点和采样点，这些点用于计算注意力权重。动态选择参考点和采样点，使得注意力机制能够更高效地捕捉图像中的关键信息。这样做显著减少了计算复杂度和内存消耗，从而加快模型的收敛。但是与原始DETR相比，Deformable DETR引入了更复杂的注意力机制和多尺度特征处理，模型结构变得更复杂，增加了模型的实现难度且依赖高质量的标注数据。

![](Images_PSFFPN9I/f6b04f6d9bc643cb389a31dc70d00c6a9eba3a3137ec5d643f705717062e8583.jpg)  
图6 DETR架构图  
Fig.6 Architecture of DETR

## 2.3 Dynamic DETR

同样针对注意力机制改进，Dynamic DETR[64] 是由Dai等人于2021年发表在ICCV 2021大会上。DynamicDETR同样是解决原始DETR对于小目标检测较差与模型收敛过慢两个问题进行改进的，其主要是引入动态查询机制和 ROI（region of interest）的动态注意力模块，针对小目标检测较差的问题提出动态查询机制。在每个解码器层中，查询向量通过一个动态调整模块进行更新，该模块考虑了编码器特征和前一层的查询向量，这样做更好地适应不同尺度和形状的目标。针对模型收敛较慢的问题，提出在Transformer解码器中使用基于感兴趣区域（ROI）的动态注意力模块代替交叉注意力模块。这样的解码器能够使Transformer以从粗到细的方式专注于感兴趣的区域，大大降低了学习难度，从而减少训练 epoch 来实现更快的收敛。但引入动态特征提取后，模型的参数更多且结构更为复杂，对超参数调整的敏感性增加。需要在训练中进行细致的参数调优，才能使模型性能达到最佳状态且依赖大规模训练数据。

## 2.4 Conditional DETR

针对解码器特征信息之间交互，Conditional DETR[65]是通过引入条件空间查询来提高DETR的性能和效率。其具体做法是从解码器嵌入中学习条件空间查询，用于解码器多头交叉注意力，通过条件空间查询，使得每个交叉注意力头都能够关注包含不同区域的缩小了定位对象分类和框回归的空间范围，从而简化了训练。此外，条件注意力机制（conditional attention）还为每个查询向量生成一组动态注意力权重，这些权重用于计算注意力机制，每个查询向量通过条件注意力机制选择最相关的特征。这样设计使得模型在目标定位和检测方面更精确，减少了查询和目标之间的模糊匹配问题，提高了整体的检测性能。但其对高分辨率图片的处理有限，在处理高分辨率图片时，Conditional DETR由于计算复杂度限制无法直接应用。

## 2.5 DAB-DETR

同样针对解码器特征信息之间交互，DAB-DETR（dynamic anchor boxes detection transformer）[66] 是 Liu 等人于2022年提出的。该模型主要改进是通过在DETR框架中添加可学习的锚点框，直接使用检测框坐标作为Transformer解码器中的查询，并逐层动态更新它们。使用检测框坐标不仅有助于每个查询（query）都有更好的位置先验，而且还可以使用检测框的宽度和高度信息来调制位置注意力图。这样的设计改善了DETR的收敛慢问题，使定位更准确，显著减少了训练时间，但主要缺点还是依赖复杂的多层Transformer结构，对计算资源需求较高。

## 2.6 DN-DETR

针对标签匹配方式，Li等人于2022年在CVPR上发 表 了 DN- DETR（denoising detection transformer）[67] 。他们认为DETR收敛缓慢是由于二分图匹配的不稳定性造成的，这也是早期训练阶段的优化目标不一致的原因。因此，该模型继续使用DAB-DETR所提出的坐标查询方式，在训练过程中，采用了一种新的噪声引导查询（deformable queries），通过向查询中加一些带有噪声的负样本，学习去除这些噪声干扰，从而引导模型更好地学习目标分布，加速模型的目标匹配过程。这样设计能够加速模型收敛并显著改善检测精度以及鲁棒性，特别是在小物体的识别上效果明显，缺点就是加入噪声后的查询需要精心调节，不同数据集和任务需要重新设置。

## 2.7 DINO

借鉴了前期 Deformable DETR、DAB-DETR、DN-DETR等模型，Zhang等人于2022年发布了DINO（DETRwith improved denoising anchor boxes）[68] 。DINO 集成了上述模型的优点，引入了一种新的对比方式进行去噪训练，通过在训练过程中动态调整锚框的位置和大小，提高了模型训练的收敛速度。同时采用了4-scale和5-scale两种多尺度特征融合策略，有效提升了对不同尺度目标的检测性能。DINO在性能和效率上优于以前的类DETR的模型，但是其结构也更加复杂，计算成本较高，推理速度较慢，不适合实时应用。

## 2.8 SD-DETR

SD-DETR（spatially decoupled DETR）[69] 是由香港中文大学的 Zhang 等人于 2023 年发表在 ICCV 上的空间解耦DETR。通过解耦特征学习对分类和定位过程进行分离，减少两者间的干扰，解决了DETR中分类和定位任务之间的特征和预测错位的问题。SD-DETR还引入了任务感知查询生成模块和任务对齐损失用于分类和回归，分别对分类和定位进行独立优化，对特征图中的不同感兴趣区域适合执行查询分类和检测框局部化任务。这样设计解决了错位问题并减少任务之间的冲突，提升检测精度和稳定性，特别是对密集目标或小目标表现更好，还加速了模型的收敛速度。缺点就是模型结构变得更加复杂，计算量有所增加，特别是在查询数量增加的情况下，对内存和计算资源的需求较高。

## 2.9 DA-DETR

以往的DETR均未用于无监督领域自适应目标检测，Zhang 等人受独特的 DETR 注意力机制的启发于2023 年在 CVPR 上发表了 DA-DETR（domain adaptiveDETR）[70]，在DETR框架中引入信息融合实现从标记的源域到未标记的目标域的有效知识转移。该模型的核心是一个CNN-Transformer混合器（CT Blender），它巧妙地融合了CNN特征和Transformer特征以实现有效的特征对齐和跨域知识转移。CT Blender包含两个连续的融合组件：分裂-融合（split-merge fusion，SMF）和多尺度融合（scale-aware fusion，SAF）。前者在图像内融合CNN 和 Transformer 特征，后者跨多个特征尺度融合SMF特征。与现有的权重和求和融合策略不同，SMF首先根据Transformer头部捕获的语义信息将CNN特征分成多组，然后通过通道混洗进行有效信息交流。SAF将每个尺度的SMF特征聚合，融合了跨多个特征尺度的语义和定位信息。这样的设计相较传统领域适应方法，更具简洁性，减少了手动设计的参数依赖，表现出更高的适应性和检测精度。但是模型训练依赖对抗学习，在训练过程中表现出不稳定性，另外由于Transformer架构在计算成本上依然高于普通的目标检测模型。

## 2.10 Lite DETR

由于DETR的计算复杂性普遍较高，为了解决在资源受限设备上的应用，Li等人于2023年在CVPR上发表了 Lite DETR[71]。由于在多尺度特征中的 token 数量过多，特别是大约 75%的低级特征，计算效率非常低，Lite DETR通过设计一个高效的编码器块，用交错的方式更新高级和低级特征，显著减少了检测头的计算量，同时保持了99%的原始性能。此外，引入的关键感知变形注意力（key-deformable attention，KDA）增强了跨尺度特征融合，进一步提升了小目标的检测性能。这些改进使得Lite DETR将计算量减少了60%，在较低的计算消耗下仍能保持良好的检测性能且易于集成到现有的DETR模型中。尽管总体性能保持稳定，但与标准的高分辨率特征图相比，Lite DETR在小物体检测方面的精度有所下降。

## 2.11 Focus-DETR

Focus-DETR[72]是Zheng等人于2023年发表在ICCV上的，它通过在编码器中引入双重注意力机制和基于多尺度特征图的token评分系统，专注于更有信息量的token，以实现计算效率和模型准确性之间的更好平衡。该模型通过前景token选择器（foreground token selector，FTS）和多类别得分预测器，精确选择前景和细粒度对象token进行增强，从而在减少冗余计算的同时提高DETR类模型的性能。Focus-DETR的前景打分机制在选择token时仍依赖多尺度特征和一定的前景背景分割，会导致部分对象检测的误差，因此在复杂场景下会出现漏检问题。

## 2.12 RT-DETR

RT-DETR（real-time DETR）[10] 是百度公司于 2023年充分利用DETR无后处理的优势提出的首个实时端到端目标检测器。DETR通过设计高效的混合编码器处理多尺度特征。该高效的混合编码器通过AIFI（attention- based intrascale feature interaction）模块和 CCFM（cross-scale feature-fusion module）模块对多尺度特征进行交互与融合，使得模型可以高效地提取和处理图像的多层特征，从而降低计算复杂度。此外，还提出了IoU感知查询选择，该方法可以智能选择与物体相关的特征区域作为初始查询，使得模型在识别对象时更精确进而提高解码器的初始对象查询质量。总体来讲该模型不仅在速度和准确性上超越了现有的实时检测器，而且还避免了非极大值抑制（NMS）带来的延迟，实现了稳定的推理速度。但RT-DETR的编码器设计较为复杂，引入了多个跨尺度特征交互模块，尽管提高了检测效率，但也增加了实现难度和对计算资源的需求，在低端设备上会受限，此外其在细粒度的精度不足。

## 2.13 MS-DETR

MS-DETR（mixed supervision DETR）[73] 是百度公司于2024年在CVPR上提出的一种提高DETR训练效率的方法。传统DETR模型依赖于一对一监督，这种方法会为每个目标匹配唯一的预测框，而MS-DETR则仅在用于推理的主要解码器的对象查询上增加了一对多监督，为每个目标提供多个候选框，从而提高了模型对高质量候选框的生成能力。MS-DETR通过混合一对一和一对多的监督来显式指导对象候选生成过程，与现有的采用一对多监督的DETR变体相比，MS-DETR不需要额外的解码器分支或对象查询，主要解码器中的对象查询直接受益于一对多的监督，因此在对象预测方面表现更优。此外，采用混合监督显著增加了具有较高IoU的预测框数量，使模型在多目标检测任务中更具鲁棒性。MS-DETR的主要优点在于能够更好地捕获复杂场景中的小目标和重叠目标，提供更多高质量的预测框，并且不需要额外的后处理步骤如NMS。然而，由于采用混合监督，其训练时间和内存占用有所增加。

## 2.14 DEYO

由于DETR拥有和两阶段检测器相当的检测精度，同时Transformer架构在图像分类领域产生的巨大影响，DETR因此被很多研究者视为能与YOLO相媲美的单阶段检测器。为此，Ouyang于2024年提出了DEYO[74]，即DETR与YOLO相结合的单阶段检测模型。DEYO采用了一种创新的分步训练策略，首先利用YOLOv8进行预训练来初始化模型的骨干和颈部网络，然后在第二阶段冻结这些部分并专注于训练基于Transformer的解码器。这种逐步训练方法不仅提升了模型性能，还显著降低了训练成本，加快了模型的收敛。

## 2.15 总结分析

目前为止，单阶段目标检测器发展较为迅速的是以经典卷积为架构的YOLO系列与引入Transformer架构的DETR系列。YOLO系列具有实时性、兼容性高、速度快、简单高效等特点，而DETR系列利用Transformer结构和集合预测，具有高精度和鲁棒性，但后者总体而言训练时间较长、计算资源需求高且推理速度较慢，如Deformable DETR在COCO数据集的AP为46.2%，参数量为 $4 . 0 \times 1 0 ^ { 7 }$ ，速度为19 FPS。而同年发布的YOLOv5-M在 COCO 数 据 集 上 的 AP 比 其 低 0.8 个 百 分 点 ，为45.4%，参数量却仅为 $2 . 1 2 \times 1 0 ^ { 7 }$ ，降低了47%，同时速度为 182 FPS，检测速度也是其 9 倍多。针对实时检测DETR系列提出了RT-DETR，文献[10]详细阐述了DETR系列在实时检测领域击败了YOLO系列，在参数量与FPS 相差无几的情况下，RT-DETR 以 AP 为 54.3%的高精度击败了AP为53.9%的YOLOv8-X，由此可见DETR仍然有很大的提升空间。

总体来看，YOLO系列与DETR系列都在如火如荼地进行迭代。YOLO系列由于速度的领先性以及成熟的工具链，它能够快速且广泛应用到工业界，而DETR采用的 Transformer 架构能够捕获全局上下文信息，使得它的检测精度很高。同时Transformer架构在自然语言处理以及图像分类领域带来革命性的改变，证明其拥有很大的提升空间，在学术界反响很大。

将上文所提到的两种架构模型的特点优势以及局限性整理如表2所示。

## 3 数据集与评价指标

## 3.1 常用数据集

## 3.1.1 ImageNet

ImageNet[75] 是一个大规模图像识别数据集，Image-Net包含了超过1 400万张标注图像，这些图像覆盖了21 841个类别。ImageNet的主要特点是规模庞大、类别丰富，广泛用于评估和推动计算机视觉领域的发展。ImageNet 包括 5 个版本：ImageNet 2009 主要用于图像分类任务；ImageNet 2012引入了ILSVRC大赛，包括图像分类、目标检测和视频分类任务；后续 ImageNet

表2 主要单阶段检测器优缺点分析  
Table 2 Analysis of advantages and disadvantages of main one-stage detectors
<table><tr><td>类型</td><td>模型</td><td>发布 时间</td><td>特点优势</td><td>局限性</td><td>应用场景</td></tr><tr><td rowspan="7">以经典卷积为 架构的单阶段 检测器</td><td></td><td></td><td>YOLO系列实时性、端到端训练、自上而 对小目标检测精度较低,难以处 农业检测、生物个体检测、 YOLO系列2016下、兼容性高、速度快、简单高效,应用广 理复杂背景,初期模型复杂度高 交通检测、UAVs检测、3D 泛且工具链成熟</td><td>难以应对资源受限设备上的应用</td><td>目标检测、实时视频分析等</td></tr><tr><td>SSD[8]</td><td>2016</td><td>多参考检测与多分辨率检测、高效性、速 度快、泛化能力强、适应边缘设备部署</td><td>卷积层数较少缺少对深层语义信 息的提取,模型检测精度较低</td><td>言交通检测、农业检测、实时 视频分析等</td></tr><tr><td>RetinaNet7]</td><td>2017</td><td>引人Focal Loss损失函数,增加FPN结 构,提高模型精度</td><td>推理速度很慢,模型复杂度高</td><td>小目标检测、工业检测、生 物个体检测等</td></tr><tr><td>FCOS[52]</td><td>2019</td><td>无锚框,使用中心点预测替换锚框机制，推理速度慢,模型计算复杂度高 安防监控、工业检测、高精 降低计算复杂度提高精度</td><td>对资源受限设备不友好</td><td>度检测等</td></tr><tr><td>EfficientDet5s] 2019</td><td></td><td>引入复合缩放、加权双向特征金字塔 模型复杂度高,训练时间长,对小 移动设备、嵌入式系统、 (BiFPN)网络,模型轻量灵活性强</td><td>目标检测不敏感</td><td>UAVs检测等</td></tr><tr><td>CenterNet[58]</td><td>2019</td><td>无锚点,将检测任务视为三元组,使用中 心点预测,速度与精度达到平衡</td><td>对小目标的中心点定位不够准确， 训练时间长,需要较多的计算资 源,对部署在边缘设备很不友好</td><td>3D 目标检测、生物个体检 测、交通检测、农业检测等</td></tr><tr><td>CornerNet[59]</td><td>2018</td><td>无锚点,将检测转变为角点检测（成对的 对角关键点),多尺度检测,精度高</td><td>容易缺失对象内部特征信息,需 要对属于同一对象的角关键点进 行分组使得模型计算复杂度增高</td><td>交通检测、生物个体检测、 农业检测等</td></tr><tr><td>RTMDet[61]</td><td>2022</td><td>使用了大核深度卷积提升了对全局上下 大核卷积的使用对训练设备的算 文的建模能力,引入了动态软标签分配 力要求较高，不适合资源有限的 3D目标检测、生物个体检 策略改善了标签匹配的稳定性和准确 环境,在小目标检测上的性能与 测、高精度检测等</td><td>性,尤其对高质量匹配的目标效果显著部分两阶段检测器相比仍有差距</td><td></td></tr><tr><td>类型</td><td></td><td>发布 模型 时间</td><td>特点优势</td><td>局限性</td><td>应用场景</td></tr><tr><td rowspan="7">以 Transformer</td><td>DETR[9]</td><td></td><td>首次引人 Transformer结构、使用集合预 2020 测、匈牙利匹配、精度高、鲁棒性强、建模 能力和可解释性强</td><td>计算资源需求高,Transformer关 注于全局的信息特征对细粒度特 3D目标检测、医疗影像、生 征不敏感,小物体目标检测性能 物个体检测、高精度检测等 差,推理速度慢</td><td></td></tr><tr><td>Deformable DETR[63]</td><td>2020</td><td>引人可变形卷积（deformable convolu- tion）和可变形注意力机制（deformable attention)减少DETR收敛时间和提高对 小目标检测性能</td><td>模型结构更加复杂、更加难以实 现,且依赖高质量的标注数据,计 算成本高</td><td>医疗影像、生物个体检测、 高精度检测等</td></tr><tr><td>Dynamic DETR[64]</td><td></td><td>针对小目标检测较差,引入动态查询机 依赖大规模训练数据,对超参数 2021 制;针对模型收敛较慢的问题,提出ROI 调整的敏感性增加,模型计算成 的动态注意力模块</td><td>本高</td><td>医疗影像、生物个体检测、 高精度检测等</td></tr><tr><td>Conditional DETR[65]</td><td>2021</td><td>引人条件空间查询简化了训练以及条件 对高分辨率图片的处理有限,模 医疗影像、生物个体检测、 注意力机制增强特征提取</td><td>型计算成本较高</td><td>高精度检测等</td></tr><tr><td>DINO[68]</td><td>2022</td><td>引入了一种新的对比方式进行去噪训 练,提高了模型训练的收敛速度;采用4-结构更加复杂,计算成本较高,推 交通检测、医疗影像、生物 scale 和5-scale两种多尺度特征融合策理速度较慢,不适合实时应用 略提升不同尺度目标的检测性能</td><td></td><td>个体检测、高精度检测等</td></tr><tr><td>DN-DETR[67]</td><td>2022</td><td>采用了一种新的噪声引导查询,加速模 型的目标匹配过程进而加速模型收敛</td><td>加入噪声后的查询需要精心调 节,不同数据集和任务需要重新 设置,模型复杂计算成本高</td><td>医疗影像、生物个体检测、 高精度检测等</td></tr><tr><td></td><td></td><td>添加可学习的锚点框,直接使用检测框 DAB-DETR[6]2022 坐标作为 Transformer 解码器中的查询 并逐层动态更新</td><td>依赖复杂的多层 Transformer结农业检测、医疗影像、生物 构,对计算资源需求较高</td><td>个体检测、高精度检测等</td></tr><tr><td rowspan="8">为架构的单阶 段检测器</td><td>SD-DETR[69]</td><td></td><td>引人解耦特征学习对分类和定位过程进 模型结构变得更加复杂,计算量 2023 行分离,减少分类和定位任务之间的特 有所增加,对内存和计算资源的</td><td></td><td>医疗影像、生物个体检测、 高精度检测等</td></tr><tr><td>DA-DETR[70]</td><td></td><td>征和预测错位的问题 引入信息融合CTBlender模块来实现从 训练依赖对抗学习,在训练过程 2023 标记的源域到未标记的目标域的有效知中易出现不稳定性，另外由于</td><td>需求较高 Transformer架构计算成本高</td><td>医疗影像、生物个体检测、 高精度检测等</td></tr><tr><td>Lite DETR[71]</td><td>识转移 2023</td><td>用交错的方式更新高级和低级特征,减 少计算量,引入的关键感知变形注意力 (KDA)增强了跨尺度特征融合,提升小</td><td>与标准的高分辨率特征图相比， Lite DETR在小物体检测方面的 精度有所下降</td><td>医疗影像、生物个体检测、 高精度检测等</td></tr><tr><td></td><td></td><td>目标检测性能 在编码器中引入双重注意力机制和基于前景打分机制在选择 token 时仍 Focus-DETR2023多尺度特征图的token评分系统，专注于依赖多尺度特征前景背景分割， 更有信息量的token</td><td>导致部分对象检测的误差</td><td>医疗影像、生物个体检测、 高精度检测等</td></tr><tr><td>RT-DETR[10]</td><td>2023</td><td>通过AIFI模块和CCFM模块对多尺度特 征进行交互与融合,IoU感知查询选择</td><td>增加了实现难度和对计算资源的 需求,在低端设备上会受限,其在 细粒度的精度不足</td><td>实时视频分析、医疗影像、生 物个体检测、高精度检测等</td></tr><tr><td>MS-DETR[73]2024</td><td></td><td>混合一对一和一对多的监督来显式指导 对象候选生成,增加了具有较高IoU的 由于采用混合监督,其训练时间 医疗影像、生物个体检测、 候选框数量,使模型在多目标检测任务和内存占用有所增加</td><td></td><td>高精度检测等</td></tr><tr><td></td><td></td><td>中更具鲁棒性 采用了一种创新的分步训练策略,利用 YOLOv8预训练来初始化模型的骨干和</td><td>DEYO 的性能在很大程度上依赖</td><td>农业检测、医疗影像、生物</td></tr><tr><td>DEYO[74]</td><td>2024</td><td>颈部网络,第二阶段冻结这些部分并专 注于训练基于Transformer的解码器</td><td>于YOLO的Neck设计,限制了模 型在不同架构下的适应性</td><td>个体检测、高精度检测等</td></tr></table>

2014、ImageNet 2017 和 ImageNet 2021 主要增加了更多的任务和评估指标，更加精细化标注信息。

## 3.1.2 MS COCO

MS COCO（Microsoft common objects in context）[76]是由微软研究院于2014年发布的一个用于目标检测、分割和图像描述的多任务数据集，包含约33万张图像，标注了80个类别和91个分割类别。MS COCO的主要特点是标注详细、任务多样，广泛用于评估和推动多任务学习和目标检测技术的发展。MS COCO目前包括3个版本：初始版本MS COCO 2014包含约33万张图像、80个目标类别，提供边界框、实例分割掩码和关键点标注，支持目标检测、实例分割和关键点检测任务；MSCOCO 2015提高了标注的准确性和一致性，引入了全景分割任务，标注了图像中的每个像素；MS COCO2017增加了更多的实例分割掩码和关键点标注，引入了如不同尺度的mAP等更多详细的评估指标。

## 3.1.3 PASCAL VOC

PASCAL VOC（PASCAL visual object classes）[21] 是一个于2005年首次发布用于目标检测和图像分类的经典数据集，包含20个类别，约2万张图像，每张图像包含多个目标的标注信息，包括边界框和类别标签。PASCALVOC的主要特点是标注准确、任务经典，广泛用于评估和推动早期目标检测和图像分类技术的发展。PASCALVOC 目前存在 3 个版本：PASCAL VOC 2007 包含约9 963张图像，20个目标类别，提供边界框和图像级标签，主要支持目标检测和图像分类任务；PASCAL VOC2010进一步增加图像数量，包含约11 540张图像，提高了标注的准确性和一致性，引入了动作分类任务，标注了人的动作；PASCAL VOC 2012增加了更多的图像级标签和边界框标注，使用更先进的标注工具，提高了标注效率和质量，引入了语义分割任务，标注了像素级的类别信息。

## 3.1.4 Open Image

OID（open images dataset）[ 7 7 ] 是一个由 GoogleResearch 实验室主导创建的大规模多标签图像数据集。该数据集包含从互联网上收集的超过900万张图像，并精心标注了600个类别，每张图像包含多个目标的标注信息，包括边界框、实例分割掩码（instance seg-mentation masks）和 图 像 级 标 签（image- level labels）。Open Images主要特点是规模庞大、标注详细，广泛用于评估和推动多标签图像分类和目标检测技术的发展。Open Images存在V1\~V6共6个版本，总体来讲图像数量并未增加，只是标注信息与评估指标有所改进。

## 3.1.5 Objects365

Objects365[78] 是于 2019 年首次发布在 ICCV 上的大规模目标检测数据集，专注于复杂场景中的目标检测任务。数据集包含365个类别，约80万张图像（63万张用作训练集和17万张用作验证集），每张图像标注超过1 000万个目标实例，包括边界框和类别标签。Objects365的主要特点是数据规模庞大、类别丰富、标注精确，涵盖了多种日常场景，尤其关注小目标和长尾分布问题。Objects365 目前有 3 个版本：Objects365 Full包含约80万张图像和365个类别，适合需要大规模数据训练的研究任务，主要支持目标检测；Objects365 Tiny包含约8万张图像（约为完整数据集的1/10），适合快速实验与模型验证，同时保留了类别多样性；Objects365Challenge为竞赛设计的版本，从完整数据集中筛选了高难度样本，专注于评估模型在复杂场景中的性能，支持目标检测竞赛任务。

## 3.1.6 数据集分析

ImageNet规模极为庞大，含超1 400万张图像、2万多类别，侧重于图像分类标注，类别丰富繁杂，图像来源广，复杂度高，有助于单阶段检测器学习通用特征与语义信息；而MS COCO虽然仅有超33万张图像、80个常见目标类别，但其具备精细实例级标注，源于真实场景，背景复杂、目标尺度差异大，利于检测器打磨精准定位与分类能力，普遍应用于各个检测器的评价；PASCALVOC相对本文提及的另外4个数据集，数据量较小，约2万张图像，20个通用类别，但是该数据集标注清晰，且图片内场景日常、背景干扰少，适合新手调试模型基础架构；Open Image 数据量超 900 万张图像，约 600 个类别，标注丰富还含属性信息，但是图像来自网络，场景杂乱有噪声，有利于提升检测器抗噪与深层语义理解能力；Objects365数据集包含80万张图像以及365个类别，其具有标注精确、场景多样性强的特点，涵盖日常生活中的丰富物体，尤其关注小目标、遮挡和长尾分布问题，贴近真实世界场景，还提供3种版本供不同场景使用，有助于提高模型对小目标的检测性能。

在目标检测任务中，将数据集划分为训练集、测试集和验证集。训练集用于训练模型，即通过反向传播算法调整模型的参数，使模型能够学习到数据中的模式和特征。验证集用于评估模型在训练过程中的性能，帮助选择最佳的超参数（如学习率、正则化参数等），可以及时发现和防止过拟合。测试集用于评估模型在未见过的数据上的最终性能，提供模型泛化能力的可靠估计。表3提供了上述5个通用数据集ImageNet、MS COCO、PASCAL VOC、OID、Objects365 对应训练集、测试集和验证集的划分情况以及各个数据集的类别、尺寸。

## 3.2 评价指标

在早期的目标检测中，并没有被广泛接受的检测精度评价指标，早期的评价指标包括交并补（IoU）、精确率与召回率。这些评价指标简单直观，容易计算，但只能评估单个目标的检测效果。随着目标检测模型检测场景的复杂程度提高，以及多目标检测需求的出现，评价指标也随之更新，如平均精度（average precision，AP）以及平均精度均值（mean average precision，mAP）。

表3 主要数据集划分  
Table 3 Division of main datasets
<table><tr><td rowspan="2">数据集</td><td rowspan="2">类别</td><td rowspan="2">尺寸</td><td colspan="2">训练集</td><td colspan="2">验证集</td><td colspan="2">测试集</td></tr><tr><td>Images</td><td>Object</td><td>Images</td><td>Object</td><td>Images</td><td>Object</td></tr><tr><td>PASCAL VOC 2007[21]</td><td>20</td><td>470×380</td><td>2501</td><td>6301</td><td>2 510</td><td>6307</td><td>4952</td><td>14 976</td></tr><tr><td>PASCAL VOC 2012[21]</td><td>20</td><td>470×380</td><td>5717</td><td>13 609</td><td>5823</td><td>13 841</td><td>10 991</td><td>1</td></tr><tr><td>ImageNet-2014[75]</td><td>21 841</td><td>500×400</td><td>456 567</td><td>478 807</td><td>20121</td><td>55 502</td><td>40152</td><td>\</td></tr><tr><td>ImageNet-201775]</td><td>21841</td><td>500×400</td><td>456 567</td><td>478 807</td><td>20121</td><td>55 502</td><td>65 500</td><td>一</td></tr><tr><td>MS-COCO-2015[76]</td><td>91</td><td>640×480</td><td>82 783</td><td>604 907</td><td>40504</td><td>291 875</td><td>81434</td><td>一</td></tr><tr><td>MS-COCO-2017[76]</td><td>91</td><td>640×480</td><td>118 287</td><td>860 001</td><td>5000</td><td>36 781</td><td>40 670</td><td>1</td></tr><tr><td>OID-2020[77]</td><td>600</td><td>1</td><td>1 743 042</td><td>14 610 229</td><td>41 620</td><td>303 980</td><td>125 436</td><td>937 327</td></tr><tr><td>Objects365-2019[78]</td><td>365</td><td></td><td>600 000</td><td>9 623 000</td><td>38 000</td><td>479 000</td><td>100 000</td><td>170 000</td></tr></table>

## 3.2.1 单目标检测评价指标

混淆矩阵（confusion matrix）是机器学习中用于评估分类模型性能的工具。它通过展示模型在不同类别上的预测结果与真实标签之间的关系，帮助研究者了解模型的分类性能。混淆矩阵通常用于二分类问题，但也可以扩展到多分类问题。混淆矩阵如表4所示，表中真正例表示模型正确地预测了正类，假正例表示模型错误地将负类预测为正类，假负例表示模型错误地将正类预测为负类，真负例表示模型正确地预测了负类。

表4 混淆矩阵  
Table 4 Confusion matrix
<table><tr><td></td><td>预测为正类 预测为负类</td></tr><tr><td>实际为正类 真正例(true positive,TP）假负例(false negative,FN)</td><td></td></tr><tr><td></td><td>实际为负类 假正例(false positive,FP）真负例(true negative,TN)</td></tr></table>

根据混淆矩阵可以计算出机器学习领域模型的3种性能评估指标，精确率、召回率以及F1分数。

精确率（Precision）表示预测为正类的样本中真正为正类的比例，计算如式（2）。

$$
P r e c i s i o n = \frac { T P } { T P + F P }\tag{2}
$$

召回率（Recall）表示所有真正为正类的样本中被正确预测为正类的比例，计算如式（3）。

$$
R e c a l l = { \frac { T P } { T P + F N } }\tag{3}
$$

精确率与召回率均为越高越优，根据精确率-召回率（P-R）曲线可知精确率和召回率的变化关系，通常情况下，随着召回率的增加，精确率会下降，即二者存在一

种权衡关系，不能同时最大化。为了全面评估模型，引入了F1分数（F1-score），其表示精确率和召回率的调和平均值，计算如式（4）。

$$
F 1 ~ - s c o r e = 2 \times \frac { P r e c i s i o n \times R e c a l l } { P r e c i s i o n + R e c a l l }\tag{4}
$$

IoU（intersection over union）是目标检测领域最早和最基本的评价指标之一，同样只能评估单个目标的检测效果。其主要用于衡量预测框和真实框的重叠程度，特点是简单直观、易计算。计算如式（5），其中PB（pre-dicted box）表示预测框，TB（truth box）表示真实框。

$$
I o U { = } \frac { | P B \cap T B | } { | P B \cup T B | }
$$

## 3.2.2 多目标检测评价指标

（5）

多目标检测中常用的评估指标是平均精度（AP），可以定义为各种召回下的平均检测精度，并以某一个特定类别的方式进行评估。AP通过计算精确率-召回率曲线（precision-recall curve）下的面积来衡量模型的性能，计算如式（6）。为了能够评估模型在所有类别上的平均性能，引入所有对象类别的平均值，即平均精度均值（mAP）。mAP由所有类别的AP值加权平均求得。其成为目标检测和相关领域评估的最终指标，计算如式（7），其中N是类别数量，APi是第i个类别的 $A P _ { \subset }$

$$
A P = \int _ { 0 } ^ { 1 } P ( r ) \mathrm { d } r
$$

$$
m A P = \frac { 1 } { N } { \sum _ { i = 1 } ^ { N } } A P _ { i }\tag{6}
$$

（7）

随着目标检测器的不断发展，为了评估模型在不同尺度目标上的性能，AP按照检测目标的大小分为小目标（APS）、中目标（APM）和大目标（APL）。除此之外，设置不同的IoU值将AP值划分为 $\mathrm { A P } _ { 5 ( }$ 0与 $\mathrm { A P } _ { 7 5 }$ 。

为了全面衡量模型，引入了参数量（Params）来衡量模型的大小，每秒执行的十亿次浮点运算数（GFLOPs）来衡量模型计算复杂度以及每秒处理的帧数（FPS）来衡量模型的推理速度。

## 3.2.3 主要单阶段模型分析评估

在COCO数据集上，针对上文提到的部分单阶段检

测器列举其主要版本，依据参数量、FLOPs、FPS、AP等指标分析其精度与速度，对比如表5所示。

表5 主要单阶段检测器性能对比  
Table 5 Performance comparison of main one-stage detectors
<table><tr><td>模型</td><td>版本</td><td>参数量/10</td><td>GFLOPs</td><td>FPS</td><td>AP/%</td><td>AP50/%</td><td>AP75/%</td><td>APs/%</td><td>APM/%</td><td>AP/%</td></tr><tr><td></td><td> $\mathrm { Y O L O v } 2 ^ { [ 2 2 ] }$ </td><td></td><td></td><td>40</td><td>21.6</td><td>44.0</td><td>19.2</td><td>5.0</td><td>22.4</td><td>35.5</td></tr><tr><td></td><td> $\mathrm { Y O L O v } 3 ^ { [ 2 3 ] }$ </td><td></td><td></td><td>45</td><td>28.2</td><td>51.5</td><td>29.7</td><td>11.9</td><td>30.6</td><td>43.4</td></tr><tr><td rowspan="15"></td><td> $\mathrm { Y O L O v } 4 ^ { [ 2 6 ] }$ </td><td></td><td></td><td>38</td><td>41.2</td><td>62.8</td><td>44.3</td><td>20.4</td><td>44.4</td><td>56.0</td></tr><tr><td> $\mathrm { Y O L O v } 5  – \mathrm { M } ^ { \left[ 2 9 \right] }$ </td><td>21.2</td><td>49.0</td><td>122</td><td>45.4</td><td>64.1</td><td></td><td></td><td></td><td>1</td></tr><tr><td> $\mathrm { Y O L O v 6 - M ^ { ( 3 0 ) } }$ </td><td>34.3</td><td>82.2</td><td>179</td><td>49.5</td><td>66.8</td><td></td><td></td><td></td><td>1</td></tr><tr><td> $\mathrm { Y O L O v } 7 ^ { \{ 3 3 \} }$ </td><td>36.9</td><td>104.7</td><td>161</td><td>51.2</td><td>69.7</td><td>55.5</td><td>35.2</td><td>56.0</td><td>66.7</td></tr><tr><td> $\mathrm { Y O L O v 8 x } ^ { \left[ 3 5 \right] }$ </td><td>68.2</td><td>257.8</td><td>283</td><td>53.9</td><td>71.0</td><td>58.7</td><td>35.7</td><td>59.3</td><td>70.7</td></tr><tr><td> $\mathrm { Y O L O v 9 - M ^ { ( 3 6 ) } }$ </td><td>20.0</td><td>76.3</td><td>一</td><td>51.4</td><td>68.1</td><td>56.1</td><td>33.6</td><td>57.0</td><td>68.0</td></tr><tr><td> $\mathrm { Y O L O v 1 0  – M ^ { \left[ 3 7 \right] } }$ </td><td>15.4</td><td>59.1</td><td>211</td><td>51.1</td><td>68.1</td><td>55.8</td><td>33.8</td><td>56.5</td><td>67.1</td></tr><tr><td> $\mathrm { Y O L O v 1 1 m ^ { [ 1 1 ] } }$ </td><td>20.1</td><td>68.0</td><td>213</td><td>51.5</td><td></td><td></td><td></td><td></td><td>丨</td></tr><tr><td> $\mathrm { P P Y O L O E { - } M ^ { [ 3 9 ] } }$ </td><td>23.4</td><td>49.9</td><td>123</td><td>49.8</td><td>67.1</td><td>54.5</td><td>31.8</td><td>53.9</td><td>66.2</td></tr><tr><td> $\mathrm { Y O L O R  – E 6 ^ { [ 4 0 ] } }$ </td><td>115.8</td><td>683.2</td><td>45</td><td>55.7</td><td>73.2</td><td>60.7</td><td>40.1</td><td>60.4</td><td>69.2</td></tr><tr><td> $\mathrm { Y O L O X  – M ^ { \left[ 4 1 \right] } }$ </td><td>25.3</td><td>73.8</td><td>81</td><td>46.9</td><td>65.6</td><td></td><td></td><td></td><td>丨</td></tr><tr><td> $\mathrm { D A M O - Y O L O - M ^ { \left[ 4 2 \right] } }$ </td><td>28.2</td><td>61.8</td><td></td><td>50.4</td><td>67.2</td><td>55.1</td><td>31.6</td><td>55.3</td><td>67.1</td></tr><tr><td> $\mathrm { Y O L O - N A S - M ^ { [ 4 4 ] } }$ </td><td>51.1</td><td></td><td></td><td>51.5</td><td></td><td></td><td></td><td></td><td>一</td></tr><tr><td> $\mathrm { Y O L O - N L ^ { [ 4 6 ] } }$  MOD-YOLO-L[47]</td><td>54.8</td><td>154.6</td><td>125</td><td>53.1</td><td>70.9</td><td>57.3</td><td>32.1</td><td>56.7</td><td>67.5</td></tr><tr><td>SSD300[8]</td><td>44.6</td><td>118.3</td><td>43</td><td></td><td>58.9</td><td>41.9</td><td>15.3</td><td>38.2</td><td>52.5</td></tr><tr><td rowspan="5">SSD</td><td></td><td>24.2</td><td>22.6</td><td>46</td><td>25.1</td><td>43.1</td><td>25.8</td><td>6.6</td><td>25.9</td><td>41.4</td></tr><tr><td>SSD512[8]</td><td>26.5</td><td>49.5</td><td>19</td><td>28.8</td><td>48.5</td><td>30.3</td><td>10.9</td><td>31.8</td><td>43.5</td></tr><tr><td>DSSD513[48]</td><td></td><td></td><td>6</td><td>33.2</td><td>53.3</td><td>35.2</td><td>13.0</td><td>35.4</td><td>51.1</td></tr><tr><td>FSSD300[49]</td><td>一</td><td></td><td>66</td><td>27.1</td><td>45.7</td><td>30.6</td><td>8.6</td><td>31.2</td><td>48.4</td></tr><tr><td> $\mathrm { P S S D } 5 1 2 ^ { [ 5 1 ] }$ </td><td></td><td></td><td>40</td><td>31.8</td><td>53.4</td><td>35.7</td><td>13.8</td><td>36.0</td><td>52.1</td></tr><tr><td rowspan="2">RetinaNet</td><td>RetinaNet800[7]</td><td>52.5</td><td>262.4</td><td>丨</td><td>39.1</td><td>59.1</td><td>42.3</td><td>21.8</td><td>42.7</td><td>50.2</td></tr><tr><td>FCOS[52]</td><td>50.9</td><td>234.4</td><td></td><td>41.5</td><td>60.7</td><td>45.0</td><td>24.4</td><td>44.8</td><td>51.6</td></tr><tr><td rowspan="9">FCOS</td><td>NAS-FCOS[54]</td><td>57.3</td><td>254.0</td><td></td><td>43.0</td><td></td><td></td><td></td><td></td><td></td></tr><tr><td>EfficientDet-D0</td><td>3.9</td><td>2.5</td><td>16</td><td>33.8</td><td>52.2</td><td>35.8</td><td></td><td></td><td></td></tr><tr><td>EfficientDet-D1</td><td>6.6</td><td>6.1</td><td>20</td><td>39.6</td><td>58.6</td><td>42.3</td><td></td><td></td><td></td></tr><tr><td>EfficientDet-D2</td><td>8.1</td><td>11.0</td><td>24</td><td>43.0</td><td>62.3</td><td>46.2</td><td></td><td></td><td></td></tr><tr><td>EfficientDet-D3</td><td>12.0</td><td>25.0</td><td>42</td><td>45.8</td><td>65.0</td><td>49.3</td><td></td><td></td><td></td></tr><tr><td>EfficientDet-D4</td><td>21.0</td><td>55.0</td><td>74</td><td>49.4</td><td>69.0</td><td>53.4</td><td></td><td></td><td></td></tr><tr><td>EfficientDet-D5</td><td>34.0</td><td>135.0</td><td>141</td><td>50.7</td><td>70.2</td><td>54.7</td><td></td><td></td><td></td></tr><tr><td>EfficientDet-D6</td><td>52.0</td><td>226.0</td><td>190</td><td>51.7</td><td>71.2</td><td>56.0</td><td></td><td></td><td></td></tr><tr><td>EfficientDet-D7</td><td>52.0</td><td>325.0</td><td>262</td><td>52.2</td><td>71.4</td><td>56.3</td><td></td><td></td><td></td></tr><tr><td rowspan="3">CenterNet[s8]</td><td>CenterNet511 (single-scale)</td><td>187.0</td><td>234.0</td><td></td><td>44.9</td><td>62.4</td><td>48.1</td><td>25.6</td><td>47.4</td><td>57.4</td></tr><tr><td>CenterNet511 (multi-scale)</td><td>187.0</td><td>234.0</td><td></td><td>47.0</td><td>64.5</td><td>50.7</td><td>28.9</td><td>49.9</td><td>58.9</td></tr><tr><td>CornerNet (single-scale)</td><td></td><td></td><td>211</td><td>40.5</td><td>56.5</td><td>43.1</td><td>19.4</td><td>42.7</td><td>53.9</td></tr><tr><td rowspan="2">CornerNet[59]</td><td>CormerNet (multi-scale)</td><td></td><td></td><td>1147</td><td>42.1</td><td>57.8</td><td>45.3</td><td>20.8</td><td>44.8</td><td>56.7</td></tr><tr><td>RTMDet-m RTMDet-1</td><td>24.7 52.3</td><td>39.3</td><td>一</td><td>49.4</td><td>66.8 68.8</td><td>一</td><td>一</td><td></td><td>1</td></tr><tr><td rowspan="2"</table>

## 4 单阶段目标检测应用

## 4.1 小目标检测

小目标检测是指在图像中检测尺寸较小的目标。当目标在图像中的像素占比非常小时，能提取的特征信息很少，因此很容易被背景噪声掩盖，检测难度较大。大多数单阶段检测器的弊端就是对小目标物体检测不敏感，为了提高小目标检测的性能，研究者们提出了多种方法。

SSD使用多尺度特征融合通过在不同尺度的特征图上进行检测，提高了对小目标的检测能力[8]。

RetinaNet则使用特征金字塔网络（FPN）进行多尺度特征融合以及通过动态调整引入的损失函数FocalLoss权重，使模型更加关注难分类的小目标[7]。

YOLOv4提高输入图像的分辨率以及引入Mosaic数据增强技术，拼接四张图片来生成新的训练样本，增加了小目标的清晰度和多样性[25]。

TPH-YOLOv5 将基于Transformer 的预测头添加到YOLOv5检测模型上，来提高模型的预测回归性能，还使用注意力机制提高对小目标关注，进而实现了在多尺度变化和高密度场景中的检测性能的提升[79]。

福建理工大学的李钟华等人[80]于2024年针对复杂场景下的小目标检测提出了一种基于多尺度结构感知和全局上下文信息的小目标检测算法，使用结构感知模块更好地捕获小目标的细节特征，同时引入Transformer结构设计了全局上下文信息模块。此外，针对训练时间过长还设计了一种新的带权重损失函数W-CIoU（weightedcomplete intersection over union），加快模型收敛。

以上这些方法都显著提高了小目标检测的精度，但在复杂背景会增加误检率，尤其是当背景与目标有相似特征时，部分目标可能被其他物体遮挡，使得检测更加困难。开发一个拥有更有效的特征提取机制，如可以更好地捕捉全局上下文信息基于 Transformer 的方法，能够直接处理小目标检测任务的新型检测框架是未来重要的研究方向。同时引入多尺度特征融合（如 FPN、BiFPN）、多模态信息融合（如RGB-D数据）以及高分辨率输入来增强检测能力。

## 4.2 无人机视角检测

无人机视角（UAVs）检测是指从无人机拍摄的图像中检测目标。无人机通常从高空俯视拍摄，可以快速覆盖大面积区域，进而提高检测的效率。为了应对无人机视角检测中的图像质量和数据处理挑战，领域内学者提出了多种方法，如使用高分辨率相机和高效的图像处理算法。高分辨率相机可以提高图像质量，减少背景噪声的影响，高效的图像处理算法则可以快速处理大量图像数据，提高检测速度。图7为UAVs检测行人示意图。

![](Images_PSFFPN9I/9d7cff645ea2d1d8f16eae211703b139782e5e075f1547b00a5f3ed49a381672.jpg)  
图7 UAVs检测行人  
Fig.7 UAVs detecting pedestrians

窦同旭等人[81]通过将YOLOv5模型的分类任务与回归任务解耦，设计出结合辅助训练头的预测头。其使用 EIOU（enhanced intersection over union loss）优化损失函数，提出了 YOLO-ADOP（auxiliary head decoupled headoptimal transport assignment P2 YOLO）来提升 UAV 视角下对小目标检测性能。

Liu等人[82]在YOLOv3的骨干网络中引入跨阶段部分连接模块，来增强多尺度特征融合能力。除此之外，其还使用CIoU损失函数优化了检测头的设计，大幅减少了模型大小和训练时间。这些使得改进后的YOLOv3更适合于UAV等资源受限环境下的应用。

Cao等人[83]通过对YOLOv8进行改进提出了YOLO-TSL（temporal-spatial learning you only look once）。其在CSPDarkNet骨干网络中嵌入由通道注意力、空间注意力和深度注意力三个部分组成的 Triplet Attention 机制来直接估计目标特征的三维权重。该改进模型在颈部网络中引入了GSConv和GSbottleneck组件，通过一次聚合策略（one-time aggregation）设计了跨层级的部分网络（VoV-GSCSP）模块。最后该改进模型还使用结合inner-IoU 和 MDPIoU 的 inner-MPDIoU 损失函数来自适应辅助边界框尺度的调整。这些改进使YOLO-TSL成为一个轻量级且高效的红外目标检测算法。

基于YOLOv8s模型，潘玮等人[84]在YOLOv8s的骨干网络中引入感受野注意力卷积和CBAM（convolu-tional block attention module）注意力机制。他们依据大型可分离卷积注意力思想改造FPN，以inner-MPDIoU代替原损失函数，进而提升模型对困难样本的学习能力。依据这些改进，其提出一种融合多种注意力机制的YOLOv8s改进模型。

于傲泽等人[85]针对无人机视角小目标检测特征提取难度大、检测精度低等问题，提出一种基于分块复合注意力的无人机小目标检测算法。该算法提出一种即插即用的分块复合注意力模块（patch-wise compositeattention，PWCA），加强通道信息在局部空间特征上的区分度。同时结合PWCA设计出自适应交错下采样模块（adaptive interlaced downsampling，AID），根据特征重要程度自适应地分配下采样后的特征权重，此外还对模型进行了轻量化设计。

无人机视角检测需要面对包括无人机拍摄角度多样、目标形状的变化、户外环境下光线强度和方向变化的频繁、光线不稳定影响检测性能以及如风动草木、水面波光粼粼等复杂背景因素影响检测效果等挑战。面对这些挑战，未来可以从能够处理各种光照条件和天气状况适应性强的算法，提高算法模型的鲁棒性方向进行。还可以从构建针对特定任务优化的数据集方向入手，比如专注于某个行业或者环境下的专用数据集，增强模型可靠性。此外还可以通过无人机编队实现对同一目标多视角融合进而提升检测性能。

## 4.3 生物个体检测

生物个体检测是指在图像中检测特定的生物个体，如动物的个体身份溯源。生物个体检测在生态学研究、野生动物保护等领域有重要应用。生物个体检测面临的主要挑战包括目标多样性、背景复杂和数据采集标注困难。

内蒙古农业大学的Pang等人[86]开发了一个大规模羊个体基准数据集 Sheepface-107。数据集从 107 只年龄在7到9个月之间的杜泊羊中采集了不同姿态、不同光照背景、不同天气状况下的共计5 350张图像，汇集在一个多样化的集合中，提供了全面的羊个体特征表示。在目标检测中通常参考RetinaFace的标注方式，即采用如图8所示方式进行标注。该标注方式除了标注羊脸框以外，还需要羊左眼、羊右眼、羊左鼻孔、羊右鼻孔、羊嘴5个关键点，更加全面关注到羊脸的细粒度特征。

![](Images_PSFFPN9I/312988df41525254f56d0d3367b229b06aabf61edf61ef7d4d89ec69ac30e80e.jpg)  
图8 使用LABELME标注羊脸关键点  
Fig.8 Using LABELME to annotate sheep face keypoints

西北农林科技大学的 Hao 等人[87] 改进了 RetinaFace模型来进行羊脸识别，使用轻量级骨干网络Mobile-NetV3-large 作为骨干网络，并引入 SAC（switchable atrousconvolution）。其通过动态调整卷积核的膨胀率，提高了多尺度特征提取的速度和效率，使得模型在处理不同尺度的羊脸时更加灵活和高效。此外，模型还增加了CBAM模块，增强了模型对羊面部重要特征的捕捉能力。

杨蜀秦等人[88]基于融合坐标信息的改进YOLOv4模型识别奶牛面部，在YOLOv4模型的特征提取层和检测头分别引入坐标注意力机制和包含坐标通道的坐标卷积模块来增强模型对奶牛面部的敏感性。

由于不同物种甚至同种生物之间存在显著差异，这对模型的泛化性能有很高的要求。而同种生物所处环境以及个体之间细节特征又极其相似，非常依赖细节特征来识别检测。此外，某些珍稀物种难以获取足够多的训练样本。要建立大规模高质量的生物图像数据库，面对珍稀物种可以使用生成式大模型进行数据增强扩充。针对同种生物个体检测可以向细粒度特征提取方向研究来提高检测精度，同时设计针对性强的损失函数，解决类别不平衡的问题。

## 4.4 交通检测

交通检测是指在图像中检测交通相关的对象，如车辆、行人、交通标志等，交通检测在智能交通系统、无人驾驶汽车等领域有广泛应用。交通检测面临的挑战包括目标多样性和动态变化的场景等。

Hsu等人[89]专门针对交通行人检测中的小目标和图像纵横比差异大的问题，改进YOLOv3提出了RSA-YOLO（ratio-and-scale-aware YOLO）方法。RSA-YOLO的改进主要包括比例感知机制（ratio-aware mechanisms），通过动态调整YOLOv3输入层的长宽超参数，解决了输入图像宽高比差异较大的问题。这种比例感知机制使得网络能够更有效地利用图像的长宽信息，从而在不同宽高比的图像中提高行人检测性能。尺度感知机制（scale-aware mechanisms）利用智能分割（intelligent splits）将原始图像自动且适当地分割成两个局部图像，并在这些局部图像上迭代执行比例感知RA-YOLO，来获取不同分辨率的行人检测信息。此外，该模型还引入了新的尺度感知机制，通过多分辨率融合（multiresolutionfusion）解决了在图像中显著较小的行人的漏检问题。这种机制能够整合不同尺度的行人检测信息，提高对各种尺寸行人的检测能力。

Wu等人[90]开发了一种使用拓扑原理的多阶段高性能框架。该框架结合强大的 PETRv2 检测器进行中心线检测和 YOLOv8 进行交通标志检测，改进了基于MLP（multi-layer perceptron）的拓扑预测头。这些使得该方法在 OpenLaneV2 测试集上达到了 55%的 OLS（overall score），超过了第二名解决方案8个百分点。

交通检测主要面临的挑战是车辆行驶速度快，要求系统具备较高的帧率处理能力，在雨、雪、雾等恶劣天气条件下，视觉传感器的表现会受到极大限制等。可以采用轻量化的网络架构（如MoblieNet等），在保证精度的同时提高检测效率。强化模型对恶劣天气条件的鲁棒性，如模拟极端情况的数据增强。

## 4.5 农业检测

农业检测是指在图像中检测农业相关的对象，如农作物、病虫害等。农业检测在精准农业、作物管理等领域有重要应用。

陈禹等人[91]以YOLOv5s模型为改进基础，提出了针对茶叶病害识别名为YOLOv5-CBM的模型。其将一个带有 Transformer 的 C3 模块和一个 CA（coordinate at-tention）注意力机制融入骨干网络中，实现对病害特征的提取。Neck结构使用加权双向特征金字塔（BiFPN）自适应调节多个尺度特征的权重，进而融合多尺度提高识别的准确率。还在检测端新增一个小检测头，来解决茶叶病害初期病斑较小不易检测的问题。

蒋心璐等人[92]针对田间环境下图像背景复杂和害虫尺寸小带来的难检和漏检问题，提出一种改进 YOLOv5的小目标害虫检测算法 Pest-YOLOv5。他们在特征提取网络中增加坐标注意力机制来增强对害虫特征的提取能力。此外，在颈部网络使用双向特征金字塔网络结构解决多次卷积带来的小目标信息丢失问题。同时使用 SIoU（scale-aware intersection over union）和变焦损失函数让模型更关注分类困难的目标样本。

农业检测面临的主要挑战包括目标多样性、环境复杂性以及模型轻量化等。面对这些挑战，可以向多模态数据融合和特征提取两个方向研究。多模态数据融合主要结合图像和环境数据，进而提高检测精度。特征提取则通过卷积神经网络提取农作物和病虫害的特征，实现精准管理。而面对模型轻量化可以通过引入轻量级骨干网络框架提升对边缘设备部署的能力。

## 4.6 3D目标检测

3D目标检测是指在三维空间中检测目标，通常使用激光雷达（LiDAR）、深度相机等传感器获取三维数据。点云（point cloud）是目前3D目标检测中最具优势的三维数据，其是指在三维空间中由大量点组成的数据集合，用来表示一个物体或者环境的表面，点云可以非常详细地描述物理世界中的物体或环境。

Simon等人[93]提出了一种针对点云的实时3D目标检测网络 $\mathrm { C o m p l e x - Y O L O _ { \circ } }$ 为了更准确地估计目标的姿态，Complex-YOLO扩展了YOLOv2的回归策略，引入E-RPN（Euler-region-proposal network）。通过添加一个复数角度（由实部和虚部构成）到回归网络中，E-RPN有助于模型更好地学习不同类别的特征，最终的Complex-YOLO检测速度超越现有的3D目标检测方法5倍多。

3D目标检测面临的主要挑战包括数据处理复杂、需要的计算资源多等。3D传感器如激光雷达（LiDAR）生成的数据往往是稀疏且不规则分布的点云，使用前需要进行复杂的数据处理。此外，处理高维3D数据往往需要更多的计算资源，尤其是在实时应用场景中。可以开发更适合处理稀疏和非结构化3D数据的特征提取方法来避免复杂的数据处理。为了提高检测精度同样可以使用多模态数据融合图像和三维数据。针对资源受限平台（如嵌入式系统），继续改进轻量级算法以提升模型实时处理能力。

## 5 困境与未来展望

近年来，单阶段检测器由于其结构简单、检测速度迅速进而蓬勃发展。但其还存在如数据集质量较低和代表性不足、个别领域数据集采集困难、模型泛化性能较弱、模型训练依赖大量注释良好的数据、在移动端等边缘设备部署困难等诸多发展困境。此外，尽管近年来付出了巨大的努力，但机器和人眼之间的速度差距仍然很大，尤其检测一些小目标，单阶段检测器容易受到复杂背景的干扰，导致误检和漏检。本文提出以下未来可研究方向供单阶段检测器的研究者们参考。

## 5.1 生成式大模型数据增强

近年来，生成式大模型技术蓬勃发展，给各个领域带来了新的研究方向。针对目标检测领域数据集采集困难以及数据集多样性和代表性不足，模型过拟合到特定类型的输入上，从而降低模型泛化能力，而使用生成式网络大模型可以很好地解决这个问题，其原理是通过学习真实数据的分布特征，生成新的数据样本，这些样本在特征上与真实数据相似，但又具有一定的变化和多样性。在数据稀缺的情况下，生成式模型可以生成大量合成数据，减少对真实数据的依赖，从而降低数据标注的成本。如针对卫星图像中稀有物体标注少的问题，Martinson等人[94]使用3D模型和随机背景生成合成图像；然后通过生成对抗网络大模型 GAN（generativeadversarial network）[95] 的变体 Cycle-GAN 对这些图像进行改进以引入大气扭曲；之后使用RetinaNet进行检测，利用合成图像作为验证集来确定分类和检测的阈值；最终在只有6个真实标签的情况下，将原来需要人工审核的图像数量减少 50%，同时保持 95%的召回率，平均精度也得到了显著提高。Salaudeen等人[96]针对在低分辨率图像中检测小尺寸或远距离的坑洼检测问题，使用ESRGAN（enhanced super- resolution generative adversarialnetwork）网络将低分辨率图像超分辨率化以提高图像质量；然后利用两种目标检测网络YOLOv5和Efficient-Det在超分辨率图像上进行坑洼检测，使得YOLOv5的AP提高了32%，EfficientDet的AP提高了26%。此外，使用最新的去噪扩散概率模型 DDPM（denoising diffusionprobabilistic models）[97] 生成模型进行数据增强进而扩充高质量数据集提升检测性能。如Fang等人[98]使用生成的视觉先验构建整个图像和每个边界框的提示，然后通过可控扩散概率模型生成合成数据，最后计算类别校准的 CLIP（contrastive language-image pretraining）排名并执行后过滤。这使得模型在COCO 数据集5/10/30shot 设 置 下 ，mAP 分 别 提 高 了 18.0% 、15.6% 和15.9%，在完整的 PASCAL VOC 数据集上 mAP 提高了2.9%。综上所述，生成式大模型可以增强数据的多样性同时扩充高质量数据，为后续模型的训练带来更多可能性。

## 5.2 探索开发弱监督检测

由于基于深度学习的单阶段检测器的训练通常依赖于大量注释良好的图像，注释过程耗时、昂贵且效率低下。而弱监督检测（weakly supervised object detec-tion，WSOD）仅利用有限的标注信息来训练模型，使其能够识别和定位图像中的对象。这些标注信息可以是图像级别的标签，而无需具体的边界框。如多实例学习（multiple instance learning，MIL）策略是经典的弱监督检测策略，其中训练数据以“包”（bags）的形式提供，每个包内包含多个未标注的实例（instances），而整个包则有一个整体标签。在单阶段检测器中，图像被视为包，图像中的基于锚点或网格单元的候选框作为实例。训练过程试图找出那些能够最好解释图像标签的候选框，即最有可能包含目标物体的检测框。如Gao等人[99]提出名为差异多实例学习（difference multi-instance learning，D-MIL）的检测器。该检测器的核心在于引入了多个多实例学习（MIL）学习器，这些学习器追求差异性但互补的解决方案，以指示目标部分，然后通过合作模块将这些解决方案融合，以实现精确的目标定位。D-MIL在PASCAL VOC 2007数据集上，mAP达到了53.5%，相比基线方法PCL（prototype contrastive learning）的49.0%提升了4.5个百分点；在MS-COCO数据集上，mAP在IoU阈值为0.5下达到了24.7%，相比PCL提升了5.3%。综上，弱监督检测器明显的优势就是降低劳动力成本以及提高检测灵活性。此外由于对标注的需求较低，弱监督检测可以处理更大的数据集，从而提高模型的泛化能力。

## 5.3 创新网络架构和轻量化模型

目前单阶段检测器应用领域越来越广泛，也就意味着在保持或提高准确性的同时其能否在边缘化设备部署显得尤为重要。此外，从YOLO系列的发展历程来看，从基于锚点的设计演变为无锚点设计，以及YOLOv10中引入无NMS训练技术，都是为简化和优化检测过程所做的持续努力。通过使用如MobileNet、ShuffleNet等轻量化网络架构替换原有的骨干网络以及使用模型剪枝等优化技术，可以在保持较高精度的同时减少计算资源消耗，实现更高的效率进而部署在资源受限的设备上。如上文提到的Tiny FCOS[44]用轻量级骨干网络与标准化的扩张卷积组构建 FPN 以及堆叠卷积块的方式将FCOS模型轻量化，使其能直接应用于边缘设备的实时检测。Lite DETR设计一个高效的编码器块，用交错的方式更新高级和低级特征，显著减少了检测头的计算量，同时保持了99%的原始性能。

## 5.4 小目标检测

长期以来，面对如野外、开放区域等背景复杂的大型场景，单阶段检测器在检测小目标方面一直是一项挑战。该研究方向的一些潜在应用包括利用遥感影像统计野生动物的种类数量和军事目标检测等。解决该问题可以引入多尺度特征融合（如 FPN、BiFPN）、高分辨率输入来增强检测能力，引入注意力机制利用空间注意力或通道注意力模块突出重要区域，帮助模型聚焦于小目标周围的背景信息。如Focus-DETR在编码器中引入双重注意力机制和基于多尺度特征图的 token 评分系统，专注于更有小目标信息量的token。此外还可以通过加权损失函数，对小目标赋予更大的权重，使得它们在训练过程中得到足够的关注进而提升检测精度，如上文提到的FCOS通过Focal Loss损失函数降低了易分类样本的权重，使模型更加关注难分类样本，进而提升对小目标检测精度。

## 5.5 多模态信息融合

单阶段检测器在不同领域的应用面临不同数据模式之间切换的问题，如对于自动驾驶和无人机应用，探索如何将训练好的检测器迁移到不同的数据模式，如何进行信息融合以提高检测能力。可以使用多模态的数据（如 RGB-D 图像、3D 点云、LIDAR、文本、音频等）进行单阶段检测器训练，通过设置多分支分别处理不同的数据模式进行特征提取，之后通过注意力等融合机制，进一步提高模型的鲁棒性和泛化能力。如上文提到的Complex-YOLO就是结合点云三维数据进行的3D目标检测。

## 6 结束语

随着目前单阶段检测器更加通用和强大，未来单阶段检测器会应用于更多不同的领域，从家用电器设备到自动驾驶汽车，而这必然要求模型减少参数量、提高精度以便于边缘化设备部署，这也是未来亟待解决的问题之一。除此之外，YOLO系列算法已经不单局限于目标检测和图像分割，开始应用于视频中的目标跟踪和3D关键点估计等领域，因此多模态数据融合在未来也有着很大的应用前景。

本文从基于深度学习的单阶段通用目标检测算法出发，从宏观角度将目前主要单阶段检测模型的算法划分为以经典卷积为架构和以Transformer为架构两种类型。并以此为视角侧重于系统全面地梳理整个基于深度学习下的单阶段通用目标检测器的最新进展。具体来讲，本文回顾了 YOLO 系列、SSD 以及 DETR 等目前主流单阶段检测器的发展历程；分析了不同阶段各个检测器的特点优势与局限性；对现有目标检测通用数据集COCO、VOC等进行了归纳整理；分析了目标检测领域各类评价指标的作用；对主流单阶段检测器性能做出对比分析。最后，介绍了单阶段检测器在不同领域的应用并提出未来五个可研究方向。

## 参考文献：

[1] ZHOU X Y, GONG W, FU W L, et al. Application of deep learning in object detection[C]//Proceedings of the 2017 IEEE/ACIS 16th International Conference on Computer and Information Science. Piscataway: IEEE, 2017: 631-634.

[2] DALAL N, TRIGGS B. Histograms of oriented gradients for human detection[C]//Proceedings of the 2005 IEEE Computer Society Conference on Computer Vision and Pattern Recognition. Piscataway: IEEE, 2005: 886-893.

[3] KRIZHEVSKY A, SUTSKEVER I, HINTON G E. Image-Net classification with deep convolutional neural networks [J]. Communications of the ACM, 2017, 60(6): 84-90.

[4] GIRSHICK R, DONAHUE J, DARRELL T, et al. Rich feature hierarchies for accurate object detection and semantic segmentation[C]//Proceedings of the 2014 IEEE Conference on Computer Vision and Pattern Recognition. Piscataway: IEEE, 2014: 580-587.

[5] REN S Q, HE K M, GIRSHICK R, et al. Faster R-CNN: towards real- time object detection with region proposal networks[J]. IEEE Transactions on Pattern Analysis and Machine Intelligence, 2017, 39(6): 1137-1149.

[6] REDMON J, DIVVALA S, GIRSHICK R, et al. You only look once: unified, real- time object detection[C]//Proceedings of the 2016 IEEE Conference on Computer Vision and

Pattern Recognition. Piscataway: IEEE, 2016: 779-788.

[7] LIN T Y, GOYAL P, GIRSHICK R, et al. Focal loss for dense object detection[C]//Proceedings of the 2017 IEEE International Conference on Computer Vision. Piscataway: IEEE, 2017: 2999-3007.

[8] LIU W, ANGUELOV D, ERHAN D, et al. SSD: single shot multibox detector[C]//Proceedings of the 14th European Conference on Computer Vision. Cham: Springer, 2016: 21-37.

[9] CARION N, MASSA F, SYNNAEVE G, et al. End-to-end object detection with transformers[C]//Proceedings of the 16th European Conference on Computer Vision. Cham: Springer, 2020: 213-229.

[10] ZHAO Y A, LV W Y, XU S L, et al. DETRs beat YOLOs on real- time object detection[C]//Proceedings of the 2024 IEEE/CVF Conference on Computer Vision and Pattern Recognition. Piscataway: IEEE, 2024: 16965-16974.

[11] KHANAM R, HUSSAIN M. YOLOv11: an overview of the key architectural enhancements[EB/OL]. [2024-11-03]. https:// arxiv.org/abs/2410.17725.

[12] HOWARD A G, ZHU M L, CHEN B, et al. MobileNets: efficient convolutional neural networks for mobile vision applications[EB/OL]. [2024-09-23]. https://arxiv.org/abs/1704. 04861.

[13] ZHANG X Y, ZHOU X Y, LIN M X, et al. ShuffleNet: an extremely efficient convolutional neural network for mobile devices[C]//Proceedings of the 2018 IEEE/CVF Conference on Computer Vision and Pattern Recognition. Piscataway: IEEE, 2018: 6848-6856.

[14] LU J S, BATRA D, PARIKH D, et al. ViLBERT: pretraining task-agnostic visiolinguistic representations for vision-andlanguage tasks[EB/OL]. [2024-09-23]. https://arxiv.org/abs/ 1908.02265.

[15] 米增, 连哲. 面向通用目标检测的YOLO方法研究综述 [J]. 计算机工程与应用, 2024, 60(21): 38-54. MI Z, LIAN Z. Review of YOLO methods for universal object detection[J]. Computer Engineering and Applications, 2024, 60(21): 38-54.

[16] 董甲东, 郭庆虎, 陈琳, 等. 深度学习中单阶段金属表面缺 陷检测算法优化综述[J]. 计算机工程与应用, 2025, 61 (4): 72-89. DONG J D, GUO Q H, CHEN L, et al. Review on optimization algorithms for one-stage metal surface defect detection in deep learning[J]. Computer Engineering and Applications, 2025, 61(4): 72-89.

[17] 陈恒星, 刘一鸣. Anchor-free 目标检测算法综述[J]. 机电 工程技术, 2024, 53(8): 7-12. CHEN H X, LIU Y M. Overview of anchor-free object detection algorithms[J]. Mechanical & Electrical Engineering Technology, 2024, 53(8): 7-12.

[18] 任书玉, 汪晓丁, 林晖. 目标检测中注意力机制综述[J]. 计 算机工程, 2024, 50(12): 16-32. REN S Y, WANG X D, LIN H. Review of attention mechanisms in object detection[J]. Computer Engineering, 2024, 50(12): 16-32.

[19] 陈金林,吴一全,苑玉彬.无人机视角下目标检测的YOLO 系列算法研究进展[J/OL].北京航空航天大学学报[2024-09- 19]. https://doi.org/10.13700/j.bh.1001-5965.2024.0420. CHEN J L, WU Y Q, YUAN Y B. Research progress on YOLO series algorithms for target detection from the UAV vision[J/OL]. Journal of Beijing University of Aeronautics and Astronautics [2024-09-19]. https://doi.org/10.13700/j.bh. 1001-5965.2024.0420.

[20] SZEGEDY C, LIU W, JIA Y Q, et al. Going deeper with convolutions[C]//Proceedings of the 2015 IEEE Conference on Computer Vision and Pattern Recognition. Piscataway: IEEE, 2015: 1-9.

[21] EVERINGHAM M, VAN GOOL L, WILLIAMS C K I, et al. The pascal visual object classes (VOC) challenge[J]. International Journal of Computer Vision, 2010, 88(2): 303-338.

[22] REDMON J, FARHADI A. YOLO9000: better, faster, stronger[C]//Proceedings of the 2017 IEEE Conference on Computer Vision and Pattern Recognition. Piscataway: IEEE, 2017: 6517-6525.

[23] FARHADI A, REDMON J. YOLOv3: an incremental improvement[EB/OL]. [2024-09-19]. https://arxiv.org/abs/1804. 02767.

[24] LIN T Y, DOLLÁR P, GIRSHICK R, et al. Feature pyramid networks for object detection[C]//Proceedings of the 2017 IEEE Conference on Computer Vision and Pattern Recognition. Piscataway: IEEE, 2017: 936-944.

[25] HE K M, ZHANG X Y, REN S Q, et al. Spatial pyramid pooling in deep convolutional networks for visual recognition[J]. IEEE Transactions on Pattern Analysis and Machine Intelligence, 2015, 37(9): 1904-1916.

[26] BOCHKOVSKIY A, WANG C Y, LIAO H M. YOLOv4: optimal speed and accuracy of object detection[EB/OL]. [2024-09-19]. https://arxiv.org/abs/2004.10934.

[27] WANG C Y, MARK LIAO H Y, WU Y H, et al. CSPNet: a

new backbone that can enhance learning capability of CNN [C]//Proceedings of the 2020 IEEE/CVF Conference on Computer Vision and Pattern Recognition. Piscataway: IEEE, 2020: 390-391.

[28] MISRA D. Mish: a self regularized non-monotonic activation function[EB/OL]. [2024- 09-19]. https://arxiv.org/abs/ 1908.08681.

[29] NELSON J, SOLAWETZ J. YOLOv5 is here: state- of-theart object detection at 140 FPS[EB/OL]. [2024-09-19]. https:// blog.roboflow.com/yolo v5-is-here/.

[30] LI C, LI L, JIANG H, et al. YOLOv6: a single-stage object detection framework for industrial applications[EB/OL]. [2024-09-19]. https://arxiv.org/abs/2209.02976.

[31] DING X H, ZHANG X Y, MA N N, et al. RepVGG: making VGG-style ConvNets great again[C]//Proceedings of the 2021 IEEE/CVF Conference on Computer Vision and Pattern Recognition. Piscataway: IEEE, 2021: 13733-13742.

[32] DING X H, CHEN H H, ZHANG X Y, et al. Re-parameterizing your optimizers rather than architectures[EB/OL]. [2024- 09-26]. https://arxiv.org/abs/2205.15242.

[33] WANG C Y, BOCHKOVSKIY A, LIAO H M. YOLOv7: trainable bag- of- freebies sets new state- of- the- art for realtime object detectors[EB/OL]. [2024-09-26]. https://arxiv. org/abs/2207.02696.

[34] WANG C Y A O, LIAO H Y M. Designing network design strategies through gradient path analysis[J]. Journal of Information Science & Engineering, 2023, 39(4): 975-995.

[35] GALLAGHER J. How to train an ultralytics YOLOv8 oriented bounding box (OBB) model[EB/OL]. [2024-09-26]. https://blog.roboflow.com/train-yolov8-obb-model/.

[36] WANG C Y, YEH I H, LIAO H M. YOLOv9: learning what you want to learn using programmable gradient information [EB/OL]. [2024-09-26]. https://arxiv.org/abs/2402.13616.

[37] WANG A, CHEN H, LIU L H, et al. YOLOv10: real-time end-to-end object detection[EB/OL]. [2024-09-26]. https:// arxiv.org/abs/2405.14458.

[38] AL RABBANI ALIF M, HUSSAIN M. YOLOv1 to YOLOv10: a comprehensive review of YOLO variants and their application in the agricultural domain[EB/OL]. [2024-09-26]. https://arxiv.org/abs/2406.10139.

[39] LONG X, DENG K P, WANG G Z, et al. PP-YOLO: an effective and efficient implementation of object detector [EB/OL]. [2024-09-26]. https://arxiv.org/abs/2007.12099.

[40] WANG C Y, YEH I H, LIAO H M. You only learn one rep-

resentation: unified network for multiple tasks[EB/OL]. [2024-09-26]. https://arxiv.org/abs/2105.04206.

[41] GE Z. YOLOX: exceeding YOLO series in 2021[EB/OL]. [2024-09-26]. https://arxiv.org/abs/2107.08430.

[42] XU X Z, JIANG Y Q, CHEN W H, et al. DAMO-YOLO: a report on real-time object detection design[EB/OL]. [2024- 09-26]. https://arxiv.org/abs/2211.15444.

[43] SUN Z, LIN M, SUN X, et al. MAE-DET: revisiting maximum entropy principle in zero- shot NAS for efficient object detection[C]//Proceedings of the 39th International Conference on Machine Learning, 2022: 20810-20826.

[44] SKALSKI P. How to train YOLO-NAS on a custom dataset [EB/OL]. [2024-09-26]. https://blog.roboflow.com/yolo-nashow-to-train-on-custom-dataset/.

[45] CHU X X, LI L, ZHANG B. Make RepVGG greater again: a quantization-aware approach[EB/OL]. [2024-09-26]. https:// arxiv.org/abs/2212.01593.

[46] ZHOU Y. A YOLO-NL object detector for real-time detection[J]. Expert Systems with Applications, 2024, 238: 122256.

[47] SU P, HAN H Z, LIU M, et al. MOD-YOLO: rethinking the YOLO architecture at the level of feature information and applying it to crack detection[J]. Expert Systems with Applications, 2024, 237: 121346.

[48] FU C Y, LIU W, RANGA A, et al. DSSD: deconvolutional single shot detector[EB/OL]. [2024-10-13]. https://arxiv.org/ abs/1701.06659.

[49] LI Z X, YANG L, ZHOU F Q. FSSD: feature fusion single shot multibox detector[EB/OL]. [2024-10-13]. https://arxiv. org/abs/1712.00960.

[50] 胡焱, 原子昊, 涂晓光, 等. 基于对比学习的改进SSD目标 检测算法[J]. 红外技术, 2024, 46(5): 548-555. HU Y, YUAN Z H, TU X G, et al. Improved SSD target detection algorithm based on comparative learning[J]. Infrared Technology, 2024, 46(5): 548-555.

[51] CHANDIO A, GUI G, KUMAR T, et al. Precise singlestage detector[EB/OL]. [2024-10-13]. https://arxiv.org/abs/ 2210.04252.

[52] TIAN Z, SHEN C, CHEN H, et al. FCOS: fully convolutional one- stage object detection[EB/OL]. [2024-10-13]. https://arxiv.org/abs/1904.01355.

[53] XU X L, LIANG W Y, ZHAO J H, et al. Tiny FCOS: a lightweight anchor- free object detection algorithm for mobile scenarios[J]. Mobile Networks and Applications, 2021, 26(6): 2219-2229.

[54] WANG N, GAO Y, CHEN H, et al. NAS-FCOS: fast neural architecture search for object detection[C]//Proceedings of the 2020 IEEE/CVF Conference on Computer Vision and Pattern Recognition. Piscataway: IEEE, 2020: 11943-11951.

[55] TAN M X, PANG R M, LE Q V. EfficientDet: scalable and efficient object detection[C]//Proceedings of the 2020 IEEE/ CVF Conference on Computer Vision and Pattern Recognition. Piscataway: IEEE, 2020: 10781-10790.

[56] TAN M X, LE Q V. EfficientNet: rethinking model scaling for convolutional neural networks[EB/OL]. [2024-10-13]. https://arxiv.org/abs/1905.11946.

[57] WANG Y F, WANG T, ZHOU X, et al. TransEffiDet: aircraft detection and classification in aerial images based on EfficientDet and transformer[J]. Computational Intelligence and Neuroscience, 2022(1): 2262549.

[58] ZHOU X Y, WANG D Q, KRÄHENBÜHL P. Objects as points[EB/OL]. [2024-10-13]. https://arxiv.org/abs/1904.07850.

[59] LAW H, DENG J. CornerNet: detecting objects as paired keypoints[C]//Proceedings of the 15th European Conference on Computer Vision. Cham: Springer, 2018: 765-781.

[60] LAW H, TENG Y, RUSSAKOVSKY O, et al. CornerNet-Lite: efficient keypoint based object detection[EB/OL]. [2024- 10-13]. https://arxiv.org/abs/1904.08900.

[61] LYU C Q, ZHANG W W, HUANG H A, et al. RTMDet: an empirical study of designing real-time object detectors[EB/ OL]. [2024-10-13]. https://arxiv.org/abs/2212.07784.

[62] ALEXEY D. An image is worth 16×16 words: transformers for image recognition at scale[EB/OL]. [2024-10-13]. https:// arxiv.org/abs/2010.11929.

[63] ZHU X Z, SU W J, LU L W, et al. Deformable DETR: deformable transformers for end- to- end object detection[C]// Proceedings of the 9th International Conference on Learning Representations, 2021.

[64] DAI X Y, CHEN Y P, YANG J W, et al. Dynamic DETR: end-to-end object detection with dynamic attention[C]//Proceedings of the 2021 IEEE/CVF International Conference on Computer Vision. Piscataway: IEEE, 2021: 2968-2977.

[65] MENG D P, CHEN X K, FAN Z J, et al. Conditional DETR for fast training convergence[C]//Proceedings of the 2021 IEEE/CVF International Conference on Computer Vision. Piscataway: IEEE, 2021: 3631-3640.

[66] LIU S L, LI F, ZHANG H, et al. DAB-DETR: dynamic anchor boxes are better queries for DETR[EB/OL]. [2024-10- 13]. https://arxiv.org/abs/2201.12329.

[67] LI F, ZHANG H, LIU S L, et al. DN- DETR: accelerate DETR training by introducing query DeNoising[C]//Proceedings of the 2022 IEEE/CVF Conference on Computer Vision and Pattern Recognition. Piscataway: IEEE, 2022: 13609- 13617.

[68] ZHANG H, LI F, LIU S L, et al. DINO: DETR with improved denoising anchor boxes for end-to-end object detection[EB/OL]. [2024-10-13]. https://arxiv.org/abs/2203.03605.

[69] ZHANG M Y, SONG G L, LIU Y, et al. Decoupled DETR: spatially disentangling localization and classification for improved end- to- end object detection[C]//Proceedings of the 2023 IEEE/CVF International Conference on Computer Vision. Piscataway: IEEE, 2023: 6578-6587.

[70] ZHANG J Y, HUANG J X, LUO Z P, et al. DA-DETR: domain adaptive detection transformer with information fusion [C]//Proceedings of the 2023 IEEE/CVF Conference on Computer Vision and Pattern Recognition. Piscataway: IEEE, 2023: 23787-23798.

[71] LI F, ZENG A L, LIU S L, et al. Lite DETR: an interleaved multi- scale encoder for efficient DETR[C]//Proceedings of the 2023 IEEE/CVF Conference on Computer Vision and Pattern Recognition. Piscataway: IEEE, 2023: 18558-18567.

[72] ZHENG D H, DONG W H, HU H L, et al. Less is more: focus attention for efficient DETR[C]//Proceedings of the 2023 IEEE/CVF International Conference on Computer Vision. Piscataway: IEEE, 2023: 6651-6660.

[73] ZHAO C Y, SUN Y F, WANG W H, et al. MS-DETR: efficient DETR training with mixed supervision[C]//Proceedings of the 2024 IEEE/CVF Conference on Computer Vision and Pattern Recognition. Piscataway: IEEE, 2024: 17027-17036.

[74] OUYANG H D. DEYO: DETR with YOLO for end-to-end object detection[EB/OL]. [2024-10-13]. https://arxiv.org/abs/ 2402.16370.

[75] DENG J, DONG W, SOCHER R, et al. ImageNet: a largescale hierarchical image database[C]//Proceedings of the 2009 IEEE Conference on Computer Vision and Pattern Recognition. Piscataway: IEEE, 2009: 248-255.

[76] LIN T Y, MAIRE M, BELONGIE S, et al. Microsoft COCO: common objects in context[C]//Proceedings of the 13th European Conference on Computer Vision. Cham: Springer, 2014: 740-755.

[77] KKUZNETSOVA A, ROM H, ALLDRIN N, et al. The open images dataset V4: unified image classification, object detection, and visual relationship detection at scale[J]. Inter-

national Journal of Computer Vision, 2020, 128(7): 1956- 1981.

[78] SHAO S, LI Z M, ZHANG T Y, et al. Objects365: a largescale, high-quality dataset for object detection[C]//Proceedings of the 2019 IEEE/CVF International Conference on Computer Vision. Piscataway: IEEE, 2019: 8430-8439.

[79] ZHU X K, LYU S C, WANG X, et al. TPH-YOLOv5: improved YOLOv5 based on transformer prediction head for object detection on drone- captured scenarios[C]//Proceedings of the 2021 IEEE/CVF International Conference on Computer Vision. Piscataway: IEEE, 2021: 2778-2788.

[80] 李钟华,林初俊,朱恒亮,等.基于结构感知和全局上下文信 息的小目标检测[J]. 计算机工程与应用, 2024, 60(9): 292-298. LI Z H, LIN C J, ZHU H L, et al. Small object detection based on structure perception and global context information[J]. Computer Engineering and Applications, 2024, 60 (9): 292-298.

[81] 窦同旭, 曾勇, 杨冲, 等. 改进YOLOv5 的无人机影像小目 标物体识别算法[J]. 建模与仿真, 2023, 12(6): 5395-5407. DOU T X, ZENG Y, YANG C, et al. Improved algorithm for small target object recognition in drone images based on YOLOv5[J]. Modeling and Simulation, 2023, 12(6): 5395- 5407.

[82] LIU H, MU C P, YANG R X, et al. Research on object detection algorithm based on UVA aerial image[C]//Proceedings of the 2021 7th IEEE International Conference on Network Intelligence and Digital Content. Piscataway: IEEE, 2021: 122-127.

[83] CAO L, WANG Q, LUO Y H, et al. YOLO- TSL: a lightweight target detection algorithm for UAV infrared images based on triplet attention and slim-neck[J]. Infrared Physics & Technology, 2024, 141: 105487.

[84] 潘玮, 韦超, 钱春雨, 等. 面向无人机视角下小目标检测的 YOLOv8s 改进模型[J]. 计算机工程与应用, 2024, 60(9): 142-150. PAN W, WEI C, QIAN C Y, et al. Improved YOLOv8s model for small object detection from perspective of drones [J]. Computer Engineering and Applications, 2024, 60(9): 142-150.

[85] 于傲泽, 魏维伟, 王平, 等. 基于分块复合注意力的无人机 小目标检测算法[J]. 航空学报, 2024, 45(14): 629148. YU A Z, WEI W W, WANG P, et al. Small target detection algorithm for UAV based on patch-wise co-attention[J]. Acta Aeronautica et Astronautica Sinica, 2024, 45(14): 629148.

[86] PANG Y, YU W B, XUAN C Z, et al. A large benchmark dataset for individual sheep face recognition[J]. Agriculture, 2023, 13(9): 1718.

[87] HAO J Y, ZHANG H M, HAN Y M, et al. Sheep face detection based on an improved RetinaFace algorithm[J]. Animals, 2023, 13(15): 2458.

[88] 杨蜀秦, 刘杨启航, 王振, 等. 基于融合坐标信息的改进 YOLO V4模型识别奶牛面部[J]. 农业工程学报, 2021, 37 (15): 129-135. YANG S Q, LIU Y Q H, WANG Z, et al. Improved YOLO V4 model for face recognition of diary cow by fusing coordinate information[J]. Transactions of the Chinese Society of Agricultural Engineering, 2021, 37(15): 129-135.

[89] HSU W Y, LIN W Y. Ratio-and-scale-aware YOLO for pedestrian detection[J]. IEEE Transactions on Image Processing, 2021, 30: 934-947.

[90] WU D M, JIA F, CHANG J H, et al. The 1st-place solution for CVPR 2023 OpenLane topology in autonomous driving challenge[EB/OL]. [2024-10-13]. https://arxiv.org/abs/2306. 09590.

[91] 陈禹, 吴雪梅, 张珍, 等. 基于改进YOLOv5s的自然环境 下茶叶病害识别方法[J]. 农业工程学报, 2023, 39(24): 185- 194. CHEN Y, WU X M, ZHANG Z, et al. Method for identifying tea diseases in natural environment using improved YOLOv5s[J]. Transactions of the Chinese Society of Agricultural Engineering, 2023, 39(24): 185-194.

[92] 蒋心璐, 陈天恩, 王聪, 等. 大田环境下的农业害虫图像小 目标检测算法[J]. 计算机工程, 2024, 50(1): 232-241. JIANG X L, CHEN T E, WANG C, et al. Small object detection algorithm for agricultural pest images in field environments[J]. Computer Engineering, 2024, 50(1): 232-241.

[93] SIMON M, MILZ S, AMENDE K, et al. Complex-YOLO: real-time 3D object detection on point clouds[EB/OL]. [2024- 10-13]. https://arxiv.org/abs/1803.06199.

[94] MARTINSON E, FURLONG B, GILLIES A. Training rare object detection in satellite imagery with synthetic GAN images[C]//Proceedings of the 2021 IEEE/CVF Conference on Computer Vision and Pattern Recognition. Piscataway: IEEE, 2021: 2763-2770.

[95] GOODFELLOW I, POUGET-ABADIE J, MIRZA M, et al. Generative adversarial networks[J]. Communications of the ACM, 2020, 63(11): 139-144.

[96] SALAUDEEN H, ÇELEBI E. Pothole detection using image enhancement GAN and object detection network[J]. Electronics, 2022, 11(12): 1882.

[97] HO J, JAIN A, ABBEEL P. Denoising diffusion probabilistic models[C]//Advances in Neural Information Processing Systems 33, 2020: 6840-6851.

[98] FANG H Y, HAN B R, ZHANG S, et al. Data augmentation for object detection via controllable diffusion models[C]// Proceedings of the 2024 IEEE/CVF Winter Conference on Applications of Computer Vision. Piscataway: IEEE, 2024: 1246-1255.

[99] GAO W, WAN F, YUE J, et al. Discrepant multiple instance learning for weakly supervised object detection[J]. Pattern Recognition, 2022, 122: 108233.

![](Images_PSFFPN9I/6f0afdc67bf6efd78447d1ecbb235c151fb85c4bb5aa6a73f0eabbcc2bf7b1ac.jpg)  
王宁（1999—），男，河北怀来人，硕士研究生，CCF学生会员，主要研究方向为图像处理、目标检测。WANG Ning, born in 1999, M.S. candidate,CCF student member. His research interests in-clude image processing and object detection.

![](Images_PSFFPN9I/a06b7301bdd602b6b37a2a9f8e474547a60634e630c23cd43683154da0c40e66.jpg)  
智敏（1972—），女，内蒙古赤峰人，博士，教授，主要研究方向为人工智能、深度学习、图像处理。ZHI Min, born in 1972, Ph.D., professor. Herresearch interests include artificial intelligence,deep learning and image processing.