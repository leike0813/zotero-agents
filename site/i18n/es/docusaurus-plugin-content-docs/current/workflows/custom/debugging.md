# Depuración y Pruebas

Después de escribir un workflow personalizado, puede usar los siguientes métodos para validarlo y depurarlo.

## Activar el Modo de Depuración

Active el modo de depuración en las preferencias para desbloquear herramientas de depuración adicionales y pantallas de información:

Zotero → Configuración → Zotero Agents → Activar Modo de Depuración

Cuando el modo de depuración está activado:

- Los workflows relacionados con la depuración se muestran en el Panel
- Los registros de tiempo de ejecución se vuelven más detallados
- Algunas herramientas de diagnóstico están disponibles

## Uso del Kit de Herramientas Debug Probe

El plugin incluye un kit de herramientas de depuración integrado `workflow-debug-probe`, que contiene varios workflows de diagnóstico:

| Workflow | Propósito |
|----------|-----------|
| **Workflow Debug Probe** | Inspeccionar el estado previo a la ejecución del workflow, abrir el panel de diagnóstico |
| **Debug Sequence Linear Probe** | Validar la ejecución secuencial y el paso de handoff predeterminado |
| **Debug Sequence Workspace Reuse Probe** | Validar la reutilización del workspace entre pasos |
| **Debug Sequence Context Isolation Probe** | Validar el filtrado explícito de handoff y workspaces aislados |

Estos workflows son visibles en la lista de workflows del Panel (en modo de depuración) y se pueden ejecutar directamente para validar los mecanismos de ejecución de secuencias.

## Visualización de Registros

### Registros de Tiempo de Ejecución

Los workflows generan registros de tiempo de ejecución durante la ejecución, visibles en el Panel:

1. Abra el Panel
2. Encuentre una tarea en ejecución o completada
3. Haga clic en "View Logs" para expandir el panel de registros

### Escribir Registros en Hooks

```js
export function applyResult({ parent, bundleReader, runtime }) {
  // Escribir en el registro de tiempo de ejecución
  runtime.hostApi.logging.appendRuntimeLog({
    level: "info",
    message: `Procesando parent: ${parent}`,
    workflowId: runtime.workflowId,
  });

  // Para información de depuración compleja, puede usar console
  console.log("Debug:", { parent, workflowId: runtime.workflowId });
}
```

## Solución de Problemas Comunes

### El Workflow No Aparece en el Panel

1. Verifique que `workflow.json` esté ubicado en el directorio correcto
2. Confirme que `workflow.json` tenga el formato correcto (sintaxis JSON)
3. Verifique que `id` sea único y no entre en conflicto con workflows oficiales
4. Confirme que la ruta del script `applyResult` sea correcta
5. Revise el registro de errores del plugin (Zotero → Ayuda → Solución de problemas → Ver archivo de registro)

### La Validación de Selección Omite Cada Unidad

Si la `validateSelection` declarativa o `preflight` omite cada unidad de entrada, el workflow no enviará ninguna solicitud al proveedor. Verifique la política de selección, las reglas de exclusión y cualquier resultado de `preflight` que devuelva `kind: "skip"`.

### Conflicto Entre buildRequest y la Solicitud Declarativa

El hook `buildRequest` y el campo `request` en `workflow.json` son **mutuamente excluyentes**. Si ambos existen, `buildRequest` tiene prioridad. Si el comportamiento de la solicitud no es el esperado, verifique si ambos fueron definidos inadvertidamente al mismo tiempo.

### Fallo en la Ejecución del Script Hook

- Confirme que el script Hook esté en formato `.mjs` (ES Module)
- Confirme que se exporten los nombres de función correctos: `preflight`, `buildRequest`, `normalizeSettings` o `applyResult`
- Confirme que la firma de la función reciba correctamente parámetros como `{ parent, bundleReader, runtime }`
- Verifique que las rutas de importación relativas sean correctas

### El Resultado No Se Escribe en Zotero

Si `applyResult` usa `hostApi.mutations.execute()` pero no tiene efecto, posibles causas:

- Las operaciones de escritura requieren aprobación del usuario, pero la ventana de aprobación fue ignorada o expiró
- Se intentó una operación de escritura cuando `execution.zoteroHostAccess.required` no estaba establecido en `true`
- `allowWriteApprovalBypass` debe usarse junto con la configuración de permisos del plugin

## Sugerencias de Desarrollo

### Comience de Forma Simple

1. Primero use el proveedor `pass-through` con un `applyResult` mínimo para verificar que el workflow se cargue correctamente
2. Agregue primero `validateSelection`, luego agregue `preflight` o `buildRequest` solo cuando sea necesario
3. Finalmente conéctese al backend real

### Use notifications.toast para Retroalimentación Rápida

```js
hostApi.notifications.toast({
  text: `buildRequest recibió ${selectionContext.items.parents.length} elementos principales`,
  type: "default",
});
```

Esta es una técnica de depuración rápida que le permite ver los resultados de ejecución sin revisar los registros.

### Consulte los Workflows Oficiales

Los workflows oficiales son la mejor referencia de aprendizaje. Después de instalar el paquete oficial, puede ver el código fuente en el directorio `<Zotero Data>/zotero-agents/content/official/workflows/`:

- `literature-workbench-package/literature-analysis/` — Ejemplo completo de skillrunner.job.v1
- `content/official/workflows/literature-workbench-package/export-notes/` — Ejemplo simple de pass-through
- `content/official/workflows/mineru/` — Ejemplo con buildRequest + manejo de archivos
- `content/official/workflows/literature-workbench-package/literature-search-ingest/` — Ejemplo de modo interactivo

## Próximos Pasos

- [Referencia Completa del Manifiesto de Workflow](manifest) — Todos los campos en workflow.json
- [Referencia de la API del Host](host-api) — Todas las API disponibles en los hooks
