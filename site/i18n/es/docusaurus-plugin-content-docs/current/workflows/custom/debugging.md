# Depuración y pruebas

Después de escribir un workflow personalizado, puede usar los siguientes métodos para validarlo y depurarlo.

## Activar modo de depuración

Active el modo de depuración en las preferencias para desbloquear herramientas de depuración adicionales y paneles de información:

Zotero → Settings → Zotero Agents → Enable Debug Mode

Cuando el modo de depuración está activado:

- Los workflows relacionados con depuración se muestran en el Dashboard
- Los registros de ejecución se vuelven más detallados
- Algunas herramientas de diagnóstico se vuelven disponibles

## Usar el kit de herramientas Debug Probe

El plugin incluye un kit de herramientas de depuración integrado llamado `workflow-debug-probe`, que contiene varios workflows de diagnóstico:

| Workflow | Propósito |
|----------|-----------|
| **Workflow Debug Probe** | Inspecionar estado pre-ejecución del workflow, abrir panel de diagnóstico |
| **Debug Sequence Linear Probe** | Validar ejecución secuencial y paso de handoff por defecto |
| **Debug Sequence Workspace Reuse Probe** | Validar reutilización de espacio de trabajo entre pasos |
| **Debug Sequence Context Isolation Probe** | Validar filtrado explícito de handoff y espacios de trabajo aislados |

Estos workflows son visibles en la lista de workflows del Dashboard (en modo depuración) y pueden ejecutarse directamente para validar los mecanismos de ejecución en secuencia.

## Visualización de registros

### Registros de ejecución

Los workflows generan registros de ejecución durante la ejecución, visibles en el Dashboard:

1. Abra el Dashboard
2. Busque una tarea en ejecución o completada
3. Haga clic en "View Logs" para expandir el panel de registros

### Escribir registros en Hooks

```js
export function applyResult({ parent, bundleReader, runtime }) {
  // Escribir en registro de ejecución
  runtime.hostApi.logging.appendRuntimeLog({
    level: "info",
    message: `Processing parent: ${parent}`,
    workflowId: runtime.workflowId,
  });

  // Para información de depuración compleja, puede usar console
  console.log("Debug:", { parent, workflowId: runtime.workflowId });
}
```

## Solución de problemas comunes

### Workflow no aparece en el Dashboard

1. Verifique que `workflow.json` esté colocado en el directorio correcto
2. Confirme que `workflow.json` tenga formato correcto (sintaxis JSON)
3. Verifique que `id` sea único y no entre en conflicto con workflows oficiales
4. Confirme que la ruta del script `applyResult` sea correcta
5. Revise el registro de errores del plugin (Zotero → Help → Troubleshooting → View Log File)

### filterInputs devuelve null

Si `filterInputs` devuelve `null`, significa que no se encontró ninguna selección que califique, y el workflow no se ejecutará. Verifique si la lógica de filtrado es correcta.

### Conflicto entre buildRequest y solicitud declarativa

El hook `buildRequest` y el campo `request` en `workflow.json` son **mutuamente excluyentes**. Si ambos existen, `buildRequest` tiene prioridad. Si el comportamiento de la solicitud no es el esperado, verifique si ambos fueron definidos inadvertidamente de forma simultánea.

### Fallo en ejecución de script Hook

- Confirme que el script Hook esté en formato `.mjs` (ES Module)
- Confirme que los nombres de función correctos se exporten: `filterInputs`, `buildRequest`, `applyResult`
- Confirme que la firma de función reciba correctamente parámetros como `{ parent, bundleReader, runtime }`
- Verifique si las rutas de importación relativa son correctas

### Resultado no se escribe en Zotero

Si `applyResult` usa `hostApi.mutations.execute()` pero no tiene efecto, las posibles causas son:

- Las operaciones de escritura requieren aprobación del usuario, pero el diálogo de aprobación fue ignorado o expiró
- Se intentó una operación de escritura cuando `execution.zoteroHostAccess.required` no estaba establecido en `true`
- `allowWriteApprovalBypass` necesita usarse en conjunto con la configuración de permisos del plugin

## Sugerencias de desarrollo

### Comience con simplicidad

1. Primero use el provider `pass-through` con un `applyResult` mínimo para verificar que el workflow se carga exitosamente
2. Gradualmente agregue `filterInputs` y `buildRequest`
3. Finalmente conéctese al backend real

### Use notifications.toast para retroalimentación rápida

```js
hostApi.notifications.toast({
  text: `filterInputs received ${selectionContext.items.parents.length} parent items`,
  type: "default",
});
```

Esta es una técnica de depuración rápida que le permite ver los resultados de ejecución sin revisar los registros.

### Consulte los workflows oficiales

Los workflows oficiales son la mejor referencia de aprendizaje. Después de instalar el paquete oficial, puede ver el código fuente en el directorio `<Zotero Data>/zotero-agents/content/official/workflows/`:

- `literature-workbench-package/literature-analysis/` — Ejemplo completo de skillrunner.job.v1
- `content/official/workflows/literature-workbench-package/export-notes/` — Ejemplo simple de pass-through
- `content/official/workflows/mineru/` — Ejemplo con buildRequest + manejo de archivos
- `content/official/workflows/literature-workbench-package/literature-search-ingest/` — Ejemplo de modo interactivo

## Próximos pasos

- [Referencia completa del manifiesto de Workflow](manifest) — Todos los campos en workflow.json
- [Referencia de Host API](host-api) — Todas las APIs disponibles en hooks
