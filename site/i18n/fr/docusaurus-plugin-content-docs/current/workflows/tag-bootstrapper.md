# Tag Bootstrapper

## Objectif

Créer interactivement un vocabulaire de balises contrôlé pour un domaine de recherche avec l'IA. Recommandé d'exécuter avant votre première [Literature Analysis](literature-analysis) pour établir une base pour la régulation automatique ultérieure des balises.

## Cas d'Usage

- Démarrer une nouvelle direction de recherche et avoir besoin d'établir un système de balises
- Aucun vocabulaire de balises contrôlé n'existe encore dans la bibliothèque Zotero actuelle
- Souhaiter que l'IA aide à concevoir une classification de balises spécifique au domaine

## Contraintes d'Entrée

| Type de Contrainte | Description |
|---------|------|
| Unité d'Entrée | workflow (aucune notice n'a besoin d'être sélectionnée) |
| Méthode de Déclenchement | Exécuter depuis le Tableau de Bord |

## Flux d'Exécution

```
1. Démarrer l'Interaction
   └── Converser avec l'IA dans le Tableau de Bord

2. Définir le Domaine
   └── Décrire votre domaine de recherche et vos zones d'intérêt
       └── L'IA propose un système de classification de balises

3. Raffinement Itératif
   └── Examiner les balises suggérées par l'IA
       └── Ajuster, ajouter, supprimer, renommer

4. Confirmer et Écrire
   └── Écrire le vocabulaire de balises final dans le système Synthesis
```

### Détails de l'Interaction

- Le workflow s'exécute en mode **interactif**, en conversant avec l'IA dans le Tableau de Bord
- Vous pouvez ajuster la direction à tout moment pendant la conversation

## Durée Estimée

| Scénario | Durée Estimée |
|------|---------|
| Création du vocabulaire initial | 3-8 minutes |
| Ajout de balises | 3-5 minutes |

## Recommandation de Modèle

🟢 Un modèle de capacité moyenne est suffisant ; le modèle le plus puissant n'est pas nécessaire.

## Sorties

Une fois l'exécution terminée, le vocabulaire de balises contrôlé est écrit dans le système Synthesis et peut être consulté et géré sur la page Balises du Synthesis Workbench.

## Paramètres

| Paramètre | Type | Description | Défaut |
|------|------|------|--------|
| `tag_note_language` | string | Langue des notes de balises | `zh-CN` |

Valeurs disponibles : `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. Une saisie personnalisée est également prise en charge.

## Dépendances

- **Backend** : Service Skill-Runner
- **Configuration du Backend** : Configurer un backend de type Skill-Runner dans le Gestionnaire de Backends
- **Compétence** : La compétence `tag-bootstrapper` doit être déployée sur le Skill-Runner

## Workflows Associés

- [Literature Analysis](literature-analysis) — Peut enchaîner automatiquement la régulation de balises pendant l'analyse
- [Tag Regulator](tag-regulator) — Exécuter la régulation de balises sur la littérature existante
