# Crear síntesis de temas

## ¿Qué es la síntesis de temas?

La síntesis de temas es el proceso de analizar y sintetizar sistemáticamente un grupo de literatura relacionada. Extrae automáticamente información clave, identifica estructuras temáticas y genera informes de análisis completos a través de workflows de IA.

## Superficie Topics

En la página Synthesis Workbench → Topics, puedes explorar y gestionar todos los temas creados. La superficie Topics admite **tres modos de vista**:

| Vista | Descripción | Caso de uso |
|-------|-------------|-------------|
| **Vista de grafo** | Grafo force-directed con temas como nodos y relaciones como aristas | Comprender intuitivamente las asociaciones entre temas |
| **Vista de cuadrícula** | Tarjetas con título, cantidad de artículos, resumen y botones de acción | Explorar y encontrar temas |
| **Vista de lista** | Vista de tabla con columnas: nombre, cantidad de artículos, fecha de creación, fecha de actualización, estado | Ordenación y operaciones por lotes |

![Vista de grafo de temas de Synthesis](/img/docs/synthesis/topic-graph.png)

### Operaciones de gestión de temas

- **Buscar**: Buscar por nombre y descripción del tema
- **Ordenar**: Ordenar por título, cantidad de artículos o fecha de actualización
- **Crear nuevo tema**: Haz clic en el botón de crear para iniciar el pipeline del workflow
- **Actualizar tema**: Volver a ejecutar el pipeline para actualizar el análisis del tema
- **Eliminar tema**: Eliminar temas que ya no son necesarios

## Proceso de creación

La creación de temas es impulsada por workflows y es un pipeline automatizado de múltiples pasos:

```
1. create-topic-prepare
   → Recopilar datos de literatura, construir conjunto de artículos
   
2. topic-synthesis-core-enrichment
   → Enriquecimiento central: extraer información, asociar conocimiento
   
3. topic-synthesis-finalize
   → Generar artefactos e informes de análisis finales

(update-topic-synthesis-prepare se usa para actualizar temas existentes)
```

### Requisitos previos

- [Backend Skill-Runner](../backends/skill-runner) configurado
- Artículos relevantes en la biblioteca
- Los artículos tienen resúmenes y análisis de citas generados (opcional, recomendado)

Este pipeline es orquestado por el workflow [Topic Synthesis Creation](../workflows/topic-synthesis).

## Inspector de temas

Después de crear un tema, haz clic en él para entrar en el Inspector de temas. Este es un lector multipágina que contiene 8 sub-páginas, cada una presentando una dimensión diferente del tema.

### Overview

- Nombre del tema, descripción, puntuación de importancia
- Resumen de afirmaciones fundamentales
- Estadísticas (cantidad de artículos, cantidad de categorías, cantidad de afirmaciones, etc.)
- Información de ubicación asociada en el grafo de temas

### Taxonomy

Muestra la estructura de clasificación jerárquica del tema:

- Temas más amplios: Áreas temáticas más amplias
- Temas más estrechos: Sub-temas más específicos
- Temas relacionados: Otros temas asociados
- Posición y jerarquía en el grafo de temas

### Claims

Afirmaciones fundamentales y aserciones extraídas de la literatura:

- Cada afirmación incluye citas de evidencia originales
- Marca los artículos de los que provienen las afirmaciones
- Tipo de afirmación (hallazgos / hipótesis / conclusiones, etc.)
- Número de artículos que respaldan la afirmación

### Compare

Comparación de puntos de vista entre diferentes artículos sobre el mismo tema:

- Dimensiones de comparación (métodos, conclusiones, conjuntos de datos, etc.)
- Postura y argumentos de cada artículo
- Visualización de consenso y divergencia

### Future Directions

Lagunas de investigación y direcciones futuras identificadas mediante el análisis de literatura:

- Preguntas abiertas
- Potenciales direcciones de investigación
- Desafíos y recomendaciones relacionados

### Coverage

Analiza el grado en que el tema cubre la literatura relevante:

- Lista de artículos cubiertos por el tema
- Completitud de los artículos (si existen artefactos de digest/análisis de citas)
- Aspectos cubiertos y aspectos no cubiertos

### References

Todas las referencias asociadas con el tema, incluyendo detalles de vinculación:

- Enlace al elemento de Zotero para cada cita
- Rol de la cita en el tema (support / contrast / background)
- Fuente y contexto de la cita

### Report (Informe completo)

El informe de análisis de síntesis estructurado generado (en formato Markdown):

- Texto completo del análisis del tema
- Se puede exportar como Markdown o HTML autocontenido
- Adecuado para su uso como material de referencia en escritura académica

## Grafo de temas

El grafo de temas es una red jerárquica de temas que muestra las relaciones entre temas:

### Tipos de nodos

| Tipo | Descripción |
|------|-------------|
| **materialized** | Temas estructurados que se han creado efectivamente |
| **placeholder** | Marcadores de posición de temas inferidos como existentes pero aún no creados |

### Estado de aristas

| Estado | Descripción |
|--------|-------------|
| `suggested` | Relaciones sugeridas por el sistema (pendientes de revisión) |
| `confirmed` | Relaciones confirmadas por el usuario |
| `rejected` | Relaciones rechazadas por el usuario |
| `stale` | Datos obsoletos, pendientes de reevaluación |
| `deleted` | Relaciones eliminadas |

### Tipos de relaciones

| Relación | Descripción |
|----------|-------------|
| `broader_than` | A es un tema más amplio que B |
| `related_to` | Dos temas están relacionados |
| `overlaps_with` | Dos temas se superponen |
| `contrasts_with` | Dos temas contrastan entre sí |

### Gestión de temas

- **Crear nuevo tema**: Haz clic en "Create" en la página Topics
- **Editar tema**: Modificar nombre, descripción, importancia, etc.
- **Asociar artículos**: Añadir o eliminar artículos de un tema
- **Explorar grafo de temas**: Ver la red de relaciones entre temas

## Workflows relacionados

- [Topic Synthesis Creation](../workflows/topic-synthesis) — Detalles del workflow para crear temas
- [Manuscript Literature Framing](../workflows/manuscript-literature-framing) — Escribir artículos basándose en análisis temáticos
