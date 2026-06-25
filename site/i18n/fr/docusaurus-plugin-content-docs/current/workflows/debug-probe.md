# Debug Probe

## Objectif

Le package debug probe est principalement utilisé pour les tests de développement du système de Workflow et le diagnostic de problèmes. Il contient plusieurs workflows en mode debug uniquement couvrant le contrat `applyResult`, l'Orchestration de Séquence, l'exécution interactive et les scénarios de connectivité Host Bridge.

Tous les workflows de debug sont marqués avec `debug_only: true` et ne sont visibles qu'en mode debug.

## Workflows de Debug Inclus

### Débogage du Contrat Apply

Vérifier diverses combinaisons d'invocation des hooks `buildRequest` / `applyResult` :

| Workflow | Description |
|---------|------|
| Debug: Apply Single Result | Travail unique + méthode de récupération de résultat |
| Debug: Apply Single Bundle | Travail unique + méthode de récupération de bundle |
| Debug: Apply Sequence Result | Séquence multi-étapes + récupération de résultat |
| Debug: Apply Sequence Bundle | Séquence multi-étapes + récupération de bundle |
| Debug: Apply Bundle Then Result | Invocation combinée bundle puis résultat |
| Debug: Apply Result Then Bundle | Invocation combinée résultat puis bundle |

### Débogage de Séquence

Vérifier le mécanisme de coordination multi-étapes de l'Orchestration de Séquence :

| Workflow | Description |
|---------|------|
| Debug Sequence Linear Probe | Vérifier l'exécution série et le transfert de relais par défaut (pass_through) |
| Debug Sequence Workspace Reuse Probe | Vérifier la réutilisation de l'espace de travail inter-étapes (workspace: reuse-workflow) |
| Debug Sequence Context Isolation Probe | Vérifier le filtrage explicite du relais et l'espace de travail isolé (workspace: new + mappage sélectif du transfert) |

### Débogage Interactif

Vérifier les workflows interactifs nécessitant des réponses utilisateur :

| Workflow | Description |
|---------|------|
| Debug: Interactive Choice Probe | Vérifier le flux de choix interactif |
| Debug: Interactive Then Result | Exécution interactive suivie de la récupération de résultat |

### Débogage Host Bridge

| Workflow | Description |
|---------|------|
| Debug: Host Bridge Connectivity Probe | Vérifier la connectivité et les permissions de Host Bridge |

### Général

| Workflow | Description |
|---------|------|
| Workflow Debug Probe | Vérifier l'état pré-exécution du Workflow et ouvrir le panneau de diagnostic |

## Quand les Utiliser

- Vérifier le comportement après avoir développé ou modifié le système de Workflow
- Résoudre les problèmes d'exécution anormale de Workflow
- Vérifier le mécanisme de relais de l'Orchestration de Séquence
- Vérifier si le contrat du hook `applyResult` répond aux attentes
- Vérifier la connectivité et la configuration des permissions de Host Bridge

## Dépendances

- **Backend** : Service Skill-Runner
- Tous marqués comme `debug_only`, n'apparaissent qu'en mode debug

## Prochaines Étapes

- [Débogage et Tests](custom/debugging) — Méthodes de débogage pour les Workflows personnalisés
- [Système de Hooks](custom/hooks) — Signatures API des hooks et utilisation
