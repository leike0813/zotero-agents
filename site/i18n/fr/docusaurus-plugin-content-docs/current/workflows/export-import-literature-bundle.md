# Export/Import Literature Bundle

## Objectif

Exporter et importer des bundles ZIP portables de notices parentes Zotero avec leurs métadonnées, balises, notes enfants, pièces jointes, images intégrées et relations inter-notices, facilitant la migration entre instances Zotero ou la collaboration avec d'autres chercheurs.

## Export Literature Bundle

### Cas d'utilisation

- Sauvegarder les notices Zotero sélectionnées en tant que ZIP autonome
- Partager de la littérature avec des collaborateurs utilisant une bibliothèque Zotero différente
- Transférer des notices vers une autre instance Zotero pour import ultérieur

### Contraintes d'entrée

| Type de contrainte | Description |
|---------|------|
| Unité d'entrée | Notice parente |
| Sélection | Une ou plusieurs notices parentes ; les pièces jointes, notes et éléments enfants ne peuvent pas être mélangés |
| Sortie | L'utilisateur sélectionne l'emplacement de sauvegarde ZIP ; l'extension `.zip` est ajoutée automatiquement si manquante |

### Comportement

1. Valider que toutes les notices sélectionnées sont des notices parentes (aucune pièce jointe, note ou élément enfant autorisé).
2. Collecter les métadonnées bibliographiques, balises, notes enfants avec images intégrées, pièces jointes locales lisibles et pièces jointes URL de lien pour chaque notice parente.
3. Pour les pièces jointes Markdown, réécrire les références d'images locales en chemins relatifs au bundle et inclure les images référencées.
4. Enregistrer les relations inter-notices uniquement entre les notices parentes exportées dans le même lot.
5. Écrire `manifest.json` avec la version de format, l'inventaire des fichiers, les données d'intégrité et tout avertissement d'exportation.
6. Empaqueter le tout dans un fichier ZIP à l'emplacement choisi par l'utilisateur.

Les fichiers locaux manquants sont ignorés avec un avertissement ; les images distantes dans Markdown sont conservées telles quelles (non téléchargées). L'annulation de la boîte de dialogue de sauvegarde annule l'exportation.

### Sorties

| Artefact | Description |
|----------|-------------|
| `manifest.json` | Version de format, inventaire des fichiers, informations d'intégrité, avertissements d'exportation, relations inter-notices |
| Métadonnées de la notice parente | Informations bibliographiques portables et balises par notice parente |
| Notes enfants | Notes avec images intégrées |
| Pièces jointes | Pièces jointes locales lisibles ; pièces jointes Markdown avec images locales accompagnatrices |
| Pièces jointes URL de lien | Informations de lien |

## Import Literature Bundle

### Cas d'utilisation

- Restaurer un bundle littéraire précédemment exporté dans la bibliothèque Zotero actuelle
- Importer de la littérature partagée par un collaborateur

### Contraintes d'entrée

| Type de contrainte | Description |
|---------|------|
| Unité d'entrée | Workflow (aucune sélection d'élément Zotero requise) |
| Méthode d'import | Sélectionner un fichier ZIP produit par Export Literature Bundle |
| Contexte de collection | Si une collection réelle est sélectionnée dans la vue actuelle, les nouvelles notices y sont ajoutées ; sinon les notices sont importées à la racine de la bibliothèque |

### Comportement

1. Valider le bundle : type, version, chemins d'archive, inventaire des fichiers, taille et intégrité. L'échec de validation annule sans modifier la bibliothèque.
2. Pour chaque notice parente dans le bundle, créer un nouveau graphe d'éléments Zotero : métadonnées bibliographiques, balises, pièces jointes, notes, images intégrées et pièces jointes URL de lien.
3. Restaurer les relations inter-notices entre les notices parentes importées avec succès du même bundle.
4. Si une seule notice parente échoue à l'import, nettoyer cette notice et ses enfants nouvellement créés, puis continuer avec les notices restantes.

L'import ne réutilise jamais les IDs ou clés d'éléments Zotero originaux, ne déduplique jamais, ne fusionne ni n'écrase les notices existantes. Réimporter le même bundle produit des copies indépendantes.

### Sorties

Nouvelles notices parentes Zotero avec leurs graphes d'éléments complets. Les fichiers manquants, les échecs de nettoyage ou les échecs de restauration de relations sont signalés comme des avertissements ; le résultat peut être partiellement terminé.

## Durée estimée

Dépend du nombre de notices, des tailles de pièces jointes et de la vitesse du disque local. Les métadonnées pures ou petites notes se terminent rapidement ; les grands PDF ou nombreuses images augmentent proportionnellement la durée.

## Dépendances

- Aucune connexion backend requise
- S'appuie uniquement sur le stockage local Zotero et les permissions d'accès aux fichiers

## Workflows connexes

- [Export/Import Notes](export-import-notes) — Exporter ou importer uniquement des notes d'analyse
- [Export Research Bundle](export-research-bundle) — Assembler un bundle de recherche en lecture seule pour un projet de papier (objectif différent)
