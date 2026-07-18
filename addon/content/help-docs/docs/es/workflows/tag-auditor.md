# Tag Auditor

## Propósito

Escanear todos los elementos regulares de nivel superior en la biblioteca Zotero contra el vocabulario de etiquetas controlado e informar el cumplimiento de etiquetas por elemento. Los resultados se escriben en el panel de auditoría de etiquetas de Synthesis Workbench para su revisión y posterior regulación.

## Entradas

No se requieren parámetros ni selección de elementos Zotero. El flujo de trabajo opera en toda la biblioteca.

## Comportamiento

1. Cargar el vocabulario de etiquetas controlado desde Synthesis a través de `exportTagVocabularyForRegulator`.
2. Recorrer por páginas todos los elementos regulares de nivel superior en la biblioteca (excluyendo elementos secundarios, notas, adjuntos y elementos eliminados).
3. Para cada elemento, recopilar sus etiquetas actuales y evaluar el cumplimiento: una etiqueta es no conforme si no está presente en el vocabulario controlado.
4. Agrupar las entradas de auditoría por ID de biblioteca y escribirlas en Synthesis a través de `replaceTagAuditRecords`.

El flujo de trabajo es completamente automático y no modifica ningún elemento ni etiqueta de Zotero. Es un escaneo de solo lectura que produce registros de auditoría para el panel de Etiquetas.

## Resultado y aplicación

El panel de auditoría de Etiquetas de Synthesis Workbench muestra registros de auditoría por elemento, cada uno conteniendo:

| Campo | Descripción |
|-------|-------------|
| `itemKey` | La clave del elemento Zotero |
| `compliant` | Si todas las etiquetas del elemento están en el vocabulario controlado |
| `nonCompliantTags` | Lista de etiquetas no encontradas en el vocabulario controlado |

El resultado de la ejecución resume el número de elementos auditados y elementos que necesitan regulación de etiquetas por biblioteca. Ejecutar el flujo de trabajo nuevamente reemplaza los registros de auditoría anteriores (idempotente dentro del mismo estado de vocabulario).

Un prerequisito es que un vocabulario de etiquetas controlado debe estar ya definido en la página de Etiquetas de Synthesis Workbench.

## Dependencias

- No se requiere conexión al backend
- **Vocabulario controlado**: Un vocabulario de etiquetas controlado debe definirse primero; consulte [Gestión de etiquetas](#doc/synthesis%2Ftags)

## Flujos de trabajo relacionados

- [Tag Regulator](#doc/workflows%2Ftag-regulator) — Normalizar etiquetas según el vocabulario controlado e inferir nuevas etiquetas
- [Tag Bootstrapper](#doc/workflows%2Ftag-bootstrapper) — Crear interactivamente un vocabulario de etiquetas controlado
