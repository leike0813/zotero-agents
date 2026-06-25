# Débogage et tests

Après avoir écrit un workflow personnalisé, vous pouvez utiliser les méthodes suivantes pour le valider et le déboguer.

## Activer le mode débogage

Activez le mode débogage dans les préférences pour débloquer des outils de débogage et des affichages d'informations supplémentaires :

Zotero → Paramètres → Zotero Agents → Activer le mode débogage

Lorsque le mode débogage est activé :

- Les workflows liés au débogage sont affichés dans le tableau de bord
- Les journaux d'exécution deviennent plus détaillés
- Certains outils de diagnostic deviennent disponibles

## Utilisation du kit de sonde de débogage

Le plugin inclut un kit de débogage intégré `workflow-debug-probe`, contenant plusieurs workflows de diagnostic :

| Workflow | Objectif |
|----------|---------|
| **Workflow Debug Probe** | Inspecter l'état pré-exécution du workflow, ouvrir le panneau de diagnostic |
| **Debug Sequence Linear Probe** | Valider l'exécution séquentielle et le passage de handoff par défaut |
| **Debug Sequence Workspace Reuse Probe** | Valider la réutilisation d'espace de travail entre les étapes |
| **Debug Sequence Context Isolation Probe** | Valider le filtrage explicite de handoff et les espaces de travail isolés |

Ces workflows sont visibles dans la liste des workflows du tableau de bord (en mode débogage) et peuvent être exécutés directement pour valider les mécanismes d'exécution en séquence.

## Consultation des journaux

### Journaux d'exécution

Les workflows génèrent des journaux d'exécution pendant leur exécution, consultables dans le tableau de bord :

1. Ouvrez le tableau de bord
2. Trouvez une tâche en cours d'exécution ou terminée
3. Cliquez sur « Voir les journaux » pour déployer le panneau des journaux

### Écriture de journaux dans les hooks

```js
export function applyResult({ parent, bundleReader, runtime }) {
  // Écrire dans le journal d'exécution
  runtime.hostApi.logging.appendRuntimeLog({
    level: "info",
    message: `Traitement de la notice parente : ${parent}`,
    workflowId: runtime.workflowId,
  });

  // Pour des informations de débogage complexes, vous pouvez utiliser console
  console.log("Debug:", { parent, workflowId: runtime.workflowId });
}
```

## Résolution des problèmes courants

### Le workflow n'apparaît pas dans le tableau de bord

1. Vérifiez si `workflow.json` est placé dans le bon répertoire
2. Confirmez que `workflow.json` est correctement formaté (syntaxe JSON)
3. Vérifiez que `id` est unique et n'entre pas en conflit avec les workflows officiels
4. Confirmez que le chemin du script `applyResult` est correct
5. Consultez le journal d'erreurs du plugin (Zotero → Aide → Dépannage → Voir le fichier journal)

### filterInputs retourne null

Si `filterInputs` retourne `null`, cela signifie qu'aucune sélection éligible n'a été trouvée, et le workflow ne s'exécutera pas. Vérifiez si la logique de filtrage est correcte.

### Conflit entre buildRequest et la requête déclarative

Le hook `buildRequest` et le champ `request` dans `workflow.json` sont **mutuellement exclusifs**. Si les deux existent, `buildRequest` est prioritaire. Si le comportement de la requête n'est pas conforme aux attentes, vérifiez si les deux ont été définis simultanément par inadvertance.

### Échec d'exécution d'un script Hook

- Confirmez que le script Hook est au format `.mjs` (ES Module)
- Confirmez que les noms de fonctions corrects sont exportés : `filterInputs`, `buildRequest`, `applyResult`
- Confirmez que la signature de la fonction reçoit correctement des paramètres comme `{ parent, bundleReader, runtime }`
- Vérifiez si les chemins d'importation relatifs sont corrects

### Le résultat n'est pas écrit dans Zotero

Si `applyResult` utilise `hostApi.mutations.execute()` mais que cela ne prend pas effet, causes possibles :

- Les opérations d'écriture nécessitent l'approbation de l'utilisateur, mais la fenêtre d'approbation a été ignorée ou a expiré
- Tentative d'opération d'écriture alors que `execution.zoteroHostAccess.required` n'était pas défini à `true`
- `allowWriteApprovalBypass` doit être utilisé conjointement avec la configuration des permissions du plugin

## Suggestions de développement

### Commencer simplement

1. Utilisez d'abord le provider `pass-through` avec un `applyResult` minimal pour vérifier que le workflow se charge correctement
2. Ajoutez progressivement `filterInputs` et `buildRequest`
3. Connectez-vous enfin au backend réel

### Utiliser notifications.toast pour un retour rapide

```js
hostApi.notifications.toast({
  text: `filterInputs a reçu ${selectionContext.items.parents.length} notices parentes`,
  type: "default",
});
```

C'est une technique de débogage rapide qui vous permet de voir les résultats d'exécution sans consulter les journaux.

### Consulter les workflows officiels

Les workflows officiels sont la meilleure référence d'apprentissage. Après avoir installé le package officiel, vous pouvez consulter le code source dans le répertoire `<Zotero Data>/zotero-agents/content/official/workflows/` :

- `literature-workbench-package/literature-analysis/` — Exemple complet de skillrunner.job.v1
- `content/official/workflows/literature-workbench-package/export-notes/` — Exemple simple pass-through
- `content/official/workflows/mineru/` — Exemple avec buildRequest + gestion de fichiers
- `content/official/workflows/literature-workbench-package/literature-search-ingest/` — Exemple en mode interactif

## Prochaines étapes

- [Référence complète du manifeste de workflow](manifest) — Tous les champs de workflow.json
- [Référence de l'API hôte](host-api) — Toutes les API disponibles dans les hooks
