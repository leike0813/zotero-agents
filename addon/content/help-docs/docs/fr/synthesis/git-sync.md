# Synchronisation Git

:::warning Obsolète

La synchronisation Git a été rendue obsolète dans la version actuelle et n'est plus disponible en externe. Le plugin est passé à la **synchronisation par bundle durable WebDAV**, qui utilise le protocole WebDAV pour échanger des instantanés d'état persistant Synthesis (au lieu de dépôts Git) pour une synchronisation multi-appareils plus légère.

**Veuillez utiliser la [Synchronisation WebDAV](#doc/synthesis%2Fwebdav-sync) à la place.**

La synchronisation Git n'est conservée que comme canal de transport interne implicite (utilisé pour les diagnostics historiques et le nettoyage futur). La documentation ci-dessous est conservée à titre de référence historique.

:::

La synchronisation Git est une fonctionnalité optionnelle du Synthesis Workbench qui synchronise les données du graphe de connaissances depuis le Canonical Store vers un dépôt Git, permettant le contrôle de version, la sauvegarde et la collaboration.

## Cas d'utilisation

- **Contrôle de version** : Suivre l'historique des modifications pour tous les vocabulaires de balises, les synthèses de sujets et la base de connaissances conceptuelle
- **Sauvegarde** : Sauvegarder les données de connaissances structurées dans un dépôt Git distant
- **Collaboration** : Plusieurs chercheurs partagent le même système de balises et les mêmes résultats d'analyse

## Configuration

Configurez la synchronisation Git dans les préférences de Zotero :

Zotero → Paramètres → Zotero Agents → Synchronisation Git Synthesis

| Paramètre | Description |
|---------|-------------|
| **Activer la synchronisation Git** | Activer/désactiver la synchronisation |
| **URL du dépôt distant** | Adresse du dépôt Git distant (supporte HTTPS et SSH) |
| **Nom de la branche** | Branche Git utilisée pour la synchronisation |

### Prérequis

- Git installé (disponible dans le PATH du système)
- Un dépôt Git distant accessible (GitHub, Gitee, auto-hébergé, etc.)
- Si vous utilisez un dépôt HTTPS, les identifiants Git doivent être configurés

## Portée de la synchronisation

La synchronisation Git synchronise uniquement les **actifs du domaine canonique** (données de connaissances structurées dans le Canonical Store), à l'exclusion des données d'exécution.

### Ce qui est synchronisé

| Domaine | Contenu |
|--------|---------|
| `tags/` | Vocabulaire contrôlé de balises |
| `topics/` | Artefacts structurés pour la synthèse de sujets |
| `concepts/` | Base de connaissances conceptuelle (concepts, sens, alias, relations) |
| `topic-graph/` | Nœuds et arêtes du graphe de sujets |
| `citation-graph/` | Instantanés du graphe de citations |

### Ce qui n'est pas synchronisé

| Non synchronisé | Raison |
|------------|--------|
| Bases de données `state/` | État d'exécution SQLite ; peut être reconstruit à partir des actifs canoniques |
| Journaux d'exécution | Données de diagnostic temporaires |
| Fichiers d'espace de travail | Données temporaires générées pendant l'exécution |
| État des files d'attente et des verrous | État de planification interne |

## Machine à états de la synchronisation

Le système de synchronisation utilise une machine à états pilotée par file d'attente pour garantir la cohérence :

```
idle → queued → syncing → idle
                  ↓
            blocked_conflict
                  ↓
            failed_retryable / failed_permanent / disabled
```

| État | Description |
|-------|-------------|
| `idle` | Inactif, aucune tâche en attente |
| `queued` | Modifications en attente de synchronisation |
| `syncing` | Opération de synchronisation en cours |
| `blocked_conflict` | La synchronisation a échoué ; des conflits nécessitent une résolution manuelle |
| `failed_retryable` | Échec temporaire (ex. : problèmes de réseau) ; réessayable |
| `failed_permanent` | Échec permanent (ex. : erreur de configuration) |
| `disabled` | La synchronisation Git est désactivée |

## Gestion des conflits

Les conflits surviennent lorsque les versions locale et distante ont des modifications non fusionnées.

### Rapport de conflit

Le rapport de conflit liste :

- **Chemins des fichiers en conflit**
- **Hash de la version locale**
- **Hash de la version distante**
- **Raison du conflit** (ex. : les deux côtés ont modifié la même balise simultanément)

### Étapes de résolution

1. Consultez le rapport de conflit dans le panneau de synchronisation Git de la page Home
2. Analysez le contenu du conflit (granularité au niveau des fichiers)
3. Décidez de conserver la version locale, la version distante ou de fusionner manuellement
4. Après avoir terminé la fusion, validez les modifications

## Bonnes pratiques

### Synchronisation régulière

La synchronisation Git n'est pas une synchronisation en temps réel. Il est recommandé de :

- Déclencher manuellement la synchronisation après avoir terminé un lot de gestion de balises ou de modifications de sujets
- Ou de surveiller l'état de la synchronisation dans la page Home pour s'assurer que la file d'attente ne s'accumule pas

### Collaboration en équipe

Lorsque plusieurs personnes partagent le même vocabulaire de balises :

- Il est recommandé de désigner une personne dédiée à la gestion du vocabulaire
- Après la propagation des modifications de balises via la synchronisation Git, les autres membres effectuent une synchronisation par tirage
- Résolvez les conflits par la négociation

### Stratégie de sauvegarde

- La synchronisation Git complète le Canonical Store en tant que sauvegarde supplémentaire ; elle ne remplace pas la sauvegarde des données Zotero elles-mêmes
- Il est recommandé de pousser régulièrement le dépôt Git vers le distant (support intégré)
- La synchronisation initiale peut prendre du temps ; les synchronisations suivantes sont incrémentales

## Prochaines étapes

- [Tableau de bord Home](#doc/synthesis%2Fhome) — Voir le panneau d'état de la synchronisation
- [Gestion des balises](#doc/synthesis%2Ftags) — Gérer le vocabulaire contrôlé de balises
- [Préférences](#doc/preferences) — Configurer les paramètres du dépôt Git
