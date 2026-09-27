# Débogage et Tests

Après avoir écrit un workflow personnalisé, vous pouvez utiliser les méthodes suivantes pour le valider et le déboguer.

## Activer le Mode Débogage

Activez le mode débogage dans les préférences pour débloquer des outils de débogage supplémentaires et des affichages d'informations :

Zotero → Paramètres → Zotero Agents → Activer le Mode Débogage

Lorsque le mode débogage est activé :

- Les workflows liés au débogage sont affichés dans le Tableau de Bord
- Les journaux d'exécution deviennent plus détaillés
- Certains outils de diagnostic deviennent disponibles

## Utilisation de la Boîte à Outils Debug Probe

Le plugin inclut une boîte à outils de débogage intégrée `workflow-debug-probe`, contenant plusieurs workflows de diagnostic :

| Workflow | Objectif |
|----------|----------|
| **Workflow Debug Probe** | Inspecter l'état de pré-exécution du workflow, ouvrir le panneau de diagnostic |
| **Debug Sequence Linear Probe** | Valider l'exécution séquentielle et le passage de handoff par défaut |
| **Debug Sequence Workspace Reuse Probe** | Valider la réutilisation du workspace entre les étapes |
| **Debug Sequence Context Isolation Probe** | Valider le filtrage explicite de handoff et les workspaces isolés |

Ces workflows sont visibles dans la liste des workflows du Tableau de Bord (en mode débogage) et peuvent être exécutés directement pour valider les mécanismes d'exécution de séquence.

## Consultation des Journaux

### Journaux d'Exécution

Les workflows génèrent des journaux d'exécution pendant l'exécution, consultables dans le Tableau de Bord :

1. Ouvrez le Tableau de Bord
2. Trouvez une tâche en cours ou terminée
3. Cliquez sur "View Logs" pour développer le panneau de journaux

### Écrire des Journaux dans les Hooks

```js
export function applyResult({ parent, bundleReader, runtime }) {
  // Écrire dans le journal d'exécution
  runtime.hostApi.logging.appendRuntimeLog({
    level: "info",
    message: `Traitement du parent : ${parent}`,
    workflowId: runtime.workflowId,
  });

  // Pour des informations de débogage complexes, vous pouvez utiliser console
  console.log("Debug:", { parent, workflowId: runtime.workflowId });
}
```

## Dépannage des Problèmes Courants

### Le Workflow N'apparaît Pas dans le Tableau de Bord

1. Vérifiez que `workflow.json` est placé dans le bon répertoire
2. Confirmez que `workflow.json` est correctement formaté (syntaxe JSON)
3. Vérifiez que `id` est unique et n'entre pas en conflit avec les workflows officiels
4. Confirmez que le chemin du script `applyResult` est correct
5. Consultez le journal d'erreurs du plugin (Zotero → Aide → Dépannage → Voir le fichier journal)

### La Validation de Sélection Ignore Chaque Unité

Si la `validateSelection` déclarative ou `preflight` ignore chaque unité d'entrée, le workflow ne soumettra aucune requête au fournisseur. Vérifiez la politique de sélection, les règles d'exclusion et tout résultat de `preflight` qui renvoie `kind: "skip"`.

### Conflit Entre buildRequest et la Requête Déclarative

Le hook `buildRequest` et le champ `request` dans `workflow.json` sont **mutuellement exclusifs**. Si les deux existent, `buildRequest` a la priorité. Si le comportement de la requête n'est pas celui attendu, vérifiez si les deux ont été définis simultanément par inadvertance.

### Échec d'Exécution du Script Hook

- Confirmez que le script Hook est au format `.mjs` (ES Module)
- Confirmez que les noms de fonction corrects sont exportés : `preflight`, `buildRequest`, `normalizeSettings` ou `applyResult`
- Confirmez que la signature de la fonction reçoit correctement les paramètres comme `{ parent, bundleReader, runtime }`
- Vérifiez que les chemins d'importation relatifs sont corrects

### Le Résultat N'est Pas Écrit dans Zotero

Si `applyResult` utilise `hostApi.mutations.execute()` mais que cela ne prend pas effet, causes possibles :

- Les opérations d'écriture nécessitent l'approbation de l'utilisateur, mais la fenêtre d'approbation a été ignorée ou a expiré
- Une opération d'écriture a été tentée alors que `execution.zoteroHostAccess.required` n'était pas défini sur `true`
- `allowWriteApprovalBypass` doit être utilisé en conjonction avec la configuration des permissions du plugin

## Suggestions de Développement

### Commencez Simplement

1. Utilisez d'abord le fournisseur `pass-through` avec un `applyResult` minimal pour vérifier que le workflow se charge correctement
2. Ajoutez d'abord `validateSelection`, puis ajoutez `preflight` ou `buildRequest` uniquement lorsque nécessaire
3. Connectez-vous enfin au backend réel

### Utilisez notifications.toast pour un Retour Rapide

```js
hostApi.notifications.toast({
  text: `buildRequest a reçu ${selectionContext.items.filter((item) => item.kind === "parent").length} éléments parents`,
  type: "default",
});
```

C'est une technique de débogage rapide qui vous permet de voir les résultats d'exécution sans vérifier les journaux.

### Référencez les Workflows Officiels

Les workflows officiels sont la meilleure référence d'apprentissage. Après avoir installé le package officiel, vous pouvez consulter le code source dans le répertoire `<Zotero Data>/zotero-agents/content/official/workflows/` :

- `literature-workbench-package/literature-analysis/` — Exemple complet de skillrunner.job.v1
- `content/official/workflows/literature-workbench-package/export-notes/` — Exemple simple de pass-through
- `content/official/workflows/mineru/` — Exemple avec buildRequest + gestion de fichiers
- `content/official/workflows/literature-workbench-package/literature-search-ingest/` — Exemple de mode interactif

## Prochaines Étapes

- [Référence Complète du Manifeste de Workflow](#doc/workflows%2Fcustom%2Fmanifest) — Tous les champs dans workflow.json
- [Référence de l'API Hôte](#doc/workflows%2Fcustom%2Fhost-api) — Toutes les API disponibles dans les hooks
