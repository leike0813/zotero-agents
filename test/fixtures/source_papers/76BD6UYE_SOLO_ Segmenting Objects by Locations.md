# Bose-Einstein-like Condensation due to Diffusivity Edge under Periodic Confinement

Benoˆıt Mahault1 & Ramin Golestanian1,2

1Max Planck Institute for Dynamics and Self-Organization (MPIDS), 37077 G¨ottingen, Germany

2Rudolf Peierls Centre for Theoretical Physics, University of Oxford, Oxford OX1   
3NP, United Kingdom

3 March 2022

Abstract. A generic class of scalar active matter, characterized at the mean field level by the diffusivity vanishing above some threshold density, was recently introduced [Golestanian R 2019 Phys. Rev. E 100 010601(R)]. In the presence of harmonic confinement, such diffusivity edge was shown to lead to condensation in the ground state, with the associated transition exhibiting formal similarities with Bose-Einstein condensation (BEC). In this work, the effect of a diffusivity edge is addressed in a periodic potential in arbitrary dimensions, where the system exhibits coexistence between many condensates. Using a generalized thermodynamic description of the system, it is found that the overall phenomenology of BEC holds even for finite energy barriers separating each neighbouring pair of condensates. Shallow potentials are shown to quantitatively affect the transition, and introduce non-universality in the values of the scaling exponents.

## 1. Introduction

Systems in which detailed balance is broken at the microscopic scale are commonly referred to as active matter [1, 2]. This definition encompasses various processes, which often result in self-propulsion of the microscopic units. When coupled to other mechanisms, activity generally triggers novel physics as it possibly leads to nontrivial types of emergent self-organization [3–5].

One of the many fascinating properties of active systems is their ability to phase separate even in the absence of explicit attractive interactions. A good example of such a feature is the motility-induced phase separation, which emerges when persistent motion is coupled to local motility inhibition [6–10], and can lead to the formation of closepacked ordered structures [11–13]. Dilute systems with short-range velocity alignment also exhibit phase separation at the onset of macroscopic orientational order [14, 15]. Clustering is, moreover, known to arise when the interaction between active particles is induced by a self-generated scalar field (concentration, temperature, etc.) [16–21], and from hydrodynamics [22, 23], resulting in effective long-range interactions.

In the absence of long-range orientational order [24], the long-time mean field description of the aforementioned systems is commonly achieved via a conservation law for the density field $\rho ,$ with generic drift and diffusion contributions. The effective mobility and diffusion coefficients that result from coarse-graining are then generally explicit functions of $\rho .$ Recently, a new class of scalar active matter was introduced in which the consequences of the existence of a diffusivity edge at a critical concentration $\rho _ { c }$ (i.e. diffusion vanishes when $\rho \geq \rho _ { c } )$ was examined [25]. It was discovered that when confined in a harmonic potential, systems falling into this class undergo a transition formally akin to Bose-Einstein condensation (BEC), thus providing a new non-equilibrium mechanism for the emergence of clustering.

There are many examples in which structure formation in active matter results in a pattern formation that involves the selection of a characteristic length-scale, such that the cluster sizes are limited and do not scale with the system size [17–19, 22, 26]. Such microscopic confinement can be modeled at the mean field level by introducing an effective potential which provides multiple sites for condensation. Moreover, periodic potential landscapes are commonly used to manipulate driven colloidal systems. Such periodic potentials are expected to lead to cluster-lattices. Here, we study the phenomenology that arises from a diffusivity edge in such configurations.

We consider a sinusoidal egg-crate confinement in arbitrary dimension $d ,$ and identify two limiting regimes for the system. For deep potentials, the system behaves similarly to the case of a single harmonic trap case treated in Ref. [25]. However, we find that the existence of finite energy barriers between neighbouring condensates quantitatively modifies the transition. A generalized thermodynamic description shows that the overall phenomenology of BEC is always preserved. However, for shallow potentials we observe quantitative differences as compared to the classical BEC description. Most notably, we find that the exponent associated with the scaling of the condensate fraction with respect to an effective temperature is non-universal, and depends on how the diffusion scales with $\rho _ { c } - \rho$

The rest of the paper is organized as follows. We introduce the model in Sec. 2 and characterize the phenomenology of the condensation transition in Sec. 3. Section 4 is devoted to the development of the generalized thermodynamics associated with the phenomenology of the system, and Sec. 5 concludes the paper.

## 2. Scalar active matter with diffusivity edge

We start by introducing the formalism that will be used throughout the paper. In the mean field approach considered here, the particle density field $\rho ( \pmb { r } , t )$ obeys the following conservation law

$$
\partial _ { t } \rho + \nabla \cdot \boldsymbol { J } = 0 , \qquad \boldsymbol { J } = - M ( \rho ) \rho \nabla U - D ( \rho ) \nabla \rho ,\tag{1}
$$

where $U ( r )$ denotes the external confining potential. The dynamics conserves the total number of particles $\begin{array} { r } { N = \int \mathrm { d } ^ { d } \pmb { r } \rho \left( \pmb { r } , t \right) } \end{array}$ in the accessible d-dimensional space at all times.

![](Images_VC44L54Z/c96c531526827b7e6c431e5d9bca4a2e2cff7925417f364a0a0c8e23d2f6a458.jpg)  
Figure 1. Schematic representation of the solution (6) above and below the condensation transition in a two dimensional periodic potential. When the effective temperature is larger than $T _ { c } ,$ then $\rho _ { 0 } < \rho _ { c } .$ , and $\rho ( U )$ shows a smooth decay from the minimum of the potential. Below $T _ { c } , \rho ( U )$ exhibits a sharp peak at the ground state, which reflects the presence of a condensate.

The mobility $M ( \rho )$ and diffusion coefficient $D ( \rho )$ are in general density-dependent. Their ratio in the zero-density limit defines a tuning parameter

$$
k _ { \mathrm { B } } T _ { \mathrm { e f f } } \equiv \frac { D ( \rho \to 0 ) } { M ( \rho \to 0 ) } ,\tag{2}
$$

which gives a measure of the fluctuations at the particle level, and can be assimilated to an effective temperature for the system. Because this study aims at describing systems that are non-equilibrium in essence, the fluctuation-dissipation theorem (FDT) can be broken for finite densities, namely,

$$
\frac { D ( \rho ) } { M ( \rho ) } \neq \frac { D ( \rho \to 0 ) } { M ( \rho \to 0 ) } .\tag{3}
$$

This feature can be interpreted as collective inhibition or activation caused by the interplay of activity and, for instance, interactions. In particular, for sufficiently large densities we assume the existence of a diffusivity edge in the system, defined as $D ( \rho ) / M ( \rho ) = 0$ for $\rho \geq \rho _ { c }$ . The non-local effects due to hydrodynamic interactions in the presence of broken FDT are neglected in our work [27].

The steady-state solutions of Equation (1) are computed by setting the current to zero $( J = \mathbf { 0 } )$ , leading to

$$
\frac { \mathrm { d } U } { \mathrm { d } \rho } = - \frac { D ( \rho ) } { M ( \rho ) \rho } ,\tag{4}
$$

which can be formally used to obtain $\rho ( U )$ The normalization condition in the stationary state can be written as $\begin{array} { r } { N = \int \mathrm { d } ^ { d } \pmb { r } \rho ( U ( \pmb { r } ) ) = \int \mathrm { d } U g ( U ) \rho ( U ) } \end{array}$ , where $g ( U )$ is the relevant density of states.

Since $D ( \rho ) / M ( \rho ) \geq 0 .$ , we surmise that $\rho$ is a decreasing function of U. We denote $\rho _ { 0 }$ as the maximal value that $\rho$ takes in the ground state $U = 0$ . When $\rho _ { 0 } < \rho _ { c } , \rho ( U )$ can be obtained simply by integrating and inverting Equation (4), in which case $\rho _ { 0 }$ is then determined from the density normalization. When the effective temperature decreases, $\rho _ { 0 }$ increases until it reaches the maximally allowed value of $\rho _ { c }$ . The transition temperature $T _ { c }$ is defined as the value taken by $T _ { \mathrm { e f f } }$ when $\rho _ { 0 } = \rho _ { c }$ . For $T _ { \mathrm { e f f } } \leq T _ { c }$ $\rho$ is thus not a smooth function at $U = 0$ (see Figure 1): we obtain $\rho ( U \to 0 ^ { + } ) = \rho _ { c }$ and the value $\rho$ takes in the ground state is undefined, which reflects the formation of a condensate.

In most of this work we will consider for simplicity a step profile for the ratio of diffusion over mobility

$$
\frac { D ( \rho ) } { M ( \rho ) } = \left\{ \begin{array} { l c } { k _ { \mathrm { B } } T _ { \mathrm { e f f } } \quad } & { \rho < \rho _ { c } } \\ { 0 \quad } & { \rho \geq \rho _ { c } } \end{array} \right. .\tag{5}
$$

Therefore, denoting $\beta \equiv 1 / k _ { \mathrm { B } } T _ { \mathrm { e f f } }$ for convenience, the density is given by the Boltzmann weights

$$
\rho ( U ) = \left\{ \begin{array} { l l } { \rho _ { 0 } \exp ( - \beta U ) } & { \quad T _ { \mathrm { e f f } } > T _ { c } } \\ { N _ { c } \delta ( U ) g ( U ) ^ { - 1 } + \rho _ { c } \exp ( - \beta U ) } & { \quad T _ { \mathrm { e f f } } \leq T _ { c } } \end{array} \right. ,\tag{6}
$$

where the contribution $N _ { c } \delta ( U ) g ( U ) ^ { - 1 }$ ensures the overall normalization in the condensed phase.

## 3. Characterization of the condensation transition

In this work we consider the sinusoidal potential in d dimensions, as sketched in Figure 1 for $d = 2$ , and defined by

$$
U ( \pmb { r } ) = \sum _ { k = 1 } ^ { d } \tilde { U } ( r _ { k } ) , \quad \tilde { U } ( r _ { k } ) = \frac { U _ { b } } { 2 d } \left[ 1 - \cos \left( \frac { \pi r _ { k } } { r _ { b } } \right) \right] ,\tag{7}
$$

where the $r _ { k }$ ’s denotes the Cartesian coordinates of the position r. The system is thus divided into identical cells of volume $( 2 r _ { b } ) ^ { d }$ , each separated by an energy barrier $U _ { b }$ Assuming an equal partitioning of the particles over the cells, and using the fact that the density can be factorized (as can be seen by combining Equations (6) and (7)), we find

$$
N = \left\{ \begin{array} { l l } { \displaystyle \rho _ { 0 } L ^ { d } \exp \left( - \frac { \beta U _ { b } } { 2 } \right) I _ { 0 } ^ { d } \left( \frac { \beta U _ { b } } { 2 d } \right) } & { \quad T _ { \mathrm { e f f } } > T _ { c } } \\ { \displaystyle N _ { c } + \rho _ { c } L ^ { d } \exp \left( - \frac { \beta U _ { b } } { 2 } \right) I _ { 0 } ^ { d } \left( \frac { \beta U _ { b } } { 2 d } \right) } & { \quad T _ { \mathrm { e f f } } \leq T _ { c } } \end{array} \right. ,\tag{8}
$$

where $L$ denotes the linear system size and $\begin{array} { r } { I _ { \nu } ( x ) = \int _ { 0 } ^ { \pi } } \end{array}$ ds exp[x cos(s)] cos(νs)/π is the modified Bessel function of the first kind of integer rank $\nu ,$ which has the following asymptotic forms

$$
{ \cal I } _ { \nu } ( x ) \underset { x  \infty } { \sim } \frac { e ^ { x } } { \sqrt { 2 \pi x } } ( 1 +  { \operatorname { O } ( x ^ { - 1 } ) } ) , \qquad { \cal I } _ { \nu } ( x ) \underset { x  0 } { \sim } \frac { 1 } { \nu ! } ( \frac { x } { 2 } ) ^ { \nu } ( 1 +  { \operatorname { O } ( x ^ { 2 } ) } ) .\tag{9}
$$

Hence, in the strong and weak confinement limits the ground state density below the diffusivity edge obeys

$$
\rho _ { 0 } \underset { k _ { \mathrm { B } } T _ { \mathrm { e f f } } ^ { \mathrm { e f f } } \ll U _ { b } } { \sim } n \left( \frac { 2 \pi k _ { \mathrm { B } } T _ { \mathrm { e f f } } } { k } \right) ^ { - \frac { d } { 2 } } , \qquad \rho _ { 0 } \underset { k _ { \mathrm { B } } T _ { \mathrm { e f f } } ^ { \mathrm { e f f } } \gg U _ { b } } { \sim } \frac { N } { L ^ { d } } \left( 1 + \mathrm { O } ( \beta U _ { b } ) \right) ,\tag{10}
$$

(a)  
![](Images_VC44L54Z/e870372b686e519c83583ed8784030d98137704df97af10243540a857788a356.jpg)

(b)  
![](Images_VC44L54Z/873a157bab125d17c63421932bed17fc337d19b55a1c1e8cc4e4be3b9a57fda8.jpg)  
Figure 2. Transition to condensation in $d = 2 ;$ no qualitative differences are expected in other dimensions. (a) Phase diagram of the system in the reduced mean density $\bar { \rho } / \rho _ { c }$ and effective temperature $k _ { \mathrm { B } } T _ { \mathrm { e f f } } / U _ { b }$ plane. The continuous black line marks the transition corresponding to $T _ { \mathrm { e f f } } = T _ { c }$ defined from Equation (8) by setting $N _ { c } / N = 0$ (b) Condensate fraction as a function of the reduced effective temperature for several values of the ratio $\bar { \rho } / \rho _ { c }$ . The dashed black lines indicate the approximate behaviour of $N _ { c } / N$ for $k _ { \mathrm { B } } T _ { \mathrm { e f f } } \ll U _ { b }$ (Equation (11)) and $k _ { \mathrm { B } } T _ { \mathrm { e f f } } \gg U _ { b }$ (Equation (12)), respectively.

where $n = N ( 2 r _ { b } / L ) ^ { d }$ denotes the number of particles in each cell, and $k = \pi ^ { 2 } U _ { b } / ( 2 d r _ { b } ^ { 2 } )$ measures the effective potential stiffness in the ground state. Because edge effects vanish when the barrier height $U _ { b }$ is much larger than the effective temperature, the expression given in Equation (10) for $k _ { \mathrm { B } } T _ { \mathrm { e f f } } \ll U _ { b }$ is identical to the one derived in Ref. [25] for an infinite harmonic trap. On the other hand, when $k _ { \mathrm { B } } T _ { \mathrm { e f f } } \gg U _ { b }$ the system is dominated by fluctuations and the density reaches a uniform profile.

When $\rho _ { 0 }$ becomes larger than the diffusivity edge, some of the particles form a condensate in the ground state. In this case, the normalization of the density profile is given by the second line of Equation (8). In the high energy barrier limit, the condensate fraction can be approximated by

$$
\frac { N _ { c } } { N } \underset { k _ { \mathrm { B } } T _ { \mathrm { e f f } } \ll U _ { b } } { \sim } 1 - \left( \frac { T _ { \mathrm { e f f } } } { T _ { c } ^ { 0 } } \right) ^ { \frac { d } { 2 } } ,\tag{11}
$$

where the effective transition temperature reads $\begin{array} { r } { T _ { c } ^ { 0 } = \frac { k } { 2 \pi k _ { \mathrm { B } } } \left( n / \rho _ { c } \right) ^ { \frac { 2 } { d } } } \end{array}$ [25]. In this limit, $N _ { c } / N$ takes a similar form as in the case of a free ideal Bose gas [28]. Defining $\bar { \rho } \equiv N / L ^ { d }$ as the average density of particles, the condensate fraction in the shallow potential limit reads

$$
\frac { N _ { c } } { N } \underset { k _ { \mathrm { B } } T _ { \mathrm { e f f } } \gg U _ { b } } { \sim } \left( 1 - \frac { \rho _ { c } } { \bar { \rho } } \right) \left( 1 - \frac { T _ { c } ^ { \infty } } { T _ { \mathrm { e f f } } } \right) ,\tag{12}
$$

where $T _ { c } ^ { \infty } = U _ { b } \left[ 2 k _ { \mathrm { B } } \left( 1 - \bar { \rho } / \rho _ { c } \right) \right] ^ { - 1 }$ . The fact that the transition temperature diverges when $\bar { \rho }$ approaches $\rho _ { c }$ is due to the finiteness of the barrier height $U _ { b }$ , which leads to flat density profiles at high effective temperatures. As shown in the phase diagram of Figure 2(a), the phase behaviour for $k _ { \mathrm { B } } T _ { \mathrm { e f f } } / U _ { b } \gg 1$ is only set by the ratio $\bar { \rho } / \rho _ { c }$ .

The scaling of the condensate fraction as a function of $k _ { \mathrm { B } } T _ { \mathrm { e f f } } / U _ { b }$ is shown in Figure 2(b). If $\bar { \rho } > \rho _ { c }$ , the transition is suppressed, and $N _ { c } / N$ goes from 1 at vanishing

$T _ { \mathrm { e f f } }$ to finite values when $k _ { \mathrm { B } } T _ { \mathrm { e f f } } / U _ { b }  \infty$ . When $\bar { \rho } < \rho _ { c }$ , there exists a finite effective temperature $T _ { c }$ for which $N _ { c } / N$ reaches 0, and above which no condensation occurs. If $\bar { \rho } \ll \rho _ { c }$ , the transition happens at small effective temperatures and is similar to BEC. On the other hand, for $\rho _ { c } \gtrsim \bar { \rho }$ the exponent associated to the scaling of the condensate fraction is equal to −1 in any dimension (see Equation (12)). Finally, in the particular case of $\bar { \rho } = \rho _ { c } ,$ , we find that $N _ { c } / N \sim \left( k _ { \mathrm { B } } T _ { \mathrm { e f f } } / U _ { b } \right)$ )−1 at large $k _ { \mathrm { B } } T _ { \mathrm { e f f } } / U _ { b }$ , such that the transition temperature is located exactly at infinity.

Although deriving an analogue to Equation (8) for arbitrary functions $D ( \rho ) / M ( \rho )$ is out of the scope of this work, Appendix A shows how some progress can be achieved in the limit $k _ { \mathrm { B } } T _ { \mathrm { e f f } } \gg U _ { b }$ . Indeed, assuming that the diffusivity edge is approached as

$$
D ( \rho ) / M ( \rho ) \underset { \rho \to \rho _ { c } } { \sim } ( 1 - \rho / \rho _ { c } ) ^ { z - 1 } ,\tag{13}
$$

where $z \geq 1$ , the associated scaling of the condensate fraction reads

$$
\frac { N _ { c } } { N } \underset { k _ { \mathrm { B } } T _ { \mathrm { e f f } } \gg U _ { b } } { \sim } \left( 1 - \frac { \rho _ { c } } { \bar { \rho } } \right) \left[ 1 - \left( \frac { T _ { c } ^ { \infty } } { T _ { \mathrm { e f f } } } \right) ^ { \frac { 1 } { z } } \right] ,\tag{14}
$$

with $k _ { \mathrm { B } } T _ { c } ^ { \infty } / U _ { b } \sim ( 1 - \bar { \rho } / \rho _ { c } ) ^ { - z }$ . For shallow potentials the condensate fraction exponent therefore takes a nonuniversal value, which is set by how fast the diffusivity edge is reached. This result is in clear departure from Equation (11) for $k _ { \mathrm { B } } T _ { \mathrm { e f f } } \ll U _ { b } ,$ , where the exponent $\begin{array} { l } { { \frac { d } { 2 } } } \end{array}$ remains independent of the shape of $D ( \rho ) / M ( \rho )$ [25].

## 4. Generalized thermodynamics

We now turn to the construction of a generalized thermodynamic formalism for the system. The average potential energy $\begin{array} { r } { \langle U \rangle \equiv \int \mathrm { d } ^ { d } \pmb { r } U ( \pmb { r } ) \rho \left( U ( \pmb { r } ) \right) } \end{array}$ reads

$$
\left. U \right. = \left\{ \begin{array} { l l } { \displaystyle \frac { N U _ { b } } { 2 } \left( 1 - \frac { I _ { 1 } \left( \frac { \beta U _ { b } } { 2 d } \right) } { I _ { 0 } \left( \frac { \beta U _ { b } } { 2 d } \right) } \right) } & { \quad T _ { \mathrm { e f f } } > T _ { c } } \\ { \displaystyle \frac { \left( N - N _ { c } \right) U _ { b } } { 2 } \left( 1 - \frac { I _ { 1 } \left( \frac { \beta U _ { b } } { 2 d } \right) } { I _ { 0 } \left( \frac { \beta U _ { b } } { 2 d } \right) } \right) } & { \quad T _ { \mathrm { e f f } } \leq T _ { c } } \end{array} \right.\tag{15}
$$

A heat capacity can then be defined from the mean energy via $C \equiv \mathrm { d } \langle U \rangle / \mathrm { d } T _ { \mathrm { e f f } }$ . For the present system, we find the following expressions after some algebra

$$
C = \left\{ \begin{array} { l l } { \displaystyle \frac { N k _ { \mathrm { B } } } { 4 d } ( \beta U _ { b } ) ^ { 2 } \left[ 1 - \frac { I _ { 1 } \left( \frac { \beta U _ { b } } { 2 d } \right) } { I _ { 0 } \left( \frac { \beta U _ { b } } { 2 d } \right) } \left( \frac { 2 d } { \beta U _ { b } } + \frac { I _ { 1 } \left( \frac { \beta U _ { b } } { 2 d } \right) } { I _ { 0 } \left( \frac { \beta U _ { b } } { 2 d } \right) } \right) \right] } & { \quad T _ { \mathrm { e f f } } > T _ { c } } \\ { \displaystyle \frac { ( N - N _ { c } ) k _ { \mathrm { B } } } { 4 d } ( \beta U _ { b } ) ^ { 2 } } & \\ { \displaystyle \times \left\{ d + 1 - \frac { I _ { 1 } \left( \frac { \beta U _ { b } } { 2 d } \right) } { I _ { 0 } \left( \frac { \beta U _ { b } } { 2 d } \right) } \left[ 2 d \left( 1 + \frac { 1 } { \beta U _ { b } } \right) - ( d - 1 ) \frac { I _ { 1 } \left( \frac { \beta U _ { b } } { 2 d } \right) } { I _ { 0 } \left( \frac { \beta U _ { b } } { 2 d } \right) } \right] \right\} } & { \quad T _ { \mathrm { e f f } } \leq T _ { c } } \end{array} \right.\tag{16}
$$

The change in the heat capacity at the transition, $\Delta C \equiv C ( T = T _ { c } ^ { - } ) - C ( T = T _ { c } ^ { + } )$ is then given by

$$
\Delta C = \frac { N k _ { \mathrm { B } } } { 4 } ( \beta _ { c } U _ { b } ) ^ { 2 } \left[ 1 + \frac { I _ { 1 } \left( \frac { \beta _ { c } U _ { b } } { 2 d } \right) } { I _ { 0 } \left( \frac { \beta _ { c } U _ { b } } { 2 d } \right) } \left( \frac { I _ { 1 } \left( \frac { \beta _ { c } U _ { b } } { 2 d } \right) } { I _ { 0 } \left( \frac { \beta _ { c } U _ { b } } { 2 d } \right) } - 2 \right) \right] ,\tag{17}
$$

![](Images_VC44L54Z/3bba911c6f29d6aceac0af1587b23cfc22bf280596c8d1e0bbe4efdd6e318d55.jpg)  
(c)

![](Images_VC44L54Z/d2592f1ede4ebcba0bee4e53b443b431c485aba016bd33e5340ffe7c0215fc11.jpg)  
(d)

![](Images_VC44L54Z/00b385b53edfb7683601b19025051890739dca0bb96b20b9c5456ef25d356e30.jpg)

![](Images_VC44L54Z/f9270b9e403bcd72d9e4cec257bdc6bb02e633795776c251ce140a12386c9fb3.jpg)  
Figure 3. Thermodynamics of the system in $d = 2 ;$ no qualitative differences are expected in other dimensions. $^ { ( \mathrm { a } , \mathrm { b } ) }$ Mean potential energy hUi and heat capacity $C$ as functions of $T _ { \mathrm { e f f } } / T _ { c }$ for $\bar { \rho } / \rho _ { c } = 0 . 9 9$ (purple), 0.5 (red), and 0.002 (yellow). (c) Typical isotherm of the pressure showing a plateau for effective volumes $\nu \leq \nu _ { c }$ . (d) Chemical potential as a function of $T _ { \mathrm { e f f } } / T _ { c }$ ; the different lines correspond to the same cases as for (a,b). In all panels the vertical blue line locates the transition.

with $\beta _ { c } \equiv ( k _ { \mathrm { B } } T _ { c } ) ^ { - 1 }$ . Generally, $\Delta C$ is nonzero such that the heat capacity experiences a discontinuous jump at the transition (see Figure $\mathrm { 3 ( b ) } )$ . For BEC in free space, this feature appears only for $d \geq 5 \ [ 2 8 ]$ , while it can be affected by confinement [29, 30]. Similar features are expected for the diffusivity edge problem, where the shape of $D ( \rho ) / M ( \rho )$ in the vicinity of $\rho _ { c }$ could additionally play a role. These questions will be addressed in a separate publication [31].

Using the asymptotic expansions of the modified Bessel functions (9), the analytical expressions for hUi and C can be obtained in the strong and weak confinement limits. As shown in Figures $\mathrm { 3 ( a , b ) }$ , for $k _ { \mathrm { B } } T _ { \mathrm { e f f } } \ll U _ { b }$ their behaviour corresponds to that of an ideal Bose gas [25], while for $k _ { \mathrm { B } } T _ { \mathrm { e f f } } \gg U _ { b }$ , we obtain

$$
\begin{array} { r } { \langle U \rangle \underset { k _ { \mathrm { B } } T _ { \mathrm { e f f } } \gg U _ { b } } { \sim } \frac { N U _ { b } } { 2 } , \quad \quad \quad \quad C \underset { k _ { \mathrm { B } } T _ { \mathrm { e f f } } \gg U _ { b } } { \sim } \frac { N k _ { \mathrm { B } } } { 8 d } ( \beta U _ { b } ) ^ { 2 } \quad \quad \quad \quad \quad \quad \quad \quad T _ { \mathrm { e f f } } > T _ { c } , } \end{array}\tag{18}
$$

hU i

$$
\underset { k _ { \mathrm { B } } T _ { \mathrm { e f f } } \gg U _ { b } } { \sim } \frac { \rho _ { c } } { \overline { { \rho } } } \frac { N U _ { b } } { 2 } , \qquad C \underset { k _ { \mathrm { B } } T _ { \mathrm { e f f } } \gg U _ { b } } { \sim } \left( d + \frac { 1 } { 2 } \right) \frac { \rho _ { c } } { \overline { { \rho } } } \frac { N k _ { \mathrm { B } } } { 4 d } ( \beta U _ { b } ) ^ { 2 } \qquad T _ { \mathrm { e f f } } \le T _ { c } .\tag{19}
$$

In the limit of a shallow potential and a high effective temperature, hUi becomes

independent of $T _ { \mathrm { e f f } }$ and scales linearly with $U _ { b }$ . The heat capacity thus vanishes as $( \beta U _ { b } ) ^ { 2 }$ Note that the functions below $T _ { c }$ are proportional to the ratio $\rho _ { c } / \bar { \rho } ,$ which highlights the fact that particles in the condensate do not contribute to the total energy.

A thermodynamic entropy can be defined for the system as $\mathrm { d } S \equiv \mathrm { d } \langle U \rangle / T _ { \mathrm { e f f } }$ . After some algebra, we find the following expressions

$$
S = \left\{ \begin{array} { l l } { \displaystyle \frac { N k _ { \mathrm { B } } } { 2 } \left\{ 2 \left[ 1 - \ln \left( \frac { \rho _ { 0 } } { \rho _ { c } } \right) \right] + \beta U _ { b } \left[ 1 - \frac { I _ { 1 } \left( \frac { \beta U _ { b } } { 2 d } \right) } { I _ { 0 } \left( \frac { \beta U _ { b } } { 2 d } \right) } \right] \right\} \quad } & { T _ { \mathrm { e f f } } > T _ { c } } \\ { \displaystyle \frac { \left( N - N _ { c } \right) k _ { B } } { 2 } \left[ 2 + \beta U _ { b } \left( 1 - \frac { I _ { 1 } \left( \frac { \beta U _ { b } } { 2 d } \right) } { I _ { 0 } \left( \frac { \beta U _ { b } } { 2 d } \right) } \right) \right] } & { T _ { \mathrm { e f f } } \leq T _ { c } } \end{array} \right.\tag{20}
$$

We note that the same result can be derived from a Gibbs definition of generalized entropy, which is consistent with Equation (4) as the relationship between the energy and the probability measure. A similar definition has been introduced in Ref. [32]. In case with a large energy barrier, we find that the entropy exhibits an ideal Bose gas behaviour [25]. On the other hand, for $k _ { \mathrm { B } } T _ { \mathrm { e f f } } \gg U _ { b }$ the energy states are distributed uniformly in space, and $S / L ^ { d } \simeq - k _ { \mathrm { B } } \rho [ \ln ( \rho / \rho _ { c } ) - 1 ]$ , with distributions $\rho = \bar { \rho } \left( T _ { \mathrm { e f f } } > T _ { c } \right)$ and $\rho = \rho _ { c } \left( T _ { \mathrm { e f f } } \leq T _ { c } \right)$

A remarkable feature of BEC concerns the divergence of the isothermal compressibility at the transition. A thermodynamic pressure can be defined for the system from a generalized Helmholtz free energy $\mathcal { F } \equiv \langle U \rangle - T _ { \mathrm { e f f } } S$ . The typical volume V of the confined system can be obtained from dimensional analysis: $\nu \equiv N / \rho _ { 0 } =$ $( N - N _ { c } ) / \rho _ { c }$ . Using Equation (8), this reads‡

$$
\mathcal { V } = L ^ { d } \exp \left( - \frac { \beta U _ { b } } { 2 } \right) I _ { 0 } ^ { d } \left( \frac { \beta U _ { b } } { 2 d } \right) .\tag{21}
$$

When $k _ { \mathrm { B } } T _ { \mathrm { e f f } } \ll U _ { b }$ , we find $\mathcal { V } \sim \lambda ^ { d } = ( 2 \pi k _ { \mathrm { B } } T _ { \mathrm { e f f } } / k ) ^ { \frac { d } { 2 } }$ , which corresponds to the typical volume occupied by an ideal Bose Gas confined in a harmonic potential [33], while for $k _ { \mathrm { B } } T _ { \mathrm { e f f } } \gg U _ { b } ,$ it is simply given by the size of the system $L ^ { d }$

Defining $P _ { \mathrm { t h e r m } }$ as the conjugate variable to V provides the following equations of state

$$
P _ { \mathrm { t h e r m } } \equiv - \left. \left( \frac { \partial \mathcal { F } } { \partial \mathcal { V } } \right) \right. _ { T _ { \mathrm { e f f } } , N } = \left\{ \begin{array} { l l } { \frac { N k _ { \mathrm { B } } T _ { \mathrm { e f f } } } { \mathcal { V } } } & { \quad T _ { \mathrm { e f f } } > T _ { c } } \\ { \rho _ { c } k _ { \mathrm { B } } T _ { \mathrm { e f f } } } & { \quad T _ { \mathrm { e f f } } \leq T _ { c } } \end{array} \right. .\tag{22}
$$

Equations (22) are identical to those derived in [25], and stress again the similarities with BEC. These expressions can moreover be derived from a mechanical definition of the pressure, which we denote as $P _ { \mathrm { { m e c h } } }$ . Thanks to the periodicity of the potential U , the forces that it induces do not create pressure difference between adjacent unit cells, such that a bulk can be defined for this system. Following previous works [34], the bulk mechanical pressure is defined as the average force per unit surface area exerted by the particles on a potential W which confines the system in a finite volume $L ^ { d }$ From the symmetries of the problem, the calculation is moreover carried out in one dimension. Assuming that the edge of the system corresponds to a dip of $U \ S , W ( r )$ is monotonously growing with r, satisfies $W ( r ) = 0$ for $r \leq L$ and $W ( r  \infty )  \infty$ (it is therefore assumed that $U = 0$ outside the sample). This way, $P _ { \mathrm { { m e c h } } }$ reads

$$
P _ { \mathrm { m e c h } } = \int _ { L } ^ { \infty } \mathrm { d } r \rho \left( W ( r ) \right) \partial _ { r } W ( r ) = \int _ { 0 } ^ { \infty } \mathrm { d } W \rho \left( W \right) ,\tag{23}
$$

which after replacing $\rho$ by its expression as function of the potential (6), leads to $P _ { \mathrm { m e c h } } = P _ { \mathrm { t h e r m } } \equiv P$ . As at equilibrium, and in a limited number of nonequilibrium cases [34], this result is moreover independent of the details of $W$

Let us consider a typical isotherm of $P$ as shown in Figure $3 ( \mathrm { c } )$ . Defining $\mathcal { V } _ { c } \equiv N / \rho _ { c }$ as the volume below which condensation occurs, we find that for $\nu > \nu _ { c }$ the system possesses an ideal gas equation of state and $P$ scales like $\mathcal { V } ^ { - 1 }$ . For $\nu \leq \nu _ { c }$ the pressure becomes independent of $\nu$ and the corresponding isotherm exhibits a plateau, such that the isothermal compressibility of the system, $\begin{array} { r } { \kappa _ { T _ { \mathrm { e f f } } } = - \mathcal { V } ^ { - 1 } \left( \frac { \partial P } { \partial \mathcal { V } } \right) _ { T _ { \mathrm { e f f } } } ^ { - 1 } } \end{array}$ , diverges at the threshold.

We end this section by computing the generalized chemical potential $\mu ,$ defined as the conjugate variable to $N$ . From Equations (15) and (20), we find

$$
\mu \equiv \left. \left( \frac { \partial \mathcal { F } } { \partial N } \right) \right. _ { T _ { \mathrm { e f f } } , \mathcal { V } } = \left\{ \begin{array} { l l } { k _ { \mathrm { B } } T _ { \mathrm { e f f } } \ln \left( \frac { \rho _ { 0 } } { \rho _ { c } } \right) } & { \quad T _ { \mathrm { e f f } } > T _ { c } } \\ { 0 } & { \quad T _ { \mathrm { e f f } } \leq T _ { c } } \end{array} \right. .\tag{24}
$$

We thus find that $\mu$ vanishes at the transition where $\rho _ { 0 } = \rho _ { c }$ and remains identically 0 in the condensate phase, as shown in Figure $\mathrm { 3 ( d ) }$ . From Equations (6) and (24), the density profile outside the ground state thus takes the general form

$$
\rho ( U > 0 ) = \rho _ { c } \exp \left[ \beta ( \mu - U ) \right] ,\tag{25}
$$

above and below the transition.

## 5. Concluding remarks

We have studied the consequences of having a diffusivity edge for a system of particles embedded in a sinusoidal potential in arbitrary dimensions. This configuration leads to the formation multiple coexisting condensates. We have identified two asymptotic regimes that exhibit qualitatively different properties. At low effective temperatures or high potential barriers, the behaviour of the system is analogous to that of an ideal Bose gas in free space, similarly to the case treated in Ref. [25] considering a single harmonic trap. For shallow potentials, qualitative features such as the presence of a transition, at which the heat capacity is discontinuous, as well as the divergence of the isothermal compressibility and the vanishing of the chemical potential in the condensed phase, persist when the mean density stays lower than the threshold $\rho _ { c }$

We have, however, uncovered quantitative differences is this case. For example, we have found that for $D ( \rho ) / M ( \rho ) \sim ( \rho _ { c } - \rho ) ^ { z - 1 }$ near $\rho _ { c }$ the scaling of the condensate fraction with the effective temperature takes an exponent of $- z ^ { - 1 }$ (see Equation (14)). The exponent z is also expected to affect the scaling of other functions. For instance, using the results derived in Appendix A, it is possible to show that $C \sim ( \beta U _ { b } ) ^ { 1 + z ^ { - 1 } }$ as $\beta U _ { b }  0$ . A systematic study of the effect of z and of the shape of the potential is relegated to future publications [31].

The derivation of our results relies on the hypothesis that particles are divided evenly among cells of volume $( 2 r _ { b } ) ^ { d }$ However, a vanishing diffusion coefficient may seem “pathological” at the mean field level considered here, as the absence of fluctuations would lead to a breakdown of ergodicity. It should thus be stressed that the range of validity of the results derived here concerns all systems described by Equation (1) and for which the density-dependent hydrodynamic coefficients result from the integration of various microscopic processes, e.g. interactions, while fluctuations, although possibly weak, remain present.

## Appendix A. Derivation of the condensate fraction for $\beta U _ { b }  0$ and arbitrary diffusion

This section is devoted to the derivation of Equation (14) describing the weak confinement behaviour of the condensate fraction assuming a general functional form of $D ( \rho ) / M ( \rho )$ near $\rho _ { c }$ . Below $T _ { c }$ , the potential can be formally written as $\beta U ( \rho ) \equiv u ( \rho / \rho _ { c } )$ ， where this rescaled form satisfies

$$
u ( s ) = - \int _ { 1 } ^ { s } \mathrm { d } t \frac { y ( t ) } { t }\tag{A.1}
$$

with $y ( \rho / \rho _ { c } ) \equiv \beta D ( \rho ) / M ( \rho )$ . Denoting $\rho _ { b } \ \equiv \ \rho ( U _ { b } )$ , from Equation (A.1) the limit $u ( \rho _ { b } / \rho _ { c } ) = \beta U _ { b }  0$ is attained for $\rho _ { b }  \rho _ { c }$ . In the following, we assume that the diffusivity edge is reached at $\rho = \rho _ { c }$ following a power law with an exponent $z - 1 \geq 0 ;$

$$
y ( s ) \mathop \sim _ { s \to 1 ^ { - } } y _ { 0 } ( 1 - s ) ^ { z - 1 } ,\tag{A.2}
$$

where $y _ { 0 }$ is a constant and $y ( s ) = 0$ for all $s \geq 1$ . The Taylor expansion of $u ( s )$ in $s = 1$ reads

$$
u ( s ) = \sum _ { n = 0 } ^ { \infty } \frac { u ^ { ( n + 1 ) } ( 1 ) } { ( n + 1 ) ! } ( s - 1 ) ^ { n + 1 } { , }\tag{A.3}
$$

where $u ^ { ( n + 1 ) }$ stands for the $( n + 1 ) ^ { \mathrm { t h } }$ derivative of $u ,$ and is obtained from Equation $( \mathrm { A . 1 } )$ a s

$$
u ^ { ( n + 1 ) } ( s ) = \ \quad - \sum _ { p = 0 } ^ { n } { \binom { n } { p } } y ^ { ( p ) } ( s ) \left( s ^ { - 1 } \right) ^ { ( n - p ) } ,\tag{A.4}
$$

$$
u ^ { ( n + 1 ) } ( s ) \underset { s  1 ^ { - } } { \sim } y _ { 0 } \sum _ { p = 0 } ^ { \operatorname* { m i n } ( z - 1 , n ) } \binom { z - 1 } { p } n ! ( - 1 ) ^ { n + 1 } ( 1 - s ) ^ { z - 1 - p } .\tag{A.5}
$$

It is clear from Equation (A.5) that $u ^ { ( n + 1 ) } ( s )$ will cancel when $s \to 1 ^ { - }$ for all $n < z - 1$ ， and that $u ^ { ( z + i ) } ( 1 ) = y _ { 0 } ( z + i - 1 ) ! ( - 1 ) ^ { z + i }$ for all $i \geq 0$ . Inserting this expression in Equation (A.3), we get

$$
u ( s ) = y _ { 0 } \sum _ { n = 0 } ^ { \infty } \frac { ( 1 - s ) ^ { z + n } } { z + n } ,\tag{A.6}
$$

which corresponds as expected to $u ( s ) = - y _ { 0 } \ln ( s )$ for $z = 1$ . We then get at leading order for $s \lesssim 1$

$$
u ( s ) \underset { s  1 ^ { - } } { \sim } y _ { 0 } \frac { ( 1 - s ) ^ { z } } { z } +  { \operatorname { O } ( ( 1 - s ) ^ { z + 1 } ) } .\tag{A.7}
$$

Therefore, inverting this expression and coming back to the initial variables we find outside the ground state

$$
\rho ( U > 0 ) \underset { \beta U _ { b }  0 } { \sim } \rho _ { c } [ 1 - ( \frac { \beta U z } { y _ { 0 } } ) ^ { \frac { 1 } { z } } ]\tag{A.8}
$$

Using Equation (A.8) and the definition of the potential $\begin{array} { r } { U ( r ) = \frac { U _ { b } } { 2 } \left[ 1 - d ^ { - 1 } \sum _ { k } \cos ( \pi r _ { k } / r _ { b } ) \right] } \end{array}$ the normalization in the condensation phase thus obeys

$$
N = N _ { c } + \rho _ { c } L ^ { d } \left[ 1 - \left( \frac { \beta U _ { b } z } { 2 y _ { 0 } } \right) ^ { \frac { 1 } { z } } \mathcal { G } ( z ) \right] ,\tag{A.9}
$$

where the function $\begin{array} { r } { \mathcal { G } ( z ) = \int _ { 0 } ^ { 1 } \mathrm { d } x _ { 1 } . . . \int _ { 0 } ^ { 1 } \mathrm { d } x _ { d } [ 1 - d ^ { - 1 } \sum _ { k } \cos ( \pi x _ { k } ) ] ^ { 1 / z } } \end{array}$ is nonzero and analytic but has no simple expression in general. Defining $k _ { \mathrm { B } } T _ { c } = z U _ { b } / ( 2 y _ { 0 } ) \mathcal { G } ^ { z } ( z ) ( 1 -$ $\bar { \rho } / \rho _ { c } ) ^ { - z }$ , Equation (A.9) is finally recast as Equation (14).

## References

[1] Gompper G, Winkler R G, Speck T, Solon A, Nardini C, Peruani F, L¨owen H, Golestanian R, Kaupp U B, Alvarez L, Kiørboe T, Lauga E, Poon W C K, DeSimone A, Mui˜nos-Landin S, Fischer A, S¨oker N A, Cichos F, Kapral R, Gaspard P, Ripoll M, Sagues F, Doostmohammadi A, Yeomans J M, Aranson I S, Bechinger C, Stark H, Hemelrijk C K, Nedelec F J, Sarkar T, Aryaksama T, Lacroix M, Duclos G, Yashunsky V, Silberzan P, Arroyo M and Kale S 2020 Journal of Physics: Condensed Matter 32 193001 URL https://doi.org/10.1088/ 1361-648x/ab6348

[2] Ramaswamy S 2010 Annual Review of Condensed Matter Physics 1 323–345 URL https: //doi.org/10.1146/annurev-conmatphys-070909-104101

[3] Marchetti M C, Joanny J F, Ramaswamy S, Liverpool T B, Prost J, Rao M and Simha R A 2013 Rev. Mod. Phys. 85(3) 1143–1189 URL https://link.aps.org/doi/10.1103/RevModPhys. 85.1143

[4] Bechinger C, Di Leonardo R, L¨owen H, Reichhardt C, Volpe G and Volpe G 2016 Reviews of Modern Physics 88 045006 URL https://journals.aps.org/rmp/abstract/10.1103/ RevModPhys.88.045006

[5] Golestanian R 2019 Phoretic Active Matter (Preprint arXiv:1909.03747)

[6] Cates M E and Tailleur J 2015 Annu. Rev. Condens. Matter Phys. 6 219–244 URL http: //www.annualreviews.org/doi/abs/10.1146/annurev-conmatphys-031214-014710

[7] Henkes S, Fily Y and Marchetti M C 2011 Phys. Rev. E 84(4) 040301 URL https://link.aps. org/doi/10.1103/PhysRevE.84.040301

[8] Redner G S, Hagan M F and Baskaran A 2013 Phys. Rev. Lett. 110(5) 055701 URL https: //link.aps.org/doi/10.1103/PhysRevLett.110.055701

[9] Buttinoni I, Bialk´e J, K¨ummel F, L¨owen H, Bechinger C and Speck T 2013 Phys. Rev. Lett. 110(23) 238301 URL https://link.aps.org/doi/10.1103/PhysRevLett.110.238301

[10] Soto R and Golestanian R 2014 Phys. Rev. E 89(1) 012706 URL https://link.aps.org/doi/ 10.1103/PhysRevE.89.012706

[11] Blaschke J, Maurer M, Menon K, Z¨ottl A and Stark H 2016 Soft Matter 12 9821–9831 URL https://doi.org/10.1039/c6sm02042a

[12] Digregorio P, Levis D, Suma A, Cugliandolo L F, Gonnella G and Pagonabarraga I 2018 Phys. Rev. Lett. 121(9) 098003 URL https://link.aps.org/doi/10.1103/PhysRevLett.121.098003

[13] Abaurrea Velasco C, Abkenar M, Gompper G and Auth T 2018 Phys. Rev. E 98(2) 022605 URL https://link.aps.org/doi/10.1103/PhysRevE.98.022605

[14] Solon A P, Chat´e H and Tailleur J 2015 Phys. Rev. Lett. 114 068101 URL https://journals. aps.org/prl/abstract/10.1103/PhysRevLett.114.068101

[15] Chat´e H 2020 Annual Review of Condensed Matter Physics 11 URL https://doi.org/10.1146/ annurev-conmatphys-031119-050752

[16] Golestanian R 2012 Phys. Rev. Lett. 108(3) 038303 URL https://link.aps.org/doi/10.1103/ PhysRevLett.108.038303

[17] Taktikos J, Zaburdaev V and Stark H 2012 Phys. Rev. E 85(5) 051901 URL https://link.aps. org/doi/10.1103/PhysRevE.85.051901

[18] Saha S, Golestanian R and Ramaswamy S 2014 Phys. Rev. E 89(6) 062316 URL https: //link.aps.org/doi/10.1103/PhysRevE.89.062316

[19] Liebchen B, Marenduzzo D, Pagonabarraga I and Cates M E 2015 Phys. Rev. Lett. 115(25) 258301 URL https://link.aps.org/doi/10.1103/PhysRevLett.115.258301

[20] Varma A, Montenegro-Johnson T D and Michelin S 2018 Soft Matter 14(35) 7155–7173 URL http://dx.doi.org/10.1039/C8SM00690C

[21] Agudo-Canalejo J and Golestanian R 2019 Phys. Rev. Lett. 123(1) 018101 URL https://link. aps.org/doi/10.1103/PhysRevLett.123.018101

[22] Z¨ottl A and Stark H 2014 Phys. Rev. Lett. 112(11) 118101 URL https://link.aps.org/doi/ 10.1103/PhysRevLett.112.118101

[23] Blaschke J, Maurer M, Menon K, Z¨ottl A and Stark H 2016 Soft Matter 12(48) 9821–9831 URL http://dx.doi.org/10.1039/C6SM02042A

[24] Toner J, Tu Y and Ramaswamy S 2005 Annals of Physics 318 170 – 244 ISSN 0003-4916 special Issue URL http://www.sciencedirect.com/science/article/pii/S0003491605000540

[25] Golestanian R 2019 Phys. Rev. E 100(1) 010601 URL https://link.aps.org/doi/10.1103/ PhysRevE.100.010601

[26] Tjhung E, Nardini C and Cates M E 2018 Phys. Rev. X 8(3) 031080 URL https://link.aps. org/doi/10.1103/PhysRevX.8.031080

[27] Golestanian R and Ajdari A 2002 EPL (Europhysics Letters) 59 800 URL http://stacks.iop. org/0295-5075/59/i=6/a=800

[28] Ziff R M, Uhlenbeck G E and Kac M 1977 Physics Reports 32 169 – 248 ISSN 0370-1573 URL http://www.sciencedirect.com/science/article/pii/0370157377900527

[29] Bagnato V, Pritchard D E and Kleppner D 1987 Phys. Rev. A 35(10) 4354–4358 URL https: //link.aps.org/doi/10.1103/PhysRevA.35.4354

[30] Dalfovo F, Giorgini S, Pitaevskii L P and Stringari S 1999 Rev. Mod. Phys. 71(3) 463–512 URL https://link.aps.org/doi/10.1103/RevModPhys.71.463

[31] Mahault B and Golestanian R 2020 in preparation

[32] Chavanis P H 2008 The European Physical Journal B 62 179–208 ISSN 1434-6036 URL https: //doi.org/10.1140/epjb/e2008-00142-9

[33] Romero-Roch´ın V 2005 Phys. Rev. Lett. 94(13) 130601 URL https://link.aps.org/doi/10. 1103/PhysRevLett.94.130601

[34] Solon A P, Fily Y, Baskaran A, Cates M E, Kafri Y, Kardar M and Tailleur J 2015 Nature Physics 11 673 EP – URL https://doi.org/10.1038/nphys3377