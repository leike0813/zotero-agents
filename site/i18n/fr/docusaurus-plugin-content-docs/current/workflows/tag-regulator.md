# Tag Regulator

## Objectif

Normaliser les balises des notices Zotero en fonction d'un vocabulaire contrôlé, et utiliser l'IA pour inférer de possibles nouvelles balises.

Ce workflow appelle la compétence `tag-regulator` sur le backend Skill-Runner pour vérifier la conformité des balises au vocabulaire et recommander des balises pertinentes.

## Cas d'Usage

- Nettoyer en lot les balises non standard
- Recommander automatiquement des balises pour les notices en fonction d'un vocabulaire contrôlé existant
- Maintenir les mises à jour continues et le raffinement du vocabulaire contrôlé

## Contraintes d'Entrée

| Type de Contrainte | Description |
|---------|------|
| Unité d'Entrée | Notice parente |
| Source de Données | Obtenu à partir de la notice parente : balises actuelles, métadonnées (titre, auteurs, résumé, etc.) |

Si un résumé Markdown de contenu embarqué généré par literature-analysis existe, le workflow le téléversera automatiquement comme contexte optionnel pour améliorer la qualité de l'inférence.

### Méthodes de Déclenchement

- Sélectionner directement une ou plusieurs notices Zotero (notices parentes)
- Après avoir sélectionné les notices, choisir "Tag Regulator" dans le menu contextuel

## Flux d'Exécution

```
1. Charger le Vocabulaire Contrôlé
   └── Lire tagVocabularyJson depuis les préférences Zotero
       └── Analyser la liste des balises valides du vocabulaire

2. Construire la Requête
   └── Collecter les métadonnées de la notice parente et la liste des balises actuelles
       └── Écrire le vocabulaire contrôlé dans un fichier YAML temporaire
       └── Téléverser vers Skill-Runner

3. Traitement Skill-Runner
   └── Invoquer skill_id: "tag-regulator"
       └── Vérifier la conformité des balises
       └── Générer les balises suggérées (suggest_tags)

4. Renvoyer les Résultats
   └── Appliquer les changements de balises (supprimer les balises non conformes, ajouter les balises recommandées)
       └── Réconcilier les balises suggérées avec le vocabulaire local actuel
       └── Traiter les balises suggérées (interaction popup)
```

### Logique de Traitement des Balises

- **remove_tags** : Les balises actuelles ne figurant pas dans le vocabulaire contrôlé seront supprimées
- **add_tags** : Balises inférées à partir des métadonnées, ajoutées directement à la notice
- **suggest_tags** : Nouvelles balises suggérées par l'IA, nécessitant une confirmation utilisateur
- **digest_markdown** : Contexte d'enrichissement optionnel, téléversé uniquement lorsqu'un résumé Markdown de contenu embarqué existe

### Règles de Synchronisation en Temps Réel

Lorsque les résultats sont renvoyés, le dernier état local est lu :

- Si un `suggest_tag` est déjà entré dans le vocabulaire contrôlé, aucun popup n'est affiché ; il participe à la mise à jour de la notice avec la sémantique `add_tags`
- Si un `suggest_tag` est déjà dans la zone de transit, il ne sera pas réécrit dans la zone de transit
- Seules les suggestions non traitées entreront dans le popup

### Durée Estimée

| Scénario | Durée Estimée par Article |
|------|-------------|
| Sans résumé (Literature Analysis non exécuté) | Environ 1 minute |
| Avec résumé (Literature Analysis déjà exécuté) | 1-3 minutes |

Si la notice possède déjà un résumé, l'IA utilisera le résumé comme contexte supplémentaire, ce qui donne une inférence plus précise mais plus longue.

### Popup de Balises Suggérées

Pour les `suggest_tags`, une boîte de dialogue invite l'utilisateur à choisir comment les traiter :

- **Ajouter** : Ajouter directement au vocabulaire contrôlé
- **Mettre en transit** : Placer dans la zone de transit pour examen ultérieur
- **Rejeter** : Ignorer la suggestion
- **Tout Ajouter / Tout Mettre en Transit / Tout Rejeter** : Traitement en lot

La boîte de dialogue comporte un compte à rebours de mise en transit automatique de 10 secondes ; si le délai expire, les suggestions sont automatiquement mises en transit.

## Sorties

### 1. Changements de Balises
- **remove_tags** : Supprimer de la notice les balises ne figurant pas dans le vocabulaire
- **add_tags** : Ajouter les balises recommandées à la notice
- Appliqués directement aux notices Zotero sélectionnées

### 2. Traitement des Balises Suggérées
- L'utilisateur choisit comment les traiter via le popup
- Balises acceptées : Ajoutées à la préférence `tagVocabularyJson`
- Balises en transit : Ajoutées à la préférence `tagVocabularyStagedJson`

## Recommandation de Modèle

🟢 Un modèle léger est suffisant — la régulation de balises est essentiellement une tâche simple de classification et de correspondance qui ne nécessite pas le modèle le plus puissant.

## Paramètres

| Paramètre | Type | Description | Défaut |
|------|------|------|--------|
| `infer_tag` | boolean | S'il faut activer l'inférence de balises | `true` |
| `valid_tags_format` | string | Format du vocabulaire | `yaml` |
| `tag_note_language` | string | Langue pour les descriptions des suggestions | `zh-CN` |

### Valeurs Disponibles pour valid_tags_format

- `yaml` : Utiliser le format YAML
- `json` : Utiliser le format JSON
- `auto` : Détection automatique

## Dépendances

- **Vocabulaire Contrôlé** : Un vocabulaire contrôlé doit être créé au préalable ; voir [Gestion des Balises](../synthesis/tags)
- **Backend** : Service Skill-Runner
- **Configuration du Backend** : Configurer un backend de type Skill-Runner dans le Gestionnaire de Backends
- **Compétence** : La compétence `tag-regulator` doit être déployée sur le Skill-Runner

## Workflows Associés

- [Gestion des Balises](../synthesis/tags) — Gérer le vocabulaire de balises contrôlé
