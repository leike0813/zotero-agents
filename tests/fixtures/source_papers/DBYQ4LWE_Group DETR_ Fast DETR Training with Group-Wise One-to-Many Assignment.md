CvF

This ICCV paper is the Open Access version, provided by the Computer Vision Foundation. Except for this watermark, it is identical to the accepted version; the final published version of the proceedings is available on IEEE Xplore.

# Group DETR: Fast DETR Training with Group-Wise One-to-Many Assignment

Qiang Chen1\*, Xiaokang Chen2\*, Jian Wang1, Shan Zhang3 Kun Yao1, Haocheng Feng1, Junyu Han1, Errui Ding1, Gang Zeng², Jingdong Wang1† 1Baidu VIS 2Key Lab. of Machine Perception (MoE), School of IST, Peking University 3 Australian National University {chenqiang13,wangjian33}@baidu.com {fenghaocheng,hanjunyu,dingerrui, wangjingdong}@baidu.com {pkucxk,gang. zeng}@pku.edu.cn, shan . zhang@anu.edu.au

# Abstract

Detection transformer(DETR) relies on one-to-one assignment, assigning one ground-truth object to one prediction,for end-to-end detection without NMS post-processing. It is known that one-to-many assignment, assigning one ground-truth object to multiple predictions,succeeds in detectionmethods such as FasterR-CNN and FCOS.While the naive one-to-many assignment does not work for DETR, and it remains challenging to apply one-to-many assignment for DETR training.In this paper, we introduce Group DETR,a simple yet efficient DETR training approach that introduces a group-wise way for one-to-many assignment. This approach involves using multiple groups of object queries,conducting one-to-one assignment within each group,and performing decoder self-attention separately. It resembles data augmentation with automaticallylearned object query augmentation. It is also equivalent to simultaneously training parameter-sharing networks of the same architecture, introducing more supervision and thus improving DETR training. The inference process is the same as DETR trained normally and only needs one group of queries without any architecture modification. Group DETR is versatile and is applicable to various DETR variants. The experiments show that Group DETR significantly speeds up the training convergence and improves the performance of various DETR-based models. Code will be available at https: //github.com/Atten4Vis/ GroupDETR.

# 1. Introduction

Detection Transformer (DETR） [2] conducts end-toend object detection without the need of many handcrafted components, such as non-maximum suppression (NMS) [14] and anchor generation [33,23,32]. The architecture consists of a CNN [13] and transformer encoder [37],and a transformer decoder that consists of selfattention,cross-attention and FFNs,followed by class and box prediction FFNs. During training,one-to-one assignment, where one ground-truth object is assigned to one single prediction,is applied for learning to only promote the predictions assigned to ground-truth objects,and demote the duplicate predictions.

![](Images_JIUUB83I/14e457d35fa09c3253b173b5b5c6bb236a908aac5bacd00e176fb66570a56b84.jpg)  
Figure 1.Group DETR accelerates the training process for DETR variants.The training convergence curves are obtained on COCO val2017[24] with ResNet-50 [13]. Dashed and bold curves correspond to the baseline models and the Group DETR counterparts.Best viewed in color.

This work explores the solutions to accelerate the DETR training process.Previous solutions contain two main lines. The one line is to modify cross-attention so that informative image regions are selected for effectively and efficiently collecting the information from image features. Example methods include sparse sampling,through deformable attention [47],and spatial modulations with modifying object queries [8,30,4,40, 43,25,9]. The other line is to stabilize one-to-one assignment during training, e.g., feeding ground-truth bounding boxes with noises into transformer

decoder [20, 44].

We are interested in the second line. Instead of focusing on stabilizing the assignment like DN-DETR [2O], we study the assignment scheme for efficient DETR training from a new perspective: introducing more supervision. It has been proven that assigning one ground-truth object to multiple predictions,i.e., one-to-many assignment, is successful in traditional object detection methods,e.g., Faster R-CNN [33] and FCOS [36] with more anchors and pixels assigned to one ground-truth object. Unfortunately, naive one-to-many assignment does not work for DETR training. It remains a challenge to apply one-to-many assignment to DETR training.

We present a simple yet efficient DETR training approach that uses a group-wise way for one-to-many assignment,called Group DETR. Our approach is based on that end-to-end detection with successful removal of NMS postprocessing for DETR comes from the joint effect of two components [2, 3O]: decoder self-attention, which collects the information of other predictions,and one-to-one assignment, which expects to learn to score one prediction higher and other duplicate predictions lower for one ground-truth object.

Our approach adopts $K$ groups of object queries,and introduces group-wise one-to-many assignment. This assignment scheme conducts one-to-one assignment within each group of object queries,resulting in that one ground-truth object is assigned to multiple predictions. It is encouraged that the prediction assigned to the ground-truth object gets a high score,and other duplicate predictions from the same group of queries get low scores. In other words, the predictions make competition within each group. Thus,our approach uses separate self-attention,i.e.,self-attention is done for each group separately, eliminating the influence of predictions from other groups and easing DETR training. Regarding inference,it is the same as DETR trained normally,and only needs a single group of object queries.

The resulting architecture is equivalent to DETR with a group of parallel decoders,illustrated in Figure 2 (a). During training，the parallel decoders boost each other through sharing decoder parameters and using different object queries. On the other hand, using more groups of object queries resembles data augmentation, and behaves as query augmentation. It introduces more supervision and improve the decoder training.In addition, it is empirically observed that the encoder training is also improved, presumably with the help of the improved decoder.

Group DETR is versatile and is applicable to various DETR variants. Extensive experiments demonstrates that our approach is effective in achieving fast training convergence,shown in Figure 1. Group DETR obtains consistent improvements on various DETR-based methods [30,25, 20, 44]. For instance, Group DETR significantly improves

Conditional DETR-C5 by $\mathrm { 5 . 0 ~ m A P }$ with 12-epoch training on COCO [24]. The non-trivial improvements hold when we adopt longer training schedules (e.g., 36 epochs and 50 epochs). Furthermore,Group DETR outperforms baseline methods for multi-view 3D object detection [26,27] and instance segmentation [5].

# 2. Background

DETR Architecture. DETR [2] is composed of an encoder, a transformer decoder, and object class and box position predictors. The encoder takes an image $\mathbf { I }$ as input, and outputs the image feature $\mathbf { X }$ ，

$$
\operatorname { E n c o d e r } ( \mathbf { I } ) \to \mathbf { X } .
$$

The decoder receives the image feature $\mathbf { X }$ and the object queries,denoted by a matrix $\mathbf { Q } \left( = \left[ \mathbf { q } _ { 1 } \mathbf { q } _ { 2 } \ldots \ldots \mathbf { q } _ { N } \right] \right)$ as input, and outputs the embeddings $\tilde { \mathbf { Q } }$ ,followed by the predictors with the output denoted by $\mathbf { Y } \left( = \left[ \mathbf { y } _ { 1 } \mathbf { y } _ { 2 } \ldots \mathbf { y } _ { N } \right] \right)$ ，

$$
\operatorname { D e c o d e r } ( \mathbf { X } , \mathbf { Q } ) \to { \tilde { \mathbf { Q } } } , \operatorname { P r e d i c t o r } ( { \tilde { \mathbf { Q } } } ) \to \mathbf { Y } .
$$

The decoder is a sequence of multiple layers. Each layer includes: (i) self-attention over object queries,which performs interactions among queries for collecting the information about duplicate detection; (ii) cross-attention between queries and image features,which collects the information from image features that is useful for object detection; (iii) feed-forward network that processes the queries separately to benefit object detection.

DETR Training. The predictions during DETR training are in the set form, and have no correspondence to the groundtruth objects. DETR uses one-to-one assignment, i.e., one ground-truth object is assigned to one predictions and vice versa,through building a bipartite matching between the predictions and the ground-truth objects:

$$
( \mathbf { y } _ { \sigma ( 1 ) } , \bar { \mathbf { y } } _ { 1 } ) , ( \mathbf { y } _ { \sigma ( 2 ) } , \bar { \mathbf { y } } _ { 2 } ) , \ldots , ( \mathbf { y } _ { \sigma ( N ) } , \bar { \mathbf { y } } _ { N } ) .
$$

Here, $\sigma ( \cdot )$ is the optimal permutation of $N$ indices,and $\left[ \bar { \bf y } _ { 1 } \bar { \bf y } _ { 2 } , . . . \bar { \bf y } _ { N } \right] = \bar { \bf Y }$ correponds to ground truth. The loss is then formulated as below:

$$
\begin{array} { r } { \mathcal { L } = \displaystyle \sum _ { n = 1 } ^ { N } \ell \big ( \mathbf { y } _ { \sigma ( n ) } , \bar { \mathbf { y } } _ { n } \big ) , } \end{array}
$$

where $\ell ( \cdot )$ is a combination of the classification loss and the box regression loss between the ground-truth object $\bar { \mathbf { y } }$ and the prediction y [2, 47, 30].

Optimization with one-to-one assignment aims to score the predictions for promoting one prediction for one ground-truth object, and demoting duplicate predictions. Such scoring needs the comparison of one prediction with other predictions,and the information of other predictions is provided from decoder self-attention over queries. The two designs, one-to-one assignment and self-attention over object queries,are critical for end-to-end detection without the need of the post-processing NMS.

![](Images_JIUUB83I/62b8a09ff6b9406e62d1c0c854fce28ef49eeafe2bb80c4a938c4e71ba629f21.jpg)  
Figure2 Architecureilstration.()OurGoupDETR:group-iseoe-toanysignmentandseparateself-atentio,hitectualy equivalenttoparalleldecoder.(b)Group-wiseone-t-manyasignmentonly.(c)Naiveone-tomanyassignment.Weusetwogroupsof 4 object queries as an example. $\mathbf { X }$ :image features; $\mathbf { Y }$ :predictions; $\bar { \bf Y }$ : ground-truth objects, where two color boxes mean two objects and two gray boxes mean dummy objects (no objects). The color lines between $\mathbf { Y }$ and $\bar { \bf Y }$ correspond to the assignment for ground-truth objects,and the gray lines for dummy objects.For clarity,the predictors are not explicitly included.

One-to-many assignment for non-end-to-end detection. One-to-many assignment is successfully adopted for introducing more supervision to non-end-to-end detection training,such as Faster R-CNN [33], FCOS [36], and so on[12,23,32,45,10,3, 11]. One ground-truth object is assigned to multiple anchors or multiple pixels. During inference,a post-processing NMS is conducted for duplicate detection removal.

# 3. Group DETR

# 3.1. Algorithm

Naive one-to-many assignment. We start from a naive way for one-to-many assignment depcited in Figure 2 (c). We replace one-to-one assignment with one-to-many assignment: assign one ground-truth object to multiple predictions.It does not work and the performance is much low. The reason is that the model is trained to output multiple predictions for one ground-truth object,and lacks the scoring mechanism to promote one single prediction and demote duplicate predictions for one ground-truth object.

Group-wise one-to-many assignment.We adopt the multi-group object query mechanism: form the initial $N$ queries as the primary group and introduce more $\left( K \mathrm { ~ - ~ } 1 \right)$ groups of $N$ queries， totally $K$ groups, $\left\{ \mathbf { Q } _ { 1 } , \mathbf { Q } _ { 2 } , \dots , \mathbf { Q } _ { K } \right\}$ .Accordingly， we have $K$ groups of predictions, $\{ \mathbf { Y } _ { 1 } , \mathbf { Y } _ { 2 } , \dots , \mathbf { Y } _ { K } \}$ .We perform one-to-one assignment for each group,and find a bipartite matching $\sigma _ { k } ( \cdot )$ , between each group of predictions and the groundtruth objects $( \mathbf { Y } _ { k } , \bar { \mathbf { Y } } )$ . This results in that only one prediction for one ground-truth object is expected to score higher, and duplicate predictions is expected to score lower within one group other than within all the groups.

Separate self-attention. One-to-one assignment in one group means that the prediction assigned to one ground

# Algorithm 1 Pseudocode of one Group Decoder Layer

# SA: Self-Attention in the decoder layer   
# CA: Cross-Attention in the decoder layer   
# FFN: FFN in the decoder layer   
# X: output image features of the encoder   
# Q: object queries，with size (KxN，B，C)   
# N, K, B， C: object query number，group number, batch size， feature dimension   
# group decoder   
if training: # split object queries to K groups Q_iist $=$ Q.split(N,dim $_ { ! = 0 }$ ) # a iist of K tensors parallel_Q $=$ cat(Q_list，dim $^ { 1 = 1 }$ ）#(N，KxB，C) # parallel self-attention out $=$ SA(parallel_Q) # (N，KxB，C) # concat all groups: (KxN，B，C) out $=$ cat(out.split(B，dim $^ { = 1 }$ )，dim $_ { ! = 0 }$ ） # cross-attention and ffn out $=$ FFN(CA(out，X))   
else: # in_inference, only one group is kept Q = Q[:N] # (N，B，C) # self-attention, cross-attention， and ffn out $=$ SA(Q) out = FFN(CA(Out，X))

truth object is superior to other predictions within the same group. This implies that we only need to collect the information of the predictions only from the same group,rather than from all the groups. Thus we perform self-attention (abbreviated as SA) over queries for each group separately:

$$
\mathrm { S A } ( \mathbf { Q } _ { 1 } ) , \mathrm { S A } ( \mathbf { Q } _ { 2 } ) , \dots , \mathrm { S A } ( \mathbf { Q } _ { \mathrm { K } } ) .
$$

Training architecture. The resulting architecture for training is very simple: the encoder keeps the same,and the decoder contains $K$ separate parallel decoders as shown in Figure 2 (a):

$$
\begin{array} { r l r } & { } & { \mathrm { D e c o d e r } ( { \bf X } , { \bf Q } _ { 1 } ) \to { \bf Q } _ { 1 } , \mathrm { P r e d i c t o r } ( { \bf Q } _ { 1 } ) \to { \bf Y } _ { 1 } , } \\ & { } & { \mathrm { D e c o d e r } ( { \bf X } , { \bf Q } _ { 2 } ) \to { \bf Q } _ { 2 } , \mathrm { P r e d i c t o r } ( { \bf Q } _ { 2 } ) \to { \bf Y } _ { 2 } , } \end{array}
$$

$$
\operatorname { D e c o d e r } ( \mathbf { X } , \mathbf { Q } _ { K } ) \to \mathbf { Q } _ { K } , \ \operatorname { P r e d i c t o r } ( \mathbf { Q } _ { K } ) \to \mathbf { Y } _ { K } .
$$

![](Images_JIUUB83I/f313726a39f895714afd033565d03c09008bb5fc1fb1ee91a2b16a2992d8ddb3.jpg)  
Figure3.Ilustratingobjectqueries.Thepredictedboxesandreferencepointscorespondingtooectqueries indiffrentgroupsfor thesameground-truthobjectareplottedindiferentcolors withonecolorforonegroup.Itcanbeseenthat hesequeriesarespatilly closeandcanbe viewedasanaugmentationofotherqueries.Theresultsarefrom Group DETRoverConditional DETR-R5O[30].The predicted boxes and reference points may overlap. Best view in color and zoom in.

![](Images_JIUUB83I/0125fdb67cac6fb43ff0115be9c44a87b17cb0fd9419539c25b6c2cac531fa11.jpg)  
Figure 4. The performance across groups of queries are similar. Only a $\pm 0 . 1$ mAP is observed over the median $( 3 7 . 5 \ \mathrm { m A P } )$ .The mAP scores over the COCO val20l7 are reported by a 12-epoch trained Conditional DETR-R50 with Group DETR.

Here, the parameters of the decoder and the predictor for the $K$ groups are shared.Decoder separation and parallelism are feasible in that there is no interaction among queries for the other two operations, cross-attention and FFN. Our approach is called Group Decoder. In model inference,the process is the same as DETR trained normally and only needs one group of queries without any architecture modification. The pseudo-code is shown in Algorithm 1.

Loss function. The loss is an aggregation of $K$ losses, each for one decoder. It is writen as follows,

$$
\mathcal { L } = \frac { 1 } { K } \sum _ { k = 1 } ^ { K } \mathcal { L } _ { k } = \frac { 1 } { K } \sum _ { k = 1 } ^ { K } \sum _ { n = 1 } ^ { N } \ell ( \mathbf { y } _ { \sigma _ { k } ( n ) } , \bar { \mathbf { y } } _ { k n } ) ,
$$

where $\sigma _ { k } ( \cdot )$ is the optimal permutation of $N$ indices for the $k$ th decoder.

# 3.2. Analysis

Explanation with parameter-shared models. We discuss Group DETR from the perspective of training multiple models with parameter sharing. Training with Group DETR can be regarded as simultaneously training $K$ DETR models,which share the parameters of the encoder, the decoder,and the predictor,and only differ in the initialization of object queries. This leads to the shared parameters receive more back-propagated gradients. Thus, these parameters are better trained and accordingly the training process converges faster.

![](Images_JIUUB83I/1e85fafe7039c45db9536021b85595a7c9d40b08a19399c118efbd57207abc73.jpg)  
Figure 5.More stable assignment. The $_ x$ -axis corresponds to #epoch,and the $_ y$ -axis corresponds to instability score (the score is introduced by DN-DETR [2O],the lower the instability score, the more stable the label assignment) over COCO val20l7.One can see that the assignment in Group DETR is more stable than DN-DETR and its baseline DAB-DETR.

As a side benefit, we observe that Group DETR makes the assignment more stable,as shown in Figure 5. We speculate that the stability is because the improved network leads to more reliable predictions,and thus the assignment quality is better.

Explanation with object query augmentation. The multigroup object query mechanism introduces additional $( K -$ 1） group of queries,which can be regarded as an augmentation of the primary group of queries. This is empirically illustrated in Figure 3. The reference points predicting the same objects are spatially close,and thus the corresponding object queries are similar. This may suggest that the multigroup object query mechanism resembles data augmentation,and at each iteration, more automatically-learned augmented queries are included, which equivalently introduces more supervision for decoder training. The results in Figure 4 empirically suggest that different groups of augmented queries lead to similar results.

![](Images_JIUUB83I/cd7c4dc5b824a9c90ff4b940109bedc451296d6e42c6e8bbf21af7ea4ca0ea2b.jpg)  
Figure 6.The parallel decoders in Group DETR are efficiently implemented as parallel self-attention,cross attention and FFN.

The point about more supervision is also observed from the comparison between Equation 6 (for training with Group DETR) and Equation 2 (for normal DETR training). Group DETR training includes $K$ pairs of image feature and object query group $\{ ( \mathbf { X } , \mathbf { Q } _ { 1 } ) , ( \mathbf { X } , \mathbf { Q } _ { 2 } ) , \dotsc , ( \mathbf { X } , \mathbf { Q } _ { K } ) \}$ ， and thus the loss contains more components as shown in Equation 7.

Table 1. Illustrating that training with Group DETR improves both encoder and decoder. The encoder, including CNN and transformer encoders,is initialized from a trained Conditional DETR-R50 [30] with 5O epochs and the decoder is random initilized.(a) (Fixed,Single) $=$ the encoder is not retrained,and the decoder is trained normally without using Group DETR. (b) (Fixed, Group) $=$ the encoder is not retrained,and the decoder is with Group DETR.(c) (Group,Group) $=$ the encoder and the decoder are trained with Group DETR.All the results are got through training with 50 epochs. (c) $>$ (b) implies that Group DETR also improves the encoder training.

<table><tr><td></td><td>Encoder</td><td>Decoder</td><td>mAP</td><td>APs</td><td>APm</td><td>AP</td></tr><tr><td>(a)</td><td>Fixed</td><td>Single</td><td>40.6*</td><td>20.2</td><td>44.0</td><td>59.3</td></tr><tr><td>(b)</td><td>Fixed</td><td>Group</td><td>41.5</td><td>21.2</td><td>45.0</td><td>60.2</td></tr><tr><td>(c)</td><td>Group</td><td>Group</td><td>42.9*</td><td>22.2</td><td>46.6</td><td>61.6</td></tr></table>

\*: Training Conditional DETR with a trained encoder gives slightly lower performances than the one trained regularly, even though we train all components.New hyper-parameters may need to get better results.

Encoder training improvement. The additional supervision introduces more box regression and classification supervision from more queries assigned to each ground-truth object. The gradients with more supervision are also backpropagated from the decoder to the encoder. It is presumable that the encoder also gets benefit, verified by the empirical results in Table1.

Computation and memory complexity. Group DETR uses more decoders during training. It is expected that

![](Images_JIUUB83I/0490ce61cc14a194c0c8ab12f05a1d42ca3a39febc747ae7b5fce0393d206dd1.jpg)  
Figure 7. Baseline models vs their Group DETR counterparts w.r.t training memory. The gray baseline represents using the naive implementation of atention modules.With a memoryefficient implementation [6],Group DETR does not bring much memory burden during training,only requires $_ { 1 . 2 \mathrm { ~ G ~ } }$ and $_ { 1 . 7 \mathrm { ~ G ~ } }$ more GPU memory with Conditional DETR [3O] (‘C-DETR’for short) and DAB-DETR [25].

Table 2.Group DETR outperforms baseline models with a similar training time. Conditional DETR [3O] and DAB-DETR [25] serve as baseline models to compare the performances on COCO val2017 [24].‘C-DETR’and‘w/ Group’are the abbreviations of ‘Conditional DETR’and‘with Group DETR'.The entries noted by grey are the results of baseline models with the same training epochs(12 or 5O epochs) as Group DETR.To match the training times of Group DETR,we adopt longer training shedules for baselines (15 or 6O epochs). The training times are measured on 8 A100 GPUs in hours.

<table><tr><td>Model</td><td>w/ Group</td><td>Hours</td><td>mAP</td><td>APs</td><td>APm</td><td>AP</td></tr><tr><td rowspan="3">C-DETR</td><td></td><td>4.6</td><td>32.6</td><td>14.7</td><td>35.0</td><td>48.3</td></tr><tr><td></td><td>5.8</td><td>34.4</td><td>15.1</td><td>37.3</td><td>51.3</td></tr><tr><td>√</td><td>5.6</td><td>37.6</td><td>18.2</td><td>40.7</td><td>55.9</td></tr><tr><td rowspan="3">C-DETR</td><td></td><td>19.2</td><td>40.9</td><td>20.5</td><td>44.2</td><td>59.6</td></tr><tr><td></td><td>23.0</td><td>41.6</td><td>21.4</td><td>45.1</td><td>60.0</td></tr><tr><td>√</td><td>23.3</td><td>43.4</td><td>23.0</td><td>47.3</td><td>62.3</td></tr><tr><td rowspan="3">DAB-DETR</td><td></td><td>5.6</td><td>35.2</td><td>16.7</td><td>38.6</td><td>51.6</td></tr><tr><td></td><td>7.0</td><td>36.3</td><td>17.1</td><td>39.4</td><td>52.5</td></tr><tr><td>√</td><td>6.6</td><td>39.1</td><td>19.7</td><td>42.5</td><td>56.8</td></tr><tr><td rowspan="3">DAB-DETR</td><td></td><td>23.3</td><td>42.2</td><td>21.5</td><td>45.7</td><td>60.3</td></tr><tr><td></td><td>28.0</td><td>42.9</td><td>22.8</td><td>46.4</td><td>61.9</td></tr><tr><td>√</td><td>27.5</td><td>44.5</td><td>24.2</td><td>48.5</td><td>63.2</td></tr></table>

Group DETR will bring additional training computation costs(FLOPs) as well as training memory costs. But the parallel decoders can be implemented as a single decoder by replacing normal self-attention with parallel self-attention (depicted in Figure 6) and we can use an efficient attention implementation, FlashAttention [6,19]. As a result, Group DETR only takes a small increase in training GPU memory and training time.For example,with Conditional DETR [30] and DAB-DETR [25], the memory increases are just $\mathrm { 1 . 2 G }$ and $1 . 7 \mathrm { G }$ (Figure 7). The training time is increased by 5 minutes per epoch (from 23 minutes to 28 minutes and from 28 minutes to 33 minutes, respectively).

We provide the results by increasing the training time for normal DETR training to see if Group DETR benefits simply from more training time. The results given in Table 2 show that normal training with more training time brings a little beneft and the performance is still much lower than Group DETR, implying that the performance gain from our approach is not from training time incease.

![](Images_JIUUB83I/830cd905fd6654749d9c6a4d57f499021d022e563643dcb9083a174a5b32c48b.jpg)  
Figure 8. Comparisons with DN-DETR.Group DETR outperforms DN-DETR on DAB-DETR [25]( $y$ -axis). Combining those two methods give better results,indicating they are complementary to each other. The $x$ -axis is the mAP scores with a 12- epoch schedule on COCO val20l7.\* represents that we report the best results of DN-DETR among different numbers of denoising queries (detailed results are provided in Appendix).

Connection to DN-DETR.DN-DETR [2O] aims to stabilize one-to-one assignment during DETR training. DNDETR forms the additional queries by adding the noises to ground-truth objects,which can be regarded as a variant of our multi-group mechanism with clear differences.In DNDETR [2O], on the one hand, the number of queries within each additional group is the same as the number of groundtruth objects. Each one correspond to one ground-truth object,and there is no query corresponding to no-object. In contrast, our approach automaticallylearns anumber of $N$ (e.g.,3OO) object queries that correspond to both groundtruth objects and no-object.

On the other hand,DN-DETR performs self-attention over noised queries,mainly for collecting the information from predictions for other objects other than from duplicate predictions. Self-attention in Group DETR instead collects both duplicate predictions and predictions for other objects.

The above two comparisons imply that DN-DETR brings the major help for the box and classification prediction, through the introduction of more positive queries corresponding to ground-truth objects (like FCOS),and no direct help for duplicate prediction removal. Our approach introduces both positive queries and negative queries (noobject)，also brings the help for duplicate prediction removal.

Figure 8 shows that the performance of Group DETR is better than DN-DETR.We further investigate if Group DETR still benefits from introducing more positive queries with noised queries.As shown in Figure 8, the performance gain over Group DETR is non-trivial, a $1 . 5 \mathrm { \ m A P } .$ This implies that Group DETR and DN-DETR are complementary and their major roles are different, though they have some similarities.

# 4. Experiments

We demonstrate the effectiveness of Group DETR in various DETR variants,and its extension to 3D detection and instance segmentation [30, 25,20, 47, 44, 26, 27, 5]. The training setting is almost the same as baseline models,for illustrating the effectiveness of our Group DETR.We adopt the same training settings and hyper-parameters as the baseline models,such as learning rate,optimizer,pre-trained model, initialization methods,and data augmentations1.

# 4.1. Object Detection

Setting. We study various representative DETR-based detectors,such as basic baselines (Conditional DETR [30], DAB-DETR [25], DN-DETR [20]) with dense attentions, and strong baselines (DAB-Deformable-DETR [25,47] and DINO [44, 47]) with deformable attentions. We report the results on two training schedules, training for 12 epochs and training for more epochs (36 or 5O). Unless specified, the models are trained with ResNet-5O[13] as the backbone on the COCO train2017 and evaluated on the COCO val2017. More implementation details are provided in Appendix.

Results. We first report the results of training with 12 epochs in Table 3. Group DETR brings consistent improvements over the baselines with dense attentions that already are superior to the original DETR [2]. It boosts Conditional DETR (-DC5) [30] by 5.0 (4.8) mAP, improves DAB-DETR (-DC5) [25] by 3.9 (4.4) mAP, and brings a 2.0 (2.6) mAP gain to DN-DETR (-DC5) [20].

Group DETR also works well on those strong baselines with deformable attentions that are equipped with two or more accelerating techniques. It gives a $\mathbf { 1 . 5 \ m A P }$ improvements over DAB-Deformable-DETR [25,47]. When applying to DINO [44, 20, 47], Group DETR also exceeds it by $0 . 7 \mathrm { m A P } .$ The gain is non-trivial over such a stronger baseline, considering that DINO is a well-tuned model² based on DAB-Deformable-DETR that combines improved hyperparameters,improved two-stage design,improved query denoising task,and other tricks.

Furthermore, we report the results with 5O training epochs that is commonly adopted in many acceleration methods [47,30,4，25]. Table 4 presents that Group DETR outperforms baseline models by large margins. For the stronger backbone, Swin-Large [29],our approach achieves $5 8 . 4 \mathrm { m A P }$ (still a $0 . 4 \mathrm { m A P }$ higher than its baseline DINO [44] $\mathrm { 5 8 . 0 \ m A P }$ with Swin-Large)). This verifies the generalization ability of our Group DETR.

Table 3. Effectiveness of Group DETR with 12 epochs. Group DETR gives consistent gains over various DETR-based baselines on COCO val2017 [24],highlighted with brackets． All experiments adopt ResNet-50 [13] and do not use multiple patterns [4O]. For DN-DETR,an improved version of DN,dynamic DN groups [44] with $1 0 0 ~ \mathrm { D N }$ queries,is used,making the results slightly different from the ones (with 3 patterns) reported in the original paper [2O] (more results about the number of DN queries can be found in Appendix.‘C-DETR',‘DAB-D-DETR', and‘w/Group’are‘Conditional DETR'[3O],‘DAB-Deformable DETR’[25,47],and‘with Group DETR',respectively, for neat representation.   

<table><tr><td>Model</td><td>w/Group</td><td>mAP</td><td>APs</td><td>APm</td><td>AP</td></tr><tr><td rowspan="2">C-DETR</td><td></td><td>32.6</td><td>14.7</td><td>35.0</td><td>48.3</td></tr><tr><td>√</td><td>37.6 (+5.0)</td><td>18.2</td><td>40.7</td><td>55.9</td></tr><tr><td rowspan="2">C-DETR-DC5</td><td></td><td>36.4</td><td>18.0</td><td>39.6</td><td>52.5</td></tr><tr><td>√</td><td>41.2 (+4.8)</td><td>21.4</td><td>45.0</td><td>58.7</td></tr><tr><td rowspan="2">DAB-DETR</td><td></td><td>35.2</td><td>16.7</td><td>38.6</td><td>51.6</td></tr><tr><td>√</td><td>39.1 (+3.9)</td><td>19.7</td><td>42.5</td><td>56.8</td></tr><tr><td rowspan="2">DAB-DETR-DC5</td><td></td><td>37.5</td><td>19.4</td><td>40.6</td><td>53.2</td></tr><tr><td>√</td><td>41.9 (+4.4)</td><td>23.3</td><td>45.6</td><td>58.4</td></tr><tr><td rowspan="2">DN-DETR</td><td></td><td>38.6</td><td>17.9</td><td>41.6</td><td>57.7</td></tr><tr><td>√</td><td>40.6 (+2.0)</td><td>19.8</td><td>43.9</td><td>59.4</td></tr><tr><td rowspan="2">DN-DETR-DC5</td><td></td><td>41.9</td><td>22.2</td><td>45.1</td><td>59.8</td></tr><tr><td>√</td><td>44.5 (+2.6)</td><td>25.9</td><td>48.2</td><td>62.2</td></tr><tr><td rowspan="2">DAB-D-DETR</td><td></td><td>44.2</td><td>27.5</td><td>47.1</td><td>58.6</td></tr><tr><td>√</td><td>45.7 (+1.5)</td><td>28.1</td><td>49.0</td><td>60.6</td></tr><tr><td rowspan="2">DINO-4scale</td><td></td><td>49.4</td><td>32.3</td><td>52.5</td><td>63.2</td></tr><tr><td>√</td><td>50.1 (+0.7)</td><td>32.4</td><td>53.2</td><td>64.7</td></tr></table>

Last, we compare the training convergence curves of the baseline models and their Group DETR counterparts. The results,as shown in Figure 1, provide more evidence that Group DETR speeds DETR training convergence on various DETR variants.

System-level Results on COCO test-dev with ViT-Huge. We also have the system-level performance on COCO testdev [24] with ViT-Huge [7]. We apply Group DETR to DINO [44] and follow its training pipeline and settings: pretrain the encoder with a self-supervised method, then pretrain the whole model on Object365 [34],and last fine-tune the whole model on COCO [24]. Our model is the first to achieve ${ \bf 6 4 . 5 \ m A P }$ on COCO test-dev,which is still superior to other methods with larger encoder and more pretraining data [28, 39, 41, 42]. The details and comparisons with other methods are provided in Appendix.

# 4.2. More Applications

Group DETR is applicable to DETR-style techniques to other vision problems. We report the results for two additional problems: multi-view 3D object detection [15,22, 26,27] and instance segmentation [5,21], to further demonstrate the effectiveness.

Table 4.Effectiveness of Group DETR with more epochs. Group DETR still outperforms baselines by non-trivial margins with more training epochs (36 or 50 epochs). Setings and notations are consistent with Table 3,except for the training epochs (36 epochs for DINO-4scale by following the original paper [44] and 50 epochs for other models).‘DINO-4scale-Swin-L'means it adopts Swin-Large [29] as the backbone.   

<table><tr><td>Model</td><td>w/Group</td><td>mAP</td><td>APs</td><td>APm</td><td>AP</td></tr><tr><td rowspan="2">C-DETR</td><td></td><td>40.9</td><td>20.5</td><td>44.2</td><td>59.6</td></tr><tr><td>√</td><td>43.4 (+2.5)</td><td>23.0</td><td>47.3</td><td>62.3</td></tr><tr><td rowspan="2">C-DETR-DC5</td><td></td><td>43.7</td><td>23.9</td><td>47.6</td><td>60.1</td></tr><tr><td>√</td><td>45.8 (+2.1)</td><td>26.8</td><td>49.7</td><td>63.1</td></tr><tr><td rowspan="2">DAB-DETR</td><td></td><td>42.2</td><td>21.5</td><td>45.7</td><td>60.3</td></tr><tr><td>√</td><td>44.5 (+2.3)</td><td>24.2</td><td>48.5</td><td>63.2</td></tr><tr><td rowspan="2">DAB-DETR-DC5</td><td></td><td>44.5</td><td>25.3</td><td>48.2</td><td>62.3</td></tr><tr><td>√</td><td>46.7 (+2.2)</td><td>27.6</td><td>50.9</td><td>64.0</td></tr><tr><td rowspan="2">DN-DETR</td><td></td><td>44.0</td><td>23.9</td><td>47.7</td><td>62.9</td></tr><tr><td>√</td><td>45.4 (+1.4)</td><td>25.1</td><td>49.3</td><td>63.8</td></tr><tr><td rowspan="2">DN-DETR-DC5</td><td></td><td>47.5</td><td>27.9</td><td>50.7</td><td>65.9</td></tr><tr><td>√</td><td>48.0 (+0.5)</td><td>29.3</td><td>52.1</td><td>65.4</td></tr><tr><td rowspan="2">DAB-D-DETR</td><td></td><td>48.1</td><td>31.4</td><td>51.4</td><td>63.4</td></tr><tr><td>√</td><td>49.7 (+1.6)</td><td>31.4</td><td>52.5</td><td>65.6</td></tr><tr><td rowspan="2">DINO-4scale</td><td></td><td>50.9</td><td>34.6</td><td>54.1</td><td>64.6</td></tr><tr><td>√</td><td>51.3 (+0.4)</td><td>34.7</td><td>54.5</td><td>65.3</td></tr><tr><td rowspan="2">DINO-4scale-Swin-L</td><td></td><td>58.0</td><td>41.3</td><td>61.9</td><td>74.0</td></tr><tr><td>√</td><td>58.4 (+0.4)</td><td>41.0</td><td>62.5</td><td>73.9</td></tr></table>

Multi-view 3D object detection. We report the results over PETR [26] and PETR v2 [27] on the nuScenes val dataset [1]. Table 5 shows that Group DETR brings significant gains to PETR and PETR v2 with 24 training epochs in terms of both the nuScenes Detection Score (NDS） and mAP scores.

Table 5.Results on multi-view 3D object detection.All experiments are evaluated on the nuScenes val set [1].We train these experiments for 24 epochs with $\mathrm { V o V N e t V 2 }$ [18] as the backbone and with the image size of $8 0 0 \times 3 2 0$ .We follow all the settings and hyper-parameters of PETR [26] and PETR v2 [27].   

<table><tr><td>Model</td><td>w/Group</td><td>NDS</td><td>mAP</td></tr><tr><td rowspan="2">PETR</td><td></td><td>42.0</td><td>37.4</td></tr><tr><td>√</td><td>45.0 (+3.0)</td><td>38.8 (+1.4)</td></tr><tr><td rowspan="2">PETR v2</td><td></td><td>50.3</td><td>40.7</td></tr><tr><td>√</td><td>51.3 (+1.0)</td><td>41.9 (+1.2)</td></tr></table>

Instance segmentation. We demonstrate the effectiveness of the representative method, Mask2Former [5]. The results are given in Table 6. Group DETR achieves a 1.2(0.3) $\mathrm { m A P } ^ { m }$ gain with 12 (50) epochs.

Table 6.Results on instance segmentation. The mask mAP $( \mathrm { m A P } ^ { m } )$ is used for instance segmentation on COCO val2017. We adopt Mask2Former [5] as the baseline.The experiments are conducted with ResNet-50 [13] as the backbone,following all the settings of Mask2Former.   

<table><tr><td>Epochs</td><td>w/ Group</td><td>mAPm</td><td>APm</td><td>APm</td><td>APm</td></tr><tr><td>12</td><td></td><td>38.5</td><td>17.6</td><td>41.4</td><td>60.4</td></tr><tr><td>12</td><td>√</td><td>39.7 (+1.2)</td><td>18.7</td><td>42.8</td><td>60.8</td></tr><tr><td>50</td><td></td><td>43.7</td><td>23.4</td><td>47.2</td><td>64.8</td></tr><tr><td>50</td><td>√</td><td>44.0 (+0.3)</td><td>23.8</td><td>47.1</td><td>65.1</td></tr></table>

Table 7. Effects of group-wise one-to-many assignment and separate self-attention.(a) baseline: one-to-one assignment with 300 object queries.(b) naive one-to-many assignment with 3300 object queries for training and inference.(c) group-wise one-tomany assignment and no separate self-attention with 11 groups of 300 queries,inference with a group of 3Oo queries.(d) groupwise one-to-many assignment and separate self-attention with 11 groups of 30O queries,inference with a group of 3O0 queries. $\scriptstyle 0 2 \mathrm { m }$ $=$ one-to-many, Sep. $\mathrm { S A } =$ separate self-attention.

<table><tr><td></td><td>02m</td><td>Sep. SA</td><td>mAP</td><td>APs</td><td>APm</td><td>APt</td></tr><tr><td>(a)</td><td>×</td><td>×</td><td>32.6</td><td>14.4</td><td>34.9</td><td>48.6</td></tr><tr><td>(b)</td><td>Naive</td><td>×</td><td>8.4</td><td>8.0</td><td>13.2</td><td>13.3</td></tr><tr><td>(c)</td><td>Group</td><td>×</td><td>34.8</td><td>16.4</td><td>37.7</td><td>51.4</td></tr><tr><td>(d)</td><td>Group</td><td>√</td><td>37.6</td><td>18.2</td><td>40.7</td><td>55.9</td></tr></table>

# 4.3. Ablation Study

We conduct the ablation study by using Conditional DETR[3O] as the baseline.The CNNbackbone is ResNet50 [13],and the training epoch nubmer is 12. The performances are evaluated on COCO val2017 [24]. We mainly study the effects of the key design: group-wise one-to-many assignment, separate self-attention, and group number.

Group-wise one-to-many assignment and separate selfattention. Table 7 shows how group-wise one-to-many $( \mathrm { o } 2 \mathrm { m } )$ assignment and separate self-attention make contributions. In comparison to the baseline (a), group-wise $\scriptstyle 0 2 { \mathrm { m } }$ assignment improves the mAP score from $3 2 . 6 \mathrm { m A P }$ to 34.8 mAP: with the gain 2.2. The separate self attention (Sep. SA) further gets a $2 . 8 \ \mathrm { m A P }$ gain. In addition, we report naive one-to-many assignment. The results are very poor, which is reasonable in that there are duplicate predictions and there is a lack of scoring mechanisms for demoting them. The results suggest that both group-wise $\mathrm { { o } } 2 \mathrm { { m } }$ assignment and separate self-attention are effective.

Group number. Figure 9 shows the influence of the number of groups $K$ in Group DETR. The detection performance improves when increasing the number of groups,and becomes stable when the group number reaches 11. Thus, we adopt $K = 1 1$ by default in Group DETR in our experiments.

![](Images_JIUUB83I/a41efa3c979654b082d61d06a95e3d75b4efc0f397331b038953d29fd691edec.jpg)  
Figure 9.Influence of group number. The $x$ -axis is the number of groups.It can be seen that the performance becomes stable when the number of groups reaches 11.

# 5.Related Works

There are two main lines for accelerating DETR training: modify cross-attention and stabilize one-to-one assignment. The two are complementary and can be combined to further boost the performance.

Modifying cross-attention. Cross-attention module aims to collect the information from the image features useful to classification and localization. Various methods are proposed to select the informative image regions more efficiently and effectively [8,4, 40, 43,25,9]. For example, Deformable attention [47] selects the highly informative positions dynamically according to the previous decoder embedding. Conditional DETR [4] instead continues to use the normal global attention,and dynamically computes the spatial attention to softly select the informative regions. SMCA [8] uses the Gaussian-like weight for spatial modulation.

Stabilizing one-to-one assignment. DETR [2] relies on one-to-one assignment,where each ground-truth object is assigned to a single prediction through building a bipartite matching between the predictions and the ground-truth objects. DN-DETR [2O] finds the assignment process is unstable and attributes the slow convergence issue to the instabilities. Thus,DN-DETR [2O] introduces groups of noisy queries by adding noises to ground-truth objects,to stabilize the assignment, leading to faster convergence. DINO [44] makes further improvement through contrastive denoising training to generate both positive and negative noise queries with different noise levels. Our approach studies the assignment mechanism instead for introducing more supervision.

One-to-many assignment. One-to-many assignment is widely adopted in deep detectors [33,12, 23,36],and has attracted a lot of interest [45,17, 46, 10, 3, 38, 35]. For example, Faster R-CNN [33] and FCOS [36] produce multiple positive anchors and pixels for each ground-truth object. In this paper, we investigate one-to-many assignment in a feasible manner for the end-to-end detector DETR.

Concurrent with our work, $\mathcal { H }$ -DETR[16] also uses oneto-many assignment to speed up DETR training convergence.Our Group DETR and $\mathcal { H }$ -DETR are related,but different: (1) Group DETR introduces group-wise one-tomany assignment with separate self-attention with the same number of object queries in each group. $\mathcal { H }$ -DETR adopts hybrid assignments in two different groups: One group uses one-to-one assignment and another uses one-to-many assignment with more object queries.(2) All the decoders in Group DETR can be used for inference. But the additional decoder in $\mathcal { H }$ -DETR is not directly used and requires NMS for inference.(3) During training,our architecture introduces one parameter: the number of groups.In contrast, $\mathcal { H }$ -DETR introduces the number of additional queries and the number of additional positive queries.

DETA [31] is another concurrent work with our Group DETR.DETA directly uses one-to-many assignment and brings NMS back to DETR frameworks.While our method provides group-wise one-to-many assignment and maintains end-to-end detection.

# 6. Conclusion

The key points in Group DETR include group-wise oneto-many assignment and parallel self-attention.The success stems from involving more groups of object queries as an addition to the primary group of object queries,and thus introducing more supervision. Group-wise assignment mechanism makes sure that the competition among predictions happens within each group separately,and separate selfattention eases the training, Thus, the NMS pose-processing is not necessary,and the inference process is kept the same as normally trained DETR and not dependent on the group design.Our approach is simple,easily implemented,and general.

Acknowledgements. Thiswork issupported by theSichuanScienceandTechnologyProgram (2023YFSYOoO8)， National Natural Science Foundation of China (61632003，61375022，61403005)，Grant SCITLAB-20017 of Intelligent Terminal Key Laboratory of SiChuan Province, Beijing Advanced Innovation Center for Intelligent Robots and Systems (2O18IRS11)，and PEK-SenseTime Joint Laboratory of Machine Vision.

# References

[1] Holger Caesar, Varun Bankiti, Alex H Lang, Sourabh Vora, Venice Erin Liong,Qiang Xu,Anush Krishnan,Yu Pan, Giancarlo Baldan,and Oscar Beijbom.nuscenes:A multimodal dataset for autonomous driving.In CVPR,pages 11621-11631,2020.7   
[2] Nicolas Carion,Francisco Massa,Gabriel Synnaeve,Nicolas Usunier,Alexander Kirillov,and Sergey Zagoruyko.End-toend object detection with transformers.In ECCV,2020.1, 2,6,8   
[3] Qiang Chen, Yingming Wang,Tong Yang,Xiangyu Zhang, Jian Cheng,and Jian Sun． You only look one-level feature. In CVPR, pages 13039-13048,2021.3,8   
[4] Xiaokang Chen, Fangyun Wei, Gang Zeng,and Jingdong Wang.Conditional detr v2: Efficient detection transformer with box queries. arXiv preprint arXiv:2207.08914,2022.1, 6,8   
[5] Bowen Cheng, Ishan Misra, Alexander G Schwing,Alexander Kirillov,and Rohit Girdhar.Masked-attention mask transformer for universal image segmentation. arXiv preprint arXiv:2112.01527,2021. 2,6, 7, 8   
[6] Tri Dao，Daniel Y Fu，Stefano Ermon，Atri Rudra, and Christopher Re.Flashattention: Fast and memoryefficient exact attention with io-awareness. arXiv preprint arXiv:2205.14135,2022. 5   
[7] Alexey Dosovitskiy,Lucas Beyer,Alexander Kolesnikov, Dirk Weissenborn, Xiaohua Zhai， Thomas Unterthiner, Mostafa Dehghani, Matthias Minderer, Georg Heigold, Sylvain Gelly,et al. An image is worth 16xl6 words: Transformers for image recognition at scale.In ICLR,2021.7   
[8] Peng Gao,Minghang Zheng,Xiaogang Wang, Jifeng Dai, and Hongsheng Li. Fast convergence of detr with spatially modulated co-attention. In ICCV,pages 3621-3630, 2021. 1,8   
[9] Ziteng Gao,Limin Wang,Bing Han，and Sheng Guo. Adamixer: A fast-converging query-based object detector. In CVPR, pages 5364-5373,2022. 1, 8   
[10] Zheng Ge, Songtao Liu, Zeming Li, Osamu Yoshie,and Jian Sun. Ota: Optimal transport assignment for object detection. In CVPR, pages 303-312,2021. 3,8   
[11] Zheng Ge, Songtao Liu, Feng Wang, Zeming Li,and Jian Sun. Yolox: Exceeding yolo series in 2021. arXiv preprint arXiv:2107.08430,2021. 3   
[12] Kaiming He,Georgia Gkioxari,Piotr Dollar,and Ross Girshick. Mask R-CNN. In ICCV,2017. 3, 8   
[13] Kaiming He,Xiangyu Zhang, Shaoqing Ren,and Jian Sun. Deep residual learning for image recognition.In CVPR, 2016. 1,6,7, 8   
[14] J Hosang,R Benenson，and B Schiele.Learning nonmaximum suppression. PAMI, 2017.1   
[15] Junjie Huang,Guan Huang, Zheng Zhu,and Dalong Du. Bevdet: High-performance multi-camera 3d object detection in bird-eye-view.arXiv preprint arXiv:2112.11790,2021.7   
[16] Ding Jia, Yuhui Yuan, Haodi He, Xiaopei Wu, Haojun Yu, Weihong Lin,Lei Sun, Chao Zhang,and Han Hu. Detrs with hybrid matching. arXiv preprint arXiv:2207.13080,2022. 8   
[17] Kang Kim and Hee Seok Lee.Probabilistic anchor assignment with iou prediction for object detection． In ECCV, pages 355-371. Springer, 2020.8   
[18] Youngwan Lee and Jongyoul Park. Centermask: Real-time anchor-free instance segmentation. In CVPR, pages 13906- 13915,2020. 7   
[19] Benjamin Lefaudeux,Francisco Massa,Diana Liskovich, Wenhan Xiong, Vittorio Caggiano, Sean Naren, Min Xu, Jieru Hu,Marta Tintore,Susan Zhang,Patrick Labatut, and Daniel Haziza. xformers:A modular and hackable transformer modelling library. https: //github.com/ facebookresearch/xformers,2022. 5   
[20] Feng Li, Hao Zhang, Shilong Liu,Jian Guo,Lionel M Ni, and Lei Zhang. Dn-detr: Accelerate detr training by introducing query denoising. In CVPR,2022. 2,4,6, 7,8   
[21] Feng Li,Hao Zhang, Shilong Liu,Lei Zhang,Lionel M Ni, Heung-Yeung Shum,et al. Mask dino: Towards a unified transformer-based framework for object detection and segmentation. arXiv preprint arXiv:2206.02777,2022.7   
[22] Zhiqi Li, Wenhai Wang,Hongyang Li, Enze Xie, Chonghao Sima,Tong Lu, Yu Qiao,and Jifeng Dai. Bevformer: Learning bird's-eye-view representation from multi-camera images via spatiotemporal transformers.arXiv preprint arXiv:2203.17270,2022.7   
[23] Tsung-Yi Lin,Priya Goyal,Ross Girshick,Kaiming He,and Piotr Dollar. Focal loss for dense object detection.In ICCV, 2017. 1, 3, 8   
[24] Tsung-Yi Lin,Michael Maire, Serge Belongie, James Hays, Pietro Perona,Deva Ramanan,Piotr Dollar,and C Lawrence Zitnick. Microsoft COCO: Common objects in context. In ECCV,2014.1,2,5, 7,8   
[25] Shilong Liu,Feng Li, Hao Zhang, Xiao Yang,Xianbiao Qi, Hang Su,Jun Zhu,and Lei Zhang.Dab-detr: Dynamic anchor boxes are better queries for detr.arXiv preprint arXiv:2201.12329,2022. 1,2,5,6,7, 8   
[26] Yingfei Liu, Tiancai Wang, Xiangyu Zhang, and Jian Sun. Petr:Position embedding transformation for multi-view 3d object detection. arXiv preprint arXiv:2203.05625,2022.2, 6,7   
[27] Yingfei Liu,Junjie Yan,Fan Jia, Shuailin Li, Qi Gao, Tiancai Wang,Xiangyu Zhang,and Jian Sun. Petrv2:A unified framework for 3d perception from multi-camera images. arXiv preprint arXiv:2206.01256,2022. 2, 6,7   
[28] Ze Liu,Han Hu, Yutong Lin, Zhuliang Yao, Zhenda Xie, Yixuan Wei,Jia Ning,Yue Cao,Zheng Zhang,Li Dong,etal. Swin transformer v2: Scaling up capacity and resolution. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition,pages 12009-12019,2022.7   
[29] Ze Liu,Yutong Lin,Yue Cao,Han Hu,Yixuan Wei, Zheng Zhang,Stephen Lin,and Baining Guo． Swin transformer: Hierarchical vision transformer using shifted windows. arXiv:2103.14030,2021. 6,7   
[30] Depu Meng，Xiaokang Chen, Zejia Fan,Gang Zeng, Houqiang Li, Yuhui Yuan,Lei Sun,and Jingdong Wang. Conditional detr for fast training convergence.In ICCV, pages 3651-3660,2021. 1,2,4,5,6,7, 8   
[31] Jeffrey Ouyang-Zhang, Jang Hyun Cho, Xingyi Zhou, and Philipp Krahenbuhl.Nms strikes back.arXiv preprint arXiv:2212.06137,2022. 9   
[32] Joseph Redmon and Ali Farhadi. Yolov3:An incremental improvement. arXiv preprint arXiv:1804.02767,2018. 1, 3   
[33] Shaoqing Ren,Kaiming He,Ross Girshick,and Jian Sun. Faster r-cnn: Towards real-time object detection with region proposal networks. NeurIPS,28,2015.1,2,3,8   
[34] Shuai Shao, Zeming Li, Tianyuan Zhang,Chao Peng, Gang Yu, Xiangyu Zhang, Jing Li,and Jian Sun. Objects365: A large-scale, high-quality dataset for object detection. In Proceedings of the IEEE/CVF international conference on computer vision, pages 8430-8439,2019.7   
[35] Peize Sun, Yi Jiang,Enze Xie,Wenqi Shao, Zehuan Yuan, Changhu Wang,and Ping Luo.What makes for end-to-end object detection? In ICML, pages 9934-9944.PMLR, 2021. Q   
[36] Zhi Tian,Chunhua Shen,Hao Chen,and Tong He.Fcos: Fully convolutional one-stage object detection.In ICCV, pages 9627-9636,2019.2,3,8   
[37] Ashish Vaswani,Noam Shazeer,Niki Parmar, Jakob Uszkoreit,Llion Jones,Aidan N Gomez,Lukasz Kaiser,and Illia Polosukhin.Attention is all you need.In NeurIPS,2017.1   
[38] Jianfeng Wang,Lin Song, Zeming Li,Hongbin Sun, Jian Sun,and Nanning Zheng. End-to-end object detection with fully convolutional network. In CVPR, pages 15849-15858, 2021.8   
[39] Wenhui Wang,Hangbo Bao,Li Dong,Johan Bjorck, Zhiliang Peng,Qiang Liu,Kriti Aggarwal, Owais Khan Mohammed, Saksham Singhal, Subhojit Som, et al. Image as a foreign language:Beit pretraining for all vision and visionlanguage tasks. arXiv preprint arXiv:2208.10442,2022.7   
[40] Yingming Wang, Xiangyu Zhang,Tong Yang,and Jian Sun. Anchor detr: Query design for transformer-based detector. In AAAI, 2022. 1, 7, 8   
[41] Yixuan Wei, Han Hu, Zhenda Xie, Zheng Zhang, Yue Cao, Jianmin Bao,Dong Chen,and Baining Guo． Contrastive learning rivals masked image modeling in fine-tuning via feature distillation. arXiv preprint arXiv:2205.14141,2022. 7   
[42] Jianwei Yang, Chunyuan Li, Xiyang Dai, and Jianfeng Gao. Focal modulation networks,2022.7   
[43] Zhuyu Yao, Jiangbo Ai,Boxun Li,and Chi Zhang.Efficient detr: improving end-to-end object detector with dense prior. arXiv preprint arXiv:2104.01318,2021. 1, 8   
[44] Hao Zhang,Feng Li, Shilong Liu,Lei Zhang,Hang Su, Jun Zhu,Lionel M Ni,and Heung-Yeung Shum.Dino:Detr with improved denoising anchor boxes for end-to-end object detection. arXiv preprint arXiv:2203.03605,2022. 2,6,7, 8   
[45] Shifeng Zhang, Cheng Chi, Yongqiang Yao, Zhen Lei, and Stan Z Li. Bridging the gap between anchor-based and anchor-free detection via adaptive training sample selection. In CVPR, pages 9759-9768, 2020. 3, 8   
[46] Benjin Zhu, Jianfeng Wang, Zhengkai Jiang,Fuhang Zong, Songtao Liu,Zeming Li,and Jian Sun. Autoassign: Differentiable label assignment for dense object detection.arXiv preprint arXiv:2007.03496,2020. 8   
[47] Xizhou Zhu, Weijie Su, Lewei Lu, Bin Li, Xiaogang Wang, and Jifeng Dai. Deformable DETR: deformable transformers for end-to-end object detection. CoRR,abs/2010.04159, 2020. 1,2, 6,7, 8