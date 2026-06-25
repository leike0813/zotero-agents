# Utilisation de ACP Chat

## Fonctionnalité

ACP Chat vous permet de converser avec un backend ACP configuré, le contexte de conversation étant tiré de la notice Zotero que vous êtes en train de consulter ou de l'article dans le lecteur.

## Cas d'Usage

- **Questions-Réponses sur la Littérature** : Poser des questions sur l'article que vous êtes en train de lire, obtenir des explications et des résumés
- **Aide à la Rédaction** : Obtenir des suggestions pendant le processus de rédaction
- **Recherche Rapide** : Récupérer rapidement des informations clés sur un article spécifique
- **Traitement par Lot** : Effectuer une analyse par lot sur plusieurs notices d'une liste de littérature

## Disposition de l'Interface

Le panneau ACP Chat contient les zones suivantes :

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/sidebar/acp-chat.webp" alt="Panneau ACP Chat" title="Panneau ACP Chat" loading="lazy" /><figcaption>Panneau ACP Chat</figcaption></figure>

```
┌──────────────────────────────────────────┐
│  Bannière                                │
│  Backend ▼  |  Session ▼  | [Connecter] [＋] │
│  Statut:   ● Connexion | ● MCP | ● HostBridge  │
├──────────────────────────────────────────┤
│  ← Tiroir Sessions  │  Vue Transcript  │  Détails →  │
│                     │  [Basculer Plain/Bubble]    │
│  Backend A          │  Messages de conversation... │
│  ├─ Session 1       │  Composant de Plan           │
│  └─ Session 2       │  Composant de Prompt         │
│  Backend B          │  Zone de Réponse             │
│  └─ Session 3       │  Saisie texte + Envoyer/Annuler │
│                     │  Mode ▼ | Modèle ▼ | Raisonnement ▼│
│                     │  ⭕ Utilisation 12.3k/200k   │
└──────────────────────────────────────────┘
```

## Bannière

La Bannière se trouve en haut du panneau, fournissant les fonctions de contrôle principales :

### Sélection du Backend

Une liste déroulante répertorie tous les backends configurés, chacun affichant un suffixe de statut (Connexion en cours/Connecté/Déconnecté). Changer de backend bascule automatiquement vers la session de ce backend.

### Sélection de la Session

Une liste déroulante affiche les 8 sessions les plus récentes (triées par heure) ; en sélectionner une bascule vers cette session. Lorsqu'il y en a plus de 8, "Afficher plus..." apparaît en bas ; cliquer dessus ouvre le tiroir de sessions pour voir la liste complète.

### Contrôles de Connexion

- **Bouton Connecter/Déconnecter** : Gérer manuellement l'état de connexion du backend actuel
- **Bouton d'Authentification** : Affiché lorsque le backend nécessite une authentification
- **Nouvelle Session (＋)** : Créer une nouvelle session sur le backend actuel

### Indicateurs de Statut

Le côté droit de la Bannière affiche trois voyants de statut :

| Indicateur | Description |
|-----------|-------------|
| ● Connexion | Statut de connexion avec le backend ACP (vert=Connecté/gris=Déconnecté/jaune=Connexion en cours) |
| ● MCP | Disponibilité du service MCP |
| ● Host Bridge | Statut de connexion du Host Bridge Zotero (voir ci-dessous) |

### Statut du Host Bridge

Host Bridge est un canal de pont interne entre le plugin Zotero et le backend. Il est responsable de transmettre le contexte Zotero actuel (notices sélectionnées, article dans le lecteur, données de la bibliothèque, etc.) au backend, permettant à l'IA d'opérer sur la base de vos données Zotero réelles.

Host Bridge communique via l'outil CLI `zotero-bridge` ; le plugin gère son cycle de vie automatiquement en arrière-plan.

| Statut | Signification |
|--------|---------|
| Vert ● | Host Bridge est connecté ; le backend peut accéder au contexte Zotero |
| Jaune ● | Connexion ou reconnexion en cours |
| Gris ● | Host Bridge n'est pas disponible (non installé ou non démarré) ; le backend ne peut pas obtenir le contexte Zotero |
| Caché | Host Bridge n'est pas nécessaire actuellement (par exemple, le backend ne le prend pas en charge ou les fonctionnalités de contexte ne sont pas activées) |

Lorsque Host Bridge n'est pas disponible, ACP Chat peut toujours fonctionner normalement, mais l'IA ne peut pas accéder aux informations sur l'article que vous êtes en train de consulter comme contexte.

## Tiroir de Sessions (Gauche)

Le tiroir gauche affiche toutes les sessions historiques groupées par backend. Chaque entrée de session affiche un titre et une heure de dernière activité.

- **Changer de Session** : Cliquez sur une session dans la liste pour la charger
- **Nouvelle Session** : Opérer depuis le haut du tiroir ou la Bannière

## Vue de Transcript

### Messages de Conversation

Les messages de conversation prennent en charge le rendu Markdown, incluant :

- **Blocs de Code** : Avec coloration syntaxique et bouton de copie
- **Formules Mathématiques** : Formules LaTeX rendues avec KaTeX
- **Listes, Tableaux, Liens** et autres éléments Markdown standard

### Appels d'Outils

Lorsque l'IA invoque un outil, une entrée d'appel d'outil est affichée dans le transcript :

- Badge du nom de l'outil
- Résumé des paramètres d'entrée
- Voyant de statut d'exécution (en attente/en cours/terminé/échoué)
- En mode Bubble, les appels d'outils consécutifs sont automatiquement regroupés en un "groupe d'activité d'outil"

### Processus de Réflexion

Le processus de raisonnement de l'IA est affiché sous forme de bloc séparé "Réflexion", distinct de la réponse formelle.

### Basculement du Mode d'Affichage

Le bouton de basculement dans le coin supérieur droit vous permet de basculer entre deux modes :

| Mode | Description |
|------|-------------|
| **Plain** | Les messages sont colorés par rôle sur la bordure gauche, adapté pour parcourir de longues conversations |
| **Bubble** | Les messages sont affichés en style bulle, les appels d'outils consécutifs sont automatiquement groupés, adapté pour la lecture |

### Composant de Plan

Lorsqu'une conversation inclut un plan multi-étapes, une barre de progression du plan est affichée au-dessus du transcript, marquant les étapes terminées, en cours et en attente.

### Composant de Prompt

Le composant de prompt est affiché lorsque l'interaction utilisateur est requise :

- **Demandes de Permission** : Lorsque le backend a besoin de permissions d'accès Zotero, affiche les détails de la demande et les boutons d'approbation
- **Prompt de Connexion** : Lorsqu'il est déconnecté, affiche une suggestion de reconnexion
- **Prompt d'Erreur** : Affiche les informations d'erreur et les actions de récupération

## Zone de Réponse

### Saisie de Texte

- **Zone de Texte Multi-lignes** : Prend en charge la saisie de texte long
- **Entrée pour Envoyer** : Appuyez sur Entrée pour envoyer un message
- **Maj+Entrée pour Nouvelle Ligne** : Insérer un saut de ligne
- **Historique des Réponses** : Appuyez sur les touches fléchées haut/bas pour parcourir les messages envoyés

### Mode d'Exécution

Au-dessus de la zone de réponse, vous pouvez sélectionner :

| Option | Description | Valeurs Disponibles |
|--------|-------------|-----------------|
| **Mode** | Mode d'exécution | Défini par le backend |
| **Modèle** | Modèle d'IA | Liste des modèles pris en charge par le backend |
| **Effort de Raisonnement** | Niveau d'effort de raisonnement | Faible/Moyen/Élevé (si pris en charge par le backend) |

### Compteur d'Utilisation

Un compteur d'utilisation circulaire est affiché dans le coin inférieur droit de la zone de réponse :

- **Anneau Extérieur** : Pourcentage de l'utilisation des jetons de la session actuelle par rapport à la limite
- **Texte** : `Utilisé k / Limite k`
- La couleur change avec le niveau d'utilisation (Normal → Avertissement → Critique)

### Indices de Raccourcis Clavier

Les indices de raccourcis clavier sont affichés à l'intérieur de la zone de saisie.

## Tiroir de Détails (Droit)

Le tiroir droit affiche des informations détaillées sur la session actuelle :

| Zone | Contenu |
|------|---------|
| **Info Session** | ID de session, date de création, dernière heure d'activité |
| **Info Backend** | Type de backend, adresse, modèle |
| **Chemin de l'Espace de Travail** | Chemin du fichier de l'espace de travail de la session |
| **Diagnostics** | Données de débogage et de diagnostic |

## Contexte de Bibliothèque vs Contexte de Lecteur

ACP Chat prend en charge deux modes de contexte ; le plugin détecte automatiquement le type de contexte actuel et le transmet au backend :

| Mode | Description | Cas d'Usage |
|------|-------------|-----------| 
| **Contexte de Bibliothèque** | Basé sur les notices actuellement sélectionnées dans la liste des notices de Zotero | Référence rapide en parcourant la bibliothèque |
| **Contexte de Lecteur** | Basé sur le texte intégral de l'article actuellement ouvert dans le Lecteur Zotero | Compréhension contextuelle nécessaire pendant la lecture approfondie |

## Gestion des Sessions

- L'historique des conversations est automatiquement persisté
- Plusieurs sessions par backend sont gérées indépendamment
- Les sessions historiques peuvent être consultées dans le Tableau de Bord ou la barre latérale
- Une liste de sessions groupées par backend est prise en charge

## Remarques

- Un [backend ACP](#doc/backends%2Facp) doit être configuré au préalable
- Les conversations sur différents backends ACP n'interfèrent pas entre elles
- Les conversations sont associées aux notices Zotero pour une référence ultérieure facile
