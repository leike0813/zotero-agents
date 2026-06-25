# ACP Skills

L'onglet ACP Skills est utilisé pour superviser et gérer les exécutions de compétences via le backend ACP. Contrairement au dialogue continu de ACP Chat, ACP Skills est conçu pour des tâches de compétences ponctuelles ou exécutées périodiquement.

## Aperçu de l'Interface

Le panneau ACP Skills est divisé dans les zones principales suivantes :

![Panneau ACP Skills](/img/docs/sidebar/acp-skills.png)

```
┌─────────────────────────────────────┐
│  Bannière: Titre de la Tâche / Statut / Backend   │
├─────────────────────────────────────┤
│  ← Tiroir Exécutions  │  Zone de Contenu Principal  │  Détails → │
│                       │  Vue de Transcript              │
│  En cours             │  Composant de Plan              │
│  └─ backend1          │  Composant de Prompt            │
│     ├─ exéc. A        │  Zone de Réponse                │
│     └─ exéc. B        │                                 │
│  Terminées            │                                 │
│  └─ backend1          │                                 │
│     └─ exéc. C        │                                 │
└─────────────────────────────────────┘
```

## Bannière

La zone Bannière affiche les métainformations et les boutons d'action pour l'exécution actuellement sélectionnée :

- **Titre de la Tâche** : Le nom de la compétence de l'exécution
- **Statut** : Indicateur de statut de l'exécution (en cours / terminé / échoué / annulé, etc.)
- **Backend** : Le backend ACP exécutant l'exécution
- **Boutons d'Action** : Connecter/Déconnecter, Annuler la Tâche

## Tiroir d'Exécutions (Gauche)

Le tiroir gauche organise toutes les Exécutions de Compétences ACP dans une structure arborescente :

### Regroupement

| Groupe | Description |
|------|------|
| **En cours** | Tâches en cours d'exécution, groupées par backend |
| **Terminées** | Tâches terminées, groupées par backend |

Chaque entrée de tâche affiche des informations résumées (ID de compétence, statut, heure) et dispose d'un indicateur d'attention (LED) pour marquer les changements de statut. Cliquez sur n'importe quelle entrée de tâche pour basculer vers la vue détaillée de cette exécution.

### Archivage

Les tâches terminées peuvent être retirées de la liste via le bouton d'archivage (l'archivage les masque uniquement dans la session actuelle et n'affecte pas les enregistrements d'exécution).

## Zone de Contenu Principal

### Vue de Transcript

Après avoir sélectionné une exécution, la zone de contenu principal affiche le transcript complet de cette exécution, incluant :

- **Messages** : Contenu du dialogue entre l'assistant et l'utilisateur
- **Appels d'Outils** : Outils invoqués par l'IA et leurs résultats, affichant le nom de l'outil, le résumé d'entrée et le voyant de statut
- **Processus de Réflexion** : Le processus de raisonnement de l'IA (si disponible)
- **Événements de Statut** : Changements d'état pendant l'exécution

Le transcript prend en charge le **mode Plain** (messages colorés par rôle sur la bordure gauche) et le **mode Bubble** (messages en style bulle, les appels d'outils consécutifs automatiquement regroupés), basculable via le bouton dans le coin supérieur droit.

### Composant de Plan

Lorsqu'une exécution inclut un plan multi-étapes, le composant de plan affiche la progression actuelle, les étapes terminées et les étapes en attente, chaque étape ayant une icône de statut (en cours/terminée/échouée).

### Composant de Prompt

Le composant de prompt affiche différentes invites interactives en fonction du statut de l'exécution :

| Statut | Contenu Affiché |
|------|---------|
| `waiting_user` | Prompt en attente de réponse utilisateur, avec description du contexte et options de réponse rapide |
| `permission` | Prompt de demande de permission, avec aperçu de la commande et boutons approuver/rejeter |
| `disconnected` | Prompt de reconnexion ; cliquez pour connecter |
| `running` | Indicateur en cours |
| `completed` | Confirmation du statut de fin |
| `error` | Informations d'erreur et suggestions de dépannage |

### Zone de Réponse

La zone de réponse en bas contient :

- **Zone de Saisie de Texte** : Saisir le contenu de la réponse
- **Sélection du Mode** (optionnel) : Basculement du mode d'exécution
- **Sélection du Modèle** (optionnel) : Basculement du modèle d'IA
- **Effort de Raisonnement** (optionnel) : Niveau d'effort de raisonnement
- **Bouton Envoyer/Annuler**
- **Compteur d'Utilisation** : Graphique circulaire montrant l'utilisation des jetons (utilisé/limite)
- **Indice de Raccourci Clavier** : Raccourci clavier pour envoyer les réponses

Les brouillons de réponse sont sauvegardés par requête — changer d'exécution et revenir préserve le contenu non envoyé.

## Tiroir de Détails (Droit)

Le tiroir droit affiche des informations détaillées sur l'exécution sélectionnée, avec les zones rétractables suivantes :

| Zone | Contenu |
|------|------|
| **Chemin d'Exécution** | Répertoire de l'espace de travail, chemins des fichiers de résultats |
| **Info Exécuteur** | backends, agent, mode, modèle, raisonnement, compétence, session |
| **Info de Validation** | Statut de validation, nombre de corrections, détails des erreurs |
| **Dépendances d'Exécution** | Liste des dépendances de l'environnement d'exécution |
| **Révision de Sortie** | Historique des révisions de sortie |
| **Journal d'Exécution** | Entrées de journal pendant l'exécution |
| **Résultat JSON** | Sortie structurée finale (extensible) |

## Gestion des Permissions

Lorsqu'une exécution nécessite des permissions d'écriture Zotero ou des permissions d'appel d'outil ACP, le composant de prompt affiche une demande de permission :

- **Aperçu de la Commande** : Montre l'opération demandée
- **Info Source** : Qui a initié la demande
- **Boutons d'Action** : Approuver / Rejeter
- Développer pour voir les détails complets de la demande

## Configuration Associée

Le panneau ACP Skills nécessite qu'un [backend ACP](../backends/acp) soit configuré avant utilisation.
