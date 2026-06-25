# Onglet SkillRunner

L'onglet SkillRunner est utilisé pour voir et interagir avec les exécutions via le backend Skill-Runner. Contrairement à ACP Skills qui se concentre sur l'exécution ponctuelle de compétences, l'onglet SkillRunner met l'accent sur la gestion des sessions interactives.

## Aperçu de l'Interface

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/sidebar/skillrunner-tab.webp" alt="Panneau SkillRunner" title="Panneau SkillRunner" loading="lazy" /><figcaption>Panneau SkillRunner</figcaption></figure>

```
┌─────────────────────────────────────┐
│  Bannière: Titre / requestId / Statut    │
├─────────────────────────────────────┤
│  ← Tiroir Tâches  │  Zone de Contenu Principal   │  Détails → │
│                   │  Vue de Transcript               │
│  En cours         │  Composant de Plan               │
│  └─ backend1      │  Composant de Prompt             │
│     └─ tâche A    │  Zone de Réponse                 │
│  Terminées        │                                  │
│  └─ backend1      │                                  │
│     └─ tâche B    │                                  │
└─────────────────────────────────────┘
```

## Bannière

La Bannière affiche des informations sur la tâche actuellement sélectionnée :

- **Titre** : Nom de la tâche ou identifiant de compétence
- **Request ID** : Identifiant de requête unique pour la tâche
- **Statut** : Statut d'exécution (en cours / waiting_user / waiting_auth / terminé / échoué)
- **Backend** : Informations sur le backend
- **Moteur** : Le moteur utilisé (par exemple, gemini, claude, etc.)
- **Modèle** : Le modèle utilisé
- **Mis à jour** : Dernière heure de mise à jour
- **Bouton Annuler la Tâche**

## Tiroir de Tâches (Gauche)

Le tiroir gauche affiche toutes les tâches SkillRunner, divisées en groupes En cours et Terminées. Chaque entrée de tâche affiche des informations résumées, un indicateur de statut et une action d'archivage. Cliquez sur une entrée pour basculer vers la vue détaillée de cette tâche.

## Zone de Contenu Principal

### Vue de Transcript

La vue de transcript de SkillRunner utilise un **modèle de chat de réflexion** qui gère intelligemment le raisonnement continu :

- **Blocs de Réflexion** : Le processus de raisonnement de l'IA est affiché sous forme de blocs de réflexion séparés
- **Appels d'Outils** : Affiche le nom de l'outil, le résumé d'entrée et le statut d'exécution
- **Messages** : Messages de conversation entre l'assistant et l'utilisateur
- **Révision** : Enregistrements des changements de version de sortie

Prend également en charge les modes d'affichage **Plain / Bubble**.

### Flux d'Authentification

L'onglet SkillRunner prend en charge les flux d'authentification, permettant de compléter l'authentification du backend sans quitter le panneau :

**Déclencheurs d'Authentification :**

- Déclenché automatiquement lors de l'exécution d'une compétence nécessitant une authentification
- Le composant de prompt affiche une demande d'authentification

**Méthodes d'Authentification Prises en Charge :**

| Méthode | Description | Cas d'Usage |
|------|------|---------|
| **Proxy OAuth** | Compléter le flux OAuth via le navigateur | Méthode recommandée, pour les moteurs prenant en charge OAuth |
| **Saisie de Code d'Authentification** | Saisir manuellement un code d'authentification ou une URL | Lorsque le moteur a généré un lien d'authentification |
| **Import de Fichier** | Importer un fichier d'informations d'identification | Lorsqu'un fichier d'informations d'identification est déjà disponible |
| **TUI Intégré** | Lancer un terminal directement dans le panneau | Lorsqu'une connexion interactive est requise |

**Exemple de Flux d'Authentification (OAuth) :**

1. L'exécution détecte qu'une authentification est requise
2. Le composant de prompt affiche "Authentification requise" et les méthodes d'authentification disponibles
3. L'utilisateur sélectionne le proxy OAuth
4. Le navigateur ouvre la page OAuth
5. L'utilisateur complète l'authentification
6. L'exécution reprend automatiquement

### Composant de Prompt

| Statut | Contenu Affiché |
|------|---------|
| `waiting_user` | En attente de saisie utilisateur ; affiche la description du contexte et les options rapides (si disponibles) |
| `waiting_auth` | En attente d'authentification ; affiche la sélection de méthode d'authentification et la saisie |
| `running` | Indicateur en cours |
| `completed` | Confirmation du statut de fin |
| `error` | Informations d'erreur et suggestions de dépannage |

### Zone de Réponse

- **Zone de Saisie de Texte** : Saisir le contenu de la réponse
- **Bouton Envoyer/Annuler**

Contrairement à ACP Skills, la zone de réponse de l'onglet SkillRunner n'a pas de sélecteurs de mode/modèle/raisonnement (ceux-ci sont configurés dans les paramètres du backend).

## Tiroir de Détails (Droit)

| Zone | Contenu |
|------|------|
| **Métadonnées d'Exécution** | Titre, requestId, taskKey, statut, indicateurs terminal/waiting |
| **Info Backend** | backend, moteur, modèle |
| **Heure de Mise à Jour** | Dernière heure d'activité |
| **Info d'Interaction** | Informations d'interaction en attente actuelles (le cas échéant) |
| **Résumé de Session** | Résumé des sessions historiques |
| **Résumé de Révision** | Enregistrements des changements de version de sortie |

## Configuration Associée

Avant d'utiliser l'onglet SkillRunner, un [backend Skill-Runner](#doc/backends%2Fskill-runner) doit être configuré.
