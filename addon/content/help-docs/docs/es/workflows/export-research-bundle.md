# Export Research Bundle

## Propósito

Ensamblar automáticamente un paquete de investigación de solo lectura en Dashboard Products a partir de la biblioteca Zotero existente y el contexto de Synthesis, basado en una intención de artículo declarada. El paquete recopila temas relevantes, artículos principales y artículos relacionados con sus artefactos de análisis disponibles.

## Entradas

| Parámetro | Requerido | Descripción |
| --- | --- | --- |
| `paperTitle` | Sí | Título del manuscrito en trabajo utilizado para encontrar materiales de investigación. |
| `researchContent` | Sí | Problema de investigación, métodos, alcance y contribución prevista. |
| `articleType` | No | Tipo de manuscrito (predeterminado: `original research`). |
| `maxTopics` | No | Número máximo de temas relevantes a incluir, rango 0–10 (predeterminado: 5). |
| `maxCorePapers` | No | Número máximo de artículos principales, rango 1–50 (predeterminado: 20). |
| `maxRelatedPapers` | No | Número máximo de artículos adicionales ajenos a los Topics, rango 1–200 (predeterminado: 80). Los artículos resueltos desde Topics seleccionados se conservan por encima del límite. |

No se requiere selección de elementos Zotero.

## Comportamiento

1. Recibir los parámetros de intención de artículo del usuario.
2. Descubrir materiales candidatos a partir de Synthesis Topics existentes y anclas acotadas de metadatos de Zotero. La búsqueda compara metadatos indexados como títulos, autores, años, publicaciones y etiquetas; no es una búsqueda semántica de texto completo.
3. Realizar evaluación acotada para distinguir artículos principales de relacionados.
4. Ensamblar el Research Bundle con informes de temas, metadatos bibliográficos y artefactos de análisis v2 disponibles (resúmenes, referencias, análisis de citas, contenido de conversaciones).
5. Para artículos principales, preferir fuente Markdown con imágenes locales; recurrir a PDF; registrar una advertencia si ninguno está disponible.
6. Registrar el paquete como un producto de solo lectura en Dashboard Products.

La indisponibilidad de tema, grafo, artefacto de análisis o fuente se degrada elegantemente — el flujo de trabajo continúa con cualquier evidencia que aún sea legible y registra diagnósticos y advertencias. Si ningún artículo cumple los criterios, la ejecución termina sin registrar un producto.

## Resultado y aplicación

El Research Bundle se registra en Dashboard Products como un artefacto de solo lectura. Su estructura:

| Ruta | Descripción |
|------|-------------|
| `README.md` | Punto de entrada para agentes y humanos con orden de lectura sugerido, nomenclatura de archivos, índice de temas/artículos |
| `manifest.json` | Inventario legible por máquina de rutas de artefactos v2, procedencia, integridad de archivos y diagnósticos |
| `topics/<topic-id>/report.md` | Informe de síntesis de tema (cuando esté disponible) |
| `papers/<paper-id>/metadata.json` | Metadatos bibliográficos portables por artículo |
| `papers/<paper-id>/source.md` | Fuente Markdown (cuando esté disponible) |
| `papers/<paper-id>/digest-*.md` | Artefactos de resumen de Literature Analysis (cuando estén disponibles) |

Solo se utilizan los directorios semánticos `topics/` y `papers/` junto con los archivos raíz. Las imágenes Markdown se incluyen solo cuando su ruta local resuelta cae dentro del árbol de directorios del archivo Markdown; las imágenes fuera del árbol o faltantes conservan sus enlaces originales pero no se registran como archivos de producto.

## Duración estimada

Depende del tamaño de la biblioteca, cantidad de candidatos, disponibilidad de temas/grafos y velocidad de respuesta del backend. El progreso y los resultados son visibles en el panel de ejecución.

## Recomendación de modelo

Se recomienda un modelo con fuerte comprensión semántica y capacidad de llamada de herramientas. La tarea requiere juzgar la relevancia de temas y artículos frente a la intención del artículo y usar correctamente el contexto de solo lectura de Zotero y Synthesis.

## Dependencias

- **Backend**: Skill-Runner
- **Skill**: `export-research-bundle`
- **Host Bridge**: Requiere permiso para leer el contexto de Zotero y Synthesis

## Flujos de trabajo relacionados

- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Generar artefactos de resumen y análisis de citas que se pueden incluir en el paquete
- [Literature Search & Ingest](#doc/workflows%2Fliterature-search-ingest) — Buscar e importar literatura faltante antes de ensamblar el paquete
- [Export/Import Literature Bundle](#doc/workflows%2Fexport-import-literature-bundle) — Exportar paquetes ZIP portables de elementos Zotero (propósito diferente)
