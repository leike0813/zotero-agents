# Aperçu de la Barre Latérale

## Qu'est-ce que la Barre Latérale ?

La barre latérale est un panneau d'opérations pratique fourni par Zotero Agents, flottant sur le côté droit de la fenêtre principale de Zotero. Elle vous permet d'interagir avec les backends, de voir le statut d'exécution et de gérer l'exécution des compétences sans quitter votre contexte de travail actuel.

## Comment l'Ouvrir

- **Bouton de la Barre d'Outils** : Cliquez sur le bouton de basculement de la barre latérale dans la barre d'outils de Zotero
- **Menu** : **Outils → Ouvrir la Barre Latérale**
- **Action du Tableau de Bord** : Cliquez sur "Ouvrir/Fermer la Barre Latérale" dans le Tableau de Bord

![Bouton de la barre latérale](/img/icon_sidebar.png)

![État de l'indicateur de réponse en attente de la barre latérale](/img/icon_sidebar_glow.png)

## Notes sur l'Architecture

La barre latérale utilise une **architecture iframe** : trois onglets chargent chacun une page HTML indépendante en tant qu'iframe enfant, communiquant avec le processus principal du plugin via postMessage. Cette conception garantit que les onglets n'interfèrent pas entre eux, chaque panneau ayant un contexte de rendu indépendant.

En mode Espace de Travail, les trois onglets sont intégrés dans un conteneur unifié ; en mode legacy, chaque panneau peut également être intégré directement dans le panneau de bibliothèque et le panneau de lecteur de Zotero.

## Trois Onglets

| Onglet | Fonction | Cas d'Usage |
|-----|----------|-----------| 
| **ACP Chat** | Converser avec le backend ACP en utilisant la notice actuelle comme contexte | Poser des questions en lisant de la littérature, aide à la rédaction |
| **ACP Skills** | Superviser et gérer les exécutions de compétences via le backend ACP | Voir la progression des exécutions, inspecter les résultats, gérer les demandes de permission |
| **SkillRunner** | Voir et interagir avec les exécutions du backend Skill-Runner | Gérer les exécutions interactives, gérer l'authentification |

## Guide de l'Interface

### Basculement d'Onglet

La barre d'onglets en haut de la barre latérale vous permet de basculer entre les trois panneaux. L'état de l'onglet précédent est conservé lors du basculement.

### Ajustement de la Largeur

La largeur de la barre latérale peut être librement ajustée en faisant glisser la bordure gauche pour s'adapter aux différents besoins d'affichage de contenu.

### Composants Communs

Tous les onglets partagent les composants d'interface utilisateur suivants :

- **Bannière** : Barre d'information en haut affichant les informations du projet actuellement sélectionné et les boutons d'action
- **Vue de Transcript** : Zone principale pour les conversations ou les journaux d'exécution, prenant en charge les modes d'affichage Plain et Bubble
- **Zone de Réponse** : Zone de saisie en bas pour envoyer des messages ou des réponses
- **Panneaux Tiroir** : Panneaux de détails extensibles sur les côtés gauche et droit
- **Composant de Prompt** : Prompts affichés lorsque l'interaction utilisateur est requise
- **Composant de Plan** : Progrès visuel pour les plans multi-étapes

## Liens Rapides vers Chaque Onglet

- [Utilisation de ACP Chat](./acp-chat) — Interaction conversationnelle avec le backend
- [ACP Skills](./acp-skills) — Gérer les exécutions de compétences ACP
- [Onglet SkillRunner](./skillrunner-tab) — Gérer les exécutions Skill-Runner

## Pages Associées

- [Aperçu du Tableau de Bord](../dashboard) — Supervision centrale et gestion des tâches
