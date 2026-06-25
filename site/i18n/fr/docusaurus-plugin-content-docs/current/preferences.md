# Préférences

Les paramètres de Zotero Agents se trouvent dans **Zotero → Paramètres → Zotero Agents** (Windows/Linux) ou **Zotero → Préférences → Zotero Agents** (macOS).

## Paramètres des workflows

### Répertoire des workflows

- **Chemin** : Répertoire personnalisé pour stocker les workflows
- **Emplacement par défaut** : `<Zotero Data>/zotero-agents/data/workflows`
- **Analyser les workflows** : Cliquez sur le bouton pour réanalyser le répertoire et charger tous les workflows

### Répertoire des skills

- **Chemin** : Répertoire personnalisé pour stocker les packages de skills
- **Analyser** : Cliquez sur le bouton pour analyser le répertoire et charger les skills

### Packages de workflows officiels

Les workflows officiels sont distribués via des packages de contenu séparés, découplés du plugin lui-même.

![Page des paramètres des workflows](/img/docs/preferences_workflow.png)

| Paramètre | Type | Description |
|-----------|------|-------------|
| **Installer les packages de workflows officiels** | bouton | Télécharger et installer le dernier package officiel depuis GitHub / Gitee |
| **Vérifier les mises à jour** | bouton | Vérifier si une nouvelle version est disponible à distance |
| **Statut** | texte | Affiche la version du package installé et les informations de canal |

![Contenu des packages de workflows officiels](/img/docs/preferences_official-workflow-contents.png)

#### Canaux de mise à jour

Vous pouvez choisir parmi trois canaux de mise à jour :

| Canal | Description |
|-------|-------------|
| **stable** | Version stable (recommandé) |
| **beta** | Version bêta, inclut les fonctionnalités à venir |
| **dev** | Version de développement, inclut les dernières modifications expérimentales |

Après avoir changé de canal, cliquez sur **Vérifier les mises à jour** pour obtenir le dernier package de ce canal.

### Paramètres d'exécution

- **Activer les retours sur les exécutions de skills** : Lorsque cette option est activée, les exécutions de skills peuvent écrire des fichiers secondaires de retour Markdown, qui sont collectés par le panneau de retours sur les skills du tableau de bord

## Host Bridge

Un service HTTP intégré pour l'accès des outils IA externes et du CLI à la bibliothèque Zotero. Voir [Host Bridge](backends/host-bridge) pour plus de détails.

| Paramètre | Type | Description |
|-----------|------|-------------|
| **Activer le serveur MCP** | booléen | Exposer également l'interface du protocole MCP |
| **Désactiver l'approbation d'écriture** | booléen | Dangereux : contourner toutes les approbations d'écriture |
| **Activer l'accès LAN** | booléen | Autoriser l'accès LAN |
| **Port fixe** | booléen | Utiliser un port fixe au lieu d'un port aléatoire |
| **Numéro de port** | nombre | Valeur du port fixe (par défaut 26570) |
| **IP LAN** | chaîne | Spécifier manuellement l'IP annoncée (laisser vide pour la détection automatique) |

![Page des paramètres Host Bridge](/img/docs/preferences_host-bridge.png)

Boutons d'action :

- **Démarrer/Afficher le point d'accès** : Démarrer le service et afficher l'URL du point d'accès
- **Renouveler le jeton** : Renouveler le jeton de session
- **Créer/Renouveler le jeton maître** : Générer un jeton persistant
- **Copier le jeton maître** : Copier dans le presse-papiers
- **Copier le profil CLI distant** : Obtenir la configuration de connexion distante
- **Installer le CLI** : Installer `zotero-bridge` en un clic

![Zone des actions dangereuses Host Bridge dépliée](/img/docs/preferences_host-bridge_expand.png)

## Backend local SkillRunner

> ⚠️ Ce mode convient uniquement aux utilisateurs qui ne connaissent rien à l'installation d'outils d'agents et ne peuvent pas utiliser Docker. Si vous avez déjà un agent ACP ou pouvez utiliser Docker, préférez le [backend ACP](backends/acp) ou le [Skill-Runner déployé avec Docker](backends/skill-runner#recommended-docker-persistent-deployment).

Le Skill-Runner local démarre et s'arrête avec le plugin — fermer Zotero met fin à toutes les tâches. Fonctionnalités de gestion de l'exécution :

| Fonctionnalité | Description |
|----------------|-------------|
| **Déploiement en un clic** | Télécharger et installer la dernière version de l'environnement d'exécution Skill-Runner |
| **Démarrer** | Démarrer le processus Skill-Runner local |
| **Arrêter** | Arrêter le Skill-Runner local en cours d'exécution |
| **Désinstaller** | Supprimer les fichiers d'environnement d'exécution installés |
| **Ouvrir l'interface de gestion** | Ouvrir l'interface de gestion du backend dans le plugin |
| **Ouvrir le dossier des skills** | Ouvrir le répertoire où sont stockés les fichiers de skills |
| **Actualiser le cache de modèles** | Mettre à jour le cache de liste de modèles du backend |
| **Ouvrir la console de débogage** | Consulter la sortie des journaux du backend |

![Page des paramètres du backend local SkillRunner](/img/docs/preferences_skillrunner-local-backend.png)

## Gestionnaire de backends

Gérer tous les profils de backends :

- Regroupés par fournisseur (SkillRunner, ACP, Generic HTTP)
- Ajouter/modifier/supprimer des backends
- Chaque backend peut être configuré avec : ID, URL de base, Bearer Token, délai d'attente

## Synchronisation WebDAV

Solution de synchronisation multi-appareils pour le Synthesis Workbench, remplaçant Git Sync qui est obsolète. Voir [Synchronisation WebDAV](synthesis/webdav-sync) pour plus de détails.

| Paramètre | Type | Par défaut | Description |
|-----------|------|------------|-------------|
| **Activer la synchronisation WebDAV** | booléen | `false` | Interrupteur principal |
| **URL de base** | chaîne | `""` | Adresse du serveur WebDAV |
| **Chemin distant** | chaîne | `"zotero-agents"` | Chemin du répertoire distant |
| **Nom d'utilisateur** | chaîne | `""` | Nom d'utilisateur WebDAV |
| **Mot de passe/Jeton** | chiffré | `""` | Mot de passe ou jeton d'application (chiffré AES-256-GCM) |
| **Synchronisation automatique** | booléen | `false` | Déclencher automatiquement la synchronisation après chaque modification |
| **Retry automatique** | booléen | `false` | Réessayer automatiquement en cas d'échec |

Boutons d'action : Enregistrer les paramètres, Enregistrer l'identifiant, Tester la connexion.

![Page des paramètres de synchronisation WebDAV](/img/docs/preferences_WebDAV-sync.png)

## Données d'exécution

Affiche le répertoire racine de persistance, l'utilisation d'exécution et les diagnostics d'intégrité :

- **Racine de persistance** : `<Zotero Data>/zotero-agents/data/`
- **Stockage canonique Synthesis** : SQLite local + packages persistants
- **Tailles des répertoires** : data/, cache/, logs/, tmp/, etc.
- **Panneau de diagnostic** : Détecte les problèmes de système de fichiers (par exemple, les fichiers WAL non nettoyés)

Remarque : Le stockage canonique Synthesis et les bases de données d'état sont en lecture seule pour diagnostic et ne peuvent pas être nettoyés ici.

![Page de gestion des données d'exécution et de la persistance](/img/docs/preferences_storage-and-persistence.png)

## Options générales

- **Backend par défaut** : Sélectionner l'instance de backend par défaut à utiliser
- **Démarrer automatiquement le backend local** : Démarrer automatiquement Skill-Runner lorsque Zotero démarre
- **Niveau de journalisation** : Définir le niveau de journalisation
- **Activer le lecteur Markdown intégré** : Lorsque cette option est cochée, double-cliquer sur des pièces jointes `.md` les ouvre dans le lecteur intégré ; lorsqu'elle est décochée, l'ouvreur par défaut du système est restauré (activé par défaut)

## Arbre de navigation des paramètres

```
Zotero → Paramètres → Zotero Agents
├── Paramètres des workflows
│   ├── Répertoire des workflows
│   ├── Répertoire des skills
│   ├── Packages de workflows officiels
│   └── Paramètres d'exécution
├── Host Bridge
│   ├── Démarrage/Arrêt du service
│   ├── Réseau et port
│   └── Gestion des jetons
├── Backend local SkillRunner
├── Gestionnaire de backends
├── Synchronisation WebDAV
├── Données d'exécution
└── Options générales
```
