# Literature Metadata Curator

## Propósito

Consultar, corregir y completar metadatos bibliográficos para un elemento principal de Zotero seleccionado. El flujo de trabajo maneja casos como inconsistencias en el formato del título, autores faltantes, campos incompletos de revista/volumen/página, entradas DOI/ISBN incompletas y tipos de elemento configurados incorrectamente.

## Entradas

| Parámetro | Requerido | Descripción |
| --- | --- | --- |

No hay parámetros configurables por el usuario. Seleccione exactamente un elemento principal en la lista de elementos de Zotero. No se aceptan adjuntos ni múltiples elementos.

## Comportamiento

El flujo de trabajo se ejecuta completamente automáticamente sin confirmación del usuario. Sigue dos caminos:

1. **Camino rápido local**: Si el elemento tiene un DOI, ISBN o una URL que se resuelve determinísticamente a un identificador DOI, arXiv o PubMed, el flujo de trabajo llama a `runtime.hostApi.metadata.translateIdentifier` (una fachada controlada de solo lectura Zotero `Translate.Search`). Cuando el identificador candidato coincide y contiene información bibliográfica valiosa, los resultados se escriben directamente.
2. **Fallback a Skill-Runner**: Si no existe un identificador confiable, la búsqueda local no devuelve resultados, el traductor falla, el candidato no es confiable o el identificador no coincide, el flujo de trabajo ejecuta el skill `literature-metadata-search` para una recuperación de metadatos basada en web ligera.

Ambos caminos comparten el mismo formato de resultado canónico y el mismo manejador de aplicación.

### Reglas de escritura

El flujo de trabajo actualiza los campos bibliográficos del elemento principal:

- Título, DOI, ISBN, ISSN, URL, resumen, fecha, idioma, catálogo de biblioteca
- Campos de revista/conferencia/libro/tesis/informe (nombre de revista, volumen/número/páginas, editor, nombre de conferencia, escuela, tipo de informe, etc.)
- Creadores (autores, autores institucionales, etc.)
- `itemType` cuando se soporta con evidencia de alta confianza (por ejemplo, artículo de revista corregido a tesis)

El flujo de trabajo **no** modifica adjuntos, notas, etiquetas, colecciones, elementos relacionados, archivos PDF ni instantáneas web.

Sin un identificador estable, el flujo de trabajo solo sobrescribe un título existente o cambia el tipo de elemento cuando: el candidato puede probarse que es la misma obra directa, al menos dos señales bibliográficas independientes coinciden y una página de destino autorizada lo corrobora. Los títulos de contenedor se escriben en el campo de contenedor apropiado en lugar de reemplazar el título de la obra. Los resultados de baja confianza, candidatos conflictivos o resultados solo sospechosos se omiten.

## Resultado y aplicación

Los cambios de metadatos se aplican directamente al elemento principal de Zotero seleccionado. No se requiere un paso intermedio de confirmación.

## Recomendación de modelo

- **Camino rápido exitoso** (DOI/ISBN/identificador URL soportado presente): No se necesita modelo de backend.
- **Fallback a `literature-metadata-search`**: Se recomienda un modelo con capacidad de búsqueda web. La tarea es una recuperación ligera y verificación de evidencia — no requiere capacidad de escritura de formato largo, pero debe distinguir homónimos, versiones preprint vs. publicadas, artículos vs. tesis y diferentes ediciones.

## Dependencias

- **Backend**: Skill-Runner (para respaldo después de fallo de búsqueda local)
- **Skill**: `literature-metadata-search`
- **Zotero Host API**: `metadata.translateIdentifier` (camino rápido controlado de solo lectura)
- **Apply Handler**: `handlers.parent.updateMetadata`

## Flujos de trabajo relacionados

- [Literature Search & Ingest](#doc/workflows%2Fliterature-search-ingest) — Buscar nueva literatura e importar a Zotero
- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Generar resumen y análisis de citas desde PDF/Markdown
- [Tag Regulator](#doc/workflows%2Ftag-regulator) — Normalizar etiquetas después de completar los metadatos
