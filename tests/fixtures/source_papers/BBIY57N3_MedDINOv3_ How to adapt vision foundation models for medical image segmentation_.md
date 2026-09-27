# MEDDINOV3: HOW TO ADAPT VISION FOUNDATION MODELS FOR MEDICAL IMAGE SEGMENTATION?

Yuheng Li1, Yizhou Wu2, Yuxiang Lai3, Mingzhe Hu3, Xiaofeng Yang1,3,4,∗

1Department of Biomedical Engineering, Georgia Institute of Technology, Atlanta 2Department of Electrical and Computer Engineering, Georgia Institute of Technology, Atlanta 3Department of Computer Science, Emory University, Atlanta 4Department of Radiation Oncology, Emory University School of Medicine, Atlanta ∗Email: xiaofeng.yang@emory.edu

## ABSTRACT

Accurate segmentation of organs and tumors in CT and MRI scans is essential for diagnosis, treatment planning, and disease monitoring. While deep learning has advanced automated segmentation, most models remain task-specific, lacking generalizability across modalities and institutions. Vision foundation models (FMs) pretrained on billion-scale natural images offer powerful and transferable representations. However, adapting them to medical imaging faces two key challenges: (1) the ViT backbone of most foundation models still underperform specialized CNNs on medical image segmentation, and (2) the large domain gap between natural and medical images limits transferability. We introduce MedDINOv3, a simple and effective framework for adapting DINOv3 to medical segmentation. We first revisit plain ViTs and design a simple and effective architecture with multiscale token aggregation. Then, we perform domain-adaptive pretraining on CT-3M, a curated collection of 3.87M axial CT slices, using a multi-stage DINOv3 recipe to learn robust dense features. MedDINOv3 matches or exceeds state-of-the-art performance across four segmentation benchmarks, demonstrating the potential of vision foundation models as unified backbones for medical image segmentation. The code is available at https://github.com/ricklisz/MedDINOv3.

Keywords Self-supervised learning · Foundation model · Medical image segmentation

## 1 Introduction

Medical imaging modalities such as computed tomography (CT) and magnetic resonance imaging (MRI) are central to modern radiology, enabling detailed visualization of anatomical structures and abnormalities. Accurate segmentation of organs-at-risk (OARs) and tumors is crucial for treatment planning and disease monitoring [1, 2], yet manual annotation is labor-intensive and time-consuming [3]. Deep learning has shown great promise in automating this process; however, most existing approaches rely on highly specialized architectures trained for individual datasets or organ systems [4, 5], limiting their generalization across modalities and institutions [6].

Foundation models (FMs) offer a promising solution as unified visual backbones, pretrained on large-scale unlabeled data and adaptable across diverse downstream tasks [7, 8, 9, 10]. Self-supervised learning enables training directly from raw pixels without manual annotations, producing transferable representations [11, 12, 13]. Recent advances such as DINOv2 [14] and DINOv3 [15] have demonstrated remarkable success in natural images, producing strong global and local features for classification, detection, and segmentation tasks.

However, due to privacy concerns, it is infeasible to obtain billion-scale data for training medical vision foundation models from scratch. This raises a natural question: can representations learned from web-scale natural images be effectively transferred to radiological imaging? Our empirical results suggest that DINOv3 provides promising performance for medical image segmentation. Nevertheless, we identify two key challenges in adapting vision foundation models to CT and MRI segmentation: 1). current FM backbones are based on Vision Transformers (ViTs), which still lag behind strong CNN baselines in dense prediction tasks [16]; 2). a substantial domain gap between natural and medical images prevents direct transfer of pretrained representations [17].

![](Images_WQKECV7Y/f8c535e9f006c15beba07cfc8d9e6acc7a8b179fba2e48931e1c9c8ea3ef0d85.jpg)  
Input

![](Images_WQKECV7Y/2c1144276bb6cb03e6be03b991b0a6a46f8c5af3e8ee896b3dc349182a117b5e.jpg)  
256×256

![](Images_WQKECV7Y/79cefc925a376e3ca8b278a0ac9cda18a1d9e5a9b6bc130d4e16d76904faebc8.jpg)  
512×512

![](Images_WQKECV7Y/581c140ee66607e959b0191298c709c922b05a0279e78ab4bab54f5b553bb3b1.jpg)  
1024×1024

![](Images_WQKECV7Y/d422ec80988aa2bcb6eea573656391ad9ef00e1730d091e732cb8780411038c3.jpg)  
2048×2048  
Figure 1: MedDINOv3 PCA maps at progressively higher resolution. We visualize dense features of MedDINOv3 by mapping the first three components of a PCA computed over the feature space to RGB. We mask the feature maps to focus on the CT foreground.

In this work, we propose MedDINOv3, an effective framework to adapt vision foundation model for medical image segmentation. First, we revisit plain ViTs for 2D medical image segmentation. While ViT has proven to be scalable for large-scale pretraining [18], it still requires tailored components such as ViT-Adapter [19] or Mask2Former [20] to achieve good segmentation performances. In medical imaging, existing transformer-based designs often fall back on heavy convolutional components and still underperform strong CNN baselines [5, 21, 22, 23, 24, 25]. Inspired by recent works that deconstruct transformer architectures for segmentation [26, 27], we propose a simple and effective transformer architecture for 2D medical image segmentation. MedDINOv3 leverages the DINO ViT as a strong vision encoder and introduces multi-scale feature aggregation by reusing patch tokens from intermediate transformer blocks. This hierarchical representation provides richer spatial contexts to the decoder, mitigating the weak locality bias of ViTs. Second, we perform domain-adaptive pretraining of MedDINOv3 on CT-3M, a large-scale collection of CT images, to better align the model with radiological data distributions. We found that gram anchoring, a mechanism to prevent local feature from collapsing, is optional to our pretraining framework. We systematically examine the three-stage pretraining recipe of DINOv3 and quantify the contribution of each stage to segmentation performance. After adapting to CT domain, our pretrained MedDINOv3 produces smooth feature maps at consistently higher resolutions (Fig.1).

We summarize our main contributions as follows:

• A simple ViT architecture for 2D medical segmentation. We revisit plain Vision Transformers and propose an effective design for 2D medical image segmentation. Two key refinements—(i) multi-scale token aggregation from intermediate patch tokens and (ii) high-resolution training—raise ViT-B performance on AMOS22 from 78.39% to 85.51% DSC.

Domain-adaptive pretraining on CT-3M. We curate CT-3M, a large-scale collection of axial CT slices from 16 datasets, and adapt DINOv3 via a three-stage process: (1) global/local self-distillation (DINOv2-style), (2) gram anchoring to stabilize patch-level consistency, and (3) high-resolution adaptation. We systematically examine each stage and quantify its impact on downstream segmentation.

• State-of-the-art results across four public CT/MRI benchmarks. On four diverse benchmarks (AMOS22, BTCV, KiTS23, LiTS), MedDINOv3 outperforms or matches strong CNN and transformer baselines. It surpasses nnU-Net on OAR segmentation (+2.57% DSC on AMOS22 and +5.49% DSC on BTCV), while achieving comparable tumor segmentation on KiTS23 (70.68% DSC) and LiTS (75.28% DSC). These results highlight the effectiveness of domain-adaptive pretraining for transferring vision foundation models to radiology.

## 2 Related work

## 2.1 Medical vision foundation models

Self-supervised learning has emerged as a key strategy for developing medical vision foundation models, motivated by the scarcity of annotated medical data. Models Genesis [28] demonstrated the benefits of pretext reconstruction tasks on CT and MRI, while more recent frameworks such as SwinUNETR with SSL pretraining [3] showed substantial improvements on 3D CT benchmarks. Masked image modeling (MIM) has also been applied in the medical domain, with studies showing that MIM-pretrained encoders significantly improve performance on organ segmentation datasets [2, 29, 30]. Parallel work has explored adapting natural-image FMs such as DINOv2 to radiology: Baharoon et al. [17] demonstrated that natural-image SSL features transfer well to classification, though performance in segmentation lags behind domain-pretrained models. Our work bridges this performance gap by performing domain-adaptive SSL pretraining at scale.

## 2.2 Vision transformers in medical image segmentation

Vision Transformers have been widely explored in medical image segmentation. TransUNet [24] incorporated transformer layers into the bottleneck of a U-Net. LeViT-UNet [31] followed a similar design with efficient attention. UTNet [32] employed Transformer blocks at multiple resolutions, and CoTr [22] leveraged a single Transformer to jointly model features across resolutions. Among the most influential works, UNETR [21] directly employed a ViT encoder, representing a shift toward transformer-heavy designs. Following this, SwinUNETR [5] integrated swin transformers. Most recent works such as Primus [26] deconstruct the complex decoders and show that an encoder-only architecture can approach CNN performance. Despite this progress, recent benchmark studies emphasize that CNNs like nnU-Net remain strong baselines [16]. Our work aims to fully realize the potential of ViTs in medical segmentation by refining the architecture design and performing domain-adaptive SSL pretraining.

![](Images_WQKECV7Y/52d86a6f9440ab3bb0a0f4f72229f571d23e8e1aa3163aa6ad40f6e23d7a31fe.jpg)  
Figure 2: Overall framework of MedDINOv3. a). Stage 1: Given an input CT, we feed the global crops to the teacher model, local and masked crops to the student. Self-distillation loss is applied to the CLS tokens and masking loss applied to dense patch tokens. b). Stage 2: Adds gram anchoring. Gram teacher sees a higher resolution global crop and outputs dense feature maps, resized to match student resolution. Stage 3: Both student and teacher are trained with higher-res CT inputs (not shown). c). Finetuning pretrained MedDINOv3 for segmentation with proposed architecture.

## 3 Method

While vision foundation models pretrained on large datasets have demonstrated remarkable performance in natural images, directly adapting them for medical imaging remains non-trivial, due to considerable gaps in representations and different architectural designs. First, we propose iterative refinements on vision transformer for medical image

Table 1: Ablation study on refinements for adapting ViT backbone for segmentation on AMOS22.
<table><tr><td>Encoder init.</td><td>Decoder</td><td>Multi-scale features</td><td>Resolution</td><td>DSC (%)</td></tr><tr><td>randinit.</td><td>Primus</td><td>×</td><td> $6 4 0 \times 6 4 0$ </td><td>78.39</td></tr><tr><td>DINOv3</td><td>Primus</td><td>×</td><td> $6 4 0 \times 6 4 0$ </td><td>81.35</td></tr><tr><td>DINOv3</td><td>Primus</td><td>√</td><td> $6 4 0 \times 6 4 0$ </td><td>83.45</td></tr><tr><td>DINOv3</td><td>Primus</td><td>√</td><td> $8 9 6 \times 8 9 6$ </td><td>85.51</td></tr></table>

segmentation, enabling integration of pretrained SSL models. Next, we perform domain-adaptive pretraining on CT images using DINOv3, a state-of-the-art SSL method known for learning superior dense features. We then transfer the learned representations to various medical segmentation tasks. Our framework is shown in Figure 2.

## 3.1 Rethinking transformers for medical image segmentation

Despite promising scalability in natural images, vision transformers have not yet achieved consistent gains for medical image segmentation. Prior studies show that transformer blocks in segmentation models contribute very little to final performance [26] and still underperform strong CNN baselines [4]. To enforce attention usage, Primus proposes a simple transformer architecture that uses a lightweight transposed convolution decoder, achieving satisfactory performances in 3D volumetric segmentation. However, Primus still lacks the spatial priors essential for dense segmentation. Furthermore, Primus encoder modifies its patch size from 16 to 8, which remains compute heavy and does not suit DINOv3-style pretraining. Motivated by these limitations, we revisit plain ViTs for 2D medical image segmentation and propose a stepwise refinement to adapt DINOv3 backbone into an effective segmentation backbone (Table 1).

Development datasets We select AMOS22 to train and evaluate each refinement step. AMOS22 [1] is an abdominal organ segmentation dataset of 300 CT volumes and 60 MRI volumes with 15 annotated organs. We follow a similar strategy as Primus [26] by training and evaluating with only one fold (80/20 split) of the default five-fold cross-validation scheme. We train for a total of 1000 epochs following default nn-UNet settings, with hyperparameters adapted from Primus.

Baseline We form our baseline using DINOv3 ViT encoder (ViT-B) and Primus decoder composed of back-to-back transposed convolution, LayerNorm, and GELU activation, to upsample patch tokens into the full-resolution segmentation map. This design minimizes convolutional influence and maximizes the impact of transformer’s representations. Starting from random initialization, this configuration provides a reasonable baseline, but lags behind supervised CNNs.

Leveraging pretrained DINOv3 To improve representation quality, we initialize the ViT encoder with DINOv3 pretrained on LVD-1689M. We observe considerable boost in DSC by 2.96% over random initialization, highlighting the transferability of web-scale SSL features to medical segmentation.

Multi-scale token aggregation Observing that Primus only uses the last transformer block as input to the decoder, we hypothesize that this lack of hierarchical priors prevents ViTs from learning strong local features. We propose to reuse patch tokens from multiple intermediate layers (blocks 2, 5, 8, 11) and concatenate them as input to the decoder. This step enriches the spatial priors that are otherwise weak in ViTs. As shown in Table 1, incorporating multi-scale features considerably improved DSC by 2.10% in AMOS22.

Higher resolution training To preserve local information, Primus propose to decrease the patch size during tokenization from 16 to 8, and found this beneficial for 3D volumetric segmentation. However, existing vision FMs are rarely pretrained using patch size of 8, possibly due to increased computational overheads. As an alternative, we propose to conduct high resolution segmentation training by resampling axial slices to thinner spacing. Following DINOv3 [15], we maintain an input resolution of 896 × 896. As shown in Table 1, increasing resolution from 640 × 640 to 896 × 896 improved DSC by 2.06% on AMOS22.

## 3.2 Domain-adaptive pretraining on CT-3M

With an effective architecture, we aim to pretrain MedDINOv3 using a diverse, large-scale medical imaging dataset CT-3M, to better align its representations to medical imaging. We follow the 3-stage pretraining recipe developed by DINOv3 [15].

Data curation We curated a large-scale CT dataset CT-3M totaling 3,868,833 axial slices, aggregated from 16 publicly available datasets. Specifically, our datasets include: BTCV [33], Pancreas-CT (TCIA) [34], CHAOS [35], LiTS [36], KiTS [37], WORD [38], AbdomenCT-1K [39], AMOS22 [1], and five CT tasks from Medical Segmentation Decathlon (Liver, Lung, Pancreas, Hepatic Vessel, Spleen, Colon) [40], CT-ORG [41], TotalSegmentator [42] and AbdomenAtlas 3.0 [43]. This data curation provides broad anatomical coverage (over 100 structures) across abdominal, thoracic, and pelvic regions, ensuring both scale and heterogeneity for domain-adaptive pretraining. All 3D volumes were resampled to an in-plane spacing of 0.45 mm and 0.45 mm, and then resized to uniform resolution $2 5 6 \times 2 5 6$

Stage 1 We pretrain using the original DINOv2 losses: an image-level objective $L _ { \mathrm { D I N O } }$ enforcing global-local crop invariance, a patch-level latent reconstruction objective $L _ { \mathrm { i B O T } }$ which learns the local patch correspondence, and a regularization loss $L _ { \mathrm { K o l e o } }$ encouraging the features within a batch to spread uniformly in the latent space. The stage 1 loss is defined as follows:

$$
\mathcal { L } _ { \mathrm { S t a g e 1 } } = \mathcal { L } _ { \mathrm { D I N O } } + \mathcal { L } _ { \mathrm { i B O T } } + 0 . 1 \cdot \mathcal { L } _ { \mathrm { K o l e o } } .\tag{1}
$$

Stage 2 However, DINOv2 training showed that global losses tend to dominate as training progresses, leading to a slow erosion of patch-level quality [15]. To address this, stage 2 introduces gram anchoring to mitigate the degradation of patch-level consistency. The motivation is that global and local objectives are only weakly correlated, while optimizing for global consistency often harms local feature quality. Gram anchoring regularizes Gram matrix, the matrix of all pairwise dot products of patch features in an image. Specifically, we encourage the Gram matrix of the student to align with that of an earlier model, referred to as the Gram teacher. The Gram teacher is chosen from an early checkpoint of the EMA student network, which retains stronger dense features. Formally, given an image with P patches, and a network that operates in dimension d. Let $\mathbf { X } _ { S }$ and $\mathbf { X } _ { G }$ denote the $P \times d$ matrix of $L _ { 2 }$ -normalized local features of the student and the Gram teacher respectively. We define the loss ${ \mathcal { L } } _ { \mathrm { G r a m } }$ as follows:

$$
\mathcal { L } _ { \mathrm { G r a m } } = \left\| \mathbf { X } _ { S } \cdot \mathbf { X } _ { S } ^ { \top } - \mathbf { X } _ { G } \cdot \mathbf { X } _ { G } ^ { \top } \right\| _ { F } ^ { 2 } .\tag{2}
$$

This loss is only computed on the global crops across all patch tokens. In our implementation, we start this stage after 100k iterations of pretraining, for a total of 20k iterations. We also leverage higher-resolution CT images as the input to the Gram teacher. Specifically, we feed images at $5 1 2 \times 5 1 2$ into the Gram teacher, then downsample the resulting feature maps by a factor of 2 to match the spatial dimensions of the student output. The stage 2 loss is defined as:

$$
{ \mathcal { L } } _ { \mathrm { S t a g e 2 } } = { \mathcal { L } } _ { \mathrm { D I N O } } + { \mathcal { L } } _ { \mathrm { i B O T } } + { \mathcal { L } } _ { \mathrm { K o l e o } } + 2 * { \mathcal { L } } _ { \mathrm { G r a m } } .\tag{3}
$$

Stage 3 The final stage adapts the pretrained model to process higher-resolution images, which is particularly relevant to our tasks. We follow DINOv3 by mixing global and local crops of various resolutions (e.g., global crops 512–768, local crops 112–336). Importantly, we retain gram anchoring to ensure that patch similarity structures remain stable. This stage lasts for 10k iterations. We found that high-resolution adaptation substantially improves the model’s dense feature (Fig. 3).

Implementation details We pretrain MedDINOv3 for a total of 120k iterations, using a global batch size of 512. We initialize with the DINOv3 ViT-B checkpoint pretrained on LVD-1689M. For stage 1, we use a learning rate of 2e-4 and train for 100k iterations. For stage 2, we select a EMA model at 20k iteration as our Gram teacher, and continue pretraining with gram anchoring objective for 10k iterations. This stage uses a learning rate of 5e-5. For step 3, we initialize teacher and student with the previous model from stage 2, and train for another 10k iterations using a learning rate of 2.5e-5.

## 4 Results

## 4.1 Experiment settings

Evaluation Dataset To comprehensively evaluate existing 2D segmentation methods, we conducted extensive experiments on four publicly available datasets. These datasets cover a wide spectrum of tasks in medical image segmentation (i.e. OARs and tumor), spanning diverse imaging modalities (e.g., CT and MRI). In addition to AMOS22, we added the following datasets: 1). KiTS23 [37], kidney tumor dataset with 489 CT volumes with annotations provided for kidney, tumor and cysts; 2). LiTS [36], liver tumor segmentation dataset with 131 CT volumes with annotated liver and tumor classes; 3). BTCV [33], a contrast-enhanced abdominal CT dataset with 50 scans with manual segmentation of 13 organs. Due to high computational costs, we trained and evaluated with only one fold (80/20 split) of the default five-fold cross-validation scheme. For evaluation metrics, we use the standard dice similarity coefficient (DSC) and normalized surface dice (NSD).

![](Images_WQKECV7Y/d932d0022b5026769131d59832a79356e4f510b33f42e51e63831968ee1b0d14.jpg)  
Figure 3: High-resolution dense features of MedDINOv3. We visualize the cosine similarity maps between the patches marked with a red dot and all other patches. Input image at $2 0 4 8 \times 2 0 4 8$

Implementation details We performed training and evaluation within the nnU-Net framework in PyTorch. We summarize the preprocessing details used for each dataset in Table. All models were trained for 1,000 epochs, each consisting of 250 steps. Unless stated otherwise, input patch size, batch size, and voxel spacing follow the specific configurations defined by the respective nnU-Net plans. We report the following methods for comparison and detail the training configurations:

1. nnU-Net [4]: Strongest supervised CNN baseline. Following the default nnU-Net v2 configuration, we use a learning rate of $1 \times 1 0 ^ { - 2 }$ , weight decay of $3 \times 1 0 ^ { - 5 }$ , gradient clipping set to 12, and the SGD optimizer with Nesterov momentum (0.99), along with the default nnU-Net PolyLR scheduler.

2. SegFormer [44]: A hierarchical transformer model with a lightweight MLP decoder architecture to directly fuse multi-level features. We adjust the learning rate to $5 \times 1 0 ^ { - 5 }$ and use the AdamW optimizer.

3. DINO U-Net [45]: A newly developed U-Net architecture supporting DINOv3 integration. We use the standard nnU-Net hyperparameters, but with the encoder backbone frozen, as described in the original paper.

4. MedDINOv3: Our proposed method. We adapt the hyperparameters from Primus and use a higher input resolution of 896 × 896. The Primus model is trained using a learning rate of $3 \times 1 0 ^ { - 4 }$ and a weight decay of $\dot { 5 } \times 1 0 ^ { - 2 }$ . We apply a DropPath rate of 0.2 and use LayerScale with a value of $1 \times 1 0 ^ { - 5 }$ . The optimizer is AdamW, configured with betas set to (0.9, 0.98).

## 4.2 Comparisons with state-of-the-art methods

We compare MedDINOv3 against CNN and transformer baselines on four public segmentation benchmarks (Table 2). Our MedDINOv3 consistently outperforms the best baseline nnU-Net in AMOS22 by 2.6% DSC and BTCV by 5.49% DSC. On tumor segmentation datasets, MedDINOv3 reaches 70.68 DSC on KiTS23 and 75.28 DSC on LiTS, performing on par with nnU-Net. In terms of boundary accuracy, MedDINOv3 maintains strong NSD scores for organ-at-risk segmentation, while only slightly trailing nnU-Net on tumor datasets. DINO U-Net, despite leveraging the DINOv3 foundation model, did not outperform nn-UNet, possibly due to its reliance on hierarchical CNN decoders. SegFormer, developed for natural image segmentation, underperforms across all datasets, reflecting its weaker inductive bias and reliance on large-scale labeled data. Overall, these results demonstrate that combining architectural improvements and domain-adaptive pretraining produces transferable representations for medical imaging, narrowing the gap with and in several cases surpassing the long-established nnU-Net baseline.

Table 2: Performances on four public segmentation benchmarks. We report average DSC and NSD of all datasets. Due to computational constraints, the results are only calculated for one fold of a 5-fold cross-validation.
<table><tr><td rowspan="2">Method</td><td colspan="4">DSC (%)↑</td><td colspan="4">NSD (%)↑</td></tr><tr><td>AMOS22</td><td>KiTS23</td><td>LiTS</td><td>BTCV</td><td>AMOS22</td><td>KiTS23</td><td>LiTS</td><td>BTCV</td></tr><tr><td>nnU-Net</td><td>84.81</td><td>69.15</td><td>75.00</td><td>73.30</td><td>73.98</td><td>64.85</td><td>53.02</td><td>64.66</td></tr><tr><td>SegFormer</td><td>78.50</td><td>57.73</td><td>65.45</td><td>37.04</td><td>65.20</td><td>47.65</td><td>35.98</td><td>22.39</td></tr><tr><td>Dino U-Net (B)</td><td>80.90</td><td>59.77</td><td>72.89</td><td>66.88</td><td>67.00</td><td>51.05</td><td>48.25</td><td>56.23</td></tr><tr><td>MedDINOv3 (ours)</td><td>87.38</td><td>70.68</td><td>75.28</td><td>78.79</td><td>77.15</td><td>62.67</td><td>53.01</td><td>70.38</td></tr></table>

![](Images_WQKECV7Y/8d70015e24848da4ea8c4b7023742f99e3b44e9710c4844077b75795505a438b.jpg)  
Image

![](Images_WQKECV7Y/6e4f1e0e9385752c3bfd71df43237a95327bb6bd21803d0e2ab0dc84c97ed868.jpg)  
Stage 1: 50k

![](Images_WQKECV7Y/ab78f14472bcdd0321b67af6bef2258f3fafe5c09a2d4135021200bb056a7616.jpg)  
Stage 1: 100k

![](Images_WQKECV7Y/9ac8fd5c82434fd833ec5958d7290b9958cc535bd8698296abb56c53da2a74a4.jpg)  
Stage 2: 10k

![](Images_WQKECV7Y/44fd23b9c0397f5c78412e15279c5131e0b519efb695f3f3050b4a0d6f1ffe72.jpg)  
Stage 3: 10k  
Figure 4: Evolution of the cosine similarity between the reference patch (marked in red) and all other patches. We did not observe severe patch degradation in stage 1.

## 4.3 Ablation study

Gram anchoring is optional We study the effect of pretraining on CT-3M on segmentation performances. As shown in Table 3, stage 1 pretraining improves DSC by 1.07%, which highlights the effectiveness of DINOv2 style pretraining for learning good dense features. However, surprisingly we did not observe much gains from stage 2 with gram anchoring. We suspect that this is because the quality of patch tokens did not degrade much during stage 1 pretraining. To confirm this, we visualize them in Figure 4. Nevertheless, adapting the model to higher resolution improved DSC by 0.84% and maintained the consistency of feature maps.

## 5 Conclusion

In this work, we present MedDINOv3, a simple yet effective framework for adapting vision foundation models to medical image segmentation. We refine plain Vision Transformers for medical image segmentation by proposing multi-scale token aggregation to enhance the spatial priors. We also maintain the local intricate structures by conducting high-resolution training. Building on this architecture, we curated CT-3M, a large-scale CT dataset, and performed domain-adaptive pretraining with DINOv3. Our systematic analysis of the three-stage pretraining recipe revealed that DINOv2-style self-distillation (Stage 1) and high-resolution adaptation (Stage 3) substantially improve feature transferability, while gram anchoring (Stage 2) provides only marginal additional benefits in our setting. Our MedDINOv3 consistently outperforms or matches strong CNN and transformer baselines in organ-at-risk segmentation, while achieving competitive performance on tumor segmentation tasks. Our results indicate that simple ViT-based architectures, when paired with domain-adaptive pretraining, can close the gap or exceed the performance of specialized CNNs. Overall, MedDINOv3 demonstrates that carefully adapting foundation models with targeted architectural refinements and domain-aligned pretraining offers a powerful and generalizable solution for medical image segmentation.

Table 3: Ablation on multi-stage pretraining for MedDINOv3 on AMOS22.
<table><tr><td>Stage 1: Pretraining</td><td></td><td>Stage 2: Gram AnchoringStage 3: Adapting to higher resolution |DSC (%)</td><td></td></tr><tr><td></td><td>×</td><td>×</td><td>85.51</td></tr><tr><td>×&gt;</td><td>×</td><td>×</td><td>86.58</td></tr><tr><td>√</td><td>√</td><td>×</td><td>86.54</td></tr><tr><td></td><td>√</td><td>√</td><td>87.38</td></tr></table>

## Acknowledgments

This research is supported in part by the National Institutes of Health under Award Numbers R01EB032680, R01DE033512, and R01CA272991.

## References

[1] Yuanfeng Ji, Haotian Bai, Chongjian Ge, Jie Yang, Ye Zhu, Ruimao Zhang, Zhen Li, Lingyan Zhanng, Wanling Ma, Xiang Wan, et al. Amos: A large-scale abdominal multi-organ benchmark for versatile medical image segmentation. Advances in neural information processing systems, 35:36722–36732, 2022.

[2] Yuheng Li, Jacob F Wynne, Yizhou Wu, Richard LJ Qiu, Sibo Tian, Tonghe Wang, Pretesh R Patel, David S Yu, and Xiaofeng Yang. Automatic medical imaging segmentation via self-supervising large-scale convolutional neural networks. Radiotherapy and Oncology, 204:110711, 2025.

[3] Yucheng Tang, Dong Yang, et al. Self-supervised pre-training of swinunetr for 3d medical image analysis. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR) Workshops, pages 207–218, 2022.

[4] Fabian Isensee, Paul F Jaeger, Simon A A Kohl, Jens Petersen, and Klaus H Maier-Hein. nnu-net: a self-adapting framework for u-net-based medical image segmentation. Nature Methods, 18(2):203–211, 2021.

[5] Ali Hatamizadeh, Vishwesh Nath, et al. Swin unetr: Swin transformers for semantic segmentation of brain tumors in mri images. In International Conference on Medical Image Computing and Computer-Assisted Intervention (MICCAI), pages 272–284. Springer, 2022.

[6] Jun Ma, Bo Wang, et al. Segment anything in medical images. Nature Communications, 14(1):2578, 2023.

[7] Rishi Bommasani, Drew A Hudson, Ehsan Adeli, and et al. On the opportunities and risks of foundation models. arXiv preprint arXiv:2108.07258, 2021.

[8] Xingyu Zhou, Zheng Zhang, et al. A comprehensive survey on pretraining-based foundation models: A history from bert to chatgpt. arXiv preprint arXiv:2302.09419, 2023.

[9] Yuheng Li, Mingzhe Hu, and Xiaofeng Yang. Polyp-sam: Transfer sam for polyp segmentation. In Medical imaging 2024: computer-aided diagnosis, volume 12927, pages 749–754. SPIE, 2024.

[10] Shansong Wang, Mojtaba Safari, Mingzhe Hu, Qiang Li, Chih-Wei Chang, Richard LJ Qiu, and Xiaofeng Yang. Dinov3 with test-time training for medical image registration. arXiv preprint arXiv:2508.14809, 2025.

[11] Mathilde Caron, Hugo Touvron, Ishan Misra, and et al. Emerging properties in self-supervised vision transformers. In Proceedings of the IEEE/CVF International Conference on Computer Vision (ICCV), pages 9630–9640, 2021.

[12] Alec Radford, Jong Wook Kim, Chris Hallacy, Aditya Ramesh, Gabriel Goh, Sandhini Agarwal, Girish Sastry, Amanda Askell, Pamala Mishkin, Jack Clark, Gretchen Krueger, and Ilya Sutskever. Learning transferable visual models from natural language supervision. In Proceedings of the 38th International Conference on Machine Learning (ICML), pages 8748–8763, 2021.

[13] Michael Tschannen, Xiaohua Zhai, Andreas Steiner, Lucas Beyer, et al. Siglip 2: Better, faster, stronger. arXiv preprint arXiv:2501.01536, 2025.

[14] Maxime Oquab, Timothée Darcet, Théo Moutakanni, and et al. Dinov2: Learning robust visual features without supervision. arXiv preprint arXiv:2304.07193, 2023.

[15] Oriane Siméoni, Huy V Vo, Maximilian Seitzer, and et al. Dinov3: Advancing self-supervised learning at scale. arXiv preprint arXiv:2508.10104, 2025.

[16] Fabian Isensee, Tassilo Wald, Constantin Ulrich, Michael Baumgartner, Saikat Roy, Klaus Maier-Hein, and Paul F Jaeger. nnu-net revisited: A call for rigorous validation in 3d medical image segmentation. In International Conference on Medical Image Computing and Computer-Assisted Intervention, pages 488–498. Springer, 2024.

[17] Mohammed Baharoon, Waseem Qureshi, Jiahong Ouyang, Yanwu Xu, Abdulrhman Aljouie, and Wei Peng. Evaluating general purpose vision foundation models for medical image analysis: An experimental study of dinov2 on radiology benchmarks. arXiv preprint arXiv:2312.02366, 2024.

[18] Xiaohua Zhai, Alexander Kolesnikov, Neil Houlsby, and Lucas Beyer. Scaling vision transformers. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pages 12104–12113, 2022.

[19] Haotian Zhang, Xuanyu Dong, Jie Chen, et al. Vit-adapter: Exploring efficient adaptation of vision transformers for dense predictions. Advances in Neural Information Processing Systems (NeurIPS), 2023.

[20] Bowen Cheng, Alexander Schwing, and Alexander Kirillov. Masked-attention mask transformer for universal image segmentation. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 1290–1299, 2022.

[21] Ali Hatamizadeh, Yucheng Tang, Vishwesh Nath, Dong Yang, Andriy Myronenko, Bennett Landman, Holger R Roth, and Daguang Xu. Unetr: Transformers for 3d medical image segmentation. In Proceedings of the IEEE/CVF winter conference on applications of computer vision, pages 574–584, 2022.

[22] Yutong Xie, Jianpeng Zhang, Chunhua Shen, and Yong Xia. Cotr: Efficiently bridging cnn and transformer for 3d medical image segmentation. In International conference on medical image computing and computer-assisted intervention, pages 171–180. Springer, 2021.

[23] Yutong Xie, Jianpeng Zhang, Yong Xia, and Qi Wu. Unimiss: Universal medical self-supervised learning via breaking dimensionality barrier. In European Conference on Computer Vision, pages 558–575. Springer, 2022.

[24] Jieneng Chen, Yongyi Lu, et al. Transunet: Transformers make strong encoders for medical image segmentation. arXiv preprint arXiv:2102.04306, 2021.

[25] Hong-Yu Zhou, Jiansen Guo, Yinghao Zhang, Lequan Yu, Liansheng Wang, and Yizhou Yu. nnformer: Interleaved transformer for volumetric segmentation. arXiv preprint arXiv:2109.03201, 2021.

[26] Tassilo Wald, Saikat Roy, Fabian Isensee, et al. Primus: Enforcing attention usage for 3d medical image segmentation. arXiv preprint arXiv:2503.01835, 2025.

[27] Tommie Kerssies, Niccolò Cavagnero, Alexander Hermans, et al. Your vit is secretly an image segmentation model. arXiv preprint arXiv:2503.19108, 2025.

[28] Zongwei Zhou, Vatsal Sodha, Jiaxuan Pang, Michael B Gotway, and Jianming Liang. Models genesis. Medical image analysis, 67:101840, 2021.

[29] Tassilo Wald, Constantin Ulrich, Stanislav Lukyanenko, Andrei Goncharov, Alberto Paderno, Maximilian Miller, Leander Maerkisch, Paul Jaeger, and Klaus Maier-Hein. Revisiting mae pre-training for 3d medical image segmentation. In Proceedings of the Computer Vision and Pattern Recognition Conference, pages 5186–5196, 2025.

[30] Yuheng Li, Tianyu Luan, Yizhou Wu, Shaoyan Pan, Yenho Chen, and Xiaofeng Yang. Anatomask: Enhancing medical image segmentation with reconstruction-guided self-masking. In European Conference on Computer Vision, pages 146–163. Springer, 2024.

[31] Guoping Xu, Xuan Zhang, Xinwei He, and Xinglong Wu. Levit-unet: Make faster encoders with transformer for medical image segmentation. In Chinese Conference on Pattern Recognition and Computer Vision (PRCV), pages 42–53. Springer, 2023.

[32] Yunhe Gao, Mu Zhou, and Dimitris N Metaxas. Utnet: a hybrid transformer architecture for medical image segmentation. In International conference on medical image computing and computer-assisted intervention, pages 61–71. Springer, 2021.

[33] Bennett Landman, Zhoubing Xu, Juan Igelsias, Martin Styner, Thomas Langerak, and Arno Klein. Miccai multi-atlas labeling beyond the cranial vault–workshop and challenge. In Proc. MICCAI multi-atlas labeling beyond cranial vault—workshop challenge, volume 5, page 12. Munich, Germany, 2015.

[34] Holger R Roth, Le Lu, Amal Farag, Hoo-Chang Shin, Jiamin Liu, Evrim B Turkbey, and Ronald M Summers. Deeporgan: Multi-level deep convolutional networks for automated pancreas segmentation. In International conference on medical image computing and computer-assisted intervention, pages 556–564. Springer, 2015.

[35] A Emre Kavur, N Sinem Gezer, Mustafa Barı¸s, Sinem Aslan, Pierre-Henri Conze, Vladimir Groza, Duc Duy Pham, Soumick Chatterjee, Philipp Ernst, Sava¸s Özkan, et al. Chaos challenge-combined (ct-mr) healthy abdominal organ segmentation. Medical image analysis, 69:101950, 2021.

[36] Patrick Bilic, Patrick Christ, Hongwei Bran Li, Eugene Vorontsov, Avi Ben-Cohen, Georgios Kaissis, Adi Szeskin, Colin Jacobs, Gabriel Efrain Humpire Mamani, Gabriel Chartrand, et al. The liver tumor segmentation benchmark (lits). Medical image analysis, 84:102680, 2023.

[37] Nicholas Heller, Fabian Isensee, Dasha Trofimova, Resha Tejpaul, Zhongchen Zhao, Huai Chen, Lisheng Wang, Alex Golts, Daniel Khapun, Daniel Shats, et al. The kits21 challenge: Automatic segmentation of kidneys, renal tumors, and renal cysts in corticomedullary-phase ct. arXiv preprint arXiv:2307.01984, 2023.

[38] Xiangde Luo, Wenjun Liao, Jianghong Xiao, Jieneng Chen, Tao Song, Xiaofan Zhang, Kang Li, Dimitris N Metaxas, Guotai Wang, and Shaoting Zhang. Word: A large scale dataset, benchmark and clinical applicable study for abdominal organ segmentation from ct image. Medical Image Analysis, 82:102642, 2022.

[39] Jun Ma, Yao Zhang, Song Gu, Cheng Zhu, Cheng Ge, Yichi Zhang, Xingle An, Congcong Wang, Qiyuan Wang, Xin Liu, et al. Abdomenct-1k: Is abdominal organ segmentation a solved problem? IEEE Transactions on Pattern Analysis and Machine Intelligence, 44(10):6695–6714, 2021.

[40] Michela Antonelli, Annika Reinke, Spyridon Bakas, Keyvan Farahani, Annette Kopp-Schneider, Bennett A Landman, Geert Litjens, Bjoern Menze, Olaf Ronneberger, Ronald M Summers, et al. The medical segmentation decathlon. Nature communications, 13(1):4128, 2022.

[41] Blaine Rister, Darvin Yi, Kaushik Shivakumar, Tomomi Nobashi, and Daniel L Rubin. Ct-org, a new dataset for multiple organ segmentation in computed tomography. Scientific Data, 7(1):381, 2020.

[42] Jakob Wasserthal, Hanns-Christian Breit, Manfred T Meyer, Maurice Pradella, Daniel Hinck, Alexander W Sauter, Tobias Heye, Daniel T Boll, Joshy Cyriac, Shan Yang, et al. Totalsegmentator: robust segmentation of 104 anatomic structures in ct images. Radiology: Artificial Intelligence, 5(5):e230024, 2023.

[43] Pedro RAS Bassi, Mehmet Can Yavuz, Kang Wang, Xiaoxi Chen, Wenxuan Li, Sergio Decherchi, Andrea Cavalli, Yang Yang, Alan Yuille, and Zongwei Zhou. Radgpt: Constructing 3d image-text tumor datasets. arXiv preprint arXiv:2501.04678, 2025.

[44] Enze Xie, Wenhai Wang, Zhiding Yu, Anima Anandkumar, Jose M Alvarez, and Ping Luo. Segformer: Simple and efficient design for semantic segmentation with transformers. Advances in neural information processing systems, 34:12077–12090, 2021.

[45] Yifan Gao, Haoyue Li, Feng Yuan, Xiaosong Wang, and Xin Gao. Dino u-net: Exploiting high-fidelity dense features from foundation models for medical image segmentation. arXiv preprint arXiv:2508.20909, 2025.