# Synchronisation WebDAV

## Aperçu

La synchronisation WebDAV est le mécanisme de synchronisation multi-appareils du Synthesis Workbench, remplaçant la synchronisation Git obsolète. Elle échange des instantanés de bundle d'état persistant déterministes via le protocole WebDAV.

Fonctionne avec tout serveur compatible WebDAV (Nextcloud, ownCloud, Synology, etc.). Aucun Git requis.

## Prérequis

- Un serveur WebDAV accessible
- Des identifiants WebDAV (nom d'utilisateur + mot de passe ou jeton spécifique à l'application)

## Configuration

Zotero → Paramètres → Zotero Agents → Synchronisation WebDAV

| Paramètre | Type | Défaut | Description |
|---------|------|---------|-------------|
| **Activer la synchronisation WebDAV** | boolean | `false` | Interrupteur principal |
| **URL de base** | string | `""` | URL du serveur WebDAV, ex. `https://nextcloud.example.com/remote.php/dav/files/user/` |
| **Chemin distant** | string | `"zotero-agents"` | Répertoire distant sous l'URL de base |
| **Nom d'utilisateur** | string | `""` | Nom d'utilisateur WebDAV (optionnel) |
| **Mot de passe / Jeton applicatif** | encrypted | `""` | Mot de passe ou jeton (chiffré AES-256-GCM) |
| **Synchronisation automatique** | boolean | `false` | Déclencher la synchronisation automatiquement après les modifications Synthesis |
| **Réessai automatique** | boolean | `false` | Réessayer automatiquement les échecs temporaires |

Boutons d'action :

- **Enregistrer les paramètres** : Persister les paramètres hors identifiants
- **Enregistrer l'identifiant** : Chiffrer et stocker le mot de passe/jeton
- **Tester la connexion** : Envoyer une requête PROPFIND pour vérifier la connectivité

## Structure des fichiers distants

```
<remotePath>/
├── HEAD.json                           # Pointeur d'instantané actuel
└── snapshots/
    └── <snapshotId>/
        ├── manifest.json               # Manifeste du bundle durable
        └── bundles/                    # Fichiers de bundle durable déterministes
```

**HEAD.json** contient `snapshot_id`, `manifest_hash`, `updated_at`, `producer_version`. Les instantanés sont entièrement téléchargés avant la mise à jour de HEAD — les synchronisations interrompues ne corrompent jamais le distant.

## Ce qui est synchronisé

| Synchronisé | Non synchronisé |
|--------|-----------|
| Sujets | Bases de données d'exécution SQLite |
| Concepts (concepts, sens, alias, relations) | Journaux d'exécution |
| Graphe de sujets (nœuds, arêtes) | Fichiers d'espace de travail |
| Références (liaisons, redirections) | État des files d'attente et des verrous |
| Éléments de révision | Projections reconstructibles (disposition des citations, métriques, cache) |
| Balises (vocabulaire contrôlé) | Identifiants |
| Notices associées | Fichiers temporaires |

## Flux de synchronisation

```
idle → queued → syncing → idle
                 ├── blocked_conflict (résolution manuelle requise)
                 └── failed_retryable / failed_permanent
```

| Étape | Description |
|------|-------------|
| 1. HEAD | Lire le HEAD.json distant |
| 2. Téléchargement | Télécharger le manifeste + les bundles si un instantané plus récent existe |
| 3. Aperçu | Valider l'instantané importé, comparer les hashs d'entités |
| 4. Vérification des conflits | Détecter les modifications bilatérales |
| 5. Application | Importer l'instantané distant dans le Canonical Store local |
| 6. Export | Exporter l'état local actuel sous forme de bundles |
| 7. Téléversement | Téléverser le manifeste + les bundles |
| 8. Mise à jour HEAD | Mettre à jour HEAD.json en dernier (ETag/If-Match pour la sécurité de concurrence) |

## Gestion des conflits

La détection des conflits est basée sur la comparaison de hashs au niveau des entités. Un conflit est levé lorsque la même entité a changé à la fois localement et à distance.

**Types de conflits :**

- Modification bilatérale d'entité
- Conflit mise à jour vs. tombstone
- Divergence d'éléments de révision
- Divergence de cible de liaison/redirection de référence

**Actions de résolution :**

| Action | Description |
|--------|-------------|
| `keep_local` | Conserver l'état local, fermer la porte de conflit, mettre en file d'attente le prochain export |
| `clear_after_manual_edit` | Après la fusion manuelle, re-valider ; effacer le marqueur de conflit lorsque résolu |

Le panneau de synchronisation de la page Home du Workbench affiche les détails du conflit et les boutons d'action.

## Sécurité

- **Chiffrement des identifiants** : AES-256-GCM, clé dérivée du jeton maître Host Bridge (PBKDF2-SHA256, 100 000 itérations)
- **Le texte en clair n'est jamais retourné** : l'identifiant n'est pas lisible après l'enregistrement
- **Assainissement de l'URL** : les identifiants sont supprimés de la sortie du journal
- **Authentification basique HTTP** : authentification basique standard sur HTTPS

## Limitations

| Limitation | Détail |
|------------|--------|
| **Manuelle par défaut** | La synchronisation automatique et le réessai automatique sont désactivés par défaut |
| **Pas de compression** | Les instantanés v1 sont des bundles JSON bruts |
| **Pas de nettoyage des anciens instantanés** | Les instantanés distants s'accumulent ; un nettoyage manuel est nécessaire |
| **Pas de fusion au niveau des champs** | Les conflits sont au niveau des entités |
| **Hypothèse mono-appareil** | Les écritures simultanées depuis plusieurs appareils peuvent causer des conflits |

## Prochaines étapes

- [Tableau de bord Home](#doc/synthesis%2Fhome) — Voir l'état de la synchronisation
- [Préférences](#doc/preferences) — Configurer la synchronisation WebDAV
- [Synchronisation Git](#doc/synthesis%2Fgit-sync) (obsolète) — Référence historique
