# Índice y Grafo de Citas

## Superficie Index

En la página Synthesis Workbench → Index, puedes gestionar el Índice de Referencias Canónicas. La superficie Index contiene **dos sub-vistas**:

### Vista Registry

Muestra una lista de todos los artículos rastreados en la biblioteca, con cada fila mostrando un artículo y su estado de cobertura:

- **Información del artículo**: Título, autor, año
- **Cobertura**: Complete / Partial / Missing (estado de cobertura de los tres tipos de artefactos: digest, references, citation analysis)
- **Expandir fila**: Al expandirla, muestra la lista de referencias del artículo, con cada cita marcada por su estado de vinculación (unbound / candidate / accepted / rejected)
- **Filtro**: Filtrar por alcance (all / library / cited), cobertura o búsqueda

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/index.webp" alt="Vista Registry del Índice de Synthesis" title="Vista Registry del Índice de Synthesis" loading="lazy" /><figcaption>Vista Registry del Índice de Synthesis</figcaption></figure>

### Vista Canonical Reference

Se muestra cuando la herramienta de indexación activa se cambia a "Revise Canonical":

- **Lista de referencias canónicas**: Registros de referencias canónicas deduplicados
- **Búsqueda y filtro**: Filtrar por estado de vinculación, visibilidad en el grafo, estado de redirección o si existen candidatos duplicados
- **Acciones**: Edición de metadatos, fusionar referencias duplicadas, crear redirecciones, ver elementos de revisión

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/index_canonical-revision.webp" alt="Vista de revisión de referencias canónicas del Índice de Synthesis" title="Vista de revisión de referencias canónicas del Índice de Synthesis" loading="lazy" /><figcaption>Vista de revisión de referencias canónicas del Índice de Synthesis</figcaption></figure>

## Índice de Referencias Canónicas

El Índice de Referencias Canónicas es el índice central del sistema Synthesis, que realiza la deduplicación y canonización de todas las referencias de los artículos en la biblioteca. Obtiene datos de citas sin procesar del Reference Sidecar (consulta la sección "Reference Sidecar" en la [Descripción general](#doc/synthesis%2Findex)) y forma el índice mediante extracción, canonización y vinculación de coincidencias.

### Funciones

- **Búsqueda de texto completo**: Buscar en todas las referencias canonizadas
- **Edición de metadatos**: Modificar metadatos de registros de citas
- **Fusionar**: Fusionar registros de referencias duplicados (crea redirecciones automáticamente)
- **Redireccionar**: Apuntar una referencia a otro registro canónico
- **Revisar**: Ver elementos de revisión de calidad para coincidencia de citas
- **Deduplicación**: Descubrir referencias potencialmente duplicadas

### Tipos de registros de referencias

| Tipo | Descripción |
|------|-------------|
| **Bound** | Asociado con un elemento en la biblioteca de Zotero |
| **External** | Literatura conocida que no está en la biblioteca actual de Zotero |
| **Unresolved** | Extraída de referencias pero aún no identificada |

## Pipeline de coincidencia de referencias

La coincidencia de referencias es el proceso de establecer automáticamente asociaciones entre las referencias extraídas de los artículos y los elementos de la biblioteca de Zotero. El sistema utiliza un **modelo de dos etapas** para equilibrar rendimiento y precisión.

### Modelo de dos etapas

#### Etapa 1: Actualización ligera del Sidecar

Se ejecuta durante operaciones regulares (por ejemplo, después de la aplicación de un digest), escanea el estado del sidecar, compara hashes de artefactos de citas y solo procesa las referencias que han cambiado. **No ejecuta deduplicación avanzada ni construcción de índice**, solo realiza asignación canónica y vinculación ligeras.

- Activador: Después de que la ejecución del workflow complete y escriba artefactos, o mediante operación explícita de actualización
- Alcance: Incremental (solo referencias cambiadas)
- Algoritmo: Coincidencia simple de identificadores (DOI, arXiv, ISBN)

#### Etapa 2: Coincidencia avanzada de citas

Una operación de coincidencia profunda activada explícitamente. Construye un índice completo de coincidencias de citas y ejecuta algoritmos exhaustivos de coincidencia y deduplicación.

- Activador: Activación manual por el usuario, mantenimiento periódico
- Alcance: Completo
- Algoritmo: Coincidencia multi-estrategia + deduplicación por agrupamiento

:::caution Nota de rendimiento
La coincidencia avanzada de citas, la actualización del índice y la reconstrucción del grafo de citas son operaciones intensivas en cómputo. Dado que Zotero utiliza una arquitectura de proceso host único, estas operaciones pueden causar breves titilaciones de la interfaz durante la ejecución. Por favor, ten paciencia. Se planea abordar este problema en una futura refactorización arquitectónica.
:::

### Estrategias de coincidencia

| Estrategia | Base de coincidencia | Confianza | Descripción |
|------------|---------------------|-----------|-------------|
| Coincidencia DOI | Identificador DOI | Determinista | Coincidencia exacta, aceptada automáticamente |
| Coincidencia arXiv | ID arXiv | Determinista | Coincidencia exacta, aceptada automáticamente |
| Coincidencia ISBN | Número ISBN | Determinista | Coincidencia exacta, aceptada automáticamente |
| Similitud de título | Coincidencia difusa de títulos | Alta / Media / Baja | Utiliza títulos estandarizados y títulos compactos para el cálculo de similitud |
| Autor + Año | Nombres de autor y año de publicación | Media / Baja | Combina normalización de autores y rango de años para la coincidencia |

### Niveles de confianza

| Nivel | Descripción | Acción recomendada |
|-------|-------------|-------------------|
| `deterministic` | Coincidencia determinista | Aceptar automáticamente |
| `high` | Alta confianza | Aceptable |
| `medium` | Confianza media | Se recomienda revisión |
| `low` | Baja confianza | Requiere revisión |
| `review` | Requiere juicio humano | Debe revisarse |

### Deduplicación por agrupamiento

La etapa de coincidencia avanzada realiza deduplicación por agrupamiento en las referencias canónicas. El proceso del algoritmo:

1. Construir un registro de deduplicación para cada referencia canónica (incluyendo filtrado de elegibilidad y análisis de ruido bibliográfico)
2. La comparación por pares produce aristas de clúster (coincidencia exacta de identificadores, coincidencia canónica de títulos, coincidencia difusa de títulos, etc.)
3. Las aristas se agregan en clústeres y sub-clústeres
4. Genera redirecciones automáticas o propuestas de revisión para la deduplicación

Restricción de seguridad: Las coincidencias de baja confianza (por ejemplo, `contained_extension_risk`) nunca activan redirecciones automáticas y requieren revisión por el usuario.

### Superficie de revisión

En el [Centro de revisión](#doc/synthesis%2Freview), puedes ver y procesar las propuestas de coincidencia de citas, aceptándolas o rechazándolas una por una.

## Grafo de Citas

El grafo de citas visualiza los artículos de la biblioteca y sus referencias como un grafo de red. Los datos del grafo se construyen como una proyección SQLite y pueden tolerar cierto grado de obsolescencia de datos (no es un espejo en tiempo real).

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/citation-graph.webp" alt="Grafo de Citas de Synthesis" title="Grafo de Citas de Synthesis" loading="lazy" /><figcaption>Grafo de Citas de Synthesis</figcaption></figure>

### Tipos de nodos

| Nodo | Color | Descripción |
|------|-------|-------------|
| `library_paper` | Azul | Artículos ya en la biblioteca de Zotero |
| `external_reference` | Verde | Referencias conocidas que no están en la biblioteca |
| `unresolved_reference` | Gris | Referencias extraídas pero no identificadas |

### Información de aristas

Cada arista de citación contiene:

- **mention_count**: Número de veces que se cita
- **primary_role**: Rol de citación principal (por ejemplo, background, comparison, support, contrast)
- **aux_roles**: Lista de roles auxiliares
- **role_evidence**: Base para la determinación del rol

### Métricas del grafo

El grafo de citas puede calcular diversas métricas para ayudar a identificar artículos fundamentales y trabajos influyentes:

| Métrica | Descripción |
|---------|-------------|
| **Citation Count** | Número total de veces que un artículo es citado |
| **PageRank** | Puntuación de importancia del nodo basada en la estructura del grafo |
| **Foundation Score** | Grado en que sirve como trabajo fundamental en el campo |
| **Frontier Score** | Grado en que representa trabajo de frontera |

### Disposiciones de visualización

| Disposición | Descripción | Caso de uso |
|-------------|-------------|-------------|
| **Force (Force-Directed)** | Disposición d3-force | Explorar la estructura general |
| **Radial** | Expandir alrededor de un nodo seleccionado | Analizar la red de citas de un artículo |
| **Components** | Agrupar por componentes conectados | Descubrir clústeres de citas independientes |

### Operaciones interactivas

- **Zoom / Pan**: Navegar libremente por el grafo
- **Hover**: Ver etiquetas de nodos e información básica
- **Click Node**: Abrir el artículo correspondiente en Zotero
- **Filtro**: Filtrar las citas mostradas por rol, tema o tipo de nodo
- **Alternar citas de baja señal**: Mostrar/ocultar aristas con bajo recuento de citas
- **Control deslizante de profundidad**: Controlar la profundidad de expansión de la red de citas

### Filtrado por temas

Puedes filtrar el grafo de citas por tema para mostrar solo los artículos y relaciones de citación relacionados con temas específicos. Los alcances de los temas se muestran en el grafo con diferentes colores y agrupaciones.

## Siguientes pasos

- [Centro de revisión](#doc/synthesis%2Freview) — Revisar propuestas de coincidencia de citas y deduplicación
- [Crear síntesis de temas](#doc/synthesis%2Ftopic-synthesis) — Crear análisis temáticos basados en redes de citas
- [Panel Home](#doc/synthesis%2Fhome) — Ver métricas de estadísticas de la biblioteca
- [WebDAV Sync](#doc/synthesis%2Fwebdav-sync) — Sincronizar datos de vinculación de citas entre dispositivos
