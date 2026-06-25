# Gestión de etiquetas

## ¿Qué es el vocabulario de etiquetas?

El vocabulario de etiquetas es un sistema de etiquetado estandarizado utilizado para la anotación coherente de literatura. A diferencia de las etiquetas de forma libre nativas de Zotero, las etiquetas en un vocabulario controlado siguen convenciones de nomenclatura unificadas, lo que facilita las estadísticas y la recuperación.

## Facetas

Cada etiqueta pertenece a una faceta (dimensión). Actualmente se admiten las siguientes facetas:

| Faceta | Descripción | Ejemplo |
|--------|-------------|---------|
| `field` | Campo de investigación | `field:natural_language_processing` |
| `topic` | Tema de investigación | `topic:transformer_architecture` |
| `method` | Método de investigación | `method:reinforcement_learning` |
| `model` | Modelo utilizado | `model:gpt-4` |
| `ai_task` | Tipo de tarea de IA | `ai_task:text_summarization` |
| `data` | Conjunto de datos | `data:imagenet` |
| `tool` | Herramienta | `tool:python` |
| `status` | Marcador de estado | `status:to_read` |

Formato de etiqueta: `^[a-z_]+:[a-zA-Z0-9/_.-]+$`, máximo 120 caracteres.

## Pestaña Vocabulary

En la página Synthesis Workbench → Tags → Vocabulary, puedes:

- **View**: Todas las etiquetas canónicas definidas, mostrando estado, faceta, alias y recuento de uso
- **Add**: Crear nuevas etiquetas canónicas
- **Edit**: Modificar metadatos de etiquetas
- **Deprecate**: Marcar una etiqueta como obsoleta, especificando opcionalmente una etiqueta de reemplazo
- **Import JSON**: Importar un vocabulario de etiquetas desde un archivo JSON (admite vista previa antes de confirmar)
- **Export JSON**: Exportar el vocabulario actual a un archivo JSON

![Página de etiquetas de Synthesis](/img/docs/synthesis/tags.png)

Estados de etiqueta:
- `active`: Activa
- `deprecated`: Obsoleta (tiene una etiqueta de reemplazo)
- `warning`: Advertencia (puede necesitar revisión)

## Pestaña Staged (etiquetas pendientes)

El skill **tag-regulator** analiza automáticamente los metadatos de la literatura y genera sugerencias de etiquetas controladas, mostradas en la página Staged.

### Flujo de aprobación

1. Revisar la lista de etiquetas sugeridas
2. Para cada etiqueta, puedes:
   - **Promote**: Añadir la etiqueta al vocabulario canónico
   - **Discard**: Rechazar la sugerencia
   - **Clear Staged**: Descartar todas las sugerencias en lote

### Formato de importación/exportación

El vocabulario de etiquetas admite importación/exportación en formato JSON (formato TagVocab), lo que permite:

- Migración de sistemas de etiquetas entre bibliotecas
- Compartir convenciones de etiquetas en equipo
- Respaldo y control de versiones

## Workflow relacionado

La estandarización de etiquetas y la inferencia automática son impulsadas por el workflow [Tag Regulator](../workflows/tag-regulator). Ejecutar este workflow puede limpiar y complementar automáticamente las etiquetas basándose en el vocabulario controlado.
