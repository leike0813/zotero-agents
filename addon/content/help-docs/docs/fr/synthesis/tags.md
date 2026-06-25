# Gestion des balises

## Qu'est-ce que le vocabulaire de balises ?

Le vocabulaire de balises est un système de balisage standardisé utilisé pour l'annotation cohérente de la littérature. Contrairement aux balises libres natives de Zotero, les balises d'un vocabulaire contrôlé suivent des conventions de dénomination unifiées, ce qui facilite les statistiques et la recherche.

## Facettes

Chaque balise appartient à une facette (dimension). Les facettes suivantes sont actuellement prises en charge :

| Facette | Description | Exemple |
|-------|-------------|---------|
| `field` | Domaine de recherche | `field:natural_language_processing` |
| `topic` | Sujet de recherche | `topic:transformer_architecture` |
| `method` | Méthode de recherche | `method:reinforcement_learning` |
| `model` | Modèle utilisé | `model:gpt-4` |
| `ai_task` | Type de tâche IA | `ai_task:text_summarization` |
| `data` | Jeu de données | `data:imagenet` |
| `tool` | Outil | `tool:python` |
| `status` | Marqueur d'état | `status:to_read` |

Format des balises : `^[a-z_]+:[a-zA-Z0-9/_.-]+$`, maximum 120 caractères.

## Onglet Vocabulaire

Dans la page Synthesis Workbench → Balises → Vocabulaire, vous pouvez :

- **Voir** : Toutes les balises canoniques définies, affichant l'état, la facette, les alias et le compteur d'utilisation
- **Ajouter** : Créer de nouvelles balises canoniques
- **Modifier** : Modifier les métadonnées des balises
- **Déprécier** : Marquer une balise comme dépréciée, en spécifiant éventuellement une balise de remplacement
- **Importer JSON** : Importer un vocabulaire de balises depuis un fichier JSON (supporte l'aperçu avant confirmation)
- **Exporter JSON** : Exporter le vocabulaire actuel vers un fichier JSON

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/tags.webp" alt="Synthesis Tags Page" title="Synthesis Tags Page" loading="lazy" /><figcaption>Synthesis Tags Page</figcaption></figure>

États des balises :
- `active` : Active
- `deprecated` : Dépréciée (a une balise de remplacement)
- `warning` : Avertissement (peut nécessiter une révision)

## Onglet Staged (balises en attente)

Le skill **tag-regulator** analyse automatiquement les métadonnées littéraires et génère des suggestions de balises contrôlées, affichées dans la page Staged.

### Flux de travail d'approbation

1. Consultez la liste des balises suggérées
2. Pour chaque balise, vous pouvez :
   - **Promouvoir** : Ajouter la balise au vocabulaire canonique
   - **Ignorer** : Rejeter la suggestion
   - **Vider Staged** : Ignorer toutes les suggestions en lot

### Format d'import/export

Le vocabulaire de balises supporte l'import/export au format JSON (format TagVocab), permettant :

- La migration des systèmes de balises entre bibliothèques
- Le partage en équipe des conventions de balisage
- La sauvegarde et le contrôle de version

## Workflow associé

La normalisation et l'inférence automatique des balises sont pilotées par le workflow [Tag Regulator](#doc/workflows%2Ftag-regulator). L'exécution de ce workflow peut automatiquement nettoyer et compléter les balises en fonction du vocabulaire contrôlé.
